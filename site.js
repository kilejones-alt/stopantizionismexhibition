'use strict';

let currentLang = localStorage.getItem('stopazLanguage') || 'en';
let isPlaying = false;
const STREAM_SPEED_TITLE = 42;
const STREAM_SPEED_BODY = 26;
const pageCurtain = document.createElement('div');
pageCurtain.id = 'page-curtain';
pageCurtain.setAttribute('aria-hidden','true');
document.body.prepend(pageCurtain);

/* AMBIENT LIGHT */
const ambientLight = document.getElementById('ambient-light');
let targetX = innerWidth / 2, targetY = innerHeight / 2;
let currentX = targetX, currentY = targetY;
addEventListener('mousemove', e => { targetX = e.clientX; targetY = e.clientY; }, {passive:true});
function animateAmbient(){
  if(ambientLight){
    currentX += (targetX-currentX)*.04;
    currentY += (targetY-currentY)*.04;
    ambientLight.style.setProperty('--cursor-x', currentX+'px');
    ambientLight.style.setProperty('--cursor-y', currentY+'px');
  }
  requestAnimationFrame(animateAmbient);
}
animateAmbient();

/* TEXT STREAMING */
function textFor(el, lang=currentLang){ return el.getAttribute('data-'+lang) || el.textContent || ''; }
function stopStreaming(el){
  if(el && el.typeTimer){ clearTimeout(el.typeTimer); el.typeTimer = null; }
  if(el) el.classList.remove('typing-caret');
}
function streamWords(el, text, speed=STREAM_SPEED_BODY, delay=0){
  if(!el || !text) return Promise.resolve();
  stopStreaming(el);
  el.textContent = '';
  el.classList.add('typing-caret');
  const letters = Array.from(text);
  let index = 0;
  return new Promise(resolve => {
    const tick = () => {
      if(index < letters.length){
        el.textContent += letters[index++];
        const punctuation = /[.,;:!?—]/.test(letters[index-1]) ? 55 : 0;
        el.typeTimer = setTimeout(tick, speed + punctuation);
      } else {
        el.classList.remove('typing-caret');
        el.dataset.streamed = '1';
        resolve();
      }
    };
    el.typeTimer = setTimeout(tick, delay);
  });
}
function markStreamTargets(){
  document.querySelectorAll('.era-title,.exhibit-title,.exhibit-meta strong,.exhibit-meta span,.info-block h3,.info-block p,.placeholder-badge').forEach(el => el.classList.add('stream-text'));
  document.querySelectorAll('.stream-text').forEach(el => {
    if(!el.dataset.originalText) el.dataset.originalText = el.textContent.trim();
  });
}
function resetStream(el){ stopStreaming(el); el.textContent=''; delete el.dataset.streamed; }
function streamElement(el, delay=0, speed){
  const text = textFor(el);
  return streamWords(el, text, speed || (el.matches('h1,h2,.gallery-eyebrow,.era-title,.exhibit-title') ? STREAM_SPEED_TITLE : STREAM_SPEED_BODY), delay);
}
function streamHeader(){
  document.querySelectorAll('.home-intro .stream-text,.gallery-heading .stream-text').forEach((el,i)=>streamElement(el, i*180, STREAM_SPEED_TITLE));
}
function revealEra(card, index=0){
  if(card.dataset.revealed) return;
  card.dataset.revealed='1';
  setTimeout(()=>card.classList.add('pop-in'), 120 + index*145);
  const title=card.querySelector('.era-title');
  if(title) setTimeout(()=>streamElement(title,0,34), 420 + index*145);
}
function revealExhibit(card, index=0){
  if(card.dataset.revealed) return;
  card.dataset.revealed='1';
  setTimeout(()=>card.classList.add('pop-in'), 80 + index*120);
  const title=card.querySelector('.exhibit-title');
  if(title) setTimeout(()=>streamElement(title,0,36), 360 + index*120);
  const metaTargets=card.querySelectorAll('.exhibit-meta .stream-text');
  metaTargets.forEach((el,i)=>setTimeout(()=>streamElement(el,0,24), 620 + index*120 + i*100));
  card.querySelectorAll('.info-block').forEach((block,i)=>{
    setTimeout(()=>{
      block.classList.add('pop-in');
      const heading=block.querySelector('h3');
      const para=block.querySelector('p');
      if(heading) streamElement(heading,0,25);
      if(para) streamElement(para,160,24);
    }, 900 + index*120 + i*340);
  });
  const badge=card.querySelector('.placeholder-badge');
  if(badge) setTimeout(()=>streamElement(badge,0,24), 2050 + index*120);
}

