/*! MogiGarden — 学びの庭: a painterly Japanese garden that grows with study time.
 * Self-contained, framework-free (ES2017). Canvas-2D procedural painter + light rAF overlays.
 * API: window.MogiGarden = { VERSION, STAGES, stageFor, seasonFor, lightFor, mount }
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
var MODE = 'n';                 // n normal, m mirrored, s shadow projection, k silhouette (normal projection, black)
var F = null, SEA = null, LIT = null; // features, season params, light params
var GRAINPAT = null, GLOWS = [];
var WL = -0.13;                 // water level
var EDGE = 10.95;               // terrace edge

function makeCam(w, h) {
  var th = 26 * Math.PI / 180, dist = 26, tz = 4.5;
  return { s: Math.sin(th), c: Math.cos(th), x: 0.6, y: dist * Math.sin(th), z: tz - dist * Math.cos(th), F: 842, cx: w / 2, cy: 204 + (h - REF_H) / 2 };
}
function setLight(l) {
  SUN = l.sun; SUNC = l.sunc; AMB = l.amb; LS = l.ls;
  SX = -SUN[0] / Math.max(0.12, SUN[1]); SZ = -SUN[2] / Math.max(0.12, SUN[1]);
}
function sil() { return MODE === 's' || MODE === 'k'; }
function P(x, y, z) {
  if (MODE === 'm') y = 2 * WL - y;
  else if (MODE === 's') { x += y * SX; z += y * SZ; y = 0.0; }
  var rx = x - CAM.x, ry = y - CAM.y, rz = z - CAM.z;
  var d = -ry * CAM.s + rz * CAM.c, u = ry * CAM.c + rz * CAM.s;
  return { x: CAM.cx + CAM.F * rx / d, y: CAM.cy - CAM.F * u / d, d: d, k: CAM.F / d };
}
function Pa(p) { return P(p[0], p[1], p[2]); }
function groundAt(sx, sy) {
  var a = (sx - CAM.cx) / CAM.F, b = -(sy - CAM.cy) / CAM.F;
  var dy = -CAM.s + b * CAM.c; if (dy >= 0) return null;
  var t = -CAM.y / dy;
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
  [60, 'もみじの苗', 'もみじの苗を植えました', [-4.95, 0.55, 4.3]],
  [120, '飛び石', '飛び石の小道ができました', [0.45, 0, 1.6]],
  [180, '苔', '庭に苔が広がりはじめました', [-1.2, 0, 3.0]],
  [300, 'つつじと松の苗', 'つつじと若い松を植えました', [5.6, 0.5, 1.3]],
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
  [12000, '苔庭と大もみじ', '苔が庭を覆い、もみじが大きく育ちました', [-4.6, 3.2, 4.3]],
  [15000, '五重塔', '遠くの山に五重塔が見えます', 'pagoda'],
  [18000, '山門', '竹垣に山門を構えました', [2.65, 1.6, 10.45]],
  [21000, '桜並木', '垣根沿いに桜並木が育ちました', [4.1, 2.9, 10.95]],
  [24000, '八つ橋', '菖蒲の沢に八つ橋を渡しました', [2.7, 0, 2.3]],
  [30000, '枝垂れ桜', '枝垂れ桜が咲き、庭が完成しました', [6.1, 3.9, 9.7]]
];
var NST = STAGE_DEFS.length;

/* ================= layout (world units, metres-ish) ================= */
var LAY = {
  rock1: { x: -2.3, z: 1.6 },
  maple: { x: -4.95, z: 4.3 },
  maple2: { x: -6.1, z: 8.7 },
  pine: { x: 6.2, z: 1.05 },
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
var TH = { X0: -3.3, X1: -0.4, ZE: 7.65, ZW: 8.1, ZB: 10.05, FH: 0.5, WT: 2.35, EY: 2.42, RY: 3.9, ov: 0.62 };
function sdE(x, z, e) { var dx = (x - e[0]) / e[2], dz = (z - e[1]) / e[3]; return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(e[2], e[3]); }
function smin(a, b, k) { var h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); }
function pondBase(x, z) { return smin(smin(smin(sdE(x, z, LAY.pondA), sdE(x, z, LAY.pondB), 0.75), sdE(x, z, LAY.pondJ), 0.4), sdE(x, z, LAY.pondC), 0.5) + (NZ.n2(x * 1.2 + 40, z * 1.2) - 0.5) * 0.3; }
function marshSDF(x, z) { return sdE(x, z, LAY.marsh) + (NZ.n2(x * 1.7 + 11, z * 1.7) - 0.5) * 0.22; }
function pondSDF(x, z) { var d = pondBase(x, z); if (F && F.marsh) d = smin(d, marshSDF(x, z), 0.45); return d; }
var BRIDGE = (function () {
  var best = null;
  for (var z = 5.15; z <= 5.6; z += 0.05) {
    var x0 = null, x1 = null;
    for (var x = 0; x <= 5.0; x += 0.02) { if (pondBase(x, z) < 0) { if (x0 === null) x0 = x; x1 = x; } }
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
var PATH_TEA = [[-0.62, 5.3, 0.25, 0.2], [-0.95, 6.0, 0.26, 0.21], [-1.22, 6.68, 0.26, 0.21], [-1.5, 7.28, 0.42, 0.26]];
var PATH_GATE = [[1.25, 7.95, 0.25, 0.2], [1.75, 8.6, 0.24, 0.2], [2.25, 9.25, 0.26, 0.21], [2.6, 9.85, 0.32, 0.22]];
var AZALEAS = [[-3.25, 5.4, 0.6, 0.5], [-1.85, 5.2, 0.42, 0.36], [0.95, 8.2, 0.48, 0.4], [6.25, 4.35, 0.58, 0.48], [3.95, 1.25, 0.42, 0.36], [-2.55, 3.95, 0.4, 0.34], [-0.15, 9.0, 0.45, 0.38]];

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
function gravelInfo(Fx) { return Fx.kare ? { cx: -3.15, cz: 1.45, rx: 3.75, rz: 2.0 } : { cx: -2.9, cz: 1.45, rx: 3.3, rz: 1.82 }; }
function rakeRocks(Fx) {
  var r = []; if (Fx.rock1) r.push({ x: -2.3, z: 1.6, r: 0.62, n: 4 });
  if (Fx.kare) r.push({ x: -3.75, z: 1.0, r: 0.42, n: 4 }, { x: -4.55, z: 2.05, r: 0.5, n: 4 }, { x: -1.2, z: 0.7, r: 0.5, n: 3 });
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
    sun: norm([-0.74, 0.46, -0.3]), sunc: [0.98, 0.92, 0.84], amb: [0.6, 0.66, 0.78], ls: [-0.74, -0.62],
    skyTop: [176, 196, 218], skyHor: [232, 230, 224], haze: [214, 220, 226], sunX: 0.08, sunY: -0.04, sunGlow: 'rgba(255,244,222,0.85)',
    shadow: [70, 86, 124], shadowA: 0.42, hazeK: 1.35, lit: false, wash: ['rgba(230,240,255,0.30)', 'rgba(220,232,250,0.08)'],
    grade: [[236, 242, 252], [226, 232, 240], [200, 204, 214]], bloom: 0.24, vig: [200, 202, 206], mist: 0.55
  },
  day: {
    sun: norm([0.80, 0.56, -0.22]), sunc: [1.0, 0.86, 0.66], amb: [0.52, 0.57, 0.70], ls: [0.76, -0.65],
    skyTop: [200, 210, 220], skyHor: [238, 228, 208], haze: [222, 216, 204], sunX: 0.94, sunY: -0.04, sunGlow: 'rgba(255,240,205,0.8)',
    shadow: [64, 74, 112], shadowA: 0.5, hazeK: 1, lit: false, wash: ['rgba(255,214,150,0.38)', 'rgba(255,200,140,0.10)'],
    grade: null, bloom: 0.22, vig: [196, 182, 170], mist: 0.3
  },
  dusk: {
    sun: norm([0.86, 0.26, 0.3]), sunc: [1.0, 0.62, 0.36], amb: [0.46, 0.43, 0.56], ls: [0.9, -0.4],
    skyTop: [96, 92, 140], skyHor: [252, 168, 98], haze: [204, 146, 150], sunX: 0.86, sunY: 0.24, sunGlow: 'rgba(255,170,90,0.9)',
    shadow: [64, 50, 100], shadowA: 0.44, hazeK: 1.0, lit: true, wash: ['rgba(255,150,70,0.40)', 'rgba(255,120,70,0.10)'],
    grade: [[255, 226, 198], [186, 168, 206], [222, 186, 160]], gradeMid: 0.42, bloom: 0.34, vig: [130, 104, 130], mist: 0.35
  },
  night: {
    sun: norm([-0.46, 0.62, 0.5]), sunc: [0.46, 0.56, 0.82], amb: [0.2, 0.26, 0.44], ls: [-0.6, -0.8],
    skyTop: [10, 18, 44], skyHor: [44, 62, 104], haze: [40, 54, 92], sunX: 0.17, sunY: 0.1, sunGlow: 'rgba(170,190,255,0.35)',
    shadow: [20, 26, 60], shadowA: 0.4, hazeK: 0.9, lit: true, wash: ['rgba(120,150,230,0.18)', 'rgba(80,100,180,0.06)'],
    grade: [[150, 168, 220], [126, 142, 198], [92, 104, 158]], bloom: 0.3, vig: [60, 66, 110], mist: 0.25, moon: true
  }
};

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
  for (i = 0; i < t.sprays.length; i++) { var s = t.sprays[i], p = Pa(s.p); if (filt(p)) list.push({ s: s, p: p }); }
  list.sort(function (a, b) { return b.p.d - a.p.d; });
  if (sil()) {
    ctx.fillStyle = '#000';
    for (i = 0; i < list.length; i++) { var q = list[i], rr = q.s.r * q.p.k; ctx.beginPath(); ctx.ellipse(q.p.x, q.p.y, rr * 0.95, rr * 0.42, 0, 0, TAU); ctx.fill(); }
    return;
  }
  opt = opt || {};
  var pal = opt.pal || SEA.maple, alt = opt.pal ? opt.alt : SEA.mapleAlt, altK = opt.pal ? (opt.altK || 0) : SEA.altAmt, rng = mulberry32(t.seed + 5), C = t.center, R = t.R;
  var NB = 10, dq = Math.sqrt(DQ), big = t.H > 2.5, blossom = opt.kind === 'blossom', dens = opt.density || 1, haze = opt.haze || 0;
  var tint = LIT.foliageTint || null, acc = opt.accent ? [new Path2D(), new Path2D()] : null;
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
  }
}
function drawMaple(ctx, t) {
  var cd = Pa(t.center).d;
  var bark = [[40, 32, 30], [80, 68, 62], [122, 108, 96]];
  if (!SEA.maple) { drawBareTree(ctx, t, bark); return; } // winter: bare structure, twigs and snow
  var mo = { cap: 118 };
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
  bark: [[30, 26, 28], [62, 54, 56], [96, 86, 86]]
};
function genSakura(seed, x, z, g, by, hsc, maxl) { var t = genMaple(seed, x, z, g, by, hsc || 1.12, maxl); t.sakura = true; t.sprays.forEach(function (s) { s.r *= maxl === 4 ? 1.4 : 1.2; }); return t; }
function sakuraMode() { return SEA === SEASONS.spring ? 'bloom' : SEA === SEASONS.summer ? 'leaf' : SEA === SEASONS.autumn ? 'autumn' : 'bare'; }
function drawSakura(ctx, t, o) {
  o = o || {};
  var mode = sakuraMode(), cd = Pa(t.center).d;
  if (mode === 'bare') { drawBareTree(ctx, t, SAKURA.bark); return; }
  var far = !!o.far, dab = far ? 0.125 : o.dab || null, cap = far ? 50 : o.cap || 110;
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
function paintPad(ctx, pad, rng) {
  var p = P(pad.x, pad.y, pad.z), rx = pad.r * p.k, ry = pad.r * p.k * 0.3 + pad.t * p.k * 0.3, i;
  if (sil()) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * 1.05, ry * 1.1, 0, 0, TAU); ctx.fill(); return; }
  var tint = LIT.foliageTint || null, pal = PINE_PAL.map(function (c) { return tc(c, tint); });
  ctx.fillStyle = rgb(pal[0]);
  for (i = 0; i < 7; i++) { var u = (i / 6 - 0.5) * 1.5; ctx.beginPath(); ctx.ellipse(p.x + u * rx * 0.62, p.y + ry * 0.25 + (rng() - 0.5) * ry * 0.2, rx * 0.42, ry * 0.62, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = rgb(pal[1]); ctx.beginPath(); ctx.ellipse(p.x, p.y + ry * 0.05, rx * 0.92, ry * 0.78, 0, 0, TAU); ctx.fill();
  var NB = 7, paths = []; for (i = 0; i < NB; i++) paths.push(new Path2D());
  var cnt = Math.min(420 * DQ, Math.max(20, rx * ry * 1.25 * DQ)), nl = Math.max(1.2, 0.075 * p.k) / Math.sqrt(DQ);
  var snowP = SEA.snow ? new Path2D() : null, candle = SEA === SEASONS.spring ? new Path2D() : null;
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
  var bark = [[44, 34, 34], [86, 70, 66], [128, 112, 104]];
  var st = t.strands.map(function (s) { return { s: s, p: Pa(strandPt(s, 0.5)) }; }).sort(function (a, b) { return b.p.d - a.p.d; });
  var tint = LIT.foliageTint || null;
  function strands(filter) {
    var NB = 8, paths = [], i, b; for (b = 0; b < NB; b++) paths.push(new Path2D());
    var lines = new Path2D();
    var pal = mode === 'bloom' ? [[146, 104, 120], [186, 138, 156], [214, 170, 186], [232, 196, 208], [244, 218, 226], [250, 234, 238], [253, 244, 246], [255, 250, 250]]
      : mode === 'leaf' ? [[14, 34, 18], [24, 52, 24], [40, 74, 32], [60, 98, 40], [86, 124, 52], [118, 150, 70], [150, 174, 96], [184, 198, 128]]
        : mode === 'autumn' ? [[86, 22, 16], [130, 36, 22], [170, 56, 28], [204, 84, 36], [222, 116, 48], [236, 150, 66], [244, 184, 96], [250, 210, 140]] : null;
    for (i = 0; i < st.length; i++) {
      var s = st[i].s; if (!filter(st[i].p)) continue;
      var N = 9, prev = null, r2 = mulberry32(s.seed);
      for (var k = 0; k <= N; k++) { var q = Pa(strandPt(s, k / N)); if (prev) { lines.moveTo(prev.x, prev.y); lines.lineTo(q.x, q.y); } prev = q; }
      if (!pal || sil()) continue;
      var dens = mode === 'bloom' ? 26 : mode === 'leaf' ? 22 : 9;
      dens = dens * DQ;
      var nrm = norm([s.s[0] - t.center[0] + s.out[0], 0.6, s.s[2] - t.center[2] + s.out[2]]), lit = clamp(0.35 + 0.55 * dot(nrm, SUN));
      for (var d = 0; d < dens; d++) {
        var tt = Math.pow(r2(), 0.8), wp = strandPt(s, tt), p = Pa(wp), sz = (mode === 'bloom' ? 0.055 : 0.05) * p.k / Math.sqrt(DQ) * (1.1 - tt * 0.35);
        var jx = (r2() - 0.5) * 0.09 * p.k, jy = (r2() - 0.5) * 0.06 * p.k;
        var l2 = clamp(lit + (r2() - 0.5) * 0.45 - tt * 0.15);
        var bb = Math.min(NB - 1, Math.round(l2 * (NB - 1)));
        paths[bb].moveTo(p.x + jx + sz, p.y + jy); paths[bb].ellipse(p.x + jx, p.y + jy, sz, sz * 0.8, 0, 0, TAU);
      }
    }
    ctx.strokeStyle = sil() ? '#000' : rgb(tc(mode === 'bare' ? [70, 54, 50] : [78, 56, 52], tint)); ctx.lineWidth = sil() ? 0.5 : 0.32; ctx.stroke(lines);
    if (pal && !sil()) for (b = 0; b < NB; b++) { ctx.fillStyle = rgb(tc(pal[b], tint)); ctx.fill(paths[b]); }
    if (mode === 'bare' && SEA.snow && !sil()) { /* light frosting on strands */ }
  }
  // crown top cushion (blossom clouds sitting on the limbs)
  function crown(filter) {
    if (mode === 'bare') return;
    var cl = [], r3 = mulberry32(t.seed + 4);
    t.segs.slice(3).forEach(function (s) { for (var k = 0; k < 2; k++) cl.push({ x: lerp(s.a[0], s.b[0], r3()) + (r3() - 0.5) * 0.3, y: lerp(s.a[1], s.b[1], r3()) + 0.12, z: lerp(s.a[2], s.b[2], r3()) + (r3() - 0.5) * 0.3, r: 0.3 + r3() * 0.15, tone: 0 }); });
    var pal = mode === 'bloom' ? [[156, 112, 128], [198, 152, 168], [226, 186, 200], [242, 212, 222], [252, 234, 240], [255, 247, 249]] : mode === 'leaf' ? [[16, 36, 20], [30, 60, 28], [52, 88, 38], [84, 120, 52], [124, 152, 74], [164, 182, 108]] : [[110, 30, 20], [160, 52, 28], [200, 84, 36], [228, 126, 56], [244, 170, 90], [250, 206, 140]];
    paintFoliage(ctx, cl, { pal: pal, center: t.center, R: t.R, kind: 'oval', dab: 0.05, density: mode === 'autumn' ? 0.6 : 1.3, max: 160, seed: t.seed + 8, sparse: mode === 'autumn', tint: tint, mass: 0.5 }, filter);
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
    var col = shade(alb, n), hy = (tt.c[1] - R.by) / (R.ry || 1);
    col = scl(col, 0.6 + 0.4 * clamp(hy * 1.6 + 0.3));
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
  var zf = LAY.fenceZ, x0 = -9.5, x1 = 10.5, Hh = 1.72, rng = mulberry32(12), S = sil(), n = [0, 0, -1];
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
  var lt = lightTint(0.7), night = LIT === LIGHTS.night, ice = SEA.snow, dq = Math.sqrt(DQ);
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
var YATSU = [[1.2, 2.72], [1.98, 2.18], [2.76, 2.62], [3.54, 2.08], [4.3, 2.48]];
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
function pagodaPos() { return { x: P(0.75, 0, 12).x, y: CAM.cy - 124 }; }
function paintBackdrop(ctx) {
  var rng = mulberry32(301), L = LIT, yo = CAM.cy - 204, night = L === LIGHTS.night;
  var top = mixc(L.skyTop, SEA.sky, night ? 0 : 0.25), hor = L.skyHor;
  var yH = 130 + yo;
  var g = ctx.createLinearGradient(0, 0, 0, yH); g.addColorStop(0, rgb(top)); g.addColorStop(0.6, rgb(mixc(top, hor, 0.7))); g.addColorStop(1, rgb(hor)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, yH + 20);
  var sx = W * L.sunX, sy = yo + 140 * L.sunY;
  var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 260); sg.addColorStop(0, L.sunGlow); sg.addColorStop(1, 'rgba(255,230,200,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, yH + 20);
  if (night) {
    var sr = mulberry32(5);
    for (var i = 0; i < 160; i++) { var x = sr() * W, y = sr() * (yH - 30), a = 0.25 + sr() * 0.6, r = 0.25 + sr() * 0.5; ctx.fillStyle = 'rgba(230,236,255,' + a * clamp(1 - y / yH) + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    // moon
    var mx = W * 0.17, my = 30 + yo * 0.5, mr = 9;
    var mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 6); mg.addColorStop(0, 'rgba(220,230,255,0.35)'); mg.addColorStop(1, 'rgba(200,215,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    ctx.fillStyle = 'rgb(246,244,232)'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(200,196,180,0.35)'; [[-3, -2, 2.6], [2.5, 1.5, 2], [-1, 3.5, 1.6], [3, -3, 1.2]].forEach(function (c) { ctx.beginPath(); ctx.arc(mx + c[0], my + c[1], c[2], 0, TAU); ctx.fill(); });
  } else if (L === LIGHTS.dusk) {
    ctx.fillStyle = 'rgba(255,214,150,0.9)'; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, TAU); ctx.fill();
  }
  // clouds: soft streaks
  var cr = mulberry32(17);
  for (i = 0; i < 9; i++) {
    var cx = cr() * W, cy = 8 + cr() * (yH * 0.45), cw = 50 + cr() * 90, chh = 4 + cr() * 6;
    var cc = night ? 'rgba(90,110,160,0.18)' : L === LIGHTS.dusk ? 'rgba(255,190,150,0.35)' : 'rgba(255,255,255,0.32)';
    var gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw / 2); gg.addColorStop(0, cc); gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, chh / (cw / 2)); ctx.translate(-cx, -cy); ctx.fillStyle = gg; ctx.fillRect(cx - cw / 2, cy - cw / 2, cw, cw); ctx.restore();
  }
  var haze = L.haze;
  var layers = [{ y: 18, amp: 16, col: [150, 160, 170], hz: 0.62, f: 0.012, tree: 0.0 }, { y: 40, amp: 14, col: [108, 120, 108], hz: 0.48, f: 0.02, tree: 0.4 }, { y: 62, amp: 12, col: [92, 100, 72], hz: 0.32, f: 0.03, tree: 0.8 }, { y: 86, amp: 10, col: [80, 84, 56], hz: 0.18, f: 0.045, tree: 1 }];
  var crowns = SEA.ridge, lt = lightTint(1);
  layers.forEach(function (Ly, li) {
    var pts = [];
    for (var x2 = -10; x2 <= W + 10; x2 += 4) pts.push([x2, yo + Ly.y - Ly.amp * NZ.fbm(x2 * Ly.f + li * 7, li * 3.1, 4) * 1.6 + Ly.amp * 0.4]);
    ctx.beginPath(); ctx.moveTo(-10, yo + 160); pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.lineTo(W + 10, yo + 160); ctx.closePath();
    var lcol = mixc(mulc(Ly.col, lt), haze, Ly.hz);
    if (SEA.snow && li < 2) lcol = mixc(lcol, mulc([236, 240, 248], lt), 0.55 - li * 0.15);
    ctx.fillStyle = rgb(lcol); ctx.fill();
    if (SEA.snow && li < 3) { // snow caps on ridges
      ctx.save(); ctx.clip(); ctx.fillStyle = rgb(mulc([244, 246, 250], lt), 0.55); ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); for (var k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], pts[k][1] + 6 + NZ.n2(pts[k][0] * 0.1, li) * 6); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (Ly.tree > 0) {
      var cnt = Math.floor((1700 * Ly.tree + 250) * Math.min(2, DQ));
      var NB = 4, paths = [], cols = [];
      crowns.forEach(function (cc) { for (var b = 0; b < NB; b++) { var c = mulc(scl(cc, 0.86 + (b + 0.5) / NB * 0.2), lt); c = mixc(c, haze, Ly.hz + 0.16); paths.push([new Path2D(), new Path2D()]); cols.push(c); } });
      for (var i2 = 0; i2 < cnt; i2++) {
        var x3 = rng() * W * 1.06 - 8, ix = Math.max(0, Math.min(pts.length - 1, Math.round((x3 + 10) / 4))), yr = pts[ix][1], y3 = yr + Math.pow(rng(), 1.6) * (yo + 110 - yr) * 0.9 + 1;
        var r = (0.8 + rng() * 1.3) * (0.6 + Ly.tree * 0.6) / Math.sqrt(Math.min(2, DQ)), ci = (rng() * crowns.length) | 0, b2 = Math.min(NB - 1, (rng() * NB) | 0), pp2 = paths[ci * NB + b2];
        pp2[0].moveTo(x3 + r, y3); pp2[0].ellipse(x3, y3, r, r * 0.8, 0, 0, TAU);
        var hx = x3 + r * 0.3 * Math.sign(L.ls[0]); pp2[1].moveTo(hx + r * 0.5, y3 - r * 0.3); pp2[1].ellipse(hx, y3 - r * 0.3, r * 0.5, r * 0.4, 0, 0, TAU);
      }
      for (var b3 = 0; b3 < paths.length; b3++) { ctx.fillStyle = rgb(cols[b3], 0.55); ctx.fill(paths[b3][0]); ctx.fillStyle = rgb(mixc(scl(cols[b3], 1.12), haze, 0.2), 0.4); ctx.fill(paths[b3][1]); }
    }
    var mg2 = ctx.createLinearGradient(0, yo + Ly.y + Ly.amp * 0.2, 0, yo + Ly.y + Ly.amp * 1.6); mg2.addColorStop(0, rgb(haze, 0)); mg2.addColorStop(0.5, rgb(haze, 0.45 * L.hazeK)); mg2.addColorStop(1, rgb(haze, 0)); ctx.fillStyle = mg2; ctx.fillRect(0, yo + Ly.y, W, Ly.amp * 2);
    if (li === 2 && F.pagoda) { var pp = pagodaPos(); drawPagoda(ctx, pp.x, pp.y, 0.78, mixc(mulc([78, 52, 42], lt), haze, 0.3), L.lit); }
  });
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
      if (SEA.snow) { ctx.strokeStyle = rgb(mulc(SNOW, lt)); ctx.lineWidth = Math.max(0.5, 0.03 * a2.k); ctx.beginPath(); ctx.moveTo(a2.x, a2.y - 0.6); ctx.lineTo(b2.x, b2.y - 0.6); ctx.stroke(); }
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
var GG = { x0: -10.5, z0: -4, st: 0.08 };
function buildGrid() {
  var nx = Math.ceil(22 / GG.st) + 2, nz = Math.ceil(16.5 / GG.st) + 2, N = nx * nz;
  var soil = new Float32Array(N), grass = new Float32Array(N), moss = new Float32Array(N), snow = new Float32Array(N), pd = new Float32Array(N), gnz = new Float32Array(N), gcol = new Float32Array(N);
  var mx = LAY.maple.x, mz = LAY.maple.z, lx = LAY.lantern.x, lz = LAY.lantern.z, tcx = (TH.X0 + TH.X1) / 2, n2 = NZ.n2, fbm = NZ.fbm;
  for (var j = 0; j < nz; j++) {
    var z = GG.z0 + j * GG.st;
    for (var i = 0; i < nx; i++) {
      var x = GG.x0 + i * GG.st, k = j * nx + i;
      soil[k] = fbm(x * 0.7, z * 0.7, 3); grass[k] = fbm(x * 0.55 + 3, z * 0.55 + 9, 2);
      var p = F.pond && x > -1.6 && x < 7.8 && z > 0.8 && z < 9 ? pondSDF(x, z) : 9; pd[k] = p;
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
  var tmp = [0, 0, 0], GD = S.grid, gnx = GD.nx, gst = GD.nz, Gsoil = GD.soil, Ggrass = GD.grass, Gmoss = GD.moss, Gsnow = GD.snow, Gpd = GD.pd, Ggnz = GD.gnz, Ggcol = GD.gcol, Gedge = GD.edge, ist = 1 / GG.st;
  for (var py = y0; py < y1; py++) {
    var sy = (py + 0.5) / KS, b = -(sy - CAM.cy) / CAM.F, dy = -CAM.s + b * CAM.c, rowk = py * PW * 4, px;
    if (dy >= 0) { for (px = 0; px < PW; px++) D[rowk + px * 4 + 3] = 0; continue; }
    var t = -CAM.y / dy, z = CAM.z + t * (CAM.c + b * CAM.s), fp = t / (CAM.F * KS) * 1.9;
    var hz = clamp((t - 22) / 40) * 0.35 * hazeK, rowNearPond = pondOn && z > 1.2 && z < 8.6, rowNearGravel = (gravelOn || outlineOn) && Math.abs(z - G.cz) < G.rz * 1.2;
    var tx = t / CAM.F, x0 = CAM.x - tx * CAM.cx;
    var fz = (z - GG.z0) * ist, iz = fz | 0; if (iz < 0) iz = 0; if (iz > gst - 2) iz = gst - 2; var tz = fz - iz; if (tz > 1) tz = 1; if (tz < 0) tz = 0; var zo = iz * gnx;
    for (px = 0; px < PW; px++) {
      var k = rowk + px * 4, x = x0 + tx * (px + 0.5) / KS;
      var fx = (x - GG.x0) * ist, ix = fx | 0; if (ix < 0) ix = 0; if (ix > gnx - 2) ix = gnx - 2; var tq = fx - ix; if (tq > 1) tq = 1; if (tq < 0) tq = 0;
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
      if (rowNearPond && x > -1.2 && x < 7.4) pd = Gpd[i00] * w00 + Gpd[i10] * w10 + Gpd[i01] * w01 + Gpd[i11] * w11;
      // gravel ellipse distance
      var ge = 9;
      if (rowNearGravel) { var ex = (x - G.cx) / G.rx, ez = (z - G.cz) / G.rz; ge = Math.sqrt(ex * ex + ez * ez); if (ge < 1.2) ge += (Ggnz[i00] * w00 + Ggnz[i10] * w10 + Ggnz[i01] * w01 + Ggnz[i11] * w11 - 0.5) * 0.08; }
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
          for (var ri = 0; ri < nR; ri++) { var rr = RR[ri], ddx = x - rr.x, ddz = z - rr.z, dd = Math.sqrt(ddx * ddx + ddz * ddz), di = dd - rr.r, lim = rr.n * sp; if (di < lim && di / lim < best) { best = di / lim; ph = di / sp; gx = ddx / (dd || 1); gz = ddz / (dd || 1); } }
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
        if (teahouse && x > TH.X0 - 0.5 && x < TH.X1 + 0.5 && z > TH.ZE - 0.35 && z < TH.ZE + 0.6) snA *= 0.3;
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
  [[730, -3.6, 11.45, 3.4, 0], [731, 4.4, 11.5, 3.8, 1], [732, -8.0, 11.3, 4.2, 2]].forEach(function (a) {
    if (sname === 'spring') { // someiyoshino in full bloom beyond the fence (the avenue takes their place once it grows)
      if (F.namiki && a[4] < 2) return;
      var sk = genSakura(a[0], a[1], a[2], a[3] / 4.4, 0, 1.25, 4); put(a[1], a[2], { draw: function (c) { drawSakura(c, sk, { density: 1.15, haze: 0.16, far: true }); }, noRefl: true }); return;
    }
    var t = makeTallTree(a[0], a[1], a[2], a[3], a[3] * 0.36, hz(edgeTreePal(a[4])), 'small'); put(a[1], a[2], { draw: function (c) { drawTallTree(c, t); }, noRefl: true });
  });
  if (F.namiki) LAY.namiki.forEach(function (a, ii) { // the cherry avenue along the fence
    var nt = genSakura(760 + ii, a[0], a[1], a[2] / 4.6, 0, 1.2, 4); put(a[0], a[1], { draw: function (c) { drawSakura(c, nt, { density: 1.2, haze: 0.06, far: true, pink: true }); }, noRefl: true });
  });
  var EP2 = [0, 0, 0, 1, 1, 5, 5, 2, 3];
  for (var i = 0; i < 19; i++) {
    var x = -8.6 + i * 0.95 + (er() - 0.5) * 0.7, z = 11.0 + er() * 0.6, kind = EP2[(er() * EP2.length) | 0], R = 0.55 + er() * 0.55, Hh = 0.7 + er() * 0.8;
    (function (x, z, kind, R, Hh, ii) {
      var bare = edgeBareFor(kind);
      var sh = makeShrub(600 + ii, x, z, R, Hh, hz(EP[kind]), { litBoost: -0.04, dab: 0.08, density: 0.6, sparse: bare, snow: bare ? 0.2 : 0.7 });
      put(x, z, { draw: function (c) { drawShrub(c, sh); }, ao: function (c) { shrubAO(c, sh); }, noRefl: true });
    })(x, z, kind, R, Hh, i);
  }
  var cedar = makeTallTree(701, -6.9, 11.6, 13, 1.8, [[10, 18, 14], [18, 30, 22], [28, 44, 30], [42, 60, 40], [62, 80, 50], [92, 104, 64]], 'cedar'); put(-6.9, 11.6, { draw: function (c) { drawTallTree(c, cedar); }, noRefl: true });
  var ginkgo = makeTallTree(702, 7.9, 11.4, 9, 2.4, SEA.ginkgo, 'ginkgo'); put(7.9, 11.4, { draw: function (c) { drawTallTree(c, ginkgo); }, noRefl: true });
  // rocks
  if (F.rock1) { var rk = makeRock(101, -2.3, 1.6, 0.62, 0.55, 0.48, { alb: [146, 140, 128], moss: F.rockMoss, flat: 0.72, amp: 0.3 }); put(-2.3, 1.6, { draw: function (c) { drawRock(c, rk); }, ao: function (c) { rockAO(c, rk); } }); }
  if (F.lantern) { var rk2 = makeRock(104, -1.62, 2.3, 0.28, 0.2, 0.24, { alb: [140, 136, 126], moss: F.rockMoss, flat: 0.5 }); put(-1.62, 2.3, { draw: function (c) { drawRock(c, rk2); }, ao: function (c) { rockAO(c, rk2); } }); }
  if (F.kare) [[110, -3.75, 1.0, 0.34, 1.12, 0.3], [111, -4.55, 2.05, 0.46, 0.7, 0.38], [112, -1.2, 0.7, 0.5, 0.3, 0.4], [113, -3.15, 0.5, 0.24, 0.3, 0.2]].forEach(function (a) {
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
    flat.push({ draw: function (c) { drawRock(c, r, 0.6); }, ao: function (c) { rockAO(c, r); }, key: P(st[0], 0, st[1]).d });
  });
  // grass / weed tufts
  var tr = mulberry32(321), nt = s === 0 ? 120 : s <= 2 ? 60 : s <= 4 ? 40 : 24, G = gravelInfo(F);
  var tuftPal = SEA.snow ? [[120, 106, 70], [160, 140, 96], [200, 186, 140]] : sname === 'autumn' || s < 3 ? [[96, 88, 48], [150, 136, 76], [200, 182, 112]] : [[52, 74, 30], [96, 118, 48], [160, 164, 80]];
  for (i = 0; i < nt; i++) {
    var tx = -6 + tr() * 12.5, tz = -0.8 + tr() * 11, ge = Math.hypot((tx - G.cx) / G.rx, (tz - G.cz) / G.rz), ts = (s === 0 ? 0.16 : 0.12) + tr() * 0.12, seed = tr() * 1e6 | 0;
    if ((F.gravel || F.gravelOutline) && ge < 1.1) continue; if (F.pond && pondSDF(tx, tz) < 0.25) continue; if (F.hill && hillH(tx, tz) > 0) continue;
    if (F.teahouse && tx > TH.X0 - 0.3 && tx < TH.X1 + 0.3 && tz > TH.ZE - 0.3) continue;
    (function (tx, tz, ts, seed) { put(tx, tz, { draw: function (c) { grassTuft(c, tx, tz, ts, mulberry32(seed), tuftPal); }, noShadow: true }); })(tx, tz, ts, seed);
  }
  if (F.weeds) { // a few taller weeds and a stray stone
    var wr = mulberry32(44);
    for (i = 0; i < 26; i++) { (function (wx, wz, seed) { put(wx, wz, { draw: function (c) { grassTuft(c, wx, wz, 0.32, mulberry32(seed), tuftPal); grassTuft(c, wx + 0.08, wz + 0.05, 0.22, mulberry32(seed + 1), tuftPal); } }); })(-5 + wr() * 11, 0 + wr() * 9.5, wr() * 1e6 | 0); }
  }
  // young cherry, planted early, maturing with the garden
  if (F.ycherry > 0) { var yc = genSakura(91, LAY.ycherry.x, LAY.ycherry.z, F.ycherry * 0.82, 0, 1.15, 4); put(LAY.ycherry.x, LAY.ycherry.z, { draw: function (c) { drawSakura(c, yc, { density: 0.85, dab: 0.08, cap: 80, pink: true }); }, ao: function (c) { mapleAO(c, yc); } }); }
  if (F.wisteria) { var wz = LAY.wis; put((wz.x0 + wz.x1) / 2, (wz.z0 + wz.z1) / 2, { draw: drawWisteria, ao: function (c) { [[wz.x0, wz.z0], [wz.x1, wz.z0], [wz.x0, wz.z1], [wz.x1, wz.z1]].forEach(function (q) { var p = P(q[0], 0, q[1]); c.beginPath(); c.ellipse(p.x, p.y, 0.12 * p.k, 0.05 * p.k, 0, 0, TAU); c.fill(); }); } }); }
  // maple
  if (F.maple > 0) { var mt = genMaple(9, LAY.maple.x, LAY.maple.z, F.maple); put(LAY.maple.x, LAY.maple.z, { draw: function (c) { drawMaple(c, mt); }, ao: function (c) { mapleAO(c, mt); } }); }
  if (F.maple2 > 0) { var mt2 = genMaple(47, LAY.maple2.x, LAY.maple2.z, F.maple2); put(LAY.maple2.x, LAY.maple2.z, { draw: function (c) { drawMaple(c, mt2); }, ao: function (c) { mapleAO(c, mt2); } }); }
  // azaleas
  if (F.azaleas > 0) AZALEAS.forEach(function (a, ii) {
    if (ii === 6 && !F.teahouse) return;
    var sc = F.azaleas, bloom = SEA.azBloom, acc;
    if (bloom) acc = { p: bloom.p * (0.6 + 0.4 * sc), pal: bloom.pal, kind: 'circle', s: 0.9 };
    else if (sname === 'autumn') acc = { p: 0.12, pal: [[84, 30, 20], [118, 46, 26], [150, 70, 36]] };
    else if (sname === 'summer') acc = { p: 0.05, pal: [[150, 40, 70], [200, 80, 110], [230, 130, 150]], kind: 'circle', s: 0.8 };
    var sh = makeShrub(400 + ii, a[0], a[1], a[2] * sc, a[3] * sc, SEA.shrub, { accent: acc, dab: 0.045 });
    put(a[0], a[1], { draw: function (c) { drawShrub(c, sh); }, ao: function (c) { shrubAO(c, sh); } });
  });
  if (F.pine > 0) { var pt = genPine(23, LAY.pine.x, LAY.pine.z, F.pine); pt.yuki = true; put(LAY.pine.x, LAY.pine.z, { draw: function (c) { drawPine(c, pt); }, ao: function (c) { var p = Pa(pt.base); c.beginPath(); c.ellipse(p.x, p.y, 0.4 * p.k * pt.S + 1, 0.15 * p.k * pt.S + 0.6, 0, 0, TAU); c.fill(); } }); }
  if (F.pond) {
    var rr = mulberry32(77), placed = [];
    for (i = 0; i < 5000 && placed.length < 34; i++) {
      var px = -0.2 + rr() * 6.8, pz = 2.4 + rr() * 5.6, d = pondBase(px, pz);
      if (Math.abs(d) > 0.06) continue;
      if (Math.abs(pz - BRIDGE.zc) < 0.75 && (Math.abs(px - BRIDGE.x0) < 0.7 || Math.abs(px - BRIDGE.x1) < 0.7)) continue;
      if (Math.abs(px - LAY.fall.x) < 0.75 && pz > 7.0) continue;
      if (px > 1.0 && px < 4.4 && pz < 3.5) continue; // where the iris marsh joins later
      if (placed.some(function (p) { return Math.hypot(p[0] - px, p[1] - pz) < 0.62; })) continue;
      placed.push([px, pz]);
    }
    placed.forEach(function (p, ii) {
      var sz = 0.18 + ((ii * 37) % 10) / 10 * 0.17;
      var r = makeRock(300 + ii, p[0], p[1], sz * 1.3, sz * (0.45 + ((ii * 53) % 7) / 14), sz, { alb: [[138, 132, 122], [124, 120, 114], [146, 138, 124]][ii % 3], moss: F.rockMoss * 0.45, flat: 0.6, amp: 0.34, nu: 18, nv: 9 });
      put(p[0], p[1], { draw: function (c) { drawRock(c, r); }, ao: function (c) { rockAO(c, r); }, refl: true });
    });
    var big = makeRock(150, 4.95, 4.75, 0.5, 0.46, 0.4, { alb: [134, 128, 118], moss: F.rockMoss, flat: 0.72 }); put(4.95, 4.75, { draw: function (c) { drawRock(c, big); }, ao: function (c) { rockAO(c, big); }, refl: true });
    // lilies and floating things on the water surface
    if (F.lilies && SEA.lily !== 'none') {
      var lr = mulberry32(909), nl = 0, want = Math.round(16 * F.lilyN);
      for (i = 0; i < 600 && nl < want; i++) {
        var lx = 0.6 + lr() * 5.2, lz = 3.2 + lr() * 4.0; if (pondBase(lx, lz) > -0.3) continue; if (Math.abs(lz - BRIDGE.zc) < 0.7 && lx > BRIDGE.x0 && lx < BRIDGE.x1) continue;
        var groupN = 2 + (lr() * 3 | 0), ls = lr() * 1e6 | 0;
        (function (lx, lz, groupN, ls) {
          surf.push(function (c) { var r2 = mulberry32(ls); for (var g = 0; g < groupN; g++) drawLily(c, lx + (r2() - 0.5) * 0.4, lz + (r2() - 0.5) * 0.3, 0.1 + r2() * 0.06, r2, g === 0 && r2() < 0.7); });
        })(lx, lz, groupN, ls);
        nl++;
      }
    }
  }
  if (F.irises) {
    var ir = [[-0.05, 4.4], [4.6, 3.7], [4.3, 6.0], [1.4, 6.9], [4.5, 7.6], [6.0, 7.0], [3.0, 7.55]];
    ir.forEach(function (a, ii) { var q = nearPondEdge(a[0], a[1]); put(q[0], q[1], { draw: function (c) { drawIrisClump(c, q[0], q[1], 1, 1200 + ii); }, refl: true }); });
  }
  if (F.marsh) {
    var mr = mulberry32(1300);
    for (i = 0; i < 18; i++) { (function (a, b2, sd) { if (marshSDF(a, b2) > 0.02) return; put(a, b2, { draw: function (c) { drawIrisClump(c, a, b2, 0.68, sd); }, refl: true }); })(1.3 + mr() * 3.0, 1.85 + mr() * 0.85, 1400 + i); }
    put(2.75, 2.35, { draw: drawYatsuhashi, refl: true });
  }
  if (F.lantern) put(LAY.lantern.x, LAY.lantern.z, { draw: function (c) { drawLantern(c, LAY.lantern, LIT.lit); }, ao: function (c) { var p = P(LAY.lantern.x, 0, LAY.lantern.z); c.beginPath(); c.ellipse(p.x, p.y, 0.42 * p.k, 0.17 * p.k, 0, 0, TAU); c.fill(); }, refl: true });
  if (F.bridge) put((BRIDGE.x0 + BRIDGE.x1) / 2, BRIDGE.zc - 0.3, { draw: drawBridge, refl: true });
  if (F.fence) put(0, LAY.fenceZ, { draw: function (c) { drawFence(c, F.gate ? [LAY.gate.xa - 0.05, LAY.gate.xb + 0.05] : null); }, ao: function (c) { var a = P(-9, 0, LAY.fenceZ), b = P(10, 0, LAY.fenceZ); c.fillRect(a.x, a.y - 1.2, b.x - a.x, 2.6); }, noRefl: true });
  if (F.gate) put((LAY.gate.xa + LAY.gate.xb) / 2, LAY.fenceZ - 0.05, { draw: drawGate, noRefl: true });
  if (F.teahouse) put(-1.95, 8.6, { draw: function (c) { drawTeahouse(c, LIT.lit); }, ao: function (c) { var a = P(TH.X0 - 0.2, 0, TH.ZE - 0.1), b = P(TH.X1 + 0.3, 0, TH.ZE - 0.1); c.beginPath(); c.ellipse((a.x + b.x) / 2, a.y - 1, (b.x - a.x) / 2 + 3, 4, 0, 0, TAU); c.fill(); } });
  if (F.smallLanterns) { put(-2.55, 7.25, { draw: function (c) { smallLantern(c, -2.55, 7.25, LIT.lit); } }); put(4.7, 5.55, { draw: function (c) { smallLantern(c, 4.7, 5.55, LIT.lit); }, refl: true }); }
  if (F.tsukubai) { flat.push({ draw: drawUmi, key: P(LAY.tsukubai.x, 0, LAY.tsukubai.z - 0.15).d }); put(LAY.tsukubai.x, LAY.tsukubai.z, { draw: drawTsukubai, anchor: 'tsuku' }); }
  if (F.hill) {
    put(LAY.hill.x, LAY.hill.z, { draw: drawHill, key: P(LAY.hill.x, 0, LAY.hill.z + 0.3).d, refl: true });
    var fx = LAY.fall.x;
    [[160, fx - 0.55, 8.05, 0.42, 1.0, 0.36], [161, fx + 0.58, 8.0, 0.46, 1.25, 0.38], [162, fx + 1.2, 8.3, 0.38, 0.62, 0.32], [163, fx - 1.25, 8.4, 0.34, 0.5, 0.3], [164, fx + 0.1, 8.55, 0.5, 1.75, 0.4], [165, fx - 0.3, 7.55, 0.22, 0.2, 0.2], [166, fx + 0.42, 7.5, 0.26, 0.24, 0.22]].forEach(function (a) {
      var y0 = Math.max(0, hillH(a[1], a[2]) - 0.25), r = makeRock(a[0], a[1], a[2], a[3], a[4], a[5], { alb: [118, 114, 108], moss: 0.7, flat: 0.8, by: y0 });
      put(a[1], a[2], { draw: function (c) { drawRock(c, r); }, key: P(a[1], 0, a[2]).d, refl: true });
    });
    put(fx, 7.8, { draw: drawWaterfall, key: P(fx, 0, 7.75).d, noShadow: true, refl: true, anchor: 'fall' });
    var hs = makeShrub(470, fx - 1.0, 8.9, 0.55, 0.5, SEA.shrub, { by: hillH(fx - 1.0, 8.9) - 0.1, accent: SEA.azBloom ? { p: 0.4, pal: SEA.azBloom.pal, kind: 'circle' } : sname === 'autumn' ? { p: 0.25, pal: [[90, 14, 14], [150, 30, 22], [200, 60, 30]] } : null });
    put(fx - 1.0, 8.9, { draw: function (c) { drawShrub(c, hs); }, key: P(fx - 1.0, 0, 8.6).d });
    var hy = hillH(7.75, 8.35) - 0.05, hp = genPine(29, 7.75, 8.35, 0.4, hy); put(7.75, 8.35, { draw: function (c) { drawPine(c, hp); }, key: P(7.75, 0, 8.1).d });
  }
  if (F.shishi) { var sx = LAY.shishi; put(sx.x, sx.z, { draw: function (c) { drawShishiStatic(c); }, anchor: 'shishi' }); }
  if (F.cherry) { var cy0 = hillH(LAY.cherry.x, LAY.cherry.z), ch = genCherry(77, LAY.cherry.x, LAY.cherry.z, Math.max(0, cy0 - 0.1)); put(LAY.cherry.x, LAY.cherry.z, { draw: function (c) { drawCherry(c, ch); }, ao: function (c) { var p = P(LAY.cherry.x, cy0, LAY.cherry.z); c.beginPath(); c.ellipse(p.x, p.y, 0.5 * p.k, 0.2 * p.k, 0, 0, TAU); c.fill(); } }); }
  // floating leaves / petals on water
  if (F.pond) {
    var fr = mulberry32(808), nf = SEA.fallen === 'leaf' ? Math.round(24 * clamp(F.maple)) : SEA.fallen === 'petal' ? 46 + (F.namiki ? 24 : 0) + (F.cherry ? 40 : 0) : 0;
    surf.push(function (c) {
      for (var k = 0; k < nf; k++) {
        var x = 0.4 + fr() * 6, z = 2.6 + fr() * 5; if (pondSDF(x, z) > -0.1) continue;
        var p = P(x, WL, z);
        if (sil()) { c.fillStyle = '#000'; c.beginPath(); c.arc(p.x, p.y, 0.06 * p.k, 0, TAU); c.fill(); continue; }
        if (SEA.fallen === 'leaf') leafShape(c, p.x, p.y, 0.07 * p.k, fr() * TAU, 0.5, rgb(mulc(ramp([[150, 30, 20], [214, 80, 34], [236, 150, 60]], fr()), lightTint(1))));
        else { var pa = fr() * TAU; c.save(); c.translate(p.x, p.y); c.scale(1, 0.5); petalShape(c, 0, 0, 0.03 * p.k, pa, rgb(mulc(mixc([238, 204, 214], [253, 244, 246], fr()), lightTint(1)), 0.95)); c.restore(); }
      }
    });
  }
  up.sort(function (a, b) { return b.key - a.key; }); flat.sort(function (a, b) { return b.key - a.key; });
  return { up: up, flat: flat, surf: surf };
}
function drawFallen(ctx) {
  var rng = mulberry32(4242), G = gravelInfo(F), mode = SEA.fallen, i;
  if (mode === 'leaf') {
    var n = Math.round(190 * clamp(F.maple * 1.1)) + (F.maple2 ? 40 : 0), lt = lightTint(1);
    for (i = 0; i < n; i++) {
      var x, z, r = rng();
      if (r < 0.55) { var a = rng() * TAU, d = Math.sqrt(rng()) * 2.6 * Math.max(0.4, F.maple); x = LAY.maple.x + Math.cos(a) * d + 0.6; z = LAY.maple.z + Math.sin(a) * d * 0.8; } else { x = -5.5 + rng() * 11.5; z = -0.6 + rng() * 10.5; }
      var col = rgb(mulc(ramp([[110, 24, 18], [170, 40, 24], [210, 76, 32], [232, 124, 48], [200, 150, 80]], rng()), lt)), sz = 0.06 + rng() * 0.04, rot = rng() * TAU;
      if (F.pond && pondSDF(x, z) < 0.05) continue; if (F.hill && hillH(x, z) > 0.05) continue;
      var ge = Math.hypot((x - G.cx) / G.rx, (z - G.cz) / G.rz); if (F.gravel && ge < 1 && rng() < 0.75) continue;
      var p = P(x, 0.01, z); leafShape(ctx, p.x, p.y, sz * p.k, rot, 0.5, col);
    }
  } else if (mode === 'petal') {
    var lt2 = lightTint(1), pts = [], dq = Math.sqrt(DQ);
    function under(cx, cz, R, n, sq) { for (var k = 0; k < n; k++) { var a2 = rng() * TAU, d2 = Math.pow(rng(), 0.7) * R; pts.push([cx + Math.cos(a2) * d2, cz + Math.sin(a2) * d2 * (sq || 0.75), 0]); } }
    for (i = 0; i < 150 * dq; i++) pts.push([-6.5 + rng() * 14, -0.8 + rng() * 11.4, 0]);           // blown in from everywhere
    for (i = 0; i < 90 * dq; i++) pts.push([-7 + rng() * 15, 9.2 + rng() * 1.2, 0]);                   // drifted against the fence
    if (F.ycherry > 0.3) under(LAY.ycherry.x + 0.3, LAY.ycherry.z - 0.4, 2.2 * F.ycherry, Math.round(160 * F.ycherry * dq));
    if (F.namiki) LAY.namiki.forEach(function (a) { under(a[0], 10.0, 2.0, Math.round(60 * dq), 0.3); });
    if (F.cherry) under(LAY.cherry.x - 0.4, LAY.cherry.z - 0.8, 2.8, Math.round(220 * dq), 0.7);
    if (F.azaleas > 0.7) AZALEAS.forEach(function (az) { for (var k = 0; k < 10; k++) pts.push([az[0] + (rng() - 0.5) * 1.6, az[1] + (rng() - 0.5) * 0.9, 1]); });
    var NBp = 4, bp = [], k3; for (k3 = 0; k3 < NBp + 1; k3++) bp.push(new Path2D());
    pts.forEach(function (q) {
      if (q[1] > EDGE - 0.2) return;
      if (F.pond && pondSDF(q[0], q[1]) < 0.05) return; if (F.hill && hillH(q[0], q[1]) > 0.05 && rng() < 0.5) return;
      var ge = Math.hypot((q[0] - G.cx) / G.rx, (q[1] - G.cz) / G.rz); if (F.gravel && ge < 1 && rng() < 0.6) return;
      if (F.teahouse && q[0] > TH.X0 - 0.2 && q[0] < TH.X1 + 0.2 && q[1] > TH.ZE - 0.1) return;
      var p = P(q[0], 0.01, q[1]), sz = (0.022 + rng() * 0.014) * p.k, a = rng() * TAU, ix = q[2] ? NBp : (rng() * NBp) | 0, path = bp[ix];
      sz = Math.max(sz, 0.3 / dq);
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
function saveState() { return { W: W, H: H, KS: KS, DQ: DQ, CAM: CAM, SUN: SUN, SUNC: SUNC, AMB: AMB, LS: LS, SX: SX, SZ: SZ, MODE: MODE, F: F, SEA: SEA, LIT: LIT, GRAINPAT: GRAINPAT, GLOWS: GLOWS, TMPS: TMPS }; }
function restoreState(s) { W = s.W; H = s.H; KS = s.KS; DQ = s.DQ; CAM = s.CAM; SUN = s.SUN; SUNC = s.SUNC; AMB = s.AMB; LS = s.LS; SX = s.SX; SZ = s.SZ; MODE = s.MODE; F = s.F; SEA = s.SEA; LIT = s.LIT; GRAINPAT = s.GRAINPAT; GLOWS = s.GLOWS; TMPS = s.TMPS; }
function setupScene(o) {
  W = o.W; H = o.H; KS = o.KS; DQ = o.DQ || 1; CAM = makeCam(W, H); F = features(o.stage); SEA = SEASONS[o.season]; LIT = LIGHTS[o.light]; setLight(LIT); MODE = 'n';
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
  var bd = tmpCanvas(hw, hh), bdx = bd.getContext('2d'); lsT(bdx, KS * hw / bw); bdx.fillStyle = rgb(LIT.haze); bdx.fillRect(0, 0, W, H); paintBackdrop(bdx);
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(softBlur(bd, 0.3 * KS), 0, 0, bw, bh);
  bd.width = bd.height = 0;
  mark('backdrop');
  await tick(true);
  // 2. ground (per pixel, sliced)
  var gc = tmpCanvas(bw, bh), gx = gc.getContext('2d'), img = gx.createImageData(bw, bh), mimg = F.pond ? gx.createImageData(bw, bh) : null;
  var gs = groundSetup(), rows = Math.max(4, Math.round(60000 / bw));
  for (var y = 0; y < bh; y += rows) { groundRows(img.data, mimg ? mimg.data : null, bw, y, Math.min(bh, y + rows), gs); tk = tick(); if (tk) await tk; }
  gx.putImageData(img, 0, 0); img = null;
  ctx.drawImage(gc, 0, 0);
  var mc = null;
  if (F.pond) { mc = tmpCanvas(bw, bh); mc.getContext('2d').putImageData(mimg, 0, 0); mimg = null; }
  mark('ground');
  await tick(true);
  // 3. water: reflections, sheen
  if (F.pond) {
    var rc = tmpCanvas(hw, hh), rx = rc.getContext('2d'); lsT(rx, KS * hw / bw);
    MODE = 'm'; var dq0 = DQ; DQ = Math.max(0.5, DQ * 0.5);
    for (var i = 0; i < scene.up.length; i++) { var o = scene.up[i]; if (o.noRefl) continue; if (!o.refl && !(o.x > -1.5 && o.x < 8.5 && o.z > 2.2)) continue; o.draw(rx); tk = tick(); if (tk) await tk; }
    MODE = 'n'; DQ = dq0;
    rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = 'destination-in'; rx.drawImage(mc, 0, 0, hw, hh);
    var r2 = tmpCanvas(hw, hh), r2x = r2.getContext('2d'), amp = KS * hw / bw;
    for (var yy = 0; yy < hh; yy += 1) { var off = (Math.sin(yy / amp * 0.9) * 1.1 + Math.sin(yy / amp * 0.26) * 0.7) * amp; r2x.drawImage(rc, 0, yy, hw, 1, off, yy, hw, 1); }
    r2x.globalCompositeOperation = 'source-atop'; r2x.fillStyle = LIT === LIGHTS.night ? 'rgba(10,16,40,0.35)' : 'rgba(20,24,30,0.26)'; r2x.fillRect(0, 0, hw, hh);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = SEA.snow ? 0.5 : 0.66; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(r2, 0, 0, bw, bh); ctx.restore();
    // sheen glints
    var sc = tmpCanvas(bw, bh), sx = sc.getContext('2d'); lsT(sx, KS);
    var rng = mulberry32(808), gcol = LIT === LIGHTS.night ? [190, 210, 255] : LIT === LIGHTS.dusk ? [255, 210, 170] : [255, 246, 230];
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
  scene.flat.forEach(function (o) { o.draw(ctx); });
  scene.surf.forEach(function (f) { f(ctx); });
  drawFallen(ctx);
  mark('aoflat');
  tk = tick(); if (tk) await tk;
  // 6. cast shadows (half res)
  var shc = tmpCanvas(hw, hh), shx = shc.getContext('2d'); lsT(shx, KS * hw / bw);
  MODE = 's'; dq0 = DQ; DQ = Math.max(0.5, DQ * 0.5);
  for (i = 0; i < scene.up.length; i++) { if (!scene.up[i].noShadow) scene.up[i].draw(shx); tk = tick(); if (tk) await tk; }
  MODE = 'n'; DQ = dq0;
  shx.setTransform(1, 0, 0, 1, 0, 0); shx.globalCompositeOperation = 'destination-in'; shx.drawImage(gc, 0, 0, hw, hh);
  compositeLayer(ctx, shc, 1.2 * KS * hw / bw, LIT.shadowA, LIT.shadow);
  mark('shadow');
  await tick(true);
  // 7. upright objects on their own layer (its alpha occludes the water for animation)
  var obj = tmpCanvas(bw, bh), ox = obj.getContext('2d'); lsT(ox, KS);
  var oprof = job.prof ? [] : null;
  for (i = 0; i < scene.up.length; i++) { var to = now(); scene.up[i].draw(ox); if (oprof) { ox.getImageData(0, 0, 1, 1); oprof.push([(now() - to), +scene.up[i].x.toFixed(2), +scene.up[i].z.toFixed(2)]); } tk = tick(); if (tk) await tk; }
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
      for (var j = 0; j < scene.up.length; j++) { var u = scene.up[j]; if (u.key < a.key - 0.02 && u.anchor !== a.id) u.draw(oc); }
      oc.restore();
    });
    MODE = 'n';
  }
  freeTmps(); mark('mask');
  return { canvas: out, mask: wm, occ: occ, glows: glows, ms: now() - t0, phases: PH };
}
function post(ctx, bw, bh, glows, reflGlows, mc) {
  var yo = CAM.cy - 204, i;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // depth of field: soften distance and the very front
  var b = softBlur(ctx.canvas, 2.0 * KS), tb = tmpCanvas(bw, bh), tbx = tb.getContext('2d');
  tbx.drawImage(b, 0, 0); tbx.globalCompositeOperation = 'destination-in';
  function st(ly) { return clamp((ly + yo) / H); }
  var gm = tbx.createLinearGradient(0, 0, 0, bh);
  gm.addColorStop(0, 'rgba(0,0,0,0.9)'); gm.addColorStop(st(0.2 * 300), 'rgba(0,0,0,0.5)'); gm.addColorStop(st(0.36 * 300), 'rgba(0,0,0,0)'); gm.addColorStop(Math.max(st(0.36 * 300) + 0.01, st(0.88 * 300)), 'rgba(0,0,0,0)'); gm.addColorStop(1, 'rgba(0,0,0,0.7)');
  tbx.fillStyle = gm; tbx.fillRect(0, 0, bw, bh); ctx.drawImage(tb, 0, 0);
  // light wash from the sun / moon
  var L = LIT, sx = bw * (L.sunX < 0.5 ? L.sunX - 0.08 : L.sunX + 0.08), sy = (yo * KS) + bh * 0 - bh * 0.05 + L.sunY * KS * 120;
  var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, bw * 1.1);
  sg.addColorStop(0, L.wash[0]); sg.addColorStop(0.55, L.wash[1]); sg.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = sg; ctx.fillRect(0, 0, bw, bh);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = L === LIGHTS.night ? 0.25 : 0.45; ctx.fillRect(0, 0, bw, bh); ctx.globalAlpha = 1;
  if (L.grade) {
    ctx.globalCompositeOperation = 'multiply'; var dg = ctx.createLinearGradient(0, 0, 0, bh);
    dg.addColorStop(0, rgb(L.grade[0])); dg.addColorStop(L.gradeMid ? st(L.gradeMid * 300) : 0.45, rgb(L.grade[1])); dg.addColorStop(1, rgb(L.grade[2])); ctx.fillStyle = dg; ctx.fillRect(0, 0, bw, bh);
  }
  if (L.lit) {
    ctx.globalCompositeOperation = 'lighter';
    var gk = L === LIGHTS.night ? 1.25 : 0.85;
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
  if (F.hill) { var f = LAY.fall; box('fall', P(f.x, 0, 7.75).d, f.x - f.wd, f.x + f.wd, WL - 0.05, f.ytop + 0.12, f.zbot - 0.15, f.ztop + 0.1); }
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
var KOI_PAT = [
  { base: [240, 236, 226], patch: [214, 52, 30] }, { base: [238, 128, 34] }, { base: [236, 196, 70] },
  { base: [236, 232, 222], patch: [24, 22, 24], patch2: [206, 54, 30] }, { base: [214, 66, 34], patch: [244, 236, 220] }, { base: [240, 236, 228], patch: [230, 120, 40] }, { base: [70, 70, 76], patch: [214, 120, 40] }
];
function animGeo(o) {
  var g = { W: W, H: H, KS: KS, cam: CAM, F: F, SEA: SEA, LIT: LIT, season: o.season, light: o.light, stage: o.stage };
  var rng = mulberry32(1000 + o.stage * 7);
  g.tint = lightTint(1); var tl = (g.tint[0] + g.tint[1] + g.tint[2]) / 3; g.lum = clamp(tl / 1.15, 0.25, 1.1);
  g.anchors = animAnchors();
  var openW = SEA.snow ? -0.62 : -0.14;
  if (F.pond) {
    // shimmer glints and ripple seeds on open water
    g.glints = []; g.ripplePts = [];
    for (var i = 0; i < 4000 && g.glints.length < 90; i++) {
      var x = -0.8 + rng() * 8.2, z = 1.6 + rng() * 6.6, d = pondSDF(x, z); if (d > openW) continue;
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
        var c0 = null; for (var q = 0; q < 300; q++) { var cx = k < nk - 1 ? 0.9 + rng() * 2.6 : 1.5 + rng() * 3.5, cz = k < nk - 1 ? 3.4 + rng() * 1.3 : 4.0 + rng() * 3.4; if (pondBase(cx, cz) < deep - 0.15) { c0 = [cx, cz]; break; } }
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
      if (best) g.koi.push({ path: best, pat: KOI_PAT[k % KOI_PAT.length], len: 0.4 + rng() * 0.14, sp: (0.1 + rng() * 0.08) * (SEA.snow ? 0.55 : 1), off: rng() * 50, ph: rng() * TAU });
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
      var fx = -4 + rng() * 11, fz = 1.5 + rng() * 8.2; if (F.pond && pondSDF(fx, fz) < -0.3) { if (rng() < 0.7) continue; }
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
  var fb = P(0, 0, LAY.fenceZ), pc = P(2.5, 0, 5.2);
  g.mist = { y1: fb.y - 4, y2: pc.y, a: LIT.mist, col: LIT === LIGHTS.night ? [120, 140, 190] : mixc(LIT.haze, [255, 255, 255], 0.35) };
  g.birds = o.light !== 'night';
  g.horizonY = fb.y;
  return g;
}

/* ---- per-frame painters ---- */
function drawKoi(ctx, k, t, lum, tint) {
  var s = t * k.sp + k.off, q = pathAt(k.path, s), L = k.len, px = -q.dz, pz = q.dx;
  var wig = Math.sin(t * 5.2 + k.ph), y = WL - 0.06, N = 7, wid = [0.02, 0.05, 0.062, 0.056, 0.04, 0.022, 0.009], L2 = [], R2 = [], spine = [];
  for (var i = 0; i < N; i++) {
    var f = i / (N - 1), sw = wig * 0.055 * f * f * L / 0.3, cx = q.x - q.dx * (f - 0.35) * L + px * sw, cz = q.z - q.dz * (f - 0.35) * L + pz * sw, w = wid[i] * L / 0.3;
    spine.push([cx, cz]); L2.push(P(cx + px * w, y, cz + pz * w)); R2.push(P(cx - px * w, y, cz - pz * w));
  }
  var tl = spine[N - 1], tdx = tl[0] - spine[N - 2][0], tdz = tl[1] - spine[N - 2][1], tdl = Math.hypot(tdx, tdz) || 1; tdx /= tdl; tdz /= tdl;
  var fw = 0.06 * L / 0.3, fl = 0.07 * L / 0.3, swing = wig * 0.4;
  var fa = P(tl[0] + tdx * fl + (-tdz) * fw * (1 + swing), y, tl[1] + tdz * fl + tdx * fw * (1 + swing)), fb2 = P(tl[0] + tdx * fl - (-tdz) * fw * (1 - swing), y, tl[1] + tdz * fl - tdx * fw * (1 - swing)), fm = P(tl[0] + tdx * fl * 0.55, y, tl[1] + tdz * fl * 0.55);
  var col = mulc(k.pat.base, tint);
  // soft shadow on the pond floor
  ctx.fillStyle = 'rgba(10,18,20,' + (0.22 * lum) + ')'; ctx.beginPath(); var c0 = P(q.x + 0.03, y - 0.05, q.z - 0.03); ctx.ellipse(c0.x, c0.y, L * 0.45 * c0.k, L * 0.12 * c0.k, Math.atan2(R2[0].y - R2[N - 1].y, R2[0].x - R2[N - 1].x), 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(L2[0].x, L2[0].y);
  for (i = 1; i < N; i++) ctx.lineTo(L2[i].x, L2[i].y);
  ctx.lineTo(fa.x, fa.y); ctx.lineTo(fm.x, fm.y); ctx.lineTo(fb2.x, fb2.y);
  for (i = N - 1; i >= 0; i--) ctx.lineTo(R2[i].x, R2[i].y);
  var hd = P(spine[0][0] + q.dx * 0.03 * L / 0.3, y, spine[0][1] + q.dz * 0.03 * L / 0.3); ctx.quadraticCurveTo(hd.x, hd.y, L2[0].x, L2[0].y); ctx.closePath();
  ctx.fillStyle = rgb(col); ctx.fill();
  if (k.pat.patch) {
    ctx.save(); ctx.clip();
    var pp = P(spine[2][0], y, spine[2][1]); ctx.fillStyle = rgb(mulc(k.pat.patch, tint)); ctx.beginPath(); ctx.ellipse(pp.x, pp.y, L * 0.18 * pp.k, L * 0.09 * pp.k, Math.atan2(R2[0].y - R2[4].y, R2[0].x - R2[4].x), 0, TAU); ctx.fill();
    var p2 = P(spine[4][0], y, spine[4][1]); ctx.fillStyle = rgb(mulc(k.pat.patch2 || k.pat.patch, tint)); ctx.beginPath(); ctx.ellipse(p2.x, p2.y, L * 0.1 * p2.k, L * 0.07 * p2.k, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // pectoral fins
  ctx.fillStyle = rgb(mulc(mixc(k.pat.base, [255, 255, 255], 0.3), tint), 0.55);
  [1, -1].forEach(function (sd) { var b = spine[1], fp = P(b[0] + px * sd * 0.075 * L / 0.3 - q.dx * 0.03, y, b[1] + pz * sd * 0.075 * L / 0.3 - q.dz * 0.03); ctx.beginPath(); ctx.ellipse(fp.x, fp.y, 0.025 * fp.k, 0.012 * fp.k, Math.atan2(q.dz, q.dx), 0, TAU); ctx.fill(); });
}
function drawWaterLayer(ctx, g, t) {
  var lum = g.lum, tint = g.tint, i;
  if (g.koi && g.koi.length) {
    for (i = 0; i < g.koi.length; i++) drawKoi(ctx, g.koi[i], t, lum, tint);
    // sink them under the surface
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = rgb(mixc(g.SEA.pond, g.LIT.skyHor, 0.3), 0.24); ctx.fillRect(0, 0, g.W, g.H); ctx.globalCompositeOperation = 'source-over';
  }
  if (g.glints) {
    var night = g.LIT === LIGHTS.night, dusk = g.LIT === LIGHTS.dusk, gc = night ? [200, 214, 255] : dusk ? [255, 214, 170] : [255, 250, 236];
    ctx.strokeStyle = rgb(gc); ctx.lineCap = 'round';
    for (i = 0; i < g.glints.length; i++) {
      var q = g.glints[i], s = Math.sin(t * q.w + q.ph), a = s > 0 ? Math.pow(s, 3) * q.a : 0; if (a < 0.02) continue;
      var dx = Math.sin(t * 0.7 + q.ph) * q.l * 0.4;
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
function shishiAngle(t) {
  var T = 9.2, u = t % T, rest = -0.62, tip = 0.5;
  if (u < 7.2) return rest + 0.13 * Math.pow(u / 7.2, 2.2);           // slowly filling, open end sinking
  if (u < 7.6) { var a = (u - 7.2) / 0.4; return lerp(rest + 0.13, tip, a * a); }   // tips
  if (u < 7.95) return tip + 0.03 * Math.sin((u - 7.6) * 30) * (1 - (u - 7.6) / 0.35); // pours
  if (u < 8.25) { var b = (u - 7.95) / 0.3; return lerp(tip, rest, 1 - Math.pow(1 - b, 2)); } // swings back
  var c = (u - 8.25) / 0.95; return rest + 0.05 * Math.sin(c * Math.PI * 3) * (1 - c);              // clack + settle
}
function drawAnchorLayer(ctx, g, t, still) {
  var F0 = g.F, i, lt = g.tint, night = g.LIT === LIGHTS.night;
  if (g.fall) {
    var f = g.fall, wc = night ? [160, 180, 214] : mulc([236, 244, 248], lt), ice = g.SEA.snow ? 0.55 : 1;
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
      ctx.strokeStyle = night ? 'rgba(170,190,230,0.45)' : 'rgba(220,236,240,0.55)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(top.x + 0.4, (top.y + bot.y) / 2, bot.x + 0.3, bot.y); ctx.stroke();
      var per = 0.9, n = Math.floor(t / per);
      for (var k = n - 1; k <= n; k++) {
        var age = t - k * per; if (k < 0 || age > 1.6) continue;
        var dt = age; if (dt < 0.22) { var yy = lerp(0.6, 0.335, (dt / 0.22) * (dt / 0.22)), dp = P(sx + 0.01, yy, sz); ctx.fillStyle = 'rgba(235,245,250,0.85)'; ctx.beginPath(); ctx.ellipse(dp.x + 0.2, dp.y, 0.35, 0.55, 0, 0, TAU); ctx.fill(); }
        else { var ra = (dt - 0.22) / 1.3, c = P(tg.basin[0] - 0.03, 0.326, tg.basin[2]), r = (0.015 + ra * 0.09) * c.k; ctx.strokeStyle = 'rgba(230,240,246,' + (0.55 * (1 - ra)) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * 0.45, 0, 0, TAU); ctx.stroke(); }
      }
    }
  }
  if (F0.shishi) {
    var ang = still ? -0.62 : shishiAngle(t), sg = shishiGeom(), ends = drawShishiTube(ctx, ang), sp = P(sg.spout[0], sg.spout[1], sg.spout[2]), op = Pa(ends.open);
    if (!g.SEA.snow) {
      ctx.strokeStyle = night ? 'rgba(170,190,230,0.5)' : 'rgba(225,238,244,0.6)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x + 0.2, Math.max(sp.y + 1, op.y - 0.5)); ctx.stroke();
      var u = t % 9.2;
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
    var sp = 2.2 + i * 0.9, w = 150 + i * 30, x = ((t * sp + i * 137) % (g.W + w * 2)) - w, y = lerp(m.y1, m.y2, i / 4) + Math.sin(t * 0.13 + i) * 3;
    stamp(ctx, spr, x, y, w, 7 + i * 1.5, m.a * (0.28 + 0.06 * Math.sin(t * 0.2 + i * 2)));
  }
  ctx.globalAlpha = 1;
}
function drawFlicker(ctx, g, t) {
  if (!g.LIT.lit || !g.glows.length) return;
  var spr = sprite('warm'); ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < g.glows.length; i++) {
    var q = g.glows[i], n = NZ.n2(t * 2.6 + i * 13.7, i * 3.1) * 0.7 + NZ.n2(t * 9 + i * 5, 7.7) * 0.3, a = clamp((n - 0.36) * 1.4) * q.a * (g.LIT === LIGHTS.night ? 0.55 : 0.4);
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
    stamp(ctx, spr, p.x, p.y, 1.2 + p.k * 0.05, 0, a * 0.9);
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
  var kind = g.fallers, p = { kind: kind, rot: rng() * TAU, spin: (rng() - 0.5) * 3, ph: rng() * TAU, life: 0 };
  var src = null;
  if (g.srcs.length && kind !== 'snow' && rng() < 0.6) { src = g.srcs[(rng() * g.srcs.length) | 0]; if (src.kind !== kind && !(kind === 'leaf')) src = null; }
  if (src) { p.x = src.x + (rng() - 0.5) * src.r * 1.6; p.y = src.y + (rng() - 0.5) * src.r * 0.6; }
  else { p.x = rng() * (g.W + 60) - 30; p.y = -10 - rng() * 30; }
  if (anywhere) p.y = rng() * g.H * 0.9;
  if (kind === 'snow') { p.sz = 0.35 + rng() * rng() * 1.3; p.vy = 6 + p.sz * 9; p.vx = 2 + rng() * 3; }
  else if (kind === 'leaf') { p.sz = 1.5 + rng() * 1.2; p.vy = 9 + rng() * 6; p.vx = 4 + rng() * 5; p.col = ramp([[150, 30, 20], [206, 62, 30], [232, 120, 44], [226, 170, 60]], rng()); }
  else { p.sz = 0.9 + rng() * 0.6; p.vy = 7 + rng() * 5; p.vx = 5 + rng() * 5; p.col = mixc([246, 196, 212], [255, 240, 244], rng()); }
  p.floor = g.H * (0.62 + rng() * 0.36);
  return p;
}
function stepFallers(arr, g, dt, rng) {
  for (var i = 0; i < arr.length; i++) {
    var p = arr[i]; p.life += dt;
    var sway = Math.sin(p.life * (p.kind === 'snow' ? 0.9 : 1.7) + p.ph);
    p.x += (p.vx * 0.5 + sway * (p.kind === 'snow' ? 4 : 9)) * dt; p.y += p.vy * dt * (p.kind === 'snow' ? 1 : (0.75 + 0.25 * Math.abs(sway))); p.rot += p.spin * dt;
    if (p.y > p.floor || p.x > g.W + 30) arr[i] = spawnFaller(g, rng, false);
  }
}
function drawFallers(ctx, arr, g) {
  var tint = g.tint, i;
  if (!arr.length) return;
  if (arr[0].kind === 'snow') {
    ctx.fillStyle = rgb(mulc([250, 252, 255], tint.map(function (v) { return Math.max(0.75, v); })));
    for (i = 0; i < arr.length; i++) { var p = arr[i], fa = clamp((p.floor - p.y) / 12); ctx.globalAlpha = 0.85 * fa; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, TAU); ctx.fill(); }
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
  var night = g.LIT === LIGHTS.night, col = g.LIT === LIGHTS.dusk ? 'rgba(40,24,30,0.8)' : night ? 'rgba(10,14,30,0.8)' : 'rgba(46,44,48,0.72)';
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
  [[-3.6, 11.45, 3.4], [4.4, 11.5, 3.8], [-8.0, 11.3, 4.2]].forEach(function (a) { add(a[0], a[2] * 0.8, a[1], 1.8, 1); });
  if (F.ycherry > 0.3) add(LAY.ycherry.x, 3.6 * F.ycherry * 0.82, LAY.ycherry.z, 1.6 * F.ycherry, 1.2);
  if (F.namiki) LAY.namiki.forEach(function (a) { add(a[0], a[2] * 0.85, a[1], 1.8, 1.2); });
  if (F.cherry) add(LAY.cherry.x, 3.4, LAY.cherry.z, 1.7, 2.5);
  var tot = 0; src.forEach(function (s) { tot += s.w; s.cw = tot; }); src.tot = tot;
  return src;
}
function makePetals(g, rng) {
  var N = 70 + Math.min(20, g.petalSrc.length * 3), pool = [];
  for (var i = 0; i < N + 30; i++) pool.push({ on: false });
  var S = { pool: pool, base: N, floats: [], gust: null, nextGust: 4 + rng() * 4, t: 0 };
  for (i = 0; i < N; i++) spawnPetal(S, pool[i], g, rng, true);
  for (i = 0; i < 400 && S.floats.length < 7 && g.water; i++) { var fx = rng() * g.W, fy = g.horizonY + rng() * (g.H - g.horizonY); if (waterAt(g, fx, fy)) S.floats.push({ x: fx, y: fy, rot: rng() * TAU, vx: (rng() - 0.3) * 0.8, ph: rng() * TAU, life: rng() * 8, L: 18 + rng() * 14, sz: 1 + rng() * 0.5, tone: rng() }); }
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
  else { var wind = S.wind || 6; if (rng() < 0.55) { p.x = rng() * (g.W + 40) - 20; p.y = -6 - rng() * 10; } else { p.x = wind > 0 ? -8 : g.W + 8; p.y = rng() * g.H * 0.6; } }
  p.floor = p.d > 0.55 ? g.H + 12 : Math.max(p.y + 20, g.horizonY + 8 + rng() * (g.H - g.horizonY - 8));
}
function waterAt(g, x, y) {
  var w = g.water; if (!w) return false;
  var i = Math.floor(x / g.W * w.w), j = Math.floor(y / g.H * w.h);
  return i >= 0 && j >= 0 && i < w.w && j < w.h && w.a[j * w.w + i] > 0;
}
function stepPetals(S, g, dt, t, rng) {
  // breeze plus the current gust
  var wind = 5 + 3 * Math.sin(t * 0.21) + 2 * Math.sin(t * 0.53 + 1), G = S.gust, gs = 0;
  if (!G && t > S.nextGust) {
    var dir = rng() < 0.75 ? 1 : -1;
    G = S.gust = { t0: t, dur: 4.2 + rng() * 1.5, dir: dir, y0: g.H * (0.3 + rng() * 0.4), cx0: dir > 0 ? -30 : g.W + 30 };
    var n = 0;
    for (var i = 0; i < S.pool.length && n < 34; i++) {
      var q = S.pool[i]; if (q.on && i < S.base) continue;
      spawnPetal(S, q, g, rng, false);
      q.d = 0.3 + rng() * 0.6; q.sz = 1.6 + q.d * 3.6; q.wk = 0.55 + q.d * 0.8; q.vy0 = 4.5 + q.d * 9; q.floor = g.H + 12;
      q.gust = { th: rng() * TAU, R: 3 + rng() * 15, om: (2.2 + rng() * 2.4) * dir, dy: (rng() - 0.5) * 14, lag: rng() * 0.22 };
      q.x = G.cx0 - dir * rng() * 30 + Math.cos(q.gust.th) * q.gust.R; q.y = G.y0 + q.gust.dy + Math.sin(q.gust.th) * q.gust.R * 0.45; q.life = 0.4;
      n++;
    }
  }
  if (G) {
    var u = (t - G.t0) / G.dur;
    if (u >= 1) { S.gust = null; S.nextGust = t + 8 + rng() * 9; }
    else gs = Math.pow(Math.sin(Math.PI * u), 2) * 26 * G.dir;
  }
  wind += gs; S.wind = wind;
  for (i = 0; i < S.pool.length; i++) {
    var p = S.pool[i]; if (!p.on) continue;
    p.life += dt; p.fl += p.fs * dt; p.rot += p.rs * dt;
    var cf = Math.cos(p.fl);
    if (p.gust && G) {
      var gu = clamp((t - G.t0) / G.dur - p.gust.lag), e = gu * gu * (3 - 2 * gu);
      p.gust.th += p.gust.om * dt; p.gust.R += dt * 2.5;
      var cx = lerp(G.cx0, G.cx0 + G.dir * (g.W + 60), e), cy = G.y0 + p.gust.dy - Math.sin(e * Math.PI) * 22;
      var tx = cx + Math.cos(p.gust.th) * p.gust.R, ty = cy + Math.sin(p.gust.th) * p.gust.R * 0.45;
      p.x += (tx - p.x) * Math.min(1, dt * 6); p.y += (ty - p.y) * Math.min(1, dt * 6);
      if (gu >= 1) p.gust = null;
    } else {
      if (p.gust) p.gust = null;
      p.x += (wind * p.wk + Math.sin(p.life * 1.3 + p.ph) * 6 * (0.5 + p.d * 0.5)) * dt;
      p.y += (p.vy0 * (0.5 + 0.5 * Math.abs(cf)) + Math.sin(p.life * 2.1 + p.ph) * 2.2) * dt;
    }
    if (p.y >= p.floor && !p.gust) {
      if (S.floats.length < 16 && waterAt(g, p.x, p.y) && p.d < 0.7) S.floats.push({ x: p.x, y: p.y, rot: p.rot, vx: (rng() - 0.3) * 0.8, ph: rng() * TAU, life: 0, L: 16 + rng() * 14, sz: Math.min(p.sz, 1.6), tone: p.tone });
      if (i < S.base) spawnPetal(S, p, g, rng, false); else p.on = false;
    } else if (!p.gust && (p.x > g.W + 40 || p.x < -45 || p.y > g.H + 14)) { if (i < S.base) spawnPetal(S, p, g, rng, false); else p.on = false; }
  }
  for (i = S.floats.length - 1; i >= 0; i--) {
    var f = S.floats[i]; f.life += dt; f.x += (f.vx + Math.sin(f.life * 0.4 + f.ph) * 0.3) * dt; f.rot += Math.sin(f.life * 0.3 + f.ph) * 0.1 * dt;
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

/* ---- 09_runtime.js ---- */
/* ================= public API & controller ================= */
var VERSION = '1.1.0';
var SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'], LIGHT_KEYS = ['morning', 'day', 'dusk', 'night'];
function withScene(o, fn) {
  var st = saveState();
  try { setupScene(o); return fn(); } finally { restoreState(st); }
}
/* normalized 0..1 focus of a stage for a frame of logical size w x h */
function focusFor(i, w, h) {
  return withScene({ W: w, H: h, KS: 1, stage: i, season: 'autumn', light: 'day' }, function () {
    var d = STAGE_DEFS[i][3], x, y;
    if (i === 0) { var g = P(0.6, 0, 4.2); x = g.x; y = g.y; }
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
  var o = { stage: 0, season: seasonFor(), light: lightFor(), quality: 'card', animate: true };
  function merge(n) { if (!n) return; ['stage', 'season', 'light', 'quality', 'animate', 'onReady'].forEach(function (k) { if (n[k] !== undefined) o[k] = n[k]; }); norm(); }
  function norm() {
    o.stage = Math.max(0, Math.min(STAGES.length - 1, Math.round(+o.stage || 0)));
    if (SEASON_KEYS.indexOf(o.season) < 0) o.season = seasonFor();
    if (LIGHT_KEYS.indexOf(o.light) < 0) o.light = lightFor();
    if (o.quality !== 'full') o.quality = 'card';
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
    var Wl = REF_W, Hl = Math.round(clamp(REF_W * size.cssH / size.cssW, 200, 600)), bw;
    if (q === 'full') bw = Math.round(clamp(Math.max(size.cssW * size.dpr, 2000), 1200, 2400));
    else if (q === 'preview') bw = Math.round(clamp(size.cssW * Math.min(size.dpr, 2), 320, 1100));
    else bw = Math.round(clamp(size.cssW * Math.min(size.dpr, 2), 240, 1200));
    var bh = Math.round(bw * Hl / Wl), ks = bw / Wl;
    var dq = q === 'full' ? clamp(ks / 2.7, 1, 1.9) : clamp(ks / 2, 0.6, 1.25);
    var qn = q === 'full' ? 'full' : 'card';
    return { key: [VERSION, so.stage, so.season, so.light, qn, bw + 'x' + bh].join('|'), stage: so.stage, season: so.season, light: so.light, W: Wl, H: Hl, KS: ks, DQ: dq, bw: bw, bh: bh, q: qn };
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
      return Promise.all([blobToCanvas(rec.img), blobToCanvas(rec.mask), blobToCanvas(rec.occ)]).then(function (a) {
        if (!a[0] || a[0].width !== spec.bw) return null;
        return { img: a[0], mask: a[1], occ: a[2], glows: rec.glows || [], src: 'cache' };
      }).catch(function () { return null; });
    }).then(function (got) {
      if (got) return got;
      if (J.cancelled) throw CANCEL;
      return enqueue(function () {
        if (J.cancelled || dead) throw CANCEL;
        return renderStatic({ stage: spec.stage, season: spec.season, light: spec.light, W: spec.W, H: spec.H, KS: spec.KS, DQ: spec.DQ, bw: spec.bw, bh: spec.bh, get cancelled() { return J.cancelled || dead; } }).then(function (r) {
          var res = { img: r.canvas, mask: r.mask, occ: r.occ, glows: r.glows.map(function (g) { return { x: g.x, y: g.y, r: g.r, a: g.a }; }), src: 'paint' };
          // store in the background
          setTimeout(function () {
            Promise.all([toBlob(r.canvas, 'image/jpeg', 0.92), r.mask ? toBlob(r.mask, 'image/png') : null, r.occ ? toBlob(r.occ, 'image/png') : null]).then(function (b) {
              if (b[0]) return cachePut(spec.key, { img: b[0], mask: b[1], occ: b[2], glows: res.glows, t: Date.now(), v: VERSION });
            }).catch(function () { });
          }, 60);
          return res;
        });
      });
    }).then(function (res) {
      res.spec = spec; res.ms = now() - t0;
      stats.history.push({ key: spec.key, src: res.src, ms: Math.round(res.ms) });
      if (jobs[spec.key] === J) delete jobs[spec.key];
      return res;
    }, function (e) { if (jobs[spec.key] === J) delete jobs[spec.key]; throw e; });
    return p;
  }
  function makeGeo(res) {
    var sp = res.spec;
    return withScene({ W: sp.W, H: sp.H, KS: sp.KS, stage: sp.stage, season: sp.season, light: sp.light }, function () { var g = animGeo(sp); g.glows = res.glows || []; g.water = waterGrid(res.mask, g); return g; });
  }
  function waterGrid(mask, g) {
    if (!mask || g.season !== 'spring') return null;
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
    cur = { spec: res.spec, img: res.img, mask: res.mask, occ: res.occ, glows: res.glows, geo: makeGeo(res) };
    setupFx();
    stats.source = res.src; stats.ms = Math.round(res.ms);
    if (first || fade) {
      void tv.offsetWidth;
      tv.style.transition = 'opacity ' + (first ? 0.6 : 0.45) + 's ease'; tv.style.opacity = '0';
    }
    drawFrame(true);
    loopCheck();
    if (first && !readyFired) { readyFired = true; if (typeof o.onReady === 'function') setTimeout(function () { if (!dead) try { o.onReady(api); } catch (e) { if (window.console) console.error(e); } }, 0); }
  }
  function ovW() { return Math.round(Math.min(cur ? cur.spec.bw : 800, size.cssW * Math.min(size.dpr, 2))); }
  function ovH() { return Math.round(ovW() * (cur ? cur.spec.H / cur.spec.W : 0.75)); }
  var wl = null, ol = null, fallers = [], petals = null, frng = mulberry32(99), bird = null, clock = 0, lastTs = 0, raf = 0;
  function setupFx() {
    sizeCanvas(fv, ovW(), ovH());
    var g = cur.geo;
    if (cur.mask) { wl = wl || mkCanvas(2, 2); sizeCanvas(wl, cur.mask.width, cur.mask.height); } else wl = null;
    if (cur.occ || g.anchors.length) { ol = ol || mkCanvas(2, 2); sizeCanvas(ol, cur.occ ? cur.occ.width : Math.round(cur.spec.bw / 2), cur.occ ? cur.occ.height : Math.round(cur.spec.bh / 2)); } else ol = null;
    fallers = g.fallers ? initFallers(g, frng) : [];
    petals = g.season === 'spring' ? makePetals(g, frng) : null;
    if (!bird || bird.season !== cur.spec.season) bird = { next: clock + 5 + frng() * 8, season: cur.spec.season };
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
      var motion = !still;
      // water: koi, glints and rings, cut to visible water
      if (wl && motion) {
        var wx = wl.getContext('2d'), ws = wl.width / g.W;
        wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'source-over'; wx.clearRect(0, 0, wl.width, wl.height);
        wx.setTransform(ws, 0, 0, ws, 0, 0); drawWaterLayer(wx, g, t); if (petals) drawFloatPetals(wx, petals, g, ws);
        wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'destination-in'; wx.drawImage(cur.mask, 0, 0); wx.globalCompositeOperation = 'source-over';
        ctx.drawImage(wl, 0, 0, fv.width, fv.height);
      }
      // anchors: waterfall, tsukubai, shishi-odoshi, cut by what stands in front of them
      if (ol && g.anchors.length) {
        var ox = ol.getContext('2d'), os = ol.width / g.W;
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'source-over'; ox.clearRect(0, 0, ol.width, ol.height);
        ox.setTransform(os, 0, 0, os, 0, 0); drawAnchorLayer(ox, g, t, still);
        if (cur.occ) { ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'destination-out'; ox.drawImage(cur.occ, 0, 0, ol.width, ol.height); ox.globalCompositeOperation = 'source-over'; }
        ctx.drawImage(ol, 0, 0, fv.width, fv.height);
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      if (motion) {
        drawMist(ctx, g, t);
        drawFlicker(ctx, g, t);
        drawFlies(ctx, g, t);
        drawFallers(ctx, fallers, g);
        if (petals) drawPetals(ctx, petals, g, sc);
        if (g.birds && bird && bird.cur) drawBird(ctx, g, bird.cur, t);
      }
      if (reveal) drawReveal(ctx, g);
    } catch (e) { if (window.console) console.error(e); }
    finally { restoreState(st); }
  }
  function tickFx(dt) {
    if (!cur) return;
    var g = cur.geo;
    if (fallers.length) stepFallers(fallers, g, dt, frng);
    if (petals) stepPetals(petals, g, dt, clock, frng);
    if (g.birds && bird) {
      if (bird.cur && clock > bird.cur.t0 + bird.cur.dur) bird.cur = null;
      if (!bird.cur && clock > bird.next) {
        var ltr = frng() < 0.5, y = g.horizonY * (0.15 + frng() * 0.45);
        bird.cur = { t0: clock, dur: 8 + frng() * 5, x0: ltr ? -12 : g.W + 12, x1: ltr ? g.W + 12 : -12, y: y, rise: (frng() - 0.3) * 20, flap: 9 + frng() * 4, s: 0.8 + frng() * 0.5 };
        bird.next = clock + 22 + frng() * 30;
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
    var before = { stage: o.stage, season: o.season, light: o.light, quality: o.quality };
    merge(n);
    clearTimeout(pendingTimer); pendingTimer = null;
    var same = before.season === o.season && before.light === o.light && before.quality === o.quality;
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
    var spec = size ? specFor(o.quality === 'full' ? 'preview' : 'card', { stage: from, season: o.season, light: o.light }) : null;
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
      return enqueue(function () { return renderStatic({ stage: spec.stage, season: spec.season, light: spec.light, W: spec.W, H: spec.H, KS: spec.KS, DQ: spec.DQ, bw: spec.bw, bh: spec.bh, mask: false, cancelled: false }).then(function (r) { return r.canvas; }); });
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
      if (wl) wl.width = wl.height = 0; if (ol) ol.width = ol.height = 0;
      cur = null; reveal = null; fallers = []; petals = null;
    },
    get _dbg() { return { fv: fv, cv: cv, tv: tv, cur: cur, wl: wl, ol: ol, petals: petals, clock: clock, frame: function () { clock += 1 / 30; tickFx(1 / 30); drawFrame(false); } }; },
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
  stageFor: stageFor,
  seasonFor: seasonFor,
  lightFor: lightFor,
  mount: mount
};
try { Object.defineProperty(API, '_dbg', { value: { renderStatic: renderStatic, LAY: LAY, BRIDGE: BRIDGE, makeCam: makeCam, focusFor: focusFor, idbOpen: idbOpen }, enumerable: false }); } catch (e) { /* ignore */ }
window.MogiGarden = API;

})();
