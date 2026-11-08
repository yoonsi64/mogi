import asyncio, sys
from playwright.async_api import async_playwright
ROOT=sys.argv[1]
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"])
    for mod in ['MogiTown','MogiGarden']:
      pg = await b.new_page(viewport={'width':420,'height':320})
      errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text))
      await pg.goto('file://'+ROOT+'/index.html'); await pg.wait_for_function('window.'+mod)
      await pg.evaluate('''(m)=>{var d=document.createElement('div');d.style.cssText='position:fixed;left:0;top:0;width:400px;height:300px;z-index:99999';document.body.appendChild(d);window.__r=false;window.__C=window[m].mount(d,{stage:12,quality:'card',animate:true,weather:'rain',onReady:function(){window.__r=true}});}''', mod)
      await pg.wait_for_function('window.__r', timeout=180000); await pg.wait_for_timeout(3000)
      ids = await pg.evaluate("()=>window.__C._summon?['ooruri','kawasemi','tsuru','sagi','shika','kitsune','tanuki','usagi']:[]")
      for i in ids:
        try: await pg.evaluate('(i)=>window.__C._summon(i)', i); await pg.wait_for_timeout(1500)
        except Exception as e: errs.append('summon '+i+' '+str(e)[:200])
      print(mod, 'errors:', errs[:6]); await pg.close()
    pg = await b.new_page(viewport={"width":390,"height":844})
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto('file://'+ROOT+'/index.html'); await pg.wait_for_timeout(9000); await pg.mouse.click(200,400); await pg.wait_for_timeout(2000)
    await pg.evaluate("document.querySelectorAll('.tour-overlay').forEach(e=>e.remove())")
    await pg.evaluate("document.getElementById('home-sky').click()"); await pg.wait_for_timeout(15000)
    print('sky open', await pg.evaluate("!!document.querySelector('#gd-view.sky')"), 'errors:', errs[:6])
    await pg.screenshot(path=ROOT+'/../sky_smoke.png'); await b.close()
asyncio.run(main())
