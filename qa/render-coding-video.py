"""Original silent coding-scene video. Optional tools: Pillow and imageio-ffmpeg."""
from pathlib import Path
import sys, re, subprocess
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, str(Path(__file__).parent / 'video-tools'))
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
W,H,FPS,DURATION=960,820,24,18
mono=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17)
small=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',13)
title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',29)
sans=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
lines=["import { motion } from 'motion/react';","import { Sparkles } from './icons';","",'export default function Studio() {','  return (','    <motion.main className="studio">','      <Sparkles size={24} />','      <h1>Build something beautiful.</h1>','      <p>Your next idea starts here.</p>','    </motion.main>','  );','}']
terminal=['❯ npm run build','vite building for production…','✓ 42 modules transformed','dist/index.html       0.48 kB','✓ Built in 384ms','❯ Ready on localhost:3000']
def frame(t):
    im=Image.new('RGB',(W,H),'#101925');d=ImageDraw.Draw(im)
    d.rectangle((0,0,W,58),fill='#17212e');d.line((0,58,W,58),fill='#314156')
    for x,c in [(26,'#ef8f89'),(46,'#e8c47a'),(66,'#7bc4a4')]:d.ellipse((x,25,x+9,34),fill=c)
    d.text((345,22),'bebin / creative-workspace',font=small,fill='#9aacbf');d.text((850,22),'main',font=small,fill='#8ed0bd')
    d.rectangle((0,59,W,109),fill='#0d1520');d.text((25,77),'◈ App.tsx  •',font=small,fill='#a9cdfb');d.text((180,77),'styles.css',font=small,fill='#6e849f');d.text((788,77),'TypeScript React',font=small,fill='#6e849f')
    d.line((0,109,W,109),fill='#29374a')
    reveal=max(0,t-.8)*75
    consumed=0
    for i,line in enumerate(lines):
        y=145+i*29;d.text((30,y),f'{i+1:02}',font=small,fill='#58728d')
        n=max(0,min(len(line),int(reveal-consumed)));consumed+=len(line)+12
        x=76
        for token in re.findall(r'"[^"]*"|\x27[^\x27]*\x27|\b\w+\b|[^\w]',line[:n]):
            color='#cbd7e9'
            if token in ['import','from','export','default','function','return']:color='#c69cf7'
            elif token.startswith(('"',"'")):color='#a6d59a'
            elif token in ['motion','main','Sparkles','h1','p','Studio']:color='#8cd0f2'
            elif token=='className':color='#e5c291'
            elif token.isdigit():color='#edae8d'
            d.text((x,y),token,font=mono,fill=color);x+=d.textlength(token,font=mono)
        if n and n<len(line) and int(t*2)%2==0:d.rectangle((x,y+2,x+2,y+21),fill='#a2bdf0')
    d.line((0,525,W,525),fill='#29374a');d.line((535,525,535,778),fill='#29374a')
    d.text((24,545),'TERMINAL',font=small,fill='#afc1d7');d.text((475,545),'zsh',font=small,fill='#6e849f')
    for i,line in enumerate(terminal):
        if t>8+i*.6:d.text((24,577+i*27),line,font=small,fill='#7fd9b5' if i in [2,4] else '#91a6bd')
    d.rectangle((536,526,W,778),fill='#17212e');d.text((555,545),'◉ localhost:3000',font=small,fill='#8da1ba')
    d.rounded_rectangle((551,581,941,757),radius=10,fill='#eaf0e8' if t>11.5 else '#33404b')
    if t>11.5:
        d.text((575,598),'✳ BEBIN',font=small,fill='#4d7667');d.text((575,624),'Build something beautiful.',font=title,fill='#203b33')
        d.text((575,665),'Your next idea starts here.',font=sans,fill='#698479');d.rounded_rectangle((575,698,754,730),radius=5,fill='#285543');d.text((587,706),'Explore your studio →',font=small,fill='#edf5ee')
    else:d.text((575,645),'Compiling preview…',font=small,fill='#98a8b7')
    d.rectangle((0,779,W,H),fill='#1c3046');d.text((18,793),'✓ No problems',font=small,fill='#a8cae6');d.text((730,793),'UTF-8   TSX   Connected',font=small,fill='#a8cae6')
    # Fade the final frame into the opening frame for a soft looping boundary.
    if t>17:im=Image.blend(im,frame(0),min(1,t-17))
    return im
out=ROOT/'public'/'coding-process.mp4'
proc=subprocess.Popen([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-f','rawvideo','-vcodec','rawvideo','-s',f'{W}x{H}','-pix_fmt','rgb24','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
for i in range(FPS*DURATION):proc.stdin.write(frame(i/FPS).tobytes())
proc.stdin.close();error=proc.stderr.read();assert proc.wait()==0,error.decode()
frame(13).save(ROOT/'public'/'coding-process-poster.jpg',quality=88)
print(f'Created {DURATION}s silent H.264 loop, {out.stat().st_size} bytes')
