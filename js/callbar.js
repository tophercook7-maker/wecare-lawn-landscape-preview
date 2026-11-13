/* callbar.js — a Call button that stays on screen on every public page.
   Added 11-12: the October report showed 0 call taps; the only floating button was the chatbot. */
(function(){
  if(document.getElementById("wc-call"))return;
  var a=document.createElement("a");
  a.id="wc-call"; a.href="tel:5016274384"; a.setAttribute("aria-label","Call We Care Landscapes at 501-627-4384");
  a.innerHTML='<span aria-hidden="true">📞</span> <b>Call Derrick</b><span class="wc-num"> · 501-627-4384</span>';
  var s=document.createElement("style");
  s.textContent="#wc-call{position:fixed;left:16px;bottom:22px;z-index:101;display:flex;align-items:center;gap:8px;"+
    "background:#1f5d3a;color:#fff;text-decoration:none;font:600 16px/1 Inter,-apple-system,Arial,sans-serif;"+
    "padding:15px 20px;border-radius:999px;border:2px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,.28)}"+
    "#wc-call:hover{background:#17482d}"+
    "@media(max-width:520px){#wc-call .wc-num{display:none}#wc-call{left:12px;bottom:16px;padding:14px 18px}}"+
    "@media print{#wc-call{display:none}}";
  document.head.appendChild(s);
  (document.body?Promise.resolve():new Promise(function(r){document.addEventListener("DOMContentLoaded",r)})).then(function(){
    document.body.appendChild(a);
  });
})();
