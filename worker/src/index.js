/* jwc-rundown：Big Day Rundown 的小後端（Cloudflare Worker + KV）
 *
 * - 原稿是 GitHub Pages 上的 rundowns/*.json，這裡不動它
 * - 現場的「延後／改時間／取消／公告」存成一條條變更紀錄（KV: ch:<id>），前端照順序套用
 * - Web Push：訂閱存 KV（sub:<id>:<hash>），公告／延後即時推，排程每分鐘檢查「5 分鐘前＋開始時」
 * - 時間一律沖繩時間（Asia/Tokyo）
 *
 * Secrets：VAPID_PRIVATE_JWK、ADMIN_PIN（本機備份在 ~/.config/jwc/rundown.json）
 */

const ALLOWED_ORIGINS = [/^https:\/\/sssunwl\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const ID_RE = /^[\w-]{1,40}$/;
const TZ = "Asia/Tokyo";

/* ---------- 小工具 ---------- */
const enc = (s) => new TextEncoder().encode(s);
function concat(...arrs){ const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; arrs.forEach((a) => { out.set(a, o); o += a.length; }); return out; }
function b64uEnc(bytes){ let s = ""; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64uDec(str){ const s = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); }
function mins(t){ const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; }
function hhmm(n){ return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0"); }
function tx(v, lang){ if(v == null) return ""; if(typeof v !== "object") return String(v); return v[lang] || v.zh || v.en || v.ja || ""; }
function okinawaNow(){
  const p = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour) * 60 + (+p.minute) };
}
async function sha(s){ return b64uEnc(new Uint8Array(await crypto.subtle.digest("SHA-256", enc(s)))).slice(0, 22); }

/* ---------- 變更紀錄 → 每個項目的實際時間（前端 day/index.html 有同一套邏輯） ---------- */
function allItems(w){ const out = []; (w.segments || []).forEach((s) => (s.items || []).forEach((it) => out.push(it))); return out; }
function itemKey(it){ return it.start + "|" + tx(it.title, "zh"); }
function effective(w, changes){
  const st = {};
  allItems(w).forEach((it) => { st[itemKey(it)] = { it, s: mins(it.start), e: mins(it.end), cancelled: false }; });
  (changes || []).filter((c) => !c.undone).forEach((c) => {
    if(c.kind === "delay"){
      const from = mins(c.from);
      Object.values(st).forEach((x) => { if(x.s != null && x.s >= from){ x.s += c.minutes; if(x.e != null) x.e += c.minutes; } });
    } else if(c.kind === "edit" && st[c.key]){
      const x = st[c.key];
      if(typeof c.cancelled === "boolean") x.cancelled = c.cancelled;
      if(c.start) x.s = mins(c.start);
      if(c.end !== undefined) x.e = c.end ? mins(c.end) : null;
    }
  });
  return st;
}

/* ---------- 推播文字（依訂閱者語言） ---------- */
const MSG = {
  zh: { r5: "5 分鐘後：{t}", r0: "現在開始：{t}", delay: "{from} 之後的流程全部延後 {n} 分鐘", early: "{from} 之後的流程全部提前 {n} 分鐘",
        edit: "時間更改：{t} → {s}", cancel: "取消：{t}", restore: "恢復：{t}", notice: "📣 公告", update: "流程更新", ok: "通知已開啟，當天會在每項開始前 5 分鐘和開始時提醒你" },
  ja: { r5: "5分後：{t}", r0: "開始：{t}", delay: "{from}以降の予定を{n}分繰り下げ", early: "{from}以降の予定を{n}分繰り上げ",
        edit: "時間変更：{t} → {s}", cancel: "中止：{t}", restore: "再開：{t}", notice: "📣 お知らせ", update: "進行の更新", ok: "通知をオンにしました。当日は各項目の5分前と開始時にお知らせします" },
  en: { r5: "In 5 min: {t}", r0: "Starting now: {t}", delay: "Everything from {from} is delayed {n} min", early: "Everything from {from} moves {n} min earlier",
        edit: "Time change: {t} → {s}", cancel: "Cancelled: {t}", restore: "Back on: {t}", notice: "📣 Announcement", update: "Rundown update", ok: "Notifications on. On the day you'll get a heads-up 5 min before and at the start of each item" }
};
function msg(lang, key, vars){ let s = (MSG[lang] || MSG.zh)[key] || MSG.zh[key]; Object.keys(vars || {}).forEach((k) => { s = s.replace("{" + k + "}", vars[k]); }); return s; }

