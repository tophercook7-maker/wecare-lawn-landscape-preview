/* We Care — cloud sync layer (Supabase, no library, pure fetch).
   Mirrors the apps' existing localStorage stores <-> Supabase tables so every
   surface (site, Sage, CRM, crew, ops) syncs LIVE across all devices.
   Load this BEFORE the page's own script on every page. */
(function(){
"use strict";
var URL_="https://fqqbzsxvxpcfwovbunth.supabase.co";
var ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcWJ6c3h2eHBjZndvdmJ1bnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNDAwOTIsImV4cCI6MjEwMzYxNjA5Mn0.a62fuRJ19sEGxRN2KtvPkDvS_Ff-NuiYKZAxTZg4Tqg";
var REST=URL_+"/rest/v1/";
var H={ "apikey":ANON, "Authorization":"Bearer "+ANON, "Content-Type":"application/json" };

/* ---- owner auth session (Supabase Auth; the owner tools log in as a real user) ---- */
var SESS_KEY="wecare_session";
function getSession(){ try{return JSON.parse(localStorage.getItem(SESS_KEY))||null;}catch(e){return null;} }
function setSession(s){ try{ if(s) localStorage.setItem(SESS_KEY,JSON.stringify(s)); else localStorage.removeItem(SESS_KEY); }catch(e){} }
function sessionValid(){ var s=getSession(); return !!(s && s.access_token && s.expires_at && s.expires_at*1000 > Date.now()+3000); }
function authHeaders(){ return sessionValid() ? {apikey:ANON, Authorization:"Bearer "+getSession().access_token, "Content-Type":"application/json"} : H; }
function _storeSess(d, email){ if(d && d.access_token){ setSession({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:d.expires_at||(Math.floor(Date.now()/1000)+(d.expires_in||3600)),email:(d.user&&d.user.email)||email}); return true; } return false; }
function login(email,password){
  return fetch(URL_+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:ANON,"Content-Type":"application/json"},body:JSON.stringify({email:email,password:password})})
    .then(function(r){return r.json();}).then(function(d){ if(_storeSess(d,email)){ try{flushOutbox();flushPendingDeletes();}catch(e){} return {ok:true}; } return {ok:false,error:(d&&(d.error_description||d.msg))||"login failed"}; })
    .catch(function(e){return {ok:false,error:String(e)};});
}
function refreshSession(){
  var s=getSession(); if(!s||!s.refresh_token) return Promise.resolve(false);
  return fetch(URL_+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:ANON,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:s.refresh_token})})
    .then(function(r){return r.json();}).then(function(d){ if(_storeSess(d,s.email)){ try{flushOutbox();flushPendingDeletes();}catch(e){} return true; } return false; }).catch(function(){return false;});
    // NOTE: on refresh failure we deliberately KEEP the existing session. Refresh tokens
    // rotate and can fail when the same account is open on multiple devices; the current
    // access token is usually still valid, and nulling it would drop the owner to "guest"
    // (which then wipes local data on the next pull). Let it expire naturally instead.
}
function changePassword(newPw){ if(!sessionValid()) return Promise.resolve({ok:false}); return fetch(URL_+"/auth/v1/user",{method:"PUT",headers:authHeaders(),body:JSON.stringify({password:newPw})}).then(function(r){return {ok:r.ok};}).catch(function(){return {ok:false};}); }
function logout(){ setSession(null); }

