/*! MogiGarden — 学びの庭: a painterly Japanese garden that grows with study time.
 * Self-contained, framework-free (ES2017). Canvas-2D procedural painter + light rAF overlays.
 * API: window.MogiGarden = { VERSION, STAGES, EVENTS, RARE, WEATHERS, stageFor, seasonFor, lightFor, windAt, weatherAt, fireworksAt, mount }
 *   mount(el, {stage, season, light, quality, animate, onReady, event, onCue, date, weather, fireworks})
 *   -> controller { update, playStageUp, pause, resume, destroy, tap(nx, ny), _summon(id), stats }
 */
(function () {
'use strict';
/* ---- 01_core.js ---- */
/* ================= core: math, noise, colour ================= */
var TAU = Math.PI * 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(v, a, b) { if (a === undefined) { a = 0; b = 1; } return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function sstep(a, b, v) { var t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); }
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function scl(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
function mulc(a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }
function rgb(c, a) { if (a === undefined) a = 1; return 'rgba(' + (clamp(c[0], 0, 255) | 0) + ',' + (clamp(c[1], 0, 255) | 0) + ',' + (clamp(c[2], 0, 255) | 0) + ',' + a + ')'; }
function ramp(p, t) { t = clamp(t) * (p.length - 1); var i = Math.min(p.length - 2, Math.floor(t)); return mixc(p[i], p[i + 1], t - i); }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function basis(d) { var t = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; var u = norm(cross(d, t)); return [u, cross(d, u)]; }
function makeNoise(seed) {
  var r = mulberry32(seed), perm = [], i;
  for (i = 0; i < 256; i++) perm.push(i);
  for (i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var tt = perm[i]; perm[i] = perm[j]; perm[j] = tt; }
  var Pm = new Uint16Array(512); for (i = 0; i < 512; i++) Pm[i] = perm[i & 255];
  var V = new Float32Array(256); for (i = 0; i < 256; i++) V[i] = r();
  function n2(x, y) {
    var X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), xi = X & 255, yi = Y & 255;
    var a = V[Pm[Pm[xi] + yi]], b = V[Pm[Pm[xi + 1] + yi]], c = V[Pm[Pm[xi] + yi + 1]], d = V[Pm[Pm[xi + 1] + yi + 1]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function h3(x, y, z) { return V[Pm[Pm[Pm[x & 255] + (y & 255)] + (z & 255)]]; }
  function n3(x, y, z) {
    var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    var x00 = lerp(h3(X, Y, Z), h3(X + 1, Y, Z), u), x10 = lerp(h3(X, Y + 1, Z), h3(X + 1, Y + 1, Z), u);
    var x01 = lerp(h3(X, Y, Z + 1), h3(X + 1, Y, Z + 1), u), x11 = lerp(h3(X, Y + 1, Z + 1), h3(X + 1, Y + 1, Z + 1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  }
  function fbm(x, y, o) { if (o === undefined) o = 4; var s = 0, a = 0.5, f = 1, n = 0; for (var i = 0; i < o; i++) { s += a * n2(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; } return s / n; }
  return { n2: n2, n3: n3, fbm: fbm };
}
var NZ = makeNoise(7);
function hash2(x, y) { var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/* ================= render state =================
   Logical scene units: reference frame is 400 x 300. W/H vary with aspect.
   KS = backing pixels per logical unit.  */
var REF_W = 400, REF_H = 300;
var W = 400, H = 300, KS = 2, DQ = 1;
var CAM = null;
var SUN = norm([0.80, 0.56, -0.22]), SUNC = [1, 0.86, 0.66], AMB = [0.52, 0.57, 0.70];
var LS = [0.76, -0.65], SX = 0, SZ = 0;
var MODE = 'n', BEND = 0, BENDY = 0, BENDS = 1, FW = false, SKYM = null;   // BEND: a gale bends the tree being drawn; FW: fireworks tonight; SKYM: the sky-mask painter                 // n normal, m mirrored, s shadow projection, k silhouette (normal projection, black)
var F = null, SEA = null, LIT = null; // features, season params, light params
var GRAINPAT = null, GLOWS = [];
var WL = -0.13;                 // water level
var EDGE = 10.95 * 1.2;         // terrace edge (spread)

/* layout spread (1.2): every placement is spread out from the camera axis, sizes stay real, so the garden is roomier */
var SPX = 1.16, SPZ = 1.2, SP_X0 = 0.6;
function LX(x) { return SP_X0 + (x - SP_X0) * SPX; }
function LZ(z) { return z * SPZ; }
function makeCam(w, h) {
  var th = 29.5 * Math.PI / 180, dist = 33.5, tz = 5.0;
  return { isCam: true, s: Math.sin(th), c: Math.cos(th), x: 0.6, y: dist * Math.sin(th), z: tz - dist * Math.cos(th), F: 960, cx: w / 2, cy: 204 + (h - REF_H) / 2 };
}
function setLight(l) {
  SUN = l.sun; SUNC = l.sunc; AMB = l.amb; LS = l.ls;
  SX = -SUN[0] / Math.max(0.12, SUN[1]); SZ = -SUN[2] / Math.max(0.12, SUN[1]);
}
function sil() { return MODE === 's' || MODE === 'k'; }
function P(x, y, z) {
  if (BEND && y > BENDY) { var yb = y - BENDY; x += BEND * 0.085 * yb * yb; y -= Math.abs(BEND) * 0.016 * yb * yb; }
  if (MODE === 'm') y = 2 * WL - y;
  else if (MODE === 's') { x += y * SX; z += y * SZ; y = 0.0; }
  var rx = x - CAM.x, ry = y - CAM.y, rz = z - CAM.z;
  var d = -ry * CAM.s + rz * CAM.c, u = ry * CAM.c + rz * CAM.s;
  return { x: CAM.cx + CAM.F * rx / d, y: CAM.cy - CAM.F * u / d, d: d, k: CAM.F / d };
}
function Pa(p) { return P(p[0], p[1], p[2]); }
function groundAt(sx, sy, py) {
  var a = (sx - CAM.cx) / CAM.F, b = -(sy - CAM.cy) / CAM.F;
  var dy = -CAM.s + b * CAM.c; if (dy >= 0) return null;
  var t = ((py || 0) - CAM.y) / dy;
  return { x: CAM.x + t * a, z: CAM.z + t * (CAM.c + b * CAM.s), t: t };
}
function faceVisible(c, n) {
  if (MODE === 's') return true;
  var cy = c[1], ny = n[1];
  if (MODE === 'm') { cy = 2 * WL - cy; ny = -ny; }
  return n[0] * (CAM.x - c[0]) + ny * (CAM.y - cy) + n[2] * (CAM.z - c[2]) > 0;
}
function shade(alb, n, o) {
  var sunK = o && o.sun !== undefined ? o.sun : 1, ambK = o && o.amb !== undefined ? o.amb : 1;
  var d = Math.max(0, dot(n, SUN)) * sunK, sky = (0.62 + 0.38 * n[1]) * ambK;
  return [alb[0] * (AMB[0] * sky + SUNC[0] * d * 0.95), alb[1] * (AMB[1] * sky + SUNC[1] * d * 0.95), alb[2] * (AMB[2] * sky + SUNC[2] * d * 0.95)];
}
/* light multiplier for an unshaded albedo seen from above (used for flat painted things) */
function lightTint(ny) { if (ny === undefined) ny = 1; var d = Math.max(0, SUN[1]) * 0.95 * ny, sky = 0.62 + 0.38 * ny; return [AMB[0] * sky + SUNC[0] * d, AMB[1] * sky + SUNC[1] * d, AMB[2] * sky + SUNC[2] * d]; }
function poly(ctx, pp) { ctx.beginPath(); for (var i = 0; i < pp.length; i++) { var p = pp[i]; if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } ctx.closePath(); }
function quad3(ctx, pts, col, strokeW) {
  if (strokeW === undefined) strokeW = 0.4;
  var pp = pts.map(Pa); poly(ctx, pp);
  ctx.fillStyle = sil() ? '#000' : rgb(col); ctx.fill();
  if (strokeW && !sil()) { ctx.strokeStyle = rgb(col); ctx.lineWidth = strokeW; ctx.stroke(); }
  return pp;
}

/* ================= textures ================= */
function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
var GRAIN = null;
function getGrain() {
  if (GRAIN) return GRAIN;
  var N = 192, c = mkCanvas(N, N), x = c.getContext('2d'), im = x.createImageData(N, N), nz = makeNoise(31);
  for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
    var v = 128 + (hash2(i, j) - 0.5) * 110 + (nz.fbm(i * 0.08, j * 0.08, 3) - 0.5) * 120, k = (j * N + i) * 4;
    im.data[k] = im.data[k + 1] = im.data[k + 2] = clamp(v, 0, 255); im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); GRAIN = c; return c;
}
function texOverlay(ctx, clipFn, alpha, mode) {
  if (sil() || !GRAINPAT) return;
  ctx.save(); clipFn(); ctx.clip(); ctx.globalCompositeOperation = mode || 'overlay'; ctx.globalAlpha = alpha === undefined ? 0.3 : alpha;
  ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function grainClip(ctx, path, alpha) {
  if (sil() || !GRAINPAT) return;
  ctx.save(); ctx.clip(path); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = alpha; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/* ---- 02_params.js ---- */
/* ================= stages ================= */
var STAGE_DEFS = [
  [0, '空き地', '雑草の茂る空き地。ここから庭づくりが始まります', [0.9, 0.05, 3.2]],
  [15, '整地', '土をならし、砂利敷きの縁取りを描きました', [-2.7, 0, 1.45]],
  [30, '砂紋と石', '白砂に砂紋を引き、石をひとつ据えました', [-2.3, 0.35, 1.6]],
  [60, 'もみじの苗', 'もみじの苗を植えました', [-4.1, 0.55, 4.3]],
  [120, '飛び石', '飛び石の小道ができました', [0.45, 0, 1.6]],
  [180, '苔', '庭に苔が広がりはじめました', [-1.2, 0, 3.0]],
  [300, 'つつじと松の苗', 'つつじと若い松を植えました', [5.3, 0.5, 2.3]],
  [420, '池', '池を掘り、水を引きました', [2.4, 0, 4.6]],
  [600, '錦鯉と石灯籠', '錦鯉を放ち、石灯籠を据えました', [-1.15, 0.9, 4.3]],
  [900, '睡蓮と菖蒲', '睡蓮が浮かび、菖蒲が水辺を彩ります', [3.2, 0, 4.5]],
  [1200, '竹垣', '庭を竹垣で囲いました', [0.6, 1.0, 10.45]],
  [1500, '太鼓橋', '池に朱の太鼓橋を架けました', null],
  [2100, '蹲踞', '筧の水が落ちる蹲踞を据えました', [-2.2, 0.3, 6.35]],
  [3000, '茶室', '苔むした茶室が建ちました', [-1.95, 1.7, 8.8]],
  [4500, '鹿おどし', '鹿おどしの音が庭に響きます', [0.75, 0.45, 3.25]],
  [6000, '築山と滝', '築山を盛り、滝を落としました', [5.3, 0.9, 7.9]],
  [7500, '藤棚', '池のほとりに藤棚を組みました', [1.15, 1.75, 6.6]],
  [9000, '枯山水', '白砂に石組みを据え、枯山水を整えました', [-3.5, 0.5, 1.2]],
  [12000, '苔庭と大もみじ', '苔が庭を覆い、もみじが大きく育ちました', [-3.75, 3.2, 4.3]],
  [15000, '五重塔', '遠くの山に五重塔が見えます', 'pagoda'],
  [18000, '山門', '竹垣に山門を構えました', [2.65, 1.6, 10.45]],
  [21000, '桜並木', '垣根沿いに桜並木が育ちました', [4.1, 2.9, 10.95]],
  [24000, '八つ橋', '菖蒲の沢に八つ橋を渡しました', [2.7, 0, 2.3]],
  [30000, '枝垂れ桜', '枝垂れ桜が咲き、庭が完成しました', [6.1, 3.9, 9.7]]
];
STAGE_DEFS.forEach(function (d) { var f = d[3]; if (f && typeof f !== 'string') d[3] = [LX(f[0]), f[1], LZ(f[2])]; });
var NST = STAGE_DEFS.length;

/* ================= layout (world units, metres-ish) ================= */
var LAY = {
  rock1: { x: -2.3, z: 1.6 },
  maple: { x: -4.1, z: 4.3 },   // pulled in from the frame edge
  maple2: { x: -6.1, z: 8.7 },
  pine: { x: 5.5, z: 2.2 },
  lantern: { x: -1.15, z: 4.3 },
  pondA: [2.0, 4.1, 2.3, 1.12], pondB: [3.35, 6.6, 2.35, 0.98], pondC: [5.3, 7.3, 0.85, 0.55], pondJ: [2.45, 5.38, 1.12, 0.5],
  marsh: [2.75, 2.3, 1.45, 0.52],
  hill: { x: 6.35, z: 9.0, rx: 2.35, rz: 1.3, h: 2.0 },
  fall: { x: 5.3, ztop: 8.0, zbot: 7.5, ytop: 1.75, wd: 0.66 },
  fenceZ: 10.45,
  gate: { xa: 1.95, xb: 3.35 },
  tsukubai: { x: -2.2, z: 6.35 },
  shishi: { x: 0.75, z: 3.25, m: -1 },
  cherry: { x: 6.1, z: 9.7 },
  ycherry: { x: -4.95, z: 8.7 },
  wis: { x0: 0.35, x1: 1.95, z0: 6.05, z1: 7.15, h: 2.05 },
  namiki: [[-6.0, 10.95, 4.0], [-4.2, 11.0, 4.3], [4.1, 10.95, 4.2], [7.7, 11.0, 3.9]]
};
var TH = (function () { var cx = LX(-1.85), ze = LZ(7.65); return { X0: cx - 1.45, X1: cx + 1.45, ZE: ze, ZW: ze + 0.45, ZB: ze + 2.4, FH: 0.5, WT: 2.35, EY: 2.42, RY: 3.9, ov: 0.62 }; })();
(function spreadLayout() { // move every placement apart; keep sizes, grow the areas (pond, marsh, hill)
  function pt(o) { o.x = LX(o.x); o.z = LZ(o.z); }
  ['rock1', 'maple', 'maple2', 'pine', 'lantern', 'tsukubai', 'shishi', 'cherry', 'ycherry'].forEach(function (k) { pt(LAY[k]); });
  ['pondA', 'pondB', 'pondC', 'pondJ', 'marsh'].forEach(function (k) { var e = LAY[k], g = k === 'marsh' ? 1 : 1.06; LAY[k] = [LX(e[0]), LZ(e[1]), e[2] * SPX * g, e[3] * SPZ * g]; });
  var h = LAY.hill; h.x = LX(h.x); h.z = LZ(h.z); h.rx *= SPX; h.rz *= SPZ;
  var f = LAY.fall; f.x = LX(f.x); f.ztop = LZ(f.ztop); f.zbot = f.ztop - 0.5;
  LAY.fenceZ = LZ(LAY.fenceZ);
  var gm = LX((LAY.gate.xa + LAY.gate.xb) / 2), gw = (LAY.gate.xb - LAY.gate.xa) / 2; LAY.gate = { xa: gm - gw, xb: gm + gw };
  var w = LAY.wis, wx = LX((w.x0 + w.x1) / 2), wz = LZ((w.z0 + w.z1) / 2), hw = (w.x1 - w.x0) / 2, hd = (w.z1 - w.z0) / 2; LAY.wis = { x0: wx - hw, x1: wx + hw, z0: wz - hd, z1: wz + hd, h: w.h };
  LAY.namiki = LAY.namiki.map(function (a) { return [LX(a[0]), LZ(a[1]), a[2]]; });
})();
function sdE(x, z, e) { var dx = (x - e[0]) / e[2], dz = (z - e[1]) / e[3]; return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(e[2], e[3]); }
function smin(a, b, k) { var h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); }
function pondBase(x, z) { return smin(smin(smin(sdE(x, z, LAY.pondA), sdE(x, z, LAY.pondB), 0.75), sdE(x, z, LAY.pondJ), 0.4), sdE(x, z, LAY.pondC), 0.5) + (NZ.n2(x * 1.2 + 40, z * 1.2) - 0.5) * 0.3; }
function marshSDF(x, z) { return sdE(x, z, LAY.marsh) + (NZ.n2(x * 1.7 + 11, z * 1.7) - 0.5) * 0.22; }
function pondSDF(x, z) { var d = pondBase(x, z); if (F && F.marsh) d = smin(d, marshSDF(x, z), 0.45); return d; }
var BRIDGE = (function () {
  var best = null;
  for (var z = LZ(5.15); z <= LZ(5.6); z += 0.05) {
    var x0 = null, x1 = null;
    for (var x = LX(0); x <= LX(5.0); x += 0.02) { if (pondBase(x, z) < 0) { if (x0 === null) x0 = x; x1 = x; } }
    if (x0 !== null) { var w = x1 - x0; if (!best || w < best.w) best = { z: z, x0: x0, x1: x1, w: w }; }
  }
  return { zc: best.z, x0: best.x0 - 0.45, x1: best.x1 + 0.45 };
})();
function hillH(x, z) {
  var h = LAY.hill, dx = (x - h.x) / h.rx, dz = (z - h.z) / h.rz, r2 = dx * dx + dz * dz;
  if (r2 >= 1) return 0;
  return h.h * Math.pow(1 - r2, 0.9) * (0.88 + 0.24 * NZ.n2(x * 1.3 + 5, z * 1.3));
}
var PATH_MAIN = [[0.85, -0.3, 0.30, 0.24], [0.42, 0.42, 0.27, 0.22], [0.78, 1.1, 0.29, 0.23], [0.36, 1.8, 0.27, 0.22], [-0.1, 2.48, 0.28, 0.22], [-0.38, 3.2, 0.27, 0.22], [-0.3, 3.92, 0.29, 0.23], [0.05, 4.6, 0.26, 0.21], [BRIDGE.x0 - 0.3, BRIDGE.zc - 0.1, 0.25, 0.21]];
PATH_MAIN = PATH_MAIN.map(function (q, i, arr) { return i === arr.length - 1 ? q : [LX(q[0]), LZ(q[1]), q[2], q[3]]; });
var PATH_TEA = [[-0.62, 5.3, 0.25, 0.2], [-0.95, 6.0, 0.26, 0.21], [-1.22, 6.68, 0.26, 0.21], [-1.5, 7.28, 0.42, 0.26]];
PATH_TEA = PATH_TEA.map(function (q, i, arr) { return [LX(q[0]), LZ(q[1]), q[2], q[3]]; });
var PATH_GATE = [[1.25, 7.95, 0.25, 0.2], [1.75, 8.6, 0.24, 0.2], [2.25, 9.25, 0.26, 0.21], [2.6, 9.85, 0.32, 0.22]];
PATH_GATE = PATH_GATE.map(function (q, i, arr) { return [LX(q[0]), LZ(q[1]), q[2], q[3]]; });
var AZALEAS0 = [[-3.25, 5.4, 0.6, 0.5], [-1.85, 5.2, 0.42, 0.36], [0.95, 8.2, 0.48, 0.4], [6.25, 4.35, 0.58, 0.48], [3.95, 1.25, 0.42, 0.36], [-2.55, 3.95, 0.4, 0.34], [-0.15, 9.0, 0.45, 0.38]];
var AZALEAS = AZALEAS0.map(function (a) { return [LX(a[0]), LZ(a[1]), a[2], a[3]]; });

/* stage -> feature switches and growth amounts (trees mature continuously) */
var OLD_EQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15.5, 16, 17, 18, 19, 19.5, 20, 21];
function features(st) {
  var s = OLD_EQ[Math.max(0, Math.min(OLD_EQ.length - 1, st))], si = Math.floor(s);
  var f = { s: si, stage: st };
  f.weeds = s === 0; f.leveled = s >= 1; f.gravelOutline = s === 1; f.gravel = s >= 2; f.rock1 = s >= 2;
  f.maple = s < 3 ? 0 : s >= 17 ? 1 + (s - 17) * 0.03 : lerp(0.17, 0.8, Math.pow((s - 3) / 13, 0.9));
  f.path = s >= 4; f.mossOn = s >= 5;
  f.moss = s < 5 ? 2 : [0.64, 0.6, 0.56, 0.53, 0.5, 0.47, 0.45, 0.43, 0.41, 0.39, 0.37, 0.35, 0.29, 0.28, 0.27, 0.26, 0.25][si - 5] - (s - si) * 0.02;
  f.rockMoss = clamp((s - 2) / 16) * 0.85;
  f.azaleas = s >= 6 ? Math.min(1, lerp(0.55, 1, (s - 6) / 8)) : 0;
  f.pine = s < 6 ? 0 : s >= 17 ? 0.9 + (s - 17) * 0.015 : lerp(0.2, 0.84, (s - 6) / 11);
  f.pond = s >= 7; f.koi = s >= 8; f.lantern = s >= 8; f.lilies = s >= 9; f.irises = s >= 9;
  f.fence = s >= 10; f.bridge = s >= 11; f.tsukubai = s >= 12; f.teahouse = s >= 13; f.teaPath = s >= 13; f.smallLanterns = s >= 13;
  f.shishi = s >= 14; f.hill = s >= 15; f.kare = s >= 16; f.mature = s >= 17; f.maple2 = 0;
  f.pagoda = s >= 18; f.gate = s >= 19; f.marsh = s >= 20; f.yatsu = s >= 20; f.cherry = s >= 21 ? 1 : 0;
  f.lilyN = s < 9 ? 0 : Math.min(1, 0.5 + (s - 9) * 0.06);
  // new in 1.1: wisteria trellis (16), young cherry from the start, cherry avenue along the fence (21)
  f.weeds = si === 0 && st === 0; f.gravelOutline = st === 1;
  f.wisteria = st >= 16 ? Math.min(1, 0.62 + (st - 16) * 0.06) : 0;
  f.ycherry = st >= 1 ? Math.min(1.05, lerp(0.14, 1, Math.pow((st - 1) / 18, 0.85))) : 0;
  f.namiki = st >= 21;
  return f;
}
function gravelInfo(Fx) { return Fx.kare ? { cx: LX(-3.15), cz: LZ(1.45), rx: 3.75 * SPX, rz: 2.0 * SPZ } : { cx: LX(-2.9), cz: LZ(1.45), rx: 3.3 * SPX, rz: 1.82 * SPZ }; }
function rakeRocks(Fx) {
  var r = []; if (Fx.rock1) r.push({ x: LAY.rock1.x, z: LAY.rock1.z, r: 0.62, n: 4 });
  if (Fx.kare) r.push({ x: LX(-3.75), z: LZ(1.0), r: 0.42, n: 4 }, { x: LX(-4.55), z: LZ(2.05), r: 0.5, n: 4 }, { x: LX(-1.2), z: LZ(0.7), r: 0.5, n: 3 });
  return r;
}

/* ================= seasons ================= */
var SEASONS = {
  spring: {
    maple: [[24, 40, 14], [44, 70, 20], [72, 106, 28], [108, 140, 40], [146, 172, 60], [184, 198, 92], [214, 220, 130], [236, 238, 176]],
    mapleAlt: [[44, 14, 12], [86, 26, 18], [132, 46, 26], [170, 74, 38], [198, 108, 58], [222, 146, 92], [238, 182, 132], [246, 210, 170]],
    altAmt: 0.45,
    grass: [[78, 112, 38], [132, 160, 66]], grassAmt: 0.85, soil: [[112, 92, 68], [150, 126, 96]],
    moss: [[30, 50, 20], [52, 82, 30], [82, 116, 40], [124, 150, 58], [170, 184, 92]],
    shrub: [[14, 30, 18], [26, 50, 26], [44, 76, 34], [72, 108, 46], [110, 142, 62], [160, 178, 92]],
    azBloom: { p: 0.62, pal: [[150, 30, 80], [206, 64, 120], [236, 118, 160], [250, 182, 206]] },
    ridge: [[110, 140, 90], [150, 174, 110], [232, 210, 218], [242, 226, 232], [224, 198, 208], [98, 124, 80]],
    edge: 'spring', ginkgo: [[44, 66, 20], [82, 112, 34], [132, 160, 56], [176, 196, 92], [210, 222, 140]],
    cherry: 'bloom', iris: 'leaf', lily: 'pad', snow: 0, fallen: 'petal', fx: 'petal', pond: [92, 98, 64], sky: [206, 214, 222]
  },
  summer: {
    maple: [[10, 24, 12], [18, 40, 16], [30, 60, 22], [46, 84, 28], [70, 112, 36], [104, 140, 50], [144, 168, 74], [184, 196, 112]],
    mapleAlt: [[12, 28, 16], [22, 46, 24], [36, 68, 32], [56, 94, 40], [84, 122, 52], [120, 150, 70], [160, 178, 98], [196, 206, 136]],
    altAmt: 0.5,
    grass: [[52, 84, 30], [104, 132, 52]], grassAmt: 0.95, soil: [[108, 90, 66], [146, 124, 94]],
    moss: [[18, 40, 16], [36, 68, 24], [60, 98, 34], [96, 130, 48], [140, 160, 70]],
    shrub: [[8, 22, 14], [16, 38, 20], [30, 60, 28], [52, 88, 38], [86, 120, 52], [130, 156, 76]],
    azBloom: null,
    ridge: [[56, 86, 54], [76, 106, 62], [104, 130, 76], [62, 92, 60], [130, 150, 92], [48, 74, 50]],
    edge: 'summer', ginkgo: [[18, 40, 16], [36, 70, 26], [64, 104, 40], [104, 140, 60], [150, 176, 92]],
    cherry: 'leaf', iris: 'bloom', lily: 'bloom', snow: 0, fallen: null, fx: 'summer', pond: [70, 86, 56], sky: [196, 210, 224]
  },
  autumn: {
    maple: [[40, 6, 10], [74, 10, 14], [116, 18, 18], [158, 30, 22], [192, 50, 26], [216, 82, 34], [234, 120, 50], [246, 160, 84]],
    mapleAlt: [[56, 22, 8], [100, 40, 12], [150, 70, 18], [194, 104, 26], [222, 138, 38], [238, 168, 58], [246, 194, 96], [250, 212, 136]],
    altAmt: 0.7,
    grass: [[124, 114, 66], [176, 160, 100]], grassAmt: 0.7, soil: [[118, 96, 72], [158, 132, 100]],
    moss: [[26, 42, 20], [42, 66, 28], [64, 90, 36], [92, 114, 48], [130, 140, 66]],
    shrub: [[12, 24, 18], [22, 40, 26], [36, 60, 36], [56, 82, 46], [84, 108, 58], [124, 138, 74]],
    azBloom: null,
    ridge: [[186, 74, 40], [214, 120, 48], [200, 160, 62], [150, 58, 40], [96, 104, 58], [70, 84, 52]],
    edge: 'autumn', ginkgo: [[80, 60, 16], [132, 100, 22], [186, 146, 34], [226, 190, 64], [246, 220, 120], [255, 240, 180]],
    cherry: 'autumn', iris: 'fade', lily: 'fade', snow: 0, fallen: 'leaf', fx: 'leaf', pond: [92, 92, 66], sky: [212, 210, 204]
  },
  winter: {
    maple: null, mapleAlt: null, altAmt: 0,
    grass: [[120, 112, 84], [160, 148, 112]], grassAmt: 0.4, soil: [[104, 90, 74], [140, 124, 102]],
    moss: [[24, 38, 22], [38, 58, 30], [56, 78, 40], [80, 98, 54], [112, 124, 76]],
    shrub: [[10, 22, 18], [18, 36, 26], [30, 52, 34], [46, 72, 44], [70, 94, 58], [104, 120, 82]],
    azBloom: null,
    ridge: [[120, 116, 116], [148, 144, 144], [196, 200, 208], [232, 236, 242], [96, 94, 96], [72, 78, 76]],
    edge: 'winter', ginkgo: null,
    cherry: 'bare', iris: 'dry', lily: 'none', snow: 1, fallen: null, fx: 'snow', pond: [70, 80, 84], sky: [214, 220, 228]
  }
};

/* ================= lights ================= */
var LIGHTS = {
  morning: {
    id: 'morning', sun: norm([-0.74, 0.46, -0.3]), sunc: [0.98, 0.92, 0.84], amb: [0.6, 0.66, 0.78], ls: [-0.74, -0.62],
    skyTop: [176, 196, 218], skyHor: [232, 230, 224], haze: [214, 220, 226], sunX: 0.08, sunY: -0.04, sunGlow: 'rgba(255,244,222,0.85)',
    shadow: [70, 86, 124], shadowA: 0.42, hazeK: 1.35, lit: false, wash: ['rgba(230,240,255,0.30)', 'rgba(220,232,250,0.08)'],
    grade: [[236, 242, 252], [226, 232, 240], [200, 204, 214]], bloom: 0.24, vig: [200, 202, 206], mist: 0.55
  },
  day: {
    id: 'day', sun: norm([0.80, 0.56, -0.22]), sunc: [1.0, 0.86, 0.66], amb: [0.52, 0.57, 0.70], ls: [0.76, -0.65],
    skyTop: [200, 210, 220], skyHor: [238, 228, 208], haze: [222, 216, 204], sunX: 0.94, sunY: -0.04, sunGlow: 'rgba(255,240,205,0.8)',
    shadow: [64, 74, 112], shadowA: 0.5, hazeK: 1, lit: false, wash: ['rgba(255,214,150,0.38)', 'rgba(255,200,140,0.10)'],
    grade: null, bloom: 0.22, vig: [196, 182, 170], mist: 0.3
  },
  dusk: {
    id: 'dusk', sun: norm([0.86, 0.26, 0.3]), sunc: [1.0, 0.62, 0.36], amb: [0.46, 0.43, 0.56], ls: [0.9, -0.4],
    skyTop: [96, 92, 140], skyHor: [252, 168, 98], haze: [204, 146, 150], sunX: 0.86, sunY: 0.24, sunGlow: 'rgba(255,170,90,0.9)',
    shadow: [64, 50, 100], shadowA: 0.44, hazeK: 1.0, lit: true, wash: ['rgba(255,150,70,0.40)', 'rgba(255,120,70,0.10)'],
    grade: [[255, 226, 198], [186, 168, 206], [222, 186, 160]], gradeMid: 0.42, bloom: 0.34, vig: [130, 104, 130], mist: 0.35
  },
  night: {
    id: 'night', sun: norm([-0.46, 0.62, 0.5]), sunc: [0.46, 0.56, 0.82], amb: [0.2, 0.26, 0.44], ls: [-0.6, -0.8],
    skyTop: [10, 18, 44], skyHor: [44, 62, 104], haze: [40, 54, 92], sunX: 0.17, sunY: 0.1, sunGlow: 'rgba(170,190,255,0.35)',
    shadow: [20, 26, 60], shadowA: 0.4, hazeK: 0.9, lit: true, wash: ['rgba(120,150,230,0.18)', 'rgba(80,100,180,0.06)'],
    grade: [[150, 168, 220], [126, 142, 198], [92, 104, 158]], bloom: 0.3, vig: [60, 66, 110], mist: 0.25, moon: true
  }
};

/* ================= the seasonal calendar =================
   CAL is the painting's progress through its season, 0..1 (spring: 1 Mar → 31 May, autumn: 1 Sep → 30 Nov), quantized so
   the cache sees only a few versions. Without a date the middle of the season (0.5) is used. */
var CAL = 0.5;
function seasonProgress(season, date) {
  if (date === undefined || date === null || (season !== 'spring' && season !== 'autumn')) return 0.5;
  var d = toDate(date); if (isNaN(d.getTime())) return 0.5;
  var m = d.getMonth(), y = d.getFullYear();
  if (season === 'spring') { if (m < 2 || m > 4) return 0.5; return clamp((d - new Date(y, 2, 1)) / (new Date(y, 4, 31, 23, 59) - new Date(y, 2, 1))); }
  if (m < 8 || m > 10) return 0.5; return clamp((d - new Date(y, 8, 1)) / (new Date(y, 10, 30, 23, 59) - new Date(y, 8, 1)));
}
function calSteps(season) { return season === 'spring' ? 6 : season === 'autumn' ? 4 : 0; }   // 7 bloom phases, 5 autumn steps
function calQuant(season, p) { var n = calSteps(season); return n ? Math.round(p * n) / n : 0.5; }
function calTag(season, p) { var n = calSteps(season); return n ? season.charAt(0) + Math.round(p * n) : '-'; }
/* knots [day, value] with smooth easing between them */
function knots(K, d) { if (d <= K[0][0]) return K[0][1]; for (var i = 1; i < K.length; i++) if (d <= K[i][0]) { var a = K[i - 1], b = K[i], u = (d - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u * u * (3 - 2 * u)); } return K[K.length - 1][1]; }
/* the sakura year (days from 1 March): buds, 三分咲き→五分咲き, 満開 in early April, 花吹雪 mid to late April with fresh leaves, 葉桜 in May */
var SK = {
  bud: [[0, 0.35], [8, 0.8], [14, 1], [20, 0.5], [27, 0]],
  bloom: [[0, 0], [11, 0.03], [17, 0.3], [25, 0.55], [31, 0.95], [37, 1], [45, 0.88], [53, 0.55], [60, 0.24], [67, 0.08], [75, 0]],
  leaf: [[0, 0], [41, 0], [48, 0.16], [55, 0.42], [62, 0.72], [70, 0.92], [80, 1]],
  fall: [[0, 0], [17, 0.03], [28, 0.1], [33, 0.28], [40, 0.6], [46, 1], [55, 1], [61, 0.55], [67, 0.18], [73, 0.04], [79, 0]],
  ground: [[0, 0], [22, 0.02], [33, 0.14], [40, 0.45], [47, 0.9], [55, 1], [61, 0.75], [67, 0.35], [73, 0.1], [80, 0]]
};
function sakuraCal(p, early) { // early: days ahead (the weeping cherry blooms a little before the someiyoshino)
  var d = p * 91 + (early || 0);
  return { bud: knots(SK.bud, d), bloom: knots(SK.bloom, d), leaf: knots(SK.leaf, d), fall: knots(SK.fall, d), ground: knots(SK.ground, d) };
}
/* autumn: very few leaves down in early September, more and more until the momiji fall peaks in late November */
function leafAmt(q) { return 0.06 + 0.94 * Math.pow(clamp(q), 1.7); }

/* ---- 03_nature.js ---- */
/* ================= foliage ================= */
var SNOW = [236, 240, 246];
function leafAdd(path, x, y, s, a, kind, flat) {
  if (flat === undefined) flat = 1;
  if (kind === 'maple') {
    for (var i = 0; i < 10; i++) { var an = a + i * Math.PI / 5, rr = i % 2 ? s * 0.42 : s, px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr * flat; if (i) path.lineTo(px, py); else path.moveTo(px, py); }
    path.closePath();
  } else if (kind === 'momiji') {
    // 7-lobed palmate leaf, lobes fanning upward from the stem
    var L = MOMIJI;
    for (var j = 0; j < L.length; j++) { var q = L[j], t = a + q[0], r = s * q[1], px2 = x + Math.cos(t) * r, py2 = y + Math.sin(t) * r * flat; if (j) path.lineTo(px2, py2); else path.moveTo(px2, py2); }
    path.closePath();
  } else if (kind === 'needle') { var dx = Math.cos(a) * s * 1.6, dy = Math.sin(a) * s * 1.6; path.moveTo(x - dx, y - dy); path.lineTo(x + dx, y + dy); }
  else if (kind === 'oval') { path.moveTo(x + s, y); path.ellipse(x, y, s, s * 0.62, a, 0, TAU); }
  else if (kind === 'flower') { // five petals around a centre: a sakura blossom
    for (var f = 0; f < 5; f++) { var fa = a + f * TAU / 5, fx = x + Math.cos(fa) * s * 0.5, fy = y + Math.sin(fa) * s * 0.5 * flat; path.moveTo(fx + s * 0.44, fy); path.ellipse(fx, fy, s * 0.44, s * 0.4 * flat, fa, 0, TAU); }
  }
  else { path.moveTo(x + s, y); path.arc(x, y, s, 0, TAU); }
}
var MOMIJI = (function () {
  var lob = [[-2.2, 0.55], [-1.45, 0.85], [-0.72, 0.98], [0, 1.0], [0.72, 0.98], [1.45, 0.85], [2.2, 0.55]], pts = [];
  for (var i = 0; i < lob.length; i++) {
    pts.push([lob[i][0] - Math.PI / 2, lob[i][1]]);
    if (i < lob.length - 1) pts.push([(lob[i][0] + lob[i + 1][0]) / 2 - Math.PI / 2, 0.36]);
  }
  pts.push([Math.PI / 2, 0.2]);
  return pts;
})();
function blob(ctx, x, y, r, rng, n, j, vy) {
  n = n || 9; j = j === undefined ? 0.25 : j; vy = vy === undefined ? 0.92 : vy;
  ctx.beginPath(); var o = rng() * TAU, pts = [], i;
  for (i = 0; i < n; i++) { var a = o + i * TAU / n, rr = r * (1 - j / 2 + rng() * j); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * vy]); }
  for (i = 0; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (i) ctx.quadraticCurveTo(p[0], p[1], mx, my); else ctx.moveTo(mx, my); }
  var p0 = pts[0], q0 = pts[1]; ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + q0[0]) / 2, (p0[1] + q0[1]) / 2); ctx.closePath();
}
/* generic dab foliage. clusters [{x,y,z,r,tone}] */
function paintFoliage(ctx, cl, o, filter) {
  var rng = mulberry32(o.seed || 1), items = [], i, b;
  for (i = 0; i < cl.length; i++) { var c0 = cl[i]; items.push({ c: c0, p: P(c0.x, c0.y, c0.z) }); }
  items.sort(function (a, b2) { return b2.p.d - a.p.d; });
  if (sil()) {
    ctx.fillStyle = '#000';
    for (i = 0; i < items.length; i++) { var it = items[i]; if (filter && !filter(it.p)) continue; var r0 = it.c.r * it.p.k * (o.sparse ? 0.55 : 0.92); ctx.beginPath(); ctx.ellipse(it.p.x, it.p.y, r0 * 1.2, r0 * 0.8, 0, 0, TAU); ctx.fill(); }
    return;
  }
  var NB = 12, C = o.center, R = o.R, dq = Math.sqrt(DQ);
  var tint = o.tint || null;
  for (i = 0; i < items.length; i++) {
    var c = items[i].c, p = items[i].p;
    if (filter && !filter(p)) continue;
    var rs = c.r * p.k;
    var n = norm([c.x - C[0], (c.y - C[1]) * 1.15 + R * 0.3, c.z - C[2]]);
    var lit = clamp((o.litBase === undefined ? 0.42 : o.litBase) + (o.litK === undefined ? 0.6 : o.litK) * dot(n, SUN));
    var dist = Math.hypot(c.x - C[0], (c.y - C[1]) * 0.9, c.z - C[2]) / R;
    lit *= 0.5 + 0.5 * clamp(dist * 1.15);
    if (o.litBoost) lit = clamp(lit + o.litBoost);
    var fl = o.flat === undefined ? 0.88 : o.flat;
    var tone = c.tone || 0;
    if (!o.sparse) { ctx.fillStyle = rgb(tc(ramp(o.pal, lit * 0.24 + 0.02), tint)); blob(ctx, p.x, p.y + rs * 0.1, rs * (o.mass === undefined ? 0.8 : o.mass), rng, 9, 0.3, fl * 1.02); ctx.fill(); }
    var cnt = Math.min((o.max || 260) * DQ, Math.max(o.sparse ? 4 : 10, rs * rs * (o.density || 1.25) * DQ));
    var paths = []; for (b = 0; b < NB; b++) paths.push(new Path2D());
    var acc = o.accent ? [new Path2D(), new Path2D(), new Path2D()] : null;
    var snowP = o.snow ? new Path2D() : null;
    var ds = o.dab * p.k / dq;
    for (var k = 0; k < cnt; k++) {
      var a = rng() * TAU, rr = Math.pow(rng(), 0.62) * 1.12, ox = Math.cos(a) * rr, oy = Math.sin(a) * rr * fl;
      var local = clamp(lit + (o.localK === undefined ? 0.36 : o.localK) * (ox * LS[0] + oy * LS[1] / fl * 0.8) + (rng() - 0.5) * 0.3 - (oy > 0 ? oy * 0.25 : 0));
      var sz = ds * (0.65 + rng() * 0.7);
      if (snowP && oy < -0.05 && rng() < o.snow * (0.4 - oy)) { leafAdd(snowP, p.x + ox * rs, p.y + oy * rs, sz * 1.2, rng() * TAU, 'oval'); continue; }
      if (acc && rng() < o.accent.p) { leafAdd(acc[Math.min(2, (local * 3) | 0)], p.x + ox * rs, p.y + oy * rs, sz * (o.accent.s || 1), rng() * TAU, o.accent.kind || o.kind); continue; }
      leafAdd(paths[Math.min(NB - 1, Math.round(local * (NB - 1)))], p.x + ox * rs, p.y + oy * rs, sz, rng() * TAU, o.kind);
    }
    for (b = 0; b < NB; b++) {
      var col = ramp(o.pal, b / (NB - 1)); if (o.alt && tone > 0) col = mixc(col, ramp(o.alt, b / (NB - 1)), tone);
      col = tc(col, tint);
      if (o.kind === 'needle') { ctx.strokeStyle = rgb(col); ctx.lineWidth = Math.max(0.35, ds * 0.5); ctx.stroke(paths[b]); } else { ctx.fillStyle = rgb(col); ctx.fill(paths[b]); }
    }
    if (acc) for (b = 0; b < 3; b++) { ctx.fillStyle = rgb(tc(ramp(o.accent.pal, (b + 0.5) / 3), tint)); ctx.fill(acc[b]); }
    if (snowP) { ctx.fillStyle = rgb(mulc(SNOW, lightTint(0.9))); ctx.fill(snowP); }
  }
}
function tc(c, t) { return t ? [c[0] * t[0], c[1] * t[1], c[2] * t[2]] : c; }
function drawBranches(ctx, segs, bark, wmul, snowK) {
  wmul = wmul || 1;
  var passes = sil() ? [[0, 1, '#000']] : [[0, 1, rgb(bark[0])], [0.22, 0.62, rgb(bark[1])], [0.42, 0.26, rgb(bark[2])]];
  var pr = segs.map(function (s) { return { a: Pa(s.a), b: Pa(s.b), s: s }; });
  for (var q = 0; q < passes.length; q++) {
    var off = passes[q][0], wf = passes[q][1]; ctx.fillStyle = passes[q][2]; ctx.beginPath();
    for (var i = 0; i < pr.length; i++) {
      var a = pr[i].a, b = pr[i].b, s = pr[i].s;
      var w0 = Math.max(0.3, s.r0 * a.k * wmul), w1 = Math.max(0.22, s.r1 * b.k * wmul);
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      if (nx * LS[0] + ny * LS[1] < 0) { nx = -nx; ny = -ny; }
      var ax = a.x + nx * w0 * off, ay = a.y + ny * w0 * off, bx = b.x + nx * w1 * off, by = b.y + ny * w1 * off, h0 = w0 * wf, h1 = w1 * wf;
      ctx.moveTo(ax + nx * h0, ay + ny * h0); ctx.lineTo(bx + nx * h1, by + ny * h1); ctx.lineTo(bx - nx * h1, by - ny * h1); ctx.lineTo(ax - nx * h0, ay - ny * h0); ctx.closePath();
      ctx.moveTo(bx + h1, by); ctx.arc(bx, by, h1, 0, TAU);
    }
    ctx.fill();
  }
  if (snowK && !sil()) {
    ctx.strokeStyle = rgb(mulc(SNOW, lightTint(1))); ctx.lineCap = 'round';
    for (var j = 0; j < pr.length; j++) {
      var A = pr[j].a, B = pr[j].b, S = pr[j].s, w = Math.max(0.3, S.r0 * A.k * wmul);
      var dir = sub(S.b, S.a), horiz = 1 - Math.abs(dir[1]) / (Math.hypot(dir[0], dir[1], dir[2]) || 1);
      if (horiz < 0.35 || w < 0.35) continue;
      ctx.lineWidth = Math.min(w * 0.9, 2.2) * snowK * horiz; ctx.beginPath(); ctx.moveTo(A.x, A.y - w * 0.75); ctx.lineTo(B.x, B.y - w * 0.7); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}

/* ================= Japanese maple: layered sprays ================= */
function genMaple(seed, bx, bz, g, by, hsc, maxl) {
  by = by || 0;
  var rng = mulberry32(seed), chains = [], MAXL = maxl || 5;
  function grow(p, d, len, rad, lvl, parent) {
    var cur = p, ns = 3, segs = [];
    for (var k = 0; k < ns; k++) {
      d = norm([d[0] + (rng() - 0.5) * 0.34, d[1] + (rng() - 0.5) * 0.12 - (lvl >= 3 ? 0.05 : 0), d[2] + (rng() - 0.5) * 0.34]);
      var np = add(cur, mul(d, len / ns)); segs.push({ a: cur, b: np, r0: rad * (1 - 0.1 * k), r1: rad * (1 - 0.1 * (k + 1)), lvl: lvl }); cur = np;
    }
    var ch = { lvl: lvl, segs: segs, end: cur, start: p, kids: [], parent: parent, d: d, sprayR: 0.42 + rng() * 0.2, tone: rng() * 2 - 1, lat: rng() };
    chains.push(ch); if (parent) parent.kids.push(ch);
    if (lvl >= MAXL) return;
    var n = lvl === 0 ? 3 : (rng() < 0.35 ? 3 : 2), bs = basis(d), u = bs[0], v = bs[1], ph0 = rng() * TAU;
    for (var i = 0; i < n; i++) {
      var ph = ph0 + i * TAU / n + (rng() - 0.5) * 0.9, a = (lvl === 0 ? 0.62 : 0.6) + (rng() - 0.5) * 0.35;
      var cd = norm(add(mul(d, Math.cos(a)), add(mul(u, Math.cos(ph) * Math.sin(a)), mul(v, Math.sin(ph) * Math.sin(a)))));
      if (lvl >= 1) { cd[1] = cd[1] * 0.42 + 0.1; cd = norm(cd); }
      grow(cur, cd, len * (0.72 + rng() * 0.14), rad * 0.68, lvl + 1, ch);
    }
  }
  grow([0, 0, 0], norm([(rng() - 0.5) * 0.2, 1, (rng() - 0.5) * 0.2]), 1.25, 0.09, 0, null);
  var gg = Math.min(1, g), Dv = lerp(1.25, MAXL + 1, Math.pow(sstep(0, 1, gg), 0.8));
  var segs = [], ends = [], i, j;
  // reveal: chain at level l visible with fraction clamp(Dv-l)
  function frac(ch) { return clamp(Dv - ch.lvl); }
  var vis = chains.filter(function (ch) { return frac(ch) > 0; });
  vis.forEach(function (ch) {
    var f = frac(ch), sp = ch.start;
    var scalePt = function (q) { return f >= 1 ? q : add(sp, mul(sub(q, sp), f)); };
    if (ch.parent && frac(ch.parent) < 1) return;
    ch.vEnd = scalePt(ch.end);
    ch.segs.forEach(function (s) { segs.push({ a: scalePt(s.a), b: scalePt(s.b), r0: s.r0 * (0.6 + 0.4 * f), r1: s.r1 * (0.6 + 0.4 * f), lvl: s.lvl, f: f }); });
    var kidsVis = ch.kids.some(function (k) { return frac(k) > 0.45; });
    if (!kidsVis) ends.push(ch);
  });
  var sprays = [];
  ends.forEach(function (ch) {
    var f = frac(ch), e = ch.vEnd;
    sprays.push({ p: e, r: ch.sprayR * (0.55 + 0.45 * f), tone: ch.tone, lvl: ch.lvl });
    // a lateral spray part-way back along the chain for fuller layering
    if (gg > 0.45 && ch.lat < 0.55) { var s = ch.segs[1]; sprays.push({ p: [lerp(s.a[0], e[0], 0.4), lerp(s.a[1], e[1], 0.4) - 0.06, lerp(s.a[2], e[2], 0.4)], r: ch.sprayR * 0.7, tone: ch.tone * 0.6, lvl: ch.lvl }); }
  });
  // scale so visible height hits the target
  var maxY = 0.01; segs.forEach(function (s) { maxY = Math.max(maxY, s.b[1]); }); sprays.forEach(function (s) { maxY = Math.max(maxY, s.p[1] + s.r * 0.3); });
  var Ht = lerp(0.75, 4.7, Math.pow(gg, 0.95)) * (g > 1 ? g : 1), sc = Ht / maxY, hs = 1.14 * (hsc || 1);
  function T(p) { return [bx + p[0] * sc * hs, by + p[1] * sc, bz + p[2] * sc * hs]; }
  segs.forEach(function (s) { s.a = T(s.a); s.b = T(s.b); s.r0 *= sc; s.r1 *= sc; });
  var sprayScale = Math.max(sc, 0.32);
  sprays.forEach(function (s) { s.p = T(s.p); s.r *= sprayScale * 1.05; });
  // twigs for bare (winter) display
  var twigs = [], trng = mulberry32(seed + 77);
  ends.forEach(function (ch) {
    var e = T(ch.vEnd), d0 = ch.d;
    for (var t = 0; t < 4; t++) {
      var dd = norm([d0[0] + (trng() - 0.5) * 1.3, d0[1] * 0.4 + 0.25 + (trng() - 0.3) * 0.5, d0[2] + (trng() - 0.5) * 1.3]);
      var L = (0.25 + trng() * 0.35) * sprayScale; var m = add(e, mul(dd, L * 0.55)); var dd2 = norm([dd[0] + (trng() - 0.5) * 0.6, dd[1] + 0.15, dd[2] + (trng() - 0.5) * 0.6]);
      twigs.push([e, m, add(m, mul(dd2, L * 0.5))]);
    }
  });
  var cx = 0, cy = 0, cz = 0; sprays.forEach(function (s) { cx += s.p[0]; cy += s.p[1]; cz += s.p[2]; });
  var n = Math.max(1, sprays.length); cx /= n; cy /= n; cz /= n;
  var R = 0.1; sprays.forEach(function (s) { R = Math.max(R, Math.hypot(s.p[0] - cx, s.p[1] - cy, s.p[2] - cz)); });
  return { segs: segs, sprays: sprays, twigs: twigs, center: [cx, cy, cz], R: R, base: [bx, by, bz], H: Ht, seed: seed, g: gg };
}
function paintSprays(ctx, t, filt, opt) {
  var list = [], i;
  var hideY = opt && opt.hideY !== undefined && MODE === 'n' ? opt.hideY : null; // sprays wholly behind the fence are not painted
  for (i = 0; i < t.sprays.length; i++) { var s = t.sprays[i], p = Pa(s.p); if (hideY !== null && p.y - s.r * p.k * 0.55 > hideY) continue; if (filt(p)) list.push({ s: s, p: p }); }
  list.sort(function (a, b) { return b.p.d - a.p.d; });
  if (sil()) {
    ctx.fillStyle = '#000';
    for (i = 0; i < list.length; i++) { var q = list[i], rr = q.s.r * q.p.k; ctx.beginPath(); ctx.ellipse(q.p.x, q.p.y, rr * 0.95, rr * 0.42, 0, 0, TAU); ctx.fill(); }
    return;
  }
  opt = opt || {};
  var pal = opt.pal || SEA.maple, alt = opt.pal ? opt.alt : SEA.mapleAlt, altK = opt.pal ? (opt.altK || 0) : SEA.altAmt, rng = mulberry32(t.seed + 5), C = t.center, R = t.R;
  var NB = 10, dq = Math.sqrt(DQ), big = t.H > 2.5, blossom = opt.kind === 'blossom', dens = opt.density || 1, haze = opt.haze || 0;
  var tint = LIT.foliageTint || null, acc = opt.accent ? [new Path2D(), new Path2D()] : null, snowP = opt.snow ? new Path2D() : null;
  var NL = 6, lpaths = null; if (opt.leafMix > 0.01 && opt.leafPal) { lpaths = []; for (var lb = 0; lb < NL; lb++) lpaths.push(new Path2D()); } // fresh leaves among the blossom
  for (i = 0; i < list.length; i++) {
    var sp = list[i].s, p = list[i].p, rs = sp.r * p.k;
    // light: crown-scale normal + spray top
    var nrm = norm([sp.p[0] - C[0], (sp.p[1] - C[1]) * 1.2 + R * 0.35, sp.p[2] - C[2]]);
    var lit = clamp(0.36 + 0.5 * dot(nrm, SUN));
    var depth = clamp(Math.hypot(sp.p[0] - C[0], (sp.p[1] - C[1]) * 0.9, sp.p[2] - C[2]) / R);
    lit *= 0.55 + 0.45 * clamp(depth * 1.2);
    var hr = clamp((sp.p[1] - (C[1] - R * 0.8)) / (R * 1.6)); lit *= 0.75 + 0.35 * hr;
    var tone = altK * clamp(sp.tone * 0.8 + (NZ.n3(sp.p[0] * 0.7, sp.p[1] * 0.7, sp.p[2] * 0.7) - 0.45) * 1.6, -1, 1);
    var flat = blossom ? 0.55 : 0.42;
    // underside shadow: a few dark dabs hugging the lower rim of the spray
    var ds = (opt.dab ? opt.dab * p.k / dq : blossom ? Math.max(0.5, 0.07 * p.k) / dq : Math.max(0.55, 0.085 * p.k) / dq * (big ? 1 : 0.9));
    var leafK = blossom ? (ds * KS > 6 ? 'flower' : 'circle') : opt.kind === 'leaf' ? 'oval' : (ds * KS > 6.5) ? 'momiji' : 'maple';
    if (blossom) lit = clamp(lit * 0.78 + 0.2);
    var paths = []; for (var b = 0; b < NB; b++) paths.push(new Path2D());
    var cnt = Math.min((opt.cap || 150) * DQ * dens, Math.max(5, rs * rs * 0.6 * DQ * dens * (opt.dab ? 0.0049 / (opt.dab * opt.dab) : 1)));
    for (var k = 0; k < cnt; k++) {
      var a = rng() * TAU, rr = Math.sqrt(rng()), ox = Math.cos(a) * rr, oy = Math.sin(a) * rr;
      if (rr > 0.75 && rng() < (rr - 0.75) * 2.4) continue; // lacy edge
      var dome = (1 - rr * rr) * 0.32;
      var sx = p.x + ox * rs, sy = p.y + oy * rs * flat - dome * rs * 0.55 + rr * rr * rs * 0.12; // droop at tips
      // top surface lit, front/bottom rim in shade, sun side brighter
      var local = lit + 0.32 * (ox * LS[0]) - 0.34 * clamp(oy) + dome * 0.6 + (rng() - 0.5) * 0.28;
      var under = oy > 0.35 && rng() < 0.55;
      if (under) local = local * 0.45 - 0.05;
      local = clamp(local);
      if (lpaths && rng() < opt.leafMix) { leafAdd(lpaths[Math.min(NL - 1, Math.round(clamp(local * 0.9 + 0.05) * (NL - 1)))], sx, sy, ds * (0.75 + rng() * 0.5), rng() * TAU, 'oval', 0.7); continue; }
      if (snowP && oy < -0.15 && rng() < opt.snow * (0.35 - oy)) { leafAdd(snowP, sx, sy, ds * 1.1, rng() * TAU, 'oval', 0.6); continue; }
      if (acc && rng() < opt.accent.p) { leafAdd(acc[local > 0.5 ? 1 : 0], sx, sy, ds * 0.8, rng() * TAU, 'oval', 0.78); continue; }
      leafAdd(paths[Math.min(NB - 1, Math.round(local * (NB - 1)))], sx, sy, ds * (0.7 + rng() * 0.6), -Math.PI / 2 + (rng() - 0.5) * 2.2 + ox * 0.6, leafK, 0.78);
    }
    for (b = 0; b < NB; b++) {
      var f = b / (NB - 1), col = ramp(pal, f * 0.92 + 0.04);
      if (alt && tone > 0) col = mixc(col, ramp(alt, f * 0.92 + 0.04), tone); else if (alt && tone < 0 && SEA === SEASONS.autumn) col = mixc(col, scl(ramp(pal, f * 0.8), 0.92), -tone * 0.4);
      if (haze) col = mixc(col, LIT.haze, haze);
      ctx.fillStyle = rgb(tc(col, tint)); ctx.fill(paths[b]);
    }
    if (acc) for (b = 0; b < 2; b++) { var ac = ramp(opt.accent.pal, b ? 0.8 : 0.3); if (haze) ac = mixc(ac, LIT.haze, haze); ctx.fillStyle = rgb(tc(ac, tint)); ctx.fill(acc[b]); }
    if (lpaths) for (b = 0; b < NL; b++) { var lc = ramp(opt.leafPal, b / (NL - 1)); if (haze) lc = mixc(lc, LIT.haze, haze); ctx.fillStyle = rgb(tc(lc, tint)); ctx.fill(lpaths[b]); lpaths[b] = new Path2D(); }
  }
  if (snowP) { ctx.fillStyle = rgb(mulc(SNOW, lightTint(0.9))); ctx.fill(snowP); }
}
function drawMaple(ctx, t) {
  var cd = Pa(t.center).d;
  var bark = [[40, 32, 30], [80, 68, 62], [122, 108, 96]];
  if (!SEA.maple) { drawBareTree(ctx, t, bark); return; } // winter: bare structure, twigs and snow
  var mo = { cap: 118, density: SEA === SEASONS.autumn ? 1 - 0.3 * sstep(0.55, 1, CAL) : 1 };   // a little thinner by late November
  paintSprays(ctx, t, function (p) { return p.d > cd + 0.25; }, mo);
  drawBranches(ctx, t.segs, bark);
  paintSprays(ctx, t, function (p) { return p.d <= cd + 0.25; }, mo);
}
function drawBareTree(ctx, t, bark) {
  drawBranches(ctx, t.segs, bark, 1, SEA.snow ? 1 : 0);
  if (!sil()) {
    ctx.strokeStyle = rgb(tc(mixc(bark[1], [70, 58, 54], 0.5), LIT.foliageTint)); ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.25, 0.012 * Pa(t.center).k); ctx.beginPath();
    t.twigs.forEach(function (tw) { var a = Pa(tw[0]), m = Pa(tw[1]), e = Pa(tw[2]); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y, e.x, e.y); });
    ctx.stroke(); ctx.lineCap = 'butt';
  } else { ctx.strokeStyle = '#000'; ctx.lineWidth = 0.3; ctx.beginPath(); t.twigs.forEach(function (tw) { var a = Pa(tw[0]), e = Pa(tw[2]); ctx.moveTo(a.x, a.y); ctx.lineTo(e.x, e.y); }); ctx.stroke(); }
}
/* ================= someiyoshino cherry: the maple's spreading structure, painted as blossom clouds ================= */
var SAKURA = {
  bloom: [[128, 100, 116], [160, 130, 146], [190, 160, 174], [214, 188, 199], [231, 210, 218], [241, 225, 231], [248, 237, 240], [253, 247, 248]],
  bloomAlt: [[146, 98, 120], [180, 126, 148], [206, 154, 174], [224, 180, 196], [237, 202, 214], [245, 220, 228], [250, 234, 239], [253, 245, 247]],
  leaf: [[12, 28, 16], [22, 46, 22], [36, 68, 30], [56, 94, 40], [84, 122, 52], [120, 150, 70], [160, 178, 98], [196, 206, 136]],
  autumn: [[80, 22, 16], [124, 36, 22], [166, 58, 28], [200, 86, 36], [220, 118, 48], [234, 152, 66], [242, 186, 98], [248, 212, 142]],
  autumnAlt: [[70, 40, 14], [118, 70, 22], [164, 104, 30], [200, 140, 44], [222, 172, 66], [236, 196, 100], [244, 214, 136], [250, 228, 170]],
  bark: [[30, 26, 28], [62, 54, 56], [96, 86, 86]],
  fresh: [[36, 70, 26], [62, 104, 36], [98, 140, 52], [140, 176, 78], [184, 208, 120], [214, 228, 160]]   // 葉桜: new leaves
};
/* pink buds swelling on the twig tips before the bloom */
function budDots(ctx, t, amt) {
  if (sil() || amt < 0.05) return;
  var r = mulberry32(t.seed + 21), pa = new Path2D(), pb = new Path2D();
  t.twigs.forEach(function (tw) { [tw[1], tw[2]].forEach(function (q, i) { if (r() > amt * (i ? 1 : 0.6)) return; var p = Pa(q), rr = Math.max(0.3, 0.016 * p.k), path = r() < 0.5 ? pa : pb; path.moveTo(p.x + rr, p.y); path.arc(p.x + (r() - 0.5) * rr * 2, p.y + (r() - 0.5) * rr * 2, rr, 0, TAU); }); });
  ctx.fillStyle = rgb(tc([196, 112, 132], LIT.foliageTint)); ctx.fill(pa); ctx.fillStyle = rgb(tc([226, 156, 172], LIT.foliageTint)); ctx.fill(pb);
}
function genSakura(seed, x, z, g, by, hsc, maxl) { var t = genMaple(seed, x, z, g, by, hsc || 1.12, maxl); t.sakura = true; t.sprays.forEach(function (s) { s.r *= maxl === 4 ? 1.4 : 1.2; }); return t; }
function sakuraMode() { return SEA === SEASONS.spring ? 'bloom' : SEA === SEASONS.summer ? 'leaf' : SEA === SEASONS.autumn ? 'autumn' : 'bare'; }
function drawSakura(ctx, t, o) {
  o = o || {};
  var mode = sakuraMode(), cd = Pa(t.center).d;
  if (mode === 'bare') { drawBareTree(ctx, t, SAKURA.bark); return; }
  var far = !!o.far, dab = far ? 0.125 : o.dab || null, cap = far ? 50 : o.cap || 110;
  if (mode === 'bloom') { // the spring calendar: buds, opening blossom, full bloom, fresh leaves coming through, all green
    var sk = sakuraCal(CAL, o.early || 0), cov = clamp(sk.bloom + sk.leaf), lm = sk.leaf / Math.max(0.01, sk.bloom + sk.leaf);
    if (cov < 0.04) { drawBareTree(ctx, t, SAKURA.bark); budDots(ctx, t, sk.bud); return; }
    var so = { pal: SAKURA.bloom, alt: SAKURA.bloomAlt, altK: o.pink ? 0.85 : 0.45, kind: 'blossom', density: (o.density || 1) * 0.85 * (0.12 + 0.88 * cov), haze: o.haze, dab: dab, cap: cap * (0.15 + 0.85 * cov), leafMix: lm, leafPal: SAKURA.fresh };
    if (lm > 0.97) { so = { pal: SAKURA.fresh, kind: 'leaf', density: (o.density || 1) * 0.8, haze: o.haze, dab: dab || 0.08, cap: cap }; }
    paintSprays(ctx, t, function (p) { return p.d > cd + 0.25; }, so);
    if (cov < 0.75) drawBareTree(ctx, t, SAKURA.bark); else drawBranches(ctx, t.segs, SAKURA.bark);
    if (sk.bloom < 0.35) budDots(ctx, t, sk.bud);
    paintSprays(ctx, t, function (p) { return p.d <= cd + 0.25; }, so);
    return;
  }
  var opt = mode === 'bloom' ? { pal: SAKURA.bloom, alt: SAKURA.bloomAlt, altK: o.pink ? 0.85 : 0.45, kind: 'blossom', density: (o.density || 1) * 0.85, haze: o.haze, dab: dab, cap: cap }
    : mode === 'leaf' ? { pal: SAKURA.leaf, kind: 'leaf', density: (o.density || 1) * 0.8, haze: o.haze, dab: dab || 0.08, cap: cap }
      : { pal: SAKURA.autumn, alt: SAKURA.autumnAlt, altK: 0.6, kind: 'leaf', density: (o.density || 1) * 0.6, haze: o.haze, dab: dab || 0.08, cap: cap };
  paintSprays(ctx, t, function (p) { return p.d > cd + 0.25; }, opt);
  drawBranches(ctx, t.segs, SAKURA.bark);
  paintSprays(ctx, t, function (p) { return p.d <= cd + 0.25; }, opt);
}
function mapleAO(ctx, t) { var p = Pa(t.base), r = t.segs[0].r0 * p.k * 3.2 + 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.6, r * 0.55, 0, 0, TAU); ctx.fill(); }

/* ================= pine ================= */
function genPine(seed, bx, bz, g, by) {
  by = by || 0;
  var rng = mulberry32(seed), gg = Math.min(1, g), S = lerp(0.24, 0.92, gg) * (g > 1 ? g : 1);
  var tr = [[0, 0, 0], [0.15, 0.42, 0.05], [0.25, 0.86, 0.12], [0.1, 1.3, 0.25], [-0.25, 1.68, 0.38], [-0.65, 1.98, 0.48], [-0.95, 2.26, 0.55], [-1.05, 2.56, 0.58]];
  var pts = tr.map(function (p) { return [bx + p[0] * S * 1.15, by + p[1] * S * 0.74, bz + p[2] * S]; });
  var segs = [], i;
  for (i = 0; i < pts.length - 1; i++) { var r0 = lerp(0.17, 0.04, i / (pts.length - 1)) * S * 1.1, r1 = lerp(0.17, 0.04, (i + 1) / (pts.length - 1)) * S * 1.1; segs.push({ a: pts[i], b: pts[i + 1], r0: r0, r1: r1 }); }
  function at(f) { var k = Math.min(pts.length - 2, Math.floor(f)), t = f - k; return mixc(pts[k], pts[k + 1], t); }
  var BR = [{ f: 2.0, a: Math.PI * 1.3, l: 1.0, dy: -0.12, r: 0.66 }, { f: 2.7, a: Math.PI * 0.97, l: 1.55, dy: -0.18, r: 0.78 }, { f: 3.3, a: -Math.PI * 0.42, l: 0.75, dy: 0.0, r: 0.56 }, { f: 3.9, a: Math.PI * 0.72, l: 1.2, dy: -0.08, r: 0.7 }, { f: 4.3, a: Math.PI * 1.18, l: 1.0, dy: 0.02, r: 0.6 }, { f: 5.0, a: Math.PI * 0.5, l: 0.8, dy: 0.03, r: 0.54 }, { f: 5.4, a: -Math.PI * 0.25, l: 0.6, dy: 0.0, r: 0.5 }, { f: 6.1, a: Math.PI * 1.05, l: 0.75, dy: 0.0, r: 0.5 }];
  var use = gg < 0.3 ? [0, 3, 5] : (gg < 0.62 ? [0, 1, 3, 4, 5, 7] : BR.map(function (_, k) { return k; }));
  var pads = [], limbs = [];
  use.forEach(function (ix) {
    var b = BR[ix], s = at(b.f), L = b.l * S * 1.22, dir = [Math.cos(b.a), 0, Math.sin(b.a)], side = [-dir[2], 0, dir[0]];
    var j1 = (rng() - 0.5) * 0.35 * S, j2 = (rng() - 0.5) * 0.3 * S;
    var m1 = [s[0] + dir[0] * L * 0.32 + side[0] * j1, s[1] + (b.dy - 0.1) * S, s[2] + dir[2] * L * 0.32 + side[2] * j1];
    var mid = [s[0] + dir[0] * L * 0.62 + side[0] * j2, s[1] + (b.dy - 0.08) * S, s[2] + dir[2] * L * 0.62 + side[2] * j2];
    var end = [s[0] + dir[0] * L, s[1] + (b.dy + 0.06) * S, s[2] + dir[2] * L];
    limbs.push({ a: s, b: m1, r0: 0.06 * S, r1: 0.048 * S }, { a: m1, b: mid, r0: 0.048 * S, r1: 0.036 * S }, { a: mid, b: end, r0: 0.036 * S, r1: 0.022 * S });
    var pr = b.r * Math.pow(S, 0.85);
    pads.push({ x: end[0], y: end[1] + 0.1 * S, z: end[2], r: pr * 1.12, t: 0.3 * pr });
    if (b.l > 0.95 && gg > 0.6) pads.push({ x: mid[0] + (rng() - 0.5) * 0.2, y: mid[1] + 0.06 * S, z: mid[2], r: pr * 0.62, t: 0.3 * pr * 0.62 });
  });
  var top = pts[pts.length - 1]; pads.push({ x: top[0], y: top[1] + 0.12 * S, z: top[2], r: 0.55 * Math.pow(S, 0.85), t: 0.22 * S, top: true });
  return { segs: segs.concat(limbs), pads: pads, base: [bx, by, bz], S: S, seed: seed, top: [top[0], top[1] + 0.12 * S, top[2]], gg: gg };
}
var PINE_PAL = [[10, 22, 18], [18, 36, 26], [28, 54, 36], [44, 74, 44], [66, 98, 54], [98, 124, 64], [146, 156, 86]];
function paintPad(ctx, pad, rng, po) {
  var p = P(pad.x, pad.y, pad.z), rx = pad.r * p.k, ry = pad.r * p.k * 0.3 + pad.t * p.k * 0.3, i;
  if (sil()) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * 1.05, ry * 1.1, 0, 0, TAU); ctx.fill(); return; }
  po = po || {};
  var tint = LIT.foliageTint || null, pal = (po.pal || PINE_PAL).map(function (c) { c = tc(c, tint); return po.haze ? mixc(c, LIT.haze, po.haze) : c; });
  ctx.fillStyle = rgb(pal[0]);
  for (i = 0; i < 7; i++) { var u = (i / 6 - 0.5) * 1.5; ctx.beginPath(); ctx.ellipse(p.x + u * rx * 0.62, p.y + ry * 0.25 + (rng() - 0.5) * ry * 0.2, rx * 0.42, ry * 0.62, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = rgb(pal[1]); ctx.beginPath(); ctx.ellipse(p.x, p.y + ry * 0.05, rx * 0.92, ry * 0.78, 0, 0, TAU); ctx.fill();
  var NB = 7, paths = []; for (i = 0; i < NB; i++) paths.push(new Path2D());
  var cnt = Math.min(420 * DQ * (po.dens || 1), Math.max(20, rx * ry * 1.25 * DQ * (po.dens || 1))), nl = Math.max(1.2, (po.nl || 0.075) * p.k) / Math.sqrt(DQ);
  var snowP = SEA.snow ? new Path2D() : null, candle = SEA === SEASONS.spring && !po.pal ? new Path2D() : null;
  for (i = 0; i < cnt; i++) {
    var a = rng() * TAU, rr = Math.sqrt(rng()), uu = Math.cos(a) * rr, v = Math.sin(a) * rr; v = v * 0.9 - 0.1;
    var bx = p.x + uu * rx, by = p.y + v * ry;
    var l = 0.28 + 0.5 * (-v) + 0.32 * (uu * Math.sign(LS[0])) + (rng() - 0.5) * 0.3; if (rr > 0.85 && v < 0) l += 0.12;
    if (snowP && v < 0.1 && rng() < 0.75 - v) { snowP.moveTo(bx + nl * 0.9, by); snowP.ellipse(bx, by, nl * 0.9, nl * 0.5, 0, 0, TAU); continue; }
    if (candle && v < -0.4 && rng() < 0.08) { candle.moveTo(bx, by); candle.lineTo(bx + (rng() - 0.5) * 0.4, by - nl * 1.4); continue; }
    var bb = Math.min(NB - 1, Math.max(0, Math.round(clamp(l) * (NB - 1))));
    for (var j = 0; j < 6; j++) { var an = -Math.PI / 2 + (rng() - 0.5) * 2.6 + uu * 0.5, L = nl * (0.6 + rng() * 0.6); paths[bb].moveTo(bx, by); paths[bb].lineTo(bx + Math.cos(an) * L, by + Math.sin(an) * L * 0.85); }
  }
  for (i = 0; i < NB; i++) { ctx.strokeStyle = rgb(pal[i]); ctx.lineWidth = (i > 4 ? 0.45 : 0.55) / Math.sqrt(DQ) * 1.2; ctx.stroke(paths[i]); }
  if (candle) { ctx.strokeStyle = rgb(tc([196, 206, 140], tint)); ctx.lineWidth = 0.7; ctx.stroke(candle); }
  if (snowP) {
    // soft snow cushion on the top of the pad
    var sc = mulc(SNOW, lightTint(1));
    ctx.fillStyle = rgb(scl(sc, 0.82)); ctx.beginPath(); ctx.ellipse(p.x, p.y - ry * 0.18, rx * 0.86, ry * 0.5, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = rgb(sc); ctx.fill(snowP);
  }
}
function drawPine(ctx, t) {
  var rng = mulberry32(t.seed);
  var pads = t.pads.map(function (pd) { return { pd: pd, p: P(pd.x, pd.y, pd.z) }; }).sort(function (a, b) { return b.p.d - a.p.d; });
  var trunkD = P(t.base[0] - 0.6 * t.S, t.base[1] + 1.5 * t.S, t.base[2]).d, i;
  for (i = 0; i < pads.length; i++) if (pads[i].p.d > trunkD + 0.3) paintPad(ctx, pads[i].pd, rng);
  drawBranches(ctx, t.segs, [[38, 30, 26], [84, 64, 50], [138, 108, 82]], 1, SEA.snow ? 0.8 : 0);
  if (!sil()) {
    ctx.strokeStyle = 'rgba(28,20,16,0.55)'; ctx.lineWidth = 0.45;
    t.segs.slice(0, 7).forEach(function (s) { var a = Pa(s.a), b = Pa(s.b), w = s.r0 * a.k; for (var k = 0; k < 6; k++) { var f = rng(), x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f); ctx.beginPath(); ctx.moveTo(x - w * 0.6, y + (rng() - 0.5)); ctx.lineTo(x + w * 0.4, y + (rng() - 0.5) * 1.2); ctx.stroke(); } });
  }
  for (i = 0; i < pads.length; i++) if (pads[i].p.d <= trunkD + 0.3) paintPad(ctx, pads[i].pd, rng);
  if (SEA.snow && t.gg > 0.5 && t.yuki) drawYukitsuri(ctx, t);
}
/* yukitsuri: a mast above the crown with ropes fanned down to the pads */
function drawYukitsuri(ctx, t) {
  var top = [t.top[0], t.top[1] + 1.1 * t.S, t.top[2]], pt = Pa(top), base = Pa(t.top);
  ctx.strokeStyle = sil() ? '#000' : 'rgb(120,96,62)'; ctx.lineWidth = Math.max(0.6, 0.05 * pt.k);
  ctx.beginPath(); ctx.moveTo(base.x, base.y + 2); ctx.lineTo(pt.x, pt.y); ctx.stroke();
  if (sil()) return;
  ctx.strokeStyle = 'rgba(216,196,150,0.85)'; ctx.lineWidth = Math.max(0.3, 0.012 * pt.k);
  var rr = mulberry32(t.seed + 9);
  t.pads.forEach(function (pd) {
    for (var k = 0; k < 3; k++) {
      var e = P(pd.x + (rr() - 0.5) * pd.r * 1.6, pd.y + 0.02, pd.z + (rr() - 0.5) * pd.r * 0.8);
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.quadraticCurveTo((pt.x + e.x) / 2, (pt.y + e.y) / 2 + 1.2, e.x, e.y); ctx.stroke();
    }
  });
  ctx.fillStyle = 'rgb(200,180,140)'; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(0.6, 0.04 * pt.k), 0, TAU); ctx.fill();
}

/* ================= shrubs & background trees ================= */
function domeClusters(x, z, R, Hh, rng, by, n) {
  by = by || 0; var cl = [], N = n || Math.max(8, Math.round(R * R * 26));
  for (var i = 0; i < N; i++) { var a = rng() * TAU, u = Math.sqrt(rng()), rx = Math.cos(a) * u * R * 0.82, rz = Math.sin(a) * u * R * 0.82, y = by + Hh * Math.sqrt(Math.max(0, 1 - u * u)) * 0.82 + 0.05; cl.push({ x: x + rx, y: y, z: z + rz, r: R * (0.26 + rng() * 0.12), tone: rng() * 2 - 1 }); }
  return cl;
}
function makeShrub(seed, x, z, R, Hh, pal, o) { o = o || {}; var rng = mulberry32(seed); var cl = domeClusters(x, z, R, Hh, rng, o.by || 0); return { cl: cl, center: [x, (o.by || 0) + Hh * 0.45, z], R: Math.max(R, Hh), pal: pal, seed: seed, x: x, z: z, Rr: R, o: o }; }
function drawShrub(ctx, sh) {
  paintFoliage(ctx, sh.cl, { pal: sh.pal, center: sh.center, R: sh.R, kind: sh.o.kind || 'oval', dab: sh.o.dab || 0.055, density: sh.o.density || 1.3, max: 220, seed: sh.seed, accent: sh.o.accent, litBoost: sh.o.litBoost || 0, snow: SEA.snow ? (sh.o.snow === undefined ? 0.8 : sh.o.snow) : 0, tint: LIT.foliageTint, sparse: sh.o.sparse });
}
function shrubAO(ctx, sh) { var p = P(sh.x, sh.o.by || 0, sh.z); ctx.beginPath(); ctx.ellipse(p.x, p.y, sh.Rr * p.k * 0.95, sh.Rr * p.k * CAM.s * 0.9, 0, 0, TAU); ctx.fill(); }
function makeTallTree(seed, x, z, Hh, R, pal, kind) {
  var rng = mulberry32(seed), cl = [], n = kind === 'small' ? 36 : 60, cs = kind === 'small' ? 0.45 : 1;
  for (var i = 0; i < n; i++) {
    var h = lerp(Hh * (kind === 'small' ? 0.45 : 0.3), Hh, Math.pow(rng(), 0.7));
    var rr = (kind === 'cedar' ? R * (1 - h / Hh) * 1.1 + 0.4 : R * Math.sin(Math.PI * clamp((h - Hh * 0.3) / (Hh * 0.75))) + 0.2), a = rng() * TAU;
    cl.push({ x: x + Math.cos(a) * rr * rng(), y: h, z: z + Math.sin(a) * rr * rng() * 0.6, r: (0.7 + rng() * 0.6) * cs, tone: 0 });
  }
  var br = [], brng = mulberry32(seed + 3);
  for (var b = 0; b < 9; b++) { var hh = Hh * (0.35 + b * 0.065), ang = (brng() - 0.5) * 2.4, L = R * (0.6 + brng() * 0.6) * (kind === 'small' ? 0.8 : 1); br.push({ a: [x, hh, z], b: [x + Math.sin(ang) * L, hh + Math.cos(ang) * L * 0.8 + 0.3, z + (brng() - 0.5) * 0.4], r0: 0.05 * cs + 0.02, r1: 0.015 }); }
  var bare = pal ? null : genMaple(seed, x, z, Hh / 4.7, 0, kind === 'small' ? 0.62 : 0.5);
  return { cl: cl, center: [x, Hh * 0.65, z], R: Math.max(R, Hh * 0.4), pal: pal, seed: seed, x: x, z: z, Hh: Hh, kind: kind, br: br, bare: bare, segs: [{ a: [x, 0, z], b: [x, Hh * 0.9, z], r0: kind === 'small' ? 0.1 : 0.28, r1: kind === 'small' ? 0.04 : 0.1 }] };
}
function drawTallTree(ctx, t) {
  var bark = t.kind === 'cedar' ? [[60, 34, 26], [110, 64, 44], [150, 96, 70]] : [[60, 52, 44], [100, 90, 76], [140, 128, 108]];
  if (!t.pal) { drawMaple(ctx, t.bare); return; }
  drawBranches(ctx, t.segs, bark);
  paintFoliage(ctx, t.cl, { pal: t.pal, center: t.center, R: t.R, kind: t.kind === 'cedar' ? 'needle' : 'oval', dab: t.kind === 'cedar' ? 0.1 : 0.1, density: 0.45, max: 200, seed: t.seed, snow: SEA.snow ? 0.5 : 0, tint: LIT.foliageTint });
}

/* ================= layered trees: backdrop trees and the hedge row =================
   The maple's branching skeleton, resized to any height and crown width, painted as lit sprays of leaves
   between its limbs, so even the far trees show crown structure, branches, leaf texture and light and shade. */
function growTo(t, H, R, sprayK, bush) {
  var b = t.base, k = H / t.H, Rx = 0.1, i, ex = bush || 1;
  for (i = 0; i < t.sprays.length; i++) { var s = t.sprays[i]; Rx = Math.max(Rx, Math.hypot(s.p[0] - b[0], (s.p[2] - b[2]) * 0.8) + s.r * 0.6); }
  var kx = R ? R / (Rx * k) : 1, kh = k * kx;
  // bush > 1 pulls the crown down onto short stems (a shrub rather than a standard tree)
  function T(p) { var u = clamp((p[1] - b[1]) / t.H, 0, 1.4); return [b[0] + (p[0] - b[0]) * kh, b[1] + H * Math.pow(u, ex) * (ex > 1 ? 1.05 : 1), b[2] + (p[2] - b[2]) * kh * 0.75]; }
  t.segs.forEach(function (s) { s.a = T(s.a); s.b = T(s.b); s.r0 *= k; s.r1 *= k; });
  t.sprays.forEach(function (s) { s.p = T(s.p); s.r *= k * (sprayK || 1) * Math.sqrt(kx); });
  t.twigs = t.twigs.map(function (tw) { return tw.map(T); });
  t.center = T(t.center); t.R *= Math.max(k, kh); t.H = H;
  return t;
}
function makeLayered(seed, x, z, H, R, o) {
  o = o || {};
  var t = genMaple(seed, x, z, 1, o.by || 0, 1, o.maxl || 4);
  growTo(t, H, R, o.spray || 1.25, o.bush);
  t.lo = o; return t;
}
function drawLayered(ctx, t, o) {
  if (!o.pal) { drawBareTree(ctx, t, o.bark || [[48, 40, 36], [88, 76, 68], [126, 112, 100]]); return; }
  var cd = Pa(t.center).d, opt = { pal: o.pal, alt: o.alt, altK: o.altK === undefined ? 0.45 : o.altK, kind: 'leaf', dab: o.dab || 0.1, cap: o.cap || 60, density: o.density || 1, haze: o.haze || 0, snow: SEA.snow ? (o.snow === undefined ? 0.6 : o.snow) : 0, hideY: o.hideY };
  paintSprays(ctx, t, function (p) { return p.d > cd + 0.2; }, opt);
  if (o.hideY === undefined || MODE !== 'n') drawBranches(ctx, t.segs, o.bark || [[48, 40, 36], [88, 76, 68], [126, 112, 100]], 1, SEA.snow ? 0.6 : 0);
  paintSprays(ctx, t, function (p) { return p.d <= cd + 0.2; }, opt);
}
/* a palette's warmer, sunnier partner for tonal variety between sprays */
function warmAlt(pal) { return pal ? pal.map(function (c) { return [Math.min(255, c[0] * 1.14 + 6), Math.min(255, c[1] * 1.06 + 4), c[2] * 0.82]; }) : null; }
/* sugi: a tall straight trunk carrying tiers of clumped needle pads round a shadowed core */
function makeCedar(seed, x, z, H, R) {
  var rng = mulberry32(seed), pads = [], N = 11, i;
  for (i = 0; i < N; i++) {
    var f = i / (N - 1), h = H * (0.24 + 0.74 * f), rr = R * Math.pow(1 - f, 0.8) + 0.22, m = i === N - 1 ? 1 : 2 + (rng() < 0.5 ? 1 : 0), a0 = rng() * TAU;
    for (var j = 0; j < m; j++) { var a = a0 + j * TAU / m + (rng() - 0.5) * 0.6, d = i === N - 1 ? 0 : rr * (0.45 + rng() * 0.25); pads.push({ x: x + Math.cos(a) * d, y: h + (rng() - 0.5) * 0.15, z: z + Math.sin(a) * d * 0.6, r: Math.max(0.3, rr * (0.62 + rng() * 0.2)), t: 0.32 * rr }); }
  }
  return { pads: pads, x: x, z: z, H: H, R: R, seed: seed, segs: [{ a: [x, 0, z], b: [x + 0.05, H * 0.98, z], r0: 0.2, r1: 0.04 }] };
}
var CEDAR_PAL = [[10, 18, 14], [18, 30, 22], [26, 44, 30], [38, 60, 38], [54, 78, 46], [78, 98, 56], [112, 124, 74]];
function drawCedar(ctx, t, haze) {
  var rng = mulberry32(t.seed), cd = P(t.x, t.H * 0.5, t.z).d, pal = SEA.snow ? CEDAR_PAL.map(function (c) { return mixc(c, [92, 64, 40], 0.18); }) : CEDAR_PAL;
  var pads = t.pads.map(function (pd) { return { pd: pd, p: P(pd.x, pd.y, pd.z) }; }).sort(function (a, b) { return b.p.d - a.p.d; });
  // the shadowed core of the crown, seen between the tiers
  if (!sil()) {
    var b0 = P(t.x, t.H * 0.26, t.z), tp = P(t.x, t.H, t.z), w = t.R * b0.k * 0.42;
    ctx.fillStyle = rgb(mixc(tc(pal[1], LIT.foliageTint), LIT.haze, haze || 0)); ctx.beginPath(); ctx.moveTo(b0.x - w, b0.y); ctx.quadraticCurveTo(b0.x - w * 0.5, (b0.y + tp.y) / 2, tp.x, tp.y); ctx.quadraticCurveTo(b0.x + w * 0.5, (b0.y + tp.y) / 2, b0.x + w, b0.y); ctx.closePath(); ctx.fill();
  }
  var hp = haze ? pal.map(function (c) { return mixc(c, LIT.haze, haze); }) : pal, cl = t.cl;
  if (!cl) { cl = t.cl = []; t.pads.forEach(function (pd) { for (var k = 0; k < 4; k++) { var a = k / 4 * TAU + rng() * 0.8; cl.push({ x: pd.x + Math.cos(a) * pd.r * 0.55, y: pd.y + (k % 2 ? 0.06 : -0.04) * pd.r, z: pd.z + Math.sin(a) * pd.r * 0.35, r: pd.r * (0.42 + rng() * 0.12), tone: rng() * 2 - 1 }); } }); }
  var fo = { pal: hp, center: [t.x, t.H * 0.6, t.z], R: t.R * 1.6, kind: 'oval', dab: 0.075, density: 0.9, max: 120, seed: t.seed + 1, snow: SEA.snow ? 0.7 : 0, tint: LIT.foliageTint, mass: 0.7, flat: 0.62, litBase: 0.36, litK: 0.7 };
  var cc = P(t.x, t.H * 0.6, t.z).d;
  paintFoliage(ctx, cl, fo, function (p) { return p.d > cc + 0.2; });
  drawBranches(ctx, t.segs, [[60, 34, 26], [110, 64, 44], [150, 96, 70]]);
  paintFoliage(ctx, cl, fo, function (p) { return p.d <= cc + 0.2; });
}

/* ================= weeping cherry (shidare-zakura) ================= */
function genCherry(seed, bx, bz, by) {
  var rng = mulberry32(seed), segs = [], strands = [];
  var trunk = [[0, 0, 0], [0.08, 0.7, 0.02], [0.02, 1.4, 0.06], [-0.05, 2.0, 0.04]];
  for (var i = 0; i < trunk.length - 1; i++) segs.push({ a: trunk[i], b: trunk[i + 1], r0: lerp(0.24, 0.13, i / 3), r1: lerp(0.24, 0.13, (i + 1) / 3) });
  var top = trunk[trunk.length - 1], NL = 6;
  for (var l = 0; l < NL; l++) {
    var ang = l / NL * TAU + rng() * 0.6, dir = [Math.cos(ang), 0, Math.sin(ang) * 0.8];
    var p0 = top, p1 = add(top, [dir[0] * 0.55, 0.9 + rng() * 0.4, dir[2] * 0.55]), p2 = add(p1, [dir[0] * 0.75, 0.55 + rng() * 0.35, dir[2] * 0.75]), p3 = add(p2, [dir[0] * 0.7, 0.05 + rng() * 0.2, dir[2] * 0.7]);
    segs.push({ a: p0, b: p1, r0: 0.11, r1: 0.075 }, { a: p1, b: p2, r0: 0.075, r1: 0.045 }, { a: p2, b: p3, r0: 0.045, r1: 0.02 });
    // pendulous branchlets from the upper limbs
    var pts = [p1, p2, p3];
    for (var s = 0; s < 14; s++) {
      var f = rng() * 2, k = Math.min(1, Math.floor(f)), q = mixc(pts[k], pts[k + 1], f - k);
      var out = norm([dir[0] + (rng() - 0.5) * 0.9, 0, dir[2] + (rng() - 0.5) * 0.9]);
      var len = 2.2 + rng() * 1.6 - (k === 0 ? 0.6 : 0), reach = 0.35 + rng() * 0.5;
      var drop = Math.min(len, q[1] - 0.05 - rng() * 0.5);
      strands.push({ s: q, out: out, reach: reach, drop: drop, seed: (rng() * 1e6) | 0 });
    }
  }
  var sc = 0.9;
  function T(p) { return [bx + p[0] * sc, by + p[1] * sc, bz + p[2] * sc]; }
  segs.forEach(function (s) { s.a = T(s.a); s.b = T(s.b); });
  strands.forEach(function (st) { st.s = T(st.s); });
  var c = T([0, 2.6, 0]);
  return { segs: segs, strands: strands, center: c, R: 2.3 * sc, base: [bx, by, bz], seed: seed };
}
function strandPt(st, t) {
  // arc out then hang: horizontal reach saturates, vertical drop accelerates
  var h = st.reach * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2), v = st.drop * Math.pow(t, 1.6) - 0.18 * Math.sin(t * Math.PI) * st.reach;
  return [st.s[0] + st.out[0] * h, st.s[1] - v, st.s[2] + st.out[2] * h];
}
function drawCherry(ctx, t) {
  var mode = SEA.cherry, cd = Pa(t.center).d, rng = mulberry32(t.seed + 1);
  var sk = mode === 'bloom' ? sakuraCal(CAL, 5) : null, cov = sk ? clamp(sk.bloom + sk.leaf) : 1, lm = sk ? sk.leaf / Math.max(0.01, sk.bloom + sk.leaf) : 0; // the weeping cherry blooms a few days early
  var FRESH = [[24, 60, 22], [40, 84, 30], [62, 110, 40], [92, 138, 56], [126, 166, 78], [160, 192, 104], [192, 214, 136], [216, 230, 168]];
  var bark = [[44, 34, 34], [86, 70, 66], [128, 112, 104]];
  var st = t.strands.map(function (s) { return { s: s, p: Pa(strandPt(s, 0.5)) }; }).sort(function (a, b) { return b.p.d - a.p.d; });
  var tint = LIT.foliageTint || null;
  function strands(filter) {
    var NB = 8, paths = [], lpaths = [], i, b; for (b = 0; b < NB; b++) { paths.push(new Path2D()); lpaths.push(new Path2D()); }
    var lines = new Path2D();
    var pal = mode === 'bloom' ? [[146, 104, 120], [186, 138, 156], [214, 170, 186], [232, 196, 208], [244, 218, 226], [250, 234, 238], [253, 244, 246], [255, 250, 250]]
      : mode === 'leaf' ? [[14, 34, 18], [24, 52, 24], [40, 74, 32], [60, 98, 40], [86, 124, 52], [118, 150, 70], [150, 174, 96], [184, 198, 128]]
        : mode === 'autumn' ? [[86, 22, 16], [130, 36, 22], [170, 56, 28], [204, 84, 36], [222, 116, 48], [236, 150, 66], [244, 184, 96], [250, 210, 140]] : null;
    for (i = 0; i < st.length; i++) {
      var s = st[i].s; if (!filter(st[i].p)) continue;
      var N = 9, prev = null, r2 = mulberry32(s.seed);
      for (var k = 0; k <= N; k++) { var q = Pa(strandPt(s, k / N)); if (prev) { lines.moveTo(prev.x, prev.y); lines.lineTo(q.x, q.y); } prev = q; }
      if (!pal || sil()) continue;
      var dens = mode === 'bloom' ? 26 * cov : mode === 'leaf' ? 22 : 9;
      dens = dens * DQ;
      var nrm = norm([s.s[0] - t.center[0] + s.out[0], 0.6, s.s[2] - t.center[2] + s.out[2]]), lit = clamp(0.35 + 0.55 * dot(nrm, SUN));
      for (var d = 0; d < dens; d++) {
        var tt = Math.pow(r2(), 0.8), wp = strandPt(s, tt), p = Pa(wp), sz = (mode === 'bloom' ? 0.055 : 0.05) * p.k / Math.sqrt(DQ) * (1.1 - tt * 0.35);
        var jx = (r2() - 0.5) * 0.09 * p.k, jy = (r2() - 0.5) * 0.06 * p.k;
        var l2 = clamp(lit + (r2() - 0.5) * 0.45 - tt * 0.15);
        var bb = Math.min(NB - 1, Math.round(l2 * (NB - 1)));
        var tgt = lm > 0 && r2() < lm ? lpaths[bb] : paths[bb];
        tgt.moveTo(p.x + jx + sz, p.y + jy); tgt.ellipse(p.x + jx, p.y + jy, sz, sz * 0.8, 0, 0, TAU);
      }
    }
    ctx.strokeStyle = sil() ? '#000' : rgb(tc(mode === 'bare' ? [70, 54, 50] : [78, 56, 52], tint)); ctx.lineWidth = sil() ? 0.5 : 0.32; ctx.stroke(lines);
    if (pal && !sil()) for (b = 0; b < NB; b++) { ctx.fillStyle = rgb(tc(pal[b], tint)); ctx.fill(paths[b]); if (lm > 0) { ctx.fillStyle = rgb(tc(FRESH[b], tint)); ctx.fill(lpaths[b]); } }
    if (sk && sk.bloom < 0.35 && sk.bud > 0.05 && !sil()) { // pink buds strung along the bare strands
      var br = mulberry32(t.seed + 9), bp = new Path2D();
      for (i = 0; i < st.length; i++) { if (!filter(st[i].p)) continue; for (var q2 = 0; q2 < 6; q2++) { if (br() > sk.bud) continue; var bq = Pa(strandPt(st[i].s, 0.15 + br() * 0.8)), rb = Math.max(0.3, 0.014 * bq.k); bp.moveTo(bq.x + rb, bq.y); bp.arc(bq.x, bq.y, rb, 0, TAU); } }
      ctx.fillStyle = rgb(tc([214, 140, 160], tint)); ctx.fill(bp);
    }
    if (mode === 'bare' && SEA.snow && !sil()) { /* light frosting on strands */ }
  }
  // crown top cushion (blossom clouds sitting on the limbs)
  function crown(filter) {
    if (mode === 'bare' || cov < 0.1) return;
    var cl = [], r3 = mulberry32(t.seed + 4);
    t.segs.slice(3).forEach(function (s) { for (var k = 0; k < 2; k++) cl.push({ x: lerp(s.a[0], s.b[0], r3()) + (r3() - 0.5) * 0.3, y: lerp(s.a[1], s.b[1], r3()) + 0.12, z: lerp(s.a[2], s.b[2], r3()) + (r3() - 0.5) * 0.3, r: 0.3 + r3() * 0.15, tone: 0 }); });
    var pal = mode === 'bloom' && lm > 0.55 ? FRESH.slice(1, 7) : mode === 'bloom' ? [[156, 112, 128], [198, 152, 168], [226, 186, 200], [242, 212, 222], [252, 234, 240], [255, 247, 249]] : mode === 'leaf' ? [[16, 36, 20], [30, 60, 28], [52, 88, 38], [84, 120, 52], [124, 152, 74], [164, 182, 108]] : [[110, 30, 20], [160, 52, 28], [200, 84, 36], [228, 126, 56], [244, 170, 90], [250, 206, 140]];
    paintFoliage(ctx, cl, { pal: pal, center: t.center, R: t.R, kind: 'oval', dab: 0.05, density: mode === 'autumn' ? 0.6 : 1.3 * (mode === 'bloom' ? cov : 1), max: 160, seed: t.seed + 8, sparse: mode === 'autumn' || cov < 0.5, tint: tint, mass: 0.5 }, filter);
  }
  strands(function (p) { return p.d > cd + 0.3; });
  crown(function (p) { return p.d > cd; });
  drawBranches(ctx, t.segs, bark, 1, SEA.snow ? 0.9 : 0);
  crown(function (p) { return p.d <= cd; });
  strands(function (p) { return p.d <= cd + 0.3; });
}

/* ================= irises & water lilies ================= */
function drawIrisClump(ctx, x, z, s, seed) {
  var mode = SEA.iris, rng = mulberry32(seed), base = P(x, 0, z), k = base.k * s;
  if (mode === 'dry') {
    if (sil()) return;
    ctx.strokeStyle = rgb(tc([150, 126, 84], LIT.foliageTint)); ctx.lineWidth = 0.45; ctx.beginPath();
    for (var d = 0; d < 9; d++) { var bx = base.x + (rng() - 0.5) * 0.35 * k, hh = (0.12 + rng() * 0.18) * k; ctx.moveTo(bx, base.y); ctx.lineTo(bx + (rng() - 0.5) * 0.06 * k, base.y - hh); }
    ctx.stroke(); return;
  }
  var tint = LIT.foliageTint || null, n = 14 + (rng() * 6 | 0), Hh = (mode === 'leaf' ? 0.55 : 0.75) * k;
  var leafPal = mode === 'fade' ? [[70, 80, 34], [120, 120, 50], [176, 150, 70], [196, 170, 96]] : [[24, 50, 22], [44, 84, 32], [76, 120, 46], [128, 160, 72]];
  for (var i = 0; i < n; i++) {
    var bx2 = base.x + (rng() - 0.5) * 0.4 * k, lean = (rng() - 0.5) * 0.5 + (bx2 - base.x) / k * 0.8, L = Hh * (0.6 + rng() * 0.5), w = Math.max(0.5, 0.028 * k);
    var tx = bx2 + lean * L * 0.5, ty = base.y - L;
    var l = clamp(0.3 + 0.4 * rng() + 0.25 * Math.sign(lean) * Math.sign(LS[0]));
    if (sil()) { ctx.fillStyle = '#000'; } else ctx.fillStyle = rgb(tc(ramp(leafPal, l), tint));
    ctx.beginPath(); ctx.moveTo(bx2 - w, base.y); ctx.quadraticCurveTo(bx2 + lean * L * 0.15, base.y - L * 0.6, tx, ty); ctx.quadraticCurveTo(bx2 + lean * L * 0.15 + w * 0.5, base.y - L * 0.55, bx2 + w, base.y); ctx.closePath(); ctx.fill();
  }
  if (mode === 'bloom' && !sil()) {
    var nf = 2 + (rng() * 3 | 0), cols = [[86, 50, 150], [120, 70, 180], [150, 108, 206], [238, 236, 246], [110, 60, 160]];
    for (var f = 0; f < nf; f++) {
      var fx = base.x + (rng() - 0.5) * 0.35 * k, fy = base.y - Hh * (0.95 + rng() * 0.3), r = Math.max(0.8, 0.07 * k), c = cols[(rng() * cols.length) | 0];
      ctx.strokeStyle = rgb(tc([60, 96, 40], tint)); ctx.lineWidth = Math.max(0.4, 0.012 * k); ctx.beginPath(); ctx.moveTo(fx, base.y - Hh * 0.3); ctx.lineTo(fx, fy); ctx.stroke();
      for (var pp = 0; pp < 3; pp++) { var a = -Math.PI / 2 + (pp - 1) * 1.15 + (rng() - 0.5) * 0.3; ctx.fillStyle = rgb(tc(scl(c, 0.85 + pp * 0.1), tint)); ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * r * 0.7, fy + Math.sin(a) * r * 0.45 + r * 0.35, r * 0.62, r * 0.36, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = rgb(tc(mixc(c, [255, 255, 255], 0.3), tint)); ctx.beginPath(); ctx.ellipse(fx, fy - r * 0.15, r * 0.3, r * 0.42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(tc([236, 200, 70], tint)); ctx.fillRect(fx - r * 0.12, fy + r * 0.15, r * 0.24, r * 0.2);
    }
  }
}
function drawLily(ctx, x, z, s, rng, flower) {
  var mode = SEA.lily; if (mode === 'none') return;
  var p = P(x, WL + 0.005, z), r = s * p.k, ry = r * CAM.s * 1.1, a0 = rng() * TAU;
  if (sil()) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, ry, 0, 0, TAU); ctx.fill(); return; }
  var tint = LIT.foliageTint || null, lt = lightTint(1);
  var base = mode === 'fade' ? mixc([96, 104, 48], [150, 110, 54], rng()) : mode === 'pad' ? mixc([70, 112, 46], [110, 140, 60], rng()) : mixc([52, 94, 40], [86, 124, 52], rng());
  ctx.fillStyle = rgb(tc(mulc(scl(base, 0.55), lt), tint)); ctx.beginPath(); ctx.ellipse(p.x + 0.3, p.y + 0.4, r, ry, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(tc(mulc(base, lt), tint)); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.ellipse(p.x, p.y, r, ry, 0, a0 + 0.22, a0 + TAU - 0.22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgb(tc(mulc(mixc(base, [220, 230, 170], 0.4), lt), tint), 0.7); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, ry, 0, a0 + 0.3 + Math.PI, a0 + TAU - 0.3); ctx.stroke();
  if (flower && mode === 'bloom') {
    var fc = rng() < 0.6 ? [240, 150, 180] : [250, 246, 240], fr = r * 0.5;
    for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; ctx.fillStyle = rgb(tc(mulc(scl(fc, 0.9 + 0.1 * Math.sin(a)), lt), tint)); ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * fr * 0.5, p.y - fr * 0.35 + Math.sin(a) * fr * 0.22, fr * 0.42, fr * 0.2, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rgb(tc(mulc([250, 210, 90], lt), tint)); ctx.beginPath(); ctx.arc(p.x, p.y - fr * 0.4, fr * 0.2, 0, TAU); ctx.fill();
  }
}

/* ================= rocks (smooth-shaded meshes) ================= */
function makeRock(seed, cx, cz, rx, ry, rz, o) {
  o = o || {};
  var rng = mulberry32(seed), scr = Math.max(rx, rz) * P(cx, o.by || 0, cz).k * KS;
  var nu = Math.round(clamp(7 + scr * 0.5, 10, (o.nu || 24) * 2.4)), nv = Math.max(5, Math.round(nu * (o.nv || 12) / (o.nu || 24)));
  var flat = o.flat === undefined ? 0.6 : o.flat, off = rng() * 100, amp = o.amp === undefined ? 0.3 : o.amp, by = o.by || 0, outl = o.outline || 0;
  var V = [], j, i;
  for (j = 0; j <= nv; j++) {
    var phi = j / nv * Math.PI * 0.62;
    for (i = 0; i < nu; i++) {
      var th = i / nu * TAU, dx = Math.sin(phi) * Math.cos(th), dy = Math.cos(phi), dz = Math.sin(phi) * Math.sin(th);
      var f = 1 + amp * (NZ.n3(dx * 1.1 + off, dy * 1.1, dz * 1.1) - 0.5) * 2 + amp * 0.35 * (NZ.n3(dx * 2.6 + off, dy * 2.6 + 5, dz * 2.6) - 0.5) * 2;
      if (outl) f *= 1 + outl * (Math.sin(th * 2 + off) * 0.6 + Math.sin(th * 3 + off * 1.7) * 0.4);
      var ey = Math.sign(dy) * Math.pow(Math.abs(dy), flat), tp = 1 - (o.taper || 0) * Math.max(0, ey);
      V.push([cx + dx * rx * f * tp + (o.lean || 0) * Math.max(0, ey) * ry, by + ey * ry * f - ry * 0.12, cz + dz * rz * f * tp]);
    }
  }
  var tris = [];
  for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var a = j * nu + i, b = j * nu + (i + 1) % nu, c = (j + 1) * nu + i, d = (j + 1) * nu + (i + 1) % nu; if (j > 0) tris.push([a, c, b]); tris.push([b, c, d]); }
  var cen = [cx, by + ry * 0.3, cz], VN = V.map(function () { return [0, 0, 0]; });
  var T = tris.map(function (t) {
    var A = V[t[0]], B = V[t[1]], C = V[t[2]], n = norm(cross(sub(B, A), sub(C, A))), cc = mul(add(add(A, B), C), 1 / 3);
    if (dot(n, sub(cc, cen)) < 0) n = mul(n, -1);
    for (var k = 0; k < 3; k++) { var vn = VN[t[k]]; vn[0] += n[0]; vn[1] += n[1]; vn[2] += n[2]; }
    return { v: [A, B, C], idx: t, n: n, c: cc };
  });
  VN = VN.map(norm);
  T.forEach(function (t) { t.sn = norm(add(add(VN[t.idx[0]], VN[t.idx[1]]), VN[t.idx[2]])); });
  return { T: T, cx: cx, cz: cz, rx: rx, ry: ry, rz: rz, by: by, alb: o.alb || [150, 144, 134], moss: o.moss || 0, seed: seed, snowK: o.snowK === undefined ? 1 : o.snowK };
}
function drawRock(ctx, R, mossK) {
  if (mossK === undefined) mossK = 1;
  var rng = mulberry32(R.seed), vis = [], i;
  for (i = 0; i < R.T.length; i++) { var t = R.T[i]; if (!faceVisible(t.c, t.n)) continue; vis.push({ t: t, d: Pa(t.c).d }); }
  vis.sort(function (a, b) { return b.d - a.d; });
  if (sil()) { ctx.fillStyle = '#000'; ctx.beginPath(); for (i = 0; i < vis.length; i++) { var pp0 = vis[i].t.v.map(Pa); ctx.moveTo(pp0[0].x, pp0[0].y); ctx.lineTo(pp0[1].x, pp0[1].y); ctx.lineTo(pp0[2].x, pp0[2].y); ctx.closePath(); } ctx.fill(); return; }
  var all = new Path2D(), snow = SEA.snow * R.snowK, mossC = SEA.moss, buckets = {}, order = [];
  for (i = 0; i < vis.length; i++) {
    var tt = vis[i].t, pp = tt.v.map(Pa), n = tt.sn;
    var alb = scl(R.alb, 0.9 + 0.2 * NZ.n3(tt.c[0] * 2.4, tt.c[1] * 2.4, tt.c[2] * 2.4));
    var mm = R.moss * mossK * sstep(0.4, 0.85, n[1]) * sstep(0.46, 0.68, NZ.n3(tt.c[0] * 2.2 + 9, tt.c[1] * 2.2, tt.c[2] * 2.2) + 0.1 * R.moss);
    alb = mixc(alb, ramp(mossC, 0.55), clamp(mm * 1.1));
    if (snow) alb = mixc(alb, SNOW, sstep(0.42, 0.7, n[1] + (NZ.n3(tt.c[0] * 5, tt.c[1] * 5, tt.c[2] * 5) - 0.5) * 0.3) * snow);
    if (LIT.wet) alb = scl(alb, 1 - 0.26 * LIT.wet);                       // rain darkens the stone
    var col = shade(alb, n), hy = (tt.c[1] - R.by) / (R.ry || 1);
    col = scl(col, 0.6 + 0.4 * clamp(hy * 1.6 + 0.3));
    if (LIT.wet) col = mixc(col, scl(LIT.skyHor, 0.95), sstep(0.55, 1, n[1]) * LIT.wet * 0.42);   // ...and its wet top shines with the sky
    var key = ((col[0] / 2) | 0) + ',' + ((col[1] / 2) | 0) + ',' + ((col[2] / 2) | 0), bk = buckets[key];
    if (!bk) { bk = buckets[key] = { c: col, p: new Path2D() }; order.push(bk); }
    bk.p.moveTo(pp[0].x, pp[0].y); bk.p.lineTo(pp[1].x, pp[1].y); bk.p.lineTo(pp[2].x, pp[2].y); bk.p.closePath();
    all.moveTo(pp[0].x, pp[0].y); all.lineTo(pp[1].x, pp[1].y); all.lineTo(pp[2].x, pp[2].y); all.closePath();
  }
  ctx.lineWidth = 0.5 / Math.sqrt(DQ);
  for (i = 0; i < order.length; i++) { ctx.fillStyle = rgb(order[i].c); ctx.fill(order[i].p); ctx.strokeStyle = ctx.fillStyle; ctx.stroke(order[i].p); }
  ctx.save(); ctx.clip(all);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.5; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  var c0 = P(R.cx, R.by + R.ry * 0.5, R.cz), rr = Math.max(R.rx, R.rz) * c0.k;
  // painterly strata / cracks
  ctx.strokeStyle = 'rgba(30,26,24,0.28)'; ctx.lineWidth = 0.4;
  for (i = 0; i < Math.min(14, rr * 0.5); i++) { var x0 = c0.x + (rng() - 0.5) * rr * 1.6, y0 = c0.y + (rng() - 0.5) * R.ry * c0.k * 1.4, L = rr * (0.15 + rng() * 0.3); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + L * 0.5, y0 + (rng() - 0.5) * 2, x0 + L, y0 + (rng() - 0.5) * 3); ctx.stroke(); }
  for (i = 0; i < rr * rr * 0.08 * DQ; i++) { var x = c0.x + (rng() - 0.5) * rr * 2.2, y = c0.y + (rng() - 0.5) * R.ry * c0.k * 2; ctx.fillStyle = rng() < 0.5 ? 'rgba(214,206,170,0.33)' : 'rgba(40,36,32,0.22)'; ctx.fillRect(x, y, (0.5 + rng() * 0.7) / Math.sqrt(DQ), (0.5 + rng() * 0.5) / Math.sqrt(DQ)); }
  if (R.moss * mossK > 0.05 && !snow) {
    for (i = 0; i < vis.length; i++) {
      var t2 = vis[i].t; if (t2.sn[1] < 0.5) continue;
      var m2 = sstep(0.48, 0.7, NZ.n3(t2.c[0] * 2.2 + 9, t2.c[1] * 2.2, t2.c[2] * 2.2) + 0.1 * R.moss) * R.moss * mossK; if (m2 < 0.2) continue;
      var p = Pa(t2.c);
      for (var k = 0; k < 3; k++) { var l = clamp(0.4 + 0.5 * dot(t2.sn, SUN) + (rng() - 0.5) * 0.4); ctx.fillStyle = rgb(mulc(ramp(mossC, l), lightTint(1)), 0.8); ctx.beginPath(); ctx.arc(p.x + (rng() - 0.5) * 2.5, p.y + (rng() - 0.5) * 1.5, (0.5 + rng() * 0.9) / Math.sqrt(DQ) * 1.2, 0, TAU); ctx.fill(); }
    }
  }
  ctx.restore();
}
function rockAO(ctx, R) { var p = P(R.cx, 0, R.cz); ctx.beginPath(); ctx.ellipse(p.x, p.y, R.rx * p.k * 1.15, R.rz * p.k * CAM.s * 1.25 + 1, 0, 0, TAU); ctx.fill(); }

/* ================= small ground things ================= */
function grassTuft(ctx, x, z, s, rng, pal) {
  if (sil()) return;
  var p = P(x, 0, z), n = 7 + (rng() * 7 | 0), h = s * p.k;
  for (var i = 0; i < n; i++) {
    var a = -Math.PI / 2 + (rng() - 0.5) * 1.6, L = h * (0.6 + rng() * 0.6), bx = p.x + (rng() - 0.5) * h * 0.25, ex = bx + Math.cos(a) * L, ey = p.y + Math.sin(a) * L;
    ctx.strokeStyle = rgb(ramp(pal, rng())); ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(bx, p.y); ctx.quadraticCurveTo(bx + (ex - bx) * 0.2, p.y - L * 0.6, ex, ey); ctx.stroke();
  }
}
function leafShape(ctx, x, y, s, a, flat, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (var j = 0; j < MOMIJI.length; j++) { var q = MOMIJI[j], t = a + q[0], r = s * q[1], px = x + Math.cos(t) * r, py = y + Math.sin(t) * r * flat; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fill();
}
function petalShape(ctx, x, y, s, a, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.6, a, 0, TAU); ctx.fill(); }

/* ---- 04_build.js ---- */
/* ================= prisms ================= */
function snowAlb(alb, ny, k) { if (!SEA.snow || k === 0) return alb; return mixc(alb, SNOW, sstep(0.3, 0.62, ny) * SEA.snow * (k === undefined ? 1 : k)); }
function prism(ctx, cx, cz, y0, y1, r0, r1, n, rot, alb, o) {
  o = o || {};
  var B = [], T = [], i;
  for (i = 0; i < n; i++) { var a = rot + i * TAU / n; B.push([cx + Math.cos(a) * r0, y0, cz + Math.sin(a) * r0]); T.push([cx + Math.cos(a) * r1, y1, cz + Math.sin(a) * r1]); }
  var faces = [], slope = (r0 - r1) / ((y1 - y0) || 1);
  for (i = 0; i < n; i++) { var j = (i + 1) % n, am = rot + (i + 0.5) * TAU / n, nr = norm([Math.cos(am), slope, Math.sin(am)]); faces.push({ pts: [B[i], B[j], T[j], T[i]], n: nr, c: mul(add(add(B[i], B[j]), add(T[i], T[j])), 0.25), i: i }); }
  if (r1 > 0.001) faces.push({ pts: T, n: [0, 1, 0], c: [cx, y1, cz], top: true });
  faces.push({ pts: B, n: [0, -1, 0], c: [cx, y0, cz] });
  var vis = faces.filter(function (f) { return faceVisible(f.c, f.n); }).map(function (f) { return { f: f, d: Pa(f.c).d }; }).sort(function (a, b) { return b.d - a.d; });
  var all = new Path2D(), out = [];
  for (i = 0; i < vis.length; i++) {
    var f = vis[i].f, pp = f.pts.map(Pa), path = new Path2D();
    pp.forEach(function (p, k) { if (k) path.lineTo(p.x, p.y); else path.moveTo(p.x, p.y); }); path.closePath();
    var col;
    if (sil()) col = [0, 0, 0];
    else { var al = o.albFn ? o.albFn(f) : alb; if (f.top && o.topAlb) al = o.topAlb; al = snowAlb(al, f.n[1], o.snow); col = shade(al, f.n, o); }
    ctx.fillStyle = rgb(col); ctx.fill(path); if (!sil()) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.45; ctx.stroke(path); }
    all.addPath(path); out.push({ f: f, pp: pp });
  }
  if (o.tex && !sil()) grainClip(ctx, all, o.tex);
  return { all: all, out: out };
}
function mossDabs(ctx, pts3, count, rng, amt) {
  if (sil() || SEA.snow) return;
  var pp = pts3.map(Pa), cx = 0, cy = 0;
  pp.forEach(function (p) { cx += p.x; cy += p.y; }); cx /= pp.length; cy /= pp.length;
  for (var i = 0; i < count; i++) {
    var a = rng(), b = rng(), ia = Math.floor(a * pp.length), ib = (ia + 1) % pp.length, c = pp[ia], d = pp[ib], t = rng();
    var ex = lerp(c.x, d.x, t), ey = lerp(c.y, d.y, t), f = Math.pow(b, 0.6), x = lerp(cx, ex, f), y = lerp(cy, ey, f);
    if (NZ.n2(x * 0.4, y * 0.4) > 0.62 - 0.25 * amt) continue;
    ctx.fillStyle = rgb(mulc(ramp(SEA.moss, clamp(0.35 + 0.4 * rng() + (cx < x ? 0.15 : 0))), lightTint(1)), 0.9); ctx.beginPath(); ctx.arc(x, y, 0.45 + rng() * 0.75, 0, TAU); ctx.fill();
  }
}
function addGlow(c, r, a, refl) { if (MODE === 'n') GLOWS.push({ x: c.x, y: c.y, r: r, a: a }); else if (MODE === 'm' && refl) GLOWS.push({ x: c.x, y: c.y, r: r * 0.6, a: a * 0.4, refl: true }); }
var LAMP_ON = [255, 196, 110], LAMP_OFF = [30, 26, 24];

/* ================= lanterns ================= */
function drawLantern(ctx, L, lit) {
  var x = L.x, z = L.z, st = [150, 146, 136], rot = Math.PI / 6 + 0.25, O = { tex: 0.5 };
  var b1 = prism(ctx, x, z, -0.02, 0.15, 0.3, 0.29, 6, rot, st, O);
  prism(ctx, x, z, 0.15, 0.22, 0.29, 0.2, 6, rot, st, O);
  prism(ctx, x, z, 0.22, 0.95, 0.085, 0.08, 14, 0, mul(st, 0.98), O);
  prism(ctx, x, z, 0.56, 0.6, 0.1, 0.1, 14, 0, st, O);
  prism(ctx, x, z, 0.95, 1.06, 0.12, 0.29, 6, rot, st, O);
  var cd = prism(ctx, x, z, 1.06, 1.12, 0.29, 0.29, 6, rot, st, O);
  var fb = prism(ctx, x, z, 1.12, 1.42, 0.2, 0.2, 6, rot, st, O);
  fb.out.forEach(function (q) {
    var f = q.f; if (f.top || Math.abs(f.n[1]) > 0.5 || sil()) return;
    var A = f.pts, qq = function (u, v) { var b = mixc(A[0], A[1], u), t = mixc(A[3], A[2], u); return Pa(mixc(b, t, v)); };
    poly(ctx, [qq(0.22, 0.18), qq(0.78, 0.18), qq(0.78, 0.85), qq(0.22, 0.85)]); ctx.fillStyle = lit ? rgb(LAMP_ON) : rgb(LAMP_OFF); ctx.fill();
    if (lit) { ctx.fillStyle = 'rgba(255,236,190,0.9)'; var c = qq(0.5, 0.45); ctx.beginPath(); ctx.arc(c.x, c.y, 0.9, 0, TAU); ctx.fill(); addGlow(c, 18, 0.9, true); }
  });
  prism(ctx, x, z, 1.42, 1.47, 0.45, 0.46, 6, rot, mul(st, 0.95), O);
  var rf = prism(ctx, x, z, 1.47, 1.6, 0.46, 0.2, 6, rot, st, O);
  prism(ctx, x, z, 1.6, 1.67, 0.2, 0.07, 6, rot, st, O);
  if (!sil()) {
    for (var i = 0; i < 6; i++) {
      var a = rot + i * TAU / 6, p0 = P(x + Math.cos(a) * 0.46, 1.47, z + Math.sin(a) * 0.46), p1 = P(x + Math.cos(a) * 0.53, 1.56, z + Math.sin(a) * 0.53);
      ctx.strokeStyle = rgb(shade(snowAlb(st, 0.7), [Math.cos(a), 0.4, Math.sin(a)])); ctx.lineWidth = Math.max(1, 0.05 * p0.k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(p1.x, p0.y, p1.x, p1.y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  prism(ctx, x, z, 1.67, 1.71, 0.055, 0.06, 10, 0, st, O);
  prism(ctx, x, z, 1.71, 1.78, 0.06, 0.085, 10, 0, st, O);
  prism(ctx, x, z, 1.78, 1.9, 0.085, 0.0, 10, 0, st, O);
  if (SEA.snow && !sil()) snowCap(ctx, x, 1.6, z, 0.36, 0.07);
  var r2 = mulberry32(5);
  rf.out.forEach(function (q) { mossDabs(ctx, q.f.pts, 40, r2, 1); });
  cd.out.forEach(function (q) { if (q.f.top) mossDabs(ctx, q.f.pts, 30, r2, 1); });
  b1.out.forEach(function (q) { mossDabs(ctx, q.f.pts, 26, r2, 0.9); });
}
/* a soft rounded cushion of snow sitting on a cap */
function snowCap(ctx, x, y, z, r, h) {
  var c = P(x, y, z), rx = r * c.k, ry = r * c.k * CAM.s * 1.05, hh = h * c.k, sc = mulc(SNOW, lightTint(1));
  ctx.fillStyle = rgb(scl(sc, 0.78)); ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(sc); ctx.beginPath(); ctx.ellipse(c.x - rx * 0.05, c.y - hh * 0.6, rx * 0.92, ry * 0.8 + hh * 0.4, 0, 0, TAU); ctx.fill();
}
function smallLantern(ctx, x, z, lit) {
  var st = [140, 136, 126], O = { tex: 0.45 }, rot = 0.3;
  prism(ctx, x, z, -0.02, 0.08, 0.16, 0.15, 4, rot, st, O);
  prism(ctx, x, z, 0.08, 0.3, 0.06, 0.06, 4, rot, st, O);
  var fb = prism(ctx, x, z, 0.3, 0.5, 0.13, 0.13, 4, rot, st, O);
  fb.out.forEach(function (q) {
    var f = q.f; if (f.n[1] !== 0 || sil()) return;
    var A = f.pts, qq = function (u, v) { var b = mixc(A[0], A[1], u), t = mixc(A[3], A[2], u); return Pa(mixc(b, t, v)); };
    poly(ctx, [qq(0.25, 0.2), qq(0.75, 0.2), qq(0.75, 0.82), qq(0.25, 0.82)]); ctx.fillStyle = lit ? 'rgb(255,200,120)' : 'rgb(32,28,26)'; ctx.fill();
    if (lit) addGlow(qq(0.5, 0.5), 12, 0.75, true);
  });
  var rf = prism(ctx, x, z, 0.5, 0.64, 0.27, 0.04, 4, rot, st, O);
  prism(ctx, x, z, 0.64, 0.72, 0.045, 0.0, 8, 0, st, O);
  if (SEA.snow && !sil()) snowCap(ctx, x, 0.62, z, 0.2, 0.05);
  var r2 = mulberry32(9); rf.out.forEach(function (q) { mossDabs(ctx, q.f.pts, 24, r2, 1); });
}

/* ================= taiko bridge ================= */
function drawBridge(ctx) {
  var x0 = BRIDGE.x0, x1 = BRIDGE.x1, zc = BRIDGE.zc, L = x1 - x0, Hh = 0.92, w = 1.1, zF = zc - w / 2, zB = zc + w / 2;
  function arch(t) { return Hh * Math.pow(Math.sin(Math.PI * clamp(t)), 0.72); }
  var ver = [198, 58, 34], N = 36, S = sil();
  function vC(n) { return S ? [0, 0, 0] : shade(ver, n); }
  [zB, zF].forEach(function (zz) { [0.24, 0.5, 0.76].forEach(function (t) { var x = x0 + L * t, y = arch(t) - 0.22; prism(ctx, x, zz, WL - 0.1, y, 0.06, 0.06, 8, 0, [150, 44, 30], { snow: 0 }); }); });
  function rail(zz, front) {
    var posts = 9, i;
    for (i = 0; i < posts; i++) {
      var t = 0.04 + i * (0.92 / (posts - 1)), x = x0 + L * t, y = arch(t);
      prism(ctx, x, zz, y, y + 0.74, 0.045, 0.045, 6, 0, ver);
      if (i === 0 || i === posts - 1) { prism(ctx, x, zz, y + 0.74, y + 0.82, 0.055, 0.06, 8, 0, [60, 50, 40]); prism(ctx, x, zz, y + 0.82, y + 0.94, 0.06, 0.0, 8, 0, [150, 120, 60]); }
    }
    [[0.7, 0.06], [0.4, 0.04], [0.12, 0.035]].forEach(function (rr, ri) {
      var dy = rr[0], th = rr[1], top = [], bot = [];
      for (var k = 0; k <= N; k++) { var t2 = 0.04 + 0.92 * k / N, x2 = x0 + L * t2, y2 = arch(t2) + dy; top.push(P(x2, y2 + th / 2, zz)); bot.push(P(x2, y2 - th / 2, zz)); }
      poly(ctx, top.concat(bot.slice().reverse())); ctx.fillStyle = rgb(vC([0, 0.3, front ? -1 : 1])); ctx.fill();
      if (!S) {
        ctx.strokeStyle = SEA.snow && ri === 0 ? rgb(mulc(SNOW, lightTint(1))) : rgb(scl(vC([0, 0.8, -0.5]), 1.25)); ctx.lineWidth = SEA.snow && ri === 0 ? 0.9 : 0.5;
        ctx.beginPath(); top.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y - (SEA.snow && ri === 0 ? 0.3 : 0)); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
      }
    });
  }
  for (var i = 0; i < N; i++) {
    var ta = i / N, tb = (i + 1) / N, xa = x0 + L * ta, xb = x0 + L * tb, ya = arch(ta), yb = arch(tb);
    var nrm = norm([-(yb - ya), (xb - xa), 0]), alb = mixc([120, 100, 80], [150, 128, 100], hash2(i, 3));
    alb = snowAlb(alb, nrm[1] * 0.9);
    quad3(ctx, [[xa, ya, zF], [xb, yb, zF], [xb, yb, zB], [xa, ya, zB]], S ? [0, 0, 0] : shade(alb, nrm), 0.5);
  }
  if (!S && !SEA.snow) { ctx.strokeStyle = 'rgba(50,36,28,0.45)'; ctx.lineWidth = 0.4; for (i = 1; i < N; i++) { var t = i / N, x = x0 + L * t, y = arch(t), a = P(x, y, zF), b = P(x, y, zB); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  rail(zB, false);
  var top = [], bot = [];
  for (i = 0; i <= N; i++) { var t3 = i / N, x3 = x0 + L * t3, y3 = arch(t3); top.push(P(x3, y3 + 0.02, zF - 0.02)); bot.push(P(x3, y3 - 0.26 * (0.6 + 0.4 * Math.sin(Math.PI * t3)), zF - 0.02)); }
  poly(ctx, top.concat(bot.slice().reverse())); ctx.fillStyle = rgb(vC([0, 0, -1])); ctx.fill();
  if (!S) {
    ctx.save(); poly(ctx, top.concat(bot.slice().reverse())); ctx.clip();
    ctx.strokeStyle = rgb(scl(vC([0, 0.6, -0.8]), 1.15)); ctx.lineWidth = 1.1; ctx.beginPath(); top.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y + 0.6); else ctx.moveTo(p.x, p.y + 0.6); }); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,10,8,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); bot.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y - 0.5); else ctx.moveTo(p.x, p.y - 0.5); }); ctx.stroke();
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.25; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  rail(zF, true);
}

/* ================= teahouse ================= */
function thatchFace(ctx, E0, E1, R0, R1, n, rng, o) {
  o = o || {};
  var pp = [E0, E1, R1, R0].map(Pa); poly(ctx, pp);
  if (sil()) { ctx.fillStyle = '#000'; ctx.fill(); return; }
  var snow = SEA.snow;
  var base = shade(snow ? [222, 226, 232] : [150, 126, 88], n); ctx.fillStyle = rgb(base); ctx.fill(); ctx.strokeStyle = rgb(base); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.save(); poly(ctx, pp); ctx.clip();
  var NB = 8, paths = [], b; for (b = 0; b < NB; b++) paths.push(new Path2D());
  var cnt = (o.cnt || 2600) * DQ * (snow ? 0.35 : 1);
  for (var i = 0; i < cnt; i++) {
    var u = rng(), v = snow ? rng() * 0.18 : rng(), a = mixc(mixc(E0, E1, u), mixc(R0, R1, u), v), up = sub(mixc(R0, R1, u), mixc(E0, E1, u)), bb = add(a, mul(up, 0.07 + rng() * 0.06));
    var pa = Pa(a), pb = Pa(bb), nn = NZ.n2(a[0] * 2.5, a[2] * 2.5 + a[1] * 2.5), l = clamp(0.25 + 0.5 * nn + (rng() - 0.5) * 0.5 - 0.25 * (1 - v) * 0.3), ix = Math.min(NB - 1, (l * NB) | 0);
    paths[ix].moveTo(pa.x, pa.y); paths[ix].lineTo(pb.x, pb.y);
  }
  var pal = [[70, 58, 42], [96, 80, 58], [120, 100, 70], [142, 120, 84], [160, 138, 96], [176, 154, 110], [194, 172, 126], [214, 194, 146]];
  for (b = 0; b < NB; b++) { ctx.strokeStyle = rgb(shade(pal[b], n, { amb: 1.15 })); ctx.lineWidth = 0.5 / Math.sqrt(DQ) * 1.2; ctx.stroke(paths[b]); }
  if (snow) {
    // soft snow texture: faint bluish undulations
    for (i = 0; i < 260 * DQ; i++) { var u2 = rng(), v2 = 0.15 + rng() * 0.85, a2 = mixc(mixc(E0, E1, u2), mixc(R0, R1, u2), v2), p2 = Pa(a2); ctx.fillStyle = rng() < 0.5 ? 'rgba(170,186,214,0.18)' : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(p2.x, p2.y, 2 + rng() * 3, 0.6 + rng(), 0, 0, TAU); ctx.fill(); }
  } else {
    for (i = 0; i < cnt * 0.06; i++) { var u3 = rng(), v3 = rng() * 0.7, a3 = mixc(mixc(E0, E1, u3), mixc(R0, R1, u3), v3); if (NZ.n2(a3[0] * 1.6 + 3, a3[2] * 1.6 + a3[1]) < 0.6) continue; var p3 = Pa(a3); ctx.fillStyle = rgb(shade([84, 100, 52], n), 0.7); ctx.beginPath(); ctx.arc(p3.x, p3.y, 0.6 + rng() * 0.8, 0, TAU); ctx.fill(); }
  }
  var pe = Pa(mixc(E0, E1, 0.5)), pr = Pa(mixc(R0, R1, 0.5)), gr = ctx.createLinearGradient(pe.x, pe.y, pr.x, pr.y);
  gr.addColorStop(0, 'rgba(30,20,10,0.18)'); gr.addColorStop(1, 'rgba(30,20,10,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function drawTeahouse(ctx, glow) {
  var X0 = TH.X0, X1 = TH.X1, ZE = TH.ZE, ZW = TH.ZW, ZB = TH.ZB, FH = TH.FH, WT = TH.WT, EY = TH.EY, RY = TH.RY, ov = TH.ov;
  var rng = mulberry32(41), S = sil();
  var wood = [92, 70, 52], plaster = [190, 160, 118], shoji = glow ? [255, 222, 160] : [232, 226, 208];
  function col(a, n) { return S ? [0, 0, 0] : shade(a, n); }
  function lampCol(c) { return S ? [0, 0, 0] : c; }
  quad3(ctx, [[X0, 0, ZE + 0.05], [X1, 0, ZE + 0.05], [X1, FH, ZE + 0.05], [X0, FH, ZE + 0.05]], S ? [0, 0, 0] : scl([34, 30, 28], LIT.lit ? 0.7 : 1));
  quad3(ctx, [[X1, 0, ZE + 0.05], [X1, 0, ZB], [X1, FH, ZB], [X1, FH, ZE + 0.05]], S ? [0, 0, 0] : [44, 38, 34]);
  if (!S) [X0 + 0.1, X0 + 1.05, X0 + 2.0, X1 - 0.1].forEach(function (xx) { drawRock(ctx, makeRock(900 + (xx * 10 | 0), xx, ZE + 0.12, 0.13, 0.18, 0.1, { nu: 12, nv: 6, flat: 0.5, amp: 0.2 }), 0); });
  var nR = [1, 0, 0], nF = [0, 0, -1];
  quad3(ctx, [[X1, FH, ZW], [X1, FH, ZB], [X1, WT, ZB], [X1, WT, ZW]], col(plaster, nR));
  if (!S) {
    quad3(ctx, [[X1 + 0.01, FH + 0.08, ZW + 0.5], [X1 + 0.01, FH + 0.08, ZW + 1.15], [X1 + 0.01, FH + 0.78, ZW + 1.15], [X1 + 0.01, FH + 0.78, ZW + 0.5]], shade([110, 84, 60], nR));
    quad3(ctx, [[X1 + 0.01, 1.3, ZW + 1.35], [X1 + 0.01, 1.3, ZB - 0.2], [X1 + 0.01, 1.85, ZB - 0.2], [X1 + 0.01, 1.85, ZW + 1.35]], glow ? [250, 200, 130] : shade([70, 60, 48], nR));
    if (glow) addGlow(P(X1, 1.58, (ZW + ZB) / 2), 14, 0.5, true);
    ctx.strokeStyle = rgb(shade([150, 130, 90], nR)); ctx.lineWidth = 0.5;
    for (var i = 1; i < 6; i++) { var zz = lerp(ZW + 1.35, ZB - 0.2, i / 6), a = P(X1 + 0.02, 1.3, zz), b = P(X1 + 0.02, 1.85, zz); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    [ZW, ZW + 1.0, ZB].forEach(function (zz2) { quad3(ctx, [[X1 + 0.02, FH, zz2 - 0.05], [X1 + 0.02, FH, zz2 + 0.05], [X1 + 0.02, WT, zz2 + 0.05], [X1 + 0.02, WT, zz2 - 0.05]], shade(wood, nR)); });
    texOverlay(ctx, function () { poly(ctx, [[X1, FH, ZW], [X1, FH, ZB], [X1, WT, ZB], [X1, WT, ZW]].map(Pa)); }, 0.4);
  }
  quad3(ctx, [[X0, FH, ZW], [X1, FH, ZW], [X1, WT, ZW], [X0, WT, ZW]], col(plaster, nF));
  if (!S) {
    texOverlay(ctx, function () { poly(ctx, [[X0, FH, ZW], [X1, FH, ZW], [X1, WT, ZW], [X0, WT, ZW]].map(Pa)); }, 0.4);
    var wc = P(X0 + 0.48, 1.45, ZW - 0.01), r = 0.28 * wc.k;
    ctx.fillStyle = glow ? 'rgb(255,214,150)' : rgb(shade([200, 190, 168], nF)); ctx.beginPath(); ctx.ellipse(wc.x, wc.y, r, r, 0, 0, TAU); ctx.fill();
    if (glow) addGlow(wc, 12, 0.5, true);
    ctx.strokeStyle = rgb(shade([120, 100, 70], nF)); ctx.lineWidth = 0.5;
    for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(wc.x + k * r * 0.38, wc.y - r * Math.sqrt(1 - Math.pow(k * 0.38, 2))); ctx.lineTo(wc.x + k * r * 0.38, wc.y + r * Math.sqrt(1 - Math.pow(k * 0.38, 2))); ctx.stroke(); }
    ctx.strokeStyle = rgb(shade([90, 70, 50], nF)); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(wc.x, wc.y, r, r, 0, 0, TAU); ctx.stroke();
    var sx0 = X0 + 0.98, sx1 = X1 - 0.05, np = 4;
    for (var q = 0; q < np; q++) {
      var a2 = lerp(sx0, sx1, q / np) + 0.02, b2 = lerp(sx0, sx1, (q + 1) / np) - 0.02;
      quad3(ctx, [[a2, FH + 0.3, ZW - 0.01], [b2, FH + 0.3, ZW - 0.01], [b2, 2.0, ZW - 0.01], [a2, 2.0, ZW - 0.01]], glow ? shoji : shade(shoji, nF, { amb: 1.2 }));
      quad3(ctx, [[a2, FH + 0.02, ZW - 0.01], [b2, FH + 0.02, ZW - 0.01], [b2, FH + 0.3, ZW - 0.01], [a2, FH + 0.3, ZW - 0.01]], shade([130, 104, 76], nF));
      ctx.strokeStyle = glow ? 'rgba(120,80,40,0.75)' : rgb(shade([150, 130, 100], nF)); ctx.lineWidth = 0.4;
      for (var m = 1; m < 3; m++) { var xx = lerp(a2, b2, m / 3), p = P(xx, FH + 0.3, ZW - 0.02), p2 = P(xx, 2.0, ZW - 0.02); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
      for (m = 1; m < 6; m++) { var yy = lerp(FH + 0.3, 2.0, m / 6), p3 = P(a2, yy, ZW - 0.02), p4 = P(b2, yy, ZW - 0.02); ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke(); }
      if (glow) addGlow(P((a2 + b2) / 2, 1.3, ZW), 24, 0.55, true);
    }
    quad3(ctx, [[X0, 2.0, ZW - 0.03], [X1, 2.0, ZW - 0.03], [X1, 2.1, ZW - 0.03], [X0, 2.1, ZW - 0.03]], shade(wood, nF));
    [X0, X0 + 0.97, X1].forEach(function (x2) { quad3(ctx, [[x2 - 0.06, FH, ZW - 0.04], [x2 + 0.06, FH, ZW - 0.04], [x2 + 0.06, WT, ZW - 0.04], [x2 - 0.06, WT, ZW - 0.04]], shade([84, 62, 46], nF)); });
  }
  quad3(ctx, [[X0 - 0.05, FH, ZE], [X1 + 0.05, FH, ZE], [X1 + 0.05, FH, ZW], [X0 - 0.05, FH, ZW]], col(glow ? [170, 140, 104] : [150, 126, 98], [0, 1, 0]));
  quad3(ctx, [[X0 - 0.05, FH - 0.09, ZE], [X1 + 0.05, FH - 0.09, ZE], [X1 + 0.05, FH, ZE], [X0 - 0.05, FH, ZE]], col([110, 86, 64], nF));
  if (!S) { ctx.strokeStyle = 'rgba(60,44,32,0.4)'; ctx.lineWidth = 0.35; for (var e = 1; e < 5; e++) { var z5 = lerp(ZE, ZW, e / 5), a5 = P(X0, FH, z5), b5 = P(X1, FH, z5); ctx.beginPath(); ctx.moveTo(a5.x, a5.y); ctx.lineTo(b5.x, b5.y); ctx.stroke(); } }
  [X0 + 0.05, X1 - 0.05].forEach(function (x6) { prism(ctx, x6, ZE + 0.06, FH, EY, 0.05, 0.05, 8, 0, [90, 70, 52], { snow: 0 }); });
  var xL = X0 - ov, xR = X1 + ov, zF = ZE - 0.25, zBk = ZB + ov, zr = (zF + zBk) / 2, hw = (zBk - zF) / 2, rxL = xL + hw * 0.95, rxR = xR - hw * 0.95;
  var EFL = [xL, EY, zF], EFR = [xR, EY, zF], EBR = [xR, EY, zBk], EBL = [xL, EY, zBk], RL = [rxL, RY, zr], RR = [rxR, RY, zr];
  var nFr = norm(cross(sub(EFR, EFL), sub(RL, EFL))), nFront = nFr[1] < 0 ? mul(nFr, -1) : nFr;
  var nRt = norm(cross(sub(EBR, EFR), sub(RR, EFR))), nRight = nRt[1] < 0 ? mul(nRt, -1) : nRt;
  function band(a, b, n) {
    var d = 0.32, pa = [a[0], a[1] - d, a[2]], pb = [b[0], b[1] - d, b[2]], inn = n[0] ? [-0.12, 0, 0] : [0, 0, 0.12];
    var pts = [a, b, add(pb, inn), add(pa, inn)], pp = quad3(ctx, pts, S ? [0, 0, 0] : shade([170, 146, 104], n[0] ? [1, 0, 0] : [0, 0, -1], { amb: 1.1 }));
    if (!S) {
      ctx.save(); poly(ctx, pp); ctx.clip(); ctx.strokeStyle = 'rgba(80,60,36,0.45)'; ctx.lineWidth = 0.4;
      for (var i2 = 0; i2 < 160 * DQ; i2++) { var u = rng(), p5 = Pa(mixc(a, b, u)), q5 = Pa(mixc(add(pa, inn), add(pb, inn), u)); ctx.beginPath(); ctx.moveTo(p5.x, p5.y); ctx.lineTo(q5.x + (rng() - 0.5), q5.y); ctx.stroke(); }
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.4; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.restore();
      var q0 = Pa(add(pa, inn)), q1 = Pa(add(pb, inn)); ctx.strokeStyle = 'rgba(30,22,16,0.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
      if (SEA.snow) { var s0 = Pa(a), s1 = Pa(b); ctx.strokeStyle = rgb(mulc(SNOW, lightTint(1))); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s0.x, s0.y - 0.4); ctx.lineTo(s1.x, s1.y - 0.4); ctx.stroke(); ctx.lineCap = 'butt'; }
    }
  }
  if (faceVisible([xL - 0.1, EY, (zF + zBk) / 2], [-1, 0, 0])) { thatchFace(ctx, EBL, EFL, RL, RL, norm([-0.7, 0.7, 0]), rng, { cnt: 1400 }); band(EBL, EFL, [-1, 0, 0]); }
  thatchFace(ctx, EFR, EBR, RR, RR, nRight, rng, { cnt: 1800 });
  thatchFace(ctx, EFL, EFR, RL, RR, nFront, rng, { cnt: 3200 });
  band(EFL, EFR, [0, 0, -1]); band(EFR, EBR, [1, 0, 0]);
  var ra = P(rxL - 0.15, RY + 0.06, zr), rb = P(rxR + 0.15, RY + 0.06, zr);
  ctx.lineCap = 'round'; ctx.strokeStyle = S ? '#000' : (SEA.snow ? rgb(mulc([200, 204, 212], lightTint(1))) : 'rgb(58,44,32)'); ctx.lineWidth = 0.22 * ra.k; ctx.beginPath(); ctx.moveTo(ra.x, ra.y); ctx.lineTo(rb.x, rb.y); ctx.stroke();
  if (!S) {
    ctx.strokeStyle = SEA.snow ? 'rgba(255,255,255,0.9)' : 'rgba(150,120,84,0.8)'; ctx.lineWidth = 0.05 * ra.k; ctx.beginPath(); ctx.moveTo(ra.x, ra.y - 0.07 * ra.k); ctx.lineTo(rb.x, rb.y - 0.07 * ra.k); ctx.stroke();
    for (var g = 0; g < 6; g++) { var x7 = lerp(rxL - 0.05, rxR + 0.05, g / 5), p7 = P(x7, RY + 0.06, zr), q7 = P(x7, RY + 0.06, zr - 0.22); ctx.strokeStyle = 'rgb(40,32,26)'; ctx.lineWidth = 0.06 * ra.k; ctx.beginPath(); ctx.moveTo(p7.x, p7.y - 0.1 * ra.k); ctx.lineTo(q7.x, q7.y + 0.06 * ra.k); ctx.stroke(); }
  }
  ctx.lineCap = 'butt';
  if (!S) { ctx.strokeStyle = 'rgba(60,46,30,0.55)'; ctx.lineWidth = 1; var a8 = Pa(EFR), b8 = Pa(RR); ctx.beginPath(); ctx.moveTo(a8.x, a8.y); ctx.lineTo(b8.x, b8.y); ctx.stroke(); }
}

/* ================= bamboo fence ================= */
function bamboo(ctx, a, b, r, col) {
  col = col || [176, 160, 92];
  var pa = Pa(a), pb = Pa(b), w = Math.max(0.8, r * 2 * pa.k); ctx.lineCap = 'round';
  if (sil()) { ctx.strokeStyle = '#000'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.lineCap = 'butt'; return; }
  var lt = lightTint(0.6), c = mulc(col, lt);
  ctx.strokeStyle = rgb(scl(c, 0.62)); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  var dx = pb.x - pa.x, dy = pb.y - pa.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; if (nx * LS[0] + ny * LS[1] < 0) { nx = -nx; ny = -ny; }
  ctx.strokeStyle = rgb(c); ctx.lineWidth = w * 0.55; ctx.beginPath(); ctx.moveTo(pa.x + nx * w * 0.18, pa.y + ny * w * 0.18); ctx.lineTo(pb.x + nx * w * 0.18, pb.y + ny * w * 0.18); ctx.stroke();
  ctx.strokeStyle = rgb(mixc(c, mulc([255, 245, 200], lt), 0.5)); ctx.lineWidth = w * 0.18; ctx.beginPath(); ctx.moveTo(pa.x + nx * w * 0.3, pa.y + ny * w * 0.3); ctx.lineTo(pb.x + nx * w * 0.3, pb.y + ny * w * 0.3); ctx.stroke();
  // nodes
  var nn = Math.floor(L / Math.max(4, w * 4));
  ctx.strokeStyle = rgb(scl(c, 0.5)); ctx.lineWidth = Math.max(0.3, w * 0.12);
  for (var i = 1; i < nn; i++) { var t = i / nn, x = pa.x + dx * t, y = pa.y + dy * t; ctx.beginPath(); ctx.moveTo(x - nx * w * 0.5, y - ny * w * 0.5); ctx.lineTo(x + nx * w * 0.5, y + ny * w * 0.5); ctx.stroke(); }
  ctx.lineCap = 'butt';
}
function drawFence(ctx, gap) {
  var zf = LAY.fenceZ, x0 = LX(-9.5), x1 = LX(10.5), Hh = 1.72, rng = mulberry32(12), S = sil(), n = [0, 0, -1];
  var segs = gap ? [[x0, gap[0]], [gap[1], x1]] : [[x0, x1]];
  segs.forEach(function (sg) {
    var a = sg[0], b = sg[1];
    if (S) { quad3(ctx, [[a, 0, zf], [b, 0, zf], [b, Hh + 0.1, zf], [a, Hh + 0.1, zf]], [0, 0, 0]); return; }
    for (var x = a; x < b; x += 0.075) {
      var xb = Math.min(b, x + 0.073), v = rng(), alb = mixc([150, 130, 84], [196, 176, 118], v);
      alb = mixc(alb, [132, 124, 100], clamp(NZ.n2(x * 0.7, 4.2) * 1.2 - 0.3) * 0.7);
      quad3(ctx, [[x, 0, zf], [xb, 0, zf], [xb, Hh, zf], [x, Hh, zf]], shade(alb, n, { amb: 1.05 }), 0.3);
      quad3(ctx, [[x + 0.04, 0.02, zf - 0.001], [xb - 0.005, 0.02, zf - 0.001], [xb - 0.005, Hh, zf - 0.001], [x + 0.04, Hh, zf - 0.001]], shade(mixc(alb, [230, 214, 160], 0.35), [0.5, 0.2, -0.8]), 0);
      if (rng() < 0.8) { var yy = 0.2 + rng() * 1.3, p = P(x, yy, zf), q = P(xb, yy, zf); ctx.strokeStyle = 'rgba(70,56,30,0.5)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    }
    ctx.save(); poly(ctx, [[a, 0, zf], [b, 0, zf], [b, Hh, zf], [a, Hh, zf]].map(Pa)); ctx.clip(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; var gb = P(a, 0, zf), gt = P(a, 0.5, zf), g = ctx.createLinearGradient(0, gb.y, 0, gt.y);
    g.addColorStop(0, SEA.snow ? 'rgba(230,236,246,0.85)' : 'rgba(40,30,20,0.45)'); g.addColorStop(1, SEA.snow ? 'rgba(230,236,246,0)' : 'rgba(40,30,20,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    [0.32, 0.9, 1.48].forEach(function (y) {
      var t = 0.075;
      quad3(ctx, [[a, y + t / 2, zf - 0.05], [b, y + t / 2, zf - 0.05], [b, y - t / 2, zf - 0.05], [a, y - t / 2, zf - 0.05]], shade([170, 150, 98], [0, 0.2, -1]));
      var p0 = P(a, y + t / 2, zf - 0.05), p1 = P(b, y + t / 2, zf - 0.05); ctx.strokeStyle = SEA.snow ? rgb(mulc(SNOW, lightTint(1))) : rgb(shade([215, 196, 140], [0.3, 1, -0.5])); ctx.lineWidth = SEA.snow ? 0.9 : 0.5; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      var q0 = P(a, y - t / 2, zf - 0.05), q1 = P(b, y - t / 2, zf - 0.05); ctx.strokeStyle = 'rgba(50,36,20,0.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
      for (var x2 = a + 0.2; x2 < b; x2 += 0.45) { var c = P(x2, y, zf - 0.06), s = Math.max(0.8, 0.035 * c.k); ctx.strokeStyle = 'rgb(26,22,20)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(c.x - s, c.y - s); ctx.lineTo(c.x + s, c.y + s); ctx.moveTo(c.x + s, c.y - s); ctx.lineTo(c.x - s, c.y + s); ctx.stroke(); }
    });
    quad3(ctx, [[a, Hh + 0.1, zf - 0.02], [b, Hh + 0.1, zf - 0.02], [b, Hh - 0.02, zf - 0.02], [a, Hh - 0.02, zf - 0.02]], shade([160, 140, 92], [0, 0.4, -1]));
    var p2 = P(a, Hh + 0.1, zf - 0.02), p3 = P(b, Hh + 0.1, zf - 0.02); ctx.strokeStyle = SEA.snow ? rgb(mulc(SNOW, lightTint(1))) : rgb(shade([220, 200, 150], [0.3, 1, -0.3])); ctx.lineWidth = SEA.snow ? 2.2 : 0.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p2.x, p2.y - (SEA.snow ? 0.8 : 0)); ctx.lineTo(p3.x, p3.y - (SEA.snow ? 0.8 : 0)); ctx.stroke(); ctx.lineCap = 'butt';
    for (var x3 = Math.ceil(a / 1.8) * 1.8; x3 < b - 0.1; x3 += 1.8) { if (x3 - a < 0.1) continue; bamboo(ctx, [x3, 0, zf - 0.08], [x3, Hh + 0.16, zf - 0.08], 0.045, [126, 112, 72]); }
  });
}

/* ================= sanmon gate ================= */
function drawGate(ctx) {
  var xa = LAY.gate.xa, xb = LAY.gate.xb, z = LAY.fenceZ, S = sil(), wood = [96, 64, 46], xm = (xa + xb) / 2;
  [xa, xb].forEach(function (x) { prism(ctx, x, z, 0, 2.35, 0.12, 0.11, 10, 0, wood, { tex: 0.3, snow: 0 }); prism(ctx, x, z, -0.02, 0.14, 0.2, 0.18, 8, 0, [130, 126, 118]); prism(ctx, x, z + 0.7, 0, 2.2, 0.08, 0.075, 8, 0, wood, { snow: 0 }); });
  // doors (open) and beams
  quad3(ctx, [[xa - 0.25, 1.88, z - 0.1], [xb + 0.25, 1.88, z - 0.1], [xb + 0.25, 2.0, z - 0.1], [xa - 0.25, 2.0, z - 0.1]], S ? [0, 0, 0] : shade(wood, [0, 0, -1]));
  quad3(ctx, [[xa - 0.32, 2.26, z - 0.12], [xb + 0.32, 2.26, z - 0.12], [xb + 0.32, 2.42, z - 0.12], [xa - 0.32, 2.42, z - 0.12]], S ? [0, 0, 0] : shade(wood, [0, 0, -1]));
  if (!S) {
    // tie beams brackets
    for (var i = 0; i < 5; i++) { var x = lerp(xa - 0.2, xb + 0.2, i / 4), p = P(x, 2.42, z - 0.14), q = P(x, 2.52, z - 0.3); ctx.strokeStyle = rgb(shade([70, 48, 36], [0, 0.3, -1])); ctx.lineWidth = Math.max(0.8, 0.07 * p.k); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    // plaque
    var pl = [[xm - 0.24, 2.04, z - 0.13], [xm + 0.24, 2.04, z - 0.13], [xm + 0.24, 2.22, z - 0.13], [xm - 0.24, 2.22, z - 0.13]]; quad3(ctx, pl, shade([50, 36, 28], [0, 0, -1]));
    var pc = P(xm, 2.13, z - 0.14); ctx.fillStyle = rgb(shade([200, 170, 100], [0, 0.2, -1])); ctx.fillRect(pc.x - 0.15 * pc.k, pc.y - 0.02 * pc.k, 0.3 * pc.k, 0.04 * pc.k);
  }
  // tiled hip-gable roof with upturned eaves
  var ey = 2.5, ry = 3.05, zF = z - 0.8, zB = z + 0.8, xl = xa - 0.6, xr = xb + 0.6, rows = 16;
  function curveY(t) { return ey + (ry - ey) * (Math.pow(t, 1.5)); }
  var tile = [70, 70, 74];
  for (i = 0; i < rows; i++) {
    var t0 = i / rows, t1 = (i + 1) / rows, za = lerp(zF, z, t0), zb = lerp(zF, z, t1), ya = curveY(t0), yb = curveY(t1);
    var up0 = 0.16 * Math.pow(1 - t0, 3), up1 = 0.16 * Math.pow(1 - t1, 3);
    var nn = norm([0, (zb - za), -(yb - ya)]); nn = [nn[0], Math.abs(nn[1]), nn[2]];
    var alb = mixc(tile, [92, 92, 96], (i % 2) * 0.5 + hash2(i, 9) * 0.3); alb = snowAlb(alb, nn[1] + 0.2);
    quad3(ctx, [[xl - up0 * 1.2, ya + up0, za], [xr + up0 * 1.2, ya + up0, za], [xr + up1 * 1.2, yb + up1, zb], [xl - up1 * 1.2, yb + up1, zb]], S ? [0, 0, 0] : shade(alb, nn), 0.5);
  }
  if (!S) {
    ctx.save(); poly(ctx, [[xl - 0.2, ey + 0.16, zF], [xr + 0.2, ey + 0.16, zF], [xr, ry, z], [xl, ry, z]].map(Pa)); ctx.clip();
    var tiles = SEA.snow ? 14 : 26;
    for (i = 0; i <= tiles; i++) { var xx = lerp(xl, xr, i / tiles), a = P(xx, ey + 0.1, zF), b = P(xx, ry, z); ctx.strokeStyle = SEA.snow ? 'rgba(120,130,150,0.25)' : 'rgba(20,20,24,0.5)'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.restore();
    var s0 = P(xl - 0.2, ey + 0.16, zF), s1 = P(xr + 0.2, ey + 0.16, zF), s2 = P(xr, ey - 0.05, zF + 0.35), s3 = P(xl, ey - 0.05, zF + 0.35);
    poly(ctx, [s0, s1, s2, s3]); ctx.fillStyle = 'rgba(30,22,20,0.9)'; ctx.fill();
    ctx.strokeStyle = SEA.snow ? rgb(mulc(SNOW, lightTint(1))) : rgb(shade([90, 90, 96], [0, 0.4, -1])); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.quadraticCurveTo((s0.x + s1.x) / 2, s0.y + 1.5, s1.x, s1.y); ctx.stroke();
    var ra = P(xl + 0.1, ry + 0.06, z), rb = P(xr - 0.1, ry + 0.06, z); ctx.lineCap = 'round'; ctx.strokeStyle = SEA.snow ? rgb(mulc([226, 230, 238], lightTint(1))) : 'rgb(46,46,52)'; ctx.lineWidth = 0.2 * ra.k; ctx.beginPath(); ctx.moveTo(ra.x, ra.y); ctx.lineTo(rb.x, rb.y); ctx.stroke();
    [ra, rb].forEach(function (p2) { ctx.fillStyle = 'rgb(40,40,46)'; ctx.beginPath(); ctx.ellipse(p2.x, p2.y - 0.12 * ra.k, 0.12 * ra.k, 0.16 * ra.k, 0, 0, TAU); ctx.fill(); });
    ctx.lineCap = 'butt';
  } else { var ra2 = P(xl, ry + 0.1, z), rb2 = P(xr, ry + 0.1, z); ctx.lineWidth = 0.2 * ra2.k; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(ra2.x, ra2.y); ctx.lineTo(rb2.x, rb2.y); ctx.stroke(); }
}

/* ================= tsukiyama (hill) and waterfall ================= */
function drawHill(ctx) {
  var h = LAY.hill, rng = mulberry32(88), S = sil(), nu = 40, nv = 9, V = [], j, i;
  for (j = 0; j <= nv; j++) { var r = j / nv; for (i = 0; i < nu; i++) { var a = i / nu * TAU, x = h.x + Math.cos(a) * r * h.rx * 1.04, z = h.z + Math.sin(a) * r * h.rz * 1.04; V.push([x, hillH(x, z) - 0.02, z]); } }
  var tris = []; for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var aa = j * nu + i, b = j * nu + (i + 1) % nu, c = (j + 1) * nu + i, d = (j + 1) * nu + (i + 1) % nu; tris.push([aa, c, b], [b, c, d]); }
  var base = SEA.snow ? [220, 226, 234] : mixc(ramp(SEA.moss, 0.5), [70, 100, 42], 0.3);
  var T = tris.map(function (t) { var A = V[t[0]], B = V[t[1]], C = V[t[2]], n = norm(cross(sub(B, A), sub(C, A))); if (n[1] < 0) n = mul(n, -1); return { p: [A, B, C], n: n, c: mul(add(add(A, B), C), 1 / 3) }; })
    .filter(function (t) { return faceVisible(t.c, t.n); }).map(function (t) { return { t: t, d: Pa(t.c).d }; }).sort(function (a2, b2) { return b2.d - a2.d; });
  T.forEach(function (q) { var pp = q.t.p.map(Pa); poly(ctx, pp); var col = S ? [0, 0, 0] : shade(base, q.t.n); ctx.fillStyle = rgb(col); ctx.fill(); if (!S) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.5; ctx.stroke(); } });
  if (S) return;
  var pts = [], N = 5200 * DQ;
  for (i = 0; i < N; i++) {
    var a3 = rng() * TAU, r3 = Math.sqrt(rng()), x3 = h.x + Math.cos(a3) * r3 * h.rx, z3 = h.z + Math.sin(a3) * r3 * h.rz, y3 = hillH(x3, z3), e = 0.03;
    var nx = -(hillH(x3 + e, z3) - hillH(x3 - e, z3)) / (2 * e), nz = -(hillH(x3, z3 + e) - hillH(x3, z3 - e)) / (2 * e);
    pts.push({ x: x3, y: y3, z: z3, n: norm([nx, 1, nz]), p: P(x3, y3, z3) });
  }
  pts.sort(function (a4, b4) { return b4.p.d - a4.p.d; });
  var pal = SEA.snow ? [[150, 160, 178], [186, 196, 212], [214, 222, 234], [232, 238, 246], [244, 248, 252], [252, 254, 255]] : SEA.moss.concat([mixc(SEA.moss[4], [220, 220, 150], 0.4)]);
  var lt = lightTint(1), dq = Math.sqrt(DQ), NB = 16, bp = [], bc = [];
  for (i = 0; i < NB * 2; i++) bp.push(new Path2D());
  pts.forEach(function (q) {
    var l = clamp(0.22 + 0.62 * dot(q.n, SUN) + (NZ.n2(q.x * 5, q.z * 5) - 0.5) * 0.4 + (rng() - 0.5) * 0.2), alt = SEA.snow && NZ.n2(q.x * 3 + 7, q.z * 3) < 0.3 ? 1 : 0;
    var ix = alt * NB + Math.min(NB - 1, Math.round(l * (NB - 1))), rx = 0.05 * q.p.k * (0.7 + rng() * 0.6) / dq;
    bp[ix].moveTo(q.p.x + rx, q.p.y); bp[ix].ellipse(q.p.x, q.p.y, rx, 0.035 * q.p.k / dq, 0, 0, TAU);
  });
  for (i = 0; i < NB * 2; i++) { var l2 = (i % NB) / (NB - 1), c = i < NB ? ramp(pal, l2) : mixc(ramp(SEA.moss, l2), [60, 60, 50], 0.2); ctx.fillStyle = rgb(mulc(c, lt)); ctx.fill(bp[i]); }
}
function fallGeom() {
  var f = LAY.fall;
  return { top: [f.x, f.ytop, f.ztop], bot: [f.x, WL, f.zbot], wd: f.wd };
}
function drawWaterfall(ctx) {
  if (sil()) return;
  var f = LAY.fall, rng = mulberry32(61), xc = f.x, ztop = f.ztop, zbot = f.zbot, ytop = f.ytop, wd = f.wd, i;
  var lt = lightTint(0.7), night = LIT.id === 'night', ice = SEA.snow, dq = Math.sqrt(DQ);
  function at(u, v) { // u -0.5..0.5 across, v 0 (lip) .. 1 (pool); the water rolls forward over a rounded lip
    var spread = lerp(1, 1.18, v) + 0.05 * Math.sin(v * 7 + u * 3), x = xc + u * wd * spread;
    var lipC = 0.035 * (1 - 4 * u * u), y = lerp(ytop + lipC, WL, Math.pow(v, 1.1)) + 0.06 * Math.sin(Math.min(1, v / 0.1) * Math.PI / 2) * (1 - v);
    var bulge = 0.16 * Math.sin(Math.min(1, v / 0.22) * Math.PI / 2) * (1 - v * 0.7);
    return P(x, y, lerp(ztop, zbot, v) - 0.03 - bulge - 0.05 * (1 - 4 * u * u) * (1 - v));
  }
  // the lip: a broad worn stone the water slides over
  var lipStone = makeRock(171, xc, ztop + 0.04, wd * 0.82, 0.13, 0.26, { by: ytop - 0.1, flat: 0.35, amp: 0.18, alb: [112, 108, 102], moss: 0.5, nu: 26, nv: 10, outline: 0.06 });
  drawRock(ctx, lipStone);
  // the wet rock face behind the fall, darker than the rock around it, with an uneven edge
  var back = [], N = 14, k;
  for (k = 0; k <= N; k++) { var v = k / N; back.push(at(-0.5 - 0.1 - 0.08 * NZ.n2(v * 4, 1.3), v)); }
  for (k = N; k >= 0; k--) { var v2 = k / N; back.push(at(0.5 + 0.1 + 0.08 * NZ.n2(v2 * 4, 4.1), v2)); }
  poly(ctx, back); ctx.fillStyle = rgb(mulc([44, 50, 50], lt), 0.92); ctx.fill();
  // the sheet of water
  var sheet = [];
  for (k = 0; k <= N; k++) { var v3 = k / N; sheet.push(at(-0.5 + 0.03 * Math.sin(v3 * 9), v3)); }
  for (k = N; k >= 0; k--) { var v4 = k / N; sheet.push(at(0.5 + 0.03 * Math.sin(v4 * 8 + 1), v4)); }
  var wc = night ? [150, 170, 206] : mulc([228, 238, 242], lt), deep = night ? [40, 52, 76] : mulc([96, 118, 124], lt);
  var top = at(0, 0), bot = at(0, 1), gr = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
  gr.addColorStop(0, rgb(mixc(deep, wc, 0.8), ice ? 0.7 : 0.9)); gr.addColorStop(0.08, rgb(mixc(deep, wc, 0.35), 0.75)); gr.addColorStop(0.6, rgb(mixc(deep, wc, 0.3), 0.6)); gr.addColorStop(0.92, rgb(mixc(deep, wc, 0.8), 0.85)); gr.addColorStop(1, rgb(wc, 0.95));
  ctx.save(); poly(ctx, sheet); ctx.fillStyle = gr; ctx.fill(); ctx.clip();
  // falling threads of water, brighter where they break up near the pool
  ctx.lineCap = 'round';
  // a few bundled ropes of water (where most of the flow goes), then many fine threads
  for (i = 0; i < 7; i++) { var ur = (i + 0.5) / 7 - 0.5 + (rng() - 0.5) * 0.06, ra = at(ur, 0.01), rb = at(ur, 1), rg = ctx.createLinearGradient(ra.x, ra.y, rb.x, rb.y); rg.addColorStop(0, rgb(wc, 0.55)); rg.addColorStop(0.5, rgb(wc, 0.3)); rg.addColorStop(1, rgb(wc, 0.7)); ctx.strokeStyle = rg; ctx.lineWidth = wd / 7 * ra.k * (0.45 + rng() * 0.4); ctx.beginPath(); ctx.moveTo(ra.x, ra.y); ctx.lineTo(rb.x, rb.y); ctx.stroke(); }
  for (i = 0; i < 150 * DQ; i++) {
    var u = rng() - 0.5, v0 = Math.pow(rng(), 2.2) * 0.4, v1 = Math.min(1, v0 + 0.35 + rng() * 0.7), a = at(u, v0), b = at(u + (rng() - 0.5) * 0.04, v1);
    var al = (0.14 + rng() * 0.5) * (ice ? 0.6 : 1), g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, rgb(wc, al * 0.6)); g.addColorStop(1, rgb(mixc(wc, [255, 255, 255], 0.5), Math.min(1, al * 1.4)));
    ctx.strokeStyle = g; ctx.lineWidth = (0.3 + rng() * 0.75) / dq * 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (i = 0; i < 26 * DQ; i++) { var u2 = rng() - 0.5, c = at(u2, 0.02 + rng() * 0.12); ctx.strokeStyle = rgb(mixc(deep, [20, 26, 30], 0.4), 0.35); ctx.lineWidth = 0.4 / dq; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y + (1 + rng() * 3)); ctx.stroke(); }
  ctx.restore(); ctx.lineCap = 'butt';
  if (ice) { // icicles hanging from the lip
    ctx.fillStyle = rgb(mulc([232, 242, 252], lt), 0.9);
    for (i = 0; i < 16; i++) { var p = at(rng() - 0.5, 0), L = (0.06 + rng() * 0.3) * p.k; ctx.beginPath(); ctx.moveTo(p.x - 0.7, p.y); ctx.lineTo(p.x + 0.7, p.y); ctx.lineTo(p.x, p.y + L); ctx.closePath(); ctx.fill(); }
  }
  // the glassy, curved lip and a little spray thrown off it
  ctx.strokeStyle = rgb(mulc([255, 255, 255], lt), 0.85); ctx.lineWidth = 0.8 / dq * 1.2; ctx.beginPath();
  for (k = 0; k <= 12; k++) { var q = at(k / 12 - 0.5, 0.02); if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); } ctx.stroke();
  ctx.strokeStyle = rgb(mulc([255, 255, 255], lt), 0.4); ctx.lineWidth = 1.6 / dq; ctx.beginPath();
  for (k = 0; k <= 12; k++) { var q2 = at(k / 12 - 0.5, 0.07); if (k) ctx.lineTo(q2.x, q2.y); else ctx.moveTo(q2.x, q2.y); } ctx.stroke();
  for (i = 0; i < 40 * DQ; i++) { var su = (rng() - 0.5) * 1.15, sv = 0.04 + rng() * 0.14, sp = at(su, sv), sr = (0.4 + rng() * 0.7) / dq; ctx.fillStyle = rgb(mulc([255, 255, 255], lt), 0.25 + rng() * 0.4); ctx.beginPath(); ctx.arc(sp.x + (su > 0 ? 1 : -1) * rng() * 1.5, sp.y, sr, 0, TAU); ctx.fill(); }
  // white water where it lands
  var fo = P(xc, WL, zbot - 0.04), mg = ctx.createRadialGradient(fo.x, fo.y - 1, 0, fo.x, fo.y - 1, 0.75 * fo.k);
  mg.addColorStop(0, rgb(mulc([255, 255, 255], lt), ice ? 0.35 : 0.6)); mg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = mg; ctx.fillRect(fo.x - 0.8 * fo.k, fo.y - 0.8 * fo.k, 1.6 * fo.k, 1.6 * fo.k);
  for (i = 0; i < 90 * DQ; i++) { ctx.fillStyle = rgb(mulc([255, 255, 255], lt), 0.2 + rng() * 0.5); ctx.beginPath(); ctx.ellipse(fo.x + (rng() - 0.5) * 0.85 * fo.k, fo.y + (rng() - 0.35) * 0.14 * fo.k, (0.6 + rng() * 1.3) / dq, (0.4 + rng() * 0.6) / dq, 0, 0, TAU); ctx.fill(); }
}

/* ================= shishi-odoshi (static parts; the tube is animated) ================= */
/* shishi-odoshi, scaled up a little so it reads at card size; m = -1 mirrors it so the open end pours toward +x */
var SHK = 1.25;
function shishiGeom() {
  var x = LAY.shishi.x, z = LAY.shishi.z, m = LAY.shishi.m || 1, k = SHK;
  return { m: m, k: k, pivot: [x + 0.12 * m * k, 0.42 * k, z], len0: 0.3 * k, len1: 0.62 * k, r: 0.06 * k, spout: [x - 0.04 * m * k, 0.83 * k, z + 0.03], stone: [x + 0.66 * m * k, 0, z + 0.08] };
}
function drawShishiStatic(ctx) {
  var g = shishiGeom(), x = LAY.shishi.x, z = LAY.shishi.z, m = g.m, k = g.k;
  drawRock(ctx, makeRock(515, g.stone[0], g.stone[2], 0.2 * k, 0.12 * k, 0.17 * k, { nu: 16, nv: 8, flat: 0.5, alb: [136, 132, 124], moss: 0.6 }));
  bamboo(ctx, [x - 0.28 * m * k, 0, z + 0.08], [x - 0.28 * m * k, 0.98 * k, z + 0.08], 0.042 * k, [150, 140, 84]);
  bamboo(ctx, [x - 0.28 * m * k, 0.9 * k, z + 0.06], [x - 0.02 * m * k, 0.84 * k, z + 0.03], 0.022 * k);
  bamboo(ctx, [g.pivot[0], 0, z + 0.11], [g.pivot[0], 0.5 * k, z + 0.11], 0.026 * k, [150, 138, 86]);
  if (!sil()) { var r2 = mulberry32(516); drawRock(ctx, makeRock(517, x - 0.26 * m * k, z + 0.16, 0.13, 0.08, 0.1, { nu: 12, nv: 6, flat: 0.5, alb: [128, 124, 116], moss: 0.5 })); }
}
/* tube at angle ang (radians; negative = open end up) */
function drawShishiTube(ctx, ang) {
  var g = shishiGeom(), pv = g.pivot, ca = Math.cos(ang) * g.m, sa = Math.sin(ang);
  var a = [pv[0] - g.len0 * ca, pv[1] - g.len0 * sa, pv[2]], b = [pv[0] + g.len1 * ca, pv[1] + g.len1 * sa, pv[2]];
  bamboo(ctx, [pv[0], 0, pv[2] + 0.11], [pv[0], 0.5 * g.k, pv[2] + 0.11], 0.026 * g.k, [150, 138, 86]);
  bamboo(ctx, a, b, g.r, [150, 166, 84]);
  // the slanted cut of the open end
  var e = Pa(a), e2 = Pa([a[0] - 0.05 * ca, a[1] + 0.06, a[2]]); ctx.fillStyle = 'rgb(48,42,30)'; ctx.beginPath(); ctx.ellipse((e.x + e2.x) / 2, (e.y + e2.y) / 2, 0.05 * e.k, 0.032 * e.k, 0.6 * g.m + ang * g.m, 0, TAU); ctx.fill();
  bamboo(ctx, [pv[0], 0, pv[2] - 0.11], [pv[0], 0.5 * g.k, pv[2] - 0.11], 0.026 * g.k, [150, 138, 86]);
  var pin = P(pv[0], pv[1], pv[2] - 0.12); ctx.fillStyle = 'rgb(60,50,36)'; ctx.beginPath(); ctx.arc(pin.x, pin.y, Math.max(0.5, 0.018 * pin.k), 0, TAU); ctx.fill();
  return { open: a, closed: b };
}

/* ================= tsukubai ================= */
function tsukubaiGeom() { var t = LAY.tsukubai; return { basin: [t.x, 0.34, t.z], r: 0.13, spout: [t.x - 0.16, 0.6, t.z + 0.02], drop: [t.x - 0.05, 0.34, t.z] }; }
function drawTsukubai(ctx) {
  var t = LAY.tsukubai, x = t.x, z = t.z, S = sil(), rng = mulberry32(333);
  // pebble sea (umi) as a flat dark disc of stones drawn in the flat pass instead
  drawRock(ctx, makeRock(611, x - 0.75, z - 0.35, 0.3, 0.16, 0.24, { alb: [140, 134, 124], moss: F.rockMoss, flat: 0.45 }));
  drawRock(ctx, makeRock(612, x + 0.62, z - 0.12, 0.22, 0.2, 0.2, { alb: [132, 128, 120], moss: F.rockMoss, flat: 0.55 }));
  drawRock(ctx, makeRock(613, x + 0.05, z - 0.62, 0.32, 0.08, 0.2, { alb: [150, 146, 138], moss: F.rockMoss * 0.4, flat: 0.25, outline: 0.12 }));
  // kakei: post and spout
  bamboo(ctx, [x - 0.62, 0, z + 0.12], [x - 0.62, 0.78, z + 0.12], 0.045, [150, 136, 84]);
  bamboo(ctx, [x - 0.6, 0.72, z + 0.1], [x - 0.12, 0.6, z + 0.02], 0.024, [170, 154, 96]);
  // the basin: a round stone with a carved square pool
  prism(ctx, x, z, 0, 0.32, 0.24, 0.22, 20, 0, [146, 140, 128], { tex: 0.55 });
  if (!S) {
    var c = P(x, 0.322, z), rx = 0.12 * c.k, ry = rx * CAM.s * 1.1;
    ctx.fillStyle = 'rgb(30,30,28)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * 1.06, ry * 1.12, 0, 0, TAU); ctx.fill();
    var wcol = SEA.snow ? [200, 214, 226] : mulc(mixc([50, 70, 76], LIT.skyHor, 0.35), lightTint(1));
    ctx.fillStyle = rgb(wcol); ctx.beginPath(); ctx.ellipse(c.x, c.y + ry * 0.12, rx * 0.92, ry * 0.86, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(c.x + rx * 0.3, c.y, rx * 0.35, ry * 0.25, 0, 0, TAU); ctx.fill();
    if (SEA.snow) snowCap(ctx, x - 0.12, 0.33, z + 0.08, 0.12, 0.03);
    mossDabs(ctx, [[x - 0.24, 0.05, z], [x - 0.1, 0.05, z - 0.22], [x + 0.2, 0.05, z - 0.1]], 30, rng, 1);
  }
}
function drawUmi(ctx) { // pebble basin floor in front of the tsukubai
  if (sil()) return;
  var t = LAY.tsukubai, rng = mulberry32(77), c = P(t.x, 0, t.z - 0.15), lt = lightTint(1);
  ctx.fillStyle = rgb(mulc([60, 58, 54], lt)); ctx.beginPath(); ctx.ellipse(c.x, c.y, 0.75 * c.k, 0.5 * c.k * CAM.s, 0, 0, TAU); ctx.fill();
  for (var i = 0; i < 220 * DQ; i++) {
    var a = rng() * TAU, r = Math.sqrt(rng()) * 0.72, x = t.x + Math.cos(a) * r, z = t.z - 0.15 + Math.sin(a) * r * 0.5, p = P(x, 0, z), s = (0.018 + rng() * 0.02) * p.k;
    ctx.fillStyle = rgb(mulc(SEA.snow ? [226, 232, 240] : mixc([40, 40, 42], [150, 146, 140], rng()), lt)); ctx.beginPath(); ctx.ellipse(p.x, p.y, s, s * 0.6, 0, 0, TAU); ctx.fill();
  }
}

/* ================= yatsuhashi (zig-zag plank bridge) ================= */
var YATSU = [[1.2, 2.72], [1.98, 2.18], [2.76, 2.62], [3.54, 2.08], [4.3, 2.48]].map(function (q) { return [LX(q[0]), LZ(q[1])]; });
function drawYatsuhashi(ctx) {
  var S = sil(), y = 0.12, w = 0.16, rng = mulberry32(203);
  var segs = [];
  for (var i = 0; i < YATSU.length - 1; i++) segs.push([YATSU[i], YATSU[i + 1], i]);
  segs.sort(function (a, b) { return P((b[0][0] + b[1][0]) / 2, 0, (b[0][1] + b[1][1]) / 2).d - P((a[0][0] + a[1][0]) / 2, 0, (a[0][1] + a[1][1]) / 2).d; });
  segs.forEach(function (sg) {
    var a = sg[0], b = sg[1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    var ext = 0.18, A = [a[0] - ux * ext, a[1] - uz * ext], B = [b[0] + ux * ext, b[1] + uz * ext];
    // posts
    [0.12, 0.5, 0.88].forEach(function (t) { [-1, 1].forEach(function (sd) { var px = lerp(A[0], B[0], t) + nx * w * 0.8 * sd, pz = lerp(A[1], B[1], t) + nz * w * 0.8 * sd; prism(ctx, px, pz, WL - 0.1, y - 0.02, 0.03, 0.03, 6, 0, [80, 64, 48], { snow: 0 }); }); });
    // two planks side by side
    [-1, 1].forEach(function (sd) {
      var o0 = sd > 0 ? 0 : -w, o1 = sd > 0 ? w : 0;
      var pts = [[A[0] + nx * o0, y, A[1] + nz * o0], [B[0] + nx * o0, y, B[1] + nz * o0], [B[0] + nx * o1, y, B[1] + nz * o1], [A[0] + nx * o1, y, A[1] + nz * o1]];
      var alb = snowAlb(mixc([126, 104, 80], [160, 136, 106], rng()), 1);
      quad3(ctx, pts, S ? [0, 0, 0] : shade(alb, [0, 1, 0]), 0.4);
      // plank edge
      var ed = [pts[0], pts[1], [pts[1][0], y - 0.06, pts[1][2]], [pts[0][0], y - 0.06, pts[0][2]]];
      quad3(ctx, ed, S ? [0, 0, 0] : shade([90, 70, 52], [nx * -1, 0, -Math.abs(nz)]), 0.3);
      if (!S) { var g0 = Pa(pts[0]), g1 = Pa(pts[1]); ctx.strokeStyle = 'rgba(50,36,26,0.4)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.stroke(); }
    });
  });
}

/* ================= backdrop ================= */
function drawPagoda(ctx, x, yb, s, col, lit) {
  var tiers = 5, y = yb, wBase = 30 * s, tierH = 11 * s;
  var dark = rgb(col), lc = rgb(mixc(col, lit ? [255, 200, 140] : [255, 220, 170], 0.25)), roofC = rgb(scl(col, 0.75));
  for (var i = 0; i < tiers; i++) {
    var w = wBase * (1 - i * 0.1), bw = w * 0.52;
    ctx.fillStyle = dark; ctx.fillRect(x - bw / 2, y - tierH * 0.7, bw, tierH * 0.7); ctx.fillStyle = lc; ctx.fillRect(x, y - tierH * 0.7, bw / 2, tierH * 0.7);
    ctx.fillStyle = 'rgba(30,20,16,0.35)'; for (var k = 0; k < 3; k++) ctx.fillRect(x - bw / 2 + bw * (k + 0.5) / 3 - 0.4, y - tierH * 0.6, 0.8, tierH * 0.45);
    y -= tierH * 0.7;
    ctx.fillStyle = roofC; ctx.beginPath(); ctx.moveTo(x - w / 2 - 2 * s, y + 1.2 * s); ctx.quadraticCurveTo(x - w * 0.3, y - 0.5 * s, x - w * 0.18, y - 3.2 * s); ctx.lineTo(x + w * 0.18, y - 3.2 * s); ctx.quadraticCurveTo(x + w * 0.3, y - 0.5 * s, x + w / 2 + 2 * s, y + 1.2 * s); ctx.quadraticCurveTo(x, y + 0.2 * s, x - w / 2 - 2 * s, y + 1.2 * s); ctx.fill();
    if (SEA.snow) { ctx.fillStyle = 'rgba(240,244,250,0.85)'; ctx.beginPath(); ctx.moveTo(x - w * 0.42, y - 0.4 * s); ctx.quadraticCurveTo(x, y - 3.6 * s, x + w * 0.42, y - 0.4 * s); ctx.quadraticCurveTo(x, y - 1.6 * s, x - w * 0.42, y - 0.4 * s); ctx.fill(); }
    ctx.strokeStyle = rgb(mixc(col, [255, 230, 190], 0.3), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x, y - 3 * s); ctx.quadraticCurveTo(x + w * 0.3, y - 0.3 * s, x + w / 2 + 2 * s, y + 1.1 * s); ctx.stroke();
    y -= 3.2 * s;
  }
  ctx.strokeStyle = dark; ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 26 * s); ctx.stroke();
  for (var k2 = 0; k2 < 9; k2++) { ctx.fillStyle = dark; ctx.fillRect(x - 2.2 * s, y - 4 * s - k2 * 2.2 * s, 4.4 * s, 0.9 * s); }
  if (lit) { for (var t = 0; t < 4; t++) GLOWS.push({ x: x + (t % 2 ? 2 : -2) * s, y: yb - tierH * (0.4 + t * 0.95), r: 4, a: 0.4, far: true }); }
}
function pagodaPos() { return { x: P(LX(0.75), 0, LZ(12)).x, y: Math.min(CAM.cy - 124, P(0, 1.72, LAY.fenceZ).y - 6) }; }
function paintBackdrop(ctx) {
  var rng = mulberry32(301), L = LIT, yo = CAM.cy - 204, night = L.id === 'night';
  var top = mixc(L.skyTop, SEA.sky, night ? 0 : 0.25), hor = L.skyHor;
  var yH = 130 + yo;
  var g = ctx.createLinearGradient(0, 0, 0, yH); g.addColorStop(0, rgb(top)); g.addColorStop(0.6, rgb(mixc(top, hor, 0.7))); g.addColorStop(1, rgb(hor)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, yH + 20);
  var sx = W * L.sunX, sy = yo + 140 * L.sunY;
  var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 260); sg.addColorStop(0, L.sunGlow); sg.addColorStop(1, 'rgba(255,230,200,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, yH + 20);
  if (night && !(L.overcast > 0.5)) {
    var sr = mulberry32(5);
    for (var i = 0; i < 160; i++) { var x = sr() * W, y = sr() * (yH - 30), a = 0.25 + sr() * 0.6, r = 0.25 + sr() * 0.5; ctx.fillStyle = 'rgba(230,236,255,' + a * clamp(1 - y / yH) + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    // moon
    var mx = W * 0.17, my = 30 + yo * 0.5, mr = 9;
    if (EVT === 'tsukimi') mr = 0;
    var mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 6); mg.addColorStop(0, 'rgba(220,230,255,0.35)'); mg.addColorStop(1, 'rgba(200,215,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    if (mr) {
      ctx.fillStyle = 'rgb(246,244,232)'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(200,196,180,0.35)'; [[-3, -2, 2.6], [2.5, 1.5, 2], [-1, 3.5, 1.6], [3, -3, 1.2]].forEach(function (c) { ctx.beginPath(); ctx.arc(mx + c[0], my + c[1], c[2], 0, TAU); ctx.fill(); });
    }
  } else if (L.id === 'dusk' && !L.overcast) {
    ctx.fillStyle = 'rgba(255,214,150,0.9)'; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, TAU); ctx.fill();
  }
  paintClouds(ctx, yo, yH); if (FW && (night || L.id === 'dusk')) paintFireworkHaze(ctx, yo);
  var haze = L.haze;
  var layers = [{ y: 25, amp: 16, col: [150, 160, 170], hz: 0.6, f: 0.012, tree: 0.3, cr: 0.55 }, { y: 45, amp: 14, col: [108, 120, 108], hz: 0.46, f: 0.02, tree: 0.6, cr: 0.85 }, { y: 65, amp: 12, col: [92, 100, 72], hz: 0.3, f: 0.03, tree: 0.85, cr: 1.15 }, { y: 87, amp: 10, col: [80, 84, 56], hz: 0.16, f: 0.045, tree: 1, cr: 1.45 }];
  var R0 = SEA.ridge, crowns = SEA === SEASONS.spring ? R0.concat([R0[0], R0[1], R0[5], R0[0], R0[1]]) : R0, lt = lightTint(1), sgn = Math.sign(L.ls[0]) || 1;
  layers.forEach(function (Ly, li) {
    var pts = [], step = 2;
    for (var x2 = -10; x2 <= W + 10; x2 += step) pts.push([x2, yo + Ly.y - Ly.amp * NZ.fbm(x2 * Ly.f + li * 7, li * 3.1, 4) * 1.6 + Ly.amp * 0.4]);
    function ridgeY(x) { var f = (x + 10) / step, i0 = Math.max(0, Math.min(pts.length - 2, Math.floor(f))); return lerp(pts[i0][1], pts[i0 + 1][1], clamp(f - i0)); }
    var lcol = mixc(mulc(Ly.col, lt), haze, Ly.hz);
    if (SEA.snow && li < 2) lcol = mixc(lcol, mulc([236, 240, 248], lt), 0.55 - li * 0.15);
    var forest = mixc(mulc(scl(ramp(crowns, 0.35), 0.82), lt), haze, Ly.hz + 0.08);
    if (SEA.snow) forest = mixc(forest, lcol, 0.45);
    // the treeline: crowns and the odd conifer breaking the skyline
    var rr = mulberry32(410 + li), sil2 = new Path2D();
    sil2.moveTo(-10, yo + 170); pts.forEach(function (p) { sil2.lineTo(p[0], p[1]); }); sil2.lineTo(W + 10, yo + 170); sil2.closePath();
    var bumps = new Path2D(), cone = new Path2D(), cs = Ly.cr;
    for (var bx = -8; bx < W + 8; bx += cs * (1.3 + rr() * 1.1)) {
      var by = ridgeY(bx), r = cs * (0.8 + rr() * 0.7);
      if (rr() < 0.22) { cone.moveTo(bx - r * 0.7, by + r * 0.6); cone.lineTo(bx, by - r * 2.1); cone.lineTo(bx + r * 0.7, by + r * 0.6); cone.closePath(); }
      else { bumps.moveTo(bx + r, by + r * 0.2); bumps.ellipse(bx, by + r * 0.2, r, r * 0.8, 0, 0, TAU); }
    }
    ctx.fillStyle = rgb(mixc(lcol, forest, Ly.tree * 0.5)); ctx.fill(sil2); ctx.fill(bumps); ctx.fill(cone);
    if (SKYM && li >= 1) { SKYM.globalCompositeOperation = 'destination-out'; SKYM.fill(sil2); SKYM.fill(bumps); SKYM.fill(cone); SKYM.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.clip(sil2);
    // slopes turned from the light lie in shade; the valleys hold the mist
    var sb = [], NS = 5, k; for (k = 0; k < NS * 2; k++) sb.push(new Path2D());
    for (k = 0; k < pts.length - 1; k++) {
      var sl = (pts[k + 1][1] - pts[k][1]) / step * sgn, lv = Math.min(NS - 1, Math.floor(clamp(Math.abs(sl) * 1.1) * NS)); if (Math.abs(sl) < 0.05) continue;
      sb[(sl > 0 ? 0 : NS) + lv].rect(pts[k][0], Math.min(pts[k][1], pts[k + 1][1]) - 4, step, Ly.amp * 2.2);
    }
    for (k = 0; k < NS; k++) { var al = (k + 0.5) / NS; ctx.fillStyle = rgb(scl(lcol, 0.66), al * 0.55); ctx.fill(sb[k]); ctx.fillStyle = rgb(mixc(lcol, [255, 250, 240], 0.3), al * 0.42); ctx.fill(sb[NS + k]); }
    ctx.restore();
    if (SEA.snow && li < 3) { // snow caps on ridges
      ctx.save(); ctx.clip(sil2); ctx.fillStyle = rgb(mulc([244, 246, 250], lt), 0.55); ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); for (var k2 = pts.length - 1; k2 >= 0; k2--) ctx.lineTo(pts[k2][0], pts[k2][1] + 6 + NZ.n2(pts[k2][0] * 0.1, li) * 6); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (Ly.tree > 0) {
      // the forest: crowns with a lit cap and a shaded underside, densest along the ridge, thinning into the mist below
      var cnt = Math.floor((1150 * Ly.tree + 260) * Math.min(1.6, DQ)), NB = 3, sets = [], i2, b;
      crowns.forEach(function (cc) { for (b = 0; b < NB; b++) { var c = mixc(mulc(scl(cc, 0.8 + (b + 0.5) / NB * 0.24), lt), haze, Ly.hz * 0.78 + 0.04); if (SEA.snow) c = mixc(c, lcol, 0.35); sets.push({ c: c, sh: new Path2D(), bd: new Path2D(), lt: new Path2D(), lo: new Path2D() }); } });
      for (i2 = 0; i2 < cnt; i2++) {
        var x3 = rng() * (W + 16) - 8, yr = ridgeY(x3), dep = Math.pow(rng(), 1.5), y3 = yr + dep * (Ly.amp * 2.6 + 8) + 0.6;
        var r3 = (0.75 + rng() * 0.9) * Ly.cr * (1 - dep * 0.35) / Math.sqrt(Math.min(1.6, DQ)), S2 = sets[(rng() * sets.length) | 0], body = dep > 0.55 ? S2.lo : S2.bd;
        S2.sh.moveTo(x3 + r3 - sgn * r3 * 0.25, y3 + r3 * 0.35); S2.sh.ellipse(x3 - sgn * r3 * 0.25, y3 + r3 * 0.35, r3, r3 * 0.7, 0, 0, TAU);
        body.moveTo(x3 + r3, y3); body.ellipse(x3, y3, r3, r3 * 0.78, 0, 0, TAU);
        if (dep < 0.7) { S2.lt.moveTo(x3 + sgn * r3 * 0.3 + r3 * 0.5, y3 - r3 * 0.32); S2.lt.ellipse(x3 + sgn * r3 * 0.3, y3 - r3 * 0.32, r3 * 0.5, r3 * 0.36, 0, 0, TAU); }
      }
      var aK = 0.55 + 0.4 * Ly.tree;
      sets.forEach(function (S3) { ctx.fillStyle = rgb(scl(S3.c, 0.72), 0.5 * aK); ctx.fill(S3.sh); ctx.fillStyle = rgb(S3.c, 0.85 * aK); ctx.fill(S3.bd); ctx.fillStyle = rgb(S3.c, 0.45 * aK); ctx.fill(S3.lo); ctx.fillStyle = rgb(mixc(scl(S3.c, 1.18), [255, 250, 236], 0.12), 0.6 * aK); ctx.fill(S3.lt); });
    }
    if (li === 1) { paintRainVeil(ctx, yo); paintRainbow(ctx, yo); }   // a rainbow stands in front of the far hills
    if (li === 1) drawRidgeTemple(ctx, P(LX(-1.0), 0, LZ(12)).x, ridgeY, Ly, haze, lt);
    var mg2 = ctx.createLinearGradient(0, yo + Ly.y + Ly.amp * 0.4, 0, yo + Ly.y + Ly.amp * 1.8); mg2.addColorStop(0, rgb(haze, 0)); mg2.addColorStop(0.55, rgb(haze, 0.3 * L.hazeK)); mg2.addColorStop(1, rgb(haze, 0)); ctx.fillStyle = mg2; ctx.fillRect(0, yo + Ly.y, W, Ly.amp * 2.2);
    if (li === 0) drawEventMoon(ctx, yo);
    if (li === 2 && F.pagoda) { var pp = pagodaPos(); drawPagoda(ctx, pp.x, pp.y, 0.78, mixc(mulc([78, 52, 42], lt), haze, 0.3), L.lit); }
  });
}
/* a temple hall half hidden in the trees on the middle ridge */
function drawRidgeTemple(ctx, x, ridgeY, Ly, haze, lt) {
  var y = ridgeY(x) + 2.6, s = 1.15, hz = Ly.hz * 0.62, night = LIT.id === 'night';
  function c(col) { return rgb(mixc(mulc(col, lt), haze, hz)); }
  ctx.fillStyle = c([226, 220, 206]); ctx.fillRect(x - 5.5 * s, y - 2.6 * s, 11 * s, 2.8 * s);           // white plaster walls
  ctx.fillStyle = c([90, 60, 46]); for (var i = 0; i < 5; i++) ctx.fillRect(x - 5.5 * s + i * 2.6 * s, y - 2.6 * s, 0.5 * s, 2.8 * s);
  var roof = c([58, 56, 62]), w = 8.2 * s, top = y - 6.4 * s;
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - w, y - 2.2 * s); ctx.quadraticCurveTo(x - w * 0.62, y - 2.6 * s, x - w * 0.42, top + 1.6 * s); ctx.lineTo(x - w * 0.3, top); ctx.lineTo(x + w * 0.3, top); ctx.lineTo(x + w * 0.42, top + 1.6 * s); ctx.quadraticCurveTo(x + w * 0.62, y - 2.6 * s, x + w, y - 2.2 * s); ctx.quadraticCurveTo(x, y - 3.4 * s, x - w, y - 2.2 * s); ctx.fill();
  ctx.fillStyle = c(SEA.snow ? [240, 242, 248] : [96, 94, 100]); ctx.fillRect(x - w * 0.3, top - 0.5 * s, w * 0.6, 0.7 * s);
  ctx.fillRect(x - w * 0.3 - 0.4 * s, top - 1.1 * s, 0.7 * s, 1.2 * s); ctx.fillRect(x + w * 0.3 - 0.3 * s, top - 1.1 * s, 0.7 * s, 1.2 * s); // ridge-end tiles
  if (SEA.snow) { ctx.fillStyle = c([240, 244, 250]); ctx.beginPath(); ctx.moveTo(x - w * 0.8, y - 2.6 * s); ctx.quadraticCurveTo(x, top - 1, x + w * 0.8, y - 2.6 * s); ctx.quadraticCurveTo(x, top + 2.4 * s, x - w * 0.8, y - 2.6 * s); ctx.fill(); }
  // trees in front of its feet
  var r = mulberry32(77), f = rgb(mixc(mulc(scl(ramp(SEA.ridge, 0.3), 0.8), lt), haze, hz + 0.06));
  ctx.fillStyle = f; for (i = 0; i < 9; i++) { var tx = x - 9 * s + r() * 18 * s, rr = (1 + r() * 1.1) * s; ctx.beginPath(); ctx.ellipse(tx, y + 0.4 + r() * 1.2, rr, rr * 0.8, 0, 0, TAU); ctx.fill(); }
  if (LIT.lit) GLOWS.push({ x: x, y: y - 1.2 * s, r: night ? 5 : 3.5, a: 0.35, far: true });
}
/* clouds with form: lobed cumulus lit from the sun's side over a shaded, flat base; mackerel sky in autumn; winter stratus */
function cloudPuff(ctx, x, y, w, h, rng, cols, sgn) {
  var n = 4 + Math.round(w / Math.max(3, h * 0.9)), lobes = [], i;
  for (i = 0; i < n; i++) { var u = (i + 0.5) / n, env = Math.pow(Math.sin(u * Math.PI), 0.7), r = h * (0.3 + 0.7 * env) * (0.75 + rng() * 0.45); lobes.push([x + (u - 0.5) * w + (rng() - 0.5) * w * 0.06, y - r * 0.62 - env * h * 0.25, r]); }
  ctx.save(); ctx.beginPath(); ctx.rect(x - w, y - h * 4, w * 2, h * 4); ctx.clip();
  [[cols[0], 0, 0.1, 1.0], [cols[1], -0.12, -0.08, 0.92], [cols[2], -0.3, -0.3, 0.66]].forEach(function (L) {
    ctx.fillStyle = L[0]; ctx.beginPath();
    lobes.forEach(function (q) { var cx = q[0] + sgn * L[1] * q[2] * -1, cy = q[1] + L[2] * q[2], rr = q[2] * L[3]; ctx.moveTo(cx + rr, cy); ctx.arc(cx, cy, rr, 0, TAU); });
    ctx.fill();
  });
  ctx.restore();
}
function cloudlet(ctx, x, y, w, h, cols) { // one fleck of a mackerel sky
  ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.ellipse(x, y, w, h, -0.08, 0, TAU); ctx.fill();
  ctx.fillStyle = cols[2]; ctx.beginPath(); ctx.ellipse(x - w * 0.12, y - h * 0.3, w * 0.7, h * 0.55, -0.08, 0, TAU); ctx.fill();
}
function paintClouds(ctx, yo, yH) {
  var L = LIT, night = L.id === 'night', dusk = L.id === 'dusk', morning = L.id === 'morning', sname = seasonName(), rng = mulberry32(17 + sname.length), i;
  var sgn = L.sunX < 0.5 ? -1 : 1, sky = mixc(L.skyTop, L.skyHor, 0.5);
  var lit = night ? [150, 162, 200] : dusk ? [255, 196, 150] : morning ? [255, 248, 238] : [255, 254, 250];
  var mid = night ? [70, 82, 122] : dusk ? [212, 150, 156] : mixc(sky, [250, 250, 250], 0.72);
  var shd = night ? [38, 46, 80] : dusk ? [126, 100, 140] : mixc(sky, [140, 150, 172], 0.55);
  var A = night ? 0.55 : sname === 'spring' ? 0.62 : 0.85;
  if (sname === 'winter') { lit = mixc(lit, sky, 0.25); mid = mixc(mid, [200, 204, 212], 0.4); }
  var cols = [rgb(shd, A * 0.9), rgb(mid, A), rgb(lit, A)];
  if (L.overcast) { // a low grey ceiling: layered banks, darker underneath
    var dk = clamp(L.dark || 0.3), oshd = night ? [18, 22, 34] : mixc([150, 154, 162], [64, 68, 78], dk), omid = night ? [34, 40, 56] : mixc([196, 200, 206], [104, 110, 120], dk), olit = night ? [58, 64, 84] : mixc([232, 234, 238], [150, 156, 164], dk);
    if (L.weather === 'typhoon') { oshd = mulc(oshd, [0.82, 0.92, 0.88]); omid = mulc(omid, [0.85, 0.95, 0.9]); }
    paintOvercast(ctx, yo, { mid: rgb(omid), lit: rgb(olit), arr: [rgb(oshd, 0.85), rgb(omid, 0.9), rgb(olit, 0.8)] }, A, rng, sgn); return;
  }
  if (sname === 'summer') { // towering cumulus beyond the hills
    [[0.1, 27, 44, 8.5], [0.5, 29, 64, 10], [0.84, 26, 40, 7.5]].forEach(function (c) { var x = W * c[0] + (rng() - 0.5) * 30; cloudPuff(ctx, x, yo + c[1], c[2], c[3], rng, cols, sgn); cloudPuff(ctx, x + (rng() - 0.5) * 10, yo + c[1] - c[3] * 0.9, c[2] * 0.55, c[3] * 0.7, rng, cols, sgn); });
  } else if (sname === 'autumn') { // urokogumo: rows of small fleecy cloudlets, and a few low cumulus
    var soft = [rgb(shd, A * 0.3), rgb(mid, A * 0.5), rgb(lit, A * 0.55)];
    for (var row = 0; row < 7; row++) for (var k = 0; k < 30; k++) { var x0 = k * 14 + row * 6 + rng() * 5 - 12, y0 = 2 + row * 2.6 + rng() * 1.0 + k * 0.18 + Math.sin(k * 0.7 + row) * 0.8; if (rng() < 0.2 || (k + row * 3) % 11 === 0) continue; cloudlet(ctx, x0, y0, 2.4 + rng() * 2, 0.8 + rng() * 0.5, soft); }
    for (i = 0; i < 3; i++) cloudPuff(ctx, W * (0.15 + i * 0.33) + rng() * 30, yo + 29 + rng() * 4, 34 + rng() * 20, 6 + rng() * 3, rng, cols, sgn);
  } else if (sname === 'winter') { // low grey stratus banks with brighter breaks
    for (i = 0; i < 6; i++) { var by = 4 + i * 6 + rng() * 3, bw = 120 + rng() * 140, bx = rng() * W; ctx.fillStyle = rgb(i % 2 ? mid : shd, A * 0.55); ctx.beginPath(); ctx.ellipse(bx, by, bw / 2, 2.4 + rng() * 2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(lit, A * 0.45); ctx.beginPath(); ctx.ellipse(bx + sgn * 6, by - 1.2, bw * 0.38, 1.0, 0, 0, TAU); ctx.fill(); }
    for (i = 0; i < 3; i++) cloudPuff(ctx, rng() * W, yo + 27 + rng() * 4, 50 + rng() * 30, 6 + rng() * 3, rng, cols, sgn);
  } else { // spring: soft fair-weather cumulus in the haze
    for (i = 0; i < 6; i++) cloudPuff(ctx, (i + 0.3 + rng() * 0.5) * W / 6, yo + 20 + rng() * 10, 30 + rng() * 26, 5 + rng() * 3.5, rng, cols, sgn);
  }
  // high wisps
  for (i = 0; i < 5; i++) {
    var cx = rng() * W, cy = 4 + rng() * 14, cw = 50 + rng() * 80, ch = 1.2 + rng() * 1.6;
    var gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw / 2); gg.addColorStop(0, rgb(lit, night ? 0.14 : 0.3)); gg.addColorStop(1, rgb(lit, 0));
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.04); ctx.scale(1, ch / (cw / 2)); ctx.translate(-cx, -cy); ctx.fillStyle = gg; ctx.fillRect(cx - cw / 2, cy - cw / 2, cw, cw); ctx.restore();
  }
}

/* ================= fuji-dana: wisteria trellis by the pond ================= */
var WIS_RACEME = [[58, 36, 96], [80, 54, 128], [104, 78, 158], [132, 106, 184], [160, 138, 206], [186, 168, 224], [210, 196, 236], [232, 224, 244]];
function drawWisteria(ctx) {
  var w = LAY.wis, x0 = w.x0, x1 = w.x1, z0 = w.z0, z1 = w.z1, h = w.h, S = sil(), g = F.wisteria, rng = mulberry32(711), i, j;
  var wood = [104, 88, 70], season = seasonName(), zc = (z0 + z1) / 2, lt = lightTint(1), tint = LIT.foliageTint || null;
  var posts = [[x0, z1], [x1, z1], [x0, z0], [x1, z0]];
  function post(p) { prism(ctx, p[0], p[1], -0.15, h + 0.02, 0.055, 0.05, 8, 0.2, wood, { tex: 0.35, snow: 0 }); }
  // racemes: hanging flower clusters (late spring)
  var rac = [];
  if (season === 'spring') {
    var n = Math.round(70 * g);
    for (i = 0; i < n; i++) {
      var rx = lerp(x0 - 0.12, x1 + 0.12, rng()), rz = lerp(z0 - 0.08, z1 + 0.08, Math.pow(rng(), 0.8)), L = (0.28 + rng() * 0.34) * (0.7 + 0.3 * g);
      rac.push({ x: rx, z: rz, L: L, sw: (rng() - 0.5) * 0.06, seed: (rng() * 1e6) | 0, d: P(rx, h - 0.2, rz).d });
    }
  }
  function racemes(front) {
    if (!rac.length) return;
    var NB = WIS_RACEME.length, paths = [], b; for (b = 0; b < NB; b++) paths.push(new Path2D());
    var dq = Math.sqrt(DQ);
    for (var q = 0; q < rac.length; q++) {
      var r = rac[q]; if ((r.z < zc) !== front) continue;
      var rr = mulberry32(r.seed), m = Math.round(16 * Math.min(1.6, dq));
      if (S) { var a = P(r.x, h - 0.02, r.z), e = P(r.x + r.sw, h - r.L, r.z); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse((a.x + e.x) / 2, (a.y + e.y) / 2, Math.max(0.3, 0.05 * a.k), Math.abs(e.y - a.y) / 2 + 0.5, 0, 0, TAU); ctx.fill(); continue; }
      var side = 0.12 * (r.x - (x0 + x1) / 2) * LS[0];
      for (j = 0; j < m; j++) {
        var t = j / (m - 1), yy = h - 0.03 - r.L * t, xx = r.x + r.sw * t * t, pp = P(xx, yy, r.z), rad = 0.042 * (1 - 0.72 * t) * pp.k;
        for (var k = 0; k < 2; k++) {
          var ox = (rr() - 0.5) * rad * 1.3, l = clamp(0.25 + t * 0.6 + (ox > 0 === LS[0] > 0 ? 0.12 : -0.08) + side + (rr() - 0.5) * 0.25);
          var bb = Math.min(NB - 1, Math.round(l * (NB - 1))), sz = Math.max(0.35 / dq, rad * (0.45 + rr() * 0.3));
          paths[bb].moveTo(pp.x + ox + sz, pp.y); paths[bb].ellipse(pp.x + ox, pp.y + (rr() - 0.5) * rad * 0.4, sz, sz * 0.8, 0, 0, TAU);
        }
      }
    }
    if (!S) for (b = 0; b < NB; b++) { ctx.fillStyle = rgb(tc(mulc(WIS_RACEME[b], lt), tint)); ctx.fill(paths[b]); }
  }
  // back posts, back racemes
  post(posts[0]); post(posts[1]);
  racemes(false);
  // beams along x, then cross-bars along z on top
  [z1, z0].forEach(function (zz) { quad3(ctx, [[x0 - 0.22, h, zz], [x1 + 0.22, h, zz], [x1 + 0.22, h + 0.09, zz], [x0 - 0.22, h + 0.09, zz]], S ? [0, 0, 0] : shade(wood, [0, 0.2, -1]), 0.4); });
  if (!S) {
    ctx.lineCap = 'round';
    for (i = 0; i <= 9; i++) {
      var xx2 = lerp(x0 - 0.15, x1 + 0.15, i / 9), a2 = P(xx2, h + 0.11, z1 + 0.18), b2 = P(xx2, h + 0.11, z0 - 0.18);
      ctx.strokeStyle = rgb(shade([140, 120, 92], [0, 1, 0])); ctx.lineWidth = Math.max(0.5, 0.035 * a2.k); ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
      if (SEA.snow) { ctx.strokeStyle = rgb(mulc(SNOW, lt), 0.6); ctx.lineWidth = Math.max(0.3, 0.014 * a2.k); ctx.beginPath(); ctx.moveTo(a2.x, a2.y - 0.4); ctx.lineTo(b2.x, b2.y - 0.4); ctx.stroke(); }
    }
    ctx.lineCap = 'butt';
  }
  // the old vine: up the front-left post and along the top
  var vine = [[x0 - 0.05, 0, z0 - 0.06], [x0 + 0.05, 0.5, z0 - 0.08], [x0 - 0.04, 1.1, z0 - 0.05], [x0 + 0.06, 1.65, z0 - 0.07], [x0 + 0.12, h + 0.14, z0 + 0.1], [x0 + 0.65, h + 0.16, z0 + 0.35], [x1 - 0.35, h + 0.15, z0 + 0.55], [x1 + 0.05, h + 0.14, z1 - 0.1]];
  var vs = []; for (i = 0; i < vine.length - 1; i++) vs.push({ a: vine[i], b: vine[i + 1], r0: lerp(0.06, 0.02, i / 7), r1: lerp(0.06, 0.02, (i + 1) / 7) });
  if (season === 'winter') { // bare tendrils over the bars
    for (i = 0; i < 8; i++) { var sx = lerp(x0, x1, rng()), sz = lerp(z0, z1, rng()); vs.push({ a: [sx, h + 0.15, sz], b: [sx + (rng() - 0.5) * 0.6, h + 0.14, sz + (rng() - 0.5) * 0.5], r0: 0.016, r1: 0.008 }); }
  }
  drawBranches(ctx, vs, [[52, 40, 34], [92, 74, 60], [130, 108, 88]], 1, SEA.snow ? 0.7 : 0);
  // leaf canopy on top
  if (season !== 'winter') {
    var cl = [], cr = mulberry32(712), nc = Math.round(26 * g);
    for (i = 0; i < nc; i++) cl.push({ x: lerp(x0 - 0.2, x1 + 0.2, cr()), y: h + 0.14 + cr() * 0.12, z: lerp(z0 - 0.15, z1 + 0.15, cr()), r: 0.24 + cr() * 0.12, tone: cr() * 2 - 1 });
    var pal = season === 'spring' ? [[40, 66, 22], [70, 100, 34], [112, 140, 54], [156, 176, 84], [196, 208, 126], [222, 230, 164]]
      : season === 'summer' ? [[10, 26, 14], [20, 44, 20], [36, 70, 30], [62, 100, 42], [98, 132, 60], [140, 164, 86]]
        : [[70, 58, 20], [116, 96, 30], [162, 136, 44], [200, 172, 66], [226, 204, 104], [240, 224, 150]];
    paintFoliage(ctx, cl, { pal: pal, center: [(x0 + x1) / 2, h, zc], R: 1.0, kind: 'oval', dab: 0.045, density: season === 'summer' ? 1.3 : season === 'spring' ? 0.75 : 0.6, max: 140, seed: 713, sparse: season !== 'summer', tint: tint, flat: 0.55, litBase: 0.5 });
    if (season === 'summer' && !S) { // short leafy fringes where the flowers were
      var fr = mulberry32(714); ctx.fillStyle = rgb(tc(mulc([46, 86, 34], lt), tint));
      for (i = 0; i < 40 * g; i++) { var fx = lerp(x0 - 0.1, x1 + 0.1, fr()), fz = lerp(z0 - 0.05, z1 + 0.05, fr()), fp = P(fx, h - 0.02, fz); if (fz > zc) continue; ctx.beginPath(); ctx.ellipse(fp.x, fp.y + 0.08 * fp.k, 0.025 * fp.k, 0.1 * fp.k, 0, 0, TAU); ctx.fill(); }
    }
  }
  // front posts, front racemes
  post(posts[2]); post(posts[3]);
  racemes(true);
}

/* ---- 04b_events.js ---- */
/* ================= seasonal events: decorations painted into the scene =================
   Each decoration sits on something present at the current stage, falling back to the front of the plot. */
var EVENTS = ['shogatsu', 'setsubun', 'hinamatsuri', 'kodomo', 'tanabata', 'obon', 'tsukimi'];
var EVT = null;
var EV_POS = (function () { function t(q) { return [LX(q[0]), LZ(q[1])]; } return { entL: t([0.12, -0.12]), entR: t([1.58, -0.12]), spot: t([2.05, 0.7]), ver: [TH.X1 - 0.35, TH.ZE + 0.23], pole: t([0.75, 10.0]), toro: [[0.9, 3.85], [1.55, 4.35], [2.3, 3.7], [2.95, 4.25], [1.95, 4.75], [3.55, 3.95]].map(t) }; })();
function evTint() { return LIT.foliageTint || null; }
function evCol(c, ny) { return mulc(c, lightTint(ny === undefined ? 0.8 : ny)); }

/* ---- small shared painters ---- */
function shideAt(ctx, p, k) { // white zig-zag paper streamer hanging from p
  if (sil()) return;
  var w = 0.045 * k, h = 0.2 * k, c = evCol([246, 244, 236]);
  ctx.fillStyle = rgb(c); ctx.strokeStyle = rgb(scl(c, 0.75)); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(p.x - w / 2, p.y); ctx.lineTo(p.x + w / 2, p.y); ctx.lineTo(p.x + w / 2, p.y + h * 0.3); ctx.lineTo(p.x + w * 1.1, p.y + h * 0.3);
  ctx.lineTo(p.x + w * 1.1, p.y + h * 0.62); ctx.lineTo(p.x + w * 0.2, p.y + h * 0.62); ctx.lineTo(p.x + w * 0.2, p.y + h); ctx.lineTo(p.x - w * 0.7, p.y + h);
  ctx.lineTo(p.x - w * 0.7, p.y + h * 0.66); ctx.lineTo(p.x - w / 2, p.y + h * 0.66); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function ropeBetween(ctx, a, b, sag, thick, nShide) { // a twisted straw rope (shimenawa) between two 3D points
  var N = 16, pts = [], i;
  for (i = 0; i <= N; i++) { var t = i / N; pts.push(P(lerp(a[0], b[0], t), lerp(a[1], b[1], t) - sag * 4 * t * (1 - t), lerp(a[2], b[2], t))); }
  var k = pts[N >> 1].k, w = Math.max(0.8, thick * k);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = sil() ? '#000' : rgb(evCol([150, 124, 70])); ctx.lineWidth = w; ctx.beginPath(); pts.forEach(function (p, j) { if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
  if (!sil()) {
    ctx.strokeStyle = rgb(evCol([214, 190, 128])); ctx.lineWidth = w * 0.45; ctx.beginPath(); pts.forEach(function (p, j) { if (j) ctx.lineTo(p.x, p.y - w * 0.2); else ctx.moveTo(p.x, p.y - w * 0.2); }); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,52,26,0.55)'; ctx.lineWidth = Math.max(0.3, w * 0.12);
    for (i = 0; i < N * 2; i++) { var q = pts[Math.min(N, i >> 1)], q2 = pts[Math.min(N, (i >> 1) + 1)], f = (i % 2) * 0.5, x = lerp(q.x, q2.x, f), y = lerp(q.y, q2.y, f); ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - w * 0.45); ctx.lineTo(x + w * 0.3, y + w * 0.45); ctx.stroke(); }
    for (i = 0; i < nShide; i++) { var s = pts[Math.round((i + 0.5) / nShide * N)]; shideAt(ctx, { x: s.x, y: s.y + w * 0.4 }, s.k); }
  }
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
}
function blossomSpray(ctx, segs, rng, col, density, leaf) { // flowers along branch segments (peach)
  if (sil()) return;
  var paths = [new Path2D(), new Path2D(), new Path2D()], lp = new Path2D(), i;
  segs.forEach(function (s) {
    var a = Pa(s.a), b = Pa(s.b), n = Math.round(density * Math.hypot(b.x - a.x, b.y - a.y) + 2);
    for (i = 0; i < n; i++) {
      var t = rng(), x = lerp(a.x, b.x, t) + (rng() - 0.5) * 2.2, y = lerp(a.y, b.y, t) + (rng() - 0.5) * 2.2, r = (0.022 + rng() * 0.012) * a.k, bi = (rng() * 3) | 0;
      paths[bi].moveTo(x + r, y); paths[bi].arc(x, y, r, 0, TAU);
      if (leaf && rng() < 0.3) { lp.moveTo(x + r * 1.4, y + r); lp.ellipse(x + r * 0.6, y + r, r * 1.1, r * 0.45, -0.6, 0, TAU); }
    }
  });
  ctx.fillStyle = rgb(evCol([118, 150, 70])); ctx.fill(lp);
  for (i = 0; i < 3; i++) { ctx.fillStyle = rgb(evCol(mixc(col, [255, 240, 246], i * 0.3))); ctx.fill(paths[i]); }
}
function vase(ctx, x, z, h, r, col) {
  prism(ctx, x, z, 0, h * 0.18, r * 0.62, r, 14, 0, col, { tex: 0.3, snow: 0 });
  prism(ctx, x, z, h * 0.18, h * 0.8, r, r * 0.7, 14, 0, col, { tex: 0.3, snow: 0 });
  prism(ctx, x, z, h * 0.8, h, r * 0.5, r * 0.62, 14, 0, scl(col, 1.08), { tex: 0.3, snow: 0 });
}
function branchesFrom(x, y, z, rng, n, len, spread) {
  var segs = [];
  for (var i = 0; i < n; i++) {
    var ang = (i / (n - 1 || 1) - 0.5) * spread + (rng() - 0.5) * 0.3, L = len * (0.7 + rng() * 0.5), dz = (rng() - 0.5) * 0.2;
    var a = [x, y, z], m = [x + Math.sin(ang) * L * 0.5, y + Math.cos(ang) * L * 0.5, z + dz * 0.5], e = [x + Math.sin(ang * 1.2) * L, y + Math.cos(ang * 1.1) * L, z + dz];
    segs.push({ a: a, b: m, r0: 0.012, r1: 0.009 }, { a: m, b: e, r0: 0.009, r1: 0.004 });
    if (rng() < 0.8) { var tw = [m[0] + (rng() - 0.5) * L * 0.4, m[1] + L * 0.3, m[2]]; segs.push({ a: m, b: tw, r0: 0.006, r1: 0.003 }); }
  }
  return segs;
}

/* ---- お正月 ---- */
function drawKadomatsu(ctx, x, z, side, sc) {
  sc = sc || 1;
  var rng = mulberry32(900 + (side > 0 ? 1 : 0)), S = sil();
  // straw-wrapped base (komo) with rope bands
  var straw = [176, 148, 96];
  prism(ctx, x, z, 0, 0.36 * sc, 0.2 * sc, 0.19 * sc, 18, 0, straw, { tex: 0.6, snow: 0 });
  if (!S) [0.08, 0.27].forEach(function (yy) { ropeBetween(ctx, [x - 0.2 * sc, yy * sc, z - 0.02], [x + 0.2 * sc, yy * sc, z - 0.02], -0.03 * sc, 0.025 * sc, 0); });
  // pine sprigs round the top of the base
  var cl = []; for (var i = 0; i < 9; i++) { var a = rng() * TAU; cl.push({ x: x + Math.cos(a) * 0.17 * sc, y: (0.38 + rng() * 0.12) * sc, z: z + Math.sin(a) * 0.12 * sc, r: (0.1 + rng() * 0.05) * sc, tone: 0 }); }
  paintFoliage(ctx, cl, { pal: PINE_PAL.slice(1), center: [x, 0.42 * sc, z], R: 0.25 * sc, kind: 'needle', dab: 0.03 * sc, density: 1.6, max: 90, seed: 905 + side, sparse: true, tint: evTint(), snow: SEA.snow ? 0.4 : 0 });
  // three green bamboo stalks, cut on the slant
  [[-0.05, 1.05, 0.0], [0.06, 0.86, -0.04], [-0.01, 0.7, -0.08]].forEach(function (b) {
    var bx = x + b[0] * side * sc, top = [bx, b[1] * sc, z + b[2] * sc];
    bamboo(ctx, [bx, 0.3 * sc, z + b[2] * sc], top, 0.045 * sc, [104, 150, 66]);
    if (!S) { var p = Pa(top), q = P(bx + 0.04 * side * sc, (b[1] - 0.07) * sc, z + b[2] * sc); ctx.fillStyle = rgb(evCol([226, 220, 170])); ctx.beginPath(); ctx.ellipse((p.x + q.x) / 2, (p.y + q.y) / 2, 0.05 * sc * p.k, 0.02 * sc * p.k, Math.atan2(q.y - p.y, q.x - p.x), 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(evCol([80, 112, 50])); ctx.lineWidth = 0.4; ctx.stroke(); }
  });
  if (!S) { // nanten berries and a sprig of plum blossom
    for (i = 0; i < 9; i++) { var bp = P(x + side * (0.12 + rng() * 0.08) * sc, (0.45 + rng() * 0.12) * sc, z - 0.1 * sc); ctx.fillStyle = rgb(evCol([196, 30, 30])); ctx.beginPath(); ctx.arc(bp.x, bp.y, 0.017 * sc * bp.k, 0, TAU); ctx.fill(); }
    var segs = branchesFrom(x - side * 0.1 * sc, 0.42 * sc, z - 0.1 * sc, rng, 2, 0.3 * sc, 1.2); drawBranches(ctx, segs, [[50, 36, 30], [80, 60, 50], [110, 90, 76]]); blossomSpray(ctx, segs, rng, [236, 196, 206], 1.4, false);
  }
}
function shimenawaScene(put) {
  if (F.gate) { var g = LAY.gate, z = LAY.fenceZ - 0.16; put((g.xa + g.xb) / 2, z, { draw: function (c) { ropeBetween(c, [g.xa + 0.05, 1.86, z], [g.xb - 0.05, 1.86, z], 0.16, 0.07, 4); }, key: P(2.6, 0, z - 0.5).d, noRefl: true }); }
  if (F.teahouse) { var zz = TH.ZW - 0.1; put((TH.X0 + TH.X1) / 2, zz, { draw: function (c) { ropeBetween(c, [TH.X0 + 0.15, 2.0, zz], [TH.X1 - 0.1, 2.0, zz], 0.12, 0.06, 5); }, key: P(-1.9, 0, TH.ZE - 0.3).d }); }
  if (!F.gate && !F.teahouse && F.rock1) { var rx = LAY.rock1.x, rz = LAY.rock1.z; put(rx, rz - 0.4, { draw: function (c) { ropeBetween(c, [rx - 0.65, 0.3, rz - 0.15], [rx + 0.63, 0.3, rz - 0.15], 0.1, 0.05, 3); }, key: P(rx, 0, rz - 0.6).d }); }
}

/* ---- 節分 ---- */
function drawHiiragi(ctx, x, y, z) {
  if (sil()) return;
  var p = P(x, y, z), k = p.k * 1.5, rng = mulberry32(915);
  ctx.strokeStyle = rgb(evCol([90, 70, 50])); ctx.lineWidth = Math.max(0.5, 0.012 * k); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 0.03 * k, p.y + 0.24 * k); ctx.stroke();
  for (var i = 0; i < 6; i++) { // spiky holly leaves
    var a = -Math.PI / 2 + (i - 2.5) * 0.55, lx = p.x + Math.cos(a) * 0.07 * k, ly = p.y + 0.02 * k + Math.sin(a) * 0.05 * k, L = 0.06 * k, W = 0.026 * k;
    ctx.fillStyle = rgb(evCol(i % 2 ? [30, 66, 36] : [44, 86, 44])); ctx.beginPath();
    for (var j = 0; j <= 8; j++) { var t = j / 8, ww = Math.sin(t * Math.PI) * W * (j % 2 ? 1.25 : 0.8); ctx.lineTo(lx + Math.cos(a) * L * (t - 0.5) - Math.sin(a) * ww, ly + Math.sin(a) * L * (t - 0.5) + Math.cos(a) * ww); }
    for (j = 8; j >= 0; j--) { var t2 = j / 8, w2 = Math.sin(t2 * Math.PI) * W * (j % 2 ? 1.25 : 0.8); ctx.lineTo(lx + Math.cos(a) * L * (t2 - 0.5) + Math.sin(a) * w2, ly + Math.sin(a) * L * (t2 - 0.5) - Math.cos(a) * w2); }
    ctx.fill();
  }
  // the sardine head, nose down
  var hx = p.x - 0.03 * k, hy = p.y + 0.26 * k, g = ctx.createLinearGradient(hx - 0.03 * k, hy, hx + 0.03 * k, hy);
  g.addColorStop(0, rgb(evCol([70, 84, 104]))); g.addColorStop(0.5, rgb(evCol([196, 204, 210]))); g.addColorStop(1, rgb(evCol([120, 130, 140])));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(hx, hy, 0.026 * k, 0.05 * k, 0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgb(20,20,24)'; ctx.beginPath(); ctx.arc(hx + 0.006 * k, hy - 0.012 * k, Math.max(0.4, 0.008 * k), 0, TAU); ctx.fill();
}
function drawBeans(ctx) {
  if (sil()) return;
  var rng = mulberry32(917), pts = [], lt = lightTint(1), i;
  var stones = F.path ? PATH_MAIN.slice(0, 6) : [];
  stones.forEach(function (s) { for (var j = 0; j < 7; j++) { var a = rng() * TAU, d = Math.sqrt(rng()) * 0.85; pts.push([s[0] + Math.cos(a) * s[2] * d, 0.075, s[1] + Math.sin(a) * s[3] * d]); } });
  for (i = 0; i < 40; i++) pts.push([LX(0.2 + rng() * 2.4), 0.01, LZ(-0.5 + rng() * 2.2)]);
  var mp = EV_POS.spot; for (i = 0; i < 26; i++) { var a2 = rng() * TAU, d2 = Math.sqrt(rng()) * 0.5; pts.push([mp[0] - 0.4 + Math.cos(a2) * d2, 0.01, mp[1] - 0.2 + Math.sin(a2) * d2 * 0.6]); }
  var paths = [new Path2D(), new Path2D()];
  pts.forEach(function (q) { var p = P(q[0], q[1], q[2]), r = Math.max(0.45, 0.022 * p.k), b = paths[rng() < 0.5 ? 0 : 1]; b.moveTo(p.x + r, p.y); b.ellipse(p.x, p.y, r, r * 0.8, 0, 0, TAU); });
  ctx.fillStyle = rgb(mulc([196, 160, 104], lt)); ctx.fill(paths[0]); ctx.fillStyle = rgb(mulc([222, 190, 132], lt)); ctx.fill(paths[1]);
}
function drawMasu(ctx, x, z) { // the wooden measure of roasted beans
  var wood = [196, 166, 116], h = 0.16, r = 0.18;
  prism(ctx, x, z, 0, h, r, r, 4, Math.PI / 4 + 0.2, wood, { tex: 0.3, snow: 0 });
  if (sil()) return;
  var rng = mulberry32(919), lt = lightTint(1);
  for (var i = 0; i < 26; i++) { var p = P(x + (rng() - 0.5) * r * 1.2, h + 0.01 + rng() * 0.03, z + (rng() - 0.5) * r * 1.2), rr = Math.max(0.45, 0.02 * p.k); ctx.fillStyle = rgb(mulc(rng() < 0.5 ? [196, 160, 104] : [224, 194, 136], lt)); ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.fill(); }
}

/* ---- ひな祭り ---- */
var MOMO = [230, 118, 150];
function drawPeachVase(ctx, x, y0, z, s) {
  var rng = mulberry32(931);
  var col = [70, 96, 104];
  prism(ctx, x, z, y0, y0 + 0.05 * s, 0.07 * s, 0.1 * s, 14, 0, col, { snow: 0 });
  prism(ctx, x, z, y0 + 0.05 * s, y0 + 0.24 * s, 0.1 * s, 0.07 * s, 14, 0, col, { snow: 0 });
  prism(ctx, x, z, y0 + 0.24 * s, y0 + 0.3 * s, 0.05 * s, 0.065 * s, 14, 0, scl(col, 1.1), { snow: 0 });
  var segs = branchesFrom(x, y0 + 0.28 * s, z, rng, 5, 0.55 * s, 1.6);
  drawBranches(ctx, segs, [[50, 32, 30], [84, 56, 50], [116, 86, 76]]);
  blossomSpray(ctx, segs, rng, MOMO, 1.5, true);
}
function drawHinaDan(ctx, x, z) { // three tiers in red felt on the veranda, the pair of dolls on top before a gold screen
  var y0 = TH.FH, w = 0.62, S = sil(), red = [190, 38, 36];
  var tiers = [[0, 0.11, 0.0], [0.11, 0.22, 0.09], [0.22, 0.33, 0.18]];
  tiers.forEach(function (t) { var zf = z - 0.16 + t[2], zb = z + 0.16; quad3(ctx, [[x - w / 2, y0 + t[0], zf], [x + w / 2, y0 + t[0], zf], [x + w / 2, y0 + t[1], zf], [x - w / 2, y0 + t[1], zf]], S ? [0, 0, 0] : shade(red, [0, 0, -1]), 0.3); quad3(ctx, [[x - w / 2, y0 + t[1], zf], [x + w / 2, y0 + t[1], zf], [x + w / 2, y0 + t[1], zb], [x - w / 2, y0 + t[1], zb]], S ? [0, 0, 0] : shade(red, [0, 1, 0]), 0.3); });
  quad3(ctx, [[x - 0.27, y0 + 0.33, z + 0.12], [x + 0.27, y0 + 0.33, z + 0.12], [x + 0.27, y0 + 0.62, z + 0.12], [x - 0.27, y0 + 0.62, z + 0.12]], S ? [0, 0, 0] : shade([214, 172, 84], [0, 0.2, -1]), 0.3);
  if (S) return;
  function doll(dx, dy, dz, robe, h) {
    var b = P(x + dx, y0 + dy, z + dz), t = P(x + dx, y0 + dy + h, z + dz), k = b.k;
    ctx.fillStyle = rgb(shade(robe, [0, 0.3, -1])); ctx.beginPath(); ctx.moveTo(b.x - 0.05 * k, b.y); ctx.quadraticCurveTo(b.x - 0.045 * k, t.y + 0.02 * k, t.x, t.y + 0.015 * k); ctx.quadraticCurveTo(b.x + 0.045 * k, t.y + 0.02 * k, b.x + 0.05 * k, b.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(shade([246, 238, 226], [0, 0.4, -1])); ctx.beginPath(); ctx.arc(t.x, t.y, 0.016 * k, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(20,18,20)'; ctx.beginPath(); ctx.arc(t.x, t.y - 0.01 * k, 0.014 * k, Math.PI, TAU); ctx.fill();
  }
  doll(-0.08, 0.33, 0.06, [36, 40, 70], 0.12); doll(0.08, 0.33, 0.06, [200, 70, 64], 0.11);
  [-0.16, 0, 0.16].forEach(function (dx, i) { doll(dx, 0.22, -0.02, [i === 1 ? 236 : 210, 220, 220], 0.08); });
  [-0.24, 0.24].forEach(function (dx) { var p = P(x + dx, y0 + 0.4, z + 0.04); ctx.fillStyle = rgb(shade([250, 236, 210], [0, 0, -1])); ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.025 * p.k, 0.035 * p.k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(shade([180, 40, 30], [0, 0, -1])); ctx.fillRect(p.x - 0.022 * p.k, p.y - 0.04 * p.k, 0.044 * p.k, 0.01 * p.k); if (LIT.lit) addGlow(p, 8, 0.45, false); });
}
function drawRedBench(ctx, x, z) { // a low bench under red felt (hi-mosen)
  var w = 1.1, d = 0.42, h = 0.42, wood = [104, 78, 56], red = [194, 40, 38], S = sil();
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { prism(ctx, x + q[0] * (w / 2 - 0.06), z + q[1] * (d / 2 - 0.05), 0, h - 0.03, 0.03, 0.03, 4, 0, wood, { snow: 0 }); });
  quad3(ctx, [[x - w / 2, h, z - d / 2], [x + w / 2, h, z - d / 2], [x + w / 2, h, z + d / 2], [x - w / 2, h, z + d / 2]], S ? [0, 0, 0] : shade(snowAlb(red, 1, 0.4), [0, 1, 0]), 0.4);
  quad3(ctx, [[x - w / 2, h - 0.16, z - d / 2 - 0.01], [x + w / 2, h - 0.16, z - d / 2 - 0.01], [x + w / 2, h, z - d / 2 - 0.01], [x - w / 2, h, z - d / 2 - 0.01]], S ? [0, 0, 0] : shade(red, [0, 0.1, -1]), 0.4);
  if (!S) texOverlay(ctx, function () { poly(ctx, [[x - w / 2, h - 0.16, z - d / 2], [x + w / 2, h - 0.16, z - d / 2], [x + w / 2, h, z + d / 2], [x - w / 2, h, z + d / 2]].map(Pa)); }, 0.35);
}

/* ---- こどもの日: the pole (the carp swim in the animation) ---- */
function drawKoiPole(ctx) {
  var p = EV_POS.pole, H = 4.7;
  prism(ctx, p[0], p[1], 0, H, 0.07, 0.04, 10, 0, [170, 150, 112], { tex: 0.3, snow: 0 });
  prism(ctx, p[0], p[1], -0.02, 0.18, 0.2, 0.18, 8, 0, [120, 116, 108]);
  if (sil()) return;
  var t = P(p[0], H + 0.08, p[1]), k = t.k; // the spinning arrow wheel and the gilt ball
  ctx.strokeStyle = rgb(evCol([210, 176, 90])); ctx.lineWidth = Math.max(0.4, 0.012 * k);
  for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + Math.cos(a) * 0.14 * k, t.y + Math.sin(a) * 0.05 * k); ctx.stroke(); }
  ctx.fillStyle = rgb(evCol([232, 196, 96])); ctx.beginPath(); ctx.arc(t.x, t.y - 0.08 * k, 0.045 * k, 0, TAU); ctx.fill();
}
/* ---- 七夕: the bamboo; the paper strips sway in the animation ---- */
function sasaGeom() {
  var p = EV_POS.spot, x = p[0] + 0.05, z = p[1] + 0.1, rng = mulberry32(951), stem = [], i;
  for (i = 0; i <= 6; i++) { var t = i / 6; stem.push([x - 0.22 * t * t, 2.5 * t, z + 0.05 * t]); }
  var twigs = [], hangs = [], cols = [[214, 52, 48], [236, 196, 60], [52, 98, 176], [68, 150, 84], [246, 244, 236], [150, 80, 170], [236, 130, 160]];
  for (i = 0; i < 9; i++) {
    var f = 0.35 + i / 8 * 0.62, b = stem[Math.min(5, Math.floor(f * 6))], side = i % 2 ? 1 : -1, L = 0.35 + rng() * 0.3;
    var a = [b[0], b[1], b[2]], e = [b[0] + side * L, b[1] - 0.05 - rng() * 0.15, b[2] + (rng() - 0.5) * 0.2];
    twigs.push({ a: a, b: e, r0: 0.012, r1: 0.005 });
    for (var j = 0; j < 3; j++) { var u = 0.3 + j * 0.3, q = [lerp(a[0], e[0], u), lerp(a[1], e[1], u) - 0.02, lerp(a[2], e[2], u)]; hangs.push({ p: q, kind: rng() < 0.7 ? 'tanzaku' : rng() < 0.5 ? 'chain' : 'ami', col: cols[(rng() * cols.length) | 0], col2: cols[(rng() * cols.length) | 0], L: 0.16 + rng() * 0.08, ph: rng() * TAU }); }
  }
  var segs = []; for (i = 0; i < stem.length - 1; i++) segs.push({ a: stem[i], b: stem[i + 1], r0: lerp(0.035, 0.012, i / 6), r1: lerp(0.035, 0.012, (i + 1) / 6) });
  return { segs: segs, twigs: twigs, hangs: hangs, top: stem[6], x: x, z: z };
}
function drawSasa(ctx) {
  var g = sasaGeom(), S = sil();
  if (S) { drawBranches(ctx, g.segs.concat(g.twigs), [[0, 0, 0], [0, 0, 0], [0, 0, 0]]); return; }
  drawBranches(ctx, g.segs, [[84, 120, 52], [120, 160, 74], [170, 200, 110]]);
  drawBranches(ctx, g.twigs, [[70, 100, 44], [100, 136, 60], [140, 170, 90]]);
  var cl = []; g.twigs.concat([{ b: g.top }]).forEach(function (t) { for (var i = 0; i < 3; i++) cl.push({ x: t.b[0] + (i - 1) * 0.1, y: t.b[1] + 0.03, z: t.b[2], r: 0.13, tone: 0 }); });
  paintFoliage(ctx, cl, { pal: [[24, 52, 22], [40, 80, 30], [66, 112, 42], [104, 146, 62], [150, 180, 96]], center: [g.x, 1.8, g.z], R: 0.8, kind: 'needle', dab: 0.05, density: 1.4, max: 60, seed: 953, sparse: true, tint: evTint() });
}
/* ---- お盆 ---- */
function drawChochin(ctx, x, y, z, s, lit) { // an oval gifu lantern with painted flowers and a tassel; y is the top
  var t = P(x, y, z), b = P(x, y - 0.28 * s, z), k = t.k, cx = t.x, cy = (t.y + b.y) / 2, rx = Math.max(0.3, 0.1 * s * k), ry = Math.max(0.3, Math.abs(b.y - t.y) / 2);
  if (sil()) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill(); return; }
  var base = lit ? [255, 226, 170] : evCol([236, 228, 206]);
  var g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.2, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, rgb(lit ? [255, 246, 220] : mixc(base, [255, 255, 255], 0.3))); g.addColorStop(1, rgb(lit ? [236, 160, 90] : scl(base, 0.8)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = lit ? 'rgba(160,90,40,0.35)' : 'rgba(110,100,90,0.35)'; ctx.lineWidth = 0.3;
  for (var i = 1; i < 6; i++) { var yy = cy - ry + ry * 2 * i / 6, ww = rx * Math.sqrt(1 - Math.pow((yy - cy) / ry, 2)); ctx.beginPath(); ctx.moveTo(cx - ww, yy); ctx.lineTo(cx + ww, yy); ctx.stroke(); }
  var rng = mulberry32((x * 100) | 0); // painted bellflowers
  for (i = 0; i < 4; i++) { ctx.fillStyle = rgb(lit ? [170, 90, 150] : evCol(i % 2 ? [96, 80, 160] : [70, 120, 90])); ctx.beginPath(); ctx.arc(cx + (rng() - 0.5) * rx * 1.1, cy + (rng() - 0.5) * ry * 0.9, rx * 0.18, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgb(40,32,28)'; ctx.fillRect(cx - rx * 0.5, t.y - 0.6, rx, 1.2); ctx.fillRect(cx - rx * 0.4, b.y - 0.6, rx * 0.8, 1.2);
  ctx.strokeStyle = rgb(evCol([160, 60, 90])); ctx.lineWidth = Math.max(0.4, 0.01 * k); ctx.beginPath(); ctx.moveTo(cx, b.y); ctx.lineTo(cx, b.y + 0.12 * s * k); ctx.stroke();
  if (lit) addGlow({ x: cx, y: cy }, 16 * s, 0.75, true);
}
function drawBonStand(ctx, x, z, lit) { // a standing lantern on a black lacquer stand
  prism(ctx, x, z, 0, 0.04, 0.16, 0.16, 4, 0.3, [30, 26, 24], { snow: 0 });
  prism(ctx, x, z, 0.04, 1.0, 0.018, 0.018, 6, 0, [30, 26, 24], { snow: 0 });
  var a = P(x, 1.0, z), b = P(x + 0.2, 1.05, z); ctx.strokeStyle = sil() ? '#000' : 'rgb(30,26,24)'; ctx.lineWidth = Math.max(0.6, 0.02 * a.k); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  drawChochin(ctx, x + 0.2, 0.98, z, 1.1, lit);
}
function drawToro(ctx, x, z, lit, rng) { // a floating paper lantern
  var p = P(x, WL + 0.01, z), k = p.k, w = 0.07 * k, h = 0.1 * k;
  if (sil()) { ctx.fillStyle = '#000'; ctx.fillRect(p.x - w, p.y - h, w * 2, h); return; }
  ctx.fillStyle = 'rgb(60,44,30)'; ctx.fillRect(p.x - w * 1.2, p.y - h * 0.15, w * 2.4, h * 0.2);
  ctx.fillStyle = rgb(lit ? [255, 214, 150] : evCol([240, 234, 220])); ctx.fillRect(p.x - w, p.y - h, w * 1.3, h * 0.85);
  ctx.fillStyle = rgb(lit ? [236, 170, 104] : evCol([210, 200, 182])); ctx.fillRect(p.x + w * 0.3, p.y - h * 0.95, w * 0.7, h * 0.8);
  if (lit) { addGlow({ x: p.x, y: p.y - h * 0.5 }, 12, 0.7, false); var gg = ctx.createRadialGradient(p.x, p.y + h * 0.3, 0, p.x, p.y + h * 0.3, w * 3); gg.addColorStop(0, 'rgba(255,190,110,0.5)'); gg.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(p.x, p.y + h * 0.4, w * 3, w * 1.2, 0, 0, TAU); ctx.fill(); }
}
/* ---- お月見 ---- */
function drawSusuki(ctx, x, y0, z, s) {
  var rng = mulberry32(971);
  prism(ctx, x, z, y0, y0 + 0.2 * s, 0.07 * s, 0.09 * s, 14, 0, [120, 100, 70], { snow: 0 });
  if (sil()) return;
  for (var i = 0; i < 9; i++) {
    var ang = (i / 8 - 0.5) * 1.1 + (rng() - 0.5) * 0.2, L = (0.55 + rng() * 0.35) * s, b = P(x, y0 + 0.18 * s, z), e = P(x + Math.sin(ang) * L * 0.6, y0 + 0.18 * s + Math.cos(ang) * L, z), k = b.k;
    ctx.strokeStyle = rgb(evCol([150, 140, 96])); ctx.lineWidth = Math.max(0.3, 0.006 * k); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x + (e.x - b.x) * 0.3, e.y + (b.y - e.y) * 0.4, e.x, e.y); ctx.stroke();
    // the feathery silver plume, bending over
    for (var j = 0; j < 9; j++) { var u = j / 8, px = e.x + Math.sin(ang) * 0.12 * k * u + u * u * 0.05 * k, py = e.y + u * 0.12 * k; ctx.fillStyle = rgb(evCol(mixc([214, 200, 170], [250, 244, 230], rng())), 0.85); ctx.beginPath(); ctx.ellipse(px, py, 0.02 * k, 0.008 * k, 0.9 + ang, 0, TAU); ctx.fill(); }
    if (rng() < 0.6) { var lf = P(x + Math.sin(-ang) * L * 0.4, y0 + 0.18 * s + L * 0.45, z); ctx.strokeStyle = rgb(evCol([110, 120, 70])); ctx.lineWidth = Math.max(0.3, 0.006 * k); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(lf.x, lf.y - 0.1 * k, lf.x + (lf.x - b.x) * 0.4, lf.y + 0.05 * k); ctx.stroke(); }
  }
}
function drawDango(ctx, x, y0, z, s) { // a sanbo stand with a pyramid of white dango
  var wood = [204, 176, 124]; s = s || 1;
  prism(ctx, x, z, y0, y0 + 0.1 * s, 0.09 * s, 0.09 * s, 4, Math.PI / 4, wood, { snow: 0 });
  prism(ctx, x, z, y0 + 0.1 * s, y0 + 0.13 * s, 0.15 * s, 0.15 * s, 4, Math.PI / 4, wood, { snow: 0 });
  if (sil()) return;
  var lt = lightTint(1);
  [[9, 0.0, 0.06], [4, 0.045, 0.04], [1, 0.09, 0]].forEach(function (lv) {
    var n = Math.round(Math.sqrt(lv[0])), sp = 0.045 * s;
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      var p = P(x + (i - (n - 1) / 2) * sp, y0 + (0.15 + lv[1]) * s, z + (j - (n - 1) / 2) * sp - 0.01), r = 0.026 * s * p.k;
      var g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.4, 0, p.x, p.y, r); g.addColorStop(0, rgb(mulc([255, 253, 246], lt))); g.addColorStop(1, rgb(mulc([214, 206, 190], lt)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    }
  });
}
function drawFlatStone(ctx, x, z) { drawRock(ctx, makeRock(981, x, z, 0.3, 0.12, 0.24, { flat: 0.3, amp: 0.12, alb: [140, 136, 128], moss: F.rockMoss * 0.5, outline: 0.08 })); }

/* ---- the event's pieces, put into the scene ---- */
function eventScene(put, flat) {
  var e = EVT, sp = EV_POS.spot, lit = LIT.lit;
  if (!e) return;
  if (e === 'shogatsu') {
    if (F.gate) { var g = LAY.gate, z = LAY.fenceZ - 0.45; [[g.xa - 0.42, -1], [g.xb + 0.42, 1]].forEach(function (q) { put(q[0], z, { draw: function (c) { drawKadomatsu(c, q[0], z, q[1], 1.55); }, noRefl: true }); }); }
    else [[EV_POS.entL, -1], [EV_POS.entR, 1]].forEach(function (q) { put(q[0][0], q[0][1], { draw: function (c) { drawKadomatsu(c, q[0][0], q[0][1], q[1]); } }); });
    shimenawaScene(put);
  } else if (e === 'setsubun') {
    if (F.gate) put(LAY.gate.xb, LAY.fenceZ - 0.2, { draw: function (c) { drawHiiragi(c, LAY.gate.xb - 0.02, 1.45, LAY.fenceZ - 0.16); }, noRefl: true });
    if (F.teahouse) put(TH.X1, TH.ZW - 0.1, { draw: function (c) { drawHiiragi(c, TH.X1 + 0.02, 1.62, TH.ZE - 0.02); }, key: P(TH.X1, 0, TH.ZE - 0.3).d });
    if (!F.gate && !F.teahouse) { var st = [sp[0] - 0.35, sp[1] + 0.25]; put(st[0], st[1], { draw: function (c) { bamboo(c, [st[0], 0, st[1]], [st[0], 0.95, st[1]], 0.02, [150, 130, 84]); drawHiiragi(c, st[0], 0.95, st[1] - 0.02); } }); }
    flat.push({ draw: drawBeans, key: P(0, 0, 0.5).d });
    put(sp[0] - 0.05, sp[1] - 0.1, { draw: function (c) { drawMasu(c, sp[0] - 0.05, sp[1] - 0.1); } });
  } else if (e === 'hinamatsuri') {
    if (F.teahouse) {
      var v = EV_POS.ver; put(v[0], v[1], { draw: function (c) { drawHinaDan(c, v[0] - 0.08, v[1] + 0.02); drawPeachVase(c, v[0] + 0.32, TH.FH, v[1] - 0.12, 0.9); }, key: P(v[0], 0, TH.ZE - 0.35).d });
    } else {
      put(sp[0], sp[1], { draw: function (c) { drawRedBench(c, sp[0], sp[1]); drawPeachVase(c, sp[0] + 0.3, 0.42, sp[1] + 0.02, 1.0); } });
    }
    put(sp[0] - 0.75, sp[1] + 0.35, { draw: function (c) { drawPeachVase(c, sp[0] - 0.75, 0, sp[1] + 0.35, 1.6); } });
  } else if (e === 'kodomo') {
    put(EV_POS.pole[0], EV_POS.pole[1], { draw: drawKoiPole, noRefl: true });
  } else if (e === 'tanabata') {
    put(sp[0], sp[1], { draw: drawSasa });
  } else if (e === 'obon') {
    if (F.teahouse) [TH.X0 + 0.35, TH.X1 - 0.3].forEach(function (x) { put(x, TH.ZE - 0.3, { draw: function (c) { var a = P(x, TH.EY - 0.05, TH.ZE - 0.3), b = P(x, 2.1, TH.ZE - 0.3); c.strokeStyle = sil() ? '#000' : 'rgb(40,32,26)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); drawChochin(c, x, 2.1, TH.ZE - 0.3, 1.0, lit); }, key: P(x, 0, TH.ZE - 0.5).d }); });
    [[EV_POS.entL, 0], [EV_POS.entR, 1]].forEach(function (q) { var x = q[0][0] + (q[1] ? 0.1 : -0.1), z = q[0][1] + 0.15; put(x, z, { draw: function (c) { drawBonStand(c, x, z, lit); } }); });
    if (F.pond && lit) EV_POS.toro.forEach(function (q, i) { if (pondSDF(q[0], q[1]) > -0.15) return; put(q[0], q[1], { draw: function (c) { drawToro(c, q[0], q[1], lit, null); }, noShadow: true }); });
  } else if (e === 'tsukimi') {
    if (F.teahouse) { var vv = EV_POS.ver; put(vv[0], vv[1], { draw: function (c) { drawSusuki(c, vv[0] + 0.28, TH.FH, vv[1] - 0.05, 1.25); drawDango(c, vv[0] - 0.14, TH.FH, vv[1] - 0.12, 1.3); }, key: P(vv[0], 0, TH.ZE - 0.35).d }); }
    else put(sp[0], sp[1], { draw: function (c) { drawFlatStone(c, sp[0], sp[1]); drawSusuki(c, sp[0] + 0.2, 0.1, sp[1] + 0.06, 1.7); drawDango(c, sp[0] - 0.12, 0.1, sp[1] - 0.06, 1.6); } });
  }
}
/* the big harvest moon for tsukimi at dusk and night (backdrop) */
function drawEventMoon(ctx, yo) {
  if (EVT !== 'tsukimi' || !(LIT.id === 'night' || LIT.id === 'dusk')) return false;
  var night = LIT.id === 'night', mx = pagodaPos().x + (F.namiki ? -24 : 16), my = night ? 20 + yo * 0.5 : 27 + yo * 0.6, mr = night ? 14 : 15;
  var mg = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 5); mg.addColorStop(0, night ? 'rgba(236,232,206,0.45)' : 'rgba(255,226,180,0.4)'); mg.addColorStop(1, 'rgba(240,220,190,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
  var g = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr); g.addColorStop(0, night ? 'rgb(252,250,236)' : 'rgb(255,240,212)'); g.addColorStop(1, night ? 'rgb(232,226,196)' : 'rgb(244,206,160)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
  ctx.fillStyle = night ? 'rgba(170,166,148,0.3)' : 'rgba(200,160,130,0.28)'; [[-5, -3, 4.5], [4, 2, 3.6], [-1, 6, 3], [6, -6, 2.4], [-7, 4, 2]].forEach(function (c) { ctx.beginPath(); ctx.arc(mx + c[0], my + c[1], c[2], 0, TAU); ctx.fill(); });
  return true;
}

/* ---- 05_ground.js ---- */
/* ================= ground pass (per pixel, scalar maths, time-sliced by rows) ================= */
var DAY_TINT = (function () { var l = LIGHTS.day, d = l.sun[1] * 0.95; return [l.amb[0] + l.sunc[0] * d, l.amb[1] + l.sunc[1] * d, l.amb[2] + l.sunc[2] * d]; })();
function groundSetup() {
  var lt = lightTint(1), gi = [lt[0] / DAY_TINT[0], lt[1] / DAY_TINT[1], lt[2] / DAY_TINT[2]];
  var G = gravelInfo(F), Lh = norm([SUN[0], 0, SUN[2]]);
  var sky = mixc(LIT.skyHor, LIT.skyTop, 0.35);
  // moss palette flattened for scalar ramp
  return { gi: gi, G: G, RR: rakeRocks(F), Lh: Lh, sky: sky, sp: 0.11, thr: F.moss, snow: SEA.snow, grid: buildGrid() };
}
/* low-frequency fields cached on a coarse world grid (bilinear sampled per pixel) */
var GG = { x0: -13, z0: -5, st: 0.085 };
function buildGrid() {
  var nx = Math.ceil(27 / GG.st) + 2, nz = Math.ceil(20.5 / GG.st) + 2, N = nx * nz;
  var soil = new Float32Array(N), grass = new Float32Array(N), moss = new Float32Array(N), snow = new Float32Array(N), pd = new Float32Array(N), gnz = new Float32Array(N), gcol = new Float32Array(N);
  var mx = LAY.maple.x, mz = LAY.maple.z, lx = LAY.lantern.x, lz = LAY.lantern.z, tcx = (TH.X0 + TH.X1) / 2, n2 = NZ.n2, fbm = NZ.fbm;
  for (var j = 0; j < nz; j++) {
    var z = GG.z0 + j * GG.st;
    for (var i = 0; i < nx; i++) {
      var x = GG.x0 + i * GG.st, k = j * nx + i;
      soil[k] = fbm(x * 0.7, z * 0.7, 3); grass[k] = fbm(x * 0.55 + 3, z * 0.55 + 9, 2);
      var p = F.pond && x > LX(-1.6) && x < LX(7.8) && z > LZ(0.8) && z < LZ(9) ? pondSDF(x, z) : 9; pd[k] = p;
      if (F.mossOn) {
        var bonus = 0;
        if (p < 4) bonus += 0.16 * Math.exp(-Math.max(0, p) * 1.4);
        if (F.lantern) bonus += 0.12 * Math.exp(-((x - lx) * (x - lx) + (z - lz) * (z - lz)) * 0.8);
        if (F.maple > 0.5) bonus += 0.1 * Math.exp(-((x - mx) * (x - mx) + (z - mz) * (z - mz)) * 0.15);
        if (F.teahouse) bonus += 0.08 * Math.exp(-((x - tcx) * (x - tcx) + (z - TH.ZE) * (z - TH.ZE)) * 0.2);
        moss[k] = fbm(x * 0.42 + 20, z * 0.42 + 5, 3) + bonus;
      }
      if (SEA.snow) snow[k] = fbm(x * 0.8 + 3, z * 0.8 - 2, 2);
      gnz[k] = n2(x * 0.9, z * 0.9 + 70); gcol[k] = n2(x * 3, z * 3);
    }
  }
  var edge = new Float32Array(nx); for (i = 0; i < nx; i++) edge[i] = EDGE + (n2((GG.x0 + i * GG.st) * 0.7, 3.3) - 0.5) * 0.5;
  return { nx: nx, nz: nz, soil: soil, grass: grass, moss: moss, snow: snow, pd: pd, gnz: gnz, gcol: gcol, edge: edge };
}
/* scalar ramp into out[0..2] */
function rampS(p, t, out) { t = t < 0 ? 0 : t > 1 ? 1 : t; t *= p.length - 1; var i = t | 0; if (i > p.length - 2) i = p.length - 2; var f = t - i, a = p[i], b = p[i + 1]; out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f; }
function groundRows(D, M, PW, y0, y1, S) {
  var G = S.G, RR = S.RR, nR = RR.length, sp = S.sp, thr = S.thr, gi = S.gi, Lhx = S.Lh[0], Lhz = S.Lh[2], snow = S.snow, sky = S.sky;
  var s0 = SEA.soil[0], s1 = SEA.soil[1], g0 = SEA.grass[0], g1 = SEA.grass[1];
  var grassAmt = SEA.grassAmt * (F.weeds ? 1.35 : F.leveled && F.s < 4 ? 0.55 : 1) * 0.7;
  var mossPal = SEA.moss, pc = SEA.pond, haze = LIT.haze, hazeK = LIT.hazeK;
  var n2 = NZ.n2, fbm = NZ.fbm, mx = LAY.maple.x, mz = LAY.maple.z, lx = LAY.lantern.x, lz = LAY.lantern.z, tcx = (TH.X0 + TH.X1) / 2;
  var gravelOn = F.gravel, outlineOn = F.gravelOutline, pondOn = F.pond, mossOn = F.mossOn, weeds = F.weeds, marsh = F.marsh, kare = F.kare;
  var mapleBig = F.maple > 0.5, mapleSnow = F.maple > 0.4, lantern = F.lantern, teahouse = F.teahouse;
  // every object field the hot loops need, read once into locals (shared hidden classes elsewhere must never slow these loops)
  var gX0 = +GG.x0, gZ0 = +GG.z0, Gcx = +G.cx, Gcz = +G.cz, Grx = +G.rx, Grz = +G.rz, thX0 = +TH.X0, thX1 = +TH.X1, thZE = +TH.ZE;
  var cCx = +CAM.cx, cCy = +CAM.cy, cF = +CAM.F, cS = +CAM.s, cC = +CAM.c, cX = +CAM.x, cY = +CAM.y, cZ = +CAM.z, ks = +KS;
  var RRx = new Float64Array(nR), RRz = new Float64Array(nR), RRr = new Float64Array(nR), RRn = new Float64Array(nR); for (var q0 = 0; q0 < nR; q0++) { RRx[q0] = RR[q0].x; RRz[q0] = RR[q0].z; RRr[q0] = RR[q0].r; RRn[q0] = RR[q0].n; }
  var tmp = [0, 0, 0], GD = S.grid, gnx = GD.nx, gst = GD.nz, Gsoil = GD.soil, Ggrass = GD.grass, Gmoss = GD.moss, Gsnow = GD.snow, Gpd = GD.pd, Ggnz = GD.gnz, Ggcol = GD.gcol, Gedge = GD.edge, ist = 1 / GG.st;
  for (var py = y0; py < y1; py++) {
    var sy = (py + 0.5) / ks, b = -(sy - cCy) / cF, dy = -cS + b * cC, rowk = py * PW * 4, px;
    if (dy >= 0) { for (px = 0; px < PW; px++) D[rowk + px * 4 + 3] = 0; continue; }
    var t = -cY / dy, z = cZ + t * (cC + b * cS), fp = t / (cF * ks) * 1.9;
    var hz = clamp((t - 22) / 40) * 0.35 * hazeK, rowNearPond = pondOn && z > LZ(1.2) && z < LZ(8.6), rowNearGravel = (gravelOn || outlineOn) && Math.abs(z - Gcz) < Grz * 1.2;
    var tx = t / cF, x0 = cX - tx * cCx;
    var fz = (z - gZ0) * ist, iz = fz | 0; if (iz < 0) iz = 0; if (iz > gst - 2) iz = gst - 2; var tz = fz - iz; if (tz > 1) tz = 1; if (tz < 0) tz = 0; var zo = iz * gnx;
    for (px = 0; px < PW; px++) {
      var k = rowk + px * 4, x = x0 + tx * (px + 0.5) / ks;
      var fx = (x - gX0) * ist, ix = fx | 0; if (ix < 0) ix = 0; if (ix > gnx - 2) ix = gnx - 2; var tq = fx - ix; if (tq > 1) tq = 1; if (tq < 0) tq = 0;
      var i00 = zo + ix, i10 = i00 + 1, i01 = i00 + gnx, i11 = i01 + 1, w00 = (1 - tq) * (1 - tz), w10 = tq * (1 - tz), w01 = (1 - tq) * tz, w11 = tq * tz;
      var edgeZ = Gedge[ix] + (Gedge[ix + 1] - Gedge[ix]) * tq;
      if (z > edgeZ + fp) { D[k + 3] = 0; continue; }
      var gr = hash2(px, py);
      // soil
      var n1 = Gsoil[i00] * w00 + Gsoil[i10] * w10 + Gsoil[i01] * w01 + Gsoil[i11] * w11, nn2 = n2(x * 5.5, z * 5.5), f = n1 * 0.9 + nn2 * 0.3 - 0.1; f = f < 0 ? 0 : f > 1 ? 1 : f;
      var sk = 0.9 + gr * 0.16, r = (s0[0] + (s1[0] - s0[0]) * f) * sk, g = (s0[1] + (s1[1] - s0[1]) * f) * sk, bl = (s0[2] + (s1[2] - s0[2]) * f) * sk, a;
      if (hash2(px >> 1, py >> 1) > 0.975) { r += (168 - r) * 0.55; g += (156 - g) * 0.55; bl += (138 - bl) * 0.55; }
      // grass / weeds
      var gN = Ggrass[i00] * w00 + Ggrass[i10] * w10 + Ggrass[i01] * w01 + Ggrass[i11] * w11, ga = sstep(weeds ? 0.36 : 0.5, weeds ? 0.52 : 0.66, gN);
      if (ga > 0) {
        ga *= (0.55 + 0.45 * n2(x * 16, z * 4)) * grassAmt; if (ga > 1) ga = 1;
        var gf = clamp(n2(x * 22, z * 6) * 0.7 + gr * 0.3);
        r += (g0[0] + (g1[0] - g0[0]) * gf - r) * ga; g += (g0[1] + (g1[1] - g0[1]) * gf - g) * ga; bl += (g0[2] + (g1[2] - g0[2]) * gf - bl) * ga;
      }
      if (weeds) { var wd = n2(x * 3.1 + 50, z * 3.1); if (wd > 0.62) { a = (wd - 0.62) * 1.8; r += (g0[0] * 0.7 - r) * a; g += (g0[1] * 0.7 - g) * a; bl += (g0[2] * 0.7 - bl) * a; } }
      // pond distance
      var pd = 9;
      if (rowNearPond && x > LX(-1.2) && x < LX(7.4)) pd = Gpd[i00] * w00 + Gpd[i10] * w10 + Gpd[i01] * w01 + Gpd[i11] * w11;
      // gravel ellipse distance
      var ge = 9;
      if (rowNearGravel) { var ex = (x - Gcx) / Grx, ez = (z - Gcz) / Grz; ge = Math.sqrt(ex * ex + ez * ez); if (ge < 1.2) ge += (Ggnz[i00] * w00 + Ggnz[i10] * w10 + Ggnz[i01] * w01 + Ggnz[i11] * w11 - 0.5) * 0.08; }
      // moss
      if (mossOn) {
        var mv = Gmoss[i00] * w00 + Gmoss[i10] * w10 + Gmoss[i01] * w01 + Gmoss[i11] * w11 + (n2(x * 9, z * 9) - 0.5) * 0.09 + (gr - 0.5) * 0.03;
        var mA = sstep(thr, thr + 0.05, mv);
        if (mA > 0 && ge < 1.08) mA *= sstep(1.04, 1.08, ge);
        if (mA > 0) {
          rampS(mossPal, 0.12 + n2(x * 7, z * 7) * 0.8 + n2(x * 26, z * 26) * 0.2 + (mv - thr) * 0.7 + gr * 0.1, tmp);
          r += (tmp[0] - r) * mA; g += (tmp[1] - g) * mA; bl += (tmp[2] - bl) * mA;
        }
      }
      // gravel
      var gA = 0;
      if (gravelOn && ge < 1.1) {
        gA = 1 - sstep(0.985, 0.985 + fp * 0.6, ge);
        if (gA > 0) {
          var ph = 0, gx = 0, gz = 1, best = 1e9;
          for (var ri = 0; ri < nR; ri++) { var ddx = x - RRx[ri], ddz = z - RRz[ri], dd = Math.sqrt(ddx * ddx + ddz * ddz), di = dd - RRr[ri], lim = RRn[ri] * sp; if (di < lim && di / lim < best) { best = di / lim; ph = di / sp; gx = ddx / (dd || 1); gz = ddz / (dd || 1); } }
          if (best > 1e8) { ph = (z + (kare ? 0.07 * Math.sin(x * 2.1) : 0)) / sp; gx = kare ? -0.07 * 2.1 * Math.cos(x * 2.1) : 0; gz = 1; }
          var ang = ph * TAU, amp = clamp(1.25 - fp / sp * 2.6), bb = 1 + amp * (0.09 * Math.cos(ang) + 0.15 * Math.sin(ang) * (gx * Lhx + gz * Lhz));
          var gn = Ggcol[i00] * w00 + Ggcol[i10] * w10 + Ggcol[i01] * w01 + Ggcol[i11] * w11, cr, cg, cb;
          if (snow) { cr = 214 + 26 * gn; cg = 222 + 22 * gn; cb = 234 + 16 * gn; } else { cr = 186 + 28 * gn; cg = 180 + 28 * gn; cb = 166 + 26 * gn; }
          var m = bb * (0.9 + gr * (snow ? 0.08 : 0.2)) * (1 - 0.12 * sstep(0.9, 0.985, ge)); if (!snow && gr > 0.985) m *= 0.65;
          r += (cr * m - r) * gA; g += (cg * m - g) * gA; bl += (cb * m - bl) * gA;
        }
      }
      if (outlineOn && ge < 1.0) { a = (1 - sstep(0.97, 1.0, ge)) * 0.8; var of = 0.6 + nn2 * 0.3, ok = 0.98 + gr * 0.06; r += ((s0[0] + (s1[0] - s0[0]) * of) * ok - r) * a; g += ((s0[1] + (s1[1] - s0[1]) * of) * ok - g) * a; bl += ((s0[2] + (s1[2] - s0[2]) * of) * ok - bl) * a; }
      if ((gravelOn || outlineOn) && ge > 0.96 && ge < 1.04) {
        var eb = sstep(0.965, 0.985, ge) * (1 - sstep(1.02, 1.04, ge));
        if (eb > 0) { var pb = hash2(px >> 1, (py >> 1) + 7), em = 0.9 + gr * 0.2, er = (78 + 50 * pb) * em, eg = (74 + 48 * pb) * em, ebb = (68 + 44 * pb) * em; if (outlineOn) { er = er * 0.5 + 45; eg = eg * 0.5 + 36; ebb = ebb * 0.5 + 26; } a = eb * 0.9; r += (er - r) * a; g += (eg - g) * a; bl += (ebb - bl) * a; }
      }
      // snow cover
      if (snow && gA < 1) {
        var snA = sstep(0.28, 0.4, Gsnow[i00] * w00 + Gsnow[i10] * w10 + Gsnow[i01] * w01 + Gsnow[i11] * w11 + 0.12);
        if (mapleSnow) { var dmp = Math.sqrt((x - mx) * (x - mx) + (z - mz) * (z - mz) * 1.44); snA *= sstep(0.3, 1.4, dmp); }
        if (teahouse && x > thX0 - 0.5 && x < thX1 + 0.5 && z > thZE - 0.35 && z < thZE + 0.6) snA *= 0.3;
        var sf = clamp(0.55 + (n2(x * 4, z * 4) - 0.5) * 0.6 + gr * 0.1); a = snA * (1 - gA);
        r += (206 + 38 * sf - r) * a; g += (216 + 31 * sf - g) * a; bl += (232 + 20 * sf - bl) * a;
      }
      // pond
      var w = 0;
      if (pd < 0.4) {
        if (pd > -0.05) { var dk = 0.72 + 0.28 * sstep(-0.02, 0.35, pd); r *= dk; g *= dk; bl *= dk; }
        w = 1 - sstep(-fp * 0.6, fp * 0.6, pd);
        if (w > 0) {
          var dep = clamp(-pd / 0.9), rip = fbm(x * 1.6 + 30, z * 7, 2), dp = Math.pow(dep, 0.6);
          var wr = pc[0] + (20 - pc[0]) * dp, wg = pc[1] + (44 - pc[1]) * dp, wb = pc[2] + (46 - pc[2]) * dp;
          var marshy = marsh ? clamp(1 - Math.max(0, marshSDF(x, z)) * 3) : 0;
          if (dep < 0.25 || marshy > 0) { var pbb = n2(x * 14, z * 14), shal = clamp(Math.max((0.25 - dep) * 1.6, marshy * 0.55)); wr += (110 + 40 * pbb - wr) * shal; wg += (100 + 40 * pbb - wg) * shal; wb += (78 + 34 * pbb - wb) * shal; }
          var fres = clamp(0.22 + 0.16 * clamp((z - 3) / 5) + 0.1 * (rip - 0.5));
          var wm = (0.94 + 0.12 * (rip - 0.5)) * (1 - 0.35 * sstep(-0.18, 0, pd));
          wr = (wr + (sky[0] - wr) * fres) * wm; wg = (wg + (sky[1] - wg) * fres) * wm; wb = (wb + (sky[2] - wb) * fres) * wm;
          if (snow) {
            var iceW = 0.32 + 0.22 * n2(x * 2.2 + 5, z * 2.2), ice = sstep(-iceW - 0.04, -iceW + 0.04, pd) * 0.92;
            if (ice > 0) {
              var icf = clamp(0.5 + (n2(x * 9, z * 3) - 0.5) * 0.8 + (pd + iceW) * 0.8), ir = 180 + 46 * icf, ig = 196 + 38 * icf, ib = 210 + 34 * icf;
              if (pd > -0.06) { ir += (246 - ir) * 0.6; ig += (248 - ig) * 0.6; ib += (252 - ib) * 0.6; }
              wr += (ir - wr) * ice; wg += (ig - wg) * ice; wb += (ib - wb) * ice;
            }
          }
          r += (wr - r) * w; g += (wg - g) * w; bl += (wb - bl) * w;
        }
      }
      var ed = 1 - 0.35 * sstep(edgeZ - 0.9, edgeZ, z);
      r *= ed * gi[0]; g *= ed * gi[1]; bl *= ed * gi[2];
      if (hz > 0) { r += (haze[0] - r) * hz; g += (haze[1] - g) * hz; bl += (haze[2] - bl) * hz; }
      D[k] = r; D[k + 1] = g; D[k + 2] = bl; D[k + 3] = 255 * (1 - sstep(edgeZ - fp, edgeZ + fp, z));
      if (M && w > 0) M[k + 3] = 255 * w * (snow ? clamp((-pd - 0.3) * 6) : 1);
    }
  }
}

/* ---- 06_scene.js ---- */
/* ================= scene assembly ================= */
var EDGE_PALS = {
  autumn: [[[12, 24, 18], [22, 40, 26], [36, 60, 36], [56, 82, 46], [84, 108, 58], [124, 138, 74]], [[10, 18, 14], [18, 30, 22], [28, 44, 30], [42, 60, 40], [62, 80, 50], [92, 104, 64]], [[90, 14, 14], [150, 30, 22], [200, 60, 30], [236, 110, 50], [236, 140, 76]], [[60, 44, 14], [110, 82, 24], [160, 120, 36], [196, 156, 60]], [[40, 30, 14], [80, 56, 22], [130, 90, 34], [176, 130, 56], [210, 170, 90]], [[30, 40, 20], [56, 70, 32], [90, 100, 44], [130, 130, 64]]],
  spring: [[[16, 30, 16], [30, 54, 24], [52, 84, 32], [84, 118, 46], [126, 154, 70], [170, 190, 108]], [[10, 18, 14], [18, 30, 22], [28, 44, 30], [42, 60, 40], [62, 80, 50], [92, 104, 64]], [[150, 120, 132], [192, 162, 174], [222, 196, 206], [240, 222, 228], [250, 240, 243]], [[60, 90, 30], [96, 130, 44], [140, 170, 70], [190, 206, 120]], [[200, 200, 196], [228, 226, 222], [246, 244, 240], [255, 252, 250]], [[30, 48, 22], [56, 84, 34], [92, 124, 50], [140, 166, 84]]],
  summer: [[[8, 22, 14], [16, 38, 20], [30, 60, 28], [52, 88, 38], [86, 120, 52], [130, 156, 76]], [[10, 18, 14], [18, 30, 22], [28, 44, 30], [42, 60, 40], [62, 80, 50], [92, 104, 64]], [[14, 34, 18], [26, 56, 26], [46, 84, 36], [76, 116, 50], [116, 148, 70]], [[20, 40, 16], [40, 70, 26], [70, 104, 40], [110, 140, 60]], [[18, 30, 14], [36, 58, 22], [64, 90, 34], [104, 126, 54], [148, 160, 84]], [[24, 44, 20], [46, 74, 30], [80, 108, 44], [124, 146, 70]]],
  winter: [[[12, 22, 18], [20, 36, 26], [32, 52, 36], [50, 72, 46], [76, 96, 62], [110, 124, 90]], [[10, 18, 14], [18, 30, 22], [28, 44, 30], [42, 60, 40], [62, 80, 50], [92, 104, 64]], [[60, 50, 46], [86, 72, 64], [112, 96, 86], [140, 124, 112]], [[64, 56, 50], [92, 80, 70], [120, 108, 96], [150, 140, 128]], [[70, 60, 52], [100, 88, 76], [130, 118, 104], [160, 150, 136]], [[24, 38, 26], [40, 56, 38], [60, 78, 54], [88, 104, 78]]]
};
function seasonName() { for (var k in SEASONS) if (SEASONS[k] === SEA) return k; return 'autumn'; }
function edgeTreePal(i) {
  var s = seasonName();
  var T = {
    autumn: [[[60, 46, 14], [110, 84, 22], [160, 124, 32], [200, 160, 50], [226, 196, 96]], [[40, 34, 16], [76, 62, 26], [116, 92, 38], [152, 120, 54], [186, 152, 80]], EDGE_PALS.autumn[0]],
    spring: [[[150, 96, 116], [200, 146, 166], [232, 188, 204], [248, 220, 228], [255, 240, 244]], [[40, 66, 20], [76, 110, 34], [124, 156, 60], [170, 196, 100], [210, 226, 150]], EDGE_PALS.spring[0]],
    summer: [EDGE_PALS.summer[2], EDGE_PALS.summer[0], EDGE_PALS.summer[3]],
    winter: [null, null, EDGE_PALS.winter[0]]
  };
  return T[s][i];
}
function edgeBareFor(kindIx) { return SEA.snow && (kindIx === 2 || kindIx === 3 || kindIx === 4); }
function nearPondEdge(x, z) {
  for (var i = 0; i < 12; i++) {
    var d = pondBase(x, z), e = 0.02, gx = (pondBase(x + e, z) - pondBase(x - e, z)) / (2 * e), gz = (pondBase(x, z + e) - pondBase(x, z - e)) / (2 * e), gl = Math.hypot(gx, gz) || 1;
    var step = d - 0.06; x -= gx / gl * step; z -= gz / gl * step;
  }
  return [x, z];
}
function buildScene() {
  var up = [], flat = [], surf = [];
  function put(x, z, o) { o.x = x; o.z = z; if (o.key === undefined) o.key = P(x, 0, z).d; if (z > LAY.fenceZ + 0.2) o.noShadow = true; up.push(o); }
  var s = F.s, er = mulberry32(500), sname = seasonName(), EP = EDGE_PALS[sname];
  var HZ = LIT.haze;
  function hz(pal) { return pal ? pal.map(function (c) { return mixc(c, HZ, 0.14); }) : null; }
  // beyond the terrace
  [[730, LX(-3.6), LZ(11.45), 3.4, 0], [731, LX(4.4), LZ(11.5), 3.8, 1], [732, LX(-8.0), LZ(11.3), 4.2, 2]].forEach(function (a) {
    if (sname === 'spring') { // someiyoshino in full bloom beyond the fence (the avenue takes their place once it grows)
      if (F.namiki && a[4] < 2) return;
      var sk = genSakura(a[0], a[1], a[2], a[3] / 4.4, 0, 1.25, 4); put(a[1], a[2], { draw: function (c) { drawSakura(c, sk, { density: 1.15, haze: 0.16, far: true }); }, noRefl: true, bend: 0.7, sway: { flex: 0.7 } }); return;
    }
    var tp = hz(edgeTreePal(a[4])), t = makeLayered(a[0], a[1], a[2], a[3], a[3] * 0.44, { maxl: 4, spray: 1.3 });
    put(a[1], a[2], { draw: function (c) { drawLayered(c, t, { pal: tp, alt: warmAlt(tp), altK: 0.5, dab: 0.11, cap: 55, density: 1.0, snow: 0.55 }); }, noRefl: true, bend: 0.7, sway: { flex: 0.7 } });
  });
  if (F.namiki) LAY.namiki.forEach(function (a, ii) { // the cherry avenue along the fence
    var nt = genSakura(760 + ii, a[0], a[1], a[2] / 4.6, 0, 1.2, 4); put(a[0], a[1], { draw: function (c) { drawSakura(c, nt, { density: 1.2, haze: 0.06, far: true, pink: true }); }, noRefl: true, bend: 0.75, sway: { flex: 0.75 } });
  });
  var EP2 = [0, 0, 0, 1, 1, 5, 5, 2, 3];
  for (var i = 0; i < 19; i++) {
    var x = LX(-8.6 + i * 0.95 + (er() - 0.5) * 0.7), z = LZ(11.0 + er() * 0.6), kind = EP2[(er() * EP2.length) | 0], R = 0.55 + er() * 0.55, Hh = 0.7 + er() * 0.8;
    (function (x, z, kind, R, Hh, ii) {
      var bare = edgeBareFor(kind);
      // a hedge of mixed shrubs, each a small layered crown on a few stems
      var pal = bare ? null : hz(EP[kind]), sh = makeLayered(600 + ii, x, z, Hh * 1.25, R * 1.1, { maxl: 4, spray: 1.75, bush: 1.9 });
      // behind the bamboo fence only the tops show (except through the gate)
      var behind = F.fence && !(F.gate && x > LAY.gate.xa - 1.2 && x < LAY.gate.xb + 1.2), hideY = behind ? P(x, 1.7, LAY.fenceZ).y : undefined;
      if (behind && Hh * 1.25 * 1.05 < 1.2) return;
      put(x, z, { bend: 0.45, draw: function (c) { drawLayered(c, sh, { pal: pal, alt: warmAlt(pal), altK: 0.4, dab: 0.085, cap: 48, density: 1.2, snow: 0.2, hideY: hideY }); }, ao: function (c) { var p = P(x, 0, z); c.beginPath(); c.ellipse(p.x, p.y, R * p.k * 0.95, R * p.k * CAM.s * 0.9, 0, 0, TAU); c.fill(); }, noRefl: true });
    })(x, z, kind, R, Hh, i);
  }
  var cedar = makeCedar(701, LX(-6.9), LZ(11.6), 13, 1.9); put(cedar.x, cedar.z, { draw: function (c) { drawCedar(c, cedar, 0.06); }, noRefl: true, bend: 0.35, sway: { flex: 0.4 } });
  var gx = LX(7.9), gz = LZ(11.4), ginkgo = makeLayered(702, gx, gz, 9, 2.5, { maxl: 5, spray: 1.15 }), gp = SEA.ginkgo;
  put(gx, gz, { bend: 0.5, sway: { flex: 0.55 }, draw: function (c) { drawLayered(c, ginkgo, { pal: gp, alt: warmAlt(gp), altK: 0.35, dab: 0.1, cap: 55, density: 1.0, snow: 0.5, bark: [[60, 52, 44], [100, 90, 76], [140, 128, 108]] }); }, noRefl: true });
  // rocks
  if (F.rock1) { var rk = makeRock(101, LAY.rock1.x, LAY.rock1.z, 0.62, 0.55, 0.48, { alb: [146, 140, 128], moss: F.rockMoss, flat: 0.72, amp: 0.3 }); put(LAY.rock1.x, LAY.rock1.z, { draw: function (c) { drawRock(c, rk); }, ao: function (c) { rockAO(c, rk); } }); }
  if (F.lantern) { var rk2 = makeRock(104, LX(-1.62), LZ(2.3), 0.28, 0.2, 0.24, { alb: [140, 136, 126], moss: F.rockMoss, flat: 0.5 }); put(LX(-1.62), LZ(2.3), { draw: function (c) { drawRock(c, rk2); }, ao: function (c) { rockAO(c, rk2); } }); }
  if (F.kare) [[110, LX(-3.75), LZ(1.0), 0.34, 1.12, 0.3], [111, LX(-4.55), LZ(2.05), 0.46, 0.7, 0.38], [112, LX(-1.2), LZ(0.7), 0.5, 0.3, 0.4], [113, LX(-3.15), LZ(0.5), 0.24, 0.3, 0.2]].forEach(function (a) {
    var r = makeRock(a[0], a[1], a[2], a[3], a[4], a[5], { alb: [128, 124, 118], moss: F.rockMoss * 0.6, flat: a[4] > 0.6 ? 0.9 : 0.7, amp: 0.3, nu: 28, nv: 14, taper: a[4] > 0.6 ? 0.45 : 0.15, lean: a[4] > 0.6 ? 0.12 : 0 });
    put(a[1], a[2], { draw: function (c) { drawRock(c, r); }, ao: function (c) { rockAO(c, r); } });
  });
  // stepping stones
  var stones = [];
  if (F.path) stones = stones.concat(PATH_MAIN.slice(0, F.bridge ? 9 : 8));
  if (F.teaPath) stones = stones.concat(PATH_TEA);
  if (F.gate) stones = stones.concat(PATH_GATE);
  stones.forEach(function (st, ii) {
    var tone = [[150, 146, 138], [142, 136, 124], [156, 150, 140], [132, 130, 128], [148, 140, 126]][ii % 5];
    var r = makeRock(200 + ii, st[0], st[1], st[2] * 1.05, 0.09, st[3], { alb: tone, moss: F.rockMoss * 0.25, flat: 0.3, amp: 0.16, outline: 0.1, nu: 26, nv: 8, by: -0.025 });
    flat.push({ hit: { id: 'stone', perch: [st[0], 0.08, st[1]], b: [st[0], st[1], st[2] * 1.15, st[3] * 1.15] }, draw: function (c) { drawRock(c, r, 0.6); }, ao: function (c) { rockAO(c, r); }, key: P(st[0], 0, st[1]).d });
  });
  // grass / weed tufts
  var tr = mulberry32(321), nt = s === 0 ? 120 : s <= 2 ? 60 : s <= 4 ? 40 : 24, G = gravelInfo(F);
  var tuftPal = SEA.snow ? [[120, 106, 70], [160, 140, 96], [200, 186, 140]] : sname === 'autumn' || s < 3 ? [[96, 88, 48], [150, 136, 76], [200, 182, 112]] : [[52, 74, 30], [96, 118, 48], [160, 164, 80]];
  for (i = 0; i < nt; i++) {
    var tx = LX(-6 + tr() * 12.5), tz = LZ(-0.8 + tr() * 11), ge = Math.hypot((tx - G.cx) / G.rx, (tz - G.cz) / G.rz), ts = (s === 0 ? 0.16 : 0.12) + tr() * 0.12, seed = tr() * 1e6 | 0;
    if ((F.gravel || F.gravelOutline) && ge < 1.1) continue; if (F.pond && pondSDF(tx, tz) < 0.25) continue; if (F.hill && hillH(tx, tz) > 0) continue;
    if (F.teahouse && tx > TH.X0 - 0.3 && tx < TH.X1 + 0.3 && tz > TH.ZE - 0.3) continue;
    (function (tx, tz, ts, seed) { put(tx, tz, { draw: function (c) { grassTuft(c, tx, tz, ts, mulberry32(seed), tuftPal); }, noShadow: true }); })(tx, tz, ts, seed);
  }
  if (F.weeds) { // a few taller weeds and a stray stone
    var wr = mulberry32(44);
    for (i = 0; i < 26; i++) { (function (wx, wz, seed) { put(wx, wz, { draw: function (c) { grassTuft(c, wx, wz, 0.32, mulberry32(seed), tuftPal); grassTuft(c, wx + 0.08, wz + 0.05, 0.22, mulberry32(seed + 1), tuftPal); } }); })(LX(-5 + wr() * 11), LZ(0 + wr() * 9.5), wr() * 1e6 | 0); }
  }
  // young cherry, planted early, maturing with the garden
  if (F.ycherry > 0) { var yc = genSakura(91, LAY.ycherry.x, LAY.ycherry.z, F.ycherry * 0.82, 0, 1.15, 4); put(LAY.ycherry.x, LAY.ycherry.z, { draw: function (c) { drawSakura(c, yc, { density: 0.85, dab: 0.08, cap: 80, pink: true }); }, ao: function (c) { mapleAO(c, yc); }, bend: 0.8, sway: { flex: 0.8, tag: 'ycherry' } }); }
  if (F.wisteria) { var wz = LAY.wis; put((wz.x0 + wz.x1) / 2, (wz.z0 + wz.z1) / 2, { hit: { id: 'fuji' }, draw: drawWisteria, ao: function (c) { [[wz.x0, wz.z0], [wz.x1, wz.z0], [wz.x0, wz.z1], [wz.x1, wz.z1]].forEach(function (q) { var p = P(q[0], 0, q[1]); c.beginPath(); c.ellipse(p.x, p.y, 0.12 * p.k, 0.05 * p.k, 0, 0, TAU); c.fill(); }); } }); }
  // maple
  if (F.maple > 0) { var mt = genMaple(9, LAY.maple.x, LAY.maple.z, F.maple); put(LAY.maple.x, LAY.maple.z, { draw: function (c) { drawMaple(c, mt); }, ao: function (c) { mapleAO(c, mt); }, bend: 0.8, sway: { flex: 0.8, tag: 'maple' } }); }
  if (F.maple2 > 0) { var mt2 = genMaple(47, LAY.maple2.x, LAY.maple2.z, F.maple2); put(LAY.maple2.x, LAY.maple2.z, { draw: function (c) { drawMaple(c, mt2); }, ao: function (c) { mapleAO(c, mt2); }, sway: { flex: 0.8 } }); }
  // azaleas
  if (F.azaleas > 0) AZALEAS.forEach(function (a, ii) {
    if (ii === 6 && !F.teahouse) return;
    var sc = F.azaleas, bloom = SEA.azBloom, acc;
    if (bloom) acc = { p: bloom.p * (0.6 + 0.4 * sc), pal: bloom.pal, kind: 'circle', s: 0.9 };
    else if (sname === 'autumn') acc = { p: 0.12, pal: [[84, 30, 20], [118, 46, 26], [150, 70, 36]] };
    else if (sname === 'summer') acc = { p: 0.05, pal: [[150, 40, 70], [200, 80, 110], [230, 130, 150]], kind: 'circle', s: 0.8 };
    var sh = makeShrub(400 + ii, a[0], a[1], a[2] * sc, a[3] * sc, SEA.shrub, { accent: acc, dab: 0.045 });
    put(a[0], a[1], { draw: function (c) { drawShrub(c, sh); }, ao: function (c) { shrubAO(c, sh); }, bend: 0.5, sway: { flex: 0.6, shrub: true } });
  });
  if (F.pine > 0) { var pt = genPine(23, LAY.pine.x, LAY.pine.z, F.pine); pt.yuki = true; put(LAY.pine.x, LAY.pine.z, { bend: 0.3, sway: { flex: 0.35, tag: 'pine' }, draw: function (c) { drawPine(c, pt); }, ao: function (c) { var p = Pa(pt.base); c.beginPath(); c.ellipse(p.x, p.y, 0.4 * p.k * pt.S + 1, 0.15 * p.k * pt.S + 0.6, 0, 0, TAU); c.fill(); } }); }
  if (F.pond) {
    var rr = mulberry32(77), placed = [];
    for (i = 0; i < 5000 && placed.length < 34; i++) {
      var px = LX(-0.2 + rr() * 6.8), pz = LZ(2.4 + rr() * 5.6), d = pondBase(px, pz);
      if (Math.abs(d) > 0.06) continue;
      if (Math.abs(pz - BRIDGE.zc) < 0.75 && (Math.abs(px - BRIDGE.x0) < 0.7 || Math.abs(px - BRIDGE.x1) < 0.7)) continue;
      if (Math.abs(px - LAY.fall.x) < 0.75 && pz > LZ(7.0)) continue;
      if (px > LX(1.0) && px < LX(4.4) && pz < LZ(3.5)) continue; // where the iris marsh joins later
      if (placed.some(function (p) { return Math.hypot(p[0] - px, p[1] - pz) < 0.62; })) continue;
      placed.push([px, pz]);
    }
    placed.forEach(function (p, ii) {
      var sz = 0.18 + ((ii * 37) % 10) / 10 * 0.17;
      var r = makeRock(300 + ii, p[0], p[1], sz * 1.3, sz * (0.45 + ((ii * 53) % 7) / 14), sz, { alb: [[138, 132, 122], [124, 120, 114], [146, 138, 124]][ii % 3], moss: F.rockMoss * 0.45, flat: 0.6, amp: 0.34, nu: 18, nv: 9 });
      put(p[0], p[1], { draw: function (c) { drawRock(c, r); }, ao: function (c) { rockAO(c, r); }, refl: true });
    });
    var big = makeRock(150, LX(4.95), LZ(4.75), 0.5, 0.46, 0.4, { alb: [134, 128, 118], moss: F.rockMoss, flat: 0.72 }); put(LX(4.95), LZ(4.75), { draw: function (c) { drawRock(c, big); }, ao: function (c) { rockAO(c, big); }, refl: true });
    // lilies and floating things on the water surface
    if (F.lilies && SEA.lily !== 'none') {
      var lr = mulberry32(909), nl = 0, want = Math.round(16 * F.lilyN);
      for (i = 0; i < 600 && nl < want; i++) {
        var lx = LX(0.6 + lr() * 5.2), lz = LZ(3.2 + lr() * 4.0); if (pondBase(lx, lz) > -0.3) continue; if (Math.abs(lz - BRIDGE.zc) < 0.7 && lx > BRIDGE.x0 && lx < BRIDGE.x1) continue;
        var groupN = 2 + (lr() * 3 | 0), ls = lr() * 1e6 | 0;
        (function (lx, lz, groupN, ls) {
          surf.push(function (c) { var r2 = mulberry32(ls); for (var g = 0; g < groupN; g++) drawLily(c, lx + (r2() - 0.5) * 0.4, lz + (r2() - 0.5) * 0.3, 0.1 + r2() * 0.06, r2, g === 0 && r2() < 0.7); });
        })(lx, lz, groupN, ls);
        nl++;
      }
    }
  }
  if (F.irises) {
    var ir = [[-0.05, 4.4], [4.6, 3.7], [4.3, 6.0], [1.4, 6.9], [4.5, 7.6], [6.0, 7.0], [3.0, 7.55]].map(function (q) { return [LX(q[0]), LZ(q[1])]; });
    ir.forEach(function (a, ii) { var q = nearPondEdge(a[0], a[1]); put(q[0], q[1], { draw: function (c) { drawIrisClump(c, q[0], q[1], 1, 1200 + ii); }, refl: true }); });
  }
  if (F.marsh) {
    var mr = mulberry32(1300);
    for (i = 0; i < 18; i++) { (function (a, b2, sd) { if (marshSDF(a, b2) > 0.02) return; put(a, b2, { draw: function (c) { drawIrisClump(c, a, b2, 0.68, sd); }, refl: true }); })(LX(1.3 + mr() * 3.0), LZ(1.85 + mr() * 0.85), 1400 + i); }
    put(LX(2.75), LZ(2.35), { draw: drawYatsuhashi, refl: true });
  }
  if (F.lantern) put(LAY.lantern.x, LAY.lantern.z, { hit: { id: 'lantern' }, draw: function (c) { drawLantern(c, LAY.lantern, LIT.lit); }, ao: function (c) { var p = P(LAY.lantern.x, 0, LAY.lantern.z); c.beginPath(); c.ellipse(p.x, p.y, 0.42 * p.k, 0.17 * p.k, 0, 0, TAU); c.fill(); }, refl: true });
  if (F.bridge) put((BRIDGE.x0 + BRIDGE.x1) / 2, BRIDGE.zc - 0.3, { hit: { id: 'bridge', perch: [(BRIDGE.x0 + BRIDGE.x1) / 2, 0.92, BRIDGE.zc - 0.35] }, draw: drawBridge, refl: true });
  if (F.fence) put(0, LAY.fenceZ, { draw: function (c) { drawFence(c, F.gate ? [LAY.gate.xa - 0.05, LAY.gate.xb + 0.05] : null); }, ao: function (c) { var a = P(-9, 0, LAY.fenceZ), b = P(10, 0, LAY.fenceZ); c.fillRect(a.x, a.y - 1.2, b.x - a.x, 2.6); }, noRefl: true });
  if (F.gate) put((LAY.gate.xa + LAY.gate.xb) / 2, LAY.fenceZ - 0.05, { draw: drawGate, noRefl: true });
  if (F.teahouse) put((TH.X0 + TH.X1) / 2, TH.ZE + 0.95, { draw: function (c) { drawTeahouse(c, LIT.lit); }, ao: function (c) { var a = P(TH.X0 - 0.2, 0, TH.ZE - 0.1), b = P(TH.X1 + 0.3, 0, TH.ZE - 0.1); c.beginPath(); c.ellipse((a.x + b.x) / 2, a.y - 1, (b.x - a.x) / 2 + 3, 4, 0, 0, TAU); c.fill(); } });
  if (F.smallLanterns) { var sl1 = [LX(-2.55), LZ(7.25)], sl2 = [LX(4.7), LZ(5.55)]; put(sl1[0], sl1[1], { draw: function (c) { smallLantern(c, sl1[0], sl1[1], LIT.lit); } }); put(sl2[0], sl2[1], { draw: function (c) { smallLantern(c, sl2[0], sl2[1], LIT.lit); }, refl: true }); }
  if (F.tsukubai) { flat.push({ draw: drawUmi, key: P(LAY.tsukubai.x, 0, LAY.tsukubai.z - 0.15).d }); put(LAY.tsukubai.x, LAY.tsukubai.z, { hit: { id: 'tsukubai' }, draw: drawTsukubai, anchor: 'tsuku' }); }
  if (F.hill) {
    put(LAY.hill.x, LAY.hill.z, { draw: drawHill, key: P(LAY.hill.x, 0, LAY.hill.z + 0.3).d, refl: true });
    var fx = LAY.fall.x;
    var fz = LAY.fall.ztop - 8.0;
    [[160, fx - 0.55, 8.05 + fz, 0.42, 1.0, 0.36], [161, fx + 0.58, 8.0 + fz, 0.46, 1.25, 0.38], [162, fx + 1.2, 8.3 + fz, 0.38, 0.62, 0.32], [163, fx - 1.25, 8.4 + fz, 0.34, 0.5, 0.3], [164, fx + 0.1, 8.55 + fz, 0.5, 1.75, 0.4], [165, fx - 0.3, 7.55 + fz, 0.22, 0.2, 0.2], [166, fx + 0.42, 7.5 + fz, 0.26, 0.24, 0.22]].forEach(function (a) {
      var y0 = Math.max(0, hillH(a[1], a[2]) - 0.25), r = makeRock(a[0], a[1], a[2], a[3], a[4], a[5], { alb: [118, 114, 108], moss: 0.7, flat: 0.8, by: y0 });
      put(a[1], a[2], { draw: function (c) { drawRock(c, r); }, key: P(a[1], 0, a[2]).d, refl: true });
    });
    put(fx, 7.8 + fz, { draw: drawWaterfall, key: P(fx, 0, 7.75 + fz).d, noShadow: true, refl: true, anchor: 'fall' });
    var hs = makeShrub(470, fx - 1.0, 8.9 + fz, 0.55, 0.5, SEA.shrub, { by: hillH(fx - 1.0, 8.9 + fz) - 0.1, accent: SEA.azBloom ? { p: 0.4, pal: SEA.azBloom.pal, kind: 'circle' } : sname === 'autumn' ? { p: 0.25, pal: [[90, 14, 14], [150, 30, 22], [200, 60, 30]] } : null });
    put(fx - 1.0, 8.9 + fz, { draw: function (c) { drawShrub(c, hs); }, key: P(fx - 1.0, 0, 8.6 + fz).d });
    var hpx = LX(7.75), hpz = LZ(8.35), hy = hillH(hpx, hpz) - 0.05, hp = genPine(29, hpx, hpz, 0.4, hy); put(hpx, hpz, { sway: { flex: 0.35, y0: hy }, draw: function (c) { drawPine(c, hp); }, key: P(hpx, 0, hpz - 0.25).d });
  }
  if (F.shishi) { var sx = LAY.shishi; put(sx.x, sx.z, { hit: { id: 'shishi' }, draw: function (c) { drawShishiStatic(c); }, anchor: 'shishi' }); }
  if (F.cherry) { var cy0 = hillH(LAY.cherry.x, LAY.cherry.z), ch = genCherry(77, LAY.cherry.x, LAY.cherry.z, Math.max(0, cy0 - 0.1)); put(LAY.cherry.x, LAY.cherry.z, { bend: 0.6, sway: { flex: 0.6, tag: 'cherry', y0: cy0 }, draw: function (c) { drawCherry(c, ch); }, ao: function (c) { var p = P(LAY.cherry.x, cy0, LAY.cherry.z); c.beginPath(); c.ellipse(p.x, p.y, 0.5 * p.k, 0.2 * p.k, 0, 0, TAU); c.fill(); } }); }
  // floating leaves / petals on water
  if (F.pond) {
    var fr = mulberry32(808), nf = SEA.fallen === 'leaf' ? Math.round(30 * clamp(F.maple) * leafAmt(CAL)) : SEA.fallen === 'petal' ? Math.round((46 + (F.namiki ? 24 : 0) + (F.cherry ? 40 : 0)) * sakuraCal(CAL).ground) : 0;
    surf.push(function (c) {
      for (var k = 0; k < nf; k++) {
        var x = LX(0.4 + fr() * 6), z = LZ(2.6 + fr() * 5); if (pondSDF(x, z) > -0.1) continue;
        var p = P(x, WL, z);
        if (sil()) { c.fillStyle = '#000'; c.beginPath(); c.arc(p.x, p.y, 0.06 * p.k, 0, TAU); c.fill(); continue; }
        if (SEA.fallen === 'leaf') leafShape(c, p.x, p.y, 0.07 * p.k, fr() * TAU, 0.5, rgb(mulc(ramp([[150, 30, 20], [214, 80, 34], [236, 150, 60]], fr()), lightTint(1))));
        else { var pa = fr() * TAU; c.save(); c.translate(p.x, p.y); c.scale(1, 0.5); petalShape(c, 0, 0, 0.03 * p.k, pa, rgb(mulc(mixc([238, 204, 214], [253, 244, 246], fr()), lightTint(1)), 0.95)); c.restore(); }
      }
    });
  }
  eventScene(put, flat);
  up.sort(function (a, b) { return b.key - a.key; }); flat.sort(function (a, b) { return b.key - a.key; });
  return { up: up, flat: flat, surf: surf };
}
function drawFallen(ctx) {
  var rng = mulberry32(4242), G = gravelInfo(F), mode = SEA.fallen, i;
  if (mode === 'leaf') {
    var la = leafAmt(CAL), n = Math.round((240 * clamp(F.maple * 1.1) + 40) * la) + (F.maple2 ? 40 : 0), lt = lightTint(1);
    for (i = 0; i < n; i++) {
      var x, z, r = rng();
      if (r < 0.55 * Math.min(1, F.maple * 2.5)) { var a = rng() * TAU, d = Math.sqrt(rng()) * 2.6 * Math.max(0.4, F.maple); x = LAY.maple.x + Math.cos(a) * d + 0.6; z = LAY.maple.z + Math.sin(a) * d * 0.8; } else { x = LX(-5.5 + rng() * 11.5); z = LZ(-0.6 + rng() * 10.5); }
      var col = rgb(mulc(ramp([[110, 24, 18], [170, 40, 24], [210, 76, 32], [232, 124, 48], [200, 150, 80]], rng()), lt)), sz = 0.06 + rng() * 0.04, rot = rng() * TAU;
      if (F.pond && pondSDF(x, z) < 0.05) continue; if (F.hill && hillH(x, z) > 0.05) continue;
      var ge = Math.hypot((x - G.cx) / G.rx, (z - G.cz) / G.rz); if (F.gravel && ge < 1 && rng() < 0.75) continue;
      var p = P(x, 0.01, z); leafShape(ctx, p.x, p.y, sz * p.k, rot, 0.5, col);
    }
  } else if (mode === 'petal') {
    var lt2 = lightTint(1), pts = [], dq = Math.sqrt(DQ) * sakuraCal(CAL).ground, dqs = Math.sqrt(DQ);
    function under(cx, cz, R, n, sq) { for (var k = 0; k < n; k++) { var a2 = rng() * TAU, d2 = Math.pow(rng(), 0.7) * R; pts.push([cx + Math.cos(a2) * d2, cz + Math.sin(a2) * d2 * (sq || 0.75), 0]); } }
    for (i = 0; i < 170 * dq; i++) pts.push([LX(-6.5 + rng() * 14), LZ(-0.8 + rng() * 11.4), 0]);           // blown in from everywhere
    for (i = 0; i < 90 * dq; i++) pts.push([LX(-7 + rng() * 15), LZ(9.2 + rng() * 1.2), 0]);                   // drifted against the fence
    if (F.ycherry > 0.3) under(LAY.ycherry.x + 0.3, LAY.ycherry.z - 0.4, 2.2 * F.ycherry, Math.round(160 * F.ycherry * dq));
    if (F.namiki) LAY.namiki.forEach(function (a) { under(a[0], LAY.fenceZ - 0.45, 2.0, Math.round(60 * dq), 0.3); });
    if (F.cherry) under(LAY.cherry.x - 0.4, LAY.cherry.z - 0.8, 2.8, Math.round(220 * dq), 0.7);
    if (F.azaleas > 0.7) AZALEAS.forEach(function (az) { for (var k = 0; k < 10; k++) pts.push([az[0] + (rng() - 0.5) * 1.6, az[1] + (rng() - 0.5) * 0.9, 1]); });
    var NBp = 4, bp = [], k3; for (k3 = 0; k3 < NBp + 1; k3++) bp.push(new Path2D());
    pts.forEach(function (q) {
      if (q[1] > EDGE - 0.2) return;
      if (F.pond && pondSDF(q[0], q[1]) < 0.05) return; if (F.hill && hillH(q[0], q[1]) > 0.05 && rng() < 0.5) return;
      var ge = Math.hypot((q[0] - G.cx) / G.rx, (q[1] - G.cz) / G.rz); if (F.gravel && ge < 1 && rng() < 0.6) return;
      if (F.teahouse && q[0] > TH.X0 - 0.2 && q[0] < TH.X1 + 0.2 && q[1] > TH.ZE - 0.1) return;
      var p = P(q[0], 0.01, q[1]), sz = (0.022 + rng() * 0.014) * p.k, a = rng() * TAU, ix = q[2] ? NBp : (rng() * NBp) | 0, path = bp[ix];
      sz = Math.max(sz, 0.3 / dqs);
      path.moveTo(p.x + Math.cos(a) * sz, p.y + Math.sin(a) * sz * 0.5); path.ellipse(p.x, p.y, sz, sz * 0.55, a, 0, TAU);
    });
    if (sil()) return;
    for (k3 = 0; k3 < NBp; k3++) { ctx.fillStyle = rgb(mulc(mixc([232, 196, 208], [254, 246, 248], k3 / (NBp - 1)), lt2), 0.92); ctx.fill(bp[k3]); }
    ctx.fillStyle = rgb(mulc([226, 110, 150], lt2), 0.9); ctx.fill(bp[NBp]);
  }
}

/* ================= blur & compositing helpers (no ctx.filter needed) ================= */
var TMPS = [];
function tmpCanvas(w, h) { var c = mkCanvas(w, h); TMPS.push(c); return c; }
function freeTmps() { TMPS.forEach(function (c) { c.width = c.height = 0; }); TMPS = []; }
/* approximate gaussian blur by successive half-scaling; returns a canvas of the src size */
function softBlur(src, radius) {
  var w = src.width, h = src.height, cur = src, cw = w, ch = h, s = 1;
  var steps = Math.max(0, Math.round(Math.log(Math.max(1, radius)) / Math.LN2));
  for (var i = 0; i < steps; i++) {
    var nw = Math.max(1, Math.round(cw / 2)), nh = Math.max(1, Math.round(ch / 2)), c = tmpCanvas(nw, nh), x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh); cur = c; cw = nw; ch = nh; s *= 2;
  }
  if (cur === src) return src;
  var out = tmpCanvas(w, h), ox = out.getContext('2d'); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high'; ox.drawImage(cur, 0, 0, cw, ch, 0, 0, w, h);
  return out;
}
function compositeLayer(ctx, src, blur, alpha, color, op) {
  var b = softBlur(src, blur), c = tmpCanvas(ctx.canvas.width, ctx.canvas.height), x = c.getContext('2d');
  x.drawImage(b, 0, 0, c.width, c.height); x.globalCompositeOperation = 'source-in'; x.fillStyle = rgb(color); x.fillRect(0, 0, c.width, c.height);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = op || 'multiply'; ctx.globalAlpha = alpha; ctx.drawImage(c, 0, 0); ctx.restore();
}

/* ---- 07_render.js ---- */
/* ================= static render pipeline ================= */
var now = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };
var CANCEL = { cancelled: true };
function yieldNow() {
  return new Promise(function (res) {
    if (typeof MessageChannel !== 'undefined') { var ch = new MessageChannel(); ch.port1.onmessage = function () { res(); }; ch.port2.postMessage(0); }
    else setTimeout(res, 0);
  });
}
function makeTicker(job, budget) {
  var last = now();
  return function (force) {
    if (!force && now() - last < budget) return null;
    var st = saveState();
    return yieldNow().then(function () { restoreState(st); last = now(); if (job.cancelled) throw CANCEL; });
  };
}
function saveState() { return { BEND: BEND, BENDS: BENDS, FW: FW, SKYM: SKYM, CAL: CAL, EVT: EVT, W: W, H: H, KS: KS, DQ: DQ, CAM: CAM, SUN: SUN, SUNC: SUNC, AMB: AMB, LS: LS, SX: SX, SZ: SZ, MODE: MODE, F: F, SEA: SEA, LIT: LIT, GRAINPAT: GRAINPAT, GLOWS: GLOWS, TMPS: TMPS }; }
function restoreState(s) { BEND = s.BEND; BENDS = s.BENDS; FW = s.FW; SKYM = s.SKYM; CAL = s.CAL; EVT = s.EVT; W = s.W; H = s.H; KS = s.KS; DQ = s.DQ; CAM = s.CAM; SUN = s.SUN; SUNC = s.SUNC; AMB = s.AMB; LS = s.LS; SX = s.SX; SZ = s.SZ; MODE = s.MODE; F = s.F; SEA = s.SEA; LIT = s.LIT; GRAINPAT = s.GRAINPAT; GLOWS = s.GLOWS; TMPS = s.TMPS; }
/* one faulty piece must never blank the whole painting */
function safeDraw(o, c) { c.save(); BEND = o.bend ? bendFor(o) : 0; BENDY = 0; try { o.draw(c); } catch (e) { if (window.console && !safeDraw.n++) console.warn('garden: a piece failed to paint', e); } BEND = 0; c.restore(); }
safeDraw.n = 0;
function setupScene(o) {
  EVT = EVENTS.indexOf(o.event) >= 0 ? o.event : null; CAL = o.cal === undefined || o.cal === null ? 0.5 : o.cal;
  W = o.W; H = o.H; KS = o.KS; DQ = o.DQ || 1; CAM = makeCam(W, H); F = features(o.stage); SEA = SEASONS[o.season]; LIT = weatherLight(LIGHTS[o.light], o.weather, o.after); setLight(LIT); MODE = 'n';
  BENDS = o.windSide || 1; BEND = 0; FW = !!o.fw; SKYM = null;
}
function makeGrainPat(ctx) {
  var p = ctx.createPattern(getGrain(), 'repeat');
  try { if (p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(0.5)); } catch (e) { /* older engines: unscaled grain */ }
  return p;
}
async function renderStatic(job) {
  var t0 = now(), PH = {}, tp = t0; function mark(n) { var t = now(); PH[n] = Math.round(t - tp); tp = t; }
  setupScene(job); GLOWS = []; TMPS = [];
  var tick = makeTicker(job, job.budget || 24), tk;
  var bw = job.bw, bh = job.bh, out = mkCanvas(bw, bh), ctx = out.getContext('2d');
  GRAINPAT = makeGrainPat(ctx);
  var scene = buildScene();
  function lsT(c, s) { c.setTransform(s, 0, 0, s, 0, 0); }
  // 1. backdrop
  var hw = Math.max(1, Math.round(bw / 2)), hh = Math.max(1, Math.round(bh / 2));
  var qw = Math.max(1, Math.round(bw / 4)), qh = Math.max(1, Math.round(bh / 4)), skm = job.mask !== false ? mkCanvas(qw, qh) : null;   // where the open sky shows (for fireworks and lightning)
  if (skm) { SKYM = skm.getContext('2d'); SKYM.fillStyle = '#fff'; SKYM.fillRect(0, 0, qw, qh); lsT(SKYM, KS * qw / bw); }
  var bd = tmpCanvas(hw, hh), bdx = bd.getContext('2d'); lsT(bdx, KS * hw / bw); bdx.fillStyle = rgb(LIT.haze); bdx.fillRect(0, 0, W, H); paintBackdrop(bdx); SKYM = null;
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(softBlur(bd, 0.3 * KS), 0, 0, bw, bh);
  bd.width = bd.height = 0;
  mark('backdrop');
  await tick(true);
  // 2. ground (per pixel, sliced)
  var gc = tmpCanvas(bw, bh), gx = gc.getContext('2d'), img = gx.createImageData(bw, bh), mimg = F.pond ? gx.createImageData(bw, bh) : null;
  var gs = groundSetup(), rows = Math.max(4, Math.round(60000 / bw));
  var gComp = 0, gYield = 0;
  for (var y = 0; y < bh; y += rows) { var tg0 = now(); groundRows(img.data, mimg ? mimg.data : null, bw, y, Math.min(bh, y + rows), gs); gComp += now() - tg0; tk = tick(); if (tk) { var ty0 = now(); await tk; gYield += now() - ty0; } }
  PH.gCompute = Math.round(gComp); PH.gYield = Math.round(gYield);
  gx.putImageData(img, 0, 0); img = null; wetGround(gx, bw, bh);
  ctx.drawImage(gc, 0, 0);
  var mc = null;
  if (F.pond) { mc = tmpCanvas(bw, bh); mc.getContext('2d').putImageData(mimg, 0, 0); mimg = null; }
  mark('ground');
  await tick(true);
  // 3. water: reflections, sheen
  if (F.pond) {
    var rc = tmpCanvas(hw, hh), rx = rc.getContext('2d'); lsT(rx, KS * hw / bw);
    MODE = 'm'; var dq0 = DQ; DQ = Math.max(0.5, DQ * 0.5);
    for (var i = 0; i < scene.up.length; i++) { var o = scene.up[i]; if (o.noRefl) continue; if (!o.refl && !(o.x > LX(-1.5) && o.x < LX(8.5) && o.z > LZ(2.2))) continue; safeDraw(o, rx); tk = tick(); if (tk) await tk; }
    MODE = 'n'; DQ = dq0;
    rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = 'destination-in'; rx.drawImage(mc, 0, 0, hw, hh);
    var r2 = tmpCanvas(hw, hh), r2x = r2.getContext('2d'), amp = KS * hw / bw;
    for (var yy = 0; yy < hh; yy += 1) { var off = (Math.sin(yy / amp * 0.9) * 1.1 + Math.sin(yy / amp * 0.26) * 0.7) * amp; r2x.drawImage(rc, 0, yy, hw, 1, off, yy, hw, 1); }
    r2x.globalCompositeOperation = 'source-atop'; r2x.fillStyle = LIT.id === 'night' ? 'rgba(10,16,40,0.35)' : 'rgba(20,24,30,0.26)'; r2x.fillRect(0, 0, hw, hh);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = SEA.snow ? 0.5 : 0.66; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(r2, 0, 0, bw, bh); ctx.restore();
    // sheen glints
    var sc = tmpCanvas(bw, bh), sx = sc.getContext('2d'); lsT(sx, KS);
    var rng = mulberry32(808), gcol = LIT.id === 'night' ? [190, 210, 255] : LIT.id === 'dusk' ? [255, 210, 170] : [255, 246, 230];
    for (i = 0; i < 300 * Math.sqrt(DQ); i++) { var wx = 0.2 + rng() * 6.4, wz = 1.8 + rng() * 6; if (pondSDF(wx, wz) > -0.15) continue; var p = P(wx, WL, wz), l = (2 + rng() * 6) * p.k / 30; sx.strokeStyle = rgb(gcol, 0.1 + rng() * 0.26); sx.lineWidth = 0.4; sx.beginPath(); sx.moveTo(p.x - l, p.y); sx.lineTo(p.x + l, p.y); sx.stroke(); }
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'destination-in'; sx.drawImage(mc, 0, 0);
    ctx.drawImage(sc, 0, 0);
    mark('water');
    await tick(true);
  }
  // 4. ambient occlusion (half res)
  lsT(ctx, KS);
  var ac = tmpCanvas(hw, hh), ax = ac.getContext('2d'); lsT(ax, KS * hw / bw); ax.fillStyle = '#000';
  scene.up.concat(scene.flat).forEach(function (o) { if (o.ao) o.ao(ax); });
  compositeLayer(ctx, ac, 1.5 * KS * hw / bw, 0.5, [48, 42, 46]);
  // 5. flat things on the ground and water surface
  scene.flat.forEach(function (o) { safeDraw(o, ctx); });
  scene.surf.forEach(function (f) { f(ctx); });
  drawFallen(ctx); paintPuddles(ctx); paintDrifts(ctx);
  mark('aoflat');
  tk = tick(); if (tk) await tk;
  // 6. cast shadows (half res)
  var shc = tmpCanvas(hw, hh), shx = shc.getContext('2d'); lsT(shx, KS * hw / bw);
  MODE = 's'; dq0 = DQ; DQ = Math.max(0.5, DQ * 0.5);
  for (i = 0; i < scene.up.length; i++) { if (!scene.up[i].noShadow) safeDraw(scene.up[i], shx); tk = tick(); if (tk) await tk; }
  MODE = 'n'; DQ = dq0;
  shx.setTransform(1, 0, 0, 1, 0, 0); shx.globalCompositeOperation = 'destination-in'; shx.drawImage(gc, 0, 0, hw, hh);
  compositeLayer(ctx, shc, 1.2 * KS * hw / bw, LIT.shadowA, LIT.shadow);
  mark('shadow');
  await tick(true);
  // 7. upright objects on their own layer (its alpha occludes the water for animation)
  var obj = tmpCanvas(bw, bh), ox = obj.getContext('2d'); lsT(ox, KS);
  var oprof = job.prof ? [] : null;
  for (i = 0; i < scene.up.length; i++) { var to = now(); safeDraw(scene.up[i], ox); if (oprof) { ox.getImageData(0, 0, 1, 1); oprof.push([(now() - to), +scene.up[i].x.toFixed(2), +scene.up[i].z.toFixed(2)]); } tk = tick(); if (tk) await tk; }
  if (oprof) { PH.sum = Math.round(oprof.reduce(function (s, a) { return s + a[0]; }, 0)); PH.n = oprof.length; oprof.sort(function (a, b) { return b[0] - a[0]; }); PH.top = oprof.slice(0, 12); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(obj, 0, 0); ctx.restore();
  mark('objects');
  await tick(true);
  // 8. post
  var reflGlows = GLOWS.filter(function (g) { return g.refl; }), glows = GLOWS.filter(function (g) { return !g.refl; });
  post(ctx, bw, bh, glows, reflGlows, mc);
  mark('post');
  // 9. water visibility mask for the animated overlay (half res)
  var wm = null;
  if (F.pond && job.mask !== false) {
    wm = mkCanvas(hw, hh); var wx2 = wm.getContext('2d');
    wx2.drawImage(mc, 0, 0, hw, hh); wx2.globalCompositeOperation = 'destination-out'; wx2.drawImage(obj, 0, 0, hw, hh);
    lsT(wx2, KS * hw / bw); MODE = 'k'; scene.surf.forEach(function (f) { f(wx2); }); MODE = 'n';
  }
  // 10. occluders in front of the animated anchors (shishi-odoshi tube, tsukubai drips, waterfall), half res
  var occ = null, anc = job.mask !== false ? animAnchors() : [];
  if (anc.length) {
    occ = mkCanvas(hw, hh); var oc = occ.getContext('2d'); lsT(oc, KS * hw / bw); MODE = 'k';
    anc.forEach(function (a) {
      oc.save(); oc.beginPath(); oc.rect(a.bb[0], a.bb[1], a.bb[2] - a.bb[0], a.bb[3] - a.bb[1]); oc.clip();
      for (var j = 0; j < scene.up.length; j++) { var u = scene.up[j]; if (u.key < a.key - 0.02 && u.anchor !== a.id) safeDraw(u, oc); }
      oc.restore();
    });
    MODE = 'n';
  }
  if (skm) { var sx2 = skm.getContext('2d'); sx2.setTransform(1, 0, 0, 1, 0, 0); sx2.globalCompositeOperation = 'destination-out'; sx2.drawImage(gc, 0, 0, qw, qh); sx2.drawImage(obj, 0, 0, qw, qh); }
  freeTmps(); mark('mask');
  return { canvas: out, mask: wm, occ: occ, sky: skm, glows: glows, ms: now() - t0, phases: PH };
}
function post(ctx, bw, bh, glows, reflGlows, mc) {
  var yo = CAM.cy - 204, i;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // depth of field: soften distance and the very front
  var b = softBlur(ctx.canvas, 2.0 * KS), tb = tmpCanvas(bw, bh), tbx = tb.getContext('2d');
  tbx.drawImage(b, 0, 0); tbx.globalCompositeOperation = 'destination-in';
  function st(ly) { return clamp((ly + yo) / H); }
  var gm = tbx.createLinearGradient(0, 0, 0, bh);
  gm.addColorStop(0, 'rgba(0,0,0,0.42)'); gm.addColorStop(st(0.17 * 300), 'rgba(0,0,0,0.22)'); gm.addColorStop(st(0.29 * 300), 'rgba(0,0,0,0)'); gm.addColorStop(Math.max(st(0.29 * 300) + 0.01, st(0.9 * 300)), 'rgba(0,0,0,0)'); gm.addColorStop(1, 'rgba(0,0,0,0.7)');
  tbx.fillStyle = gm; tbx.fillRect(0, 0, bw, bh); ctx.drawImage(tb, 0, 0);
  // light wash from the sun / moon
  var L = LIT, sx = bw * (L.sunX < 0.5 ? L.sunX - 0.08 : L.sunX + 0.08), sy = (yo * KS) + bh * 0 - bh * 0.05 + L.sunY * KS * 120;
  var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, bw * 1.1);
  sg.addColorStop(0, L.wash[0]); sg.addColorStop(0.55, L.wash[1]); sg.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = sg; ctx.fillRect(0, 0, bw, bh);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = L.id === 'night' ? 0.25 : 0.45; ctx.fillRect(0, 0, bw, bh); ctx.globalAlpha = 1;
  if (L.grade) {
    ctx.globalCompositeOperation = 'multiply'; var dg = ctx.createLinearGradient(0, 0, 0, bh);
    dg.addColorStop(0, rgb(L.grade[0])); dg.addColorStop(L.gradeMid ? st(L.gradeMid * 300) : 0.45, rgb(L.grade[1])); dg.addColorStop(1, rgb(L.grade[2])); ctx.fillStyle = dg; ctx.fillRect(0, 0, bw, bh);
  }
  if (L.fog) { ctx.globalCompositeOperation = 'source-over'; paintFog(ctx, bw, bh); }
  if (L.lit) {
    ctx.globalCompositeOperation = 'lighter';
    var gk = (L.id === 'night' ? 1.25 : 0.85) * (L.glowK || 1);
    glows.forEach(function (g) { drawGlow(ctx, g.x * KS, g.y * KS, g.r * KS * (g.far ? 1 : 1.25), g.a * gk); });
    if (mc && reflGlows.length) {
      var rgc = tmpCanvas(bw, bh), rgx = rgc.getContext('2d'); rgx.globalCompositeOperation = 'lighter';
      reflGlows.forEach(function (g) { drawGlow(rgx, g.x * KS, g.y * KS, g.r * KS * 1.6, g.a * gk * 1.4, 0.45); });
      rgx.globalCompositeOperation = 'destination-in'; rgx.drawImage(mc, 0, 0);
      ctx.drawImage(rgc, 0, 0);
    }
  }
  // bloom: threshold by self-multiplication on a small copy
  var q = 4, sw = Math.max(1, Math.round(bw / q)), sh = Math.max(1, Math.round(bh / q)), s1 = tmpCanvas(sw, sh), s1x = s1.getContext('2d');
  s1x.imageSmoothingQuality = 'high'; s1x.drawImage(ctx.canvas, 0, 0, sw, sh);
  var s2 = tmpCanvas(sw, sh), s2x = s2.getContext('2d'); s2x.drawImage(s1, 0, 0); s2x.globalCompositeOperation = 'multiply'; s2x.drawImage(s1, 0, 0); s2x.drawImage(s1, 0, 0);
  var bl = softBlur(s2, 3);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = L.bloom; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bl, 0, 0, bw, bh); ctx.globalAlpha = 1;
  // vignette
  ctx.globalCompositeOperation = 'multiply'; var vg = ctx.createRadialGradient(bw * 0.55, bh * 0.55, Math.max(bw, bh) * 0.3, bw * 0.5, bh * 0.5, Math.max(bw, bh) * 0.78);
  vg.addColorStop(0, 'rgb(255,255,255)'); vg.addColorStop(1, rgb(L.vig)); ctx.fillStyle = vg; ctx.fillRect(0, 0, bw, bh);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.08; var gp = makeGrainPat(ctx); ctx.setTransform(KS, 0, 0, KS, 0, 0); ctx.fillStyle = gp; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function drawGlow(ctx, x, y, r, a, squash) {
  var g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,196,110,' + (0.6 * a) + ')'); g.addColorStop(0.3, 'rgba(255,150,64,' + (0.24 * a) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.save(); if (squash) { ctx.translate(x, y); ctx.scale(1, 1 / squash); ctx.translate(-x, -y); }
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}

/* ---- 08_anim.js ---- */
/* ================= animated overlays (drawn each frame over the static painting) ================= */
/* screen boxes of the animated anchors, used to cut occluders out of the overlay */
function animAnchors() {
  var out = [];
  function box(id, key, x0, x1, y0, y1, z0, z1) {
    var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    [x0, x1].forEach(function (x) { [y0, y1].forEach(function (y) { [z0, z1].forEach(function (z) { var p = P(x, y, z); bx0 = Math.min(bx0, p.x); bx1 = Math.max(bx1, p.x); by0 = Math.min(by0, p.y); by1 = Math.max(by1, p.y); }); }); });
    out.push({ id: id, key: key, bb: [Math.floor(bx0 - 3), Math.floor(by0 - 3), Math.ceil(bx1 + 3), Math.ceil(by1 + 3)] });
  }
  if (F.shishi) { var s = LAY.shishi; box('shishi', P(s.x, 0, s.z).d, s.x - 1.15, s.x + 1.15, -0.1, 1.35, s.z - 0.25, s.z + 0.25); }
  if (F.tsukubai) { var t = LAY.tsukubai; box('tsuku', P(t.x, 0, t.z).d, t.x - 0.32, t.x + 0.18, 0.22, 0.68, t.z - 0.2, t.z + 0.2); }
  if (F.hill) { var f = LAY.fall; box('fall', P(f.x, 0, f.ztop - 0.25).d, f.x - f.wd, f.x + f.wd, WL - 0.05, f.ytop + 0.12, f.zbot - 0.15, f.ztop + 0.1); }
  return out;
}
/* ---- sprites ---- */
var SPR = {};
function sprite(name) {
  if (SPR[name]) return SPR[name];
  var N = 64, c = mkCanvas(N, N), x = c.getContext('2d'), g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  if (name === 'warm') { g.addColorStop(0, 'rgba(255,214,140,1)'); g.addColorStop(0.25, 'rgba(255,170,80,0.45)'); g.addColorStop(1, 'rgba(255,120,40,0)'); }
  else if (name === 'fly') { g.addColorStop(0, 'rgba(250,255,200,1)'); g.addColorStop(0.18, 'rgba(220,255,130,0.8)'); g.addColorStop(0.45, 'rgba(170,230,90,0.18)'); g.addColorStop(1, 'rgba(140,200,60,0)'); }
  else if (name === 'spark') { g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.2, 'rgba(255,236,170,0.75)'); g.addColorStop(0.5, 'rgba(255,210,120,0.18)'); g.addColorStop(1, 'rgba(255,200,100,0)'); }
  else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
  x.fillStyle = g; x.fillRect(0, 0, N, N); SPR[name] = c; return c;
}
function tintedSprite(col) {
  var k = 'm' + col.join(','); if (SPR[k]) return SPR[k];
  var N = 64, c = mkCanvas(N, N), x = c.getContext('2d'), g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, rgb(col, 0.9)); g.addColorStop(0.55, rgb(col, 0.4)); g.addColorStop(1, rgb(col, 0)); x.fillStyle = g; x.fillRect(0, 0, N, N); SPR[k] = c; return c;
}
function stamp(ctx, spr, x, y, rx, ry, a) { if (a <= 0.003) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(spr, x - rx, y - (ry || rx), 2 * rx, 2 * (ry || rx)); }

/* ---- geometry for one controller (computed under its scene globals) ---- */
function catmull(pts, N) {
  var out = [], n = pts.length;
  for (var i = 0; i < n; i++) {
    var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (var k = 0; k < N; k++) {
      var t = k / N, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  var L = [0]; for (i = 1; i <= out.length; i++) { var a = out[i - 1], b = out[i % out.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  return { p: out, L: L, len: L[L.length - 1] };
}
function pathAt(pa, s) {
  s = ((s % pa.len) + pa.len) % pa.len;
  var lo = 0, hi = pa.L.length - 1;
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (pa.L[m] <= s) lo = m; else hi = m; }
  var a = pa.p[lo % pa.p.length], b = pa.p[(lo + 1) % pa.p.length], f = (s - pa.L[lo]) / ((pa.L[lo + 1] - pa.L[lo]) || 1);
  var dx = b[0] - a[0], dz = b[1] - a[1], dl = Math.hypot(dx, dz) || 1;
  return { x: a[0] + dx * f, z: a[1] + dz * f, dx: dx / dl, dz: dz / dl };
}
/* ---- koi: varieties, painted as irregular patches in body coordinates (f: 0 nose .. 1 tail root, v: -1..1 across) ---- */
var KOI_VARS = ['kohaku', 'ogon', 'showa', 'sanke', 'orenji', 'asagi', 'tancho'];
function koiBlob(rng, fc, vc, rf, rv) { var n = 9, pts = [], j; for (j = 0; j < n; j++) { var a = j / n * TAU, r = 0.7 + rng() * 0.45; pts.push([fc + Math.cos(a) * rf * r, vc + Math.sin(a) * rv * r]); } return pts; }
function koiPattern(name, rng) {
  var W = [246, 242, 234], RED = [216, 56, 32], BLK = [26, 24, 28], o = { name: name, base: W, fin: [240, 236, 228], patches: [], sheen: 0.18, motoguro: false, net: false };
  function patch(col, fc, vc, rf, rv) { o.patches.push({ col: col, pts: koiBlob(rng, fc, vc, rf, rv) }); }
  if (name === 'kohaku' || name === 'sanke') {
    var n = 2 + (rng() * 2 | 0), f = 0.12 + rng() * 0.08;
    for (var i = 0; i < n; i++) { var rf = 0.07 + rng() * 0.07; patch(RED, f + rf, (rng() - 0.5) * 0.7, rf, 0.75 + rng() * 0.5); f += rf * 2 + 0.03 + rng() * 0.06; if (f > 0.8) break; }
    if (name === 'sanke') for (i = 0; i < 4; i++) patch(BLK, 0.3 + rng() * 0.45, (rng() - 0.5) * 1.3, 0.02 + rng() * 0.025, 0.18 + rng() * 0.22);
  } else if (name === 'tancho') { o.patches.push({ col: RED, pts: koiBlob(rng, 0.075, 0, 0.04, 0.42), round: true }); }
  else if (name === 'showa') {
    o.base = BLK; o.fin = [70, 66, 66]; o.motoguro = true; o.sheen = 0.1;
    patch(RED, 0.1, 0.1, 0.08, 0.9); patch(RED, 0.42 + rng() * 0.1, (rng() - 0.5) * 0.6, 0.12, 0.95); patch(W, 0.27, -0.6, 0.07, 0.6); patch(W, 0.66, 0.55, 0.08, 0.7); patch(RED, 0.74, -0.2, 0.06, 0.6);
  } else if (name === 'ogon') { o.base = [236, 192, 76]; o.fin = [244, 212, 120]; o.sheen = 0.42; }
  else if (name === 'orenji') { o.base = [240, 132, 40]; o.fin = [246, 170, 90]; o.sheen = 0.36; }
  else if (name === 'asagi') {
    o.base = [118, 138, 158]; o.fin = [222, 168, 140]; o.net = true; o.sheen = 0.12;
    patch([214, 222, 224], 0.06, 0, 0.07, 0.95);                                      // the pale head
    [-1, 1].forEach(function (sd) { patch([214, 104, 54], 0.42, sd * 1.05, 0.3, 0.4); patch([214, 104, 54], 0.2, sd * 1.1, 0.06, 0.32); }); // hi along the lower flanks
  }
  return o;
}
function animGeo(o) {
  var g = { W: W, H: H, KS: KS, cam: CAM, F: F, SEA: SEA, LIT: LIT, season: o.season, light: o.light, stage: o.stage, event: o.event || null };
  var rng = mulberry32(1000 + o.stage * 7);
  g.tint = lightTint(1); var tl = (g.tint[0] + g.tint[1] + g.tint[2]) / 3; g.lum = clamp(tl / 1.15, 0.25, 1.1);
  g.anchors = animAnchors();
  var openW = SEA.snow ? -0.62 : -0.14;
  if (F.pond) {
    // shimmer glints and ripple seeds on open water
    g.glints = []; g.ripplePts = [];
    for (var i = 0; i < 4000 && g.glints.length < 90; i++) {
      var x = LX(-0.8 + rng() * 8.2), z = LZ(1.6 + rng() * 6.6), d = pondSDF(x, z); if (d > openW) continue;
      var p = P(x, WL, z); g.glints.push({ x: p.x, y: p.y, l: (0.05 + rng() * 0.12) * p.k, ph: rng() * TAU, w: 0.6 + rng() * 1.6, a: 0.25 + rng() * 0.5 });
      if (d < openW - 0.2 && rng() < 0.5) g.ripplePts.push([x, z]);
    }
  }
  if (F.koi) {
    var nk = Math.min(7, 3 + Math.floor((o.stage - 8) / 3)), deep = SEA.snow ? -0.75 : -0.4;
    g.koi = [];
    for (var k = 0; k < nk; k++) {
      var best = null;
      for (var tries = 0; tries < 60 && !best; tries++) {
        var c0 = null; for (var q = 0; q < 300; q++) { var cx = LX(k < nk - 1 ? 0.9 + rng() * 2.6 : 1.5 + rng() * 3.5), cz = LZ(k < nk - 1 ? 3.4 + rng() * 1.3 : 4.0 + rng() * 3.4); if (pondBase(cx, cz) < deep - 0.15) { c0 = [cx, cz]; break; } }
        if (!c0) break;
        var wp = [], ok = true, n = 5 + (rng() * 3 | 0), R = 0.5 + rng() * 0.8;
        for (var w = 0; w < n && ok; w++) {
          var a = w / n * TAU + (rng() - 0.5) * 0.8, rr = R * (0.5 + rng() * 0.6), px = c0[0] + Math.cos(a) * rr, pz = c0[1] + Math.sin(a) * rr * 0.7;
          var placed = false; for (var sh = 0; sh < 8; sh++) { if (pondBase(px, pz) < deep) { placed = true; break; } px = lerp(px, c0[0], 0.3); pz = lerp(pz, c0[1], 0.3); }
          if (!placed) ok = false; else wp.push([px, pz]);
        }
        if (!ok || wp.length < 4) continue;
        if (k % 2) wp.reverse();
        var pa = catmull(wp, 12);
        for (var s = 0; s < pa.p.length; s += 3) if (pondBase(pa.p[s][0], pa.p[s][1]) > deep + 0.12) { ok = false; break; }
        if (ok) best = pa;
      }
      if (best) g.koi.push({ path: best, pat: koiPattern(KOI_VARS[k % KOI_VARS.length], rng), len: 0.44 + rng() * 0.16, sp: (0.1 + rng() * 0.08) * (SEA.snow ? 0.55 : 1), off: rng() * 50, ph: rng() * TAU, p1: rng() * TAU, p2: rng() * TAU, depth: (SEA.snow ? 0.24 : 0.1) + rng() * 0.16, surf: SEA.snow ? 0 : 24 + rng() * 26, soff: rng() * 30 });
    }
  }
  if (F.hill) {
    var f = LAY.fall; g.fall = { xc: f.x, wd: f.wd, ytop: f.ytop, ztop: f.ztop, zbot: f.zbot, streaks: [] };
    for (i = 0; i < 34; i++) g.fall.streaks.push({ u: (rng() - 0.5) * 0.92, sp: 0.55 + rng() * 0.6, ph: rng(), len: 0.18 + rng() * 0.3, a: 0.2 + rng() * 0.45, w: 0.4 + rng() * 0.7 });
    g.fall.foam = []; for (i = 0; i < 9; i++) g.fall.foam.push({ u: (rng() - 0.5) * 1.1, ph: rng() * TAU, sp: 0.8 + rng() * 1.2, r: 0.08 + rng() * 0.1 });
  }
  g.glows = [];
  // fireflies: summer evenings
  if (o.season === 'summer' && (o.light === 'night' || o.light === 'dusk')) {
    g.flies = [];
    for (i = 0; i < 400 && g.flies.length < 18; i++) {
      var fx = LX(-4 + rng() * 11), fz = LZ(1.5 + rng() * 8.2); if (F.pond && pondSDF(fx, fz) < -0.3) { if (rng() < 0.7) continue; }
      g.flies.push({ x: fx, y: 0.25 + rng() * 0.9, z: fz, a1: 0.13 + rng() * 0.2, a2: 0.1 + rng() * 0.2, p1: rng() * TAU, p2: rng() * TAU, w: 0.6 + rng() * 0.9, ph: rng() * TAU });
    }
  }
  // falling things source boxes (logical screen)
  g.fallers = o.season === 'autumn' ? 'leaf' : o.season === 'winter' ? 'snow' : null;
  g.petalSrc = petalSources(g);
  g.srcs = [];
  if (F.maple > 0.3 && SEA.maple) { var m = P(LAY.maple.x + 0.4, 2.0 * Math.min(1.4, F.maple * 1.6), LAY.maple.z); g.srcs.push({ x: m.x, y: m.y, r: 1.6 * m.k * Math.min(1.3, F.maple), kind: 'leaf' }); }
  if (F.cherry && SEA.cherry === 'bloom') { var cpt = P(LAY.cherry.x, 2.6, LAY.cherry.z); g.srcs.push({ x: cpt.x, y: cpt.y, r: 1.8 * cpt.k, kind: 'petal' }); }
  g.nFall = g.fallers === 'snow' ? 70 : g.fallers === 'leaf' ? 7 + Math.round(clamp(F.maple) * 10) : g.fallers === 'petal' ? (F.cherry ? 26 : 9) : 0;
  // mist bands
  var fb = P(0, 0, LAY.fenceZ), pc = P(LX(2.5), 0, LZ(5.2));
  g.mist = { y1: fb.y - 4, y2: pc.y, a: LIT.mist, col: LIT.id === 'night' ? [120, 140, 190] : mixc(LIT.haze, [255, 255, 255], 0.35) };
  g.birds = o.light !== 'night';
  if (o.season === 'summer' || o.season === 'autumn') g.dfp = dragonPoints(g);
  if (o.season !== 'winter') g.bfp = butterflyPoints(g);
  g.rp = rarePoints(g);
  g.horizonY = fb.y;
  return g;
}

/* ---- per-frame painters ---- */
/* the distance along its loop (it eases and quickens: speed between ~0.45x and 1.55x) */
function koiS(k, t) { return k.sp * (t + 0.35 / 0.23 * Math.sin(0.23 * t + (k.p1 || 0)) + 0.2 / 0.61 * Math.sin(0.61 * t + (k.p2 || 0))) + k.off; }
function koiSpeed(k, t) { return k.sp * (1 + 0.35 * Math.cos(0.23 * t + (k.p1 || 0)) + 0.2 * Math.cos(0.61 * t + (k.p2 || 0))); }
var KOI_W = [[0, 0.045], [0.04, 0.075], [0.1, 0.104], [0.2, 0.124], [0.32, 0.13], [0.46, 0.12], [0.6, 0.095], [0.74, 0.062], [0.86, 0.034], [0.92, 0.028]];
function koiHalfW(f) { for (var i = 1; i < KOI_W.length; i++) if (f <= KOI_W[i][0]) { var a = KOI_W[i - 1], b = KOI_W[i]; return lerp(a[1], b[1], (f - a[0]) / (b[0] - a[0])); } return KOI_W[KOI_W.length - 1][1]; }
function koiDepth(k, t, g) { // how deep it swims (m); now and then it comes up to the surface for a moment, and to food
  var d = k.depth + 0.05 * Math.sin(t * 0.17 + k.ph), u = k.surf ? ((t + k.soff) % k.surf) : 99, f = g && g.feed;
  if (u < 3.4) d = lerp(d, 0.012, Math.pow(Math.sin(Math.PI * u / 3.4), 0.6));
  if (f) { var fu = t - f.t0; d = lerp(d, 0.03, clamp(fu / 2.5) * clamp((f.dur - fu) / 2)); }
  return d;
}
function drawKoi(ctx, k, t, lum, tint, g) {
  var L = k.len, N = 10, i, v = Math.max(0.03, koiSpeed(k, t)), Lb = L * 0.92, spine = [], depth = koiDepth(k, t, g), y = WL - 0.03 - depth * 0.25;
  // the body follows where the head has been (so it bends through the turns), with a swimming wave running down to the tail
  var beat = TAU * 1.15 * t + 2.2 * Math.sin(0.23 * t + (k.p1 || 0)) + k.ph, amp = 0.55 + 0.9 * clamp((v / k.sp - 0.45) / 1.1);
  // walk back along where the head has been and lay the body on that trail by length (so it never stretches, even when it darts to food)
  var q0 = koiPose(k, t, g), px = q0.x, pz = q0.z, acc = 0, dts = Lb / v / 14, tt = t, hx = q0.dx, hz = q0.dz;
  spine.push({ f: 0, x: px, z: pz });
  for (var st = 0; st < 60 && spine.length < N; st++) {
    tt -= dts; var q = koiPose(k, tt, g), sl = Math.hypot(q.x - px, q.z - pz);
    while (spine.length < N && acc + sl >= spine.length / (N - 1) * Lb) { var need = spine.length / (N - 1) * Lb - acc, r = sl > 1e-6 ? need / sl : 0; spine.push({ f: spine.length / (N - 1) * 0.92, x: px + (q.x - px) * r, z: pz + (q.z - pz) * r }); }
    acc += sl; px = q.x; pz = q.z;
  }
  while (spine.length < N) { var lp = spine[spine.length - 1], pv = spine.length > 1 ? spine[spine.length - 2] : { x: lp.x + hx * 0.01, z: lp.z + hz * 0.01 }, ddx = lp.x - pv.x, ddz = lp.z - pv.z, ddl = Math.hypot(ddx, ddz) || 1; spine.push({ f: spine.length / (N - 1) * 0.92, x: lp.x + ddx / ddl * Lb / (N - 1), z: lp.z + ddz / ddl * Lb / (N - 1) }); }
  for (i = 0; i < N; i++) {
    var a = spine[Math.max(0, i - 1)], b = spine[Math.min(N - 1, i + 1)], dx = a.x - b.x, dz = a.z - b.z, dl = Math.hypot(dx, dz) || 1, sp = spine[i];
    sp.tx = dx / dl; sp.tz = dz / dl; sp.nx = -sp.tz; sp.nz = sp.tx;
    var lat = L * (0.01 + 0.085 * sp.f * sp.f) * amp * Math.sin(beat - 5.2 * sp.f);
    sp.x += sp.nx * lat; sp.z += sp.nz * lat;
  }
  function at(f, vv, yy) { // body coordinates -> screen
    var u = clamp(f / 0.92) * (N - 1), j = Math.min(N - 2, Math.floor(u)), r = u - j, a = spine[j], b = spine[j + 1];
    var x = lerp(a.x, b.x, r), z = lerp(a.z, b.z, r), nx = lerp(a.nx, b.nx, r), nz = lerp(a.nz, b.nz, r), tx = lerp(a.tx, b.tx, r), tz = lerp(a.tz, b.tz, r);
    if (f > 0.92) { x -= tx * (f - 0.92) * L; z -= tz * (f - 0.92) * L; } else if (f < 0) { x -= tx * f * L; z -= tz * f * L; }
    var w = (f > 0.92 ? 0.028 : koiHalfW(f)) * L * vv; return P(x + nx * w, yy === undefined ? y : yy, z + nz * w);
  }
  var deep = mixc(mulc(g.SEA.pond, tint), mulc([60, 90, 110], tint), 0.5), dk0 = clamp(0.03 + depth * 0.7, 0, 0.36), dk = dk0;
  function col(c, a) { return rgb(mixc(mulc(c, tint), deep, dk), a); }
  function outline(yy, grow) {
    ctx.beginPath(); var j, pts = [];
    for (j = 0; j <= 12; j++) pts.push(at(j / 12 * 0.92, grow, yy));
    for (j = 12; j >= 0; j--) pts.push(at(j / 12 * 0.92, -grow, yy));
    var nose = at(-0.025, 0, yy); ctx.moveTo(nose.x, nose.y);
    for (j = 0; j < pts.length; j++) { var p = pts[j], nq = pts[j + 1] || nose; ctx.quadraticCurveTo(p.x, p.y, (p.x + nq.x) / 2, (p.y + nq.y) / 2); }
    ctx.closePath();
  }
  var c0 = at(0.4, 0), pxL = L * c0.k; if (pxL < 1.5) return;
  dk = dk0 * clamp(pxL / 40, 0.25, 1);   // small on screen: keep the colour, or it is lost
  // its shadow on the bottom, where the pond is shallow enough to see it
  var shallow = clamp(1 + pondBase(spine[3].x, spine[3].z) / 0.8) * clamp((lum - 0.35) / 0.4);
  if (shallow > 0.02 && !g.SEA.snow) {
    ctx.save(); var bot = WL - 0.45, s1 = P(spine[3].x + SX * (bot - y) * -1 + 0.04, bot, spine[3].z + SZ * (bot - y) * -1); ctx.translate(s1.x - c0.x, s1.y - c0.y);
    ctx.fillStyle = 'rgba(14,22,24,' + (0.1 * shallow) + ')'; outline(y, 1.5); ctx.fill(); outline(y, 1.0); ctx.fill(); ctx.restore();
  }
  // pectoral fins (they paddle slowly; faster when it turns or brakes) and the long tail fin
  var finA = 0.55 + 0.3 * Math.sin(t * 2.1 + k.ph), pat = k.pat, finCol = pat.fin;
  [1, -1].forEach(function (sd) {
    var r0 = at(0.17, sd * 0.85), r1 = at(0.2 + 0.15 * finA, sd * (2.6 + 0.5 * Math.sin(t * 2.1 + k.ph + sd))), r2 = at(0.33, sd * (1.9 + 0.3 * finA)), r3 = at(0.27, sd * 0.85);
    ctx.fillStyle = col(finCol, 0.62); ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.quadraticCurveTo(r1.x, r1.y, r2.x, r2.y); ctx.quadraticCurveTo((r2.x + r3.x) / 2, (r2.y + r3.y) / 2, r3.x, r3.y); ctx.closePath(); ctx.fill();
    if (pat.motoguro) { ctx.fillStyle = col([20, 18, 20], 0.7); ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(lerp(r0.x, r1.x, 0.4), lerp(r0.y, r1.y, 0.4)); ctx.lineTo(r3.x, r3.y); ctx.fill(); }
  });
  var tb = beat - 5.2 * 1.08, tw = L * 0.13 * amp * Math.sin(tb), t0a = at(0.9, 0.9), t0b = at(0.9, -0.9), tip = spine[N - 1];
  function tailPt(f, side) { var e = (f - 0.92) * L, sw = tw * (0.6 + (f - 0.92) * 4); return P(tip.x - tip.tx * e + tip.nx * (sw + side * L * 0.11 * (f - 0.88) * 3.2), y, tip.z - tip.tz * e + tip.nz * (sw + side * L * 0.11 * (f - 0.88) * 3.2)); }
  var la = tailPt(1.2, 1.1), lb = tailPt(1.2, -1.1), mid = tailPt(1.08, 0), cA = tailPt(1.07, 1.35), cB = tailPt(1.07, -1.35);
  ctx.fillStyle = col(finCol, 0.66); ctx.beginPath(); ctx.moveTo(t0a.x, t0a.y); ctx.quadraticCurveTo(cA.x, cA.y, la.x, la.y); ctx.quadraticCurveTo(mid.x, mid.y, lb.x, lb.y); ctx.quadraticCurveTo(cB.x, cB.y, t0b.x, t0b.y); ctx.closePath(); ctx.fill();
  // the body: a soft rim (refraction blurs it a little), then the body itself
  if (pxL > 14) { outline(y, 1.12); ctx.fillStyle = col(pat.base, 0.35); ctx.fill(); }
  outline(y, 1); ctx.fillStyle = col(pat.base); ctx.fill();
  if (pxL > 6 && (pat.patches.length || pat.net)) {
    ctx.save(); ctx.clip();
    pat.patches.forEach(function (pc) { ctx.fillStyle = col(pc.col); ctx.beginPath(); var n = pc.pts.length; for (var j = 0; j <= n; j++) { var a1 = pc.pts[j % n], a2 = pc.pts[(j + 1) % n], p1 = at(a1[0], a1[1]), p2 = at((a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2); if (!j) ctx.moveTo(p2.x, p2.y); else ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); } ctx.fill(); });
    if (pat.net && pxL > 18) { ctx.strokeStyle = col([60, 74, 92], 0.5); ctx.lineWidth = Math.max(0.25, pxL * 0.006); for (var nf = 0.2; nf < 0.82; nf += 0.07) { ctx.beginPath(); for (var nv = -0.6; nv <= 0.61; nv += 0.3) { var q1 = at(nf, nv), q2 = at(nf + 0.035, nv + 0.15); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); q2 = at(nf + 0.035, nv - 0.15); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); } ctx.stroke(); } }
    ctx.restore();
  }
  // a sheen along the back, and eyes when it is big enough to see them
  if (pxL > 8) {
    ctx.strokeStyle = 'rgba(255,255,255,' + (pat.sheen * (1 - dk) * Math.min(1, lum)) + ')'; ctx.lineWidth = Math.max(0.3, pxL * 0.03); ctx.lineCap = 'round'; ctx.beginPath();
    for (i = 0; i <= 6; i++) { var sh = at(0.12 + i / 6 * 0.55, 0); if (i) ctx.lineTo(sh.x, sh.y); else ctx.moveTo(sh.x, sh.y); } ctx.stroke(); ctx.lineCap = 'butt';
  }
  if (pxL > 22) { ctx.fillStyle = col([20, 18, 20], 0.85); [1, -1].forEach(function (sd) { var e = at(0.055, sd * 0.78); ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(0.25, pxL * 0.012), 0, TAU); ctx.fill(); }); }
  // it rises and kisses the surface: a ring spreads from where its mouth was
  if (k.surf) { var su = (t + k.soff) % k.surf; if (su > 1.5 && su < 4.3) { var hp = at(0, 0, WL); (g.koiRings = g.koiRings || []).push({ x: hp.x, y: hp.y, k: hp.k, a: su - 1.5 }); } }
}
function drawWaterLayer(ctx, g, t) {
  var lum = g.lum, tint = g.tint, i;
  if (g.koi && g.koi.length) {
    for (i = 0; i < g.koi.length; i++) drawKoi(ctx, g.koi[i], t, lum, tint, g);
    // sink them under the surface
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = rgb(mixc(g.SEA.pond, g.LIT.skyHor, 0.3), 0.24); ctx.fillRect(0, 0, g.W, g.H); ctx.globalCompositeOperation = 'source-over';
    if (g.koiRings) { var rc = g.LIT.id === 'night' ? [190, 204, 240] : [246, 250, 248]; g.koiRings.forEach(function (r) { var age = r.a; for (var j = 0; j < 2; j++) { var a2 = age - j * 0.45; if (a2 < 0) continue; var rr = (0.03 + a2 * 0.12) * r.k; ctx.strokeStyle = rgb(rc, 0.42 * Math.max(0, 1 - a2 / 2.6)); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke(); } }); g.koiRings = null; }
  }
  if (g.splashes) g.splashes.forEach(function (sp) { // a koi breaks the surface
    var age = t - sp.t0, c = P(sp.x, WL, sp.z), k = c.k, gcol = g.LIT.id === 'night' ? [200, 214, 255] : [250, 252, 248];
    for (var r = 0; r < 3; r++) { var a2 = age - r * 0.25; if (a2 < 0) continue; var rr = (0.06 + a2 * 0.22) * k; ctx.strokeStyle = rgb(gcol, Math.max(0, 0.55 * (1 - a2 / 1.9))); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke(); }
    if (age < 0.6) { ctx.fillStyle = rgb(gcol, 0.85 * (1 - age / 0.6)); for (var d = 0; d < 8; d++) { var an = d / 8 * TAU, dist = age * 0.35 * k, hgt = Math.sin(age / 0.6 * Math.PI) * 0.12 * k; ctx.beginPath(); ctx.arc(c.x + Math.cos(an) * dist, c.y + Math.sin(an) * dist * 0.4 - hgt, Math.max(0.4, 0.012 * k), 0, TAU); ctx.fill(); } }
  });
  if (g.glints) {
    var night = g.LIT.id === 'night', dusk = g.LIT.id === 'dusk', gc = night ? [200, 214, 255] : dusk ? [255, 214, 170] : [255, 250, 236];
    ctx.strokeStyle = rgb(gc); ctx.lineCap = 'round';
    for (i = 0; i < g.glints.length; i++) {
      var q = g.glints[i], s = Math.sin(t * q.w + q.ph), a = s > 0 ? Math.pow(s, 3) * q.a : 0; if (a < 0.02) continue;
      var dx = Math.sin(t * 0.7 + q.ph) * q.l * 0.3 + (g.wind ? g.wind.x * q.l * 0.35 * (0.5 + 0.5 * Math.sin(t * 0.5 + q.ph)) : 0);
      ctx.globalAlpha = a * (night ? 0.7 : 0.9); ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(q.x - q.l + dx, q.y); ctx.lineTo(q.x + q.l + dx, q.y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    // slow rings, as from a fish rising or a drop falling
    if (g.ripplePts && g.ripplePts.length) {
      var per = 2.3, life = 3.2, n0 = Math.floor(t / per);
      for (var sl = n0 - 1; sl <= n0; sl++) {
        if (sl < 0) continue; var age = t - sl * per; if (age < 0 || age > life) continue;
        var pt = g.ripplePts[Math.floor(hash2(sl, 17) * g.ripplePts.length)], c = P(pt[0], WL, pt[1]), r = (0.04 + age * 0.13) * c.k;
        ctx.strokeStyle = rgb(gc, 0.32 * (1 - age / life)); ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke();
        if (age > 0.5) { var r2 = r * 0.6; ctx.strokeStyle = rgb(gc, 0.2 * (1 - age / life)); ctx.beginPath(); ctx.ellipse(c.x, c.y, r2, r2 * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke(); }
      }
    }
  }
}
var DRIP_PER = 2.4;
function shishiAngle(t) {
  var T = 9.2, u = t % T, rest = -0.62, tip = 0.5;
  if (u < 7.2) return rest + 0.13 * Math.pow(u / 7.2, 2.2);           // slowly filling, open end sinking
  if (u < 7.6) { var a = (u - 7.2) / 0.4; return lerp(rest + 0.13, tip, a * a); }   // tips
  if (u < 7.95) return tip + 0.03 * Math.sin((u - 7.6) * 30) * (1 - (u - 7.6) / 0.35); // pours
  if (u < 8.25) { var b = (u - 7.95) / 0.3; return lerp(tip, rest, 1 - Math.pow(1 - b, 2)); } // swings back
  var c = (u - 8.25) / 0.95; return rest + 0.05 * Math.sin(c * Math.PI * 3) * (1 - c);              // clack + settle
}
function drawAnchorLayer(ctx, g, t, still) {
  var F0 = g.F, i, lt = g.tint, night = g.LIT.id === 'night';
  if (g.fall) {
    var f = g.fall, wc = night ? [160, 180, 214] : mulc([236, 244, 248], lt), ice = (g.SEA.snow ? 0.55 : 1) * (g.wet ? 1.45 : 1);   // a swollen fall in the rain
    ctx.lineCap = 'round';
    for (i = 0; i < f.streaks.length; i++) {
      var st = f.streaks[i], s0 = ((t * st.sp * ice + st.ph) % 1), s1 = Math.min(1, s0 + st.len);
      var a0 = P(f.xc + st.u * f.wd * lerp(1, 1.22, s0), lerp(f.ytop, WL, s0), lerp(f.ztop, f.zbot, s0)), a1 = P(f.xc + st.u * f.wd * lerp(1, 1.22, s1), lerp(f.ytop, WL, s1), lerp(f.ztop, f.zbot, s1));
      ctx.strokeStyle = rgb(wc, st.a * ice * (s0 < 0.08 ? s0 / 0.08 : 1)); ctx.lineWidth = st.w * 0.6; ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    var foam = sprite('soft');
    for (i = 0; i < f.foam.length; i++) {
      var fo = f.foam[i], b = P(f.xc + fo.u * f.wd * 0.7, WL + 0.04, f.zbot - 0.02), pul = 0.5 + 0.5 * Math.sin(t * fo.sp * 3 + fo.ph);
      stamp(ctx, foam, b.x, b.y - pul * 0.06 * b.k, fo.r * b.k * (0.8 + pul * 0.5), fo.r * b.k * 0.5 * (0.8 + pul * 0.5), 0.35 * ice * (night ? 0.5 : 1));
    }
    ctx.globalAlpha = 1;
  }
  if (F0.tsukubai) {
    var tg = tsukubaiGeom(), T0 = LAY.tsukubai, sx = T0.x - 0.12, sz = T0.z + 0.02, top = P(sx, 0.6, sz), bot = P(sx, 0.335, sz);
    if (!g.SEA.snow) {
      ctx.strokeStyle = night ? 'rgba(170,190,230,0.45)' : 'rgba(220,236,240,0.55)'; ctx.lineWidth = g.wet ? 0.6 : 0.35; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(top.x + 0.4, (top.y + bot.y) / 2, bot.x + 0.3, bot.y); ctx.stroke();
      var ov = g.wet ? 1 : g.overflowT !== undefined ? clamp(1 - (t - g.overflowT) / 3) : 0;
      if (ov > 0) { // the basin brims over: thin sheets running down its sides, glinting
        var bc = tg.basin, rim = P(bc[0], bc[1], bc[2]), rr0 = tg.r * rim.k;
        ctx.strokeStyle = night ? 'rgba(170,190,230,' + 0.5 * ov + ')' : 'rgba(232,242,246,' + 0.6 * ov + ')'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.ellipse(rim.x, rim.y, rr0 * 1.05, rr0 * 0.42, 0, 0.1, Math.PI - 0.1); ctx.stroke();
        for (var s2 = 0; s2 < 3; s2++) { var ax = rim.x + (s2 - 1) * rr0 * 0.8, ay = rim.y + rr0 * 0.35 * (1 - Math.abs(s2 - 1) * 0.5), by2 = P(bc[0], 0.02, bc[2]).y; ctx.globalAlpha = ov * (0.5 + 0.3 * Math.sin(t * 9 + s2 * 2)); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + (s2 - 1) * 1.2, (ay + by2) / 2, ax + (s2 - 1) * 1.6, by2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      var per = DRIP_PER, n = Math.floor(t / per);
      for (var k = n - 1; k <= n; k++) {
        var age = t - k * per; if (k < 0 || age > 1.6) continue;
        var dt = age; if (dt < 0.22) { var yy = lerp(0.6, 0.335, (dt / 0.22) * (dt / 0.22)), dp = P(sx + 0.01, yy, sz); ctx.fillStyle = 'rgba(235,245,250,0.85)'; ctx.beginPath(); ctx.ellipse(dp.x + 0.2, dp.y, 0.35, 0.55, 0, 0, TAU); ctx.fill(); }
        else { var ra = (dt - 0.22) / 1.3, c = P(tg.basin[0] - 0.03, 0.326, tg.basin[2]), r = (0.015 + ra * 0.09) * c.k; ctx.strokeStyle = 'rgba(230,240,246,' + (0.55 * (1 - ra)) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * 0.45, 0, 0, TAU); ctx.stroke(); }
      }
    }
  }
  if (F0.shishi) {
    var ts = t + (g.shPh || 0), ang = still ? -0.62 : shishiAngle(ts), sg = shishiGeom(), ends = drawShishiTube(ctx, ang), sp = P(sg.spout[0], sg.spout[1], sg.spout[2]), op = Pa(ends.open);
    if (!g.SEA.snow) {
      ctx.strokeStyle = night ? 'rgba(170,190,230,0.5)' : 'rgba(225,238,244,0.6)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x + 0.2, Math.max(sp.y + 1, op.y - 0.5)); ctx.stroke();
      var u = ts % 9.2;
      if (!still && u > 7.45 && u < 8.2) { // pour splash
        var e = (u - 7.45) / 0.75, pt = Pa(ends.open); ctx.fillStyle = 'rgba(230,242,248,' + (0.7 * (1 - e)) + ')';
        for (var d = 0; d < 7; d++) { var an = -Math.PI / 2 + (d - 3) * 0.35, rr = e * 0.12 * pt.k; ctx.beginPath(); ctx.arc(pt.x + Math.cos(an) * rr, pt.y + 2 + Math.sin(an) * rr * 0.6 + e * e * 3, 0.4, 0, TAU); ctx.fill(); }
      }
      if (!still && u > 7.5 && u < 9.2) { // rings where it poured
        var ra = (u - 7.5) / 1.7, oe = ends.open, rc = P(oe[0] + 0.08 * sg.m * -1, WL, oe[2] - 0.05), rr2 = (0.03 + ra * 0.3) * rc.k;
        ctx.strokeStyle = 'rgba(225,238,244,' + (0.5 * (1 - ra)) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(rc.x, rc.y, rr2, rr2 * g.cam.s, 0, 0, TAU); ctx.stroke();
      }
    }
  }
}
function drawMist(ctx, g, t) {
  if (!g.mist.a) return;
  var spr = tintedSprite(g.mist.col.map(function (v) { return Math.round(v); })), m = g.mist;
  for (var i = 0; i < 5; i++) {
    var sp = 2.2 + i * 0.9, w = 150 + i * 30, L = g.W + w * 2, x = ((((g.wint || 0) * sp + i * 137) % L) + L) % L - w, y = lerp(m.y1, m.y2, i / 4) + Math.sin(t * 0.13 + i) * 3;
    stamp(ctx, spr, x, y, w, 7 + i * 1.5, m.a * (0.28 + 0.06 * Math.sin(t * 0.2 + i * 2)));
  }
  ctx.globalAlpha = 1;
}
function drawFlicker(ctx, g, t) {
  if (!g.LIT.lit || !g.glows.length) return;
  var spr = sprite('warm'); ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < g.glows.length; i++) {
    var q = g.glows[i], n = NZ.n2(t * 2.6 + i * 13.7, i * 3.1) * 0.7 + NZ.n2(t * 9 + i * 5, 7.7) * 0.3, a = clamp((n - 0.36) * 1.4) * q.a * (g.LIT.id === 'night' ? 0.55 : 0.4);
    stamp(ctx, spr, q.x, q.y, q.r * 0.9, q.r * 0.9, a);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawFlies(ctx, g, t) {
  if (!g.flies) return;
  var spr = sprite('fly'); ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < g.flies.length; i++) {
    var f = g.flies[i], x = f.x + Math.sin(t * f.a1 + f.p1) * 0.55 + Math.sin(t * f.a2 * 2.3 + f.p2) * 0.2, y = f.y + Math.sin(t * f.a2 + f.p2) * 0.25, z = f.z + Math.cos(t * f.a1 * 0.8 + f.p2) * 0.4;
    var p = P(x, y, z), s = Math.sin(t * f.w + f.ph), a = s > 0.2 ? Math.pow((s - 0.2) / 0.8, 1.5) : 0;
    stamp(ctx, spr, p.x, p.y, 1.7 + p.k * 0.05, 0, a * 0.9);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/* falling leaves / petals / snow: persistent particles (state lives in the controller) */
function initFallers(g, rng) {
  var arr = [];
  for (var i = 0; i < g.nFall; i++) { var p = spawnFaller(g, rng, true); arr.push(p); }
  return arr;
}
function spawnFaller(g, rng, anywhere) {
  var kind = g.fallers, p = { kind: kind, rot: rng() * TAU, spin: (rng() - 0.5) * 3, ph: rng() * TAU, life: 0 }; p.rot0 = p.rot;
  var src = null;
  if (g.srcs.length && kind !== 'snow' && rng() < 0.6) { src = g.srcs[(rng() * g.srcs.length) | 0]; if (src.kind !== kind && !(kind === 'leaf')) src = null; }
  if (src) { p.x = src.x + (rng() - 0.5) * src.r * 1.6; p.y = src.y + (rng() - 0.5) * src.r * 0.6; }
  else { var sd = g.wind ? g.wind.side : 1; p.x = rng() * (g.W + 60) - 30 - sd * 30; p.y = -10 - rng() * 30; }
  if (anywhere) p.y = rng() * g.H * 0.9;
  if (kind === 'snow') { p.sz = 0.35 + rng() * rng() * 1.3; p.vy = 6 + p.sz * 9; p.vx = 2 + rng() * 3; }
  else if (kind === 'leaf') { p.sz = 1.5 + rng() * 1.2; p.vy = 9 + rng() * 6; p.vx = 4 + rng() * 5; p.col = ramp([[150, 30, 20], [206, 62, 30], [232, 120, 44], [226, 170, 60]], rng()); }
  else { p.sz = 0.9 + rng() * 0.6; p.vy = 7 + rng() * 5; p.vx = 5 + rng() * 5; p.col = mixc([246, 196, 212], [255, 240, 244], rng()); }
  p.floor = g.H * (0.62 + rng() * 0.36);
  return p;
}
function stepFallers(arr, g, dt, rng) {
  var Wd = g.wind || windVec({ dir: 0, strength: 0.5 }), k = Wd.x * (0.4 + 1.6 * Wd.s);
  for (var i = 0; i < arr.length; i++) {
    var p = arr[i]; p.life += dt;
    var sway = Math.sin(p.life * (p.kind === 'snow' ? 0.9 : 1.7) + p.ph);
    // drift with the wind; the sway only quickens and slows it (never turns it back)
    p.x += p.vx * k * (1 + (p.kind === 'snow' ? 0.5 : 0.75) * sway) * dt; p.y += (p.vy * (p.kind === 'snow' ? 1 : (0.75 + 0.25 * Math.abs(sway))) + Wd.y * Math.abs(p.vx * k) * 0.3) * dt;
    if (p.kind === 'leaf') p.rot = p.rot0 + Math.sin(p.life * 1.7 + p.ph) * 0.6 + p.life * p.spin * 0.25; else p.rot += p.spin * dt; // leaves rock, they do not spin
    if (p.y > p.floor || p.x > g.W + 35 || p.x < -35) arr[i] = spawnFaller(g, rng, false);
  }
}
function drawFallers(ctx, arr, g) {
  var tint = g.tint, i;
  if (!arr.length) return;
  if (arr[0].kind === 'snow') {
    ctx.fillStyle = rgb(mulc([250, 252, 255], tint.map(function (v) { return Math.max(0.75, v); })));
    var nShow = Math.round(arr.length * (g.snowK === undefined ? 1 : g.snowK));   // snowfall comes and goes, light to heavy
    for (i = 0; i < nShow; i++) { var p = arr[i], fa = clamp((p.floor - p.y) / 12); ctx.globalAlpha = 0.85 * fa; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; return;
  }
  for (i = 0; i < arr.length; i++) {
    var q = arr[i], fl = Math.cos(q.life * 2.3 + q.ph), fade = clamp((q.floor - q.y) / 10) * clamp(q.life * 2);
    ctx.globalAlpha = 0.95 * fade;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, 0.25 + 0.75 * Math.abs(fl));
    var col = rgb(mulc(scl(q.col, fl > 0 ? 1 : 0.8), tint));
    if (q.kind === 'leaf') leafShape(ctx, 0, 0, q.sz, -Math.PI / 2, 1, col);
    else { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, q.sz, q.sz * 0.6, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
/* an occasional bird crossing the sky */
function drawBird(ctx, g, b, t) {
  var u = (t - b.t0) / b.dur; if (u < 0 || u > 1) return;
  var x = lerp(b.x0, b.x1, u), y = b.y + Math.sin(u * TAU * 1.5) * 2.5 - u * b.rise, fl = Math.sin(t * b.flap), s = b.s;
  var night = g.LIT.id === 'night', col = g.LIT.id === 'dusk' ? 'rgba(40,24,30,0.8)' : night ? 'rgba(10,14,30,0.8)' : 'rgba(46,44,48,0.72)';
  ctx.strokeStyle = col; ctx.lineWidth = 0.55 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  var dir = b.x1 > b.x0 ? 1 : -1, wy = fl * 2.2 * s;
  ctx.beginPath(); ctx.moveTo(x - 3 * s, y - wy); ctx.quadraticCurveTo(x - 1.4 * s, y - wy * 0.2 - 0.8 * s, x, y); ctx.quadraticCurveTo(x + 1.4 * s, y - wy * 0.2 - 0.8 * s, x + 3 * s, y - wy); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + dir * 0.4 * s, y + 0.2 * s, 1.0 * s, 0.45 * s, 0, 0, TAU); ctx.fill();
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
}

/* ================= spring: fluttering sakura petals =================
   A fixed pool of petals. Each tumbles (its width follows cos of a flip phase, so it shows its face and its edge),
   turns, sways and drifts on a breeze. Every so often a soft gust sweeps a swirl of petals across; petals that come
   down on open water float there for a while. */
var PETAL_PATH = null;
function petalPath() {
  if (PETAL_PATH) return PETAL_PATH;
  var p = new Path2D(); // unit petal along +x: rounded base, notched tip
  p.moveTo(-0.5, 0);
  p.bezierCurveTo(-0.45, -0.3, 0.1, -0.36, 0.46, -0.16);
  p.lineTo(0.36, 0); p.lineTo(0.46, 0.16);
  p.bezierCurveTo(0.1, 0.36, -0.45, 0.3, -0.5, 0);
  p.closePath(); PETAL_PATH = p; return p;
}
function petalSources(g) {
  var src = [];
  function add(x, y, z, r, w) { var p = P(x, y, z); src.push({ x: p.x, y: p.y, r: r * p.k, w: w }); }
  if (g.season !== 'spring') return src;
  [[-3.6, 11.45, 3.4], [4.4, 11.5, 3.8], [-8.0, 11.3, 4.2]].forEach(function (a) { add(LX(a[0]), a[2] * 0.8, LZ(a[1]), 1.8, 1); });
  if (F.ycherry > 0.3) add(LAY.ycherry.x, 3.6 * F.ycherry * 0.82, LAY.ycherry.z, 1.6 * F.ycherry, 1.2);
  if (F.namiki) LAY.namiki.forEach(function (a) { add(a[0], a[2] * 0.85, a[1], 1.8, 1.2); });
  if (F.cherry) add(LAY.cherry.x, 3.4, LAY.cherry.z, 1.7, 2.5);
  var tot = 0; src.forEach(function (s) { tot += s.w; s.cw = tot; }); src.tot = tot;
  return src;
}
function makePetals(g, rng) {
  var sk = g.sak || sakuraCal(0.5), N = Math.round((70 + Math.min(20, g.petalSrc.length * 3)) * clamp(sk.fall * 1.05) * (g.fallBoost || 1)), pool = [];
  for (var i = 0; i < N + 30; i++) pool.push({ on: false });
  var S = { pool: pool, base: N, floats: [], gust: null, nextGust: 12 + rng() * 26, t: 0, sk: sk, floatMax: Math.round(16 * sk.ground) };
  for (i = 0; i < N; i++) spawnPetal(S, pool[i], g, rng, true);
  for (i = 0; i < 400 && S.floats.length < Math.round(7 * sk.ground) && g.water; i++) { var fx = rng() * g.W, fy = g.horizonY + rng() * (g.H - g.horizonY); if (waterAt(g, fx, fy)) S.floats.push({ x: fx, y: fy, rot: rng() * TAU, vx: 0, ph: rng() * TAU, life: rng() * 8, L: 18 + rng() * 14, sz: 1 + rng() * 0.5, tone: rng() }); }
  return S;
}
function spawnPetal(S, p, g, rng, anywhere) {
  p.on = true; p.gust = null; p.life = 0;
  p.d = Math.pow(rng(), 1.6);                       // depth: 0 far .. 1 near the eye
  p.sz = 1.6 + p.d * 3.6; p.vy0 = 4.5 + p.d * 9; p.wk = 0.55 + p.d * 0.8;
  p.fl = rng() * TAU; p.fs = (2.2 + rng() * 3.8) * (rng() < 0.5 ? -1 : 1); p.rot = rng() * TAU; p.rs = (rng() - 0.5) * 2.4; p.ph = rng() * TAU;
  p.tone = rng();
  var src = g.petalSrc;
  if (!anywhere && src.length && p.d < 0.45 && rng() < 0.75) {
    var r = rng() * src.tot, s = src[0]; for (var k = 0; k < src.length; k++) if (r <= src[k].cw) { s = src[k]; break; }
    p.x = s.x + (rng() - 0.5) * s.r * 2; p.y = s.y + (rng() - 0.5) * s.r * 0.8;
  } else if (anywhere) { p.x = rng() * g.W; p.y = rng() * g.H * 0.95; }
  else { var wind = S.wind || 6; if (rng() < 0.55) { p.x = rng() * (g.W + 40) - 20 - (wind > 0 ? 20 : -20); p.y = -6 - rng() * 10; } else { p.x = wind > 0 ? -8 : g.W + 8; p.y = rng() * g.H * 0.6; } }
  p.floor = p.d > 0.55 ? g.H + 12 : Math.max(p.y + 20, g.horizonY + 8 + rng() * (g.H - g.horizonY - 8));
}
function waterAt(g, x, y) {
  var w = g.water; if (!w) return false;
  var i = Math.floor(x / g.W * w.w), j = Math.floor(y / g.H * w.h);
  return i >= 0 && j >= 0 && i < w.w && j < w.h && w.a[j * w.w + i] > 0;
}
function stepPetals(S, g, dt, t, rng) {
  // the shared wind plus the current gust (which blows the same way, 2-3x as hard)
  var Wd = g.wind || windVec({ dir: 0, strength: 0.5 }), wind = Wd.x * (4 + 10 * Wd.base), G = S.gust, gs = 0;
  if (!G && t > S.nextGust && !(S.sk && S.sk.bloom < 0.15) && !g.noGust) { // gusts only while the trees are in blossom (and not in the rain)
    var dir = Wd.side;
    S.gustStarted = true;
    G = S.gust = { t0: t, dur: 4.2 + rng() * 1.5, dir: dir, y0: g.H * (0.3 + rng() * 0.4), cx0: dir > 0 ? -30 : g.W + 30 };
    var n = 0;
    for (var i = 0; i < S.pool.length && n < 34; i++) {
      var q = S.pool[i]; if (q.on && i < S.base) continue;
      spawnPetal(S, q, g, rng, false);
      q.d = 0.3 + rng() * 0.6; q.sz = 1.6 + q.d * 3.6; q.wk = 0.55 + q.d * 0.8; q.vy0 = 4.5 + q.d * 9; q.floor = g.H + 12;
      q.gust = { th: rng() * TAU, R: 3 + rng() * 11, om: (1.6 + rng() * 1.6) * dir, dy: (rng() - 0.5) * 14, lag: rng() * 0.22 };
      q.x = G.cx0 - dir * rng() * 30 + Math.cos(q.gust.th) * q.gust.R; q.y = G.y0 + q.gust.dy + Math.sin(q.gust.th) * q.gust.R * 0.45; q.life = 0.4;
      n++;
    }
  }
  if (G) {
    var u = (t - G.t0) / G.dur;
    if (u >= 1) { S.gust = null; S.nextGust = t + 35 + rng() * 35; }
    else gs = Math.pow(Math.sin(Math.PI * u), 2) * 26 * G.dir;
  }
  if (!G && t > S.nextGust) S.nextGust = t + 35 + rng() * 35;
  wind += gs; S.wind = wind; S.gustK = gs / 26;
  for (i = 0; i < S.pool.length; i++) {
    var p = S.pool[i]; if (!p.on) continue;
    p.life += dt; p.fl += p.fs * dt; p.rot += p.rs * dt;
    var cf = Math.cos(p.fl);
    if (p.gust && G) {
      var gu = clamp((t - G.t0) / G.dur - p.gust.lag), e = gu * gu * (3 - 2 * gu);
      p.gust.th += p.gust.om * dt; p.gust.R += dt * 1.2;
      var cx = lerp(G.cx0, G.cx0 + G.dir * (g.W + 60), e), cy = G.y0 + p.gust.dy - Math.sin(e * Math.PI) * 22;
      var tx = cx + Math.cos(p.gust.th) * p.gust.R, ty = cy + Math.sin(p.gust.th) * p.gust.R * 0.45;
      var nx2 = p.x + (tx - p.x) * Math.min(1, dt * 6); p.x = G.dir > 0 ? Math.max(p.x, nx2) : Math.min(p.x, nx2); p.y += (ty - p.y) * Math.min(1, dt * 6);   // tumbles in the swirl, never back upwind
      if (gu >= 1) p.gust = null;
    } else {
      if (p.gust) p.gust = null;
      p.x += wind * p.wk * (1 + 0.55 * Math.sin(p.life * 1.3 + p.ph)) * dt;            // flutters, but always downwind
      p.y += (p.vy0 * (0.5 + 0.5 * Math.abs(cf)) + Math.sin(p.life * 2.1 + p.ph) * 2.2 + Wd.y * Math.abs(wind) * 0.25) * dt;
    }
    if (p.y >= p.floor && !p.gust) {
      if (S.floats.length < S.floatMax && waterAt(g, p.x, p.y) && p.d < 0.7) S.floats.push({ x: p.x, y: p.y, rot: p.rot, vx: 0, ph: rng() * TAU, life: 0, L: 16 + rng() * 14, sz: Math.min(p.sz, 1.6), tone: p.tone });
      if (i < S.base) spawnPetal(S, p, g, rng, false); else p.on = false;
    } else if (!p.gust && (p.x > g.W + 40 || p.x < -45 || p.y > g.H + 14)) { if (i < S.base) spawnPetal(S, p, g, rng, false); else p.on = false; }
  }
  for (i = S.floats.length - 1; i >= 0; i--) {
    var f = S.floats[i]; f.life += dt; f.x += Wd.x * (0.35 + 0.5 * Wd.base) * (1 + 0.4 * Math.sin(f.life * 0.4 + f.ph)) * dt; f.rot += Math.sin(f.life * 0.3 + f.ph) * 0.1 * dt; // drifting downwind
    if (f.life > f.L) S.floats.splice(i, 1);
  }
}
function petalStyles(g) {
  if (g._ps) return g._ps;
  var t = g.tint.map(function (v) { return clamp(v, 0.3, 1.15); }), out = [];
  [[253, 238, 243], [246, 220, 230], [230, 180, 200], [218, 160, 184]].forEach(function (c) { out.push(rgb(mulc(c, t))); });
  g._ps = out; return out;
}
function drawPetals(ctx, S, g, sc) {
  var path = petalPath(), st = petalStyles(g), last = null;
  for (var i = 0; i < S.pool.length; i++) {
    var p = S.pool[i]; if (!p.on) continue;
    var cf = Math.cos(p.fl), w = Math.max(0.14, Math.abs(cf)), s = p.sz * sc, cr = Math.cos(p.rot), sr = Math.sin(p.rot);
    var a = p.life < 0.4 ? p.life / 0.4 : 1, near = p.floor - p.y; if (near < 8) a *= Math.max(0, near / 8);
    if (a <= 0.02) continue;
    var style = st[(cf >= 0 ? 0 : 2) + (p.tone > 0.5 ? 1 : 0)];
    if (style !== last) { ctx.fillStyle = style; last = style; }
    ctx.globalAlpha = a * (0.82 + 0.18 * p.d);
    ctx.setTransform(s * cr, s * sr, -s * w * sr, s * w * cr, p.x * sc, p.y * sc);
    ctx.fill(path);
  }
  ctx.globalAlpha = 1; ctx.setTransform(sc, 0, 0, sc, 0, 0);
}
function drawFloatPetals(ctx, S, g, sc) {
  if (!S.floats.length) return;
  var path = petalPath(), st = petalStyles(g);
  for (var i = 0; i < S.floats.length; i++) {
    var f = S.floats[i], a = Math.min(1, f.life / 0.6) * Math.min(1, (f.L - f.life) / 3), s = f.sz * sc * 1.1, cr = Math.cos(f.rot), sr = Math.sin(f.rot), w = 0.45;
    ctx.globalAlpha = a * 0.95; ctx.fillStyle = st[f.tone > 0.5 ? 1 : 0];
    // lying on the surface: squashed vertically by the view angle
    ctx.setTransform(s * cr, s * sr * 0.5, -s * w * sr, s * w * cr * 0.5, f.x * sc, f.y * sc);
    ctx.fill(path);
  }
  ctx.globalAlpha = 1; ctx.setTransform(sc, 0, 0, sc, 0, 0);
}

/* ================= event animations: koinobori in the wind, tanabata strips swaying ================= */
function drawKoinobori(ctx, g, t) {
  var pp = EV_POS.pole, tint = g.tint;
  var fish = [
    { y: 4.38, L: 1.5, kind: 'fuki' },
    { y: 3.95, L: 1.75, body: [34, 34, 40], belly: [214, 196, 160], fin: [200, 160, 60] },
    { y: 3.42, L: 1.5, body: [208, 52, 40], belly: [246, 214, 190], fin: [236, 190, 70] },
    { y: 2.95, L: 1.2, body: [46, 92, 180], belly: [226, 232, 244], fin: [236, 190, 70] }
  ];
  var Wd = g.wind || windVec({ dir: 0, strength: 0.5 }), wind = clamp(0.45 + 0.6 * Wd.s + 0.12 * Math.sin(t * 1.3), 0.35, 1.05);
  var pole = P(pp[0], 0, pp[1]); ctx.save(); if (Wd.side < 0) { ctx.translate(pole.x * 2, 0); ctx.scale(-1, 1); } // the carp stream downwind
  fish.forEach(function (f, fi) {
    var a = P(pp[0] + 0.06, f.y, pp[1]), k = a.k, L = f.L * k * (0.82 + 0.18 * wind), N = 14, ph = t * 3.1 + fi * 0.9;
    function cl(u) { return { x: a.x + u * L, y: a.y + (u * u * 0.18 * k * (1.1 - wind)) + Math.sin(ph - u * 5.5) * u * 0.07 * k }; }
    if (f.kind === 'fuki') { // five-coloured streamer
      var cols = [[46, 92, 180], [214, 56, 48], [236, 196, 70], [246, 244, 236], [56, 140, 90]];
      cols.forEach(function (c, ci) {
        var off = (ci - 2) * 0.03 * k; ctx.fillStyle = rgb(mulc(c, tint)); ctx.beginPath();
        for (var i = 0; i <= N; i++) { var u = i / N, q = cl(u), wv = Math.sin(ph * 1.2 - u * 7 + ci) * 0.02 * k * u; if (i) ctx.lineTo(q.x, q.y + off + wv); else ctx.moveTo(q.x, q.y + off + wv); }
        for (i = N; i >= 0; i--) { var u2 = i / N, q2 = cl(u2), wv2 = Math.sin(ph * 1.2 - u2 * 7 + ci) * 0.02 * k * u2; ctx.lineTo(q2.x, q2.y + off + 0.03 * k + wv2); }
        ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = rgb(mulc([230, 230, 226], tint)); ctx.beginPath(); ctx.ellipse(a.x, a.y + 0.06 * k, 0.025 * k, 0.09 * k, 0, 0, TAU); ctx.fill();
      return;
    }
    var R = 0.12 * f.L / 1.5 * k, top = [], bot = [];
    for (var i = 0; i <= N; i++) { var u = i / N, q = cl(u), w = R * (u < 0.08 ? 0.85 + u * 2 : 1 - Math.pow(Math.max(0, u - 0.55) / 0.45, 1.3) * 0.55) * (0.85 + 0.15 * Math.sin(ph * 2 - u * 6)); top.push([q.x, q.y - w]); bot.push([q.x, q.y + w]); }
    var tail = cl(1), tl = [tail.x + 0.18 * k * wind, tail.y - R * 0.9 + Math.sin(ph) * 0.03 * k], tb = [tail.x + 0.18 * k * wind, tail.y + R * 0.9 + Math.sin(ph + 1) * 0.03 * k];
    ctx.beginPath(); top.forEach(function (q, j) { if (j) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.lineTo(tl[0], tl[1]); ctx.lineTo(tail.x + 0.06 * k, tail.y); ctx.lineTo(tb[0], tb[1]); for (i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
    ctx.fillStyle = rgb(mulc(f.body, tint)); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = rgb(mulc(f.belly, tint)); ctx.beginPath(); for (i = 0; i <= N; i++) { var b = bot[i], m = cl(i / N); if (i) ctx.lineTo(b[0], lerp(m.y, b[1], 0.15)); else ctx.moveTo(b[0], lerp(m.y, b[1], 0.15)); } for (i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1] + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(mulc(scl(f.body, 1.5), tint), 0.55); ctx.lineWidth = 0.35; // scales
    for (i = 3; i < N - 1; i++) { var c0 = cl(i / N); for (var r2 = -1; r2 <= 1; r2++) { ctx.beginPath(); ctx.arc(c0.x, c0.y + r2 * R * 0.5, R * 0.3, -1.2, 1.2); ctx.stroke(); } }
    var sh = ctx.createLinearGradient(0, a.y - R * 2, 0, a.y + R * 2); sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.2)'); ctx.fillStyle = sh; ctx.fillRect(a.x - 2, a.y - R * 3, L + 0.4 * k, R * 6);
    ctx.restore();
    var e = cl(0.12); ctx.fillStyle = rgb(mulc([248, 246, 240], tint)); ctx.beginPath(); ctx.arc(e.x, e.y - R * 0.25, R * 0.36, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgb(20,20,24)'; ctx.beginPath(); ctx.arc(e.x + R * 0.05, e.y - R * 0.25, R * 0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(mulc(f.fin, tint)); ctx.lineWidth = Math.max(0.4, R * 0.18); ctx.beginPath(); ctx.ellipse(a.x, a.y, R * 0.22, R * 0.95, 0, 0, TAU); ctx.stroke();
  });
  ctx.restore();
}
function drawTanabata(ctx, g, t) {
  var sg = g.sasa || (g.sasa = sasaGeom()), tint = g.tint, Wd = g.wind || windVec({ dir: 0, strength: 0.5 }), wind = Wd.x * (0.35 + 0.9 * Wd.s) + (Math.sin(t * 0.8) * 0.3 + Math.sin(t * 2.1) * 0.15) * (0.4 + Wd.s); // the strips lean downwind and flutter
  sg.hangs.forEach(function (h, i) {
    var p = Pa(h.p), k = p.k, sw = (wind + Math.sin(t * 1.9 + h.ph) * 0.2) * 0.45, L = h.L * k, dx = Math.sin(sw) * L, dy = Math.cos(sw) * L;
    ctx.strokeStyle = 'rgba(80,70,60,0.6)'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + dx * 0.15, p.y + dy * 0.15); ctx.stroke();
    var bx = p.x + dx * 0.15, by = p.y + dy * 0.15, w = 0.045 * k, twist = Math.abs(Math.cos(t * 1.3 + h.ph)) * 0.7 + 0.3;
    if (h.kind === 'tanzaku') {
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-sw); ctx.fillStyle = rgb(mulc(h.col, tint)); ctx.fillRect(-w * twist / 2, 0, w * twist, L * 0.85);
      ctx.fillStyle = 'rgba(40,30,30,0.35)'; for (var j = 0; j < 3; j++) ctx.fillRect(-0.15, L * (0.2 + j * 0.2), 0.3, L * 0.1); ctx.restore();
    } else if (h.kind === 'chain') {
      for (var c = 0; c < 6; c++) { var u = c / 6, cx = bx + dx * u * 1.1, cy = by + dy * u * 1.1; ctx.strokeStyle = rgb(mulc(c % 2 ? h.col : h.col2, tint)); ctx.lineWidth = Math.max(0.4, 0.01 * k); ctx.beginPath(); ctx.ellipse(cx, cy, 0.012 * k, 0.02 * k, c % 2 ? 0 : Math.PI / 2 * 0.3, 0, TAU); ctx.stroke(); }
    } else { // ami-kazari: a little paper net
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-sw); ctx.strokeStyle = rgb(mulc(h.col, tint)); ctx.lineWidth = 0.4;
      for (var r = 0; r < 4; r++) { var yy = L * r / 4, ww = w * (0.6 + r * 0.35); ctx.beginPath(); ctx.moveTo(-ww, yy); ctx.lineTo(0, yy + L * 0.12); ctx.lineTo(ww, yy); ctx.stroke(); }
      ctx.restore();
    }
  });
}

/* ================= dragonflies =================
   summer: blue-grey shiokara-tombo (and now and then a big ginyanma) darting and hovering over the pond;
   late summer to autumn: red aka-tombo drifting in loose groups, perching on posts, lantern tops and reed tips. */
function dragonMode(season, light, date) {
  if (light === 'night' || season === 'winter' || season === 'spring') return null;
  if (date !== undefined && date !== null) {
    var d = toDate(date), m = d.getMonth(), day = d.getDate();
    if (!isNaN(m)) {
      var late = (m === 7 && day >= 20) || m === 8 || m === 9;
      if (late && (season === 'summer' || season === 'autumn')) return 'aka';
      return season === 'summer' ? 'summer' : null;
    }
  }
  return season === 'summer' ? 'summer' : 'aka';
}
function dragonPoints(g) { // world positions sampled under the scene's globals
  var rng = mulberry32(4441), pond = [], grass = [], air = [], perch = [], i;
  for (i = 0; i < 3000 && pond.length < 40 && F.pond; i++) { var x = LX(-0.2 + rng() * 5), z = LZ(3.0 + rng() * 2.1); if (pondSDF(x, z) < -0.25) pond.push([x, 0.25 + rng() * 0.7, z]); }
  for (i = 0; i < 24; i++) grass.push([LX(0.8 + rng() * 4.2), 0.3 + rng() * 0.8, LZ(0.4 + rng() * 2.6)]);
  for (i = 0; i < 60; i++) air.push([LX(-2.5 + rng() * 8.5), 1.0 + rng() * 2.0, LZ(1.5 + rng() * 7.5)]);
  if (F.lantern) perch.push([LAY.lantern.x, 1.92, LAY.lantern.z]);
  if (F.fence) [-2.6, 0.2, 2.2, 4.6].forEach(function (x) { if (!(F.gate && LX(x) > LAY.gate.xa - 0.3 && LX(x) < LAY.gate.xb + 0.3)) perch.push([LX(x), 1.9, LAY.fenceZ - 0.08]); });
  if (F.smallLanterns) perch.push([LX(-2.55), 0.74, LZ(7.25)], [LX(4.7), 0.74, LZ(5.55)]);
  if (F.irises) [[4.6, 3.7], [4.3, 6.0], [1.4, 6.9]].forEach(function (q) { var e = nearPondEdge(LX(q[0]), LZ(q[1])); perch.push([e[0], 0.62, e[1]]); });
  if (F.tsukubai) perch.push([LAY.tsukubai.x - 0.62, 0.8, LAY.tsukubai.z + 0.12]);
  if (!perch.length) perch.push([2.2, 0.5, 1.2]);
  return { pond: pond, grass: grass, air: air, perch: perch };
}
var DF_KIND = {
  shiokara: { L: 0.16, abd: [120, 146, 184], tip: [40, 40, 46], thx: [70, 70, 64], eye: [60, 90, 120] },
  ginyanma: { L: 0.21, abd: [70, 120, 170], tip: [60, 70, 60], thx: [96, 150, 64], eye: [80, 140, 90] },
  aka: { L: 0.15, abd: [204, 58, 34], tip: [150, 36, 24], thx: [150, 84, 50], eye: [150, 50, 40] }
};
function makeDragons(g, mode, rng) {
  if (!mode || !g.dfp) return null;
  var D = { mode: mode, list: [], groups: [], ginNext: 20 + rng() * 25, occ: {} }, i;
  function spawn(kind, region) { var p = region[(rng() * region.length) | 0]; return { kind: kind, x: p[0], y: p[1], z: p[2], tx: p[0], ty: p[1], tz: p[2], sx: p[0], sy: p[1], sz: p[2], st: 'hover', tt: rng() * 1.5, dur: 0.5 + rng(), hd: rng() < 0.5 ? 1 : -1, hy: 0, region: region, on: true, ph: rng() * TAU }; }
  if (mode === 'summer') {
    var reg = g.dfp.pond.length ? g.dfp.pond : g.dfp.grass, n = g.dfp.pond.length ? 3 : 1 + (rng() < 0.5 ? 1 : 0);
    for (i = 0; i < n; i++) D.list.push(spawn('shiokara', reg));
    D.gin = spawn('ginyanma', g.dfp.pond.length ? g.dfp.pond : g.dfp.grass); D.gin.on = false; D.list.push(D.gin);
  } else {
    for (i = 0; i < 3; i++) D.groups.push({ cx: LX(0.5 + rng() * 4), cz: LZ(3 + rng() * 4), a: rng() * TAU, w: 0.05 + rng() * 0.05 });
    for (i = 0; i < 8; i++) { var d = spawn('aka', g.dfp.air); d.grp = i % 3; D.list.push(d); }
  }
  return D;
}
function stepDragons(D, g, dt, rng) {
  if (!D) return;
  D.groups.forEach(function (gr) { gr.a += gr.w * dt; });
  if (D.gin) { D.ginNext -= dt; if (!D.gin.on && D.ginNext < 0) { D.gin.on = true; D.gin.life = 10 + rng() * 8; } if (D.gin.on) { D.gin.life -= dt; if (D.gin.life < 0) { D.gin.on = false; D.ginNext = 30 + rng() * 40; } } }
  D.list.forEach(function (d) {
    if (!d.on) return;
    d.tt += dt;
    if (d.st === 'dart') {
      var u = Math.min(1, d.tt / d.dur), e = 1 - Math.pow(1 - u, 3);
      d.x = lerp(d.sx, d.tx, e); d.y = lerp(d.sy, d.ty, e); d.z = lerp(d.sz, d.tz, e);
      if (u >= 1) { d.st = d.perchNext ? 'perch' : 'hover'; d.perchNext = false; d.tt = 0; d.dur = d.st === 'perch' ? 3 + rng() * 6 : 0.4 + rng() * (d.kind === 'aka' ? 1.6 : 1.2); }
      return;
    }
    if (d.st === 'hover') { d.hy = Math.sin(d.tt * 7 + d.ph) * 0.012; d.x += Math.sin(d.tt * 3.1 + d.ph) * 0.02 * dt; }
    if (d.tt < d.dur) return;
    // next move: a straight dart to a new spot (or onto a perch)
    var p, r = rng();
    if (d.st === 'perch' && d.pi !== undefined) { D.occ[d.pi] = false; d.pi = undefined; } // one dragonfly to a perch
    if (d.kind === 'aka') {
      var pi = (rng() * g.dfp.perch.length) | 0;
      if (d.st !== 'perch' && r < 0.18 && g.dfp.perch.length && !D.occ[pi]) { p = g.dfp.perch[pi]; d.perchNext = true; d.pi = pi; D.occ[pi] = true; }
      else { var gr = D.groups[d.grp], cx = gr.cx + Math.cos(gr.a) * 1.6, cz = gr.cz + Math.sin(gr.a) * 1.2; p = [cx + (rng() - 0.5) * 2.4, 1.0 + rng() * 1.8, cz + (rng() - 0.5) * 1.8]; }
    } else {
      p = d.region[(rng() * d.region.length) | 0];
      if (Math.hypot(p[0] - d.x, p[2] - d.z) > 2.2) p = [d.x + (p[0] - d.x) * 0.5, p[1], d.z + (p[2] - d.z) * 0.5];
    }
    d.sx = d.x; d.sy = d.y; d.sz = d.z; d.tx = p[0]; d.ty = p[1] + (d.perchNext ? 0.02 : 0); d.tz = p[2];
    var dist = Math.hypot(d.tx - d.sx, d.ty - d.sy, d.tz - d.sz);
    d.dur = Math.max(0.12, dist / (d.kind === 'ginyanma' ? 3.2 : d.kind === 'aka' ? 1.6 : 2.4)); d.st = 'dart'; d.tt = 0;
  });
}
function drawDragons(ctx, D, g, t) {
  if (!D) return;
  var tint = g.tint;
  D.list.forEach(function (d) {
    if (!d.on) return;
    var K = DF_KIND[d.kind], hdx = d.st === 'dart' ? d.tx - d.sx : d.hd, hdz = d.st === 'dart' ? d.tz - d.sz : 0.3;
    if (d.st !== 'dart') { hdx = d.lhx || hdx; hdz = d.lhz || hdz; } else { d.lhx = hdx; d.lhz = hdz; }
    var hl = Math.hypot(hdx, hdz) || 1; hdx /= hl; hdz /= hl;
    var y = d.y + (d.hy || 0), head = P(d.x + hdx * K.L * 0.5, y, d.z + hdz * K.L * 0.5), tail = P(d.x - hdx * K.L * 0.5, y - (d.st === 'perch' ? 0.01 : 0.004), d.z - hdz * K.L * 0.5);
    var dx = head.x - tail.x, dy = head.y - tail.y, len = Math.hypot(dx, dy);
    if (len < 0.6) { dx = 0.8 * d.hd; dy = 0; len = 0.8; head = { x: tail.x + dx, y: tail.y, k: tail.k }; }
    var ux = dx / len, uy = dy / len, nx = -uy, ny = ux, k = head.k;
    var th = { x: lerp(tail.x, head.x, 0.78), y: lerp(tail.y, head.y, 0.78) };
    // wings: a faint shimmer while flying, flat and still when perched
    var wl = K.L * k * 0.48, ww = Math.max(0.35, K.L * k * 0.09), flick = d.st === 'perch' ? 0.45 : 0.22 + 0.16 * Math.abs(Math.sin(t * 61 + d.ph));
    ctx.fillStyle = 'rgba(236,242,250,' + flick.toFixed(3) + ')';
    [[0.92, 1], [0.92, -1], [0.7, 1], [0.7, -1]].forEach(function (w, i) {
      var bx = th.x - ux * (i > 1 ? wl * 0.12 : 0), by = th.y - uy * (i > 1 ? wl * 0.12 : 0), sweep = d.st === 'perch' ? 0.35 : 0.1;
      var ex = nx * w[1] - ux * sweep, ey = ny * w[1] - uy * sweep, el = Math.hypot(ex, ey); ex /= el; ey /= el;
      ctx.beginPath(); ctx.ellipse(bx + ex * wl * w[0] * 0.5, by + ey * wl * w[0] * 0.5, wl * w[0] * 0.5, ww, Math.atan2(ey, ex), 0, TAU); ctx.fill();
    });
    // abdomen, thorax, head
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(mulc(K.abd, tint)); ctx.lineWidth = Math.max(0.45, K.L * k * 0.07); ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(th.x, th.y); ctx.stroke();
    ctx.strokeStyle = rgb(mulc(K.tip, tint)); ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(lerp(tail.x, th.x, 0.18), lerp(tail.y, th.y, 0.18)); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = rgb(mulc(K.thx, tint)); ctx.beginPath(); ctx.ellipse(th.x, th.y, Math.max(0.45, K.L * k * 0.08), Math.max(0.35, K.L * k * 0.06), Math.atan2(uy, ux), 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(mulc(K.eye, tint)); ctx.beginPath(); ctx.arc(head.x, head.y, Math.max(0.35, K.L * k * 0.055), 0, TAU); ctx.fill();
  });
}

/* ================= butterflies =================
   spring: pairs of small whites (monshirochō) around the azaleas and blossoms, now and then a yellow kichō;
   summer: a big black swallowtail gliding slowly through; early autumn: a few, fading out by late October. */
function butterflyMode(season, light, date) {
  if (light === 'night' || light === 'dusk' || season === 'winter') return null; // daytime only
  var m = { kind: season, n: 1 };
  if (season === 'autumn') {
    m.n = 2;
    if (date !== undefined && date !== null) {
      var d = toDate(date), mo = d.getMonth(), day = d.getDate();
      if (!isNaN(mo)) { if (mo === 8) m.n = 3; else if (mo === 9 && day <= 25) m.n = day < 12 ? 2 : 1; else if (mo === 9 || mo > 9) return null; }
    }
  }
  return m;
}
function butterflyPoints(g) {
  var rng = mulberry32(5551), fl = [], wander = [], i;
  if (F.azaleas > 0) AZALEAS.forEach(function (a, ii) { if (ii === 6 && !F.teahouse) return; for (var k = 0; k < 2; k++) fl.push([a[0] + (rng() - 0.5) * a[2], a[3] * F.azaleas * 0.85 + 0.05, a[1] + (rng() - 0.5) * a[2] * 0.6]); });
  if (F.irises) [[4.6, 3.7], [-0.05, 4.4], [4.3, 6.0]].forEach(function (q) { var e = nearPondEdge(LX(q[0]), LZ(q[1])); fl.push([e[0], 0.7, e[1]]); });
  if (SEA === SEASONS.spring && F.ycherry > 0.3) for (i = 0; i < 3; i++) fl.push([LAY.ycherry.x + 0.6 + rng() * 0.8, 1.0 + rng() * 1.6 * F.ycherry, LAY.ycherry.z - 0.6]);
  if (!fl.length) for (i = 0; i < 5; i++) fl.push([LX(0.8 + rng() * 3.5), 0.12, LZ(0.6 + rng() * 2.4)]); // wild flowers in the grass
  for (i = 0; i < 30; i++) wander.push([LX(-2.5 + rng() * 8), 0.4 + rng() * 1.6, LZ(0.5 + rng() * 7.5)]);
  return { fl: fl, wander: wander };
}
var BF_KIND = {
  white: { span: 0.17, fw: [246, 246, 238], hw: [240, 240, 228], spot: [40, 40, 40], body: [60, 60, 56], flap: 15, sp: 0.75 },
  yellow: { span: 0.18, fw: [244, 220, 90], hw: [240, 212, 80], spot: [140, 110, 40], body: [80, 70, 40], flap: 14, sp: 0.8 },
  swallow: { span: 0.32, fw: [26, 24, 28], hw: [30, 28, 34], spot: [200, 70, 70], body: [20, 20, 22], flap: 6, sp: 0.55, tails: true }
};
function makeButterflies(g, mode, rng) {
  if (!mode || !g.bfp) return null;
  var B = { list: [], yNext: 25 + rng() * 30 }, i;
  function mk(kind, lead) { var p = g.bfp.wander[(rng() * g.bfp.wander.length) | 0]; return { kind: kind, x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, vz: 0, tgt: null, st: 'fly', tt: 0, dur: 2 + rng() * 3, ph: rng() * TAU, lead: lead || null, on: true, a: rng() * TAU, hd: 1 }; }
  if (mode.kind === 'spring') {
    for (i = 0; i < 2; i++) { var a = mk('white'); B.list.push(a); B.list.push(mk('white', a)); }
    B.yel = mk('yellow'); B.yel.on = false; B.list.push(B.yel);
  } else if (mode.kind === 'summer') { B.list.push(mk('swallow')); if (rng() < 0.5) B.list.push(mk('white')); }
  else for (i = 0; i < mode.n; i++) B.list.push(mk(i % 2 ? 'yellow' : 'white'));
  return B;
}
function stepButterflies(B, g, dt, rng) {
  if (!B) return;
  if (B.yel) { B.yNext -= dt; if (!B.yel.on && B.yNext < 0) { B.yel.on = true; B.yel.life = 14 + rng() * 10; } if (B.yel.on && B.yel.life !== undefined) { B.yel.life -= dt; if (B.yel.life < 0) { B.yel.on = false; B.yNext = 40 + rng() * 40; } } }
  B.list.forEach(function (b) {
    if (!b.on) return;
    var K = BF_KIND[b.kind]; b.tt += dt;
    if (b.st === 'rest') { if (b.tt > b.dur) { b.st = 'fly'; b.tt = 0; b.dur = 3 + rng() * 4; b.tgt = null; b.vy = 0.4; } return; }
    if (b.lead && b.lead.on) { // the second of a pair circles round the first
      b.a += dt * 3.2; var L = b.lead; b.tgt = [L.x + Math.cos(b.a) * 0.22, L.y + Math.sin(b.a * 1.3) * 0.12, L.z + Math.sin(b.a) * 0.16];
      if (L.st === 'rest' && b.st !== 'rest' && rng() < dt * 0.4) { b.st = 'rest'; b.tt = 0; b.dur = 1.5 + rng() * 2; b.x = L.x + 0.1; b.y = L.y; b.z = L.z + 0.05; return; }
    } else if (!b.tgt || b.tt > b.dur) {
      var visit = rng() < (b.kind === 'swallow' ? 0.45 : 0.6);
      b.tgt = visit ? g.bfp.fl[(rng() * g.bfp.fl.length) | 0] : g.bfp.wander[(rng() * g.bfp.wander.length) | 0]; b.visit = visit; b.tt = 0; b.dur = 4 + rng() * 4;
    }
    var dx = b.tgt[0] - b.x, dy = b.tgt[1] - b.y, dz = b.tgt[2] - b.z, dist = Math.hypot(dx, dy, dz) || 1;
    if (!b.lead && b.visit && dist < 0.08) { b.st = 'rest'; b.tt = 0; b.dur = 2 + rng() * 4; b.x = b.tgt[0]; b.y = b.tgt[1]; b.z = b.tgt[2]; return; }
    var sp = K.sp * (b.kind === 'swallow' ? 0.8 + 0.2 * Math.sin(b.tt * 0.7) : 1);
    // steer towards the target with an erratic, bobbing flutter
    b.vx += (dx / dist * sp - b.vx) * dt * 2 + (rng() - 0.5) * dt * (b.kind === 'swallow' ? 1.2 : 4);
    b.vz += (dz / dist * sp - b.vz) * dt * 2 + (rng() - 0.5) * dt * (b.kind === 'swallow' ? 1.2 : 4);
    b.vy += (dy / dist * sp * 0.6 - b.vy) * dt * 2 + Math.sin(b.tt * (b.kind === 'swallow' ? 3 : 9) + b.ph) * dt * (b.kind === 'swallow' ? 0.8 : 3);
    b.x += b.vx * dt; b.y = Math.max(0.12, b.y + b.vy * dt); b.z += b.vz * dt;
    if (Math.abs(b.vx) > 0.05) b.hd = b.vx > 0 ? 1 : -1;
  });
}
function drawButterflies(ctx, B, g, t) {
  if (!B) return;
  var tint = g.tint;
  B.list.forEach(function (b) {
    if (!b.on) return;
    var K = BF_KIND[b.kind], p = P(b.x, b.y, b.z), k = p.k, s = K.span * k * 0.5;
    // wing angle: fast flaps in flight (gliding spells for the swallowtail), slow opening and closing at rest
    var open;
    if (b.st === 'rest') open = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 1.4 + b.ph));
    else { var glide = b.kind === 'swallow' && Math.sin(t * 0.9 + b.ph) > 0.35; open = glide ? 0.9 + 0.1 * Math.sin(t * 3) : Math.abs(Math.cos(t * K.flap + b.ph)); }
    var w = Math.max(0.08, open), tilt = b.hd * 0.25 + (b.st === 'rest' ? 0 : Math.sin(t * 2 + b.ph) * 0.15);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(tilt);
    [-1, 1].forEach(function (sd) {
      var ox = sd * s * 0.5 * w;
      ctx.fillStyle = rgb(mulc(K.hw, tint)); ctx.beginPath(); ctx.ellipse(ox * 0.8, s * 0.22, Math.max(0.3, s * 0.42 * w), s * 0.36, sd * 0.5, 0, TAU); ctx.fill();
      if (K.tails && w > 0.3) { ctx.strokeStyle = rgb(mulc(K.hw, tint)); ctx.lineWidth = Math.max(0.3, s * 0.08); ctx.beginPath(); ctx.moveTo(ox * 1.1, s * 0.4); ctx.lineTo(ox * 1.3, s * 0.78); ctx.stroke(); }
      ctx.fillStyle = rgb(mulc(K.fw, tint)); ctx.beginPath(); ctx.ellipse(ox, -s * 0.12, Math.max(0.3, s * 0.55 * w), s * 0.42, sd * -0.35, 0, TAU); ctx.fill();
      if (K.tails && w > 0.3 && s > 0.8) { // black swallowtail: pale streaks along the forewing veins, a red eye-spot on the hindwing
        ctx.strokeStyle = rgb(mulc([120, 112, 104], tint), 0.8); ctx.lineWidth = Math.max(0.25, s * 0.04);
        for (var v = 0; v < 3; v++) { ctx.beginPath(); ctx.moveTo(ox * 0.2, -s * 0.12); ctx.lineTo(ox * (1.3 + v * 0.1), -s * (0.4 - v * 0.2)); ctx.stroke(); }
        ctx.fillStyle = rgb(mulc(K.spot, tint)); ctx.beginPath(); ctx.arc(ox * 1.05, s * 0.4, Math.max(0.35, s * 0.08), 0, TAU); ctx.fill();
      } else if (w > 0.35 && s > 1.5) { ctx.fillStyle = rgb(mulc(K.spot, tint)); ctx.beginPath(); ctx.arc(ox * 1.15, -s * 0.1, s * 0.07, 0, TAU); ctx.fill(); }
    });
    ctx.strokeStyle = rgb(mulc(K.body, tint)); ctx.lineWidth = Math.max(0.35, s * 0.1); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -s * 0.32); ctx.lineTo(0, s * 0.42); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.restore();
  });
}

/* ================= autumn: a gust of leaves =================
   Momiji and ginkgo leaves are heavier than petals: a loose swirl carries them across, then each one comes down on its own
   with the pendulum motion of a falling leaf (rocking, side-slipping downwind, now and then flipping, turning slowly),
   and settles on the ground and moss or floats on the pond for a while. */
var GINKGO_PATH = null;
function ginkgoPath() {
  if (GINKGO_PATH) return GINKGO_PATH;
  var p = new Path2D(); // a fan on a short stalk, stalk at the origin, the fan toward -y
  p.moveTo(0, 0.5); p.lineTo(0, 0.05); p.lineTo(-0.48, -0.36); p.quadraticCurveTo(-0.28, -0.62, 0, -0.56); p.lineTo(0.03, -0.44); p.lineTo(0.06, -0.56); p.quadraticCurveTo(0.3, -0.6, 0.48, -0.36); p.lineTo(0.04, 0.05); p.lineTo(0.04, 0.5); p.closePath();
  GINKGO_PATH = p; return p;
}
var LEAF_COLS = { momiji: [[150, 30, 20], [196, 52, 28], [222, 92, 36], [234, 140, 52]], ginkgo: [[214, 170, 44], [236, 198, 70], [246, 220, 110]] };
function makeLeafGust(g, rng) { return { list: [], ground: [], floats: [], gust: null, nextGust: 14 + rng() * 30 }; }
function stepLeafGust(S, g, dt, t, rng) {
  var Wd = g.wind || windVec({ dir: 0, strength: 0.5 }), i;
  S.gustK = 0;
  if (!S.gust && t > S.nextGust) {
    if (g.noGust) S.nextGust = t + 35 + rng() * 35;
    else {
      var dir = Wd.side, n = 15 + ((rng() * 11) | 0), G = S.gust = { t0: t, dur: 5.5 + rng() * 1.5, dir: dir, y0: g.H * (0.36 + rng() * 0.22), cx0: dir > 0 ? -40 : g.W + 40 };
      S.started = true;
      for (i = 0; i < n; i++) {
        var kind = rng() < 0.28 ? 'ginkgo' : 'momiji', cols = LEAF_COLS[kind], th = rng() * TAU, R = 6 + rng() * 16;
        S.list.push({ st: 'gust', th: th, R: R, om: (0.8 + rng() * 0.9) * dir, dy: (rng() - 0.5) * 18, lag: rng() * 0.25, x: G.cx0 - dir * rng() * 30 + Math.cos(th) * R, y: G.y0 + Math.sin(th) * R * 0.45,
          ph: rng() * TAU, w: 1.5 + rng() * 1.1, flip: rng() * TAU, fs: 0.3 + rng() * 0.6, rot: rng() * TAU, sz: 2.4 + rng() * 2.0, kind: kind, col: cols[(rng() * cols.length) | 0], vy: 15 + rng() * 10, drift: 0.6 + rng() * 0.6,
          floor: g.horizonY + 10 + rng() * (g.H - g.horizonY - 14), rel: 0.3 + rng() * 0.6 });
      }
    }
  }
  if (S.gust) { var u = (t - S.gust.t0) / S.gust.dur; if (u >= 1) { S.gust = null; S.nextGust = t + 35 + rng() * 35; } else S.gustK = Math.pow(Math.sin(Math.PI * u), 2); }
  for (i = S.list.length - 1; i >= 0; i--) {
    var p = S.list[i]; p.flip += p.fs * dt;
    if (p.st === 'gust') {
      var Gs = S.gust, gu = Gs ? clamp((t - Gs.t0) / Gs.dur - p.lag) : 1;
      if (!Gs || gu >= p.rel) { p.st = 'fall'; continue; }                     // let go of the swirl part-way, so they come down across the garden
      var e = gu * gu * (3 - 2 * gu); p.th += p.om * dt; p.rot += 0.5 * dt * Gs.dir;
      var cx = lerp(Gs.cx0, Gs.cx0 + Gs.dir * (g.W + 80), e), cy = Gs.y0 + p.dy - Math.sin(e * Math.PI) * 16;
      var nx3 = p.x + (cx + Math.cos(p.th) * p.R - p.x) * Math.min(1, dt * 4); p.x = Gs.dir > 0 ? Math.max(p.x, nx3) : Math.min(p.x, nx3); p.y += (cy + Math.sin(p.th) * p.R * 0.45 - p.y) * Math.min(1, dt * 4);
      continue;
    }
    // the falling-leaf pendulum: glide sideways downwind, pause, drop a little, glide on
    p.ph += p.w * dt;
    p.x += Wd.x * (4 + 10 * Wd.s) * p.drift * (1 + 0.75 * Math.sin(p.ph)) * dt;
    p.y += p.vy * (0.45 + 0.55 * Math.abs(Math.cos(p.ph))) * dt;
    if (p.y >= p.floor) {
      var k = 0.45 + 0.55 * clamp((p.y - g.horizonY) / (g.H - g.horizonY)), rest = { x: p.x, y: p.y, rot: p.rot + Math.sin(p.ph) * 0.6, sz: p.sz * k, kind: p.kind, col: p.col, life: 0, flip: Math.cos(p.flip) };
      if (waterAt(g, p.x, p.y)) { if (S.floats.length < 16) { rest.L = 20 + rng() * 12; S.floats.push(rest); } }
      else if (S.ground.length < 40) { rest.L = 26 + rng() * 16; S.ground.push(rest); }
      S.list.splice(i, 1);
    } else if (p.x < -40 || p.x > g.W + 40) S.list.splice(i, 1);
  }
  for (i = S.ground.length - 1; i >= 0; i--) { S.ground[i].life += dt; if (S.ground[i].life > S.ground[i].L) S.ground.splice(i, 1); }
  for (i = S.floats.length - 1; i >= 0; i--) { var f = S.floats[i]; f.life += dt; f.x += Wd.x * (0.3 + 0.5 * Wd.base) * dt; f.rot += Math.sin(f.life * 0.3) * 0.05 * dt; if (f.life > f.L) S.floats.splice(i, 1); }
}
function leafAt(ctx, kind, x, y, sz, rot, sy, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sz, sz * sy);
  if (kind === 'ginkgo') { ctx.fillStyle = col; ctx.fill(ginkgoPath()); ctx.strokeStyle = 'rgba(90,60,10,0.35)'; ctx.lineWidth = 0.12; ctx.stroke(ginkgoPath()); }
  else { leafShape(ctx, 0, 0, 1, -Math.PI / 2, 1, col); ctx.strokeStyle = 'rgba(70,14,8,0.35)'; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.restore();
}
function drawLeafGust(ctx, S, g) {
  var tint = g.tint, i;
  for (i = 0; i < S.ground.length; i++) { var q = S.ground[i]; ctx.globalAlpha = Math.min(1, q.life / 0.4) * Math.min(1, (q.L - q.life) / 4) * 0.95; leafAt(ctx, q.kind, q.x, q.y, q.sz, q.rot, 0.5 * (q.flip >= 0 ? 1 : -1), rgb(mulc(scl(q.col, q.flip >= 0 ? 0.92 : 0.78), tint))); }
  for (i = 0; i < S.list.length; i++) {
    var p = S.list[i], fl = Math.cos(p.flip), rock = p.st === 'fall' ? Math.sin(p.ph) * 0.6 : 0;
    ctx.globalAlpha = 0.97; leafAt(ctx, p.kind, p.x, p.y, p.sz, p.rot + rock, Math.max(0.18, Math.abs(fl)) * (fl >= 0 ? 1 : -1), rgb(mulc(scl(p.col, fl >= 0 ? 1 : 0.78), tint)));
  }
  ctx.globalAlpha = 1;
}
function drawLeafFloats(ctx, S, g, sc) {
  if (!S.floats.length) return;
  ctx.save(); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  for (var i = 0; i < S.floats.length; i++) { var f = S.floats[i]; ctx.globalAlpha = Math.min(1, f.life / 0.6) * Math.min(1, (f.L - f.life) / 3) * 0.95; leafAt(ctx, f.kind, f.x, f.y, f.sz, f.rot, 0.45, rgb(mulc(f.col, g.tint))); }
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ---- 08b_rare.js ---- */
/* ================= rare visitors: animals that appear only now and then ================= */
var RARE = [
  { id: 'ooruri', name: 'オオルリ', season: ['spring', 'summer'], light: ['morning', 'day'], minStage: 6, desc: '青い背中の夏鳥。松の上で美しい声でさえずる', w: 1 },
  { id: 'kawasemi', name: 'カワセミ', season: ['spring', 'summer', 'autumn'], light: ['morning', 'day'], minStage: 7, desc: '水辺の宝石。岩から池に飛び込み小魚をとる', w: 1 },
  { id: 'rurubitaki', name: 'ルリビタキ', season: ['winter'], light: ['morning', 'day'], minStage: 8, desc: '雪の灯籠にとまる、冬の小さな青い鳥', w: 1 },
  { id: 'usagi', name: '白いノウサギ', season: ['winter'], light: ['morning', 'day', 'dusk', 'night'], minStage: 0, desc: '雪の上を跳ねる、冬毛の白いノウサギ', w: 1 },
  { id: 'kitsune', name: 'キツネ', season: ['autumn', 'winter'], light: ['dusk', 'night'], minStage: 10, desc: '垣根沿いを音もなく歩くキツネ', w: 0.9 },
  { id: 'tanuki', name: 'タヌキ', season: ['spring', 'summer', 'autumn'], light: ['night'], minStage: 13, desc: '茶室のそばをのんびり歩くタヌキ', w: 0.9 },
  { id: 'shika', name: '鹿', season: ['autumn'], light: ['morning', 'dusk'], minStage: 12, desc: 'もみじのそばにたたずむ角のある牡鹿', w: 0.7 },
  { id: 'sagi', name: '白鷺', season: ['summer'], light: ['morning', 'day'], minStage: 7, desc: '池の浅瀬をそっと歩く白い鷺', w: 0.8 },
  { id: 'mejiro', name: 'メジロ', season: ['spring'], light: ['morning', 'day'], minStage: 4, desc: '桜の花に来た、目のまわりの白い小鳥のつがい', w: 1 },
  { id: 'uguisu', name: 'ウグイス', season: ['spring'], light: ['morning', 'day', 'dusk'], minStage: 6, desc: '茂みにちらりと姿を見せた春告げ鳥', w: 0.9 },
  { id: 'hotaru', name: 'ゲンジボタルの群れ', season: ['summer'], light: ['night'], minStage: 7, desc: '池のほとりを舞う、めったに見られないほたるの群れ', w: 0.14 },
  { id: 'tsuru', name: '丹頂鶴', season: ['winter'], light: ['morning'], minStage: 0, desc: '雪の庭に舞い降りた丹頂鶴。めったに見られない', w: 0.08 }
];
function rareFits(r, g, date) {
  if (r.season.indexOf(g.season) < 0 || r.light.indexOf(g.light) < 0 || g.stage < r.minStage) return false;
  if (r.id === 'hotaru' && date !== undefined && date !== null) { var m = toDate(date).getMonth(); if (!isNaN(m) && (m < 5 || m > 6)) return false; }
  return true;
}
/* world anchors for the visitors, computed under the scene's globals */
function rarePoints(g) {
  var o = {};
  function edgeX(z, side) { var y = P(0, 0, z).y, q = groundAt(side < 0 ? -25 : W + 25, y); return q ? q.x : (side < 0 ? -8 : 9); }
  o.edgeX = function (z, side) { return edgeX(z, side); };
  o.fenceZ = LAY.fenceZ; o.tea = F.teahouse ? { x0: TH.X0, x1: TH.X1, z: TH.ZE - 0.55 } : null;
  if (F.pine > 0) { var S = lerp(0.24, 0.92, Math.min(1, F.pine)) * (F.pine > 1 ? F.pine : 1); o.pineTop = [LAY.pine.x - 1.05 * S * 1.15, 2.56 * S * 0.74 + 0.12 * S + 0.22 * Math.pow(S, 0.85), LAY.pine.z + 0.58 * S]; }
  if (F.lantern) o.lanternTop = [LAY.lantern.x, 1.93, LAY.lantern.z];
  if (F.pond) { var e = nearPondEdge(LX(1.0), LZ(3.5)); o.perch = [e[0] - 0.12, 0.3, e[1] - 0.12]; o.dive = [e[0] + 0.7, WL, e[1] + 0.45]; var s2 = nearPondEdge(LX(3.4), LZ(3.6)); o.shallow = [s2[0], s2[1]]; o.shallow2 = nearPondEdge(LX(2.5), LZ(3.3)); o.pond = [LX(2.0), LZ(4.1)]; }
  o.maple = [LAY.maple.x, LAY.maple.z]; o.yc = F.ycherry > 0.3 ? [LAY.ycherry.x, LAY.ycherry.z, 4.7 * F.ycherry * 0.82] : null;
  o.az = F.azaleas > 0 ? AZALEAS.filter(function (a, i) { return i !== 6 || F.teahouse; }).map(function (a) { return [a[0], a[1], a[2] * F.azaleas, a[3] * F.azaleas]; }) : [];
  o.lawn = [LX(1.6), LZ(1.6)];
  return o;
}

/* ---- painters: local metres, x forward (facing +x), y up negative; ctx is translated to the ground point ---- */
function rcol(c, g) { return rgb(mulc(c, g.tint)); }
var RARE_LAST = null;
function placeAt(ctx, g, x, y, z, dir, mag) {
  var p = P(x, y, z), s = p.k * (mag || 1); RARE_LAST = { x: p.x, y: p.y, k: p.k };
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir * s, s); return p;
}
function groundShadow(ctx, g, x, z, rx, a) { var p = P(x, 0, z); ctx.fillStyle = 'rgba(20,24,34,' + (a * Math.min(1, g.lum)) + ')'; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * p.k, rx * p.k * 0.28, 0, 0, TAU); ctx.fill(); }
function eye(ctx, x, y, r) { ctx.fillStyle = 'rgb(16,14,16)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.35, r * 0.35, 0, TAU); ctx.fill(); }
/* a small songbird; pose: 'perch' (with bob/tilt) or 'fly' (wing phase) */
function songbird(ctx, g, c, pose, ph, sing) {
  var L = c.L;
  ctx.lineJoin = 'round';
  if (pose === 'fly') {
    var wy = Math.sin(ph) * 0.9;
    ctx.fillStyle = rcol(c.wing || c.back, g); ctx.beginPath(); ctx.moveTo(-0.02 * L, -0.5 * L); ctx.quadraticCurveTo(-0.15 * L, (-0.5 - wy * 0.6) * L, -0.32 * L, (-0.5 - wy) * L); ctx.lineTo(0.08 * L, -0.48 * L); ctx.closePath(); ctx.fill();
  }
  // tail
  ctx.fillStyle = rcol(c.tail || c.back, g); ctx.beginPath(); ctx.moveTo(-0.18 * L, -0.42 * L); ctx.lineTo(-0.5 * L, (pose === 'fly' ? -0.46 : -0.2) * L); ctx.lineTo(-0.46 * L, (pose === 'fly' ? -0.38 : -0.12) * L); ctx.lineTo(-0.12 * L, -0.34 * L); ctx.closePath(); ctx.fill();
  // body: back then belly
  ctx.fillStyle = rcol(c.back, g); ctx.beginPath(); ctx.ellipse(0, -0.42 * L, 0.24 * L, 0.15 * L, pose === 'fly' ? 0 : -0.35, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(c.belly, g); ctx.beginPath(); ctx.ellipse(0.04 * L, -0.36 * L, 0.18 * L, 0.1 * L, pose === 'fly' ? 0.1 : -0.25, 0, Math.PI); ctx.fill();
  if (c.flank) { ctx.fillStyle = rcol(c.flank, g); ctx.beginPath(); ctx.ellipse(-0.02 * L, -0.38 * L, 0.1 * L, 0.06 * L, -0.3, 0, TAU); ctx.fill(); }
  // folded wing
  if (pose !== 'fly') { ctx.fillStyle = rcol(c.wing || scl(c.back, 0.85), g); ctx.beginPath(); ctx.ellipse(-0.06 * L, -0.45 * L, 0.17 * L, 0.08 * L, -0.4, 0, TAU); ctx.fill(); }
  // head
  var hx = 0.2 * L, hy = (pose === 'fly' ? -0.47 : -0.6) * L, hr = 0.11 * L * (c.bigHead || 1);
  ctx.fillStyle = rcol(c.head || c.back, g); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
  if (c.face) { ctx.fillStyle = rcol(c.face, g); ctx.beginPath(); ctx.ellipse(hx + hr * 0.25, hy + hr * 0.4, hr * 0.7, hr * 0.55, 0, 0, TAU); ctx.fill(); }
  if (c.ring) { ctx.fillStyle = rcol([250, 250, 246], g); ctx.beginPath(); ctx.arc(hx + hr * 0.3, hy - hr * 0.1, hr * 0.42, 0, TAU); ctx.fill(); }
  if (c.brow) { ctx.strokeStyle = rcol(c.brow, g); ctx.lineWidth = hr * 0.18; ctx.beginPath(); ctx.moveTo(hx - hr * 0.3, hy - hr * 0.4); ctx.lineTo(hx + hr * 0.7, hy - hr * 0.3); ctx.stroke(); }
  eye(ctx, hx + hr * 0.3, hy - hr * 0.1, hr * 0.22);
  // beak (opens when singing)
  var bl = (c.beak || 0.1) * L, op = sing ? 0.04 * L * (0.5 + 0.5 * Math.sin(ph * 3)) : 0;
  ctx.fillStyle = rcol(c.beakC || [40, 36, 34], g); ctx.beginPath(); ctx.moveTo(hx + hr * 0.8, hy - hr * 0.15); ctx.lineTo(hx + hr * 0.8 + bl, hy + hr * 0.05 - op); ctx.lineTo(hx + hr * 0.8, hy + hr * 0.25); ctx.closePath(); ctx.fill();
  if (op > 0) { ctx.beginPath(); ctx.moveTo(hx + hr * 0.8, hy + hr * 0.2); ctx.lineTo(hx + hr * 0.8 + bl * 0.9, hy + hr * 0.3 + op); ctx.lineTo(hx + hr * 0.8, hy + hr * 0.35); ctx.closePath(); ctx.fill(); }
  if (pose !== 'fly') { ctx.strokeStyle = rcol(c.legs || [70, 60, 56], g); ctx.lineWidth = 0.025 * L; ctx.beginPath(); ctx.moveTo(0.02 * L, -0.3 * L); ctx.lineTo(0.0, 0); ctx.moveTo(0.08 * L, -0.3 * L); ctx.lineTo(0.08 * L, 0); ctx.stroke(); }
}
var BIRDS = {
  ooruri: { L: 0.3, back: [40, 70, 170], head: [56, 110, 210], tail: [36, 64, 160], belly: [246, 246, 244], face: [24, 26, 40], wing: [34, 58, 150] },
  ruri: { L: 0.27, back: [60, 100, 196], head: [70, 112, 204], tail: [50, 90, 200], belly: [240, 238, 232], flank: [236, 150, 60], brow: [220, 230, 246] },
  mejiro: { L: 0.32, back: [128, 148, 46], head: [140, 160, 50], belly: [214, 210, 178], face: [222, 206, 70], ring: true, tail: [104, 120, 40] },
  uguisu: { L: 0.42, back: [140, 134, 78], head: [146, 138, 84], belly: [200, 196, 170], brow: [214, 206, 170], tail: [110, 104, 64] },
  kawasemi: { L: 0.3, back: [30, 156, 196], head: [26, 110, 170], tail: [30, 120, 190], belly: [224, 120, 46], face: [236, 134, 56], wing: [30, 120, 160], beak: 0.32, beakC: [24, 24, 28], bigHead: 1.35, legs: [210, 70, 50] }
};
function bird(ctx, g, kind, x, y, z, dir, pose, ph, sing) { placeAt(ctx, g, x, y, z, dir); songbird(ctx, g, BIRDS[kind], pose, ph, sing); ctx.restore(); }
/* --- the white hare --- */
function hare(ctx, g, pose, ph) {
  var W0 = [246, 247, 250], Sh = [196, 204, 220], tip = [26, 24, 28];
  if (pose === 'hop') {
    var s = Math.sin(ph); // stretched leap
    ctx.fillStyle = rcol(Sh, g); ctx.beginPath(); ctx.ellipse(-0.05, -0.2, 0.3, 0.1, -0.15 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = rcol(W0, g); ctx.beginPath(); ctx.ellipse(-0.04, -0.23, 0.28, 0.09, -0.15 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = rcol(Sh, g); ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.22, -0.18); ctx.lineTo(-0.38, -0.08 + 0.05 * s); ctx.moveTo(0.14, -0.18); ctx.lineTo(0.26, -0.08 - 0.04 * s); ctx.stroke();
    ctx.fillStyle = rcol(W0, g); ctx.beginPath(); ctx.ellipse(0.25, -0.3, 0.075, 0.06, 0.3, 0, TAU); ctx.fill();
    [[0.2, -0.33], [0.23, -0.34]].forEach(function (q, i) { ctx.fillStyle = rcol(i ? W0 : Sh, g); ctx.beginPath(); ctx.ellipse(q[0] - 0.06, q[1] - 0.06, 0.12, 0.025, -0.5 - i * 0.1, 0, TAU); ctx.fill(); ctx.fillStyle = rcol(tip, g); ctx.beginPath(); ctx.ellipse(q[0] - 0.15, q[1] - 0.01, 0.03, 0.018, -0.5, 0, TAU); ctx.fill(); });
    eye(ctx, 0.28, -0.32, 0.012);
    return;
  }
  var earUp = pose === 'alert' ? 1 : 0.6;
  ctx.fillStyle = rcol(Sh, g); ctx.beginPath(); ctx.ellipse(-0.06, -0.15, 0.17, 0.14, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(W0, g); ctx.beginPath(); ctx.ellipse(-0.06, -0.17, 0.16, 0.13, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0.08, -0.2, 0.1, 0.12, 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(Sh, g); ctx.beginPath(); ctx.ellipse(0.12, -0.04, 0.05, 0.03, 0, 0, TAU); ctx.fill(); // fore paws
  ctx.fillStyle = rcol(W0, g); ctx.beginPath(); ctx.ellipse(0.15, -0.33, 0.075, 0.062, 0.2, 0, TAU); ctx.fill();
  [0, 1].forEach(function (i) { var bx = 0.11 + i * 0.03, by = -0.38, tx = bx - 0.05 + i * 0.02 - (1 - earUp) * 0.12, ty = by - 0.17 * earUp - 0.04; ctx.strokeStyle = rcol(i ? W0 : Sh, g); ctx.lineWidth = 0.045; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke(); ctx.strokeStyle = rcol(tip, g); ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(lerp(bx, tx, 0.8), lerp(by, ty, 0.8)); ctx.lineTo(tx, ty); ctx.stroke(); ctx.lineCap = 'butt'; });
  eye(ctx, 0.18, -0.34, 0.012);
  ctx.fillStyle = rcol([200, 150, 150], g); ctx.beginPath(); ctx.arc(0.225, -0.31, 0.008, 0, TAU); ctx.fill();
}
/* --- four-legged walkers: fox, tanuki, stag --- */
function legs(ctx, g, col, pts, len, ph, w) {
  ctx.strokeStyle = rcol(col, g); ctx.lineWidth = w; ctx.lineCap = 'round';
  pts.forEach(function (q, i) { var sw = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.12 * len; ctx.beginPath(); ctx.moveTo(q, -len); ctx.quadraticCurveTo(q + sw * 0.4, -len * 0.45, q + sw, 0); ctx.stroke(); });
  ctx.lineCap = 'butt';
}
function fox(ctx, g, ph, look, moving) {
  var or = [198, 106, 48], dk = [140, 64, 30], hi = [226, 150, 84], wh = [240, 232, 218], lg = [44, 32, 28], st = moving ? ph : 0, sw = Math.sin(ph * 0.9) * 0.03, bob = moving ? Math.abs(Math.sin(st * 7)) * 0.012 : 0;
  legs(ctx, g, scl(lg, 0.8), [-0.24, 0.24], 0.3, st * 7 + 1.2, 0.035);                    // far legs
  // the brush: full, curving down and out from the rump, white-tipped
  ctx.fillStyle = rcol(or, g); ctx.beginPath(); ctx.moveTo(-0.27, -0.44 - bob); ctx.quadraticCurveTo(-0.6, -0.5 + sw, -0.84, -0.3 + sw); ctx.quadraticCurveTo(-0.9, -0.2 + sw, -0.78, -0.19 + sw); ctx.quadraticCurveTo(-0.56, -0.24 + sw * 0.5, -0.28, -0.33 - bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rcol(dk, g); ctx.beginPath(); ctx.moveTo(-0.3, -0.42 - bob); ctx.quadraticCurveTo(-0.58, -0.47 + sw, -0.8, -0.31 + sw); ctx.quadraticCurveTo(-0.6, -0.4 + sw, -0.3, -0.38 - bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.ellipse(-0.83, -0.24 + sw, 0.07, 0.05, 0.5, 0, TAU); ctx.fill();
  // one continuous body: rump, back, shoulder, neck, chest, belly
  ctx.save(); ctx.translate(0, -bob);
  ctx.fillStyle = rcol(or, g); ctx.beginPath(); ctx.moveTo(-0.3, -0.3); ctx.bezierCurveTo(-0.36, -0.44, -0.22, -0.5, -0.02, -0.47); ctx.bezierCurveTo(0.14, -0.45, 0.24, -0.5, 0.33, -0.6); ctx.lineTo(0.42, -0.5); ctx.bezierCurveTo(0.38, -0.38, 0.3, -0.31, 0.2, -0.29); ctx.bezierCurveTo(0.06, -0.27, -0.14, -0.3, -0.3, -0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rcol(dk, g); ctx.beginPath(); ctx.moveTo(-0.3, -0.42); ctx.bezierCurveTo(-0.2, -0.5, 0.0, -0.47, 0.14, -0.46); ctx.bezierCurveTo(0.0, -0.44, -0.2, -0.45, -0.3, -0.4); ctx.closePath(); ctx.fill();   // darker saddle
  ctx.fillStyle = rcol(hi, g); ctx.beginPath(); ctx.ellipse(-0.06, -0.36, 0.2, 0.05, -0.05, 0, TAU); ctx.fill();                               // sunlit flank
  ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.moveTo(0.4, -0.5); ctx.bezierCurveTo(0.38, -0.4, 0.32, -0.32, 0.22, -0.3); ctx.quadraticCurveTo(0.3, -0.38, 0.33, -0.5); ctx.closePath(); ctx.fill(); // white throat and chest
  var hx = 0.44, hy = -0.6 + (look ? -0.02 : 0);
  ctx.fillStyle = rcol(lg, g); [[-0.05, 0], [0.03, 0.01]].forEach(function (e) { ctx.beginPath(); ctx.moveTo(hx + e[0] - 0.045, hy - 0.04); ctx.lineTo(hx + e[0] - 0.015, hy - 0.16); ctx.lineTo(hx + e[0] + 0.03, hy - 0.04); ctx.closePath(); ctx.fill(); });
  ctx.fillStyle = rcol(or, g); ctx.beginPath(); ctx.moveTo(hx - 0.08, hy - 0.05); ctx.quadraticCurveTo(hx + 0.02, hy - 0.09, hx + 0.08, hy - 0.02); ctx.lineTo(hx + (look ? 0.13 : 0.2), hy + 0.035); ctx.quadraticCurveTo(hx + 0.04, hy + 0.08, hx - 0.07, hy + 0.06); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.moveTo(hx - 0.04, hy + 0.06); ctx.quadraticCurveTo(hx + 0.06, hy + 0.07, hx + (look ? 0.12 : 0.18), hy + 0.04); ctx.quadraticCurveTo(hx + 0.04, hy + 0.03, hx - 0.04, hy + 0.06); ctx.fill();
  ctx.fillStyle = 'rgb(28,22,20)'; ctx.beginPath(); ctx.arc(hx + (look ? 0.13 : 0.2), hy + 0.035, 0.014, 0, TAU); ctx.fill();
  eye(ctx, hx + 0.03, hy - 0.015, 0.012);
  ctx.restore();
  legs(ctx, g, lg, [-0.2, 0.28], 0.3, st * 7, 0.04);                                    // near legs in black stockings
}
function tanuki(ctx, g, ph, moving) {
  var fur = [124, 106, 84], dk = [44, 38, 34], pale = [196, 184, 158], tip = [176, 158, 126], st = moving ? ph : 0, rr = mulberry32(31), bob = moving ? Math.abs(Math.sin(st * 8)) * 0.01 : 0;
  legs(ctx, g, dk, [-0.14, 0.14], 0.14, st * 8 + 1, 0.05);
  ctx.save(); ctx.translate(0, -bob);
  // a round, shaggy body: overlapping tufts with frosted tips
  ctx.fillStyle = rcol(fur, g); ctx.beginPath(); ctx.ellipse(-0.36, -0.2, 0.15, 0.09, 0.5, 0, TAU); ctx.fill();         // the fat tail
  ctx.fillStyle = rcol(dk, g); ctx.beginPath(); ctx.ellipse(-0.45, -0.15, 0.06, 0.05, 0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(fur, g); ctx.beginPath(); ctx.ellipse(0, -0.26, 0.29, 0.16, 0, 0, TAU); ctx.fill();
  for (var i = 0; i < 16; i++) { var a = Math.PI + i / 15 * Math.PI, x = Math.cos(a) * 0.29, y = -0.26 + Math.sin(a) * 0.16; ctx.fillStyle = rcol(i % 3 ? tip : fur, g); ctx.beginPath(); ctx.ellipse(x, y, 0.045, 0.03, a + Math.PI / 2, 0, TAU); ctx.fill(); }
  ctx.fillStyle = rcol(scl(fur, 0.72), g); ctx.beginPath(); ctx.ellipse(-0.02, -0.38, 0.2, 0.04, 0, 0, TAU); ctx.fill();   // dark back line
  ctx.fillStyle = rcol(dk, g); ctx.beginPath(); ctx.ellipse(0.14, -0.2, 0.09, 0.1, 0.2, 0, TAU); ctx.fill();              // dark shoulders and chest
  var hx = 0.3, hy = -0.33 + Math.sin(st * 8) * 0.008;
  ctx.fillStyle = rcol(pale, g); ctx.beginPath(); ctx.ellipse(hx, hy, 0.1, 0.085, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(dk, g); ctx.beginPath(); ctx.ellipse(hx - 0.06, hy - 0.08, 0.035, 0.03, -0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx + 0.035, hy - 0.085, 0.032, 0.028, 0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 0.03, hy + 0.008, 0.065, 0.035, 0.15, 0, TAU); ctx.fill();                                 // the bandit mask
  ctx.fillStyle = rcol(pale, g); ctx.beginPath(); ctx.ellipse(hx + 0.1, hy + 0.03, 0.045, 0.03, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgb(20,18,18)'; ctx.beginPath(); ctx.arc(hx + 0.14, hy + 0.025, 0.013, 0, TAU); ctx.fill();
  eye(ctx, hx + 0.045, hy - 0.002, 0.011);
  ctx.restore();
  legs(ctx, g, dk, [-0.18, 0.18], 0.15, st * 8, 0.055);
}
function deerLeg(ctx, g, col, x, len, sw, hind) { // a tapered limb: broad thigh, slim cannon, small hoof
  var kx = x + (hind ? -0.07 : 0.03) + sw * 0.4, ky = -len * (hind ? 0.42 : 0.38), fx = x + sw, wt = hind ? 0.1 : 0.075;
  ctx.fillStyle = rcol(col, g); ctx.beginPath(); ctx.moveTo(x - wt, -len - 0.12); ctx.quadraticCurveTo(x - wt * 0.9, -len * 0.75, kx - 0.028, ky); ctx.lineTo(fx - 0.02, -0.02); ctx.lineTo(fx + 0.03, 0); ctx.lineTo(fx + 0.02, -0.03); ctx.lineTo(kx + 0.025, ky); ctx.quadraticCurveTo(x + wt * 0.8, -len * 0.7, x + wt * 0.7, -len - 0.12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rcol([40, 32, 28], g); ctx.beginPath(); ctx.ellipse(fx + 0.005, -0.012, 0.03, 0.014, 0, 0, TAU); ctx.fill();
}
function stag(ctx, g, ph, headUp, moving) {
  var coat = [132, 92, 60], dk = [92, 62, 42], rump = [240, 234, 222], lg = [96, 70, 50], st = moving ? ph : 0;
  var s1 = Math.sin(st * 5) * 0.09, s2 = Math.sin(st * 5 + Math.PI) * 0.09;
  deerLeg(ctx, g, scl(coat, 0.72), -0.32, 0.78, s2, true); deerLeg(ctx, g, scl(coat, 0.72), 0.36, 0.78, s1, false);   // far legs
  deerLeg(ctx, g, coat, -0.4, 0.78, s1, true); deerLeg(ctx, g, coat, 0.3, 0.78, s2, false);
  ctx.fillStyle = rcol(coat, g); ctx.beginPath(); ctx.ellipse(0, -0.95, 0.52, 0.2, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-0.36, -0.86, 0.17, 0.25, 0.12, 0, TAU); ctx.fill();                                            // haunch
  ctx.beginPath(); ctx.ellipse(0.3, -0.86, 0.14, 0.22, -0.1, 0, TAU); ctx.fill();                                              // shoulder
  ctx.fillStyle = rcol(mixc(coat, [236, 220, 196], 0.45), g); ctx.beginPath(); ctx.ellipse(0.0, -0.8, 0.38, 0.05, 0, 0, TAU); ctx.fill(); // pale belly
  ctx.fillStyle = rcol(dk, g); ctx.beginPath(); ctx.ellipse(0, -1.06, 0.46, 0.07, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = rcol(rump, g); ctx.beginPath(); ctx.ellipse(-0.5, -0.98, 0.07, 0.11, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol([230, 224, 214], g); [[-0.2, -0.9], [-0.05, -0.96], [0.1, -0.9], [0.22, -0.97], [-0.32, -0.95]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], 0.018, 0, TAU); ctx.fill(); }); // faint spots
  var nx = 0.42, ny = -1.02, hx = headUp ? 0.62 : 0.66, hy = headUp ? -1.55 : -1.3;
  ctx.strokeStyle = rcol(coat, g); ctx.lineWidth = 0.17; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.quadraticCurveTo(nx + 0.12, (ny + hy) / 2, hx - 0.03, hy + 0.06); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = rcol(coat, g); ctx.beginPath(); ctx.ellipse(hx, hy, 0.1, 0.075, 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx + 0.12, hy + 0.06, 0.07, 0.045, 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(dk, g); ctx.beginPath(); ctx.ellipse(hx - 0.06, hy - 0.09, 0.07, 0.03, -0.8, 0, TAU); ctx.fill();
  // antlers: three tines each side
  ctx.strokeStyle = rcol([206, 190, 160], g); ctx.lineWidth = 0.025; ctx.lineCap = 'round';
  [[-0.02, 0], [0.04, 0.03]].forEach(function (o) { var bx = hx + o[0], by = hy - 0.07; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 0.12 + o[1], by - 0.2, bx - 0.04 + o[1], by - 0.42); ctx.moveTo(bx - 0.06 + o[1] * 0.5, by - 0.12); ctx.lineTo(bx + 0.06 + o[1], by - 0.2); ctx.moveTo(bx - 0.07 + o[1], by - 0.28); ctx.lineTo(bx + 0.03 + o[1], by - 0.36); ctx.stroke(); });
  ctx.lineCap = 'butt';
  eye(ctx, hx + 0.03, hy - 0.02, 0.016);
  ctx.fillStyle = 'rgb(24,20,18)'; ctx.beginPath(); ctx.arc(hx + 0.18, hy + 0.08, 0.016, 0, TAU); ctx.fill();
}
/* --- tall white birds: egret and red-crowned crane --- */
function egret(ctx, g, pose, ph, strike) {
  var wh = [248, 248, 244], sh = [204, 208, 216];
  if (pose === 'fly') {
    var wy = Math.sin(ph) * 0.35;
    ctx.fillStyle = rcol(sh, g); ctx.beginPath(); ctx.moveTo(-0.1, -0.05); ctx.quadraticCurveTo(-0.2, -0.3 - wy, -0.55, -0.45 - wy * 1.2); ctx.lineTo(0.15, -0.04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.08, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.28, -0.04, 0.09, 0.06, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rcol([226, 190, 60], g); ctx.beginPath(); ctx.moveTo(0.35, -0.05); ctx.lineTo(0.5, -0.03); ctx.lineTo(0.35, -0.02); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rcol([30, 28, 26], g); ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(-0.25, 0.02); ctx.lineTo(-0.6, 0.06); ctx.stroke();
    ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.moveTo(-0.05, -0.04); ctx.quadraticCurveTo(0.05, -0.32 - wy * 0.8, -0.4, -0.55 - wy * 1.4); ctx.lineTo(0.18, -0.03); ctx.closePath(); ctx.fill();
    return;
  }
  var ext = strike || 0;
  ctx.strokeStyle = rcol([28, 26, 24], g); ctx.lineWidth = 0.03; var step = Math.sin(ph) * 0.06;
  ctx.beginPath(); ctx.moveTo(-0.03, -0.62); ctx.lineTo(-0.05 - step, 0); ctx.moveTo(0.03, -0.62); ctx.lineTo(0.06 + step, 0); ctx.stroke();
  ctx.fillStyle = rcol(sh, g); ctx.beginPath(); ctx.ellipse(-0.02, -0.66, 0.28, 0.11, -0.25, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.ellipse(-0.01, -0.69, 0.26, 0.1, -0.25, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-0.24, -0.62); ctx.lineTo(-0.42, -0.56); ctx.lineTo(-0.26, -0.68); ctx.closePath(); ctx.fill();
  var hx = 0.2 + ext * 0.35, hy = -1.08 + ext * 0.5;
  ctx.strokeStyle = rcol(wh, g); ctx.lineWidth = 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0.18, -0.74); ctx.bezierCurveTo(0.32 - ext * 0.1, -0.84 + ext * 0.2, 0.06 + ext * 0.2, -0.96 + ext * 0.4, hx, hy); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.ellipse(hx, hy, 0.06, 0.045, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol([226, 190, 60], g); ctx.beginPath(); ctx.moveTo(hx + 0.04, hy - 0.01); ctx.lineTo(hx + 0.22, hy + 0.02 + ext * 0.08); ctx.lineTo(hx + 0.04, hy + 0.02); ctx.closePath(); ctx.fill();
  eye(ctx, hx + 0.015, hy - 0.01, 0.01);
}
function crane(ctx, g, pose, ph, wings) {
  var wh = [248, 248, 246], sh = [206, 210, 218], bk = [24, 24, 28], red = [210, 36, 36];
  if (pose === 'fly') {
    var wy = Math.sin(ph) * 0.45;
    [[sh, 1], [wh, 0]].forEach(function (w) {
      ctx.fillStyle = rcol(w[0], g); ctx.beginPath(); ctx.moveTo(-0.15, -0.02); ctx.quadraticCurveTo(-0.3, -0.5 - wy, w[1] ? -0.6 : -0.75, -0.95 - wy * 1.4); ctx.lineTo(w[1] ? -0.25 : -0.38, -0.92 - wy * 1.3); ctx.quadraticCurveTo(0.1, -0.4 - wy * 0.5, 0.2, -0.02); ctx.closePath(); ctx.fill();
      if (!w[1]) { ctx.fillStyle = rcol(bk, g); ctx.beginPath(); ctx.moveTo(-0.75, -0.95 - wy * 1.4); ctx.lineTo(-0.38, -0.92 - wy * 1.3); ctx.lineTo(-0.3, -0.7 - wy); ctx.lineTo(-0.55, -0.68 - wy); ctx.closePath(); ctx.fill(); }
    });
    ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.11, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rcol(bk, g); ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(0.35, -0.02); ctx.lineTo(0.78, -0.08); ctx.stroke();
    ctx.fillStyle = rcol(red, g); ctx.beginPath(); ctx.arc(0.8, -0.1, 0.035, 0, TAU); ctx.fill();
    ctx.strokeStyle = rcol([140, 150, 120], g); ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0.82, -0.08); ctx.lineTo(0.98, -0.07); ctx.stroke();
    ctx.strokeStyle = rcol([40, 40, 40], g); ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.38, 0.02); ctx.lineTo(-0.95, 0.08); ctx.stroke();
    return;
  }
  var wo = wings || 0, step = Math.sin(ph) * 0.06;
  ctx.strokeStyle = rcol([44, 44, 44], g); ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.04, -0.85); ctx.lineTo(-0.06 - step, 0); ctx.moveTo(0.04, -0.85); ctx.lineTo(0.06 + step, 0); ctx.stroke();
  if (wo > 0.05) { ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.moveTo(-0.1, -1.0); ctx.quadraticCurveTo(-0.5, -1.2 - wo * 0.6, -0.9, -0.9 - wo * 0.7); ctx.lineTo(-0.5, -0.86); ctx.closePath(); ctx.fill(); ctx.fillStyle = rcol(bk, g); ctx.beginPath(); ctx.moveTo(-0.9, -0.9 - wo * 0.7); ctx.lineTo(-0.5, -0.86); ctx.lineTo(-0.62, -0.8 - wo * 0.3); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = rcol(sh, g); ctx.beginPath(); ctx.ellipse(-0.02, -0.92, 0.42, 0.16, -0.12, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(wh, g); ctx.beginPath(); ctx.ellipse(-0.01, -0.95, 0.4, 0.15, -0.12, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(bk, g); ctx.beginPath(); ctx.moveTo(-0.28, -0.98); ctx.quadraticCurveTo(-0.55, -0.92, -0.5, -0.74); ctx.quadraticCurveTo(-0.38, -0.82, -0.2, -0.86); ctx.closePath(); ctx.fill(); // the black "tail" (secondaries)
  ctx.strokeStyle = rcol(bk, g); ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0.3, -1.02); ctx.quadraticCurveTo(0.42, -1.3, 0.36, -1.62); ctx.stroke();
  ctx.strokeStyle = rcol(wh, g); ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.33, -1.25); ctx.quadraticCurveTo(0.36, -1.45, 0.32, -1.6); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = rcol(bk, g); ctx.beginPath(); ctx.ellipse(0.38, -1.66, 0.065, 0.05, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rcol(red, g); ctx.beginPath(); ctx.arc(0.37, -1.71, 0.03, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = rcol([150, 156, 120], g); ctx.beginPath(); ctx.moveTo(0.42, -1.67); ctx.lineTo(0.62, -1.64); ctx.lineTo(0.42, -1.63); ctx.closePath(); ctx.fill();
  eye(ctx, 0.4, -1.67, 0.011);
}

/* ---- the scripted visits: each returns false when finished ---- */
function easeIO(u) { u = clamp(u); return u * u * (3 - 2 * u); }
function arcPos(a, b, u, lift) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * (lift || 0), lerp(a[2], b[2], u)]; }
function startRare(id, g, rng) {
  var R = g.rp, a = { id: id, t: 0, seed: (rng() * 1e6) | 0, dir: 1 };
  var lawnZ = LZ(1.2 + rng() * 2.2);
  switch (id) {
    case 'ooruri': case 'rurubitaki': {
      var perch = id === 'ooruri' ? (R.pineTop || [LX(4.5), 2.0, LZ(3)]) : (R.lanternTop || [LX(-1.15), 0.05, LZ(4.3)]);
      a.perch = perch; a.from = [perch[0] - 3.2, perch[1] + 1.6, perch[2] + 1.0]; a.to = [perch[0] + 3.4, perch[1] + 2.0, perch[2] + 1.5]; a.T = 20; break;
    }
    case 'kawasemi': {
      var pr = R.perch || [LX(1), 0.3, LZ(3.4)], dv = R.dive || [pr[0] + 0.7, WL, pr[2] + 0.4];
      a.perch = pr; a.dv = dv; a.from = [pr[0] - 3.5, 0.6, pr[2] + 0.8]; a.to = [pr[0] + 4, 0.7, pr[2] + 1.8]; a.T = 22; break;
    }
    case 'mejiro': {
      // in the blossom of the someiyoshino behind the fence (pink behind the green birds)
      var c = [g.F.namiki ? LAY.namiki[2][0] : LX(4.4), (g.F.namiki ? LAY.namiki[2][1] : LZ(11.5)) - 1.2, 2.6], pts = [];
      for (var i = 0; i < 6; i++) pts.push([c[0] - 0.9 + rng() * 1.8, c[2] + rng() * 0.9, c[1] - rng() * 0.3]);
      a.pts = pts; a.from = [c[0] - 3.5, c[2] + 1.5, c[1] - 1.5]; a.T = 18; break;
    }
    case 'uguisu': {
      var near = R.az.slice().sort(function (p, q) { return p[1] - q[1]; }).slice(0, 2), az = near.length ? near[(rng() * near.length) | 0] : [LX(1.5), LZ(1.5), 0.5, 0.4];
      a.az = az; a.T = 12; break;
    }
    case 'usagi': {
      var z = lawnZ, xl = R.edgeX(z, -1), xr = R.edgeX(z, 1); a.dir = rng() < 0.5 ? 1 : -1;
      a.A = [a.dir > 0 ? xl : xr, z]; a.B = [lerp(xl, xr, a.dir > 0 ? 0.42 : 0.58), z + (rng() - 0.5) * 0.8]; a.C = [a.dir > 0 ? xr : xl, z + (rng() - 0.5) * 1.2]; a.T = 18; break;
    }
    case 'kitsune': {
      var fz = R.fenceZ - 0.7, l = R.edgeX(fz, -1), r = R.edgeX(fz, 1); a.dir = rng() < 0.5 ? 1 : -1; a.A = [a.dir > 0 ? l - 0.6 : r + 0.6, fz]; a.C = [a.dir > 0 ? r + 0.6 : l - 0.6, fz]; a.T = 20; break;
    }
    case 'tanuki': {
      var tz = R.tea ? R.tea.z : LZ(6.5), tx0 = R.tea ? R.tea.x0 - 1.6 : R.edgeX(tz, -1) - 0.4, tx1 = R.tea ? R.tea.x1 + 1.4 : LX(2);
      a.A = [tx0, tz]; a.B = [lerp(tx0, tx1, 0.55), tz + 0.2]; a.C = [tx1, tz + 0.8]; a.T = 22; break;
    }
    case 'shika': {
      var mz = R.maple[1] + 0.8, mx = R.maple[0] + 1.7, ex = R.edgeX(mz, -1) - 1;
      a.A = [ex, mz + 0.4]; a.B = [mx, mz]; a.T = 24; break;
    }
    case 'sagi': {
      var sh2 = R.shallow || [LX(3.4), LZ(3.0)], s3 = R.shallow2 || [sh2[0] - 0.8, sh2[1] - 0.2];
      a.land = [sh2[0], sh2[1]]; a.walk = [s3[0], s3[1]]; a.from = [sh2[0] + 4, 3.2, sh2[1] + 3]; a.to = [sh2[0] - 4.5, 3.5, sh2[1] + 3.5]; a.T = 24; break;
    }
    case 'hotaru': {
      var cx = R.pond ? R.pond[0] : LX(2), cz = R.pond ? R.pond[1] : LZ(3), fl = [];
      for (var j = 0; j < 110; j++) fl.push({ x: cx + (rng() - 0.5) * 6, y: 0.2 + rng() * 1.4, z: cz + (rng() - 0.5) * 3.4, a1: 0.1 + rng() * 0.2, p1: rng() * TAU, p2: rng() * TAU, w: 0.8 + rng() * 0.5, ph: rng() * 0.6 });
      a.fl = fl; a.T = 24; break;
    }
    case 'tsuru': {
      var lz = LZ(1.8 + rng() * 1.2), lx = LX(2.2 + rng() * 1.5);
      a.land = [lx, lz]; a.from = [lx - 9, 6.5, lz + 6]; a.to = [lx + 9, 7, lz + 8]; a.T = 25; break;
    }
  }
  return a;
}
function drawRare(ctx, a, g) {
  var t = a.t, u, p, rng = mulberry32(a.seed);
  switch (a.id) {
    case 'ooruri': case 'rurubitaki': {
      var kind = a.id === 'ooruri' ? 'ooruri' : 'ruri', T = a.T;
      if (t < 3) { u = easeIO(t / 3); p = arcPos(a.from, a.perch, u, 0.3); bird(ctx, g, kind, p[0], p[1], p[2], 1, 'fly', t * 26); }
      else if (t < T - 3) { var bob = Math.abs(Math.sin(t * 2.2)) * 0.015, sing = a.id === 'ooruri' && ((t % 5) < 2.4), turn = Math.sin(t * 0.7) > 0.6 ? -1 : 1; bird(ctx, g, kind, a.perch[0], a.perch[1] + bob, a.perch[2], turn, 'perch', t * 4, sing); }
      else { u = easeIO((t - (T - 3)) / 3); p = arcPos(a.perch, a.to, u, 0.4); bird(ctx, g, kind, p[0], p[1], p[2], 1, 'fly', t * 26); }
      return t < T;
    }
    case 'kawasemi': {
      if (t < 2.5) { u = easeIO(t / 2.5); p = arcPos(a.from, a.perch, u, 0.2); bird(ctx, g, 'kawasemi', p[0], p[1], p[2], 1, 'fly', t * 34); }
      else if (t < 9) bird(ctx, g, 'kawasemi', a.perch[0], a.perch[1] + Math.abs(Math.sin(t * 3)) * 0.01, a.perch[2], 1, 'perch', t * 3);
      else if (t < 9.7) { u = (t - 9) / 0.7; p = [lerp(a.perch[0], a.dv[0], u), lerp(a.perch[1], WL, u * u), lerp(a.perch[2], a.dv[2], u)]; bird(ctx, g, 'kawasemi', p[0], p[1], p[2], 1, 'fly', 0.4); if (!a.splashed && u > 0.95) { a.splashed = true; a.cueSplash = true; } }
      else if (t < 11.2) { var su = (t - 9.7) / 1.5, c = P(a.dv[0], WL, a.dv[2]); for (var r = 0; r < 3; r++) { var rr = (0.05 + su * 0.35 - r * 0.07) * c.k; if (rr <= 0) continue; ctx.strokeStyle = 'rgba(240,248,252,' + (0.6 * (1 - su)) + ')'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * g.cam.s, 0, 0, TAU); ctx.stroke(); } if (su < 0.5) { ctx.fillStyle = 'rgba(240,248,252,' + (0.8 * (1 - su * 2)) + ')'; for (var d = 0; d < 9; d++) { var an = d / 9 * TAU; ctx.beginPath(); ctx.arc(c.x + Math.cos(an) * su * 0.3 * c.k, c.y - Math.sin(su * 2 * Math.PI) * 0.15 * c.k + Math.sin(an) * su * 0.1 * c.k, Math.max(0.4, 0.015 * c.k), 0, TAU); ctx.fill(); } } if (su > 0.3) { u = (su - 0.3) / 0.7; p = [lerp(a.dv[0], a.perch[0], u), lerp(WL, a.perch[1], u), lerp(a.dv[2], a.perch[2], u)]; bird(ctx, g, 'kawasemi', p[0], p[1], p[2], -1, 'fly', t * 34); } }
      else if (t < a.T - 2.5) { bird(ctx, g, 'kawasemi', a.perch[0], a.perch[1], a.perch[2], 1, 'perch', t * 3); var fp = P(a.perch[0] + 0.12, a.perch[1] + 0.17, a.perch[2]); ctx.fillStyle = 'rgba(200,210,214,0.9)'; ctx.beginPath(); ctx.ellipse(fp.x, fp.y, 0.05 * fp.k, 0.012 * fp.k, 0.2, 0, TAU); ctx.fill(); }
      else { u = easeIO((t - (a.T - 2.5)) / 2.5); p = arcPos(a.perch, a.to, u, 0.2); bird(ctx, g, 'kawasemi', p[0], p[1], p[2], 1, 'fly', t * 34); }
      return t < a.T;
    }
    case 'mejiro': {
      var pts = a.pts, seg = 2.2, n = pts.length;
      [0, 1].forEach(function (k) {
        var tt = t - k * 0.5; if (tt < 0) return;
        if (tt < 2.5) { p = arcPos(a.from, pts[k], easeIO(tt / 2.5), 0.3); bird(ctx, g, 'mejiro', p[0] + k * 0.15, p[1], p[2], -1, 'fly', tt * 30); return; }
        var lt = tt - 2.5;
        if (lt > n * seg - 1) { var lu = clamp((lt - (n * seg - 1)) / 2), last = pts[(n - 1 + k) % n]; p = arcPos(last, [a.from[0] - 6, a.from[1] + 1, a.from[2]], easeIO(lu), 0.3); bird(ctx, g, 'mejiro', p[0], p[1], p[2], -1, 'fly', tt * 30); return; }
        var i0 = Math.floor(lt / seg), f = lt / seg - i0, A = pts[(i0 + k) % n], B = pts[(i0 + 1 + k) % n];
        if (f < 0.75) bird(ctx, g, 'mejiro', A[0] + k * 0.12, A[1], A[2], (i0 + k) % 2 ? 1 : -1, 'perch', lt * 5);
        else { p = arcPos(A, B, (f - 0.75) / 0.25, 0.15); bird(ctx, g, 'mejiro', p[0] + k * 0.12, p[1], p[2], B[0] > A[0] ? 1 : -1, 'fly', lt * 30); }
      });
      return t < a.T;
    }
    case 'uguisu': {
      var az = a.az, side = rng() < 0.5 ? -1 : 1, ph2 = t / a.T, vis = Math.sin(clamp(ph2) * Math.PI);
      var bx = az[0] + side * az[2] * (0.45 + 0.2 * Math.sin(t * 0.9)), by = az[3] * 0.92 + Math.abs(Math.sin(t * 1.7)) * 0.08 * vis, bz = az[1] - az[2] * 0.3;
      ctx.globalAlpha = clamp(vis * 1.6); bird(ctx, g, 'uguisu', bx, by, bz, -side, 'perch', t * 4, (t % 4) < 1.5); ctx.globalAlpha = 1;
      var lp = P(bx, by + 0.05, bz), lr = mulberry32(a.seed + 3); ctx.fillStyle = rgb(mulc(g.SEA.shrub[3], g.tint)); // leaves in front: only a glimpse
      for (var q = 0; q < 3; q++) { ctx.beginPath(); ctx.ellipse(lp.x + (lr() - 0.5) * 0.3 * lp.k, lp.y + (0.25 + lr() * 0.4) * 0.12 * lp.k, 0.035 * lp.k, 0.022 * lp.k, lr() * 3, 0, TAU); ctx.fill(); }
      return t < a.T;
    }
    case 'usagi': {
      var T1 = 6, T2 = 11, z, x, pose, ph = 0;
      if (t < T1) { u = t / T1; x = lerp(a.A[0], a.B[0], u); z = lerp(a.A[1], a.B[1], u); var hp = (t * 2.2) % 1; pose = hp < 0.55 ? 'hop' : 'sit'; ph = hp * Math.PI / 0.55; var hy = pose === 'hop' ? Math.sin(hp / 0.55 * Math.PI) * 0.12 : 0; groundShadow(ctx, g, x, z, 0.22, 0.25); placeAt(ctx, g, x, hy, z, a.dir); hare(ctx, g, pose, ph); ctx.restore(); }
      else if (t < T2) { x = a.B[0]; z = a.B[1]; groundShadow(ctx, g, x, z, 0.2, 0.25); placeAt(ctx, g, x, 0, z, (t > 8.5 ? -a.dir : a.dir)); hare(ctx, g, t > 7 && t < 10 ? 'alert' : 'sit', 0); ctx.restore(); }
      else { u = (t - T2) / (a.T - T2); x = lerp(a.B[0], a.C[0], u); z = lerp(a.B[1], a.C[1], u); var hp2 = (t * 2.6) % 1, pose2 = hp2 < 0.6 ? 'hop' : 'sit', hy2 = pose2 === 'hop' ? Math.sin(hp2 / 0.6 * Math.PI) * 0.15 : 0; groundShadow(ctx, g, x, z, 0.22, 0.25); placeAt(ctx, g, x, hy2, z, a.dir); hare(ctx, g, pose2, hp2 * Math.PI / 0.6); ctx.restore(); }
      return t < a.T;
    }
    case 'kitsune': {
      var tp = 7, tq = 12, xx, zz = a.A[1], look = false, mov = true;
      if (t < tp) xx = lerp(a.A[0], lerp(a.A[0], a.C[0], 0.48), t / tp);
      else if (t < tq) { xx = lerp(a.A[0], a.C[0], 0.48); look = t > tp + 1 && t < tq - 1; mov = false; }
      else xx = lerp(lerp(a.A[0], a.C[0], 0.48), a.C[0], (t - tq) / (a.T - tq));
      groundShadow(ctx, g, xx, zz, 0.55, 0.22); placeAt(ctx, g, xx, 0, zz, a.dir, 1.1); fox(ctx, g, t, look, mov); ctx.restore();
      return t < a.T;
    }
    case 'tanuki': {
      var x2, z2, mv = true;
      if (t < 8) { u = t / 8; x2 = lerp(a.A[0], a.B[0], u); z2 = lerp(a.A[1], a.B[1], u); }
      else if (t < 14) { x2 = a.B[0]; z2 = a.B[1]; mv = false; }
      else { u = (t - 14) / (a.T - 14); x2 = lerp(a.B[0], a.C[0], u); z2 = lerp(a.B[1], a.C[1], u); }
      groundShadow(ctx, g, x2, z2, 0.35, 0.25); placeAt(ctx, g, x2, mv ? 0 : -0.02 * Math.abs(Math.sin(t * 3)), z2, 1, 1.1); tanuki(ctx, g, t, mv); ctx.restore();
      return t < a.T;
    }
    case 'shika': {
      var x3, z3, mv2 = true, up = false, d3 = 1;
      if (t < 7) { u = easeIO(t / 7); x3 = lerp(a.A[0], a.B[0], u); z3 = lerp(a.A[1], a.B[1], u); }
      else if (t < 17) { x3 = a.B[0]; z3 = a.B[1]; mv2 = false; up = t > 9 && t < 15; }
      else { u = easeIO((t - 17) / (a.T - 17)); x3 = lerp(a.B[0], a.A[0], u); z3 = lerp(a.B[1], a.A[1], u); d3 = -1; }
      groundShadow(ctx, g, x3, z3, 0.7, 0.22); placeAt(ctx, g, x3, 0, z3, d3, 1.05); stag(ctx, g, t, up, mv2); ctx.restore();
      return t < a.T;
    }
    case 'sagi': {
      var L1 = 4, L2 = a.T - 4;
      if (t < L1) { u = easeIO(t / L1); p = arcPos(a.from, [a.land[0], 0, a.land[1]], u, 0.4); placeAt(ctx, g, p[0], p[1] + 0.4 * (1 - u), p[2], -1, 1.15); egret(ctx, g, u > 0.85 ? 'stand' : 'fly', t * 7); ctx.restore(); }
      else if (t < L2) {
        var w = (t - L1) / (L2 - L1), sx = lerp(a.land[0], a.walk[0], easeIO(w)), sz = lerp(a.land[1], a.walk[1], easeIO(w)), strike = Math.max(0, Math.sin((t - L1) * 0.9) - 0.85) * 6;
        var pc = P(sx, WL, sz); ctx.strokeStyle = 'rgba(230,240,246,0.35)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(pc.x, pc.y, 0.14 * pc.k, 0.04 * pc.k, 0, 0, TAU); ctx.stroke();
        placeAt(ctx, g, sx, -0.04, sz, -1, 1.15); egret(ctx, g, 'stand', (t - L1) * 1.2, clamp(strike)); ctx.restore();
      } else { u = easeIO((t - L2) / 4); p = arcPos([a.walk[0], 0, a.walk[1]], a.to, u, 0.5); placeAt(ctx, g, p[0], p[1], p[2], -1, 1.15); egret(ctx, g, u < 0.1 ? 'stand' : 'fly', t * 7); ctx.restore(); }
      return t < a.T;
    }
    case 'hotaru': {
      var fade = Math.min(1, t / 3, (a.T - t) / 3), spr = sprite('fly'); ctx.globalCompositeOperation = 'lighter'; RARE_LAST = P(a.fl[0].x, 0.6, a.fl[0].z);
      a.fl.forEach(function (f, i) {
        var x = f.x + Math.sin(t * f.a1 + f.p1) * 0.6, y = f.y + Math.sin(t * f.a1 * 1.3 + f.p2) * 0.3 + t * 0.01, z = f.z + Math.cos(t * f.a1 * 0.8 + f.p2) * 0.4;
        var q = P(x, y, z), s = Math.sin(t * 2.1 - f.ph + (i % 3) * 0.2), al = 0.22 + 0.78 * (s > 0 ? Math.pow(s, 1.4) : 0); // they pulse almost in step
        stamp(ctx, spr, q.x, q.y, 2.6 + q.k * 0.07, 0, al * fade); stamp(ctx, spr, q.x, q.y, 1.2, 0, al * fade);
      });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      return t < a.T;
    }
    case 'tsuru': {
      var Lg = 5, Lv = a.T - 4.5;
      if (t < Lg) { u = easeIO(t / Lg); p = arcPos(a.from, [a.land[0], 0, a.land[1]], u, 0.6); var fly = u < 0.9; if (!fly) groundShadow(ctx, g, p[0], p[2], 0.6, 0.2); placeAt(ctx, g, p[0], p[1], p[2], 1, 1.0); crane(ctx, g, fly ? 'fly' : 'stand', t * (u > 0.7 ? 9 : 3), u > 0.8 ? (1 - u) * 5 : 0); ctx.restore(); }
      else if (t < Lv) { var st = t - Lg, dance = Math.max(0, Math.sin(st * 0.8) - 0.6) * 2.5, hop = dance > 0.3 ? Math.abs(Math.sin(st * 4)) * 0.12 : 0; groundShadow(ctx, g, a.land[0], a.land[1], 0.6, 0.22); placeAt(ctx, g, a.land[0], hop, a.land[1], st > 8 ? -1 : 1, 1.0); crane(ctx, g, 'stand', st * 1.5, dance); ctx.restore(); }
      else { u = easeIO((t - Lv) / 4.5); p = arcPos([a.land[0], 0, a.land[1]], a.to, u, 0.5); placeAt(ctx, g, p[0], p[1], p[2], 1, 1.0); crane(ctx, g, u < 0.08 ? 'stand' : 'fly', t * 7, u < 0.08 ? 1 : 0); ctx.restore(); }
      return t < a.T;
    }
  }
  return false;
}

/* ---- 08c_wind.js ---- */
/* ================= one wind for everything (shared model: garden, town and sky agree) =================
   seed     = mulberry32(FNV-1a('mogi-wind' + dayKey)), dayKey = local 'YYYYMMDD'
   base dir = first draw < 0.5 ? 0 (left->right) : 180 (right->left), plus (second draw * 2 - 1) * 25 degrees
   drift    = 20 degrees * valueNoise(seed, hours / 3)            (hours = local time of day, fractional)
   strength = seasonal base (spring .6, summer .35, autumn .6, winter .75) * (0.6 + 0.4 * (valueNoise(seed ^ 0x5bd1e995, minutes / 7) * .5 + .5))
   valueNoise(s, x): smoothstep blend of h(floor x) and h(floor x + 1), h(n) = mulberry32((s ^ imul(n + 1, 0x9E3779B1)) >>> 0)() * 2 - 1
   dir is in degrees: 0 blows toward screen right, 180 toward screen left, 90 away from the viewer. Gusts are 2-3x, same direction. */
var WIND_SEASON = { spring: 0.6, summer: 0.35, autumn: 0.6, winter: 0.75 };
function fnv1a(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function windDayKey(d) { var m = d.getMonth() + 1, dd = d.getDate(); return '' + d.getFullYear() + (m < 10 ? '0' : '') + m + (dd < 10 ? '0' : '') + dd; }
function windNoise(seed, x) {
  var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  function h(n) { return mulberry32((seed ^ Math.imul(n + 1, 0x9E3779B1)) >>> 0)() * 2 - 1; }
  var a = h(i); return a + (h(i + 1) - a) * u;
}
function windAt(date) {
  var d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  var seed = fnv1a('mogi-wind' + windDayKey(d)), r = mulberry32(seed);
  var base = (r() < 0.5 ? 0 : 180) + (r() * 2 - 1) * 25;
  var hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 + d.getMilliseconds() / 3600000, minutes = hours * 60;
  var dir = base + 20 * windNoise(seed, hours / 3);
  var strength = WIND_SEASON[seasonFor(d)] * (0.6 + 0.4 * (windNoise((seed ^ 0x5bd1e995) >>> 0, minutes / 7) * 0.5 + 0.5));
  var wx = weatherAt(d);   // a typhoon or blizzard: the day's direction, at full strength
  if (wx === 'typhoon' || wx === 'blizzard') strength = 0.9 + 0.1 * (windNoise((seed ^ 0x27d4eb2f) >>> 0, minutes / 2) * 0.5 + 0.5);
  return { dir: ((dir % 360) + 360) % 360, strength: strength };
}

/* ---- garden-only helpers ---- */
/* smooth value noise for the animations' own variations (not part of the shared model) */
function vnoise1(seed, x) {
  var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  var a = mulberry32((seed * 7919 + i) | 0)(), b = mulberry32((seed * 7919 + i + 1) | 0)();
  return a + (b - a) * u;
}
/* the wind as the animations use it: a screen vector (x across, y toward/away), the side it blows toward, its strength.
   w.dir is in degrees as windAt gives it; gust adds 0..1.6 on top (a gust blows the same way, 2-3x as hard). */
function windVec(w, gust) {
  var a = w.dir * Math.PI / 180, s = w.strength * (1 + (gust || 0)), x = Math.cos(a), y = Math.sin(a);
  return { dir: a, s: s, base: w.strength, x: x, y: y * 0.35, side: x >= 0 ? 1 : -1 };
}

/* ---- 08d_weather.js ---- */
var WEATHERS = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'typhoon', 'blizzard'];
/* ================= weather (shared model: garden, town and sky agree) =================
   weatherAt(date) -> 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow'
   block = floor(localHour / 3); seed = FNV-1a('mogi-weather' + YYYYMMDD + '-' + block); r = 1st mulberry32 draw, p = 2nd draw.
   If the previous 3-hour block (block - 1, or block 7 of the day before) was rain or storm and p < 0.5, the block keeps that weather;
   otherwise r picks from the month's table. Then: 'storm' only 13:00-20:00 (else 'rain'); 'snow' only in winter (else 'rain').
   A block's own hour, for the storm rule, is the hour asked for; a previous block is judged at its middle (block * 3 + 1.5).
   Rare days are checked first: r0 = 1st draw of FNV-1a('mogi-weather-rare' + YYYYMMDD).
     typhoon:  Aug r0 < .02, Sep < .04, Oct < .02 -> blocks 0-1 'cloudy', 2-6 'typhoon', 7 'rain'
     blizzard: Jan r0 < .03, Feb < .03, Dec < .01  -> blocks 0-3 'snow', 4-7 'blizzard' */
function rareDay(d) {
  var r0 = mulberry32(fnv1a('mogi-weather-rare' + windDayKey(d)))(), m = d.getMonth();
  if ((m === 7 && r0 < 0.02) || (m === 8 && r0 < 0.04) || (m === 9 && r0 < 0.02)) return 'typhoon';
  if ((m === 0 && r0 < 0.03) || (m === 1 && r0 < 0.03) || (m === 11 && r0 < 0.01)) return 'blizzard';
  return null;
}
function rareBlock(kind, block) {
  if (kind === 'typhoon') return block <= 1 ? 'cloudy' : block <= 6 ? 'typhoon' : 'rain';
  if (kind === 'blizzard') return block <= 3 ? 'snow' : 'blizzard';
  return null;
}
var WX_TABLE = {
  jan: [0.65, 0.20, 0.05, 0, 0.10], feb: [0.55, 0.20, 0.10, 0, 0.15], mar: [0.45, 0.25, 0.30, 0, 0], apr: [0.45, 0.25, 0.30, 0, 0], may: [0.55, 0.25, 0.20, 0, 0],
  jun: [0.45, 0.25, 0.30, 0, 0], tsuyu: [0.20, 0.35, 0.45, 0, 0], midsummer: [0.60, 0.15, 0.10, 0.15, 0], sep: [0.40, 0.25, 0.30, 0.05, 0], oct: [0.55, 0.25, 0.20, 0, 0],
  nov: [0.65, 0.20, 0.15, 0, 0], dec: [0.65, 0.20, 0.05, 0, 0.10]
};
var WX_KINDS = ['clear', 'cloudy', 'rain', 'storm', 'snow'];
function wxRow(d) {
  var m = d.getMonth(), day = d.getDate();
  if (m === 5) return day <= 6 ? WX_TABLE.jun : WX_TABLE.tsuyu;
  if (m === 6) return day <= 19 ? WX_TABLE.tsuyu : WX_TABLE.midsummer;
  return [WX_TABLE.jan, WX_TABLE.feb, WX_TABLE.mar, WX_TABLE.apr, WX_TABLE.may, null, null, WX_TABLE.midsummer, WX_TABLE.sep, WX_TABLE.oct, WX_TABLE.nov, WX_TABLE.dec][m];
}
function wxFinal(w, d, hour) {
  if (w === 'storm' && !(hour >= 13 && hour < 20)) w = 'rain';
  if (w === 'snow' && seasonFor(d) !== 'winter') w = 'rain';
  return w;
}
function wxBlock(d, block, hour, depth) {   // d: any time on that day
  var rd = rareDay(d); if (rd) return rareBlock(rd, block);
  var seed = fnv1a('mogi-weather' + windDayKey(d) + '-' + block), rng = mulberry32(seed), r = rng(), p = rng();
  if (p < 0.5 && depth < 64) {
    var pd = d, pb = block - 1; if (pb < 0) { pd = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12); pb = 7; }
    var prev = wxBlock(pd, pb, pb * 3 + 1.5, depth + 1);
    if (prev === 'rain' || prev === 'storm') return wxFinal(prev, d, hour);
  }
  var row = wxRow(d), acc = 0, k;
  for (k = 0; k < 5; k++) { acc += row[k]; if (r < acc) break; }
  return wxFinal(WX_KINDS[Math.min(4, k)], d, hour);
}
function weatherAt(date) {
  var d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(), hour = d.getHours() + d.getMinutes() / 60;
  return wxBlock(d, Math.floor(d.getHours() / 3), hour, 0);
}
/* just after rain: this block is fair and the one before it was wet */
function afterRainAt(date) {
  var d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(), w = weatherAt(d);
  if (w !== 'clear' && w !== 'cloudy') return false;
  var pd = new Date(d.getTime() - 3 * 3600000), pw = weatherAt(pd);
  return pw === 'rain' || pw === 'storm';
}
function wxWet(w) { return w === 'rain' || w === 'storm' || w === 'typhoon'; }
function wxSnowy(w) { return w === 'snow' || w === 'blizzard'; }
function weatherInfo(date) { var d = toDate(date); if (isNaN(d.getTime())) return { w: 'clear', after: false }; return { w: weatherAt(d), after: afterRainAt(d) }; }

/* the light under a weather: overcast skies, soft shadows, a wet sheen */
var WLIGHT = {};
function weatherLight(L, w, after) {
  if ((!w || w === 'clear') && !after) return L;
  var key = L.id + '|' + w + '|' + (after ? 1 : 0); if (WLIGHT[key]) return WLIGHT[key];
  var o = {}, k; for (k in L) o[k] = L[k];
  var night = L.id === 'night', over = w === 'cloudy' || w === 'rain' || w === 'storm' || w === 'snow' || w === 'typhoon' || w === 'blizzard';
  o.weather = w; o.after = !!after; o.wet = w === 'storm' || w === 'typhoon' ? 1 : w === 'rain' ? 0.85 : after ? 0.4 : 0;
  if (over) {
    var dark = w === 'storm' ? 1 : w === 'rain' ? 0.68 : w === 'snow' ? 0.12 : 0.32;
    var grey = night ? mixc([30, 34, 48], [12, 14, 22], dark) : w === 'snow' ? [218, 222, 230] : mixc([200, 204, 210], [92, 98, 110], dark);
    o.skyTop = mixc(L.skyTop, grey, night ? 0.55 : 0.62 + 0.25 * dark); o.skyHor = mixc(L.skyHor, mixc(grey, night ? [50, 56, 76] : [232, 232, 230], 0.35), night ? 0.45 : 0.68);
    o.haze = mixc(L.haze, mixc(grey, night ? [44, 50, 70] : [222, 224, 226], 0.45), 0.55);
    o.sunc = scl(L.sunc, w === 'cloudy' ? 0.5 : w === 'snow' ? 0.45 : 0.32 - 0.08 * dark);
    o.amb = scl(L.amb, w === 'cloudy' ? 1.16 : w === 'snow' ? 1.14 : 1.1 - 0.14 * dark);
    o.shadowA = L.shadowA * (w === 'cloudy' ? 0.45 : w === 'snow' ? 0.4 : 0.2);
    o.sunGlow = 'rgba(255,250,240,' + (w === 'cloudy' ? 0.22 : 0.06) + ')';
    o.wash = ['rgba(232,236,242,0.16)', 'rgba(220,224,232,0.04)'];
    o.bloom = L.bloom * (w === 'cloudy' ? 0.75 : 0.55); o.mist = L.mist + (w === 'cloudy' ? 0.1 : 0.32); o.hazeK = L.hazeK * (1 + 0.45 * dark);
    if (w === 'rain' || w === 'storm') o.grade = (L.grade || [[255, 255, 255], [255, 255, 255], [255, 255, 255]]).map(function (c) { return mulc(c, w === 'storm' ? [0.74, 0.77, 0.84] : [0.86, 0.89, 0.93]); });
    o.foliageTint = w === 'rain' || w === 'storm' ? [0.84, 0.9, 0.92] : null;
    o.overcast = w === 'cloudy' ? 0.62 : w === 'snow' ? 0.85 : 1; o.dark = dark;
  }
  if (w === 'typhoon') { // a dim, greenish-grey half-light under low racing cloud; nobody lights the lanterns
    var tg = night ? [20, 26, 26] : [112, 124, 116];
    o.skyTop = mixc(L.skyTop, scl(tg, 0.72), 0.85); o.skyHor = mixc(L.skyHor, tg, 0.8); o.haze = mixc(L.haze, scl(tg, 1.15), 0.75);
    o.sunc = scl(L.sunc, 0.18); o.amb = mulc(L.amb, [0.92, 1.0, 0.96]); o.shadowA = L.shadowA * 0.12; o.mist = L.mist + 0.45; o.hazeK = L.hazeK * 1.9;
    o.grade = (L.grade || [[255, 255, 255], [255, 255, 255], [255, 255, 255]]).map(function (c) { return mulc(c, [0.7, 0.78, 0.74]); });
    o.foliageTint = [0.8, 0.9, 0.84]; o.lit = false; o.dark = 1.1; o.bend = 1; o.puddles = 1.7;
  }
  if (w === 'blizzard') { // whiteout: the far garden fades into blowing snow
    var wg = night ? [70, 78, 100] : [232, 234, 240];
    o.skyTop = mixc(L.skyTop, wg, 0.85); o.skyHor = mixc(L.skyHor, wg, 0.9); o.haze = mixc(L.haze, wg, 0.85); o.hazeK = L.hazeK * 2.2;
    o.sunc = scl(L.sunc, 0.3); o.amb = scl(L.amb, 1.12); o.shadowA = L.shadowA * 0.15; o.mist = L.mist + 0.5; o.bloom = L.bloom * 0.6;
    o.fog = night ? [64, 72, 96] : L.id === 'dusk' ? [214, 204, 214] : [236, 238, 244]; o.glowK = 0.45; o.bend = 0.35; o.dark = 0.2;
  }
  if (after) o.bloom = (o.bloom || L.bloom) + 0.05;
  WLIGHT[key] = o; return o;
}

/* ---- the static painting: overcast cloud, wet ground and puddles, a rain veil, the after-rain rainbow ---- */
function paintOvercast(ctx, yo, cols, A, rng, sgn) {
  var oc = LIT.overcast;
  var g = ctx.createLinearGradient(0, 0, 0, yo + 60); g.addColorStop(0, cols.mid); g.addColorStop(1, cols.lit); ctx.globalAlpha = 0.6 * oc; ctx.fillStyle = g; ctx.fillRect(0, 0, W, yo + 60); ctx.globalAlpha = 1;
  // soft stratus banks: wide, low, a little darker underneath, overlapping into one grey ceiling
  var n = Math.round(9 + 9 * oc);
  for (var i = 0; i < n; i++) {
    var cx = rng() * W * 1.2 - 0.1 * W, cy = yo + 2 + rng() * 34, w = 90 + rng() * 140, h = 4 + rng() * 6;
    [[cols.arr[0], 0, 1.05, 0.5], [cols.arr[1], -h * 0.25, 0.95, 0.55], [cols.arr[2], -h * 0.5, 0.7, 0.4]].forEach(function (L) {
      var gr = ctx.createRadialGradient(cx, cy + L[1], 0, cx, cy + L[1], w * 0.5 * L[2]); gr.addColorStop(0, L[0]); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(cx, cy + L[1]); ctx.scale(1, h / (w * 0.5)); ctx.translate(-cx, -(cy + L[1])); ctx.globalAlpha = L[3] * oc; ctx.fillStyle = gr; ctx.fillRect(cx - w, cy + L[1] - w, w * 2, w * 2); ctx.restore();
    });
  }
  ctx.globalAlpha = 1;
}
function wetGround(gx, bw, bh) { // a darker ground: rain soaks the soil and the moss
  if (!LIT.wet) return;
  gx.save(); gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-atop'; gx.fillStyle = rgb([34, 40, 48], 0.3 * LIT.wet); gx.fillRect(0, 0, bw, bh); gx.restore();
}
function paintPuddles(ctx) {
  if (!LIT.wet || sil()) return;
  var rng = mulberry32(5150), n = Math.round(12 * LIT.wet * (LIT.puddles || 1)), G = gravelInfo(F), placed = 0, sky = mixc(LIT.skyTop, LIT.skyHor, 0.55), i;
  var spots = []; (F.path ? PATH_MAIN.concat(F.teaPath ? PATH_TEA : []) : []).forEach(function (s) { spots.push([s[0] + (rng() - 0.5) * 0.9, s[1] + (rng() - 0.5) * 0.5]); });   // water gathers in the hollows by the stepping stones
  for (i = 0; i < 400 && placed < n; i++) {
    var sp = spots.length && rng() < 0.6 ? spots[(rng() * spots.length) | 0] : null, x = sp ? sp[0] : LX(-4.5 + rng() * 11), z = sp ? sp[1] : LZ(-0.3 + rng() * 8.8), r = 0.14 + rng() * 0.3;
    if (F.pond && pondSDF(x, z) < r + 0.35) continue; if (F.hill && hillH(x, z) > 0) continue;
    if ((F.gravel || F.gravelOutline) && Math.hypot((x - G.cx) / G.rx, (z - G.cz) / G.rz) < 1.15) continue;
    if (F.teahouse && x > TH.X0 - 0.6 && x < TH.X1 + 0.6 && z > TH.ZE - 0.8) continue;
    placed++;
    var pts = [], m = 14, o = rng() * 10;
    for (var k = 0; k < m; k++) { var a = k / m * TAU, rr = r * (0.75 + 0.45 * NZ.n2(Math.cos(a) * 1.3 + o, Math.sin(a) * 1.3)); pts.push(P(x + Math.cos(a) * rr * 1.3, 0.004, z + Math.sin(a) * rr * 0.8)); }
    var c = P(x, 0, z);
    poly(ctx, pts); ctx.fillStyle = 'rgba(30,32,30,0.28)'; ctx.fill();                                  // wet, dark rim of soil
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(0.82, 0.78); ctx.translate(-c.x, -c.y); poly(ctx, pts); ctx.restore();
    var gr = ctx.createLinearGradient(0, c.y - r * c.k * 0.4, 0, c.y + r * c.k * 0.4);                  // the sky, mirrored dimly in still water
    gr.addColorStop(0, rgb(scl(sky, 0.78), 0.55)); gr.addColorStop(1, rgb(scl(LIT.skyTop, 0.62), 0.5));
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = rgb(mixc(LIT.skyHor, [255, 255, 255], 0.3), 0.35); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(c.x - r * c.k * 0.5, c.y - 0.3); ctx.lineTo(c.x + r * c.k * 0.2, c.y - 0.3); ctx.stroke(); // a glint of sky
  }
}
function paintRainVeil(ctx, yo) { // slanting curtains of rain over the far hills
  if (!(LIT.wet > 0.6) || LIT.after) return;
  if (LIT.weather === 'typhoon') { // driven curtains over the far hills, soft-sided (a sheared gradient, no polygon edge)
    var tr = mulberry32(78), tc2 = mixc(LIT.haze, [255, 255, 255], 0.25);
    for (var j = 0; j < 9; j++) {
      var tx = tr() * W, tw = 30 + tr() * 60, ts = 40 * BENDS, gq = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gq.addColorStop(0, rgb(tc2, 0.2)); gq.addColorStop(0.55, rgb(tc2, 0.13)); gq.addColorStop(1, rgb(tc2, 0));
      ctx.save(); ctx.translate(tx + tw / 2 - ts / 2, yo + 45); ctx.transform(1, 0, -ts / 90, 1, 0, 0); ctx.scale(tw * 0.62, 52); ctx.fillStyle = gq; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
  }
  var rng = mulberry32(77), c = mixc(LIT.haze, [255, 255, 255], 0.2);
  for (var i = 0; i < 7; i++) {
    var x = rng() * W, w = 20 + rng() * 50, sl = 8 + rng() * 10, g = ctx.createLinearGradient(0, yo + 4, 0, yo + 80);
    g.addColorStop(0, rgb(c, 0)); g.addColorStop(0.35, rgb(c, 0.16 + 0.1 * LIT.dark)); g.addColorStop(1, rgb(c, 0.05));
    if (LIT.weather === 'typhoon') { // the same curtain, soft-sided
      var gs = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gs.addColorStop(0, rgb(c, 0.15 + 0.08 * LIT.dark)); gs.addColorStop(0.6, rgb(c, 0.08)); gs.addColorStop(1, rgb(c, 0));
      ctx.save(); ctx.translate(x + w / 2 - sl * 0.4, yo + 34); ctx.transform(1, 0, -sl / 76, 1, 0, 0); ctx.scale(w * 0.65, 46); ctx.fillStyle = gs; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); continue;
    }
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, yo + 4); ctx.lineTo(x + w, yo + 4); ctx.lineTo(x + w - sl, yo + 80); ctx.lineTo(x - sl, yo + 80); ctx.closePath(); ctx.fill();
  }
}
function paintRainbow(ctx, yo) {
  if (!(LIT.after && SEA === SEASONS.summer && LIT.id === 'day')) return;
  var cx = W * 0.2, cy = yo + 150, R = 132, cols = [[230, 70, 60], [240, 150, 60], [240, 220, 90], [110, 200, 100], [80, 140, 220], [120, 90, 200]];
  ctx.save(); ctx.lineWidth = 1.6;
  cols.forEach(function (c, i) { ctx.strokeStyle = rgb(c, 0.2); ctx.beginPath(); ctx.arc(cx, cy, R - i * 1.5, Math.PI * 1.06, Math.PI * 1.74); ctx.stroke(); });
  ctx.restore();
}

/* ---- the animation: rain streaks, splashes, ripples, drips, overflowing tsukubai, lightning, snowfall, after-rain sparkle ---- */
function weatherPoints(g) { // world points the weather plays on, computed under the scene's globals
  var o = { drips: [], stones: [], sparks: [] }, i, x;
  if (F.teahouse) for (x = TH.X0 - TH.ov * 0.8; x <= TH.X1 + TH.ov * 0.8; x += 0.38) o.drips.push([x, TH.EY - 0.02, TH.ZE - TH.ov * 0.9]);
  if (F.gate) for (x = LAY.gate.xa - 0.45; x <= LAY.gate.xb + 0.45; x += 0.34) o.drips.push([x, 2.5, LAY.fenceZ - 0.45]);
  if (F.lantern) for (i = 0; i < 6; i++) { var a = i / 6 * TAU + 0.3; o.drips.push([LAY.lantern.x + Math.cos(a) * 0.3, 1.04, LAY.lantern.z + Math.sin(a) * 0.3]); }
  if (F.wisteria) for (x = LAY.wis.x0; x <= LAY.wis.x1; x += 0.4) o.drips.push([x, LAY.wis.h, LAY.wis.z0]);
  var st = []; if (F.path) st = st.concat(PATH_MAIN); if (F.teaPath) st = st.concat(PATH_TEA); if (F.gate) st = st.concat(PATH_GATE);
  st.forEach(function (s) { o.stones.push([s[0], 0.08, s[1], s[2]]); });
  rakeRocks(F).forEach(function (r) { o.stones.push([r.x, r.r * 0.75, r.z, r.r * 0.6]); });
  var rng = mulberry32(6060);
  o.stones.forEach(function (s) { o.sparks.push([s[0] + (rng() - 0.5) * s[3], s[1] + 0.02, s[2] + (rng() - 0.5) * s[3] * 0.6]); });
  for (i = 0; i < 18; i++) o.sparks.push([LX(-4 + rng() * 10), 0.05 + rng() * 0.5, LZ(0.2 + rng() * 8)]);
  return o;
}
function makeWeatherFx(g, rng) {
  var L = g.LIT, w = L.weather || 'clear', S = { w: w, after: !!L.after, t: 0 }, i;
  if (w === 'rain' || w === 'storm' || w === 'typhoon') {
    var n = w === 'rain' ? 220 : 320; S.drops = [];
    for (i = 0; i < n; i++) S.drops.push(newDrop(g, rng, true, w));
    S.rip = []; S.spl = []; S.ripAcc = 0; S.splAcc = 0;
    S.drips = g.wp.drips.map(function (p) { return { p: p, per: 0.6 + rng() * 1.2, ph: rng() }; });
    if (w === 'storm') S.nextBolt = 5 + rng() * 12;
  }
  if (S.after) S.sparks = g.wp.sparks.map(function (p) { return { p: p, ph: rng() * TAU, w: 0.6 + rng() * 1.6 }; });
  return S;
}
function newDrop(g, rng, anywhere, w) {
  var d = Math.pow(rng(), 1.3), heavy = w === 'storm' || w === 'typhoon' ? 1.35 : 1;
  return { x: rng() * (g.W + 80) - 40, y: anywhere ? rng() * g.H : -10 - rng() * 30, d: d, sp: (230 + 300 * d) * heavy, len: (7 + 14 * d) * heavy, floor: g.horizonY - 10 + (g.H - g.horizonY + 14) * (0.15 + 0.85 * d) * (0.8 + rng() * 0.25) };
}
function stepWeatherFx(S, g, dt, t, rng, cue) {
  var Wd = g.wind || windVec({ dir: 0, strength: 0.5 }), i;
  S.t += dt;
  if (S.drops) {
    var slant = Wd.x * (0.14 + 0.32 * Wd.s) * (S.w === 'storm' ? 1.5 : S.w === 'typhoon' ? 2.6 : 1);   // a typhoon drives the rain almost sideways
    S.slant = slant;
    for (i = 0; i < S.drops.length; i++) {
      var p = S.drops[i]; p.y += p.sp * dt; p.x += p.sp * slant * dt;
      if (p.y > p.floor) { var q = newDrop(g, rng, false, S.w); q.x -= slant * (q.floor + 20); S.drops[i] = q; }
    }
    // ripples on the pond and splashes on the stones
    S.ripAcc += dt * (S.w === 'storm' ? 60 : 34);
    while (S.ripAcc > 1) { S.ripAcc--; if (g.ripplePts && g.ripplePts.length) { var rp = g.ripplePts[(rng() * g.ripplePts.length) | 0]; S.rip.push({ x: rp[0] + (rng() - 0.5) * 0.8, z: rp[1] + (rng() - 0.5) * 0.6, t0: S.t, L: 0.55 + rng() * 0.35 }); } }
    S.splAcc += dt * (S.w === 'storm' ? 26 : 15);
    while (S.splAcc > 1) { S.splAcc--; if (g.wp.stones.length) { var s = g.wp.stones[(rng() * g.wp.stones.length) | 0]; S.spl.push({ x: s[0] + (rng() - 0.5) * s[3] * 1.4, y: s[1], z: s[2] + (rng() - 0.5) * s[3] * 0.8, t0: S.t }); } }
    S.rip = S.rip.filter(function (r) { return S.t - r.t0 < r.L; }); if (S.rip.length > 80) S.rip.splice(0, S.rip.length - 80);
    S.spl = S.spl.filter(function (r) { return S.t - r.t0 < 0.22; });
  }
  if (S.w === 'storm') {
    if (!S.bolt && S.t > S.nextBolt) {
      var x0 = g.W * (0.12 + rng() * 0.76), y1 = g.horizonY - 8 - rng() * 14, pts = [[x0, -4]], y = -4, x = x0, br = null;
      while (y < y1) { y += 3 + rng() * 5; x += (rng() - 0.5) * 7; pts.push([x, Math.min(y, y1)]); if (!br && y > y1 * 0.35 && rng() < 0.35) { br = [[x, y]]; var bx = x, by = y; for (var k = 0; k < 4; k++) { by += 3 + rng() * 4; bx += (rng() - 0.3) * 8 * (rng() < 0.5 ? -1 : 1); br.push([bx, by]); } } }
      S.bolt = { t0: S.t, dur: 0.1 + rng() * 0.1, pts: pts, br: br };
      cue('thunder', { delay: Math.round((1 + rng() * 3) * 100) / 100 });
      S.nextBolt = S.t + 20 + rng() * 40;
    }
    if (S.bolt && S.t - S.bolt.t0 > S.bolt.dur + 0.25) S.bolt = null;
  }
}
function drawBoltSky(sky, S) { // the forked bolt, painted into the sky layer (cut to open sky)
  if (!S || !S.bolt) return;
  var tt = S.t - S.bolt.t0, env = tt < 0.05 ? 1 : tt < 0.08 ? 0.35 : tt < S.bolt.dur ? 0.85 : 0; if (env <= 0) return;
  sky.save(); sky.lineJoin = 'round';
  [[3.2, 'rgba(190,200,255,' + 0.35 * env + ')'], [0.9, 'rgba(255,255,255,' + env + ')']].forEach(function (st) {
    sky.strokeStyle = st[1]; sky.lineWidth = st[0]; sky.beginPath(); S.bolt.pts.forEach(function (q, j) { if (j) sky.lineTo(q[0], q[1]); else sky.moveTo(q[0], q[1]); });
    if (S.bolt.br) S.bolt.br.forEach(function (q, j) { if (j) sky.lineTo(q[0], q[1]); else sky.moveTo(q[0], q[1]); }); sky.stroke();
  });
  sky.restore();
}
function drawFlash(ctx, S, g) { // lightning lights the whole garden for a moment
  if (!S || !S.bolt) return;
  var tt = S.t - S.bolt.t0, env = tt < 0.05 ? 1 : tt < 0.08 ? 0.35 : tt < S.bolt.dur ? 0.85 : Math.max(0, 1 - (tt - S.bolt.dur) / 0.25) * 0.25;
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgb([200, 210, 255], (S.w === 'typhoon' ? 0.35 : 0.5) * env); ctx.fillRect(0, 0, g.W, g.H); ctx.globalCompositeOperation = 'source-over';
}
function drawWeatherFx(ctx, S, g) {
  var tint = g.tint, night = g.LIT.id === 'night', i;
  if (S.sparks) { // drops left on stones and leaves, catching the light
    var spr = sprite('spark'); ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < S.sparks.length; i++) { var q = S.sparks[i], s = Math.sin(S.t * q.w + q.ph), a = s > 0.6 ? (s - 0.6) / 0.4 : 0; if (a <= 0) continue; var p = P(q.p[0], q.p[1], q.p[2]); stamp(ctx, spr, p.x, p.y, 1.1 + p.k * 0.02, 0, a * (night ? 0.4 : 0.7)); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  if (!S.drops) return;
  var rc = night ? [150, 166, 204] : mixc(g.LIT.skyHor, [240, 244, 250], 0.7), sl = S.slant || 0;
  // drips from the eaves and the lantern caps
  ctx.strokeStyle = rgb(mulc(rc, [1, 1, 1]), 0.6); ctx.lineWidth = 0.45; ctx.lineCap = 'round';
  for (i = 0; i < S.drips.length; i++) {
    var dr = S.drips[i], u = ((S.t / dr.per + dr.ph) % 1) * dr.per, y0 = dr.p[1], fall = Math.sqrt(2 * y0 / 9.8);
    if (u < fall) { var yy = y0 - 4.9 * u * u, a1 = P(dr.p[0], yy + 0.05, dr.p[2]), b1 = P(dr.p[0], yy, dr.p[2]); ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y + 0.4); ctx.stroke(); }
    else if (u < fall + 0.2) { var e = (u - fall) / 0.2, c = P(dr.p[0], 0, dr.p[2]); ctx.globalAlpha = 1 - e; ctx.beginPath(); ctx.ellipse(c.x, c.y, (0.02 + e * 0.06) * c.k, (0.02 + e * 0.06) * c.k * 0.35, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  // splashes on the stones: a tiny crown of droplets
  ctx.lineWidth = 0.4;
  for (i = 0; i < S.spl.length; i++) {
    var sp = S.spl[i], e2 = (S.t - sp.t0) / 0.22, c2 = P(sp.x, sp.y, sp.z), h = 0.05 * c2.k * Math.sin(e2 * Math.PI), w2 = 0.04 * c2.k * e2;
    ctx.strokeStyle = rgb(rc, 0.55 * (1 - e2)); ctx.beginPath(); ctx.moveTo(c2.x - w2, c2.y - h); ctx.lineTo(c2.x - w2 * 0.3, c2.y); ctx.moveTo(c2.x + w2, c2.y - h); ctx.lineTo(c2.x + w2 * 0.3, c2.y); ctx.moveTo(c2.x, c2.y - h * 1.2); ctx.lineTo(c2.x, c2.y); ctx.stroke();
  }
  // the rain: thin streaks at three depths, slanted with the wind
  var B = [new Path2D(), new Path2D(), new Path2D()];
  for (i = 0; i < S.drops.length; i++) { var p2 = S.drops[i], bi = p2.d < 0.35 ? 0 : p2.d < 0.7 ? 1 : 2; B[bi].moveTo(p2.x, p2.y); B[bi].lineTo(p2.x - sl * p2.len, p2.y - p2.len); }
  [[0.35, 0.22], [0.5, 0.32], [0.7, 0.46]].forEach(function (s, k) { ctx.strokeStyle = rgb(rc, s[1] * (night ? 0.7 : 1)); ctx.lineWidth = s[0]; ctx.stroke(B[k]); });
  ctx.lineCap = 'butt';
}
function drawRainRipples(ctx, S, g) {
  if (!S || !S.rip || !S.rip.length) return;
  var night = g.LIT.id === 'night', rc = night ? [170, 186, 230] : [236, 242, 248];
  ctx.lineWidth = 0.4;
  for (var i = 0; i < S.rip.length; i++) { var r = S.rip[i], e = (S.t - r.t0) / r.L, c = P(r.x, WL, r.z), rr = (0.015 + e * 0.1) * c.k; ctx.strokeStyle = rgb(rc, 0.5 * (1 - e)); ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke(); }
}

/* ---- typhoon and blizzard, static parts ---- */
var BENDS = 0;   // the side the wind blows toward in this painting (+1 / -1); trees lean that way in a gale
function bendFor(o) { return LIT.bend && o.bend ? LIT.bend * o.bend * BENDS : 0; }
function paintDrifts(ctx) { // blizzard: snow piled on the windward side of the fence, the lantern and the rocks
  if (LIT.weather !== 'blizzard' || sil()) return;
  var col = mulc(SNOW, lightTint(1)), sh = scl(col, 0.86), rng = mulberry32(4747);
  function drift(x, z, rx, h) { var c = P(x, 0, z), t = P(x, h, z); ctx.fillStyle = rgb(sh); ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * c.k, Math.max(1, c.y - t.y) + rx * c.k * 0.18, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.ellipse(c.x - BENDS * rx * c.k * 0.15, c.y - (c.y - t.y) * 0.1, rx * c.k * 0.85, Math.max(0.8, (c.y - t.y) * 0.85), 0, Math.PI, TAU); ctx.fill(); }
  if (F.fence) for (var x = LX(-9); x < LX(10); x += 0.7) drift(x + rng() * 0.3, LAY.fenceZ - 0.25, 0.55 + rng() * 0.35, 0.25 + rng() * 0.25);
  if (F.lantern) drift(LAY.lantern.x - BENDS * 0.25, LAY.lantern.z - 0.05, 0.45, 0.22);
  rakeRocks(F).forEach(function (r) { drift(r.x - BENDS * r.r * 0.8, r.z, r.r * 0.9, r.r * 0.4); });
  if (F.path) PATH_MAIN.forEach(function (s) { drift(s[0], s[1], s[2] * 1.1, 0.08); });
}
function paintFog(ctx, bw, bh) { // blizzard whiteout: strongest far away, thinning toward the eye
  if (!LIT.fog) return;
  var yo = CAM.cy - 204, fb = P(0, 0, LAY.fenceZ).y, g = ctx.createLinearGradient(0, 0, 0, bh);
  function st(ly) { return clamp((ly) / H); }
  g.addColorStop(0, rgb(LIT.fog, 0.75)); g.addColorStop(st(fb), rgb(LIT.fog, 0.62)); g.addColorStop(st(fb + 70), rgb(LIT.fog, 0.3)); g.addColorStop(1, rgb(LIT.fog, 0.1));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, bw, bh); ctx.restore();
}

/* ---- typhoon and blizzard, animated parts ---- */
function makeGaleFx(S, g, rng) {
  var i;
  S.gale = true; S.nextGust = 2 + rng() * 4; S.gustK = 0;
  if (S.w === 'typhoon') {
    S.scud = []; for (i = 0; i < 9; i++) S.scud.push({ x: rng() * (g.W + 200) - 100, y: 4 + rng() * (g.horizonY - 20), w: 50 + rng() * 80, h: 6 + rng() * 9, sp: 0.6 + rng() * 0.8, a: 0.25 + rng() * 0.3 });
    S.sheets = []; for (i = 0; i < 4; i++) S.sheets.push({ x: rng() * g.W, w: 40 + rng() * 70, sp: 0.8 + rng() * 0.5, a: 0.06 + rng() * 0.06 });
    S.spray = []; for (i = 0; i < 5; i++) S.spray.push({ x: rng() * g.W, y: g.horizonY + 20 + rng() * (g.H - g.horizonY - 40), w: 70 + rng() * 80, sp: 0.9 + rng() * 0.6, a: 0.1 + rng() * 0.1 });
    S.debris = []; for (i = 0; i < 26; i++) S.debris.push(newDebris(g, rng, true));
    S.caps = g.ripplePts ? g.ripplePts.slice(0, 40) : [];
    S.nextBolt = 20 + rng() * 40;
  } else {
    makePowder(S, g, rng);
  }
}
function newDebris(g, rng, anywhere) {
  var sd = (g.wind || { side: 1 }).side, sum = g.season === 'summer', aut = g.season === 'autumn';
  var cols = aut ? [[176, 52, 28], [214, 120, 40], [200, 170, 60], [80, 110, 50]] : sum ? [[60, 100, 40], [90, 130, 50], [120, 150, 60]] : [[110, 120, 70], [140, 120, 80]];
  return { x: anywhere ? rng() * g.W : (sd > 0 ? -20 - rng() * 60 : g.W + 20 + rng() * 60), y: g.horizonY - 30 + rng() * (g.H - g.horizonY + 10), sp: 0.8 + rng() * 0.7, rot: rng() * TAU, rs: (rng() - 0.5) * 14, ph: rng() * TAU, twig: rng() < 0.25, sz: 0.9 + rng() * 1.2, col: cols[(rng() * cols.length) | 0] };
}
function stepGaleFx(S, g, dt, rng, cue) {
  var Wd = g.wind || windVec({ dir: 0, strength: 1 }), sd = Wd.side, i, v = (S.w === 'typhoon' ? 120 : 80) * (0.7 + 0.5 * Wd.s);
  if (!S.flakes) {
    if (S.t > S.nextGust) { S.gustT = S.t; cue('gust'); S.nextGust = S.t + 4 + rng() * 6; }
    S.gustK = S.gustT !== undefined ? Math.max(0, 1 - Math.abs(S.t - S.gustT - 1.2) / 1.6) : 0;
  } else S.gustK = galeBurstAt(S, S.t);   // a blizzard blows in bursts (see stepPowder)
  var vv = v * (1 + 0.8 * S.gustK);
  if (S.scud) {
    S.scud.forEach(function (c) { c.x += sd * vv * 0.5 * c.sp * dt; if (sd > 0 && c.x - c.w > g.W) c.x = -c.w; if (sd < 0 && c.x + c.w < 0) c.x = g.W + c.w; });
    S.sheets.forEach(function (c) { c.x += sd * vv * 1.6 * c.sp * dt; if (sd > 0 && c.x > g.W + c.w + 60) c.x = -c.w - 60; if (sd < 0 && c.x < -c.w - 60) c.x = g.W + c.w + 60; });
    S.spray.forEach(function (c) { c.x += sd * vv * 1.2 * c.sp * dt; if (sd > 0 && c.x - c.w > g.W) c.x = -c.w; if (sd < 0 && c.x + c.w < 0) c.x = g.W + c.w; });
    for (i = 0; i < S.debris.length; i++) { var d = S.debris[i]; d.x += sd * vv * 1.4 * d.sp * dt; d.y += Math.sin(S.t * 3 + d.ph) * 14 * dt + 6 * dt; d.rot += d.rs * dt; if (d.x < -40 || d.x > g.W + 40 || d.y > g.H + 10) S.debris[i] = newDebris(g, rng, false); }
    if (S.t > S.nextBolt) { S.bolt = { t0: S.t, dur: 0.12, pts: [[g.W * (0.2 + rng() * 0.6), -4]], br: null }; var b = S.bolt.pts[0]; for (var k = 0; k < 7; k++) b = [b[0] + (rng() - 0.5) * 7, b[1] + 4 + rng() * 4], S.bolt.pts.push(b); cue('thunder', { delay: Math.round((1.5 + rng() * 2.5) * 100) / 100 }); S.nextBolt = S.t + 40 + rng() * 50; }
    if (S.bolt && S.t - S.bolt.t0 > 0.4) S.bolt = null;
  }
  if (S.flakes) stepPowder(S, g, dt, rng, cue, vv / (1 + 0.8 * S.gustK));
}
function drawGaleSky(sky, S, g) { // the low cloud racing over, in the sky only
  if (!S.scud) return;
  var spr = tintedSprite(g.LIT.id === 'night' ? [14, 18, 20] : [70, 78, 76]);
  S.scud.forEach(function (c) { stamp(sky, spr, c.x, c.y, c.w, c.h, c.a * 1.6); }); sky.globalAlpha = 1;
}
function drawGaleFx(ctx, S, g) {
  var night = g.LIT.id === 'night', sd = (g.wind || { side: 1 }).side, i;
  if (S.sheets) { // sheets of rain sweeping across and spray off the ground
    var rc = night ? [120, 134, 150] : [214, 222, 226];
    S.sheets.forEach(function (c) { // a soft curtain: the gradient is sheared with the slant, so its sides fade instead of ending in an edge
      var gr = ctx.createLinearGradient(c.x - c.w, 0, c.x + c.w, 0), a2 = c.a * (1 + S.gustK); gr.addColorStop(0, rgb(rc, 0)); gr.addColorStop(0.3, rgb(rc, a2 * 0.6)); gr.addColorStop(0.5, rgb(rc, a2)); gr.addColorStop(0.7, rgb(rc, a2 * 0.6)); gr.addColorStop(1, rgb(rc, 0));
      ctx.save(); ctx.transform(1, 0, sd * 40 / g.H, 1, 0, 0); ctx.fillStyle = gr; ctx.fillRect(c.x - c.w, 0, c.w * 2, g.H); ctx.restore(); });
    var ms = tintedSprite(night ? [90, 100, 116] : [230, 234, 236]);
    S.spray.forEach(function (c) { stamp(ctx, ms, c.x, c.y, c.w, 10, c.a * (1 + S.gustK)); }); ctx.globalAlpha = 1;
    for (i = 0; i < S.debris.length; i++) { var d = S.debris[i]; ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.scale(1, 0.3 + 0.7 * Math.abs(Math.sin(d.rot * 0.7))); if (d.twig) { ctx.strokeStyle = rgb(mulc([90, 70, 52], g.tint)); ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(-d.sz * 1.4, 0); ctx.lineTo(d.sz * 1.4, 0); ctx.moveTo(0, 0); ctx.lineTo(d.sz * 0.6, -d.sz * 0.6); ctx.stroke(); } else { ctx.fillStyle = rgb(mulc(d.col, g.tint)); ctx.beginPath(); ctx.ellipse(0, 0, d.sz, d.sz * 0.5, 0, 0, TAU); ctx.fill(); } ctx.restore(); }
  }
  if (S.flakes) drawPowder(ctx, S, g);
}
function drawWhitecaps(ctx, S, g) { // a gale on the pond: wind streaks and breaking crests
  if (!S || !S.caps || !S.caps.length) return;
  var sd = (g.wind || { side: 1 }).side;
  ctx.strokeStyle = 'rgba(236,242,240,0.5)'; ctx.lineWidth = 0.45; ctx.lineCap = 'round';
  S.caps.forEach(function (q, i) { var c = P(q[0], WL, q[1]), ph = (S.t * 1.7 + i * 0.37) % 1, l = 0.18 * c.k; ctx.globalAlpha = Math.sin(ph * Math.PI) * (0.5 + 0.5 * S.gustK); ctx.beginPath(); ctx.moveTo(c.x + sd * (ph * 0.3 - 0.15) * c.k, c.y); ctx.lineTo(c.x + sd * (ph * 0.3 - 0.15) * c.k - sd * l, c.y + 0.2); ctx.stroke(); });
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}

/* ---- 08e_fireworks.js ---- */
/* ================= 花火大会: summer fireworks over the far hills =================
   fireworksAt(date): Jul 20 - Aug 31, on a Saturday or during お盆 (Aug 13-16), 19:30-20:45, and weatherAt is clear or cloudy.
   (The last Saturday of July, the 隅田川 night, is a Saturday inside that window.) The closing スターマイン starts about 20:40. */
function fireworksAt(date) {
  var d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(), m = d.getMonth(), day = d.getDate();
  if (!((m === 6 && day >= 20) || m === 7)) return false;
  if (!(d.getDay() === 6 || (m === 7 && day >= 13 && day <= 16))) return false;
  var mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  if (mins < 19 * 60 + 30 || mins > 20 * 60 + 45) return false;
  var w = weatherAt(d); return w === 'clear' || w === 'cloudy';
}
var FW_COLS = { red: [255, 86, 70], gold: [255, 196, 90], green: [110, 236, 120], silver: [236, 240, 255], purple: [190, 110, 255] };
var FW_KEYS = ['red', 'gold', 'green', 'silver', 'purple'];
function makeFireworks(g, rng) { return { shells: [], bursts: [], smoke: [], next: 1.5 + rng() * 2, inShow: 0, lull: 0, flash: 0, flashCol: [255, 220, 180], t: 0 }; }
function fwLaunch(S, g, rng, kind) {
  // aim at open sky: try a few spots and keep the one with the most sky around the break
  var best = null, bs = -1, lo = 14, hi = Math.max(lo + 6, g.horizonY - 26);
  for (var k = 0; k < 10; k++) {
    var x = g.W * (0.08 + rng() * 0.84), y = lo + rng() * (hi - lo), s = 0;
    if (g.skyOpen) for (var a = 0; a < 6; a++) s += g.skyOpen(x + Math.cos(a) * 12, y + Math.sin(a) * 8) + g.skyOpen(x, y) * 0.5; else s = 1;
    if (s > bs) { bs = s; best = [x, y]; }
  }
  var base = g.horizonY - 6;
  S.shells.push({ x: best[0], y: base, y0: base, y1: best[1], t0: S.t, dur: 1.0 + rng() * 0.6, kind: kind, col: FW_KEYS[(rng() * 5) | 0], col2: FW_KEYS[(rng() * 5) | 0], drift: (rng() - 0.5) * 6 });
}
function fwBurst(S, sh, rng, cue) {
  var k = sh.kind, n = k === 'kiku' ? 70 : k === 'botan' ? 60 : k === 'yanagi' ? 46 : k === 'senrin' ? 0 : 30, R = k === 'small' ? 12 + rng() * 6 : k === 'senrin' ? 0 : 20 + rng() * 14, stars = [];
  for (var i = 0; i < n; i++) { var a = rng() * TAU, ph = Math.acos(2 * rng() - 1), r = Math.sin(ph); stars.push({ vx: Math.cos(a) * r, vy: Math.sin(a) * r }); }
  var b = { x: sh.x, y: sh.y, t0: S.t, kind: k, col: k === 'yanagi' ? 'gold' : sh.col, col2: sh.col2, R: R, stars: stars, life: k === 'yanagi' ? 3.6 : k === 'kiku' ? 2.4 : k === 'botan' ? 1.7 : 1.4 };
  if (k === 'senrin') { b.subs = []; for (var j = 0; j < 9; j++) b.subs.push({ dx: (rng() - 0.5) * 34, dy: (rng() - 0.5) * 22, t: 0.35 + rng() * 0.6, col: FW_KEYS[(rng() * 5) | 0] }); b.life = 2.0; }
  S.bursts.push(b);
  var size = k === 'small' ? 0.35 : k === 'senrin' ? 0.6 : Math.min(1, R / 36);
  S.flash = Math.max(S.flash, 0.5 + size * 0.5); S.flashCol = FW_COLS[b.col];
  S.smoke.push({ x: b.x, y: b.y, r: Math.max(8, R * 0.7), t0: S.t, L: 10 + rng() * 6 });
  cue('firework', { delay: Math.round((2 + rng() * 2) * 100) / 100, size: Math.round(size * 100) / 100 });
}
function stepFireworks(S, g, dt, rng, cue, finale) {
  S.t += dt; S.flash = Math.max(0, S.flash - dt * 2.6);
  if (S.t > S.next) {
    if (finale) { // スターマイン: a rapid flurry of mixed shells
      var kinds = ['kiku', 'botan', 'small', 'botan', 'kiku', 'yanagi'];
      fwLaunch(S, g, rng, kinds[(rng() * kinds.length) | 0]); S.next = S.t + 0.12 + rng() * 0.3;
    } else {
      var r = rng(), kind = r < 0.34 ? 'kiku' : r < 0.58 ? 'botan' : r < 0.78 ? 'yanagi' : r < 0.87 ? 'senrin' : 'small';
      fwLaunch(S, g, rng, kind); if (rng() < 0.18) fwLaunch(S, g, rng, 'small');
      S.inShow++;
      if (S.inShow > 6 + rng() * 6) { S.inShow = 0; S.next = S.t + 8 + rng() * 8; } // a lull
      else S.next = S.t + 1.0 + rng() * 2.8;
    }
  }
  var Wd = g.wind || windVec({ dir: 0, strength: 0.4 });
  for (var i = S.shells.length - 1; i >= 0; i--) { var sh = S.shells[i], u = (S.t - sh.t0) / sh.dur; if (u >= 1) { fwBurst(S, sh, rng, cue); S.shells.splice(i, 1); continue; } var e = 1 - Math.pow(1 - u, 2); sh.y = lerp(sh.y0, sh.y1, e); sh.x += sh.drift * dt; }
  S.bursts = S.bursts.filter(function (b) { return S.t - b.t0 < b.life + 0.4; });
  S.smoke.forEach(function (s) { s.x += Wd.x * (3 + 9 * Wd.s) * dt; s.y += Wd.y * 2 * dt - 0.4 * dt; s.r += 1.6 * dt; });   // smoke drifts with the wind
  S.smoke = S.smoke.filter(function (s) { return S.t - s.t0 < s.L; });
}
function fwStarPos(b, s, t, R, grav) { var ex = 1 - Math.exp(-t * 3.2); return [b.x + s.vx * R * ex, b.y + s.vy * R * ex * 0.95 + grav * t * t]; }
function drawFireworks(sky, S, g) {
  var i, night = g.LIT.id === 'night', dayK = night ? 1 : g.LIT.id === 'dusk' ? 0.8 : 0.45;
  // smoke, faintly lit by the bursts
  var sm = tintedSprite(night ? [70, 66, 72] : [200, 196, 196]);
  S.smoke.forEach(function (s) { var a = (S.t - s.t0) / s.L; stamp(sky, sm, s.x, s.y, s.r, s.r * 0.6, (0.22 + 0.25 * S.flash) * Math.sin(Math.min(1, a * 4) * Math.PI / 2) * (1 - a)); });
  sky.globalAlpha = 1;
  if (S.flash > 0.01) { sky.fillStyle = rgb(S.flashCol, 0.1 * S.flash * dayK); sky.fillRect(0, 0, g.W, g.H); }   // the sky lights up
  sky.globalCompositeOperation = 'lighter'; sky.lineCap = 'round';
  var spr = sprite('spark');
  for (i = 0; i < S.shells.length; i++) { // rising comets with a trail of sparks
    var sh = S.shells[i]; stamp(sky, spr, sh.x, sh.y, 2.2, 0, 0.9 * dayK);
    sky.strokeStyle = 'rgba(255,214,150,' + (0.45 * dayK) + ')'; sky.lineWidth = 0.6; sky.beginPath(); sky.moveTo(sh.x, sh.y); sky.lineTo(sh.x - sh.drift * 0.1, sh.y + 9); sky.stroke();
  }
  var paths = {}; FW_KEYS.forEach(function (k) { paths[k] = [new Path2D(), new Path2D(), new Path2D()]; });
  var dots = {}; FW_KEYS.forEach(function (k) { dots[k] = [new Path2D(), new Path2D(), new Path2D()]; });
  for (i = 0; i < S.bursts.length; i++) {
    var b = S.bursts[i], t = S.t - b.t0, life = b.life;
    if (t < 0.25) stamp(sky, spr, b.x, b.y, (b.R || 16) * 0.9, 0, (1 - t / 0.25) * 0.9 * dayK);   // the bright core of the break
    if (b.subs) { b.subs.forEach(function (s2) { var tt = t - s2.t; if (tt < 0 || tt > 0.9) return; for (var q = 0; q < 10; q++) { var a = q / 10 * TAU, ex = (1 - Math.exp(-tt * 5)) * 6, al = 1 - tt / 0.9; dots[s2.col][al > 0.66 ? 2 : al > 0.33 ? 1 : 0].moveTo(b.x + s2.dx + Math.cos(a) * ex + 0.7, b.y + s2.dy + Math.sin(a) * ex + tt * tt * 6); dots[s2.col][al > 0.66 ? 2 : al > 0.33 ? 1 : 0].arc(b.x + s2.dx + Math.cos(a) * ex, b.y + s2.dy + Math.sin(a) * ex + tt * tt * 6, 0.7, 0, TAU); } }); continue; }
    var fade = clamp(1 - t / life), lv = fade > 0.66 ? 2 : fade > 0.33 ? 1 : 0, grav = b.kind === 'yanagi' ? 7 : 4.5, col = b.kind === 'kiku' && t > life * 0.6 ? b.col2 : b.col;
    if (fade <= 0) continue;
    for (var s = 0; s < b.stars.length; s++) {
      var st = b.stars[s], p1 = fwStarPos(b, st, t, b.R, grav);
      if (b.kind === 'botan' || b.kind === 'small') { if (b.kind === 'small' && ((s + Math.floor(t * 20)) % 3 === 0)) continue; var pd = dots[col][lv]; pd.moveTo(p1[0] + 1.1, p1[1]); pd.arc(p1[0], p1[1], 1.1, 0, TAU); }
      else { // a tail that follows the star's own curved path and fades behind it, with a bright head
        var tl = b.kind === 'yanagi' ? Math.min(1.1, t) : Math.min(0.3, t), M = 4, prev = p1;
        for (var m = 1; m <= M; m++) { var q = fwStarPos(b, st, Math.max(0, t - tl * m / M), b.R, grav), lvm = Math.max(0, Math.min(2, Math.round(fade * 2.4 * (1 - (m - 1) / M) - 0.2))); paths[col][lvm].moveTo(prev[0], prev[1]); paths[col][lvm].lineTo(q[0], q[1]); prev = q; }
        if (b.kind === 'kiku' && fade > 0.25) { var hd = dots[col][2]; hd.moveTo(p1[0] + 0.8, p1[1]); hd.arc(p1[0], p1[1], 0.8, 0, TAU); }
        else if (b.kind === 'yanagi' && ((s + Math.floor(t * 14)) % 4 === 0)) { var gl = dots.gold[lv]; gl.moveTo(p1[0] + 0.6, p1[1]); gl.arc(p1[0], p1[1], 0.6, 0, TAU); } // glitter on the willow
      }
    }
  }
  var al = [0.3, 0.6, 0.95];
  FW_KEYS.forEach(function (k) { for (var l = 0; l < 3; l++) { var c = FW_COLS[k]; sky.strokeStyle = rgb(c, al[l] * dayK); sky.lineWidth = 0.6; sky.stroke(paths[k][l]); sky.fillStyle = rgb(c, al[l] * dayK); sky.fill(dots[k][l]); } });
  sky.globalCompositeOperation = 'source-over'; sky.globalAlpha = 1; sky.lineCap = 'butt';
}
function drawFireworkPond(ctx, S, g) { // the bursts tint the pond
  if (!S || S.flash < 0.02) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgb(S.flashCol, 0.16 * S.flash); ctx.fillRect(0, 0, g.W, g.H); ctx.globalCompositeOperation = 'source-over';
}
function paintFireworkHaze(ctx, yo) { // the only trace in the cached painting: a little smoke haze over the night sky
  ctx.save(); var g = ctx.createLinearGradient(0, yo + 4, 0, yo + 60); g.addColorStop(0, 'rgba(120,110,120,0)'); g.addColorStop(0.6, 'rgba(120,110,120,0.12)'); g.addColorStop(1, 'rgba(120,110,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, yo, W, 60); ctx.restore();
}

/* ---- 08f_touch.js ---- */
/* ================= things to touch: controller.tap(nx, ny) =================
   The tap is hit-tested against what exists at this stage (generous, finger-sized areas), answered with a small,
   natural animation on the overlay, and a sound cue. */
BIRDS.sparrow = { L: 0.28, back: [122, 86, 58], head: [104, 66, 46], belly: [214, 204, 186], face: [236, 232, 222], tail: [96, 70, 50], wing: [104, 74, 52] };
var SAKURA_LEAF = null;
function sakuraLeafPath() { // a pointed oval on a short stalk, stalk toward +y, unit length
  if (SAKURA_LEAF) return SAKURA_LEAF;
  var p = new Path2D(); p.moveTo(0, 0.62); p.lineTo(0, 0.42); p.quadraticCurveTo(-0.42, 0.25, -0.3, -0.18); p.quadraticCurveTo(-0.2, -0.45, 0, -0.62); p.quadraticCurveTo(0.2, -0.45, 0.3, -0.18); p.quadraticCurveTo(0.42, 0.25, 0.02, 0.42); p.lineTo(0.02, 0.62); p.closePath();
  SAKURA_LEAF = p; return p;
}
function hitTargets(g) { // screen-space hit areas, computed under the scene's globals (logical units)
  var T = [], F0 = g.F, i;
  function add(id, x, y, r, extra) { var o = { id: id, x: clamp(x, 2, W - 2), y: clamp(y, 2, H - 2), r: r }; /* a crown cut by the frame: aim at the part that shows */ if (extra) for (var k in extra) o[k] = extra[k]; T.push(o); }
  function boxAt(id, x0, x1, y0, y1, z, extra) { var a = P(x0, y0, z), b = P(x1, y1, z); add(id, (a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 2 + 4, extra); }
  if (F0.shishi) { var s = LAY.shishi; boxAt('shishi', s.x - 1.03, s.x + 0.37, 0, 1.0, s.z, { pri: 3 }); }
  if (F0.tsukubai) { var t = LAY.tsukubai; boxAt('tsukubai', t.x - 0.8, t.x + 0.65, -0.1, 0.7, t.z, { pri: 3 }); }
  if (F0.lantern) boxAt('lantern', LAY.lantern.x - 0.38, LAY.lantern.x + 0.38, 0.1, 1.6, LAY.lantern.z, { pri: 3 });
  if (F0.wisteria) { var w = LAY.wis; boxAt('fuji', w.x0, w.x1, w.h - 1.6, w.h + 0.1, (w.z0 + w.z1) / 2, { pri: 2 }); }
  if (F0.bridge) boxAt('bridge', BRIDGE.x0 + 0.3, BRIDGE.x1 - 0.3, 0.2, 1.0, BRIDGE.zc, { pri: 2, perch: [(BRIDGE.x0 + BRIDGE.x1) / 2, 0.92, BRIDGE.zc - 0.35] });
  var st = []; if (F0.path) st = st.concat(PATH_MAIN.slice(0, F0.bridge ? 9 : 8)); /* the stones that are laid, as buildScene */ if (F0.teaPath) st = st.concat(PATH_TEA); if (F0.gate) st = st.concat(PATH_GATE);
  st.forEach(function (q) { var p = P(q[0], 0.08, q[1]); add('stone', p.x, p.y, Math.max(6, q[2] * p.k * 1.1), { pri: 1, perch: [q[0], 0.08, q[1]] }); });
  function tree(cx, cy, cz, R, kind, tag) { var p = P(cx, cy, cz); add('tree', p.x, p.y, R * p.k + 3, { pri: 1, kind: kind, c: [cx, cy, cz], R: R, tag: tag }); }
  if (F0.maple > 0.15) { var mh = lerp(0.75, 4.7, Math.min(1, F0.maple)); tree(LAY.maple.x + 0.3 + 0.6 * clamp(F0.maple * 2 - 1), mh * 0.62, LAY.maple.z, mh * 0.55, 'maple', 'maple'); }
  if (F0.ycherry > 0.3) { var ch = 4.7 * F0.ycherry * 0.82; tree(LAY.ycherry.x + 0.3, ch * 0.88, LAY.ycherry.z, ch * 0.42, 'sakura', 'ycherry'); /* its lower crown is behind the maple */ }
  if (F0.cherry) tree(LAY.cherry.x, hillH(LAY.cherry.x, LAY.cherry.z) + 2.2, LAY.cherry.z, 1.9, 'sakura', 'cherry');
  if (F0.pine > 0.1) { var S = lerp(0.24, 0.92, Math.min(1, F0.pine)); tree(LAY.pine.x - 0.75 * S, 1.3 * S, LAY.pine.z + 0.3 * S, 1.2 * S + 0.3, 'pine', 'pine'); }
  return T;
}
function rareStartle(a) { // the visitor notices you and leaves the way it would
  var id = a.id, T = a.T;
  var exits = { ooruri: T - 3, rurubitaki: T - 3, kawasemi: T - 2.5, uguisu: T - 0.8, usagi: 11, kitsune: 12, tanuki: 14, shika: 15.2, sagi: T - 4, hotaru: T - 3, tsuru: T - 4.5 };
  if (id === 'mejiro') { a.t = Math.max(a.t, a.pts.length * 2.2 + 1.5); return; }
  if (id === 'shika' && a.t < 7) { a.t = 9.5; return; }    // the stag stops and looks up first
  if (exits[id] !== undefined) a.t = Math.max(a.t, exits[id]);
  if (id === 'usagi') a.T = Math.min(a.T, a.t + 4);          // the hare bolts
}
function koiPose(k, t, g) { // where a koi is: on its path, or gathering where food was dropped
  var q = pathAt(k.path, koiS(k, t)), f = g.feed;
  if (!f) return q;
  var u = t - f.t0, w = clamp(u / 2.2) * clamp((f.dur - u) / 2.0); if (w <= 0) return q;
  var w2 = w * w * (3 - 2 * w), a = k.ph + t * 0.5, tx = f.x + Math.cos(a) * k.fr, tz = f.z + Math.sin(a) * k.fr * 0.7;
  var x = lerp(q.x, tx, w2), z = lerp(q.z, tz, w2), dx = lerp(q.dx, -Math.sin(a), w2), dz = lerp(q.dz, Math.cos(a) * 0.7, w2), dl = Math.hypot(dx, dz) || 1;
  if (pondBase(x, z) > -0.12) return q;                       // never beach a fish
  return { x: x, z: z, dx: dx / dl, dz: dz / dl };
}
function startTap(hit, g, t, rng, cue, rare) {
  var o = { kind: hit.id, t0: t, x: hit.x, y: hit.y }, i;
  switch (hit.id) {
    case 'koi':
      g.feed = { x: hit.w[0], z: hit.w[1], t0: t, dur: 6.5 + rng() * 1.5 };
      (g.koi || []).forEach(function (k) { k.fr = 0.22 + rng() * 0.3; });
      o.pellets = []; for (i = 0; i < 5; i++) o.pellets.push({ x: hit.w[0] + (rng() - 0.5) * 0.3, z: hit.w[1] + (rng() - 0.5) * 0.22, d: rng() * 0.3 });
      o.nibbles = [2.4, 3.3, 4.4, 5.6].map(function (s) { return s + rng() * 0.5; }); o.dur = g.feed.dur; cue('splash'); break;
    case 'water': o.w = hit.w; o.dur = 2.4; cue('drip'); break;
    case 'shishi': g.shPh = (7.45 - (t % 9.2) + 9.2) % 9.2; o.dur = 0.1; break;   // tip it now; the knock follows
    case 'tsukubai': o.dur = 4.2; o.poured = false; break;
    case 'lantern':
      o.lit = !!g.LIT.lit; o.dur = o.lit ? 1.6 : 2.6; o.top = [LAY.lantern.x, 1.45, LAY.lantern.z]; o.dir = rng() < 0.5 ? 1 : -1;
      if (!o.lit) cue('birdtap'); else cue('lantern'); break;
    case 'tree':
      o.c = hit.c; o.R = hit.R; o.tk = hit.kind; o.dur = 4.5; o.parts = [];
      // what comes down depends on the tree and the season: petals only from a sakura in bloom
      var sea = g.season, sk = g.sak, kd = hit.kind, mode;
      if (sea === 'winter') mode = 'snow';
      else if (kd === 'pine') mode = sea === 'autumn' ? 'needle' : 'none';
      else if (kd === 'sakura') mode = sea === 'spring' ? (sk && sk.bloom > 0.1 ? 'petal' : sk && sk.leaf > 0.25 ? 'sgreen' : 'none') : sea === 'summer' ? 'sgreen' : 'sleaf';
      else mode = sea === 'autumn' ? 'leaf' : 'green';
      var TAPCOL = { leaf: LEAF_COLS.momiji, sleaf: [[176, 52, 32], [206, 84, 38], [222, 126, 50], [196, 150, 66]], green: sea === 'spring' ? [[132, 176, 70], [112, 160, 60]] : [[62, 108, 40], [80, 126, 48]], sgreen: [[70, 118, 46], [88, 136, 54]], needle: [[150, 112, 60], [124, 98, 52], [110, 112, 56]], petal: [[250, 214, 226], [246, 226, 234]], snow: [[250, 252, 255]] };
      o.mode = mode; var n = { petal: 26, leaf: 14, sleaf: 10, green: 3, sgreen: 3, needle: 4, snow: 10, none: 0 }[mode], c = P(hit.c[0], hit.c[1], hit.c[2]), cols = TAPCOL[mode] || [[0, 0, 0]];
      for (i = 0; i < n; i++) o.parts.push({ x: c.x + (rng() - 0.5) * hit.R * c.k * 1.4, y: c.y + (rng() - 0.6) * hit.R * c.k * 0.8, vy: (mode === 'needle' ? 10 : 6) + rng() * 6, vx: (rng() - 0.5) * 3, ph: rng() * TAU, rot: rng() * TAU, sz: mode === 'petal' ? 1 + rng() * 0.6 : mode === 'sleaf' || mode === 'sgreen' ? 1.5 + rng() * 0.7 : 1.4 + rng() * 0.8, d: rng() * (n < 5 ? 1.2 : 0.6), floor: c.y + hit.R * c.k * (1.1 + rng() * 0.8), col: cols[(rng() * cols.length) | 0] });
      cue('gust'); break;
    case 'fuji': o.dur = 4.5; o.bees = []; for (i = 0; i < 3; i++) o.bees.push({ ph: rng() * TAU, w: 1.5 + rng(), r: 6 + rng() * 6, dx: (rng() - 0.5) * 30 }); cue('bees'); break;
    case 'bridge': case 'stone': o.perch = hit.perch; o.dur = 4.2; o.dir = rng() < 0.5 ? 1 : -1; cue('birdtap'); break;
    case 'rare': if (rare) { rareStartle(rare); cue(rare.id === 'usagi' || rare.id === 'kitsune' || rare.id === 'tanuki' || rare.id === 'shika' ? 'startle' : 'birdtap', { id: rare.id }); } o.dur = 0.1; break;
  }
  return o;
}
function stepTaps(list, g, dt, t, rng, cue) {
  for (var i = list.length - 1; i >= 0; i--) {
    var o = list[i], u = t - o.t0;
    if (o.kind === 'koi') { while (o.nibbles.length && u > o.nibbles[0]) { o.nibbles.shift(); g.splashes = g.splashes || []; g.splashes.push({ x: g.feed.x + (rng() - 0.5) * 0.3, z: g.feed.z + (rng() - 0.5) * 0.2, t0: t }); cue('splash'); } }
    if (o.kind === 'tsukubai' && !o.poured && u > 1.5) { o.poured = true; g.overflowT = t + 0.6; cue('drip'); }
    if (o.parts) o.parts.forEach(function (p) { if (u < p.d) return; var Wd = g.wind || { x: 1, s: 0.5 }; p.ph += dt * 2; if (p.y < p.floor) { p.x += (p.vx + Wd.x * (3 + 6 * Wd.s) * (1 + 0.5 * Math.sin(p.ph))) * dt; p.y += p.vy * dt * (o.mode === 'snow' ? 2.2 : 0.8 + 0.3 * Math.abs(Math.cos(p.ph))); p.rot += dt * (o.mode === 'leaf' || o.mode === 'sleaf' ? 0.8 : o.mode === 'needle' ? 3 : 2); } });
    if (u > o.dur) { if (o.kind === 'koi' && g.feed && t - g.feed.t0 > g.feed.dur) g.feed = null; list.splice(i, 1); }
  }
}
function drawTapsWater(ctx, list, g, t) { // pellets and rings on the water
  list.forEach(function (o) {
    var u = t - o.t0, c;
    if (o.kind === 'koi') o.pellets.forEach(function (p) {
      var pu = u - p.d; if (pu < 0) return; c = P(p.x, WL, p.z);
      if (pu < 1.2) { var rr = (0.02 + pu * 0.1) * c.k; ctx.strokeStyle = 'rgba(236,244,246,' + (0.55 * (1 - pu / 1.2)) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * g.cam.s, 0, 0, TAU); ctx.stroke(); }
      if (pu < o.dur - 2.5) { ctx.fillStyle = rgb(mulc([150, 112, 70], g.tint)); ctx.beginPath(); ctx.arc(c.x + Math.sin(t + p.d * 9) * 0.3, c.y, Math.max(0.4, 0.02 * c.k), 0, TAU); ctx.fill(); }
    });
    if (o.kind === 'water') { c = P(o.w[0], WL, o.w[1]); for (var r = 0; r < 3; r++) { var a = u - r * 0.3; if (a < 0) continue; var rr2 = (0.03 + a * 0.2) * c.k; ctx.strokeStyle = 'rgba(236,244,246,' + Math.max(0, 0.55 * (1 - a / 2)) + ')'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.ellipse(c.x, c.y, rr2, rr2 * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke(); } }
  });
}
function drawTaps(ctx, list, g, t) {
  var tint = g.tint;
  list.forEach(function (o) {
    var u = t - o.t0, i;
    if (o.kind === 'tree') { // what comes down from the tree (the crown's own sway is drawn by the sway layer, 08g_sway.js)
      if (o.mode === 'snow' && u < 1.2) { var c = P(o.c[0], o.c[1] + o.R * 0.5, o.c[2]); stamp(ctx, sprite('soft'), c.x, c.y + u * 8, 6 + u * 10, 4 + u * 6, 0.6 * (1 - u / 1.2)); ctx.globalAlpha = 1; }
      o.parts.forEach(function (p) {
        if (u < p.d) return; var fade = Math.min(1, (o.dur - u) / 1.2); if (fade <= 0) return; ctx.globalAlpha = fade * 0.95;
        var flip = Math.max(0.2, Math.abs(Math.cos(p.ph * 0.5)));
        if (o.mode === 'leaf' || o.mode === 'green') leafAt(ctx, 'momiji', p.x, p.y, p.sz, p.rot, flip, rgb(mulc(p.col, tint)));
        else if (o.mode === 'sleaf' || o.mode === 'sgreen') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.sz, p.sz * flip); ctx.fillStyle = rgb(mulc(p.col, tint)); ctx.fill(sakuraLeafPath()); ctx.strokeStyle = 'rgba(60,30,14,0.35)'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(0, 0.55); ctx.lineTo(0, -0.5); ctx.stroke(); ctx.restore(); }
        else if (o.mode === 'needle') { ctx.strokeStyle = rgb(mulc(p.col, tint)); ctx.lineWidth = 0.28; ctx.beginPath(); var ca = Math.cos(p.rot), sa = Math.sin(p.rot), L2 = p.sz * 1.3; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + ca * L2, p.y + sa * L2 * flip); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.rot + 0.35) * L2, p.y + Math.sin(p.rot + 0.35) * L2 * flip); ctx.stroke(); }
        else if (o.mode === 'snow') { ctx.fillStyle = rgb(mulc([250, 252, 255], tint.map(function (v) { return Math.max(0.8, v); }))); ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * 0.6, 0, TAU); ctx.fill(); }
        else if (o.mode === 'petal') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.sz, p.sz * Math.max(0.2, Math.abs(Math.cos(p.ph)))); ctx.fillStyle = rgb(mulc(p.col, tint)); ctx.beginPath(); ctx.moveTo(0.9, 0); ctx.quadraticCurveTo(0.2, -0.75, -0.75, -0.18); ctx.lineTo(-0.5, 0); ctx.lineTo(-0.75, 0.18); ctx.quadraticCurveTo(0.2, 0.75, 0.9, 0); ctx.fill(); ctx.restore(); }
      });
      ctx.globalAlpha = 1;
    }
    if (o.kind === 'fuji' && g.img) { // the racemes swing, and bees work the flowers
      var w = LAY.wis, a = P(w.x0 - 0.2, w.h + 0.1, w.z0), bb = P(w.x1 + 0.2, w.h - 1.0, w.z0), kk = g.img.width / g.W, sw = Math.sin(u * 3.2) * Math.exp(-u * 0.7) * 1.2;
      // the racemes hang from the trellis: the swing grows downward from it, and the piece fades out at its sides and foot (no edge to see)
      var fw = bb.x - a.x, fh = bb.y - a.y;
      if (!o.fp) { var fc = mkCanvas(Math.max(1, Math.round(fw * kk)), Math.max(1, Math.round(fh * kk))), fx = fc.getContext('2d'); fx.drawImage(g.img, a.x * kk, a.y * kk, fw * kk, fh * kk, 0, 0, fc.width, fc.height); fx.globalCompositeOperation = 'destination-in';
        var gx = fx.createLinearGradient(0, 0, fc.width, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.12, 'rgba(0,0,0,1)'); gx.addColorStop(0.88, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = gx; fx.fillRect(0, 0, fc.width, fc.height);
        var gy = fx.createLinearGradient(0, 0, 0, fc.height); gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(0.7, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = gy; fx.fillRect(0, 0, fc.width, fc.height); o.fp = fc; }
      if (Math.abs(sw) > 0.03) for (var bnd = 0; bnd < 6; bnd++) {
        var y0b = bnd / 6 * fh, y1b = (bnd + 1) / 6 * fh, d0 = sw * Math.pow(bnd / 6, 1.3), d1 = sw * Math.pow((bnd + 1) / 6, 1.3), shr = (d1 - d0) / (y1b - y0b);
        ctx.save(); ctx.transform(1, 0, shr, 1, d0 - shr * (a.y + y0b), 0); ctx.drawImage(o.fp, 0, y0b / fh * o.fp.height, o.fp.width, (y1b - y0b) / fh * o.fp.height, a.x, a.y + y0b, fw, y1b - y0b); ctx.restore();
      }
      var cc = P((w.x0 + w.x1) / 2, w.h - 0.45, w.z0), fade2 = Math.min(1, u / 0.4, (o.dur - u) / 0.6);
      o.bees.forEach(function (be) { var bx = cc.x + be.dx + Math.sin(u * be.w * 2 + be.ph) * be.r, by = cc.y + Math.sin(u * be.w * 3.1 + be.ph) * be.r * 0.4; ctx.globalAlpha = fade2; ctx.fillStyle = 'rgba(240,240,250,0.6)'; ctx.beginPath(); ctx.ellipse(bx, by - 0.6, 0.7, 0.35, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc([214, 168, 40], tint)); ctx.beginPath(); ctx.ellipse(bx, by, 0.8, 0.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgb(30,26,20)'; ctx.fillRect(bx - 0.15, by - 0.5, 0.3, 1); });
      ctx.globalAlpha = 1;
    }
    if (o.kind === 'lantern') {
      if (o.lit) { var lp = P(LAY.lantern.x, 1.27, LAY.lantern.z), e = Math.sin(clamp(u / o.dur) * Math.PI); ctx.globalCompositeOperation = 'lighter'; stamp(ctx, sprite('warm'), lp.x, lp.y, 10 + 8 * e, 10 + 8 * e, 0.55 * e * (0.8 + 0.2 * Math.sin(u * 30))); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      else { var fu = clamp(u / 2.2), fp = arcPos(o.top, [o.top[0] + o.dir * 4, o.top[1] + 2.2, o.top[2] + 1.2], fu * fu, 0.4); if (u < 2.4) bird(ctx, g, 'sparrow', fp[0], fp[1], fp[2], o.dir, u < 0.25 ? 'perch' : 'fly', u * 30); }
    }
    if (o.kind === 'tsukubai') { // the bamboo ladle dips, fills, and pours back over the basin
      var tg = tsukubaiGeom(), B = tg.basin, dip = u < 0.9 ? u / 0.9 : u < 1.4 ? 1 : u < 2.6 ? 1 - (u - 1.4) / 1.2 * 0.45 : 0.55, tilt = u > 1.6 && u < 3.0 ? Math.sin((u - 1.6) / 1.4 * Math.PI) : 0, fade3 = Math.min(1, u / 0.3, (o.dur - u) / 0.5);
      var cup = [B[0] + 0.04, B[1] + 0.32 - 0.3 * dip, B[2] - 0.02], hand = [cup[0] + 0.55, cup[1] + 0.35, cup[2] - 0.12], cp = Pa(cup), hp = Pa(hand);
      ctx.globalAlpha = fade3; ctx.strokeStyle = rgb(mulc([176, 156, 100], tint)); ctx.lineWidth = Math.max(0.7, 0.028 * cp.k); ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(hp.x, hp.y); ctx.stroke();
      ctx.save(); ctx.translate(cp.x, cp.y); ctx.rotate(-tilt * 1.1); ctx.fillStyle = rgb(mulc([196, 176, 112], tint)); ctx.fillRect(-0.06 * cp.k, -0.04 * cp.k, 0.12 * cp.k, 0.09 * cp.k); ctx.fillStyle = rgb(mulc([150, 130, 80], tint)); ctx.fillRect(-0.06 * cp.k, -0.04 * cp.k, 0.12 * cp.k, 0.02 * cp.k); ctx.restore();
      if (tilt > 0.2) { ctx.strokeStyle = 'rgba(226,240,246,0.7)'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(cp.x - 0.04 * cp.k, cp.y); ctx.quadraticCurveTo(cp.x - 0.07 * cp.k, cp.y + 0.05 * cp.k, cp.x - 0.06 * cp.k, Pa([B[0], B[1], B[2]]).y); ctx.stroke(); }
      if (u > 1.0 && u < 3.6) { var bc = Pa(B); for (i = 0; i < 2; i++) { var ra = ((u - 1.0) * 0.9 + i * 0.5) % 1, rr3 = (0.02 + ra * 0.1) * bc.k; ctx.strokeStyle = 'rgba(230,240,246,' + (0.5 * (1 - ra)) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(bc.x, bc.y, rr3, rr3 * 0.42, 0, 0, TAU); ctx.stroke(); } }
      ctx.globalAlpha = 1;
    }
    if (o.kind === 'bridge' || o.kind === 'stone') { // a sparrow drops in, hops twice, and is off
      var pr = o.perch, x, y, z, pose = 'perch';
      if (u < 0.8) { var e1 = u / 0.8, q1 = arcPos([pr[0] - o.dir * 2.5, pr[1] + 1.6, pr[2] + 0.6], pr, e1 * (2 - e1), 0.2); x = q1[0]; y = q1[1]; z = q1[2]; pose = 'fly'; }
      else if (u < 3.0) { var hu = (u - 0.8) / 2.2, hop = Math.floor(hu * 3), hf = hu * 3 - hop; x = pr[0] + o.dir * hop * 0.12 + (hf > 0.6 ? o.dir * (hf - 0.6) / 0.4 * 0.12 : 0); y = pr[1] + (hf > 0.6 ? Math.sin((hf - 0.6) / 0.4 * Math.PI) * 0.06 : 0); z = pr[2]; }
      else { var e2 = (u - 3.0) / 1.2, q2 = arcPos([pr[0] + o.dir * 0.36, pr[1], pr[2]], [pr[0] + o.dir * 4, pr[1] + 2.4, pr[2] + 1], e2 * e2, 0.3); x = q2[0]; y = q2[1]; z = q2[2]; pose = 'fly'; }
      if (u < o.dur) bird(ctx, g, 'sparrow', x, y, z, o.dir, pose, u * (pose === 'fly' ? 32 : 5));
    }
  });
}

/* ---- 08g_sway.js ---- */
/* ================= wind sway: tree crowns that move with the wind (and when tapped) =================
   Paint time (swayMasks): every swaying object (o.sway in buildScene) gets two small coverage masks, taken from a
   silhouette pass drawn front to back: C = the object itself, F = everything standing in front of it.
   Run time: each tree becomes three pieces cut from the finished painting, at the overlay's resolution:
     plate  - the painting with the crown taken out and the hole filled from the surroundings (push-pull fill),
     sprite - the crown itself (what of it is visible), drawn in horizontal bands, each sheared, so the bend is
              rooted at the trunk base and grows toward the top (continuous: no seams between bands),
     front  - what stands in front of the tree, put back on top, unmoved.
   At rest the three reproduce the painting exactly, so they are only drawn while a tree is actually displaced. */
var SWAY_MAX = 16;
function swayWindy(w) { return w === 'typhoon' || w === 'blizzard' || w === 'storm'; }
async function swayMasks(scene, tick) {
  var w = LIT.weather || 'clear', windy = swayWindy(w), up = scene.up, want = {}, i, tk;
  for (i = 0; i < up.length; i++) { var s0 = up[i].sway; if ((s0 && (windy || s0.tag)) || up[i].hit) want[i] = 1; }
  var stones = scene.flat.filter(function (f) { return f.hit; });
  var ms = Math.min(2, Math.max(0.75, KS / 2.5)), mw = Math.ceil(W * ms), mh = Math.ceil(H * ms);
  var acc = tmpCanvas(mw, mh), ax = acc.getContext('2d'), scn, sx;
  ax.setTransform(ms, 0, 0, ms, 0, 0);
  var md = MODE; MODE = 'k';   // the painting's own detail (same DQ): the same dabs, so the outlines match
  var items = [], hits = [], pad = Math.ceil(7 * ms), x, y, k;
  function region(c, bx0, by0, bw, bh) { var fc = tmpCanvas(bw, bh), fx = fc.getContext('2d'); fx.drawImage(c, bx0, by0, bw, bh, 0, 0, bw, bh); var dd = fx.getImageData(0, 0, bw, bh).data; fc.width = fc.height = 0; return dd; }
  try {
    for (i = up.length - 1; i >= 0; i--) {      // front to back: acc holds everything in front of the object being looked at
      var o = up[i];
      if (!want[i]) { safeDraw(o, ax); tk = tick(); if (tk) await tk; continue; }
      scn = tmpCanvas(mw, mh); sx = scn.getContext('2d'); sx.setTransform(ms, 0, 0, ms, 0, 0);   // a fresh canvas for every read-back
      safeDraw(o, sx);
      var d = sx.getImageData(0, 0, mw, mh).data, x0 = mw, y0 = mh, x1 = -1, y1 = -1;
      for (y = 0; y < mh; y++) { var row = y * mw * 4; for (x = 0; x < mw; x++) if (d[row + x * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 >= 0) {
        var bx0 = Math.max(0, x0 - pad), by0 = Math.max(0, y0 - pad), bx1 = Math.min(mw, x1 + 1 + pad), by1 = Math.min(mh, y1 + 1 + pad), bw = bx1 - bx0, bh = by1 - by0;
        var C = new Uint8Array(bw * bh), Fm = new Uint8Array(bw * bh), fd = region(acc, bx0, by0, bw, bh), n = 0;
        for (y = 0; y < bh; y++) for (x = 0; x < bw; x++) { k = y * bw + x; C[k] = d[((y + by0) * mw + x + bx0) * 4 + 3]; Fm[k] = fd[k * 4 + 3]; if (C[k] > 128 && Fm[k] < 128) n++; }
        var sw = o.sway;
        if (o.hit && n > 4) { var V = new Uint8Array(bw * bh); for (k = 0; k < V.length; k++) V[k] = C[k] * (255 - Fm[k]) / 255; hits.push({ id: o.hit.id, perch: o.hit.perch || null, ms: ms, box: [bx0, by0, bw, bh], V: V }); }
        if (sw && (windy || sw.tag)) {
          var base = P(o.x, sw.y0 || 0, o.z), hgt = (base.y - y0 / ms);
          if ((sw.tag || hgt > (sw.shrub ? 26 : 20)) && n > 30) items.push({ ix: i, tag: sw.tag || null, flex: sw.flex || 0.5, shrub: !!sw.shrub, ms: ms, box: [bx0, by0, bw, bh], base: [base.x, base.y], top: y0 / ms, wx: o.x, C: C, F: Fm, area: n / (ms * ms) });
        }
      }
      ax.setTransform(1, 0, 0, 1, 0, 0); ax.drawImage(scn, 0, 0); ax.setTransform(ms, 0, 0, ms, 0, 0); scn.width = scn.height = 0;
      tk = tick(); if (tk) await tk;
    }
    // the stepping stones lie flat: everything upright may stand in front of them
    for (i = 0; i < stones.length; i++) {
      var st = stones[i], hb = st.hit.b, a = P(hb[0] - hb[2], 0, hb[1] + hb[3]), b = P(hb[0] + hb[2], 0, hb[1] - hb[3]);
      var sx0 = Math.max(0, Math.floor(Math.min(a.x, b.x) * ms) - 3), sy0 = Math.max(0, Math.floor(Math.min(a.y, b.y) * ms) - 4), sx1 = Math.min(mw, Math.ceil(Math.max(a.x, b.x) * ms) + 3), sy1 = Math.min(mh, Math.ceil(Math.max(a.y, b.y) * ms) + 4), sw2 = sx1 - sx0, sh2 = sy1 - sy0;
      if (sw2 <= 0 || sh2 <= 0) continue;
      scn = tmpCanvas(sw2, sh2); sx = scn.getContext('2d'); sx.setTransform(ms, 0, 0, ms, -sx0, -sy0); safeDraw(st, sx);
      var sd = sx.getImageData(0, 0, sw2, sh2).data, fd2 = region(acc, sx0, sy0, sw2, sh2), V2 = new Uint8Array(sw2 * sh2), n2 = 0;
      for (k = 0; k < V2.length; k++) { V2[k] = sd[k * 4 + 3] * (255 - fd2[k * 4 + 3]) / 255; if (V2[k] > 128) n2++; }
      if (n2 > 4) hits.push({ id: 'stone', perch: st.hit.perch, ms: ms, box: [sx0, sy0, sw2, sh2], V: V2 });
      scn.width = scn.height = 0;
    }
  } finally { MODE = md; }
  if (items.length > SWAY_MAX) { items.sort(function (a, b) { return (b.tag ? 1e9 : b.area) - (a.tag ? 1e9 : a.area); }); items.length = SWAY_MAX; }
  items.sort(function (a, b) { return a.ix - b.ix; });          // back to front
  return { ms: ms, windy: windy, items: items, hits: hits };
}

/* where a point (logical px) lands on the masks: an exact hit on what is drawn there, else the nearest thing within the slop */
function maskHit(data, x, y, slop) {
  if (!data) return null;
  var best = null, bd = 1e9, list = [];
  (data.items || []).forEach(function (it) { if (it.tag) list.push({ id: 'tree', tag: it.tag, it: it }); });
  (data.hits || []).forEach(function (h) { list.push({ id: h.id, perch: h.perch, it: h }); });
  function vis(it, px, py) {
    var b = it.box, i = Math.floor(px * it.ms) - b[0], j = Math.floor(py * it.ms) - b[1]; if (i < 0 || j < 0 || i >= b[2] || j >= b[3]) return 0;
    var k = j * b[2] + i; return it.V ? it.V[k] : it.C[k] * (255 - it.F[k]) / 255;
  }
  for (var r = 0; r <= slop; r += 2) {
    var n = r ? Math.max(8, Math.round(r * 1.6)) : 1;
    for (var q = 0; q < n; q++) {
      var a = q / n * TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      for (var m = 0; m < list.length; m++) { var v = vis(list[m].it, px, py); if (v > 110 && r < bd) { bd = r; best = list[m]; } }
    }
    if (best) break;
  }
  return best ? { id: best.id, tag: best.tag || null, perch: best.perch || null, d: bd } : null;
}

/* computed after the painting is shown (in slices, through the render queue), then kept with it in the cache */
async function swayJob(job) {
  var st = saveState();
  setupScene(job); GLOWS = []; TMPS = []; GRAINPAT = null;
  var tick = makeTicker(job, job.budget || 12);
  try { return await swayMasks(buildScene(), tick); } finally { freeTmps(); restoreState(st); }
}

/* ---- run time ---- */
function swayDilate(src, w, h, r, out) { // separable max filter (square), radius r px; values 0..255
  var tmp = new Uint8Array(w * h), x, y, k, m;
  out = out || new Uint8Array(w * h);
  if (r <= 0) { out.set(src); return out; }
  for (y = 0; y < h; y++) { var o = y * w; for (x = 0; x < w; x++) { m = 0; for (k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) if (src[o + k] > m) m = src[o + k]; tmp[o + x] = m; } }
  for (x = 0; x < w; x++) for (y = 0; y < h; y++) { m = 0; for (k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { var v = tmp[k * w + x]; if (v > m) m = v; } out[y * w + x] = m; }
  return out;
}
function swayDilateX(src, w, h, r) { // horizontal only (the wind moves crowns sideways)
  var out = new Uint8Array(w * h), x, y, k, m;
  for (y = 0; y < h; y++) { var o = y * w; for (x = 0; x < w; x++) { m = 0; for (k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) if (src[o + k] > m) m = src[o + k]; out[o + x] = m; } }
  return out;
}
function swayAlphaCanvas(a, w, h) { var c = mkCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data; for (var i = 0; i < w * h; i++) { d[i * 4 + 3] = a[i]; } x.putImageData(im, 0, 0); return c; }
/* fill the transparent part of a canvas from its opaque surroundings (push-pull: average down, then blend back up) */
function swayFill(src) {
  var lv = [src], c = src;
  while (c.width > 4 || c.height > 4) { var n = mkCanvas(Math.max(1, Math.ceil(c.width / 2)), Math.max(1, Math.ceil(c.height / 2))), nx = n.getContext('2d'); nx.imageSmoothingEnabled = true; nx.drawImage(c, 0, 0, n.width, n.height); lv.push(n); c = n; }
  var top = lv[lv.length - 1], tx = top.getContext('2d'), im = tx.getImageData(0, 0, top.width, top.height), d = im.data, s = [0, 0, 0], sn = 0, i;
  for (i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; sn++; }
  for (i = 0; i < d.length; i += 4) { if (d[i + 3] === 0 && sn) { d[i] = s[0] / sn; d[i + 1] = s[1] / sn; d[i + 2] = s[2] / sn; } d[i + 3] = 255; }
  tx.putImageData(im, 0, 0);
  var cur = top;
  for (i = lv.length - 2; i >= 0; i--) {
    var L = lv[i], o = mkCanvas(L.width, L.height), ox = o.getContext('2d'); ox.imageSmoothingEnabled = true;
    ox.drawImage(cur, 0, 0, o.width, o.height); ox.drawImage(L, 0, 0); cur = o;
  }
  return cur;
}
function makeSway(data, g) {
  if (!data || !data.items || !data.items.length) return null;
  var S = { ms: data.ms, items: [], sc: 0, t: 0, ramp: 0, active: false };
  data.items.forEach(function (it, n) {
    var hgt = Math.max(8, it.base[1] - it.top), f = it.shrub ? 1.1 : clamp(1.05 - hgt / 220, 0.32, 0.95);
    S.items.push({ d: it, tag: it.tag, hgt: hgt, f: f, x: 0, v: 0, kick: 0, seed: 7 + n * 13 + Math.round(it.base[0]), ph: (n * 2.39) % TAU, prep: null });
  });
  return S;
}
/* the pieces for one tree, at the overlay's scale sc (px per logical unit) */
function swayPrep(it, img, g, sc) {
  var d = it.d, ms = d.ms, b = d.box, w = b[2], h = b[3], n = w * h, i;
  var M = new Uint8Array(n); for (i = 0; i < n; i++) M[i] = d.C[i] * (255 - d.F[i]) / 255;
  // K1: the crown and a margin (its soft rim falls on background); the plate is opaque over all of K1 and a little beyond
  var K1 = swayDilate(M, w, h, Math.max(1, Math.round(1.2 * ms))), K2 = swayDilate(K1, w, h, Math.max(1, Math.round(1.0 * ms))), R = swayDilateX(K1, w, h, Math.ceil(5.5 * ms));
  var spA = new Uint8Array(n), srcA = new Uint8Array(n), fgA = new Uint8Array(n), plA = new Uint8Array(n);
  for (i = 0; i < n; i++) { var nf = 255 - d.F[i]; spA[i] = K1[i] * nf / 255; srcA[i] = K1[i] ? 0 : nf; plA[i] = K2[i] * nf / 255; fgA[i] = d.F[i] * R[i] / 255; }
  var k = img.width / g.W, mAll = swayAlphaCanvas(spA, w, h);
  function bbox(a, grow) { var x0 = w, y0 = h, x1 = -1, y1 = -1; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (a[y * w + x] > 3) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 < 0) return null; x0 = Math.max(0, x0 - grow); y0 = Math.max(0, y0 - grow); x1 = Math.min(w - 1, x1 + grow); y1 = Math.min(h - 1, y1 + grow); return [x0, y0, x1 + 1, y1 + 1]; }
  // a piece of the painting inside the mask px rect r (mask units), at `res` of the overlay's resolution
  function piece(r, maskC, res) {
    var X = Math.floor((b[0] + r[0]) / ms * sc), Y = Math.floor((b[1] + r[1]) / ms * sc), X1 = Math.ceil((b[0] + r[2]) / ms * sc), Y1 = Math.ceil((b[1] + r[3]) / ms * sc), PW = X1 - X, PH = Y1 - Y;
    var c = mkCanvas(Math.max(1, Math.round(PW * res)), Math.max(1, Math.round(PH * res))), x = c.getContext('2d'), f = c.width / PW;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, X / sc * k, Y / sc * k, PW / sc * k, PH / sc * k, 0, 0, c.width, c.height);
    if (maskC) { x.globalCompositeOperation = 'destination-in'; x.drawImage(maskC, (b[0] / ms * sc - X) * f, (b[1] / ms * sc - Y) * f, w / ms * sc * f, h / ms * sc * f); x.globalCompositeOperation = 'source-over'; }
    return { c: c, X: X, Y: Y, W: PW, H: PH };
  }
  var rs = bbox(spA, 2); if (!rs) return null;
  var sprite = piece(rs, mAll, 1), rf = bbox(fgA, 1), fg = rf ? piece(rf, swayAlphaCanvas(fgA, w, h), 1) : null;
  // the plate: the painting with the hole filled from what is around it; outside the hole it is the painting itself
  var rp = bbox(plA, Math.ceil(4 * ms)), src = piece(rp, swayAlphaCanvas(srcA, w, h), 1), fill = swayFill(src.c), fx = fill.getContext('2d'), ff = fill.width / src.W;
  fx.globalCompositeOperation = 'destination-in'; fx.drawImage(swayAlphaCanvas(plA, w, h), (b[0] / ms * sc - src.X) * ff, (b[1] / ms * sc - src.Y) * ff, w / ms * sc * ff, h / ms * sc * ff);
  var plate = { c: fill, X: src.X, Y: src.Y, W: src.W, H: src.H };
  return { sprite: sprite, plate: plate, fg: fg };
}
/* one step of the trees' motion: a damped spring per tree, pushed by the gale (gusts sweep across from upwind) */
function stepSway(S, g, dt, wfx) {
  S.t += dt; S.ramp = Math.min(1, S.ramp + dt / 1.5);
  var w = g.LIT.weather || 'clear', gale = w === 'typhoon' || w === 'blizzard', amp = w === 'typhoon' ? 1 : w === 'blizzard' ? 0.85 : w === 'storm' ? 0.3 : 0; amp *= sstep(0, 1, S.ramp);
  var Wd = g.wind || { side: 1, s: 0.5 }, side = Wd.side, t = S.t, gT = wfx && wfx.gustT !== undefined ? wfx.gustT : -99, any = false;
  for (var i = 0; i < S.items.length; i++) {
    var it = S.items[i], target = 0, zeta = 0.14, om = TAU * it.f;
    if (amp > 0) {
      // gusts arrive at the upwind trees first; turbulence is each tree's own
      var xn = it.d.base[0] / g.W, lag = (side > 0 ? xn : 1 - xn) * 1.1, u = wfx ? (wfx.t || 0) - lag - gT : 99;
      var gust = w === 'blizzard' && wfx ? 1.35 * galeBurstAt(wfx, (wfx.t || 0) - lag) : gale ? sstep(0, 1, 1 - Math.abs(u - 1.3) / 1.9) : 0;   // a blizzard's bursts bend them harder
      var turb = (vnoise1(it.seed, t * 0.75) - 0.5) * 0.65 + (vnoise1(it.seed + 3, t * 2.1) - 0.5) * 0.45;
      var load = 0.9 * gust + turb + (gale ? 0.2 * (Wd.s - 0.95) : 0) - 0.18;   // about the painted lean: gusts bend further, lulls let it spring back
      target = amp * it.d.flex * Math.min(it.hgt, 125) * 0.036 * load * side;
      zeta = 0.32;
    }
    it.v += (om * om * (target - it.x) - 2 * zeta * om * it.v) * dt; it.x += it.v * dt;
    it.fl = amp > 0 ? amp * it.d.flex * Math.min(it.hgt, 125) * 0.0055 * (0.6 + Wd.s * 0.6) : 0;
    it.on = Math.abs(it.x) > 0.04 || Math.abs(it.v) > 0.05 || it.fl > 0.01;
    if (it.on) any = true;
  }
  S.active = any;
}
function swayKick(S, tag, dir) {
  if (!S) return false;
  for (var i = 0; i < S.items.length; i++) { var it = S.items[i]; if (it.tag === tag) { it.v += dir * 1.7 * TAU * it.f * 1.15; return true; } }
  return false;
}
/* draw the moving trees into the overlay (identity transform, overlay pixels) */
function drawSway(ctx, S, g, img, sc) {
  if (!S || !S.active || !img) return;
  if (S.sc !== sc) { S.items.forEach(function (it) { it.prep = null; }); S.sc = sc; }
  var preps = 0;   // the pieces are cut a couple of trees per frame, so a gale starts without a hitch
  for (var i = 0; i < S.items.length; i++) {
    var it = S.items[i]; if (!it.on) continue;
    var top = it.x * sc; if (Math.abs(top) < 0.12 && it.fl * sc < 0.12) continue;
    if (!it.prep) { if (preps++ >= 2) continue; try { it.prep = swayPrep(it, img, g, sc) || { sprite: null }; } catch (e) { it.prep = { sprite: null }; } }
    var q = it.prep, sp = q.sprite, by = it.d.base[1] * sc, H = Math.max(4, it.hgt * sc), t = S.t;
    if (!sp) continue;
    ctx.drawImage(q.plate.c, q.plate.X, q.plate.Y, q.plate.W, q.plate.H);
    // bands from the top of the sprite down to the trunk base, each sheared to the bend; below the base nothing moves
    var Y0 = sp.Y, yEnd = Math.min(Y0 + sp.H, Math.round(by)), nb = clamp(Math.round((yEnd - Y0) / 22), 3, 16), prev = null;
    var fl = it.fl * sc, fw = TAU * (1.6 + 0.9 * ((it.seed % 7) / 7));
    function disp(yy) { var u = clamp((by - yy) / H), p = Math.pow(u, 1.6); return top * p + fl * u * Math.sin(t * fw - u * 4.2 + it.ph); }
    if (yEnd > Y0) {
      for (var b = 0; b < nb; b++) {
        var ya = Y0 + Math.round((yEnd - Y0) * b / nb), yb = Y0 + Math.round((yEnd - Y0) * (b + 1) / nb); if (yb <= ya) continue;
        var da = prev === null ? disp(ya) : prev, db = disp(yb), s = (db - da) / (yb - ya); prev = db;
        ctx.setTransform(1, 0, s, 1, da - s * ya, 0);
        ctx.drawImage(sp.c, 0, ya - Y0, sp.W, yb - ya, sp.X, ya, sp.W, yb - ya);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (yEnd < Y0 + sp.H) { var r0 = Math.max(0, yEnd - Y0); ctx.drawImage(sp.c, 0, r0, sp.W, sp.H - r0, sp.X, Y0 + r0, sp.W, sp.H - r0); }
    if (q.fg) ctx.drawImage(q.fg.c, q.fg.X, q.fg.Y);
  }
}

/* ---- 08h_powder.js ---- */
/* ================= blizzard: powder snow blown across the whole picture =================
   - a dense field of very fine soft grains (soft dots, a slight smear when fast, never lines), carried sideways by the
     shared wind through a swirling, drifting flow (eddies, lifts and dips; near grains faster than far ones)
   - large soft veils of blowing powder (noise-textured, feathered), and spindrift puffs lifting off the ground, the
     fence line and the tree crowns
   - every 8-25 s a burst: the wind surges over ~1 s, the grains thicken and speed up, a near-whiteout sweeps across,
     the trees bend harder (08g reads galeBurstAt), then it eases off. */
function galeBurstAt(S, t) {
  if (!S || S.burstT === undefined) return 0;
  var u = t - S.burstT; if (u < 0 || u > S.burstDur) return 0;
  if (u < 1) return sstep(0, 1, u);
  var e0 = S.burstDur - S.burstEase; return u < e0 ? 1 : 1 - sstep(0, 1, (u - e0) / S.burstEase);
}
function powderDot(col) { // a soft grain
  var k = 'pd' + col.join(','); if (SPR[k]) return SPR[k];
  var N = 24, c = mkCanvas(N, N), x = c.getContext('2d'), gr = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  gr.addColorStop(0, rgb(col, 1)); gr.addColorStop(0.35, rgb(col, 0.75)); gr.addColorStop(0.7, rgb(col, 0.22)); gr.addColorStop(1, rgb(col, 0));
  x.fillStyle = gr; x.fillRect(0, 0, N, N); SPR[k] = c; return c;
}
function powderTex(i, col) { // a feathered wisp of blowing powder: long horizontal tendrils, no edge anywhere
  var k = 'pv' + i + col.join(','); if (SPR[k]) return SPR[k];
  var w = 192, h = 72, c = mkCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (var y = 0; y < h; y++) for (var q = 0; q < w; q++) {
    var dx = (q - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), e = sstep(0, 0.75, 1 - (dx * dx + dy * dy));
    var n = NZ.fbm(q * 0.028 + i * 17.3, y * 0.085 + i * 5.1, 4), a = e * sstep(0.32, 0.78, n), o = (y * w + q) * 4;
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = Math.round(255 * a);
  }
  x.putImageData(im, 0, 0); SPR[k] = c; return c;
}
function powderTile(layer, col, sc) { // a seamless tile of very fine grains (device pixels), scrolled as one far / middle layer
  var T = Math.max(64, Math.round(150 * sc)), k = 'pt' + layer + col.join(',') + T; if (SPR[k]) return SPR[k];
  var c = mkCanvas(T, T), x = c.getContext('2d'), r = mulberry32(4100 + layer * 77), dot = powderDot(col);
  for (var i = 0; i < 610; i++) { // far grains and, fewer, middle ones, in one tile (one fill per frame)
    var mid = i >= 460, px = r() * T, py = r() * T, rad = (mid ? 0.45 + r() * 0.5 : 0.24 + r() * 0.3) * sc, a = mid ? 0.45 + r() * 0.45 : 0.3 + r() * 0.45;
    x.globalAlpha = a;
    for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) { var qx = px + ox * T, qy = py + oy * T; if (qx > -rad && qx < T + rad && qy > -rad && qy < T + rad) x.drawImage(dot, qx - rad, qy - rad, rad * 2, rad * 2); }
  }
  SPR[k] = { c: c, T: T }; return SPR[k];
}
function newGrain(g, rng, x, y) {
  var d = Math.pow(rng(), 1.3);
  return { x: x, y: y, d: d, sp: 0.75 + rng() * 0.5, ph: rng() * TAU, r: (0.32 + d * 1.15) * (0.7 + rng() * 0.6), a: (0.3 + 0.6 * rng()) * (0.45 + 0.55 * d) };
}
function makePowder(S, g, rng) {
  var n = Math.round(g.W * g.H / 1000 * 3.4), extra = Math.round(n * 1.1), i;
  S.flakes = []; for (i = 0; i < n + extra; i++) S.flakes.push(newGrain(g, rng, rng() * (g.W + 40) - 20, rng() * (g.H + 20) - 10));
  S.nBase = n;
  S.lay = [{ x: 0, y: 0, k: 0.55, f: 9 }];
  S.veils = []; for (i = 0; i < 6; i++) S.veils.push({ x: rng() * (g.W + 300) - 150, y: g.H * (0.08 + 0.88 * Math.pow(rng(), 0.7)), w: 130 + rng() * 160, h: 30 + rng() * 60, sp: 0.9 + rng() * 0.6, a: 0.12 + rng() * 0.14, tex: i % 3, ph: rng() * TAU });
  S.drifts = []; S.driftAcc = 0; S.nextBurst = 6 + rng() * 8; S.burstT = -99; S.burstDur = 0; S.burstEase = 2.6;
}
function stepPowder(S, g, dt, rng, cue, v) {
  var Wd = g.wind || { side: 1, s: 1 }, sd = Wd.side, t = S.t, i, W2 = g.W, H2 = g.H;
  if (t > S.nextBurst) { S.burstT = t; S.burstEase = 2.2 + rng() * 1.2; S.burstDur = 1 + 1.2 + rng() * 1.8 + S.burstEase; S.nextBurst = t + 8 + rng() * 17; cue('gust'); }
  var bk = galeBurstAt(S, t), V = v * (1 + 1.5 * bk);
  for (i = 0; i < S.flakes.length; i++) {
    var f = S.flakes[i], base = V * (0.35 + 1.25 * f.d) * f.sp;
    // the flow: swirls that travel with the wind, so grains speed up and slow, rise and dip, but never blow back
    var sw = Math.sin(f.y * 0.045 + t * 1.3 + Math.sin(f.x * 0.021 - sd * t * 0.8 + f.ph * 0.3));
    var lift = Math.sin(f.x * 0.032 - sd * t * 2.1 + f.ph) * Math.cos(f.y * 0.038 + t * 0.7);
    f.x += sd * base * (1 + 0.45 * sw) * dt;
    f.y += ((9 + 16 * f.d) + (12 + 22 * f.d) * (1 + bk) * lift) * dt;
    if (f.x > W2 + 22 || f.x < -22) S.flakes[i] = newGrain(g, rng, sd > 0 ? -20 : W2 + 20, rng() * (H2 + 20) - 10);
    else if (f.y > H2 + 10) S.flakes[i] = newGrain(g, rng, rng() * (W2 + 40) - 20, -8);
    else if (f.y < -14) S.flakes[i] = newGrain(g, rng, rng() * (W2 + 40) - 20, H2 + 6);
  }
  S.lay.forEach(function (L2, j) { L2.x += sd * V * L2.k * dt; L2.y += (L2.f + 10 * (1 + bk) * Math.sin(t * (0.7 + 0.3 * j) + j * 2)) * dt; });   // the fine layers: logical px, wrapped when drawn
  S.veils.forEach(function (c) { c.x += sd * V * 0.85 * c.sp * dt; c.y += Math.sin(t * 0.4 + c.ph) * 4 * dt; if (sd > 0 && c.x - c.w / 2 > W2) c.x = -c.w / 2; if (sd < 0 && c.x + c.w / 2 < 0) c.x = W2 + c.w / 2; });
  // spindrift: puffs torn off the ground, the fence line and the crowns, lifting as they go
  S.driftAcc += dt * (1.4 + 4.5 * bk);
  while (S.driftAcc >= 1 && S.drifts.length < 26) {
    S.driftAcc -= 1; var r = rng(), x, y, tops = g.swayTops;
    if (r < 0.45) { x = rng() * W2; y = g.horizonY + 8 + rng() * (H2 - g.horizonY - 8); }
    else if (r < 0.72 || !tops || !tops.length) { x = rng() * W2; y = g.horizonY - 3 - rng() * 14; }
    else { var tp = tops[(rng() * tops.length) | 0]; x = tp.x + (rng() - 0.5) * tp.w; y = tp.y + 4 + rng() * 10; }
    S.drifts.push({ x: x, y: y, t0: t, life: 1.6 + rng() * 2, w0: 6 + rng() * 8, w1: 36 + rng() * 50, vx: sd * V * (0.45 + 0.4 * rng()), vy: -(9 + rng() * 18), a: 0.14 + rng() * 0.16, tex: (rng() * 3) | 0 });
  }
  if (S.driftAcc > 1) S.driftAcc = 1;
  for (i = S.drifts.length - 1; i >= 0; i--) { var p = S.drifts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 0.985; if (t - p.t0 > p.life) S.drifts.splice(i, 1); }
}
function drawPowder(ctx, S, g) {
  var L = g.LIT, night = L.id === 'night', dusk = L.id === 'dusk', col = night ? [178, 190, 222] : dusk ? [240, 232, 236] : [248, 250, 255], t = S.t, i;
  var bk = galeBurstAt(S, t), nk = night ? 0.75 : 1, sd = (g.wind || { side: 1 }).side;
  // veils of blowing powder, behind the grains
  S.veils.forEach(function (c) { ctx.globalAlpha = Math.min(1, c.a * (1 + 1.3 * bk) * nk); ctx.drawImage(powderTex(c.tex, col), c.x - c.w / 2, c.y - c.h / 2, c.w, c.h); });
  S.drifts.forEach(function (p) {
    var u = (t - p.t0) / p.life; if (u < 0 || u > 1) return; var w = lerp(p.w0, p.w1, Math.pow(u, 0.7)), h = w * 0.4;
    ctx.globalAlpha = p.a * Math.sin(Math.PI * Math.pow(u, 0.6)) * nk; ctx.drawImage(powderTex(p.tex, col), p.x - w * (0.5 + 0.2 * sd), p.y - h * 0.6, w, h);
  });
  // the fine powder: two seamless layers of tiny grains scrolling with the wind (drawn out a little in a burst)
  var dsc = ctx.canvas.width / g.W;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  S.lay.forEach(function (L2, j) {
    var tl = powderTile(j, col, dsc), T = tl.c.width, stx = 1 + 0.45 * bk, ox = Math.round(((L2.x * dsc / stx) % T + T) % T), oy = Math.round(((L2.y * dsc) % T + T) % T);   // whole pixels: a plain copy, no resampling
    if (!tl.pat) tl.pat = ctx.createPattern(tl.c, 'repeat');   // a pattern fill: seamless, one call per layer
    ctx.globalAlpha = Math.min(1, 0.8 * (1 + 0.5 * bk) * nk);
    if (stx < 1.01) stx = 1; ctx.setTransform(stx, 0, 0, 1, ox * stx, oy); ctx.fillStyle = tl.pat; ctx.fillRect(-ox, -oy, ctx.canvas.width / stx + T, ctx.canvas.height + T);
  });
  ctx.restore();
  // the near grains: soft dots in the swirling flow, slightly drawn out along the wind when they are fast
  var spr = powderDot(col), n = Math.min(S.flakes.length, S.nBase + Math.round((S.flakes.length - S.nBase) * bk)), sm = 0.6 + 1.6 * bk;
  for (i = 0; i < n; i++) {
    var f = S.flakes[i], dw = f.r * 2 * (1 + f.d * sm), dh = f.r * 2;
    ctx.globalAlpha = f.a * nk; ctx.drawImage(spr, f.x - dw * 0.5, f.y - dh * 0.5, dw, dh);
  }
  // a burst: the air itself goes white for a moment, and a wall of powder sweeps across
  if (bk > 0.01) {
    var fog = night ? [120, 130, 160] : dusk ? [226, 220, 226] : [240, 242, 246], u2 = clamp((t - S.burstT) / S.burstDur), cx = sd > 0 ? lerp(-0.7, 1.7, u2) * g.W : lerp(1.7, -0.7, u2) * g.W;
    ctx.globalAlpha = 0.2 * bk; ctx.fillStyle = rgb(fog); ctx.fillRect(0, 0, g.W, g.H);
    var tx = powderTex(0, col);
    ctx.globalAlpha = 0.7 * bk * nk; ctx.drawImage(tx, cx - g.W * 0.8, -g.H * 0.25, g.W * 1.6, g.H * 1.5);
  }
  ctx.globalAlpha = 1;
}

/* ---- 09_runtime.js ---- */
/* ================= public API & controller ================= */
var VERSION = '1.3.1';
var SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'], LIGHT_KEYS = ['morning', 'day', 'dusk', 'night'];
function withScene(o, fn) {
  var st = saveState();
  try { setupScene(o); return fn(); } finally { restoreState(st); }
}
/* normalized 0..1 focus of a stage for a frame of logical size w x h */
function focusFor(i, w, h) {
  return withScene({ W: w, H: h, KS: 1, stage: i, season: 'autumn', light: 'day' }, function () {
    var d = STAGE_DEFS[i][3], x, y;
    if (i === 0) { var g = P(LX(0.6), 0, LZ(4.2)); x = g.x; y = g.y; }
    else if (d === 'pagoda') { var pp = pagodaPos(); x = pp.x; y = pp.y - 22; }
    else if (!d) { var b = P((BRIDGE.x0 + BRIDGE.x1) / 2, 0.75, BRIDGE.zc); x = b.x; y = b.y; }
    else { var p = P(d[0], d[1], d[2]); x = p.x; y = p.y; }
    return [Math.round(clamp(x / w, 0.04, 0.96) * 1000) / 1000, Math.round(clamp(y / h, 0.04, 0.96) * 1000) / 1000];
  });
}
var STAGES = STAGE_DEFS.map(function (d, i) { return { min: d[0], name: d[1], desc: d[2], focus: focusFor(i, REF_W, REF_H) }; });
function stageFor(minutes) {
  var m = +minutes; if (!(m >= 0)) m = 0;
  var s = 0; for (var i = 0; i < STAGES.length; i++) if (m >= STAGES[i].min) s = i;
  return s;
}
function toDate(d) { if (d instanceof Date) return d; if (d === undefined || d === null) return new Date(); return new Date(d); }
function seasonFor(date) { var m = toDate(date).getMonth(); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
function lightFor(date) { var d = toDate(date), h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 9 ? 'morning' : h >= 9 && h < 16.5 ? 'day' : h >= 16.5 && h < 19 ? 'dusk' : 'night'; }

/* ---- IndexedDB cache of finished paintings ---- */
var DBP = null;
function idbOpen() {
  if (DBP) return DBP;
  DBP = new Promise(function (res) {
    var done = false; function fin(v) { if (!done) { done = true; res(v); } }
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) return fin(null);
      var rq = indexedDB.open('mogi-garden', 1);
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore('paint'); } catch (e) { /* exists */ } };
      rq.onsuccess = function () { fin(rq.result); };
      rq.onerror = function () { fin(null); }; rq.onblocked = function () { fin(null); };
      setTimeout(function () { fin(null); }, 2500);
    } catch (e) { fin(null); }
  });
  return DBP;
}
function idbReq(mode, fn) {
  return idbOpen().then(function (db) {
    if (!db) return null;
    return new Promise(function (res) {
      var done = false; function fin(v) { if (!done) { done = true; res(v); } }
      try { var tx = db.transaction('paint', mode), st = tx.objectStore('paint'), r = fn(st); tx.oncomplete = function () { fin(r && r.result !== undefined ? r.result : null); }; tx.onerror = tx.onabort = function () { fin(null); }; }
      catch (e) { fin(null); }
      setTimeout(function () { fin(null); }, 3000);
    });
  }).catch(function () { return null; });
}
function cacheGet(key) { return idbReq('readonly', function (st) { return st.get(key); }); }
var pruneTimer = null;
function cachePut(key, rec) {
  return idbReq('readwrite', function (st) { return st.put(rec, key); }).then(function () {
    clearTimeout(pruneTimer); pruneTimer = setTimeout(cachePrune, 4000);
  });
}
function cachePrune() {
  idbOpen().then(function (db) {
    if (!db) return;
    try {
      var tx = db.transaction('paint', 'readwrite'), st = tx.objectStore('paint'), list = [];
      var cur = st.openCursor();
      cur.onsuccess = function () {
        var c = cur.result;
        if (c) { var k = String(c.key); if (k.indexOf(VERSION + '|') !== 0) c.delete(); else list.push({ k: c.key, t: (c.value && c.value.t) || 0 }); c.continue(); }
        else { list.sort(function (a, b) { return b.t - a.t; }); list.slice(40).forEach(function (e) { st.delete(e.k); }); }
      };
    } catch (e) { /* ignore */ }
  });
}
function toBlob(canvas, type, q) {
  return new Promise(function (res) {
    try { if (canvas.toBlob) canvas.toBlob(function (b) { res(b); }, type, q); else res(null); } catch (e) { res(null); }
  });
}
function blobToCanvas(blob) {
  if (!blob) return Promise.resolve(null);
  function draw(src, w, h) { var c = mkCanvas(w, h); c.getContext('2d').drawImage(src, 0, 0); return c; }
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob).then(function (bm) { var c = draw(bm, bm.width, bm.height); if (bm.close) bm.close(); return c; });
  }
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(blob), im = new Image();
    im.onload = function () { var c = draw(im, im.naturalWidth, im.naturalHeight); URL.revokeObjectURL(url); res(c); };
    im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('decode')); };
    im.src = url;
  });
}

/* ---- render queue: one static painting at a time ---- */
var RQ = Promise.resolve();
function enqueue(fn) { var p = RQ.then(fn, fn); RQ = p.catch(function () { }); return p; }

var REDUCED = null;
function reducedMotion() {
  try { if (!REDUCED && window.matchMedia) REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)'); return !!(REDUCED && REDUCED.matches); } catch (e) { return false; }
}
function paperPlaceholder(c) {
  var x = c.getContext('2d'), w = c.width, h = c.height;
  var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ece6d8'); g.addColorStop(0.55, '#e4dccb'); g.addColorStop(1, '#d9cfbb'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  // a faint ink wash of a horizon and a garden, as on unpainted paper
  var r = mulberry32(3); x.globalAlpha = 0.07; x.fillStyle = '#6d6250';
  x.beginPath(); x.moveTo(0, h * 0.33); for (var i = 0; i <= 20; i++) x.lineTo(w * i / 20, h * (0.3 - 0.06 * NZ.fbm(i * 0.35, 1.3, 3))); x.lineTo(w, h * 0.42); x.lineTo(0, h * 0.42); x.closePath(); x.fill();
  x.globalAlpha = 0.05; for (i = 0; i < 6; i++) { x.beginPath(); x.ellipse(w * (0.1 + r() * 0.8), h * (0.55 + r() * 0.35), w * (0.05 + r() * 0.1), h * 0.02, 0, 0, TAU); x.fill(); }
  x.globalAlpha = 0.1; var tex = x.createPattern(getGrain(), 'repeat'); x.globalCompositeOperation = 'overlay'; x.fillStyle = tex; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
}

function mount(el, opts) {
  opts = opts || {};
  var o = { stage: 0, season: seasonFor(), light: lightFor(), quality: 'card', animate: true, event: null };
  function merge(n) { if (!n) return; ['stage', 'season', 'light', 'quality', 'animate', 'onReady', 'event', 'onCue', 'date', 'weather', 'fireworks', 'wide'].forEach(function (k) { if (n[k] !== undefined) o[k] = n[k]; }); norm(); }
  function norm() {
    o.stage = Math.max(0, Math.min(STAGES.length - 1, Math.round(+o.stage || 0)));
    if (SEASON_KEYS.indexOf(o.season) < 0) o.season = seasonFor();
    if (LIGHT_KEYS.indexOf(o.light) < 0) o.light = lightFor();
    if (o.quality !== 'full') o.quality = 'card';
    if (EVENTS.indexOf(o.event) < 0) o.event = null;
    if (WEATHERS.indexOf(o.weather) < 0) o.weather = null;          // null: from the date's weather model
    if (o.fireworks !== true && o.fireworks !== false) o.fireworks = null;
  }
  /* what the date (or the dev overrides) say about this moment: calendar, weather, wind side, fireworks */
  function hasDate() { return o.date !== undefined && o.date !== null && !isNaN(toDate(o.date).getTime()); }
  function nowDate() { return hasDate() ? new Date(toDate(o.date).getTime() + clock * 1000) : new Date(); }
  function conditions(so) {
    so = so || o;
    var season = so.season, light = so.light, p = seasonProgress(season, hasDate() ? o.date : null), w = 'clear', after = false;
    if (o.weather) w = o.weather;
    else if (hasDate()) { var wi = weatherInfo(o.date); w = wi.w; after = wi.after; if (season !== 'winter') { if (w === 'snow') w = 'rain'; if (w === 'blizzard') w = 'storm'; } }
    var gale = w === 'typhoon' || w === 'blizzard', side = gale ? (Math.cos(windAt(hasDate() ? toDate(o.date) : new Date()).dir * Math.PI / 180) >= 0 ? 1 : -1) : 1;
    var fw = o.fireworks !== null ? o.fireworks : hasDate() ? fireworksAt(toDate(o.date)) : false;
    if (w === 'rain' || w === 'storm' || w === 'typhoon' || w === 'blizzard' || w === 'snow') { if (o.fireworks !== true) fw = false; }
    var fwStatic = fw && (light === 'night' || light === 'dusk');
    return { p: p, cal: calQuant(season, p), w: w, after: after, side: side, fw: fw, tag: calTag(season, p) + w + (after ? '+' : '') + (gale ? (side > 0 ? 'R' : 'L') : '') + (fwStatic ? 'fw' : ''), fwStatic: fwStatic };
  }
  merge(opts);
  var dead = false, readyFired = false, user = { paused: false }, hidden = typeof document !== 'undefined' && document.hidden, onScreen = true;
  var stats = { source: null, ms: 0, history: [] };
  function mk(z) {
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;z-index:' + z + ';';
    return c;
  }
  var cv = mk(0), tv = mk(1), fv = mk(2);
  var cs = getComputedStyle(el); if (cs.position === 'static') el.style.position = 'relative';
  el.insertBefore(fv, el.firstChild); el.insertBefore(tv, fv); el.insertBefore(cv, tv);
  var cur = null;          // displayed painting {spec, img, mask, occ, glows, geo}
  var want = null, pendingTimer = null;
  var size = measure();
  // placeholder on the top transition canvas until the first painting is ready
  function sizeCanvas(c, w, h) { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } }
  function placeholder() {
    if (!size) return;
    var pw = Math.min(size.cssW * 1, 600), ph = Math.round(pw * size.cssH / size.cssW);
    sizeCanvas(tv, Math.max(2, Math.round(pw)), Math.max(2, ph)); paperPlaceholder(tv); tv.style.transition = 'none'; tv.style.opacity = '1';
  }
  placeholder();

  function measure() {
    var w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return null;
    return { cssW: w, cssH: h, dpr: (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1 };
  }
  function specFor(q, so) {
    so = so || o;
    var wk = clamp(+o.wide || 1, 1, 1.5), Wl = Math.round(REF_W * wk), Hl = Math.round(clamp(Wl * size.cssH / size.cssW, 200, 600)), bw; // wide: a wider field of view (the full-screen view)
    if (q === 'full') bw = Math.round(clamp(Math.max(size.cssW * size.dpr, 2000), 1200, 2400));
    else if (q === 'preview') bw = Math.round(clamp(size.cssW * Math.min(size.dpr, 2), 320, 1100));
    else bw = Math.round(clamp(size.cssW * Math.min(size.dpr, 2), 240, 1200));
    var bh = Math.round(bw * Hl / Wl), ks = bw / Wl;
    var dq = q === 'full' ? clamp(ks / 2.7, 1, 1.9) : clamp(ks / 2, 0.6, 1.25);
    var qn = q === 'full' ? 'full' : 'card';
    var ev = so.event === undefined ? o.event : so.event, cd = conditions({ season: so.season, light: so.light });
    return { key: [VERSION, so.stage, so.season, so.light, ev || 'none', cd.tag, qn, bw + 'x' + bh + (wk > 1 ? '|w' + wk : '')].join('|'), stage: so.stage, season: so.season, light: so.light, event: ev || null, cal: cd.cal, weather: cd.w, after: cd.after, windSide: cd.side, fw: cd.fwStatic, W: Wl, H: Hl, KS: ks, DQ: dq, bw: bw, bh: bh, q: qn };
  }
  /* get a painting: cache first, else paint (and cache it) */
  var jobs = {};
  function cancelOthers(keep) { Object.keys(jobs).forEach(function (k) { if (keep.indexOf(k) < 0) { jobs[k].cancelled = true; delete jobs[k]; } }); }
  function obtain(spec) {
    var ex = jobs[spec.key]; if (ex && !ex.cancelled) return ex.p;
    var t0 = now(), J = { cancelled: false, spec: spec };
    jobs[spec.key] = J;
    var p = J.p = cacheGet(spec.key).then(function (rec) {
      if (J.cancelled) throw CANCEL;
      if (!rec || !rec.img) return null;
      return Promise.all([blobToCanvas(rec.img), blobToCanvas(rec.mask), blobToCanvas(rec.occ), blobToCanvas(rec.sky)]).then(function (a) {
        if (!a[0] || a[0].width !== spec.bw) return null;
        return { img: a[0], mask: a[1], occ: a[2], sky: a[3], sway: rec.sway || null, glows: rec.glows || [], src: 'cache' };
      }).catch(function () { return null; });
    }).then(function (got) {
      if (got) return got;
      if (J.cancelled) throw CANCEL;
      return enqueue(function () {
        if (J.cancelled || dead) throw CANCEL;
        return renderStatic(jobFor(spec, { get cancelled() { return J.cancelled || dead; } })).then(function (r) {
          var res = { img: r.canvas, mask: r.mask, occ: r.occ, sky: r.sky, sway: null, glows: r.glows.map(function (g) { return { x: g.x, y: g.y, r: g.r, a: g.a }; }), src: 'paint', phases: r.phases, paintMs: Math.round(r.ms) };
          // store in the background
          setTimeout(function () {
            Promise.all([toBlob(r.canvas, 'image/jpeg', 0.92), r.mask ? toBlob(r.mask, 'image/png') : null, r.occ ? toBlob(r.occ, 'image/png') : null, r.sky ? toBlob(r.sky, 'image/png') : null]).then(function (b) {
              if (b[0]) return cachePut(spec.key, { img: b[0], mask: b[1], occ: b[2], sky: b[3], sway: res.sway, glows: res.glows, t: Date.now(), v: VERSION });
            }).catch(function () { });
          }, 60);
          return res;
        });
      });
    }).then(function (res) {
      res.spec = spec; res.ms = now() - t0;
      stats.history.push({ key: spec.key, src: res.src, ms: Math.round(res.ms), paint: res.paintMs, phases: res.phases });
      if (jobs[spec.key] === J) delete jobs[spec.key];
      return res;
    }, function (e) { if (jobs[spec.key] === J) delete jobs[spec.key]; throw e; });
    return p;
  }
  function jobFor(spec, extra) {
    var j = { stage: spec.stage, season: spec.season, light: spec.light, event: spec.event, cal: spec.cal, weather: spec.weather, after: spec.after, windSide: spec.windSide, fw: spec.fw, W: spec.W, H: spec.H, KS: spec.KS, DQ: spec.DQ, bw: spec.bw, bh: spec.bh };
    if (extra) Object.getOwnPropertyNames(extra).forEach(function (k) { Object.defineProperty(j, k, Object.getOwnPropertyDescriptor(extra, k)); });
    return j;
  }
  function makeGeo(res) {
    var sp = res.spec;
    return withScene(jobFor(sp), function () { var g = animGeo(sp); g.glows = res.glows || []; g.water = waterGrid(res.mask, g); g.wp = weatherPoints(g); return g; });
  }
  function waterGrid(mask, g) {
    if (!mask || (g.season !== 'spring' && g.season !== 'autumn')) return null;
    try {
      var w = 100, h = Math.round(100 * g.H / g.W), c = mkCanvas(w, h), x = c.getContext('2d'); x.drawImage(mask, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h); for (var i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 160 ? 1 : 0;
      return { w: w, h: h, a: a };
    } catch (e) { return null; }
  }
  /* show a painting; fade = crossfade from what is shown now */
  function present(res, fade) {
    if (dead) return;
    if (reveal && fade) finishReveal();
    var first = !cur;
    if (fade && cur && !reducedMotion()) {
      sizeCanvas(tv, Math.min(cv.width, ovW()), Math.min(cv.height, ovH())); var tx = tv.getContext('2d'); tx.globalCompositeOperation = 'source-over'; tx.drawImage(cv, 0, 0, tv.width, tv.height);
      tv.style.transition = 'none'; tv.style.opacity = '1';
    }
    sizeCanvas(cv, res.spec.bw, res.spec.bh);
    cv.getContext('2d').drawImage(res.img, 0, 0);
    // keep a water / occluder mask at the overlay layer size
    cur = { spec: res.spec, img: res.img, mask: res.mask, occ: res.occ, sky: res.sky, swayData: res.sway, glows: res.glows, geo: makeGeo(res) }; cur.geo.img = res.img;
    setupFx();
    stats.source = res.src; stats.ms = Math.round(res.ms);
    if (first || fade) {
      void tv.offsetWidth;
      tv.style.transition = 'opacity ' + (first ? 0.6 : 0.45) + 's ease'; tv.style.opacity = '0';
    }
    drawFrame(true);
    loopCheck();
    if (cur.spec.key === wantKey()) scheduleSway();
    if (first && !readyFired) { readyFired = true; if (typeof o.onReady === 'function') setTimeout(function () { if (!dead) try { o.onReady(api); } catch (e) { if (window.console) console.error(e); } }, 0); }
  }
  /* the trees' sway masks: kept with the painting; if missing, worked out in the background once it is shown */
  function scheduleSway() {
    var c = cur, spec = c.spec; if (c.swayData || c.swayTried) return; c.swayTried = true;
    setTimeout(function () {
      if (dead || cur !== c) return;
      enqueue(function () { if (dead || cur !== c) return null; return swayJob(jobFor(spec, { get cancelled() { return dead || cur !== c; } })); }).then(function (r) {
        if (dead || cur !== c || !r) return;
        c.swayData = r; sway = makeSway(r, c.geo); if (sway) sway.cur = c; swayTops(c.geo);
        cacheGet(spec.key).then(function (rec) { if (rec && rec.img && !rec.sway) { rec.sway = r; return cachePut(spec.key, rec); } }).catch(function () { });
      }).catch(function (e) { if (e !== CANCEL && window.console) console.warn('garden: sway', e); });
    }, 350);
  }
  function ovW() { return Math.round(Math.min(cur ? cur.spec.bw : 800, size.cssW * Math.min(size.dpr, 2))); }
  function ovH() { return Math.round(ovW() * (cur ? cur.spec.H / cur.spec.W : 0.75)); }
  var wl = null, ol = null, sl = null, fallers = [], petals = null, leafs = null, wfx = null, fws = null, dragons = null, flutters = null, rare = null, nextRoll = 25, frng = mulberry32(99), bird = null, clock = 0, lastTs = 0, raf = 0, fxSig = '', rainbowCued = '', taps = null, sway = null;
  function fxSignature() { var c = conditions(); return [c.w, c.after, c.fw, Math.round(c.p * 50)].join(','); }
  function setupFx() {
    sizeCanvas(fv, ovW(), ovH());
    var g = cur.geo, L = g.LIT, w = L.weather || 'clear', cd = conditions();
    fxSig = fxSignature();
    if (cur.mask) { wl = wl || mkCanvas(2, 2); sizeCanvas(wl, cur.mask.width, cur.mask.height); } else wl = null;
    if (cur.occ || g.anchors.length) { ol = ol || mkCanvas(2, 2); sizeCanvas(ol, cur.occ ? cur.occ.width : Math.round(cur.spec.bw / 2), cur.occ ? cur.occ.height : Math.round(cur.spec.bh / 2)); } else ol = null;
    // the calendar (precise, for the moving things) and the weather
    g.calP = cd.p; g.sak = g.season === 'spring' ? sakuraCal(cd.p) : null; g.leafAmt = g.season === 'autumn' ? leafAmt(cd.p) : 1;
    var wet = w === 'rain' || w === 'storm' || w === 'typhoon', gale = w === 'typhoon' || w === 'blizzard';
    g.noGust = wet || gale; g.gale = gale; g.wet = wet;
    if (g.fallers === 'leaf') g.nFall = Math.max(1, Math.round(g.nFall * (0.25 + 1.2 * g.leafAmt) * (wet ? 1.3 : 1)));
    if (g.fallers === 'snow') { g.nFall = w === 'snow' ? 120 : w === 'cloudy' ? 12 : 0; g.snowVar = w === 'snow'; }
    if (gale && g.fallers === 'leaf') g.nFall = 0;
    if (w === 'typhoon' || (w === 'blizzard' && g.season === 'winter')) g.birds = false;
    if (wet || gale || w === 'snow') g.flies = null;
    g.wind = windVec(windAt(nowDate())); g.wint = g.wint || 0;
    fallers = g.fallers && g.nFall ? initFallers(g, frng) : [];
    g.fallBoost = wet ? 1.25 : 1;
    petals = g.season === 'spring' && !gale ? makePetals(g, frng) : null;
    leafs = g.season === 'autumn' && !gale ? makeLeafGust(g, frng) : null;
    wfx = makeWeatherFx(g, frng); if (gale) makeGaleFx(wfx, g, frng);
    fws = cd.fw && cur.sky ? (fws && fws.g === g ? fws : makeFireworks(g, frng)) : null; if (fws) fws.g = g;
    if (cur.sky && !g.skyOpen) { try { var sk = cur.sky, sw = sk.width, sh = sk.height, sd = sk.getContext ? sk.getContext('2d').getImageData(0, 0, sw, sh).data : null; if (sd) g.skyOpen = function (x, y) { var i = Math.floor(x / g.W * sw), j = Math.floor(y / g.H * sh); return i >= 0 && j >= 0 && i < sw && j < sh && sd[(j * sw + i) * 4 + 3] > 128 ? 1 : 0; }; } catch (e) { /* no sky map */ } }
    if ((fws || wfx.w === 'storm' || wfx.w === 'typhoon') && cur.sky) { sl = sl || mkCanvas(2, 2); sizeCanvas(sl, fv.width, fv.height); } else sl = null;
    setupDragons();
    if (!bird || bird.season !== cur.spec.season) bird = { next: clock + 5 + frng() * 8, season: cur.spec.season };
    taps = [];
    if (!sway || sway.cur !== cur) { sway = makeSway(cur.swayData, g); if (sway) sway.cur = cur; }
    swayTops(g);
    if (L.after && g.season === 'summer' && g.light === 'day' && rainbowCued !== cur.spec.key) { rainbowCued = cur.spec.key; setTimeout(function () { if (!dead) cue('rainbow'); }, 0); }
  }
  function swayTops(g) { g.swayTops = sway ? sway.items.map(function (it) { return { x: it.d.base[0], y: it.d.top, w: Math.min(60, it.hgt * 0.8) }; }) : null; }   // where spindrift can lift off the crowns
  function setupDragons() {
    if (!cur) return;
    var g = cur.geo, d = hasDate() ? o.date : seasonFor() === g.season ? new Date() : null; // the insects' calendar
    var dry = !(g.wet || g.gale) && (g.LIT.weather || 'clear') !== 'snow';
    dragons = dry ? makeDragons(g, dragonMode(g.season, g.light, d), frng) : null; flutters = dry ? makeButterflies(g, butterflyMode(g.season, g.light, d), frng) : null;
  }
  /* ---- one overlay frame ---- */
  var reveal = null;
  function drawFrame(still) {
    if (!cur || dead) return;
    var g = cur.geo, t = clock, ctx = fv.getContext('2d'), sc = fv.width / g.W;
    var st = saveState();
    try {
      W = g.W; H = g.H; CAM = g.cam; KS = g.KS; MODE = 'n'; F = g.F; SEA = g.SEA; LIT = g.LIT; setLight(LIT);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, fv.width, fv.height);
      var motion = !still, swayOn = motion && !!sway && sway.active;
      // water: koi, glints and rings, cut to visible water
      if (wl && motion) {
        var wx = wl.getContext('2d'), ws = wl.width / g.W;
        wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'source-over'; wx.clearRect(0, 0, wl.width, wl.height);
        wx.setTransform(ws, 0, 0, ws, 0, 0); drawWaterLayer(wx, g, t); if (petals) drawFloatPetals(wx, petals, g, ws);
        if (leafs) drawLeafFloats(wx, leafs, g, ws); if (wfx) { drawRainRipples(wx, wfx, g); drawWhitecaps(wx, wfx, g); } if (fws) drawFireworkPond(wx, fws, g); if (taps && taps.length) drawTapsWater(wx, taps, g, clock);
        wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'destination-in'; wx.drawImage(cur.mask, 0, 0); wx.globalCompositeOperation = 'source-over';
        ctx.drawImage(wl, 0, 0, fv.width, fv.height);
      }
      // anchors: waterfall, tsukubai, shishi-odoshi, cut by what stands in front of them
      if (ol && g.anchors.length) {
        var ox = ol.getContext('2d'), os = ol.width / g.W;
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'source-over'; ox.clearRect(0, 0, ol.width, ol.height);
        ox.setTransform(os, 0, 0, os, 0, 0); drawAnchorLayer(ox, g, t, still);
        if (cur.occ) { ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'destination-out'; ox.drawImage(cur.occ, 0, 0, ol.width, ol.height); ox.globalCompositeOperation = 'source-over'; }
        if (!swayOn) ctx.drawImage(ol, 0, 0, fv.width, fv.height);
      }
      // the open sky: racing cloud, fireworks, lightning, cut by everything in front of the sky
      if (sl && motion && cur.sky) {
        var sx = sl.getContext('2d');
        sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1; sx.clearRect(0, 0, sl.width, sl.height);
        sx.setTransform(sc, 0, 0, sc, 0, 0); if (wfx) { drawGaleSky(sx, wfx, g); drawBoltSky(sx, wfx); } if (fws) drawFireworks(sx, fws, g);
        sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'destination-in'; sx.drawImage(cur.sky, 0, 0, sl.width, sl.height); sx.globalCompositeOperation = 'source-over';
        ctx.drawImage(sl, 0, 0);
      }
      // the trees in the wind (over the sky, under the waterfall and everything that moves)
      if (swayOn) { drawSway(ctx, sway, g, cur.img, fv.width / g.W); if (ol && g.anchors.length) ctx.drawImage(ol, 0, 0, fv.width, fv.height); }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      if (g.event === 'kodomo') drawKoinobori(ctx, g, still ? 0 : t);
      else if (g.event === 'tanabata') drawTanabata(ctx, g, still ? 0 : t);
      if (motion) {
        drawMist(ctx, g, t);
        drawFlicker(ctx, g, t);
        drawFlies(ctx, g, t);
        drawFallers(ctx, fallers, g);
        if (leafs) drawLeafGust(ctx, leafs, g);
        if (petals) drawPetals(ctx, petals, g, sc);
        if (dragons) drawDragons(ctx, dragons, g, t);
        if (flutters) drawButterflies(ctx, flutters, g, t);
        if (rare) { RARE_LAST = null; if (!drawRare(ctx, rare, g)) rare = null; else if (RARE_LAST) rare.scr = { x: RARE_LAST.x, y: RARE_LAST.y, k: RARE_LAST.k }; }
        if (g.birds && bird && bird.cur) drawBird(ctx, g, bird.cur, t);
        if (taps && taps.length) drawTaps(ctx, taps, g, clock);
        if (wfx) { drawWeatherFx(ctx, wfx, g); drawGaleFx(ctx, wfx, g); drawFlash(ctx, wfx, g); }
      }
      if (reveal) drawReveal(ctx, g);
    } catch (e) { if (window.console) console.error(e); }
    finally { restoreState(st); }
  }
  function cue(name, data) { if (typeof o.onCue === 'function') { try { if (data) o.onCue(name, data); else o.onCue(name); } catch (e) { if (window.console) console.error(e); } } }
  function inGeo(g, fn) { var st = saveState(); try { W = g.W; H = g.H; CAM = g.cam; KS = g.KS; MODE = 'n'; F = g.F; SEA = g.SEA; LIT = g.LIT; setLight(LIT); return fn(); } finally { restoreState(st); } }
  function rareOk(r, g) {
    var F0 = g.F, w = g.LIT.weather || 'clear';
    if (w === 'typhoon') return false;                                   // everything shelters from a typhoon
    if (w === 'blizzard') return r.id === 'usagi';                       // only the hare might show in a blizzard
    if ((w === 'rain' || w === 'storm') && (r.id === 'hotaru' || r.id === 'ooruri' || r.id === 'mejiro')) return false;
    if ((r.id === 'kawasemi' || r.id === 'sagi' || r.id === 'hotaru') && !F0.pond) return false;
    if (r.id === 'rurubitaki' && !F0.lantern) return false;
    if (r.id === 'ooruri' && !(F0.pine > 0)) return false;
    if (r.id === 'uguisu' && !(F0.azaleas > 0)) return false;
    if (r.id === 'kitsune' && !F0.fence) return false;
    return rareFits(r, g, o.date !== undefined && o.date !== null ? o.date : seasonFor() === g.season ? new Date() : null);
  }
  function summon(id) {
    if (!cur) return false;
    var r = null; RARE.forEach(function (q) { if (q.id === id) r = q; }); if (!r) return false;
    var g = cur.geo; rare = inGeo(g, function () { return startRare(id, g, frng); });
    cue('rare', { id: r.id, name: r.name });
    return true;
  }
  function rollRare(g) {
    var cands = RARE.filter(function (r) { return rareOk(r, g); }); if (!cands.length) return;
    var sw = 0; cands.forEach(function (r) { sw += r.w; });
    if (frng() >= 0.06) return;   // about one sighting every 6-10 minutes of watching
    var x = frng() * sw; for (var i = 0; i < cands.length; i++) { x -= cands[i].w; if (x <= 0) { summon(cands[i].id); return; } }
  }
  /* ---- touch: hit-test the tap and answer it ---- */
  var waterHit = null;
  function isWater(x, y, strict) {
    if (!cur || !cur.mask) return false;
    if (!waterHit) { try { var w = 160, h = Math.round(160 * cur.geo.H / cur.geo.W), c = mkCanvas(w, h), cx = c.getContext('2d'); cx.drawImage(cur.mask, 0, 0, w, h); var d = cx.getImageData(0, 0, w, h).data, A = new Uint8Array(w * h); for (var i = 0; i < w * h; i++) A[i] = d[i * 4 + 3] > 90 ? 1 : 0; waterHit = { w: w, h: h, a: A, img: cur.mask }; } catch (e) { return false; } }
    var i2 = Math.floor(x / cur.geo.W * waterHit.w), j2 = Math.floor(y / cur.geo.H * waterHit.h);
    var rg = strict ? 0 : 1;
    for (var dj = -rg; dj <= rg; dj++) for (var di = -rg; di <= rg; di++) { var ii = i2 + di, jj = j2 + dj; if (ii >= 0 && jj >= 0 && ii < waterHit.w && jj < waterHit.h && waterHit.a[jj * waterHit.w + ii]) return true; }
    return false;
  }
  /* the visitor as drawn this moment (a coverage map at 2 px per unit), for tapping it where it is */
  function rarePixels() {
    if (!rare || !cur) return null;
    var g = cur.geo;
    try {
      return inGeo(g, function () {
        var k = 2, c = mkCanvas(Math.ceil(g.W * k), Math.ceil(g.H * k)), x = c.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0);
        if (!drawRare(x, rare, g)) return null;
        var d = x.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height, n = 0, i, cxs = 0, cys = 0;
        for (i = 0; i < w * h; i++) if (d[i * 4 + 3] > 60) { n++; cxs += i % w; cys += (i / w) | 0; }
        if (!n) return null;
        function at(px, py) { var i2 = Math.floor(px * k), j2 = Math.floor(py * k); return i2 >= 0 && j2 >= 0 && i2 < w && j2 < h && d[(j2 * w + i2) * 4 + 3] > 60; }
        return { n: n, cx: cxs / n / k, cy: cys / n / k, at: at, near: function (px, py, r) { for (var rr = 0; rr <= r; rr += 2) { var m = rr ? Math.max(8, Math.round(rr * 1.6)) : 1; for (var q = 0; q < m; q++) { var a = q / m * TAU; if (at(px + Math.cos(a) * rr, py + Math.sin(a) * rr)) return true; } } return false; } };
      });
    } catch (e) { return null; }
  }
  function tap(nx, ny) {
    if (!cur || dead || !(nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1)) return null;
    var g = cur.geo, x = nx * g.W, y = ny * g.H, best = null, slop = 10;
    if (waterHit && waterHit.img !== cur.mask) waterHit = null;
    // a visitor on screen comes first
    if (rare && rare.scr) { var rd = rarePixels(); if (rd ? rd.near(x, y, slop) : Math.hypot(x - rare.scr.x, y - (rare.scr.y - rare.scr.k * 0.3)) < Math.max(16, rare.scr.k * 0.7) + slop) best = { id: 'rare' }; }
    if (!best) {
      var T = inGeo(g, function () { return hitTargets(g); }), sc = 1e9, md = cur.swayData && cur.swayData.hits ? cur.swayData : null, waterFirst;
      if (md) { // the masks of what is actually drawn: an exact hit on the thing under the finger, else the nearest within reach
        var mh = maskHit(md, x, y, slop);
        if (mh) {
          if (mh.id === 'stone') best = { id: 'stone', perch: mh.perch, x: x, y: y, r: 0 };
          else T.forEach(function (h) { if (h.id === mh.id && (mh.id !== 'tree' || h.tag === mh.tag)) best = h; });
        }
        waterFirst = mh ? mh.d > 0 && isWater(x, y, true) : isWater(x, y);
        if (!mh && !waterFirst) T.forEach(function (h) { var dd = Math.hypot(x - h.x, y - h.y); if (h.id !== 'tree' && h.id !== 'stone' && dd < h.r * 0.85) { var s = dd / h.r; if (s < sc) { sc = s; best = h; } } });   // in the gaps of an open thing (between the racemes)
      } else {
        // the most central target under the finger (a stone at its middle beats the edge of a big tree circle); importance breaks near ties
        T.forEach(function (h) { var dd = Math.hypot(x - h.x, y - h.y); if (dd < h.r + slop) { var s = dd / Math.max(1, h.r) - (h.pri || 0) * 0.06; if (s < sc) { sc = s; best = h; } } });
        waterFirst = (!best || best.id === 'tree' || best.id === 'stone') ? isWater(x, y) : isWater(x, y, true) && sc > 0.55;
      }
      if (waterFirst) {
        var wpt = inGeo(g, function () { var q = groundAt(x, y, WL); return q ? [q.x, q.z] : null; });
        if (wpt) best = { id: g.koi && g.koi.length ? 'koi' : 'water', w: wpt };
      }
    }
    if (!best) return null;
    if (!taps) taps = [];
    var o2 = inGeo(g, function () { return startTap(best, g, clock, frng, cue, rare); });
    taps.push(o2); if (taps.length > 8) taps.shift();
    if (best.id === 'tree' && best.tag) swayKick(sway, best.tag, g.wind && g.wind.side < 0 ? -1 : 1);
    if (!running()) { drawFrame(true); } loopCheck();
    return best.id === 'tree' ? { hit: 'tree', tree: best.tag || null } : { hit: best.id };
  }
  function crossed(prev, now2, period, phase) { return Math.floor((now2 - phase) / period) > Math.floor((prev - phase) / period) && now2 >= phase; }
  function tickFx(dt) {
    if (!cur) return;
    var g = cur.geo, prev = clock - dt;
    // the shared wind (gusts blow the same way, 2-3x as hard); in a typhoon or blizzard it stays at gale strength
    if (!g.windRaw || clock - g.windT > 0.5 || clock < g.windT) { g.windRaw = windAt(nowDate()); g.windT = clock; }   // the shared model, twice a second
    var wa = g.windRaw; if (g.gale) wa = { dir: wa.dir, strength: 0.9 + 0.1 * vnoise1(77, clock / 0.8) };
    var gk = Math.max(petals ? petals.gustK || 0 : 0, leafs ? leafs.gustK || 0 : 0, wfx ? wfx.gustK || 0 : 0);
    g.wind = windVec(wa, gk * 1.6); g.wint = (g.wint || 0) + g.wind.x * (0.6 + 0.8 * g.wind.s) * dt;
    if (wfx) stepWeatherFx(wfx, g, dt, clock, frng, cue);
    if (wfx && wfx.gale) stepGaleFx(wfx, g, dt, frng, cue);
    if (leafs) { stepLeafGust(leafs, g, dt, clock, frng); if (leafs.started) { leafs.started = false; cue('gust'); } }
    if (fws) { var nd = nowDate(), fin = o.fireworks === true && !hasDate() ? (fws.t % 240) > 222 : nd.getHours() === 20 && nd.getMinutes() >= 39; stepFireworks(fws, g, dt, frng, cue, fin); }
    if (taps && taps.length) stepTaps(taps, g, dt, clock, frng, cue);
    if (sway) stepSway(sway, g, dt, wfx);
    if (g.snowVar && fallers.length) g.snowK = 0.3 + 0.7 * vnoise1(91, clock / 18);
    if (rare) { rare.t += dt; if (rare.cueSplash) { rare.cueSplash = false; cue('splash'); } }
    else if (!reveal && clock > nextRoll) { nextRoll = clock + 20 + frng() * 20; rollRare(g); }
    if (g.F.shishi && crossed(prev + (g.shPh || 0), clock + (g.shPh || 0), 9.2, 8.25)) cue('shishi');
    if (g.F.tsukubai && !g.SEA.snow && crossed(prev, clock, DRIP_PER * 4, 0.22)) cue('drip'); // the sound on every fourth drip
    if (g.koi && g.koi.length) {
      if (g.nextSplash === undefined) g.nextSplash = clock + 12 + frng() * 18;
      if (clock > g.nextSplash) {
        var kk = g.koi[(frng() * g.koi.length) | 0], q = koiPose(kk, clock, g);
        if (!g.SEA.snow || pondSDF(q.x, q.z) < -0.7) { g.splashes = g.splashes || []; g.splashes.push({ x: q.x + q.dx * 0.15, z: q.z + q.dz * 0.15, t0: clock }); cue('splash'); }
        g.nextSplash = clock + 30 + frng() * 30;
      }
      if (g.splashes) g.splashes = g.splashes.filter(function (sp) { return clock - sp.t0 < 2.2; });
    }
    if (fallers.length) stepFallers(fallers, g, dt, frng);
    if (dragons) stepDragons(dragons, g, dt, frng);
    if (flutters) stepButterflies(flutters, g, dt, frng);
    if (petals) { stepPetals(petals, g, dt, clock, frng); if (petals.gustStarted) { petals.gustStarted = false; cue('gust'); } }
    if (g.birds && bird) {
      if (bird.cur && clock > bird.cur.t0 + bird.cur.dur) bird.cur = null;
      if (!bird.cur && clock > bird.next) {
        var ltr = frng() < 0.5, y = g.horizonY * (0.15 + frng() * 0.45);
        cue('bird');
        bird.cur = { t0: clock, dur: 8 + frng() * 5, x0: ltr ? -12 : g.W + 12, x1: ltr ? g.W + 12 : -12, y: y, rise: (frng() - 0.3) * 20, flap: 9 + frng() * 4, s: 0.8 + frng() * 0.5 };
        bird.next = clock + (22 + frng() * 30) * (g.wet || g.LIT.weather === 'snow' ? 6 : 1);   // birds keep under cover in the rain
      }
    }
    if (reveal) stepReveal(dt);
  }
  /* ---- the loop: ~30 fps, only while visible and wanted ---- */
  function running() { return !!cur && !dead && !user.paused && !hidden && onScreen && !reducedMotion() && (o.animate !== false || !!reveal); }
  function loop(ts) {
    raf = 0;
    if (!running()) return;
    raf = requestAnimationFrame(loop);
    if (lastTs && ts - lastTs < 31) return;
    var dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 1 / 30; lastTs = ts;
    clock += dt; tickFx(dt); drawFrame(false);
  }
  function loopCheck() {
    if (running()) { if (!raf) { lastTs = 0; raf = requestAnimationFrame(loop); } }
    else { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  }
  /* ---- the reveal for a new stage ---- */
  var revealWait = null;
  function startReveal(oldImg, focus, shown) {
    var g = cur.geo, rw = ovW(), rh = ovH();
    sizeCanvas(tv, rw, rh); tv.style.transition = 'none'; tv.style.opacity = '1';
    var fx = focus[0] * g.W, fy = focus[1] * g.H, sp = [], r = mulberry32(7 + cur.spec.stage);
    var kind = cur.spec.season === 'spring' ? 'petal' : cur.spec.season === 'autumn' ? 'leaf' : cur.spec.season === 'winter' ? 'snow' : 'mote';
    for (var i = 0; i < 46; i++) { var a = r() * TAU, v = 10 + r() * 34; sp.push({ x: fx + Math.cos(a) * 3, y: fy + Math.sin(a) * 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 12 - r() * 10, s: 0.7 + r() * 1.3, ph: r() * TAU, d: 0.15 + r() * 0.5, petal: i % 3 === 0 ? kind : null, rot: r() * TAU, col: kind === 'leaf' ? ramp([[180, 40, 24], [226, 100, 40], [236, 170, 70]], r()) : [250, 214, 226] }); }
    reveal = { old: oldImg, t: shown ? 0.36 : 0, dur: 2.5, fx: fx, fy: fy, sp: sp };
    paintRevealOld();
    loopCheck();
    if (!running()) finishReveal();
  }
  function paintRevealOld() {
    var R = reveal, x = tv.getContext('2d'), w = tv.width, h = tv.height, g = cur.geo;
    var u = R.t / R.dur, fade = clamp(u / 0.14), wipe = sstep(0.14, 0.96, u);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, w, h);
    x.drawImage(R.old, 0, 0, w, h);
    if (wipe > 0) {
      var cx = R.fx / g.W * w, cy = R.fy / g.H * h, far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
      var feather = far * 0.35, rad = wipe * (far + feather), r0 = Math.max(0, rad - feather);
      var gr = x.createRadialGradient(cx, cy, r0, cx, cy, Math.max(r0 + 1, rad));
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h);
      if (r0 > 0) { x.beginPath(); x.arc(cx, cy, r0, 0, TAU); x.fill(); }
      x.globalCompositeOperation = 'source-over';
    }
    tv.style.opacity = String(fade);
  }
  function stepReveal(dt) {
    var R = reveal; R.t += dt;
    for (var i = 0; i < R.sp.length; i++) { var p = R.sp[i]; if (R.t < 0.35 + p.d) continue; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy = p.vy * 0.97 + (p.petal ? 6 : -2) * dt; p.rot += dt * 2; }
    if (R.t >= R.dur) finishReveal(); else paintRevealOld();
  }
  function drawReveal(ctx, g) {
    var R = reveal, u = R.t / R.dur;
    // a soft bloom of light at the focus, then sparkles and petals drifting out
    var bl = Math.sin(clamp((u - 0.1) / 0.75) * Math.PI);
    ctx.globalCompositeOperation = 'lighter';
    stamp(ctx, sprite('spark'), R.fx, R.fy, 26 + 40 * u, 20 + 30 * u, 0.7 * bl);
    for (var i = 0; i < R.sp.length; i++) {
      var p = R.sp[i], age = R.t - (0.35 + p.d); if (age < 0) continue;
      var life = clamp(1 - age / 1.9); if (life <= 0) continue;
      if (p.petal) continue;
      var tw = 0.6 + 0.4 * Math.sin(R.t * 12 + p.ph);
      stamp(ctx, sprite('spark'), p.x, p.y, 3.0 * p.s, 0, life * tw);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < R.sp.length; i++) {
      var q = R.sp[i], a2 = R.t - (0.35 + q.d); if (a2 < 0 || !q.petal) continue;
      var l2 = clamp(1 - a2 / 2.0); if (l2 <= 0) continue;
      ctx.globalAlpha = l2;
      if (q.petal === 'snow' || q.petal === 'mote') { ctx.fillStyle = q.petal === 'snow' ? 'rgba(255,255,255,0.95)' : 'rgba(255,240,190,0.9)'; ctx.beginPath(); ctx.arc(q.x, q.y, 0.9 * q.s, 0, TAU); ctx.fill(); }
      else { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(q.rot * 1.3))); if (q.petal === 'leaf') leafShape(ctx, 0, 0, 1.6 * q.s, -Math.PI / 2, 1, rgb(mulc(q.col, g.tint))); else { ctx.fillStyle = rgb(mulc(q.col, g.tint)); ctx.beginPath(); ctx.ellipse(0, 0, 1.2 * q.s, 0.7 * q.s, 0, 0, TAU); ctx.fill(); } ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
  function finishReveal() {
    if (!reveal) return;
    reveal = null;
    var x = tv.getContext('2d'); x.clearRect(0, 0, tv.width, tv.height); tv.style.transition = 'none'; tv.style.opacity = '0';
    drawFrame(!running()); loopCheck();
  }

  /* ---- applying options ---- */
  function wantKey() { return size ? specFor(o.quality).key : null; }
  function refresh(fade) {
    if (dead) return Promise.resolve();
    if (!size) { size = measure(); if (!size) return Promise.resolve(); placeholder(); }
    var target = specFor(o.quality), myWant = want = target.key;
    cancelOthers([target.key, specFor('preview').key]);
    if (cur && cur.spec.key === target.key) return Promise.resolve();
    var chain;
    if (o.quality === 'full') {
      // a quick preview first, unless the full painting is already cached
      chain = cacheGet(target.key).then(function (rec) {
        if (rec && rec.img) return obtain(target).then(function (r) { if (want === myWant) present(r, fade); });
        var pv = specFor('preview');
        var p0 = (cur && cur.spec.stage === target.stage && cur.spec.season === target.season && cur.spec.light === target.light) ? Promise.resolve(null)
          : obtain(pv).then(function (r) { if (want === myWant) present(r, fade); });
        return p0.then(function () { if (want !== myWant) throw CANCEL; return obtain(target); }).then(function (r) { if (want === myWant) present(r, true); });
      });
    } else chain = obtain(target).then(function (r) { if (want === myWant) present(r, fade); });
    return chain.catch(function (e) { if (e !== CANCEL && window.console) console.error(e); });
  }
  var lastReq = Promise.resolve();
  function update(n) {
    if (dead) return api;
    var before = { stage: o.stage, season: o.season, light: o.light, quality: o.quality, event: o.event, date: o.date, tag: size ? conditions().tag : '' };
    merge(n);
    clearTimeout(pendingTimer); pendingTimer = null;
    var same = before.season === o.season && before.light === o.light && before.quality === o.quality && before.event === o.event && (!size || before.tag === conditions().tag);
    if (cur && fxSignature() !== fxSig) setupFx(); else if (before.date !== o.date) setupDragons();   // the weather, the fireworks or the calendar moved on
    if (same && before.stage === o.stage && cur && cur.spec.key === wantKey()) { loopCheck(); return api; }
    if (same && cur && o.stage > before.stage && !reveal) {
      // a stage up: hold the current painting a moment, in case a reveal is about to be played
      var s0 = o.stage; obtain(specFor(o.quality)).catch(function () { });
      pendingTimer = setTimeout(function () { pendingTimer = null; if (o.stage === s0) lastReq = refresh(true); }, 900);
      return api;
    }
    lastReq = refresh(true);
    loopCheck();
    return api;
  }
  function playStageUp(from, to) {
    if (dead) return Promise.resolve();
    from = Math.max(0, Math.min(STAGES.length - 1, Math.round(+from || 0)));
    to = to === undefined ? o.stage : Math.max(0, Math.min(STAGES.length - 1, Math.round(+to || 0)));
    clearTimeout(pendingTimer); pendingTimer = null;
    if (reveal) finishReveal();
    var shownOld = cur && cur.spec.stage === from ? cur.img : null, keepOld = null;
    if (shownOld) { keepOld = mkCanvas(ovW(), ovH()); keepOld.getContext('2d').drawImage(shownOld, 0, 0, keepOld.width, keepOld.height); }
    o.stage = to;
    var spec = size ? specFor(o.quality === 'full' ? 'preview' : 'card', { stage: from, season: o.season, light: o.light, event: o.event }) : null;
    var oldP = keepOld ? Promise.resolve(keepOld) : spec ? enqueueOld(spec) : Promise.resolve(null);
    var myRev = revealWait = {};
    return oldP.then(function (oldImg) {
      if (dead || revealWait !== myRev) return;
      return (keepOld ? refreshNoFade() : lastReq.then(function () { return refresh(false); })).then(function () {
        if (dead || revealWait !== myRev || !cur) return;
        if (!oldImg || reducedMotion()) { // no motion: a gentle crossfade
          if (oldImg) { sizeCanvas(tv, ovW(), ovH()); tv.getContext('2d').drawImage(oldImg, 0, 0, tv.width, tv.height); tv.style.transition = 'none'; tv.style.opacity = '1'; void tv.offsetWidth; tv.style.transition = 'opacity 0.5s ease'; tv.style.opacity = '0'; }
          return;
        }
        var g = cur.geo, f = withScene({ W: g.W, H: g.H, KS: 1, stage: to, season: o.season, light: o.light }, function () { return focusFor(to, g.W, g.H); });
        startReveal(oldImg, f, !!keepOld);
      });
    }).catch(function (e) { if (e !== CANCEL && window.console) console.error(e); });
    function refreshNoFade() {
      // the old painting stays on the top canvas while the new one is put underneath
      sizeCanvas(tv, ovW(), ovH()); tv.getContext('2d').drawImage(keepOld, 0, 0, tv.width, tv.height); tv.style.transition = 'none'; tv.style.opacity = '1';
      return refresh(false);
    }
  }
  function enqueueOld(spec) {
    // the old painting: from the cache or painted (not shown, not cached under the current key)
    var J = { cancelled: false };
    return cacheGet(spec.key).then(function (rec) {
      if (rec && rec.img) return blobToCanvas(rec.img);
      return enqueue(function () { return renderStatic({ stage: spec.stage, season: spec.season, light: spec.light, event: spec.event, W: spec.W, H: spec.H, KS: spec.KS, DQ: spec.DQ, bw: spec.bw, bh: spec.bh, mask: false, cancelled: false }).then(function (r) { return r.canvas; }); });
    }).then(function (c) {
      if (!c) return null;
      var k = mkCanvas(ovW(), ovH()); k.getContext('2d').drawImage(c, 0, 0, k.width, k.height); return k;
    }).catch(function () { return null; });
  }

  /* ---- observers ---- */
  function onVis() { hidden = document.hidden; loopCheck(); }
  document.addEventListener('visibilitychange', onVis);
  var io = null, ro = null, rmq = null;
  try {
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; }); loopCheck(); }, { threshold: 0 });
      io.observe(el);
    }
  } catch (e) { io = null; }
  var rsTimer = null;
  try {
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(function () {
        clearTimeout(rsTimer);
        rsTimer = setTimeout(function () {
          if (dead) return;
          var m = measure(); if (!m) return;
          if (!size) { size = m; placeholder(); lastReq = refresh(false); return; }
          var dw = Math.abs(m.cssW - size.cssW) / size.cssW, ar = Math.abs(m.cssH / m.cssW - size.cssH / size.cssW);
          if (dw > 0.12 || ar > 0.02 || m.dpr !== size.dpr) { size = m; if (!reveal) lastReq = refresh(true); }
        }, 250);
      });
      ro.observe(el);
    }
  } catch (e) { ro = null; }
  function onRM() { loopCheck(); if (!running()) drawFrame(true); }
  try { reducedMotion(); if (REDUCED) { rmq = REDUCED; if (rmq.addEventListener) rmq.addEventListener('change', onRM); else if (rmq.addListener) rmq.addListener(onRM); } } catch (e) { rmq = null; }

  var api = {
    update: update,
    playStageUp: playStageUp,
    pause: function () { user.paused = true; loopCheck(); return api; },
    resume: function () { user.paused = false; loopCheck(); return api; },
    destroy: function () {
      if (dead) return;
      dead = true; cancelOthers([]); clearTimeout(pendingTimer); clearTimeout(rsTimer);
      if (raf) cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('visibilitychange', onVis);
      try { if (io) io.disconnect(); if (ro) ro.disconnect(); if (rmq) { if (rmq.removeEventListener) rmq.removeEventListener('change', onRM); else if (rmq.removeListener) rmq.removeListener(onRM); } } catch (e) { /* ignore */ }
      [cv, tv, fv].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.width = c.height = 0; });
      if (wl) wl.width = wl.height = 0; if (ol) ol.width = ol.height = 0; sway = null;
      cur = null; reveal = null; fallers = []; petals = null; dragons = null; flutters = null; rare = null;
    },
    _summon: function (id) { var ok = summon(id); loopCheck(); return ok; },
    tap: tap,
    get _dbg() { return { fv: fv, cv: cv, tv: tv, cur: cur, wl: wl, ol: ol, petals: petals, leafs: leafs, wfx: wfx, fws: fws, taps: taps, sway: sway, fallers: fallers, dragons: dragons, flutters: flutters, rare: rare, clock: clock, conditions: conditions, targets: function () { if (!cur) return []; var g = cur.geo; return inGeo(g, function () { var T = hitTargets(g).map(function (h) { return { id: h.id, kind: h.kind, tag: h.tag, nx: h.x / g.W, ny: h.y / g.H, r: h.r / g.W, pri: h.pri }; }); if (g.F.pond) { var pc = P(LAY.pondA[0] + 0.3, WL, LAY.pondA[1] - 0.2); T.push({ id: 'pond', nx: pc.x / g.W, ny: pc.y / g.H }); } return T; }); }, frame: function () { clock += 1 / 30; tickFx(1 / 30); drawFrame(false); }, rarePixels: rarePixels }; },
    get stats() { return { source: stats.source, ms: stats.ms, history: stats.history.slice(), running: running() }; }
  };
  if (size) lastReq = refresh(false);
  return api;
}

/* ---- 99_export.js ---- */
/* ================= export ================= */
var API = {
  VERSION: VERSION,
  STAGES: STAGES,
  EVENTS: EVENTS.slice(),
  RARE: RARE.map(function (r) { return { id: r.id, name: r.name, season: r.season.slice(), light: r.light.slice(), minStage: r.minStage, desc: r.desc }; }),
  WEATHERS: WEATHERS.slice(),
  windAt: function (date) { return windAt(toDate(date)); },          // {dir: degrees (0 toward screen right, 180 toward left), strength 0..1}
  weatherAt: function (date) { return weatherAt(toDate(date)); },
  fireworksAt: function (date) { return fireworksAt(toDate(date)); },
  stageFor: stageFor,
  seasonFor: seasonFor,
  lightFor: lightFor,
  mount: mount
};
try { Object.defineProperty(API, '_dbg', { value: { renderStatic: renderStatic, LAY: LAY, BRIDGE: BRIDGE, makeCam: makeCam, focusFor: focusFor, idbOpen: idbOpen }, enumerable: false }); } catch (e) { /* ignore */ }
window.MogiGarden = API;

})();
