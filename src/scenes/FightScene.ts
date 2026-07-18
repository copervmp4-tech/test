import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import { CHARACTERS, getCharacter } from '../config/characters';
import { GameState } from '../config/gameState';
import { StageEntry, getStage } from '../config/stages';
import { EnemyAI } from '../entities/EnemyAI';
import { CombatScene, Fighter, NEUTRAL_INPUT } from '../entities/Fighter';
import { Player } from '../entities/Player';
import { ActionButtons } from '../ui/ActionButtons';
import { HealthBar } from '../ui/HealthBar';
import { ensureGradientTexture, fadeInScene, makeButton, textStyle } from '../ui/theme';
import { VirtualJoystick } from '../ui/VirtualJoystick';

/**
 * 戰鬥場景:場地、玩家 + AI 敵人、觸控/鍵盤操作、血條與勝負判定。
 * 玩家角色與場地由 GameState 決定(選角/選場地場景寫入),敵人隨機選其他角色。
 * 使用兩台攝影機:主攝影機拍戰鬥(會震動),UI 攝影機拍操作介面(不震動)。
 */
export class FightScene extends Phaser.Scene implements CombatScene {
  private player!: Player;
  private enemy!: EnemyAI;
  private joystick!: VirtualJoystick;
  private buttons!: ActionButtons;
  private playerBar!: HealthBar;
  private enemyBar!: HealthBar;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private ended = false;
  private resultShown = false;

  constructor() {
    super('FightScene');
  }

  create(): void {
    fadeInScene(this);
    this.ended = false;
    this.resultShown = false;
    const w = this.scale.width;
    const h = this.scale.height;

    const stage = getStage(GameState.stageId);
    const playerChar = getCharacter(GameState.characterId);
    const rivals = CHARACTERS.filter((c) => c.id !== playerChar.id);
    const enemyChar = rivals[Math.floor(Math.random() * rivals.length)];

    const worldObjects = this.createStage(stage, w, h);

    // ── 操作 UI ──
    this.joystick = new VirtualJoystick(this);
    this.buttons = new ActionButtons(this);

    // ── 角色 ──
    this.player = new Player(
      this, w * 0.32, 470,
      ASSETS.fighters[playerChar.fighterKey], playerChar.stats,
      this.joystick, this.buttons,
    );
    this.enemy = new EnemyAI(
      this, w * 0.68, 470,
      ASSETS.fighters[enemyChar.fighterKey], enemyChar.stats,
    );
    worldObjects.push(this.player, this.enemy);

    // ── 血條(顯示角色名,長度上限對應各自血量)──
    this.playerBar = new HealthBar(this, 24, 26, 380, playerChar.stats.maxHealth, false, playerChar.name, ASSETS.ui.hpBarPlayer);
    this.enemyBar = new HealthBar(this, w - 24, 26, 380, enemyChar.stats.maxHealth, true, enemyChar.name, ASSETS.ui.hpBarEnemy);

    const hint = this.add
      .text(w / 2, h - 14, '鍵盤:方向鍵移動 / Z 攻擊 / X 跳躍 / C 防禦', {
        ...textStyle(13, '#ffffff', false),
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.4)
      .setDepth(1000);

    const uiObjects = [
      ...this.joystick.displayObjects,
      ...this.buttons.displayObjects,
      ...this.playerBar.displayObjects,
      ...this.enemyBar.displayObjects,
      hint,
    ];

    // UI 攝影機不受主攝影機震動影響
    this.uiCamera = this.cameras.add(0, 0, w, h);
    this.uiCamera.ignore(worldObjects);
    this.cameras.main.ignore(uiObjects);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 20);

    const playerInput = this.ended ? { ...NEUTRAL_INPUT } : this.player.collectInput();
    const enemyInput = this.ended ? { ...NEUTRAL_INPUT } : this.enemy.think(dt, this.player);
    this.player.update(dt, playerInput, this.enemy);
    this.enemy.update(dt, enemyInput, this.player);

    this.playerBar.setValue(this.player.hp);
    this.enemyBar.setValue(this.enemy.hp);
    this.playerBar.update(dt);
    this.enemyBar.update(dt);

    if (!this.ended && (!this.player.isAlive() || !this.enemy.isAlive())) {
      this.ended = true;
      this.time.delayedCall(800, () => this.showResult());
    }
  }

  /** 命中回呼:鏡頭微震(被擋下就不震) */
  onFighterHit(_target: Fighter, blocked: boolean): void {
    if (!blocked) this.cameras.main.shake(90, 0.0045);
  }

  // ───────────────────────── 場地 ─────────────────────────

  private createStage(stage: StageEntry, w: number, h: number): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];

    // 背景:有圖用圖,沒圖用該場地的漸層
    const imageKey = `stage-${stage.id}`;
    if (stage.backgroundImage && this.textures.exists(imageKey)) {
      objects.push(this.add.image(w / 2, h / 2, imageKey).setDisplaySize(w, h).setDepth(-20));
    } else {
      const gradKey = ensureGradientTexture(
        this, `stage-grad-${stage.id}`, w, h, stage.gradientTop, stage.gradientBottom,
      );
      objects.push(this.add.image(w / 2, h / 2, gradKey).setDepth(-20));
    }

    // 地面:純色 + 地平線亮條(背景圖自帶地面時不疊)
    if (stage.drawGround) {
      const groundH = h - stage.horizonY;
      objects.push(
        this.add
          .rectangle(w / 2, stage.horizonY + groundH / 2, w, groundH, stage.groundColor)
          .setDepth(-10),
        this.add.rectangle(w / 2, stage.horizonY + 4, w, 8, stage.groundEdgeColor).setDepth(-9),
      );
    }
    return objects;
  }

  // ───────────────────────── 勝負 ─────────────────────────

  private showResult(): void {
    if (this.resultShown) return;
    this.resultShown = true;
    const w = this.scale.width;
    const h = this.scale.height;
    const win = !this.enemy.isAlive() && this.player.isAlive();

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.55).setDepth(1900);
    const title = this.add
      .text(w / 2, h * 0.36, win ? 'YOU WIN' : 'YOU LOSE', {
        ...textStyle(72, win ? '#ffd23f' : '#ff5544'),
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(1901);

    const restartBtn = makeButton(this, w / 2 - 140, h * 0.62, 240, 80, '重新開始', () =>
      this.scene.restart(),
    ).setDepth(1901);
    const titleBtn = makeButton(this, w / 2 + 140, h * 0.62, 240, 80, '回到標題', () =>
      this.scene.start('TitleScene'),
    ).setDepth(1901);

    this.cameras.main.ignore([overlay, title, restartBtn, titleBtn]);
    this.input.keyboard?.once('keydown-R', () => this.scene.restart());
  }
}
