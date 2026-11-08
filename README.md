# mogi: annotated sources (not served)

This branch holds the commented sources of the parts that `main` publishes stripped, plus the tools to build and check them.
GitHub Pages serves `main` only, so nothing here goes live. Each file here builds the matching file on `main` as of the
32-stage release (6b79b40):

| Source here   | Builds on main         | How                     |
|---------------|------------------------|-------------------------|
| garden.js     | garden.28cd8c2b.js     | strip (VERSION 1.4.20)  |
| town.js       | town.b1d663ac.js       | strip (VERSION 1.3.19)  |
| atmos.js      | atmos.bb1a3be7.js      | strip                   |
| ambience.js   | ambience.8d9ef6b6.js   | published as is         |

The app (app.*.js), styles, index.html, opening and the rest are published unstripped on `main`; edit those there.

## Publishing a change to the garden, town or atmos
1. Edit the source here. Bump the engine's `var VERSION` when the painting changes (it keys the paintings cached on devices); a pure refactor keeps it.
2. Strip: `python3 tools/strip.py garden.js garden.min.js` (removes comments and indentation, keeps line breaks).
3. Check the stripped build paints exactly what the source paints: make two copies of `tools/det_page_<world>.html`, one loading
   the source and one the stripped file (fill in GLYPHS with main's glyphs.*.js, ATMOS with atmos.js or its stripped build, ENGINE),
   then `python3 tools/det.py <page.html> garden <tag>` for each (6 scenes x card and full = 12 hashes). The two runs must match
   12/12. Run det alone; it can flake under parallel load.
4. On a clone of `main`: name the stripped file by the first 8 hex of its md5 (`garden.<md5>.js`), `git mv` the old one, update
   the name in index.html and sw.js.
5. Smoke tests on that clone: `tools/smoke.py <dir>`, `tools/smoke12.py <dir>`, `tools/cache2.py <dir>` (Playwright).
   Harmless console lines: net::ERR_TUNNEL_CONNECTION_FAILED, Chrome's "Blocked call to navigator.vibrate".
6. Commit on `main`, `git pull --rebase` (another session also pushes the app), push, and check the Pages deploy finished.
   Then commit the changed source here.

## Notes kept from the work so far
- 32 stages in both worlds on one curve: `STAGE_END_H = 300` in garden.js and town.js (change both together).
- The garden's standing rule: a calm, realistic, well-kept garden; animals keep their own movement and stay identifiable.
- Raking is switched off (`RAKE_ON = false`); the ししおどし cycle is `SHISHI_T = 20` s.
- The weather table `WX_TABLE` is the same in atmos.js and ambience.js; change both together.
