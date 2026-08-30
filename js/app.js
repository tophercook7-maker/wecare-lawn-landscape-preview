/* We Care Lawn & Landscape — site logic
   - Sage: self-contained AI booking/CRM assistant (works offline, no API key)
   - Sod calculator
   - Lead capture -> localStorage (shared with dashboard.html)
   Production note: swap Sage's reply() for a call to a local Ollama model (free)
   and persist leads to the real CRM. The demo brain below shows the exact flow. */
(function(){
"use strict";

/* ---------- Business knowledge (single source of truth) ----------
   All of SOD below is meant to live in an EDITABLE settings screen (Derrick's rule).
   Numbers are his real rules from intake 2026-08-28. */
var BIZ = {
  name:"We Care",
  phone:"501-627-4384", phoneRaw:"5016274384",   // ⚠️ confirm Sage's texting #
  since:1998, area:"Hot Springs & Central Arkansas",
  farm:"27 Crain Lane, Plainview, AR",   // sod delivery origin (Derrick 08-29)
  // Primary service area + luxury travel area (Sage never auto-rejects out of area)
  primaryTowns:["Hot Springs","Hot Springs Village"],
  luxuryTowns:["Russellville","Conway","Little Rock","Benton","Bryant"]
};
// SOD rules — EDITABLE settings (Derrick's real pricing)
var SOD = {
  sqftPerPallet:450,          // industry standard; confirm with Derrick
  pricePerPallet:250,         // $ per pallet, before tax
  taxRate:null,               // Derrick: NO flat rate — AR tax calc by delivery address (state+county+city). Address-based lookup wired in Phase 3.
  baseDelivery:300,           // flat delivery for within-radius, up to pallet limit
  freeRadiusMiles:30,         // base delivery covers this radius from the farm
  perMileBeyond:4,            // $ per additional one-way mile beyond the radius
  palletLimit:8               // >this many pallets → escalate to Derrick
};
window.BIZ = BIZ; window.SOD = SOD;

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

/* ---------- Live conversation store (shared with owner dashboard) ----------
   Every customer chat is logged turn-by-turn so Derrick can watch live, get
   pinged on new customers, and TAKE OVER any conversation at any point.
   control: 'sage' = Sage auto-handles · 'human' = Derrick is talking. */
var CV_KEY="wecare_convos";
function cvLoad(){ try{return JSON.parse(localStorage.getItem(CV_KEY))||{}}catch(e){return {}} }
function cvSave(all){ try{localStorage.setItem(CV_KEY,JSON.stringify(all))}catch(e){} }
function cvGet(id){ return cvLoad()[id]||null; }
function cvNew(){
  var all=cvLoad();
  var id="C"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
  all[id]={id:id, customer:{}, service:"", msgs:[], control:"sage",
           status:"active", unseen:true, created:new Date().toISOString(), updated:new Date().toISOString()};
  cvSave(all); return id;
}
function cvAppend(id, who, text){          // who: 'sage' | 'customer' | 'owner'
  var all=cvLoad(); var c=all[id]; if(!c)return;
  c.msgs.push({who:who, text:text, ts:new Date().toISOString()});
  c.updated=new Date().toISOString();
  if(who==="customer") c.unseen=true;      // re-flag for owner attention
  cvSave(all);
}
function cvPatch(id, fields){ var all=cvLoad(); var c=all[id]; if(!c)return; Object.assign(c,fields); c.updated=new Date().toISOString(); cvSave(all); }
window.WeCareConvos={load:cvLoad,get:cvGet,neu:cvNew,append:cvAppend,patch:cvPatch,KEY:CV_KEY};

/* ---------- Sod calculator (Derrick's real per-pallet rules) ----------
   Sage quotes MATERIAL + DELIVERY only — never installation.
   Over the pallet limit, or beyond the delivery radius, it escalates. */
function sodEstimate(sqft, milesFromFarm){
  sqft=Math.max(0,Math.round(sqft));
  var pallets=Math.ceil(sqft/SOD.sqftPerPallet) || 0;
  var material=pallets*SOD.pricePerPallet;
  var tax=(SOD.taxRate==null)?null:material*SOD.taxRate;   // null = calc by delivery address
  // delivery: base within radius; +$/mi beyond (only if we know the distance)
  var extraMiles = (milesFromFarm!=null && milesFromFarm>SOD.freeRadiusMiles)
        ? (milesFromFarm - SOD.freeRadiusMiles) : 0;
  var delivery = SOD.baseDelivery + extraMiles*SOD.perMileBeyond;
  var escalate = pallets>SOD.palletLimit;   // >8 pallets → Derrick handles it
  return {
    sqft:sqft, pallets:pallets, coverage:pallets*SOD.sqftPerPallet,
    material:material, tax:tax, delivery:delivery,
    total:material+(tax||0)+delivery, escalate:escalate,
    beyondRadius:(milesFromFarm!=null && milesFromFarm>SOD.freeRadiusMiles)
  };
}
window.sodEstimate=sodEstimate;
function money(n){return "$"+Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0})}

