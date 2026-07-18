# 素材資料夾

正式美術的 sprite sheet 圖檔放這裡,例如:

```
public/assets/player.png   ← 玩家 sprite sheet
public/assets/enemy.png    ← 敵人 sprite sheet
public/assets/stage-bg.png ← (可選)場景背景圖
```

## 換圖步驟(不用動任何遊戲邏輯)

1. 把圖檔放進本資料夾
2. 打開 `src/config/assets.ts`:
   - 修改各角色的 `path`、`frameWidth`、`frameHeight`
   - 依實際 sheet 調整 `animations` 內每個動作(idle / walk / attack1 / attack2 / attack3 / jump / hit / knockdown / block)的幀範圍與 frameRate
   - 背景圖的話把 `stage.backgroundImage` 設成檔名(例如 `'stage-bg.png'`)
3. 把 `usePlaceholders` 改成 `false`

完成後角色就會自動改用 sprite sheet 播動畫(含左右翻面、受擊白閃改用 tint)。
