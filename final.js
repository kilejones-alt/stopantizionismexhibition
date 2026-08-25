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



  function setupMuseumScrollBehavior() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealNodes = [...document.querySelectorAll(
      '.home-source-context, .home-source-context .era-source-section, .third-era-teaser, .genealogy-script, .chronology-interlude, .libel-marker, .source-antizionism-framework, .genealogy-influences, .era-libels-section'
    )];
    revealNodes.forEach(node => node.classList.add('mobile-room-reveal'));
    if (revealNodes.length) {
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
        '.era-card, .third-era-teaser, .info-panel > .info-block:not(.wall-archive-hidden):not(.catalogue-empty), .history-panel, .influence-card, .era-libel-card'
      )];
      const panelObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.target.classList.toggle('panel-current', entry.isIntersecting));
      }, { threshold: 0.01, rootMargin: '-27% 0px -27% 0px' });
      panels.forEach(panel => panelObserver.observe(panel));
    }
  }

  addEventListener('resize', scheduleFit, { passive: true });
  addEventListener('load', scheduleFit, { once: true });
  document.fonts?.ready?.then(scheduleFit).catch(() => {});
  ['btn-en', 'btn-he', 'btn-ru'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => setTimeout(scheduleFit, 40));
  });
  addEventListener('DOMContentLoaded', () => { scheduleFit(); setupMuseumScrollBehavior(); }, { once: true });
})();

/* 2026-08-24: manage embedded exhibition video without artificially stretching catalogue labels. */
(() => {
  function setupEmbeddedExhibitionVideo(){
    const videos = [...document.querySelectorAll('video.exhibition-autoplay-video')];
    if (!videos.length) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    videos.forEach(video => {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      const rate = Number.parseFloat(video.dataset.playbackRate || '1');
      video.defaultPlaybackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
      video.playbackRate = video.defaultPlaybackRate;
      video.addEventListener('loadedmetadata', () => { video.playbackRate = video.defaultPlaybackRate; }, { once:true });
      if (reduced) {
        video.autoplay = false;
        video.controls = true;
        video.pause();
      }
    });
    if (reduced) return;
    if (!('IntersectionObserver' in window)) {
      videos.forEach(video => video.play().catch(() => {}));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.playbackRate = video.defaultPlaybackRate || 1;
          video.play().catch(() => {});
        } else video.pause();
      });
    }, { threshold: .18, rootMargin: '20% 0px 20% 0px' });
    videos.forEach(video => observer.observe(video));
  }
  const init = () => setupEmbeddedExhibitionVideo();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();

