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

**新人姓名、賓客、工作人員真名絕不放 `public/`**。

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
