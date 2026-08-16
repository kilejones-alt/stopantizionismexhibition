'use strict';

const LANGUAGE_SESSION_KEY = 'stopazSessionLanguage';
const savedLanguage = sessionStorage.getItem(LANGUAGE_SESSION_KEY);
let currentLang = ['en','he','ru'].includes(savedLanguage) ? savedLanguage : 'en';
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

function triggerPanelWave(container) {
  container.querySelectorAll('.wave-text').forEach(element => {
    waveText(element, textFor(element));
  });
}

function triggerWaveWithin(container) {
  if (!container) return;
  container.querySelectorAll('.wave-text').forEach(element => {
    waveText(element, textFor(element));
  });
}

/* THE ARCHIVE — exactly four animated object labels per image.
   Existing curatorial copy is preserved:
   What the Image is About -> Object
   Creator Bio & Context -> Creator
   Archival Source -> Archive
   History is inserted as the fourth field. */
function setArchiveHeading(heading, en, he, ru) {
  if (!heading) return;
  heading.setAttribute('data-en', en);
  heading.setAttribute('data-he', he);
  heading.setAttribute('data-ru', ru);
  heading.textContent = en;
}

function makeHistoricalSettingBlock(texts) {
  const block = document.createElement('div');
  block.className = 'info-block';
  const heading = document.createElement('h4');
  setArchiveHeading(heading, 'History', 'היסטוריה', 'История');
  const paragraph = document.createElement('p');
  paragraph.className = 'wave-p wave-text';
  paragraph.setAttribute('data-en', texts.en);
  paragraph.setAttribute('data-he', texts.he);
  paragraph.setAttribute('data-ru', texts.ru);
  paragraph.textContent = texts.en;
  block.append(heading, paragraph);
  return block;
}

function archiveSettingFor(section, index) {
  const path = location.pathname;
  const isAntizionismGallery = /(?:^|\/)exhibition\.html$/i.test(path);
  const titleElement = section.querySelector('.info-title');
  const title = titleElement?.getAttribute('data-en') || titleElement?.textContent?.trim() || '';

  if (section.getAttribute('data-empty-record') === 'true') {
    return { en: '', he: '', ru: '' };
  }

  const directHistory = section.getAttribute('data-history-en');
  if (directHistory) {
    return {
      en: directHistory,
      he: section.getAttribute('data-history-he') || directHistory,
      ru: section.getAttribute('data-history-ru') || directHistory
    };
  }

  const byTitle = {
    'The Degradation of Alfred Dreyfus': {
      en: 'Dreyfus, a Jewish French army officer, was publicly degraded on 5 January 1895 after being convicted of treason. The case became a national crisis shaped by forged evidence, political division, and antisemitic agitation.',
      he: 'דרייפוס, קצין יהודי בצבא צרפת, הושפל בפומבי ב-5 בינואר 1895 לאחר שהורשע בבגידה. הפרשה הפכה למשבר לאומי שניזון מראיות מזויפות, פילוג פוליטי ותסיסה אנטישמית.',
      ru: 'Дрейфус, еврейский офицер французской армии, был публично разжалован 5 января 1895 года после осуждения за измену. Дело превратилось в национальный кризис, связанный с поддельными доказательствами, политическим расколом и антисемитской агитацией.'
    },
    'Kishinev Massacre Elegy': {
      en: 'The April 1903 pogrom in Kishinev killed and injured Jews and destroyed homes and shops. Shapiro’s 1904 score was part of the Jewish memorial response in the United States.',
      he: 'פוגרום קישינב באפריל 1903 הרג ופצע יהודים והרס בתים וחנויות. היצירה של שפירו מ-1904 הייתה חלק מתגובת ההנצחה היהודית בארצות הברית.',
      ru: 'Кишинёвский погром апреля 1903 года привёл к гибели и ранениям евреев и разрушению домов и магазинов. Партитура Шапиро 1904 года стала частью еврейской мемориальной реакции в США.'
    },
    'Zionism as a Crocodile': {
      en: 'Published during the 1936–39 Arab Revolt, the cartoon depicts Zionism as predatory and protected by British power.',
      he: 'הקריקטורה פורסמה במהלך המרד הערבי של 1936–1939 ומציגה את הציונות ככוח טורף המוגן בידי בריטניה.',
      ru: 'Карикатура была опубликована во время Арабского восстания 1936–1939 годов и изображает сионизм как хищную силу под защитой Британии.'
    },
    'Decree Awarding Lidiya Timashuk the Order of Lenin': {
      en: 'Soviet authorities accused a group of prominent physicians, most of them Jewish, of conspiring to murder Soviet leaders. After Stalin’s death, the case collapsed and Timashuk’s award was revoked.',
      he: 'השלטונות הסובייטיים האשימו קבוצת רופאים בכירים, רובם יהודים, בקנוניה לרצוח מנהיגים סובייטיים. לאחר מות סטלין קרסה הפרשה והעיטור של טימאשוק בוטל.',
      ru: 'Советские власти обвинили группу видных врачей, большинство из которых были евреями, в заговоре с целью убийства советских руководителей. После смерти Сталина дело развалилось, а награда Тимашук была отменена.'
    },
  };

  if (byTitle[title]) return byTitle[title];
  return {
    en: isAntizionismGallery ? 'History will be added when the final object research is complete.' : 'History will be added when the final object research is complete.',
    he: 'ההיסטוריה תתווסף לאחר השלמת המחקר הסופי על הפריט.',
    ru: 'История будет добавлена после завершения окончательного исследования объекта.'
  };
}

