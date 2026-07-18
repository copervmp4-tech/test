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
  bodyWidth: number;        // 碰撞/受擊判定的身體寬(與美術幀尺寸可不同)
  bodyHeight: number;       // 碰撞/受擊判定的身體高
  placeholderColor: number; // 色塊模式的顏色
  animations: Record<AnimationName, AnimationDef>;
}

/** 兩隻角色共用的預設動畫切割(換圖時依實際 sheet 調整) */
const DEFAULT_ANIMATIONS: Record<AnimationName, AnimationDef> = {
  idle:      { start: 0,  end: 3,  frameRate: 8,  repeat: -1 },
  walk:      { start: 4,  end: 9,  frameRate: 12, repeat: -1 },
  attack1:   { start: 10, end: 13, frameRate: 16, repeat: 0 },
  attack2:   { start: 14, end: 17, frameRate: 16, repeat: 0 },
  attack3:   { start: 18, end: 22, frameRate: 16, repeat: 0 },
  jump:      { start: 23, end: 26, frameRate: 10, repeat: 0 },
  hit:       { start: 27, end: 28, frameRate: 12, repeat: 0 },
  knockdown: { start: 29, end: 32, frameRate: 10, repeat: 0 },
  block:     { start: 33, end: 33, frameRate: 1,  repeat: -1 },
};

export interface StageDef {
  backgroundImage: string | null; // 放圖檔路徑(相對 public/assets/)即可取代漸層背景
  gradientTop: string;            // 漸層背景上方顏色
  gradientBottom: string;         // 漸層背景下方顏色
  groundColor: number;            // 地面顏色
  groundEdgeColor: number;        // 地面邊緣(地平線)亮色條
  horizonY: number;               // 地平線在畫面上的 y
}

export const ASSETS = {
  /** true = 用程式繪製色塊;false = 載入下方定義的 sprite sheet */
  usePlaceholders: true,

  /** 素材根目錄(對應 public/assets/) */
  basePath: 'assets/',

  fighters: {
    player: {
      key: 'player',
      path: 'player.png',
      frameWidth: 64,
      frameHeight: 96,
      bodyWidth: 64,
      bodyHeight: 96,
      placeholderColor: 0x3b82f6, // 玩家:藍色
      animations: { ...DEFAULT_ANIMATIONS },
    } as FighterSpriteDef,

    enemy: {
      key: 'enemy',
      path: 'enemy.png',
      frameWidth: 64,
      frameHeight: 96,
      bodyWidth: 64,
      bodyHeight: 96,
      placeholderColor: 0xef4444, // 敵人:紅色
      animations: { ...DEFAULT_ANIMATIONS },
    } as FighterSpriteDef,
  },

  stage: {
    backgroundImage: null,
    gradientTop: '#1b2947',
    gradientBottom: '#8a97c4',
    groundColor: 0x46424e,
    groundEdgeColor: 0x5c5768,
    horizonY: 370,
  } as StageDef,
};
