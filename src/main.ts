import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CharSelectScene } from './scenes/CharSelectScene';
import { FightScene } from './scenes/FightScene';
import { ModeSelectScene } from './scenes/ModeSelectScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { TitleScene } from './scenes/TitleScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,          // 960×540 等比縮放,自動適應手機螢幕
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  input: {
    activePointers: 4, // 多點觸控:搖桿 + 多顆按鈕同時按
  },
  disableContextMenu: true,
  scene: [BootScene, TitleScene, ModeSelectScene, CharSelectScene, StageSelectScene, FightScene],
});
