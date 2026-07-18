import Phaser from 'phaser';

/**
 * 全域 UI 風格:字型、顏色、按鈕樣式與共用 UI 工具。
 * 想調整整體風格(配色、字級、按鈕手感)只改這一個檔案。
 */
export const THEME = {
  gameTitle: 'STREET LEGENDS', // 遊戲標題(標題畫面顯示用)

  fontFamily: "system-ui, -apple-system, 'Noto Sans TC', sans-serif",
  fontSize: {
    title: 84,   // 標題畫面大字
    heading: 34, // 各場景頁首
    button: 26,  // 按鈕文字
    body: 16,
    small: 13,
  },

  colors: {
    accent: 0xf2b632,        // 主色(選中框、強調)
    accentCss: '#f2b632',
    textCss: '#ffffff',
    dimCss: 'rgba(255,255,255,0.6)',
    buttonFill: 0x27324e,    // 按鈕底色
    buttonStroke: 0xffffff,
    panelFill: 0x161c2e,     // 卡片/面板底色
    // 標題畫面背景漸層(之後換主視覺圖時仍作為載入前的底色)
    titleGradientTop: '#101528',
    titleGradientBottom: '#3a2f55',
  },

  button: {
    pressScale: 0.95, // 按下縮放
    pressDarken: 25,  // 按下變暗(%)
    radius: 14,
  },
};

/** 共用文字樣式 */
export function textStyle(
  size: number,
  color: string = THEME.colors.textCss,
  bold = true,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontFamily,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
  };
}

/** 產生(或重用)一張直向漸層的 canvas 貼圖,回傳貼圖 key */
export function ensureGradientTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  topColor: string,
  bottomColor: string,
): string {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  if (texture) {
    const ctx = texture.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    texture.refresh();
  }
  return key;
}

function darken(color: number, percent: number): number {
  return Phaser.Display.Color.ValueToColor(color).darken(percent).color;
}

/**
 * 共用按鈕:圓角底 + 文字,按下有縮放與變暗回饋,放開才觸發 onTap。
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onTap: () => void,
  fontSize: number = THEME.fontSize.button,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (fill: number) => {
    g.clear();
    g.fillStyle(fill, 0.92);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, THEME.button.radius);
    g.lineStyle(2, THEME.colors.buttonStroke, 0.85);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, THEME.button.radius);
  };
  draw(THEME.colors.buttonFill);
  const text = scene.add.text(0, 0, label, textStyle(fontSize)).setOrigin(0.5);
  container.add([g, text]);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );

  const press = () => {
    container.setScale(THEME.button.pressScale);
    draw(darken(THEME.colors.buttonFill, THEME.button.pressDarken));
  };
  const release = () => {
    container.setScale(1);
    draw(THEME.colors.buttonFill);
  };
  container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, press);
  container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, release);
  container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
    release();
    onTap();
  });
  return container;
}

/** 左上角返回鍵(圓形 ←),所有非標題場景共用 */
export function makeBackButton(
  scene: Phaser.Scene,
  onTap: () => void,
): Phaser.GameObjects.Container {
  const container = scene.add.container(46, 46);
  const circle = scene.add.circle(0, 0, 26, THEME.colors.buttonFill, 0.9)
    .setStrokeStyle(2, THEME.colors.buttonStroke, 0.7);
  const arrow = scene.add.text(0, -1, '←', textStyle(26)).setOrigin(0.5);
  container.add([circle, arrow]);
  container.setInteractive(new Phaser.Geom.Circle(0, 0, 34), Phaser.Geom.Circle.Contains);
  container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
    container.setScale(THEME.button.pressScale).setAlpha(0.75),
  );
  container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
    container.setScale(1).setAlpha(1),
  );
  container.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
    container.setScale(1).setAlpha(1);
    onTap();
  });
  return container;
}

/** 場景進場淡入 */
export function fadeInScene(scene: Phaser.Scene, duration = 250): void {
  scene.cameras.main.fadeIn(duration, 0, 0, 0);
}

/** 淡出後切換場景(重複觸發會被忽略) */
export function fadeToScene(scene: Phaser.Scene, key: string, duration = 220): void {
  const cam = scene.cameras.main;
  if (cam.fadeEffect.isRunning) return;
  cam.fadeOut(duration, 0, 0, 0);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key));
}
