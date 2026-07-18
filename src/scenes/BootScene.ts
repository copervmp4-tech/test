import Phaser from 'phaser';
import { ASSETS } from '../config/assets';

/**
 * 載入資源並註冊動畫。
 * 色塊模式(usePlaceholders = true)下沒有圖檔要載,直接進戰鬥場景;
 * 換上正式 sprite sheet 後,這裡會依 assets.ts 的設定載圖並建立所有動畫。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    if (ASSETS.usePlaceholders) return;

    this.load.setPath(ASSETS.basePath);
    for (const def of Object.values(ASSETS.fighters)) {
      this.load.spritesheet(def.key, def.path, {
        frameWidth: def.frameWidth,
        frameHeight: def.frameHeight,
      });
    }
    if (ASSETS.stage.backgroundImage) {
      this.load.image('stage-bg', ASSETS.stage.backgroundImage);
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
    this.scene.start('FightScene');
  }
}