/* ---------- Web Push（RFC 8291 aes128gcm 加密＋VAPID） ---------- */
async function hkdf(salt, ikm, info, len){
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}
async function encryptPayload(p256dh, auth, plaintext){
  const uaPublic = b64uDec(p256dh), authSecret = b64uDec(auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(enc("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0); new DataView(header.buffer).setUint32(16, 4096); header[20] = 65; header.set(asPublic, 21);
  return concat(header, ct);
}
async function vapidJWT(env, aud){
  const h = b64uEnc(enc(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64uEnc(enc(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })));
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc(h + "." + p)));
  return h + "." + p + "." + b64uEnc(sig);
}
async function sendPush(env, sub, payload){
  const body = await encryptPayload(sub.keys.p256dh, sub.keys.auth, enc(JSON.stringify(payload)));
  const jwt = await vapidJWT(env, new URL(sub.endpoint).origin);
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: { Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`, "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "3600", Urgency: "high" },
    body
  });
  return r.status;
}
async function listSubs(env, id){
  const out = []; let cursor;
  do {
    const page = await env.KV.list({ prefix: `sub:${id}:`, cursor });
    for(const k of page.keys){ const v = await env.KV.get(k.name, "json"); if(v) out.push({ name: k.name, ...v }); }
    cursor = page.list_complete ? null : page.cursor;
  } while(cursor);
  return out;
}
/* 對這場所有訂閱者推播；makePayload(lang) 回傳 {title, body, tag}。失效的訂閱（404/410）順手刪掉 */
async function pushAll(env, id, makePayload){
  const subs = await listSubs(env, id);
  const results = await Promise.all(subs.map(async (s) => {
    try{
      const status = await sendPush(env, s, { ...makePayload(s.lang || "zh"), url: `${env.SITE}/day/?w=${id}&lang=${s.lang || "zh"}` });
      if(status === 404 || status === 410) await env.KV.delete(s.name);
      return status;
    }catch(e){ return "err"; }
  }));
  return { sent: results.filter((x) => x >= 200 && x < 300).length, total: subs.length };
}

/* ---------- 資料 ---------- */
async function getRundown(env, id){
  const r = await fetch(`${env.SITE}/rundowns/${id}.json`, { cf: { cacheTtl: 60 } });
  return r.ok ? r.json() : null;
}
async function getChanges(env, id){ return (await env.KV.get(`ch:${id}`, "json")) || []; }
async function putChanges(env, id, list){ await env.KV.put(`ch:${id}`, JSON.stringify(list)); }
function coupleTitle(w, lang){ return "Rundown · " + (tx(w && w.couple, lang) || ""); }

/* ---------- 管理員 PIN（同一個 IP 一小時錯 10 次就鎖） ---------- */
async function checkPin(env, req){
  const ip = req.headers.get("CF-Connecting-IP") || "local";
  const failKey = `fail:${ip}`;
  const fails = +(await env.KV.get(failKey)) || 0;
  if(fails >= 10) return "locked";
  if(req.headers.get("X-PIN") === env.ADMIN_PIN) return "ok";
  await env.KV.put(failKey, String(fails + 1), { expirationTtl: 3600 });
  return "bad";
}

/* ---------- HTTP ---------- */
function cors(req){
  const o = req.headers.get("Origin") || "";
  const ok = ALLOWED_ORIGINS.some((re) => re.test(o));
  return { "Access-Control-Allow-Origin": ok ? o : "https://sssunwl.github.io", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,X-PIN", "Vary": "Origin" };
}
function json(req, data, status = 200){ return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(req) } }); }

async function handle(req, env, ctx){
  if(req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean); // api, w, :id, action

  if(url.pathname === "/api/config") return json(req, { vapidPublicKey: env.VAPID_PUBLIC });

  if(url.pathname === "/api/auth" && req.method === "POST"){
    const r = await checkPin(env, req);
    return r === "ok" ? json(req, { ok: true }) : json(req, { ok: false, error: r }, r === "locked" ? 429 : 401);
  }

  if(parts[0] !== "api" || parts[1] !== "w" || !ID_RE.test(parts[2] || "")) return json(req, { error: "not found" }, 404);
  const id = parts[2], action = parts[3];

  if(action === "state" && req.method === "GET"){
    ctx.waitUntil(replan(env, false).catch(() => {}));
    return json(req, { changes: await getChanges(env, id), serverTime: okinawaNow() });
  }

  if(req.method !== "POST") return json(req, { error: "method" }, 405);
  const body = await req.json().catch(() => ({}));

  if(action === "subscribe"){
    const s = body.subscription;
    if(!s || !s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth || !/^https:\/\//.test(s.endpoint)) return json(req, { error: "bad subscription" }, 400);
    const lang = ["zh", "ja", "en"].includes(body.lang) ? body.lang : "zh";
    const rec = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, lang, at: Date.now() };
    await env.KV.put(`sub:${id}:${await sha(s.endpoint)}`, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 30 });
    let status = null;
    if(body.test){
      const w = await getRundown(env, id);
      try{ status = await sendPush(env, rec, { title: coupleTitle(w, lang), body: msg(lang, "ok"), tag: "jwc-ok", url: `${env.SITE}/day/?w=${id}&lang=${lang}` }); }catch(e){ status = "err:" + e.message; }
    }
    ctx.waitUntil(replan(env, true).catch(() => {}));
    return json(req, { ok: true, testStatus: status });
  }

  if(action === "unsubscribe"){
    if(body.endpoint) await env.KV.delete(`sub:${id}:${await sha(body.endpoint)}`);
    return json(req, { ok: true });
  }

  /* 以下要 PIN */
  const pin = await checkPin(env, req);
  if(pin !== "ok") return json(req, { error: pin }, pin === "locked" ? 429 : 401);
  const by = String(body.by || "").slice(0, 30);

  if(action === "change"){
    const w = await getRundown(env, id);
    if(!w) return json(req, { error: "rundown not found" }, 404);
    const list = await getChanges(env, id);
    const before = effective(w, list);
    const c = { id: crypto.randomUUID().slice(0, 8), kind: body.kind, at: Date.now(), by };
    if(body.kind === "delay"){
      const n = Math.round(+body.minutes);
      if(!n || Math.abs(n) > 240 || mins(body.from) == null) return json(req, { error: "bad delay" }, 400);
      c.from = body.from; c.minutes = n;
    } else if(body.kind === "edit"){
      if(!before[body.key]) return json(req, { error: "unknown item" }, 400);
      c.key = body.key;
      if(body.start != null){ if(mins(body.start) == null) return json(req, { error: "bad start" }, 400); c.start = body.start; }
      if(body.end !== undefined){ if(body.end && mins(body.end) == null) return json(req, { error: "bad end" }, 400); c.end = body.end || ""; }
      if(typeof body.cancelled === "boolean") c.cancelled = body.cancelled;
    } else if(body.kind === "notice"){
      const text = String(body.text || "").trim().slice(0, 500);
      if(!text) return json(req, { error: "empty" }, 400);
      c.text = text;
    } else return json(req, { error: "bad kind" }, 400);

    list.push(c);
    await putChanges(env, id, list);

    // 即時推播：只在當天或之後的婚禮推（過去的不吵人）
    if(w.date >= okinawaNow().date && body.push !== false){
      ctx.waitUntil(pushAll(env, id, (lang) => {
        let text;
        if(c.kind === "notice") return { title: msg(lang, "notice") + " · " + tx(w.couple, lang), body: c.text, tag: "jwc-n-" + c.id };
        if(c.kind === "delay") text = msg(lang, c.minutes > 0 ? "delay" : "early", { from: c.from, n: Math.abs(c.minutes) });
        else {
          const x = before[c.key], t = tx(x.it.title, lang);
          text = c.cancelled === true ? msg(lang, "cancel", { t }) : c.cancelled === false && !c.start ? msg(lang, "restore", { t }) : msg(lang, "edit", { t, s: c.start || hhmm(x.s) });
        }
        return { title: msg(lang, "update") + " · " + tx(w.couple, lang), body: text, tag: "jwc-c-" + c.id };
      }));
    }
    ctx.waitUntil(replan(env, true).catch(() => {}));
    return json(req, { ok: true, change: c, changes: list });
  }

  if(action === "schedule"){
    const r = await replan(env, true);
    return json(req, await r.json().catch(() => ({})));
  }

  if(action === "undo"){
    const list = await getChanges(env, id);
    const c = list.find((x) => x.id === body.changeId);
    if(!c) return json(req, { error: "not found" }, 404);
    c.undone = !c.undone; c.undoneAt = Date.now(); c.undoneBy = by;
    await putChanges(env, id, list);
    ctx.waitUntil(replan(env, true).catch(() => {}));
    return json(req, { ok: true, changes: list });
  }

  return json(req, { error: "not found" }, 404);
}

/* ---------- 排程提醒：Durable Object 鬧鐘（免費方案 cron 名額已滿，改用鬧鐘準時叫醒） ----------
 * 算出未來 7 天所有「開始前 5 分鐘／開始時」事件，鬧鐘設在下一個事件；
 * 叫醒時送出到期的事件（KV sent:* 去重），再設下一個。變更／訂閱時也會重新排。 */
function jstEpoch(date, min){ const [y, m, d] = date.split("-").map(Number); return Date.UTC(y, m - 1, d) - 9 * 3600000 + min * 60000; }
async function buildEvents(env){
  const today = okinawaNow().date;
  const limit = new Date(Date.parse(today + "T00:00:00Z") + 7 * 86400000).toISOString().slice(0, 10);
  const idx = await fetch(`${env.SITE}/rundowns/index.json`, { cf: { cacheTtl: 120 } }).then((r) => r.ok ? r.json() : null).catch(() => null);
  if(!idx) return [];
  const events = [];
  for(const f of idx.weddings || []){
    const date = f.slice(0, 10);
    if(date < today || date > limit) continue;
    const id = f.replace(/\.json$/, "");
    const w = await getRundown(env, id);
    if(!w) continue;
    const st = effective(w, await getChanges(env, id));
    const groups = {};
    Object.entries(st).forEach(([key, x]) => {
      if(x.cancelled || x.s == null) return;
      [["r5", x.s - 5], ["r0", x.s]].forEach(([kind, m]) => {
        const g = groups[kind + m] = groups[kind + m] || { id, w, kind, at: x.s, epoch: jstEpoch(w.date, m), items: [] };
        g.items.push({ key, title: x.it.title });
      });
    });
    events.push(...Object.values(groups));
  }
  return events.sort((a, b) => a.epoch - b.epoch);
}
async function fireEvent(env, ev){
  const dedupe = `sent:${ev.id}:${ev.w.date}:${ev.kind}:${hhmm(ev.at)}:${await sha(ev.items.map((i) => i.key).join(","))}`;
  if(await env.KV.get(dedupe)) return;
  await env.KV.put(dedupe, "1", { expirationTtl: 172800 });
  await pushAll(env, ev.id, (lang) => ({
    title: hhmm(ev.at) + " · " + tx(ev.w.couple, lang),
    body: msg(lang, ev.kind, { t: ev.items.map((i) => tx(i.title, lang)).join(" ／ ") }),
    tag: `jwc-${ev.kind}-${hhmm(ev.at)}`
  }));
}
export class Scheduler {
  constructor(state, env){ this.state = state; this.env = env; this.last = 0; }
  async fetch(req){
    const force = new URL(req.url).searchParams.get("force") === "1";
    if(!force && Date.now() - this.last < 120000) return new Response("skip");
    const next = await this.plan();
    return new Response(JSON.stringify({ next }), { headers: { "Content-Type": "application/json" } });
  }
  async alarm(){ await this.plan(); }
  async plan(){
    this.last = Date.now();
    const events = await buildEvents(this.env);
    const now = Date.now();
    for(const ev of events.filter((e) => e.epoch <= now + 30000 && e.epoch > now - 120000)) await fireEvent(this.env, ev);
    const next = events.find((e) => e.epoch > now + 30000);
    if(next) await this.state.storage.setAlarm(next.epoch);
    else await this.state.storage.deleteAlarm();
    return next ? { at: new Date(next.epoch).toISOString(), id: next.id, kind: next.kind, time: hhmm(next.at) } : null;
  }
}
function replan(env, force){ return env.SCHED.get(env.SCHED.idFromName("main")).fetch("https://sched/plan" + (force ? "?force=1" : "")); }

export default {
  fetch: (req, env, ctx) => handle(req, env, ctx).catch((e) => json(req, { error: "server", detail: String(e && e.message || e) }, 500))
};
