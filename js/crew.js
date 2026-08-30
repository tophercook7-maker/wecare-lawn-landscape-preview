/* We Care Crew — Phase 1 Core Field Ops (PWA).
   GPS-stamped clock in/out tied to a work order · today's jobs · statuses · weekly hours.
   Demo/local now (localStorage, shared with owner dashboard); Supabase-ready.
   Shared storage keys are the SAME the owner dashboard reads. */
(function(){
"use strict";

/* ---- crew roster (Derrick's real team) ---- */
var CREW = [
  {id:"derrick", name:"Derrick Collier", role:"Owner & Operations Director", admin:true},
  {id:"jason",   name:"Jason Kennedy",   role:"Landscape Production Manager"},
  {id:"hayden",  name:"Hayden Collier",  role:"Landscape Installation Tech"},
  {id:"justin",  name:"Justin Cavenza",  role:"Landscape Installation Tech"},
  {id:"christian",name:"Christian Benton",role:"Maintenance Technician"},
  {id:"chris",   name:"Chris Crain",     role:"Maintenance Technician"},
];

/* ---- shared stores (owner dashboard reads the same keys) ---- */
var K_PUNCH="wecare_punches";      // [{id, empId, empName, jobId, in, out, inGeo, outGeo, edits:[]}]
var K_JOBS ="wecare_workorders";   // [{id, customer, service, address, scope, sop, assignedTo[], date, status, estHours}]
var K_ME   ="wecare_crew_me";      // current employee id on THIS phone
function load(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
window.WeCareOps={K_PUNCH:K_PUNCH,K_JOBS:K_JOBS,CREW:CREW,load:load,save:save};

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

var me=null, tickHandle=null;
function meObj(){return CREW.find(function(c){return c.id===me})}

/* ---------- who am I ---------- */
function openWho(){
  var list=document.getElementById("whoList");
  list.innerHTML=CREW.map(function(c){
    return '<button class="pickbtn" data-id="'+c.id+'">'+c.name+'<div class="role">'+c.role+'</div></button>';
  }).join("");
  list.querySelectorAll(".pickbtn").forEach(function(b){
    b.onclick=function(){ me=b.dataset.id; save(K_ME,me); document.getElementById("whoModal").classList.remove("open"); render(); };
  });
  document.getElementById("whoModal").classList.add("open");
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
  geo(function(g){
    var all=load(K_PUNCH,[]);
    all.push({id:"P"+Date.now().toString(36),empId:me,empName:meObj().name,jobId:jobId,
      in:new Date().toISOString(),out:null,inGeo:g,outGeo:null,edits:[]});
    save(K_PUNCH,all); toast("Clocked in ✓"); render();
  });
}
function clockOut(){
  geo(function(g){
    var all=load(K_PUNCH,[]), p=all.find(function(x){return x.empId===me && !x.out});
    if(p){ p.out=new Date().toISOString(); p.outGeo=g; save(K_PUNCH,all); }
    toast("Clocked out ✓"); render();
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
  var jobs=seedJobs();
  var mine = me ? jobs.filter(function(j){return (j.assignedTo||[]).indexOf(me)>=0}) : [];
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
function jobCard(j){
  var maps="https://maps.apple.com/?daddr="+encodeURIComponent(j.address);
  var gmaps="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(j.address);
  return '<div class="job" data-id="'+j.id+'">'+
    '<div class="h"><span class="cust">'+esc(j.customer)+'</span><span class="svc">'+esc(j.service)+'</span></div>'+
    '<div class="addr">📍 '+esc(j.address)+'</div>'+
    '<div class="muted" style="font-size:.88rem">'+esc(j.scope)+'</div>'+
    (j.sop?'<details class="sop"><summary>📋 '+esc(j.sop)+'</summary><div class="muted" style="margin-top:6px">Open the step-by-step for this job type. (SOP library — you drop the docs, crew opens them here.)</div></details>':'')+
    '<div class="linkrow"><button onclick="window.open(\''+maps+'\')">🍎 Apple Maps</button><button onclick="window.open(\''+gmaps+'\')">📍 Google Maps</button></div>'+
    '<div class="steps">'+STATUSES.map(function(s){return '<button data-st="'+s[0]+'" class="'+(j.status===s[0]?'active':'')+'">'+s[1]+'</button>'}).join("")+'</div>'+
  '</div>';
}
function wireJobs(){
  document.querySelectorAll(".job").forEach(function(el){
    var id=el.dataset.id;
    el.querySelectorAll(".steps button").forEach(function(b){
      b.onclick=function(){
        var jobs=load(K_JOBS,[]); var j=jobs.find(function(x){return x.id===id});
        if(j){ j.status=b.dataset.st; save(K_JOBS,jobs); toast(j.customer+": "+b.textContent); render(); }
      };
    });
  });
}

function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(function(){t.classList.remove("show")},1800);}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

/* punch-fix request */
function requestFix(){
  var note=prompt("What punch needs fixing? (Derrick & Brandi will review.)");
  if(!note)return;
  var reqs=load("wecare_punch_fixes",[]);
  reqs.push({id:"F"+Date.now().toString(36),empId:me,empName:meObj?meObj().name:me,note:note,when:new Date().toISOString(),resolved:false});
  save("wecare_punch_fixes",reqs); toast("Sent to Derrick & Brandi ✓");
}

document.addEventListener("DOMContentLoaded",function(){
  document.getElementById("whoBtn").onclick=openWho;
  document.getElementById("fixBtn").onclick=function(){ if(!me){openWho();return;} requestFix(); };
  document.getElementById("whoModal").addEventListener("click",function(e){ if(e.target.id==="whoModal") e.target.classList.remove("open"); });
  render();
  window.addEventListener("storage",render);
});
})();
