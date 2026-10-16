/* WeCare Landscapes - visit + tap counter for Derrick's monthly report (16 Oct 2026).
 * Counts only, no cookies, nothing about the person: one beacon per page view and per
 * call / text / review / save-contact / form tap, sent to the wecare-lead-backup Worker,
 * which keeps a daily tally. Loaded on public pages and the tap page, never owner pages.
 */
(function(){
  var URL_ = "https://wecare-lead-backup.henryai.workers.dev/hit";
  function hit(e){
    try{
      var body = JSON.stringify({e:e, p:location.pathname});
      if (navigator.sendBeacon) navigator.sendBeacon(URL_, body);
      else fetch(URL_, {method:"POST", body:body, keepalive:true, mode:"no-cors"});
    }catch(x){}
  }
  window.wecareHit = hit;
  var tap = /^\/tap\/?/.test(location.pathname);
  hit(tap ? "view_tap" : "view");
  document.addEventListener("click", function(ev){
    var a = ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/^tel:/.test(h)) hit("call");
    else if (/^sms:/.test(h)) hit("text");
    else if (/g\.page\/r\//.test(h)) hit("review");  // links to /review are counted by review.html itself
    else if (/\.vcf$/.test(h)) hit("contact_saved");
    else if (/google\.com\/maps|maps\.app\.goo/.test(h)) hit("maps");
  }, true);
  document.addEventListener("submit", function(ev){
    if (ev.target && ev.target.matches && ev.target.matches("form")) hit("form");
  }, true);
})();
