#!/usr/bin/env python3
"""Generate We Care service + location pages (unique content, schema, Sage on every page).
Reuses css/style.css. Run: python3 build-pages.py"""
import os, html
ROOT=os.path.dirname(os.path.abspath(__file__))
PHONE="501-627-4384"; PHONERAW="5016274384"; DOMAIN="https://wecarelandscapes.expert"

def esc(s): return html.escape(s, quote=True)

def page(slug, title, desc, hero_eyebrow, hero_h1, hero_sub, body_html, faq, schema_type="Service", schema_name=None):
    faq_ld = ",".join(
        '{{"@type":"Question","name":{q},"acceptedAnswer":{{"@type":"Answer","text":{a}}}}}'.format(
            q=to_json(qq), a=to_json(aa)) for qq,aa in faq)
    faq_html = "".join(
        '<div class="card reveal" style="padding:18px 22px;margin-bottom:12px"><h3 style="margin:0 0 6px">{q}</h3><p style="margin:0;color:var(--body)">{a}</p></div>'.format(q=esc(qq),a=esc(aa))
        for qq,aa in faq)
    svc_ld = ('{{"@context":"https://schema.org","@type":"{st}","name":{nm},"provider":{{"@type":"LocalBusiness","name":"We Care","telephone":"+1-501-627-4384","url":"{d}/"}},"areaServed":"Central Arkansas","url":{u}}}'
              .format(st=schema_type, nm=to_json(schema_name or hero_h1), d=DOMAIN, u=to_json(DOMAIN+"/"+slug)))
    return TEMPLATE.format(
        slug=slug, title=esc(title), desc=esc(desc), canon=DOMAIN+"/"+slug,
        eyebrow=esc(hero_eyebrow), h1=esc(hero_h1), sub=esc(hero_sub),
        body=body_html, faq=faq_html, svc_ld=svc_ld, faq_ld=faq_ld, phone=PHONE, phoneraw=PHONERAW)

def to_json(s):
    import json; return json.dumps(s)

TEMPLATE=r'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} | We Care · Hot Springs AR</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canon}">
<meta property="og:title" content="{title} | We Care"><meta property="og:description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="img/mark.png"><link rel="stylesheet" href="css/style.css">
<script type="application/ld+json">{svc_ld}</script>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{faq_ld}]}}</script>
</head><body>
<header class="nav"><div class="wrap nav-in">
  <a class="brand" href="index.html"><img src="img/logo.png" alt="We Care"> We Care</a>
  <nav class="nav-links">
    <a href="index.html#sod">Sod Farm</a><a href="index.html#maintenance">Lawn Care</a>
    <a href="index.html#landscape">Design &amp; Build</a><a href="index.html#portfolio">Our Work</a><a href="index.html#contact">Contact</a>
  </nav>
  <div class="nav-cta"><span class="nav-phone">📞 {phone}</span>
    <button class="btn btn-primary btn-sm" onclick="Sage.open()">Ask Sage</button></div>
</div></header>

<section class="section" style="padding-top:56px">
  <div class="wrap" style="max-width:820px">
    <p class="eyebrow">{eyebrow}</p>
    <h1 style="font-size:clamp(2rem,5vw,3rem)">{h1}</h1>
    <p class="lead" style="margin-top:12px">{sub}</p>
    <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn btn-leaf" onclick="Sage.open()">🌱 Ask Sage about this</button>
      <a class="btn btn-outline" href="tel:{phoneraw}">📞 {phone}</a>
    </div>
  </div>
</section>

{body}

<section class="section bg-sand"><div class="wrap" style="max-width:760px">
  <p class="eyebrow center" style="text-align:center">Good questions</p>
  <h2 class="center" style="text-align:center;margin-bottom:32px">Answers</h2>
  {faq}
</div></section>

<section class="section"><div class="wrap center" style="text-align:center">
  <h2>Let's talk about your project</h2>
  <p class="lead center" style="margin:10px auto 22px">Tell Sage what you're thinking, or call — family-run in Central Arkansas since 1998.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
    <button class="btn btn-leaf" onclick="Sage.open()">🌱 Chat with Sage</button>
    <a class="btn btn-primary" href="tel:{phoneraw}">📞 {phone}</a>
  </div>
</div></section>

<footer><div class="wrap"><div class="foot-bot" style="justify-content:center">
  <span>© 1998–2026 We Care · Hot Springs &amp; Central Arkansas · <a href="index.html">Home</a></span>
