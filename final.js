'use strict';
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];function fitOneLine(el,{min=24,max=64}={}){if(!el)return;el.style.whiteSpace='nowrap';el.style.maxWidth='100%';el.style.setProperty('font-size',`${max}px`,'important');let size=max;const available=el.clientWidth||el.parentElement?.clientWidth||innerWidth;if(!available)return;while(el.scrollWidth>available+1&&size>min){size--;el.style.setProperty('font-size',`${size}px`,'important');}}function fitIdentityTitles(){const mobile=innerWidth<=850;fitOneLine($('.home-title'),{min:mobile?28:48,max:mobile?56:84});const hero=$('.hero-title');if(hero){const host=hero.closest('.hero-section');const available=Math.max(1,(host?.clientWidth||innerWidth)-(mobile?36:0));hero.style.width=Math.min(hero.parentElement?.clientWidth||available,available)+'px';fitOneLine(hero,{min:mobile?24:34,max:mobile?48:62});}}let fitFrame=0;function scheduleFit(){cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(()=>requestAnimationFrame(fitIdentityTitles));}addEventListener('resize',scheduleFit,{passive:true});addEventListener('load',scheduleFit,{once:true});document.fonts?.ready?.then(scheduleFit).catch(()=>{});['btn-en','btn-he','btn-ru'].forEach(id=>$('#'+id)?.addEventListener('click',()=>setTimeout(scheduleFit,40)));const title=$('.home-title')||$('.hero-title');if(title)new MutationObserver(scheduleFit).observe(title,{childList:true,subtree:true,characterData:true});function reorderCatalogueFields(){document.querySelectorAll('.info-panel').forEach(panel=>{const blocks=[...panel.querySelectorAll(':scope > .info-block')].filter(b=>!b.classList.contains('wall-archive-hidden'));const label=b=>{const h=b.querySelector('h4');return ((h?.getAttribute('data-en')||h?.textContent||'')+'').toLowerCase()};const object=blocks.find(b=>/what the image|object/.test(label(b)));const creator=blocks.find(b=>/creator/.test(label(b)));if(object&&creator&&object.compareDocumentPosition(creator)&Node.DOCUMENT_POSITION_PRECEDING){panel.insertBefore(object,creator);}})}addEventListener('DOMContentLoaded',()=>{reorderCatalogueFields();setTimeout(reorderCatalogueFields,60)});setTimeout(reorderCatalogueFields,120);if(document.body.classList.contains('home-page')){let turning=false;function makeTurnLayer(card){$('#catalog-turn-layer')?.remove();const rect=card.getBoundingClientRect(),layer=document.createElement('div');layer.id='catalog-turn-layer';layer.setAttribute('aria-hidden','true');layer.style.setProperty('--turn-left',`${rect.left}px`);layer.style.setProperty('--turn-top',`${rect.top}px`);layer.style.setProperty('--turn-width',`${rect.width}px`);layer.style.setProperty('--turn-height',`${rect.height}px`);const destination=document.createElement('div');destination.className='catalog-turn-destination';const destinationArt={'antijudaism.html':'home-antijudaism.jpg','antisemitism.html':'home-antisemitism.jpg','exhibition.html':'bundists.jpg'}[card.getAttribute('href')];if(destinationArt){destination.style.backgroundImage=`linear-gradient(rgba(10,10,13,.42),rgba(10,10,13,.66)),url("${destinationArt}")`;destination.style.backgroundSize='cover';destination.style.backgroundPosition='center center';}const sheet=document.createElement('div');sheet.className='catalog-turn-sheet';const source=card.querySelector('.door-front')||card,clone=source.cloneNode(true);clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));clone.querySelectorAll('a,button').forEach(n=>n.setAttribute('tabindex','-1'));clone.querySelectorAll('.era-arrow,.mobile-node').forEach(n=>n.remove());sheet.append(clone);layer.append(destination,sheet);document.body.append(layer);return layer;}function turnTo(card,href){if(turning||!href)return;turning=true;card.setAttribute('aria-busy','true');if(matchMedia('(prefers-reduced-motion: reduce)').matches){document.body.classList.add('page-leaving');setTimeout(()=>location.assign(href),100);return;}const layer=makeTurnLayer(card);document.body.classList.add('catalog-turning');card.classList.add('catalog-turn-source');requestAnimationFrame(()=>requestAnimationFrame(()=>layer.classList.add('is-turning')));const duration=innerWidth<=850?680:820;setTimeout(()=>location.assign(href),duration-20);}document.addEventListener('click',event=>{const card=event.target.closest?.('.era-card[href]');if(!card||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();event.stopImmediatePropagation();turnTo(card,card.getAttribute('href'));},true);addEventListener('pageshow',()=>{turning=false;document.body.classList.remove('catalog-turning');$$('.era-card').forEach(c=>{c.classList.remove('catalog-turn-source');c.removeAttribute('aria-busy')});$('#catalog-turn-layer')?.remove();});}scheduleFit();})();


;(()=>{
  function renderApprovedHistories(){
    document.querySelectorAll('template.approved-history-template').forEach(template=>{
      const section=template.closest('.exhibition-section');
      const history=section?.querySelector('.history-panel');
      if(!history||history.querySelector('.approved-history-render'))return;
      const original=history.querySelector(':scope > .wave-p');
      if(original)original.classList.add('approved-history-original');
      const render=document.createElement('div');
      render.className='approved-history-render';
      render.setAttribute('data-script-language','en');
      render.append(template.content.cloneNode(true));
      history.append(render);
      history.classList.add('has-approved-history');
      section.classList.add('approved-history-section');
    });
  }
  function balanceApprovedHistorySections(){
    document.querySelectorAll('.approved-history-section').forEach(section=>{
      const art=section.querySelector('.art-box');
      const panel=section.querySelector('.info-panel');
      if(!art||!panel)return;
      art.style.removeProperty('--approved-art-height');
      if(innerWidth<=850)return;
      const target=Math.ceil(panel.getBoundingClientRect().height);
      if(target>0)art.style.setProperty('--approved-art-height',target+'px');
    });
  }
  function refreshApproved(){renderApprovedHistories();requestAnimationFrame(()=>requestAnimationFrame(balanceApprovedHistorySections));}
  addEventListener('DOMContentLoaded',()=>{refreshApproved();setTimeout(refreshApproved,90);setTimeout(refreshApproved,700)});
  addEventListener('resize',()=>setTimeout(refreshApproved,80),{passive:true});
  addEventListener('load',()=>setTimeout(refreshApproved,120),{once:true});
  setTimeout(refreshApproved,180);
})();
