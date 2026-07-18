import type { AnimationName } from './assets';

/**
 * 招式與被動資料表。所有數值集中在這裡調整。
 * 招式行為分三種 kind:
 *   projectile 投射物(弧光射門)、slide 低身滑鏟(破陣鏟球)、aerial 空中連踢(逆空倒掛)。
 * command 是「觸發鍵之前」需依序出現的指令(在 balance.command.window 秒內);
 * trigger 是最後按下的鍵。方向以角色面向為準:forward = 面向前方、up = 搖桿上。
 */

export type HitCategory = 'normal' | 'special' | 'throw' | 'stage';
export type MoveKind = 'projectile' | 'slide' | 'aerial';
export type InputToken = 'defend' | 'forward' | 'back' | 'up' | 'down';
export type TriggerKey = 'attack' | 'jump';

export interface MoveDef {
  id: string;
  name: string;
  command: InputToken[]; // 觸發鍵前的指令序列
  trigger: TriggerKey;   // 最後觸發鍵
  mpCost: number;
  kind: MoveKind;
  animation: AnimationName; // placeholder 借用的動畫(換正式動畫改這裡與 assets)

  // 時序(秒)
  startup: number;   // 前搖
  active: number;    // 判定 / 位移持續
  recovery: number;  // 後搖(落空/被防禦的破綻)

  // 命中
  damage: number;         // 單段傷害
  knockback: number;      // 水平擊退
  launch: number;         // 向上擊飛初速(0 = 無)
  causesKnockdown: boolean; // 命中是否擊倒(aerial 為最後一段)
  hits: number;           // 判定段數(aerial 多段;其餘為 1)

  // 近身判定框(slide / aerial)
  reach: number;   // 往前延伸
  height: number;  // 判定高
  yCenter: number; // 判定中心距腳的高度比例(0 = 腳,1 = 頭頂)

  // 移動
  forwardSpeed: number; // slide 前滑 / aerial 前移速度
  riseVelocity: number; // aerial 起跳初速

  // 防禦性
  invulnStartup: number; // startup 期間對普通攻擊的無敵(投技無效)
  lowProfile: number;    // slide:受擊框高度倍率(<1 = 變矮,不完全無敵)

  // 投射物(projectile)
  projectileSpeed: number;
  projectileRange: number;
  projectileRadius: number;
  projectileColor: number;
}

/** 招式參數預設值(未用到的欄位保持 0/1) */
const MOVE_BASE: Omit<MoveDef, 'id' | 'name' | 'command' | 'trigger' | 'mpCost' | 'kind' | 'animation'> = {
  startup: 0.12, active: 0.1, recovery: 0.25,
  damage: 0, knockback: 0, launch: 0, causesKnockdown: false, hits: 1,
  reach: 0, height: 0, yCenter: 0.5,
  forwardSpeed: 0, riseVelocity: 0,
  invulnStartup: 0, lowProfile: 1,
  projectileSpeed: 0, projectileRange: 0, projectileRadius: 0, projectileColor: 0xffffff,
};

/** Yama(角色 id: tech)的三招 */
const YAMA_MOVES: MoveDef[] = [
  {
    ...MOVE_BASE,
    id: 'arc-shot',
    name: '弧光射門',
    command: ['defend', 'forward'],
    trigger: 'attack',
    mpCost: 20,
    kind: 'projectile',
    animation: 'attack2', // 挑球起腳(placeholder 借用)
    startup: 0.18,
    active: 0.06,
    recovery: 0.30,
    damage: 12,
    knockback: 240,
    projectileSpeed: 470,
    projectileRange: 560,
    projectileRadius: 15,
    projectileColor: 0x7fe3ff,
  },
  {
    ...MOVE_BASE,
    id: 'slide-tackle',
    name: '破陣鏟球',
    command: ['defend', 'forward'],
    trigger: 'jump',
    mpCost: 25,
    kind: 'slide',
    animation: 'jump', // 低身姿(placeholder;繪製時再壓低)
    startup: 0.10,
    active: 0.28,
    recovery: 0.40, // 落空/被防禦的明顯破綻
    damage: 12,
    knockback: 130,
    launch: 200,    // 命中稍微浮空,方便銜接
    reach: 82,
    height: 44,
    yCenter: 0.18,  // 打下盤
    forwardSpeed: 540,
    lowProfile: 0.55, // 滑行時受擊框變矮
  },
  {
    ...MOVE_BASE,
    id: 'bicycle-kick',
    name: '逆空倒掛',
    command: ['defend', 'up'],
    trigger: 'attack',
    mpCost: 30,
    kind: 'aerial',
    animation: 'jump',
    startup: 0.10,
    active: 0.44,
    recovery: 0.32, // 落地硬直
    damage: 6,      // 每段
    knockback: 170,
    launch: 150,    // 每段小幅浮空,維持連段;最後一段改為大幅擊飛
    causesKnockdown: true, // 最後一段擊飛倒地
    hits: 3,
    reach: 66,
    height: 74,
    yCenter: 0.62,
    forwardSpeed: 130,
    riseVelocity: 600,
    invulnStartup: 0.16, // 起跳初期對普攻無敵(投技仍可抓)
  },
];

export const MOVES_BY_CHARACTER: Record<string, MoveDef[]> = {
  tech: YAMA_MOVES,
};

export function getMoves(characterId: string): MoveDef[] {
  return MOVES_BY_CHARACTER[characterId] ?? [];
}

// ───────────────────────── 被動 ─────────────────────────

export type PassiveId = 'tenthBeat';

export interface PassiveDef {
  id: PassiveId;
  name: string;
  description: string;
}

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  tenthBeat: {
    id: 'tenthBeat',
    name: '第十拍',
    description: '每被不同攻擊命中一次累積一層,滿九層後下一次普通攻擊自動閃避並反身無敵。',
  },
};
