/* We Care Lawn & Landscape — site logic
   - Sage: self-contained AI booking/CRM assistant (works offline, no API key)
   - Sod calculator
   - Lead capture -> localStorage (shared with dashboard.html)
   Production note: swap Sage's reply() for a call to a local Ollama model (free)
   and persist leads to the real CRM. The demo brain below shows the exact flow. */
(function(){
"use strict";

/* ---------- Business knowledge (single source of truth) ---------- */
var BIZ = {
  name:"We Care Lawn and Landscape",
  phone:"501-627-4384", phoneRaw:"5016274384",
  since:1998, area:"Hot Springs & Central Arkansas",
  sodPerPallet:450,            // sq ft per pallet
  sodPricePerSqFt:0.62,        // demo price / sq ft (confirm w/ owner)
  deliveryFee:75,
  towns:["Hot Springs","Hot Springs Village","Benton","Bryant","Malvern","Bismarck","Royal","Pearcy","Lonsdale","Mountain Pine"]
};
window.BIZ = BIZ;

/* ---------- Lead store (shared with dashboard) ---------- */
var LS_KEY="wecare_leads";
function loadLeads(){ try{return JSON.parse(localStorage.getItem(LS_KEY))||[]}catch(e){return[]} }
function saveLead(lead){
  var all=loadLeads();
  lead.id="L"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
  lead.created=new Date().toISOString();
  lead.stage="New";
  lead.source=lead.source||"AI Assistant";
  all.unshift(lead);
  try{localStorage.setItem(LS_KEY,JSON.stringify(all))}catch(e){}
  return lead;
}
window.WeCareLeads={load:loadLeads,save:saveLead,KEY:LS_KEY};

/* ---------- Sod calculator ---------- */
function sodEstimate(sqft){
  sqft=Math.max(0,Math.round(sqft));
  var pallets=Math.ceil(sqft/BIZ.sodPerPallet);
  var material=sqft*BIZ.sodPricePerSqFt;
  return {sqft:sqft, pallets:pallets, coverage:pallets*BIZ.sodPerPallet,
          material:material, delivery:BIZ.deliveryFee, total:material+BIZ.deliveryFee};
}
window.sodEstimate=sodEstimate;
function money(n){return "$"+n.toLocaleString("en-US",{maximumFractionDigits:0})}

// Wire the on-page calculator if present
function initPageCalc(){
  var form=document.getElementById("sodCalc"); if(!form) return;
  function calc(){
    var mode=form.mode.value, sqft=0;
    if(mode==="area"){ sqft=(parseFloat(form.len.value)||0)*(parseFloat(form.wid.value)||0); }
    else { sqft=parseFloat(form.sqft.value)||0; }
    var e=sodEstimate(sqft), out=document.getElementById("sodOut");
    if(!sqft){ out.innerHTML='<p style="margin:0;color:var(--muted)">Enter your lawn size to see pallets and a price estimate.</p>'; return; }
    out.innerHTML=
      '<div class="big">'+e.pallets+' pallet'+(e.pallets>1?'s':'')+' of sod</div>'+
      '<p style="margin:.3rem 0 1rem;color:var(--muted)">covers ~'+e.coverage.toLocaleString()+' sq ft ('+e.sqft.toLocaleString()+' sq ft needed)</p>'+
      '<div class="rowline"><span>Sod material (~'+money(BIZ.sodPricePerSqFt*100/100)+'/sq ft)</span><b>'+money(e.material)+'</b></div>'+
      '<div class="rowline"><span>Local delivery</span><b>'+money(e.delivery)+'</b></div>'+
      '<div class="rowline"><span>Estimated total</span><b style="color:var(--green-deep)">'+money(e.total)+'</b></div>'+
      '<p style="font-size:.8rem;color:var(--muted);margin:.8rem 0 0">Estimate only — final price confirmed by We Care. Installation quoted separately.</p>'+
      '<button class="btn btn-leaf btn-sm" style="margin-top:12px" onclick="Sage.openWith(\'sod order '+e.sqft+'\')">Request this sod order →</button>';
  }
  form.addEventListener("input",calc);
  form.querySelectorAll('[name=mode]').forEach(function(r){r.addEventListener("change",function(){
    document.getElementById("modeArea").style.display=form.mode.value==="area"?"flex":"none";
    document.getElementById("modeSqft").style.display=form.mode.value==="sqft"?"block":"none";
    calc();
  })});
  calc();
}

/* ================= SAGE — the AI assistant ================= */
var Sage=(function(){
  var panel,msgs,chipsEl,inputEl;
  var flow=null;         // active guided flow (booking/quote/sod)
  var data={};           // collected fields
  var greeted=false;

  var SERVICES=[
    {k:"sod",label:"Sod farm & delivery",kw:["sod","turf","grass pallet","sod farm","lay sod","bermuda","zoysia","fescue"]},
    {k:"maintenance",label:"Lawn maintenance",kw:["mow","mowing","maintenance","weekly","biweekly","cut grass","lawn care","edging","cleanup","leaves"]},
    {k:"landscape",label:"Landscape design/build",kw:["landscape","design","build","patio","flagstone","masonry","stone","retaining","water feature","pond","hardscape","garden"]}
  ];

  function el(cls,html){var d=document.createElement("div");d.className=cls;d.innerHTML=html;return d;}
  function scroll(){msgs.scrollTop=msgs.scrollHeight;}
  function typing(){var t=el("ai-typing","<span></span><span></span><span></span>");t.id="typing";msgs.appendChild(t);scroll();}
  function stopTyping(){var t=document.getElementById("typing");if(t)t.remove();}

  function say(html,cb){
    typing();
    setTimeout(function(){
      stopTyping();
      msgs.appendChild(el("ai-msg bot",html));scroll();
      if(cb)cb();
    }, Math.min(900, 350+html.length*8));
  }
  function me(text){msgs.appendChild(el("ai-msg user",escapeHtml(text)));scroll();}
  function escapeHtml(s){return String(s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c]})}

  function chips(list){
    chipsEl.innerHTML="";
    list.forEach(function(c){
      var b=el("ai-chip",c.label);
      b.onclick=function(){handle(c.value||c.label,c.label)};
      chipsEl.appendChild(b);
    });
  }
  function clearChips(){chipsEl.innerHTML="";}

  /* ---- guided flows ---- */
  function startFlow(kind,preset){
    flow={kind:kind,step:0};
    data={service:preset&&preset.service||serviceLabel(kind), _svcKey:preset&&preset.key||kind};
    if(preset&&preset.sqft)data.sqft=preset.sqft;
    nextStep();
  }
  function serviceLabel(k){var s=SERVICES.find(function(x){return x.k===k});return s?s.label:"";}

  var STEPS=["service","name","phone","address","detail","when","confirm"];
  function nextStep(){
    if(!flow)return;
    // skip service if known
    while(STEPS[flow.step]==="service" && data._svcKey){flow.step++;}
    var step=STEPS[flow.step];
    if(step==="service"){
      say("Which service can I set up for you?");
      chips(SERVICES.map(function(s){return{label:s.label,value:"svc:"+s.k}}));
    } else if(step==="name"){
      say(data.sqft? "Great — about <b>"+data.sqft.toLocaleString()+" sq ft</b> of sod. Let's get you on the schedule. What's your <b>name</b>?"
                    : "Happy to help with <b>"+data.service+"</b>. What's your <b>name</b>?");
    } else if(step==="phone"){
      say("Thanks, "+firstName(data.name)+"! What's the best <b>phone number</b> to reach you?");
    } else if(step==="address"){
      say("What's the <b>service address</b> (street & town)? This helps us confirm you're in our area.");
    } else if(step==="detail"){
      if(data._svcKey==="sod" && data.sqft){flow.step++;return nextStep();}
      var prompts={sod:"Roughly how many <b>square feet</b> of sod do you need? (Or describe the area.)",
        maintenance:"Weekly or biweekly? And is this a <b>one-time cleanup</b> or ongoing mowing?",
        landscape:"Tell me a bit about the <b>project</b> — patio, flagstone, water feature, full design…"};
      say(prompts[data._svcKey]||"Tell me a little about what you need.");
    } else if(step==="when"){
      say("When would you like this done? (e.g. <i>this week</i>, <i>next Saturday</i>, <i>no rush</i>)");
    } else if(step==="confirm"){
      finishFlow();
    }
  }
  function firstName(n){return (n||"").trim().split(/\s+/)[0]||"there"}

  function collect(text){
    var step=STEPS[flow.step];
    if(step==="name")data.name=text;
    else if(step==="phone")data.phone=text;
    else if(step==="address")data.address=text;
    else if(step==="detail"){data.detail=text; if(data._svcKey==="sod"){var m=text.match(/[\d,]+/);if(m)data.sqft=parseInt(m[0].replace(/,/g,""))||data.sqft;}}
    else if(step==="when")data.when=text;
    flow.step++;
    nextStep();
  }

  function finishFlow(){
    var lead=window.WeCareLeads.save({
      name:data.name,phone:data.phone,address:data.address,
      service:data.service,detail:data.detail||(data.sqft?data.sqft+" sq ft sod":""),
      sqft:data.sqft||null,when:data.when,source:"AI Assistant (Sage)"
    });
    var extra="";
    if(data._svcKey==="sod"&&data.sqft){var e=sodEstimate(data.sqft);
      extra="<br><br>For ~"+data.sqft.toLocaleString()+" sq ft that's about <b>"+e.pallets+" pallet"+(e.pallets>1?"s":"")+"</b> (~"+money(e.total)+" delivered, estimate).";}
    say("You're all set, "+firstName(data.name)+"! ✅<br><br>I've logged your <b>"+data.service+"</b> request and the team at We Care will reach out to <b>"+escapeHtml(data.phone||"")+"</b> to confirm."+extra+
        "<br><br>Need it faster? Call us directly at <a href='tel:"+BIZ.phoneRaw+"'>"+BIZ.phone+"</a>.",
      function(){
        say("Anything else I can help with?");
        chips([{label:"Estimate sod",value:"svc:sod"},{label:"Book maintenance",value:"svc:maintenance"},{label:"Talk to a person",value:"human"}]);
      });
    flow=null;data={};
  }

  /* ---- intent detection for free text ---- */
  function detectService(t){
    t=t.toLowerCase();
    for(var i=0;i<SERVICES.length;i++){
      for(var j=0;j<SERVICES[i].kw.length;j++){ if(t.indexOf(SERVICES[i].kw[j])>=0) return SERVICES[i]; }
    }
    return null;
  }

  function answer(t){
    var q=t.toLowerCase();
    // If in a guided flow, treat input as an answer
    if(flow){ collect(t); return; }

    // sod order shortcut e.g. "sod order 1200"
    var so=q.match(/sod (?:order|quote).*?([\d,]{2,})/);
    if(so){ startFlow("sod",{key:"sod",service:serviceLabel("sod"),sqft:parseInt(so[1].replace(/,/g,""))}); return; }

    // calculator intent
    if(/(how much|how many|calculat|estimate|price|cost).*(sod|turf|grass)/.test(q) || (/(sod|turf).*(price|cost|how much|how many)/.test(q))){
      var num=q.match(/([\d,]{2,})\s*(sq|square|sf|ft)/);
      if(num){var e=sodEstimate(parseInt(num[1].replace(/,/g,"")));
        say("For about <b>"+e.sqft.toLocaleString()+" sq ft</b> you'd need roughly <b>"+e.pallets+" pallet"+(e.pallets>1?"s":"")+"</b> — around <b>"+money(e.total)+"</b> delivered (estimate).<br><br>Want me to set up the order?");
        chips([{label:"Yes, order sod",value:"svc:sod"},{label:"Change the size",value:"sodhelp"}]);return;}
      say("I can price that out fast. About how many <b>square feet</b> of sod do you need? If you know your lawn's length × width, I'll do the math.");
      flow={kind:"sodquick",step:99}; return;
    }
    if(flow&&flow.kind==="sodquick"){ /* handled above */ }

    // service intents
    var svc=detectService(q);
    if(/(book|schedule|set up|sign up|appointment|come out|estimate|quote)/.test(q) && svc){
      startFlow(svc.k,{key:svc.k,service:svc.label}); return;
    }
    if(svc && /(book|schedule|quote|estimate|price|interested|need|want|help)/.test(q)){
      startFlow(svc.k,{key:svc.k,service:svc.label}); return;
    }

    // FAQ
    if(/(phone|call|number|contact)/.test(q)){say("You can reach We Care at <a href='tel:"+BIZ.phoneRaw+"'>"+BIZ.phone+"</a>. Want me to have someone call <i>you</i> instead?");chips([{label:"Call me back",value:"human"}]);return;}
    if(/(area|serve|location|where|town|near|hot springs|benton|malvern)/.test(q)){say("We serve <b>"+BIZ.area+"</b> — including "+BIZ.towns.slice(0,6).join(", ")+" and nearby. What's your town? I'll confirm.");return;}
    if(/(hour|open|when.*open|time)/.test(q)){say("We're out on jobs Mon–Sat. Leave your info here anytime and We Care follows up quickly — often same day.");return;}
    if(/(how long|since|experience|years|established|1998)/.test(q)){say("We Care has served Central Arkansas since <b>"+BIZ.since+"</b> — that's over 25 years of landscaping, masonry, and sod. 🌿");return;}
    if(/(who are you|your name|are you (a )?(bot|robot|ai|human)|sage|ivy)/.test(q)){say("I'm <b>Sage</b>, the We Care assistant 🌱 — I help you estimate sod, book maintenance, and get landscape quotes, 24/7. I can hand you to a real person anytime too.");return;}
    if(/(human|person|real|someone|owner|talk to)/.test(q)){startFlow("callback",{key:"callback",service:"Call-back request"});return;}
    if(/(hi|hello|hey|howdy|yo)\b/.test(q)&&q.length<12){menu("Hi there! 👋 I'm Sage. How can I help today?");return;}
    if(/(thank|thanks|appreciate)/.test(q)){say("Anytime! 🌿 Anything else?");return;}

    // fallback -> offer menu
    say("I can help you with any of these — which one fits?");
    chips([{label:"🌱 Sod estimate",value:"svc:sod"},{label:"✂️ Lawn maintenance",value:"svc:maintenance"},{label:"🪨 Landscape / patio",value:"svc:landscape"},{label:"📞 Talk to a person",value:"human"}]);
  }

  function menu(intro){
    say(intro||"How can I help you today?",function(){
      chips([{label:"🌱 Estimate sod",value:"svc:sod"},{label:"✂️ Book lawn maintenance",value:"svc:maintenance"},{label:"🪨 Landscape / patio quote",value:"svc:landscape"},{label:"📞 Have someone call me",value:"human"}]);
    });
  }

  function handle(value,display){
    clearChips();
    if(display)me(display); else me(value);
    // special values
    if(value.indexOf("svc:")===0){var k=value.slice(4);startFlow(k,{key:k,service:serviceLabel(k)});return;}
    if(value==="human"){startFlow("callback",{key:"callback",service:"Call-back request"});return;}
    if(value==="sodhelp"){say("No problem — just tell me the new square footage (or length × width).");flow={kind:"sodquick",step:99};return;}
    answer(value);
  }

  /* ---- public API ---- */
  function build(){
    if(document.getElementById("ai-panel"))return;
    var launch=document.createElement("button");
    launch.id="ai-launch";
    launch.innerHTML='<span class="pulse"></span><span class="av">🌱</span> Ask Sage';
    launch.onclick=open;
    document.body.appendChild(launch);

    panel=document.createElement("div");
    panel.id="ai-panel";
    panel.innerHTML=
      '<div class="ai-hd"><div class="av">🌱</div><div class="t"><b>Sage · We Care Assistant</b><span>Online — replies instantly</span></div><button class="x" aria-label="close">×</button></div>'+
      '<div class="ai-msgs" id="aiMsgs"></div>'+
      '<div class="ai-chips" id="aiChips"></div>'+
      '<form class="ai-input" id="aiForm"><input id="aiInput" placeholder="Type your question…" autocomplete="off"><button type="submit" aria-label="send">➤</button></form>';
    document.body.appendChild(panel);
    msgs=document.getElementById("aiMsgs");chipsEl=document.getElementById("aiChips");inputEl=document.getElementById("aiInput");
    panel.querySelector(".x").onclick=close;
    document.getElementById("aiForm").addEventListener("submit",function(e){
      e.preventDefault();var v=inputEl.value.trim();if(!v)return;inputEl.value="";clearChips();me(v);answer(v);
    });
  }
  function open(){
    build();panel.classList.add("open");document.getElementById("ai-launch").style.display="none";
    if(!greeted){greeted=true;
      say("Hi! I'm <b>Sage</b> 🌱 — your We Care assistant. I can estimate sod, book lawn maintenance, or start a landscape quote — right here, 24/7.",function(){menu("What would you like to do?")});
    }
    setTimeout(function(){inputEl&&inputEl.focus()},300);
  }
  function close(){panel.classList.remove("open");document.getElementById("ai-launch").style.display="flex";}
  function openWith(text){build();open();setTimeout(function(){clearChips();me(text);answer(text);},450);}

  return {build:build,open:open,close:close,openWith:openWith};
})();
window.Sage=Sage;

