'use strict';

function storageGet(key) {
  try { return sessionStorage.getItem(key); } catch (_error) { return null; }
}

function storageSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch (_error) { /* Storage may be unavailable in hardened contexts. */ }
}

function storageRemove(key) {
  try { sessionStorage.removeItem(key); } catch (_error) { /* Storage may be unavailable in hardened contexts. */ }
}

const LANGUAGE_SESSION_KEY = 'stopazSessionLanguage';
const savedLanguage = storageGet(LANGUAGE_SESSION_KEY);
let currentLang = ['en','he','ru'].includes(savedLanguage) ? savedLanguage : 'en';
let isPlaying = false;
let audioStartPending = false;
let lightboxTrigger = null;
let lockedScrollY = 0;
let viewerScale = 1;
let viewerX = 0;
let viewerY = 0;
let viewerDragStart = null;
let viewerPinchStart = null;
const viewerPointers = new Map();

const audio = document.getElementById('bg-audio');
const audioBtn = document.getElementById('audio-btn');
const AUDIO_TIME = 'stopazAudioTime';
const AUDIO_WANTED = 'stopazAudioWanted';


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

function clearWave(element) {
  if (!element) return;
  element.removeAttribute('aria-label');
}

function waveText(element, text) {
  if (!element || !text) return;
  clearWave(element);
  element.dataset.fullText = text;
  element.setAttribute('aria-label', text);
  element.replaceChildren();

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    element.textContent = text;
    element.dataset.waved = '1';
    return;
  }

  let wordIndex = 0;
  text.split(/(\s+)/).forEach(token => {
    if (!token) return;
    if (/^\s+$/.test(token)) {
      element.append(document.createTextNode(token));
      return;
    }
    const word = document.createElement('span');
    word.className = 'wave-word';
    word.setAttribute('aria-hidden', 'true');
    word.style.setProperty('--wave-index', String(wordIndex));
    word.textContent = token;
    element.append(word);
    wordIndex += 1;
  });
  element.dataset.waved = '1';
}

function triggerWaveWithin(container) {
  if (!container) return;
  container.querySelectorAll('.wave-text').forEach(element => {
    waveText(element, textFor(element));
  });
}

/* Catalogue order is role-driven, never position-driven.
   Sections may intentionally omit Archive (1937 and 1943). */

function normalizeArchivePanels() {
  const roleOrder = ['object', 'creator'];
  document.querySelectorAll('.exhibition-section .info-panel').forEach(panel => {
    const blocks = new Map(
      [...panel.querySelectorAll(':scope > .info-block[data-catalogue-role]')]
        .map(block => [block.dataset.catalogueRole, block])
    );
    roleOrder.forEach(role => {
      const block = blocks.get(role);
      if (block) panel.appendChild(block);
    });
  });
}

function localizedNode(tag, values, className = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.setAttribute('data-en', values.en);
  node.setAttribute('data-he', values.he);
  node.setAttribute('data-ru', values.ru);
  node.textContent = values[currentLang] || values.en;
  return node;
}

function provenanceRow(keyValues, valueNode) {
  const row = document.createElement('div');
  row.className = 'provenance-row';
  row.append(localizedNode('span', keyValues, 'provenance-key'));
  const value = document.createElement('div');
  value.className = 'provenance-value';
  if (valueNode instanceof Node) value.append(valueNode);
  else value.textContent = String(valueNode || '');
  row.append(value);
  return row;
}

function copyLocalizedText(source, className = '') {
  const span = document.createElement('span');
  if (className) span.className = className;
  ['en','he','ru'].forEach(lang => span.setAttribute(`data-${lang}`, source?.getAttribute(`data-${lang}`) || source?.textContent?.trim() || ''));
  span.textContent = span.getAttribute(`data-${currentLang}`) || span.getAttribute('data-en') || '';
  return span;
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
  let frame = 0;

  const animate = () => {
    frame = 0;
    currentX += (targetX - currentX) * 0.04;
    currentY += (targetY - currentY) * 0.04;
    ambientLight.style.setProperty('--cursor-x', `${currentX}px`);
    ambientLight.style.setProperty('--cursor-y', `${currentY}px`);
    if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
      frame = requestAnimationFrame(animate);
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(animate);
  };

  ambientLight.style.setProperty('--cursor-x', `${currentX}px`);
  ambientLight.style.setProperty('--cursor-y', `${currentY}px`);
  addEventListener('mousemove', event => {
    targetX = event.clientX;
    targetY = event.clientY;
    schedule();
  }, { passive: true });
}

