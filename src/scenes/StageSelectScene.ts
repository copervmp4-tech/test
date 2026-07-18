import Phaser from 'phaser';
import { GameState } from '../config/gameState';
import { STAGES, StageEntry } from '../config/stages';
import {
  THEME,
  ensureGradientTexture,
  fadeInScene,
  fadeToScene,
  makeBackButton,
  makeButton,
  textStyle,
} from '../ui/theme';

interface StageCard {
  def: StageEntry;
  frame: Phaser.GameObjects.Graphics;
  drawFrame: (selected: boolean) => void;
}

/** 選場地:三張漸層預覽卡 + 開始戰鬥 */
export class StageSelectScene extends Phaser.Scene {
  private cards: StageCard[] = [];

  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    fadeInScene(this);
    this.cards = [];
    const w = this.scale.width;
    const h = this.scale.height;

    ensureGradientTexture(
      this, 'title-gradient', w, h,
      THEME.colors.titleGradientTop, THEME.colors.titleGradientBottom,
    );
    this.add.image(w / 2, h / 2, 'title-gradient');

    this.add.text(w / 2, 48, '選擇場地', textStyle(THEME.fontSize.heading)).setOrigin(0.5);

    const xs = [w / 2 - 270, w / 2, w / 2 + 270];
    STAGES.forEach((stage, i) => this.makeStageCard(stage, xs[i], 235));

    makeButton(this, w / 2, h - 88, 300, 84, '開始戰鬥', () => fadeToScene(this, 'FightScene'));
    makeBackButton(this, () => fadeToScene(this, 'CharSelectScene'));

    this.select(GameState.stageId);
  }

  private makeStageCard(def: StageEntry, x: number, y: number): void {
    const cardW = 244;
    const cardH = 196;
    const thumbW = cardW - 24;
    const thumbH = 118;
    const container = this.add.container(x, y);
    const frame = this.add.graphics();

    const drawFrame = (selected: boolean) => {
      frame.clear();
      frame.fillStyle(THEME.colors.panelFill, 0.9);
      frame.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      if (selected) frame.lineStyle(4, THEME.colors.accent, 1);
      else frame.lineStyle(1, 0xffffff, 0.25);
      frame.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    };
    drawFrame(false);

    // 預覽縮圖:有背景圖用圖(縮放填滿),否則程式繪製漸層 + 地面色條
    const ty = -cardH / 2 + 12;
    const imageKey = `stage-${def.id}`;
    let thumb: Phaser.GameObjects.GameObject;
    if (def.backgroundImage && this.textures.exists(imageKey)) {
      const img = this.add.image(0, ty + thumbH / 2, imageKey).setDisplaySize(thumbW, thumbH);
      img.setCrop(); // 顯示完整縮圖
      thumb = img;
    } else {
      const g = this.add.graphics();
      const top = Phaser.Display.Color.HexStringToColor(def.gradientTop).color;
      const bottom = Phaser.Display.Color.HexStringToColor(def.gradientBottom).color;
      const tx = -thumbW / 2;
      g.fillGradientStyle(top, top, bottom, bottom, 1);
      g.fillRect(tx, ty, thumbW, thumbH - 26);
      g.fillStyle(def.groundEdgeColor, 1);
      g.fillRect(tx, ty + thumbH - 26, thumbW, 4);
      g.fillStyle(def.groundColor, 1);
      g.fillRect(tx, ty + thumbH - 22, thumbW, 22);
      thumb = g;
    }

    const name = this.add.text(0, cardH / 2 - 34, def.name, textStyle(20)).setOrigin(0.5);
    container.add([frame, thumb, name]);

    container.setInteractive(
      new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
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
    GameState.stageId = id;
    for (const card of this.cards) card.drawFrame(card.def.id === id);
  }
}
