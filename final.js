'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function approvedText(element) {
    return element?.getAttribute('data-en') || element?.textContent?.trim() || '';
  }

  function fitOneLine(element, { min = 24, max = 64 } = {}) {
    if (!element) return;
    element.style.whiteSpace = 'nowrap';
    element.style.maxWidth = '100%';
    element.style.setProperty('font-size', `${max}px`, 'important');
    const available = element.clientWidth || element.parentElement?.clientWidth || innerWidth;
    if (!available) return;
    let size = max;
    while (element.scrollWidth > available + 1 && size > min) {
      element.style.setProperty('font-size', `${--size}px`, 'important');
    }
  }

  function fitIdentityTitles() {
    const mobile = innerWidth <= 850;
    fitOneLine($('.home-title'), { min: mobile ? 28 : 48, max: mobile ? 56 : 84 });
    const hero = $('.hero-title');
    if (hero) fitOneLine(hero, { min: mobile ? 24 : 34, max: mobile ? 48 : 62 });
  }

  let fitFrame = 0;
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => requestAnimationFrame(fitIdentityTitles));
  }

  function reorderCatalogueFields() {
    $$('.info-panel').forEach(panel => {
      const blocks = $$(':scope > .info-block', panel);
      const label = block => approvedText(block.querySelector('h4')).toLowerCase();
      const object = blocks.find(block => /what the image|object/.test(label(block)));
      const creator = blocks.find(block => /creator/.test(label(block)));
      if (object && creator && (object.compareDocumentPosition(creator) & Node.DOCUMENT_POSITION_PRECEDING)) {
        panel.insertBefore(object, creator);
      }
    });
  }

  function hideEmptyCatalogueBlocks() {
    $$('.info-block').forEach(block => {
      const paragraph = block.querySelector('.wave-p, p');
      const hasVisibleCopy = !!paragraph?.textContent?.trim() || !!paragraph?.getAttribute('data-en')?.trim();
      block.classList.toggle('catalogue-empty', !hasVisibleCopy);
    });
  }

  function normalizeCompletedRecords() {
    $$('.exhibition-section').forEach(section => {
      const image = section.querySelector('.art-box img');
      if (image) {
        section.classList.remove('placeholder-entry');
        section.removeAttribute('data-empty-record');
        section.querySelector('.art-box')?.classList.remove('placeholder-art-box');
      } else if (section.querySelector('template.approved-history-template')) {
        section.classList.add('chronology-source-hidden');
      }
    });
  }

  function classifyArtworkProportions() {
    $$('.exhibition-section').forEach(section => {
      const image = section.querySelector('.art-box img');
      if (!image) return;
      const apply = () => {
        const width = Number.parseFloat(image.dataset.nativeWidth || image.getAttribute('width') || image.naturalWidth || 0);
        const height = Number.parseFloat(image.dataset.nativeHeight || image.getAttribute('height') || image.naturalHeight || 0);
        if (!width || !height) return;
        const ratio = width / height;
        section.classList.remove('art-panorama', 'art-portrait', 'art-standard');
        if (ratio >= 2.05) section.classList.add('art-panorama');
        else if (ratio <= 0.82) section.classList.add('art-portrait');
        else section.classList.add('art-standard');
      };
      apply();
      if (!image.complete) image.addEventListener('load', apply, { once: true });
    });
  }

  function buildChronologyInterludes() {
    $$('template.approved-history-template').forEach(template => {
      const section = template.closest('.exhibition-section');
      if (!section || section.dataset.chronologyInterleaved === '1') return;
      section.dataset.chronologyInterleaved = '1';
      section.classList.add('chronology-object-section');

      const history = section.querySelector('.history-panel');
      if (history) history.classList.add('history-wall-hidden');

      const interlude = document.createElement('section');
      interlude.className = 'chronology-interlude';
      interlude.setAttribute('data-script-language', 'en');

      const inner = document.createElement('div');
      inner.className = 'chronology-interlude-inner';
      const categoryText = approvedText(section.querySelector('.info-category'));
      const titleText = approvedText(section.querySelector('.info-title'));

      if (categoryText) {
        const category = document.createElement('div');
        category.className = 'chronology-interlude-category';
        category.textContent = categoryText;
        inner.append(category);
      }

      const normalizedCategory = categoryText.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const normalizedTitle = titleText.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      if (titleText && normalizedTitle && !normalizedCategory.endsWith(normalizedTitle)) {
        const title = document.createElement('h2');
        title.className = 'chronology-interlude-title';
        title.textContent = titleText;
        inner.append(title);
      }

      const copy = document.createElement('div');
      copy.className = 'chronology-interlude-copy';
      copy.append(template.content.cloneNode(true));
      inner.append(copy);
      interlude.append(inner);
      section.insertAdjacentElement('afterend', interlude);
    });
  }

  function sectionMatching(pattern) {
    return $$('.exhibition-section').find(section => pattern.test(
      `${approvedText(section.querySelector('.info-category'))} ${approvedText(section.querySelector('.info-title'))}`
    ));
  }

  function makeLibelMarker(label) {
    const section = document.createElement('section');
    section.className = 'libel-marker';
    section.setAttribute('data-script-language', 'en');
    const inner = document.createElement('div');
    inner.className = 'libel-marker-inner';
    const title = document.createElement('h2');
    title.textContent = label;
    inner.append(title);
    section.append(inner);
    return section;
  }

  function insertBeforeSection(section, label) {
    if (section && !document.querySelector(`[data-libel-key="${CSS.escape(label)}"]`)) {
      const marker = makeLibelMarker(label);
      marker.dataset.libelKey = label;
      section.before(marker);
    }
  }

  function buildLibelMarkers() {
    const path = location.pathname.toLowerCase();
    if (path.endsWith('/antijudaism.html') || path.endsWith('antijudaism.html')) {
      const sections = $$('.exhibition-section');
      insertBeforeSection(sections[0], 'Christ-Killer / Deicide');
      insertBeforeSection(sections[1] || sections[0], 'Blood Libel / Ritual Murder — William of Norwich');
      insertBeforeSection(sectionMatching(/1349|black death|pestilence/i), 'The Well-Poisoner');
      return;
    }
    if (path.endsWith('/antisemitism.html') || path.endsWith('antisemitism.html')) {
      const sections = $$('.exhibition-section');
      insertBeforeSection(sections[0], 'Race Polluter');
      insertBeforeSection(sectionMatching(/black banner|mourning/i) || sections[1], 'Hidden Ruler / World Conspirator');
      insertBeforeSection(sectionMatching(/ruined shtetl|small town after the pogrom|1917/i) || sections.at(-1), 'National Traitor / Rootless Foreigner');
      return;
    }
    if (path.endsWith('/exhibition.html') || path.endsWith('exhibition.html')) {
      insertBeforeSection(sectionMatching(/1965|fayez sayegh/i), 'Settler-Colonialist');
      insertBeforeSection(sectionMatching(/1975|zionism is racism|3379/i), 'Apartheid');
      insertBeforeSection(sectionMatching(/2001|durban/i), 'Genocide');
    }
  }

  function setupReveal() {
    const targets = $$('.chronology-interlude, .libel-marker');
    if (!targets.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      targets.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(item => observer.observe(item));
  }

  function build() {
    reorderCatalogueFields();
    hideEmptyCatalogueBlocks();
    normalizeCompletedRecords();
    classifyArtworkProportions();
    buildChronologyInterludes();
    buildLibelMarkers();
    setupReveal();
    scheduleFit();
  }

  addEventListener('resize', scheduleFit, { passive: true });
  addEventListener('load', scheduleFit, { once: true });
  document.fonts?.ready?.then(scheduleFit).catch(() => {});
  ['btn-en', 'btn-he', 'btn-ru'].forEach(id => document.getElementById(id)?.addEventListener('click', () => setTimeout(scheduleFit, 40)));
  addEventListener('DOMContentLoaded', build);
  setTimeout(build, 120);
})();