/* SLOW CURATORIAL STAGGER — each gallery section behaves as one composed reveal.
   As the visitor scrolls the artwork into view, the image settles first, then
   Object -> Creator rise out in sequence when those authored roles exist. */
const ARCHIVE_STAGGER_START = 390;
const ARCHIVE_STAGGER_STEP = 175;

const artworkFocusTimers = new WeakMap();

function clearArtworkFocus(artwork) {
  if (!artwork) return;
  const timer = artworkFocusTimers.get(artwork);
  if (timer) window.clearTimeout(timer);
  artworkFocusTimers.delete(artwork);
  artwork.classList.remove('cinematic-focus');
}

function scheduleArtworkFocus(artwork, delay = 1120) {
  if (!artwork || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  clearArtworkFocus(artwork);
  const timer = window.setTimeout(() => {
    artwork.classList.add('cinematic-focus');
    artworkFocusTimers.delete(artwork);
  }, delay);
  artworkFocusTimers.set(artwork, timer);
}

function wavePanelHeader(panel, baseDelay = 205) {
  if (!panel) return;
  const targets = [
    panel.querySelector('.info-category'),
    panel.querySelector('.info-title'),
    ...panel.querySelectorAll('.info-meta .wave-text')
  ].filter(Boolean);
  targets.forEach((element, index) => {
    window.setTimeout(() => waveText(element, textFor(element)), baseDelay + (index * 72));
  });
}

function revealArchiveSection(section) {
  if (!section || section.dataset.archiveRevealed === '1') return;
  section.dataset.archiveRevealed = '1';

  const artwork = section.querySelector('.art-box');
  const panel = section.querySelector('.info-panel');
  const headerWaveTargets = [
    section.querySelector('.art-caption-title'),
    section.querySelector('.art-caption-date'),
    section.querySelector('.timeline-node')
  ].filter(Boolean);
  const blocks = [...section.querySelectorAll('.info-panel .info-block:not(.wall-archive-hidden)')];
  const history = section.querySelector('.history-panel');

  /* The artwork anchors the section, then catalogue labels, then History last. */
  artwork?.classList.add('pop-in');
  scheduleArtworkFocus(artwork);

  if (panel && !panel.classList.contains('visible')) {
    panel.classList.add('visible');
  }
  wavePanelHeader(panel);

  headerWaveTargets.forEach((element, index) => {
    window.setTimeout(() => waveText(element, textFor(element)), 150 + (index * 58));
  });

  blocks.forEach((block, index) => {
    block.classList.add('archive-stagger-block');
    block.style.setProperty('--archive-stagger-order', String(index));
    window.setTimeout(() => {
      block.classList.add('pop-in');
      triggerWaveWithin(block);
    }, ARCHIVE_STAGGER_START + (index * ARCHIVE_STAGGER_STEP));
  });

  if (history) {
    history.classList.add('archive-stagger-block');
    history.style.setProperty('--archive-stagger-order', String(Math.max(0, blocks.length - 1)));
    window.setTimeout(() => {
      history.classList.add('pop-in');
      triggerWaveWithin(history);
    }, ARCHIVE_STAGGER_START + (blocks.length * ARCHIVE_STAGGER_STEP));
  }
}

function replayArtwork(artwork) {
  if (!artwork) return;
  clearArtworkFocus(artwork);
  artwork.classList.add('pop-in');
  artwork.classList.remove('art-reenter');
  void artwork.offsetWidth;
  artwork.classList.add('art-reenter', 'art-in-view');
  scheduleArtworkFocus(artwork, 980);
  window.setTimeout(() => artwork.classList.remove('art-reenter'), 950);
}


function replayArchiveWords(section) {
  if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const panel = section.querySelector('.info-panel');
  const headerWaveTargets = [
    section.querySelector('.art-caption-title'),
    section.querySelector('.art-caption-date'),
    section.querySelector('.timeline-node')
  ].filter(Boolean);
  const blocks = [...section.querySelectorAll('.info-panel > .info-block:not(.wall-archive-hidden)')];
  const history = section.querySelector('.history-panel');

  wavePanelHeader(panel, 190);

  /* Rebuild the word spans and physically re-land the catalogue labels each time
     the visitor returns to an exhibit. This keeps every timeline record alive on
     both downward and upward scrolling rather than making later records static. */
  headerWaveTargets.forEach((element, index) => {
    window.setTimeout(() => waveText(element, textFor(element)), 145 + (index * 58));
  });

  blocks.forEach((block, index) => {
    block.classList.add('archive-stagger-block');
    window.setTimeout(() => {
      block.classList.add('pop-in');
      triggerWaveWithin(block);
    }, 375 + (index * 175));
  });
  if (history) {
    history.classList.add('archive-stagger-block');
    window.setTimeout(() => {
      history.classList.add('pop-in');
      triggerWaveWithin(history);
    }, 375 + (blocks.length * 175));
  }
}

function setupRevealObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const section = entry.target;
      const artwork = section.querySelector('.art-box');

      /* Hysteresis: do not reveal on a sliver of intersection, and do not arm a
         replay until the section has actually left the viewport. This prevents
         edge flicker while preserving replay in both scroll directions. */
      if (!entry.isIntersecting) {
        section.dataset.archiveInView = '0';
        const exitedAbove = entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top < 0;
        section.classList.toggle('archive-exit-up', exitedAbove);
        section.classList.toggle('archive-exit-down', !exitedAbove);
        clearArtworkFocus(artwork);
        artwork?.classList.remove('art-in-view', 'pop-in', 'art-reenter');
        section.querySelectorAll('.info-panel > .info-block.archive-stagger-block, .history-panel.archive-stagger-block')
          .forEach(block => block.classList.remove('pop-in'));
        return;
      }

      if (entry.intersectionRatio < 0.12) return;
      section.classList.remove('archive-exit-up', 'archive-exit-down');

      if (section.dataset.archiveInView === '1') return;
      section.dataset.archiveInView = '1';

      if (section.dataset.archiveRevealed !== '1') {
        revealArchiveSection(section);
        artwork?.classList.add('art-in-view');
      } else {
        replayArtwork(artwork);
        replayArchiveWords(section);
      }
    });
  }, { threshold: [0, 0.12], rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.exhibition-section').forEach(section => observer.observe(section));
}


