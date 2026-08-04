'use strict';

let currentLang = localStorage.getItem('stopazLanguage') || 'en';
let isPlaying = false;
const STREAM_SPEED_TITLE = 68;
const STREAM_SPEED_LABEL = 48;
const STREAM_SPEED_BODY = 40;
const pageCurtain = document.createElement('div');
pageCurtain.id = 'page-curtain';
pageCurtain.setAttribute('aria-hidden', 'true');
document.body.prepend(pageCurtain);

/* AMBIENT LIGHT — same gliding response as the exhibition */
const ambientLight = document.getElementById('ambient-light');
let targetX = innerWidth / 2;
let targetY = innerHeight / 2;
let currentX = targetX;
let currentY = targetY;
addEventListener('mousemove', event => {
  targetX = event.clientX;
  targetY = event.clientY;
}, { passive: true });
function animateAmbient() {
  if (ambientLight) {
    currentX += (targetX - currentX) * 0.04;
    currentY += (targetY - currentY) * 0.04;
    ambientLight.style.setProperty('--cursor-x', currentX + 'px');
    ambientLight.style.setProperty('--cursor-y', currentY + 'px');
  }
  requestAnimationFrame(animateAmbient);
}
animateAmbient();

/* SLOW, MEASURED LETTER-BY-LETTER REVEALS */
function textFor(element, lang = currentLang) {
  return element.getAttribute('data-' + lang) || element.dataset.originalText || element.textContent || '';
}
function stopStreaming(element) {
  if (element && element.typeTimer) {
    clearTimeout(element.typeTimer);
    element.typeTimer = null;
  }
  if (element) element.classList.remove('typing-caret');
}
function streamWords(element, text, speed = STREAM_SPEED_BODY, delay = 0) {
  if (!element || !text) return Promise.resolve();
  stopStreaming(element);
  element.textContent = '';
  element.classList.add('typing-caret');
  const letters = Array.from(text);
  let index = 0;
  return new Promise(resolve => {
    const tick = () => {
      if (index < letters.length) {
        const character = letters[index++];
        element.textContent += character;
        let pause = speed;
        if (/[,;:]/.test(character)) pause += 70;
        if (/[.!?—]/.test(character)) pause += 120;
        if (character === ' ') pause = Math.max(18, speed * 0.62);
        element.typeTimer = setTimeout(tick, pause);
      } else {
        element.classList.remove('typing-caret');
        element.dataset.streamed = '1';
        resolve();
      }
    };
    element.typeTimer = setTimeout(tick, delay);
  });
}
function markStreamTargets() {
  document.querySelectorAll(
    '.era-title,.exhibit-title,.exhibit-meta strong,.exhibit-meta span,.info-block h3,.info-block p,.placeholder-badge'
  ).forEach(element => element.classList.add('stream-text'));
  document.querySelectorAll('.stream-text').forEach(element => {
    if (!element.dataset.originalText) element.dataset.originalText = element.textContent.trim();
  });
}
function resetStream(element) {
  stopStreaming(element);
  element.textContent = '';
  delete element.dataset.streamed;
}
function speedFor(element) {
  if (element.matches('h1,h2,.gallery-title,.era-title,.exhibit-title')) return STREAM_SPEED_TITLE;
  if (element.matches('.home-kicker,.gallery-eyebrow,.exhibit-meta strong,.info-block h3,.placeholder-badge')) return STREAM_SPEED_LABEL;
  return STREAM_SPEED_BODY;
}
function streamElement(element, delay = 0, speed = speedFor(element)) {
  return streamWords(element, textFor(element), speed, delay);
}
async function streamHeader() {
  const elements = [...document.querySelectorAll('.home-intro .stream-text,.gallery-heading .stream-text')];
  for (let index = 0; index < elements.length; index += 1) {
    if (index > 0) await new Promise(resolve => setTimeout(resolve, 320));
    await streamElement(elements[index], index === 0 ? 180 : 0);
  }
}
function revealEra(card, index = 0) {
  if (card.dataset.revealed) return;
  card.dataset.revealed = '1';
  const entranceDelay = 1120 + index * 430;
  setTimeout(() => card.classList.add('pop-in'), entranceDelay);
  const title = card.querySelector('.era-title');
  if (title) setTimeout(() => streamElement(title), entranceDelay + 520);
}
function revealExhibit(card, index = 0) {
  if (card.dataset.revealed) return;
  card.dataset.revealed = '1';
  const entranceDelay = 240 + index * 310;
  setTimeout(() => card.classList.add('pop-in'), entranceDelay);

  const title = card.querySelector('.exhibit-title');
  if (title) setTimeout(() => streamElement(title), entranceDelay + 480);

  const meta = card.querySelector('.exhibit-meta');
  const metaTargets = card.querySelectorAll('.exhibit-meta .stream-text');
  setTimeout(() => {
    if (meta) meta.classList.add('meta-visible');
    metaTargets.forEach((element, metaIndex) => {
      setTimeout(() => streamElement(element), metaIndex * 190);
    });
  }, entranceDelay + 880);

  card.querySelectorAll('.info-block').forEach((block, blockIndex) => {
    setTimeout(() => {
      block.classList.add('pop-in');
      const heading = block.querySelector('h3');
      const paragraph = block.querySelector('p');
      if (heading) streamElement(heading);
      if (paragraph) streamElement(paragraph, 280);
    }, entranceDelay + 1420 + blockIndex * 760);
  });

  const badge = card.querySelector('.placeholder-badge');
  if (badge) setTimeout(() => streamElement(badge), entranceDelay + 3900);
}
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (entry.target.classList.contains('era-card')) {
      const cards = [...document.querySelectorAll('.era-card')];
      revealEra(entry.target, cards.indexOf(entry.target));
    }
    if (entry.target.classList.contains('exhibit-card')) {
      const cards = [...document.querySelectorAll('.exhibit-card')];
      revealExhibit(entry.target, cards.indexOf(entry.target));
    }
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.11, rootMargin: '0px 0px -45px 0px' });

