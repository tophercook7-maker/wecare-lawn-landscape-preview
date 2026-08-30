/* We Care — staged auth layer (Supabase Auth, passwordless magic-link, pure fetch).
   SAFE BY DEFAULT: REQUIRE_LOGIN is false, so guard() is a no-op and NOTHING changes
   for the current pilot. When Derrick is ready to go live:
     1) set REQUIRE_LOGIN = true below (and redeploy),
     2) in Supabase → Authentication → URL Config, set Site URL to
        https://wecarelandscapes.expert and add /login.html to redirects,
     3) create the owner/admin users (Derrick + Brandi) in Supabase → Authentication,
     4) run security/rls-lockdown.sql to switch tables from anon-open to authed-only.
   Until all four are done, leave REQUIRE_LOGIN = false. */
(function(){
"use strict";
var REQUIRE_LOGIN = false;   // <-- master switch. false = pilot mode, no gate.

var URL_="https://fqqbzsxvxpcfwovbunth.supabase.co";
var ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcWJ6c3h2eHBjZndvdmJ1bnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNDAwOTIsImV4cCI6MjEwMzYxNjA5Mn0.a62fuRJ19sEGxRN2KtvPkDvS_Ff-NuiYKZAxTZg4Tqg";
var AUTH=URL_+"/auth/v1/";
var LS="wecare_session";   // {access_token, refresh_token, expires_at, email}

function readSession(){ try{return JSON.parse(localStorage.getItem(LS)||"null");}catch(e){return null;} }
function writeSession(s){ if(s) localStorage.setItem(LS, JSON.stringify(s)); else localStorage.removeItem(LS); }
function valid(s){ return !!(s && s.access_token && s.expires_at && (s.expires_at*1000) > Date.now()); }

/* On any page load: capture tokens Supabase appended to the URL hash after a magic-link click. */
function captureRedirect(){
  if(!location.hash || location.hash.indexOf("access_token")<0) return false;
  var p={}; location.hash.replace(/^#/,"").split("&").forEach(function(kv){
    var i=kv.indexOf("="); if(i>0) p[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1));
  });
  if(p.access_token){
    var exp = Math.floor(Date.now()/1000) + (parseInt(p.expires_in,10)||3600);
    writeSession({access_token:p.access_token, refresh_token:p.refresh_token||"", expires_at:exp, email:""});
    // fetch the user's email for display, then clean the URL
    fetch(AUTH+"user",{headers:{apikey:ANON,Authorization:"Bearer "+p.access_token}})
      .then(function(r){return r.json();}).then(function(u){
        var s=readSession(); if(s){ s.email=(u&&u.email)||""; writeSession(s); }
      }).catch(function(){});
    try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
    return true;
  }
  return false;
}

function sendMagicLink(email){
  return fetch(AUTH+"otp",{
    method:"POST",
    headers:{apikey:ANON,"Content-Type":"application/json"},
    body:JSON.stringify({email:email, create_user:false,
      options:{email_redirect_to: location.origin+"/dashboard.html"}})
  }).then(function(r){ return r.ok ? {ok:true} : r.json().then(function(e){return {ok:false,error:(e&&(e.msg||e.error_description||e.message))||"Could not send link"};}); });
}

function signOut(){ writeSession(null); }

/* guard(): call at top of a protected page. No-op unless REQUIRE_LOGIN is on. */
function guard(opts){
  opts=opts||{};
  captureRedirect();
  if(!REQUIRE_LOGIN) return true;              // pilot mode: never blocks
  if(valid(readSession())) return true;
  var back=encodeURIComponent(location.pathname.replace(/^\//,""));
  location.replace("login.html?next="+back);
  return false;
}

window.WeCareAuth={
  requireLogin:REQUIRE_LOGIN, sendMagicLink:sendMagicLink, signOut:signOut,
  guard:guard, user:function(){var s=readSession(); return valid(s)?s:null;},
  captureRedirect:captureRedirect
};
// always capture a returning magic-link, even on pages that don't guard
if(document.readyState!=="loading") captureRedirect();
else document.addEventListener("DOMContentLoaded", captureRedirect);
})();
