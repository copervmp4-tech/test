#!/usr/bin/env python3
"""
Sprite sheet 去背工具。

用法:
    python3 tools/prepare_spritesheet.py <輸入.png> <輸出.png> [--cell 256] [--report]

做的事:
1. 以「每格四邊」為起點做 flood fill,把與邊緣相連的近白色背景(含格線)轉成透明。
   不用全圖顏色門檻,所以角色身上的白色(鞋襪、淺色衣服)不會被挖破。
2. --report 會印出每格不透明像素的 bounding box(算 scale / footOffset 用)。
"""

import sys
from collections import deque

import numpy as np
from PIL import Image


def is_background(rgb: np.ndarray, min_brightness: int = 198) -> np.ndarray:
    """近白 / 淺灰(背景與格線):亮度高且彩度低。
    背景偏灰的圖(例如帶漸層的淺灰底)用 --min-bg 調低門檻。"""
    mn = rgb.min(axis=2).astype(np.int16)
    mx = rgb.max(axis=2).astype(np.int16)
    return (mn >= min_brightness) & ((mx - mn) < 30)


def flood_from_edges(bg: np.ndarray) -> np.ndarray:
    """回傳與影像邊緣相連的背景遮罩(BFS)"""
    h, w = bg.shape
    visited = np.zeros_like(bg, dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x] and not visited[y, x]:
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
    return visited


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    cell = 256
    if '--cell' in sys.argv:
        cell = int(sys.argv[sys.argv.index('--cell') + 1])
    min_bg = 198
    if '--min-bg' in sys.argv:
        min_bg = int(sys.argv[sys.argv.index('--min-bg') + 1])
    report = '--report' in sys.argv
    src, dst = args[0], args[1]

    im = Image.open(src).convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3]
    h, w = arr.shape[:2]
    cols, rows = w // cell, h // cell

    bg = is_background(rgb, min_bg)
    # 逐格處理:格線在格子邊界,從每格自己的邊緣起 flood,格與格互不影響
    for r in range(rows):
        for c in range(cols):
            ys, xs = r * cell, c * cell
            tile_bg = bg[ys:ys + cell, xs:xs + cell]
            connected = flood_from_edges(tile_bg)
            arr[ys:ys + cell, xs:xs + cell, 3][connected] = 0

    Image.fromarray(arr).save(dst)
    print(f'saved {dst} ({w}x{h}, cell {cell}, {rows} rows x {cols} cols)')

    if report:
        alpha = arr[:, :, 3]
        for r in range(rows):
            for c in range(cols):
                tile = alpha[r * cell:(r + 1) * cell, c * cell:(c + 1) * cell]
                ys_nz, xs_nz = np.nonzero(tile)
                if len(ys_nz) == 0:
                    continue
                top, bottom = ys_nz.min(), ys_nz.max()
                left, right = xs_nz.min(), xs_nz.max()
                print(
                    f'  frame r{r}c{c}: bbox w={right - left + 1} h={bottom - top + 1} '
                    f'top={top} bottom={bottom} foot_offset={cell - 1 - bottom}'
                )


if __name__ == '__main__':
    main()
