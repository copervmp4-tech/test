import Phaser from 'phaser';

/**
 * MP 氣力條(血條下方),可選在其下顯示「第十拍」層數格。
 * alignRight = true 時靠右對齊(敵人用)。
 */
export class MpBar {
  readonly displayObjects: Phaser.GameObjects.GameObject[] = [];

  private fill: Phaser.GameObjects.Rectangle;
  private readonly innerW: number;
  private pips: Phaser.GameObjects.Rectangle[] = [];
  private displayed = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    alignRight: boolean,
    chargeThreshold = 0, // > 0 才顯示第十拍層數
  ) {
    const height = 12;
    const originX = alignRight ? 1 : 0;
    this.innerW = width - 6;

    const back = scene.add
      .rectangle(x, y, width, height, 0x0b0d14, 0.8)
      .setOrigin(originX, 0)
      .setStrokeStyle(2, 0x3a4763, 0.9)
      .setDepth(1000);
    this.fill = scene.add
      .rectangle(alignRight ? x - 3 : x + 3, y + 3, this.innerW, height - 6, 0x38c6ff)
      .setOrigin(originX, 0)
      .setDepth(1001);
    this.displayObjects.push(back, this.fill);

    if (chargeThreshold > 0) {
      const label = scene.add
        .text(x, y + height + 5, '第十拍', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: '#7fe3ff',
        })
        .setOrigin(originX, 0)
        .setDepth(1001);
      this.displayObjects.push(label);

      const pipW = 14;
      const gap = 4;
      const labelW = 52;
      for (let i = 0; i < chargeThreshold; i++) {
        const px = alignRight
          ? x - labelW - i * (pipW + gap)
          : x + labelW + i * (pipW + gap);
        const pip = scene.add
          .rectangle(px, y + height + 10, pipW, 8, 0x2a3348)
          .setOrigin(alignRight ? 1 : 0, 0)
          .setStrokeStyle(1, 0x4a5570, 0.9)
          .setDepth(1001);
        this.pips.push(pip);
        this.displayObjects.push(pip);
      }
    }
  }

  setValue(mp: number, maxMp: number): void {
    this.displayed = Phaser.Math.Clamp(mp / maxMp, 0, 1);
  }

  setCharge(charge: number): void {
    this.pips.forEach((pip, i) => {
      const on = i < charge;
      const full = charge >= this.pips.length;
      pip.setFillStyle(on ? (full ? 0xffd23f : 0x7fe3ff) : 0x2a3348);
    });
  }

  update(): void {
    this.fill.width = this.innerW * this.displayed;
  }
}
