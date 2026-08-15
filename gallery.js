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
  const isAntizionismGallery = /(?:^|\/)exhibition\.html$/i.test(location.pathname);
  if (!isAntizionismGallery) {
    return {
      en: 'Historical context will be added with the final object research, including the circumstances of production, intended audience, controversy and place within the wider history.',
      he: 'ההקשר ההיסטורי יתווסף עם השלמת המחקר על הפריט, לרבות נסיבות יצירתו, קהל היעד, המחלוקת שאליה השתייך ומקומו בהיסטוריה הרחבה יותר.',
      ru: 'Исторический контекст будет добавлен после завершения исследования объекта, включая обстоятельства его создания, предполагаемую аудиторию, связанную с ним полемику и его место в более широкой истории.'
    };
  }
  const custom = [
    {
      en: 'Created in Mandatory Palestine during the Second World War, when left-Zionist labor movements publicly identified with the Soviet anti-fascist struggle. The object belongs to the prehistory of the later rupture between Soviet state politics and Zionism.',
      he: 'הפריט נוצר בארץ ישראל המנדטורית בזמן מלחמת העולם השנייה, כאשר תנועות עבודה ציוניות־שמאליות הזדהו בפומבי עם המאבק האנטי־פשיסטי הסובייטי. הוא שייך לפרק שקדם לקרע המאוחר יותר בין מדיניות המדינה הסובייטית לציונות.',
      ru: 'Объект был создан в подмандатной Палестине во время Второй мировой войны, когда левые сионистские рабочие движения публично отождествляли себя с советской антифашистской борьбой. Он относится к предыстории последующего разрыва между советской государственной политикой и сионизмом.'
    },
    {
      en: 'Produced in the political world that followed the 1967 war, when Palestinian revolutionary organizations increasingly framed armed struggle through anti-imperialist and anti-colonial language. Posters were designed for mobilization as well as international circulation.',
      he: 'הפריט נוצר בעולם הפוליטי שלאחר מלחמת 1967, כאשר ארגונים מהפכניים פלסטיניים תיארו יותר ויותר את המאבק המזוין בשפה אנטי־אימפריאליסטית ואנטי־קולוניאלית. הכרזות נועדו הן לגיוס והן להפצה בינלאומית.',
      ru: 'Объект возник в политической среде после войны 1967 года, когда палестинские революционные организации всё чаще описывали вооружённую борьбу языком антиимпериализма и антиколониализма. Плакаты предназначались и для мобилизации, и для международного распространения.'
    },
    {
      en: 'Made during the Israel–Hamas war that followed October 7, 2023, this work circulated inside a mass protest environment in which images linked Palestinian suffering to American military and political support for Israel.',
      he: 'היצירה נוצרה במהלך מלחמת ישראל–חמאס שלאחר 7 באוקטובר 2023 והופצה בתוך סביבת מחאה המונית שבה דימויים קשרו את הסבל הפלסטיני לתמיכה הצבאית והפוליטית האמריקאית בישראל.',
      ru: 'Работа была создана во время войны Израиля и ХАМАС, начавшейся после 7 октября 2023 года, и распространялась в среде массовых протестов, где палестинские страдания связывались с американской военной и политической поддержкой Израиля.'
    },
    {
      en: 'Published in the early Soviet anti-religious campaign, before mature Soviet antizionism. Its fusion of Judaism, moneylending, capitalism and hidden economic power preserves visual stereotypes that later Soviet “Zionology” could redirect toward the figure of the Zionist.',
      he: 'הפריט פורסם בשלב המוקדם של המערכה הסובייטית נגד הדת, לפני התגבשות האנטי־ציונות הסובייטית המאוחרת. החיבור בין יהדות, הלוואה בריבית, קפיטליזם וכוח כלכלי נסתר משמר סטריאוטיפים חזותיים שאותם יכלה ה״ציונולוגיה״ הסובייטית המאוחרת להסיט אל דמות ה״ציוני״.',
      ru: 'Опубликованный в ранний период советской антирелигиозной кампании, до зрелого советского антисионизма, этот образ соединяет иудаизм, ростовщичество, капитализм и скрытую экономическую власть. Такие визуальные стереотипы позднейшая советская «сионология» могла перенаправить на фигуру «сиониста».'
    },
    {
      en: 'Published during the 1936–39 Arab Revolt under the British Mandate. The cartoon casts Zionism as a predatory crocodile protected by British authority, visually joining Zionism to imperial power decades before settler-colonial language became standard.',
      he: 'הקריקטורה פורסמה במהלך המרד הערבי של 1936–1939 תחת המנדט הבריטי. היא מציגה את הציונות כתנין טורף המוגן בידי השלטון הבריטי, ובכך קושרת חזותית את הציונות לכוח אימפריאלי עשרות שנים לפני שהשפה של קולוניאליזם התיישבותי נעשתה מקובלת.',
      ru: 'Карикатура была опубликована во время Арабского восстания 1936–1939 годов при британском мандате. Сионизм изображён как хищный крокодил, защищаемый британской властью, что визуально связывает сионизм с имперской силой задолго до распространения языка поселенческого колониализма.'
    },
    {
      en: 'Created two years after UN General Assembly Resolution 3379 declared Zionism “a form of racism and racial discrimination.” The print translates that international political formula into the visual language of American movement graphics.',
      he: 'ההדפס נוצר שנתיים לאחר שהחלטה 3379 של העצרת הכללית של האו״ם הכריזה כי הציונות היא ״צורה של גזענות ואפליה גזעית״. הוא מתרגם את הנוסחה הפוליטית הבינלאומית הזאת לשפה החזותית של גרפיקה תנועתית אמריקאית.',
      ru: 'Работа создана через два года после того, как резолюция 3379 Генеральной Ассамблеи ООН объявила сионизм «формой расизма и расовой дискриминации». Оттиск переводит эту международную политическую формулу на язык американской активистской графики.'
    }
  ];
  return custom[index] || {
    en: 'This object is presented within the political, institutional and visual circumstances in which it was produced and circulated.',
    he: 'הפריט מוצג בתוך הנסיבות הפוליטיות, המוסדיות והחזותיות שבהן נוצר והופץ.',
    ru: 'Объект представлен в политических, институциональных и визуальных обстоятельствах, в которых он был создан и распространялся.'
  };
}
function installArchiveStaggerStyles() {
  if (document.getElementById('archive-stagger-styles')) return;
  const style = document.createElement('style');
  style.id = 'archive-stagger-styles';
  style.textContent = `
    .info-panel > .info-block.archive-stagger-block {
      opacity: 0;
      transform: translateY(44px) scale(.965);
      filter: blur(2.4px);
      transition:
        opacity 1.55s cubic-bezier(.16,1,.3,1),
        transform 1.95s cubic-bezier(.16,1,.3,1),
        filter 1.65s cubic-bezier(.16,1,.3,1),
        border-color 1.5s ease,
        background 1.5s ease,
        box-shadow 1.5s ease;
      will-change: opacity, transform, filter;
    }
    .info-panel > .info-block.archive-stagger-block.pop-in {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
    .info-panel > .info-block.archive-stagger-block.pop-in:hover,
    .info-panel > .info-block.archive-stagger-block.pop-in:active {
      transform: translateY(-8px) scale(1.025);
    }
    @media (prefers-reduced-motion: reduce) {
      .info-panel > .info-block.archive-stagger-block {
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

    /* Put the four fields in the requested museum order without discarding any existing copy. */
    const historical = panel.querySelector('.archive-historical-setting');
    panel.appendChild(objectBlock);
    panel.appendChild(creatorBlock);
    if (historical) panel.appendChild(historical);
    panel.appendChild(archiveBlock);
  });
}

/* Fill the reserved Antizionism positions with the selected archival works.
   The Falastin source image is supplied alongside this script; the Fuentes print loads from the Smithsonian image service so the complete artwork remains visible. */
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
        en: 'Falastin was an Arabic-language Palestinian newspaper published in Jaffa. The image appeared during the Arab Revolt under the British Mandate and belongs to the newspaper’s political visual culture.',
        he: 'פלסטין היה עיתון פלסטיני בשפה הערבית שיצא לאור ביפו. הדימוי הופיע במהלך המרד הערבי תחת המנדט הבריטי ושייך לתרבות החזותית הפוליטית של העיתון.',
        ru: 'Falastin была палестинской арабоязычной газетой, издававшейся в Яффе. Изображение появилось во время Арабского восстания при британском мандате и относится к политической визуальной культуре газеты.'
      },
      objectText: {
        en: 'A British officer stands over a crocodile labelled as Zionism. The crocodile tells Palestinian Arabs not to fear because it will swallow them “peacefully,” representing Zionism as predatory while protected by British power.',
        he: 'קצין בריטי ניצב מעל תנין המסומן כציונות. התנין אומר לערבים הפלסטינים שלא לפחד משום שהוא יבלע אותם ״בשלום״, וכך מציג את הציונות ככוח טורף המוגן בידי בריטניה.',
        ru: 'Британский офицер стоит над крокодилом, обозначенным как сионизм. Крокодил говорит палестинским арабам не бояться, потому что проглотит их «мирно», изображая сионизм хищной силой под защитой Британии.'
      },
      archiveText: {
        en: 'National Library of Israel newspaper holdings; high-resolution reproduction also preserved on Wikimedia Commons under a CC0 public-domain dedication.',
        he: 'אוספי העיתונות של הספרייה הלאומית של ישראל; העתק ברזולוציה גבוהה נשמר גם ב-Wikimedia Commons בהקדשת CC0 לנחלת הכלל.',
        ru: 'Газетные фонды Национальной библиотеки Израиля; репродукция высокого разрешения также хранится на Wikimedia Commons с посвящением в общественное достояние CC0.'
      }
    },
    {
      image: 'antizionism-6.jpg',
      alt: 'Juan Fuentes, Zionism is Racism, 1977',
      category: { en: 'Racism — Post-Resolution 3379', he: 'גזענות — לאחר החלטה 3379', ru: 'Расизм — после резолюции 3379' },
      title: { en: 'Zionism is Racism', he: 'ציונות היא גזענות', ru: 'Сионизм — это расизм' },
      creator: { en: 'Juan Fuentes', he: 'חואן פואנטס', ru: 'Хуан Фуэнтес' },
      date: { en: '1977', he: '1977', ru: '1977' },
      creatorText: {
        en: 'Juan Fuentes is an American printmaker and graphic artist associated with socially engaged and movement-based print culture. This offset print translated a major international political slogan into a stark red-and-black graphic.',
        he: 'חואן פואנטס הוא אמן הדפס וגרפיקה אמריקאי המזוהה עם תרבות הדפס חברתית ותנועתית. הדפס אופסט זה תרגם סיסמה פוליטית בינלאומית מרכזית לשפה גרפית חדה באדום ושחור.',
        ru: 'Хуан Фуэнтес — американский график и мастер печатной графики, связанный с социально ангажированной активистской культурой. Этот офсетный оттиск перевёл важный международный политический лозунг в резкий красно-чёрный визуальный язык.'
      },
      objectText: {
        en: 'A group of figures is rendered in high-contrast red and black beneath the slogan “Zionism is Racism,” turning the post-1975 political equation into a compact visual statement.',
        he: 'קבוצת דמויות מוצגת בניגודיות גבוהה של אדום ושחור מתחת לסיסמה ״ציונות היא גזענות״, והופכת את המשוואה הפוליטית שלאחר 1975 להצהרה חזותית תמציתית.',
        ru: 'Группа фигур выполнена в высококонтрастной красно-чёрной гамме под лозунгом «Сионизм — это расизм», превращая политическую формулу после 1975 года в компактное визуальное высказывание.'
      },
      archiveText: {
        en: 'Smithsonian American Art Museum, object 2019.54.2, Gift of Lincoln Cushing / Docs Populi. The museum records the artwork as ©1977 Juan R. Fuentes; permission or a documented fair-use basis should be confirmed for public exhibition.',
        he: 'מוזיאון סמית׳סוניאן לאמנות אמריקאית, פריט 2019.54.2, מתנת Lincoln Cushing / Docs Populi. המוזיאון מציין את היצירה כ-©1977 Juan R. Fuentes; לפני הצגה פומבית יש לאשר רשות שימוש או בסיס מתועד לשימוש הוגן.',
        ru: 'Smithsonian American Art Museum, объект 2019.54.2, дар Lincoln Cushing / Docs Populi. Музей указывает ©1977 Juan R. Fuentes; для публичной экспозиции следует подтвердить разрешение либо документированное основание добросовестного использования.'
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
const ARCHIVE_STAGGER_START = 520;
const ARCHIVE_STAGGER_STEP = 560;

function revealArchiveSection(section) {
  if (!section || section.dataset.archiveRevealed === '1') return;
  section.dataset.archiveRevealed = '1';

  const artwork = section.querySelector('.art-box');
  const panel = section.querySelector('.info-panel');
  const blocks = [...section.querySelectorAll('.info-panel > .info-block')];

  /* The artwork is the visual anchor: let it arrive before the wall labels. */
  artwork?.classList.add('pop-in');

  if (panel && !panel.classList.contains('visible')) {
    panel.classList.add('visible');
    triggerPanelWave(section);
  }

  blocks.forEach((block, index) => {
    block.classList.add('archive-stagger-block');
    block.style.setProperty('--archive-stagger-order', String(index));
    window.setTimeout(() => {
      block.classList.add('pop-in');
    }, ARCHIVE_STAGGER_START + (index * ARCHIVE_STAGGER_STEP));
  });
}

function setupRevealObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealArchiveSection(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.exhibition-section').forEach(section => observer.observe(section));
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
  setupAmbientLight();
  setupControls();
  setupLightbox();
  setLanguage(currentLang, false);
  setupRevealObserver();

  const heroSection = document.querySelector('.hero-section');
  if (heroSection) triggerPanelWave(heroSection);
  document.querySelector('.hero-section .art-box')?.classList.add('pop-in');
  updateAudioBtnText();
});
