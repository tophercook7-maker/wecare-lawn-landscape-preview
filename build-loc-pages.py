#!/usr/bin/env python3
"""Regenerate the per-city location pages with distinct, ACCURATE content.
Fixes the near-duplicate 'doorway page' problem and the inaccurate 'maintenance
everywhere' claim (recurring maintenance is Hot Springs & Hot Springs Village only)."""
import html

# Per-city facts. Only real, defensible geography — no invented business claims.
CITIES = {
 "hot-springs": dict(
    name="Hot Springs", county="Garland County", maint=True, sod="local",
    h1="Landscape design, concrete artistry &amp; sod in Hot Springs",
    intro="Hot Springs is home for us. WeCare Landscapes has worked in and around the lake-and-spa city since 1998 — design-build, carved concrete artistry, sod from our own farm, drainage, and dependable grounds care.",
    serves="Hot Springs is our home base, so you get the full range: complete design-build projects, our signature carved concrete artistry, farm-grown sod, drainage work, and recurring grounds care.",
    sod_line="Farm-grown sod, delivered and installed right here in Hot Springs."),
 "hot-springs-village": dict(
    name="Hot Springs Village", county="the Hot Springs Village area", maint=True, sod="local",
    h1="Landscaping &amp; outdoor artistry in Hot Springs Village",
    intro="Hot Springs Village's hillside lots, wooded properties, and community grounds are a big part of what we do. WeCare brings full design-build, carved concrete artistry, sod, drainage, and recurring grounds care to the Village.",
    serves="In Hot Springs Village we handle the whole range — design-build transformations, carved concrete features, sod, drainage on sloped and wooded lots, and recurring grounds care.",
    sod_line="Farm-grown sod delivered and installed across Hot Springs Village."),
 "benton": dict(
    name="Benton", county="Saline County", maint=False, sod="range",
    h1="Landscape design-build &amp; outdoor artistry in Benton",
    intro="Benton is a growing Saline County community we reach easily from our Hot Springs base for design and installation work — complete outdoor transformations, carved concrete artistry, sod, drainage, and hardscape.",
    serves="In Benton we focus on design-build projects and installations: complete landscape transformations, carved concrete artistry, sod, drainage correction, water features, and hardscape.",
    sod_line="Farm-grown sod delivered to Benton and Saline County."),
 "bryant": dict(
    name="Bryant", county="Saline County", maint=False, sod="range",
    h1="Landscape design, sod &amp; outdoor projects in Bryant",
    intro="Bryant's fast growth means a lot of newer homes ready for a real outdoor space. WeCare brings design-build, carved concrete artistry, sod, and drainage work to Bryant and the rest of Saline County.",
    serves="In Bryant we take on design-build projects and installs — landscape transformations, carved concrete artistry, sod, drainage, water features, and hardscape for newer and established homes alike.",
    sod_line="Farm-grown sod delivered to Bryant and Saline County."),
 "little-rock": dict(
    name="Little Rock", county="the Little Rock metro", maint=False, sod="ask",
    h1="Landscape design-build &amp; carved concrete in Little Rock",
    intro="We travel to the Little Rock metro for design-build, carved concrete artistry, and larger outdoor projects — the kind of complete transformation that's worth bringing a specialist team in for.",
    serves="In Little Rock we focus on the projects worth traveling for: complete design-build transformations, one-of-a-kind carved concrete artistry, water features, drainage, and hardscape.",
    sod_line="Sod delivery to Little Rock may be beyond our standard radius — ask us for a delivery quote."),
 "conway": dict(
    name="Conway", county="Faulkner County", maint=False, sod="ask",
    h1="Landscape design &amp; carved concrete artistry in Conway",
    intro="We bring design-build and our signature carved concrete artistry to Conway and Faulkner County — full outdoor projects planned and built by one team, worth the trip for the right project.",
    serves="In Conway we take on design-build projects: complete landscape transformations, carved concrete artistry, water features, drainage, and hardscape.",
    sod_line="Sod delivery to Conway may be beyond our standard radius — ask us for a delivery quote."),
 "russellville": dict(
    name="Russellville", county="the Arkansas River Valley (Pope County)", maint=False, sod="very-local",
    h1="Farm-fresh sod &amp; landscape projects in Russellville",
    intro="Russellville sits in the Arkansas River Valley, close to where we grow our sod — so farm-fresh sod is especially local here. We also bring design-build and carved concrete artistry to the River Valley for full outdoor projects.",
    serves="Russellville is close to our sod-growing operation, so sod is especially local here. We also take on design-build projects, carved concrete artistry, drainage, and hardscape in the River Valley.",
    sod_line="We grow our sod near the River Valley, so farm-fresh sod is especially local to Russellville."),
}