function animateHeroWords(element) {
  if (!element) return;
  const text = textFor(element);
  element.dataset.fullText = text;
  element.setAttribute('aria-label', text);
  element.replaceChildren();
  let i = 0;
  text.split(/(\s+)/).forEach(token => {
    if (!token) return;
    if (/^\s+$/.test(token)) {
      element.append(document.createTextNode(token));
      return;
    }
    const span = document.createElement('span');
    span.className = 'hero-motion-word';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--hero-i', String(i++));
    span.textContent = token;
    element.append(span);
  });
}

function animateHeroLetters(element) {
  if (!element) return;
  const text = textFor(element);
  element.dataset.fullText = text;
  element.setAttribute('aria-label', text);
  element.replaceChildren();
  let i = 0;
  [...text].forEach(char => {
    if (/\s/.test(char)) {
      element.append(document.createTextNode('\u00a0'));
      return;
    }
    const span = document.createElement('span');
    span.className = 'hero-motion-char';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--hero-i', String(i++));
    span.textContent = char;
    element.append(span);
  });
}

function setupHeroReplayObserver() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  const artwork = hero.querySelector('.art-box');
  const subtitle = hero.querySelector('.hero-subtitle');
  const title = hero.querySelector('.hero-title');
  const location = hero.querySelector('.hero-location');
  let initialPlaybackDone = false;

  const playHeroOnce = () => {
    if (initialPlaybackDone) return;
    initialPlaybackDone = true;
    replayArtwork(artwork);
    animateHeroWords(subtitle);
    window.setTimeout(() => animateHeroLetters(title), 120);
    window.setTimeout(() => animateHeroWords(location), 300);
  };

  /* One entrance playback only. The former timeout + observer pair could both
     fire on initial load, making the destination gallery appear to load twice. */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        artwork?.classList.remove('art-in-view');
        return;
      }
      artwork?.classList.add('art-in-view');
      playHeroOnce();
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

  observer.observe(hero);
  window.setTimeout(playHeroOnce, 180);
}


