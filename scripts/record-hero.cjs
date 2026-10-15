const fs = require('node:fs/promises');
const path = require('node:path');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function record(browser, output) {
  const directory = path.join(output, 'hero-frames');
  await fs.mkdir(directory, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const frames = [], writes = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const session = await context.newCDPSession(page);
  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__synthecoreScrollQA?.getState?.().ready);
    await pause(500);
    session.on('Page.screencastFrame', event => {
      const name = `frame-${String(frames.length).padStart(5, '0')}.jpg`;
      frames.push({ name, timestamp: event.metadata.timestamp });
      writes.push(fs.writeFile(path.join(directory, name), Buffer.from(event.data, 'base64')));
      writes.push(session.send('Page.screencastFrameAck', { sessionId: event.sessionId }));
    });
    await session.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
    await pause(600);
    for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, 110); await pause(200); }
    await pause(2000);
    for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, -110); await pause(200); }
    await pause(2000);
    await session.send('Page.stopScreencast');
    await pause(100);
    await Promise.all(writes);
    if (frames.length < 10) throw new Error(`Insufficient real screencast frames: ${frames.length}`);
    if (errors.length) throw new Error(errors.join('; '));
    const concat = ['ffconcat version 1.0'];
    frames.forEach((frame, index) => {
      concat.push(`file 'hero-frames/${frame.name}'`);
      const duration = index + 1 < frames.length ? Math.max(.001, frames[index + 1].timestamp - frame.timestamp) : .5;
      concat.push(`duration ${duration.toFixed(6)}`);
    });
    concat.push(`file 'hero-frames/${frames.at(-1).name}'`);
    await fs.writeFile(path.join(output, 'hero-frames.ffconcat'), concat.join('\n') + '\n');
    const result = { source: 'Chromium CDP Page.screencastFrame', viewport: '1920x1080',
      frameCount: frames.length, duration: frames.at(-1).timestamp - frames[0].timestamp, frames };
    await fs.writeFile(path.join(output, 'recording.json'), JSON.stringify(result, null, 2));
    return { frameCount: result.frameCount, duration: result.duration, concat: 'output/playwright/hero-frames.ffconcat' };
  } finally { await context.close(); }
}
module.exports = { record };

if (require.main === module) {
  (async () => {
    const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    try { console.log(JSON.stringify(await record(browser, path.resolve(__dirname, '../output/playwright')))); }
    finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
