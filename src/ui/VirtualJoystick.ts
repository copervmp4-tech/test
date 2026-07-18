import Phaser from 'phaser';
import { ASSETS } from '../config/assets';

type Knob = Phaser.GameObjects.Image | Phaser.GameObjects.Arc;

/**
 * 虛擬搖桿:觸碰畫面左半邊任意位置時,搖桿基座移到觸碰點(浮動式)。
 * 輸出 vector = { x, y },各分量 -1 ~ 1(y 用於淺景深上下走位)。
 * 以 pointer id 追蹤,支援多點觸控(可以邊移動邊按右側按鈕)。
 * 有 UI 素材時用圖示,否則回退半透明圓。
 */
export class VirtualJoystick {
  readonly vector = { x: 0, y: 0 };

  /** 給場景做 UI 攝影機分層用 */
  readonly displayObjects: Phaser.GameObjects.GameObject[];

  private pointerId: number | null = null;
  private baseX: number;
  private baseY: number;
  private readonly radius = 60;
  private readonly deadzone = 0.22;
  private base: Knob;
  private thumb: Knob;
  private restAlphaBase: number;
  private restAlphaThumb: number;

  constructor(private scene: Phaser.Scene) {
    // 未觸碰時停在左下角當提示
    this.baseX = 140;
    this.baseY = scene.scale.height - 120;

    this.base = this.makeKnob(scene, this.baseX, this.baseY, (this.radius + 4) * 2, ASSETS.ui.joystickBase, 0.35);
    this.thumb = this.makeKnob(scene, this.baseX, this.baseY, 60, ASSETS.ui.joystickThumb, 0.5);
    this.base.setDepth(1000);
    this.thumb.setDepth(1001);
    this.restAlphaBase = this.base.alpha;
    this.restAlphaThumb = this.thumb.alpha;
    this.displayObjects = [this.base, this.thumb];

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  private makeKnob(
    scene: Phaser.Scene, x: number, y: number, diameter: number, textureKey: string | null, restAlpha: number,
  ): Knob {
    if (textureKey && scene.textures.exists(textureKey)) {
      const img = scene.add.image(x, y, textureKey);
      img.setScale(diameter / img.width).setAlpha(restAlpha + 0.15);
      return img;
    }
    return scene.add
      .circle(x, y, diameter / 2, 0xffffff, restAlpha * 0.3)
      .setStrokeStyle(2, 0xffffff, restAlpha);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return;
    if (pointer.x > this.scene.scale.width * 0.45) return; // 只吃左半邊,右邊留給按鈕
    this.pointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.base.setPosition(this.baseX, this.baseY).setAlpha(this.restAlphaBase + 0.25);
    this.thumb.setPosition(this.baseX, this.baseY).setAlpha(this.restAlphaThumb + 0.3);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    let dx = pointer.x - this.baseX;
    let dy = pointer.y - this.baseY;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) {
      dx = (dx / len) * this.radius;
      dy = (dy / len) * this.radius;
    }
    this.thumb.setPosition(this.baseX + dx, this.baseY + dy);

    const nx = dx / this.radius;
    const ny = dy / this.radius;
    const strength = Math.hypot(nx, ny);
    if (strength < this.deadzone) {
      this.vector.x = 0;
      this.vector.y = 0;
    } else {
      this.vector.x = nx;
      this.vector.y = ny;
    }
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector.x = 0;
    this.vector.y = 0;
    // 回到休息位置
    this.baseX = 140;
    this.baseY = this.scene.scale.height - 120;
    this.base.setPosition(this.baseX, this.baseY).setAlpha(this.restAlphaBase);
    this.thumb.setPosition(this.baseX, this.baseY).setAlpha(this.restAlphaThumb);
  }
}