/* store config: localStorage key, table, shape (array|objmap), field maps js<->sql */
var STORES=[
 {key:"wecare_leads", table:"leads", shape:"array", protected:true,
  toRow:function(o){return {id:o.id,name:o.name,phone:o.phone,email:o.email,address:o.address,service:o.service,detail:o.detail,sqft:o.sqft||null,when_text:o.when,source:o.source,stage:o.stage,created:o.created,touches:o.touches||[],fu_stop:!!o.fuStop};},
  fromRow:function(r){return {id:r.id,name:r.name,phone:r.phone,email:r.email,address:r.address,service:r.service,detail:r.detail,sqft:r.sqft,when:r.when_text,source:r.source,stage:r.stage,created:r.created,touches:r.touches||[],fuStop:r.fu_stop};}},
 {key:"wecare_convos", table:"conversations", shape:"objmap", protected:true,
  toRow:function(o){return {id:o.id,customer:o.customer||{},service:o.service,msgs:o.msgs||[],control:o.control,status:o.status,unseen:!!o.unseen,created:o.created,updated:o.updated};},
  fromRow:function(r){return {id:r.id,customer:r.customer||{},service:r.service,msgs:r.msgs||[],control:r.control,status:r.status,unseen:r.unseen,created:r.created,updated:r.updated};}},
 {key:"wecare_workorders", table:"work_orders", shape:"array",
  toRow:function(o){return {id:o.id,customer:o.customer,phone:o.phone||"",service:o.service,address:o.address,scope:o.scope,sop:o.sop,assigned_to:o.assignedTo||[],date:o.date,status:o.status,est_hours:o.estHours||null,paid:!!o.paid,review_status:o.reviewStatus||"",materials:(o.materials||o.materials===0)?o.materials:null,price:(o.price||o.price===0)?o.price:null,photos:o.photos||[],how_to:o.howTo||"",recur_id:o.recurId||"",route_id:o.routeId||"",route_name:o.routeName||"",seq:(o.seq||o.seq===0)?o.seq:0,property_id:o.propertyId||""};},
  fromRow:function(r){return {id:r.id,customer:r.customer,phone:r.phone||"",service:r.service,address:r.address,scope:r.scope,sop:r.sop,assignedTo:r.assigned_to||[],date:r.date,status:r.status,estHours:r.est_hours,paid:r.paid,reviewStatus:r.review_status||"",materials:r.materials,price:r.price,photos:r.photos||[],howTo:r.how_to||"",recurId:r.recur_id||"",routeId:r.route_id||"",routeName:r.route_name||"",seq:r.seq||0,propertyId:r.property_id||""};}},
 {key:"wecare_properties", table:"properties", shape:"array",
  toRow:function(o){return {id:o.id,name:o.name||"",customer:o.customer||"",phone:o.phone||"",email:o.email||"",address:o.address||"",lead_id:o.leadId||"",areas:o.areas||"",turf_plants:o.turfPlants||"",irrigation:o.irrigation||"",access:o.access||"",preferences:o.preferences||"",problem_areas:o.problemAreas||"",special:o.special||"",notes:o.notes||[],photos:o.photos||[],created:o.created,updated:o.updated};},
  fromRow:function(r){return {id:r.id,name:r.name||"",customer:r.customer||"",phone:r.phone||"",email:r.email||"",address:r.address||"",leadId:r.lead_id||"",areas:r.areas||"",turfPlants:r.turf_plants||"",irrigation:r.irrigation||"",access:r.access||"",preferences:r.preferences||"",problemAreas:r.problem_areas||"",special:r.special||"",notes:r.notes||[],photos:r.photos||[],created:r.created,updated:r.updated};}},
 {key:"wecare_recurring", table:"recurring_jobs", shape:"array",
  toRow:function(o){return {id:o.id,customer:o.customer||"",phone:o.phone||"",service:o.service||"",address:o.address||"",crew:o.crew||[],freq:o.freq||"weekly",dow:o.dow,est_hours:(o.estHours||o.estHours===0)?o.estHours:null,anchor:o.anchor||"",active:o.active!==false,created:o.created};},
  fromRow:function(r){return {id:r.id,customer:r.customer,phone:r.phone,service:r.service,address:r.address,crew:r.crew||[],freq:r.freq,dow:r.dow,estHours:r.est_hours,anchor:r.anchor,active:r.active,created:r.created};}},
 {key:"wecare_routes", table:"routes", shape:"array",
  toRow:function(o){return {id:o.id,name:o.name||"",dow:(o.dow||o.dow===0)?o.dow:1,freq:o.freq||"weekly",crew:o.crew||[],stops:o.stops||[],anchor:o.anchor||"",active:o.active!==false,created:o.created};},
  fromRow:function(r){return {id:r.id,name:r.name||"",dow:(r.dow||r.dow===0)?r.dow:1,freq:r.freq||"weekly",crew:r.crew||[],stops:r.stops||[],anchor:r.anchor||"",active:r.active,created:r.created};}},
 {key:"wecare_punches", table:"punches", shape:"array",
  toRow:function(o){return {id:o.id,emp_id:o.empId,emp_name:o.empName,job_id:o.jobId,clock_in:o.in,clock_out:o.out,in_geo:o.inGeo,out_geo:o.outGeo,edits:o.edits||[],needs_review:!!o.needsReview};},
  fromRow:function(r){return {id:r.id,empId:r.emp_id,empName:r.emp_name,jobId:r.job_id,in:r.clock_in,out:r.clock_out,inGeo:r.in_geo,outGeo:r.out_geo,edits:r.edits||[],needsReview:!!r.needs_review};}},
 {key:"wecare_punch_fixes", table:"punch_fixes", shape:"array",
  toRow:function(o){return {id:o.id,emp_id:o.empId,emp_name:o.empName,note:o.note,resolved:!!o.resolved,created:o.when||o.created};},
  fromRow:function(r){return {id:r.id,empId:r.emp_id,empName:r.emp_name,note:r.note,resolved:r.resolved,when:r.created};}},
 {key:"wecare_consults", table:"consultations", shape:"array", protected:true,
  toRow:function(o){return {id:o.id,name:o.name||"",phone:o.phone||"",email:o.email||"",service:o.service||"",address:o.address||"",date:o.date||"",time:o.time||"",notes:o.notes||"",status:o.status||"requested",source:o.source||"",lead_id:o.leadId||"",created:o.created};},
  fromRow:function(r){return {id:r.id,name:r.name,phone:r.phone,email:r.email,service:r.service,address:r.address,date:r.date,time:r.time,notes:r.notes,status:r.status,source:r.source,leadId:r.lead_id,created:r.created};}},
 {key:"wecare_sops", table:"sops", shape:"array",
  toRow:function(o){return {id:o.id,title:o.title,service:o.service||"",steps:o.steps||[],notes:o.notes||"",updated:o.updated};},
  fromRow:function(r){return {id:r.id,title:r.title,service:r.service,steps:r.steps||[],notes:r.notes,updated:r.updated};}},
 {key:"wecare_casestudies", table:"case_studies", shape:"array",
  toRow:function(o){return {id:o.id,title:o.title||"",service:o.service||"",location:o.location||"",summary:o.summary||"",photos:o.photos||[],published:!!o.published,job_id:o.jobId||"",created:o.created};},
  fromRow:function(r){return {id:r.id,title:r.title,service:r.service,location:r.location,summary:r.summary,photos:r.photos||[],published:r.published,jobId:r.job_id,created:r.created};}},
 {key:"wecare_estimates", table:"estimates", shape:"array",
  toRow:function(o){return {id:o.id,customer:o.customer,service:o.service||"",line_items:o.lineItems||[],labor_hours:o.laborHours,labor_rate:o.laborRate,markup:o.markup,subtotal:o.subtotal,total:o.total,notes:o.notes||"",status:o.status||"draft",lead_id:o.leadId||"",created:o.created};},
  fromRow:function(r){return {id:r.id,customer:r.customer,service:r.service,lineItems:r.line_items||[],laborHours:r.labor_hours,laborRate:r.labor_rate,markup:r.markup,subtotal:r.subtotal,total:r.total,notes:r.notes,status:r.status,leadId:r.lead_id,created:r.created};}},
];
var byKey={}; STORES.forEach(function(s){byKey[s.key]=s;});
var byTable={}; STORES.forEach(function(s){byTable[s.table]=s;});

