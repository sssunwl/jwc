# Big Day Rundown — 資料結構

CMS 後台的「Rundown（Big Day）」區塊：每場婚禮一份結構化 Rundown，同事／攝影師／MC 打開同一個連結看同一份最新版。
Demo 在 sssunwl.github.io/jwc → 頁尾「CMS 預覽」→ Rundown 分頁。

## 為什麼要固定結構
收到的 Rundown 每份格式都不一樣（純時間＋事項、分段落、宴會場地另附 MC 逐步提示的表格）。不管收到哪種，都先整理成同一種結構，App 畫面就不用每場重做；之後搬進 WordPress 時，這份結構直接變成 CPT + ACF Repeater 欄位。

## 檔案位置
| 位置 | 內容 | 進 git? |
|---|---|---|
| `public/rundowns/*.json` | Demo 用，**已去識別**（新人／MC／工作人員姓名換成代號） | 是（repo 跟 Pages 都是 public） |
| `public/rundowns/index.json` | 要載入的檔案清單（靜態站沒辦法列資料夾，所以要手動列） | 是 |
| `public/rundowns/_template.json` | 新增一場時複製這份 | 是 |
| `private/rundowns/*.json` | 真實版，含真名 | **否**（`.gitignore`） |

**新人姓名、賓客、工作人員真名絕不放 `public/`**（2026-10-02 SS 決定現場版也先用代號）。

## 入口
- **現場版**（給負責人用，iPhone 可加到主畫面）：https://sssunwl.github.io/jwc/day/ → `public/day/`
  - 指定場次＋語言：`day/?w=2026-10-03-b&lang=ja`（右上「分享」會自動帶）
  - 模擬時間測試：`day/?w=2026-10-03-b&t=18:25`（設定後照真實速度往前走）
- **CMS Demo** 的手機框用 iframe 嵌 `day/?embed=1`（同一份程式；滑桿／貼上轉換用 postMessage 控制）
- **後端** `worker/`（Cloudflare Worker `jwc-rundown`，https://jwc-rundown.sssunjp.workers.dev）

## 現場版行為
- 時間一律**沖繩時間（Asia/Tokyo）**，不跟手機時區走（香港手機慢一小時也不會錯）
- 當天頂部即時卡：進行中「剩 mm:ss」＋進度條（攝影師看還能拍多久）、下一項倒數，每秒更新，剩 5 分鐘變色
- 過了時間只變淡、不隱藏；過去的日子永遠點得進去；自動捲到「進行中」只在打開時做一次
- 中／日／EN，「對照」同時顯示另外兩種語言
- 🔊 響鈴（頁面開著時）、☀ 常亮（Wake Lock）
- 🔔 通知（Web Push，鎖屏也會到）：每項開始前 5 分鐘＋開始時、現場延後／改時間／取消、公告。**iPhone 一定要先「加入主畫面」再從主畫面打開才能開**
- 每 30 秒同步現場更改、每 5 分鐘重抓原稿；斷網時用上次的版本（service worker＋localStorage）

## 現場更改（管理模式）
- 頁面最底「管理模式」→ 輸入 PIN（Worker secret `ADMIN_PIN`，本機備份 `~/.config/jwc/rundown.json`）→ 填名字
- 可以：還沒開始的流程全部 −5／+5／+10／+15／自訂、單項改時間、取消／恢復單項、發公告、看紀錄並撤銷
- **原稿 JSON 不動**，變更是一條條紀錄（KV `ch:<id>`），前端和 Worker 用同一套邏輯照順序套用；撤銷＝標記 `undone`，紀錄保留
- 單項用「原始開始時間|中文標題」當 key：**當天有變更後就不要再改原稿那一項的時間或中文標題**，不然變更會對不上
- 同一 IP 一小時 PIN 錯 10 次會鎖

## 後端（worker/）
- 部署：`cd worker && npx wrangler deploy`
- KV `jwc-rundown`：`ch:<id>` 變更紀錄、`sub:<id>:<hash>` 推播訂閱（30 天過期）、`sent:*` 已發提醒去重、`fail:<ip>` PIN 錯誤次數
- 排程提醒用 **Durable Object 鬧鐘**（`Scheduler`），不是 cron——帳號免費方案 5 個 cron 名額已用完。鬧鐘設在下一個「開始前 5 分鐘／開始時」，有變更或新訂閱會重排
- Secrets：`VAPID_PRIVATE_JWK`、`ADMIN_PIN`（`npx wrangler secret put`）；VAPID 公鑰在 `wrangler.toml`
- 推播加密是自己用 WebCrypto 寫的（RFC 8291 aes128gcm＋VAPID ES256），2026-10-02 已在本機驗過解密和驗簽

