/* WeCare Landscapes — site logic
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
  name:"WeCare Landscapes",
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
    if(window.track) window.track("sod_calc_used",{sqft:sqft,pallets:e.pallets});
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
    d.innerHTML='<b style="font-size:.72rem;opacity:.85;display:block;margin-bottom:2px">Derrick · WeCare Landscapes</b>'+escapeHtml(text);
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
    say("You're all set, "+firstName(data.name)+"! ✅<br><br>I've logged your <b>"+data.service+"</b> request and the team at WeCare Landscapes will reach out to <b>"+escapeHtml(data.phone||"")+"</b> to confirm."+extra+
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

  // ---- Sage's real brain: the server-side LLM function (Gemini + full spec) ----
  var SAGE_FN="https://fqqbzsxvxpcfwovbunth.supabase.co/functions/v1/sage";
  var llmHist=[];
  var _leadSaved=false, _leadId="";
  function maybeCaptureLead(){
    if(_leadSaved) return;
    var text=llmHist.filter(function(m){return m.role==="user";}).map(function(m){return m.content;}).join("  ");
    var phone=(text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)||[])[0];
    if(!phone) return;                       // no contact yet → nothing to file
    var name=""; var nm=text.match(/\b(?:i'?m|i am|my name'?s|my name is|this is|it'?s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if(nm) name=nm[1];
    var email=(text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)||[])[0]||"";
    var svc="General inquiry", low=text.toLowerCase();
    if(/concrete|carved|sculpt/.test(low))svc="Concrete Artistry";
    else if(/sod|turf/.test(low))svc="Sod";
    else if(/drain|erosion|flood|washout/.test(low))svc="Drainage";
    else if(/water feature|pond|waterfall/.test(low))svc="Water feature";
    else if(/patio|hardscape|stone|wall|paver/.test(low))svc="Hardscape";
    else if(/irrigation|sprinkler/.test(low))svc="Irrigation";
    else if(/mow|maintenance|lawn care|cleanup/.test(low))svc="Lawn & Property Care";
    else if(/design|landscap|install|renovat/.test(low))svc="Landscape design/build";
    var detail=llmHist.filter(function(m){return m.role==="user";}).slice(-3).map(function(m){return m.content;}).join(" · ");
    var saved=window.WeCareLeads.save({name:name||"Website visitor", phone:phone, email:email, service:svc,
      detail:detail.slice(0,300), source:"Sage chat", stage:"New"});
    _leadId=(saved&&saved.id)||"";
    if(convoId) window.WeCareConvos.patch(convoId,{customer:{name:name||"",phone:phone,email:email}, service:svc});
    _leadSaved=true;
  }
  function sodContextFrom(t){
    var m=t.match(/([\d,]{3,})\s*(?:sq|square|sf|ft)/i), sq=0;
    if(m) sq=parseInt(m[1].replace(/,/g,""));
    else { var d=t.match(/(\d{1,4})\s*(?:x|by|×)\s*(\d{1,4})/i); if(d) sq=(+d[1])*(+d[2]); }
    if(!sq || sq<50) return "";
    var e=sodEstimate(sq);
    if(e.escalate) return sq+" sq ft = "+e.pallets+" pallets (OVER the 8-pallet limit → do NOT quote a total; say Derrick will set up a custom delivery quote).";
    return sq+" sq ft = "+e.pallets+" pallet(s): material "+money(e.material)+" + delivery "+money(e.delivery)+" (within 30mi) + AR sales tax by delivery address. Material+delivery only; installation quoted separately.";
  }
  var _booked=false;
  function maybeBook(reply){
    // Sage emits [[BOOK]]{json} when it has booked a consultation. Strip the marker and
    // return the record so answer() can save it with CONFIRMATION — we must never tell a
    // customer "you're booked" unless the write actually landed.
    var m=reply.match(/\[\[BOOK\]\]\s*(\{[\s\S]*?\})/);
    if(!m) return {clean:reply, rec:null};
    var clean=reply.replace(m[0],"").trim();
    if(_booked) return {clean:clean, rec:null};    // one booking per chat
    try{
      var o=JSON.parse(m[1]);
      if(o && (o.name||o.phone)){
        _booked=true;
        return {clean:clean, rec:{id:"C"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),name:o.name||"",phone:o.phone||"",email:o.email||"",
          service:o.service||"",address:o.address||"",date:o.date||"",time:o.time||"",
          notes:o.notes||"",status:"requested",source:"Sage (AI chat)",leadId:_leadId||"",created:new Date().toISOString()}};
      }
    }catch(e){}
    return {clean:clean, rec:null};
  }
  function answer(t){
    if(isHuman()) return;                        // Derrick took over → Sage stays quiet
    llmHist.push({role:"user",content:t});
    typing();
    fetch(SAGE_FN,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:llmHist.slice(-14), sodContext:sodContextFrom(t), pageContext:(window.SAGE_PAGE||"")})})
      .then(function(r){return r.json();})
      .then(function(d){
        stopTyping();
        var reply=(d&&d.reply)?d.reply:"";
        if(!reply) reply="I want to make sure I get this right for you — the best next step is a quick word with Derrick. What's a good name and number, and I'll have him reach out? Or call us at "+BIZ.phone+".";
        maybeCaptureLead();                        // capture the lead first so a booking can link to it
        var bk=maybeBook(reply); reply=bk.clean;   // then handle any consultation booking (linked via leadId), strip marker
        llmHist.push({role:"assistant",content:reply});
        var b=el("ai-msg bot", escapeHtml(reply).replace(/\n/g,"<br>"));
        msgs.appendChild(b); scroll(); logTurn("sage",reply);
        if(bk.rec){                                // CONFIRM the booking write; if it fails, don't leave the customer thinking they're booked
          WeCareCloud.save("wecare_consults", bk.rec).then(function(okSaved){
            if(!okSaved){
              _booked=false;                       // allow a retry later in the chat
              var warn="Quick heads-up — I had a hiccup saving that on my end. So you don't slip through the cracks, please call or text us at "+BIZ.phone+" and mention "+(bk.rec.service||"your project")+" and I'll make sure Derrick has it.";
              llmHist.push({role:"assistant",content:warn});
              var w=el("ai-msg bot", escapeHtml(warn).replace(/\n/g,"<br>"));
              msgs.appendChild(w); scroll(); logTurn("sage",warn);
            }
          });
        }
      })
      .catch(function(){
        stopTyping();
        var b=el("ai-msg bot","I'm having a little trouble connecting right now — you can reach WeCare Landscapes directly at "+BIZ.phone+" and we'll take great care of you. 🌿");
        msgs.appendChild(b); scroll();
      });
  }

  function menu(intro){
    say(intro||"How can I help you today?",function(){
      chips([{label:"🌱 Estimate sod",value:"svc:sod"},{label:"🎨 Concrete Artistry",value:"svc:concrete"},{label:"🏡 Luxury Landscapes",value:"svc:luxury"},{label:"✂️ Lawn & Property Care",value:"svc:maintenance"},{label:"📞 Talk to Derrick",value:"human"}]);
    });
  }

  function handle(value,display){
    clearChips();
    var label=display||value;
    if(display)me(display); else me(value);
    // chips are quick-starts → turn them into a natural message for Sage's LLM brain
    var msgText=label;
    if(value.indexOf("svc:")===0){
      var k=value.slice(4);
      var m={sod:"I'm interested in sod.",luxury:"I'm interested in a landscape design/build project.",
             concrete:"I'm interested in custom carved concrete work.",maintenance:"I'm interested in lawn & property maintenance."};
      msgText=m[k]||serviceLabel(k);
    } else if(value==="human"){ msgText="I'd like to talk to Derrick / have a real person reach out."; }
    answer(msgText);
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
      '<div class="ai-hd"><div class="av">🌱</div><div class="t"><b>Sage · WeCare Landscapes</b><span>Online — replies instantly</span></div><button class="x" aria-label="close">×</button></div>'+
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
    if(window.track && !convoId) window.track("sage_opened",{page:window.SAGE_PAGE||""});
    if(!convoId){ convoId=window.WeCareConvos.neu(); watchOwner(); }   // start a live conversation Derrick can watch/join
    if(!greeted){greeted=true;
      say("Hi, I'm <b>Sage</b> 🌱 — I help folks with their outdoor projects here at WeCare Landscapes. I'd love to hear what you're thinking about. What's got you looking into your property right now?",function(){menu("Or pick a starting point:")});
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
