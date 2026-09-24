# Codex 工單 — jwc Demo 收尾五項

給 Codex：這是給客戶 Japan Wedding Chapel 看的 pitch demo，單一檔案 `public/index.html`（無框架、無 build step），push 到 `main` 會自動觸發 `.github/workflows/deploy-pages.yml` 部署到 https://sssunwl.github.io/jwc/ 。改完直接 commit + push 到 main 即可上線，不需要額外部署步驟。

閱讀順序建議：先讀完整份 `public/index.html`（檔案大，用 grep 找 section／data array 比較快），再讀 [`docs/CLIENT_MEETING_BRIEF.md`](CLIENT_MEETING_BRIEF.md) 了解這個 demo 的完成度定位，再開始改。

---

## Task 1 — 再次徹查教堂資料：宴會廳 + 酒店的獨立資料跟照片

**背景**：SS（客戶端窗口）已經連續三輪反饋「教堂照片/資料沒抓全」。目前 `CHAPELS` 陣列（約在 `public/index.html` 第 878 行附近，用 `grep -n "var CHAPELS"` 找）每間教堂只有 4–5 張照片，且只有教堂本體的敘述。這次 SS 明確指出：**原官網的教堂頁面下面，可能還有「宴會廳」跟「配合酒店」各自獨立的資料段落跟照片，不是教堂照片的延伸，是不同的實體**，目前完全沒抓進來。

**要做的事**：
1. 對 11 間教堂（slug 列表：lazor-siele-chapel, lazor-garden-alivila, monterey-lumer-chapel, aquagrace-wedding-chapel, alivila-glory-church, diamond-ocean-chapel, renaissance-ribera-church, grand-bleu-chapel, eines-villa-di-nozze-okinawa, kouri-island-celeste-chapel, centlegenda-chapel）逐一重新打開 https://www.japanweddingchapel.com/ 上對應頁面，**用瀏覽器實際 render 後查 DOM**（不要只用 `fetch()` 抓 raw HTML —— 這個坑已經踩過一次，Elementor Gallery widget 用 `div[data-thumbnail]` + inline `background-image` 存圖，`fetch()` 只看 `<img src>` 會漏掉大半照片，細節見 `/Users/sws/.claude/projects/-Users-sws-Sun-Claude/memory/feedback_scraping_rendered_dom.md`）
2. 確認每個教堂頁面下方是否真的有獨立的「宴會廳」「酒店」段落。如果有：
   - 抓出宴會廳的名稱、容納人數、照片（可能不只一個宴會廳，教堂 spec-box 裡的「宴會廳」欄位目前只是數字，例如 Lazor Siele 是 "30 ／ 50 ／ 130 名" —— 查證這三個數字背後是不是三間不同命名的宴會廳，各自有照片）
   - 抓出配合酒店的名稱、簡介、照片（目前 `hotel` 欄位只有一行文字，例如 "Lazor Sea Resort（徒步2分鐘）"，查證原站是否有這間酒店的獨立介紹段落/照片）
3. 同時徹底重新核對每間教堂本體的照片是否真的抓全了（不是只抓 4–5 張就停，原站部分教堂 gallery 有 8–16 張，要抓到底）
4. 資料結構建議：在 `CHAPELS` 陣列每個物件裡新增 `banquetHalls:[{name, capacity, images:[...]}]` 和 `hotelInfo:{name, desc, images:[...]}` 欄位（沒有資料的教堂就留空陣列/null，不要造假資料）
5. UI：在教堂 detail modal（`openModal()` 函式，grep 找）的 spec-box 下方，如果 `banquetHalls`/`hotelInfo` 有資料就新增對應區塊 + 燈箱瀏覽（複用既有的 `openLightboxAt()` pattern）；沒資料的教堂不顯示這兩塊，不要顯示空區塊

**驗收標準**：11 間教堂裡，只要原站真的有宴會廳/酒店的獨立照片資料，都要抓進來；沒有的就不要編。抓完後在 commit message 裡列出「這 11 間裡有幾間真的找到宴會廳/酒店獨立資料」。

---

## Task 2 — 刪除掀頭紗 Loading Intro

**背景**：`#veil-intro` 這段（curtain-reveal loading 動畫，`grep -n "veil-intro"` 找）SS 反饋效果不對，直接刪掉，不用調整、不用替代方案。

**要做的事**：
1. 刪除 `#veil-intro` 整個 HTML 區塊
2. 刪除相關 CSS：`.veil-panel`、`.veil-mark`、`.veil-mark-line1`、`.veil-mark-line2`、`.veil-right`/`.veil-left`（用 class 名稱 grep 找全部引用）
3. 刪除觸發它的 JS（進場時把 veil 淡出/移除的邏輯，grep `veil` 找）
4. 確認刪除後網站一打開就直接是 hero 區塊，沒有任何延遲或黑屏空白

---

## Task 3 — 滾動時加入光景移動效果（Parallax）

**背景**：SS 覺得滑動網站時如果背景/光影有跟著移動的效果會不錯。這是錦上添花的效果，**不要做得太搶戲**，這個 demo 走的是 Japanese Editorial × Resort × Luxury Minimal 的克制調性，不要加浮誇的視差跳動。

