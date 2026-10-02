# Vision Wedding — Japan Wedding Chapel 客戶專案

客戶官網 japanweddingchapel.com 改版。**客戶專案**,同一位客戶另有 IG @visionwedding(婚攝品牌)。

## 唯一真相來源
- 規格/架構決策 → `docs/SPEC.md`
- 教堂資料庫(11間,含地址/人數/聖潔之路/宴會廳/料理/圖片) → `data/chapels.json`
  - `wedding/` 資料夾的教堂資料是這份的唯讀副本,客戶WP後台改了資料要回頭同步這裡

## 現狀
- 官網:WordPress + Elementor + WPML,不打算換平台,目標是把「很多文章」升級成「教堂 CMS」(CPT + ACF + Elementor Theme Builder),客戶維持用後台改資料,不再碰 Elementor 拖版
- 這資料夾本身**不是可部署的代碼庫**,實作最終落在客戶的 WordPress。這裡放規格、資料、視覺 Demo/Prototype
- 已知資料錯誤:`data/chapels.json` 裡 Monterey Lumer 和 Renaissance Ribera 的地址有 `address_flag` 標記,網站內部本身資料就有矛盾(部分文章寫恩納村、教堂頁寫読谷村),重做CMS前務必跟客戶核實,不要照抄現有任一方

## Repo / Demo 網址
- repo:https://github.com/sssunwl/jwc(public,GitHub Actions 部署 Pages,來源資料夾 `public/`。原名 VisionWedding,2026-09-23 改名 jwc,資料夾與 repo 同步改)
- Demo/簡報頁(公開連結,可直接發給客戶):https://sssunwl.github.io/jwc/
  - 首頁 = **可互動**的視覺 Demo(真實照片重建):Chapel Finder 篩選(地區/人數/海景)即時生效、卡片可點開完整教堂詳情 modal(11間全收錄)、♡收藏會即時更新下方 Compare 表(存在 localStorage)、Real Weddings 照片可點擊放大、頁底導覽/INQUIRE 都是真的錨點連結,INQUIRE 區塊的 WhatsApp/Email 是客戶真實聯絡方式
  - 頁底 = 12頁簡報大綱,方便跟客戶口頭溝通改版重點
  - 改 `public/index.html` 後 push 到 main 會自動重新部署(`.github/workflows/deploy-pages.yml`)
- claude.ai 上原本的 Design 版 Demo(私人連結,備用):https://claude.ai/artifact/3w2hqc2Nqv1D8YCuRyYE5d

- **Big Day Rundown**(2026-10-02 加):現場版 https://sssunwl.github.io/jwc/day/ (`public/day/`,PWA 可加主畫面,中日英,沖繩時區倒數,Web Push 通知,PIN 管理模式可現場延後/改時間/取消/公告);CMS Demo 手機框 iframe 嵌同一頁。後端 `worker/`(CF Worker `jwc-rundown` + KV + Durable Object 鬧鐘,帳號 cron 名額已滿所以不用 cron)。資料 `public/rundowns/*.json` 用代號,真名版在 `private/rundowns/`(gitignore,絕不進 public repo)。PIN/VAPID 在 `~/.config/jwc/rundown.json`。全部細節見 `docs/RUNDOWN.md`。10/03 團隊不跟教堂儀式(早上完成),Rundown 只從宴會開始

## 待辦
- [ ] 客戶確認方向後 → 補完整 `docs/SPEC.md`(CPT/ACF欄位表、Elementor Theme Builder結構、Finder+Compare custom plugin規格)
- [ ] 跟客戶核對 Monterey / Renaissance Ribera 正確地址
- [ ] 客戶正式簽約後,實際改版工程要不要另開 repo 或沿用這個,到時再決定
- [ ] **構想(2026-09-26,先記著,還沒驗證要不要做)**:Big Day 當天協調問題——WhatsApp 諮詢→開單→有異動時,同事跟日文教堂同事溝通可能不完整,如何確保大家到 Big Day 手上都是最新資訊?SS 提的方向是官網做每組新人專屬 sublink,依身分(賓客/新人親屬/教堂同事)顯示不同內容,加集中 Announcement Corner + 賓客照片影片上傳。Claude 的建議(見對話紀錄):核心該解的是「同一筆結構化紀錄,各身分讀唯讀篩選版」,不要分開維護多份內容;賓客上傳直接用 Google Drive/Photos 共享相簿,不要自己做儲存。**但也覺得這對現階段規模可能是多此一舉**——先低成本驗證(一份共用文件/表格 + Google Photos 相簿,實際跑一兩場婚禮)看是否真的不夠用,再決定要不要真的建置。