var _applyingRemote=false;
var _shadow={};   // key -> {id: JSONstring} last known, to detect changes
var _cloudSeen={}; // key -> {id:1} ids this client has ever seen returned FROM the cloud;
                   // a pull may only DELETE a local row it has confirmed existed in the cloud.
// key -> {id:1} records THIS client saved this session whose push we haven't yet
// seen echoed back from the cloud. We refuse to let an incoming pull delete these
// locally — otherwise a pull that races ahead of (or a push that fails) silently
// wipes a record the user just saved. Cleared per-id once the cloud confirms it.
var _sessionWrites={};

// DURABLE outbox: rows whose cloud write hasn't been confirmed yet, persisted to
// localStorage so an unsynced save survives a reload/restart instead of being
// wiped by the next pull. Retried whenever a valid session is available. This is
// what stops "job cards deleting" — a card the owner created is never removed
// locally until the cloud has actually stored it.
var OUTBOX_KEY="wecare_outbox";
function loadOutbox(){ try{ return JSON.parse(localStorage.getItem(OUTBOX_KEY))||{}; }catch(e){ return {}; } }
function saveOutbox(o){ try{ localStorage.setItem(OUTBOX_KEY, JSON.stringify(o)); }catch(e){} }
function outboxAdd(table,row){ if(!row||!row.id) return; var o=loadOutbox(); (o[table]||(o[table]={}))[row.id]=row; saveOutbox(o); }
function outboxClear(table,id){ var o=loadOutbox(); if(o[table]){ delete o[table][id]; if(!Object.keys(o[table]).length) delete o[table]; saveOutbox(o); } }
function outboxIds(table){ var o=loadOutbox(); return o[table]||{}; }
function outboxCount(){ var o=loadOutbox(),n=0; for(var t in o){ if(o.hasOwnProperty(t)) n+=Object.keys(o[t]).length; } return n; }
var _flushing=false;
function flushOutbox(){
  if(_flushing) return; var o=loadOutbox(); var tables=Object.keys(o); if(!tables.length) return;
  _flushing=true;
  try{ tables.forEach(function(t){ var st=byTable[t]; if(!st) return; var ids=o[t]; Object.keys(ids).forEach(function(id){ upsert(st, ids[id]); }); }); }
  finally{ _flushing=false; }
}

