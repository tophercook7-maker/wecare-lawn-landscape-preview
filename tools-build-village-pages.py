#!/usr/bin/env python3
"""Build the Hot Springs Village service pages + the Mountain Pine page (12 Nov 2026).
Why: Search Console showed zero impressions for any "hot springs village" search; the site had one Village page.
Every photo and review used here is a real We Care job / real Google review already on the site or listing."""
import json, html
HVS="Hot Springs Village"
REV={
 "martha":("The fire pit area looks so inviting and fits right in with the landscape. Also, I love the way you pruned our Japanese maple. It is so pretty!","Martha D., Google review"),
 "julie":("I live in Arizona and have a 98 year old mom who lives in Hot Springs Village... I called Derrick and he responded quickly and came up with a solution to her problem quickly, professionally and with a good price. His crew came out and whipped her yard into shape, contacted the HOA and brought the house into compliance.","Julie H., Google review · Hot Springs Village"),
 "teresa":("Before the work started, we were presented with a model/visual of the completed project. With that computerized model, we were able to make comparisons and changes. The final project met and exceeded expectations.","Teresa H., Google review"),
 "dylan":("Great to work with from start to finish! The workmanship is second to none and they worked well with my budget.","Dylan R., Google review"),
 "marie":("Very creative with designs and does beautiful work!","Marie B., Google review"),
}
POA=("Do I need POA approval in Hot Springs Village?","Many exterior projects in the Village need a permit from the POA before work starts. Ask the POA's permitting office what your project needs. We can give you the drawing, materials and measurements they ask for.")
PAGES=[
 dict(slug="fire-pits-hot-springs-village", svc="Fire Pits", title="Fire Pit Patios in Hot Springs Village, AR | We Care Landscapes",
  desc="Stone fire pits and fire-pit patios built in Hot Springs Village and Hot Springs, AR. Fitted flagstone, stacked stone, level seating areas. Family-owned since 1998. Call 501-627-4384.",
  h1="Fire pits and fire-pit patios in Hot Springs Village",
  lead="A fire pit is the reason people go back outside in October. We build the pit and the patio around it as one piece, so the chairs sit level and the stone looks like it has always been there.",
  secs=[("What we build","Most fire pits fail at the ground, not the fire. Loose flagstones sink, gravel migrates, and the chairs start to rock. We dig out, build a compacted base, and set fitted flagstone or pavers so the seating circle stays flat for years.",
     ["Round and square stone fire pits, wood or gas","Fitted-flagstone and paver seating circles","Stacked-stone seat walls","River-rock and gravel surrounds that drain","Paths and steps that connect the pit to the house"]),
   ("Built for Village lots","Village yards are wooded and rarely flat. We place a fire pit where the slope, the trees and the view let it work: clear of low limbs, out of the drainage path, and close enough to the house that you will use it on a weeknight.",None)],
  photos=[("ba-firepit-before.jpg","Before: Adirondack chairs and a fire table on loose flagstones in leaf-covered gravel","Before"),("ba-firepit-after.jpg","After: a round fitted-flagstone fire-pit patio with a paver border, set in river rock","After"),("new-firepit.jpg","Round lakeside flagstone seating area on a stacked-stone base",None)],
  rev="martha",
  faqs=[("Do you build fire pits in Hot Springs Village?","Yes. We build stone fire pits and the patios around them in Hot Springs Village, Hot Springs and the surrounding area."),
        ("Wood or gas?","Either. A wood pit is simpler. A gas fire feature needs a gas line run by a licensed installer, and we build the stonework around it."),POA]),
 dict(slug="stone-patios-hot-springs-village", svc="Stone Patios", title="Stone & Flagstone Patios in Hot Springs Village, AR | We Care Landscapes",
  desc="Flagstone and natural-stone patios built in Hot Springs Village, AR: lakeside, golf-course and courtyard patios, walkways and steps. Family-owned since 1998. Call 501-627-4384.",
  h1="Stone and flagstone patios in Hot Springs Village",
  lead="We build flagstone patios by hand, one fitted stone at a time. Lakeside, on the golf course, in a courtyard or under a covered porch, the patio should fit the house and the lot it sits on.",
  secs=[("What we build","A patio is only as good as what is under it. We excavate, compact a base, and set each stone tight so joints stay narrow and the surface stays level.",
     ["Fitted flagstone patios and landings","Stone walkways and entry paths","Natural-stone slab steps on slopes","Inlaid details, borders and medallions","Patios tied into walls, planters and fire pits"]),
   ("Patios we have built on Village-style lots","The photos here are our own work: a large flagstone patio overlooking a golf course, a lakeside patio, a curved courtyard patio against stucco, and a patio wrapped around a brick pillar. Sloped, wooded and waterfront lots are normal for us.",None)],
  photos=[("new-patio-golf.jpg","Large flagstone patio overlooking the golf course",None),("new-patio-lakeside.jpg","Lakeside flagstone patio built by We Care",None),("new-patio-stucco.jpg","Curved flagstone patio against a stucco courtyard wall",None),("new-craft-medallion.jpg","Custom flagstone patio with a hand-set inlaid stone medallion",None)],
  rev="dylan",
  faqs=[("Do you build patios in Hot Springs Village?","Yes. Stone and flagstone patios, walkways and steps are a core part of our work in Hot Springs Village and Hot Springs."),
        ("Can you build on a slope?","Yes. Most Village lots slope. We use steps, low walls and terraces to make a level patio where the ground is not."),POA]),
 dict(slug="retaining-walls-hot-springs-village", svc="Retaining Walls", title="Retaining Walls in Hot Springs Village, AR | Stone Walls | We Care Landscapes",
  desc="Natural-stone retaining walls, seat walls and raised planters built in Hot Springs Village and Hot Springs, AR. Slopes, erosion and drainage solved. Since 1998. Call 501-627-4384.",
  h1="Retaining walls in Hot Springs Village",
  lead="Hillside lots are why people love the Village, and why so many yards wash out. A stone wall holds the slope, gives you level ground to use, and can be the best-looking thing in the yard.",
  secs=[("What we build","A wall has to deal with water first. We plan where runoff goes, build on a proper base, and use natural stone and boulders so the wall looks like part of the hillside.",
     ["Natural-stone and boulder retaining walls","Seat walls and raised cut-stone planters","Terraces that turn a slope into usable ground","Stone steps set into the hill","Drainage and dry-creek beds behind and below the wall"]),
   ("Walls and drainage go together","If your slope is eroding, the wall is half the answer. The other half is giving the water somewhere to go. We often pair a wall with a dry-creek bed or drain so the fix lasts.",None)],
  photos=[("new-craft-wall.jpg","Carved natural-stone retaining wall with boulders and flagstone",None),("new-stone-planter.jpg","Cut-stone raised planter and retaining wall",None),("new-stone-steps.jpg","Natural-stone slab steps set into a slope",None),("proj2-after.jpg","Dry-creek stone bed and plantings after drainage and landscaping",None)],
  rev="julie",
  faqs=[("Do you build retaining walls in Hot Springs Village?","Yes. We build natural-stone retaining walls, seat walls and terraces on sloped lots in Hot Springs Village and Hot Springs."),
        ("My yard is washing out. Wall or drainage?","Usually both. We look at where the water comes from and where it should go, then build the wall and the drainage together."),POA]),
 dict(slug="water-features-hot-springs-village", svc="Water Features", title="Water Features & Pondless Waterfalls in Hot Springs Village, AR | We Care Landscapes",
  desc="Pondless waterfalls, streams and water gardens built in Hot Springs Village and Hot Springs, AR. The sound of water without a pond to maintain. Since 1998. Call 501-627-4384.",
  h1="Water features and pondless waterfalls in Hot Springs Village",
  lead="The sound of moving water changes a yard. A pondless waterfall gives you that sound without a pond to clean: the water disappears into a hidden basin and recirculates.",
  secs=[("What we build","We build water features from natural Arkansas stone so they look like they belong on a wooded hillside.",
     ["Pondless waterfalls and streams","Water gardens","Boulder and natural-stone settings","Features placed to be seen and heard from the porch","Planting and stonework around the water"]),
   ("Why pondless suits the Village","No standing pond means less upkeep and less worry when you travel. A slope, which most Village lots have, is an advantage here: the fall is already built in.",None)],
  photos=[("water-feature.jpg","Natural-stone water feature built by We Care",None),("water-garden.jpg","Water garden with stone and plantings",None),("new-water-build.jpg","Water feature under construction",None)],
  rev="marie",
  faqs=[("Do you install water features in Hot Springs Village?","Yes. We design and build pondless waterfalls, streams and water gardens in Hot Springs Village and Hot Springs."),
        ("How much upkeep does a pondless waterfall need?","Much less than a pond. There is no open water to clean. The pump and basin need occasional checking and topping up."),POA]),
 dict(slug="landscape-design-hot-springs-village", svc="Landscape Design", title="Landscape Design in Hot Springs Village, AR | Design-Build | We Care Landscapes",
  desc="Landscape design-build in Hot Springs Village, AR. See a visual model of your project before work starts. Stone, water, planting and lawn by one team since 1998. Call 501-627-4384.",
  h1="Landscape design in Hot Springs Village",
  lead="We design it and we build it, so the plan you approve is the yard you get. Before work starts, you see a visual model of the finished project and can change it.",
  secs=[("How it works","We walk the property with you, talk through how you want to use it, and put together a design. You see it, we adjust it, and then our own crew builds it.",
     ["A visual model of the project before work starts","One team for design, stonework, planting and lawn","Plans that deal with slope, shade and runoff","New-build yards and full renovations","Phased plans if you want to build in stages"]),
   ("Designed for how Village lots really are","Wooded, sloped, often on a lake or a fairway. Good design here starts with drainage and sight lines, then stone, then plants that handle shade and deer.",None)],
  photos=[("proj-transform-before-1.webp","Backyard before: bare, rocky, unlandscaped slope","Before"),("proj-transform-after-2.webp","Same angle after: manicured lawn, native stone, flagstone paths and a finished landscape","After"),("new-curb-after.jpg","Front yard after: established sod lawn with a river-rock dry creek and clean stone borders",None)],
  rev="teresa",
  faqs=[("Do you offer landscape design in Hot Springs Village?","Yes. We are a design-build company: we design the landscape and our own crew builds it, in Hot Springs Village and Hot Springs."),
        ("Can I see the design before you start?","Yes. We show you a visual model of the finished project so you can compare options and make changes first."),POA]),
 dict(slug="loc-mountain-pine", svc="Landscaping", town="Mountain Pine", title="Landscaper in Mountain Pine, AR | We Care Landscapes",
  desc="We Care Landscapes is based at 1903 W Glazypeau Rd, Mountain Pine, AR. Landscape design-build, stone patios, walls, water features and lawn care since 1998. Call 501-627-4384.",
  h1="Your landscaper in Mountain Pine",
  lead="Mountain Pine is home base. We Care Landscapes works from 1903 W Glazypeau Rd, a short drive from Hot Springs Village's west side and from Hot Springs.",
  secs=[("What we do","Family-owned, and Derrick Collier has been landscaping since 1998. One team handles design, stonework, water, planting, sod and upkeep.",
     ["Landscape design and build","Stone patios, walls and steps","Fire pits and water features","Drainage and erosion correction","Sod, lawn and property care"]),
   ("Where we work from here","From Mountain Pine we reach Hot Springs Village, Hot Springs, Lake Ouachita and the Highway 7 and 227 corridors every day.",None)],
  photos=[("new-stone-table.jpg","Natural Arkansas-stone table and benches by a lake",None),("new-flagstone-entry.jpg","Colorful flagstone entry patio with a cobble border",None),("new-curb-after.jpg","Front yard after: established sod lawn with a river-rock dry creek and clean stone borders",None)],
  rev="dylan",
  faqs=[("Where is We Care Landscapes located?","1903 W Glazypeau Rd, Mountain Pine, AR 71956. We work at customers' properties, so please call before visiting."),
        ("What areas do you serve from Mountain Pine?","Mountain Pine, Hot Springs Village, Hot Springs and the surrounding area."),
        ("How do I get a quote?","Call or text 501-627-4384, Monday to Friday 8am to 3pm, or send the form on our homepage.")]),
]
e=html.escape
def build(p):
    town=p.get("town",HVS); url=f"https://wecarelandscapes.expert/{p['slug']}.html"
    svc_ld={"@context":"https://schema.org","@type":"Service","name":f"{p['svc']} in {town}","serviceType":p["svc"],
      "provider":{"@type":"LandscapingBusiness","@id":"https://wecarelandscapes.expert/#business","name":"We Care Landscapes","telephone":"+1-501-627-4384","url":"https://wecarelandscapes.expert/",
        "address":{"@type":"PostalAddress","streetAddress":"1903 W Glazypeau Rd","addressLocality":"Mountain Pine","addressRegion":"AR","postalCode":"71956","addressCountry":"US"}},
      "areaServed":{"@type":"City","name":f"{town}, AR"},"url":url}
    faq_ld={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in p["faqs"]]}
    secs=""
    for h2,para,bul in p["secs"]:
        secs+=f'<section class="section"><div class="wrap" style="max-width:820px">\n  <h2>{e(h2)}</h2>\n  <p class="lead" style="max-width:70ch">{e(para)}</p>\n'
        if bul: secs+='  <ul style="font-size:1.02rem;color:var(--body);line-height:1.9">\n'+"".join(f"    <li>{e(b)}</li>\n" for b in bul)+"  </ul>\n"
        secs+="</div></section>\n\n"
    figs="".join(f'    <figure style="margin:0;position:relative">{f"<span class=ba-lbl style=position:absolute;left:10px;top:10px;background:#12261a;color:#fff;padding:4px 10px;border-radius:6px;font-size:.8rem;font-weight:700>{lbl}</span>" if lbl else ""}<img loading="lazy" src="img/{src}" alt="{e(alt)}" style="width:100%;height:auto;border-radius:12px;display:block"><figcaption class="mini" style="color:var(--muted);margin-top:6px">{e(alt)}</figcaption></figure>\n' for src,alt,lbl in p["photos"])
    q,who=REV[p["rev"]]
    faqs="".join(f'  <div class="card reveal" style="padding:18px 22px;margin-bottom:12px"><h3 style="margin:0 0 6px">{e(qq)}</h3><p style="margin:0;color:var(--body)">{e(aa)}</p></div>\n' for qq,aa in p["faqs"])
    others="".join(f'<a href="{o["slug"]}.html">{e(o["svc"] if o.get("town") is None else "Mountain Pine")}</a> · ' for o in PAGES if o is not p)
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(p["title"])}</title>
<meta name="description" content="{e(p["desc"])}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(p["title"])}"><meta property="og:description" content="{e(p["desc"])}">
<meta property="og:image" content="https://wecarelandscapes.expert/img/{p["photos"][-1][0]}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="img/mark.png"><link rel="stylesheet" href="css/style.css">
<script type="application/ld+json">{json.dumps(svc_ld)}</script>
<script type="application/ld+json">{json.dumps(faq_ld)}</script>
</head><body>
<header class="nav"><div class="wrap nav-in">
  <a class="brand" href="index.html"><img src="img/logo.png" alt="We Care Landscapes"> WeCare Landscapes</a>
  <nav class="nav-links">
    <a href="design-services.html">Design + Build</a><a href="loc-hot-springs-village.html">Hot Springs Village</a><a href="case-studies.html">Our Work</a><a href="about.html">About</a>
  </nav>
  <div class="nav-cta"><a class="btn btn-primary btn-sm" href="tel:5016274384">📞 Call 501-627-4384</a></div>
