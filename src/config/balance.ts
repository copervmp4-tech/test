/**
 * 數值設定檔:血量、傷害、速度、攻擊範圍、AI 行為機率都在這裡調。
 * 時間單位:秒;距離單位:像素;速度:像素/秒。
 */

/** 單段攻擊的參數 */
export interface AttackDef {
  damage: number;          // 傷害
  windup: number;          // 前搖(出手前)
  active: number;          // 判定持續時間(hitbox 存在的時間窗)
  recovery: number;        // 後搖(收招)
  reachBonus: number;      // 額外距離:hitbox 尖端 = 角色實測拳長(assets 的 punchReach)+ 此值
  height: number;          // hitbox 高度
  knockback: number;       // 擊退初速度
  lunge: number;           // 出招時向前小衝的距離
  causesKnockdown: boolean; // 命中是否直接擊倒(第三段)
}

export const BALANCE = {
  maxHealth: 100,

  // ── 移動 ──
  walkSpeed: 200,   // 左右走路速度
  zWalkSpeed: 130,  // 淺景深上下走位速度

  // ── 跳躍(參考 LF2:偏高、偏飄)──
  jumpVelocity: 640, // 起跳初速度(往上)
  gravity: 1350,     // 重力加速度(數字越小越飄)

  // ── 三連擊(攻擊距離貼合美術:拳尖 = punchReach + reachBonus)──
  attacks: [
    { damage: 8,  windup: 0.10, active: 0.12, recovery: 0.16, reachBonus: 2,  height: 54, knockback: 130, lunge: 6,  causesKnockdown: false },
    { damage: 8,  windup: 0.09, active: 0.12, recovery: 0.18, reachBonus: 5,  height: 54, knockback: 150, lunge: 10, causesKnockdown: false },
    { damage: 15, windup: 0.14, active: 0.14, recovery: 0.32, reachBonus: 10, height: 58, knockback: 300, lunge: 22, causesKnockdown: true },
  ] as AttackDef[],

  // ── 防禦 ──
  blockDamageMultiplier: 0.2, // 防禦中受擊傷害 ×0.2(減 80%)

  // ── MP 氣力(招式消耗,隨時間回復)──
  mp: {
    max: 100,
    start: 50,        // 開場氣力
    regenPerSec: 12,  // 每秒自動回復
  },

  // ── 招式指令輸入 ──
  command: {
    window: 0.5,      // 指令序列需在此秒數內完成
    dirDeadzone: 0.5, // 搖桿方向要超過此值才算一次方向輸入
  },

  // ── 被動:第十拍(僅特定角色)──
  passive: {
    tenthBeat: {
      threshold: 9,       // 累積九層後,下一次普攻自動閃避
      dodgeInvuln: 0.45,  // 閃避後無敵時間
      backdashSpeed: 400, // 閃避後退初速
    },
  },

  // ── 受擊 / 擊倒 ──
  hitStun: 0.3,                  // 受擊硬直
  hitFlashDuration: 0.12,        // 受擊變白時間
  knockdownDamageThreshold: 25,  // 單次損血超過此值 → 擊倒
  knockdownDuration: 1.0,        // 倒地時間
  knockdownPopVelocity: 240,     // 被擊倒時彈起的初速度
  riseInvulnDuration: 0.5,       // 起身無敵時間
  knockbackDamping: 5,           // 擊退速度衰減(越大停得越快)

  // ── 淺景深(LF2 式 Z 軸)──
  zTolerance: 30, // 攻擊判定允許的深度差

  // ── 場地邊界 ──
  arena: {
    wallLeft: 48,     // 左牆(角色中心最小 x)
    wallRight: 912,   // 右牆
    floorTop: 392,    // 地面帶上緣(腳的最小 y,越小越深)
    floorBottom: 524, // 地面帶下緣
  },

  // ── 敵人 AI ──
  ai: {
    attackChance: 0.6,      // 進入攻擊範圍後:60% 攻擊
    blockChance: 0.2,       // 20% 防禦
    retreatChance: 0.2,     // 20% 後退
    decisionInterval: 0.55, // 兩次決策間隔
    attackRange: 78,        // 視為「進入攻擊範圍」的中心距離(貼合實際拳長)
    blockDuration: 0.6,     // 防禦持續時間
    retreatDuration: 0.45,  // 後退持續時間
    openingDelay: 1.0,      // 開場緩衝(先不出手)
  },
};
