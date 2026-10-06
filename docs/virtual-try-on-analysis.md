# 虛擬試穿（Virtual Try-On）三個案例技術分析

> 調查日期：2026-10-06
> 說明：Threads／IG 的影片本身無法直接觀看，以下根據貼文文字、留言與各產品公開文件推論。標註「推論」的部分是依公開資料推測，不是官方說法。

---

## 總覽

| | ① 即時試穿 × Shopline（@gaopei_） | ② Jev × Drape 衣櫃換裝（@ammiamia_） | ③ Anywear Chrome 擴充（Decart） |
|---|---|---|---|
| 核心問題 | 「這件商品穿在我身上長怎樣」 | 「從我衣櫃挑哪件」＋換上去 | 「任何網站的衣服，鏡頭上即時穿上」 |
| 試穿生成 | 即時影片生成（推論：Decart Lucy VTON 或同類） | 圖片／影片 VTON | Decart **Lucy VTON** 即時影片模型 |
| 決策大腦 | 無（使用者自己點） | **Jev**（TypeSafe System One，~620ms／次） | 無（使用者拖曳） |
| 衣服來源 | 商店商品圖（Shopline 商品頁） | 自己的衣櫃資料庫 | 任何網頁上的商品圖片 |
| 輸入 | 鏡頭 | 語音＋目前穿著＋衣櫃 | 鏡頭＋拖曳的圖片 |
| 形式 | 店家嵌入的 script／按鈕 | App（Drape） | Chrome 擴充／店家 script |

一句話：**③ 是底層引擎（即時換衣模型），① 很可能是把同類引擎接到 Shopline，② 是在換衣引擎上面多加一層「AI 幫你挑」的決策模型。**

---

## ③ Anywear（Decart）— 先講，因為它是另外兩個的基礎

### 是什麼
- Decart 出的 Chrome 擴充：在 Zara、ASOS、Amazon 等商品頁，把商品圖**拖到自己身上**，鏡頭畫面裡就即時穿上，人轉身衣服會跟著擺動。
- 也有店家版：Shopify 一鍵安裝，其他網站貼一行約 17KB 的 `<script>`，會自動偵測商品圖、在頁面出現「試穿」浮動按鈕。
- 目前 Beta 免費，店家試用版容量有限。

### 底層技術
- **Lucy VTON**（Decart 的即時 video-to-video 擴散／世界模型）。不是把衣服圖片「貼」在身上的 AR 疊圖，而是**每一幀重新生成**畫面，所以有布料垂墜、擺動。
- 傳輸：瀏覽器用 **WebRTC** 把鏡頭串流送到 Decart GPU 伺服器，模型改完再串流回來（官方宣稱模型反應 <30ms，加上網路來回）。
- 輸入：鏡頭串流 + 衣服參考圖（建議 ≥512×512、素色背景）+ 文字 prompt（例如 "Substitute the current top with a navy blue hoodie"）。
- 輸出：1280×720 / 720×1280。另有 batch 模式可處理錄好的影片。
- 安全：後端用正式 API key 換 10 分鐘有效的 client token，前端只拿短效 token。

### 怎麼用
- 一般使用者：Chrome 線上應用程式商店搜尋「Anywear」→ 安裝 → 開鏡頭 → 到品牌網站把商品圖拖到自己身上。建議脫掉厚外套、全身或上半身入鏡、光線充足。
- 開發者：Decart Platform 申請 API key，使用 `lucy-vton-latest`，核心程式碼：

```js
const rt = await client.realtime.connect(cameraStream, {
  model,
  onRemoteStream: (s) => (videoEl.srcObject = s),
});
await rt.set({ prompt: "Substitute the current top with ...", image: garmentBlob });
```

### 優點
- 真的是「即時、會動」的試穿，體驗遠超靜態照片。
- 不用上傳照片、不用建 3D 模型；任何網站的商品圖都能用。
- 店家導入成本極低（一行 script）。

### 缺點／限制
- **算力貴、靠雲端 GPU**：每位使用者佔一條即時 GPU 串流，按秒計費（官方未公開價格，fast mode 2 倍價）；免費 Beta 不會永遠存在。
- **需要穩定網路**，延遲或掉幀時體驗崩壞；手機版目前以店家嵌入為主，擴充只有桌機。
- **尺寸不準**：生成模型是「看起來像」，不是依尺碼表模擬，S 跟 L 看起來可能差不多 → 不能取代尺寸建議。
- 生成式模型會有幻覺：logo、文字印花、細節花紋、透明材質、多層穿搭容易走樣；身體被遮擋或大動作時會閃爍。
- **隱私**：鏡頭畫面持續送到第三方伺服器（IG 留言就有人提醒「別隨便把鏡頭權限給第三方擴充」）；擴充需讀取所有網站內容的權限。
- 商品圖如果是模特兒穿著照、背景雜亂，抽取衣服的品質會下降。