**建議做法**（擇一或綜合，用 `scroll` event + `requestAnimationFrame` 節流，不要每個 scroll event 都直接操作 DOM）：
- Hero 區塊的背景圖片用比內容慢一點的速度位移（經典 parallax：`transform: translateY(scrollY * 0.3px)`）
- 各 section 之間的 gradient 過渡（目前已經有柔化邊界的 gradient，見 `#realweddings`/`#wedding-pass` 的 `background:linear-gradient(...)`）可以讓這個 gradient 的位置隨 scroll 微幅偏移，製造「光在移動」的感覺
- 避免在 `.card`、`.chip` 等互動元件上加 parallax，只用在裝飾性的背景層，不影響點擊/閱讀

**驗收標準**：效果要低調、順滑（不能卡頓），手機版可以直接關掉這個效果（`prefers-reduced-motion` 也要尊重，或至少在小螢幕停用以免影響效能）。

---

## Task 4 — Wedding Pass 手機 Mockup 改用真實新人資料

**背景**：`#wedding-pass` 區塊（grep `pass-phone` 找）目前手機 mockup 用的是虛構名字 "SUN & KAI"，SS 要求改用真實新人 **Stella & Murray**（`REAL_WEDDINGS` 陣列裡已有的真實資料，不要再編新日期）。

**要做的事**，把這段：
```html
<div class="pass-phone-names">SUN &amp; KAI</div>
<div class="pass-phone-sub">WEDDING DAY · 2027.03.18 · OKINAWA</div>
```
改成使用 Stella & Murray 的真實資料（`REAL_WEDDINGS` 裡 `id:"stella-murray"` 這筆，見 `public/index.html` 第 1015 行附近）：
- `couple: "Stella & Murray"`
- `dateDisplay: "2025年12月4日"`
- `chapelSlug: "monterey-lumer-chapel"` → 對應教堂 `name_en` 是 "Monterey Lumer Chapel"

改成類似：
```html
<div class="pass-phone-names">STELLA &amp; MURRAY</div>
<div class="pass-phone-sub">WEDDING DAY · 2025.12.04 · MONTEREY LUMER CHAPEL</div>
```
CEREMONY/RECEPTION 時間欄位（目前寫死 "CEREMONY 11:00" / "RECEPTION 12:30"）沒有真實資料可查證就維持現狀當示意用的假時間即可，不用硬編，但名字跟日期跟場地要改真的。

**注意**：這個區塊本來就明確標「Future Concept — 尚未開發，先提概念」，用真實新人名字只是讓 mockup 更有說服力，不代表這對新人真的用過這個功能，維持原本 disclaimer 不動。

---

## Task 5 — Hero 第一張改成 Mood Shot 影片

**背景**：目前 hero 區塊（`#hero-slides`，`startHeroRotation()` 函式）是 5 張照片自動 crossfade。SS 要求**改成第一個畫面先播一段 mood shot 影片，播完/播一輪之後再接原本的照片輪播**。

**素材**：`/Users/sws/Sun/Claude/jwc/jwc.mp4`（14.4MB，MP4，已確認檔案存在）

**要做的事**：
1. 把 `jwc.mp4` 搬進 `public/` 資料夾（例如 `public/media/jwc-mood.mp4`），因為 GitHub Pages 部署來源只有 `public/` 這個資料夾，檔案不在裡面的話線上看不到。14.4MB 在 GitHub 單檔限制內（硬限制 100MB），可以直接 commit。
2. 在 `#hero-slides` 最前面插入一個 `<video>` 元素：
   ```html
   <video autoplay muted playsinline preload="auto" id="hero-mood-video" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">
     <source src="media/jwc-mood.mp4" type="video/mp4">
   </video>
   ```
   （`muted` 是瀏覽器 autoplay 政策必要條件，不能省略；`playsinline` 避免 iOS 全螢幕跳出）
3. 調整 `startHeroRotation()` 的邏輯，讓影片先播完（用 `video.addEventListener('ended', ...)` 或設一個固定秒數，取影片實際長度較準）再開始原本的 5 張照片 crossfade。影片播放期間原本的照片 crossfade 邏輯要暫停，不要疊在一起。
4. 影片播完後**優雅淡出**（沿用現有 hero 的 crossfade 淡入淡出手法，不要用硬切）轉場到第一張照片。
5. 手機版檢查：確認 `<video>` 在 iOS Safari 上真的會 autoplay（`muted+playsinline` 缺一都會被擋），若有低階裝置效能疑慮可以加 `loading` fallback，但不強制。

**驗收標準**：桌面 + 手機都要實測影片確實會自動播放且無聲、播完轉場流暢、之後正常接上原本的照片輪播不影響既有的 Ken Burns 效果。

---

## 完成後

- 全部 commit（可以分開 5 個 commit，一項一個，方便 SS 對照哪個改動對應哪個反饋）
- push 到 `main`，確認 GitHub Actions（`.github/workflows/deploy-pages.yml`）跑綠
- 更新這份工單，把每個 Task 的狀態標記完成，或寫下沒做完/需要跟客戶確認的部分（例如 Task 1 如果原站根本沒有宴會廳/酒店獨立頁面，要老實寫「查證後確認原站沒有這段資料，不是漏抓」）
