import Phaser from 'phaser';
import { FighterSpriteDef } from '../config/assets';
import { MoveDef, PassiveId } from '../config/moves';
import { CommandInput } from '../systems/CommandInput';
import { ActionButtons } from '../ui/ActionButtons';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { Fighter, FighterInput, FighterStats } from './Fighter';

/** 玩家:合併「鍵盤(方向鍵 + Z/X/C)」與「觸控(搖桿 + 按鈕)」輸入,並比對招式指令 */
export class Player extends Fighter {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: { Z: Phaser.Input.Keyboard.Key; X: Phaser.Input.Keyboard.Key; C: Phaser.Input.Keyboard.Key };
  private command = new CommandInput();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: FighterSpriteDef,
    stats: FighterStats,
    moves: MoveDef[],
    passiveId: PassiveId | null,
    private joystick: VirtualJoystick,
    private buttons: ActionButtons,
  ) {
    super(scene, x, y, def, 1, stats, moves, passiveId);
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

    const blockHeld = this.keys.C.isDown || this.buttons.isDown('block');
    let attackPressed = Phaser.Input.Keyboard.JustDown(this.keys.Z) || this.buttons.consumeJustPressed('attack');
    let jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.X) || this.buttons.consumeJustPressed('jump');

    // 指令輸入:方向以面向換算(forward = 面向前),餵進緩衝並在觸發鍵比對招式
    const now = this.scene.time.now;
    this.command.sample(now, moveX * this.facing, moveZ, blockHeld);

    let specialId: string | null = null;
    if (this.moves.length > 0) {
      if (attackPressed) {
        const m = this.command.match(now, 'attack', this.moves);
        if (m) { specialId = m; attackPressed = false; } // 指令消耗掉普攻
      }
      if (!specialId && jumpPressed) {
        const m = this.command.match(now, 'jump', this.moves);
        if (m) { specialId = m; jumpPressed = false; } // 指令消耗掉跳躍
      }
    }

    return { moveX, moveZ, attackPressed, jumpPressed, blockHeld, specialId };
  }
}
