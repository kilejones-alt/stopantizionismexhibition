(function(){
  const AUDIO_PREF='stopazAudioPreference';
  const AUDIO_TIME='stopazAudioTime';
  const audioEl=document.getElementById('bg-audio');
  const audioButton=document.getElementById('audio-btn');
  const curtain=document.createElement('div');
  curtain.id='continuity-curtain';
  curtain.setAttribute('aria-hidden','true');
  document.body.prepend(curtain);
  const style=document.createElement('style');
  style.textContent=`
    #continuity-curtain{position:fixed;inset:0;z-index:2500;pointer-events:none;background:linear-gradient(115deg,rgba(15,15,18,.98),rgba(27,27,32,.98));opacity:1;transform:scaleY(1);transform-origin:top;transition:opacity .85s cubic-bezier(.16,1,.3,1),transform .85s cubic-bezier(.16,1,.3,1)}
    body.continuity-ready #continuity-curtain{opacity:0;transform:scaleY(0)}
    body.continuity-leaving #continuity-curtain{opacity:1;transform:scaleY(1);transform-origin:bottom}
    body.continuity-leaving #gallery{opacity:0;transform:translateY(-12px);filter:blur(5px)}
    #gallery{transition:opacity .72s cubic-bezier(.16,1,.3,1),transform .72s cubic-bezier(.16,1,.3,1),filter .72s cubic-bezier(.16,1,.3,1)}
    .audio-btn.continuity-playing{color:#fff;text-shadow:0 0 14px rgba(255,255,255,.25)}
  `;
  document.head.appendChild(style);
  function lang(){return document.documentElement.lang||'en'}
  function updateButton(){
    if(!audioButton||!audioEl)return;
    const playing=!audioEl.paused;
    const labels={en:playing?'AUDIO: ON':'AUDIO: OFF',he:playing?'שמע: מופעל':'שמע: כבוי',ru:playing?'ЗВУК: ВКЛ':'ЗВУК: ВЫКЛ'};
    audioButton.textContent=labels[lang()]||labels.en;
    audioButton.classList.toggle('continuity-playing',playing);
  }
  function save(){if(audioEl&&Number.isFinite(audioEl.currentTime))sessionStorage.setItem(AUDIO_TIME,String(audioEl.currentTime))}
  function restore(){
    if(!audioEl)return;
    const t=parseFloat(sessionStorage.getItem(AUDIO_TIME)||'0');
    if(Number.isFinite(t)&&t>0){try{audioEl.currentTime=t}catch(_e){}}
  }
  async function play(persist){
    if(!audioEl)return false;
    if(persist)localStorage.setItem(AUDIO_PREF,'on');
    try{await audioEl.play();updateButton();return true}catch(_e){updateButton();return false}
  }
  function pause(persist){
    if(!audioEl)return;
    save();audioEl.pause();if(persist)localStorage.setItem(AUDIO_PREF,'off');updateButton();
  }
  window.toggleAudio=function(){if(!audioEl)return;if(audioEl.paused)play(true);else pause(true)};
  const originalSetLanguage=window.setLanguage;
  window.setLanguage=function(selected){
    if(typeof originalSetLanguage==='function')originalSetLanguage(selected);
    localStorage.setItem('stopazLanguage',selected);
    updateButton();
  };
  function firstInteraction(e){
    if(e.target.closest&&e.target.closest('#audio-btn'))return;
    if(localStorage.getItem(AUDIO_PREF)==='off')return;
    play(true);
    removeEventListener('pointerdown',firstInteraction,true);
    removeEventListener('keydown',firstInteraction,true);
  }
  if(audioEl){
    audioEl.volume=.46;
    restore();
    audioEl.addEventListener('play',updateButton);
    audioEl.addEventListener('pause',updateButton);
    setInterval(()=>{if(!audioEl.paused)save()},1500);
    const savedLanguage=localStorage.getItem('stopazLanguage');
    if(savedLanguage&&typeof originalSetLanguage==='function')originalSetLanguage(savedLanguage);
    const pref=localStorage.getItem(AUDIO_PREF);
    if(pref==='on')play(false).then(ok=>{if(!ok){addEventListener('pointerdown',firstInteraction,true);addEventListener('keydown',firstInteraction,true)}});
    else if(pref!=='off'){addEventListener('pointerdown',firstInteraction,true);addEventListener('keydown',firstInteraction,true)}
    updateButton();
  }
  addEventListener('pagehide',save);
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href]');
    if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const href=link.getAttribute('href');
    if(!href||href.startsWith('#')||link.target==='_blank'||/^https?:/i.test(href)||href.startsWith('mailto:'))return;
    e.preventDefault();save();document.body.classList.add('continuity-leaving');setTimeout(()=>location.href=href,680);
  });
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.add('continuity-ready')));
})();
