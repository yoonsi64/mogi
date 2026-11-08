import asyncio, sys, json, os, hashlib
from playwright.async_api import async_playwright
ARGS=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"]
# det.py page.html world tag : deterministic stills (seeded Math.random, frozen clocks) -> hashes + pngs
INIT = """(()=>{ let s=12345; Math.random=function(){ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
 let t=0; performance.now=function(){ t+=16; return t; }; const D=Date; const fixed=new D('2026-05-01T12:00:00').getTime();
 window.Date=class extends D{ constructor(...a){ if(a.length) super(...a); else super(fixed); } static now(){ return fixed; } };
 window.requestAnimationFrame=function(){ return 0; }; })();"""
SC = [dict(stage=29, season='spring', light='day', date='2026-04-12T11:00:00'),
      dict(stage=12, season='winter', light='night', weather='snow', event='shogatsu', date='2027-01-02T20:00:00'),
      dict(stage=29, season='summer', light='dusk', fireworks=True, event='obon', date='2026-08-14T19:30:00'),
      dict(stage=29, season='autumn', light='day', weather='rain', date='2026-10-20T11:00:00'),
      dict(stage=5, season='summer', light='day', event='tanabata', date='2026-07-06T11:00:00'),
      dict(stage=20, season='spring', light='morning', event='kodomo', date='2026-05-04T08:00:00')]
async def main():
    page, world, tag = sys.argv[1], sys.argv[2], sys.argv[3]; E = 'MogiTown' if world == 'town' else 'MogiGarden'
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for i, o in enumerate(SC):
            for q, (w, h, dpr) in (('card', (390, 293, 3)), ('full', (1600, 900, 1))):
                pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dpr)
                errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.add_init_script(INIT)
                await pg.goto('file://' + page)
                await pg.evaluate("document.getElementById('t').style.width='%dpx';document.getElementById('t').style.height='%dpx'" % (w, h))
                oo = dict(o); oo['quality'] = q
                await asyncio.wait_for(pg.evaluate("(a)=>new Promise(r=>{ var o=a.o; o.onReady=()=>r(); o.animate=false; o.date=new Date(o.date); window.ctl=window[a.E].mount(document.getElementById('t'), o); })", {'o': oo, 'E': E}), 300)
                await asyncio.sleep(1.5)
                cs = await pg.evaluate("()=>Array.from(document.querySelectorAll('#t canvas')).map(c=>{try{return c.toDataURL().length+':'+c.toDataURL().slice(-400)}catch(e){return 'x'}}).join('|')")
                hsh = hashlib.md5(cs.encode()).hexdigest()[:10]
                await pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(page)), 'D_%s_%s_%d_%s.png' % (world, tag, i, q)))
                print(world, i, q, hsh, errs[:2], flush=True)
                await pg.close()
        await b.close()
asyncio.run(main())