---

## ① 即時試穿 × Shopline（@gaopei_）

### 已知資訊
- 貼文只有：「『即時試穿衣服』支援 Shopline，實現在家逛網拍還可以隨時試穿衣服」。作者是做 AI 工具的創作者，沒寫用了哪個產品。
- 你描述影片中有「**原始穿搭 vs 試穿結果**」並排比對。

### 底層技術（推論）
很可能就是 ③ 的技術路線，套到 Shopline 店上：
1. **衣服怎麼抓**：Shopline 商品頁的主圖（DOM 裡的 `<img>`、`og:image`，或 Shopline Open API 的商品資料）。Anywear 的店家版就是「自動偵測頁面上的商品圖」，不需要店家標註；Shopline 後台允許插入自訂程式碼（追蹤碼／自訂 HTML），所以「貼一行 script」就能「支援 Shopline」。
2. **即時生成**：鏡頭 → WebRTC → Lucy VTON（或同類即時 VTON API）→ 回傳換好衣服的串流。
3. **原始 vs 試穿比對**：WebRTC 本來就有兩條串流——本地鏡頭（原始）和模型回傳（試穿），並排放兩個 `<video>` 就是比對畫面。Decart 官方電商範例也是這種 split-screen 寫法。

> 也有可能是其他廠商（例如 Genlook 宣稱支援 Shopify / WooCommerce / SHOPLINE，但那是**上傳一張照片、約 10 秒出靜態圖**，不是即時影片）。若影片中衣服會跟著動作即時變化，就是 Decart 類的即時模型；若是拍照後等幾秒出一張圖，就是靜態圖 VTON（如 Genlook、ChatGPT、Google Try On、開源 CatVTON / IDM-VTON）。

### 怎麼用
- 若你是**消費者**：直接用 ③ Anywear 擴充，在 Shopline 店家頁面上也能拖曳試穿。
- 若你是 **Shopline 店家／開發者**：
  1. 申請 Decart API key，自己寫小後端發 client token；
  2. 在 Shopline「自訂程式碼」插入 script，抓商品主圖、加試穿按鈕；
  3. 開鏡頭，左邊原始、右邊試穿。
  或直接問 Anywear 店家版能否以「any site one line」方式裝在 Shopline。

### 優缺點
- 優點：同 ③，且直接嵌在店家頁，轉換率導向；比對畫面讓決策更直觀。
- 限制：同 ③（GPU 成本由**店家**付，流量大時很貴；尺寸不準；隱私告知與同意）。此外 Shopline 的主題／程式碼插入能力比 Shopify 受限，商品圖若是模特兒照需要先去背或挑平拍圖。

---

## ② Jev × Drape：衣櫃 + AI 決策換裝（@ammiamia_）

> 你聽到的「JEF」應該是 **Jev**。

### 是什麼
- 原始 demo 出自 X 上的 @nailthy62，為 **Drape**（AI 衣櫃／虛擬試穿 App）做的實驗：
  1. 我講話（例如「想要約會穿的、比較正式一點」）
  2. Jev 讀**語音逐字稿 + 我現在穿什麼**
  3. 從**我的衣櫃**挑出要換的單品
  4. 即時換上
- 成本：**每次決策 $0.0011**；速度：**約 620ms／次**。

### 底層技術（兩層）
1. **決策層 — Jev（TypeSafe 的 "System One" 模型）**
   - 不是一般聊天 LLM。它不產生文字，而是對一組「型別化問題」**一次平行輸出**答案。三種原語：`choice`（從選項挑一個）、`score`（在量表上打分）、`noul`（校準過的是/否）。
   - 延遲 70–500ms，比前沿 LLM 快數十倍；輸入約 $0.042／百萬 token，輸出免費。
   - 在這個 demo 裡：選項 = 衣櫃中每件衣服的 ID；問題 = 「要換上衣嗎？換哪件？下身呢？」→ 回傳結構化結果。
2. **生成層 — 虛擬試穿模型**
   - 把 Jev 選到的衣服圖丟進 VTON（Drape 本身的試穿引擎，或 Lucy VTON 這類即時模型）換到使用者身上。
3. 外加 **語音轉文字（STT）** 與 **衣櫃資料庫**（每件衣服的去背圖 + 類別／顏色／季節／場合等標籤）。

### 怎麼用
- 一般使用者：Drape App（iOS）可建立衣櫃、分「抽屜」（上班、海邊、約會）、虛擬試穿。語音即時換裝目前是實驗 demo，不一定是正式功能。
- 自己做（與本 repo「Wardrobe」最相關）：
  1. 衣櫃建檔：拍照 → 去背 → 用視覺模型自動打標籤（類別、顏色、材質、場合）。
  2. 決策：把「使用者需求 + 目前穿著 + 天氣/場合 + 衣櫃清單」丟給 Jev 做 `choice`；或用一般 LLM（較慢但能解釋原因）。
  3. 生成：選中的衣服 → VTON（即時用 Lucy VTON；靜態用 CatVTON / IDM-VTON / 商用 API）。