// Wire the on-page calculator if present
function initPageCalc(){
  var form=document.getElementById("sodCalc"); if(!form) return;
  function calc(){
    var mode=form.mode.value, sqft=0;
    if(mode==="area"){ sqft=(parseFloat(form.len.value)||0)*(parseFloat(form.wid.value)||0); }
    else { sqft=parseFloat(form.sqft.value)||0; }
    var e=sodEstimate(sqft), out=document.getElementById("sodOut");
    if(!sqft){ out.innerHTML='<p style="margin:0;color:var(--muted)">Enter your lawn size to see pallets and a price estimate.</p>'; return; }
    if(e.escalate){
      out.innerHTML=
        '<div class="big">'+e.pallets+' pallets</div>'+
        '<p style="margin:.3rem 0 1rem;color:var(--muted)">covers ~'+e.coverage.toLocaleString()+' sq ft</p>'+
        '<p style="margin:0 0 1rem">That’s a big order — for '+e.pallets+' pallets we’ll set you up with a custom delivery quote and the best pricing.</p>'+
        '<button class="btn btn-leaf btn-sm" onclick="Sage.openWith(\'sod order '+e.sqft+'\')">Get my sod quote →</button>';
      return;
    }
    out.innerHTML=
      '<div class="big">'+e.pallets+' pallet'+(e.pallets>1?'s':'')+' of sod</div>'+
      '<p style="margin:.3rem 0 1rem;color:var(--muted)">covers ~'+e.coverage.toLocaleString()+' sq ft ('+e.sqft.toLocaleString()+' sq ft needed)</p>'+
      '<div class="rowline"><span>Sod material ('+e.pallets+' × '+money(SOD.pricePerPallet)+'/pallet)</span><b>'+money(e.material)+'</b></div>'+
      '<div class="rowline"><span>AR sales tax</span><b>calculated by delivery address</b></div>'+
      '<div class="rowline"><span>Delivery (within '+SOD.freeRadiusMiles+' mi of the farm)</span><b>'+money(e.delivery)+'</b></div>'+
      '<div class="rowline"><span>Subtotal (before tax)</span><b style="color:var(--green-deep)">'+money(e.total)+'</b></div>'+
      '<p style="font-size:.8rem;color:var(--muted);margin:.8rem 0 0">Estimate for sod material + delivery. AR sales tax is added based on your delivery address. Beyond '+SOD.freeRadiusMiles+' mi adds '+money(SOD.perMileBeyond)+'/mile. Installation quoted separately.</p>'+
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

  // quote:true = Sage can give a real number (sod only). quote:false = consultation, never priced.
  var SERVICES=[
    {k:"sod",label:"Sod — farm-fresh, delivered",quote:true,
      kw:["sod","turf","grass pallet","sod farm","lay sod","bermuda","zoysia","fescue","pallet"]},
    {k:"luxury",label:"Luxury Landscapes (design/build)",quote:false,
      kw:["landscape","design","build","patio","retaining","water feature","pond","drainage","irrigation","lighting","outdoor living","renovation","install"]},
    {k:"concrete",label:"Concrete Artistry",quote:false,
      kw:["concrete","carved","sculpt","artistry","faux rock","fire feature","stone","masonry","flagstone","custom wall","bench"]},
    {k:"maintenance",label:"Lawn & Property Care",quote:false,
      kw:["mow","mowing","maintenance","weekly","biweekly","cut grass","lawn care","edging","cleanup","leaves","property"]}
  ];

  function el(cls,html){var d=document.createElement("div");d.className=cls;d.innerHTML=html;return d;}
  function scroll(){msgs.scrollTop=msgs.scrollHeight;}
  function typing(){var t=el("ai-typing","<span></span><span></span><span></span>");t.id="typing";msgs.appendChild(t);scroll();}
  function stopTyping(){var t=document.getElementById("typing");if(t)t.remove();}

  var convoId=null;                         // this customer's live conversation id
  function logTurn(who,text){ if(convoId) window.WeCareConvos.append(convoId,who,text); }
  function isHuman(){ var c=convoId&&window.WeCareConvos.get(convoId); return c&&c.control==="human"; }

  function say(html,cb){
    typing();
    setTimeout(function(){
      stopTyping();
      msgs.appendChild(el("ai-msg bot",html));scroll();
      logTurn("sage", stripTags(html));
      if(cb)cb();
    }, Math.min(900, 350+html.length*8));
  }
  function me(text){msgs.appendChild(el("ai-msg user",escapeHtml(text)));scroll();logTurn("customer",text);}
  function ownerBubble(text){       // a message Derrick sent from the dashboard
    var d=el("ai-msg bot","");d.style.background="var(--green-deep)";d.style.color="#fff";
    d.innerHTML='<b style="font-size:.72rem;opacity:.85;display:block;margin-bottom:2px">Derrick · We Care</b>'+escapeHtml(text);
    msgs.appendChild(d);scroll();
  }
  function stripTags(h){var d=document.createElement("div");d.innerHTML=h;return d.textContent||d.innerText||"";}
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
    // keep the live conversation's customer card up to date so Derrick sees who it is
    if(convoId) window.WeCareConvos.patch(convoId,{customer:{name:data.name,phone:data.phone,address:data.address}, service:data.service||""});
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
      if(e.escalate){ extra="<br><br>That’s about <b>"+e.pallets+" pallets</b> — a nice big order. Derrick will get you a custom delivery quote and the best pricing."; }
      else { extra="<br><br>For ~"+data.sqft.toLocaleString()+" sq ft that’s about <b>"+e.pallets+" pallet"+(e.pallets>1?"s":"")+"</b> — roughly <b>"+money(e.total)+"</b> for material + delivery (estimate; installation quoted separately)."; }
    } else if(data._svcKey && data._svcKey!=="sod"){
      extra="<br><br>It seems like this involves enough design and site-specific work that an in-person consultation would be the most helpful next step. Would it be a bad idea for Derrick to reach out with a couple of times that could work?";
    }
    say("You're all set, "+firstName(data.name)+"! ✅<br><br>I've logged your <b>"+data.service+"</b> request and the team at We Care will reach out to <b>"+escapeHtml(data.phone||"")+"</b> to confirm."+extra+
        "<br><br>Need it faster? Call us directly at <a href='tel:"+BIZ.phoneRaw+"'>"+BIZ.phone+"</a>.",
      function(){
        say("Anything else I can help with?");
        chips([{label:"Estimate sod",value:"svc:sod"},{label:"Concrete Artistry",value:"svc:concrete"},{label:"Talk to Derrick",value:"human"}]);
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
    // Derrick has taken over this chat → Sage stays quiet, he's talking now.
    if(isHuman()){ return; }
    // If in a guided flow, treat input as an answer
    if(flow){ collect(t); return; }

    // sod order shortcut e.g. "sod order 1200"
    var so=q.match(/sod (?:order|quote).*?([\d,]{2,})/);
    if(so){ startFlow("sod",{key:"sod",service:serviceLabel("sod"),sqft:parseInt(so[1].replace(/,/g,""))}); return; }

    // calculator intent
    if(/(how much|how many|calculat|estimate|price|cost).*(sod|turf|grass)/.test(q) || (/(sod|turf).*(price|cost|how much|how many)/.test(q))){
      var num=q.match(/([\d,]{2,})\s*(sq|square|sf|ft)/);
      if(num){var e=sodEstimate(parseInt(num[1].replace(/,/g,"")));
        if(e.escalate){ say("For about <b>"+e.sqft.toLocaleString()+" sq ft</b> that’s roughly <b>"+e.pallets+" pallets</b> — a big order, so Derrick will set you up with a custom delivery quote. Want me to get that started?"); }
        else { say("For about <b>"+e.sqft.toLocaleString()+" sq ft</b> you’d need roughly <b>"+e.pallets+" pallet"+(e.pallets>1?"s":"")+"</b> — around <b>"+money(e.total)+"</b> for material + delivery (estimate; installation separate).<br><br>Want me to set up the order?"); }
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
    if(/(area|serve|location|where|town|near|hot springs|benton|malvern|russellville|conway|little rock)/.test(q)){say("Our home base is <b>"+BIZ.primaryTowns.join(" & ")+"</b>, and for design/build and outdoor-artistry projects we also travel to "+BIZ.luxuryTowns.join(", ")+". Where are you? Even if you're a bit outside, tell me about the project and I'll get it in front of Derrick.");return;}
    if(/(hour|open|when.*open|time)/.test(q)){say("We're out on jobs Mon–Sat. Leave your info here anytime and We Care follows up quickly — often same day.");return;}
    if(/(how long|since|experience|years|established|1998)/.test(q)){say("We Care has served Central Arkansas since <b>"+BIZ.since+"</b> — that's over 25 years of landscaping, masonry, and sod. 🌿");return;}
    if(/(who are you|your name|are you (a )?(bot|robot|ai|human)|sage|ivy)/.test(q)){say("I'm <b>Sage</b>, the We Care assistant 🌱 — I help with sod estimates, luxury landscape &amp; concrete-artistry projects, and lawn care — 24/7. I can hand you to a real person anytime too.");return;}
    if(/(human|person|real|someone|owner|talk to)/.test(q)){startFlow("callback",{key:"callback",service:"Call-back request"});return;}
    if(/(hi|hello|hey|howdy|yo)\b/.test(q)&&q.length<12){menu("Hi there! 👋 I'm Sage. How can I help today?");return;}
    if(/(thank|thanks|appreciate)/.test(q)){say("Anytime! 🌿 Anything else?");return;}

    // ---- hesitation / objections: get MORE curious, never pushy (Derrick's spec) ----
    if(/(too )?expensive|too much|cost too|pricey|out of my|can'?t afford/.test(q)){
      say("It sounds like the investment may be higher than you expected. What were you anticipating it might take?");return;}
    if(/(think about it|need to think|not sure|let me think|gotta think)/.test(q)){
      say("Of course. It seems like there may still be something you're uncertain about. What would be most helpful to think through before you decide?");return;}
    if(/(other (estimate|quote|bid)|shopping around|getting quotes|comparing)/.test(q)){
      say("That makes sense — it sounds like you want to be sure you're comparing the right things. What will matter most to you when you decide which company to use?");return;}
    if(/(not ready|maybe later|down the road|not right now|hold off)/.test(q)){
      say("No problem at all. What would need to happen before scheduling would make sense?");return;}
    if(/(budget|price range|how much.*cost|ballpark)/.test(q) && !/sod|turf/.test(q)){
      say("Projects like this vary quite a bit depending on the stonework, planting, drainage, and custom artistry involved. What kind of investment range were you hoping to stay within? If you're not sure yet, would it be a bad idea for me to explain the typical ranges first?");return;}

    // fallback -> offer menu
    say("I can help you with any of these — which one fits?");
    chips([{label:"🌱 Sod estimate",value:"svc:sod"},{label:"🎨 Concrete Artistry",value:"svc:concrete"},{label:"🏡 Luxury Landscapes",value:"svc:luxury"},{label:"✂️ Lawn & Property Care",value:"svc:maintenance"},{label:"📞 Talk to Derrick",value:"human"}]);
  }

  function menu(intro){
    say(intro||"How can I help you today?",function(){
      chips([{label:"🌱 Estimate sod",value:"svc:sod"},{label:"🎨 Concrete Artistry",value:"svc:concrete"},{label:"🏡 Luxury Landscapes",value:"svc:luxury"},{label:"✂️ Lawn & Property Care",value:"svc:maintenance"},{label:"📞 Talk to Derrick",value:"human"}]);
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
  var _seenOwner=0, _wasHuman=false;
  function open(){
    build();panel.classList.add("open");document.getElementById("ai-launch").style.display="none";
    if(!convoId){ convoId=window.WeCareConvos.neu(); watchOwner(); }   // start a live conversation Derrick can watch/join
    if(!greeted){greeted=true;
      say("Hi, I'm <b>Sage</b> 🌱 — I help folks with their outdoor projects here at We Care. I'd love to hear what you're thinking about. What's got you looking into your property right now?",function(){menu("Or pick a starting point:")});
    }
    setTimeout(function(){inputEl&&inputEl.focus()},300);
  }
  // Poll the shared store: render Derrick's messages + show a banner when he joins/leaves.
  function watchOwner(){
    function tick(){
      var c=convoId&&window.WeCareConvos.get(convoId); if(!c)return;
      // new owner messages?
      var owners=c.msgs.filter(function(m){return m.who==="owner";});
      for(var i=_seenOwner;i<owners.length;i++){ stopTyping(); ownerBubble(owners[i].text); }
      _seenOwner=owners.length;
      // control transitions
      if(c.control==="human" && !_wasHuman){ _wasHuman=true; clearChips();
        var b=el("ai-msg bot","👋 <b>Derrick just joined the chat</b> and will take it from here."); b.style.background="var(--sand)";msgs.appendChild(b);scroll(); }
      if(c.control==="sage" && _wasHuman){ _wasHuman=false;
        var b2=el("ai-msg bot","🌱 Sage here again — how else can I help?"); b2.style.background="var(--sand)";msgs.appendChild(b2);scroll(); }
    }
    window.addEventListener("storage",function(e){ if(e.key===window.WeCareConvos.KEY) tick(); });
    setInterval(tick, 1500);   // also poll (same-tab changes don't fire 'storage')
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
