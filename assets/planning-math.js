const day=86400000;
function number(value,name,min=0,max=1e9){
 const n=Number(value);if(value===''||!Number.isFinite(n)||n<min||n>max)throw new Error('Enter a valid '+name+'.');return n;
}
function date(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Choose valid calendar dates.');
 const result=new Date(value+'T00:00:00Z');if(!Number.isFinite(result.getTime())||result.toISOString().slice(0,10)!==value)throw new Error('Choose valid calendar dates.');return result;
}
export function reviewTime(values){
 const volume=number(values.volume,'monthly volume',1,100000),before=number(values.before,'current review time',1,10000),after=number(values.after,'planned review time',0,10000),hourly=number(values.hourly,'hourly cost',0,10000000);
 const currentHours=volume*before/60,plannedHours=volume*after/60,hours=currentHours-plannedHours;
 return {volume,before,after,hourly,currentHours,plannedHours,hours,cost:hours*hourly};
}
export function weights(dispatch,received){
 dispatch=number(dispatch,'dispatch weight',.001,100000);received=number(received,'receiving weight',.001,100000);
 return {dispatch,received,difference:dispatch-received,percent:(dispatch-received)/dispatch*100};
}
export function water(budget,reserve){
 budget=number(budget,'water budget',1,100000);reserve=number(reserve,'reserve percentage',0,100);
 const available=budget*(1-reserve/100);const one=Math.floor(available*.4*10)/10,two=Math.floor(available*.35*10)/10,three=Math.round((available-one-two)*100)/100;
 return {budget,reserve,available,reserved:budget-available,zones:[one,two,three]};
}
export function temperature(reading,threshold,duration){
 reading=number(reading,'recorded temperature',-30,60);threshold=number(threshold,'review threshold',-30,60);duration=number(duration,'duration',0,1440);
 return {reading,threshold,duration,difference:reading-threshold,review:reading>threshold&&duration>0};
}
export function area(survey,title){
 survey=number(survey,'survey area',.001,100000);title=number(title,'title area',.001,100000);
 return {survey,title,difference:Math.abs(survey-title),percent:Math.abs(survey-title)/survey*100};
}
export function notice(reference,days){
 const input=date(reference);days=number(days,'notice period',1,3660);if(!Number.isInteger(days))throw new Error('Use a whole number of notice days.');
 const result=new Date(input.getTime()-days*day);return {reference,days,date:result.toISOString().slice(0,10)};
}
export function video(cameras,hours,fps){
 cameras=number(cameras,'camera count',1,5000);hours=number(hours,'monitored hours',1,24);fps=number(fps,'sampling rate',.01,60);
 if(!Number.isInteger(cameras))throw new Error('Use a whole number of cameras.');
 return {cameras,hours,fps,frames:cameras*hours*3600*fps,cameraHours:cameras*hours};
}
export function coverage(expiry,start,end){
 const e=date(expiry),s=date(start),f=date(end);if(f<s)throw new Error('The job end date must follow its start date.');
 const workDays=Math.round((f-s)/day)+1;
 const uncoveredStart=Math.max(s.getTime(),e.getTime()+day);
 const uncoveredDays=Math.max(0,Math.round((f.getTime()-uncoveredStart)/day)+1);
 return {expiry,start,end,workDays,uncoveredDays,coveredDays:workDays-uncoveredDays};
}