function timelineYearFor(section) {
  const category = section.querySelector('.info-category');
  const categoryText = category?.getAttribute('data-en') || category?.textContent || '';
  const categoryYear = categoryText.match(/(?:1\d{3}|20\d{2})(?:\s*[–-]\s*\d{2,4})?/);
  if (categoryYear) return categoryYear[0].replace(/\s+/g, '');

  const dateText = [...section.querySelectorAll('.info-meta .wave-text')]
    .map(el => el.getAttribute('data-en') || el.textContent || '')
    .join(' ');
  const dateYear = dateText.match(/(?:1\d{3}|20\d{2})(?:\s*[–-]\s*\d{2,4})?/);
  if (dateYear) return dateYear[0].replace(/\s+/g, '');

  /* The two shorter era galleries are still being curated. Until final dates
     replace their preliminary metadata, use the existing chapter numeral as
     the restrained spine marker rather than inventing a date. */
  const chapter = categoryText.match(/Chapter\s+([IVX]+)/i);
  return chapter ? chapter[1].toUpperCase() : '';
}

function isEraGalleryPage() {
  return /(?:^|\/)(?:exhibition|antijudaism|antisemitism)\.html$/i.test(location.pathname);
}

function setupVerticalMuseumTimeline() {
  if (!isEraGalleryPage()) return;

  const sections = [...document.querySelectorAll('main#gallery > .exhibition-section')];
  sections.forEach((section, index) => {
    const container = section.querySelector('.exhibition-container');
    const artwork = container?.querySelector(':scope > .art-box, :scope > .exhibit-art-column > .art-box');
    const panel = container?.querySelector(':scope > .info-panel');
    if (!container || !artwork || !panel) return;

    section.classList.add('timeline-section');
    section.classList.add(index % 2 === 0 ? 'timeline-art-left' : 'timeline-art-right');

    const year = timelineYearFor(section);
    if (year) section.dataset.timelineYear = year;

    if (!container.querySelector(':scope > .timeline-marker')) {
      const marker = document.createElement('div');
      marker.className = 'timeline-marker';
      marker.setAttribute('aria-hidden', 'true');

      const node = document.createElement('span');
      node.className = 'timeline-node wave-text';
      node.setAttribute('data-en', year);
      node.setAttribute('data-he', year);
      node.setAttribute('data-ru', year);
      node.textContent = year;
      marker.appendChild(node);
      container.appendChild(marker);
    }
  });
}

function setupTimelineActiveObserver() {
  if (!isEraGalleryPage()) return;
  const sections = [...document.querySelectorAll('.exhibition-section.timeline-section')];
  if (!sections.length) return;
  let frame = 0;

  const update = () => {
    frame = 0;
    const viewportCenter = innerHeight * 0.5;
    let closest = null;
    let closestDistance = Infinity;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = section;
      }

      const progress = Math.max(0, Math.min(1, (viewportCenter - rect.top) / Math.max(rect.height, 1)));
      section.style.setProperty('--timeline-progress', `${(progress * 100).toFixed(2)}%`);

      const normalizedDistance = Math.min(1, distance / Math.max(innerHeight * 0.95, rect.height * 0.72));
      const focus = 1 - normalizedDistance;
      section.style.setProperty('--focus-opacity', (0.84 + focus * 0.16).toFixed(3));
      section.style.setProperty('--focus-brightness', (0.93 + focus * 0.07).toFixed(3));
    });

    sections.forEach(section => section.classList.toggle('timeline-active', section === closest));
  };

  const requestUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate, { passive: true });
  update();
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
    storageSet(AUDIO_TIME, String(audio.currentTime));
  }
}