/* ---------- Simple lead forms on page ---------- */
function initPageForms(){
  document.querySelectorAll("form[data-lead]").forEach(function(f){
    f.addEventListener("submit",function(e){
      e.preventDefault();
      var fd=new FormData(f),o={};fd.forEach(function(v,k){o[k]=v});
      o.source=f.getAttribute("data-lead")||"Website form";
      window.WeCareLeads.save(o);
      var msg=f.querySelector("[data-ok]");
      f.querySelectorAll("input,select,textarea,button").forEach(function(x){x.disabled=true});
      if(msg){msg.style.display="block";msg.scrollIntoView({behavior:"smooth",block:"center"});}
    });
  });
}

/* ---------- Scroll reveal + nav + counters ---------- */
function initUX(){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.14});
  document.querySelectorAll(".reveal").forEach(function(x){io.observe(x)});
  var mo=document.getElementById("mobMenu"),hb=document.getElementById("hamb");
  if(hb&&mo)hb.onclick=function(){mo.classList.toggle("open")};
  document.querySelectorAll("[data-modal]").forEach(function(b){b.onclick=function(){var m=document.getElementById(b.getAttribute("data-modal"));if(m)m.classList.add("open")}});
  document.querySelectorAll(".modal").forEach(function(m){m.addEventListener("click",function(e){if(e.target===m||e.target.classList.contains("close"))m.classList.remove("open")})});
}

document.addEventListener("DOMContentLoaded",function(){
  initPageCalc();initPageForms();initUX();Sage.build();
});
})();
