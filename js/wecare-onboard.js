/* We Care — guided onboarding tour for the owner tools.
   Walks Derrick through the whole platform in order, spotlighting each element
   with "what to do + why", across pages, resuming where he left off.
   Include on the owner tools (pulse/dashboard/ops/crew). Safe: no deps. */
(function(){
"use strict";
var KEY="wecare_onboard";
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {};}}
function save(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}
function page(){var p=location.pathname.split("/").pop();return p||"index.html";}

/* ---- the tour: ordered steps. sel=null → centered card (no spotlight) ---- */
var TOUR=[
 {p:"pulse.html",sel:null,t:"Welcome to your platform, Derrick 👋",
  b:"This quick guide walks you through running We Care — a few minutes, and you'll know the whole thing. You can stop anytime and pick right back up. Let's start here on your <b>Owner Home</b>."},
 {p:"pulse.html",sel:"#tiles",t:"Your week at a glance",
  b:"Start every morning here: jobs done vs. scheduled, crew hours, revenue booked, and new leads waiting. One look and you know where things stand."},
 {p:"pulse.html",sel:"#attn",t:"What needs you today",
  b:"These turn <b>amber</b> when something needs action — follow-ups due, new booking requests, reviews to send. <b>Green ✓</b> means you're caught up. Tap any chip to jump straight to it."},
 {p:"pulse.html",sel:".nav",t:"Everything's one tap away",
  b:"This bar moves you between your tools — Leads/CRM, Field Ops, the Crew app, and your website. Let's look at your leads next.",
  next:"dashboard.html",nextLabel:"Open Leads / CRM →"},

 {p:"dashboard.html",sel:".board",t:"Your leads pipeline",
  b:"Every customer who calls, books, or chats with Sage lands here automatically. Move each one left to right as you work them: <b>New → Contacted → Quoted → Won</b>, one tap each."},
 {p:"dashboard.html",sel:"#followups",t:"Never let a lead go cold",
  b:"This tells you exactly who's due for a follow-up (1, 3, 7, then 14 days) and <b>writes the message for you</b>. Tap 📱 Text to send it from your phone, then tap 'Logged it.'"},
 {p:"dashboard.html",sel:"#consults",t:"Consultation requests",
  b:"When someone books online it appears here as 'New — confirm.' Tap <b>Text to confirm</b> and you're set. Now let's see where you run the crew.",
  next:"ops.html",nextLabel:"Open Field Ops →"},

 {p:"ops.html",sel:"#onclock",t:"Who's on the clock",
  b:"Real-time view of who's clocked in and which job they're on."},
 {p:"ops.html",sel:"#hours",t:"Payroll, done for you",
  b:"Everyone's hours and pay for the week — Chris's day rate handled automatically. When it's time to pay, tap <b>⬇ CSV</b>."},
 {p:"ops.html",sel:"#woCust",t:"Create a work order",
  b:"Add the customer, pick a service, assign your crew, and it shows up in their phones instantly."},
 {p:"ops.html",sel:"#costing",t:"Know your profit on every job",
  b:"Once the crew clocks in and you enter what you charged, this shows labor + materials vs. price — your real <b>profit per job</b>."},
 {p:"ops.html",sel:"#teamPanel",t:"Your team & approvals",
  b:"Your crew set up their own accounts (they get a sign-up link). New sign-ups show here as <b>Pending</b> — tap <b>✅ Approve</b> and they can clock in. You can print each profile, reset a PIN, or add someone yourself. (Enter your office password once to unlock everyone's info.)"},
 {p:"ops.html",sel:"#sopList",t:"Your playbook (SOPs)",
  b:"Write your step-by-steps once here; the crew opens them as a checklist right on the job. Last stop — what your crew sees.",
  next:"crew.html",nextLabel:"Open the Crew app →"},

 {p:"crew.html",sel:".clockcard",t:"How your crew clocks in",
  b:"Each person signs in, picks their job, and taps Clock In — their location is stamped automatically, tied to that job."},
 {p:"crew.html",sel:".job",t:"Their day, laid out",
  b:"Today's assigned jobs with one-tap directions, the SOP checklist, and status buttons (En route → Arrived → Started → Done)."},
 {p:"crew.html",sel:".photos",t:"Job photos",
  b:"They tap <b>＋ Add</b> to snap before/during/after photos right on the job — and those flow straight back to you in Field Ops."},
 {p:"crew.html",sel:null,t:"That's it — you've got this, Derrick 🌿",
  b:"You just saw the whole system. The <b>🎓 Guide</b> button (bottom-left) stays available whenever you want a refresher, and your <b>Owner Home</b> always tells you what needs you. Welcome aboard.",
  finish:true}
];