function seekSavedAudioPosition() {
  if (!audio) return;
  const saved = Number.parseFloat(storageGet(AUDIO_TIME) || '0');
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
    storageSet(AUDIO_WANTED, '1');
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
  storageSet(AUDIO_WANTED, '0');
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
  storageSet(LANGUAGE_SESSION_KEY, lang);
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
    if (element.classList.contains('wave-text') && animate && (element.dataset.waved === '1' || element.closest('.visible,.hero-section'))) {
      waveText(element, text);
    } else {
      clearWave(element);
      element.textContent = text;
    }
  });
  document.querySelectorAll('[data-aria-en][data-aria-he][data-aria-ru]').forEach(element => {
    element.setAttribute('aria-label', element.getAttribute(`data-aria-${lang}`) || element.getAttribute('data-aria-en'));
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

function ensureObjectViewer() {
  const lightbox = document.getElementById('lightbox');
  const image = document.getElementById('lightbox-img');
  if (!lightbox || !image) return null;
  let stage = document.getElementById('object-viewer-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.id = 'object-viewer-stage';
    image.before(stage);
    stage.append(image);

    const toolbar = document.createElement('div');
    toolbar.className = 'viewer-toolbar';
    toolbar.innerHTML = `
      <button class="viewer-tool" type="button" data-viewer-action="out" aria-label="Zoom out" data-aria-en="Zoom out" data-aria-he="הקטנת התצוגה" data-aria-ru="Уменьшить">−</button>
      <button class="viewer-tool" type="button" data-viewer-action="reset" aria-label="Reset view" data-aria-en="Reset view" data-aria-he="איפוס התצוגה" data-aria-ru="Сбросить вид">1:1</button>
      <button class="viewer-tool" type="button" data-viewer-action="in" aria-label="Zoom in" data-aria-en="Zoom in" data-aria-he="הגדלת התצוגה" data-aria-ru="Увеличить">+</button>`;
    lightbox.append(toolbar);

    const provenance = document.createElement('details');
    provenance.className = 'viewer-provenance';
    provenance.id = 'viewer-provenance';
    const summary = document.createElement('summary');
    summary.textContent = 'ARCHIVE';
    summary.setAttribute('data-en', 'ARCHIVE');
    summary.setAttribute('data-he', 'ארכיון');
    summary.setAttribute('data-ru', 'АРХИВ');
    const panel = document.createElement('div');
    panel.className = 'viewer-provenance-panel';
    provenance.append(summary, panel);
    lightbox.append(provenance);

    toolbar.addEventListener('click', event => {
      const action = event.target.closest('[data-viewer-action]')?.dataset.viewerAction;
      if (!action) return;
      if (action === 'in') setViewerScale(viewerScale * 1.28);
      if (action === 'out') setViewerScale(viewerScale / 1.28);
      if (action === 'reset') resetObjectViewer(true);
    });

    stage.addEventListener('wheel', event => {
      if (!lightbox.classList.contains('active')) return;
      event.preventDefault();
      setViewerScale(viewerScale * (event.deltaY < 0 ? 1.16 : 0.86));
    }, { passive: false });

    stage.addEventListener('pointerdown', event => {
      if (!lightbox.classList.contains('active')) return;
      stage.setPointerCapture?.(event.pointerId);
      viewerPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (viewerPointers.size === 1) {
        viewerDragStart = { x: event.clientX, y: event.clientY, originX: viewerX, originY: viewerY };
        stage.classList.add('is-dragging');
      } else if (viewerPointers.size === 2) {
        const points = [...viewerPointers.values()];
        viewerPinchStart = { distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), scale: viewerScale };
      }
    });

    stage.addEventListener('pointermove', event => {
      if (!viewerPointers.has(event.pointerId)) return;
      viewerPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (viewerPointers.size >= 2 && viewerPinchStart) {
        const points = [...viewerPointers.values()];
        const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        setViewerScale(viewerPinchStart.scale * (distance / Math.max(viewerPinchStart.distance, 1)));
        return;
      }
      if (viewerDragStart && viewerScale > 1) {
        viewerX = viewerDragStart.originX + event.clientX - viewerDragStart.x;
        viewerY = viewerDragStart.originY + event.clientY - viewerDragStart.y;
        updateViewerTransform();
      }
    });

    const releasePointer = event => {
      viewerPointers.delete(event.pointerId);
      if (viewerPointers.size < 2) viewerPinchStart = null;
      if (!viewerPointers.size) {
        viewerDragStart = null;
        stage.classList.remove('is-dragging');
      }
    };
    stage.addEventListener('pointerup', releasePointer);
    stage.addEventListener('pointercancel', releasePointer);
    stage.addEventListener('dblclick', () => resetObjectViewer(true));
  }
  return stage;
}

function updateViewerTransform() {
  const image = document.getElementById('lightbox-img');
  if (!image) return;
  if (viewerScale <= 1.001) {
    viewerX = 0;
    viewerY = 0;
  }
  image.style.transform = `translate3d(${viewerX}px, ${viewerY}px, 0) scale(${viewerScale})`;
}

function setViewerScale(value) {
  viewerScale = Math.max(1, Math.min(6, value));
  updateViewerTransform();
}

function resetObjectViewer(animate = false) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) animate = false;
  const image = document.getElementById('lightbox-img');
  viewerScale = 1;
  viewerX = 0;
  viewerY = 0;
  viewerPointers.clear();
  viewerDragStart = null;
  viewerPinchStart = null;
  if (!image) return;
  if (animate) {
    image.style.transition = 'transform .42s cubic-bezier(.16,1,.3,1)';
    updateViewerTransform();
    window.setTimeout(() => { image.style.transition = 'none'; }, 460);
  } else {
    image.style.transition = 'none';
    updateViewerTransform();
  }
}

