/* We Care Crew — Phase 1 Core Field Ops (PWA).
   GPS-stamped clock in/out tied to a work order · today's jobs · statuses · weekly hours.
   Demo/local now (localStorage, shared with owner dashboard); Supabase-ready.
   Shared storage keys are the SAME the owner dashboard reads. */
(function(){
"use strict";

/* ---- default roster (fallback until the cloud employees directory loads) ---- */
var DEFAULT_CREW = [
  {id:"derrick", name:"Derrick Collier", role:"Owner & Operations Director", admin:true},
  {id:"jason",   name:"Jason Kennedy",   role:"Landscape Production Manager"},
  {id:"hayden",  name:"Hayden Collier",  role:"Landscape Installation Tech"},
  {id:"justin",  name:"Justin Cavenza",  role:"Landscape Installation Tech"},
  {id:"christian",name:"Christian Benton",role:"Maintenance Technician"},
  {id:"chris",   name:"Chris Crain",     role:"Maintenance Technician"},
];

/* ---- shared stores (owner dashboard reads the same keys) ---- */
var K_PUNCH="wecare_punches";      // [{id, empId, empName, jobId, in, out, inGeo, outGeo, edits:[]}]
var K_JOBS ="wecare_workorders";   // [{id, customer, service, address, scope, sop, assignedTo[], date, status, estHours, propertyId}]
var K_SOPS ="wecare_sops";         // SOP library (owner-written) [{id,title,service,steps[],notes}]
var K_PROPS="wecare_properties";   // property cards attached to jobs [{id,name,access,areas,...,notes[],photos[]}]
var K_EMP  ="wecare_employees";    // employee directory (owner-managed): profile + clock-in PIN
var K_ME   ="wecare_crew_me";      // current employee id on THIS phone
function load(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
/* full directory (stored if present, else defaults) and the sign-in list (active only) */
function allEmps(){ var s=load(K_EMP,null); return (s&&s.length)?s:DEFAULT_CREW; }
function CREW_(){ return allEmps().filter(function(e){return e.active!==false;}); }
window.WeCareOps={K_PUNCH:K_PUNCH,K_JOBS:K_JOBS,get CREW(){return CREW_();},load:load,save:save};

/* ---- seed a couple of demo work orders so it's not empty ---- */
function seedJobs(){
  var j=load(K_JOBS,null);
  if(j) return j;
  var today=new Date().toISOString().slice(0,10);
  j=[
    {id:"W1",customer:"Tammy Ledgerwood",service:"Lawn maintenance",address:"110 Ledgerwood Circle, Hot Springs",
     scope:"Biweekly mow, edge, trim, blow off.",sop:"Mowing SOP",assignedTo:["christian","chris"],date:today,status:"assigned",estHours:1.5},
    {id:"W2",customer:"Janet Rowe",service:"Concrete Artistry",address:"14 Vista Ln, Hot Springs Village",
     scope:"Carved concrete tree-stump feature + flagstone border. Photos before/during/after.",sop:"Carved Concrete SOP",assignedTo:["jason","hayden","justin"],date:today,status:"assigned",estHours:8},
    {id:"W3",customer:"Carlos M.",service:"Sod install",address:"22 Oak St, Benton",
     scope:"Deliver + lay 3 pallets fescue. Prep + roll.",sop:"Sod Installation SOP",assignedTo:["hayden","justin"],date:today,status:"assigned",estHours:4},
  ];
  save(K_JOBS,j); return j;
}

var me=null, tickHandle=null, _pin="";   // _pin: this session's verified PIN (memory only, never stored)
function meObj(){return allEmps().find(function(c){return c.id===me}) || {id:me,name:me,role:""};}

/* ---------- who am I ---------- */
function authedFlag(id){return "wecare_authed_"+id;}
function isAuthed(id){try{return sessionStorage.getItem(authedFlag(id))==="1";}catch(e){return false;}}
function setAuthed(id){try{sessionStorage.setItem(authedFlag(id),"1");}catch(e){}}
function openWho(){
  var list=document.getElementById("whoList");
  list.innerHTML=CREW_().map(function(c){
    var locked=c.pin?' 🔒':'';
    return '<button class="pickbtn" data-id="'+c.id+'">'+c.name+locked+'<div class="role">'+(c.role||'')+'</div></button>';
  }).join("")+'<a href="crew-signup.html" class="pickbtn" style="display:block;text-align:center;text-decoration:none;color:var(--teal-deep,#2b6b78)">＋ New here? Set up your account</a>';
  list.querySelectorAll(".pickbtn[data-id]").forEach(function(b){
    b.onclick=function(){ signInAs(b.dataset.id); };
  });
  document.getElementById("whoModal").classList.add("open");
}
function signInAs(id){
  var emp=allEmps().find(function(x){return x.id===id;});
  if(emp && emp.hasPin){ askPin(id, function(){ me=id; save(K_ME,me); setAuthed(id); closeWho(); fetchCrewData(); render(); }); }
  else { me=id; save(K_ME,me); setAuthed(id); closeWho(); render(); toast("Ask Derrick to finish setting up your account"); }
}
function closeWho(){var m=document.getElementById("whoModal"); if(m)m.classList.remove("open");}
/* ---- PIN entry (the crew "security key") — verified SERVER-SIDE so the raw PIN
       is never shipped to the browser ---- */
function askPin(id, onOk){
  var emp=allEmps().find(function(x){return x.id===id;})||{name:"you"};
  var ov=document.getElementById("pinModal");
  document.getElementById("pinName").textContent=(emp.name||"").split(" ")[0]||"there";
  var inp=document.getElementById("pinInput"), err=document.getElementById("pinErr"), okBtn=document.getElementById("pinOk");
  inp.value=""; err.style.display="none";
  ov.classList.add("open"); setTimeout(function(){inp.focus();},50);
  function cleanup(){ov.classList.remove("open"); inp.onkeyup=null; okBtn.disabled=false;
    okBtn.onclick=null; document.getElementById("pinCancel").onclick=null; document.getElementById("pinForgot").onclick=null;}
  function tryit(){
    var val=inp.value;
    if(!/^\d{4}$/.test(val)){ err.textContent="Enter your 4-digit PIN."; err.style.display="block"; return; }
    okBtn.disabled=true; err.style.display="none";
    WeCareCloud.team("verify",{id:id,pin:val}).then(function(res){
      okBtn.disabled=false;
      if(res && res.ok){ _pin=val; cleanup(); onOk(); }
      else if(res && res.throttled){ err.textContent="Too many tries — wait a minute and try again."; err.style.display="block"; }
      else { err.textContent="That PIN doesn't match. Try again, or ask Derrick to reset it."; err.style.display="block"; inp.value=""; inp.focus(); }
    });
  }
  okBtn.onclick=tryit;
  inp.onkeyup=function(e){ if(e.key==="Enter") tryit(); };
  document.getElementById("pinCancel").onclick=function(){ cleanup(); };
  document.getElementById("pinForgot").onclick=function(){ err.textContent="No problem — ask Derrick to reset your PIN in the office (Field Ops → Team)."; err.style.display="block"; };
}
/* gate any clock action behind the PIN once per session */
function ensureAuthed(cb){
  var emp=meObj();
  if(emp && emp.hasPin && !isAuthed(me)){ askPin(me, function(){ setAuthed(me); cb(); }); }
  else cb();
}
/* pull the roster (names + PIN status only — never raw PINs) from the team gate */
function fetchRoster(){
  if(!window.WeCareCloud || !WeCareCloud.team) return;
  WeCareCloud.team("list").then(function(res){
    if(res && res.employees){ save(K_EMP,res.employees); render(); }
  });
}
/* pull THIS crew member's data (their jobs + their punches + SOPs) via the PIN-verified
   crew gate — work_orders/punches/sops are no longer read with the public key */
// crew_data returns raw DB rows (snake_case); the crew app works in camelCase — map them.
function normJob(r){return {id:r.id,customer:r.customer,phone:r.phone||"",service:r.service,address:r.address,scope:r.scope,sop:r.sop,
  assignedTo:r.assigned_to||[],date:r.date,status:r.status,estHours:r.est_hours,paid:r.paid,reviewStatus:r.review_status||"",
  photos:r.photos||[],howTo:r.how_to||"",recurId:r.recur_id||"",routeId:r.route_id||"",routeName:r.route_name||"",seq:r.seq||0,propertyId:r.property_id||""};}
function normProp(r){return {id:r.id,name:r.name||"",customer:r.customer||"",phone:r.phone||"",email:r.email||"",address:r.address||"",areas:r.areas||"",turfPlants:r.turf_plants||"",irrigation:r.irrigation||"",access:r.access||"",preferences:r.preferences||"",problemAreas:r.problem_areas||"",special:r.special||"",notes:r.notes||[],photos:r.photos||[]};}
function normPunch(r){return {id:r.id,empId:r.emp_id,empName:r.emp_name,jobId:r.job_id,in:r.clock_in,out:r.clock_out,
  inGeo:r.in_geo,outGeo:r.out_geo,edits:r.edits||[],needsReview:!!r.needs_review};}
function fetchCrewData(){
  if(!me || !_pin || !window.WeCareCloud || !WeCareCloud.team) return;
  WeCareCloud.team("crew_data",{id:me,pin:_pin}).then(function(res){
    if(res && res.ok){
      save(K_JOBS,(res.jobs||[]).map(normJob));
      save(K_PUNCH,(res.punches||[]).map(normPunch));
      save(K_SOPS,res.sops||[]);
      save(K_PROPS,(res.properties||[]).map(normProp));
      render();
    }
  });
}

/* ---------- punches ---------- */
function myOpenPunch(){
  return load(K_PUNCH,[]).find(function(p){return p.empId===me && !p.out});
}
function fmtDur(ms){
  var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
  return h+":"+String(m).padStart(2,"0");
}
function geo(cb){
  var note=document.getElementById("gpsNote");
  if(!navigator.geolocation){ cb(null); return; }
  note.textContent="📍 Getting location…";
  navigator.geolocation.getCurrentPosition(
    function(p){ note.className="gps ok"; note.textContent="📍 Location captured ✓";
      cb({lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5),acc:Math.round(p.coords.accuracy)}); },
    function(){ note.className="gps"; note.textContent="📍 Location unavailable (clock still recorded)"; cb(null); },
    {enableHighAccuracy:true,timeout:8000,maximumAge:60000}
  );
}
function clockIn(){
  var jobId=document.getElementById("jobPick").value;
  if(!jobId){ toast("Pick the job you're working first"); return; }
  ensureAuthed(function(){
    geo(function(g){
      WeCareCloud.team("crew_punch",{id:me,pin:_pin,op:"in",jobId:jobId,geo:g}).then(function(res){
        if(res&&res.ok){ toast("Clocked in ✓"); fetchCrewData(); } else toast("Couldn't clock in — try again");
      });
    });
  });
}
function clockOut(){
  ensureAuthed(function(){
    geo(function(g){
      WeCareCloud.team("crew_punch",{id:me,pin:_pin,op:"out",geo:g}).then(function(res){
        if(res&&res.ok){ toast("Clocked out ✓"); fetchCrewData(); } else toast("Couldn't clock out — try again");
      });
    });
  });
}

/* ---------- weekly hours ---------- */
function weekStart(){ var d=new Date(); var day=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-day); return d; }
function myHours(){
  var ws=weekStart().getTime(), total=0, byDay={};
  load(K_PUNCH,[]).forEach(function(p){
    if(p.empId!==me||!p.out)return;
    var t0=new Date(p.in).getTime(); if(t0<ws)return;
    var hrs=(new Date(p.out).getTime()-t0)/3600000; total+=hrs;
    var d=new Date(p.in).toLocaleDateString(undefined,{weekday:"short"});
    byDay[d]=(byDay[d]||0)+hrs;
  });
  return {total:total,byDay:byDay};
}

/* ---------- render ---------- */
function jobLabel(j){return j.customer+" — "+j.service}
function render(){
  me=me||load(K_ME,null);
  document.getElementById("whoName").textContent = me?meObj().name.split(" ")[0]:"Sign in";
  if(!me){ openWho(); }

  // job picker + today's jobs (mine)
  var jobs=load(K_JOBS,[]);   // populated by fetchCrewData (this crew member's assigned jobs)
  var mine = me ? jobs.filter(function(j){return (j.assignedTo||[]).indexOf(me)>=0}) : [];
  // route stops show in service order, grouped by route; loose jobs after
  mine.sort(function(a,b){
    var ar=a.routeName||"", br=b.routeName||"";
    if(!ar!==!br) return ar?1:-1;                     // loose jobs first, then routes
    if(ar!==br) return ar<br?-1:1;                    // group by route name
    if(ar) return (a.seq||0)-(b.seq||0);              // within a route: service order
    return (a.customer||"").localeCompare(b.customer||"");
  });
  var pick=document.getElementById("jobPick");
  pick.innerHTML='<option value="">— Pick the job you\'re working —</option>'+
    mine.map(function(j){return '<option value="'+j.id+'">'+jobLabel(j)+'</option>'}).join("");

  // clock state
  var open=myOpenPunch();
  var btn=document.getElementById("clockBtn"), st=document.getElementById("clockStatus"), tm=document.getElementById("timer");
  if(open){
    st.textContent="Clocked in"; st.className="status";
    var job=jobs.find(function(j){return j.id===open.jobId});
    if(job){ pick.value=open.jobId; pick.disabled=true; }
    btn.textContent="Clock Out"; btn.className="bigbtn out";
    btn.onclick=clockOut;
    if(tickHandle)clearInterval(tickHandle);
    var upd=function(){ tm.textContent=fmtDur(Date.now()-new Date(open.in).getTime()); };
    upd(); tickHandle=setInterval(upd,1000);
  } else {
    st.textContent="Clocked out"; st.className="status off"; tm.textContent="0:00";
    pick.disabled=false;
    btn.textContent="Clock In"; btn.className="bigbtn in"; btn.onclick=clockIn;
    if(tickHandle){clearInterval(tickHandle);tickHandle=null;}
    document.getElementById("gpsNote").className="gps";
    document.getElementById("gpsNote").textContent="📍 Location will be captured at clock-in";
  }

  // jobs list
  var box=document.getElementById("jobs");
  document.getElementById("jobsSub").textContent = me ? (mine.length+" assigned to you today") : "Sign in to see your jobs";
  box.innerHTML = mine.length ? mine.map(jobCard).join("") : '<div class="muted">No jobs assigned to you today.</div>';
  wireJobs();

  // my hours
  var h=myHours();
  var hb=document.getElementById("myhours");
  var days=Object.keys(h.byDay);
  hb.innerHTML=(days.length?days.map(function(d){return '<div class="hoursbar"><span>'+d+'</span><b>'+h.byDay[d].toFixed(1)+' hrs</b></div>'}).join(""):'<div class="muted">No hours logged yet this week.</div>')
    +'<div class="hoursbar" style="border:0;margin-top:4px"><span><b>This week</b></span><b>'+h.total.toFixed(1)+' hrs</b></div>';
}

var STATUSES=[["enroute","En route"],["arrived","Arrived"],["started","Started"],["done","Done"]];
/* find the owner-written SOP for a job: match by name, else by service */
function findSOP(j){
  var sops=load(K_SOPS,[]); if(!sops.length) return null;
  return sops.find(function(s){return s.title===j.sop;}) ||
         sops.find(function(s){return s.service && s.service===j.service;}) || null;
}
function sopChecks(jobId){try{return JSON.parse(localStorage.getItem("wecare_sopcheck_"+jobId))||{}}catch(e){return {}}}
function sopBlock(j){
  var s=findSOP(j);
  if(!s){ return j.sop?'<details class="sop"><summary>📋 '+esc(j.sop)+'</summary><div class="muted" style="margin-top:6px">No steps added yet — ask the office to add this SOP.</div></details>':''; }
  var chk=sopChecks(j.id);
  var steps=(s.steps||[]).map(function(st,i){
    var on=chk[i]?'checked':'';
    return '<label class="sopstep"><input type="checkbox" data-job="'+j.id+'" data-i="'+i+'" '+on+'> <span>'+esc(st)+'</span></label>';
  }).join("");
  return '<details class="sop"><summary>📋 '+esc(s.title)+' · '+(s.steps||[]).length+' steps</summary>'+
    '<div class="soplist">'+steps+'</div>'+
    (s.notes?'<div class="muted" style="margin-top:6px">📝 '+esc(s.notes)+'</div>':'')+
    '</details>';
}
function jobCard(j){
  var maps="https://maps.apple.com/?daddr="+encodeURIComponent(j.address);
  var gmaps="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(j.address);
  var routeTag=j.routeName?'<div class="routetag">🗺️ '+esc(j.routeName)+' · Stop '+((j.seq||0)+1)+'</div>':'';
  return '<div class="job" data-id="'+j.id+'">'+
    routeTag+
    '<div class="h"><span class="cust">'+esc(j.customer)+'</span><span class="svc">'+esc(j.service)+'</span></div>'+
    '<div class="addr">📍 '+esc(j.address)+'</div>'+
    '<div class="muted" style="font-size:.88rem">'+esc(j.scope)+'</div>'+
    propertyBlock(j)+
    sopBlock(j)+
    '<div class="linkrow"><button onclick="window.open(\''+maps+'\')">🍎 Apple Maps</button><button onclick="window.open(\''+gmaps+'\')">📍 Google Maps</button></div>'+
    '<div class="steps">'+STATUSES.map(function(s){return '<button data-st="'+s[0]+'" class="'+(j.status===s[0]?'active':'')+'">'+s[1]+'</button>'}).join("")+'</div>'+
    howToBlock(j)+
    photosBlock(j)+
  '</div>';
}
// the attached property card — everything the tech needs to service this property,
// even if they've never been here. Shown open by default, above the job steps.
function propertyBlock(j){
  if(!j.propertyId) return "";
  var p=(load(K_PROPS,[])||[]).find(function(x){return x.id===j.propertyId;}); if(!p) return "";
  function row(label,val){ return val?'<div style="margin:7px 0"><span style="display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#8a6f52;font-weight:700">'+label+'</span><span style="white-space:pre-wrap">'+esc(val)+'</span></div>':''; }
  var photos=(p.photos||[]).map(function(u){var s=safeUrl(u);return s?'<a href="'+s+'" target="_blank" rel="noopener" class="jphoto"><img src="'+s+'" loading="lazy" alt="property"></a>':'';}).join("");
  var notes=(p.notes||[]).slice().reverse().map(function(n){return '<div class="muted" style="font-size:.82rem;margin:3px 0">• '+esc(n.text||"")+' <span style="opacity:.55">'+esc(n.t||"")+'</span></div>';}).join("");
  return '<details class="sop" open><summary>🏡 Property info — '+esc(p.name||p.customer||"this property")+'</summary><div style="margin-top:8px">'+
    row("🔑 Access / gate",p.access)+
    row("Areas we maintain",p.areas)+
    row("Turf &amp; plants",p.turfPlants)+
    row("Irrigation",p.irrigation)+
    row("Customer preferences",p.preferences)+
    row("⚠️ Problem areas",p.problemAreas)+
    row("Special instructions",p.special)+
    (photos?'<div class="jphotos" style="margin-top:8px">'+photos+'</div>':'')+
    (notes?'<div style="margin-top:8px"><span style="font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#8a6f52;font-weight:700">Notes &amp; history</span>'+notes+'</div>':'')+
  '</div></details>';
}
function isVideo(u){return /\.(mp4|mov|webm|m4v|ogg|ogv)(\?|$)/i.test(String(u==null?"":u));}
// owner-attached "how to do this job" clip/photo, shown up top for the crew
function howToBlock(j){
  var s=safeUrl(j.howTo); if(!s) return "";
  var media=isVideo(j.howTo)
    ? '<video src="'+s+'" class="howtomedia" controls preload="metadata" playsinline></video>'
    : '<a href="'+s+'" target="_blank" rel="noopener"><img src="'+s+'" class="howtomedia" loading="lazy" alt="how-to"></a>';
  return '<div class="howto"><div class="ptitle">📹 How to do this job — from Derrick</div>'+media+'</div>';
}
function photosBlock(j){
  var ph=(j.photos||[]);
  var thumbs=ph.map(function(u){var s=safeUrl(u);if(!s)return "";return isVideo(u)
    ? '<span class="jphoto"><video src="'+s+'" preload="metadata" muted playsinline onclick="window.open(\''+s+'\')"></video></span>'
    : '<a href="'+s+'" target="_blank" rel="noopener" class="jphoto"><img src="'+s+'" loading="lazy" alt="job photo"></a>';}).join("");
  return '<div class="photos">'+
    '<div class="ptitle">📷 Job photos &amp; videos'+(ph.length?' · '+ph.length:'')+'</div>'+
    '<div class="pgrid">'+thumbs+
      '<label class="paddbtn">＋ Add<input type="file" accept="image/*,video/*" capture="environment" class="photo-input" data-job="'+j.id+'" multiple hidden></label>'+
    '</div><div class="pstatus" id="pstatus-'+j.id+'"></div></div>';
}
function wireJobs(){
  document.querySelectorAll(".job").forEach(function(el){
    var id=el.dataset.id;
    el.querySelectorAll(".steps button").forEach(function(b){
      b.onclick=function(){
        var jobs=load(K_JOBS,[]); var j=jobs.find(function(x){return x.id===id});
        if(j){ j.status=b.dataset.st; save(K_JOBS,jobs); toast(j.customer+": "+b.textContent); render();
          WeCareCloud.team("crew_job_status",{id:me,pin:_pin,jobId:id,status:b.dataset.st}); }
      };
    });
    el.querySelectorAll(".soplist input[type=checkbox]").forEach(function(cb){
      cb.onchange=function(){
        var job=cb.dataset.job, i=cb.dataset.i, k="wecare_sopcheck_"+job;
        var m; try{m=JSON.parse(localStorage.getItem(k))||{}}catch(e){m={}}
        if(cb.checked)m[i]=1;else delete m[i];
        try{localStorage.setItem(k,JSON.stringify(m))}catch(e){}
      };
    });
    el.querySelectorAll(".photo-input").forEach(function(inp){
      inp.onchange=function(){
        var id=inp.dataset.job, files=[].slice.call(inp.files); if(!files.length)return;
        var st=document.getElementById("pstatus-"+id);
        var big=files.filter(function(f){return f.size>100*1024*1024;});   // 100MB cap (keep field uploads sane)
        if(big.length){ if(st)st.textContent="That video's too big to upload here (keep clips under ~100MB / ~2 min)."; inp.value=""; return; }
        var hasVid=files.some(function(f){return /^video\//.test(f.type||"");});
        if(st)st.textContent="Uploading "+files.length+" "+(hasVid?"file":"photo")+(files.length>1?"s":"")+"… "+(hasVid?"(video can take a minute on a weak signal)":"");
        if(!(window.WeCareCloud&&WeCareCloud.uploadPhoto)){ if(st)st.textContent="Need a connection — try again in a moment."; return; }
        Promise.all(files.map(function(f){return WeCareCloud.uploadPhoto(f,id,me,_pin);}))
          .then(function(urls){
            urls=(urls||[]).filter(Boolean);
            var jobs=load(K_JOBS,[]),j=jobs.find(function(x){return x.id===id});
            if(j){ j.photos=(j.photos||[]).concat(urls); save(K_JOBS,jobs); }
            // crew has a PIN not a session → persist the URLs to the job via the gated fn
            return WeCareCloud.team("crew_add_media",{id:me,pin:_pin,jobId:id,urls:urls});
          })
          .then(function(res){ if(st)st.textContent=(res&&res.ok)?"":"Saved on your device — will sync when the job reloads."; render(); })
          .catch(function(){ if(st)st.textContent="Upload failed — check signal and try again."; });
      };
    });
  });
}

function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(function(){t.classList.remove("show")},1800);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function safeUrl(u){u=String(u==null?"":u);return /^https?:\/\//i.test(u)?esc(u):"";}

/* punch-fix request */
function requestFix(){
  var note=prompt("What punch needs fixing? (Derrick & Brandi will review.)");
  if(!note)return;
  ensureAuthed(function(){
    WeCareCloud.team("crew_fix",{id:me,pin:_pin,note:note}).then(function(res){
      toast(res&&res.ok ? "Sent to Derrick & Brandi ✓" : "Couldn't send — try again");
    });
  });
}

document.addEventListener("DOMContentLoaded",function(){
  document.getElementById("whoBtn").onclick=openWho;
  document.getElementById("fixBtn").onclick=function(){ if(!me){openWho();return;} requestFix(); };
  document.getElementById("whoModal").addEventListener("click",function(e){ if(e.target.id==="whoModal") e.target.classList.remove("open"); });
  me=load(K_ME,null);
  render();
  // load the roster; then if a saved user is returning, unlock (PIN) and pull their data
  if(window.WeCareCloud && WeCareCloud.team){
    WeCareCloud.team("list").then(function(res){
      if(res && res.employees){ save(K_EMP,res.employees); render(); }
      if(me){ var e=((res&&res.employees)||[]).find(function(x){return x.id===me;}); if(e && e.hasPin && !_pin){ ensureAuthed(fetchCrewData); } }
    });
  }
  setInterval(fetchRoster,60000);
  setInterval(function(){ if(me&&_pin) fetchCrewData(); },30000);   // refresh assigned jobs while signed in
  window.addEventListener("storage",render);
});
})();
