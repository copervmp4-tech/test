import Phaser from 'phaser';
import { ASSETS, AnimationName, FighterSpriteDef } from '../config/assets';
import { AttackDef, BALANCE } from '../config/balance';
import { HitCategory, MoveDef, PassiveId } from '../config/moves';

export type { AnimationName };

/** 狀態機狀態(attack 內部再分三段連擊;special 執行招式) */
export type FighterState = 'idle' | 'walk' | 'jump' | 'attack' | 'block' | 'hit' | 'knockdown' | 'special';

/** 一次命中的資訊(普攻、招式、投射物都用它呼叫 takeHit) */
export interface HitInfo {
  damage: number;
  knockback: number;
  launch: number;          // 向上擊飛初速(0 = 無)
  causesKnockdown: boolean;
  category: HitCategory;   // normal 可被第十拍閃避;special/throw/stage 不行
  instanceId: number;      // 攻擊活動 id(多段同招共用 → 被動只計一次)
}

/** 每幀輸入(玩家由操作組成,敵人由 AI 組成) */
export interface FighterInput {
  moveX: number;          // -1 ~ 1
  moveZ: number;          // -1 ~ 1,淺景深上下走位
  attackPressed: boolean; // 本幀剛按下攻擊
  jumpPressed: boolean;   // 本幀剛按下跳躍
  blockHeld: boolean;     // 持續按住防禦
  specialId?: string | null; // 本幀比對成功的招式 id(玩家由指令輸入產生)
}