function populateViewerProvenance(section, sourceImage) {
  const panel = document.querySelector('.viewer-provenance-panel');
  if (!panel || !section) return;
  panel.replaceChildren();
  const record = document.createElement('div');
  record.className = 'provenance-record';
  record.style.padding = '0';
  record.style.borderTop = '0';

  const archive = section.querySelector('.archive-provenance-block .wave-p');
  if (archive) record.append(provenanceRow(
    { en: 'Source / rights', he: 'מקור / זכויות', ru: 'Источник / права' },
    copyLocalizedText(archive)
  ));
  const title = section.querySelector('.info-title');
  if (title) record.append(provenanceRow(
    { en: 'Object', he: 'אובייקט', ru: 'Объект' },
    copyLocalizedText(title)
  ));
  const date = [...section.querySelectorAll('.info-meta .wave-text')].at(-1);
  if (date) record.append(provenanceRow(
    { en: 'Date', he: 'תאריך', ru: 'Дата' },
    copyLocalizedText(date)
  ));
  const width = sourceImage?.dataset.nativeWidth || sourceImage?.getAttribute('width') || sourceImage?.naturalWidth || '';
  const height = sourceImage?.dataset.nativeHeight || sourceImage?.getAttribute('height') || sourceImage?.naturalHeight || '';
  if (width && height) {
    const value = document.createElement('span');
    value.textContent = `${width} × ${height} px`;
    record.append(provenanceRow(
      { en: 'Digital image', he: 'תמונה דיגיטלית', ru: 'Цифровое изображение' },
      value
    ));
  }
  panel.append(record);
}


