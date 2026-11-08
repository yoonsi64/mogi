import asyncio, sys
from playwright.async_api import async_playwright
ROOT=sys.argv[1]
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport={'width':420,'height':320})
    for run in (1,2):
      pg = await ctx.new_page()
      errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
      await pg.goto('file://'+ROOT+'/index.html'); await pg.wait_for_function('window.MogiTown')
      await pg.evaluate('''()=>{var d=document.createElement('div');d.style.cssText='position:fixed;left:0;top:0;width:400px;height:300px;z-index:99999';document.body.appendChild(d);window.__r=false;window.__C=MogiTown.mount(d,{stage:23,quality:'card',animate:true,weather:'clear',onReady:function(){window.__r=true}});}''')
      await pg.wait_for_function('window.__r', timeout=300000); await pg.wait_for_timeout(4000)
      print('run', run, 'errors:', len(errs), errs[:2]); await pg.close()
    await b.close()
asyncio.run(main())
