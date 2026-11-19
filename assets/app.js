/* Browser-only demonstration. Public fixture data is never an authorization boundary. */
(() => {
 'use strict';
 const config=window.BRAND;
 if(!config) return;
 const $=(selector,root=document)=>root.querySelector(selector);
 const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const base=document.body.dataset.base||'./';
 const key='b2b:'+config.slug+':';
 const number=value=>Number(value).toLocaleString('en-NG',{maximumFractionDigits:1});
 const currency=value=>'₦'+Math.round(value).toLocaleString('en-NG');
 let storageAvailable=true;
 const memory=new Map();
 function read(store,item,fallback=null) {
  try {const value=window[store].getItem(key+item);return value===null?fallback:JSON.parse(value);}
  catch {storageAvailable=false;return memory.has(item)?memory.get(item):fallback;}
 }
 function write(store,item,value) {
  try {window[store].setItem(key+item,JSON.stringify(value));}
  catch {storageAvailable=false;memory.set(item,value);notify('Browser storage is unavailable. This change lasts only until the page is refreshed.');}
 }
 function remove(store,item) {try{window[store].removeItem(key+item);}catch{}memory.delete(item);}
 let toastTimer;
 function notify(message) {
  const node=$('.toast');if(!node)return;
  node.textContent=message;node.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),4200);
 }
 function download(content,type,name) {
  const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function enterDemo() {
  write('sessionStorage','session',{demo:true,startedAt:Date.now()});
  if(!storageAvailable) {
   // Explicit public demo mode allows read-only navigation when storage is disabled.
   window.location.assign(base+'dashboard/?demo=1');
  } else window.location.assign(base+'dashboard/');
 }
 const menu=$('.menu-toggle');
 if(menu) menu.addEventListener('click',()=>{
  const expanded=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(expanded));menu.setAttribute('aria-label',expanded?'Close menu':'Open menu');$('#primary-navigation').classList.toggle('open',expanded);
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');$('#primary-navigation')?.classList.remove('open');}});
 $$('.demo-enter').forEach(button=>button.addEventListener('click',enterDemo));
 $('#login-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const valid=$('#login-email').value.trim().toLowerCase()===`demo@${config.slug}.example`&&$('#login-password').value==='MVPdemo2026!';
  $('#login-error').hidden=valid;
  if(valid)enterDemo();else $('#login-error').scrollIntoView({block:'nearest'});
 });
 $('#show-password')?.addEventListener('click',()=>{
  const input=$('#login-password');const show=input.type==='password';input.type=show?'text':'password';$('#show-password').textContent=show?'Hide':'Show';$('#show-password').setAttribute('aria-label',show?'Hide password':'Show password');$('#show-password').setAttribute('aria-pressed',String(show));
 });
 $$('[data-reset]').forEach(button=>button.addEventListener('click',()=>{
  if(!window.confirm('Restore the sample '+config.name+' workspace? This clears saved records, activity, reports, the pilot brief and the sample session from this browser.'))return;
  for(const item of ['records','brief','analyses'])remove('localStorage',item);
  remove('sessionStorage','session');
  if(document.body.dataset.page==='dashboard') window.location.assign(base+'login/');
  else window.location.reload();
 }));
 $$('[data-billing]').forEach(button=>button.addEventListener('click',()=>{
  const annual=button.dataset.billing==='annual';
  $$('[data-billing]').forEach(other=>{const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));});
  $$('[data-price]').forEach(node=>{const amount=Number(node.dataset.price)*(annual?.8:1);node.textContent=currency(amount);const card=node.closest('.price-card');$('.billing-detail',card).textContent=annual?currency(amount*12)+' billed annually':'Monthly plan price';});
 }));
 const slider=$('#scenario-range');
 if(slider)slider.addEventListener('input',()=>{
  const value=Number(slider.value);$('#scenario-input').value=number(value);
  $('#scenario-result').textContent=config.slug==='rill'?number(value*.15)+' m³':config.slug==='leasewell'?currency(value*50000):number(value*.25)+' hours';
 });
 const pilot=$('#pilot-form');
 if(pilot) {
  const saved=read('localStorage','brief');
  if(saved&&typeof saved==='object') {
   for(const field of ['name','email','organization','size','priority','message']) if(typeof saved[field]==='string')pilot.elements[field].value=saved[field];
   $('#pilot-result').hidden=false;
  }
  pilot.addEventListener('submit',event=>{
   event.preventDefault();
   if(!pilot.reportValidity())return;
   const data=Object.fromEntries(new FormData(pilot).entries());delete data.consent;
   for(const field of Object.keys(data))data[field]=String(data[field]).trim();
   data.product=config.name;data.savedAt=new Date().toISOString();
   write('localStorage','brief',data);$('#pilot-result').hidden=false;notify('Pilot brief saved on this device. No message was sent.');
  });
  $('#download-brief')?.addEventListener('click',()=>{
   const data=read('localStorage','brief');
   if(!data){notify('Save a pilot brief first.');return;}
   const text=`${config.name.toUpperCase()} — PILOT BRIEF\n\nLOCAL DRAFT ONLY — No message has been sent.\n\nName: ${data.name}\nWork email: ${data.email}\nOrganization: ${data.organization}\nTeam: ${data.size}\nPriority: ${data.priority}\n\nSuccess measure / context:\n${data.message}\n\nSaved: ${data.savedAt}\n`;
   download(text,'text/plain;charset=utf-8',config.slug+'-pilot-brief.txt');notify('Pilot brief downloaded.');
  });
 }
 if(document.body.dataset.page!=='dashboard')return;
 const publicDemo=new URLSearchParams(window.location.search).get('demo')==='1';
 if(!read('sessionStorage','session')?.demo){
  if(!publicDemo){window.location.replace(base+'login/');return;}
  write('sessionStorage','session',{demo:true,startedAt:Date.now()});
 }
 if(!storageAvailable){const notice=document.createElement('div');notice.className='storage-notice';notice.textContent='Browser storage is unavailable. Changes last until this page refreshes.';$('.app-main').prepend(notice);}
 const fixture=()=>config.records.map(row=>({id:row[0],name:row[1],place:row[2],value:row[3],score:row[4],status:row[5],owner:row[6],note:row[7]}));
 const saved=read('localStorage','records');
 const statuses=['Needs review','Scheduled',config.finalStatus];
 let records=Array.isArray(saved)&&saved.length<2000&&saved.every(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.place==='string'&&typeof r.owner==='string'&&typeof r.note==='string'&&Number.isFinite(r.value)&&r.value>=0&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100&&statuses.includes(r.status))?saved:fixture();
 let activeRecord=null;
 function persist(){write('localStorage','records',records);render();}
 function addActivity(record,action) {
  const history=Array.isArray(record.activity)?record.activity:[];
  record.activity=[{at:new Date().toISOString(),action},...history].slice(0,25);
 }
 function renderActivity() {
  const target=$('[data-workspace-activity]');
  if(!target)return;
  const analyses=read('localStorage','analyses',[]);
  const events=records.flatMap(record=>(Array.isArray(record.activity)?record.activity:[]).map(event=>({
   at:event?.at,action:event?.action,record:record.name,reference:record.id
  })));
  if(Array.isArray(analyses)){
   for(const report of analyses){
    if(report?.accepted&&report.title)events.push({at:report.acceptedAt,action:'Report queued for review',record:report.title});
   }
  }
  const visible=events.filter(event=>typeof event.at==='string'&&Number.isFinite(Date.parse(event.at))&&typeof event.action==='string')
   .sort((left,right)=>Date.parse(right.at)-Date.parse(left.at)).slice(0,30);
  if(!visible.length){target.innerHTML='<p>No activity recorded yet.</p>';return;}
  const dateFormat=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'});
  target.innerHTML='<ol class="activity-list">'+visible.map(event=>{
   const reference=event.reference?' · '+safe(event.reference):'';
   const date=dateFormat.format(new Date(event.at));
   return `<li><p><strong>${safe(event.action)}</strong><br>${safe(event.record)}${reference}</p><time datetime="${safe(event.at)}">${safe(date)}</time></li>`;
  }).join('')+'</ol>';
 }
 document.addEventListener('rill:report-saved',renderActivity);
 function statsHTML() {
  const total=records.reduce((sum,r)=>sum+r.value,0),done=records.filter(r=>r.status===config.finalStatus).length,attention=records.filter(r=>r.status==='Needs review').length;
  return [[number(records.length),config.objects+' in view','All current sample records',''],[number(total),config.totalLabel,'Total across the register',config.unit],[number(attention),'Need review','Open questions for an operator',''],[number(records.length?done/records.length*100:0)+'%',config.metricLabel,`${done} of ${records.length} records complete`,'']].map(([value,label,note,unit])=>`<div class="dashboard-stat"><span>${safe(label)}</span><strong>${safe(value)}${unit?`<small>${safe(unit)}</small>`:''}</strong><p>${safe(note)}</p></div>`).join('');
 }
 function filtered() {
  const query=($('#record-search')?.value||'').trim().toLowerCase();const status=$('#status-filter')?.value||'';const sort=$('#record-sort')?.value||'priority';
  return records.filter(r=>(!status||r.status===status)&&(!query||[r.id,r.name,r.place,r.owner,r.note].some(value=>value.toLowerCase().includes(query)))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='value'?b.value-a.value:b.score-a.score);
 }
 function badge(status){return `<span class="status ${status==='Needs review'?'warn':''}"><i></i>${safe(status)}</span>`;}
 function tableHTML(rows) {
  if(!rows.length)return `<div class="empty-state"><h3>No matching ${safe(config.objects.toLowerCase())}.</h3><p>Try a different search or choose All statuses.</p></div>`;
  return `<div class="table-overflow"><table class="data-table"><thead><tr><th scope="col">${safe(config.object.toUpperCase())}</th><th scope="col">${safe(config.placeLabel.toUpperCase())}</th><th scope="col">${safe(config.unit.toUpperCase())}</th><th scope="col">PRIORITY</th><th scope="col">STATUS</th><th scope="col">OWNER</th></tr></thead><tbody>${rows.map(r=>`<tr><td><button type="button" class="record-name" data-record="${safe(r.id)}">${safe(r.name)}<small>${safe(r.id)}</small></button></td><td><span class="record-place">${safe(r.place)}</span></td><td>${number(r.value)}</td><td><span class="priority-score"><i><span style="width:${r.score}%"></span></i>${r.score}</span></td><td>${badge(r.status)}</td><td>${safe(r.owner)}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function render() {
  const html=statsHTML();$('#dashboard-stats').innerHTML=html;$('#report-summary').innerHTML=html;
  const count=records.filter(r=>r.status==='Needs review').length;
  $('#attention-summary').textContent=count?`${count} ${count===1?config.object.toLowerCase():config.objects.toLowerCase()} ${count===1?'needs':'need'} review in this sample workspace. A responsible operator chooses the next step.`:'No records need review. Check scheduled work or add the next sample record.';
  $('#overview-table').innerHTML=tableHTML([...records].sort((a,b)=>b.score-a.score).slice(0,5));
  const visible=filtered();$('#record-table').innerHTML=tableHTML(visible);$('#record-count').textContent=`Showing ${visible.length} of ${records.length} sample ${config.objects.toLowerCase()} · Changes saved in this browser`;
  $$('[data-record]').forEach(button=>button.addEventListener('click',()=>openRecord(button.dataset.record)));
  renderActivity();
 }
 function activateTab(tab,updateHash=true) {
  if(!['overview','records','reports','settings'].includes(tab))tab='overview';
  $$('.app-panel').forEach(panel=>panel.hidden=panel.id!=='panel-'+tab);
  $$('.app-tab').forEach(button=>{const active=button.dataset.tab===tab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  $('#breadcrumb').textContent=tab==='records'?config.objects:tab[0].toUpperCase()+tab.slice(1);
  if(updateHash)history.replaceState(null,'','#'+tab);
  $('.app-sidebar').classList.remove('open');$('#app-menu').setAttribute('aria-expanded','false');
 }
 $$('.app-tab').forEach(button=>button.addEventListener('click',()=>activateTab(button.dataset.tab)));
 $$('[data-open-records]').forEach(button=>button.addEventListener('click',()=>activateTab('records')));
 $('#show-attention').addEventListener('click',()=>{$('#status-filter').value='Needs review';$('#record-search').value='';render();activateTab('records');});
 $('#app-menu').addEventListener('click',()=>{const open=$('.app-sidebar').classList.toggle('open');$('#app-menu').setAttribute('aria-expanded',String(open));});
 document.addEventListener('click',event=>{if(window.innerWidth<=760&&!event.target.closest('.app-sidebar')&&!event.target.closest('#app-menu')){$('.app-sidebar').classList.remove('open');$('#app-menu').setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('.app-sidebar').classList.remove('open');$('#app-menu').setAttribute('aria-expanded','false');}});
 window.addEventListener('hashchange',()=>activateTab(window.location.hash.slice(1),false));
 $('#record-search').addEventListener('input',render);$('#status-filter').addEventListener('change',render);$('#record-sort').addEventListener('change',render);
 function openRecord(id) {
  activeRecord=records.find(r=>r.id===id);if(!activeRecord)return;
  $('#detail-reference').textContent=activeRecord.id+' / SAMPLE RECORD';$('#detail-name').textContent=activeRecord.name;
  const details=[[config.placeLabel,activeRecord.place],['Quantity',number(activeRecord.value)+' '+config.unit],['Sample priority',activeRecord.score+' / 100'],['Responsible operator',activeRecord.owner],['Current status',activeRecord.status]];
  $('#detail-meta').innerHTML=details.map(([label,value])=>`<div><dt>${safe(label)}</dt><dd>${safe(value)}</dd></div>`).join('');
  $('#detail-note').value=activeRecord.note;
  $('#complete-record').disabled=activeRecord.status===config.finalStatus;
  $('#reopen-record').hidden=activeRecord.status!==config.finalStatus;
  $('#record-dialog').showModal();
 }
 $('#save-note').addEventListener('click',()=>{
  if(!activeRecord)return;
  const value=$('#detail-note').value.trim();if(!value){notify('Add a sample observation before saving.');$('#detail-note').focus();return;}
  activeRecord.note=value.slice(0,1500);addActivity(activeRecord,'Watering note updated');persist();notify('Note saved in this browser.');
 });
 $('#complete-record').addEventListener('click',()=>{
  if(!activeRecord||activeRecord.status===config.finalStatus)return;activeRecord.note=$('#detail-note').value.trim().slice(0,1500)||activeRecord.note;activeRecord.status=config.finalStatus;addActivity(activeRecord,'Cycle marked watered');persist();$('#record-dialog').close();notify(config.object+' updated: '+config.finalStatus+'.');
 });
 $('#reopen-record').addEventListener('click',()=>{if(!activeRecord||activeRecord.status!==config.finalStatus)return;activeRecord.status='Needs review';addActivity(activeRecord,'Zone reopened for review');persist();$('#record-dialog').close();notify(config.object+' reopened for review.');});
 $$('.add-record').forEach(button=>button.addEventListener('click',()=>$('#add-dialog').showModal()));
 $('#add-form').addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
  const values=Object.fromEntries(new FormData(form));const value=Number(values.value);
  if(!Number.isFinite(value)||value<=0||value>1000000)return;
  const fields=['name','place','owner','note'];if(fields.some(field=>!String(values[field]).trim())){notify('Complete each field with sample information.');return;}
  const prefix=config.records[0][0].split('-')[0];let counter=Math.max(...records.map(r=>Number(r.id.split('-').at(-1))||0),0)+1;
  const record={id:prefix+'-'+counter,name:values.name.trim().slice(0,120),place:values.place.trim().slice(0,120),value,score:50,status:'Scheduled',owner:values.owner.trim().slice(0,80),note:values.note.trim().slice(0,1500)};
  addActivity(record,'Zone added');records.unshift(record);
  $('#status-filter').value='';$('#record-search').value='';persist();$('#add-dialog').close();form.reset();activateTab('records');notify('New sample '+config.object.toLowerCase()+' created.');
 });
 function exportCSV(all=false) {
  const rows=all?records:filtered();if(!rows.length){notify('No matching records to export.');return;}
  function cell(value){let text=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
  const headers=['Reference',config.object,config.placeLabel,`Quantity (${config.unit})`,'Sample priority','Status','Owner',config.noteLabel];
  const lines=[headers,...rows.map(r=>[r.id,r.name,r.place,r.value,r.score,r.status,r.owner,r.note])].map(row=>row.map(cell).join(','));
  download('\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8',config.slug+'-sample-register.csv');notify(rows.length+' sample records exported.');
 }
 $$('[data-export]').forEach(button=>button.addEventListener('click',()=>exportCSV(false)));
 $$('[data-export-all]').forEach(button=>button.addEventListener('click',()=>exportCSV(true)));
 $('#logout').addEventListener('click',()=>{remove('sessionStorage','session');window.location.assign(base+'login/');});
 for(const dialog of $$('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
 render();activateTab(window.location.hash.slice(1)||'overview',false);
})();
