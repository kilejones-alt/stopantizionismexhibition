'use strict';

let currentLang = localStorage.getItem('stopazLanguage') || 'en';
let isPlaying = false;
let audioStartPending = false;
let lightboxTrigger = null;
let lockedScrollY = 0;

const audio = document.getElementById('bg-audio');
const audioBtn = document.getElementById('audio-btn');
const AUDIO_TIME = 'stopazAudioTime';


function handleFallbackImage(image, fallbackList) {
  const index = Number.parseInt(image.dataset.tryIndex || '0', 10);
  if (index < fallbackList.length) {
    image.dataset.tryIndex = String(index + 1);
    image.src = fallbackList[index];
    return;
  }
  image.onerror = null;
  image.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231d1d21'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-family='sans-serif' font-size='18'>IMAGE UNAVAILABLE</text></svg>";
}
window.handleFallbackImage = handleFallbackImage;

function textFor(element, lang = currentLang) {
  return element.getAttribute(`data-${lang}`) || element.dataset.fullText || element.textContent || '';
}

function stopStreaming(element) {
  if (element && element.typeInterval) {
    clearInterval(element.typeInterval);
    element.typeInterval = null;
  }
  if (element) element.removeAttribute('data-streaming');
}

function revealFullText(element) {
  if (!element) return;
  const fullText = textFor(element);
  stopStreaming(element);
  element.textContent = fullText;
  element.dataset.streamed = '1';
}

function streamWords(element, text, speed = 55) {
  if (!element || !text) return;
  stopStreaming(element);
  element.dataset.fullText = text;
  element.dataset.streaming = 'true';
  element.textContent = '';
  const letters = Array.from(text);
  let index = 0;
  element.typeInterval = setInterval(() => {
    if (index < letters.length) {
      element.textContent += letters[index++];
    } else {
      stopStreaming(element);
      element.dataset.streamed = '1';
    }
  }, speed);
}

function triggerPanelStreaming(container) {
  container.querySelectorAll('.stream-text').forEach(element => {
    streamWords(element, textFor(element), 55);
  });
}

function setupAmbientLight() {
  const ambientLight = document.getElementById('ambient-light');
  if (!ambientLight) return;
  const finePointer = matchMedia('(pointer:fine)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!finePointer || reducedMotion) {
    ambientLight.style.setProperty('--cursor-x', '50vw');
    ambientLight.style.setProperty('--cursor-y', '35vh');
    return;
  }
  let targetX = innerWidth / 2;
  let targetY = innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  addEventListener('mousemove', event => {
    targetX = event.clientX;
    targetY = event.clientY;
  }, { passive: true });
  const animate = () => {
    currentX += (targetX - currentX) * 0.04;
    currentY += (targetY - currentY) * 0.04;
    ambientLight.style.setProperty('--cursor-x', `${currentX}px`);
    ambientLight.style.setProperty('--cursor-y', `${currentY}px`);
    requestAnimationFrame(animate);
  };
  animate();
}

function setupRevealObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (entry.target.classList.contains('art-box') || entry.target.classList.contains('info-block')) {
        entry.target.classList.add('pop-in');
      }
      if (entry.target.classList.contains('exhibition-section')) {
        const panel = entry.target.querySelector('.info-panel');
        if (panel && !panel.classList.contains('visible')) {
          panel.classList.add('visible');
          triggerPanelStreaming(entry.target);
        }
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.exhibition-section,.art-box,.info-block').forEach(element => observer.observe(element));
}

function updateAudioBtnText() {
  if (!audioBtn) return;
  const labels = {
    en: isPlaying ? 'AUDIO: ON' : 'AUDIO: OFF',
    he: isPlaying ? 'שמע: מופעל' : 'שמע: כבוי',
    ru: isPlaying ? 'ЗВУК: ВКЛ' : 'ЗВУК: ВЫКЛ'
  };
  audioBtn.textContent = labels[currentLang] || labels.en;
  audioBtn.classList.toggle('is-playing', isPlaying);
  audioBtn.setAttribute('aria-pressed', String(isPlaying));
}

function saveAudioPosition() {
  if (audio && Number.isFinite(audio.currentTime)) {
    sessionStorage.setItem(AUDIO_TIME, String(audio.currentTime));
  }
}

function seekSavedAudioPosition() {
  if (!audio) return;
  const saved = Number.parseFloat(sessionStorage.getItem(AUDIO_TIME) || '0');
  if (Number.isFinite(saved) && saved > 0 && Number.isFinite(audio.duration) && saved < audio.duration) {
    try { audio.currentTime = saved; } catch (_error) { /* Browser controls seeking readiness. */ }
  }
}

function waitForMetadata() {
  if (!audio || audio.readyState >= 1) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => resolve();
    audio.addEventListener('loadedmetadata', done, { once: true });
    setTimeout(done, 1800);
  });
}

