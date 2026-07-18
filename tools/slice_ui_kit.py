#!/usr/bin/env python3
"""
UI 素材切割:把一張 UI kit 圖(白底)去背後,自動偵測各元件的
bounding box,依形狀/顏色分類存成獨立 PNG。

用法:python3 tools/slice_ui_kit.py <kit.png> <輸出資料夾>

輸出:hpbar-red.png hpbar-blue.png joystick-base.png joystick-thumb.png
      btn-attack.png btn-jump.png btn-block.png
"""

import os
import sys
from collections import deque

import numpy as np
from PIL import Image


def main() -> None:
    src, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)

    arr = np.array(Image.open(src).convert('RGBA'))
    rgb = arr[:, :, :3].astype(np.int16)
    h, w = arr.shape[:2]

    # 去背:與影像邊緣相連的近白背景轉透明
    mn = rgb.min(axis=2)
    mx = rgb.max(axis=2)
    bg = (mn >= 190) & ((mx - mn) < 30)
    visited = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))
    arr[:, :, 3][visited] = 0

    # 連通元件偵測(在 1/4 縮圖上做,加速)
    alpha = arr[:, :, 3]
    small = (alpha[::4, ::4] > 0)
    sh, sw = small.shape
    seen = np.zeros_like(small, dtype=bool)
    boxes = []
    for sy in range(sh):
        for sx in range(sw):
            if not small[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            y0 = y1 = sy
            x0 = x1 = sx
            count = 0
            while q:
                cy, cx = q.popleft()
                count += 1
                y0, y1 = min(y0, cy), max(y1, cy)
                x0, x1 = min(x0, cx), max(x1, cx)
                for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1),
                               (cy-1,cx-1),(cy-1,cx+1),(cy+1,cx-1),(cy+1,cx+1)):
                    if 0 <= ny < sh and 0 <= nx < sw and small[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if count < 40:  # 雜點
                continue
            boxes.append([x0 * 4, y0 * 4, (x1 + 1) * 4, (y1 + 1) * 4])

    # 精修 bbox(用全解析度 alpha)並分類
    items = []
    for bx0, by0, bx1, by1 in boxes:
        pad = 6
        rx0, ry0 = max(0, bx0 - pad), max(0, by0 - pad)
        rx1, ry1 = min(w, bx1 + pad), min(h, by1 + pad)
        region = alpha[ry0:ry1, rx0:rx1]
        ys, xs = np.nonzero(region)
        fx0, fx1 = rx0 + xs.min(), rx0 + xs.max() + 1
        fy0, fy1 = ry0 + ys.min(), ry0 + ys.max() + 1
        crop = arr[fy0:fy1, fx0:fx1]
        cw, ch = fx1 - fx0, fy1 - fy0
        opaque = crop[:, :, 3] > 0
        mean_rgb = crop[:, :, :3][opaque].mean(axis=0)
        items.append({'crop': crop, 'w': cw, 'h': ch, 'y': fy0, 'x': fx0, 'rgb': mean_rgb})

    named: dict[str, np.ndarray] = {}
    bars = sorted([i for i in items if i['w'] / i['h'] > 4], key=lambda i: i['y'])
    rounds = sorted([i for i in items if i['w'] / i['h'] <= 4], key=lambda i: i['w'] * i['h'])
    for bar in bars:
        r, g, b = bar['rgb']
        named['hpbar-red.png' if r > b else 'hpbar-blue.png'] = bar['crop']
    if rounds:
        named['joystick-thumb.png'] = rounds[0]['crop']   # 最小
        named['joystick-base.png'] = rounds[-1]['crop']   # 最大
        for item in rounds[1:-1]:
            r, g, b = item['rgb']
            if g > r and g > b:
                named['btn-jump.png'] = item['crop']      # 綠箭頭
            elif r > g and r > b and b < r * 0.8:
                named['btn-attack.png'] = item['crop']    # 紅拳頭
            else:
                named['btn-block.png'] = item['crop']     # 紫盾牌

    for filename, crop in named.items():
        Image.fromarray(crop).save(os.path.join(outdir, filename))
        print(f'{filename}: {crop.shape[1]}x{crop.shape[0]}')
    missing = {'hpbar-red.png','hpbar-blue.png','joystick-base.png','joystick-thumb.png',
               'btn-attack.png','btn-jump.png','btn-block.png'} - set(named)
    if missing:
        print('WARNING missing:', missing)


if __name__ == '__main__':
    main()