// DURABLE pending-deletes: mirrors the outbox above but for removeRow(). A delete
// the owner triggers is marked here BEFORE the fetch fires, persisted to
// localStorage, and only cleared once the cloud actually confirms it (r.ok).
// applyRemote() treats these ids as "supposed to be gone" even if a pull still
// returns them (failed/slow DELETE), so a deletion can never silently un-delete
// itself the way a failed write used to be able to bring a "deleted" row back.
var DELETE_KEY="wecare_pending_delete";
function loadPendingDeletes(){ try{ return JSON.parse(localStorage.getItem(DELETE_KEY))||{}; }catch(e){ return {}; } }
function savePendingDeletes(o){ try{ localStorage.setItem(DELETE_KEY, JSON.stringify(o)); }catch(e){} }
function pendingDeleteAdd(table,id){ var o=loadPendingDeletes(); (o[table]||(o[table]={}))[id]=1; savePendingDeletes(o); }
function pendingDeleteClear(table,id){ var o=loadPendingDeletes(); if(o[table]){ delete o[table][id]; if(!Object.keys(o[table]).length) delete o[table]; savePendingDeletes(o); } }
function pendingDeleteIds(table){ var o=loadPendingDeletes(); return o[table]||{}; }
var _flushingDeletes=false;
function flushPendingDeletes(){
  if(_flushingDeletes || !sessionValid()) return; var o=loadPendingDeletes(); var tables=Object.keys(o); if(!tables.length) return;
  _flushingDeletes=true;
  try{ tables.forEach(function(t){ var st=byTable[t]; if(!st) return; Object.keys(o[t]).forEach(function(id){ removeRow(st.key, id); }); }); }
  finally{ _flushingDeletes=false; }
}

var _origSet = localStorage.setItem.bind(localStorage);
// intercept writes to our keys -> push changed rows to Supabase
localStorage.setItem = function(k,v){
  _origSet(k,v);
  if(_applyingRemote || !byKey[k]) return;
  try{ pushChanges(byKey[k], v); }catch(e){}
};