const revealObserver = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting) return;
    if(entry.target.classList.contains('era-card')) revealEra(entry.target,[...document.querySelectorAll('.era-card')].indexOf(entry.target));
    if(entry.target.classList.contains('exhibit-card')) revealExhibit(entry.target,[...document.querySelectorAll('.exhibit-card')].indexOf(entry.target));
  });
},{threshold:.11,rootMargin:'0px 0px -45px 0px'});

/* AUDIO: FIRST INTERACTION START + CONTINUITY BETWEEN PAGES */
const bgAudio = document.getElementById('bg-audio');
const audioBtn = document.getElementById('audio-btn');
const AUDIO_PREF='stopazAudioPreference';
const AUDIO_TIME='stopazAudioTime';
if(bgAudio){ bgAudio.volume=.46; }
function updateAudioBtnText(){
  if(!audioBtn) return;
  const labels={
    en:isPlaying?'AUDIO: ON':'AUDIO: OFF',
    he:isPlaying?'שמע: מופעל':'שמע: כבוי',
    ru:isPlaying?'ЗВУК: ВКЛ':'ЗВУК: ВЫКЛ'
  };
  audioBtn.textContent=labels[currentLang];
  audioBtn.classList.toggle('is-playing',isPlaying);
}
function saveAudioPosition(){
  if(bgAudio && Number.isFinite(bgAudio.currentTime)) sessionStorage.setItem(AUDIO_TIME,String(bgAudio.currentTime));
}
function restoreAudioPosition(){
  if(!bgAudio) return;
  const saved=parseFloat(sessionStorage.getItem(AUDIO_TIME)||'0');
  if(Number.isFinite(saved) && saved>0){
    try{ bgAudio.currentTime=saved; }catch(_e){}
  }
}
async function startAudio(persist=true){
  if(!bgAudio) return false;
  if(persist) localStorage.setItem(AUDIO_PREF,'on');
  try{
    await bgAudio.play();
    isPlaying=true;
    updateAudioBtnText();
    return true;
  }catch(_e){
    isPlaying=false;
    updateAudioBtnText();
    return false;
  }
}
function stopAudio(persist=true){
  if(!bgAudio) return;
  saveAudioPosition();
  bgAudio.pause();
  isPlaying=false;
  if(persist) localStorage.setItem(AUDIO_PREF,'off');
  updateAudioBtnText();
}
function toggleAudio(){
  if(!bgAudio) return;
  if(!bgAudio.paused || isPlaying) stopAudio(true); else startAudio(true);
}
function firstInteractionAudio(e){
  if(e.target.closest && e.target.closest('#audio-btn')) return;
  if(localStorage.getItem(AUDIO_PREF)==='off') return;
  startAudio(true);
  removeEventListener('pointerdown',firstInteractionAudio,true);
  removeEventListener('keydown',firstInteractionAudio,true);
}
function setupAudio(){
  if(!bgAudio) return;
  restoreAudioPosition();
  bgAudio.addEventListener('play',()=>{isPlaying=true;updateAudioBtnText()});
  bgAudio.addEventListener('pause',()=>{isPlaying=false;updateAudioBtnText()});
  setInterval(()=>{if(!bgAudio.paused) saveAudioPosition()},1500);
  const pref=localStorage.getItem(AUDIO_PREF);
  if(pref==='on'){
    startAudio(false).then(ok=>{
      if(!ok){
        addEventListener('pointerdown',firstInteractionAudio,true);
        addEventListener('keydown',firstInteractionAudio,true);
      }
    });
  }else if(pref!== 'off'){
    addEventListener('pointerdown',firstInteractionAudio,true);
    addEventListener('keydown',firstInteractionAudio,true);
  }
  updateAudioBtnText();
}
addEventListener('pagehide',saveAudioPosition);

