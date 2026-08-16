'use strict';

const LANGUAGE_SESSION_KEY = 'stopazSessionLanguage';
const savedLanguage = sessionStorage.getItem(LANGUAGE_SESSION_KEY);
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
const chronologyItemsBySection = new Map();
let chronologyCurrentButton = null;
let chronologyActiveSection = null;

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

function installGalleryClarityStyles() {
  if (document.getElementById('gallery-clarity-styles')) return;
  const style = document.createElement('style');
  style.id = 'gallery-clarity-styles';
  style.textContent = `
    /* Keep one chronology: the central spine. Remove secondary rails/dots attached to catalogue boxes. */
    .info-panel::before,
    .info-block::before,
    .info-block::after,
    .timeline-art-right .info-panel::before,
    .timeline-art-right .info-panel > .info-block::before,
    .timeline-art-right .info-panel > .info-block::after { display:none!important; content:none!important; }

    /* Catalogue boxes should read as labels, not mini timelines. */
    .info-panel > .info-block,
    .history-panel { flex-shrink:0; }
    .info-category,.info-title,.info-meta { flex-shrink:0; }
    .info-panel > .info-block { border-left-color:rgba(255,255,255,.045)!important; }
    .timeline-art-right .info-panel > .info-block { border-right-color:rgba(255,255,255,.045)!important; }

    .info-title { position:relative; z-index:2; margin-bottom:.3rem!important; }
    .info-meta { position:relative; z-index:1; margin-top:.05rem; }
    .info-title.title-long { font-size:clamp(1.62rem,2.05vw,1.96rem)!important; line-height:1.04!important; }
    .info-title.title-very-long { font-size:clamp(1.45rem,1.82vw,1.78rem)!important; line-height:1.04!important; }

    /* The entire artwork is the museum-viewer affordance; the tiny + remains secondary. */
    .exhibit-image-button { cursor:zoom-in!important; }
    #object-viewer-stage { cursor:grab!important; }
    #object-viewer-stage.is-dragging { cursor:grabbing!important; }

    @media(min-width:851px){
      .info-panel.is-tight .info-block{padding:.58rem .78rem .62rem!important}
      .info-panel.is-tighter .info-block{padding:.46rem .7rem .5rem!important}
      .info-panel.is-tight .info-block h4,.info-panel.is-tighter .info-block h4{font-size:.7rem!important;margin-bottom:.18rem!important}
      .info-panel.is-tight .wave-p{font-size:.88rem!important;line-height:1.36!important}
      .info-panel.is-tighter .wave-p{font-size:.84rem!important;line-height:1.32!important}
      .info-panel.is-tight .history-panel,.info-panel.is-tighter .history-panel{min-height:54px!important}
      .info-panel.is-ultra-tight{gap:.22rem!important}
      .info-panel.is-ultra-tight .info-title{font-size:clamp(1.34rem,1.7vw,1.62rem)!important;line-height:1.02!important;padding-bottom:.26rem!important;margin-bottom:.12rem!important}
      .info-panel.is-ultra-tight .info-meta{font-size:.82rem!important;line-height:1.22!important;gap:.08rem!important}
      .info-panel.is-ultra-tight .info-block{padding:.3rem .62rem .34rem!important;margin-top:.04rem!important}
      .info-panel.is-ultra-tight .info-block h4{font-size:.64rem!important;margin-bottom:.12rem!important;letter-spacing:.11em!important}
      .info-panel.is-ultra-tight .wave-p{font-size:.78rem!important;line-height:1.24!important;min-height:0!important}
      .info-panel.is-ultra-tight .history-panel{min-height:34px!important;padding:.3rem .62rem .34rem!important}
    }
  `;
  document.head.appendChild(style);
}

function classifyGalleryTitles() {
  document.querySelectorAll('.info-title').forEach(title => {
    const text = title.getAttribute('data-en') || title.textContent || '';
    title.classList.toggle('title-long', text.length >= 38 && text.length < 56);
    title.classList.toggle('title-very-long', text.length >= 56);
  });
}

