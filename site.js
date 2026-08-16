'use strict';

const SUPPORTED_LANGUAGES = ['en', 'he', 'ru'];
const LANGUAGE_SESSION_KEY = 'stopazSessionLanguage';
const savedLanguage = sessionStorage.getItem(LANGUAGE_SESSION_KEY);
/* Every new browser tab/session starts in English. A visitor can explicitly switch
   to Hebrew or Russian; that choice then follows them through this tab only. */
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

/* HOME MOTION TUNING */
const homeMotionTuning = document.createElement('style');
homeMotionTuning.textContent = `
  .home-title.title-sweep-running .home-title-char:not(.is-space){animation-duration:.36s}
  .home-title.title-sweep-running .home-title-char.is-punctuation{animation-duration:.24s}
  .door-rotator{transition-duration:.72s!important;-webkit-transition-duration:.72s!important;transition-timing-function:cubic-bezier(.22,.72,.22,1)!important;-webkit-transition-timing-function:cubic-bezier(.22,.72,.22,1)!important}
  .door-panel{transition-duration:1.05s!important;-webkit-transition-duration:1.05s!important;transition-timing-function:cubic-bezier(.22,.72,.22,1)!important;-webkit-transition-timing-function:cubic-bezier(.22,.72,.22,1)!important}
  .era-card.door-opening .door-aperture{animation-duration:1.15s!important}
  @media(max-width:720px){
    .door-rotator{transition-duration:.64s!important;-webkit-transition-duration:.64s!important}
    .door-panel{transition-duration:.94s!important;-webkit-transition-duration:.94s!important}
    .era-card.door-opening .door-aperture{animation-duration:1.02s!important}
  }
`;
document.head.appendChild(homeMotionTuning);

/* LANGUAGE PARITY — Hebrew mirrors the English/Russian physical layout.
   Russian remains LTR. These rules intentionally override physical left/right
   anchors that do not automatically respond to document direction. */
const languageParityStyles = document.createElement('style');
languageParityStyles.id = 'language-parity-styles';
languageParityStyles.textContent = `
  html[dir="rtl"] .controls-nav{left:auto!important;right:1.35rem!important;flex-direction:row-reverse}
  html[dir="rtl"] .site-brand-link{right:auto!important;left:1.5rem!important}
  html[dir="rtl"] .era-arrow{right:auto!important;left:.8rem!important}
  html[dir="rtl"] .era-card:hover .era-arrow,
  html[dir="rtl"] .era-card:focus-visible .era-arrow{transform:translateX(-4px)}
  html[dir="rtl"] .overview-section,
  html[dir="rtl"] .stream-item,
  html[dir="rtl"] .sequence-item{direction:rtl}
  html[dir="rtl"] .overview-copy,
  html[dir="rtl"] .overview-label,
  html[dir="rtl"] .stream-item,
  html[dir="rtl"] .sequence-item,
  html[dir="rtl"] .overview-partnership{text-align:right}
  html[dir="rtl"] .announcement-link{flex-direction:row-reverse}
  @media(max-width:720px){
    html[dir="rtl"] .controls-nav{left:auto!important;right:max(.75rem,env(safe-area-inset-right))!important}
    html[dir="rtl"] .site-brand-link{right:auto!important;left:max(.75rem,env(safe-area-inset-left))!important}
  }
`;
document.head.appendChild(languageParityStyles);

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

/* HOMEPAGE TITLE — one restrained oxblood sweep, left to right */
const HOME_TITLE_SWEEP_DELAY = 1650;
const HOME_TITLE_SWEEP_STAGGER = 55;
let homeTitleSweepTimer = 0;
let homeTitleSweepFinished = false;

function prepareHomeTitleLetters() {
  const title = document.querySelector('.home-title');
  if (!title) return;
  const fullText = title.getAttribute('data-' + currentLang) || title.textContent || '';
  title.setAttribute('aria-label', fullText);
  title.textContent = '';
  [...fullText].forEach(character => {
    const span = document.createElement('span');
    span.className = 'home-title-char';
    span.setAttribute('aria-hidden', 'true');
    if (/\s/.test(character)) {
      span.classList.add('is-space');
      span.textContent = '\u00a0';
    } else {
      if (/[-–—־:]/.test(character)) span.classList.add('is-punctuation');
      span.textContent = character;
    }
    title.appendChild(span);
  });
}

function runPostTitleAccent() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.body.classList.remove('title-afterglow');
  void document.body.offsetWidth;
  document.body.classList.add('title-afterglow');
  window.setTimeout(() => document.body.classList.remove('title-afterglow'), 1100);
}

function runHomeTitleSweep() {
  if (homeTitleSweepFinished || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const title = document.querySelector('.home-title');
  if (!title) return;
  const characters = [...title.querySelectorAll('.home-title-char:not(.is-space)')];
  characters.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    if (Math.abs(aRect.top - bRect.top) > 4) return aRect.top - bRect.top;
    return currentLang === 'he' ? bRect.left - aRect.left : aRect.left - bRect.left;
  });
  characters.forEach((character, index) => {
    character.style.setProperty('--sweep-delay', `${index * HOME_TITLE_SWEEP_STAGGER}ms`);
  });
  homeTitleSweepFinished = true;
  title.classList.remove('title-sweep-running');
  void title.offsetWidth;
  title.classList.add('title-sweep-running');
  const totalDuration = (characters.length - 1) * HOME_TITLE_SWEEP_STAGGER + 360;
  setTimeout(() => title.classList.remove('title-sweep-running'), totalDuration + 80);
  /* After the oxblood sweep, let the thresholds answer once — no logo reveal. */
  setTimeout(runPostTitleAccent, totalDuration + 140);
}

