const fs = require('node:fs/promises');
const path = require('node:path');
const output = path.resolve(__dirname, '../output/playwright');
(async () => {
  const response = await fetch('https://www.roveia.com/', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Roveia HTTP ${response.status}`);
  const source = await response.text();
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'roveia-source.html'), source);
  const blocks = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const urls = blocks.map(block => block[1].match(/src=["']([^"']+)/)?.[1]).filter(Boolean);
  const motion = blocks.filter(block => !block[1].includes('src=') && /gsap|ScrollTrigger|lenis/i.test(block[2]));
  await fs.writeFile(path.join(output, 'roveia-inline.js'), motion.map(block => block[2]).join('\n'));
  console.log(JSON.stringify({ status: response.status, scriptUrls: urls, inlineMotionBlocks: motion.length }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