## 新增一場
1. 複製 `_template.json` → `YYYY-MM-DD-代號.json`
2. 填好（或在 Demo 的「貼上一份新 Rundown」先自動拆一次，再手動修類型／段落）
3. 在 `index.json` 的 `weddings` 加一行
4. push 到 main，Pages 自動更新

## 欄位
### 婚禮（檔案最外層）
| 欄位 | 說明 |
|---|---|
| `id` | 跟檔名一樣 |
| `date` | `YYYY-MM-DD`；App 用它算「已完成／今天／明天／N 天後」，當天會自動標 NOW/NEXT |
| `couple` | 新人稱呼 |
| `guests` | 人數，可 `null` |
| `notes` | 整場共通提醒（如「賓客時間僅供參考，教堂可能會調整」），顯示在流程最上方 |
| `segments` | 段落陣列，照當天順序 |
| `materials` | 要用的資料（歌曲／影片／道具／接駁） |

### 段落 `segments[]`
| 欄位 | 說明 |
|---|---|
| `title` | 酒店準備／教堂儀式／宴會／After Party… |
| `venue` | `{ name, map }`，有 `map` 就顯示「地圖」按鈕 |
| `scope` | `full` 全程跟／`assist` 只協助（畫面變淡＋標「只協助」）。例：09-26 宴會「不用跟足，只需協助新人完成進場前溝通」 |
| `people` | `[{ role, name }]`，MC、佈置組、負責人 |
| `note` | 段落備註（如「攝影只跟 1 小時：20:30–21:30」） |
| `pending` | `true` = 這段還沒收到資料（例：10-03 只收到宴會＋After Party，儀式待補） |
| `items` | 時間點陣列 |

## 三語
任何文字欄位都可以是字串，或 `{ "zh": "", "ja": "", "en": "" }`；缺的語言退回中文。人名、歌名不用翻的直接寫字串。

### 時間點 `items[]`
| 欄位 | 說明 |
|---|---|
| `start` / `end` | `HH:MM`；`end` 可省略 |
| `title` | 做什麼 |
| `type` | `shoot` 拍攝／`move` 移動／`prep` 準備／`meeting` 會議／`rehearsal` 彩排／`ceremony` 儀式／`guest` 賓客／`dress` 換造型／`party` 宴會／`media` 影片／`wrap` 收尾。決定圓點顏色 |
| `who` | 誰要到場（如舅父、姨丈、伴娘 ×2） |
| `look` | 換到哪套造型（3rd dress、紅裙…），「要用的資料」會自動整理成造型清單 |
| `note` | 補充（車程、到齊時間…） |
| `alert` | 一定要注意的事，紅字顯示，並彙整到「今天要注意」（如「請提早 13:50 到達」「請所有賓客離開教堂」） |
| `tbd` | `true` = 待確認（如 09-26 沙灘拍攝新人說不想拍） |
| `cues` | MC／工作人員逐步提示，可展開（宴會場地那份表格的 Remarks 欄就放這裡） |

**順序照原稿，不自動排序**：同一時間有多件事並行（如 11:00 彩排＋親友到達）時，原稿的順序是有意義的。

### 要用的資料 `materials[]`
`{ kind, label, value }`，`kind` = `map` / `music` / `video` / `item`。
地點、人員、造型、提醒不用另外填，App 從段落和時間點自動整理。

## 搬進 WordPress 時（正式版）
- CPT `wedding_day`，ACF：日期、新人、人數、notes（Repeater）
- `segments` → Flexible Content / Repeater，裡面再一層 `items` Repeater
- 每場產生一條不公開的 sublink（不進 sitemap、noindex，之後可加簡單密碼）
- 貼上轉換器保留在後台：同事貼 WhatsApp 文字 → 自動拆好 → 逐項確認後存檔
- 這就是 CLAUDE.md 待辦裡「Big Day 協調」構想的第一步：同一筆紀錄，各身分讀同一份