### 優點
- **把「挑衣服」這件最花腦力的事交給 AI**，而不只是「試穿一件你已經選好的」。
- 決策又快又便宜，可以做到「邊講邊換」的即時互動；成本低到可以每句話都算一次。
- 用的是**自己已經有的衣服** → 適合穿搭規劃、減少重複購買；也可延伸成「這件新衣服跟我衣櫃配不配」。

### 缺點／限制
- **衣櫃建檔是最大門檻**：使用者要拍每件衣服，品質直接決定挑選與試穿效果。
- Jev **不會解釋、不會多步推理**，只能在給定選項中挑；想要「為什麼這樣配」要另外接 LLM。
- 「品味」難以量化：挑出來的搭配是否好看，依賴標籤品質與使用者偏好資料。
- 試穿層的限制同 ③（尺寸不準、細節走樣、算力成本）；620ms 是**決策**時間，不含生成畫面的時間。
- Jev 是新產品，定價自己也說還不確定能否長期維持，有供應商風險。

---

## 技術路線整理：虛擬試穿有哪幾種做法

| 路線 | 代表 | 原理 | 優點 | 缺點 |
|---|---|---|---|---|
| 2D AR 疊圖 | 早期美妝／眼鏡濾鏡 | 姿勢偵測 + 把衣服圖變形貼上 | 可在手機端跑、便宜 | 很假，不會有皺褶垂墜 |
| 3D 物理模擬 | CLO3D、品牌 3D 試衣間 | 3D 人體 + 3D 衣服打版 + 布料模擬 | **尺寸最準** | 每件衣服都要建 3D，成本極高 |
| 靜態圖生成 VTON | ChatGPT 試穿、Google Try On、Genlook、CatVTON、IDM-VTON | 擴散模型：人像照 + 衣服圖 → 新照片 | 逼真、任何商品圖可用 | 要等幾秒、不會動、尺寸不準 |
| **即時影片 VTON** | **Decart Lucy VTON / Anywear** | 逐幀即時生成的 video diffusion | 會動、像鏡子 | GPU 貴、要網路、隱私、仍不準尺寸 |
| 決策層（搭配） | **Jev**、LLM 搭配推薦 | 從衣櫃選出單品組合 | 解決「穿什麼」 | 依賴衣櫃資料品質 |

## 對本專案（Wardrobe）的建議起點
1. **先做衣櫃資料層**（拍照、去背、自動標籤）—這是 ② 類應用的核心資產，也與試穿引擎無關、不會被淘汰。
2. 試穿引擎先接**現成 API**（靜態用便宜的圖片 VTON 做 MVP；要「鏡子」體驗再接 Lucy VTON 即時），不要自己訓練模型。
3. 決策層先用一般 LLM 做出能解釋原因的搭配建議；需要「即時語音換裝」再評估 Jev。
4. 一開始就處理隱私：鏡頭／照片的同意、保存期限、是否送第三方。

---

## 資料來源
- Threads @gaopei_ 貼文：https://www.threads.com/share/GQz7DkGt_/
- Threads @ammiamia_ 貼文：https://www.threads.com/share/CKjxE4NCUQ/
- 原始 X 貼文（Jev × Drape）：https://x.com/nailthy62/status/2101388186916454439
- Instagram Reel：https://www.instagram.com/reel/DdmLMnwTgib/
- Anywear：https://anywear.decart.ai/free-kfir-x 、店家版 https://anywear.decart.ai/business
- Decart Lucy VTON 即時 API 文件：https://docs.platform.decart.ai/models/realtime/virtual-try-on
- Decart 電商試穿範例：https://docs.platform.decart.ai/examples/ecommerce-try-on
- Lucy VTON 模型頁：https://platform.decart.ai/models/lucy-vton-realtime
- Jev 評測（eesel）：https://www.eesel.ai/blog/jev-ultrafast
- Jev 介紹（DigitalOcean）：https://www.digitalocean.com/resources/articles/what-is-jev
- Drape App：https://apps.apple.com/us/app/drape-app/id6747585294
- AI 虛擬試穿支援 SHOPLINE（Genlook，Yahoo 新聞）：https://tw.stock.yahoo.com/news/ai%E8%99%9B%E6%93%AC%E8%A9%A6%E7%A9%BF%E6%8A%80%E8%A1%93%E5%86%8D%E9%80%B2%E5%8C%96-%E9%9B%BB%E5%95%86%E6%9C%8D%E9%A3%BE10%E7%A7%92%E4%B8%8A%E8%BA%AB%E6%8F%90%E5%8D%87%E8%B3%BC%E7%89%A9%E8%BB%8A%E8%BD%89%E6%8F%9B-025138267.html
