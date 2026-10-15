const fs=require('node:fs/promises');
const path=require('node:path');
const output=path.resolve(__dirname,`../output/playwright/hero-handoff/${process.argv.includes('--proposal')?'proposal-full-viewport':'current'}`);
(async()=>{
  const {frames}=JSON.parse(await fs.readFile(path.join(output,'recording.json'),'utf8'));
  if(!frames?.length)throw new Error('Missing real screencast frames');
  const fps=20,duration=frames.at(-1).timestamp-frames[0].timestamp+.5,count=Math.ceil(duration*fps);
  const stream=await fs.open(path.join(output,'hero-recording.mjpeg'),'w');
  let index=0,loaded=-1,buffer;try{for(let sample=0;sample<count;sample++){
    const timestamp=frames[0].timestamp+sample/fps;while(index+1<frames.length&&frames[index+1].timestamp<=timestamp)index++;
    if(loaded!==index){buffer=await fs.readFile(path.join(output,'hero-frames',frames[index].name));loaded=index;}await stream.write(buffer);
  }}finally{await stream.close();}
  console.log(JSON.stringify({sourceFrames:frames.length,outputFrames:count,fps,duration}));
})().catch(e=>{console.error(e);process.exitCode=1;});
