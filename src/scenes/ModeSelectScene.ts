import Phaser from 'phaser';
import { GameMode, GameState } from '../config/gameState';
import {
  THEME,
  ensureGradientTexture,
  fadeInScene,
  fadeToScene,
  makeBackButton,
  makeButton,
  textStyle,
} from '../ui/theme';

/** 模式選擇:闖關 / 對戰(現階段流程相同,選擇會記進 GameState) */
export class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ModeSelectScene');
  }

  create(): void {
    fadeInScene(this);
    const w = this.scale.width;
    const h = this.scale.height;

    ensureGradientTexture(
      this, 'title-gradient', w, h,
      THEME.colors.titleGradientTop, THEME.colors.titleGradientBottom,
    );
    this.add.image(w / 2, h / 2, 'title-gradient');

    this.add.text(w / 2, 70, '選擇模式', textStyle(THEME.fontSize.heading)).setOrigin(0.5);

    const pick = (mode: GameMode) => {
      GameState.mode = mode;
      fadeToScene(this, 'CharSelectScene');
    };
    makeButton(this, w / 2, 235, 340, 92, '闖關模式', () => pick('campaign'));
    makeButton(this, w / 2, 355, 340, 92, '對戰模式', () => pick('versus'));

    this.add
      .text(w / 2, h - 46, '(現階段兩種模式流程相同,之後分家)',
        textStyle(THEME.fontSize.small, THEME.colors.dimCss, false))
      .setOrigin(0.5);

    makeBackButton(this, () => fadeToScene(this, 'TitleScene'));
  }
}
