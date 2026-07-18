import Phaser from 'phaser';

export type ActionName = 'attack' | 'jump' | 'block';

interface ButtonEntry {
  circle: Phaser.GameObjects.Arc;
  pointerId: number | null;
}

/**
 * 右下角三顆半透明大按鈕:攻擊(A)、跳躍(J)、防禦(D)。
 * 直徑 >= 80px,各自以 pointer id 追蹤,支援多點觸控(邊移動邊攻擊)。
 */
export class ActionButtons {
  readonly displayObjects: Phaser.GameObjects.GameObject[] = [];

  private buttons = new Map<ActionName, ButtonEntry>();
  private down: Record<ActionName, boolean> = { attack: false, jump: false, block: false };
  private just: Record<ActionName, boolean> = { attack: false, jump: false, block: false };

  constructor(scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    // 攻擊最大顆放最順手的位置
    this.makeButton(scene, 'attack', w - 90, h - 100, 48, 0xff5544, 'A');
    this.makeButton(scene, 'jump', w - 200, h - 66, 42, 0x44aaff, 'J');
    this.makeButton(scene, 'block', w - 88, h - 212, 42, 0x77cc55, 'D');

    // 放開手指(含移出按鈕範圍後放開)一律視為釋放
    const release = (pointer: Phaser.Input.Pointer) => {
      for (const [name, entry] of this.buttons) {
        if (entry.pointerId === pointer.id) this.setReleased(name);
      }
    };
    scene.input.on(Phaser.Input.Events.POINTER_UP, release);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** 是否按住中(防禦這種持續型操作用) */
  isDown(name: ActionName): boolean {
    return this.down[name];
  }

  /** 讀取並清除「本幀剛按下」(攻擊/跳躍這種觸發型操作用) */
  consumeJustPressed(name: ActionName): boolean {
    const value = this.just[name];
    this.just[name] = false;
    return value;
  }

  private makeButton(
    scene: Phaser.Scene,
    name: ActionName,
    x: number,
    y: number,
    radius: number,
    color: number,
    label: string,
  ): void {
    const circle = scene.add
      .circle(x, y, radius, color, 0.28)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setDepth(1000);
    // 觸控判定範圍比外觀再大一點
    const hitR = radius + 12;
    circle.setInteractive(new Phaser.Geom.Circle(radius, radius, hitR), Phaser.Geom.Circle.Contains);

    const text = scene.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${radius * 0.8}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(1001);

    const entry: ButtonEntry = { circle, pointerId: null };
    this.buttons.set(name, entry);
    this.displayObjects.push(circle, text);

    circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      entry.pointerId = pointer.id;
      this.down[name] = true;
      this.just[name] = true;
      circle.setFillStyle(color, 0.55);
    });
  }

  private setReleased(name: ActionName): void {
    const entry = this.buttons.get(name)!;
    entry.pointerId = null;
    this.down[name] = false;
    entry.circle.setFillStyle(entry.circle.fillColor, 0.28);
  }
}
