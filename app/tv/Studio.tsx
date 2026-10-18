'use client';
import {forwardRef,useEffect} from 'react';
type Props={title:string;source:string;speaking:boolean;demo:boolean;playing:boolean};
const Studio=forwardRef<HTMLCanvasElement,Props>(function Studio({title,source,speaking,demo,playing},ref){
  useEffect(()=>{
    const canvas=typeof ref==='object'&&ref?ref.current:null;const ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
    const c=ctx;let frame=0,animation=0;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function polygon(points:number[][],fill:string){c.fillStyle=fill;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
    function draw(){
      frame++;const bg=c.createLinearGradient(0,0,0,720);bg.addColorStop(0,'#03101d');bg.addColorStop(.6,'#173a52');bg.addColorStop(1,'#030a12');c.fillStyle=bg;c.fillRect(0,0,1280,720);
      const wall=c.createLinearGradient(0,0,1280,0);wall.addColorStop(0,'#092c45');wall.addColorStop(.45,'#155477');wall.addColorStop(1,'#061928');c.fillStyle=wall;c.fillRect(25,115,1230,395);
      c.strokeStyle='#4e8ead55';c.lineWidth=1;for(let x=25;x<1280;x+=75){c.beginPath();c.moveTo(x,115);c.lineTo(x,510);c.stroke();}for(let y=115;y<510;y+=55){c.beginPath();c.moveTo(25,y);c.lineTo(1255,y);c.stroke();}
      c.save();c.translate(360,320);c.strokeStyle='#83c8e943';c.lineWidth=1.5;for(let radius=70;radius<=225;radius+=50){c.beginPath();c.ellipse(0,0,radius,190,0,0,Math.PI*2);c.stroke();}for(let y=-140;y<=140;y+=55){c.beginPath();c.ellipse(0,y,215,35,0,0,Math.PI*2);c.stroke();}c.restore();
      for(const x of [20,540,1240]){const light=c.createLinearGradient(x,0,x+20,0);light.addColorStop(0,'#05101b');light.addColorStop(.5,'#b2d8e6');light.addColorStop(1,'#102536');c.fillStyle=light;c.fillRect(x,85,14,445);}
      polygon([[0,0],[1280,0],[1200,82],[80,82]],'#050d16');c.strokeStyle='#d7ebfa';c.lineWidth=3;c.beginPath();c.moveTo(70,88);c.lineTo(1210,88);c.stroke();c.strokeStyle='#c8233b';c.lineWidth=6;c.beginPath();c.moveTo(95,103);c.lineTo(1185,103);c.stroke();
      for(const x of [170,430,690,950])polygon([[x,17],[x+140,17],[x+115,31],[x-10,31]],'#d9e9f2');
      polygon([[0,510],[1280,510],[1280,720],[0,720]],'#09141f');c.strokeStyle='#49748b';c.lineWidth=2;c.beginPath();c.ellipse(610,597,620,108,0,Math.PI,Math.PI*2);c.stroke();
      c.fillStyle='#c51c38';c.fillRect(47,137,175,32);c.fillStyle='#fff';c.font='bold 16px system-ui';c.fillText('GLOBALDESK  /  TV',58,159);
      // Original artificial presenter with shaded tailoring and a curved studio desk.
      const suit=c.createLinearGradient(190,0,470,0);suit.addColorStop(0,'#111f32');suit.addColorStop(.5,'#3f5267');suit.addColorStop(1,'#111e2f');
      c.fillStyle=suit;c.beginPath();c.moveTo(170,542);c.quadraticCurveTo(176,377,320,375);c.quadraticCurveTo(464,374,483,542);c.fill();
      c.fillStyle='#b78c74';c.fillRect(302,333,43,64);polygon([[281,381],[322,474],[365,381],[349,522],[297,522]],'#e8eef2');polygon([[321,402],[337,422],[325,490],[310,421]],'#a51e36');polygon([[278,376],[314,468],[260,423],[270,409],[248,401]],'#1a2c41');polygon([[367,377],[331,468],[388,423],[374,408],[400,400]],'#1a2c41');
      const face=c.createLinearGradient(255,0,390,0);face.addColorStop(0,'#a7755d');face.addColorStop(.45,'#e7b89a');face.addColorStop(1,'#b88870');c.fillStyle=face;c.beginPath();c.ellipse(324,272,67,89,0,0,Math.PI*2);c.fill();
      c.fillStyle='#162332';c.beginPath();c.moveTo(256,273);c.quadraticCurveTo(241,174,323,171);c.quadraticCurveTo(410,179,389,263);c.lineTo(376,224);c.quadraticCurveTo(315,201,268,240);c.closePath();c.fill();
      c.strokeStyle='#392e2b';c.lineWidth=3;for(const x of [295,350]){c.beginPath();c.moveTo(x-9,253);c.lineTo(x+9,251);c.stroke();}c.fillStyle='#1b2630';for(const x of [295,351]){c.beginPath();c.ellipse(x,265,4.5,3,0,0,Math.PI*2);c.fill();}c.strokeStyle='#a2735a';c.lineWidth=2;c.beginPath();c.moveTo(325,269);c.lineTo(317,295);c.lineTo(329,298);c.stroke();c.fillStyle='#713e3d';c.beginPath();c.ellipse(325,320,11,2.8,0,0,Math.PI*2);c.fill();if(speaking){c.fillStyle='#10b981';for(let i=0;i<7;i++){const bh=3+Math.abs(Math.sin(frame*0.2+i))*10;c.fillRect(305+i*6,515-bh,4,bh);}}
      c.fillStyle='#d1a98e';c.beginPath();c.ellipse(260,510,36,12,-.1,0,Math.PI*2);c.ellipse(387,510,36,12,.1,0,Math.PI*2);c.fill();
      c.fillStyle='#101820';c.beginPath();c.ellipse(335,545,290,49,0,0,Math.PI*2);c.fill();c.strokeStyle='#adbdc8';c.lineWidth=5;c.stroke();polygon([[70,550],[595,550],[545,652],[124,652]],'#091724');polygon([[185,558],[467,558],[443,650],[212,650]],'#15405b');c.fillStyle='#d5223d';c.fillRect(297,575,57,51);c.fillStyle='#fff';c.font='bold 40px Georgia';c.fillText('G',310,614);
      c.fillStyle='#071725ee';c.fillRect(578,145,654,373);c.fillStyle='#d52340';c.fillRect(578,145,5,373);c.fillStyle='#c1d4df';c.font='bold 17px system-ui';c.fillText(demo?'DEMONSTRATION EDITION':'THE GLOBAL BRIEFING',608,187);
      c.fillStyle='#fff';c.font='bold 34px system-ui';let line='',y=242,lines=0;for(const word of title.split(/\s+/)){const next=line+word+' ';if(c.measureText(next).width>575&&line){c.fillText(line,608,y);y+=44;lines++;line=word+' ';if(lines===5){line+='…';break;}}else line=next;}c.fillText(line,608,y);c.fillStyle='#a5bdcf';c.font='17px system-ui';c.fillText(source.length>62?source.slice(0,59)+'…':source,608,486);
      c.fillStyle='#bc1734';c.fillRect(0,652,271,43);c.fillStyle='#fff';c.font='bold 21px system-ui';c.fillText(demo?'FICTIONAL DEMO':'GLOBAL BRIEFING',22,680);c.fillStyle='#f1f3f5';c.fillRect(271,652,1009,43);c.fillStyle='#122331';c.font='bold 22px system-ui';c.fillText('THE WORLD. IN CONTEXT.',296,681);c.fillStyle='#080d15';c.fillRect(0,695,1280,25);c.fillStyle='#b6c6d3';c.font='12px system-ui';c.fillText(`NOVA · ARTIFICIAL PRESENTER     /     ${playing?'BULLETIN PLAYING':'BULLETIN READY'}     /     ${speaking?'SYNTHETIC NARRATION':'CAPTIONS'}     /     NOT A LIVE TV STREAM`,22,712);
      animation=requestAnimationFrame(draw);
    }
    draw();return()=>cancelAnimationFrame(animation);
  },[title,source,speaking,demo,playing,ref]);
  return <canvas ref={ref} width={1280} height={720} className="tv-canvas" role="img" aria-label="Nova in the GlobalDesk digital broadcast studio. Artificial animated presenter; headline captions are below."/>;
});
export default Studio;
