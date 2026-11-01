# 測試

不改遊戲邏輯，只檢查：規則能跑完、隱私不外洩、圖片缺失能回退、文字對比度足夠。

| 檔案 | 內容 | 需求 |
|---|---|---|
| `sim-games.js` | 30 場模擬對局（含機器人）跑到結束；逐步檢查身分/token 不外洩、身分卡與技能卡只出現在本人畫面 | Node |
| `sim-security.js` | 以公開 id 冒用連線會被拒絕；以 token 才能重連；投影畫面 payload 不含 token | Node |
| `sim-ui.js` | 規則分頁、選單頁尾、30 場畫面渲染不出錯 | Node |
| `browser.js` | Chromium：每個身分只請求自己的身分卡；投影畫面零身分/技能卡請求；圖片失敗回退；兩主題對比度 ≥ 4.5 | Node + playwright |

```
npm i -g playwright            # 只需一次（瀏覽器測試）
NODE_PATH=$(npm root -g) node tests/run-all.js
node tests/browser.js --shots=./shots   # 另存截圖
```

測試讀取上層的 `index.html`；`browser.js` 自行起臨時靜態伺服器，不需外網（PeerJS 以 stub 取代）。
