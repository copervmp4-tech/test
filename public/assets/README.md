# 素材資料夾

所有素材路徑集中在 `src/config/assets.ts`,換圖只改那個檔、不動遊戲邏輯。

## 目前的檔案

角色 sprite sheet(1536×1280,6 欄 × 5 排,每格 256×256):

```
tonni.png   ← Tonni(功夫裝男生,平衡型)
hanah.png   ← Hanah(女生,速度型)
daru.png    ← Daru(黑白衣胖胖,力量型)
yama.png    ← Yama(赤膊男生,技巧型)
```

角色頭像(選角畫面用,約 110×84):`portrait-<角色>.png`

場景背景(960×540):

```
stage-bg.png      ← 天台黃昏(台北 101)
stage-street.png  ← 街道夜晚(夜市老街)
stage-dojo.png    ← 道場白天
```

戰鬥 UI(`ui/` 子資料夾,tools/slice_ui_kit.py 從整張 UI kit 切出):

```
ui/hpbar-blue.png / ui/hpbar-red.png     ← 血條框(玩家藍 / 敵人紅)
ui/joystick-base.png / joystick-thumb.png ← 虛擬搖桿
ui/btn-attack.png / btn-jump.png / btn-block.png ← 攻擊 / 跳躍 / 防禦鈕
```

## 工具(tools/)

- `prepare_spritesheet.py <in> <out> [--min-bg N] [--report]`
  角色 sheet 白底去背 + 清格線;`--report` 印出各幀 bounding box(算 scale/footOffset/punchReach 用),背景偏灰時用 `--min-bg` 調低門檻。
- `slice_ui_kit.py <kit> <outdir>`：把一張 UI kit 自動切成上列各元件。
- `build-singlefile.mjs`:把 `npm run build` 產物 + 被引用到的素材打包成 `dist/single.html`(單檔可直接發佈)。

## 換角色 sprite sheet 的步驟

1. 用 `prepare_spritesheet.py` 去背輸出到本資料夾
2. `src/config/assets.ts` 的 `fighters` 改對應 `path`,並依 `--report` 實測值更新
   `scale`(顯示身高)、`footOffset`(腳貼地)、`bodyWidth`(受擊寬)、`punchReach`(拳長)
3. 若幀排列不同,調 `animations` 的幀號
4. `usePlaceholders` 已是 `false`,直接生效

## 換 UI / 背景

- UI:換掉 `ui/` 內對應 PNG 即可(尺寸不限,程式會依按鈕直徑自動縮放);
  血條的內部填色區若比例不同,改 `src/ui/HealthBar.ts` 頂部的 `FILL` 常數。
- 背景:把圖放進本資料夾,改 `src/config/stages.ts` 對應場地的 `backgroundImage`。
