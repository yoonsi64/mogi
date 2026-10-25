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
    // translucency: where the light comes through the edge of the canopy (strongest with a low sun), the leaves glow a warm yellow-green
    if (o.kind !== 'needle' && !o.snow && LIT && LIT.id !== 'night' && rs > 3) {
      var tl = (LIT.id === 'day' ? 0.22 : 0.55) * (o.transK === undefined ? 1 : o.transK), gp = new Path2D(), nT = Math.min(60, cnt * 0.12);
      for (var kt = 0; kt < nT; kt++) { var at = Math.atan2(LS[1], LS[0]) + (rng() - 0.5) * 2.0, rt = 0.78 + rng() * 0.32, tx2 = Math.cos(at) * rt, ty2 = Math.sin(at) * rt * fl; leafAdd(gp, p.x + tx2 * rs, p.y + ty2 * rs, ds * (0.6 + rng() * 0.6), rng() * TAU, o.kind); }
      var top = ramp(o.pal, 1), glow = [Math.min(255, top[0] * 0.75 + 255 * SUNC[0] * 0.35), Math.min(255, top[1] * 0.75 + 240 * SUNC[1] * 0.35), Math.min(255, top[2] * 0.6 + 120 * SUNC[2] * 0.3)];
      ctx.globalAlpha = tl; ctx.fillStyle = rgb(tc(glow, tint)); ctx.fill(gp); ctx.globalAlpha = 1;
    }
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
/* the zig-zag plank bridge, painted in short pieces (each sorted on its own depth, so an iris in front of a plank covers it
   and one behind is cut cleanly at the plank's edge) */
var YATSU_W = 0.16, YATSU_EXT = 0.18, YATSU_STEP = 0.24;
function yatsuSeg(i) { var a = YATSU[i], b = YATSU[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L; return { A: [a[0] - ux * YATSU_EXT, a[1] - uz * YATSU_EXT], B: [b[0] + ux * YATSU_EXT, b[1] + uz * YATSU_EXT], ux: ux, uz: uz, nx: -uz, nz: ux, L: L + 2 * YATSU_EXT }; }
function yatsuNear(x, z, m) { // is (x, z) under a plank (or within m of one)?
  for (var i = 0; i < YATSU.length - 1; i++) { var s = yatsuSeg(i), rx = x - s.A[0], rz = z - s.A[1], u = rx * s.ux + rz * s.uz, v = rx * s.nx + rz * s.nz; if (u > -m && u < s.L + m && Math.abs(v) < YATSU_W + m) return true; }
  return false;
}
function yatsuPieces() { var out = []; for (var i = 0; i < YATSU.length - 1; i++) { var s = yatsuSeg(i), n = Math.max(1, Math.round(s.L / YATSU_STEP)); for (var j = 0; j < n; j++) { var t0 = j / n, t1 = (j + 1) / n; out.push({ i: i, t0: t0, t1: t1, x: lerp(s.A[0], s.B[0], (t0 + t1) / 2), z: lerp(s.A[1], s.B[1], (t0 + t1) / 2) }); } } return out; }
function drawYatsuPiece(ctx, pc) {
  var S = sil(), y = 0.12, w = YATSU_W, s = yatsuSeg(pc.i), A = s.A, B = s.B, nx = s.nx, nz = s.nz, t0 = pc.t0, t1 = Math.min(1, pc.t1 + 0.03 / s.L);
  // posts (under the planks)
  [0.12, 0.5, 0.88].forEach(function (t) { if (t < pc.t0 || t >= pc.t1) return; [-1, 1].forEach(function (sd) { var px = lerp(A[0], B[0], t) + nx * w * 0.8 * sd, pz = lerp(A[1], B[1], t) + nz * w * 0.8 * sd; prism(ctx, px, pz, WL - 0.1, y - 0.02, 0.03, 0.03, 6, 0, [80, 64, 48], { snow: 0 }); }); });
  // two planks side by side
  [-1, 1].forEach(function (sd) {
    var rng = mulberry32(203 + pc.i * 7 + (sd > 0 ? 3 : 0)), o0 = sd > 0 ? 0 : -w, o1 = sd > 0 ? w : 0;
    var a0 = [lerp(A[0], B[0], t0), lerp(A[1], B[1], t0)], b0 = [lerp(A[0], B[0], t1), lerp(A[1], B[1], t1)];
    var pts = [[a0[0] + nx * o0, y, a0[1] + nz * o0], [b0[0] + nx * o0, y, b0[1] + nz * o0], [b0[0] + nx * o1, y, b0[1] + nz * o1], [a0[0] + nx * o1, y, a0[1] + nz * o1]];
    var alb = snowAlb(mixc([126, 104, 80], [160, 136, 106], rng()), 1);
    // the near long edge of the plank (whichever side faces the camera)
    var nearO = nz > 0 ? o0 : o1, e0 = [a0[0] + nx * nearO, y, a0[1] + nz * nearO], e1 = [b0[0] + nx * nearO, y, b0[1] + nz * nearO];
    quad3(ctx, [e0, e1, [e1[0], y - 0.06, e1[2]], [e0[0], y - 0.06, e0[2]]], S ? [0, 0, 0] : shade([90, 70, 52], [0, 0, -1]), 0.3);
    if (pc.t0 === 0 || pc.t1 === 1) { var tt = pc.t0 === 0 ? t0 : t1, c0 = [lerp(A[0], B[0], tt) + nx * o0, lerp(A[1], B[1], tt) + nz * o0], c1 = [lerp(A[0], B[0], tt) + nx * o1, lerp(A[1], B[1], tt) + nz * o1];
      quad3(ctx, [[c0[0], y, c0[1]], [c1[0], y, c1[1]], [c1[0], y - 0.06, c1[1]], [c0[0], y - 0.06, c0[1]]], S ? [0, 0, 0] : shade([84, 66, 50], [0, 0, -1]), 0.3); }
    quad3(ctx, pts, S ? [0, 0, 0] : shade(alb, [0, 1, 0]), 0.4);
    if (!S) { var g0 = Pa(pts[0]), g1 = Pa(pts[1]); ctx.strokeStyle = 'rgba(50,36,26,0.4)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.stroke(); }
  });
}
function drawYatsuhashi(ctx) { yatsuPieces().sort(function (a, b) { return P(b.x, 0, b.z).d - P(a.x, 0, a.z).d; }).forEach(function (pc) { drawYatsuPiece(ctx, pc); }); }

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
/* a cumulus: a density mask of soft lobes (cauliflower tops, a flat base where it condenses), then shaded on its own:
   lit tops and the sunward side, a cool shadowed base, each lobe modelled by a dark dab away from the light and a bright
   one toward it, the rim breaking up into wisps. C: { lit, mid, shd, A } colour arrays */
function cloudPuff(ctx, x, y, w, h, rng, C, sgn, o) {
  o = o || {};
  var tf = ctx.getTransform ? ctx.getTransform() : null, sc = tf ? Math.max(0.5, Math.min(4, Math.hypot(tf.a, tf.b))) : 2;
  var pad = h * 1.2, cw = w * 1.25 + pad * 2, ch = h * (o.tall || 2.2) + pad, cv = mkCanvas(Math.ceil(cw * sc), Math.ceil(ch * sc)), c = cv.getContext('2d');
  c.setTransform(sc, 0, 0, sc, 0, 0);
  var bx = cw / 2, by = ch - pad * 0.55, i, j, lobes = [];
  function dab(cx, cy, r, a, col) { var g = c.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, rgb(col || [255, 255, 255], a)); g.addColorStop(0.55, rgb(col || [255, 255, 255], a * 0.8)); g.addColorStop(1, rgb(col || [255, 255, 255], 0)); c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2); }
  var n = 5 + Math.round(w / Math.max(3, h * 0.8)), tall = o.tall || 2.2;
  for (i = 0; i < n; i++) {
    var u = (i + 0.5) / n, env = Math.pow(Math.sin(u * Math.PI), 0.8), r = h * (0.32 + 0.62 * env) * (0.75 + rng() * 0.45);
    lobes.push([bx + (u - 0.5) * w + (rng() - 0.5) * w * 0.05, by - r * 0.55 - env * h * (tall - 1.2) * 0.55 * (0.7 + rng() * 0.6), r]);
  }
  for (i = 0; i < n * 0.6; i++) { var q = lobes[(rng() * n) | 0]; lobes.push([q[0] + (rng() - 0.5) * q[2], q[1] - q[2] * (0.3 + rng() * 0.4), q[2] * (0.4 + rng() * 0.3)]); }   // turrets
  lobes.forEach(function (q) { dab(q[0], q[1], q[2] * 1.15, 1); for (j = 0; j < 5; j++) { var an = Math.PI + rng() * Math.PI, rr = q[2] * (0.25 + rng() * 0.3); dab(q[0] + Math.cos(an) * q[2] * 0.85, q[1] + Math.sin(an) * q[2] * 0.8, rr * 1.3, 0.75); } });
  for (i = 0; i < 10; i++) { var e = lobes[(rng() * lobes.length) | 0], an2 = rng() * TAU; dab(e[0] + Math.cos(an2) * e[2] * 1.15, e[1] + Math.sin(an2) * e[2] * 0.7, e[2] * (0.25 + rng() * 0.3), 0.3); }   // ragged rim
  // the flat base: cut softly below the condensation level (a few torn wisps hang below it)
  c.globalCompositeOperation = 'destination-out';
  var gb = c.createLinearGradient(0, by - h * 0.22, 0, by + h * 0.12); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = gb; c.fillRect(0, by - h * 0.22, cw, ch);
  c.globalCompositeOperation = 'source-atop';
  var gv = c.createLinearGradient(0, by - h * tall * 0.95, 0, by); gv.addColorStop(0, rgb(C.lit)); gv.addColorStop(0.5, rgb(mixc(C.lit, C.mid, 0.55))); gv.addColorStop(0.85, rgb(C.mid)); gv.addColorStop(1, rgb(C.shd)); c.fillStyle = gv; c.fillRect(0, 0, cw, ch);
  var gs = c.createLinearGradient(bx + sgn * w * 0.55, 0, bx - sgn * w * 0.55, 0); gs.addColorStop(0, rgb(C.lit, 0.5)); gs.addColorStop(0.5, rgb(C.mid, 0)); gs.addColorStop(1, rgb(C.shd, 0.45)); c.fillStyle = gs; c.fillRect(0, 0, cw, ch);
  lobes.forEach(function (q) { dab(q[0] - sgn * q[2] * 0.35, q[1] + q[2] * 0.4, q[2] * 0.9, 0.38, C.shd); dab(q[0] + sgn * q[2] * 0.3, q[1] - q[2] * 0.35, q[2] * 0.6, 0.55, C.lit); });
  if (C.glow) { var gw = c.createLinearGradient(0, by - h * 0.5, 0, by); gw.addColorStop(0, rgb(C.glow, 0)); gw.addColorStop(1, rgb(C.glow, 0.55)); c.fillStyle = gw; c.fillRect(0, 0, cw, ch); }   // warm underside at dusk
  c.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = C.A; ctx.imageSmoothingEnabled = true; ctx.drawImage(cv, x - bx, y - by, cw, ch); ctx.restore();
  cv.width = cv.height = 0;
}
/* one fleck of a mackerel sky: a soft rounded cloudlet, lit on top, a little shadow beneath */
function cloudlet(ctx, x, y, w, h, C, a, sgn) {
  function soft(cx, cy, rx, ry, col, al) { ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgb(col, al)); g.addColorStop(0.5, rgb(col, al * 0.7)); g.addColorStop(1, rgb(col, 0)); ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore(); }
  soft(x - sgn * w * 0.1, y + h * 0.35, w * 1.05, h * 1.0, C.shd, a * 0.55);
  soft(x, y, w, h * 1.1, C.mid, a * 0.8);
  soft(x + sgn * w * 0.15, y - h * 0.3, w * 0.62, h * 0.6, C.lit, a);
}
function paintClouds(ctx, yo, yH) {
  var L = LIT, night = L.id === 'night', dusk = L.id === 'dusk', morning = L.id === 'morning', sname = seasonName(), rng = mulberry32(17 + sname.length), i;
  var sgn = L.sunX < 0.5 ? -1 : 1, sky = mixc(L.skyTop, L.skyHor, 0.5);
  var lit = night ? [120, 132, 168] : dusk ? [255, 206, 160] : morning ? [255, 248, 238] : [255, 254, 250];
  var mid = night ? [62, 72, 106] : dusk ? [214, 156, 158] : mixc(sky, [246, 246, 248], 0.66);
  var shd = night ? [30, 38, 66] : dusk ? [112, 92, 132] : mixc(sky, [124, 134, 158], 0.62);
  var A = night ? 0.6 : sname === 'spring' ? 0.7 : 0.9;
  if (sname === 'winter') { lit = mixc(lit, sky, 0.25); mid = mixc(mid, [200, 204, 212], 0.4); }
  if (sname === 'spring' && !night) { mid = mixc(mid, L.haze, 0.25); shd = mixc(shd, L.haze, 0.3); }   // spring haze (kasumi) softens them
  var C = { lit: lit, mid: mid, shd: shd, A: A, glow: dusk ? [255, 150, 96] : null };
  if (L.overcast) { // a low grey ceiling: layered banks, darker underneath
    var dk = clamp(L.dark || 0.3), oshd = night ? [18, 22, 34] : mixc([150, 154, 162], [64, 68, 78], dk), omid = night ? [34, 40, 56] : mixc([196, 200, 206], [104, 110, 120], dk), olit = night ? [58, 64, 84] : mixc([232, 234, 238], [150, 156, 164], dk);
    if (L.weather === 'typhoon') { oshd = mulc(oshd, [0.82, 0.92, 0.88]); omid = mulc(omid, [0.85, 0.95, 0.9]); }
    paintOvercast(ctx, yo, { mid: rgb(omid), lit: rgb(olit), arr: [rgb(oshd, 0.85), rgb(omid, 0.9), rgb(olit, 0.8)] }, A, rng, sgn); return;
  }
  // high cirrus first (behind everything): fine combed streaks with hooked ends
  var nci = sname === 'autumn' ? 3 : sname === 'winter' ? 2 : 4;
  for (i = 0; i < nci; i++) {
    var cx = rng() * W, cy = 3 + rng() * 14, cw = 40 + rng() * 70, ang = -0.06 + (rng() - 0.5) * 0.08;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.lineCap = 'round';
    for (var k = 0; k < 16; k++) {
      var u0 = (rng() - 0.5) * cw, len = cw * (0.15 + rng() * 0.3), yy = (rng() - 0.5) * 3.2, al = (night ? 0.08 : 0.18) * (1 - Math.abs(u0) / cw * 1.4);
      if (al <= 0.01) continue;
      ctx.strokeStyle = rgb(lit, al); ctx.lineWidth = 0.35 + rng() * 0.6; ctx.beginPath(); ctx.moveTo(u0, yy); ctx.quadraticCurveTo(u0 + len * 0.6, yy - 0.3, u0 + len, yy - 0.9 - rng() * 1.2); ctx.stroke();
    }
    var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, cw / 2); gg.addColorStop(0, rgb(lit, night ? 0.06 : 0.14)); gg.addColorStop(1, rgb(lit, 0)); ctx.scale(1, 0.06); ctx.fillStyle = gg; ctx.fillRect(-cw / 2, -cw / 2, cw, cw);
    ctx.restore();
  }
  if (sname === 'summer') { // towering cumulus beyond the hills (their bases hidden behind the ridges)
    [[0.1, 30, 48, 9.5, 2.6], [0.5, 32, 70, 12, 2.9], [0.84, 29, 42, 8.5, 2.4]].forEach(function (c) { cloudPuff(ctx, W * c[0] + (rng() - 0.5) * 30, yo + c[1], c[2], c[3], rng, C, sgn, { tall: c[4] }); });
  } else if (sname === 'autumn') { // urokogumo: rows of small fleecy cloudlets, thinning out toward the edges of the field, and a few low cumulus
    var ux = W * (0.35 + rng() * 0.3);
    for (var row = 0; row < 8; row++) for (var k2 = 0; k2 < 32; k2++) {
      var x0 = k2 * 13 + row * 6 + rng() * 5 - 12, y0 = 2 + row * 2.5 + rng() * 1.0 + k2 * 0.16 + Math.sin(k2 * 0.7 + row) * 0.9, fx = 1 - Math.abs(x0 - ux) / (W * 0.62), fr = 1 - Math.abs(row - 3) / 5;
      if (rng() > fx * fr * 1.3) continue;
      cloudlet(ctx, x0, y0, 2.6 + rng() * 2, 0.9 + rng() * 0.5, C, clamp(fx * fr * 1.4) * (night ? 0.5 : 0.95), sgn);
    }
    for (i = 0; i < 3; i++) cloudPuff(ctx, W * (0.15 + i * 0.33) + rng() * 30, yo + 30 + rng() * 4, 34 + rng() * 20, 5.5 + rng() * 2.5, rng, C, sgn, { tall: 1.7 });
  } else if (sname === 'winter') { // low grey stratus banks with brighter breaks
    for (i = 0; i < 7; i++) {
      var by = 4 + i * 5.5 + rng() * 3, bw = 120 + rng() * 140, bx = rng() * W, bh = 2.2 + rng() * 2.2;
      [[shd, 0.5, 1.0, 0.6], [mid, 0.45, 0.85, -0.2], [lit, 0.35, 0.55, -0.8]].forEach(function (Ly) { var cy2 = by + Ly[3] * bh; ctx.save(); ctx.translate(bx + (Ly[0] === lit ? sgn * 8 : 0), cy2); ctx.scale(1, bh * Ly[2] / (bw / 2)); var gr = ctx.createRadialGradient(0, 0, 0, 0, 0, bw / 2); gr.addColorStop(0, rgb(Ly[0], A * Ly[1])); gr.addColorStop(0.6, rgb(Ly[0], A * Ly[1] * 0.6)); gr.addColorStop(1, rgb(Ly[0], 0)); ctx.fillStyle = gr; ctx.fillRect(-bw / 2, -bw / 2, bw, bw); ctx.restore(); });
    }
    for (i = 0; i < 3; i++) cloudPuff(ctx, rng() * W, yo + 28 + rng() * 4, 50 + rng() * 30, 5 + rng() * 2.5, rng, C, sgn, { tall: 1.5 });
  } else { // spring: soft fair-weather cumulus in the haze
    for (i = 0; i < 6; i++) cloudPuff(ctx, (i + 0.3 + rng() * 0.5) * W / 6, yo + 22 + rng() * 10, 30 + rng() * 26, 5 + rng() * 3, rng, C, sgn, { tall: 1.9 });
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
  var causK = LIT.id === 'day' ? 1 : LIT.id === 'morning' ? 0.6 : LIT.id === 'dusk' ? 0.3 : 0;
  var dryK = SEA.snow ? 0 : (g0[1] > g0[0] * 1.4 ? 0.5 : 0.3), dryC = [(g0[0] + s1[0]) * 0.5 + 30, (g0[1] + s1[1]) * 0.5 + 18, (g0[2] + s1[2]) * 0.5];   // the dry patches' straw colour, from this season's grass and soil
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
        // the lawn's own variety: drier straw-coloured patches, darker lush ones (clover, damp hollows), and the fine grain of the blades
        var dv = n2(x * 0.9 + 11, z * 0.9 - 4);
        if (dv > 0.6 && !snow) { var dA = (dv - 0.6) * 2.2 * ga * dryK; r += (dryC[0] - r) * dA; g += (dryC[1] - g) * dA; bl += (dryC[2] - bl) * dA; }
        else if (dv < 0.34) { var lA = (0.34 - dv) * 1.6 * ga; r *= 1 - lA * 0.22; g *= 1 - lA * 0.12; bl *= 1 - lA * 0.2; }
        if (fp < 0.1) { var gs = (n2(x * 30 + 7, z * 9) - 0.5) * 0.26 * (1 - fp / 0.1) * ga; r *= 1 + gs; g *= 1 + gs; bl *= 1 + gs * 0.8; }
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
          if (dep < 0.45 && !snow && fp < 0.12) {   // caustics: the sun's net of light on the shallow bottom, fading with depth
            var ca = 1 - Math.abs(n2(x * 6.5 + 3, z * 9) * 2 - 1), cb = 1 - Math.abs(n2(x * 9 - 7, z * 6.5 + 2) * 2 - 1), cs = Math.pow(ca, 7) + Math.pow(cb, 7), cK = cs * (0.45 - dep) * 1.6 * causK * (1 - fp / 0.12);
            wr += (255 - wr) * cK * 0.35; wg += (250 - wg) * cK * 0.38; wb += (220 - wb) * cK * 0.3;
          }
          if (dep > 0.5) { var dd2 = (dep - 0.5) * 0.3; wr *= 1 - dd2; wg *= 1 - dd2 * 0.7; wb *= 1 - dd2 * 0.6; }   // the deep middle, darker and bluer
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
      // the ground's gentle relief, lit from the sun's side: small mounds and hollows in the lawn and the moss (not the raked gravel, not the water)
      if (gA < 0.5 && w < 0.5) { var hc = n2(x * 2.1 + 5, z * 2.1), hdx = n2(x * 2.1 + 5.12, z * 2.1) - hc, hdz = n2(x * 2.1 + 5, z * 2.1 + 0.12) - hc, rel = 1 + (hdx * Lhx + hdz * Lhz) * 4.0 * (1 - gA * 2) * (1 - w * 2) + (hc - 0.5) * 0.08; r *= rel; g *= rel; bl *= rel; }
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
    // irises stand beside the planks, never up through them; each plank piece is sorted on its own depth
    for (i = 0; i < 18; i++) { (function (a, b2, sd) { if (marshSDF(a, b2) > 0.02 || yatsuNear(a, b2, -0.02)) return; put(a, b2, { draw: function (c) { drawIrisClump(c, a, b2, 0.68, sd); }, refl: true }); })(LX(1.3 + mr() * 3.0), LZ(1.85 + mr() * 0.85), 1400 + i); }
    yatsuPieces().forEach(function (pc) { put(pc.x, pc.z, { draw: function (c) { drawYatsuPiece(c, pc); }, refl: true }); });
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
  var shSoft = LIT.id === 'day' ? 1.1 : LIT.id === 'night' ? 2.2 : 1.7;   // the penumbra: crisper under a high sun, softer and longer when it is low (and under the moon)
  compositeLayer(ctx, shc, shSoft * KS * hw / bw, LIT.shadowA, LIT.shadow);
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

/* ================= rare visitors: painting kit (shared by the field-guide painters below) =================
   Every visitor is painted in its own local frame (metres; x along its heading as seen from the side, y up negative, the
   ground at y = 0), set by zPlace from the real projection: the vertical is the projected vertical at that point, the
   heading is foreshortened by how much of it runs across the view. Parts are soft gradients lit from the light's side
   (RL.lx in the local frame), with fur / feather strokes clipped to each part and a thin rim of sky light. */
var RL = { tint: [1, 1, 1], lx: 1, hi: 1.08, lo: 0.6, rimC: [230, 236, 244], rimA: 0.3, night: false, snow: false, lum: 1 };
function zrl(g, dir) {
  RL.night = g.light === 'night'; RL.lum = g.lum; RL.snow = !!g.SEA.snow;
  // the light's colour cast on an animal is capped: its own colours stay readable (a part of the cast kept, the luminance kept,
  // darker at night rather than blue); the full colour of the light goes into the rim and key-light instead
  var t0 = g.tint, Lm = t0[0] * 0.2126 + t0[1] * 0.7152 + t0[2] * 0.0722, keep = RL.night ? 0.32 : g.light === "dusk" ? 0.42 : g.light === "dawn" ? 0.5 : 0.7, dk = RL.night ? 0.86 : 1;   // (the luminance as the eye sees it: a blue night is darker than its mean)
  RL.tint = t0.map(function (v) { return (Lm + (v - Lm) * keep) * dk; }); RL.key = t0;
  RL.lx = (LS[0] >= 0 ? 1 : -1) * (dir < 0 ? -1 : 1);
  RL.hi = RL.night ? 1.04 : 1.1; RL.lo = RL.night ? 0.72 : g.light === 'dusk' ? 0.6 : 0.56;
  RL.rimC = mixc(g.LIT.skyHor, [255, 255, 255], 0.35); RL.rimA = RL.night ? 0.14 : g.light === 'dusk' ? 0.34 : 0.26;
}
function zc(c, k, a) { var t = RL.tint; k = k === undefined ? 1 : k; return rgb([c[0] * t[0] * k, c[1] * t[1] * k, c[2] * t[2] * k], a); }
/* a part lit from above and from the light's side: bright top-front, shadowed underside */
function zgrad(ctx, cx, cy, r, c, hi, lo) {
  var lx = RL.lx * 0.45, gr = ctx.createLinearGradient(cx + lx * r, cy - r, cx - lx * r, cy + r);
  gr.addColorStop(0, zc(c, hi === undefined ? RL.hi : hi)); gr.addColorStop(1, zc(c, lo === undefined ? RL.lo : lo)); return gr;
}
function zgrad2(ctx, x0, y0, x1, y1, c0, c1, k0, k1) { var gr = ctx.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, zc(c0, k0)); gr.addColorStop(1, zc(c1, k1)); return gr; }
/* a soft painted patch (radial falloff), for markings that blend into the coat */
function zsoft(ctx, x, y, rx, ry, c, a, k, rot) {
  if (rx <= 0 || ry <= 0) return;
  var m0 = ctx.getTransform();   // (no save/restore: under a clip they are costly; the transform is put back by hand)
  ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(1, ry / rx);
  var gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, zc(c, k, a)); gr.addColorStop(0.55, zc(c, k, a * 0.75)); gr.addColorStop(1, zc(c, k, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.setTransform(m0);
}
/* sky light along the top edge of a part: the outline stroked inside its own clip, shifted down and away from the light */
function zrim(ctx, path, w, a) {
  ctx.save(); ctx.clip(path); ctx.translate(-RL.lx * w * 0.3, w * 0.55); ctx.strokeStyle = rgb(mulc(RL.rimC, (RL.key || RL.tint).map(function (v) { return Math.min(1.1, 0.55 + v * 0.5); })), (a === undefined ? 1 : a) * RL.rimA); ctx.lineWidth = w; ctx.stroke(path); ctx.restore();
}
/* fur or feather strokes, clipped to a part: list of [x0, y0, x1, y1, tone] */
function zstrokes(ctx, path, list, cDark, cLite, w, a) {
  ctx.save(); ctx.clip(path); ctx.lineCap = 'round'; ctx.lineWidth = w;
  var pd = new Path2D(), pl = new Path2D();
  for (var i = 0; i < list.length; i++) { var s = list[i], q = s[4] < 0.5 ? pd : pl; q.moveTo(s[0], s[1]); q.lineTo(s[2], s[3]); }
  ctx.strokeStyle = zc(cDark, 1, a); ctx.stroke(pd); ctx.strokeStyle = zc(cLite, 1, a); ctx.stroke(pl); ctx.restore(); ctx.lineCap = 'butt';
}
function zfurList(seed, n, x0, y0, x1, y1, len, ang, jit) {
  var r = mulberry32(seed), out = [];
  for (var i = 0; i < n; i++) { var x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), a = ang + (r() - 0.5) * (jit || 0.5), l = len * (0.6 + r() * 0.8); out.push([x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, r()]); }
  return out;
}
/* a smooth closed outline through control points */
function zpath(pts) {
  var p = new Path2D(), n = pts.length, i;
  p.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (i = 0; i < n; i++) { var a = pts[i], b = pts[(i + 1) % n]; p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  p.closePath(); return p;
}
/* a tapered limb along a smooth centre line (Catmull-Rom through the joints), widths at the joints */
function zlimb(pts, ws, noCap) {
  var C = [], Wd = [], n = pts.length, i, k;
  for (i = 0; i < n - 1; i++) {
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (k = 0; k < 4; k++) {
      var t = k / 4, t2 = t * t, t3 = t2 * t;
      C.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      Wd.push(lerp(ws[i], ws[i + 1], t));
    }
  }
  C.push(pts[n - 1]); Wd.push(ws[n - 1]);
  var Lf = [], Rt = [];
  for (i = 0; i < C.length; i++) {
    var a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, h = Wd[i] / 2;
    Lf.push([C[i][0] - dy / l * h, C[i][1] + dx / l * h]); Rt.push([C[i][0] + dy / l * h, C[i][1] - dx / l * h]);
  }
  var p = new Path2D(); p.moveTo(Lf[0][0], Lf[0][1]);
  for (i = 1; i < Lf.length; i++) p.lineTo(Lf[i][0], Lf[i][1]);
  for (i = Rt.length - 1; i >= 0; i--) p.lineTo(Rt[i][0], Rt[i][1]);
  p.closePath();
  var ar = 0, ol = Lf.concat(Rt.slice().reverse()); for (i = 0; i < ol.length; i++) { var u1 = ol[i], u2 = ol[(i + 1) % ol.length]; ar += u1[0] * u2[1] - u2[0] * u1[1]; } var ccw = ar < 0;   // caps wound the same way as the outline (so nonzero fill keeps them)
  var e = C[C.length - 1], s = C[0]; p.moveTo(e[0] + Wd[Wd.length - 1] / 2, e[1]); p.arc(e[0], e[1], Wd[Wd.length - 1] / 2, 0, TAU, ccw); if (!noCap) { p.moveTo(s[0] + Wd[0] / 2, s[1]); p.arc(s[0], s[1], Wd[0] / 2, 0, TAU, ccw); }
  return p;
}
/* two-bone reach: the joint between a and c, on the side of +x (side > 0) or -x; c is pulled in if out of reach */
/* two-bone reach with the bend on a fixed side of the reach line (bend < 0: the joint to the right of a->c in screen coords, i.e. forward for
   a leg reaching down when facing +x, as a stifle; bend > 0: back, as an elbow) - stays right however the leg swings */
function zik2(a, c, l1, l2, bend) {
  var dx = c[0] - a[0], dy = c[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, ux = dx / d, uy = dy / d;
  var dd = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min(d, (l1 + l2) * 0.999)), x = (dd * dd + l1 * l1 - l2 * l2) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  var j1 = [a[0] + ux * x - uy * h, a[1] + uy * x + ux * h], cr = ux * (j1[1] - a[1]) - uy * (j1[0] - a[0]);
  var j = (cr < 0) === (bend < 0) ? j1 : [a[0] + ux * x + uy * h, a[1] + uy * x - ux * h];
  return [j, [a[0] + ux * dd, a[1] + uy * dd]];
}
function zik(a, c, l1, l2, side) {
  var dx = c[0] - a[0], dy = c[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, ux = dx / d, uy = dy / d;
  var dd = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min(d, (l1 + l2) * 0.999)), x = (dd * dd + l1 * l1 - l2 * l2) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  var j1 = [a[0] + ux * x - uy * h, a[1] + uy * x + ux * h], j2 = [a[0] + ux * x + uy * h, a[1] + uy * x - ux * h];
  return [(side > 0) === (j1[0] > j2[0]) ? j1 : j2, [a[0] + ux * dd, a[1] + uy * dd]];
}
function zeye(ctx, x, y, r, iris, open, slit) { // a small bright eye with a catchlight; open 0 closed (a lid line) .. 1
  if (open < 0.2) { ctx.strokeStyle = 'rgba(20,16,14,0.85)'; ctx.lineWidth = r * 0.5; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.35, x + r, y); ctx.stroke(); return; }
  ctx.fillStyle = 'rgb(14,12,12)'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.12, r * open, 0, 0, TAU); ctx.fill();
  if (iris) { ctx.fillStyle = zc(iris); ctx.beginPath(); ctx.ellipse(x, y, r * 0.85, r * 0.8 * open, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgb(10,8,8)'; ctx.beginPath(); ctx.ellipse(x, y, slit ? r * 0.22 : r * 0.42, r * 0.7 * open, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = RL.night ? 'rgba(220,230,255,0.55)' : 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.3 * open, r * 0.28, 0, TAU); ctx.fill();
}
function zblink(t, seed) { var per = 3.2 + (seed % 7) * 0.4, u = (t + seed * 0.37) % per; return u < 0.13 ? Math.abs(u - 0.065) / 0.065 : 1; }
/* the local frame of a visitor standing at x, y, z: heading foreshortened by fs, the projected vertical; mag scales it */
function zPlace(ctx, x, y, z, dir, fs, mag) {
  var p = P(x, y, z), q = P(x, y + 0.1, z), m = mag || 1, ux = (q.x - p.x) * 10 * m, uy = (q.y - p.y) * 10 * m;
  if (MODE !== 'm') RARE_LAST = { x: p.x, y: p.y, k: p.k };
  ctx.save(); ctx.transform(dir * (fs || 1) * p.k * m, 0, -ux, -uy, p.x, p.y); return p;
}
/* contact shadow and a soft cast shadow toward the light's shadow side (not mirrored, not on open water) */
function zShadow(ctx, g, x, z, hx, len, wid, ht, a, yb) {
  if (MODE === 'm') return;
  if (g.F.pond && pondSDF(x, z) < -0.05 && !(yb > 0.2)) return;
  var p = P(x, yb || 0, z), k = p.k, fl = 0.4 + 0.6 * Math.abs(hx), rx = Math.max(0.6, len * 0.5 * k * fl + wid * 0.5 * k * (1 - fl)), ry = Math.max(0.3, wid * 0.5 * k * CAM.s + len * 0.5 * k * CAM.s * (1 - fl) * 0.6);
  var sa = (a === undefined ? 1 : a) * clamp(g.lum * 1.1, 0.35, 1) * (g.LIT.weather === 'cloudy' || g.wet ? 0.6 : 1), sc = g.LIT.shadow;
  // the cast shadow: a soft smear from the feet away from the light, longer when the sun is low
  var tp = P(x + ht * SX, yb || 0, z + ht * SZ), dx = tp.x - p.x, dy = tp.y - p.y, dl = Math.hypot(dx, dy);
  if (dl > 0.5) {
    ctx.save(); ctx.translate((p.x + tp.x) / 2, (p.y + tp.y) / 2); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(1, Math.max(0.15, (rx * 0.6 + ry) / Math.max(1, dl / 2 + rx * 0.5)));
    var R = dl / 2 + rx * 0.5, gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R); gr.addColorStop(0, rgb(sc, 0.32 * sa * g.LIT.shadowA * 2)); gr.addColorStop(1, rgb(sc, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, ry / rx);
  var g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g2.addColorStop(0, 'rgba(18,16,22,' + (0.42 * sa) + ')'); g2.addColorStop(0.6, 'rgba(18,16,22,' + (0.2 * sa) + ')'); g2.addColorStop(1, 'rgba(18,16,22,0)');
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}

/* ================= walkable ground: a grid built from the scene's own geometry =================
   Cell kinds: 0 open ground, 1 solid (rocks, lanterns, trunks, shrubs, buildings, posts, the fence line, the hill),
   2 deep water, 3 shallow water (the pond's rim), 4 the wet bank. Each class of visitor walks on its own kinds:
   land animals on open ground only; waders on the rim, the bank and open ground. Clearance (distance to the nearest cell
   it may not use) keeps a body of radius rad clear of every obstacle; A* on that, then the path is pulled straight
   where the line of sight allows and its corners rounded. */
function rareObstacles() {
  var C = [], B = [], i;
  function c(x, z, r) { C.push([x, z, r]); }
  if (F.rock1) c(LAY.rock1.x, LAY.rock1.z, 0.7);
  if (F.lantern) { c(LX(-1.62), LZ(2.3), 0.32); c(LAY.lantern.x, LAY.lantern.z, 0.4); }
  if (F.kare) [[LX(-3.75), LZ(1.0), 0.36], [LX(-4.55), LZ(2.05), 0.5], [LX(-1.2), LZ(0.7), 0.52], [LX(-3.15), LZ(0.5), 0.26]].forEach(function (q) { c(q[0], q[1], q[2]); });
  var rocks = [];
  if (F.pond) {
    var rr = mulberry32(77), placed = [];
    for (i = 0; i < 5000 && placed.length < 34; i++) {
      var px = LX(-0.2 + rr() * 6.8), pz = LZ(2.4 + rr() * 5.6), d = pondBase(px, pz);
      if (Math.abs(d) > 0.06) continue;
      if (Math.abs(pz - BRIDGE.zc) < 0.75 && (Math.abs(px - BRIDGE.x0) < 0.7 || Math.abs(px - BRIDGE.x1) < 0.7)) continue;
      if (Math.abs(px - LAY.fall.x) < 0.75 && pz > LZ(7.0)) continue;
      if (px > LX(1.0) && px < LX(4.4) && pz < LZ(3.5)) continue;
      if (placed.some(function (p) { return Math.hypot(p[0] - px, p[1] - pz) < 0.62; })) continue;
      placed.push([px, pz]);
    }
    placed.forEach(function (p, ii) { var sz = 0.18 + ((ii * 37) % 10) / 10 * 0.17; rocks.push({ x: p[0], z: p[1], rx: sz * 1.3, ry: sz * (0.45 + ((ii * 53) % 7) / 14), rz: sz }); c(p[0], p[1], sz * 1.3); });
    rocks.push({ x: LX(4.95), z: LZ(4.75), rx: 0.5, ry: 0.46, rz: 0.4, big: true }); c(LX(4.95), LZ(4.75), 0.52);
  }
  if (F.maple > 0) c(LAY.maple.x, LAY.maple.z, 0.14 + 0.16 * Math.min(1, F.maple));
  if (F.ycherry > 0) c(LAY.ycherry.x, LAY.ycherry.z, 0.1 + 0.12 * Math.min(1, F.ycherry));
  if (F.pine > 0) c(LAY.pine.x, LAY.pine.z, 0.12 + 0.2 * Math.min(1, F.pine));
  if (F.azaleas > 0) AZALEAS.forEach(function (a, ii) { if (ii === 6 && !F.teahouse) return; c(a[0], a[1], a[2] * F.azaleas * 0.92); });
  if (F.tsukubai) { var t = LAY.tsukubai; c(t.x, t.z, 0.32); c(t.x - 0.75, t.z - 0.35, 0.34); c(t.x + 0.62, t.z - 0.12, 0.26); c(t.x + 0.05, t.z - 0.62, 0.3); c(t.x - 0.62, t.z + 0.12, 0.1); }
  if (F.shishi) { var s = LAY.shishi; B.push([s.x - 1.12, s.x + 0.45, s.z - 0.32, s.z + 0.32]); }
  if (F.smallLanterns) { c(LX(-2.55), LZ(7.25), 0.22); c(LX(4.7), LZ(5.55), 0.22); }
  if (F.wisteria) { var w = LAY.wis; [[w.x0, w.z0], [w.x1, w.z0], [w.x0, w.z1], [w.x1, w.z1]].forEach(function (q) { c(q[0], q[1], 0.13); }); }
  if (F.teahouse) B.push([TH.X0 - 0.22, TH.X1 + 0.22, TH.ZE - 0.28, TH.ZB + 0.05]);
  if (F.bridge) B.push([BRIDGE.x0 + 0.15, BRIDGE.x1 - 0.15, BRIDGE.zc - 0.75, BRIDGE.zc + 0.75]);   // its posts and the shade under it
  if (F.marsh) yatsuPieces().forEach(function (pc) { c(pc.x, pc.z, 0.32); });   // the plank bridge's trestles
  if (EVT) { c(EV_POS.spot[0], EV_POS.spot[1], 0.5); c(EV_POS.entL[0], EV_POS.entL[1], 0.4); c(EV_POS.entR[0], EV_POS.entR[1], 0.4); if (EVT === 'kodomo') c(EV_POS.pole[0], EV_POS.pole[1], 0.3); }
  return { C: C, B: B, rocks: rocks };
}
function zGrid(R) {
  if (R.grid) return R.grid;
  var cs = 0.2, zf = LAY.fenceZ, gb = groundAt(W / 2, H + 12), z0 = (gb ? gb.z : -2) - 0.6, z1 = zf;
  var xl = Math.min(R.edgeX(z1, -1), R.edgeX(z0, -1)) - 4, xr = Math.max(R.edgeX(z1, 1), R.edgeX(z0, 1)) + 4;
  var nx = Math.ceil((xr - xl) / cs), nz = Math.ceil((z1 - z0) / cs), N = nx * nz, K = new Uint8Array(N), SD = new Float32Array(N), CO = new Float32Array(N), ob = R.obs, i, j, m;
  var GV = F.gravel ? gravelInfo(F) : null;
  for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) {
    var x = xl + (i + 0.5) * cs, z = z0 + (j + 0.5) * cs, k = 0, sd = F.pond ? pondSDF(x, z) : 9;
    if (sd < 0) k = sd > -0.42 ? 3 : 2; else if (sd < 0.16) k = 4;
    if (z > zf - 0.16) k = 1;
    if (F.hill && hillH(x, z) > 0.03) k = 1;
    if (k !== 2) {
      for (m = 0; m < ob.C.length; m++) { var o = ob.C[m]; if ((x - o[0]) * (x - o[0]) + (z - o[1]) * (z - o[1]) < o[2] * o[2]) { k = 1; break; } }
      for (m = 0; m < ob.B.length; m++) { var b = ob.B[m]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) { k = 1; break; } }
    }
    K[j * nx + i] = k; SD[j * nx + i] = sd;
    if (GV) { var gx = (x - GV.cx) / GV.rx, gz = (z - GV.cz) / GV.rz, gr = gx * gx + gz * gz; if (gr < 1.05) CO[j * nx + i] = 5; }   // raked gravel: walked round, not across
  }
  R.grid = { cs: cs, x0: xl, z0: z0, nx: nx, nz: nz, K: K, SD: SD, CO: CO, cl: {}, R: R };
  return R.grid;
}
function zOk(cls, k) { return cls === 'wade' ? k === 3 || k === 4 || k === 0 : cls === 'wet' ? k === 3 || k === 4 : k === 0; }
function zClear(G, cls) { // distance (m) from each cell centre to the nearest cell this class may not use (two-pass chamfer)
  if (G.cl[cls]) return G.cl[cls];
  var nx = G.nx, nz = G.nz, D = new Float32Array(nx * nz), a = G.cs, b = G.cs * 1.4142, i, j, k, v;
  for (k = 0; k < D.length; k++) D[k] = zOk(cls, G.K[k]) ? 1e6 : 0;
  for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) { k = j * nx + i; v = D[k]; if (!v) continue; if (i === 0 || j === 0 || i === nx - 1) { D[k] = Math.min(v, a); continue; } v = Math.min(v, D[k - 1] + a, D[k - nx] + a, D[k - nx - 1] + b, D[k - nx + 1] + b); D[k] = v; }
  for (j = nz - 1; j >= 0; j--) for (i = nx - 1; i >= 0; i--) { k = j * nx + i; v = D[k]; if (!v) continue; if (j === nz - 1 || i === nx - 1 || i === 0) { D[k] = Math.min(v, a); continue; } v = Math.min(v, D[k + 1] + a, D[k + nx] + a, D[k + nx + 1] + b, D[k + nx - 1] + b); D[k] = v; }
  G.cl[cls] = D; return D;
}
function zIdx(G, x, z) { var i = Math.floor((x - G.x0) / G.cs), j = Math.floor((z - G.z0) / G.cs); return i < 0 || j < 0 || i >= G.nx || j >= G.nz ? -1 : j * G.nx + i; }
function zClr(G, C, x, z) { var k = zIdx(G, x, z); return k < 0 ? -1 : C[k] - G.cs * 0.5; }
function zSnap(G, C, rad, p) { // the nearest usable cell centre to p
  var k = zIdx(G, p[0], p[1]); if (k >= 0 && C[k] - G.cs * 0.5 >= rad) return p;
  var i0 = Math.floor((p[0] - G.x0) / G.cs), j0 = Math.floor((p[1] - G.z0) / G.cs);
  for (var r = 1; r < 40; r++) for (var dj = -r; dj <= r; dj++) for (var di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    var i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) continue;
    if (C[j * G.nx + i] - G.cs * 0.5 >= rad) return [G.x0 + (i + 0.5) * G.cs, G.z0 + (j + 0.5) * G.cs];
  }
  return p;
}
function zLos(G, C, rad, p, q) {
  var d = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(d / (G.cs * 0.2)));
  var c0 = G.CO[zIdx(G, p[0], p[1])] || 0, c1 = G.CO[zIdx(G, q[0], q[1])] || 0;   // a shortcut may not cross a costly patch (the raked gravel) the path went round
  for (var i = 0; i <= n; i++) { var u = i / n, x = lerp(p[0], q[0], u), z = lerp(p[1], q[1], u); if (zClr(G, C, x, z) < rad) return false; if ((G.CO[zIdx(G, x, z)] || 0) > Math.max(c0, c1)) return false; }
  return true;
}
function zAstar(G, cls, rad, a, b, pref) {
  var C = zClear(G, cls), nx = G.nx, nz = G.nz, N = nx * nz, cs = G.cs;
  var A = zSnap(G, C, rad, a), Bp = zSnap(G, C, rad, b), s = zIdx(G, A[0], A[1]), e = zIdx(G, Bp[0], Bp[1]);
  if (s < 0 || e < 0) return [a, b];
  var gS = new Float32Array(N), came = new Int32Array(N), done = new Uint8Array(N), hp = [], hf = [], i;
  for (i = 0; i < N; i++) { gS[i] = 1e9; came[i] = -1; }
  function push(k, f) { hp.push(k); hf.push(f); var n = hp.length - 1; while (n > 0) { var q = (n - 1) >> 1; if (hf[q] <= hf[n]) break; var t1 = hp[q]; hp[q] = hp[n]; hp[n] = t1; var t2 = hf[q]; hf[q] = hf[n]; hf[n] = t2; n = q; } }
  function pop() { var top = hp[0], lk = hp.pop(), lf = hf.pop(); if (hp.length) { hp[0] = lk; hf[0] = lf; var n = 0; for (;;) { var l = 2 * n + 1, r = l + 1, m = n; if (l < hp.length && hf[l] < hf[m]) m = l; if (r < hp.length && hf[r] < hf[m]) m = r; if (m === n) break; var t1 = hp[m]; hp[m] = hp[n]; hp[n] = t1; var t2 = hf[m]; hf[m] = hf[n]; hf[n] = t2; n = m; } } return top; }
  var ex = e % nx, ez = (e / nx) | 0;
  function h(k) { var dx = Math.abs(k % nx - ex), dz = Math.abs(((k / nx) | 0) - ez); return cs * (Math.max(dx, dz) + 0.4142 * Math.min(dx, dz)); }
  gS[s] = 0; push(s, h(s));
  var NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]], it = 0;
  while (hp.length && it++ < 60000) {
    var k = pop(); if (done[k]) continue; done[k] = 1; if (k === e) break;
    var ki = k % nx, kj = (k / nx) | 0;
    for (var m = 0; m < 8; m++) {
      var ii = ki + NB[m][0], jj = kj + NB[m][1]; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
      var q = jj * nx + ii; if (done[q]) continue; var cl = C[q] - cs * 0.5; if (cl < rad) continue;
      var pen = cl < rad + 0.6 ? (rad + 0.6 - cl) * 1.6 : 0, wx = G.x0 + (ii + 0.5) * cs, wz = G.z0 + (jj + 0.5) * cs;
      var ng = gS[k] + cs * NB[m][2] * (1 + pen + G.CO[q] + (pref ? pref(wx, wz) : 0));
      if (ng < gS[q]) { gS[q] = ng; came[q] = k; push(q, ng + h(q)); }
    }
  }
  if (came[e] < 0 && e !== s) return [A, A];   // no way there: it stays where it is (callers pick reachable goals)
  var out = [], c = e; while (c >= 0) { out.push([G.x0 + (c % nx + 0.5) * cs, G.z0 + (((c / nx) | 0) + 0.5) * cs]); if (c === s) break; c = came[c]; }
  out.reverse(); out[0] = A; out[out.length - 1] = Bp;
  // pull it straight where the view is clear, then round the corners
  var pts = [out[0]], i0 = 0;
  while (i0 < out.length - 1) { var j = out.length - 1; while (j > i0 + 1 && !zLos(G, C, rad, out[i0], out[j])) j--; pts.push(out[j]); i0 = j; }
  for (var pass = 0; pass < 2; pass++) {
    if (pts.length < 3) break;
    var np = [pts[0]];
    for (i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i], p1 = pts[i + 1], q1 = [lerp(p0[0], p1[0], 0.25), lerp(p0[1], p1[1], 0.25)], q2 = [lerp(p0[0], p1[0], 0.75), lerp(p0[1], p1[1], 0.75)];
      if (i > 0) np.push(q1); if (i < pts.length - 2) np.push(q2);
    }
    np.push(pts[pts.length - 1]);
    var ok = true; for (i = 0; i < np.length - 1 && ok; i++) ok = zLos(G, C, rad, np[i], np[i + 1]);
    if (!ok) break; pts = np;
  }
  return pts;
}
function zPathMake(pts) { var L = [0]; for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { p: pts, L: L, len: L[L.length - 1] }; }
function zPathAt(pa, s) {
  s = clamp(s, 0, pa.len); var lo = 0, hi = pa.L.length - 1;
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (pa.L[m] <= s) lo = m; else hi = m; }
  var a = pa.p[lo], b = pa.p[Math.min(pa.p.length - 1, lo + 1)], f = (s - pa.L[lo]) / ((pa.L[lo + 1] - pa.L[lo]) || 1);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
function zHead(pa, s) { var a = zPathAt(pa, s - 0.3), b = zPathAt(pa, s + 0.3), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; }

/* ---- a walk: legs of path, each ending in a stop (an act) or in the exit; s(t) eases from and to rest ---- */
function zProf(tau, L, v, rin, rout, ra) {
  var tin = rin ? ra : 0, tout = rout ? ra : 0, din = v * tin / 2, dout = v * tout / 2;
  if (din + dout > L) { var f = L / Math.max(1e-6, din + dout); tin *= f; tout *= f; din *= f; dout *= f; }
  var tc = (L - din - dout) / v, D = tin + tc + tout;
  if (tau === undefined) return D;
  if (tau < tin) return { s: v * tau * tau / (2 * tin), sp: v * tau / tin };
  if (tau < tin + tc) return { s: din + v * (tau - tin), sp: v };
  var u = Math.min(tout, tau - tin - tc); return { s: din + v * tc + v * u - (tout ? v * u * u / (2 * tout) : 0), sp: tout ? v * (1 - u / tout) : 0 };
}
/* legs: [{to: [x, z], gait, v, stride, act, dur}] from start; the last leg's `to` is the exit */
function zWalkPlan(G, cls, rad, start, legs, pref, t0, still0) {
  var pts = [start], marks = [], i;
  legs.forEach(function (lg) { var seg = zAstar(G, cls, rad, pts[pts.length - 1], lg.to, pref); for (var k = 1; k < seg.length; k++) pts.push(seg[k]); marks.push(pts.length - 1); });
  // the walk starts a little before it first comes into view and ends a little after it last goes out of view (off the frame or behind cover)
  var pa = zPathMake(pts), R = G.R, sIn = 0, sOut = pa.len;
  if (R && !still0) {
    var ht = rad * 2.2, seen = function (s) { var q = zPathAt(pa, s), p = P(q[0], 0, q[1]); return p.x > 0 && p.x < W && p.y < H + p.k * ht * 0.5 && zSeen(R, q[0], q[1], ht) > 0.3; };
    var sFirst = pa.L[marks[0]];
    for (var u = 0; u < sFirst; u += 0.2) if (seen(u) && seen(Math.min(sFirst, u + 0.6)) && seen(Math.min(sFirst, u + 1.2))) { sIn = Math.max(0, u - 1.2); break; }
    if (sIn >= sFirst) sIn = 0;
    var sLast = pa.L[marks[marks.length - 2]] || 0;
    for (u = pa.len; u > sLast; u -= 0.2) if (seen(u) && seen(Math.max(sLast, u - 0.6))) { sOut = Math.min(pa.len, u + 1.2); break; }
    if (sIn > 0 || sOut < pa.len) {
      var np = [zPathAt(pa, sIn)], nm = [];
      for (i = 1; i < pts.length; i++) if (pa.L[i] > sIn + 0.01 && pa.L[i] < sOut - 0.01) np.push(pts[i]); else if (pa.L[i] >= sOut - 0.01) break;
      np.push(zPathAt(pa, sOut));
      var npa = zPathMake(np);
      marks.forEach(function (mk, ii) { var sm = ii === marks.length - 1 ? sOut : pa.L[mk]; var best = 0; for (var j = 0; j < np.length; j++) if (Math.abs(npa.L[j] + sIn - sm) < Math.abs(npa.L[best] + sIn - sm)) best = j; nm.push(best); });
      pts = np; marks = nm; pa = npa;
    }
  }
  var sched = [], t = t0 || 0, ph = 0, s0 = 0, prevStop = !!still0;
  legs.forEach(function (lg, ii) {
    var s1 = pa.L[marks[ii]], L = Math.max(0.001, s1 - s0), stop = !!lg.act, ra = lg.ra || 0.9, D = zProf(undefined, L, lg.v, prevStop, stop, ra);
    sched.push({ k: 'move', t0: t, t1: t + D, s0: s0, L: L, v: lg.v, rin: prevStop, rout: stop, ra: ra, gait: lg.gait, stride: lg.stride, ph0: ph });
    t += D; ph += L / lg.stride; s0 = s1;
    if (stop) { sched.push({ k: 'stop', t0: t, t1: t + lg.dur, s: s0, act: lg.act, gait: lg.gait, ph0: ph, ii: ii }); t += lg.dur; }
    prevStop = stop;
  });
  return { pa: pa, sched: sched, T: t };
}
function zWalkAt(W0, t) {
  var S = W0.sched, i = 0; while (i < S.length - 1 && t > S[i].t1) i++;
  var e = S[i], tau = clamp(t - e.t0, 0, e.t1 - e.t0), s, sp = 0, ph;
  if (e.k === 'stop') { s = e.s; ph = e.ph0; }
  else { var r = zProf(tau, e.L, e.v, e.rin, e.rout, e.ra); s = e.s0 + r.s; sp = r.sp; ph = e.ph0 + r.s / e.stride; }
  var p = zPathAt(W0.pa, s), hd = zHead(W0.pa, e.k === 'stop' ? s - 0.05 : s);
  // the heading at a stop is the one it arrived with (or turns toward the next leg in the last moment)
  if (e.k === 'stop') { var nx2 = S[i + 1]; hd = zHead(W0.pa, Math.max(0.3, s - 0.3)); if (nx2 && tau > e.t1 - e.t0 - 0.5) { var h2 = zHead(W0.pa, s + 0.35); if (h2[0] * hd[0] < 0) hd = h2; } }
  return { x: p[0], z: p[1], hx: hd[0], hz: hd[1], sp: sp, amp: e.k === 'move' ? sp / e.v : 0, ph: ph, gait: e.gait, act: e.k === 'stop' ? e.act : null, au: tau, ad: e.t1 - e.t0, e: e, i: i, s: s, W: W0 };
}
/* the walker's state now, or (once startled) on its flight to the nearest way out */
function zWalker(a, t) {
  if (a.flee && t >= a.flee.tA) {   // startled: still for a moment (alarmed), then away along the flight path
    if (t < a.flee.t0) { var q = zWalkAt(a.flee.W, a.flee.t0); q.act = 'alarm'; q.au = t - a.flee.tA; q.ad = a.flee.t0 - a.flee.tA; q.amp = 0; q.sp = 0; return q; }
    return zWalkAt(a.flee.W, t);
  }
  return zWalkAt(a.W, t);
}
/* the gaits: stance fraction, phase of each leg (near hind, far hind, near fore, far fore), foot lift and body bob */
var ZG = {
  walk: { beta: 0.64, off: [0, 0.5, 0.25, 0.75], lift: 0.22, bob: 0.012, bobN: 2 },
  trot: { beta: 0.46, off: [0, 0.5, 0.5, 0], lift: 0.3, bob: 0.018, bobN: 2 },
  gallop: { beta: 0.34, off: [0, 0.08, 0.5, 0.6], lift: 0.42, bob: 0.05, bobN: 1 },
  bound: { beta: 0.3, off: [0, 0.04, 0.5, 0.56], lift: 0.4, bob: 0.06, bobN: 1 },
  hop: { beta: 0.45, off: [0, 0.03, 0.5, 0.55], lift: 0.3, bob: 0.04, bobN: 1 }
};
function zFoot(u, beta, sweep, lift) {   // foot offset from its neutral place: stance moves it back, swing brings it forward and up
  u = ((u % 1) + 1) % 1;
  if (u < beta) return [sweep * (0.5 - u / beta), 0, 0];
  var v = (u - beta) / (1 - beta), e = v * v * (3 - 2 * v);
  return [sweep * (-0.5 + e), Math.sin(v * Math.PI) * lift, Math.sin(v * Math.PI)];
}
/* a gait's extras: body pitch rocking, an airborne rise (a bound), and how the foreleg folds in the swing (fold scale; flick: early and quick) */
function gPitch(G, gait, ph, amp) { var pA = G.pitchA !== undefined ? G.pitchA : (gait === 'bound' || gait === 'gallop') ? 0.12 : 0; return Math.sin((ph + (G.pitchP || 0)) * TAU) * pA * amp; }
function gRise(G, ph, amp) { if (!G.rise) return 0; var u = (((ph + (G.riseP || 0)) % 1) + 1) % 1, w = G.riseW || 0.5; return u < w ? Math.sin(u / w * Math.PI) * G.rise * amp : 0; }
function gFold(G, v) { var f = G.flick ? Math.sin(Math.min(1, v * 1.3) * Math.PI) : Math.sin(v * Math.PI); return f * (G.fold || 1); }
/* screen facing and foreshortening of a heading */
function zFacing(a, x, z, hx, hz) {
  var p = P(x, 0, z), q = P(x + hx * 0.2, 0, z + hz * 0.2), dx = q.x - p.x;
  if (Math.abs(dx) > p.k * 0.03 || a.face === undefined) a.face = dx >= 0 ? 1 : -1;
  return { dir: a.face, fs: 0.42 + 0.58 * Math.min(1, Math.abs(dx) / (p.k * 0.2)) };
}
/* how much of a visitor standing at x, z (ht tall) can be seen: the share of a few sample points that nothing stands in front of.
   Uses the depth image of the upright things once it is worked out, else the tree crowns as discs (the hit circles) */
function zSeen(R, x, z, ht, y0) {
  var Z = R.Z, d = P(x, 0, z).d, n = 0, vis = 0, yb = y0 || 0;
  if (!R.crowns) {
    try { R.crowns = hitTargets({ F: F }).filter(function (h) { return h.id === 'tree'; }).map(function (h) { return { x: h.x, y: h.y, r: h.r * 0.8, d: P(h.c[0], 0, h.c[2]).d }; }); } catch (e) { R.crowns = []; }
    if (F.wisteria) { var w = LAY.wis; for (var wx = 0; wx <= 1; wx += 0.25) { var wp = P(lerp(w.x0, w.x1, wx), w.h - 0.5, w.z0); R.crowns.push({ x: wp.x, y: wp.y, r: 0.7 * wp.k, d: wp.d }); } }   // the wisteria's hanging canopy
  }
  for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
    var q = P(x + (a - 1) * ht * 0.45, yb + ht * (0.15 + b * 0.35), z), hid = false; n++;
    if (Z) { var ix = Math.floor(q.x * Z.ms), iy = Math.floor(q.y * Z.ms); if (ix >= 0 && iy >= 0 && ix < Z.w && iy < Z.h) { var k = iy * Z.w + ix, th = 1 + (d - Z.d0) / (Z.d1 - Z.d0) * 253; hid = Z.A[k] > 140 && Z.D[k] < th - 0.5; } }
    else for (var m = 0; m < R.crowns.length; m++) { var c = R.crowns[m]; if (c.d < d && Math.hypot(q.x - c.x, q.y - c.y) < c.r) { hid = true; break; } }
    if (!hid) vis++;
  }
  return vis / n;
}
/* pick stops: open cells with room around them, on screen, in view (not behind a crown or the teahouse), scored by a preference */
function zPickStop(G, R, cls, rad, rng, score, avoid, ht, reach) {   // reach: a walking-distance map; only cells it reaches
  var C = zClear(G, cls), best = null, bs = -1e9;
  for (var n = 0; n < 1500; n++) {
    var i = (rng() * G.nx) | 0, j = (rng() * G.nz) | 0, k = j * G.nx + i, cl = C[k] - G.cs * 0.5; if (cl < rad + 0.12 || G.CO[k] > 0 || (reach && reach[k] > 1e8)) continue;
    var x = G.x0 + (i + 0.5) * G.cs, z = G.z0 + (j + 0.5) * G.cs, p = P(x, 0, z); if (p.x < W * 0.1 || p.x > W * 0.9 || p.y > H * 0.93 || p.y < R.horizon + 10) continue;
    if (avoid && avoid.some(function (q) { return Math.hypot(q[0] - x, q[1] - z) < 2.5; })) continue;
    var s = score(x, z, p) + Math.min(cl, 1.2) * 0.6 + rng() * 0.4; if (s <= bs) continue;
    var sn = zSeen(R, x, z, ht || 0.5); if (sn < 0.85) continue; s -= (1 - sn) * 4;
    if (s > bs) { bs = s; best = [x, z]; }
  }
  return best;
}
/* a way in or out: just beyond the frame's side at depth z */
function zEdge(R, z, side, out) { return [R.edgeX(z, side) + side * (out || 1.6), z]; }
/* the walking distance from p to every cell this class may use (Dijkstra on the 8-neighbour grid) */
function zDistFrom(G, cls, rad, p) {
  var C = zClear(G, cls), nx = G.nx, nz = G.nz, N = nx * nz, cs = G.cs, D = new Float64Array(N), i;
  for (i = 0; i < N; i++) D[i] = 1e9;
  var A = zSnap(G, C, rad, p), s = zIdx(G, A[0], A[1]); if (s < 0) return D;
  var hp = [s], hf = [0]; D[s] = 0;
  function push(k, f) { hp.push(k); hf.push(f); var n = hp.length - 1; while (n > 0) { var q = (n - 1) >> 1; if (hf[q] <= hf[n]) break; var t1 = hp[q]; hp[q] = hp[n]; hp[n] = t1; var t2 = hf[q]; hf[q] = hf[n]; hf[n] = t2; n = q; } }
  function pop() { var top = hp[0], lk = hp.pop(), lf = hf.pop(); if (hp.length) { hp[0] = lk; hf[0] = lf; var n = 0; for (;;) { var l = 2 * n + 1, r = l + 1, m = n; if (l < hp.length && hf[l] < hf[m]) m = l; if (r < hp.length && hf[r] < hf[m]) m = r; if (m === n) break; var t1 = hp[m]; hp[m] = hp[n]; hp[n] = t1; var t2 = hf[m]; hf[m] = hf[n]; hf[n] = t2; n = m; } } return top; }
  var NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  while (hp.length) {
    var f0 = hf[0], k = pop(); if (f0 > D[k]) continue;
    var ki = k % nx, kj = (k / nx) | 0;
    for (var m = 0; m < 8; m++) { var ii = ki + NB[m][0], jj = kj + NB[m][1]; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue; var q = jj * nx + ii; if (C[q] - cs * 0.5 < rad) continue; var nd = D[k] + cs * NB[m][2]; if (nd < D[q]) { D[q] = nd; push(q, nd); } }
  }
  return D;
}
/* the best way off the frame from p: an off-screen cell it can reach, by walking distance plus a preference (side: +1 / -1 to
   favour a side, zPref a depth); returns [x, z] or null if it is walled in */
function zExitPick(G, R, cls, rad, p, side, zPref) {
  var D = zDistFrom(G, cls, rad, p), C = zClear(G, cls), best = null, bs = 1e9;
  for (var j = 0; j < G.nz; j++) {
    var z = G.z0 + (j + 0.5) * G.cs, el = R.edgeX(z, -1) - 1.2, er = R.edgeX(z, 1) + 1.2;
    for (var i = 0; i < G.nx; i++) {
      var k = j * G.nx + i, x = G.x0 + (i + 0.5) * G.cs; if (D[k] >= 1e8 || C[k] - G.cs * 0.5 < rad + 0.05 || G.CO[k] > 0) continue;
      var sd = x < el ? -1 : x > er ? 1 : 0; if (!sd || Math.abs(x - (sd < 0 ? el : er)) > 0.6) continue;
      var s = D[k] + (side && sd !== side ? 14 : 0) + (zPref === undefined ? 0 : Math.abs(z - zPref) * 0.5);
      if (s < bs) { bs = s; best = [x, z]; }
    }
  }
  return best;
}

/* ---- painters: local metres, x forward (facing +x), y up negative; ctx is translated to the ground point ---- */
function rcol(c, g) { return rgb(mulc(c, g.tint)); }
var RARE_LAST = null;
function placeAt(ctx, g, x, y, z, dir, mag) {
  var p = P(x, y, z), s = p.k * (mag || 1); RARE_LAST = { x: p.x, y: p.y, k: p.k };
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir * s, s); return p;
}
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
/* ================= four-legged visitors: a jointed side-on model =================
   Each leg is three bones (upper, lower, the cannon / foot) placed by its gait phase: the foot lies still on the ground
   through the stance and swings forward and up, the cannon flexes (a foreleg folds at the wrist, a hind leg at the hock),
   and the upper two bones reach it by two-bone IK (elbows bend back, stifles forward). The body rides on the shoulder
   and hip joints, bobbing with the gait. */
function zLeg(top, foot, L, fore, flex, toe) {
  var a = fore ? 0.04 + flex * 1.45 : -(0.3 + flex * 0.55), J = [foot[0] + Math.sin(a) * L[2], foot[1] - Math.cos(a) * L[2]];
  var k = zik(top, J, L[0], L[1], fore ? -1 : 1), dj = [k[1][0] - J[0], k[1][1] - J[1]], f = [foot[0] + dj[0], foot[1] + dj[1]];
  var tl = toe || 0, ta = fore ? flex * 1.2 : flex * 0.5, tp = [f[0] + Math.cos(ta) * tl, f[1] + Math.sin(ta) * tl * 0.6];
  return [top, k[0], k[1], f, tp];
}
/* the four feet (near hind, far hind, near fore, far fore): x offsets and lifts from the gait; amp 0 standing .. 1 full stride */
function zFeet(gait, ph, amp, stride, nh, nf, spread) {
  var G = ZG[gait] || ZG.walk, out = [];
  for (var i = 0; i < 4; i++) {
    var fore = i >= 2, base = fore ? nf : nh, q = zFoot(ph + G.off[i], G.beta, stride * G.beta * amp, G.lift * stride * 0.5 * Math.min(1, amp * 1.6));
    out.push({ x: base + q[0] + (spread ? spread[i] : 0), y: -q[1], flex: q[2] * Math.min(1, amp * 1.4), fore: fore, far: i % 2 === 1 });
  }
  return out;
}
function zBob(gait, ph, amp) { var G = ZG[gait] || ZG.walk; return -Math.abs(Math.cos(ph * Math.PI * G.bobN)) * G.bob * amp; }
function zFill(ctx, path, fill) { ctx.fillStyle = fill; ctx.fill(path); }
/* shade a part: a cool shadow under it and toward the far side, the sky's light along its top */
function zShadeIn(ctx, path, top, bot, a) {
  ctx.save(); ctx.clip(path); var gr = ctx.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(10,8,20,' + (0.12 * a) + ')'); gr.addColorStop(1, 'rgba(10,8,20,' + (0.38 * a) + ')'); ctx.fillStyle = gr; ctx.fillRect(-3, top, 6, bot - top + 0.01); ctx.restore();
}
function zrot(c, a, p) { var cs = Math.cos(a), sn = Math.sin(a); return [c[0] + p[0] * cs - p[1] * sn, c[1] + p[0] * sn + p[1] * cs]; }
function zLimbDraw(ctx, pts, ws, c0, c1, k0, k1, noCap) {
  var p = zlimb(pts, ws, noCap), a = pts[0], b = pts[pts.length - 1];
  ctx.fillStyle = zgrad2(ctx, a[0], a[1], b[0], b[1], c0, c1 || c0, k0 === undefined ? RL.hi * 0.95 : k0, k1 === undefined ? RL.lo * 1.05 : k1); ctx.fill(p); return p;
}
var ZFUR = {};
function zFur(key, n, box, len, ang, jit) { if (!ZFUR[key]) ZFUR[key] = zfurList(key.length * 977 + n, n, box[0], box[1], box[2], box[3], len, ang, jit); return ZFUR[key]; }

/* ---- the red fox (ホンドギツネ): head and body 65 cm, tail 38 cm, 38 cm at the shoulder. Slim black-stockinged legs, big
   black-backed ears, a long fine muzzle with white lips, cheeks and throat, the brush full and white-tipped ---- */
var FOXC = { coat: [204, 120, 58], back: [170, 92, 44], light: [226, 160, 96], cream: [242, 232, 214], blk: [36, 28, 26], leg: [62, 40, 30], tip: [248, 246, 240], eye: [214, 160, 40] };
function foxPaint(ctx, o) {
  var C = FOXC, winter = o.winter, fl = winter ? 1.12 : 1, cr = o.crouch || 0, ph = o.ph || 0, amp = o.amp || 0, gait = o.gait || 'trot', bob = zBob(gait, ph, amp);
  var lift = o.lift || 0, arch = o.arch || 0;   // a pounce: the body pitched nose-down, hind end up
  ctx.save(); if (lift || arch) { ctx.translate(0, -lift); ctx.rotate(arch); }
  var S = [0.19, -0.3 + bob + cr * 0.09], Hp = [-0.2, -0.31 + bob * 0.8 + cr * 0.11], stride = o.stride || 0.85;
  var feet = o.tuck ? null : zFeet(gait, ph, amp, stride, -0.19, 0.22, [0, -0.03, 0, 0.035]);
  var LF = [0.13, 0.135, 0.075], LH = [0.14, 0.15, 0.085];
  function leg(f, i) {
    var top = f.fore ? [S[0] + (f.far ? 0.01 : 0), S[1]] : [Hp[0] + (f.far ? 0.012 : 0), Hp[1]], pts = zLeg(top, [f.x, f.y], f.fore ? LF : LH, f.fore, f.flex, 0.035);
    var dk = f.far ? 0.62 : 1, ws = f.fore ? [0.09, 0.05, 0.03, 0.028, 0.022] : [0.15, 0.08, 0.034, 0.028, 0.022];
    var up = zlimb(pts.slice(0, 3), ws.slice(0, 3), true);
    if (f.far) { ctx.fillStyle = zgrad2(ctx, 0, top[1], 0, pts[2][1], scl(C.coat, dk), scl(f.fore ? C.leg : C.back, dk), RL.hi * 0.9, RL.lo); ctx.fill(up); }
    else { ctx.fillStyle = zgrad2(ctx, 0, -0.44, 0, -0.08, C.back, f.fore ? C.leg : scl(C.back, 0.8), RL.hi, RL.lo); ctx.fill(up); ctx.save(); ctx.clip(up); zsoft(ctx, top[0], top[1], 0.08, 0.07, C.light, 0.35); ctx.restore(); }
    zLimbDraw(ctx, pts.slice(2), ws.slice(2), scl(C.blk, dk * 1.1), scl(C.blk, dk), RL.hi * 0.9, RL.lo);   // the black stockings
  }
  function tuckLegs(far) { // in the air: forelegs folded under the chest, hind legs trailing
    var dk = far ? 0.62 : 1, dx = far ? 0.02 : 0;
    zLimbDraw(ctx, [[S[0] + dx, S[1]], [S[0] + 0.02 + dx, S[1] + 0.12], [S[0] + 0.13 + dx, S[1] + 0.1], [S[0] + 0.17 + dx, S[1] + 0.14]], [0.08, 0.04, 0.03, 0.025], scl(C.blk, dk), scl(C.blk, dk));
    zLimbDraw(ctx, [[Hp[0] + dx, Hp[1]], [Hp[0] + 0.06 + dx, Hp[1] + 0.13], [Hp[0] - 0.08 + dx, Hp[1] + 0.2], [Hp[0] - 0.16 + dx, Hp[1] + 0.24]], [0.12, 0.05, 0.03, 0.025], scl(C.coat, dk), scl(C.blk, dk));
  }
  if (feet) { leg(feet[1], 1); leg(feet[3], 3); } else tuckLegs(true);
  // the brush
  var T = [Hp[0] - 0.08, Hp[1] - 0.06], ta = (o.tailA === undefined ? (amp > 0.2 ? -0.22 : -0.75) : o.tailA) + Math.sin((o.t || 0) * 1.7) * 0.05 + (o.swish ? Math.sin((o.t || 0) * 6) * 0.15 * o.swish : 0);
  var tb = -0.12 * Math.min(1, Math.abs(ta)), tp = [T, zrot(T, ta, [-0.1, 0.01]), zrot(T, ta, [-0.22, 0.04 + tb * 0.3]), zrot(T, ta, [-0.33, 0.08 + tb * 0.5]), zrot(T, ta, [-0.4, 0.1 + tb * 0.6])];
  var tw = [0.07 * fl, 0.13 * fl, 0.15 * fl, 0.12 * fl, 0.05];
  var tpath = zlimb(tp, tw); ctx.fillStyle = zgrad(ctx, tp[2][0], tp[2][1], 0.1, C.coat); ctx.fill(tpath);
  ctx.save(); ctx.clip(tpath); zsoft(ctx, tp[1][0], tp[1][1] - 0.04, 0.12, 0.05, C.blk, 0.35); ctx.fillStyle = zc(C.tip); ctx.beginPath(); ctx.arc(tp[4][0], tp[4][1], 0.085 * fl, 0, TAU); ctx.fill(); zsoft(ctx, tp[3][0] + 0.02, tp[3][1], 0.05, 0.06, C.blk, 0.35); ctx.restore();
  zstrokes(ctx, tpath, zFur('foxtail2', 60, [-0.42, -0.08, 0.0, 0.12], 0.04, 0, 0.5).map(function (s) { var q = zrot(T, ta, [s[0], s[1] + 0.02]), e = zrot(T, ta, [s[0] - 0.045, s[1] + 0.03]); return [q[0], q[1], e[0], e[1], s[4]]; }), C.back, C.light, 0.006, 0.35);
  ctx.save(); ctx.strokeStyle = zc(C.coat, 1, 0.6); ctx.lineWidth = 0.008; ctx.lineCap = 'round'; for (var tf = 0; tf < 14; tf++) { var uu = 0.15 + tf / 14 * 0.8, cq = zrot(T, ta, [-0.4 * uu, 0.04 + tb * 0.4 * uu]), wv = tw[Math.min(4, Math.round(uu * 4))] * 0.5, sd = tf % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(cq[0], cq[1] + sd * wv * 0.8); ctx.lineTo(cq[0] - 0.03, cq[1] + sd * (wv + 0.012)); ctx.stroke(); } ctx.restore();
  // the body: one outline from the tail root over the back, the withers, down the chest and along the belly
  var body = zpath([[T[0] + 0.02, T[1] + 0.01], [Hp[0] - 0.02, Hp[1] - 0.085 * fl], [-0.02, -0.405 + bob * 0.9 - 0.01 * fl + cr * 0.1], [S[0] - 0.02, S[1] - 0.105 * fl], [S[0] + 0.1, S[1] - 0.06], [S[0] + 0.12, S[1] + 0.02], [S[0] + 0.03, S[1] + 0.085 * fl], [-0.04, -0.215 + bob * 0.9 + cr * 0.1], [Hp[0] + 0.08, Hp[1] + 0.06], [Hp[0] - 0.03, Hp[1] + 0.09], [Hp[0] - 0.1, Hp[1] + 0.02]]);
  ctx.fillStyle = zgrad2(ctx, 0, -0.42, 0, -0.2, C.back, C.coat, RL.hi, 0.95); ctx.fill(body);
  ctx.save(); ctx.clip(body);
  zsoft(ctx, 0.0, -0.34 + bob, 0.22, 0.06, C.light, 0.55);                       // the sunlit flank
  zsoft(ctx, -0.02, -0.215 + bob + cr * 0.1, 0.18, 0.035, C.cream, 0.8);          // pale belly
  zsoft(ctx, S[0] + 0.07, S[1] + 0.02, 0.07, 0.09, C.cream, 0.95);                // white chest
  ctx.restore();
  zstrokes(ctx, body, zFur('foxbody', 110, [-0.3, -0.44, 0.3, -0.2], 0.022, Math.PI + 0.3, 0.35), C.back, C.light, 0.004, 0.32);
  zShadeIn(ctx, body, -0.42, -0.2, 1); zrim(ctx, body, 0.012);
  if (feet) { leg(feet[0], 0); leg(feet[2], 2); } else tuckLegs(false);
  // the neck and head
  var hd = o.head || {}, hp = hd.pitch === undefined ? 0.12 : hd.pitch, Hj = hd.at || [0.34, -0.43 + bob], yaw = clamp(hd.yaw || 0);
  var neck = zlimb([[S[0] - 0.02, S[1] - 0.05], [lerp(S[0], Hj[0], 0.55), lerp(S[1] - 0.04, Hj[1], 0.6)], Hj], [0.14 * fl, 0.11 * fl, 0.085]);
  ctx.fillStyle = zgrad2(ctx, Hj[0], Hj[1] - 0.05, S[0], S[1] + 0.05, C.coat, C.coat, RL.hi, RL.lo * 1.2); ctx.fill(neck);
  ctx.save(); ctx.clip(neck); zsoft(ctx, lerp(S[0], Hj[0], 0.6) + 0.04, lerp(S[1], Hj[1], 0.6) + 0.05, 0.06, 0.09, C.cream, 0.95, 1, -0.6); ctx.restore();
  zstrokes(ctx, neck, zFur('foxneck', 30, [0.12, -0.55, 0.42, -0.22], 0.02, Math.PI * 0.75, 0.4), C.back, C.light, 0.004, 0.3);
  ctx.save(); ctx.translate(Hj[0], Hj[1]); ctx.rotate(hp);
  var ml = 0.15 * (1 - 0.55 * yaw), ear = o.ears === undefined ? 0 : o.ears;   // ears: 0 up and forward, 1 flattened back
  function earP(dx, back) { var b0 = [dx - 0.012, -0.03], b1 = [dx + 0.035, -0.034], tip = [dx - 0.005 - ear * 0.06 - back, -0.12 + ear * 0.05]; return zpath([b0, [lerp(b0[0], tip[0], 0.5) - 0.01, lerp(b0[1], tip[1], 0.5)], tip, [lerp(b1[0], tip[0], 0.45) + 0.012, lerp(b1[1], tip[1], 0.45)], b1]); }
  var far = earP(0.03 + yaw * 0.05, 0.01); ctx.fillStyle = zc(C.blk, 0.75); ctx.fill(far);
  var hpath = zpath([[-0.035, -0.01], [-0.02, -0.045], [0.03, -0.05], [0.075, -0.03], [0.09 + ml * 0.35, -0.02], [ml + 0.01, -0.006], [ml + 0.012, 0.008], [0.08 + ml * 0.2, 0.025], [0.04, 0.045], [-0.02, 0.04]]);
  ctx.fillStyle = zgrad(ctx, 0.04, 0, 0.06, C.coat); ctx.fill(hpath);
  ctx.save(); ctx.clip(hpath); zsoft(ctx, 0.07 + ml * 0.25, 0.03, 0.07 + ml * 0.3, 0.025, C.cream, 1); zsoft(ctx, 0.0, 0.035, 0.045, 0.03, C.cream, 0.9); zsoft(ctx, 0.05 + ml * 0.3, -0.012, 0.03 + ml * 0.25, 0.008, C.back, 0.5); ctx.restore();
  zrim(ctx, hpath, 0.007);
  var near = earP(0.0 - yaw * 0.02, 0.0); ctx.fillStyle = zgrad2(ctx, 0, -0.03, 0, -0.12, C.coat, C.blk, RL.hi, 0.9); ctx.fill(near);
  ctx.save(); ctx.clip(near); ctx.fillStyle = zc(C.blk); ctx.fillRect(-0.12, -0.2, 0.24, 0.09 - ear * 0.03); zsoft(ctx, 0.012, -0.06, 0.012, 0.03, C.cream, 0.6 * (1 - yaw)); ctx.restore();
  var bl = o.blink === undefined ? 1 : o.blink, eyeX = 0.065 + ml * 0.08;
  zeye(ctx, eyeX, -0.018, 0.0095, C.eye, bl, true);
  if (yaw > 0.35) zeye(ctx, eyeX + 0.035, -0.02, 0.008 * yaw, C.eye, bl, true);
  if (o.shine && bl > 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,230,140,' + (0.6 * o.shine) + ')'; ctx.beginPath(); ctx.arc(eyeX, -0.018, 0.012, 0, TAU); if (yaw > 0.35) ctx.arc(eyeX + 0.035, -0.02, 0.011, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.fillStyle = 'rgb(22,18,18)'; ctx.beginPath(); ctx.ellipse(ml + 0.008, -0.001, 0.011, 0.009, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,18,0.6)'; ctx.lineWidth = 0.004; ctx.beginPath(); ctx.moveTo(ml - 0.004, 0.012); ctx.quadraticCurveTo(0.09, 0.018, 0.06, 0.02); ctx.stroke();   // the mouth line
  ctx.restore();
  ctx.restore();
}

/* ---- the raccoon dog (ホンドタヌキ): head and body 55 cm, tail 15 cm, low (25 cm at the shoulder) and round in its long
   grizzled coat. Black stockings to the shoulder and a dark band across the shoulders, the black mask over the eyes and
   cheeks with a pale brow and muzzle above it, small rounded dark-rimmed ears, a short bushy tail dark along the top ---- */
var TANC = { coat: [128, 106, 80], back: [92, 78, 62], frost: [206, 194, 168], dark: [36, 30, 27], face: [216, 206, 184], ruff: [170, 156, 132], eye: [120, 84, 40] };
function tanukiPaint(ctx, o) {
  var C = TANC, ph = o.ph || 0, amp = o.amp || 0, gait = o.gait || 'walk', bob = zBob(gait, ph, amp) * 0.8, cr = o.crouch || 0, br = Math.sin((o.t || 0) * 2.2) * 0.004;
  var S = [0.13, -0.2 + bob + cr * 0.03], Hp = [-0.14, -0.205 + bob * 0.7 + cr * 0.05], stride = o.stride || 0.34;
  var feet = zFeet(gait, ph, amp, stride, -0.13, 0.15, [0, -0.025, 0, 0.03]);
  var LF = [0.075, 0.075, 0.045], LH = [0.085, 0.085, 0.05];
  function leg(f) {
    var top = f.fore ? [S[0] + (f.far ? 0.012 : 0), S[1]] : [Hp[0] + (f.far ? 0.014 : 0), Hp[1]], pts = zLeg(top, [f.x, f.y], f.fore ? LF : LH, f.fore, f.flex, 0.03);
    var dk = f.far ? 0.6 : 1, ws = f.fore ? [0.09, 0.055, 0.04, 0.036, 0.03] : [0.11, 0.07, 0.042, 0.036, 0.03];
    var up = zLimbDraw(ctx, pts.slice(0, 3), ws.slice(0, 3), scl(f.fore ? C.dark : C.coat, dk), scl(C.dark, dk), RL.hi * (f.fore ? 0.85 : 1), RL.lo);
    if (!f.far && !f.fore) zstrokes(ctx, up, zFur('tanthigh', 50, [top[0] - 0.08, top[1] - 0.04, top[0] + 0.08, top[1] + 0.12], 0.016, Math.PI * 0.55, 0.5), C.dark, C.frost, 0.004, 0.3);
    zLimbDraw(ctx, pts.slice(2), ws.slice(2), scl(C.dark, dk * 1.05), scl(C.dark, dk * 0.9), RL.hi * 0.8, RL.lo);
  }
  leg(feet[1]); leg(feet[3]);
  // the tail: short, thick, carried low, with a dark stripe along the top
  var T = [Hp[0] - 0.07, Hp[1] - 0.02 + br], ta = (o.tailA === undefined ? -0.95 : o.tailA) + Math.sin((o.t || 0) * 1.3) * 0.04;
  var tp = [T, zrot(T, ta, [-0.06, 0.0]), zrot(T, ta, [-0.12, 0.01]), zrot(T, ta, [-0.16, 0.02])];
  var tpath = zlimb(tp, [0.07, 0.09, 0.075, 0.03]); ctx.fillStyle = zgrad(ctx, tp[1][0], tp[1][1], 0.06, C.coat); ctx.fill(tpath);
  ctx.save(); ctx.clip(tpath); zsoft(ctx, tp[1][0] - 0.01, tp[1][1] - 0.035, 0.09, 0.03, C.dark, 0.7, 1, ta); zsoft(ctx, tp[3][0], tp[3][1], 0.04, 0.04, C.dark, 0.6); ctx.restore();
  zstrokes(ctx, tpath, zFur('tantail', 50, [-0.17, -0.05, 0.0, 0.05], 0.02, 0, 0.6).map(function (s) { var q = zrot(T, ta, [s[0], s[1]]), e = zrot(T, ta, [s[0] - 0.02, s[1] + 0.008]); return [q[0], q[1], e[0], e[1], s[4]]; }), C.dark, C.frost, 0.0045, 0.35);
  // the body: round and deep, the coat standing out in a ragged edge
  var top = -0.345 + bob * 0.9 + br + cr * 0.04, belly = -0.11 + bob * 0.9 + cr * 0.06;
  var body = zpath([[T[0] + 0.03, T[1] + 0.01], [Hp[0] - 0.05, Hp[1] - 0.1], [-0.08, top + 0.01], [0.04, top - 0.005], [S[0] - 0.01, S[1] - 0.12], [S[0] + 0.08, S[1] - 0.07], [S[0] + 0.1, S[1] + 0.01], [S[0] + 0.03, belly + 0.02], [-0.02, belly - 0.005], [Hp[0] + 0.06, belly + 0.005], [Hp[0] - 0.06, Hp[1] + 0.07], [Hp[0] - 0.1, Hp[1] + 0.0]]);
  ctx.fillStyle = zgrad2(ctx, 0, top, 0, belly, C.coat, C.back, RL.hi, 0.85); ctx.fill(body);
  ctx.save(); ctx.clip(body);
  zsoft(ctx, -0.02, top + 0.06, 0.24, 0.07, C.frost, 0.45);                         // the frosted guard hairs over the back
  zsoft(ctx, S[0] - 0.02, S[1] - 0.02, 0.06, 0.15, C.dark, 0.5, 1, -0.25);           // the dark band over the shoulders
  zsoft(ctx, S[0] + 0.06, S[1] + 0.0, 0.07, 0.09, C.dark, 0.9);                      // dark chest
  zsoft(ctx, -0.04, top + 0.02, 0.2, 0.025, C.back, 0.6);                            // the dark line along the spine
  ctx.restore();
  zstrokes(ctx, body, zFur('tanbody', 190, [-0.28, top - 0.02, 0.22, belly], 0.018, Math.PI + 0.5, 0.6), C.dark, C.frost, 0.004, 0.32);
  zShadeIn(ctx, body, top, belly + 0.02, 1.1); zrim(ctx, body, 0.012);
  // the ragged edge: tufts standing off the back and hanging under the belly
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 0.007;
  var fr = zFur('tanfringe', 46, [0, 0, 1, 1], 1, 0, 0);
  for (var i = 0; i < fr.length; i++) {
    var u = fr[i][0], up = fr[i][1] < 0.6, x = lerp(Hp[0] - 0.06, S[0] + (up ? 0.0 : 0.05), u), y = up ? top + 0.012 + Math.pow(Math.abs(u - 0.45) * 2, 2) * 0.06 : belly - 0.01 + Math.sin(u * Math.PI) * 0.005;
    ctx.strokeStyle = zc(fr[i][4] < 0.5 ? C.back : C.frost, 1, up ? 0.5 : 0.6); ctx.beginPath(); ctx.moveTo(x, y + (up ? 0.01 : -0.01)); ctx.lineTo(x - 0.012, y + (up ? -0.007 : 0.013)); ctx.stroke();
  }
  ctx.restore();
  leg(feet[0]); leg(feet[2]);
  // the head: broad and rounded with cheek ruffs, the muzzle short and pointed
  var hd = o.head || {}, hp = hd.pitch === undefined ? 0.15 : hd.pitch, yaw = clamp(hd.yaw || 0), Hj = hd.at || [S[0] + 0.11, S[1] - 0.06 + bob * 0.5 + hp * 0.06];
  var neck = zlimb([[S[0] - 0.02, S[1] - 0.05], [lerp(S[0], Hj[0], 0.6), lerp(S[1] - 0.03, Hj[1], 0.6)], Hj], [0.15, 0.12, 0.1]);
  ctx.fillStyle = zgrad2(ctx, Hj[0], Hj[1] - 0.06, S[0] + 0.04, S[1] + 0.06, C.coat, C.dark, RL.hi * 0.95, RL.lo * 1.1); ctx.fill(neck);
  ctx.save(); ctx.clip(neck); zsoft(ctx, lerp(S[0], Hj[0], 0.4), S[1] - 0.1, 0.08, 0.035, C.frost, 0.35); zsoft(ctx, S[0] + 0.05, S[1] + 0.0, 0.07, 0.07, C.dark, 0.8); ctx.restore();
  zstrokes(ctx, neck, zFur('tanneck', 60, [S[0] - 0.08, S[1] - 0.16, Hj[0] + 0.02, S[1] + 0.04], 0.016, Math.PI * 0.8, 0.5), C.dark, C.frost, 0.004, 0.32);
  ctx.save(); ctx.translate(Hj[0], Hj[1]); ctx.rotate(hp);
  var ml = 0.085 * (1 - 0.5 * yaw), sn = Math.sin((o.t || 0) * 14) * (o.sniff || 0) * 0.004;
  function earP(dx) { return zpath([[dx - 0.025, -0.035], [dx - 0.028, -0.065], [dx - 0.008, -0.078], [dx + 0.014, -0.066], [dx + 0.018, -0.035]]); }
  var far = earP(0.035 + yaw * 0.03); ctx.fillStyle = zc(C.dark, 0.8); ctx.fill(far);
  var ruff = zpath([[-0.06, -0.01], [-0.045, -0.05], [0.0, -0.055], [0.035, -0.035], [0.03, 0.045], [-0.01, 0.07], [-0.06, 0.05], [-0.075, 0.02]]);
  ctx.fillStyle = zgrad(ctx, -0.02, 0.0, 0.07, C.ruff); ctx.fill(ruff);
  zstrokes(ctx, ruff, zFur('tanruff', 50, [-0.08, -0.05, 0.03, 0.07], 0.016, Math.PI * 0.7, 0.5), C.dark, C.frost, 0.004, 0.35);
  var hpath = zpath([[-0.035, -0.02], [-0.01, -0.05], [0.03, -0.048], [0.06, -0.03], [ml + 0.005, -0.008 + sn], [ml + 0.012, 0.006 + sn], [ml - 0.01, 0.02], [0.04, 0.035], [0.0, 0.04], [-0.03, 0.025]]);
  ctx.fillStyle = zgrad(ctx, 0.02, 0, 0.05, C.face); ctx.fill(hpath);
  ctx.save(); ctx.clip(hpath);
  zsoft(ctx, 0.035 - yaw * 0.01, 0.005, 0.042, 0.03, C.dark, 1, 1, 0.25);               // the mask, from the eye down over the cheek
  zsoft(ctx, 0.015, 0.03, 0.035, 0.02, C.dark, 0.8);
  zsoft(ctx, 0.04, -0.035, 0.04, 0.012, C.face, 0.9);                                    // the pale brow
  zsoft(ctx, ml - 0.01, -0.006 + sn, 0.028, 0.012, C.face, 0.9);                         // the pale top of the muzzle
  zsoft(ctx, -0.02, -0.03, 0.03, 0.02, C.coat, 0.8);                                     // crown
  ctx.restore();
  zrim(ctx, hpath, 0.006);
  var near = earP(0.0 - yaw * 0.015); ctx.fillStyle = zgrad2(ctx, 0, -0.035, 0, -0.078, C.coat, C.dark, RL.hi, 0.9); ctx.fill(near);
  ctx.save(); ctx.clip(near); zsoft(ctx, -0.005, -0.055, 0.012, 0.016, C.face, 0.5); ctx.restore();
  ctx.strokeStyle = zc(C.dark, 1, 0.9); ctx.lineWidth = 0.006; ctx.stroke(near);
  var bl = o.blink === undefined ? 1 : o.blink, ex = 0.045 + ml * 0.05;
  zeye(ctx, ex, -0.008, 0.0085, C.eye, bl, false);
  if (yaw > 0.35) zeye(ctx, ex + 0.03, -0.01, 0.007 * yaw, C.eye, bl, false);
  if (o.shine && bl > 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(230,210,150,' + (0.65 * o.shine) + ')'; ctx.beginPath(); ctx.arc(ex, -0.008, 0.011, 0, TAU); if (yaw > 0.35) ctx.arc(ex + 0.03, -0.01, 0.01, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.fillStyle = 'rgb(20,16,16)'; ctx.beginPath(); ctx.ellipse(ml + 0.009, 0.0 + sn, 0.012, 0.01, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(ml + 0.012, -0.004 + sn, 0.003, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---- the Japanese hare (ニホンノウサギ) in its winter white: head and body 50 cm, long hind feet, ears a little shorter than
   the head is long plus half again, with black tips; a big amber eye set high on the side of the head. It sits hunched,
   the hind feet flat under the haunch; it moves in hops, the forefeet landing first and the hind feet swinging past them ---- */
var HAREC = { coat: [246, 247, 250], shade: [196, 204, 220], tip: [28, 26, 30], inner: [226, 200, 200], eye: [190, 128, 52], nose: [200, 150, 150] };
function lerpPts(A, B, e) { var o = []; for (var i = 0; i < A.length; i++) o.push([lerp(A[i][0], B[i][0], e), lerp(A[i][1], B[i][1], e)]); return o; }
var HARE_SIT = [[-0.2, -0.05], [-0.22, -0.13], [-0.17, -0.22], [-0.06, -0.265], [0.05, -0.255], [0.11, -0.21], [0.135, -0.14], [0.11, -0.06], [0.0, -0.035], [-0.12, -0.025]];
var HARE_UP = [[-0.17, -0.05], [-0.19, -0.14], [-0.15, -0.25], [-0.07, -0.33], [0.02, -0.37], [0.08, -0.34], [0.11, -0.26], [0.1, -0.15], [0.03, -0.07], [-0.1, -0.03]];
var HARE_STR = [[-0.26, -0.2], [-0.25, -0.27], [-0.15, -0.31], [0.0, -0.315], [0.12, -0.305], [0.19, -0.275], [0.21, -0.225], [0.15, -0.185], [0.0, -0.175], [-0.17, -0.175]];
function harePaint(ctx, o) {
  var C = HAREC, e = clamp(o.ext || 0), up = clamp(o.up || 0), lift = o.lift || 0, br = Math.sin((o.t || 0) * 2.6) * 0.003 * (1 - e);
  var base = lerpPts(lerpPts(HARE_SIT, HARE_UP, up), HARE_STR, e);
  ctx.save(); ctx.translate(0, -lift); if (o.pitch) ctx.rotate(o.pitch);
  var hip = [lerp(lerp(-0.12, -0.1, up), -0.16, e), lerp(lerp(-0.13, -0.14, up), -0.23, e)], sh = [lerp(lerp(0.07, 0.06, up), 0.13, e), lerp(lerp(-0.17, -0.25, up), -0.24, e)];
  // the legs: far pair first. Hind: a long foot from the heel; fore: slim and straight
  var hf = o.hindF || [lerp(-0.03, 0.32, 0) , 0], ff = o.foreF || [0.12, 0];
  function hind(far) {
    var dk = far ? 0.84 : 1, dx = far ? 0.015 : 0, tf = [hf[0] + dx, hf[1]], th = o.hindT !== undefined ? o.hindT : 0;   // th: 0 the foot flat (toes forward), 1 trailing back
    var heel = [tf[0] - lerp(0.14, -0.11, th) , tf[1] - lerp(0.0, 0.05, th)];
    var k = zik([hip[0] + dx, hip[1] + 0.03], heel, 0.12, 0.11, 1);
    var leg = zlimb([[hip[0] + dx, hip[1] + 0.02], k[0], k[1], tf], [0.11, 0.06, 0.035, 0.03]);
    ctx.fillStyle = zgrad2(ctx, 0, hip[1] - 0.05, 0, tf[1], scl(C.coat, dk), scl(C.shade, dk), RL.hi, RL.lo * 1.1); ctx.fill(leg);
  }
  function fore(far) {
    var dk = far ? 0.84 : 1, dx = far ? 0.018 : 0, tf = [ff[0] + dx, ff[1]], fl = o.foreFlex || 0;
    var el = [lerp(sh[0], tf[0], 0.5) - 0.02 - fl * 0.03, lerp(sh[1], tf[1], 0.5) + fl * 0.02];
    var leg = zlimb([[sh[0] + dx, sh[1] + 0.02], el, [tf[0] - 0.01, tf[1] - 0.012], tf], [0.06, 0.03, 0.022, 0.024]);
    ctx.fillStyle = zgrad2(ctx, 0, sh[1], 0, tf[1], scl(C.coat, dk), scl(C.shade, dk), RL.hi * 0.95, RL.lo * 1.15); ctx.fill(leg);
  }
  hind(true); fore(true);
  // the scut: a white puff at the rump, held up as it runs
  var sc = [base[1][0] - 0.005, base[1][1] - 0.01 - e * 0.02]; ctx.fillStyle = zgrad(ctx, sc[0], sc[1], 0.035, C.coat); ctx.beginPath(); ctx.ellipse(sc[0], sc[1], 0.03, 0.025, 0, 0, TAU); ctx.fill();
  // the body
  var bp = base.map(function (q, i) { return [q[0], q[1] + (i >= 2 && i <= 5 ? br : 0)]; }), body = zpath(bp);
  ctx.fillStyle = zgrad2(ctx, 0, -0.3, 0, -0.03, C.coat, C.shade, RL.hi * 1.02, lerp(RL.lo, 1, 0.45)); ctx.fill(body);
  ctx.save(); ctx.clip(body); zsoft(ctx, hip[0] + 0.01, hip[1] + 0.02, 0.1, 0.09, C.shade, 0.35); zsoft(ctx, hip[0] + 0.01, hip[1] - 0.03, 0.08, 0.05, C.coat, 0.8); zsoft(ctx, -0.02, -0.04, 0.16, 0.04, C.shade, 0.4); ctx.restore();
  zstrokes(ctx, body, zFur('harebody', 120, [-0.26, -0.37, 0.2, -0.03], 0.016, Math.PI + 0.35, 0.5), C.shade, [255, 255, 255], 0.0035, 0.32);
  zShadeIn(ctx, body, -0.32, -0.02, 0.6); zrim(ctx, body, 0.01, 1.2);
  // the near thigh: the haunch shows as a curve over the flank
  ctx.save(); ctx.clip(body); ctx.strokeStyle = zc(C.shade, 0.95, 0.55); ctx.lineWidth = 0.006; ctx.beginPath(); ctx.arc(hip[0] + 0.02, hip[1] + 0.03, 0.085, -2.6, 0.4); ctx.stroke(); ctx.restore();
  hind(false); fore(false);
  // the head
  var hd = o.head || {}, hp = hd.pitch || 0, yaw = clamp(hd.yaw || 0), Hc = [lerp(lerp(0.15, 0.12, up), 0.25, e), lerp(lerp(-0.25, -0.36, up), -0.31, e) + br];
  var neck = zlimb([[sh[0] - 0.03, sh[1] - 0.01], [lerp(sh[0], Hc[0], 0.5) - 0.01, lerp(sh[1], Hc[1], 0.5)], [Hc[0] - 0.02, Hc[1] + 0.01]], [0.15, 0.12, 0.085]); ctx.fillStyle = zgrad2(ctx, 0, Hc[1] - 0.04, 0, sh[1] + 0.08, C.coat, C.shade, RL.hi, lerp(RL.lo, 1, 0.45)); ctx.fill(neck);
  zstrokes(ctx, neck, zFur('hareneck', 30, [sh[0] - 0.08, Hc[1] - 0.03, Hc[0] + 0.02, sh[1] + 0.04], 0.014, Math.PI * 0.75, 0.5), C.shade, [255, 255, 255], 0.003, 0.3);
  ctx.save(); ctx.translate(Hc[0], Hc[1]); ctx.rotate(hp);
  var ea = (o.ears === undefined ? 0 : o.ears), tw = Math.sin((o.t || 0) * 1.9 + 1) * 0.05 * (1 - e);
  function ear(far) {
    var a = lerp(-1.85, -2.75, ea) + (far ? 0.14 : 0) + tw * (far ? -1 : 1), L = 0.15, b = [far ? 0.0 : -0.012, -0.03], tip = [b[0] + Math.cos(a) * L, b[1] + Math.sin(a) * L], nx = -Math.sin(a), ny = Math.cos(a);
    var p = zpath([[b[0] - nx * 0.014, b[1] - ny * 0.014], [lerp(b[0], tip[0], 0.5) - nx * 0.024, lerp(b[1], tip[1], 0.5) - ny * 0.024], [lerp(b[0], tip[0], 0.92) - nx * 0.012, lerp(b[1], tip[1], 0.92) - ny * 0.012], tip, [lerp(b[0], tip[0], 0.9) + nx * 0.012, lerp(b[1], tip[1], 0.9) + ny * 0.012], [lerp(b[0], tip[0], 0.5) + nx * 0.02, lerp(b[1], tip[1], 0.5) + ny * 0.02], [b[0] + nx * 0.013, b[1] + ny * 0.013]]);
    ctx.fillStyle = zgrad2(ctx, b[0], b[1], tip[0], tip[1], scl(C.coat, far ? 0.84 : 1), scl(C.shade, far ? 0.84 : 1), RL.hi, lerp(RL.lo, 1, 0.4)); ctx.fill(p);
    ctx.save(); ctx.clip(p);
    if (!far) zsoft(ctx, lerp(b[0], tip[0], 0.5) + nx * 0.006, lerp(b[1], tip[1], 0.5) + ny * 0.006, 0.04, 0.008, C.inner, 0.5 + 0.3 * yaw, 1, a);
    ctx.fillStyle = zc(C.tip, far ? 0.8 : 1); ctx.beginPath(); ctx.arc(tip[0] - Math.cos(a) * 0.005, tip[1] - Math.sin(a) * 0.005, 0.03, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ear(true);
  var head = zpath([[-0.045, -0.005], [-0.035, -0.04], [0.005, -0.05], [0.045, -0.035], [0.075, -0.01], [0.08, 0.01], [0.06, 0.03], [0.02, 0.04], [-0.03, 0.03]]);
  ctx.fillStyle = zgrad(ctx, 0.01, -0.01, 0.05, C.coat); ctx.fill(head);
  ctx.save(); ctx.clip(head); zsoft(ctx, 0.0, 0.025, 0.05, 0.02, C.shade, 0.5); zsoft(ctx, 0.06, 0.0, 0.025, 0.02, C.coat, 0.7); ctx.restore();
  zstrokes(ctx, head, zFur('harehead', 30, [-0.05, -0.05, 0.08, 0.04], 0.012, Math.PI + 0.2, 0.5), C.shade, [255, 255, 255], 0.003, 0.25);
  zrim(ctx, head, 0.006, 1.2);
  ear(false);
  var bl = o.blink === undefined ? 1 : o.blink;
  ctx.fillStyle = zc(C.shade, 0.85, 0.5); ctx.beginPath(); ctx.ellipse(0.022, -0.012, 0.017, 0.014, 0, 0, TAU); ctx.fill();   // the darker ring round the eye
  zeye(ctx, 0.022, -0.013, 0.011, C.eye, bl, false);
  if (yaw > 0.4) zeye(ctx, 0.05, -0.015, 0.008 * yaw, C.eye, bl, false);
  ctx.fillStyle = zc(C.nose); ctx.beginPath(); ctx.ellipse(0.078, 0.004 + Math.sin((o.t || 0) * 11) * 0.0015 * (o.sniff || 0), 0.006, 0.005, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = zc(C.shade, 0.7, 0.7); ctx.lineWidth = 0.003; ctx.beginPath(); ctx.moveTo(0.075, 0.01); ctx.quadraticCurveTo(0.07, 0.022, 0.058, 0.024); ctx.stroke();
  ctx.strokeStyle = 'rgba(250,250,250,0.35)'; ctx.lineWidth = 0.0015; ctx.beginPath(); for (var w = 0; w < 4; w++) { ctx.moveTo(0.07, 0.008); ctx.lineTo(0.12, -0.005 + w * 0.01); } ctx.stroke();   // whiskers
  ctx.restore();
  ctx.restore();
}
/* the hop as a pose: u 0..1 through one hop (airborne for the first 55%, then gathering on the ground) */
/* one hop, as keyframes (u 0..1): the crouch, the push-off with the hind legs driving back to full extension, the stretched leap,
   the forefeet coming down, the hind feet swinging forward past them as the back rounds, and the gathered crouch again.
   h: the leap's height; len: its length (the hind feet reach further forward in a long, fast bound) */
var HAREK = [
  { u: 0.0, ext: 0.05, lift: 0, pitch: 0, foreF: [0.12, 0], foreFlex: 0, hindF: [-0.03, 0], hindT: 0, ears: 0.15 },
  { u: 0.13, ext: 0.55, lift: 0.15, pitch: -0.14, foreF: [0.19, -0.035], foreFlex: 0.5, hindF: [-0.13, 0], hindT: 1, ears: 0.3 },
  { u: 0.3, ext: 1.0, lift: 1.0, pitch: 0.0, foreF: [0.3, -0.045], foreFlex: 0.05, hindF: [-0.3, -0.06], hindT: 1, ears: 0.45 },
  { u: 0.47, ext: 0.85, lift: 0.35, pitch: 0.2, foreF: [0.29, 0], foreFlex: 0, hindF: [-0.2, -0.09], hindT: 0.75, ears: 0.4 },
  { u: 0.64, ext: 0.3, lift: 0.08, pitch: 0.1, foreF: [0.2, 0], foreFlex: 0.1, hindF: [0.16, -0.05], hindT: 0.3, ears: 0.3 },
  { u: 0.8, ext: 0.08, lift: 0, pitch: 0.04, foreF: [0.15, -0.01], foreFlex: 0.2, hindF: [0.1, 0], hindT: 0, ears: 0.2 },
  { u: 1.0, ext: 0.05, lift: 0, pitch: 0, foreF: [0.12, 0], foreFlex: 0, hindF: [-0.03, 0], hindT: 0, ears: 0.15 }
];
function hareHop(u, h, len) {
  u = ((u % 1) + 1) % 1; var k = 0; while (k < HAREK.length - 2 && u > HAREK[k + 1].u) k++;
  var A = HAREK[k], B = HAREK[k + 1], f = (u - A.u) / (B.u - A.u); f = f * f * (3 - 2 * f);
  var reach = clamp((len - 0.7) / 1.0);   // a long bound: the hind feet come down well ahead of the forefeet
  function L(p) { return lerp(A[p], B[p], f); }
  function L2(p) { return [lerp(A[p][0], B[p][0], f), lerp(A[p][1], B[p][1], f)]; }
  var hf = L2('hindF'); if (u > 0.5 && u < 0.95) hf[0] += Math.sin((u - 0.5) / 0.45 * Math.PI) * 0.14 * reach;
  return { ext: L('ext'), lift: L('lift') * h, pitch: L('pitch'), foreF: L2('foreF'), foreFlex: L('foreFlex'), hindF: hf, hindT: L('hindT'), ears: L('ears') };
}

/* ================= painted pelts: one silhouette, brushed with fur that follows the form =================
   An animal is built as one continuous outline (torso with the neck, the near legs overlapping into it), filled with a dark
   ground colour, then painted over with short strokes laid in the hair's direction. Each stroke takes its tone from the form
   under it (a soft height field of muscle masses: shoulder, barrel, haunch...), so creases between masses fall dark and the
   tops catch the light; a little mottling moves strokes a tone up or down. Strokes are positioned in each part's own
   parameters (along a leg, across the neck), so they ride with the pose and never swim. Tufts break the outline where the
   coat stands off it (belly, throat, the back of the thighs). Stroke size follows the screen scale, so it reads as brushwork
   at any size. */
function pK() { return RL.k || 40; }
function pLm() { var k = pK(); return { l: Math.max(0.024, 3.4 / k), w: Math.max(0.008, 1.35 / k) }; }   // stroke length and width (m): about 3.4 x 1.35 device px, never finer than a real lock of hair
function pCount(area, cap) { var m = pLm(); return Math.max(16, Math.min(cap || 1600, Math.round(area * 1.3 / (m.l * m.w) * (MODE === 'm' ? 0.35 : 1)))); }
/* eight tones of one local colour: cool deep shadow up to a warm highlight */
function pPal(base, o) {
  o = o || {}; var sh = o.shadow || [46, 40, 58], li = o.light || [255, 230, 186], K = [0.3, 0.42, 0.56, 0.7, 0.84, 0.97, 1.1, 1.24], out = [];
  for (var i = 0; i < 8; i++) { var k = K[i], c = scl(base, k); if (k < 0.85) c = mixc(c, scl(sh, k * 1.5), (0.85 - k) * 0.75); if (k > 1) c = mixc(c, li, (k - 1) * 0.85); out.push([Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2])]); }
  return out;
}
/* the light in an animal's local frame (x forward, y down): from above and from the light's side, a little toward the viewer */
function pL() { var lx = RL.lx * 0.55, L = [lx, -0.74, 0.4], n = Math.hypot(L[0], L[1], L[2]); return [L[0] / n, L[1] / n, L[2] / n]; }
function pTone(nx, ny, nz, occ, rot) {   // 0..1 brightness from a normal (and an occlusion 0..1); rot: the part's rotation in the body frame
  var L = pL(); if (rot) { var c = Math.cos(rot), s = Math.sin(rot); L = [L[0] * c + L[1] * s, -L[0] * s + L[1] * c, L[2]]; }
  var d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), amb = RL.night ? 0.42 : 0.3;
  return clamp((amb + (1 - amb) * d) * (1 - (occ || 0) * 0.5) + (RL.night ? 0 : 0.04));
}
/* the form of a body: a soft union of rounded masses, [cx, cy, rx, ry, depth]; its tone at a point by the slope of the surface */
function pHeight(B, x, y) {   // masses: [cx, cy, rx, ry, depth, rot]
  var s = 0, kk = 0.02;
  for (var i = 0; i < B.length; i++) { var b = B[i], ux = x - b[0], uy = y - b[1], c = b[6], sn = b[7]; if (c === undefined) { c = b[6] = Math.cos(b[5] || 0); sn = b[7] = Math.sin(b[5] || 0); } var dx = (ux * c + uy * sn) / b[2], dy = (-ux * sn + uy * c) / b[3], r2 = dx * dx + dy * dy; if (r2 < 1) s += Math.exp(b[4] * Math.sqrt(1 - r2) / kk); }
  return s > 0 ? kk * Math.log(s) : -0.05;
}
function pFormTone(B, x, y, rot) {   // brightness of the form at x, y: the slope of the masses, darker where it is thin (edges, the creases between masses)
  var e = 0.012, h = pHeight(B, x, y), hx = (pHeight(B, x + e, y) - h) / e, hy = (pHeight(B, x, y + e) - h) / e, n = Math.hypot(hx, hy, 1);
  return pTone(-hx / n, -hy / n, 1 / n, 1 - sstep(-0.01, 0.07, h), rot);
}
/* smooth outline through control points (Catmull-Rom), dense; closed or open */
function pSmooth(pts, closed, sub) {
  var out = [], n = pts.length, i, k, m = closed ? n : n - 1; sub = sub || 6;
  for (i = 0; i < m; i++) {
    var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    for (k = 0; k < sub; k++) { var t = k / sub, t2 = t * t, t3 = t2 * t; out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
function pPath(d, p) { p = p || new Path2D(); p.moveTo(d[0][0], d[0][1]); for (var i = 1; i < d.length; i++) p.lineTo(d[i][0], d[i][1]); p.closePath(); return p; }
function pInside(d, x, y) { var c = false; for (var i = 0, j = d.length - 1; i < d.length; j = i++) { var a = d[i], b = d[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function pArea(d) { var s = 0; for (var i = 0, j = d.length - 1; i < d.length; j = i++) s += d[j][0] * d[i][1] - d[i][0] * d[j][1]; return s / 2; }
/* a limb as a dense outline along a chain of joints, with its own width on either side at each joint (wl on the left of the
   direction of travel, wr on the right); returns the outline and a sampler (u along 0..1, v across -1..1) */
function pLimb(J, wl, wr, sub) {
  var C = pSmooth(J, false, sub || 5), n = C.length, L = [0], i;
  for (i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
  var JL = J.map(function (q) { var best = 0, bd = 1e9; for (var k = 0; k < n; k++) { var dd = Math.hypot(C[k][0] - q[0], C[k][1] - q[1]); if (dd < bd) { bd = dd; best = k; } } return L[best] / L[n - 1]; });
  function wAt(W, u) { for (var k = 0; k < JL.length - 1; k++) if (u <= JL[k + 1]) { var f = (u - JL[k]) / Math.max(1e-6, JL[k + 1] - JL[k]), e = f * f * (3 - 2 * f); return lerp(W[k], W[k + 1], e); } return W[W.length - 1]; }
  var lf = [], rt = [], nrm = [];
  for (i = 0; i < n; i++) {
    var a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, u = L[i] / L[n - 1], nx = -dy / l, ny = dx / l;
    nrm.push([nx, ny]); lf.push([C[i][0] + nx * wAt(wl, u), C[i][1] + ny * wAt(wl, u)]); rt.push([C[i][0] - nx * wAt(wr, u), C[i][1] - ny * wAt(wr, u)]);
  }
  var out = lf.concat(rt.reverse());
  function at(u, v) { u = clamp(u); var s = u * L[n - 1], k = 0; while (k < n - 2 && L[k + 1] < s) k++; var f = (s - L[k]) / Math.max(1e-6, L[k + 1] - L[k]), x = lerp(C[k][0], C[k + 1][0], f), y = lerp(C[k][1], C[k + 1][1], f), nm = nrm[k], w = v > 0 ? wAt(wl, u) : wAt(wr, u); return [x + nm[0] * w * v, y + nm[1] * w * v, Math.atan2(C[k + 1][1] - C[k][1], C[k + 1][0] - C[k][0]), nm]; }
  return { out: out, at: at, len: L[n - 1] };
}
/* stroke batches: one path per tone */
function pBatch(n) { var b = []; for (var i = 0; i < (n || 8); i++) b.push(null); return b; }
function pAdd(b, ti, x0, y0, x1, y1) { ti = ti < 0 ? 0 : ti > b.length - 1 ? b.length - 1 : ti | 0; var p = b[ti] || (b[ti] = new Path2D()); p.moveTo(x0, y0); p.lineTo(x1, y1); }
function pFlush(ctx, b, pal, w, a) { ctx.lineCap = 'round'; ctx.lineWidth = w; for (var i = 0; i < b.length; i++) if (b[i]) { ctx.strokeStyle = zc(pal[i], 1, a === undefined ? 1 : a); ctx.stroke(b[i]); } }
/* a tone index from a 0..1 brightness, with mottling */
function pTi(v, mot) { return Math.round(clamp(v) * 6.4 + 0.3 + (mot || 0)); }
function pMot(x, y, s) { return (NZ.n2(x * 9 + s, y * 9 - s) - 0.5) * 2.2; }
/* tufts standing off an outline: for each sample (every `step` m along d), an outward stroke whose length comes from len(x, y, nx, ny)
   (0 for none); tone from tone(x, y) */
function pTufts(b, d, step, len, tone, seed, inward) {
  var ar = pArea(d) > 0 ? 1 : -1, acc = 0, r = mulberry32(seed);
  for (var i = 0; i < d.length; i++) {
    var a = d[i], c = d[(i + 1) % d.length], sl = Math.hypot(c[0] - a[0], c[1] - a[1]); acc += sl; if (acc < step) continue; acc = 0;
    var tx = (c[0] - a[0]) / (sl || 1), ty = (c[1] - a[1]) / (sl || 1), nx = ty * ar, ny = -tx * ar, L = len(a[0], a[1], nx, ny); if (!(L > 0)) continue;
    var jl = L * (0.55 + r() * 0.8), ox = nx + (r() - 0.5) * 0.5, oy = ny + (r() - 0.5) * 0.5, il = inward === undefined ? 0.7 : inward;
    pAdd(b, tone(a[0], a[1], r()), a[0] - nx * jl * il, a[1] - ny * jl * il, a[0] + ox * jl * 0.6 + tx * jl * 0.2, a[1] + oy * jl * 0.6 + ty * jl * 0.2);
  }
}
var PRAND = {};
function pRand(key, n) { var c = PRAND[key]; if (c && c.length >= n * 4) return c; var r = mulberry32(fnv1a(key)), a = new Float32Array(Math.max(n, 64) * 4); for (var i = 0; i < a.length; i++) a[i] = r(); PRAND[key] = a; return a; }
function pAt(d, u) { var f = clamp(u) * (d.length - 1), i = Math.min(d.length - 2, Math.floor(f)), t = f - i; return [lerp(d[i][0], d[i + 1][0], t), lerp(d[i][1], d[i + 1][1], t)]; }
function pBox(d) { var b = [1e9, 1e9, -1e9, -1e9]; d.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); return b; }
/* paint a limb: underpaint, then strokes down its length (tone from its round section), palettes by height (upper / lower) */
function pPaintLimb(ctx, lb, o) {
  var m = pLm(), area = lb.len * (o.wMean || 0.05) * 2, n = pCount(area, o.cap || 400), R = pRand(o.key, n), bU = pBatch(), bL = pBatch(), k;
  ctx.save(); ctx.clip(pPath(lb.out));
  for (k = 0; k < n; k++) {
    var u = R[k * 4], v = R[k * 4 + 1] * 2 - 1, j = R[k * 4 + 2];
    if (u < (o.u0 || 0) && R[k * 4 + 3] > u / (o.u0 || 1)) continue;
    var q = lb.at(u, v), nm = q[3], s = v, nz = Math.sqrt(Math.max(0, 1 - s * s)), tn = pTone(nm[0] * s, nm[1] * s, nz, 0) * (o.dk || 1);
    var a = q[2] + (j - 0.5) * 0.5 + (o.lean || 0), L = m.l * (0.55 + j * 0.6) * (o.lk || 1), ti = pTi(tn, pMot(q[0], q[1], 3) * 0.7);
    pAdd(u > (o.uSplit === undefined ? 2 : o.uSplit) ? bL : bU, ti, q[0], q[1], q[0] + Math.cos(a) * L, q[1] + Math.sin(a) * L);
  }
  pFlush(ctx, bU, o.pal, m.w * (o.wk || 1)); if (o.palL) pFlush(ctx, bL, o.palL, m.w * (o.wk || 1));
  ctx.restore();
}
/* the device scale of the current transform (px per local metre), for brush sizes */
function pScale(ctx) { try { var m = ctx.getTransform(); return Math.hypot(m.c, m.d) || 40; } catch (e) { return 40; } }
/* points inside a rest-pose outline, made once per key: [x, y, r, r2] */
var PSAMP = {};
function pSamples(key, d, n) {
  var c = PSAMP[key]; if (c && c.n >= n) return c.s;
  var b = pBox(d), r = mulberry32(fnv1a(key)), out = [], tries = 0;
  while (out.length < n && tries++ < n * 8) { var x = lerp(b[0], b[2], r()), y = lerp(b[1], b[3], r()); if (pInside(d, x, y)) out.push([x, y, r(), r()]); }
  PSAMP[key] = { n: n, s: out }; return out;
}
/* an outline moved in (dist < 0) or out along its vertex normals */
function pOffset(d, dist) {
  var ar = pArea(d) > 0 ? 1 : -1, out = [], n = d.length;
  for (var i = 0; i < n; i++) { var a = d[(i - 1 + n) % n], c = d[(i + 1) % n], tx = c[0] - a[0], ty = c[1] - a[1], l = Math.hypot(tx, ty) || 1; out.push([d[i][0] + ty / l * ar * dist, d[i][1] - tx / l * ar * dist]); }
  return out;
}
function pWind(d, ccw) { return (pArea(d) > 0) === !!ccw ? d : d.slice().reverse(); }
/* a set of named palettes, each with its tone batches */
function pSet(pals) { var o = {}; for (var k in pals) o[k] = { pal: pals[k], b: pBatch() }; return o; }
function pSetFlush(ctx, set, w, order) { (order || Object.keys(set)).forEach(function (k) { if (set[k]) pFlush(ctx, set[k].b, set[k].pal, w); }); }
function pCurve(set, name, ti, x, y, a, L, bend) {   // a short curved stroke (a lock of soft hair): bend is the sideways bow, as a fraction of L
  var s = set[name]; if (!s) return; ti = ti < 0 ? 0 : ti > s.b.length - 1 ? s.b.length - 1 : ti | 0; var p = s.b[ti] || (s.b[ti] = new Path2D()), c = Math.cos(a), sn = Math.sin(a);
  p.moveTo(x, y); p.quadraticCurveTo(x + c * L * 0.5 - sn * L * bend, y + sn * L * 0.5 + c * L * bend, x + c * L, y + sn * L);
}
function pStroke(set, name, ti, x, y, a, L) { var s = set[name]; if (!s) return; pAdd(s.b, ti, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L); }
/* ---- a skinned rig: an outline and its brush strokes bound to bones, so the whole silhouette bends as one ----
   Bones are pairs of joints; each control point of the outline is designed in the rest pose with weights on one or two
   bones (two near a joint, so the outline rounds over it instead of creasing). The strokes are scattered once inside the
   rest outline and take their weights from the nearest control points; posing moves each with its bones (linear blend
   skinning), and turns its hair direction by the bones' turn. */
function rigBones(J, list) { return list.map(function (q) { var a = J[q[0]], b = J[q[1]]; return { a: a, b: b, th: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }); }
function rigLocal(B0, ws, x, y) { return ws.map(function (q) { var b = B0[q[0]], c = Math.cos(-b.th), s = Math.sin(-b.th), dx = x - b.a[0], dy = y - b.a[1]; return [q[0], q[1], dx * c - dy * s, dx * s + dy * c]; }); }
function rigPt(B, L) { var x = 0, y = 0, t = 0; for (var i = 0; i < L.length; i++) { var q = L[i], b = B[q[0]], c = Math.cos(b.th), s = Math.sin(b.th); x += q[1] * (b.a[0] + q[2] * c - q[3] * s); y += q[1] * (b.a[1] + q[2] * s + q[3] * c); } return [x, y]; }
function rigTurn(B, B0, L) { var t = 0; for (var i = 0; i < L.length; i++) { var d = B[L[i][0]].th - B0[L[i][0]].th; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; t += L[i][1] * d; } return t; }
/* ctrl: [[x, y, [[bone, w], ...]], ...]; returns the shape's rest data with nS strokes' worth of samples */
function rigShape(key, B0, ctrl, nS, hairFn, clsFn) {
  var C = ctrl.map(function (c) { return { p: [c[0], c[1]], L: rigLocal(B0, c[2], c[0], c[1]) }; });
  var rest = pSmooth(ctrl.map(function (c) { return [c[0], c[1]]; }), true, 6);
  var S = pSamples(key, rest, nS).map(function (q) {
    var acc = {}, tot = 0;
    for (var i = 0; i < ctrl.length; i++) { var d = Math.hypot(q[0] - ctrl[i][0], q[1] - ctrl[i][1]), k = 1 / Math.pow(d * d + 0.0004, 2); tot += k; ctrl[i][2].forEach(function (w) { acc[w[0]] = (acc[w[0]] || 0) + k * w[1]; }); }
    var ws = []; for (var b in acc) if (acc[b] / tot > 0.04) ws.push([+b, acc[b] / tot]); var sw = 0; ws.forEach(function (w) { sw += w[1]; }); ws.forEach(function (w) { w[1] /= sw; });
    return { x: q[0], y: q[1], r1: q[2], r2: q[3], L: rigLocal(B0, ws, q[0], q[1]), ha: hairFn(q[0], q[1]), cls: clsFn(q[0], q[1]) };
  });
  return { C: C, S: S, rest: rest };
}
function rigOutline(B, sh) { return pSmooth(sh.C.map(function (c) { return rigPt(B, c.L); }), true, 6); }
/* edge hair: strokes across an outline every `step`, leaning out along the hair, so the silhouette is broken into hair; up-facing
   edges catch the sky (rim). others: outlines this edge lies inside of (no edge drawn there) */
function pEdge(set, d, o) {
  var ar = pArea(d) > 0 ? 1 : -1, acc = 0, m = pLm(), step = o.step || m.w * 1.6, L = (o.lk || 1) * m.l, r = mulberry32(o.seed || 7), rim = set.rim;
  for (var i = 0; i < d.length; i++) {
    var a = d[i], c = d[(i + 1) % d.length], sl = Math.hypot(c[0] - a[0], c[1] - a[1]); acc += sl; if (acc < step) continue; acc = 0;
    var tx = (c[0] - a[0]) / (sl || 1), ty = (c[1] - a[1]) / (sl || 1), nx = ty * ar, ny = -tx * ar, x = a[0], y = a[1];
    if (o.others) { var hid = false; for (var k = 0; k < o.others.length && !hid; k++) hid = pInside(o.others[k], x - nx * L * 0.2, y - ny * L * 0.2); if (hid) continue; }
    var ha = o.hair(x, y), hx = Math.cos(ha), hy = Math.sin(ha), dx = hx * 0.6 + nx * 0.55 + (r() - 0.5) * 0.5, dy = hy * 0.6 + ny * 0.55 + (r() - 0.5) * 0.5, dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    var ll = L * (0.55 + r() * 0.6) * (o.len ? o.len(x, y, nx, ny) : 1); if (!(ll > 0)) continue;
    var up = -ny, tn = o.tone(x, y) * 0.78 + Math.max(0, up) * 0.18, cls = o.cls ? o.cls(x, y) : 'coat', S = set[cls] || set.coat;
    pAdd(S.b, pTi(tn, (r() - 0.5) * 1.6), x - dx * ll * 0.4, y - dy * ll * 0.4, x + dx * ll * 0.6, y + dy * ll * 0.6);
    if (rim && up > 0.25 && r() < 0.8) { var rl = ll * 0.8; pAdd(rim.b, 0, x - tx * rl * 0.5 - nx * m.w * 0.6, y - ty * rl * 0.5 - ny * m.w * 0.6, x + tx * rl * 0.5 - nx * m.w * 0.3, y + ty * rl * 0.5 - ny * m.w * 0.3); }
  }
}
/* fill with the dark ground colour (so the gaps between hairs read as depth), shrunk a little so the edge is all hair */
function pUnder(ctx, outs, col, shrink) { var p = new Path2D(); outs.forEach(function (d) { pPath(shrink ? pOffset(d, -shrink) : d, p); }); ctx.fillStyle = zc(col); ctx.fill(p); return p; }
function pClipOut(ctx, outs, grow) { var p = new Path2D(); outs.forEach(function (d) { pPath(pOffset(d, grow), p); }); ctx.clip(p); }

/* ---- the sika stag (ニホンジカ), drawn as one painted animal ----
   About 90 cm at the shoulder. A deep chest, a slim waist with the belly tucked up into the flank, a strong rounded rump,
   long slender legs on small pointed hooves. The near legs are part of the body's one outline (from the haunch down the
   gaskin to the backward-pointing hock; from the shoulder point and elbow down to the knee), so there is no seam where a
   leg meets the body; the far legs are behind. The skeleton: pelvis and thorax along the spine, two neck bones and the head,
   and four bones in each leg (femur, tibia, cannon, pastern; humerus, forearm, cannon, pastern), posed by the gait and by
   two-bone reach. Coat: summer chestnut with soft irregular rows of white spots either side of the dark dorsal stripe; the
   winter coat (coming in through autumn) grey-brown, the spots fading out; the rutting stag's neck thickened and maned.
   The white rump patch, edged black, flares when he is alarmed; the short white tail has a black line. Antlers from a single
   beam with three tines (brow, middle and the rear fork tine), tapering and curved; in velvet through summer, cast in spring. */
var SIKA = null;
/* the sika's own gaits: a deliberate, upright walk (lateral sequence, a long stance, the head carried high and nodding a little);
   when alarmed, a springy bound close to a stott: all four feet leave the ground nearly together, the body carried up between */
var SIKA_G = {
  walk: { beta: 0.68, off: [0, 0.5, 0.2, 0.7], lift: 0.24, bob: 0.01, bobN: 2, roll: 0.012 },
  bound: { beta: 0.2, off: [0, 0.03, 0.08, 0.11], lift: 0.08, bob: 0.0, bobN: 1, roll: 0, pitchA: 0.05, pitchP: 0.6, rise: 0.36, riseP: 0.75, riseW: 0.7, fold: 0.3 }   // the legs held nearly straight under it in the air
};
var SIKA_LEG = 0.8, SIKA_Y0 = -0.6;   // the legs below the brisket are drawn at this fraction of the design (shorter, so the chest is as deep as the legs are long)
function sikaMp(p) { var y = p[1], d = -SIKA_Y0 * (1 - SIKA_LEG); return [p[0], y <= SIKA_Y0 ? y + d : SIKA_Y0 + d + (y - SIKA_Y0) * SIKA_LEG]; }
function sikaInv(p) { var y = p[1], d = -SIKA_Y0 * (1 - SIKA_LEG); return [p[0], y <= SIKA_Y0 + d ? y - d : SIKA_Y0 + (y - SIKA_Y0 - d) / SIKA_LEG]; }
function sikaRig() {
  if (SIKA) return SIKA;
  var J = { P0: [-0.4, -0.88], M: [-0.04, -0.9], Wt: [0.32, -0.92], N0: [0.36, -0.9], Nm: [0.45, -1.04], N1: [0.54, -1.17], Ns: [0.8, -1.1],
    Hj: [-0.38, -0.8], St: [-0.27, -0.6], Hk: [-0.49, -0.37], HFt: [-0.465, -0.075], HHf: [-0.41, 0],
    Sp: [0.38, -0.76], El: [0.27, -0.58], Kn: [0.31, -0.29], FFt: [0.312, -0.075], FHf: [0.365, 0] };
  for (var jk in J) J[jk] = sikaMp(J[jk]);
  var BN = [['P0', 'M'], ['M', 'Wt'], ['N0', 'Nm'], ['Nm', 'N1'], ['N1', 'Ns'], ['Hj', 'St'], ['St', 'Hk'], ['Hk', 'HFt'], ['HFt', 'HHf'], ['Sp', 'El'], ['El', 'Kn'], ['Kn', 'FFt'], ['FFt', 'FHf']];
  var SIG = [0.3, 0.3, 0.12, 0.1, 0.1, 0.16, 0.12, 0.05, 0.035, 0.12, 0.09, 0.05, 0.035];
  function bone(a, b) { return { a: a, b: b, th: Math.atan2(b[1] - a[1], b[0] - a[0]), len: Math.hypot(b[0] - a[0], b[1] - a[1]) }; }
  var B0 = BN.map(function (q) { return bone(J[q[0]], J[q[1]]); });
  function dSeg(b, x, y) { var dx = b.b[0] - b.a[0], dy = b.b[1] - b.a[1], t = clamp(((x - b.a[0]) * dx + (y - b.a[1]) * dy) / (dx * dx + dy * dy)); return Math.hypot(x - b.a[0] - dx * t, y - b.a[1] - dy * t); }
  function wts(cand, x, y) {
    var ws = cand.map(function (i) { var d = dSeg(B0[i], x, y) / SIG[i]; return [i, Math.exp(-d * d)]; }).sort(function (p, q) { return q[1] - p[1]; }).slice(0, 3), s = 0;
    ws.forEach(function (w) { s += w[1]; }); if (s < 1e-9) return [[ws[0][0], 1]]; ws.forEach(function (w) { w[1] /= s; }); return ws.filter(function (w) { return w[1] > 0.02; });
  }
  var T = [0, 1], NK = [1, 2, 3], CH = [1, 9], FU = [1, 9, 10], FL = [10, 11, 12], FP = [11, 12], BE = [0, 1], FK = [0, 5], HF = [5, 6], HL = [6, 7, 8], HP = [7, 8], RB = [0, 5, 6];
  // the outline, clockwise from the tail root: the rounded rump, the hamstring down to the point of the hock (behind), the slim
  // cannon to the pastern and the small hoof; up the front of the hind leg to the stifle, the flank fold, the belly tucked up
  // toward the loins and deepening to the brisket behind the elbow; the foreleg; the chest; the throat; the poll; the crest
  // of the neck rising from the withers; the level back
  var C = [
    [-0.54, -0.94, T], [-0.598, -0.902, T], [-0.632, -0.835, [0, 5]], [-0.64, -0.755, [0, 5]], [-0.622, -0.665, RB], [-0.585, -0.575, [5, 6]], [-0.55, -0.49, [5, 6]], [-0.48, -0.47, [5, 6]], [-0.41, -0.5, HF], [-0.345, -0.55, HF], [-0.28, -0.6, FK], [-0.24, -0.655, FK],
    [-0.14, -0.605, BE], [0.0, -0.55, BE], [0.12, -0.512, [1, 9]], [0.2, -0.5, FU], [0.24, -0.47, [9, 10]], [0.27, -0.44, [9, 10]], [0.33, -0.44, [9, 10]], [0.37, -0.47, [9, 10]], [0.385, -0.51, FU], [0.415, -0.6, CH], [0.465, -0.68, CH], [0.47, -0.77, CH],
    [0.42, -0.86, T], [0.37, -0.94, T],
    [0.33, -0.985, T], [0.25, -0.98, T], [0.12, -0.952, T], [-0.06, -0.945, T], [-0.24, -0.958, T], [-0.38, -0.985, T], [-0.48, -0.975, T]
  ];
  // the cannons and pasterns a little fuller than the design (slim, not needle-thin): push the outline out from each leg's centre line
  C = C.map(function (c) { var y = c[1]; if (y > -0.36) { var cx = c[0] < 0 ? lerp(-0.47, -0.43, clamp(-y / 0.36)) : lerp(0.31, 0.33, clamp(-y / 0.36)); if (c[0] > 0.2 || c[0] < -0.3) c = [cx + (c[0] - cx) * 1.25, y, c[2]]; } var q = sikaMp([c[0], c[1]]); return [q[0], q[1], c[2]]; });
  var ctrl = C.map(function (c) { var ws = wts(c[2], c[0], c[1]); return { x: c[0], y: c[1], ws: ws, L: rigLocal(B0, ws, c[0], c[1]) }; });
  var rest = pSmooth(C.map(function (c) { return [c[0], c[1]]; }), true, 5);
  // the form, as rounded masses [cx, cy, rx, ry, height, rotation]: neck, shoulder blade, point of shoulder, chest, ribs, loin, haunch, thigh, gaskin, legs
  var MS = [[0.5, -1.05, 0.26, 0.1, 0.09, -1.1], [0.3, -0.8, 0.09, 0.18, 0.09, -0.45], [0.42, -0.7, 0.07, 0.07, 0.06, 0], [0.37, -0.63, 0.1, 0.08, 0.06, 0],
    [0.12, -0.75, 0.22, 0.19, 0.12, 0.1], [-0.14, -0.82, 0.16, 0.12, 0.08, 0], [-0.46, -0.81, 0.17, 0.15, 0.11, 0.3], [-0.44, -0.62, 0.12, 0.12, 0.08, 0.2], [-0.47, -0.47, 0.05, 0.11, 0.05, -0.5],
    [0.3, -0.45, 0.04, 0.13, 0.04, 0.05], [0.31, -0.18, 0.018, 0.11, 0.02, 0], [-0.475, -0.2, 0.02, 0.13, 0.02, 0], [-0.495, -0.36, 0.03, 0.04, 0.025, 0]];
  function pw(T, x) { if (x <= T[0][0]) return T[0][1]; for (var k = 1; k < T.length; k++) if (x <= T[k][0]) { var f = (x - T[k - 1][0]) / (T[k][0] - T[k - 1][0]); f = f * f * (3 - 2 * f); return lerp(T[k - 1][1], T[k][1], f); } return T[T.length - 1][1]; }
  var BK = [[-0.56, -0.925], [-0.48, -0.975], [-0.38, -0.985], [-0.24, -0.958], [-0.06, -0.945], [0.12, -0.952], [0.25, -0.985], [0.33, -1.0]], BL = [[-0.24, -0.655], [-0.14, -0.605], [0.0, -0.55], [0.12, -0.512], [0.2, -0.5]];
  function backY(x) { return pw(BK, x); }
  function bellyY(x) { return pw(BL, x); }
  function hair(x, y) {   // the lie of the coat at rest: back along the body, down the flanks, down the legs, from the poll toward the withers on the neck
    if (y > -0.5 && (x < -0.3 || x > 0.2)) return Math.PI / 2 + (x < 0 ? 0.08 : -0.05);
    if (x > 0.36 && y < -0.78) return 2.2 + (y < -1.2 ? 0.15 : 0);
    if (x > 0.3 && y > -0.78) return Math.PI / 2 - 0.35;
    var s = clamp((y - backY(x)) / Math.max(0.1, bellyY(x) - backY(x))); return Math.PI - 0.12 - 1.0 * s * s - (x < -0.38 ? 0.35 * s : 0);
  }
  function normal(x, y) { var e = 0.012, h = pHeight(MS, x, y), hx = (pHeight(MS, x + e, y) - h) / e, hy = (pHeight(MS, x, y + e) - h) / e, n = Math.hypot(hx, hy, 1); return [-hx / n, -hy / n, 1 / n, 1 - sstep(-0.01, 0.06, h)]; }
  function inherit(x, y) {   // a point inside the body moves with the outline around it
    var acc = {}, tot = 0, i;
    for (i = 0; i < ctrl.length; i++) { var c = ctrl[i], d2 = (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y), k = 1 / Math.pow(d2 + 0.0012, 2); tot += k; c.ws.forEach(function (w) { acc[w[0]] = (acc[w[0]] || 0) + k * w[1]; }); }
    var ws = []; for (var b in acc) if (acc[b] / tot > 0.03) ws.push([+b, acc[b] / tot]); var s = 0; ws.forEach(function (w) { s += w[1]; }); ws.forEach(function (w) { w[1] /= s; });
    return rigLocal(B0, ws, x, y);
  }
  var SP = [], r = mulberry32(5151), i;   // the spots: two soft rows along the back below the stripe, a broken third, a scatter on the haunch and shoulder
  // a clear row just below the dark dorsal stripe, then irregular ones, scattered, smaller and fainter down the flank; soft cream
  // spots of varied size and shape (round to oval, a few run together), as on the living deer, not a stamped pattern
  for (i = 0; i < 16; i++) { var x1 = -0.47 + i * 0.047 + (r() - 0.5) * 0.015; if (x1 > 0.24) break; SP.push([x1, backY(x1) + 0.05 + (r() - 0.5) * 0.012, 0.85 + r() * 0.45, 1]); }
  for (i = 0; i < 14; i++) { if (r() < 0.12) continue; var x2 = -0.45 + i * 0.05 + (r() - 0.5) * 0.035; if (x2 > 0.2) break; SP.push([x2, backY(x2) + 0.1 + (r() - 0.5) * 0.035, 0.7 + r() * 0.6, 0.85]); }
  for (i = 0; i < 14; i++) { if (r() < 0.35) continue; var x3 = -0.4 + i * 0.045 + (r() - 0.5) * 0.04; if (x3 > 0.14) break; SP.push([x3, backY(x3) + 0.16 + (r() - 0.5) * 0.05, 0.55 + r() * 0.55, 0.65]); }
  for (i = 0; i < 12; i++) { if (r() < 0.5) continue; var x4 = -0.36 + i * 0.045 + (r() - 0.5) * 0.05; if (x4 > 0.08) break; SP.push([x4, backY(x4) + 0.22 + (r() - 0.5) * 0.05, 0.45 + r() * 0.4, 0.42]); }
  for (i = 0; i < 14; i++) { var a = r() * TAU, rr = Math.sqrt(r()); SP.push([-0.42 + Math.cos(a) * rr * 0.12, -0.8 + Math.sin(a) * rr * 0.1, 0.5 + r() * 0.5, 0.6]); }
  SP = SP.map(function (p) { var q = sikaMp(p); return [p[0], p[1], p[2], q[0], q[1], p[3]]; }).filter(function (p) { return pInside(rest, p[3], p[4]); }).map(function (p) { return { x: p[0], y: p[1], s: p[2], al: p[5], asp: 0.55 + r() * 0.4, rot: (r() - 0.5) * 0.7, L: inherit(p[3], p[4]), nr: normal(p[0], p[1]), ha: hair(p[0], p[1]) }; });
  SIKA = { J: J, BN: BN, B0: B0, ctrl: ctrl, rest: rest, area: Math.abs(pArea(rest)), backY: backY, bellyY: bellyY, hair: hair, normal: normal, inherit: inherit, SP: SP, S: [], head: null };
  return SIKA;
}
function sikaSamples(R, n) {   // strokes' places, made once and grown as needed
  if (R.S.length >= n) return R.S;
  var pts = pSamples('sika', R.rest, n);
  for (var i = R.S.length; i < pts.length; i++) { var q = pts[i], d = sikaInv(q); R.S.push({ x: d[0], y: d[1], r1: q[2], r2: q[3], L: R.inherit(q[0], q[1]), nr: R.normal(d[0], d[1]), ha: R.hair(d[0], d[1]) }); }
  return R.S;
}
/* a point bound to bones, posed; the neck's cross-section swells by ns (rut: the throat and mane thicken) */
function sikaPt(B, L, ns, B0) {   // skinned by blended angle: every bone's anchor, but one shared turn, so a joint bends without collapsing
  var x = 0, y = 0, d = 0, i;
  B0 = B0 || (SIKA && SIKA.B0);
  if (L.length > 1 && B0) for (i = 0; i < L.length; i++) { var dd = B[L[i][0]].th - B0[L[i][0]].th; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU; d += L[i][1] * dd; }
  for (i = 0; i < L.length; i++) {
    var q = L[i], b = B[q[0]], th = L.length > 1 && B0 ? B0[q[0]].th + d : b.th, c = Math.cos(th), s = Math.sin(th), ly = q[3];
    if (ns && (q[0] === 2 || q[0] === 3)) ly *= ly > 0 ? ns[0] : ns[1];
    x += q[1] * (b.a[0] + q[2] * c - ly * s); y += q[1] * (b.a[1] + q[2] * s + ly * c);
  }
  return [x, y];
}
/* the pose: the skeleton's bones from the gait and the head's carriage */
function sikaPose(R, o) {
  var J = R.J, B0 = R.B0, G = SIKA_G[o.gait] || ZG[o.gait] || ZG.walk, ph = o.ph || 0, amp = clamp(o.amp || 0), stride = o.stride || 0.8, rz = gRise(G, ph, amp), lift = (o.lift || 0) + rz;
  var bob = -Math.abs(Math.cos(ph * Math.PI * G.bobN)) * G.bob * amp * 0.8, pitchB = (o.bodyPitch || 0) + gPitch(G, o.gait, ph, amp);
  var M = J.M; function TB(p) { var c = Math.cos(pitchB), s = Math.sin(pitchB), dx = p[0] - M[0], dy = p[1] - M[1]; return [M[0] + dx * c - dy * s, M[1] + dx * s + dy * c + bob - lift]; }
  function loc(b, p) { var c = Math.cos(-b.th), s = Math.sin(-b.th), dx = p[0] - b.a[0], dy = p[1] - b.a[1]; return [dx * c - dy * s, dx * s + dy * c]; }
  function glob(b, l) { var c = Math.cos(b.th), s = Math.sin(b.th); return [b.a[0] + l[0] * c - l[1] * s, b.a[1] + l[0] * s + l[1] * c]; }
  var roll = Math.sin(ph * TAU * (G.rollN || 2)) * (G.roll === undefined ? 0.018 : G.roll) * amp;   // the pelvis rocks a little with each hind step, the shoulders with each fore step
  var pel = { a: TB(J.P0), th: B0[0].th + pitchB + roll }, tho = { a: TB(J.M), th: B0[1].th + pitchB - roll * 0.6 };
  var B = []; B[0] = pel; B[1] = tho;
  // neck and head
  var hd = o.head || {}, aN = hd.neck === undefined ? -1.0 : hd.neck, bend = hd.bend || 0, aH = hd.ang === undefined ? 0.55 : hd.ang;
  var N0 = glob(tho, loc(B0[1], J.N0)), nl = B0[2].len, Nm = [N0[0] + Math.cos(aN - bend) * nl, N0[1] + Math.sin(aN - bend) * nl], N1 = [Nm[0] + Math.cos(aN + bend) * B0[3].len, Nm[1] + Math.sin(aN + bend) * B0[3].len];
  B[2] = { a: N0, th: aN - bend }; B[3] = { a: Nm, th: aN + bend }; B[4] = { a: N1, th: aH };
  // the legs
  var out = { far: [] };
  function foot(i) {
    var u = (((ph + G.off[i]) % 1) + 1) % 1, sw = stride * G.beta * amp, lf = G.lift * stride * 0.5 * Math.min(1, amp * 1.6);
    if (u < G.beta) return { dx: sw * (0.5 - u / G.beta), up: rz, f: 0, st: u / G.beta };
    var v = (u - G.beta) / (1 - G.beta), e = v * v * (3 - 2 * v); return { dx: sw * (-0.5 + e), up: Math.sin(v * Math.PI) * lf + rz, f: gFold(G, v) * Math.min(1, amp * 1.6), st: -1 };
  }
  function hind(i, far) {
    var ft = foot(i), dxf = far ? 0.03 : 0, hip = glob(pel, loc(B0[0], J.Hj)); hip = [hip[0] + dxf, hip[1]];
    if (o.tuck) ft = { dx: -0.25, up: 0.35, f: 1 };
    var T = [J.HHf[0] + ft.dx + dxf + (o.splayH || 0), -ft.up], aP = Math.atan2(J.HHf[1] - J.HFt[1], J.HHf[0] - J.HFt[0]) + ft.f * 0.8;
    var Fl = [T[0] - Math.cos(aP) * B0[8].len, T[1] - Math.sin(aP) * B0[8].len], aC0 = B0[7].th, aC = aC0 - ft.f * 0.25 - (ft.st >= 0 ? (ft.dx / Math.max(0.2, stride)) * 0.5 : 0);
    var lc = B0[7].len, reach = (B0[5].len + B0[6].len) * 0.985, Hk;
    function hk(a) { return [Fl[0] - Math.cos(a) * lc, Fl[1] - Math.sin(a) * lc]; }
    Hk = hk(aC);
    if (Math.hypot(Hk[0] - hip[0], Hk[1] - hip[1]) > reach) {   // out of reach: tilt the cannon toward the hip until the hock comes within it
      var aT = Math.atan2(Fl[1] - hip[1], Fl[0] - hip[0]), lo = aC, hi = aT;
      for (var it = 0; it < 14; it++) { var md = (lo + hi) / 2; if (Math.hypot(hk(md)[0] - hip[0], hk(md)[1] - hip[1]) > reach) lo = md; else hi = md; }
      aC = hi; Hk = hk(aC);
    }
    var k = zik2(hip, Hk, B0[5].len, B0[6].len, -1), St = k[0];
    return [{ a: hip, th: Math.atan2(St[1] - hip[1], St[0] - hip[0]) }, { a: St, th: Math.atan2(Hk[1] - St[1], Hk[0] - St[0]) }, { a: Hk, th: Math.atan2(Fl[1] - Hk[1], Fl[0] - Hk[0]) }, { a: Fl, th: aP }];
  }
  function fore(i, far) {
    var ft = foot(i), dxf = far ? 0.035 : 0, sp = glob(tho, loc(B0[1], J.Sp)); sp = [sp[0] + dxf, sp[1]];
    if (o.tuck) ft = { dx: 0.15, up: 0.3, f: 1 };
    // in the swing the knee (carpus) comes forward and up, the cannon hangs down and back from it, the pastern and hoof hang from that, tip down
    var T = [J.FHf[0] + ft.dx + dxf + (o.splayF || 0), -ft.up], aC = B0[11].th + ft.f * 0.95 - (ft.st >= 0 ? (ft.dx / Math.max(0.2, stride)) * 0.35 : 0), aP0 = Math.atan2(J.FHf[1] - J.FFt[1], J.FHf[0] - J.FFt[0]), aP = lerp(aP0, aC, ft.f);
    var Fl = [T[0] - Math.cos(aP) * B0[12].len, T[1] - Math.sin(aP) * B0[12].len];
    var Kn = [Fl[0] - Math.cos(aC) * B0[11].len, Fl[1] - Math.sin(aC) * B0[11].len], reach = (B0[9].len + B0[10].len) * 0.985, d = Math.hypot(Kn[0] - sp[0], Kn[1] - sp[1]);
    if (d > reach) { var ux = (Kn[0] - sp[0]) / d, uy = (Kn[1] - sp[1]) / d, sh = d - reach; Kn = [Kn[0] - ux * sh, Kn[1] - uy * sh]; Fl = [Fl[0] - ux * sh, Fl[1] - uy * sh]; }   // the foot comes up a little instead
    var k = zik2(sp, Kn, B0[9].len, B0[10].len, 1), El = k[0];
    return [{ a: sp, th: Math.atan2(El[1] - sp[1], El[0] - sp[0]) }, { a: El, th: Math.atan2(Kn[1] - El[1], Kn[0] - El[0]) }, { a: Kn, th: Math.atan2(Fl[1] - Kn[1], Fl[0] - Kn[0]) }, { a: Fl, th: aP }];
  }
  var h0 = hind(0), f0 = fore(2);
  B[5] = h0[0]; B[6] = h0[1]; B[7] = h0[2]; B[8] = h0[3]; B[9] = f0[0]; B[10] = f0[1]; B[11] = f0[2]; B[12] = f0[3];
  out.B = B; out.farH = hind(1, true); out.farF = fore(3, true); out.ns = [1 + (o.rut || 0) * 0.4, 1 + (o.rut || 0) * 0.12];
  return out;
}
var SIKA_C = { sum: [170, 92, 46], win: [96, 82, 70], dorS: [74, 42, 26], dorW: [52, 44, 40], belly: [206, 188, 160], white: [240, 236, 226], blk: [30, 24, 22], legS: [140, 92, 60], legW: [100, 86, 74],
  mane: [58, 48, 42], face: [150, 104, 70], faceW: [118, 100, 86], muzzle: [214, 204, 186], nose: [26, 22, 22], hoof: [36, 30, 28], ant: [118, 98, 70], antTip: [228, 220, 196], velvet: [124, 98, 82], inner: [222, 206, 190] };
function sikaHead(ctx, o, wk, rut) {   // in the head frame: origin at the poll, x along the face to the nose, y down
  var C = SIKA_C, face = o.coat || mixc(C.sum, C.win, wk), yaw = clamp(o.yaw || 0), ml = 0.27 * (1 - 0.3 * yaw), jaw = clamp(o.mouth || 0) * 0.03, t = o.t || 0;   // (the head in the body's own coat colour, every season)
  var P0 = [[-0.075, 0.0], [-0.055, -0.06], [0.01, -0.084], [0.08, -0.076], [0.145, -0.05], [ml - 0.04, -0.03], [ml - 0.004, -0.02], [ml + 0.012, 0.0], [ml + 0.01, 0.022], [ml - 0.012, 0.036 + jaw], [ml - 0.07, 0.044 + jaw], [0.15, 0.058], [0.09, 0.08], [0.03, 0.094], [-0.03, 0.082], [-0.07, 0.045]];
  var d = pSmooth(P0, true, 5), m = pLm(), lod = MODE === 'm' || RL.k < 110;   // lod: small on screen (or in the reflection): the paint without the fine work
  function hn(x, y) { var cx = x < 0.1 ? 0.03 : lerp(0.03, ml, (x - 0.1) / (ml - 0.1)), ry = x < 0.1 ? 0.07 : lerp(0.07, 0.03, (x - 0.1) / (ml - 0.1)), ny = clamp((y - (x < 0.12 ? 0.01 : 0.005)) / ry, -1, 1); return [0.15 * (x > ml - 0.05 ? 1 : 0), ny, Math.sqrt(Math.max(0, 1 - ny * ny)) * 0.9 + 0.1]; }
  function ear(far) {   // a big oval ear: the coat-coloured back, the pale hairy inside when it turns to us, a dark rim at the tip
    var ea = (o.ears === undefined ? 0 : o.ears), a = -2.55 - ea * 0.5 + (far ? 0.3 : 0) + Math.sin(t * 1.3 + (far ? 1.5 : 0)) * 0.05 - (o.hd || 0) * 0.6, L = 0.15, b = [-0.02 + (far ? 0.03 : 0), -0.045];
    var dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, wd = 0.066 * (far ? 0.75 + yaw * 0.2 : 1 - yaw * 0.3), E = [], I = [], i;
    for (i = 0; i <= 16; i++) { var u = i / 16, w = Math.pow(Math.sin(Math.pow(u, 0.85) * Math.PI), 0.6) * wd * (u < 0.25 ? 0.55 + u * 1.8 : 1); E.push([b[0] + dx * L * u + nx * w, b[1] + dy * L * u + ny * w]); }
    for (i = 15; i >= 1; i--) { var u2 = i / 16, w2 = Math.pow(Math.sin(Math.pow(u2, 0.85) * Math.PI), 0.6) * wd * 0.85 * (u2 < 0.25 ? 0.55 + u2 * 1.8 : 1); E.push([b[0] + dx * L * u2 - nx * w2, b[1] + dy * L * u2 - ny * w2]); }
    var ep = pPath(E), g = ctx.createLinearGradient(b[0], b[1], b[0] + dx * L, b[1] + dy * L);
    g.addColorStop(0, zc(face, far ? 0.55 : 0.8)); g.addColorStop(0.7, zc(face, far ? 0.62 : 0.95)); g.addColorStop(1, zc(mixc(face, C.blk, 0.5), far ? 0.6 : 0.85)); ctx.fillStyle = g; ctx.fill(ep);
    if (!far && yaw < 0.7) {   // the inside of the cup, pale with white hair, and its rim
      for (i = 0; i <= 12; i++) { var u3 = 0.18 + i / 12 * 0.7, w3 = Math.sin(((u3 - 0.18) / 0.7) * Math.PI) * wd * 0.62 * (1 - yaw * 0.6); I.push([b[0] + dx * L * u3 - nx * wd * 0.12 + nx * w3, b[1] + dy * L * u3 - ny * wd * 0.12 + ny * w3]); }
      for (i = 11; i >= 1; i--) { var u4 = 0.18 + i / 12 * 0.7, w4 = Math.sin(((u4 - 0.18) / 0.7) * Math.PI) * wd * 0.45 * (1 - yaw * 0.6); I.push([b[0] + dx * L * u4 - nx * wd * 0.12 - nx * w4, b[1] + dy * L * u4 - ny * wd * 0.12 - ny * w4]); }
      var ip = pPath(I), gi = ctx.createLinearGradient(b[0] + nx * wd, b[1] + ny * wd, b[0] - nx * wd, b[1] - ny * wd); gi.addColorStop(0, zc(C.inner, 0.95)); gi.addColorStop(1, zc(mixc(C.inner, face, 0.55), 0.7));
      ctx.fillStyle = gi; ctx.fill(ip);
      if (!lod) { ctx.save(); ctx.clip(ip); ctx.strokeStyle = zc([250, 246, 238], 1, 0.3); ctx.lineWidth = m.w * 0.5; ctx.lineCap = 'round'; ctx.beginPath(); var r = mulberry32(3); for (i = 0; i < 9; i++) { var uu = 0.25 + r() * 0.55, q = [b[0] + dx * L * uu + nx * wd * (r() - 0.6) * 0.5, b[1] + dy * L * uu + ny * wd * (r() - 0.6) * 0.5]; ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - dx * 0.025 + nx * 0.01, q[1] - dy * 0.025 + ny * 0.01); } ctx.stroke(); ctx.restore(); }
    }
    ctx.save(); ctx.clip(ep); var tp = [b[0] + dx * L, b[1] + dy * L]; zsoft(ctx, tp[0], tp[1], 0.04, 0.04, C.blk, 0.7); ctx.restore();   // the dark tip
    ctx.strokeStyle = zc(mixc(face, C.blk, 0.6), 1, 0.5); ctx.lineWidth = m.w * 0.5; ctx.stroke(ep);
  }
  function antler(far) {
    if (!o.antler) return;
    var vel = !!o.velvet, sc = vel ? 0.85 : 1, dk = far ? 0.68 : 1, base = [0.04 + (far ? 0.025 + yaw * 0.04 : -yaw * 0.02), -0.06];
    // in the head frame, the world's up is -(head angle) away from -y; the beam rises up and back from the pedicel, bends forward
    // above the middle tine, and forks at the top; the brow tine springs forward low from just above the burr
    var hA = o.hd || 0, UP = -Math.PI / 2 - hA - (far ? 0.22 : 0), BK = UP - 0.62, FW = -hA;   // FW: the world's forward, in the head frame
    function dir(a) { return [Math.cos(a), Math.sin(a)]; }
    var segs = [[BK + 0.0, 0.07], [BK + 0.08, 0.085], [BK + 0.25, 0.09], [BK + 0.5, 0.085], [BK + 0.75, 0.075]], bm = [base], i;
    for (i = 0; i < segs.length; i++) { var dd = dir(segs[i][0]); bm.push([bm[i][0] + dd[0] * segs[i][1] * sc, bm[i][1] + dd[1] * segs[i][1] * sc]); }
    if (vel) bm = bm.slice(0, 5);   // in velvet: still growing, the top not yet forked
    var tines = [{ at: 0.1, a: FW - 0.5, L: 0.16 * sc, cv: -0.5 }];                       // brow tine: forward over the face, curving up
    if (vel) tines.push({ at: 0.66, a: FW - 0.8, L: 0.06, cv: -0.3 });                 // in velvet, the top fork just budding
    else tines.push({ at: 0.8, a: BK - 0.4, L: 0.12, cv: 0.3 });                       // the rear tine of the top fork (the beam's end is its front tine): three points
    var tot = 0, Ls = [0]; for (i = 1; i < bm.length; i++) { tot += Math.hypot(bm[i][0] - bm[i - 1][0], bm[i][1] - bm[i - 1][1]); Ls.push(tot); }
    function along(u) { var s = u * tot, k = 1; while (k < bm.length - 1 && Ls[k] < s) k++; var f = (s - Ls[k - 1]) / (Ls[k] - Ls[k - 1]); return [lerp(bm[k - 1][0], bm[k][0], f), lerp(bm[k - 1][1], bm[k][1], f)]; }
    var w0 = vel ? 0.036 : 0.026, c0 = vel ? C.velvet : C.ant, c1 = vel ? scl(C.velvet, 1.2) : C.antTip, set = pSet({ a: pPal(c0, { light: [250, 240, 214] }), t: pPal(c1, { light: [255, 250, 236] }) });
    function limb(pts, ws, key) {
      var lb = pLimb(pts, ws, ws, 4), n = Math.min(120, pCount(lb.len * ws[0] * 1.4, 120)), R = pRand(key, n);
      var e0 = lb.at(0, 0), e1 = lb.at(1, 0), gr = ctx.createLinearGradient(e0[0], e0[1], e1[0], e1[1]);
      if (vel) { var tipP = new Path2D(); tipP.arc(e1[0], e1[1], ws[ws.length - 1] * 1.05, 0, TAU); lb.out = lb.out; ctx.fillStyle = zc(scl(c0, dk * 1.08)); ctx.fill(tipP); }   // velvet tips are rounded knobs
      gr.addColorStop(0, zc(scl(c0, dk * 0.85))); gr.addColorStop(0.6, zc(scl(c0, dk * 1.05))); gr.addColorStop(1, zc(scl(vel ? c0 : c1, dk))); ctx.fillStyle = gr; ctx.fill(pPath(lb.out));
      if (vel) {   // velvet: soft and matte, shadowed on one side, a pale fuzz standing off the edge
        ctx.save(); ctx.clip(pPath(lb.out)); var sd = lb.at(0.5, RL.lx > 0 ? -1 : 1); zsoft(ctx, sd[0], sd[1], lb.len * 0.6, ws[0] * 0.9, scl(C.velvet, 0.55), 0.6 * dk, 1, Math.atan2(e1[1] - e0[1], e1[0] - e0[0])); var hl2 = lb.at(0.5, RL.lx > 0 ? 0.6 : -0.6); zsoft(ctx, hl2[0], hl2[1], lb.len * 0.5, ws[0] * 0.5, mixc(C.velvet, [230, 210, 190], 0.4), 0.5 * dk, 1, Math.atan2(e1[1] - e0[1], e1[0] - e0[0])); ctx.restore();
        if (!lod) { var fz = mulberry32(key.length * 7 + 3), fp2 = new Path2D(); for (var fk = 0; fk < lb.out.length; fk += 2) { var pq = lb.out[fk], pn = lb.out[(fk + 1) % lb.out.length], tx5 = pn[0] - pq[0], ty5 = pn[1] - pq[1], l5 = Math.hypot(tx5, ty5) || 1, fl5 = m.l * (0.08 + fz() * 0.1); fp2.moveTo(pq[0], pq[1]); fp2.lineTo(pq[0] + ty5 / l5 * fl5 * (pArea(lb.out) > 0 ? 1 : -1), pq[1] - tx5 / l5 * fl5 * (pArea(lb.out) > 0 ? 1 : -1)); }
        ctx.strokeStyle = zc(mixc(C.velvet, [236, 222, 206], 0.4), dk, 0.4); ctx.lineWidth = m.w * 0.45; ctx.lineCap = 'round'; ctx.stroke(fp2); } }   // velvet: soft and matte, a fine pale fuzz along the edge
      else if (!lod) { ctx.save(); ctx.clip(pPath(lb.out)); ctx.lineCap = 'round'; ctx.lineWidth = m.w * 0.55;   // the grooved horn: a few long grain lines, light on the lit side, dark on the other
        for (var k2 = 0; k2 < 5; k2++) { var v2 = -0.8 + k2 * 0.4, gp = new Path2D(); for (var j = 0; j <= 8; j++) { var q2 = lb.at(j / 8, v2); if (j) gp.lineTo(q2[0], q2[1]); else gp.moveTo(q2[0], q2[1]); } ctx.strokeStyle = v2 * -RL.lx > 0 ? zc(c1, dk * 1.05, 0.45) : zc(scl(c0, 0.5), dk, 0.5); ctx.stroke(gp); }
        ctx.restore(); }
      return lb;
    }
    var bw = bm.map(function (q, ii) { return w0 * (1 - ii / (bm.length - 1) * 0.75); }); bw[bw.length - 1] = w0 * (vel ? 0.55 : 0.12);
    var all = [limb(bm, bw, 'sikab' + (vel ? 'v' : '') + (far ? 1 : 0))];
    tines.forEach(function (tn, ii) {
      var s0 = along(tn.at), a2 = tn.a, pts = [s0], l = tn.L / 3;
      for (var k = 0; k < 3; k++) { a2 += tn.cv * 0.33; pts.push([pts[k][0] + Math.cos(a2) * l, pts[k][1] + Math.sin(a2) * l]); }
      all.push(limb(pts, [w0 * 0.75, w0 * 0.55, w0 * 0.35, w0 * (vel ? 0.45 : 0.1)], 'sikat' + ii + (far ? 1 : 0)));
    });
    if (!vel) { var bp = []; for (i = 0; i < 9; i++) { var an = i / 9 * TAU, rr = w0 * (1.15 + (i % 2) * 0.2); bp.push([base[0] + Math.cos(an) * rr, base[1] + 0.004 + Math.sin(an) * rr * 0.45]); } ctx.fillStyle = zc(scl(c0, dk * 0.7)); ctx.fill(pPath(pSmooth(bp, true, 2))); }   // the burr, knobbly (none while in velvet)
  }
  antler(true); ear(true);
  // the face: painted masses (lit forehead and nose bridge, the shadowed cheek and jaw), the markings, then a light coat texture
  var hp = pPath(d), gh = ctx.createLinearGradient(0, -0.07, 0, 0.09);
  gh.addColorStop(0, zc(mixc(face, [255, 232, 196], 0.12), 1.04)); gh.addColorStop(0.45, zc(face, 0.97)); gh.addColorStop(1, zc(mixc(face, [60, 50, 70], 0.2), 0.88));   // the same light as the body's
  ctx.fillStyle = gh; ctx.fill(hp);
  ctx.save(); ctx.clip(hp);
  zsoft(ctx, 0.0, 0.035, 0.07, 0.05, mixc(face, [60, 50, 70], 0.3), 0.3);             // the cheek's shadow under the eye
  zsoft(ctx, 0.11, -0.055, 0.1, 0.022, mixc(face, C.blk, 0.25), 0.35);                // the forehead a little darker
  zsoft(ctx, ml - 0.06, -0.026, 0.07, 0.013, mixc(face, C.blk, 0.25), 0.35);          // and the bridge of the nose
  zsoft(ctx, ml - 0.035, -0.012, 0.022, 0.016, mixc(C.muzzle, face, 0.15), 0.8, 1, 0.9);   // the pale band behind the dark nose
  zsoft(ctx, ml - 0.045, 0.032, 0.07, 0.02, C.muzzle, 0.95);                          // the pale muzzle and lips
  zsoft(ctx, 0.15, 0.066, 0.08, 0.02, C.muzzle, 0.75);                                // the pale chin
  zsoft(ctx, 0.02, 0.085, 0.06, 0.02, mixc(C.muzzle, face, 0.3), 0.6);                // the pale throat patch
  var set = pSet({ f: (function () { var P0 = pPal(face); return [P0[2], P0[3], P0[3], P0[4], P0[4], P0[5], P0[5], P0[6]]; })() }), n = lod ? 0 : pCount(0.02, 300), R = pRand('sikahead', Math.max(1, n)), b = pBox(d);
  for (var k = 0; k < n; k++) {
    var x = lerp(b[0], b[2], R[k * 4]), y = lerp(b[1], b[3], R[k * 4 + 1]); if (!pInside(d, x, y)) continue;
    var nn = hn(x, y); pStroke(set, 'f', pTi(pTone(nn[0], nn[1], nn[2], 0), pMot(x, y, 7) * 0.6), x, y, Math.PI + (y > 0.03 ? -0.35 : 0.1) + (R[k * 4 + 2] - 0.5) * 0.4, m.l * 0.5);
  }
  ctx.globalAlpha = 0.7; pSetFlush(ctx, set, m.w * 0.7); ctx.globalAlpha = 1;
  ctx.restore();
  var hr = new Path2D(); d.forEach(function (q, ii) { var q2 = d[(ii + 1) % d.length]; if (q[1] < -0.02 && q2[1] < -0.02) { hr.moveTo(q[0], q[1] + m.w * 0.4); hr.lineTo(q2[0], q2[1] + m.w * 0.4); } });
  ctx.strokeStyle = zc(RL.rimC, 1, RL.rimA * 1.3); ctx.lineWidth = m.w * 0.8; ctx.stroke(hr);
  var es2 = pSet({ f: pPal(face) });   // a little broken hair under the jaw only
  void es2;
  pSetFlush(ctx, es2, m.w * 0.7);
  // the nose and the mouth line
  ctx.fillStyle = zc(C.nose); var ns = pSmooth([[ml - 0.025, -0.012], [ml - 0.002, -0.014], [ml + 0.009, 0.002], [ml + 0.004, 0.016], [ml - 0.018, 0.014], [ml - 0.03, 0.002]], true, 3); ctx.fill(pPath(ns));
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(ml - 0.012, -0.007, 0.004, 0, TAU); ctx.fill();
  ctx.strokeStyle = zc(scl(C.blk, 1.5), 1, 0.7); ctx.lineWidth = Math.max(0.0018, 0.9 / Math.max(1, RL.k)); ctx.beginPath(); ctx.moveTo(ml - 0.012, 0.026 + jaw * 0.5); ctx.quadraticCurveTo(ml - 0.05, 0.034 + jaw, ml - 0.075, 0.03 + jaw); ctx.stroke();
  // the eye: large and dark, set high on the side, with the dark preorbital gland in front and a pale ring
  var ex = 0.09 + yaw * 0.01, ey = -0.03, bl = o.blink === undefined ? 1 : o.blink;
  function almond(cx, cy, L, H, rot) { var c = Math.cos(rot), s2 = Math.sin(rot), F = [cx + c * L, cy + s2 * L], K = [cx - c * L, cy - s2 * L], p = new Path2D(); p.moveTo(F[0], F[1]); p.quadraticCurveTo(cx + s2 * H * 2, cy - c * H * 2, K[0], K[1]); p.quadraticCurveTo(cx - s2 * H * 1.5, cy + c * H * 1.5, F[0], F[1]); p.closePath(); return p; }
  var gl = new Path2D(); gl.moveTo(ex + 0.022, ey + 0.004); gl.quadraticCurveTo(ex + 0.04, ey + 0.008, ex + 0.052, ey + 0.02); gl.quadraticCurveTo(ex + 0.036, ey + 0.016, ex + 0.022, ey + 0.009); gl.closePath();
  ctx.fillStyle = zc(mixc(face, C.blk, 0.65), 1, 0.8); ctx.fill(gl);   // the preorbital gland: a dark teardrop slit in front of the eye
  ctx.fillStyle = zc(mixc(C.muzzle, face, 0.25), 1, 0.9); ctx.fill(almond(ex, ey, 0.033, 0.0155, 0.18));   // the pale ring
  if (bl < 0.2) { ctx.strokeStyle = zc(C.blk); ctx.lineWidth = m.w; ctx.beginPath(); ctx.moveTo(ex - 0.017, ey - 0.003); ctx.quadraticCurveTo(ex, ey + 0.006, ex + 0.018, ey + 0.003); ctx.stroke(); }
  else { var ep2 = almond(ex, ey, 0.028, 0.0122 * bl, 0.18); ctx.fillStyle = 'rgb(22,14,12)'; ctx.fill(ep2); ctx.save(); ctx.clip(ep2); zsoft(ctx, ex - 0.002, ey + 0.002, 0.012, 0.01, [86, 52, 34], 0.8); ctx.restore(); ctx.strokeStyle = 'rgba(10,8,8,0.9)'; ctx.lineWidth = Math.max(0.0015, 0.8 / Math.max(1, RL.k)); ctx.stroke(ep2); ctx.fillStyle = RL.night ? 'rgba(200,220,255,0.5)' : 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(ex + 0.006, ey - 0.004 * bl, 0.0038, 0, TAU); ctx.fill(); }
  if (yaw > 0.7) { ctx.fillStyle = 'rgb(16,12,12)'; ctx.fill(almond(ex + 0.045, ey - 0.012, 0.012 * yaw, 0.006, -0.3)); }   // the far eye, just over the bridge, only when turned well round
  if (o.shine && bl > 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(210,230,170,' + (0.5 * o.shine) + ')'; ctx.beginPath(); ctx.arc(ex, ey, 0.015, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ear(false); antler(false);
}
/* a leg as a tube along its posed bones: from inside the haunch (or the shoulder) through the stifle and the gaskin's swell to the
   hock, the slim cannon, the pastern (or the elbow, the forearm, the knee...); its back (left) and front (right) half-widths */
function sikaLegTube(R, Bf, hindLeg) {
  var idx = hindLeg ? 8 : 12, e = [Bf[3].a[0] + Math.cos(Bf[3].th) * R.B0[idx].len, Bf[3].a[1] + Math.sin(Bf[3].th) * R.B0[idx].len];
  var mid = [lerp(Bf[1].a[0], Bf[2].a[0], 0.42), lerp(Bf[1].a[1], Bf[2].a[1], 0.42)], pts = [Bf[0].a, Bf[1].a, mid, Bf[2].a, Bf[3].a, e];
  var wl = hindLeg ? [0.12, 0.095, 0.07, 0.04, 0.022, 0.018] : [0.09, 0.062, 0.044, 0.031, 0.02, 0.017], wr = hindLeg ? [0.11, 0.075, 0.044, 0.03, 0.02, 0.017] : [0.09, 0.058, 0.05, 0.033, 0.021, 0.017];   // the hock and the knee a little knobbed, the cannons straight and slim
  return pLimb(pts, wl, wr, 5);
}
/* a far leg: the same shape as the near one, posed by its own bones, a tone darker (it is in the body's shadow) */
function sikaFarLeg(ctx, R, PB, Bf, hindLeg, cols, key) {
  var m = pLm(), idx = hindLeg ? [5, 6, 7, 8] : [9, 10, 11, 12];
  var lb = sikaLegTube(R, Bf, hindLeg), pts = [lb.at(0.9, 0), lb.at(1, 0)];
  var e0 = lb.at(0, 0), e1 = lb.at(1, 0), gf = ctx.createLinearGradient(e0[0], e0[1], e1[0], e1[1]); gf.addColorStop(0, zc(scl(cols.coat || cols.leg, 0.62))); gf.addColorStop(0.45, zc(scl(cols.leg, 0.6))); gf.addColorStop(1, zc(scl(mixc(cols.leg, [40, 34, 40], 0.3), 0.55))); ctx.fillStyle = gf; ctx.fill(pPath(lb.out));   // the far leg: the same pelt, in the body's shadow
  var set = pSet({ c: pPal(scl(cols.leg, 0.78)) }), n = MODE === 'm' ? 0 : Math.min(420, pCount(lb.len * 0.07, 420)), Rr = pRand(key, Math.max(1, n));
  ctx.save(); ctx.clip(pPath(lb.out));
  for (var k = 0; k < n; k++) { var u = Rr[k * 4], v = Rr[k * 4 + 1] * 2 - 1, q = lb.at(u, v); pStroke(set, 'c', pTi(0.35 + v * 0.15 * RL.lx + (1 - u) * 0.1, (Rr[k * 4 + 2] - 0.5) * 1.4), q[0], q[1], q[2] + (Rr[k * 4 + 3] - 0.5) * 0.3, m.l * 0.7); }
  pSetFlush(ctx, set, m.w * 0.9);
  ctx.restore();
  sikaHoof(ctx, Bf[3].a, pts[1], 0.6, Bf[3].th - R.B0[idx[3]].th);
}
function sikaHoof(ctx, a, b, dk, rot) {   // a small pointed hoof under the pastern, turned with it (rot: the pastern's turn from standing)
  var C = SIKA_C, m = pLm(), c = Math.cos(rot || 0), s = Math.sin(rot || 0);
  function R2(dx, dy) { return [b[0] + dx * c - dy * s, b[1] + dx * s + dy * c]; }
  var H = [[-0.024, -0.034], [0.012, -0.026], [0.036, -0.003], [0.03, 0.003], [-0.026, 0.003], [-0.03, -0.016]].map(function (q) { return R2(q[0], q[1]); });
  ctx.fillStyle = zc(scl(C.hoof, dk)); ctx.fill(pPath(pSmooth(H, true, 3)));
  var l0 = R2(-0.02, -0.03), l1 = R2(0.012, -0.022); ctx.strokeStyle = zc(scl(C.hoof, dk * 2.2), 1, 0.6); ctx.lineWidth = m.w * 0.6; ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.stroke();
  var dw = R2(-0.032, -0.04); ctx.fillStyle = zc(scl(C.hoof, dk * 1.2)); ctx.beginPath(); ctx.ellipse(dw[0], dw[1], 0.008, 0.006, 0.5 + (rot || 0), 0, TAU); ctx.fill();   // the dewclaw
}
/* the neck as a tube from deep in the chest up to the poll, through the posed neck bones; its throat (left) and crest (right)
   half-widths; drawn and painted as one with the body (the two outlines filled as a single shape) */
function sikaNeck(R, B, o) {
  var J = R.J, rut = o.rut || 0, hk = o.hind ? 0.8 : 1, tho = B[1], b0 = R.B0[1];
  function glob(b, p) { var c0 = Math.cos(-b0.th), s0 = Math.sin(-b0.th), dx = p[0] - b0.a[0], dy = p[1] - b0.a[1], lx = dx * c0 - dy * s0, ly = dx * s0 + dy * c0, c = Math.cos(b.th), s2 = Math.sin(b.th); return [b.a[0] + lx * c - ly * s2, b.a[1] + lx * s2 + ly * c]; }
  function off(b, k) { var n = [-Math.sin(b.th), Math.cos(b.th)]; return [b.a[0] + n[0] * k, b.a[1] + n[1] * k]; }
  var base = glob(tho, sikaMp([0.22, -0.84])), base2 = glob(tho, sikaMp([0.36, -0.845])), dn0 = clamp((B[2].th - R.B0[2].th) / 1.9), c1 = off(B[2], 0.05 + dn0 * 0.06), c2 = off(B[3], 0.035 + dn0 * 0.02), c3 = off(B[4], 0.025);
  var wl = [0.14, 0.15, 0.13 * (1 + rut * 0.3), 0.1 * (1 + rut * 0.3), 0.08 * (1 + rut * 0.1)].map(function (v, i) { return v * (i > 1 ? hk : 1); });   // short and thick at the base, merging into the deep chest
  var dn = clamp((B[2].th - R.B0[2].th) / 1.9), wr = [0.095 * (1 - dn * 0.7), 0.125 * (1 - dn * 0.45), 0.12 * (1 + rut * 0.3) * (1 - dn * 0.25), 0.09 * (1 + rut * 0.22), 0.072 * (1 + rut * 0.05)].map(function (v, i) { return v * (i > 1 ? hk : 1); });
  return pLimb([base, base2, c1, c2, c3], wl, wr, 6);
}
function sikaPaint(ctx, o) {
  var R = sikaRig(), C = SIKA_C, wk = clamp(o.coatK === undefined ? 0.6 : o.coatK), rut = o.hind ? 0 : (o.rut || 0), m;
  RL.k = pScale(ctx); m = pLm();
  var coat = mixc(C.sum, C.win, wk), dor = mixc(C.dorS, C.dorW, wk), leg = mixc(C.legS, C.legW, wk), bel = mixc(C.belly, mixc(C.belly, C.win, 0.3), wk), cols = { leg: leg, coat: coat };
  var Po = sikaPose(R, o), B = Po.B, ns = null, B0 = R.B0;
  ctx.save();
  // soft contact shadows under the hooves that are on the ground
  if (MODE !== 'm' && !o.noShadow) {
    [[B[8], 8], [B[12], 12], [Po.farH[3], 8], [Po.farF[3], 12]].forEach(function (q) { var e = [q[0].a[0] + Math.cos(q[0].th) * B0[q[1]].len, q[0].a[1] + Math.sin(q[0].th) * B0[q[1]].len], up = clamp(-e[1] / 0.12); if (up >= 1) return; zsoft(ctx, e[0] + 0.01, 0.004, 0.075, 0.02, [20, 18, 26], 0.42 * (1 - up) * clamp(RL.lum * 1.1, 0.4, 1)); });
  }
  // the far legs, behind
  sikaFarLeg(ctx, R, B, Po.farH, true, cols, 'sikafh'); sikaFarLeg(ctx, R, B, Po.farF, false, cols, 'sikaff');
  // the one silhouette: the body with its near legs (skinned to the skeleton) and the neck (a tube on the neck bones), filled as one
  var out0 = pSmooth(R.ctrl.map(function (c) { return sikaPt(B, c.L, ns); }), true, 5), out = pWind(out0, true), oRev = out !== out0, nk = sikaNeck(R, B, o), nOut = pWind(nk.out, true);
  var hl = sikaLegTube(R, [B[5], B[6], B[7], B[8]], true), fl = sikaLegTube(R, [B[9], B[10], B[11], B[12]], false), hOut = pWind(hl.out, true), fOut = pWind(fl.out, true);
  var path = new Path2D(); pPath(out, path); pPath(nOut, path); pPath(hOut, path); pPath(fOut, path);
  var bodyLegs = new Path2D(); pPath(out, bodyLegs); pPath(hOut, bodyLegs); pPath(fOut, bodyLegs);
  var PC = R.pc || (R.pc = {});
  function P2(x, y) { var key = x + ',' + y, L = PC[key]; if (!L) { var mp = sikaMp([x, y]); L = PC[key] = R.inherit(mp[0], mp[1]); } return sikaPt(B, L, ns); }   // a design point, posed (its skin weights kept)
  var Lt = pL(), lit = 0.5 + 0.5 * clamp(-Lt[1]);
  ctx.save(); ctx.clip(path);
  // 1. the big masses, painted wet: the local colour, a cool shadow under the barrel and down the legs, the light across the back
  var top = P2(0, -0.96), botm = P2(0, -0.55), g1 = ctx.createLinearGradient(top[0], top[1] - 0.02, botm[0], botm[1] + 0.05);
  g1.addColorStop(0, zc(mixc(coat, [255, 232, 196], 0.12), 1.04)); g1.addColorStop(0.35, zc(coat, 0.96)); g1.addColorStop(0.75, zc(mixc(coat, [60, 50, 70], 0.28), 0.8)); g1.addColorStop(1, zc(mixc(bel, coat, 0.4), 0.82));
  ctx.fillStyle = g1; ctx.fill(path);
  var lgT = P2(0, -0.6), lgB = P2(0, 0), g2 = ctx.createLinearGradient(0, lgT[1], 0, lgB[1]); g2.addColorStop(0, zc(leg, 0.85, 0)); g2.addColorStop(0.18, zc(leg, 0.82, 1)); g2.addColorStop(1, zc(mixc(leg, [40, 34, 40], 0.3), 0.75, 1));
  ctx.fillStyle = g2; ctx.fill(bodyLegs);
  // the neck: lit along the crest, shadowed down the throat; the rutting stag's neck darker, maned along the crest
  var hiC = mixc(coat, [255, 236, 200], 0.28), loC = mixc(coat, [40, 32, 48], 0.55), nkA = Math.atan2(nk.at(1, 0)[1] - nk.at(0.3, 0)[1], nk.at(1, 0)[0] - nk.at(0.3, 0)[0]);
  [0.4, 0.6, 0.8].forEach(function (u) { var a1 = nk.at(u, -0.55), b1 = nk.at(u, 0.6); zsoft(ctx, a1[0], a1[1], 0.1, 0.035, hiC, 0.35 * lit, 1, nkA); zsoft(ctx, b1[0], b1[1], 0.1, 0.04, loC, 0.4, 1, nkA); });
  if (wk > 0.4) { var nm0 = nk.at(0.6, 0); zsoft(ctx, nm0[0], nm0[1], 0.22, 0.12, mixc(coat, C.mane, 0.5), 0.45 * wk, 1, nkA); }
  if (rut > 0.05) { var mn = nk.at(0.55, -0.35), mt = nk.at(0.45, 0.55); zsoft(ctx, mn[0], mn[1], 0.2, 0.06, C.mane, 0.7 * rut, 1, nkA); zsoft(ctx, mt[0], mt[1], 0.16, 0.06, C.mane, 0.55 * rut, 1, nkA); }
  // soft painted masses: the haunch and thigh, the barrel, the shoulder blade and the forearm, and the folds between
  function blob(x, y, rx, ry, c, a, rot) { var q = P2(x, y); zsoft(ctx, q[0], q[1], rx, ry, c, a, 1, rot || 0); }
  blob(-0.45, -0.85, 0.14, 0.1, hiC, 0.6 * lit); blob(-0.42, -0.66, 0.09, 0.11, hiC, 0.3 * lit); blob(0.06, -0.86, 0.26, 0.07, hiC, 0.42 * lit); blob(0.31, -0.86, 0.07, 0.12, hiC, 0.45 * lit, -0.4);
  blob(0.3, -0.62, 0.05, 0.08, hiC, 0.3 * lit);
  var gq = hl.at(0.32, 0.3), fq = fl.at(0.3, -0.3), ga = hl.at(0.4, 0)[2], fa = fl.at(0.3, 0)[2]; zsoft(ctx, gq[0], gq[1], 0.09, 0.035, hiC, 0.3 * lit, 1, ga); zsoft(ctx, fq[0], fq[1], 0.08, 0.03, hiC, 0.25 * lit, 1, fa);   // the gaskin and the forearm muscle
  blob(0.2, -0.74, 0.04, 0.14, loC, 0.5, 0.15); blob(-0.29, -0.7, 0.05, 0.1, loC, 0.5, -0.25); blob(-0.03, -0.59, 0.22, 0.05, loC, 0.42); blob(0.44, -0.66, 0.05, 0.08, loC, 0.35);
  blob(-0.4, -0.56, 0.06, 0.1, loC, 0.4, 0.4); blob(-0.54, -0.6, 0.04, 0.12, loC, 0.35, 0.2);
  // the legs round, not flat: a shadow down the side away from the light, a soft light down the other
  [[5, 6, 7], [9, 10, 11]].forEach(function (ix) { ix.forEach(function (bi) { var b = B[bi], e = [b.a[0] + Math.cos(b.th) * B0[bi].len, b.a[1] + Math.sin(b.th) * B0[bi].len], nx = -Math.sin(b.th), ny = Math.cos(b.th), w = bi === 5 ? 0.06 : bi === 9 ? 0.04 : bi === 6 || bi === 10 ? 0.03 : 0.012, sd = RL.lx > 0 ? 1 : -1;
    ctx.strokeStyle = zc(loC, 1, 0.3); ctx.lineWidth = w * 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.a[0] - nx * w * sd * 0.6, b.a[1] - ny * w * sd * 0.6); ctx.lineTo(e[0] - nx * w * sd * 0.6, e[1] - ny * w * sd * 0.6); ctx.stroke();
    ctx.strokeStyle = zc(hiC, 1, 0.18 * lit); ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(b.a[0] + nx * w * sd * 0.5, b.a[1] + ny * w * sd * 0.5); ctx.lineTo(e[0] + nx * w * sd * 0.5, e[1] + ny * w * sd * 0.5); ctx.stroke(); }); });
  // markings: the dark dorsal stripe, the pale belly
  var dorP = new Path2D(); [[-0.52, -0.965], [-0.36, -0.975], [-0.18, -0.95], [0.05, -0.945], [0.22, -0.975], [0.33, -0.99]].forEach(function (q, ii) { var p0 = P2(q[0], q[1] + 0.012); if (ii) dorP.lineTo(p0[0], p0[1]); else dorP.moveTo(p0[0], p0[1]); });
  ctx.strokeStyle = zc(dor, 0.95, 0.7); ctx.lineWidth = 0.04; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(dorP); ctx.strokeStyle = zc(dor, 0.9, 0.3); ctx.lineWidth = 0.07; ctx.stroke(dorP);
  blob(-0.02, -0.575, 0.2, 0.03, bel, 0.8); blob(0.26, -0.53, 0.06, 0.035, bel, 0.4);
  var fla = clamp(o.flare || 0);
  // the spots: crisp white dabs in rows in summer, a ghost of them in the winter coat
  var spA = clamp((0.62 - wk) * 1.9) * 0.85 + 0.12 * (1 - wk) + 0.07;
  var spC = mixc([236, 226, 198], coat, 0.12 + 0.2 * (1 - lit));
  if (spA > 0.04) R.SP.forEach(function (p) { var q = sikaPt(B, p.L, ns), turn = rigTurn(B, B0, p.L), r = 0.0105 * p.s, an = p.ha + turn + Math.PI + p.rot, a1 = spA * p.al;
    zsoft(ctx, q[0], q[1], r * 1.7, r * 1.7 * p.asp, spC, Math.min(1, a1 * 1.15), 1, an); });   // each a soft dab of cream, its edge lost in the coat
  // 2. the coat: a light texture of short strokes along the lie of the hair, close in tone to the paint beneath
  var lo = MODE === 'm', n = lo ? 0 : pCount(R.area, 2000), S = sikaSamples(R, n);   // (in the pond's reflection: the paint only, no brushwork)
  var soft = function (c) { var P0 = pPal(c); return [P0[2], P0[3], P0[3], P0[4], P0[4], P0[5], P0[5], P0[6]]; };
  var set = pSet({ coat: soft(coat), leg: soft(leg), bel: soft(bel), mane: soft(C.mane) });
  for (var i = 0; i < n; i++) {
    var sm = S[i], x0 = sm.x, y0 = sm.y, q = sikaPt(B, sm.L, ns), turn = rigTurn(B, B0, sm.L), nr = sm.nr, cls = 'coat';
    if (y0 > -0.5 && (x0 < -0.3 || x0 > 0.2)) cls = 'leg';
    else if (y0 > R.bellyY(x0) - 0.04 && x0 > -0.3 && x0 < 0.25) cls = 'bel';
    var tn = pTone(nr[0], nr[1], nr[2], nr[3], -turn * 0.6);
    pStroke(set, cls, pTi(tn, pMot(x0, y0, 1) * 0.6 + (sm.r2 - 0.5) * 0.5), q[0], q[1], sm.ha + turn + (sm.r1 - 0.5) * 0.3, m.l * (0.55 + sm.r2 * 0.4) * (cls === 'leg' ? 0.6 : 1));
  }
  [[hl, 'sikahl', 0.08], [fl, 'sikafl', 0.06]].forEach(function (L3) { var lb = L3[0], nl = lo ? 0 : pCount(lb.len * L3[2], 400), LR = pRand(L3[1], Math.max(1, nl)); for (var k3 = 0; k3 < nl; k3++) { var u3 = 0.15 + LR[k3 * 4] * 0.85, v3 = LR[k3 * 4 + 1] * 2 - 1, q3 = lb.at(u3, v3), nm3 = q3[3]; pStroke(set, 'leg', pTi(pTone(nm3[0] * v3, nm3[1] * v3, Math.sqrt(Math.max(0, 1 - v3 * v3)), 0) * 0.95, (LR[k3 * 4 + 2] - 0.5) * 0.8), q3[0], q3[1], q3[2] + (LR[k3 * 4 + 3] - 0.5) * 0.3, m.l * 0.55); } });
  var nn2 = lo ? 0 : pCount(nk.len * 0.17, 500), NR = pRand('sikaneck', Math.max(1, nn2));
  for (i = 0; i < nn2; i++) {
    var u = 0.12 + NR[i * 4] * 0.88, v = NR[i * 4 + 1] * 2 - 1, qn = nk.at(u, v), nm = qn[3], cz = Math.sqrt(Math.max(0, 1 - v * v)), cn = rut > 0.3 && v < -0.2 ? 'mane' : 'coat';
    pStroke(set, cn, pTi(pTone(nm[0] * v, nm[1] * v, cz, 0) * (cn === 'mane' ? 0.8 : 1), (NR[i * 4 + 2] - 0.5) * 0.8), qn[0], qn[1], qn[2] + Math.PI + (NR[i * 4 + 3] - 0.5) * 0.35 + (cn === 'mane' ? 0.3 : 0), m.l * (0.55 + NR[i * 4 + 3] * 0.4) * (cn === 'mane' ? 1.5 : 1));
  }
  ctx.globalAlpha = 0.55; pSetFlush(ctx, set, m.w * 0.8, ['leg', 'coat', 'bel', 'mane']); ctx.globalAlpha = 1;
  // the rump patch: a soft white heart on the back of the haunch, a thin dark line round its top and front, the tail down its middle
  var rp = [[-0.522, -0.895], [-0.548, -0.905], [-0.572, -0.885], [-0.598, -0.9], [-0.614, -0.87], [-0.618, -0.79], [-0.605, -0.71], [-0.585, -0.655], [-0.56, -0.7], [-0.535, -0.77], [-0.518, -0.84]].map(function (q) { var cx = -0.577, cy = -0.79, k = 0.8 + fla * 0.42; return P2(cx + (q[0] - cx) * k - fla * 0.014, cy + (q[1] - cy) * k); });   // (seen from the side, a soft crescent at the back of the haunch; flared, it spreads)
  var rps = pSmooth(rp, true, 5), rbx = pBox(rps);
  var grr = ctx.createLinearGradient(0, rbx[1], 0, rbx[3]); grr.addColorStop(0, zc(C.white, 1.02)); grr.addColorStop(0.6, zc(C.white, 0.94)); grr.addColorStop(1, zc(mixc(C.white, [130, 134, 156], 0.25), 0.82));
  ctx.fillStyle = grr; [[0.018, 0.1], [0.011, 0.16], [0.005, 0.26], [-0.001, 0.4], [-0.007, 0.6], [-0.014, 0.9]].forEach(function (q) { ctx.globalAlpha = q[1]; ctx.fill(pPath(pOffset(rps, q[0]))); }); ctx.globalAlpha = 1;   // the fur edge feathered well into the coat   // soft-edged: the white fades into the coat
  var re = pSmooth([rp[9], rp[10], rp[0], rp[1], rp[2]], false, 5), rb = new Path2D(); re.forEach(function (q, ii) { if (ii) rb.lineTo(q[0], q[1]); else rb.moveTo(q[0], q[1]); });
  ctx.save(); ctx.translate(0.014, -0.006); ctx.strokeStyle = zc(mixc(C.blk, coat, 0.35), 1, 0.12); ctx.lineWidth = 0.03; ctx.stroke(rb); ctx.strokeStyle = zc(mixc(C.blk, coat, 0.3), 1, 0.22); ctx.lineWidth = 0.014; ctx.stroke(rb); ctx.restore();   // the dark line round its top and front, soft
  ctx.restore();
  // 3. the edge: clean, with a thin sky rim along the top; broken into hair only at the throat, under the belly and (in rut) the mane
  var rim = new Path2D(), eh = pSet({ coat: pPal(coat), mane: pPal(C.mane), bel: pPal(bel) }), er = mulberry32(17), bxN = pBox(nOut), bxB = pBox(out);
  function inBox(b2, q) { return q[0] > b2[0] && q[0] < b2[2] && q[1] > b2[1] && q[1] < b2[3]; }
  var allO = [out, nOut, hOut, fOut], allB = allO.map(pBox);
  function edge(dd, other, obx, zoneFn) {
    var ar = pArea(dd) > 0 ? 1 : -1, acc = 0;
    for (var ii = 0; ii < dd.length; ii++) {
      var a0 = dd[ii], c0 = dd[(ii + 1) % dd.length], sl = Math.hypot(c0[0] - a0[0], c0[1] - a0[1]), tx = (c0[0] - a0[0]) / (sl || 1), ty = (c0[1] - a0[1]) / (sl || 1), nx = ty * ar, ny = -tx * ar, hid = false;
      for (var oj = 0; oj < allO.length && !hid; oj++) if (allO[oj] !== dd && inBox(allB[oj], a0) && pInside(allO[oj], a0[0], a0[1])) hid = true;
      if (hid) continue;
      if (-ny > 0.35) { rim.moveTo(a0[0] - nx * m.w * 0.5, a0[1] - ny * m.w * 0.5); rim.lineTo(c0[0] - nx * m.w * 0.5, c0[1] - ny * m.w * 0.5); }
      acc += sl; if (acc < m.w * 1.4) continue; acc = 0;
      var z = zoneFn(ii, a0, nx, ny); if (!z) continue;
      var L2 = m.l * z[1] * (0.6 + er() * 0.6), hx = nx * 0.6 + tx * z[2] * ar, hy = ny * 0.6 + ty * z[2] * ar + 0.25, hl = Math.hypot(hx, hy) || 1;
      pAdd(eh[z[0]].b, pTi(z[0] === 'bel' ? 0.5 : 0.55, (er() - 0.5) * 1.2), a0[0] - hx / hl * L2 * 0.35, a0[1] - hy / hl * L2 * 0.35, a0[0] + hx / hl * L2 * 0.65, a0[1] + hy / hl * L2 * 0.65);
    }
  }
  var bellyL = P2(-0.25, -0.6)[0], bellyR = P2(0.2, -0.55)[0], half = nOut.length / 2, nRev = nk.out !== nOut;
  if (!lo) edge(out, nOut, bxN, function (ii, a0, nx, ny) { var k = oRev ? out.length - 1 - ii : ii, rc = R.ctrl[Math.min(R.ctrl.length - 1, Math.floor(k / 5))], ry = sikaInv([rc.x, rc.y])[1]; return rc.x > -0.24 && rc.x < 0.2 && ry > -0.66 && ry < -0.48 && ny > 0.3 ? ['bel', 0.8, 0.3] : null; });   // only the belly line itself (by where the point sits on the standing deer)
  if (!lo) edge(nOut, out, bxB, function () { return null; });   // (the neck: the rim only; the mane and the throat get soft locks below)
  if (!lo) { edge(hOut, null, null, function () { return null; }); edge(fOut, null, null, function () { return null; }); }   // (the legs: the rim only)
  pSetFlush(ctx, eh, m.w * 0.75);
  ctx.strokeStyle = zc(RL.rimC, 1, RL.rimA * 0.9); ctx.lineWidth = m.w * 0.7; ctx.lineCap = 'round'; ctx.stroke(rim);
  if (!lo) {   // the neck's long hair: a soft shaggy mane along the crest and the throat in rut and in the winter coat, a few soft locks at the throat otherwise
    var mk = Math.max(rut, wk * 0.5), nkO = nOut, nbx = pBox(out);
    tanWisps(ctx, [nkO], function (x, y, nx, ny) { if (pInside(out, x, y)) return 0; var throat = ny > 0.2 || nx > 0.6; return throat ? 0.25 + 0.6 * mk : ny < -0.2 ? 0.75 * mk : 0; }, [mixc(coat, C.mane, 0.3), mixc(coat, C.mane, 0.6), C.mane], m, 61); void nbx;
  }
  // the tail: short, down the middle of the patch; white beneath, a dark line down its top; up and flared when alarmed
  var tb = P2(-0.572, -0.892), ta = lerp(1.72, 2.75, fla), tl = 0.085;
  var td = [Math.cos(ta), Math.sin(ta)], tn2 = [-td[1], td[0]], tail = pLimb([tb, [tb[0] + td[0] * tl * 0.5 + tn2[0] * 0.006, tb[1] + td[1] * tl * 0.5 + tn2[1] * 0.006], [tb[0] + td[0] * tl, tb[1] + td[1] * tl]], [0.026, 0.028, 0.016], [0.026, 0.028, 0.016], 4), tp = pPath(tail.out);
  var gt = ctx.createLinearGradient(tb[0] - tn2[0] * 0.03, tb[1] - tn2[1] * 0.03, tb[0] + tn2[0] * 0.03, tb[1] + tn2[1] * 0.03); gt.addColorStop(0, zc(C.white, 1.04)); gt.addColorStop(1, zc(C.white, 0.9)); ctx.fillStyle = gt; ctx.fill(tp);
  ctx.save(); ctx.clip(tp); var tq0 = tail.at(0.05, -0.45), tq1 = tail.at(0.75, -0.35); var tq2 = tail.at(0.4, -0.45); zsoft(ctx, tq2[0], tq2[1], 0.035, 0.008, mixc(C.blk, coat, 0.4), 0.45, 1, ta); ctx.restore(); void tq0; void tq1;   // a soft dark stripe down its top
  // the near hooves
  var hP = B[8], fP = B[12]; sikaHoof(ctx, hP.a, [hP.a[0] + Math.cos(hP.th) * B0[8].len, hP.a[1] + Math.sin(hP.th) * B0[8].len], 1, hP.th - B0[8].th); sikaHoof(ctx, fP.a, [fP.a[0] + Math.cos(fP.th) * B0[12].len, fP.a[1] + Math.sin(fP.th) * B0[12].len], 1, fP.th - B0[12].th);
  // the head on the end of the neck: the poll at the top of the last neck bone (the hind's smaller and finer)
  var hb = B[4], hdo = o.head || {}, nE = nk.at(1, -0.75), hsc = o.hind ? 1.16 : 1.28;
  ctx.save(); ctx.translate(lerp(hb.a[0], nE[0], 0.5), lerp(hb.a[1], nE[1], 0.5)); ctx.rotate(hb.th); ctx.scale(hsc, hsc);
  sikaHead(ctx, { yaw: hdo.yaw, mouth: o.mouth, ears: o.ears, t: o.t, blink: o.blink, shine: o.shine, antler: o.hind ? 0 : o.antler === undefined ? 1 : o.antler, velvet: o.velvet, hd: hb.th, coat: coat }, wk, rut);
  ctx.restore();
  ctx.restore();
}


/* ================= the quadrupeds' shared rig (the fox and the tanuki; the sika has its own tuned copy above) =================
   A spec gives the joints of the 13-bone skeleton, the body's one outline with the bones each point rides on, the form as
   rounded masses, the back and belly lines, the lie of the hair, and the neck tube. qRig turns it into skinning data once. */
var QG = { T: [0, 1], NK: [1, 2, 3], CH: [1, 9], FU: [1, 9, 10], FL: [10, 11, 12], FP: [11, 12], BE: [0, 1], FK: [0, 5], HF: [5, 6], HL: [6, 7, 8], HP: [7, 8], RB: [0, 5, 6] };
function qRig(spec) {
  if (spec.R) return spec.R;
  var J = {}, k; for (k in spec.J) J[k] = spec.J[k].slice();
  var BN = [['P0', 'M'], ['M', 'Wt'], ['N0', 'Nm'], ['Nm', 'N1'], ['N1', 'Ns'], ['Hj', 'St'], ['St', 'Hk'], ['Hk', 'HFt'], ['HFt', 'HHf'], ['Sp', 'El'], ['El', 'Kn'], ['Kn', 'FFt'], ['FFt', 'FHf']];
  var sc = spec.sc || 1, SIG = [0.3, 0.3, 0.12, 0.1, 0.1, 0.16, 0.12, 0.05, 0.035, 0.12, 0.09, 0.05, 0.035].map(function (v) { return v * sc; });
  function bone(a, b) { return { a: a, b: b, th: Math.atan2(b[1] - a[1], b[0] - a[0]), len: Math.hypot(b[0] - a[0], b[1] - a[1]) }; }
  var B0 = BN.map(function (q) { return bone(J[q[0]], J[q[1]]); });
  function dSeg(b, x, y) { var dx = b.b[0] - b.a[0], dy = b.b[1] - b.a[1], t = clamp(((x - b.a[0]) * dx + (y - b.a[1]) * dy) / (dx * dx + dy * dy)); return Math.hypot(x - b.a[0] - dx * t, y - b.a[1] - dy * t); }
  function wts(cand, x, y) {
    var ws = cand.map(function (i) { var d = dSeg(B0[i], x, y) / SIG[i]; return [i, Math.exp(-d * d)]; }).sort(function (p, q) { return q[1] - p[1]; }).slice(0, 3), s = 0;
    ws.forEach(function (w) { s += w[1]; }); if (s < 1e-9) return [[ws[0][0], 1]]; ws.forEach(function (w) { w[1] /= s; }); return ws.filter(function (w) { return w[1] > 0.02; });
  }
  var C = spec.C.map(function (c) { return [c[0], c[1], typeof c[2] === 'string' ? QG[c[2]] : c[2]]; });
  var ctrl = C.map(function (c) { var ws = wts(c[2], c[0], c[1]); return { x: c[0], y: c[1], ws: ws, L: rigLocal(B0, ws, c[0], c[1]) }; });
  var rest = pSmooth(C.map(function (c) { return [c[0], c[1]]; }), true, 5), MS = spec.MS;
  function pw(T, x) { if (x <= T[0][0]) return T[0][1]; for (var k2 = 1; k2 < T.length; k2++) if (x <= T[k2][0]) { var f = (x - T[k2 - 1][0]) / (T[k2][0] - T[k2 - 1][0]); f = f * f * (3 - 2 * f); return lerp(T[k2 - 1][1], T[k2][1], f); } return T[T.length - 1][1]; }
  function backY(x) { return pw(spec.BK, x); }
  function bellyY(x) { return pw(spec.BL, x); }
  function normal(x, y) { var e = 0.012 * sc, h = pHeight(MS, x, y), hx = (pHeight(MS, x + e, y) - h) / e, hy = (pHeight(MS, x, y + e) - h) / e, n = Math.hypot(hx, hy, 1); return [-hx / n, -hy / n, 1 / n, 1 - sstep(-0.01 * sc, 0.06 * sc, h)]; }
  function inherit(x, y) {
    var acc = {}, tot = 0, i, e2 = 0.0012 * sc * sc;
    for (i = 0; i < ctrl.length; i++) { var c = ctrl[i], d2 = (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y), kk = 1 / Math.pow(d2 + e2, 2); tot += kk; c.ws.forEach(function (w) { acc[w[0]] = (acc[w[0]] || 0) + kk * w[1]; }); }
    var ws = []; for (var b in acc) if (acc[b] / tot > 0.03) ws.push([+b, acc[b] / tot]); var s = 0; ws.forEach(function (w) { s += w[1]; }); ws.forEach(function (w) { w[1] /= s; });
    return rigLocal(B0, ws, x, y);
  }
  var R = { spec: spec, J: J, B0: B0, ctrl: ctrl, rest: rest, area: Math.abs(pArea(rest)), backY: backY, bellyY: bellyY, hair: spec.hair, normal: normal, inherit: inherit, S: [], sc: sc, pc: {} };
  R.hair = function (x, y) { return spec.hair(x, y, R); };
  spec.R = R; return R;
}
function qSamples(R, n) {
  if (R.S.length >= n) return R.S;
  var pts = pSamples('q' + R.spec.key, R.rest, n);
  for (var i = R.S.length; i < pts.length; i++) { var q = pts[i]; R.S.push({ x: q[0], y: q[1], r1: q[2], r2: q[3], L: R.inherit(q[0], q[1]), nr: R.normal(q[0], q[1]), ha: R.hair(q[0], q[1]) }); }
  return R.S;
}
function qP2(R, B, x, y) { var key = x + ',' + y, L = R.pc[key]; if (!L) L = R.pc[key] = R.inherit(x, y); return sikaPt(B, L, null, R.B0); }
/* the pose, as the sika's but scaled to the animal: its stride, the far legs' offset, a tuck in the air */
function qPose(R, o) {
  var sc = R.sc, J = R.J, B0 = R.B0, G = (R.spec.G && R.spec.G[o.gait]) || ZG[o.gait] || ZG.walk, ph = o.ph || 0, amp = clamp(o.amp || 0), stride = o.stride || 0.8 * sc, rz = gRise(G, ph, amp) * sc, lift = (o.lift || 0) + rz;   // each species its own gaits (spec.G); the shared table only as a fallback
  var bob = -Math.abs(Math.cos(ph * Math.PI * G.bobN)) * G.bob * amp * 0.8 * sc, pitchB = (o.bodyPitch || 0) + gPitch(G, o.gait, ph, amp) + (o.arch || 0);
  var M = J.M; function TB(p) { var c = Math.cos(pitchB), s = Math.sin(pitchB), dx = p[0] - M[0], dy = p[1] - M[1]; return [M[0] + dx * c - dy * s, M[1] + dx * s + dy * c + bob - lift + ((o.crouch || 0) * 0.12 + (G.sink || 0) * amp) * sc]; }
  function loc(b, p) { var c = Math.cos(-b.th), s = Math.sin(-b.th), dx = p[0] - b.a[0], dy = p[1] - b.a[1]; return [dx * c - dy * s, dx * s + dy * c]; }
  function glob(b, l) { var c = Math.cos(b.th), s = Math.sin(b.th); return [b.a[0] + l[0] * c - l[1] * s, b.a[1] + l[0] * s + l[1] * c]; }
  var roll = Math.sin(ph * TAU * (G.rollN || 2)) * (G.roll === undefined ? 0.018 : G.roll) * amp;
  var pel = { a: TB(J.P0), th: B0[0].th + pitchB + roll }, tho = { a: TB(J.M), th: B0[1].th + pitchB - roll * 0.6 }, B = [pel, tho];
  var hd = o.head || {}, aN = hd.neck === undefined ? B0[2].th : hd.neck, bend = hd.bend || 0, aH = hd.ang === undefined ? (R.spec.headAng || 0.3) : hd.ang;
  var N0 = glob(tho, loc(B0[1], J.N0)), Nm = [N0[0] + Math.cos(aN - bend) * B0[2].len, N0[1] + Math.sin(aN - bend) * B0[2].len], N1 = [Nm[0] + Math.cos(aN + bend) * B0[3].len, Nm[1] + Math.sin(aN + bend) * B0[3].len];
  B[2] = { a: N0, th: aN - bend }; B[3] = { a: Nm, th: aN + bend }; B[4] = { a: N1, th: aH };
  function foot(i) {
    var u = (((ph + G.off[i]) % 1) + 1) % 1, sw = Math.min(stride * G.beta * amp, -J.Hj[1] * 0.9), lf = Math.min(G.lift * stride * 0.5, -J.Hj[1] * (G.liftH || 0.2)) * Math.min(1, amp * 1.6);   // the stride and the foot's lift kept in proportion to the leg
    if (u < G.beta) return { dx: sw * (0.5 - u / G.beta), up: rz, f: 0, st: u / G.beta };
    var v = (u - G.beta) / (1 - G.beta), e = v * v * (3 - 2 * v); return { dx: sw * (-0.5 + e), up: Math.sin(v * Math.PI) * lf + rz, f: gFold(G, v) * Math.min(1, amp * 1.6), st: -1 };
  }
  function hind(i, far) {
    var ft = foot(i), dxf = far ? 0.03 * sc : 0, hip = glob(pel, loc(B0[0], J.Hj)); hip = [hip[0] + dxf, hip[1]];
    if (o.tuck) ft = { dx: -0.3 * sc, up: 0.12 * sc + lift, f: 1 };
    var T = [J.HHf[0] + ft.dx + dxf, -ft.up], aP = Math.atan2(J.HHf[1] - J.HFt[1], J.HHf[0] - J.HFt[0]) + ft.f * 0.9;
    var Fl = [T[0] - Math.cos(aP) * B0[8].len, T[1] - Math.sin(aP) * B0[8].len], aC = B0[7].th - ft.f * 0.55 - (ft.st >= 0 ? (ft.dx / Math.max(0.2 * sc, stride)) * 0.6 : 0);
    var lc = B0[7].len, reach = (B0[5].len + B0[6].len) * 0.985;
    function hk(a) { return [Fl[0] - Math.cos(a) * lc, Fl[1] - Math.sin(a) * lc]; }
    var Hk = hk(aC);
    if (Math.hypot(Hk[0] - hip[0], Hk[1] - hip[1]) > reach) { var aT = Math.atan2(Fl[1] - hip[1], Fl[0] - hip[0]), lo = aC, hi = aT; for (var it = 0; it < 14; it++) { var md = (lo + hi) / 2; if (Math.hypot(hk(md)[0] - hip[0], hk(md)[1] - hip[1]) > reach) lo = md; else hi = md; } aC = hi; Hk = hk(aC); }
    var St = zik2(hip, Hk, B0[5].len, B0[6].len, -1)[0];
    return [{ a: hip, th: Math.atan2(St[1] - hip[1], St[0] - hip[0]) }, { a: St, th: Math.atan2(Hk[1] - St[1], Hk[0] - St[0]) }, { a: Hk, th: Math.atan2(Fl[1] - Hk[1], Fl[0] - Hk[0]) }, { a: Fl, th: aP }];
  }
  function fore(i, far) {
    var ft = foot(i), dxf = far ? 0.035 * sc : 0, sp = glob(tho, loc(B0[1], J.Sp)); sp = [sp[0] + dxf, sp[1]];
    if (o.tuck) ft = { dx: 0.12 * sc, up: 0.12 * sc + lift, f: 1 };
    var aC = B0[11].th + ft.f * (R.spec.wristFold || 0.95) - (ft.st >= 0 ? (ft.dx / Math.max(0.2 * sc, stride)) * 0.35 : 0), aP0 = Math.atan2(J.FHf[1] - J.FFt[1], J.FHf[0] - J.FFt[0]), aP = lerp(aP0, aC + 0.15, ft.f);   // the wrist bends, the paw hangs from it
    var T = [J.FHf[0] + ft.dx + dxf, -ft.up], Fl = [T[0] - Math.cos(aP) * B0[12].len, T[1] - Math.sin(aP) * B0[12].len];
    var Kn = [Fl[0] - Math.cos(aC) * B0[11].len, Fl[1] - Math.sin(aC) * B0[11].len], reach = (B0[9].len + B0[10].len) * 0.985, d = Math.hypot(Kn[0] - sp[0], Kn[1] - sp[1]);
    if (d > reach) { var ux = (Kn[0] - sp[0]) / d, uy = (Kn[1] - sp[1]) / d, sh = d - reach; Kn = [Kn[0] - ux * sh, Kn[1] - uy * sh]; Fl = [Fl[0] - ux * sh, Fl[1] - uy * sh]; }
    var El = zik2(sp, Kn, B0[9].len, B0[10].len, 1)[0];
    return [{ a: sp, th: Math.atan2(El[1] - sp[1], El[0] - sp[0]) }, { a: El, th: Math.atan2(Kn[1] - El[1], Kn[0] - El[0]) }, { a: Kn, th: Math.atan2(Fl[1] - Kn[1], Fl[0] - Kn[0]) }, { a: Fl, th: aP }];
  }
  var h0 = hind(0), f0 = fore(2);
  B[5] = h0[0]; B[6] = h0[1]; B[7] = h0[2]; B[8] = h0[3]; B[9] = f0[0]; B[10] = f0[1]; B[11] = f0[2]; B[12] = f0[3];
  return { B: B, farH: hind(1, true), farF: fore(3, true) };
}
function qEnd(b, len) { return [b.a[0] + Math.cos(b.th) * len, b.a[1] + Math.sin(b.th) * len]; }
/* a leg as a tube along its posed bones (as the sika's): hip or shoulder, the stifle or elbow, the gaskin or forearm, hock or wrist, foot */
function qLegTube(R, Bf, hindLeg, wl0, wr0, top0) {
  var W = R.spec.legW, e = qEnd(Bf[3], R.B0[hindLeg ? 8 : 12].len), mid = [lerp(Bf[1].a[0], Bf[2].a[0], 0.42), lerp(Bf[1].a[1], Bf[2].a[1], 0.42)], t0 = top0 !== undefined ? top0 : (hindLeg && R.spec.tubeTopH !== undefined ? R.spec.tubeTopH : R.spec.tubeTop) || 0;   // (a far leg starts lower: its top is hidden behind the body)
  return pLimb([[lerp(Bf[0].a[0], Bf[1].a[0], t0), lerp(Bf[0].a[1], Bf[1].a[1], t0)], Bf[1].a, mid, Bf[2].a, Bf[3].a, e], wl0 || (hindLeg ? W.hl : W.fl), wr0 || (hindLeg ? W.hr : W.fr), 5);
}
/* a far leg, posed by its bones, painted a tone darker */
function qFarLeg(ctx, R, Bf, hindLeg, wl, wr, pal, key) {
  var lb = qLegTube(R, Bf, hindLeg, R.spec.farW ? wl : null, R.spec.farW ? wr : null, R.spec.farTop), path = pPath(lb.out), e0 = lb.at(0, 0), e1 = lb.at(1, 0), g = ctx.createLinearGradient(e0[0], e0[1], e1[0], e1[1]);
  g.addColorStop(0, zc(pal[0], 0.62)); g.addColorStop(0.5, zc(mixc(pal[0], pal[1], 0.5), 0.55)); g.addColorStop(1, zc(pal[2], 0.6)); ctx.fillStyle = g; ctx.fill(path);
  return lb;
}
/* the soft contact shadows under the feet that are down */
function qContact(ctx, R, Po, rx) {
  if (MODE === 'm') return;
  [[Po.B[8], 8], [Po.B[12], 12], [Po.farH[3], 8], [Po.farF[3], 12]].forEach(function (q) { var e = qEnd(q[0], R.B0[q[1]].len), up = clamp(-e[1] / (0.12 * R.sc)); if (up >= 1) return; zsoft(ctx, e[0], 0.004 * R.sc, rx, rx * 0.27, [20, 18, 26], 0.42 * (1 - up) * clamp(RL.lum * 1.1, 0.4, 1)); });
}
/* edge work along an outline (skipping where it lies inside another): a sky rim along the top, broken hair where zoneFn says */
function qEdge(ctx, outs, zoneFn, pals, rimOn) {
  var m = pLm(), rim = new Path2D(), set = pSet(pals), er = mulberry32(17), bxs = outs.map(pBox);
  function inB(b, q) { return q[0] > b[0] && q[0] < b[2] && q[1] > b[1] && q[1] < b[3]; }
  outs.forEach(function (dd, oi) {
    var ar = pArea(dd) > 0 ? 1 : -1, acc = 0;
    for (var ii = 0; ii < dd.length; ii++) {
      var a0 = dd[ii], c0 = dd[(ii + 1) % dd.length], sl = Math.hypot(c0[0] - a0[0], c0[1] - a0[1]), tx = (c0[0] - a0[0]) / (sl || 1), ty = (c0[1] - a0[1]) / (sl || 1), nx = ty * ar, ny = -tx * ar, hid = false;
      for (var j = 0; j < outs.length && !hid; j++) if (j !== oi && inB(bxs[j], a0) && pInside(outs[j], a0[0], a0[1])) hid = true;
      if (hid) continue;
      if (rimOn !== false && -ny > 0.35) { rim.moveTo(a0[0] - nx * m.w * 0.5, a0[1] - ny * m.w * 0.5); rim.lineTo(c0[0] - nx * m.w * 0.5, c0[1] - ny * m.w * 0.5); }
      acc += sl; if (acc < m.w * 1.3) continue; acc = 0;
      var z = zoneFn(oi, ii, a0, nx, ny, dd.length); if (!z) continue;
      var L2 = m.l * z[1] * (0.6 + er() * 0.6), hx = nx * 0.65 + tx * z[2] * ar, hy = ny * 0.65 + ty * z[2] * ar + (z[3] || 0), hl = Math.hypot(hx, hy) || 1;
      pAdd(set[z[0]].b, pTi(z[4] === undefined ? 0.55 : z[4], (er() - 0.5) * 1.2), a0[0] - hx / hl * L2 * 0.35, a0[1] - hy / hl * L2 * 0.35, a0[0] + hx / hl * L2 * 0.65, a0[1] + hy / hl * L2 * 0.65);
    }
  });
  pSetFlush(ctx, set, m.w * 0.75);
  if (rimOn !== false) { ctx.strokeStyle = zc(RL.rimC, 1, RL.rimA * 0.9); ctx.lineWidth = m.w * 0.7; ctx.lineCap = 'round'; ctx.stroke(rim); }
}
/* a soft fur outline: the silhouette's edge feathered out a little in the coat's own colours (no hard vector edge, no ticks) */
function qFuzz(ctx, path, c0, c1, y0, y1, w) {
  var g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, zc(c0, 1, 0.35)); g.addColorStop(1, zc(c1, 1, 0.35));
  ctx.strokeStyle = g; ctx.lineJoin = 'round'; ctx.lineWidth = w * 1.8; ctx.globalAlpha = 0.22; ctx.stroke(path); ctx.lineWidth = w * 0.8; ctx.globalAlpha = 0.4; ctx.stroke(path); ctx.globalAlpha = 1;
}
function qSoft(c) { var P0 = pPal(c); return [P0[2], P0[3], P0[3], P0[4], P0[4], P0[5], P0[5], P0[6]]; }
/* ---- the red fox (ホンドギツネ), drawn as one painted animal: about 38 cm at the shoulder, body 65 cm, the brush 38 cm. Slim
   legs in dark stockings, the deep narrow chest, the white bib from the lips down the throat to the chest, a pale belly; big
   pointed ears black on the back; a long fine muzzle with white lips; the full brush dark above near the root, white-tipped.
   In winter the coat is longer and the brush fuller ---- */
var FOXS = {
  /* the fox's own gaits: a low, smooth trot (short quick strides, the paws barely lifted with a quick flick, the back level), an
     easy walk, the slow crouched stalk, and a gallop only when it is fleeing */
  G: {
    walk: { beta: 0.62, off: [0, 0.5, 0.25, 0.75], lift: 0.16, liftH: 0.12, bob: 0.006, bobN: 2, roll: 0.01, fold: 0.8, flick: 1 },
    stalk: { beta: 0.8, off: [0, 0.5, 0.25, 0.75], lift: 0.14, liftH: 0.1, bob: 0.003, bobN: 2, roll: 0.006, fold: 0.7, sink: 0.15 },
    trot: { beta: 0.44, off: [0, 0.5, 0.5, 0], lift: 0.12, liftH: 0.085, bob: 0.004, bobN: 2, roll: 0.005, fold: 0.75, flick: 1, pitchA: 0 },
    gallop: { beta: 0.3, off: [0, 0.1, 0.5, 0.6], lift: 0.3, liftH: 0.2, bob: 0.03, bobN: 1, pitchA: 0.1, roll: 0.01 }
  },
  key: 'fox', sc: 0.42, farW: true, farTop: 0.8, headAng: 0.35, pawFold: 0.35, wristFold: 1.25, tubeTop: 0.3, tubeTopH: 0.55,
  legW: { hl: [0.04, 0.042, 0.034, 0.016, 0.012, 0.01], hr: [0.04, 0.034, 0.021, 0.013, 0.012, 0.01], fl: [0.042, 0.027, 0.02, 0.013, 0.012, 0.01], fr: [0.042, 0.025, 0.023, 0.014, 0.012, 0.01] },
  J: { P0: [-0.19, -0.335], M: [0.0, -0.345], Wt: [0.16, -0.355], N0: [0.195, -0.345], Nm: [0.245, -0.405], N1: [0.295, -0.455], Ns: [0.42, -0.44],
    Hj: [-0.2, -0.3], St: [-0.145, -0.2], Hk: [-0.235, -0.115], HFt: [-0.215, -0.025], HHf: [-0.17, 0],
    Sp: [0.195, -0.29], El: [0.155, -0.2], Kn: [0.175, -0.075], FFt: [0.18, -0.025], FHf: [0.222, 0] },
  C: [[-0.255, -0.342, 'T'], [-0.284, -0.322, 'T'], [-0.3, -0.29, [0, 5]], [-0.299, -0.252, 'RB'], [-0.285, -0.214, [5, 6]], [-0.262, -0.183, [5, 6]], [-0.24, -0.166, [5, 6]], [-0.205, -0.178, 'HF'], [-0.158, -0.208, 'HF'], [-0.135, -0.238, 'FK'], [-0.1, -0.262, 'FK'],
    [-0.05, -0.262, 'BE'], [0.0, -0.245, 'BE'], [0.06, -0.205, [1, 9]], [0.12, -0.178, 'FU'], [0.143, -0.17, [9, 10]], [0.16, -0.158, [9, 10]], [0.195, -0.162, [9, 10]], [0.21, -0.19, 'FU'], [0.228, -0.24, 'CH'], [0.24, -0.28, 'CH'], [0.232, -0.31, 'CH'],
    [0.205, -0.335, 'T'], [0.18, -0.362, 'T'], [0.15, -0.378, 'T'], [0.08, -0.367, 'T'], [0.0, -0.373, 'T'], [-0.08, -0.371, 'T'], [-0.16, -0.36, 'T'], [-0.215, -0.35, 'T']],
  MS: [[0.17, -0.3, 0.05, 0.08, 0.04, -0.4], [0.17, -0.235, 0.075, 0.06, 0.04, 0], [0.04, -0.3, 0.13, 0.065, 0.045, 0], [-0.08, -0.33, 0.09, 0.04, 0.03, 0], [-0.2, -0.3, 0.1, 0.06, 0.04, 0.25],
    [-0.21, -0.22, 0.07, 0.07, 0.03, 0.3], [0.172, -0.13, 0.02, 0.06, 0.014, 0], [-0.222, -0.07, 0.012, 0.05, 0.01, 0]],
  BK: [[-0.27, -0.335], [-0.225, -0.347], [-0.16, -0.36], [-0.08, -0.371], [0.0, -0.373], [0.08, -0.367], [0.16, -0.376]], BL: [[-0.12, -0.255], [-0.05, -0.262], [0.0, -0.245], [0.06, -0.205], [0.12, -0.178]],
  hair: function (x, y, R) {
    if (y > -0.2 && (x < -0.13 || x > 0.13)) return Math.PI / 2 + (x < 0 ? 0.08 : -0.05);
    if (x > 0.2) return Math.PI / 2 - 0.4;
    var s = clamp((y - R.backY(x)) / Math.max(0.04, R.bellyY(x) - R.backY(x))); return Math.PI - 0.15 - 0.9 * s * s - (x < -0.2 ? 0.45 * s : 0);
  }
};
var FOXK = { coat: [194, 136, 74], back: [140, 96, 58], cream: [236, 222, 196], white: [246, 242, 232], blk: [34, 26, 24], stock: [118, 80, 52], stripe: [40, 30, 26], eye: [214, 160, 40], winter: [202, 146, 84] };   // ホンドギツネ: warm ochre-tan, a browner back
/* the fox's head, built in the round so it keeps its proportions as it turns: a few ellipsoids (the domed crown, the wide
   cheek ruff, the stop, the long slender muzzle tapering to the nose, the lower jaw and the small chin), each projected for the
   head's yaw and filled together as one shape; the ears, eyes, lips and tear lines are points on that solid, projected the same
   way. Head frame: origin at the poll, x forward along the face, y down, z out of the near side; yaw 0 profile .. 1 facing */
var FOXW = [   // the white: the upper lips (each side), the lower jaw, the chin, the lower cheeks, the throat
  [0.15, 0.011, 0.011, 0.026, 0.006, 0.006], [0.15, 0.011, -0.011, 0.026, 0.006, 0.006], [0.118, 0.01, 0.017, 0.03, 0.009, 0.008], [0.118, 0.01, -0.017, 0.03, 0.009, 0.008],
  [0.09, 0.022, 0, 0.055, 0.01, 0.019], [0.148, 0.015, 0, 0.026, 0.006, 0.01], [0.048, 0.019, 0.03, 0.037, 0.013, 0.03], [0.048, 0.019, -0.03, 0.037, 0.013, 0.03], [0.005, 0.03, 0, 0.034, 0.014, 0.036]
];
var FOXH = [   // [x, y, z, a (along x), h (y), w (z)]: the domed crown, the forehead down to the stop, the muzzle (its top line straight) to the nose; the cheeks (only a little wider), the jaw, the chin, the throat
  [0.02, -0.016, 0, 0.055, 0.042, 0.045], [0.06, -0.018, 0, 0.035, 0.03, 0.036], [0.098, -0.006, 0, 0.032, 0.027, 0.026], [0.128, -0.001, 0, 0.03, 0.02, 0.019], [0.152, 0.002, 0, 0.022, 0.0135, 0.014], [0.166, 0.003, 0, 0.01, 0.0105, 0.01],
  [0.03, 0.008, 0.03, 0.042, 0.021, 0.024], [0.03, 0.008, -0.03, 0.042, 0.021, 0.024], [0.09, 0.016, 0, 0.055, 0.013, 0.02], [0.147, 0.013, 0, 0.027, 0.008, 0.011], [-0.012, 0.02, 0, 0.034, 0.02, 0.04]
];
function pHull(P) {   // the convex hull of 2D points (monotone chain)
  var Q = P.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), lo = [], up = [], i;
  function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  for (i = 0; i < Q.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], Q[i]) <= 0) lo.pop(); lo.push(Q[i]); }
  for (i = Q.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], Q[i]) <= 0) up.pop(); up.push(Q[i]); }
  lo.pop(); up.pop(); return lo.concat(up);
}
function foxHead2(ctx, o, coat) {
  var C = FOXK, m = pLm(), lod = MODE === 'm' || RL.k < 160, yaw = clamp(o.yaw || 0), w0 = sstep(0, 1, yaw), psi = w0 * 1.52, cs = Math.cos(psi), sn = Math.sin(psi), pd = 0.5 * sn + (o.tilt || 0) * 0.7, cp = Math.cos(pd), sp = Math.sin(pd), t = o.t || 0, ear = o.ears || 0;
  function LW(a, px) { return Math.max(a, px / Math.max(1, RL.k)); }   // a fine line: so many metres, but never under so many device pixels
  var WH = RL.night ? mixc(C.white, [255, 214, 160], 0.45) : C.white;   // (at night the white stays a dim warm white, not blue-grey)
  // turned to the viewer the head also tips its nose down a little, so the muzzle runs down the middle of the face to the nose
  var RX = [cp * cs, -sp * cs, -sn], RY = [sp, cp, 0];
  function PJ(p) { return [RX[0] * p[0] + RX[1] * p[1] + RX[2] * p[2], RY[0] * p[0] + RY[1] * p[1]]; }
  function vis(n) { return (n[0] * cp - n[1] * sp) * sn + n[2] * cs; }   // how much a surface normal faces the viewer
  var ep = 0.15 * pd, ecp = Math.cos(ep), esp = Math.sin(ep);
  function PJE(p) { return [(p[0] * ecp - p[1] * esp) * cs - p[2] * sn, p[0] * esp + p[1] * ecp]; }
  ctx.save(); ctx.translate(-0.03 * sn, 0.01 * sn); ctx.scale(1 + 0.06 * sn, 1 + 0.06 * sn);   // turned to the viewer, the head sits back on the neck (the neck is not stretched)
  var ell = FOXH.map(function (e) {   // each ellipsoid's outline on the screen: the 2x2 of R diag(a2 h2 w2) R^T
    var d = [e[3] * e[3], e[4] * e[4], e[5] * e[5]], mxx = 0, mxy = 0, myy = 0; for (var i = 0; i < 3; i++) { mxx += RX[i] * RX[i] * d[i]; mxy += RX[i] * RY[i] * d[i]; myy += RY[i] * RY[i] * d[i]; }
    var tr = (mxx + myy) / 2, df = Math.sqrt(Math.max(0, (mxx - myy) * (mxx - myy) / 4 + mxy * mxy)), l1 = tr + df, l2 = Math.max(1e-8, tr - df), an = Math.abs(mxy) < 1e-12 ? (mxx >= myy ? 0 : Math.PI / 2) : Math.atan2(l1 - mxx, mxy);
    var c = PJ(e); return { x: c[0], y: c[1], r1: Math.sqrt(l1), r2: Math.sqrt(l2), an: an };
  });
  function earP(sd) {   // a broad-based triangle set wide on the crown, standing up and a little out, the tip a little rounded
    var fl = Math.sin(t * 1.6 + (sd > 0 ? 0 : 1)) * 0.004, eb = -ear * 0.02, fx = sd < 0 ? 0.016 * (1 - sn) : 0;   // (in profile the far ear shows a little ahead of the near one)
    var bF = [0.045 + fx, -0.046, 0.016 * sd], bK = [-0.03 + fx, -0.03, 0.066 * sd];
    var bc = [(bF[0] + bK[0]) / 2, (bF[1] + bK[1]) / 2, (bF[2] + bK[2]) / 2], ax = [(bF[0] - bK[0]) / 2, (bF[1] - bK[1]) / 2, (bF[2] - bK[2]) / 2], th = [-ax[2] * 0.3, 0, ax[0] * 0.3], ring = [], k0;
    for (k0 = 0; k0 < 12; k0++) { var aa = k0 / 12 * TAU, ca = Math.cos(aa), sa = Math.sin(aa); ring.push(PJE([bc[0] + ax[0] * ca + th[0] * sa, bc[1] + ax[1] * ca, bc[2] + ax[2] * ca + th[2] * sa])); }
    var bS = PJE(bc), lo = ring[0], hi = ring[0]; ring.forEach(function (q) { if (q[0] < lo[0]) lo = q; if (q[0] > hi[0]) hi = q; });
    // the tip: straight up over the base in the picture, leaning a little out (to its own side when facing, back in profile), never sideways
    var lean = (sd > 0 ? -1 : 1) * 0.014 * sn - 0.012 * (1 - sn), tq = [bS[0] + lean + eb * 0.5, bS[1] - 0.082 * lerp(1, 0.94, sn) + fl], pts = ring.slice();
    for (k0 = 0; k0 < 4; k0++) { var ua = 0.45 + k0 * 0.13; pts.push([lerp(lo[0], tq[0], ua), lerp(lo[1], tq[1], ua)], [lerp(hi[0], tq[0], ua), lerp(hi[1], tq[1], ua)]); }
    for (k0 = 0; k0 < 6; k0++) { var at = -Math.PI * (k0 / 5); pts.push([tq[0] + Math.cos(at) * 0.011, tq[1] + 0.011 + Math.sin(at) * 0.011]); }   // the rounded tip
    var p = pPath(pSmooth(pHull(pts), true, 3));
    var g = ctx.createLinearGradient(bS[0], bS[1], tq[0], tq[1]); g.addColorStop(0, zc(mixc(coat, C.blk, 0.35))); g.addColorStop(0.35, zc(mixc(coat, C.blk, 0.8))); g.addColorStop(1, zc(C.blk)); ctx.fillStyle = g; ctx.fill(p);
    var iv = clamp(vis([0.6, 0, 0.8 * sd]) * 1.2);   // the opening faces forward and out
    if (iv > 0.04) {
      var wI = 0.62 * (0.55 + 0.45 * iv), sh = (sd > 0 ? 1 : -1) * (1 - iv) * 0.25, il = [lerp(bS[0], lo[0], wI * (1 - sh)), lerp(bS[1], lo[1], wI) - 0.004], ih = [lerp(bS[0], hi[0], wI * (1 + sh)), lerp(bS[1], hi[1], wI) - 0.004], it = [lerp(bS[0], tq[0], 0.8), lerp(bS[1], tq[1], 0.8)];
      var ip = pPath(pSmooth([il, [lerp(il[0], it[0], 0.55) - 0.002, lerp(il[1], it[1], 0.55)], it, [lerp(ih[0], it[0], 0.55) + 0.002, lerp(ih[1], it[1], 0.55)], ih, [bS[0], bS[1] - 0.002]], true, 3));
      ctx.fillStyle = zc(mixc(C.cream, coat, 0.25), 0.92, 0.9 * iv); ctx.fill(ip);
      if (!lod) { ctx.save(); ctx.clip(ip); ctx.strokeStyle = zc(WH, 1, 0.7 * iv); ctx.lineWidth = m.w * 0.7; ctx.lineCap = 'round'; ctx.beginPath(); for (var k = 0; k < 7; k++) { var u = k / 6, a3 = [lerp(il[0], ih[0], u), lerp(il[1], ih[1], u)], b3 = [lerp(a3[0], it[0], 0.55), lerp(a3[1], it[1], 0.55) + 0.006]; ctx.moveTo(a3[0], a3[1]); ctx.quadraticCurveTo(lerp(a3[0], b3[0], 0.5) + 0.003, lerp(a3[1], b3[1], 0.5), b3[0], b3[1]); } ctx.stroke(); ctx.restore(); }   // the white tufts inside
    }
  }
  earP(-1);
  // the head as one shape
  // the head as one shape: the crown and muzzle as their ellipses; the cheeks, jaw, chin and throat as one convex hull, so the jaw's
  // underline is one clean curve from the chin to the throat
  var hp = new Path2D(), lowP = [];
  ell.forEach(function (e, i) { if (i < 6) { hp.ellipse(e.x, e.y, e.r1, e.r2, e.an, 0, TAU); return; } var c = Math.cos(e.an), s2 = Math.sin(e.an); for (var k = 0; k < 20; k++) { var a = k / 20 * TAU, px = Math.cos(a) * e.r1, py = Math.sin(a) * e.r2; lowP.push([e.x + px * c - py * s2, e.y + px * s2 + py * c]); } });
  pPath(pSmooth(pHull(lowP), true, 2), hp);
  if (!lod) qFuzz(ctx, hp, coat, WH, -0.06, 0.06, m.w * 1.1);   // a soft edge (the fill covers its inner half)
  var gh = ctx.createLinearGradient(0, -0.06, 0, 0.05); gh.addColorStop(0, zc(mixc(coat, [255, 236, 200], 0.12), 1.04)); gh.addColorStop(0.55, zc(coat, 0.96)); gh.addColorStop(1, zc(mixc(coat, [60, 46, 50], 0.2), 0.9)); ctx.fillStyle = gh; ctx.fill(hp);
  ctx.save(); ctx.clip(hp);
  // the white, painted on the head inside its outline: the upper lip, the lower jaw, the chin, the lower cheek and the throat, as
  // the projections of a few flatter ellipsoids lying on those parts (so facing, the lips are white either side of the orange bridge)
  var wl = FOXW.map(function (e) { var d = [e[3] * e[3], e[4] * e[4], e[5] * e[5]], mxx = 0, mxy = 0, myy = 0; for (var i = 0; i < 3; i++) { mxx += RX[i] * RX[i] * d[i]; mxy += RX[i] * RY[i] * d[i]; myy += RY[i] * RY[i] * d[i]; }
    var tr = (mxx + myy) / 2, df = Math.sqrt(Math.max(0, (mxx - myy) * (mxx - myy) / 4 + mxy * mxy)), l1 = tr + df, l2 = Math.max(1e-8, tr - df), an = Math.abs(mxy) < 1e-12 ? (mxx >= myy ? 0 : Math.PI / 2) : Math.atan2(l1 - mxx, mxy), c = PJ(e); return [c[0], c[1], Math.sqrt(l1), Math.sqrt(l2), an]; });
  // painted far to near, each part soft-edged, the orange crown and muzzle among them: facing, the muzzle (nearest) covers the jaw
  function dep(e) { return (e[0] * cp - e[1] * sp) * sn + e[2] * cs; }
  var parts = wl.map(function (e, i) { return { e: e, d: dep(FOXW[i]) + 0.0015, c: WH, k: 1 }; });
  [0, 1, 2, 3, 4, 5].forEach(function (i) { var e = ell[i]; parts.push({ e: [e.x, e.y, e.r1, e.r2, e.an], d: dep(FOXH[i]), c: i < 2 ? mixc(coat, [255, 236, 200], 0.06) : coat, k: i < 2 ? 1.0 : 0.96, org: true }); });
  parts.sort(function (a, b) { return a.d - b.d; });
  var M1 = ctx.getTransform();
  parts.forEach(function (q) {
    if (q.org && sn < 0.15) return;   // (in profile the orange parts need no repainting)
    var e = q.e; ctx.translate(e[0], e[1]); ctx.rotate(e[4]); ctx.scale(e[2], e[3]);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.08); g.addColorStop(0, zc(q.c, q.k, 1)); g.addColorStop(0.72, zc(q.c, q.k, q.org ? 1 : 0.95)); g.addColorStop(1, zc(q.c, q.k, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1.08, 0, TAU); ctx.fill(); ctx.setTransform(M1);
  });
  [1, -1].forEach(function (sd) { var v = vis([0.3, 0.1, sd]); if (v > -0.2) { var ws = PJ([0.138, 0.007, 0.013 * sd]); zsoft(ctx, ws[0], ws[1], 0.009, 0.005, mixc(C.blk, coat, 0.4), 0.45 * clamp(v + 0.4)); } });   // the dark whisker spot
  var br = PJ([0.105, -0.026, 0]), br2 = PJ([0.15, -0.012, 0]); zsoft(ctx, br[0], br[1], 0.032, 0.011, mixc(coat, C.back, 0.55), 0.45, 1, Math.atan2(br2[1] - br[1], br2[0] - br[0]));   // the darker bridge of the muzzle
  var cr = PJ([0.02, -0.048, 0]); zsoft(ctx, cr[0], cr[1], 0.04, 0.014, mixc(coat, [255, 232, 190], 0.2), 0.4);
  ctx.restore();
  // the mouth: a thin dark line from under the nose, curving up at the back (a closed smile)
  [1, -1].forEach(function (sd) {
    var v = vis([0.2, 0.2, sd]); if (v < -0.1) return;
    var L3 = [[0.166, 0.011, 0.004 * sd], [0.148, 0.013, 0.01 * sd], [0.128, 0.014, 0.015 * sd], [0.113, 0.012, 0.017 * sd], [0.105, 0.007, 0.018 * sd]].map(PJ);
    ctx.strokeStyle = zc(C.blk, 1, 0.75 * clamp(v + 0.3) * (1 - 0.4 * sn)); ctx.lineWidth = LW(0.0013, 0.8); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(L3[0][0], L3[0][1]); for (var k = 1; k < L3.length; k++) ctx.lineTo(L3[k][0], L3[k][1]); ctx.stroke();
  });
  // the eyes: slanted almonds at the stop, about 40% back from the nose; an amber iris, the dark vertical pupil, a dark rim, the tear line
  var bl = o.blink === undefined ? 1 : o.blink;
  [-1, 1].forEach(function (sd) {
    var v = vis([0.55, -0.1, 0.83 * sd]), ev = clamp((v + 0.1) / 0.35); if (ev <= 0.02) return;
    var Ec = [0.086, -0.026, 0.023 * sd], F = PJ([Ec[0] + 0.0075, Ec[1] + 0.003, Ec[2] - 0.005 * sd]), K = PJ([Ec[0] - 0.0075, Ec[1] - 0.0055, Ec[2] + 0.006 * sd]), Mq = [(F[0] + K[0]) / 2, (F[1] + K[1]) / 2];
    var ux = K[0] - F[0], uy = K[1] - F[1], ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul; if (ny > 0) { nx = -nx; ny = -ny; }
    var hh = 0.0052 * (0.55 + 0.45 * ev) * Math.max(0.12, bl);
    var tl = PJ([0.113, 0.003, 0.016 * sd]); ctx.strokeStyle = zc(mixc(C.blk, coat, 0.25), 1, 0.4 * ev); ctx.lineWidth = LW(0.0018, 0.9); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(F[0], F[1]); ctx.quadraticCurveTo(lerp(F[0], tl[0], 0.5) - nx * 0.002, lerp(F[1], tl[1], 0.5) - ny * 0.002, tl[0], tl[1]); ctx.stroke();
    var ep = new Path2D(); ep.moveTo(F[0], F[1]); ep.quadraticCurveTo(Mq[0] + nx * hh * 2, Mq[1] + ny * hh * 2, K[0], K[1]); ep.quadraticCurveTo(Mq[0] - nx * hh * 1.4, Mq[1] - ny * hh * 1.4, F[0], F[1]); ep.closePath();
    ctx.fillStyle = 'rgb(24,16,12)'; ctx.fill(ep);
    if (bl > 0.25) {
      ctx.save(); ctx.clip(ep); var ic = [Mq[0] + nx * hh * 0.1, Mq[1] + ny * hh * 0.1], ir = Math.max(hh * 1.5, ul * 0.42), gi = ctx.createRadialGradient(ic[0], ic[1] - ir * 0.3, 0, ic[0], ic[1], ir * 1.2);
      gi.addColorStop(0, zc(mixc(C.eye, [255, 230, 120], 0.35))); gi.addColorStop(0.7, zc(C.eye)); gi.addColorStop(1, zc(scl(C.eye, 0.6))); ctx.fillStyle = gi; ctx.beginPath(); ctx.ellipse(ic[0], ic[1], ir * 1.1, ir * 0.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgb(10,8,8)'; ctx.beginPath(); ctx.ellipse(ic[0], ic[1], ir * 0.26 * (0.6 + 0.4 * ev), ir * 0.8, 0, 0, TAU); ctx.fill();   // the vertical pupil
      var lid = ctx.createLinearGradient(Mq[0] + nx * hh, Mq[1] + ny * hh, Mq[0], Mq[1]); lid.addColorStop(0, 'rgba(20,12,10,0.35)'); lid.addColorStop(1, 'rgba(20,12,10,0)'); ctx.fillStyle = lid; ctx.fill(ep);   // the shadow of the upper lid
      ctx.fillStyle = RL.night ? 'rgba(220,230,255,0.5)' : 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(ic[0] + ir * 0.3, ic[1] - ir * 0.15, ir * 0.18, 0, TAU); ctx.fill(); ctx.restore();
      if (o.shine) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,230,140,' + (0.6 * o.shine * ev) + ')'; ctx.fill(ep); ctx.globalCompositeOperation = 'source-over'; }
    }
    ctx.strokeStyle = 'rgba(14,10,8,0.9)'; ctx.lineWidth = LW(0.0011, 0.7); ctx.stroke(ep);   // the dark rim
  });
  // the nose pad at the tip, with its nostrils
  var np = PJ([0.17, 0.001, 0]), nw = Math.sqrt(0.008 * 0.008 * cs * cs + 0.009 * 0.009 * sn * sn), nh = lerp(0.008, 0.0065, sn);
  ctx.fillStyle = 'rgb(22,18,18)'; ctx.beginPath(); ctx.ellipse(np[0], np[1], nw, nh, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(120,110,110,0.45)'; ctx.beginPath(); ctx.ellipse(np[0] - 0.002 * cs, np[1] - nh * 0.45, nw * 0.5, nh * 0.3, 0, 0, TAU); ctx.fill();
  if (sn > 0.4) { ctx.fillStyle = 'rgb(6,4,4)'; [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(np[0] + sd * nw * 0.42, np[1] + nh * 0.2, nw * 0.2, nh * 0.26, 0, 0, TAU); ctx.fill(); }); }
  earP(1);
  ctx.restore();
}
function foxTail(ctx, R, B, o, coat, fl) {   // the brush: from the root, curving down and out, full in the middle, white at the tip
  var C = FOXK, m = pLm(), t = o.t || 0, root = qP2(R, B, -0.275, -0.335), ta = (o.tailA === undefined ? -0.85 : o.tailA) + Math.sin(t * 1.7) * 0.05 + (o.swish ? Math.sin(t * 6) * 0.15 * o.swish : 0);
  var base = B[0].th + Math.PI, pts = [root], L = 0.4, hang = clamp((-ta - 0.5) / 0.4), sw = o.sway || 0;   // ta: 0 straight out behind, -1 hanging down, + raised
  var a = base + ta * 0.9 + 0.18 * (1 - hang), dA = lerp(-0.13, 0.08, hang);   // carried out: it leaves the root a little up and droops along its length; hanging: the tip curls up a little
  for (var i = 1; i <= 5; i++) { if (i > 1) a += dA + Math.sin(t * 2.6 - i * 0.7) * 0.05 * sw; var pv = pts[i - 1]; pts.push([pv[0] + Math.cos(a) * L / 5, pv[1] + Math.sin(a) * L / 5]); }
  var wl = [0.028, 0.055, 0.074, 0.076, 0.058, 0.012].map(function (v) { return v * fl; }), wr = [0.026, 0.052, 0.07, 0.072, 0.055, 0.011].map(function (v) { return v * fl; });
  var lb = pLimb(pts, wl, wr, 5), p = pPath(lb.out), e0 = lb.at(0, 0), e1 = lb.at(1, 0);
  var g = ctx.createLinearGradient(e0[0], e0[1], e1[0], e1[1]); g.addColorStop(0, zc(coat, 0.95)); g.addColorStop(0.7, zc(coat, 0.85)); g.addColorStop(0.82, zc(mixc(coat, C.blk, 0.4), 0.8)); g.addColorStop(0.88, zc(C.white, 0.95)); g.addColorStop(1, zc(C.white, 1));
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p); var tq = lb.at(0.35, -0.6); zsoft(ctx, tq[0], tq[1], 0.12, 0.03, C.back, 0.7, 1, Math.atan2(e1[1] - e0[1], e1[0] - e0[0])); var td = lb.at(0.12, -0.4); zsoft(ctx, td[0], td[1], 0.03, 0.02, C.blk, 0.6);   // darker along the top; the dark spot near the root
  var bq = lb.at(0.5, 0.6); zsoft(ctx, bq[0], bq[1], 0.12, 0.03, mixc(coat, [60, 46, 52], 0.4), 0.45, 1, Math.atan2(e1[1] - e0[1], e1[0] - e0[0]));
  if (MODE !== 'm') { var set = pSet({ c: qSoft(coat), w: qSoft(C.white) }), n = pCount(lb.len * 0.11, 260), Rr = pRand('foxtail', Math.max(1, n)); for (var k = 0; k < n; k++) { var u = Rr[k * 4], v = Rr[k * 4 + 1] * 2 - 1, q = lb.at(u, v); pStroke(set, u > 0.87 ? 'w' : 'c', pTi(0.55 - v * 0.2 * RL.lx, (Rr[k * 4 + 2] - 0.5)), q[0], q[1], q[2] + (v > 0 ? 0.4 : -0.4) + (Rr[k * 4 + 3] - 0.5) * 0.4, m.l * 0.9); } ctx.globalAlpha = 0.5; pSetFlush(ctx, set, m.w * 0.8); ctx.globalAlpha = 1; }
  ctx.restore();
  return lb;
}
function foxPaint2(ctx, o) {
  var R = qRig(FOXS), C = FOXK, m, wn = o.winter ? 1 : 0, fl = 1 + wn * 0.12;
  RL.k = pScale(ctx); m = pLm();
  var coat = mixc(C.coat, C.winter, wn), W2 = RL.night ? mixc(C.white, [255, 214, 160], 0.45) : C.white, bel = RL.night ? mixc(C.cream, [255, 214, 160], 0.35) : C.cream;   // (at night the whites a dim warm white, as on the head)
  // the head's carriage from the old parameters: pitch (down +) and yaw
  var hd = o.head || {}, pitch = hd.pitch === undefined ? 0.12 : hd.pitch;
  var SX = 0.9;   // the body drawn 10% shorter than the rig (the head is not): stride scaled back so the feet keep to the ground
  var pose = { ph: o.ph, amp: o.amp, gait: o.gait === 'trot' ? 'trot' : o.gait, stride: (o.stride || 0.85) / SX, lift: o.lift || 0, arch: o.arch || 0, tuck: o.tuck, crouch: o.crouch || 0, head: { neck: R.B0[2].th + (hd.neck !== undefined ? hd.neck : pitch * 0.55), ang: hd.ang !== undefined ? hd.ang : 0.3 + pitch * 0.9, bend: pitch * 0.15 } };
  var Po = qPose(R, pose), B = Po.B, B0 = R.B0;
  ctx.save(); var M0 = ctx.getTransform(); ctx.scale(SX, 1);
  qContact(ctx, R, Po, 0.05);
  var stockP = [coat, C.stock, mixc(C.stock, C.blk, 0.5)];
  var fh = qFarLeg(ctx, R, Po.farH, true, [0.04, 0.032, 0.02, 0.013, 0.012, 0.011], [0.036, 0.028, 0.018, 0.012, 0.011, 0.01], [coat, C.stock, mixc(C.stock, C.blk, 0.5)], 'foxfh');
  var ff = qFarLeg(ctx, R, Po.farF, false, [0.03, 0.028, 0.017, 0.013, 0.012, 0.011], [0.026, 0.025, 0.016, 0.012, 0.011, 0.01], stockP, 'foxff');
  void fh; void ff;
  var tail = foxTail(ctx, R, B, o, coat, fl);
  // the one silhouette: body and near legs (skinned), the neck tube
  var out0 = pSmooth(R.ctrl.map(function (c) { return sikaPt(B, c.L, null, B0); }), true, 5), out = pWind(out0, true), oRev = out !== out0;
  function restOf(ii) { var k = oRev ? out.length - 1 - ii : ii, c = R.ctrl[Math.min(R.ctrl.length - 1, Math.floor(k / 5))]; return c; }   // the rest-pose control point an outline point came from
  var tho = B[1], b1 = B0[1];
  function TG(p) { var c0 = Math.cos(-b1.th), s0 = Math.sin(-b1.th), dx = p[0] - b1.a[0], dy = p[1] - b1.a[1], lx = dx * c0 - dy * s0, ly = dx * s0 + dy * c0, c = Math.cos(tho.th), s2 = Math.sin(tho.th); return [tho.a[0] + lx * c - ly * s2, tho.a[1] + lx * s2 + ly * c]; }
  function off(b, k) { return [b.a[0] - Math.sin(b.th) * k, b.a[1] + Math.cos(b.th) * k]; }
  var nk = pLimb([TG([0.11, -0.32]), TG([0.18, -0.325]), off(B[2], 0.022), off(B[3], 0.016), off(B[4], 0.008)], [0.055, 0.066, 0.068 * fl, 0.064 * fl, 0.058], [0.045, 0.056, 0.056 * fl, 0.052 * fl, 0.046], 6), nOut = pWind(nk.out, true);   // a thick furry column, as wide as the back of the head
  var hl = qLegTube(R, [B[5], B[6], B[7], B[8]], true), flg = qLegTube(R, [B[9], B[10], B[11], B[12]], false), hOut = pWind(hl.out, true), fOut = pWind(flg.out, true);
  var path = new Path2D(); pPath(out, path); pPath(nOut, path); pPath(hOut, path); pPath(fOut, path);
  var bodyLegs = new Path2D(); pPath(out, bodyLegs); pPath(hOut, bodyLegs); pPath(fOut, bodyLegs);
  var P2 = function (x, y) { return qP2(R, B, x, y); }, lit = 0.5 + 0.5 * clamp(-pL()[1]);
  if (MODE !== 'm') qFuzz(ctx, path, coat, C.stock, P2(0, -0.38)[1], 0, m.w * 1.1);
  ctx.save(); ctx.clip(path);
  var top = P2(0, -0.37), bot = P2(0, -0.22), g1 = ctx.createLinearGradient(top[0], top[1] - 0.01, bot[0], bot[1] + 0.02);
  g1.addColorStop(0, zc(C.back, 1.0)); g1.addColorStop(0.3, zc(mixc(C.back, coat, 0.5), 1)); g1.addColorStop(0.5, zc(coat, 1)); g1.addColorStop(0.8, zc(mixc(coat, [70, 50, 60], 0.25), 0.88)); g1.addColorStop(1, zc(mixc(coat, [70, 50, 60], 0.3), 0.84));
  ctx.fillStyle = g1; ctx.fill(path);
  var hiC = mixc(coat, [255, 236, 200], 0.3), loC = mixc(coat, [40, 30, 44], 0.55);
  function blob(x, y, rx, ry, c, a, rot) { var q = P2(x, y); zsoft(ctx, q[0], q[1], rx, ry, c, a, 1, rot || 0); }
  blob(-0.17, -0.335, 0.12, 0.035, hiC, 0.35 * lit, -0.08); blob(0.02, -0.35, 0.14, 0.03, hiC, 0.35 * lit); blob(0.16, -0.32, 0.035, 0.06, hiC, 0.4 * lit, -0.4);   // light along the back and over the croup (no round highlight on the thigh)
  blob(0.1, -0.26, 0.025, 0.07, loC, 0.4); blob(-0.11, -0.27, 0.05, 0.06, loC, 0.18, -0.3); blob(-0.04, -0.245, 0.11, 0.03, loC, 0.35); blob(-0.2, -0.2, 0.05, 0.06, loC, 0.2, 0.4);   // behind the elbow (the deep chest), a soft flank, the tucked waist
  blob(-0.01, -0.24, 0.12, 0.028, bel, 0.65); blob(0.2, -0.27, 0.05, 0.08, C.white, 0.75); blob(0.19, -0.22, 0.035, 0.04, mixc(C.white, coat, 0.3), 0.5);   // pale belly, the white chest, blended soft into the orange
  // the legs: the coat's own colour darkening toward the paws, with the thin black stripe down the front of each (細い黒斑)
  var sT = P2(0, -0.15), g2 = ctx.createLinearGradient(0, sT[1], 0, 0); g2.addColorStop(0, zc(C.stock, 1, 0)); g2.addColorStop(0.5, zc(C.stock, 1, 0.5)); g2.addColorStop(1, zc(mixc(C.stock, C.blk, 0.4), 0.9, 0.9)); ctx.fillStyle = g2; ctx.fill(bodyLegs);
  // the neck: the white throat on its lower side, the crest a little darker
  var nA = Math.atan2(nk.at(1, 0)[1] - nk.at(0.2, 0)[1], nk.at(1, 0)[0] - nk.at(0.2, 0)[0]);
  // a rounded column: lit along the crest, turning into shadow toward the throat; the white bib a soft-edged band down the front
  var nc0 = nk.at(0.6, -1), nc1 = nk.at(0.6, 1), gN = ctx.createLinearGradient(nc0[0], nc0[1], nc1[0], nc1[1]); gN.addColorStop(0, zc(mixc(C.back, coat, 0.5), 1.0)); gN.addColorStop(0.3, zc(coat, 1.04)); gN.addColorStop(0.65, zc(mixc(coat, [60, 46, 56], 0.25), 0.88)); gN.addColorStop(1, zc(mixc(coat, [60, 46, 56], 0.3), 0.82));
  ctx.fillStyle = gN; ctx.fill(pPath(nOut));
  [0.25, 0.45, 0.65, 0.85, 1.0].forEach(function (u) { var a1 = nk.at(u, 0.62); zsoft(ctx, a1[0], a1[1], 0.055, 0.03, W2, 0.85, 1, nA); });
  if (MODE !== 'm') {
    var n = pCount(R.area, 900), S = qSamples(R, n), set = pSet({ coat: qSoft(coat), bel: qSoft(bel), st: qSoft(C.stock), bib: qSoft(W2) });
    for (var i = 0; i < n; i++) {
      var sm = S[i], x0 = sm.x, y0 = sm.y, q = sikaPt(B, sm.L, null, B0), turn = rigTurn(B, B0, sm.L), cls = 'coat';
      if (y0 > -0.16 && (x0 > 0.13 || x0 < -0.14)) cls = 'st'; else if ((y0 > R.bellyY(x0) - 0.02 && x0 > -0.12 && x0 < 0.13) || (x0 > 0.2 && y0 > -0.32)) cls = 'bel';
      pStroke(set, cls, pTi(pTone(sm.nr[0], sm.nr[1], sm.nr[2], sm.nr[3], -turn * 0.6), pMot(x0, y0, 3) * 0.6 + (sm.r2 - 0.5) * 0.5), q[0], q[1], sm.ha + turn + (sm.r1 - 0.5) * 0.35, m.l * (0.6 + sm.r2 * 0.45) * (cls === 'st' ? 0.6 : 1) * fl);
    }
    [[hl, 'foxhl'], [flg, 'foxfl']].forEach(function (L3) { var lb = L3[0], nl = pCount(lb.len * 0.035, 200), LR = pRand(L3[1], nl); for (var k3 = 0; k3 < nl; k3++) { var u3 = 0.15 + LR[k3 * 4] * 0.85, v3 = LR[k3 * 4 + 1] * 2 - 1, q3 = lb.at(u3, v3), nm3 = q3[3], e3 = lb.at(u3, 0), cl3 = e3[1] > P2(0, -0.17)[1] ? 'st' : 'coat'; pStroke(set, cl3, pTi(pTone(nm3[0] * v3, nm3[1] * v3, Math.sqrt(Math.max(0, 1 - v3 * v3)), 0), (LR[k3 * 4 + 2] - 0.5) * 0.8), q3[0], q3[1], q3[2] + (LR[k3 * 4 + 3] - 0.5) * 0.3, m.l * 0.6); } });
    var nn = pCount(nk.len * 0.1, 260), NR = pRand('foxneck', Math.max(1, nn));
    for (i = 0; i < nn; i++) { var u = 0.15 + NR[i * 4] * 0.85, v = NR[i * 4 + 1] * 2 - 1, qn = nk.at(u, v), nm = qn[3]; pCurve(set, v > 0.35 ? 'bib' : 'coat', pTi(pTone(nm[0] * v, nm[1] * v, Math.sqrt(Math.max(0, 1 - v * v)), 0) * 0.6 + 0.2, (NR[i * 4 + 2] - 0.5) * 0.5), qn[0], qn[1], qn[2] + Math.PI + (NR[i * 4 + 3] - 0.5) * 0.35, m.l * 0.55 * fl, 0.15 + v * 0.1); }   // soft locks flowing down from the head
    ctx.globalAlpha = 0.55; pSetFlush(ctx, set, m.w * 0.8); ctx.globalAlpha = 1;
  }
  [[flg, 0.62, 0.95], [hl, 0.68, 0.97]].forEach(function (q) { var lb = q[0], sp = new Path2D(), side = q === undefined ? 1 : -1; for (var k = 0; k <= 10; k++) { var u = lerp(q[1] - (lb === flg ? 0.3 : 0.08), q[2], k / 10), pt = lb.at(u, lb === flg ? -0.6 : -0.55); if (k) sp.lineTo(pt[0], pt[1]); else sp.moveTo(pt[0], pt[1]); } ctx.strokeStyle = zc(C.stripe, 1, 0.8); ctx.lineWidth = Math.max(0.006, m.w * 0.9); ctx.lineCap = 'round'; ctx.stroke(sp); void side; });
  ctx.restore();
  // the edge: soft hair under the belly, the white chest and throat, the back of the thighs; rim light along the top
  var half = nOut.length / 2, rev = nk.out !== nOut;
  if (MODE !== 'm') qEdge(ctx, [out, nOut, hOut, fOut], function (oi, ii, a0, nx, ny) {
    if (oi > 1) return null;
    if (oi === 1) return null;
    return null;
  }, { w: qSoft(C.white), b: qSoft(bel), c: qSoft(coat) });
  if (MODE !== 'm') qFuzz(ctx, pPath(tail.out), coat, coat, 0, 0, m.w * 1.3);
  // paws
  [[B[8], 8], [B[12], 12]].forEach(function (q) { var e = qEnd(q[0], B0[q[1]].len), a = q[0].a; ctx.fillStyle = zc(C.blk, 0.9); ctx.beginPath(); ctx.ellipse(lerp(a[0], e[0], 0.6), lerp(a[1], e[1], 0.6) - 0.004, 0.026, 0.012, q[0].th, 0, TAU); ctx.fill(); });
  // the head
  var hb = B[4], nE = nk.at(1, -0.6);
  // turned to the viewer, the head's tilt is no longer a turn in the picture (that would roll it sideways): it goes into the head's own nose-down pitch
  var hth = Math.atan2(Math.sin(hb.th), Math.cos(hb.th) * SX), hsn = Math.sin(sstep(0, 1, clamp(hd.yaw || 0)) * 1.52);
  ctx.save(); ctx.setTransform(M0); ctx.translate(lerp(hb.a[0], nE[0], 0.5) * SX, lerp(hb.a[1], nE[1], 0.5)); ctx.rotate(hth * (1 - hsn)); ctx.scale(fl * 0.97, fl * 0.97);
  foxHead2(ctx, { yaw: hd.yaw, ears: o.ears, t: o.t, blink: o.blink, shine: o.shine, tilt: hth * hsn }, coat);
  ctx.restore();
  ctx.restore();
}

/* ---- the raccoon dog (ホンドタヌキ), drawn as one painted animal: about 25 cm at the shoulder, body 55 cm, round and low in a
   long grizzled coat. Dark legs and chest, a dark band over the shoulders, the black mask across the eyes and cheeks with a
   pale brow and muzzle above it, small rounded ears rimmed dark, a short bushy tail dark along the top ---- */
var TANS = {
  /* the tanuki's own gaits: an ambling, rolling waddle on short legs (the body rocks to the side of the foot that is down: one
     roll per stride), and when it must hurry, a scuttling trot of quick short steps */
  G: {
    walk: { beta: 0.68, off: [0, 0.5, 0.25, 0.75], lift: 0.18, liftH: 0.11, bob: 0.01, bobN: 1, roll: 0.045, rollN: 1, fold: 0.55 },
    trot: { beta: 0.45, off: [0, 0.5, 0.5, 0], lift: 0.2, liftH: 0.12, bob: 0.008, bobN: 2, roll: 0.03, rollN: 1, fold: 0.6, flick: 1, pitchA: 0 }
  },
  key: 'tan', sc: 0.3, headAng: 0.3, pawFold: 0.3, wristFold: 0.9, tubeTop: 0.25,
  legW: { hl: [0.062, 0.052, 0.042, 0.024, 0.019, 0.017], hr: [0.062, 0.042, 0.032, 0.021, 0.018, 0.016], fl: [0.046, 0.036, 0.03, 0.021, 0.018, 0.016], fr: [0.046, 0.034, 0.032, 0.021, 0.018, 0.016] },
  J: { P0: [-0.15, -0.26], M: [0.0, -0.27], Wt: [0.13, -0.27], N0: [0.15, -0.27], Nm: [0.195, -0.3], N1: [0.24, -0.32], Ns: [0.35, -0.3],
    Hj: [-0.15, -0.21], St: [-0.1, -0.13], Hk: [-0.175, -0.07], HFt: [-0.168, -0.02], HHf: [-0.132, 0],
    Sp: [0.14, -0.2], El: [0.112, -0.13], Kn: [0.128, -0.05], FFt: [0.134, -0.02], FHf: [0.166, 0] },
  C: [[-0.235, -0.315, 'T'], [-0.27, -0.29, 'T'], [-0.292, -0.25, [0, 5]], [-0.292, -0.2, 'RB'], [-0.272, -0.15, [5, 6]], [-0.235, -0.12, [5, 6]], [-0.16, -0.11, 'HF'], [-0.1, -0.112, 'HF'], [-0.07, -0.1, 'FK'],
    [-0.02, -0.088, 'BE'], [0.04, -0.088, 'BE'], [0.08, -0.095, [1, 9]], [0.094, -0.1, 'FU'], [0.103, -0.085, [9, 10]], [0.12, -0.08, [9, 10]], [0.155, -0.085, [9, 10]], [0.17, -0.13, 'FU'], [0.19, -0.17, 'CH'], [0.2, -0.21, 'CH'], [0.195, -0.245, 'CH'],
    [0.18, -0.275, 'T'], [0.155, -0.3, 'T'], [0.12, -0.322, 'T'], [0.05, -0.336, 'T'], [-0.03, -0.342, 'T'], [-0.11, -0.34, 'T'], [-0.18, -0.332, 'T']],
  MS: [[0.12, -0.22, 0.05, 0.07, 0.035, -0.3], [0.0, -0.23, 0.15, 0.1, 0.07, 0], [-0.19, -0.22, 0.09, 0.08, 0.05, 0.2], [-0.17, -0.12, 0.04, 0.05, 0.025, 0.3], [0.13, -0.09, 0.02, 0.05, 0.012, 0]],
  BK: [[-0.24, -0.31], [-0.15, -0.335], [-0.03, -0.342], [0.07, -0.333], [0.15, -0.3]], BL: [[-0.07, -0.1], [0.0, -0.088], [0.09, -0.095]],
  hair: function (x, y, R) {
    if (y > -0.12 && (x < -0.1 || x > 0.09)) return Math.PI / 2 + (x < 0 ? 0.1 : -0.05);
    if (x > 0.16) return Math.PI / 2 - 0.5;
    var s = clamp((y - R.backY(x)) / Math.max(0.04, R.bellyY(x) - R.backY(x))); return Math.PI - 0.25 - 1.0 * s * s - (x < -0.17 ? 0.5 * s : 0);
  }
};
var TANK = { coat: [112, 92, 70], back: [80, 66, 52], frost: [176, 162, 138], dark: [34, 28, 25], face: [176, 166, 146], ruff: [168, 152, 126], eye: [120, 84, 40] };
function tanukiHead2(ctx, o, coat, C) {   // head frame: origin at the poll, x along the face to the nose
  C = C || TANK; var m = pLm(), lod = MODE === 'm' || RL.k < 160, yaw = clamp(o.yaw || 0), ml = 0.1 * (1 - 0.4 * yaw), t = o.t || 0, sn = Math.sin(t * 14) * (o.sniff || 0) * 0.003;
  function earP(far) {   // small, rounded and furry, set low and wide in the ruff: dark-edged, the fur paler toward the base, no hollow showing
    var dx = far ? 0.034 + yaw * 0.02 : -0.012, b = [dx, -0.03], E = pSmooth([[b[0] - 0.019, b[1] + 0.006], [b[0] - 0.021, b[1] - 0.017], [b[0] - 0.006, b[1] - 0.031], [b[0] + 0.011, b[1] - 0.021], [b[0] + 0.015, b[1] + 0.004]], true, 4), p = pPath(E);
    var g = ctx.createLinearGradient(b[0], b[1] + 0.006, b[0] - 0.006, b[1] - 0.031); g.addColorStop(0, zc(mixc(coat, C.ruff, 0.3), far ? 0.75 : 0.95)); g.addColorStop(0.55, zc(mixc(coat, C.dark, 0.45), far ? 0.75 : 0.9)); g.addColorStop(1, zc(C.dark, far ? 0.8 : 1)); ctx.fillStyle = g; ctx.fill(p);
    if (!lod) qFuzz(ctx, p, mixc(coat, C.dark, 0.5), C.dark, b[1] - 0.03, b[1], m.w * 0.9);
  }
  earP(true);
  // the cheek ruff behind the face, then the face
  var ruff = pSmooth([[-0.075, -0.015], [-0.062, -0.052], [-0.005, -0.056], [0.036, -0.032], [0.05, 0.04], [0.012, 0.09], [-0.05, 0.086], [-0.098, 0.04]], true, 5), rp = pPath(ruff);   // the cheeks puffed out in a pale ruff, standing out from the face and the darker neck
  ctx.fillStyle = zgrad2(ctx, 0, -0.05, 0, 0.09, mixc(C.ruff, coat, 0.15), mixc(C.ruff, C.dark, 0.3), RL.hi, 0.92); ctx.fill(rp);
  ctx.save(); ctx.clip(rp); zsoft(ctx, -0.035, 0.05, 0.04, 0.025, mixc(C.ruff, C.dark, 0.5), 0.5); ctx.restore();
  var d = pSmooth([[-0.035, -0.022], [-0.012, -0.05], [0.028, -0.048], [0.058, -0.03], [ml + 0.004, -0.009 + sn], [ml + 0.012, 0.006 + sn], [ml - 0.01, 0.02], [0.042, 0.034], [0.002, 0.04], [-0.03, 0.026]], true, 5), hp = pPath(d);
  ctx.fillStyle = zgrad2(ctx, 0, -0.05, 0, 0.04, C.face, mixc(C.face, coat, 0.4), RL.hi, 0.9); ctx.fill(hp);
  ctx.save(); ctx.clip(hp);
  zsoft(ctx, 0.04, -0.036, 0.045, 0.013, mixc(C.face, [230, 222, 204], 0.4), 0.75); zsoft(ctx, ml - 0.014, -0.008 + sn, 0.03, 0.012, mixc(C.face, [222, 212, 192], 0.35), 0.75);   // the pale brow, the pale top of the muzzle
  zsoft(ctx, -0.02, -0.03, 0.03, 0.02, coat, 0.8);
  ctx.restore();
  // the mask: the dark band through the eye and down over the cheek into the ruff, softly edged, against the pale brow and muzzle
  var mx = -yaw * 0.008, MK = [[ml - 0.022, 0.0], [0.064, -0.014], [0.046, -0.018], [0.03, -0.012], [0.008, 0.006], [-0.016, 0.034], [-0.004, 0.05], [0.016, 0.038], [0.04, 0.022], [ml - 0.024, 0.012]].map(function (q) { return [q[0] + mx, q[1]]; });
  var mcx = 0, mcy = 0; MK.forEach(function (q) { mcx += q[0] / MK.length; mcy += q[1] / MK.length; });
  var fr2 = new Path2D(); fr2.addPath(hp); fr2.addPath(rp);
  ctx.save(); ctx.clip(fr2);
  [1.12, 1.0, 0.86, 0.7].forEach(function (k, i) {   // nested, each a little smaller: dense in the middle, softening out to the edge (no outline)
    ctx.fillStyle = zc(C.dark, 1, [0.25, 0.4, 0.55, 0.7][i]); ctx.fill(pPath(pSmooth(MK.map(function (q) { return [mcx + (q[0] - mcx) * k, mcy + (q[1] - mcy) * k]; }), true, 5)));
  });
  zsoft(ctx, ml - 0.02, 0.016, 0.028, 0.009, mixc(C.dark, coat, 0.25), 0.7);   // the dark lower muzzle and lips
  ctx.restore();
  if (!lod) {   // the shaggy edge of the ruff
    qFuzz(ctx, rp, C.ruff, mixc(C.ruff, C.dark, 0.4), -0.05, 0.08, m.w * 1.4); tanWisps(ctx, [ruff], function (x, y, nx) { return nx > 0.6 ? 0 : 1; }, [mixc(C.ruff, [236, 226, 204], 0.3), C.ruff, mixc(C.ruff, C.dark, 0.3)], m, 17);
  }
  var bl = o.blink === undefined ? 1 : o.blink, ex = 0.045 + ml * 0.05;
  zeye(ctx, ex, -0.008, 0.0085, C.eye, bl, false);
  if (yaw > 0.35) zeye(ctx, ex + 0.03, -0.01, 0.007 * yaw, C.eye, bl, false);
  if (o.shine && bl > 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(230,210,150,' + (0.65 * o.shine) + ')'; ctx.beginPath(); ctx.arc(ex, -0.008, 0.011, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.fillStyle = 'rgb(20,16,16)'; ctx.beginPath(); ctx.ellipse(ml + 0.009, 0.0 + sn, 0.012, 0.01, 0, 0, TAU); ctx.fill();
  earP(false);
}
/* the long soft coat at the edge: wispy clumps (tapered, curving, lying back toward the tail and drooping), irregular in size and
   spacing, thick where the coat is longest (the cheek ruff, the shoulders, the belly, the tail) and sparse elsewhere, where
   only the soft edge shows. wt(x, y, nx, ny, outline index) gives how thick the clumps are there (0 none) */
function tanWisps(ctx, outs, wt, cols, m, seed) {
  // each lock is a few fine curved hairs that start inside the outline and run out past it, lying back and drooping, gathered
  // toward a soft point: overlapping, low in contrast, irregular in size and spacing
  var paths = cols.map(function () { return new Path2D(); }), r = mulberry32(seed || 91);
  outs.forEach(function (d, oi) {
    var ar = pArea(d) > 0 ? 1 : -1, acc = 0, next = m.w * 2;
    for (var i = 0; i < d.length; i++) {
      var a = d[i], c = d[(i + 1) % d.length], sl = Math.hypot(c[0] - a[0], c[1] - a[1]); acc += sl; if (acc < next) continue; acc = 0; next = m.w * (1.4 + r() * 2.6);
      var tx = (c[0] - a[0]) / (sl || 1), ty = (c[1] - a[1]) / (sl || 1), nx = ty * ar, ny = -tx * ar, w = wt(a[0], a[1], nx, ny, oi); if (w <= 0 || r() > w) continue;
      var L = m.l * (0.9 + r() * 1.3) * (0.6 + 0.7 * w), bx = -0.95, by = 0.25 + (ny > 0.3 ? 0.55 : 0), bl = Math.hypot(bx, by), dx = bx / bl * 0.9 + nx * 0.16, dy = by / bl * 0.9 + ny * 0.16, dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      var px = -dy, py = dx, cu = 0.12 + r() * 0.18, k = ny > 0.35 ? (r() < 0.5 ? 1 : 2) : ny < -0.35 ? (r() < 0.6 ? 0 : 1) : (r() < 0.35 ? 0 : r() < 0.7 ? 1 : 2), p = paths[k], tip = [a[0] + dx * L * 0.55 + nx * L * 0.06, a[1] + dy * L * 0.55 + ny * L * 0.06 + L * 0.06];
      // a tapered lock: wide where it leaves the coat, curving back and down to a fine point
      var b0 = [a[0] - dx * L * 0.45 - nx * L * 0.08, a[1] - dy * L * 0.45 - ny * L * 0.08], bw = m.w * (1.2 + r() * 1.2), mc = [lerp(b0[0], tip[0], 0.5) + L * cu * 0.25 * (ny > 0 ? 0.3 : 1), lerp(b0[1], tip[1], 0.5) + L * cu * 0.35];
      p.moveTo(b0[0] - px * bw, b0[1] - py * bw); p.quadraticCurveTo(mc[0] - px * bw * 0.5, mc[1] - py * bw * 0.5, tip[0], tip[1]); p.quadraticCurveTo(mc[0] + px * bw * 0.5, mc[1] + py * bw * 0.5, b0[0] + px * bw, b0[1] + py * bw); p.closePath();
    }
  });
  paths.forEach(function (p, i) { ctx.fillStyle = zc(cols[i], 1, 0.3); ctx.fill(p); });
}
function tanukiPaint2(ctx, o) {
  var R = qRig(TANS), C = TANK, m, t = o.t || 0;
  if (RL.night) { C = {}; for (var ck in TANK) C[ck] = TANK[ck]; C.frost = mixc(TANK.frost, TANK.coat, 0.55); C.ruff = mixc(TANK.ruff, TANK.coat, 0.35); C.face = mixc(TANK.face, TANK.coat, 0.2); }   // at night the grizzle is not silvered: the guard hairs' pale tips read warmer and lower
  RL.k = pScale(ctx); m = pLm();
  var coat = C.coat, hd = o.head || {}, pitch = hd.pitch === undefined ? 0.15 : hd.pitch;
  var Po = qPose(R, { ph: o.ph, amp: o.amp, gait: o.gait, stride: o.stride || 0.34, crouch: (o.crouch || 0) * 0.4, head: { neck: R.B0[2].th + pitch * 0.5, ang: 0.25 + pitch * 0.9, bend: pitch * 0.1 } }), B = Po.B, B0 = R.B0;
  ctx.save();
  qContact(ctx, R, Po, 0.04);
  var dk = [C.dark, C.dark, C.dark];
  qFarLeg(ctx, R, Po.farH, true, [0.05, 0.04, 0.02, 0.014, 0.013, 0.012], [0.04, 0.035, 0.018, 0.013, 0.012, 0.011], dk, 'tanfh');
  qFarLeg(ctx, R, Po.farF, false, [0.03, 0.026, 0.018, 0.014, 0.013, 0.012], [0.026, 0.024, 0.017, 0.013, 0.012, 0.011], dk, 'tanff');
  // the tail: short, thick, carried low, dark along the top
  var P2 = function (x, y) { return qP2(R, B, x, y); }, root = P2(-0.255, -0.28), ta = B[0].th + Math.PI - 0.95 + Math.sin(t * 1.3) * 0.04, tl = 0.15;
  var tp = [root]; for (var i = 1; i <= 4; i++) { var aa = ta + (i - 1) * 0.08; tp.push([tp[i - 1][0] + Math.cos(aa) * tl / 4, tp[i - 1][1] + Math.sin(aa) * tl / 4]); }
  var tail = pLimb(tp, [0.042, 0.058, 0.058, 0.042, 0.01], [0.038, 0.052, 0.052, 0.038, 0.009], 4), tpth = pPath(tail.out), te0 = tail.at(0, 0), te1 = tail.at(1, 0);
  ctx.fillStyle = zgrad2(ctx, te0[0], te0[1], te1[0], te1[1], coat, mixc(coat, C.dark, 0.5), RL.hi * 0.95, RL.lo * 1.1); ctx.fill(tpth);
  ctx.save(); ctx.clip(tpth); var tq = tail.at(0.5, -0.7); zsoft(ctx, tq[0], tq[1], 0.08, 0.02, C.dark, 0.75, 1, Math.atan2(te1[1] - te0[1], te1[0] - te0[0])); ctx.restore();
  // the silhouette
  var out0 = pSmooth(R.ctrl.map(function (c) { return sikaPt(B, c.L, null, B0); }), true, 5), out = pWind(out0, true), oRev = out !== out0;
  function restOf(ii) { var k = oRev ? out.length - 1 - ii : ii; return R.ctrl[Math.min(R.ctrl.length - 1, Math.floor(k / 5))]; }
  var tho = B[1], b1 = B0[1];
  function TG(p) { var c0 = Math.cos(-b1.th), s0 = Math.sin(-b1.th), dx = p[0] - b1.a[0], dy = p[1] - b1.a[1], lx = dx * c0 - dy * s0, ly = dx * s0 + dy * c0, c = Math.cos(tho.th), s2 = Math.sin(tho.th); return [tho.a[0] + lx * c - ly * s2, tho.a[1] + lx * s2 + ly * c]; }
  function off(b, k) { return [b.a[0] - Math.sin(b.th) * k, b.a[1] + Math.cos(b.th) * k]; }
  var nk = pLimb([TG([0.05, -0.25]), TG([0.12, -0.255]), off(B[2], 0.012), off(B[3], 0.01), off(B[4], 0.006)], [0.075, 0.08, 0.075, 0.065, 0.055], [0.065, 0.07, 0.066, 0.056, 0.05], 5), nOut = pWind(nk.out, true);
  var hl = qLegTube(R, [B[5], B[6], B[7], B[8]], true), flg = qLegTube(R, [B[9], B[10], B[11], B[12]], false), hOut = pWind(hl.out, true), fOut = pWind(flg.out, true);
  var path = new Path2D(); pPath(out, path); pPath(nOut, path); pPath(hOut, path); pPath(fOut, path);
  var bodyLegs = new Path2D(); pPath(out, bodyLegs); pPath(hOut, bodyLegs); pPath(fOut, bodyLegs);
  var lit = 0.5 + 0.5 * clamp(-pL()[1]);
  ctx.save(); ctx.clip(path);
  var top = P2(0, -0.34), bot = P2(0, -0.11), g1 = ctx.createLinearGradient(top[0], top[1], bot[0], bot[1]);
  g1.addColorStop(0, zc(mixc(coat, C.frost, 0.3), 1.0)); g1.addColorStop(0.35, zc(coat, 0.95)); g1.addColorStop(0.8, zc(mixc(coat, C.dark, 0.35), 0.85)); g1.addColorStop(1, zc(mixc(coat, C.dark, 0.5), 0.8));
  ctx.fillStyle = g1; ctx.fill(path);
  var sT = P2(0, -0.13), g2 = ctx.createLinearGradient(0, sT[1], 0, 0); g2.addColorStop(0, zc(C.dark, 1, 0)); g2.addColorStop(0.3, zc(C.dark, 1, 0.85)); g2.addColorStop(1, zc(C.dark, 0.9, 1)); ctx.fillStyle = g2; ctx.fill(bodyLegs);   // the dark legs
  var hiC = mixc(coat, C.frost, 0.45), loC = mixc(coat, [30, 26, 34], 0.6);
  function blob(x, y, rx, ry, c, a, rot) { var q = P2(x, y); zsoft(ctx, q[0], q[1], rx, ry, c, a, 1, rot || 0); }
  blob(-0.18, -0.27, 0.07, 0.05, hiC, 0.4 * lit); blob(0.0, -0.3, 0.13, 0.04, hiC, 0.35 * lit); blob(-0.1, -0.33, 0.12, 0.015, C.back, 0.5);   // the frosted back, the dark line down the spine
  blob(0.115, -0.22, 0.04, 0.11, C.dark, 0.8, -0.25); blob(0.13, -0.3, 0.05, 0.03, C.dark, 0.5, -0.25); blob(0.17, -0.17, 0.045, 0.07, C.dark, 0.9);   // the dark band over the shoulders, the dark chest
  blob(-0.03, -0.12, 0.12, 0.03, loC, 0.5); blob(-0.12, -0.17, 0.03, 0.05, loC, 0.4, -0.3);
  var nA = Math.atan2(nk.at(1, 0)[1] - nk.at(0.2, 0)[1], nk.at(1, 0)[0] - nk.at(0.2, 0)[0]);
  [0.4, 0.75].forEach(function (u) { var a1 = nk.at(u, 0.6); zsoft(ctx, a1[0], a1[1], 0.04, 0.03, C.dark, 0.7, 1, nA); var b2 = nk.at(u, -0.5); zsoft(ctx, b2[0], b2[1], 0.04, 0.02, hiC, 0.4 * lit, 1, nA); });
  if (MODE !== 'm') {
    // the grizzle: many short overlapping curved locks at low contrast, pale guard-hair tips scattered over the darker underfur
    // (more of them over the back and flanks, none on the dark legs and chest), the tones squeezed toward the middle
    var n = pCount(R.area, 1100), S = qSamples(R, n), set = pSet({ coat: qSoft(coat), fr: qSoft(mixc(coat, C.frost, 0.6)), dk: qSoft(C.dark), un: qSoft(mixc(coat, C.dark, 0.35)) });
    for (i = 0; i < n; i++) {
      var sm = S[i], x0 = sm.x, y0 = sm.y, q = sikaPt(B, sm.L, null, B0), turn = rigTurn(B, B0, sm.L), cls = 'coat', up = clamp((R.bellyY(x0) - y0) / Math.max(0.05, R.bellyY(x0) - R.backY(x0)));
      if ((y0 > -0.12 && (x0 < -0.1 || x0 > 0.09)) || (x0 > 0.15 && y0 > -0.24)) cls = 'dk'; else if (sm.r1 < 0.2 + 0.25 * up) cls = 'fr'; else if (sm.r1 > 0.82) cls = 'un';
      var tv = pTone(sm.nr[0], sm.nr[1], sm.nr[2], sm.nr[3], -turn * 0.6) * 0.55 + 0.22;
      pCurve(set, cls, pTi(tv, pMot(x0, y0, 5) * 0.45 + (sm.r2 - 0.5) * 0.35), q[0], q[1], sm.ha + turn + (sm.r1 - 0.5) * 0.5, m.l * (0.7 + sm.r2 * 0.5), (sm.r2 - 0.5) * 0.4 + 0.15);
    }
    [[hl, 'tanhl'], [flg, 'tanfl']].forEach(function (L3) { var lb = L3[0], nl = pCount(lb.len * 0.04, 160), LR = pRand(L3[1], nl); for (var k3 = 0; k3 < nl; k3++) { var u3 = 0.2 + LR[k3 * 4] * 0.8, v3 = LR[k3 * 4 + 1] * 2 - 1, q3 = lb.at(u3, v3), nm3 = q3[3]; pStroke(set, 'dk', pTi(pTone(nm3[0] * v3, nm3[1] * v3, Math.sqrt(Math.max(0, 1 - v3 * v3)), 0), (LR[k3 * 4 + 2] - 0.5) * 0.8), q3[0], q3[1], q3[2] + (LR[k3 * 4 + 3] - 0.5) * 0.4, m.l * 0.7); } });
    ctx.globalAlpha = 0.3; pSetFlush(ctx, set, m.w * 0.95, ['un', 'dk', 'coat', 'fr']); ctx.globalAlpha = 1;
  }
  ctx.restore();
  // the long shaggy coat: soft guard hairs lying back along the body and spilling over the outline, grizzled pale and dark
  if (MODE !== 'm') { qFuzz(ctx, path, mixc(coat, C.frost, 0.3), C.dark, P2(0, -0.34)[1], 0, m.w * 0.9); qFuzz(ctx, pPath(tail.out), coat, C.dark, 0, 0, m.w * 0.9); 
    var yb = P2(0, -0.2)[1];
    tanWisps(ctx, [out, nOut, tail.out], function (x, y, nx, ny, oi) {
      if (oi === 2) return 0.9;                                   // the tail
      if (y > -0.07) return 0;                                    // not over the feet
      if (oi === 1) return ny > 0 ? 0.8 : 0.35;                   // the throat and the back of the neck
      if (ny > 0.35) return 0.9;                                  // the belly fringe
      if (x > 0.02 && ny < 0.3) return 0.6;                       // the shoulders
      return y < yb ? 0.25 : 0.45;                                // a few elsewhere: mostly the soft edge
    }, [mixc(coat, C.frost, 0.4), coat, mixc(coat, C.dark, 0.3)], m, 91); }
  var hb = B[4], nE = nk.at(1, -0.5);
  ctx.save(); ctx.translate(lerp(hb.a[0], nE[0], 0.5), lerp(hb.a[1], nE[1], 0.5)); ctx.rotate(hb.th);
  tanukiHead2(ctx, { yaw: hd.yaw, t: t, blink: o.blink, shine: o.shine, sniff: o.sniff }, coat, C);
  ctx.restore();
  ctx.restore();
}

/* ---- the Japanese hare (ニホンノウサギ), drawn as one painted animal in its winter white: the body (sit, sit-up and the stretch of a
   hop blended), the near legs grown out of it as tubes (the haunch into the long hind foot; the shoulder into the slim foreleg),
   the neck flowing into the head: all one silhouette, filled and brushed together. Soft white fur shaded cool where it turns
   from the light, a dusting of warm fawn on the back of the neck, the black ear tips, the amber eye in its pale ring ---- */
var HARE2 = { coat: [242, 242, 244], shade: [160, 170, 196], warm: [214, 196, 170], back: [206, 196, 184], light: [255, 246, 230], belly: [248, 248, 250], tip: [30, 26, 30], inner: [226, 204, 204], eye: [190, 128, 52], nose: [196, 150, 150] };
var HARE2B = { coat: [150, 118, 86], shade: [88, 74, 70], warm: [186, 150, 106], back: [112, 88, 66], light: [226, 196, 150], belly: [222, 210, 190], tip: [30, 26, 30], inner: [214, 176, 160], eye: [190, 128, 52], nose: [150, 110, 104] };   // the brown coat (spring to autumn)
function harePaint2(ctx, o) {
  var C = o.brown ? HARE2B : HARE2, m, e = clamp(o.ext || 0), up = clamp(o.up || 0), lift = o.lift || 0, t = o.t || 0, br = Math.sin(t * 2.6) * 0.003 * (1 - e);
  RL.k = pScale(ctx); m = pLm();
  var lod = MODE === 'm' || RL.k < 140;
  ctx.save(); ctx.translate(0, -lift); if (o.pitch) ctx.rotate(o.pitch);
  var base = lerpPts(lerpPts(HARE_SIT, HARE_UP, up), HARE_STR, e).map(function (q, i) { return [q[0], q[1] + (i >= 2 && i <= 5 ? br : 0)]; });
  var hip = [lerp(lerp(-0.12, -0.1, up), -0.16, e), lerp(lerp(-0.13, -0.14, up), -0.23, e)], sh = [lerp(lerp(0.07, 0.06, up), 0.13, e), lerp(lerp(-0.17, -0.25, up), -0.24, e)];
  var hf = o.hindF || [-0.03, 0], ff = o.foreF || [0.12, 0], th = o.hindT !== undefined ? o.hindT : 0, fx = o.foreFlex || 0;
  function hindTube(far) {
    var dx = far ? 0.015 : 0, tf = [hf[0] + dx, hf[1] + lift * 0], heel = [tf[0] - lerp(0.14, -0.11, th), tf[1] - lerp(0.0, 0.05, th)];
    var h0 = [hip[0] + dx, hip[1] + 0.02], k = zik2(h0, heel, 0.12, 0.11, -1);
    var toe = [tf[0] + lerp(0.03, 0.012, th), tf[1] - 0.004];
    return pLimb([[hip[0] + dx + 0.02, hip[1] - 0.02], h0, k[0], k[1], tf, toe], [0.065, 0.078, 0.052, 0.027, 0.022, 0.012], [0.065, 0.072, 0.042, 0.02, 0.016, 0.01], 5);   // a thick thigh, the long furry foot
  }
  function foreTube(far) {
    var dx = far ? 0.018 : 0, tf = [ff[0] + dx, ff[1]], el = [lerp(sh[0], tf[0], 0.5) - 0.02 - fx * 0.03, lerp(sh[1], tf[1], 0.5) + fx * 0.02];
    return pLimb([[sh[0] + dx, sh[1] - 0.01], el, [tf[0] - 0.01, tf[1] - 0.012], tf], [0.04, 0.024, 0.017, 0.015], [0.04, 0.023, 0.016, 0.014], 5);   // slim but furred
  }
  var shadeF = mixc(C.coat, C.shade, 0.55);
  [hindTube(true), foreTube(true)].forEach(function (lb, li) {   // the far legs: the same fur, in the body's shadow
    var a0 = lb.at(0, 0), a1 = lb.at(1, 0), lp = pPath(lb.out), g = ctx.createLinearGradient(a0[0], a0[1] - 0.03, a1[0], a1[1]); g.addColorStop(0, zc(shadeF, 0.9)); g.addColorStop(1, zc(mixc(shadeF, C.shade, 0.4), 0.8)); ctx.fillStyle = g; ctx.fill(lp);
    if (!lod) { ctx.save(); ctx.clip(lp); var fs = pSet({ c: qSoft(shadeF) }), RF = pRand('harefar' + li, 90); for (var k1 = 0; k1 < 90; k1++) { var q1 = lb.at(0.1 + RF[k1 * 4] * 0.9, RF[k1 * 4 + 1] * 2 - 1); pCurve(fs, 'c', pTi(0.5 + (RF[k1 * 4 + 2] - 0.5) * 0.3, 0), q1[0], q1[1], q1[2] + (RF[k1 * 4 + 3] - 0.5) * 0.4, m.l * 0.5, 0.15); } ctx.globalAlpha = 0.35; pSetFlush(ctx, fs, m.w * 0.8); ctx.globalAlpha = 1; ctx.restore(); qFuzz(ctx, lp, shadeF, shadeF, a0[1], a1[1], m.w * 0.8); }
  });
  // the scut, white, held up as it runs
  var sc = [base[1][0] + 0.002, base[1][1] - 0.008 - e * 0.02]; zsoft(ctx, sc[0], sc[1], 0.036, 0.03, C.belly, 1); zsoft(ctx, sc[0] - 0.006, sc[1] - 0.012, 0.026, 0.014, o.brown ? mixc(C.coat, C.tip, 0.5) : mixc(C.coat, C.back, 0.4), 0.8);   // the scut: short and fluffy, white beneath, darker on top
  // the one silhouette
  var hd = o.head || {}, hp = hd.pitch || 0, yaw = clamp(hd.yaw || 0), Hc = [lerp(lerp(0.15, 0.12, up), 0.25, e), lerp(lerp(-0.25, -0.36, up), -0.31, e) + br];
  var bodyO = pWind(pSmooth(base, true, 6), true), hl = hindTube(false), fl = foreTube(false), hOut = pWind(hl.out, true), fOut = pWind(fl.out, true);
  var nk = pLimb([[sh[0] - 0.05, sh[1] + 0.01], [lerp(sh[0], Hc[0], 0.5) - 0.01, lerp(sh[1], Hc[1], 0.5)], [Hc[0] - 0.01, Hc[1] + 0.005]], [0.07, 0.065, 0.045], [0.075, 0.06, 0.04], 5), nOut = pWind(nk.out, true);
  var all = [bodyO, hOut, fOut, nOut], path = new Path2D(); all.forEach(function (d) { pPath(d, path); });
  ctx.save(); ctx.clip(path);
  var g1 = ctx.createLinearGradient(0, -0.38, 0, 0); g1.addColorStop(0, zc(C.coat, 1.04)); g1.addColorStop(0.5, zc(C.coat, 0.97)); g1.addColorStop(0.85, zc(mixc(C.coat, C.shade, 0.55), 0.95)); g1.addColorStop(1, zc(mixc(C.coat, C.shade, 0.7), 0.9));
  ctx.fillStyle = g1; ctx.fill(path);
  [hl, fl].forEach(function (lb) {   // the near legs in the coat's own colour, shaded round along their length (not the cold shade of the ground)
    var a0 = lb.at(0.3, -1), a1 = lb.at(0.3, 1), gl = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]); gl.addColorStop(0, zc(C.coat, 1.0)); gl.addColorStop(0.6, zc(mixc(C.coat, C.shade, 0.3), 0.97)); gl.addColorStop(1, zc(mixc(C.coat, C.shade, 0.5), 0.92));
    ctx.fillStyle = gl; ctx.fill(pPath(lb.out));
  });
  var lit = 0.5 + 0.5 * clamp(-pL()[1]), loC = mixc(C.coat, C.shade, 0.85);
  zsoft(ctx, hip[0] + 0.0, hip[1] + 0.06, 0.06, 0.06, loC, 0.5);              // under the haunch
  zsoft(ctx, hip[0] - 0.01, hip[1] - 0.035, 0.08, 0.05, C.light, (o.brown ? 0.3 : 0.6) * lit); // the lit round of the haunch
  zsoft(ctx, -0.02, -0.04, 0.12, 0.03, loC, 0.45);                              // the belly in shadow
  zsoft(ctx, sh[0] - 0.02, sh[1] + 0.02, 0.03, 0.06, loC, 0.4, 1, 0.3);         // behind the shoulder
  var nq = nk.at(0.5, -0.6); zsoft(ctx, nq[0], nq[1], 0.05, 0.02, C.warm, 0.45, 1, -0.8);   // a warm fawn dusting on the nape
  var bq = [lerp(base[2][0], base[3][0], 0.5), lerp(base[2][1], base[3][1], 0.5) + 0.015]; zsoft(ctx, bq[0], bq[1], 0.13, 0.03, C.back, 0.4, 1, Math.atan2(base[3][1] - base[2][1], base[3][0] - base[2][0]));   // a greyer-brown cast along the back
  zsoft(ctx, bq[0] + 0.03, bq[1] - 0.01, 0.1, 0.03, C.light, 0.35 * lit);   // the warm light across the top
  var hc = ctx.createLinearGradient(0, hip[1] + 0.1, 0, 0); hc.addColorStop(0, zc(loC, 1, 0)); hc.addColorStop(1, zc(loC, 0.95, 0.28)); ctx.fillStyle = hc; ctx.fill(path);   // the feet a little in the snow's cool shade
  if (!lod) {
    var set = pSet({ c: qSoft(C.coat) }), R2 = pRand('hare2', 700), b = pBox(bodyO), n = Math.min(700, pCount(0.06, 700));
    set.s = { pal: qSoft(mixc(C.coat, C.shade, 0.6)), b: pBatch() }; set.w = { pal: qSoft(mixc(C.coat, C.light, 0.5)), b: pBatch() };
    for (var k = 0; k < n; k++) { var x = lerp(b[0], b[2], R2[k * 4]), y = lerp(b[1], b[3], R2[k * 4 + 1]); if (!pInside(bodyO, x, y)) continue; var yy = (y - b[1]) / (b[3] - b[1]); pCurve(set, yy > 0.62 ? 's' : yy < 0.3 ? 'w' : 'c', pTi(0.8 - yy * 0.4 + (R2[k * 4 + 2] - 0.5) * 0.2, 0), x, y, Math.PI + 0.25 + yy * 0.6 + (R2[k * 4 + 3] - 0.5) * 0.4, m.l * 0.6, (R2[k * 4 + 3] - 0.5) * 0.4 + 0.12); }   // soft curved locks: warm light above, cool blue-grey shadow below
    [hl, fl, nk].forEach(function (lb, li) { var R3 = pRand('hare3' + li, 110); for (var k2 = 0; k2 < 110; k2++) { var uu = 0.1 + R3[k2 * 4] * 0.9, vv = R3[k2 * 4 + 1] * 2 - 1, q = lb.at(uu, vv); pCurve(set, vv > 0.3 && li === 0 ? 's' : 'c', pTi(0.7 - R3[k2 * 4] * 0.3, 0), q[0], q[1], q[2] + (li === 2 ? Math.PI : 0) + (R3[k2 * 4 + 2] - 0.5) * 0.4, m.l * 0.5, 0.15); } });
    ctx.globalAlpha = 0.32; pSetFlush(ctx, set, m.w * 0.8, ['s', 'c', 'w']); ctx.globalAlpha = 1;
    // the long hind foot: furry, a soft pale underside along the sole
    var so = new Path2D(); for (var k4 = 0; k4 <= 8; k4++) { var qs = hl.at(0.62 + k4 / 8 * 0.38, -0.75); if (k4) so.lineTo(qs[0], qs[1]); else so.moveTo(qs[0], qs[1]); } ctx.strokeStyle = zc(o.brown ? mixc(C.coat, C.belly, 0.5) : mixc(C.coat, C.warm, 0.2), 1, 0.35); ctx.lineWidth = 0.006; ctx.lineCap = 'round'; ctx.stroke(so);
  }
  ctx.restore();
  // soft broken edge where the fur stands off it (the belly, the chest, the back of the haunch); the rim along the top
  if (!lod) qEdge(ctx, all, function (oi, ii, a0, nx, ny) { if (oi !== 0 && oi !== 3) return null; if (ny > 0.4 && a0[1] > -0.2 && a0[1] < -0.03) return ii % 3 === 0 ? ['s', 0.5, 0.3, 0.2, 0.6] : null; if (nx > 0.5 && oi === 3) return ii % 3 === 0 ? ['c', 0.45, 0.3, 0.2, 0.8] : null; return null; }, { c: qSoft(C.coat), s: qSoft(mixc(C.coat, C.shade, 0.5)) });
  // the head
  ctx.save(); ctx.translate(Hc[0], Hc[1]); ctx.rotate(hp);
  var ea = (o.ears === undefined ? 0 : o.ears), tw = Math.sin(t * 1.9 + 1) * 0.05 * (1 - e);
  function ear(far) {
    var a = lerp(-1.85, -2.75, ea) + (far ? 0.14 : 0) + tw * (far ? -1 : 1), L = 0.15, b0 = [far ? 0.0 : -0.012, -0.03], tip = [b0[0] + Math.cos(a) * L, b0[1] + Math.sin(a) * L], nx = -Math.sin(a), ny = Math.cos(a);
    var E = pSmooth([[b0[0] - nx * 0.014, b0[1] - ny * 0.014], [lerp(b0[0], tip[0], 0.5) - nx * 0.024, lerp(b0[1], tip[1], 0.5) - ny * 0.024], [lerp(b0[0], tip[0], 0.92) - nx * 0.012, lerp(b0[1], tip[1], 0.92) - ny * 0.012], tip, [lerp(b0[0], tip[0], 0.9) + nx * 0.012, lerp(b0[1], tip[1], 0.9) + ny * 0.012], [lerp(b0[0], tip[0], 0.5) + nx * 0.02, lerp(b0[1], tip[1], 0.5) + ny * 0.02], [b0[0] + nx * 0.013, b0[1] + ny * 0.013]], true, 4), p = pPath(E);
    var g = ctx.createLinearGradient(b0[0], b0[1], tip[0], tip[1]); g.addColorStop(0, zc(C.coat, far ? 0.82 : 1)); g.addColorStop(0.75, zc(mixc(C.coat, C.shade, 0.35), far ? 0.8 : 0.97)); g.addColorStop(0.83, zc(C.tip, far ? 0.8 : 1)); g.addColorStop(1, zc(C.tip, far ? 0.8 : 1));
    ctx.fillStyle = g; ctx.fill(p);
    if (!far && yaw < 0.8) { ctx.save(); ctx.clip(p); zsoft(ctx, lerp(b0[0], tip[0], 0.45) + nx * 0.006, lerp(b0[1], tip[1], 0.45) + ny * 0.006, 0.045, 0.009, C.inner, 0.45 + 0.3 * yaw, 1, a); ctx.restore(); }
  }
  ear(true);
  var head = pSmooth([[-0.045, -0.005], [-0.035, -0.04], [0.005, -0.05], [0.045, -0.035], [0.075, -0.01], [0.08, 0.01], [0.06, 0.03], [0.02, 0.04], [-0.03, 0.03]], true, 5), hpth = pPath(head);
  var gh = ctx.createLinearGradient(0, -0.05, 0, 0.04); gh.addColorStop(0, zc(C.coat, 1.04)); gh.addColorStop(1, zc(mixc(C.coat, C.shade, 0.55), 0.95)); ctx.fillStyle = gh; ctx.fill(hpth);
  ctx.save(); ctx.clip(hpth); zsoft(ctx, 0.0, 0.03, 0.05, 0.02, mixc(C.coat, C.shade, 0.7), 0.5); zsoft(ctx, 0.06, -0.01, 0.025, 0.015, C.warm, 0.35); ctx.restore();
  if (!lod) { var es = pSet({ c: qSoft(C.coat) }); pEdge(es, head, { hair: function () { return Math.PI * 0.85; }, tone: function () { return 0.75; }, cls: function () { return 'c'; }, lk: 0.4, len: function (x, y, nx2, ny2) { return ny2 > 0.4 && x < 0.04 ? 1 : 0; }, seed: 81 }); pSetFlush(ctx, es, m.w * 0.7); }
  ear(false);
  var bl = o.blink === undefined ? 1 : o.blink;
  zsoft(ctx, 0.022, -0.012, 0.02, 0.016, mixc(C.coat, C.warm, 0.6), 0.7);   // the pale ring round the eye
  zeye(ctx, 0.022, -0.013, 0.011, C.eye, bl, false);
  if (yaw > 0.4) zeye(ctx, 0.05, -0.015, 0.008 * yaw, C.eye, bl, false);
  ctx.fillStyle = zc(C.nose); ctx.beginPath(); ctx.ellipse(0.078, 0.004 + Math.sin(t * 11) * 0.0015 * (o.sniff || 0), 0.006, 0.005, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = zc(C.shade, 0.7, 0.6); ctx.lineWidth = Math.max(0.0025, m.w * 0.5); ctx.beginPath(); ctx.moveTo(0.075, 0.01); ctx.quadraticCurveTo(0.07, 0.022, 0.058, 0.024); ctx.stroke();
  if (!lod) { ctx.strokeStyle = 'rgba(250,250,250,0.3)'; ctx.lineWidth = 0.0015; ctx.beginPath(); for (var w = 0; w < 4; w++) { ctx.moveTo(0.07, 0.008); ctx.lineTo(0.12, -0.005 + w * 0.01); } ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

/* ================= small birds: a perched and a flying side view in the local frame (the perch at 0, 0) =================
   L is the bird's length bill to tail in metres (drawn 1.5x so a 15 cm bird reads in the garden; noted in BIRDV). pitch: the
   body's slant (negative raises the head). Markings are painted inside the body and head outlines. */
var BIRDV = 1.6;
var SBIRD = {
  ooruri: { throat: [20, 22, 34], L: 0.165, pitch: -0.55, body: 0.2, head: 0.105, bill: 0.07, billD: 0.032, tail: 0.36, tars: 0.1, tip: 0.12, tailA: 0.2,
    back: [36, 74, 168], crown: [84, 150, 232], under: [246, 246, 242], wing: [30, 60, 140], flight: [24, 30, 52], tailC: [38, 72, 164], billC: [22, 22, 26], legs: [54, 54, 60], eye: [24, 20, 20] },
  ruri: { throat: [244, 242, 236], L: 0.14, pitch: -0.5, body: 0.21, head: 0.11, bill: 0.06, billD: 0.03, tail: 0.38, tars: 0.14, tip: 0.1, tailA: 0.25,
    back: [62, 100, 178], crown: [76, 116, 204], under: [238, 236, 230], wing: [70, 80, 110], flight: [50, 54, 70], tailC: [48, 92, 196], billC: [24, 22, 22], legs: [48, 44, 44], eye: [24, 20, 20] },
  kawasemi: { throat: [246, 240, 230], L: 0.17, pitch: -0.95, body: 0.19, head: 0.135, bill: 0.24, billD: 0.05, tail: 0.17, tars: 0.05, tip: 0.04, tailA: 0.1,
    back: [26, 112, 150], crown: [30, 104, 140], under: [224, 112, 44], wing: [26, 100, 132], flight: [22, 60, 84], tailC: [26, 76, 150], billC: [20, 20, 24], legs: [220, 74, 50], eye: [20, 16, 16] },
  mejiro: { throat: [230, 214, 70], L: 0.12, pitch: -0.4, body: 0.22, head: 0.12, bill: 0.07, billD: 0.024, tail: 0.32, tars: 0.12, tip: 0.1, tailA: 0.15,
    back: [118, 146, 48], crown: [132, 158, 48], under: [228, 226, 216], wing: [104, 126, 48], flight: [70, 76, 50], tailC: [94, 110, 44], billC: [54, 50, 48], legs: [96, 96, 100], eye: [40, 30, 24] },
  uguisu: { throat: [214, 208, 186], L: 0.15, pitch: -0.35, body: 0.19, head: 0.1, bill: 0.07, billD: 0.026, tail: 0.42, tars: 0.12, tip: 0.04, tailA: 0.05,
    back: [138, 128, 80], crown: [132, 120, 76], under: [216, 212, 194], wing: [128, 114, 72], flight: [96, 84, 56], tailC: [122, 110, 70], billC: [96, 80, 62], legs: [196, 160, 140], eye: [30, 24, 20] }
};
function sbMarks(ctx, kind, part, B, rx, ry, S, o) {   // the species' markings, painted inside the body ('body') or head ('head', in head units)
  if (kind === 'ooruri') {
    if (part === 'body') { var q0 = B(rx * 1.1, -ry * 0.6), q1 = B(rx * 0.75, ry * 0.75), q2 = B(rx * 0.05, ry * 0.4), q3 = B(rx * 0.25, -ry * 0.4); ctx.fillStyle = zc([22, 24, 38]); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.quadraticCurveTo(q1[0], q1[1], q2[0], q2[1]); ctx.quadraticCurveTo(q3[0], q3[1], q0[0], q0[1]); ctx.fill(); zsoft(ctx, B(-rx * 0.1, -ry * 0.5)[0], B(-rx * 0.1, -ry * 0.5)[1], rx * 0.8, ry * 0.35, [60, 120, 220], 0.4); }   // black breast; a glossy back
    else { zsoft(ctx, 0.25, 0.45, 0.95, 0.75, [18, 20, 30], 1); zsoft(ctx, -0.1, -0.55, 0.85, 0.45, S.crown, 0.9); }   // black face and throat under the shining cerulean crown
  } else if (kind === 'ruri') {
    if (part === 'body') { zsoft(ctx, B(-rx * 0.05, ry * 0.25)[0], B(-rx * 0.05, ry * 0.25)[1], rx * 0.42, ry * 0.45, [234, 136, 50], 1, 1, o.pitch); zsoft(ctx, B(rx * 0.35, -ry * 0.55)[0], B(rx * 0.35, -ry * 0.55)[1], rx * 0.3, ry * 0.28, [100, 160, 246], 0.95); }   // orange flank; the bright blue shoulder
    else { ctx.strokeStyle = zc([168, 200, 246], 1, 0.9); ctx.lineWidth = 0.16; ctx.beginPath(); ctx.moveTo(0.85, -0.3); ctx.quadraticCurveTo(0.3, -0.62, -0.35, -0.42); ctx.stroke(); zsoft(ctx, 0.3, 0.7, 0.6, 0.45, [244, 242, 236], 1); }   // pale blue brow; white throat
  } else if (kind === 'kawasemi') {
    if (part === 'body') { zsoft(ctx, B(-rx * 0.2, -ry * 0.62)[0], B(-rx * 0.2, -ry * 0.62)[1], rx * 1.1, ry * 0.18, [86, 214, 238], 1, 1, o.pitch); zsoft(ctx, B(rx * 0.4, -ry * 0.1)[0], B(rx * 0.4, -ry * 0.1)[1], rx * 0.35, ry * 0.8, [226, 116, 46], 0.9); }   // the azure stripe down the back; orange breast
    else {
      zsoft(ctx, 0.15, 0.2, 0.62, 0.32, [232, 128, 56], 1);                 // orange cheek through the eye
      zsoft(ctx, -0.25, 0.55, 0.32, 0.38, [246, 244, 236], 1);              // the white neck patch
      zsoft(ctx, 0.45, 0.78, 0.5, 0.25, [246, 240, 230], 0.95);            // white throat
      zsoft(ctx, 0.2, 0.56, 0.55, 0.12, [30, 140, 172], 0.9, 1, -0.15);    // the turquoise moustache stripe
      ctx.fillStyle = zc([110, 200, 226], 1, 0.75); for (var i = 0; i < 9; i++) { var a = -2.6 + i * 0.32; ctx.beginPath(); ctx.arc(Math.cos(a) * 0.55 + 0.05, Math.sin(a) * 0.55 - 0.05, 0.055, 0, TAU); ctx.fill(); }   // the pale-blue speckled crown
    }
  } else if (kind === 'mejiro') {
    if (part === 'body') { zsoft(ctx, B(rx * 0.1, ry * 0.45)[0], B(rx * 0.1, ry * 0.45)[1], rx * 0.6, ry * 0.4, [196, 176, 146], 0.55); zsoft(ctx, B(rx * 0.75, -ry * 0.1)[0], B(rx * 0.75, -ry * 0.1)[1], rx * 0.35, ry * 0.5, [232, 216, 62], 0.9); }   // buff flanks; yellow upper breast
    else { zsoft(ctx, 0.4, 0.62, 0.65, 0.45, [236, 218, 60], 1); }   // the yellow throat (the white eye-ring is drawn with the eye)
  } else if (kind === 'uguisu') {
    if (part === 'body') { zsoft(ctx, B(-rx * 0.05, ry * 0.4)[0], B(-rx * 0.05, ry * 0.4)[1], rx * 0.7, ry * 0.4, [186, 174, 140], 0.5); }
    else { ctx.strokeStyle = zc([216, 208, 172], 1, 0.9); ctx.lineWidth = 0.14; ctx.beginPath(); ctx.moveTo(0.9, -0.22); ctx.quadraticCurveTo(0.3, -0.5, -0.5, -0.3); ctx.stroke(); ctx.strokeStyle = zc([86, 74, 52], 1, 0.75); ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(0.95, 0.02); ctx.lineTo(-0.4, -0.05); ctx.stroke(); }   // the pale brow over a dark eye-stripe
  }
}

/* ================= small birds, painted: one feathered silhouette (the body, the neck and the head as a single outline, scalloped
   where the contour feathers lie), the folded wing as layered feathers (the coverts in rows, the tertials, the long primaries
   stacked to a point past the rump), the tail as separate feathers. Flying: each wing a fan of primaries from the hand, the
   secondaries along the arm, the coverts over their bases. Local frame: metres, the perch at the origin, y down ---- */
function sbOutline(B, rx, ry, Hc, hr, pitchH, sc) {   // body, neck and head as one smooth closed outline (with a little scallop of feathers)
  var P = [], i, n = 26;
  // round the body from the vent (under the tail) forward along the belly to the breast, then the throat up to the chin
  for (i = 0; i <= n; i++) { var a = Math.PI * 0.95 - i / n * Math.PI * 1.0; P.push(B(Math.cos(a) * rx * (Math.cos(a) > 0 ? 1.0 : 1.05), Math.sin(a) * ry * 1.02)); }
  var ch = Math.cos(pitchH), shh = Math.sin(pitchH);
  function H(lx, ly) { return [Hc[0] + (lx * ch - ly * shh) * hr, Hc[1] + (lx * shh + ly * ch) * hr]; }
  P.push(H(0.15, 0.92)); P.push(H(0.7, 0.62)); P.push(H(0.95, 0.15));     // the throat to the chin and the gape
  P.push(H(0.92, -0.32)); P.push(H(0.55, -0.85)); P.push(H(0.0, -1.0)); P.push(H(-0.55, -0.85)); P.push(H(-0.92, -0.3));   // the forehead, the crown, the nape
  for (i = 0; i <= n; i++) { var a2 = -Math.PI * 0.28 - i / n * Math.PI * 0.62; P.push(B(Math.cos(a2) * rx * (Math.cos(a2) > 0 ? 0.98 : 1.05), Math.sin(a2) * ry)); }   // the mantle and the back to the rump
  var d = pSmooth(P, true, 3);
  if (sc) d = d.map(function (q, k) { var nx = d[(k + 1) % d.length][1] - d[(k - 1 + d.length) % d.length][1], ny = -(d[(k + 1) % d.length][0] - d[(k - 1 + d.length) % d.length][0]), l = Math.hypot(nx, ny) || 1, w = Math.sin(k * 1.9) * sc; return [q[0] + nx / l * w, q[1] + ny / l * w]; });
  return d;
}
function sbFeather(len, wid, tipR) {   // one feather as an outline along +x: a quill with vanes, a rounded (or pointed) tip
  var o = [[0, 0]], i; for (i = 1; i <= 6; i++) { var u = i / 6; o.push([u * len, -wid * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.5) * (u > 0.8 ? lerp(1, tipR, (u - 0.8) / 0.2) : 1)]); }
  o.push([len * 1.02, 0]); for (i = 6; i >= 1; i--) { var u2 = i / 6; o.push([u2 * len, wid * 0.85 * Math.sin(Math.min(1, u2 * 1.2) * Math.PI * 0.5) * (u2 > 0.8 ? lerp(1, tipR, (u2 - 0.8) / 0.2) : 1)]); }
  return o;
}
function sbDrawFeather(ctx, at, ang, len, wid, tipR, c0, c1, edgeC) {
  var f = sbFeather(len, wid, tipR), c = Math.cos(ang), s = Math.sin(ang), pts = f.map(function (q) { return [at[0] + q[0] * c - q[1] * s, at[1] + q[0] * s + q[1] * c]; }), p = pPath(pSmooth(pts, true, 2));
  var e = [at[0] + c * len, at[1] + s * len], g = ctx.createLinearGradient(at[0], at[1], e[0], e[1]); g.addColorStop(0, zc(c0)); g.addColorStop(1, zc(c1)); ctx.fillStyle = g; ctx.fill(p);
  if (edgeC) { ctx.strokeStyle = zc(edgeC[0], 1, edgeC[1]); ctx.lineWidth = edgeC[2]; ctx.stroke(p); }
}
/* ================= the small birds, painted (v3): one feathered body (the body, the neck and the head filled as one shape, its edge
   softened), the species' colour patches laid on it with soft but definite edges, a light feather texture following the
   lie of the plumage; the folded wing built of real layers (lesser and median coverts as small rounded feathers, the greater
   coverts in a row, the tertials, the secondaries, the long primaries stacked to their staggered tips); a tail of separate
   feathers; legs and toes gripping the perch, shaded round; a proper eye with its catchlight. In flight and with the wings
   half open, the same layered wing (b3Wing) spread: primaries with slotted tips, secondaries, the covert rows.
   Local frame: metres, the perch (the toes) at the origin, y down, facing +x. Sizes are drawn BIRDV times life ---- */
var SB3 = {
  // L: bill tip to tail tip (m, life); rx, ry: the body's half length and half depth; hr: the head's radius; tail; bill, billD;
  // tars: the visible tarsus; pitch: the body's lie (negative: head up); tipX: how far the folded primaries reach past the rump
  ooruri: { L: 0.165, rx: 0.21, ry: 0.105, hr: 0.098, tail: 0.34, bill: 0.075, billD: 0.03, tars: 0.12, pitch: -0.95, tipX: 0.5, split: -0.05,
    up: [30, 60, 152], under: [246, 246, 244], wing: [28, 54, 136], flight: [20, 26, 48], tailC: [32, 64, 158], billC: [24, 24, 28], legs: [52, 52, 58], eye: [18, 14, 14] },
  ruri: { L: 0.14, rx: 0.21, ry: 0.125, hr: 0.105, tail: 0.33, bill: 0.06, billD: 0.03, tars: 0.15, pitch: -0.55, tipX: 0.35, split: 0.02,
    up: [56, 94, 178], under: [242, 240, 236], wing: [60, 78, 120], flight: [40, 46, 66], tailC: [52, 96, 198], billC: [26, 24, 24], legs: [44, 40, 40], eye: [18, 14, 14] },
  kawasemi: { L: 0.17, rx: 0.165, ry: 0.1, hr: 0.125, tail: 0.15, bill: 0.24, billD: 0.05, tars: 0.025, pitch: -1.15, tipX: 0.2, split: 0.0,
    up: [28, 108, 146], under: [226, 112, 42], wing: [26, 104, 136], flight: [18, 58, 82], tailC: [28, 84, 160], billC: [22, 22, 26], legs: [222, 70, 50], eye: [16, 12, 12] },
  mejiro: { L: 0.12, rx: 0.2, ry: 0.12, hr: 0.11, tail: 0.3, bill: 0.08, billD: 0.022, tars: 0.12, pitch: -0.5, tipX: 0.3, split: 0.05,
    up: [122, 148, 50], under: [226, 226, 220], wing: [108, 132, 48], flight: [66, 76, 48], tailC: [92, 110, 44], billC: [50, 48, 48], legs: [92, 92, 100], eye: [40, 28, 22] },
  uguisu: { L: 0.15, rx: 0.19, ry: 0.1, hr: 0.095, tail: 0.4, bill: 0.075, billD: 0.024, tars: 0.13, pitch: -0.35, tipX: 0.15, split: 0.08,
    up: [130, 120, 78], under: [212, 208, 192], wing: [124, 112, 72], flight: [92, 82, 56], tailC: [118, 106, 68], billC: [92, 78, 62], legs: [200, 166, 146], eye: [28, 22, 18] }
};
/* a soft-edged colour patch: a polygon filled in nested passes (dense in the middle, fading out over its edge) */
function b3Patch(ctx, pts, col, a, soft) {
  var c = [0, 0]; pts.forEach(function (q) { c[0] += q[0] / pts.length; c[1] += q[1] / pts.length; });
  var d = pSmooth(pts, true, 3), K = soft === undefined ? [[1.06, 0.3], [1.0, 0.55], [0.94, 1]] : soft;
  K.forEach(function (k) { ctx.fillStyle = zc(col, 1, (a === undefined ? 1 : a) * k[1]); ctx.fill(pPath(d.map(function (q) { return [c[0] + (q[0] - c[0]) * k[0], c[1] + (q[1] - c[1]) * k[0]]; }))); });
}
/* one feather, with a soft shadow under it and (optionally) a pale fringe along its edge */
function b3Outline(len, wid, tipR) {   // a feather along +x: widest a third of the way out, the outer vane narrower, the tip rounded (tipR 1) or pointed (0)
  var o = [], i, N = 9;
  function w(u, k) { var body = Math.pow(Math.sin(Math.min(1, u / 0.35) * Math.PI / 2), 0.8), end = u > 0.6 ? Math.pow(1 - (u - 0.6) / 0.4, lerp(1.6, 0.45, tipR)) : 1; return wid * k * body * end; }
  for (i = 0; i <= N; i++) { var u = i / N; o.push([u * len, -w(u, 0.62)]); }
  for (i = N; i >= 0; i--) { var u2 = i / N; o.push([u2 * len, w(u2, 1)]); }
  return o;
}
function b3Feather(ctx, at, ang, len, wid, tipR, c0, c1, fringe, shadow) {
  var f = b3Outline(len, wid, tipR), c = Math.cos(ang), s = Math.sin(ang), pts = f.map(function (q) { return [at[0] + q[0] * c - q[1] * s, at[1] + q[0] * s + q[1] * c]; }), p = pPath(pSmooth(pts, true, 2));
  if (shadow) { var sx = -s * wid * 0.5, sy = c * wid * 0.5; ctx.save(); ctx.translate(sx, sy + wid * 0.3); ctx.fillStyle = zc([20, 18, 26], 1, shadow); ctx.fill(p); ctx.restore(); }
  var e = [at[0] + c * len, at[1] + s * len], g = ctx.createLinearGradient(at[0], at[1], e[0], e[1]); g.addColorStop(0, zc(c0)); g.addColorStop(1, zc(c1)); ctx.fillStyle = g; ctx.fill(p);
  if (fringe) { ctx.strokeStyle = zc(fringe[0], 1, fringe[1] * 0.8); ctx.lineWidth = fringe[2]; ctx.stroke(p);
    ctx.strokeStyle = zc(mixc(c0, c1, 0.5), 0.6, 0.45); ctx.beginPath(); ctx.moveTo(at[0], at[1]); ctx.lineTo(at[0] + c * len * 0.92 - s * wid * 0.12, at[1] + s * len * 0.92 + c * wid * 0.12); ctx.stroke(); }   // the shaft
  return p;
}
/* an open wing, layered: sh the shoulder, wr the wrist, tp the hand's tip, ch the chord at the arm. cols: { cov, sec, pri, tip, fr }
   (coverts, secondaries, primaries, the primaries' tips, the fringe colour); o: { slots (0..1: how separated the primary tips are),
   n (feather counts), far (in the shade), lod, L (for line widths), sw (secondary length factor) } */
function b3Wing(ctx, sh, wr, tp, ch, cols, o) {
  // the wing as a cambered surface: the leading edge bowed forward at the wrist (the arm a rounded curve, the hand sweeping back to
  // the tip), the secondaries along the arm varying in length (the trailing edge a gentle S), the primaries fanning from the hand
  // and splaying at the tip with open slots between them; each feather its own tone; then the light across the camber: bright
  // along the leading edge and the coverts, a soft shadow in the hollow behind them, the feather tips a little translucent
  o = o || {}; var k = o.far ? 0.8 : 1, L = o.L || 0.2, lw = Math.max(L * 0.004, 0.6 / Math.max(1, RL.k)), RW = mulberry32(o.seed || 7);
  function sc(c, j) { return scl(c, k * (j || 1)); }
  function frame(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; if (nx > 0) { nx = -nx; ny = -ny; } return { a: Math.atan2(dy, dx), n: Math.atan2(ny, nx), l: l, nx: nx, ny: ny }; }
  function aL(a0, a1, u) { var d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a0 + d * u; }
  var fa = frame(sh, wr), fh = frame(wr, tp), NP = o.np || 9, NS = o.ns || 9, slot = o.slots === undefined ? 0.5 : o.slots, sw = o.sw || 1, i, u;
  // the leading edge: the arm bowed forward (away from the trailing side), the hand a curve swept back
  var bowA = [lerp(sh[0], wr[0], 0.5) - Math.cos(fa.n) * fa.l * 0.2, lerp(sh[1], wr[1], 0.5) - Math.sin(fa.n) * fa.l * 0.2], bowH = [lerp(wr[0], tp[0], 0.45) - Math.cos(fh.n) * fh.l * 0.08, lerp(wr[1], tp[1], 0.45) - Math.sin(fh.n) * fh.l * 0.08];
  function arm(u2) { var v = 1 - u2; return [v * v * sh[0] + 2 * v * u2 * bowA[0] + u2 * u2 * wr[0], v * v * sh[1] + 2 * v * u2 * bowA[1] + u2 * u2 * wr[1]]; }
  function hand(u2) { var v = 1 - u2; return [v * v * wr[0] + 2 * v * u2 * bowH[0] + u2 * u2 * tp[0], v * v * wr[1] + 2 * v * u2 * bowH[1] + u2 * u2 * tp[1]]; }
  function armA(u2) { var a = arm(Math.max(0, u2 - 0.02)), b = arm(Math.min(1, u2 + 0.02)); return frame(a, b).n; }
  function handA(u2) { var a = hand(Math.max(0, u2 - 0.02)), b = hand(Math.min(1, u2 + 0.02)); return frame(a, b); }
  var all = new Path2D(), feathers = [];
  // the shape under everything, so no gaps show between the feathers
  var pp = []; for (i = 0; i <= 8; i++) pp.push(arm(i / 8)); for (i = 1; i <= 8; i++) pp.push(hand(i / 8));
  for (i = 6; i >= 0; i--) { u = i / 6; var hq = hand(u * 0.8), an = aL(handA(u * 0.8).n, fh.a, Math.pow(u, 1.3) * 0.8); pp.push([hq[0] + Math.cos(an) * ch * lerp(0.9, 1.15, u), hq[1] + Math.sin(an) * ch * lerp(0.9, 1.15, u)]); }
  for (i = 6; i >= 0; i--) { u = i / 6; var aq = arm(u); pp.push([aq[0] + Math.cos(armA(u)) * ch * 0.75 * sw, aq[1] + Math.sin(armA(u)) * ch * 0.75 * sw]); }
  var base = pPath(pSmooth(pp, true, 2)); ctx.fillStyle = zgrad2(ctx, sh[0], sh[1], tp[0], tp[1], sc(cols.sec), sc(cols.pri), RL.hi * 0.95, 0.88); ctx.fill(base); all.addPath(base);
  if (o.lod) { ctx.fillStyle = zc(sc(cols.cov), 1, 0.9); ctx.fill(pPath(pLimb([sh, bowA, wr, bowH], [ch * 0.05, ch * 0.05, ch * 0.04, ch * 0.02], [ch * 0.42, ch * 0.4, ch * 0.32, ch * 0.12], 3).out)); return base; }
  function F(at, ang, len, wid, tipR, c0, c1, fr, sh2) { var p = b3Feather(ctx, at, ang, len, wid, tipR, c0, c1, fr, sh2); all.addPath(p); return p; }
  // the primaries: from the hand, the outer ones long and narrow-tipped (the emarginated tips leave slots), splayed apart at the tip
  for (i = NP - 1; i >= 0; i--) {
    u = i / (NP - 1); var hu = 0.1 + u * 0.78, rp = hand(hu), hf = handA(hu), ap = aL(hf.n, fh.a, 0.2 + Math.pow(u, 1.2) * 0.62) + (u - 0.6) * 0.12 * slot, len = ch * lerp(0.92, 1.32, Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.55)) * (i === NP - 1 ? 0.88 : 1) * (0.96 + RW() * 0.08);
    var tone = 0.92 + RW() * 0.12; F(rp, ap, len, ch * lerp(0.15, 0.11, u) * (1 - 0.25 * slot * u), lerp(0.35, 0.02, u), sc(cols.pri, tone), sc(cols.tip || cols.pri, tone), cols.fr ? [sc(cols.fr), 0.22, lw] : null, 0.14);
  }
  // the secondaries along the arm: rounded, their lengths varying (longest at the middle, shorter near the body and the wrist)
  for (i = 0; i < NS; i++) { u = (i + 0.5) / NS; var ra = arm(u), ln = ch * (0.72 + 0.12 * Math.sin(u * Math.PI) + 0.04 * Math.sin(i * 2.3)) * sw; F(ra, armA(u) + (u - 0.5) * 0.18, ln, ch * 0.2, 1, sc(cols.sec, 0.94 + RW() * 0.1), sc(cols.secT || cols.sec, 0.9), cols.fr ? [sc(cols.fr), 0.28, lw] : null, 0.14); }
  // the coverts: the greater row over the flight feathers' bases, the median row, the lesser coverts along the leading edge
  [[0.48, 0.15, 12, 0.2], [0.3, 0.13, 10, 0.18], [0.18, 0.1, 9, 0.14]].forEach(function (row, ri) {
    var cl = ri === 0 ? (cols.gcov || cols.cov) : cols.cov;
    for (var j = 0; j < row[2]; j++) {
      var uu = (j + 0.5) / row[2], onH = uu > 0.66, at = onH ? hand((uu - 0.66) / 0.34 * 0.45) : arm(uu / 0.66), aa = (onH ? handA((uu - 0.66) / 0.34 * 0.45).n : armA(uu / 0.66)) + 0.1 - ri * 0.05;
      F(at, aa, ch * row[0] * (onH ? 0.8 : 1) * (0.92 + RW() * 0.16), ch * row[1] * 1.25, 1, sc(mixc(cl, [255, 255, 255], 0.04 * ri), 0.97 + RW() * 0.06), sc(mixc(cl, cols.sec, 0.25)), cols.fr && ri === 0 ? [sc(cols.fr), 0.25, lw] : null, row[3]);
    }
  });
  var lc = pLimb([sh, bowA, wr, bowH, hand(0.6)], [ch * 0.05, ch * 0.05, ch * 0.045, ch * 0.03, ch * 0.015], [ch * 0.16, ch * 0.15, ch * 0.13, ch * 0.08, ch * 0.03], 4), lp = pPath(lc.out);   // the rounded leading edge (the patagium)
  ctx.fillStyle = zgrad2(ctx, sh[0], sh[1], tp[0], tp[1], sc(cols.cov), sc(mixc(cols.cov, cols.sec, 0.25)), RL.hi, 0.96); ctx.fill(lp); all.addPath(lp);
  // the light across the camber, over the whole wing
  ctx.save(); ctx.clip(all);
  var mA = arm(0.5), cn = [Math.cos(armA(0.5)), Math.sin(armA(0.5))], gC = ctx.createLinearGradient(mA[0] - cn[0] * ch * 0.1, mA[1] - cn[1] * ch * 0.1, mA[0] + cn[0] * ch * 1.0, mA[1] + cn[1] * ch * 1.0);
  gC.addColorStop(0, 'rgba(255,252,240,0.22)'); gC.addColorStop(0.3, 'rgba(255,252,240,0)'); gC.addColorStop(0.5, 'rgba(20,20,40,0.16)'); gC.addColorStop(0.85, 'rgba(20,20,40,0.04)'); gC.addColorStop(1, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = gC; ctx.fillRect(Math.min(sh[0], tp[0]) - ch * 2, Math.min(sh[1], tp[1]) - ch * 2, Math.abs(tp[0] - sh[0]) + ch * 4, Math.abs(tp[1] - sh[1]) + ch * 4);
  var wq = hand(0.15); zsoft(ctx, wq[0] + Math.cos(fh.n) * ch * 0.4, wq[1] + Math.sin(fh.n) * ch * 0.4, ch * 0.5, ch * 0.3, [20, 20, 40], 0.12);   // the hollow behind the wrist
  ctx.restore();
  return base;
}
/* a wing seen nearly edge-on (level in the stroke): a clean tapered shape, the leading edge lit, a little of the upper side showing */
function b3Edge(ctx, sh, wr, tp, ch, cw, cd, far, k, trail) {
  var dk = far ? 0.8 : 1, th = lerp(0.3, 0.16, k), bw = [lerp(sh[0], wr[0], 0.5), lerp(sh[1], wr[1], 0.5) - ch * 0.04];
  var lb = pLimb([sh, bw, wr, [lerp(wr[0], tp[0], 0.6), lerp(wr[1], tp[1], 0.6)], tp], [ch * 0.02, ch * 0.06, ch * 0.06, ch * 0.035, ch * 0.004], [ch * th * 0.3, ch * th, ch * th * 0.85, ch * th * 0.5, ch * 0.006], 4), p = pPath(lb.out);
  var a0 = lb.at(0.4, 1), a1 = lb.at(0.4, -1), g = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]); g.addColorStop(0, zc(scl(mixc(cw, cd, 0.5), dk))); g.addColorStop(0.55, zc(scl(cw, dk))); g.addColorStop(1, zc(scl(mixc(cw, [255, 255, 255], 0.25), dk)));
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  if (trail) { var tb = []; for (var i = 0; i <= 10; i++) tb.push(lb.at(i / 10 * 0.62, 1.2)); for (i = 10; i >= 0; i--) tb.push(lb.at(i / 10 * 0.62, 0.35)); ctx.fillStyle = zc(scl(trail, dk)); ctx.fill(pPath(pSmooth(tb, true, 2))); }   // the black secondaries showing along the trailing edge
  ctx.restore();
  ctx.strokeStyle = zc(scl(cd, 0.75 * dk), 1, 0.35); ctx.lineWidth = Math.max(ch * 0.012, 0.6 / Math.max(1, RL.k)); ctx.beginPath(); for (i = 0; i <= 12; i++) { var q = lb.at(0.05 + i / 12 * 0.95, 0.85 + 0.12 * Math.sin(i * 1.7)); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke();   // the ragged line of feather tips
  return p;
}
function b3Folded(ctx, Wf, S, rx, ry, lod, L, kind) {
  // the wing folded along the side: the coverts a smooth, tidy shoulder patch; under them the tertials and secondaries; the primaries
  // stacked into a pointed tip lying over the rump. Wf(u, v): u 0 the shoulder .. 1 the tip, v -1 the upper (back) edge .. 1 the lower
  var lw = Math.max(L * 0.003, 0.6 / Math.max(1, RL.k)), fr = mixc(S.wing, [255, 255, 255], kind === 'uguisu' ? 0.18 : 0.28);
  var Wp = [[0.0, -0.7], [0.25, -1.0], [0.6, -0.75], [1.0, -0.05], [0.7, 0.35], [0.4, 0.75], [0.15, 0.8], [0.0, 0.2]].map(function (q) { return Wf(q[0], q[1]); });
  var wp = pPath(pSmooth(Wp, true, 3)), o0 = Wf(0, 0), o1 = Wf(1, 0);
  ctx.fillStyle = zgrad2(ctx, o0[0], o0[1], o1[0], o1[1], S.wing, mixc(S.wing, S.flight, 0.6), RL.hi * 0.98, 0.9); ctx.fill(wp);
  if (lod) return wp;
  ctx.save(); ctx.clip(wp);
  var i, ang = Math.atan2(o1[1] - o0[1], o1[0] - o0[0]), len = Math.hypot(o1[0] - o0[0], o1[1] - o0[1]);
  // the primaries: long, pointed, stacked; their tips staggered toward the point
  for (i = 0; i < 6; i++) b3Feather(ctx, Wf(0.42 - i * 0.02, 0.5 - i * 0.13), ang - 0.05 + i * 0.012, len * (0.5 + i * 0.03), ry * 0.13, 0.05, mixc(S.flight, S.wing, 0.25), S.flight, [fr, 0.25, lw], 0.1);
  // the secondaries and tertials: shorter, rounded, fringed pale
  for (i = 0; i < 4; i++) b3Feather(ctx, Wf(0.3 - i * 0.03, 0.35 - i * 0.25), ang + 0.06 - i * 0.02, len * (0.42 - i * 0.03), ry * 0.17, 1, mixc(S.wing, S.flight, 0.2), mixc(S.wing, S.flight, 0.55), [fr, 0.35, lw], 0.1);
  ctx.restore();
  // the coverts: one smooth rounded patch over the shoulder, its lower edge a tidy row of rounded tips
  var cv = [[0.0, -0.75], [0.2, -1.0], [0.46, -0.8], [0.5, -0.2], [0.42, 0.45], [0.2, 0.65], [0.02, 0.3]].map(function (q) { return Wf(q[0], q[1]); }), cp = pPath(pSmooth(cv, true, 3));
  ctx.fillStyle = zgrad2(ctx, o0[0], o0[1] - ry * 0.3, o0[0], o0[1] + ry * 0.4, mixc(S.wing, S.up, 0.4), S.wing, RL.hi, 0.95); ctx.fill(cp);
  ctx.strokeStyle = zc(fr, 1, 0.35); ctx.lineWidth = lw; ctx.lineCap = 'round';
  for (i = 0; i < 5; i++) { var a = Wf(0.44 - i * 0.02, -0.55 + i * 0.25), b = Wf(0.36 - i * 0.02, -0.38 + i * 0.25); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(lerp(a[0], b[0], 0.5) + (b[1] - a[1]) * 0.4, lerp(a[1], b[1], 0.5) - (b[0] - a[0]) * 0.4, b[0], b[1]); ctx.stroke(); }   // the greater coverts' tips, a soft row
  return wp;
}
function sb3Paint(ctx, kind, o) {
  var S = SB3[kind], L = S.L * BIRDV, fl = o.fluff ? 1.12 : 1, pitch = S.pitch + (o.pitch || 0), cr = clamp(o.crouch || 0), t = o.t || 0, m;
  RL.k = pScale(ctx); m = pLm();
  var lod = MODE === 'm' || RL.k * L < 26, turn = clamp(o.turn || 0);   // turn: 0 profile .. 1 three-quarter (the breast toward us)
  var rx = L * S.rx * (1 - turn * 0.16), ry = L * S.ry * fl, hr = L * S.hr * fl, tl = S.tars * L * (1 - cr * 0.45);
  var c = Math.cos(pitch), s = Math.sin(pitch), low = Math.sqrt(rx * rx * s * s + ry * ry * c * c), bc = [0, -tl - low * 0.9];
  // the body's lowest point (where the belly feathers meet the legs) is straight above the toes
  var ta0 = Math.atan2(ry * c, rx * s), lowP = [rx * Math.cos(ta0) * c - ry * Math.sin(ta0) * s, rx * Math.cos(ta0) * s + ry * Math.sin(ta0) * c]; if (lowP[1] < 0) lowP = [-lowP[0], -lowP[1]];
  bc[0] = -lowP[0] * 0.85;
  function B(lx, ly) { return [bc[0] + lx * c - ly * s, bc[1] + lx * s + ly * c]; }
  var hd = o.head || {}, yaw = clamp((hd.yaw || 0) + turn * 0.35), hp = (hd.pitch || 0) + pitch * 0.12 + (o.tilt || 0) + 0.05, Hc = B(rx * 0.8, -ry * 0.6 - hr * 0.5);   // (the head kept near level, whatever the body's lie)
  var ch = Math.cos(hp), shh = Math.sin(hp); function H(lx, ly) { return [Hc[0] + (lx * ch - ly * shh) * hr, Hc[1] + (lx * shh + ly * ch) * hr]; }
  var lw = Math.max(L * 0.004, 0.6 / Math.max(1, RL.k));
  // 1. the far leg and the tail (behind the body)
  var legW = Math.max(L * (kind === 'kawasemi' ? 0.016 : 0.015), 0.7 / Math.max(1, RL.k));
  function leg(far) {
    var hip = [bc[0] + lowP[0] * 0.85 + (far ? L * 0.012 : -L * 0.004), bc[1] + lowP[1] * 0.96], ft = [far ? L * 0.016 : -L * 0.006, 0], k2 = far ? 0.75 : 1;   // only the short tarsus shows below the belly feathers
    var g = ctx.createLinearGradient(hip[0] - legW, hip[1], hip[0] + legW, hip[1]); g.addColorStop(0, zc(scl(S.legs, 1.2 * k2))); g.addColorStop(1, zc(scl(S.legs, 0.7 * k2)));
    ctx.strokeStyle = g; ctx.lineWidth = legW; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.quadraticCurveTo(lerp(hip[0], ft[0], 0.5) + L * 0.01, lerp(hip[1], ft[1], 0.5), ft[0], ft[1] - L * 0.004); ctx.stroke();
    ctx.strokeStyle = zc(scl(S.legs, 0.9 * k2)); ctx.lineWidth = legW * 0.8; ctx.beginPath();   // the toes round the perch: three forward, one back
    [[0.07, 0.02], [0.055, 0.03], [-0.045, 0.02]].forEach(function (q) { ctx.moveTo(ft[0], ft[1] - L * 0.004); ctx.quadraticCurveTo(ft[0] + q[0] * L * 0.6, ft[1] - L * 0.006, ft[0] + q[0] * L, ft[1] + q[1] * L * 0.5); });
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  leg(true);
  var ta = pitch + 0.15 + (o.flick || 0) * 0.55 + (o.cock || 0) * 1.1, tL = S.tail * L, r0 = B(-rx * 0.82, ry * 0.15), nT = lod ? 3 : 6;
  for (var fi = 0; fi < nT; fi++) { var sp = (fi / (nT - 1) - 0.5) * 0.12 * (1 + (o.flick || 0) * 0.8 + turn), fa = Math.PI + ta + sp, tc = fi % 2 ? scl(S.tailC, 0.9) : S.tailC; b3Feather(ctx, r0, fa, tL * (1 - Math.abs(fi / (nT - 1) - 0.5) * 0.08), tL * 0.12, 0.65, tc, scl(S.tailC, 0.65), lod ? null : [scl(S.tailC, 0.5), 0.4, lw], lod ? 0 : 0.1); }
  if (kind === 'ooruri') { var tw = [r0[0] - Math.cos(ta) * tL * 0.3, r0[1] - Math.sin(ta) * tL * 0.3 + ry * 0.08]; zsoft(ctx, tw[0], tw[1], tL * 0.18, ry * 0.18, [248, 248, 244], 0.85, 1, ta); }   // the white at the base of the outer tail
  // 2. the one silhouette: body, neck, head; the undertail coverts under the rump
  var bodyD = pSmooth([B(-rx * 1.12, -ry * 0.05), B(-rx * 0.7, -ry * 0.78), B(0, -ry * 0.98), B(rx * 0.7, -ry * 0.85), B(rx * 1.02, -ry * 0.05), B(rx * 0.78, ry * 0.8), B(0, ry * 1.0), B(-rx * 0.75, ry * 0.6), B(-rx * 1.12, ry * 0.2)], true, 4);   // full at the breast, tapering to the tail
  var nb = B(rx * 0.35, -ry * 0.3), neck = pLimb([nb, [lerp(nb[0], Hc[0], 0.55), lerp(nb[1], Hc[1], 0.55)], Hc], [ry * 0.75, hr * 0.85, hr * 0.8], [ry * 0.85, hr * 0.9, hr * 0.85], 4);
  function ellD(cx, cy, a, b, r) { var d = [], cr2 = Math.cos(r), sr = Math.sin(r); for (var i = 0; i < 24; i++) { var t2 = i / 24 * TAU, x = Math.cos(t2) * a, y = Math.sin(t2) * b; d.push([cx + x * cr2 - y * sr, cy + x * sr + y * cr2]); } return d; }
  var utc = B(-rx * 0.8, ry * 0.55), sil = new Path2D();   // (every part wound the same way, so they fill as one)
  [bodyD, neck.out, ellD(Hc[0], Hc[1], hr * (1 - turn * 0.05), hr, hp), ellD(utc[0], utc[1], rx * 0.35, ry * 0.32, pitch)].forEach(function (d) { pPath(pWind(d, true), sil); });
  if (!lod) qFuzz(ctx, sil, S.up, S.under, B(0, -ry)[1], B(0, ry)[1], Math.max(lw * 2.2, 1.3 / Math.max(1, RL.k)));   // a soft feathered edge, not an outline
  var up = B(0, -ry), dn = B(0, ry), gr = ctx.createLinearGradient(up[0], up[1], dn[0], dn[1]), sp0 = 0.5 + S.split * 0.5 - turn * 0.18;   // (turned toward us, more of the breast shows)
  gr.addColorStop(0, zc(S.up, RL.hi)); gr.addColorStop(Math.max(0, sp0 - 0.1), zc(S.up, 0.95)); gr.addColorStop(Math.min(1, sp0 + 0.02), zc(S.under, 1.02)); gr.addColorStop(1, zc(S.under, lerp(RL.lo, 1, 0.4)));
  ctx.fillStyle = gr; ctx.fill(sil);
  ctx.save(); ctx.clip(sil);
  // the head in the upper colour, the throat in the lower: then the species' patches
  zsoft(ctx, Hc[0] - hr * 0.1, Hc[1] - hr * 0.2, hr * 1.15, hr * 1.0, S.up, 1, RL.hi * 0.98);
  b3Marks(ctx, kind, B, H, rx, ry, hr, S, turn);
  // the soft round of the body: light across the top, shade under the belly and behind the leg
  // the body in the round: a cool shadow wrapping under the belly and the vent, the breast catching the light, a rim of sky light along the back
  var vn2 = [-s, c], bl0 = B(0, ry * 0.3), gV = ctx.createLinearGradient(bl0[0] - vn2[0] * ry * 1.3, bl0[1] - vn2[1] * ry * 1.3, bl0[0] + vn2[0] * ry * 0.9, bl0[1] + vn2[1] * ry * 0.9);
  gV.addColorStop(0, 'rgba(255,250,238,0.16)'); gV.addColorStop(0.45, 'rgba(255,250,238,0)'); gV.addColorStop(0.75, 'rgba(40,40,70,0.12)'); gV.addColorStop(1, 'rgba(30,30,60,0.34)');
  ctx.fillStyle = gV; ctx.fill(pPath(bodyD));   // (the body only: the head keeps its own colours)
  var brq = B(rx * 0.6, ry * 0.15); zsoft(ctx, brq[0], brq[1], rx * 0.45, ry * 0.5, [255, 252, 244], 0.16 * (0.5 + 0.5 * clamp(-pL()[1])), 1, pitch);   // the breast's round
  if (!lod) { ctx.save(); ctx.translate(vn2[0] * lw * 2.2, vn2[1] * lw * 2.2); ctx.strokeStyle = zc(RL.rimC, 1, RL.rimA * 0.55); ctx.lineWidth = lw * 1.3; ctx.beginPath(); var bd2 = pWind(bodyD, true); for (var ri = 0; ri < bd2.length; ri++) { var q0 = bd2[ri], dq = (q0[0] - bc[0]) * vn2[0] + (q0[1] - bc[1]) * vn2[1]; if (Math.hypot(q0[0] - Hc[0], q0[1] - Hc[1]) < hr * 1.6 || pInside(neck.out, q0[0], q0[1])) { dq = 0; } if (dq < -ry * 0.45) { if (ri && ((bd2[ri - 1][0] - bc[0]) * vn2[0] + (bd2[ri - 1][1] - bc[1]) * vn2[1]) < -ry * 0.45) ctx.lineTo(q0[0], q0[1]); else ctx.moveTo(q0[0], q0[1]); } } ctx.stroke(); ctx.restore(); }   // the rim light along the back
  // the feather texture: short soft curved strokes along the lie of the plumage, a shade lighter above and darker below
  if (!lod) {
    var lt = new Path2D(), dk = new Path2D(), R = pRand('sb3' + kind, 160), bb = pBox(pSmooth([B(-rx, -ry), B(rx, -ry), B(rx, ry), B(-rx, ry), Hc], true, 1));
    for (var k = 0; k < 160; k++) { var x = lerp(bb[0] - hr, bb[2] + hr, R[k * 4]), y = lerp(bb[1] - hr, bb[3], R[k * 4 + 1]), a = Math.PI + pitch + 0.25 + (R[k * 4 + 2] - 0.5) * 0.5, l2 = L * 0.035 * (0.6 + R[k * 4 + 3] * 0.6), P2 = R[k * 4 + 3] > 0.5 ? lt : dk; P2.moveTo(x, y); P2.quadraticCurveTo(x + Math.cos(a) * l2 * 0.5 - Math.sin(a) * l2 * 0.2, y + Math.sin(a) * l2 * 0.5 + Math.cos(a) * l2 * 0.2, x + Math.cos(a) * l2, y + Math.sin(a) * l2); }
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(lw, 0.9 / Math.max(1, RL.k)); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke(lt); ctx.strokeStyle = 'rgba(0,0,10,0.1)'; ctx.stroke(dk);
    // the breast and flank feathers: small soft scallops in loose rows, low in contrast (a light edge over a darker base)
    var sc1 = new Path2D(), sc2 = new Path2D(), RS = mulberry32(kind.length * 31);
    for (var rw = 0; rw < 6; rw++) for (var kk = 0; kk < 7; kk++) { var fx = rx * (0.75 - kk * 0.24 + (rw % 2) * 0.12 + (RS() - 0.5) * 0.12), fy = ry * (-0.15 + rw * 0.17 + (RS() - 0.5) * 0.08), fq = B(fx, fy), fr2 = L * 0.022 * (0.8 + RS() * 0.4); if (fx * fx / (rx * rx) + fy * fy / (ry * ry) > 0.8) continue; sc1.moveTo(fq[0] + Math.cos(pitch + 0.5) * fr2, fq[1] + Math.sin(pitch + 0.5) * fr2); sc1.arc(fq[0], fq[1], fr2, pitch + 0.5, pitch + 2.6); sc2.moveTo(fq[0] + Math.cos(pitch + 0.6) * fr2 * 0.85, fq[1] + Math.sin(pitch + 0.6) * fr2 * 0.85 + lw); sc2.arc(fq[0], fq[1] + lw, fr2 * 0.85, pitch + 0.6, pitch + 2.5); }
    ctx.lineWidth = Math.max(lw * 0.9, 0.7 / Math.max(1, RL.k)); ctx.strokeStyle = 'rgba(20,20,40,0.045)'; ctx.stroke(sc2); ctx.strokeStyle = 'rgba(255,255,255,0.11)'; ctx.stroke(sc1);
  }
  ctx.restore();
  // 3. the wing: folded on the side, or half open (lifted, the feathers spreading)
  var wo = clamp(o.wings || 0);
  // the folded wing lies along the side, on its upper half: from the shoulder (behind the neck) back to a point over the rump
  var sh0 = B(rx * (0.45 - turn * 0.15), -ry * 0.42), tipF = B(-rx * (1.0 + S.tipX), -ry * 0.2), vn = [-s, c];   // vn: toward the belly
  function Wf(u, v) { var px = lerp(sh0[0], tipF[0], u), py = lerp(sh0[1], tipF[1], u), wd = ry * 0.52 * (1 - u * 0.75); return [px + vn[0] * wd * v, py + vn[1] * wd * v]; }
  if (wo < 0.05) b3Folded(ctx, Wf, S, rx, ry, lod, L, kind);
  else {   // half open: the wing lifts from the shoulder, the hand opening
    var span = L * 0.75 * (0.55 + 0.45 * wo), wr = [sh0[0] - span * 0.18, sh0[1] - span * 0.35 * wo], tp2 = [wr[0] - span * lerp(0.62, 0.3, wo), wr[1] - span * 0.38 * wo + span * 0.25 * (1 - wo)];
    b3Wing(ctx, sh0, wr, tp2, L * 0.2, { cov: S.wing, sec: mixc(S.wing, S.flight, 0.35), pri: S.flight, tip: scl(S.flight, 0.8), fr: mixc(S.wing, [255, 255, 255], 0.3) }, { L: L, lod: lod, np: 7, ns: 6, slots: 0.3 });
  }
  // the near leg, over the belly
  leg(false);
  // 4. the head's details: the bill, shaded round, the gape; the eye with its catchlight
  var bl = S.bill * L * (1 - 0.45 * yaw), bd = S.billD * L, ex = hr * 0.88, sing = clamp(o.sing || 0), op = sing * bd * 1.2;
  ctx.save(); ctx.translate(Hc[0], Hc[1]); ctx.rotate(hp);
  var gB = ctx.createLinearGradient(ex, -bd * 0.6, ex, bd * 0.6); gB.addColorStop(0, zc(scl(S.billC, 1.5))); gB.addColorStop(0.35, zc(S.billC)); gB.addColorStop(1, zc(scl(S.billC, 0.7)));
  ctx.fillStyle = gB; ctx.beginPath(); ctx.moveTo(ex - hr * 0.12, -bd * 0.55); ctx.quadraticCurveTo(ex + bl * 0.55, -bd * 0.42, ex + bl, -op * 0.3); ctx.quadraticCurveTo(ex + bl * 0.5, bd * 0.0, ex - hr * 0.06, bd * 0.08); ctx.closePath(); ctx.fill();   // the upper mandible
  var gL = ctx.createLinearGradient(ex, 0, ex, bd * 0.6); gL.addColorStop(0, zc(kind === 'kawasemi' && o.female ? [214, 96, 50] : S.billC)); gL.addColorStop(1, zc(scl(kind === 'kawasemi' && o.female ? [214, 96, 50] : S.billC, 0.65)));
  ctx.fillStyle = gL; ctx.beginPath(); ctx.moveTo(ex - hr * 0.06, bd * 0.12); ctx.lineTo(ex + bl * 0.93, op + bd * 0.1); ctx.quadraticCurveTo(ex + bl * 0.4, bd * 0.55 + op * 0.4, ex - hr * 0.1, bd * 0.5); ctx.closePath(); ctx.fill();   // the lower
  if (op > 0) { ctx.fillStyle = 'rgba(170,70,70,0.8)'; ctx.beginPath(); ctx.moveTo(ex, bd * 0.1); ctx.lineTo(ex + bl * 0.6, op * 0.6); ctx.lineTo(ex + bl * 0.55, bd * 0.1 - op * 0.1); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = zc(scl(S.billC, 0.4), 1, 0.7); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ex - hr * 0.1, bd * 0.1); ctx.lineTo(ex + bl * 0.9, bd * 0.1 + op * 0.5); ctx.stroke();   // the gape line
  var bk = o.blink === undefined ? 1 : o.blink, er = hr * (kind === 'kawasemi' ? 0.15 : kind === 'mejiro' ? 0.2 : 0.21), exx = hr * (0.32 + yaw * 0.15), ey = -hr * 0.12;
  if (kind === 'mejiro') { ctx.fillStyle = zc([252, 252, 248]); ctx.beginPath(); ctx.arc(exx, ey, er * 1.85, 0, TAU); ctx.fill(); ctx.strokeStyle = zc([200, 200, 196], 1, 0.6); ctx.lineWidth = lw; ctx.stroke(); }   // the bold white eye-ring
  else { ctx.strokeStyle = zc([30, 26, 30], 1, 0.6); ctx.lineWidth = lw * 1.4; ctx.beginPath(); ctx.arc(exx, ey, er * 1.2, 0, TAU); ctx.stroke(); }   // the dark lid rim
  zeye(ctx, exx, ey, er, S.eye, bk, false);
  ctx.restore();
}
/* the species' colour patches (on the body in B, on the head in H, both in their own units) */
function b3Marks(ctx, kind, B, H, rx, ry, hr, S, turn) {
  function bp(pts) { return pts.map(function (q) { return B(rx * q[0], ry * q[1]); }); }
  function hp(pts) { return pts.map(function (q) { return H(q[0], q[1]); }); }
  if (kind === 'ooruri') {
    b3Patch(ctx, hp([[-0.35, -0.75], [0.15, -0.98], [0.75, -0.62], [0.55, -0.42], [0.0, -0.52], [-0.45, -0.5]]), [74, 144, 236], 0.7, [[1.15, 0.2], [1.0, 0.35], [0.8, 0.5]]);   // the crown a shining cobalt, blending into the darker back
    b3Patch(ctx, [H(1.0, -0.12), H(0.5, -0.38), H(0.0, -0.32), H(-0.45, 0.25), B(rx * 0.4, ry * 0.05), B(rx * 0.62, ry * 0.5), B(rx * 1.0, ry * 0.15), H(0.95, 0.55)], [16, 18, 28], 1, [[1.015, 0.6], [1.0, 1]]);   // the black face, throat and upper breast, the border to the white belly sharp
    b3Patch(ctx, bp([[-0.9, -0.55], [-0.2, -0.95], [0.6, -0.8], [0.5, -0.35], [-0.6, -0.25]]), [44, 84, 180], 0.4);   // the gloss along the back
  } else if (kind === 'ruri') {
    b3Patch(ctx, bp([[-0.35, -0.05], [0.25, -0.2], [0.65, 0.15], [0.4, 0.6], [-0.2, 0.55]]), [238, 152, 58], 1);   // the orange-yellow flank
    b3Patch(ctx, hp([[0.95, 0.15], [0.6, 0.3], [0.1, 0.6], [0.2, 1.0], [0.8, 0.8]]), [246, 244, 238], 0.95);   // the white throat
    ctx.strokeStyle = zc([248, 248, 252], 1, 0.9); ctx.lineWidth = hr * 0.14; ctx.lineCap = 'round'; var e0 = H(0.85, -0.38), e1 = H(0.35, -0.5), e2 = H(-0.15, -0.42); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.quadraticCurveTo(e1[0], e1[1], e2[0], e2[1]); ctx.stroke(); ctx.lineCap = 'butt';   // the white eyebrow
    b3Patch(ctx, bp([[0.3, -0.8], [0.7, -0.6], [0.55, -0.35], [0.25, -0.45]]), [110, 170, 250], 0.8);   // the bright blue shoulder
  } else if (kind === 'kawasemi') {
    b3Patch(ctx, hp([[1.0, 0.05], [0.4, -0.1], [-0.3, -0.05], [-0.4, 0.25], [0.3, 0.3], [0.95, 0.35]]), [232, 126, 52], 1);   // the orange cheek through the eye
    b3Patch(ctx, hp([[-0.35, 0.2], [-0.75, 0.1], [-0.85, 0.6], [-0.45, 0.75]]), [246, 244, 236], 1);   // the white neck patch
    b3Patch(ctx, hp([[0.95, 0.42], [0.4, 0.45], [0.1, 0.85], [0.7, 0.95]]), [246, 240, 228], 1);   // the white throat
    b3Patch(ctx, hp([[0.9, 0.36], [0.3, 0.38], [-0.3, 0.36], [-0.3, 0.46], [0.3, 0.48], [0.9, 0.44]]), [30, 120, 156], 0.9, [[1, 1]]);   // the blue-green moustache stripe
    var KR = mulberry32(77); ctx.fillStyle = zc([126, 206, 230], 1, 0.75); for (var i = 0; i < 22; i++) { var qx = -0.75 + KR() * 1.5, qy = -0.95 + KR() * 0.75; if (qx * qx + qy * qy > 0.85) continue; var q = H(qx, qy); ctx.beginPath(); ctx.ellipse(q[0], q[1], hr * 0.05, hr * 0.03, 0.3, 0, TAU); ctx.fill(); }   // the fine pale bars of the crown and nape
    b3Patch(ctx, bp([[-1.0, -0.4], [-0.3, -0.95], [0.4, -0.9], [0.5, -0.75], [-0.3, -0.7], [-0.95, -0.15]]), [74, 222, 240], 1);   // the electric-turquoise stripe down the back
  } else if (kind === 'mejiro') {
    b3Patch(ctx, hp([[1.0, 0.1], [0.5, 0.25], [0.0, 0.5], [0.1, 1.0], [0.8, 0.85]]).concat(bp([[0.85, 0.0], [1.0, -0.25]])), [236, 218, 58], 1);   // the yellow throat
    b3Patch(ctx, bp([[-0.5, 0.2], [0.3, 0.15], [0.55, 0.55], [0.0, 0.85], [-0.6, 0.6]]), [188, 168, 136], 0.65);   // the brownish flanks
  } else if (kind === 'uguisu') {
    ctx.strokeStyle = zc([222, 214, 184], 1, 0.7); ctx.lineWidth = hr * 0.1; ctx.lineCap = 'round'; var u0 = H(0.9, -0.3), u1 = H(0.3, -0.45), u2 = H(-0.4, -0.3); ctx.beginPath(); ctx.moveTo(u0[0], u0[1]); ctx.quadraticCurveTo(u1[0], u1[1], u2[0], u2[1]); ctx.stroke();   // the faint pale eyebrow
    ctx.strokeStyle = zc([96, 84, 58], 1, 0.5); ctx.lineWidth = hr * 0.08; var v0 = H(0.95, -0.05), v1 = H(-0.3, -0.1); ctx.beginPath(); ctx.moveTo(v0[0], v0[1]); ctx.lineTo(v1[0], v1[1]); ctx.stroke(); ctx.lineCap = 'butt';   // and the faint dark line through the eye
    b3Patch(ctx, hp([[0.95, 0.2], [0.4, 0.35], [0.0, 0.6], [0.2, 1.0], [0.8, 0.8]]), [226, 222, 208], 0.8);   // the pale throat
  }
  void turn;
}
/* in flight, side-on: the wings beat through a real stroke (raised and extended on the downstroke, the hand folded back on the way
   up); a bounding flier closes them between bursts. ph: the stroke phase; fold 0..1 (closed); brake 0..1 (landing) */
function sb3Fly(ctx, kind, o) {
  var S = SB3[kind], L = S.L * BIRDV, ph = o.ph || 0, fold = clamp(o.fold || 0), m;
  RL.k = pScale(ctx); m = pLm();
  var lod = MODE === 'm' || RL.k * L < 26, rx = L * S.rx * 1.05, ry = L * S.ry * 0.85, hr = L * S.hr, pt = o.pitch || 0;
  var c = Math.cos(pt), s = Math.sin(pt); function B(lx, ly) { return [lx * c - ly * s, lx * s + ly * c]; }
  var lw = Math.max(L * 0.004, 0.6 / Math.max(1, RL.k));
  // the stroke: y = up (1) .. down (-1); the downstroke (cos falling) with the wing at full stretch, the upstroke with the hand swept back
  var up = Math.cos(ph), dn = Math.sin(ph) > 0, ext = (dn ? 1 : 0.45 + 0.25 * (1 - Math.abs(up))) * (1 - fold * 0.8);
  function wing(far) {
    var sh = B(rx * 0.25, -ry * 0.4), span = L * 0.8, u2 = up * (far ? 0.85 : 1), arm = span * 0.38, hand = span * 0.55 * ext;
    var wr = [sh[0] - arm * (0.25 + 0.2 * (1 - Math.abs(u2))) - fold * rx * 0.4, sh[1] - arm * u2 * (1 - fold * 0.7)];
    var sweep = dn ? 0.25 : 0.85, tp = [wr[0] - hand * (sweep + 0.3 * (1 - Math.abs(u2))) - fold * rx * 0.5, wr[1] - hand * u2 * (1 - sweep * 0.5) * (1 - fold * 0.7)];
    if (fold > 0.6) { b3Edge(ctx, B(rx * 0.35, -ry * 0.45), B(-rx * 0.25, -ry * (far ? 0.7 : 0.6)), B(-rx * 1.35, -ry * 0.25), L * 0.2, S.wing, S.flight, far, 1); return; }   // folded tight back along the body (the dive)
    if (Math.abs(u2) < 0.4 && fold < 0.5) { b3Edge(ctx, sh, wr, tp, L * 0.2, S.wing, S.flight, far, 1 - Math.abs(u2) / 0.4); return; }   // level: the wing seen nearly edge-on
    b3Wing(ctx, sh, wr, tp, L * 0.2 * (1 - fold * 0.3), { cov: S.wing, sec: mixc(S.wing, S.flight, 0.35), pri: S.flight, tip: scl(S.flight, 0.8), fr: mixc(S.wing, [255, 255, 255], 0.25) }, { L: L, lod: lod, far: far, np: 8, ns: 7, slots: dn ? 0.4 : 0.1 });
  }
  wing(true);
  var ta = 0.05 + (o.brake || 0) * 0.6, r0 = B(-rx * 0.85, ry * 0.05), tL = S.tail * L;
  for (var fi = 0; fi < 6; fi++) b3Feather(ctx, r0, Math.PI + ta + pt + (fi / 5 - 0.5) * (0.2 + (o.brake || 0) * 0.5), tL, tL * 0.12, 0.65, S.tailC, scl(S.tailC, 0.65), null, 0);
  var Hc = B(rx * 0.95 + hr * 0.45, -ry * 0.25), bD = pSmooth([B(-rx, -ry * 0.1), B(-rx * 0.6, -ry * 0.9), B(rx * 0.4, -ry), B(rx * 1.0, -ry * 0.4), B(rx * 0.9, ry * 0.6), B(0, ry), B(-rx * 0.8, ry * 0.5)], true, 4), hD = [];
  for (var hi = 0; hi < 24; hi++) { var at2 = hi / 24 * TAU; hD.push([Hc[0] + Math.cos(at2) * hr, Hc[1] + Math.sin(at2) * hr * 0.95]); }
  var sil = new Path2D(); pPath(pWind(bD, true), sil); pPath(pWind(hD, true), sil);
  var gr = ctx.createLinearGradient(0, -ry, 0, ry); gr.addColorStop(0, zc(S.up, RL.hi)); gr.addColorStop(0.5, zc(S.up)); gr.addColorStop(0.62, zc(S.under)); gr.addColorStop(1, zc(S.under, RL.lo * 1.2)); ctx.fillStyle = gr; ctx.fill(sil);
  var hpp = pt * 0.5, chh = Math.cos(hpp), shh2 = Math.sin(hpp); function H(lx, ly) { return [Hc[0] + (lx * chh - ly * shh2) * hr, Hc[1] + (lx * shh2 + ly * chh) * hr]; }
  ctx.save(); ctx.clip(sil); zsoft(ctx, Hc[0], Hc[1] - hr * 0.2, hr * 1.1, hr, S.up, 1); b3Marks(ctx, kind, B, H, rx, ry, hr, S, 0); ctx.restore();
  ctx.save(); ctx.translate(Hc[0], Hc[1]); ctx.rotate(hpp);
  var bl = S.bill * L, bd = S.billD * L; ctx.fillStyle = zgrad2(ctx, 0, -bd, 0, bd, scl(S.billC, 1.4), scl(S.billC, 0.7), 1, 1); ctx.beginPath(); ctx.moveTo(hr * 0.75, -bd * 0.5); ctx.lineTo(hr * 0.8 + bl, 0); ctx.lineTo(hr * 0.75, bd * 0.5); ctx.closePath(); ctx.fill();
  if (kind === 'mejiro') { ctx.fillStyle = zc([250, 250, 246]); ctx.beginPath(); ctx.arc(hr * 0.32, -hr * 0.12, hr * 0.38, 0, TAU); ctx.fill(); }
  zeye(ctx, hr * 0.32, -hr * 0.12, hr * 0.19, S.eye, 1, false); ctx.restore();
  // the feet tucked up under the tail
  ctx.strokeStyle = zc(S.legs, 0.9); ctx.lineWidth = Math.max(L * 0.016, 0.6 / Math.max(1, RL.k)); ctx.lineCap = 'round'; var fq = B(-rx * 0.2, ry * 0.8), fq2 = B(-rx * 0.6, ry * 0.75); ctx.beginPath(); ctx.moveTo(fq[0], fq[1]); ctx.lineTo(fq2[0], fq2[1]); ctx.stroke(); ctx.lineCap = 'butt';
  wing(false);
}

function birdPaint2(ctx, kind, o) { sb3Paint(ctx, kind, o); }
function birdFlyPaint2(ctx, kind, o) { sb3Fly(ctx, kind, o); }

/* ================= the tall white waders =================
   コサギ (little egret, 60 cm, the garden's 白鷺): all white, a slim S-necked heron with a black dagger bill, black legs and
   yellow feet, two long nape plumes and lacy back plumes in the breeding season. 丹頂 (red-crowned crane, 1.4 m): white, the
   bare red crown, black face, throat and neck with a white band from behind the eye down the nape, the black inner wing
   feathers (secondaries and tertials) drooping over the white tail like a bustle, long dark legs, a heavy olive bill.
   Local frame: metres, feet at the origin; ext 0 neck folded .. 1 stretched; strike 0..1; step: walking phase (radians) */
var WADE = {
  sagi: { L: 0.62, legH: 0.36, body: 0.1, neck: 0.42, head: 0.032, bill: 0.085, white: [248, 248, 244], shade: [196, 204, 216], billC: [26, 24, 24], legs: [30, 28, 28], feet: [214, 190, 60], lore: [220, 210, 120], eye: [220, 190, 50] },
  tsuru: { L: 1.4, legH: 0.78, body: 0.2, neck: 0.62, head: 0.06, bill: 0.15, white: [248, 248, 246], shade: [200, 206, 218], billC: [150, 156, 120], legs: [44, 42, 44], feet: [44, 42, 44], black: [22, 22, 26], red: [214, 32, 36], eye: [60, 40, 30] }
};
/* an open wader wing as layered feathers: the secondaries along the arm, the primaries fanned from the wrist to the tip, two rows of
   coverts over their bases and the leading edge (sh shoulder, wr wrist, tp the hand's tip, ch the chord); the crane's
   secondaries are black, its primaries white */
function wdWing(ctx, S, cr, sh, wr, tp, ch, far, lod, L) {
  var k = far ? 0.84 : 1, wh = scl(S.white, k), sd = scl(S.shade, k), bk = cr ? scl(S.black, far ? 0.9 : 1) : null, ed = [S.shade, 0.3, L * 0.002];
  function frame(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; if (nx > 0) { nx = -nx; ny = -ny; } return { a: Math.atan2(dy, dx), n: Math.atan2(ny, nx) }; }
  var fa = frame(sh, wr), fh = frame(wr, tp);
  function aLerp(a0, a1, u) { var d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a0 + d * u; }
  var NP = lod ? 0 : 9, NS = lod ? 0 : 9, i, u;
  {   // the wing as one shape first (all that is drawn when it is small on screen): no gaps between the feathers laid over it
    var pp = [sh, wr, tp]; for (i = 6; i >= 0; i--) { u = i / 6; var r0 = [lerp(wr[0], tp[0], u), lerp(wr[1], tp[1], u)], an = aLerp(fh.n, fh.a, u * u); pp.push([r0[0] + Math.cos(an) * ch * lerp(1, 1.2, u), r0[1] + Math.sin(an) * ch * lerp(1, 1.2, u)]); }
    for (i = 5; i >= 0; i--) { u = i / 5; var r1 = [lerp(sh[0], wr[0], u), lerp(sh[1], wr[1], u)]; pp.push([r1[0] + Math.cos(fa.n) * ch * 0.85, r1[1] + Math.sin(fa.n) * ch * 0.85]); }
    var p0 = pPath(pp); ctx.fillStyle = zgrad2(ctx, sh[0], sh[1], tp[0], tp[1], wh, sd, RL.hi, lerp(RL.lo, 1, 0.3)); ctx.fill(p0);
    if (cr) { ctx.save(); ctx.clip(p0); var b0 = [lerp(sh[0], wr[0], 0.1) + Math.cos(fa.n) * ch * 0.4, lerp(sh[1], wr[1], 0.1) + Math.sin(fa.n) * ch * 0.4]; ctx.strokeStyle = zc(bk); ctx.lineWidth = ch * 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(wr[0] + Math.cos(fa.n) * ch * 0.5, wr[1] + Math.sin(fa.n) * ch * 0.5); ctx.stroke(); ctx.lineCap = 'butt'; ctx.restore(); }
    if (lod) return;
  }
  for (i = 0; i < NS; i++) {   // the secondaries (and the crane's black tertials near the body)
    u = (i + 0.5) / NS; var ra = [lerp(sh[0], wr[0], u), lerp(sh[1], wr[1], u)], ang = fa.n + (u - 0.5) * 0.25;
    sbDrawFeather(ctx, ra, ang, ch * (0.86 + 0.05 * Math.sin(i * 1.7)), ch * 0.22, 0.75, cr ? scl(bk, 1.3) : wh, cr ? bk : mixc(wh, sd, 0.7), cr ? [[90, 90, 100], 0.35, L * 0.002] : ed);
  }
  for (i = 0; i < NP; i++) {   // the primaries: fanned from the wrist, the outermost along the hand, longest near the tip
    u = i / (NP - 1); var rp = [lerp(wr[0], tp[0], u * 0.82), lerp(wr[1], tp[1], u * 0.82)], ap = aLerp(fh.n, fh.a, Math.pow(u, 1.4) * 0.85);
    sbDrawFeather(ctx, rp, ap, ch * lerp(0.95, 1.25, Math.sin(u * Math.PI * 0.6)), ch * 0.2, 0.55, wh, mixc(wh, sd, 0.7), ed);
  }
  for (i = 0; i < 12; i++) {   // the greater coverts over the bases of the flight feathers
    u = (i + 0.5) / 12; var rc = u < 0.55 ? [lerp(sh[0], wr[0], u / 0.55), lerp(sh[1], wr[1], u / 0.55)] : [lerp(wr[0], tp[0], (u - 0.55) / 0.45 * 0.6), lerp(wr[1], tp[1], (u - 0.55) / 0.45 * 0.6)];
    sbDrawFeather(ctx, rc, (u < 0.55 ? fa.n : fh.n) + 0.15, ch * 0.45, ch * 0.13, 0.7, wh, mixc(wh, sd, 0.45), ed);
  }
  var lc = pLimb([sh, wr, [lerp(wr[0], tp[0], 0.6), lerp(wr[1], tp[1], 0.6)]], [ch * 0.05, ch * 0.04, ch * 0.02], [ch * 0.3, ch * 0.24, ch * 0.12], 4), lp = pPath(lc.out);   // the lesser coverts: the soft leading edge of the arm
  ctx.fillStyle = zgrad2(ctx, sh[0], sh[1], tp[0], tp[1], wh, mixc(wh, sd, 0.4), RL.hi, lerp(RL.lo, 1, 0.5)); ctx.fill(lp);
  zrim(ctx, lp, L * 0.008, 1);
}
/* the waders, painted (v3): one continuous feathered body (an elongated teardrop torso, the long neck growing out of the breast as
   a feathered S, the small head on it, all filled as one shape), soft white plumage shaded cool where it turns from the light
   with a light texture of feathers; the folded wing as soft rows of coverts over the long flight feathers; the egret's lace of
   back plumes falling past the tail and the two fine nape plumes; the crane's black inner wing feathers draped over the tail as a
   fluffy bustle, its black throat and neck with the white band down the nape, the bare red crown. Legs as shaded round limbs with
   the heel bending back; open wings as layered feathers (b3Wing). Local frame: metres, feet at the origin, y down, facing +x */
var WD3 = {
  sagi: { rx: 0.115, ry: 0.052, nL: 0.3, nw0: 0.03, nw1: 0.014, hr: 0.024, bill: 0.085, billD: 0.012, legH: 0.33, pitch: -0.32, wChord: 0.15, wSpan: 0.5 },
  tsuru: { rx: 0.29, ry: 0.13, nL: 0.6, nw0: 0.075, nw1: 0.032, hr: 0.05, bill: 0.15, billD: 0.024, legH: 0.74, pitch: -0.18, wChord: 0.36, wSpan: 1.15 }
};
function wd3Spine(kind, ext, sk, o) {   // the neck's centre line, in neck lengths from its base (x forward, y down)
  var cr = kind === 'tsuru', P;
  function mix(A, Bq, u) { return A.map(function (q, i) { return [lerp(q[0], Bq[i][0], u), lerp(q[1], Bq[i][1], u)]; }); }
  if (cr) {
    var rest = [[0, 0], [0.07, -0.3], [0.12, -0.6], [0.16, -0.85], [0.26, -0.98]], low = [[0, 0], [0.12, -0.22], [0.25, -0.42], [0.32, -0.6], [0.42, -0.66]];
    P = mix(low, rest, ext);
    if (o.call) P = mix(P, [[0, 0], [0.03, -0.3], [0.04, -0.62], [0.02, -0.88], [-0.04, -1.02]], 1);   // the head thrown back to call
  } else {
    var fold = [[0, 0], [0.06, -0.22], [-0.04, -0.4], [0.06, -0.56], [0.2, -0.6]], str = [[0, 0], [0.1, -0.3], [0.13, -0.58], [0.26, -0.8], [0.42, -0.86]];
    P = mix(fold, str, ext);
  }
  var strike = cr ? [[0, 0], [0.25, -0.1], [0.5, 0.05], [0.7, 0.28], [0.82, 0.5]] : [[0, 0], [0.26, -0.1], [0.52, -0.02], [0.72, 0.14], [0.85, 0.3]];   // a smooth extended curve, forward and down
  return mix(P, strike, sk);
}
function wd3Paint(ctx, kind, o) {
  var S = WADE[kind], D = WD3[kind], cr = kind === 'tsuru', L = S.L, t = o.t || 0, m, ext = clamp(o.ext === undefined ? 0.5 : o.ext), sk = clamp(o.strike || 0), st = o.step;
  RL.k = pScale(ctx); m = pLm();
  var lod = MODE === 'm' || RL.k * L < 50, lw = Math.max(L * 0.002, 0.6 / Math.max(1, RL.k)), WH = S.white, SH = S.shade;
  var legH = D.legH * (1 - (o.crouch || 0) * 0.2), br = Math.sin(t * 1.5) * L * 0.002;
  var pitch = D.pitch + (o.pitch || 0) + sk * 0.12, c = Math.cos(pitch), s = Math.sin(pitch), rx = D.rx, ry = D.ry;
  var bc = [-rx * 0.1, -legH - ry * 0.55 + br];
  function B(lx, ly) { return [bc[0] + lx * c - ly * s, bc[1] + lx * s + ly * c]; }
  var hip = B(-rx * 0.05, ry * 0.5);
  // the legs: the thigh hidden in the belly feathers, the heel (the ankle) bending back, the long bare tarsus, the long toes
  function leg(far) {
    var pp = far ? Math.PI : 0, moving = st !== null && st !== undefined, lift = moving ? Math.max(0, Math.sin(st + pp)) : 0, fx = moving ? Math.cos(st + pp) * L * 0.09 : (far ? -1 : 1) * L * 0.02;
    var foot = [fx, -lift * L * 0.05], heel = [lerp(hip[0], foot[0], 0.5) - L * 0.03 - lift * L * 0.05, lerp(hip[1], foot[1], 0.48) - lift * L * 0.02], k2 = far ? 0.75 : 1;
    var lb = pLimb([hip, [lerp(hip[0], heel[0], 0.5) + L * 0.008, lerp(hip[1], heel[1], 0.5)], heel, [lerp(heel[0], foot[0], 0.5), lerp(heel[1], foot[1], 0.5)], foot], [L * 0.012, L * 0.009, L * 0.008, L * 0.0055, L * 0.005], [L * 0.012, L * 0.009, L * 0.008, L * 0.0055, L * 0.005], 4);
    var a0 = lb.at(0.6, -1), a1 = lb.at(0.6, 1), g = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]); g.addColorStop(0, zc(scl(S.legs, 1.8 * k2))); g.addColorStop(0.45, zc(scl(S.legs, k2))); g.addColorStop(1, zc(scl(S.legs, 0.6 * k2)));
    ctx.fillStyle = g; ctx.fill(pPath(lb.out));
    var hk = lb.at(0.5, 0); ctx.fillStyle = zc(scl(S.legs, 0.9 * k2)); ctx.beginPath(); ctx.ellipse(hk[0], hk[1], L * 0.009, L * 0.011, 0, 0, TAU); ctx.fill();   // the heel joint
    ctx.strokeStyle = zc(scl(S.feet, k2)); ctx.lineWidth = Math.max(lw * 1.5, L * 0.006); ctx.lineCap = 'round'; ctx.beginPath();
    var tg = lift > 0.2 ? 0.7 : 0; [[0.09, 0.01], [0.06, 0.004], [-0.04, 0.003]].forEach(function (q, i) { ctx.moveTo(foot[0], foot[1]); ctx.lineTo(foot[0] + q[0] * L * (1 - tg * 0.4), foot[1] + q[1] * L + tg * L * 0.04 * (i < 2 ? 1 : 0)); }); ctx.stroke(); ctx.lineCap = 'butt';
  }
  leg(true);
  // the neck's line and the head
  var nb = B(rx * 0.78, -ry * 0.25), sp = wd3Spine(kind, ext, sk, o), nL = D.nL, hd = o.head || {};
  var pts = sp.map(function (q) { return [nb[0] + q[0] * nL, nb[1] + q[1] * nL]; }), head = pts[pts.length - 1], pre = pts[pts.length - 2];
  var tA = Math.atan2(head[1] - pre[1], head[0] - pre[0]), bA = sk > 0.3 ? lerp(0.1, tA, sk) : (hd.pitch || 0) * 0.8 + (o.call ? -1.0 : 0) + 0.08 + (1 - ext) * 0.05;   // the bill's angle: level, or along the neck in the strike
  var hr = D.hr, nw = [D.nw0 * 1.4, D.nw0, D.nw1 * 1.2, D.nw1, hr * 0.75];
  var nk = pLimb([B(rx * 0.35, -ry * 0.1)].concat(pts), [ry * 0.9].concat(nw), [ry * 0.95].concat(nw.map(function (v, i) { return v * (i === 0 ? 1.15 : 1); })), 5);
  // the body: an elongated teardrop, the breast full and round, tapering to the tail
  var bodyD = pSmooth([B(rx * 1.0, -ry * 0.1), B(rx * 0.75, -ry * 0.85), B(0, -ry * 1.0), B(-rx * 0.8, -ry * 0.7), B(-rx * 1.35, -ry * 0.05), B(-rx * 0.85, ry * 0.55), B(0, ry * 0.95), B(rx * 0.7, ry * 0.75)], true, 4);
  var hD = []; for (var hi = 0; hi < 20; hi++) { var ha = hi / 20 * TAU, hx = Math.cos(ha) * hr * 1.25, hy = Math.sin(ha) * hr * 0.95; hD.push([head[0] + hx * Math.cos(bA) - hy * Math.sin(bA), head[1] + hx * Math.sin(bA) + hy * Math.cos(bA)]); }
  var sil = new Path2D(); [bodyD, nk.out, hD].forEach(function (d) { pPath(pWind(d, true), sil); });
  if (!lod) qFuzz(ctx, sil, WH, SH, head[1], bc[1] + ry, lw * 1.5);
  var top = Math.min(head[1], bc[1] - ry), g1 = ctx.createLinearGradient(0, top, 0, bc[1] + ry);
  g1.addColorStop(0, zc(WH, RL.hi)); g1.addColorStop(0.7, zc(WH, 0.98)); g1.addColorStop(1, zc(mixc(WH, SH, 0.7), lerp(RL.lo, 1, 0.45)));
  ctx.fillStyle = g1; ctx.fill(sil);
  ctx.save(); ctx.clip(sil);
  // the turn of the form: cool shade down the belly and under the neck, light along the back
  zsoft(ctx, B(-rx * 0.1, ry * 0.7)[0], B(-rx * 0.1, ry * 0.7)[1], rx * 1.0, ry * 0.45, SH, 0.45, 1, pitch);
  zsoft(ctx, B(rx * 0.1, -ry * 0.75)[0], B(rx * 0.1, -ry * 0.75)[1], rx * 0.9, ry * 0.3, [255, 252, 244], 0.35, 1, pitch);
  var vnw = [-s, c], bw0 = B(0, 0), gW = ctx.createLinearGradient(bw0[0] - vnw[0] * ry, bw0[1] - vnw[1] * ry, bw0[0] + vnw[0] * ry, bw0[1] + vnw[1] * ry);   // the body in the round: rim-lit back, a cool belly
  gW.addColorStop(0, 'rgba(255,252,240,0.25)'); gW.addColorStop(0.35, 'rgba(255,252,240,0)'); gW.addColorStop(0.7, 'rgba(60,70,100,0.1)'); gW.addColorStop(1, 'rgba(50,60,95,0.32)'); ctx.fillStyle = gW; ctx.fill(pPath(bodyD));
  if (!lod) { var RSW = mulberry32(kind.length * 17), scw = new Path2D(); for (var rw2 = 0; rw2 < 5; rw2++) for (var kw = 0; kw < 8; kw++) { var wq2 = B(rx * (0.8 - kw * 0.25 + (rw2 % 2) * 0.12), ry * (-0.1 + rw2 * 0.2)), wr2 = rx * 0.07 * (0.8 + RSW() * 0.4); scw.moveTo(wq2[0] + Math.cos(pitch + 0.5) * wr2, wq2[1] + Math.sin(pitch + 0.5) * wr2); scw.arc(wq2[0], wq2[1], wr2, pitch + 0.5, pitch + 2.6); } ctx.strokeStyle = zc(SH, 0.9, 0.25); ctx.lineWidth = lw; ctx.stroke(scw); }   // the breast and flank feathers, faint
  for (var su = 0.2; su < 0.95; su += 0.25) { var nq = nk.at(su, 0.7); zsoft(ctx, nq[0], nq[1], nL * 0.12, D.nw0 * 0.6, SH, 0.3, 1, Math.atan2(nk.at(su + 0.05, 0)[1] - nk.at(su, 0)[1], nk.at(su + 0.05, 0)[0] - nk.at(su, 0)[0])); }
  if (cr) {   // the black throat and neck sides, the white band from behind the eye down the nape; white again at the base
    var blk = []; for (var u = 0.16; u <= 1.0001; u += 0.04) blk.push(nk.at(u, 1.3));
    for (u = 1.0; u >= 0.16; u -= 0.04) blk.push(nk.at(u, lerp(-0.1, -0.55, clamp((u - 0.2) / 0.6))));
    var bpth = pPath(pSmooth(blk, true, 2)); ctx.fillStyle = zgrad2(ctx, nb[0], nb[1], head[0], head[1], S.black, scl(S.black, 1.25), 1, 1); ctx.fill(bpth);
    ctx.strokeStyle = zc(S.black, 1, 0.35); ctx.lineWidth = lw * 3; ctx.stroke(bpth);   // its edge a little soft
    var nb2 = nk.at(0.14, 0.4); zsoft(ctx, nb2[0], nb2[1], D.nw0 * 1.6, D.nw0 * 1.1, WH, 0.9);
  }
  // the folded wing: soft rows of coverts over the long flight feathers, lying back along the side
  var wo = clamp(o.wings || 0);
  if (!lod && wo < 0.05) {
    ctx.lineWidth = lw * 1.2; ctx.lineCap = 'round';
    for (var row = 0; row < 4; row++) for (var kf = 0; kf < 6 - row; kf++) { var fq = B(rx * (0.55 - kf * 0.26 - row * 0.12), -ry * (0.55 - row * 0.28)); ctx.strokeStyle = zc(SH, 0.92, 0.35); ctx.beginPath(); ctx.arc(fq[0], fq[1], rx * 0.13, pitch + 0.5, pitch + 2.4); ctx.stroke(); }
    for (var fp = 0; fp < 5; fp++) { var p0 = B(-rx * (0.1 + fp * 0.12), ry * (0.05 + fp * 0.06)), p1 = B(-rx * (1.0 + fp * 0.04), -ry * (0.15 - fp * 0.08)); ctx.strokeStyle = zc(SH, 0.85, 0.3); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.5) + ry * 0.05, p1[0], p1[1]); ctx.stroke(); }   // the long primaries lying along the side
  }
  // the feather texture: short soft strokes along the lie of the plumage (along the body, down the neck)
  if (!lod) {
    var tx = new Path2D(), R = pRand('wd3' + kind, 220), bb = pBox(bodyD);
    for (var k = 0; k < 140; k++) { var x = lerp(bb[0], bb[2], R[k * 4]), y = lerp(bb[1], bb[3], R[k * 4 + 1]); if (!pInside(bodyD, x, y)) continue; var a = Math.PI + pitch + 0.2 + (R[k * 4 + 2] - 0.5) * 0.4, l2 = rx * 0.12 * (0.6 + R[k * 4 + 3] * 0.6); tx.moveTo(x, y); tx.quadraticCurveTo(x + Math.cos(a) * l2 * 0.5 - Math.sin(a) * l2 * 0.15, y + Math.sin(a) * l2 * 0.5 + Math.cos(a) * l2 * 0.15, x + Math.cos(a) * l2, y + Math.sin(a) * l2); }
    for (k = 140; k < 220; k++) { var nu = 0.1 + R[k * 4] * 0.85, nv = R[k * 4 + 1] * 2 - 1, q = nk.at(nu, nv), a2 = q[2] + Math.PI + (R[k * 4 + 2] - 0.5) * 0.3, l3 = nL * 0.05; tx.moveTo(q[0], q[1]); tx.lineTo(q[0] + Math.cos(a2) * l3, q[1] + Math.sin(a2) * l3); }
    ctx.strokeStyle = zc(SH, 0.95, 0.3); ctx.lineWidth = lw * 1.1; ctx.lineCap = 'round'; ctx.stroke(tx);
  }
  ctx.restore();
  zrim(ctx, sil, L * 0.006, 0.9);
  // the plumes: the egret's lace falling past the tail; the crane's black bustle
  if (cr) {
    // the bustle: the long black tertials and inner secondaries, loose and curling, draping down over the white tail from the back
    var RB = mulberry32(13), NB = lod ? 6 : 13;
    for (var bk = 0; bk < NB; bk++) {   // separate long plumes, curving back and down over the tail, each tapering to a curled tip, with a sheen
      var u0 = bk / (NB - 1), at0 = B(-rx * (0.1 + u0 * 0.72), -ry * (0.86 - u0 * 0.3) + (RB() - 0.5) * ry * 0.08);
      var Lb = rx * (0.75 + RB() * 0.35) * (0.8 + 0.3 * Math.sin(u0 * Math.PI)), aB = Math.PI + pitch - 0.2 - u0 * 0.3 + (RB() - 0.5) * 0.15, droop = Lb * (0.45 + u0 * 0.3 + RB() * 0.15);
      var P0 = at0, P2 = [P0[0] + Math.cos(aB) * Lb * 0.85, P0[1] + Math.sin(aB) * Lb + droop], P1 = [lerp(P0[0], P2[0], 0.55), lerp(P0[1], P2[1], 0.2)], curl = [P2[0] + rx * 0.05, P2[1] + rx * 0.03];
      var lb = pLimb([P0, P1, P2, curl], [rx * 0.07, rx * 0.075, rx * 0.035, rx * 0.006], [rx * 0.06, rx * 0.065, rx * 0.03, rx * 0.006], 4), pq = pPath(lb.out);
      ctx.save(); ctx.translate(rx * 0.015, rx * 0.03); ctx.fillStyle = zc([16, 14, 20], 1, 0.22); ctx.fill(pq); ctx.restore();   // its soft shadow on what is under it
      var e0 = lb.at(0.3, -1), e1 = lb.at(0.3, 1), gB2 = ctx.createLinearGradient(e0[0], e0[1], e1[0], e1[1]), sh2 = 1.25 + RB() * 0.5;
      gB2.addColorStop(0, zc(scl(S.black, sh2 + 0.4))); gB2.addColorStop(0.45, zc(scl(S.black, sh2))); gB2.addColorStop(1, zc(scl(S.black, 0.9)));
      ctx.fillStyle = gB2; ctx.fill(pq);
      if (!lod) { ctx.strokeStyle = zc([150, 152, 168], 1, 0.3); ctx.lineWidth = lw * 1.2; ctx.beginPath(); for (var j = 0; j <= 8; j++) { var q = lb.at(0.05 + j / 8 * 0.8, -0.35); if (j) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke();   // the sheen along the plume
        ctx.strokeStyle = zc(scl(S.black, 1.8), 1, 0.35); ctx.lineWidth = lw * 0.8; ctx.beginPath(); for (j = 0; j < 6; j++) { var q2 = lb.at(0.25 + j * 0.12, 0.9), q3 = lb.at(0.3 + j * 0.12, 1.6); ctx.moveTo(q2[0], q2[1]); ctx.lineTo(q3[0], q3[1]); } ctx.stroke(); }   // loose barbs at its edge
    }
  } else if (o.plumes) {
    var RP = mulberry32(29), pl = new Path2D(), pl2 = new Path2D(), sway = Math.sin(t * 1.2) * 0.02;
    for (var pk = 0; pk < 18; pk++) {
      var r0 = B(-rx * (0.1 + RP() * 0.5), -ry * (0.75 - RP() * 0.3)), Lp = rx * (1.3 + RP() * 0.7), aP = Math.PI + pitch + 0.18 + RP() * 0.25 + sway, e0 = [r0[0] + Math.cos(aP) * Lp, r0[1] + Math.sin(aP) * Lp + Lp * 0.18], mq = [lerp(r0[0], e0[0], 0.55), lerp(r0[1], e0[1], 0.55) - Lp * 0.04], pq2 = pk % 3 ? pl : pl2;
      pq2.moveTo(r0[0], r0[1]); pq2.quadraticCurveTo(mq[0], mq[1], e0[0], e0[1]);
      if (!lod) for (var bb2 = 0.35; bb2 < 1; bb2 += 0.16) { var bq = [lerp(lerp(r0[0], mq[0], bb2), lerp(mq[0], e0[0], bb2), bb2), lerp(lerp(r0[1], mq[1], bb2), lerp(mq[1], e0[1], bb2), bb2)]; pl.moveTo(bq[0], bq[1]); pl.lineTo(bq[0] - Math.cos(aP - 0.6) * rx * 0.08, bq[1] - Math.sin(aP - 0.6) * rx * 0.08 + rx * 0.03); }   // the fine barbs: a lace, not a line
    }
    ctx.lineCap = 'round'; ctx.strokeStyle = zc(WH, 1, 0.45); ctx.lineWidth = lw; ctx.stroke(pl); ctx.strokeStyle = zc(WH, 1, 0.7); ctx.lineWidth = lw * 1.3; ctx.stroke(pl2);
  }
  // open wings (the crane's dance, a balance on landing): layered, the far one behind
  if (wo > 0.02) {
    [-1, 1].forEach(function (sd) {
      var sh = B(rx * (0.35 - sd * 0.06), -ry * 0.75), span = D.wSpan * (0.5 + 0.5 * wo), wr = [sh[0] - span * (0.15 + 0.05 * sd), sh[1] - span * (0.4 + 0.05 * sd) * wo], tp = [wr[0] - span * (0.3 + 0.08 * sd), wr[1] - span * (0.3 + 0.06 * sd) * wo + span * 0.2 * (1 - wo)];
      b3Wing(ctx, sh, wr, tp, D.wChord * (0.6 + 0.4 * wo), cr ? { cov: WH, gcov: mixc(WH, SH, 0.2), sec: S.black, secT: scl(S.black, 1.3), pri: WH, tip: mixc(WH, SH, 0.5), fr: SH } : { cov: WH, sec: mixc(WH, SH, 0.25), pri: WH, tip: mixc(WH, SH, 0.45), fr: SH }, { L: L, lod: lod, far: sd < 0, np: 10, ns: 12, slots: cr ? 0.7 : 0.4 });
    });
  }
  leg(false);
  // the head and the dagger bill
  ctx.save(); ctx.translate(head[0], head[1]); ctx.rotate(bA);
  var bl = D.bill, bd = D.billD, ex = hr * 1.05;
  if (cr) {   // black face and throat, the white band behind the eye running down the nape, the bare red crown (matte skin)
    var hp2 = new Path2D(); hp2.ellipse(0, 0, hr * 1.25, hr * 0.95, 0, 0, TAU); ctx.save(); ctx.clip(hp2);
    ctx.fillStyle = zc(S.black); ctx.fillRect(-hr * 2, -hr * 2, hr * 4, hr * 4);
    zsoft(ctx, -hr * 0.9, hr * 0.15, hr * 0.7, hr * 0.5, WH, 1); zsoft(ctx, -hr * 0.4, -hr * 0.05, hr * 0.35, hr * 0.25, WH, 0.9);
    var rc = ctx.createRadialGradient(hr * 0.05, -hr * 0.75, 0, hr * 0.05, -hr * 0.6, hr * 0.7); rc.addColorStop(0, zc(scl(S.red, 1.05))); rc.addColorStop(0.75, zc(scl(S.red, 0.85))); rc.addColorStop(1, zc(scl(S.red, 0.6), 1, 0));
    ctx.fillStyle = rc; ctx.beginPath(); ctx.ellipse(hr * 0.05, -hr * 0.62, hr * 0.75, hr * 0.42, 0.1, 0, TAU); ctx.fill();
    if (!lod) { var RR = mulberry32(5); ctx.fillStyle = zc(scl(S.red, 0.7), 1, 0.5); for (var rk = 0; rk < 10; rk++) { ctx.beginPath(); ctx.arc(hr * (-0.4 + RR() * 0.9), -hr * (0.45 + RR() * 0.4), hr * 0.05, 0, TAU); ctx.fill(); } }   // the skin's papillae
    ctx.restore();
  } else {
    var hp3 = new Path2D(); hp3.ellipse(0, 0, hr * 1.25, hr * 0.95, 0, 0, TAU); ctx.save(); ctx.clip(hp3); zsoft(ctx, hr * 0.8, -hr * 0.05, hr * 0.5, hr * 0.3, S.lore, 0.85); zsoft(ctx, 0, hr * 0.5, hr * 1.1, hr * 0.5, SH, 0.35); ctx.restore();   // the yellow lore; the shade under the jaw
    if (o.plumes) { ctx.strokeStyle = zc(WH, 1, 0.9); ctx.lineWidth = lw * 1.4; ctx.lineCap = 'round'; var pw = Math.sin(t * 1.3) * 0.08; ctx.beginPath(); ctx.moveTo(-hr * 0.7, -hr * 0.4); ctx.quadraticCurveTo(-hr * 2.6, -hr * 0.3 + pw * hr, -hr * 3.8, hr * 1.1); ctx.moveTo(-hr * 0.7, -hr * 0.25); ctx.quadraticCurveTo(-hr * 2.3, hr * 0.1 + pw * hr, -hr * 3.2, hr * 1.5); ctx.stroke(); }   // the two fine nape plumes
  }
  var op = o.call ? bd * 0.7 : 0, gB = ctx.createLinearGradient(0, -bd, 0, bd); gB.addColorStop(0, zc(scl(S.billC, 1.6))); gB.addColorStop(0.4, zc(S.billC)); gB.addColorStop(1, zc(scl(S.billC, 0.65)));
  ctx.fillStyle = gB; ctx.beginPath(); ctx.moveTo(ex - hr * 0.3, -bd); ctx.quadraticCurveTo(ex + bl * 0.5, -bd * 0.75, ex + bl, -op * 0.3); ctx.lineTo(ex - hr * 0.2, bd * 0.1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(ex - hr * 0.2, bd * 0.15); ctx.lineTo(ex + bl * 0.96, op); ctx.quadraticCurveTo(ex + bl * 0.45, bd * 0.8 + op * 0.4, ex - hr * 0.3, bd * 0.9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = zc(scl(S.billC, 0.4), 1, 0.6); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ex - hr * 0.2, bd * 0.12); ctx.lineTo(ex + bl * 0.95, op * 0.5); ctx.stroke();
  if (o.fishUp > 0.05) { ctx.save(); ctx.translate(ex + bl * 0.75, bd * 0.3); ctx.scale(L * 1.1, L * 1.1); ctx.globalAlpha *= o.fishUp; kfFish(ctx, -0.02, 0, 0.3); ctx.restore(); }
  zeye(ctx, hr * 0.42, -hr * 0.12, hr * 0.2, S.eye, o.blink === undefined ? 1 : o.blink, false);
  ctx.restore();
}
/* in flight, side-on: the egret with its neck drawn back into an S on its shoulders, the crane with its neck straight out; the legs
   trailing past the tail with a slight droop (reaching down to land); the wings layered and beating through a real stroke */
function wd3Fly(ctx, kind, o) {
  var S = WADE[kind], D = WD3[kind], cr = kind === 'tsuru', L = S.L, m, ld = clamp(o.land || 0), pitch = (o.pitch || 0) - ld * 0.45;
  RL.k = pScale(ctx); m = pLm();
  var lod = MODE === 'm' || RL.k * L < 50, lw = Math.max(L * 0.002, 0.6 / Math.max(1, RL.k)), WH = S.white, SH = S.shade, ph = o.ph || 0;
  var c = Math.cos(pitch), s = Math.sin(pitch), rx = D.rx * 1.05, ry = D.ry * 0.85; function B(lx, ly) { return [lx * c - ly * s, lx * s + ly * c]; }
  var up = o.glide ? 0.1 : Math.cos(ph), dn = Math.sin(ph) > 0 || o.glide, ext = dn ? 1 : 0.55 + 0.2 * (1 - Math.abs(up));
  if (ld > 0) { up = lerp(up, 0.8, ld); ext = lerp(ext, 0.9, ld); }
  function wing(far) {
    var sh = B(rx * 0.25, -ry * 0.45), span = D.wSpan, u2 = up * (far ? 0.85 : 1), arm = span * 0.42, hand = span * 0.5 * ext;
    var wr = [sh[0] - arm * (0.2 + 0.25 * (1 - Math.abs(u2))), sh[1] - arm * u2], sweep = dn ? 0.25 : 0.8, tp = [wr[0] - hand * (sweep + 0.3 * (1 - Math.abs(u2))), wr[1] - hand * u2 * (1 - sweep * 0.5)];
    if (Math.abs(u2) < 0.35) { b3Edge(ctx, sh, wr, tp, D.wChord, WH, SH, far, 1 - Math.abs(u2) / 0.35, cr ? S.black : null); return; }
    b3Wing(ctx, sh, wr, tp, D.wChord, cr ? { cov: WH, gcov: mixc(WH, SH, 0.2), sec: S.black, secT: scl(S.black, 1.3), pri: WH, tip: mixc(WH, SH, 0.5), fr: SH } : { cov: WH, sec: mixc(WH, SH, 0.25), pri: WH, tip: mixc(WH, SH, 0.45), fr: SH }, { L: L, lod: lod, far: far, np: 10, ns: 12, slots: cr ? 0.8 : 0.45 });
  }
  wing(true);
  // the legs trailing (or reaching down to land): round, a little apart, drooping toward the feet
  var hipP = B(-rx * 0.55, ry * 0.35), la = lerp(0.12, 1.25, ld), lL = D.legH * 0.95;
  [0.012, -0.012].forEach(function (dz, i) {
    var ft = [hipP[0] - Math.cos(la + i * 0.05) * lL, hipP[1] + Math.sin(la + i * 0.05) * lL + lL * 0.06], md = [lerp(hipP[0], ft[0], 0.5), lerp(hipP[1], ft[1], 0.5) + lL * 0.03];
    var lb = pLimb([hipP, md, ft], [L * 0.011, L * 0.007, L * 0.005], [L * 0.011, L * 0.007, L * 0.005], 4), a0 = lb.at(0.5, -1), a1 = lb.at(0.5, 1), g = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
    g.addColorStop(0, zc(scl(S.legs, 1.7 * (i ? 0.8 : 1)))); g.addColorStop(1, zc(scl(S.legs, 0.6 * (i ? 0.8 : 1)))); ctx.fillStyle = g; ctx.fill(pPath(lb.out));
    ctx.strokeStyle = zc(S.feet); ctx.lineWidth = Math.max(lw * 1.4, L * 0.005); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ft[0], ft[1]); ctx.lineTo(ft[0] - Math.cos(la) * L * 0.07, ft[1] + Math.sin(la) * L * 0.07 + L * 0.01); ctx.stroke(); ctx.lineCap = 'butt';
    void dz;
  });
  var bodyD = pSmooth([B(rx, -ry * 0.1), B(rx * 0.6, -ry * 0.85), B(-rx * 0.4, -ry * 0.85), B(-rx * 1.25, -ry * 0.1), B(-rx * 0.6, ry * 0.7), B(rx * 0.5, ry * 0.75)], true, 4), hr = D.hr, nb = B(rx * 0.85, -ry * 0.15), pts, head;
  if (cr) { head = B(rx * 0.85 + D.nL * 0.95, -ry * 0.3); pts = [B(rx * 0.4, 0), nb, [lerp(nb[0], head[0], 0.5), lerp(nb[1], head[1], 0.5) - ry * 0.05], head]; }
  else { head = B(rx * 1.05 + hr * 2.5, -ry * 0.7); pts = [B(rx * 0.4, 0), nb, B(rx * 1.25, ry * 0.45), B(rx * 1.45, -ry * 0.1), head]; }   // the egret's neck folded back into an S, the bulge under the throat
  var nwv = cr ? [ry * 0.8, D.nw0, D.nw1 * 1.1, hr * 0.75] : [ry * 0.8, D.nw0 * 1.2, D.nw0 * 1.1, D.nw1 * 1.3, hr * 0.8];
  var nk = pLimb(pts, nwv, nwv, 5), hD = []; for (var hi = 0; hi < 20; hi++) { var ha = hi / 20 * TAU; hD.push([head[0] + Math.cos(ha) * hr * 1.25, head[1] + Math.sin(ha) * hr * 0.95]); }
  var sil = new Path2D(); [bodyD, nk.out, hD].forEach(function (d) { pPath(pWind(d, true), sil); });
  var g1 = ctx.createLinearGradient(0, -ry, 0, ry); g1.addColorStop(0, zc(WH, RL.hi)); g1.addColorStop(1, zc(mixc(WH, SH, 0.7), lerp(RL.lo, 1, 0.45))); ctx.fillStyle = g1; ctx.fill(sil);
  ctx.save(); ctx.clip(sil); zsoft(ctx, 0, ry * 0.6, rx * 1.1, ry * 0.4, SH, 0.4);
  if (cr) { var blk = []; for (var u = 0.3; u <= 1.0001; u += 0.05) blk.push(nk.at(u, 1.3)); for (u = 1; u >= 0.3; u -= 0.05) blk.push(nk.at(u, -0.2)); ctx.fillStyle = zc(S.black); ctx.fill(pPath(blk)); }
  ctx.restore();
  if (cr) { var bus = []; for (var bk = 0; bk < 6; bk++) bus.push(B(-rx * (0.6 + bk * 0.12), ry * (-0.2 + bk * 0.06))); ctx.strokeStyle = zc(S.black); ctx.lineWidth = ry * 0.35; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bus[0][0], bus[0][1]); bus.forEach(function (q) { ctx.lineTo(q[0], q[1]); }); ctx.stroke(); ctx.lineCap = 'butt'; }   // the black of the inner wing along the trailing edge at the body
  ctx.save(); ctx.translate(head[0], head[1]); ctx.rotate(pitch * 0.5);
  if (cr) { ctx.fillStyle = zc(S.black); ctx.beginPath(); ctx.ellipse(0, 0, hr * 1.25, hr * 0.95, 0, 0, TAU); ctx.fill(); ctx.fillStyle = zc(scl(S.red, 0.9)); ctx.beginPath(); ctx.ellipse(0, -hr * 0.6, hr * 0.6, hr * 0.35, 0, 0, TAU); ctx.fill(); zsoft(ctx, -hr * 0.8, hr * 0.2, hr * 0.5, hr * 0.35, WH, 1); }
  else zsoft(ctx, hr * 0.8, -hr * 0.05, hr * 0.5, hr * 0.3, S.lore, 0.8);
  ctx.fillStyle = zgrad2(ctx, 0, -D.billD, 0, D.billD, scl(S.billC, 1.5), scl(S.billC, 0.7), 1, 1); ctx.beginPath(); ctx.moveTo(hr * 0.8, -D.billD); ctx.lineTo(hr + D.bill, 0); ctx.lineTo(hr * 0.8, D.billD); ctx.closePath(); ctx.fill();
  zeye(ctx, hr * 0.42, -hr * 0.12, hr * 0.2, S.eye, 1, false); ctx.restore();
  wing(false);
}

function waderPaint(ctx, kind, o) { wd3Paint(ctx, kind, o); }
function waderFlyPaint(ctx, kind, o) { wd3Fly(ctx, kind, o); }

/* ================= the visits, new style: each a plan made once (paths on the walkable grid) and a pose read from it =================
   RV[id] = { start(a, g, R, rng), draw(ctx, a, g) -> still going?, startle(a, g) }. a.dOcc is the depth the visitor stands
   at (for the occlusion by what is in front of it), a.ext its rough size in metres, a.refl whether it shows in the pond. */
var RV = {};
function zGeoReady(R) { if (!R.obs) R.obs = rareObstacles(); if (R.horizon === undefined) R.horizon = P(0, 0, LAY.fenceZ).y; return zGrid(R); }
/* the quickest way off: the nearer frame side at about this depth, run at speed */
function zFlee(a, g, gait, v, stride, cls, rad, delay) {
  var R = g.rp, G = zGeoReady(R), q = zWalker(a, a.t), fd = a.face || (q.hx > 0 ? 1 : -1);   // keep going the way it faces unless the other way out is much nearer
  var to = zExitPick(G, R, cls || 'land', rad || 0.2, [q.x, q.z], fd, q.z) || zEdge(R, q.z, fd, 1.8), t0 = a.t + (delay || 0);
  a.flee = { tA: a.t, t0: t0, W: zWalkPlan(G, cls || 'land', rad || 0.2, [q.x, q.z], [{ to: to, gait: gait, v: v, stride: stride, ra: 0.35 }], null, t0, true) };
  a.T = a.flee.W.T;
}
function zLook(t, seed, base) { // an animal's idle head: slow looks around, now and then a turn toward the viewer
  return { yaw: clamp(base || 0) + 0.5 * Math.max(0, vnoise1(seed, t * 0.35) - 0.45) * 2, pitch: (vnoise1(seed + 9, t * 0.5) - 0.5) * 0.25 };
}

/* ---- キツネ: along the fence at dusk and at night: a careful walk in, a stop to look and listen, a mousing pounce in the grass, a trot away ---- */
RV.kitsune = {
  start: function (a, g, R, rng) {
    var G = zGeoReady(R), fz = R.fenceZ - 0.75, dir = rng() < 0.5 ? 1 : -1;
    function nearFence(x, z) { return Math.abs(z - fz) * 0.9; }
    // in along the fence from one side (the side it can reach: the hill closes the fence line on the right), so it heads across
    var A = zExitPick(G, R, 'land', 0.22, [LX(0.5), fz], -dir, fz) || zEdge(R, fz, -dir, 1.8); dir = A[0] < LX(0.5) ? 1 : -1;
    var s1 = zPickStop(G, R, 'land', 0.25, rng, function (x, z, p) { return -Math.abs(z - fz) * 1.5 - Math.abs(p.x - g.W * (dir > 0 ? 0.36 : 0.64)) / g.W * 6; }) || [LX(0), fz];
    var s2 = zPickStop(G, R, 'land', 0.25, rng, function (x, z, p) { return -Math.abs(z - fz + 1.6) * 0.8 - Math.abs(p.x - g.W * (dir > 0 ? 0.66 : 0.34)) / g.W * 6; }, [s1], 0.5, zDistFrom(G, 'land', 0.25, s1)) || [LX(1.5), fz - 1];
    // in from the side it was heading from, out the way it is going, if that side can be reached without a long way round
    var B = zExitPick(G, R, 'land', 0.22, s2, dir, fz - 3) || A;
    // the last metre or so before the pounce is a crouched stalk: a point that far short of s2 on the way from s1
    var D2 = zDistFrom(G, 'land', 0.22, s2), sk = zPickStop(G, R, 'land', 0.22, rng, function (x, z) { var dd = Math.hypot(x - s2[0], z - s2[1]), d1 = Math.hypot(x - s1[0], z - s1[1]); return -Math.abs(dd - 1.3) * 2 - d1 * 0.15; }, [], 0.3, D2);
    var legs = [{ to: s1, gait: 'walk', v: 0.9, stride: 0.5, act: 'look', dur: 4.2 }];
    if (sk && Math.hypot(sk[0] - s1[0], sk[1] - s1[1]) > 1.0) legs.push({ to: sk, gait: 'trot', v: 1.7, stride: 0.62 }, { to: s2, gait: 'stalk', v: 0.38, stride: 0.34, act: 'pounce', dur: 3.6 });
    else legs.push({ to: s2, gait: 'stalk', v: 0.45, stride: 0.36, act: 'pounce', dur: 3.6 });
    legs.push({ to: B, gait: 'trot', v: 1.9, stride: 0.66 });
    a.W = zWalkPlan(G, 'land', 0.22, A, legs, nearFence, 0, false);
    a.T = a.W.T; a.ext = 1.0; a.refl = true; a.stops = [s1, s2, A, B, dir];
  },
  startle: function (a, g) { zFlee(a, g, 'gallop', 3.4, 1.35); },
  draw: function (ctx, a, g) {
    var t = a.t, q = zWalker(a, t), fc = zFacing(a, q.x, q.z, q.hx, q.hz), o = { t: t, ph: q.ph, amp: q.amp, gait: q.gait, winter: g.season === 'winter', blink: zblink(t, a.seed % 97) };
    o.stride = (q.e && q.e.stride) || (q.gait === 'gallop' ? 1.35 : q.gait === 'trot' ? 0.66 : 0.5);   // the plan's own stride, so the feet do not slide
    if (q.gait === 'gallop') { o.tailA = 0.05; o.ears = 0.6; }
    else if (q.gait === 'trot') { o.tailA = -0.2; o.sway = 1; }      // the brush trails straight back, a little down, swaying
    else if (q.gait === 'stalk') { o.tailA = -0.35; o.crouch = 0.3 * q.amp; }
    var lift = 0;
    if (q.act === 'look') {   // stops, lifts its head, looks round at the viewer, ears turning
      var u = q.au / q.ad, lk = sstep(0.1, 0.3, u) * (1 - sstep(0.8, 0.95, u));
      o.head = { yaw: lk * (0.85 + 0.15 * Math.sin(t * 0.8)), pitch: 0.05, neck: 0.42 * lk, ang: 0.2 }; o.ears = 0.1 * Math.max(0, Math.sin(t * 2.3)) * lk; o.tailA = -0.45;   // the head turned to the viewer, the neck not raised; the brush held low
      if (g.light === 'night') o.shine = lk;   // eyeshine only at night
    } else if (q.act === 'pounce') {   // listens with the head cocked down, crouches, springs up and comes down nose first
      var v = q.au;
      if (v < 1.3) { o.head = { pitch: 0.45 + 0.05 * Math.sin(t * 5), yaw: 0.15 }; o.crouch = sstep(0.2, 1.2, v) * 0.6; o.tailA = 0.55; }
      else if (v < 2.1) { var w = (v - 1.3) / 0.8; lift = Math.sin(w * Math.PI) * 0.42; o.arch = -0.45 + w * 1.1; o.tuck = w > 0.08 && w < 0.92; o.head = { pitch: 0.2 + w * 0.8 }; o.tailA = 0.1 + w * 0.3; o.ph = 0; o.amp = 0; if (!a.pounced && w > 0.9) { a.pounced = true; a.cueSplash = false; } }
      else { var w2 = clamp((v - 2.1) / 1.2); o.head = { pitch: 0.9 - w2 * 0.8, yaw: 0 }; o.crouch = 0.5 * (1 - w2); o.tailA = 0.45 + 0.2 * w2; o.swish = 1 - w2; }
    } else if (q.amp < 0.05) o.head = zLook(t, a.seed, 0);
    else if (q.gait === 'trot') o.head = { pitch: 0.3, neck: 0.62, ang: 0.32, yaw: 0 };   // low and forward, level: the trotting fox's head
    else if (q.gait === 'stalk') o.head = { pitch: 0.5, neck: 1.15, ang: 0.8 + 0.03 * Math.sin(t * 3), yaw: 0 };
    else o.head = { pitch: 0.2 + 0.03 * Math.sin(q.ph * TAU * 2), yaw: 0 };
    o.lift = lift;
    a.dOcc = P(q.x, 0, q.z).d;
    zShadow(ctx, g, q.x, q.z, q.hx, 1.0, 0.28, 0.45, 0.9);
    zrl(g, fc.dir); RL.lum = g.lum; zPlace(ctx, q.x, 0, q.z, fc.dir, fc.fs, 0.95); foxPaint2(ctx, o); ctx.restore();
    return t < a.T;
  }
};

/* ---- タヌキ: at night by the teahouse: an unhurried amble in, nose to the ground foraging, a pause to sit up and look, and away ---- */
RV.tanuki = {
  start: function (a, g, R, rng) {
    var G = zGeoReady(R), tz = R.tea ? R.tea.z - 0.25 : LZ(6.5), tx = R.tea ? (R.tea.x0 + R.tea.x1) / 2 : LX(-1.5);
    function nearTea(x, z) { return Math.abs(z - tz) * 0.5; }
    var s1 = zPickStop(G, R, 'land', 0.18, rng, function (x, z) { return -Math.hypot(x - tx, (z - tz) * 1.5) * 0.9; }, null, 0.3) || [tx, tz];
    var s2 = zPickStop(G, R, 'land', 0.18, rng, function (x, z) { return -Math.abs(Math.hypot(x - s1[0], z - s1[1]) - 2.4) - Math.abs(z - tz + 0.8) * 0.4 - Math.max(0, LX(-1.5) - x) * 0.8; }, null, 0.3, zDistFrom(G, 'land', 0.18, s1)) || [tx + 2, tz - 1];
    var A = zExitPick(G, R, 'land', 0.18, s1, 0) || zEdge(R, tz, -1, 1.2), sd = A[0] < s1[0] ? 1 : -1;   // in by the nearest way, on out the far side
    var B = zExitPick(G, R, 'land', 0.18, s2, sd, tz - 1.5) || A;
    a.W = zWalkPlan(G, 'land', 0.18, A, [
      { to: s1, gait: 'walk', v: 0.55, stride: 0.34, act: 'forage', dur: 5.5 },
      { to: s2, gait: 'walk', v: 0.6, stride: 0.34, act: 'sit', dur: 5.0 },
      { to: B, gait: 'walk', v: 0.65, stride: 0.36 }], nearTea, 0, false);
    a.T = a.W.T; a.ext = 0.7; a.refl = true;
  },
  startle: function (a, g) { zFlee(a, g, 'trot', 1.7, 0.55, 'land', 0.18); },
  draw: function (ctx, a, g) {
    var t = a.t, q = zWalker(a, t), fc = zFacing(a, q.x, q.z, q.hx, q.hz), o = { t: t, ph: q.ph, amp: q.amp, gait: q.gait, blink: zblink(t, a.seed % 89) };
    o.stride = (q.e && q.e.stride) || (q.gait === 'trot' ? 0.55 : 0.34);
    // the waddle: the body sways a little to the side of the foot that is down, once each stride
    var wd = Math.sin(q.ph * TAU) * (q.gait === 'trot' ? 0.008 : 0.014) * q.amp, hl0 = Math.hypot(q.hx, q.hz) || 1; q.x += -q.hz / hl0 * wd; q.z += q.hx / hl0 * wd;
    if (q.act === 'forage') {   // nose down, snuffling forward a step at a time
      var u = q.au, dn = sstep(0, 0.6, u) * (1 - sstep(q.ad - 0.7, q.ad, u));
      o.head = { pitch: 0.15 + dn * 0.75 + Math.sin(t * 3.1) * 0.06 * dn, yaw: 0.1 * Math.sin(t * 0.9) * dn }; o.sniff = dn;
      var st = (u % 1.8) / 1.8; if (dn > 0.5 && st > 0.6) { o.amp = 0.35; o.ph = q.ph + (st - 0.6) / 0.4 * 0.5; }
    } else if (q.act === 'sit') {   // stops, lifts its head and looks round at the viewer, ears and nose working
      var u2 = q.au / q.ad, lk = sstep(0.08, 0.25, u2) * (1 - sstep(0.85, 0.98, u2));
      o.head = { yaw: lk * (0.8 + 0.2 * Math.sin(t * 0.6)), pitch: -0.2 * lk + 0.05 * Math.sin(t * 0.7) }; o.crouch = lk * 0.5; o.sniff = 0.4 * lk;
      if (g.light === 'night' || g.light === 'dusk') o.shine = lk * (g.light === 'night' ? 0.9 : 0.4);
    } else if (q.amp < 0.05) o.head = zLook(t, a.seed, 0);
    else o.head = { pitch: 0.25 + 0.05 * Math.sin(q.ph * TAU * 2), yaw: 0 };
    a.dOcc = P(q.x, 0, q.z).d;
    zShadow(ctx, g, q.x, q.z, q.hx, 0.6, 0.26, 0.3, 0.95);
    zrl(g, fc.dir); RL.lum = g.lum; zPlace(ctx, q.x, 0, q.z, fc.dir, fc.fs, 1.0); tanukiPaint2(ctx, o); ctx.restore();
    return t < a.T;
  }
};

/* ---- 白いノウサギ: in winter, out of cover onto the open snow in bursts of hops, a sit to feed and listen, up on its haunches
   at full alert, and off; a startled hare bolts in long bounds. Its tracks stay in the snow behind it ---- */
function hareAt(a, t) {   // the hare's place now: along its path in hops, still on the ground between them
  var q = zWalker(a, t), e = q.e;
  if (e.k === 'move' && q.amp > 0.12) {
    var st = e.stride, u = ((q.ph % 1) + 1) % 1, gu = easeIO(clamp(u / 0.85)), sa = clamp(q.s + st * (gu - u), 0, q.W.pa.len), p = zPathAt(q.W.pa, sa);
    q.x = p[0]; q.z = p[1]; q.hop = u;
    if (e.gait === 'bound') {   // fleeing: a zig-zag, a change of side every couple of bounds
      var zs = sa - e.s0, per = 2.4, w = zs / per, tri = (Math.abs(((w % 2) + 2) % 2 - 1) * 2 - 1), sl = ((Math.floor(w) % 2) ? 1 : -1) * 2 / per, amp0 = 0.32 * clamp(zs / 1.5), hl = Math.hypot(q.hx, q.hz) || 1, nx = -q.hz / hl, nz = q.hx / hl;
      q.x += nx * tri * amp0; q.z += nz * tri * amp0; q.hx = q.hx / hl + nx * sl * amp0; q.hz = q.hz / hl + nz * sl * amp0;
    }
  }
  return q;
}
function harePrints(W0, t) {   // where it came down: hind feet side by side ahead of the fore feet (the hare's Y)
  var out = [];
  W0.sched.forEach(function (e) {
    if (e.k !== 'move' || e.t0 > t) return;
    var r = zProf(Math.min(t, e.t1) - e.t0, e.L, e.v, e.rin, e.rout, e.ra), ph1 = e.ph0 + r.s / e.stride;
    for (var k = Math.ceil(e.ph0 - 0.55); k + 0.55 <= ph1; k++) { var ss = e.s0 + (k + 1 - e.ph0) * e.stride; if (ss < e.s0 + 0.3 || ss > e.s0 + e.L) continue; var p = zPathAt(W0.pa, ss), h = zHead(W0.pa, ss); out.push([p[0], p[1], h[0], h[1]]); }
  });
  return out;
}
RV.usagi = {
  start: function (a, g, R, rng) {
    var G = zGeoReady(R), lz = LZ(1.6 + rng() * 2.0);
    var s1 = zPickStop(G, R, 'land', 0.15, rng, function (x, z, p) { return -Math.abs(z - lz) * 0.6 - Math.abs(p.x - g.W * (0.3 + rng() * 0.4)) / g.W * 4 - (p.y < g.H * 0.45 ? 2 : 0); }, null, 0.35) || [LX(1), lz];
    var s2 = zPickStop(G, R, 'land', 0.15, rng, function (x, z, p) { var d = Math.hypot(x - s1[0], z - s1[1]); return -Math.abs(d - 2.2) - (p.y < g.H * 0.45 ? 2 : 0); }, null, 0.35, zDistFrom(G, 'land', 0.15, s1)) || [s1[0] + 2, s1[1]];
    var A = zExitPick(G, R, 'land', 0.15, s1, 0) || zEdge(R, lz, -1, 1), sd = A[0] < s1[0] ? 1 : -1;
    var B = zExitPick(G, R, 'land', 0.15, s2, sd, s2[1]) || A;
    // feeding, it creeps on a little in slow short hops, the hind feet brought up under it (a crawl), nibbling as it goes
    var s1b = zPickStop(G, R, 'land', 0.15, rng, function (x, z) { var d = Math.hypot(x - s1[0], z - s1[1]), d2 = Math.hypot(x - s2[0], z - s2[1]); return -Math.abs(d - 0.6) * 3 - d2 * 0.2; }, [], 0.35, zDistFrom(G, 'land', 0.15, s1));
    var feed = s1b ? [{ to: s1, gait: 'hop', v: 1.5, stride: 0.75, act: 'feed', dur: 2.6, ra: 0.6 }, { to: s1b, gait: 'crawl', v: 0.2, stride: 0.2, act: 'feed', dur: 2.6, ra: 0.3 }] : [{ to: s1, gait: 'hop', v: 1.5, stride: 0.75, act: 'feed', dur: 5.5, ra: 0.6 }];
    a.W = zWalkPlan(G, 'land', 0.15, A, feed.concat([
      { to: s2, gait: 'hop', v: 1.4, stride: 0.7, act: 'alert', dur: 4.5, ra: 0.6 },
      { to: B, gait: 'hop', v: 1.9, stride: 0.85, ra: 0.6 }]), null, 0, false);
    a.T = a.W.T; a.ext = 0.55; a.refl = true;
  },
  startle: function (a, g) { zFlee(a, g, 'bound', 5.2, 1.7, 'land', 0.15); },
  draw: function (ctx, a, g) {
    var t = a.t, q = hareAt(a, t), fc = zFacing(a, q.x, q.z, q.hx, q.hz), o = { t: t, blink: zblink(t, a.seed % 83), brown: !g.SEA.snow && g.season !== 'winter' };   // (the white coat in winter, the brown one otherwise)
    if (q.hop !== undefined) { var hp = hareHop(q.hop, q.gait === 'bound' ? 0.26 : q.gait === 'crawl' ? 0.03 : 0.12, q.e.stride), k; for (k in hp) o[k] = hp[k]; if (q.gait === 'bound') { o.ext = Math.min(1, o.ext * 1.15); o.ears = 0.85; } else if (q.gait === 'crawl') { o.ext *= 0.5; o.head = { pitch: 0.55 + 0.1 * Math.sin(t * 2), yaw: 0 }; o.sniff = 1; o.ears = 0.2; } }
    else if (q.act === 'feed') {   // sits low, nibbling: head down to the snow and up again, ears turning
      var u = q.au, dn = sstep(0.4, 1.0, u) * (1 - sstep(q.ad - 1.0, q.ad - 0.4, u)), cyc = Math.max(0, Math.sin(u * 1.3)) ;
      o.head = { pitch: dn * (0.5 + 0.45 * cyc), yaw: 0 }; o.sniff = 1; o.ears = 0.15 + 0.1 * Math.sin(t * 0.7);
    } else if (q.act === 'alert') {   // up on its haunches, ears high, looking round, then down again
      var u2 = q.au / q.ad, lk = sstep(0.1, 0.25, u2) * (1 - sstep(0.82, 0.95, u2));
      o.up = lk; o.head = { yaw: lk * 0.7 * Math.max(0, Math.sin(t * 0.5 + 1)), pitch: -0.15 * lk }; o.ears = -0.1 * lk; o.sniff = 0.6;
    } else { o.head = zLook(t, a.seed, 0); o.ears = 0.1; }
    a.dOcc = P(q.x, 0, q.z).d;
    // tracks in snow (not in the reflection)
    if (MODE !== 'm' && g.SEA.snow) {
      var pr = harePrints(a.flee ? a.W : a.W, a.flee ? Math.min(t, a.flee.t0) : t); if (a.flee) pr = pr.concat(harePrints(a.flee.W, t));
      ctx.fillStyle = 'rgba(120,134,170,' + (0.35 * clamp(g.lum * 1.2, 0.4, 1)) + ')';
      pr.forEach(function (f) {
        var nx = -f[3], nz = f[2];
        [[0.06, 0.035, 0.05, 0.016], [0.06, -0.035, 0.05, 0.016], [-0.16, 0.0, 0.022, 0.014], [-0.25, 0.012, 0.022, 0.014]].forEach(function (m) {
          var x = f[0] + f[2] * m[0] + nx * m[1], z = f[1] + f[3] * m[0] + nz * m[1], p = P(x, 0, z), p2 = P(x + f[2] * m[2], 0, z + f[3] * m[2]);
          var dx = p2.x - p.x, dy = p2.y - p.y; ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(0.5, Math.hypot(dx, dy)), Math.max(0.35, m[3] * p.k * CAM.s), Math.atan2(dy, dx), 0, TAU); ctx.fill();
        });
      });
    }
    var lift = o.lift || 0;
    zShadow(ctx, g, q.x, q.z, q.hx, 0.45, 0.2, 0.3, 0.9 * (1 - clamp(lift * 3) * 0.5));
    zrl(g, fc.dir); RL.lum = g.lum; zPlace(ctx, q.x, 0, q.z, fc.dir, fc.fs, 1.0); harePaint2(ctx, o); ctx.restore();
    return t < a.T;
  }
};

/* ---- 鹿: an autumn morning or dusk by the maple: a stag steps out of cover, browses the fallen leaves, lifts his head and calls
   (the rutting stag's long whistle), stands and looks, and walks back the way he came. Startled he freezes, the white rump
   flared, stamps, and bounds away ---- */
RV.shika = {
  start: function (a, g, R, rng) {
    var G = zGeoReady(R), mx = R.maple[0], mz = R.maple[1], su = g.season;
    // who comes: in autumn a stag, a hind, or a stag with a hind following; otherwise a stag or a hind
    var r0 = rng(), who = su === 'autumn' ? (r0 < 0.5 ? ['stag'] : r0 < 0.65 ? ['hind'] : ['stag', 'hind']) : (r0 < 0.6 ? ['stag'] : ['hind']);
    var s1 = zPickStop(G, R, 'land', 0.38, rng, function (x, z, p) { return -Math.hypot(x - mx - 1.5, (z - mz) * 1.2) * 0.8 - (p.y > g.H * 0.85 ? 3 : 0); }, null, 1.2) || [mx + 1.7, mz + 0.8];
    var D1 = zDistFrom(G, 'land', 0.38, s1);
    var s2 = zPickStop(G, R, 'land', 0.38, rng, function (x, z) { return -Math.abs(Math.hypot(x - s1[0], z - s1[1]) - 1.6); }, null, 1.2, D1) || [s1[0] + 1.2, s1[1] - 0.5];
    var A = zExitPick(G, R, 'land', 0.36, s1, 0) || zEdge(R, mz, -1, 1.5);
    var B = zExitPick(G, R, 'land', 0.36, s2, A[0] < s1[0] ? -1 : 1, A[1]) || A;
    var coat = su === 'summer' ? 0.05 : su === 'winter' ? 1 : su === 'spring' ? 0.75 : 0.7;   // autumn: the winter coat coming through, the spots fading
    a.deer = [];
    who.forEach(function (kind, ii) {
      var d = { kind: kind, seed: a.seed + ii * 17, face: undefined, t: 0 }, hind = kind === 'hind';
      var t1 = s1, t2 = s2;
      if (ii > 0) {   // the follower: her own places near his, reachable, a couple of metres apart, a few seconds behind
        t1 = zPickStop(G, R, 'land', 0.34, rng, function (x, z) { var dd = Math.hypot(x - s1[0], z - s1[1]); return -Math.abs(dd - 1.9) - (dd < 1.3 ? 5 : 0) - Math.max(0, z - s1[1]) * 0.3; }, [], 1.0, D1) || s1;
        t2 = zPickStop(G, R, 'land', 0.34, rng, function (x, z) { var dd = Math.hypot(x - s2[0], z - s2[1]); return -Math.abs(dd - 1.8) - (dd < 1.3 ? 5 : 0); }, [], 1.0, D1) || s2;
      }
      d.W = zWalkPlan(G, 'land', 0.34, A, [
        { to: t1, gait: 'walk', v: hind ? 0.7 : 0.75, stride: hind ? 0.76 : 0.82, act: 'browse', dur: 6.5 + ii * 0.5, ra: 1.2 },
        { to: t2, gait: 'walk', v: 0.65, stride: hind ? 0.75 : 0.8, act: hind ? 'look' : 'call', dur: 6.0, ra: 1.0 },
        { to: B, gait: 'walk', v: 0.85, stride: hind ? 0.78 : 0.85, ra: 1.0 }], null, ii * 4.5, false);
      d.T = d.W.T; d.mag = hind ? 0.98 : 1.06;   // a stag about 0.9 m at the shoulder, a hind a little smaller
      d.o = { coatK: coat, hind: hind, velvet: su === 'summer', antler: hind || su === 'spring' ? 0 : 1, rut: hind ? 0 : su === 'autumn' ? 1 : su === 'winter' ? 0.4 : 0 };
      a.deer.push(d);
    });
    a.T = Math.max.apply(null, a.deer.map(function (d) { return d.T; })); a.ext = 2.0 * (a.deer.length > 1 ? 1.8 : 1); a.refl = true;
  },
  startle: function (a, g) {
    a.deer.forEach(function (d, ii) { d.t = a.t; zFlee(d, g, 'bound', 4.2 - ii * 0.2, 1.9, 'land', 0.34, 0.9 + ii * 0.35); });
    a.T = Math.max.apply(null, a.deer.map(function (d) { return d.T; }));
  },
  draw: function (ctx, a, g) {
    var t = a.t, items = [];
    a.deer.forEach(function (d) {
      d.t = t; if (t < d.W.sched[0].t0 - 0.01 && !d.flee) return;
      var q = zWalker(d, t), fc = zFacing(d, q.x, q.z, q.hx, q.hz), o = { t: t, ph: q.ph, amp: q.amp, gait: q.gait, blink: zblink(t, d.seed % 79) }, k;
      for (k in d.o) o[k] = d.o[k];
      o.stride = q.gait === 'bound' ? 1.9 : d.o.hind ? 0.76 : 0.82;
      // the head's carriage: neck angle (from the withers; -1 upright, 0.9 down to the ground), its bend, the head's angle (0.55 carried, 1.7 nose down)
      if (q.act === 'browse') {   // neck and back lowered smoothly to the leaves, a few bites, a look up between
        var u = q.au, dn = sstep(0.3, 1.4, u) * (1 - sstep(q.ad - 1.3, q.ad - 0.3, u)), look = Math.max(0, Math.sin(u * 0.9 - 1.5 + d.seed)) > 0.85 ? 1 : 0, dd = dn * (1 - look * 0.8);
        o.head = { neck: lerp(-1.0, 0.9, dd), bend: 0.15 * dd, ang: lerp(0.55, 1.7, dd) + Math.sin(t * 4) * 0.03 * dd, yaw: 0 }; o.bodyPitch = 0.05 * dd; o.mouth = dd > 0.8 ? Math.max(0, Math.sin(t * 7)) * 0.4 : 0;
      } else if (q.act === 'call') {   // the head lifted and thrown forward, mouth open in the whistle; then a long look round
        var v = q.au, cl = sstep(0.6, 1.4, v) * (1 - sstep(3.2, 3.8, v)), lk = sstep(3.6, 4.2, v) * (1 - sstep(q.ad - 0.8, q.ad - 0.2, v));
        o.head = { neck: lerp(-1.0, -0.75, cl), bend: -0.15 * cl, ang: lerp(0.55, -0.15, cl), yaw: lk * 0.85 }; o.mouth = cl * sstep(1.2, 1.5, v); o.ears = -0.3 * cl;
        if (g.light === 'dusk' || g.light === 'night') o.shine = lk * 0.4;
      } else if (q.act === 'look') {   // the hind stands and looks round, ears turning
        var v2 = q.au / q.ad, lk3 = sstep(0.1, 0.3, v2) * (1 - sstep(0.8, 0.95, v2)); o.head = { neck: -1.1, ang: 0.5, yaw: lk3 * 0.8 }; o.ears = 0.2 * Math.sin(t * 1.7) * lk3;
      } else if (q.act === 'alarm') {   // frozen, head high and toward the viewer, the white rump flared
        o.head = { neck: -1.15, ang: 0.35, yaw: 0.8 }; o.flare = sstep(0, 0.2, q.au); o.ears = -0.4;
      } else if (q.gait === 'bound') { o.flare = 1; o.head = { neck: -0.85, ang: 0.4, yaw: 0 }; o.ears = 0.4; }
      else if (q.amp < 0.05) { var lk2 = zLook(t, d.seed, 0); o.head = { neck: -1.0 + lk2.pitch * 0.3, ang: 0.55 + lk2.pitch, yaw: lk2.yaw }; }
      else o.head = { neck: -0.95 + 0.03 * Math.sin(q.ph * TAU * 2), ang: 0.6 + 0.04 * Math.sin(q.ph * TAU * 2), yaw: 0 };   // the head nods with each step
      items.push({ d: d, q: q, fc: fc, o: o, z: P(q.x, 0, q.z).d });
    });
    items.sort(function (p, q) { return q.z - p.z; });   // the farther first
    if (items.length) a.dOcc = items[items.length - 1].z;
    var bx = null;
    items.forEach(function (it) {
      var q = it.q, d = it.d, p0 = P(q.x, 0, q.z), k = p0.k * d.mag, b2 = [p0.x - 1.25 * k, p0.y - 2.0 * k, p0.x + 1.25 * k, p0.y + 0.35 * k];
      bx = bx ? [Math.min(bx[0], b2[0]), Math.min(bx[1], b2[1]), Math.max(bx[2], b2[2]), Math.max(bx[3], b2[3])] : b2;
      zShadow(ctx, g, q.x, q.z, q.hx, 1.3 * d.mag, 0.36, 1.1, 0.9);
      zrl(g, it.fc.dir); RL.lum = g.lum; zPlace(ctx, q.x, 0, q.z, it.fc.dir, it.fc.fs, d.mag); sikaPaint(ctx, it.o); ctx.restore();
    });
    if (MODE !== 'm') a.box = bx;   // the screen box the visitors fill (for the layer they are drawn on)
    return t < a.T;
  }
};

/* ================= the small birds' visits: a chain of perches on real things, flights between them =================
   perches are world points on the top of something solid (the pine's highest pad, the lantern's finial, a rock's crown, the
   fence rail, a branch tip of the cherry), with what the bird does there. A flight is a ballistic-looking arc: a dip off
   the perch, flapping up, a glide in and a braking flare, and the head leads. */
function birdPerches(g, R) {
  var o = {}, i;
  if (F.pine > 0) { var pt = genPine(23, LAY.pine.x, LAY.pine.z, F.pine), best = null; pt.pads.forEach(function (pd) { if (!best || pd.y > best.y) best = pd; }); o.pine = [best.x, best.y + best.t * 0.5 + 0.05, best.z]; o.pineLow = pt.pads.filter(function (pd) { return !pd.top; }).map(function (pd) { return [pd.x + pd.r * 0.3, pd.y + pd.t * 0.45, pd.z - pd.r * 0.2]; }); }
  if (F.lantern) o.lantern = [LAY.lantern.x, 1.9, LAY.lantern.z];
  if (F.lantern) o.lanternRoof = [LAY.lantern.x + 0.22, 1.56, LAY.lantern.z - 0.18];
  if (F.smallLanterns) o.small = [[LX(-2.55), 0.52, LZ(7.25)], [LX(4.7), 0.52, LZ(5.55)]];
  if (F.fence) { o.fence = []; [-2.6, -1.2, 0.2, 4.6].forEach(function (x) { if (!(F.gate && LX(x) > LAY.gate.xa - 0.3 && LX(x) < LAY.gate.xb + 0.3)) o.fence.push([LX(x), 1.9, LAY.fenceZ - 0.08]); }); }
  if (R.obs && R.obs.rocks.length) {   // the pond-edge rocks' crowns, the ones nearest the water
    o.rocks = R.obs.rocks.filter(function (r) { return !r.big && pondSDF(r.x, r.z) < 0.15; }).map(function (r) { return [r.x, r.ry * 0.92 + 0.02, r.z, r]; });
    var bg = R.obs.rocks.filter(function (r) { return r.big; })[0]; if (bg) o.bigRock = [bg.x, bg.ry * 0.95, bg.z];
  }
  if (F.cherry) { var ch = genCherry(77, LAY.cherry.x, LAY.cherry.z, Math.max(0, hillH(LAY.cherry.x, LAY.cherry.z) - 0.1)); o.cherry = ch.segs.filter(function (s) { return s.r1 < 0.05; }).map(function (s) { return [lerp(s.a[0], s.b[0], 0.7), lerp(s.a[1], s.b[1], 0.7) + s.r1, lerp(s.a[2], s.b[2], 0.7)]; }); }
  if (F.ycherry > 0.3) { var yc = genSakura(91, LAY.ycherry.x, LAY.ycherry.z, F.ycherry * 0.82, 0, 1.15, 4); o.ycherry = yc.segs.filter(function (s) { return s.lvl >= 3 && s.b[1] > 1.2; }).map(function (s) { return [s.b[0], s.b[1] + s.r1, s.b[2]]; }); }
  if (F.namiki) { o.namiki = []; LAY.namiki.forEach(function (a, ii) { var nt = genSakura(760 + ii, a[0], a[1], a[2] / 4.6, 0, 1.2, 4); nt.segs.forEach(function (s) { if (s.lvl >= 3 && s.b[1] > 2.0) o.namiki.push([s.b[0], s.b[1] + s.r1, s.b[2]]); }); }); }
  if (F.bridge) o.bridge = [(BRIDGE.x0 + BRIDGE.x1) / 2 + 0.3, 0.98, BRIDGE.zc - 0.55];
  if (F.shishi) { var s = LAY.shishi; o.shishi = [s.x - 0.28 * s.m, 0.99, s.z + 0.08]; }
  return o;
}
function onScreen(p, m) { var q = P(p[0], p[1], p[2]); return q.x > W * (m || 0.08) && q.x < W * (1 - (m || 0.08)) && q.y > 8 && q.y < H * 0.95; }
/* a flight from a to b (world points), duration D: returns position, heading on screen, wing phase, flap/glide */
function zFlight(a, b, D, u, hop) {
  var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, d = Math.hypot(b[0] - a[0], b[2] - a[2]), arc = hop ? Math.min(0.25, d * 0.12) : Math.min(1.2, 0.18 + d * 0.12);
  var dip = Math.sin(clamp(u * 3) * Math.PI) * (hop ? 0 : 0.12);   // off a perch it drops a little before it climbs
  return [lerp(a[0], b[0], e), lerp(a[1], b[1], e) + Math.sin(u * Math.PI) * arc - dip * (1 - u), lerp(a[2], b[2], e)];
}
/* plan: list of legs [{p: perch point, dur, act}], flights between them, in from an off-screen point and out to another */
function birdPlan(a, legs, from, to, fly) {
  var t = 0, seg = [], i, prev = from;
  fly = fly || 1.6;
  for (i = 0; i < legs.length; i++) {
    var lg = legs[i], d = Math.hypot(lg.p[0] - prev[0], lg.p[1] - prev[1], lg.p[2] - prev[2]), D = lg.fd || clamp(0.5 + d * 0.22, 0.45, 3.2) * fly / 1.6;
    seg.push({ k: 'fly', a: prev, b: lg.p, t0: t, t1: t + D, hop: d < 0.8 }); t += D;
    seg.push({ k: 'perch', p: lg.p, t0: t, t1: t + lg.dur, act: lg.act, i: i, face: lg.face }); t += lg.dur; prev = lg.p;
  }
  var d2 = Math.hypot(to[0] - prev[0], to[1] - prev[1], to[2] - prev[2]), D2 = clamp(0.6 + d2 * 0.2, 0.8, 3.5) * fly / 1.6;
  seg.push({ k: 'fly', a: prev, b: to, t0: t, t1: t + D2, hop: false }); t += D2;
  a.seg = seg; a.T = t;
}
function birdAt(a, t) {
  var S = a.seg, i = 0; while (i < S.length - 1 && t > S[i].t1) i++;
  var e = S[i], u = clamp((t - e.t0) / Math.max(1e-3, e.t1 - e.t0));
  if (e.k === 'perch') return { perch: true, p: e.p, e: e, u: u, au: t - e.t0, ad: e.t1 - e.t0 };
  var p = zFlight(e.a, e.b, e.t1 - e.t0, u, e.hop), p2 = zFlight(e.a, e.b, e.t1 - e.t0, Math.min(1, u + 0.02), e.hop);
  return { perch: false, p: p, p2: p2, e: e, u: u };
}
/* draw one small bird at its state: perched (with idle) or flying */
function birdDraw(ctx, a, g, kind, q, o) {
  o = o || {}; var t = a.t;
  if (q.perch) {
    var pp = q.p, sp = P(pp[0], pp[1], pp[2]);
    var dir = q.e.face || (sp.x < g.W / 2 ? 1 : -1); if (o.turn) dir = o.turn(q, dir);
    a.face = dir; a.dOcc = sp.d - 0.15;
    if (!o.noShadow && MODE !== 'm') { var gs = P(pp[0], pp[1] - 0.005, pp[2]); ctx.fillStyle = 'rgba(16,14,22,' + (0.28 * clamp(g.lum * 1.1, 0.35, 1)) + ')'; ctx.beginPath(); ctx.ellipse(gs.x, gs.y, 0.06 * gs.k, 0.018 * gs.k, 0, 0, TAU); ctx.fill(); }
    zrl(g, dir); zPlace(ctx, pp[0], pp[1], pp[2], dir, 1, 1.0);
    var bo = { t: t, blink: zblink(t, a.seed % 61), fluff: g.season === 'winter' || g.wet };
    if (o.pose) o.pose(bo, q);
    if (bo.hang) ctx.rotate(bo.hang);   // hanging from the twig: the whole bird turned about its feet
    birdPaint2(ctx, kind, bo); ctx.restore();
  } else {
    var s0 = P(q.p[0], q.p[1], q.p[2]), s1 = P(q.p2[0], q.p2[1], q.p2[2]), dx = s1.x - s0.x, dy = s1.y - s0.y, dr = dx >= 0 ? 1 : -1;
    a.face = dr; a.dOcc = s0.d - 0.15;
    var u = q.u, land = q.e.k === 'fly' && u > 0.8, start = u < 0.15, flap = start || land || (Math.sin(t * 0.9 + a.seed) > -0.3), wph = t * (o.wbf || 46);
    var fo = { t: t, ph: flap ? wph : Math.PI * 0.3, fold: o.bound && !land && !start && Math.sin(t * 5) > 0.2 ? 1 : 0, brake: land ? (u - 0.8) * 5 : 0, pitch: clamp(Math.atan2(dy, Math.abs(dx) + 1e-3), -0.5, 0.5) * dr - (land ? 0.35 : 0) };
    zrl(g, dr); zPlace(ctx, q.p[0], q.p[1], q.p[2], dr, 1, 1.0); ctx.translate(0, -0.03); birdFlyPaint2(ctx, kind, fo); ctx.restore();
  }
}
function birdOff(R, p, side, up) { var z = p[2] + 1.0, ex = R.edgeX(z, side); return [ex + side * 1.8, p[1] + (up || 1.6), z]; }

/* ---- オオルリ: spring and summer, a male flies in to the top of the pine and sings from the highest spray, turning on the perch;
   down to the lantern a moment, back up, and away ---- */
RV.ooruri = {
  start: function (a, g, R, rng) {
    var B = birdPerches(g, R), top = B.pine || [LX(4.5), 2.0, LZ(3)], side = top[0] > LX(1) ? 1 : -1, legs = [{ p: top, dur: 11, act: 'sing' }];
    // it keeps to the high perches: the pine's top, the top of a tall tree or the fence, never down low
    var hi = []; ['namiki', 'ycherry'].forEach(function (k) { if (B[k]) B[k].forEach(function (p2) { if (p2[1] > 2.2 && onScreen(p2, 0.1) && zSeenPt(R, p2, null) && zSeenPt(R, [p2[0], p2[1] + 0.08, p2[2]], null)) hi.push(p2); }); });   // (only sprays clear of the tree's own leaves, checked twice)
    if (B.fence) B.fence.forEach(function (p2) { if (onScreen(p2, 0.1) && zSeenPt(R, p2, null)) hi.push(p2); });
    if (hi.length && rng() < 0.7) legs.push({ p: hi[(rng() * hi.length) | 0], dur: 7, act: 'sing' }, { p: top, dur: 6, act: 'sing' });
    birdPlan(a, legs, birdOff(R, top, side, 1.8), birdOff(R, top, -side, 2.2), 1.7); a.ext = 0.6; a.refl = true;
  },
  startle: function (a, g) { birdFlee(a, g); },
  draw: function (ctx, a, g) {
    var q = birdAt(a, a.t);
    birdDraw(ctx, a, g, 'ooruri', q, {
      turn: function (q2, d) { return q2.e.act === 'sing' && Math.sin(q2.au * 0.3 + 1) < -0.75 ? -d : d; },   // it turns only now and then
      pose: function (bo, q2) {
        var u = q2.au;
        if (q2.e.act === 'sing') {   // upright and still, the head lifted to sing; between the phrases only the head turns a little
          var ph = u % 5.2, sg = ph > 0.8 && ph < 3.2; bo.sing = sg ? 0.5 + 0.5 * Math.abs(Math.sin(u * 13)) : 0; bo.pitch = -0.3; bo.head = { pitch: sg ? -0.4 : -0.05 + (Math.floor(u / 1.7) % 2 ? 0.08 : -0.05), yaw: 0 }; if (sg && !a.sang) { a.sang = Math.floor(u / 5.2) + 1; } }
        else { bo.head = { pitch: 0.25 * Math.sin(u * 3.1), yaw: 0 }; bo.tilt = Math.sin(u * 1.7) * 0.2; bo.flick = Math.max(0, Math.sin(u * 4.3) - 0.85) * 6; }
        if (q2.au < 0.3) bo.wings = 1 - q2.au / 0.3;
      }
    });
    return a.t < a.T;
  }
};
function birdFlee(a, g) {   // off the perch and away, the nearer way out
  var q = birdAt(a, a.t), R = g.rp, p = q.p, side = (a.face || 1);
  var to = birdOff(R, p, P(p[0], p[1], p[2]).x < g.W / 2 ? -1 : 1, 2.0);
  a.seg = [{ k: 'fly', a: p, b: to, t0: a.t, t1: a.t + clamp(Math.hypot(to[0] - p[0], to[2] - p[2]) * 0.16, 0.9, 2.6), hop: false }]; a.T = a.seg[0].t1; void side;
}
/* ---- ルリビタキ: winter, a male drops to the snowy lantern's finial, flicks its tail and looks about, down to a rock and the small
   lantern, and away ---- */
RV.rurubitaki = {
  start: function (a, g, R, rng) {
    // it keeps low: the small lantern, a rock's crown, the lion's head, the lantern's roof; from there it drops to the snow for a
    // moment (a short flutter down, a peck), and back up to a low perch
    var B = birdPerches(g, R), low = [];
    if (B.small) B.small.forEach(function (p2) { if (onScreen(p2, 0.12)) low.push(p2); });
    if (B.rocks) B.rocks.slice(0, 6).forEach(function (r) { if (onScreen(r, 0.12)) low.push([r[0], r[1], r[2]]); });
    if (B.shishi && onScreen(B.shishi, 0.12)) low.push(B.shishi);
    if (B.lanternRoof) low.push(B.lanternRoof);
    if (!low.length) low.push(B.lantern || [LX(-1.15), 1.9, LZ(4.3)]);
    var first = low[(rng() * low.length) | 0], legs = [{ p: first, dur: 4.5, act: 'flick' }];
    function groundBy(p2) { for (var k = 0; k < 8; k++) { var an = rng() * TAU, x = p2[0] + Math.cos(an) * 0.45, z = p2[2] - Math.abs(Math.sin(an)) * 0.4; if (!F.pond || pondSDF(x, z) > 0.25) return [x, Math.max(0, hillH(x, z)) + 0.01, z]; } return null; }
    var gd = groundBy(first); if (gd) legs.push({ p: gd, dur: 2.2, act: 'ground' });
    var nxt = low.length > 1 ? low[(low.indexOf(first) + 1 + ((rng() * (low.length - 1)) | 0)) % low.length] : first;
    legs.push({ p: nxt, dur: 4, act: 'flick' });
    var gd2 = groundBy(nxt); if (gd2 && rng() < 0.7) legs.push({ p: gd2, dur: 1.8, act: 'ground' }, { p: nxt, dur: 3, act: 'flick' });
    var side = P(first[0], first[1], first[2]).x < g.W / 2 ? -1 : 1;
    birdPlan(a, legs, birdOff(R, first, side, 1.2), birdOff(R, first, -side, 1.6), 1.5); a.ext = 0.5; a.refl = true;
  },
  startle: function (a, g) { birdFlee(a, g); },
  draw: function (ctx, a, g) {
    var q = birdAt(a, a.t);
    birdDraw(ctx, a, g, 'ruri', q, {
      turn: function (q2, d) { return Math.sin(q2.au * 0.8 + q2.e.i) < -0.5 ? -d : d; },
      pose: function (bo, q2) {
        var u = q2.au;
        if (q2.e.act === 'ground') { var pk = Math.max(0, Math.sin(u * 4.2)); bo.head = { pitch: pk > 0.7 ? 0.9 : 0.15, yaw: 0 }; bo.pitch = pk > 0.7 ? 0.35 : 0; bo.flick = Math.max(0, Math.sin(u * 3.1 + 1) - 0.8) * 4; }   // down on the snow: a peck or two
        else { var fk = (u % 1.6) / 1.6; bo.flick = fk < 0.12 ? Math.sin(fk / 0.12 * Math.PI) * 1.2 : 0; bo.head = { pitch: 0.25 * Math.sin(u * 1.9) + 0.15, yaw: 0 }; bo.tilt = Math.sin(u * 2.3) * 0.12; bo.crouch = bo.flick * 0.2; }   // the tail flicked down and up, every second or so, the head cocked to the ground below
        if (q2.au < 0.3) bo.wings = 1 - q2.au / 0.3;
      }
    });
    return a.t < a.T;
  }
};
/* ---- カワセミ: to a rock at the pond's edge, a bob of the head as it watches the water, the dive (straight in, bill first), up
   with a fish, a beat of it on the rock, swallowed head first, and away low over the water ---- */
RV.kawasemi = {
  start: function (a, g, R, rng) {
    var B = birdPerches(g, R), cands = (B.rocks || []).filter(function (r) { return onScreen(r, 0.15); }), rk = cands.length ? cands[(rng() * cands.length) | 0] : (R.perch || [LX(1), 0.3, LZ(3.4)]);
    var perch = [rk[0], rk[1], rk[2]], e = nearPondEdge(perch[0], perch[2]), dv = [lerp(perch[0], e[0], 1) + (e[0] - perch[0]) * 1.5, WL, lerp(perch[2], e[1], 1) + (e[1] - perch[2]) * 1.5];
    if (pondSDF(dv[0], dv[2]) > -0.25) { for (var k = 0; k < 20 && pondSDF(dv[0], dv[2]) > -0.25; k++) { var c = R.pond || [LX(2), LZ(4)]; dv[0] = lerp(dv[0], c[0], 0.15); dv[2] = lerp(dv[2], c[1], 0.15); } }
    a.dv = dv; var side = P(perch[0], 0, perch[2]).x < g.W / 2 ? -1 : 1;
    birdPlan(a, [{ p: perch, dur: 6.5, act: 'watch', face: dv[0] > perch[0] ? 1 : -1 }, { p: perch, dur: 7, act: 'fish', fd: 2.2, face: dv[0] > perch[0] ? 1 : -1 }], [birdOff(R, perch, side, 0.3)[0], 0.5, perch[2] + 0.6], birdOff(R, perch, -side, 0.4), 1.2);
    a.seg[2] = { k: 'dive', a: perch, b: dv, t0: a.seg[2].t0, t1: a.seg[2].t1 };   // the second flight is the dive and back
    a.ext = 0.5; a.refl = true;
  },
  startle: function (a, g) { birdFlee(a, g); },
  draw: function (ctx, a, g) {
    var t = a.t, S = a.seg, i = 0; while (i < S.length - 1 && t > S[i].t1) i++;
    var e = S[i];
    if (e.k === 'dive') {   // down in a straight line, the splash and rings, back up to the perch with the fish
      var u = (t - e.t0) / (e.t1 - e.t0), c = P(e.b[0], WL, e.b[2]);
      if (u < 0.3) { var w = u / 0.3, p = [lerp(e.a[0], e.b[0], w), lerp(e.a[1] + 0.15, WL, w * w), lerp(e.a[2], e.b[2], w)], sp = P(p[0], p[1], p[2]), dr = e.b[0] > e.a[0] ? 1 : -1; a.dOcc = sp.d - 0.15; zrl(g, dr); zPlace(ctx, p[0], p[1], p[2], dr, 1, 1); ctx.rotate(0.9); birdFlyPaint2(ctx, 'kawasemi', { ph: Math.PI * 0.5, fold: 0.85, pitch: 0 }); ctx.restore(); }
      else if (!a.splashed) { a.splashed = true; a.cueSplash = true; }
      if (u > 0.28 && MODE !== 'm') {
        var su = clamp((u - 0.28) / 0.7);
        for (var r = 0; r < 3; r++) { var rr = (0.04 + su * 0.42 - r * 0.08) * c.k; if (rr <= 0) continue; ctx.strokeStyle = 'rgba(236,244,250,' + (0.55 * (1 - su)) + ')'; ctx.lineWidth = Math.max(0.5, 0.012 * c.k); ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * CAM.s * 0.9, 0, 0, TAU); ctx.stroke(); }
        if (su < 0.35) { ctx.fillStyle = 'rgba(240,248,252,' + (0.85 * (1 - su / 0.35)) + ')'; for (var d = 0; d < 10; d++) { var an = d / 10 * Math.PI, hh = Math.sin(su / 0.35 * Math.PI) * (0.12 + (d % 3) * 0.05); ctx.beginPath(); ctx.arc(c.x + Math.cos(an) * su * 0.5 * c.k * (d % 2 ? 1 : -1), c.y - hh * c.k, Math.max(0.5, 0.014 * c.k), 0, TAU); ctx.fill(); } }
      }
      if (u > 0.42) { var w2 = easeIO((u - 0.42) / 0.58), p2 = [lerp(e.b[0], e.a[0], w2), lerp(WL, e.a[1], w2) + Math.sin(w2 * Math.PI) * 0.2, lerp(e.b[2], e.a[2], w2)], sp2 = P(p2[0], p2[1], p2[2]), dr2 = e.a[0] > e.b[0] ? 1 : -1; a.dOcc = sp2.d - 0.15; zrl(g, dr2); zPlace(ctx, p2[0], p2[1], p2[2], dr2, 1, 1); birdFlyPaint2(ctx, 'kawasemi', { ph: t * 50, pitch: -0.3 * (1 - w2) }); kfFish(ctx, 0.2, -0.05, 0); ctx.restore(); }
      return t < a.T;
    }
    var q = birdAt(a, t);
    birdDraw(ctx, a, g, 'kawasemi', q, {
      wbf: 60,
      pose: function (bo, q2) {
        var u = q2.au;
        if (q2.e.act === 'watch') { var bb = Math.max(0, Math.sin(u * 1.4)) > 0.9 ? Math.sin(u * 14) * 0.15 : 0; bo.head = { pitch: 0.35 + bb, yaw: 0 }; bo.pitch = 0.1; bo.crouch = Math.max(0, Math.sin(u * 0.7 - 2)) * 0.5; }
        else { bo.fish = u < 5 ? 1 : 0; bo.head = { pitch: u < 3.5 ? 0.6 * Math.max(0, Math.sin(u * 5)) - 0.2 : -0.5 * sstep(4.5, 5, u) * (1 - sstep(5.2, 5.8, u)) }; if (u > 4.5 && u < 5.4) bo.sing = 0.4; }
        if (q2.au < 0.25) bo.wings = 1 - q2.au / 0.25;
      }
    });
    if (q.perch && q.e.act === 'fish' && q.au < 5) { var pp = q.p, dir = a.face; zrl(g, dir); zPlace(ctx, pp[0], pp[1], pp[2], dir, 1, 1); var S2 = SBIRD.kawasemi, L2 = S2.L * BIRDV; kfFish(ctx, L2 * 0.5 + (q.au < 3.5 ? Math.sin(q.au * 5) * 0.02 : 0), -S2.tars * L2 - L2 * 0.32, q.au < 3.5 ? Math.sin(q.au * 5) * 0.5 : 0.3); ctx.restore(); }
    return t < a.T;
  }
};
function kfFish(ctx, x, y, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); var gr = ctx.createLinearGradient(0, -0.012, 0, 0.012); gr.addColorStop(0, zc([140, 150, 150])); gr.addColorStop(1, zc([226, 232, 230])); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-0.015, 0); ctx.quadraticCurveTo(0.03, -0.014, 0.07, 0); ctx.quadraticCurveTo(0.03, 0.012, -0.015, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(0.065, 0); ctx.lineTo(0.09, -0.012); ctx.lineTo(0.088, 0.012); ctx.closePath(); ctx.fill(); ctx.restore(); }
/* ---- メジロ: a spring pair working through the blossom of the cherries, hanging to sip nectar, hopping from spray to spray
   together, twittering; the second follows the first ---- */
RV.mejiro = {
  start: function (a, g, R, rng) {
    var B = birdPerches(g, R), pool = [];
    var bases = { ycherry: [LAY.ycherry.x, 0, LAY.ycherry.z], cherry: [LAY.cherry.x, 0, LAY.cherry.z], namiki: null };
    var mp = F.maple > 0 ? P(LAY.maple.x, 2.2 * F.maple, LAY.maple.z) : null;   // (not behind the maple's canopy)
    function behindMaple(p) { if (!mp || p[2] < LAY.maple.z + 0.3) return false; var q = P(p[0], p[1], p[2]); return Math.abs(q.x - mp.x) < mp.k * 3.2 * F.maple && q.y > mp.y - mp.k * 2.8 * F.maple; }
    ['ycherry', 'cherry', 'namiki'].forEach(function (k) { if (B[k]) B[k].forEach(function (p) { if (onScreen(p, 0.1) && !behindMaple(p) && zSeenPt(R, p, bases[k] || [p[0], 0, p[2] + 0.5])) pool.push(p); }); });
    if (!pool.length && B.pineLow) pool = B.pineLow.slice();
    if (!pool.length) pool = [[LX(4.4), 2.6, LZ(10)]];
    pool.sort(function (p, q) { return p[2] - q[2]; });   // the nearer trees first: a pair in the near blossom is the sighting
    var c0 = pool[(rng() * Math.min(pool.length, 6)) | 0], near = pool.filter(function (p) { return Math.hypot(p[0] - c0[0], p[1] - c0[1], p[2] - c0[2]) < 2.6; });
    if (near.length < 3) near = pool;
    near.sort(function () { return rng() - 0.5; });
    var legs = [], n = Math.min(6, near.length); for (var i = 0; i < n; i++) legs.push({ p: near[i], dur: 2.2 + rng() * 1.5, act: 'sip' });
    var side = P(c0[0], c0[1], c0[2]).x < g.W / 2 ? -1 : 1;
    birdPlan(a, legs, birdOff(R, c0, side, 1.0), birdOff(R, c0, -side, 1.2), 1.0); a.ext = 0.5; a.refl = false; a.lag = 0.55;
  },
  startle: function (a, g) { birdFlee(a, g); a.lag = 0.25; },
  draw: function (ctx, a, g) {
    var t = a.t, pose = function (bo, q2) {
      var u = q2.au + q2.e.i, hang = (q2.e.i % 2 === 1) ? sstep(0.3, 0.7, q2.au) * (1 - sstep(q2.ad - 0.5, q2.ad - 0.15, q2.au)) : 0;   // on every other spray it swings under the twig, upside down, to reach a flower
      bo.head = { pitch: 0.5 * Math.sin(u * 3.3) + hang * 0.4, yaw: 0 }; bo.tilt = Math.sin(u * 2.1) * 0.35 * (1 - hang); bo.pitch = Math.sin(u * 1.3) * 0.3 * (1 - hang) + hang * 0.5; bo.hang = hang * (2.3 + Math.sin(u * 2.5) * 0.25);
      if (Math.sin(u * 5.7) > 0.8) bo.sing = 0.6; if (q2.au < 0.2) bo.wings = 1 - q2.au / 0.2;
    };
    var q1 = birdAt(a, Math.max(0, t - a.lag)), q0 = birdAt(a, t);
    if (t > a.lag) { var sv = a.face, so = a.dOcc; birdDraw(ctx, a, g, 'mejiro', offsetQ(q1, 0.1), { pose: pose, turn: function (q2, d) { return -d; }, wbf: 52, bound: true, noShadow: true }); a.face = sv; a.dOcc = so; }
    birdDraw(ctx, a, g, 'mejiro', q0, { pose: pose, wbf: 52, bound: true, noShadow: true });
    return t < a.T + a.lag;
  }
};
function offsetQ(q, dx) { var o = {}, k; for (k in q) o[k] = q[k]; if (o.p) o.p = [q.p[0] + dx, q.p[1] - 0.02, q.p[2] + 0.05]; if (o.p2) o.p2 = [q.p2[0] + dx, q.p2[1] - 0.02, q.p2[2] + 0.05]; return o; }
function zSeenPt(R, p, base) {   // a perch point that nothing stands in front of (the depth image), else one on the near side of its tree
  var q = P(p[0], p[1], p[2]), Z = R.Z;
  if (Z) {   // the bird's own small box above the perch must be clear of anything nearer (leaves too, even thin ones)
    var ok = 0, all = 0, OFS = [[0, -0.06], [-0.05, -0.06], [0.05, -0.06], [0, -0.11], [0, -0.02], [-0.04, -0.1], [0.04, -0.1]];
    OFS.forEach(function (o2) { var ix = Math.floor((q.x + o2[0] * q.k) * Z.ms), iy = Math.floor((q.y + o2[1] * q.k) * Z.ms); if (ix < 0 || iy < 0 || ix >= Z.w || iy >= Z.h) return; all++; var i = iy * Z.w + ix, th = 1 + (q.d - 0.15 - Z.d0) / (Z.d1 - Z.d0) * 253; if (!(Z.A[i] > 40 && Z.D[i] < th - 0.5)) ok++; });
    return all > 0 && ok >= all - 1;
  }
  return base ? p[2] < base[2] - 0.35 : true;
}
/* ---- ウグイス: spring, a glimpse in the azaleas: it creeps along the inside of the bush, half hidden by the leaves, comes up
   to the top to sing its "hoh-hokekyo" (tail cocked, bill wide), and slips back in ---- */
RV.uguisu = {
  start: function (a, g, R, rng) {
    var near = R.az.slice().filter(function (z) { return onScreen([z[0], z[3], z[1]], 0.1); }).sort(function (p, q) { return p[1] - q[1]; }).slice(0, 3);
    var az = near.length ? near[(rng() * near.length) | 0] : [LX(1.5), LZ(1.5), 0.5, 0.4];
    a.az = az; a.T = 14; a.ext = 0.6; a.refl = false; a.side = rng() < 0.5 ? -1 : 1;
  },
  startle: function (a) { a.T = Math.min(a.T, a.t + 0.8); a.hide = a.t; },
  draw: function (ctx, a, g) {
    var t = a.t, az = a.az, T = a.T, u = t / 14, hid = a.hide !== undefined ? clamp((t - a.hide) / 0.6) : 0;
    // in from the side of the bush, up to the crown at ~5 s to sing, back down and out of sight
    // it moves in short quick hops from twig to twig (a hop every 0.6-1.2 s, a tenth of a second in the air), still in between
    var hpT = 0.85, n0 = Math.floor(t / hpT), hu = clamp((t - n0 * hpT) / 0.16), hr = mulberry32(a.seed + n0), hr0 = mulberry32(a.seed + n0 - 1);
    function spot(r, n) { return [Math.sin(n * 0.5) * 0.45 + (r() - 0.5) * 0.4 + a.side * 0.2, r() * 0.25]; }
    var s0 = spot(hr0, n0 - 1), s1 = spot(hr, n0), e2 = hu * hu * (3 - 2 * hu), along = lerp(s0[0], s1[0], e2), hy = lerp(s0[1], s1[1], e2) * az[3] * 0.4 + Math.sin(hu * Math.PI) * 0.06;
    var tq = (n0 + e2) * hpT, up = sstep(3, 5, tq) * (1 - sstep(10, 12, tq));   // up to the crown and down again, also hop by hop
    var bx = az[0] + along * az[2] * 0.8, by = lerp(az[3] * 0.5 + hy, az[3] * 0.98 + 0.02, up) - hid * 0.3, bz = az[1] - az[2] * (0.75 - up * 0.2);
    a.hopDir = s1[0] >= s0[0] ? 1 : -1;
    var vis = clamp(sstep(0.4, 1.8, t) * (1 - sstep(T - 1.6, T - 0.2, t)) * (1 - hid));
    if (vis <= 0.01) return t < T;
    var sp = P(bx, by, bz), dir = a.hopDir; a.face = dir; a.dOcc = sp.d - 0.05;
    ctx.save(); ctx.globalAlpha *= vis; zrl(g, dir); zPlace(ctx, bx, by, bz, dir, 1, 1);
    var sing = up > 0.9 && (t % 4.5) > 1.2 && (t % 4.5) < 3.6, bo = { t: t, blink: zblink(t, a.seed % 53), sing: sing ? 0.6 + 0.4 * Math.abs(Math.sin(t * 9)) : 0, cock: sing ? 0.5 : 0.1, head: { pitch: sing ? -0.4 : 0.3 * Math.sin(t * 3), yaw: 0 }, pitch: sing ? -0.25 : 0.1, tilt: sing ? 0 : Math.sin(t * 2.3) * 0.2, wings: hu < 1 ? 0.35 * Math.sin(hu * Math.PI) : 0, crouch: hu >= 1 && (t - n0 * hpT) > hpT - 0.12 ? 0.4 : 0 };
    birdPaint2(ctx, 'uguisu', bo); ctx.restore();
    // leaves in front: it is only ever half seen. A few sprays of the bush's own leaves over the lower body
    if (MODE !== 'm') {
      var lr = mulberry32(a.seed + 3), lc = mulc(g.SEA.shrub[2] || g.SEA.shrub[0], g.tint), lc2 = mulc(g.SEA.shrub[3] || g.SEA.shrub[0], g.tint), cover = 1 - up * 0.55;
      for (var k = 0; k < 9; k++) { var lx = bx + (lr() - 0.5) * 0.32, ly = by + 0.02 + lr() * 0.1 * cover + (1 - cover) * -0.04, lp = P(lx, ly, bz - 0.06); if (lr() > cover + 0.2) continue; ctx.fillStyle = rgb(k % 2 ? lc : lc2, vis); ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 0.045 * lp.k, 0.024 * lp.k, lr() * 3, 0, TAU); ctx.fill(); }
    }
    return t < T;
  }
};

/* ---- the waders' visits: fly in and land, a walk on the grid (the egret in the shallows, the crane on the open ground), fly off ---- */
function waderGround(x, z) { if (!F.pond) return 0; var sd = pondSDF(x, z); return sd < 0 ? lerp(0, WL - 0.07, clamp(-sd / 0.25)) : 0; }   // feet in the water out in the shallows
function waderFlyIn(a, from, land, D) { a.fin = { a: from, b: land, t0: 0, t1: D }; }
function waderAir(e, t) {   // a gliding descent (in) or a climbing departure (out): position and the phase of the flight
  var u = clamp((t - e.t0) / (e.t1 - e.t0)), out = !!e.out, w = out ? u * u : 1 - (1 - u) * (1 - u);
  var p = [lerp(e.a[0], e.b[0], w), lerp(e.a[1], e.b[1], out ? u * u * u : 1 - Math.pow(1 - u, 1.6)), lerp(e.a[2], e.b[2], w)];
  if (out) p[1] = lerp(e.a[1], e.b[1], Math.pow(u, 1.8)); else p[1] = lerp(e.a[1], e.b[1], 1 - Math.pow(1 - u, 0.7)) ;
  return { p: p, u: u };
}
function waderDrawAir(ctx, a, g, kind, e, t) {
  var q = waderAir(e, t), q2 = waderAir(e, Math.min(e.t1, t + 0.05)), s0 = P(q.p[0], q.p[1], q.p[2]), s1 = P(q2.p[0], q2.p[1], q2.p[2]), dx = s1.x - s0.x, dy = s1.y - s0.y, dr = Math.abs(dx) > 0.01 ? (dx > 0 ? 1 : -1) : (a.face || 1);
  a.face = dr; a.dOcc = s0.d - 0.3;
  var land = e.out ? 0 : sstep(0.72, 0.98, q.u), takeoff = e.out ? 1 - sstep(0, 0.3, q.u) : 0, gl = !e.out && q.u > 0.35 && q.u < 0.7;
  var ph = t * (kind === 'tsuru' ? 6.5 : 9) + a.seed, gy = waderGround(q.p[0], q.p[2]), hgt = q.p[1] - gy;
  if (hgt < 2.5) zShadow(ctx, g, q.p[0], q.p[2], 1, WADE[kind].L * 0.8, WADE[kind].L * 0.3, 0.2, 0.7 * (1 - hgt / 2.5), gy < 0 ? undefined : 0);
  zrl(g, dr); zPlace(ctx, q.p[0], q.p[1], q.p[2], dr, 1, 1.0);
  if ((land > 0.85 && !e.out) || takeoff > 0.85) waderPaint(ctx, kind, { t: t, ext: 0.7, wings: 1, step: null });
  else { ctx.translate(0, -WADE[kind].L * 0.45); waderFlyPaint(ctx, kind, { ph: gl ? 0 : ph, glide: gl, land: Math.max(land, takeoff * 0.7), pitch: clamp(Math.atan2(dy, Math.abs(dx) + 0.01), -0.4, 0.4) * dr * 0.6 }); }
  ctx.restore();
}
function waderDrawWalk(ctx, a, g, kind, q, o) {
  var fc = zFacing(a, q.x, q.z, q.hx, q.hz), y = o.lift ? o.lift : waderGround(q.x, q.z), sp = P(q.x, y, q.z); a.dOcc = sp.d;
  if (y < -0.01 && MODE !== 'm') {   // rings round the legs in the water
    var c = P(q.x, WL, q.z), rph = (a.t * 0.7) % 1;
    for (var r = 0; r < 2; r++) { var u = (rph + r * 0.5) % 1, rr = (0.06 + u * 0.3) * c.k; ctx.strokeStyle = 'rgba(232,240,246,' + (0.4 * (1 - u) * (q.amp > 0.1 || o.strike ? 1 : 0.5)) + ')'; ctx.lineWidth = Math.max(0.5, 0.01 * c.k); ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * CAM.s * 0.9, 0, 0, TAU); ctx.stroke(); }
  }
  if (y >= -0.01 && !o.lift) zShadow(ctx, g, q.x, q.z, q.hx, WADE[kind].L * 0.5, WADE[kind].L * 0.2, WADE[kind].legH * 1.4, 0.85);
  zrl(g, fc.dir); zPlace(ctx, q.x, y, q.z, fc.dir, fc.fs, 1.0); waderPaint(ctx, kind, o); ctx.restore();
  if (y < -0.01 && MODE !== 'm') { var wc = mulc(g.SEA.pond || [70, 90, 90], g.tint), b = P(q.x, WL + 0.005, q.z); ctx.fillStyle = rgb(wc, 0.55); ctx.beginPath(); ctx.ellipse(b.x, b.y + 0.02 * b.k, 0.07 * b.k, 0.045 * b.k, 0, 0, TAU); ctx.fill(); }   // the feet under the surface
}
/* ---- 白鷺: a summer egret drops in to the shallows, stalks slowly along the margin, freezes, strikes; walks on and flies off ---- */
RV.sagi = {
  start: function (a, g, R, rng) {
    var G = zGeoReady(R);
    var s1 = zPickStop(G, R, 'wet', 0.1, rng, function (x, z, p) { return -Math.abs(p.x - g.W * 0.55) / g.W * 3 - (pondSDF(x, z) > 0 ? 1 : 0) + (p.y / g.H) * 3; }, null, 0.75) || (R.shallow ? [R.shallow[0], R.shallow[1]] : [LX(3), LZ(3)]);
    var reach = zDistFrom(G, 'wet', 0.1, s1);   // the rest of its walk in the same stretch of shallows
    var s2 = zPickStop(G, R, 'wet', 0.1, rng, function (x, z, p) { return -Math.abs(Math.hypot(x - s1[0], z - s1[1]) - 1.4) + (p.y / g.H) * 2; }, null, 0.75, reach) || s1;
    var s3 = zPickStop(G, R, 'wet', 0.1, rng, function (x, z, p) { return -Math.abs(Math.hypot(x - s2[0], z - s2[1]) - 1.2) - Math.max(0, 1.5 - Math.hypot(x - s1[0], z - s1[1])) + (p.y / g.H) * 2; }, null, 0.75, reach) || s2;
    var side = P(s1[0], 0, s1[1]).x < g.W / 2 ? -1 : 1, from = [R.edgeX(s1[1] + 3, side) + side * 2, 3.6, s1[1] + 3];
    waderFlyIn(a, from, [s1[0], waderGround(s1[0], s1[1]), s1[1]], 4.2);
    a.W = zWalkPlan(G, 'wet', 0.1, s1, [
      { to: s1, gait: 'walk', v: 0.2, stride: 0.24, act: 'settle', dur: 2.2 },
      { to: s2, gait: 'walk', v: 0.2, stride: 0.24, act: 'hunt', dur: 5.5, ra: 1.2 },
      { to: s3, gait: 'walk', v: 0.22, stride: 0.24, act: 'hunt', dur: 4.5, ra: 1.2 }], null, a.fin.t1, true);
    var end = s3, side2 = -side; a.fout = { out: true, a: [end[0], waderGround(end[0], end[1]), end[1]], b: [R.edgeX(end[1] + 3.5, side2) + side2 * 2.5, 4, end[1] + 3.5], t0: a.W.T + 0.4, t1: a.W.T + 4.4 };
    a.T = a.fout.t1; a.ext = 1.0; a.refl = true; a.fish = rng() < 0.6;
  },
  startle: function (a, g) {
    if (a.t < a.fin.t1 || a.t > a.fout.t0) return;
    var q = zWalker(a, a.t), side = P(q.x, 0, q.z).x < g.W / 2 ? -1 : 1, R = g.rp;
    a.fout = { out: true, a: [q.x, waderGround(q.x, q.z), q.z], b: [R.edgeX(q.z + 3, side) + side * 2.5, 4, q.z + 3], t0: a.t + 0.25, t1: a.t + 3.6 }; a.T = a.fout.t1; a.W.T = a.t; a.cut0 = a.t;
  },
  draw: function (ctx, a, g) {
    var t = a.t;
    if (t < a.fin.t1) { waderDrawAir(ctx, a, g, 'sagi', a.fin, t); return true; }
    if (t >= a.fout.t0) { waderDrawAir(ctx, a, g, 'sagi', a.fout, t); return t < a.T; }
    var q = zWalker(a, a.cut0 !== undefined ? Math.min(t, a.cut0) : t), o = { t: t, plumes: true, blink: zblink(t, a.seed % 71), step: q.amp > 0.05 ? q.ph * TAU : null, ext: 0.45 };
    if (q.act === 'settle') { var u = q.au; o.wings = 1 - sstep(0, 0.8, u); o.ext = 0.7; }
    else if (q.act === 'hunt') {   // the neck drawn back, a long still look at the water, the lunge, and up again (with a fish, sometimes)
      var v = q.au, ld = 2.2 + (q.e.ii || 0) * 0.3;
      o.ext = lerp(0.45, 0.15, sstep(0.2, 1.2, v)); o.head = { pitch: 0.35 * sstep(0.5, 1.5, v) };
      if (v > ld && v < ld + 0.6) { var w = (v - ld) / 0.6; o.strike = Math.sin(w * Math.PI); if (!a.splash2 && w > 0.4) { a.splash2 = true; a.cueSplash = true; } }
      else if (v >= ld + 0.6) { o.ext = 0.6; if (a.fish) o.fishUp = 1 - sstep(ld + 2.0, ld + 2.6, v); }
      if (v < 0.1) a.splash2 = false;
    }
    waderDrawWalk(ctx, a, g, 'sagi', q, o);
    return true;
  }
};
/* ---- 丹頂鶴: a winter morning, a crane glides in on the snow, walks and probes, then dances (the bow, wings flung open, a leap)
   and calls with its head thrown back; runs a few steps and lifts off ---- */
RV.tsuru = {
  start: function (a, g, R, rng) {
    var G = zGeoReady(R);
    var s1 = zPickStop(G, R, 'land', 0.4, rng, function (x, z, p) { return -Math.abs(p.x - g.W * 0.5) / g.W * 3 - Math.abs(p.y - g.H * 0.72) / g.H * 4; }, null, 1.4) || [LX(2.5), LZ(2)];
    var s2 = zPickStop(G, R, 'land', 0.4, rng, function (x, z) { return -Math.abs(Math.hypot(x - s1[0], z - s1[1]) - 1.6); }, null, 1.4, zDistFrom(G, 'land', 0.4, s1)) || s1;
    var side = P(s1[0], 0, s1[1]).x < g.W / 2 ? -1 : 1, from = [R.edgeX(s1[1] + 6, side) + side * 4, 7.5, s1[1] + 6];
    waderFlyIn(a, from, [s1[0], 0, s1[1]], 5.5);
    a.W = zWalkPlan(G, 'land', 0.4, s1, [
      { to: s1, gait: 'walk', v: 0.4, stride: 0.5, act: 'settle', dur: 2.5 },
      { to: s2, gait: 'walk', v: 0.45, stride: 0.55, act: 'probe', dur: 4.0, ra: 1.2 },
      { to: s2, gait: 'walk', v: 0.45, stride: 0.55, act: 'dance', dur: 7.5 },
      { to: s2, gait: 'walk', v: 0.45, stride: 0.55, act: 'call', dur: 3.5 }], null, a.fin.t1, true);
    var side2 = -side; a.fout = { out: true, a: [s2[0], 0, s2[1]], b: [R.edgeX(s2[1] + 6, side2) + side2 * 4, 8, s2[1] + 6], t0: a.W.T + 0.5, t1: a.W.T + 5.5 };
    a.T = a.fout.t1; a.ext = 2.2; a.refl = true;
  },
  startle: function (a, g) { RV.sagi.startle(a, g); if (a.fout) { a.fout.t1 = a.fout.t0 + 4.8; a.T = a.fout.t1; } },
  draw: function (ctx, a, g) {
    var t = a.t;
    if (t < a.fin.t1) { waderDrawAir(ctx, a, g, 'tsuru', a.fin, t); return true; }
    if (t >= a.fout.t0) { waderDrawAir(ctx, a, g, 'tsuru', a.fout, t); return t < a.T; }
    var q = zWalker(a, a.cut0 !== undefined ? Math.min(t, a.cut0) : t), o = { t: t, blink: zblink(t, a.seed % 67), step: q.amp > 0.05 ? q.ph * TAU : null, ext: 0.75 };
    var lift = 0;
    if (q.act === 'settle') { o.wings = 1 - sstep(0, 1.2, q.au); o.ext = 0.85; }
    else if (q.act === 'probe') { var u = q.au, dn = Math.max(0, Math.sin(u * 1.6)); o.ext = 0.75 - dn * 0.3; o.strike = dn > 0.6 ? (dn - 0.6) * 2.2 : 0; o.head = { pitch: dn * 0.6 }; }
    else if (q.act === 'dance') {   // bow, wings open, a bounding leap, a bow again
      var v = q.au, c = v % 3.6;
      if (c < 0.9) { o.ext = lerp(0.8, 0.2, sstep(0, 0.6, c)); o.head = { pitch: 0.9 * sstep(0, 0.6, c) }; o.pitch = 0.25 * sstep(0, 0.6, c); }
      else if (c < 2.4) { var w = (c - 0.9) / 1.5; o.wings = Math.sin(w * Math.PI) * 1.0; lift = Math.max(0, Math.sin((w - 0.15) / 0.7 * Math.PI)) * 0.45 * (w > 0.15 && w < 0.85 ? 1 : 0); o.ext = 0.9; o.step = lift > 0 ? 0.5 : null; }
      else { var w2 = (c - 2.4) / 1.2; o.wings = 0.35 * (1 - w2); o.ext = lerp(0.9, 0.6, w2); o.head = { pitch: 0.4 * Math.sin(w2 * Math.PI) }; }
    } else if (q.act === 'call') { var v2 = q.au, cl = sstep(0.3, 0.8, v2) * (1 - sstep(2.6, 3.2, v2)); o.call = cl > 0.5; o.ext = 1; o.wings = cl * 0.3; o.pitch = -0.1 * cl; }
    if (lift) { o.lift = lift; zShadow(ctx, g, q.x, q.z, q.hx, 0.8, 0.35, 0.8, 0.6); }
    waderDrawWalk(ctx, a, g, 'tsuru', q, o);
    return true;
  }
};

/* ---- ゲンジボタルの群れ: a June night swarm over the pond margin and the irises. The males fly low and slow and flash together
   (a quick rise, a slower fade, about every 2 s, the western rhythm; the timing runs across the swarm as a wave, as a big
   group falls into step); the females sit on the iris leaves and grass and answer with a weaker glow just after. Each is
   hidden where something nearer stands in front of it, and shows in the water ---- */
function hotaruSpots(g, R, rng, n) {
  var out = [], G = zGeoReady(R), tries = 0, c = R.pond || [LX(2), LZ(4)];
  while (out.length < n && tries++ < n * 60) {
    var x = c[0] + (rng() - 0.5) * 9, z = c[1] + (rng() - 0.5) * 6.5, sd = F.pond ? pondSDF(x, z) : 0, k = zIdx(G, x, z);
    if (k < 0 || sd < -0.9 || sd > 0.9) continue;
    if (G.K[k] === 1 && sd > 0) continue;                          // not inside a rock, a lantern, a post
    var p = P(x, 0.5, z); if (p.x < 0 || p.x > W || p.y < 10 || p.y > H) continue;
    out.push([x, z, sd]);
  }
  return out;
}
RV.hotaru = {
  start: function (a, g, R, rng) {
    var spots = hotaruSpots(g, R, rng, 150), fl = [], i;
    for (i = 0; i < spots.length; i++) {
      var s = spots[i], fem = i % 5 === 0 && s[2] > -0.1;
      fl.push({ x: s[0], z: s[1], y: fem ? 0.12 + rng() * 0.3 : 0.25 + rng() * 1.1 * (s[2] < 0 ? 0.7 : 1), fem: fem, a1: 0.08 + rng() * 0.12, a2: 0.1 + rng() * 0.15, p1: rng() * TAU, p2: rng() * TAU, r: 0.3 + rng() * 0.5, j: (rng() - 0.5) * 0.12, lag: 0.25 + rng() * 0.25 });
    }
    a.fl = fl; a.T = 30; a.per = 2.05; a.refl = true; a.ext = undefined; a.dOcc = undefined;
    var c = R.pond || [LX(2), LZ(4)]; a.c = c;
  },
  startle: function (a) { a.T = Math.min(a.T, a.t + 3); a.scat = a.t; },
  draw: function (ctx, a, g) {
    var t = a.t, fade = Math.min(1, t / 4, (a.T - t) / 3), spr = sprite('fly'), Z = g.rp.Z, sc = a.scat !== undefined ? clamp((t - a.scat) / 2) : 0, n = 0, cx = 0, cy = 0;
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < a.fl.length; i++) {
      var f = a.fl[i], x, y, z;
      if (f.fem) { x = f.x; y = f.y; z = f.z; }
      else { x = f.x + Math.sin(t * f.a1 + f.p1) * f.r + Math.sin(t * f.a2 * 2.1 + f.p2) * 0.15; y = f.y + Math.sin(t * f.a2 + f.p2) * 0.18 + sc * 0.8; z = f.z + Math.cos(t * f.a1 * 0.8 + f.p2) * f.r * 0.6; }
      // the flash: phase from the swarm's clock, shifted by distance along a slow travelling wave, a little personal jitter
      var wave = ((x - a.c[0]) * 0.08 + (z - a.c[1]) * 0.05), u = ((t / a.per - wave + f.j + (f.fem ? f.lag : 0)) % 1 + 1) % 1;
      var fl = u < 0.08 ? u / 0.08 : u < 0.45 ? Math.pow(1 - (u - 0.08) / 0.37, 1.6) : 0;
      var al = (f.fem ? 0.12 + fl * 0.45 : 0.05 + fl * 0.95) * fade * (1 - sc * 0.6);
      if (sc > 0) al *= 1 - sc * (i % 3 === 0 ? 1 : 0.4);
      if (al < 0.02) continue;
      var q = P(x, y, z);
      if (Z && MODE !== 'm') { var ix = Math.floor(q.x * Z.ms), iy = Math.floor(q.y * Z.ms); if (ix >= 0 && iy >= 0 && ix < Z.w && iy < Z.h) { var k = iy * Z.w + ix, th = 1 + (q.d - Z.d0) / (Z.d1 - Z.d0) * 253; if (Z.A[k] > 60 && Z.D[k] < th - 0.5) al *= 1 - Z.A[k] / 255; } }   // behind the bridge, a rock, a lantern
      if (al < 0.02) continue;
      var sz = 0.03 * q.k;
      stamp(ctx, spr, q.x, q.y, Math.max(3.5, sz * 5), 0, al * 0.5);       // the halo
      stamp(ctx, spr, q.x, q.y, Math.max(1.4, sz * 1.5), 0, al);           // the lantern itself
      if (fl > 0.6 && !f.fem && MODE !== 'm') { ctx.globalAlpha = al * 0.12; ctx.fillStyle = 'rgb(170,230,90)'; var gq = P(x, 0, z); ctx.beginPath(); ctx.ellipse(gq.x, gq.y, sz * 6, sz * 6 * CAM.s, 0, 0, TAU); ctx.fill(); }   // the light it throws on the leaves below
      n++; cx += q.x; cy += q.y;
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (MODE !== 'm') { var p0 = P(a.c[0], 0.6, a.c[1]); RARE_LAST = n ? { x: cx / n, y: cy / n, k: p0.k } : { x: p0.x, y: p0.y, k: p0.k }; }
    return t < a.T;
  }
};

/* ---- the scripted visits: each returns false when finished ---- */
function easeIO(u) { u = clamp(u); return u * u * (3 - 2 * u); }
function arcPos(a, b, u, lift) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * (lift || 0), lerp(a[2], b[2], u)]; }
function startRare(id, g, rng) {
  var R = g.rp, a = { id: id, t: 0, seed: (rng() * 1e6) | 0, dir: 1 };
  if (RV[id]) RV[id].start(a, g, R, rng); else a.T = 0;
  return a;
}
function drawRare(ctx, a, g) { return RV[a.id] ? RV[a.id].draw(ctx, a, g) : false; }

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
function rareStartle(a, g) { // the visitor notices you and leaves the way it would
  if (RV[a.id] && !a.startled) { a.startled = true; try { RV[a.id].startle(a, g); } catch (e) { a.T = Math.min(a.T, a.t + 2); } }
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
    case 'rare': if (rare) { rareStartle(rare, g); cue(rare.id === 'usagi' || rare.id === 'kitsune' || rare.id === 'tanuki' || rare.id === 'shika' ? 'startle' : 'birdtap', { id: rare.id }); } o.dur = 0.1; break;
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

/* ================= what stands in front of a visitor: a depth image of the upright things =================
   Worked out once per painting in the background (sliced like the sway masks): every upright object is drawn as a
   silhouette, back to front, in a grey that encodes its depth, so each pixel keeps the depth of the nearest thing that
   covers it. A visitor at depth d is hidden wherever that depth is less than d (it walks behind the lantern, the trees,
   the bridge, a rock), with the coverage taken from the silhouette's own soft edge. */
async function depthJob(job) {
  var st = saveState();
  setupScene(job); GLOWS = []; TMPS = []; GRAINPAT = null;
  var tick = makeTicker(job, job.budget || 12), tk;
  try {
    var scene = buildScene(), up = scene.up, ms = Math.min(2, Math.max(0.75, KS / 2.5)), mw = Math.ceil(W * ms), mh = Math.ceil(H * ms);
    var dmin = 1e9, dmax = -1e9, i; for (i = 0; i < up.length; i++) { dmin = Math.min(dmin, up[i].key); dmax = Math.max(dmax, up[i].key); }
    if (!(dmax > dmin)) return null;
    var acc = tmpCanvas(mw, mh), ax = acc.getContext('2d'), sc = tmpCanvas(mw, mh), sx = sc.getContext('2d');
    var md = MODE; MODE = 'k';
    try {
      for (i = 0; i < up.length; i++) {          // back to front: the nearer thing paints over
        var o = up[i], v = 1 + Math.round((o.key - dmin) / (dmax - dmin) * 253);
        sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, mw, mh); sx.setTransform(ms, 0, 0, ms, 0, 0);
        safeDraw(o, sx);
        sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; sx.fillRect(0, 0, mw, mh);
        ax.drawImage(sc, 0, 0);
        tk = tick(); if (tk) await tk;
      }
    } finally { MODE = md; }
    var d = ax.getImageData(0, 0, mw, mh).data, D = new Uint8Array(mw * mh), A = new Uint8Array(mw * mh);
    for (i = 0; i < mw * mh; i++) { A[i] = d[i * 4 + 3]; D[i] = A[i] ? Math.round(d[i * 4] * 255 / Math.max(1, A[i])) : 255; }
    return { ms: ms, w: mw, h: mh, D: D, A: A, d0: dmin, d1: dmax };
  } finally { freeTmps(); restoreState(st); }
}
/* the mask of what is in front of depth d inside a box (logical px), drawn into a small canvas at the depth image's scale */
function depthMask(Z, d, bx, by, bw, bh, cache) {
  var ms = Z.ms, x0 = Math.max(0, Math.floor(bx * ms)), y0 = Math.max(0, Math.floor(by * ms)), x1 = Math.min(Z.w, Math.ceil((bx + bw) * ms)), y1 = Math.min(Z.h, Math.ceil((by + bh) * ms));
  if (x1 <= x0 || y1 <= y0) return null;
  var w = x1 - x0, h = y1 - y0, c = cache.c && cache.c.width >= w && cache.c.height >= h ? cache.c : (cache.c = mkCanvas(Math.max(w, cache.c ? cache.c.width : 0), Math.max(h, cache.c ? cache.c.height : 0)));
  var x = c.getContext('2d'), im = x.createImageData(w, h), o = im.data, th = 1 + (d - Z.d0) / (Z.d1 - Z.d0) * 253, any = false;
  for (var j = 0; j < h; j++) { var r = (y0 + j) * Z.w; for (var i = 0; i < w; i++) { var k = r + x0 + i, a = Z.A[k]; if (a && Z.D[k] < th - 0.5) { var q = (j * w + i) * 4; o[q + 3] = a; any = true; } } }
  if (!any) return null;
  x.clearRect(0, 0, c.width, c.height); x.putImageData(im, 0, 0);
  return { c: c, sx: 0, sy: 0, sw: w, sh: h, x: x0 / ms, y: y0 / ms, w: w / ms, h: h / ms };
}

/* a field-guide plate of one model (hidden debug: MogiGarden._dbg.study): the painter drawn large on a plain ground */
var STUDY = { bird2: function (c, o) { if (o.twig) { c.strokeStyle = 'rgb(92,70,52)'; c.lineWidth = 0.012; c.lineCap = 'round'; c.beginPath(); c.moveTo(-0.12, 0.007); c.lineTo(0.12, 0.004); c.stroke(); } if (o.rot) c.rotate(o.rot); if (o.fly) birdFlyPaint2(c, o.kind, o); else birdPaint2(c, o.kind, o); }, hare2: function (c, o) { if (o.hop !== undefined) { var hp = hareHop(o.hop, o.hh || 0.12, o.hl || 0.3); for (var k in hp) if (o[k] === undefined) o[k] = hp[k]; } harePaint2(c, o); }, qdbg: function (c, o) { var R = qRig(o.sp === 'tan' ? TANS : FOXS), Po = qPose(R, o); window.__sk = JSON.stringify({ farH: Po.farH.map(function (b) { return [b.a.map(function(v){return +v.toFixed(3)}), +b.th.toFixed(2)]; }), B: Po.B.slice(5,9).map(function (b) { return [b.a.map(function(v){return +v.toFixed(3)}), +b.th.toFixed(2)]; }) }); }, tan2: function (c, o) { tanukiPaint2(c, o); }, fox2: function (c, o) { foxPaint2(c, o); }, sika: function (c, o) { sikaPaint(c, o); }, wader: function (c, o) { if (o.fly) waderFlyPaint(c, o.kind, o); else waderPaint(c, o.kind, o); }, fox: function (c, o) { foxPaint(c, o); }, tanuki: function (c, o) { tanukiPaint(c, o); }, hare: function (c, o) { if (o.hop !== undefined) { var hp = hareHop(o.hop, 0.12, 0.3); for (var k in hp) if (o[k] === undefined) o[k] = hp[k]; } harePaint(c, o); } };
var STUDY_EXTRA = STUDY;
function rareStudy(canvas, name, o) {
  o = o || {}; var st = saveState();
  try {
    var L = LIGHTS[o.light || 'day']; LIT = L; setLight(L); MODE = 'n'; SEA = SEASONS[o.season || 'summer'];
    var g = { tint: o.tint || lightTint(1), lum: 1, light: L.id, season: o.season || 'summer', SEA: SEA, LIT: L, F: {}, wet: false };
    var ctx = canvas.getContext('2d'), k = o.k || canvas.height * 0.7;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = o.bg || '#7d8a6a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(canvas.width / 2 + (o.cx || 0) * k, canvas.height * (o.gy || 0.85), k * 0.5, k * 0.06, 0, 0, TAU); ctx.fill();
    var gy = canvas.height * (o.gy || 0.85); zrl(g, o.dir || 1); ctx.setTransform((o.dir || 1) * k * (o.fs || 1), 0, 0, k, canvas.width / 2 + (o.cx || 0) * k, gy);
    STUDY[name](ctx, o); return true;
  } finally { restoreState(st); }
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
    if (cur.spec.key === wantKey()) { scheduleSway(); scheduleDepth(); }
    if (first && !readyFired) { readyFired = true; if (typeof o.onReady === 'function') setTimeout(function () { if (!dead) try { o.onReady(api); } catch (e) { if (window.console) console.error(e); } }, 0); }
  }
  /* the trees' sway masks: kept with the painting; if missing, worked out in the background once it is shown */
  function scheduleDepth() { // what stands in front of the visitors (08b_rare): worked out in the background once the painting is shown
    var c = cur; if (c.depth || c.depthTried) return; c.depthTried = true;
    setTimeout(function () {
      if (dead || cur !== c) return;
      enqueue(function () { if (dead || cur !== c) return null; return depthJob(jobFor(c.spec, { get cancelled() { return dead || cur !== c; } })); }).then(function (r) { if (!dead && cur === c && r) { c.depth = r; if (c.geo && c.geo.rp) c.geo.rp.Z = r; } if (!dead && cur === c && c.geo && c.geo.rp && !c.geo.rp.grid) setTimeout(function () { if (!dead && cur === c && !rare) try { inGeo(c.geo, function () { zGeoReady(c.geo.rp); zClear(c.geo.rp.grid, 'land'); }); } catch (e) { /* built on demand instead */ } }, 400); }).catch(function (e) { if (e !== CANCEL && window.console) console.warn('garden: depth', e); });
    }, 900);
  }
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
  /* the visitor on its own layer, cut where something stands in front of it, then put over the overlay */
  var rl = null, rlBox = null, rlMask = {};
  function drawRareLayer(ctx, g, sc) {
    if (!rl) rl = mkCanvas(2, 2); sizeCanvas(rl, fv.width, fv.height);
    var rx = rl.getContext('2d');
    rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalAlpha = 1; rx.globalCompositeOperation = 'source-over';
    if (rlBox) rx.clearRect(rlBox[0], rlBox[1], rlBox[2], rlBox[3]); else rx.clearRect(0, 0, rl.width, rl.height);
    rx.setTransform(sc, 0, 0, sc, 0, 0); RARE_LAST = null;
    var going = drawRare(rx, rare, g);
    if (!going) { rare = null; rlBox = null; rx.setTransform(1, 0, 0, 1, 0, 0); rx.clearRect(0, 0, rl.width, rl.height); return; }
    if (RARE_LAST) rare.scr = { x: RARE_LAST.x, y: RARE_LAST.y, k: RARE_LAST.k };
    var s = rare.scr, ext = (rare.ext || 2.2) * (s ? s.k : 30), bx = s ? s.x - ext * 1.2 : 0, by = s ? s.y - ext * 1.6 : 0, bw = s ? ext * 2.4 : g.W, bh = s ? ext * 2.0 : g.H;
    if (!s || rare.ext === undefined) { bx = 0; by = 0; bw = g.W; bh = g.H; }
    if (rare.box) { bx = rare.box[0]; by = rare.box[1]; bw = rare.box[2] - rare.box[0]; bh = rare.box[3] - rare.box[1]; }
    rlBox = [Math.max(0, Math.floor(bx * sc) - 2), Math.max(0, Math.floor(by * sc) - 2), Math.ceil(bw * sc) + 4, Math.ceil(bh * sc) + 4];
    var Z = cur.depth;
    if (Z && rare.dOcc !== undefined) {
      var m = depthMask(Z, rare.dOcc, bx, by, bw, bh, rlMask);
      if (m) { rx.globalCompositeOperation = 'destination-out'; rx.drawImage(m.c, m.sx, m.sy, m.sw, m.sh, m.x, m.y, m.w, m.h); rx.globalCompositeOperation = 'source-over'; }
    }
    if (rare.cut) { rx.globalCompositeOperation = 'destination-out'; try { rare.cut(rx, g); } catch (e) { /* ignore */ } rx.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(rl, rlBox[0], rlBox[1], rlBox[2], rlBox[3], rlBox[0], rlBox[1], rlBox[2], rlBox[3]); ctx.restore();
  }
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
        if (rare && rare.refl) { var md0 = MODE; MODE = 'm'; wx.globalAlpha = g.light === 'night' ? 0.35 : 0.5; try { drawRare(wx, rare, g); } catch (e) { /* the reflection is a nicety */ } MODE = md0; wx.globalAlpha = 1; wx.globalCompositeOperation = 'source-over'; RARE_LAST = null; }
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
        if (rare) drawRareLayer(ctx, g, sc);
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
try { Object.defineProperty(API, '_dbg', { value: { study: rareStudy, renderStatic: renderStatic, LAY: LAY, BRIDGE: BRIDGE, makeCam: makeCam, focusFor: focusFor, idbOpen: idbOpen }, enumerable: false }); } catch (e) { /* ignore */ }
window.MogiGarden = API;

})();
