// Resample real timestamped CDP frames to a 20 fps MJPEG stream for FFmpeg.
const fs = require('node:fs/promises');
const path = require('node:path');
const output = path.resolve(__dirname, '../output/playwright');
(async () => {
  const recording = JSON.parse(await fs.readFile(path.join(output, 'recording.json'), 'utf8'));
  const frames = recording.frames, fps = 20;
  if (!frames?.length) throw new Error('No actual CDP recording frames');
  const duration = frames.at(-1).timestamp - frames[0].timestamp + .5;
  const count = Math.ceil(duration * fps);
  const stream = await fs.open(path.join(output, 'hero-recording.mjpeg'), 'w');
  let index = 0, loadedIndex = -1, buffer;
  try {
    for (let sample = 0; sample < count; sample++) {
      const timestamp = frames[0].timestamp + sample / fps;
      while (index + 1 < frames.length && frames[index + 1].timestamp <= timestamp) index++;
      if (loadedIndex !== index) {
        buffer = await fs.readFile(path.join(output, 'hero-frames', frames[index].name));
        loadedIndex = index;
      }
      await stream.write(buffer);
    }
  } finally { await stream.close(); }
  console.log(JSON.stringify({ sourceFrames: frames.length, outputFrames: count, fps, duration, file: 'output/playwright/hero-recording.mjpeg' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