function setLightboxBackgroundInert(active) {
  const lightbox = document.getElementById('lightbox');
  [...document.body.children].forEach(element => {
    if (element === lightbox || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;
    if (active) {
      if (!element.hasAttribute('inert')) {
        element.setAttribute('inert', '');
        element.dataset.lightboxInert = '1';
      }
    } else if (element.dataset.lightboxInert === '1') {
      element.removeAttribute('inert');
      delete element.dataset.lightboxInert;
    }
  });
}

function trapLightboxFocus(event, lightbox) {
  if (event.key !== 'Tab') return false;
  const selector = 'button:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])';
  const focusable = [...lightbox.querySelectorAll(selector)].filter(element => {
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  if (!focusable.length) {
    event.preventDefault();
    lightbox.focus({ preventScroll: true });
    return true;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  return false;
}

function openLightbox(button) {
  const sourceImage = button.querySelector('img');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const closeButton = document.getElementById('lightbox-close');
  if (!sourceImage || !lightbox || !lightboxImage) return;
  ensureObjectViewer();
  lightboxTrigger = button;
  const section = button.closest('.exhibition-section,.hero-section');
  const originalSource = sourceImage.getAttribute('src') || sourceImage.currentSrc;
  lightboxImage.src = originalSource;
  lightboxImage.alt = sourceImage.alt;
  const title = section?.querySelector('.info-title,.hero-title');
  const date = section ? [...section.querySelectorAll('.info-meta .wave-text')].at(-1) : null;
  if (caption) {
    caption.replaceChildren();
    const titleLine = document.createElement('span');
    titleLine.className = 'viewer-caption-title';
    titleLine.textContent = title ? textFor(title) : sourceImage.alt;
    caption.append(titleLine);
    if (date && textFor(date).trim()) {
      const dateLine = document.createElement('span');
      dateLine.className = 'viewer-caption-date';
      dateLine.textContent = textFor(date);
      caption.append(dateLine);
    }
  }
  populateViewerProvenance(section, sourceImage);
  document.getElementById('viewer-provenance')?.removeAttribute('open');
  resetObjectViewer(false);
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  setLightboxBackgroundInert(true);
  lockBodyScroll();
  closeButton?.focus({ preventScroll: true });
}

function closeLightbox(restoreFocus = true) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-img');
  if (!lightbox || !lightbox.classList.contains('active')) return;
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  setLightboxBackgroundInert(false);
  unlockBodyScroll();
  resetObjectViewer(false);
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
  setLightboxBackgroundInert(false);
  document.querySelectorAll('[aria-busy="true"]').forEach(element => element.removeAttribute('aria-busy'));
}



function setupGalleryImagePolish() {
  document.querySelectorAll('.museum-frame img').forEach(image => {
    image.classList.add('gallery-image');
    const declaredWidth = Number.parseInt(image.dataset.nativeWidth || image.getAttribute('width') || '0', 10);
    const classify = () => {
      const width = declaredWidth || image.naturalWidth || 0;
      image.classList.remove('quality-source-limited','quality-standard','quality-hires');
      if (width && width < 650) {
        image.classList.add('quality-source-limited');
        const nativeDisplay = width;
        image.style.setProperty('--native-display-max', `${nativeDisplay}px`);
      } else if (width && width < 1000) {
        image.classList.add('quality-standard');
      } else {
        image.classList.add('quality-hires');
      }
    };
    const reveal = () => {
      classify();
      requestAnimationFrame(() => image.classList.add('is-loaded'));
    };
    if (image.complete && image.naturalWidth) reveal();
    else image.addEventListener('load', reveal, { once: true });
  });
}

function setupGalleryChrome() {
  const nav = document.querySelector('.controls-nav');
  if (!nav) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    const hidden = window.scrollY > 72;
    nav.classList.toggle('chrome-hidden', hidden);
    nav.classList.remove('chrome-quiet', 'chrome-moving');
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
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
  ensureObjectViewer();
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
    if (event.target === lightbox) closeLightbox();
  });
  addEventListener('keydown', event => {
    if (!lightbox?.classList.contains('active')) return;
    if (trapLightboxFocus(event, lightbox)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setViewerScale(viewerScale * 1.25);
      return;
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      setViewerScale(viewerScale / 1.25);
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      resetObjectViewer(true);
    }
  });
}




function setupEraApertureArrival() {
  const tone = storageGet('stopaz-era-aperture-arrival');
  const image = storageGet('stopaz-era-arrival-image');
  if (!tone && !image) return;
  storageRemove('stopaz-era-aperture-arrival');
  storageRemove('stopaz-era-arrival-image');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const veil = document.createElement('div');
  veil.setAttribute('aria-hidden', 'true');
  Object.assign(veil.style, {
    position: 'fixed', inset: '0', zIndex: '5000', pointerEvents: 'none',
    background: 'rgba(11,11,14,0.72)', opacity: '1'
  });

  if (image) {
    const figure = document.createElement('div');
    Object.assign(figure.style, {
      position: 'absolute', inset: '0',
      backgroundImage: `url("${image}")`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundColor: '#111114', backgroundPosition: 'center center',
      transform: 'scale(1.035)', opacity: '1', filter: 'brightness(.78) saturate(.94)'
    });
    veil.appendChild(figure);
    document.body.appendChild(veil);
    requestAnimationFrame(() => {
      figure.animate([
        { transform: 'scale(1.035)', opacity: 1, filter: 'brightness(.78) saturate(.94)' },
        { transform: 'scale(1.085)', opacity: .08, filter: 'brightness(.9) saturate(.98)' }
      ], { duration: 920, easing: 'cubic-bezier(.22,.72,.22,1)', fill: 'forwards' });
      const animation = veil.animate([
        { opacity: 1 }, { opacity: .95, offset: .15 }, { opacity: 0 }
      ], { duration: 980, easing: 'cubic-bezier(.22,.72,.22,1)', fill: 'forwards' });
      animation.addEventListener('finish', () => veil.remove(), { once: true });
    });
    return;
  }

  document.body.appendChild(veil);
  requestAnimationFrame(() => {
    const animation = veil.animate(
      [{ opacity: 1 }, { opacity: .94, offset: .12 }, { opacity: 0 }],
      { duration: 820, easing: 'cubic-bezier(.22,.72,.22,1)', fill: 'forwards' }
    );
    animation.addEventListener('finish', () => veil.remove(), { once: true });
  });
}



function setupPageProseReplayObserver() {
  const nodes = [...document.querySelectorAll(
    '.genealogy-script, .chronology-interlude, .libel-marker, .source-antizionism-framework'
  )];
  if (!nodes.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    nodes.forEach(node => node.classList.add('page-prose-reveal', 'is-visible'));
    return;
  }

  nodes.forEach(node => node.classList.add('page-prose-reveal'));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const node = entry.target;
      if (entry.isIntersecting) {
        if (entry.intersectionRatio < 0.1) return;
        node.classList.remove('exit-up', 'exit-down');
        node.classList.add('is-visible');
        return;
      }
      node.classList.remove('is-visible');
      const exitedAbove = entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top < 0;
      node.classList.toggle('exit-up', exitedAbove);
      node.classList.toggle('exit-down', !exitedAbove);
    });
  }, { threshold: [0, 0.1], rootMargin: '-5% 0px -8% 0px' });

  nodes.forEach(node => observer.observe(node));
}

addEventListener('pagehide', saveAudioPosition);
addEventListener('pageshow', resetRestoredPage);

addEventListener('DOMContentLoaded', () => {
  resetRestoredPage();
  setupEraApertureArrival();
  normalizeArchivePanels();
  setupVerticalMuseumTimeline();
  setupAmbientLight();
  setupGalleryImagePolish();
  setupGalleryChrome();
  setupControls();
  if (storageGet(AUDIO_WANTED) === '1') startAudio();
  setupLightbox();
  setLanguage(currentLang, false);
  setupRevealObserver();
  setupTimelineActiveObserver();
  setupHeroReplayObserver();
  setupPageProseReplayObserver();
  updateAudioBtnText();
});

