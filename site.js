'use strict';

(function installMobileExhibitionStyles(){
  if (document.querySelector('link[data-mobile-exhibition]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'mobile-exhibition.css';
  link.dataset.mobileExhibition = '1';
  document.head.appendChild(link);
})();

(() => {
  function storageGet(key) {
    try { return sessionStorage.getItem(key); } catch (_error) { return null; }
  }

  function storageSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (_error) { /* Storage may be unavailable in hardened contexts. */ }
  }

  const SUPPORTED_LANGUAGES = ['en', 'he', 'ru'];
  const LANGUAGE_SESSION_KEY = 'stopazSessionLanguage';
  const AUDIO_TIME = 'stopazAudioTime';
  const AUDIO_WANTED = 'stopazAudioWanted';
  const savedLanguage = storageGet(LANGUAGE_SESSION_KEY);
  let currentLang = SUPPORTED_LANGUAGES.includes(savedLanguage) ? savedLanguage : 'en';
  let isPlaying = false;
  let audioStartPending = false;
  let leaving = false;

  const audio = document.getElementById('bg-audio');
  const audioBtn = document.getElementById('audio-btn');
  const ambient = document.getElementById('ambient-light');

  const curtain = document.createElement('div');
  curtain.id = 'page-curtain';
  curtain.setAttribute('aria-hidden', 'true');
  document.body.prepend(curtain);

  function textFor(element, lang = currentLang) {
    return element?.getAttribute(`data-${lang}`) || element?.textContent || '';
  }

  function updateAudioButton() {
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

  function setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) lang = 'en';
    currentLang = lang;
    storageSet(LANGUAGE_SESSION_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

    SUPPORTED_LANGUAGES.forEach(code => {
      const button = document.getElementById(`btn-${code}`);
      if (!button) return;
      const active = code === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    document.querySelectorAll('[data-en][data-he][data-ru]').forEach(element => {
      if (element.id !== 'audio-btn') element.textContent = textFor(element, lang);
    });
    document.querySelectorAll('.era-arrow').forEach(arrow => { arrow.textContent = lang === 'he' ? '←' : '→'; });
    document.querySelectorAll('[data-aria-en][data-aria-he][data-aria-ru]').forEach(element => {
      element.setAttribute('aria-label', element.getAttribute(`data-aria-${lang}`) || element.getAttribute('data-aria-en'));
    });
    updateAudioButton();
    prepareHomeTitle();
  }

  function saveAudioPosition() {
    if (audio && Number.isFinite(audio.currentTime)) storageSet(AUDIO_TIME, String(audio.currentTime));
  }

  function seekAudioPosition() {
    if (!audio || !Number.isFinite(audio.duration)) return;
    const saved = Number.parseFloat(storageGet(AUDIO_TIME) || '0');
    if (Number.isFinite(saved) && saved > 0 && saved < audio.duration) {
      try { audio.currentTime = saved; } catch (_error) { /* browser owns readiness */ }
    }
  }

  async function startAudio() {
    if (!audio || audioStartPending) return;
    audioStartPending = true;
    audioBtn?.setAttribute('aria-busy', 'true');
    try {
      audio.load();
      if (audio.readyState < 1) {
        await new Promise(resolve => {
          audio.addEventListener('loadedmetadata', resolve, { once: true });
          setTimeout(resolve, 1600);
        });
      }
      seekAudioPosition();
      await audio.play();
      storageSet(AUDIO_WANTED, '1');
    } catch (_error) {
      isPlaying = false;
      updateAudioButton();
    } finally {
      audioStartPending = false;
      audioBtn?.removeAttribute('aria-busy');
    }
  }

  function setupAudio() {
    if (!audio) return;
    audio.volume = 0.46;
    audio.addEventListener('play', () => { isPlaying = true; updateAudioButton(); });
    audio.addEventListener('pause', () => { isPlaying = false; updateAudioButton(); });
    audio.addEventListener('ended', () => { isPlaying = false; updateAudioButton(); });
    audioBtn?.addEventListener('click', () => {
      if (audio.paused) startAudio();
      else { storageSet(AUDIO_WANTED, '0'); audio.pause(); }
    });
    updateAudioButton();
  }

  function setupAmbientLight() {
    if (!ambient || matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let targetX = innerWidth / 2, targetY = innerHeight / 2;
    let x = targetX, y = targetY;
    let frame = 0;

    const tick = () => {
      frame = 0;
      x += (targetX - x) * 0.045;
      y += (targetY - y) * 0.045;
      ambient.style.setProperty('--cursor-x', `${x}px`);
      ambient.style.setProperty('--cursor-y', `${y}px`);
      if (Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2) {
        frame = requestAnimationFrame(tick);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    ambient.style.setProperty('--cursor-x', `${x}px`);
    ambient.style.setProperty('--cursor-y', `${y}px`);
    addEventListener('pointermove', event => {
      targetX = event.clientX;
      targetY = event.clientY;
      schedule();
    }, { passive: true });
  }

  let titleSweepDone = false;
  function prepareHomeTitle() {
    const title = document.querySelector('.home-title');
    if (!title) return;
    const text = textFor(title);
    title.setAttribute('aria-label', text);
    title.replaceChildren();
    [...text].forEach(character => {
      const span = document.createElement('span');
      span.className = 'home-title-char';
      span.setAttribute('aria-hidden', 'true');
      if (/\s/.test(character)) span.classList.add('is-space');
      span.textContent = /\s/.test(character) ? '\u00a0' : character;
      title.append(span);
    });
  }

  function runHomeTitleSweep() {
    if (titleSweepDone || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const title = document.querySelector('.home-title');
    if (!title) return;
    const characters = [...title.querySelectorAll('.home-title-char:not(.is-space)')];
    characters.forEach((character, index) => character.style.setProperty('--sweep-delay', `${index * 48}ms`));
    titleSweepDone = true;
    title.classList.add('title-sweep-running');
    setTimeout(() => title.classList.remove('title-sweep-running'), characters.length * 48 + 520);
  }

  function revealDoorImages() {
    document.querySelectorAll('.door-source-image').forEach((image, index) => {
      const show = () => setTimeout(() => image.classList.add('is-loaded'), 70 + index * 70);
      if (image.complete && image.naturalWidth) show();
      else image.addEventListener('load', show, { once: true });
    });
  }

  function revealDoors() {
    document.querySelectorAll('.era-card').forEach((card, index) => {
      const show = () => setTimeout(() => card.classList.add('pop-in'), 160 + index * 115);
      const image = card.querySelector('.era-image');
      if (!image || image.complete) show();
      else image.addEventListener('load', show, { once: true });
    });
  }

  function prefetch(href) {
    if (!href || document.head.querySelector(`link[data-prefetch="${CSS.escape(href)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = href;
    link.dataset.prefetch = href;
    document.head.append(link);
  }

  function navigateThroughDoor(card, href) {
    if (leaving) return;
    leaving = true;
    saveAudioPosition();
    card.setAttribute('aria-busy', 'true');
    card.classList.add('door-cut-source');
    document.body.classList.add('door-cutting');
    const doorImage = card.querySelector('.era-image');
    const arrivalImage = doorImage?.currentSrc || doorImage?.src || '';
    if (arrivalImage) storageSet('stopaz-era-arrival-image', arrivalImage);
    storageSet('stopaz-era-aperture-arrival', '1');

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTimeout(() => location.assign(href), 70);
      return;
    }

    requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.add('is-active')));
    setTimeout(() => location.assign(href), 235);
  }

  function setupLanguageControls() {
    SUPPORTED_LANGUAGES.forEach(code => {
      document.getElementById(`btn-${code}`)?.addEventListener('click', () => setLanguage(code));
    });
  }

  function setupNavigation() {
    document.querySelectorAll('.era-card[href]').forEach(card => {
      const href = card.getAttribute('href');
      card.addEventListener('pointerenter', () => prefetch(href), { once: true, passive: true });
      card.addEventListener('focus', () => prefetch(href), { once: true });
      card.addEventListener('touchstart', () => prefetch(href), { once: true, passive: true });
      card.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigateThroughDoor(card, href);
      });
    });
  }


  function installMobileMuseumBehavior() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealSelectors = document.body.classList.contains('third-era-page')
    ? '.prospectus-section, .streams-section, .partnership-section'
    : '.home-source-context, .home-source-context .era-source-section, .third-era-teaser';
    const revealNodes = [...document.querySelectorAll(revealSelectors)];
    if (revealNodes.length) {
        revealNodes.forEach(node => node.classList.add('mobile-room-reveal'));
      if (reduced || !('IntersectionObserver' in window)) {
        revealNodes.forEach(node => node.classList.add('mobile-room-visible'));
      } else {
        const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const node = entry.target;
          if (entry.isIntersecting) {
            node.classList.remove('mobile-room-exit-up', 'mobile-room-exit-down');
            node.classList.add('mobile-room-visible');
            return;
          }
          node.classList.remove('mobile-room-visible');
          const exitedAbove = entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top < 0;
          node.classList.toggle('mobile-room-exit-up', exitedAbove);
          node.classList.toggle('mobile-room-exit-down', !exitedAbove);
        });
      }, { threshold: [0, 0.01, 0.12], rootMargin: '-7% 0px 25% 0px' });
        revealNodes.forEach(node => observer.observe(node));
      }
  }

    if (matchMedia('(hover: none), (pointer: coarse)').matches && 'IntersectionObserver' in window) {
      const panels = [...document.querySelectorAll(
      document.body.classList.contains('third-era-page')
        ? '.stream-card, .inside-grid article, .program-list, .partnership-contact'
        : '.era-card, .third-era-teaser'
    )];
      const panelObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('panel-current', entry.isIntersecting));
    }, { threshold: 0.01, rootMargin: '-27% 0px -27% 0px' });
      panels.forEach(panel => panelObserver.observe(panel));
    }
  }


  function resetPage() {
    leaving = false;
    document.body.classList.remove('door-cutting', 'page-leaving');
    curtain.classList.remove('is-active');
    document.querySelectorAll('.era-card').forEach(card => {
      card.classList.remove('door-cut-source');
      card.removeAttribute('aria-busy');
    });
  }

  addEventListener('pagehide', saveAudioPosition);
  addEventListener('pageshow', resetPage);

  addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
    setupAudio();
    setupAmbientLight();
    revealDoorImages();
    revealDoors();
    setupLanguageControls();
    setupNavigation();
    installMobileMuseumBehavior();
    if (storageGet(AUDIO_WANTED) === '1') startAudio();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('page-ready')));
    setTimeout(runHomeTitleSweep, 1200);
  });
})();
