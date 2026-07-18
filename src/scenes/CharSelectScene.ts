import Phaser from 'phaser';
import { CHARACTERS, CharacterDef, STAT_MAX } from '../config/characters';
import { GameState } from '../config/gameState';
import {
  THEME,
  ensureGradientTexture,
  fadeInScene,
  fadeToScene,
  makeBackButton,
  makeButton,
  textStyle,
} from '../ui/theme';

interface CharCard {
  def: CharacterDef;
  frame: Phaser.GameObjects.Graphics;
  drawFrame: (selected: boolean) => void;
}

/** 選角色:2×2 角色格 + 數值條 + 確認 */
export class CharSelectScene extends Phaser.Scene {
  private cards: CharCard[] = [];
  private statBars!: Phaser.GameObjects.Graphics;
  private descText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharSelectScene');
  }

  create(): void {
    fadeInScene(this);
    this.cards = [];
    const w = this.scale.width;

    ensureGradientTexture(
      this, 'title-gradient', w, this.scale.height,
      THEME.colors.titleGradientTop, THEME.colors.titleGradientBottom,
    );
    this.add.image(w / 2, this.scale.height / 2, 'title-gradient');

    this.add.text(w / 2, 42, '選擇角色', textStyle(THEME.fontSize.heading)).setOrigin(0.5);

    // ── 2×2 角色格 ──
    const cellSize = 138;
    const gridXs = [w / 2 - 80, w / 2 + 80];
    const gridYs = [150, 308];
    CHARACTERS.forEach((def, i) => {
      const x = gridXs[i % 2];
      const y = gridYs[Math.floor(i / 2)];
      this.makeCharCard(def, x, y, cellSize);
    });

    // ── 底部資訊面板:介紹 + 數值條 ──
    const panel = this.add.graphics();
    panel.fillStyle(THEME.colors.panelFill, 0.8);
    panel.fillRoundedRect(28, 396, 560, 130, 12);

    this.descText = this.add.text(52, 412, '', textStyle(THEME.fontSize.body, THEME.colors.dimCss, false));
    this.statBars = this.add.graphics();
    this.statLabel('血量', 448);
    this.statLabel('速度', 478);
    this.statLabel('攻擊', 508);

    makeButton(this, 760, 460, 240, 84, '確認', () => fadeToScene(this, 'StageSelectScene'));
    makeBackButton(this, () => fadeToScene(this, 'ModeSelectScene'));

    this.select(GameState.characterId); // 預選上次的角色
  }

  private statLabel(label: string, y: number): void {
    this.add.text(52, y, label, textStyle(15, THEME.colors.textCss, false)).setOrigin(0, 0.5);
  }

  private makeCharCard(def: CharacterDef, x: number, y: number, size: number): void {
    const container = this.add.container(x, y);
    const frame = this.add.graphics();

    const drawFrame = (selected: boolean) => {
      frame.clear();
      frame.fillStyle(THEME.colors.panelFill, 0.9);
      frame.fillRoundedRect(-size / 2, -size / 2, size, size, 12);
      if (selected) frame.lineStyle(4, THEME.colors.accent, 1);
      else frame.lineStyle(1, 0xffffff, 0.25);
      frame.strokeRoundedRect(-size / 2, -size / 2, size, size, 12);
    };
    drawFrame(false);

    // 頭像:有圖用圖,沒圖用代表色塊 placeholder
    const portraitKey = `portrait-${def.id}`;
    const portrait: Phaser.GameObjects.GameObject =
      def.portraitPath && this.textures.exists(portraitKey)
        ? this.add.image(0, -14, portraitKey).setDisplaySize(size - 30, size - 56)
        : this.add.rectangle(0, -14, size - 30, size - 56, def.color, 0.95);

    const name = this.add.text(0, size / 2 - 22, def.name, textStyle(20)).setOrigin(0.5);
    container.add([frame, portrait, name]);

    container.setInteractive(
      new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
      container.setScale(THEME.button.pressScale),
    );
    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => container.setScale(1));
    container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      container.setScale(1);
      this.select(def.id);
    });

    this.cards.push({ def, frame, drawFrame });
  }

  private select(id: string): void {
    GameState.characterId = id;
    for (const card of this.cards) card.drawFrame(card.def.id === id);

    const def = this.cards.find((c) => c.def.id === id)?.def ?? CHARACTERS[0];
    this.descText.setText(`${def.name}——${def.description}`);

    // 三條數值條(相對全角色最大值)
    const rows: Array<[number, number]> = [
      [def.stats.maxHealth / STAT_MAX.maxHealth, 448],
      [def.stats.speedMultiplier / STAT_MAX.speedMultiplier, 478],
      [def.stats.damageMultiplier / STAT_MAX.damageMultiplier, 508],
    ];
    const barX = 116;
    const barW = 420;
    this.statBars.clear();
    for (const [ratio, y] of rows) {
      this.statBars.fillStyle(0x000000, 0.45);
      this.statBars.fillRoundedRect(barX, y - 8, barW, 16, 8);
      this.statBars.fillStyle(def.color, 1);
      this.statBars.fillRoundedRect(barX, y - 8, Math.max(16, barW * ratio), 16, 8);
    }
  }
}