async function startAudio() {
  if (!audio || audioStartPending) return;
  audioStartPending = true;
  audioBtn?.setAttribute('aria-busy', 'true');
  try {
    audio.load();
    await waitForMetadata();
    seekSavedAudioPosition();
    await audio.play();
  } catch (_error) {
    isPlaying = false;
    updateAudioBtnText();
  } finally {
    audioStartPending = false;
    audioBtn?.removeAttribute('aria-busy');
  }
}

function stopAudio() {
  if (!audio) return;
  saveAudioPosition();
  audio.pause();
}

function toggleAudio() {
  if (!audio || audioStartPending) return;
  if (audio.paused) startAudio();
  else stopAudio();
}

function setLanguage(lang, animate = true) {
  if (!['en', 'he', 'ru'].includes(lang)) lang = 'en';
  currentLang = lang;
  localStorage.setItem('stopazLanguage', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

  ['en', 'he', 'ru'].forEach(code => {
    const button = document.getElementById(`btn-${code}`);
    if (button) {
      const active = code === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  });
  updateAudioBtnText();

  document.querySelectorAll('[data-en][data-he][data-ru]').forEach(element => {
    if (element.id === 'audio-btn') return;
    const text = textFor(element, lang);
    element.dataset.fullText = text;
    if (element.classList.contains('stream-text') && animate && (element.dataset.streamed === '1' || element.closest('.visible,.hero-section'))) {
      streamWords(element, text, 55);
    } else {
      stopStreaming(element);
      element.textContent = text;
    }
  });
}

function lockBodyScroll() {
  lockedScrollY = window.scrollY;
  document.body.classList.add('lightbox-open');
  document.body.style.top = `-${lockedScrollY}px`;
}

function unlockBodyScroll() {
  document.body.classList.remove('lightbox-open');
  document.body.style.top = '';
  window.scrollTo(0, lockedScrollY);
}

function openLightbox(button) {
  const image = button.querySelector('img');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const closeButton = document.getElementById('lightbox-close');
  if (!image || !lightbox || !lightboxImage) return;
  lightboxTrigger = button;
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
  if (caption) caption.textContent = image.alt;
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  closeButton?.focus({ preventScroll: true });
}

function closeLightbox(restoreFocus = true) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-img');
  if (!lightbox || !lightbox.classList.contains('active')) return;
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
  if (lightboxImage) lightboxImage.removeAttribute('src');
  if (restoreFocus && lightboxTrigger) lightboxTrigger.focus({ preventScroll: true });
  lightboxTrigger = null;
}

function resetRestoredPage() {
  document.documentElement.classList.remove('page-leaving');
  document.body.classList.remove('page-leaving', 'door-transitioning', 'lightbox-open');
  document.body.style.top = '';
  document.body.style.overflow = '';
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
  }
  document.querySelectorAll('[aria-busy="true"]').forEach(element => element.removeAttribute('aria-busy'));
}

function setupControls() {
  audioBtn?.addEventListener('click', toggleAudio);
  ['en', 'he', 'ru'].forEach(code => {
    document.getElementById(`btn-${code}`)?.addEventListener('click', () => setLanguage(code));
  });

  if (audio) {
    audio.volume = 0.46;
    audio.addEventListener('play', () => { isPlaying = true; updateAudioBtnText(); });
    audio.addEventListener('pause', () => { isPlaying = false; updateAudioBtnText(); });
    audio.addEventListener('ended', () => { isPlaying = false; updateAudioBtnText(); });
  }
}

function setupLightbox() {
  document.querySelectorAll('.exhibit-image-button').forEach(button => {
    button.addEventListener('click', () => openLightbox(button));
  });
  const lightbox = document.getElementById('lightbox');
  const closeButton = document.getElementById('lightbox-close');
  closeButton?.addEventListener('click', event => {
    event.stopPropagation();
    closeLightbox();
  });
  lightbox?.addEventListener('click', event => {
    if (event.target !== closeButton) closeLightbox();
  });
  addEventListener('keydown', event => {
    if (!lightbox?.classList.contains('active')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      closeButton?.focus({ preventScroll: true });
    }
  });
}

function setupTapToComplete() {
  document.addEventListener('click', event => {
    const paragraph = event.target.closest('.typewriter-p[data-streaming="true"]');
    if (paragraph) revealFullText(paragraph);
  });
}

addEventListener('pagehide', saveAudioPosition);
addEventListener('pageshow', resetRestoredPage);

addEventListener('DOMContentLoaded', () => {
  resetRestoredPage();
  setupAmbientLight();
  setupControls();
  setupLightbox();
  setupTapToComplete();
  setLanguage(currentLang, false);
  setupRevealObserver();

  const heroSection = document.querySelector('.hero-section');
  if (heroSection) triggerPanelStreaming(heroSection);
  document.querySelector('.hero-section .art-box')?.classList.add('pop-in');
  updateAudioBtnText();
});