/* AUDIO — immediate attempt, first-interaction start, and position continuity */
const bgAudio = document.getElementById('bg-audio');
const audioBtn = document.getElementById('audio-btn');
const AUDIO_PREF = 'stopazAudioPreference';
const AUDIO_TIME = 'stopazAudioTime';
if (bgAudio) bgAudio.volume = 0.46;
function updateAudioBtnText() {
  if (!audioBtn) return;
  const labels = {
    en: isPlaying ? 'AUDIO: ON' : 'AUDIO: OFF',
    he: isPlaying ? 'שמע: מופעל' : 'שמע: כבוי',
    ru: isPlaying ? 'ЗВУК: ВКЛ' : 'ЗВУК: ВЫКЛ'
  };
  audioBtn.textContent = labels[currentLang];
  audioBtn.classList.toggle('is-playing', isPlaying);
}
function saveAudioPosition() {
  if (bgAudio && Number.isFinite(bgAudio.currentTime)) {
    sessionStorage.setItem(AUDIO_TIME, String(bgAudio.currentTime));
  }
}
function restoreAudioPosition() {
  if (!bgAudio) return;
  const saved = parseFloat(sessionStorage.getItem(AUDIO_TIME) || '0');
  if (Number.isFinite(saved) && saved > 0) {
    try { bgAudio.currentTime = saved; } catch (_error) { /* browser decides */ }
  }
}
async function startAudio(persist = true) {
  if (!bgAudio) return false;
  if (persist) localStorage.setItem(AUDIO_PREF, 'on');
  try {
    await bgAudio.play();
    isPlaying = true;
    updateAudioBtnText();
    return true;
  } catch (_error) {
    isPlaying = false;
    updateAudioBtnText();
    return false;
  }
}
function stopAudio(persist = true) {
  if (!bgAudio) return;
  saveAudioPosition();
  bgAudio.pause();
  isPlaying = false;
  if (persist) localStorage.setItem(AUDIO_PREF, 'off');
  updateAudioBtnText();
}
function toggleAudio() {
  if (!bgAudio) return;
  if (!bgAudio.paused || isPlaying) stopAudio(true);
  else startAudio(true);
}
async function firstInteractionAudio(event) {
  if (event.target.closest && event.target.closest('#audio-btn')) return;
  if (localStorage.getItem(AUDIO_PREF) === 'off') return;
  const started = await startAudio(true);
  if (started) {
    removeEventListener('pointerdown', firstInteractionAudio, true);
    removeEventListener('keydown', firstInteractionAudio, true);
  }
}
function armFirstInteractionAudio() {
  addEventListener('pointerdown', firstInteractionAudio, true);
  addEventListener('keydown', firstInteractionAudio, true);
}
function setupAudio() {
  if (!bgAudio) return;
  restoreAudioPosition();
  bgAudio.addEventListener('play', () => { isPlaying = true; updateAudioBtnText(); });
  bgAudio.addEventListener('pause', () => { isPlaying = false; updateAudioBtnText(); });
  setInterval(() => { if (!bgAudio.paused) saveAudioPosition(); }, 1500);

  const preference = localStorage.getItem(AUDIO_PREF);
  if (preference !== 'off') {
    startAudio(preference !== 'on').then(started => {
      if (!started) armFirstInteractionAudio();
    });
  }
  updateAudioBtnText();
}
addEventListener('pagehide', saveAudioPosition);

