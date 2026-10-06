# 虛擬試穿（Virtual Try-On）三個案例技術分析

> 調查日期：2026-10-06
> 說明：② 和 ③ 已下載原始影片逐秒擷取畫面、並做語音轉文字分析；① 的 Threads 影片無法下載，只根據貼文文字與公開文件推論。標註「推論」的部分不是官方說法。

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

## ③ Anywear（Decart）— 影片逐格分析，也是另外兩個的基礎

> IG Reel 是印度創作者用泰盧固語配音的 47 秒介紹（語音辨識不出可用內容），以下主要根據畫面。另外加上 Decart 的官方文件。

### 影片裡實際發生的事
1. **Chrome 線上應用程式商店頁面**：「Anywear: Live Virtual Try-On」，4.9 星（22 則評分）、**4,000 位使用者**；影片中是裝在 **Brave** 瀏覽器（Chromium 系的瀏覽器都能裝）。
2. **在 Amazon（印度站）商品頁**開啟後，右側浮出一個可拖動的視窗「**Try-On + Anywear**」，裡面是自己的鏡頭畫面。
3. **入鏡引導**：黑底加白色人形輪廓，寫著「**Step back**」（往後退）。人要退到上半身（甚至全身）都在框裡才會開始 → 先做人體偵測／姿勢估計，確認身體位置。
4. **把商品圖拖進來**：視窗出現「**Drag a product image here**」，直接把頁面上的模特兒照（格紋襯衫）拖進去。
5. **結果**：
   - 格紋襯衫穿上後，他**轉側身、轉背面**，衣服的背面也生成出來（商品圖只有正面）。
   - 換紅黑賽車外套（有大 logo 和文字）：他**舉手、揮手、轉身**，外套跟著動，原本裡面那件 T 恤會在外套打開處露出。
6. **排隊畫面**：「**QUEUE – You're #5 in line – Estimated wait 2:30 – A faster queue is available – SKIP THE WAIT — FROM $1.99**」。

### 從畫面推論的技術
- **拖曳 → 取得商品圖網址**：擴充功能讀取網頁上的 `<img>`，把圖片送到後端。商品圖可以是模特兒穿著照，模型會自己把衣服「抽」出來（不需要去背平拍圖，這點跟 ② 不同）。
- **入鏡檢查（Step back）**：瀏覽器端先用輕量的人體／姿勢偵測（例如 MediaPipe 類），確定身體框到位才連線，避免浪費 GPU。
- **鏡頭 → WebRTC → Decart 雲端 GPU 跑 Lucy VTON → 傳回影片**：每一幀重新生成，所以轉身會出現原圖沒有的背面、舉手時衣服會跟著拉伸。
- **排隊＝每位使用者佔用一張 GPU**：同時在線人數有上限，所以要排隊；「$1.99 跳過排隊」表示**算力是有成本的**，免費版靠排隊控制用量。
- 官方文件補充：輸出 720p，輸入可用「參考圖＋文字 prompt」（例如「把上衣換成海軍藍連帽外套」），也提供 API 給開發者（`lucy-vton-latest`）。

### 怎麼用
- 一般使用者：Chrome 線上應用程式商店搜尋「Anywear」→ 安裝 → 到任一服飾網站商品頁 → 開啟 Try-On 視窗、允許鏡頭 → 往後退到入鏡 → 把商品圖拖進視窗 → 可能要排隊。
  - 小技巧：穿**合身、素色**的衣服（不要厚外套）、光線充足、背景單純、跟鏡頭保持距離。
- 店家：Shopify 一鍵安裝，其他網站貼一行約 17KB 的 script；會自動偵測商品圖。
- 開發者：Decart Platform API（WebRTC），後端用 API key 換 10 分鐘有效的 client token，前端呼叫 `realtime.connect(cameraStream)` 後 `set({ image, prompt })`。

### 優點（影片裡看得到的）
- **真的會動**：轉身、舉手、背面都有，像照鏡子，這是靜態圖試穿做不到的。
- **任何網站、任何商品圖都可以**：Amazon 模特兒照直接拖進去就能用，不用店家配合、也不用自己準備去背圖。
- **不用上傳自拍或建 3D 模型**，開鏡頭就能用。

