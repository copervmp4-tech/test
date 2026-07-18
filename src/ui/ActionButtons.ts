import Phaser from 'phaser';
import { ASSETS } from '../config/assets';

export type ActionName = 'attack' | 'jump' | 'block';

interface ButtonEntry {
  visual: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  baseScale: number;
  pointerId: number | null;
}

interface ButtonSpec {
  name: ActionName;
  x: number;
  y: number;
  radius: number;
  color: number;
  label: string;
  textureKey: string | null;
}

/**
 * 右下角三顆大按鈕:攻擊(A/紅拳)、跳躍(J/綠箭)、防禦(D/紫盾)。
 * 直徑 >= 80px,各自以 pointer id 追蹤,支援多點觸控(邊移動邊攻擊)。
 * 有 UI 素材時用圖示鈕;否則回退半透明色圈 + 文字。
 */
export class ActionButtons {
  readonly displayObjects: Phaser.GameObjects.GameObject[] = [];

  private buttons = new Map<ActionName, ButtonEntry>();
  private down: Record<ActionName, boolean> = { attack: false, jump: false, block: false };
  private just: Record<ActionName, boolean> = { attack: false, jump: false, block: false };

  constructor(scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const specs: ButtonSpec[] = [
      { name: 'attack', x: w - 92, y: h - 100, radius: 52, color: 0xff5544, label: 'A', textureKey: ASSETS.ui.btnAttack },
      { name: 'jump',   x: w - 206, y: h - 66, radius: 44, color: 0x44aaff, label: 'J', textureKey: ASSETS.ui.btnJump },
      { name: 'block',  x: w - 90, y: h - 216, radius: 44, color: 0x77cc55, label: 'D', textureKey: ASSETS.ui.btnBlock },
    ];
    for (const spec of specs) this.makeButton(scene, spec);

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

  private makeButton(scene: Phaser.Scene, spec: ButtonSpec): void {
    const { name, x, y, radius, color, label, textureKey } = spec;
    let visual: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
    let baseScale = 1;

    const hitR = radius + 12; // 觸控判定範圍比外觀再大一點
    if (textureKey && scene.textures.exists(textureKey)) {
      const img = scene.add.image(x, y, textureKey).setDepth(1000);
      baseScale = (radius * 2) / img.width; // 直徑對齊按鈕尺寸
      img.setScale(baseScale).setAlpha(0.92);
      // hit area 以未縮放的貼圖座標定義,圓心 = 貼圖中心
      const localR = hitR / baseScale;
      img.setInteractive(
        new Phaser.Geom.Circle(img.width / 2, img.height / 2, localR),
        Phaser.Geom.Circle.Contains,
      );
      visual = img;
    } else {
      const arc = scene.add
        .circle(x, y, radius, color, 0.28)
        .setStrokeStyle(2, 0xffffff, 0.5)
        .setDepth(1000);
      arc.setInteractive(new Phaser.Geom.Circle(radius, radius, hitR), Phaser.Geom.Circle.Contains);
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
      this.displayObjects.push(text);
      visual = arc;
    }

    const entry: ButtonEntry = { visual, baseScale, pointerId: null };
    this.buttons.set(name, entry);
    this.displayObjects.push(visual);

    visual.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      entry.pointerId = pointer.id;
      this.down[name] = true;
      this.just[name] = true;
      this.setPressedVisual(entry, color, true);
    });
  }

  private setReleased(name: ActionName): void {
    const entry = this.buttons.get(name)!;
    entry.pointerId = null;
    this.down[name] = false;
    this.setPressedVisual(entry, 0, false);
  }

  private setPressedVisual(entry: ButtonEntry, color: number, pressed: boolean): void {
    if (entry.visual instanceof Phaser.GameObjects.Image) {
      entry.visual.setScale(entry.baseScale * (pressed ? 0.9 : 1));
      if (pressed) entry.visual.setTint(0xbbbbbb);
      else entry.visual.clearTint();
    } else {
      entry.visual.setFillStyle(color || entry.visual.fillColor, pressed ? 0.55 : 0.28);
    }
  }
}
