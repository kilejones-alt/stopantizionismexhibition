'use strict';

(() => {
  function fitOneLine(element, { min = 24, max = 64 } = {}) {
    if (!element) return;
    element.style.whiteSpace = 'nowrap';
    element.style.maxWidth = '100%';
    element.style.setProperty('font-size', `${max}px`, 'important');

    const available = element.clientWidth || element.parentElement?.clientWidth || innerWidth;
    if (!available) return;

    let size = max;
    while (element.scrollWidth > available + 1 && size > min) {
      size -= 1;
      element.style.setProperty('font-size', `${size}px`, 'important');
    }
  }

  function fitIdentityTitles() {
    const mobile = innerWidth <= 850;
    fitOneLine(document.querySelector('.home-title'), {
      min: mobile ? 28 : 48,
      max: mobile ? 56 : 84
    });
    fitOneLine(document.querySelector('.hero-title'), {
      min: mobile ? 24 : 34,
      max: mobile ? 48 : 62
    });
  }

  let fitFrame = 0;
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => requestAnimationFrame(fitIdentityTitles));
  }

  addEventListener('resize', scheduleFit, { passive: true });
  addEventListener('load', scheduleFit, { once: true });
  document.fonts?.ready?.then(scheduleFit).catch(() => {});
  ['btn-en', 'btn-he', 'btn-ru'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => setTimeout(scheduleFit, 40));
  });
  addEventListener('DOMContentLoaded', scheduleFit, { once: true });
})();
