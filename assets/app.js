/* Shared website and irrigation workspace interactions. */
(() => {
 'use strict';
 const config=window.BRAND;
 if(!config) return;
 const $=(selector,root=document)=>root.querySelector(selector);
 const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const base=document.body.dataset.base||'./';
 const page=document.body.dataset.page;
 const liveMode=document.body.dataset.workspaceMode==='live';
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
  try {window[store].setItem(key+item,JSON.stringify(value));return true;}
  catch {storageAvailable=false;memory.set(item,value);notify('Browser storage is unavailable. This change lasts only until the page is refreshed.');return false;}
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
 const menu=$('.menu-toggle');
 if(menu) menu.addEventListener('click',()=>{
  const expanded=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(expanded));menu.setAttribute('aria-label',expanded?'Close menu':'Open menu');$('#primary-navigation').classList.toggle('open',expanded);
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');$('#primary-navigation')?.classList.remove('open');}});
 const loginForm=$('#login-form');
 if(loginForm&&!liveMode){
  $('fieldset',loginForm).disabled=false;
  loginForm.addEventListener('submit',event=>{
   event.preventDefault();
   const error=$('#login-error');
   const valid=$('#login-email').value.trim().toLowerCase()===`demo@${config.slug}.example`&&$('#login-password').value==='MVPdemo2026!';
   if(!valid){
    error.textContent='Check the demo email and password above.';
    error.hidden=false;
    return;
   }
   if(!write('sessionStorage','session',{demo:true,startedAt:Date.now()})){
    error.textContent='Allow session storage in this browser to open the demo.';
    error.hidden=false;
    return;
   }
   error.hidden=true;
   window.location.assign(base+'dashboard/');
  });
 }
 if(page==='login'&&liveMode){
  if(window.RILL_WORKSPACE_ENTRY)window.RILL_WORKSPACE_ENTRY.login();
  else{
   $('[data-live-login]').hidden=false;
   $('[data-live-login-status]').textContent='The workspace connection is unavailable.';
  }
 }
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
 if(page!=='dashboard')return;
 if(liveMode){
  if(window.RILL_WORKSPACE_ENTRY)window.RILL_WORKSPACE_ENTRY.dashboard(startDashboard);
  else{
   $('[data-workspace-boot]').hidden=false;
   $('[data-workspace-boot-status]').textContent='The workspace connection is unavailable.';
  }
  return;
 }
 if(!read('sessionStorage','session')?.demo){window.location.replace(base+'login/');return;}
 startDashboard();

 function startDashboard(context=null) {
  const live=Boolean(context);
  let canEdit=!live;
  let workspace=context?.workspace;
  const planNames=new Map([['free','Free'],['starter','Starter'],['growth','Growth'],['enterprise','Enterprise']]);
  const workspaceId=context?.workspace.id;
  const backend=context?.backend;
  const fixture=()=>config.records.map(row=>({id:row[0],name:row[1],place:row[2],value:row[3],score:row[4],status:row[5],owner:row[6],note:row[7]}));
  const saved=live?null:read('localStorage','records');
  if(!storageAvailable){const notice=document.createElement('div');notice.className='storage-notice';notice.textContent='Browser storage is unavailable. Changes last until this page refreshes.';$('.app-main').prepend(notice);}
  const statuses=['Needs review','Scheduled',config.finalStatus];
  let records=live?context.records:
    Array.isArray(saved)&&saved.length<2000&&saved.every(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.place==='string'&&typeof r.owner==='string'&&typeof r.note==='string'&&Number.isFinite(r.value)&&r.value>=0&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100&&statuses.includes(r.status))?saved:fixture();
  const forecastPlanner=live?$('rill-forecast-planner'):null;
  const forecastReady=forecastPlanner&&customElements.whenDefined('rill-forecast-planner').then(()=>{
   forecastPlanner.requestForecast=(input,signal)=>backend.forecast(workspaceId,input,signal);
   forecastPlanner.hidden=false;
   return forecastPlanner;
  });
  function syncForecastZones() {
   forecastReady?.then(planner=>{planner.workspaceZones=records;});
  }
  let workspaceEvents=context?.events||[];
  const statusTone={'Needs review':'review',Scheduled:'scheduled',[config.finalStatus]:'watered'};
  let activeRecord=null;
  let saving=false;
  let addRequestId;
  if(live){
   $('[data-reports-intro]').textContent='Download zone records and review changes recorded by your workspace.';
   $('[data-settings-intro]').textContent='Manage your account and workspaces.';
   $('[data-account-title]').textContent='Your account';
   $('[data-live-settings]').hidden=false;
   $('[data-add-submit]').textContent='Add zone';
   $('[data-live-edit]').hidden=false;
   $('[data-live-refresh]').hidden=false;
   $('#save-note').textContent='Save changes';
   $('#reopen-record').textContent='Queue for review';
   showWorkspaceAccess();
  }
  function showWorkspaceAccess() {
   const planName=planNames.get(workspace.plan)||'Free';
   const editingRole=workspace.role==='owner'||workspace.role==='operator';
   canEdit=editingRole&&planName!=='Free';
   $('[data-account-plan]').textContent=planName;
   $('[data-account-plan-row]').hidden=false;
   $('[data-plan-notice]').hidden=canEdit;
   $('[data-plan-title]').textContent=planName+' plan · Read-only';
   const upgrade=$('[data-plan-upgrade]');
   upgrade.hidden=workspace.role!=='owner';
   $('[data-plan-copy]').textContent=editingRole
    ? (workspace.role==='owner'
      ? 'View and export your zones. Upgrade to add zones and edit irrigation records.'
      : 'View and export zones. Ask your workspace owner about a paid plan for editing.')
    : 'Your viewer role can view and export irrigation records.';
   $('[data-records-intro]').textContent=canEdit
    ? 'Review field notes, update watering status and export the current selection.'
    : 'Review field notes, filter zones and export the current selection.';
   $$('.add-record').forEach(button=>{button.hidden=!canEdit;});
   if(!canEdit&&$('#add-dialog').open)$('#add-dialog').close();
  }
  function persist(){write('localStorage','records',records);syncForecastZones();render();}
  function addActivity(record,action) {
   const history=Array.isArray(record.activity)?record.activity:[];
   record.activity=[{at:new Date().toISOString(),action},...history].slice(0,25);
  }
  function renderActivity() {
   const target=$('[data-workspace-activity]');
   if(!target)return;
   const analyses=live?[]:read('localStorage','analyses',[]);
   const events=live?workspaceEvents:records.flatMap(record=>(Array.isArray(record.activity)?record.activity:[]).map(event=>({
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
   const total=records.reduce((sum,record)=>sum+record.value,0);
   const watered=records.filter(record=>record.status===config.finalStatus).length;
   const review=records.filter(record=>record.status==='Needs review').length;
   const metrics=[
    ['water','Planned water',number(total),config.unit,'Total across all zones','M12 3c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11Z'],
    ['zones','Active zones',number(records.length),'',live?'In this workspace':'In this sample plan','M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15'],
    ['review','Needs review',number(review),'','Awaiting an operator review','M12 8v5m0 3h.01M10.4 4.9 3.8 17a1.7 1.7 0 0 0 1.5 2.5h13.4a1.7 1.7 0 0 0 1.5-2.5L13.6 4.9a1.8 1.8 0 0 0-3.2 0Z'],
    ['watered','Watered',number(watered),'',`Of ${number(records.length)} planned zones`,'M5 12l4 4L19 6'],
   ];
   return metrics.map(([tone,label,value,unit,note,path])=>`
     <div class="dashboard-stat" data-tone="${tone}">
       <dt><span class="dashboard-stat-icon"><svg class="rill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg></span>${label}</dt>
       <dd class="dashboard-stat-value">${value}${unit?` <small>${safe(unit)}</small>`:''}</dd>
       <dd class="dashboard-stat-note">${note}</dd>
     </div>`).join('');
  }
  function filtered() {
   const query=($('#record-search')?.value||'').trim().toLowerCase();const status=$('#status-filter')?.value||'';const sort=$('#record-sort')?.value||'priority';
   return records.filter(r=>(!status||r.status===status)&&(!query||[r.id,r.name,r.place,r.owner,r.note].some(value=>value.toLowerCase().includes(query)))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='value'?b.value-a.value:b.score-a.score);
  }
  function badge(status){
   const chips={review:'review',scheduled:'sage',watered:'ready'};
   return `<span class="rill-chip rill-chip--${chips[statusTone[status]]}">${safe(status)}</span>`;
  }
  function tableHTML(rows) {
   if(!rows.length)return '<p class="workspace-empty">No matching zones. Try a different search or status.</p>';
   const tableRows=rows.map(record=>`<tr>
     <th scope="row"><button type="button" class="record-name" data-record="${safe(record.id)}">${safe(record.name)}<small>${safe(live?record.id.slice(0,8):record.id)}</small></button></th>
     <td><span class="record-place">${safe(record.place)}</span></td><td>${number(record.value)}</td>
     <td><span class="priority-score"><i aria-hidden="true"><span style="width:${record.score}%"></span></i>${number(record.score)}</span></td>
     <td>${badge(record.status)}</td><td>${safe(record.owner)}</td>
   </tr>`).join('');
   return `<div class="table-overflow" tabindex="0" role="region" aria-label="Zone records"><table class="data-table">
     <thead><tr><th scope="col">Zone</th><th scope="col">Farm / zone</th><th scope="col">Allocation (${safe(config.unit)})</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Owner</th></tr></thead>
     <tbody>${tableRows}</tbody>
   </table></div>`;
  }
  function renderAllocation() {
   const chart=$('#allocation-chart');
   const maxBars=8;
   const zones=records.length>maxBars?[...records].sort((left,right)=>right.value-left.value).slice(0,maxBars):records;
   $('#allocation-count').textContent=zones.length<records.length?'Largest 8 allocations':`${zones.length} ${zones.length===1?'zone':'zones'}`;
   if(!zones.length){chart.innerHTML=`<p class="workspace-empty">${canEdit?'Add a zone to see its water allocation.':'No zones have been added.'}</p>`;return;}
   const largest=Math.max(...zones.map(zone=>zone.value));
   const interval=Math.max(10,Math.ceil(largest/40)*10);
   const maximum=interval*4;
   const ticks=[4,3,2,1,0].map(step=>`<span>${number(step*interval)}</span>`).join('');
   const bars=zones.map(zone=>{
    const label=zone.name.split(' · ')[0].replace(/^Zone\s+/i,'');
    const description=`${zone.name}, ${number(zone.value)} ${config.unit}, ${zone.status}`;
    return `<li><button type="button" class="allocation-bar" data-record="${safe(zone.id)}" data-tone="${statusTone[zone.status]}" aria-label="${safe(description)}" title="${safe(description)}">
      <span class="allocation-fill" style="--allocation:${zone.value/maximum*100}%" aria-hidden="true"></span>
    </button><span class="allocation-label" aria-hidden="true">${safe(label)}</span></li>`;
   }).join('');
   const legend=statuses.map(status=>`<li><i data-tone="${statusTone[status]}" aria-hidden="true"></i>${safe(status)}</li>`).join('');
   chart.innerHTML=`<div class="allocation-chart"><div class="allocation-axis" aria-hidden="true">${ticks}</div>
     <ul class="allocation-bars" style="--bar-count:${zones.length}" aria-label="Allocations by zone">${bars}</ul>
   </div><ul class="allocation-legend" aria-label="Chart legend">${legend}</ul>`;
  }
  function renderQueue(ranked) {
   const review=ranked.filter(record=>record.status==='Needs review');
   $('#attention-summary').textContent=review.length?`${review.length} ${review.length===1?'zone needs':'zones need'} review`:'';
   const items=review.slice(0,3).map(record=>`<li><div class="review-list-heading">
     <button type="button" class="record-name" data-record="${safe(record.id)}">${safe(record.name)}</button>
     <span class="rill-chip rill-chip--review">${number(record.score)} / 100</span>
   </div><p>${safe(record.note)}</p></li>`).join('');
   $('#review-list').innerHTML=items?`<ol class="review-list" aria-label="Highest priority zones">${items}</ol>`:'<p class="workspace-empty">No pending reviews.</p>';
  }
  function render() {
   const html=statsHTML();$('#dashboard-stats').innerHTML=html;$('#report-summary').innerHTML=html;
   const ranked=[...records].sort((a,b)=>b.score-a.score);
   $('#overview-table').innerHTML=tableHTML(ranked.slice(0,5));
   const visible=filtered();$('#record-table').innerHTML=tableHTML(visible);$('#record-count').textContent=`Showing ${visible.length} of ${records.length} zones`;
   renderAllocation();
   renderQueue(ranked);
   renderActivity();
  }
  const workspaceMenu=$('#app-menu');
  const sidebar=$('.app-sidebar');
  const tabs=$$('.app-tab').filter(button=>!live||!button.hasAttribute('data-demo-only'));
  const tabLabels=new Map(tabs.map(button=>[button.dataset.tab,button.textContent.trim()]));
  function setMenu(open) {
   sidebar.classList.toggle('open',open);
   workspaceMenu.setAttribute('aria-expanded',String(open));
   workspaceMenu.setAttribute('aria-label',open?'Close workspace menu':'Open workspace menu');
  }
  function activateTab(tab,updateHash=true) {
   if(!tabLabels.has(tab))tab='overview';
   $$('.app-panel').forEach(panel=>panel.hidden=panel.id!=='panel-'+tab);
   tabs.forEach(button=>{const active=button.dataset.tab===tab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
   $('#breadcrumb').textContent=tabLabels.get(tab);
   setMenu(false);
   if(updateHash){
    history.replaceState(null,'','#'+tab);
    $(`#panel-${tab} .workspace-panel-title`).focus();
   }
  }
  tabs.forEach(button=>button.addEventListener('click',()=>activateTab(button.dataset.tab)));
  $$('[data-open-tab]').forEach(button=>button.addEventListener('click',()=>{
   if(button.dataset.openTab==='records'){
    $('#status-filter').value='';
    $('#record-search').value='';
    render();
   }
   activateTab(button.dataset.openTab);
  }));
  $('#show-attention').addEventListener('click',()=>{$('#status-filter').value='Needs review';$('#record-search').value='';render();activateTab('records');});
  workspaceMenu.addEventListener('click',()=>{
   const open=!sidebar.classList.contains('open');
   setMenu(open);
   if(open)$('.app-tab.active',sidebar)?.focus();
  });
  document.addEventListener('click',event=>{if(sidebar.classList.contains('open')&&!event.target.closest('.app-sidebar, #app-menu'))setMenu(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('open')){setMenu(false);workspaceMenu.focus();}});
  $('.app-main').addEventListener('click',event=>{
   const button=event.target.closest('[data-record]');
   if(button)openRecord(button.dataset.record);
  });
  window.addEventListener('hashchange',()=>activateTab(window.location.hash.slice(1),false));
  $('#record-search').addEventListener('input',render);$('#status-filter').addEventListener('change',render);$('#record-sort').addEventListener('change',render);
  function fillRecord(record) {
   $('#detail-reference').textContent=live?'Zone '+record.id.slice(0,8):record.id+' / SAMPLE RECORD';
   $('#detail-name').textContent=record.name;
   const details=live?[[config.placeLabel,record.place],['Responsible operator',record.owner]]:
     [[config.placeLabel,record.place],['Quantity',number(record.value)+' '+config.unit],['Sample priority',record.score+' / 100'],['Responsible operator',record.owner],['Current status',record.status]];
   $('#detail-meta').innerHTML=details.map(([label,value])=>`<div><dt>${safe(label)}</dt><dd>${safe(value)}</dd></div>`).join('');
   $('#detail-note').value=record.note;
   $('#detail-note').readOnly=!canEdit;
   if(live){
    $('#detail-value').value=record.value;
    $('#detail-score').value=record.score;
    $('#detail-status').value=record.status;
    $('#detail-value').readOnly=!canEdit;
    $('#detail-score').readOnly=!canEdit;
    $('#detail-status').disabled=!canEdit;
   }
   $('#save-note').hidden=!canEdit;
   $('#complete-record').hidden=!canEdit;
   $('#complete-record').disabled=record.status===config.finalStatus;
   $('#reopen-record').hidden=!canEdit||(live?record.status==='Needs review':record.status!==config.finalStatus);
  }
  function openRecord(id) {
   if(saving)return;
   activeRecord=records.find(record=>record.id===id);
   if(!activeRecord)return;
   fillRecord(activeRecord);
   $('#record-dialog').showModal();
  }
  async function loadWorkspacePlan() {
   const [newRecords,newEvents,workspaces]=await Promise.all([
    backend.zones(workspaceId),backend.events(workspaceId),backend.workspaces(context.userId)
   ]);
   const currentWorkspace=workspaces.find(item=>item.id===workspaceId);
   if(!currentWorkspace||currentWorkspace.role!==workspace.role){
    window.location.reload();
    return false;
   }
   workspace=currentWorkspace;
   records=newRecords;
   syncForecastZones();
   workspaceEvents=newEvents;
   showWorkspaceAccess();
   render();
   return true;
  }
  async function refreshActivity(message) {
   try {workspaceEvents=await backend.events(workspaceId);renderActivity();notify(message);}
   catch {notify('Changes saved. Refresh the plan to reload activity.');}
  }
  async function updateActiveRecord(changes, action, close=false) {
   if(!activeRecord||!canEdit||saving)return;
   if(!live){
    Object.assign(activeRecord,changes);
    addActivity(activeRecord,action);
    persist();
    if(close)$('#record-dialog').close();
    notify(action+'.');
    return;
   }
   saving=true;
   try {
    const saved=await backend.updateZone(workspaceId,activeRecord,changes);
    if(!saved){
     $('#record-dialog').close();
     if(await loadWorkspacePlan()){
      notify(canEdit?'A newer version is available. Open the zone again to review it.':'This workspace is read-only.');
     }
     return;
    }
    records=records.map(record=>record.id===saved.id?saved:record);
    syncForecastZones();
    activeRecord=saved;
    if(close)$('#record-dialog').close();
    else fillRecord(saved);
    render();
    await refreshActivity(action+'.');
   }catch{notify('Could not save this zone. Refresh the plan before retrying.');}
   finally{saving=false;}
  }
  $('[data-live-refresh]').addEventListener('click',async()=>{
   if(saving||!live)return;
   saving=true;
   try{if(await loadWorkspacePlan())notify('Workspace plan refreshed.');}
   catch{notify('Could not refresh the workspace plan. Try again.');}
   finally{saving=false;}
  });
  $('#save-note').addEventListener('click',()=>{
   if(!activeRecord||!canEdit)return;
   const note=$('#detail-note').value.trim();
   if(!note){notify('Add a watering note before saving.');$('#detail-note').focus();return;}
   const changes={note};
   if(live){
    const value=$('#detail-value'),score=$('#detail-score');
    if(!value.reportValidity()||!score.reportValidity())return;
    Object.assign(changes,{value:value.valueAsNumber,score:score.valueAsNumber,status:$('#detail-status').value});
   }
   updateActiveRecord(changes,live?'Zone saved':'Watering note updated');
  });
  $('#complete-record').addEventListener('click',()=>{
   if(!activeRecord||activeRecord.status===config.finalStatus)return;
   updateActiveRecord({note:$('#detail-note').value.trim()||activeRecord.note,status:config.finalStatus},'Cycle marked watered',true);
  });
  $('#reopen-record').addEventListener('click',()=>{
   if(!activeRecord||(live?activeRecord.status==='Needs review':activeRecord.status!==config.finalStatus))return;
   updateActiveRecord({status:'Needs review'},'Zone queued for review',true);
  });
  $$('.add-record').forEach(button=>button.addEventListener('click',()=>{
   if(canEdit&&!saving)$('#add-dialog').showModal();
  }));
  $('#add-form').addEventListener('submit',async event=>{
   event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
   if(saving||!canEdit)return;
   const values=Object.fromEntries(new FormData(form));const value=Number(values.value);
   if(!Number.isFinite(value)||value<=0||value>1000000)return;
   const fields=['name','place','owner','note'];if(fields.some(field=>!String(values[field]).trim())){notify('Complete each field before adding a zone.');return;}
   const zone={name:values.name.trim().slice(0,120),place:values.place.trim().slice(0,120),value,score:50,status:'Scheduled',owner:values.owner.trim().slice(0,80),note:values.note.trim().slice(0,1500)};
   function showAddedZone() {
    $('#status-filter').value='';$('#record-search').value='';$('#add-dialog').close();form.reset();activateTab('records');
   }
   if(live){
    addRequestId??=crypto.randomUUID();
    saving=true;
    try {
     const saved=await backend.createZone(workspaceId,{...zone,id:addRequestId});
     records=[saved,...records.filter(record=>record.id!==saved.id)];
     syncForecastZones();
     addRequestId=null;
     showAddedZone();
     render();
     await refreshActivity('Zone added.');
    }catch(error){
     if(error?.code==='42501'){
      try{
       if(!await loadWorkspacePlan())return;
       if(!canEdit){notify('This workspace is read-only.');return;}
      }catch{/* Keep the form values available if the refresh also fails. */}
     }
     notify('Could not add the zone. Your entries are ready to retry.');
    }
    finally{saving=false;}
    return;
   }
   const prefix=config.records[0][0].split('-')[0];let counter=Math.max(...records.map(r=>Number(r.id.split('-').at(-1))||0),0)+1;
   const record={id:prefix+'-'+counter,...zone};
   addActivity(record,'Zone added');records.unshift(record);
   showAddedZone();persist();notify('New sample '+config.object.toLowerCase()+' created.');
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
  $('#logout').addEventListener('click',async event=>{
   const button=event.currentTarget;
   button.disabled=true;
   try{
    if(live)await backend.signOut();
    else remove('sessionStorage','session');
    window.location.replace(base+'login/');
   }catch{notify('Could not sign out. Try again.');button.disabled=false;}
  });
  for(const dialog of $$('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  syncForecastZones();
  render();
  activateTab(window.location.hash.slice(1)||'overview',false);
  $('[data-dashboard-shell]').hidden=false;
 }
})();
