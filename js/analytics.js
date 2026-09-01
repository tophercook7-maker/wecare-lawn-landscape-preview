/* WeCare Landscapes — measurement + conversion tracking.
 *
 * ▶ TO ACTIVATE: Derrick creates a Google Analytics 4 property (analytics.google.com),
 *   copies its Measurement ID (looks like "G-XXXXXXXXXX"), and pastes it below.
 *   Until then this file is INERT — it wires up every conversion event but sends nothing,
 *   so there's no half-broken tracking and nothing to clean up later.
 *
 * Events wired automatically on every page that loads this file:
 *   tap_to_call, lead_submit (consultation / commercial assessment / contact),
 *   social_click (Facebook / Google profile), sod_calc_used, sage_opened.
 */
(function(){
  var GA4_ID = "";  // ◀◀◀ paste Derrick's "G-XXXXXXXXXX" here to turn tracking on

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (GA4_ID) {
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA4_ID);
  }

  // Single helper the whole site can call. Safe no-op until GA4_ID is set.
  window.track = function(event, params){
    try { gtag("event", event, params || {}); } catch(e){}
  };

  function wire(){
    // tap-to-call
    document.querySelectorAll('a[href^="tel:"]').forEach(function(a){
      a.addEventListener("click", function(){ window.track("tap_to_call", {phone: a.getAttribute("href")}); });
    });
    // lead forms (consultation, commercial assessment, homepage contact)
    document.querySelectorAll("form[data-lead]").forEach(function(f){
      f.addEventListener("submit", function(){
        var svc = (f.querySelector('[name="service"]')||{}).value || f.getAttribute("data-lead") || "";
        window.track("lead_submit", {form: f.getAttribute("data-lead")||"lead", service: svc});
      });
    });
    // social / review profile clicks
    document.querySelectorAll('a[href*="facebook.com"], a[href*="google.com/maps"], a[href*="g.page"], a[href*="instagram.com"]').forEach(function(a){
      a.addEventListener("click", function(){ window.track("social_click", {url: a.getAttribute("href")}); });
    });
  }
  if (document.readyState !== "loading") wire();
  else document.addEventListener("DOMContentLoaded", wire);
})();
