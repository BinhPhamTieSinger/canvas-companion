// CSS colors only: never download or sample a user's background/course images.
export function parseColor(value){
 if(typeof value!=='string')return null;const s=value.trim();if(s==='transparent')return [0,0,0,0];
 const hex=s.match(/^#([a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i);
 if(hex){let h=hex[1];if(h.length===3)h=[...h].map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).concat(h.length===8?parseInt(h.slice(6),16)/255:1);}
 const rgb=s.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
 if(rgb){const c=rgb.slice(1,4).map(Number);return c.every(v=>v<=255)?[...c,Math.min(1,Number(rgb[4]??1))]:null;}
 const srgb=s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
 return srgb?[...srgb.slice(1,4).map(v=>Math.max(0,Math.min(1,Number(v)))*255),Math.min(1,Number(srgb[4]??1))]:null;
}
export function composite(front,back){const alpha=front[3]??1;return front.slice(0,3).map((v,i)=>v*alpha+back[i]*(1-alpha));}
export function luminance(rgb){const c=rgb.slice(0,3).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function readableInk(background,current,{link=false}={}){
 if(current&&contrastRatio(composite(current,background),background)>=4.5)return null;
 const candidates=(link?['#9cdcfe','#145582']:['#eef3fa','#14243b']).map(hex=>({hex,rgb:parseColor(hex)}));
 const best=candidates.sort((a,b)=>contrastRatio(b.rgb,background)-contrastRatio(a.rgb,background))[0];
 // Black/white cover middle luminances where the preferred brand colors fall short.
 if(contrastRatio(best.rgb,background)>=4.5)return best.hex;
 return contrastRatio([0,0,0],background)>contrastRatio([255,255,255],background)?'#000000':'#ffffff';
}
export function effectiveBackground(node,view,fallback=[21,26,34]){
 const layers=[];
 for(let parent=node;parent;parent=parent.parentElement){const c=parseColor(view.getComputedStyle(parent).backgroundColor);if(c){layers.push(c);if(c[3]===1)break;}}
 return layers.reverse().reduce((back,front)=>composite(front,back),fallback);
}
export function controlTheme(foreground,transparent=false){const c=parseColor(foreground);return transparent||!c||luminance(c)>.35?'dark':'light';}
