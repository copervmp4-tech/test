import Phaser from 'phaser';
import { FighterSpriteDef } from '../config/assets';
import { ActionButtons } from '../ui/ActionButtons';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { Fighter, FighterInput, FighterStats } from './Fighter';

/** 玩家:合併「鍵盤(方向鍵 + Z/X/C)」與「觸控(搖桿 + 按鈕)」輸入 */
export class Player extends Fighter {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: { Z: Phaser.Input.Keyboard.Key; X: Phaser.Input.Keyboard.Key; C: Phaser.Input.Keyboard.Key };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: FighterSpriteDef,
    stats: FighterStats,
    private joystick: VirtualJoystick,
    private buttons: ActionButtons,
  ) {
    super(scene, x, y, def, 1, stats);
    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys('Z,X,C') as Player['keys'];
  }

  collectInput(): FighterInput {
    let moveX = this.joystick.vector.x;
    let moveZ = this.joystick.vector.y;
    if (this.cursors.left.isDown) moveX = -1;
    else if (this.cursors.right.isDown) moveX = 1;
    if (this.cursors.up.isDown) moveZ = -1;
    else if (this.cursors.down.isDown) moveZ = 1;

    // 鍵盤與按鈕都要各自讀取(不能短路),避免觸控的 justPressed 殘留到下一幀
    const kbAttack = Phaser.Input.Keyboard.JustDown(this.keys.Z);
    const btnAttack = this.buttons.consumeJustPressed('attack');
    const kbJump = Phaser.Input.Keyboard.JustDown(this.keys.X);
    const btnJump = this.buttons.consumeJustPressed('jump');

    return {
      moveX,
      moveZ,
      attackPressed: kbAttack || btnAttack,
      jumpPressed: kbJump || btnJump,
      blockHeld: this.keys.C.isDown || this.buttons.isDown('block'),
    };
  }
}