function recordsOf(store, parsed){
  if(store.shape==="array") return parsed||[];
  return Object.keys(parsed||{}).map(function(id){return parsed[id];});
}
// lightweight in-page event log for on-device debugging (shown by ops ?debug=1)
var _log=[];
function logEv(s){ try{ _log.push(new Date().toTimeString().slice(0,8)+" "+s); if(_log.length>40)_log.shift(); window.dispatchEvent(new Event("wecare-log")); }catch(e){} }
function pushChanges(store, rawValue){
  var parsed; try{parsed=JSON.parse(rawValue);}catch(e){return;}
  var recs=recordsOf(store,parsed);
  var sh=_shadow[store.key]||(_shadow[store.key]={});
  recs.forEach(function(o){
    if(!o||!o.id) return;
    var js=JSON.stringify(o);
    if(sh[o.id]===js) return;         // unchanged
    sh[o.id]=js;
    upsert(store, store.toRow(o));    // upsert marks it pending in the outbox until the cloud confirms it
  });
}
// customer-facing tables: when NOT a logged-in owner, writes go through the service-role
// public_write function (so the anon key never needs direct write access to them).
var PUBLIC_TABLES={leads:1,consultations:1,conversations:1};
function upsert(store, row){
  if(!row||!row.id) return;
  outboxAdd(store.table,row);   // mark PENDING immediately (durable + synchronous): the local copy
                                // is protected from being overwritten by a pull until this write is
                                // CONFIRMED. Cleared only on r.ok below — never by a pull echo.
  if(!sessionValid()){
    if(PUBLIC_TABLES[store.table]){                 // customer forms → service-role gate
      team("public_write",{table:store.table,row:row})
        .then(function(res){ if(res&&res.ok) outboxClear(store.table,row.id); }).catch(function(){});
    } else { logEv("upsert "+store.table+" "+row.id+" -> QUEUED (not signed in)"); }
    return;                                          // owner table w/o a session → stays pending, flushes after sign-in
  }
  fetch(REST+store.table+"?on_conflict=id", {
    method:"POST",
    headers:Object.assign({}, authHeaders(), {"Prefer":"resolution=merge-duplicates,return=minimal"}),
    body:JSON.stringify(row)
  }).then(function(r){ logEv("upsert "+store.table+" "+row.id+" -> "+r.status); if(r && r.ok) outboxClear(store.table,row.id); })   // 4xx/5xx NOT caught by .catch — must check r.ok; failure = stays pending + retried
   .catch(function(e){ logEv("upsert "+store.table+" "+row.id+" -> NETERR "+e); });                                                 // network failure → stays pending + retried
}

function applyRemote(store, rows){
  var incoming=rows.map(store.fromRow);
  var prot=outboxIds(store.table);
  var pendingDel=pendingDeleteIds(store.table);
  var authed=sessionValid();
  // Remember every id this pull returned FROM the cloud (this session).
  var seen=_cloudSeen[store.key]||(_cloudSeen[store.key]={});
  incoming.forEach(function(o){ if(o&&o.id) seen[o.id]=1; });
  // current local rows
  var localRecsAll=[];
  try{ var raw2=localStorage.getItem(store.key); if(raw2){ var p2=JSON.parse(raw2); localRecsAll=store.shape==="array"?(p2||[]):Object.keys(p2||{}).map(function(k){return p2[k];}); } }catch(e){}
  // Start from the cloud rows (cloud copy wins for any id it returns), then decide which
  // LOCAL-ONLY rows to keep vs drop.
  // A row still returned by the cloud but marked pending-delete means the DELETE
  // hasn't been confirmed yet (in flight, or failed and awaiting retry) — don't
  // let it win here, or a deletion could silently un-delete itself.
  var byId={}; incoming.forEach(function(o){ if(o&&o.id && !pendingDel[o.id]) byId[o.id]=o; });
  localRecsAll.forEach(function(o){
    if(!o||!o.id || byId[o.id]) return;      // cloud already has it → cloud wins
    // A local row the pull didn't return. Only DELETE it when it's a GENUINE remote delete:
    //   signed in  AND  the cloud has confirmed this id before  AND  it isn't a pending write.
    // Otherwise KEEP it — this covers brand-new local jobs the cloud hasn't confirmed yet
    // (the vanishing-card bug), pending outbox writes, and any guest/anon pull.
    var genuineRemoteDelete = authed && seen[o.id] && !prot[o.id];
    if(!genuineRemoteDelete) byId[o.id]=o;
  });
  var merged=Object.keys(byId).map(function(k){ return byId[k]; });
  var cur;
  if(store.shape==="array"){
    cur=merged.sort(function(a,b){return (b.created||"").localeCompare(a.created||"");});
  }else{
    cur={}; merged.forEach(function(o){cur[o.id]=o;});
  }
  var newRaw=JSON.stringify(cur);
  if(localStorage.getItem(store.key)===newRaw) return false;
  // debug: report any local rows this pull is REMOVING (mirror-delete)
  try{ var pj=JSON.parse(localStorage.getItem(store.key)||"[]"); var prevArr=store.shape==="array"?(pj||[]):Object.keys(pj||{}).map(function(k){return pj[k];});
    var mids={}; merged.forEach(function(o){if(o&&o.id)mids[o.id]=1;});
    var drop=prevArr.filter(function(o){return o&&o.id&&!mids[o.id];}).map(function(o){return o.id;});
    if(drop.length) logEv("PULL "+store.table+" REMOVED local: "+drop.join(",")); }catch(e){}
  // refresh shadow so we don't echo these back as "changes"
  var sh={}; merged.forEach(function(o){sh[o.id]=JSON.stringify(o);});
  _shadow[store.key]=sh;
  _applyingRemote=true; _origSet(store.key,newRaw); _applyingRemote=false;
  return true;
}

