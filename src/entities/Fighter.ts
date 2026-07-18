import Phaser from 'phaser';
import { ASSETS, AnimationName, FighterSpriteDef } from '../config/assets';
import { AttackDef, BALANCE } from '../config/balance';

export type { AnimationName };

/** 狀態機狀態(attack 內部再分三段連擊) */
export type FighterState = 'idle' | 'walk' | 'jump' | 'attack' | 'block' | 'hit' | 'knockdown';

/** 每幀輸入(玩家由操作組成,敵人由 AI 組成) */
export interface FighterInput {
  moveX: number;          // -1 ~ 1
  moveZ: number;          // -1 ~ 1,淺景深上下走位
  attackPressed: boolean; // 本幀剛按下攻擊
  jumpPressed: boolean;   // 本幀剛按下跳躍
  blockHeld: boolean;     // 持續按住防禦
}

export const NEUTRAL_INPUT: FighterInput = {
  moveX: 0,
  moveZ: 0,
  attackPressed: false,
  jumpPressed: false,
  blockHeld: false,
};

/** 角色數值(config/characters.ts 提供;倍率作用在 balance.ts 的基礎值上) */
export interface FighterStats {
  maxHealth: number;
  speedMultiplier: number;
  damageMultiplier: number;
}

export const DEFAULT_STATS: FighterStats = {
  maxHealth: BALANCE.maxHealth,
  speedMultiplier: 1,
  damageMultiplier: 1,
};

/** 戰鬥場景需提供的回呼(命中時做鏡頭震動等表現) */
export interface CombatScene extends Phaser.Scene {
  onFighterHit(target: Fighter, blocked: boolean): void;
}

/** 色塊模式下,各動畫對應的簡單變形與顏色亮度偏移(%) */
const PLACEHOLDER_POSES: Record<AnimationName, { sx: number; sy: number; light: number }> = {
  idle:      { sx: 1.0,  sy: 1.0,  light: 0 },
  walk:      { sx: 1.0,  sy: 1.0,  light: 0 },
  jump:      { sx: 0.92, sy: 1.07, light: 6 },
  attack1:   { sx: 1.06, sy: 0.97, light: 16 },
  attack2:   { sx: 1.09, sy: 0.95, light: 22 },
  attack3:   { sx: 1.14, sy: 0.92, light: 32 },
  hit:       { sx: 0.95, sy: 1.0,  light: -8 },
  knockdown: { sx: 1.45, sy: 0.34, light: -22 },
  block:     { sx: 1.06, sy: 0.9,  light: -32 },
};

/**
 * 角色基類:狀態機、三連擊、攻擊判定、淺景深移動。
 * 座標系:container 的 (x, y) = 角色「腳底在地面上」的位置,y 同時是深度(用來排序)。
 * 跳躍高度 heightY 只影響繪製與判定框,不改變 y。
 */
export class Fighter extends Phaser.GameObjects.Container {
  hp: number;
  facing: 1 | -1 = 1;
  fighterState: FighterState = 'idle';
  stateTime = 0;

  readonly def: FighterSpriteDef;
  readonly stats: FighterStats;

  protected heightY = 0; // 離地高度(>= 0)
  protected vy = 0;      // 垂直速度(向上為正)
  protected kbVx = 0;    // 擊退水平速度

  protected comboStage = 0;                      // 目前連擊段數(1~3)
  protected comboQueued = false;                 // 是否已預約下一段
  protected currentAttack: AttackDef | null = null;
  protected attackHasHit = false;                // 同一次攻擊對同一目標只判定一次

  protected flashTimer = 0;   // 受擊變白倒數
  protected invulnTimer = 0;  // 起身無敵倒數
  protected currentAnim: AnimationName | null = null;

  protected readonly usesSprite: boolean;
  protected bodyObj: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
  protected shadow: Phaser.GameObjects.Ellipse;
  protected attackViz: Phaser.GameObjects.Rectangle;
  protected faceDot: Phaser.GameObjects.Rectangle | null = null;

