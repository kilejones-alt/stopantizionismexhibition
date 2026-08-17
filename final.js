'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  function fitOneLine(element, { min = 24, max = 64 } = {}) {
    if (!element) return;
    element.style.whiteSpace = 'nowrap';
    element.style.maxWidth = '100%';
    element.style.setProperty('font-size', `${max}px`, 'important');
    let size = max;
    const available = element.clientWidth || element.parentElement?.clientWidth || innerWidth;
    if (!available) return;
    while (element.scrollWidth > available + 1 && size > min) {
      size -= 1;
      element.style.setProperty('font-size', `${size}px`, 'important');
    }
  }

  function fitIdentityTitles() {
    const mobile = innerWidth <= 850;
    fitOneLine($('.home-title'), { min: mobile ? 28 : 48, max: mobile ? 56 : 84 });
    const hero = $('.hero-title');
    if (!hero) return;
    hero.style.width = '100%';
    fitOneLine(hero, { min: mobile ? 24 : 34, max: mobile ? 48 : 62 });
  }

  let fitFrame = 0;
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => requestAnimationFrame(fitIdentityTitles));
  }

  function reorderCatalogueFields() {
    document.querySelectorAll('.info-panel').forEach(panel => {
      const blocks = [...panel.querySelectorAll(':scope > .info-block')]
        .filter(block => !block.classList.contains('wall-archive-hidden'));
      const label = block => {
        const heading = block.querySelector('h4');
        return ((heading?.getAttribute('data-en') || heading?.textContent || '') + '').toLowerCase();
      };
      const object = blocks.find(block => /what the image|object/.test(label(block)));
      const creator = blocks.find(block => /creator/.test(label(block)));
      if (object && creator && (object.compareDocumentPosition(creator) & Node.DOCUMENT_POSITION_PRECEDING)) {
        panel.insertBefore(object, creator);
      }
    });
  }

  function approvedEnglishText(element) {
    if (!element) return '';
    return element.getAttribute('data-en') || element.textContent?.trim() || '';
  }

  function buildChronologyInterludes() {
    document.querySelectorAll('template.approved-history-template').forEach(template => {
      const section = template.closest('.exhibition-section');
      if (!section || section.dataset.chronologyInterleaved === '1') return;

      section.dataset.chronologyInterleaved = '1';
      section.classList.add('chronology-object-section');

      /* The approved long-form History remains in the source HTML, but on the wall
         it becomes its own chronological beat between objects instead of a cramped box. */
      const history = section.querySelector('.history-panel');
      if (history) history.classList.add('history-wall-hidden');

      const interlude = document.createElement('section');
      interlude.className = 'chronology-interlude';
      interlude.setAttribute('data-script-language', 'en');

      const inner = document.createElement('div');
      inner.className = 'chronology-interlude-inner';

      const categoryText = approvedEnglishText(section.querySelector('.info-category'));
      const titleText = approvedEnglishText(section.querySelector('.info-title'));

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

  function setupChronologyInterludeReveal() {
    const interludes = [...document.querySelectorAll('.chronology-interlude')];
    if (!interludes.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      interludes.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    interludes.forEach(item => observer.observe(item));
  }

  function classifyArtworkProportions() {
    document.querySelectorAll('.exhibition-section').forEach(section => {
      const image = section.querySelector('.art-box .museum-frame img');
      if (!image) return;
      const apply = () => {
        const width = Number.parseFloat(image.dataset.nativeWidth || image.getAttribute('width') || image.naturalWidth || 0);
        const height = Number.parseFloat(image.dataset.nativeHeight || image.getAttribute('height') || image.naturalHeight || 0);
        if (!width || !height) return;
        const ratio = width / height;
        section.classList.remove('art-panorama', 'art-portrait', 'art-standard');
        if (ratio >= 2.15) section.classList.add('art-panorama');
        else if (ratio <= 0.82) section.classList.add('art-portrait');
        else section.classList.add('art-standard');
      };
      apply();
      if (!image.complete) image.addEventListener('load', apply, { once: true });
    });
  }

  function installFastDoorCut() {
    if (!document.body.classList.contains('home-page')) return;
    let leaving = false;

    document.addEventListener('click', event => {
      const card = event.target.closest?.('.era-card[href]');
      if (!card || leaving || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = card.getAttribute('href');
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      leaving = true;
      card.setAttribute('aria-busy', 'true');
      card.classList.add('door-cut-source');
      document.body.classList.add('door-cutting');

      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.setTimeout(() => location.assign(href), 90);
        return;
      }

      document.getElementById('door-cut-veil')?.remove();
      const veil = document.createElement('div');
      veil.id = 'door-cut-veil';
      veil.setAttribute('aria-hidden', 'true');
      document.body.append(veil);
      requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('is-active')));

      /* Navigate only after the screen is fully covered. There is no destination
         preview and no half-finished peel crossing into the next page. */
      window.setTimeout(() => location.assign(href), 300);
    }, true);

    addEventListener('pageshow', () => {
      leaving = false;
      document.body.classList.remove('door-cutting');
      document.querySelectorAll('.era-card').forEach(card => {
        card.classList.remove('door-cut-source');
        card.removeAttribute('aria-busy');
      });
      document.getElementById('door-cut-veil')?.remove();
    });
  }

  addEventListener('resize', scheduleFit, { passive: true });
  addEventListener('load', scheduleFit, { once: true });
  document.fonts?.ready?.then(scheduleFit).catch(() => {});
  ['btn-en', 'btn-he', 'btn-ru'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => setTimeout(scheduleFit, 40));
  });

  addEventListener('DOMContentLoaded', () => {
    reorderCatalogueFields();
    buildChronologyInterludes();
    setupChronologyInterludeReveal();
    classifyArtworkProportions();
    scheduleFit();
    setTimeout(() => {
      reorderCatalogueFields();
      buildChronologyInterludes();
      setupChronologyInterludeReveal();
      classifyArtworkProportions();
      scheduleFit();
    }, 80);
  });

  setTimeout(() => {
    reorderCatalogueFields();
    buildChronologyInterludes();
    setupChronologyInterludeReveal();
    classifyArtworkProportions();
    scheduleFit();
  }, 160);

  installFastDoorCut();
})();
