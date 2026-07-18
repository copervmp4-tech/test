import Phaser from 'phaser';

/** hpbar 素材的內部填色區(相對 1500×151 原圖,tools/slice_ui_kit.py 實測) */
const BAR_TEX_W = 1500;
const FILL = { left: 41, right: 1458, top: 39, bottom: 112 };

/**
 * 畫面上方血條。alignRight = true 時靠右對齊、往左扣血(敵人用)。
 * 顯示值會平滑追上實際血量。
 * 有 UI 素材(textureKey)時用圖框 + 遮罩排空;否則回退程式繪製色條。
 */
export class HealthBar {
  readonly displayObjects: Phaser.GameObjects.GameObject[] = [];

  private displayed: number;
  private target: number;

  // 素材模式
  private drainMask?: Phaser.GameObjects.Rectangle;
  private fillLeftWorld = 0;
  private fillWidth = 0;
  private fillTopWorld = 0;
  private fillHeight = 0;
  // 程式繪製模式
  private fillRect?: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    private max: number,
    private alignRight: boolean,
    label: string,
    textureKey?: string | null,
  ) {
    this.displayed = max;
    this.target = max;

    if (textureKey && scene.textures.exists(textureKey)) {
      this.buildTextured(scene, x, y, width, textureKey);
    } else {
      this.buildDrawn(scene, x, y, width);
    }

    const text = scene.add
      .text(x, y - 8, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(this.alignRight ? 1 : 0, 1)
      .setShadow(0, 2, 'rgba(0,0,0,0.6)', 3)
      .setDepth(1002);
    this.displayObjects.push(text);
  }

  private buildTextured(
    scene: Phaser.Scene, x: number, y: number, width: number, key: string,
  ): void {
    const scale = width / BAR_TEX_W;
    const originX = this.alignRight ? 1 : 0;
    const bar = scene.add.image(x, y, key).setOrigin(originX, 0).setScale(scale).setDepth(1000);

    const imgLeft = this.alignRight ? x - width : x;
    this.fillLeftWorld = imgLeft + FILL.left * scale;
    this.fillWidth = (FILL.right - FILL.left) * scale;
    this.fillTopWorld = y + FILL.top * scale;
    this.fillHeight = (FILL.bottom - FILL.top) * scale;

    // 排空遮罩:蓋住已流失的填色部分(顏色接近框內暗色)
    this.drainMask = scene.add
      .rectangle(0, this.fillTopWorld, 0, this.fillHeight, 0x0b0d14, 0.94)
      .setOrigin(0, 0)
      .setDepth(1001);

    this.displayObjects.push(bar, this.drainMask);
  }

  private buildDrawn(scene: Phaser.Scene, x: number, y: number, width: number): void {
    const height = 24;
    const originX = this.alignRight ? 1 : 0;
    const back = scene.add
      .rectangle(x, y, width, height, 0x14161c, 0.75)
      .setOrigin(originX, 0)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(1000);
    const inset = 3;
    this.fillRect = scene.add
      .rectangle(
        this.alignRight ? x - inset : x + inset,
        y + inset,
        width - inset * 2,
        height - inset * 2,
        0xf2b632,
      )
      .setOrigin(originX, 0)
      .setDepth(1001);
    this.displayObjects.push(back, this.fillRect);
  }

  setValue(hp: number): void {
    this.target = Phaser.Math.Clamp(hp, 0, this.max);
  }

  update(dt: number): void {
    this.displayed += (this.target - this.displayed) * Math.min(1, dt * 10);
    if (Math.abs(this.displayed - this.target) < 0.1) this.displayed = this.target;
    const ratio = this.displayed / this.max;

    if (this.drainMask) {
      // 蓋住 (1-ratio) 的填色;玩家(左對齊)從右排空、敵人(右對齊)從左排空
      const lost = this.fillWidth * (1 - ratio);
      this.drainMask.width = lost;
      const maskX = this.alignRight
        ? this.fillLeftWorld
        : this.fillLeftWorld + this.fillWidth - lost;
      this.drainMask.x = maskX;
    } else if (this.fillRect) {
      this.fillRect.setScale(ratio, 1);
      if (ratio < 0.25) this.fillRect.setFillStyle(0xe64533);
      else if (ratio < 0.5) this.fillRect.setFillStyle(0xf28c33);
      else this.fillRect.setFillStyle(0xf2b632);
    }
  }
}