function officeCode(){ try{ return localStorage.getItem("wecare_office_code")||""; }catch(e){ return ""; } }
// protected stores (customer PII / chat logs): the anon key can't SELECT them —
// pulled only through the office-password `team` gate.
function pullProtected(){
  var code=officeCode(); if(!code) return;
  var prot=STORES.filter(function(s){return s.protected;});
  if(!prot.length) return;
  team("crm_read",{code:code}).then(function(res){
    if(!res || res.error) return;
    var changed=false;
    prot.forEach(function(store){ if(res[store.table] && applyRemote(store,res[store.table])) changed=true; });
    if(changed){ try{window.dispatchEvent(new Event("storage"));}catch(e){} }
  }).catch(function(){});
}
function maybeRefresh(){ var s=getSession(); if(s && s.refresh_token && s.expires_at && s.expires_at*1000 < Date.now()+120000) refreshSession(); }
function pullAll(){
  maybeRefresh();
  var authed=sessionValid();
  // logged in → read every table via the session JWT (RLS grants the owner access);
  // logged out → only the public/non-protected tables via anon, plus the office-code gate.
  var stores = authed ? STORES : STORES.filter(function(s){return !s.protected;});
  var changed=false, pending=stores.length;
  if(pending){
    stores.forEach(function(store){
      fetch(REST+store.table+"?select=*", {headers:authHeaders()})
        .then(function(r){ return r.ok ? r.json() : null; })   // null on failure → SKIP applyRemote (never wipe local on a 401/expiry)
        .then(function(rows){ if(rows!==null && applyRemote(store,rows)) changed=true; })
        .catch(function(){})
        .then(function(){ if(--pending===0 && changed){ try{window.dispatchEvent(new Event("storage"));}catch(e){} } });
    });
  }
  if(!authed) pullProtected();
}