function normalizeArchivePanels() {
  document.querySelectorAll('.exhibition-section').forEach((section, index) => {
    const panel = section.querySelector('.info-panel');
    if (!panel) return;
    const blocks = [...panel.querySelectorAll(':scope > .info-block')];
    if (!blocks.length) return;

    /* Preserve text while conforming labels and order to Object / Creator / Archive; History sits below the catalogue panel. */
    const creatorBlock = blocks[0];
    const objectBlock = blocks[1] || blocks[0];
    const archiveBlock = blocks[2] || blocks[blocks.length - 1];

    setArchiveHeading(objectBlock.querySelector('h4'), 'Object', 'אובייקט', 'Объект');
    setArchiveHeading(creatorBlock.querySelector('h4'), 'Creator', 'יוצר', 'Автор');
    setArchiveHeading(archiveBlock.querySelector('h4'), 'Archive', 'ארכיון', 'Архив');
    /* Archive remains in the DOM as the provenance source for the museum viewer,
       but it is no longer a wall box. */
    archiveBlock.classList.add('wall-archive-hidden');

    if (!panel.querySelector('.archive-historical-setting')) {
      const historical = makeHistoricalSettingBlock(archiveSettingFor(section, index));
      historical.classList.add('archive-historical-setting');
      archiveBlock.before(historical);
    }

    /* Catalogue fields stay beside the artwork; History sits in the curatorial column after Archive. */
    const historical = panel.querySelector('.archive-historical-setting');
    panel.appendChild(objectBlock);
    panel.appendChild(creatorBlock);
    panel.appendChild(archiveBlock);

    if (historical) {
      historical.classList.add('history-panel');
      panel.appendChild(historical);
    }
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

function enhanceArchiveProvenance() {
  document.querySelectorAll('.exhibition-section').forEach(section => {
    if (section.getAttribute('data-empty-record') === 'true') return;
    const blocks = [...section.querySelectorAll('.info-panel > .info-block:not(.wall-archive-hidden)')];
    const archiveBlock = blocks.find(block => (block.querySelector('h4')?.getAttribute('data-en') || block.querySelector('h4')?.textContent || '').trim() === 'Archive');
    if (!archiveBlock || archiveBlock.querySelector('.archive-drawer')) return;

    const heading = archiveBlock.querySelector('h4');
    const sourceParagraph = archiveBlock.querySelector('.wave-p');
    if (!heading || !sourceParagraph) return;

    archiveBlock.classList.add('archive-provenance-block');
    const details = document.createElement('details');
    details.className = 'archive-drawer';
    const summary = document.createElement('summary');
    summary.append(localizedNode('span', { en: 'Archive', he: 'ארכיון', ru: 'Архив' }));
    details.append(summary);

    const record = document.createElement('div');
    record.className = 'provenance-record';
    record.append(provenanceRow(
      { en: 'Source / rights', he: 'מקור / זכויות', ru: 'Источник / права' },
      sourceParagraph
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

    const image = section.querySelector('.museum-frame img');
    const width = image?.dataset.nativeWidth || image?.getAttribute('width') || '';
    const height = image?.dataset.nativeHeight || image?.getAttribute('height') || '';
    if (width && height) {
      const dimensions = document.createElement('span');
      dimensions.textContent = `${width} × ${height} px`;
      record.append(provenanceRow(
        { en: 'Digital image', he: 'תמונה דיגיטלית', ru: 'Цифровое изображение' },
        dimensions
      ));
    }

    details.append(record);
    archiveBlock.append(details);
    details.addEventListener('toggle', () => {
      if (details.open) window.setTimeout(() => triggerWaveWithin(record), 45);
    });
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
   Object -> Creator -> Archive rise out in sequence; History follows beneath them. */
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
  const blocks = [...section.querySelectorAll('.info-panel > .info-block:not(.wall-archive-hidden)')];
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
    history.classList.add('archive-stagger-block');
    history.style.setProperty('--archive-stagger-order', String(Math.max(0, blocks.length - 1)));
    window.setTimeout(() => {
      history.classList.add('pop-in');
      triggerWaveWithin(history);
      scheduleHistoryFit();
    }, 560);
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


function outerHeightWithMargins(node) {
  if (!node) return 0;
  const style = window.getComputedStyle(node);
  return node.getBoundingClientRect().height + parseFloat(style.marginTop || 0) + parseFloat(style.marginBottom || 0);
}

function fitHistoryPanels() {
  document.querySelectorAll('.exhibition-section').forEach(section => {
    const panel = section.querySelector('.info-panel');
    const history = panel?.querySelector('.history-panel');
    const artwork = section.querySelector('.art-box');
    if (!panel || !history || !artwork) return;

    panel.classList.remove('is-tight', 'is-tighter', 'is-ultra-tight');
    panel.style.removeProperty('--art-height');
    history.style.removeProperty('max-height');
    history.style.removeProperty('overflow-y');

    if (window.innerWidth <= 850) return;

    const artHeight = artwork.getBoundingClientRect().height;
    if (!artHeight) return;
    panel.style.setProperty('--art-height', `${artHeight}px`);

    const measureAvailable = () => {
      const siblings = [...panel.children].filter(child => child !== history);
      const used = siblings.reduce((sum, child) => sum + outerHeightWithMargins(child), 0);
      const gapValue = parseFloat(window.getComputedStyle(panel).gap || '0') || 0;
      const totalGaps = gapValue * Math.max(0, panel.children.length - 1);
      return Math.floor(artHeight - used - totalGaps - 12);
    };

    let available = measureAvailable();
    if (available < 112) {
      panel.classList.add('is-tight');
      available = measureAvailable();
    }
    if (available < 92) {
      panel.classList.add('is-tighter');
      available = measureAvailable();
    }
    if (available < 62) {
      panel.classList.add('is-ultra-tight');
      available = measureAvailable();
    }

    /* History remains present but its physical bottom is clamped to the artwork frame. */
    const historyTop = history.getBoundingClientRect().top;
    const artBottom = artwork.getBoundingClientRect().bottom;
    const exactAvailable = Math.max(18, Math.floor(artBottom - historyTop - 2));
    history.style.maxHeight = `${Math.min(available, exactAvailable)}px`;
    history.style.overflowY = 'auto';
  });
}

function scheduleHistoryFit() {
  window.requestAnimationFrame(() => {
    fitHistoryPanels();
    window.setTimeout(fitHistoryPanels, 120);
    window.setTimeout(fitHistoryPanels, 420);
  });
}

function replayArchiveWords(section) {
  if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const headerWaveTargets = [
    section.querySelector('.info-category'),
    section.querySelector('.info-title'),
    ...section.querySelectorAll('.info-meta .wave-text'),
    section.querySelector('.timeline-node')
  ].filter(Boolean);
  const blocks = [...section.querySelectorAll('.info-panel > .info-block:not(.wall-archive-hidden)')];
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


function installHeroMotionStyles() {
  if (document.getElementById('hero-motion-fix-styles')) return;
  const style = document.createElement('style');
  style.id = 'hero-motion-fix-styles';
  style.textContent = `
    .hero-motion-word,
    .hero-motion-char {
      display: inline-block;
      opacity: 0;
      will-change: transform, opacity, filter;
      transform-origin: 50% 100%;
    }
    .hero-motion-word {
      animation: heroWordDrop 920ms cubic-bezier(.16,1,.3,1) forwards;
      animation-delay: calc(var(--hero-i) * 58ms);
    }
    .hero-motion-char {
      animation: heroCharDrop 760ms cubic-bezier(.16,1,.3,1) forwards;
      animation-delay: calc(var(--hero-i) * 38ms);
    }
    @keyframes heroWordDrop {
      0% { opacity: 0; transform: translateY(1.15em) rotateX(-42deg); filter: blur(7px); }
      58% { opacity: 1; transform: translateY(-.08em) rotateX(5deg); filter: blur(.5px); }
      100% { opacity: 1; transform: none; filter: none; }
    }
    @keyframes heroCharDrop {
      0% { opacity: 0; transform: translateY(.95em) rotateX(-48deg); filter: blur(6px); }
      62% { opacity: 1; transform: translateY(-.07em) rotateX(4deg); filter: blur(.35px); }
      100% { opacity: 1; transform: none; filter: none; }
    }
  `;
  document.head.appendChild(style);
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
  installHeroMotionStyles();

  const artwork = hero.querySelector('.art-box');
  const subtitle = hero.querySelector('.hero-subtitle');
  const title = hero.querySelector('.hero-title');
  const location = hero.querySelector('.hero-location');
  let heroInView = false;
  let lastReplay = 0;

  const replayHero = () => {
    const now = performance.now();
    if (now - lastReplay < 450) return;
    lastReplay = now;

    replayArtwork(artwork);
    animateHeroWords(subtitle);
    window.setTimeout(() => animateHeroLetters(title), 170);
    window.setTimeout(() => animateHeroWords(location), 430);
  };

  /* Explicit initial playback. This avoids the previous race where the hero
     could already be visible before IntersectionObserver delivered its first
     useful callback. */
  window.setTimeout(replayHero, 520);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        heroInView = false;
        artwork?.classList.remove('art-in-view');
        return;
      }
      if (heroInView) return;
      heroInView = true;
      replayHero();
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

  observer.observe(hero);
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

function updateChronologyActive(section) {
  if (!section || chronologyActiveSection === section) return;
  chronologyActiveSection = section;
  chronologyItemsBySection.forEach((button, itemSection) => {
    const active = itemSection === section;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  if (chronologyCurrentButton) chronologyCurrentButton.textContent = section.dataset.timelineYear || '';
}

function setupChronologyNavigator() {
  if (!isEraGalleryPage() || document.querySelector('.chronology-rail')) return;
  const sections = [...document.querySelectorAll('.timeline-section')].filter(section => section.dataset.timelineYear);
  if (!sections.length) return;

  const nav = document.createElement('nav');
  nav.className = 'chronology-rail';
  nav.setAttribute('aria-label', 'Exhibition chronology');

  chronologyCurrentButton = document.createElement('button');
  chronologyCurrentButton.className = 'chronology-current';
  chronologyCurrentButton.type = 'button';
  chronologyCurrentButton.setAttribute('aria-label', 'Chronology');
  chronologyCurrentButton.textContent = sections[0].dataset.timelineYear;
  nav.append(chronologyCurrentButton);

  const list = document.createElement('div');
  list.className = 'chronology-list';
  sections.forEach(section => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chronology-item';
    button.textContent = section.dataset.timelineYear;
    button.setAttribute('aria-label', section.dataset.timelineYear);
    button.addEventListener('click', () => {
      nav.classList.remove('is-open');
      section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    });
    chronologyItemsBySection.set(section, button);
    list.append(button);
  });
  nav.append(list);
  document.body.append(nav);

  chronologyCurrentButton.addEventListener('click', event => {
    event.stopPropagation();
    nav.classList.toggle('is-open');
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target)) nav.classList.remove('is-open');
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
    if (closest) updateChronologyActive(closest);
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
      <button class="viewer-tool" type="button" data-viewer-action="out" aria-label="Zoom out">−</button>
      <button class="viewer-tool" type="button" data-viewer-action="reset" aria-label="Reset view">1:1</button>
      <button class="viewer-tool" type="button" data-viewer-action="in" aria-label="Zoom in">+</button>`;
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
  document.querySelector('main')?.setAttribute('inert', '');
  document.querySelector('.controls-nav')?.setAttribute('inert', '');
  lockBodyScroll();
  closeButton?.focus({ preventScroll: true });
}

function closeLightbox(restoreFocus = true) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-img');
  if (!lightbox || !lightbox.classList.contains('active')) return;
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  document.querySelector('main')?.removeAttribute('inert');
  document.querySelector('.controls-nav')?.removeAttribute('inert');
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
  document.querySelector('main')?.removeAttribute('inert');
  document.querySelector('.controls-nav')?.removeAttribute('inert');
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
  const update = () => {
    const hidden = window.scrollY > 72;
    nav.classList.toggle('chrome-hidden', hidden);
    nav.classList.remove('chrome-quiet', 'chrome-moving');
    if (hidden) nav.setAttribute('inert', '');
    else nav.removeAttribute('inert');
  };
  update();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update, { passive: true });
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
  const tone = sessionStorage.getItem('stopaz-era-aperture-arrival');
  const image = sessionStorage.getItem('stopaz-era-arrival-image');
  if (!tone && !image) return;
  sessionStorage.removeItem('stopaz-era-aperture-arrival');
  sessionStorage.removeItem('stopaz-era-arrival-image');

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
      backgroundImage: `url("${image}")`, backgroundSize: 'cover', backgroundPosition: 'center center',
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

addEventListener('pagehide', saveAudioPosition);
addEventListener('pageshow', resetRestoredPage);

addEventListener('DOMContentLoaded', () => {
  setupEraApertureArrival();
  resetRestoredPage();
  installArchiveStaggerStyles();
  installGalleryClarityStyles();
  classifyGalleryTitles();
  populateSelectedAntizionismWorks();
  normalizeArchivePanels();
  scheduleHistoryFit();
  enhanceArchiveProvenance();
  setupVerticalMuseumTimeline();
  setupChronologyNavigator();
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

window.addEventListener('resize', scheduleHistoryFit);
window.addEventListener('load', scheduleHistoryFit);
