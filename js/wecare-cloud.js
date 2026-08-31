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
    .then(function(r){return r.json();}).then(function(d){ return _storeSess(d,email)?{ok:true}:{ok:false,error:(d&&(d.error_description||d.msg))||"login failed"}; })
    .catch(function(e){return {ok:false,error:String(e)};});
}
function refreshSession(){
  var s=getSession(); if(!s||!s.refresh_token) return Promise.resolve(false);
  return fetch(URL_+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:ANON,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:s.refresh_token})})
    .then(function(r){return r.json();}).then(function(d){ if(_storeSess(d,s.email)) return true; setSession(null); return false; }).catch(function(){return false;});
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
  toRow:function(o){return {id:o.id,customer:o.customer,phone:o.phone||"",service:o.service,address:o.address,scope:o.scope,sop:o.sop,assigned_to:o.assignedTo||[],date:o.date,status:o.status,est_hours:o.estHours||null,paid:!!o.paid,review_status:o.reviewStatus||"",materials:(o.materials||o.materials===0)?o.materials:null,price:(o.price||o.price===0)?o.price:null,photos:o.photos||[],recur_id:o.recurId||""};},
  fromRow:function(r){return {id:r.id,customer:r.customer,phone:r.phone||"",service:r.service,address:r.address,scope:r.scope,sop:r.sop,assignedTo:r.assigned_to||[],date:r.date,status:r.status,estHours:r.est_hours,paid:r.paid,reviewStatus:r.review_status||"",materials:r.materials,price:r.price,photos:r.photos||[],recurId:r.recur_id||""};}},
 {key:"wecare_recurring", table:"recurring_jobs", shape:"array",
  toRow:function(o){return {id:o.id,customer:o.customer||"",phone:o.phone||"",service:o.service||"",address:o.address||"",crew:o.crew||[],freq:o.freq||"weekly",dow:o.dow,est_hours:(o.estHours||o.estHours===0)?o.estHours:null,anchor:o.anchor||"",active:o.active!==false,created:o.created};},
  fromRow:function(r){return {id:r.id,customer:r.customer,phone:r.phone,service:r.service,address:r.address,crew:r.crew||[],freq:r.freq,dow:r.dow,estHours:r.est_hours,anchor:r.anchor,active:r.active,created:r.created};}},
 {key:"wecare_punches", table:"punches", shape:"array",
  toRow:function(o){return {id:o.id,emp_id:o.empId,emp_name:o.empName,job_id:o.jobId,clock_in:o.in,clock_out:o.out,in_geo:o.inGeo,out_geo:o.outGeo,edits:o.edits||[]};},
  fromRow:function(r){return {id:r.id,empId:r.emp_id,empName:r.emp_name,jobId:r.job_id,in:r.clock_in,out:r.clock_out,inGeo:r.in_geo,outGeo:r.out_geo,edits:r.edits||[]};}},
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

var _applyingRemote=false;
var _shadow={};   // key -> {id: JSONstring} last known, to detect changes

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
function pushChanges(store, rawValue){
  var parsed; try{parsed=JSON.parse(rawValue);}catch(e){return;}
  var recs=recordsOf(store,parsed);
  var sh=_shadow[store.key]||(_shadow[store.key]={});
  recs.forEach(function(o){
    if(!o||!o.id) return;
    var js=JSON.stringify(o);
    if(sh[o.id]===js) return;         // unchanged
    sh[o.id]=js;
    upsert(store, store.toRow(o));
  });
}
// customer-facing tables: when NOT a logged-in owner, writes go through the service-role
// public_write function (so the anon key never needs direct write access to them).
var PUBLIC_TABLES={leads:1,consultations:1,conversations:1};
function upsert(store, row){
  if(!sessionValid() && PUBLIC_TABLES[store.table]){ team("public_write",{table:store.table,row:row}); return; }
  fetch(REST+store.table+"?on_conflict=id", {
    method:"POST",
    headers:Object.assign({}, authHeaders(), {"Prefer":"resolution=merge-duplicates,return=minimal"}),
    body:JSON.stringify(row)
  }).catch(function(){});
}

function applyRemote(store, rows){
  var incoming=rows.map(store.fromRow);
  var cur;
  if(store.shape==="array"){
    cur=incoming.sort(function(a,b){return (b.created||"").localeCompare(a.created||"");});
  }else{
    cur={}; incoming.forEach(function(o){cur[o.id]=o;});
  }
  var newRaw=JSON.stringify(cur);
  if(localStorage.getItem(store.key)===newRaw) return false;
  // refresh shadow so we don't echo these back as "changes"
  var sh={}; incoming.forEach(function(o){sh[o.id]=JSON.stringify(o);});
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

// on load: push any local-only data up first, then pull, then poll
function initialSync(){
  // seed shadow + push existing local rows (so demo/local data lands in cloud once)
  STORES.forEach(function(store){
    var raw=localStorage.getItem(store.key);
    if(raw){ try{ pushChanges(store, raw); }catch(e){} }
  });
  pullAll();
  setInterval(function(){ if(document.visibilityState!=="hidden") pullAll(); }, 6000);   // live-ish sync; paused when tab hidden
}
// upload a job photo to Supabase Storage → returns the public URL
function uploadPhoto(file, jobId){
  var ext=(file.name||"jpg").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  var path="wo/"+(jobId||"misc")+"/"+Date.now()+"-"+Math.floor(Math.random()*1e6)+"."+ext;
  return fetch(URL_+"/storage/v1/object/job-photos/"+path,{
    method:"POST",
    headers:{apikey:ANON,Authorization:"Bearer "+ANON,"Content-Type":file.type||"image/jpeg","x-upsert":"true"},
    body:file
  }).then(function(r){ if(!r.ok) throw new Error("upload failed"); return URL_+"/storage/v1/object/public/job-photos/"+path; });
}
// Employee directory goes through the service-role `team` edge function so crew
// PINs + personal info are never exposed to this public anon key.
var TEAM_FN=URL_+"/functions/v1/team";
function team(action, payload){
  var body=Object.assign({action:action}, payload||{});
  // send the owner session JWT when present so the function can authorize by real login
  return fetch(TEAM_FN,{method:"POST",headers:authHeaders(),body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .catch(function(e){return {error:String(e)};});
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
window.WeCareCloud={pull:pullAll, url:URL_, uploadPhoto:uploadPhoto, team:team, save:saveConfirmed,
  login:login, logout:logout, refreshSession:refreshSession, changePassword:changePassword,
  session:getSession, sessionValid:sessionValid, authHeaders:authHeaders};
// Only the owner/crew tools (which set window.WECARE_SYNC) poll + pull. Public
// customer pages skip all polling entirely (writes still work via the interceptor
// and WeCareCloud.save) — no battery/data/egress drain for visitors.
// Also pause polling while the tab is hidden.
function maybeSync(){ if(window.WECARE_SYNC) initialSync(); }
document.addEventListener("visibilitychange",function(){
  if(!window.WECARE_SYNC) return;
  if(document.visibilityState==="visible") pullAll();
});
if(document.readyState!=="loading") maybeSync();
else document.addEventListener("DOMContentLoaded", maybeSync);
})();
