'use strict';

const SUPPORTED_LANGUAGES = ['en', 'he', 'ru'];
const savedLanguage = localStorage.getItem('stopazLanguage');
let currentLang = SUPPORTED_LANGUAGES.includes(savedLanguage) ? savedLanguage : 'en';
let isPlaying = false;
let audioStartPending = false;
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

/* AUDIO — explicit visitor control only; no autoplay or first-interaction start */
const bgAudio = document.getElementById('bg-audio');
const audioBtn = document.getElementById('audio-btn');
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
  audioBtn.setAttribute('aria-pressed', String(isPlaying));
}
function saveAudioPosition() {
  if (bgAudio && Number.isFinite(bgAudio.currentTime)) {
    sessionStorage.setItem(AUDIO_TIME, String(bgAudio.currentTime));
  }
}
function seekSavedAudioPosition() {
  if (!bgAudio) return;
  const saved = Number.parseFloat(sessionStorage.getItem(AUDIO_TIME) || '0');
  if (Number.isFinite(saved) && saved > 0 && Number.isFinite(bgAudio.duration) && saved < bgAudio.duration) {
    try { bgAudio.currentTime = saved; } catch (_error) { /* Browser controls seeking readiness. */ }
  }
}
function waitForAudioMetadata() {
  if (!bgAudio || bgAudio.readyState >= 1) return Promise.resolve();
  return new Promise(resolve => {
    bgAudio.addEventListener('loadedmetadata', resolve, { once: true });
    setTimeout(resolve, 1800);
  });
}
async function startAudio() {
  if (!bgAudio || audioStartPending) return false;
  audioStartPending = true;
  audioBtn?.setAttribute('aria-busy', 'true');
  try {
    bgAudio.load();
    await waitForAudioMetadata();
    seekSavedAudioPosition();
    await bgAudio.play();
    return true;
  } catch (_error) {
    isPlaying = false;
    updateAudioBtnText();
    return false;
  } finally {
    audioStartPending = false;
    audioBtn?.removeAttribute('aria-busy');
  }
}
function stopAudio() {
  if (!bgAudio) return;
  saveAudioPosition();
  bgAudio.pause();
}
function toggleAudio() {
  if (!bgAudio || audioStartPending) return;
  if (bgAudio.paused) startAudio();
  else stopAudio();
}
function setupAudio() {
  if (!bgAudio) return;
  bgAudio.addEventListener('play', () => { isPlaying = true; updateAudioBtnText(); });
  bgAudio.addEventListener('pause', () => { isPlaying = false; updateAudioBtnText(); });
  bgAudio.addEventListener('ended', () => { isPlaying = false; updateAudioBtnText(); });
  audioBtn?.addEventListener('click', toggleAudio);
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
  if (!SUPPORTED_LANGUAGES.includes(lang)) lang = 'en';
  currentLang = lang;
  localStorage.setItem('stopazLanguage', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  ['en', 'he', 'ru'].forEach(code => {
    const button = document.getElementById('btn-' + code);
    if (button) {
      const active = code === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
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


function resetRestoredPage() {
  doorTransitionActive = false;
  document.body.classList.remove('door-transitioning', 'page-leaving');
  document.querySelectorAll('.era-card').forEach(card => {
    card.classList.remove('door-flipping', 'door-opening');
    card.removeAttribute('aria-busy');
  });
  const curtain = document.getElementById('page-curtain');
  if (curtain) curtain.removeAttribute('style');
  requestAnimationFrame(() => document.body.classList.add('page-ready'));
}
addEventListener('pageshow', resetRestoredPage);

/* INITIALIZATION */
addEventListener('DOMContentLoaded', () => {
  markStreamTargets();
  setLanguage(currentLang, false);
  updateImageHints();
  document.querySelectorAll('.stream-text').forEach(resetStream);
  document.querySelectorAll('.era-card,.exhibit-card').forEach(element => revealObserver.observe(element));
  setupAudio();
  ['en','he','ru'].forEach(code => document.getElementById('btn-' + code)?.addEventListener('click', () => setLanguage(code)));
  setupPageTransitions();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('page-ready');
    streamHeader();
  }));
});
