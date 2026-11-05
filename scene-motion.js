// Subtle glass droplets over the approved photograph; no traffic or camera movement.
export function createWeatherMotion(canvas,risk) {
 const ctx=canvas.getContext('2d');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,frame=0,last=0,width=1,height=1,time=0;
 let seed=71423;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const droplets=Array.from({length:48},()=>({x:.08+random()*.88,y:random()*.77,r:.65+random()*1.6,v:3+random()*9,phase:random()*9,moving:random()>.72}));
 function resize(){const b=canvas.getBoundingClientRect();width=b.width;height=b.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);}
 function draw(now){
  if(!active||document.hidden||reduced.matches||risk!=='high'){frame=0;last=0;return;}
  const dt=Math.min((now-(last||now))/1000,.05);last=now;time+=dt;
  ctx.clearRect(0,0,width,height);
  for(const drop of droplets){
   if(drop.moving) {drop.y+=drop.v*dt/Math.max(height,1);if(drop.y>.8)drop.y=-.02;}
   const x=drop.x*width+(drop.moving?Math.sin(time*.7+drop.phase)*.65:0),y=drop.y*height,r=drop.r;
   ctx.save();ctx.translate(x,y);
   if(drop.moving){ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(.3,-r-10);ctx.strokeStyle='rgba(210,222,228,.075)';ctx.lineWidth=.65;ctx.stroke();}
   const grad=ctx.createLinearGradient(-r,-r,r,r*1.6);grad.addColorStop(0,'rgba(226,238,246,.21)');grad.addColorStop(.35,'rgba(20,30,39,.06)');grad.addColorStop(1,'rgba(204,220,232,.16)');
   ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,0,r,r*(drop.moving?1.65:1.16),0,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.arc(-r*.2,-r*.35,r*.5,3.3,5.5);ctx.strokeStyle='rgba(230,242,250,.24)';ctx.lineWidth=.5;ctx.stroke();ctx.restore();
  }
  frame=requestAnimationFrame(draw);
 }
 function restart(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(active&&!document.hidden&&!reduced.matches&&risk==='high')frame=requestAnimationFrame(draw);}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 document.addEventListener('visibilitychange',restart);reduced.addEventListener('change',restart);
 return {start(){active=true;resize();restart();},stop(){active=false;restart();},destroy(){active=false;restart();observer.disconnect();document.removeEventListener('visibilitychange',restart);reduced.removeEventListener('change',restart);}};
}
