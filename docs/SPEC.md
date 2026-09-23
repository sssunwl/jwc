# SPEC — Japan Wedding Chapel 改版

狀態:**方向討論階段**,尚未跟客戶開會定案。以下是目前的提案,不是已核准的規格。

## 定位
Okinawa Destination Wedding Atelier — 高端沖繩婚禮策劃品牌 + Chapel Finder + Real Wedding Portfolio + Okinawa Wedding Magazine

視覺方向:Japanese Editorial × Resort Wedding × Luxury Minimal(不走粉紅/金框/傳統婚禮公司調性,退後一步讓照片本身的白/海/綠/夕陽說話)

## 技術路線:Hybrid WordPress(已定案,不做 Headless)
- 保留 WordPress + Elementor + WPML,不換平台
- 一般品牌頁(Home/About/Planning/Photography等)→ 仍用 Elementor,客戶維持原本操作習慣
- 教堂 / Real Weddings / Journal → 改成 **Custom Post Type + ACF Pro**,Elementor Theme Builder 只設計一次模板,內容全部動態拉 ACF 欄位,客戶不再碰 Elementor
- Chapel Finder / Compare → Custom WordPress Plugin(shortcode),資料仍讀 CPT+ACF
- 客戶登入後看到簡化過的 Dashboard(隱藏 Plugins/Tools/Themes/Elementor Settings 等),感覺像專用 CMS

## 資料結構(草案)

### Chapels CPT
教堂中文名 / English Name / 日本語名稱 / Area / Address / Google Map / Capacity / Aisle Length / Ceremony Style / Banquet Rooms / Banquet Capacity / Cuisine / Nearby Hotels / Main Image / Gallery / Features / Description / Status / Related Weddings / SEO Title / SEO Description

真實資料已抓好 → `../data/chapels.json`(11間)

### Real Weddings CPT
Couple / Wedding Date / Chapel(關聯Chapels) / Photographer / Planner / Hero / Gallery / Story / Style tags

### Site Settings(全站共用)
Company Name / Phone / WhatsApp / LINE / Email / Instagram / Vision Wedding Instagram / Office Address / Google Map / Inquiry CTA / Footer Text

## 首頁架構(草案)
1. Hero — 全屏照片/影片,極少文字
2. Find Your Chapel — 篩選(Area/Guests/Style/Ocean View/Banquet/Hotel Nearby)+ 卡片網格
3. Chapel Spotlight — 精選教堂 editorial 長格式頁
4. Compare Chapels — 已收藏教堂比較表
5. Real Weddings — Portfolio 網格(不是 Blog 流)
6. Journal 導流 — 沖繩結婚/教堂雜誌(獨立內容產品,見 `../../wedding/`)
7. Client CMS 說明區塊(給客戶看後台會多好用)

Navigation:CHAPELS / REAL WEDDINGS / WEDDING PLANNING / EXPERIENCES / PHOTO & FILM / JOURNAL / ABOUT / INQUIRE

## Vision Wedding 串接
客戶另一品牌(IG @visionwedding,婚攝)。Real Weddings 頁可標「Photographed by Vision Wedding」導流,Photo & Film 頁可放 Vision Wedding Portfolio。兩品牌共用同一份教堂/婚禮資料庫,不用兩邊各抄一次。

## 已知資料問題(重做CMS前要處理)
- Monterey Lumer / Renaissance Ribera 地址在網站內部就有矛盾寫法(読谷村 vs 恩納村),詳見 `../data/chapels.json` 的 `address_flag`
- Centlegenda Chapel 頁面還在但主選單沒收錄,10間主選單 + 這1間 = 11間

## 視覺 Demo
2026-09-23 第一版(用官網真實照片):https://claude.ai/artifact/3w2hqc2Nqv1D8YCuRyYE5d

## 下一步
- [ ] 跟客戶開會確認方向 + 時程 + 預算
- [ ] 定案後補完整 ACF 欄位表 + Elementor Theme Builder 結構
- [ ] Finder/Compare plugin 技術規格
- [ ] Staging 網址(建議 `staging.japanweddingchapel.com`),URL slug 盡量保留原有 SEO 路徑
