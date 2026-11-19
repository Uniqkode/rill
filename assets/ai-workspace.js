/* Evidence-led product interactions. Prepared examples and connected AI are explicit modes. */
(() => {
 'use strict';
 const brand=window.BRAND;if(!brand?.ai)return;
 const icon='<svg class="ui-arrow" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8"/></svg>';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const newId=()=>brand.slug+'-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
 const number=value=>Number(value).toLocaleString('en-NG');
 const storageKey='b2b:'+brand.slug+':analyses';
 const $=(s,root=document)=>root.querySelector(s);
 const $$=(s,root=document)=>[...root.querySelectorAll(s)];
 function readHistory(){
  try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(value)?value.filter(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&Array.isArray(r.findings)&&r.findings.length<=20).slice(0,50):[];}catch{return [];}
 }
 function writeHistory(rows){try{localStorage.setItem(storageKey,JSON.stringify(rows.slice(0,50)));return true;}catch{return false;}}
 function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function timestamp(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))?value:'';}
 function reportText(report){
  const dates=[['Prepared',timestamp(report.generatedAt)],['Queued',timestamp(report.acceptedAt)]]
   .filter(([,value])=>value).map(([label,value])=>label+': '+value+'\n').join('');
  return `# ${brand.name} — ${report.title}\n\nMode: ${report.mode==='live'?'Connected AI service':'Prepared sample report'}\nStatus: ${report.accepted?'Queued for human review':'Not accepted for review'}\n${dates}\n${report.summary}\n\n`+report.findings.map((f,i)=>`## ${i+1}. ${f.title}\n\nSource: ${f.source}\n> ${f.quote}\n\nNext action: ${f.action}\n`).join('\n')+'\n## Source material\n\n'+(report.sources||[]).map(s=>`### ${s.id}: ${s.name}\n\n${s.excerpt}\n`).join('\n')+'\n## Scope\n\n'+brand.ai.scope+'\n\nPrepared examples are illustrative. Connected results require verification by the responsible reviewer.\n';
 }
 function renderHistory(){
  const target=$('[data-ai-history]');if(!target)return;
  const rows=readHistory();
  target.innerHTML=rows.length?rows.map((r,i)=>`<article class="ai-history-item"><div><h3>${esc(r.title)}</h3><p>${r.mode==='live'?'Connected AI':'Prepared example'} · ${r.findings.length} finding${r.findings.length===1?'':'s'} · Queued for human review</p></div><button class="text-button" type="button" data-ai-history-export="${i}">Download report ${icon}</button></article>`).join(''):'<p>Run an analysis and accept it for review to add a report here.</p>';
  $$('[data-ai-history-export]',target).forEach(button=>button.addEventListener('click',()=>{const report=rows[Number(button.dataset.aiHistoryExport)];if(report)download(reportText(report),brand.slug+'-analysis-'+report.id+'.md');}));
 }
 const slider=$('[data-workload-slider]');
 if(slider)slider.addEventListener('input',()=>{
  const organizations=Number(slider.value),w=brand.ai.workload,volume=organizations*w.units*w.cycles*w.items;
  $('#workload-organization-output').value=String(organizations);
  $('[data-workload-calculated]').textContent=number(volume)+' '+w.unit;
  const tokens=$('[data-workload-tokens]');if(tokens)tokens.textContent=number(volume*500)+' input tokens, assuming 500 per page';
 });
 for(const root of $$('[data-ai-workbench]')){
  let current=null,caseName='primary',requestVersion=0,controller=null;
  const status=$('[data-ai-status]',root),progress=$('[data-ai-progress]',root),output=$('[data-ai-output]',root);
  let sources=brand.ai.sources.map(s=>({...s}));
  const activeCase=()=>caseName==='alternate'?{title:brand.ai.alternate.name,sources:[{...brand.ai.alternate.source}],findings:[{...brand.ai.alternate.finding}],summary:'The prepared follow-up contains one routine review action. Check the source and retain the responsible reviewer’s decision.'}:{title:brand.ai.outputTitle,sources:brand.ai.sources.map(s=>({...s})),findings:brand.ai.findings.map(f=>({...f})),summary:brand.ai.summary};
  function showSource(id,quote=''){
   const source=sources.find(s=>s.id===id);if(!source)return;
   $('[data-ai-filename]',root).textContent=source.name;
   const text=$('[data-ai-excerpt]',root),content=source.excerpt;
   const at=quote?content.toLowerCase().indexOf(quote.toLowerCase()):-1;
   if(at>=0)text.innerHTML=esc(content.slice(0,at))+'<mark>'+esc(content.slice(at,at+quote.length))+'</mark>'+esc(content.slice(at+quote.length));
   else text.textContent=content;
   let image=$('.ai-user-image',root);
   if(source.image){if(!image){image=document.createElement('img');image.className='ai-user-image';image.alt='User-provided test image';text.before(image);}image.src=source.image;image.style.cssText='display:block;width:100%;max-height:260px;object-fit:contain;margin-top:16px';}
   else image?.remove();
   $('.ai-source-document',root).classList.toggle('is-cited',!!quote);
   $$('[data-source]',root).forEach(button=>{const active=button.dataset.source===id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  }
  function renderSources(){
   const tabs=$('[data-ai-sources]',root);tabs.innerHTML=sources.map((s,i)=>`<button type="button" data-source="${esc(s.id)}" aria-pressed="${i===0}" class="${i===0?'active':''}"><span>${esc(s.id)}</span>${esc(s.kind)}</button>`).join('');
   $$('[data-source]',tabs).forEach(button=>button.addEventListener('click',()=>showSource(button.dataset.source)));
   showSource(sources[0].id);
  }
  function renderReport(report){
   report.generatedAt??=new Date().toISOString();
   current=report;
   output.innerHTML=`<div class="ai-report-meta"><span>${report.mode==='live'?'CONNECTED AI ANALYSIS':'PREPARED SAMPLE ANALYSIS'}</span><span>${report.cached?'Cached result · no new model request':report.mode==='live'?'Check every cited claim':'No live AI request was sent'}</span></div><div class="ai-report-summary">${esc(report.summary)}</div>${report.findings.map((f,i)=>`<article class="ai-finding"><div class="ai-finding-top"><h4>${esc(f.title)}</h4><span>${esc(f.level||'Review')}</span></div><button class="ai-evidence-quote" type="button" data-ai-citation="${i}"><span>${esc(f.source)}</span>“${esc(f.quote)}” ${icon}</button><p class="ai-finding-action"><strong>NEXT ACTION</strong>${esc(f.action)}</p></article>`).join('')}`;
   if(report.usage){const line=document.createElement('p');line.className='ai-report-meta';line.textContent=`Service-reported usage: ${number(report.usage.input_tokens||0)} input tokens · ${number(report.usage.output_tokens||0)} output tokens`;output.append(line);}
   $$('[data-ai-citation]',root).forEach(button=>button.addEventListener('click',()=>{const f=report.findings[Number(button.dataset.aiCitation)];showSource(f.source,f.quote);}));
   $('[data-ai-report-actions]',root).hidden=false;
   const accept=$('[data-ai-accept]',root);accept.disabled=!!report.accepted;accept.innerHTML=report.accepted?'Queued for human review':'Accept for human review '+icon;
  }
  $('[data-ai-case]',root).addEventListener('change',event=>{
   caseName=event.target.value;requestVersion++;controller?.abort();current=null;sources=activeCase().sources;renderSources();progress.hidden=true;
   output.innerHTML='<div class="ai-output-empty"><h4>A different case.<br>A different review.</h4><p>Run the selected sample to inspect its evidence and next action.</p></div>';
   $('[data-ai-report-actions]',root).hidden=true;status.textContent='Case selected. Run the sample to prepare its report.';
   $('[data-ai-live-run]',root).disabled=false;
  });
  $('[data-ai-run]',root).addEventListener('click',()=>{
   requestVersion++;controller?.abort();$('[data-ai-live-run]',root).disabled=false;const selected=activeCase();sources=selected.sources;renderSources();
   progress.hidden=false;progress.innerHTML='<strong>Prepared review steps</strong><ol>'+brand.ai.stages.map(s=>'<li>'+esc(s[0])+'</li>').join('')+'</ol>';
   const report={...selected,id:newId(),mode:'sample',accepted:false};renderReport(report);
   status.textContent='Prepared report ready. Open a source citation before accepting the report for human review.';
  });
  $('[data-ai-accept]',root).addEventListener('click',()=>{
   if(!current||current.accepted)return;
   const retained={...current,accepted:true,acceptedAt:new Date().toISOString(),sources:current.sources.map(({image,...source})=>source)};
   if(!writeHistory([retained,...readHistory()])){status.textContent='Browser storage is unavailable. Download the report to keep a copy.';return;}
   current.accepted=true;current.acceptedAt=retained.acceptedAt;renderReport(current);renderHistory();
   document.dispatchEvent(new Event('rill:report-saved'));
   status.textContent='Report queued for human review in this browser.';
  });
  $('[data-ai-download]',root).addEventListener('click',()=>{if(current){download(reportText(current),brand.slug+'-'+(current.mode==='live'?'ai':'sample')+'-report.md');status.textContent='Report downloaded with its source references and review status.';}});
  const files=$('[data-ai-files]',root);
  files.addEventListener('change',()=>{$('[data-ai-file-count]',root).textContent=files.files.length?files.files.length+' test image(s) selected. Uploaded only when you run the connected service.':'Up to 4 test images; 2 MB each.';});
  $('[data-ai-live-run]',root).addEventListener('click',async()=>{
   const ownVersion=++requestVersion;
   controller?.abort();controller=new AbortController();
   const button=$('[data-ai-live-run]',root),endpoint=$('[data-ai-endpoint]',root).value.trim(),text=$('[data-ai-custom-text]',root).value.trim();
   try{
    const url=new URL(endpoint);if(url.search||url.hash)throw new Error('Use the service base address without query parameters or a fragment.');if(url.username||url.password||!['https:','http:'].includes(url.protocol)||(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new Error('Use an HTTPS AI service address, or localhost for local development.');
    if(!text&&files.files.length===0)throw new Error('Add text or a test image for the connected service to analyze.');
    if(files.files.length>4)throw new Error('Choose at most four test images.');
    button.disabled=true;status.textContent='Checking the configured service…';
    const origin=url.href.replace(/\/$/,'');const health=await fetch(origin+'/api/health',{signal:controller.signal}).then(r=>r.json());
    if(!health.configured)throw new Error('The AI service is not fully configured. Set its provider credentials and, for Azure, the resource endpoint and deployment name on the server.');
    const inputs=[];if(text)inputs.push({id:'S1',name:'User test material',kind:'text',text});
    for(const [index,file] of [...files.files].entries()){
     if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024)throw new Error('Use JPEG, PNG or WebP test images up to 2 MB each.');
     const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('The selected image could not be read.'));reader.readAsDataURL(file);});
     inputs.push({id:'I'+(index+1),name:file.name,kind:'image',image});
    }
    status.textContent='Sending the entered test material to your configured AI service…';
    const serviceToken=$('[data-ai-service-token]',root).value.trim();
    const headers={'Content-Type':'application/json'};if(serviceToken)headers.Authorization='Bearer '+serviceToken;
    const response=await fetch(origin+'/api/analyze',{method:'POST',headers,body:JSON.stringify({brand:brand.slug,inputs}),signal:controller.signal});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'The service could not complete this analysis.');
    if(ownVersion!==requestVersion)return;
    if(!data.report||!Array.isArray(data.report.findings)||!data.report.findings.length)throw new Error('The service returned no reviewable findings.');
    const ids=new Set(inputs.map(i=>i.id));if(data.report.findings.some(f=>!ids.has(f.source)||typeof f.title!=='string'||typeof f.quote!=='string'||typeof f.action!=='string'))throw new Error('The service returned a finding without a valid source reference.');
    sources=inputs.map(i=>({id:i.id,name:i.name,kind:i.kind==='image'?'Uploaded test image':'Entered test text',excerpt:i.text||'Image supplied for this connected analysis.',image:i.image}));renderSources();
    const report={id:newId(),title:data.report.title||brand.ai.outputTag,summary:data.report.summary,findings:data.report.findings,sources,mode:'live',accepted:false,usage:data.usage,cached:data.cached};
    renderReport(report);progress.hidden=true;status.textContent='Connected analysis ready. Verify the cited evidence before making any operational decision.';
   }catch(error){if(error.name!=='AbortError')status.textContent=error.message||'The service is unavailable. Check its address and connection settings.';}
   finally{if(ownVersion===requestVersion)button.disabled=false;}
  });
  renderSources();
 }
 renderHistory();
})();