SERVICES_BASE = [
  "Luxury landscape design &amp; build",
  "Custom carved concrete artistry",
  "Sod sales, delivery &amp; installation",
  "Drainage &amp; erosion correction",
  "Pondless water features",
  "Hardscape, stonework &amp; patios",
  "Irrigation installation &amp; repair",
]

def maint_note(c):
    if c["maint"]:
        return f'<li>Recurring lawn &amp; property grounds care</li>'
    return ""

def maint_faq(c):
    if c["maint"]:
        return (f'Yes — {c["name"]} is in our core service area, so recurring lawn and grounds care is available here '
                f'along with design-build and everything else.')
    return (f'Our recurring maintenance routes are focused on the Hot Springs &amp; Hot Springs Village area. '
            f'In {c["name"]} we focus on design-build, carved concrete artistry, sod, and project work — '
            f'reach out and we\'ll tell you exactly what we can do for your property.')

TEMPLATE = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Landscaping in {name}, AR | Design-Build, Concrete Artistry &amp; Sod | WeCare Landscapes</title>
<meta name="description" content="{meta}">
<link rel="canonical" href="https://wecarelandscapes.expert/loc-{slug}.html">
<meta property="og:title" content="Landscaping in {name}, AR | WeCare Landscapes"><meta property="og:description" content="{meta}">
<meta property="og:image" content="https://wecarelandscapes.expert/img/proj-transform-after-1.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="img/mark.png"><link rel="stylesheet" href="css/style.css">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Service","name":"Landscaping in {name}","provider":{{"@type":"LocalBusiness","name":"WeCare Landscapes","telephone":"+1-501-627-4384","url":"https://wecarelandscapes.expert/"}},"areaServed":{{"@type":"City","name":"{name}, AR"}},"url":"https://wecarelandscapes.expert/loc-{slug}.html"}}</script>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{{"@type":"Question","name":"Does WeCare Landscapes serve {name}?","acceptedAnswer":{{"@type":"Answer","text":"{faq1}"}}}},{{"@type":"Question","name":"Is recurring lawn maintenance available in {name}?","acceptedAnswer":{{"@type":"Answer","text":"{faq2}"}}}},{{"@type":"Question","name":"How do I get a quote in {name}?","acceptedAnswer":{{"@type":"Answer","text":"Chat with Sage on this page or call 501-627-4384. For custom work we set up a consultation; for sod you can get an instant estimate with the sod calculator."}}}}]}}</script>
</head><body>
<header class="nav"><div class="wrap nav-in">
  <a class="brand" href="index.html"><img src="img/logo.png" alt="WeCare Landscapes"> WeCare Landscapes</a>
  <nav class="nav-links">
    <a href="luxury-landscapes.html">Landscapes</a><a href="sod.html">Sod Farm</a><a href="commercial-grounds-care.html">Grounds Care</a><a href="case-studies.html">Our Work</a><a href="about.html">About</a>
  </nav>
  <div class="nav-cta"><span class="nav-phone">📞 501-627-4384</span>
    <button class="btn btn-primary btn-sm" onclick="Sage.open()">Ask Sage</button></div>
</div></header>

<section class="section" style="padding-top:56px">
  <div class="wrap" style="max-width:820px">
    <p class="eyebrow">Serving {name} · {county}</p>
    <h1 style="font-size:clamp(2rem,5vw,3rem)">{h1}</h1>
    <p class="lead" style="margin-top:12px">{intro}</p>
    <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap">
      <a class="btn btn-leaf" href="book.html">Request a consultation</a>
      <a class="btn btn-outline" href="tel:5016274384">📞 501-627-4384</a>
    </div>
  </div>
</section>