function injectCSS(){
  if(document.getElementById("wc-ob-css")) return;
  var c=document.createElement("style");c.id="wc-ob-css";
  c.textContent=
  ".wc-ob-spot{position:absolute;border-radius:12px;box-shadow:0 0 0 9999px rgba(16,32,26,.72);z-index:100000;pointer-events:none;transition:all .25s ease}"+
  ".wc-ob-card{position:fixed;z-index:100001;max-width:340px;background:#fff;color:#33443f;border-radius:14px;padding:18px 18px 14px;box-shadow:0 20px 60px rgba(0,0,0,.4);font-family:'Figtree',-apple-system,sans-serif;line-height:1.5}"+
  "@media (prefers-color-scheme:dark){.wc-ob-card{background:#16281f;color:#c3d1c9}}"+
  ".wc-ob-card .wc-step{font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2b6b78}"+
  ".wc-ob-card h4{font-family:'Fraunces',Georgia,serif;color:#1f5d3d;margin:6px 0 6px;font-size:1.15rem}"+
  "@media (prefers-color-scheme:dark){.wc-ob-card h4{color:#8fe0b0}}"+
  ".wc-ob-card p{margin:0 0 14px;font-size:.93rem}"+
  ".wc-ob-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}"+
  ".wc-ob-btn{border:0;border-radius:9px;padding:9px 15px;font:700 .88rem 'Figtree',sans-serif;cursor:pointer;background:linear-gradient(135deg,#1f5d3d,#2b6b78);color:#fff}"+
  ".wc-ob-ghost{background:none;border:0;color:#6d7d77;font:600 .82rem 'Figtree',sans-serif;cursor:pointer;padding:8px 6px}"+
  ".wc-ob-ghost:hover{color:#c1512f}"+
  ".wc-ob-launch{position:fixed;left:16px;bottom:16px;z-index:99999;background:linear-gradient(135deg,#1f5d3d,#2b6b78);color:#fff;border:0;border-radius:999px;padding:11px 16px;font:700 .85rem 'Figtree',sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(20,48,42,.35);display:flex;align-items:center;gap:7px}"+
  ".wc-ob-launch.pulse{animation:wcobp 2s infinite}"+
  "@keyframes wcobp{0%{box-shadow:0 0 0 0 rgba(148,204,79,.5)}70%{box-shadow:0 0 0 12px rgba(148,204,79,0)}100%{box-shadow:0 0 0 0 rgba(148,204,79,0)}}";
  document.head.appendChild(c);
}

var spot, card;
function clear(){ if(spot){spot.remove();spot=null;} if(card){card.remove();card=null;} }

function firstOnPage(){ var pg=page(); for(var i=0;i<TOUR.length;i++){ if(TOUR[i].p===pg) return i; } return -1; }

