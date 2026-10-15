const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
const output = path.resolve(__dirname, '../output/playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  try {
    for (const [width, height] of [[390, 844], [430, 932]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
      await page.waitForFunction(() => window.__synthecoreScrollQA?.getState().ready);
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(output, `${width}x${height}-native.png`) });
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    // Same-origin video permits checking decoded pixels, not just metadata.
    await page.goto('http://127.0.0.1:4173/output/playwright/video-check.json');
    await page.setContent('<body style="margin:0;background:#000"><video muted playsinline style="display:block;width:1280px;height:720px" preload="auto" src="http://127.0.0.1:4173/output/playwright/hero-down-up.webm"></video></body>');
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    const metadata = await page.evaluate(() => {
      const video = document.querySelector('video');
      return { width: video.videoWidth, height: video.videoHeight, duration: video.duration, error: video.error?.message ?? null };
    });
    assert.equal(metadata.width, 1280);
    // CDP streams the visible compositor surface, which can be shorter than
    // the emulated CSS viewport. Preserve its native aspect ratio in encoding.
    assert.ok(metadata.height > 500 && metadata.height <= 720);
    assert.ok(metadata.duration > 8); assert.equal(metadata.error, null);
    metadata.frames = [];
    await page.evaluate(() => document.querySelector('video').play());
    for (const time of [2, 5, 9]) {
      await page.waitForFunction(time => document.querySelector('video').currentTime >= time, time);
      const frame = await page.evaluate(() => {
        const video = document.querySelector('video');
        const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
        const painter = canvas.getContext('2d'); painter.drawImage(video, 0, 0, 32, 32);
        const pixels = painter.getImageData(0, 0, 32, 32).data;
        let brightness = 0, signature = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          brightness += pixels[i] + pixels[i + 1] + pixels[i + 2];
          signature = (signature * 31 + pixels[i] + pixels[i + 1] * 3 + pixels[i + 2] * 7) >>> 0;
        }
        return { time: video.currentTime, brightness: brightness / (32 * 32 * 3), signature };
      });
      assert.ok(frame.brightness > 20, `Video frame at ${time}s must contain the actual page`);
      metadata.frames.push(frame);
      await page.screenshot({ path: path.join(output, `recording-${time}s.png`) });
    }
    assert.notEqual(metadata.frames[0].signature, metadata.frames[1].signature, 'Video must show movement');
    await fs.writeFile(path.join(output, 'video-check.json'), JSON.stringify(metadata, null, 2));
    console.log(JSON.stringify(metadata));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
