/**
 * 把 vite build 的產物打包成單一 HTML(dist/single.html):
 * - bundle JS 內嵌進 <script>
 * - public/assets/ 內被程式引用到的 .png 轉成 data URI 內嵌
 *   (Phaser 載入器遇到 data: 開頭的路徑會自動略過 basePath,可直接替換)
 * 用途:發佈到 claude.ai Artifact 或任何只能放一個檔案的地方。
 * 先跑 npm run build 再執行:node tools/build-singlefile.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const bundleName = readdirSync('dist/assets').find((f) => f.endsWith('.js'));
if (!bundleName) throw new Error('dist/assets 裡沒有 JS bundle,先跑 npm run build');
let js = readFileSync(`dist/assets/${bundleName}`, 'utf8');

// 遞迴收集 public/assets 下所有 .png(含 ui/ 子資料夾)
const ROOT = 'public/assets';
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.png')) out.push(full);
  }
  return out;
}

let total = 0;
for (const full of walk(ROOT)) {
  // 程式引用時用的是相對 assets 根目錄的路徑(如 'ui/hpbar-blue.png'、'tonni.png')
  const relPath = relative(ROOT, full).split('\\').join('/');
  const quoted = JSON.stringify(relPath);
  if (!js.includes(quoted)) continue; // 沒被引用的素材(原始檔等)略過
  const b64 = readFileSync(full).toString('base64');
  js = js.replaceAll(quoted, JSON.stringify(`data:image/png;base64,${b64}`));
  total += b64.length;
  console.log(`inlined ${relPath} (${Math.round(b64.length / 1024)} KB base64)`);
}
console.log(`total inlined ~${Math.round(total / 1024 / 1024 * 10) / 10} MB base64`);

// 避免 JS 內容提早關閉 <script> 標籤
js = js.replaceAll('</script', '<\\/script');

const html = `<meta charset="utf-8" />
<title>格鬥遊戲原型</title>
<style>
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    background: #000; overflow: hidden;
    touch-action: none;
    -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
  }
  #game { width: 100%; height: 100%; }
  #game canvas { display: block; }
  #rotate-overlay {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(0,0,0,0.94); color: #fff;
    display: none; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; font-family: system-ui, -apple-system, 'Noto Sans TC', sans-serif;
    font-size: 20px; text-align: center;
  }
  #rotate-overlay .icon { font-size: 64px; animation: rotate-hint 1.8s ease-in-out infinite; }
  @keyframes rotate-hint { 0%,25% { transform: rotate(0deg); } 65%,100% { transform: rotate(90deg); } }
  @media (orientation: portrait) { #rotate-overlay { display: flex; } }
</style>
<div id="game"></div>
<div id="rotate-overlay">
  <div class="icon">📱</div>
  <div>請將手機轉為橫向</div>
</div>
<script type="module">
${js}
</script>
`;

writeFileSync('dist/single.html', html);
console.log(`saved dist/single.html (${Math.round(html.length / 1024)} KB)`);
