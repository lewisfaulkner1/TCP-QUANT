// Render SVG logo files to PNG with headless Chromium.
// usage: node render.js <jobs.json>
// jobs: [{svg, png, width, bg?, pad?, height?}]  width in px; bg null = transparent
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const job of jobs) {
    const svg = fs.readFileSync(job.svg, 'utf8');
    const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
    const vw = parseFloat(m[3]), vh = parseFloat(m[4]);
    const pad = job.pad || 0;
    const W = job.width;
    const H = job.height || Math.round((W - 2 * pad) * vh / vw + 2 * pad);
    const innerW = W - 2 * pad, innerH = H - 2 * pad;
    const html = `<!doctype html><html><head><style>
      html,body{margin:0;width:${W}px;height:${H}px;background:${job.bg || 'transparent'};}
      .wrap{width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;}
      img{width:${innerW}px;height:${innerH}px;object-fit:contain;display:block;}
    </style></head><body><div class="wrap"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></div></body></html>`;
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(html);
    await page.waitForFunction(() => document.images[0] && document.images[0].complete);
    fs.mkdirSync(path.dirname(job.png), { recursive: true });
    await page.screenshot({ path: job.png, omitBackground: !job.bg });
    console.log('rendered', path.basename(path.dirname(job.png)) + '/' + path.basename(job.png), `${W}x${H}`);
  }
  await browser.close();
})();