### 缺點與限制（影片裡看得到或推得出的）
- **要排隊**：#5 等 2 分 30 秒；尖峰時間更久，想跳過要付費 → 免費 Beta 的體驗不穩定，以後一定會收費。
- **一定要在雲端跑、要好的網路**：每一幀都在 GPU 上生成，無法離線。
- **入鏡要求高**：要退後到身體入框，筆電鏡頭在書桌前通常太近；手機版的擴充不能用（擴充只支援桌機）。
- **背面是「猜」的**：商品圖只有正面，背面細節由模型想像，不一定跟實品一樣。
- **logo／文字／圖案容易走樣**：賽車外套上的字和 logo 在快速動作時很難每一幀都正確（這是生成模型的通病，影片解析度不足以逐字確認）。
- **尺寸、版型不可信**：模型會讓衣服「看起來合身」，但不會依尺碼表模擬，S 和 XL 看起來可能一樣。
- **原本的衣服會干擾**：外套打開時露出裡面原本的 T 恤；穿厚衣服或寬鬆衣服時效果會變差（官方也建議脫掉厚外套）。
- **隱私**：鏡頭畫面持續上傳到第三方；擴充功能需要讀取網頁內容的權限（IG 留言也有人提醒這點）。

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

## ② Jev × Drape：衣櫃 + AI 決策換裝（@ammiamia_）— 影片逐格分析

> 你聽到的「JEF」是 **Jev**。Threads 貼文是轉貼 X 上 @nailthy62 的 31 秒 demo（文字一字不差），我下載了原始影片，逐秒擷取畫面並把語音轉成文字。

### 影片裡實際發生的事（時間軸）
| 時間 | 她說的話 | 畫面上的變化 | 面板數據 |
|---|---|---|---|
| 0:00–0:11 | "Hey, I'm going out this weekend, pick a dress for me." | 原本穿米色 T 恤＋短褲 | 等待中 |
| 0:12 | — | 換成**黑色長洋裝**（midnight maxi） | jev response 562ms／累計 3 次請求／$0.0032 |
| 0:16–0:19 | "How about white?" | 換成**淡黃白色多層 halter 洋裝**（tiered halter） | 1451ms／5 次／$0.0054 |
| 0:23–0:26 | "Actually, just give me something casual." | 換成**櫻桃圖案 T 恤＋白色寬褲＋球鞋**（整套） | 1228ms／7 次／$0.0076 |
| 0:31–0:33 | "…and another jacket." | 加上**黑色飛行外套**（black bomber），其他不動 | 1485ms／9 次／$0.0101 |
| 0:37–0:38 | "All right, save this outfit." | 存成一套 look（packed looks: 1 saved） | 10 次／$0.0112 |

### 介面拆解（把右側面板放大看）
1. **語音輸入：「local whisper」** — 用 Whisper 語音辨識，標示 local，表示**在本機跑**，不用把聲音上傳；面板顯示 `speech 117–137ms`。也可以打字（type a styling request）。
2. **wardrobe：60 件單品** — 全部是**去背的平拍商品圖**（上衣、褲、洋裝、外套、鞋、包、帽子、眼鏡、項鍊、耳環）。被選中的單品會打勾。
3. **request route（意圖分類）** — Jev 先判斷這句話屬於哪一類，並給機率：
   - `specific item`（換某一件）、`whole outfit`（換整套）、`remove a piece`（脫掉某件）、`other / no styling change`（不是穿搭指令）。
   - 例：「How about white?」→ specific item 93%、other 6%、whole outfit 1%。
   - 例：「something casual」→ **whole outfit 98%**，於是面板改成顯示 `outfit candidates`（selected / alternative / alternative 三套）。
4. **item candidates（挑單品）** — 從衣櫃裡挑，也附機率：
   - 「white」→ tiered halter 99%、white mini 1%、black halter 0%。
   - 「jacket」→ black bomber 100%、olive blazer 0%、distressed denim 0%。
5. **jev: change clothing** — 最後的動作指令。
6. **live preview + 左下角「original」小視窗** — 大畫面是換裝後的即時影像，小窗是原始鏡頭畫面，可以前後對照；狀態列顯示 `mirror live · 356–411ms ack`，表示換裝引擎（mirror）在約 0.4 秒內確認收到指令。
7. **go back / pack this / packed looks** — 上一步、存成一套 look、已存的穿搭。

### 從數字反推它怎麼運作
- **每句話會呼叫兩次 Jev**：請求數每句增加 2（3→5→7→9），而且先有 route、才有 candidates → 推論是兩段式：①先分類意圖、②再從衣櫃挑單品或整套。
- **每次呼叫約 $0.0011**：$0.0101 ÷ 9 次 ≈ $0.0011，跟貼文寫的一致。
- **每次呼叫約 2.5 萬個 token**：累計 tokens 從 127,896 增加到 239,556（4 次約 11 萬）→ 每次都把**整個衣櫃 60 件的描述＋目前穿著＋對話**一起丟進去。依 Jev 的價格（輸入每百萬 token $0.042）：25,000 × 0.042 / 1,000,000 ≈ $0.001，剛好對得上。
- **「620ms／次」是單次呼叫**，但畫面上每句話的 jev response 是 **1.2–1.5 秒**（第一句 562ms 較快）→ 兩段串接後，使用者實際感受約 1.5 秒，再加上換裝畫面生成時間。
- **換裝引擎（mirror）**：影片沒寫是誰的。依「人在動、衣服跟著動、約 0.4 秒反應」推論是 Decart Lucy VTON 這類**即時影片 VTON**（同 ③），把 Jev 選到的單品圖當參考圖送進去。