<section class="section"><div class="wrap" style="max-width:820px">
  <p class="eyebrow">What we bring to {name}</p>
  <h2>Your outdoor team in {name}</h2>
  <p class="lead" style="max-width:70ch">{serves}</p>
  <ul style="font-size:1.02rem;color:var(--body);line-height:1.9">
    {services}
    {maint_li}
  </ul>
  <p style="color:var(--muted)">🌱 {sod_line}</p>
  {maint_scope}
</div></section>

<section class="section bg-sand"><div class="wrap" style="max-width:820px">
  <p class="lead" style="max-width:70ch">WeCare Landscapes is a service-area business based near Hot Springs, serving {name} and {county}. Family-owned since 1998 — the same team designs, builds, and (in our core area) maintains, so your project holds together and holds up.</p>
</div></section>

<section class="section"><div class="wrap" style="max-width:760px">
  <p class="eyebrow center" style="text-align:center">Good questions</p>
  <h2 class="center" style="text-align:center;margin-bottom:32px">{name} answers</h2>
  <div class="card reveal" style="padding:18px 22px;margin-bottom:12px"><h3 style="margin:0 0 6px">Does WeCare Landscapes serve {name}?</h3><p style="margin:0;color:var(--body)">{faq1}</p></div>
  <div class="card reveal" style="padding:18px 22px;margin-bottom:12px"><h3 style="margin:0 0 6px">Is recurring lawn maintenance available in {name}?</h3><p style="margin:0;color:var(--body)">{faq2}</p></div>
  <div class="card reveal" style="padding:18px 22px;margin-bottom:12px"><h3 style="margin:0 0 6px">How do I get a quote in {name}?</h3><p style="margin:0;color:var(--body)">Chat with Sage on this page or call 501-627-4384. For custom work we set up a consultation; for sod you can get an instant estimate with our <a href="sod.html">sod calculator</a>.</p></div>
</div></section>

<section class="section bg-deep"><div class="wrap center" style="text-align:center;color:#eaf3ee">
  <h2 style="color:#fff">Let's talk about your {name} project</h2>
  <p class="lead center" style="margin:10px auto 22px;color:#cfe4d6">Tell us what you're thinking, or call.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
    <a class="btn btn-leaf" href="book.html">Request a consultation</a>
    <a class="btn btn-ghost" href="tel:5016274384">📞 501-627-4384</a>
  </div>
</div></section>

<footer><div class="wrap"><div class="foot-bot" style="justify-content:center">
  <span>© 2026 WeCare Landscapes · Hot Springs &amp; Central Arkansas · <a href="index.html">Home</a> · <a href="about.html">About</a></span>
</div></div></footer>
<script src="js/wecare-cloud.js?v=0843"></script>
<script src="js/app.js?v=0838"></script>
</body></html>
"""

def build():
    for slug, c in CITIES.items():
        services = "\n    ".join(f"<li>{s}</li>" for s in SERVICES_BASE)
        meta = (f"WeCare Landscapes serves {c['name']}, AR with landscape design-build, carved concrete artistry, "
                f"farm-grown sod, and drainage. Family-owned in Central Arkansas since 1998.")
        maint_scope = ""
        if not c["maint"]:
            maint_scope = (f'<p style="background:var(--sand-2,#eef1ee);border:1px solid var(--line);border-radius:10px;'
                           f'padding:12px 16px;color:var(--body);font-size:.95rem">Note: our recurring lawn &amp; grounds '
                           f'care routes are focused on the Hot Springs &amp; Hot Springs Village area. In {c["name"]} we '
                           f'focus on design-build, sod, and project work — ask us about ongoing care and we\'ll be straight '
                           f'with you about what we can commit to.</p>')
        faq1 = (f"Yes — WeCare Landscapes serves {c['name']} and {c['county']}. {c['serves']}").replace('"', '\\"')
        faq2 = maint_faq(c).replace('"', '\\"')
        page = TEMPLATE.format(
            slug=slug, name=c["name"], county=c["county"], h1=c["h1"], intro=c["intro"],
            serves=c["serves"], services=services, maint_li=maint_note(c), sod_line=c["sod_line"],
            maint_scope=maint_scope, meta=meta, faq1=faq1, faq2=faq2)
        with open(f"loc-{slug}.html", "w") as f:
            f.write(page)
        print(f"wrote loc-{slug}.html  (maintenance={c['maint']})")

if __name__ == "__main__":
    build()