function show(i){
  injectCSS(); clear();
  var s=TOUR[i]; if(!s) return finish();
  var el = s.sel ? document.querySelector(s.sel) : null;
  var total=TOUR.length;
  card=document.createElement("div"); card.className="wc-ob-card";
  var nextBtn = s.finish ? '<button class="wc-ob-btn" data-act="done">Finish 🎉</button>'
    : (s.next ? '<button class="wc-ob-btn" data-act="go" data-page="'+s.next+'">'+(s.nextLabel||"Next →")+'</button>'
              : '<button class="wc-ob-btn" data-act="next">Next →</button>');
  card.innerHTML='<div class="wc-step">Step '+(i+1)+' of '+total+'</div>'+
    '<h4>'+s.t+'</h4><p>'+s.b+'</p>'+
    '<div class="wc-ob-row">'+nextBtn+
      (i>0?'<button class="wc-ob-ghost" data-act="back">Back</button>':'')+
      '<span style="flex:1"></span>'+
      '<button class="wc-ob-ghost" data-act="skip">Hide for now</button>'+
    '</div>';
  document.body.appendChild(card);

  if(el){
    el.scrollIntoView({behavior:"smooth",block:"center"});
    setTimeout(function(){
      var r=el.getBoundingClientRect(), pad=8;
      spot=document.createElement("div"); spot.className="wc-ob-spot";
      spot.style.top=(r.top+window.scrollY-pad)+"px"; spot.style.left=(r.left+window.scrollX-pad)+"px";
      spot.style.width=(r.width+pad*2)+"px"; spot.style.height=(r.height+pad*2)+"px";
      document.body.appendChild(spot);
      // place card below the element, or above if not enough room
      var below = r.bottom + 16, cw=card.getBoundingClientRect();
      var top = (r.bottom+cw.height+24 < window.innerHeight) ? below : Math.max(12, r.top-cw.height-16);
      var left = Math.min(Math.max(12, r.left), window.innerWidth-cw.width-12);
      card.style.top=top+"px"; card.style.left=left+"px";
    },300);
  } else {
    // centered
    card.style.top="50%"; card.style.left="50%"; card.style.transform="translate(-50%,-50%)";
    var ov=document.createElement("div"); ov.className="wc-ob-spot";
    ov.style.top="50%"; ov.style.left="50%"; ov.style.width="0"; ov.style.height="0"; spot=ov; document.body.appendChild(ov);
  }

  card.addEventListener("click",function(e){
    var b=e.target.closest("[data-act]"); if(!b) return;
    var act=b.getAttribute("data-act");
    if(act==="next"){ go(i+1); }
    else if(act==="back"){ go(i-1); }
    else if(act==="go"){ var st=load(); st.step=i+1; save(st); clear(); location.href=b.getAttribute("data-page"); }
    else if(act==="skip"){ var s2=load(); s2.step=i; save(s2); clear(); launcher(); }
    else if(act==="done"){ finish(); }
  });
}
function go(i){ var st=load(); st.step=i; save(st); if(i>=TOUR.length) return finish();
  if(TOUR[i].p!==page()){ clear(); location.href=TOUR[i].p; return; } show(i); }
function finish(){ var st=load(); st.done=true; st.step=TOUR.length; save(st); clear(); launcher(); }

function launcher(){
  var old=document.getElementById("wc-ob-launch"); if(old) old.remove();
  var st=load(); if(st.dismissed) return;
  var b=document.createElement("button"); b.id="wc-ob-launch"; b.className="wc-ob-launch"+(st.done?"":" pulse");
  b.innerHTML=st.done?"🎓 Guide":(st.step?"▶ Resume setup guide":"🎓 Start setup guide");
  document.body.appendChild(b);
  b.onclick=function(){
    var s=load(), i=s.step||0;
    if(i>=TOUR.length) i=0;                       // replay from start after finished
    if(TOUR[i].p!==page()){ s.step=i; save(s); location.href=TOUR[i].p; return; }
    b.remove(); show(i);
  };
  // let owner permanently hide it once finished
  if(st.done){ b.title="Tap to replay. Long-press / right-click to hide for good.";
    b.oncontextmenu=function(e){e.preventDefault(); if(confirm("Hide the setup guide for good?")){var s=load();s.dismissed=true;save(s);b.remove();}}; }
}

function start(){
  injectCSS();
  var st=load();
  if(st.dismissed) return;                        // owner turned it off
  var i = st.step!=null ? st.step : 0;
  // if the current tour step is on THIS page, auto-run it; else show launcher
  if(!st.done && TOUR[i] && TOUR[i].p===page()){ show(i); }
  else { launcher(); }
}
if(document.readyState!=="loading") setTimeout(start,600);
else document.addEventListener("DOMContentLoaded",function(){setTimeout(start,600);});
})();