  private poseColorCache = new Map<AnimationName, number>();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: FighterSpriteDef,
    facing: 1 | -1 = 1,
    stats: FighterStats = DEFAULT_STATS,
  ) {
    super(scene, x, y);
    this.def = def;
    this.stats = stats;
    this.hp = stats.maxHealth;
    this.facing = facing;
    this.usesSprite = !ASSETS.usePlaceholders && scene.textures.exists(def.key);

    this.shadow = new Phaser.GameObjects.Ellipse(scene, 0, 0, def.bodyWidth * 0.9, 14, 0x000000, 0.3);
    this.add(this.shadow);

    if (this.usesSprite) {
      const sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, def.key);
      sprite.setOrigin(0.5, 1);
      sprite.setScale(def.scale); // 素材幀縮放到遊戲內身高(貼齊 bodyHeight)
      this.bodyObj = sprite;
    } else {
      this.bodyObj = new Phaser.GameObjects.Rectangle(
        scene, 0, 0, def.bodyWidth, def.bodyHeight, def.placeholderColor,
      );
      this.bodyObj.setOrigin(0.5, 1);
      // 色塊模式:用一個小方塊標示面向
      this.faceDot = new Phaser.GameObjects.Rectangle(scene, 0, 0, 10, 10, 0xffffff, 0.85);
      this.add(this.faceDot);
    }
    this.addAt(this.bodyObj, 1);

    // 攻擊判定框視覺化(色塊模式)
    this.attackViz = new Phaser.GameObjects.Rectangle(scene, 0, 0, 10, 10, 0xffe066, 0.5);
    this.attackViz.setStrokeStyle(1, 0xffffff, 0.8);
    this.attackViz.setVisible(false);
    this.add(this.attackViz);

    scene.add.existing(this);
    this.playAnimation('idle');
  }

  // ───────────────────────── 對外介面 ─────────────────────────

  isAlive(): boolean {
    return this.hp > 0;
  }

  canBeHit(): boolean {
    return this.isAlive() && this.fighterState !== 'knockdown' && this.invulnTimer <= 0;
  }

  /**
   * 播放動畫。正式 sprite sheet 模式播 `${key}-${name}`;
   * 色塊模式改用顏色/變形表現(updateVisual 依 currentAnim 套用)。
   */
  playAnimation(name: AnimationName): void {
    if (this.currentAnim === name) return;
    this.currentAnim = name;
    if (this.usesSprite) {
      const animKey = `${this.def.key}-${name}`;
      if (this.scene.anims.exists(animKey)) {
        (this.bodyObj as Phaser.GameObjects.Sprite).play(animKey);
      }
    }
  }

  /** 受擊判定用的身體範圍(世界座標) */
  getHurtbox(): Phaser.Geom.Rectangle {
    const w = this.def.bodyWidth;
    const h = this.def.bodyHeight;
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - this.heightY - h, w, h);
  }

  /** 每幀更新:input 由玩家操作或 AI 提供 */
  update(dt: number, input: FighterInput, opponent: Fighter): void {
    this.stateTime += dt;

    switch (this.fighterState) {
      case 'idle':
      case 'walk':
        this.updateGrounded(dt, input);
        break;
      case 'jump':
        this.updateJump(dt, input);
        break;
      case 'attack':
        this.updateAttack(dt, input, opponent);
        break;
      case 'block':
        if (!input.blockHeld) this.changeState('idle', 'idle');
        break;
      case 'hit':
        this.applyKnockback(dt);
        this.applyGravity(dt);
        if (this.stateTime >= BALANCE.hitStun && this.heightY <= 0) {
          this.changeState('idle', 'idle');
        }
        break;
      case 'knockdown':
        this.updateKnockdown(dt);
        break;
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    this.clampToArena();
    this.setDepth(this.y); // 依深度排序
    this.updateVisual();
  }

  /** 承受一次攻擊(由攻擊方呼叫;damage 已含攻擊方的傷害倍率) */
  takeHit(attack: AttackDef, attacker: Fighter, damage: number = attack.damage): void {
    if (!this.canBeHit()) return;

    if (this.fighterState === 'block') {
      // 防禦:傷害減 80%,不硬直、不擊退
      this.hp = Math.max(0, this.hp - damage * BALANCE.blockDamageMultiplier);
      this.flashTimer = 0.06;
      return;
    }

    this.hp = Math.max(0, this.hp - damage);
    this.flashTimer = BALANCE.hitFlashDuration;
    this.facing = attacker.x >= this.x ? 1 : -1; // 面向攻擊者

    const knockDir = this.x >= attacker.x ? 1 : -1;
    const knockdown =
      attack.causesKnockdown ||
      damage > BALANCE.knockdownDamageThreshold ||
      this.hp <= 0;

    this.cancelAttack();
    if (knockdown) {
      this.kbVx = knockDir * attack.knockback * 1.4;
      this.vy = BALANCE.knockdownPopVelocity;
      this.heightY = Math.max(this.heightY, 1);
      this.changeState('knockdown', 'knockdown');
    } else {
      this.kbVx = knockDir * attack.knockback;
      this.changeState('hit', 'hit');
    }
  }

  // ───────────────────────── 狀態更新 ─────────────────────────

  protected changeState(state: FighterState, anim?: AnimationName): void {
    this.fighterState = state;
    this.stateTime = 0;
    if (anim) this.playAnimation(anim);
  }

  private updateGrounded(dt: number, input: FighterInput): void {
    if (input.blockHeld) {
      this.changeState('block', 'block');
      return;
    }
    if (input.jumpPressed) {
      this.vy = BALANCE.jumpVelocity;
      this.changeState('jump', 'jump');
      return;
    }
    if (input.attackPressed) {
      this.startAttack(1);
      return;
    }

    const mx = Phaser.Math.Clamp(input.moveX, -1, 1);
    const mz = Phaser.Math.Clamp(input.moveZ, -1, 1);
    this.x += mx * BALANCE.walkSpeed * this.stats.speedMultiplier * dt;
    this.y += mz * BALANCE.zWalkSpeed * this.stats.speedMultiplier * dt;
    if (mx !== 0) this.facing = mx > 0 ? 1 : -1; // 自動面向移動方向

    const moving = mx !== 0 || mz !== 0;
    if (moving && this.fighterState !== 'walk') this.changeState('walk', 'walk');
    else if (!moving && this.fighterState !== 'idle') this.changeState('idle', 'idle');
  }

  private updateJump(dt: number, input: FighterInput): void {
    // 空中保留操控
    this.x += Phaser.Math.Clamp(input.moveX, -1, 1) * BALANCE.walkSpeed * this.stats.speedMultiplier * dt;
    this.y += Phaser.Math.Clamp(input.moveZ, -1, 1) * BALANCE.zWalkSpeed * this.stats.speedMultiplier * dt;
    this.applyGravity(dt);
    if (this.heightY <= 0 && this.vy <= 0) {
      this.changeState('idle', 'idle');
    }
  }

  private startAttack(stage: number): void {
    this.comboStage = stage;
    this.currentAttack = BALANCE.attacks[stage - 1];
    this.attackHasHit = false;
    this.comboQueued = false;
    this.changeState('attack', `attack${stage}` as AnimationName);
  }

  private updateAttack(dt: number, input: FighterInput, opponent: Fighter): void {
    const atk = this.currentAttack;
    if (!atk) {
      this.changeState('idle', 'idle');
      return;
    }

    // 攻擊動作結束前再按攻擊 → 預約下一段(最多三段)
    if (input.attackPressed && this.comboStage < BALANCE.attacks.length) {
      this.comboQueued = true;
    }

    const t = this.stateTime;
    const activeStart = atk.windup;
    const activeEnd = atk.windup + atk.active;
    const total = activeEnd + atk.recovery;

    // 前搖時小幅前衝
    if (t < activeStart) {
      this.x += this.facing * (atk.lunge / activeStart) * dt;
    }

    const inActive = t >= activeStart && t < activeEnd;
    if (inActive) {
      const hitbox = this.computeHitbox(atk);
      this.syncAttackViz(hitbox);
      this.attackViz.setVisible(!this.usesSprite);

      if (
        !this.attackHasHit &&
        opponent.canBeHit() &&
        Math.abs(this.y - opponent.y) <= BALANCE.zTolerance && // 深度要夠接近
        Phaser.Geom.Intersects.RectangleToRectangle(hitbox, opponent.getHurtbox())
      ) {
        this.attackHasHit = true;
        const blocked = opponent.fighterState === 'block';
        opponent.takeHit(atk, this, atk.damage * this.stats.damageMultiplier);
        (this.scene as CombatScene).onFighterHit(opponent, blocked);
      }
    } else {
      this.attackViz.setVisible(false);
    }

    if (t >= total) {
      if (this.comboQueued) this.startAttack(this.comboStage + 1);
      else this.changeState('idle', 'idle');
    }
  }

  private updateKnockdown(dt: number): void {
    this.applyKnockback(dt);
    this.applyGravity(dt);
    if (this.stateTime >= BALANCE.knockdownDuration && this.heightY <= 0 && this.isAlive()) {
      // 起身,短暫無敵
      this.invulnTimer = BALANCE.riseInvulnDuration;
      this.changeState('idle', 'idle');
    }
  }

  private cancelAttack(): void {
    this.currentAttack = null;
    this.comboStage = 0;
    this.comboQueued = false;
    this.attackViz.setVisible(false);
  }

  private applyGravity(dt: number): void {
    if (this.heightY > 0 || this.vy > 0) {
      this.heightY += this.vy * dt;
      this.vy -= BALANCE.gravity * dt;
      if (this.heightY <= 0) {
        this.heightY = 0;
        this.vy = 0;
      }
    }
  }

  private applyKnockback(dt: number): void {
    this.x += this.kbVx * dt;
    this.kbVx *= Math.max(0, 1 - BALANCE.knockbackDamping * dt);
  }

  private clampToArena(): void {
    const a = BALANCE.arena;
    this.x = Phaser.Math.Clamp(this.x, a.wallLeft, a.wallRight);
    this.y = Phaser.Math.Clamp(this.y, a.floorTop, a.floorBottom);
  }

  // ───────────────────────── 判定框 ─────────────────────────

  private computeHitbox(atk: AttackDef): Phaser.Geom.Rectangle {
    // 從身體前緣稍內側開始,延伸到「實測拳頭尖端 + 少量加成」,貼合美術
    const start = this.def.bodyWidth / 2 - 6;
    const tip = this.def.punchReach + atk.reachBonus;
    const top = this.y - this.heightY - this.def.bodyHeight * 0.78;
    const left = this.facing > 0 ? this.x + start : this.x - tip;
    return new Phaser.Geom.Rectangle(left, top, tip - start, atk.height);
  }

  private syncAttackViz(hitbox: Phaser.Geom.Rectangle): void {
    this.attackViz.setPosition(hitbox.centerX - this.x, hitbox.centerY - this.y);
    this.attackViz.setDisplaySize(hitbox.width, hitbox.height);
  }

  // ───────────────────────── 繪製 ─────────────────────────

  private poseColor(name: AnimationName): number {
    const cached = this.poseColorCache.get(name);
    if (cached !== undefined) return cached;
    const pose = PLACEHOLDER_POSES[name];
    const c = Phaser.Display.Color.ValueToColor(this.def.placeholderColor);
    if (pose.light > 0) c.lighten(pose.light);
    else if (pose.light < 0) c.darken(-pose.light);
    this.poseColorCache.set(name, c.color);
    return c.color;
  }

  private updateVisual(): void {
    const airY = -this.heightY;
    const anim = this.currentAnim ?? 'idle';

    // 走路晃動只給色塊模式(正式動畫自己會動);
    // sprite 模式要補償幀底部留白,讓腳貼在地面上
    const bob =
      !this.usesSprite && this.fighterState === 'walk'
        ? Math.sin(this.scene.time.now / 1000 * 14) * 1.8
        : 0;
    const footY = this.usesSprite ? this.def.footOffset * this.def.scale : 0;
    this.bodyObj.setPosition(0, airY + bob + footY);

    // 影子留在地面,跳越高越淡
    const airRatio = Phaser.Math.Clamp(this.heightY / 300, 0, 1);
    this.shadow.setAlpha(0.3 * (1 - airRatio * 0.6));
    this.shadow.setScale(1 - airRatio * 0.3);

    // 起身無敵:閃爍
    this.setAlpha(this.invulnTimer > 0 ? (Math.sin(this.scene.time.now / 25) > 0 ? 0.4 : 0.9) : 1);

    if (this.usesSprite) {
      const sprite = this.bodyObj as Phaser.GameObjects.Sprite;
      sprite.setFlipX(this.facing < 0);
      if (this.flashTimer > 0) sprite.setTintFill(0xffffff);
      else sprite.clearTint();
      return;
    }

    // ── 色塊模式:依動畫套用顏色與簡單變形 ──
    const rect = this.bodyObj as Phaser.GameObjects.Rectangle;
    const pose = PLACEHOLDER_POSES[anim];
    rect.setScale(pose.sx, pose.sy);
    rect.setFillStyle(this.flashTimer > 0 ? 0xffffff : this.poseColor(anim));

    if (this.faceDot) {
      this.faceDot.setVisible(anim !== 'knockdown');
      this.faceDot.setPosition(
        this.facing * (this.def.bodyWidth / 2 - 14),
        airY + bob - this.def.bodyHeight * pose.sy + 20,
      );
    }
  }
}
