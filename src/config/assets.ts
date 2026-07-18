/**
 * 素材集中設定檔。
 *
 * 【如何換上正式美術】
 * 1. 把 sprite sheet 圖檔放進 public/assets/(例如 public/assets/player.png)
 * 2. 修改下方對應角色的 path / frameWidth / frameHeight
 * 3. 依實際圖檔調整 animations 內每個動作的幀範圍(start/end)與 frameRate
 * 4. 把 usePlaceholders 改成 false
 * 完成,遊戲邏輯完全不用動。
 */

/** 動畫名稱,與角色狀態一一對應(Fighter.playAnimation 使用) */
export type AnimationName =
  | 'idle'
  | 'walk'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'jump'
  | 'hit'
  | 'knockdown'
  | 'block';

/** 單一動畫在 sprite sheet 上的幀範圍 */
export interface AnimationDef {
  start: number;      // 起始幀(sprite sheet 由左到右、由上到下編號,從 0 開始)
  end: number;        // 結束幀
  frameRate: number;  // 每秒幀數
  repeat: number;     // -1 = 循環,0 = 播一次
}

/** 一個角色的 sprite sheet 定義 */
export interface FighterSpriteDef {
  key: string;              // 貼圖 key(也是動畫 key 的前綴:`${key}-idle`)
  path: string;             // 圖檔路徑,相對於 public/assets/
  frameWidth: number;       // sprite sheet 單幀寬
  frameHeight: number;      // sprite sheet 單幀高
  scale: number;            // 顯示縮放:讓角色顯示身高貼齊 bodyHeight
  footOffset: number;       // 幀底部留白(px,原圖尺寸):腳底到幀底邊的距離
  bodyWidth: number;        // 受擊判定的身體寬(依站姿實測人形寬)
  bodyHeight: number;       // 受擊判定的身體高
  punchReach: number;       // 出拳時拳頭尖端距角色中心的距離(顯示 px,依出拳幀實測)
  placeholderColor: number; // 色塊模式的顏色
  animations: Record<AnimationName, AnimationDef>;
}

/**
 * 兩隻角色共用的動畫切割(sheet 為 1536×1280,6 欄 × 5 排,每格 256×256,
 * 幀號由左到右、由上到下編號,空格也佔號:第 n 排從 n*6 開始)。
 * 注意:目前素材沒有專屬的二三段攻擊與防禦動畫——
 * attack2/attack3 先共用出拳幀(12-14,用幀率做節奏差)、block 借用拳架姿勢(12),
 * 之後補圖只要改這裡的幀號。
 */
const DEFAULT_ANIMATIONS: Record<AnimationName, AnimationDef> = {
  idle:      { start: 0,  end: 3,  frameRate: 6,  repeat: -1 }, // 第 1 排:待機 4 幀
  walk:      { start: 6,  end: 11, frameRate: 10, repeat: -1 }, // 第 2 排:走路 6 幀
  attack1:   { start: 12, end: 14, frameRate: 14, repeat: 0 },  // 第 3 排:架式→出拳→收拳
  attack2:   { start: 12, end: 14, frameRate: 16, repeat: 0 },
  attack3:   { start: 12, end: 14, frameRate: 12, repeat: 0 },
  jump:      { start: 18, end: 19, frameRate: 8,  repeat: 0 },  // 第 4 排:蓄力→空中(定格滯空;落地幀 20 暫未用)
  hit:       { start: 24, end: 24, frameRate: 1,  repeat: 0 },  // 第 5 排第 1 幀:後仰
  knockdown: { start: 24, end: 26, frameRate: 8,  repeat: 0 },  // 第 5 排:後仰→倒下→躺平
  block:     { start: 12, end: 12, frameRate: 1,  repeat: -1 },
};

/** 場地外觀定義(場地清單在 config/stages.ts) */
export interface StageDef {
  backgroundImage: string | null; // 放圖檔路徑(相對 public/assets/)即可取代漸層背景
  drawGround: boolean;            // 是否疊上純色地面(背景圖自帶地面時設 false)
  gradientTop: string;            // 漸層背景上方顏色(也是選場地預覽卡的顏色)
  gradientBottom: string;         // 漸層背景下方顏色
  groundColor: number;            // 地面顏色
  groundEdgeColor: number;        // 地面邊緣(地平線)亮色條
  horizonY: number;               // 地平線在畫面上的 y
}

export const ASSETS = {
  /** true = 用程式繪製色塊;false = 載入下方定義的 sprite sheet */
  usePlaceholders: false,

  /** 素材根目錄(對應 public/assets/) */
  basePath: 'assets/',

  // 四位角色的 sprite sheet(數值皆用 tools/prepare_spritesheet.py --report 實測)
  fighters: {
    tonni: {
      key: 'tonni',
      path: 'tonni.png', // 功夫裝男生
      frameWidth: 256,
      frameHeight: 256,
      scale: 0.52,       // 站姿實高 184px → ×0.52 ≈ 96
      footOffset: 29,
      bodyWidth: 44,     // 站姿 bbox 90px × 0.52,再內縮少許
      bodyHeight: 96,
      punchReach: 42,    // 出拳幀拳尖 81px × 0.52
      placeholderColor: 0x3b82f6,
      animations: { ...DEFAULT_ANIMATIONS },
    } as FighterSpriteDef,

    hanah: {
      key: 'hanah',
      path: 'hanah.png', // 灰衣女生
      frameWidth: 256,
      frameHeight: 256,
      scale: 0.54,       // 站姿實高 179px → ×0.54 ≈ 97
      footOffset: 30,
      bodyWidth: 44,
      bodyHeight: 96,
      punchReach: 44,    // 81px × 0.54
      placeholderColor: 0x3fae5a,
      animations: { ...DEFAULT_ANIMATIONS },
    } as FighterSpriteDef,

    daru: {
      key: 'daru',
      path: 'daru.png', // 黑白衣胖胖
      frameWidth: 256,
      frameHeight: 256,
      scale: 0.5,        // 站姿實高 196px → ×0.5 = 98(體格較壯)
      footOffset: 29,
      bodyWidth: 48,     // 站姿 bbox 100px × 0.5
      bodyHeight: 98,
      punchReach: 52,    // 104px × 0.5,手長
      placeholderColor: 0xd94040,
      animations: { ...DEFAULT_ANIMATIONS },
    } as FighterSpriteDef,

    yama: {
      key: 'yama',
      path: 'yama.png', // 沒穿上衣的男生
      frameWidth: 256,
      frameHeight: 256,
      scale: 0.52,       // 站姿實高 184px → ×0.52 ≈ 96
      footOffset: 31,
      bodyWidth: 44,
      bodyHeight: 96,
      punchReach: 42,    // 80px × 0.52
      placeholderColor: 0xe8c33a,
      animations: { ...DEFAULT_ANIMATIONS },
    } as FighterSpriteDef,
  },

  ui: {
    /** 標題畫面主視覺圖(相對 public/assets/),null = 用深色漸層 placeholder */
    titleBackgroundImage: null as string | null,
    /** 戰鬥 UI 素材(tools/slice_ui_kit.py 的輸出);設為 null 即回退程式繪製 */
    hpBarPlayer: 'ui/hpbar-blue.png' as string | null,
    hpBarEnemy: 'ui/hpbar-red.png' as string | null,
    joystickBase: 'ui/joystick-base.png' as string | null,
    joystickThumb: 'ui/joystick-thumb.png' as string | null,
    btnAttack: 'ui/btn-attack.png' as string | null,
    btnJump: 'ui/btn-jump.png' as string | null,
    btnBlock: 'ui/btn-block.png' as string | null,
  },
};
