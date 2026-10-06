# Wardrobe 試衣間（Demo v1）

跨品牌收藏的虛擬試衣間。在任何服飾網站看到喜歡的衣服就收進試衣間，再自由搭配上衣、外套、下身、鞋子、帽子和配件，最後套用到你自己的影片上試穿，並且可以「左右滑動讓人轉身、雙指放大看細節」。

React Native（Expo SDK 57 + Expo Router），可以直接在 Android 的 **Expo Go** 執行，不需要 Android Studio。

## 功能

| 分頁 | 功能 |
|---|---|
| **我的試衣間** | 所有收藏的單品；依**分類**（短袖、長袖、外套、長褲、帽子…）、**品牌**、**季節／系列**（例如 2026 秋冬）、**標籤**篩選，也能搜尋 |
| **逛街** | 內建瀏覽器，有 UNIQLO／GU／ZARA／H&M／COS／Pinterest 捷徑。打開商品頁按「＋ 加入試衣間」，自動抓名稱、品牌、價格、描述和圖片 |
| **搭配** | 依部位選上衣、外套、下身、連身、鞋子、帽子、配件（可多選），組成一套後儲存，或直接試穿 |
| **我** | 錄製或選擇自己的基準影片（原地轉一圈）、身高體重、Decart API Key |

- **單品頁（小 blog）**：多張圖片可左右滑、點開可雙指縮放，加上介紹、標籤、筆記、「前往原網站」連結，以及這件出現在哪幾套搭配。
- **加入的方式**：
  1. 在「逛街」分頁的內建瀏覽器按「加入試衣間」。UNIQLO、GU 這類網頁要跑完才有商品資料的網站，用這個方式最穩。
  2. 在任何 App 複製商品連結，再到試衣間按右下角＋。會自動讀取剪貼簿並解析頁面（支援 JSON-LD、Open Graph、Shopify 商店）。
  3. 手動新增：用相簿裡的照片或截圖。
- 圖片會另存一份在手機裡，就算商品下架，試衣間還是看得到。
- **試穿**：
  - 把搭配的單品一件一件疊到你的基準影片上，順序是：下身 → 上衣 → 外套 → 鞋 → 帽 → 配件。使用 Decart Lucy VTON 3.5 的影片批次 API。
  - 完成後在 3D 檢視器裡：沒碰時自動循環播放；左右拖曳讓人轉身；雙指或雙擊放大；可以切換「試穿後／原始」比較。
- **示範模式**：沒有 API Key 時，整個流程（搭配、試穿、3D 檢視、儲存）照樣能跑，只是影片不會真的換衣。

## 在 Android 手機上用 Termux + Expo Go 執行

1. 先從 Play 商店安裝或更新 **Expo Go**，要支援 SDK 57。
2. 在 Termux 裡執行：

```sh
pkg update && pkg install -y git nodejs-lts
git clone https://github.com/gsn943314/Wardrobe.git
cd Wardrobe
git checkout claude/virtual-try-on-analysis-2yfong
npm install
npx expo start --localhost
```

3. 打開 Expo Go，選「Enter URL manually」，輸入 `exp://127.0.0.1:8081`。
   - 如果要用另一台裝置連，改用 `npx expo start`，再掃描終端機上的 QR code。
4. 第一次打包約需 1–3 分鐘。之後改程式碼會自動重新載入。

> 小提醒：Termux 被切到背景時，Android 可能會暫停它，導致 Metro 中斷。可以在 Termux 的通知列按「Acquire wakelock」。

## 開始試用

1. **我** → 「現在錄影」，錄你自己的影片：
   - 手機固定在腰的高度，全身入鏡；
   - 穿合身、素色的衣服；
   - 原地慢慢轉一圈，6–10 秒。

   錄好後就能在「我」分頁先試左右滑動轉身。如果轉的方向相反，按「翻轉方向」。
2. **逛街** → 打開幾件商品 → 「＋ 加入試衣間」。
   - 確認分類、季節和標籤。
   - 圖片：點一下設為封面，**長按設為試穿用圖**。選「只有衣服、背景乾淨」的那張效果最好。
3. **搭配** → 「＋ 新搭配」→ 選好各部位 → 「試穿這套」。
4. 想要真的換衣：到 **我** 填入 Decart API Key（從 <https://platform.decart.ai/> 取得）。
   - 費用約 **US$0.04／秒／件**。例如 8 秒影片 × 3 件 ≈ US$0.96。開始前畫面會顯示估價。

## 專案結構

```
src/
  app/                    Expo Router 畫面
    (tabs)/index.tsx      我的試衣間（篩選＋格狀列表）
    (tabs)/browse.tsx     內建瀏覽器＋加入試衣間
    (tabs)/outfits.tsx    搭配列表
    (tabs)/me.tsx         基準影片、身形、API Key
    item/new.tsx          貼連結／手動新增
    item/[id]/index.tsx   單品頁（圖片、介紹、連結）
    item/[id]/edit.tsx    編輯單品
    outfit/[id].tsx       搭配編輯器
    tryon/[outfitId].tsx  試穿流程與結果檢視
  components/
    TurntableViewer.tsx   假 3D 轉身檢視器（擷取影格＋拖曳＋縮放）
    ZoomableImage.tsx     單張圖片縮放
    ItemForm.tsx          新增／編輯表單
  lib/
    productParser.ts      商品頁解析（JSON-LD / Open Graph / Shopify）
    webExtractor.ts       在內建瀏覽器的頁面裡抓商品資料
    categories.ts         分類、部位、季節判斷
    filter.ts             篩選與分面統計
    tryon/plan.ts         試穿步驟順序與英文指令
    tryon/decart.ts       Decart 影片批次 API
    tryon/run.ts          多件依序疊加的試穿流程
  store/WardrobeStore.tsx 本機資料（AsyncStorage）
docs/virtual-try-on-analysis.md   三個參考案例與模型比較分析
```

## 網頁預覽版（不用手機環境也能試）

```sh
npm run preview:web   # 產生 dist-web/wardrobe-preview.html，單一檔案，瀏覽器直接打開
```

網頁版和 Android 版的差別：
- 「逛街」分頁的內建瀏覽器無法在網頁上嵌入其他網站，改成說明頁。請用「範例單品」或相簿照片新增。
- 選的影片只在目前分頁有效，重新整理後要重選。
- AI 試穿只有示範模式。
- 資料存在瀏覽器裡（localStorage）。

## 開發指令

```sh
npm test            # 解析器、分類、試穿步驟的單元測試
npm run typecheck   # TypeScript
npx expo lint       # ESLint（含 React Compiler 規則）
```

## 目前的限制（v1）

- **Expo Go 無法出現在系統的「分享」選單**。所以「在別的 App 按分享 → 加入試衣間」要等之後改成 development build（例如加 `expo-share-intent`）。目前請用內建瀏覽器或複製連結。
- **Decart API Key 直接存在手機**（安全儲存區），只適合自己用的 demo。正式上架要改成由後端發短效 token。
- **試穿是一件一件疊上去**，每件都要算一次，所以件數越多越慢、越貴；生成式模型的通病（logo 走樣、背面是 AI 推測的）也都存在。
- **尺寸不準**：畫面只代表「看起來」，不代表實際尺寸合身。身高體重目前只有記錄，下一版可以拿來比對商品尺寸表。
- **「用照片生成自己的預設影片」還沒做**。原因是生成影片時身材比例容易跑掉，和「越準越好」的目標相衝突，所以 v1 先用你自己錄的真實影片。
