import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import {
  THEME,
  ensureGradientTexture,
  fadeInScene,
  fadeToScene,
  textStyle,
} from '../ui/theme';

/** 標題畫面:主視覺 + TAP TO START,點擊任意處進入模式選擇 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    fadeInScene(this);
    const w = this.scale.width;
    const h = this.scale.height;

    // 背景:有主視覺圖就用圖,沒有就用深色漸層 placeholder
    if (ASSETS.ui.titleBackgroundImage && this.textures.exists('title-bg')) {
      this.add.image(w / 2, h / 2, 'title-bg').setDisplaySize(w, h);
    } else {
      ensureGradientTexture(
        this, 'title-gradient', w, h,
        THEME.colors.titleGradientTop, THEME.colors.titleGradientBottom,
      );
      this.add.image(w / 2, h / 2, 'title-gradient');
    }

    // 遊戲標題
    this.add
      .text(w / 2, h * 0.36, THEME.gameTitle, {
        ...textStyle(THEME.fontSize.title, THEME.colors.accentCss),
        stroke: '#000000',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, 'rgba(0,0,0,0.5)', 12);

    this.add
      .text(w / 2, h * 0.36 + 64, '2D FIGHTING PROTOTYPE', {
        ...textStyle(THEME.fontSize.body, THEME.colors.dimCss, false),
        letterSpacing: 6,
      } as Phaser.Types.GameObjects.Text.TextStyle)
      .setOrigin(0.5);

    // TAP TO START 緩慢閃爍
    const tap = this.add
      .text(w / 2, h * 0.72, 'TAP TO START', textStyle(28))
      .setOrigin(0.5);
    this.tweens.add({
      targets: tap,
      alpha: 0.2,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 點擊任意處(或按任意鍵)開始
    const start = () => fadeToScene(this, 'ModeSelectScene');
    this.input.once(Phaser.Input.Events.POINTER_DOWN, start);
    this.input.keyboard?.once('keydown', start);
  }
}
