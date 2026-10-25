/*! MogiTown — 学びの町: a painterly Edo-period town that grows with study time.
 * Self-contained, framework-free (ES2017). Canvas-2D procedural painter + light rAF overlays.
 * API: window.MogiTown = { VERSION, STAGES, EVENTS, RARE, stageFor, seasonFor, lightFor, windAt, weatherAt, fireworksAt, mount }
 * mount(el, {stage, season, light, event, weather, fireworks, date, quality, animate, onReady, onCue}) -> {update, playStageUp, tap, pause, resume, destroy, _summon}
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

function makeCam(w, h) {
  var th = 24 * Math.PI / 180, dist = 200, tz = 64;
  return { s: Math.sin(th), c: Math.cos(th), x: 0, y: dist * Math.sin(th), z: tz - dist * Math.cos(th), F: 1030, cx: w / 2, cy: 158 + (h - REF_H) / 2 };
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
/* [minutes, name, desc, focus [x, y, z] in world metres, or the name of a place resolved by stageFocus()] */
var STAGE_DEFS = [
  [0, '一本道', '草原を一本の道が川へと続いています', [-9, 1, 15]],
  [15, '道標', '分かれ道に石の道標が立ちました', [-11.4, 0.8, 12.6]],
  [30, '茶屋', '街道沿いに茶屋が店を開きました', [-12.6, 2, 23]],
  [60, '井戸', '茶屋の脇に井戸が掘られました', [-17.6, 1, 19.5]],
  [120, '農家', '茅葺きの農家が建ちました', [-31, 3.5, 29]],
  [180, '田んぼ', '道の両側に田んぼが開かれました', [22, 0, 14]],
  [300, '水車小屋', '川辺に水車小屋ができ、水車が回りはじめました', [-21.2, 2.2, 43.3]],
  [420, '祠と鳥居', '森の祠に鳥居が奉納されました', [-36.5, 2.5, 39]],
  [600, '石橋', '川に石の太鼓橋が架かりました', [2, 2.5, 41]],
  [900, '商家', '橋のたもとに大きな商家が建ちました', 'shoka'],
  [1200, '長屋', '裏通りに長屋が軒を連ねました', 'nagaya'],
  [1500, '旅籠', '旅人を迎える旅籠ができました', 'inn'],
  [2100, '火の見櫓', '町を見守る火の見櫓が立ちました', 'tower'],
  [3000, '土蔵', '川沿いになまこ壁の土蔵が並びました', 'kura'],
  [4500, '寺と鐘楼', '山すそに寺が建ち、鐘の音が響きます', [-17.5, 5, 91]],
  [6000, '町家の通り', '格子の町家が通りを埋めました', 'street'],
  [7500, '市場', '橋のたもとに市が立ち、にぎわっています', 'market'],
  [9000, '船着き場', '船着き場に舟が出入りします', [21.4, 0.5, 36.5]],
  [12000, '芝居小屋', '幟がはためく芝居小屋ができました', 'theatre'],
  [15000, '五重塔', '寺に五重塔がそびえ立ちました', [-40, 12, 73]],
  [18000, '武家屋敷', '白壁の武家屋敷が並びました', 'buke'],
  [21000, '石垣', '城山に高い石垣が築かれました', [33, 6, 87]],
  [24000, '天守', '石垣の上に天守がそびえました', [33, 14, 87]],
  [30000, '城下町の完成', '提灯が灯り、城下町の祭りが始まりました', 'centre']
];
var NST = STAGE_DEFS.length;

/* ================= layout (world metres; x right, z away from the eye) =================
   The river comes down from the left and runs diagonally to the front right. The country road comes up from the
   bottom, crosses it on the bridge and becomes the main street, which climbs north-east to the castle. */
var WL = -0.9;          // water level of the river (banks at 0)
var RIVER_PTS = [[-96, 74], [-70, 68], [-48, 62], [-28, 55], [-12, 48.5], [2, 41], [16, 33], [30, 24], [46, 13], [62, 2], [86, -14]];
var RIVER_HW = 6.2;
var BR = { x: 2, z: 41, ax: [0.5, 0.866], len: 19, w: 4.6 };
BR.ax = norm2(BR.ax);
var BR_NEAR = [BR.x - BR.ax[0] * 9.5, BR.z - BR.ax[1] * 9.5], BR_FAR = [BR.x + BR.ax[0] * 9.5, BR.z + BR.ax[1] * 9.5];
var ROAD = [[-17, -4], [-13, 6], [-8.8, 15.5], [-5.4, 24], [-3.6, 29], BR_NEAR];
/* the main street runs straight on from the bridge, NNE up to the castle; the riverside street meets it at right angles.
   Street frame: t along the main street from the bridge foot, w across it toward the west (the side whose fronts face the viewer). */
var STREET0 = BR_FAR, STREET_DIR = BR.ax, STREET_W = [-BR.ax[1], BR.ax[0]];
function stPt(t, w) { return [STREET0[0] + STREET_DIR[0] * t + STREET_W[0] * (w || 0), STREET0[1] + STREET_DIR[1] * t + STREET_W[1] * (w || 0)]; }
var STREET_LEN = 40, STREET_HW = 4.6;                                       // the street's half width between the shopfronts
var TRACK = [STREET0, stPt(12), stPt(24), stPt(36), stPt(40.5)];            // the track that becomes the main street, up to the castle
var RV_DIR = STREET_W, RV_N = STREET_DIR;                                   // upstream along the riverside street, and away from the water
function rvPt(s, off) { return stPt(off || 0, s); }
var RIVST = [stPt(0.2, 0), stPt(0.3, 14), stPt(-0.1, 28), stPt(0.3, 42), stPt(0.4, 47)];   // the street along the far bank, to the theatre
var KR_DIR = [-STREET_W[0], -STREET_W[1]], KR_N = STREET_DIR;               // downstream along the far bank, and away from the water
function krPt(s, off) { return [BR.x + KR_DIR[0] * s + KR_N[0] * off, BR.z + KR_DIR[1] * s + KR_N[1] * off]; }
var FORK = [-9.6, 13];
var SIDE_PATH = [FORK, [-15, 16.5], [-19.5, 20.5], [-20.8, 23.6]];   // to the farm
var SHRINE_PATH = [[-4.6, 25.4], [-1.0, 24.6], [2.6, 23.8], [3.2, 27.6]];   // off the road, through the torii
var HILLS = [
  { x: 46, z: 100, rx: 24, rz: 7, h: 5.5 },
  { x: 6, z: 103, rx: 30, rz: 7.5, h: 6.5 },
  { x: -36, z: 104, rx: 26, rz: 7, h: 5.5 },
  { x: 78, z: 96, rx: 22, rz: 10, h: 8 },
  { x: -74, z: 92, rx: 24, rz: 11, h: 8.5 },
  { x: 33, z: 88.5, rx: 13, rz: 7.5, h: 3 }
];
var CASTLE = { x: 33, z: 87, top: 3.6 };
var PADDY_L = { x0: -52, x1: -20.5, z0: -4, z1: 22, rot: -0.04, cw: 7.8, cd: 5.6 };
var PADDY_R = { x0: 14, x1: 60, z0: -3, z1: 17.6, rot: 0.06, cw: 8.6, cd: 5.6 };
var TREE0 = { x: -23.5, z: 8.6 };
var SIGN = { x: -11.4, z: 12.6 };
var TEA = { x: -12.6, z: 23, u: norm2([0.9, 0.42]) };
var WELL = { x: -17.6, z: 19.5 };
var FARM = { x: -28.6, z: 30 };
var HAZA = [[-28.5, 17.4], [-23.5, 12.6]];
var KAKI = { x: -19.6, z: 31.5 };
var MILL = { x: -16.5, z: 39.2, u: norm2([0.866, -0.5]), wx: -21.2, wz: 43.3, wr: 2.2 };
var SHRINE = { x: 3.8, z: 29.6 }, TORII = { x: 2.6, z: 25.6 };   // a roadside shrine before the bridge
var TEMPLE = { x: -17.5, z: 91 }, BELL = { x: -30, z: 92 }, PAGODA = { x: -36.8, z: 72.4 };
var MARKET = (function () { var p = stPt(0.6, -10.2); return { x: p[0], z: p[1], rx: 6.2, rz: 4.0 }; })();
var TOWER = (function () { var p = stPt(22, 16.8); return { x: p[0], z: p[1] }; })();
/* wild groves on the far bank: there until the town needs their ground [x, z, stage that clears it, trees] */
var GROVES = (function () {
  function g(t, w, s, n) { var p = stPt(t, w); return [p[0], p[1], s, n]; }
  return [g(19, 9.5, 15, 2), g(31.5, 10, 11, 1), g(16, -9.5, 15, 2), g(8.5, 27, 15, 2), g(9.5, 45.5, 18, 1), g(30, 23, 20, 2), g(36, -12, 20, 1), g(25, -10, 15, 1), [-2, 101, 99, 1], [25, 101, 99, 1]];
})();
var FIELD = { x0: 7.2, x1: 13.6, z0: 19, z1: 27.6 };
var BUKE = (function () { var a = stPt(30, 23.5), b = stPt(36, -12.2); return [{ x: a[0], z: a[1], w: 13, d: 11, seed: 401 }, { x: b[0], z: b[1], w: 12, d: 10, seed: 402 }]; })();
function norm2(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

/* ================= seasons ================= */
var SEASONS = {
  spring: {
    moss: [[30, 50, 20], [52, 82, 30], [82, 116, 40], [124, 150, 58], [170, 184, 92]],
    grass: [[84, 116, 44], [146, 170, 74]], grassAmt: 0.9, soil: [[118, 98, 72], [156, 134, 100]], flowers: [[236, 214, 92], [244, 240, 226], [226, 170, 196]],
    broad: [[22, 44, 18], [40, 72, 24], [66, 104, 34], [104, 140, 50], [150, 176, 80], [196, 210, 128], [226, 232, 170]],
    maple: [[24, 40, 14], [44, 70, 20], [72, 106, 28], [108, 140, 40], [146, 172, 60], [184, 198, 92], [214, 220, 130], [236, 238, 176]],
    mapleAlt: [[44, 14, 12], [86, 26, 18], [132, 46, 26], [170, 74, 38], [198, 108, 58], [222, 146, 92], [238, 182, 132], [246, 210, 170]], altAmt: 0.35,
    shrub: [[14, 30, 18], [26, 50, 26], [44, 76, 34], [72, 108, 46], [110, 142, 62], [160, 178, 92]],
    forest: [[52, 84, 36], [86, 118, 50], [128, 150, 70], [236, 212, 222], [26, 46, 30], [38, 62, 38]],
    willow: [[60, 92, 30], [96, 134, 46], [140, 172, 70], [186, 206, 110], [214, 228, 150]],
    paddy: 'flood', cherry: 'bloom', snow: 0, fx: 'petal', river: [78, 104, 96], sky: [206, 214, 222], kaki: 'leaf'
  },
  summer: {
    moss: [[18, 40, 16], [36, 68, 24], [60, 98, 34], [96, 130, 48], [140, 160, 70]],
    grass: [[52, 86, 30], [104, 134, 52]], grassAmt: 1, soil: [[110, 92, 68], [148, 126, 96]], flowers: [[236, 240, 246], [150, 150, 220], [240, 220, 120]],
    broad: [[8, 22, 12], [16, 38, 18], [28, 60, 26], [46, 86, 34], [72, 114, 44], [108, 144, 62], [148, 172, 92]],
    maple: [[10, 24, 12], [18, 40, 16], [30, 60, 22], [46, 84, 28], [70, 112, 36], [104, 140, 50], [144, 168, 74], [184, 196, 112]],
    mapleAlt: null, altAmt: 0,
    shrub: [[8, 22, 14], [16, 38, 20], [30, 60, 28], [52, 88, 38], [86, 120, 52], [130, 156, 76]],
    forest: [[30, 58, 26], [46, 80, 34], [70, 104, 46], [96, 128, 60], [22, 40, 26], [32, 54, 32]],
    willow: [[30, 60, 22], [54, 92, 32], [86, 126, 48], [130, 162, 76], [170, 192, 110]],
    paddy: 'green', cherry: 'leaf', snow: 0, fx: 'summer', river: [64, 92, 86], sky: [196, 210, 224], kaki: 'leaf'
  },
  autumn: {
    moss: [[26, 42, 20], [42, 66, 28], [64, 90, 36], [92, 114, 48], [130, 140, 66]],
    grass: [[100, 108, 56], [162, 154, 92]], grassAmt: 0.85, soil: [[122, 98, 72], [160, 134, 100]], flowers: [[236, 226, 200], [214, 120, 60], [196, 176, 120]],
    broad: [[70, 40, 12], [118, 72, 18], [168, 108, 28], [206, 146, 40], [230, 182, 70], [244, 210, 120], [250, 230, 170]],
    maple: [[40, 6, 10], [74, 10, 14], [116, 18, 18], [158, 30, 22], [192, 50, 26], [216, 82, 34], [234, 120, 50], [246, 160, 84]],
    mapleAlt: [[56, 22, 8], [100, 40, 12], [150, 70, 18], [194, 104, 26], [222, 138, 38], [238, 168, 58], [246, 194, 96], [250, 212, 136]], altAmt: 0.6,
    shrub: [[12, 24, 18], [22, 40, 26], [36, 60, 36], [56, 82, 46], [84, 108, 58], [124, 138, 74]],
    forest: [[176, 66, 34], [210, 118, 44], [196, 158, 60], [150, 58, 40], [30, 50, 32], [44, 66, 40]],
    willow: [[86, 96, 34], [128, 136, 52], [170, 170, 76], [204, 196, 110], [226, 216, 150]],
    paddy: 'gold', cherry: 'autumn', snow: 0, fx: 'leaf', river: [74, 92, 88], sky: [212, 210, 204], kaki: 'fruit'
  },
  winter: {
    moss: [[24, 38, 22], [38, 58, 30], [56, 78, 40], [80, 98, 54], [112, 124, 76]],
    grass: [[122, 112, 84], [162, 148, 112]], grassAmt: 0.45, soil: [[104, 90, 74], [140, 124, 102]], flowers: null,
    broad: null, maple: null, mapleAlt: null, altAmt: 0,
    shrub: [[10, 22, 18], [18, 36, 26], [30, 52, 34], [46, 72, 44], [70, 94, 58], [104, 120, 82]],
    forest: [[118, 106, 98], [140, 128, 118], [160, 150, 140], [196, 200, 208], [34, 50, 42], [46, 62, 52]],
    willow: null,
    paddy: 'stubble', cherry: 'bare', snow: 1, fx: 'snow', river: [64, 80, 88], sky: [214, 220, 228], kaki: 'bare'
  }
};

Object.keys(SEASONS).forEach(function (k) { SEASONS[k].name = k; });
/* a season with a light fall of snow (new year in a mild season) */
function lightSnow(se) { var o = {}; for (var k in se) o[k] = se[k]; o.snow = Math.max(se.snow, 0.3); o.fx = se.snow ? se.fx : 'snow'; return o; }

/* ================= lights ================= */
var LIGHTS = {
  morning: {
    sun: norm([-0.74, 0.46, -0.3]), sunc: [0.98, 0.92, 0.84], amb: [0.6, 0.66, 0.78], ls: [-0.74, -0.62],
    skyTop: [176, 196, 218], skyHor: [232, 230, 224], haze: [214, 220, 226], sunX: 0.08, sunY: -0.04, sunGlow: 'rgba(255,244,222,0.85)',
    shadow: [70, 86, 124], shadowA: 0.42, hazeK: 1.35, lit: false, wash: ['rgba(230,240,255,0.30)', 'rgba(220,232,250,0.08)'],
    grade: [[236, 242, 252], [226, 232, 240], [200, 204, 214]], bloom: 0.24, vig: [200, 202, 206], mist: 0.6, win: 0
  },
  day: {
    sun: norm([0.80, 0.56, -0.22]), sunc: [1.0, 0.86, 0.66], amb: [0.52, 0.57, 0.70], ls: [0.76, -0.65],
    skyTop: [200, 210, 220], skyHor: [238, 228, 208], haze: [222, 216, 204], sunX: 0.94, sunY: -0.04, sunGlow: 'rgba(255,240,205,0.8)',
    shadow: [64, 74, 112], shadowA: 0.5, hazeK: 1, lit: false, wash: ['rgba(255,214,150,0.38)', 'rgba(255,200,140,0.10)'],
    grade: null, bloom: 0.22, vig: [196, 182, 170], mist: 0.22, win: 0
  },
  dusk: {
    sun: norm([0.86, 0.26, 0.3]), sunc: [1.0, 0.62, 0.36], amb: [0.46, 0.43, 0.56], ls: [0.9, -0.4],
    skyTop: [96, 92, 140], skyHor: [252, 168, 98], haze: [204, 146, 150], sunX: 0.86, sunY: 0.24, sunGlow: 'rgba(255,170,90,0.9)',
    shadow: [64, 50, 100], shadowA: 0.44, hazeK: 1.0, lit: true, wash: ['rgba(255,150,70,0.40)', 'rgba(255,120,70,0.10)'],
    grade: [[255, 226, 198], [186, 168, 206], [222, 186, 160]], gradeMid: 0.42, bloom: 0.34, vig: [130, 104, 130], mist: 0.3, win: 0.6
  },
  night: {
    sun: norm([-0.46, 0.62, 0.5]), sunc: [0.46, 0.56, 0.82], amb: [0.2, 0.26, 0.44], ls: [-0.6, -0.8],
    skyTop: [10, 18, 44], skyHor: [44, 62, 104], haze: [40, 54, 92], sunX: 0.17, sunY: 0.1, sunGlow: 'rgba(170,190,255,0.35)',
    shadow: [20, 26, 60], shadowA: 0.4, hazeK: 0.9, lit: true, wash: ['rgba(120,150,230,0.18)', 'rgba(80,100,180,0.06)'],
    grade: [[150, 168, 220], [126, 142, 198], [92, 104, 158]], bloom: 0.3, vig: [60, 66, 110], mist: 0.2, moon: true, win: 1
  }
};

Object.keys(LIGHTS).forEach(function (k) { LIGHTS[k].name = k; });
/* stage -> feature switches */
function features(st) {
  var f = { s: st, stage: st };
  f.tree0 = Math.min(1, 0.72 + st * 0.02);
  f.sign = st >= 1; f.teahouse = st >= 2; f.well = st >= 3; f.farm = st >= 4; f.paddy = st >= 5; f.mill = st >= 6; f.shrine = st >= 7;
  f.stoneBridge = st >= 8; f.shoka = st >= 9; f.nagaya = st >= 10; f.inn = st >= 11; f.tower = st >= 12; f.kura = st >= 13;
  f.temple = st >= 14; f.machiya = st >= 15; f.market = st >= 16; f.landing = st >= 17; f.theatre = st >= 18; f.pagoda = st >= 19;
  f.buke = st >= 20; f.ishigaki = st >= 21; f.keep = st >= 22; f.festival = st >= 23;
  f.street = st >= 9;          // the track has become a street
  f.rivst = st >= 10;          // the street along the far bank
  f.town = clamp((st - 8) / 10);  // how much of the ground is worn into a town
  f.riverCherry = st >= 8 ? Math.min(1, 0.5 + (st - 8) * 0.05) : 0;
  return f;
}
/* where a stage's new thing stands (for the reveal's focus) */
function stageFocus(f) {
  if (typeof f !== 'string') return f;
  function s(t, w, y) { var p = stPt(t, w); return [p[0], y, p[1]]; }
  if (f === 'shoka') return s(9, STREET_HW + 5.9, 4);
  if (f === 'nagaya') return s(16.6, 24.4, 2);
  if (f === 'inn') return s(32.2, STREET_HW + 5.25, 4);
  if (f === 'tower') return [TOWER.x, 8, TOWER.z];
  if (f === 'kura') { var k = krPt(24, RIVER_HW + 6); return [k[0], 3, k[1]]; }
  if (f === 'street') return s(20, 0, 2.5);
  if (f === 'market') return [MARKET.x, 1.5, MARKET.z];
  if (f === 'theatre') return s(9.4, 45.6, 4);
  if (f === 'buke') return [BUKE[0].x, 2.5, BUKE[0].z];
  return s(12, 0, 4);
}

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
  if (F && F.wx === 'blizzard' && SEA.snow && !sil()) plasterSegs(ctx, pr, wmul);
}
/* blizzard: snow plastered up the windward side of trunks and upright limbs, in broken streaks */
function plasterSegs(ctx, pr, wmul) {
  var sg = WIND_LEAN >= 0 ? 1 : -1, rng = mulberry32(pr.length * 13 + 7);
  ctx.strokeStyle = rgb(mixc(mulc(SNOW, lightTint(1)), [255, 255, 255], 0.1), 0.92); ctx.lineCap = 'round';
  for (var j = 0; j < pr.length; j++) {
    var A = pr[j].a, B = pr[j].b, S = pr[j].s, w0 = Math.max(0.3, S.r0 * A.k * (wmul || 1)), w1 = Math.max(0.22, S.r1 * B.k * (wmul || 1)), d = sub(S.b, S.a), vert = Math.abs(d[1]) / (Math.hypot(d[0], d[1], d[2]) || 1);
    if (vert < 0.4 || w0 < 0.45) continue;
    ctx.lineWidth = w0 * 0.5; ctx.beginPath();
    for (var q = 0; q < 3; q++) { var f0 = q / 3 + rng() * 0.08, f1 = (q + 1) / 3 - rng() * 0.12; if (rng() < 0.2) continue; ctx.moveTo(lerp(A.x - sg * w0 * 0.68, B.x - sg * w1 * 0.68, f0), lerp(A.y, B.y, f0)); ctx.lineTo(lerp(A.x - sg * w0 * 0.68, B.x - sg * w1 * 0.68, f1), lerp(A.y, B.y, f1)); }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
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
  var batch = opt.batch, BP = null;
  if (batch) { BP = []; for (var g0 = 0; g0 < 3; g0++) { var row = []; for (var b0 = 0; b0 < NB; b0++) row.push(new Path2D()); BP.push(row); } }
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
    var paths, b;
    if (batch) paths = BP[tone > 0.33 ? 2 : tone < -0.33 ? 0 : 1]; else { paths = []; for (b = 0; b < NB; b++) paths.push(new Path2D()); }
    var cnt = Math.min((opt.cap || 150) * DQ * dens, Math.max(5, rs * rs * 0.6 * DQ * dens * (opt.dab ? 0.0049 / (opt.dab * opt.dab) : 1))) * (opt.thin === undefined ? 1 : opt.thin);
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
    if (!batch) fillSprayPaths(ctx, paths, NB, pal, alt, tone, haze, tint);
    if (acc && !batch) for (b = 0; b < 2; b++) { var ac = ramp(opt.accent.pal, b ? 0.8 : 0.3); if (haze) ac = mixc(ac, LIT.haze, haze); ctx.fillStyle = rgb(tc(ac, tint)); ctx.fill(acc[b]); }
  }
  if (batch) {
    for (var g1 = 0; g1 < 3; g1++) fillSprayPaths(ctx, BP[g1], NB, pal, alt, (g1 - 1) * 0.66 * (alt ? 1 : 0), haze, tint);
    if (acc) for (b = 0; b < 2; b++) { var ac2 = ramp(opt.accent.pal, b ? 0.8 : 0.3); if (haze) ac2 = mixc(ac2, LIT.haze, haze); ctx.fillStyle = rgb(tc(ac2, tint)); ctx.fill(acc[b]); }
  }
}
function fillSprayPaths(ctx, paths, NB, pal, alt, tone, haze, tint) {
  for (var b = 0; b < NB; b++) {
    var f = b / (NB - 1), col = ramp(pal, f * 0.92 + 0.04);
    if (alt && tone > 0) col = mixc(col, ramp(alt, f * 0.92 + 0.04), tone); else if (alt && tone < 0 && SEA.name === 'autumn') col = mixc(col, scl(ramp(pal, f * 0.8), 0.92), -tone * 0.4);
    if (haze) col = mixc(col, LIT.haze, haze);
    ctx.fillStyle = rgb(tc(col, tint)); ctx.fill(paths[b]);
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
function sakuraMode() { return SEA.name === 'spring' ? 'bloom' : SEA.name === 'summer' ? 'leaf' : SEA.name === 'autumn' ? 'autumn' : 'bare'; }
function drawSakura(ctx, t, o) {
  o = o || {};
  var mode = sakuraMode(), cd = Pa(t.center).d;
  if (mode === 'bare') { drawBareTree(ctx, t, SAKURA.bark); return; }
  var far = !!o.far, dab = far ? 0.125 : o.dab || null, cap = far ? 50 : o.cap || 110;
  if (mode === 'bloom' && SEA.sak) { drawSakuraSpring(ctx, t, o, SEA.sak, dab, cap, cd); return; }
  var opt = mode === 'bloom' ? { pal: SAKURA.bloom, alt: SAKURA.bloomAlt, altK: o.pink ? 0.85 : 0.45, kind: 'blossom', density: (o.density || 1) * 0.85, haze: o.haze, dab: dab, cap: cap, batch: o.batch }
    : mode === 'leaf' ? { pal: SAKURA.leaf, kind: 'leaf', density: (o.density || 1) * 0.8, haze: o.haze, dab: dab || 0.08, cap: cap, batch: o.batch }
      : { pal: SAKURA.autumn, alt: SAKURA.autumnAlt, altK: 0.6, kind: 'leaf', density: (o.density || 1) * 0.6, haze: o.haze, dab: dab || 0.08, cap: cap, batch: o.batch };
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
  var snowP = SEA.snow ? new Path2D() : null, candle = SEA.name === 'spring' ? new Path2D() : null;
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
  return [st.s[0] + st.out[0] * h + WIND_LEAN * v * 0.28, st.s[1] - v, st.s[2] + st.out[2] * h];
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

/* a cherry on a given day of spring: buds on bare twigs, blossom clouds, then young leaves taking over */
var SAK_YOUNG = [[30, 52, 22], [52, 84, 30], [82, 118, 40], [116, 150, 56], [150, 178, 76], [182, 202, 104], [206, 220, 136], [226, 234, 170]];
function drawSakuraSpring(ctx, t, o, st, dab, cap, cd) {
  var b = st.bloom, l = st.leaf, dens = o.density || 1;
  var bo = b > 0.03 ? { pal: SAKURA.bloom, alt: SAKURA.bloomAlt, altK: o.pink ? 0.85 : b < 0.6 && l < 0.1 ? 0.75 : 0.45, kind: 'blossom', density: dens * 0.85, thin: Math.min(1, b * 1.15), haze: o.haze, dab: dab, cap: cap, batch: o.batch } : null;
  var lo = l > 0.03 ? { pal: SAK_YOUNG.map(function (c, i) { return mixc(c, SAKURA.leaf[i], clamp((l - 0.5) * 2)); }), kind: 'leaf', density: dens * 0.8, thin: Math.min(1, l * 1.1), haze: o.haze, dab: dab ? dab * 0.8 : 0.08, cap: cap, batch: o.batch } : null;
  if (!bo && !lo) { drawBareTree(ctx, t, SAKURA.bark); budDots(ctx, t, 0.6); return; }
  function pass(filt) { if (lo) paintSprays(ctx, t, filt, lo); if (bo) paintSprays(ctx, t, filt, bo); }
  if (b + l < 0.55) { drawBareTree(ctx, t, SAKURA.bark); if (b < 0.3 && l < 0.05) budDots(ctx, t, 0.5); pass(function () { return true; }); return; }
  pass(function (p) { return p.d > cd + 0.25; });
  drawBranches(ctx, t.segs, SAKURA.bark);
  pass(function (p) { return p.d <= cd + 0.25; });
}
function budDots(ctx, t, frac) {
  if (sil()) return;
  var r = mulberry32(t.seed + 9), lt = lightTint(1);
  ctx.fillStyle = rgb(mulc([150, 70, 86], lt));
  t.twigs.forEach(function (tw) { if (r() > frac) return; var p = Pa(tw[2]), q = Pa(tw[1]); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.35, 0.05 * p.k), 0, TAU); ctx.arc(q.x, q.y, Math.max(0.3, 0.04 * q.k), 0, TAU); ctx.fill(); });
}

/* ---- 04_arch.js ---- */
/* ================= architecture kit =================
   A building lives in a frame B: centre (x,z), height by, u along its frontage, v toward its back; its front faces -v.
   Walls are quads given by two ground points in (a,b) frame coordinates, left to right as seen from outside. */
var MAT = {
  plaster: [230, 224, 210], plasterOld: [214, 204, 186], earth: [172, 138, 98], earthD: [148, 116, 82],
  woodD: [62, 46, 36], wood: [96, 72, 52], woodL: [140, 108, 76], bengara: [122, 58, 42], tile: [96, 100, 108], tileD: [74, 78, 86],
  stone: [152, 148, 138], namako: [60, 64, 70], verm: [198, 64, 38], thatch: [150, 126, 88], board: [118, 96, 72], shoji: [236, 228, 206], copper: [92, 150, 128]
};
var LAMP_ON = [255, 196, 110], WIN_ON = [255, 214, 150];
function BF(x, z, u, by) {
  u = norm2(u); var v = [-u[1], u[0]]; by = by || 0;
  return {
    x: x, z: z, u: u, v: v, by: by,
    L: function (a, b, y) { return [x + u[0] * a + v[0] * b, by + y, z + u[1] * a + v[1] * b]; },
    N: function (na, nb, ny) { return norm([u[0] * na + v[0] * nb, ny, u[1] * na + v[1] * nb]); }
  };
}
function wallOf(B, A0, A1, y0, y1) {
  var ea = A1[0] - A0[0], eb = A1[1] - A0[1], len = Math.hypot(ea, eb) || 1, na = eb / len, nb = -ea / len;
  var W = { B: B, A0: A0, A1: A1, y0: y0, y1: y1, len: len, h: y1 - y0, n: B.N(na, nb, 0), na: na, nb: nb };
  W.at = function (s, y, out) { var f = s / len; out = out || 0; return B.L(A0[0] + ea * f + na * out, A0[1] + eb * f + nb * out, y); };
  W.p = [W.at(0, y0), W.at(len, y0), W.at(len, y1), W.at(0, y1)];
  W.c = W.at(len / 2, (y0 + y1) / 2);
  W.vis = faceVisible(W.c, W.n);
  return W;
}
function boxWalls(B, w, d, y0, y1, ox, oz) {
  ox = ox || 0; oz = oz || 0;
  var FL = [ox - w / 2, oz - d / 2], FR = [ox + w / 2, oz - d / 2], BR = [ox + w / 2, oz + d / 2], BL = [ox - w / 2, oz + d / 2];
  return { f: wallOf(B, FL, FR, y0, y1), r: wallOf(B, FR, BR, y0, y1), b: wallOf(B, BR, BL, y0, y1), l: wallOf(B, BL, FL, y0, y1) };
}
function fillPts(ctx, pts3, col, sw) { var pp = pts3.map(Pa); poly(ctx, pp); ctx.fillStyle = sil() ? '#000' : rgb(col); ctx.fill(); if (!sil() && sw !== 0) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = sw || 0.35; ctx.stroke(); } return pp; }
function wquad(ctx, W, s0, s1, y0, y1, col, out, sw) { return fillPts(ctx, [W.at(s0, y0, out), W.at(s1, y0, out), W.at(s1, y1, out), W.at(s0, y1, out)], col, sw); }
function wline(ctx, W, s0, y0, s1, y1, out) { var a = Pa(W.at(s0, y0, out)), b = Pa(W.at(s1, y1, out)); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
function lit(c, n, o) { return shade(c, n, o); }
/* a whole wall: fill, grain, grime at the foot, shadow under the eaves; optional gable triangle up to yR */
function paintWall(ctx, W, alb, o) {
  o = o || {};
  if (!W.vis) return null;
  var pts = W.p.slice();
  if (o.gable) { pts = [W.p[0], W.p[1], W.p[2], W.at(W.len / 2, o.gable), W.p[3]]; }
  var col = lit(alb, W.n, o.lo);
  var pp = fillPts(ctx, pts, col, 0.45);
  if (sil()) return pp;
  var path = new Path2D(); pp.forEach(function (p, i) { if (i) path.lineTo(p.x, p.y); else path.moveTo(p.x, p.y); }); path.closePath();
  ctx.save(); ctx.clip(path);
  if (o.tex !== 0) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.tex || 0.4; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W.B ? W2() : 0, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  var b0 = Pa(W.at(W.len / 2, W.y0)), t0 = Pa(W.at(W.len / 2, W.y0 + Math.min(W.h, 1.1)));
  if (o.grime !== 0) { var g = ctx.createLinearGradient(0, b0.y, 0, t0.y); g.addColorStop(0, 'rgba(46,36,28,' + (o.grime || 0.32) + ')'); g.addColorStop(1, 'rgba(46,36,28,0)'); ctx.fillStyle = g; ctx.fillRect(0, t0.y, W2(), b0.y - t0.y + 2); }
  if (o.eave) { // the overhang's shadow along the top
    var e0 = Pa(W.at(W.len / 2, W.y1)), e1 = Pa(W.at(W.len / 2, W.y1 - o.eave)), g2 = ctx.createLinearGradient(0, e0.y, 0, e1.y);
    g2.addColorStop(0, 'rgba(20,16,24,' + (0.5 * (LIT.shadowA + 0.3)) + ')'); g2.addColorStop(1, 'rgba(20,16,24,0)'); ctx.fillStyle = g2; ctx.fillRect(0, e0.y - 8, W2(), e1.y - e0.y + 8);
  }
  if (o.streaks) { ctx.strokeStyle = 'rgba(70,60,50,0.12)'; ctx.lineWidth = 0.5; ctx.beginPath(); var r = mulberry32(o.seed || 3); for (var i = 0; i < W.len * 1.5; i++) { var s = r() * W.len, y1 = W.y1 - r() * 0.3, y2 = y1 - 0.4 - r() * 1.2; wline(ctx, W, s, y1, s, y2, 0.01); } ctx.stroke(); }
  ctx.restore();
  return pp;
}
function W2() { return W; }
/* posts and beams of a timber-framed (shinkabe) wall */
function frameWall(ctx, W, posts, beams, col, pw) {
  if (!W.vis || sil()) return;
  pw = pw || 0.16; var c = lit(col, W.n);
  posts.forEach(function (s) { wquad(ctx, W, s - pw / 2, s + pw / 2, W.y0, W.y1, c, 0.02, 0.3); });
  beams.forEach(function (y) { wquad(ctx, W, 0, W.len, y - pw * 0.6, y + pw * 0.6, c, 0.02, 0.3); });
}
/* wooden lattice (koshi): dark ground, light slats; proud of the wall by `out` */
function lattice(ctx, W, s0, s1, y0, y1, o) {
  if (!W.vis) return;
  o = o || {}; var out = o.out || 0.06, col = o.col || MAT.bengara;
  if (o.depth && !sil()) { // the projecting lattice box (degoshi): its top and side
    fillPts(ctx, [W.at(s0, y1, 0), W.at(s1, y1, 0), W.at(s1, y1, out), W.at(s0, y1, out)], lit(col, [0, 1, 0]));
  }
  wquad(ctx, W, s0, s1, y0, y1, scl(lit(col, W.n), 0.3), out);
  if (sil()) return;
  if (o.lit) { var ins = mixc(WIN_ON, [200, 140, 80], 0.2); wquad(ctx, W, s0 + 0.05, s1 - 0.05, y0 + 0.08, y1 - 0.08, ins, out - 0.005, 0); addGlow(Pa(W.at((s0 + s1) / 2, (y0 + y1) / 2, out)), 5 + (s1 - s0) * 0.9, 0.3, true); }
  var a = Pa(W.at(s0, y0, out)), b = Pa(W.at(s1, y0, out)), px = Math.hypot(b.x - a.x, b.y - a.y) * KS;
  var n = Math.max(2, Math.min(Math.round((s1 - s0) / (o.sp || 0.11)), Math.round(px / 2.2)));
  ctx.strokeStyle = rgb(lit(mixc(col, [255, 230, 200], 0.3), W.n, { amb: 1.15 })); ctx.lineWidth = Math.max(0.3, Math.min(0.9, Math.abs(b.x - a.x) / n * 0.55)); ctx.beginPath();
  for (var i = 0; i <= n; i++) { var s = lerp(s0, s1, i / n); wline(ctx, W, s, y0, s, y1, out + 0.01); }
  ctx.stroke();
  ctx.strokeStyle = rgb(lit(col, W.n)); ctx.lineWidth = 0.7; ctx.beginPath(); wline(ctx, W, s0, y1, s1, y1, out + 0.01); wline(ctx, W, s0, y0 + 0.05, s1, y0 + 0.05, out + 0.01); if (o.mid) wline(ctx, W, s0, (y0 + y1) * 0.5 + 0.2, s1, (y0 + y1) * 0.5 + 0.2, out + 0.01); ctx.stroke();
}
/* paper screens: at night some glow */
function shoji(ctx, W, s0, s1, y0, y1, o) {
  if (!W.vis) return;
  o = o || {}; var on = !!o.lit, out = o.out || 0.03;
  wquad(ctx, W, s0, s1, y0, y1, on ? WIN_ON : lit(MAT.shoji, W.n, { amb: 1.15 }), out, 0.3);
  if (sil()) return;
  var fr = on ? 'rgba(120,76,40,0.8)' : rgb(lit(MAT.woodL, W.n)), pn = Math.max(1, Math.round((s1 - s0) / 0.9));
  ctx.strokeStyle = fr; ctx.lineWidth = 0.35; ctx.beginPath();
  var rows = Math.max(2, Math.round((y1 - y0) / 0.32));
  for (var i = 0; i <= pn; i++) { var s = lerp(s0, s1, i / pn); wline(ctx, W, s, y0, s, y1, out + 0.01); }
  for (var j = 1; j < rows; j++) { var y = lerp(y0, y1, j / rows); wline(ctx, W, s0, y, s1, y, out + 0.01); }
  for (i = 0; i < pn; i++) { var sm = lerp(s0, s1, (i + 0.5) / pn); wline(ctx, W, sm, y0, sm, y1, out + 0.01); }
  ctx.stroke();
  ctx.strokeStyle = rgb(lit(MAT.wood, W.n)); ctx.lineWidth = 0.6; ctx.beginPath(); wline(ctx, W, s0, y0, s1, y0, out + 0.01); wline(ctx, W, s0, y1, s1, y1, out + 0.01); ctx.stroke();
  if (on) addGlow(Pa(W.at((s0 + s1) / 2, (y0 + y1) / 2, out)), 5 + (s1 - s0) * 1.3, 0.36, true);
}
/* mushiko-mado: plastered slit windows of the low upper storey */
function mushiko(ctx, W, s0, s1, y0, y1, on) {
  if (!W.vis) return;
  wquad(ctx, W, s0, s1, y0, y1, on ? scl(WIN_ON, 0.85) : scl(lit(MAT.plaster, W.n), 0.32), 0.01, 0.3);
  if (sil()) return;
  var n = Math.max(3, Math.round((s1 - s0) / 0.2)); ctx.strokeStyle = rgb(lit(MAT.plaster, W.n)); ctx.lineWidth = Math.max(0.45, Pa(W.c).k * (s1 - s0) / n * 0.5); ctx.beginPath();
  for (var i = 0; i <= n; i++) { var s = lerp(s0, s1, i / n); wline(ctx, W, s, y0, s, y1, 0.02); } ctx.stroke();
  if (on) addGlow(Pa(W.at((s0 + s1) / 2, (y0 + y1) / 2)), 5, 0.28, true);
}
/* namako-kabe: square dark tiles set diagonally with raised white plaster joints */
function namako(ctx, W, s0, s1, y0, y1) {
  if (!W.vis) return;
  var pp = wquad(ctx, W, s0, s1, y0, y1, lit(MAT.namako, W.n), 0.02);
  if (sil()) return;
  var path = new Path2D(); pp.forEach(function (p, i) { if (i) path.lineTo(p.x, p.y); else path.moveTo(p.x, p.y); }); path.closePath();
  ctx.save(); ctx.clip(path);
  var sz = 0.3, cj = rgb(lit([238, 236, 228], W.n)), c0 = Pa(W.at(s0, y0)), k = c0.k;
  ctx.strokeStyle = cj; ctx.lineWidth = Math.max(0.35, 0.06 * k); ctx.beginPath();
  var L = s1 - s0 + (y1 - y0);
  for (var t = -(y1 - y0); t < L; t += sz) { wline(ctx, W, s0 + t, y0, s0 + t + (y1 - y0), y1, 0.03); wline(ctx, W, s0 + t + (y1 - y0), y0, s0 + t, y1, 0.03); }
  ctx.stroke();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W2(), H);
  ctx.restore();
}
/* weatherboard (yakisugi) skirt */
function boards(ctx, W, s0, s1, y0, y1, col) {
  if (!W.vis) return;
  col = col || [58, 46, 40];
  wquad(ctx, W, s0, s1, y0, y1, lit(col, W.n), 0.02);
  if (sil()) return;
  ctx.strokeStyle = rgb(scl(lit(col, W.n), 0.6)); ctx.lineWidth = 0.35; ctx.beginPath();
  for (var s = s0 + 0.3; s < s1; s += 0.3) wline(ctx, W, s, y0, s, y1, 0.03);
  ctx.stroke();
  ctx.strokeStyle = rgb(lit(mixc(col, [200, 180, 150], 0.3), W.n)); ctx.lineWidth = 0.5; ctx.beginPath(); wline(ctx, W, s0, y1, s1, y1, 0.04); ctx.stroke();
}
/* a dark doorway, optionally with a half-open lit interior */
function doorway(ctx, W, s0, s1, y0, y1, on) {
  if (!W.vis) return;
  wquad(ctx, W, s0, s1, y0, y1, on ? scl(WIN_ON, 0.75) : [34, 28, 26], 0.015, 0.3);
  if (on && !sil()) addGlow(Pa(W.at((s0 + s1) / 2, y0 + (y1 - y0) * 0.45)), 6.5, 0.45, true);
}
/* hash for per-window choices */
function winOn(seed) { return LIT.win > 0 && hash2(seed | 0, 77) < LIT.win * 0.9; }

/* ================= roofs =================
   R: { W, D: half extents incl. overhang (along u, v), yE eave height, s slope, type 'gable'|'hip'|'irimoya', bm (irimoya gable half-width),
        mat 'kawara'|'thatch'|'board'|'bark'|'copper', sori (corner lift), ca, cb (centre offset), ridgeH, gableCol, noFront, snowK } */
function roofGeom(B, R) {
  var Wd = R.W, D = R.D, yE = R.yE, s = R.s, yR = yE + s * D, ca = R.ca || 0, cb = R.cb || 0, type = R.type || 'gable';
  var Rg = type === 'gable' ? Wd : type === 'hip' ? Math.max(0.05, Wd - D) : Wd - (D - R.bm), bm = type === 'gable' ? D : type === 'hip' ? 0 : R.bm;
  var yM = yE + s * (D - bm), sori = R.sori || 0, NS = sori ? 10 : 1;
  function L(a, b, y) { return B.L(ca + a, cb + b, y); }
  function lift(f) { return sori * Math.pow(Math.abs(f), 3.2); }
  var planes = [];
  // front (b<0) and back (b>0)
  [-1, 1].forEach(function (sg) {
    var pts = [], i;
    for (i = 0; i <= NS; i++) { var f = -1 + 2 * i / NS; pts.push(L(f * Wd, sg * D, yE + lift(f))); }
    var eave = pts.slice();
    if (type === 'gable') { pts.push(L(Wd, 0, yR), L(-Wd, 0, yR)); }
    else { pts.push(L(Rg, sg * bm, yM)); if (bm > 0.01) pts.push(L(Rg, 0, yR)); pts.push(L(-Rg, 0, yR)); if (bm > 0.01) pts.push(L(-Rg, sg * bm, yM)); }
    if (sg > 0) pts.reverse();
    var n = B.N(0, sg * s, 1);
    planes.push({ pts: pts, eave: eave, n: n, E: L(-Wd, sg * D, yE), e: B.N(1, 0, 0), g: sub(L(-Wd, 0, yR), L(-Wd, sg * D, yE)), Le: 2 * Wd, kind: sg < 0 ? 'front' : 'back' });
  });
  if (type !== 'gable') [-1, 1].forEach(function (sg) {
    var pts = [], i;
    for (i = 0; i <= NS; i++) { var f = 1 - 2 * i / NS; pts.push(L(sg * Wd, f * D, yE + lift(f))); }
    var eave = pts.slice();
    pts.push(L(sg * Rg, -bm, yM)); if (bm > 0.01) pts.push(L(sg * Rg, bm, yM));
    var n = B.N(sg * (D - bm) / Math.max(0.01, Wd - Rg) * s, 0, 1);
    planes.push({ pts: pts, eave: eave, n: n, E: L(sg * Wd, D, yE), e: B.N(0, -1, 0), g: sub(L(sg * Rg, D, yM), L(sg * Wd, D, yE)), Le: 2 * D, kind: 'side' });
  });
  var gables = [];
  if (type === 'irimoya') [-1, 1].forEach(function (sg) { gables.push({ pts: [L(sg * Rg, -bm, yM), L(sg * Rg, bm, yM), L(sg * Rg, 0, yR)], n: B.N(sg, 0, 0), sg: sg }); });
  return { planes: planes, gables: gables, yR: yR, yM: yM, Rg: Rg, bm: bm, L: L, R: R };
}
function planePath(pp) { var p = new Path2D(); pp.forEach(function (q, i) { if (i) p.lineTo(q.x, q.y); else p.moveTo(q.x, q.y); }); p.closePath(); return p; }
function roofAlb(R) { return R.mat === 'thatch' ? MAT.thatch : R.mat === 'board' ? MAT.board : R.mat === 'bark' ? [112, 70, 52] : R.mat === 'copper' ? MAT.copper : R.col || MAT.tile; }
function drawRoof(ctx, B, R) {
  var G = roofGeom(B, R), rng = mulberry32(R.seed || 11), snow = SEA.snow * (R.snowK === undefined ? 1 : R.snowK);
  var items = [];
  G.planes.forEach(function (pl) { if (pl.kind === 'front' && R.noFront) return; if (faceVisible(centroid(pl.pts), pl.n) || MODE === 's') items.push({ pl: pl, d: Pa(centroid(pl.pts)).d }); });
  G.gables.forEach(function (gb) { if (faceVisible(centroid(gb.pts), gb.n) || MODE === 's') items.push({ gb: gb, d: Pa(centroid(gb.pts)).d + 0.01 }); });
  items.sort(function (a, b) { return b.d - a.d; });
  items.forEach(function (it) { if (it.pl) roofPlane(ctx, it.pl, R, rng, snow); else gableTri(ctx, it.gb, R); });
  if (!R.noRidge) ridges(ctx, G, R, snow);
  return G;
}
function centroid(pts) { var c = [0, 0, 0]; pts.forEach(function (p) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }); return mul(c, 1 / pts.length); }
function roofPlane(ctx, pl, R, rng, snow) {
  var pp = pl.pts.map(Pa), path = planePath(pp);
  if (sil()) { ctx.fillStyle = '#000'; ctx.fill(path); ctx.strokeStyle = '#000'; ctx.lineWidth = 0.4; ctx.stroke(path); return; }
  var alb = roofAlb(R), n = pl.n, mat = R.mat || 'kawara';
  var base = shade(alb, n, { amb: 1.05 });
  ctx.fillStyle = rgb(base); ctx.fill(path); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.4; ctx.stroke(path);
  ctx.save(); ctx.clip(path);
  var E = pl.E, e = pl.e, g = pl.g, Lg = Math.hypot(g[0], g[1], g[2]), gu = mul(g, 1 / Lg), Le = pl.Le;
  function at(s, t) { return Pa(add(add(E, mul(e, s)), mul(gu, t))); }
  var k0 = Pa(E).k, dq = Math.sqrt(DQ);
  if (mat === 'kawara' || mat === 'copper') {
    var sp = mat === 'copper' ? 0.45 : 0.3, minPx = 1.9 / KS, step = Math.max(sp, minPx / Math.max(0.1, k0 / 1)), i;
    // gentle light gradient: sheen toward the eaves on the sunny side
    var ge0 = at(Le / 2, 0), ge1 = at(Le / 2, Lg), lg = ctx.createLinearGradient(ge0.x, ge0.y, ge1.x, ge1.y);
    lg.addColorStop(0, rgb(scl(base, 0.82), 0.6)); lg.addColorStop(0.35, rgb(base, 0)); lg.addColorStop(1, rgb(mixc(base, LIT.skyHor, 0.25), 0.45));
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    if (!snow || snow < 1) {
      var dark = rgb(scl(base, 0.55)), hi = rgb(mixc(scl(base, 1.25), [255, 255, 255], 0.08));
      ctx.lineWidth = Math.max(0.3, step * k0 * 0.28); ctx.strokeStyle = dark; ctx.beginPath();
      for (var s = step * 0.5; s < Le; s += step) { var a = at(s, 0), b = at(s, Lg); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
      ctx.lineWidth = Math.max(0.25, step * k0 * 0.16); ctx.strokeStyle = hi; ctx.beginPath();
      for (s = step * 0.5 + step * 0.32; s < Le; s += step) { var a2 = at(s, 0), b2 = at(s, Lg); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); }
      ctx.stroke();
      // courses
      var cs = Math.max(0.3, minPx * 1.4 / Math.max(0.1, k0 * 0.6)); ctx.strokeStyle = rgb(scl(base, 0.7), 0.5); ctx.lineWidth = 0.3; ctx.beginPath();
      for (var t = cs; t < Lg; t += cs) { var c0 = at(0, t), c1 = at(Le, t); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); }
      ctx.stroke();
      // a few lighter, newer tiles
      for (i = 0; i < Le * Lg * 0.25 * dq; i++) { var q = at(rng() * Le, rng() * Lg); ctx.fillStyle = rng() < 0.5 ? rgb(scl(base, 1.18), 0.5) : rgb(scl(base, 0.8), 0.5); ctx.fillRect(q.x, q.y, Math.max(0.5, step * k0 * 0.6), Math.max(0.4, step * k0 * 0.3)); }
    }
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.4; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (F.wet && !snow) { // rain-glossed tiles: darker, with the sky caught along the rolls
      ctx.fillStyle = 'rgba(20,24,34,0.22)'; ctx.fillRect(0, 0, W, H);
      var gl0 = at(Le / 2, Lg), gl1 = at(Le / 2, 0), glg = ctx.createLinearGradient(gl0.x, gl0.y, gl1.x, gl1.y), skc = mixc(LIT.skyHor, [255, 255, 255], 0.2);
      glg.addColorStop(0, rgb(skc, 0.32)); glg.addColorStop(0.5, rgb(skc, 0.08)); glg.addColorStop(1, rgb(skc, 0.22)); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = glg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = rgb(skc, 0.3); ctx.lineWidth = Math.max(0.25, step * k0 * 0.12); ctx.beginPath(); for (var gs = step * 0.75; gs < Le; gs += step) { var ga0 = at(gs, 0), gb0 = at(gs, Lg); ctx.moveTo(ga0.x, ga0.y); ctx.lineTo(gb0.x, gb0.y); } ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    }
  } else if (mat === 'thatch') {
    var NB = 7, paths = [], bix; for (bix = 0; bix < NB; bix++) paths.push(new Path2D());
    var cnt = Math.min(5000, Le * Lg * 60) * DQ * (snow ? 0.3 : 1) * (R.far || 1);
    for (i = 0; i < cnt; i++) {
      var u = rng() * Le, v = rng() * Lg, pa = at(u, v), pb = at(u + (rng() - 0.5) * 0.05, v + 0.18 + rng() * 0.14);
      var w3 = add(E, add(mul(e, u), mul(gu, v))), nn = NZ.n2(w3[0] * 0.9, w3[2] * 0.9 + w3[1] * 0.9), l = clamp(0.3 + 0.5 * nn + (rng() - 0.5) * 0.5 - 0.2 * (1 - v / Lg));
      var ix = Math.min(NB - 1, (l * NB) | 0); paths[ix].moveTo(pa.x, pa.y); paths[ix].lineTo(pb.x, pb.y);
    }
    var pal = [[70, 58, 42], [96, 80, 58], [120, 100, 70], [146, 124, 86], [166, 144, 100], [186, 164, 116], [208, 188, 140]];
    for (bix = 0; bix < NB; bix++) { ctx.strokeStyle = rgb(shade(pal[bix], n, { amb: 1.15 })); ctx.lineWidth = 0.45 / dq * 1.2; ctx.stroke(paths[bix]); }
    if (!snow) for (i = 0; i < cnt * 0.04; i++) { var u3 = rng() * Le, v3 = rng() * Lg * 0.7; var w4 = add(E, add(mul(e, u3), mul(gu, v3))); if (NZ.n2(w4[0] * 0.5 + 3, w4[2] * 0.5) < 0.62) continue; var p3 = at(u3, v3); ctx.fillStyle = rgb(shade([84, 100, 52], n), 0.6); ctx.beginPath(); ctx.arc(p3.x, p3.y, 0.5 + rng() * 0.7, 0, TAU); ctx.fill(); }
    var t0 = at(Le / 2, 0), t1 = at(Le / 2, Lg * 0.4), gr = ctx.createLinearGradient(t0.x, t0.y, t1.x, t1.y); gr.addColorStop(0, 'rgba(30,20,10,0.22)'); gr.addColorStop(1, 'rgba(30,20,10,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  } else if (mat === 'board' || mat === 'bark') {
    ctx.strokeStyle = rgb(scl(base, 0.72)); ctx.lineWidth = 0.35; ctx.beginPath();
    var bs = Math.max(mat === 'bark' ? 0.12 : 0.28, 1.6 / KS / Math.max(0.1, k0));
    for (s = bs; s < Le; s += bs) { var a5 = at(s, 0), b5 = at(s, Lg); ctx.moveTo(a5.x, a5.y); ctx.lineTo(b5.x, b5.y); }
    ctx.stroke();
    if (mat === 'board' && !snow) { // battens weighted with stones
      for (t = 0.6; t < Lg - 0.2; t += 1.4) {
        var q0 = at(0, t), q1 = at(Le, t); ctx.strokeStyle = rgb(scl(base, 0.6)); ctx.lineWidth = Math.max(0.4, 0.1 * k0); ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
        for (s = 0.3; s < Le; s += 0.55 + rng() * 0.4) { var st = at(s, t + 0.05); ctx.fillStyle = rgb(shade(mixc([150, 146, 138], [110, 106, 100], rng()), [0, 1, 0])); ctx.beginPath(); ctx.ellipse(st.x, st.y, Math.max(0.45, 0.12 * k0), Math.max(0.35, 0.08 * k0), 0, 0, TAU); ctx.fill(); }
      }
    }
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.45; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  if (snow) {
    var sc = shade(mixc(SNOW, [210, 220, 236], 0.15), n, { amb: 1.12 }), top = clamp((F.wx === 'blizzard' ? 0.98 : 0.88) * snow);
    // a deep soft blanket; on the lower part streaks where tiles show through
    ctx.globalAlpha = top; ctx.fillStyle = rgb(sc); ctx.fill(path); ctx.globalAlpha = 1;
    var sg0 = at(Le / 2, 0), sg1 = at(Le / 2, Lg), sgr = ctx.createLinearGradient(sg0.x, sg0.y, sg1.x, sg1.y);
    sgr.addColorStop(0, rgb(scl(sc, 0.86), 0.5)); sgr.addColorStop(0.5, rgb(sc, 0)); sgr.addColorStop(1, rgb(mixc(sc, [255, 255, 255], 0.4), 0.4)); ctx.fillStyle = sgr; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rgb(scl(sc, 0.82), 0.6); ctx.lineWidth = 0.4; ctx.beginPath();
    for (i = 0; i < Le * 1.2; i++) { var su = rng() * Le, sv = rng() * Lg * 0.8, a6 = at(su, sv), b6 = at(su + (rng() - 0.5) * 0.3, sv + 0.3 + rng() * 0.6); ctx.moveTo(a6.x, a6.y); ctx.lineTo(b6.x, b6.y); }
    ctx.stroke();
  }
  ctx.restore();
  // the eave's edge: a thin dark band of eave tiles (or the thatch's cut edge), snow lip and icicles
  if (pl.kind !== 'back') eaveEdge(ctx, pl, R, rng, snow, at, Le);
}
function eaveEdge(ctx, pl, R, rng, snow, at, Le) {
  var n = pl.n, mat = R.mat || 'kawara', th = mat === 'thatch' ? 0.38 : mat === 'kawara' ? 0.16 : 0.1, NS = 12, top = [], bot = [];
  var ev = pl.eave || pl.pts.slice(0, 2), e0 = ev[0];
  for (var i = 0; i < ev.length; i++) { var q = ev[i]; top.push(Pa(q)); bot.push(P(q[0], q[1] - th, q[2])); }
  poly(ctx, top.concat(bot.slice().reverse()));
  var c = mat === 'thatch' ? shade([110, 92, 64], [n[0], 0, n[2]], { amb: 1.1 }) : shade(scl(roofAlb(R), 0.66), norm([n[0], 0.3, n[2]]));
  if (snow) c = shade(SNOW, norm([n[0], 0.5, n[2]]));
  ctx.fillStyle = sil() ? '#000' : rgb(c); ctx.fill();
  if (sil()) return;
  if (mat === 'thatch') { ctx.strokeStyle = 'rgba(40,30,20,0.45)'; ctx.lineWidth = 0.4; ctx.beginPath(); for (var k = 0; k < top.length - 1; k++) { var a = top[k], b = top[k + 1]; for (var j = 0; j < 6; j++) { var f = j / 6, x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f), y2 = lerp(bot[k].y, bot[k + 1].y, f); ctx.moveTo(x, y); ctx.lineTo(x + 0.2, y2); } } ctx.stroke(); }
  else if (!snow) { ctx.strokeStyle = rgb(scl(c, 1.35), 0.7); ctx.lineWidth = 0.4; ctx.beginPath(); top.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y + 0.2); else ctx.moveTo(p.x, p.y + 0.2); }); ctx.stroke(); }
  if (snow) {
    // a rounded overhanging lip, then icicles
    if (F.wx === 'blizzard') { // a heavy, rounded load hanging over the eave
      var kE = Pa(e0).k; ctx.lineCap = 'round';
      ctx.strokeStyle = rgb(shade(mixc(SNOW, [200, 212, 232], 0.25), norm([n[0], 0.2, n[2]]))); ctx.lineWidth = Math.max(1, 0.3 * kE); ctx.beginPath(); top.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y - 0.06 * kE); else ctx.moveTo(p.x, p.y - 0.06 * kE); }); ctx.stroke();
      ctx.strokeStyle = rgb(shade(SNOW, [0, 1, 0])); ctx.lineWidth = Math.max(0.7, 0.2 * kE); ctx.beginPath(); top.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y - 0.14 * kE); else ctx.moveTo(p.x, p.y - 0.14 * kE); }); ctx.stroke(); ctx.lineCap = 'butt';
    } else { ctx.strokeStyle = rgb(shade(SNOW, [0, 1, 0])); ctx.lineWidth = Math.max(0.7, 0.18 * top[0].x * 0 + 0.12 * Pa(e0).k); ctx.lineCap = 'round'; ctx.beginPath(); top.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y - 0.2); else ctx.moveTo(p.x, p.y - 0.2); }); ctx.stroke(); ctx.lineCap = 'butt'; }
    if (pl.kind === 'front' || pl.kind === 'side') {
      var ic = rgb(mixc(shade([226, 236, 246], [0, 0.4, -1], { amb: 1.2 }), [255, 255, 255], 0.2), 0.9), kk = Pa(e0).k;
      ctx.fillStyle = ic; ctx.beginPath();
      for (var m = 0; m < Le * 2.2; m++) {
        var f2 = rng(), seg = Math.min(top.length - 2, Math.floor(f2 * (top.length - 1))), ff = f2 * (top.length - 1) - seg;
        var bx = lerp(bot[seg].x, bot[seg + 1].x, ff), by = lerp(bot[seg].y, bot[seg + 1].y, ff), L = (0.1 + Math.pow(rng(), 2) * 0.55) * kk, wdt = Math.max(0.3, 0.05 * kk);
        ctx.moveTo(bx - wdt, by); ctx.lineTo(bx + wdt, by); ctx.lineTo(bx + 0.05, by + L); ctx.closePath();
      }
      ctx.fill();
    }
  }
}
function gableTri(ctx, gb, R) {
  var pp = gb.pts.map(Pa);
  poly(ctx, pp);
  if (sil()) { ctx.fillStyle = '#000'; ctx.fill(); return; }
  var col = R.gableCol || (R.mat === 'thatch' ? [70, 54, 40] : [58, 46, 38]);
  ctx.fillStyle = rgb(shade(col, gb.n)); ctx.fill();
  if (R.gableWhite) { // white plaster triangle with a dark barge board
    var c = centroid(gb.pts), inner = gb.pts.map(function (p) { return mixc(p, c, 0.22); }); fillPts(ctx, inner, shade(MAT.plaster, gb.n), 0.3);
  } else if (R.mat === 'thatch') { // smoke vent
    var c2 = centroid(gb.pts), vv = gb.pts.map(function (p) { return mixc(p, c2, 0.55); }); fillPts(ctx, vv, [26, 20, 18], 0);
  } else {
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgb(shade(mixc(col, [200, 170, 120], 0.35), gb.n)); ctx.lineWidth = 0.4; ctx.beginPath();
    var a = gb.pts[0], b = gb.pts[1]; for (var i = 1; i < 8; i++) { var p = Pa(mixc(a, b, i / 8)), q = Pa(add(mixc(a, b, i / 8), [0, 3, 0])); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); } ctx.stroke(); ctx.restore();
  }
  // barge boards
  ctx.strokeStyle = rgb(shade(R.bargeCol || (R.gableWhite ? [236, 232, 222] : [52, 40, 34]), gb.n)); ctx.lineWidth = Math.max(0.6, 0.12 * pp[2].k); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y); ctx.lineTo(pp[2].x, pp[2].y); ctx.lineTo(pp[1].x, pp[1].y); ctx.stroke(); ctx.lineJoin = 'miter';
  if (SEA.snow && !sil()) { ctx.strokeStyle = rgb(shade(SNOW, [0, 1, 0])); ctx.lineWidth = Math.max(0.5, 0.08 * pp[2].k); ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y - 0.5); ctx.lineTo(pp[2].x, pp[2].y - 0.6); ctx.lineTo(pp[1].x, pp[1].y - 0.5); ctx.stroke(); }
}
function ridges(ctx, G, R, snow) {
  var L = G.L, rh = R.ridgeH === undefined ? (R.mat === 'thatch' ? 0.35 : 0.3) : R.ridgeH, Rg = G.Rg, yR = G.yR, mat = R.mat || 'kawara';
  var a = P.apply(null, L(-Rg - (R.type === 'gable' ? 0 : 0.1), 0, yR + rh * 0.5)), b = P.apply(null, L(Rg + (R.type === 'gable' ? 0 : 0.1), 0, yR + rh * 0.5));
  var k = (a.k + b.k) / 2, wpx = Math.max(0.8, rh * k);
  var dark = mat === 'thatch' ? [64, 52, 40] : mat === 'board' ? [80, 64, 50] : mat === 'bark' ? [80, 52, 40] : mat === 'copper' ? [70, 120, 100] : scl(roofAlb(R), 0.62);
  if (snow) dark = mixc(dark, SNOW, 0.85);
  ctx.lineCap = 'round'; ctx.strokeStyle = sil() ? '#000' : rgb(shade(dark, [0, 1, 0])); ctx.lineWidth = wpx; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  // hip ridges
  if (R.type !== 'gable') {
    ctx.lineWidth = Math.max(0.6, wpx * 0.5);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      var c0 = Pa(L(q[0] * R.W, q[1] * R.D, R.yE + (R.sori || 0) + 0.05)), c1 = Pa(L(q[0] * Rg, q[1] * G.bm, G.yM + 0.05));
      ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.stroke();
    });
  }
  ctx.lineCap = 'butt';
  if (sil()) return;
  ctx.strokeStyle = snow ? 'rgba(255,255,255,0.9)' : rgb(shade(mixc(dark, [255, 255, 255], 0.25), [0, 1, 0]), 0.8); ctx.lineWidth = Math.max(0.35, wpx * 0.3); ctx.beginPath(); ctx.moveTo(a.x, a.y - wpx * 0.3); ctx.lineTo(b.x, b.y - wpx * 0.3); ctx.stroke();
  if (mat === 'kawara' && !R.noOni) [a, b].forEach(function (p) { ctx.fillStyle = rgb(shade(scl(roofAlb(R), 0.55), [0, 0.5, -1])); ctx.beginPath(); ctx.ellipse(p.x, p.y - wpx * 0.2, wpx * 0.75, wpx * 1.05, 0, 0, TAU); ctx.fill(); });
  if (mat === 'thatch' && !snow) { // bound ridge with crossed sticks
    ctx.strokeStyle = 'rgb(46,36,28)'; ctx.lineWidth = Math.max(0.4, 0.05 * k);
    for (var i = 0; i <= 6; i++) { var f = i / 6, x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f); ctx.beginPath(); ctx.moveTo(x - 0.15 * k, y - 0.3 * k); ctx.lineTo(x + 0.15 * k, y + 0.25 * k); ctx.moveTo(x + 0.15 * k, y - 0.3 * k); ctx.lineTo(x - 0.15 * k, y + 0.25 * k); ctx.stroke(); }
  }
  if (R.shachi) [a, b].forEach(function (p, i) { ctx.fillStyle = rgb(shade([214, 170, 70], [0, 0.6, -1], { amb: 1.3 })); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + (i ? 1 : -1) * wpx * 0.9, p.y - wpx * 1.4, p.x + (i ? -1 : 1) * wpx * 0.3, p.y - wpx * 2.2); ctx.quadraticCurveTo(p.x, p.y - wpx * 1.2, p.x, p.y); ctx.fill(); });
}
/* a simple pent roof (hisashi) along a wall: from the wall at height y up/out by depth dp */
function pentRoof(ctx, W, s0, s1, y, dp, R) {
  var B = W.B, sl = R && R.s || 0.42, top0 = W.at(s0 - 0.1, y), top1 = W.at(s1 + 0.1, y), out0 = W.at(s0 - 0.1, y - dp * sl, dp), out1 = W.at(s1 + 0.1, y - dp * sl, dp);
  var pl = { pts: [out0, out1, top1, top0], eave: [out0, out1], n: norm(add(W.n, [0, 1 / Math.max(0.2, sl), 0])), E: out0, e: norm(sub(out1, out0)), g: sub(top0, out0), Le: Math.hypot(out1[0] - out0[0], out1[2] - out0[2]), kind: 'front' };
  var rng = mulberry32(((W.c[0] * 13) | 0) + 7);
  if (!faceVisible(centroid(pl.pts), pl.n) && MODE !== 's') return;
  roofPlane(ctx, pl, R || { mat: 'kawara' }, rng, SEA.snow);
}

/* ---- 04a_prims.js ---- */
/* ================= primitives (from the garden) ================= */
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
  if (F && F.wx === 'blizzard' && SEA.snow && !sil() && MODE === 'n' && y1 - y0 > 3 * Math.max(r0, r1) && r0 < 0.45 && o.snow !== 0) {   // snow plastered on the windward side of a post
    var sg = WIND_LEAN >= 0 ? 1 : -1, pa = P(cx - sg * r0 * 0.75, y0 + 0.12, cz), pb = P(cx - sg * r1 * 0.75, y1 - 0.06, cz);
    ctx.strokeStyle = rgb(mixc(mulc(SNOW, lightTint(1)), [255, 255, 255], 0.1), 0.9); ctx.lineWidth = Math.max(0.3, Math.min(r0, 0.2) * pa.k * 0.8); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.lineCap = 'butt';
  }
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
/* a soft rounded cushion of snow sitting on a cap */
function snowCap(ctx, x, y, z, r, h) {
  var c = P(x, y, z), rx = r * c.k, ry = r * c.k * CAM.s * 1.05, hh = h * c.k, sc = mulc(SNOW, lightTint(1));
  ctx.fillStyle = rgb(scl(sc, 0.78)); ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(sc); ctx.beginPath(); ctx.ellipse(c.x - rx * 0.05, c.y - hh * 0.6, rx * 0.92, ry * 0.8 + hh * 0.4, 0, 0, TAU); ctx.fill();
}

/* ---- 04b_houses.js ---- */
/* ================= town houses ================= */
/* machiya: a townhouse with a lattice front, a pent roof and a low upper storey with slit windows */
function drawMachiya(ctx, sp) {
  var B = BF(sp.x, sp.z, sp.u, sp.by), w = sp.w, d = sp.d || 8, r = mulberry32(sp.seed), y1 = sp.low ? 2.7 : 3.0, yE = sp.yE || 5.0, S = sil();
  var wallC = sp.earth ? MAT.earth : r() < 0.5 ? MAT.plaster : MAT.plasterOld, latC = sp.lat || (r() < 0.6 ? MAT.bengara : [74, 54, 42]);
  var Wl = boxWalls(B, w, d, 0, yE - 0.15);
  var side = [Wl.l, Wl.r].filter(function (q) { return q.vis; });
  // the side walls: plaster above, weatherboard below
  side.forEach(function (q) {
    if (q === Wl.l && sp.joinL || q === Wl.r && sp.joinR) return;
    paintWall(ctx, q, wallC, { gable: yE + 0.5 * d / 2 + 0.15, eave: 0.5, seed: sp.seed });
    if (!S) { boards(ctx, q, 0, q.len, 0, 1.4); frameWall(ctx, q, [0.1, q.len / 2, q.len - 0.1], [y1], MAT.woodD, 0.14); }
  });
  if (sp.back) houseBack(ctx, Wl.b, wallC, sp.seed, y1 - 0.3);
  var f = Wl.f;
  if (f.vis) {
    paintWall(ctx, f, wallC, { eave: 0.6, seed: sp.seed + 1, tex: 0.35 });
    if (!S) {
      var dw = sp.doorW || 1.7, dl = sp.doorLeft ? 0.25 : w - dw - 0.25, on = winOn(sp.seed);
      // ground floor: posts, lattice, doorway
      wquad(ctx, f, 0, w, 0, y1, lit(scl(latC, 0.8), f.n), 0.01);
      if (sp.doorLeft) lattice(ctx, f, dw + 0.45, w - 0.2, 0.35, y1 - 0.15, { col: latC, out: 0.12, depth: true, lit: on });
      else lattice(ctx, f, 0.2, dl - 0.2, 0.35, y1 - 0.15, { col: latC, out: 0.12, depth: true, lit: on });
      doorway(ctx, f, dl, dl + dw, 0, y1 - 0.35, winOn(sp.seed + 3));
      boards(ctx, f, 0.2, w - 0.2, 0, 0.35, [70, 56, 46]);
      frameWall(ctx, f, [0.08, w - 0.08], [y1], MAT.woodD, 0.16);
      // upper storey
      var up = sp.low ? 'none' : sp.upper || (r() < 0.65 ? 'mushiko' : 'koshi');
      if (up === 'mushiko') { var mw = Math.min(w * 0.55, 3.2), m0 = (w - mw) / 2; mushiko(ctx, f, m0, m0 + mw, y1 + 0.75, y1 + 1.45, winOn(sp.seed + 5)); }
      else if (up === 'koshi') { lattice(ctx, f, 0.5, w - 0.5, y1 + 0.65, yE - 0.5, { col: latC, out: 0.05, sp: 0.09, lit: winOn(sp.seed + 5) }); }
      else if (up === 'shoji') { shoji(ctx, f, 0.4, w - 0.4, y1 + 0.6, yE - 0.4, { lit: winOn(sp.seed + 5) }); }
      if (!sp.low && r() < 0.7) inuyarai(ctx, f, sp.doorLeft ? dw + 0.45 : 0.2, sp.doorLeft ? w - 0.2 : dl - 0.2);
      if (sp.sign) { // a hanging shop sign beside the door
        var sx = sp.doorLeft ? dw + 0.55 : dl - 0.35; wquad(ctx, f, sx - 0.18, sx + 0.18, 1.2, 2.5, lit([40, 30, 24], f.n), 0.5);
        var c0 = Pa(f.at(sx, 2.25, 0.52)), c1 = Pa(f.at(sx, 1.45, 0.52)); ctx.strokeStyle = rgb(lit([214, 196, 150], f.n)); ctx.lineWidth = Math.max(0.3, 0.06 * c0.k); ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.stroke();
      }
    }
    if (!sp.low) pentRoof(ctx, f, -0.05, w + 0.05, y1 + 0.55, 0.95, { mat: 'kawara', s: 0.42 });
    if (!sp.low && !S) { var dw2 = sp.doorW || 1.7, dl2 = sp.doorLeft ? 0.25 : w - dw2 - 0.25; eaveSign(ctx, f, sp.doorLeft ? 0.35 : dl2 - 0.2, sp.doorLeft ? dw2 + 0.15 : w - 0.35, y1 + 0.62, sp.seed + 9); }
    if (!S) {
      var lr = mulberry32(sp.seed + 41), dc = sp.doorLeft ? 0.25 + (sp.doorW || 1.7) + 0.25 : w - (sp.doorW || 1.7) - 0.5;
      if (!sp.low || lr() < 0.5) chochin(ctx, f.at(dc, y1 + 0.05, 0.7), lr() < 0.5 ? [236, 228, 210] : [200, 60, 44]);
      if (lr() < 0.55) potRow(ctx, f, sp.doorLeft ? w - 1.6 : 0.3, sp.doorLeft ? w - 0.2 : 1.6, sp.seed + 3);
      if (lr() < 0.4) bench(ctx, f, sp.doorLeft ? w * 0.7 : w * 0.3, 0.75, 1.4);
    }
  }
  if (F.wx === 'typhoon' && !S && f.vis) { // 雨戸: storm shutters drawn across the front
    wquad(ctx, f, 0.1, w - 0.1, 0.15, y1 - 0.1, lit([96, 80, 64], f.n), 0.16);
    ctx.strokeStyle = rgb(lit([60, 48, 40], f.n)); ctx.lineWidth = 0.4; ctx.beginPath(); for (var sh = 0.1 + 0.9; sh < w - 0.1; sh += 0.9) wline(ctx, f, sh, 0.15, sh, y1 - 0.1, 0.17); ctx.stroke();
    if (!sp.low) wquad(ctx, f, 0.4, w - 0.4, y1 + 0.65, y1 + 1.5, lit([104, 86, 68], f.n), 0.06);
  }
  if (sp.udatsu && !S) udatsu(ctx, B, w, d, y1, yE);
  drawRoof(ctx, B, { W: w / 2 + 0.25, D: d / 2 + 0.85, yE: yE - 0.45, s: 0.5, type: 'gable', mat: 'kawara', seed: sp.seed, noOni: sp.joinL && sp.joinR, col: sp.roofCol });
  if (sp.roofSign && !S) roofSign(ctx, B, w, d, yE);
}
/* udatsu: raised plaster firewalls at the ends of the upper storey, each with a small tiled cap */
function udatsu(ctx, B, w, d, y1, yE) {
  [-1, 1].forEach(function (sg) {
    var a = sg * (w / 2 - 0.12), b0 = -d / 2 - 0.55, b1 = -d / 2 + 0.6, y0 = y1 + 0.5, yt = yE + 0.25;
    var Wf = wallOf(B, [a - 0.14, b0], [a + 0.14, b0], y0, yt), Ws = sg > 0 ? wallOf(B, [a + 0.14, b0], [a + 0.14, b1], y0, yt) : wallOf(B, [a - 0.14, b1], [a - 0.14, b0], y0, yt);
    if (Ws.vis) paintWall(ctx, Ws, MAT.plaster, { grime: 0, tex: 0.3 });
    paintWall(ctx, Wf, MAT.plaster, { grime: 0, tex: 0.3 });
    var Bc = BF(B.L(a, (b0 + b1) / 2, 0)[0], B.L(a, (b0 + b1) / 2, 0)[2], [B.v[0], B.v[1]], B.by);
    drawRoof(ctx, Bc, { W: (b1 - b0) / 2 + 0.15, D: 0.32, yE: yt - 0.05, s: 0.5, type: 'gable', mat: 'kawara', seed: 5, ridgeH: 0.18, noOni: true });
  });
}
/* a wooden signboard standing on the roof ridge */
function roofSign(ctx, B, w, d, yE) {
  var y0 = yE - 0.45 + 0.5 * (d / 2 + 0.85) - 0.3, Ws = wallOf(B, [-w * 0.3, -0.3], [w * 0.3, -0.3], y0, y0 + 1.1);
  if (!Ws.vis) return;
  wquad(ctx, Ws, 0, Ws.len, 0 + y0, y0 + 1.1, lit([52, 36, 28], Ws.n), 0);
  wquad(ctx, Ws, 0.12, Ws.len - 0.12, y0 + 0.12, y0 + 0.98, lit([74, 52, 38], Ws.n), 0.01);
  var k = Pa(Ws.c).k; ctx.strokeStyle = rgb(lit([226, 188, 96], Ws.n, { amb: 1.3 })); ctx.lineWidth = Math.max(0.35, 0.07 * k); ctx.lineCap = 'round';
  for (var i = 0; i < 3; i++) { var sx = Ws.len * (0.25 + i * 0.25); ctx.beginPath(); wline(ctx, Ws, sx - 0.18, y0 + 0.8, sx + 0.12, y0 + 0.78, 0.02); wline(ctx, Ws, sx, y0 + 0.85, sx - 0.05, y0 + 0.25, 0.02); wline(ctx, Ws, sx - 0.2, y0 + 0.5, sx + 0.2, y0 + 0.35, 0.02); ctx.stroke(); }
  ctx.lineCap = 'butt';
}
/* the merchant house at the bridge foot: wide, two storeys, udatsu, a signboard on the roof, namako on its side */
function drawShoka(ctx, sp) {
  drawMachiya(ctx, { x: sp.x, z: sp.z, u: sp.u, w: sp.w, d: sp.d, seed: sp.seed, yE: 5.6, udatsu: true, upper: 'mushiko', sign: true, roofSign: true, lat: [70, 50, 40], doorW: 2.4 });
  var B = BF(sp.x, sp.z, sp.u), Wl = boxWalls(B, sp.w, sp.d, 0, 5.4);
  [Wl.l, Wl.r].forEach(function (q) { if (q.vis && !sil()) namako(ctx, q, 0.1, q.len - 0.1, 0.1, 1.5); });
}
/* hatago: a two-storey inn with a railed upper floor, shoji and big lanterns at the door */
function drawInn(ctx, sp) {
  var B = BF(sp.x, sp.z, sp.u, 0), w = sp.w, d = sp.d, S = sil(), y1 = 3.1, yE = 6.2;
  var Wl = boxWalls(B, w, d, 0, yE - 0.1);
  [Wl.l, Wl.r].forEach(function (q) { if (!q.vis) return; paintWall(ctx, q, MAT.plasterOld, { gable: yE + 0.5 * d / 2 + 0.2, eave: 0.6, seed: 4 }); if (!S) { boards(ctx, q, 0, q.len, 0, 1.6); frameWall(ctx, q, [0.1, q.len * 0.33, q.len * 0.66, q.len - 0.1], [y1, yE - 0.4], MAT.woodD, 0.15); } });
  var f = Wl.f;
  if (f.vis) {
    paintWall(ctx, f, MAT.plasterOld, { eave: 0.7, seed: 6 });
    if (!S) {
      wquad(ctx, f, 0, w, 0, y1, lit([60, 44, 36], f.n), 0.01);
      lattice(ctx, f, 0.2, w * 0.36, 0.3, y1 - 0.2, { col: [80, 56, 42], out: 0.1, depth: true, lit: winOn(31) });
      doorway(ctx, f, w * 0.38, w * 0.62, 0, y1 - 0.3, winOn(32) || LIT.lit);
      lattice(ctx, f, w * 0.64, w - 0.2, 0.3, y1 - 0.2, { col: [80, 56, 42], out: 0.1, depth: true, lit: winOn(33) });
      frameWall(ctx, f, [0.08, w * 0.37, w * 0.63, w - 0.08], [y1], MAT.woodD, 0.18);
      // upper floor: shoji behind a wooden railing
      shoji(ctx, f, 0.3, w - 0.3, y1 + 0.75, yE - 0.55, { lit: winOn(34) || LIT.name === 'night' });
      var rl = lit([88, 64, 48], f.n), y2 = y1 + 0.95;
      wquad(ctx, f, 0.1, w - 0.1, y2 - 0.08, y2 + 0.06, rl, 0.55);
      ctx.strokeStyle = rgb(rl); ctx.lineWidth = 0.6; ctx.beginPath(); for (var s = 0.2; s < w; s += 0.45) wline(ctx, f, s, y1 + 0.6, s, y2, 0.55); ctx.stroke();
      wquad(ctx, f, 0, w, y1 + 0.55, y1 + 0.62, scl(rl, 0.8), 0.6);
      // signboard over the door
      wquad(ctx, f, w * 0.4, w * 0.6, y1 + 0.05, y1 + 0.5, lit([214, 196, 160], f.n), 0.75);
      var c0 = Pa(f.at(w / 2, y1 + 0.28, 0.76)); ctx.fillStyle = rgb(lit([40, 30, 26], f.n)); ctx.fillRect(c0.x - 0.4 * c0.k, c0.y - 0.05 * c0.k, 0.8 * c0.k, 0.1 * c0.k);
    }
    pentRoof(ctx, f, -0.05, w + 0.05, y1 + 0.55, 1.0, { mat: 'kawara', s: 0.4 });
  }
  drawRoof(ctx, B, { W: w / 2 + 0.5, D: d / 2 + 1.0, yE: yE - 0.5, s: 0.5, type: 'irimoya', bm: 1.2, mat: 'kawara', seed: 21 });
}
/* nagaya: a long single-storey row of small homes under a stone-weighted board roof */
function drawNagaya(ctx, sp) {
  var B = BF(sp.x, sp.z, sp.u, 0), n = sp.units, uw = 2.75, w = n * uw, d = 4.6, yE = 2.75, S = sil(), r = mulberry32(sp.seed);
  var Wl = boxWalls(B, w, d, 0, yE);
  [Wl.l, Wl.r].forEach(function (q) { if (!q.vis) return; paintWall(ctx, q, MAT.earth, { gable: yE + 0.45 * d / 2 + 0.1, eave: 0.45, seed: 9 }); if (!S) boards(ctx, q, 0, q.len, 0, 1.0, [92, 74, 58]); });
  var f = Wl.f;
  if (f.vis) {
    paintWall(ctx, f, MAT.earth, { eave: 0.55, seed: 10, streaks: true });
    if (!S) for (var i = 0; i < n; i++) {
      var s0 = i * uw, on = winOn(sp.seed * 7 + i);
      // a paper-panelled door, a small barred window
      shoji(ctx, f, s0 + 0.3, s0 + 1.2, 0, 1.8, { lit: on });
      wquad(ctx, f, s0 + 0.3, s0 + 1.2, 0, 0.55, lit([110, 86, 62], f.n), 0.035);
      lattice(ctx, f, s0 + 1.55, s0 + 2.45, 0.95, 1.75, { col: [96, 74, 54], out: 0.05, sp: 0.14, lit: winOn(sp.seed * 7 + i + 50) });
      frameWall(ctx, f, [s0 + 0.06], [], MAT.wood, 0.14);
      if (r() < 0.6) { var tp = f.at(s0 + 1.4 + r() * 0.8, 0, 0.35); drawPots(ctx, tp, r); }
    }
    if (!S) frameWall(ctx, f, [w - 0.06], [2.1], MAT.wood, 0.12);
  }
  drawRoof(ctx, B, { W: w / 2 + 0.25, D: d / 2 + 0.6, yE: yE - 0.2, s: 0.45, type: 'gable', mat: 'board', seed: sp.seed + 3, ridgeH: 0.22 });
}
/* potted plants by the door (morning glories climb strings in summer) */
function drawPots(ctx, p3, r) {
  if (sil()) return;
  var p = Pa(p3), k = p.k;
  ctx.fillStyle = rgb(mulc([120, 70, 50], lightTint(0.8))); ctx.beginPath(); ctx.moveTo(p.x - 0.18 * k, p.y - 0.3 * k); ctx.lineTo(p.x + 0.18 * k, p.y - 0.3 * k); ctx.lineTo(p.x + 0.13 * k, p.y); ctx.lineTo(p.x - 0.13 * k, p.y); ctx.closePath(); ctx.fill();
  var tint = lightTint(0.9), s = SEA;
  if (s.snow) { ctx.fillStyle = rgb(mulc(SNOW, tint)); ctx.beginPath(); ctx.ellipse(p.x, p.y - 0.32 * k, 0.2 * k, 0.07 * k, 0, 0, TAU); ctx.fill(); return; }
  var leaf = s.name === 'autumn' ? [120, 110, 50] : [52, 96, 40];
  for (var i = 0; i < 9; i++) { ctx.fillStyle = rgb(mulc(scl(leaf, 0.8 + r() * 0.5), tint)); ctx.beginPath(); ctx.arc(p.x + (r() - 0.5) * 0.4 * k, p.y - (0.35 + r() * 0.3) * k, 0.08 * k, 0, TAU); ctx.fill(); }
  if (s.name === 'summer') { // asagao up a string
    ctx.strokeStyle = rgb(mulc([60, 100, 44], tint)); ctx.lineWidth = Math.max(0.3, 0.025 * k); ctx.beginPath(); ctx.moveTo(p.x, p.y - 0.4 * k); ctx.lineTo(p.x + 0.1 * k, p.y - 1.6 * k); ctx.stroke();
    for (i = 0; i < 6; i++) { var yy = p.y - (0.5 + r() * 1.1) * k, xx = p.x + (r() - 0.3) * 0.3 * k; ctx.fillStyle = rgb(mulc([56, 100, 40], tint)); ctx.beginPath(); ctx.arc(xx, yy, 0.07 * k, 0, TAU); ctx.fill(); if (r() < 0.6) { ctx.fillStyle = rgb(mulc(r() < 0.5 ? [80, 90, 200] : [190, 70, 150], tint)); ctx.beginPath(); ctx.arc(xx + 0.06 * k, yy - 0.03 * k, 0.07 * k, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc([250, 246, 250], tint)); ctx.beginPath(); ctx.arc(xx + 0.06 * k, yy - 0.03 * k, 0.025 * k, 0, TAU); ctx.fill(); } }
  }
}
/* dozo: a storehouse of thick white plaster with a namako skirt and a heavy tiled roof */
function drawKura(ctx, sp) {
  var B = BF(sp.x, sp.z, sp.u, 0), w = sp.w, d = sp.d, yE = sp.h || 6.2, S = sil();
  var Wl = boxWalls(B, w, d, 0, yE);
  [Wl.f, Wl.r, Wl.l, Wl.b].forEach(function (q) {
    if (!q.vis) return;
    var gb = q === Wl.l || q === Wl.r ? yE + 0.55 * (d / 2 + 0.2) : 0;
    paintWall(ctx, q, MAT.plaster, { gable: gb || undefined, grime: 0.18, eave: 0.35, seed: sp.seed, tex: 0.28 });
    if (S) return;
    namako(ctx, q, 0, q.len, 0, 1.7);
    wquad(ctx, q, 0, q.len, 1.7, 1.86, lit([236, 232, 222], q.n), 0.06);
    if (q === Wl.f || (q === Wl.l || q === Wl.r) && sp.sideWin) {
      // a small window with heavy plaster shutters, high up
      var ws = q.len / 2, on = winOn(sp.seed + 2) && LIT.name === 'night' && sp.seed % 3 === 0;
      wquad(ctx, q, ws - 0.55, ws + 0.55, yE - 2.2, yE - 1.2, on ? scl(WIN_ON, 0.8) : [30, 26, 26], 0.02);
      wquad(ctx, q, ws - 1.05, ws - 0.55, yE - 2.25, yE - 1.15, lit([226, 222, 212], q.n), 0.1);
      wquad(ctx, q, ws + 0.55, ws + 1.05, yE - 2.25, yE - 1.15, lit([226, 222, 212], q.n), 0.1);
      pentRoof(ctx, q, ws - 1.0, ws + 1.0, yE - 1.0, 0.45, { mat: 'kawara', s: 0.5 });
    }
    if (q === Wl.f && sp.door) { wquad(ctx, q, q.len / 2 - 0.7, q.len / 2 + 0.7, 0, 2.2, lit([40, 34, 32], q.n), 0.08); wquad(ctx, q, q.len / 2 - 1.2, q.len / 2 - 0.7, 0, 2.3, lit([224, 220, 210], q.n), 0.15); }
  });
  drawRoof(ctx, B, { W: w / 2 + 0.4, D: d / 2 + 0.5, yE: yE - 0.1, s: 0.55, type: 'gable', mat: 'kawara', seed: sp.seed + 1, ridgeH: 0.45 });
}
/* ---------------- shopfront details ---------------- */
/* 犬矢来: a curved bamboo guard leaning against the foot of a wall */
function inuyarai(ctx, W0, s0, s1) {
  if (!W0.vis || sil()) return;
  var N = 4, col = SEA.snow ? [210, 214, 222] : [158, 128, 84], prof = [];
  for (var i = 0; i <= N; i++) { var t = i / N; prof.push([0.5 * Math.pow(1 - t, 1.7) + 0.02, 0.85 * t]); }
  for (i = 0; i < N; i++) {
    var a = prof[i], b = prof[i + 1], ny = (a[0] - b[0]) / 0.85, nrm = norm(add(mul(W0.n, 1), [0, ny * 1.4, 0]));
    fillPts(ctx, [W0.at(s0, a[1], a[0]), W0.at(s1, a[1], a[0]), W0.at(s1, b[1], b[0]), W0.at(s0, b[1], b[0])], shade(col, nrm), 0.3);
  }
  var p0 = Pa(W0.at(s0, 0, 0.5)), p1 = Pa(W0.at(s1, 0, 0.5)), n = Math.max(3, Math.min(Math.round((s1 - s0) / 0.09), Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y) * KS / 2.2)));
  ctx.strokeStyle = rgb(shade(scl(col, 0.62), W0.n), 0.8); ctx.lineWidth = 0.3; ctx.beginPath();
  for (i = 0; i <= n; i++) { var s = lerp(s0, s1, i / n), q = null; for (var j = 0; j <= N; j++) { var pp = Pa(W0.at(s, prof[j][1], prof[j][0] + 0.005)); if (j) ctx.lineTo(pp.x, pp.y); else ctx.moveTo(pp.x, pp.y); } }
  ctx.stroke();
}
/* a shop sign board standing on the pent roof, three brushed characters */
function eaveSign(ctx, W0, s0, s1, y, seed) {
  if (!W0.vis || sil()) return;
  var r = mulberry32(seed), dark = r() < 0.6, board = dark ? [52, 38, 30] : [214, 196, 150], ink = dark ? [226, 196, 120] : [40, 30, 26];
  wquad(ctx, W0, s0 - 0.06, s1 + 0.06, y - 0.06, y + 0.62, lit([40, 30, 24], W0.n), 0.62);
  wquad(ctx, W0, s0, s1, y, y + 0.56, lit(board, W0.n, { amb: 1.1 }), 0.64);
  var c = Pa(W0.at((s0 + s1) / 2, y + 0.28, 0.66)), k = c.k, n = 3, w = (s1 - s0) / n;
  ctx.strokeStyle = rgb(lit(ink, W0.n, { amb: 1.25 })); ctx.lineWidth = Math.max(0.3, 0.05 * k); ctx.lineCap = 'round'; ctx.beginPath();
  for (var i = 0; i < n; i++) { var sm = s0 + (i + 0.5) * w; wline(ctx, W0, sm - w * 0.25, y + 0.42, sm + w * 0.22, y + 0.4, 0.665); wline(ctx, W0, sm, y + 0.47, sm - w * 0.05, y + 0.1, 0.665); if (r() < 0.6) wline(ctx, W0, sm - w * 0.22, y + 0.22, sm + w * 0.25, y + 0.15, 0.665); }
  ctx.stroke(); ctx.lineCap = 'butt';
}
/* 提灯: a paper lantern hanging under the eaves (lit at dusk and night) */
function chochin(ctx, p3, col, k0) {
  if (sil()) return;
  var p = Pa(p3), k = p.k * (k0 || 1), on = LIT.lit, tint = lightTint(0.9);
  ctx.strokeStyle = rgb(mulc([50, 40, 34], tint)); ctx.lineWidth = Math.max(0.25, 0.02 * k); ctx.beginPath(); ctx.moveTo(p.x, p.y - 0.36 * k); ctx.lineTo(p.x, p.y - 0.25 * k); ctx.stroke();
  ctx.fillStyle = on ? (col[0] > 180 && col[1] < 120 ? 'rgb(255,150,90)' : 'rgb(255,226,170)') : rgb(mulc(col, tint)); ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.15 * k, 0.24 * k, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(mulc([40, 32, 30], on ? [1, 1, 1] : tint)); ctx.fillRect(p.x - 0.09 * k, p.y - 0.27 * k, 0.18 * k, 0.05 * k); ctx.fillRect(p.x - 0.09 * k, p.y + 0.22 * k, 0.18 * k, 0.05 * k);
  if (!on) { ctx.strokeStyle = rgb(mulc(scl(col, 0.8), tint)); ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(p.x - 0.14 * k, p.y); ctx.lineTo(p.x + 0.14 * k, p.y); ctx.stroke(); }
  if (on) addGlow(p, 5.5, 0.5, true);
}
/* 床几: a low bench with a red felt cover */
function bench(ctx, W0, s, out, len) {
  var B = BF(W0.at(s, 0, out)[0], W0.at(s, 0, out)[2], [W0.at(1, 0, 0)[0] - W0.at(0, 0, 0)[0], W0.at(1, 0, 0)[2] - W0.at(0, 0, 0)[2]], 0);
  [-len / 2 + 0.1, len / 2 - 0.1].forEach(function (a) { postIn(ctx, B, a, 0, 0, 0.42, 0.035, [90, 70, 52]); });
  boxIn(ctx, B, -len / 2, len / 2, -0.28, 0.28, 0.42, 0.48, [178, 44, 36], [196, 50, 40]);
}
/* a few pots of plants along a wall (asagao climbs in summer) */
function potRow(ctx, W0, s0, s1, seed) {
  var r = mulberry32(seed); for (var s = s0; s < s1; s += 0.45 + r() * 0.3) drawPots(ctx, W0.at(s, 0, 0.35 + r() * 0.15), r);
}
/* the back of a townhouse: plaster over boards, a barred window, a kitchen door */
function houseBack(ctx, Wb, wallC, seed, y1) {
  if (!Wb.vis) return;
  paintWall(ctx, Wb, wallC, { eave: 0.5, seed: seed + 7, tex: 0.35, streaks: true });
  if (sil()) return;
  var L = Wb.len, r = mulberry32(seed + 11);
  boards(ctx, Wb, 0, L, 0, 1.25, [74, 58, 46]);
  var d0 = 0.5 + r() * (L - 2.2); doorway(ctx, Wb, d0, d0 + 0.8, 0, 1.75, winOn(seed + 21));
  var w0 = d0 > L / 2 ? 0.5 : L - 1.6; lattice(ctx, Wb, w0, w0 + 1.0, 1.35, 2.05, { col: [96, 74, 54], out: 0.04, sp: 0.12, lit: winOn(seed + 22) });
  frameWall(ctx, Wb, [0.08, L - 0.08], [y1 || 2.4], MAT.woodD, 0.13);
}

/* ---- 04c_works.js ---- */
/* ================= bridges, river works ================= */
function bridgeFrame() { return BF(BR.x, BR.z, BR.ax, 0); }
/* the humble plank bridge on wooden piles (before the stone bridge) */
function drawPlankBridge(ctx) {
  var B = bridgeFrame(), L = 17, w = 2.2, S = sil(), y = function (a) { return 0.55 + 0.35 * Math.cos(a / L * Math.PI); };
  var wood = [120, 96, 70];
  for (var a = -6; a <= 6.1; a += 3) [-1, 1].forEach(function (sg) { var p = B.L(a, sg * (w / 2 - 0.15), 0); prism(ctx, p[0], p[2], WL - 0.4, y(a) - 0.05, 0.1, 0.1, 6, 0, [86, 70, 54], { snow: 0 }); });
  var N = 16, i, near = [], far = [];
  for (i = 0; i <= N; i++) { var aa = -L / 2 + L * i / N; near.push(B.L(aa, -w / 2, y(aa))); far.push(B.L(aa, w / 2, y(aa))); }
  for (i = 0; i < N; i++) {
    var n = norm(cross(sub(near[i + 1], near[i]), sub(far[i], near[i]))); if (n[1] < 0) n = mul(n, -1);
    var alb = mixc(wood, [150, 126, 96], hash2(i, 5)); if (SEA.snow) alb = mixc(alb, SNOW, 0.85);
    fillPts(ctx, [near[i], near[i + 1], far[i + 1], far[i]], S ? [0, 0, 0] : shade(alb, n), 0.4);
  }
  // side beam
  var top = near.map(Pa), bot = near.map(function (p) { return P(p[0], p[1] - 0.22, p[2]); });
  poly(ctx, top.concat(bot.slice().reverse())); ctx.fillStyle = S ? '#000' : rgb(shade([90, 70, 52], B.N(0, -1, 0))); ctx.fill();
  if (!S && !SEA.snow) { ctx.strokeStyle = 'rgba(50,36,26,0.5)'; ctx.lineWidth = 0.35; ctx.beginPath(); for (i = 1; i < N * 2; i++) { var a2 = -L / 2 + L * i / (N * 2), p0 = Pa(B.L(a2, -w / 2, y(a2))), p1 = Pa(B.L(a2, w / 2, y(a2))); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); } ctx.stroke(); }
}
/* the stone arch bridge: one wide arch, humped deck, stone parapets */
function drawStoneBridge(ctx) {
  var B = bridgeFrame(), L = BR.len, w = BR.w, S = sil(), st = [164, 158, 146], dk = [118, 112, 104];
  var span = 6.3, crown = 2.5, deckH = function (a) { var u = clamp(Math.abs(a) / (L / 2)); return 0.1 + 3.25 * Math.pow(Math.cos(u * Math.PI / 2), 1.25); };
  var archY = function (a) { var u = a / span; return u * u >= 1 ? WL - 0.3 : WL - 0.3 + (crown - WL + 0.3) * Math.sqrt(1 - u * u); };
  var N = 40, i;
  function edge(b, dy) { var out = []; for (var k = 0; k <= N; k++) { var a = -L / 2 + L * k / N; out.push(B.L(a, b, deckH(a) + (dy || 0))); } return out; }
  function arch(b) { var out = []; for (var k = 0; k <= 24; k++) { var a = -span + 2 * span * k / 24; out.push(B.L(a, b, archY(a))); } return out; }
  var nF = B.N(0, -1, 0), nB = B.N(0, 1, 0);
  // far side: the soffit seen through the arch
  if (!S) {
    var aF = arch(w / 2).map(Pa), aN = arch(-w / 2).map(Pa);
    poly(ctx, aN.concat(aF.slice().reverse())); ctx.fillStyle = rgb(scl(shade(dk, [0, -1, 0], { amb: 1.4 }), 0.75)); ctx.fill();
    ctx.strokeStyle = 'rgba(20,18,18,0.4)'; ctx.lineWidth = 0.35; ctx.beginPath(); for (i = 1; i < 6; i++) { var f = i / 6; aN.forEach(function (p, k) { var q = aF[k], x = lerp(p.x, q.x, f), y = lerp(p.y, q.y, f); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); } ctx.stroke();
  }
  // far parapet
  var fp = edge(w / 2 - 0.15), fpt = edge(w / 2 - 0.15, 0.75);
  poly(ctx, fp.map(Pa).concat(fpt.map(Pa).reverse())); ctx.fillStyle = S ? '#000' : rgb(shade(st, nF, { amb: 1.05 })); ctx.fill();
  // deck
  var dn = edge(-w / 2), df = edge(w / 2);
  for (i = 0; i < N; i++) {
    var n = norm(cross(sub(dn[i + 1], dn[i]), sub(df[i], dn[i]))); if (n[1] < 0) n = mul(n, -1);
    var alb = mixc([170, 164, 152], [150, 144, 132], hash2(i, 7)); if (SEA.snow) alb = mixc(alb, SNOW, 0.8);
    fillPts(ctx, [dn[i], dn[i + 1], df[i + 1], df[i]], S ? [0, 0, 0] : shade(alb, n), 0.45);
  }
  if (!S && !SEA.snow) { ctx.strokeStyle = 'rgba(70,64,58,0.45)'; ctx.lineWidth = 0.35; ctx.beginPath(); for (i = 1; i < N; i += 1) { var p0 = Pa(dn[i]), p1 = Pa(df[i]); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); } ctx.stroke(); }
  // near spandrel with the arch opening
  var top = edge(-w / 2).map(Pa), bottom = [];
  var a0 = B.L(-L / 2, -w / 2, -0.4), a1 = B.L(L / 2, -w / 2, -0.4);
  var hole = arch(-w / 2).map(Pa);
  var path = new Path2D(); top.forEach(function (p, k) { if (k) path.lineTo(p.x, p.y); else path.moveTo(p.x, p.y); });
  var e1 = Pa(a1), e0 = Pa(a0); path.lineTo(e1.x, e1.y); path.lineTo(hole[hole.length - 1].x, Pa(B.L(span, -w / 2, WL - 0.3)).y);
  for (i = hole.length - 1; i >= 0; i--) path.lineTo(hole[i].x, hole[i].y);
  path.lineTo(e0.x, e0.y); path.closePath();
  ctx.fillStyle = S ? '#000' : rgb(shade(st, nF)); ctx.fill(path);
  if (!S) {
    ctx.save(); ctx.clip(path);
    // stone courses and joints
    var k0 = Pa(B.L(0, -w / 2, 1)).k; ctx.strokeStyle = rgb(scl(shade(st, nF), 0.7)); ctx.lineWidth = Math.max(0.3, 0.04 * k0); ctx.beginPath();
    for (var yy = -0.4; yy < 3.6; yy += 0.42) { var r0 = Pa(B.L(-L / 2, -w / 2, yy)), r1 = Pa(B.L(L / 2, -w / 2, yy)); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); for (var xx = -L / 2 + (yy * 7 % 1.2); xx < L / 2; xx += 1.1) { var j0 = Pa(B.L(xx, -w / 2, yy)), j1 = Pa(B.L(xx, -w / 2, yy + 0.42)); ctx.moveTo(j0.x, j0.y); ctx.lineTo(j1.x, j1.y); } }
    ctx.stroke();
    // voussoirs
    ctx.strokeStyle = rgb(scl(shade(st, nF), 0.62)); ctx.lineWidth = Math.max(0.35, 0.05 * k0); ctx.beginPath();
    for (i = 0; i <= 18; i++) { var th = Math.PI * i / 18, ca = -Math.cos(th) * span, cy = WL - 0.3 + (crown - WL + 0.3) * Math.sin(th), m = 0.75, q0 = Pa(B.L(ca, -w / 2, cy)), q1 = Pa(B.L(ca * (1 + m / span), -w / 2, WL - 0.3 + (cy - WL + 0.3) * (1 + m / (crown - WL + 0.3)))); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); }
    ctx.stroke();
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.5; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // damp dark band at the waterline, moss
    var wl0 = Pa(B.L(0, -w / 2, WL)), wl1 = Pa(B.L(0, -w / 2, WL + 1.0)), gg = ctx.createLinearGradient(0, wl0.y, 0, wl1.y); gg.addColorStop(0, 'rgba(40,52,40,0.55)'); gg.addColorStop(1, 'rgba(40,52,40,0)'); ctx.fillStyle = gg; ctx.fillRect(0, wl1.y, W, wl0.y - wl1.y + 3);
    ctx.restore();
    ctx.strokeStyle = rgb(scl(shade(st, nF), 0.5)); ctx.lineWidth = 0.6; ctx.beginPath(); hole.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
  }
  // near parapet: low stone rail with posts
  var np = edge(-w / 2 + 0.12), npt = edge(-w / 2 + 0.12, 0.72);
  poly(ctx, np.map(Pa).concat(npt.map(Pa).reverse())); ctx.fillStyle = S ? '#000' : rgb(shade(mixc(st, [190, 184, 172], 0.4), nF)); ctx.fill();
  if (!S) {
    var tp = npt.map(Pa); ctx.strokeStyle = SEA.snow ? rgb(shade(SNOW, [0, 1, 0])) : rgb(shade([196, 190, 178], [0, 1, -0.3])); ctx.lineWidth = SEA.snow ? 1.2 : 0.7; ctx.beginPath(); tp.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y - (SEA.snow ? 0.4 : 0)); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
    ctx.strokeStyle = rgb(scl(shade(st, nF), 0.6)); ctx.lineWidth = 0.4; ctx.beginPath(); for (i = 0; i <= N; i += 4) { ctx.moveTo(tp[i].x, tp[i].y); var bq = Pa(np[i]); ctx.lineTo(bq.x, bq.y); } ctx.stroke();
    // giboshi finials at the ends
    [0, N].forEach(function (ix) { var q = npt[ix], b = Pa(q), t = P(q[0], q[1] + 0.35, q[2]); ctx.fillStyle = rgb(shade([150, 120, 60], [0, 0.5, -1], { amb: 1.2 })); ctx.beginPath(); ctx.ellipse(t.x, t.y, 0.14 * t.k, 0.2 * t.k, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(shade(st, nF)); ctx.lineWidth = 0.12 * t.k; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke(); });
  }
}
/* stone embankment faces along a stretch of bank (the face toward the water) */
function drawRevetment(ctx, pts) {
  var S = sil(), st = [150, 146, 136];
  for (var i = 0; i < pts.length - 1; i++) {
    var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), n = norm([dz / l, 0, -dx / l]);
    var q = [[a[0], WL - 0.2, a[1]], [b[0], WL - 0.2, b[1]], [b[0], 0.15, b[1]], [a[0], 0.15, a[1]]];
    if (!faceVisible(centroid(q), n) && MODE === 'n') continue;
    var pp = fillPts(ctx, q, S ? [0, 0, 0] : shade(st, n), 0.4);
    if (S) continue;
    ctx.save(); poly(ctx, pp); ctx.clip(); ctx.strokeStyle = rgb(scl(shade(st, n), 0.62)); ctx.lineWidth = 0.35; ctx.beginPath();
    var r = mulberry32(i + 40);
    for (var y = WL; y < 0.2; y += 0.32) { var p0 = P(a[0], y, a[1]), p1 = P(b[0], y, b[1]); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); for (var f = r() * 0.15; f < 1; f += 0.12 + r() * 0.06) { var j0 = P(lerp(a[0], b[0], f), y, lerp(a[1], b[1], f)), j1 = P(lerp(a[0], b[0], f), y + 0.32, lerp(a[1], b[1], f)); ctx.moveTo(j0.x, j0.y); ctx.lineTo(j1.x, j1.y); } }
    ctx.stroke(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.45; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

/* ---- 04d_country.js ---- */
/* ================= the countryside ================= */
/* a box on the ground in a frame (benches, steps, piles of things) */
function boxIn(ctx, B, a0, a1, b0, b1, y0, y1, alb, top) {
  var faces = [
    { p: [B.L(a0, b0, y0), B.L(a1, b0, y0), B.L(a1, b0, y1), B.L(a0, b0, y1)], n: B.N(0, -1, 0) },
    { p: [B.L(a1, b0, y0), B.L(a1, b1, y0), B.L(a1, b1, y1), B.L(a1, b0, y1)], n: B.N(1, 0, 0) },
    { p: [B.L(a1, b1, y0), B.L(a0, b1, y0), B.L(a0, b1, y1), B.L(a1, b1, y1)], n: B.N(0, 1, 0) },
    { p: [B.L(a0, b1, y0), B.L(a0, b0, y0), B.L(a0, b0, y1), B.L(a0, b1, y1)], n: B.N(-1, 0, 0) },
    { p: [B.L(a0, b0, y1), B.L(a1, b0, y1), B.L(a1, b1, y1), B.L(a0, b1, y1)], n: [0, 1, 0], top: true }
  ];
  faces.forEach(function (f) { if (!faceVisible(centroid(f.p), f.n) && MODE !== 's') return; fillPts(ctx, f.p, sil() ? [0, 0, 0] : shade(snowAlb(f.top && top ? top : alb, f.n[1]), f.n), 0.35); });
}
/* a post standing in a frame */
function postIn(ctx, B, a, b, y0, y1, r, alb) { var p = B.L(a, b, 0); prism(ctx, p[0], p[2], y0, y1, r, r, 6, 0.4, alb, { snow: 0 }); }

/* 茶屋: a small thatched tea house with a red-felt bench and a parasol */
function teaFrame() { return BF(TEA.x, TEA.z, TEA.u, 0); }
function drawTeahouse(ctx) {
  var B = teaFrame(), w = 5.6, d = 4.2, yE = 2.5, S = sil();
  var Wl = boxWalls(B, w, d, 0, yE);
  [Wl.l, Wl.r].forEach(function (q) { if (!q.vis) return; paintWall(ctx, q, MAT.earth, { gable: yE + 0.9 * (d / 2), eave: 0.4, seed: 12 }); if (!S) { boards(ctx, q, 0, q.len, 0, 0.9, [96, 76, 56]); frameWall(ctx, q, [0.08, q.len - 0.08], [], MAT.wood, 0.13); } });
  var f = Wl.f;
  if (f.vis) {
    paintWall(ctx, f, MAT.earth, { eave: 0.5, seed: 13 });
    if (!S) {
      var on = LIT.lit;
      wquad(ctx, f, 0.25, w - 0.25, 0, yE - 0.3, on ? scl(WIN_ON, 0.7) : [40, 32, 28], 0.01);            // the open front
      if (on) addGlow(Pa(f.at(w / 2, 1.1)), 14, 0.7, true);
      // reed blinds rolled half down, a counter, shelves
      wquad(ctx, f, 0.3, w - 0.3, yE - 0.95, yE - 0.3, lit([170, 146, 96], f.n), 0.05);
      ctx.strokeStyle = rgb(lit([120, 100, 66], f.n)); ctx.lineWidth = 0.3; ctx.beginPath(); for (var y = yE - 0.9; y < yE - 0.3; y += 0.08) wline(ctx, f, 0.3, y, w - 0.3, y, 0.06); ctx.stroke();
      boxIn(ctx, B, -w / 2 + 0.3, w / 2 - 0.3, -d / 2 + 0.05, -d / 2 + 0.5, 0, 0.85, [110, 84, 60]);
      frameWall(ctx, f, [0.1, w / 2, w - 0.1], [], MAT.wood, 0.14);
    }
  }
  drawRoof(ctx, B, { W: w / 2 + 0.6, D: d / 2 + 0.8, yE: yE - 0.15, s: 0.9, type: 'irimoya', bm: 0.7, mat: 'thatch', seed: 33, ridgeH: 0.35 });
  // the bench in front, covered with red felt, and a big red parasol
  var bb = BF(B.L(0.2, -d / 2 - 2.0, 0)[0], B.L(0.2, -d / 2 - 2.0, 0)[2], TEA.u, 0);
  [-0.8, 0.8].forEach(function (a) { postIn(ctx, bb, a, 0, 0, 0.42, 0.05, [80, 60, 44]); });
  boxIn(ctx, bb, -1.0, 1.0, -0.35, 0.35, 0.42, 0.5, [176, 40, 34], SEA.snow ? null : [190, 44, 36]);
  if (!SEA.snow) {
    var pp = B.L(-w / 2 + 0.6, -d / 2 - 2.1, 0);
    prism(ctx, pp[0], pp[2], 0, 2.5, 0.04, 0.04, 6, 0, [90, 70, 50], { snow: 0 });
    prism(ctx, pp[0], pp[2], 2.05, 2.55, 1.35, 0.05, 18, 0.1, [196, 50, 40], { snow: 0 });
    if (!S) { var cpt = P(pp[0], 2.05, pp[2]), rx = 1.35 * cpt.k; ctx.strokeStyle = 'rgba(80,20,16,0.5)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.ellipse(cpt.x, cpt.y, rx, rx * CAM.s * 0.95, 0, 0, Math.PI); ctx.stroke(); }
  }
}
/* 井戸: a stone well curb with a little roof, a pulley and a bucket */
function drawWell(ctx) {
  var x = WELL.x, z = WELL.z, S = sil(), st = [148, 144, 136];
  var curb = prism(ctx, x, z, 0, 0.72, 0.62, 0.6, 16, 0, st, { tex: 0.5 });
  if (!S) { var c = P(x, 0.72, z), r = 0.5 * c.k; ctx.fillStyle = SEA.snow ? 'rgb(40,48,56)' : 'rgb(24,30,32)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * CAM.s * 0.95, 0, 0, TAU); ctx.fill(); }
  var B = BF(x, z, [1, 0], 0);
  [-0.85, 0.85].forEach(function (a) { postIn(ctx, B, a, 0, 0, 2.2, 0.06, [96, 76, 56]); });
  var pu = P(x, 1.95, z); if (!S) { ctx.strokeStyle = 'rgb(70,56,44)'; ctx.lineWidth = Math.max(0.5, 0.06 * pu.k); ctx.beginPath(); var l = P(x - 0.85, 1.95, z), rr = P(x + 0.85, 1.95, z); ctx.moveTo(l.x, l.y); ctx.lineTo(rr.x, rr.y); ctx.stroke(); ctx.fillStyle = 'rgb(60,48,40)'; ctx.beginPath(); ctx.arc(pu.x, pu.y, 0.12 * pu.k, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(200,180,140,0.8)'; ctx.lineWidth = 0.3; var bk = P(x + 0.12, 0.95, z); ctx.beginPath(); ctx.moveTo(pu.x + 0.1 * pu.k, pu.y); ctx.lineTo(bk.x, bk.y); ctx.stroke(); }
  prism(ctx, x + 0.12, z, 0.72, 1.0, 0.13, 0.15, 10, 0, [120, 92, 64], { snow: 0 });
  drawRoof(ctx, B, { W: 1.25, D: 0.85, yE: 2.15, s: 0.55, type: 'gable', mat: 'board', seed: 9, ridgeH: 0.14 });
  // a wooden bucket and a trough beside it
  if (!S) { prism(ctx, x - 0.95, z - 0.55, 0, 0.35, 0.2, 0.22, 10, 0, [126, 98, 70], { snow: 0 }); }
}
/* 道標: a stone signpost at the fork, with a little jizo in a red bib beside it */
function drawSignpost(ctx) {
  var x = SIGN.x, z = SIGN.z, S = sil(), st = [156, 150, 138];
  var pr = prism(ctx, x, z, 0, 1.45, 0.17, 0.16, 4, Math.PI / 4 + 0.35, st, { tex: 0.5 });
  prism(ctx, x, z, 1.45, 1.6, 0.16, 0.02, 4, Math.PI / 4 + 0.35, st);
  if (!S) pr.out.forEach(function (q) { var f = q.f; if (f.top || Math.abs(f.n[1]) > 0.5) return; var A = f.pts, pa = Pa(mixc(mixc(A[0], A[1], 0.5), mixc(A[3], A[2], 0.5), 0.86)), pb = Pa(mixc(mixc(A[0], A[1], 0.5), mixc(A[3], A[2], 0.5), 0.25)); ctx.strokeStyle = 'rgba(40,36,34,0.75)'; ctx.lineWidth = Math.max(0.3, 0.035 * pa.k); ctx.beginPath(); for (var i = 0; i < 6; i++) { var t = i / 6, y = lerp(pa.y, pb.y, t); ctx.moveTo(pa.x - 0.04 * pa.k, y); ctx.lineTo(pa.x + 0.04 * pa.k, y + 0.03 * pa.k); } ctx.stroke(); });
  // jizo: a rounded stone figure with a red bib and a little stone cap
  var jx = x + 0.75, jz = z + 0.25;
  prism(ctx, jx, jz, 0, 0.25, 0.3, 0.28, 8, 0, [140, 136, 128]);
  prism(ctx, jx, jz, 0.25, 0.85, 0.2, 0.17, 10, 0, [168, 162, 150]);
  if (!S) {
    var h = P(jx, 0.97, jz), b = P(jx, 0.62, jz), k = h.k; ctx.fillStyle = rgb(shade([170, 164, 152], [0.3, 0.6, -0.7])); ctx.beginPath(); ctx.arc(h.x, h.y, 0.14 * k, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(shade([196, 46, 36], [0, 0.4, -1])); ctx.beginPath(); ctx.moveTo(b.x - 0.19 * k, b.y - 0.12 * k); ctx.lineTo(b.x + 0.19 * k, b.y - 0.12 * k); ctx.lineTo(b.x, b.y + 0.14 * k); ctx.closePath(); ctx.fill();
    if (SEA.snow) { ctx.fillStyle = rgb(mulc(SNOW, lightTint(1))); ctx.beginPath(); ctx.ellipse(h.x, h.y - 0.1 * k, 0.14 * k, 0.06 * k, 0, 0, TAU); ctx.fill(); }
  }
}
/* 農家: a farmhouse under a deep, steep thatched hip-and-gable roof */
function farmFrame() { return BF(FARM.x, FARM.z, [1, 0.08], 0); }
function drawFarm(ctx) {
  var B = farmFrame(), w = 11.5, d = 7.6, yE = 2.7, S = sil();
  var Wl = boxWalls(B, w, d, 0, yE);
  [Wl.l, Wl.r].forEach(function (q) { if (!q.vis) return; paintWall(ctx, q, MAT.earth, { eave: 0.5, seed: 14, streaks: true }); if (!S) { boards(ctx, q, 0, q.len, 0, 1.0, [86, 68, 52]); frameWall(ctx, q, [0.1, q.len / 2, q.len - 0.1], [1.9], MAT.woodD, 0.16); } });
  var f = Wl.f;
  if (f.vis) {
    paintWall(ctx, f, MAT.earth, { eave: 0.7, seed: 15 });
    if (!S) {
      var on = winOn(41);
      doorway(ctx, f, 0.7, 2.6, 0, 2.15, LIT.lit);                       // the earthen-floored entrance (doma)
      shoji(ctx, f, 3.3, 7.7, 0.55, 2.15, { lit: on });
      shoji(ctx, f, 8.3, w - 0.6, 0.55, 2.15, { lit: winOn(42) });
      frameWall(ctx, f, [0.1, 2.9, 5.5, 8.0, w - 0.1], [2.25], MAT.woodD, 0.18);
      boxIn(ctx, B, -w / 2 + 3.2, w / 2 - 0.3, -d / 2 - 0.85, -d / 2, 0, 0.5, [124, 96, 70]);      // the veranda
      // firewood stacked against the left side, a straw raincoat on a peg
      if (SEA.name === 'autumn' && F.prog >= 0.625) hoshigaki(ctx, f, [3.6, 4.3, 5.0, 8.6, 9.3]);   // persimmons drying under the eaves in November
      var wp = B.L(-w / 2 - 0.5, -1.5, 0); boxIn(ctx, BF(wp[0], wp[2], [0, 1], 0), -1.6, 1.6, -0.35, 0.35, 0, 1.2, [120, 92, 62], [150, 116, 80]);
    }
  }
  drawRoof(ctx, B, { W: w / 2 + 1.1, D: d / 2 + 1.1, yE: yE - 0.2, s: 0.98, type: 'irimoya', bm: 1.0, mat: 'thatch', seed: 44, ridgeH: 0.5 });
}
/* 水車小屋: a board mill hut with a flume feeding the wheel (the wheel itself turns in the overlay) */
function millFrame() { return BF(MILL.x, MILL.z, MILL.u, 0); }
function millWheelGeom() { var B = BF(MILL.wx, MILL.wz, MILL.u, 0); return { B: B, c: B.L(0, 0, MILL.wr - 0.55), r: MILL.wr, w: 0.7 }; }
function drawMill(ctx) {
  var B = millFrame(), w = 5, d = 4.4, yE = 2.5, S = sil();
  var Wl = boxWalls(B, w, d, 0, yE);
  [Wl.f, Wl.l, Wl.r].forEach(function (q) {
    if (!q.vis) return;
    paintWall(ctx, q, [104, 84, 64], { gable: q === Wl.f ? undefined : yE + 0.5 * d / 2, eave: 0.4, seed: 16, tex: 0.5 });
    if (S) return;
    ctx.strokeStyle = rgb(scl(lit([104, 84, 64], q.n), 0.6)); ctx.lineWidth = 0.35; ctx.beginPath(); for (var s = 0.25; s < q.len; s += 0.25) wline(ctx, q, s, 0, s, yE, 0.01); ctx.stroke();
    if (q === Wl.f) { doorway(ctx, q, 1.2, 2.4, 0, 1.9, LIT.name === 'night' && LIT.lit); lattice(ctx, q, 3.0, 4.3, 1.0, 1.7, { col: [80, 62, 46], out: 0.04, sp: 0.15 }); }
  });
  drawRoof(ctx, B, { W: w / 2 + 0.4, D: d / 2 + 0.6, yE: yE - 0.2, s: 0.5, type: 'gable', mat: 'board', seed: 18, ridgeH: 0.18 });
  // the axle housing and the flume on trestles from upstream
  var G = millWheelGeom(), Bw = G.B, c = G.c;
  [-0.55, 0.55].forEach(function (b) { var p = Bw.L(0, b, 0); prism(ctx, p[0], p[2], WL - 0.3, c[1] + 0.15, 0.09, 0.09, 6, 0.3, [76, 60, 46], { snow: 0 }); });
  var f0 = Bw.L(-1.2, -0.2, c[1] + G.r + 0.15), f1 = Bw.L(-6.5, -0.2, c[1] + G.r + 0.45);
  var fl = BF((f0[0] + f1[0]) / 2, (f0[2] + f1[2]) / 2, MILL.u, 0);
  [-2.2, 0.2, 2.2].forEach(function (a) { var pp = fl.L(a, 0, 0); prism(ctx, pp[0], pp[2], WL - 0.3, c[1] + G.r + 0.2, 0.06, 0.06, 6, 0, [80, 64, 48], { snow: 0 }); });
  boxIn(ctx, fl, -2.65, 2.65, -0.3, 0.3, c[1] + G.r + 0.15, c[1] + G.r + 0.55, [100, 80, 60], SEA.snow ? null : [90, 110, 120]);
}
/* 祠 and 鳥居: a small shrine in a cedar grove, a vermilion torii facing the path */
function drawHokora(ctx) {
  var B = BF(SHRINE.x, SHRINE.z, [1, -0.1], 0), S = sil();
  boxIn(ctx, B, -1.5, 1.5, -1.5, 1.5, 0, 0.55, [150, 146, 136]);
  boxIn(ctx, B, -1.1, 1.1, -1.1, 1.1, 0.55, 0.8, [140, 136, 126]);
  var Wl = boxWalls(B, 1.6, 1.5, 0.8, 2.1);
  [Wl.f, Wl.l, Wl.r].forEach(function (q) { if (!q.vis) return; paintWall(ctx, q, [120, 84, 58], { grime: 0, eave: 0.3, tex: 0.4 }); if (!S && q === Wl.f) { lattice(ctx, q, 0.2, 1.4, 1.0, 1.9, { col: [150, 50, 34], out: 0.03, sp: 0.1 }); wquad(ctx, q, 0.7, 0.9, 1.1, 1.6, [236, 232, 220], 0.06); } });
  drawRoof(ctx, B, { W: 1.35, D: 1.4, yE: 2.0, s: 0.75, type: 'gable', mat: SEA.snow ? 'bark' : 'copper', seed: 7, ridgeH: 0.16, noOni: true, col: [86, 140, 118] });
  if (!S) { // chigi crossed at the ridge ends
    [-1, 1].forEach(function (sg) { var a = Pa(B.L(sg * 1.3, 0, 3.05)), b = P.apply(null, B.L(sg * 1.45, 0, 3.55)), k = a.k; ctx.strokeStyle = rgb(shade([90, 60, 44], [0, 0.5, -1])); ctx.lineWidth = Math.max(0.4, 0.08 * k); ctx.beginPath(); ctx.moveTo(a.x - 0.2 * k, a.y); ctx.lineTo(b.x + 0.15 * k, b.y); ctx.moveTo(a.x + 0.2 * k, a.y); ctx.lineTo(b.x - 0.15 * k, b.y); ctx.stroke(); });
    // offerings: a pair of small stone foxes
    [-1, 1].forEach(function (sg) { var p = B.L(sg * 1.2, -2.0, 0); prism(ctx, p[0], p[2], 0, 0.4, 0.22, 0.2, 6, 0, [146, 142, 132]); prism(ctx, p[0], p[2], 0.4, 0.85, 0.12, 0.08, 6, 0, [196, 192, 182]); });
  }
}
function toriiFrame() { return BF(TORII.x, TORII.z, [1, 0.12], 0); }
function drawTorii(ctx) {
  var B = toriiFrame(), S = sil(), vm = [204, 62, 36], bk = [36, 30, 30], span = 1.45, h = 3.5;
  [-span, span].forEach(function (a) { var p = B.L(a, 0, 0); prism(ctx, p[0], p[2], 0, 0.25, 0.26, 0.24, 10, 0, bk, { snow: 0 }); prism(ctx, p[0], p[2], 0.25, h, 0.17, 0.15, 12, 0, vm, { snow: 0, tex: 0.3 }); });
  function beam(a0, a1, y0, y1, b, col, curve) {
    var N = 10, top = [], bot = [];
    for (var i = 0; i <= N; i++) { var f = i / N, a = lerp(a0, a1, f), lift = curve ? curve * Math.pow(Math.abs(f * 2 - 1), 2.4) : 0; top.push(B.L(a, b, y1 + lift)); bot.push(B.L(a, b, y0 + lift * 0.8)); }
    fillPts(ctx, top.concat(bot.reverse()), S ? [0, 0, 0] : shade(col, B.N(0, -1, 0.15)), 0.35);
    return top;
  }
  beam(-span - 0.55, span + 0.55, h - 0.95, h - 0.72, -0.05, vm);                        // nuki
  beam(-0.12, 0.12, h - 0.72, h - 0.18, -0.08, vm);                                         // gakuzuka
  beam(-span - 0.75, span + 0.75, h - 0.18, h + 0.12, -0.1, vm, 0.22);                    // shimaki
  var top = beam(-span - 0.95, span + 0.95, h + 0.12, h + 0.36, -0.12, bk, 0.36);         // kasagi
  if (!S) { // top surface of the kasagi, and snow on it
    var back = []; for (var i = 0; i <= 10; i++) { var f = i / 10, a = lerp(-span - 0.95, span + 0.95, f), lift = 0.36 * Math.pow(Math.abs(f * 2 - 1), 2.4); back.push(B.L(a, 0.18, h + 0.36 + lift)); }
    fillPts(ctx, top.slice().concat(back.reverse()), SEA.snow ? shade(SNOW, [0, 1, 0]) : shade(bk, [0, 1, 0]), 0.3);
  }
}
/* はさ掛け: rice hung to dry on pole racks (autumn) */
function drawHaza(ctx, x, z, len, ang) {
  var B = BF(x, z, [Math.cos(ang), Math.sin(ang)], 0), S = sil(), n = Math.round(len / 2.2);
  for (var i = 0; i <= n; i++) { var a = -len / 2 + len * i / n; postIn(ctx, B, a, 0, 0, 2.2, 0.05, [110, 92, 70]); }
  // the rack fills with sheaves as the harvest goes on (bottom rail first)
  var fill = F.prog === undefined ? 1 : F.prog < 0.125 ? 0.2 : F.prog < 0.375 ? 0.6 : 1;
  if (S) fill = 1;
  [1.0, 1.75].forEach(function (y, ri) {
    var fr = clamp(fill * 2 - ri); if (fr <= 0.05) return;
    var N = Math.max(2, Math.round(len * 3 * fr)), front = [], back = [], topL = [];
    for (var k = 0; k <= N; k++) { var a = -len / 2 + len * fr * k / N; topL.push(B.L(a, -0.02, y + 0.06)); front.push(B.L(a, -0.12, y - 0.62 - 0.05 * Math.sin(k * 2.1))); }
    var pp = topL.map(Pa).concat(front.map(Pa).reverse()); poly(ctx, pp); ctx.fillStyle = S ? '#000' : rgb(shade([196, 160, 72], B.N(0, -1, 0.3))); ctx.fill();
    if (S) return;
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgb(shade([140, 110, 50], B.N(0, -1, 0.3))); ctx.lineWidth = 0.35; ctx.beginPath();
    for (k = 0; k <= N; k++) { var t = Pa(topL[k]), b = Pa(front[k]); ctx.moveTo(t.x, t.y); ctx.lineTo(b.x + 0.2, b.y); }
    ctx.stroke(); ctx.restore();
  });
}

/* 干し柿: strings of peeled persimmons hung under the eaves to dry */
function hoshigaki(ctx, W0, at) {
  if (sil()) return;
  var lt = lightTint(0.8);
  at.forEach(function (s, j) {
    var top = Pa(W0.at(s, 2.45, 0.55)), k = top.k;
    ctx.strokeStyle = rgb(mulc([150, 130, 90], lt)); ctx.lineWidth = Math.max(0.25, 0.02 * k); ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x, top.y + 1.2 * k); ctx.stroke();
    for (var i = 0; i < 7; i++) { var y = top.y + (0.12 + i * 0.16) * k; ctx.fillStyle = rgb(mulc(i % 2 ? [200, 96, 30] : [214, 112, 36], lt)); ctx.beginPath(); ctx.ellipse(top.x, y, 0.07 * k, 0.065 * k, 0, 0, TAU); ctx.fill(); }
  });
}

/* ---- 04e_landmarks.js ---- */
/* ================= landmarks ================= */
/* a straight beam between two world points, drawn as a shaded strip of a given width (m) */
function beam3(ctx, a, b, wd, col) {
  var pa = Pa(a), pb = Pa(b), w = Math.max(0.35, wd * (pa.k + pb.k) / 2);
  ctx.strokeStyle = sil() ? '#000' : rgb(col); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
}
/* 火の見櫓: a timber fire-watch tower with a ladder, a railed platform, a little roof and an alarm bell */
function drawTower(ctx) {
  var B = BF(TOWER.x, TOWER.z, [1, 0.1], 0), H0 = 9.6, b0 = 1.45, b1 = 0.8, S = sil();
  var wood = shade([92, 70, 52], [0.3, 0.4, -0.8]), woodL = shade([120, 92, 66], [0.6, 0.4, -0.6]);
  function leg(sa, sb, y) { var f = y / H0, h = lerp(b0, b1, f); return B.L(sa * h, sb * h, y); }
  var legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
  ctx.lineCap = 'round';
  legs.forEach(function (q, i) { beam3(ctx, leg(q[0], q[1], 0), leg(q[0], q[1], H0 + 1.9), 0.2, i % 2 ? woodL : wood); });
  // braces on the front and the sunny side
  for (var y = 0; y < H0 - 0.5; y += 2.4) {
    [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[-1, 1], [-1, -1]]].forEach(function (pr) {
      var a0 = leg(pr[0][0], pr[0][1], y), a1 = leg(pr[1][0], pr[1][1], y + 2.4), c0 = leg(pr[1][0], pr[1][1], y), c1 = leg(pr[0][0], pr[0][1], y + 2.4);
      beam3(ctx, a0, a1, 0.08, wood); beam3(ctx, c0, c1, 0.08, wood); beam3(ctx, leg(pr[0][0], pr[0][1], y + 2.4), leg(pr[1][0], pr[1][1], y + 2.4), 0.1, woodL);
    });
  }
  // ladder up the front
  var l0 = B.L(-0.25, -b0 - 0.35, 0), l1 = B.L(-0.25, -b1 - 0.1, H0), r0 = B.L(0.25, -b0 - 0.35, 0), r1 = B.L(0.25, -b1 - 0.1, H0);
  beam3(ctx, l0, l1, 0.06, woodL); beam3(ctx, r0, r1, 0.06, woodL);
  if (!S) for (var k = 0.4; k < H0; k += 0.45) { var f = k / H0; beam3(ctx, mixc(l0, l1, f), mixc(r0, r1, f), 0.04, woodL); }
  // platform and railing
  boxIn(ctx, B, -b1 - 0.35, b1 + 0.35, -b1 - 0.35, b1 + 0.35, H0, H0 + 0.15, [110, 86, 64]);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q, i, arr) { var n = arr[(i + 1) % 4]; beam3(ctx, B.L(q[0] * (b1 + 0.35), q[1] * (b1 + 0.35), H0 + 0.95), B.L(n[0] * (b1 + 0.35), n[1] * (b1 + 0.35), H0 + 0.95), 0.07, woodL); });
  // the bell under the roof
  var bl = B.L(0, 0, H0 + 1.2); prism(ctx, bl[0], bl[2], H0 + 0.7, H0 + 1.3, 0.24, 0.16, 10, 0, [70, 56, 40], { snow: 0 });
  drawRoof(ctx, B, { W: b1 + 0.75, D: b1 + 0.75, yE: H0 + 1.85, s: 0.6, type: 'hip', mat: 'board', seed: 3, ridgeH: 0.12, noRidge: false });
  ctx.lineCap = 'butt';
}
/* a stone lantern (tōrō) */
function stoneLantern(ctx, x, z, s, lit2) {
  s = s || 1; var st = [146, 142, 132], O = { tex: 0.45 };
  prism(ctx, x, z, 0, 0.25 * s, 0.3 * s, 0.28 * s, 6, 0.3, st, O);
  prism(ctx, x, z, 0.25 * s, 1.0 * s, 0.1 * s, 0.09 * s, 10, 0, st, O);
  var fb = prism(ctx, x, z, 1.0 * s, 1.4 * s, 0.22 * s, 0.22 * s, 6, 0.3, st, O);
  if (lit2 && !sil()) { var c = P(x, 1.2 * s, z); ctx.fillStyle = rgb(LAMP_ON); ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(0.6, 0.08 * c.k), 0, TAU); ctx.fill(); addGlow(c, 10, 0.7, true); }
  prism(ctx, x, z, 1.4 * s, 1.58 * s, 0.42 * s, 0.12 * s, 6, 0.3, st, O);
  prism(ctx, x, z, 1.58 * s, 1.75 * s, 0.07 * s, 0, 8, 0, st, O);
  if (SEA.snow && !sil()) snowCap(ctx, x, 1.52 * s, z, 0.34 * s, 0.07 * s);
}
/* 寺: the main hall on a stone platform under a great hip-and-gable roof */
function templeFrame() { return BF(TEMPLE.x, TEMPLE.z, [1, -0.05], 0); }
function drawTemple(ctx) {
  var B = templeFrame(), w = 13, d = 10.5, S = sil(), yb = 1.0, yE = 5.2;
  boxIn(ctx, B, -w / 2 - 1.4, w / 2 + 1.4, -d / 2 - 1.6, d / 2 + 1.4, 0, yb, [156, 150, 138], [176, 170, 158]);
  // steps up to the hall
  for (var i = 0; i < 4; i++) boxIn(ctx, B, -1.6, 1.6, -d / 2 - 2.6 + i * 0.25, -d / 2 - 1.6, 0, yb * (i + 1) / 4, [150, 146, 136]);
  var Wl = boxWalls(B, w, d, yb, yE);
  [Wl.l, Wl.r, Wl.f].forEach(function (q) {
    if (!q.vis) return;
    paintWall(ctx, q, MAT.plaster, { eave: 1.0, grime: 0.12, tex: 0.3 });
    if (S) return;
    var n = q === Wl.f ? 5 : 4, bay = q.len / n;
    for (var b = 0; b < n; b++) {
      var s0 = b * bay;
      if (q === Wl.f) { // latticed doors, the middle ones open on to a lamp-lit interior
        var open = b === 2, on = LIT.lit && (open || b === 1 || b === 3);
        if (open) doorway(ctx, q, s0 + 0.2, s0 + bay - 0.2, yb, yE - 1.4, LIT.lit); else lattice(ctx, q, s0 + 0.2, s0 + bay - 0.2, yb + 0.1, yE - 1.4, { col: [96, 60, 44], out: 0.03, sp: 0.16, lit: on });
        wquad(ctx, q, s0 + 0.2, s0 + bay - 0.2, yE - 1.25, yE - 0.4, lit([210, 200, 180], q.n), 0.02);
      } else lattice(ctx, q, s0 + 0.4, s0 + bay - 0.4, yb + 1.0, yE - 1.6, { col: [96, 60, 44], out: 0.03, sp: 0.14 });
    }
    var posts = []; for (b = 0; b <= n; b++) posts.push(b * bay + (b === 0 ? 0.12 : b === n ? -0.12 : 0));
    frameWall(ctx, q, posts, [yE - 1.32, yE - 0.3], [104, 62, 44], 0.26);
  });
  drawRoof(ctx, B, { W: w / 2 + 2.3, D: d / 2 + 2.3, yE: yE + 0.2, s: 0.62, type: 'irimoya', bm: 2.2, mat: 'kawara', seed: 61, sori: 0.55, ridgeH: 0.5, gableCol: [70, 50, 40] });
  if (!S) { var lp = B.L(-3.2, -d / 2 - 3.6, 0), rp = B.L(3.2, -d / 2 - 3.6, 0); stoneLantern(ctx, lp[0], lp[2], 1.3, LIT.lit); stoneLantern(ctx, rp[0], rp[2], 1.3, LIT.lit); }
}
/* 鐘楼: an open bell tower */
function drawBelfry(ctx) {
  var B = BF(BELL.x, BELL.z, [1, -0.05], 0), S = sil(), h = 4.6;
  boxIn(ctx, B, -2.2, 2.2, -2.2, 2.2, 0, 0.9, [150, 146, 136], [170, 164, 152]);
  [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(function (q) { postIn(ctx, B, q[0], q[1], 0.9, h, 0.13, [110, 64, 46]); });
  [[-1, -1, 1, -1], [1, -1, 1, 1]].forEach(function (q) { beam3(ctx, B.L(q[0] * 1.5, q[1] * 1.5, h - 0.5), B.L(q[2] * 1.5, q[3] * 1.5, h - 0.5), 0.16, shade([110, 64, 46], [0.3, 0.3, -1])); });
  var c = B.L(0, 0, 0); prism(ctx, c[0], c[2], h - 2.3, h - 0.55, 0.62, 0.48, 16, 0, [74, 70, 58], { snow: 0, tex: 0.4 });
  prism(ctx, c[0], c[2], h - 0.55, h - 0.35, 0.48, 0.12, 12, 0, [74, 70, 58], { snow: 0 });
  drawRoof(ctx, B, { W: 2.9, D: 2.9, yE: h, s: 0.62, type: 'irimoya', bm: 0.9, mat: 'kawara', seed: 62, sori: 0.4, ridgeH: 0.3 });
}
/* 五重塔: a five-storey pagoda with deep upturned eaves and a bronze finial */
function drawPagoda(ctx) {
  var x = PAGODA.x, z = PAGODA.z, B = BF(x, z, [1, -0.05], 0), S = sil(), y = 0.9, half = 3.1;
  boxIn(ctx, B, -4, 4, -4, 4, 0, 0.9, [156, 150, 138], [170, 166, 154]);
  for (var t = 0; t < 5; t++) {
    var hw = half * (1 - t * 0.075), hh = t === 0 ? 2.6 : 1.55, Wl = boxWalls(B, hw * 2, hw * 2, y, y + hh);
    [Wl.f, Wl.r, Wl.l].forEach(function (q) {
      if (!q.vis) return;
      paintWall(ctx, q, [222, 214, 198], { grime: 0.05, tex: 0.3, eave: 0.6 });
      if (S) return;
      wquad(ctx, q, q.len * 0.36, q.len * 0.64, q.y0 + 0.1, q.y1 - 0.25, lit([128, 46, 34], q.n), 0.02);
      frameWall(ctx, q, [0.12, q.len * 0.33, q.len * 0.67, q.len - 0.12], [q.y1 - 0.2], [150, 52, 36], 0.22);
    });
    y += hh;
    drawRoof(ctx, B, { W: hw + 1.9, D: hw + 1.9, yE: y + 0.1, s: 0.42, type: 'hip', mat: 'kawara', seed: 70 + t, sori: 0.55, ridgeH: 0.18, noRidge: t < 4, noOni: true });
    y += 0.9;
  }
  // sōrin: the spire with its nine rings
  var c = B.L(0, 0, 0), top = y + 0.2;
  prism(ctx, c[0], c[2], top - 0.5, top + 0.2, 0.55, 0.45, 8, 0, [80, 76, 64], { snow: 0 });
  prism(ctx, c[0], c[2], top + 0.2, top + 5.2, 0.09, 0.07, 8, 0, [108, 96, 60], { snow: 0 });
  if (!S) for (var r = 0; r < 9; r++) { var p = P(c[0], top + 0.7 + r * 0.42, c[2]); ctx.fillStyle = rgb(shade([130, 112, 60], [0.4, 0.5, -0.7], { amb: 1.2 })); ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.32 * p.k * (1 - r * 0.03), 0.09 * p.k, 0, 0, TAU); ctx.fill(); }
  var tp = P(c[0], top + 5.3, c[2]); if (!S) { ctx.fillStyle = rgb(shade([150, 126, 64], [0.4, 0.5, -0.7], { amb: 1.3 })); ctx.beginPath(); ctx.arc(tp.x, tp.y, 0.22 * tp.k, 0, TAU); ctx.fill(); }
  if (!S && LIT.lit) addGlow(Pa(B.L(0, -half, 2.0)), 10, 0.5, false);
}
/* 芝居小屋: a theatre with a drum tower, painted boards and rows of lanterns */

function drawTheatre(ctx) {
  var B = theatreFrame(), w = 9.5, d = 11, yE = 6.8, y1 = 3.3, S = sil();
  var Wl = boxWalls(B, w, d, 0, yE);
  [Wl.l, Wl.r].forEach(function (q) { if (!q.vis) return; paintWall(ctx, q, [120, 100, 80], { gable: yE + 0.5 * (d / 2 + 0.6), eave: 0.6, seed: 71 }); if (!S) { ctx.strokeStyle = rgb(scl(lit([120, 100, 80], q.n), 0.62)); ctx.lineWidth = 0.35; ctx.beginPath(); for (var s = 0.3; s < q.len; s += 0.3) wline(ctx, q, s, 0, s, yE, 0.01); ctx.stroke(); } });
  var f = Wl.f;
  if (f.vis) {
    paintWall(ctx, f, [120, 100, 80], { eave: 0.7, seed: 72 });
    if (!S) {
      wquad(ctx, f, 0, w, 0, y1, lit([60, 44, 36], f.n), 0.01);
      doorway(ctx, f, w * 0.4, w * 0.6, 0, 2.3, LIT.lit);
      lattice(ctx, f, 0.3, w * 0.38, 0.3, y1 - 0.3, { col: [90, 60, 44], out: 0.08, lit: LIT.lit });
      lattice(ctx, f, w * 0.62, w - 0.3, 0.3, y1 - 0.3, { col: [90, 60, 44], out: 0.08, lit: LIT.lit });
      // painted signboards (kanban-e) across the upper front
      var cols = [[196, 62, 44], [60, 92, 150], [222, 180, 60], [70, 120, 80], [200, 120, 150]], r = mulberry32(5);
      for (var i = 0; i < 5; i++) {
        var s0 = 0.25 + i * (w - 0.5) / 5, s1 = s0 + (w - 0.5) / 5 - 0.18;
        wquad(ctx, f, s0, s1, y1 + 0.6, yE - 0.7, lit([234, 222, 196], f.n), 0.12);
        var c = cols[i]; wquad(ctx, f, s0 + 0.15, s1 - 0.15, y1 + 0.8, yE - 1.6, lit(c, f.n), 0.13);
        var fig = Pa(f.at((s0 + s1) / 2, y1 + 1.9, 0.14)); ctx.fillStyle = rgb(lit([250, 240, 226], f.n)); ctx.beginPath(); ctx.arc(fig.x, fig.y - 0.4 * fig.k, Math.max(0.5, 0.16 * fig.k), 0, TAU); ctx.fill();
        ctx.fillStyle = rgb(lit(cols[(i + 2) % 5], f.n)); ctx.beginPath(); ctx.moveTo(fig.x - 0.35 * fig.k, fig.y + 0.5 * fig.k); ctx.lineTo(fig.x + 0.3 * fig.k, fig.y + 0.5 * fig.k); ctx.lineTo(fig.x + 0.05 * fig.k, fig.y - 0.25 * fig.k); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgb(lit([40, 30, 26], f.n)); ctx.lineWidth = Math.max(0.3, 0.05 * fig.k); ctx.beginPath(); wline(ctx, f, s1 - 0.35, yE - 0.85, s1 - 0.35, yE - 1.5, 0.14); ctx.stroke();
      }
      // a row of red and white lanterns under the eaves
      for (i = 0; i < 9; i++) { var lp = Pa(f.at(0.6 + i * (w - 1.2) / 8, y1 + 0.25, 0.4)), on = LIT.lit; ctx.fillStyle = on ? 'rgb(255,190,120)' : rgb(lit(i % 2 ? [236, 228, 214] : [196, 58, 40], f.n)); ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 0.2 * lp.k, 0.27 * lp.k, 0, 0, TAU); ctx.fill(); if (on) addGlow(lp, 7, 0.5, true); }
    }
    pentRoof(ctx, f, -0.1, w + 0.1, y1 + 0.5, 1.1, { mat: 'kawara', s: 0.4 });
  }
  drawRoof(ctx, B, { W: w / 2 + 0.5, D: d / 2 + 0.7, yE: yE - 0.4, s: 0.5, type: 'gable', mat: 'kawara', seed: 73 });
  // the drum tower (yagura) over the entrance, hung with a striped curtain
  var yb = yE - 0.4 + 0.5 * (d / 2 + 0.7) - 1.0, Bt = BF(B.L(0, -d / 2 + 1.6, 0)[0], B.L(0, -d / 2 + 1.6, 0)[2], B.u, 0), tw = boxWalls(Bt, 2.6, 2.2, yb, yb + 1.5);
  [tw.f, tw.l, tw.r].forEach(function (q) {
    if (!q.vis) return; var pp = wquad(ctx, q, 0, q.len, q.y0, q.y1, lit([60, 50, 46], q.n), 0);
    if (S) return; var n = 6; for (var i = 0; i < n; i++) wquad(ctx, q, q.len * i / n, q.len * (i + 0.5) / n, q.y0, q.y1 - 0.3, lit(i % 2 ? [40, 40, 44] : [230, 224, 210], q.n), 0.01);
    wquad(ctx, q, 0, q.len, q.y1 - 0.3, q.y1, lit([186, 56, 40], q.n), 0.02);
  });
  drawRoof(ctx, Bt, { W: 1.6, D: 1.4, yE: yb + 1.5, s: 0.5, type: 'hip', mat: 'board', seed: 74, ridgeH: 0.12 });
}
/* 市場: stalls at the bridge foot: striped cloth awnings, baskets of produce, big red parasols */
function drawMarket(ctx) {
  var S = sil(), lt = lightTint(0.8);
  var stalls = [[-5, -1.5, 0.35, 0], [-1.2, 1.4, 0.3, 1], [2.8, -1.0, 0.4, 2], [5.6, 2.0, 0.3, 3], [-4.2, 3.0, 0.25, 4]];
  var awn = [[[40, 56, 100], [236, 232, 218]], [[176, 70, 46], [240, 226, 196]], [[60, 100, 84], [236, 230, 210]], [[120, 60, 90], [240, 232, 220]], [[48, 62, 104], [228, 210, 150]]];
  stalls.forEach(function (q) {
    var cx = MARKET.x + q[0], cz = MARKET.z + q[1], B = BF(cx, cz, [Math.cos(q[2]), Math.sin(q[2])], 0);
    [[-1.1, -0.8], [1.1, -0.8], [-1.1, 0.7], [1.1, 0.7]].forEach(function (p) { postIn(ctx, B, p[0], p[1], 0, p[1] > 0 ? 2.3 : 1.9, 0.045, [110, 88, 64]); });
    boxIn(ctx, B, -1.05, 1.05, -0.7, 0.45, 0, 0.72, [126, 98, 70], [140, 112, 80]);
    if (!S && !SEA.snow) { // wares in shallow baskets
      var wares = [[214, 120, 40], [120, 160, 70], [236, 220, 200], [190, 60, 50], [210, 180, 90], [120, 140, 170]];
      for (var k = 0; k < 6; k++) { var p = Pa(B.L(-0.8 + k * 0.32, -0.15 + (k % 2) * 0.28, 0.76)), c = wares[(q[3] + k) % wares.length]; ctx.fillStyle = rgb(shade([150, 120, 80], [0, 1, 0])); ctx.beginPath(); ctx.ellipse(p.x, p.y + 0.05 * p.k, 0.19 * p.k, 0.1 * p.k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(shade(c, [0, 1, 0])); ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.15 * p.k, 0.08 * p.k, 0, 0, TAU); ctx.fill(); }
    }
    // the awning: a striped cloth sloping from the back to the front
    var A = [B.L(-1.35, 0.85, 2.35), B.L(1.35, 0.85, 2.35), B.L(1.35, -1.25, 1.75), B.L(-1.35, -1.25, 1.75)], n = norm(cross(sub(A[1], A[0]), sub(A[3], A[0]))); if (n[1] < 0) n = mul(n, -1);
    var c0 = awn[q[3]][0], c1 = awn[q[3]][1];
    if (S) { fillPts(ctx, A, [0, 0, 0]); return; }
    for (var i = 0; i < 6; i++) { var f0 = i / 6, f1 = (i + 1) / 6; fillPts(ctx, [mixc(A[0], A[1], f0), mixc(A[0], A[1], f1), mixc(A[3], A[2], f1), mixc(A[3], A[2], f0)], shade(snowAlb(i % 2 ? c1 : c0, n[1]), n, { amb: 1.1 }), 0.3); }
    var e0 = Pa(A[3]), e1 = Pa(A[2]); ctx.strokeStyle = rgb(shade(c0, B.N(0, -1, 0))); ctx.lineWidth = Math.max(0.4, 0.08 * e0.k); ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
  });
  // two big red parasols over benches
  [[-0.5, -3.2], [7.6, -1.0]].forEach(function (q) {
    var x = MARKET.x + q[0], z = MARKET.z + q[1];
    prism(ctx, x, z, 0, 2.7, 0.04, 0.04, 6, 0, [90, 70, 50], { snow: 0 });
    prism(ctx, x, z, 2.2, 2.75, 1.5, 0.05, 18, 0.1, [200, 52, 40], { snow: SEA.snow ? 1 : 0 });
    var bb = BF(x + 0.9, z - 0.2, [1, 0], 0); boxIn(ctx, bb, -0.9, 0.9, -0.3, 0.3, 0.38, 0.46, [176, 40, 34], [190, 44, 36]);
  });
  if (!S) [[1.8, -3.6], [2.2, -3.1], [-7.2, 1.0]].forEach(function (q) { prism(ctx, MARKET.x + q[0], MARKET.z + q[1], 0, 0.8, 0.32, 0.3, 10, 0, [128, 96, 64], { tex: 0.4 }); });
}
/* 武家屋敷: a samurai residence: a tiled white wall, a roofed gate and the house behind */
function drawBuke(ctx, sp) {
  var B = BF(sp.x, sp.z, sp.u, 0), w = sp.w, d = sp.d, S = sil(), wh = 2.3;
  // the house inside (drawn first: the wall is in front of it)
  var Bh = BF(B.L(0, 1.2, 0)[0], B.L(0, 1.2, 0)[2], sp.u, 0), hw = w - 5, hd = d - 6, Wh = boxWalls(Bh, hw, hd, 0, 3.3);
  [Wh.f, Wh.l, Wh.r].forEach(function (q) { if (!q.vis) return; paintWall(ctx, q, MAT.plaster, { eave: 0.8 }); if (!S && q === Wh.f) shoji(ctx, q, 0.6, q.len - 0.6, 0.6, 2.7, { lit: winOn(sp.seed) }); });
  drawRoof(ctx, Bh, { W: hw / 2 + 1.2, D: hd / 2 + 1.2, yE: 3.3, s: 0.6, type: 'irimoya', bm: 1.2, mat: 'kawara', seed: sp.seed, sori: 0.15 });
  // the enclosing wall (front and sides visible), tile-capped, with a gate in the front
  var gw = 3.4, Wl = boxWalls(B, w, d, 0, wh);
  [Wl.l, Wl.r, Wl.f].forEach(function (q) {
    if (!q.vis) return;
    paintWall(ctx, q, MAT.plaster, { grime: 0.2, tex: 0.3 });
    if (!S) { wquad(ctx, q, 0, q.len, 0, 0.55, lit([150, 144, 132], q.n), 0.03); ctx.strokeStyle = rgb(lit([110, 104, 96], q.n)); ctx.lineWidth = 0.3; ctx.beginPath(); for (var s = 0.6; s < q.len; s += 0.7) wline(ctx, q, s, 0, s, 0.55, 0.04); ctx.stroke(); for (var j = 0.4; j < q.len; j += 2.0) wquad(ctx, q, j, j + 0.08, 0.9, 1.9, lit([200, 196, 186], q.n), 0.02); }
    var cap = wallOf(B, q.A0, q.A1, wh, wh), Bc = BF((q.p[0][0] + q.p[1][0]) / 2, (q.p[0][2] + q.p[1][2]) / 2, norm2([q.p[1][0] - q.p[0][0], q.p[1][2] - q.p[0][2]]), 0);
    drawRoof(ctx, Bc, { W: q.len / 2 + 0.2, D: 0.5, yE: wh - 0.05, s: 0.5, type: 'gable', mat: 'kawara', seed: 5, ridgeH: 0.14, noOni: true });
  });
  // the gate
  var gB = BF(B.L(0, -d / 2, 0)[0], B.L(0, -d / 2, 0)[2], sp.u, 0);
  var gW = boxWalls(gB, gw, 0.4, 0, 2.9);
  if (gW.f.vis) { wquad(ctx, gW.f, 0, gw, 0, 2.6, lit([70, 52, 40], gW.f.n), 0.25); if (!S) { wquad(ctx, gW.f, 0.35, gw - 0.35, 0, 2.3, lit([96, 72, 54], gW.f.n), 0.3); var c = Pa(gW.f.at(gw / 2, 1.2, 0.32)); ctx.strokeStyle = rgb(lit([40, 30, 24], gW.f.n)); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(c.x, c.y - 1.1 * c.k); ctx.lineTo(c.x, c.y + 1.1 * c.k); ctx.stroke(); } }
  drawRoof(ctx, gB, { W: gw / 2 + 0.8, D: 1.3, yE: 3.0, s: 0.55, type: 'gable', mat: 'kawara', seed: 6, ridgeH: 0.25 });
}
/* 石垣: the castle's battered stone base, its curve steepening toward the top */
function ishiGeom() { return { B: BF(CASTLE.x, CASTLE.z, [1, -0.06], 0), w: 13, d: 9.6, h: 4.6, y0: CASTLE.top - 0.6 }; }
function drawIshigaki(ctx) {
  var G = ishiGeom(), B = G.B, S = sil(), st = [150, 144, 132], N = 9;
  function prof(f) { return 1.9 * Math.pow(1 - f, 1.6); }   // inset (m) at height fraction f: the ogi-no-kōbai curve
  var sides = [[[-1, -1], [1, -1], [0, -1]], [[1, -1], [1, 1], [1, 0]], [[-1, 1], [-1, -1], [-1, 0]]];
  sides.forEach(function (sd) {
    var n = B.N(sd[2][0], sd[2][1], 0.55); if (!faceVisible(B.L(sd[2][0] * G.w / 2, sd[2][1] * G.d / 2, G.y0 + G.h / 2), B.N(sd[2][0], sd[2][1], 0)) && MODE === 'n') return;
    for (var i = 0; i < N; i++) {
      var f0 = i / N, f1 = (i + 1) / N, i0 = prof(f0), i1 = prof(f1);
      function pt(c, f, ins) { return B.L(c[0] * (G.w / 2 + ins) , c[1] * (G.d / 2 + ins), G.y0 + f * G.h); }
      var q = [pt(sd[0], f0, i0), pt(sd[1], f0, i0), pt(sd[1], f1, i1), pt(sd[0], f1, i1)];
      var nn = B.N(sd[2][0], sd[2][1], (i0 - i1) > 0 ? G.h / N / (i0 - i1 + 0.01) * 0 + 0.25 + 0.5 * (1 - f0) : 0.2);
      var pp = fillPts(ctx, q, S ? [0, 0, 0] : shade(st, norm([nn[0], 0.25 + (i0 - i1) * 1.2, nn[2]])), 0.4);
      if (S) continue;
      ctx.save(); poly(ctx, pp); ctx.clip();
      var r = mulberry32(i * 7 + sd[2][0] * 3 + 11), A = pp[0], Bp = pp[1], C = pp[2], D = pp[3], cols = 6 + Math.round(Math.hypot(Bp.x - A.x, Bp.y - A.y) / 2.2);
      var base = shade(st, norm([nn[0], 0.25 + (i0 - i1) * 1.2, nn[2]]));
      for (var c = 0; c < cols; c++) { // each stone a slightly different tone
        var u0 = (c + (i % 2) * 0.5) / cols, u1 = Math.min(1, u0 + 1 / cols); if (u0 >= 1) continue;
        ctx.fillStyle = rgb(scl(mixc(base, shade([182, 172, 154], nn), r() * 0.5), 0.8 + r() * 0.32));
        ctx.beginPath(); ctx.moveTo(lerp(A.x, Bp.x, u0), lerp(A.y, Bp.y, u0)); ctx.lineTo(lerp(A.x, Bp.x, u1), lerp(A.y, Bp.y, u1)); ctx.lineTo(lerp(D.x, C.x, u1), lerp(D.y, C.y, u1)); ctx.lineTo(lerp(D.x, C.x, u0), lerp(D.y, C.y, u0)); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = rgb(scl(base, 0.42)); ctx.lineWidth = Math.max(0.35, 0.05 * A.k || 0.5); ctx.beginPath();
      ctx.moveTo(D.x, D.y); ctx.lineTo(C.x, C.y);
      for (c = 0; c <= cols; c++) { var uu = (c + (i % 2) * 0.5 + (r() - 0.5) * 0.15) / cols; if (uu > 1) continue; ctx.moveTo(lerp(A.x, Bp.x, uu), lerp(A.y, Bp.y, uu)); ctx.lineTo(lerp(D.x, C.x, uu), lerp(D.y, C.y, uu)); }
      ctx.stroke();
      // light catching the top edge of each course
      ctx.strokeStyle = rgb(scl(base, 1.25), 0.6); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(D.x, D.y + 0.6); ctx.lineTo(C.x, C.y + 0.6); ctx.stroke();
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.5; ctx.fillStyle = GRAINPAT; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  });
  // the top: a gravel court
  var tt = [B.L(-G.w / 2, -G.d / 2, G.y0 + G.h), B.L(G.w / 2, -G.d / 2, G.y0 + G.h), B.L(G.w / 2, G.d / 2, G.y0 + G.h), B.L(-G.w / 2, G.d / 2, G.y0 + G.h)];
  fillPts(ctx, tt, S ? [0, 0, 0] : shade(SEA.snow ? SNOW : [176, 168, 150], [0, 1, 0]), 0.4);
  if (!F.keep && !S) { // pines on the bare base until the keep is raised
    [[-5, 2], [5.5, 3]].forEach(function (q) { var p = B.L(q[0], q[1], 0); var pt = genPine(500 + q[0] | 0, p[0], p[2], 2.2, G.y0 + G.h); drawPine(ctx, pt); });
  }
}
/* 天守: the castle keep: three diminishing white storeys under dark hip-and-gable roofs with gold shachihoko */
function drawKeep(ctx) {
  var G = ishiGeom(), B = G.B, S = sil(), y = G.y0 + G.h, tiers = [[10.4, 7.6, 3.0], [8.2, 6.0, 2.6], [6.0, 4.6, 2.4]];
  tiers.forEach(function (t, i) {
    var Wl = boxWalls(B, t[0], t[1], y, y + t[2]);
    [Wl.f, Wl.l, Wl.r].forEach(function (q) {
      if (!q.vis) return;
      paintWall(ctx, q, [240, 238, 232], { grime: 0.06, tex: 0.25, eave: 0.7 });
      if (S) return;
      if (i === 0) boards(ctx, q, 0, q.len, q.y0, q.y0 + 1.3, [44, 40, 40]);
      var nw = Math.max(2, Math.round(q.len / 2.4));
      for (var k = 0; k < nw; k++) { var s0 = (k + 0.5) * q.len / nw - 0.42; var on = LIT.lit && hash2(i * 9 + k, 3) < LIT.win * 0.6; wquad(ctx, q, s0, s0 + 0.84, q.y1 - 1.45, q.y1 - 0.6, on ? scl(WIN_ON, 0.85) : [44, 40, 40], 0.02); if (on) addGlow(Pa(q.at(s0 + 0.42, q.y1 - 1.0)), 6, 0.4, false); if (!on) { ctx.strokeStyle = rgb(lit([210, 206, 196], q.n)); ctx.lineWidth = 0.3; ctx.beginPath(); for (var b = 1; b < 4; b++) wline(ctx, q, s0 + b * 0.21, q.y1 - 1.45, s0 + b * 0.21, q.y1 - 0.6, 0.03); ctx.stroke(); } }
    });
    y += t[2];
    var top = i === tiers.length - 1;
    drawRoof(ctx, B, { W: t[0] / 2 + 1.0, D: t[1] / 2 + 1.0, yE: y, s: 0.55, type: top ? 'irimoya' : 'hip', bm: top ? 1.3 : 0, mat: 'kawara', col: [70, 74, 82], seed: 90 + i, sori: 0.45, ridgeH: top ? 0.4 : 0.2, noRidge: !top, gableWhite: true, shachi: top });
    if (!top) { // a chidori gable on the front slope
      var cg = B.L(0, -t[1] / 2 + 0.3, 0);
      drawRoof(ctx, BF(cg[0], cg[2], [B.v[0], B.v[1]], 0), { W: 1.25, D: 1.75, yE: y + 0.55, s: 0.75, type: 'gable', mat: 'kawara', col: [70, 74, 82], seed: 95 + i, ridgeH: 0.18, noOni: true });
      gableFront(ctx, B, t[1], y, i);
      y += 0.5;
    } else y += 0.4;
  });
}
/* the white triangle of a front-facing gable (chidori-hafu) */
function gableFront(ctx, B, d, y, i) {
  var pts = [B.L(-1.75, -d / 2 - 0.95, y + 0.55), B.L(1.75, -d / 2 - 0.95, y + 0.55), B.L(0, -d / 2 - 0.95, y + 0.55 + 1.75 * 0.75)];
  var n = B.N(0, -1, 0); if (!faceVisible(centroid(pts), n) && MODE === 'n') return;
  fillPts(ctx, pts, sil() ? [0, 0, 0] : shade([238, 236, 228], n), 0.3);
  if (sil()) return;
  var pp = pts.map(Pa); ctx.strokeStyle = rgb(shade([60, 62, 70], n)); ctx.lineWidth = Math.max(0.5, 0.12 * pp[2].k); ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y); ctx.lineTo(pp[2].x, pp[2].y); ctx.lineTo(pp[1].x, pp[1].y); ctx.stroke();
}
/* 船着き場: stone steps down to the water, mooring posts and a moored boat */
function landingGeom() { var p = krPt(19, RIVER_HW - 0.4); return { B: BF(p[0], p[1], KR_DIR, 0) }; }
function drawLanding(ctx) {
  var G = landingGeom(), B = G.B, S = sil(), st = [156, 150, 138];
  for (var i = 0; i < 5; i++) { var b0 = -0.3 - i * 0.55; boxIn(ctx, B, -2.4, 2.4, b0 - 0.55, b0, WL - 0.2, 0.05 - i * 0.2, st, [168, 162, 150]); }
  [[-2.8, -1.8], [2.8, -1.8], [-1.5, -3.6], [3.4, -3.4]].forEach(function (q) { postIn(ctx, B, q[0], q[1], WL - 0.4, 1.1, 0.1, [88, 70, 52]); });
  drawBoat(ctx, B.L(-4.8, -4.2, 0), [KR_DIR[0], KR_DIR[1]], 0, false);
}
/* a flat-bottomed river boat (also used by the animation) */
function drawBoat(ctx, p, dir, bob, man) {
  var B = BF(p[0], p[2] === undefined ? p[1] : p[2], dir, 0), L = 4.2, Wd = 0.75, y0 = WL - 0.05 + (bob || 0), S = sil();
  var hull = [], top = [], N = 12, k;
  for (k = 0; k <= N; k++) { var f = k / N, a = -L / 2 + L * f, taper = 1 - Math.pow(Math.abs(f * 2 - 1), 2.6) * 0.75, rise = f > 0.7 ? Math.pow((f - 0.7) / 0.3, 2) * 0.35 : 0; top.push(B.L(a, -Wd * taper, y0 + 0.42 + rise)); hull.push(B.L(a, -Wd * taper * 0.8, y0)); }
  var pp = top.map(Pa).concat(hull.map(Pa).reverse()); poly(ctx, pp); ctx.fillStyle = S ? '#000' : rgb(shade([96, 72, 52], B.N(0, -1, 0.2))); ctx.fill();
  if (S) return;
  var inner = []; for (k = 0; k <= N; k++) { var f2 = k / N, a2 = -L / 2 + L * f2, t2 = 1 - Math.pow(Math.abs(f2 * 2 - 1), 2.6) * 0.75, r2 = f2 > 0.7 ? Math.pow((f2 - 0.7) / 0.3, 2) * 0.35 : 0; inner.push(B.L(a2, Wd * t2, y0 + 0.42 + r2)); }
  poly(ctx, top.map(Pa).concat(inner.map(Pa).reverse())); ctx.fillStyle = rgb(shade(SEA.snow ? SNOW : [124, 98, 72], [0, 1, 0])); ctx.fill();
  ctx.strokeStyle = rgb(shade([150, 120, 90], B.N(0, -1, 0.5))); ctx.lineWidth = 0.4; ctx.beginPath(); top.forEach(function (q, i) { var pq = Pa(q); if (i) ctx.lineTo(pq.x, pq.y); else ctx.moveTo(pq.x, pq.y); }); ctx.stroke();
  // cargo: straw bales
  var c = Pa(B.L(-0.3, 0, y0 + 0.6)); ctx.fillStyle = rgb(shade([196, 170, 110], [0.3, 1, -0.3])); ctx.beginPath(); ctx.ellipse(c.x, c.y, 0.5 * c.k, 0.3 * c.k, 0, 0, TAU); ctx.fill();
}

/* ---- 04f_events.js ---- */
/* ================= seasonal events: decorations on whatever stands at this stage ================= */
/* the visible entrances: { W: wall, s0, s1: door span (m along the wall), top: door head height } */
function doorList() {
  var out = [];
  function add(W0, s0, s1, top, kind) { if (W0.vis) out.push({ W: W0, s0: s0, s1: s1, top: top, kind: kind || 'house' }); }
  if (F.teahouse) add(boxWalls(teaFrame(), 5.6, 4.2, 0, 2.5).f, 0.45, 2.35, 2.2, 'tea');
  if (F.farm) add(boxWalls(farmFrame(), 11.5, 7.6, 0, 2.7).f, 0.7, 2.6, 2.15, 'farm');
  if (F.mill) add(boxWalls(millFrame(), 5, 4.4, 0, 2.5).f, 1.2, 2.4, 1.9, 'mill');
  townPlan(F).forEach(function (b) {
    var B = BF(b.x, b.z, b.u, 0);
    if (b.type === 'nagaya') { var f = boxWalls(B, b.units * 2.75, 4.6, 0, 2.75).f; for (var i = 0; i < b.units; i += 2) add(f, i * 2.75 + 0.3, i * 2.75 + 1.2, 1.8, 'nagaya'); return; }
    if (b.type === 'kura' || b.low) return;
    var W0 = boxWalls(B, b.w, b.d, 0, 3).f;
    if (b.type === 'inn') add(W0, b.w * 0.38, b.w * 0.62, 2.8, 'inn');
    else { var dw = b.type === 'shoka' ? 2.4 : 1.7, dl = b.doorLeft ? 0.25 : b.w - dw - 0.25; add(W0, dl, dl + dw, 2.65, b.type); }
  });
  if (F.temple) { var tf = templeFrame(), tw = boxWalls(tf, 13, 10.5, 1.0, 5.2).f; add(tw, 5.2, 7.8, 3.8, 'temple'); }
  return out;
}
function doorKey(d) { return Pa(d.W.at((d.s0 + d.s1) / 2, 0, 0.6)).d; }
/* 門松: bamboo cut on the slant, pine, in a straw-bound base */
function kadomatsu(ctx, p3, k) {
  var b = Pa(p3), kk = b.k * (k || 1), tint = lightTint(0.8);
  ctx.fillStyle = rgb(mulc([176, 150, 96], tint)); ctx.beginPath(); ctx.moveTo(b.x - 0.28 * kk, b.y); ctx.lineTo(b.x + 0.28 * kk, b.y); ctx.lineTo(b.x + 0.24 * kk, b.y - 0.45 * kk); ctx.lineTo(b.x - 0.24 * kk, b.y - 0.45 * kk); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgb(mulc([110, 86, 50], tint)); ctx.lineWidth = Math.max(0.3, 0.04 * kk); ctx.beginPath(); ctx.moveTo(b.x - 0.26 * kk, b.y - 0.15 * kk); ctx.lineTo(b.x + 0.26 * kk, b.y - 0.15 * kk); ctx.moveTo(b.x - 0.25 * kk, b.y - 0.32 * kk); ctx.lineTo(b.x + 0.25 * kk, b.y - 0.32 * kk); ctx.stroke();
  [[-0.1, 1.25], [0.1, 1.05], [0.0, 1.5]].forEach(function (s) { var x = b.x + s[0] * kk, y0 = b.y - 0.4 * kk, y1 = b.y - s[1] * kk; ctx.fillStyle = rgb(mulc([96, 140, 64], tint)); ctx.beginPath(); ctx.moveTo(x - 0.06 * kk, y0); ctx.lineTo(x + 0.06 * kk, y0); ctx.lineTo(x + 0.06 * kk, y1 + 0.08 * kk); ctx.lineTo(x - 0.06 * kk, y1); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgb(mulc([220, 214, 170], tint)); ctx.beginPath(); ctx.ellipse(x, y1 + 0.04 * kk, 0.06 * kk, 0.035 * kk, -0.6, 0, TAU); ctx.fill(); });
  for (var i = 0; i < 7; i++) { ctx.fillStyle = rgb(mulc(i % 2 ? [40, 74, 40] : [60, 100, 50], tint)); ctx.beginPath(); ctx.arc(b.x + (i - 3) * 0.08 * kk, b.y - (0.5 + (i % 3) * 0.08) * kk, 0.1 * kk, 0, TAU); ctx.fill(); }
}
/* 注連縄 over a doorway, with paper zigzags */
function shimenawa(ctx, W0, s0, s1, y, out) {
  var a = Pa(W0.at(s0, y, out)), b = Pa(W0.at(s1, y, out)), k = a.k, tint = lightTint(0.8), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 0.12 * k };
  ctx.strokeStyle = rgb(mulc([196, 168, 104], tint)); ctx.lineWidth = Math.max(0.5, 0.12 * k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mid.x, mid.y + 0.1 * k, b.x, b.y); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = rgb(mulc([248, 246, 240], tint));
  for (var i = 1; i < 4; i++) { var f = i / 4, x = lerp(a.x, b.x, f), y2 = lerp(a.y, b.y, f) + 0.12 * k * Math.sin(f * Math.PI); ctx.beginPath(); ctx.moveTo(x - 0.05 * k, y2); ctx.lineTo(x + 0.06 * k, y2 + 0.12 * k); ctx.lineTo(x - 0.04 * k, y2 + 0.22 * k); ctx.lineTo(x + 0.05 * k, y2 + 0.34 * k); ctx.lineTo(x - 0.01 * k, y2 + 0.36 * k); ctx.lineTo(x - 0.1 * k, y2 + 0.2 * k); ctx.closePath(); ctx.fill(); }
}
/* a flag on a short pole leaning out from the house front */
function hinomaru(ctx, W0, s, y) {
  var root = W0.at(s, y, 0.1), tip = add(W0.at(s, y + 0.9, 0.1), mul(W0.n, 1.1)), pr = Pa(root), pt = Pa(tip), k = pr.k, tint = lightTint(0.9);
  ctx.strokeStyle = rgb(mulc([110, 90, 66], tint)); ctx.lineWidth = Math.max(0.3, 0.04 * k); ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
  var f0 = Pa(mixc(root, tip, 0.55)), fw = 0.55 * k, fh = 0.38 * k, dx = (pt.x - pr.x) > 0 ? 1 : -1;
  ctx.fillStyle = rgb(mulc([246, 244, 238], tint)); ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.lineTo(pt.x, pt.y); ctx.lineTo(pt.x + dx * 0.02 * k, pt.y + fh); ctx.lineTo(f0.x + dx * 0.02 * k, f0.y + fh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(mulc([206, 40, 40], tint)); ctx.beginPath(); ctx.arc((f0.x + pt.x) / 2, (f0.y + pt.y) / 2 + fh / 2, Math.min(fw, fh) * 0.28, 0, TAU); ctx.fill();
}
/* 柊鰯: a holly sprig with a sardine's head, fixed beside the door */
function hiiragi(ctx, W0, s, y) {
  var p = Pa(W0.at(s, y, 0.12)), k = p.k, tint = lightTint(0.8);
  ctx.strokeStyle = rgb(mulc([110, 86, 60], tint)); ctx.lineWidth = Math.max(0.3, 0.035 * k); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.05 * k, p.y - 0.55 * k); ctx.stroke();
  for (var i = 0; i < 5; i++) { ctx.fillStyle = rgb(mulc(i % 2 ? [30, 70, 40] : [44, 92, 50], tint)); ctx.beginPath(); ctx.ellipse(p.x + (i % 2 ? 0.08 : -0.06) * k, p.y - (0.3 + i * 0.06) * k, 0.07 * k, 0.04 * k, i, 0, TAU); ctx.fill(); }
  ctx.fillStyle = rgb(mulc([150, 156, 168], tint)); ctx.beginPath(); ctx.ellipse(p.x + 0.04 * k, p.y - 0.62 * k, 0.08 * k, 0.05 * k, 0.3, 0, TAU); ctx.fill();
}
/* 盆提灯: a pale painted lantern hanging under the eaves, lit at dusk */
function bonLantern(ctx, W0, s, y) {
  var p = Pa(W0.at(s, y, 0.5)), k = p.k, on = LIT.lit, tint = lightTint(0.9);
  ctx.strokeStyle = rgb(mulc([60, 50, 40], tint)); ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(p.x, p.y - 0.35 * k); ctx.lineTo(p.x, p.y - 0.18 * k); ctx.stroke();
  ctx.fillStyle = on ? 'rgb(255,226,170)' : rgb(mulc([214, 228, 236], tint)); ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.24 * k, 0.32 * k, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = on ? 'rgba(200,110,120,0.7)' : rgb(mulc([170, 120, 170], tint)); ctx.beginPath(); ctx.arc(p.x - 0.04 * k, p.y, 0.05 * k, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgb(mulc([196, 60, 80], tint)); ctx.beginPath(); ctx.moveTo(p.x, p.y + 0.22 * k); ctx.lineTo(p.x, p.y + 0.45 * k); ctx.stroke();
  if (on) addGlow(p, 7, 0.55, true);
}
/* a vase of branches: peach blossom, or susuki */
function vase(ctx, p3, kind) {
  var b = Pa(p3), k = b.k, tint = lightTint(0.85), r = mulberry32(((p3[0] * 31) | 0) + 3);
  ctx.fillStyle = rgb(mulc(kind === 'susuki' ? [120, 100, 80] : [70, 90, 120], tint)); ctx.beginPath(); ctx.ellipse(b.x, b.y - 0.18 * k, 0.12 * k, 0.18 * k, 0, 0, TAU); ctx.fill();
  for (var i = 0; i < 6; i++) {
    var a = -Math.PI / 2 + (r() - 0.5) * 1.1, L = (0.6 + r() * 0.5) * k, ex = b.x + Math.cos(a) * L, ey = b.y - 0.3 * k + Math.sin(a) * L;
    ctx.strokeStyle = rgb(mulc(kind === 'susuki' ? [180, 160, 110] : [90, 60, 50], tint)); ctx.lineWidth = Math.max(0.25, 0.025 * k); ctx.beginPath(); ctx.moveTo(b.x, b.y - 0.3 * k); ctx.quadraticCurveTo(b.x + (ex - b.x) * 0.3, ey + 0.1 * k, ex, ey); ctx.stroke();
    if (kind === 'susuki') { ctx.fillStyle = rgb(mulc([236, 224, 196], tint)); ctx.beginPath(); ctx.ellipse(ex, ey, 0.05 * k, 0.14 * k, a + Math.PI / 2 + 0.4, 0, TAU); ctx.fill(); }
    else for (var j = 0; j < 4; j++) { var f = 0.4 + j * 0.18; ctx.fillStyle = rgb(mulc(j % 2 ? [236, 120, 160] : [250, 176, 200], tint)); ctx.beginPath(); ctx.arc(lerp(b.x, ex, f), lerp(b.y - 0.3 * k, ey, f), 0.06 * k, 0, TAU); ctx.fill(); }
  }
}
/* tsukimi: a pyramid of dango on a little stand */
function dango(ctx, p3) {
  var b = Pa(p3), k = b.k, tint = lightTint(0.9);
  ctx.fillStyle = rgb(mulc([170, 140, 100], tint)); ctx.fillRect(b.x - 0.22 * k, b.y - 0.25 * k, 0.44 * k, 0.25 * k);
  ctx.fillStyle = rgb(mulc([248, 246, 236], tint));
  [[-0.12, 0], [0, 0], [0.12, 0], [-0.06, 1], [0.06, 1], [0, 2]].forEach(function (q) { ctx.beginPath(); ctx.arc(b.x + q[0] * k, b.y - (0.3 + q[1] * 0.1) * k, 0.065 * k, 0, TAU); ctx.fill(); });
}
/* hina dolls on a red-carpeted stand, seen in an open front */
function hinaDisplay(ctx, W0, s0, s1, y0) {
  var tint = [1, 1, 1], on = LIT.lit;
  wquad(ctx, W0, s0, s1, y0, y0 + 1.5, on ? scl(WIN_ON, 0.6) : [44, 34, 30], 0.14);
  for (var t = 0; t < 4; t++) {
    var ty = y0 + 0.1 + t * 0.32, ins = t * 0.18;
    wquad(ctx, W0, s0 + 0.1 + ins, s1 - 0.1 - ins, ty, ty + 0.12, lit([200, 40, 36], W0.n, { amb: 1.2 }), 0.16);
    var n = Math.max(1, 4 - t), cols = [[40, 40, 50], [200, 60, 60], [240, 220, 160], [80, 100, 160]];
    for (var i = 0; i < n; i++) { var sx = lerp(s0 + 0.25 + ins, s1 - 0.25 - ins, n === 1 ? 0.5 : i / (n - 1)), p = Pa(W0.at(sx, ty + 0.12, 0.17)), k = p.k; ctx.fillStyle = rgb(lit(cols[(t + i) % 4], W0.n)); ctx.beginPath(); ctx.moveTo(p.x - 0.09 * k, p.y); ctx.lineTo(p.x + 0.09 * k, p.y); ctx.lineTo(p.x, p.y - 0.18 * k); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgb(250,246,240)'; ctx.beginPath(); ctx.arc(p.x, p.y - 0.2 * k, 0.04 * k, 0, TAU); ctx.fill(); }
  }
  if (on) addGlow(Pa(W0.at((s0 + s1) / 2, y0 + 0.8, 0.2)), 10, 0.5, true);
}
/* where the koinobori fly and the tanabata bamboo stand (also used by the animation) */
function koiPoles() {
  var out = [];
  if (F.farm) { var fb = farmFrame(), p = fb.L(7.4, 1, 0); out.push([p[0], p[2], 10]); }
  else if (F.teahouse) { var tb = teaFrame(), q = tb.L(-4.2, 1, 0); out.push([q[0], q[2], 7]); }
  else out.push([TREE0.x + 5, TREE0.z + 3, 6.5]);
  if (F.shoka) { var s = stPt(15.2, 13.5); out.push([s[0], s[1], 10]); }
  if (F.nagaya) { var n = stPt(20.2, 34.5); out.push([n[0], n[1], 9]); }
  if (F.buke) { var bq = BF(BUKE[0].x, BUKE[0].z, KR_DIR, 0).L(5, 2.5, 0); out.push([bq[0], bq[2], 10.5]); }
  return out;
}
function tanabataList() {
  var out = [];
  doorList().forEach(function (d, i) { if (d.kind === 'temple' || d.kind === 'mill' || (i % 2 && d.kind === 'house')) return; var base = d.W.at(d.s0 - 0.35, 0, 0.6); out.push({ base: base, lean: d.W.n, h: d.kind === 'nagaya' ? 4.2 : 5.8, ph: i * 1.3 }); });
  if (!out.length) { var p = [TREE0.x + 4, 0, TREE0.z + 2]; out.push({ base: p, lean: [0.5, 0, -0.5], h: 3.6, ph: 0 }); }
  return out;
}
function drawDoorDeco(ctx, d, k) {
  var ev = F.event, W0 = d.W; if (sil()) return;
  if (ev === 'shogatsu') {
    if (d.kind !== 'nagaya' || k % 2 === 0) { kadomatsu(ctx, W0.at(d.s0 - 0.35, 0, 0.55), 0.9); kadomatsu(ctx, W0.at(d.s1 + 0.35, 0, 0.55), 0.9); }
    shimenawa(ctx, W0, d.s0 + 0.05, d.s1 - 0.05, d.top + 0.05, 0.3);
    if (k % 2 === 0) hinomaru(ctx, W0, d.s1 + 0.25, d.top - 0.3);
  } else if (ev === 'setsubun') { hiiragi(ctx, W0, d.s1 + 0.12, d.top - 0.4); if (k % 3 === 0) hiiragi(ctx, W0, d.s0 - 0.12, d.top - 0.4); }
  else if (ev === 'hinamatsuri') { if (k % 2 === 0) vase(ctx, W0.at(d.s1 + 0.4, 0, 0.5), 'momo'); }
  else if (ev === 'obon') { bonLantern(ctx, W0, d.s0 - 0.2, d.top + 0.1); bonLantern(ctx, W0, d.s1 + 0.2, d.top + 0.1); }
}
function drawEventExtras(ctx, which) {
  var ev = F.event, i; if (sil() && which !== 'koi') return;
  if (which === 'hina') {
    var host = null; townPlan(F).forEach(function (b) { if (b.type === 'shoka') host = b; });
    if (host) { var hf = boxWalls(BF(host.x, host.z, host.u, 0), host.w, host.d, 0, 3).f; if (hf.vis) hinaDisplay(ctx, hf, 1.2, 3.6, 0.5); }
    else if (F.farm) { var ff = boxWalls(farmFrame(), 11.5, 7.6, 0, 2.7).f; if (ff.vis) hinaDisplay(ctx, ff, 3.4, 5.6, 0.6); }
    else if (F.teahouse) { var tf = boxWalls(teaFrame(), 5.6, 4.2, 0, 2.5).f; if (tf.vis) hinaDisplay(ctx, tf, 2.8, 4.8, 0.9); }
  }
  if (which === 'tsukimi') {
    if (F.farm) { var fb = farmFrame(); vase(ctx, fb.L(-1.2, -4.0, 0.5), 'susuki'); dango(ctx, fb.L(0.2, -4.1, 0.5)); }
    else if (F.teahouse) { var tb = teaFrame(); vase(ctx, tb.L(-0.5, -4.1, 0.5), 'susuki'); dango(ctx, tb.L(0.6, -4.1, 0.5)); }
    townPlan(F).forEach(function (b) { if (b.type !== 'inn') return; var B = BF(b.x, b.z, b.u, 0); vase(ctx, B.L(-2.5, -b.d / 2 - 0.45, 3.6), 'susuki'); dango(ctx, B.L(-1.4, -b.d / 2 - 0.5, 3.6)); });
    for (i = 0; i < 7; i++) vase(ctx, [TREE0.x + 3.5 + i * 1.2, 0, TREE0.z - 1.5 + (i % 3) * 1.3], 'susuki');
  }
  if (which === 'koi') koiPoles().forEach(function (q) { prism(ctx, q[0], q[1], 0, q[2], 0.08, 0.06, 6, 0, [140, 120, 90], { snow: 0 }); if (!sil()) { var tp = P(q[0], q[2] + 0.2, q[1]); ctx.fillStyle = rgb(mulc([220, 180, 70], lightTint(1))); ctx.beginPath(); ctx.arc(tp.x, tp.y, 0.16 * tp.k, 0, TAU); ctx.fill(); } });
}
function drawPeach(ctx, t) {
  var cd = Pa(t.center).d, opt = { pal: MOMO, kind: 'blossom', dab: 0.2, density: sakDens(t) * 0.9, cap: 60, batch: true };
  paintSprays(ctx, t, function (p) { return p.d > cd + 0.3; }, opt);
  drawBranches(ctx, t.segs, [[52, 36, 34], [92, 70, 62], [130, 110, 100]]);
  paintSprays(ctx, t, function (p) { return p.d <= cd + 0.3; }, opt);
}
/* peach trees in bloom for the doll festival */
var MOMO = [[150, 40, 80], [196, 66, 112], [226, 110, 150], [240, 150, 180], [248, 190, 210], [252, 220, 232]];

/* ---- 04g_props.js ---- */
/* ================= small things that make a place lived in ================= */
/* a Japanese cedar: a straight red-brown trunk under drooping tiers of dark needles */
function drawCedar(ctx, x, z, h, seed) {
  var S = sil(), r = mulberry32(seed), base = P(x, 0, z), top = P(x, h, z), k = base.k;
  ctx.strokeStyle = S ? '#000' : rgb(shade([110, 62, 44], [0.5, 0.3, -0.8])); ctx.lineWidth = Math.max(0.5, 0.35 * k); ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
  var tiers = 11, pal = [[10, 22, 18], [16, 34, 24], [24, 48, 32], [34, 62, 40], [50, 80, 50], [70, 100, 60]], NB = pal.length, paths = [], snowP = SEA.snow && !S ? new Path2D() : null, i;
  for (i = 0; i < NB; i++) paths.push(new Path2D());
  var lsx = Math.sign(LS[0]) || 1;
  for (var t = 0; t < tiers; t++) {
    var f = t / (tiers - 1), y = h * (0.98 - f * 0.68), rad = 0.35 + f * h * 0.17, c = P(x, y, z), rr = rad * c.k, n = S ? 3 : Math.round(8 + f * 14);
    if (S) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(c.x, c.y + rr * 0.25, rr, rr * 0.45, 0, 0, TAU); ctx.fill(); continue; }
    for (var j = 0; j < n; j++) {
      var u = (r() - 0.5) * 2, ox = u * rr, oy = (Math.abs(u) * 0.35 + r() * 0.25) * rr, l = clamp(0.35 + 0.35 * u * lsx - oy / rr * 0.5 + (r() - 0.5) * 0.3 + (1 - f) * 0.1), d = Math.max(0.6, rr * 0.28);
      var pa = paths[Math.min(NB - 1, Math.round(l * (NB - 1)))]; pa.moveTo(c.x + ox + d, c.y + oy); pa.ellipse(c.x + ox, c.y + oy, d, d * 0.55, u * 0.4, 0, TAU);
      if (snowP && oy < rr * 0.25 && r() < 0.5) { snowP.moveTo(c.x + ox + d * 0.8, c.y + oy - d * 0.3); snowP.ellipse(c.x + ox, c.y + oy - d * 0.3, d * 0.8, d * 0.35, 0, 0, TAU); }
    }
  }
  if (S) return;
  var tint = LIT.foliageTint || null;
  for (i = 0; i < NB; i++) { ctx.fillStyle = rgb(tc(pal[i], tint)); ctx.fill(paths[i]); }
  if (snowP) { ctx.fillStyle = rgb(mulc(SNOW, lightTint(1))); ctx.fill(snowP); }
}
/* a fence between two ground points: 'bamboo' (open lattice) or 'wood' (boards) */
function fence(ctx, a, b, h, kind) {
  var S = sil(), dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), n = Math.max(2, Math.round(L / 1.8)), col = kind === 'wood' ? [92, 72, 56] : [172, 158, 104];
  var nrm = norm([-dz / L, 0, dx / L]); if (nrm[2] > 0) nrm = mul(nrm, -1);
  if (kind === 'wood') {
    var q = [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h, b[1]], [a[0], h, a[1]]], pp = fillPts(ctx, q, S ? [0, 0, 0] : shade(col, nrm), 0.4);
    if (!S) { ctx.save(); poly(ctx, pp); ctx.clip(); ctx.strokeStyle = rgb(scl(shade(col, nrm), 0.65)); ctx.lineWidth = 0.35; ctx.beginPath(); for (var s = 0.25; s < L; s += 0.25) { var p0 = P(a[0] + dx * s / L, 0, a[1] + dz * s / L), p1 = P(a[0] + dx * s / L, h, a[1] + dz * s / L); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); } ctx.stroke(); ctx.restore(); }
  }
  for (var i = 0; i <= n; i++) { var f = i / n; prism(ctx, a[0] + dx * f, a[1] + dz * f, 0, h + 0.08, 0.05, 0.05, 5, 0, kind === 'wood' ? [70, 54, 42] : [120, 104, 70], { snow: 0 }); }
  if (kind !== 'wood') {
    ctx.lineCap = 'round';
    [0.3, h * 0.62, h - 0.05].forEach(function (y) { var p0 = P(a[0], y, a[1]), p1 = P(b[0], y, b[1]); ctx.strokeStyle = S ? '#000' : rgb(shade(col, [0, 0.5, -1])); ctx.lineWidth = Math.max(0.4, 0.05 * p0.k); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); if (SEA.snow && !S) { ctx.strokeStyle = rgb(mulc(SNOW, lightTint(1))); ctx.lineWidth = Math.max(0.3, 0.03 * p0.k); ctx.beginPath(); ctx.moveTo(p0.x, p0.y - 0.4); ctx.lineTo(p1.x, p1.y - 0.4); ctx.stroke(); } });
    if (!S) { var m = Math.round(L / 0.3); ctx.strokeStyle = rgb(shade(col, [0.3, 0.3, -1])); ctx.lineWidth = Math.max(0.3, 0.03 * P(a[0], 0, a[1]).k); ctx.beginPath(); for (var j = 0; j <= m; j++) { var g = j / m, x = a[0] + dx * g, z = a[1] + dz * g, q0 = P(x, 0.1, z), q1 = P(x, h * 0.85, z); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); } ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
}
/* 天水桶: a rain barrel with a pyramid of fire buckets on it */
function rainBarrel(ctx, p3) {
  var x = p3[0], z = p3[2]; prism(ctx, x, z, 0, 0.9, 0.36, 0.38, 10, 0, [118, 88, 60], { tex: 0.4 });
  if (sil()) return;
  var c = P(x, 0.9, z), k = c.k; ctx.fillStyle = rgb(shade([30, 40, 46], [0, 1, 0])); ctx.beginPath(); ctx.ellipse(c.x, c.y, 0.33 * k, 0.33 * k * CAM.s, 0, 0, TAU); ctx.fill();
  [[-0.16, 0], [0.16, 0], [0, 1]].forEach(function (q) { var b = P(x + q[0], 0.92 + q[1] * 0.24, z), kk = b.k; ctx.fillStyle = rgb(shade([196, 60, 40], [0.3, 0.3, -1])); ctx.beginPath(); ctx.moveTo(b.x - 0.13 * kk, b.y); ctx.lineTo(b.x + 0.13 * kk, b.y); ctx.lineTo(b.x + 0.1 * kk, b.y - 0.22 * kk); ctx.lineTo(b.x - 0.1 * kk, b.y - 0.22 * kk); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgb(shade([230, 220, 200], [0.3, 0.3, -1])); ctx.fillRect(b.x - 0.06 * kk, b.y - 0.16 * kk, 0.12 * kk, 0.06 * kk); });
}
/* 大八車: a two-wheeled handcart, maybe loaded */
function handcart(ctx, x, z, ang, load) {
  var B = BF(x, z, [Math.cos(ang), Math.sin(ang)], 0), S = sil();
  boxIn(ctx, B, -1.4, 1.0, -0.55, 0.55, 0.62, 0.72, [120, 94, 66]);
  [-1, 1].forEach(function (sd) { var c = B.L(0, sd * 0.62, 0.55), p = Pa(c), k = p.k; if (S) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.55 * k * Math.abs(B.u[0]) + 0.1 * k, 0.55 * k, 0, 0, TAU); ctx.fill(); return; } ctx.strokeStyle = rgb(shade([90, 70, 50], [0, 0.3, -1])); ctx.lineWidth = Math.max(0.4, 0.07 * k); ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(0.6, 0.55 * k * Math.abs(B.u[0])), 0.55 * k, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = Math.max(0.3, 0.03 * k); ctx.beginPath(); ctx.moveTo(p.x, p.y - 0.55 * k); ctx.lineTo(p.x, p.y + 0.55 * k); ctx.moveTo(p.x - 0.55 * k * Math.abs(B.u[0]), p.y); ctx.lineTo(p.x + 0.55 * k * Math.abs(B.u[0]), p.y); ctx.stroke(); });
  beam3(ctx, B.L(-1.4, -0.4, 0.68), B.L(-2.4, -0.4, 0.35), 0.07, shade([110, 86, 60], [0, 1, 0])); beam3(ctx, B.L(-1.4, 0.4, 0.68), B.L(-2.4, 0.4, 0.35), 0.07, shade([110, 86, 60], [0, 1, 0]));
  if (load) for (var i = 0; i < 3; i++) { var b = B.L(-0.9 + i * 0.75, 0, 0.72); prism(ctx, b[0], b[2], 0.72, 1.12, 0.3, 0.3, 8, 0, [196, 168, 110]); }
}
/* 俵: straw rice bales, stacked */
function bales(ctx, x, z, n) {
  for (var i = 0; i < n; i++) { var row = i < 3 ? 0 : 1, c = row ? i - 3 : i; prism(ctx, x + (c - 1) * 0.62 + row * 0.31, z + (i % 2) * 0.1, row * 0.5, row * 0.5 + 0.52, 0.3, 0.3, 9, 0.2, [196, 170, 112], { tex: 0.5 }); }
}
/* a laundry pole on two forked posts, with cloth hung out to dry */
function laundry(ctx, a, b) {
  var S = sil(); [a, b].forEach(function (q) { prism(ctx, q[0], q[1], 0, 1.9, 0.04, 0.04, 5, 0, [130, 112, 80], { snow: 0 }); });
  var p0 = P(a[0], 1.85, a[1]), p1 = P(b[0], 1.85, b[1]), k = p0.k; ctx.strokeStyle = S ? '#000' : rgb(shade([176, 160, 104], [0, 1, 0])); ctx.lineWidth = Math.max(0.3, 0.04 * k); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  if (S || SEA.snow) return;
  var cols = [[236, 232, 220], [52, 66, 110], [196, 120, 80], [236, 232, 220]];
  for (var i = 0; i < 4; i++) { var f = 0.12 + i * 0.22, x = lerp(p0.x, p1.x, f), y = lerp(p0.y, p1.y, f), w = (p1.x - p0.x) * 0.16; ctx.fillStyle = rgb(shade(cols[i], [0.2, 0.2, -1])); ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 + 0.05 * k, y + 0.7 * k); ctx.lineTo(x - w / 2 + 0.05 * k, y + 0.75 * k); ctx.closePath(); ctx.fill(); }
}
/* a standing signboard in front of a shop */
function standSign(ctx, p3, W0, seed) {
  var S = sil(), b = p3, c0 = P(b[0], 0, b[2]), c1 = P(b[0], 1.25, b[2]), k = c0.k, r = mulberry32(seed);
  if (S) { ctx.fillStyle = '#000'; ctx.fillRect(c1.x - 0.2 * k, c1.y, 0.4 * k, c0.y - c1.y); return; }
  ctx.fillStyle = rgb(lit([58, 44, 36], W0.n)); ctx.fillRect(c1.x - 0.22 * k, c1.y, 0.44 * k, (c0.y - c1.y) * 0.95);
  ctx.fillStyle = rgb(lit(r() < 0.5 ? [236, 226, 200] : [214, 196, 150], W0.n)); ctx.fillRect(c1.x - 0.16 * k, c1.y + 0.08 * k, 0.32 * k, (c0.y - c1.y) * 0.62);
  ctx.strokeStyle = rgb(lit([40, 30, 26], W0.n)); ctx.lineWidth = Math.max(0.3, 0.04 * k); ctx.beginPath(); ctx.moveTo(c1.x, c1.y + 0.18 * k); ctx.lineTo(c1.x, c1.y + 0.7 * k); ctx.moveTo(c1.x - 0.08 * k, c1.y + 0.35 * k); ctx.lineTo(c1.x + 0.08 * k, c1.y + 0.3 * k); ctx.stroke();
}
/* the props of the town, placed by what stands at this stage */
function placeProps(put) {
  if (F.farm) {
    var fb = farmFrame();
    put(FARM.x, FARM.z - 7.5, { draw: function (c) { fence(c, [FARM.x - 8.5, FARM.z - 8], [FARM.x - 2.5, FARM.z - 8.3], 1.1, 'bamboo'); fence(c, [FARM.x + 1.5, FARM.z - 8.4], [FARM.x + 6.5, FARM.z - 8.2], 1.1, 'bamboo'); }, driftLine: [[[FARM.x - 8.5, FARM.z - 8], [FARM.x - 2.5, FARM.z - 8.3]], [[FARM.x + 1.5, FARM.z - 8.4], [FARM.x + 6.5, FARM.z - 8.2]]] });
    put(FARM.x + 7.5, FARM.z - 2, { draw: function (c) { bales(c, FARM.x + 7.5, FARM.z - 2, 5); }, drift: 0.9 });
  }
  if (F.teahouse) { var tb = teaFrame(), hp = tb.L(-4.6, -1.5, 0); put(hp[0], hp[2], { draw: function (c) { handcart(c, hp[0], hp[2], 0.9, true); }, drift: 0.7 }); }
  if (F.shrine) put(SHRINE.x, SHRINE.z - 3, { draw: function (c) { fence(c, [SHRINE.x - 3, SHRINE.z - 2.6], [SHRINE.x + 3, SHRINE.z - 3.2], 0.8, 'wood'); }, driftLine: [[[SHRINE.x - 3, SHRINE.z - 2.6], [SHRINE.x + 3, SHRINE.z - 3.2]]] });
  if (F.nagaya) { var l0 = stPt(13.4, 33.6), l1 = stPt(13.2, 36.9); put(l0[0], l0[1], { draw: function (c) { laundry(c, l0, l1); } }); }
  if (F.landing) { var lb = landingGeom().B, bp = lb.L(4.6, 1.6, 0); put(bp[0], bp[2], { draw: function (c) { bales(c, bp[0], bp[2], 5); }, drift: 0.8 }); }
  if (F.market) put(MARKET.x + 7, MARKET.z - 2, { draw: function (c) { handcart(c, MARKET.x + 7, MARKET.z - 2, -0.4, true); }, drift: 0.7 });
  if (F.kura) { var kp = krPt(12, RIVER_HW + 1.8); put(kp[0], kp[1], { draw: function (c) { bales(c, kp[0], kp[1], 3); }, drift: 0.7 }); }
  // rain barrels and standing signs at the shopfronts
  doorList().forEach(function (d, i) {
    if (d.kind === 'temple' || d.kind === 'mill' || d.kind === 'nagaya') return;
    var key = doorKey(d) - 0.04;
    if (i % 2 === 0) { var rb = d.W.at(d.s1 + 0.7, 0, 0.55); put(rb[0], rb[2], { draw: function (c) { rainBarrel(c, rb); }, key: key, drift: 0.55 }); }
    else if (d.kind === 'machiya' || d.kind === 'shoka' || d.kind === 'inn') { var sg = d.W.at(d.s0 - 0.6, 0, 0.9); put(sg[0], sg[2], { draw: function (c) { standSign(c, sg, d.W, i); }, key: key, drift: 0.4 }); }
  });
}

/* ---- 05_ground.js ---- */
/* ================= ground pass (per pixel, scalar maths, time-sliced by rows) ================= */
var DAY_TINT = (function () { var l = LIGHTS.day, d = l.sun[1] * 0.95; return [l.amb[0] + l.sunc[0] * d, l.amb[1] + l.sunc[1] * d, l.amb[2] + l.sunc[2] * d]; })();
var YARDS = [];           // footprints registered by the scene (worn earth around buildings)
var GG = { x0: -82, z0: -24, st: 0.5, x1: 82, z1: 130 };
var GROUND_FAR = 100;
/* catmull-rom resample of an open polyline */
function smoothPoly(pts, n) {
  var out = [], N = pts.length;
  for (var i = 0; i < N - 1; i++) {
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(N - 1, i + 2)];
    for (var k = 0; k < n; k++) {
      var t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[N - 1]); return out;
}
var ROAD_S = smoothPoly(ROAD, 6), TRACK_S = smoothPoly(TRACK, 6), RIVST_S = smoothPoly(RIVST, 6), SIDE_S = smoothPoly(SIDE_PATH, 6), SHR_S = smoothPoly(SHRINE_PATH, 4), RIVER_S = smoothPoly(RIVER_PTS, 8);
/* the river's meander: a gentle wobble of the centreline */
(function () { for (var i = 0; i < RIVER_S.length; i++) { var p = RIVER_S[i]; p[0] += 1.2 * Math.sin(p[1] * 0.09 + 1); p[1] += 0.9 * Math.sin(p[0] * 0.07); } })();
function segD(px, pz, ax, az, bx, bz) { var dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = clamp(((px - ax) * dx + (pz - az) * dz) / l2); var ex = ax + dx * t - px, ez = az + dz * t - pz; return Math.sqrt(ex * ex + ez * ez); }
function polyD(poly, x, z) { var d = 1e9; for (var i = 0; i < poly.length - 1; i++) d = Math.min(d, segD(x, z, poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1])); return d; }
/* distance field of a polyline on the grid, only near it */
function distField(nx, nz, poly, R) {
  var f = new Float32Array(nx * nz); f.fill(R);
  for (var s = 0; s < poly.length - 1; s++) {
    var a = poly[s], b = poly[s + 1];
    var i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - R - GG.x0) / GG.st)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + R - GG.x0) / GG.st));
    var j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - R - GG.z0) / GG.st)), j1 = Math.min(nz - 1, Math.ceil((Math.max(a[1], b[1]) + R - GG.z0) / GG.st));
    for (var j = j0; j <= j1; j++) { var z = GG.z0 + j * GG.st; for (var i = i0; i <= i1; i++) { var k = j * nx + i, d = segD(GG.x0 + i * GG.st, z, a[0], a[1], b[0], b[1]); if (d < f[k]) f[k] = d; } }
  }
  return f;
}
function paddyLocal(P0, x, z) {
  var c = Math.cos(P0.rot), s = Math.sin(P0.rot), dx = x - P0.x0, dz = z - P0.z0;
  return [dx * c + dz * s, -dx * s + dz * c];
}
function paddyW(P0) { return (P0.x1 - P0.x0); }
function paddyD(P0) { return (P0.z1 - P0.z0); }
/* paddy cell under (x,z): {i,j,fu,fv,edge} or null */
function paddyAt(P0, x, z) {
  var l = paddyLocal(P0, x, z), u = l[0], v = l[1];
  if (u < 0 || v < 0 || u > paddyW(P0) || v > paddyD(P0)) return null;
  var i = Math.floor(u / P0.cw), j = Math.floor(v / P0.cd), fu = u - i * P0.cw, fv = v - j * P0.cd;
  return { i: i, j: j, fu: fu, fv: fv, e: Math.min(fu, P0.cw - fu, fv, P0.cd - fv) };
}
function riverD(x, z) { return polyD(RIVER_S, x, z) - RIVER_HW; }
function Ggn(a, k) { return a[k]; }
function groundSetup() {
  var lt = lightTint(1), gi = [lt[0] / DAY_TINT[0], lt[1] / DAY_TINT[1], lt[2] / DAY_TINT[2]];
  var sky = mixc(LIT.skyHor, LIT.skyTop, 0.35);
  var skyP = mixc(mixc(LIT.skyTop, SEA.sky, 0.3), LIT.skyHor, 0.3);
  return { gi: gi, sky: sky, skyP: skyP, snow: SEA.snow, grid: buildGrid(), Lh: norm([SUN[0], 0, SUN[2]]) };
}
function roadW() { return F.street ? 2.3 : 1.5; }
function trackW() { return F.machiya ? STREET_HW + 0.2 : F.street ? 3.4 : F.stoneBridge ? 1.3 : 0.95; }
function buildGrid() {
  var nx = Math.ceil((GG.x1 - GG.x0) / GG.st) + 2, nz = Math.ceil((GG.z1 - GG.z0) / GG.st) + 2, N = nx * nz;
  var soil = new Float32Array(N), grass = new Float32Array(N), snow = new Float32Array(N), gnz = new Float32Array(N), path = new Float32Array(N), yard = new Float32Array(N), patch = new Float32Array(N), trk = new Float32Array(N);
  var n2 = NZ.n2, fbm = NZ.fbm, i, j;
  for (j = 0; j < nz; j++) {
    var z = GG.z0 + j * GG.st;
    for (i = 0; i < nx; i++) {
      var x = GG.x0 + i * GG.st, k = j * nx + i;
      soil[k] = fbm(x * 0.09, z * 0.09, 3); grass[k] = fbm(x * 0.07 + 3, z * 0.07 + 9, 3);
      if (SEA.snow) snow[k] = fbm(x * 0.12 + 3, z * 0.12 - 2, 2);
      gnz[k] = n2(x * 0.25, z * 0.25 + 70); patch[k] = n2(x * 0.19 + 4, z * 0.19 - 3) * 0.65 + n2(x * 0.5 - 7, z * 0.5) * 0.35;
    }
  }
  // paths: signed distance to the worn edge (negative inside), the widest wins
  var R = 7, dR = distField(nx, nz, ROAD_S, R), dT = distField(nx, nz, TRACK_S, R), dSh = F.shrine ? distField(nx, nz, SHR_S, R) : null, dS = F.sign ? distField(nx, nz, SIDE_S, R) : null, dV = F.rivst ? distField(nx, nz, RIVST_S, R) : null;
  var rw = roadW(), tw = trackW(), sw = F.shrine ? 0.85 : 0.5, vw = F.machiya ? 3.6 : 2.6;
  var dC = distField(nx, nz, RIVER_S, 12);
  var chan = new Float32Array(N);
  for (i = 0; i < N; i++) {
    var p = dR[i] - rw, q = dT[i] - tw; if (q < p) p = q;
    if (dS) { q = dS[i] - sw; if (q < p) p = q; }
    if (dSh) { q = dSh[i] - 0.8; if (q < p) p = q; }
    if (dV) { q = dV[i] - vw; if (q < p) p = q; }
    path[i] = p; chan[i] = dC[i] - RIVER_HW; trk[i] = F.street ? Math.min(dT[i], dV ? dV[i] : 99) : 99;
  }
  // worn yards around buildings and the market square
  for (var y = 0; y < YARDS.length; y++) {
    var Y = YARDS[y], pad = Y.pad || 1.5, ext = Math.max(Y.w, Y.d) / 2 + pad + 1;
    var i0 = Math.max(0, Math.floor((Y.x - ext - GG.x0) / GG.st)), i1 = Math.min(nx - 1, Math.ceil((Y.x + ext - GG.x0) / GG.st));
    var j0 = Math.max(0, Math.floor((Y.z - ext - GG.z0) / GG.st)), j1 = Math.min(nz - 1, Math.ceil((Y.z + ext - GG.z0) / GG.st));
    for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) {
      var dx = GG.x0 + i * GG.st - Y.x, dz = GG.z0 + j * GG.st - Y.z, a = Math.abs(dx * Y.u[0] + dz * Y.u[1]) - Y.w / 2, b = Math.abs(dx * Y.v[0] + dz * Y.v[1]) - Y.d / 2;
      var dd = Math.max(a, b), v = (1 - sstep(0, pad, dd)) * (Y.k || 1); if (v > yard[j * nx + i]) yard[j * nx + i] = v;
    }
  }
  // the town: ground worn to packed earth along its streets, on the far bank
  if (F.town > 0) {
    var tR = 6 + 16 * F.town + 8, dTk = distField(nx, nz, TRACK, tR), dRv = F.rivst ? distField(nx, nz, RIVST, tR) : null;
    for (j = Math.max(0, Math.floor((40 - GG.z0) / GG.st)); j < nz; j++) for (i = 0; i < nx; i++) {
      var k2 = j * nx + i, x3 = GG.x0 + i * GG.st, z3 = GG.z0 + j * GG.st, side = (x3 - BR.x) * BR.ax[0] + (z3 - BR.z) * BR.ax[1];
      if (side < 6) continue;
      var dd2 = Math.min(dTk[k2], dRv ? dRv[k2] : 99) + (Ggn(gnz, k2) - 0.5) * 6, tv = F.town * (1 - sstep(6, 6 + 16 * F.town, dd2 + 7 - Math.min(7, (side - 6) * 1.2))) * 0.85;
      if (tv > yard[k2]) yard[k2] = tv;
    }
  }
  if (F.market) {
    for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) { var ex = (GG.x0 + i * GG.st - MARKET.x) / MARKET.rx, ez = (GG.z0 + j * GG.st - MARKET.z) / MARKET.rz, e = Math.sqrt(ex * ex + ez * ez), mv = 1 - sstep(0.85, 1.15, e); if (mv > yard[j * nx + i]) yard[j * nx + i] = mv; }
  }
  return { nx: nx, nz: nz, soil: soil, grass: grass, snow: snow, gnz: gnz, path: path, chan: chan, yard: yard, patch: patch, trk: trk };
}
/* scalar ramp into out[0..2] */
function rampS(p, t, out) { t = t < 0 ? 0 : t > 1 ? 1 : t; t *= p.length - 1; var i = t | 0; if (i > p.length - 2) i = p.length - 2; var f = t - i, a = p[i], b = p[i + 1]; out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f; }
function groundRows(D, M, PW, y0, y1, S) {
  var gi = S.gi, snow = S.snow, sky = S.sky, skyP = S.skyP, Lhx = S.Lh[0], Lhz = S.Lh[2];
  var s0 = SEA.soil[0], s1 = SEA.soil[1], g0 = SEA.grass[0], g1 = SEA.grass[1], grassAmt = SEA.grassAmt, flw = SEA.flowers;
  var rc = SEA.river, haze = LIT.haze, hazeK = LIT.hazeK, pmode = SEA.paddy, paddyOn = F.paddy, town = F.town, street = F.street, gutter = F.machiya;
  var n2 = NZ.n2, fbm = NZ.fbm;
  var GD = S.grid, gnx = GD.nx, gst = GD.nz, Gsoil = GD.soil, Ggrass = GD.grass, Gsnow = GD.snow, Ggnz = GD.gnz, Gpath = GD.path, Gchan = GD.chan, Gyard = GD.yard, Gpatch = GD.patch, Gtrk = GD.trk, ist = 1 / GG.st;
  var wet = F.wet || F.after, damp = F.wet ? 1 : 0.35, typh = F.wx === 'typhoon', bliz = F.wx === 'blizzard' && snow, puddle = 0, iceA = 0;
  var dryK = SEA.name === 'autumn' ? 1 : SEA.name === 'summer' ? 0.55 : SEA.name === 'spring' ? 0.4 : 0.8, dryC = mixc(SEA.soil[1], [196, 176, 120], 0.5);
  for (var py = y0; py < y1; py++) {
    var sy = (py + 0.5) / KS, b = -(sy - CAM.cy) / CAM.F, dy = -CAM.s + b * CAM.c, rowk = py * PW * 4, px;
    if (dy >= 0) { for (px = 0; px < PW; px++) D[rowk + px * 4 + 3] = 0; continue; }
    var t = -CAM.y / dy, z = CAM.z + t * (CAM.c + b * CAM.s), fp = t / (CAM.F * KS) * 1.9;
    if (z > GROUND_FAR + 4) { for (px = 0; px < PW; px++) D[rowk + px * 4 + 3] = 0; continue; }
    var hz = clamp((t - 200) / 140) * 0.4 * hazeK;
    var tx = t / CAM.F, x0 = CAM.x - tx * CAM.cx;
    var fz = (z - GG.z0) * ist, iz = fz | 0; if (iz < 0) iz = 0; if (iz > gst - 2) iz = gst - 2; var tz = fz - iz; if (tz > 1) tz = 1; if (tz < 0) tz = 0; var zo = iz * gnx;
    var alphaRow = 255 * (1 - sstep(GROUND_FAR - 6, GROUND_FAR, z));
    for (px = 0; px < PW; px++) {
      var k = rowk + px * 4, x = x0 + tx * (px + 0.5) / KS;
      var fx = (x - GG.x0) * ist, ix = fx | 0; if (ix < 0) ix = 0; if (ix > gnx - 2) ix = gnx - 2; var tq = fx - ix; if (tq > 1) tq = 1; if (tq < 0) tq = 0;
      var i00 = zo + ix, i10 = i00 + 1, i01 = i00 + gnx, i11 = i01 + 1, w00 = (1 - tq) * (1 - tz), w10 = tq * (1 - tz), w01 = (1 - tq) * tz, w11 = tq * tz;
      var gr = hash2(px, py), a;
      // soil
      var n1 = Gsoil[i00] * w00 + Gsoil[i10] * w10 + Gsoil[i01] * w01 + Gsoil[i11] * w11, nn2 = n2(x * 1.3, z * 1.3), f = n1 * 0.9 + nn2 * 0.3 - 0.1; f = f < 0 ? 0 : f > 1 ? 1 : f;
      var sk = 0.92 + gr * 0.14, r = (s0[0] + (s1[0] - s0[0]) * f) * sk, g = (s0[1] + (s1[1] - s0[1]) * f) * sk, bl = (s0[2] + (s1[2] - s0[2]) * f) * sk;
      // meadow grass
      var gN = Ggrass[i00] * w00 + Ggrass[i10] * w10 + Ggrass[i01] * w01 + Ggrass[i11] * w11;
      var ga = clamp(0.62 + (gN - 0.5) * 1.6) * grassAmt * (fp < 0.3 ? 0.82 + 0.18 * n2(x * 3.1, z * 1.2) : 0.91);
      var fine = 1 - clamp(fp / 0.16), clump = n2(x * 1.7 + 3, z * 1.7), blades = fine > 0 ? n2(x * 7.3, z * 2.1) * 0.6 + n2(x * 15, z * 4.2) * 0.4 : 0.5;
      var gf = clamp(n2(x * 0.6, z * 0.6) * 0.5 + (fp < 0.3 ? n2(x * 4.2, z * 1.6) : 0.5) * 0.35 + gr * 0.25 - 0.05 + (blades - 0.5) * 0.55 * fine);
      if (clump > 0.62) gf *= 1 - (clump - 0.62) * 1.1;
      var gR = g0[0] + (g1[0] - g0[0]) * gf, gG = g0[1] + (g1[1] - g0[1]) * gf, gB = g0[2] + (g1[2] - g0[2]) * gf;
      var pt = Gpatch[i00] * w00 + Gpatch[i10] * w10 + Gpatch[i01] * w01 + Gpatch[i11] * w11;
      if (pt > 0.55) { var lk = Math.min(1, (pt - 0.55) * 2.4); gR *= 1 - lk * 0.42; gG *= 1 - lk * 0.26; gB *= 1 - lk * 0.4; }        // lush dark tussocks
      else if (pt < 0.42) { var dk2 = Math.min(0.7, (0.42 - pt) * 2.6 * dryK); gR += (dryC[0] - gR) * dk2; gG += (dryC[1] - gG) * dk2; gB += (dryC[2] - gB) * dk2; }   // drier, paler grass
      if (fp < 0.22 && gr > 0.86) { var sp2 = (gr - 0.86) * 4; gR *= 1 - sp2 * 0.35; gG *= 1 - sp2 * 0.25; gB *= 1 - sp2 * 0.3; }   // seed heads and shadowed stems
      r += (gR - r) * ga; g += (gG - g) * ga; bl += (gB - bl) * ga;
      if (flw && ga > 0.5 && gr > 0.93 && fp < 0.12) { var fc = flw[(hash2(px + 3, py) * 3) | 0], fa = (gr - 0.93) * 9 * (1 - fp / 0.12); if (n2(x * 0.3 + 9, z * 0.3) > 0.52) { r += (fc[0] - r) * fa; g += (fc[1] - g) * fa; bl += (fc[2] - bl) * fa; } }
      // paddies
      var pw = 0;
      if (paddyOn) {
        var pc = z < 24 ? (x > 0 ? paddyAt(PADDY_R, x, z) : paddyAt(PADDY_L, x, z)) : null;
        if (pc) {
          var P0 = x > 0 ? PADDY_R : PADDY_L, pidx = pc.i * 31 + pc.j * 7 + (x > 0 ? 0 : 100), hv = hash2(pc.i + (x > 0 ? 0 : 50), pc.j + 13);
          var bordE = Math.min(pc.e, 9);
          var inP = sstep(0.28, 0.28 + Math.max(0.05, fp), bordE);
          if (hv > 0.9 || (x > 0 && Math.abs(x - TORII.x) < 7 && z > 4)) inP = 0;   // a few plots left as meadow; the shrine approach
          if (inP > 0) {
            var pr, pg, pb, lr = 1 - clamp(fp / 0.32);
            var rowp = Math.sin(pc.fu * 18.5) * 0.5 + 0.5;
            if (pmode === 'flood') {
              var wv = fbm(x * 0.3 + 4, z * 1.2, 2), ref = clamp(0.48 + 0.25 * clamp((z + 10) / 40) + (wv - 0.5) * 0.25);
              pr = 64 + (skyP[0] - 64) * ref; pg = 76 + (skyP[1] - 76) * ref; pb = 70 + (skyP[2] - 70) * ref;
              var sd = ((rowp > 0.72 ? 1 : 0) * lr * 0.55 + (1 - lr) * 0.12) * (SEA.seedlings === undefined ? 1 : SEA.seedlings);
              pr += (110 - pr) * sd; pg += (156 - pg) * sd; pb += (64 - pb) * sd;
              pw = inP * 0.9;
            } else if (pmode === 'green') {
              var gv = n2(x * 0.8 + hv * 9, z * 0.8), wl = clamp((0.35 - rowp) * 2) * lr * 0.5 * clamp(1 - gv);
              pr = 46 + 30 * gv + 20 * rowp; pg = 92 + 40 * gv + 26 * rowp; pb = 34 + 16 * gv;
              pr += (sky[0] * 0.75 - pr) * wl; pg += (sky[1] * 0.78 - pg) * wl; pb += (sky[2] * 0.8 - pb) * wl;
              pw = inP * wl;
            } else if (pmode === 'gold') {
              var cutF = F.prog === undefined ? 0.32 : F.prog < 0.125 ? 0.05 : F.prog < 0.375 ? 0.32 : F.prog < 0.625 ? 0.8 : 1.01, harvested = hv < cutF, gv2 = n2(x * 0.9 + hv * 7, z * 0.9);
              if (harvested) { var st2 = rowp > 0.6 && hash2(px >> 1, py) > 0.4 ? 0.75 : 1; pr = (150 + 30 * gv2) * st2; pg = (126 + 24 * gv2) * st2; pb = (80 + 16 * gv2) * st2; }
              else { var hd = rowp * lr * 0.25; pr = 196 + 36 * gv2 - 50 * hd; pg = 154 + 34 * gv2 - 46 * hd; pb = 58 + 20 * gv2 - 20 * hd; }
            } else {
              var st3 = (rowp > 0.7 && hash2(px, py >> 1) > 0.3) ? 0.7 : 1; pr = 116 * st3 + gr * 16; pg = 100 * st3 + gr * 12; pb = 80 * st3 + gr * 10;
            }
            r += (pr - r) * inP; g += (pg - g) * inP; bl += (pb - bl) * inP;
          }
          // levees: a light ridge with a shaded side
          if (pc.e < 0.7) {
            var lv = 1 - sstep(0.25, 0.28 + Math.max(0.05, fp), pc.e), sideL = (pc.fv < 0.5 ? -1 : pc.fv > P0.cd - 0.5 ? 1 : 0);
            var lk = 0.92 + 0.12 * gr + (sideL < 0 ? 0.08 : sideL > 0 ? -0.1 : 0);
            r += ((g0[0] + g1[0]) * 0.5 * lk - r) * lv * 0.8; g += ((g0[1] + g1[1]) * 0.5 * lk - g) * lv * 0.8; bl += ((g0[2] + g1[2]) * 0.5 * lk - bl) * lv * 0.8;
          }
        }
      }
      // a vegetable field beside the road: rapeseed in spring, greens in summer, daikon in autumn, bare rows in winter
      if (paddyOn && x > FIELD.x0 && x < FIELD.x1 && z > FIELD.z0 && z < FIELD.z1) {
        var fe = Math.min(x - FIELD.x0, FIELD.x1 - x, z - FIELD.z0, FIELD.z1 - z) + (n2(x * 1.6, z * 1.6) - 0.5) * 0.35, fa = sstep(0.15, 0.5, fe) * 0.95, rw = Math.sin((x * 0.8 + z * 0.55) * 7.5) * 0.5 + 0.5, fl2 = n2(x * 2.5, z * 2.5), cr, cg, cb;
        if (pmode === 'flood' || SEA.rape !== undefined) { var yl = (SEA.rape === undefined ? 1 : SEA.rape) * clamp(0.62 + 0.38 * (n2(x * 3.3, z * 3.3) - 0.5) * 2 + 0.22 * Math.sin(z * 12.5) * (1 - clamp(fp / 0.3)) + (gr - 0.5) * 0.3); cr = (226 + 24 * fl2) * yl + 96 * (1 - yl); cg = (196 + 24 * fl2) * yl + 132 * (1 - yl); cb = 56 * yl + 54 * (1 - yl); }
        else if (pmode === 'green') { var gq = clamp(0.7 + (n2(x * 3, z * 3) - 0.5) * 0.6 + (rw - 0.5) * 0.35 * (1 - clamp(fp / 0.3))); cr = (60 + 30 * fl2) * gq + 120 * (1 - gq); cg = (110 + 30 * fl2) * gq + 98 * (1 - gq); cb = 40 * gq + 70 * (1 - gq); }
        else if (pmode === 'gold') { var dq2 = clamp(0.6 + (n2(x * 3, z * 3) - 0.5) * 0.6 + (rw - 0.5) * 0.35 * (1 - clamp(fp / 0.3))); cr = (80 + 20 * fl2) * dq2 + 132 * (1 - dq2); cg = (120 + 20 * fl2) * dq2 + 106 * (1 - dq2); cb = 54 * dq2 + 78 * (1 - dq2); }
        else { cr = rw > 0.5 ? 120 : 98; cg = rw > 0.5 ? 100 : 82; cb = rw > 0.5 ? 80 : 66; }
        r += (cr - r) * fa; g += (cg - g) * fa; bl += (cb - bl) * fa;
      }
      // worn yards and the market square
      var yd = Gyard[i00] * w00 + Gyard[i10] * w10 + Gyard[i01] * w01 + Gyard[i11] * w11;
      if (yd > 0.01) {
        a = clamp(yd * (0.8 + 0.4 * (n2(x * 0.7, z * 0.7) - 0.5)) * 1.15);
        var etex = n2(x * 2.6, z * 2.6) * 0.6 + (fp < 0.16 ? n2(x * 9, z * 9) * 0.4 * (1 - fp / 0.16) : 0.2), er = 160 + 22 * nn2 + 22 * (etex - 0.5), eg = 144 + 18 * nn2 + 18 * (etex - 0.5), eb = 116 + 14 * nn2 + 14 * (etex - 0.5);
        var mo = n2(x * 0.55 + 7, z * 0.55); if (mo > 0.6) { var dm = (mo - 0.6) * 0.5; er *= 1 - dm; eg *= 1 - dm * 0.9; eb *= 1 - dm * 0.8; } else if (mo < 0.36) { var lm = (0.36 - mo) * 0.35; er += (226 - er) * lm; eg += (212 - eg) * lm; eb += (186 - eb) * lm; }
        r += (er * sk - r) * a; g += (eg * sk - g) * a; bl += (eb * sk - bl) * a;
      }
      // roads, the street and footpaths
      var pd = Gpath[i00] * w00 + Gpath[i10] * w10 + Gpath[i01] * w01 + Gpath[i11] * w11;
      if (pd > 0 && pd < 0.9 && ga > 0.2 && !snow) { var ge2 = (1 - pd / 0.9) * (0.5 + 0.5 * n2(x * 6, z * 6)) * 0.22; r *= 1 - ge2; g *= 1 - ge2 * 0.6; bl *= 1 - ge2; }
      if (pd < 1.2) {
        var pa = 1 - sstep(-0.6, 0.6 + fp * 0.5, pd + (Ggnz[i00] - 0.5) * 0.8 + (pd > -0.7 && fp < 0.3 ? (n2(x * 3.3, z * 3.3) - 0.5) * 0.7 * (1 - fp / 0.3) : 0));
        if (pa > 0) {
          var dr = 176 + 26 * nn2, dg = 156 + 22 * nn2, db = 120 + 18 * nn2;
          if (!street || z < 31) { // ruts and a grassy crown on the country road
            var mid = -pd; if (mid > 0.2 && mid < 1.1) { dr *= 0.86; dg *= 0.86; db *= 0.88; }
          }
          var pm = 0.9 + gr * 0.16; if (hash2(px >> 1, py >> 1) > 0.985) pm *= 0.7;
          var mo2 = n2(x * 0.5 + 7, z * 0.5); if (mo2 > 0.62) pm *= 1 - (mo2 - 0.62) * 0.4; else if (mo2 < 0.34) pm *= 1 + (0.34 - mo2) * 0.3;
          if (street) { var td = Gtrk[i00] * w00 + Gtrk[i10] * w10 + Gtrk[i01] * w01 + Gtrk[i11] * w11; if (td < 3.2) { var e1 = (td - 0.95) / 0.17, e2 = (td - 2.35) / 0.22, rut = Math.exp(-e1 * e1) + 0.6 * Math.exp(-e2 * e2); pm *= 1 - rut * 0.13 * (0.6 + 0.8 * n2(x * 1.7, z * 1.7)); } }
          if (fp < 0.25 && gr > 0.975) pm *= hash2(px + 7, py) > 0.5 ? 1.22 : 0.72;   // pebbles
          r += (dr * pm - r) * pa; g += (dg * pm - g) * pa; bl += (db * pm - bl) * pa;
          if (pd > -0.5 && pd < 0.4) { var edg = (1 - Math.abs(pd + 0.05) / 0.45) * 0.12; r *= 1 - edg; g *= 1 - edg; bl *= 1 - edg; }
          if (gutter && pd > -0.5 && pd < -0.08 && z > 44 && yd > 0.3) { // a stone-lined gutter along the shopfronts
            var gt = pd < -0.38 ? 0.85 + 0.25 * hash2(px >> 1, py) : pd > -0.16 ? 0.95 + 0.2 * hash2(px, py >> 1) : 0.45; r *= gt; g *= gt; bl *= gt;
          }
        }
      }
      // rain: soaked earth, darker grass, puddles that mirror the sky (and become water for reflections and ripples)
      puddle = 0;
      if (wet && !snow) {
        var earthy = Math.max(yd > 0.01 ? clamp(yd * 1.2) : 0, pd < 1.2 ? 1 - sstep(-0.6, 0.6, pd) : 0);
        if (earthy > 0) {
          var wk = 1 - 0.3 * earthy * damp; r *= wk; g *= wk; bl *= wk * 1.02;
          var pv = n2(x * 0.3 + 11, z * 0.3 - 4) * 0.72 + n2(x * 1.3, z * 1.3) * 0.28;
          if (pv > (F.wet ? 0.6 : 0.66) && earthy > 0.5) { puddle = sstep(F.wet ? 0.6 : 0.66, F.wet ? 0.66 : 0.71, pv) * earthy; var pr2 = skyP[0] * 0.78, pg2 = skyP[1] * 0.8, pb2 = skyP[2] * 0.84; r += (pr2 - r) * puddle * 0.85; g += (pg2 - g) * puddle * 0.85; bl += (pb2 - bl) * puddle * 0.85; }
        }
        if (ga > 0.3 && F.wet) { var gw = 0.86; r *= gw; g *= gw + 0.03; bl *= gw; }
        if (typh && pc && inP > 0 && (pmode === 'green' || pmode === 'gold')) { var lod = n2(x * 0.5 + z * 0.3, z * 0.25 + x * 0.1); if (lod > 0.52) { var lf = (lod - 0.52) * 2.2; r *= 1 - lf * 0.25; g *= 1 - lf * 0.2; bl *= 1 - lf * 0.15; } }
      }
      // snow cover
      if (snow) {
        var snA = sstep(0.1, 0.2, Gsnow[i00] * w00 + Gsnow[i10] * w10 + Gsnow[i01] * w01 + Gsnow[i11] * w11 + 0.1 - (1 - snow) * 0.3 + (n2(x * 2.3, z * 2.3) - 0.5) * 0.12) * (snow < 1 ? snow * (0.6 + 0.6 * n2(x * 3.7, z * 3.7)) : 1);
        var trod = pd < 0 ? clamp(-pd / 1.2) : 0; snA *= 1 - trod * 0.5;
        var sf = clamp(0.55 + (n2(x * 1.4, z * 1.4) - 0.5) * 0.5 + gr * 0.1), tr2 = trod * (0.5 + 0.5 * n2(x * 2.2, z * 0.6));
        var rip = Math.pow(Math.sin(x * 0.9 + z * 0.35 + (Gsoil[i00] - 0.5) * 12) * 0.5 + 0.5, 3) * (1 - clamp(fp / 0.4)), hol = (Gpatch[i00] - 0.5) * 1.2, sR = 206 + 38 * sf - 40 * tr2 - 22 * rip - 16 * hol, sG = 216 + 31 * sf - 36 * tr2 - 16 * rip - 11 * hol, sB = 232 + 20 * sf - 26 * tr2 - 4 * rip;
        if (tr2 > 0.25) { var sl2 = (tr2 - 0.25) * 0.5 * n2(x * 2.6, z * 1.1); sR -= 46 * sl2; sG -= 46 * sl2; sB -= 40 * sl2; }   // slush in the tracks
        r += (sR - r) * snA; g += (sG - g) * snA; bl += (sB - bl) * snA;
      }
      // the river and the mill race
      var w = 0, isCh = false;
      var wd = Gchan[i00] * w00 + Gchan[i10] * w10 + Gchan[i01] * w01 + Gchan[i11] * w11;
      if (wd < 2 && wd > -2.5) wd += (n2(x * 0.5, z * 0.5) - 0.5) * 0.9;
      if (wd < 1.6) {
        // pebbly bank
        if (wd > -0.2 && !isCh) { var bk = (1 - sstep(0.4, 1.6, wd)) * 0.85, pbv = hash2(px >> 1, (py >> 1) + 5), bb2 = 0.85 + 0.3 * pbv; r += ((150 + 20 * nn2) * bb2 - r) * bk; g += ((142 + 18 * nn2) * bb2 - g) * bk; bl += ((128 + 16 * nn2) * bb2 - bl) * bk; }
        if (wd > -0.25) { var dk = 0.7 + 0.3 * sstep(-0.25, 0.5, wd); r *= dk; g *= dk; bl *= dk; }
        w = 1 - sstep(-fp * 0.6, fp * 0.6, typh ? wd - 0.9 : wd);
        if (w > 0) {
          var dep = clamp(-wd / (isCh ? 0.5 : 4.5)), rip = fbm(x * 0.35 + 30, z * 2.2, 2), dp = Math.pow(dep, 0.7);
          var wr = rc[0] + (24 - rc[0]) * dp, wg = rc[1] + (48 - rc[1]) * dp, wb = rc[2] + (54 - rc[2]) * dp;
          if (typh) { wr = 118 - 18 * dp; wg = 100 - 16 * dp; wb = 74 - 12 * dp; }   // swollen and brown
          if (dep < 0.15) { var sh2 = (0.15 - dep) * 4; wr += (120 - wr) * sh2; wg += (112 - wg) * sh2; wb += (92 - wb) * sh2; }
          var fres = clamp(0.3 + 0.18 * (rip - 0.5) + 0.12 * Math.sin(x * 0.9 + z * 0.3 + rip * 6) * (1 - clamp(fp / 0.3)));
          wr += (sky[0] - wr) * fres; wg += (sky[1] - wg) * fres; wb += (sky[2] - wb) * fres;
          iceA = 0;
          if (bliz) {   // shelves of ice out from both banks, snow drifted over them; pans of ice in the dark open water
            var edgeN = (n2(x * 0.7 + 3, z * 1.9) - 0.5) * 1.2 + (n2(x * 2.6, z * 5.2) - 0.5) * 0.5, shelf = sstep(-2.3 + edgeN, -1.9 + edgeN, wd);
            var pan = n2(x * 0.42 - z * 0.3 + 17, z * 1.5 + x * 0.12) + (n2(x * 2.4, z * 4.1) - 0.5) * 0.16, panA = sstep(0.74, 0.77, pan) * (1 - shelf), rim = sstep(0.71, 0.74, pan) * (1 - sstep(0.74, 0.77, pan)) * (1 - shelf);
            wr *= 0.82; wg *= 0.86; wb *= 0.92;   // cold, dark open water
            iceA = Math.max(shelf, panA);
            var icf = clamp(0.5 + (n2(x * 2, z * 0.8) - 0.5) * 0.9), sd2 = clamp((n2(x * 1.3 + 5, z * 3.1) - 0.35) * 1.6) * shelf;
            var ir = 196 + 40 * icf + 14 * sd2, ig = 208 + 32 * icf + 10 * sd2, ib = 222 + 26 * icf;
            if (shelf > 0 && shelf < 0.9) { ir -= 50 * (1 - shelf) * shelf * 4 * 0.25; ig -= 40 * (1 - shelf) * shelf; ib -= 26 * (1 - shelf) * shelf; }   // the shelf's broken edge
            wr += (ir - wr) * iceA; wg += (ig - wg) * iceA; wb += (ib - wb) * iceA;
            wr += (150 - wr) * rim * 0.5; wg += (168 - wg) * rim * 0.5; wb += (186 - wb) * rim * 0.5;
          } else if (snow) {
            var ice = sstep(-1.6, -0.9, wd) * 0.85;
            if (ice > 0) { var icf = clamp(0.5 + (n2(x * 2, z * 0.8) - 0.5) * 0.8), ir = 186 + 46 * icf, ig = 200 + 38 * icf, ib = 214 + 34 * icf; wr += (ir - wr) * ice; wg += (ig - wg) * ice; wb += (ib - wb) * ice; }
          }
          r += (wr - r) * w; g += (wg - g) * w; bl += (wb - bl) * w;
        }
      }
      r *= gi[0]; g *= gi[1]; bl *= gi[2];
      if (hz > 0) { r += (haze[0] - r) * hz; g += (haze[1] - g) * hz; bl += (haze[2] - bl) * hz; }
      D[k] = r; D[k + 1] = g; D[k + 2] = bl; D[k + 3] = alphaRow;
      if (M) { var mw = Math.max(w * (bliz ? 1 - iceA : snow ? clamp((-wd - 0.9) * 2) : 1), puddle * 0.9); if (mw > 0) M[k + 3] = 255 * mw; }
      iceA = 0;
    }
  }
}

/* ---- 06_scene.js ---- */
/* ================= scene assembly ================= */
function seasonName() { return SEA.name || 'autumn'; }

/* ---------------- trees ---------------- */
/* a town-scale broadleaf tree: fewer, fuller sprays */
/* a town cherry: the spreading structure with blossom filling its heart */
function genTownSakura(seed, x, z, g, hsc) {
  var t = genSakura(seed, x, z, g, 0, hsc, 4), r = mulberry32(seed + 23), mr = 0;
  t.sprays.forEach(function (s) { mr += s.r; }); mr /= Math.max(1, t.sprays.length);
  t.segs.forEach(function (sg) { if (sg.lvl >= 2 && sg.lvl <= 3 && r() < 0.3) t.sprays.push({ p: [sg.b[0], sg.b[1] + mr * 0.15, sg.b[2]], r: mr * (0.75 + r() * 0.3), tone: r() * 2 - 1, lvl: sg.lvl }); });
  return t;
}
function genBroad(seed, x, z, g, hsc) {
  var t = genMaple(seed, x, z, g, 0, hsc, 4), r = mulberry32(seed + 17), mr = 0;
  t.sprays.forEach(function (s) { s.r *= 1.35; mr += s.r; }); mr /= Math.max(1, t.sprays.length);
  // fill the crown's heart: sprays along the inner limbs, so it reads full rather than a ring of puffs
  t.segs.forEach(function (sg) { if (sg.lvl >= 2 && sg.lvl <= 3 && r() < 0.22) t.sprays.push({ p: [sg.b[0], sg.b[1] + mr * 0.2, sg.b[2]], r: mr * (0.7 + r() * 0.3), tone: r() * 2 - 1, lvl: sg.lvl }); });
  return t;
}
function drawBroad(ctx, t, o) {
  o = o || {};
  if (!SEA.broad) { drawBareTree(ctx, t, [[44, 36, 32], [84, 72, 64], [124, 112, 100]]); if (o.fruit) kakiFruit(ctx, t, 0.35); return; }
  var cp = Pa(t.center), cd = cp.d, dab = o.dab || 0.3, dens = (o.density || 1) * 2.6 / (0.6 * 0.0049 * cp.k * cp.k) * (SEA.leafK === undefined ? 1 : 0.15 + 0.85 * SEA.leafK);
  if (SEA.leafK !== undefined && SEA.leafK < 0.1 && !o.pal) { drawBareTree(ctx, t, [[44, 36, 32], [84, 72, 64], [124, 112, 100]]); return; }
  var opt = { pal: o.pal || SEA.broad, kind: 'leaf', dab: dab, cap: (o.cap || 34) / dens * 1, density: dens, accent: o.accent, batch: true };
  paintSprays(ctx, t, function (p) { return p.d > cd + 0.3; }, opt);
  drawBranches(ctx, t.segs, [[44, 36, 32], [84, 72, 64], [124, 112, 100]]);
  paintSprays(ctx, t, function (p) { return p.d <= cd + 0.3; }, opt);
}
/* spray density giving about 2.4 dabs per dab-area of crown at this tree's scale */
function sakDens(t) { var k = Pa(t.center).k; return 2.4 / (0.6 * 0.0049 * k * k); }
function kakiFruit(ctx, t, frac) {
  if (sil()) return;
  var r = mulberry32(t.seed + 3), lt = lightTint(1);
  t.twigs.forEach(function (tw) { if (r() > frac) return; var p = Pa(tw[1]); ctx.fillStyle = rgb(mulc([232, 116, 30], lt)); ctx.beginPath(); ctx.arc(p.x, p.y + 0.3, Math.max(0.5, 0.09 * p.k), 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc([255, 190, 110], lt), 0.8); ctx.beginPath(); ctx.arc(p.x - 0.15, p.y + 0.1, Math.max(0.2, 0.035 * p.k), 0, TAU); ctx.fill(); });
}
function drawWillow(ctx, t) {
  var cd = Pa(t.center).d, pal = SEA.willow, tint = LIT.foliageTint || null, S = sil();
  var st = t.strands.map(function (s) { return { s: s, p: Pa(strandPt(s, 0.5)) }; }).sort(function (a, b) { return b.p.d - a.p.d; });
  function strands(filter) {
    var NB = pal ? pal.length : 1, paths = [], b, lines = new Path2D();
    for (b = 0; b < NB; b++) paths.push(new Path2D());
    for (var i = 0; i < st.length; i++) {
      var s = st[i].s; if (!filter(st[i].p)) continue;
      var N = 10, prev = null, r2 = mulberry32(s.seed);
      for (var k = 0; k <= N; k++) { var q = Pa(strandPt(s, k / N)); if (prev) { lines.moveTo(prev.x, prev.y); lines.lineTo(q.x, q.y); } prev = q; }
      if (!pal || S) continue;
      var nrm = norm([s.s[0] - t.center[0] + s.out[0], 0.4, s.s[2] - t.center[2] + s.out[2]]), lt0 = clamp(0.35 + 0.55 * dot(nrm, SUN));
      for (var d = 0; d < 24 * DQ; d++) {
        var tt = Math.pow(r2(), 0.7), p = Pa(strandPt(s, tt)), sz = 0.07 * p.k / Math.sqrt(DQ), jx = (r2() - 0.5) * 0.12 * p.k;
        var bb = Math.min(NB - 1, Math.round(clamp(lt0 + (r2() - 0.5) * 0.5 - tt * 0.2) * (NB - 1)));
        paths[bb].moveTo(p.x + jx + sz * 0.4, p.y); paths[bb].ellipse(p.x + jx, p.y, sz * 0.4, sz * 1.3, 0.2, 0, TAU);
      }
    }
    ctx.strokeStyle = S ? '#000' : rgb(tc(pal ? [70, 70, 40] : [150, 140, 80], tint)); ctx.lineWidth = S ? 0.5 : 0.3; ctx.stroke(lines);
    if (pal && !S) for (b = 0; b < NB; b++) { ctx.fillStyle = rgb(tc(pal[b], tint)); ctx.fill(paths[b]); }
  }
  strands(function (p) { return p.d > cd + 0.3; });
  drawBranches(ctx, t.segs, [[44, 38, 32], [80, 72, 60], [118, 108, 92]], 1, SEA.snow ? 0.9 : 0);
  strands(function (p) { return p.d <= cd + 0.3; });
}
function genWillow(seed, x, z, sc) {
  var t = genCherry(seed, x, z, 0); var k = sc || 1.6;
  function T(p) { return [x + (p[0] - x) * k, p[1] * k, z + (p[2] - z) * k]; }
  t.segs.forEach(function (s) { s.a = T(s.a); s.b = T(s.b); s.r0 *= k; s.r1 *= k; });
  t.strands.forEach(function (s) { s.s = T(s.s); s.drop *= k; s.reach *= k * 0.6; });
  t.center = T(t.center); t.R *= k; return t;
}

/* ---------------- the plan of the town (shared by the painter and the animation) ---------------- */
function townPlan(Fx) {
  var L = [];
  function st(t, w) { return stPt(t, w); }
  var uW = STREET_DIR, uE = [-STREET_DIR[0], -STREET_DIR[1]], uR = KR_DIR, hw = STREET_HW;
  function add(o, p) { o.x = p[0]; o.z = p[1]; L.push(o); return o; }
  var NC = [[34, 48, 86], [104, 60, 40], [236, 230, 214], [44, 40, 40], [36, 62, 70], [120, 40, 34], [70, 50, 90]];
  // the merchant house on the corner at the bridge foot, its front to the river, its side along the main street
  if (Fx.shoka) add({ type: 'shoka', u: uR, w: 11.4, d: 10.2, seed: 91 }, st(3.9 + 5.1, hw + 5.9));
  // the inn up the main street, west side
  if (Fx.inn) add({ type: 'inn', u: uW, w: 10, d: 10.5, seed: 93 }, st(32.2, hw + 5.25));
  // the back-street tenement behind the riverside row
  if (Fx.nagaya) add({ type: 'nagaya', u: uR, units: 6, seed: 51 }, st(16.6, 24.4));
  if (Fx.machiya) {
    // the main street, west side: shopfronts facing across the street toward the viewer
    [[17.7, 6.0, 0, 5.1], [23.9, 6.2, 1, 5.5]].forEach(function (a) { add({ type: 'machiya', u: uW, w: a[1], d: 8, seed: 200 + a[2], joinL: true, joinR: false, doorLeft: a[2] === 1, sign: true, yE: a[3], udatsu: a[2] === 0, upper: a[2] ? 'koshi' : 'mushiko', ncol: NC[a[2]], hang: true }, st(a[0], hw + 4)); });
    // the riverside street: a continuous row of townhouses facing the water
    [[19.6, 5.6, 4.7], [25.5, 6.0, 5.4], [31.6, 6.2, 4.9], [37.7, 5.8, 5.6]].forEach(function (a, k) { add({ type: 'machiya', u: uR, w: a[1], d: 8, seed: 230 + k, joinL: k > 0, joinR: false, doorLeft: k % 2 === 1, sign: k % 2 === 0, yE: a[2], roofCol: [[96, 100, 108], [82, 84, 90], [104, 104, 110], [88, 92, 98], [100, 98, 102]][k], udatsu: k === 2, upper: k === 1 ? 'koshi' : k === 3 ? 'shoji' : 'mushiko', ncol: NC[(k + 2) % NC.length], hang: k % 2 === 1 }, st(3.9 + 4, a[0])); });
    // the main street, east side: low single-storey shops, so the street stays open to view; their backs to us
    [[9.6, 6.0, 210], [15.8, 6.2, 211], [22.0, 5.8, 212], [28.6, 6.0, 213]].forEach(function (a, k) { add({ type: 'machiya', u: uE, w: a[1], d: 7, seed: a[2], joinL: k < 3, joinR: k > 0, yE: 3.4, low: true, back: true, ncol: NC[(k + 4) % NC.length] }, st(a[0], -(hw + 3.5))); });
  }
  if (Fx.kura) [[19.8, 3.3, 6.6, 301], [26.6, 3.6, 5.8, 302], [33.2, 3.2, 6.4, 303]].forEach(function (a) { add({ type: 'kura', u: KR_DIR, w: a[2], d: a[1] * 2, seed: a[3], door: a[3] === 302, sideWin: true }, krPt(a[0], RIVER_HW + 2.4 + a[1])); });
  return L;
}
function theatreFrame() { var p = rvPt(45.6, 3.9 + 5.5); return BF(p[0], p[1], KR_DIR, 0); }
function planFoot(b) {
  var w = b.type === 'nagaya' ? b.units * 2.75 : b.w, d = b.type === 'nagaya' ? 4.6 : b.d;
  return { x: b.x, z: b.z, u: norm2(b.u), v: [-norm2(b.u)[1], norm2(b.u)[0]], w: w, d: d };
}
function drawPlanned(ctx, b) {
  if (b.type === 'machiya') drawMachiya(ctx, b);
  else if (b.type === 'shoka') drawShoka(ctx, b);
  else if (b.type === 'inn') drawInn(ctx, b);
  else if (b.type === 'nagaya') drawNagaya(ctx, b);
  else if (b.type === 'kura') drawKura(ctx, b);
}
function footAO(ctx, f, grow) {
  grow = grow || 0.6; var B = BF(f.x, f.z, f.u, 0), w = f.w / 2 + grow, d = f.d / 2 + grow;
  var pp = [B.L(-w, -d, 0), B.L(w, -d, 0), B.L(w, d, 0), B.L(-w, d, 0)].map(Pa); poly(ctx, pp); ctx.fill();
}

function buildScene() {
  var up = [], flat = [], surf = [];
  YARDS = [];
  function put(x, z, o) { o.x = x; o.z = z; if (o.key === undefined) o.key = P(x, 0, z).d; up.push(o); return o; }
  var sname = seasonName(), i;
  // hills and forest behind everything
  put(0, 120, { draw: drawHills, key: 1e6, noShadow: true, noRefl: true });
  // wild groves on the far bank
  GROVES.forEach(function (gv, gi) {
    if (F.s >= gv[2]) return;
    var gr = mulberry32(900 + gi);
    for (var n = 0; n < gv[3]; n++) {
      var tx = gv[0] + (gr() - 0.5) * 7, tz = gv[1] + (gr() - 0.5) * 5, tt = genBroad(950 + gi * 7 + n, tx, tz, 1.0 + gr() * 0.3, 1.15), pal = n % 3 === 2 && SEA.maple ? SEA.maple : null;
      (function (tt, tx, tz, pal) { put(tx, tz, { draw: function (c) { drawBroad(c, tt, { dab: 0.26, pal: pal }); }, ao: function (c) { mapleAO(c, tt); }, sway: swayTree('broad', tt), tap: pal ? 'maple' : 'broad' }); })(tt, tx, tz, pal);
    }
  });
  // the lone tree by the road
  var t0 = genBroad(31, TREE0.x, TREE0.z, 1.5 * F.tree0, 1.2);
  put(TREE0.x, TREE0.z, { draw: function (c) { drawBroad(c, t0, { dab: 0.28, cap: 40 }); }, ao: function (c) { mapleAO(c, t0); }, sway: swayTree('broad', t0), tap: 'broad' });
  // bridges
  if (F.stoneBridge) put(BR.x, BR.z, { draw: drawStoneBridge, key: P(BR.x + 1.5, 0, BR.z - 2).d, refl: true, noShadow: false });
  else put(BR.x, BR.z, { draw: drawPlankBridge, key: P(BR.x, 0, BR.z - 1).d, refl: true });
  // the town
  townPlan(F).forEach(function (b) {
    var f = planFoot(b); YARDS.push({ x: f.x, z: f.z, u: f.u, v: f.v, w: f.w, d: f.d, pad: 2.2 });
    var fr = BF(b.x, b.z, b.u, 0), front = fr.L(0, -f.d / 2, 0);
    put(b.x, b.z, { draw: function (c) { drawPlanned(c, b); }, ao: function (c) { footAO(c, f); }, key: P(lerp(b.x, front[0], 0.6), 0, lerp(b.z, front[2], 0.6)).d, refl: b.type === 'kura' || b.type === 'nagaya' || b.type === 'shoka', foot: f });
  });
  if (F.kura) flat.push({ draw: function (c) { drawRevetment(c, [krPt(5, RIVER_HW), krPt(14, RIVER_HW + 0.2), krPt(24, RIVER_HW), krPt(34, RIVER_HW + 0.3)]); }, key: 0 });
  // cherries along the river
  if (F.riverCherry > 0) [[-46, 64.5, 0.9], [-14.5, 40.6, 0.8], [-28, 47.3, 0.85], [19.5, 21.5, 0.95], [31.5, 14.5, 0.9]].forEach(function (a, ii) {
    var sk = genTownSakura(800 + ii, a[0], a[1], a[2] * 1.45 * F.riverCherry, 1.5);
    put(a[0], a[1], { draw: function (c) { drawSakura(c, sk, { density: sakDens(sk), dab: 0.24, cap: 60, batch: true }); }, ao: function (c) { mapleAO(c, sk); }, refl: true, sway: swayTree('broad', sk), tap: 'cherry' });
  });
  // willows at the bridge foot
  if (F.shoka) [[stPt(-4.4, 5.6), 61], [stPt(-3.6, -5.8), 62]].forEach(function (a) { var wl = genWillow(a[1], a[0][0], a[0][1], 1.9); put(a[0][0], a[0][1], { draw: function (c) { drawWillow(c, wl); }, ao: function (c) { mapleAO(c, wl); }, refl: true, sway: swayTree('willow', wl), tap: 'willow' }); });
  // ---- the countryside
  function simple(x, z, fn, o) { o = o || {}; o.draw = fn; return put(x, z, o); }
  function circAO(x, z, r) { return function (c) { var p = P(x, 0, z); c.beginPath(); c.ellipse(p.x, p.y, r * p.k, r * p.k * CAM.s, 0, 0, TAU); c.fill(); }; }
  if (F.sign) simple(SIGN.x, SIGN.z, drawSignpost, { ao: circAO(SIGN.x + 0.4, SIGN.z, 0.7), drift: 0.5 });
  if (F.teahouse) { var tb = teaFrame(); YARDS.push({ x: TEA.x, z: TEA.z - 1, u: tb.u, v: tb.v, w: 8, d: 9, pad: 1.5, k: 0.7 }); simple(TEA.x, TEA.z, drawTeahouse, { ao: function (c) { footAO(c, { x: TEA.x, z: TEA.z, u: tb.u, w: 5.6, d: 4.2 }); }, key: P(TEA.x + 1, 0, TEA.z - 2).d, foot: { x: TEA.x, z: TEA.z, u: tb.u, w: 5.6, d: 4.2 } }); }
  if (F.well) simple(WELL.x, WELL.z, drawWell, { ao: circAO(WELL.x, WELL.z, 0.9), drift: 0.9 });
  if (F.farm) {
    var fb = farmFrame(); YARDS.push({ x: FARM.x, z: FARM.z - 2, u: fb.u, v: fb.v, w: 16, d: 13, pad: 2, k: 0.8 });
    simple(FARM.x, FARM.z, drawFarm, { ao: function (c) { footAO(c, { x: FARM.x, z: FARM.z, u: fb.u, w: 11.5, d: 7.6 }); }, foot: { x: FARM.x, z: FARM.z, u: fb.u, w: 11.5, d: 7.6 } });
    var kk = genBroad(37, KAKI.x, KAKI.z, 1.35, 1.2); put(KAKI.x, KAKI.z, { draw: function (c) { drawBroad(c, kk, { dab: 0.22, fruit: true, accent: sname === 'autumn' ? { p: 0.22, pal: [[200, 80, 20], [236, 120, 30], [250, 170, 70]] } : null, pal: sname === 'autumn' ? [[90, 40, 16], [140, 66, 22], [184, 98, 30], [210, 132, 44], [228, 166, 70], [240, 196, 110]] : null, density: sname === 'autumn' ? 0.45 : 1 }); }, ao: function (c) { mapleAO(c, kk); }, sway: swayTree('broad', kk), tap: 'kaki' });
    if (sname === 'autumn' && F.paddy && F.prog < 0.875) { put(HAZA[0][0], HAZA[0][1], { draw: function (c) { drawHaza(c, HAZA[0][0], HAZA[0][1], 8, 0.02); } }); put(HAZA[1][0], HAZA[1][1], { draw: function (c) { drawHaza(c, HAZA[1][0], HAZA[1][1], 7, -0.06); } }); }
  }
  if (F.mill) {
    var mb = millFrame(); YARDS.push({ x: MILL.x, z: MILL.z, u: mb.u, v: mb.v, w: 7, d: 7, pad: 1.5, k: 0.6 });
    simple(MILL.x, MILL.z, drawMill, { ao: function (c) { footAO(c, { x: MILL.x, z: MILL.z, u: mb.u, w: 5, d: 4.4 }); }, refl: true, key: P(MILL.wx, 0, MILL.wz - 0.5).d - 0.5, foot: { x: MILL.x, z: MILL.z, u: mb.u, w: 5, d: 4.4 } });
  }
  if (F.shrine) {
    YARDS.push({ x: SHRINE.x, z: SHRINE.z, u: [1, 0], v: [0, 1], w: 5, d: 5, pad: 1.2, k: 0.7 });
    simple(SHRINE.x, SHRINE.z, drawHokora, { ao: circAO(SHRINE.x, SHRINE.z, 2), drift: 1.1 });
    simple(TORII.x, TORII.z, drawTorii, { ao: function (c) { var tb2 = toriiFrame(); [-1.45, 1.45].forEach(function (a) { var p = Pa(tb2.L(a, 0, 0)); c.beginPath(); c.ellipse(p.x, p.y, 0.4 * p.k, 0.2 * p.k, 0, 0, TAU); c.fill(); }); } });
    [[4.0, 1.4, 10.5, 701], [5.4, -1.8, 9, 702], [6.6, 1.2, 9.5, 703], [2.4, 2.8, 10, 704]].map(function (a) { return [SHRINE.x + a[0], SHRINE.z + a[1], a[2], a[3]]; }).forEach(function (a) { put(a[0], a[1], { draw: function (c) { drawCedar(c, a[0], a[1], a[2], a[3]); }, ao: circAO(a[0], a[1], 1.4), sway: swayCedar(a[0], a[1], a[2], a[3]), tap: 'cedar' }); });
  }
  if (F.landing) simple(landingGeom().B.x, landingGeom().B.z, drawLanding, { refl: true, key: P(landingGeom().B.x, 0, landingGeom().B.z - 3).d });
  // ---- the town's landmarks
  if (F.tower) simple(TOWER.x, TOWER.z, drawTower, { ao: circAO(TOWER.x, TOWER.z, 2) });
  if (F.temple) {
    var tf = templeFrame(); YARDS.push({ x: TEMPLE.x, z: TEMPLE.z - 3, u: tf.u, v: tf.v, w: 24, d: 22, pad: 2, k: 0.9 });
    simple(TEMPLE.x, TEMPLE.z, drawTemple, { ao: function (c) { footAO(c, { x: TEMPLE.x, z: TEMPLE.z, u: tf.u, w: 15.8, d: 13.5 }, 0.6); }, foot: { x: TEMPLE.x, z: TEMPLE.z, u: tf.u, w: 15.8, d: 13.5 } });
    simple(BELL.x, BELL.z, drawBelfry, { ao: circAO(BELL.x, BELL.z, 2.6), tap: 'bell' });
    [[-28, 95.5, 1.4, 51], [-47, 80, 1.25, 52]].forEach(function (a) { var mt = genBroad(a[3], a[0], a[1], a[2], 1.2); put(a[0], a[1], { draw: function (c) { if (SEA.maple) drawBroad(c, mt, { pal: SEA.maple, dab: 0.26 }); else drawBroad(c, mt); }, ao: function (c) { mapleAO(c, mt); }, sway: swayTree('broad', mt), tap: 'maple' }); });
    var tc = genTownSakura(820, -6, 94, 1.4, 1.4); put(-6, 94, { draw: function (c) { drawSakura(c, tc, { density: sakDens(tc), dab: 0.24, cap: 60, batch: true }); }, sway: swayTree('broad', tc), tap: 'cherry' });
  }
  if (F.pagoda) { YARDS.push({ x: PAGODA.x, z: PAGODA.z, u: [1, 0], v: [0, 1], w: 10, d: 10, pad: 1.5, k: 0.9 }); simple(PAGODA.x, PAGODA.z, drawPagoda, { ao: circAO(PAGODA.x, PAGODA.z, 4.6) }); }
  if (F.theatre) { var th = theatreFrame(); YARDS.push({ x: th.x, z: th.z, u: th.u, v: th.v, w: 12, d: 15, pad: 2 }); simple(th.x, th.z, drawTheatre, { ao: function (c) { footAO(c, { x: th.x, z: th.z, u: th.u, w: 9.5, d: 11 }); }, key: P.apply(null, th.L(0, -3, 0)).d, foot: { x: th.x, z: th.z, u: th.u, w: 9.5, d: 11 } }); }
  if (F.market) simple(MARKET.x, MARKET.z, drawMarket, { key: P(MARKET.x, 0, MARKET.z - 1).d });
  if (F.buke) BUKE.forEach(function (bk) {
    var sp = { x: bk.x, z: bk.z, u: KR_DIR, w: bk.w, d: bk.d, seed: bk.seed }; YARDS.push({ x: bk.x, z: bk.z, u: KR_DIR, v: STREET_DIR, w: bk.w, d: bk.d, pad: 1.5, k: 0.6 });
    var pq = BF(bk.x, bk.z, KR_DIR, 0).L(bk.w * 0.3, 1.5, 0), pn = genPine(bk.seed, pq[0], pq[2], 3.2); 
    var bkey = P(bk.x - STREET_DIR[0] * bk.d / 2, 0, bk.z - STREET_DIR[1] * bk.d / 2).d;
    put(bk.x, bk.z, { draw: function (c) { drawBuke(c, sp); }, ao: function (c) { footAO(c, { x: bk.x, z: bk.z, u: KR_DIR, w: bk.w, d: bk.d }, 0.4); }, key: bkey, foot: { x: bk.x, z: bk.z, u: KR_DIR, w: bk.w, d: bk.d } });
    put(pq[0], pq[2], { draw: function (c) { drawPine(c, pn); }, key: bkey - 1e-4, sway: swayTree('pine', pn), tap: 'pine' });
  });
  if (F.ishigaki) { var ig = ishiGeom(); put(CASTLE.x, CASTLE.z, { draw: function (c) { drawIshigaki(c); if (F.keep) drawKeep(c); }, key: P(CASTLE.x, 0, CASTLE.z - 6).d, ao: function (c) { footAO(c, { x: CASTLE.x, z: CASTLE.z, u: ig.B.u, w: ig.w + 3, d: ig.d + 3 }, 0.6); } }); }
  if (F.ishigaki || F.buke) [[22, 80.5], [44, 81], [28, 95]].forEach(function (a, ii) { var pn = genPine(600 + ii, a[0], a[1], 3.0, hillH(a[0], a[1])); put(a[0], a[1], { draw: function (c) { drawPine(c, pn); }, sway: swayTree('pine', pn), tap: 'pine' }); });
  placeProps(put);
  // seasonal events
  if (F.event) {
    doorList().forEach(function (d, k) { var c = d.W.at((d.s0 + d.s1) / 2, 0, 0.6); put(c[0], c[2], { draw: function (cx) { drawDoorDeco(cx, d, k); }, key: doorKey(d) - 0.05, noShadow: true }); });
    if (F.event === 'hinamatsuri') {
      put(0, 0, { draw: function (cx) { drawEventExtras(cx, 'hina'); }, key: P(stPt(3.9, 10.5)[0], 0, stPt(3.9, 10.5)[1]).d - 0.05, noShadow: true });
      [[-25.5, 21.5, 1.0, 71], [-3.5, 31, 0.9, 72]].concat(F.shoka ? [[rvPt(4, 6)[0], rvPt(4, 6)[1], 0.9, 73]] : []).forEach(function (a) { var pt = genBroad(a[3], a[0], a[1], a[2], 1.3); put(a[0], a[1], { draw: function (cx) { drawPeach(cx, pt); }, ao: function (cx) { mapleAO(cx, pt); }, sway: swayTree('broad', pt), tap: 'peach' }); });
    }
    if (F.event === 'tsukimi') put(0, 0, { draw: function (cx) { drawEventExtras(cx, 'tsukimi'); }, key: P(FARM.x, 0, FARM.z - 5).d - 0.05, noShadow: true });
    if (F.event === 'kodomo') koiPoles().forEach(function (q) { put(q[0], q[1], { draw: function (cx) { prism(cx, q[0], q[1], 0, q[2], 0.08, 0.06, 6, 0, [140, 120, 90], { snow: 0 }); if (!sil()) { var tp = P(q[0], q[2] + 0.2, q[1]); cx.fillStyle = rgb(mulc([220, 180, 70], lightTint(1))); cx.beginPath(); cx.arc(tp.x, tp.y, 0.16 * tp.k, 0, TAU); cx.fill(); } } }); });
  }
  if (F.wx === 'blizzard' && SEA.snow) addBlizzardDrifts(up);
  up.sort(function (a, b) { return b.key - a.key; }); flat.sort(function (a, b) { return b.key - a.key; });
  return { up: up, flat: flat, surf: surf };
}
function drawFallen(ctx) { }

/* ---- 06a_land.js ---- */
/* ================= the land beyond the town: sky and clouds, the far ranges, the wooded foothills =================
   Far ranges and sky are painted in screen space; the foothills are a terrain mesh covered tree by tree. */
var TERRACES = [{ x: -31, z: 99.2, rx: 10.5, rz: 3.6 }, { x: 39.5, z: 97.6, rx: 6.5, rz: 2.6 }];
var HILL_SHRINE = { x: -7.5, z: 98.4, top: [-7.2, 101.6] };
var HAMLET = [[17.5, 108.5, 0.25], [22.8, 109.6, -0.1], [-46, 107.5, 0.15]];
function hillH(x, z) {
  // the foothills that close the valley, rising gently behind the fields; the named hills stand on them
  var h = sstep(92.5, 101, z) * (1 - sstep(107, 116, z)) * (1.4 + 2.4 * NZ.fbm(x * 0.03 + 3, 1.7, 3));
  var hm = 0;
  for (var i = 0; i < HILLS.length; i++) {
    var q = HILLS[i], dx = (x - q.x) / q.rx, dz = (z - q.z) / q.rz, r2 = dx * dx + dz * dz;
    if (r2 < 1) hm = Math.max(hm, q.h * Math.pow(1 - r2, 1.4) * (0.85 + 0.3 * NZ.n2(x * 0.06 + 5, z * 0.06)));
  }
  h += hm;
  var c = CASTLE, dc = Math.hypot((x - c.x) / 11, (z - c.z) / 7);
  if (dc < 1.25) h = lerp(c.top, h, sstep(0.95, 1.25, dc));
  return h;
}
function inEll(x, z, e, k) { var dx = (x - e.x) / (e.rx * (k || 1)), dz = (z - e.z) / (e.rz * (k || 1)); return dx * dx + dz * dz < 1; }
function hillClear(x, z) { // places where the forest gives way: castle plateau, temple grounds, terraces, the hill shrine, the hamlet
  var dc = Math.hypot((x - CASTLE.x) / 13, (z - CASTLE.z) / 8.5);
  if (dc < (F.ishigaki ? 1.08 : 0.55)) return true;
  if (F.temple && Math.hypot((x - TEMPLE.x) / 16, (z - TEMPLE.z - 1) / 8) < 1) return true;
  if (F.pagoda && Math.hypot((x - PAGODA.x) / 6, (z - PAGODA.z) / 5) < 1) return true;
  for (var i = 0; i < TERRACES.length; i++) if (inEll(x, z, TERRACES[i], 1.05)) return true;
  if (Math.hypot(x - HILL_SHRINE.x, (z - HILL_SHRINE.z - 1.6) * 0.75) < 2.1) return true;
  for (i = 0; i < HAMLET.length; i++) if (Math.hypot(x - HAMLET[i][0], z - HAMLET[i][1]) < 3.4) return true;
  return false;
}

/* ---------------- sky (screen space) ---------------- */
function skyBand() { return CAM.cy - 150; }
var RANGE_PATH = null;
function paintBackdrop(ctx, noClouds) {
  var L = LIT, yo = skyBand(), night = L.name === 'night', dusk = L.name === 'dusk', i;
  var top = mixc(L.skyTop, SEA.sky, night ? 0 : 0.25), hor = L.skyHor, yH = 100 + yo;
  var g = ctx.createLinearGradient(0, 0, 0, yH); g.addColorStop(0, rgb(top)); g.addColorStop(0.6, rgb(mixc(top, hor, 0.7))); g.addColorStop(1, rgb(hor)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, yH + 60);
  var sx = W * L.sunX, sy = yo + 100 * L.sunY;
  var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 240); sg.addColorStop(0, L.sunGlow); sg.addColorStop(1, 'rgba(255,230,200,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, yH + 60);
  var bigMoon = F.event === 'tsukimi' && (night || dusk);
  var overcast = F.wx && F.wx !== 'clear';
  if (overcast) paintOvercast(ctx, yo, F.wx);
  if (F.after && SEA.name === 'summer' && L.name === 'day') paintRainbow(ctx, yo);
  if (night && (!overcast || F.wx === 'cloudy')) { var sr = mulberry32(5); for (i = 0; i < 190; i++) { var x = sr() * W, y = sr() * (yH - 30), a = 0.25 + sr() * 0.6, r = 0.22 + sr() * 0.45; if (sr() < 0.06) { a = 0.95; r = 0.7; } ctx.fillStyle = 'rgba(230,236,255,' + a * clamp(1.15 - y / yH) + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } }
  if (dusk && !overcast) { ctx.fillStyle = 'rgba(255,214,150,0.9)'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, TAU); ctx.fill(); }
  if (night && !bigMoon && (!overcast || F.wx === 'cloudy')) drawMoonAt(ctx, false, night);
  if (!noClouds) {
  var cl = tmpCanvas(Math.max(2, Math.round(ctx.canvas.width / 2)), Math.max(2, Math.round(ctx.canvas.height / 2))), clx = cl.getContext('2d'), ks = cl.width / W;
  clx.setTransform(ks, 0, 0, ks, 0, 0); paintClouds(clx, yo, night, dusk);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(softBlur(cl, Math.max(1, ks * 0.6)), 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
  }
  paintRanges(ctx, yo, bigMoon, night);
}
function drawMoonAt(ctx, bigMoon, night) {
  var mp = moonPos(), mx = mp.x, my = mp.y, mr = bigMoon ? 14 : 7.5;
  if (bigMoon) { my += night ? 4 : 10; mx += 6; }
  var mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 6); mg.addColorStop(0, 'rgba(220,230,255,0.38)'); mg.addColorStop(1, 'rgba(200,215,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
  ctx.fillStyle = bigMoon ? (night ? 'rgb(252,246,220)' : 'rgb(255,226,170)') : 'rgb(246,244,232)'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
  var ms = mr / 7.5; ctx.fillStyle = bigMoon && !night ? 'rgba(214,170,120,0.35)' : 'rgba(200,196,180,0.35)'; [[-2.5, -1.6, 2.2], [2, 1.2, 1.7], [-0.8, 2.8, 1.3], [2.4, -2.4, 1]].forEach(function (c) { ctx.beginPath(); ctx.arc(mx + c[0] * ms, my + c[1] * ms, c[2] * ms, 0, TAU); ctx.fill(); });
}
function moonPos() { return { x: W * 0.43, y: 16 + skyBand() * 0.5 }; }
/* clouds: banks of rounded heads over a flat base, lit from the sun's side, shaded beneath */
function paintClouds(ctx, yo, night, dusk, spanW) {
  spanW = spanW || W;
  var L = LIT, rng = mulberry32(17 + (SEA.snow ? 5 : 0)), morning = L.name === 'morning', winter = !!SEA.snow, wx = F.wx || 'clear', ov = wx !== 'clear', heavy = wx !== 'clear' && wx !== 'cloudy';
  var lit = night ? [96, 110, 150] : dusk ? [255, 196, 150] : morning ? [255, 246, 238] : [255, 253, 248];
  var body = night ? [34, 44, 74] : dusk ? [150, 112, 142] : morning ? [206, 204, 216] : winter ? [196, 202, 212] : [214, 220, 230];
  var shadow = night ? [22, 30, 56] : dusk ? [112, 84, 120] : morning ? [170, 172, 192] : winter ? [160, 168, 182] : [172, 182, 202];
  if (ov) { lit = mixc(lit, [200, 206, 214], night ? 0.2 : 0.6); body = mixc(body, heavy ? [96, 100, 112] : [168, 172, 182], night ? 0.3 : 0.7); shadow = mixc(shadow, heavy ? [62, 66, 80] : [130, 136, 150], night ? 0.3 : 0.7); if (wx === 'typhoon') { body = mixc(body, [90, 104, 92], 0.5); shadow = mixc(shadow, [56, 68, 60], 0.5); } }
  var alpha = night ? 0.75 : 0.95, sunL = L.sunX < 0.5 ? -1 : 1, n = Math.round((winter ? 8 : 6) * (ov ? (heavy ? 2.4 : 1.7) : 1) * spanW / W * 0.8);
  if (heavy || wx === 'cloudy') {   // overcast: soft, flat stratus masses drifting under the lid, darker beneath
    var nS = Math.round((heavy ? 16 : 10) * spanW / W);
    for (var q = 0; q < nS; q++) {
      var sw = 70 + rng() * 120, sy = yo + (heavy ? 4 : -2) + rng() * 44, sx = rng() * spanW, sh = sw * (0.07 + rng() * 0.05);
      [-spanW, 0, spanW].forEach(function (dx) {
        var x = sx + dx; if (x + sw < -10 || x - sw > spanW + 10) return;
        var gg = ctx.createRadialGradient(x, sy, 0, x, sy, sw); gg.addColorStop(0, rgb(mixc(body, shadow, 0.35), heavy ? 0.6 : 0.42)); gg.addColorStop(0.6, rgb(body, heavy ? 0.3 : 0.2)); gg.addColorStop(1, rgb(body, 0));
        ctx.save(); ctx.translate(x, sy); ctx.scale(1, sh / sw); ctx.translate(-x, -sy); ctx.fillStyle = gg; ctx.fillRect(x - sw, sy - sw, sw * 2, sw * 2); ctx.restore();
        var tg = ctx.createRadialGradient(x - sw * 0.1, sy - sh * 0.5, 0, x - sw * 0.1, sy - sh * 0.5, sw * 0.6); tg.addColorStop(0, rgb(lit, night ? 0.06 : 0.16)); tg.addColorStop(1, rgb(lit, 0));
        ctx.save(); ctx.translate(x, sy - sh * 0.5); ctx.scale(1, sh / sw); ctx.translate(-x, -(sy - sh * 0.5)); ctx.fillStyle = tg; ctx.fillRect(x - sw, sy - sh * 0.5 - sw, sw * 2, sw * 2); ctx.restore();
      });
    }
    if (heavy) return;
    n = Math.round(n * 0.35);
  }
  var specs = [];
  for (var i = 0; i < n; i++) {
    var w = 34 + rng() * 70, y = yo - 2 + 6 + rng() * 34 + (i % 2) * 6, x = (i + 0.5 + (rng() - 0.5) * 0.4) / n * spanW;
    specs.push({ x: x, y: y, w: w, h: w * (0.2 + rng() * 0.12) * (winter ? 0.8 : 1) });
  }
  specs.sort(function (a, b) { return a.y - b.y; });
  specs.forEach(function (c) {
    var puffs = [], k = 7 + Math.round(c.w / 9), j;
    for (j = 0; j < k; j++) {   // a chain of overlapping puffs along the base, larger toward the middle
      var u = -1 + 2 * (j + 0.5) / k + (rng() - 0.5) * 0.25 / k, env = 1 - u * u * 0.8, r = c.w * (0.1 + 0.06 * rng()) * (0.5 + 0.5 * env);
      puffs.push({ x: c.x + u * c.w * 0.44, y: c.y - r * (0.35 + 0.3 * rng()), r: r });
    }
    for (j = 0; j < Math.max(2, k / 3); j++) { var uh = (rng() - 0.5) * 0.9, rh = c.w * (0.13 + 0.06 * rng()) * (1 - Math.abs(uh) * 0.6); puffs.push({ x: c.x + uh * c.w * 0.4, y: c.y - c.h * (0.55 + 0.4 * rng()) - rh * 0.3, r: rh }); }   // the heads
    var shifts = spanW > W ? [-spanW, 0, spanW] : [0], wr = [];
    for (j = 0; j < 4; j++) wr.push([(rng() - 0.5) * c.w * 1.2, 0.5 + rng() * 1.5, c.w * (0.2 + rng() * 0.25), 0.8 + rng()]);
    shifts.forEach(function (dx) {
    if (c.x + dx + c.w < -10 || c.x + dx - c.w > spanW + 10) return;
    ctx.save(); ctx.translate(dx, 0);
    var bodyP = new Path2D();
    puffs.forEach(function (p) { bodyP.moveTo(p.x + p.r, p.y); bodyP.arc(p.x, p.y, p.r, 0, TAU); });
    ctx.save();
    var gr = ctx.createLinearGradient(0, c.y - c.h * 1.4, 0, c.y);
    gr.addColorStop(0, rgb(body, alpha)); gr.addColorStop(1, rgb(shadow, alpha));
    ctx.fillStyle = gr; ctx.fill(bodyP);
    ctx.clip(bodyP);
    // light on the heads, from the sun's side (from below at dusk)
    puffs.forEach(function (p) {
      var ox = sunL * p.r * 0.32, oy = dusk ? p.r * 0.35 : -p.r * 0.35, hg = ctx.createRadialGradient(p.x + ox, p.y + oy, 0, p.x + ox, p.y + oy, p.r * 0.95);
      hg.addColorStop(0, rgb(lit, night ? 0.32 : 0.6)); hg.addColorStop(1, rgb(lit, 0)); ctx.fillStyle = hg; ctx.fillRect(p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4);
    });
    // a soft shadowed belly
    var bg = ctx.createLinearGradient(0, c.y - c.h * 0.45, 0, c.y); bg.addColorStop(0, rgb(shadow, 0)); bg.addColorStop(1, rgb(shadow, dusk ? 0.2 : 0.45)); ctx.fillStyle = bg; ctx.fillRect(c.x - c.w, c.y - c.h, c.w * 2, c.h + 1);
    ctx.restore();
    // wisps trailing from the base
    ctx.fillStyle = rgb(mixc(body, lit, 0.4), night ? 0.12 : 0.22);
    wr.forEach(function (q) { ctx.beginPath(); ctx.ellipse(c.x + q[0], c.y + q[1], q[2], q[3], 0, 0, TAU); ctx.fill(); });
    ctx.restore();
    });
  });
}
/* ---------------- the far ranges (screen space): blue peaks, then a wooded range with fields and a hamlet ---------------- */
function paintRanges(ctx, yo, bigMoon, night) {
  var L = LIT, haze = L.haze, lt = lightTint(1), rng = mulberry32(301), sunL = L.sunX < 0.5 ? -1 : 1;
  var layers = [{ y: 30, amp: 17, col: [122, 136, 160], hz: 0.62, f: 0.011, ridge: 1 }, { y: 44, amp: 12, col: [86, 104, 100], hz: 0.48, f: 0.02, ridge: 0.4 }];
  layers.forEach(function (Ly, li) {
    var pts = [], x2;
    for (x2 = -10; x2 <= W + 10; x2 += 2) {
      var n = NZ.fbm(x2 * Ly.f + li * 7 + 3, li * 3.1, 4), rdg = 1 - Math.abs(NZ.n2(x2 * Ly.f * 1.7 + 11, li + 0.5) * 2 - 1);
      pts.push([x2, yo + Ly.y - Ly.amp * (n * 1.5 + rdg * 0.45 * Ly.ridge) + Ly.amp * 0.55]);
    }
    var path = new Path2D(); path.moveTo(-10, yo + 170); pts.forEach(function (p) { path.lineTo(p[0], p[1]); }); path.lineTo(W + 10, yo + 170); path.closePath();
    if (li === 1) RANGE_PATH = path;
    var lcol = mixc(mulc(Ly.col, lt), haze, Ly.hz);
    if (SEA.snow) lcol = mixc(lcol, mulc([232, 236, 246], lt), 0.5 - li * 0.15);
    ctx.fillStyle = rgb(lcol); ctx.fill(path);
    ctx.save(); ctx.clip(path);
    // form: shaded flanks away from the sun, gullies running down from the ridge
    // form: the flanks turned from the sun lie in shade, a soft gradient down from each crest
    var sh = new Path2D(), lp = new Path2D(), i, k;
    for (i = 1; i < pts.length - 1; i++) {
      var dy = pts[i + 1][1] - pts[i - 1][1];
      if (dy * sunL > 0.15) { sh.moveTo(pts[i - 1][0], pts[i - 1][1]); sh.lineTo(pts[i + 1][0] + 0.2, pts[i + 1][1]); sh.lineTo(pts[i + 1][0] + 0.2 - sunL * 3, pts[i + 1][1] + 9); sh.lineTo(pts[i - 1][0] - sunL * 3, pts[i - 1][1] + 9); sh.closePath(); }
      if (rng() < 0.1) { var gx = pts[i][0], gy = pts[i][1] + 1.5, len = 4 + rng() * 9; lp.moveTo(gx, gy); lp.quadraticCurveTo(gx + (rng() - 0.5) * 3, gy + len * 0.5, gx + (rng() - 0.5) * 5, gy + len); }
    }
    ctx.fillStyle = rgb(mixc(scl(lcol, 0.86), haze, 0.1), 0.35); ctx.fill(sh);
    ctx.strokeStyle = rgb(scl(lcol, 0.9), 0.28); ctx.lineWidth = 0.45; ctx.stroke(lp);
    if (li === 0 && SEA !== SEASONS.summer) { // snow above the snow line on the high peaks
      var sl = yo + Ly.y - Ly.amp * (SEA.snow ? 0.15 : 0.62), sp = new Path2D();
      sp.moveTo(-10, sl); for (k = 0; k <= 60; k++) { var xx = -10 + k * (W + 20) / 60; sp.lineTo(xx, sl + (NZ.n2(xx * 0.12, 4) - 0.5) * 5 + Math.sin(xx * 0.9) * 0.8); }
      sp.lineTo(W + 10, -50); sp.lineTo(-10, -50); sp.closePath();
      ctx.save(); ctx.clip(sp); ctx.fillStyle = rgb(mulc([246, 248, 252], lt), SEA.snow ? 0.85 : 0.7); ctx.fill(path);
      ctx.strokeStyle = rgb(mulc([200, 206, 220], lt), 0.4); ctx.lineWidth = 0.4; ctx.stroke(lp); ctx.restore();
    }
    if (li === 1) paintFarWoods(ctx, pts, lcol, haze, lt, yo, rng);
    // mist pooled in the valley below this range
    var mg = ctx.createLinearGradient(0, yo + Ly.y - 2, 0, yo + Ly.y + Ly.amp * 1.3); mg.addColorStop(0, rgb(haze, 0)); mg.addColorStop(1, rgb(haze, 0.55 * L.hazeK)); ctx.fillStyle = mg; ctx.fillRect(0, yo + Ly.y - 2, W, Ly.amp * 2);
    ctx.restore();
    if (li === 0 && bigMoon) drawMoonAt(ctx, true, night);   // the harvest moon rises in front of the farthest range
  });
}
/* the second range: a pelt of tiny crowns, a few terraced fields and a hamlet with a little pagoda, all hazed */
function paintFarWoods(ctx, pts, lcol, haze, lt, yo, rng) {
  var pal = SEA.forest, NB = 4, paths = [], i;
  for (i = 0; i < pal.length * NB; i++) paths.push(new Path2D());
  var dq = Math.min(2, DQ), cnt = Math.round(3400 * dq);
  for (i = 0; i < cnt; i++) {
    var x = rng() * (W + 20) - 10, ix = Math.max(0, Math.min(pts.length - 1, Math.round((x + 10) / 2))), yr = pts[ix][1], y = yr + 0.6 + Math.pow(rng(), 1.7) * 64;
    var r = (0.45 + rng() * 0.5) / Math.sqrt(dq) * (1 + (y - yr) * 0.012), ci = rng() < 0.62 ? (rng() < 0.5 ? 4 : 5) : (rng() * 4) | 0;
    if (SEA.name === 'spring' && ci === 3 && rng() < 0.4) ci = 2;
    var b = Math.min(NB - 1, (rng() * NB) | 0), p = paths[ci * NB + b]; p.moveTo(x + r, y); p.ellipse(x, y, r, r * 0.85, 0, 0, TAU);
  }
  for (i = 0; i < paths.length; i++) { var c = mulc(scl(pal[(i / NB) | 0], 0.7 + (i % NB) * 0.16), lt); ctx.fillStyle = rgb(mixc(c, haze, 0.5), 0.75); ctx.fill(paths[i]); }
  // terraced fields: curved strips stepping down a slope
  var fc = SEA.paddy === 'flood' ? [176, 190, 196] : SEA.paddy === 'green' ? [110, 150, 70] : SEA.paddy === 'gold' ? [214, 184, 90] : SEA.snow ? [236, 240, 246] : [150, 136, 110];
  [[0.18, 14, 7], [0.71, 18, 6]].forEach(function (t) {
    var cx = t[0] * W, ix = Math.round((cx + 10) / 2), y0 = pts[ix][1] + 5;
    for (var s = 0; s < t[2]; s++) { var yy = y0 + s * 1.6, w = t[1] * (0.6 + 0.4 * Math.sin((s + 1) / (t[2] + 1) * Math.PI)); ctx.strokeStyle = rgb(mixc(mulc(fc, lt), haze, 0.45), 0.85); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx - w / 2, yy + 0.6); ctx.quadraticCurveTo(cx, yy - 0.8, cx + w / 2, yy + 0.4); ctx.stroke(); }
  });
  // a hamlet: a cluster of tiny roofs and a small pagoda among the trees
  var hx = W * 0.56, hi = Math.round((hx + 10) / 2), hy = pts[hi][1] + 9, rc = mixc(mulc([70, 72, 80], lt), haze, 0.45), tc2 = mixc(mulc([150, 130, 96], lt), haze, 0.45), wl = mixc(mulc([226, 222, 210], lt), haze, 0.45);
  for (i = 0; i < 7; i++) {
    var rx = hx + (i - 3) * 3.2 + (rng() - 0.5) * 1.5, ry = hy + (i % 3) * 1.4, rw = 1.6 + rng();
    ctx.fillStyle = rgb(wl); ctx.fillRect(rx - rw * 0.4, ry, rw * 0.8, 0.9);
    ctx.fillStyle = rgb(i % 3 ? rc : tc2); ctx.beginPath(); ctx.moveTo(rx - rw * 0.6, ry + 0.2); ctx.lineTo(rx - rw * 0.25, ry - 0.9); ctx.lineTo(rx + rw * 0.25, ry - 0.9); ctx.lineTo(rx + rw * 0.6, ry + 0.2); ctx.closePath(); ctx.fill();
  }
  var px = hx + 13, py = hy - 1; ctx.fillStyle = rgb(rc);
  for (i = 0; i < 4; i++) { var ww = 2.0 - i * 0.3, y2 = py - i * 1.5; ctx.beginPath(); ctx.moveTo(px - ww, y2); ctx.lineTo(px + ww, y2); ctx.lineTo(px + ww * 0.45, y2 - 0.7); ctx.lineTo(px - ww * 0.45, y2 - 0.7); ctx.closePath(); ctx.fill(); }
  ctx.fillRect(px - 0.12, py - 8.6, 0.24, 2.6);
  if (LIT.lit) { ctx.fillStyle = 'rgba(255,200,130,0.8)'; for (i = 0; i < 4; i++) ctx.fillRect(hx + (i - 1.5) * 3.6, hy + 0.3 + (i % 2) * 1.2, 0.5, 0.4); }
}

/* ---------------- the wooded foothills: a terrain mesh, then the forest, tree by tree ---------------- */
var FOREST_SP = {   // albedo of each kind of crown by season
  cedar: { spring: [34, 60, 46], summer: [26, 52, 40], autumn: [36, 58, 44], winter: [44, 56, 46] },
  pine: { spring: [48, 80, 46], summer: [40, 72, 42], autumn: [46, 74, 44], winter: [50, 70, 48] },
  oak: { spring: [70, 104, 50], summer: [44, 82, 40], autumn: [74, 92, 46], winter: [56, 74, 50] },          // evergreen kashi and shii
  broad: { spring: [128, 168, 76], summer: [58, 104, 46], autumn: [176, 110, 42], winter: [132, 116, 112] },  // deciduous: bare in winter
  accent: { spring: [240, 216, 226], summer: [92, 136, 58], autumn: [206, 58, 34], winter: [132, 116, 112] },
  gold: { spring: [150, 180, 84], summer: [64, 110, 50], autumn: [228, 176, 56], winter: [132, 116, 112] }
};
function forestCrowns() {
  var out = [], rng = mulberry32(919), sn = SEA.name, x, z;
  for (z = 118; z >= 90.5; z -= 2.35) {
    var cell = 2.55;
    for (x = -66; x <= 66; x += cell) {
      var px = x + (rng() - 0.5) * cell * 0.9, pz = z + (rng() - 0.5) * cell * 0.9, h = hillH(px, pz);
      if (h < 0.06 || hillClear(px, pz)) { rng(); rng(); continue; }
      var sc = P(px, h, pz); if (sc.x < -12 || sc.x > W + 12) { rng(); rng(); continue; }
      var e = 0.6, n = norm([-(hillH(px + e, pz) - hillH(px - e, pz)) / (2 * e), 1, -(hillH(px, pz + e) - hillH(px, pz - e)) / (2 * e)]);
      var cz = NZ.n2(px * 0.075 + 11, pz * 0.075), r0 = rng(), r1 = rng(), kind;
      if (cz > 0.62 && r1 < 0.8) kind = 'cedar';
      else if (n[1] > 0.93 && h > 4.5 && r0 < 0.45) kind = 'pine';                   // pines on the crests
      else if (r0 < 0.3) kind = 'oak';
      else if (r0 < (sn === 'autumn' ? 0.52 : sn === 'spring' ? 0.42 : 0.4)) kind = 'accent';
      else if (r0 < 0.6 && (sn === 'autumn' || sn === 'spring')) kind = 'gold';
      else kind = 'broad';
      if (kind === 'accent' && sn === 'spring' && NZ.n2(px * 0.2, pz * 0.2 + 9) < 0.45) kind = 'broad';   // wild cherries stand alone
      var r = kind === 'cedar' ? 1.08 + r1 * 0.3 : kind === 'pine' ? 2.1 + r1 * 0.6 : 2.05 + r1 * 0.85;
      out.push({ x: px, y: h, z: pz, n: n, kind: kind, r: r, seed: (rng() * 1e9) | 0 });
    }
  }
  return out;
}
function drawHills(ctx) {
  var x0 = -78, x1 = 78, z0 = 88, z1 = 118, sx = 3.0, sz = 2.0, nx = Math.ceil((x1 - x0) / sx), nz = Math.ceil((z1 - z0) / sz), i, j, S = sil();
  var V = [];
  for (j = 0; j <= nz; j++) for (i = 0; i <= nx; i++) { var x = x0 + i * sx, z = z0 + j * sz; V.push([x, hillH(x, z) - 0.1, z]); }
  var tris = [];
  for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) {
    var a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    [[a, c, b], [b, c, d]].forEach(function (t) { var A = V[t[0]], B2 = V[t[1]], C = V[t[2]]; if (A[1] < 0.05 && B2[1] < 0.05 && C[1] < 0.05) return; var n = norm(cross(sub(B2, A), sub(C, A))); if (n[1] < 0) n = mul(n, -1); var cc = centroid([A, B2, C]); tris.push({ p: [A, B2, C], n: n, c: cc, d: Pa(cc).d }); });
  }
  tris.sort(function (p, q) { return q.d - p.d; });
  var floor = SEA.snow ? [196, 202, 214] : mixc(SEA.forest[5], [22, 30, 22], 0.6), lt = lightTint(1);
  tris.forEach(function (t) {
    var pp = t.p.map(Pa); poly(ctx, pp);
    var clear = hillClear(t.c[0], t.c[2]), alb = clear ? (SEA.snow ? [214, 218, 226] : mixc(SEA.grass[0], SEA.grass[1], 0.4)) : floor;
    var col = S ? [0, 0, 0] : mixc(shade(alb, t.n), LIT.haze, 0.1 + clamp((t.c[2] - 95) / 40) * 0.3 * LIT.hazeK);
    ctx.fillStyle = rgb(col); ctx.fill(); if (!S) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.5; ctx.stroke(); }
  });
  if (S) return;
  paintTerraces(ctx);
  var ins = HAMLET.map(function (q, i) { return { z: q[1], fn: function () { drawHamlet(ctx, i); } }; });
  ins.push({ z: HILL_SHRINE.top[1], fn: function () { drawHillShrine(ctx); } });
  paintForest(ctx, forestCrowns(), ins);
}
/* the forest: crowns painted far to near in depth slices; within a slice, shadow, body, then light */
function paintForest(ctx, crowns, inserts) {
  var lt = lightTint(1), haze = LIT.haze, sn = SEA.name, lsx = Math.sign(LS[0]) || 1, dq = Math.sqrt(Math.min(2, DQ)), snow = SEA.snow;
  var NL = 6, NS = 8, zA = 119, zB = 89, slices = [], s;
  for (s = 0; s < NS; s++) slices.push({});
  function bin(sl, key, col) { var m = slices[sl]; if (!m[key]) m[key] = { col: col, p: new Path2D() }; return m[key].p; }
  var colCache = {};
  var bareC = [126, 112, 106], sk = SEA.sak;
  function colOf(kind, lvl, hz) { var k = kind + lvl + '_' + hz; if (colCache[k]) return colCache[k]; var alb = FOREST_SP[kind][sn], f = lvl / (NL - 1);
    if (sk && (kind === 'broad' || kind === 'gold')) alb = mixc(bareC, alb, sstep(0.05, 0.7, sk.leafOut));
    if (sk && kind === 'accent') alb = mixc(mixc(bareC, FOREST_SP.broad.spring, sk.leafOut), alb, clamp(sk.bloom * 1.2)); var c = mulc(scl(alb, 0.34 + 0.95 * f), lt); c = mixc(c, haze, 0.06 + hz * 0.16 * LIT.hazeK); return (colCache[k] = rgb(c)); }
  var rng = mulberry32(4242);
  crowns.forEach(function (q) {
    var sl = Math.max(0, Math.min(NS - 1, Math.floor((zA - q.z) / (zA - zB) * NS))), hz = Math.min(3, Math.floor(clamp((q.z - 92) / 40) * 4));
    var bare = snow && (q.kind === 'broad' || q.kind === 'accent' || q.kind === 'gold');
    var cy = q.y + (q.kind === 'cedar' ? q.r * 1.9 : q.r * 0.85), p = P(q.x, cy, q.z), R = q.r * p.k, base = clamp(0.25 + 0.55 * dot(q.n, SUN));
    var shp = bin(sl, '0' + q.kind, colOf(q.kind, 0, hz)), m, k, a, rr, ox, oy, l, dab, pa;
    if (q.kind === 'cedar') {
      // a tall dark spire of drooping tiers, ragged at the edges
      var Ht = R * 2.6, nt = 6, top = p.y - Ht * 0.55, jx = (rng() - 0.5) * R * 0.15, L1 = [], R1 = [];
      for (k = 0; k <= nt; k++) { var fy = k / nt, yy = top + fy * Ht, ww = R * (0.12 + 0.88 * fy) * (0.85 + rng() * 0.3); R1.push([p.x + jx * (1 - fy) + ww, yy + Ht * 0.05], [p.x + jx * (1 - fy) + ww * 0.62, yy + Ht * 0.085]); L1.push([p.x + jx * (1 - fy) - ww, yy + Ht * 0.05], [p.x + jx * (1 - fy) - ww * 0.62, yy + Ht * 0.085]); }
      shp.moveTo(p.x + jx, top - R * 0.1); R1.forEach(function (v) { shp.lineTo(v[0], v[1]); }); for (k = L1.length - 1; k >= 0; k--) shp.lineTo(L1[k][0], L1[k][1]); shp.closePath();
      for (k = 1; k <= nt; k++) {
        var f2 = k / nt, ty = top + f2 * Ht - Ht * 0.04, tw = R * (0.12 + 0.88 * f2), nd = 3 + Math.round(f2 * 7 * dq);
        for (m = 0; m < nd; m++) { var u = (m + 0.5) / nd * 2 - 1 + (rng() - 0.5) * 0.25; l = clamp(base + 0.32 * u * lsx + (1 - f2) * 0.18 - 0.12 + (rng() - 0.5) * 0.22); var lv0 = 1 + Math.round(l * (NL - 2)); dab = Math.max(0.45, R * 0.17) / dq; pa = bin(sl, lv0 + 'cedar', colOf('cedar', lv0, hz)); var dx0 = p.x + jx * (1 - f2) + u * tw * 0.78, dy0 = ty + Math.abs(u) * Ht * 0.045; pa.moveTo(dx0 + dab, dy0); pa.ellipse(dx0, dy0, dab, dab * 0.55, u * 0.5, 0, TAU); }
      }
      if (snow) { var sp = bin(sl, '9snow', rgb(mulc(SNOW, lt))); for (k = 1; k <= nt; k++) { var sy = top + k / nt * Ht - Ht * 0.06, sw = R * (0.12 + 0.88 * k / nt); for (m = 0; m < 3; m++) { var su = (rng() - 0.5) * 1.5, sr = Math.max(0.4, R * (0.08 + rng() * 0.08)); sp.moveTo(p.x + su * sw * 0.6 + sr, sy + Math.abs(su) * Ht * 0.03); sp.ellipse(p.x + su * sw * 0.6, sy + Math.abs(su) * Ht * 0.03, sr * 1.6, sr * 0.55, su * 0.4, 0, TAU); } } }
      return;
    }
    if (q.kind === 'pine') {
      // a few flat pads on a leaning red trunk
      var lean = (rng() - 0.5) * R * 0.6, tr = bin(sl, '0trunk', rgb(mixc(mulc([110, 64, 46], lt), haze, 0.1 + hz * 0.15)));
      tr.moveTo(p.x - R * 0.06, p.y + R * 1.2); tr.lineTo(p.x + lean - R * 0.04, p.y - R * 0.2); tr.lineTo(p.x + lean + R * 0.06, p.y - R * 0.2); tr.lineTo(p.x + R * 0.08, p.y + R * 1.2); tr.closePath();
      for (k = 0; k < 3; k++) {
        var cx = p.x + lean + (k - 1) * R * 0.55 * (k === 1 ? 0 : 1), cy2 = p.y - R * (0.15 + (k === 1 ? 0.35 : 0)) + (k !== 1 ? R * 0.15 : 0), pw = R * (k === 1 ? 0.75 : 0.6) * (0.85 + rng() * 0.3);
        shp.moveTo(cx + pw, cy2 + pw * 0.12); shp.ellipse(cx, cy2 + pw * 0.12, pw, pw * 0.42, 0, 0, TAU);
        for (m = 0; m < 6; m++) { ox = (rng() - 0.5) * pw * 1.5; l = clamp(base + 0.22 + 0.3 * (ox / pw) * lsx + (rng() - 0.5) * 0.24); dab = Math.max(0.5, pw * 0.3) / dq; pa = bin(sl, (1 + Math.round(l * (NL - 2))) + 'pine', colOf('pine', 1 + Math.round(l * (NL - 2)), hz)); pa.moveTo(cx + ox + dab, cy2 - pw * 0.1 + (rng() - 0.5) * pw * 0.2); pa.ellipse(cx + ox, cy2 - pw * 0.1, dab, dab * 0.5, 0, 0, TAU); }
        if (snow) { var sp2 = bin(sl, '9snow', rgb(mulc(SNOW, lt))); for (m = 0; m < 3; m++) { var so = (rng() - 0.5) * pw * 1.2, srr = pw * (0.2 + rng() * 0.15); sp2.moveTo(cx + so + srr, cy2 - pw * 0.24); sp2.ellipse(cx + so, cy2 - pw * 0.24, srr, srr * 0.4, 0, 0, TAU); } }
      }
      return;
    }
    if (bare) {
      // a bare deciduous crown: trunk, limbs and a haze of grey-violet twigs
      var tw2 = bin(sl, '2bare', rgb(mixc(mulc([90, 76, 78], lt), haze, 0.15 + hz * 0.15)));
      tw2.moveTo(p.x, p.y + R * 1.0); tw2.lineTo(p.x, p.y + R * 0.2);
      for (k = 0; k < 5; k++) { a = -Math.PI / 2 + (k / 4 - 0.5) * 2.0 + (rng() - 0.5) * 0.4; var lx = p.x + Math.cos(a) * R * 0.55, ly = p.y + R * 0.2 + Math.sin(a) * R * 0.55; tw2.moveTo(p.x, p.y + R * 0.3); tw2.lineTo(lx, ly); for (m = 0; m < 2; m++) { var a2 = a + (m ? 0.45 : -0.45); tw2.moveTo(lx, ly); tw2.lineTo(lx + Math.cos(a2) * R * 0.45, ly + Math.sin(a2) * R * 0.45); } }
      var fz = bin(sl, '1barefuzz', rgb(mixc(mulc([150, 132, 134], lt), haze, 0.22 + hz * 0.15)));
      for (k = 0; k < 4; k++) { ox = (rng() - 0.5) * R * 0.9; oy = (rng() - 0.6) * R * 0.6; var fr = R * (0.5 + rng() * 0.3); fz.moveTo(p.x + ox + fr, p.y + oy); fz.ellipse(p.x + ox, p.y + oy, fr, fr * 0.8, 0, 0, TAU); }
      if (snow && rng() < 0.6) { var sp3 = bin(sl, '9snow', rgb(mulc(SNOW, lt))); for (k = 0; k < 3; k++) { var bx = p.x + (rng() - 0.5) * R, by = p.y - R * (0.1 + rng() * 0.4); sp3.moveTo(bx + R * 0.15, by); sp3.ellipse(bx, by, R * 0.15, R * 0.05, 0, 0, TAU); } }
      return;
    }
    // a rounded broadleaf crown: a lumpy shadowed mass, then dabs lit from the sun's side and above
    for (k = 0; k < 4; k++) { a = k / 4 * TAU + rng(); var mx = p.x + Math.cos(a) * R * 0.42, my = p.y + R * 0.15 + Math.sin(a) * R * 0.3, mr = R * (0.62 + rng() * 0.15); shp.moveTo(mx + mr, my); shp.ellipse(mx, my, mr, mr * 0.85, 0, 0, TAU); }
    m = Math.round((q.kind === 'accent' ? 14 : 16) * dq);
    for (k = 0; k < m; k++) {
      a = rng() * TAU; rr = Math.sqrt(rng()) * 0.8; ox = Math.cos(a) * rr; oy = Math.sin(a) * rr * 0.82;
      l = clamp(base + 0.32 * ox * lsx - 0.45 * oy + 0.06 + (rng() - 0.5) * 0.26);
      var lv = 1 + Math.round(l * (NL - 2)); dab = Math.max(0.55, R * (0.22 + rng() * 0.1)) / Math.sqrt(dq);
      pa = bin(sl, lv + q.kind, colOf(q.kind, lv, hz)); pa.moveTo(p.x + ox * R + dab, p.y + oy * R - R * 0.08); pa.ellipse(p.x + ox * R, p.y + oy * R - R * 0.08, dab, dab * 0.82, rng(), 0, TAU);
    }
  });
  inserts = (inserts || []).slice().sort(function (a, b) { return b.z - a.z; });
  slices.forEach(function (m, si) {
    var mid = zA - (si + 0.5) * (zA - zB) / NS;
    while (inserts.length && inserts[0].z > mid) inserts.shift().fn();
    Object.keys(m).sort().forEach(function (key) { var e = m[key]; if (key.indexOf('bare') > 0 && key[0] === '2') { ctx.strokeStyle = e.col; ctx.lineWidth = 0.35; ctx.stroke(e.p); return; } ctx.fillStyle = e.col; if (key.indexOf('barefuzz') > 0) { ctx.globalAlpha = 0.55; ctx.fill(e.p); ctx.globalAlpha = 1; } else ctx.fill(e.p); });
  });
  inserts.forEach(function (o) { o.fn(); });
  // light haze over the farthest slopes
  var hz0 = P(0, 0, 116), hz1 = P(0, 0, 100), hg = ctx.createLinearGradient(0, hz0.y - 20, 0, hz1.y); hg.addColorStop(0, rgb(LIT.haze, 0.42 * LIT.hazeK)); hg.addColorStop(1, rgb(LIT.haze, 0)); ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = hg; ctx.fillRect(0, 0, W, hz1.y); ctx.restore();
}
/* rice terraces on the hillsides: contour strips, each held by a grassy bund */
function contourZ(x, lev, za, zb) { // first z in [za, zb] where the ground reaches lev (or null)
  var ha = hillH(x, za), hb = hillH(x, zb); if ((ha - lev) * (hb - lev) > 0) return null;
  for (var i = 0; i < 18; i++) { var zm = (za + zb) / 2, hm = hillH(x, zm); if ((ha - lev) * (hm - lev) <= 0) { zb = zm; hb = hm; } else { za = zm; ha = hm; } }
  return (za + zb) / 2;
}
var TERR_CACHE = {};
function terraceLevels(T) {   // the contour lines never change: work them out once
  var key = T.x + ',' + T.z; if (TERR_CACHE[key]) return TERR_CACHE[key];
  var hmin = 1e9, hmax = -1e9, k, x; for (k = 0; k < 9; k++) { var hh = hillH(T.x, T.z - T.rz + k * T.rz / 4); hmin = Math.min(hmin, hh); hmax = Math.max(hmax, hh); }
  var step = 0.42, levels = [];
  for (var lev = Math.floor(hmin / step) * step; lev <= hmax + step; lev += step) {
    var line = []; for (x = T.x - T.rx - 1; x <= T.x + T.rx + 1; x += 0.7) { var cz = contourZ(x, lev, T.z - T.rz - 3, T.z + T.rz + 3); if (cz !== null) line.push([x, lev, cz]); }
    if (line.length > 1) levels.push(line);
  }
  return (TERR_CACHE[key] = levels);
}
function paintTerraces(ctx) {
  var lt = lightTint(1), pm = SEA.paddy, sky = mixc(LIT.skyHor, LIT.skyTop, 0.4);
  TERRACES.forEach(function (T) {
    var clipP = new Path2D(), k;
    for (k = 0; k <= 36; k++) { var a = k / 36 * TAU, x = T.x + Math.cos(a) * T.rx, z = T.z + Math.sin(a) * T.rz, p = P(x, hillH(x, z), z); if (k) clipP.lineTo(p.x, p.y); else clipP.moveTo(p.x, p.y); }
    ctx.save(); ctx.clip(clipP);
    var levels = terraceLevels(T);
    for (var i = 0; i < levels.length - 1; i++) {
      var A = levels[i], B = levels[i + 1], f = i % 2, col;
      if (pm === 'flood') col = mixc(mixc(sky, [90, 110, 96], 0.3), [255, 255, 255], 0.05 * f);
      else if (pm === 'green') col = scl([96, 140, 60], 0.94 + 0.08 * f);
      else if (pm === 'gold') col = scl(i % 3 === 0 ? [168, 140, 90] : [214, 176, 70], 0.95 + 0.06 * f);
      else col = SEA.snow ? [232, 236, 244] : [150, 134, 108];
      if (pm !== 'flood') col = mulc(col, lt); else col = mulc(col, mixc(lt, [1, 1, 1], 0.5));
      var pts = A.map(function (q) { return Pa(q); }).concat(B.slice().reverse().map(function (q) { return P(q[0], q[1] + 0.02, q[2]); }));
      poly(ctx, pts); ctx.fillStyle = rgb(mixc(col, LIT.haze, 0.18)); ctx.fill();
      // the bund on the outer edge and the shadowed riser below it
      ctx.strokeStyle = rgb(mixc(mulc(SEA.snow ? [210, 214, 224] : SEA.grass[1], lt), LIT.haze, 0.18)); ctx.lineWidth = 0.7; ctx.beginPath(); A.forEach(function (q, k2) { var p2 = Pa(q); if (k2) ctx.lineTo(p2.x, p2.y); else ctx.moveTo(p2.x, p2.y); }); ctx.stroke();
      ctx.strokeStyle = rgb(mixc(mulc([60, 64, 40], lt), LIT.haze, 0.2), 0.5); ctx.lineWidth = 0.45; ctx.beginPath(); A.forEach(function (q, k2) { var p2 = P(q[0], q[1] - 0.12, q[2]); if (k2) ctx.lineTo(p2.x, p2.y + 0.5); else ctx.moveTo(p2.x, p2.y + 0.5); }); ctx.stroke();
    }
    ctx.restore();
  });
}
/* a hamlet of three thatched farmhouses on the slope near the castle */
function drawHamlet(ctx, only) {
  HAMLET.forEach(function (q, i) {
    if (only !== undefined && i !== only) return;
    var y = hillH(q[0], q[1]) - 0.3, B = BF(q[0], q[1], [Math.cos(q[2]), Math.sin(q[2])], y), Wl = boxWalls(B, 6, 4.2, -0.6, 2.2);
    [Wl.f, Wl.l, Wl.r].forEach(function (w) { if (!w.vis) return; paintWall(ctx, w, MAT.earth, { eave: 0.4, tex: 0.3, grime: 0.2 }); if (w === Wl.f) shoji(ctx, w, 1.2, 3.6, 0.2, 1.5, { lit: LIT.lit && i !== 1 }); });
    drawRoof(ctx, B, { W: 3.6, D: 2.8, yE: 2.0, s: 0.95, type: 'hip', mat: 'thatch', seed: 120 + i, ridgeH: 0.3, far: 0.22 });
  });
}
/* a small shrine up the wooded hill: a vermilion torii at the foot of stone steps, a roof among the cedars */
function drawHillShrine(ctx) {
  var T = HILL_SHRINE, S = sil(), lt = lightTint(1), x = T.x, z = T.z, y = hillH(x, z), tx = T.top[0], tz = T.top[1], ty = hillH(tx, tz);
  // the steps
  var st = []; for (var k = 0; k <= 8; k++) { var f = k / 8, sx = lerp(x, tx, f), sz = lerp(z, tz, f); st.push([sx, hillH(sx, sz) + 0.05, sz]); }
  var L = st.map(function (q) { return P(q[0] - 0.5, q[1], q[2]); }), R2 = st.map(function (q) { return P(q[0] + 0.5, q[1], q[2]); });
  poly(ctx, L.concat(R2.reverse())); ctx.fillStyle = rgb(mixc(shade([170, 164, 152], [0, 0.8, -0.6]), LIT.haze, 0.15)); ctx.fill();
  // the hall
  var B = BF(tx, tz, [1, -0.05], ty - 0.6), Wl = boxWalls(B, 2.2, 1.9, 0, 1.6);
  [Wl.f, Wl.l, Wl.r].forEach(function (w) { if (w.vis) paintWall(ctx, w, [130, 90, 62], { eave: 0.3, tex: 0.3, grime: 0 }); });
  drawRoof(ctx, B, { W: 1.6, D: 1.6, yE: 1.5, s: 0.75, type: 'gable', mat: SEA.snow ? 'bark' : 'copper', seed: 9, ridgeH: 0.14, noOni: true, col: [86, 140, 118] });
  // the torii
  var vm = [204, 62, 36], bk = [40, 32, 30], Bt = BF(x, z, [1, 0], y), span = 0.95, h = 2.5;
  [-span, span].forEach(function (a) { var p = Bt.L(a, 0, 0); prism(ctx, p[0], p[2], y - 0.2, y + h, 0.11, 0.1, 8, 0, vm, { snow: 0 }); });
  beam3(ctx, Bt.L(-span - 0.35, 0, h - 0.55), Bt.L(span + 0.35, 0, h - 0.55), 0.13, shade(vm, [0, 0.2, -1]));
  beam3(ctx, Bt.L(-span - 0.6, 0, h + 0.05), Bt.L(span + 0.6, 0, h + 0.05), 0.2, shade(vm, [0, 0.2, -1]));
  beam3(ctx, Bt.L(-span - 0.7, 0, h + 0.25), Bt.L(span + 0.7, 0, h + 0.25), 0.16, shade(SEA.snow ? SNOW : bk, [0, 0.6, -0.8]));
  if (LIT.lit && !S) { var lp = P(tx - 1.4, ty + 0.9, tz - 1.3); ctx.fillStyle = 'rgb(255,206,140)'; ctx.beginPath(); ctx.arc(lp.x, lp.y, Math.max(0.5, 0.12 * lp.k), 0, TAU); ctx.fill(); addGlow(lp, 6, 0.5, false); }
}

/* ---- 06b_drift.js ---- */
/* ================= blizzard: snow driven against things =================
   Drifts pile against the windward wall of every house (the side the wind comes from), and in small mounds at the
   upwind foot of trees, posts, barrels and fences. Each drift is its own depth-sorted object: in front of a wall the
   camera sees, behind one it does not. */
function galeSign() { return WIND_LEAN >= 0 ? 1 : -1; }   // +1: the wind blows toward screen right
function snowCol(ny) { return shade(mixc(SNOW, [214, 224, 240], 0.12), norm([0, ny === undefined ? 1 : ny, -0.25]), { amb: 1.12 }); }
/* a wedge of snow against a wall from a to b (ground points [x, z]), outward normal n ([x, z]): it buries the foot of
   the wall up to a wavy crest, then slopes away and melts into the snow on the ground */
function drawWallDrift(ctx, a, b, n, h, e, seed) {
  var r = mulberry32(seed), N = 16, top = [], base = [], toe = [], i, S = sil(), ph = r() * 9;
  for (i = 0; i <= N; i++) {
    var u = -0.1 + 1.2 * i / N, cu = clamp(u), end = u < 0 ? 1 + u / 0.1 : u > 1 ? 1 - (u - 1) / 0.1 : 1;
    var prof = (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * cu)), 0.6)) * Math.max(0, end), wob = 0.8 + 0.4 * NZ.n2(u * 3.4 + ph, ph);
    var x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, hh = h * prof * wob, ee = e * (0.4 + 0.6 * prof) * (0.85 + 0.3 * NZ.n2(u * 2.3 + 5, ph));
    top.push(P(x + n[0] * 0.03, hh, z + n[1] * 0.03)); base.push(P(x, 0, z)); toe.push(P(x + n[0] * ee, 0, z + n[1] * ee));
  }
  var pp = top.concat(toe.slice().reverse());
  ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y); for (i = 1; i < pp.length; i++) ctx.lineTo(pp[i].x, pp[i].y); ctx.closePath();
  if (S) { ctx.fillStyle = '#000'; ctx.fill(); return; }
  var m = N >> 1, mt = top[m], mb = base[m], mo = toe[m], dx = mo.x - mt.x, dy = mo.y - mt.y, L2 = dx * dx + dy * dy || 1;
  var fb = clamp(((mb.x - mt.x) * dx + (mb.y - mt.y) * dy) / L2, 0.05, 0.9), lt = lightTint(1), c0 = mulc([240, 244, 252], lt), c1 = mulc([226, 232, 244], lt);
  var gr = ctx.createLinearGradient(mt.x, mt.y, mo.x, mo.y);
  gr.addColorStop(0, rgb(c0)); gr.addColorStop(fb, rgb(c1)); gr.addColorStop(Math.min(1, fb + (1 - fb) * 0.5), rgb(c1, 0.55)); gr.addColorStop(1, rgb(c1, 0));
  ctx.fillStyle = gr; ctx.fill();
  // the crest, wind-sharpened, and a faint blue hollow where it meets the wall
  ctx.lineCap = 'round'; ctx.strokeStyle = rgb(mixc(c0, [255, 255, 255], 0.3), 0.8); ctx.lineWidth = Math.max(0.3, 0.035 * mt.k); ctx.beginPath();
  for (i = 2; i < N - 1; i++) { if (i === 2) ctx.moveTo(top[i].x, top[i].y); else ctx.lineTo(top[i].x, top[i].y); }
  ctx.stroke(); ctx.lineCap = 'butt';
}
/* a soft mound at the foot of something, heaped on its upwind side */
function drawMound(ctx, x, z, rr, h) {
  var c = P(x, 0, z), t = P(x, h, z), rx = rr * c.k, ry = rx * CAM.s * 1.1 + Math.max(0.6, c.y - t.y) * 0.5, S = sil();
  if (S) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(c.x, c.y - ry * 0.3, rx * 0.8, ry * 0.7, 0, 0, TAU); ctx.fill(); return; }
  var lt = lightTint(1), cy = c.y - ry * 0.35, g = ctx.createRadialGradient(c.x - galeSign() * rx * 0.15, cy - ry * 0.2, 0, c.x, cy, rx);
  g.addColorStop(0, rgb(mulc([244, 247, 253], lt))); g.addColorStop(0.55, rgb(mulc([230, 236, 246], lt), 0.85)); g.addColorStop(1, rgb(mulc([226, 232, 244], lt), 0));
  ctx.save(); ctx.translate(c.x, cy); ctx.scale(1, ry / rx); ctx.translate(-c.x, -cy); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, cy, rx, 0, TAU); ctx.fill(); ctx.restore();
}
function addBlizzardDrifts(up) {
  var sg = galeSign(), out = [], seed = 1;
  up.forEach(function (o) {
    if (o.foot) {
      var f = o.foot, B = BF(f.x, f.z, f.u, 0), hw = f.w / 2, hd = f.d / 2;
      [[0, -1, -hw, -hd, hw, -hd], [1, 0, hw, -hd, hw, hd], [0, 1, hw, hd, -hw, hd], [-1, 0, -hw, hd, -hw, -hd]].forEach(function (wl) {
        var nn = B.N(wl[0], wl[1], 0), n = [nn[0], nn[2]];
        if (n[0] * sg > -0.3) return;   // only the walls facing the wind
        var A = B.L(wl[2], wl[3], 0), Bp = B.L(wl[4], wl[5], 0), L = Math.hypot(Bp[0] - A[0], Bp[2] - A[2]), c = [(A[0] + Bp[0]) / 2, 0.4, (A[2] + Bp[2]) / 2];
        var vis = faceVisible(c, [n[0], 0, n[1]]), h = 0.45 + 0.35 * Math.min(1, L / 7), e = 1.3 + 0.7 * Math.min(1, L / 7), sd = seed++;
        out.push({ x: c[0], z: c[2], key: o.key + (vis ? -0.03 : 0.03), noShadow: true, draw: function (cx) { drawWallDrift(cx, [A[0], A[2]], [Bp[0], Bp[2]], n, h, e, sd * 131); } });
      });
    }
    var m = o.drift || (o.sway && o.sway.base ? 0.7 + (o.sway.kind === 'willow' ? 0.4 : 0) : 0);
    if (m) { var bx = o.sway ? o.sway.base[0] : o.x, bz = o.sway ? o.sway.base[2] : o.z, mk = P(bx, 0, bz).d; out.push({ x: bx, z: bz, key: (o.key < 1e5 ? Math.min(o.key, mk) : mk) - 0.02, noShadow: true, draw: function (cx) { drawMound(cx, bx - sg * m * 0.5, bz, m, m * 0.4); } }); }
    if (o.driftLine) o.driftLine.forEach(function (ln, k) {
      var a = ln[0], b = ln[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; if (n[0] * sg > 0) n = [-n[0], -n[1]];
      var sd = seed++, c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      out.push({ x: c[0], z: c[1], key: P(c[0] + n[0], 0, c[1] + n[1]).d < P(c[0], 0, c[1]).d ? o.key - 0.02 : o.key + 0.02, noShadow: true, draw: function (cx) { drawWallDrift(cx, a, b, n, 0.4, 0.8, sd * 71); } });
    });
  });
  out.forEach(function (d) { up.push(d); });
}

/* ---- 06z_blur.js ---- */
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
function saveState() { return { WIND_LEAN: WIND_LEAN, W: W, H: H, KS: KS, DQ: DQ, CAM: CAM, SUN: SUN, SUNC: SUNC, AMB: AMB, LS: LS, SX: SX, SZ: SZ, MODE: MODE, F: F, SEA: SEA, LIT: LIT, GRAINPAT: GRAINPAT, GLOWS: GLOWS, TMPS: TMPS }; }
function restoreState(s) { WIND_LEAN = s.WIND_LEAN; W = s.W; H = s.H; KS = s.KS; DQ = s.DQ; CAM = s.CAM; SUN = s.SUN; SUNC = s.SUNC; AMB = s.AMB; LS = s.LS; SX = s.SX; SZ = s.SZ; MODE = s.MODE; F = s.F; SEA = s.SEA; LIT = s.LIT; GRAINPAT = s.GRAINPAT; GLOWS = s.GLOWS; TMPS = s.TMPS; }
function setupScene(o) {
  W = o.W; H = o.H; KS = o.KS; DQ = o.DQ || 1; CAM = makeCam(W, H); F = features(o.stage); F.event = o.event || null; F.prog = o.sp === undefined || o.sp === null ? 0.5 : o.sp; SEA = o.season === 'spring' ? springSea(F.prog) : SEASONS[o.season]; if (F.event === 'shogatsu' && !SEA.snow) SEA = lightSnow(SEA); LIT = weatherLight(LIGHTS[o.light], o.wx); F.wx = o.wx || 'clear'; F.after = !!o.after; F.wet = wxWet(F.wx); setLight(LIT); MODE = 'n'; WIND_LEAN = (o.wsign === -1 ? -1 : 1) * (o.wx === 'typhoon' ? 3 : o.wx === 'blizzard' || o.wx === 'storm' ? 1.8 : 1);
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
  var bd = tmpCanvas(bw, bh), bdx = bd.getContext('2d'); lsT(bdx, KS); bdx.fillStyle = rgb(LIT.haze); bdx.fillRect(0, 0, W, H); paintBackdrop(bdx, true);
  ctx.drawImage(bd, 0, 0);
  // the clouds: a band twice the frame's width, drifted by the animation with the wind (half resolution)
  var clouds = mkCanvas(hw * 2, Math.round(hh * 0.62)), clx = clouds.getContext('2d'); lsT(clx, KS * hw / bw); paintClouds(clx, skyBand(), LIT.name === 'night', LIT.name === 'dusk', W * 2);
  var cbl = softBlur(clouds, Math.max(1, KS * hw / bw * 0.6)); if (cbl !== clouds) { var c2 = mkCanvas(clouds.width, clouds.height); c2.getContext('2d').drawImage(cbl, 0, 0); clouds = c2; }
  var rangeP = RANGE_PATH;
  bd.width = bd.height = 0;
  mark('backdrop');
  await tick(true);
  // 2. ground (per pixel, sliced)
  var gc = tmpCanvas(bw, bh), gx = gc.getContext('2d'), img = gx.createImageData(bw, bh), mimg = gx.createImageData(bw, bh);
  var tg0 = now(); var gs = groundSetup(); PH.grid = Math.round(now() - tg0); var rows = Math.max(4, Math.round(60000 / bw));
  for (var y = 0; y < bh; y += rows) { groundRows(img.data, mimg ? mimg.data : null, bw, y, Math.min(bh, y + rows), gs); tk = tick(); if (tk) await tk; }
  gx.putImageData(img, 0, 0); img = null;
  ctx.drawImage(gc, 0, 0);
  var mc = null;
  mc = tmpCanvas(bw, bh); mc.getContext('2d').putImageData(mimg, 0, 0); mimg = null;
  mark('ground');
  await tick(true);
  // 3. water: reflections, sheen
  {
    var rc = tmpCanvas(hw, hh), rx = rc.getContext('2d'); lsT(rx, KS * hw / bw);
    MODE = 'm'; var dq0 = DQ; DQ = Math.max(0.5, DQ * 0.5);
    for (var i = 0; i < scene.up.length; i++) { var o = scene.up[i]; if (!o.refl) continue; o.draw(rx); tk = tick(); if (tk) await tk; }
    MODE = 'n'; DQ = dq0;
    rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = 'destination-in'; rx.drawImage(mc, 0, 0, hw, hh);
    var r2 = tmpCanvas(hw, hh), r2x = r2.getContext('2d'), amp = KS * hw / bw;
    for (var yy = 0; yy < hh; yy += 1) { var off = (Math.sin(yy / amp * 0.9) * 1.1 + Math.sin(yy / amp * 0.26) * 0.7) * amp; r2x.drawImage(rc, 0, yy, hw, 1, off, yy, hw, 1); }
    r2x.globalCompositeOperation = 'source-atop'; var skyR = mixc(LIT.skyHor, LIT.skyTop, 0.5); r2x.fillStyle = LIT.name === 'night' ? 'rgba(10,16,40,0.3)' : rgb(mixc(skyR, [60, 70, 80], 0.55), 0.32); r2x.fillRect(0, 0, hw, hh);
    var rb = tmpCanvas(bw, bh), rbx = rb.getContext('2d'); rbx.imageSmoothingQuality = 'high'; rbx.drawImage(softBlur(r2, 2.4 * KS * hw / bw), 0, 0, bw, bh); rbx.globalCompositeOperation = 'destination-in'; rbx.drawImage(mc, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = SEA.snow ? 0.3 : 0.4; ctx.drawImage(rb, 0, 0); ctx.restore();
    // sheen glints
    var sc = tmpCanvas(bw, bh), sx = sc.getContext('2d'); lsT(sx, KS);
    var rng = mulberry32(808), gcol = LIT.name === 'night' ? [190, 210, 255] : LIT.name === 'dusk' ? [255, 210, 170] : [255, 246, 230];
    for (i = 0; i < 700 * Math.sqrt(DQ); i++) { var rp = RIVER_S[(rng() * RIVER_S.length) | 0], wx = rp[0] + (rng() - 0.5) * 14, wz = rp[1] + (rng() - 0.5) * 14; if (riverD(wx, wz) > -0.4) continue; var p = P(wx, WL, wz), l = (0.4 + rng() * 1.6) * p.k / 3; sx.strokeStyle = rgb(gcol, 0.1 + rng() * 0.26); sx.lineWidth = 0.4; sx.beginPath(); sx.moveTo(p.x - l, p.y); sx.lineTo(p.x + l, p.y); sx.stroke(); }
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
  shx.globalCompositeOperation = 'destination-out'; shx.globalAlpha = 0.6; shx.drawImage(mc, 0, 0, hw, hh); shx.globalAlpha = 1;   // shade lies lightly on moving water
  compositeLayer(ctx, shc, 1.2 * KS * hw / bw, LIT.shadowA, LIT.shadow);
  mark('shadow');
  await tick(true);
  // 7. upright objects on their own layer (its alpha occludes the water for animation)
  var obj = tmpCanvas(bw, bh), ox = obj.getContext('2d'); lsT(ox, KS);
  var oprof = job.prof ? [] : null;
  for (i = 0; i < scene.up.length; i++) { var to = now(); scene.up[i].draw(ox); if (oprof) { ox.getImageData(0, 0, 1, 1); oprof.push([(now() - to), +scene.up[i].x.toFixed(2), +scene.up[i].z.toFixed(2)]); } tk = tick(); if (tk) await tk; }
  if (oprof) { PH.sum = Math.round(oprof.reduce(function (s, a) { return s + a[0]; }, 0)); PH.n = oprof.length; oprof.sort(function (a, b) { return b[0] - a[0]; }); PH.top = oprof.slice(0, 12); }
  var swayOn = job.mask !== false && swayWanted(F.wx) && scene.up.some(function (o) { return o.sway; }), base0 = null;
  if (swayOn) { base0 = tmpCanvas(bw, bh); base0.getContext('2d').drawImage(out, 0, 0); }   // the town before anything stands on it (for the trees' patches)
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(obj, 0, 0); ctx.restore();
  mark('objects');
  await tick(true);
  // 8. post
  var reflGlows = GLOWS.filter(function (g) { return g.refl; }), glows = GLOWS.filter(function (g) { return !g.refl; });
  post(ctx, bw, bh, glows, reflGlows, mc);
  mark('post');
  var sway = null;
  if (swayOn) { sway = await bakeSway(job, scene, out, base0, glows, reflGlows, mc, tick); mark('sway'); }
  // 8b. where the sky shows (for the drifting clouds): not behind the ranges, the hills, the ground or anything standing
  var sky = mkCanvas(hw, Math.round(hh * 0.62)), skx = sky.getContext('2d'); skx.fillStyle = '#fff'; skx.fillRect(0, 0, sky.width, sky.height);
  skx.globalCompositeOperation = 'destination-out'; if (rangeP) { lsT(skx, KS * hw / bw); skx.fill(rangeP); skx.setTransform(1, 0, 0, 1, 0, 0); }
  skx.drawImage(gc, 0, 0, hw, hh); skx.drawImage(obj, 0, 0, hw, hh);
  // 9. water visibility mask for the animated overlay (half res)
  var wm = null;
  if (job.mask !== false) {
    wm = mkCanvas(hw, hh); var wx2 = wm.getContext('2d');
    wx2.drawImage(mc, 0, 0, hw, hh); wx2.globalCompositeOperation = 'destination-out'; wx2.drawImage(obj, 0, 0, hw, hh);
    lsT(wx2, KS * hw / bw); MODE = 'k'; scene.surf.forEach(function (f) { f(wx2); }); MODE = 'n';
  }
  // 10. occluders in front of the animated anchors, one mask per depth band (half res)
  var occ = [], anc = job.mask !== false ? animAnchors() : [];
  if (anc.length) {
    MODE = 'k';
    for (var bd = 0; bd < NBANDS; bd++) {
      var mine = anc.filter(function (a) { return a.band === bd; }); if (!mine.length) { occ.push(null); continue; }
      var oc0 = mkCanvas(hw, hh), oc = oc0.getContext('2d'); lsT(oc, KS * hw / bw);
      // one pass: each object once, clipped to the boxes of the anchors it stands in front of
      for (var j = 0; j < scene.up.length; j++) {
        var u = scene.up[j]; if (u.key >= 1e5) continue;
        var clipP = null;
        for (var m = 0; m < mine.length; m++) { var a = mine[m]; if (u.key < a.key - 0.02) { if (!clipP) clipP = new Path2D(); clipP.rect(a.bb[0], a.bb[1], a.bb[2] - a.bb[0], a.bb[3] - a.bb[1]); } }
        if (!clipP) continue;
        oc.save(); oc.clip(clipP); u.draw(oc); oc.restore();
      }
      occ.push(oc0);
      tk = tick(); if (tk) await tk;
    }
    MODE = 'n';
  }
  freeTmps(); mark('mask');
  return { canvas: out, mask: wm, occ: occ, glows: glows, clouds: clouds, sky: sky, sway: sway, ms: now() - t0, phases: PH };
}
function post(ctx, bw, bh, glows, reflGlows, mc) {
  var yo = CAM.cy - 150, i;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // depth of field: soften distance and the very front
  var b = softBlur(ctx.canvas, 2.0 * KS), tb = tmpCanvas(bw, bh), tbx = tb.getContext('2d');
  tbx.drawImage(b, 0, 0); tbx.globalCompositeOperation = 'destination-in';
  function st(ly) { return clamp((ly + yo) / H); }
  var gm = tbx.createLinearGradient(0, 0, 0, bh);
  gm.addColorStop(0, 'rgba(0,0,0,0.35)'); gm.addColorStop(st(0.12 * 300), 'rgba(0,0,0,0.12)'); gm.addColorStop(st(0.22 * 300), 'rgba(0,0,0,0)'); gm.addColorStop(Math.max(st(0.36 * 300) + 0.01, st(0.88 * 300)), 'rgba(0,0,0,0)'); gm.addColorStop(1, 'rgba(0,0,0,0.7)');
  tbx.fillStyle = gm; tbx.fillRect(0, 0, bw, bh); ctx.drawImage(tb, 0, 0);
  // weather: distance veiled in rain, spray or driven snow (screen height stands in for depth)
  if (LIT.blizzard) paintWhiteout(ctx, bw, bh);
  else if (LIT.fog) {
    var fg = ctx.createLinearGradient(0, (yo + P(0, 0, 100).y - yo) * KS, 0, P(0, 0, 30).y * KS), hzc = LIT.haze;
    fg.addColorStop(0, rgb(hzc, LIT.fog)); fg.addColorStop(0.55, rgb(hzc, LIT.fog * 0.45)); fg.addColorStop(1, rgb(hzc, LIT.fog * 0.12));
    ctx.fillStyle = fg; ctx.fillRect(0, 0, bw, bh);
  }
  // light wash from the sun / moon
  var L = LIT, sx = bw * (L.sunX < 0.5 ? L.sunX - 0.08 : L.sunX + 0.08), sy = (yo * KS) + bh * 0 - bh * 0.05 + L.sunY * KS * 120;
  var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, bw * 1.1);
  sg.addColorStop(0, L.wash[0]); sg.addColorStop(0.55, L.wash[1]); sg.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = sg; ctx.fillRect(0, 0, bw, bh);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = L.name === 'night' ? 0.25 : 0.45; ctx.fillRect(0, 0, bw, bh); ctx.globalAlpha = 1;
  if (L.grade) {
    ctx.globalCompositeOperation = 'multiply'; var dg = ctx.createLinearGradient(0, 0, 0, bh);
    dg.addColorStop(0, rgb(L.grade[0])); dg.addColorStop(L.gradeMid ? st(L.gradeMid * 300) : 0.45, rgb(L.grade[1])); dg.addColorStop(1, rgb(L.grade[2])); ctx.fillStyle = dg; ctx.fillRect(0, 0, bw, bh);
  }
  if (L.lit) {
    ctx.globalCompositeOperation = 'lighter';
    var gk = L.name === 'night' ? 1.25 : 0.85;
    if (LIT.blizzard) glows.forEach(function (g) { var r = g.r * KS * (g.far ? 1 : 1.25); drawGlow(ctx, g.x * KS, g.y * KS, r * 3.4, g.a * gk * 0.16); drawGlow(ctx, g.x * KS, g.y * KS, r * 1.6, g.a * gk * 0.62); });   // lamps through driven snow: wide and soft
    else glows.forEach(function (g) { drawGlow(ctx, g.x * KS, g.y * KS, g.r * KS * (g.far ? 1 : 1.25), g.a * gk); });
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

/* ---- 07b_sway.js ---- */
/* ================= trees in a gale: baked layers for the animated sway =================
   In a typhoon, blizzard or storm the painter bakes, for every tree that reads at this scale:
     sprite  the tree exactly as painted (final pixels, post-processing included), alpha = where it differs from the town without it
     patch   what lies behind it: the same painting with the swaying trees left out (rendered and post-processed a second time)
     mask    the silhouettes of everything standing in front of it (so a bent crown never slides over a nearer roof)
     wood    willows only: the trunk and limbs, which bend less than the hanging fronds
   The overlay covers each tree with its patch and redraws the sprite bent from the base, so no ghost edge is left behind. */
var SWAY_WX = { typhoon: 1, blizzard: 0.8, storm: 0.3 };
function swayWanted(wx) { return !!SWAY_WX[wx]; }
function swayTree(kind, t) {
  return {
    kind: kind, base: t.base,
    pts: function () {
      var L = [];
      t.segs.forEach(function (s) { L.push([s.a, s.r0 + 0.1], [s.b, s.r1 + 0.1]); });
      if (t.sprays) t.sprays.forEach(function (s) { L.push([s.p, s.r * 1.25 + 0.15]); });
      if (t.twigs) t.twigs.forEach(function (tw) { L.push([tw[2], 0.15]); });
      if (t.strands) t.strands.forEach(function (st) { for (var k = 0; k <= 4; k++) L.push([strandPt(st, k / 4), 0.25]); });
      if (t.pads) t.pads.forEach(function (pd) { L.push([[pd.x, pd.y, pd.z], pd.r * 1.15 + 0.15]); });
      if (t.yuki) L.push([[t.top[0], t.top[1] + 1.2 * t.S, t.top[2]], 0.3]);
      return L;
    },
    wood: kind === 'willow' ? function (c) { drawBranches(c, t.segs, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]); } : null
  };
}
function swayCedar(x, z, h, seed) {
  return { kind: 'cedar', base: [x, 0, z], pts: function () { return [[[x, 0, z], 0.5], [[x, h, z], 0.6], [[x, h * 0.3, z], h * 0.17 + 0.6], [[x, h * 0.6, z], h * 0.12 + 0.5]]; }, wood: null };
}
/* how far each kind may bend (fraction of its height at the top) and how stiff it is */
var SWAY_KIND = { broad: { amp: 0.06, f: 0.7, max: 0.14 }, willow: { amp: 0.07, f: 0.45, max: 0.22 }, pine: { amp: 0.04, f: 0.55, max: 0.09 }, cedar: { amp: 0.045, f: 0.42, max: 0.1 } };
function swayLogicalBox(o) {
  var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  o.sway.pts().forEach(function (q) { var p = Pa(q[0]), r = q[1] * p.k; x0 = Math.min(x0, p.x - r); x1 = Math.max(x1, p.x + r); y0 = Math.min(y0, p.y - r); y1 = Math.max(y1, p.y + r); });
  return [x0 - 2, y0 - 2, x1 + 2, y1 + 2];
}
/* separable max filter on a 0/1 byte mask */
function dilateMask(m, w, h, r) {
  if (r <= 0) return m;
  var t = new Uint8Array(w * h), o = new Uint8Array(w * h), x, y, k;
  for (y = 0; y < h; y++) { var row = y * w, run = -1e9; for (x = 0; x < w; x++) if (m[row + x]) { for (k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) t[row + k] = 1; } }
  for (x = 0; x < w; x++) for (y = 0; y < h; y++) if (t[y * w + x]) { for (k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) o[k * w + x] = 1; }
  return o;
}
async function bakeSway(job, scene, out, base0, glows, reflGlows, mc, tick) {
  var bw = out.width, bh = out.height, list = [], i, j, tk;
  scene.up.forEach(function (o, idx) { if (o.sway) { var b = swayLogicalBox(o); var gb = [Math.max(0, Math.floor(b[0] * KS)), Math.max(0, Math.floor(b[1] * KS)), Math.min(bw, Math.ceil(b[2] * KS)), Math.min(bh, Math.ceil(b[3] * KS))]; if (gb[2] - gb[0] > 3 && gb[3] - gb[1] > 3) list.push({ o: o, idx: idx, gb: gb }); } });
  if (!list.length) return null;
  var U = [bw, bh, 0, 0]; list.forEach(function (q) { U[0] = Math.min(U[0], q.gb[0]); U[1] = Math.min(U[1], q.gb[1]); U[2] = Math.max(U[2], q.gb[2]); U[3] = Math.max(U[3], q.gb[3]); });
  // 1. the town with the swaying trees left out, post-processed like the painting
  var on = tmpCanvas(bw, bh), ox = on.getContext('2d'), clipP = new Path2D();
  list.forEach(function (q) { clipP.rect(q.gb[0] / KS - 1, q.gb[1] / KS - 1, (q.gb[2] - q.gb[0]) / KS + 2, (q.gb[3] - q.gb[1]) / KS + 2); });
  ox.setTransform(KS, 0, 0, KS, 0, 0); ox.save(); ox.clip(clipP);
  var gl0 = GLOWS.length;
  for (i = 0; i < scene.up.length; i++) { if (scene.up[i].sway) continue; scene.up[i].draw(ox); tk = tick(); if (tk) await tk; }
  GLOWS.length = gl0; ox.restore();
  var bx = base0.getContext('2d'); bx.setTransform(1, 0, 0, 1, 0, 0); bx.drawImage(on, 0, 0);
  post(bx, bw, bh, glows, reflGlows, mc);
  await tick(true);
  // 2. where the painting differs: the trees
  var ux = U[0], uy = U[1], uw = U[2] - U[0], uh = U[3] - U[1];
  var A = out.getContext('2d').getImageData(ux, uy, uw, uh).data, Bd = bx.getImageData(ux, uy, uw, uh).data, N = uw * uh, D = new Uint8Array(N), Lb = new Int16Array(N);
  for (i = 0; i < N; i++) { var k4 = i * 4, d0 = Math.abs(A[k4] - Bd[k4]), d1 = Math.abs(A[k4 + 1] - Bd[k4 + 1]), d2 = Math.abs(A[k4 + 2] - Bd[k4 + 2]); D[i] = Math.max(d0, d1, d2); Lb[i] = -1; }
  // 3. whose pixel: the nearest tree whose (slightly grown) silhouette covers it, else the nearest whose box holds it
  var sc = tmpCanvas(8, 8), sx = sc.getContext('2d'), mode0 = MODE, rad = Math.max(2, Math.round(KS * 0.45));
  function silOf(q, fn) {
    var w = q.gb[2] - q.gb[0], h = q.gb[3] - q.gb[1]; if (sc.width < w || sc.height < h) { sc.width = Math.max(sc.width, w); sc.height = Math.max(sc.height, h); }
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, w, h); sx.setTransform(KS, 0, 0, KS, -q.gb[0], -q.gb[1]);
    MODE = 'k'; fn(sx); MODE = mode0;
    var a = sx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h); for (var p = 0; p < w * h; p++) m[p] = a[p * 4 + 3] > 20 ? 1 : 0; return m;
  }
  for (j = list.length - 1; j >= 0; j--) {
    var q = list[j], gw = q.gb[2] - q.gb[0], gh = q.gb[3] - q.gb[1]; q.sil = silOf(q, q.o.draw); var m = dilateMask(q.sil, gw, gh, rad);
    if (q.o.sway.wood) q.wood = dilateMask(silOf(q, q.o.sway.wood), gw, gh, 1);
    for (var yy = 0; yy < gh; yy++) for (var xx = 0; xx < gw; xx++) { if (!m[yy * gw + xx]) continue; var pi = (q.gb[1] + yy - uy) * uw + (q.gb[0] + xx - ux); if (Lb[pi] < 0 && D[pi] > 2) Lb[pi] = j; }
    tk = tick(); if (tk) await tk;
  }
  for (j = list.length - 1; j >= 0; j--) { var g2 = list[j].gb; for (var y2 = g2[1]; y2 < g2[3]; y2++) for (var x2 = g2[0]; x2 < g2[2]; x2++) { var p2 = (y2 - uy) * uw + (x2 - ux); if (Lb[p2] < 0 && D[p2] > 4) Lb[p2] = j; } }
  // 4. what stands in front of each tree: walk the scene from the nearest object back, keeping the silhouettes gathered so far
  list.forEach(function (q) { var K = SWAY_KIND[q.o.sway.kind] || SWAY_KIND.broad, e = Math.ceil((q.gb[3] - q.gb[1]) * K.max * 1.2 + 4); q.ge = [Math.max(0, q.gb[0] - e), Math.max(0, q.gb[1] - e), Math.min(bw, q.gb[2] + e), q.gb[3]]; });
  var acc = tmpCanvas(bw, bh), cc = acc.getContext('2d'), mclip = new Path2D(), byIdx = {};
  list.forEach(function (q) { mclip.rect(q.ge[0] / KS, q.ge[1] / KS, (q.ge[2] - q.ge[0]) / KS, (q.ge[3] - q.ge[1]) / KS); byIdx[q.idx] = q; });
  cc.setTransform(KS, 0, 0, KS, 0, 0); cc.save(); cc.clip(mclip); MODE = 'k';
  for (i = scene.up.length - 1; i >= 0; i--) {
    var u = scene.up[i];
    if (u.sway) { var Q = byIdx[i]; if (Q) { var ew = Q.ge[2] - Q.ge[0], eh = Q.ge[3] - Q.ge[1], od = cc.getImageData(Q.ge[0], Q.ge[1], ew, eh).data; Q.occ = new Uint8Array(ew * eh); for (var o2 = 0; o2 < ew * eh; o2++) Q.occ[o2] = od[o2 * 4 + 3]; } continue; }
    if (u.key >= 1e5) continue;
    u.draw(cc); tk = tick(); if (tk) { MODE = mode0; await tk; MODE = 'k'; }
  }
  MODE = mode0; cc.restore();
  // 5. each tree: the pixels it owns, the pixels of it hidden behind nearer things (filled in, so a bend never opens a gap),
  //    its bend allowance and its place in the atlas
  var metas = [];
  list.forEach(function (q, jj) {
    var gw = q.gb[2] - q.gb[0], gh = q.gb[3] - q.gb[1], ew = q.ge[2] - q.ge[0], b = [1e9, 1e9, -1, -1], hole = new Uint8Array(gw * gh), x, y;
    for (y = 0; y < gh; y++) for (x = 0; x < gw; x++) {
      var pi = (q.gb[1] + y - uy) * uw + (q.gb[0] + x - ux), L = Lb[pi], li = y * gw + x, own = L === jj;
      if (!own && q.sil[li]) { var oc = q.occ ? q.occ[(q.gb[1] + y - q.ge[1]) * ew + (q.gb[0] + x - q.ge[0])] : 0; if (oc > 100 || L > jj) hole[li] = 1; }
      if (own || hole[li]) { var X = q.gb[0] + x, Y = q.gb[1] + y; if (X < b[0]) b[0] = X; if (X > b[2]) b[2] = X; if (Y < b[1]) b[1] = Y; if (Y > b[3]) b[3] = Y; }
    }
    if (b[2] < 0 || b[2] - b[0] < 2 || b[3] - b[1] < 2) return;
    b[0] = Math.max(0, b[0] - 2); b[1] = Math.max(0, b[1] - 2); b[2] = Math.min(bw, b[2] + 3); b[3] = Math.min(bh, b[3] + 3);
    var bp = Pa(q.o.sway.base), by = bp.y * KS, hp = Math.max(4, by - b[1]), K = SWAY_KIND[q.o.sway.kind] || SWAY_KIND.broad, mg = Math.ceil(hp * K.max * 1.15 + 3);
    q.hole = hole;
    metas.push({ q: q, jj: jj, box: b, w: b[2] - b[0], h: b[3] - b[1], mg: mg, by: by, hp: hp, cx: (b[0] + b[2]) / 2, kind: q.o.sway.kind, key: q.o.key, seed: q.idx });
  });
  if (!metas.length) return null;
  // shelf-pack: sprite, patch, (wood), mask per tree
  var items = [];
  metas.forEach(function (M) { items.push({ M: M, t: 'aS', w: M.w, h: M.h }, { M: M, t: 'aP', w: M.w, h: M.h }); if (M.q.wood) items.push({ M: M, t: 'aW', w: M.w, h: M.h }); items.push({ M: M, t: 'aM', w: M.w + 2 * M.mg, h: M.h + M.mg }); });
  var AW = Math.max(256, Math.min(bw, 2400)), cx = 0, cy = 0, rowH = 0;
  items.sort(function (a, b) { return b.h - a.h; });
  items.forEach(function (it) { if (cx + it.w > AW) { cx = 0; cy += rowH + 2; rowH = 0; } it.M[it.t] = [cx, cy]; cx += it.w + 2; rowH = Math.max(rowH, it.h); });
  var AH = cy + rowH + 2, atlas = mkCanvas(AW, AH), ax = atlas.getContext('2d'), img = ax.createImageData(AW, AH), Z = img.data;
  // 6. sprite (the painting where the tree shows, its hidden parts filled from its own colours), patch (what lies behind it),
  //    wood (willow limbs), mask (what stands in front)
  metas.forEach(function (M) {
    var q = M.q, b = M.box, w = M.w, h = M.h, own = new Uint8Array(w * h), fill = new Uint8Array(w * h), x, y, gb = q.gb, gw = gb[2] - gb[0], gh = gb[3] - gb[1], wood = q.wood;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var pi = (b[1] + y - uy) * uw + (b[0] + x - ux), gx = b[0] + x - gb[0], gy = b[1] + y - gb[1], inG = gx >= 0 && gy >= 0 && gx < gw && gy < gh;
      own[y * w + x] = Lb[pi] === M.jj && D[pi] > 1 ? 1 : 0; fill[y * w + x] = inG && q.hole[gy * gw + gx] ? 1 : 0;
    }
    // colours: own pixels from the painting, hidden ones grown inward from them (onion-peel average of known neighbours)
    var R = new Float32Array(w * h * 3), known = new Uint8Array(w * h), front = [], li;
    for (li = 0; li < w * h; li++) if (own[li]) { var s4 = ((b[1] + ((li / w) | 0) - uy) * uw + (b[0] + li % w - ux)) * 4; R[li * 3] = A[s4]; R[li * 3 + 1] = A[s4 + 1]; R[li * 3 + 2] = A[s4 + 2]; known[li] = 1; }
    for (li = 0; li < w * h; li++) if (fill[li] && !known[li]) front.push(li);
    for (var pass = 0; pass < 400 && front.length; pass++) {
      var next = [], set = [];
      for (var f = 0; f < front.length; f++) {
        var id = front[f], fx = id % w, fy = (id / w) | 0, sr = 0, sg = 0, sb = 0, n = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var nx = fx + dx, ny = fy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; var ni = ny * w + nx; if (known[ni] === 1) { sr += R[ni * 3]; sg += R[ni * 3 + 1]; sb += R[ni * 3 + 2]; n++; } }
        if (n) { R[id * 3] = sr / n; R[id * 3 + 1] = sg / n; R[id * 3 + 2] = sb / n; set.push(id); } else next.push(id);
      }
      if (!set.length) break;
      for (f = 0; f < set.length; f++) known[set[f]] = 1;
      front = next;
    }
    var grown = dilateMask(own, w, h, 2);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      li = y * w + x; var pi2 = (b[1] + y - uy) * uw + (b[0] + x - ux), s5 = pi2 * 4;
      if (own[li] || (fill[li] && known[li])) {
        var gx2 = b[0] + x - gb[0], gy2 = b[1] + y - gb[1], isWood = !!wood && gx2 >= 0 && gy2 >= 0 && gx2 < gw && gy2 < gh && wood[gy2 * gw + gx2] === 1;
        var slot = isWood ? M.aW : M.aS, o4 = ((slot[1] + y) * AW + slot[0] + x) * 4;
        Z[o4] = R[li * 3]; Z[o4 + 1] = R[li * 3 + 1]; Z[o4 + 2] = R[li * 3 + 2]; Z[o4 + 3] = own[li] ? Math.round(255 * clamp((D[pi2] - 1) / 3)) : 255;   // own: the colour already holds the antialiased mix
      }
      if (grown[li]) { var o5 = ((M.aP[1] + y) * AW + M.aP[0] + x) * 4; Z[o5] = Bd[s5]; Z[o5 + 1] = Bd[s5 + 1]; Z[o5 + 2] = Bd[s5 + 2]; Z[o5 + 3] = own[li] ? 255 : 150; }
    }
    // the mask: silhouettes of everything nearer, over the tree's reach
    var ew = q.ge[2] - q.ge[0], mx0 = b[0] - M.mg, my0 = b[1] - M.mg, mw = w + 2 * M.mg, mh = h + M.mg, mb = [1e9, 1e9, -1, -1];
    if (q.occ) for (y = 0; y < mh; y++) for (x = 0; x < mw; x++) {
      var ex = mx0 + x - q.ge[0], ey = my0 + y - q.ge[1]; if (ex < 0 || ey < 0 || ex >= ew || ey >= q.ge[3] - q.ge[1]) continue;
      var al = q.occ[ey * ew + ex]; if (al < 8) continue;
      var o6 = ((M.aM[1] + y) * AW + M.aM[0] + x) * 4; Z[o6 + 3] = al;
      if (x < mb[0]) mb[0] = x; if (x > mb[2]) mb[2] = x; if (y < mb[1]) mb[1] = y; if (y > mb[3]) mb[3] = y;
    }
    M.mb = mb[2] < 0 ? null : [mb[0], mb[1], mb[2] - mb[0] + 1, mb[3] - mb[1] + 1];
  });
  // the opaque span of every 8 rows of each sprite, so the overlay draws no more than it must
  function spans(slot, M) {
    if (!slot) return null;
    var out = [];
    for (var y0 = 0; y0 < M.h; y0 += 8) { var a0 = 1e9, a1 = -1; for (var y = y0; y < Math.min(M.h, y0 + 8); y++) for (var x = 0; x < M.w; x++) if (Z[((slot[1] + y) * AW + slot[0] + x) * 4 + 3]) { if (x < a0) a0 = x; if (x > a1) a1 = x; } out.push(a1 < 0 ? [0, 0] : [a0, a1 + 1]); }
    return out;
  }
  metas.forEach(function (M) { M.rs = spans(M.aS, M); M.rw = spans(M.aW, M); });
  ax.putImageData(img, 0, 0); img = null; Z = null;
  return {
    atlas: atlas, bw: bw,
    meta: metas.map(function (M) { return { k: M.kind, b: M.box, s: M.aS, p: M.aP, w: M.aW || null, m: M.aM, mb: M.mb, rs: M.rs, rw: M.rw, mg: M.mg, by: Math.round(M.by * 10) / 10, hp: Math.round(M.hp * 10) / 10, cx: M.cx, key: M.key, seed: M.seed }; })
  };
}

/* ---- 08_anim.js ---- */
/* ================= animated overlays (drawn each frame over the cached painting) =================
   Things that move live in depth bands; each band has its own occluder mask, painted once with the static
   picture: the silhouettes of whatever stands in front of that band's anchors. */
var NBANDS = 4;   // 0 the near countryside, 1 the river, 2 the town, 3 spare
/* height of the deck where a path crosses the bridge */
function bridgeY(x, z) {
  var a = (x - BR.x) * BR.ax[0] + (z - BR.z) * BR.ax[1], b = -(x - BR.x) * BR.ax[1] + (z - BR.z) * BR.ax[0];
  if (Math.abs(b) > BR.w / 2 + 0.2 || Math.abs(a) > BR.len / 2) return 0;
  if (F.stoneBridge) { var u = clamp(Math.abs(a) / (BR.len / 2)); return 0.1 + 3.25 * Math.pow(Math.cos(u * Math.PI / 2), 1.25); }
  var L = 17; return Math.abs(a) < L / 2 ? 0.55 + 0.35 * Math.cos(a / L * Math.PI) : 0;
}
function screenBox(pts3, m) {
  var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts3.forEach(function (q) { var p = Pa(q); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  m = m || 3; return [Math.floor(x0 - m), Math.floor(y0 - m), Math.ceil(x1 + m), Math.ceil(y1 + m)];
}
/* open polyline with arc lengths */
function polyLen(pts) { var L = [0]; for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { p: pts, L: L, len: L[L.length - 1] }; }
function polyAt(pa, s) {
  s = clamp(s, 0, pa.len); var lo = 0, hi = pa.L.length - 1;
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (pa.L[m] <= s) lo = m; else hi = m; }
  var a = pa.p[lo], b = pa.p[hi], f = (s - pa.L[lo]) / ((pa.L[hi] - pa.L[lo]) || 1), dx = b[0] - a[0], dz = b[1] - a[1], dl = Math.hypot(dx, dz) || 1;
  return { x: a[0] + dx * f, z: a[1] + dz * f, dx: dx / dl, dz: dz / dl };
}

/* ---------- what moves, where (all from the layout, so it needs no painting) ---------- */
function norenList() {
  var out = [];
  townPlan(F).forEach(function (b) {
    if (b.type !== 'machiya' && b.type !== 'shoka' && b.type !== 'inn' || b.low) return;
    var B = BF(b.x, b.z, b.u, 0), Wl = boxWalls(B, b.w, b.d, 0, 3), f = Wl.f; if (!f.vis) return;
    var s0, s1, top = 2.75, len = 1.05, col = b.ncol || [[34, 48, 86], [104, 60, 40], [44, 40, 40], [36, 62, 70]][b.seed % 4];
    if (b.type === 'inn') { s0 = b.w * 0.38; s1 = b.w * 0.62; top = 2.85; len = 1.1; col = [120, 40, 34]; }
    else { var dw = b.type === 'shoka' ? 2.4 : 1.7, dl = b.doorLeft ? 0.25 : b.w - dw - 0.25; s0 = dl - 0.08; s1 = dl + dw + 0.08; if (b.type === 'shoka') col = [30, 44, 80]; }
    out.push({ W: f, s0: s0, s1: s1, top: top, len: len, col: col, n: Math.max(2, Math.round((s1 - s0) / 0.55)), ph: b.seed * 1.7, band: 2, crest: b.type === 'shoka' || b.seed % 3 === 0 });
  });
  if (F.teahouse) { var tb = teaFrame(), tw = boxWalls(tb, 5.6, 4.2, 0, 2.5).f; if (tw.vis) out.push({ W: tw, s0: 0.45, s1: 2.35, top: 2.2, len: 0.75, col: [40, 54, 92], n: 3, ph: 2, band: 0 }); }
  return out;
}
function noboriList() {
  var out = [];
  if (F.teahouse && !F.festival) { var tb = teaFrame(), p = tb.L(5.6 / 2 + 0.9, -4.2 / 2 - 1.2, 0); out.push({ x: p[0], z: p[2], h: 3.6, side: tb.u, col: [238, 232, 216], edge: [184, 46, 36], ph: 0.4, band: 0, mark: true }); }
  if (F.theatre) { var th = theatreFrame(), cols = [[198, 54, 40], [42, 70, 140], [226, 180, 50], [60, 120, 80], [150, 60, 130], [198, 54, 40]]; for (var i = 0; i < 6; i++) { var q = th.L(-4.4 + i * 1.75, -6.4, 0); out.push({ x: q[0], z: q[2], h: 4.6, side: th.u, col: cols[i], edge: [240, 236, 226], ph: i * 1.3, band: 2, mark: true }); } }
  if (F.festival) {
    for (var s = 15; s <= 40; s += 8.3) { var r = rvPt(s, -2.8); out.push({ x: r[0], z: r[1], h: 4.4, side: [-RV_DIR[0], -RV_DIR[1]], col: [236, 232, 220], edge: [196, 52, 40], ph: s, band: 2, mark: true }); }
    for (var t2 = 5; t2 <= 35; t2 += 7.5) { var m = stPt(t2, -(STREET_HW - 0.9)); out.push({ x: m[0], z: m[1], h: 4.4, side: STREET_DIR, col: [196, 52, 40], edge: [236, 232, 220], ph: t2 * 0.7, band: 2, mark: true }); }
  }
  return out;
}
function stringList() {
  if (!F.festival) return [];
  var out = [];
  function along(fn, a0, a1, off, y) { for (var a = a0; a < a1 - 0.5; a += 8) { var p0 = fn(a, off), p1 = fn(Math.min(a1, a + 8), off); out.push({ a: [p0[0], y, p0[1]], b: [p1[0], y, p1[1]], sag: 0.45, n: 7, ph: a * 0.37, band: 2 }); } }
  along(rvPt, 13, 41, 3.4, 3.9);
  along(stPt, 14, 37, STREET_HW - 0.8, 3.9);
  along(stPt, 6, 32, -(STREET_HW - 0.8), 3.0);
  return out;
}
function walkPaths() {
  var P0 = [], road = ROAD_S.slice();
  road.push(BR_NEAR, [BR.x, BR.z], BR_FAR, stPt(4));
  P0.push({ pts: road, band: 0, spread: 0.8, w: 1 });
  if (F.sign) P0.push({ pts: SIDE_S.slice(), band: 0, spread: 0.3, w: 0.35 });
  if (F.shrine) P0.push({ pts: SHR_S.slice(), band: 0, spread: 0.2, w: 0.2 });
  if (F.rivst || F.street) P0.push({ pts: RIVST_S.slice(0), band: 2, spread: 2.0, w: F.machiya ? 1.6 : 0.8 });
  if (F.street) P0.push({ pts: [stPt(-1), stPt(14), stPt(28), stPt(39.5)], band: 2, spread: F.machiya ? 3.2 : 2.0, w: 1.6 });
  if (F.landing) P0.push({ pts: [krPt(5, RIVER_HW + 1.3), krPt(19, RIVER_HW + 1.3), krPt(34, RIVER_HW + 1.5)], band: 2, spread: 0.4, w: 0.5 });
  if (F.market) P0.push({ pts: [[MARKET.x - 7, MARKET.z + 1.5], [MARKET.x - 1, MARKET.z - 2], [MARKET.x + 5, MARKET.z + 0.5], [MARKET.x + 9, MARKET.z + 3]], band: 2, spread: 1.2, w: 0.8 });
  spectatorPaths().forEach(function (q) { P0.push(q); });
  P0.forEach(function (q) { q.pa = polyLen(q.pts); });
  return P0;
}
function boatPath() { var pts = []; for (var i = 0; i < RIVER_S.length; i += 2) { var p = RIVER_S[i]; if (p[0] < -62 || p[0] > 66) continue; pts.push([p[0] + 0.0, p[1] + 1.6]); } return polyLen(pts); }

/* screen boxes and depth keys of everything that moves behind something */
function animAnchors() {
  var out = [];
  function add(o) { out.push(o); return o; }
  norenList().forEach(function (n, i) { var W0 = n.W; add({ id: 'n' + i, band: n.band, key: Pa(W0.at((n.s0 + n.s1) / 2, n.top, 0.15)).d, bb: screenBox([W0.at(n.s0 - 0.4, n.top + 0.3, 0.6), W0.at(n.s1 + 0.4, n.top - n.len - 0.3, 0.6), W0.at(n.s0 - 0.4, n.top - n.len - 0.3, -0.2)]) }); });
  noboriList().forEach(function (q, i) { add({ id: 'b' + i, band: q.band, key: P(q.x, 0, q.z).d, bb: screenBox([[q.x - 1.4, 0, q.z - 1.4], [q.x + 1.4, q.h + 0.4, q.z + 1.4]]) }); });
  stringList().forEach(function (q, i) { add({ id: 's' + i, band: q.band, key: Pa(mixc(q.a, q.b, 0.5)).d - 0.3, bb: screenBox([q.a, q.b, add3(q.a, [0, -1.6, 0]), add3(q.b, [0, -1.6, 0])], 4) }); });
  if (F.mill) { var G = millWheelGeom(), c = G.c; add({ id: 'wheel', band: 1, key: P(c[0], 0, c[2]).d, bb: screenBox([[c[0] - 2.8, c[1] - 2.8, c[2] - 2.8], [c[0] + 2.8, c[1] + 2.8, c[2] + 2.8]]) }); }
  if (F.landing) { var bp = boatPath(), pts = bp.p.map(function (q) { return [q[0], 2.6, q[1]]; }).concat(bp.p.map(function (q) { return [q[0], WL, q[1]]; })); add({ id: 'boat', band: 1, key: P(BR.x, 0, BR.z + 0.6).d, bb: screenBox(pts, 6) }); }
  RARE_DEFS.forEach(function (d) { if (F.s < d.minStage || d.id === 'tsubame' || d.id === 'nishikigoi') return; var a = rareAnchor(d); add({ id: 'rare_' + d.id, band: a.band, key: a.key, bb: a.bb }); });
  lifeSites().forEach(function (q, i) { add({ id: 'life' + i, band: P(q.x, 0, q.z).d < P(0, 0, 36).d ? 0 : 2, key: P(q.x, 0, q.z).d - 0.3, bb: screenBox([[q.x - q.r, 0, q.z - q.r], [q.x + q.r, q.h, q.z + q.r]], 4) }); });
  if (F.festival) { var tk = TAIKO(); add({ id: 'taiko', band: 2, key: P(tk.x, 0, tk.z).d - 0.3, bb: screenBox([[tk.x - 1.2, 0, tk.z - 1.2], [tk.x + 2.2, 2.4, tk.z + 1.2]], 4) }); }
  var cs = townCatSpot(); if (cs) add({ id: 'tcat', band: P(cs.x, 0, cs.z).d < P(0, 0, 36).d ? 0 : 2, key: P(cs.x, 0, cs.z).d - 0.2, bb: screenBox([[cs.x - 1.2, 0, cs.z - 1], [cs.x + 2.2, 1.6, cs.z + 1]], 4) });
  if (F.event === 'kodomo') koiPoles().forEach(function (q, i) { add({ id: 'k' + i, band: P(q[0], 0, q[1]).d < P(0, 0, 36).d ? 0 : 2, key: P(q[0], 0, q[1]).d - 0.2, bb: screenBox([[q[0] - 1.5, q[2] + 0.8, q[1] - 1.5], [q[0] + 6.5, q[2] - 6.5, q[1] + 2.5]], 4) }); });
  if (F.event === 'tanabata') tanabataList().forEach(function (q, i) { var tip = add3(q.base, [q.lean[0] * 1.3, q.h, q.lean[2] * 1.3]); add({ id: 't' + i, band: P(q.base[0], 0, q.base[2]).d < P(0, 0, 36).d ? 0 : 2, key: Pa(q.base).d - 0.2, bb: screenBox([q.base, tip, add3(tip, [1.4, -1.8, 1.4]), add3(tip, [-1.4, -1.8, -1.4])], 4) }); });
  walkPaths().forEach(function (q, i) {
    var pts = []; q.pts.forEach(function (p) { var y = bridgeY(p[0], p[1]); pts.push([p[0], y + 2.2, p[1]], [p[0], y - 0.2, p[1]]); });
    var dsum = 0, n = 0; q.pts.forEach(function (p) { dsum += P(p[0], 0, p[1]).d; n++; });
    add({ id: 'w' + i, band: q.band, key: q.band === 2 ? Math.min.apply(null, q.pts.map(function (p) { return P(p[0], 0, p[1]).d; })) - 1.0 : dsum / n, bb: screenBox(pts, 4) });
  });
  return out;
}
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

/* ---------- geometry for one controller (computed under its scene globals) ---------- */
function animGeo(o) {
  var g = { W: W, H: H, KS: KS, cam: CAM, F: F, SEA: SEA, LIT: LIT, season: o.season, light: o.light, stage: o.stage, wx: o.wx || 'clear' };
  var rng = mulberry32(1000 + o.stage * 7), i;
  g.tint = lightTint(1); var tl = (g.tint[0] + g.tint[1] + g.tint[2]) / 3; g.lum = clamp(tl / 1.15, 0.25, 1.1);
  g.anchors = animAnchors();
  g.noren = norenList(); g.nobori = noboriList(); g.strings = stringList();
  g.bandBox = []; for (i = 0; i < NBANDS; i++) g.bandBox.push(null);
  g.anchors.forEach(function (a) { var b = g.bandBox[a.band]; g.bandBox[a.band] = b ? [Math.min(b[0], a.bb[0]), Math.min(b[1], a.bb[1]), Math.max(b[2], a.bb[2]), Math.max(b[3], a.bb[3])] : a.bb.slice(); });
  // river shimmer
  g.glints = [];
  for (i = 0; i < 4000 && g.glints.length < 120; i++) {
    var rp = RIVER_S[(rng() * RIVER_S.length) | 0], x = rp[0] + (rng() - 0.5) * 13, z = rp[1] + (rng() - 0.5) * 13, d = riverD(x, z); if (d > (SEA.snow ? -1.6 : -0.6)) continue;
    var p = P(x, WL, z); if (p.y < 0 || p.y > H || p.x < -5 || p.x > W + 5) continue;
    g.glints.push({ x: p.x, y: p.y, l: (0.25 + rng() * 0.7) * p.k, ph: rng() * TAU, w: 0.6 + rng() * 1.6, a: 0.25 + rng() * 0.5 });
  }
  // walkers
  g.paths = walkPaths();
  var wxK = { clear: 1, cloudy: 0.95, rain: 0.5, storm: 0.3, snow: 0.7, typhoon: 0, blizzard: 0 }[g.wx], nw = Math.round((1 + o.stage * 1.05 + (F.festival ? 8 : 0)) * (wxK === undefined ? 1 : wxK)), tw = 0;
  if (g.wx === 'blizzard') nw = 1; g.paths.forEach(function (q) { tw += q.w; });
  g.walkers = [];
  for (i = 0; i < nw; i++) {
    var r = rng() * tw, pi = 0; for (var k = 0; k < g.paths.length; k++) { r -= g.paths[k].w; if (r <= 0) { pi = k; break; } }
    if (o.stage === 0) pi = 0;
    g.walkers.push(makeWalker(g, pi, rng, i));
  }
  if (g.walkers.length > 1 && !wxWet(g.wx) && g.wx !== 'blizzard') { var pw = g.walkers[1]; pw.load = 'pole'; pw.woman = false; pw.child = false; pw.umb = null; }   // a peddler with his shoulder pole
  // smoke from kitchens and hearths
  g.smoke = smokeSources(o);
  // the boat
  if (F.landing && g.wx !== 'typhoon' && g.wx !== 'blizzard') g.boat = { pa: boatPath(), sp: 0.9, off: rng() * 60 };
  if (F.mill) g.wheel = millWheelGeom();
  // fireflies: summer evenings over the paddies and banks
  if (o.season === 'summer' && (o.light === 'night' || o.light === 'dusk')) {
    g.flies = [];
    for (i = 0; i < 400 && g.flies.length < 26; i++) {
      var fx = -40 + rng() * 80, fz = 8 + rng() * 45, rd = riverD(fx, fz); if (rd > 9 && rng() < 0.6) continue; if (rd < -2) continue;
      g.flies.push({ x: fx, y: 0.3 + rng() * 1.2, z: fz, a1: 0.13 + rng() * 0.2, a2: 0.1 + rng() * 0.2, p1: rng() * TAU, p2: rng() * TAU, w: 0.6 + rng() * 0.9, ph: rng() * TAU });
    }
  }
  // falling things
  g.cherries = [];
  if (F.riverCherry > 0) [[-46, 64.5, 0.9], [-14.5, 40.6, 0.8], [-28, 47.3, 0.85], [19.5, 21.5, 0.95], [31.5, 14.5, 0.9]].forEach(function (a) { g.cherries.push([a[0], a[1], 4.6 * a[2], 3.2]); });
  if (F.temple) g.cherries.push([-6, 94, 4.8, 3]);
  g.fallers = g.wx === 'blizzard' ? null : g.wx === 'typhoon' ? (o.season === 'autumn' || o.season === 'summer' ? 'leaf' : null) : o.season === 'autumn' ? 'leaf' : wxSnowy(g.wx) || (o.season === 'winter' && !wxWet(g.wx)) ? 'snow' : null;
  g.petalSrc = petalSources(g);
  g.srcs = [];
  if (o.season === 'autumn') {
    var t0 = P(TREE0.x, 6, TREE0.z); g.srcs.push({ x: t0.x, y: t0.y, r: 4 * t0.k, kind: 'leaf' });
    g.cherries.forEach(function (c) { var q = P(c[0], c[2], c[1]); g.srcs.push({ x: q.x, y: q.y, r: c[3] * q.k, kind: 'leaf' }); });
  }
  g.nFall = g.fallers === 'snow' ? (g.wx === 'blizzard' ? 280 : g.wx === 'snow' ? 110 : 30) : g.fallers === 'leaf' ? 14 : 0;
  // mist lies along the river
  var m1 = P(-20, 0, 58), m2 = P(20, 0, 26);
  g.mist = { y1: m1.y - 6, y2: m2.y, a: LIT.mist, col: LIT.name === 'night' ? [120, 140, 190] : mixc(LIT.haze, [255, 255, 255], 0.35) };
  g.birds = true;
  g.gustPath = streetPathScreen();
  g.ridgeY = skyBand() + 46;
  g.horizonY = P(0, 0, 92).y;
  g.tsukimi = F.event === 'tsukimi' && (o.light === 'dusk' || o.light === 'night');
  g.moon = (LIT.moon || g.tsukimi) && (g.wx === 'clear' || g.wx === 'cloudy') ? moonGlade() : null;   // no moon on the water under rain, snow or a gale
  g.koi = F.event === 'kodomo' ? koiPoles() : [];
  g.tana = F.event === 'tanabata' ? tanabataList() : [];
  if (F.event === 'obon' && LIT.lit) { g.toro = { pa: boatPath(), n: 16, off: [] }; for (i = 0; i < 16; i++) g.toro.off.push([rng() * 200, (rng() - 0.5) * 7, rng() * TAU]); }
  return g;
}
function moonGlade() { // where the moon's path of light lies on the river (below the moon, on the water)
  var mx = moonPos().x, best = null;
  for (var z = 40; z < 80; z += 0.5) { var gp = groundAt(mx, P(0, 0, z).y); if (!gp) continue; var d = riverD(gp.x, gp.z); if (d < -2.5 && (!best || d < best.d)) best = { x: mx, y: P(gp.x, WL, gp.z).y, d: d, k: P(gp.x, 0, gp.z).k }; }
  return best;
}
function smokeSources(o) {
  var S = [], night = o.light === 'night', amt = o.light === 'dusk' ? 1 : o.light === 'morning' ? 0.85 : night ? 0.3 : 0.45;
  if (o.season === 'winter') amt = Math.min(1, amt * 1.35);
  function add(p3, k) { S.push({ p: p3, a: amt * (k || 1), ph: S.length * 1.7 }); }
  if (F.farm) { var fb = farmFrame(); add(fb.L(-5.75 - 0.3, 0, 2.7 + 0.98 * 4.9 + 0.3), 1.3); }
  if (F.teahouse) { var tb = teaFrame(); add(tb.L(1.2, 0.3, 4.4), 0.8); }
  townPlan(F).forEach(function (b, i) {
    if (b.type === 'kura') return;
    if (b.type === 'nagaya') { var B = BF(b.x, b.z, b.u, 0); for (var u = 0; u < b.units; u += 2) add(B.L(-b.units * 1.375 + (u + 0.5) * 2.75, 0.5, 3.9), 0.55); return; }
    if (i % 2 && b.type === 'machiya') return;
    var B2 = BF(b.x, b.z, b.u, 0); add(B2.L(b.w * 0.2, 0.4, (b.yE || 5.6) + 0.5 * (b.d / 2 + 0.4)), 0.6);
  });
  return S;
}
var WALK_COL = [[46, 58, 96], [92, 70, 52], [70, 70, 74], [120, 52, 40], [64, 84, 70], [150, 130, 100], [36, 40, 52], [170, 150, 120]];
function makeWalker(g, pi, rng, i) {
  var q = g.paths[pi], kind = rng();
  if (q.still) { var sw0 = { pi: pi, s: rng() * q.pa.len, dir: 1, sp: 0, lat: (rng() - 0.5) * q.spread * 2, ph: rng() * TAU, col: [[40, 60, 120], [180, 70, 90], [230, 226, 214], [60, 110, 140], [120, 60, 120]][(rng() * 5) | 0], col2: [[200, 60, 50], [240, 200, 90], [60, 60, 80]][(rng() * 3) | 0], pause: 1e9, still: true }; sw0.woman = rng() < 0.5; sw0.child = rng() < 0.2; return sw0; }
  var w = { pi: pi, s: rng() * q.pa.len, dir: rng() < 0.5 ? 1 : -1, sp: 0.75 + rng() * 0.6, lat: (rng() - 0.5) * q.spread * 2, ph: rng() * TAU, col: WALK_COL[(rng() * WALK_COL.length) | 0], col2: WALK_COL[(rng() * WALK_COL.length) | 0], pause: 0 };
  w.load = kind < 0.2 ? 'pole' : kind < 0.34 ? 'pack' : kind < 0.42 ? 'basket' : null;
  w.hat = pi === 0 || rng() < 0.25 ? 'kasa' : null;
  w.woman = !w.load && rng() < 0.45;
  w.child = !w.load && rng() < 0.12;
  w.parasol = w.woman && g.season === 'summer' && g.light === 'day' && rng() < 0.5;
  w.lantern = (g.light === 'night' || g.light === 'dusk') && rng() < 0.55;
  if (g.SEA.snow) { w.hat = 'kasa'; w.mino = rng() < 0.5; }
  if (wxWet(g.wx)) { w.umb = UMB_COLS[(rng() * UMB_COLS.length) | 0]; w.parasol = false; w.load = rng() < 0.3 ? w.load : null; }
  else if (g.wx === 'snow') { if (rng() < 0.5) w.umb = UMB_COLS[(rng() * UMB_COLS.length) | 0]; else w.mino = true; }
  else if (g.wx === 'blizzard') { w.mino = true; w.hat = 'kasa'; w.umb = null; w.load = null; w.woman = false; w.child = false; w.sp *= 0.45; }
  return w;
}
function stepWalkers(g, dt, rng) {
  for (var i = 0; i < g.walkers.length; i++) {
    var w = g.walkers[i], q = g.paths[w.pi];
    if (w.pause > 0) { w.pause -= dt; continue; }
    w.s += w.dir * w.sp * dt * (w.child ? 0.8 : 1);
    if (w.s > q.pa.len || w.s < 0) { w.dir = -w.dir; w.s = clamp(w.s, 0, q.pa.len); w.pause = 1 + rng() * 4; w.lat = (rng() - 0.5) * q.spread * 2; }
    else if (rng() < dt * 0.02) w.pause = 1.5 + rng() * 3;   // stops to talk or look
  }
}
function walkerPos(g, w) {
  var q = g.paths[w.pi], a = polyAt(q.pa, w.s), x = a.x - a.dz * w.lat, z = a.z + a.dx * w.lat;
  return { x: x, z: z, y: bridgeY(x, z), dx: a.dx * w.dir, dz: a.dz * w.dir };
}
/* a small townsperson: kimono, head, hat, and whatever they carry */
function drawPerson(ctx, g, w, t) {
  var p3 = walkerPos(g, w), feet = P(p3.x, p3.y, p3.z), sc = w.child ? 0.7 : 1, head = P(p3.x, p3.y + 1.58 * sc, p3.z), h = feet.y - head.y;
  if (h < 1.2) return;
  var tint = g.tint, moving = w.pause <= 0, cyc = moving ? t * 6.2 * w.sp + w.ph : 0, sw = Math.sin(cyc), bob = moving ? Math.abs(Math.cos(cyc)) * h * 0.03 : 0;
  var sx = P(p3.x + p3.dx, p3.y, p3.z + p3.dz).x - feet.x, face = sx >= 0 ? 1 : -1, fx = feet.x, fy = feet.y, hy = head.y - bob;
  var c1 = rgb(mulc(w.mino ? [150, 128, 84] : w.col, tint)), c2 = rgb(mulc(scl(w.mino ? [150, 128, 84] : w.col, 0.72), tint)), skin = rgb(mulc([226, 186, 150], tint)), hair = rgb(mulc([30, 26, 26], tint));
  // shadow
  ctx.fillStyle = 'rgba(20,16,24,' + (0.22 * g.lum) + ')'; ctx.beginPath(); ctx.ellipse(fx + h * 0.06, fy, h * 0.16, h * 0.05, 0, 0, TAU); ctx.fill();
  // legs
  ctx.strokeStyle = rgb(mulc([60, 48, 42], tint)); ctx.lineWidth = Math.max(0.35, h * 0.07); ctx.lineCap = 'round';
  var hip = fy - h * 0.42;
  if (!w.woman) { ctx.beginPath(); ctx.moveTo(fx, hip); ctx.lineTo(fx + sw * h * 0.12, fy - 0.2); ctx.moveTo(fx, hip); ctx.lineTo(fx - sw * h * 0.12, fy - 0.2); ctx.stroke(); }
  // body: a kimono widening to the hem (a woman's reaches the feet)
  var sh = hy + h * 0.2, hem = w.woman ? fy - h * 0.03 : fy - h * 0.3, wS = h * 0.15, wH = h * (w.woman ? 0.15 : 0.17);
  ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(fx - wS, sh); ctx.lineTo(fx + wS, sh); ctx.lineTo(fx + wH + sw * h * 0.02, hem); ctx.lineTo(fx - wH + sw * h * 0.02, hem); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(fx - face * wS, sh); ctx.lineTo(fx - face * wS * 0.1, sh); ctx.lineTo(fx - face * wH * 0.1, hem); ctx.lineTo(fx - face * wH, hem); ctx.closePath(); ctx.fill();
  if (!w.mino) { ctx.fillStyle = rgb(mulc(w.col2, tint)); ctx.fillRect(fx - wS * 1.02, sh + h * 0.17, wS * 2.04, h * 0.06); }   // obi
  // head and hair or hat
  var hr = h * 0.085;
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(fx + face * h * 0.015, hy + hr, hr, 0, TAU); ctx.fill();
  if (w.hat === 'kasa') { ctx.fillStyle = rgb(mulc([196, 168, 110], tint)); ctx.beginPath(); ctx.moveTo(fx - h * 0.21, hy + hr * 0.9); ctx.quadraticCurveTo(fx, hy - hr * 1.3, fx + h * 0.21, hy + hr * 0.9); ctx.closePath(); ctx.fill(); if (g.SEA.snow) { ctx.fillStyle = rgb(mulc([246, 248, 252], tint)); ctx.beginPath(); ctx.ellipse(fx, hy - hr * 0.05, h * 0.1, hr * 0.4, 0, 0, TAU); ctx.fill(); } }
  else { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(fx + face * h * 0.005, hy + hr * 0.82, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); if (w.woman) { ctx.beginPath(); ctx.ellipse(fx - face * hr * 0.4, hy - hr * 0.15, hr * 0.75, hr * 0.5, 0, 0, TAU); ctx.fill(); } else { ctx.fillRect(fx - hr * 0.15, hy - hr * 0.35, hr * 0.3, hr * 0.5); } }
  // answering a tap: a bow, or a raised hand
  if (w.react) {
    var ra = clamp((t - w.react.t0) / 2.6), env = Math.sin(ra * Math.PI);
    if (w.react.kind === 'bow') { ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(fx + face * h * (0.015 + 0.12 * env), hy + hr + h * 0.1 * env, hr * 1.02, 0, TAU); ctx.fill(); ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(fx + face * h * (0.02 + 0.12 * env), hy + hr * 0.8 + h * 0.1 * env, hr * 1.04, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
    else { var wv = Math.sin((t - w.react.t0) * 9) * 0.35; ctx.strokeStyle = c1; ctx.lineWidth = Math.max(0.35, h * 0.06); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx + face * wS * 0.8, sh + h * 0.05); ctx.lineTo(fx + face * (wS + h * 0.12), hy - h * 0.12 * env + wv * h * 0.1); ctx.stroke(); ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(fx + face * (wS + h * 0.12), hy - h * 0.14 * env + wv * h * 0.1, h * 0.035, 0, TAU); ctx.fill(); ctx.lineCap = 'butt'; }
  }
  // loads
  var shY = sh + h * 0.02;
  if (w.load === 'pole') {
    var swing = Math.sin(cyc * 0.5) * h * 0.02, L = h * 0.48;
    ctx.strokeStyle = rgb(mulc([150, 120, 80], tint)); ctx.lineWidth = Math.max(0.3, h * 0.035); ctx.beginPath(); ctx.moveTo(fx - L, shY + h * 0.02); ctx.lineTo(fx + L, shY - h * 0.02); ctx.stroke();
    [-1, 1].forEach(function (sd) { var bx = fx + sd * L * 0.92, by = shY + h * 0.3 + (sd > 0 ? swing : -swing); ctx.strokeStyle = rgb(mulc([110, 90, 60], tint)); ctx.lineWidth = Math.max(0.25, h * 0.015); ctx.beginPath(); ctx.moveTo(bx, shY); ctx.lineTo(bx, by - h * 0.06); ctx.stroke(); ctx.fillStyle = rgb(mulc([170, 140, 90], tint)); ctx.beginPath(); ctx.moveTo(bx - h * 0.09, by - h * 0.07); ctx.lineTo(bx + h * 0.09, by - h * 0.07); ctx.lineTo(bx + h * 0.06, by + h * 0.06); ctx.lineTo(bx - h * 0.06, by + h * 0.06); ctx.closePath(); ctx.fill(); });
  } else if (w.load === 'pack') {
    ctx.fillStyle = rgb(mulc([200, 186, 150], tint)); ctx.beginPath(); ctx.ellipse(fx - face * h * 0.15, shY + h * 0.1, h * 0.13, h * 0.15, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(mulc([120, 100, 70], tint)); ctx.lineWidth = Math.max(0.2, h * 0.015); ctx.beginPath(); ctx.moveTo(fx - face * h * 0.27, shY + h * 0.05); ctx.lineTo(fx - face * h * 0.03, shY + h * 0.15); ctx.stroke();
  } else if (w.load === 'basket') {
    ctx.fillStyle = rgb(mulc([176, 150, 96], tint)); ctx.beginPath(); ctx.moveTo(fx - h * 0.12, hy - h * 0.02); ctx.lineTo(fx + h * 0.12, hy - h * 0.02); ctx.lineTo(fx + h * 0.08, hy + h * 0.06); ctx.lineTo(fx - h * 0.08, hy + h * 0.06); ctx.closePath(); ctx.fill();
  }
  if (w.umb) drawUmbrella(ctx, fx + face * h * 0.05, hy, h, w.umb, tint, (gWind(g).h * 0.25) + Math.sin(cyc * 0.5) * 0.04);
  if (w.parasol) { ctx.strokeStyle = rgb(mulc([90, 70, 50], tint)); ctx.lineWidth = Math.max(0.2, h * 0.015); ctx.beginPath(); ctx.moveTo(fx + face * h * 0.1, shY + h * 0.12); ctx.lineTo(fx + face * h * 0.05, hy - h * 0.18); ctx.stroke(); ctx.fillStyle = rgb(mulc([214, 120, 96], tint), 0.95); ctx.beginPath(); ctx.ellipse(fx + face * h * 0.05, hy - h * 0.18, h * 0.3, h * 0.1, 0, Math.PI, TAU); ctx.fill(); }
  if (w.lantern) {
    var lx = fx + face * h * 0.22, ly = fy - h * 0.45 + Math.sin(cyc) * h * 0.02;
    ctx.strokeStyle = rgb(mulc([80, 60, 40], tint)); ctx.lineWidth = Math.max(0.2, h * 0.012); ctx.beginPath(); ctx.moveTo(fx + face * h * 0.1, sh + h * 0.25); ctx.lineTo(lx, ly - h * 0.08); ctx.stroke();
    ctx.fillStyle = 'rgb(255,214,150)'; ctx.beginPath(); ctx.ellipse(lx, ly, h * 0.055, h * 0.075, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; stamp(ctx, sprite('warm'), lx, ly, h * 0.55, h * 0.55, 0.55); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.lineCap = 'butt';
}

/* ---------- swaying cloth ---------- */
function drawNoren(ctx, g, n, t) {
  if (g.wx === 'typhoon' || g.wx === 'blizzard') return;
  if (wxWet(g.wx)) { n = { W: n.W, s0: n.s0, s1: n.s1, top: n.top, len: n.len * 0.32, col: n.col, n: n.n, ph: n.ph, crest: false, band: n.band }; }
  var W0 = n.W, k = Pa(W0.c).k, panels = n.n, gap = 0.03, pw = (n.s1 - n.s0) / panels, tint = g.tint;
  var Wd = gWind(g), ws = Pa(W0.at(n.s1, n.top, 0.2)).x >= Pa(W0.at(n.s0, n.top, 0.2)).x ? 1 : -1, amp = (0.4 + Wd.s * 0.9) * (n.boost && t - n.boost < 2.5 ? 1 + 3.5 * (1 - (t - n.boost) / 2.5) : 1);
  var col = rgb(mulc(n.col, tint)), col2 = rgb(mulc(scl(n.col, 0.75), tint)), wind = (Math.sin(t * 0.9 + n.ph) * 0.6 + Math.sin(t * 2.3 + n.ph * 2) * 0.4) * amp * 0.6 + Wd.h * ws * 0.9;
  // the rod
  var r0 = Pa(W0.at(n.s0 - 0.1, n.top + 0.04, 0.2)), r1 = Pa(W0.at(n.s1 + 0.1, n.top + 0.04, 0.2));
  ctx.strokeStyle = rgb(mulc([70, 54, 40], tint)); ctx.lineWidth = Math.max(0.4, 0.05 * k); ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.stroke();
  for (var i = 0; i < panels; i++) {
    var a0 = n.s0 + i * pw + gap, a1 = n.s0 + (i + 1) * pw - gap, ph = i * 0.7, sway = (wind * 0.09 + Math.sin(t * 1.7 + n.ph + ph) * 0.03);
    var t0 = Pa(W0.at(a0, n.top, 0.2)), t1 = Pa(W0.at(a1, n.top, 0.2)), b0 = Pa(W0.at(a0 + sway, n.top - n.len, 0.2 + Math.abs(sway) * 1.5)), b1 = Pa(W0.at(a1 + sway, n.top - n.len, 0.2 + Math.abs(sway) * 1.5));
    ctx.fillStyle = i % 2 ? col2 : col; ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.quadraticCurveTo((t1.x + b1.x) / 2 + (b1.x - t1.x) * 0.3, (t1.y + b1.y) / 2, b1.x, b1.y); ctx.lineTo(b0.x, b0.y); ctx.quadraticCurveTo((t0.x + b0.x) / 2 + (b0.x - t0.x) * 0.3, (t0.y + b0.y) / 2, t0.x, t0.y); ctx.fill();
  }
  if (n.crest) { // a white crest across the middle panels
    var cc = Pa(W0.at((n.s0 + n.s1) / 2 + wind * 0.04, n.top - n.len * 0.45, 0.22)); ctx.strokeStyle = rgb(mulc([240, 236, 226], tint)); ctx.lineWidth = Math.max(0.35, 0.05 * k); ctx.beginPath(); ctx.arc(cc.x, cc.y, 0.17 * k, 0, TAU); ctx.stroke();
  }
}
function drawNobori(ctx, g, q, t) {
  var Wd = gWind(g), tint = g.tint, base = P(q.x, 0, q.z), top = P(q.x, q.h, q.z), k = base.k, side = q.side;
  if ((P(q.x + side[0], q.h, q.z + side[1]).x - top.x) * Wd.sign < 0) side = [-side[0], -side[1]];   // the cloth streams downwind
  ctx.strokeStyle = rgb(mulc([90, 72, 56], tint)); ctx.lineWidth = Math.max(0.4, 0.07 * k); ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
  var wd = 0.62, N = 8, front = [], back = [];
  for (var i = 0; i <= N; i++) {
    var f = i / N, y = q.h - 0.15 - f * 2.6, wave = (Math.sin(t * 2.4 * (0.7 + Wd.s * 0.5) + q.ph - f * 3) * 0.12 * f + Math.sin(t * 1.1 + q.ph) * 0.05) * (0.5 + Wd.s);
    front.push(P(q.x, y, q.z)); back.push(P(q.x + side[0] * (wd + wave), y - wave * 0.4, q.z + side[1] * (wd + wave)));
  }
  ctx.fillStyle = rgb(mulc(q.col, tint)); ctx.beginPath(); front.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); for (i = N; i >= 0; i--) ctx.lineTo(back[i].x, back[i].y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgb(mulc(q.edge, tint)); ctx.lineWidth = Math.max(0.3, 0.06 * k); ctx.beginPath(); back.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(front[0].x, front[0].y); ctx.lineTo(back[0].x, back[0].y); ctx.stroke();
  if (q.mark) { // brush strokes of a few large characters
    ctx.strokeStyle = rgb(mulc(q.edge[0] > 200 && q.col[0] > 200 ? [40, 34, 32] : q.edge, tint)); ctx.lineWidth = Math.max(0.3, 0.07 * k); ctx.beginPath();
    for (var c = 0; c < 3; c++) { var a = front[1 + c * 2], b = back[1 + c * 2], a2 = front[2 + c * 2], b2 = back[2 + c * 2]; ctx.moveTo(lerp(a.x, b.x, 0.3), lerp(a.y, b.y, 0.3)); ctx.lineTo(lerp(a.x, b.x, 0.7), lerp(a.y, b.y, 0.7)); ctx.moveTo(lerp(a.x, b.x, 0.5), lerp(a.y, b.y, 0.5)); ctx.lineTo(lerp(a2.x, b2.x, 0.45), lerp(a2.y, b2.y, 0.45)); }
    ctx.stroke();
  }
}
function drawString(ctx, g, q, t) {
  var tint = g.tint, lit = g.LIT.lit, N = 12, pts = [], i, Wd = gWind(g), sway = Math.sin(t * 0.8 + q.ph) * 0.06 * (0.5 + Wd.s) + Wd.h * 0.1;
  for (i = 0; i <= N; i++) { var f = i / N, p = mixc(q.a, q.b, f); p[1] -= q.sag * 4 * f * (1 - f); pts.push(P(p[0], p[1], p[2])); }
  ctx.strokeStyle = rgb(mulc([60, 50, 44], tint), 0.85); ctx.lineWidth = 0.35; ctx.beginPath(); pts.forEach(function (p, i2) { if (i2) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
  var spr = sprite('warm');
  for (i = 0; i < q.n; i++) {
    var f2 = (i + 0.5) / q.n, c = mixc(q.a, q.b, f2); c[1] -= q.sag * 4 * f2 * (1 - f2);
    var sw = Math.sin(t * 1.6 + q.ph + i * 0.9) * 0.06 + sway, lp = P(c[0] + sw, c[1] - 0.42, c[2]), top = P(c[0], c[1], c[2]), k = lp.k;
    ctx.strokeStyle = 'rgba(40,30,26,0.7)'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(lp.x, lp.y - 0.2 * k); ctx.stroke();
    var red = i % 2 === 0, body = lit ? (red ? [255, 150, 90] : [255, 220, 160]) : mulc(red ? [204, 52, 40] : [240, 232, 214], tint);
    ctx.fillStyle = rgb(body); ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 0.17 * k, 0.23 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(mulc([40, 32, 30], lit ? [1, 1, 1] : tint)); ctx.fillRect(lp.x - 0.1 * k, lp.y - 0.27 * k, 0.2 * k, 0.06 * k); ctx.fillRect(lp.x - 0.1 * k, lp.y + 0.21 * k, 0.2 * k, 0.06 * k);
    if (lit) { var fl = 0.75 + 0.25 * NZ.n2(t * 3 + i * 7.1, q.ph); ctx.globalCompositeOperation = 'lighter'; stamp(ctx, spr, lp.x, lp.y, 1.4 * k, 1.4 * k, 0.5 * fl * (g.LIT.name === 'night' ? 1 : 0.7)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
}
/* the mill wheel, turning; water spills from its paddles */
function drawWheel(ctx, g, t, still) {
  var G = g.wheel, B = G.B, c = G.c, r = G.r, tint = g.tint, ang = still ? (g.wheelAng || 0) : g.wheelAng !== undefined ? g.wheelAng : t * 0.55 * (g.SEA.snow ? 0.4 : 1), N = 12;
  function pt(rr, a, side) { return P(c[0] + B.u[0] * Math.cos(a) * rr + B.v[0] * side, c[1] + Math.sin(a) * rr, c[2] + B.u[1] * Math.cos(a) * rr + B.v[1] * side); }
  var wood = mulc([92, 70, 50], tint), woodD = mulc([60, 46, 36], tint), woodL = mulc([132, 104, 76], tint), i, k = Pa(c).k;
  // far rim, paddles, near rim, spokes, hub
  [[G.w / 2, woodD], [-G.w / 2, wood]].forEach(function (rim, ri) {
    ctx.strokeStyle = rgb(rim[1]); ctx.lineWidth = Math.max(0.6, 0.16 * k); ctx.beginPath();
    for (var j = 0; j <= 36; j++) { var p = pt(r, j / 36 * TAU, rim[0]); if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } ctx.stroke();
    if (ri === 0) for (i = 0; i < N; i++) { var a = ang + i / N * TAU, p0 = pt(r * 1.08, a, G.w / 2), p1 = pt(r * 1.08, a, -G.w / 2), p2 = pt(r * 0.78, a, -G.w / 2), p3 = pt(r * 0.78, a, G.w / 2); ctx.fillStyle = rgb(i % 2 ? wood : woodL); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath(); ctx.fill(); }
  });
  ctx.strokeStyle = rgb(wood); ctx.lineWidth = Math.max(0.4, 0.09 * k); ctx.beginPath();
  for (i = 0; i < N / 2; i++) { var a2 = ang + i / (N / 2) * TAU, q0 = pt(r * 0.98, a2, -G.w / 2), q1 = pt(r * 0.98, a2 + Math.PI, -G.w / 2); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); } ctx.stroke();
  var hub = pt(0, 0, -G.w / 2 - 0.1); ctx.fillStyle = rgb(woodD); ctx.beginPath(); ctx.arc(hub.x, hub.y, 0.28 * k, 0, TAU); ctx.fill();
  if (still || g.SEA.snow) return;
  // water: a sheet off the flume onto the top paddles, drips falling from the rising side, foam where it meets the river
  var top = pt(r * 1.02, Math.PI * 0.55, 0), fl = P(c[0] - B.u[0] * 1.2, c[1] + r + 0.15, c[2] - B.u[1] * 1.2);
  ctx.strokeStyle = 'rgba(226,240,246,0.55)'; ctx.lineWidth = Math.max(0.5, 0.25 * k); ctx.beginPath(); ctx.moveTo(fl.x, fl.y); ctx.quadraticCurveTo((fl.x + top.x) / 2, fl.y, top.x, top.y + 0.5); ctx.stroke();
  ctx.fillStyle = 'rgba(232,244,250,0.75)';
  for (i = 0; i < 14; i++) { var u = ((t * 0.9 + i / 14) % 1), a3 = -0.2 + i * 0.13, sp = pt(r * 1.05, a3 + ang * 0.0, (i % 3 - 1) * 0.25); ctx.beginPath(); ctx.arc(sp.x + u * 0.6 * k * 0.2, sp.y + u * u * 1.6 * k, Math.max(0.3, 0.06 * k), 0, TAU); ctx.fill(); }
  var bot = pt(r * 0.95, -Math.PI / 2, 0), foam = sprite('soft');
  for (i = 0; i < 4; i++) stamp(ctx, foam, bot.x + (i - 1.5) * 0.4 * k, bot.y + 0.1 * k, 0.5 * k * (0.8 + 0.3 * Math.sin(t * 3 + i)), 0.18 * k, 0.4);
  ctx.globalAlpha = 1;
}
function boatState(g, t) { var b = g.boat, L = b.pa.len, s = ((t * b.sp + b.off) % (L + 30)) - 15; if (s < 0 || s > L) return null; var a = polyAt(b.pa, s); return { x: a.x, z: a.z, dx: a.dx, dz: a.dz, s: s, L: L }; }
function drawBoatAnim(ctx, g, t) {
  var st = boatState(g, t); if (!st) return;
  st.x += gWind(g).h * 0.5;
  var bob = Math.sin(t * 1.3) * 0.04, fade = clamp(Math.min(st.s, st.L - st.s) / 6);
  ctx.globalAlpha = fade;
  var mode = MODE; drawBoat(ctx, [st.x, 0, st.z], [st.dx, st.dz], bob, true);
  // the boatman at the stern poling, and a passenger under a hat
  var B = BF(st.x, st.z, [st.dx, st.dz], 0), stern = B.L(-1.6, 0, WL + 0.4 + bob), head = B.L(-1.6, 0, WL + 2.0 + bob), k = P(st.x, 0, st.z).k, tint = g.tint;
  var sp = Pa(stern), hp = Pa(head), push = Math.sin(t * 0.7) * 0.4;
  ctx.fillStyle = rgb(mulc([50, 62, 96], tint)); ctx.beginPath(); ctx.moveTo(sp.x - 0.2 * k, sp.y); ctx.lineTo(sp.x + 0.2 * k, sp.y); ctx.lineTo(hp.x + 0.16 * k, hp.y + 0.3 * k); ctx.lineTo(hp.x - 0.16 * k, hp.y + 0.3 * k); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(mulc([196, 168, 110], tint)); ctx.beginPath(); ctx.moveTo(hp.x - 0.38 * k, hp.y + 0.12 * k); ctx.quadraticCurveTo(hp.x, hp.y - 0.35 * k, hp.x + 0.38 * k, hp.y + 0.12 * k); ctx.closePath(); ctx.fill();
  var pt0 = Pa(B.L(-1.6 + 0.3, 0, WL + 1.7 + bob)), pt1 = Pa(B.L(-1.6 - 1.2 - push, 0.3, WL - 0.6));
  ctx.strokeStyle = rgb(mulc([150, 130, 90], tint)); ctx.lineWidth = Math.max(0.3, 0.05 * k); ctx.beginPath(); ctx.moveTo(pt0.x, pt0.y - 0.6 * k); ctx.lineTo(pt1.x, pt1.y); ctx.stroke();
  var pa = Pa(B.L(0.6, 0, WL + 0.5 + bob)); ctx.fillStyle = rgb(mulc([120, 60, 44], tint)); ctx.beginPath(); ctx.ellipse(pa.x, pa.y - 0.3 * k, 0.2 * k, 0.3 * k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc([200, 176, 120], tint)); ctx.beginPath(); ctx.ellipse(pa.x, pa.y - 0.62 * k, 0.32 * k, 0.1 * k, 0, 0, TAU); ctx.fill();
  if (g.LIT.lit) { var lp = Pa(B.L(1.7, 0, WL + 1.1 + bob)); ctx.fillStyle = 'rgb(255,206,140)'; ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 0.13 * k, 0.17 * k, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; stamp(ctx, sprite('warm'), lp.x, lp.y, 1.8 * k, 1.8 * k, 0.6 * fade); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
}
/* ---------- the water: shimmer, the boat's reflection and wake, the moon's path ---------- */
function drawWaterLayer(ctx, g, t) {
  var night = g.LIT.name === 'night', dusk = g.LIT.name === 'dusk', gc = night ? [200, 214, 255] : dusk ? [255, 214, 170] : [255, 250, 236], i;
  ctx.strokeStyle = rgb(gc); ctx.lineCap = 'round';
  for (i = 0; i < g.glints.length; i++) {
    var q = g.glints[i], s = Math.sin(t * q.w + q.ph), a = s > 0 ? Math.pow(s, 3) * q.a : 0; if (a < 0.02) continue;
    var dx = Math.sin(t * 0.7 + q.ph) * q.l * 0.4;
    ctx.globalAlpha = a * (night ? 0.6 : 0.85); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(q.x - q.l + dx, q.y); ctx.lineTo(q.x + q.l + dx, q.y); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  if (g.moon) { // a broken column of moonlight on the water
    var m = g.moon, spr = tintedSprite([210, 220, 255]);
    for (i = 0; i < 12; i++) { var yy = m.y - 12 + i * 2.2, w0 = (1.4 + Math.sin(t * 1.3 + i * 1.9) * 0.7) * (1 + i * 0.1) * 2.6; ctx.globalAlpha = 0.75 * (0.6 + 0.4 * Math.sin(t * 2 + i)); ctx.fillStyle = 'rgb(232,236,255)'; ctx.fillRect(m.x - w0 + Math.sin(t * 0.9 + i) * 1.4, yy, w0 * 2, 0.7); }
    stamp(ctx, spr, m.x, m.y - 2, 12, 14, 0.35); ctx.globalAlpha = 1;
  }
  if (g.toro) { // floating lanterns drifting down the river
    var spr = sprite('warm'), pa = g.toro.pa;
    for (i = 0; i < g.toro.n; i++) {
      var o2 = g.toro.off[i], sA = ((t * 0.32 + o2[0]) % (pa.len + 10)) - 5; if (sA < 0 || sA > pa.len) continue;
      var a2 = polyAt(pa, sA), lx = a2.x - a2.dz * o2[1] * 0.5, lz = a2.z + a2.dx * o2[1] * 0.5 - 1.6, c2 = P(lx, WL + 0.15, lz), kk = c2.k, bob2 = Math.sin(t * 1.5 + o2[2]) * 0.03 * kk;
      ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgb(255,190,110)'; ctx.fillRect(c2.x - 0.12 * kk, c2.y + 0.2 * kk, 0.24 * kk, 0.9 * kk); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgb(255,226,170)'; ctx.fillRect(c2.x - 0.2 * kk, c2.y - 0.3 * kk + bob2, 0.4 * kk, 0.32 * kk); ctx.fillStyle = 'rgb(120,70,40)'; ctx.fillRect(c2.x - 0.24 * kk, c2.y + bob2, 0.48 * kk, 0.07 * kk);
      ctx.globalCompositeOperation = 'lighter'; stamp(ctx, spr, c2.x, c2.y - 0.1 * kk, 1.6 * kk, 1.3 * kk, 0.55 * (0.8 + 0.2 * Math.sin(t * 3 + o2[2]))); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  if (g.boat) {
    var st = boatState(g, t);
    if (st) { // reflection and wake
      var B = BF(st.x, st.z, [st.dx, st.dz], 0), c = P(st.x, WL, st.z), k = c.k;
      ctx.fillStyle = rgb(mulc([40, 32, 26], g.tint), 0.35); ctx.beginPath(); ctx.ellipse(c.x, c.y + 0.6 * k, 2.0 * k, 0.4 * k, Math.atan2(Pa(B.L(1, 0, WL)).y - c.y, Pa(B.L(1, 0, WL)).x - c.x), 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(gc, 0.35); ctx.lineWidth = 0.5;
      for (i = 1; i < 4; i++) { var a0 = Pa(B.L(-2.2 - i * 1.4, -0.9 - i * 0.5, WL)), a1 = Pa(B.L(-2.2 - i * 1.4, 0.9 + i * 0.5, WL)), m0 = Pa(B.L(-2.4 - i * 1.4, 0, WL)); ctx.globalAlpha = 0.5 / i; ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.quadraticCurveTo(m0.x, m0.y, a1.x, a1.y); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
}
function drawSmoke(ctx, g, t) {
  if (!g.smoke || !g.smoke.length) return;
  var Wd = gWind(g), night = g.LIT.name === 'night', dusk = g.LIT.name === 'dusk', col = night ? [120, 130, 160] : dusk ? [214, 190, 186] : [236, 236, 232], spr = tintedSprite(col), T = 7, N = 7;
  for (var i = 0; i < g.smoke.length; i++) {
    var s = g.smoke[i], p = Pa(s.p), k = p.k;
    for (var j = 0; j < N; j++) {
      var age = (t + s.ph + j * T / N) % T, f = age / T, rise = age * 0.55 * k * (1.15 - Math.min(0.6, Math.abs(Wd.h) * 0.5)), drift = age * age * 0.11 * k * Wd.h + Math.sin(age * 0.9 + s.ph + j) * 0.25 * k;
      var r = (0.35 + f * 1.6) * k, a = s.a * 0.32 * Math.sin(Math.PI * Math.min(1, f * 1.15)) * (1 - f * 0.4);
      stamp(ctx, spr, p.x + drift, p.y - rise, r, r * 0.8, a);
    }
  }
  ctx.globalAlpha = 1;
}
/* depth-sorted things in one band */
function bandItems(g, band) {
  var it = [], i;
  for (i = 0; i < g.noren.length; i++) if (g.noren[i].band === band) it.push({ d: Pa(g.noren[i].W.c).d, k: 'n', o: g.noren[i] });
  for (i = 0; i < g.nobori.length; i++) if (g.nobori[i].band === band && g.wx !== 'typhoon') it.push({ d: P(g.nobori[i].x, 0, g.nobori[i].z).d, k: 'b', o: g.nobori[i] });
  for (i = 0; i < g.strings.length; i++) if (g.strings[i].band === band) it.push({ d: Pa(mixc(g.strings[i].a, g.strings[i].b, 0.5)).d - 0.5, k: 's', o: g.strings[i] });
  for (i = 0; i < g.walkers.length; i++) { var w = g.walkers[i]; if (g.paths[w.pi].band !== band) continue; var wp = walkerPos(g, w); it.push({ d: P(wp.x, 0, wp.z).d, k: 'w', o: w }); }
  if (band === 1 && g.wheel) it.push({ d: Pa(g.wheel.c).d, k: 'wheel' });
  for (i = 0; i < g.koi.length && g.wx !== 'typhoon'; i++) { var kb = P(g.koi[i][0], 0, g.koi[i][1]).d < P(0, 0, 36).d ? 0 : 2; if (kb === band) it.push({ d: P(g.koi[i][0], 0, g.koi[i][1]).d, k: 'koi', o: g.koi[i], i: i }); }
  for (i = 0; i < g.tana.length; i++) { var tb = Pa(g.tana[i].base).d < P(0, 0, 36).d ? 0 : 2; if (tb === band) it.push({ d: Pa(g.tana[i].base).d - 0.1, k: 'tana', o: g.tana[i] }); }
  if (band === 1 && g.boat) it.push({ d: 1e5, k: 'boat' });
  if (band === 1 && g.fwOn) it.push({ d: 1e5 - 1, k: 'yakata' });
  if (g.rareNow && g.rareNow.band === band) it.push({ d: g.rareNow.key, k: 'rare' });
  if (g.life) for (i = 0; i < g.life.length; i++) if (g.life[i].band === band) it.push({ d: g.life[i].d, k: 'life', o: g.life[i] });
  if (g.I && g.I.taikoP && band === 2) it.push({ d: P(g.I.taikoW.x, 0, g.I.taikoW.z).d, k: 'taiko' });
  if (g.I && g.I.catP && band === (P(g.I.catW.x, 0, g.I.catW.z).d < P(0, 0, 36).d ? 0 : 2)) it.push({ d: P(g.I.catW.x, 0, g.I.catW.z).d, k: 'tcat' });
  it.sort(function (a, b) { return b.d - a.d; });
  return it;
}
function drawBand(ctx, g, band, t, still) {
  var it = bandItems(g, band);
  for (var i = 0; i < it.length; i++) {
    var q = it[i];
    if (q.k === 'n') drawNoren(ctx, g, q.o, still ? 0 : t);
    else if (q.k === 'b') drawNobori(ctx, g, q.o, still ? 0 : t);
    else if (q.k === 's') drawString(ctx, g, q.o, still ? 0 : t);
    else if (q.k === 'w') drawPerson(ctx, g, q.o, still ? 0 : t);
    else if (q.k === 'wheel') drawWheel(ctx, g, t, still);
    else if (q.k === 'boat' && !still) drawBoatAnim(ctx, g, t);
    else if (q.k === 'yakata' && g.FW) drawYakatabune(ctx, g, g.FW, t);
    else if (q.k === 'taiko') drawTaiko(ctx, g, g.I, t);
    else if (q.k === 'life') drawLife(ctx, g, q.o, still ? 0 : t);
    else if (q.k === 'rare' && !still) { var R = g.rareNow; R.def.draw(ctx, g, R.st, clamp((t - R.t0) / R.def.dur), t); }
    else if (q.k === 'tcat') { if (!(wxWet(g.wx) || wxSnowy(g.wx)) && g.light !== 'night') drawTownCat(ctx, g, g.I, t); }
    else if (q.k === 'koi') drawKoinobori(ctx, g, q.o, still ? 0 : t, q.i);
    else if (q.k === 'tana') drawTanabata(ctx, g, q.o, still ? 0 : t);
  }
  return it.length;
}

/* koinobori: a streamer and three carp on the wind */
function drawKoinobori(ctx, g, q, t, idx) {
  var Wd = gWind(g), sg = Wd.sign, tint = g.tint, top = q[2], wind = clamp(0.45 + Wd.s * 0.55 + 0.18 * Math.sin(t * 0.5 + idx), 0.35, 1.08), x0 = q[0], z0 = q[1];
  var carps = [{ y: top - 0.9, L: 3.4, c: [40, 44, 56], b: [230, 190, 80] }, { y: top - 2.5, L: 2.8, c: [206, 54, 44], b: [250, 236, 220] }, { y: top - 3.9, L: 2.2, c: [60, 100, 170], b: [240, 240, 236] }];
  var streamer = [[46, 90, 170], [236, 236, 230], [206, 54, 44], [240, 200, 70], [60, 130, 80]];
  // fukinagashi: five coloured ribbons
  for (var s = 0; s < 5; s++) { var pts = []; for (var i = 0; i <= 8; i++) { var f = i / 8, x = x0 + sg * (0.1 + f * 3.2 * wind), y = top - 0.15 - s * 0.06 - f * (1.2 - wind) * 1.2 + Math.sin(t * 3 + f * 5 + s) * 0.08 * f; pts.push(P(x, y, z0 + f * 0.5)); } ctx.strokeStyle = rgb(mulc(streamer[s], tint)); ctx.lineWidth = Math.max(0.4, 0.07 * pts[0].k); ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); }
  carps.forEach(function (cp, ci) {
    var N = 10, up = [], dn = [];
    for (var i = 0; i <= N; i++) {
      var f = i / N, x = x0 + sg * (0.12 + f * cp.L * wind), sag = f * f * (1.15 - wind) * 1.6, wav = Math.sin(t * 2.6 + f * 4.5 + ci) * 0.13 * f, y = cp.y - sag + wav, r = cp.L * 0.17 * (1 - 0.65 * f) * (0.7 + 0.3 * wind);
      up.push(P(x, y + r, z0 + f * 0.4)); dn.push(P(x, y - r, z0 + f * 0.4));
    }
    ctx.fillStyle = rgb(mulc(cp.c, tint)); ctx.beginPath(); up.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    var tl = up[N], tb = dn[N]; ctx.lineTo(tl.x + sg * (tl.y - tb.y) * 0.4, tl.y - 1); ctx.lineTo(tl.x - sg * 0.5, (tl.y + tb.y) / 2); ctx.lineTo(tb.x + sg * (tl.y - tb.y) * 0.4, tb.y + 1);
    for (i = N; i >= 0; i--) ctx.lineTo(dn[i].x, dn[i].y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(mulc(cp.b, tint)); ctx.beginPath(); for (i = 0; i <= N; i++) { var m = { x: (up[i].x * 0.35 + dn[i].x * 0.65), y: (up[i].y * 0.35 + dn[i].y * 0.65) }; if (i) ctx.lineTo(m.x, m.y); else ctx.moveTo(m.x, m.y); } for (i = N; i >= 0; i--) ctx.lineTo(dn[i].x, dn[i].y); ctx.closePath(); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    var e = { x: lerp(up[1].x, dn[1].x, 0.4), y: lerp(up[1].y, dn[1].y, 0.4) }, er = Math.max(0.4, Math.abs(up[1].y - dn[1].y) * 0.22); ctx.fillStyle = 'rgb(250,250,246)'; ctx.beginPath(); ctx.arc(e.x, e.y, er, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgb(20,20,24)'; ctx.beginPath(); ctx.arc(e.x, e.y, er * 0.5, 0, TAU); ctx.fill();
  });
}
/* tanabata: a cut bamboo with paper wishes, swaying */
function drawTanabata(ctx, g, q, t) {
  var Wd = gWind(g), tint = g.tint, sw = (Math.sin(t * 0.9 + q.ph) * 0.25 + Math.sin(t * 2.1 + q.ph) * 0.08) * (0.5 + Wd.s) + Wd.h * 0.35, N = 8, pts = [];
  for (var i = 0; i <= N; i++) { var f = i / N, bend = f * f; pts.push([q.base[0] + q.lean[0] * 1.3 * bend + sw * bend, q.base[1] + q.h * f, q.base[2] + q.lean[2] * 1.3 * bend]); }
  var pp = pts.map(Pa), k = pp[0].k;
  ctx.strokeStyle = rgb(mulc([110, 140, 70], tint)); ctx.lineWidth = Math.max(0.4, 0.06 * k); ctx.lineCap = 'round'; ctx.beginPath(); pp.forEach(function (p, j) { if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.lineCap = 'butt';
  var r = mulberry32((q.ph * 100) | 0), cols = [[220, 60, 60], [240, 200, 60], [70, 110, 200], [90, 160, 90], [240, 240, 236], [170, 90, 170]];
  for (i = 0; i < 26; i++) { var j = 3 + (r() * 5.99) | 0, p = pp[Math.min(N, j)], a = r() * TAU, d = r() * 0.6 * k; ctx.fillStyle = rgb(mulc(r() < 0.5 ? [60, 110, 50] : [90, 140, 60], tint)); ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6, 0.18 * k, 0.05 * k, a, 0, TAU); ctx.fill(); }
  for (i = 0; i < 16; i++) { var j2 = 3 + (r() * 5.99) | 0, p2 = pp[Math.min(N, j2)], ox = (r() - 0.5) * 1.0 * k, sway = (Math.sin(t * 2.4 + i + q.ph) * 0.05 * (0.5 + Wd.s) + Wd.h * 0.06) * k; ctx.save(); ctx.translate(p2.x + ox, p2.y + (r() * 0.3) * k); ctx.rotate(sway / k * 3); ctx.fillStyle = rgb(mulc(cols[i % cols.length], tint)); ctx.fillRect(-0.08 * k, 0, 0.16 * k, 0.48 * k); ctx.restore(); }
}

/* ---------- dragonflies: shiokara-tombo over water in summer, red aka-tombo drifting in autumn ---------- */
function perchPoints() {
  var pts = [];
  if (F.sign) pts.push([SIGN.x, 1.62, SIGN.z]);
  if (F.well) pts.push([WELL.x - 0.85, 2.25, WELL.z]);
  if (F.shrine) { var tb = toriiFrame(); pts.push(tb.L(-2.4, -0.1, 3.85)); }
  if (F.market) pts.push([MARKET.x - 4.5 + 1.1, 2.15, MARKET.z - 1.9]);
  if (F.paddy && SEA.name === 'autumn' && F.farm) for (var i = 0; i < 4; i++) pts.push([HAZA[0][0] - 4 + i * 2.7, 2.25, HAZA[0][1]]);
  if (F.landing) { var lb = landingGeom().B; pts.push(lb.L(-2.8, -1.8, 1.15)); }
  return pts;
}
function initDragonflies(g, rng) {
  var d = g.date || new Date(), m = d.getMonth(), late = (m === 7 && d.getDate() >= 20) || m === 8 || m === 9;   // aka-tombo: late August to October
  var red = late && (g.season === 'autumn' || g.season === 'summer'), ok = (g.season === 'summer' || (g.season === 'autumn' && red)) && g.light !== 'night' && (g.wx === 'clear' || g.wx === 'cloudy' || !g.wx);
  if (!ok) return null;
  var homes = [], i;
  for (i = 0; i < 60; i++) { var rp = RIVER_S[(rng() * RIVER_S.length) | 0], x = rp[0] + (rng() - 0.5) * 10, z = rp[1] + (rng() - 0.5) * 10; if (Math.abs(x) < 42 && riverD(x, z) < 2) homes.push([x, z]); }
  if (g.F.paddy) for (i = 0; i < 30; i++) { var L0 = rng() < 0.5 ? PADDY_L : PADDY_R; homes.push([lerp(Math.max(L0.x0, -40), Math.min(L0.x1, 40), rng()), lerp(Math.max(L0.z0, 8), L0.z1, rng())]); }
  if (red && g.F.street) for (i = 0; i < 20; i++) { var sp = stPt(rng() * 34, (rng() - 0.5) * 6); homes.push(sp); }
  if (!homes.length) return null;
  var n = red ? 9 : 5, D = { red: red, flies: [], perch: perchPoints() };
  for (i = 0; i < n; i++) {
    var h = homes[(red ? ((i / 3) | 0) * 7 : i * 5) % homes.length];   // the red ones keep together in loose threes
    D.flies.push({ hx: h[0], hz: h[1], x: h[0], y: 0.8 + rng(), z: h[1], tx: h[0], ty: 1, tz: h[1], mode: 'hover', timer: rng() * 2, ph: rng() * TAU, homes: homes });
  }
  return D;
}
function stepDragonflies(D, dt, rng) {
  for (var i = 0; i < D.flies.length; i++) {
    var f = D.flies[i]; f.timer -= dt;
    if (f.mode === 'dart' || f.mode === 'toPerch') {
      var k = Math.min(1, dt * (f.mode === 'dart' ? 7 : 4)); f.x += (f.tx - f.x) * k; f.y += (f.ty - f.y) * k; f.z += (f.tz - f.z) * k;
      if (Math.abs(f.tx - f.x) + Math.abs(f.tz - f.z) + Math.abs(f.ty - f.y) < 0.05) { f.mode = f.mode === 'toPerch' ? 'perch' : 'hover'; f.timer = f.mode === 'perch' ? 3 + rng() * 6 : 0.4 + rng() * 1.6; }
    } else if (f.timer <= 0) {
      if (f.mode !== 'perch' && D.perch.length && rng() < (D.red ? 0.18 : 0.06)) { var p = D.perch[(rng() * D.perch.length) | 0]; f.tx = p[0]; f.ty = p[1] + 0.05; f.tz = p[2]; f.mode = 'toPerch'; continue; }
      if (rng() < 0.08) { var h = f.homes[(rng() * f.homes.length) | 0]; f.hx = h[0]; f.hz = h[1]; }
      var a = rng() * TAU, r = 0.6 + rng() * 2.4;
      f.tx = f.hx + Math.cos(a) * r; f.tz = f.hz + Math.sin(a) * r; f.ty = 0.5 + rng() * (D.red ? 2.2 : 1.1); f.mode = 'dart';
    }
  }
}
function drawDragonflies(ctx, g, D, t) {
  var body = rgb(mulc(D.red ? [196, 50, 30] : [96, 118, 150], g.tint)), wing = D.red ? 'rgba(255,236,220,' : 'rgba(230,240,255,';
  for (var i = 0; i < D.flies.length; i++) {
    var f = D.flies[i], hov = f.mode === 'hover' ? 0.04 * Math.sin(t * 9 + f.ph) : 0, p = P(f.x, f.y + hov, f.z), k = p.k, L = 0.62 * k, dir = Math.atan2(f.tz - f.z, f.tx - f.x) || f.ph;
    var c = Math.cos(dir), s = Math.sin(dir) * 0.45, perched = f.mode === 'perch';
    if (perched) { c = 0.95; s = 0.1; }
    ctx.strokeStyle = body; ctx.lineWidth = Math.max(0.45, 0.07 * k); ctx.beginPath(); ctx.moveTo(p.x - c * L * 0.55, p.y - s * L * 0.55); ctx.lineTo(p.x + c * L * 0.45, p.y + s * L * 0.45); ctx.stroke();
    var sh = perched ? 0.35 : 0.25 + 0.35 * Math.abs(Math.sin(t * 38 + f.ph)), ww = L * 0.42;
    ctx.fillStyle = wing + sh + ')';
    [-1, 1].forEach(function (sd) { [0.12, -0.05].forEach(function (o) { ctx.beginPath(); ctx.ellipse(p.x + c * L * o - s * 0, p.y + s * L * o + sd * ww * 0.5 * (perched ? 0.6 : 1), ww * 0.55, ww * 0.16, sd * (perched ? 1.2 : 1.45), 0, TAU); ctx.fill(); }); });
  }
}

/* ---------- butterflies: cabbage whites in spring, a swallowtail in summer, a few in early autumn ---------- */
function initButterflies(g, rng) {
  if (g.light === 'night' || g.light === 'dusk' || g.season === 'winter') return null;
  if (g.season === 'autumn' && seasonProgress(g.date || new Date(), 'autumn') > 0.35) return null;   // only a few, early in autumn
  var homes = [], i, kind = g.season === 'spring' ? 'white' : g.season === 'summer' ? 'swallow' : 'yellow';
  function add(x, z) { homes.push([x, z]); }
  if (g.season === 'spring') { for (i = 0; i < 10; i++) add(lerp(FIELD.x0, FIELD.x1, (i % 5) / 4), lerp(FIELD.z0, FIELD.z1, i < 5 ? 0.3 : 0.75)); if (F.paddy) for (i = 0; i < 6; i++) add(-30 + i * 3, 21); (g.cherries || []).forEach(function (c) { add(c[0] + 2, c[1] - 2); }); }
  else if (g.season === 'summer') { if (F.farm) add(KAKI.x, KAKI.z - 3); if (F.teahouse) add(TEA.x + 2, TEA.z - 4); if (F.nagaya) { var n = rvPt(22, 11); add(n[0], n[1]); } if (F.machiya) { var m = rvPt(30, 2.5); add(m[0], m[1]); } add(TREE0.x + 4, TREE0.z + 2); }
  else { if (F.paddy) add(-34, 22); add(TREE0.x + 3, TREE0.z + 3); }
  var n0 = kind === 'white' ? 6 : kind === 'swallow' ? 2 : 2, B = { kind: kind, flies: [] };
  for (i = 0; i < n0; i++) { var h = homes[(i * 3) % homes.length]; B.flies.push({ x: h[0], y: 1, z: h[1], vx: 0, vz: 0, tx: h[0], tz: h[1], mode: 'fly', timer: rng() * 3, ph: rng() * TAU, homes: homes }); }
  return B;
}
function stepButterflies(B, dt, rng) {
  var glide = B.kind === 'swallow';
  for (var i = 0; i < B.flies.length; i++) {
    var f = B.flies[i]; f.timer -= dt;
    if (f.mode === 'rest') { if (f.timer <= 0) { f.mode = 'fly'; f.timer = 2 + rng() * 4; } continue; }
    if (f.timer <= 0) {
      if (rng() < 0.3 && !glide) { f.mode = 'land'; var h = f.homes[(rng() * f.homes.length) | 0]; f.tx = h[0] + (rng() - 0.5) * 2; f.tz = h[1] + (rng() - 0.5) * 2; f.timer = 6; }
      else { var h2 = f.homes[(rng() * f.homes.length) | 0]; f.tx = h2[0] + (rng() - 0.5) * 4; f.tz = h2[1] + (rng() - 0.5) * 4; f.timer = 2 + rng() * 4; }
    }
    var dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz) || 1, sp = glide ? 1.6 : 0.9;
    f.vx += (dx / d * sp - f.vx) * dt * 1.5 + (rng() - 0.5) * dt * 3; f.vz += (dz / d * sp - f.vz) * dt * 1.5 + (rng() - 0.5) * dt * 3;
    f.x += f.vx * dt; f.z += f.vz * dt;
    var ty = f.mode === 'land' ? 0.25 + clamp(d / 2) * 0.8 : 1.0 + 0.4 * Math.sin(f.ph + f.x);
    f.y += (ty - f.y) * dt * 2;
    if (f.mode === 'land' && d < 0.15) { f.mode = 'rest'; f.y = 0.25; f.timer = 2 + rng() * 4; f.vx = f.vz = 0; }
  }
}
function drawButterflies(ctx, g, B, t) {
  var col = B.kind === 'white' ? [250, 250, 244] : B.kind === 'swallow' ? [30, 30, 36] : [246, 220, 110], c = rgb(mulc(col, g.tint.map(function (v) { return Math.max(0.8, v); })));
  for (var i = 0; i < B.flies.length; i++) {
    var f = B.flies[i], rest = f.mode === 'rest', bob = rest ? 0 : Math.abs(Math.sin(t * 7 + f.ph)) * 0.12, p = P(f.x, f.y + bob, f.z), k = p.k;
    var span = (B.kind === 'swallow' ? 0.8 : 0.52) * k, open = rest ? 0.5 + 0.5 * Math.sin(t * 1.3 + f.ph) : B.kind === 'swallow' ? 0.55 + 0.45 * Math.sin(t * 6 + f.ph) : Math.abs(Math.sin(t * 16 + f.ph));
    ctx.fillStyle = c;
    [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(p.x + sd * span * 0.3 * open, p.y - span * 0.1, span * 0.32 * Math.max(0.15, open), span * 0.24, sd * 0.4, 0, TAU); ctx.fill(); if (B.kind === 'swallow') { ctx.beginPath(); ctx.ellipse(p.x + sd * span * 0.2 * open, p.y + span * 0.12, span * 0.18 * Math.max(0.15, open), span * 0.18, sd * 0.8, 0, TAU); ctx.fill(); } });
    if (B.kind === 'swallow') { ctx.fillStyle = 'rgba(200,60,60,0.8)'; ctx.fillRect(p.x - span * 0.3 * open, p.y + span * 0.2, Math.max(0.3, span * 0.06), Math.max(0.3, span * 0.06)); }
  }
}

/* ---- 08b_fx.js ---- */
/* ================= particles, mist, flicker, birds (from the garden) ================= */
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



function drawMist(ctx, g, t) {
  if (!g.mist.a) return;
  var spr = tintedSprite(g.mist.col.map(function (v) { return Math.round(v); })), m = g.mist;
  for (var i = 0; i < 5; i++) {
    var Wd = gWind(g), sp = (2.2 + i * 0.9) * (0.4 + Math.abs(Wd.h) * 1.2) * Wd.sign, w = 150 + i * 30, span = g.W + w * 2, x = (((t * sp + i * 137) % span) + span) % span - w, y = lerp(m.y1, m.y2, i / 4) + Math.sin(t * 0.13 + i) * 3;
    stamp(ctx, spr, x, y, w, 7 + i * 1.5, m.a * (0.28 + 0.06 * Math.sin(t * 0.2 + i * 2)));
  }
  ctx.globalAlpha = 1;
}
function drawFlicker(ctx, g, t) {
  if (!g.LIT.lit || !g.glows.length) return;
  var spr = sprite('warm'); ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < g.glows.length; i++) {
    var q = g.glows[i], n = NZ.n2(t * 2.6 + i * 13.7, i * 3.1) * 0.7 + NZ.n2(t * 9 + i * 5, 7.7) * 0.3, a = clamp((n - 0.36) * 1.4) * q.a * (g.LIT.name === 'night' ? 0.55 : 0.4);
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
  else { p.x = rng() * (g.W + 60) - 30; p.y = -10 - rng() * 30; if (rng() < 0.3) { p.x = gWind(g).sign > 0 ? -20 : g.W + 20; p.y = rng() * g.H * 0.6; } }
  if (anywhere) p.y = rng() * g.H * 0.9;
  if (kind === 'leaf') { var L = newLeaf(rng, p.x, p.y); L.kind = 'leaf'; L.floor = g.H * (0.62 + rng() * 0.36); return L; }
  if (kind === 'snow') { p.sz = 0.35 + rng() * rng() * 1.3; p.vy = 6 + p.sz * 9; p.vx = 2 + rng() * 3; }
  else if (kind === 'leaf') { p.sz = 1.5 + rng() * 1.2; p.vy = 9 + rng() * 6; p.vx = 4 + rng() * 5; p.col = ramp([[150, 30, 20], [206, 62, 30], [232, 120, 44], [226, 170, 60]], rng()); }
  else { p.sz = 0.9 + rng() * 0.6; p.vy = 7 + rng() * 5; p.vx = 5 + rng() * 5; p.col = mixc([246, 196, 212], [255, 240, 244], rng()); }
  p.floor = g.H * (0.62 + rng() * 0.36);
  return p;
}
function stepFallers(arr, g, dt, rng) {
  for (var i = 0; i < arr.length; i++) {
    var p = arr[i];
    if (p.kind === 'leaf') { stepLeaf(p, dt, gWind(g).h * 11, rng); if (p.y > p.floor || p.x > g.W + 30 || p.x < -30) arr[i] = spawnFaller(g, rng, false); continue; }
    p.life += dt;
    var sway = Math.sin(p.life * (p.kind === 'snow' ? 0.9 : 1.7) + p.ph);
    p.x += (p.vx * 1.4 * gWind(g).h + sway * (p.kind === 'snow' ? 3 : 9)) * dt; p.y += p.vy * dt * (p.kind === 'snow' ? 1 : (0.75 + 0.25 * Math.abs(sway))); p.rot += p.spin * dt;
    if (p.y > p.floor || p.x > g.W + 30 || p.x < -30) arr[i] = spawnFaller(g, rng, false);
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
  if (arr[0].kind === 'leaf') { for (i = 0; i < arr.length; i++) { var L = arr[i]; drawLeaf(ctx, L, tint, 0.95 * clamp((L.floor - L.y) / 10) * clamp(L.life * 2)); } ctx.globalAlpha = 1; return; }
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
/* a bird or a small flock (crows at dusk) crossing the sky */
function drawFlock(ctx, g, b, t) {
  for (var i = 0; i < b.flock.length; i++) { var f = b.flock[i]; drawBird(ctx, g, { t0: b.t0, dur: b.dur, x0: b.x0 + f.dx, x1: b.x1 + f.dx, y: b.y + f.dy, rise: b.rise, flap: b.flap * (0.9 + 0.2 * Math.sin(f.ph)), s: f.s, crow: b.crow }, t + f.ph * 0.1); }
}
/* an occasional bird crossing the sky */
function drawBird(ctx, g, b, t) {
  var u = (t - b.t0) / b.dur; if (u < 0 || u > 1) return;
  var x = lerp(b.x0, b.x1, u), y = b.y + Math.sin(u * TAU * 1.5) * 2.5 - u * b.rise, fl = Math.sin(t * b.flap), s = b.s;
  var night = g.LIT.name === 'night', col = b.crow ? 'rgba(22,16,20,0.85)' : g.LIT.name === 'dusk' ? 'rgba(40,24,30,0.8)' : night ? 'rgba(10,14,30,0.8)' : 'rgba(46,44,48,0.72)';
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
  (g.cherries || []).forEach(function (c) { add(c[0], c[2], c[1], c[3], 1); });
  var tot = 0; src.forEach(function (s) { tot += s.w; s.cw = tot; }); src.tot = tot;
  return src;
}
/* how many petals are in the air: a few in early March, more and more toward the end of May */
function petalCount(g, amt) { return Math.round(lerp(8, 96, Math.pow(clamp(amt), 1.15)) * (0.8 + 0.2 * Math.min(1, g.petalSrc.length / 5))); }
function setPetalAmount(S, amt) { S.amt = clamp(amt); S.base = Math.min(S.pool.length - 50, petalCount(S.g, S.amt)); }
function makePetals(g, rng, amt, t0, bloom) {
  amt = amt === undefined ? 0.5 : clamp(amt);
  var N = petalCount(g, amt), pool = [];
  for (var i = 0; i < 96 + 50; i++) pool.push({ on: false });
  var S = { pool: pool, base: N, amt: amt, bloom: bloom === undefined ? 1 : bloom, g: g, floats: [], gust: null, nextGust: (t0 || 0) + 35 + rng() * 35, t: 0 };
  for (i = 0; i < N; i++) spawnPetal(S, pool[i], g, rng, true);
  for (i = 0; i < 400 && S.floats.length < Math.round(2 + 9 * amt) && g.water; i++) { var fx = rng() * g.W, fy = g.horizonY + rng() * (g.H - g.horizonY); if (waterAt(g, fx, fy)) S.floats.push({ x: fx, y: fy, rot: rng() * TAU, vx: (rng() - 0.3) * 0.8, ph: rng() * TAU, life: rng() * 8, L: 18 + rng() * 14, sz: 1 + rng() * 0.5, tone: rng() }); }
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
  var W0 = g.wind0 || CALM, wind = W0.h * 12 * (0.85 + 0.15 * Math.sin(t * 0.53 + 1)), G = S.gust, gs = 0;
  if (!G && t > S.nextGust && S.bloom < 0.12) S.nextGust = t + 35 + rng() * 35;   // no blossom left: no gusts
  else if (!G && t > S.nextGust) {
    var dir = W0.sign;
    G = S.gust = { t0: t, dur: 4.2 + rng() * 1.5, dir: dir, K: 2 + rng(), y0: g.H * (0.3 + rng() * 0.4), cx0: dir > 0 ? -30 : g.W + 30 };
    var n = 0;
    var nG = Math.round(lerp(10, 44, S.amt));
    for (var i = 0; i < S.pool.length && n < nG; i++) {
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
    if (u >= 1) { S.gust = null; S.nextGust = t + 35 + rng() * 35; }   // gusts are rare: every 35-70 s
    else gs = Math.pow(Math.sin(Math.PI * u), 2) * W0.s * 12 * (G.K - 1) * 1.6 * G.dir;
  }
  wind += gs; S.wind = wind;
  for (i = 0; i < S.pool.length; i++) {
    var p = S.pool[i]; if (!p.on) { if (i < S.base && rng() < dt * 0.4) spawnPetal(S, p, g, rng, false); continue; }
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
      if (S.floats.length < Math.round(4 + 14 * S.amt) && waterAt(g, p.x, p.y) && p.d < 0.7) S.floats.push({ x: p.x, y: p.y, rot: p.rot, vx: (rng() - 0.3) * 0.8, ph: rng() * TAU, life: 0, L: 16 + rng() * 14, sz: Math.min(p.sz, 1.6), tone: p.tone });
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

/* ---- 08c_rare.js ---- */
/* ================= rare animals: seen only by the lucky ================= */
var ALL_S = ['spring', 'summer', 'autumn', 'winter'];
/* a four-legged animal seen side-on: body, head, ears, legs in gait, tail */
function beast(ctx, x, y, k, o, t) {
  var L = o.len * k, Hh = o.h * k, f = o.face, tint = o.tint, col = rgb(mulc(o.col, tint)), dark = rgb(mulc(scl(o.col, 0.62), tint)), light = rgb(mulc(o.col2 || mixc(o.col, [255, 255, 255], 0.4), tint));
  var gait = o.moving ? t * (o.gaitHz || 7) : 0, by = y - Hh * 0.62 - (o.moving ? Math.abs(Math.sin(gait)) * Hh * 0.05 : 0), sit = o.sit;
  // shadow
  ctx.fillStyle = 'rgba(20,16,24,' + (0.2 * (o.lum || 1)) + ')'; ctx.beginPath(); ctx.ellipse(x, y, L * 0.55, L * 0.1, 0, 0, TAU); ctx.fill();
  // legs
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(0.35, L * (o.legW || 0.07)); ctx.lineCap = 'round';
  if (!o.lie) [[-0.32, 0], [0.3, Math.PI], [-0.22, Math.PI], [0.36, 0]].forEach(function (q, i) {
    var lx = x + f * q[0] * L, sw = o.moving ? Math.sin(gait + q[1]) * L * 0.12 : 0, ly0 = by + Hh * 0.15;
    if (sit && q[0] < 0) { ctx.beginPath(); ctx.moveTo(lx, ly0); ctx.lineTo(lx + f * L * 0.1, y); ctx.stroke(); return; }
    ctx.strokeStyle = i < 2 ? dark : col; ctx.beginPath(); ctx.moveTo(lx, ly0); ctx.lineTo(lx + sw, y); ctx.stroke();
  });
  // tail
  ctx.strokeStyle = o.tailCol ? rgb(mulc(o.tailCol, tint)) : col; ctx.lineWidth = Math.max(0.4, L * (o.tailW || 0.06));
  var tx = x - f * L * 0.5, ty = by - Hh * 0.05, wag = Math.sin(t * (o.wag || 2)) * L * 0.1;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - f * L * 0.25, ty - Hh * (o.tailUp || 0.2) + wag, tx - f * L * (o.tailLen || 0.4), ty - Hh * (o.tailUp || 0.2) * 1.6 + wag); ctx.stroke();
  // body
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, by + (o.lie ? Hh * 0.35 : 0), L * 0.5, Hh * (o.lie ? 0.3 : 0.32), sit ? -f * 0.35 : 0, 0, TAU); ctx.fill();
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(x + f * L * 0.08, by + Hh * (o.lie ? 0.45 : 0.14), L * 0.32, Hh * 0.13, 0, 0, TAU); ctx.fill();
  if (o.patch) { ctx.fillStyle = rgb(mulc(o.patch, tint)); ctx.beginPath(); ctx.ellipse(x - f * L * 0.15, by - Hh * 0.12 + (o.lie ? Hh * 0.35 : 0), L * 0.18, Hh * 0.16, 0.3, 0, TAU); ctx.fill(); }
  if (o.patch2) { ctx.fillStyle = rgb(mulc(o.patch2, tint)); ctx.beginPath(); ctx.ellipse(x + f * L * 0.2, by - Hh * 0.08 + (o.lie ? Hh * 0.35 : 0), L * 0.12, Hh * 0.12, 0, 0, TAU); ctx.fill(); }
  // neck and head
  var hx = x + f * L * (o.lie ? 0.42 : 0.5), hy = by - Hh * (o.neck || 0.35) + (o.lie ? Hh * 0.3 : 0) + (o.graze ? Hh * 0.75 : 0), hr = Hh * (o.head || 0.26);
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.5, hr * 1.1); ctx.beginPath(); ctx.moveTo(x + f * L * 0.32, by - Hh * 0.05 + (o.lie ? Hh * 0.35 : 0)); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(hx, hy, hr * 1.05, hr * 0.9, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + f * hr * (o.snout || 0.9), hy + hr * 0.25, hr * (o.snout ? 0.55 : 0.45), hr * 0.38, 0, 0, TAU); ctx.fill();
  if (o.mask) { ctx.fillStyle = rgb(mulc(o.mask, tint)); ctx.beginPath(); ctx.ellipse(hx + f * hr * 0.25, hy + hr * 0.1, hr * 0.55, hr * 0.32, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = dark; var ear = o.ear || 0.7;
  [[-0.35, 0], [0.25, 0.15]].forEach(function (e) { var ex = hx + f * hr * e[0], ey = hy - hr * 0.6; ctx.beginPath(); ctx.moveTo(ex - hr * 0.3, ey + hr * 0.2); ctx.lineTo(ex + f * hr * e[1], ey - hr * ear); ctx.lineTo(ex + hr * 0.3, ey + hr * 0.2); ctx.closePath(); ctx.fill(); });
  if (o.antler) { ctx.strokeStyle = rgb(mulc([200, 180, 140], tint)); ctx.lineWidth = Math.max(0.3, hr * 0.18); ctx.beginPath(); ctx.moveTo(hx - f * hr * 0.1, hy - hr * 0.6); ctx.lineTo(hx - f * hr * 0.5, hy - hr * 2.0); ctx.moveTo(hx - f * hr * 0.35, hy - hr * 1.4); ctx.lineTo(hx + f * hr * 0.3, hy - hr * 1.8); ctx.stroke(); }
  ctx.fillStyle = 'rgb(20,18,18)'; ctx.beginPath(); ctx.arc(hx + f * hr * 0.4, hy - hr * 0.1, Math.max(0.2, hr * 0.13), 0, TAU); ctx.fill();
  if (o.spots) { ctx.fillStyle = rgb(mulc([240, 232, 214], tint)); for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + f * L * (-0.3 + i * 0.1), by - Hh * (0.12 + (i % 2) * 0.1), Math.max(0.2, L * 0.025), 0, TAU); ctx.fill(); } }
  ctx.lineCap = 'butt';
}
/* a long-legged white bird, standing or flying */
function wader(ctx, x, y, k, o, t) {
  var s = o.size * k, f = o.face, tint = o.tint, white = rgb(mulc([248, 248, 244], tint)), dark = rgb(mulc([40, 38, 40], tint));
  if (o.fly) {
    var flap = Math.sin(t * (o.flapHz || 4)), bx = x, by = y;
    ctx.fillStyle = white; ctx.beginPath(); ctx.ellipse(bx, by, s * 0.5, s * 0.14, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx - s * 0.15, by); ctx.quadraticCurveTo(bx, by - s * 0.9 * flap, bx + s * 0.25, by - s * 1.1 * flap); ctx.lineTo(bx + s * 0.18, by); ctx.closePath(); ctx.fill();
    if (o.crane) { ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(bx + s * 0.05, by - s * 0.8 * flap); ctx.lineTo(bx + s * 0.25, by - s * 1.1 * flap); ctx.lineTo(bx + s * 0.22, by - s * 0.75 * flap); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = white; ctx.lineWidth = Math.max(0.4, s * 0.07); ctx.beginPath(); ctx.moveTo(bx + f * s * 0.45, by); ctx.lineTo(bx + f * s * 0.85, by - s * 0.05); ctx.stroke();
    ctx.strokeStyle = o.crane ? dark : 'rgb(40,36,30)'; ctx.lineWidth = Math.max(0.3, s * 0.03); ctx.beginPath(); ctx.moveTo(bx - f * s * 0.45, by); ctx.lineTo(bx - f * s * 1.0, by + s * 0.05); ctx.stroke();
    ctx.fillStyle = 'rgb(220,170,60)'; ctx.beginPath(); ctx.moveTo(bx + f * s * 0.85, by - s * 0.07); ctx.lineTo(bx + f * s * 1.05, by - s * 0.04); ctx.lineTo(bx + f * s * 0.85, by - s * 0.01); ctx.fill();
    return;
  }
  var legH = s * 0.7, by2 = y - legH, step = o.walk ? Math.sin(t * 2.2) * s * 0.12 : 0;
  ctx.fillStyle = 'rgba(20,16,24,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.35, s * 0.07, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = o.crane ? dark : 'rgb(50,46,40)'; ctx.lineWidth = Math.max(0.3, s * 0.035); ctx.beginPath(); ctx.moveTo(x - s * 0.05, by2); ctx.lineTo(x - s * 0.05 + step, y); ctx.moveTo(x + s * 0.05, by2); ctx.lineTo(x + s * 0.05 - step, y); ctx.stroke();
  ctx.fillStyle = white; ctx.beginPath(); ctx.ellipse(x, by2 - s * 0.12, s * 0.38, s * 0.18, -f * 0.25, 0, TAU); ctx.fill();
  if (o.crane) { ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x - f * s * 0.3, by2 - s * 0.06, s * 0.18, s * 0.1, -f * 0.3, 0, TAU); ctx.fill(); }
  var peck = o.peck ? Math.max(0, Math.sin(t * 1.3)) : 0, nx = x + f * s * (0.3 + peck * 0.25), ny = by2 - s * (0.75 - peck * 0.6);
  ctx.strokeStyle = o.crane ? dark : white; ctx.lineWidth = Math.max(0.4, s * 0.07); ctx.beginPath(); ctx.moveTo(x + f * s * 0.25, by2 - s * 0.2); ctx.quadraticCurveTo(x + f * s * 0.1, by2 - s * 0.5, nx, ny); ctx.stroke();
  ctx.fillStyle = white; ctx.beginPath(); ctx.arc(nx, ny, s * 0.07, 0, TAU); ctx.fill();
  if (o.crane) { ctx.fillStyle = 'rgb(210,40,40)'; ctx.beginPath(); ctx.arc(nx, ny - s * 0.04, s * 0.04, 0, TAU); ctx.fill(); }
  ctx.fillStyle = o.crane ? 'rgb(150,140,110)' : 'rgb(220,170,60)'; ctx.beginPath(); ctx.moveTo(nx + f * s * 0.04, ny - s * 0.03); ctx.lineTo(nx + f * s * 0.26, ny + s * 0.02 + peck * s * 0.1); ctx.lineTo(nx + f * s * 0.04, ny + s * 0.03); ctx.closePath(); ctx.fill();
  if (o.dance) { var wo = Math.max(0, Math.sin(t * 2.5)); ctx.fillStyle = white; [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.moveTo(x, by2 - s * 0.2); ctx.quadraticCurveTo(x + sd * s * 0.4, by2 - s * (0.3 + wo * 0.6), x + sd * s * 0.75, by2 - s * (0.1 + wo * 0.4)); ctx.lineTo(x + sd * s * 0.2, by2 - s * 0.05); ctx.closePath(); ctx.fill(); }); }
}
/* a small fast bird: swallow or kingfisher */
function smallBird(ctx, x, y, k, o, t) {
  var s = o.size * k, f = o.face, tint = o.tint, flap = o.perch ? 0 : Math.sin(t * 22), back = rgb(mulc(o.col, tint)), belly = rgb(mulc(o.belly, tint));
  ctx.fillStyle = back; ctx.beginPath(); ctx.ellipse(x, y, s * 0.45, s * 0.16, o.tilt || 0, 0, TAU); ctx.fill();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(x + f * s * 0.05, y + s * 0.07, s * 0.28, s * 0.08, o.tilt || 0, 0, TAU); ctx.fill();
  ctx.fillStyle = back; ctx.beginPath(); ctx.arc(x + f * s * 0.42, y - s * 0.05, s * 0.14, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgb(30,26,24)'; ctx.beginPath(); ctx.moveTo(x + f * s * 0.52, y - s * 0.07); ctx.lineTo(x + f * s * (o.longBill ? 0.9 : 0.66), y - s * 0.03); ctx.lineTo(x + f * s * 0.52, y); ctx.fill();
  if (!o.perch) { ctx.fillStyle = back; ctx.beginPath(); ctx.moveTo(x - f * s * 0.1, y - s * 0.05); ctx.quadraticCurveTo(x + f * s * 0.05, y - s * 0.7 * flap, x - f * s * 0.35, y - s * 0.75 * flap); ctx.lineTo(x - f * s * 0.2, y); ctx.closePath(); ctx.fill(); }
  if (o.fork) { ctx.strokeStyle = back; ctx.lineWidth = Math.max(0.25, s * 0.05); ctx.beginPath(); ctx.moveTo(x - f * s * 0.4, y); ctx.lineTo(x - f * s * 0.85, y - s * 0.12); ctx.moveTo(x - f * s * 0.4, y); ctx.lineTo(x - f * s * 0.85, y + s * 0.1); ctx.stroke(); }
}
function lerpPath(pts, u) { // piecewise linear through [x,y,z] points by fraction
  var n = pts.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i; return mixc(pts[i], pts[i + 1], r);
}
function faceOf(a, b) { return P(b[0], b[1], b[2]).x >= P(a[0], a[1], a[2]).x ? 1 : -1; }
/* phases helper: walk in (0..a), stay (a..b), walk out (b..1) */
function phase3(u, a, b) { return u < a ? { m: 'in', f: u / a } : u < b ? { m: 'stay', f: (u - a) / (b - a) } : { m: 'out', f: (u - b) / (1 - b) }; }
function fadeIO(u) { return clamp(Math.min(u, 1 - u) * 12); }
var RARE_DEFS = [
  { id: 'shironeko', name: '白い猫', season: ALL_S, light: ['morning', 'day', 'dusk'], minStage: 9, w: 1, dur: 16, desc: '商家の屋根の上を、白い猫がゆっくり歩いていきます',
    setup: function () { var b = null; townPlan(F).forEach(function (q) { if (q.type === 'shoka') b = q; }); var B = BF(b.x, b.z, b.u, 0), yR = 5.15 + 0.5 * (b.d / 2 + 0.85) + 0.32; return { a: B.L(-b.w / 2 + 0.2, 0, yR), b: B.L(b.w / 2 - 0.2, 0, yR), down: B.L(b.w / 2 + 1.5, -1, 3.0) }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.45, 0.6), p = ph.m === 'in' ? mixc(st.a, st.b, ph.f * 0.6) : ph.m === 'stay' ? mixc(st.a, st.b, 0.6) : u < 0.92 ? mixc(st.a, st.b, 0.6 + (u - 0.6) / 0.32 * 0.4) : mixc(st.b, st.down, (u - 0.92) / 0.08); var q = Pa(p); ctx.globalAlpha = fadeIO(u); beast(ctx, q.x, q.y, q.k, { len: 1.35, h: 0.8, face: faceOf(st.a, st.b), col: [246, 244, 236], col2: [255, 255, 250], tint: g.tint, moving: ph.m !== 'stay', sit: ph.m === 'stay', gaitHz: 5, tailUp: 0.5, tailLen: 0.5, ear: 0.9, lum: g.lum }, t); ctx.globalAlpha = 1; } },
  { id: 'mikeneko', name: '三毛猫', season: ALL_S, light: ['morning', 'day'], minStage: 2, w: 1, dur: 20, desc: '縁台で三毛猫が気持ちよさそうに昼寝をしています',
    setup: function () { var tb = teaFrame(), bb = tb.L(0.2, -2.1 - 2.0, 0.55); return { from: tb.L(-4.5, -4.6, 0), up: tb.L(-0.6, -4.1, 0), bench: bb }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.15, 0.85), p = ph.m === 'in' ? mixc(st.from, st.up, ph.f) : ph.m === 'stay' ? st.bench : mixc(st.up, st.from, ph.f), q = Pa(p), breath = ph.m === 'stay' ? 1 + Math.sin(t * 1.6) * 0.03 : 1; ctx.globalAlpha = fadeIO(u); beast(ctx, q.x, q.y, q.k * breath, { len: 1.3, h: 0.75, face: ph.m === 'out' ? -1 : 1, col: [240, 234, 222], patch: [210, 120, 50], patch2: [40, 34, 32], tint: g.tint, moving: ph.m !== 'stay', lie: ph.m === 'stay', gaitHz: 5, tailUp: 0.4, ear: 0.9, wag: ph.m === 'stay' ? 0.7 : 2, lum: g.lum }, t); ctx.globalAlpha = 1; } },
  { id: 'kitsune', name: 'キツネ', season: ALL_S, light: ['dusk', 'night'], minStage: 7, w: 0.8, dur: 18, desc: '祠のそばに、キツネがそっと姿を見せました',
    setup: function () { return { from: [SHRINE.x + 9, 0, SHRINE.z - 1.5], to: [SHRINE.x + 2.4, 0, SHRINE.z - 3.4] }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.3, 0.75), p = ph.m === 'in' ? mixc(st.from, st.to, ph.f) : ph.m === 'stay' ? st.to : mixc(st.to, st.from, ph.f), q = Pa(p); ctx.globalAlpha = fadeIO(u); beast(ctx, q.x, q.y, q.k, { len: 1.65, h: 1.05, face: ph.m === 'out' ? faceOf(st.to, st.from) : faceOf(st.from, st.to), col: [206, 120, 56], col2: [244, 232, 214], tailCol: [210, 130, 70], tint: g.tint.map(function (v) { return Math.max(0.55, v); }), moving: ph.m !== 'stay', sit: ph.m === 'stay', gaitHz: 6, tailUp: 0.1, tailLen: 0.55, tailW: 0.14, snout: 1.1, ear: 1.0, lum: g.lum }, t); ctx.globalAlpha = 1; } },
  { id: 'shirasagi', name: '白鷺', season: ['summer'], light: ['morning', 'day', 'dusk'], minStage: 5, w: 1, dur: 22, desc: '青田に白鷺が舞い降りました',
    setup: function () { return { sky: [60, 18, 2], land: [22.5, 0, 15.8], walk: [25.5, 0, 15.2], away: [5, 20, -6] }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.2, 0.82), p, fly = ph.m !== 'stay', o = { size: 1.7, tint: g.tint, crane: false }; if (ph.m === 'in') { p = mixc(st.sky, st.land, Math.sin(ph.f * Math.PI / 2)); o.face = 1; } else if (ph.m === 'stay') { p = mixc(st.land, st.walk, ph.f); o.walk = true; o.peck = true; o.face = 1; } else { p = mixc(st.walk, st.away, ph.f * ph.f); o.face = 1; } o.fly = fly; var q = Pa(p); ctx.globalAlpha = fadeIO(u); wader(ctx, q.x, q.y, q.k, o, t); ctx.globalAlpha = 1; } },
  { id: 'tancho', name: '丹頂鶴', season: ['winter'], light: ['morning', 'day'], minStage: 5, w: 0.2, dur: 24, desc: '雪の田んぼに丹頂鶴が舞い降りました。めったに見られません',
    setup: function () { return { sky: [62, 22, 30], land: [24, 0, 15.2], away: [70, 26, 40] }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.22, 0.82), p, o = { size: 1.8, tint: g.tint, crane: true, face: ph.m === 'out' ? -1 : 1 }; if (ph.m === 'in') { p = mixc(st.sky, st.land, Math.sin(ph.f * Math.PI / 2)); o.fly = true; o.flapHz = 2.5; } else if (ph.m === 'stay') { p = st.land; o.dance = ph.f > 0.35 && ph.f < 0.7; o.peck = !o.dance; } else { p = mixc(st.land, st.away, ph.f * ph.f); o.fly = true; o.flapHz = 2.5; } var q = Pa(p); ctx.globalAlpha = fadeIO(u); wader(ctx, q.x, q.y, q.k, o, t); ctx.globalAlpha = 1; } },
  { id: 'tsubame', name: 'ツバメ', season: ['spring'], light: ['morning', 'day'], minStage: 9, w: 1, dur: 14, desc: 'ツバメが軒先をすいすいとかすめていきます',
    setup: function () { return { a: rvPt(8, 2.0), b: rvPt(44, 2.0) }; },
    draw: function (ctx, g, st, u, t) { for (var i = 0; i < 2; i++) { var v = (u * 2.2 + i * 0.37) % 1, dir = Math.floor(u * 2.2 + i * 0.37) % 2 ? -1 : 1, f = dir > 0 ? v : 1 - v, x = lerp(st.a[0], st.b[0], f), z = lerp(st.a[1], st.b[1], f), y = 2.6 + Math.sin(v * Math.PI * 3 + i) * 0.9; var q = P(x, y, z); ctx.globalAlpha = fadeIO(u); smallBird(ctx, q.x, q.y, q.k, { size: 0.9, face: dir * (st.b[0] > st.a[0] ? 1 : -1), col: [24, 28, 50], belly: [236, 230, 220], fork: true, tint: g.tint, tilt: Math.cos(v * Math.PI * 3 + i) * 0.4 }, t + i); } ctx.globalAlpha = 1; } },
  { id: 'shika', name: '鹿', season: ['autumn'], light: ['morning', 'day', 'dusk'], minStage: 14, w: 0.8, dur: 20, desc: '寺の木立から、鹿が静かに現れました',
    setup: function () { return { from: [-46, 0, 72], to: [-36.5, 0, 66.2] }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.25, 0.78), p = ph.m === 'in' ? mixc(st.from, st.to, ph.f) : ph.m === 'stay' ? st.to : mixc(st.to, st.from, ph.f), q = Pa(p); ctx.globalAlpha = fadeIO(u); beast(ctx, q.x, q.y, q.k, { len: 1.9, h: 1.6, face: ph.m === 'out' ? -1 : 1, col: [150, 100, 60], col2: [236, 222, 196], tint: g.tint, moving: ph.m !== 'stay', graze: ph.m === 'stay' && Math.sin(t * 0.6) > -0.2, gaitHz: 4, legW: 0.05, tailUp: 0.05, tailLen: 0.12, neck: 0.7, head: 0.2, snout: 1.0, ear: 0.6, antler: true, spots: true, lum: g.lum }, t); ctx.globalAlpha = 1; } },
  { id: 'usagi', name: '白いウサギ', season: ['winter'], light: ['morning', 'day', 'dusk'], minStage: 0, w: 1, dur: 13, desc: '雪の野原を、白いウサギがぴょんと跳ねていきます',
    setup: function () { return { a: [-36, 0, 14], b: [-6, 0, 22] }; },
    draw: function (ctx, g, st, u, t) { var hop = (u * 9) % 1, pause = Math.floor(u * 9) % 3 === 2, f = clamp((Math.floor(u * 9) + (pause ? 0 : hop)) / 9), p = mixc(st.a, st.b, f), lift = pause ? 0 : Math.sin(hop * Math.PI) * 0.45, q = P(p[0], lift, p[2]), q0 = P(p[0], 0, p[2]); ctx.globalAlpha = fadeIO(u); ctx.fillStyle = 'rgba(80,90,120,0.2)'; ctx.beginPath(); ctx.ellipse(q0.x, q0.y, 0.3 * q0.k, 0.07 * q0.k, 0, 0, TAU); ctx.fill(); beast(ctx, q.x, q.y, q.k, { len: 1.0, h: 0.75, face: 1, col: [246, 248, 252], col2: [255, 255, 255], tint: g.tint.map(function (v) { return Math.max(0.7, v); }), moving: false, sit: pause, tailUp: 0.05, tailLen: 0.08, tailW: 0.16, ear: 2.2, head: 0.32, neck: 0.25, lum: g.lum }, t); ctx.globalAlpha = 1; } },
  { id: 'kawasemi', name: 'カワセミ', season: ['spring', 'summer', 'autumn'], light: ['morning', 'day'], minStage: 0, w: 0.7, dur: 12, desc: '川面をカワセミが青い光のように横切りました',
    setup: function () { var a = RIVER_S[Math.round(RIVER_S.length * 0.25)], b = RIVER_S[Math.round(RIVER_S.length * 0.62)]; return { a: [a[0], 0.6, a[1]], b: [b[0], 0.6, b[1]], perch: [BR_NEAR[0] - 3.5, 1.2, BR_NEAR[1] + 2.5] }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.25, 0.7), p, perch = ph.m === 'stay'; if (ph.m === 'in') p = mixc(st.a, st.perch, ph.f); else if (perch) { p = st.perch.slice(); if (ph.f > 0.6 && ph.f < 0.8) { var d = (ph.f - 0.6) / 0.2; p[1] = 1.2 - Math.sin(d * Math.PI) * 2.0; } } else p = mixc(st.perch, st.b, ph.f); var q = Pa(p); ctx.globalAlpha = fadeIO(u); if (perch) { var po = P(st.perch[0], 0, st.perch[2]); ctx.strokeStyle = rgb(mulc([110, 90, 60], g.tint)); ctx.lineWidth = Math.max(0.4, 0.08 * po.k); ctx.beginPath(); ctx.moveTo(po.x, po.y); ctx.lineTo(po.x, Pa(st.perch).y + 0.15 * po.k); ctx.stroke(); } smallBird(ctx, q.x, q.y, q.k, { size: 0.85, face: ph.m === 'out' ? faceOf(st.perch, st.b) : faceOf(st.a, st.perch), col: [30, 140, 190], belly: [230, 120, 40], longBill: true, perch: perch && p[1] > 1.1, tint: g.tint.map(function (v) { return Math.max(0.75, v); }) }, t); ctx.globalAlpha = 1; } },
  { id: 'tanuki', name: '狸', season: ['spring', 'summer', 'autumn'], light: ['night'], minStage: 2, w: 0.9, dur: 18, desc: '夜道を、狸がとことこ歩いていきます',
    setup: function () { return { a: [ROAD_S[2][0] + 0.8, 0, ROAD_S[2][1]], b: [ROAD_S[Math.round(ROAD_S.length * 0.55)][0] + 0.8, 0, ROAD_S[Math.round(ROAD_S.length * 0.55)][1]], c: [SIDE_S[3][0], 0, SIDE_S[3][1]] }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.4, 0.55), p = ph.m === 'in' ? mixc(st.a, st.b, ph.f) : ph.m === 'stay' ? st.b : mixc(st.b, st.c, ph.f), q = Pa(p); ctx.globalAlpha = fadeIO(u); beast(ctx, q.x, q.y, q.k, { len: 1.4, h: 0.82, face: ph.m === 'out' ? faceOf(st.b, st.c) : faceOf(st.a, st.b), col: [110, 92, 70], col2: [150, 130, 100], mask: [34, 28, 24], tailCol: [80, 64, 50], tint: g.tint.map(function (v) { return Math.max(0.6, v); }), moving: ph.m !== 'stay', gaitHz: 7, legW: 0.1, tailUp: 0.05, tailLen: 0.35, tailW: 0.16, ear: 0.45, head: 0.32, lum: g.lum }, t); ctx.globalAlpha = 1; } },
  { id: 'nishikigoi', name: '大きな錦鯉', season: ['spring', 'summer', 'autumn'], light: ['morning', 'day', 'dusk'], minStage: 8, w: 0.5, dur: 10, desc: '大きな錦鯉が、川面で高く跳ねました',
    setup: function () { var r = RIVER_S[Math.round(RIVER_S.length * 0.42)]; return { c: [r[0], WL, r[1] + 1] }; },
    draw: function (ctx, g, st, u, t) {
      for (var j = 0; j < 2; j++) { var a = (u - 0.15 - j * 0.45) / 0.2; if (a < 0 || a > 1) { if (a > 1 && a < 3.5) { var rc = P(st.c[0] + j * 3, WL, st.c[2] - j), rr = (0.2 + (a - 1) * 0.6) * rc.k; ctx.strokeStyle = 'rgba(235,242,250,' + (0.5 * (1 - (a - 1) / 2.5)) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(rc.x, rc.y, rr, rr * 0.5, 0, 0, TAU); ctx.stroke(); } continue; }
        var x = st.c[0] + j * 3 + (a - 0.5) * 2.4, y = WL + Math.sin(a * Math.PI) * 1.6, q = P(x, y, st.c[2] - j), k = q.k, ang = Math.cos(a * Math.PI) * -0.9; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang); ctx.fillStyle = rgb(mulc([240, 236, 228], g.tint)); ctx.beginPath(); ctx.ellipse(0, 0, 0.6 * k, 0.17 * k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc([214, 60, 34], g.tint)); ctx.beginPath(); ctx.ellipse(-0.05 * k, -0.04 * k, 0.25 * k, 0.1 * k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc([240, 236, 228], g.tint)); ctx.beginPath(); ctx.moveTo(-0.55 * k, 0); ctx.lineTo(-0.85 * k, -0.18 * k); ctx.lineTo(-0.85 * k, 0.18 * k); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = 'rgba(240,246,250,0.8)'; for (var d = 0; d < 6; d++) { var dp = P(x - 0.6 + d * 0.25, y - 0.3 - (d % 2) * 0.2, st.c[2] - j); ctx.beginPath(); ctx.arc(dp.x, dp.y, 0.45, 0, TAU); ctx.fill(); }
      } } },
  { id: 'inu', name: '野良犬', season: ALL_S, light: ['morning', 'day', 'dusk'], minStage: 9, w: 1, dur: 15, desc: '野良犬が、通りをとことこ駆けていきます',
    setup: function () { var a = stPt(36, 1), b = stPt(2, -0.5), c = rvPt(30, 0.5); return { a: [a[0], 0, a[1]], b: [b[0], 0, b[1]], c: [c[0], 0, c[1]] }; },
    draw: function (ctx, g, st, u, t) { var ph = phase3(u, 0.45, 0.58), p = ph.m === 'in' ? mixc(st.a, st.b, ph.f) : ph.m === 'stay' ? st.b : mixc(st.b, st.c, ph.f), q = Pa(p); ctx.globalAlpha = fadeIO(u); beast(ctx, q.x, q.y, q.k, { len: 1.5, h: 1.05, face: ph.m === 'out' ? faceOf(st.b, st.c) : faceOf(st.a, st.b), col: [196, 156, 100], col2: [236, 220, 190], tint: g.tint, moving: ph.m !== 'stay', sit: ph.m === 'stay', gaitHz: 8, tailUp: 0.6, tailLen: 0.3, wag: 9, ear: 0.6, snout: 1.0, lum: g.lum }, t); ctx.globalAlpha = 1; } }
];
var RARE = RARE_DEFS.map(function (d) { return { id: d.id, name: d.name, season: d.season.slice(), light: d.light.slice(), minStage: d.minStage, desc: d.desc }; });
/* where a rare animal's appearance takes place: its depth band and screen box (for the occluder masks) */
function rareAnchor(def) {
  var st = def.setup(), pts = [];
  (function walk(o) { for (var k in o) { var v = o[k]; if (v && v.length === 3 && typeof v[0] === 'number') pts.push(v); else if (v && v.length === 2 && typeof v[0] === 'number') pts.push([v[0], 0, v[1]]); } })(st);
  var ground = pts.filter(function (q) { return q[1] < 3; }); if (!ground.length) ground = pts;
  var dmin = 1e9; ground.forEach(function (q) { dmin = Math.min(dmin, P(q[0], 0, q[2]).d); });
  var box = []; ground.forEach(function (q) { box.push([q[0] - 1.6, q[1], q[2] - 1.6], [q[0] + 1.6, q[1] + 2.4, q[2] + 1.6]); });
  return { band: dmin < P(0, 0, 36).d ? 0 : 2, key: dmin - 0.4, bb: screenBox(box, 6) };
}
function rareEligible(g) { return RARE_DEFS.filter(function (d) { return d.season.indexOf(g.season) >= 0 && d.light.indexOf(g.light) >= 0 && g.stage >= d.minStage; }); }
function rareById(id) { for (var i = 0; i < RARE_DEFS.length; i++) if (RARE_DEFS[i].id === id) return RARE_DEFS[i]; return null; }

/* ---- 08d_season.js ---- */
/* ================= the calendar inside a season: sakura and momiji come and go =================
   progress 0..1 through spring (1 Mar .. 31 May) or autumn (1 Sep .. 30 Nov); 0.5 without a date.
   The static painting uses it rounded to quarters (it is part of the cache key). */
function seasonProgress(d, season) {
  if (season !== 'spring' && season !== 'autumn') return 0.5;
  if (!(d instanceof Date) || isNaN(d.getTime())) return 0.5;
  var y = d.getFullYear(), a, b;
  if (season === 'spring') { a = new Date(y, 2, 1).getTime(); b = new Date(y, 4, 31, 23, 59).getTime(); }
  else { a = new Date(y, 8, 1).getTime(); b = new Date(y, 10, 30, 23, 59).getTime(); }
  return clamp((d.getTime() - a) / (b - a));
}
function seasonStep(d, season) { return season === 'spring' ? Math.round(seasonProgress(d, season) * 6) / 6 : season === 'autumn' ? Math.round(seasonProgress(d, season) * 4) / 4 : null; }
/* the someiyoshino year, by days since 1 March: buds, first flowers, full bloom, hanafubuki, hazakura, green */
function keyed(K, d) { if (d <= K[0][0]) return K[0][1]; for (var i = 1; i < K.length; i++) if (d <= K[i][0]) { var f = (d - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); f = f * f * (3 - 2 * f); return lerp(K[i - 1][1], K[i][1], f); } return K[K.length - 1][1]; }
var SAK_BLOOM = [[0, 0], [14, 0.04], [24, 0.4], [31, 0.92], [38, 1], [45, 0.82], [55, 0.42], [65, 0.12], [75, 0.02], [91, 0]];
var SAK_LEAF = [[0, 0], [36, 0], [45, 0.16], [55, 0.48], [65, 0.82], [76, 0.97], [91, 1]];
var SAK_FALL = [[0, 0], [24, 0.03], [31, 0.12], [38, 0.35], [45, 0.82], [51, 1], [58, 0.9], [65, 0.4], [75, 0.06], [83, 0]];
var SAK_GROUND = [[0, 0], [31, 0.04], [38, 0.22], [45, 0.68], [54, 1], [61, 0.82], [69, 0.32], [78, 0.05], [86, 0]];
function sakuraState(prog) {
  var d = clamp(prog === undefined || prog === null ? 0.5 : prog) * 91;
  return { prog: prog, bloom: keyed(SAK_BLOOM, d), leaf: keyed(SAK_LEAF, d), fall: keyed(SAK_FALL, d), ground: keyed(SAK_GROUND, d), leafOut: keyed([[0, 0.05], [20, 0.15], [40, 0.55], [55, 0.85], [70, 1]], d) };
}
/* spring as it stands on this day: the meadow greens, the deciduous trees leaf out, flowers come with April */
function springSea(prog) {
  var B = SEASONS.spring, Wn = SEASONS.winter, st = sakuraState(prog), k = st.leafOut, o = {};
  for (var key in B) o[key] = B[key];
  o.grass = [mixc(Wn.grass[0], B.grass[0], sstep(0, 0.6, k)), mixc(Wn.grass[1], B.grass[1], sstep(0, 0.6, k))];
  o.grassAmt = lerp(0.6, B.grassAmt, sstep(0, 0.5, k));
  o.leafK = k; o.sak = st;
  if (k < 0.12) { o.flowers = null; }
  o.paddy = prog < 0.3 ? 'stubble' : 'flood'; o.seedlings = sstep(0.45, 0.75, prog); o.rape = sstep(0.12, 0.3, prog) * (1 - sstep(0.75, 0.95, prog));
  o.forest = B.forest.map(function (c, i) { return i === 3 ? mixc(mixc([150, 130, 126], [120, 160, 80], k), c, st.bloom) : i < 3 ? mixc([130, 116, 108], c, sstep(0.05, 0.6, k)) : c; });
  return o;
}
function springProgress(d) { return seasonProgress(d, 'spring'); }

/* trees that drop petals or leaves: [x, z, crown radius, weight] */
var RIVER_CHERRY = [[-46, 64.5, 0.9], [-14.5, 40.6, 0.8], [-28, 47.3, 0.85], [19.5, 21.5, 0.95], [31.5, 14.5, 0.9]];
function shedTrees() {
  var out = [];
  if (F.riverCherry > 0) RIVER_CHERRY.forEach(function (a) { out.push([a[0], a[1], 4.4 * a[2] * F.riverCherry, 1]); });
  if (F.temple) out.push([-6, 94, 4.6, 0.8]);
  if (SEA.name === 'autumn') {
    out.push([TREE0.x, TREE0.z, 4.2 * F.tree0, 1]);
    if (F.farm) out.push([KAKI.x, KAKI.z, 3.0, 0.6]);
    if (F.temple) { out.push([-28, 95.5, 3.4, 0.8]); out.push([-47, 80, 3.2, 0.7]); }
    GROVES.forEach(function (gv) { if (F.s < gv[2]) out.push([gv[0], gv[1], 3.6, 0.5]); });
  }
  return out;
}
/* ---------------- painted on the static picture: fallen petals or leaves on the ground, the street and the river ---------------- */
var LEAF_COLS = [[176, 36, 22], [206, 62, 30], [226, 104, 40], [232, 150, 48], [222, 184, 64], [150, 70, 30]];
var PETAL_COLS = [[250, 232, 238], [244, 214, 226], [236, 196, 212]];
function drawFallen(ctx) {
  if (sil()) return;
  var sn = SEA.name; if (sn !== 'spring' && sn !== 'autumn') return;
  var amt = F.prog === undefined ? 0.5 : F.prog, k = sn === 'spring' ? (SEA.sak ? SEA.sak.ground : 0.5) : lerp(0.06, 1, Math.pow(amt, 1.3));
  if (k < 0.015) return;
  if (!shedTrees().length) return;   // nothing yet to drop petals or leaves
  var rng = mulberry32(sn === 'spring' ? 611 : 612), lt = lightTint(1), cols = sn === 'spring' ? PETAL_COLS : LEAF_COLS, paths = cols.map(function () { return new Path2D(); }), wpaths = cols.map(function () { return new Path2D(); });
  var dqs = Math.sqrt(Math.min(2, DQ));
  function put(x, z, onWater) {
    var p = P(x, onWater ? WL + 0.02 : 0.02, z), ci = (rng() * cols.length) | 0, s = (sn === 'spring' ? 0.075 : 0.13) * p.k * (0.8 + rng() * 0.5), a = rng() * TAU, pa = (onWater ? wpaths : paths)[ci];
    if (s < 0.25) s = 0.25;
    if (sn === 'spring') { pa.moveTo(p.x + s, p.y); pa.ellipse(p.x, p.y, s, s * 0.45, a * 0.3, 0, TAU); }
    else leafAdd(pa, p.x, p.y, s, a, rng() < 0.75 ? 'momiji' : 'oval', CAM.s * 1.1);
  }
  function onGround(x, z) { return riverD(x, z) > 0.3; }
  // under the trees: thickest at the drip line, thinning outward, and swept toward the downhill side
  shedTrees().forEach(function (t) {
    var n = Math.round(150 * t[3] * k * dqs);
    for (var i = 0; i < n; i++) {
      var a = rng() * TAU, rr = t[2] * (0.25 + Math.pow(rng(), 0.7) * 1.15), x = t[0] + Math.cos(a) * rr + 1.2, z = t[1] + Math.sin(a) * rr * 0.9 - 0.6;
      var d = riverD(x, z); if (d < -0.6) { if (rng() < 0.5) put(x, z, true); } else if (d > 0.3) put(x, z, false);
    }
  });
  // drifts along the street edges and in the gutters (blown there, so mostly on the lee side)
  if (F.street) {
    var nS = Math.round(260 * k * dqs);
    for (var i = 0; i < nS; i++) {
      var main = rng() < 0.6, t = rng() * (main ? 36 : 40), side = rng() < 0.65 ? 1 : -1, w = side * (STREET_HW - 0.35 - Math.pow(rng(), 2.2) * 2.6);
      var pt = main ? stPt(t, w) : stPt(side > 0 ? 3.3 - Math.pow(rng(), 2) * 2 : -2.6 + Math.pow(rng(), 2) * 1.5, 6 + t);
      if (onGround(pt[0], pt[1])) put(pt[0], pt[1], false);
    }
  } else {
    var nR = Math.round(90 * k * dqs);
    for (i = 0; i < nR; i++) { var q = ROAD_S[(rng() * ROAD_S.length) | 0], o = (rng() < 0.5 ? -1 : 1) * (roadW() - 0.2 - rng() * 0.6); put(q[0] + o * 0.9, q[1] - o * 0.4, false); }
  }
  // on the river: petal rafts (hanaikada) or rafts of leaves, drawn out in streaks along the current near the banks
  var nRafts = Math.round((sn === 'spring' ? 9 : 7) * (0.3 + k)), riv = RIVER_S;
  for (var r = 0; r < nRafts; r++) {
    var ix = 2 + ((rng() * (riv.length - 6)) | 0), a0 = riv[ix], a1 = riv[ix + 1], dx = a1[0] - a0[0], dz = a1[1] - a0[1], dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    var bank = (rng() < 0.5 ? -1 : 1) * (RIVER_HW - 1.2 - rng() * 2.5), cx = a0[0] - dz * bank, cz = a0[1] + dx * bank, len = 3 + rng() * 9, m = Math.round(len * 14 * k * dqs);
    for (var j = 0; j < m; j++) { var u = rng(), along = (u - 0.5) * len, across = (rng() - 0.5) * (0.5 + 1.4 * Math.sin(u * Math.PI)); var x2 = cx + dx * along - dz * across, z2 = cz + dz * along + dx * across; if (riverD(x2, z2) < -0.4) put(x2, z2, true); }
  }
  for (var c = 0; c < cols.length; c++) {
    ctx.fillStyle = rgb(mulc(cols[c], lt)); ctx.fill(paths[c]);
    ctx.fillStyle = rgb(mixc(mulc(cols[c], lt), mixc(LIT.skyHor, [120, 140, 150], 0.5), 0.18), 0.92); ctx.fill(wpaths[c]);
  }
}
/* leaves caught along the lower edge of a roof plane (autumn) */
function roofLeaves(ctx, at, Le, Lg, rng) {
  if (sil() || SEA.name !== 'autumn') return;
  var amt = F.prog === undefined ? 0.5 : F.prog, n = Math.round(Le * Lg * 0.55 * lerp(0.04, 1, Math.pow(amt, 1.3)) * Math.sqrt(Math.min(2, DQ)));
  var lt = lightTint(1), paths = LEAF_COLS.map(function () { return new Path2D(); });
  for (var i = 0; i < n; i++) {
    var p = at(rng() * Le, Math.pow(rng(), 2.2) * Lg * 0.6 + 0.05), s = Math.max(0.25, 0.13 * p.k * (0.8 + rng() * 0.5));
    leafAdd(paths[(rng() * LEAF_COLS.length) | 0], p.x, p.y, s, rng() * TAU, 'momiji', 0.6);
  }
  for (var c = 0; c < LEAF_COLS.length; c++) { ctx.fillStyle = rgb(mulc(LEAF_COLS[c], lt)); ctx.fill(paths[c]); }
}

/* ---------------- animated: leaves that rock and side-slip as they fall ---------------- */
var GINKGO = null;
function ginkgoPath() {
  if (GINKGO) return GINKGO;
  var p = new Path2D(); p.moveTo(0, 0.55); p.lineTo(-0.06, 0.1);
  p.bezierCurveTo(-0.55, -0.05, -0.62, -0.5, -0.38, -0.62); p.quadraticCurveTo(-0.1, -0.5, 0, -0.62); p.quadraticCurveTo(0.1, -0.5, 0.38, -0.62);
  p.bezierCurveTo(0.62, -0.5, 0.55, -0.05, 0.06, 0.1); p.closePath(); GINKGO = p; return p;
}
function leafCount(amt) { return Math.round(lerp(2, 26, Math.pow(clamp(amt), 1.2))); }
/* a falling leaf: a pendulum glide (rocking, slipping sideways, dropping fastest at the turns), slow turning, a rare flip */
function newLeaf(rng, x, y) {
  var gk = rng() < 0.3;
  return { x: x, y: y, gk: gk, col: gk ? mixc([226, 186, 52], [244, 214, 96], rng()) : ramp([[160, 30, 20], [204, 58, 30], [228, 112, 42], [226, 160, 58]], rng()),
    sz: (gk ? 1.3 : 1.5) + rng() * 1.0, ph: rng() * TAU, om: 1.5 + rng() * 1.1, A: 0.45 + rng() * 0.35, slip: 5 + rng() * 6, vy: 6 + rng() * 5,
    base: rng() * TAU, turn: (rng() - 0.5) * 0.5, fl: rng() < 0.5 ? 0 : Math.PI, flv: 0, life: 0, rest: 0, floor: 0, mode: 'fall' };
}
function stepLeaf(p, dt, wind, rng) {
  p.life += dt;
  if (p.mode === 'rest') { p.rest += dt; return; }
  p.ph += p.om * dt; p.base += p.turn * dt;
  if (p.flv) { p.fl += p.flv * dt; if (Math.abs(p.fl - p.flt) < 0.15 || (p.flv > 0 ? p.fl > p.flt : p.fl < p.flt)) { p.fl = p.flt; p.flv = 0; } }
  else if (rng() < dt * 0.06) { p.flt = p.fl + Math.PI; p.flv = 5.5; }        // an occasional flip
  var s = Math.sin(p.ph), c = Math.cos(p.ph);
  p.x += (wind * 0.45 + p.slip * c) * dt;
  p.y += p.vy * (0.3 + 0.7 * s * s) * dt;
}
function drawLeaf(ctx, p, tint, alpha) {
  var tilt = p.A * Math.sin(p.ph), face = Math.cos(p.fl), squash = p.mode === 'rest' ? 0.42 : 0.3 + 0.7 * Math.abs(Math.cos(p.ph * 0.5 + p.fl) * 0.4 + face * 0.6);
  ctx.globalAlpha = alpha;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.base + tilt); ctx.scale(1, Math.max(0.15, Math.min(1, squash)));
  var col = rgb(mulc(scl(p.col, face >= 0 ? 1 : 0.78), tint));
  if (p.gk) { ctx.fillStyle = col; ctx.scale(p.sz * 1.3, p.sz * 1.3); ctx.fill(ginkgoPath()); }
  else leafShape(ctx, 0, 0, p.sz, -Math.PI / 2, 1, col);
  ctx.restore();
}
/* the autumn gust: a loose swirl of leaves sweeps up the street, then they come down and settle */
function streetPathScreen() {
  var pts = [];
  if (F.rivst) { for (var t = 42; t >= 0; t -= 4) { var a = rvPt(t, 1.2); pts.push(P(a[0], 0, a[1])); } pts.push(P(BR.x, 3.2, BR.z), P(BR_NEAR[0], 0.3, BR_NEAR[1])); ROAD_S.slice().reverse().slice(0, 12).forEach(function (q) { pts.push(P(q[0], 0, q[1])); }); }
  else if (F.street) for (var t2 = -2; t2 <= 36; t2 += 4) { var a2 = stPt(t2, 0); pts.push(P(a2[0], 0, a2[1])); }
  else ROAD_S.forEach(function (q) { pts.push(P(q[0], 0, q[1])); });
  return pts;
}
function makeLeafGust(g, rng, t) {
  var path = g.gustPath, n = 15 + ((rng() * 11) | 0), W0 = g.wind0 || CALM, rev = (path[path.length - 1].x - path[0].x) * W0.sign < 0, G = { t0: t, dur: 5 + rng() * 1.5, rev: rev, K: 2 + rng(), leaves: [] };
  for (var i = 0; i < n; i++) {
    var L = newLeaf(rng, 0, 0); L.sz *= 1.3; L.mode = 'swirl'; L.th = rng() * TAU; L.R = 2 + rng() * 11; L.om2 = (1.6 + rng() * 2) * (rev ? -1 : 1); L.dy = (rng() - 0.5) * 6; L.lag = rng() * 0.25; L.lift = 6 + rng() * 14;
    L.floorOff = -2 + rng() * 9; G.leaves.push(L);
  }
  return G;
}
function gustPoint(path, u) { // a point along a screen polyline by fraction
  var n = path.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i;
  return { x: lerp(path[i].x, path[i + 1].x, r), y: lerp(path[i].y, path[i + 1].y, r) };
}
function stepLeafGust(G, g, dt, t, rng) {
  var path = g.gustPath, alive = 0;
  for (var i = 0; i < G.leaves.length; i++) {
    var L = G.leaves[i];
    if (L.mode === 'swirl') {
      var u = clamp((t - G.t0) / G.dur - L.lag), e = u * u * (3 - 2 * u), at = gustPoint(path, G.rev ? 1 - (0.05 + 0.9 * e) : 0.05 + 0.9 * e);
      L.th += L.om2 * dt; L.R += dt * 1.4; L.ph += L.om * dt; L.base += L.turn * dt * 2;
      var tx = at.x + Math.cos(L.th) * L.R, ty = at.y - L.lift * Math.sin(Math.PI * Math.min(1, e * 1.1)) + L.dy + Math.sin(L.th) * L.R * 0.4;
      if (L.life === 0) { L.x = tx - (G.rev ? -1 : 1) * 30; L.y = ty; }
      L.x += (tx - L.x) * Math.min(1, dt * 4); L.y += (ty - L.y) * Math.min(1, dt * 4); L.life += dt;
      if (u >= 1) { L.mode = 'fall'; L.floor = at.y + L.floorOff; L.vy *= 0.8; }
      alive++;
    } else if (L.mode === 'fall') {
      stepLeaf(L, dt, gWind(g).h * 11, rng);
      if (L.y >= L.floor) { L.mode = 'rest'; L.rest = 0; L.ph = 0; }
      alive++;
    } else { L.rest += dt; if (L.rest < 7) alive++; }
  }
  return alive > 0;
}
function drawLeafGust(ctx, G, g) {
  for (var i = 0; i < G.leaves.length; i++) {
    var L = G.leaves[i], a = L.mode === 'rest' ? clamp(1 - (L.rest - 4) / 3) : clamp(L.life * 3);
    if (a > 0.02) drawLeaf(ctx, L, g.tint, a * 0.95);
  }
  ctx.globalAlpha = 1;
}

/* ---- 08e_wind.js ---- */
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
/* the wind as the animation uses it: h = signed push across the screen, z = toward/away, s = strength, k = gust factor (1 calm, 2-3 in a gust) */
function windVec(w, k) { var a = w.dir * Math.PI / 180, kk = k || 1; return { h: Math.cos(a) * w.strength * kk, z: Math.sin(a) * w.strength * kk, s: w.strength * kk, sign: Math.cos(a) >= 0 ? 1 : -1, dir: w.dir, k: kk }; }
var WIND_LEAN = 0;   // static paintings: which way the day's wind bends willows (+1 toward screen right)
var CALM = { h: 0.6, z: 0, s: 0.6, sign: 1, dir: 0, k: 1 };
function gWind(g) { return g.wind || CALM; }

/* ---- 08f_weather.js ---- */
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

/* ---------------- the static painting under a weather: light, sky, wet ground ---------------- */
function weatherLight(L, w) {
  if (!w || w === 'clear' || w === 'after') return L;
  var o = {}, k; for (k in L) o[k] = L[k];
  var night = L.name === 'night', dusk = L.name === 'dusk', dark = w === 'storm' ? 1 : w === 'typhoon' ? 0.95 : w === 'blizzard' ? 0.5 : w === 'rain' ? 0.6 : w === 'snow' ? 0.35 : 0.2;
  var grey = night ? [26, 32, 46] : dusk ? [118, 104, 112] : w === 'typhoon' ? [132, 146, 128] : w === 'blizzard' ? [196, 204, 218] : [150, 156, 166];
  var greyD = night ? [14, 18, 30] : dusk ? [70, 62, 74] : w === 'typhoon' ? [84, 98, 84] : w === 'blizzard' ? [156, 166, 184] : [96, 102, 116];
  var g = mixc(grey, greyD, clamp((dark - 0.3) / 0.7));
  var lift = w === 'cloudy' ? 0.55 : w === 'snow' ? 0.75 : 0.85;
  o.skyTop = mixc(L.skyTop, g, lift); o.skyHor = mixc(L.skyHor, mixc(g, [255, 255, 255], night ? 0 : 0.2), lift);
  o.haze = mixc(L.haze, mixc(g, [255, 255, 255], night ? 0.05 : 0.25), lift * 0.9); o.hazeK = L.hazeK * (1 + dark * 0.8);
  o.sunc = scl(L.sunc, w === 'cloudy' ? 0.55 : w === 'snow' ? 0.4 : 0.25 - dark * 0.08);
  o.amb = scl(mixc(L.amb, [0.6, 0.62, 0.66], 0.5), (night ? 1 : 1.12) * (1 - dark * 0.22));
  o.shadowA = L.shadowA * (w === 'cloudy' ? 0.35 : 0.12); o.bloom = L.bloom * 0.6;
  o.sunGlow = 'rgba(255,255,255,0)'; o.wash = ['rgba(200,210,220,0.12)', 'rgba(200,210,220,0.04)'];
  if (L.grade) o.grade = L.grade.map(function (c) { return mixc(c, [200, 204, 214], 0.3); });
  o.vig = scl(L.vig, 1 - dark * 0.15); o.mist = Math.max(L.mist, wxWet(w) ? 0.45 : L.mist);
  if (w === 'blizzard') {   // a whiteout: dim, cool and shadowless; the lamps lit by day
    o.haze = night ? [56, 64, 88] : dusk ? [168, 166, 180] : mixc([204, 212, 226], o.haze, 0.15); o.hazeK = L.hazeK * 3.4; o.win = Math.max(L.win, 0.45); o.lit = true;
    o.sunc = scl(L.sunc, 0.1); o.amb = mulc(o.amb, night ? [0.92, 0.96, 1.08] : [0.9, 0.95, 1.04]); o.shadowA = L.shadowA * 0.05; o.bloom = L.bloom * 0.4;
    o.grade = night ? (L.grade || [[255, 255, 255], [255, 255, 255], [255, 255, 255]]).map(function (c) { return mulc(c, [0.9, 0.94, 1.04]); }) : [[222, 228, 242], [232, 237, 247], [224, 230, 242]];
    o.vig = scl(L.vig, 0.92); o.blizzard = true;
  }
  if (w === 'typhoon') { o.hazeK = L.hazeK * 2.2; o.win = Math.max(L.win, 0.25); }
  if (w === 'rain' || w === 'storm') o.win = Math.max(L.win, 0.15);
  function tint(Q) { var d = Math.max(0, Q.sun[1]) * 0.95; return [Q.amb[0] + Q.sunc[0] * d, Q.amb[1] + Q.sunc[1] * d, Q.amb[2] + Q.sunc[2] * d]; }
  var tb = tint(L), tw = tint(o); o.foliageTint = [clamp(tw[0] / tb[0], 0.3, 1.1), clamp(tw[1] / tb[1], 0.3, 1.1), clamp(tw[2] / tb[2], 0.3, 1.1)];
  o.fog = w === 'blizzard' ? 0.86 : w === 'typhoon' ? 0.45 : w === 'storm' ? 0.32 : w === 'rain' ? 0.24 : w === 'snow' ? 0.3 : 0.08;
  o.wx = w; o.base = L;
  return o;
}
/* an overcast sky: a soft lid of grey cloud with darker masses, lighter toward the horizon */
function paintOvercast(ctx, yo, w) {
  var L = LIT, rng = mulberry32(77), dark = w === 'storm' || w === 'typhoon' ? 1 : w === 'rain' ? 0.6 : w === 'snow' || w === 'blizzard' ? 0.4 : 0.2, yH = 100 + yo;
  var lid = mixc(L.skyTop, [40, 44, 56], dark * 0.35), g = ctx.createLinearGradient(0, 0, 0, yH);
  g.addColorStop(0, rgb(lid, 0.95)); g.addColorStop(0.7, rgb(mixc(lid, L.skyHor, 0.6), 0.6)); g.addColorStop(1, rgb(L.skyHor, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, yH);
  for (var i = 0; i < 26; i++) {
    var x = rng() * (W + 80) - 40, y = yo - 10 + rng() * 52, rx = 30 + rng() * 60, ry = 5 + rng() * 9, c = mixc(lid, [20, 24, 34], 0.1 + rng() * 0.25 * dark);
    var gg = ctx.createRadialGradient(x, y, 0, x, y, rx); gg.addColorStop(0, rgb(c, 0.45)); gg.addColorStop(1, rgb(c, 0));
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y); ctx.fillStyle = gg; ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2); ctx.restore();
  }
}
/* blizzard whiteout (in post, device pixels): visibility falls off with distance along the ground, and the air is full of
   streaming bands of blown snow, thicker far away, slanting downwind; the far town and the hills dissolve into it */
var STREAK_TEX = null;
function streakTex() {
  if (STREAK_TEX) return STREAK_TEX;
  var w = 256, h = 48, c = mkCanvas(w, h), x = c.getContext('2d'), r = mulberry32(919), img = x.createImageData(w, h), d = img.data, nz = makeNoise(41);
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
    var u = i / w, v = j / h, env = Math.pow(Math.sin(Math.PI * u), 1.3) * Math.exp(-Math.pow((v - 0.5) / 0.26, 2));
    var st = 0.55 + 0.45 * nz.n2(i * 0.025, j * 0.55) + 0.25 * (nz.n2(i * 0.08 + 9, j * 1.3) - 0.5), k = (j * w + i) * 4;
    d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = clamp(env * st * 1.15) * 255;
  }
  x.putImageData(img, 0, 0); STREAK_TEX = c; return c;
}
function whiteoutAlpha(fogMax) {   // fog alpha by the depth of the ground seen (scene z): clear close by, a whiteout by the far town
  return function (z) { return fogMax * (0.05 + 0.95 * Math.pow(clamp((z - 2) / 98), 1.55)); };
}
function paintWhiteout(ctx, bw, bh) {
  var night = LIT.name === 'night', col = LIT.haze, lite = night ? mixc(col, [150, 162, 196], 0.35) : mixc(col, [246, 248, 252], 0.55), fa = whiteoutAlpha(LIT.fog), sign = WIND_LEAN >= 0 ? 1 : -1, i;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 1. the veil: per screen row, by the distance of the ground seen there (above the ground: the far limit)
  var g = ctx.createLinearGradient(0, 0, 0, bh), yo = P(0, 0, GROUND_FAR).y;
  for (i = 0; i <= 24; i++) { var y = i / 24 * H, gp = y > yo ? groundAt(W / 2, y) : null, zz = gp ? gp.z : GROUND_FAR + 20; g.addColorStop(i / 24, rgb(col, clamp(fa(zz), 0, 0.95))); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, bw, bh);
  // 2. bands of blown snow streaming with the wind, densest in the distance
  var tex = streakTex(), r = mulberry32(5150), slope = 0.07 * sign, n = Math.round(150 * Math.sqrt(DQ));
  ctx.globalCompositeOperation = 'source-over';
  var tint = mkCanvas(tex.width, tex.height), tx = tint.getContext('2d'); tx.drawImage(tex, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = rgb(lite); tx.fillRect(0, 0, tint.width, tint.height);
  for (i = 0; i < n; i++) {
    var zf = lerp(8, GROUND_FAR + 10, Math.pow(r(), 0.55)), y2 = P(0, 0, zf).y - r() * 6, gp2 = groundAt(W / 2, y2), z2 = gp2 ? gp2.z : GROUND_FAR;
    var k2 = CAM.F / P(0, 0, zf).d, L = (10 + r() * 22) * k2 * (0.6 + r() * 0.8), hh = L * (0.05 + r() * 0.06), x2 = r() * (W + L) - L / 2;
    var a = 0.32 * Math.pow(clamp(fa(z2) / LIT.fog), 0.8) * (0.4 + r() * 0.7) * (night ? 0.7 : 1);
    ctx.globalAlpha = clamp(a); ctx.setTransform(KS, KS * slope * 0.6, 0, KS, 0, 0);
    ctx.drawImage(tint, x2 - L / 2, y2 - x2 * slope * 0.6 - hh / 2, L, hh);
  }
  // 3. a few long curtains of snow sweeping across the far town
  for (i = 0; i < 5; i++) { var cy = lerp(yo - 20, H * 0.55, r()), cw = W * (0.5 + r() * 0.6), ch = 26 + r() * 30, cx = r() * W; ctx.globalAlpha = 0.16 + r() * 0.14; ctx.setTransform(KS, KS * slope, 0, KS, 0, 0); ctx.drawImage(tint, cx - cw / 2, cy - cx * slope - ch / 2, cw, ch); }
  ctx.restore();
}
/* a faint rainbow opposite the sun after a summer afternoon shower */
function paintRainbow(ctx, yo) {
  var cx = W * (LIT.sunX > 0.5 ? 0.3 : 0.7), cy = yo + 122, R = 112, cols = [[255, 70, 60], [255, 160, 50], [255, 236, 90], [90, 210, 100], [80, 140, 255], [130, 90, 220]];
  ctx.save(); ctx.lineWidth = 2.2;
  for (var i = 0; i < cols.length; i++) { var g = ctx.createLinearGradient(0, cy - R, 0, cy); g.addColorStop(0, rgb(cols[i], 0.3)); g.addColorStop(1, rgb(cols[i], 0.05)); ctx.strokeStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R - i * 2, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke(); }
  ctx.restore();
}

/* ---------------- animated weather (overlay) ---------------- */
function initWeatherFx(g, rng) {
  var wx = g.wx, X = { wx: wx, drops: [], splash: [], ripples: [], drips: [], flash: null };
  if (!wxWet(wx)) { if (wx === 'blizzard') X.bz = makeBlizzard(g, rng); return wxSnowy(wx) ? X : null; }
  var heavy = wx === 'storm' ? 1.6 : wx === 'typhoon' ? 2.2 : 1, layers = [[0.35, 230], [0.65, 120], [1, 46]];
  layers.forEach(function (Ly, li) { for (var i = 0; i < Math.round(Ly[1] * heavy); i++) X.drops.push({ x: rng() * (g.W + 120) - 60, y: rng() * g.H, d: Ly[0], v: 150 + Ly[0] * 160 + rng() * 40, L: 3 + Ly[0] * 9 + rng() * 3, li: li }); });
  for (var i = 0; i < 40 * heavy; i++) X.splash.push({ x: rng() * g.W, y: g.horizonY + Math.pow(rng(), 0.7) * (g.H - g.horizonY), t: rng(), r: rng() });
  // eave drips: along the front eaves of the houses that face us
  if (wx !== 'typhoon') townPlan(g.F).forEach(function (b) {
    if (b.type === 'kura' || b.type === 'nagaya') return;
    var B = BF(b.x, b.z, b.u, 0), d = b.d || 8, w = b.w || 6, Wl = boxWalls(B, w, d, 0, 3); if (!Wl.f.vis) return;
    var yE = b.type === 'inn' ? 3.65 : b.low ? 2.6 : (b.yE || 5) - 0.6, out = b.type === 'inn' ? 1.05 : 0.95;
    for (var a = 0.3; a < w; a += 0.9 + rng() * 0.6) { var top = P.apply(null, Wl.f.at(a, b.low ? 2.6 : 3.2, out)), bot = P.apply(null, Wl.f.at(a, 0, out)); X.drips.push({ x: top.x, y0: top.y, y1: bot.y, ph: rng(), sp: 0.7 + rng() * 0.6 }); }
  });
  return X;
}
function drawWeatherFx(ctx, g, X, t, dt) {
  if (!X || !wxWet(X.wx)) return;
  var Wd = gWind(g), slant = clamp(Wd.h * (X.wx === 'typhoon' ? 1.1 : 0.45), -1.4, 1.4), night = g.LIT.name === 'night', base = night ? [150, 166, 200] : [214, 222, 232];
  // streaks: three depths, the near ones longer, brighter and faster; one path per depth
  for (var li = 0; li < 3; li++) {
    ctx.strokeStyle = rgb(base, [0.16, 0.24, 0.34][li]); ctx.lineWidth = [0.28, 0.38, 0.55][li]; ctx.beginPath();
    for (var i = 0; i < X.drops.length; i++) {
      var p = X.drops[i]; if (p.li !== li) continue;
      p.y += p.v * dt; p.x += p.v * dt * slant; if (p.y > g.H + 10) { p.y -= g.H + 30; p.x = Math.random() * (g.W + 120) - 60; } if (p.x > g.W + 60) p.x -= g.W + 120; else if (p.x < -60) p.x += g.W + 120;
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.L * slant * 0.9, p.y - p.L);
    }
    ctx.stroke();
  }
  // splashes on streets and roofs
  ctx.strokeStyle = rgb(base, 0.42); ctx.lineWidth = 0.35; ctx.beginPath();
  for (i = 0; i < X.splash.length; i++) { var s = X.splash[i]; s.t += dt * 2.6; if (s.t > 1) { s.t -= 1; s.x = Math.random() * g.W; s.y = g.horizonY + Math.pow(Math.random(), 0.7) * (g.H - g.horizonY); } var r = 0.4 + s.t * 1.6 * (0.5 + (s.y - g.horizonY) / g.H); ctx.moveTo(s.x - r, s.y); ctx.quadraticCurveTo(s.x, s.y - r * 0.9, s.x + r, s.y); }
  ctx.stroke();
  // drips from the eaves
  ctx.fillStyle = rgb(base, 0.6);
  for (i = 0; i < X.drips.length; i++) { var q = X.drips[i], u = (t * q.sp + q.ph) % 1, y = lerp(q.y0, q.y1, u * u); ctx.fillRect(q.x - 0.15, y, 0.3, 1.2); }
  // sheets of rain sweeping across in a typhoon
  if (X.wx === 'typhoon') {
    for (i = 0; i < 4; i++) { var sx = ((t * 60 * Wd.sign + i * 137) % (g.W + 200) + g.W + 200) % (g.W + 200) - 100, gr = ctx.createLinearGradient(sx - 50, 0, sx + 50, 0); gr.addColorStop(0, 'rgba(220,226,230,0)'); gr.addColorStop(0.5, 'rgba(220,226,230,0.13)'); gr.addColorStop(1, 'rgba(220,226,230,0)'); ctx.fillStyle = gr; ctx.save(); ctx.transform(1, 0, -slant * 0.6, 1, 0, 0); ctx.fillRect(sx - 50, 0, 100, g.H); ctx.restore(); }
  }
}
/* rain on water: rings everywhere; in a typhoon, whitecaps */
function drawWaterRain(ctx, g, X, t) {
  if (!X || !wxWet(X.wx) || !g.water) return;
  var n = X.wx === 'rain' ? 70 : 110, base = g.LIT.name === 'night' ? [170, 186, 220] : [226, 234, 242];
  ctx.strokeStyle = rgb(base, 0.32); ctx.lineWidth = 0.35; ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var ph = (t * 1.3 + i * 0.6180339) % 1, cyc = Math.floor(t * 1.3 + i * 0.6180339), hx = hash2(i, cyc), hy = hash2(i + 999, cyc), x = hx * g.W, y = g.horizonY + hy * (g.H - g.horizonY);
    if (!waterAt(g, x, y)) continue;
    var r = 0.3 + ph * 2.2 * (0.6 + (y - g.horizonY) / g.H); ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r * 0.4, 0, 0, TAU);
  }
  ctx.stroke();
  if (X.wx === 'typhoon') {
    var Wd = gWind(g); ctx.strokeStyle = 'rgba(236,232,220,0.55)'; ctx.lineWidth = 0.6; ctx.beginPath();
    for (i = 0; i < 60; i++) { var x2 = ((hash2(i, 3) * g.W + t * 9 * Wd.sign * (0.6 + hash2(i, 4))) % g.W + g.W) % g.W, y2 = g.horizonY + hash2(i, 5) * (g.H - g.horizonY), lf = (t * 0.7 + hash2(i, 6)) % 1; if (!waterAt(g, x2, y2) || lf > 0.6) continue; ctx.moveTo(x2 - 1.4, y2); ctx.quadraticCurveTo(x2, y2 - 0.7, x2 + 1.4, y2 + 0.1); }
    ctx.stroke();
  }
}
/* lightning: a forked bolt over the mountains and the whole scene lit in flickers */
function makeBolt(g, rng) {
  var x = g.W * (0.12 + rng() * 0.76), y = 2 + rng() * 8, yEnd = g.ridgeY + 4 + rng() * 10, pts = [[x, y]], branches = [];
  while (y < yEnd) { y += 2.5 + rng() * 4; x += (rng() - 0.5) * 7; pts.push([x, Math.min(y, yEnd)]); if (rng() < 0.22) { var bx = x, by = y, br = [[bx, by]]; for (var k = 0; k < 4; k++) { bx += (rng() - 0.3) * 6 * (rng() < 0.5 ? -1 : 1); by += 2 + rng() * 3; br.push([bx, by]); } branches.push(br); } }
  return { pts: pts, branches: branches };
}
function lightningLevel(L, t) { var a = t - L.t0; if (a < 0 || a > 0.9) return -1; return a < 0.08 ? 1 : a < 0.16 ? 0.25 : a < 0.24 ? 0.85 : Math.max(0, 0.5 - (a - 0.24) * 0.8); }
function drawLightningFlash(ctx, g, L, t) { var fl = lightningLevel(L, t); if (fl < 0) return false; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,210,255,' + (0.28 * fl) + ')'; ctx.fillRect(0, 0, g.W, g.H); ctx.globalCompositeOperation = 'source-over'; return true; }
function drawLightning(ctx, g, L, t) {
  var fl = lightningLevel(L, t); if (fl < 0) return false;
  ctx.globalCompositeOperation = 'lighter';
  function line(pts, w, al) { ctx.strokeStyle = 'rgba(235,240,255,' + al + ')'; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }
  if (fl > 0.2) { ctx.lineJoin = 'round'; line(L.bolt.pts, 2.4, 0.25 * fl); line(L.bolt.pts, 0.8, 0.95 * fl); L.bolt.branches.forEach(function (b) { line(b, 0.5, 0.6 * fl); }); ctx.lineJoin = 'miter'; }
  ctx.globalCompositeOperation = 'source-over';
  return true;
}
/* a blizzard: snow driven nearly sideways in three depths (far specks, mid streaks, near fast streaks),
   gusts that thicken it into a brief whiteout, sheets of snow sweeping across and spindrift racing along the ground */
var CURTAIN_TEX = null;
function curtainTex() {
  if (CURTAIN_TEX) return CURTAIN_TEX;
  var w = 256, h = 160, c = mkCanvas(w, h), x = c.getContext('2d'), r = mulberry32(77);
  for (var i = 0; i < 520; i++) {
    var y = r() * h, x0 = r() * w * 1.4 - w * 0.2, L = 20 + r() * 90, env = Math.sin(Math.PI * y / h);
    x.strokeStyle = 'rgba(255,255,255,' + (0.05 + 0.2 * r()) * env + ')'; x.lineWidth = 0.6 + r() * 1.6; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + L, y + L * 0.04); x.stroke();
  }
  var g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.25, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = g; x.fillRect(0, 0, w, h);
  CURTAIN_TEX = c; return c;
}
function makeBlizzard(g, rng) {
  var B = { f: [], cur: [], spin: [], t: 0 }, i, NL = [520, 280, 70];
  for (var l = 0; l < 3; l++) for (i = 0; i < NL[l]; i++) B.f.push({ l: l, x: rng() * (g.W + 80) - 40, y: rng() * g.H, sp: 0.7 + rng() * 0.6, ph: rng() * TAU, sz: rng() });
  for (i = 0; i < 4; i++) B.cur.push({ x: rng() * (g.W + 400) - 200, y: g.horizonY - 60 + rng() * (g.H - g.horizonY + 40), w: 160 + rng() * 160, h: 50 + rng() * 70, sp: 0.8 + rng() * 0.5, a: 0.12 + rng() * 0.12 });
  for (i = 0; i < 9; i++) B.spin.push({ x: rng() * g.W, y: g.horizonY + 20 + Math.pow(rng(), 0.6) * (g.H - g.horizonY - 20), w: 30 + rng() * 60, sp: 0.8 + rng() * 0.7, a: 0.18 + rng() * 0.2 });
  return B;
}
function drawBlizzard(ctx, g, B, t, dt) {
  var Wd = gWind(g), sg = Wd.sign, k = Wd.k || 1, gust = clamp((k - 1) / 1.6), str = 0.75 + 0.35 * Math.min(1, Wd.s / Math.max(0.01, Wd.k)), night = g.LIT.name === 'night', i, f;
  var U = [62, 110, 190], V = [16, 26, 40], span = g.W + 80;
  B.t += dt;
  // sheets of snow sweeping across, behind the flakes
  var ct = curtainTex(), slope = 0.12;
  B.cur.forEach(function (c) {
    c.x += sg * dt * 150 * c.sp * str * (0.8 + 0.5 * gust);
    if (sg > 0 && c.x - c.w > g.W + 40) { c.x = -c.w - 40; c.y = g.horizonY - 60 + Math.random() * (g.H - g.horizonY + 40); } else if (sg < 0 && c.x + c.w < -40) { c.x = g.W + c.w + 40; c.y = g.horizonY - 60 + Math.random() * (g.H - g.horizonY + 40); }
    ctx.save(); ctx.globalAlpha = clamp(c.a * (0.7 + 0.9 * gust) * (night ? 0.6 : 1)); ctx.translate(c.x, c.y); ctx.transform(1, slope, 0, 1, 0, 0); if (sg < 0) ctx.scale(-1, 1);
    ctx.drawImage(ct, -c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
  });
  // spindrift: snow streaming low over the ground
  var st = tintedSprite(night ? [150, 160, 190] : [244, 247, 252]);
  B.spin.forEach(function (c) {
    c.x += sg * dt * 210 * c.sp * (0.7 + 0.6 * gust); if (sg > 0 && c.x - c.w > g.W) c.x = -c.w; else if (sg < 0 && c.x + c.w < 0) c.x = g.W + c.w;
    stamp(ctx, st, c.x, c.y, c.w, 1.6 + c.w * 0.03, c.a * (0.6 + 0.8 * gust) * (night ? 0.6 : 1));
  });
  ctx.globalAlpha = 1;
  // the flakes
  var col = night ? [150, 162, 196] : [250, 252, 255], P0 = new Path2D(), P1 = new Path2D(), P2 = new Path2D(), P3 = new Path2D();
  for (i = 0; i < B.f.length; i++) {
    f = B.f[i];
    var u = U[f.l] * f.sp * str * (1 + 0.9 * gust), v = V[f.l] * f.sp + Math.sin(B.t * (1.3 + f.l * 0.4) + f.ph) * (8 + f.l * 6);
    f.x += sg * u * dt; f.y += v * dt;
    if (f.y > g.H + 4) { f.y -= g.H + 8; f.x = Math.random() * span - 40; }
    if (f.x > g.W + 40) { f.x -= span; f.y = Math.random() * g.H; } else if (f.x < -40) { f.x += span; f.y = Math.random() * g.H; }
    if (f.l === 0) { var r0 = 0.28 + f.sz * 0.25; P0.rect(f.x - r0, f.y - r0, r0 * 2, r0 * 2); }
    else { var L = (f.l === 1 ? 0.016 : 0.024) * u * (0.5 + f.sz), pp = f.l === 1 ? P1 : f.sz < 0.6 ? P2 : P3; pp.moveTo(f.x, f.y); pp.lineTo(f.x - sg * L, f.y - L * v / u); }
  }
  var fa = night ? 0.5 : 1;
  ctx.fillStyle = rgb(col, 0.55 * fa); ctx.fill(P0);
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgb(col, (0.42 + 0.2 * gust) * fa); ctx.lineWidth = 0.5; ctx.stroke(P1);
  ctx.strokeStyle = rgb(col, (0.5 + 0.2 * gust) * fa); ctx.lineWidth = 0.75; ctx.stroke(P2);
  ctx.strokeStyle = rgb(col, (0.4 + 0.2 * gust) * fa); ctx.lineWidth = 1.25; ctx.stroke(P3);
  ctx.lineCap = 'butt';
  // a gust: the air fills, the town dims into the white for a moment
  if (gust > 0.02) { ctx.fillStyle = rgb(night ? [70, 78, 104] : [226, 230, 240], 0.12 * gust); ctx.fillRect(0, 0, g.W, g.H); }
}
/* the bangasa umbrella over a walker */
var UMB_COLS = [[150, 40, 30], [40, 52, 84], [176, 124, 64], [60, 70, 60], [120, 30, 40]];
function drawUmbrella(ctx, fx, hy, h, col, tint, tilt) {
  var r = h * 0.36, cy = hy - h * 0.12;
  ctx.save(); ctx.translate(fx, cy); ctx.rotate(tilt || 0);
  ctx.strokeStyle = rgb(mulc([90, 70, 50], tint)); ctx.lineWidth = Math.max(0.2, h * 0.02); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, h * 0.42); ctx.stroke();
  ctx.fillStyle = rgb(mulc(col, tint)); ctx.beginPath(); ctx.moveTo(-r, r * 0.18); ctx.quadraticCurveTo(0, -r * 0.62, r, r * 0.18); ctx.quadraticCurveTo(0, r * 0.02, -r, r * 0.18); ctx.fill();
  ctx.strokeStyle = rgb(mulc([236, 230, 214], tint), 0.85); ctx.lineWidth = Math.max(0.2, h * 0.03); ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r * 0.45, r * 0.12, 0, Math.PI, TAU); ctx.stroke();
  ctx.restore();
}

/* ---- 08g_fireworks.js ---- */
/* ================= 花火大会: summer fireworks over the river =================
   fireworksAt(date): 20 Jul - 31 Aug, on Saturdays or 13-16 Aug, 19:30-20:45, in clear or cloudy weather.
   An overlay: shells rise from barges on the river and burst over the town; reflections on the water, colour flashes,
   smoke drifting with the shared wind; a スターマイン finale from about 20:40. */
function fireworksAt(date) {
  var d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(), m = d.getMonth(), day = d.getDate();
  if (!((m === 6 && day >= 20) || m === 7)) return false;
  if (!(d.getDay() === 6 || (m === 7 && day >= 13 && day <= 16))) return false;
  var mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  if (mins < 19 * 60 + 30 || mins > 20 * 60 + 45) return false;
  var w = weatherAt(d); return w === 'clear' || w === 'cloudy';
}
var FW_COLS = [[255, 120, 90], [255, 210, 110], [140, 220, 255], [190, 140, 255], [140, 255, 160], [255, 255, 235], [255, 150, 210]];
function fwLaunchPts(g) {   // barges on the river, as screen points
  var out = [];
  for (var i = 0; i < RIVER_S.length; i++) { var q = RIVER_S[i]; if (q[0] < -40 || q[0] > 34 || i % 3) continue; var p = P(q[0], WL, q[1]); if (p.y > g.H * 0.3 && p.y < g.H * 0.9 && p.x > 20 && p.x < g.W - 20) out.push({ x: p.x, y: p.y, k: p.k }); }
  return out.length ? out : [{ x: g.W * 0.5, y: g.H * 0.7, k: 5 }];
}
function newShell(g, rng, finale) {
  var L = g.fw.launch[(rng() * g.fw.launch.length) | 0], r = rng(), kind = finale ? (r < 0.5 ? 'botan' : r < 0.8 ? 'kiku' : 'senrin') : (r < 0.32 ? 'kiku' : r < 0.58 ? 'botan' : r < 0.8 ? 'yanagi' : 'senrin');
  var size = finale ? 0.4 + rng() * 0.4 : 0.6 + rng() * 0.4, bx = clamp(L.x + (rng() - 0.5) * 90, 40, g.W - 40), by = 30 + rng() * 40 + (1 - size) * 22;
  var c1 = FW_COLS[(rng() * FW_COLS.length) | 0], c2 = rng() < 0.5 ? FW_COLS[(rng() * FW_COLS.length) | 0] : c1;
  if (kind === 'yanagi') { c1 = [255, 200, 120]; c2 = [220, 150, 70]; }
  return { kind: kind, x0: L.x, y0: L.y, bx: bx, by: by, rise: 1.1 + rng() * 0.5 + (finale ? -0.4 : 0), R: (36 + 46 * size) * (kind === 'senrin' ? 0.7 : 1), c1: c1, c2: c2, size: size, seed: (rng() * 1e9) | 0, t0: 0, n: kind === 'botan' ? 80 : kind === 'yanagi' ? 54 : kind === 'senrin' ? 30 : 72 };
}
function initFireworks(g, rng) {
  return { launch: fwLaunchPts(g), shells: [], smoke: [], next: 0.5, finaleUntil: -1, lastFinale: -999, boats: [0.18, 0.47, 0.71].map(function (f, i) { return { f: f, ph: rng() * TAU, sp: 0.02 + rng() * 0.015, dir: i % 2 ? -1 : 1 }; }) };
}
function stepFireworks(g, FW, dt, t, rng, finaleNow, cueFn) {
  var finale = finaleNow || t < FW.finaleUntil;
  if (t > FW.next) {
    var s = newShell(g, rng, finale); s.t0 = t; FW.shells.push(s);
    FW.next = t + (finale ? 0.2 + rng() * 0.4 : (rng() < 0.3 ? 0.4 + rng() * 0.6 : 1.6 + rng() * 2.6));
    s.cued = false;
  }
  for (var i = FW.shells.length - 1; i >= 0; i--) {
    var S = FW.shells[i], a = t - S.t0 - S.rise;
    if (a > 0 && !S.cued) { S.cued = true; cueFn(S); FW.smoke.push({ x: S.bx, y: S.by, r: S.R * 0.6, t0: t, sz: S.size }); }
    if (a > (S.kind === 'yanagi' ? 4.2 : 3.0)) FW.shells.splice(i, 1);
  }
  var Wd = gWind(g);
  for (i = FW.smoke.length - 1; i >= 0; i--) { var m = FW.smoke[i]; m.x += Wd.h * 4 * dt; m.y -= 0.4 * dt; m.r += dt * 1.2; if (t - m.t0 > 22) FW.smoke.splice(i, 1); }
}
/* each star's position: out along its ray with drag, then falling under gravity (willow stars fall more, trailing) */
function starPos(S, j, a) {
  // stars leave on a sphere; seen from afar the shell projects to a disc that is densest at its rim
  var r = mulberry32(S.seed + j * 7919), th = r() * TAU, cz = 1 - 2 * ((j + r() * 0.8) / S.n), sp = Math.sqrt(Math.max(0, 1 - cz * cz)), v = S.R * (0.94 + r() * 0.12), drag = 1 - Math.exp(-a * 2.6), droop = (S.kind === 'yanagi' ? 7 : 4) * a * a;
  return { x: S.bx + Math.cos(th) * sp * v * drag, y: S.by + Math.sin(th) * sp * v * drag * 0.96 + droop };
}
function drawFireworks(ctx, g, FW, t) {
  ctx.globalCompositeOperation = 'lighter';
  var spr = sprite('spark'), flash = 0, fc = [0, 0, 0];
  // smoke, faintly lit
  for (var i = 0; i < FW.smoke.length; i++) { var m = FW.smoke[i], age = t - m.t0; stamp(ctx, tintedSprite([70, 70, 80]), m.x, m.y, m.r, m.r * 0.6, 0.18 * clamp(age / 1.5) * clamp(1 - age / 22)); }
  for (i = 0; i < FW.shells.length; i++) {
    var S = FW.shells[i], u = (t - S.t0) / S.rise;
    if (u < 1) { // the rising shell and its sparkling tail
      var e = 1 - Math.pow(1 - u, 2), x = lerp(S.x0, S.bx, e), y = lerp(S.y0, S.by, e);
      ctx.strokeStyle = 'rgba(255,220,170,0.55)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); var pu = Math.max(0, u - 0.12), pe = 1 - Math.pow(1 - pu, 2); ctx.lineTo(lerp(S.x0, S.bx, pe), lerp(S.y0, S.by, pe)); ctx.stroke();
      stamp(ctx, spr, x, y, 1.6, 1.6, 0.9); continue;
    }
    var a = t - S.t0 - S.rise, life = S.kind === 'yanagi' ? 4.0 : S.kind === 'botan' ? 1.9 : 2.5, fade = clamp(1 - a / life);
    if (fade <= 0) continue;
    if (a < 0.45) { var fa = (1 - a / 0.45) * S.size; flash = Math.max(flash, fa); fc = S.c1; stamp(ctx, tintedSprite(S.c1), S.bx, S.by, S.R * 1.8, S.R * 1.8, 0.6 * fa); stamp(ctx, spr, S.bx, S.by, 6 * fa + 2, 6 * fa + 2, fa); }
    var col = mixc(S.c1, S.c2, clamp(a / life * 1.6)), flick = S.kind === 'senrin' ? 1 : 0.85 + 0.15 * Math.sin(t * 40 + S.seed);
    if (S.kind === 'senrin' && a > 0.55) { // a thousand little flowers: crackling sub-bursts around the first
      var r2 = mulberry32(S.seed + 3);
      for (var b = 0; b < 12; b++) { var p0 = starPos(S, b, 0.55), aa = a - 0.55 - r2() * 0.3; if (aa < 0 || aa > 0.9) continue; var bc = FW_COLS[(r2() * FW_COLS.length) | 0]; stamp(ctx, tintedSprite(bc), p0.x, p0.y, 4 * (1 - aa), 4 * (1 - aa), 0.8 * (1 - aa)); for (var q = 0; q < 6; q++) { var an = q / 6 * TAU + b; stamp(ctx, spr, p0.x + Math.cos(an) * aa * 9, p0.y + Math.sin(an) * aa * 9 + aa * aa * 3, 0.9, 0.9, 0.7 * (1 - aa)); } }
      if (a > 1.0) continue;
    }
    ctx.strokeStyle = rgb(mixc(col, [255, 255, 255], 0.25), 0.8 * fade); ctx.lineWidth = S.kind === 'yanagi' ? 0.8 : 1.0; ctx.beginPath();
    var pts = [];
    for (var j = 0; j < S.n; j++) {
      var p = starPos(S, j, a); pts.push(p);
      if (S.kind === 'kiku' || S.kind === 'yanagi') { var tl = S.kind === 'yanagi' ? 0.55 : 0.22, pq = starPos(S, j, Math.max(0, a - tl)); ctx.moveTo(p.x, p.y); ctx.lineTo(pq.x, pq.y); }
    }
    ctx.stroke();
    var spc = tintedSprite(col.map(function (v) { return Math.round(v); })), sz = (S.kind === 'botan' ? 3.0 : 2.2) * (0.7 + S.size * 0.5);
    for (j = 0; j < pts.length; j++) { var tw = S.kind === 'kiku' && a > life * 0.6 ? (Math.sin(t * 30 + j) > 0 ? 1 : 0.3) : 1; stamp(ctx, spc, pts[j].x, pts[j].y, sz, sz, fade * flick * tw); if (a < life * 0.5) stamp(ctx, spr, pts[j].x, pts[j].y, sz * 0.45, sz * 0.45, fade * 0.9); }
  }
  ctx.globalAlpha = 1;
  // the whole scene lit for a moment in the colour of the burst
  if (flash > 0.02) { ctx.fillStyle = rgb(fc, 0.16 * flash); ctx.fillRect(0, 0, g.W, g.H); }
  ctx.globalCompositeOperation = 'source-over';
}
/* on the water: each burst's light laid down as a broken column */
function drawFireworkReflections(ctx, g, FW, t) {
  ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < FW.shells.length; i++) {
    var S = FW.shells[i], a = t - S.t0 - S.rise; if (a < 0 || a > 2.2) continue;
    var f = clamp(1 - a / 2.2) * S.size, spc = tintedSprite(S.c1);
    for (var k = 0; k < 9; k++) { var yy = g.horizonY + 40 + k * 9 + Math.sin(t * 2 + k) * 2, w = 6 + k * 1.5 + Math.sin(t * 3 + k * 1.7) * 2; stamp(ctx, spc, S.bx + Math.sin(t * 1.3 + k) * 2, yy, w, 1.6, 0.5 * f); }
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
/* yakatabune: roofed pleasure boats hung with red lanterns, drifting on the river */
function drawYakatabune(ctx, g, FW, t) {
  var pa = g.fw.boatPa; if (!pa) return;
  FW.boats.forEach(function (b) {
    var s = ((b.f + t * b.sp * b.dir / pa.len * 10) % 1 + 1) % 1 * pa.len, q = polyAt(pa, s), x = q.x, z = q.z + 0.8, B = BF(x, z, [q.dx, q.dz], 0), k = P(x, 0, z).k, tint = g.tint, bob = Math.sin(t * 1.2 + b.ph) * 0.04;
    drawBoat(ctx, [x, 0, z], [q.dx, q.dz], bob, false);
    var c0 = Pa(B.L(-1.4, -0.6, WL + 0.45)), c1 = Pa(B.L(1.4, -0.6, WL + 0.45)), r0 = Pa(B.L(-1.6, -0.75, WL + 1.6)), r1 = Pa(B.L(1.6, -0.75, WL + 1.6));
    ctx.fillStyle = 'rgba(255,214,150,0.85)'; ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c1.x, c1.y - 0.9 * k); ctx.lineTo(c0.x, c0.y - 0.9 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(mulc([60, 50, 46], tint)); ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.lineTo(r1.x, r1.y - 0.35 * k); ctx.lineTo(r0.x, r0.y - 0.35 * k); ctx.closePath(); ctx.fill();
    for (var i = 0; i < 6; i++) { var lp = { x: lerp(r0.x, r1.x, (i + 0.5) / 6), y: lerp(r0.y, r1.y, (i + 0.5) / 6) + 0.25 * k }; ctx.fillStyle = 'rgb(255,120,80)'; ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 0.12 * k, 0.16 * k, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; stamp(ctx, sprite('warm'), lp.x, lp.y, 0.9 * k, 0.9 * k, 0.4); ctx.globalCompositeOperation = 'source-over'; }
  });
  ctx.globalAlpha = 1;
}
/* spectators on the bridge and along the bank, standing still and looking up */
function spectatorPaths() {
  var out = [], deck = [BR_NEAR, [BR.x, BR.z], BR_FAR];
  out.push({ pts: deck, band: 0, spread: 1.4, w: 0, still: true });
  if (F.rivst) out.push({ pts: [stPt(-2.2, 4), stPt(-2.2, 18), stPt(-2.4, 32)], band: 2, spread: 0.6, w: 0, still: true });
  out.push({ pts: [[BR_NEAR[0] - 3, BR_NEAR[1] - 1.5], [BR_NEAR[0] - 14, BR_NEAR[1] + 3.5], [BR_NEAR[0] - 24, BR_NEAR[1] + 8.5]], band: 0, spread: 0.8, w: 0, still: true });
  out.forEach(function (q) { q.pa = polyLen(q.pts); });
  return out;
}

/* ---- 08h_interact.js ---- */
/* ================= tapping the town: small answers to a touch =================
   Each effect is a little overlay animation; the controller hit-tests in scene units and calls onCue for its sound. */
var TAIKO = function () { var p = stPt(5.2, -(STREET_HW - 1.2)); return { x: p[0], z: p[1] }; };
function townCatSpot() {   // a town cat dozing in the sun
  if (F.shoka) { var p = stPt(2.6, STREET_HW + 0.8); return { x: p[0], z: p[1], y: 0 }; }
  if (F.teahouse) { var tb = teaFrame(), q = tb.L(1.6, -2.6, 0); return { x: q[0], z: q[2], y: 0 }; }
  return null;
}
/* trees one can tap: from the scene's own trees, so the target is where the crown is painted */
function tapTreeList() {
  var out = [];
  buildScene().up.forEach(function (o) {
    if (!o.tap || !o.sway) return;
    var b = swayLogicalBox(o), bp = Pa(o.sway.base);
    out.push({ x: (b[0] + b[2]) / 2, y: (b[1] + Math.min(b[3], bp.y)) / 2, rx: (b[2] - b[0]) / 2 + 2, ry: (Math.min(b[3], bp.y + 2) - b[1]) / 2 + 2, kind: o.tap, d: o.key, w: o.sway });
  });
  return out;
}
function initInteract(g) {
  var I = { bell: null, birds: [], wheel: 0, lamps: [], trees: [], koi: null, paddy: null, taiko: null, cat: null, outs: [] };
  if (g.stage >= 14) { I.bellP = P(BELL.x, 3.2, BELL.z); var bb = screenBox([[BELL.x - 2.6, 0, BELL.z - 2.6], [BELL.x + 2.6, 6.2, BELL.z + 2.6]], 1); I.bellBox = { x: (bb[0] + bb[2]) / 2, y: (bb[1] + bb[3]) / 2, rx: (bb[2] - bb[0]) / 2 + 2, ry: (bb[3] - bb[1]) / 2 + 2, d: P(BELL.x, 0, BELL.z).d }; }
  if (g.F.mill) I.wheelP = Pa(g.wheel ? g.wheel.c : millWheelGeom().c);
  if (g.F.festival) { var tk = TAIKO(); I.taikoW = tk; I.taikoP = P(tk.x, 1.2, tk.z); }
  var cs = townCatSpot(); if (cs) { I.catW = cs; I.catP = P(cs.x, 0.3, cs.z); }
  I.treeList = tapTreeList();
  if (I.wheelP) I.wheelR = MILL.wr * I.wheelP.k + 2;
  return I;
}
/* the hit test: returns the name of what was touched, after starting its animation */
function tapScene(g, I, x, y, t, rng, api) {
  // every target near the touch scores its distance over its own size; the best one answers (small things favoured)
  var best = null;
  function cand(sc, fn) { if (sc < 1 && (!best || sc < best.s)) best = { s: sc, fn: fn }; }
  function circ(p, r) { return Math.hypot(p.x - x, (p.y - y) * 1.15) / r; }
  if (api.rareCat) cand(circ(api.rareCat, 10) * 0.7, function () { api.rareCatTap(); return 'cat'; });
  if (I.catP && api.catShown) cand(circ(I.catP, Math.max(6, 1.3 * I.catP.k + 2)) * 0.7, function () { I.cat = { t0: t, kind: rng() < 0.5 ? 'stretch' : 'hop' }; return 'cat'; });
  g.walkers.forEach(function (w) {
    var wp = walkerPos(g, w), f = P(wp.x, wp.y + 0.8, wp.z);
    cand(circ(f, Math.max(6, 1.1 * f.k + 2.5)) * 0.7, function () { w.react = { t0: t, kind: rng() < 0.6 ? 'bow' : 'wave', pause0: w.pause }; w.pause = Math.max(w.pause, 2.6); return 'person'; });
  });
  if (I.taikoP) cand(circ(I.taikoP, Math.max(8, 1.8 * I.taikoP.k)) * 0.8, function () { I.taiko = { t0: t }; return 'taiko'; });
  var big = I.treeList.slice(); if (I.bellBox) big.push({ x: I.bellBox.x, y: I.bellBox.y, rx: I.bellBox.rx, ry: I.bellBox.ry, d: I.bellBox.d, bell: true });
  function ringBell() {
    I.bell = { t0: t };
    var tf = templeFrame(); for (var b = 0; b < 8; b++) { var rp = P(tf.L(-5 + b * 1.4, 0.5, 0)[0], 9.2, tf.L(-5 + b * 1.4, 0.5, 0)[2]); I.birds.push({ x: rp.x, y: rp.y, vx: (rng() - 0.5) * 16, vy: -10 - rng() * 8, t0: t + 0.3 + rng() * 0.5, ph: rng() * TAU }); }
    return 'bell';
  }
  if (I.wheelP) cand(circ(I.wheelP, Math.max(7, I.wheelR)), function () { I.wheel = t; return 'wheel'; });
  // a shop noren: it flutters and someone steps out
  g.noren.forEach(function (n) {
    var a = Pa(n.W.at(n.s0 - 0.3, n.top + 0.3, 0.3)), c = Pa(n.W.at(n.s1 + 0.3, n.top - n.len - 0.4, 0.3)), cx = (a.x + c.x) / 2, cy = (a.y + c.y) / 2, hw = Math.abs(a.x - c.x) / 2 + 3, hh = Math.abs(a.y - c.y) / 2 + 3;
    cand(Math.max(Math.abs(x - cx) / hw, Math.abs(y - cy) / hh) * 0.75, function () {
      n.boost = t;
      var mid = (n.s0 + n.s1) / 2, d0 = n.W.at(mid, 0, 0.25), d1 = n.W.at(mid + 0.4, 0, 3.4), d2 = n.W.at(mid + 4, 0, 3.6), pa = { pts: [[d0[0], d0[2]], [d1[0], d1[2]], [d2[0], d2[2]]], band: n.band, spread: 0, w: 0 };
      pa.pa = polyLen(pa.pts); g.paths.push(pa);
      var nw = makeWalker(g, g.paths.length - 1, rng, 99); nw.s = 0; nw.dir = 1; nw.pause = 0; nw.temp = t + 16; g.walkers.push(nw);
      return 'noren';
    });
  });
  // a lantern
  (g.glows || []).forEach(function (gl, i) { cand(Math.hypot(gl.x - x, gl.y - y) / Math.max(5, Math.min(9, gl.r * 0.5)) * 0.7, function () { I.lamps.push({ i: i, t0: t }); return 'lantern'; }); });
  // a tree: the nearest crown that holds the touch well inside it, else the best fit
  var tb = null;
  big.forEach(function (tr) { var sc = Math.hypot((x - tr.x) / tr.rx, (y - tr.y) / tr.ry); if (sc < 1 && (!tb || (sc < 0.8 && tb.s >= 0.8) || ((sc < 0.8) === (tb.s < 0.8) && (sc < 0.8 ? tr.d < tb.tr.d : sc < tb.s)))) tb = { s: sc, tr: tr }; });
  if (tb) cand(tb.s, function () { if (tb.tr.bell) return ringBell(); shakeTree(g, I, tb.tr, t, rng); return 'tree'; });
  if (best) return best.fn();
  // the river: food for the koi
  var gp = groundAt(x, y);
  if (gp && riverD(gp.x, gp.z) < 0.4) { var wpt = { x: gp.x, z: gp.z }; if (riverD(wpt.x, wpt.z) > -1) { var c0 = nearestRiver(wpt.x, wpt.z); wpt = c0; } I.koi = { t0: t, x: wpt.x, z: wpt.z, fish: [0, 1, 2, 3].map(function (j) { var a2 = rng() * TAU; return { a: a2, r: 4 + rng() * 3, col: [[236, 110, 40], [246, 240, 230], [222, 176, 60], [210, 60, 40]][j], ph: rng() * TAU }; }) }; return 'koi'; }
  // the paddies: frogs plop, sparrows lift
  if (gp && g.F.paddy) {
    var pc = gp.z < 24 ? (gp.x > 0 ? paddyAt(PADDY_R, gp.x, gp.z) : paddyAt(PADDY_L, gp.x, gp.z)) : null;
    if (pc) { var what = g.season === 'autumn' || g.season === 'winter' ? 'sparrow' : 'frog', sp = P(gp.x, 0, gp.z); I.paddy = { t0: t, what: what, x: sp.x, y: sp.y, k: sp.k, items: [0, 1, 2, 3, 4, 5].map(function () { return { dx: (rng() - 0.5) * 12, dy: (rng() - 0.5) * 4, vx: (rng() - 0.5) * 14, ph: rng() * TAU, d: rng() * 0.4 }; }) }; return 'paddy'; }
  }
  return null;
}
/* what a shaken tree lets fall: the season's own (petals only from a cherry in bloom, leaves coloured like its crown, snow) */
function tapFallKind(g, kind) {
  var S = g.SEA, se = g.season;
  if (S.snow) return { k: 'snow' };
  if (kind === 'pine' || kind === 'cedar') return { k: 'needle', n: 10, cols: kind === 'pine' ? [[120, 96, 54], [150, 120, 70], [90, 110, 60]] : [[130, 86, 50], [160, 110, 66]] };
  if (se === 'spring') {
    if (kind === 'cherry') { var st = sakuraState(g.F.prog === undefined ? 0.5 : g.F.prog); if (st.bloom > 0.25) return { k: 'petal' }; if (st.leaf < 0.2) return { k: 'none' }; }
    if (kind === 'peach') return { k: 'petal', cols: [[246, 170, 196], [236, 140, 176], [250, 200, 214]] };
    if (S.leafK !== undefined && S.leafK < 0.15) return { k: 'none' };   // still bare
    return { k: 'leaf', n: 9, shape: kind === 'maple' ? 'momiji' : kind === 'willow' ? 'narrow' : 'oval', cols: [[150, 186, 80], [176, 204, 100], [120, 164, 64]] };
  }
  if (se === 'summer') return { k: 'leaf', n: 9, shape: kind === 'maple' ? 'momiji' : kind === 'willow' ? 'narrow' : 'oval', cols: [[52, 96, 36], [76, 120, 44], [100, 140, 56]] };
  if (se === 'autumn') {
    var pal = kind === 'maple' ? S.maple : kind === 'willow' ? S.willow : kind === 'cherry' ? [[150, 40, 24], [196, 70, 30], [226, 120, 50], [236, 160, 80]] : kind === 'kaki' ? [[150, 70, 24], [200, 100, 30], [232, 140, 46], [240, 176, 80]] : S.broad;
    pal = (pal || S.broad).slice(Math.floor((pal || S.broad).length * 0.35));
    return { k: 'leaf', n: 26, shape: kind === 'maple' ? 'momiji' : kind === 'willow' ? 'narrow' : 'oval', cols: pal };
  }
  return { k: 'none' };
}
function shakeTree(g, I, tr, t, rng) {
  var F0 = tapFallKind(g, tr.kind), parts = [], n = F0.k === 'none' ? 0 : F0.n || 26;
  for (var k = 0; k < n; k++) {
    var col = F0.cols ? ramp(F0.cols, rng()) : F0.k === 'petal' ? mixc([250, 226, 234], [255, 242, 246], rng()) : [250, 252, 255];
    parts.push({ x: tr.x + (rng() - 0.5) * tr.rx * 1.4, y: tr.y + (rng() - 0.5) * tr.ry * 0.9, vx: (rng() - 0.5) * 6, vy: F0.k === 'snow' ? 4 + rng() * 6 : F0.k === 'needle' ? 6 + rng() * 5 : 2 + rng() * 5, rot: rng() * TAU, ph: rng() * TAU, col: col });
  }
  I.trees.push({ t0: t, kind: F0.k, shape: F0.shape || 'oval', parts: parts, floor: tr.y + tr.ry * 1.2 });
}
function nearestRiver(x, z) { var best = null, bd = 1e9; for (var i = 0; i < RIVER_S.length; i++) { var q = RIVER_S[i], d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; best = q; } } var f = Math.min(1, (RIVER_HW - 1.5) / Math.max(0.01, bd)); return { x: best[0] + (x - best[0]) * f, z: best[1] + (z - best[1]) * f }; }
function stepInteract(g, I, dt, t) {
  for (var i = I.birds.length - 1; i >= 0; i--) { var b = I.birds[i]; if (t < b.t0) continue; b.x += b.vx * dt; b.y += b.vy * dt; b.vy *= 0.99; if (t - b.t0 > 6) I.birds.splice(i, 1); }
  for (i = I.trees.length - 1; i >= 0; i--) { var T = I.trees[i], Wd = gWind(g); T.parts.forEach(function (p) { if (p.y < T.floor) { p.x += (p.vx + Wd.h * 6 + Math.sin(t * 2 + p.ph) * 3) * dt; p.y += p.vy * dt; p.rot += dt * 1.5; } }); if (t - T.t0 > 7) I.trees.splice(i, 1); }
  for (i = I.lamps.length - 1; i >= 0; i--) if (t - I.lamps[i].t0 > 3) I.lamps.splice(i, 1);
  for (i = g.walkers.length - 1; i >= 0; i--) { var w = g.walkers[i]; if (w.react && t - w.react.t0 > 2.6) w.react = null; if (w.temp && t > w.temp) g.walkers.splice(i, 1); }
  if (I.koi && t - I.koi.t0 > 9) I.koi = null;
  if (I.paddy && t - I.paddy.t0 > 4) I.paddy = null;
  if (I.bell && t - I.bell.t0 > 6) I.bell = null;
  if (I.taiko && t - I.taiko.t0 > 3.2) I.taiko = null;
  if (I.cat && t - I.cat.t0 > 3.5) I.cat = null;
  // the wheel turns with an integrated angle, briefly faster after a tap
  var boost = I.wheel && t - I.wheel < 5 ? 2.2 * (1 - (t - I.wheel) / 5) : 0; g.wheelAng = (g.wheelAng || 0) + dt * 0.55 * (g.SEA.snow ? 0.4 : 1) * (1 + boost);
}
function drawInteract(ctx, g, I, t) {
  var tint = g.tint, i;
  // the bell: the striker swings in, the sound spreads in rings
  if (I.bell) {
    var a = t - I.bell.t0, B = BF(BELL.x, BELL.z, [1, -0.05], 0), sw = a < 0.5 ? -0.9 * Math.sin(a / 0.5 * Math.PI / 2) : -0.9 * Math.cos((a - 0.5) * 7) * Math.exp(-(a - 0.5) * 2.2);
    var hang = B.L(-1.25, 0, 3.9), e0 = P(hang[0] - 0.9 + Math.sin(sw) * 0.4, 2.9 - (1 - Math.cos(sw)) * 0.3, hang[2]), e1 = P(hang[0] + 0.25 + Math.sin(sw) * 0.4, 2.9 - (1 - Math.cos(sw)) * 0.3, hang[2]), hp = Pa(hang);
    ctx.strokeStyle = rgb(mulc([90, 70, 52], tint)); ctx.lineWidth = Math.max(0.6, 0.22 * e0.k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
    ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(hp.x - 2, hp.y); ctx.lineTo(e0.x + 1, e0.y); ctx.moveTo(hp.x + 1, hp.y); ctx.lineTo(e1.x - 1, e1.y); ctx.stroke(); ctx.lineCap = 'butt';
    if (a > 0.5) for (var r = 0; r < 3; r++) { var ra = a - 0.5 - r * 0.5; if (ra < 0 || ra > 3) continue; ctx.strokeStyle = 'rgba(255,240,210,' + (0.35 * (1 - ra / 3)) + ')'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(I.bellP.x, I.bellP.y, 4 + ra * 16, (4 + ra * 16) * 0.45, 0, 0, TAU); ctx.stroke(); }
  }
  // birds lifting from the temple roof
  ctx.strokeStyle = 'rgba(40,34,40,0.85)'; ctx.lineWidth = 0.5; ctx.beginPath();
  for (i = 0; i < I.birds.length; i++) { var b = I.birds[i]; if (t < b.t0) continue; var fl = Math.sin(t * 14 + b.ph) * 1.4; ctx.moveTo(b.x - 1.6, b.y - fl); ctx.quadraticCurveTo(b.x - 0.6, b.y - 0.6, b.x, b.y); ctx.quadraticCurveTo(b.x + 0.6, b.y - 0.6, b.x + 1.6, b.y - fl); }
  ctx.stroke();
  // a lantern flares and sways
  I.lamps.forEach(function (L) { var gl = g.glows[L.i]; if (!gl) return; var a2 = t - L.t0, f = Math.sin(a2 / 3 * Math.PI), sx = Math.sin(a2 * 6) * 0.8 * (1 - a2 / 3); ctx.globalCompositeOperation = 'lighter'; stamp(ctx, sprite('warm'), gl.x + sx, gl.y, gl.r * 1.4, gl.r * 1.4, 0.6 * f); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; });
  // petals, leaves or snow shaken from a tree
  I.trees.forEach(function (T) {
    var age = t - T.t0, fa = clamp(1 - (age - 5) / 2);
    T.parts.forEach(function (p) {
      ctx.globalAlpha = fa;
      if (T.kind === 'snow') { ctx.fillStyle = 'rgba(250,252,255,0.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.7 + (p.ph % 1) * 0.6, 0, TAU); ctx.fill(); }
      else if (T.kind === 'petal') { ctx.fillStyle = rgb(mulc(p.col, tint.map(function (v) { return Math.max(0.6, v); }))); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.3 + 0.7 * Math.abs(Math.cos(p.rot * 2))); ctx.beginPath(); ctx.ellipse(0, 0, 1.0, 0.6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else if (T.kind === 'needle') { ctx.strokeStyle = rgb(mulc(p.col, tint)); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.rot) * 0.9, p.y - Math.sin(p.rot) * 0.9); ctx.lineTo(p.x + Math.cos(p.rot) * 0.9, p.y + Math.sin(p.rot) * 0.9); ctx.stroke(); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.rot * 1.3))); if (T.shape === 'momiji') { var mp = new Path2D(); leafAdd(mp, 0, 0, 1.4, -Math.PI / 2, 'momiji', 1); ctx.fillStyle = rgb(mulc(p.col, tint)); ctx.fill(mp); } else if (T.shape === 'narrow') { ctx.fillStyle = rgb(mulc(p.col, tint)); ctx.beginPath(); ctx.ellipse(0, 0, 0.35, 1.5, 0, 0, TAU); ctx.fill(); } else leafShape(ctx, 0, 0, 1.3, -Math.PI / 2, 1, rgb(mulc(p.col, tint))); ctx.restore(); }
    });
    ctx.globalAlpha = 1;
  });
  // frogs and sparrows in the paddies
  if (I.paddy) {
    var Pd = I.paddy, ag = t - Pd.t0;
    Pd.items.forEach(function (q) {
      var u = clamp((ag - q.d) / 0.7); if (ag < q.d) return;
      if (Pd.what === 'frog') { if (u < 1) { var fx = Pd.x + q.dx + q.vx * 0.15 * u, fy = Pd.y + q.dy - Math.sin(u * Math.PI) * 4; ctx.fillStyle = rgb(mulc([70, 120, 50], tint)); ctx.beginPath(); ctx.ellipse(fx, fy, 0.9, 0.55, 0, 0, TAU); ctx.fill(); } else { var ra2 = ag - q.d - 0.7; if (ra2 < 1.6) { ctx.strokeStyle = 'rgba(230,240,246,' + (0.5 * (1 - ra2 / 1.6)) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(Pd.x + q.dx + q.vx * 0.15, Pd.y + q.dy, 0.5 + ra2 * 3, (0.5 + ra2 * 3) * 0.4, 0, 0, TAU); ctx.stroke(); } } }
      else { var bx = Pd.x + q.dx + q.vx * ag, by = Pd.y + q.dy - ag * ag * 10 - ag * 6, f2 = Math.sin(t * 18 + q.ph) * 1.1; ctx.strokeStyle = rgb(mulc([96, 72, 52], tint)); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(bx - 1.1, by - f2); ctx.quadraticCurveTo(bx, by - 0.4, bx + 1.1, by - f2); ctx.stroke(); }
    });
  }
}
/* koi under the water, drawn in the water layer */
function drawInteractWater(ctx, g, I, t) {
  if (!I || !I.koi) return;
  var K = I.koi, a = t - K.t0, c = P(K.x, WL, K.z), k = c.k, fade = clamp(1 - (a - 7) / 2);
  // food pellets: a scatter of dots that drift and are taken
  ctx.fillStyle = 'rgba(214,180,120,' + (0.9 * clamp(1 - a / 5)) + ')';
  for (var i = 0; i < 9; i++) { var pa = i * 0.7, px = c.x + Math.cos(pa) * (0.3 + i * 0.06) * k, py = c.y + Math.sin(pa) * (0.15 + i * 0.03) * k; if (a > 2 + i * 0.3) continue; ctx.beginPath(); ctx.arc(px, py, 0.4, 0, TAU); ctx.fill(); }
  K.fish.forEach(function (f, j) {
    var u = clamp((a - 0.4 - j * 0.3) / 2.2), e = u * u * (3 - 2 * u), rr = lerp(f.r, 0.5 + j * 0.2, e), ang = f.a + Math.sin(t * 0.8 + f.ph) * 0.4 * (1 - e) + e * j * 1.5, fx = K.x + Math.cos(ang) * rr, fz = K.z + Math.sin(ang) * rr * 0.6, fp = P(fx, WL - 0.15, fz);
    var dir = Math.atan2(c.y - fp.y, c.x - fp.x) + Math.sin(t * 6 + f.ph) * 0.15;
    ctx.globalAlpha = 0.85 * fade; ctx.save(); ctx.translate(fp.x, fp.y); ctx.rotate(dir); ctx.scale(1, 0.5);
    ctx.fillStyle = rgb(f.col); ctx.beginPath(); ctx.ellipse(0, 0, 0.55 * k, 0.17 * k, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.5 * k, 0); ctx.lineTo(-0.85 * k, -0.18 * k + Math.sin(t * 8 + f.ph) * 0.06 * k); ctx.lineTo(-0.85 * k, 0.18 * k + Math.sin(t * 8 + f.ph) * 0.06 * k); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (u > 0.95 && Math.sin(t * 5 + j * 2) > 0.7) { ctx.strokeStyle = 'rgba(236,244,250,0.5)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.ellipse(fp.x, fp.y, 0.25 * k, 0.1 * k, 0, 0, TAU); ctx.stroke(); }
  });
  ctx.globalAlpha = 1;
}
function drawTaiko(ctx, g, I, t) {
  var tk = I.taikoW, tint = g.tint, base = P(tk.x, 0, tk.z), k = base.k, dc = P(tk.x, 1.25, tk.z);
  // the stand and the barrel drum, its skin toward us
  ctx.strokeStyle = rgb(mulc([80, 56, 40], tint)); ctx.lineWidth = Math.max(0.4, 0.08 * k); ctx.beginPath(); ctx.moveTo(base.x - 0.5 * k, base.y); ctx.lineTo(dc.x - 0.2 * k, dc.y); ctx.moveTo(base.x + 0.5 * k, base.y); ctx.lineTo(dc.x + 0.2 * k, dc.y); ctx.stroke();
  ctx.fillStyle = rgb(mulc([150, 60, 40], tint)); ctx.beginPath(); ctx.ellipse(dc.x, dc.y, 0.55 * k, 0.5 * k, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(mulc([226, 210, 178], tint)); ctx.beginPath(); ctx.ellipse(dc.x - 0.12 * k, dc.y, 0.4 * k, 0.44 * k, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(mulc([40, 30, 26], tint)); ctx.beginPath(); ctx.arc(dc.x - 0.12 * k, dc.y, 0.12 * k, 0, TAU); ctx.fill();
  // the drummer in a happi coat, sticks raised or striking
  var dx = dc.x + 0.9 * k, feet = P(tk.x + 0.9, 0, tk.z), head = feet.y - 1.6 * k, beat = I.taiko ? Math.sin((t - I.taiko.t0) * 9) : -0.6;
  ctx.fillStyle = rgb(mulc([40, 60, 120], tint)); ctx.beginPath(); ctx.moveTo(dx - 0.25 * k, head + 0.3 * k); ctx.lineTo(dx + 0.25 * k, head + 0.3 * k); ctx.lineTo(dx + 0.3 * k, feet.y - 0.55 * k); ctx.lineTo(dx - 0.3 * k, feet.y - 0.55 * k); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgb(mulc([230, 226, 214], tint)); ctx.lineWidth = Math.max(0.35, 0.09 * k); ctx.beginPath(); ctx.moveTo(dx - 0.1 * k, feet.y - 0.55 * k); ctx.lineTo(dx - 0.15 * k, feet.y); ctx.moveTo(dx + 0.1 * k, feet.y - 0.55 * k); ctx.lineTo(dx + 0.18 * k, feet.y); ctx.stroke();
  ctx.fillStyle = rgb(mulc([226, 186, 150], tint)); ctx.beginPath(); ctx.arc(dx, head + 0.12 * k, 0.14 * k, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(mulc([236, 236, 236], tint)); ctx.fillRect(dx - 0.15 * k, head + 0.02 * k, 0.3 * k, 0.05 * k);
  var sh = { x: dx - 0.15 * k, y: head + 0.45 * k }, ang = -2.4 + beat * 0.7, L = 0.75 * k;
  ctx.strokeStyle = rgb(mulc([200, 170, 120], tint)); ctx.lineWidth = Math.max(0.3, 0.05 * k); ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x + Math.cos(ang) * L, sh.y + Math.sin(ang) * L); ctx.moveTo(sh.x + 0.1 * k, sh.y); ctx.lineTo(sh.x + 0.1 * k + Math.cos(ang + 0.3) * L, sh.y + Math.sin(ang + 0.3) * L); ctx.stroke();
  if (I.taiko && beat > 0.85) { ctx.strokeStyle = 'rgba(255,240,210,0.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(dc.x, dc.y, 1.2 * k, 1.0 * k, 0, 0, TAU); ctx.stroke(); }
}
function drawTownCat(ctx, g, I, t) {
  var c = I.catW, a = I.cat ? t - I.cat.t0 : -1, p = P(c.x, 0, c.z), o = { len: 1.25, h: 0.72, face: 1, col: [200, 150, 90], col2: [240, 220, 190], patch: [150, 100, 60], tint: g.tint, moving: false, lie: true, tailUp: 0.3, ear: 0.9, lum: g.lum, wag: 0.8 };
  if (a >= 0 && I.cat.kind === 'stretch') { o.lie = false; o.sit = false; o.h = 0.72 * (1 + 0.15 * Math.sin(clamp(a / 2) * Math.PI)); o.len = 1.25 * (1 + 0.25 * Math.sin(clamp(a / 2) * Math.PI)); o.tailUp = 0.8; }
  else if (a >= 0) { o.lie = false; o.moving = a < 1.2; var hop = clamp(a / 0.6); p = P(c.x + (a < 1.2 ? a * 0.8 : 0.96), Math.sin(hop * Math.PI) * 0.5, c.z); }
  beast(ctx, p.x, p.y, p.k, o, t);
}

/* where each tappable thing is actually painted (debug/test): silhouettes of the static scene, front to back, so a
   target's point is one where it is really visible; moving things from the same anchors the overlay draws them at */
function tapTruth(g) {
  var scene = buildScene(), up = scene.up, w = Math.ceil(g.W), h = Math.ceil(g.H), acc = mkCanvas(w, h), ax = acc.getContext('2d'), tmp = mkCanvas(w, h), tx = tmp.getContext('2d'), out = [], mode0 = MODE;
  MODE = 'k';
  try {
    for (var i = up.length - 1; i >= 0; i--) {
      var o = up[i];
      if (o.tap) {
        tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, w, h); o.draw(tx);
        var a = tx.getImageData(0, 0, w, h).data, b = ax.getImageData(0, 0, w, h).data, sx = 0, sy = 0, n = 0, pts = [];
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var k = (y * w + x) * 4 + 3; if (a[k] > 128 && b[k] < 60) { sx += x; sy += y; n++; pts.push(x, y); } }
        if (n > 3) {
          var cx = sx / n, cy = sy / n, best = 1e9, bx = cx, by = cy;
          for (var j = 0; j < pts.length; j += 2) { var d = Math.hypot(pts[j] - cx, pts[j + 1] - cy); if (d < best) { best = d; bx = pts[j]; by = pts[j + 1]; } }
          out.push({ tap: o.tap, x: bx + 0.5, y: by + 0.5, n: n });
        }
      }
      if (o.key < 1e5) o.draw(ax);
    }
  } finally { MODE = mode0; }
  return out;
}

/* ---- 08i_life.js ---- */
/* ================= town life through the year: little groups of people doing what the season asks =================
   Chosen from the date (and the stage, the light and the weather); drawn in the depth bands so houses and trees hide them. */
var LIFE_SITES = {
  hanami: [[-12.2, 36.4], [-25.2, 42.4], [24.6, 18.9]], dangoStall: [-9.2, 34.6], bon: [6.5, 14.6],
  kids: [[-6.4, 35.4], [-3.2, 35.0]], harvest: [[-26.5, 15.2], [-23.6, 13.6], [-21.6, 11.8], [18.5, 12.5], [22.4, 10.8]]
};
function lifeSites() {   // every place an activity might happen at this stage (for the occluder masks)
  var out = [];
  function add(x, z, r, h) { out.push({ x: x, z: z, r: r || 2.5, h: h || 2.2 }); }
  if (F.riverCherry > 0) LIFE_SITES.hanami.forEach(function (q) { add(q[0], q[1], 2.6); });
  if (F.riverCherry > 0) add(LIFE_SITES.dangoStall[0], LIFE_SITES.dangoStall[1], 1.8, 2.6);
  if (F.machiya) add(LIFE_SITES.bon[0], LIFE_SITES.bon[1], 5.5, 4.6);
  LIFE_SITES.kids.forEach(function (q) { add(q[0], q[1], 1.5); });
  if (F.paddy) LIFE_SITES.harvest.forEach(function (q) { add(q[0], q[1], 1.5); });
  if (F.street) for (var s = 8; s <= 26; s += 6) { var p = rvPt(s, -2.6); add(p[0], p[1], 1.6, 2.8); }
  var fr = lifeFronts(); fr.forEach(function (q) { add(q[0], q[2], 1.6); });
  if (F.shrine) add(SHRINE.x - 0.4, SHRINE.z - 3.0, 3);
  if (F.temple) { var tf = templeFrame().L(0, -8.6, 0); add(tf[0], tf[2], 4); }
  if (F.farm) { var ff = farmFrame().L(2.5, -9.6, 0); add(ff[0], ff[2], 2.2); }
  return out;
}
function lifeFronts() {   // in front of a few shops: where water is sprinkled and snow swept
  var out = [];
  townPlan(F).forEach(function (b) { if (out.length >= 3 || b.type !== 'machiya' || b.low) return; var Wf = boxWalls(BF(b.x, b.z, b.u, 0), b.w, b.d, 0, 3).f; if (!Wf.vis) return; out.push(Wf.at(b.w * 0.5, 0, 1.5)); });
  return out;
}
/* what is happening today */
function lifeScenes(g, date, rng) {
  var L = [], d = date, m = d.getMonth(), day = d.getDate(), wd = d.getDay(), light = g.light, wet = wxWet(g.wx) || g.wx === 'blizzard', F0 = g.F, sk = g.season === 'spring' ? sakuraState(seasonProgress(d, 'spring')) : null;
  var evening = light === 'dusk' || light === 'night', daytime = light === 'day' || light === 'morning';
  function people(n, col) { var a = []; for (var i = 0; i < n; i++) a.push({ ph: rng() * TAU, col: col ? col[(rng() * col.length) | 0] : WALK_COL[(rng() * WALK_COL.length) | 0], col2: WALK_COL[(rng() * WALK_COL.length) | 0], child: rng() < 0.2, woman: rng() < 0.5 }); return a; }
  var YUKATA = [[40, 60, 120], [200, 80, 110], [236, 230, 214], [60, 120, 150], [140, 60, 130], [220, 120, 60]];
  if (!wet) {
    // 花見: mats under the blossom, a dango stall
    if (sk && sk.bloom > 0.55 && F0.riverCherry > 0 && light !== 'night') { LIFE_SITES.hanami.forEach(function (q, i) { L.push({ kind: 'hanami', x: q[0], z: q[1], ang: i * 0.7 + 0.3, folk: people(3 + ((rng() * 3) | 0)) }); }); L.push({ kind: 'dango', x: LIFE_SITES.dangoStall[0], z: LIFE_SITES.dangoStall[1] }); }
    // summer festival evenings: stalls along the riverside street, yukata
    var natsu = ((m === 6 && day >= 20) || m === 7) && wd === 6;
    if (natsu && evening && F0.street) for (var s = 8; s <= 26; s += 6) { var p = rvPt(s, -2.6); L.push({ kind: 'yatai', x: p[0], z: p[1], col: YUKATA[(s / 6) | 0], folk: people(2, YUKATA) }); }
    // お盆: a bon-odori ring round a yagura
    if (m === 7 && day >= 13 && day <= 16 && evening && F0.machiya) L.push({ kind: 'bon', x: LIFE_SITES.bon[0], z: LIFE_SITES.bon[1], folk: people(16, YUKATA) });
    // summer days: children with nets by the river; water sprinkled in front of shops
    if (g.season === 'summer' && daytime) { LIFE_SITES.kids.forEach(function (q) { L.push({ kind: 'net', x: q[0], z: q[1], folk: people(1) }); }); if (F0.machiya) lifeFronts().slice(0, 2).forEach(function (q) { L.push({ kind: 'uchimizu', x: q[0], z: q[2], folk: people(1) }); }); }
    // harvest: September and October in the golden paddies
    if (g.season === 'autumn' && daytime && F0.paddy) { var ap = seasonProgress(d, 'autumn'); if (ap > 0.08 && ap < 0.62) LIFE_SITES.harvest.forEach(function (q, i) { if (i < 2 + ap * 6) L.push({ kind: 'harvest', x: q[0], z: q[1], folk: people(1) }); }); }
    // December: snow swept from the shopfronts; rice pounded in the last week
    if (m === 11 && daytime) { if (g.SEA.snow && F0.machiya) lifeFronts().forEach(function (q) { L.push({ kind: 'sweep', x: q[0], z: q[2], folk: people(1) }); }); if (day >= 25 && F0.farm) { var ff = farmFrame().L(2.5, -9.6, 0); L.push({ kind: 'mochi', x: ff[0], z: ff[2], folk: people(2) }); } }
    // 初詣: the first visits of the year
    if (m === 0 && day <= 7 && light !== 'night') { if (F0.shrine) L.push({ kind: 'pray', x: SHRINE.x - 0.4, z: SHRINE.z - 3.0, folk: people(5) }); if (F0.temple) { var tf = templeFrame().L(0, -8.6, 0); L.push({ kind: 'pray', x: tf[0], z: tf[2], folk: people(8) }); } }
    // any day: children at play
    if (daytime && g.season !== 'winter') { var kp = F0.street ? stPt(10, 0.5) : [TEA.x + 3, TEA.z - 4]; L.push({ kind: 'play', x: kp[0], z: kp[1], folk: people(3).map(function (f) { f.child = true; return f; }) }); }
  }
  L.forEach(function (a) { a.band = P(a.x, 0, a.z).d < P(0, 0, 36).d ? 0 : 2; a.d = P(a.x, 0, a.z).d; });
  return L;
}
/* a tiny figure: feet at (x, y), height h px; pose: stand, sit, bend, with arm angles */
function figure(ctx, x, y, h, f, tint, o) {
  o = o || {}; var sc = f.child ? 0.7 : 1; h *= sc;
  var c1 = rgb(mulc(f.col, tint)), c2 = rgb(mulc(scl(f.col, 0.72), tint)), skin = rgb(mulc([226, 186, 150], tint)), hair = rgb(mulc([30, 26, 26], tint));
  var sit = o.pose === 'sit', bend = o.bend || 0, hy = y - h * (sit ? 0.62 : 1) + h * 0.25 * bend, hx = x + (o.face || 1) * h * 0.25 * bend;
  ctx.fillStyle = 'rgba(20,16,24,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.18, h * 0.05, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = c1; ctx.beginPath();
  if (sit) { ctx.moveTo(x - h * 0.16, y); ctx.lineTo(x + h * 0.2, y); ctx.lineTo(x + h * 0.1, hy + h * 0.15); ctx.lineTo(x - h * 0.1, hy + h * 0.15); }
  else { ctx.moveTo(x - h * 0.14, y - h * 0.02); ctx.lineTo(x + h * 0.14, y - h * 0.02); ctx.lineTo(hx + h * 0.12, hy + h * 0.18); ctx.lineTo(hx - h * 0.12, hy + h * 0.18); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(mulc(f.col2, tint)); ctx.fillRect(lerp(x, hx, 0.6) - h * 0.13, lerp(y, hy, 0.62), h * 0.26, h * 0.05);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hy + h * 0.06, h * 0.075, 0, TAU); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(hx, hy + h * 0.045, h * 0.078, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.strokeStyle = c2; ctx.lineWidth = Math.max(0.3, h * 0.05); ctx.lineCap = 'round';
  (o.arms || []).forEach(function (a) { var sx = hx + (a[1] || 0) * h * 0.1, sy = hy + h * 0.22, L = h * 0.32; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a[0]) * L, sy + Math.sin(a[0]) * L); ctx.stroke(); });
  ctx.lineCap = 'butt';
  return { hx: hx, hy: hy, h: h };
}
function drawLife(ctx, g, a, t) {
  var tint = g.tint, c = P(a.x, 0, a.z), k = c.k, h = 1.6 * k, i, f;
  if (a.kind === 'hanami') {
    var mat = [[-1.4, -1], [1.4, -1], [1.4, 1], [-1.4, 1]].map(function (q) { var ca = Math.cos(a.ang), sa = Math.sin(a.ang); return P(a.x + q[0] * ca - q[1] * sa, 0.02, a.z + q[0] * sa + q[1] * ca); });
    ctx.fillStyle = rgb(mulc([196, 40, 36], tint)); ctx.beginPath(); mat.forEach(function (p, j) { if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.fill();
    for (i = 0; i < a.folk.length; i++) { f = a.folk[i]; var an = i / a.folk.length * TAU, px = a.x + Math.cos(an) * 1.0, pz = a.z + Math.sin(an) * 0.65, p = P(px, 0, pz), toast = Math.sin(t * 0.7 + f.ph) > 0.85; figure(ctx, p.x, p.y, h, f, tint, { pose: 'sit', arms: toast ? [[-1.9, 0.3]] : [[0.6, 0.3]] }); if (toast) { ctx.fillStyle = rgb(mulc([236, 230, 214], tint)); ctx.fillRect(p.x + h * 0.05, p.y - h * 0.95, h * 0.06, h * 0.06); } }
    // a bento box and a sake bottle in the middle
    ctx.fillStyle = rgb(mulc([40, 30, 26], tint)); ctx.fillRect(c.x - 0.25 * k, c.y - 0.1 * k, 0.5 * k, 0.18 * k); ctx.fillStyle = rgb(mulc([230, 224, 210], tint)); ctx.fillRect(c.x + 0.35 * k, c.y - 0.4 * k, 0.1 * k, 0.32 * k);
  } else if (a.kind === 'dango') {
    stall(ctx, g, a, [200, 50, 40], t); ctx.fillStyle = rgb(mulc([250, 236, 236], tint)); for (i = 0; i < 3; i++) { var dx = c.x + (i - 1) * 0.25 * k; ctx.beginPath(); ctx.arc(dx, c.y - 1.15 * k, 0.07 * k, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc(i === 1 ? [140, 190, 110] : [240, 170, 190], tint)); }
  } else if (a.kind === 'yatai') {
    stall(ctx, g, a, a.col, t);
    for (i = 0; i < a.folk.length; i++) { f = a.folk[i]; var q = P(a.x + (i ? 1.2 : -1.2), 0, a.z - 1.3); figure(ctx, q.x, q.y, h, f, tint, { arms: [[1.2 + Math.sin(t + f.ph) * 0.2, 0]] }); }
  } else if (a.kind === 'bon') {
    // the yagura: a two-tier tower hung with lanterns, a drummer on top; the dancers circling slowly
    var top = P(a.x, 2.6, a.z), b0 = P(a.x - 1.4, 0, a.z), b1 = P(a.x + 1.4, 0, a.z);
    ctx.strokeStyle = rgb(mulc([110, 80, 56], tint)); ctx.lineWidth = Math.max(0.5, 0.12 * k); ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b0.x + 0.2 * k, top.y); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b1.x - 0.2 * k, top.y); ctx.stroke();
    ctx.fillStyle = rgb(mulc([190, 52, 42], tint)); ctx.fillRect(b0.x + 0.15 * k, top.y, b1.x - b0.x - 0.3 * k, 0.5 * k);
    ctx.fillStyle = rgb(mulc([236, 232, 220], tint)); ctx.fillRect(b0.x + 0.15 * k, top.y + 0.18 * k, b1.x - b0.x - 0.3 * k, 0.12 * k);
    figure(ctx, top.x, top.y, h * 0.9, { col: [236, 236, 236], col2: [40, 60, 120] }, tint, { arms: [[-1.2 - 0.6 * Math.abs(Math.sin(t * 4)), -1], [-1.6 + 0.6 * Math.abs(Math.sin(t * 4 + 1.5)), 1]] });
    for (i = 0; i < 12; i++) { var cl = P(a.x - 4.5 + i * 0.82, 3.6 - Math.abs(i - 5.5) * 0.12, a.z + 0.1); ctx.fillStyle = g.LIT.lit ? 'rgb(255,200,130)' : rgb(mulc(i % 2 ? [236, 228, 210] : [200, 60, 44], tint)); ctx.beginPath(); ctx.ellipse(cl.x, cl.y, 0.12 * k, 0.16 * k, 0, 0, TAU); ctx.fill(); if (g.LIT.lit) { ctx.globalCompositeOperation = 'lighter'; stamp(ctx, sprite('warm'), cl.x, cl.y, 0.9 * k, 0.9 * k, 0.4); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; } }
    var ring = a.folk.map(function (f2, j) { var an = j / a.folk.length * TAU + t * 0.12; return { f: f2, x: a.x + Math.cos(an) * 4.2, z: a.z + Math.sin(an) * 3.0, an: an }; }).sort(function (u, v) { return v.z - u.z; });
    ring.forEach(function (r) { var p = P(r.x, 0, r.z), beat = Math.sin(t * 2.4 + r.an * 2); figure(ctx, p.x, p.y, h, r.f, tint, { arms: [[-2.2 + beat * 0.5, -1], [-0.9 - beat * 0.5, 1]] }); });
  } else if (a.kind === 'net') {
    f = a.folk[0]; f.child = true; var sw = Math.sin(t * 2.2 + f.ph), fg = figure(ctx, c.x, c.y, h, f, tint, { arms: [[-0.8 + sw * 0.6, 1]] });
    var ex = fg.hx + Math.cos(-0.9 + sw * 0.6) * h * 1.2, ey = fg.hy + h * 0.2 + Math.sin(-0.9 + sw * 0.6) * h * 1.2; ctx.strokeStyle = rgb(mulc([150, 120, 80], tint)); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(fg.hx, fg.hy + h * 0.25); ctx.lineTo(ex, ey); ctx.stroke(); ctx.strokeStyle = rgb(mulc([230, 230, 220], tint), 0.8); ctx.beginPath(); ctx.arc(ex, ey, h * 0.14, 0, TAU); ctx.stroke();
  } else if (a.kind === 'uchimizu') {
    f = a.folk[0]; var ph = (t * 0.6 + f.ph) % 1, swing = Math.sin(ph * TAU); figure(ctx, c.x, c.y, h, f, tint, { bend: 0.3, arms: [[0.4 + swing * 0.9, 1]] });
    ctx.fillStyle = rgb(mulc([110, 86, 60], tint)); ctx.fillRect(c.x - 0.5 * k, c.y - 0.35 * k, 0.3 * k, 0.35 * k);
    if (swing > 0.3) { ctx.fillStyle = 'rgba(220,234,246,0.7)'; for (i = 0; i < 9; i++) { var u = i / 9, sx = c.x + 0.4 * k + u * 1.6 * k, sy = c.y - 0.9 * k + u * u * 1.0 * k + Math.sin(i * 7.1) * 0.12 * k; ctx.beginPath(); ctx.arc(sx, sy, 0.05 * k + 0.3, 0, TAU); ctx.fill(); } }
  } else if (a.kind === 'harvest') {
    f = a.folk[0]; var cut = Math.sin(t * 2.6 + f.ph); figure(ctx, c.x, c.y, h, f, tint, { bend: 0.55, arms: [[1.0 + cut * 0.7, 1]] });
    ctx.fillStyle = rgb(mulc([214, 176, 80], tint)); ctx.beginPath(); ctx.ellipse(c.x - 0.6 * k, c.y - 0.15 * k, 0.25 * k, 0.12 * k, 0.4, 0, TAU); ctx.fill();
  } else if (a.kind === 'sweep') {
    f = a.folk[0]; var sw2 = Math.sin(t * 2.2 + f.ph); figure(ctx, c.x, c.y, h, f, tint, { bend: 0.25, arms: [[1.2 + sw2 * 0.5, 1]] });
    ctx.strokeStyle = rgb(mulc([150, 120, 70], tint)); ctx.lineWidth = Math.max(0.3, 0.05 * k); ctx.beginPath(); ctx.moveTo(c.x + 0.1 * k, c.y - 1.0 * k); ctx.lineTo(c.x + (0.5 + sw2 * 0.5) * k, c.y); ctx.stroke();
    ctx.fillStyle = 'rgba(244,248,252,0.6)'; for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(c.x + (0.6 + sw2 * 0.5 + i * 0.1) * k, c.y - (0.1 + (i % 3) * 0.08) * k, 0.06 * k + 0.2, 0, TAU); ctx.fill(); }
  } else if (a.kind === 'mochi') {
    // the usu (mortar), one pounding with the kine, one turning the rice
    ctx.fillStyle = rgb(mulc([120, 90, 60], tint)); ctx.beginPath(); ctx.ellipse(c.x, c.y - 0.3 * k, 0.4 * k, 0.3 * k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(mulc([246, 244, 236], tint)); ctx.beginPath(); ctx.ellipse(c.x, c.y - 0.55 * k, 0.28 * k, 0.1 * k, 0, 0, TAU); ctx.fill();
    var beat = Math.abs(Math.sin(t * 2.4)), p1 = P(a.x - 1.0, 0, a.z), p2 = P(a.x + 0.9, 0, a.z + 0.2), up = beat;
    var fg1 = figure(ctx, p1.x, p1.y, h, a.folk[0], tint, { bend: 0.15 * (1 - up), arms: [[-1.4 + (1 - up) * 1.6, 1]] });
    var mx = fg1.hx + Math.cos(-1.4 + (1 - up) * 1.6) * h * 0.45, my = fg1.hy + h * 0.22 + Math.sin(-1.4 + (1 - up) * 1.6) * h * 0.45; ctx.strokeStyle = rgb(mulc([150, 116, 80], tint)); ctx.lineWidth = Math.max(0.5, 0.12 * k); ctx.beginPath(); ctx.moveTo(fg1.hx, fg1.hy + h * 0.25); ctx.lineTo(mx, my); ctx.stroke();
    figure(ctx, p2.x, p2.y, h, a.folk[1], tint, { pose: 'sit', arms: [[2.6 - up * 0.4, -1]] });
  } else if (a.kind === 'pray') {
    for (i = 0; i < a.folk.length; i++) { f = a.folk[i]; var col = i % 3, row = (i / 3) | 0, q2 = P(a.x + (col - 1) * 0.9 + row * 0.3, 0, a.z - row * 1.1); figure(ctx, q2.x, q2.y, h, f, tint, { bend: 0.12 + 0.08 * Math.sin(t * 0.5 + f.ph), arms: [[-1.2, 0.2], [-1.25, -0.2]] }); }
  } else if (a.kind === 'play') {
    for (i = 0; i < a.folk.length; i++) { f = a.folk[i]; var an2 = t * 1.1 + i * TAU / a.folk.length, px2 = a.x + Math.cos(an2) * 1.6, pz2 = a.z + Math.sin(an2) * 1.1, p3 = P(px2, Math.abs(Math.sin(t * 7 + i)) * 0.12, pz2); figure(ctx, p3.x, p3.y, h, f, tint, { arms: [[-0.6 + Math.sin(t * 7 + i) * 0.8, 1], [-2.5 - Math.sin(t * 7 + i) * 0.8, -1]] }); }
  }
}
function stall(ctx, g, a, col, t) {   // a small stall: a counter, a cloth awning and a lantern
  var tint = g.tint, c = P(a.x, 0, a.z), k = c.k, lit = g.LIT.lit;
  ctx.fillStyle = rgb(mulc([120, 92, 64], tint)); ctx.fillRect(c.x - 0.8 * k, c.y - 0.75 * k, 1.6 * k, 0.75 * k);
  ctx.strokeStyle = rgb(mulc([90, 70, 50], tint)); ctx.lineWidth = Math.max(0.3, 0.05 * k); ctx.beginPath(); ctx.moveTo(c.x - 0.75 * k, c.y - 0.75 * k); ctx.lineTo(c.x - 0.75 * k, c.y - 1.9 * k); ctx.moveTo(c.x + 0.75 * k, c.y - 0.75 * k); ctx.lineTo(c.x + 0.75 * k, c.y - 1.9 * k); ctx.stroke();
  ctx.fillStyle = rgb(mulc(col, tint)); ctx.beginPath(); ctx.moveTo(c.x - 0.95 * k, c.y - 1.75 * k); ctx.lineTo(c.x + 0.95 * k, c.y - 1.75 * k); ctx.lineTo(c.x + 0.8 * k, c.y - 2.05 * k); ctx.lineTo(c.x - 0.8 * k, c.y - 2.05 * k); ctx.closePath(); ctx.fill();
  var lp = { x: c.x + 0.7 * k, y: c.y - 1.55 * k }; ctx.fillStyle = lit ? 'rgb(255,206,140)' : rgb(mulc([236, 228, 210], tint)); ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 0.13 * k, 0.18 * k, 0, 0, TAU); ctx.fill();
  if (lit) { ctx.globalCompositeOperation = 'lighter'; stamp(ctx, sprite('warm'), lp.x, lp.y, 1.4 * k, 1.4 * k, 0.5 * (0.85 + 0.15 * Math.sin(t * 5 + a.x))); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
}

/* ---- 08j_sway.js ---- */
/* ================= trees in a gale (overlay) =================
   Each baked tree is a damped spring driven by the shared wind: a lean downwind, turbulence of its own,
   and the gusts arriving a little later the further downwind it stands. Every frame the tree is covered with its
   patch (the town behind it) and its sprite is redrawn in horizontal strips, each sheared so the bend is
   continuous and rooted at the base; then whatever stands in front of it is cut back out. */
function makeSwayFx(sw, g, layer) {
  var fvW = layer.width, fvH = layer.height;
  var s = fvW / sw.bw, rng = mulberry32(4242), gain = SWAY_WX[g.wx] || 0, U = [1e9, 1e9, -1e9, -1e9];
  var trees = sw.meta.map(function (m, i) {
    var K = SWAY_KIND[m.k] || SWAY_KIND.broad, hl = m.hp / (sw.bw / g.W);   // height in scene units (~ screen size)
    var f = K.f * (0.85 + rng() * 0.3) * clamp(Math.sqrt(40 / Math.max(8, hl)), 0.7, 1.5);
    U[0] = Math.min(U[0], (m.b[0] - m.mg) * s); U[1] = Math.min(U[1], (m.b[1] - m.mg) * s); U[2] = Math.max(U[2], (m.b[2] + m.mg) * s); U[3] = Math.max(U[3], m.b[3] * s);
    return { m: m, K: K, w: Math.PI * 2 * f, z: 0.2 + rng() * 0.08, x: null, v: 0, y: 0, vy: 0, wf: Math.PI * 2 * (0.9 + rng() * 0.4), seed: (m.seed * 7919 + 13) >>> 0, ph: rng() * TAU, lx: m.cx / sw.bw * g.W };
  });
  U = [Math.max(0, Math.floor(U[0]) - 2), Math.max(0, Math.floor(U[1]) - 2), Math.min(fvW, Math.ceil(U[2]) + 2), Math.min(fvH, Math.ceil(U[3]) + 2)];
  return { A: sw.atlas, s: s, trees: trees, gain: gain, layer: layer, U: U, gust: null, t: 0, dirty: true, shown: false, hz: 15, W: g.W };
}
function swayGustAt(S, t) {
  var G = S.gust; if (!G) return 1;
  var u = (t - G.t0) / G.dur; return u > 0 && u < 1 ? 1 + ((G.K || 2.5) - 1) * Math.pow(Math.sin(Math.PI * u), 2) : 1;
}
function stepSway(S, g, dt, t, gust) {
  if (gust && gust !== S.gust) S.gust = gust;
  var Wd = g.wind0 || gWind(g), sign = Wd.h >= 0 ? 1 : -1, h0 = g.wx === 'storm' ? Wd.h : sign * Math.max(Math.abs(Wd.h), 0.8), n = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / n;
  for (var i = 0; i < S.trees.length; i++) {
    var T = S.trees[i], K = T.K, up = sign > 0 ? T.lx : S.W - T.lx, td = t - up / 150;   // a gust front sweeps downwind
    var turb = 0.42 * windNoise(T.seed, td * 0.55) + 0.26 * windNoise(T.seed + 7, td * 1.6) + 0.32 * windNoise(99, td * 0.35);   // its own buffeting + the town's
    var push = h0 * (1 + turb) * swayGustAt(S, td), tgt, tgtF = 0;
    if (T.m.k === 'willow') { tgt = K.amp * (push - h0); tgtF = 0.15 * (push - h0 * 0.6) + 0.04 * windNoise(T.seed + 3, td * 2.3) * sign; }   // the painting already leans with the day's wind
    else tgt = K.max * Math.tanh(K.amp * push / K.max);
    tgt *= S.gain; tgtF *= S.gain;
    if (T.x === null) { T.x = tgt; T.y = tgtF; }
    for (var k = 0; k < n; k++) {
      T.v += (T.w * T.w * (tgt - T.x) - 2 * T.z * T.w * T.v) * h; T.x += T.v * h;
      T.vy += (T.wf * T.wf * (tgtF - T.y) - 2 * 0.14 * T.wf * T.vy) * h; T.y += T.vy * h;
    }
  }
  S.t = t; S.acc = (S.acc || 0) + dt; if (S.acc >= 1 / S.hz - 0.004) { S.acc = 0; S.dirty = true; }   // redrawn at ~15 Hz (less on a slow device)
}
/* draw one sprite (atlas slot `slot`) through a displacement field fn(hfrac, y) -> [dx, dy] (painting px), straight into the layer */
function swayStrips(x, S, m, slot, rows, fn, nS) {
  var s = S.s, b = m.b, w = b[2] - b[0], h = b[3] - b[1], step = h / nS;
  for (var i = 0; i < nS; i++) {
    var ya = b[1] + i * step, yb = i === nS - 1 ? b[3] : b[1] + (i + 1) * step + 1, hh = yb - ya;
    var da = fn(clamp((m.by - ya) / m.hp), ya), db = fn(clamp((m.by - yb) / m.hp), yb);
    var c1 = -(da[0] - db[0]) / hh, c0 = db[0] + (da[0] - db[0]) * yb / hh, e1 = -(da[1] - db[1]) / hh, e0 = db[1] + (da[1] - db[1]) * yb / hh;
    // painting (X, Y) -> (X + c1 Y + c0, Y (1 + e1) + e0): a shear per strip, continuous from strip to strip
    x.setTransform(s, 0, s * c1, s * (1 + e1), s * c0, s * e0);
    var x0 = 0, x1 = w;
    if (rows) { x0 = 1e9; x1 = -1; for (var r = Math.floor((ya - b[1]) / 8); r <= Math.min(rows.length - 1, Math.floor((yb - b[1] - 0.01) / 8)); r++) { if (rows[r][1] > rows[r][0]) { x0 = Math.min(x0, rows[r][0]); x1 = Math.max(x1, rows[r][1]); } } if (x1 < 0) continue; }
    x.drawImage(S.A, slot[0] + x0, slot[1] + (ya - b[1]), x1 - x0, hh, b[0] + x0, ya, x1 - x0, hh);
  }
}
/* the layer, tree by tree from far to near: the tree bent, then whatever stands in front of it punched out.
   While the trees move, the painting canvas underneath shows the town without them (the patches, baked in once),
   so a punched hole shows exactly the nearer thing. */
function swayPatchBase(x, S, on) {   // x: the painting canvas at its own resolution
  for (var i = 0; i < S.trees.length; i++) { var M = S.trees[i].m, bw = M.b[2] - M.b[0], bh = M.b[3] - M.b[1]; x.drawImage(S.A, M.p[0], M.p[1], bw, bh, M.b[0], M.b[1], bw, bh); }
}
function drawSwayLayer(S) {
  var t0 = now(), L = S.layer, x = L.getContext('2d'), s = S.s, U = S.U, i, t = S.t;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(U[0], U[1], U[2] - U[0], U[3] - U[1]);
  for (i = 0; i < S.trees.length; i++) {
    var T = S.trees[i], M = T.m, mg = M.mg, lim = mg - 2, bw = M.b[2] - M.b[0], bh = M.b[3] - M.b[1];
    x.globalCompositeOperation = 'source-over';
    if (S.prof && S.prof.noTree) continue;
    var hp = M.hp, X = T.x || 0, Y = T.y, ph = T.ph, nS = clamp(Math.round(bh * s / 10), 4, 12);
    if (M.k === 'willow') {
      // the fronds stream out from the crown, the tips most, rising as they go; ripples run down them
      swayStrips(x, S, M, M.s, M.rs, function (hf, y) { var lo = Math.pow(1 - hf, 0.8), dx = hp * (X * Math.pow(hf, 1.4) + Y * lo + 0.012 * lo * Math.sin(y / (hp * 0.2) * TAU - t * 9.5 + ph)); return [clamp(dx, -lim, lim), -hp * 0.3 * Math.abs(Y) * Math.pow(1 - hf, 1.5)]; }, 14);
      if (M.w) swayStrips(x, S, M, M.w, M.rw, function (hf) { return [clamp(hp * X * Math.pow(hf, 1.6), -lim, lim), 0]; }, nS);
    } else {
      var fl = M.k === 'broad' ? 0.005 : 0.0025;
      swayStrips(x, S, M, M.s, M.rs, function (hf, y) { var dx = hp * (X * Math.pow(hf, 1.5) + fl * hf * Math.sin(t * 10.5 + y / (hp * 0.35) * TAU + ph)); return [clamp(dx, -lim, lim), hp * 0.5 * X * X * hf * hf]; }, nS);
    }
    if (M.mb && !(S.prof && S.prof.noMask)) { var mb = M.mb, mx = M.b[0] - mg + mb[0], my = M.b[1] - mg + mb[1]; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; x.drawImage(S.A, M.m[0] + mb[0], M.m[1] + mb[1], mb[2], mb[3], mx * s, my * s, mb[2] * s, mb[3] * s); }
  }
  x.globalCompositeOperation = 'source-over'; x.setTransform(1, 0, 0, 1, 0, 0);
  S.dirty = false; S.shown = true;
  var ms = now() - t0; S.ms = S.ms === undefined ? ms : S.ms * 0.9 + ms * 0.1; S.hz = S.ms > 14 ? 7.5 : S.ms > 8 ? 10 : 15;
}
function clearSway(S) { if (!S.shown) return; var U = S.U, x = S.layer.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(U[0], U[1], U[2] - U[0], U[3] - U[1]); S.shown = false; S.dirty = true; }

/* ---- 09_runtime.js ---- */
/* ================= public API & controller ================= */
var VERSION = '1.1.0';
var SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'], LIGHT_KEYS = ['morning', 'day', 'dusk', 'night'];
var WEATHERS = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'typhoon', 'blizzard'];
var EVENTS = ['shogatsu', 'setsubun', 'hinamatsuri', 'kodomo', 'tanabata', 'obon', 'tsukimi'];
function withScene(o, fn) {
  var st = saveState();
  try { setupScene(o); return fn(); } finally { restoreState(st); }
}
/* normalized 0..1 focus of a stage for a frame of logical size w x h */
function focusFor(i, w, h) {
  return withScene({ W: w, H: h, KS: 1, stage: i, season: 'autumn', light: 'day' }, function () {
    var d = stageFocus(STAGE_DEFS[i][3]), p = P(d[0], d[1], d[2]), x = p.x, y = p.y;
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
      var rq = indexedDB.open('mogi-town', 1);
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
  var o = { stage: 0, season: seasonFor(), light: lightFor(), quality: 'card', animate: true, event: null, date: null };
  function merge(n) { if (!n) return; ['stage', 'season', 'light', 'quality', 'animate', 'onReady', 'event', 'onCue', 'date', 'weather', 'fireworks', 'wide'].forEach(function (k) { if (n[k] !== undefined) o[k] = n[k]; }); if (n.date !== undefined) dateSetAt = Date.now(); norm(); }
  function norm() {
    o.stage = Math.max(0, Math.min(STAGES.length - 1, Math.round(+o.stage || 0)));
    if (SEASON_KEYS.indexOf(o.season) < 0) o.season = seasonFor();
    if (LIGHT_KEYS.indexOf(o.light) < 0) o.light = lightFor();
    if (o.quality !== 'full') o.quality = 'card';
    if (EVENTS.indexOf(o.event) < 0) o.event = null;
    if (WEATHERS.indexOf(o.weather) < 0) o.weather = null;
    if (o.date !== null && !(o.date instanceof Date)) { var dd = new Date(o.date); o.date = isNaN(dd.getTime()) ? null : dd; }
  }
  var dateSetAt = Date.now();
  merge(opts);
  var dead = false, readyFired = false, user = { paused: false }, hidden = typeof document !== 'undefined' && document.hidden, onScreen = true;
  var stats = { source: null, ms: 0, history: [] };
  function mk(z) {
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;z-index:' + z + ';';
    return c;
  }
  var cv = mk(0), tv = mk(1), fv = mk(2), sv = mk(0);   // sv: trees bent by a gale, between the painting and the overlay
  var cs = getComputedStyle(el); if (cs.position === 'static') el.style.position = 'relative';
  el.insertBefore(fv, el.firstChild); el.insertBefore(tv, fv); el.insertBefore(sv, tv); el.insertBefore(cv, sv);
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
    var ev = so.event === undefined ? o.event : so.event, sp = seasonStep(so.date === undefined ? o.date : so.date, so.season), wsign = windVec(windAt(nowDate())).sign, wxs = curWeather();
    return { key: [VERSION, so.stage, so.season, so.light, ev || '-', sp === null ? '-' : 'p' + sp, wsign > 0 ? 'wR' : 'wL', wxs.wx + (wxs.after ? '+a' : '') + (swayWanted(wxs.wx) ? '~s1' : ''), qn, bw + 'x' + bh + (wk > 1 ? '|w' + wk : '')].join('|'), stage: so.stage, season: so.season, light: so.light, event: ev || null, sp: sp, wsign: wsign, wx: wxs.wx, after: wxs.after, W: Wl, H: Hl, KS: ks, DQ: dq, bw: bw, bh: bh, q: qn };
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
      var oc = rec.occ || [], sw = rec.sway && rec.sway.atlas ? rec.sway : null;
      return Promise.all([blobToCanvas(rec.img), blobToCanvas(rec.mask), blobToCanvas(rec.clouds), blobToCanvas(rec.sky), sw ? blobToCanvas(sw.atlas) : null].concat(oc.map(blobToCanvas))).then(function (a) {
        if (!a[0] || a[0].width !== spec.bw) return null;
        return { img: a[0], mask: a[1], clouds: a[2], sky: a[3], occ: a.slice(5), glows: rec.glows || [], sway: sw && a[4] ? { atlas: a[4], meta: sw.meta, bw: sw.bw } : null, src: 'cache' };
      }).catch(function () { return null; });
    }).then(function (got) {
      if (got) return got;
      if (J.cancelled) throw CANCEL;
      return enqueue(function () {
        if (J.cancelled || dead) throw CANCEL;
        return renderStatic({ stage: spec.stage, season: spec.season, light: spec.light, event: spec.event, sp: spec.sp, wsign: spec.wsign, wx: spec.wx, after: spec.after, W: spec.W, H: spec.H, KS: spec.KS, DQ: spec.DQ, bw: spec.bw, bh: spec.bh, get cancelled() { return J.cancelled || dead; } }).then(function (r) {
          var res = { img: r.canvas, mask: r.mask, clouds: r.clouds, sky: r.sky, occ: r.occ, glows: r.glows.map(function (g) { return { x: g.x, y: g.y, r: g.r, a: g.a }; }), sway: r.sway, src: 'paint' };
          // store in the background
          setTimeout(function () {
            Promise.all([toBlob(r.canvas, 'image/jpeg', 0.92), r.mask ? toBlob(r.mask, 'image/png') : null, r.clouds ? toBlob(r.clouds, 'image/png') : null, r.sky ? toBlob(r.sky, 'image/png') : null, r.sway ? toBlob(r.sway.atlas, 'image/png') : null].concat(r.occ.map(function (c) { return c ? toBlob(c, 'image/png') : null; }))).then(function (b) {
              if (b[0]) return cachePut(spec.key, { img: b[0], mask: b[1], clouds: b[2], sky: b[3], occ: b.slice(5), glows: res.glows, sway: r.sway && b[4] ? { atlas: b[4], meta: r.sway.meta, bw: r.sway.bw } : null, t: Date.now(), v: VERSION });
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
    return withScene({ W: sp.W, H: sp.H, KS: sp.KS, stage: sp.stage, season: sp.season, light: sp.light, event: sp.event, sp: sp.sp, wx: sp.wx, after: sp.after, wsign: sp.wsign }, function () { var g = animGeo(sp); g.glows = res.glows || []; g.water = waterGrid(res.mask, g); return g; });
  }
  function waterGrid(mask, g) {
    if (!mask || (g.season !== 'spring' && !wxWet(g.wx))) return null;
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
      if (cvBg) swayBase(false);   // the crossfade starts from the whole painting
      sizeCanvas(tv, Math.min(cv.width, ovW()), Math.min(cv.height, ovH())); var tx = tv.getContext('2d'); tx.globalCompositeOperation = 'source-over'; tx.drawImage(cv, 0, 0, tv.width, tv.height);
      tv.style.transition = 'none'; tv.style.opacity = '1';
    }
    sizeCanvas(cv, res.spec.bw, res.spec.bh);
    cv.getContext('2d').drawImage(res.img, 0, 0); cvBg = false;
    // keep a water / occluder mask at the overlay layer size
    cur = { spec: res.spec, img: res.img, mask: res.mask, clouds: res.clouds, sky: res.sky, occ: res.occ, glows: res.glows, sway: res.sway || null, geo: makeGeo(res) };
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
  var wl = null, bl = null, fallers = [], petals = null, frng = mulberry32(99), bird = null, clock = 0, lastTs = 0, raf = 0;
  var cues = { last: -99, next: {}, gust: null, rings: [] }, leafGust = null, wfx = null, swayFx = null, lightning = null, wxCheck = 0, FW = null, dflies = null, bflies = null, rare = null, rareRoll = 0;
  var RARE_P = 0.065;
  /* the shared wind, from the given date moving on with real time */
  function fwWanted() { return o.fireworks === true || o.fireworks === false ? o.fireworks : fireworksAt(nowDate()); }
  function fwFinale() { if (o.fireworks === true && !o.date) return (clock % 150) > 126; var d = nowDate(), m = d.getHours() * 60 + d.getMinutes(); return m >= 20 * 60 + 38; }
  function setupFireworks(g) {
    g.fwOn = fwWanted();
    if (!g.fwOn) { FW = null; g.FW = null; return; }
    g.fw = { launch: fwLaunchPts(g), boatPa: boatPath() }; FW = g.FW = initFireworks(g, frng); FW.next = clock + 0.5;
    if (!g.specAdded) { g.specAdded = true; var rng = mulberry32(4711); g.paths.forEach(function (q, pi) { if (!q.still) return; var n = pi === g.paths.length - 3 ? 12 : 8; for (var i = 0; i < n; i++) g.walkers.push(makeWalker(g, pi, rng, i)); }); }
  }
  function curWeather() { if (o.weather) return { wx: o.weather, after: (o.weather === 'clear' || o.weather === 'cloudy') && afterRainAt(nowDate()) }; var d = nowDate(); return { wx: weatherAt(d), after: afterRainAt(d) }; }
  function nowDate() { return new Date(o.date ? o.date.getTime() + (Date.now() - dateSetAt) : Date.now()); }
  var windRaw = null, windT = -99;
  function gustK() {
    var k = 1;
    function env(t0, dur, K) { var u = (clock - t0) / dur; return u > 0 && u < 1 ? 1 + (K - 1) * Math.pow(Math.sin(Math.PI * u), 2) : 1; }
    if (petals && petals.gust) k = Math.max(k, env(petals.gust.t0, petals.gust.dur, petals.gust.K || 2.5));
    if (leafGust) k = Math.max(k, env(leafGust.t0, leafGust.dur, leafGust.K || 2.5));
    if (cues.gust) k = Math.max(k, env(cues.gust.t0, cues.gust.dur, cues.gust.K || 2.5));
    return k;
  }
  function updateWind(force) {
    if (!cur) return;
    if (force || !windRaw || clock - windT > 1) { windRaw = windAt(nowDate()); windT = clock; }
    cur.geo.wind0 = windVec(windRaw, 1); cur.geo.wind = windVec(windRaw, gustK());
  }
  function setupFx() {
    sizeCanvas(fv, ovW(), ovH());
    var g = cur.geo; g.date = nowDate(); updateWind(true);
    if (cur.mask) { wl = wl || mkCanvas(2, 2); sizeCanvas(wl, cur.mask.width, cur.mask.height); } else wl = null;
    bl = bl || mkCanvas(2, 2); sizeCanvas(bl, fv.width, fv.height);
    fallers = g.fallers ? initFallers(g, frng) : [];
    var prog = seasonProgress(o.date, g.season), sst = g.season === 'spring' ? sakuraState(prog) : null;
    petals = sst && sst.fall > 0.01 ? makePetals(g, frng, sst.fall, clock, sst.bloom) : null;
    if (g.fallers === 'leaf') { g.nFall = leafCount(prog); fallers = initFallers(g, frng); }
    leafGust = null;
    wfx = initWeatherFx(g, frng); lightning = null; setupFireworks(g);
    swayFx = null; sizeCanvas(sv, 1, 1); sv.getContext('2d').clearRect(0, 0, 1, 1);
    try { if (cur.sway && cur.sway.meta.length) { sizeCanvas(sv, fv.width, fv.height); sv.getContext('2d').clearRect(0, 0, sv.width, sv.height); swayFx = makeSwayFx(cur.sway, g, sv); } } catch (e) { swayFx = null; if (window.console) console.error(e); }
    if (cur.spec.after && g.season === 'summer' && g.light === 'day') setTimeout(function () { if (!dead) cue('rainbow', null, true); }, 0);   // a faint rainbow is in the sky
    g.life = withScene({ W: cur.spec.W, H: cur.spec.H, KS: cur.spec.KS, stage: cur.spec.stage, season: cur.spec.season, light: cur.spec.light, event: cur.spec.event }, function () { return lifeScenes(g, nowDate(), mulberry32(31 + cur.spec.stage)); });
    g.I = withScene({ W: cur.spec.W, H: cur.spec.H, KS: cur.spec.KS, stage: cur.spec.stage, season: cur.spec.season, light: cur.spec.light, event: cur.spec.event, sp: cur.spec.sp, wx: cur.spec.wx, wsign: cur.spec.wsign }, function () { return initInteract(g); }); cues.next.thunder = clock + 6 + frng() * 14;
    if (g.wx !== 'clear' && g.wx !== 'cloudy') { dflies = bflies = null; }
    else dflies = withScene({ W: cur.spec.W, H: cur.spec.H, KS: cur.spec.KS, stage: cur.spec.stage, season: cur.spec.season, light: cur.spec.light, event: cur.spec.event }, function () { return initDragonflies(g, frng); });
    if (g.wx === 'clear' || g.wx === 'cloudy') bflies = withScene({ W: cur.spec.W, H: cur.spec.H, KS: cur.spec.KS, stage: cur.spec.stage, season: cur.spec.season, light: cur.spec.light, event: cur.spec.event }, function () { return initButterflies(g, frng); });
    if (!bird || bird.season !== cur.spec.season || bird.light !== cur.spec.light) bird = { next: clock + 4 + frng() * 6, season: cur.spec.season, light: cur.spec.light };
    rare = null; rareRoll = clock + 20 + frng() * 20;
    cues.next = { bell: clock + 6 + frng() * 6, wheel: clock + 9 + frng() * 10, splash: clock + 12 + frng() * 14, gust: clock + 35 + frng() * 35, thunder: clock + 6 + frng() * 14 };
    if (g.wx === 'typhoon' || g.wx === 'blizzard') cues.next.gust = clock + 2 + frng() * 4;   // a gale: the first gust soon
  }
  /* ---- sound cues: a gentle rhythm, never two within a few seconds ---- */
  function cue(name, info, force) {
    if (!force && clock - cues.last < 4.5) return false;
    if (!force) cues.last = clock;
    if (typeof o.onCue !== 'function') return true;   // the scene goes on without sound
    try { if (info) o.onCue(name, info); else o.onCue(name); } catch (e) { if (window.console) console.error(e); }
    return true;
  }
  function tickCues() {
    var g = cur.geo, n = cues.next;
    if (g.stage >= 14 && g.light === 'dusk' && clock > n.bell) { if (cue('bell')) n.bell = clock + 55 + frng() * 10; else n.bell = clock + 2; }
    if (g.F.mill && clock > n.wheel) { if (cue('wheel')) n.wheel = clock + 24 + frng() * 22; else n.wheel = clock + 3; }
    if (clock > n.splash && (g.wx === 'clear' || g.wx === 'cloudy' || g.wx === 'rain')) {
      if (cue('splash')) { // a fish rises somewhere on the river: draw its rings
        var rp = RIVER_S[(frng() * RIVER_S.length) | 0], x = rp[0] + (frng() - 0.5) * 6, z = rp[1] + (frng() - 0.5) * 6;
        if (riverD(x, z) < -1.5 && !g.SEA.snow) cues.rings.push({ x: x, z: z, t0: clock });
        n.splash = clock + 18 + frng() * 26;
      } else n.splash = clock + 3;
    }
    if ((g.wx === 'storm' || g.wx === 'typhoon') && clock > n.thunder) {
      if (g.wx === 'storm' || frng() < 0.5) { lightning = { t0: clock, bolt: makeBolt(g, frng) }; cue('thunder', { delay: Math.round((1 + frng() * 3) * 100) / 100 }, true); }
      n.thunder = clock + (g.wx === 'storm' ? 20 + frng() * 40 : 40 + frng() * 50);
    }
    if (g.wx === 'typhoon' && clock > n.gust) { if (cue('gust', null, true)) { cues.gust = { t0: clock, dur: 3 + frng() * 2, K: 2 + frng() }; n.gust = clock + 8 + frng() * 7; } else n.gust = clock + 2; }
    else if (g.wx === 'blizzard' && clock > n.gust) { if (cue('gust', null, true)) { cues.gust = { t0: clock, dur: 4, K: 2 + frng() }; n.gust = clock + 14 + frng() * 12; } else n.gust = clock + 2; }
    else if (clock > n.gust && g.season !== 'spring') {
      if (g.season === 'autumn') { if (!leafGust && cue('gust', null, true)) { leafGust = makeLeafGust(g, frng, clock); n.gust = clock + 35 + frng() * 35; } else n.gust = clock + 3; }
      else if (cue('gust', null, true)) { cues.gust = { t0: clock, dur: 4, K: 2 + frng() }; n.gust = clock + 45 + frng() * 30; } else n.gust = clock + 3;
    }
  }
  /* the calendar moved within the same painting: more or fewer petals and leaves in the air */
  function seasonAmounts() {
    var g = cur.geo, prog = seasonProgress(o.date, g.season);
    if (petals && g.season === 'spring') { var st = sakuraState(prog); petals.bloom = st.bloom; setPetalAmount(petals, st.fall); }
    g.life = withScene({ W: g.W, H: g.H, KS: g.KS, stage: g.stage, season: g.season, light: g.light, event: cur.spec.event }, function () { return lifeScenes(g, nowDate(), mulberry32(31 + g.stage)); });
    if (g.fallers === 'leaf') { var n = leafCount(prog); while (fallers.length > n) fallers.pop(); while (fallers.length < n) fallers.push(spawnFaller(g, frng, true)); }
  }
  function startRare(def) {
    if (!cur) return false;
    var sp = cur.spec;
    rare = withScene({ W: sp.W, H: sp.H, KS: sp.KS, stage: sp.stage, season: sp.season, light: sp.light, event: sp.event }, function () { var a = rareAnchor(def); return { def: def, t0: clock, st: def.setup(), band: a.band, key: a.key }; });
    cur.geo.rareNow = def.id === 'tsubame' || def.id === 'nishikigoi' ? null : rare;
    cues.last = clock; cue('rare', { id: def.id, name: def.name }, true);
    return true;
  }
  /* ---- one overlay frame ---- */
  var reveal = null, dbgSwayOnly = false, dbgSway = null, cvBg = false;
  function swayBase(on) {   // the painting canvas: the whole painting, or (trees moving) the town without the swaying trees
    if (!cur || cvBg === on) return;
    var x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.drawImage(cur.img, 0, 0);
    if (on && swayFx) swayPatchBase(x, swayFx);
    cvBg = on;
  }
  function drawFrame(still) {
    if (!cur || dead) return;
    var g = cur.geo, t = clock, ctx = fv.getContext('2d'), sc = fv.width / g.W;
    var st = saveState();
    try {
      W = g.W; H = g.H; CAM = g.cam; KS = g.KS; MODE = 'n'; F = g.F; SEA = g.SEA; LIT = g.LIT; setLight(LIT);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, fv.width, fv.height);
      var motion = !still;
      if (dbgSwayOnly) { if (swayFx && motion) { if (swayFx.dirty) drawSwayLayer(swayFx); swayBase(true); } return; }
      drawCloudLayer(ctx, g);
      if (g.tsukimi && cur.clouds && (g.wx === 'clear' || g.wx === 'cloudy')) drawSkyMasked(ctx, g, function (c) { drawMoonAt(c, true, g.light === 'night'); });   // the harvest moon stays clear of the clouds
      // water: shimmer, the boat's reflection, the moon's path, rings, floating petals; cut to visible water
      if (wl && motion) {
        var wx = wl.getContext('2d'), ws = wl.width / g.W;
        wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'source-over'; wx.clearRect(0, 0, wl.width, wl.height);
        wx.setTransform(ws, 0, 0, ws, 0, 0); drawWaterLayer(wx, g, t); drawRings(wx, g, t); drawWaterRain(wx, g, wfx, t); if (FW) drawFireworkReflections(wx, g, FW, t); if (g.I) drawInteractWater(wx, g, g.I, t); if (petals) drawFloatPetals(wx, petals, g, ws);
        wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'destination-in'; wx.drawImage(cur.mask, 0, 0); wx.globalCompositeOperation = 'source-over';
        ctx.drawImage(wl, 0, 0, fv.width, fv.height);
      }
      if (swayFx && motion) { if (swayFx.dirty) drawSwayLayer(swayFx); swayBase(true); } else { if (swayFx) clearSway(swayFx); swayBase(false); }   // trees bent by a gale: their own canvas, redrawn when they moved
      // the depth bands, far to near, each cut by what stands in front of it
      var bx = bl.getContext('2d');
      for (var band = NBANDS - 1; band >= 0; band--) {
        var bb = g.bandBox[band]; if (!bb) continue;
        var x0 = Math.max(0, Math.floor(bb[0] * sc)), y0 = Math.max(0, Math.floor(bb[1] * sc)), x1 = Math.min(bl.width, Math.ceil(bb[2] * sc)), y1 = Math.min(bl.height, Math.ceil(bb[3] * sc));
        if (x1 <= x0 || y1 <= y0) continue;
        bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over'; bx.clearRect(x0, y0, x1 - x0, y1 - y0);
        bx.save(); bx.beginPath(); bx.rect(x0, y0, x1 - x0, y1 - y0); bx.clip(); bx.setTransform(sc, 0, 0, sc, 0, 0);
        var n = drawBand(bx, g, band, t, still);
        bx.restore();
        if (!n) continue;
        var oc = cur.occ && cur.occ[band];
        if (oc) { var ks2 = oc.width / bl.width; bx.globalCompositeOperation = 'destination-out'; bx.drawImage(oc, x0 * ks2, y0 * ks2, (x1 - x0) * ks2, (y1 - y0) * ks2, x0, y0, x1 - x0, y1 - y0); bx.globalCompositeOperation = 'source-over'; }
        ctx.drawImage(bl, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      if (motion) {
        drawSmoke(ctx, g, t);
        drawMist(ctx, g, t);
        drawFlicker(ctx, g, t);
        drawFlies(ctx, g, t);
        drawFallers(ctx, fallers, g);
        if (leafGust) drawLeafGust(ctx, leafGust, g);
        if (petals) drawPetals(ctx, petals, g, sc);
        if (dflies) drawDragonflies(ctx, g, dflies, t);
        if (bflies) drawButterflies(ctx, g, bflies, t);
        if (bird && bird.cur) drawFlock(ctx, g, bird.cur, t);
        if (rare && !g.rareNow) rare.def.draw(ctx, g, rare.st, clamp((t - rare.t0) / rare.def.dur), t);
        if (g.I) drawInteract(ctx, g, g.I, t);
        if (FW) drawFireworks(ctx, g, FW, t);
        if (wfx) { var wdt = Math.min(0.1, Math.max(0, t - (wfx.lt || t))); drawWeatherFx(ctx, g, wfx, t, wdt); wfx.lt = t; if (wfx.bz) drawBlizzard(ctx, g, wfx.bz, t, wdt); }
        if (lightning) { if (!drawLightningFlash(ctx, g, lightning, t)) lightning = null; else drawSkyMasked(ctx, g, function (c) { drawLightning(c, g, lightning, t); }); }
      }
      if (reveal) drawReveal(ctx, g);
    } catch (e) { if (window.console) console.error(e); }
    finally { restoreState(st); }
  }
  var cloudTmp = null, cloudX = (Date.now() / 1000 * 0.4) % 800;
  function drawCloudLayer(ctx, g) {
    if (!cur.clouds || !cur.sky) return;
    var cw = fv.width, ch = Math.round(fv.height * 0.62), span = cw * 2;
    cloudTmp = cloudTmp || mkCanvas(2, 2); sizeCanvas(cloudTmp, cw, ch);
    var cx = cloudTmp.getContext('2d'); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, cw, ch);
    var off = (((cloudX / g.W) * cw) % span + span) % span, sh = ch;
    cx.drawImage(cur.clouds, off - span, 0, span, sh); cx.drawImage(cur.clouds, off, 0, span, sh);
    cx.globalCompositeOperation = 'destination-in'; cx.drawImage(cur.sky, 0, 0, cw, ch); cx.globalCompositeOperation = 'source-over';
    ctx.drawImage(cloudTmp, 0, 0);
  }
  var skyTmp = null;
  function drawSkyMasked(ctx, g, fn) {   // draw something that belongs to the sky: hidden by the ranges, hills and town
    if (!cur.sky) { fn(ctx); return; }
    var cw = fv.width, ch = Math.round(fv.height * 0.62), sc = cw / g.W;
    skyTmp = skyTmp || mkCanvas(2, 2); sizeCanvas(skyTmp, cw, ch);
    var x = skyTmp.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cw, ch);
    x.setTransform(sc, 0, 0, sc, 0, 0); fn(x); x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(cur.sky, 0, 0, cw, ch); x.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(skyTmp, 0, 0); ctx.restore();
  }
  function drawRings(ctx, g, t) {
    for (var i = cues.rings.length - 1; i >= 0; i--) {
      var r = cues.rings[i], age = t - r.t0; if (age > 3.2) { cues.rings.splice(i, 1); continue; }
      var c = P(r.x, WL, r.z), rr = (0.15 + age * 0.55) * c.k; ctx.strokeStyle = 'rgba(235,242,250,' + (0.45 * (1 - age / 3.2)) + ')'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke();
      if (age > 0.5) { ctx.beginPath(); ctx.ellipse(c.x, c.y, rr * 0.6, rr * 0.6 * g.cam.s * 1.05, 0, 0, TAU); ctx.stroke(); }
      if (age < 0.35) { ctx.fillStyle = 'rgba(240,246,250,0.8)'; for (var d = 0; d < 5; d++) { ctx.beginPath(); ctx.arc(c.x + (d - 2) * 0.3 * c.k, c.y - Math.sin(age / 0.35 * Math.PI) * 0.6 * c.k * (1 - Math.abs(d - 2) * 0.3), 0.4, 0, TAU); ctx.fill(); } }
    }
  }
  function tickFx(dt) {
    if (!cur) return;
    var g = cur.geo; updateWind(false);
    cloudX += dt * gWind(g).h * 1.3;
    stepWalkers(g, dt, frng);
    if (dflies) stepDragonflies(dflies, dt, frng);
    if (bflies) stepButterflies(bflies, dt, frng);
    if (fallers.length) stepFallers(fallers, g, dt, frng);
    if (leafGust && !stepLeafGust(leafGust, g, dt, clock, frng)) leafGust = null;
    if (g.I) stepInteract(g, g.I, dt, clock);
    if (swayFx) stepSway(swayFx, g, dt, clock, cues.gust);
    if (FW) stepFireworks(g, FW, dt, clock, frng, fwFinale(), function (S) { cue('firework', { delay: Math.round((0.8 + (1 - S.size) * 0.6 + frng() * 0.6) * 100) / 100, size: Math.round(S.size * 100) / 100, kind: S.kind }, true); });
    if (cues.gust && clock > cues.gust.t0 + cues.gust.dur) cues.gust = null;
    if (petals) { var hadG = !!petals.gust; stepPetals(petals, g, dt, clock, frng); if (!hadG && petals.gust) cue('gust', null, true); }
    if (g.birds && bird && g.wx !== 'typhoon' && g.wx !== 'blizzard' && g.wx !== 'storm') {
      if (bird.cur && clock > bird.cur.t0 + bird.cur.dur) bird.cur = null;
      if (!bird.cur && clock > bird.next) {
        var crows = g.light === 'dusk', ltr = crows ? false : frng() < 0.5, y = g.horizonY * (0.25 + frng() * 0.5), n = crows ? 4 + ((frng() * 4) | 0) : frng() < 0.4 ? 2 : 1, flock = [];
        for (var i = 0; i < n; i++) flock.push({ dx: -i * (5 + frng() * 5) * (ltr ? 1 : -1), dy: (frng() - 0.5) * 10, ph: frng() * TAU, s: (crows ? 1.0 : 0.75) + frng() * 0.35 });
        bird.cur = { t0: clock, dur: 10 + frng() * 5, x0: ltr ? -14 : g.W + 14, x1: ltr ? g.W + 40 : -40, y: y, rise: (frng() - 0.3) * 18, flap: crows ? 7 + frng() * 2 : 10 + frng() * 4, crow: crows, flock: flock };
        bird.next = clock + (crows ? 16 + frng() * 14 : 26 + frng() * 30);
        cue(crows ? 'crow' : 'bird');
      }
    }
    if (rare && clock > rare.t0 + rare.def.dur) { rare = null; g.rareNow = null; }
    if (!rare && clock > rareRoll && g.wx !== 'storm' && g.wx !== 'typhoon' && g.wx !== 'blizzard') {
      rareRoll = clock + 20 + frng() * 20;
      if (frng() < RARE_P) { var el = rareEligible(g), tw = 0; el.forEach(function (d) { tw += d.w; }); var r = frng() * tw; for (var j = 0; j < el.length; j++) { r -= el[j].w; if (r <= 0) { startRare(el[j]); break; } } }
    }
    tickCues();
    if (clock > wxCheck) { wxCheck = clock + 30; if (!o.weather && !reveal) { var cw = curWeather(); if (cw.wx !== cur.spec.wx || cw.after !== cur.spec.after) lastReq = refresh(true); }
      if (fwWanted() !== !!g.fwOn) setupFireworks(g);
      g.life = withScene({ W: g.W, H: g.H, KS: g.KS, stage: g.stage, season: g.season, light: g.light, event: cur.spec.event }, function () { return lifeScenes(g, nowDate(), mulberry32(31 + g.stage)); }); }
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
        var p0 = (cur && cur.spec.stage === target.stage && cur.spec.season === target.season && cur.spec.light === target.light && cur.spec.event === target.event) ? Promise.resolve(null)
          : obtain(pv).then(function (r) { if (want === myWant) present(r, fade); });
        return p0.then(function () { if (want !== myWant) throw CANCEL; return obtain(target); }).then(function (r) { if (want === myWant) present(r, true); });
      });
    } else chain = obtain(target).then(function (r) { if (want === myWant) present(r, fade); });
    return chain.catch(function (e) { if (e !== CANCEL && window.console) console.error(e); });
  }
  var lastReq = Promise.resolve();
  function update(n) {
    if (dead) return api;
    var before = { stage: o.stage, season: o.season, light: o.light, quality: o.quality, event: o.event, sp: seasonStep(o.date, o.season) };
    merge(n);
    clearTimeout(pendingTimer); pendingTimer = null;
    var same = before.season === o.season && before.light === o.light && before.quality === o.quality && before.event === o.event && before.sp === seasonStep(o.date, o.season);
    if (same && cur) seasonAmounts();
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
    var spec = size ? specFor(o.quality === 'full' ? 'preview' : 'card', { stage: from, season: o.season, light: o.light, event: o.event, date: o.date }) : null;
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
      return enqueue(function () { return renderStatic({ stage: spec.stage, season: spec.season, light: spec.light, event: spec.event, sp: spec.sp, wsign: spec.wsign, wx: spec.wx, after: spec.after, W: spec.W, H: spec.H, KS: spec.KS, DQ: spec.DQ, bw: spec.bw, bh: spec.bh, mask: false, cancelled: false }).then(function (r) { return r.canvas; }); });
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
    _summon: function (id) { var d = rareById(id); if (!d || !cur || dead || cur.spec.stage < d.minStage) return false; var ok = false; try { ok = startRare(d); } catch (e) { rare = null; cur.geo.rareNow = null; if (window.console) console.error(e); } loopCheck(); return ok; },
    tap: function (nx, ny) {
      if (!cur || dead || !isFinite(nx) || !isFinite(ny)) return null;
      var g = cur.geo, st = saveState(), hit = null;
      try {
        W = g.W; H = g.H; CAM = g.cam; KS = g.KS; MODE = 'n'; F = g.F; SEA = g.SEA; LIT = g.LIT; setLight(LIT); WIND_LEAN = cur.spec.wsign === -1 ? -1 : 1;
        var rc = null;
        if (rare && (rare.def.id === 'shironeko' || rare.def.id === 'mikeneko')) { var cp = rare.def.id === 'shironeko' ? mixc(rare.st.a, rare.st.b, 0.6) : rare.st.bench; rc = Pa(cp); }
        hit = tapScene(g, g.I, clamp(nx) * g.W, clamp(ny) * g.H, clock, frng, { rareCat: rc, catShown: !(wxWet(g.wx) || wxSnowy(g.wx)) && g.light !== 'night', rareCatTap: function () { rare.t0 = Math.min(rare.t0, clock - rare.def.dur * 0.86); } });
      } catch (e) { if (window.console) console.error(e); hit = null; }
      finally { restoreState(st); }
      if (!hit) return null;
      if (hit === 'cat') cue('rare', { id: 'neko', name: '猫' }, true);
      else if (hit === 'paddy') cue('paddy', { what: g.I.paddy && g.I.paddy.what }, true);
      else cue(hit, null, true);
      loopCheck(); if (!running()) drawFrame(true);
      return { hit: hit };
    },
    pause: function () { user.paused = true; loopCheck(); return api; },
    resume: function () { user.paused = false; loopCheck(); return api; },
    destroy: function () {
      if (dead) return;
      dead = true; cancelOthers([]); clearTimeout(pendingTimer); clearTimeout(rsTimer);
      if (raf) cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('visibilitychange', onVis);
      try { if (io) io.disconnect(); if (ro) ro.disconnect(); if (rmq) { if (rmq.removeEventListener) rmq.removeEventListener('change', onRM); else if (rmq.removeListener) rmq.removeListener(onRM); } } catch (e) { /* ignore */ }
      [cv, tv, fv, sv].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.width = c.height = 0; });
      if (wl) wl.width = wl.height = 0; if (bl) bl.width = bl.height = 0;
      cur = null; reveal = null; fallers = []; petals = null; dflies = null; bflies = null;
    },
    get _dbg() { return { fv: fv, sv: sv, cv: cv, tv: tv, cur: cur, wl: wl, bl: bl, petals: petals, clock: clock, frame: function (n) { for (var i = 0; i < (n || 1); i++) { clock += 1 / 30; tickFx(1 / 30); } drawFrame(false); }, setClock: function (c) { clock = c; }, redraw: function () { drawFrame(false); }, clearRare: function () { rare = null; if (cur) cur.geo.rareNow = null; }, bolt: function () { lightning = { t0: clock, bolt: makeBolt(cur.geo, frng) }; cues.next.thunder = clock; }, get wfx() { return wfx; }, get fallers() { return fallers; }, get cloudX() { return cloudX; }, get leafGust() { return leafGust; }, forceGust: function () { if (petals) petals.nextGust = clock; cues.next.gust = clock; }, smokeDrift: function () { var g = cur.geo; return gWind(g).h; }, get dflies() { return dflies; }, get bflies() { return bflies; }, worldScreen: function (x, y, z) { var g = cur.geo, st = saveState(); try { W = g.W; H = g.H; CAM = g.cam; var c = P(x, y, z); return [c.x / g.W, c.y / g.H]; } finally { restoreState(st); } }, walkerScreen: function (w) { var g = cur.geo, st = saveState(); try { W = g.W; H = g.H; CAM = g.cam; F = g.F; var q = walkerPos(g, w), f = P(q.x, q.y + 0.8, q.z); return [f.x / g.W, f.y / g.H]; } finally { restoreState(st); } }, norenScreen: function (n) { var g = cur.geo, st = saveState(); try { W = g.W; H = g.H; CAM = g.cam; var c = Pa(n.W.at((n.s0 + n.s1) / 2, n.top - 0.5, 0.3)); return [c.x / g.W, c.y / g.H]; } finally { restoreState(st); } }, get wind() { return cur && cur.geo.wind; }, set swayOnly(v) { dbgSwayOnly = !!v; }, tapTruth: function () { var sp = cur.spec, g = cur.geo; return withScene({ W: sp.W, H: sp.H, KS: 1, stage: sp.stage, season: sp.season, light: sp.light, event: sp.event, sp: sp.sp, wx: sp.wx, wsign: sp.wsign }, function () { return tapTruth(g); }); }, resetTaps: function () { var g = cur.geo, I = g.I; if (!I) return; I.trees = []; I.birds = []; I.lamps = []; I.koi = I.paddy = I.bell = I.taiko = I.cat = null; I.wheel = 0; g.walkers = g.walkers.filter(function (w) { return !w.temp; }); g.walkers.forEach(function (w) { w.react = null; }); g.noren.forEach(function (n) { n.boost = null; }); }, set noSway(v) { if (v) { dbgSway = swayFx || dbgSway; swayFx = null; } else if (dbgSway) swayFx = dbgSway; }, get sway() { return swayFx; }, still: function () { drawFrame(true); }, swayDraw: function (o) { if (swayFx) { var S = swayFx; S.prof = o || null; drawSwayLayer(S); S.prof = null; } }, hideBugs: function () { var a = dflies, b = bflies; dflies = bflies = null; drawFrame(false); dflies = a; bflies = b; } }; },
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
  EVENTS: EVENTS,
  RARE: RARE,
  stageFor: stageFor,
  seasonFor: seasonFor,
  lightFor: lightFor,
  mount: mount,
  windAt: windAt,
  weatherAt: weatherAt,
  fireworksAt: fireworksAt
};
try { Object.defineProperty(API, '_dbg', { value: { renderStatic: renderStatic, makeCam: makeCam, focusFor: focusFor, idbOpen: idbOpen, P: function () { return P.apply(null, arguments); } }, enumerable: false }); } catch (e) { /* ignore */ }
window.MogiTown = API;

})();
