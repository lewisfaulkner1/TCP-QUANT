// Inner Circle welcome banner for Telegram, 1280x720.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const b64 = (p) => fs.readFileSync(path.join(__dirname, p)).toString('base64');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'TCPSerif';font-style:italic;src:url(data:font/ttf;base64,${b64('fonts/instrument-serif-italic.ttf')})}
  @font-face{font-family:'Label';src:url(data:font/ttf;base64,${b64('fonts/archivo-semiexp-600.ttf')})}
  html,body{margin:0;background:#241640}
  </style></head><body>
  <div style="position:relative;width:1280px;height:720px;overflow:hidden;background:radial-gradient(circle at 50% 44%, rgba(216,173,78,0.16) 0%, rgba(216,173,78,0) 52%), radial-gradient(ellipse at 50% 50%, #2B1B4D 0%, #1A0F31 100%)">
    <div style="position:absolute;inset:28px;border:1.5px solid rgba(216,173,78,0.38);border-radius:6px"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px">
      <div style="font-family:Label;font-size:17px;letter-spacing:0.42em;padding-left:0.42em;color:#D8AD4E">WELCOME TO THE</div>
      <img src="data:image/svg+xml;base64,${b64('out_final/official/tcp-inner-circle-stacked.svg')}" style="height:370px;display:block">
      <div style="font-family:'TCPSerif';font-style:italic;font-size:42px;color:#F2ECDF">Elite by design. <span style="color:#D8AD4E">Different by nature.</span></div>
    </div>
  </div></body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(html);
  await page.evaluate(async () => { await document.fonts.load("italic 42px 'TCPSerif'"); await document.fonts.load('17px Label'); await document.fonts.ready; });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: process.argv[2] });
  await browser.close();
  console.log('wrote', process.argv[2]);
})();
