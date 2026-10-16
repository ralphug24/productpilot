(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const key = 'wordrush-study-kit-v3';
  const previousKey = 'wordrush-group-research-v2';
  const players = ['p1', 'p2', 'p3'];
  const stageLabels = {baseline:'Baseline','follow-up':'Follow-up',exploratory:'Exploratory'};
  const measurementProtocol = 'wordrush-three-tasks-v1';
  const previousTask = 'Get all three of you into the same WordRush room, play one complete game in the chosen mode, and reach its end or results screen.';
  const tasks = [
    {id:'1',label:'Task 1 · Create & join a room',prompt:'One of you creates a room. The other two join it.'},
    {id:'2a',label:'Task 2a · Word Search — Medium',prompt:'Pick one Word Search game and play it on Medium.'},
    {id:'2b',label:'Task 2b · Word Search — Hard',prompt:'Pick a different Word Search game and play it on Hard.'},
    {id:'3a',label:'Task 3a · Scramble Rush — Medium',prompt:'Pick one Scramble Rush game and play it on Medium.'},
    {id:'3b',label:'Task 3b · Scramble Rush — Hard',prompt:'Pick a different Scramble Rush game and play it on Hard.'}
  ];
  const defaultTask = tasks.map(task=>`${task.label}: ${task.prompt}`).join('\n');
  const standardPlan = () => record.fields.taskPlan===measurementProtocol&&!record.fields.taskGoal?.trim();
  const taskPrompt = () => record.fields.taskGoal?.trim()||(record.fields.taskPlan===measurementProtocol?defaultTask:previousTask);
  const studyFormLinks = {preFormUrl:'https://forms.cloud.microsoft/r/EE28D6hUzT',postFormUrl:'https://forms.cloud.microsoft/r/M5e82FHNWR'};
  const eventLabels = {confusion:'Confusion','moderator-help':'Researcher gave help','peer-help':'Peer help',bug:'Bug / error',positive:'Worked well',bookmark:'Bookmark'};
  const phaseLabels = {session:'Study session',setup:'Creating and joining',play:'Playing',results:'Ending / results',debrief:'Group discussion',rotation:'Optional role rotation — learned attempt'};
  const typeLabels = {observed:'Observed on shared screen',reported:'Player report — not directly observed',quote:'Verbatim participant quote',interpretation:'Researcher interpretation — excluded from evidence'};
  const help = {observed:'Describe what you could see. Choose Participant report for an unseen player’s account.',reported:'Record this as a report. Choose Exact quote only when you captured the actual words.',quote:'Use only the exact words spoken by one identified participant. Check the recording if needed.',interpretation:'Record your hypothesis or explanation. It stays in the backup and is excluded from participant evidence.'};
  function node(tag, content, className) {const el=document.createElement(tag);if(content!==undefined)el.textContent=content;if(className)el.className=className;return el;}
  for (const [index,p] of players.entries()) {
    const role=index===0?'Host':'Joiner';
    const card=node('div',undefined,'player');
    card.innerHTML=`<h3>Player ${index+1} · ${role}</h3><div><label for="${p}Code">Participant code</label><input id="${p}Code" name="${p}Code" maxlength="20" pattern="[A-Za-z0-9_-]+" placeholder="P0${index+1}"></div>`;
    $('#players').append(card);
    const background=node('div',undefined,'background-row');
    background.innerHTML=`<b>Player ${index+1}</b><div><label for="${p}Device">Device / browser · optional</label><input id="${p}Device" name="${p}Device" maxlength="300" placeholder="From your pre-study form"></div><div><label for="${p}PriorUse">Previous WordRush use · optional</label><select id="${p}PriorUse" name="${p}PriorUse"><option value="">Not recorded here</option><option>First time</option><option>Previously played</option><option>Not established</option></select></div>`;
    $('#background-fields').append(background);
  }
  const form=$('#group-form'),noteForm=$('#note-form');
  const controls=[...form.elements].filter(el=>el.name);
  let store={schemaVersion:3,study:'wordrush-group',records:[],activeId:null};
  let storageOK=true,editId=null,editCategory=null;
  const now=()=>new Date().toISOString();
  const blank=()=>({id:crypto.randomUUID(),kind:'group',createdAt:now(),updatedAt:now(),fields:{taskPlan:measurementProtocol},notes:[],draft:{}});
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const string=(value,max=12000)=>typeof value==='string'&&value.length<=max;
  function validateLegacy(item) {
    if(!object(item)||!string(item.id,200)||!item.id||!object(item.fields))throw Error('An earlier record is missing its ID or fields.');
    if(Object.values(item.fields).some(v=>typeof v!=='boolean'&&!string(v,100000)))throw Error('An earlier record has an unsupported field.');
    return {id:crypto.randomUUID(),kind:'legacy-individual',legacy:JSON.parse(JSON.stringify(item))};
  }
  function validateGroup(item) {
    if(!object(item)||!string(item.id,200)||!item.id)throw Error('A record is missing its ID.');
    if(item.kind==='legacy-individual') {const legacy=validateLegacy(item.legacy);legacy.id=item.id;return legacy;}
    if(item.kind!=='group'||!object(item.fields)||!Array.isArray(item.notes)||item.notes.length>2000)throw Error('A group record has an unsupported structure.');
    const fields=Object.create(null);
    if(Object.keys(item.fields).length>200)throw Error('A record contains too many fields.');
    for(const [name,value] of Object.entries(item.fields)) {
      if(!/^[A-Za-z][A-Za-z0-9]*$/.test(name)||['constructor','prototype','__proto__'].includes(name)||typeof value!=='boolean'&&!string(value,100000))throw Error('A saved field is invalid.');
      fields[name]=value;
    }
    for(const el of controls) {
      const value=item.fields[el.name];if(value===undefined)continue;
      if(el.type==='checkbox') {if(typeof value!=='boolean')throw Error('A permission field is invalid.');fields[el.name]=value;}
      else {
        if(!string(value,100000))throw Error('A form field is too long or invalid.');
        if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===value))throw Error('A form choice is not supported.');
        fields[el.name]=value;
      }
    }
    const noteIds=new Set();
    function validateNote(note,isDraft=false) {
      if(!object(note))throw Error('A note is invalid.');
      if(!string(note.phase,30)||!Object.hasOwn(phaseLabels,note.phase)||!['',...players,'group'].includes(note.actor)||!string(note.type,30)||!Object.hasOwn(typeLabels,note.type)||!string(note.text,12000)||!string(note.time,40))throw Error('A note has invalid fields.');
      const clean={phase:note.phase,actor:note.actor,type:note.type,text:note.text,time:note.time};
      if(note.task!==undefined) {if(note.task!==''&&!tasks.some(task=>task.id===note.task))throw Error('A note has an unsupported task label.');clean.task=note.task;}
      if(note.category!==undefined) {if(!Object.hasOwn(eventLabels,note.category))throw Error('An event marker is invalid.');clean.category=note.category;}
      if(note.timeSource!==undefined) {if(!['recording-clock','manual','not-recorded'].includes(note.timeSource))throw Error('A timestamp source is invalid.');clean.timeSource=note.timeSource;}
      if(isDraft) {if(string(note.editId,200))clean.editId=note.editId;}
      else {
        if(!string(note.id,200)||!note.id||noteIds.has(note.id)||!note.actor||(!note.text.trim()&&!clean.category)||(note.type==='quote'&&(note.actor==='group'||!note.text.trim())))throw Error('A saved note needs an ID, a person or group, and text or an event marker. Exact quotes need an individual speaker and text.');
        noteIds.add(note.id);clean.id=note.id;
        if(string(note.createdAt,100))clean.createdAt=note.createdAt;
        if(string(note.updatedAt,100))clean.updatedAt=note.updatedAt;
      }
      return clean;
    }
    const clean={id:item.id,kind:'group',fields,notes:item.notes.map(n=>validateNote(n)),draft:{}};
    if(object(item.draft)&&Object.keys(item.draft).length)clean.draft=validateNote(item.draft,true);
    if(item.clock!==undefined) {
      if(!object(item.clock)||!Number.isFinite(item.clock.elapsedSeconds)||item.clock.elapsedSeconds<0||item.clock.elapsedSeconds>31536000||!(item.clock.runningSince===null||Number.isFinite(item.clock.runningSince)&&item.clock.runningSince>=0&&item.clock.runningSince<1e14)||typeof item.clock.started!=='boolean')throw Error('The recording clock is invalid.');
      clean.clock={elapsedSeconds:item.clock.elapsedSeconds,runningSince:item.clock.runningSince,started:item.clock.started};
    }
    for(const name of ['createdAt','updatedAt','importedCopyOf'])if(string(item[name],200))clean[name]=item[name];
    return clean;
  }
  function readRecords(data) {
    if(!object(data))throw Error('Choose a research kit backup file.');
    let records;
    if(data.schemaVersion===1&&Array.isArray(data.sessions)&&data.sessions.length<=200)records=data.sessions.map(validateLegacy);
    else if([2,3].includes(data.schemaVersion)&&data.study==='wordrush-group'&&Array.isArray(data.records)&&data.records.length<=200)records=data.records.map(validateGroup);
    else throw Error('This is not a supported WordRush research backup.');
    if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('The backup has duplicate record IDs. No records were loaded.');
    return records;
  }
  try {
    const raw=localStorage.getItem(key)||localStorage.getItem(previousKey);
    if(raw) {const saved=JSON.parse(raw);store.records=readRecords(saved);store.activeId=saved.activeId;}
  } catch {storageOK=false;$('#global-message').textContent='Saved records could not be loaded. Keep any existing backup. New notes can stay in this tab; save a backup before closing.';}
  let record=store.records.find(r=>r.id===store.activeId)||blank();
  function fieldsNow() {return {...record.fields,...Object.fromEntries(controls.map(el=>[el.name,el.type==='checkbox'?el.checked:el.value]))};}
  function draftNow() {return {task:$('#noteTask').value,phase:$('#notePhase').value,actor:$('#noteActor').value,type:$('#noteType').value,text:$('#noteText').value,time:$('#noteTime').value,...(editId?{editId}:{}),...(editCategory?{category:editCategory}:{})};}
  function meaningful(item) {return item.kind!=='group'||item.notes.length||Object.entries(item.fields).some(([name,value])=>name!=='taskPlan'&&value)||item.clock?.started||item.draft.task||item.draft.text||item.draft.actor&&item.draft.actor!=='group'||item.draft.time;}
  function selector() {
    const select=$('#records');select.replaceChildren();
    for(const r of store.records) {
      const label=r.kind==='group'?`${r.fields.groupCode||'Untitled session'}${r.fields.studyStage?` · ${stageLabels[r.fields.studyStage]}`:''} · ${r.fields.sessionFinished?'finished':'in progress'}`:`${r.legacy.fields.code||'Unlabelled'} · earlier individual record`;
      const option=node('option',label+(r.importedCopyOf?' · imported copy':''));option.value=r.id;select.append(option);
    }
    if(!store.records.some(r=>r.id===record.id)) {const option=node('option','New unsaved group session');option.value=record.id;select.append(option);}
    select.value=record.id;
    const groups=store.records.filter(r=>r.kind==='group').length;
    $('#saved-count').textContent=`${groups} saved group records · ${store.records.length-groups} earlier individual records in this browser. Records and imported copies are not a validated count of distinct participants.`;
  }
  function saveStateLabel() {
    $('#global-save').textContent=!storageOK?'Notes are in this tab only — save a backup before closing':store.records.length?'Saved in this browser — backup to move devices':'No notes saved yet on this device';
  }
  function writeStore() {
    store.activeId=record.id;
    try {localStorage.setItem(key,JSON.stringify(store));storageOK=true;}catch {storageOK=false;}
    selector();saveStateLabel();
  }
  function persist() {
    if(record.kind==='group') {
      record.fields=fieldsNow();record.draft=draftNow();
      if(meaningful(record)) {record.updatedAt=now();const index=store.records.findIndex(r=>r.id===record.id);if(index<0)store.records.push(record);else store.records[index]=record;}
    }
    writeStore();
  }
  function resetDraft() {noteForm.reset();editId=null;editCategory=null;$('#cancel-edit').hidden=true;$('#add-note').textContent='Add note';$('#note-help').textContent=help[$('#noteType').value];}
  function clockSeconds() {const clock=record.clock;if(!clock?.started)return null;return Math.max(0,clock.elapsedSeconds+(clock.runningSince===null?0:(Date.now()-clock.runningSince)/1000));}
  function formatTime(seconds) {return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
  function updateClock() {
    const seconds=clockSeconds(),running=record.clock?.runningSince!==null&&seconds!==null;
    $('#clock-display').textContent=seconds===null?'Not started':formatTime(seconds);
    $('#start-clock').hidden=running;$('#pause-clock').hidden=!running;
    $('#start-clock').textContent=seconds===null?'Start recording clock':'Resume clock';
    $('#clock-status').textContent=seconds===null?'Start when Zoom recording begins, or align with its current time.':running?'Recording reference clock running. This does not control Zoom.':'Reference clock paused. Align it again if Zoom kept recording.';
  }
  function showStep(step,focus=false) {
    if(!['prepare','during','after'].includes(step))step='prepare';
    $('.wrap').dataset.currentStep=step;
    document.querySelectorAll('.study-panel').forEach(panel=>panel.hidden=panel.id!==step);
    document.querySelectorAll('[data-step]').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.step===step));button.tabIndex=button.dataset.step===step?0:-1;});
    if(focus)$(`#${step}-tab`).focus();
  }
  document.querySelectorAll('[data-step]').forEach(button=>{
    button.onclick=()=>{showStep(button.dataset.step);history.replaceState(null,'',`#${button.dataset.step}`);};
    button.onkeydown=event=>{const steps=['prepare','during','after'],index=steps.indexOf(button.dataset.step);let next;
      if(event.key==='ArrowRight')next=steps[(index+1)%3];else if(event.key==='ArrowLeft')next=steps[(index+2)%3];else if(event.key==='Home')next=steps[0];else if(event.key==='End')next=steps[2];
      if(next){event.preventDefault();showStep(next,true);history.replaceState(null,'',`#${next}`);}
    };
  });
  document.querySelectorAll('[data-go]').forEach(button=>button.onclick=()=>{showStep(button.dataset.go,true);history.replaceState(null,'',`#${button.dataset.go}`);$('.step-bar').scrollIntoView({block:'start'});});
  function updateContext() {
    const f=record.fields;
    const planned=standardPlan();
    $('#task-plan-eyebrow').textContent=planned?'Read these tasks to the group':'Updated task plan';
    $('#task-plan-notice').hidden=planned;
    $('#task-plan-notice-text').textContent=f.taskGoal?.trim()?'This session uses your custom instructions, shown below. You can start a separate session with the three tasks here.':'This saved session uses the earlier task instructions. The updated tasks are shown here for reference. Start a new session to use them; your existing notes stay with the earlier session.';
    $('#completion-task-hint').hidden=!planned;
    $('#task-prompt').textContent=planned?'Ask the group to complete the three tasks above. Let them choose different games for Medium and Hard in each mode.':taskPrompt();
    $('#noteTask').disabled=!planned&&!editId;
    if(!planned&&!editId)$('#noteTask').value='';
    const selectedTask=tasks.find(task=>task.id===$('#noteTask').value);
    $('#current-task-prompt').textContent=selectedTask?selectedTask.prompt:planned?"Choose the part you're observing. New events will carry that task label; selecting a task does not mark it complete.":taskPrompt();
    for(const p of players)$('#noteActor').querySelector(`option[value="${p}"]`).textContent=`${f[p+'Code']||`Player ${p.slice(1)}`} · ${p==='p1'?'host':'joiner'}`;
    document.querySelectorAll('[data-form-link]').forEach(link=>{
      let valid=false;try{const url=new URL(f[link.dataset.formLink]||studyFormLinks[link.dataset.formLink]);valid=['http:','https:'].includes(url.protocol);if(valid)link.href=url.href;}catch{}
      link.hidden=!valid;if(!valid)link.removeAttribute('href');
    });
    $('#post-form-hint').hidden=!!document.querySelector('[data-form-link="postFormUrl"]').getAttribute('href');
    const count=record.notes?.filter(note=>note.category==='moderator-help').length||0;
    $('#help-summary').textContent=`${count?`${count} researcher-help markers in the log. Confirm the overall result above. `:''}Product guidance means helping them use the interface or play the game. Record help between players separately.`;
    const earlier=['setupResult','playResult','readinessResult','stopReason','timingStatus','firstRoundTime','waiting','rules',...players.flatMap(p=>[p+'Ease',p+'Comprehension'])];
    const dl=$('#earlier-fields');dl.replaceChildren();
    for(const name of earlier)if(f[name])dl.append(node('dt',name.replace(/([A-Z])/g,' $1')),node('dd',String(f[name])));
    $('#earlier-protocol').hidden=!dl.children.length;
    updateClock();
  }
  $('#start-clock').onclick=()=>{const clock=record.clock||{elapsedSeconds:0,runningSince:null,started:false};clock.started=true;clock.runningSince=Date.now();record.clock=clock;persist();updateClock();};
  $('#pause-clock').onclick=()=>{const seconds=clockSeconds();if(seconds!==null){record.clock.elapsedSeconds=seconds;record.clock.runningSince=null;persist();updateClock();}};
  $('#align-clock').onclick=()=>{
    const value=$('#clock-offset').value.trim();if(!/^\d{1,4}:[0-5]\d$/.test(value)){$('#note-status').textContent='Enter the current recording time as minutes:seconds, such as 04:20.';return;}
    record.clock={started:true,elapsedSeconds:value.split(':').reduce((sum,value)=>sum*60+Number(value),0),runningSince:Date.now()};persist();updateClock();$('#note-status').textContent='Clock aligned. Existing event timestamps were retained.';
  };
  document.querySelectorAll('[data-copy-form]').forEach(button=>button.onclick=async()=>{
    const link=document.querySelector(`[data-form-link="${button.dataset.copyForm}"]`);
    if(!link?.getAttribute('href')){$('#global-message').textContent='Check the form URL before copying it.';return;}
    try{await navigator.clipboard.writeText(link.href);$('#global-message').textContent='Participant response link copied. Share it using your usual invitation or study chat.';}catch{$('#global-message').textContent='Open the form and copy its address from the browser.';}
  });
  function showNotes() {
    const list=$('#note-list');list.replaceChildren();
    $('#event-count').textContent=`${record.notes.length} events / notes`;
    if(!record.notes.length) {list.append(node('p','No events yet. Click a marker when something happens; you can add the detail from the recording later.','empty'));return;}
    for(const note of record.notes) {
      const item=node('article',undefined,'note-item'),content=node('div',undefined,'note-content'),head=node('div',undefined,'note-head');
      const actor=note.actor==='group'?'Whole group':record.fields[note.actor+'Code']||`Player ${Number(note.actor.slice(1))}`;
      head.append(node('b',note.category?eventLabels[note.category]:'Note'),node('span',actor));
      if(note.task)head.append(node('span',tasks.find(task=>task.id===note.task).label,'tag'));
      if(note.phase!=='session')head.append(node('span',phaseLabels[note.phase]));
      if(note.type!=='observed')head.append(node('span',typeLabels[note.type],'tag'));
      const edit=node('button',note.text?'Edit':'Add detail');edit.type='button';edit.onclick=()=>{
        persist();editId=note.id;editCategory=note.category||null;
        for(const name of ['task','phase','actor','type','text','time'])noteForm.elements.namedItem(name).value=note[name]||'';
        $('#add-note').textContent='Save note changes';$('#cancel-edit').hidden=false;$('#note-help').textContent=help[note.type];
        $('#note-status').textContent='Editing this event. Save changes or cancel to retain the original.';persist();updateContext();showStep('during');$('#noteText').focus();
      };
      head.append(edit);content.append(head,node('p',note.text||'Marker only — review the recording and add detail later.',note.text?'note-body':'help'));item.append(node('time',note.time||'Untimed','note-stamp'),content);list.append(item);
    }
  }
  const legacyLabels={code:'Participant code',date:'Session date',order:'Task order',device:'Device and browser',exposure:'Prior WordRush use',familiarity:'Browser game familiarity',version:'Game build or session time',mode:'Game mode',invitation:'Invitation format',rules:'Checked rule reminder',notesConsent:'Agreed to participation and written notes',aiConsent:'Agreed to AI processing',publishConsent:'Agreed to a public anonymized quote',sessionComplete:'Session marked complete',deidentified:'Deidentification reviewed',debrief:'Closing comments — paraphrased',interpretation:'Researcher interpretations — excluded from evidence'};
  function showLegacy() {
    const view=$('#legacy-view');view.replaceChildren(node('h3','Earlier individual study record'),node('p','This record came from the previous one-person protocol. It is preserved here for reading and backup; it has not been converted into a three-player group. Use the original kit if you need to edit it.'));
    const dl=node('dl',undefined,'legacy-grid');
    for(const [name,value] of Object.entries(record.legacy.fields)) {
      if(value===''||value===undefined)continue;
      dl.append(node('dt',legacyLabels[name]||name.replace(/([A-Z])/g,' $1')),node('dd',typeof value==='boolean'?(value?'Yes':'No'):String(value)));
    }
    view.append(dl);
  }
  function render() {
    const legacy=record.kind==='legacy-individual';$('#group-view').hidden=legacy;$('#legacy-view').hidden=!legacy;
    controls.forEach(control=>control.disabled=legacy);
    $('#export-status').textContent='';$('#note-status').textContent='';$('#measurement-status').textContent='';
    if(legacy){form.reset();$('#earlier-protocol').hidden=true;showLegacy();}
    else {
      form.reset();for(const el of controls) {if(el.type==='checkbox')el.checked=record.fields[el.name]===true;else el.value=record.fields[el.name]||'';}
      resetDraft();
      for(const name of ['task','phase','actor','type','text','time'])if(typeof record.draft[name]==='string')noteForm.elements.namedItem(name).value=record.draft[name];
      editId=record.notes.some(n=>n.id===record.draft.editId)?record.draft.editId:null;
      editCategory=editId?record.draft.category||null:null;
      $('#add-note').textContent=editId?'Save changes':'Add note';$('#cancel-edit').hidden=!editId;$('#note-help').textContent=help[$('#noteType').value];showNotes();updateContext();
    }
    selector();saveStateLabel();
  }
  form.addEventListener('submit',event=>event.preventDefault());
  controls.forEach(control=>control.addEventListener('input',()=>{
    if(record.kind!=='group')return;
    if(control.name==='sessionFinished'&&control.checked&&record.clock?.runningSince!=null){record.clock.elapsedSeconds=clockSeconds();record.clock.runningSince=null;}
    persist();showNotes();updateContext();
  }));
  noteForm.addEventListener('input',()=>{persist();$('#note-help').textContent=help[$('#noteType').value];});
  $('#noteTask').addEventListener('change',()=>{persist();updateContext();});
  function saveNote(category=null) {
    const draft=draftNow(),status=$('#note-status');
    category=category||editCategory;
    if(!draft.actor||!draft.text.trim()&&!category) {status.textContent='Write a note, or click an event marker to bookmark this moment without typing.';return;}
    if(draft.type==='quote'&&draft.actor==='group') {status.textContent='An exact quote needs one speaker. Select Player 1, 2, or 3.';return;}
    if(draft.type==='quote'&&!draft.text.trim()) {status.textContent='An exact quote needs the actual words. Use an ordinary event marker for a moment you will review later.';return;}
    const old=record.notes.find(n=>n.id===editId);
    if(!old&&record.notes.length>=2000){status.textContent='This session has reached 2,000 events. Save a backup before starting another session record.';return;}
    const seconds=clockSeconds(),manual=draft.time.trim(),time=manual||(old?'':seconds===null?'':formatTime(seconds));
    const note={id:old?.id||crypto.randomUUID(),task:draft.task,phase:draft.phase,actor:draft.actor,type:draft.type,text:draft.text.trim(),time,timeSource:old&&manual===old.time?old.timeSource||'manual':manual?'manual':time?'recording-clock':'not-recorded',createdAt:old?.createdAt||now(),updatedAt:now(),...(category?{category}:{})};
    if(old)record.notes[record.notes.indexOf(old)]=note;else record.notes.push(note);
    const actor=draft.actor,phase=draft.phase,task=draft.task;resetDraft();$('#noteActor').value=actor;$('#notePhase').value=phase;$('#noteTask').value=task;persist();showNotes();updateContext();status.textContent=old?'Event updated.':`${category?eventLabels[category]:'Note'} saved${time?` at ${time}`:' without a timestamp'}.`;
  }
  noteForm.addEventListener('submit',event=>{event.preventDefault();saveNote();});
  document.querySelectorAll('[data-event]').forEach(button=>button.onclick=()=>saveNote(button.dataset.event));
  $('#cancel-edit').onclick=()=>{resetDraft();persist();updateContext();$('#note-status').textContent='Edit cancelled. The original note is retained.';};
  $('#records').onchange=event=>{const id=event.target.value;persist();const next=store.records.find(r=>r.id===id);if(next){record=next;render();writeStore();}};
  $('#new-group').onclick=()=>{persist();if(store.records.length>=200){$('#global-message').textContent='This browser has 200 saved records. Keep your backups and use another browser profile for a new collection.';return;}record=blank();render();writeStore();showStep('prepare');};
  $('#start-task-session').onclick=()=>$('#new-group').click();
  function download(content,name,type) {
    const url=URL.createObjectURL(new Blob([content],{type})),link=node('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  document.querySelectorAll('[data-backup]').forEach(button=>button.onclick=()=>{
    persist();download(JSON.stringify({schemaVersion:3,study:'wordrush-group',exportedAt:now(),records:store.records},null,2),`wordrush-research-backup-${now().slice(0,10)}.json`,'application/json');
    $('#global-message').textContent='Backup downloaded. Keep the file somewhere you control, such as OneDrive. On another device, open this page and choose Load backup file. Backups contain your research records; do not upload them as transcripts.';
  });
  document.querySelectorAll('[data-restore]').forEach(button=>button.onclick=()=>$('#backup-file').click());
  function sameContent(a,b) {
    if(a.kind!==b.kind)return false;
    return a.kind==='legacy-individual'?JSON.stringify(a.legacy)===JSON.stringify(b.legacy):JSON.stringify({fields:a.fields,notes:a.notes,draft:a.draft,clock:a.clock})===JSON.stringify({fields:b.fields,notes:b.notes,draft:b.draft,clock:b.clock});
  }
  $('#backup-file').onchange=async event=>{
    try {
      const file=event.target.files[0];if(!file)return;
      if(file.size>20*1024*1024)throw Error('Choose a research backup smaller than 20 MB.');
      const incoming=readRecords(JSON.parse(await file.text()));
      const merged=[...store.records];let added=0,skipped=0,changed=0,last=null;
      for(const item of incoming) {
        const existing=merged.find(r=>r.id===item.id);
        if(merged.some(r=>sameContent(r,item))) {skipped++;continue;}
        if(existing) {item.importedCopyOf=item.id;item.id=crypto.randomUUID();changed++;}
        merged.push(item);last=item;added++;
      }
      if(merged.length>200)throw Error('This browser would exceed 200 saved records. Keep separate backup files; no records were imported.');
      persist();store.records=merged;if(last)record=last;render();writeStore();
      $('#global-message').textContent=`Loaded ${added} records; ${skipped} unchanged copies skipped; ${changed} changed versions kept as additional copies. Existing records were retained. Check group and participant codes before counting people.`;
    } catch(error) {$('#global-message').textContent=`No backup records loaded. ${error instanceof SyntaxError?'The file is not valid JSON. Choose a saved research kit backup.':error.message}`;}
    finally {event.target.value='';}
  };
  const codeValid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]+$/.test(value);
  function exportMeasurements() {
    persist();const status=$('#measurement-status');
    if(record.kind!=='group'){status.textContent='Earlier individual records retain their original protocol. Keep their full backup; they are not group-journey measurements.';return;}
    const f=record.fields,codes=players.map(p=>f[p+'Code']);
    if(!codeValid(f.groupCode)||!f.sessionDate||!codes.every(codeValid)||new Set(codes.map(code=>code.toLowerCase())).size!==3||!f.sessionFinished||!f.deidentified){status.textContent='Record the session code, date, and three distinct participant codes. Finish the session and review deidentification before exporting measurements.';return;}
    if(!players.every(p=>(f.consentConfirmed===true||f[p+'NotesConsent']===true)&&(f.allMeasurementConsent===true||f[p+'MeasurementConsent']===true))){status.textContent='Confirm that the consent forms cover participation and measurement use for all three players. These permissions are recorded in this appendix; they are not inferred from AI permission.';return;}
    if(!f.journeyCompletion||!f.moderatorGuidance){status.textContent='In Wrap up together, record whether the group finished the agreed task and whether you gave product guidance. Earlier first-round outcomes are not substituted for these answers.';return;}
    const helpMarkers=record.notes.filter(note=>note.category==='moderator-help').length;
    if(f.moderatorGuidance==='none'&&helpMarkers){status.textContent='The log contains a researcher-help marker, but closeout says no product guidance. Review the marker or outcome before exporting.';return;}
    const completed=f.journeyCompletion==='completed';
    const unassisted=completed?(f.moderatorGuidance==='none'?true:f.moderatorGuidance==='given'?false:null):['partial','not-completed'].includes(f.journeyCompletion)?false:null;
    const packet={schema:'wordrush-moderated-group-measurements',schemaVersion:3,exportedAt:now(),
      protocol:{id:standardPlan()?measurementProtocol:f.taskGoal?.trim()?'wordrush-custom-task':'wordrush-complete-journey-v1',unit:'three-player group session',task:taskPrompt(),tasks:standardPlan()?tasks:[],primaryOutcome:'Completion of the agreed full task without researcher product guidance',peerHelp:'Part of the natural group experience; recorded separately',recordingClockIsTaskDuration:false,studyDesign:'Moderated group usability study and shared focus-group discussion',decisionLabImportAvailable:false},
      group:{recordId:record.id,importedCopyOf:record.importedCopyOf||null,sessionCode:f.groupCode,sessionDate:f.sessionDate,stage:f.studyStage||null,gameVersion:f.version?.trim()||null,gameMode:f.gameMode?.trim()||null,sharedScreen:f.sharedScreen||null,journeyCompletion:f.journeyCompletion,moderatorGuidance:f.moderatorGuidance,completedWithoutResearcherGuidance:unassisted,sessionFinished:true,deidentificationReviewed:true,allPlayersAgreedToMeasurementUse:true},
      players:players.map((p,index)=>({participantCode:f[p+'Code'],role:index===0?'host':'joiner',deviceAndBrowser:f[p+'Device']?.trim()||null,priorWordRushUse:f[p+'PriorUse']||null})),
      eventMarkerCounts:Object.fromEntries(Object.keys(eventLabels).map(category=>[category,record.notes.filter(note=>note.category===category).length])),
      limitations:['Event marker counts describe researcher flags; review the recording before treating them as findings.','The recording-reference clock is not task timing and is not exported as completion duration.','Post-study form responses are collected separately by your form tool.','Missing or unknown outcomes remain null, not an assumed success or failure.','One group is not three independent usability sessions. Check imported copies and repeat participants.','Older first-round fields remain in backups and are not reinterpreted as full-journey outcomes.','Decision Lab cannot yet import these real measurements.']};
    download(JSON.stringify(packet,null,2),`wordrush-${f.groupCode}-journey-measurements.json`,'application/json');
    status.textContent='Session measurements downloaded for manual analysis. This file contains full-task completion and researcher guidance, not a task duration or post-study form responses. No data was sent to Decision Lab.';
  }

  function exportEvidence(kind) {
    persist();const status=$('#export-status');let passages=[],excluded=0,code,date;
    if(record.kind==='legacy-individual') {
      const f=record.legacy.fields;code=f.code;date=f.date;
      if(!codeValid(code)||!date||f.notesConsent!==true||f.aiConsent!==true||f.sessionComplete!==true||f.deidentified!==true) {status.textContent='This earlier record needs its original participant code, date, completed session, written-note and AI permissions, and deidentification review before export. Edit it in the original kit, then load a new backup.';return;}
      for(const [id,label] of [['host','Host setup'],['join','Join invitation'],['play','First round']]) {
        const text=f[id+(kind==='quotes'?'Quotes':'Observed')];
        if(typeof text==='string')for(const line of text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))passages.push(`${kind==='quotes'?'Participant':'Observer'}: [${code} | Earlier individual study | ${label} | ${kind==='quotes'?'Verbatim quote':'Recorded observation, not a quote'}] ${line}`);
      }
      if(kind==='observations'&&typeof f.debrief==='string'&&f.debrief.trim())passages.push(`Observer: [${code} | Earlier individual study | Closing comments paraphrased] ${f.debrief.trim()}`);
    } else {
      const f=record.fields;code=f.groupCode;date=f.sessionDate;
      if(!form.reportValidity())return;
      const codes=players.map(p=>f[p+'Code']);
      if(!codeValid(code)||!date||!codes.every(codeValid)||new Set(codes.map(c=>c.toLowerCase())).size!==3||!f.sessionFinished||!f.deidentified) {status.textContent='Enter a group code, session date, and three distinct participant codes. Mark the actual session finished and check deidentification before exporting evidence.';return;}
      for(const note of record.notes) {
        if(!note.text.trim())continue;
        if(kind==='quotes'?note.type!=='quote':!['observed','reported'].includes(note.type))continue;
        const people=note.actor==='group'?players:[note.actor];
        if(!people.every(p=>(f.consentConfirmed===true||f[p+'NotesConsent']===true)&&(f.allAiConsent===true||f[p+'AiConsent']===true))) {excluded++;continue;}
        const actor=note.actor==='group'?`Group: ${codes.join(', ')}`:f[note.actor+'Code'];
        const label=[code,stageLabels[f.studyStage]||'Study stage not recorded',f.version?`Build: ${f.version}`:'',actor,note.task?tasks.find(task=>task.id===note.task).label:'',phaseLabels[note.phase],typeLabels[note.type],note.time].filter(Boolean).join(' | ');
        passages.push(`${note.type==='quote'?'Participant':note.type==='reported'?'Player report':'Observer'}: [${label}] ${note.text.replace(/\r?\n/g,' ')}`);
      }
    }
    if(!passages.length) {status.textContent=`No eligible ${kind} to export.${excluded?` ${excluded} notes were excluded because the relevant written-note or AI permission is not recorded.`:''} Bare event markers are retained in backups. Add verified detail from the recording or upload your reviewed transcript directly to ProductPilot.`;return;}
    const head=[`WordRush ${code}`,`Date: ${date}`,`Evidence: ${kind}`,`Consent for AI: yes`].join('\n');
    download(head+'\n\n'+passages.join('\n\n')+'\n',`wordrush-${code}-${kind}.txt`,'text/plain;charset=utf-8');
    status.textContent=`Downloaded ${passages.length} evidence passages.${excluded?` Excluded ${excluded} notes without the relevant written-note or AI permission.`:''} Interpretations and unsaved note drafts are excluded. Review the file, then upload it to the WordRush project in ProductPilot. Quote publication still needs separate permission.`;
  }
  $('#export-quotes').onclick=()=>exportEvidence('quotes');$('#export-observations').onclick=()=>exportEvidence('observations');
  $('#export-measurements').onclick=exportMeasurements;
  $('#print').onclick=()=>window.print();
  render();
  showStep(location.hash.slice(1));
  setInterval(updateClock,500);
})();