### 整體架構（推論）
```
麥克風 → 本機 Whisper（~120ms）→ 文字
文字 + 目前穿著 + 60 件衣櫃描述
   → Jev 呼叫 1：意圖分類（specific item / whole outfit / remove / other）
   → Jev 呼叫 2：挑單品 or 挑整套（附機率）
   → 選中單品圖 → 即時 VTON（mirror）→ live preview
鏡頭 ───────────────────────────────┘
```

### 我們如果要自己做，要準備什麼
1. **衣櫃資料**：每件衣服一張去背平拍圖 + 文字描述（名稱、類別、顏色、風格、場合）。Jev 看的是文字，VTON 看的是圖片。
2. **意圖分類**：固定幾類（換一件／換整套／脫掉／無關）。用 Jev 的 `choice`，或一般 LLM 輸出 JSON（較慢、較貴，但能說明理由）。
3. **單品／整套選擇**：選項就是衣櫃 ID 清單；整套要另外處理「上衣＋下身＋鞋子」的組合規則。
4. **狀態管理**：記住目前穿什麼、可以上一步（go back）、存成 look。
5. **換裝引擎**：即時影片 VTON（雲端 GPU）或靜態圖 VTON。

### 優點（影片裡看得到的）
- **自然語言就能操作**：「白色的呢？」「隨性一點」「再加件外套」都聽得懂，包括**只改一件、其他保留**（加外套時褲子和 T 恤沒變）。
- **每個決定都有機率**，可以拿來做「信心不夠就問使用者」或列出備選。
- 很便宜：整段 38 秒的試穿約 **$0.011**（不含換裝引擎的費用）。

### 缺點與限制（影片裡看得到或推得出的）
- **不是 620ms**：一句話實際約 1.2–1.5 秒才決定好，加上畫面生成；「即時」是相對 LLM 而言。
- **每次都送整個衣櫃**：衣櫃從 60 件變成 600 件，token 和費用大約多 10 倍，延遲也會增加 → 衣服一多就要先篩選（例如用向量搜尋先找前 30 件）。
- **配件沒有被套用**：衣櫃有包包、項鍊、眼鏡，但影片只換了衣服和鞋子 → VTON 對小配件效果差或不支援。
- **demo 很理想**：全身入鏡、光線好、站著不太動、單人。
- **Jev 不會解釋**：只回答選哪件，沒有「為什麼」；需要說明理由要另外接 LLM。
- **衣櫃建檔成本**：60 件全部要整理成乾淨的商品圖，真實使用者很難做到。
- 這是實驗性 demo（built for Drape），**Drape App 目前不一定有這個功能**。

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
- 原始 X 貼文（Jev × Drape，影片已逐格分析）：https://x.com/nailthy62/status/2101388186916454439
- Instagram Reel（Anywear，影片已逐格分析）：https://www.instagram.com/reel/DdmLMnwTgib/
- Anywear：https://anywear.decart.ai/free-kfir-x 、店家版 https://anywear.decart.ai/business
- Decart Lucy VTON 即時 API 文件：https://docs.platform.decart.ai/models/realtime/virtual-try-on
- Decart 電商試穿範例：https://docs.platform.decart.ai/examples/ecommerce-try-on
- Lucy VTON 模型頁：https://platform.decart.ai/models/lucy-vton-realtime
- Jev 評測（eesel）：https://www.eesel.ai/blog/jev-ultrafast
- Jev 介紹（DigitalOcean）：https://www.digitalocean.com/resources/articles/what-is-jev
- Drape App：https://apps.apple.com/us/app/drape-app/id6747585294
- AI 虛擬試穿支援 SHOPLINE（Genlook，Yahoo 新聞）：https://tw.stock.yahoo.com/news/ai%E8%99%9B%E6%93%AC%E8%A9%A6%E7%A9%BF%E6%8A%80%E8%A1%93%E5%86%8D%E9%80%B2%E5%8C%96-%E9%9B%BB%E5%95%86%E6%9C%8D%E9%A3%BE10%E7%A7%92%E4%B8%8A%E8%BA%AB%E6%8F%90%E5%8D%87%E8%B3%BC%E7%89%A9%E8%BB%8A%E8%BD%89%E6%8F%9B-025138267.html