/* LANGUAGE */
function updateImageHints() {
  const hints = { en: 'Click to enlarge', he: 'לחץ להגדלה', ru: 'Увеличить' };
  document.querySelectorAll('.exhibit-image-button').forEach(button => {
    button.dataset.hint = hints[currentLang];
  });
}
function setLanguage(lang, animate = true) {
  currentLang = lang;
  localStorage.setItem('stopazLanguage', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  ['en', 'he', 'ru'].forEach(code => {
    const button = document.getElementById('btn-' + code);
    if (button) button.classList.toggle('active', code === lang);
  });
  updateAudioBtnText();
  updateImageHints();
  document.querySelectorAll('[data-en][data-he][data-ru]').forEach(element => {
    const text = textFor(element, lang);
    if (!text || element.id === 'audio-btn') return;
    if (
      element.classList.contains('stream-text') &&
      animate &&
      (element.dataset.streamed === '1' || element.closest('.gallery-heading,.home-intro,.pop-in'))
    ) {
      streamWords(element, text, speedFor(element));
    } else if (!element.classList.contains('stream-text') || !animate) {
      element.textContent = text;
    }
  });
}

/* LIGHTBOX */
function openLightbox(button) {
  const image = button.querySelector('img');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  if (!image || !lightbox || !lightboxImage) return;
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
  if (caption) caption.textContent = image.alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) lightbox.classList.remove('active');
  document.body.style.overflow = '';
}
addEventListener('keydown', event => {
  if (event.key === 'Escape') closeLightbox();
});

/* PROFESSIONAL INTERNAL PAGE TRANSITIONS */
let doorTransitionActive = false;
function runDoorTransition(card, href) {
  if (doorTransitionActive) return;
  doorTransitionActive = true;
  saveAudioPosition();
  document.body.classList.add('door-transitioning');
  card.classList.add('door-flipping');
  card.setAttribute('aria-busy', 'true');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = href; }, 120);
    return;
  }

  setTimeout(() => card.classList.add('door-opening'), 1320);
  setTimeout(() => document.body.classList.add('page-leaving'), 2580);
  setTimeout(() => { location.href = href; }, 3320);
}
function setupPageTransitions() {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.target === '_blank' || /^https?:/i.test(href) || href.startsWith('mailto:')) return;
    event.preventDefault();
    if (link.classList.contains('era-card')) {
      runDoorTransition(link, href);
      return;
    }
    saveAudioPosition();
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = href; }, 860);
  });
}

/* INITIALIZATION */
addEventListener('DOMContentLoaded', () => {
  markStreamTargets();
  setLanguage(currentLang, false);
  updateImageHints();
  document.querySelectorAll('.stream-text').forEach(resetStream);
  document.querySelectorAll('.era-card,.exhibit-card').forEach(element => revealObserver.observe(element));
  setupAudio();
  setupPageTransitions();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('page-ready');
    streamHeader();
  }));
});
