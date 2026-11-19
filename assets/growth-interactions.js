import * as planning from './planning-math.js';

(() => {
 'use strict';
 const b=window.BRAND;if(!b)return;
 const $=(q,root=document)=>root.querySelector(q);
 const $$=(q,root=document)=>[...root.querySelectorAll(q)];
 const fmt=(v,d=1)=>Number(v).toLocaleString('en-NG',{maximumFractionDigits:d});
 const cash=v=>'₦'+fmt(Math.round(v),0);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const calendar=s=>new Date(s+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 function download(content,name){const blob=new Blob([content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

 $$('[data-value-planner]').forEach(root=>{
  let result=null;
  const update=()=>{
   try{
    const input=Object.fromEntries($$('[data-value]',root).map(n=>[n.dataset.value,n.value]));result=planning.reviewTime(input);
    $('[data-value-direction]',root).textContent=result.hours>=0?'Estimated time released in this plan':'Additional time in this plan';
    $('[data-value-hours]',root).textContent=fmt(Math.abs(result.hours));
    $('[data-value-current]',root).textContent=fmt(result.currentHours)+' hours';
    $('[data-value-planned]',root).textContent=fmt(result.plannedHours)+' hours';
    $('[data-value-cost]',root).textContent=(result.cost<0?'+':'')+cash(Math.abs(result.cost));
    const max=Math.max(result.currentHours,result.plannedHours,1);
    $('[data-value-bar="before"]',root).style.width=result.currentHours/max*100+'%';
    $('[data-value-bar="after"]',root).style.width=result.plannedHours/max*100+'%';
    $('[data-value-error]',root).textContent='';$('[data-value-export]',root).disabled=false;
   }catch(error){result=null;for(const selector of ['[data-value-hours]','[data-value-current]','[data-value-planned]','[data-value-cost]'])$(selector,root).textContent='—';$$('[data-value-bar]',root).forEach(n=>n.style.width='0%');$('[data-value-error]',root).textContent=error.message;$('[data-value-export]',root).disabled=true;}
  };
  $$('[data-value]',root).forEach(n=>n.addEventListener('input',update));
  $('[data-value-export]',root).addEventListener('click',()=>{if(!result)return;download(`${b.name.toUpperCase()} — REVIEW VALUE PLAN\n\nPlanning assumptions, not measured product or customer results.\n\nMonthly ${b.growth.value.unit}: ${result.volume}\nCurrent minutes per review: ${result.before}\nPlanned minutes per review: ${result.after}\nReviewer cost per hour (NGN): ${result.hourly}\n\nCurrent hours: ${fmt(result.currentHours)}\nPlanned hours: ${fmt(result.plannedHours)}\nTime difference (hours): ${fmt(result.hours)}\nTime value difference (NGN): ${fmt(result.cost)}\n\nActual outcomes need measurement in the workflow.\n`,b.slug+'-review-value-plan.txt');});
  update();
 });

 $$('[data-domain-tool]').forEach(root=>{
  const kind=root.dataset.domainTool;
  const get=name=>$('[data-tool-input="'+name+'"]',root)?.value;
  const set=(label,value,note,review=false)=>{$('[data-tool-label]',root).textContent=label;$('[data-tool-value]',root).textContent=value;$('[data-tool-note]',root).textContent=note;root.classList.toggle('needs-review',review);};
  if(kind==='survey'||kind==='maintenance'){
   const draw=()=>{
    const state=$('[data-tool-filter]',root).value;
    const records=b.records.filter(r=>!state||r[5]===state);
    $('[data-tool-records]',root).innerHTML=records.map((r,i)=>`<button type="button" data-tool-record="${safe(r[0])}" aria-pressed="${i===0}"><span>${safe(r[0])}</span><strong>${safe(r[1])}</strong><small>${safe(r[5])}</small></button>`).join('');
    const inspect=id=>{const record=records.find(r=>r[0]===id);if(!record)return;$$('[data-tool-record]',root).forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.toolRecord===id)));$('[data-tool-detail]',root).innerHTML=`<strong>${safe(record[1])}</strong><p>${safe(record[7])}</p><span>Assigned in the supplied record: ${safe(record[6])}</span>`;};
    $$('[data-tool-record]',root).forEach(n=>n.addEventListener('click',()=>inspect(n.dataset.toolRecord)));
    if(records[0])inspect(records[0][0]);else $('[data-tool-detail]',root).textContent='No supplied records match this review state.';
   };
   $('[data-tool-filter]',root).addEventListener('change',draw);draw();return;
  }
  const update=()=>{
   try{
    if(kind==='weights'){
     const r=planning.weights(get('dispatch'),get('received'));set('Difference between the entered tickets',fmt(Math.abs(r.difference))+' tonnes',Math.abs(r.difference)<.000001?'The entered quantities match. Confirm the lot reference, units and source tickets.':`Receiving weight is ${r.difference>0?'lower':'higher'} by ${fmt(Math.abs(r.percent),2)}% of dispatch. Check the tickets and handling record before deciding the cause.`,Math.abs(r.difference)>.000001);
    }
    if(kind==='water'){
     const r=planning.water(get('budget'),get('reserve'));set('Available after the entered reserve',fmt(r.available)+' m³',fmt(r.reserved)+' m³ reserved. The three-zone split uses planning weights of 40%, 35% and 25%; it is not a crop-demand forecast.');
     $('[data-water-zones]',root).innerHTML=r.zones.map((v,i)=>`<div><span>ZONE 0${i+1}</span><strong>${fmt(v)} m³</strong><i style="width:${r.budget?v/r.budget*100:0}%"></i></div>`).join('');
    }
    if(kind==='temperature'){
     const r=planning.temperature(get('reading'),get('threshold'),get('duration'));set(r.review?'Review threshold exceeded':'Entered threshold comparison',r.review?fmt(r.difference)+'°C above':r.duration===0?'No duration entered':'Within threshold',r.review?`The entered reading is above the threshold for ${fmt(r.duration)} minutes. Inspect the source history and the applicable handling policy.`:'This comparison does not establish product condition or release approval. Check sensor quality, source history and the handling policy.',r.review);
    }
    if(kind==='parcel'){
     const r=planning.area(get('survey'),get('title'));set('Difference in the entered schedules',fmt(r.difference)+' ha',r.difference<.000001?'The entered areas match. Parcel identity, document versions, title and boundaries still require professional review.':`${fmt(r.percent,2)}% of the survey area. Refer both source schedules to the appointed surveyor or lawyer.`,r.difference>.000001);
     const max=Math.max(r.survey,r.title);$('[data-area-bar="survey"]',root).style.width=r.survey/max*100+'%';$('[data-area-bar="title"]',root).style.width=r.title/max*100+'%';
    }
    if(kind==='notice'){
     const r=planning.notice(get('reference'),get('notice'));set(r.days+' calendar days before the reference date',calendar(r.date),'Calendar arithmetic only. Confirm the governing clause, amendment, service rules and local notice requirements.');
    }
    if(kind==='video'){
     const r=planning.video(get('cameras'),get('hours'),get('fps'));set('Sampled frames in this daily capacity plan',fmt(r.frames,0),`${fmt(r.cameraHours)} camera-hours × ${fmt(r.fps,2)} sampled frames/second. Model latency, event quality, GPU capacity and actual cost require measurement.`);root.style.setProperty('--sample-rate',Math.min(2,r.fps));
    }
    if(kind==='coverage'){
     const r=planning.coverage(get('expiry'),get('start'),get('end'));set(r.uncoveredDays?'Work dates beyond the entered expiry':'Expiry reaches the entered job end',r.uncoveredDays?fmt(r.uncoveredDays,0)+' work '+(r.uncoveredDays===1?'day':'days'):'End date covered',r.uncoveredDays?`${r.uncoveredDays} of ${r.workDays} entered work days fall after the policy expiry. Request evidence covering the work period.`:'Verify the policy start date, scope and authenticity separately. This date comparison does not authorize work.',r.uncoveredDays>0);
    }
    if(kind==='scope'){
     const all=get('scope')==='all';set(all?'The requested scope is wider than the extract':'The extract addresses the requested group',all?'Clarification needed':'Administrator scope',all?'The passage describes administrator accounts. Ask for evidence covering all users and any exceptions.':'The supplied passage addresses administrator access. The responsible reviewer must still confirm the control, applicability and source version.',all);
    }
   }catch(error){set('Check the entries','Enter valid values',error.message,true);if(kind==='water')$('[data-water-zones]',root).textContent='';if(kind==='parcel')$$('[data-area-bar]',root).forEach(n=>n.style.width='0%');}
  };
  $$('[data-tool-input]',root).forEach(n=>{n.addEventListener('input',update);n.addEventListener('change',update);});update();
 });

 function wireTabs(root,buttonSelector,panelSelector){
  const buttons=$$(buttonSelector,root),panels=$$(panelSelector,root);
  const activate=(index,focus=false)=>{buttons.forEach((button,i)=>{const on=i===index;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;});panels.forEach((panel,i)=>panel.hidden=i!==index);if(focus)buttons[index].focus();};
  buttons.forEach((button,index)=>{
   button.addEventListener('click',()=>activate(index));
   button.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%buttons.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index-1+buttons.length)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;event.preventDefault();activate(next,true);});
  });
 }
 $$('.g-market-tabs').forEach(root=>wireTabs(root,'[data-market-tab]','[data-market-panel]'));
 $$('[data-pipeline]').forEach(root=>wireTabs(root,'[data-pipeline-tab]','[data-pipeline-panel]'));
 $$('[data-workflow-tour]').forEach(root=>{
  const buttons=$$('[data-tour-step]',root);let current=0;
  const show=i=>{current=i;buttons.forEach((n,j)=>{n.setAttribute('aria-selected',String(i===j));n.tabIndex=i===j?0:-1;});const [title,copy]=b.ai.stages[i];$('[data-tour-position]',root).textContent=String(i+1).padStart(2,'0')+' / 04';$('[data-tour-title]',root).textContent=title;$('[data-tour-copy]',root).textContent=copy;root.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby',buttons[i].id);$('[data-tour-next]',root).firstChild.textContent=i===3?'Back to the start ':'Next step ';};
  buttons.forEach((n,i)=>{n.addEventListener('click',()=>show(i));n.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;show(next);buttons[next].focus();});});
  $('[data-tour-next]',root).addEventListener('click',()=>show((current+1)%4));
 });

 $$('[data-enquiry-form]').forEach(form=>{
  const date=form.elements.date;if(date)date.min=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'});
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const data=Object.fromEntries(new FormData(form).entries());
   const plan=form.dataset.selectedPlan;
   const planLine=plan?'\nPlan: '+plan:'';
   const body=`PRODUCT WALKTHROUGH ENQUIRY — ${b.name}\n\nOrganization / team: ${String(data.organization||'Not supplied').trim()}\nWorkflow: ${data.workflow}${planLine}\nPreferred date: ${data.date||'No preference'}\nPreferred time (Africa/Lagos): ${data.time||'No preference'}\n\n${String(data.message||'').trim()}\n\nScheduling preference only.`;
   let destination;
   if(form.dataset.enquiryMethod==='email'&&b.company.contactEmail)destination='mailto:'+b.company.contactEmail+'?subject='+encodeURIComponent(b.name+' product walkthrough')+'&body='+encodeURIComponent(body);
   else{destination=new URL('https://github.com/Uniqkode/b2b-product-studio/issues/new');destination.searchParams.set('title',b.name+' product walkthrough');destination.searchParams.set('body',body);destination=destination.href;}
   $('[data-enquiry-copy]',form).textContent=body;$('[data-enquiry-send]',form).href=destination;$('[data-enquiry-preview]',form).hidden=false;
  });
  const prepare=$('[data-enquiry-prepare]',form);if(prepare)prepare.disabled=false;
 });

 if(typeof IntersectionObserver==='function'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('g-in-view');observer.unobserve(entry.target);}}),{threshold:.08});
  $$('[data-enter]').forEach(node=>observer.observe(node));
 }
})();
