import {BUILD_ID,SURVEY_RETURN_URL} from './config.js?v=november-20261104';
import {parseCondition,cueIndexAt,captionPosition,validateRecording} from './playback-core.js?v=november-20261104';
import {createWeatherMotion} from './scene-motion.js?v=november-20261104';
const get=id=>document.getElementById(id);
const app=get('app'),audio=get('narration'),dialog=get('pull-over-dialog');
let ready=false,started=false,finished=false,recording=null,captionIndex=-1,raf=0,blobURL=null,motion=null;
const pauseReasons=new Set();
let technicalFailure=false;
app.dataset.build=BUILD_ID;
function state(value){app.dataset.state=value;}
function error(message){technicalFailure=true;audio.pause();state('error');get('error-message').textContent=message;get('technical-error').hidden=false;get('retry').textContent=ready?'Resume introduction':'Reload page';}
async function loadJSON(file){const r=await fetch(file,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('A required file could not load. Please check your connection and try again.');return r.json();}
async function loadImage(id,src,alt){const img=get(id);img.alt=alt;img.src=src;await img.decode();}
function alignCaptions(smooth=false){
 const viewport=get('caption-viewport'),content=get('captions'),first=content.firstElementChild,last=content.lastElementChild;
 if(!last||!viewport.clientHeight)return;
 const half=viewport.clientHeight/2;
 content.style.paddingTop=`${half}px`;content.style.paddingBottom=`${half}px`;
 const pos=captionPosition(first.offsetTop,last.offsetTop+last.offsetHeight,viewport.clientHeight);
 viewport.dataset.overflow=String(pos.overflow);
 viewport.scrollTo({top:pos.top,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
}
function syncCaptions(){
 if(!started||!recording)return;
 const index=cueIndexAt(audio.currentTime,recording.cues);
 if(index===captionIndex)return;
 const content=get('captions');
 if(index<captionIndex)content.replaceChildren();
 for(let i=content.children.length;i<=index;i++) {const p=document.createElement('p');p.className='taxi-caption';p.textContent=recording.cues[i].text;content.append(p);}
 for(let i=0;i<content.children.length;i++)content.children[i].dataset.current=String(i===index);
 const animate=captionIndex>=0;captionIndex=index;
 requestAnimationFrame(()=>alignCaptions(animate));
}
function tick(){syncCaptions();if(!audio.paused&&!audio.ended)raf=requestAnimationFrame(tick);else raf=0;}
function play(){
 if(!started||finished||technicalFailure||pauseReasons.size)return;
 // This call runs directly inside the Continue/OK gesture. No asynchronous load before it.
 const promise=audio.play();state('playing');
 promise.then(()=>{if(pauseReasons.size||technicalFailure){audio.pause();return;}cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);})
 .catch(e=>{if(e.name==='AbortError'&&(pauseReasons.size||finished))return;error('The audio could not start. Check your sound settings, then select Resume introduction.');});
}
function pause(reason){pauseReasons.add(reason);if(started&&!finished&&!technicalFailure){audio.pause();state('paused');}}
function resume(reason){pauseReasons.delete(reason);if(started&&!finished&&!technicalFailure&&!pauseReasons.size)play();}
get('continue').addEventListener('click',()=>{
 if(!ready||started)return;
 started=true;get('intro-page').hidden=true;get('display-page').hidden=false;
 get('intro-instruction').hidden=true;get('continue').hidden=true;
 get('caption-viewport').focus({preventScroll:true});motion.start();syncCaptions();play();
});
get('pull-over').addEventListener('click',()=>{pause('dialog');dialog.showModal();});
// Resume directly in the OK/Escape gesture; close event covers other native close paths.
function closeDialog(){dialog.close();resume('dialog');}
get('pull-over-dialog').querySelector('form').addEventListener('submit',e=>{e.preventDefault();closeDialog();});
get('pull-over-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
dialog.addEventListener('close',()=>{if(pauseReasons.has('dialog'))resume('dialog');});
get('retry').addEventListener('click',()=>{if(!ready){location.reload();return;}get('technical-error').hidden=true;technicalFailure=false;play();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('hidden');else resume('hidden');});
audio.addEventListener('timeupdate',syncCaptions);
audio.addEventListener('ended',()=>{
 if(!started||technicalFailure)return;
 finished=true;cancelAnimationFrame(raf);syncCaptions();state('finished');get('finish-notice').hidden=false;
});
audio.addEventListener('error',()=>{if(ready)error('The recording could not play. Please check your connection and try again.');});
new ResizeObserver(()=>requestAnimationFrame(()=>alignCaptions())).observe(get('caption-viewport'));
get('return-button').addEventListener('click',()=>{
 if(!finished)return;
 if(SURVEY_RETURN_URL){location.assign(SURVEY_RETURN_URL);return;}
 get('return-help').hidden=false;
});
window.addEventListener('pagehide',()=>{audio.pause();motion?.stop();cancelAnimationFrame(raf);});
window.addEventListener('pageshow',e=>{if(e.persisted&&started&&!finished){motion?.start();resume('hidden');}});
async function initialize(){
 try{
  const stimuli=await loadJSON('./stimuli.json?v='+BUILD_ID);
  const selected=parseCondition(location.search,stimuli.conditions);
  if(!selected){get('invalid-link').hidden=false;return;}
  app.hidden=false;app.dataset.condition=selected.id;
  document.body.dataset.risk=selected.risk;document.body.dataset.tone=selected.tone;document.body.dataset.audioMode='recorded';
  const night=selected.risk==='high',theme=night?'night':'day',key=`${selected.control?'present':'absent'}-${selected.tone}`;
  app.dataset.script=key;
  get('pull-over').hidden=!selected.control;
  get('clock').textContent=night?'7:30 PM':'11:30 AM';get('clock').dateTime=night?'19:30':'11:30';
  get('weather-label').textContent=night?'Rain':'Sunny';
  get('weather-icon').innerHTML=night?'<path d="M4 14a4 4 0 1 1 1-7 6 6 0 0 1 11-1 4 4 0 0 1 3 8"/><path d="m8 15-1 3m6-3-1 3m6-3-1 3m-6 1-1 2"/>':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
  const images=Promise.all([
   loadImage('intro-image',`./assets/scenes/intro-${theme}.webp`,`Rear-seat view of a parked car, an empty driver seat, passenger display mounted behind the center console, and ${night?'rainy nighttime':'sunny daytime'} street.`),
   loadImage('window-image',`./assets/scenes/window-${theme}.webp`,`${night?'Rainy night':'Sunny daytime'} street through the window of the parked car.`),
   loadImage('route-image',`./assets/maps/route-${theme}.svg`,`${night?'Night':'Day'} navigation map with the same planned route and no place names.`)
  ]);
  // Observe early failures while the recording manifest is being fetched.
  images.catch(()=>{});
  const manifest=await loadJSON('./assets/audio/manifest.json?v='+BUILD_ID);
  recording=manifest.scripts[key];
  if(!validateRecording(recording,stimuli.scripts[key]))throw new Error('The recording and transcript do not match. Please contact the study team.');
  const response=await fetch(recording.file+'?v='+BUILD_ID,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error('The recording could not load. Please check your connection and try again.');
  const blob=await response.blob();blobURL=URL.createObjectURL(blob);
  const audioReady=new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{clean();reject(new Error('The recording took too long to load. Please try again.'));},30000);
   const clean=()=>{clearTimeout(timeout);audio.removeEventListener('canplay',onReady);audio.removeEventListener('error',onError);};
   const onReady=()=>{clean();Math.abs(audio.duration-recording.duration)<.2?resolve():reject(new Error('The recording is incomplete. Please reload the page.'));};
   const onError=()=>{clean();reject(new Error('This browser could not load the audio. Please try another desktop browser.'));};
   audio.addEventListener('canplay',onReady);audio.addEventListener('error',onError);audio.src=blobURL;audio.load();
  });
  await Promise.all([images,audioReady]);
  if(SURVEY_RETURN_URL&&new URL(SURVEY_RETURN_URL).protocol!=='https:')throw new Error('The survey return address must use HTTPS.');
  motion=createWeatherMotion(get('weather-motion'),selected.risk);
  ready=true;state('ready');get('continue').textContent='Continue';get('continue').disabled=false;
 }catch(e){error(e.message||'The experience could not load. Please try again.');}
}
initialize();
