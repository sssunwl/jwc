# 客戶會議工單 — Japan Wedding Chapel 網站改版

狀態：**方向討論會議用**，尚未簽約，目的是讓客戶看過 Demo、對齊方向、確認下一步。

## 會議前準備

- Demo 網址（建議電腦大螢幕展示，手機版也已支援）：**https://sssunwl.github.io/jwc/**
- 建議先強制重新整理 / 開無痕視窗，避免展示到舊版快取
- 簡報大綱（15頁，含品牌分析 Before/After）：點頁尾「CMS 預覽 ▸」開統一面板，裡面有三個分頁：CMS 後台／品牌分析／簡報大綱

## 建議走訪順序

1. **品牌分析 Before/After**（CMS 預覽面板 → 品牌分析分頁）— 先讓客戶看到「內容資產已經很強，問題是策展方式」這個診斷
2. **Demo 從 Hero 滑到 Footer**，順順看一輪整體視覺（Japanese Editorial × Resort × Luxury Minimal）
3. **Chapel Finder** — 示範地區／人數／海景篩選，即時更新
4. 點一間教堂看 **Chapel Detail Modal**（資料化的 spec box + editorial 敘事 + 真實相片）
5. **Compare 表** — 收藏教堂後動態產生比較欄位
6. **VENUES（6項）+ 沖繩婚禮誌（4項）** — 原網場地與資訊頁的文字/圖庫已經整批搬進站內，不再外連舊網站
7. **Real Weddings** 故事頁 — 點開任一對新人，看完整婚攝相冊（30-40張真實照片）+ 燈箱瀏覽
8. **Wedding Media Options** — 播放示範：Opening Movie／Profile Movie／Ending Roll／迎賓Loop，開啟電子相片書並切換 3 種雜誌風格（日式／歐式／潮牌）
9. **Wedding Pass 婚禮通行證**（手機 Mockup 區塊）— 明確講這是**未來產品線概念**，不是現在就要做的功能
10. **CMS 後台 Before/After**（頁尾 CMS 預覽面板）— WordPress 選單 12項雜亂 vs 簡化後 4項
11. **簡報大綱**（15頁完整版）收尾，對照口頭講重點

## 需要跟客戶確認的決定

- [ ] 整體視覺方向是否認可（Editorial × Resort × Luxury Minimal，退玫瑰金/粉紅配色）
- [ ] 第一期優先做的範圍：Chapel Finder + CMS 是否為必做核心
- [ ] Wedding Media Options（回顧影片／電子相片書等）要不要做成新人可加購服務，定價模式怎麼談
- [ ] Wedding Pass 要不要列入第一期規劃，還是之後獨立的產品線/報價
- [ ] repo／正式網域要 public 還是 private，對外時機
- [ ] 預算範圍與分期時程

## 已知資料問題（主動跟客戶說明，展現嚴謹）

- Monterey Lumer／Renaissance Ribera 的地址，原網站內部本身就有兩種寫法（教堂頁寫読谷村，部分舊文章寫恩納村），需要客戶當面核實正確地址
- 素食主義餐廳婚宴的官方照片（IMG_6744/6745/6751/6755）在原官網上**全部連結失效（404）**，不是我們這邊抓錯，Demo 裡已標註並暫用同類場地照片示意，需要客戶補新照片
- 日本商用婚禮影片如果要配商業歌曲，需另外確認會場播放／複製授權，不是直接用串流平台下載歌曲就能播（ゼクシィ 也特別提醒這點）

## Demo 完成範圍（誠實區分，避免客戶誤會已完成的程度）

**真的可互動：**
Chapel Finder 篩選、11 間教堂 Detail Modal、動態 Compare 表、Real Weddings 故事頁＋完整婚攝相冊＋燈箱瀏覽、Wedding Media Options（4款影片示範＋電子相片書3種風格）、CMS／品牌分析／簡報大綱統一面板、VENUES（6項）與沖繩婚禮誌（4項）的真實文字與圖庫

**只是概念示意，尚未開發：**
Wedding Pass（手機 Mockup 示意首頁，沒有後端）、互動遊戲點子（猜新人遊戲／拍照任務／おみくじ，僅簡報提案）、印刷品（僅列出構想）

## 會議後續

- 依會議決定事項更新 `docs/SPEC.md`
- 若方向確認，下一步：排分期時程與報價
- 若客戶想看更多操作細節，可安排 Zoom Screen Share 直接現場操作 Demo