</div></header>

<section class="section" style="padding-top:56px">
  <div class="wrap" style="max-width:820px">
    <p class="eyebrow">{e(p["svc"])} · {e(town)}, Arkansas</p>
    <h1 style="font-size:clamp(2rem,5vw,3rem)">{e(p["h1"])}</h1>
    <p class="lead" style="margin-top:12px">{e(p["lead"])}</p>
    <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap">
      <a class="btn btn-leaf" href="tel:5016274384">📞 Call 501-627-4384</a>
      <a class="btn btn-outline" href="index.html#homeForm">Get a free quote</a>
    </div>
    <p class="mini" style="color:var(--muted);margin-top:14px">★★★★★ 5.0 from 17 Google reviews · Family-owned · Landscaping since 1998</p>
  </div>
</section>

{secs}<section class="section bg-sand"><div class="wrap" style="max-width:980px">
  <p class="eyebrow">Our own work</p>
  <h2>Photos from real We Care jobs</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:22px">
{figs}  </div>
  <p style="margin-top:18px"><a href="case-studies.html">See more of our work →</a></p>
</div></section>

<section class="section"><div class="wrap" style="max-width:820px">
  <div class="review"><div class="stars">★★★★★</div><p>"{e(q)}"</p><div class="who">— {e(who)}</div></div>
