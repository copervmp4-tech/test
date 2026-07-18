import Phaser from 'phaser';
import { FighterSpriteDef } from '../config/assets';
import { BALANCE } from '../config/balance';
import { MoveDef, PassiveId } from '../config/moves';
import { Fighter, FighterInput, FighterStats, NEUTRAL_INPUT } from './Fighter';

type AiMode = 'chase' | 'combo' | 'block' | 'retreat';

/**
 * 簡單 AI:朝玩家走近,進入攻擊範圍後
 * 60% 攻擊(隨機 1~3 段連擊)、20% 防禦、20% 後退。
 * 若角色有招式且 MP 足夠,攻擊時有機率改用招式。
 * 被擊倒後的起身由 Fighter 基類處理。
 */
export class EnemyAI extends Fighter {
  private mode: AiMode = 'chase';
  private modeTimer = 0;
  private cooldown = BALANCE.ai.openingDelay;
  private plannedHits = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: FighterSpriteDef,
    stats: FighterStats,
    moves: MoveDef[] = [],
    passiveId: PassiveId | null = null,
  ) {
    super(scene, x, y, def, -1, stats, moves, passiveId);
  }

  /** 產生這一幀的輸入,交給 Fighter.update 執行 */
  think(dt: number, target: Fighter): FighterInput {
    const input: FighterInput = { ...NEUTRAL_INPUT };
    if (!this.isAlive() || !target.isAlive()) return input;

    const ai = BALANCE.ai;
    const dx = target.x - this.x;
    const dz = target.y - this.y;

    this.cooldown -= dt;
    this.modeTimer -= dt;

    // 招式執行中:交給 Fighter 跑完,這幀不下其他指令
    if (this.fighterState === 'special') return input;

    // 被打斷(受擊/擊倒)時放棄目前行為
    if ((this.fighterState === 'hit' || this.fighterState === 'knockdown') && this.mode !== 'chase') {
      this.mode = 'chase';
      this.cooldown = ai.decisionInterval;
    }

    // 對手在空中且自己有對空招 → 有機率放逆空倒掛
    if (target.canBeHit() && this.mode === 'chase' && this.cooldown <= 0) {
      if (this.tryContextualSpecial(dx, dz, target)) {
        this.cooldown = ai.decisionInterval;
        return input;
      }
    }

    switch (this.mode) {
      case 'chase': {
        if (Math.abs(dx) > ai.attackRange - 12) input.moveX = Math.sign(dx);
        if (Math.abs(dz) > 12) input.moveZ = Math.sign(dz);
        const inRange = Math.abs(dx) <= ai.attackRange && Math.abs(dz) <= BALANCE.zTolerance * 0.8;
        if (inRange && this.cooldown <= 0) this.decide(input, dx);
        break;
      }
      case 'combo': {
        if (this.fighterState === 'attack') {
          if (this.comboStage < this.plannedHits) input.attackPressed = true; // 預約下一段
        } else if (this.fighterState === 'idle' || this.fighterState === 'walk') {
          this.backToChase();
        }
        break;
      }
      case 'block': {
        input.blockHeld = true;
        if (this.modeTimer <= 0) this.backToChase();
        break;
      }
      case 'retreat': {
        input.moveX = dx !== 0 ? -Math.sign(dx) : -this.facing;
        if (this.modeTimer <= 0) this.backToChase();
        break;
      }
    }

    // 站定時面向玩家
    if (this.fighterState === 'idle' && input.moveX === 0) {
      this.facing = dx >= 0 ? 1 : -1;
    }
    return input;
  }

  private decide(input: FighterInput, dx: number): void {
    this.facing = dx >= 0 ? 1 : -1;
    const roll = Math.random();
    if (roll < BALANCE.ai.attackChance) {
      this.mode = 'combo';
      this.plannedHits = 1 + Math.floor(Math.random() * 3); // 1~3 段
      input.attackPressed = true;
    } else if (roll < BALANCE.ai.attackChance + BALANCE.ai.blockChance) {
      this.mode = 'block';
      this.modeTimer = BALANCE.ai.blockDuration;
    } else {
      this.mode = 'retreat';
      this.modeTimer = BALANCE.ai.retreatDuration;
    }
  }

  private backToChase(): void {
    this.mode = 'chase';
    this.cooldown = BALANCE.ai.decisionInterval;
  }

  /** 依情境挑一招(對空 / 中距離牽制 / 接近);成功發動回傳 true */
  private tryContextualSpecial(dx: number, dz: number, target: Fighter): boolean {
    if (this.moves.length === 0) return false;
    const adx = Math.abs(dx);
    if (Math.abs(dz) > BALANCE.zTolerance) return false;

    if (target.isAirborne() && adx < 130) {
      return Math.random() < 0.7 && this.tryStartMove('bicycle-kick'); // 對空
    }
    if (adx > 160 && adx < 430) {
      return Math.random() < 0.4 && this.tryStartMove('arc-shot');     // 中距離牽制
    }
    if (adx > 90 && adx < 200) {
      return Math.random() < 0.22 && this.tryStartMove('slide-tackle'); // 接近
    }
    return false;
  }
}