// ---- Supabase Realtime: instant push over a WebSocket (owner pages only) ----
// On any DB change we debounce-trigger pullAll(), so the existing merge logic
// (applyRemote — which never wipes local on error) handles the diff. The poll
// below stays on as a slow fallback for when the socket is dropped/blocked.
var _rt=null, _rtHb=null, _rtToken="", _rtDebounce=null, _rtRef=0, _rtRetry=null;
function rtSend(msg){ try{ if(_rt && _rt.readyState===1) _rt.send(JSON.stringify(msg)); }catch(e){} }
function rtTrigger(){ if(_rtDebounce) return; _rtDebounce=setTimeout(function(){ _rtDebounce=null; pullAll(); }, 300); }
function startRealtime(){
  if(!sessionValid()) return;                       // only authenticated owner sessions subscribe
  if(_rt && (_rt.readyState===0||_rt.readyState===1)) return;   // already connecting/open
  _rtToken=getSession().access_token;
  var ws;
  try{ ws=new WebSocket(URL_.replace(/^http/,"ws")+"/realtime/v1/websocket?apikey="+ANON+"&vsn=1.0.0"); }
  catch(e){ return; }
  _rt=ws;
  ws.onopen=function(){
    rtSend({topic:"realtime:wecare", event:"phx_join", ref:String(++_rtRef),
      payload:{config:{postgres_changes:[{event:"*",schema:"public"}]}, access_token:_rtToken}});
    if(_rtHb) clearInterval(_rtHb);
    _rtHb=setInterval(function(){
      rtSend({topic:"phoenix", event:"heartbeat", ref:String(++_rtRef), payload:{}});
      var t=sessionValid()?getSession().access_token:"";     // token rotated after a refresh → tell the server
      if(t && t!==_rtToken){ _rtToken=t; rtSend({topic:"realtime:wecare", event:"access_token", ref:String(++_rtRef), payload:{access_token:t}}); }
    }, 25000);
  };
  ws.onmessage=function(ev){
    var m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
    if(m && m.event==="postgres_changes") rtTrigger();
  };
  ws.onclose=function(){ if(_rtHb){ clearInterval(_rtHb); _rtHb=null; } _rt=null; scheduleReconnect(); };
  ws.onerror=function(){ try{ ws.close(); }catch(e){} };
}
function scheduleReconnect(){
  if(_rtRetry) return;
  _rtRetry=setTimeout(function(){ _rtRetry=null; if(window.WECARE_SYNC && document.visibilityState!=="hidden") startRealtime(); }, 5000);
}
// on load: push any local-only data up first, then pull, then poll
function refreshIfNeeded(){
  var s=getSession();
  if(s && s.refresh_token && (!s.access_token || !s.expires_at || s.expires_at*1000 < Date.now()+120000)) return refreshSession();
  return Promise.resolve(sessionValid());
}
function initialSync(){
  // Refresh a stale-but-renewable session FIRST, so owner writes go up authenticated
  // instead of silently failing as a guest (the root of vanishing job cards).
  refreshIfNeeded().then(function(){
    STORES.forEach(function(store){
      var raw=localStorage.getItem(store.key);
      if(raw){ try{ pushChanges(store, raw); }catch(e){} }
    });
    flushOutbox(); flushPendingDeletes();   // retry anything queued from a previous session
    pullAll();
    startRealtime();
  });
  setInterval(function(){ if(document.visibilityState!=="hidden"){ flushOutbox(); flushPendingDeletes(); pullAll(); } }, 20000);  // slow fallback; realtime carries the fast path
}
// upload a job photo to Supabase Storage → returns the public URL.
// Preferred path: a PIN-verified, single-use SIGNED upload URL minted by the team
// edge function — so the bucket needs NO anon write rights. Falls back to the legacy
// direct upload if creds are missing or the server action isn't live yet.
function uploadPhoto(file, jobId, id, pin, kind){
  var ext=(file.name||"jpg").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  var ct=file.type||"image/jpeg";
  function directUpload(){
    var path="wo/"+(jobId||"misc")+"/"+Date.now()+"-"+Math.floor(Math.random()*1e6)+"."+ext;
    return fetch(URL_+"/storage/v1/object/job-photos/"+path,{
      method:"POST",headers:{apikey:ANON,Authorization:"Bearer "+ANON,"Content-Type":ct,"x-upsert":"true"},body:file
    }).then(function(r){ if(!r.ok) throw new Error("upload failed"); return URL_+"/storage/v1/object/public/job-photos/"+path; });
  }
  function viaSigned(action, extra){
    return team(action, Object.assign({jobId:jobId,ext:ext,kind:kind||"wo"}, extra||{})).then(function(r){
      if(r&&r.ok&&r.uploadUrl){
        return fetch(r.uploadUrl,{method:"PUT",headers:{"Content-Type":ct,"x-upsert":"true"},body:file})
          .then(function(u){ if(!u.ok) throw new Error("signed upload failed"); return r.publicUrl; });
      }
      return directUpload();   // server action not available yet → legacy path
    }).catch(function(){ return directUpload(); });
  }
  // Owner (logged in) → JWT-verified signed upload. Crew (id+pin) → PIN-verified
  // signed upload. Neither needs anon write rights on the bucket.
  if(sessionValid()) return viaSigned("owner_sign_upload");
  if(id && pin)      return viaSigned("crew_sign_upload",{id:id,pin:pin});
  return directUpload();
}
// Employee directory goes through the service-role `team` edge function so crew
// PINs + personal info are never exposed to this public anon key.
var TEAM_FN=URL_+"/functions/v1/team";
function team(action, payload){
  var body=Object.assign({action:action}, payload||{});
  // 20s timeout so a weak field signal fails cleanly (UI prompts a retry) instead of
  // hanging forever. No auto-retry — some actions (e.g. crew_add_media) aren't idempotent.
  var ctrl=("AbortController" in window)?new AbortController():null;
  var to=ctrl?setTimeout(function(){ctrl.abort();},20000):null;
  // send the owner session JWT when present so the function can authorize by real login
  return fetch(TEAM_FN,{method:"POST",headers:authHeaders(),body:JSON.stringify(body),signal:ctrl?ctrl.signal:undefined})
    .then(function(r){ if(to)clearTimeout(to); return r.json();})
    .catch(function(e){ if(to)clearTimeout(to); return {error:String(e)};});
}
// CONFIRMED write: upsert one record and resolve true/false so callers (e.g. the
// public booking + contact forms) can show success only after the save is durable.
function saveConfirmed(key, obj){
  var store=byKey[key]; if(!store||!obj||!obj.id) return Promise.resolve(false);
  var sh=_shadow[key]||(_shadow[key]={}); sh[obj.id]=JSON.stringify(obj); // pre-seed so the interceptor doesn't double-send
  var row=store.toRow(obj);
  if(!sessionValid() && PUBLIC_TABLES[store.table]){ return team("public_write",{table:store.table,row:row}).then(function(res){return !!(res&&res.ok);}); }
  return fetch(REST+store.table+"?on_conflict=id",{method:"POST",
    headers:Object.assign({},authHeaders(),{"Prefer":"resolution=merge-duplicates,return=minimal"}),
    body:JSON.stringify(row)}).then(function(r){return r.ok;}).catch(function(){return false;});
}
// Hard-delete a row from the cloud (and stop the sync layer from re-adding it).
// Owner tools call this so a deletion actually sticks instead of coming back on
// the next pull. Forget the id from the pending/shadow sets first so it's neither
// re-pushed nor protected as an unsynced local write.
function removeRow(key, id){
  if(_shadow[key]) delete _shadow[key][id];
  var store=byKey[key];
  if(!store) return Promise.resolve(false);
  logEv("REMOVE called "+store.table+" "+id);
  outboxClear(store.table, id);      // cancel any queued write for this id so it can't come back
  pendingDeleteAdd(store.table, id); // mark PENDING immediately (durable): protects against a pull
                                      // resurrecting this id until the cloud confirms the delete
  return fetch(REST+store.table+"?id=eq."+encodeURIComponent(id), {method:"DELETE", headers:authHeaders()})
    .then(function(r){ logEv("REMOVE "+store.table+" "+id+" -> "+r.status); if(r.ok) pendingDeleteClear(store.table,id); return r.ok; })
    .catch(function(e){ logEv("REMOVE "+store.table+" "+id+" -> NETERR "+e); return false; }); // stays pending + retried
}

window.WeCareCloud={pull:pullAll, url:URL_, uploadPhoto:uploadPhoto, team:team, save:saveConfirmed,
  remove:removeRow, flush:flushOutbox, flushDeletes:flushPendingDeletes, pending:outboxCount, log:function(){return _log.slice();},
  login:login, logout:logout, refreshSession:refreshSession, changePassword:changePassword,
  session:getSession, sessionValid:sessionValid, authHeaders:authHeaders};
// Only the owner/crew tools (which set window.WECARE_SYNC) poll + pull. Public
// customer pages skip all polling entirely (writes still work via the interceptor
// and WeCareCloud.save) — no battery/data/egress drain for visitors.
// Also pause polling while the tab is hidden.
function maybeSync(){ if(window.WECARE_SYNC) initialSync(); }
document.addEventListener("visibilitychange",function(){
  if(!window.WECARE_SYNC) return;
  if(document.visibilityState==="visible"){ refreshIfNeeded().then(function(){ flushOutbox(); flushPendingDeletes(); pullAll(); startRealtime(); }); }   // catch up + retry queue + resubscribe
});
if(document.readyState!=="loading") maybeSync();
else document.addEventListener("DOMContentLoaded", maybeSync);
})();