export const NEUTRAL_INPUT: FighterInput = {
  moveX: 0,
  moveZ: 0,
  attackPressed: false,
  jumpPressed: false,
  blockHeld: false,
  specialId: null,
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

/** 戰鬥場景需提供的回呼 */
export interface CombatScene extends Phaser.Scene {
  onFighterHit(target: Fighter, blocked: boolean): void;
  onFighterDodge(fighter: Fighter): void;
  spawnProjectile(owner: Fighter, move: MoveDef, hit: HitInfo): void;
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
 * 角色基類:狀態機、三連擊、招式、攻擊判定、淺景深移動、MP、被動。
 * 座標系:container 的 (x, y) = 角色「腳底在地面上」的位置,y 同時是深度(排序用)。
 * 跳躍高度 heightY 只影響繪製與判定框,不改變 y。
 */
export class Fighter extends Phaser.GameObjects.Container {
  hp: number;
  mp: number;
  readonly maxMp: number;
  facing: 1 | -1 = 1;
  fighterState: FighterState = 'idle';
  stateTime = 0;

  readonly def: FighterSpriteDef;
  readonly stats: FighterStats;
  readonly moves: MoveDef[];
  readonly passiveId: PassiveId | null;

  protected heightY = 0; // 離地高度(>= 0)
  protected vy = 0;      // 垂直速度(向上為正)
  protected kbVx = 0;    // 擊退水平速度

  protected comboStage = 0;
  protected comboQueued = false;
  protected currentAttack: AttackDef | null = null;
  protected attackHasHit = false;
  private instanceCounter = 0;      // 攻擊活動 id 來源
  private currentInstanceId = 0;    // 目前這次攻擊/招式的 id

  // 招式執行
  protected activeMove: MoveDef | null = null;
  private moveHasHit = false;       // slide 單段命中旗標
  private moveLastSlot = -1;        // aerial 多段:上一段的時間槽
  private projectileSpawned = false;
  private moveRecoverTimer = 0;     // aerial 落地後的收招計時

  // 被動:第十拍
  private tenthCharge = 0;
  private lastChargeInstance = -1;

  protected flashTimer = 0;
  protected invulnTimer = 0;
  protected dodgeCueTimer = 0;
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
    moves: MoveDef[] = [],
    passiveId: PassiveId | null = null,
  ) {
    super(scene, x, y);
    this.def = def;
    this.stats = stats;
    this.moves = moves;
    this.passiveId = passiveId;
    this.hp = stats.maxHealth;
    this.maxMp = BALANCE.mp.max;
    this.mp = BALANCE.mp.start;
    this.facing = facing;
    this.usesSprite = !ASSETS.usePlaceholders && scene.textures.exists(def.key);

    this.shadow = new Phaser.GameObjects.Ellipse(scene, 0, 0, def.bodyWidth * 0.9, 14, 0x000000, 0.3);
    this.add(this.shadow);

    if (this.usesSprite) {
      const sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, def.key);
      sprite.setOrigin(0.5, 1);
      sprite.setScale(def.scale);
      this.bodyObj = sprite;
    } else {
      this.bodyObj = new Phaser.GameObjects.Rectangle(
        scene, 0, 0, def.bodyWidth, def.bodyHeight, def.placeholderColor,
      );
      this.bodyObj.setOrigin(0.5, 1);
      this.faceDot = new Phaser.GameObjects.Rectangle(scene, 0, 0, 10, 10, 0xffffff, 0.85);
      this.add(this.faceDot);
    }
    this.addAt(this.bodyObj, 1);

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

  isBlocking(): boolean {
    return this.fighterState === 'block';
  }

  isAirborne(): boolean {
    return this.heightY > 4;
  }

  getCharge(): number {
    return this.tenthCharge;
  }

  canBeHit(): boolean {
    return this.isAlive() && this.fighterState !== 'knockdown' && this.invulnTimer <= 0;
  }

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

  /** 受擊判定用的身體範圍(世界座標;滑鏟時變矮) */
  getHurtbox(): Phaser.Geom.Rectangle {
    const w = this.def.bodyWidth;
    let h = this.def.bodyHeight;
    if (this.fighterState === 'special' && this.activeMove?.kind === 'slide') {
      h *= this.activeMove.lowProfile;
    }
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - this.heightY - h, w, h);
  }

  /** 每幀更新:input 由玩家操作或 AI 提供 */
  update(dt: number, input: FighterInput, opponent: Fighter): void {
    this.stateTime += dt;

    // MP 隨時間回復
    if (this.isAlive()) this.mp = Math.min(this.maxMp, this.mp + BALANCE.mp.regenPerSec * dt);

    // 招式指令觸發(限站立可行動狀態)
    if (input.specialId && this.canStartSpecial()) {
      this.tryStartMove(input.specialId);
    }

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
      case 'special':
        this.updateSpecial(dt, opponent);
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
    if (this.dodgeCueTimer > 0) this.dodgeCueTimer -= dt;

    this.clampToArena();
    this.setDepth(this.y);
    this.updateVisual();
  }

  /** 承受一次命中 */
  takeHit(hit: HitInfo, attacker: Fighter): void {
    if (!this.canBeHit()) return;

    // 第十拍:滿層時自動閃避下一次普通攻擊(防禦中不觸發)
    if (
      this.passiveId === 'tenthBeat' &&
      hit.category === 'normal' &&
      this.fighterState !== 'block' &&
      this.tenthCharge >= BALANCE.passive.tenthBeat.threshold
    ) {
      this.triggerDodge(attacker);
      return;
    }

    // 累積層數(非場地傷害,同一招只計一次)
    if (
      this.passiveId === 'tenthBeat' &&
      hit.category !== 'stage' &&
      hit.instanceId !== this.lastChargeInstance
    ) {
      this.lastChargeInstance = hit.instanceId;
      this.tenthCharge = Math.min(BALANCE.passive.tenthBeat.threshold, this.tenthCharge + 1);
    }

    if (this.fighterState === 'block') {
      this.hp = Math.max(0, this.hp - hit.damage * BALANCE.blockDamageMultiplier);
      this.flashTimer = 0.06;
      return;
    }

    this.hp = Math.max(0, this.hp - hit.damage);
    this.flashTimer = BALANCE.hitFlashDuration;
    this.facing = attacker.x >= this.x ? 1 : -1;

    const knockDir = this.x >= attacker.x ? 1 : -1;
    const knockdown = hit.causesKnockdown || hit.damage > BALANCE.knockdownDamageThreshold || this.hp <= 0;

    this.cancelAttack();
    this.cancelSpecial();

    if (knockdown) {
      this.kbVx = knockDir * hit.knockback * 1.4;
      this.vy = BALANCE.knockdownPopVelocity;
      this.heightY = Math.max(this.heightY, 1);
      this.changeState('knockdown', 'knockdown');
    } else if (hit.launch > 0) {
      // 浮空(juggle):彈起但不算倒地
      this.kbVx = knockDir * hit.knockback;
      this.vy = hit.launch;
      this.heightY = Math.max(this.heightY, 1);
      this.changeState('hit', 'hit');
    } else {
      this.kbVx = knockDir * hit.knockback;
      this.changeState('hit', 'hit');
    }
  }

  /** 嘗試發動招式(MP 足夠才成功);玩家指令與 AI 都走這裡 */
  tryStartMove(moveId: string): boolean {
    const m = this.moves.find((x) => x.id === moveId);
    if (!m || this.mp < m.mpCost) return false;
    this.mp -= m.mpCost;
    this.activeMove = m;
    this.currentInstanceId = ++this.instanceCounter;
    this.moveHasHit = false;
    this.moveLastSlot = -1;
    this.projectileSpawned = false;
    this.moveRecoverTimer = 0;
    this.attackHasHit = false;
    if (m.kind === 'aerial') {
      this.vy = m.riseVelocity;
      this.heightY = Math.max(this.heightY, 1);
    }
    if (m.invulnStartup > 0) this.invulnTimer = Math.max(this.invulnTimer, m.invulnStartup);
    this.changeState('special', m.animation);
    return true;
  }

  // ───────────────────────── 狀態更新 ─────────────────────────

  protected changeState(state: FighterState, anim?: AnimationName): void {
    this.fighterState = state;
    this.stateTime = 0;
    if (anim) this.playAnimation(anim);
  }

  private canStartSpecial(): boolean {
    return (
      this.heightY <= 0 &&
      (this.fighterState === 'idle' || this.fighterState === 'walk' || this.fighterState === 'block')
    );
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
    if (mx !== 0) this.facing = mx > 0 ? 1 : -1;

    const moving = mx !== 0 || mz !== 0;
    if (moving && this.fighterState !== 'walk') this.changeState('walk', 'walk');
    else if (!moving && this.fighterState !== 'idle') this.changeState('idle', 'idle');
  }

  private updateJump(dt: number, input: FighterInput): void {
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
    this.currentInstanceId = ++this.instanceCounter;
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

    if (input.attackPressed && this.comboStage < BALANCE.attacks.length) {
      this.comboQueued = true;
    }

    const t = this.stateTime;
    const activeStart = atk.windup;
    const activeEnd = atk.windup + atk.active;
    const total = activeEnd + atk.recovery;

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
        Math.abs(this.y - opponent.y) <= BALANCE.zTolerance &&
        Phaser.Geom.Intersects.RectangleToRectangle(hitbox, opponent.getHurtbox())
      ) {
        this.attackHasHit = true;
        const blocked = opponent.isBlocking();
        opponent.takeHit(this.buildHit({
          damage: atk.damage * this.stats.damageMultiplier,
          knockback: atk.knockback,
          launch: 0,
          causesKnockdown: atk.causesKnockdown,
          category: 'normal',
        }), this);
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

  /** 招式執行:三種 kind 各自的位移、判定、收招 */
  private updateSpecial(dt: number, opponent: Fighter): void {
    const m = this.activeMove;
    if (!m) {
      this.changeState('idle', 'idle');
      return;
    }
    const t = this.stateTime;
    const activeStart = m.startup;
    const activeEnd = m.startup + m.active;
    const inActive = t >= activeStart && t < activeEnd;

    if (m.kind === 'projectile') {
      if (!this.projectileSpawned && t >= activeStart) {
        this.projectileSpawned = true;
        (this.scene as CombatScene).spawnProjectile(this, m, this.buildSpecialHit(m, false));
      }
      if (t >= activeEnd + m.recovery) this.endSpecial();
      return;
    }

    if (m.kind === 'slide') {
      if (inActive) {
        this.x += this.facing * m.forwardSpeed * dt;
        if (!this.moveHasHit) this.tryMeleeSpecial(m, opponent, false);
      }
      if (t >= activeEnd + m.recovery) this.endSpecial();
      return;
    }

    // aerial:上升 + 前移 + 多段判定,落地後收招
    this.applyGravity(dt);
    if (this.heightY > 0) this.x += this.facing * m.forwardSpeed * dt;
    if (inActive) {
      const slot = Math.floor((t - activeStart) / (m.active / m.hits));
      if (slot !== this.moveLastSlot && slot < m.hits) {
        this.moveLastSlot = slot;
        const isFinal = slot === m.hits - 1;
        this.tryMeleeSpecial(m, opponent, isFinal, true);
      }
    }
    const landed = this.heightY <= 0 && this.vy <= 0 && t > activeStart;
    if (landed) {
      this.moveRecoverTimer += dt;
      if (this.moveRecoverTimer >= m.recovery) this.endSpecial();
    }
  }

  /** 招式近身判定;allowRehit = true 時不設單段旗標(aerial 多段用時間槽控制) */
  private tryMeleeSpecial(m: MoveDef, opponent: Fighter, isFinal: boolean, allowRehit = false): void {
    const hitbox = this.computeMoveHitbox(m);
    this.syncAttackViz(hitbox);
    this.attackViz.setVisible(!this.usesSprite);
    if (
      opponent.canBeHit() &&
      Math.abs(this.y - opponent.y) <= BALANCE.zTolerance &&
      Phaser.Geom.Intersects.RectangleToRectangle(hitbox, opponent.getHurtbox())
    ) {
      if (!allowRehit) this.moveHasHit = true;
      const blocked = opponent.isBlocking();
      opponent.takeHit(this.buildSpecialHit(m, isFinal), this);
      (this.scene as CombatScene).onFighterHit(opponent, blocked);
    }
  }

  private updateKnockdown(dt: number): void {
    this.applyKnockback(dt);
    this.applyGravity(dt);
    if (this.stateTime >= BALANCE.knockdownDuration && this.heightY <= 0 && this.isAlive()) {
      this.invulnTimer = BALANCE.riseInvulnDuration;
      this.changeState('idle', 'idle');
    }
  }

  private endSpecial(): void {
    this.cancelSpecial();
    this.changeState('idle', 'idle');
  }

  private triggerDodge(attacker: Fighter): void {
    this.tenthCharge = 0;
    this.lastChargeInstance = -1;
    this.invulnTimer = BALANCE.passive.tenthBeat.dodgeInvuln;
    this.dodgeCueTimer = 0.3;
    const dir = this.x >= attacker.x ? 1 : -1; // 往遠離攻擊者方向後撤
    this.kbVx = dir * BALANCE.passive.tenthBeat.backdashSpeed;
    this.cancelAttack();
    this.cancelSpecial();
    this.changeState('idle', 'idle');
    (this.scene as CombatScene).onFighterDodge(this);
  }

  private buildHit(partial: Omit<HitInfo, 'instanceId'>): HitInfo {
    return { ...partial, instanceId: this.currentInstanceId };
  }

  private buildSpecialHit(m: MoveDef, isFinal: boolean): HitInfo {
    return {
      damage: m.damage * this.stats.damageMultiplier,
      knockback: m.knockback,
      launch: isFinal ? Math.max(m.launch, 420) : m.launch,
      causesKnockdown: isFinal ? m.causesKnockdown : false,
      category: 'special',
      instanceId: this.currentInstanceId,
    };
  }

  private cancelAttack(): void {
    this.currentAttack = null;
    this.comboStage = 0;
    this.comboQueued = false;
    this.attackHasHit = false;
    this.attackViz.setVisible(false);
  }

  private cancelSpecial(): void {
    this.activeMove = null;
    this.projectileSpawned = false;
    this.moveHasHit = false;
    this.moveLastSlot = -1;
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
    const start = this.def.bodyWidth / 2 - 6;
    const tip = this.def.punchReach + atk.reachBonus;
    const top = this.y - this.heightY - this.def.bodyHeight * 0.78;
    const left = this.facing > 0 ? this.x + start : this.x - tip;
    return new Phaser.Geom.Rectangle(left, top, tip - start, atk.height);
  }

  private computeMoveHitbox(m: MoveDef): Phaser.Geom.Rectangle {
    const start = this.def.bodyWidth / 2 - 6;
    const tip = m.reach;
    const cy = this.y - this.heightY - this.def.bodyHeight * m.yCenter;
    const left = this.facing > 0 ? this.x + start : this.x - tip;
    return new Phaser.Geom.Rectangle(left, cy - m.height / 2, tip - start, m.height);
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

    const bob =
      !this.usesSprite && this.fighterState === 'walk'
        ? Math.sin(this.scene.time.now / 1000 * 14) * 1.8
        : 0;
    const footY = this.usesSprite ? this.def.footOffset * this.def.scale : 0;

    // 滑鏟時整體壓低,呈現低身姿
    const slideSquash = this.fighterState === 'special' && this.activeMove?.kind === 'slide';
    this.bodyObj.setPosition(0, airY + bob + footY);

    const airRatio = Phaser.Math.Clamp(this.heightY / 300, 0, 1);
    this.shadow.setAlpha(0.3 * (1 - airRatio * 0.6));
    this.shadow.setScale(1 - airRatio * 0.3);

    // 起身無敵 / 閃避無敵:閃爍;閃避另加淡青色調
    const blinking = this.invulnTimer > 0;
    this.setAlpha(blinking ? (Math.sin(this.scene.time.now / 25) > 0 ? 0.4 : 0.9) : 1);

    if (this.usesSprite) {
      const sprite = this.bodyObj as Phaser.GameObjects.Sprite;
      sprite.setFlipX(this.facing < 0);
      if (this.flashTimer > 0) sprite.setTintFill(0xffffff);
      else if (this.dodgeCueTimer > 0) sprite.setTint(0x7fe3ff);
      else sprite.clearTint();
      sprite.setScale(this.def.scale * (slideSquash ? 1.15 : 1), this.def.scale * (slideSquash ? 0.7 : 1));
      return;
    }

    const rect = this.bodyObj as Phaser.GameObjects.Rectangle;
    const pose = PLACEHOLDER_POSES[anim];
    const sx = slideSquash ? 1.3 : pose.sx;
    const sy = slideSquash ? 0.55 : pose.sy;
    rect.setScale(sx, sy);
    rect.setFillStyle(
      this.flashTimer > 0 ? 0xffffff : this.dodgeCueTimer > 0 ? 0x7fe3ff : this.poseColor(anim),
    );

    if (this.faceDot) {
      this.faceDot.setVisible(anim !== 'knockdown');
      this.faceDot.setPosition(
        this.facing * (this.def.bodyWidth / 2 - 14),
        airY + bob - this.def.bodyHeight * sy + 20,
      );
    }
  }
}