</div></section>

<section class="section bg-sand"><div class="wrap" style="max-width:820px">
  <p class="eyebrow">Common questions</p><h2>{e(p["svc"])} in {e(town)}: quick answers</h2>
{faqs}</div></section>

<section class="section bg-deep"><div class="wrap center" style="text-align:center;color:#eaf3ee">
  <h2 style="color:#fff">Talk to Derrick about your {e(town)} project</h2>
  <p class="lead center" style="margin:10px auto 22px;color:#cfe4d6">Call or text, Monday to Friday 8am to 3pm. After hours, leave a message and Derrick calls you back.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
    <a class="btn btn-leaf" href="tel:5016274384">📞 Call 501-627-4384</a>
    <a class="btn btn-ghost" href="index.html#homeForm">Get a free quote</a>
  </div>
  <p class="mini" style="margin-top:22px;color:#cfe4d6">More: <a href="loc-hot-springs-village.html" style="color:#fff">Hot Springs Village</a> · {others.replace('<a ','<a style="color:#fff" ')}<a href="index.html" style="color:#fff">Home</a></p>
</div></section>

<footer><div class="wrap"><div class="foot-bot" style="justify-content:center">
  <span>© 2026 We Care Landscapes · 1903 W Glazypeau Rd, Mountain Pine, AR 71956 · <a href="tel:5016274384">501-627-4384</a> · <a href="index.html">Home</a> · <a href="about.html">About</a></span>
</div></div></footer>
<script src="js/wecare-cloud.js?v=1016"></script>
<script src="js/app.js?v=0844"></script>
<script src="js/hits.js?v=1016" defer></script>
<script src="js/callbar.js" defer></script>
</body></html>
'''
PAGES=[p for p in PAGES if p["slug"]!="water-features-hot-springs-village"]
import os
for p in PAGES:
    for src,_,_ in p["photos"]: assert os.path.exists("img/"+src), src
    open(p["slug"]+".html","w",encoding="utf8").write(build(p)); print("built",p["slug"])
sm=open("sitemap.xml").read()
for p in PAGES:
    u=f"https://wecarelandscapes.expert/{p['slug']}.html"
    if u not in sm: sm=sm.replace("</urlset>",f"  <url><loc>{u}</loc></url>\n</urlset>")
open("sitemap.xml","w").write(sm)