</div></div></footer>
<script src="js/wecare-cloud.js"></script>
<script src="js/app.js"></script>
</body></html>'''

def sec(eyebrow, h2, inner, bg=""):
    return ('<section class="section {bg}"><div class="wrap" style="max-width:820px">'
            '{ey}{h}{inner}</div></section>').format(
        bg=bg, ey=('<p class="eyebrow">'+esc(eyebrow)+'</p>' if eyebrow else ''),
        h=('<h2>'+esc(h2)+'</h2>' if h2 else ''), inner=inner)

def bullets(items):
    return '<ul style="font-size:1.02rem;color:var(--body);line-height:1.9">'+"".join('<li>'+esc(i)+'</li>' for i in items)+'</ul>'

def p(text): return '<p class="lead" style="max-width:70ch">'+esc(text)+'</p>'

# ---------------- SERVICES ----------------
SERVICES=[
 dict(slug="carved-concrete-artistry.html", title="Custom Carved Concrete Artistry",
   desc="Hand-carved, sculpted decorative concrete in Hot Springs & Central Arkansas — realistic faux rock, tree-stump features, fire & water surrounds, and one-of-a-kind artistic concrete built into your landscape.",
   eyebrow="Concrete Artistry — our signature", h1="Carved concrete that looks like it grew there",
   sub="This is what sets We Care apart. Owner Derrick Collier hand-carves and sculpts concrete into realistic stone, faux rock, and artistic features you won't find anywhere else in Central Arkansas.",
   body=sec("What it is","Art, poured and carved by hand",
        p("Most companies pour flat concrete. We carve it. Starting from a solid form, Derrick sculpts and finishes concrete into pieces that read as natural stone, weathered wood, or original art — a tree-stump feature that looks real enough to touch, a boulder that was never quarried, a fire surround shaped to your space.")+
        bullets(["Hand-carved & sculpted concrete features","Realistic faux rock and boulders","Concrete tree-stumps, benches, and garden art",
                 "Fire-feature and water-feature surrounds","Custom walls and one-of-a-kind artistic elements","Integrated into a complete landscape design"]))
      +sec("What makes it different","One-of-a-kind, by the owner's own hand",
        p("Because it's true artistry, no two projects are alike — and it's Derrick's own craft, not subcontracted. That's why it becomes the centerpiece people remember, and it's why we can build the artwork directly into a larger landscape instead of competing on plain, traditional work."), bg="bg-sand"),
   faq=[("Who does custom carved concrete in Hot Springs, Arkansas?",
         "We Care does — it's our signature specialty. Owner Derrick Collier hand-carves and sculpts concrete into faux rock, tree-stump features, fire and water surrounds, and one-of-a-kind artistic pieces across Hot Springs and Central Arkansas."),
        ("Is carved concrete just stamped concrete?",
         "No. Stamped concrete presses a pattern into a flat pour. Carved concrete is sculpted and finished by hand into three-dimensional, realistic shapes — closer to sculpture than to a patio surface."),
        ("Can the concrete artwork be part of a bigger landscape project?",
         "Yes — that's how we prefer to work. The carved concrete becomes the focal point inside a full landscape design, alongside stonework, planting, drainage, and lighting.")],
   schema_name="Custom Carved Concrete Artistry"),

 dict(slug="landscape-design-build.html", title="Landscape Design & Build",
   desc="Luxury landscape design and installation in Hot Springs, Hot Springs Village & Central Arkansas — complete outdoor transformations, from concept to finished, by We Care.",
   eyebrow="Luxury Landscapes", h1="Design-build landscapes, start to finish",
   sub="One team designs it, builds it, and stands behind it — so your whole outdoor space works together instead of feeling pieced-together.",
   body=sec("What we do","Complete outdoor transformations",
        p("We handle the whole project: understanding how you want to use the space, designing it, and building every part of it ourselves. That means the stonework, the planting, the water, the lighting, and the artistry all speak the same language.")+
        bullets(["Full landscape design & installation","Outdoor living spaces","Stonework, boulders, and hardscape",
                 "Water features and lighting","Planting design and bed renovation","Carved concrete artistry integration"]))
      +sec("How it works","A process, not a guess",
        p("We start by learning the property and what you want it to feel like, then design around that — and because we self-perform the work, the finished result matches the plan. Larger projects generally start around $5,000, and every design-build begins with a consultation."), bg="bg-sand"),
   faq=[("Who are the best landscape design and build companies in Hot Springs?",
         "We Care offers full landscape design and build across Hot Springs, Hot Springs Village, and Central Arkansas — family-run since 1998, self-performing the design, stonework, planting, water, and lighting."),
        ("Do you design and build, or just one?",
         "Both. We're a design-build company — the same team designs your landscape and installs it, so nothing gets lost between a designer and a separate crew."),
        ("What does a landscape project cost?",
         "It varies a lot with the stonework, planting, drainage, and artistry involved. Higher-end design-build projects generally start around $5,000. We'll give you a real number after a consultation.")]),

 dict(slug="sod-sales-delivery-installation.html", title="Sod Sales, Delivery & Installation",
   desc="Farm-fresh sod in Central Arkansas — sod sales, delivery, and installation from We Care's own sod farm. Instant sod estimate online.",
   eyebrow="Our Sod Farm", h1="Farm-fresh sod, delivered and installed",
   sub="We grow it, cut it, and get it to you — pickup, delivery, or fully installed. Fresher than the box store, and priced by the pallet.",
   body=sec("Why our sod","From our farm to your yard",
        p("Because We Care runs its own sod farm, your grass is cut fresh and handled by the same team that can install and maintain it after. You get a straight answer on price, and sod that's ready to root.")+
        bullets(["Farm-fresh sod, cut to order","Pickup, delivery, or full installation","Priced by the pallet — instant estimate on our site",
                 "Delivery across Central Arkansas","Prep, laying, and rolling available","Backed by a team that also maintains lawns"]))
      +'<section class="section bg-sand"><div class="wrap center" style="text-align:center"><h2>Get an instant sod estimate</h2><p class="lead center" style="margin:10px auto 20px">Enter your lawn size on the home page and Sage will give you a pallet count and price on the spot.</p><a class="btn btn-leaf" href="index.html#sodcalc">Open the sod calculator →</a></div></section>',
   faq=[("Where can I get sod delivered near Hot Springs, Arkansas?",
         "We Care grows its own sod and delivers across Central Arkansas, with pickup, delivery, and installation available. You can get an instant sod estimate on our website."),
        ("How is sod priced?",
         "Sod is priced by the pallet, plus delivery and applicable Arkansas sales tax based on your delivery address. Our online calculator gives you an instant estimate; larger orders get a custom delivery quote."),
        ("Do you install the sod too?",
         "Yes — we offer delivery only or full installation including prep, laying, and rolling. Installation is quoted separately from the material.")]),

 dict(slug="drainage-erosion-correction.html", title="Drainage & Erosion Correction",
   desc="Yard drainage and erosion solutions in Hot Springs & Central Arkansas — French drains, catch basins, re-grading, and erosion control by We Care.",
   eyebrow="Drainage Solutions", h1="Stop the washout and standing water",
   sub="Water in the wrong place ruins lawns, floods yards, and undermines everything you build. We move it where it belongs — and make the fix look good.",
   body=sec("What we fix","Drainage done right, then hidden",
        p("Standing water, soggy spots, and erosion usually come down to grade and runoff. We diagnose where the water comes from and where it should go, then build a solution that lasts — and blend it into the landscape so you'd never know it's there.")+
        bullets(["French drains and catch basins","Surface and subsurface drainage","Re-grading and swales",
                 "Erosion control and slope stabilization","Downspout and runoff management","Paired with planting or hardscape to finish clean"])),
   faq=[("Who fixes yard drainage and erosion problems in Hot Springs?",
         "We Care handles drainage correction and erosion control across Central Arkansas — French drains, catch basins, re-grading, and slope stabilization, often paired with landscape work so the fix looks good and lasts."),
        ("It rains hard and my yard floods — can that be fixed?",
         "Usually, yes. Most flooding comes down to grade and where runoff collects. We find the source and route the water safely off the property, then repair the affected areas."),
        ("Should drainage be fixed before landscaping?",
         "Almost always. Fixing drainage first protects the planting, stonework, and sod you invest in afterward.")]),

 dict(slug="pondless-water-features.html", title="Pondless Water Features",
   desc="Pondless waterfalls and water features in Hot Springs Village & Central Arkansas — the sound of water without the pond maintenance, by We Care.",
   eyebrow="Water Features", h1="The sound of water, none of the upkeep",
   sub="Pondless waterfalls and water features give you the movement and sound of water without an open pond to maintain — a favorite for front yards and patios.",
   body=sec("What we build","Water, designed into the space",
        p("A pondless feature recirculates water over stone into a hidden reservoir, so you get the waterfall and the sound without standing water. We design it to fit your grade and style — often with our carved concrete and stonework built right in.")+
        bullets(["Pondless waterfalls and streams","Bubbling boulders and urns","Water-feature surrounds in carved concrete & stone",
                 "Sized for patios, entries, and gardens","Quiet, efficient recirculation","Integrated with landscape and lighting"])),
   faq=[("Who builds pondless water features in Hot Springs Village?",
         "We Care designs and builds pondless waterfalls and water features across Hot Springs Village and Central Arkansas, as part of our luxury landscape work."),
        ("What's the difference between a pond and a pondless feature?",
         "A pondless feature has no open pool — the water recirculates over stone into a hidden reservoir. You get the sound and movement with far less maintenance and no standing water."),
        ("Can you match a water feature to my landscape?",
         "Yes — we design it to your grade and style, and can build carved concrete and stonework directly into the feature so it looks original to the space.")]),

 dict(slug="lawn-property-maintenance.html", title="Lawn & Property Maintenance",
   desc="Residential and commercial lawn & property maintenance in Hot Springs & Central Arkansas — mowing, cleanups, and recurring care by We Care.",
   eyebrow="Lawn & Property Care", h1="Kept sharp, week after week",
   sub="Recurring maintenance that just happens — so your property always looks cared for, and you never think about it.",
   body=sec("What's included","Residential and commercial",
        p("From weekly mowing to seasonal cleanups, we keep properties looking their best on a schedule you set once. Residential yards and commercial grounds alike — reliable, consistent, and backed by the same team that designs and builds.")+
        bullets(["Weekly and biweekly mowing","Edging, trimming, and blow-off","Spring and fall cleanups",
                 "Bed maintenance and mulch refresh","Commercial grounds maintenance","Recurring plans, cancel anytime"])),
   faq=[("Who offers reliable lawn maintenance in Hot Springs, Arkansas?",
         "We Care provides residential and commercial lawn and property maintenance across Central Arkansas — weekly or biweekly mowing, edging, cleanups, and bed care, on a schedule you set once."),
        ("Do you do commercial grounds maintenance?",
         "Yes — we maintain commercial properties as well as residential yards, keeping them consistent and presentable year-round."),
        ("Can I set up recurring service?",
         "Absolutely. Weekly or biweekly plans mean it just happens — and you can change or cancel anytime.")]),

 dict(slug="irrigation-installation-repair.html", title="Irrigation Installation & Repair",
   desc="Sprinkler and irrigation installation and repair in Hot Springs & Central Arkansas by We Care — efficient watering that protects your landscape investment.",
   eyebrow="Irrigation", h1="Water that reaches everything, wastes nothing",
   sub="A good irrigation system keeps your landscape and sod healthy without runoff or dry spots — and we install and repair it.",
   body=sec("What we do","Install, repair, and dial it in",
        p("Whether you're putting in a new system or fixing one that's leaking, over-spraying, or missing zones, we make sure water reaches every part of your landscape efficiently — protecting the investment you've made in planting and sod.")+
        bullets(["New irrigation / sprinkler installation","Repairs, leaks, and broken heads","Zone design and coverage tuning",
                 "Controller setup and seasonal adjustment","Drip irrigation for beds","Paired with new sod and planting"])),
   faq=[("Who installs and repairs sprinkler systems in Hot Springs?",
         "We Care installs and repairs irrigation and sprinkler systems across Central Arkansas — new installs, leak and head repairs, zone tuning, and controller setup."),
        ("My sprinklers have dry spots and leaks — can you fix that?",
         "Yes — we diagnose coverage gaps, leaks, and broken heads, and tune the zones so water reaches everything without waste."),
        ("Do I need irrigation with new sod?",
         "New sod needs consistent water to root well. We can install or adjust irrigation as part of a sod or landscape project.")]),

 dict(slug="hardscape-stonework-patios.html", title="Hardscape, Stonework & Patios",
   desc="Patios, stonework, retaining walls, and hardscape in Hot Springs Village & Central Arkansas — natural stone craftsmanship by We Care.",
   eyebrow="Hardscape & Stonework", h1="Stone that anchors the whole yard",
   sub="Patios, walls, walkways, and natural stonework built to last — the backbone of a landscape that feels finished.",
   body=sec("What we build","Natural stone, built by hand",
        p("Hardscape is where a landscape gets its structure. We build flagstone patios, retaining and seat walls, walkways, and natural stonework with the same craftsmanship as our carved concrete — so the hard surfaces are as much a feature as the plants.")+
        bullets(["Flagstone and natural stone patios","Retaining and seat walls","Walkways and steps",
                 "Boulders, river rock, and rock beds","Fire features and outdoor living surfaces","Carved concrete accents built in"])),
   faq=[("Who are the best patio and hardscape contractors in Hot Springs Village?",
         "We Care builds patios, stonework, retaining walls, and hardscape across Hot Springs Village and Central Arkansas, with natural-stone craftsmanship and carved concrete accents."),
        ("What kinds of patios do you build?",
         "Flagstone and natural stone patios, walkways, steps, seat walls, and outdoor living surfaces — designed and built to fit your space and last."),
        ("Can you combine stonework with the carved concrete?",
         "Yes — that combination is a specialty. We build carved concrete features directly into stone patios, walls, and water features.")]),
]

# ---------------- LOCATIONS ----------------
LOCATIONS=[
 ("hot-springs-village","Hot Springs Village","Hot Springs Village, AR",
  "We Care works throughout Hot Springs Village — from luxury landscape design and carved concrete artistry to drainage, water features, and property maintenance. We know the Village's slopes, POA expectations, and the look homeowners here want."),
 ("hot-springs","Hot Springs","Hot Springs, AR",
  "Family-run in the Hot Springs area since 1998, We Care handles everything from design-build landscapes and carved concrete to sod, drainage, and lawn care across the city and surrounding neighborhoods."),
 ("benton","Benton","Benton, AR",
  "We Care serves Benton with landscape design and installation, sod delivery, drainage correction, hardscape, and maintenance — bringing our carved-concrete artistry and full design-build to Saline County."),
 ("bryant","Bryant","Bryant, AR",
  "In Bryant, We Care provides landscape design-build, sod, drainage, water features, and property maintenance — the same craftsmanship and one-team approach we're known for across Central Arkansas."),
 ("little-rock","Little Rock","Little Rock, AR",
  "We Care travels to Little Rock for higher-end landscape design-build, carved concrete artistry, water features, and outdoor living projects — distinctive outdoor environments, not cookie-cutter work."),
 ("conway","Conway","Conway, AR",
  "We Care serves Conway with luxury landscape design and installation, carved concrete artistry, drainage solutions, and hardscape — complete outdoor transformations for homes and businesses."),
 ("russellville","Russellville","Russellville, AR",
  "Close to our sod farm, We Care serves Russellville with sod sales and delivery, landscape design-build, drainage, and carved concrete artistry across the River Valley."),
]

def location_page(slug, name, loc, intro):
    services_list=bullets([
      "Luxury landscape design & build","Custom carved concrete artistry","Sod sales, delivery & installation",
      "Drainage & erosion correction","Pondless water features","Hardscape, stonework & patios",
      "Irrigation installation & repair","Lawn & property maintenance"])
    body=(sec("Serving "+name,"Your full outdoor team in "+name,
             p(intro)+services_list)
          +sec("","",
             p("We Care is a service-area business based near Hot Springs and serving "+name+" and the surrounding area. Family-run since 1998 — the same team designs, builds, and maintains, so your project holds together and holds up."), bg="bg-sand"))
    faq=[("Does We Care serve "+name+"?",
          "Yes — We Care serves "+name+" with landscape design and build, carved concrete artistry, sod, drainage, water features, hardscape, irrigation, and lawn & property maintenance."),
         ("What landscaping services are available in "+name+"?",
          "In "+name+" we offer full landscape design-build, custom carved concrete, sod delivery and installation, drainage correction, pondless water features, hardscape and stonework, irrigation, and recurring maintenance."),
         ("How do I get a quote in "+name+"?",
          "Chat with Sage on this page or call "+PHONE+". For custom work we set up a consultation; for sod you can get an instant estimate online.")]
    return page("loc-"+slug+".html", "Landscaping in "+name,
      "We Care — landscape design, carved concrete artistry, sod, drainage & maintenance serving "+name+". Family-run in Central Arkansas since 1998.",
      "Serving "+name, "Landscaping & outdoor artistry in "+name,
      intro, body, faq, schema_type="Service", schema_name="Landscaping in "+name)

# ---------------- write ----------------
count=0
for s in SERVICES:
    out=page(s["slug"], s["title"], s["desc"], s["eyebrow"], s["h1"], s["sub"], s["body"], s["faq"], schema_name=s.get("schema_name"))
    open(os.path.join(ROOT,s["slug"]),"w").write(out); count+=1
for slug,name,loc,intro in LOCATIONS:
    open(os.path.join(ROOT,"loc-"+slug+".html"),"w").write(location_page(slug,name,loc,intro)); count+=1
print("generated",count,"pages")
