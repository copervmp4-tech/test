import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import { BALANCE } from '../config/balance';
import { Fighter, FighterInput, NEUTRAL_INPUT } from './Fighter';

type AiMode = 'chase' | 'combo' | 'block' | 'retreat';

/**
 * 簡單 AI:朝玩家走近,進入攻擊範圍後
 * 60% 攻擊(隨機 1~3 段連擊)、20% 防禦、20% 後退。
 * 被擊倒後的起身由 Fighter 基類處理。
 */
export class EnemyAI extends Fighter {
  private mode: AiMode = 'chase';
  private modeTimer = 0;
  private cooldown = BALANCE.ai.openingDelay;
  private plannedHits = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSETS.fighters.enemy, -1);
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

    // 被打斷(受擊/擊倒)時放棄目前行為
    if ((this.fighterState === 'hit' || this.fighterState === 'knockdown') && this.mode !== 'chase') {
      this.mode = 'chase';
      this.cooldown = ai.decisionInterval;
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
}
