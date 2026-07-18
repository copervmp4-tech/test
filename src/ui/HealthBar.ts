import Phaser from 'phaser';

/**
 * 畫面上方血條。alignRight = true 時靠右對齊、往左扣血(敵人用)。
 * 顯示值會平滑追上實際血量。
 */
export class HealthBar {
  readonly displayObjects: Phaser.GameObjects.GameObject[] = [];

  private fill: Phaser.GameObjects.Rectangle;
  private displayed: number;
  private target: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    private max: number,
    alignRight: boolean,
    label: string,
  ) {
    this.displayed = max;
    this.target = max;
    const height = 22;
    const originX = alignRight ? 1 : 0;

    const back = scene.add
      .rectangle(x, y, width, height, 0x14161c, 0.75)
      .setOrigin(originX, 0)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(1000);

    const inset = 3;
    this.fill = scene.add
      .rectangle(
        alignRight ? x - inset : x + inset,
        y + inset,
        width - inset * 2,
        height - inset * 2,
        0xf2b632,
      )
      .setOrigin(originX, 0)
      .setDepth(1001);

    const text = scene.add
      .text(x, y - 6, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(originX, 1)
      .setDepth(1001);

    this.displayObjects.push(back, this.fill, text);
  }

  setValue(hp: number): void {
    this.target = Phaser.Math.Clamp(hp, 0, this.max);
  }

  update(dt: number): void {
    this.displayed += (this.target - this.displayed) * Math.min(1, dt * 10);
    if (Math.abs(this.displayed - this.target) < 0.1) this.displayed = this.target;
    const ratio = this.displayed / this.max;
    this.fill.setScale(ratio, 1);
    // 低血量變色
    if (ratio < 0.25) this.fill.setFillStyle(0xe64533);
    else if (ratio < 0.5) this.fill.setFillStyle(0xf28c33);
    else this.fill.setFillStyle(0xf2b632);
  }
}
