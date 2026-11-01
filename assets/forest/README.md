# 森林版美術素材（art-forest）

- 原始組合圖：`assets-src/original/`（含 SHA256SUMS.txt，不可覆寫）
- 重新產生：`python3 tools/make-forest-art.py`（需要 pillow、numpy、scipy）
- 程式引用：`index.html` 內的 `ART` 對照表；缺圖或載入失敗時自動退回 emoji
- 素材為 AI 協助生成的插圖

| 檔案 | 用途 | 可見對象 |
|---|---|---|
| cards/role-wolf / villager / seer / witch.webp | 身分卡 | 僅該玩家本人 |
| cards/skill-peek / save / mute / blur.webp | 技能卡 | 僅持有者本人 |
| backgrounds/bg-cover.webp | 大廳、確認身分、結束 | 公開投影 |
| backgrounds/bg-night.webp | 夜晚、投票、開票、遺言 | 公開投影 |
| backgrounds/bg-dawn.webp | 天亮、發言 | 公開投影 |

## 待補
- 「護衛犬」身分卡（現有「彈弓獵人」不符，暫用 emoji）
- 方舟版全部素材（`ART.ark` 已預留，目前為空）
- 16:9 的夜晚／天亮場景（現為 1672×466 橫條，投影時放大約 2.3 倍）
- 12 張中性座位頭像（目前為動物 emoji）

## 第二批（護衛犬、方舟版、座位頭像）
- forest/cards/role-hunter.webp：護衛犬身分卡（已補）
- forest/avatars/av-01~12.webp、ark/avatars/av-01~12.webp：12 張中性座位頭像（公開投影用，不含角色線索）
- ark/cards/：方舟版 5 張身分卡與 4 張技能卡
- 新的 16:9 場景圖解析度偏低（約 600×280），暫不採用，沿用原背景
