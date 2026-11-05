export function parseCondition(search, conditions) {
 const values = new URLSearchParams(search).getAll('condition');
 return values.length === 1 && Object.hasOwn(conditions,values[0]) ? {id:values[0],...conditions[values[0]]} : null;
}
export function cueIndexAt(time,cues) {
 let index=-1;
 for(let i=0;i<cues.length;i++) {if(time>=cues[i].start)index=i;else break;}
 return index;
}
export function captionPosition(top,bottom,height) {
 const overflow=bottom-top>height-32;
 return {overflow,top:Math.max(0,overflow?bottom-height+16:(top+bottom)/2-height/2)};
}
export function validateRecording(recording,sentences) {
 if(!recording || recording.cues?.length!==sentences.length || !Number.isFinite(recording.duration) || recording.duration<=0) return false;
 return recording.cues.every((cue,i)=>cue.text===sentences[i] && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start>=0 && cue.end>cue.start && cue.end<=recording.duration && (i===0?cue.start===0:cue.start>=recording.cues[i-1].end));
}
