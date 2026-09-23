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

## 待辦
- [ ] 視覺 Demo 給客戶看效果(2026-09-23 已發第一版:https://claude.ai/artifact/3w2hqc2Nqv1D8YCuRyYE5d ,私人連結需手動分享)
- [ ] 客戶確認方向後 → 寫 `docs/SPEC.md`(CPT/ACF欄位表、Elementor Theme Builder結構、Finder+Compare custom plugin規格)
- [ ] 跟客戶核對 Monterey / Renaissance Ribera 正確地址
- [ ] repo public/private 待客戶談妥後決定(比照 ryukyusurfbase 客戶專案模式,憑證/客戶資料絕不進repo)