function installArchiveStaggerStyles() {
  if (document.getElementById('archive-stagger-styles')) return;
  const style = document.createElement('style');
  style.id = 'archive-stagger-styles';
  style.textContent = `
    .info-panel > .info-block.archive-stagger-block,
    .history-panel.archive-stagger-block {
      opacity: 0;
      transform: translate(var(--archive-entry-x, 0px), 96px) scale(.94);
      filter: blur(5px);
      transition:
        opacity 1.25s cubic-bezier(.16,1,.3,1),
        transform 1.55s cubic-bezier(.16,1,.3,1),
        filter 1.35s cubic-bezier(.16,1,.3,1),
        border-color 1.2s ease,
        background 1.2s ease,
        box-shadow 1.2s ease;
      will-change: opacity, transform, filter;
    }
    .info-panel > .info-block.archive-stagger-block.pop-in,
    .history-panel.archive-stagger-block.pop-in {
      opacity: 1;
      transform: translate(0, 0) scale(1);
      filter: blur(0);
    }
    .info-panel > .info-block.archive-stagger-block.pop-in:hover,
    .info-panel > .info-block.archive-stagger-block.pop-in:active,
    .history-panel.archive-stagger-block.pop-in:hover,
    .history-panel.archive-stagger-block.pop-in:active {
      transform: translateY(-14px) scale(1.012);
    }
    @media (prefers-reduced-motion: reduce) {
      .info-panel > .info-block.archive-stagger-block,
      .history-panel.archive-stagger-block {
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function normalizeArchivePanels() {
  document.querySelectorAll('.exhibition-section').forEach((section, index) => {
    const panel = section.querySelector('.info-panel');
    if (!panel) return;
    const blocks = [...panel.querySelectorAll(':scope > .info-block')];
    if (!blocks.length) return;

    /* Preserve text while conforming labels and order to Object / Creator / History / Archive. */
    const creatorBlock = blocks[0];
    const objectBlock = blocks[1] || blocks[0];
    const archiveBlock = blocks[2] || blocks[blocks.length - 1];

    setArchiveHeading(objectBlock.querySelector('h4'), 'Object', 'אובייקט', 'Объект');
    setArchiveHeading(creatorBlock.querySelector('h4'), 'Creator', 'יוצר', 'Автор');
    setArchiveHeading(archiveBlock.querySelector('h4'), 'Archive', 'ארכיון', 'Архив');

    if (!panel.querySelector('.archive-historical-setting')) {
      const historical = makeHistoricalSettingBlock(archiveSettingFor(section, index));
      historical.classList.add('archive-historical-setting');
      archiveBlock.before(historical);
    }

    /* Catalogue fields stay beside the artwork; History becomes the interpretive field below both columns. */
    const historical = panel.querySelector('.archive-historical-setting');
    panel.appendChild(objectBlock);
    panel.appendChild(creatorBlock);
    panel.appendChild(archiveBlock);

    const container = section.querySelector('.exhibition-container');
    if (historical && container) {
      historical.classList.add('history-panel');
      container.appendChild(historical);
    }
  });
}

/* Fill the remaining reserved Antizionism position with the selected Falastin archival work. Fuentes is door-only. */
function setMultilingualText(element, en, he = en, ru = en) {
  if (!element) return;
  element.setAttribute('data-en', en);
  element.setAttribute('data-he', he);
  element.setAttribute('data-ru', ru);
  element.textContent = en;
}

function populateSelectedAntizionismWorks() {
  if (!/(?:^|\/)exhibition\.html$/i.test(location.pathname)) return;
  const reserved = [...document.querySelectorAll('.reserved-timeline-position')];
  const items = [
    {
      image: 'antizionism-5.jpg',
      alt: 'Falastin newspaper anti-Zionist crocodile cartoon, 18 June 1936',
      category: { en: 'Genealogy — Zionism and Imperial Power', he: 'גנאלוגיה — ציונות וכוח אימפריאלי', ru: 'Генеалогия — сионизм и имперская власть' },
      title: { en: 'Zionism as a Crocodile', he: 'הציונות כתנין', ru: 'Сионизм как крокодил' },
      creator: { en: 'Falastin newspaper; artist attribution varies by source', he: 'העיתון פלסטין; ייחוס האמן משתנה בין המקורות', ru: 'Газета Falastin; атрибуция художника различается по источникам' },
      date: { en: '18 June 1936', he: '18 ביוני 1936', ru: '18 июня 1936' },
      creatorText: {
        en: 'The Arabic-language newspaper Falastin published the cartoon in Jaffa on 18 June 1936.',
        he: 'העיתון הערבי פלסטין פרסם את הקריקטורה ביפו ב-18 ביוני 1936.',
        ru: 'Арабоязычная газета Falastin опубликовала карикатуру в Яффе 18 июня 1936 года.'
      },
      objectText: {
        en: 'A crocodile marked as Zionism faces Palestinian Arabs while a British officer stands above it. The crocodile says it will swallow them “peacefully.”',
        he: 'תנין המסומן כציונות ניצב מול ערבים פלסטינים בעוד קצין בריטי עומד מעליו. התנין אומר כי יבלע אותם ״בשלום״.',
        ru: 'Крокодил с надписью «сионизм» обращён к палестинским арабам, а над ним стоит британский офицер. Крокодил говорит, что проглотит их «мирно».'
      },
      archiveText: {
        en: 'National Library of Israel newspaper holdings; high-resolution reproduction also preserved on Wikimedia Commons under a CC0 public-domain dedication.',
        he: 'אוספי העיתונות של הספרייה הלאומית של ישראל; העתק ברזולוציה גבוהה נשמר גם ב-Wikimedia Commons בהקדשת CC0 לנחלת הכלל.',
        ru: 'Газетные фонды Национальной библиотеки Израиля; репродукция высокого разрешения также хранится на Wikimedia Commons с посвящением в общественное достояние CC0.'
      }
    }
  ];

  const setField = (element, field) => setMultilingualText(element, field.en, field.he, field.ru);

  reserved.forEach((section, index) => {
    const item = items[index];
    if (!item) { section.remove(); return; }
    const image = section.querySelector('.museum-frame img');
    if (image) {
      image.src = item.image;
      image.alt = item.alt;
      image.removeAttribute('onerror');
    }
    const button = section.querySelector('.art-box');
    if (button) button.setAttribute('aria-label', `Enlarge ${item.alt}`);

    setField(section.querySelector('.info-category'), item.category);
    setField(section.querySelector('.info-title'), item.title);

    const meta = section.querySelectorAll('.info-meta > div');
    if (meta[0]) {
      const strong = meta[0].querySelector('strong');
      if (strong) setMultilingualText(strong, 'Creator:', 'יוצר:', 'Автор:');
      const span = meta[0].querySelector('.wave-text');
      if (span) setField(span, item.creator);
    }
    if (meta[1]) {
      const strong = meta[1].querySelector('strong');
      if (strong) setMultilingualText(strong, 'Date:', 'תאריך:', 'Дата:');
      const span = meta[1].querySelector('.wave-text');
      if (span) setField(span, item.date);
    }

    const blocks = [...section.querySelectorAll('.info-block')];
    if (blocks[0]?.querySelector('p')) setField(blocks[0].querySelector('p'), item.creatorText);
    if (blocks[1]?.querySelector('p')) setField(blocks[1].querySelector('p'), item.objectText);
    if (blocks[2]?.querySelector('p')) setField(blocks[2].querySelector('p'), item.archiveText);
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

/* SLOW CURATORIAL STAGGER — each gallery section behaves as one composed reveal.
   As the visitor scrolls the artwork into view, the image settles first, then
   Object -> Creator -> History -> Archive rise out in sequence. */
const ARCHIVE_STAGGER_START = 340;
const ARCHIVE_STAGGER_STEP = 240;

function revealArchiveSection(section) {
  if (!section || section.dataset.archiveRevealed === '1') return;
  section.dataset.archiveRevealed = '1';

  const artwork = section.querySelector('.art-box');
  const panel = section.querySelector('.info-panel');
  const headerWaveTargets = [
    section.querySelector('.info-category'),
    section.querySelector('.info-title'),
    ...section.querySelectorAll('.info-meta .wave-text'),
    section.querySelector('.timeline-node')
  ].filter(Boolean);
  const blocks = [...section.querySelectorAll('.info-panel > .info-block')];
  const history = section.querySelector('.history-panel');

  /* The artwork anchors the section, then catalogue labels, then History last. */
  artwork?.classList.add('pop-in');

  if (panel && !panel.classList.contains('visible')) {
    panel.classList.add('visible');
  }

  headerWaveTargets.forEach(element => {
    waveText(element, textFor(element));
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
    const historyIndex = blocks.length;
    history.classList.add('archive-stagger-block');
    history.style.setProperty('--archive-stagger-order', String(historyIndex));
    window.setTimeout(() => {
      history.classList.add('pop-in');
      triggerWaveWithin(history);
    }, ARCHIVE_STAGGER_START + (historyIndex * ARCHIVE_STAGGER_STEP));
  }
}

function replayArtwork(artwork) {
  if (!artwork) return;
  artwork.classList.add('pop-in');
  artwork.classList.remove('art-reenter');
  void artwork.offsetWidth;
  artwork.classList.add('art-reenter', 'art-in-view');
  window.setTimeout(() => artwork.classList.remove('art-reenter'), 950);
}

function replayArchiveWords(section) {
  if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const headerWaveTargets = [
    section.querySelector('.info-category'),
    section.querySelector('.info-title'),
    ...section.querySelectorAll('.info-meta .wave-text'),
    section.querySelector('.timeline-node')
  ].filter(Boolean);
  const blocks = [...section.querySelectorAll('.info-panel > .info-block')];
  const history = section.querySelector('.history-panel');

  /* Rebuild the word spans each time the visitor returns to this exhibit so the
     sentence assembly is not a one-time effect. Keep the boxes themselves in
     place; only the typography performs again. */
  headerWaveTargets.forEach((element, index) => {
    window.setTimeout(() => waveText(element, textFor(element)), index * 55);
  });

  blocks.forEach((block, index) => {
    window.setTimeout(() => triggerWaveWithin(block), 180 + (index * 150));
  });
  if (history) {
    window.setTimeout(() => triggerWaveWithin(history), 180 + (blocks.length * 150));
  }
}

function setupRevealObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const section = entry.target;

      const artwork = section.querySelector('.art-box');

      if (!entry.isIntersecting) {
        section.dataset.archiveInView = '0';
        artwork?.classList.remove('art-in-view');
        return;
      }

      /* IntersectionObserver fires for entrances from either direction. Leaving
         the section arms both the typography and artwork so scrolling up or down
         through the same exhibit replays the complete gallery movement. */
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
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.exhibition-section').forEach(section => observer.observe(section));
}


function setupHeroReplayObserver() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;
  const artwork = hero.querySelector('.art-box');

  const replayHero = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      artwork?.classList.add('pop-in');
      hero.querySelectorAll('.wave-text').forEach(element => {
        element.textContent = textFor(element);
      });
      return;
    }

    replayArtwork(artwork);
    const targets = [...hero.querySelectorAll('.wave-text')];
    targets.forEach((element, index) => {
      window.setTimeout(() => waveText(element, textFor(element)), index * 95);
    });
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        hero.dataset.heroInView = '0';
        artwork?.classList.remove('art-in-view');
        return;
      }
      if (hero.dataset.heroInView === '1') return;
      hero.dataset.heroInView = '1';
      replayHero();
    });
  }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });

  observer.observe(hero);
}


function timelineYearFor(section) {
  const category = section.querySelector('.info-category');
  const categoryText = category?.getAttribute('data-en') || category?.textContent || '';
  const categoryYear = categoryText.match(/(?:18|19|20)\d{2}(?:\s*[–-]\s*\d{2,4})?/);
  if (categoryYear) return categoryYear[0].replace(/\s+/g, '');

  const dateText = [...section.querySelectorAll('.info-meta .wave-text')]
    .map(el => el.getAttribute('data-en') || el.textContent || '')
    .join(' ');
  const dateYear = dateText.match(/(?:18|19|20)\d{2}(?:\s*[–-]\s*\d{2,4})?/);
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
    const artwork = container?.querySelector(':scope > .art-box');
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

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('timeline-active', entry.isIntersecting);
    });
  }, { threshold: 0, rootMargin: '-38% 0px -38% 0px' });

  sections.forEach(section => observer.observe(section));
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
  sessionStorage.setItem(LANGUAGE_SESSION_KEY, lang);
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



function setupGalleryImagePolish() {
  document.querySelectorAll('.museum-frame img').forEach(image => {
    image.classList.add('gallery-image');
    const declaredWidth = Number.parseInt(image.dataset.nativeWidth || image.getAttribute('width') || '0', 10);
    const classify = () => {
      const width = declaredWidth || image.naturalWidth || 0;
      image.classList.remove('quality-source-limited','quality-standard','quality-hires');
      if (width && width < 650) {
        image.classList.add('quality-source-limited');
        const nativeDisplay = Math.min(720, Math.max(width, Math.round(width * 1.55)));
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
  let settleTimer = 0;
  const updateQuietState = () => {
    nav.classList.toggle('chrome-quiet', window.scrollY > 90);
  };
  const onScroll = () => {
    updateQuietState();
    if (window.scrollY > 90) nav.classList.add('chrome-moving');
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => nav.classList.remove('chrome-moving'), 320);
  };
  updateQuietState();
  addEventListener('scroll', onScroll, { passive: true });
  nav.addEventListener('pointerenter', () => nav.classList.remove('chrome-moving'));
  nav.addEventListener('focusin', () => nav.classList.remove('chrome-moving'));
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


addEventListener('pagehide', saveAudioPosition);
addEventListener('pageshow', resetRestoredPage);

addEventListener('DOMContentLoaded', () => {
  resetRestoredPage();
  installArchiveStaggerStyles();
  populateSelectedAntizionismWorks();
  normalizeArchivePanels();
  setupVerticalMuseumTimeline();
  setupAmbientLight();
  setupGalleryImagePolish();
  setupGalleryChrome();
  setupControls();
  setupLightbox();
  setLanguage(currentLang, false);
  setupRevealObserver();
  setupTimelineActiveObserver();
  setupHeroReplayObserver();
  updateAudioBtnText();
});