function scheduleHomeTitleSweep() {
  if (!document.body.classList.contains('home-page') || homeTitleSweepFinished || homeTitleSweepTimer) return;
  homeTitleSweepTimer = window.setTimeout(() => {
    homeTitleSweepTimer = 0;
    runHomeTitleSweep();
  }, HOME_TITLE_SWEEP_DELAY);
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
function updateDirectionalUI() {
  const rtl = currentLang === 'he';
  document.querySelectorAll('.era-arrow').forEach(arrow => {
    arrow.textContent = rtl ? '←' : '→';
  });
  document.querySelectorAll('.announcement-link [aria-hidden="true"]').forEach(arrow => {
    arrow.textContent = rtl ? '←' : '→';
  });
}

function updateDocumentMetadata() {
  const body = document.body;
  const title = body?.getAttribute(`data-title-${currentLang}`);
  if (title) document.title = title;
  const description = body?.getAttribute(`data-description-${currentLang}`);
  const meta = document.querySelector('meta[name="description"]');
  if (description && meta) meta.setAttribute('content', description);
}

function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) lang = 'en';
  currentLang = lang;
  sessionStorage.setItem(LANGUAGE_SESSION_KEY, lang);
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
  updateDirectionalUI();
  updateDocumentMetadata();
  document.querySelectorAll('[data-en][data-he][data-ru]').forEach(element => {
    if (element.id !== 'audio-btn') element.textContent = textFor(element, lang);
  });
  prepareHomeTitleLetters();
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

function pageFlipLabelFor(card) {
  const title = card.querySelector('.era-title');
  return title?.getAttribute('data-' + currentLang) || title?.textContent?.trim() || '';
}

function createPageFlipLayer(card) {
  document.getElementById('era-pageflip-layer')?.remove();
  const rect = card.getBoundingClientRect();
  const front = card.querySelector('.door-front') || card;
  const layer = document.createElement('div');
  layer.id = 'era-pageflip-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.setProperty('--flip-left', `${rect.left}px`);
  layer.style.setProperty('--flip-top', `${rect.top}px`);
  layer.style.setProperty('--flip-width', `${rect.width}px`);
  layer.style.setProperty('--flip-height', `${rect.height}px`);

  const destination = document.createElement('div');
  destination.className = 'era-pageflip-destination';

  const sheet = document.createElement('div');
  sheet.className = 'era-pageflip-sheet';

  const frontFace = document.createElement('div');
  frontFace.className = 'era-pageflip-face era-pageflip-front';
  const frontClone = front.cloneNode(true);
  frontClone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  frontClone.querySelectorAll('a,button').forEach(node => node.setAttribute('tabindex','-1'));
  frontClone.querySelectorAll('.era-arrow,.mobile-node').forEach(node => node.remove());
  frontFace.appendChild(frontClone);

  const backFace = document.createElement('div');
  backFace.className = 'era-pageflip-face era-pageflip-back';
  const backArt = card.querySelector('.era-image');
  if (backArt) backFace.style.backgroundImage = `url("${backArt.currentSrc || backArt.src}")`;

  sheet.append(frontFace, backFace);
  layer.append(destination, sheet);
  document.body.appendChild(layer);
  return layer;
}

function runDoorTransition(card, href) {
  if (doorTransitionActive || !card || !href) return;
  doorTransitionActive = true;
  saveAudioPosition();
  card.setAttribute('aria-busy', 'true');

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.assign(href); }, 120);
    return;
  }

  const layer = createPageFlipLayer(card);
  document.body.classList.add('pageflip-transitioning');
  card.classList.add('pageflip-source');
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-turning')));

  /* One continuous turn: the selected exhibition card becomes a sheet and flips
     across its left binding edge while the next page appears beneath it. */
  const duration = innerWidth <= 720 ? 920 : 1040;
  setTimeout(() => { location.assign(href); }, duration);
}

function setupPageTransitions() {
  const prefetchedPages = new Set();
  const prefetchPage = card => {
    const href = card.getAttribute('href');
    if (!href || prefetchedPages.has(href)) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = href;
    document.head.appendChild(link);
    prefetchedPages.add(href);
  };

  document.querySelectorAll('.era-card[href]').forEach(card => {
    card.addEventListener('pointerenter', () => prefetchPage(card), { once: true, passive: true });
    card.addEventListener('focus', () => prefetchPage(card), { once: true });
    card.addEventListener('touchstart', () => prefetchPage(card), { once: true, passive: true });
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



function setupDoorImageResolve() {
  document.querySelectorAll('.era-image').forEach(image => {
    const reveal = () => requestAnimationFrame(() => image.classList.add('is-loaded'));
    if (image.complete && image.naturalWidth) reveal();
    else image.addEventListener('load', reveal, { once: true });
  });
}

function resetRestoredPage() {
  doorTransitionActive = false;
  document.body.classList.remove('door-transitioning', 'aperture-preparing', 'pageflip-transitioning', 'page-leaving');
  document.querySelectorAll('.era-card').forEach(card => {
    card.classList.remove('door-flipping', 'door-back-visible', 'door-opening', 'aperture-selected', 'pageflip-source');
    card.removeAttribute('aria-busy');
  });
  document.getElementById('era-aperture-layer')?.remove();
  document.getElementById('era-pageflip-layer')?.remove();
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
  setupDoorImageResolve();
  ['en','he','ru'].forEach(code => document.getElementById('btn-' + code)?.addEventListener('click', () => setLanguage(code)));
  setupPageTransitions();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('page-ready');
    scheduleHomeTitleSweep();
  }));
});
