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

/* HOMEPAGE TEXT — static; motion begins only after entering a gallery */
function textFor(element, lang = currentLang) {
  return element.getAttribute('data-' + lang) || element.textContent || '';
}
function revealEra(card, index = 0) {
  if (card.dataset.revealed) return;
  card.dataset.revealed = '1';
  const entranceDelay = 260 + index * 180;
  setTimeout(() => card.classList.add('pop-in'), entranceDelay);
}
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (entry.target.classList.contains('era-card')) {
      const cards = [...document.querySelectorAll('.era-card')];
      revealEra(entry.target, cards.indexOf(entry.target));
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
function setLanguage(lang) {
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
  document.querySelectorAll('[data-en][data-he][data-ru]').forEach(element => {
    if (element.id !== 'audio-btn') element.textContent = textFor(element, lang);
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
  if (doorTransitionActive || !card || !href) return;
  doorTransitionActive = true;
  saveAudioPosition();
  document.body.classList.add('door-transitioning');
  card.classList.add('door-flipping');
  card.setAttribute('aria-busy', 'true');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.assign(href); }, 140);
    return;
  }

  /* 0–1.9s: the clicked image card turns horizontally to its reverse side. */
  setTimeout(() => card.classList.add('door-back-visible'), 1850);
  /* 2.55–4.8s: the reverse side separates at the center and opens as two panels. */
  setTimeout(() => card.classList.add('door-opening'), 2550);
  /* Only fade the page after the door has visibly opened. */
  setTimeout(() => document.body.classList.add('page-leaving'), 4550);
  setTimeout(() => { location.assign(href); }, 5150);
}
function setupPageTransitions() {
  document.querySelectorAll('.era-card[href]').forEach(card => {
    card.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = card.getAttribute('href');
      if (!href) return;
      event.preventDefault();
      runDoorTransition(card, href);
    });
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]:not(.era-card)');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.target === '_blank' || /^https?:/i.test(href) || href.startsWith('mailto:')) return;
    event.preventDefault();
    saveAudioPosition();
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.assign(href); }, 860);
  });
}


function resetRestoredPage() {
  doorTransitionActive = false;
  document.body.classList.remove('door-transitioning', 'page-leaving');
  document.querySelectorAll('.era-card').forEach(card => {
    card.classList.remove('door-flipping', 'door-back-visible', 'door-opening');
    card.removeAttribute('aria-busy');
  });
  const curtain = document.getElementById('page-curtain');
  if (curtain) curtain.removeAttribute('style');
  requestAnimationFrame(() => document.body.classList.add('page-ready'));
}
addEventListener('pageshow', resetRestoredPage);

/* INITIALIZATION */
addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
  document.querySelectorAll('.era-card').forEach(element => revealObserver.observe(element));
  setupAudio();
  ['en','he','ru'].forEach(code => document.getElementById('btn-' + code)?.addEventListener('click', () => setLanguage(code)));
  setupPageTransitions();
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('page-ready')));
});
