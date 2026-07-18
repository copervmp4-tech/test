import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import { CHARACTERS } from '../config/characters';
import { STAGES } from '../config/stages';

/**
 * 載入資源並註冊動畫,完成後進標題畫面。
 * 色塊模式(usePlaceholders = true)下角色不載圖;
 * 場地背景圖、角色頭像、標題主視覺依 config 有設定才載。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.setPath(ASSETS.basePath);

    if (!ASSETS.usePlaceholders) {
      for (const def of Object.values(ASSETS.fighters)) {
        this.load.spritesheet(def.key, def.path, {
          frameWidth: def.frameWidth,
          frameHeight: def.frameHeight,
        });
      }
    }
    for (const stage of STAGES) {
      if (stage.backgroundImage) this.load.image(`stage-${stage.id}`, stage.backgroundImage);
    }
    for (const char of CHARACTERS) {
      if (char.portraitPath) this.load.image(`portrait-${char.id}`, char.portraitPath);
    }
    if (ASSETS.ui.titleBackgroundImage) {
      this.load.image('title-bg', ASSETS.ui.titleBackgroundImage);
    }
    // 戰鬥 UI 素材(血條 / 搖桿 / 按鈕),用檔名當貼圖 key
    for (const path of [
      ASSETS.ui.hpBarPlayer, ASSETS.ui.hpBarEnemy,
      ASSETS.ui.joystickBase, ASSETS.ui.joystickThumb,
      ASSETS.ui.btnAttack, ASSETS.ui.btnJump, ASSETS.ui.btnBlock,
    ]) {
      if (path) this.load.image(path, path);
    }
  }

  create(): void {
    if (!ASSETS.usePlaceholders) {
      for (const def of Object.values(ASSETS.fighters)) {
        for (const [animName, anim] of Object.entries(def.animations)) {
          const key = `${def.key}-${animName}`;
          if (this.anims.exists(key)) continue;
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(def.key, { start: anim.start, end: anim.end }),
            frameRate: anim.frameRate,
            repeat: anim.repeat,
          });
        }
      }
    }
    this.scene.start('TitleScene');
  }
}
