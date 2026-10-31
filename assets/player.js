/* Background music player, shared by every page. Keeps playing across pages by saving its place and resuming. */
(function(){
  const me=document.currentScript,compact=!!(me&&me.hasAttribute('data-compact'));
  const TRACKS=[{src:'assets/audio/background.mp3',title:'Make Believe',artist:'Mother Mother'}];
  const GLITCH_CHANCE=0.2;
  const KEY='hhs-music',SKEY='hhs-music-state';
  const css=`
.mp{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:50;font-family:Inter,system-ui,sans-serif}
.mp.compact{left:auto;right:12px;bottom:calc(16px + env(safe-area-inset-bottom,0px))}
@media (max-width:820px){.mp.compact{bottom:calc(var(--sheet,0px) + 14px + env(safe-area-inset-bottom,0px))}}
body.sheet-full .mp.compact{display:none}
.mp-bar{display:flex;align-items:center;gap:10px;background:#0f2a47;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:6px 14px 6px 6px;box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:calc(100vw - 24px)}
.mp.compact .mp-bar{padding:5px 8px 5px 5px;gap:6px}
.mp-play{width:44px;height:44px;border-radius:50%;border:0;background:var(--gold,#f2b722);color:#000;display:grid;place-items:center;cursor:pointer;flex:none;padding:0;min-height:0}
.mp.compact .mp-play{width:40px;height:40px}
.mp-play svg{width:18px;height:18px;fill:currentColor}
.mp-meta{display:flex;flex-direction:column;min-width:0;line-height:1.2;text-align:left;background:none;border:0;color:inherit;cursor:pointer;padding:0;min-height:0;font:inherit}
.mp-meta b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mp-meta small{font-size:11px;opacity:.75}
.mp-vol{width:70px;accent-color:var(--gold,#f2b722)}
.mp-i{display:none;width:30px;height:30px;border-radius:50%;border:1.5px solid rgba(255,255,255,.55);background:none;color:#fff;font:italic 700 15px Georgia,serif;cursor:pointer;padding:0;min-height:0;align-items:center;justify-content:center}
.mp.compact .mp-meta,.mp.compact .mp-vol{display:none}
.mp.compact .mp-i{display:inline-flex}
.mp-info{position:absolute;left:0;bottom:calc(100% + 10px);width:min(320px,calc(100vw - 24px));background:#fff;color:#1a1a1a;border-radius:14px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-size:14px;line-height:1.45}
.mp.compact .mp-info{left:auto;right:0}
.mp-info[hidden]{display:none}
.mp-info h3{margin:0 0 4px;font:700 16px/1.2 "Playfair Display",Georgia,serif}
.mp-info p{margin:0 0 8px}
.mp-info .tag{display:inline-block;background:#0f2a47;color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
.mp-info .x{position:absolute;top:2px;right:6px;border:0;background:none;font-size:22px;width:36px;height:36px;cursor:pointer;color:#555;padding:0;min-height:0}
@media (max-width:520px){.mp-vol{display:none}}
/* the glitched song */
.mp.tainted .mp-meta{text-shadow:1.5px 0 rgba(255,36,51,.8),-1.5px 0 rgba(25,224,230,.8)}
.mp.glitching .mp-bar{animation:mpg-bar .9s steps(1) infinite}
.mp.glitching .mp-meta b{animation:mpg-txt .35s steps(2) infinite}
.mp-info.eerie{background:#0b0614;color:#fff;border:1px solid #ff2433;overflow:hidden}
.mp-info.eerie .tag{background:#ff2433;color:#000}
.mp-info.eerie .x{color:#fff}
.mp-info.eerie h3{text-shadow:2px 0 #ff2433,-2px 0 #19e0e6;animation:mpg-txt .9s steps(1) infinite}
.mp-info.eerie p{font:italic 500 17px/1.4 "Playfair Display",Georgia,serif;text-shadow:1.5px 0 rgba(255,36,51,.85),-1.5px 0 rgba(25,224,230,.85);animation:mpg-shake 2.2s steps(1) infinite}
@keyframes mpg-bar{0%{transform:translateX(0);filter:drop-shadow(3px 0 0 rgba(255,36,51,.8)) drop-shadow(-3px 0 0 rgba(25,224,230,.8))}25%{transform:translateX(-4px) skewX(-3deg)}50%{transform:translateX(5px);filter:drop-shadow(-4px 0 0 rgba(255,36,51,.8)) drop-shadow(4px 0 0 rgba(25,224,230,.8))}75%{transform:translateX(-2px) skewX(2deg)}}
@keyframes mpg-txt{0%{transform:translateX(0)}50%{transform:translateX(-3px);opacity:.7}100%{transform:translateX(3px)}}
@keyframes mpg-shake{0%,88%,100%{transform:none}90%{transform:translateX(-4px)}94%{transform:translateX(5px) skewX(-4deg)}}
@media (prefers-reduced-motion:reduce){.mp.glitching .mp-bar,.mp.glitching .mp-meta b,.mp-info.eerie h3,.mp-info.eerie p{animation:none}}`;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  const box=document.createElement('div');box.className='mp'+(compact?' compact':'');box.id='mp';
  box.innerHTML=`<div class="mp-info" id="mpInfo" hidden role="dialog" aria-label="About the music"></div>
  <div class="mp-bar">
    <button class="mp-play" id="mpPlay" type="button" aria-label="Play music"><svg id="mpIc" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg></button>
    <button class="mp-meta" id="mpMeta" type="button" aria-label="About this song"><b id="mpT"></b><small id="mpA"></small></button>
    <button class="mp-i" id="mpI" type="button" aria-label="About this song">i</button>
    <input class="mp-vol" id="mpVol" type="range" min="0" max="100" value="18" aria-label="Volume">
  </div>
  <audio id="mpAudio" preload="auto"></audio>`;
  document.body.appendChild(box);
  const $=id=>document.getElementById(id);
  const a=$('mpAudio'),btn=$('mpPlay'),ic=$('mpIc'),vol=$('mpVol'),info=$('mpInfo'),T=$('mpT'),A=$('mpA');
  const PLAY='M7 4l13 8-13 8z',PAUSE='M6 4h4v16H6zM14 4h4v16h-4z';
  let want=true;try{want=localStorage.getItem(KEY)!=='off';}catch(e){}
  let S={t:0,ts:0,vol:18,i:0,g:false};try{Object.assign(S,JSON.parse(localStorage.getItem(SKEY)||'{}'));}catch(e){}
  let idx=Math.min(S.i||0,TRACKS.length-1),tainted=!!S.g,glitchTimer=null,vlevel=Math.max(0,Math.min(100,+S.vol||18));
  vol.value=vlevel;a.volume=vlevel/100;
  const save=()=>{try{localStorage.setItem(SKEY,JSON.stringify({t:a.currentTime||0,ts:Date.now(),vol:vlevel,i:idx,g:tainted}));}catch(e){}};
  const setWant=v=>{try{localStorage.setItem(KEY,v?'on':'off');}catch(e){}};
  const paint=()=>{ic.firstElementChild.setAttribute('d',a.paused?PLAY:PAUSE);btn.setAttribute('aria-label',a.paused?'Play music':'Pause music');};
  const label=()=>{const tr=TRACKS[idx];T.textContent=tr.title;A.innerHTML=tr.artist+' &middot; tap for info';box.classList.toggle('tainted',tainted);};
  function infoHtml(){
    if(tainted){info.classList.add('eerie');return '<button class="x" id="mpX" type="button" aria-label="Close">&times;</button><span class="tag">Unknown source</span><p>The voice of one, for the ears of millions.</p>';}
    info.classList.remove('eerie');
    return '<button class="x" id="mpX" type="button" aria-label="Close">&times;</button><span class="tag">Friday, December 10</span><h3>Battle of the Bands</h3><p>The annual <b>Battle of the Bands</b> is set for Friday, December 10, in the Hutchinson High gym. Sign-ups open soon. Ask around in the band room.</p>';}
  function showInfo(){info.innerHTML=infoHtml();info.hidden=false;$('mpX').onclick=()=>{info.hidden=true;};}
  const toggleInfo=()=>{if(info.hidden)showInfo();else info.hidden=true;};
  $('mpMeta').onclick=toggleInfo;$('mpI').onclick=toggleInfo;
  /* the glitch: stutter, speed wobble and a burst of static, then back to normal */
  let ac=null;
  function staticBurst(ms){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();
    const n=Math.floor(ac.sampleRate*ms/1000),buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(Math.random()<.55?1:.25);
    const src=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=2400;f.Q.value=.6;src.buffer=buf;g.gain.value=.0;
    const now=ac.currentTime,lv=Math.min(.16,.05+vlevel/100*.3);for(let k=0;k<12;k++){g.gain.setValueAtTime(Math.random()<.6?lv:0,now+k*ms/12000);}g.gain.setValueAtTime(0,now+ms/1000);
    src.connect(f);f.connect(g);g.connect(ac.destination);src.start();}catch(e){}}
  function glitch(ms){
    ms=ms||2200;clearInterval(glitchTimer);box.classList.add('glitching');tainted=true;label();
    const base=vlevel/100;staticBurst(ms*.8);let t0=Date.now();
    glitchTimer=setInterval(()=>{const left=ms-(Date.now()-t0);
      if(left<=0){clearInterval(glitchTimer);a.playbackRate=1;a.volume=base;box.classList.remove('glitching');save();return;}
      try{if(Math.random()<.55)a.currentTime=Math.max(0,a.currentTime-(.08+Math.random()*.3));a.playbackRate=Math.random()<.5?.7+Math.random()*.2:1+Math.random()*.25;a.volume=Math.random()<.35?base*.2:base;}catch(e){}
      const b=T;if(Math.random()<.6){const s=TRACKS[idx].title.split('').map(c=>Math.random()<.4?'#%&?/'[Math.floor(Math.random()*5)]:c).join('');b.textContent=s;}else b.textContent=TRACKS[idx].title;},110);
    setTimeout(label,ms+50);}
  function startTrack(i,roll){
    idx=(i+TRACKS.length)%TRACKS.length;a.src=TRACKS[idx].src;tainted=false;label();
    const go=()=>{a.play().then(()=>{setWant(true);if(roll&&Math.random()<GLITCH_CHANCE)glitch();}).catch(()=>{});};
    if(a.readyState>0)go();else a.addEventListener('canplay',go,{once:true});}
  a.addEventListener('ended',()=>startTrack(idx+1,true));
  btn.onclick=()=>{if(a.paused){a.play().then(()=>setWant(true)).catch(()=>{});}else{a.pause();setWant(false);}};
  a.addEventListener('play',paint);a.addEventListener('pause',paint);
  vol.oninput=()=>{vlevel=+vol.value;a.volume=vlevel/100;save();};
  /* resume where the last page left off */
  a.src=TRACKS[idx].src;label();
  const resume=()=>{const away=S.ts?(Date.now()-S.ts)/1000:0;let t=(S.t||0)+(want&&away<20?away:0);if(a.duration&&isFinite(a.duration))t%=a.duration;try{a.currentTime=t;}catch(e){}};
  a.addEventListener('loadedmetadata',resume,{once:true});
  if(want){a.play().catch(()=>{const go=()=>{a.play().catch(()=>{});['pointerdown','keydown','touchstart'].forEach(t=>removeEventListener(t,go,true));};['pointerdown','keydown','touchstart'].forEach(t=>addEventListener(t,go,true));});}
  let last=0;a.addEventListener('timeupdate',()=>{const n=Date.now();if(n-last>1000){last=n;save();}});
  addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  window.__mp={glitch,next:r=>startTrack(idx+1,r),audio:a,state:()=>({tainted,idx}),setTainted:v=>{tainted=v;label();}};
})();