/* LANGUAGE */
function updateImageHints(){
  const hints={en:'Click to enlarge',he:'לחץ להגדלה',ru:'Увеличить'};
  document.querySelectorAll('.exhibit-image-button').forEach(btn=>btn.dataset.hint=hints[currentLang]);
}
function setLanguage(lang, animate=true){
  currentLang=lang;
  localStorage.setItem('stopazLanguage',lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='he'?'rtl':'ltr';
  ['en','he','ru'].forEach(l=>{const b=document.getElementById('btn-'+l);if(b)b.classList.toggle('active',l===lang)});
  updateAudioBtnText();
  updateImageHints();
  document.querySelectorAll('[data-en][data-he][data-ru]').forEach(el=>{
    const text=textFor(el,lang);
    if(!text || el.id==='audio-btn') return;
    if(el.classList.contains('stream-text') && animate && (el.dataset.streamed==='1' || el.closest('.gallery-heading,.home-intro,.pop-in'))){
      streamWords(el,text,el.matches('h1,h2,.gallery-eyebrow,.era-title,.exhibit-title')?34:22);
    }else if(!el.classList.contains('stream-text') || !animate){
      el.textContent=text;
    }
  });
}

/* LIGHTBOX */
function openLightbox(button){
  const img=button.querySelector('img');
  const lb=document.getElementById('lightbox');
  const lbImg=document.getElementById('lightbox-img');
  const cap=document.getElementById('lightbox-caption');
  if(!img||!lb||!lbImg) return;
  lbImg.src=img.currentSrc||img.src;
  lbImg.alt=img.alt;
  if(cap) cap.textContent=img.alt;
  lb.classList.add('active');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  const lb=document.getElementById('lightbox');
  if(lb) lb.classList.remove('active');
  document.body.style.overflow='';
}
addEventListener('keydown',e=>{if(e.key==='Escape')closeLightbox()});

/* SUBTLE CARD TILT */
function setupTilt(){
  if(matchMedia('(hover:hover) and (pointer:fine)').matches===false) return;
  document.querySelectorAll('.era-card,.exhibit-card').forEach(card=>{
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      card.style.setProperty('--ry',(x*2.2)+'deg');
      card.style.setProperty('--rx',(-y*1.6)+'deg');
    });
    card.addEventListener('pointerleave',()=>{
      card.style.setProperty('--ry','0deg');
      card.style.setProperty('--rx','0deg');
    });
  });
}

/* SOPHISTICATED INTERNAL PAGE TRANSITIONS */
function setupPageTransitions(){
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href]');
    if(!link || e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href=link.getAttribute('href');
    if(!href || href.startsWith('#') || link.target==='_blank' || /^https?:/i.test(href) || href.startsWith('mailto:')) return;
    e.preventDefault();
    saveAudioPosition();
    document.body.classList.add('page-leaving');
    setTimeout(()=>{location.href=href},680);
  });
}

/* INITIALIZATION */
addEventListener('DOMContentLoaded',()=>{
  markStreamTargets();
  setLanguage(currentLang,false);
  updateImageHints();
  document.querySelectorAll('.stream-text').forEach(resetStream);
  document.querySelectorAll('.era-card,.exhibit-card').forEach(el=>revealObserver.observe(el));
  setupAudio();
  setupTilt();
  setupPageTransitions();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.body.classList.add('page-ready');
    streamHeader();
  }));
});
