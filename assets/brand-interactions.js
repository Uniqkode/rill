/* Small interactions belonging to each product's own homepage composition. */
(() => {
 const brand=window.BRAND;if(!brand)return;
 const $=selector=>document.querySelector(selector);
 const $$=selector=>[...document.querySelectorAll(selector)];
 $$('[data-v3-field]').forEach(button=>button.addEventListener('click',()=>{
  const field=brand.records[Number(button.dataset.v3Field)];if(!field)return;
  $$('[data-v3-field]').forEach(other=>{const active=other===button;other.classList.toggle('selected',active);other.setAttribute('aria-pressed',String(active));});
  $('[data-v3-field-title]').textContent=field[1]+' · '+field[3]+' ha';$('[data-v3-field-note]').textContent=field[7];
 }));
 $('[data-v3-grain-filter]')?.addEventListener('change',event=>{
  let count=0;$$('[data-v3-lot-status]').forEach(row=>{row.hidden=!!event.target.value&&row.dataset.v3LotStatus!==event.target.value;if(!row.hidden)count++;});
  $('[data-v3-lot-count]').textContent=count+' lot'+(count===1?'':'s');
 });
 $$('[data-v3-document]').forEach(button=>button.addEventListener('click',()=>{
  const source=brand.ai.sources[Number(button.dataset.v3Document)];if(!source)return;
  $$('[data-v3-document]').forEach(other=>{const active=other===button;other.classList.toggle('selected',active);other.setAttribute('aria-pressed',String(active));});
  $('[data-v3-document-label]').textContent=source.kind;$('[data-v3-document-title]').textContent=source.name;$('[data-v3-document-copy]').textContent=source.excerpt;
 }));
})();
