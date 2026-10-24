    // ---------- Opening: seasonal effect ----------
    // 起動画面の演出: auto (season, or the event on its dates) / sakura / aoba / momiji / snow /
    //   shogatsu / setsubun / hinamatsuri / kodomo / tanabata / hanabi / obon / tsukimi / xmas / omisoka / jlpt / off
    // 十五夜 (中秋の名月) moves with the lunar calendar: month * 100 + day (bestcalendar.jp)
    var TSUKIMI_DATES = { 2025: 1006, 2026: 925, 2027: 915, 2028: 1003, 2029: 922, 2030: 912, 2031: 1001 };
    function seasonForToday(now) {
        now = now || new Date();
        var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate(), md = m * 100 + d, today = Date.UTC(y, m - 1, d);
        var daysFrom = function(yy, mm, dd) { return Math.round((today - Date.UTC(yy, mm - 1, dd)) / 864e5); };
        // JLPT 試験日: usually the first Sunday of July and of December (the 3 days before, and the day itself)
        for (var k = 0; k < 2; k++) {
            var em = k ? 12 : 7, sun = 1;
            while (new Date(y, em - 1, sun).getDay() !== 0) sun++;
            var df = daysFrom(y, em, sun);
            if (df >= -3 && df <= 0) return 'jlpt';
        }
        if (m === 1 && d <= 7) return 'shogatsu';          // お正月・松の内 (1/1–1/7)
        if (m === 2 && d <= 3) return 'setsubun';          // 節分 (2/1–2/3)
        if (md >= 225 && md <= 303) return 'hinamatsuri';  // ひな祭り (2/25–3/3)
        if (m === 5 && d <= 5) return 'kodomo';            // こどもの日 (5/1–5/5)
        if (m === 7 && d <= 7) return 'tanabata';          // 七夕 (7/1–7/7)
        if (md >= 720 && md <= 812) return 'hanabi';       // 花火・夏祭り (7/20–8/12)
        if (m === 8 && d >= 13 && d <= 16) return 'obon';  // お盆 (8/13–8/16)
        var tm = TSUKIMI_DATES[y];                         // お月見 (4 days before 十五夜 to the day after)
        if (tm) { var tdf = daysFrom(y, Math.floor(tm / 100), tm % 100); if (tdf >= -4 && tdf <= 1) return 'tsukimi'; }
        if (m === 12 && d >= 18 && d <= 25) return 'xmas'; // クリスマス (12/18–12/25)
        if (m === 12 && d >= 26) return 'omisoka';         // 年の瀬・大晦日 (12/26–12/31)
        return m >= 3 && m <= 5 ? 'sakura' : m >= 6 && m <= 8 ? 'aoba' : m >= 9 && m <= 11 ? 'momiji' : 'snow';
    }
    // imgsOnly: just the season's falling pieces ({ i: image, s: size, g: gentle }), for the word-game results
    function wvSeasonHtml(kind, imgsOnly) {
        if (!kind || kind === 'auto') kind = seasonForToday();
        if (kind === 'off') return imgsOnly ? [] : '';
        var svg = function(body) { return "url('data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' + body + '</svg>') + "')"; };
        var leaf = function(c) { return svg('<path d="M10 1l2 5 5-2-2 5 4 2-5 1 1 5-5-3-5 3 1-5-5-1 4-2-2-5 5 2z" fill="' + c + '"/><path d="M10 14v5" stroke="' + c + '" stroke-width="1.2"/>'); };
        var petal = function(c) { return svg('<path d="M10 2c4 3 6 8 0 16C4 10 6 5 10 2z" fill="' + c + '"/><path d="M10 2l-1.2 2.2L10 3.6l1.2.6z" fill="#fff" opacity=".7"/>'); };
        var snow = function(c) { return svg('<circle cx="10" cy="10" r="6" fill="' + c + '"/>'); };
        var star = function(c) { return svg('<path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3.1-5.4 3.1 1.2-6-4.5-4.2 6.1-.7z" fill="' + c + '"/>'); };
        var tanzaku = function(c, edge) { return svg('<path d="M10 0v2.5" stroke="#b08a4a" stroke-width=".8"/><rect x="6.5" y="2.5" width="7" height="16" rx=".6" fill="' + c + '"' + (edge ? ' stroke="' + edge + '" stroke-width=".7"' : '') + '/>'); };
        var flake = function(c) { return svg('<g stroke="' + c + '" stroke-width="1.3" stroke-linecap="round" fill="none"><path d="M10 1.5v17M2.6 5.75l14.8 8.5M2.6 14.25l14.8-8.5"/><path d="M8 3.6l2 1.8 2-1.8M8 16.4l2-1.8 2 1.8M3.6 8.6l2.6.8.6-2.6M16.4 11.4l-2.6-.8-.6 2.6M3.6 11.4l2.6-.8.6 2.6M16.4 8.6l-2.6.8-.6-2.6"/></g>'); };
        var ornament = function(c) { return svg('<path d="M10 1.5a2 2 0 0 1 0 3" stroke="#999" stroke-width=".8" fill="none"/><rect x="8.3" y="4.2" width="3.4" height="2.2" rx=".5" fill="#c9a43a"/><circle cx="10" cy="12.2" r="6" fill="' + c + '"/><circle cx="8" cy="10.2" r="1.4" fill="#fff" opacity=".45"/>'); };
        var ume = function(c, edge) {
            var p = '';
            for (var k = 0; k < 5; k++) { var a = (k * 72 - 90) * Math.PI / 180; p += '<circle cx="' + (10 + 4.4 * Math.cos(a)).toFixed(2) + '" cy="' + (10 + 4.4 * Math.sin(a)).toFixed(2) + '" r="4" fill="' + c + '"' + (edge ? ' stroke="' + edge + '" stroke-width=".6"' : '') + '/>'; }
            return svg(p + '<circle cx="10" cy="10" r="2" fill="#e6b422"/>');
        };
        var chochin = function(c) { return svg('<circle cx="10" cy="10.5" r="9" fill="' + c + '" opacity=".16"/><path d="M10 .8v2.4" stroke="#6b5440" stroke-width=".8"/><rect x="7" y="3" width="6" height="1.7" rx=".4" fill="#3a2a1a"/><ellipse cx="10" cy="10.5" rx="5.2" ry="6.1" fill="' + c + '"/><path d="M5.2 8.4h9.6M4.8 10.5h10.4M5.2 12.6h9.6" stroke="#7a3a10" stroke-opacity=".3" stroke-width=".6"/><rect x="7" y="16.3" width="6" height="1.7" rx=".4" fill="#3a2a1a"/>'); };
        var glow = function(c) { return svg('<circle cx="10" cy="10" r="7.5" fill="' + c + '" opacity=".22"/><circle cx="10" cy="10" r="2.6" fill="' + c + '"/>'); };
        var sparkle = function(c) { return svg('<path d="M10 2l1.6 6.4L18 10l-6.4 1.6L10 18l-1.6-6.4L2 10l6.4-1.6z" fill="' + c + '"/>'); };
        // クリスマス: light blue snow that glitters (a faceted sparkle, a light blue flake, a round glint)
        var diamond = svg('<path d="M10 1l2.2 6.8L19 10l-6.8 2.2L10 19l-2.2-6.8L1 10l6.8-2.2z" fill="#9fd4ff"/><path d="M10 1l2.2 6.8L10 10zM19 10l-6.8 2.2L10 10z" fill="#fff" opacity=".85"/><path d="M10 19l-2.2-6.8L10 10zM1 10l6.8-2.2L10 10z" fill="#6fb6ec"/>');
        // a candy cane: a striped hook, red and white, with a soft shine down one side
        var candy = (function() {
            var P = 'M7 19V7.2A4.2 4.2 0 0 1 15.4 7.2V8.6', st = '';
            for (var i = 0; i < 7; i++) st += '<path d="M5.4 ' + (18.4 - i * 2.2).toFixed(1) + 'l3.2 -1.6" stroke="#d62e33" stroke-width="1.1"/>';
            return svg('<path d="' + P + '" stroke="#f7f4ef" stroke-width="3.2" stroke-linecap="round" fill="none"/>' + st +
                '<path d="M8.4 3.6l1.6 2.2M11.8 2.9l-.2 2.6M14.6 4.6l-1.9 1.7M15.6 8.4l-2.8-.4" stroke="#d62e33" stroke-width="1.2" stroke-linecap="round"/>' +
                '<path d="M6.2 18.6V7.4A4.6 4.6 0 0 1 9 3.2" stroke="#fff" stroke-width=".7" stroke-linecap="round" fill="none" opacity=".75"/>');
        })();
        var glintDot = svg('<circle cx="10" cy="10" r="5.2" fill="#c4e6ff"/><circle cx="8.4" cy="8.4" r="1.8" fill="#fff"/>');
        // こどもの日: an origami 兜, a 柏餅, a little carp, a 菖蒲 flower
        var kabuto = function(c) { return svg('<path d="M2.5 13.5L10 3.5l7.5 10z" fill="' + c + '"/><path d="M10 3.5l7.5 10H10z" fill="#000" opacity=".15"/><path d="M6.4 9.4L2.6 4.2l5.6 2.8zM13.6 9.4l3.8-5.2-5.6 2.8z" fill="#e6b422"/>' +
            '<rect x="2.5" y="12.5" width="15" height="4" rx=".6" fill="' + c + '"/><rect x="2.5" y="12.5" width="15" height="1.2" fill="#fff" opacity=".35"/><path d="M8.6 10.6l1.4-1.6 1.4 1.6-1.4 1.4z" fill="#e6b422"/>'); };
        var kashiwa = svg('<path d="M3 9q1-3 3-1 1-3 3-1 1-3 3-1 1-3 3-1 1-2 3 0l-.5 7q-7 6-15 .5z" fill="#5f8f3e"/><path d="M3.5 10.5q7 3.5 14.5-.5" stroke="#86b35c" stroke-width=".7" fill="none"/>' +
            '<ellipse cx="10.5" cy="11.6" rx="6.8" ry="4.6" fill="#fbf8ef" stroke="#d9cfb5" stroke-width=".8"/><ellipse cx="9" cy="10.2" rx="2.6" ry="1.2" fill="#fff"/><path d="M4 12.5q2 5 7 5 5 0 7-5.5q-7 7.5-14 .5z" fill="#4f7c33"/>');
        var miniKoi = function(c) { return svg('<path d="M2 10q5-6 12-2l4-3-1.5 5 1.5 5-4-3q-7 4-12-2z" fill="' + c + '"/><circle cx="5.2" cy="9.2" r="1.3" fill="#fff"/><circle cx="5.3" cy="9.2" r=".7" fill="#111"/><path d="M8 7.8q1.5 2.2 0 4.4" stroke="#fff" stroke-width=".6" fill="none" opacity=".6"/>'); };
        var iris = svg('<path d="M10 10C7 6 7 2 10 1.5 13 2 13 6 10 10z" fill="#7b5fc4"/><path d="M10 10C6 9 2 11 2.5 14 4.5 16 8 13.5 10 10zM10 10c4-1 8 1 7.5 4-2 2-5.5-.5-7.5-4z" fill="#6a4fb3"/><path d="M10 10l-.6-4.5M10 10l-3.5 2.6M10 10l3.5 2.6" stroke="#f2c230" stroke-width=".9"/><path d="M10 10v8" stroke="#4f8a3c" stroke-width="1"/>');
        var present = function(c, rb) { return svg('<rect x="3" y="7.5" width="14" height="11" rx="1" fill="' + c + '"/><rect x="2" y="5.5" width="16" height="4" rx=".8" fill="' + c + '"/><rect x="2" y="5.5" width="16" height="4" rx=".8" fill="#fff" opacity=".15"/>' +
            '<rect x="8.7" y="5.5" width="2.6" height="13" fill="' + rb + '"/><path d="M10 5.5c-2.6-4-6.4-3-4.6-.6 1 1.1 2.8 1 4.6.6zM10 5.5c2.6-4 6.4-3 4.6-.6-1 1.1-2.8 1-4.6.6z" fill="' + rb + '"/>'); };
        var bean = function(c) { return svg('<ellipse cx="10" cy="10.4" rx="6.6" ry="5.6" fill="' + c + '" stroke="#a9813a" stroke-width=".7"/><path d="M8.2 9.4q1.8-1.1 3.6 0" stroke="#8c6a2c" stroke-width=".9" fill="none" stroke-linecap="round"/><ellipse cx="7.4" cy="8" rx="1.9" ry="1.1" fill="#fff" opacity=".5"/>'); };
        var holly = function(c) { return svg('<path d="M10 1l2 3.2 3.2-.8-.6 3.4 3 1.4-2.6 2 1.6 3-3.3.2-.6 3.4L10 15l-2.7 2.2-.6-3.4-3.3-.2 1.6-3-2.6-2 3-1.4-.6-3.4 3.2.8z" fill="' + c + '"/><path d="M10 3v12" stroke="#a7c9a0" stroke-width=".7"/>'); };
        var momo = function(c, edge) {
            var p = '';
            for (var k = 0; k < 5; k++) {
                var a = (k * 72 - 90) * Math.PI / 180, cx = (10 + 4.3 * Math.cos(a)).toFixed(2), cy = (10 + 4.3 * Math.sin(a)).toFixed(2);
                p += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="3.5" ry="4.7" transform="rotate(' + (k * 72) + ' ' + cx + ' ' + cy + ')" fill="' + c + '"' + (edge ? ' stroke="' + edge + '" stroke-width=".6"' : '') + '/>';
            }
            return svg(p + '<circle cx="10" cy="10" r="2.3" fill="#c2185b" opacity=".75"/><g fill="#8a1446"><circle cx="10" cy="7.4" r=".6"/><circle cx="12.4" cy="9.2" r=".6"/><circle cx="11.5" cy="12" r=".6"/><circle cx="8.5" cy="12" r=".6"/><circle cx="7.6" cy="9.2" r=".6"/></g>');
        };
        var hishi = (function() {          // 菱餅: three thick diamond slabs, green, white and pink
            var sl = function(y, c) { return '<path d="M1.4 ' + y + 'L10 ' + (y + 3.3) + 'V' + (y + 6) + 'L1.4 ' + (y + 2.7) + 'z" fill="' + c[1] + '"/><path d="M10 ' + (y + 3.3) + 'L18.6 ' + y + 'V' + (y + 2.7) + 'L10 ' + (y + 6) + 'z" fill="' + c[2] + '"/><path d="M1.4 ' + y + 'L10 ' + (y - 3.3) + 'L18.6 ' + y + 'L10 ' + (y + 3.3) + 'z" fill="' + c[0] + '"/>'; };
            return svg(sl(11.4, ['#8cc06a', '#5a9442', '#6caa50']) + sl(8.7, ['#fffaf0', '#e4dccb', '#f2ebdd']) + sl(6, ['#f6aac1', '#de86a2', '#ec9ab3']));
        })();
        var arare = function(c, edge) { return svg('<circle cx="10" cy="10" r="5.5" fill="' + c + '"' + (edge ? ' stroke="' + edge + '" stroke-width="1"' : '') + '/>'); };
        var omamori = function(c) { return svg('<path d="M10 4.6c-2-2.6-3.6-.6-1.6.4M10 4.6c2-2.6 3.6-.6 1.6.4" stroke="#e6b422" stroke-width=".9" fill="none"/><path d="M5 6.2Q10 3.4 15 6.2V17a1.4 1.4 0 0 1-1.4 1.4H6.4A1.4 1.4 0 0 1 5 17z" fill="' + c + '"/><rect x="6.8" y="8.2" width="6.4" height="7.6" rx=".6" fill="none" stroke="#e6b422" stroke-width=".7"/><path d="M8.4 10h3.2M8.4 12h3.2M8.4 14h3.2" stroke="#e6b422" stroke-width=".6"/>'); };
        var pencil = svg('<g transform="rotate(35 10 10)"><rect x="8" y="1.6" width="4" height="12.4" fill="#3d8b5a"/><path d="M9.3 3v10.6M10.7 3v10.6" stroke="#2c6a43" stroke-width=".4"/><rect x="8" y="1.6" width="4" height="1.4" fill="#e6b422"/><path d="M8 14h4l-2 4.6z" fill="#ecd3a8"/><path d="M9.25 16.8h1.5L10 18.6z" fill="#333"/></g>');
        // 秋: Japanese autumn leaves of many shapes. A palmate maple: `lobes` pointed lobes fanned over `spread` degrees and cut
        // in to `depth` of the radius between them, with small teeth on the edges, veins and a stalk (イロハモミジ has 7
        // slender lobes, ハウチワカエデ 9–11 shallow ones, トウカエデ 3).
        // 秋の葉, drawn from what the real leaves look like:
        //   イロハモミジ: 7 slender lobes cut deep toward the center, each tapering to a long point, finely double-toothed
        //   ハウチワカエデ: a round fan of 9–11 shallow, pointed, toothed lobes on a short stalk
        //   トウカエデ: 3 shallow lobes all pointing forward, smooth-edged, three veins from the base
        // A maple leaf is built lobe by lobe along each lobe's own axis: its two edges (toothed), the rounded cut (sinus)
        // to the next lobe, and a small notch where the stalk joins; main veins run from there to each tip.
        var mapleLeaf = function(c1, c2, sp) {
            var D = Math.PI / 180, cx = 10, cy = sp.cy, R = sp.R, rs = R * sp.sinus, pts = [], tips = [];
            var f = function(v) { return v.toFixed(2); }, frac = function(v) { return v - Math.floor(v); };
            sp.axes.forEach(function(deg, i) {
                var a = (deg - 90) * D, ux = Math.cos(a), uy = Math.sin(a), nx = uy, ny = -ux, L = R * sp.len[i], W = L * sp.w, d0 = Math.min(rs, L * 0.6), N = 40;
                var edge = function(u, side) {
                    var h = W * Math.pow(1 - u, sp.taper) * (sp.h0 + (1 - sp.h0) * Math.sin(Math.min(1, u / sp.wide) * Math.PI / 2));
                    if (sp.teeth && u > 0.12 && u < 0.97) { var ph = (u - 0.12) / 0.85 * sp.teeth, tt = frac(ph); h += sp.tooth * W * (0.25 + 0.75 * (1 - u)) * (Math.pow(tt, 1.7) - 0.4) * (sp.dbl && Math.floor(ph) % 2 ? 0.55 : 1); }
                    var t = d0 + (L - d0) * u;
                    return [cx + ux * t + nx * h * side, cy + uy * t + ny * h * side];
                };
                var left = [], right = [];
                for (var k = 0; k <= N; k++) { left.push(edge(k / N, 1)); right.push(edge(1 - k / N, -1)); }
                if (i > 0) {          // the rounded cut between this lobe and the one before
                    var mid = (sp.axes[i - 1] + deg) / 2, ma = (mid - 90) * D, sr = rs * 0.92;
                    pts.push({ q: [cx + Math.cos(ma) * sr, cy + Math.sin(ma) * sr], p: left[0] });
                } else pts.push({ p: left[0] });
                left.slice(1).concat(right).forEach(function(pt) { pts.push({ p: pt }); });
                tips.push(edge(1, 1));
            });
            var d = 'M' + f(pts[0].p[0]) + ' ' + f(pts[0].p[1]);
            pts.slice(1).forEach(function(o) { d += o.q ? 'Q' + f(o.q[0]) + ' ' + f(o.q[1]) + ' ' + f(o.p[0]) + ' ' + f(o.p[1]) : 'L' + f(o.p[0]) + ' ' + f(o.p[1]); });
            d += 'Q' + f(cx) + ' ' + f(cy + sp.base) + ' ' + f(pts[0].p[0]) + ' ' + f(pts[0].p[1]) + 'z';          // round the bottom to the stalk
            var vy = cy + sp.vein, veins = tips.map(function(t) { return 'M' + f(cx) + ' ' + f(vy) + 'Q' + f((cx + t[0]) / 2 + (t[1] - vy) * 0.03) + ' ' + f((vy + t[1]) / 2) + ' ' + f(t[0]) + ' ' + f(t[1]); }).join('');
            return svg('<defs><radialGradient id="m" cx="' + f(cx / 20) + '" cy="' + f(vy / 20) + '" r=".62"><stop offset="0" stop-color="' + c2 + '"/><stop offset=".55" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c1 + '"/></radialGradient></defs>' +
                '<path d="M' + f(cx) + ' ' + f(vy) + 'Q' + f(cx + 0.4) + ' ' + f((vy + 19.6) / 2) + ' ' + f(cx + 0.9) + ' 19.6" stroke="' + c2 + '" stroke-width=".7" stroke-linecap="round" fill="none"/>' +
                '<path d="' + d + '" fill="url(#m)"/><path d="' + d + '" fill="none" stroke="#000" stroke-opacity=".12" stroke-width=".25"/>' +
                '<path d="' + veins + '" stroke="#fff3d6" stroke-opacity=".5" stroke-width=".35" fill="none" stroke-linecap="round"/>');
        };
        var iroha = function(c1, c2) { return mapleLeaf(c1, c2, { cy: 11.2, R: 8.8, sinus: 0.3, axes: [-128, -86, -44, 0, 44, 86, 128], len: [0.5, 0.82, 0.96, 1, 0.96, 0.82, 0.5], w: 0.29, h0: 0.5, wide: 0.3, taper: 1.2, teeth: 7, tooth: 0.2, dbl: 1, base: 1.4, vein: 0 }); };
        var hauchiwa = function(c1, c2, n) { var ax = [], ln = []; for (var i = 0; i < n; i++) { var a = -152 + i * 304 / (n - 1); ax.push(a); ln.push(0.86 + 0.14 * Math.cos(a * Math.PI / 300)); }
            return mapleLeaf(c1, c2, { cy: 10.6, R: 8.6, sinus: n > 10 ? 0.66 : 0.62, axes: ax, len: ln, w: n > 10 ? 0.21 : 0.24, h0: 0.8, wide: 0.35, taper: 0.62, teeth: 3, tooth: 0.36, dbl: 0, base: 2.2, vein: 0.4 }); };
        var toukaede = function(c1, c2) {          // (drawn directly: broad, smooth, its three lobes pointing forward from a rounded base)
            var d = 'M10 17.2C6.4 16.6 3.5 13.8 3.5 10.6Q3.6 7.8 4.3 5.1Q6.3 7 7.7 8.6Q8.6 5.2 10 1.6Q11.4 5.2 12.3 8.6Q13.7 7 15.7 5.1Q16.4 7.8 16.5 10.6C16.5 13.8 13.6 16.6 10 17.2z';
            return svg('<defs><radialGradient id="m" cx=".5" cy=".72" r=".7"><stop offset="0" stop-color="' + c2 + '"/><stop offset=".55" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c1 + '"/></radialGradient></defs>' +
                '<path d="M10 16.8Q10.3 18.2 10.6 19.6" stroke="' + c2 + '" stroke-width=".7" stroke-linecap="round" fill="none"/><path d="' + d + '" fill="url(#m)"/><path d="' + d + '" fill="none" stroke="#000" stroke-opacity=".12" stroke-width=".25"/>' +
                '<path d="M10 16.4Q10 9 10 2.6M10 16.4Q6.6 11 4.9 6M10 16.4Q13.4 11 15.1 6M10 13.6Q7.6 13.4 5 13.8M10 13.6Q12.4 13.4 15 13.8" stroke="#fff3d6" stroke-opacity=".5" stroke-width=".35" fill="none" stroke-linecap="round"/>'); };
        // the other leaves, from stalk (bottom) to tip:
        //   桜: elliptic, widest just above the middle, drawn out into a long tip, finely double-toothed, arching side veins,
        //       two small glands on the stalk; in autumn blotched red, orange and yellow
        //   ケヤキ: narrower, widest low down, a long tip, the base a little lopsided, small evenly curved teeth, straight side
        //       veins running out into the teeth
        //   コナラ: widest near the tip, narrowing to a wedge at the base, coarse sharp teeth pointing forward
        var bladeLeaf = function(sp) {
            var f = function(v) { return v.toFixed(2); }, frac = function(v) { return v - Math.floor(v); }, N = 140, Lp = [], Rp = [], y0 = 17.4, y1 = 1.4;
            for (var k = 0; k <= N; k++) {
                var s = k / N, w = sp.W * sp.shape(s), tooth = 0;
                if (s > 0.07 && s < 0.96 && sp.teeth) { var ph = (s - 0.07) / 0.89 * sp.teeth, tt = frac(ph); tooth = sp.tooth * Math.min(1, w / 1.5) * (sp.curved ? 1 - Math.pow(1 - tt, 2.2) : Math.pow(tt, 1.6)) * (sp.dbl && Math.floor(ph) % 2 ? 0.5 : 1); }
                var y = y0 - (y0 - y1) * s, wl = w + tooth, wr = w + tooth;
                if (sp.lop && s < 0.14) wl *= 1 - 0.5 * (1 - s / 0.14);          // a lopsided base
                Lp.push([10 - wl, y]); Rp.push([10 + wr, y]);
            }
            var d = 'M' + Rp.map(function(p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'L' + Lp.reverse().map(function(p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'z';
            var veins = 'M10 ' + f(y0) + 'L10 ' + f(y1 + 0.6);
            for (var v = 0; v < sp.veins; v++) {
                var s0 = 0.1 + v * 0.8 / sp.veins, yv = y0 - (y0 - y1) * s0, ww = sp.W * sp.shape(Math.min(1, s0 + sp.rise)) * 0.86, yr = y0 - (y0 - y1) * Math.min(1, s0 + sp.rise);
                [-1, 1].forEach(function(sd) { veins += sp.straight ? 'M10 ' + f(yv) + 'L' + f(10 + sd * ww) + ' ' + f(yr) : 'M10 ' + f(yv) + 'Q' + f(10 + sd * ww * 0.55) + ' ' + f(yv - 0.3) + ' ' + f(10 + sd * ww) + ' ' + f(yr); });
            }
            var blots = (sp.blots || []).map(function(b) { return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="' + b[3] + '" filter="url(#b)" opacity=".85"/>'; }).join('');
            var glands = sp.glands ? '<circle cx="9.55" cy="' + f(y0 + 0.9) + '" r=".42" fill="#8a2a1c"/><circle cx="10.45" cy="' + f(y0 + 1.1) + '" r=".42" fill="#8a2a1c"/>' : '';
            return svg('<defs><clipPath id="c"><path d="' + d + '"/></clipPath><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter>' +
                '<linearGradient id="l" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + sp.c2 + '"/><stop offset=".6" stop-color="' + sp.c1 + '"/></linearGradient></defs>' +
                '<path d="M10 ' + f(y0) + 'L10.1 19.6" stroke="' + sp.stalk + '" stroke-width=".7" stroke-linecap="round"/>' + glands +
                '<path d="' + d + '" fill="url(#l)"/><g clip-path="url(#c)">' + blots + '</g><path d="' + d + '" fill="none" stroke="#000" stroke-opacity=".12" stroke-width=".25"/>' +
                '<path d="' + veins + '" stroke="' + sp.vc + '" stroke-opacity=".55" stroke-width=".3" fill="none" stroke-linecap="round"/>');
        };
        var cherryShape = function(s) { var b = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.82)), 0.8); return s > 0.78 ? b * (1 - 0.5 * Math.pow((s - 0.78) / 0.22, 0.8)) : b; };
        var sakuraLeaf = function(c1, c2, blots) { return bladeLeaf({ W: 4.5, shape: cherryShape, teeth: 30, tooth: 0.32, dbl: 1, curved: 0, veins: 8, rise: 0.09, straight: 0, c1: c1, c2: c2, stalk: '#a3352a', vc: '#ffe0b0', glands: 1, blots: blots }); };
        var keyakiLeaf = function(c1, c2) { return bladeLeaf({ W: 3.3, shape: function(s) { var b = Math.pow(Math.sin(Math.PI * Math.pow(s, 1.25)), 0.85); return s > 0.72 ? b * (1 - 0.35 * (s - 0.72) / 0.28) : b; }, teeth: 12, tooth: 0.5, dbl: 0, curved: 1, veins: 9, rise: 0.07, straight: 1, lop: 1, c1: c1, c2: c2, stalk: '#7a4a22', vc: '#f2c890' }); };
        var konaraLeaf = function(c1, c2, blots) { return bladeLeaf({ W: 4.6, shape: function(s) { return Math.pow(Math.sin(Math.PI * Math.pow(s, 1.55)), 0.9) * (0.35 + 0.65 * Math.min(1, s * 1.6)); }, teeth: 9, tooth: 0.9, dbl: 0, curved: 0, veins: 9, rise: 0.06, straight: 1, c1: c1, c2: c2, stalk: '#7a5428', vc: '#f6dcae', blots: blots }); };
        // 栗: glossy dark brown, broad at the shoulders and drawn up to a point with a pale tuft, faint lines running up the
        // shell, and the big pale, rough base (座) across the bottom
        var chestnut = function(c) { var dots = ''; for (var i = 0; i < 26; i++) dots += '<circle cx="' + (4.6 + (i * 7.3) % 10.8).toFixed(2) + '" cy="' + (14.2 + (i * 3.7) % 3).toFixed(2) + '" r=".22"/>';
            return svg('<defs><radialGradient id="k" cx=".38" cy=".38" r=".75"><stop offset="0" stop-color="#9a5a2a"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="#3e1e0c"/></radialGradient></defs>' +
                '<path d="M10 2.3Q11.3 3.5 13.9 5.6C16.7 8 17.5 11.6 16.6 14.2L3.4 14.2C2.5 11.6 3.3 8 6.1 5.6Q8.7 3.5 10 2.3z" fill="url(#k)"/>' +
                '<path d="M5.4 13.2Q6.6 8.6 9.4 3.6M7.6 13.4Q8.4 8.4 9.8 3.4M10.4 13.4Q10.6 8.2 10.2 3.4M12.8 13.3Q12.2 8.4 10.6 3.6M14.8 13Q13.6 8.8 10.9 3.9" stroke="#000" stroke-opacity=".16" stroke-width=".28" fill="none"/>' +
                '<path d="M3.4 13.6Q10 12.3 16.6 13.6Q16.3 17.5 10 17.8Q3.7 17.5 3.4 13.6z" fill="#cdb48a"/><g fill="#a38a62" opacity=".7">' + dots + '</g>' +
                '<path d="M3.6 13.7Q10 12.4 16.4 13.7" stroke="#e8d8b4" stroke-width=".45" fill="none"/>' +
                '<ellipse cx="7.6" cy="7.8" rx="1.2" ry="2.6" transform="rotate(28 7.6 7.8)" fill="#fff" opacity=".22"/>' +
                '<path d="M10 2.4l-.5-1.3M10 2.4V.9M10 2.4l.5-1.3" stroke="#e2d4ac" stroke-width=".4" stroke-linecap="round"/>'); };
        // いが栗: a ball of fine, sharp spines growing in little clusters, ripening from yellow-green to brown at the tips; split
        // open at the top, its creamy lining showing, and three chestnuts packed side by side inside
        var igaguri = (function() {
            var rnd = wvRand(5), cx = 10, cy = 11.8, R = 5, back = '', front = '', f = function(v) { return v.toFixed(2); };
            var spine = function(x, y, a, len) { var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, mx = x + Math.cos(a) * len * 0.55, my = y + Math.sin(a) * len * 0.55;
                return '<path d="M' + f(x) + ' ' + f(y) + 'L' + f(mx) + ' ' + f(my) + '" stroke="#97a33e"/><path d="M' + f(mx) + ' ' + f(my) + 'L' + f(ex) + ' ' + f(ey) + '" stroke="#d9cf86"/>'; };
            for (var b = 0; b < 26; b++) { var ba = (-158 + b * 136 / 25) * Math.PI / 180, bx = 10 + Math.cos(ba) * 3.6, by = 8.4 + Math.sin(ba) * 1.6; back += spine(bx, by, ba + (rnd() - 0.5) * 0.5, 1.6 + rnd() * 1.4); }
            for (var k = 0; k < 70; k++) {          // clusters of three over the front of the burr
                var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.96;
                if (y < 9.6 && Math.abs(x - 10) < 3.4 + (9.6 - y) * 0.6) continue;          // (the opening)
                var rim = rr / R, len = rim > 0.78 ? 2.6 + rnd() * 1.6 : 0.8 + rim * 1.4 + rnd() * 0.5, dir = Math.atan2(y - cy, x - cx);
                for (var j = -1; j <= 1; j++) front += spine(x, y, dir + j * 0.32 + (rnd() - 0.5) * 0.25, len * (j ? 0.85 : 1));
            }
            var nut = function(x, y, w, h, rot) { return '<g transform="rotate(' + rot + ' ' + x + ' ' + y + ')"><path d="M' + f(x) + ' ' + f(y - h) + 'C' + f(x + w * 0.75) + ' ' + f(y - h * 0.75) + ' ' + f(x + w) + ' ' + f(y) + ' ' + f(x + w) + ' ' + f(y + h * 0.6) + 'L' + f(x - w) + ' ' + f(y + h * 0.6) + 'C' + f(x - w) + ' ' + f(y) + ' ' + f(x - w * 0.75) + ' ' + f(y - h * 0.75) + ' ' + f(x) + ' ' + f(y - h) + 'z" fill="url(#n)"/>' +
                '<path d="M' + f(x - w * 0.5) + ' ' + f(y - h * 0.2) + 'Q' + f(x - w * 0.3) + ' ' + f(y - h * 0.7) + ' ' + f(x) + ' ' + f(y - h * 0.85) + '" stroke="#fff" stroke-width=".35" opacity=".4" fill="none"/><path d="M' + f(x) + ' ' + f(y - h) + 'v-.7" stroke="#e2d4ac" stroke-width=".45" stroke-linecap="round"/></g>'; };
            var husk = 'M5.6 9.2C3.6 11 4 15.8 7 16.9Q10 18.1 13 16.9C16 15.8 16.4 11 14.4 9.2Q13 10.6 11.6 10.2Q10.8 11.2 10 10.6Q9.2 11.2 8.4 10.2Q7 10.6 5.6 9.2z';
            return svg('<defs><radialGradient id="n" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#9a5a2a"/><stop offset=".6" stop-color="#6a3416"/><stop offset="1" stop-color="#40200c"/></radialGradient>' +
                '<radialGradient id="h" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#9aa63e"/><stop offset="1" stop-color="#5c6622"/></radialGradient></defs>' +
                '<g stroke-width=".3" stroke-linecap="round">' + back + '</g><ellipse cx="10" cy="9" rx="4.4" ry="2.2" fill="#6a7428"/><ellipse cx="10" cy="9.3" rx="3.8" ry="1.6" fill="#efe4c4"/>' +
                nut(7.9, 8.6, 1.9, 2.3, -16) + nut(12.1, 8.6, 1.9, 2.3, 16) + nut(10, 8.1, 1.7, 2.5, 0) +
                '<path d="' + husk + '" fill="url(#h)"/><path d="M5.6 9.2Q7 10.6 8.4 10.2Q9.2 11.2 10 10.6Q10.8 11.2 11.6 10.2Q13 10.6 14.4 9.2" stroke="#efe4c4" stroke-width=".7" fill="none" stroke-linecap="round"/>' +
                '<g stroke-width=".3" stroke-linecap="round">' + front + '</g>');
        })();
        // 秋: a ginkgo leaf and a chestnut. 春: a whole cherry blossom
        // 銀杏 (イチョウ): a fan on a long stalk, narrow at the base and spreading wide, its top edge gently wavy with a cleft in
        // the middle (deep on some leaves); many fine veins fanning out from the stalk; yellow at the edge, a little deeper
        // (or still greenish) toward the base; some browning at the rim
        var ginkgoLeaf = function(top, base, notch, rim) {
            var P = 'M10 11.8C8.6 11 3.4 8.6 2 5.4C3 3.4 5.6 2.2 7.6 2.2Q8.5 2.6 9.2 2.1L10 ' + (2.3 + notch).toFixed(1) + 'L10.8 2.1Q11.5 2.6 12.4 2.2C14.4 2.2 17 3.4 18 5.4C16.6 8.6 11.4 11 10 11.8z', v = '';
            for (var i = 0; i < 15; i++) { var a = (-54 + i * 108 / 14) * Math.PI / 180, r = 8.8 - 1.4 * Math.pow(Math.abs(a) / 0.95, 2); if (Math.abs(a) < 0.06) continue; v += 'M10 11.4L' + (10 + Math.sin(a) * r).toFixed(2) + ' ' + (11.4 - Math.cos(a) * r).toFixed(2); }
            return svg('<defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + base + '"/><stop offset=".55" stop-color="' + top + '"/><stop offset="1" stop-color="' + top + '"/></linearGradient></defs>' +
                '<path d="M10 11.2Q10.3 15.4 9.6 19.2" stroke="' + base + '" stroke-width=".8" stroke-linecap="round" fill="none"/>' +
                '<path d="' + P + '" fill="url(#g)"/><path d="' + v + '" stroke="' + base + '" stroke-width=".22" opacity=".55"/>' +
                '<path d="' + P + '" fill="none" stroke="' + (rim || base) + '" stroke-width="' + (rim ? '.55' : '.25') + '" opacity="' + (rim ? '.75' : '.5') + '"/>' +
                '<path d="M4 4Q6 3 8 3.1" stroke="#fff" stroke-width=".5" stroke-linecap="round" opacity=".35" fill="none"/>');
        };
        var ginkgo = ginkgoLeaf('#ffd23a', '#e2ad1c', 0, null), ginkgoGold = ginkgoLeaf('#f6bf1c', '#cf9214', 0.4, null), ginkgoGreen = ginkgoLeaf('#f2d64a', '#98b43c', 0, null),
            ginkgoSplit = ginkgoLeaf('#ffcb2e', '#d9a018', 3.4, null), ginkgoOld = ginkgoLeaf('#f0b828', '#c88a16', 0.6, '#a8742a');
        // 夏: a sunflower petal (long, pointed, with a midrib) and the whole flower: two rows of pointed petals around a seeded disk
        var sfPetal = function(c, base) { return svg('<defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="' + base + '"/></linearGradient></defs><path d="M10 1.4C13.2 5 13.6 11 10 18.6C6.4 11 6.8 5 10 1.4z" fill="url(#p)"/><path d="M10 3v15M10 6.4L8.6 12M10 6.4l1.4 5.6" stroke="' + base + '" stroke-width=".35" opacity=".7" fill="none"/>'); };
        var sunflower = function(pc, back) {          // round: two rings of short, rounded petals around a broad seeded disk
            var p = '', seeds = '', rim = '';
            for (var k = 0; k < 18; k++) p += '<ellipse cx="10" cy="3.6" rx="1.8" ry="2.8" fill="' + back + '" transform="rotate(' + (k * 20 + 10) + ' 10 10)"/>';
            for (var k2 = 0; k2 < 18; k2++) p += '<ellipse cx="10" cy="3.9" rx="1.7" ry="2.6" fill="' + pc + '" transform="rotate(' + (k2 * 20) + ' 10 10)"/>';
            for (var j = 1; j < 52; j++) { var a = j * 2.39996, rr = Math.sqrt(j) * 0.62; seeds += '<circle cx="' + (10 + rr * Math.cos(a)).toFixed(2) + '" cy="' + (10 + rr * Math.sin(a)).toFixed(2) + '" r=".3"/>'; }
            for (var m = 0; m < 22; m++) { var b = m * Math.PI * 2 / 22; rim += '<circle cx="' + (10 + 4.9 * Math.cos(b)).toFixed(2) + '" cy="' + (10 + 4.9 * Math.sin(b)).toFixed(2) + '" r=".45"/>'; }
            return svg('<defs><radialGradient id="d"><stop offset="0" stop-color="#2e1a0a"/><stop offset=".7" stop-color="#4e2e12"/><stop offset="1" stop-color="#7a4a1a"/></radialGradient></defs>' + p +
                '<circle cx="10" cy="10" r="5.3" fill="url(#d)"/><g fill="#e8b020">' + rim + '</g><g fill="#1a0e04" opacity=".8">' + seeds + '</g><ellipse cx="8.6" cy="8.4" rx="2" ry="1.2" fill="#fff" opacity=".08"/>');
        };
        // 春: a cherry petal with the little notch at its tip
        // a real cherry petal: broad and notched at the tip, narrowing to a slender base where it's a deeper pink; pale toward
        // the tip, fine veins, a soft sheen across one side (it's slightly cupped), and a little translucent
        var realPetal = function(base, mid, tip) {
            var P = 'M10 18.9C8.9 18 6.8 15.2 5.6 11.8C4.5 8.6 4.7 5.2 6.6 3.5C7.7 2.6 8.8 2.7 9.4 3.6L10 4.5L10.6 3.6C11.2 2.7 12.3 2.6 13.4 3.5C15.3 5.2 15.5 8.6 14.4 11.8C13.2 15.2 11.1 18 10 18.9z';
            return svg('<defs><linearGradient id="c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + base + '"/><stop offset=".38" stop-color="' + mid + '"/><stop offset="1" stop-color="' + tip + '"/></linearGradient>' +
                '<linearGradient id="h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#b0607e" stop-opacity=".12"/></linearGradient></defs>' +
                '<path d="' + P + '" fill="url(#c)" fill-opacity=".93"/><path d="' + P + '" fill="url(#h)"/>' +
                '<path d="M10 18.3Q9.7 11 7.8 4.2M10 18.3V5.4M10 18.3Q10.3 11 12.2 4.2M10 18.3Q8.8 12.6 6 7.8M10 18.3Q11.2 12.6 14 7.8" stroke="' + base + '" stroke-width=".2" opacity=".45" fill="none"/>' +
                '<path d="' + P + '" fill="none" stroke="#e9a9c0" stroke-width=".22" opacity=".45"/>');
        };
        var notched = function(c) { return svg('<defs><linearGradient id="n" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff2f6"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs><path d="M10 18C5 15 3.6 8 6.4 3.4Q8 2 9 4L10 5.4 11 4Q12 2 13.6 3.4C16.4 8 15 15 10 18z" fill="url(#n)"/><path d="M10 17V7M10 14L7.6 8M10 14l2.4-6" stroke="' + c + '" stroke-width=".3" opacity=".6" fill="none"/>'); };
        var blossom = function(c, mid) {
            var p = '', st = '';
            for (var k = 0; k < 5; k++) p += '<path d="M10 10C7.2 8.6 6.4 4.6 8.3 2.4L10 3.6L11.7 2.4C13.6 4.6 12.8 8.6 10 10z" fill="' + c + '" transform="rotate(' + (k * 72) + ' 10 10)"/>';
            for (var j = 0; j < 8; j++) { var a = j * Math.PI / 4, x = 10 + 2.8 * Math.cos(a), y = 10 + 2.8 * Math.sin(a); st += '<path d="M10 10L' + x.toFixed(2) + ' ' + y.toFixed(2) + '" stroke="' + mid + '" stroke-width=".4"/><circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r=".45" fill="#e6b422"/>'; }
            return svg(p + '<circle cx="10" cy="10" r="2.2" fill="' + mid + '" opacity=".75"/>' + st);
        };
        // 冬: snow of many kinds: branching crystals, six-sided plates, starry crystals, soft clumps of flakes, small grains
        var dendrite = function(c) { var a = ''; for (var k = 0; k < 6; k++) a += '<g transform="rotate(' + (k * 60) + ' 10 10)"><path d="M10 10V1.6M10 6.6l-2-1.8M10 6.6l2-1.8M10 4.2l-1.4-1.3M10 4.2l1.4-1.3M10 8.4l-1.2-.9M10 8.4l1.2-.9"/></g>'; return svg('<g stroke="' + c + '" stroke-width=".95" stroke-linecap="round" fill="none">' + a + '</g><circle cx="10" cy="10" r="1.2" fill="' + c + '"/>'); };
        var plate = function(c) {
            var hx = function(r) { var s = ''; for (var k = 0; k < 6; k++) { var a = (k * 60 - 90) * Math.PI / 180; s += (k ? 'L' : 'M') + (10 + r * Math.cos(a)).toFixed(2) + ' ' + (10 + r * Math.sin(a)).toFixed(2); } return s + 'z'; };
            return svg('<path d="' + hx(7.4) + '" fill="' + c + '" fill-opacity=".45" stroke="' + c + '" stroke-width=".9" stroke-linejoin="round"/><path d="' + hx(3.6) + '" fill="none" stroke="#fff" stroke-width=".7" opacity=".9"/><path d="M10 2.6V17.4M3.6 6.3l12.8 7.4M3.6 13.7l12.8-7.4" stroke="#fff" stroke-width=".45" opacity=".75"/>');
        };
        var stellar = function(c) { var a = ''; for (var k = 0; k < 6; k++) a += '<path d="M10 10L9 6.2 10 1.4 11 6.2z" transform="rotate(' + (k * 60) + ' 10 10)"/>'; return svg('<g fill="' + c + '">' + a + '</g><circle cx="10" cy="10" r="2" fill="' + c + '"/><circle cx="10" cy="10" r=".9" fill="#fff" opacity=".8"/>'); };
        // { i: image, s: size, g: sways gently instead of tumbling, fl: drifts on the wind and flutters (petals, leaves), gl: glistens now and then }
        var imgs = kind === 'fuji' ? [{ i: realPetal('#ef9fbb', '#f8cfdd', '#fff4f8'), fl: 1 }, { i: realPetal('#f2adc4', '#fbd9e4', '#fff7fa'), fl: 1 }, { i: realPetal('#ea93b2', '#f6c4d5', '#fdeef3'), fl: 1 },
                { i: realPetal('#f5b8cb', '#fde2ea', '#fffafb'), fl: 1 }, { i: realPetal('#ec9ab7', '#f9d3e0', '#fff1f6'), fl: 1 }]
            : kind === 'sakura' ? [{ i: notched('#ffb7cf'), fl: 1 }, { i: petal('#ff8fb5'), fl: 1, s: 0.9 }, { i: notched('#ffc9da'), fl: 1 }, { i: petal('#ffb3cb'), fl: 1, s: 0.85 }, { i: notched('#ff9fc0'), fl: 1, s: 0.9 }, { i: notched('#ffd6e3'), fl: 1, s: 1.05 }, { i: petal('#ff6f9f'), fl: 1, s: 0.8 }, { i: notched('#ffadc6'), fl: 1 }]
            : kind === 'aoba' ? [{ i: sfPetal('#ffd23a', '#f2a516'), fl: 1 }, { i: leaf('#7fb069'), fl: 1, s: 1.35 }, { i: sfPetal('#ffc21a', '#e8960c'), fl: 1 }, { i: sunflower('#ffc81e', '#e89a10'), g: 1, s: 1 }, { i: sfPetal('#ffdb4d', '#f5b020'), fl: 1 }, { i: leaf('#5e9c4c'), fl: 1, s: 1.4 },
                { i: sfPetal('#ffcc2a', '#ec9e12'), fl: 1 }, { i: sfPetal('#ffd84a', '#f0a818'), fl: 1 }, { i: leaf('#a3c97a'), fl: 1, s: 1.3 }]
            : kind === 'momiji' ? [{ lf: 'm', i: iroha('#d42a1e', '#f07a2a'), fl: 1, s: 0.9 }, { lf: 'g', i: ginkgo, fl: 1, s: 1.05 }, { lf: 'g', i: ginkgoGold, fl: 1, s: 0.95 }, { lf: 'm', i: hauchiwa('#e8763a', '#f2b03a', 11), fl: 1, s: 1.25 },
                { lf: 'l', i: sakuraLeaf('#c8322a', '#e06a2a', [[7, 8, 2.6, '#f0a03a'], [12.5, 12, 2.2, '#f2c444'], [9, 14.5, 1.8, '#8a2a1e']]), fl: 1, s: 1 }, { i: chestnut('#6a3416'), s: 0.8 },
                { lf: 'm', i: iroha('#b8201c', '#e04a24'), fl: 1, s: 0.78 }, { lf: 'm', i: toukaede('#f0a830', '#e8c040'), fl: 1, s: 1 }, { lf: 'l', i: konaraLeaf('#b07a34', '#8a6a2a', [[8, 6, 2.4, '#d4a040']]), fl: 1, s: 1.1 },
                { lf: 'm', i: iroha('#e04a22', '#f2a63a'), fl: 1, s: 1.1 }, { lf: 'g', i: ginkgoGreen, fl: 1, s: 0.9 }, { i: igaguri, s: 0.95 }, { lf: 'l', i: keyakiLeaf('#cc7a2a', '#a8542a'), fl: 1, s: 0.95 },
                { lf: 'm', i: iroha('#f07a2a', '#f6c040'), fl: 1, s: 0.74 }, { lf: 'g', i: ginkgoSplit, fl: 1, s: 1 }, { lf: 'g', i: ginkgoOld, fl: 1, s: 0.88 }, { lf: 'm', i: hauchiwa('#d2402a', '#f08a34', 9), fl: 1, s: 1.05 },
                { lf: 'l', i: sakuraLeaf('#e8742e', '#c84a24', [[8.5, 6.5, 2.4, '#f2c040'], [11.5, 13, 2, '#c2302a']]), fl: 1, s: 0.85 }]
            : kind === 'tanabata' || kind === 'nagare' ? [star('#e6b422'), tanzaku('#d9534f'), star('#f0c94c'), tanzaku('#3b6fd8'), star('#e6b422'), tanzaku('#f2c230'), tanzaku('#fafafa', '#c8c8c8'), tanzaku('#8e5bc8')]
            : kind === 'obon' ? []
            : kind === 'xmas' ? [{ i: diamond, glint: 1, s: 0.3 }, { i: present('#d63a3a', '#f4d35e'), g: 1, s: 0.44 }, { i: candy, g: 1, s: 0.5 }, { i: flake('#9fd4ff'), glint: 1, s: 0.36 }, { i: ornament('#c0392b'), g: 1, s: 0.4 }, { i: glintDot, glint: 1, s: 0.26 },
                { i: present('#2e8b57', '#e04848'), g: 1, s: 0.44 }, { i: candy, g: 1, s: 0.46 }, { i: diamond, glint: 1, s: 0.26 }, { i: ornament('#e6b422'), g: 1, s: 0.4 }, { i: flake('#b6e0ff'), glint: 1, s: 0.36 }, { i: present('#3b6fd8', '#f4d35e'), g: 1, s: 0.44 },
                { i: glintDot, glint: 1, s: 0.24 }, { i: candy, g: 1, s: 0.5 }, { i: ornament('#2e8b57'), g: 1, s: 0.4 }, { i: diamond, glint: 1, s: 0.28 }, { i: present('#8e5bc8', '#f4d35e'), g: 1, s: 0.44 }, { i: flake('#9fd4ff'), glint: 1, s: 0.32 }, { i: ornament('#3b6fd8'), g: 1, s: 0.4 }]
            : kind === 'shogatsu' ? [snow('#ffffff'), snow('#f6e8f0'), snow('#ffe8dc'), snow('#ece6f6')]      // 風花: snow drifting from a clear sky
            : kind === 'hoo' ? [snow('#ffffff'), snow('#f6e8f0'), sparkle('#e6b422'), snow('#ffe8dc'), snow('#ece6f6'), sparkle('#f0c94c')]
            // the new events: { i: image, s: size, g: sways gently instead of tumbling }
            : kind === 'setsubun' ? [{ i: bean('#dcb76e'), s: 1.05 }, { i: bean('#d4ac5e'), s: .95 }, { i: holly('#2f6b3a'), g: 1, s: 1.2 }, { i: bean('#e2c07c'), s: 1.1 }, { i: bean('#d4ac5e'), s: .95 }]
            : kind === 'hinamatsuri' ? [{ i: momo('#f28aa6'), g: 1, s: 0.85 }, { i: arare('#f7b6c6'), s: .55 }, { i: momo('#fbd0dc', '#f2a0b8'), g: 1, s: 0.85 }, { i: hishi, g: 1, s: 1 }, { i: arare('#fffaf2', '#ead9c0'), s: .55 }, { i: momo('#f5a0b8'), g: 1, s: 0.85 }, { i: arare('#b9dca0'), s: .55 }, { i: arare('#f6dd7c'), s: .55 }]
            : kind === 'kodomo' ? [{ i: leaf('#7fb069'), s: 0.85 }, { i: kabuto('#3b6fd8'), g: 1, s: 1.05 }, { i: kashiwa, g: 1, s: 1 }, { i: miniKoi('#d9473f'), g: 1, s: 1 }, { i: iris, g: 1, s: 0.95 }, { i: leaf('#5e9c4c'), s: 0.85 },
                { i: kabuto('#d9473f'), g: 1, s: 1.05 }, { i: miniKoi('#2b2b2b'), g: 1, s: 1 }, { i: kashiwa, g: 1, s: 1 }, { i: iris, g: 1, s: 0.95 }, { i: miniKoi('#3b6fd8'), g: 1, s: 1 }, { i: leaf('#a3c97a'), s: 0.85 }]
            : kind === 'omisoka' ? [{ i: snow('#dbe6f3'), s: 0.5 }, { i: snow('#c9d9ec'), s: 0.42 }]
            : kind === 'jlpt' ? [{ i: petal('#f6b8c8'), fl: 1 }, { i: omamori('#c0392b'), g: 1, s: 1.35 }, { i: notched('#f3a3b9'), fl: 1 }, { i: pencil, g: 1, s: 1.6 }, { i: petal('#fbd3de'), fl: 1 }, { i: omamori('#2b3f8a'), g: 1, s: 1.35 }]
            : kind === 'hanabi' || kind === 'ootama' || kind === 'tsukimi' ? []
            : [{ i: dendrite('#9dbbe0'), g: 1, gl: 1, s: 1.2 }, { i: snow('#c9d9ec'), s: 0.6 }, { i: plate('#a9c6e8'), g: 1, s: 0.9 }, { i: stellar('#b0c9e8'), g: 1, gl: 1, s: 1 },
                { i: snow('#b7cbe3'), s: 0.45 }, { i: dendrite('#b4cbe8'), g: 1, s: 0.85 }, { i: stellar('#c0d4ee'), g: 1, s: 0.75 }, { i: snow('#dbe6f3'), s: 0.55 }, { i: plate('#b8d0ec'), g: 1, gl: 1, s: 0.7 }];      // 冬: many kinds of snow
        if (imgsOnly) return imgs.map(function(m) { return m.i ? m : { i: m }; });
        var out = wvSceneHtml(kind), gentle = kind === 'tanabata' || kind === 'nagare' || kind === 'xmas' || kind === 'obon', up = kind === 'obon',      // お盆: lanterns rise
            count = { sakura: 22, fuji: 16, aoba: 16, momiji: 20, tanabata: 10, nagare: 10, xmas: 24, shogatsu: 14, hoo: 14, obon: 14, setsubun: 16, hinamatsuri: 18, jlpt: 14, kodomo: 16, omisoka: 6 }[kind] || 22;
        if (!imgs.length) count = 0;
        var r = function(a, b) { return a + Math.random() * (b - a); }, slow = kind === 'omisoka' || kind === 'snow';
        // 富士と桜: each petal rides the wind on its own curving path, swaying, sometimes hovering on a lift of air or turning
        // a lazy loop; and every so often a gust (花吹雪) sweeps a ribbon of petals across the scene in a long, looping arc
        var whim = kind === 'fuji' && window.CSS && CSS.supports && CSS.supports('offset-path', "path('M0 0L1 1')");
        var VW = Math.max(320, window.innerWidth || 390), VH = Math.max(480, window.innerHeight || 700);
        var smooth = function(P) {          // a smooth curve through the points (Catmull-Rom as Bézier curves)
            var f = function(v) { return v.toFixed(1); }, d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
            for (var k = 0; k < P.length - 1; k++) {
                var a = P[Math.max(0, k - 1)], b = P[k], c = P[k + 1], e = P[Math.min(P.length - 1, k + 2)];
                d += 'C' + f(b[0] + (c[0] - a[0]) / 6) + ' ' + f(b[1] + (c[1] - a[1]) / 6) + ' ' + f(c[0] - (e[0] - b[0]) / 6) + ' ' + f(c[1] - (e[1] - b[1]) / 6) + ' ' + f(c[0]) + ' ' + f(c[1]);
            }
            return d;
        };
        // course(t) is where the wind carries it (t from 0 to 1); a loop {t, w, r} turns once around a circle of radius r
        var windPath = function(course, steps, loops) {
            var ts = [];
            for (var k = 0; k <= steps; k++) ts.push(k / steps);
            loops.forEach(function(L) { ts = ts.filter(function(t) { return t <= L.t || t >= L.t + L.w; }); for (var j = 0; j <= 16; j++) ts.push(L.t + L.w * j / 16); });
            ts.sort(function(a, b) { return a - b; });
            return smooth(ts.map(function(t) {
                var p = course(t), x = p[0], y = p[1];
                loops.forEach(function(L) { if (t > L.t && t < L.t + L.w) { var ph = (t - L.t) / L.w * Math.PI * 2; x += L.r * Math.sin(ph); y -= L.r * (1 - Math.cos(ph)); } });
                return [x, y];
            }));
        };
        var whimOne = function(i, wide) {
            var im = imgs[i % imgs.length], x0 = r(-0.2, 0.95) * VW, dx = r(0.08, 0.22) * VW, sw = r(5, 13), sn = r(0.8, 1.6), ph = r(0, 6.3), fall = VH + 80, loops = [];
            var lift = Math.random() < 0.15 ? { t: r(0.2, 0.7), h: r(14, 28) } : null;          // a breath of air: it hovers a moment
            var path = windPath(function(t) {
                var y = -40 + fall * t - (lift ? lift.h * Math.exp(-Math.pow((t - lift.t) / 0.07, 2)) : 0);
                return [x0 + dx * t + sw * Math.sin(t * Math.PI * 2 * sn + ph), y];
            }, 40, loops);
            var dur = r(15, 21);
            return '<span class="wv-p fl whim' + (wide ? ' wide' : '') + '" style="offset-path:path(\'' + path + '\');--r0:' + r(0, 360).toFixed(0) + 'deg;--fl:' + r(3.4, 5.2).toFixed(2) + 's;--sz:' + r(12, 14).toFixed(0) + 'px;--dur:' + dur.toFixed(1) + 's;--img:' + im.i + ';--delay:' + (-r(0, dur)).toFixed(1) + 's"></span>';
        };
        var gust = function(n0, n1) {          // a breath of wind: a loose line of petals drifting in from the left on a long, gentle wave
            var y0 = r(0.2, 0.3) * VH, drop = r(0.12, 0.2) * VH, html = '', sn = r(0.6, 0.9), ph = r(0, 6.3), span = VW + 200;
            for (var k = 0; k < n1; k++) {
                var im = imgs[k % imgs.length], wide = k >= n0, sp = r(-1, 1), own = r(0, 6.3);
                var path = windPath((function(sp, own) { return function(t) {
                    return [-100 + span * t + 3 * Math.sin(t * 11 + own), y0 + drop * t * t + 16 * Math.sin(t * Math.PI * 2 * sn + ph) + sp * (10 + 40 * t) + 3 * Math.sin(t * 9 + own * 2)];
                }; })(sp, own), 36, []);
                var trip = r(6, 7);
                html += '<span class="wv-p fl whim gust' + (wide ? ' wide' : '') + '" style="offset-path:path(\'' + path + '\');--r0:' + r(0, 360).toFixed(0) + 'deg;--fl:' + r(3, 4.6).toFixed(2) + 's;--sz:' + r(12, 14).toFixed(0) + 'px;--dur:' + (trip / 0.62).toFixed(1) + 's;--img:' + im.i + ';--delay:' + (0.2 + k * (wide ? 0.07 : 0.12) + r(0, 0.2)).toFixed(2) + 's"></span>';
            }
            return html;
        };
        // 紅葉: leaves fall the way real ones do. Most glide like a pendulum: swinging side to side, rocking into each swing
        // and rising a little at its end before sliding back; long leaves (桜・ケヤキ・コナラ) often tumble end over end; a
        // ginkgo often spirals down, turning. Nearer leaves are larger, brighter and quicker. Each motion is its own layer
        // (fall, sway, rise, rock), all timed from the same swing, so they stay in step. And a breath of wind at the start
        // carries a few across the screen.
        var leafOne = function(i, wide) {
            var im = imgs[i % imgs.length], z = Math.random(), dp = 0.74 + 0.4 * z, f2 = function(v) { return v.toFixed(2); }, roll = Math.random();
            var mode = im.lf === 'g' ? (roll < 0.45 ? 'spin' : 'glide') : im.lf === 'l' ? (roll < 0.45 ? 'tumble' : 'glide') : (roll < 0.15 ? 'spin' : roll < 0.25 ? 'tumble' : 'glide');
            var P = r(2.4, 3.6), sz = r(13, 19) * (im.s || 1) * dp, dur = (mode === 'tumble' ? r(6.5, 9) : mode === 'glide' ? r(11, 15) : r(10, 14)) / dp;
            var A = (mode === 'glide' ? r(24, 48) : mode === 'spin' ? r(12, 22) : r(6, 14)) * dp, B = mode === 'glide' ? A * r(0.55, 0.8) : 0, ds = -r(0, P);          // (B: enough to rise at the end of a swing)
            var o = '<span class="wv-p leaf ' + mode + (wide ? ' wide' : '') + '" style="left:' + f2(r(-6, 96)) + '%;--sz:' + f2(sz) + 'px;--dur:' + f2(dur) + 's;--delay:' + f2(-r(0, dur)) + 's;--drift:' + f2(r(-3, 12)) + 'vw;--o:' + f2(0.62 + 0.33 * z) + '">' +
                '<span class="sw" style="--p2:' + f2(P / 2) + 's;--a:' + f2(A) + 'px;--d:' + f2(ds) + 's">' +
                (mode === 'spin' ? '<span class="dep" style="--p2:' + f2(P / 2) + 's;--d:' + f2(ds - P / 4) + 's">' : '<span class="bob" style="--p4:' + f2(P / 4) + 's;--b:' + f2(B) + 'px;--d:' + f2(ds) + 's">');
            var lf = '--img:' + im.i + ';--r0:' + r(0, 360).toFixed(0) + 'deg;--rx:' + r(18, 46).toFixed(0) + 'deg;';
            if (mode === 'glide') lf += '--p2:' + f2(P / 2) + 's;--d:' + f2(ds - 0.3 * P) + 's;--rk:' + r(22, 40).toFixed(0) + 'deg;--ry:' + r(12, 30).toFixed(0) + 'deg';
            else lf += '--spin:' + f2(mode === 'spin' ? r(1.6, 2.6) : r(1.2, 2)) + 's;--dir:' + (Math.random() < 0.5 ? 1 : -1);
            return o + '<span class="lf" style="' + lf + '"></span></span></span></span>';
        };
        var leafGust = function(n0, n1) {
            if (!(window.CSS && CSS.supports && CSS.supports('offset-path', "path('M0 0L1 1')"))) return '';
            var y0 = r(0.3, 0.42) * VH, html = '', span = VW + 160, lt = r(0.42, 0.55), pool = imgs.filter(function(m) { return m.fl; });
            for (var k = 0; k < n1; k++) {
                var im = pool[Math.floor(Math.random() * pool.length)], wide = k >= n0, sp = r(-1, 1), own = r(0, 6.3);
                var loops = Math.random() < 0.7 ? [{ t: lt + r(-0.06, 0.06), w: 0, r: r(20, 36) }] : [];
                loops.forEach(function(L) { L.w = 2 * Math.PI * L.r / span * 0.5; });
                var path = windPath((function(sp, own) { return function(t) { return [-80 + span * t, y0 - 0.1 * VH * Math.sin(Math.PI * t) + 0.24 * VH * t * t + sp * (14 + 46 * t) + 7 * Math.sin(t * 13 + own)]; }; })(sp, own), 40, loops);
                html += '<span class="wv-p leaf gust' + (wide ? ' wide' : '') + '" style="offset-path:path(\'' + path + '\');--sz:' + (r(13, 18) * (im.s || 1)).toFixed(1) + 'px;--dur:' + r(3.2, 4).toFixed(2) + 's;--delay:' + (0.7 + k * 0.13 + r(0, 0.2)).toFixed(2) + 's;--o:.92">' +
                    '<span class="lf" style="--img:' + im.i + ';--r0:' + r(0, 360).toFixed(0) + 'deg;--spin:' + r(0.9, 1.5).toFixed(2) + 's;--dir:' + (Math.random() < 0.5 ? 1 : -1) + '"></span></span>';
            }
            return html;
        };
        var one = function(i, wide) {
            if (whim && imgs[i % imgs.length].fl) return whimOne(i, wide);
            if (kind === 'momiji' && imgs[i % imgs.length].fl) return leafOne(i, wide);
            var im = imgs[i % imgs.length], sc = im.s || 1, g = gentle || im.g, fl = im.fl && !up;
            return '<span class="wv-p' + (up ? ' up' : '') + (im.glint ? ' glint' : '') + (im.gl ? ' glisten' : '') + (fl ? ' fl' : '') + (wide ? ' wide' : '') + '" style="' + (im.glint ? '--gl:' + r(0.6, 1.4).toFixed(2) + 's;' : '') + (im.gl ? '--glt:' + r(2.6, 6).toFixed(1) + 's;' : '') +
                (fl ? 'left:' + r(-18, 88).toFixed(1) + '%;--drift:' + r(8, 24).toFixed(1) + 'vw;--r0:' + r(0, 360).toFixed(0) + 'deg;--fl:' + r(1.8, 3.4).toFixed(2) + 's;--sz:' + (r(11, 18) * sc).toFixed(0) + 'px;--dur:' + r(9, 14).toFixed(1) + 's;--sway:' + r(10, 28).toFixed(0) + 'px;'
                    : 'left:' + r(-4, 96).toFixed(1) + '%;--sz:' + (r(g ? 14 : 11, g ? 22 : 20) * sc).toFixed(0) + 'px;--dur:' + r(slow ? 8 : 6, slow ? 13 : 10).toFixed(1) + 's;--sway:' + r(-40, 40).toFixed(0) + 'px;') +
                '--img:' + (im.i || im) + ';--delay:' + (-r(0, 12)).toFixed(1) + 's;--rot:' + (r(-1, 1) * (g ? r(20, 60) : r(180, 540))).toFixed(0) + 'deg"></span>';
        };
        for (var i = 0; i < count; i++) out += one(i, false);
        for (var i2 = 0; i2 < Math.round(count * 1.2); i2++) out += one(i2 + 3, true);      // more on wide screens only (CSS shows them)
        if (whim) out += gust(10, 20);
        if (kind === 'momiji') out += leafGust(5, 9);
        return out;
    }
    // a wire strung across the whole top of the screen in a few drooping swags; returns the path and the points where
    // things hang on it (about every `gap` px), leaving out the stretch behind the logo
    function wvWire(gap, sag) {
        var W = Math.max(320, window.innerWidth || 390), stW = Math.min(W, 520), logoR = (W - stW) / 2 + stW - 40, logoL = logoR - 80;
        var n = Math.max(2, Math.round(W / 300)), sw = W / n, c = 2 * (sag - 3), d = 'M0 6', pts = [];
        for (var i = 0; i < n; i++) d += 'Q' + (i * sw + sw / 2).toFixed(1) + ' ' + c + ' ' + ((i + 1) * sw).toFixed(1) + ' 6';
        for (var x = gap / 2; x < W; x += gap) {
            if (x > logoL - 12 && x < logoR + 12) continue;
            var t = (x % sw) / sw; pts.push([x, (1 - t) * (1 - t) * 6 + 2 * t * (1 - t) * c + t * t * 6]);
        }
        return { W: W, d: d, pts: pts };
    }
    // The pieces that stay in place for some events (fireworks, the moon, the oni, carp streamers, the temple bell, a daruma…)
    function wvSceneHtml(kind) {
        var r = function(a, b) { return a + Math.random() * (b - a); };
        var uri = function(vb, body) { return "url('data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" preserveAspectRatio="none">' + body + '</svg>') + "')"; };
        var out = '';
        if (kind === 'hanabi' || kind === 'ootama') {
            out += '<div class="wv-sky night"></div><canvas class="wv-fwcanvas"></canvas><div class="wv-sea"></div><canvas class="wv-fwsea"></canvas>';      // drawn by wvFireworks()
        } else if (kind === 'tsukimi') {
            // a clump of すすき at night: many thin leaves that arch and droop (dark, moonlit), and stems topped with
            // silvery feathery plumes, each made of many fine racemes that fan out and droop with the wind (all one way)
            var clump = function(seed, stems) {
                var rn = wvRand(seed), leaves = '', stalks = '', fluff = '', fluffY = '', strands = '', hairs = '', greens = ['#56653f', '#64744a', '#4b5936', '#6f7f52'];
                for (var i = 0; i < 22; i++) {
                    var side = rn() < 0.45 ? -1 : 1, bx = 60 + (rn() - 0.5) * 24, h = 70 + rn() * 95, o = 14 + rn() * 50 + (side > 0 ? 10 : 0);
                    var pk = [bx + side * o * 0.35, 220 - h], tip = [bx + side * o, 220 - h * (0.35 + rn() * 0.45)], w = 1.4 + rn() * 1.6;
                    leaves += '<path d="M' + bx.toFixed(1) + ' 220Q' + pk[0].toFixed(1) + ' ' + pk[1].toFixed(1) + ' ' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1) + 'Q' + (pk[0] + side * w).toFixed(1) + ' ' + (pk[1] + w * 2).toFixed(1) + ' ' + (bx + w).toFixed(1) + ' 220z" fill="' + greens[i % 4] + '"/>';
                }
                for (var k = 0; k < stems; k++) {
                    var b = [60 + (k - (stems - 1) / 2) * 7 + (rn() - 0.5) * 5, 220], tp = [60 + (k - (stems - 1) / 2) * 22 + 6 + rn() * 14, 10 + rn() * 50], md = [b[0] + (tp[0] - b[0]) * 0.1, 130];
                    stalks += '<path d="M' + b[0].toFixed(1) + ' 220Q' + md[0].toFixed(1) + ' ' + md[1] + ' ' + tp[0].toFixed(1) + ' ' + tp[1].toFixed(1) + '"/>';
                    var young = rn() < 0.28, n = young ? 13 : 18;          // a young plume (just come out) is narrow, upright, glossy and reddish
                    for (var j = 0; j < n; j++) {
                        var f = j / (n - 1), P = wvQuad(b, md, tp, 0.72 + 0.28 * f), len = young ? 10 + rn() * 6 : 16 + 14 * Math.sin(Math.PI * f) + rn() * 6, E, C;
                        if (young) { E = [P[0] + 3 + (f - 0.5) * 4, P[1] - len * 0.6]; C = [P[0] + 1, P[1] - len * 0.3]; }
                        else { E = [P[0] + len * 0.75 + (f - 0.5) * 18, P[1] + len * 0.55 - (1 - f) * 4]; C = [P[0] + len * 0.35 + (f - 0.5) * 10, P[1] - len * 0.25]; }
                        var d = 'M' + P[0].toFixed(1) + ' ' + P[1].toFixed(1) + 'Q' + C[0].toFixed(1) + ' ' + C[1].toFixed(1) + ' ' + E[0].toFixed(1) + ' ' + E[1].toFixed(1);
                        if (young) fluffY += '<path d="' + d + '"/>'; else fluff += '<path d="' + d + '"/>';
                        strands += '<path d="' + d + '" stroke="' + (young ? ['#c9988a', '#b07e72', '#dcb2a4'][j % 3] : ['#ece6d6', '#ddd2b6', '#f4efe2'][j % 3]) + '"/>';
                        for (var hh = 0.2; hh < 1; hh += 0.12) { var Hp = wvQuad(P, C, E, hh); hairs += 'M' + Hp[0].toFixed(1) + ' ' + Hp[1].toFixed(1) + 'l1.2 2.6M' + Hp[0].toFixed(1) + ' ' + Hp[1].toFixed(1) + 'l-.8 2.2'; }
                    }
                }
                return uri('-20 0 160 220', '<defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1"/></filter></defs>' + leaves +
                    '<g stroke="#8f8460" stroke-width="1.2" fill="none">' + stalks + '</g>' +
                    '<g filter="url(#f)" stroke="#efe8d6" stroke-width="3.4" opacity=".24" fill="none" stroke-linecap="round">' + fluff + '</g>' +
                    '<g filter="url(#f)" stroke="#d8a89a" stroke-width="2.6" opacity=".26" fill="none" stroke-linecap="round">' + fluffY + '</g>' +
                    '<g stroke-width=".8" fill="none" stroke-linecap="round">' + strands + '</g><path d="' + hairs + '" stroke="#ebe4d2" stroke-width=".45" fill="none" opacity=".75"/>');
            };
            // far hills along the horizon, a breath of mist at their foot
            var rh = wvRand(915), ridge = 'M0 100V';
            for (var rx = 0; rx <= 400; rx += 8) ridge += (rx ? 'L' + rx + ' ' : '') + (60 - 12 * Math.sin(rx * 0.011 + 0.6) - 6 * Math.sin(rx * 0.027 + 2) - rh() * 0.8).toFixed(1);
            ridge += 'V100z';
            out += '<div class="wv-sky night"></div><div class="wv-moon"><canvas class="wv-mooncv"></canvas></div>';      // drawn by wvMoon()
            out += '<span class="wv-ridge" style="--img:' + uri('0 0 400 100', '<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#9aa6d0" stop-opacity="0"/><stop offset=".8" stop-color="#9aa6d0" stop-opacity=".13"/><stop offset="1" stop-color="#9aa6d0" stop-opacity="0"/></linearGradient></defs>' +
                '<path d="' + ridge + '" fill="#121a40" fill-opacity=".75"/><path d="' + ridge.replace('M0 100V', 'M0 ').replace('V100z', '') + '" stroke="#8a96c4" stroke-opacity=".12" stroke-width=".5" fill="none"/><rect width="400" height="100" fill="url(#m)"/>') + '"></span>';
            for (var t = 0; t < 5; t++) out += '<span class="wv-tw" style="left:' + r(40, 70).toFixed(1) + '%;top:' + r(4, 40).toFixed(1) + '%;--delay:' + (-r(0, 2.4)).toFixed(2) + 's"></span>';
            // [left %, height vh, which way it leans, seed, opacity]: the back row first (smaller and dimmer), then the front row
            // [center %, height vh, seed, opacity, stems]: the back row (smaller, dimmer), a little haze, then the front row.
            // The gust reaches each clump a moment after the one to its left.
            var field = function(c) {
                return '<span class="wv-clump" style="--x:' + c[0] + '%;--h:' + c[1] + 'vh;--op:' + c[3] + ';--dur:3.6s;--delay:' + (-(c[0] + 10) * 0.025).toFixed(2) + 's;--img:' + clump(c[2], c[4]) + '"></span>';
            };
            // (the field opens out around the offering: nothing right behind it, and only a stem or two at its sides)
            [[6, 21, 21, 0.5, 3], [14, 18, 27, 0.45, 2], [22, 19, 22, 0.5, 2], [30, 17, 28, 0.45, 2], [36, 15, 23, 0.4, 1], [44, 11, 40, 0.32, 1], [56, 12, 41, 0.32, 1], [64, 15, 24, 0.4, 1], [70, 17, 30, 0.45, 2], [78, 20, 25, 0.5, 3], [86, 18, 32, 0.45, 2], [94, 22, 26, 0.5, 2]].forEach(function(c) { out += field(c); });
            out += '<span class="wv-haze"></span>';
            [[-2, 38, 3, 1, 4], [9, 30, 34, 1, 3], [17, 28, 5, 1, 3], [24, 24, 35, 1, 2], [31, 19, 31, 1, 1], [69, 19, 37, 1, 1], [76, 25, 38, 1, 2], [83, 30, 8, 1, 3], [92, 32, 39, 1, 3], [101, 40, 13, 1, 4]].forEach(function(c) { out += field(c); });
            out += '<span class="wv-ground"></span>';
            // the offering stands on the ground: moonlight pooled on the earth around it, its shadow falling away from the moon
            // (to the lower right), and a few tufts of short grass at its feet
            var tuft = function(seed) {
                var rt = wvRand(seed), bl = '';
                for (var i = 0; i < 16; i++) {
                    var bx = 6 + rt() * 48, h = 7 + rt() * 17, lean = (rt() - 0.5) * 16, w = 0.9 + rt() * 0.9;
                    bl += '<path d="M' + (bx - w).toFixed(1) + ' 30Q' + (bx + lean * 0.3).toFixed(1) + ' ' + (30 - h * 0.6).toFixed(1) + ' ' + (bx + lean).toFixed(1) + ' ' + (30 - h).toFixed(1) + 'Q' + (bx + lean * 0.3 + w).toFixed(1) + ' ' + (30 - h * 0.55).toFixed(1) + ' ' + (bx + w).toFixed(1) + ' 30z" fill="' + ['#2e3a2c', '#36442f', '#283325', '#4a5a40'][i % 4] + '"/>';
                }
                return uri('0 0 60 30', bl);
            };
            out += '<div class="wv-dango"><span class="wv-dshadow"></span>' + wvDangoSvg() + '<span class="wv-dtuft l" style="--img:' + tuft(61) + '"></span><span class="wv-dtuft r" style="--img:' + tuft(62) + '"></span></div>';
        } else if (kind === 'setsubun') {
            var heap = '';
            [[22, 12], [30, 9], [38, 7.5], [46, 6.5], [54, 6], [62, 6], [70, 6.5], [78, 7.5], [86, 9], [94, 11], [34, 12.5], [50, 11], [66, 11], [82, 12.5], [42, 10.5], [58, 9.5], [74, 10.5]].forEach(function(b) {
                heap += '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="4.4" ry="3.8" fill="#dcb76e" stroke="#a9813a" stroke-width=".6"/><ellipse cx="' + (b[0] - 1.3) + '" cy="' + (b[1] - 1.3) + '" rx="1.3" ry=".8" fill="#fff" opacity=".45"/>';
            });
            out += '<div class="wv-onibox"><div class="wv-oni-clip"><div class="wv-oni"><svg viewBox="0 0 100 100" aria-hidden="true">' +
                '<path d="M28 32L33 6l10 23z" fill="#f3e3b0" stroke="#b99a4e" stroke-width="1.4" stroke-linejoin="round"/><path d="M57 29L67 6l5 26z" fill="#f3e3b0" stroke="#b99a4e" stroke-width="1.4" stroke-linejoin="round"/>' +
                '<g fill="#2b2420"><circle cx="24" cy="38" r="10"/><circle cx="36" cy="30" r="10"/><circle cx="50" cy="28" r="10"/><circle cx="64" cy="30" r="10"/><circle cx="76" cy="38" r="10"/></g>' +
                '<ellipse cx="50" cy="64" rx="34" ry="34" fill="#e0473f"/><ellipse cx="38" cy="48" rx="10" ry="6" fill="#fff" opacity=".18"/>' +
                '<path d="M28 48l13 5M72 48l-13 5" stroke="#2b2420" stroke-width="4.5" stroke-linecap="round"/>' +
                '<circle cx="38" cy="60" r="6.5" fill="#fff"/><circle cx="62" cy="60" r="6.5" fill="#fff"/><circle class="wv-oni-eye" cx="39" cy="61" r="3.2" fill="#222"/><circle class="wv-oni-eye" cx="61" cy="61" r="3.2" fill="#222"/>' +
                '<ellipse cx="50" cy="70" rx="4.5" ry="3.2" fill="#b8322c"/><circle cx="27" cy="72" r="4" fill="#f08a7a" opacity=".6"/><circle cx="73" cy="72" r="4" fill="#f08a7a" opacity=".6"/>' +
                '<path d="M34 82q16 12 32 0q-16 5-32 0z" fill="#7a1d18"/></svg></div></div>' +
                '<svg class="wv-masu" viewBox="0 0 120 64" aria-hidden="true"><path d="M10 15L20 4h80l10 11z" fill="#a98450"/>' + heap +
                '<rect x="10" y="15" width="100" height="47" fill="#e8c991"/><rect x="10" y="15" width="100" height="47" fill="none" stroke="#c49b5c" stroke-width="1.2"/>' +
                '<path d="M10 15h100" stroke="#f6e2b8" stroke-width="2"/><path d="M18 26q30 4 50-2t42 3M14 40q34 5 56-1t40 2M16 53q30 3 48-1t46 2" stroke="#d6b276" stroke-width=".9" fill="none"/>' +
                '<circle cx="60" cy="39" r="13" fill="none" stroke="#a3322a" stroke-width="1.6"/><text x="60" y="47.5" text-anchor="middle" font-size="22" fill="#a3322a" style="font-family: var(--mincho); font-weight: 800">福</text></svg></div>';
            // wide screens only: beans scattered across the floor, and a 柊鰯 (a holly sprig with a sardine's head) on the right
            var rb = wvRand(3), spill = '', hl = 'M0 0l3-3-.8-4 2.8-2-1.4-4 2-3-2.6-3 .4-4L0-27l-3.4 4 .4 4-2.6 3 2 3-1.4 4 2.8 2-.8 4z';
            for (var sb = 0; sb < 26; sb++) spill += '<g transform="translate(' + (rb() * 590 + 5).toFixed(1) + ' ' + (12 + rb() * 18).toFixed(1) + ') rotate(' + (rb() * 180).toFixed(0) + ')"><ellipse rx="4.4" ry="3.8" fill="#dcb76e" stroke="#a9813a" stroke-width=".6"/><ellipse cx="-1.3" cy="-1.3" rx="1.3" ry=".8" fill="#fff" opacity=".45"/></g>';
            var hleaf = function(x, y, a, c) { return '<g transform="translate(' + x + ' ' + y + ') rotate(' + a + ')"><path d="' + hl + '" fill="' + c + '"/><path d="M0 0V-25" stroke="#7fae7a" stroke-width=".6"/></g>'; };
            out += '<div class="wv-wide wv-beans"><svg viewBox="0 0 600 40" aria-hidden="true">' + spill + '</svg></div>' +
                '<div class="wv-wide wv-hiiragi"><svg viewBox="0 0 60 150" aria-hidden="true"><defs><linearGradient id="wvIwashi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d7088"/><stop offset=".55" stop-color="#b9c6d2"/><stop offset="1" stop-color="#e6ecf0"/></linearGradient></defs>' +
                '<path d="M31 150L30 40" stroke="#8f7650" stroke-width="2.6" stroke-linecap="round"/>' +
                hleaf(30, 64, -55, '#2f6b3a') + hleaf(30, 62, 50, '#3a7a44') + hleaf(30, 78, -100, '#2a5e33') + hleaf(30, 76, 95, '#336f3c') + hleaf(30, 56, -14, '#3f8048') +
                '<path d="M36 40Q34 28 22 19Q18 22 19 27Q22 37 29 42z" fill="url(#wvIwashi)" stroke="#4d5e72" stroke-width=".6"/><path d="M27 36Q30 32 33.5 32" stroke="#4d5e72" stroke-width=".8" fill="none"/>' +
                '<circle cx="24" cy="25" r="2.4" fill="#fff"/><circle cx="23.6" cy="25" r="1.3" fill="#111"/><path d="M19.4 22.4l2.4 1" stroke="#4d5e72" stroke-width=".7"/></svg></div>';
        } else if (kind === 'hinamatsuri') {
            // 雛人形 on a red-carpeted dais in front of a gold folding screen (金屏風), 雪洞 lamps glowing on either side and
            // 菱餅 between the pair; つるし雛 (strings of little sewn charms) hang and sway from the top
            var panels = '';
            for (var pi = 0; pi < 6; pi++) panels += '<rect x="' + (50 + pi * 40) + '" y="18" width="40" height="132" fill="url(#wvHinaGold' + (pi % 2) + ')"/>';
            var bonbori = function(x) {
                return '<g transform="translate(' + x + ' 0)"><circle class="wv-bglow" cx="0" cy="86" r="36" fill="url(#wvHinaGlow)"/>' +
                    '<ellipse cx="0" cy="151" rx="11" ry="3" fill="#1a1410"/><path d="M-1.6 151V100h3.2v51z" fill="#2a2018"/><path d="M-9 151l9-6 9 6" stroke="#2a2018" stroke-width="2" fill="none"/>' +
                    '<path d="M-12 74Q-14 87 -9 100H9Q14 87 12 74z" fill="url(#wvHinaPaper)"/>' +
                    '<g fill="#f29bb5" opacity=".85"><circle cx="-4" cy="86" r="2"/><circle cx="-1" cy="83.6" r="1.6"/><circle cx="-1.6" cy="89" r="1.5"/><circle cx="4" cy="90" r="1.3"/></g><path d="M-6 92q3-4 7-3M2 88q2 1 3 3" stroke="#6a4a2a" stroke-width=".6" fill="none"/>' +
                    '<path d="M-10 74h20l-3-5h-14z" fill="#1a1410"/><rect x="-9" y="99" width="18" height="3" rx="1" fill="#1a1410"/><path d="M0 69v-5" stroke="#c9a43a" stroke-width="1.5"/><circle cx="0" cy="63" r="1.8" fill="#c9a43a"/></g>';
            };
            var face = function(cx, cy, rx, ry) {
                return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#wvHinaSkin)"/>' +
                    '<ellipse cx="' + (cx - 4) + '" cy="' + (cy - 7) + '" rx="1.6" ry=".9" fill="#8a7a70" opacity=".7"/><ellipse cx="' + (cx + 4) + '" cy="' + (cy - 7) + '" rx="1.6" ry=".9" fill="#8a7a70" opacity=".7"/>' +
                    '<ellipse cx="' + (cx - 3.8) + '" cy="' + (cy - 0.2) + '" rx="1.9" ry=".8" fill="#2a1a10"/><ellipse cx="' + (cx + 3.8) + '" cy="' + (cy - 0.2) + '" rx="1.9" ry=".8" fill="#2a1a10"/>' +
                    '<circle cx="' + (cx - 3.4) + '" cy="' + (cy - 0.5) + '" r=".35" fill="#fff" opacity=".8"/><circle cx="' + (cx + 4.2) + '" cy="' + (cy - 0.5) + '" r=".35" fill="#fff" opacity=".8"/>' +
                    '<ellipse cx="' + cx + '" cy="' + (cy + 6) + '" rx="1.5" ry="1" fill="#c8323a"/>' +
                    '<ellipse cx="' + (cx - 6) + '" cy="' + (cy + 3) + '" rx="2.4" ry="1.4" fill="#f4a7b0" opacity=".35"/><ellipse cx="' + (cx + 6) + '" cy="' + (cy + 3) + '" rx="2.4" ry="1.4" fill="#f4a7b0" opacity=".35"/>';
            };
            var tatami = function(x0, x1) { return '<rect x="' + x0 + '" y="140" width="' + (x1 - x0) + '" height="10" fill="#d8c78e"/><rect x="' + x0 + '" y="143" width="' + (x1 - x0) + '" height="5" fill="url(#wvHinaUngen)" opacity=".85"/><rect x="' + x0 + '" y="140" width="' + (x1 - x0) + '" height="1.6" fill="#f5e7b8"/>'; };
            // お内裏様: a dark 束帯 with a faint pattern, white cuffs, holding a 笏, a sword hilt at his side, a black 冠 with its tall 纓
            var dairi = '<ellipse cx="115" cy="147" rx="42" ry="4" fill="#000" opacity=".18"/>' +
                '<path d="M110.6 89Q111.2 94 109.8 99H120.2Q118.8 94 119.4 89z" fill="url(#wvHinaNeck)"/>' +          // the neck, tucked into the collar
                '<path d="M76 146Q74 118 89 104Q99 96 115 96Q131 96 141 104Q156 118 154 146z" fill="url(#wvHinaNavy)"/>' +
                [[92, 116], [104, 128], [128, 128], [140, 116], [98, 140], [132, 140], [115, 138]].map(function(q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.2" fill="none" stroke="#4f6aa6" stroke-width=".8" opacity=".6"/>'; }).join('') +
                '<path d="M78 146Q81 130 90 122M152 146Q149 130 140 122" stroke="#f3ead8" stroke-width="2.2" fill="none"/>' +
                '<path d="M106.4 95.4L115 113L123.6 95.4z" fill="#fdf6ec"/><path d="M109.2 95.6L115 107L120.8 95.6" stroke="#c0392b" stroke-width="1.2" fill="none"/>' +
                '<path d="M100 120Q115 124 130 120" stroke="#b08a2a" stroke-width="2" fill="none"/>' +
                '<path d="M86 132L76 126" stroke="#c9a43a" stroke-width="2.2" stroke-linecap="round"/>' +
                '<ellipse cx="115" cy="122" rx="5" ry="3.4" fill="#f8ece0"/><path d="M112.6 106L117.4 106L118 132L112 132z" fill="#efe2bf" stroke="#b9a476" stroke-width=".6"/>' +
                face(115, 81, 10.5, 12) +
                '<path d="M104.4 81Q103.6 67 115 66.4Q126.4 67 125.6 81Q124.6 73 115 72.2Q105.4 73 104.4 81z" fill="url(#wvHinaHair)"/>' +
                '<path d="M105.6 79Q105.8 73.4 109.6 71.4M124.4 79Q124.2 73.4 120.4 71.4" stroke="#5a4e4e" stroke-width=".4" opacity=".7" fill="none"/>' +
                '<path d="M112.4 51L111.8 27.4Q115 23.6 118.2 27.4L117.6 51z" fill="url(#wvHinaGauze)" stroke="#0b0909" stroke-width=".8"/><path d="M115 27v23" stroke="#0b0909" stroke-width=".45"/>' +      // 纓: black gauze on a frame
                '<path d="M102.8 52.7H127.2" stroke="#1a1414" stroke-width="1.4" stroke-linecap="round"/><path d="M104 52.2h3.4M122.6 52.2h3.4" stroke="#fff" stroke-width=".35" opacity=".35"/><circle cx="102.6" cy="52.7" r=".9" fill="#c9a43a"/><circle cx="127.4" cy="52.7" r=".9" fill="#c9a43a"/>' +      // 簪, through the 巾子
                '<path d="M107.6 64Q109.8 61.4 109.8 57.6V48.8Q109.8 44.6 115 44.6Q120.2 44.6 120.2 48.8V57.6Q120.2 61.4 122.4 64z" fill="url(#wvHinaLacq)"/><path d="M112.2 47.4Q113 45.7 115 45.4" stroke="#fff" stroke-width=".7" opacity=".35" fill="none"/>' +      // 巾子
                '<path d="M103.4 75Q102.6 61 115 59.4Q127.4 61 126.6 75Q115 69.8 103.4 75z" fill="url(#wvHinaCap)"/>' +
                '<path d="M103.4 75Q102.6 61 115 59.4Q127.4 61 126.6 75Q115 69.8 103.4 75z" fill="url(#wvHinaWeave)" opacity=".4"/><path d="M107.6 64Q109.8 61.4 109.8 57.6V48.8Q109.8 44.6 115 44.6Q120.2 44.6 120.2 48.8V57.6Q120.2 61.4 122.4 64z" fill="url(#wvHinaWeave)" opacity=".3"/>' +           // the cap, sitting snugly on his head
                '<path d="M106.4 67.6Q108.2 61.6 115 60.6" stroke="#fff" stroke-width="1.2" opacity=".28" fill="none" stroke-linecap="round"/><path d="M103.6 74.6Q115 69.4 126.4 74.6" stroke="#3a3232" stroke-width=".6" fill="none"/>' +
                '<path d="M110.4 53.6l-.6-.9.6-.9M119.6 53.6l.6-.9-.6-.9" stroke="#000" stroke-width=".9" opacity=".55" fill="none"/>';      // where the 簪 goes in and out
            // お雛様: 十二単 (a red outer robe with gold diamonds, the colored layers showing at the opening and the cuffs, a red
            // 袴), long hair down her back, a 檜扇 with its colored cords, a gold 天冠
            var dia = '';
            [[198, 116], [207, 128], [243, 128], [252, 116], [194, 136], [256, 136], [200, 142], [250, 142], [190, 126], [260, 126]].forEach(function(q) { dia += '<path d="M' + q[0] + ' ' + (q[1] - 2.2) + 'l2 2.2-2 2.2-2-2.2z"/>'; });
            var layers = '';
            ['#fdf6ec', '#8e5bc8', '#f4a7b9', '#6aa84f', '#f2c230'].forEach(function(c, j) {
                var o = (4 - j) * 2.2;
                layers += '<path d="M' + (219.4 - o * 0.2) + ' 96.4L' + (210 - o) + ' 146M' + (230.6 + o * 0.2) + ' 96.4L' + (240 + o) + ' 146" stroke="' + c + '" stroke-width="2.2" fill="none"/>' +
                    '<path d="M' + (184 + o) + ' 146Q' + (188 + o) + ' ' + (130 + o * 0.6) + ' ' + (198 + o * 0.8) + ' ' + (121 + o * 0.6) + 'M' + (266 - o) + ' 146Q' + (262 - o) + ' ' + (130 + o * 0.6) + ' ' + (252 - o * 0.8) + ' ' + (121 + o * 0.6) + '" stroke="' + c + '" stroke-width="2" fill="none"/>';
            });
            var hime = '<ellipse cx="225" cy="147" rx="44" ry="4" fill="#000" opacity=".18"/>' +
                '<path d="M213 78Q203 112 207 146H243Q247 112 237 78z" fill="url(#wvHinaHair)"/>' +
                '<path d="M220.8 90Q221.4 94.6 220 98H230Q228.6 94.6 229.2 90z" fill="url(#wvHinaNeck)"/>' +
                '<path d="M182 146Q180 120 195 106Q207 97 225 97Q243 97 255 106Q270 120 268 146z" fill="url(#wvHinaRed)"/>' +
                '<g fill="#e6b422" opacity=".6">' + dia + '</g>' +
                '<path d="M219.4 96.4L207 146H243L230.6 96.4z" fill="#b3222c"/>' + layers +
                '<ellipse cx="212" cy="121" rx="4" ry="3" fill="#f8ece0"/><ellipse cx="238" cy="121" rx="4" ry="3" fill="#f8ece0"/>' +
                '<path d="M210 112L240 112L236 128L214 128z" fill="#f7e4a6" stroke="#c9a43a" stroke-width=".7"/><path d="M216 112l2 16M222 112l1 16M228 112l-1 16M234 112l-2 16" stroke="#d9b65a" stroke-width=".5"/>' +
                '<g fill="#d9473f"><circle cx="219" cy="118" r="1.6"/><circle cx="231" cy="121" r="1.4"/></g><circle cx="225" cy="119" r="1.5" fill="#4f9a4a"/>' +
                '<path d="M211 113Q204 128 206 145M239 113Q246 128 244 145" stroke="#d9473f" stroke-width="1.1" fill="none"/><path d="M212 114Q207 128 209 144M238 114Q243 128 241 144" stroke="#4f9a4a" stroke-width="1" fill="none"/><path d="M213 115Q209 129 211.5 143M237 115Q241 129 238.5 143" stroke="#8e5bc8" stroke-width="1" fill="none"/>' +
                '<g fill="#f2c230"><circle cx="206" cy="145" r="1.5"/><circle cx="244" cy="145" r="1.5"/></g>' +
                face(225, 82, 10, 11.5) +
                '<path d="M213.4 88Q204.6 75 210.6 66.4Q217.4 60.4 225 61Q232.6 60.4 239.4 66.4Q245.4 75 236.6 88Q235 74.6 225 72.6Q215 74.6 213.4 88z" fill="url(#wvHinaHair)"/>' +      // 大垂髪: full at the sides
                '<path d="M224 62Q214 63 210 70Q207.6 76 210.4 84M223 63.4Q215.6 65 212.6 71Q210.4 77 212.4 85M226 62Q236 63 240 70Q242.4 76 239.6 84M227 63.4Q234.4 65 237.4 71Q239.6 77 237.6 85" stroke="#5a4e4e" stroke-width=".35" opacity=".65" fill="none"/>' +
                '<path d="M208.6 77Q208.8 68.6 216 64.4M241.4 77Q241.2 68.6 234 64.4" stroke="#9a8e8e" stroke-width="1.3" opacity=".3" fill="none" stroke-linecap="round"/>' +
                '<path d="M213.6 84Q211.6 94 213.6 102M236.4 84Q238.4 94 236.4 102" stroke="#1a1410" stroke-width="2.6" fill="none"/>' +
                // a gold 天冠 seated on her hair: a band that follows the curve of her head, engraved and studded, upright pins topped
                // with little gold flowers, gold florets with rubies on the band, and a sun medallion with a ruby at the front
                '<path d="M219.6 64.2L217.4 55.6M230.4 64.2L232.6 55.6M215.2 66.8L212 59.4M234.8 66.8L238 59.4" stroke="#b98a1c" stroke-width=".75" fill="none"/>' +
                '<g fill="url(#wvHinaGoldM)">' + [0, 72, 144, 216, 288].map(function(a) { var t = (a - 90) * Math.PI / 180; return '<circle cx="' + (217.4 + 1.1 * Math.cos(t)).toFixed(2) + '" cy="' + (55.2 + 1.1 * Math.sin(t)).toFixed(2) + '" r="0.8250000000000001"/>'; }).join('') + '</g><circle cx="217.4" cy="55.2" r="0.5" fill="url(#wvHinaRuby)"/>' + '<g fill="url(#wvHinaGoldM)">' + [0, 72, 144, 216, 288].map(function(a) { var t = (a - 90) * Math.PI / 180; return '<circle cx="' + (232.6 + 1.1 * Math.cos(t)).toFixed(2) + '" cy="' + (55.2 + 1.1 * Math.sin(t)).toFixed(2) + '" r="0.8250000000000001"/>'; }).join('') + '</g><circle cx="232.6" cy="55.2" r="0.5" fill="url(#wvHinaRuby)"/>' + '<g fill="url(#wvHinaGoldM)">' + [0, 72, 144, 216, 288].map(function(a) { var t = (a - 90) * Math.PI / 180; return '<circle cx="' + (212 + 0.9 * Math.cos(t)).toFixed(2) + '" cy="' + (59 + 0.9 * Math.sin(t)).toFixed(2) + '" r="0.675"/>'; }).join('') + '</g><circle cx="212" cy="59" r="0.42" fill="url(#wvHinaRuby)"/>' + '<g fill="url(#wvHinaGoldM)">' + [0, 72, 144, 216, 288].map(function(a) { var t = (a - 90) * Math.PI / 180; return '<circle cx="' + (238 + 0.9 * Math.cos(t)).toFixed(2) + '" cy="' + (59 + 0.9 * Math.sin(t)).toFixed(2) + '" r="0.675"/>'; }).join('') + '</g><circle cx="238" cy="59" r="0.42" fill="url(#wvHinaRuby)"/>' +
                '<path d="M211.8 68.4Q217.8 61.8 225 62.4Q232.2 61.8 238.2 68.4L237.2 70.6Q231.6 64.8 225 64.6Q218.4 64.8 212.8 70.6z" fill="url(#wvHinaGoldM)" stroke="#8a6410" stroke-width=".3"/>' +
                '<path d="M212.6 69.4Q218.2 63.4 225 63.5Q231.8 63.4 237.4 69.4" stroke="#8a6410" stroke-width=".35" opacity=".7" fill="none"/>' +
                [[214.4, 67.4], [219.6, 64.6], [230.4, 64.6], [235.6, 67.4]].map(function(q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r=".45" fill="#fff4c0"/>'; }).join('') +
                '<path d="M222.6 63.4L223.6 57.6H226.4L227.4 63.4z" fill="url(#wvHinaGoldM)" stroke="#8a6410" stroke-width=".3"/>' +
                '<path d="M225 49.4l1.3 2.4 2.7-.4-1 2.5 2 1.8-2.6.6.2 2.7-2.6-1.3-2.6 1.3.2-2.7-2.6-.6 2-1.8-1-2.5 2.7.4z" fill="url(#wvHinaGoldM)" stroke="#8a6410" stroke-width=".35"/>' +
                '<circle cx="225" cy="54.6" r="2.9" fill="none" stroke="#fff0b0" stroke-width=".4" opacity=".8"/><circle cx="225" cy="54.6" r="1.8" fill="url(#wvHinaRuby)"/><circle cx="224.4" cy="54" r=".45" fill="#fff" opacity=".8"/>' +
                '<g fill="url(#wvHinaGoldM)">' + [0, 72, 144, 216, 288].map(function(a) { var t = (a - 90) * Math.PI / 180; return '<circle cx="' + (216.4 + 0.95 * Math.cos(t)).toFixed(2) + '" cy="' + (66.4 + 0.95 * Math.sin(t)).toFixed(2) + '" r="0.7124999999999999"/>'; }).join('') + '</g><circle cx="216.4" cy="66.4" r="0.6" fill="url(#wvHinaRuby)"/>' + '<g fill="url(#wvHinaGoldM)">' + [0, 72, 144, 216, 288].map(function(a) { var t = (a - 90) * Math.PI / 180; return '<circle cx="' + (233.6 + 0.95 * Math.cos(t)).toFixed(2) + '" cy="' + (66.4 + 0.95 * Math.sin(t)).toFixed(2) + '" r="0.7124999999999999"/>'; }).join('') + '</g><circle cx="233.6" cy="66.4" r="0.6" fill="url(#wvHinaRuby)"/>' +
                '<g class="wv-yoraku"><path d="M213.4 68.6V88M211.2 68V84" stroke="#d9a520" stroke-width=".5"/><g fill="#e6b422">' + [72, 76, 80, 84, 88].map(function(y) { return '<circle cx="213.4" cy="' + y + '" r=".9"/>'; }).join('') + [71.6, 75.6, 79.6, 83.6].map(function(y) { return '<circle cx="211.2" cy="' + y + '" r=".75"/>'; }).join('') + '</g></g>' +
                '<g class="wv-yoraku" style="animation-delay:-1.1s"><path d="M236.6 68.6V88M238.8 68V84" stroke="#d9a520" stroke-width=".5"/><g fill="#e6b422">' + [72, 76, 80, 84, 88].map(function(y) { return '<circle cx="236.6" cy="' + y + '" r=".9"/>'; }).join('') + [71.6, 75.6, 79.6, 83.6].map(function(y) { return '<circle cx="238.8" cy="' + y + '" r=".75"/>'; }).join('') + '</g></g>';
            // a diamond-shaped slab seen a little from above: top face centered at (x, y), half-width w, half-depth d, thickness t
            var slab = function(x, y, w, d, t, c) {
                return '<path d="M' + (x - w) + ' ' + y + 'L' + x + ' ' + (y + d) + 'V' + (y + d + t) + 'L' + (x - w) + ' ' + (y + t) + 'z" fill="' + c[1] + '"/>' +
                    '<path d="M' + x + ' ' + (y + d) + 'L' + (x + w) + ' ' + y + 'V' + (y + t) + 'L' + x + ' ' + (y + d + t) + 'z" fill="' + c[2] + '"/>' +
                    '<path d="M' + (x - w) + ' ' + y + 'L' + x + ' ' + (y - d) + 'L' + (x + w) + ' ' + y + 'L' + x + ' ' + (y + d) + 'z" fill="' + c[0] + '"/>';
            };
            var hishimochi = '<path d="M154 140.4v9.6M186 140.4v9.6" stroke="#1a1410" stroke-width="2.2"/><path d="M170 146.6v4" stroke="#1a1410" stroke-width="2.2"/>' +
                slab(170, 138, 18, 6.4, 2.6, ['#2a2018', '#100b08', '#1c1510']) + '<path d="M152 138L170 131.6L188 138" stroke="#c9a43a" stroke-width=".5" fill="none"/>' +
                slab(170, 134, 14, 5, 4, ['#8cc06a', '#5a9442', '#6caa50']) + slab(170, 130, 14, 5, 4, ['#fffaf0', '#e4dccb', '#f2ebdd']) + slab(170, 126, 14, 5, 4, ['#f6aac1', '#de86a2', '#ec9ab3']) +
                '<path d="M156.4 126L170 121.2L183.6 126" stroke="#fff" stroke-width=".6" opacity=".55" fill="none"/>';
            out += '<div class="wv-hina"><svg viewBox="0 0 340 220" aria-hidden="true"><defs>' +
                '<linearGradient id="wvHinaGold0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dc8a"/><stop offset="1" stop-color="#d9ae4c"/></linearGradient>' +
                '<linearGradient id="wvHinaGold1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8c362"/><stop offset="1" stop-color="#c49434"/></linearGradient>' +
                '<radialGradient id="wvHinaGlow"><stop offset="0" stop-color="#ffd890" stop-opacity=".75"/><stop offset="1" stop-color="#ffb860" stop-opacity="0"/></radialGradient>' +
                '<linearGradient id="wvHinaPaper" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fbe6b8"/><stop offset=".5" stop-color="#fff8e6"/><stop offset="1" stop-color="#f6d896"/></linearGradient>' +
                '<linearGradient id="wvHinaGoldM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".35" stop-color="#eec04a"/><stop offset=".7" stop-color="#b8861c"/><stop offset="1" stop-color="#f0cc60"/></linearGradient>' +
                '<radialGradient id="wvHinaRuby" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#ff9a9a"/><stop offset=".5" stop-color="#d0303a"/><stop offset="1" stop-color="#7a1018"/></radialGradient>' +
                '<linearGradient id="wvHinaNeck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2b6a0"/><stop offset=".4" stop-color="#ecdccb"/><stop offset="1" stop-color="#f6eadc"/></linearGradient>' +
                '<linearGradient id="wvHinaHair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3030"/><stop offset=".5" stop-color="#140f0f"/><stop offset="1" stop-color="#1e1717"/></linearGradient>' +
                '<radialGradient id="wvHinaCap" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#4a4242"/><stop offset=".45" stop-color="#1a1515"/><stop offset="1" stop-color="#060404"/></radialGradient>' +
                '<linearGradient id="wvHinaLacq" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#030202"/><stop offset=".3" stop-color="#3c3434"/><stop offset=".45" stop-color="#1a1515"/><stop offset="1" stop-color="#020101"/></linearGradient>' +
                '<pattern id="wvHinaWeave" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><path d="M0 1.4L1.4 0M-.35 .35L.35 -.35M1.05 1.75L1.75 1.05" stroke="#6a6060" stroke-width=".22"/></pattern>' +
                '<pattern id="wvHinaGauze" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><rect width="1.6" height="1.6" fill="#2a2424" fill-opacity=".82"/><path d="M0 .8H1.6M.8 0V1.6" stroke="#0a0808" stroke-width=".35"/></pattern>' +
                '<radialGradient id="wvHinaSkin" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#fffaf3"/><stop offset="1" stop-color="#f3e2d2"/></radialGradient>' +
                '<linearGradient id="wvHinaNavy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e4170"/><stop offset="1" stop-color="#18213d"/></linearGradient>' +
                '<linearGradient id="wvHinaRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d23a3f"/><stop offset="1" stop-color="#8f1820"/></linearGradient>' +
                '<pattern id="wvHinaUngen" width="12" height="5" patternUnits="userSpaceOnUse"><rect width="3" height="5" fill="#c0392b"/><rect x="3" width="3" height="5" fill="#fdf6ec"/><rect x="6" width="3" height="5" fill="#4f8a3c"/><rect x="9" width="3" height="5" fill="#3b5fa8"/></pattern>' +
                '<clipPath id="wvHinaScr"><rect x="50" y="18" width="240" height="132"/></clipPath></defs>' +
                '<rect x="47" y="15" width="246" height="137" rx="1.5" fill="#1a1410"/>' + panels +
                '<path d="M90 18v132M130 18v132M170 18v132M210 18v132M250 18v132" stroke="#8a6a1e" stroke-width=".8" opacity=".5"/>' +
                '<g clip-path="url(#wvHinaScr)"><path class="wv-hshine" d="M-30 18h16l-36 132h-16z" fill="#fff" opacity=".35"/></g>' +
                bonbori(24) + bonbori(316) +
                '<rect x="0" y="150" width="340" height="70" fill="#c0392b"/><rect x="0" y="150" width="340" height="8" fill="#de4b3d"/><rect x="0" y="157" width="340" height="2" fill="#a02c22" opacity=".6"/>' +
                tatami(72, 158) + tatami(180, 270) + dairi + hime + hishimochi + '</svg></div>';
            // つるし雛: little sewn charms on red cords (a temari ball, a peach, a chick, a plum flower, a くくり猿, a cushion)
            var charm = [
                function(y, c) { return '<circle cx="15" cy="' + y + '" r="6" fill="' + c + '"/><path d="M9 ' + y + 'h12M15 ' + (y - 6) + 'v12" stroke="#fff" stroke-width="1"/><path d="M10.8 ' + (y - 4.2) + 'l8.4 8.4M19.2 ' + (y - 4.2) + 'l-8.4 8.4" stroke="#f2c230" stroke-width=".8"/>'; },
                function(y) { return '<path d="M15 ' + (y + 6) + 'C8 ' + (y + 2) + ' 9 ' + (y - 6) + ' 15 ' + (y - 4) + 'C21 ' + (y - 6) + ' 22 ' + (y + 2) + ' 15 ' + (y + 6) + 'z" fill="#f7a8bc"/><path d="M15 ' + (y - 4) + 'q-1 3 0 9" stroke="#e07a96" stroke-width=".6" fill="none"/><path d="M15 ' + (y - 4) + 'q4-4 7-2q-3 3-7 2z" fill="#5f9a46"/>'; },
                function(y) { return '<ellipse cx="15" cy="' + (y + 1) + '" rx="6" ry="5" fill="#f6d04d"/><circle cx="17" cy="' + (y - 3) + '" r="3.4" fill="#f6d04d"/><path d="M20 ' + (y - 3.4) + 'l2.6.8-2.6.8z" fill="#e8833a"/><circle cx="17.8" cy="' + (y - 3.6) + '" r=".6" fill="#222"/><path d="M10 ' + y + 'l-3-2 1 3z" fill="#e9b93c"/>'; },
                function(y) { var p = ''; for (var k = 0; k < 5; k++) { var a = (k * 72 - 90) * Math.PI / 180; p += '<circle cx="' + (15 + 3.4 * Math.cos(a)).toFixed(2) + '" cy="' + (y + 3.4 * Math.sin(a)).toFixed(2) + '" r="3" fill="#e8546a"/>'; } return p + '<circle cx="15" cy="' + y + '" r="1.6" fill="#f2c230"/>'; },
                function(y) { return '<rect x="9.5" y="' + (y - 5.5) + '" width="11" height="11" rx="2.5" transform="rotate(45 15 ' + y + ')" fill="#d9473f"/><circle cx="15" cy="' + y + '" r="2.6" fill="#fdf6ec"/><circle cx="14" cy="' + (y - 0.4) + '" r=".4" fill="#222"/><circle cx="16" cy="' + (y - 0.4) + '" r=".4" fill="#222"/>'; },
                function(y) { return '<rect x="9" y="' + (y - 5) + '" width="12" height="10" rx="1.5" fill="#8e5bc8"/><path d="M9 ' + (y - 5) + 'l12 10M21 ' + (y - 5) + 'l-12 10" stroke="#f2c230" stroke-width=".5"/><g fill="#f2c230"><circle cx="9" cy="' + (y - 5) + '" r="1"/><circle cx="21" cy="' + (y - 5) + '" r="1"/><circle cx="9" cy="' + (y + 5) + '" r="1"/><circle cx="21" cy="' + (y + 5) + '" r="1"/></g>'; }
            ];
            var balls = ['#e8546a', '#3b6fd8', '#f2c230', '#2e8b57'];
            var strand = function(off) {
                var body = '<path d="M15 0V206" stroke="#c0392b" stroke-width="1"/>';
                for (var k = 0; k < 7; k++) body += charm[(k + off) % 6](20 + k * 28, balls[(k + off) % 4]);
                return uri('0 0 30 230', body + '<rect x="12" y="204" width="6" height="3" rx="1" fill="#e6b422"/><path d="M15 206l-4 20h8z" fill="#d9473f"/>');
            };
            [[0, 'left:6%', ''], [2, 'left:15%', ''], [4, 'left:24%', ' wv-wide'], [1, 'right:6%', ' wv-wide'], [3, 'right:15%', ' wv-wide'], [5, 'right:24%', ' wv-wide']].forEach(function(s, j) {
                out += '<span class="wv-tsurushi' + s[2] + '" style="' + s[1] + ';--img:' + strand(s[0]) + ';--dur:' + (2.8 + j * 0.35).toFixed(2) + 's;--delay:' + (-j * 0.7).toFixed(1) + 's"></span>';
            });
        } else if (kind === 'kodomo') {
            var koi = function(c, belly) {
                var sc = '';
                for (var x = 38; x <= 86; x += 9) for (var yy = 12; yy <= 28; yy += 8) sc += 'M' + x + ' ' + (yy - 3) + 'q4.5 3 0 6';
                return uri('0 0 120 40', '<path d="M3 10C30 2 70 4 98 13L117 3l-6 17 6 17-19-10C70 36 30 38 3 30z" fill="' + c + '"/><path d="M3 22C30 34 70 33 98 25v2C70 36 30 38 3 30z" fill="' + belly + '" opacity=".55"/>' +
                    '<path d="M100 20l15-14M100 20l15 14" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/><path d="M26 7q6 13 0 26" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" fill="none"/>' +
                    '<path d="' + sc + '" stroke="#fff" stroke-opacity=".38" stroke-width="1.1" fill="none"/>' +
                    '<ellipse cx="4" cy="20" rx="3" ry="9.6" fill="none" stroke="#f3ead6" stroke-width="2"/><circle cx="16" cy="15" r="5.2" fill="#fff"/><circle cx="16" cy="15" r="5.2" fill="none" stroke="#e6b422" stroke-width="1"/><circle cx="16.6" cy="15" r="2.7" fill="#111"/>');
            };
            var fuki = uri('0 0 120 40', ['#3b6fd8', '#d9534f', '#f2c230', '#fdfdfd', '#2e8b57'].map(function(c, j) {
                var y = 2.5 + j * 7, end = 100 + (j % 2 ? 8 : 16);
                return '<path d="M3 ' + y + 'H' + end + 'l14 3.5-14 3.5H3z" fill="' + c + '"' + (c === '#fdfdfd' ? ' stroke="#ddd" stroke-width=".5"' : '') + '/>';
            }).join('') + '<rect x="0" y="2" width="5" height="36" rx="2" fill="#e6b422"/>');
            var yaguruma = uri('0 0 20 20', [0, 45, 90, 135, 180, 225, 270, 315].map(function(a, j) { return '<path d="M10 10V1.6l3.4 3.2z" fill="' + (j % 2 ? '#e6b422' : '#c0392b') + '" transform="rotate(' + a + ' 10 10)"/>'; }).join('') + '<circle cx="10" cy="10" r="2" fill="#f5f0e0" stroke="#b08a4a" stroke-width=".6"/>');
            out += '<div class="wv-knear"><span class="wv-pole"></span><span class="wv-yaguruma" style="--img:' + yaguruma + '"></span>';
            [[fuki, 'min(46vw, 232px)', '6px'], [koi('#2b2b2b', '#e6b422'), 'min(42vw, 212px)', '54px'], [koi('#d9473f', '#f6d0a8'), 'min(37vw, 186px)', '102px'], [koi('#3b6fd8', '#cfe0ff'), 'min(32vw, 160px)', '146px']].forEach(function(k, j) {
                out += '<span class="wv-koi" style="--img:' + k[0] + ';--w:' + k[1] + ';--o:' + k[2] + ';--dur:' + (1.3 + j * 0.15).toFixed(2) + 's;--delay:' + (-j * 0.35).toFixed(2) + 's"></span>';
            });
            out += '</div>';
            // wide screens only: a second family's pole farther off on the right
            var farPole = '<span class="wv-pole"></span><span class="wv-yaguruma" style="--img:' + yaguruma + '"></span>';
            [[fuki, 'min(46vw, 232px)', '6px'], [koi('#2b2b2b', '#e6b422'), 'min(42vw, 212px)', '54px'], [koi('#e07a2e', '#fbe0b8'), 'min(37vw, 186px)', '102px'], [koi('#2e9b6a', '#d4f0dc'), 'min(32vw, 160px)', '146px']].forEach(function(k, j) {
                farPole += '<span class="wv-koi" style="--img:' + k[0] + ';--w:' + k[1] + ';--o:' + k[2] + ';--dur:' + (1.45 + j * 0.15).toFixed(2) + 's;--delay:' + (-0.6 - j * 0.35).toFixed(2) + 's"></span>';
            });
            out += '<div class="wv-wide wv-kfar">' + farPole + '</div>';
        } else if (kind === 'omisoka') {
            var nyu = '';
            for (var yy = 22; yy <= 42; yy += 5) for (var xx = 24; xx <= 56; xx += 6.4) nyu += '<circle cx="' + xx.toFixed(1) + '" cy="' + yy + '" r="1.6"/>';
            var bell = '<svg viewBox="0 0 80 110" aria-hidden="true"><rect x="35" y="0" width="10" height="8" fill="#5a4a36"/><path d="M29 17q11-14 22 0" stroke="#55654f" stroke-width="4.4" fill="none"/>' +
                '<path d="M17 18Q17 12 40 12Q63 12 63 18L65 96Q40 101 15 96z" fill="#5f6f5a"/><path d="M17 18Q17 12 40 12V99Q27 99 15 96z" fill="#fff" opacity=".07"/>' +
                '<g fill="#82937c">' + nyu + '</g><path d="M16.5 50H63.6M16 70H64M40 50v47" stroke="#4d5b49" stroke-width="1.8"/>' +
                '<circle cx="26" cy="82" r="6" fill="none" stroke="#82937c" stroke-width="1.5"/><circle cx="26" cy="82" r="2.4" fill="#82937c"/><path d="M15 96Q40 101 65 96v4Q40 105 15 100z" fill="#4a5846"/></svg>';
            var tiles = '';
            for (var tx = -4; tx <= 244; tx += 7) tiles += '<path d="M' + tx + ' 10V100"/>';
            var roof = 'M-6 86Q30 80 52 62L88 31H152L188 62Q210 80 246 86L246 94Q120 80 -6 94z';
            var tower = '<svg class="wv-tower-svg" viewBox="0 0 240 300" aria-hidden="true"><defs><clipPath id="wvRoofClip"><path d="' + roof + '"/></clipPath>' +
                '<linearGradient id="wvRoofG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4950"/><stop offset="1" stop-color="#2f2e34"/></linearGradient></defs>' +
                '<rect x="52" y="92" width="8" height="180" fill="#4a3325"/><rect x="180" y="92" width="8" height="180" fill="#4a3325"/>' +
                '<rect x="60" y="91" width="120" height="7" fill="#4f3726"/><rect x="14" y="92" width="212" height="14" fill="#4f3726"/>' +
                '<path d="' + roof + '" fill="url(#wvRoofG)"/><g clip-path="url(#wvRoofClip)" stroke="#232227" stroke-width=".8" opacity=".7">' + tiles + '</g>' +
                '<path d="M-6 94Q120 80 246 94L240 101Q120 89 0 101z" fill="#6b4a32"/><path d="M-6 94Q120 80 246 94" stroke="#5c5b62" stroke-width="2" fill="none"/>' +
                '<path d="M82 37L83 17Q83 13 87 13H90L91 19H149L150 13H153Q157 13 157 17L158 37L152 33H88z" fill="#2a292e"/><path d="M91 22H149" stroke="#3d3c43" stroke-width="1.4"/>' +
                '<rect x="24" y="100" width="13" height="172" fill="#6b4a32"/><rect x="203" y="100" width="13" height="172" fill="#6b4a32"/><rect x="20" y="246" width="200" height="8" fill="#5e412c"/>' +
                '<path d="M6 272h262v12H6z" fill="#b5afa2"/><path d="M-4 284h282v16H-4z" fill="#a39d90"/><path d="M6 272h262M-4 284h282" stroke="#cdc7ba" stroke-width="1.5"/>' +
                '<path d="M40 284v16M90 284v16M150 284v16M200 284v16M248 284v16M70 272v12M120 272v12M170 272v12M222 272v12" stroke="#8f897c" stroke-width="1"/><path d="M6 271.4h262" stroke="#eef1f7" stroke-width="1.4" opacity=".7"/></svg>';
            // the bell lit by two lanterns hanging from the beam
            var towerLamp = function(x) { return '<span class="wv-tlamp" style="left:' + x + 'px"><svg viewBox="0 0 20 28" aria-hidden="true"><path d="M10 0v3" stroke="#2a2018" stroke-width="1"/><rect x="6.5" y="3" width="7" height="2.2" rx=".5" fill="#2b2420"/><ellipse cx="10" cy="14.5" rx="7" ry="9" fill="#f6efe0"/><ellipse cx="10" cy="14.5" rx="7" ry="9" fill="#ffd27a" opacity=".55"/><path d="M3.3 11h13.4M3 14.5h14M3.3 18h13.4" stroke="#000" stroke-opacity=".15" stroke-width=".6"/><rect x="6.5" y="23.3" width="7" height="2.2" rx=".5" fill="#2b2420"/></svg></span>'; };
            // the temple grounds behind, at midnight in the snow: a grove of tall cedars; the main hall (本堂) with lantern-lit
            // shoji, a porch roof (向拝) over its steps and two paper lanterns; a smaller hall; the two-storied gate (楼門).
            // Their roofs sweep up at the corners and carry a thick layer of snow (tile rows showing through, a rounded lip
            // over the dark eaves, a few icicles); under the eaves, the shadowed bracket sets; the farther ones paler in the haze.
            var BW = Math.max(320, window.innerWidth || 390), BWide = BW >= 760, rb2 = wvRand(1231), tp = '', B = 230, uid = 0;
            var f1 = function(v) { return v.toFixed(1); };
            var defs = '<linearGradient id="wvTSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7b1cf"/><stop offset=".6" stop-color="#8994b6"/><stop offset="1" stop-color="#747fa3"/></linearGradient>' +
                '<linearGradient id="wvTSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c1022" stop-opacity=".45"/><stop offset=".3" stop-color="#0c1022" stop-opacity="0"/><stop offset=".7" stop-color="#0c1022" stop-opacity="0"/><stop offset="1" stop-color="#0c1022" stop-opacity=".45"/></linearGradient>' +
                '<linearGradient id="wvTShoji" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd890"/><stop offset="1" stop-color="#f0a850"/></linearGradient>' +
                '<radialGradient id="wvTGlow"><stop offset="0" stop-color="#ffc874" stop-opacity=".5"/><stop offset="1" stop-color="#ffc874" stop-opacity="0"/></radialGradient>';
            // a roof seen from the front: the eave line sags in the middle and lifts at the corners (反り); the hip slopes rise
            // concave to the gable ends (入母屋) or meet the ridge (寄棟); a heavy ridge with 鬼瓦 at both ends
            var roof = function(cx, ye, w, h, gable) {
                var lift = h * 0.16, xl = cx - w / 2, xr = cx + w / 2, yr = ye - h, gx = w * 0.2, sx = w * 0.3, sy = ye - h * 0.48;
                var top = gable ? 'Q' + f1(cx - w * 0.36) + ' ' + f1(ye - h * 0.12) + ' ' + f1(cx - sx) + ' ' + f1(sy) + 'L' + f1(cx - gx) + ' ' + f1(yr + h * 0.08) + 'L' + f1(cx - gx) + ' ' + f1(yr) + 'H' + f1(cx + gx) + 'L' + f1(cx + gx) + ' ' + f1(yr + h * 0.08) + 'L' + f1(cx + sx) + ' ' + f1(sy) + 'Q' + f1(cx + w * 0.36) + ' ' + f1(ye - h * 0.12) + ' '
                    : 'Q' + f1(cx - w * 0.36) + ' ' + f1(ye - h * 0.2) + ' ' + f1(cx - w * 0.17) + ' ' + f1(yr) + 'H' + f1(cx + w * 0.17) + 'Q' + f1(cx + w * 0.36) + ' ' + f1(ye - h * 0.2) + ' ';
                var shape = 'M' + f1(xl) + ' ' + f1(ye - lift) + top + f1(xr) + ' ' + f1(ye - lift) + 'Q' + f1(cx) + ' ' + f1(ye + lift * 0.9) + ' ' + f1(xl) + ' ' + f1(ye - lift) + 'z';
                var o = '<path d="' + shape + '" fill="url(#wvTSnow)"/><path d="' + shape + '" fill="url(#wvTSide)"/>';
                // tile rows through the snow, gathering toward the ridge
                o += '<path d="';
                for (var ti = 1; ti < 30; ti++) { var tf = ti / 30, bx = xl + w * tf; o += 'M' + f1(bx) + ' ' + f1(ye - lift * (Math.pow(2 * tf - 1, 2)) + lift * 0.2) + 'L' + f1(cx + (bx - cx) * 0.62) + ' ' + f1(sy + h * 0.06); }
                o += '" stroke="#56607f" stroke-width=".9" opacity=".55"/>';
                // the eaves: the dark tile ends under a rounded lip of snow, a few icicles
                o += '<path d="M' + f1(xl - 1) + ' ' + f1(ye - lift) + 'Q' + f1(cx) + ' ' + f1(ye + lift * 0.9) + ' ' + f1(xr + 1) + ' ' + f1(ye - lift) + 'L' + f1(xr - 1) + ' ' + f1(ye - lift + 4) + 'Q' + f1(cx) + ' ' + f1(ye + lift * 0.9 + 4) + ' ' + f1(xl + 1) + ' ' + f1(ye - lift + 4) + 'z" fill="#141826"/>';
                o += '<path d="M' + f1(xl - 1.5) + ' ' + f1(ye - lift - 0.6) + 'Q' + f1(cx) + ' ' + f1(ye + lift * 0.9 - 0.6) + ' ' + f1(xr + 1.5) + ' ' + f1(ye - lift - 0.6) + '" stroke="#c4cce2" stroke-width="2" stroke-linecap="round" fill="none"/>';
                var ic = '';
                for (var ii = 0; ii < w / 14; ii++) { var it = 0.06 + rb2() * 0.88, ix = xl + w * it, iy = ye - lift * Math.pow(2 * it - 1, 2) + lift * 0.9 * (1 - Math.pow(2 * it - 1, 2)) * 0 + 3.4; ic += 'M' + f1(ix - 0.8) + ' ' + f1(iy) + 'L' + f1(ix) + ' ' + f1(iy + 2 + rb2() * 4) + 'L' + f1(ix + 0.8) + ' ' + f1(iy) + 'z'; }
                o += '<path d="' + ic + '" fill="#cdd6ec" opacity=".75"/>';
                // ridge, 鬼瓦 (or the gable's dark boards when it has one)
                o += '<path d="M' + f1(cx - (gable ? gx : w * 0.17) - 2) + ' ' + f1(yr - 1) + 'H' + f1(cx + (gable ? gx : w * 0.17) + 2) + 'v' + f1(h * 0.09) + 'H' + f1(cx - (gable ? gx : w * 0.17) - 2) + 'z" fill="#1a1e2e"/>' +
                    '<path d="M' + f1(cx - (gable ? gx : w * 0.17) - 2) + ' ' + f1(yr - 1) + 'H' + f1(cx + (gable ? gx : w * 0.17) + 2) + '" stroke="#dfe5f3" stroke-width="1.6" stroke-linecap="round"/>';
                [-1, 1].forEach(function(sd) { var ox = cx + sd * ((gable ? gx : w * 0.17) + 2); o += '<path d="M' + f1(ox) + ' ' + f1(yr + h * 0.09) + 'L' + f1(ox) + ' ' + f1(yr - h * 0.1) + 'Q' + f1(ox + sd * h * 0.08) + ' ' + f1(yr - h * 0.12) + ' ' + f1(ox + sd * h * 0.07) + ' ' + f1(yr + h * 0.02) + 'z" fill="#1a1e2e"/>'; });
                if (gable) o += '<path d="M' + f1(cx - gx) + ' ' + f1(yr + h * 0.08) + 'L' + f1(cx - sx) + ' ' + f1(sy) + 'M' + f1(cx + gx) + ' ' + f1(yr + h * 0.08) + 'L' + f1(cx + sx) + ' ' + f1(sy) + '" stroke="#1a1e2e" stroke-width="1.6"/>';
                return o;
            };
            // the walls under the eaves: a stone base with snow on it, posts, the head beam and the shadowed brackets, and in
            // each bay either lit shoji (with their lattice) or dark board doors
            var walls = function(cx, w, h, bays, lit, ye) {
                var x0 = cx - w / 2, o = '<rect x="' + f1(x0 - 10) + '" y="' + f1(B - 7) + '" width="' + f1(w + 20) + '" height="7" fill="#4a506a"/><path d="M' + f1(x0 - 10) + ' ' + f1(B - 7) + 'h' + f1(w + 20) + '" stroke="#c9d1e6" stroke-width="1.6"/>';
                o += '<rect x="' + f1(x0) + '" y="' + f1(ye) + '" width="' + f1(w) + '" height="' + f1(B - 7 - ye) + '" fill="#232839"/>';
                var bw = w / bays, wy = ye + (B - 7 - ye) * 0.28, wh = (B - 7 - ye) * 0.62;
                for (var bi = 0; bi < bays; bi++) {
                    var bx = x0 + bw * bi + 2.5, inner = bw - 5, mid = Math.abs(bi - (bays - 1) / 2) < bays / 3;
                    if (lit && mid) {
                        o += '<rect x="' + f1(bx) + '" y="' + f1(wy) + '" width="' + f1(inner) + '" height="' + f1(wh) + '" fill="url(#wvTShoji)" opacity="' + (0.75 + rb2() * 0.25).toFixed(2) + '"/><path d="';
                        for (var lx = 1; lx < 4; lx++) o += 'M' + f1(bx + inner * lx / 4) + ' ' + f1(wy) + 'v' + f1(wh);
                        for (var ly = 1; ly < 6; ly++) o += 'M' + f1(bx) + ' ' + f1(wy + wh * ly / 6) + 'h' + f1(inner);
                        o += '" stroke="#6b4a2a" stroke-width=".5" opacity=".6"/>';
                    } else {
                        o += '<rect x="' + f1(bx) + '" y="' + f1(wy) + '" width="' + f1(inner) + '" height="' + f1(wh) + '" fill="#1b1f2d"/><path d="M' + f1(bx + inner / 2) + ' ' + f1(wy) + 'v' + f1(wh) + '" stroke="#2c3247" stroke-width=".6"/>';
                    }
                    o += '<rect x="' + f1(x0 + bw * bi - 1.6) + '" y="' + f1(ye) + '" width="3.2" height="' + f1(B - 7 - ye) + '" fill="#15192a"/>';
                }
                o += '<rect x="' + f1(x0 - 1.6) + '" y="' + f1(ye) + '" width="' + f1(w + 3.2) + '" height="' + f1((B - 7 - ye) * 0.2) + '" fill="#141826"/>';          // the head beam and brackets in shadow
                o += '<path d="';
                for (var kb = 0; kb <= bays * 2; kb++) o += 'M' + f1(x0 + bw * kb / 2 - 2) + ' ' + f1(ye + (B - 7 - ye) * 0.06) + 'h4v' + f1((B - 7 - ye) * 0.1) + 'h-4z';
                o += '" fill="#232839"/>';
                o += '<rect x="' + f1(x0 - 4) + '" y="' + f1(B - 12) + '" width="' + f1(w + 8) + '" height="2" fill="#2c3247"/><path d="';          // the veranda rail
                for (var rp = 0; rp <= bays * 3; rp++) o += 'M' + f1(x0 - 4 + (w + 8) * rp / (bays * 3)) + ' ' + f1(B - 12) + 'v5';
                o += '" stroke="#2c3247" stroke-width="1"/>';
                return o;
            };
            var hondo = function(cx, w) {
                var ww = w * 0.72, ye = B - w * 0.2, o = '<ellipse cx="' + f1(cx) + '" cy="' + f1(B - 2) + '" rx="' + f1(w * 0.5) + '" ry="14" fill="url(#wvTGlow)"/>';
                o += walls(cx, ww, w * 0.2, 7, 1, ye) + roof(cx, ye + 2, w, w * 0.3, 1);
                // the porch roof over the steps, its two lanterns, and the steps
                o += '<rect x="' + f1(cx - w * 0.07) + '" y="' + f1(ye + 6) + '" width="3" height="' + f1(B - ye - 13) + '" fill="#15192a"/><rect x="' + f1(cx + w * 0.07 - 3) + '" y="' + f1(ye + 6) + '" width="3" height="' + f1(B - ye - 13) + '" fill="#15192a"/>';
                o += roof(cx, ye + w * 0.035, w * 0.22, w * 0.07, 0);
                o += '<path d="M' + f1(cx - w * 0.06) + ' ' + f1(B - 7) + 'h' + f1(w * 0.12) + 'l4 7h' + f1(-w * 0.12 - 8) + 'z" fill="#4a506a"/><path d="M' + f1(cx - w * 0.06 - 2) + ' ' + f1(B - 3.5) + 'h' + f1(w * 0.12 + 4) + '" stroke="#c9d1e6" stroke-width="1.2"/>';
                [-1, 1].forEach(function(sd) { var lx = cx + sd * w * 0.045, ly = ye + w * 0.07; o += '<path d="M' + f1(lx) + ' ' + f1(ly - 4) + 'v4" stroke="#15192a" stroke-width=".8"/><ellipse cx="' + f1(lx) + '" cy="' + f1(ly + 4) + '" rx="3.6" ry="5" fill="#ffe2a8"/><ellipse cx="' + f1(lx) + '" cy="' + f1(ly + 4) + '" rx="10" ry="10" fill="url(#wvTGlow)"/>'; });
                return o;
            };
            var smallHall = function(cx, w, lit) { var ye = B - w * 0.22; return walls(cx, w * 0.7, w * 0.22, 3, lit, ye) + roof(cx, ye + 2, w, w * 0.3, 0); };
            var romon = function(cx, w) {          // the gate: lower posts and its wide roof, a balcony with its rail, the upper hall and its roof
                var o = '', y1 = B - w * 0.42;
                for (var pi = 0; pi < 4; pi++) o += '<rect x="' + f1(cx - w * 0.33 + pi * w * 0.22 - 2.5) + '" y="' + f1(y1) + '" width="5" height="' + f1(B - y1) + '" fill="#1d2232"/>';
                o += '<rect x="' + f1(cx - w * 0.11) + '" y="' + f1(y1 + 4) + '" width="' + f1(w * 0.22) + '" height="' + f1(B - y1 - 4) + '" fill="#0d1020"/>';          // the passage
                o += '<rect x="' + f1(cx - w * 0.36) + '" y="' + f1(y1) + '" width="' + f1(w * 0.72) + '" height="' + f1(w * 0.05) + '" fill="#141826"/>';
                var yu = y1 - w * 0.1;
                o += roof(cx, y1 + 2, w * 0.98, w * 0.16, 0);
                o += '<rect x="' + f1(cx - w * 0.3) + '" y="' + f1(yu - w * 0.18) + '" width="' + f1(w * 0.6) + '" height="' + f1(w * 0.2) + '" fill="#232839"/>';
                o += '<rect x="' + f1(cx - w * 0.36) + '" y="' + f1(yu - w * 0.02) + '" width="' + f1(w * 0.72) + '" height="2.4" fill="#2c3247"/><path d="M' + f1(cx - w * 0.36) + ' ' + f1(yu - w * 0.02) + 'h' + f1(w * 0.72) + '" stroke="#c9d1e6" stroke-width="1.2"/><path d="';
                for (var bp = 0; bp <= 12; bp++) o += 'M' + f1(cx - w * 0.36 + w * 0.72 * bp / 12) + ' ' + f1(yu - w * 0.02) + 'v' + f1(w * 0.05);
                o += '" stroke="#2c3247" stroke-width="1"/>';
                o += '<rect x="' + f1(cx - w * 0.3) + '" y="' + f1(yu - w * 0.18) + '" width="' + f1(w * 0.6) + '" height="' + f1(w * 0.04) + '" fill="#141826"/>';
                return o + roof(cx, yu - w * 0.16, w, w * 0.32, 1);
            };
            // cedars behind it all: tall, dark, ragged, a little snow caught on their boughs
            var grove = '', snowy = '';
            for (var gx = -20; gx < BW + 20; gx += 12 + rb2() * 22) {
                var gh = 100 + rb2() * 110, gw = 18 + rb2() * 14, gd = 'M' + f1(gx) + ' ' + f1(B - gh), sd2 = '';
                for (var gt = 1; gt <= 7; gt++) { var gy2 = B - gh + gh * gt / 7.6, gw2 = gw * (0.15 + 0.85 * gt / 7) * (0.9 + rb2() * 0.2); gd += 'L' + f1(gx + gw2 / 2) + ' ' + f1(gy2) + 'L' + f1(gx + gw2 * 0.28) + ' ' + f1(gy2 - 3); if (rb2() < 0.5) sd2 += 'M' + f1(gx + gw2 * 0.15) + ' ' + f1(gy2 - 4) + 'l' + f1(gw2 * 0.3) + ' 3.4'; }
                gd += 'L' + f1(gx + gw / 2) + ' ' + B + 'H' + f1(gx - gw / 2);
                for (var gt2 = 7; gt2 >= 1; gt2--) { var gy3 = B - gh + gh * gt2 / 7.6, gw3 = gw * (0.15 + 0.85 * gt2 / 7); gd += 'L' + f1(gx - gw3 * 0.28) + ' ' + f1(gy3 - 3) + 'L' + f1(gx - gw3 / 2) + ' ' + f1(gy3); }
                grove += '<path d="' + gd + 'z"/>'; snowy += sd2;
            }
            tp += '<g fill="#0d1226" opacity=".85">' + grove + '</g><path d="' + snowy + '" stroke="#8c97b8" stroke-width="1.2" opacity=".35" stroke-linecap="round"/>';
            var haze = function(o, op) { return '<g opacity="' + op + '">' + o + '</g>'; };
            if (BWide) tp += haze(smallHall(BW * 0.07, 190, 0), 0.55) + haze(smallHall(BW * 0.65, 220, 1), 0.72) + haze(hondo(BW * 0.29, 400) + romon(BW * 0.87, 180), 0.92);
            else tp += haze(smallHall(BW * 0.68, 170, 1), 0.62) + haze(hondo(BW * 0.22, 300) + romon(BW * 0.95, 140), 0.92);
            // the night sky: the real winter stars over Japan at midnight — Orion high in the south, Sirius below it, Taurus with
            // Aldebaran and the Pleiades above to the right, Procyon to the left — faint stars everywhere, the winter Milky Way
            var sky = wvWinterSky(BW, Math.max(480, window.innerHeight || 700)), nightStars = '';
            sky.stars.forEach(function(st) {
                if (st.mag > 2.3 || st.x < -10 || st.x > BW + 10 || st.y < -10) return;
                var sz = (8 + (2.3 - st.mag) * 3.8).toFixed(1);
                nightStars += '<span class="wv-wstar" style="left:' + f1(st.x) + 'px;top:' + f1(st.y) + 'px;--s:' + sz + 'px;--c:' + st.c + ';--tw:' + r(1.6, 3.4).toFixed(1) + 's;--delay:' + (-r(0, 3)).toFixed(1) + 's"></span>';
            });
            nightStars = '<canvas class="wv-starcv"></canvas>' + nightStars;
            out += '<div class="wv-sky night deep"></div>' + nightStars + '<div class="wv-ground snowy"></div><div class="wv-temples"><svg viewBox="0 0 ' + BW + ' ' + B + '" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs>' + defs + '</defs>' + tp + '</svg></div><div class="wv-tower">' + tower + '<span class="wv-bellglow"></span>' + towerLamp(44) + towerLamp(196) +
                '<span class="wv-ring" style="--delay:0s"></span><span class="wv-ring" style="--delay:.22s"></span><span class="wv-ring" style="--delay:.44s"></span>' +
                '<div class="wv-bell">' + bell + '</div><canvas class="wv-ringer"></canvas></div>';      // the monk and the log: wvRinger()
            // wide screens only: a pagoda in the distance, and two lit stone lanterns (石灯籠) with snow on their roofs
            var tiers = '';
            for (var ti = 0; ti < 5; ti++) { var ty = 236 - ti * 40, tw = 92 - ti * 10; tiers += '<rect x="' + (50 - tw * 0.32) + '" y="' + (ty - 20) + '" width="' + (tw * 0.64) + '" height="22"/><path d="M' + (50 - tw / 2) + ' ' + (ty - 18) + 'Q' + (50 - tw * 0.3) + ' ' + (ty - 22) + ' ' + (50 - tw * 0.22) + ' ' + (ty - 30) + 'H' + (50 + tw * 0.22) + 'Q' + (50 + tw * 0.3) + ' ' + (ty - 22) + ' ' + (50 + tw / 2) + ' ' + (ty - 18) + 'z"/>'; }
            var pagoda = uri('0 0 100 260', '<g fill="#59607a">' + tiers + '<rect x="48.6" y="20" width="2.8" height="62"/>' + [30, 38, 46, 54, 62].map(function(y) { return '<rect x="45" y="' + y + '" width="10" height="2.4" rx="1"/>'; }).join('') + '<circle cx="50" cy="18" r="3.2"/><rect x="26" y="238" width="48" height="22"/></g>');
            var toro = '<svg viewBox="0 0 60 120" aria-hidden="true"><ellipse cx="30" cy="116" rx="22" ry="3.5" fill="#000" opacity=".12"/><path d="M14 116h32l-3-8H17z" fill="#8e897e"/>' +
                '<rect x="25" y="70" width="10" height="38" fill="#a29d91"/><path d="M16 70h28l-3-6H19z" fill="#97928a"/><rect x="19" y="44" width="22" height="20" fill="#a8a397"/><rect x="24" y="48" width="12" height="12" fill="#ffd27a"/><rect x="24" y="48" width="12" height="12" fill="#fff3c8" opacity=".5"/>' +
                '<path d="M8 44Q16 40 20 32H40Q44 40 52 44Q30 41 8 44z" fill="#8a857a"/><path d="M10 42Q18 37 21 31H39Q42 37 50 42Q30 38.6 10 42z" fill="#f4f6fa"/><rect x="26" y="25" width="8" height="7" rx="2" fill="#97928a"/><path d="M30 13q5 5 3 11h-6q-2-6 3-11z" fill="#8e897e"/><path d="M27.4 20q2.6-4 5.2 0" stroke="#f4f6fa" stroke-width="1.6" fill="none"/></svg>';
            out += '<span class="wv-wide wv-pagoda" style="--img:' + pagoda + '"></span>' +
                '<div class="wv-wide wv-ishidoro" style="left:30%"><span class="wv-tglow"></span>' + toro + '</div><div class="wv-wide wv-ishidoro" style="left:70%"><span class="wv-tglow" style="animation-delay:-.8s"></span>' + toro + '</div>';
        } else if (kind === 'xmas') {
            var bcols = ['#ffd257', '#ff5a5a', '#5fd38a', '#5aa8ff', '#ff8ad8'];
            // a string of lights along the top (it droops twice); the bulbs blink
            var xw = wvWire(26, 50);
            out += '<div class="wv-xlights"><svg viewBox="0 0 ' + Math.round(xw.W) + ' 64" preserveAspectRatio="none" aria-hidden="true"><path d="' + xw.d + '" stroke="#3d4a3a" stroke-width="1.2" fill="none" vector-effect="non-scaling-stroke"/></svg>';
            xw.pts.forEach(function(pt, bi) {
                out += '<span class="wv-xbulb" style="left:' + pt[0].toFixed(1) + 'px;top:' + (pt[1] + 1).toFixed(1) + 'px;--c:' + bcols[bi % 5] + ';animation-delay:' + (-(bi * 0.37) % 1.4).toFixed(2) + 's"></span>';
            });
            out += '</div>';
            // fir trees in the background, built the way real ones grow: branches leave the trunk at each level, longer toward
            // the bottom, drooping at the tips, with ragged needle edges; snow lies in uneven clumps on top of the branches.
            // Some are decorated (lights on the branches, ornaments hanging from the tips, a star on top).
            var fir = function(seed, deco, star) {
                var rn = wvRand(seed), q = wvQuad, P = function(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); };
                var greens = ['#1e4a34', '#22533a', '#1a4230', '#275c41'], lc = ['#ffd257', '#ff5a5a', '#5fd38a', '#5aa8ff', '#ff8ad8'];
                var levels = [], out2 = '', snowTop = '', lights = '', orns = '';
                for (var y = 8; y <= 182; y += 4.6 + rn() * 1.2) levels.push(y);
                // a dark core so there are no gaps by the trunk
                out2 += '<path d="M50 4L' + (50 - 22).toFixed(1) + ' 186L' + (50 + 22).toFixed(1) + ' 186z" fill="#14362a"/>';
                out2 += '<rect x="47.5" y="182" width="5" height="18" fill="#4a3424"/>';
                var branches = [];
                levels.forEach(function(y) {
                    var L = (3 + (y - 8) / 174 * 44) * (0.82 + rn() * 0.3);
                    [-1, 1].forEach(function(side) {
                        var Ls = L * (0.92 + rn() * 0.24);
                        branches.push({ y: y, side: side, p0: [50, y], p1: [50 + side * Ls * 0.55, y - Ls * 0.04], p2: [50 + side * Ls, y + Ls * 0.28 + rn() * 3], L: Ls, c: greens[Math.floor(rn() * 4)] });
                    });
                    // a shorter sprig toward the front, so the middle of the tree is full too
                    var fs = rn() < 0.5 ? -1 : 1, Lf = L * (0.45 + rn() * 0.2), x0 = 50 + fs * L * 0.15;
                    branches.push({ y: y + 2, side: fs, p0: [x0, y + 2], p1: [x0 + fs * Lf * 0.5, y + 2], p2: [x0 + fs * Lf, y + 2 + Lf * 0.35], L: Lf, c: greens[Math.floor(rn() * 4)] });
                });
                // bottom to top, so each branch hangs over the one below it
                branches.slice().reverse().forEach(function(b) {
                    var up = [], low = [], N = 10, th0 = 3 + b.L * 0.2;
                    for (var k = 0; k <= N; k++) {
                        var t = k / N, pt = q(b.p0, b.p1, b.p2, t);
                        up.push([pt[0], pt[1] - (k % 2 ? rn() * 0.9 : 0)]);
                        var th = th0 * (1 - t) + 0.9 + (k % 2 ? 1.5 + rn() * 1.6 : 0);
                        low.push([pt[0] - b.side * (k % 2 ? rn() * 1.2 : 0), pt[1] + th]);
                    }
                    out2 += '<path d="M' + up.map(P).join('L') + 'L' + low.reverse().map(P).join('L') + 'z" fill="' + b.c + '"' + (b.side > 0 ? ' opacity=".92"' : '') + '/>';
                    if (b.side > 0) out2 += '<path d="M' + up.map(P).join('L') + 'L' + low.map(P).join('L') + 'z" fill="#0c2419" opacity=".18"/>';
                    // snow on top of the branch
                    if (rn() < 0.88 && b.L > 4) {
                        var ta = 0.3 + rn() * 0.2, tb = Math.min(1, ta + 0.3 + rn() * 0.4), su = [], sl = [], M = 8;
                        for (var m = 0; m <= M; m++) {
                            var tt = ta + (tb - ta) * m / M, sp = q(b.p0, b.p1, b.p2, tt), thick = (1.8 + rn() * 2.2) * Math.sin(Math.PI * m / M) + 0.4;
                            su.push([sp[0], sp[1] - thick]); sl.push([sp[0], sp[1] + 0.5]);
                        }
                        snowTop += '<path d="M' + su.map(P).join('L') + 'L' + sl.reverse().map(P).join('L') + 'z" fill="#f3f7fc"/>';
                    }
                    if (deco) {
                        if (rn() < 0.18 && b.L > 12) {
                            var oc = ['#d63a3a', '#e6b422', '#c0c6d0', '#3b6fd8'][Math.floor(rn() * 4)], tip = b.p2;
                            orns += '<path d="M' + tip[0].toFixed(1) + ' ' + (tip[1] + 1).toFixed(1) + 'v2.4" stroke="#b9a46a" stroke-width=".5"/><circle cx="' + tip[0].toFixed(1) + '" cy="' + (tip[1] + 5.6).toFixed(1) + '" r="2.6" fill="' + oc + '"/><circle cx="' + (tip[0] - 0.8).toFixed(1) + '" cy="' + (tip[1] + 4.7).toFixed(1) + '" r=".8" fill="#fff" opacity=".7"/>';
                        }
                    }
                });
                for (var ly = 16, row = 0; ly <= 178; ly += 8, row++) {
                    var lhw = (3 + (ly - 8) / 174 * 44) * 0.8, ln = Math.max(1, Math.round(lhw / 7));
                    for (var li = 0; li < ln; li++) {
                        var lx = 50 + (-1 + 2 * (li + 0.5 + (row % 2 ? 0.25 : -0.25)) / ln) * lhw + (rn() - 0.5) * 4, lyy = ly + (rn() - 0.5) * 4, col = lc[Math.floor(rn() * 5)];
                        if (Math.abs(lx - 50) > lhw + 2) continue;
                        lights += '<circle cx="' + lx.toFixed(1) + '" cy="' + lyy.toFixed(1) + '" r="3" fill="' + col + '" opacity=".22"/><circle class="wv-bulb" cx="' + lx.toFixed(1) + '" cy="' + lyy.toFixed(1) + '" r="1.6" fill="' + col + '" style="animation-delay:' + (-rn() * 1.6).toFixed(2) + 's"/>';
                        if (rn() < 0.4) lights += '<path class="wv-tglint" d="M' + (lx - 3.6).toFixed(1) + ' ' + lyy.toFixed(1) + 'h7.2M' + lx.toFixed(1) + ' ' + (lyy - 3.6).toFixed(1) + 'v7.2" stroke="#fff" stroke-width=".7" stroke-linecap="round" style="animation-delay:' + (-rn() * 3).toFixed(2) + 's;animation-duration:' + (2.2 + rn() * 1.6).toFixed(1) + 's"/>';      // it glistens
                    }
                }
                if (false) lights += '<g class="wv-xstar"><path d="M50 -4l2.6 5.4 6 .7-4.4 4.1 1.1 5.9L50 9.2l-5.3 2.9 1.1-5.9-4.4-4.1 6-.7z" fill="#ffd257" stroke="#e0a91c" stroke-width=".8"/></g>';
                return out2 + snowTop + orns + lights;
            };
            // the forest behind: two rows of plain snowy firs, close together, paler with distance (four drawings, used again and again)
            var firImg = [61, 62, 63, 64].map(function(sd) { return "url('data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 100 204">' + fir(sd, 0, 0).replace(/<circle[^>]*>|<path class="wv-tglint"[^>]*>/g, '') + '</svg>') + "')"; });
            var rf = wvRand(99);
            for (var fr = 0; fr < 2; fr++) for (var fx = -3; fx < 104; fx += (fr ? 4.2 : 3.2) + rf() * 2.6) {
                out += '<span class="wv-forest' + (fr ? ' mid' : '') + '" style="--x:' + fx.toFixed(1) + '%;--h:' + ((fr ? 15 : 11) + rf() * (fr ? 6 : 5)).toFixed(1) + 'vh;--img:' + firImg[Math.floor(rf() * 4)] + '"></span>';
            }
            // [center %, height vh, seed, decorated, star, far away]
            [[8, 18, 48, 0, 0, 1], [20, 21, 42, 0, 0, 1], [36, 20, 49, 1, 0, 1], [50, 19, 44, 0, 0, 1], [64, 23, 45, 1, 0, 1], [78, 19, 50, 0, 0, 1], [96, 22, 47, 0, 0, 1], [18, 26, 52, 0, 0, 0], [60, 27, 53, 1, 1, 0], [5, 30, 41, 1, 1, 0], [34, 25, 43, 0, 0, 0], [80, 31, 46, 1, 1, 0]].forEach(function(t) {
                out += '<div class="wv-fir' + (t[5] ? ' far' : '') + '" style="--x:' + t[0] + '%;--h:' + t[1] + 'vh"><svg viewBox="0 -4 100 204" aria-hidden="true">' + fir(t[2], t[3], t[4]) + '</svg></div>';
            });
            out += '<div class="wv-snowground"></div>';
            // a 雪だるま: lumpy packed snow with a fine grain and blue shadows, charcoal eyes and pebbles, a carrot, twig arms,
            // a knitted scarf and a felt Santa hat with fuzzy trim, settled into a drift
            var pebbles = '';
            [[57, 82], [62.5, 85.5], [70, 86.8], [77.5, 85.5], [83, 82]].forEach(function(q, qi) {
                pebbles += '<path d="M' + (q[0] - 1.6) + ' ' + q[1] + 'l1-1.5 1.8.2.9 1.4-.8 1.4-1.9.1z" fill="#252527"/>';
            });
            out += '<div class="wv-snowman"><svg viewBox="0 0 140 180" aria-hidden="true"><defs>' +
                '<radialGradient id="ysBall" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f1f5fa"/><stop offset=".85" stop-color="#d3deeb"/><stop offset="1" stop-color="#b6c6db"/></radialGradient>' +
                '<linearGradient id="ysPile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dbe5f1"/></linearGradient>' +
                '<linearGradient id="ysHat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5493f"/><stop offset="1" stop-color="#a3201d"/></linearGradient>' +
                '<linearGradient id="ysCarrot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7a650"/><stop offset="1" stop-color="#d4621a"/></linearGradient>' +
                '<pattern id="ysKnit" width="3" height="4" patternUnits="userSpaceOnUse"><path d="M1.5 0v4" stroke="#8f1d1b" stroke-width=".8" opacity=".55"/></pattern>' +
                '<filter id="ysSnow" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" result="lo"/>' +
                '<feDisplacementMap in="SourceGraphic" in2="lo" scale="5" xChannelSelector="R" yChannelSelector="G" result="lumpy"/>' +
                '<feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="9" result="hi"/><feDiffuseLighting in="hi" surfaceScale="1" lighting-color="#ffffff" result="grain"><feDistantLight azimuth="235" elevation="72"/></feDiffuseLighting>' +
                '<feComponentTransfer in="grain" result="soft"><feFuncR type="linear" slope=".3" intercept=".72"/><feFuncG type="linear" slope=".3" intercept=".72"/><feFuncB type="linear" slope=".3" intercept=".74"/></feComponentTransfer>' +
                '<feComposite in="soft" in2="lumpy" operator="in" result="g2"/><feBlend in="lumpy" in2="g2" mode="multiply"/></filter>' +
                '<filter id="ysFur" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4"/></filter>' +
                '<filter id="ysBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>' +
                '<ellipse cx="70" cy="168" rx="54" ry="8" fill="#93a9c6" opacity=".5" filter="url(#ysBlur)"/>' +
                // twig arms
                '<g stroke="#5b3d24" stroke-linecap="round" fill="none"><path d="M34 124L18 110L5 92" stroke-width="2.8"/><path d="M18 110L8 108M12 101l-7-2M9 96l-1-8" stroke-width="1.5"/>' +
                '<path d="M106 121l14-14 15-17" stroke-width="2.8"/><path d="M120 107l9 2M127 99l5 1M131 95l2-8" stroke-width="1.5"/></g>' +
                '<path d="M20 111l-2-1M122 106l2 0" stroke="#7a5638" stroke-width=".8"/>' +
                '<circle cx="70" cy="130" r="44" fill="url(#ysBall)" filter="url(#ysSnow)"/>' +
                '<ellipse cx="70" cy="96" rx="22" ry="5" fill="#8fa5c2" opacity=".55" filter="url(#ysBlur)"/>' +
                '<circle cx="70" cy="68" r="29" fill="url(#ysBall)" filter="url(#ysSnow)"/>' +
                '<path d="M66 116l2-1.6 2.6.3 1 2-1 2-2.6.2-1.5-1.3z" fill="#252527"/><path d="M66 132l2.2-1.4 2.4.4 1 2-1.2 1.9-2.4.1-1.6-1.4z" fill="#252527"/><path d="M66.5 148l2-1.3 2.4.4.8 1.8-1 1.8-2.3.1-1.5-1.2z" fill="#252527"/>' +
                // scarf
                '<path d="M42 90Q70 104 98 90l1 9Q70 114 41 99z" fill="#c62f2c"/><path d="M42 90Q70 104 98 90l1 9Q70 114 41 99z" fill="url(#ysKnit)"/>' +
                '<path d="M43 93Q70 107 97.5 93M42 96.5Q70 110.5 98.5 96.5" stroke="#f2efe8" stroke-width="1.8" fill="none" opacity=".9"/>' +
                '<path d="M80 101l9 30-10 2.4-7-30z" fill="#b8292a"/><path d="M80 101l9 30-10 2.4-7-30z" fill="url(#ysKnit)"/><path d="M74.5 112l10-2.6M76.5 120l10-2.6" stroke="#f2efe8" stroke-width="1.8" opacity=".9"/>' +
                '<path d="M79.6 133.5v5M82.4 132.8v5M85.2 132.2v5M88 131.6v5" stroke="#b8292a" stroke-width="1.3" stroke-linecap="round"/>' +
                // face: charcoal eyes, carrot, pebble smile
                '<path d="M58.5 62l2.6-2.2 3 .6 1.1 2.8-1.6 2.6-3.2.2-1.9-1.8z" fill="#1d1d1f"/><path d="M59.8 61.6l1.4-.9" stroke="#6a6a70" stroke-width=".7"/>' +
                '<path d="M75 61.6l2.8-2 2.9.8.9 2.9-1.8 2.4-3.1 0-1.8-2z" fill="#1d1d1f"/><path d="M76.3 61.2l1.4-.9" stroke="#6a6a70" stroke-width=".7"/>' +
                '<ellipse cx="62" cy="73" rx="5" ry="3" fill="#ffb3bd" opacity=".25"/><ellipse cx="80" cy="73" rx="5" ry="3" fill="#ffb3bd" opacity=".25"/>' +
                '<path d="M69 69.5C77 68.4 90 70.6 103 76.2C90 77.6 78 78 69 76.8z" fill="url(#ysCarrot)"/><path d="M75 69.6l.8 2.2M81 70.2l.6 2.4M87 71.6l.4 2.2M93 73l.3 1.8" stroke="#b9561a" stroke-width=".7"/><ellipse cx="69.3" cy="73.2" rx="1.6" ry="3.6" fill="#c25a17"/>' +
                pebbles +
                // hat: felt, a fold, fuzzy trim and pom-pom
                '<ellipse cx="70" cy="48" rx="26" ry="5" fill="#7d93b4" opacity=".45" filter="url(#ysBlur)"/>' +
                '<g transform="rotate(-10 70 44)"><path d="M47 44C50 24 65 12 84 14C97 16 107 25 110 40C104 33 96 30 90 32C92 36 93 40 93 44z" fill="url(#ysHat)"/>' +
                '<path d="M84 14C97 16 107 25 110 40C104 33 96 30 90 32C88 25 86 19 84 14z" fill="#7f1715" opacity=".45"/><path d="M58 28q10-6 22-4" stroke="#f06a5e" stroke-width="1.2" fill="none" opacity=".6"/>' +
                '<rect x="42" y="39" width="56" height="11" rx="5.5" fill="#fbfbfb" filter="url(#ysFur)"/><rect x="42" y="46" width="56" height="4" rx="2" fill="#d9e1ec" opacity=".7" filter="url(#ysFur)"/>' +
                '<circle cx="110" cy="42" r="7" fill="#fbfbfb" filter="url(#ysFur)"/><circle cx="112" cy="44.5" r="4" fill="#d9e1ec" opacity=".6"/></g>' +
                // settled into a drift
                '<path d="M8 180L10 170Q24 160 40 166Q54 157 72 164Q90 156 106 165Q122 160 132 170L134 180z" fill="url(#ysPile)" filter="url(#ysSnow)"/>' +
                '<g fill="#fff"><circle cx="54" cy="52" r=".9"/><circle cx="88" cy="118" r=".8"/><circle cx="47" cy="128" r=".7"/><circle cx="60" cy="163" r=".8"/></g></svg></div>';
            out += '<canvas class="wv-kids"></canvas>';      // two children in a snowball fight: wvKids()
        } else if (kind === 'shogatsu' || kind === 'hoo') {
            out += '<canvas class="wv-springcanvas"></canvas>';      // drawn by wvSpring(cv, 1 or 2): 初日の出 over Fuji
        } else if (kind === 'fuji') {
            out += '<canvas class="wv-springcanvas"></canvas>';      // drawn by wvSpring() (the rare spring scene)
        } else if (kind === 'obon') {
            // 灯籠流し at dusk: an evening sky, the far bank with lit windows, 提灯 strung across the top,
            // paper lanterns floating down the river with their glow on the water, and fireflies along the bank
            var rb = wvRand(816), bank = '';
            for (var hx = 0; hx <= 400; hx += 8) bank += 'L' + hx + ' ' + (22 + Math.sin(hx * 0.02) * 6 + Math.sin(hx * 0.07) * 3 + rb() * 3).toFixed(1);
            var houses = '', windows = '';
            [[40, 26], [70, 20], [140, 24], [168, 30], [250, 22], [300, 27], [345, 21]].forEach(function(h) {
                var w = h[1], x = h[0], top = 30 - w * 0.55;
                houses += '<path d="M' + (x - 2) + ' ' + (top + 7) + 'L' + (x + w / 2) + ' ' + top + 'L' + (x + w + 2) + ' ' + (top + 7) + 'V60H' + (x - 2) + 'z"/>';
                for (var wn = 0; wn < 2; wn++) if (rb() < 0.75) windows += '<rect x="' + (x + 3 + wn * (w / 2)) + '" y="' + (top + 11) + '" width="' + (w / 4).toFixed(1) + '" height="4" rx=".5"/>';
            });
            out += '<div class="wv-obon-stars">' + Array.apply(null, Array(26)).map(function() { return '<i style="left:' + (rb() * 100).toFixed(1) + '%;top:' + (Math.pow(rb(), 1.4) * 40).toFixed(1) + '%;animation-delay:' + (-rb() * 3).toFixed(2) + 's"></i>'; }).join('') + '</div>' +
                '<div class="wv-bank"><svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60L0 28' + bank + 'L400 60z" fill="#1b1631"/><g fill="#1b1631">' + houses + '</g>' +
                '<path d="M210 30l14-9h40l14 9-6 1v29h-56v-29z" fill="#17122b"/><path d="M216 22h52" stroke="#17122b" stroke-width="3"/><g fill="#ffcf7a" opacity=".85">' + windows + '</g></svg></div>' +
                '<canvas class="wv-obon-water"></canvas>';      // drawn by wvObon()
            // 提灯 on a wire strung across the whole top (none behind the logo)
            var cc = ['#d63a3a', '#f4efe6', '#d63a3a', '#e8833a'], bw = wvWire(34, 48);
            out += '<div class="wv-bonwire"><svg viewBox="0 0 ' + Math.round(bw.W) + ' 70" preserveAspectRatio="none" aria-hidden="true"><path d="' + bw.d + '" stroke="#2a2340" stroke-width="1.2" fill="none" vector-effect="non-scaling-stroke"/></svg>';
            bw.pts.forEach(function(pt, ci) {
                var col = cc[ci % 4];
                out += '<span class="wv-bonlamp" style="left:' + pt[0].toFixed(1) + 'px;top:' + pt[1].toFixed(1) + 'px;animation-delay:' + (-ci * 0.4).toFixed(1) + 's"><svg viewBox="0 0 20 28" aria-hidden="true">' +
                    '<path d="M10 0v3" stroke="#2a2340" stroke-width="1"/><rect x="6.5" y="3" width="7" height="2.2" rx=".5" fill="#2b2420"/>' +
                    '<ellipse cx="10" cy="14.5" rx="7" ry="9" fill="' + col + '"/><ellipse cx="10" cy="14.5" rx="7" ry="9" fill="url(#wvLampGlow)"/>' +
                    '<path d="M3.3 11h13.4M3 14.5h14M3.3 18h13.4" stroke="#000" stroke-opacity=".18" stroke-width=".6"/>' +
                    '<rect x="6.5" y="23.3" width="7" height="2.2" rx=".5" fill="#2b2420"/></svg></span>';
            });
            out += '<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="wvLampGlow" cx="45%" cy="45%" r="60%"><stop offset="0" stop-color="#fff3c4" stop-opacity=".85"/><stop offset=".6" stop-color="#ffb347" stop-opacity=".25"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
                '<linearGradient id="wvToroPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dc"/><stop offset=".6" stop-color="#ffd98a"/><stop offset="1" stop-color="#f3a24a"/></linearGradient></defs></svg></div>';
            for (var fi = 0; fi < 30; fi++) {
                var big = rb() < 0.3;
                out += '<span class="wv-ff' + (big ? ' big' : '') + '" style="left:' + (rb() * 96).toFixed(1) + '%;bottom:' + (18 + rb() * 40).toFixed(1) + '%;--fx:' + ((rb() - 0.5) * 110).toFixed(0) + 'px;--fy:' + ((rb() - 0.5) * 70).toFixed(0) + 'px;--dur:' + (2.4 + rb() * 2.8).toFixed(1) + 's;--bl:' + (1.1 + rb() * 1.4).toFixed(1) + 's;animation-delay:' + (-rb() * 4).toFixed(1) + 's,' + (-rb() * 2).toFixed(1) + 's"></span>';
            }
        } else if (kind === 'tanabata' || kind === 'nagare') {
            // 天の川 with 織姫 (Vega) and 彦星 (Altair) on either side, and a 笹飾り
            var rn = wvRand(7), stars = '';
            for (var i = 0; i < 170; i++) {
                var gs = (rn() + rn() + rn() - 1.5) / 1.5;
                stars += '<circle cx="' + (rn() * 600).toFixed(1) + '" cy="' + (70 + gs * 42).toFixed(1) + '" r="' + (0.4 + rn() * rn() * 1.3).toFixed(2) + '" opacity="' + (0.3 + rn() * 0.7).toFixed(2) + '"/>';
            }
            var g = '', culm = [[34, 400], [40, 240], [66, 40]];
            g += '<path d="M34 400Q40 240 66 40" stroke="#6f9a4a" stroke-width="7" fill="none" stroke-linecap="round"/>';
            [0.15, 0.3, 0.45, 0.6, 0.75, 0.88].forEach(function(t) { var p = wvQuad(culm[0], culm[1], culm[2], t); g += '<path d="M' + (p[0] - 5).toFixed(1) + ' ' + p[1].toFixed(1) + 'h10" stroke="#557a36" stroke-width="2.2"/>'; });
            var branches = [[0.5, 150, 210], [0.62, 172, 150], [0.74, 152, 92], [0.86, 124, 44], [0.97, 92, 10], [0.56, 2, 196], [0.8, -4, 100]].map(function(b) {
                var p = wvQuad(culm[0], culm[1], culm[2], b[0]), c = [(p[0] + b[1]) / 2, Math.min(p[1], b[2]) - 10];
                g += '<path d="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'Q' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ' ' + b[1] + ' ' + b[2] + '" stroke="#78a050" stroke-width="2" fill="none"/>';
                return [p, c, [b[1], b[2]]];
            });
            var leaves = '', deco = '', lc = ['#4e8a3c', '#6aa84f', '#3f7a32'];
            branches.forEach(function(br, bi) {
                var left = br[2][0] < br[0][0];
                [0.55, 0.75, 1].forEach(function(t) {
                    var p = wvQuad(br[0], br[1], br[2], t);
                    for (var k = 0; k < 4; k++) {
                        var a = (left ? 180 - (20 + k * 34) : 20 + k * 34) + (rn() - 0.5) * 22, len = 0.8 + rn() * 0.5;
                        leaves += '<path d="M0 0Q14 -5 30 0Q14 5 0 0z" fill="' + lc[(k + bi) % 3] + '" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ') rotate(' + a.toFixed(0) + ') scale(' + len.toFixed(2) + ')"/>';
                    }
                });
                var tc = ['#d9534f', '#3b6fd8', '#f2c230', '#fafafa', '#8e5bc8', '#2e8b57', '#e8833a'][bi];
                var hp = wvQuad(br[0], br[1], br[2], 0.62), sl = 10 + (bi % 3) * 5;
                deco += '<path d="M' + hp[0].toFixed(1) + ' ' + hp[1].toFixed(1) + 'v' + sl + '" stroke="#b08a4a" stroke-width=".8"/><rect x="' + (hp[0] - 4.5).toFixed(1) + '" y="' + (hp[1] + sl).toFixed(1) + '" width="9" height="30" rx=".8" fill="' + tc + '"' + (tc === '#fafafa' ? ' stroke="#ccc" stroke-width=".6"' : '') + '/>';
                if (bi === 1 || bi === 3) {
                    var sp = wvQuad(br[0], br[1], br[2], 0.88);
                    deco += '<path d="M' + sp[0].toFixed(1) + ' ' + sp[1].toFixed(1) + 'v14" stroke="#b08a4a" stroke-width=".8"/><path transform="translate(' + (sp[0] - 8).toFixed(1) + ' ' + (sp[1] + 12).toFixed(1) + ') scale(.8)" d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3.1-5.4 3.1 1.2-6-4.5-4.2 6.1-.7z" fill="#e6b422"/>';
                }
            });
            out += '<div class="wv-sky night"></div><div class="wv-milky"><svg viewBox="0 0 600 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + stars + '</svg></div>' +
                '<span class="wv-star wv-vega"></span><span class="wv-star wv-altair"></span>' +
                '<div class="wv-sasa"><svg viewBox="0 0 200 400" preserveAspectRatio="xMinYMax meet" aria-hidden="true">' + g + leaves + deco + '</svg></div>' +
                '<div class="wv-wide wv-sasa-r"><div class="wv-sasa"><svg viewBox="0 0 200 400" preserveAspectRatio="xMinYMax meet" aria-hidden="true">' + g + leaves + deco + '</svg></div></div>';      // wide screens only
            // 流れ星 (very rare): a bright shooting star streaks down across the Milky Way, then a fainter one
            if (kind === 'nagare') out = out.replace('<div class="wv-sasa">', '<canvas class="wv-meteorcv"></canvas><div class="wv-sasa">');      // drawn by wvMeteors()
        } else if (kind === 'jlpt') {
            // daruma: glossy body, 鶴 eyebrows and 亀 beard, gold trim and flourishes, his right eye painted
            out += '<div class="wv-darumawrap"><div class="wv-daruma"><svg viewBox="0 0 100 112" aria-hidden="true"><defs>' +
                '<radialGradient id="wvDarumaBody" cx="34%" cy="26%" r="82%"><stop offset="0" stop-color="#f4675a"/><stop offset=".42" stop-color="#d5322b"/><stop offset="1" stop-color="#9e1b18"/></radialGradient>' +
                '<radialGradient id="wvDarumaFace" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#f1e3c8"/></radialGradient></defs>' +
                '<path d="M50 3C78 3 95 26 95 58C95 90 76 109 50 109C24 109 5 90 5 58C5 26 22 3 50 3z" fill="url(#wvDarumaBody)"/>' +
                '<ellipse cx="29" cy="24" rx="7" ry="13" transform="rotate(28 29 24)" fill="#fff" opacity=".22"/><ellipse cx="24" cy="31" rx="2" ry="4" transform="rotate(28 24 31)" fill="#fff" opacity=".5"/>' +
                '<path d="M15 74c6 11 15 17 26 19M85 74c-6 11-15 17-26 19" stroke="#e6b422" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
                '<path d="M14 86c1-5 7-5 8-1 1 3-3 5-5 3M86 86c-1-5-7-5-8-1-1 3 3 5 5 3" stroke="#e6b422" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
                '<path d="M50 14C70 14 81 27 81 43C81 60 68 72 50 72C32 72 19 60 19 43C19 27 30 14 50 14z" fill="url(#wvDarumaFace)" stroke="#d9a521" stroke-width="2.8"/>' +
                '<path d="M50 17.5C67.5 17.5 77.5 29 77.5 43C77.5 58 66 68.5 50 68.5C34 68.5 22.5 58 22.5 43C22.5 29 32.5 17.5 50 17.5z" fill="none" stroke="#e8c76a" stroke-width=".7"/>' +
                '<path d="M25 35C28 25 39 22 46 29C39 27.5 32 30 27 37zM75 35C72 25 61 22 54 29C61 27.5 68 30 73 37z" fill="#1a1a1a"/>' +
                '<circle cx="38" cy="43" r="8" fill="#fff" stroke="#1a1a1a" stroke-width="1.4"/><circle cx="62" cy="43" r="8" fill="#fff" stroke="#1a1a1a" stroke-width="1.4"/>' +
                '<circle cx="38" cy="43" r="5.8" fill="#111"/><circle cx="36" cy="41" r="1.4" fill="#fff" opacity=".9"/>' +
                '<path d="M47 51.5q3 3 6 0" stroke="#b8322c" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
                '<path d="M30 58C36 52.5 44 53.5 50 58.5C56 53.5 64 52.5 70 58C64 57 56 59 50 63C44 59 36 57 30 58z" fill="#1a1a1a"/>' +
                '<path d="M23 46c-3 6-1 12 4 16M77 46c3 6 1 12-4 16" stroke="#1a1a1a" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
                '<path d="M27 62c-3.5 1-3.5 5.5 0 5.5 2 0 2.5-2 1-3M73 62c3.5 1 3.5 5.5 0 5.5-2 0-2.5-2-1-3" stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
                '<path d="M46 66.5q4 2 8 0" stroke="#b8322c" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
                '<text x="50" y="98" text-anchor="middle" font-size="19" fill="#f8d66d" stroke="#7d1512" stroke-width=".7" paint-order="stroke" style="font-family: var(--mincho); font-weight: 800">合格</text></svg></div></div>';
            // wide screens only: a 絵馬掛所: a wooden rack under a little copper-green roof, crowded with 絵馬 (wishes for passing),
            // each hung on a red cord through a hole and swaying a little; some have a painted sun or a sakura flower
            var ema = '', words = ['合格', '必勝', '合格|祈願', '夢', '努力', '合格', '感謝', '第一|志望', '合格', '健康', '必勝', '合格', '祈', 'N1|合格', '合格', '努力', '一発|合格', '夢', '合格', '必勝', '願', '合格', '感謝', '合格', '祈願', '合格', '満点'], re = wvRand(11), wi = 0;
            [100, 176, 252].forEach(function(ry, row) {
                for (var ei = 0; ei < 10; ei++) {
                    var ex = 46 + ei * 34 + (row % 2 ? 15 : 0) + (re() - 0.5) * 6, w2 = words[wi++ % words.length], motif = re(), lines = w2.split('|');
                    if (ex > 356) continue;
                    var txt = lines.length > 1 ? '<text x="0" y="22.5" text-anchor="middle" font-size="7.4">' + lines[0] + '</text><text x="0" y="30" text-anchor="middle" font-size="7.4">' + lines[1] + '</text>'
                        : '<text x="0" y="' + (motif < 0.32 ? 29 : 25) + '" text-anchor="middle" font-size="' + (w2.length > 2 ? 7.4 : w2.length > 1 ? 9.6 : 12) + '">' + w2 + '</text>';
                    var paint = lines.length > 1 ? '' : motif < 0.16 ? '<circle cx="0" cy="15" r="3.6" fill="#d23a32"/>' : motif < 0.32 ? '<g fill="#f2a0b8">' + [0, 72, 144, 216, 288].map(function(a) { var t = (a - 90) * Math.PI / 180; return '<circle cx="' + (2.2 * Math.cos(t)).toFixed(2) + '" cy="' + (15 + 2.2 * Math.sin(t)).toFixed(2) + '" r="1.7"/>'; }).join('') + '</g><circle cx="0" cy="15" r=".9" fill="#e6b422"/>' : '';
                    ema += '<g transform="translate(' + ex.toFixed(1) + ' ' + ry + ') rotate(' + ((re() - 0.5) * 14).toFixed(1) + ')"><g class="ema" style="animation-delay:' + (-re() * 2.6).toFixed(2) + 's">' +
                        '<path d="M-4.5 -3L0 6L4.5 -3" stroke="#c0392b" stroke-width="1.2" fill="none"/><path d="M-15 12L0 4L15 12V34H-15z" fill="#000" opacity=".16" transform="translate(1.6 2)"/>' +
                        '<path d="M-15 12L0 4L15 12V34H-15z" fill="url(#wvEmaWood)" stroke="#a8804a" stroke-width=".8"/><path d="M-12 18q6-1 12 0t12 0M-12 27q6 1 12 0t12 0M-13 32.4q6-.8 13 0t12 0" stroke="#c9a46a" stroke-width=".4" fill="none" opacity=".55"/>' +
                        '<circle cx="0" cy="8.4" r=".9" fill="#5a3a22"/>' + paint + '<g fill="#1a120a" style="font-family: var(--mincho); font-weight: 800">' + txt + '</g></g></g>';
                }
            });
            var roofLines = '';
            for (var rl = 40; rl <= 360; rl += 10) roofLines += 'M' + rl + ' 20V' + (50 - Math.max(0, 30 - Math.min(rl - 0, 400 - rl)) * 0) ;
            out += '<div class="wv-wide wv-emarack"><svg viewBox="0 0 400 320" aria-hidden="true"><defs>' +
                '<linearGradient id="wvEmaWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4e0b4"/><stop offset="1" stop-color="#e0c088"/></linearGradient>' +
                '<linearGradient id="wvEmaRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78b0a0"/><stop offset="1" stop-color="#3d7468"/></linearGradient>' +
                '<linearGradient id="wvEmaPost" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3a22"/><stop offset=".45" stop-color="#8e6442"/><stop offset="1" stop-color="#4e321e"/></linearGradient></defs>' +
                '<rect x="18" y="54" width="14" height="266" fill="url(#wvEmaPost)"/><rect x="368" y="54" width="14" height="266" fill="url(#wvEmaPost)"/>' +
                '<path d="M0 52L30 18H370L400 52z" fill="url(#wvEmaRoof)"/><path d="' + roofLines + '" stroke="#2f5e54" stroke-width=".7" opacity=".45"/><rect x="26" y="11" width="348" height="9" rx="2.5" fill="#2f5e54"/><rect x="26" y="11" width="348" height="2.4" rx="1.2" fill="#9cd0c0" opacity=".5"/>' +
                '<rect x="0" y="50" width="400" height="7" fill="#5a3a22"/><rect x="0" y="50" width="400" height="1.6" fill="#8e6442"/>' +
                [100, 176, 252].map(function(y) { return '<rect x="24" y="' + (y - 7) + '" width="352" height="7" fill="#7a5233"/><rect x="24" y="' + (y - 7) + '" width="352" height="1.6" fill="#a07a52"/>'; }).join('') +
                '<path d="M200 57v6" stroke="#5a3a22" stroke-width="1"/><rect x="174" y="62" width="52" height="17" rx="1.5" fill="#f2e2c0" stroke="#6a4428" stroke-width="1"/><text x="200" y="74.4" text-anchor="middle" font-size="9" fill="#2a1a10" style="font-family: var(--mincho); font-weight: 800">絵馬掛所</text>' +
                ema + '</svg></div>';
        }
        return out;
    }
    // a repeatable random sequence (the same plants every time) and a point on a quadratic curve
    function wvRand(seed) { var v = seed % 2147483647; if (v <= 0) v += 2147483646; return function() { v = v * 16807 % 2147483647; return (v - 1) / 2147483646; }; }
    function wvQuad(a, b, c, t) { var u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; }
    // お月見: the full moon, drawn point by point as a sphere seen from the earth. Rough, bright highlands; the dark seas
    // (maria) where they really are (in Japan they make the rabbit pounding mochi), with soft, uneven shores and a mottled
    // floor; young bright craters with their streaks of rays (Tycho, Copernicus, Kepler, Proclus) and the bright spot of
    // Aristarchus; a fine grain of small craters. A full moon is lit from straight behind us, so it stays bright right to
    // its edge. Drawn a few rows per frame while it fades in, and kept for the next time.
    // 除夜の鐘: a monk in a black robe with a 袈裟 over his shoulder rings the bell. He holds the 撞木 back by its red-and-white
    // rope, lets it swing into the bell, leaning in after it, catches it on the rebound and holds it back while the bell
    // hums; then draws it back a little further and lets it go again. The log hangs from the beam on two ropes, so it
    // swings like a pendulum (rising a little at each end). The lantern beside him lights his front edge. Everything is
    // timed from the bell's own swing, so the strike always lands on it.
    function wvRinger(cv) {
        var tower = cv.parentNode, bell = tower.querySelector('.wv-bell'), OX = 120, OY = 90, CW = 190, CH = 190, t0 = performance.now(), k = 0;
        var fit = function() { var rc = cv.getBoundingClientRect(); if (!rc.width) return false; k = rc.width / CW * (window.devicePixelRatio || 1); cv.width = Math.round(CW * k); cv.height = Math.round(CH * k); return true; };
        if (!fit()) { cv._tries = (cv._tries || 0) + 1; if (cv._tries < 60) requestAnimationFrame(function() { if (cv.isConnected) wvRinger(cv); }); return; }
        var ctx = cv.getContext('2d'), L = 54, X0 = 188, AY = 106, ROPE = 82, LH = 12;          // the log: length, where it hangs at rest, the beam, its ropes
        var D_STRIKE = -11, D_BACK = 18, D_WIND = 23;
        var swing = function(p) {          // how far the log is from where it hangs at rest, over one ring (p: 0..1)
            if (p < 0.1) { var u = p / 0.1; return D_WIND + (D_STRIKE - D_WIND) * u * u; }                       // let go: it swings in, faster and faster
            if (p < 0.34) { var v = (p - 0.1) / 0.24; return D_STRIKE + (D_BACK - D_STRIKE) * (1 - (1 - v) * (1 - v)); }      // bounces off; he draws it back
            if (p < 0.78) return D_BACK + 0.6 * Math.sin((p - 0.34) * 18);                                          // holds it while the bell hums
            var w = (p - 0.78) / 0.22; return D_BACK + (D_WIND - D_BACK) * w * w * (3 - 2 * w);                     // and draws it back a little more
        };
        var rot = function(x, y, cx, cy, a) { var c = Math.cos(a), s2 = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s2, cy + (x - cx) * s2 + (y - cy) * c]; };
        var draw = function(p) {
            ctx.setTransform(k, 0, 0, k, -OX * k, -OY * k);
            ctx.clearRect(OX, OY, CW, CH);
            var dx = swing(p), cx = X0 + dx, ly = AY + Math.sqrt(ROPE * ROPE - dx * dx) + LH / 2;          // the log's center
            var sP = Math.max(0, Math.min(1, (D_WIND - dx) / (D_WIND - D_STRIKE)));          // 0: drawn back … 1: at the bell
            // ---- the monk (drawn first; the log and its hanging ropes go in behind him) ----
            var pose = function(q) {          // his pose at a moment of the ring
                var d2 = swing(q), s3 = Math.max(0, Math.min(1, (D_WIND - d2) / (D_WIND - D_STRIKE))), le = -0.1 + 0.36 * s3, hp = [252 - 7 * s3, 223 + 1.5 * s3];
                return { s: s3, lean: le, hip: hp, sh: rot(hp[0] - 1, hp[1] - 40, hp[0], hp[1], -le), head: rot(hp[0] - 1, hp[1] - 51, hp[0], hp[1], -le), mouth: rot(hp[0] - 8, hp[1] - 48, hp[0], hp[1], -le),
                    hand: rot(hp[0] - 13 - 19 * s3, hp[1] - 21 + 3 * s3, hp[0], hp[1], -le) };
            };
            var P = pose(p), lean = P.lean, hip = P.hip, sh = P.sh, head = P.head, hand = P.hand;
            var vel = (swing((p + 0.006) % 1) - swing((p + 0.994) % 1)) / 0.012;          // how fast the log (and his arms) are moving
            var ff = [238 - 5 * sP, 272], bf = [263, 272];
            // his shadow on the stone
            var sg = ctx.createRadialGradient(hip[0] + 4, 272, 0, hip[0] + 4, 272, 22); sg.addColorStop(0, 'rgba(10,8,14,.45)'); sg.addColorStop(1, 'rgba(10,8,14,0)');
            ctx.fillStyle = sg; ctx.save(); ctx.scale(1, 0.22); ctx.fillRect(hip[0] - 22, 272 / 0.22 - 22, 48, 44); ctx.restore();
            // below the waist, seen from the side like the rest of him: a stride toward the bell, the front knee bent, the back
            // leg straight; the long robe hangs over both legs (a crease between them) and swings out to each heel. Feet in
            // profile, toes toward the bell: white 足袋 (the split toe) on 草履; the back heel lifts as he leans into the strike.
            var knee = [ff[0] + 1 - 3 * sP, 247], seat = [hip[0] + 13, hip[1] + 9];
            ctx.fillStyle = '#121219'; ctx.beginPath();
            ctx.moveTo(hip[0] - 11, hip[1] - 3); ctx.quadraticCurveTo(hip[0] - 14, hip[1] + 10, knee[0] - 6, knee[1]);          // the front, over the bent knee
            ctx.quadraticCurveTo(ff[0] - 7, 258, ff[0] - 5, 268.6);
            ctx.quadraticCurveTo((ff[0] + bf[0]) / 2, 271.2, bf[0] + 3, 268.6);          // the hem, low between his legs
            ctx.lineTo(bf[0] + 6, 266); ctx.lineTo(seat[0] + 1, seat[1] + 6);          // the back, straight down the back leg
            ctx.quadraticCurveTo(seat[0] + 1, seat[1] - 6, hip[0] + 10, hip[1] - 3); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(120,120,150,.2)'; ctx.lineWidth = 0.7; ctx.beginPath();
            ctx.moveTo(hip[0] + 1, hip[1] + 8); ctx.quadraticCurveTo(hip[0] + 2, 250, (ff[0] + bf[0]) / 2 + 2, 270);          // the crease between his legs
            ctx.moveTo(hip[0] - 5, hip[1] + 4); ctx.quadraticCurveTo(knee[0] - 2, 240, knee[0] - 3, 252);          // folds over the knee
            ctx.moveTo(seat[0] - 3, seat[1] + 4); ctx.lineTo(bf[0] + 1, 265); ctx.stroke();
            var foot = function(f, lift) {          // toes to the left; lift raises the heel (it pivots on the toes)
                ctx.save(); ctx.translate(f[0] - 5, f[1]); ctx.rotate(lift); ctx.translate(-(f[0] - 5), -f[1]);
                ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.moveTo(f[0] - 6.8, f[1] - 0.2); ctx.lineTo(f[0] + 4.8, f[1] - 0.2); ctx.lineTo(f[0] + 4.6, f[1] + 1); ctx.lineTo(f[0] - 6.6, f[1] + 1); ctx.fill();          // the sole
                ctx.fillStyle = '#ece8df'; ctx.beginPath(); ctx.moveTo(f[0] - 6.6, f[1] - 0.3);
                ctx.quadraticCurveTo(f[0] - 6.8, f[1] - 2.4, f[0] - 4.6, f[1] - 2.8); ctx.quadraticCurveTo(f[0] - 1, f[1] - 3.4, f[0] + 1.2, f[1] - 5.6);          // toes, instep, up to the ankle
                ctx.lineTo(f[0] + 4.4, f[1] - 5.8); ctx.quadraticCurveTo(f[0] + 5, f[1] - 2.4, f[0] + 4.4, f[1] - 0.3); ctx.closePath(); ctx.fill();          // the heel
                ctx.strokeStyle = 'rgba(120,110,100,.6)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(f[0] - 4.2, f[1] - 2.7); ctx.lineTo(f[0] - 4.6, f[1] - 0.4); ctx.stroke();          // the split toe
                ctx.strokeStyle = '#3a302a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(f[0] - 4.4, f[1] - 0.4); ctx.lineTo(f[0] - 2, f[1] - 3.1); ctx.stroke();          // the thong
                ctx.restore();
            };
            foot(bf, 0.32 * sP); foot(ff, 0);
            // the upper body, leaning: robe, the white collar of the under-robe, the patchwork 袈裟 with its ring, the head
            ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(-lean); ctx.translate(-hip[0], -hip[1]);
            ctx.fillStyle = '#121219'; ctx.beginPath();
            ctx.moveTo(hip[0] - 11, hip[1] - 1); ctx.bezierCurveTo(hip[0] - 14, hip[1] - 16, hip[0] - 15, hip[1] - 30, hip[0] - 10, hip[1] - 39);
            ctx.quadraticCurveTo(hip[0] - 2, hip[1] - 44, hip[0] + 8, hip[1] - 40); ctx.bezierCurveTo(hip[0] + 12, hip[1] - 28, hip[0] + 12, hip[1] - 14, hip[0] + 11, hip[1] - 1); ctx.fill();
            ctx.fillStyle = '#ece8df'; ctx.beginPath(); ctx.moveTo(hip[0] - 4.5, hip[1] - 43.4); ctx.lineTo(hip[0] - 9.6, hip[1] - 33); ctx.lineTo(hip[0] - 8.2, hip[1] - 32.4); ctx.lineTo(hip[0] - 2.6, hip[1] - 42.6); ctx.fill();          // 白衣の襟
            ctx.fillStyle = '#6a5430'; ctx.beginPath();
            ctx.moveTo(hip[0] - 7, hip[1] - 41.5); ctx.lineTo(hip[0] + 1, hip[1] - 42.6); ctx.lineTo(hip[0] + 11, hip[1] - 5); ctx.lineTo(hip[0] + 1.5, hip[1] - 1.5); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(40,28,14,.7)'; ctx.lineWidth = 0.5; ctx.beginPath();          // its strips of patched cloth
            for (var kp = 1; kp < 5; kp++) { var kt = kp / 5; ctx.moveTo(hip[0] - 7 + 8.5 * kt + 0.4, hip[1] - 41.5 - 1.1 * kt); ctx.lineTo(hip[0] + 1.5 + 9.5 * kt, hip[1] - 1.5 - 3.5 * kt); }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(222,186,110,.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hip[0] - 7, hip[1] - 41.5); ctx.lineTo(hip[0] + 1.5, hip[1] - 1.5); ctx.stroke();
            ctx.strokeStyle = '#d8b46a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(hip[0] - 2.4, hip[1] - 31, 1.6, 0, 7); ctx.stroke();          // the ring (環)
            // the head: a shaved scalp with the faint blue of stubble, an ear, a brow, a closed-looking eye, the nose and mouth
            var hx = hip[0] - 1, hy = hip[1] - 51;
            ctx.fillStyle = '#121219'; ctx.fillRect(hx - 2.6, hy + 4.5, 5.4, 4);          // neck in the collar
            var hg = ctx.createRadialGradient(hx - 2.5, hy - 2.5, 1, hx, hy, 7.6); hg.addColorStop(0, '#d2b096'); hg.addColorStop(1, '#9c7a62');
            ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(hx + 6.4, hy + 1); ctx.bezierCurveTo(hx + 7, hy - 6, hx + 2, hy - 8.4, hx - 2.6, hy - 7.4);
            ctx.bezierCurveTo(hx - 6.6, hy - 6.2, hx - 7.4, hy - 2.6, hx - 7, hy - 0.6); ctx.lineTo(hx - 8.6, hy + 1.6); ctx.lineTo(hx - 7.2, hy + 2.4);
            ctx.quadraticCurveTo(hx - 7.4, hy + 4, hx - 6.2, hy + 4.6); ctx.quadraticCurveTo(hx - 5.4, hy + 6.8, hx - 2.4, hy + 7); ctx.quadraticCurveTo(hx + 3.8, hy + 6.6, hx + 6.4, hy + 1); ctx.fill();
            ctx.fillStyle = 'rgba(70,84,110,.28)'; ctx.beginPath(); ctx.ellipse(hx + 0.6, hy - 3.4, 6.2, 4, 0.1, Math.PI, Math.PI * 2.05); ctx.fill();          // stubble
            ctx.fillStyle = '#a5826a'; ctx.beginPath(); ctx.ellipse(hx + 2.4, hy + 0.6, 1.3, 2, 0.2, 0, 7); ctx.fill();          // ear
            ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(hx - 5.6, hy - 1.6); ctx.lineTo(hx - 3.6, hy - 1.9);
            ctx.moveTo(hx - 5.6, hy + 0.2); ctx.lineTo(hx - 3.8, hy + 0.3); ctx.moveTo(hx - 6.4, hy + 4.3); ctx.lineTo(hx - 5, hy + 4.4); ctx.stroke();
            ctx.fillStyle = 'rgba(40,26,22,.35)'; ctx.beginPath(); ctx.moveTo(hx + 6.4, hy + 1); ctx.quadraticCurveTo(hx + 3.8, hy + 6.6, hx - 2.4, hy + 7); ctx.quadraticCurveTo(hx + 2, hy + 3, hx + 6.4, hy + 1); ctx.fill();          // jaw in shadow
            ctx.restore();
            // the arm in its great hanging sleeve (袂): along the arm to the hands, the sleeve hanging below and swinging a
            // little behind the motion
            var hs = [hand[0], hand[1]], el = [(sh[0] + hs[0]) / 2 + 3, (sh[1] + hs[1]) / 2 + 4], lag = Math.max(-5, Math.min(5, -vel * 0.035));
            ctx.fillStyle = '#16161e'; ctx.beginPath(); ctx.moveTo(sh[0] - 5, sh[1] - 1.5); ctx.quadraticCurveTo(el[0] - 5, el[1] - 5, hs[0] + 2, hs[1] - 2.6);
            ctx.lineTo(hs[0] + 4.4, hs[1] + 2.8); ctx.bezierCurveTo(hs[0] + 4 + lag, hs[1] + 14, el[0] + 6 + lag, el[1] + 22, sh[0] + 8 + lag * 0.6, sh[1] + 19);
            ctx.quadraticCurveTo(sh[0] + 8, sh[1] + 5, sh[0] - 5, sh[1] - 1.5); ctx.fill();
            ctx.strokeStyle = 'rgba(120,120,150,.18)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(el[0] - 1, el[1] + 2); ctx.quadraticCurveTo(el[0] + 2 + lag, el[1] + 10, el[0] + 4 + lag, el[1] + 17); ctx.stroke();          // a fold
            // lantern light along his front, and on the top of his head
            ctx.save(); ctx.globalCompositeOperation = 'source-atop';
            var lg = ctx.createLinearGradient(hip[0] - 20, 0, hip[0] - 8, 0); lg.addColorStop(0, 'rgba(255,190,110,.3)'); lg.addColorStop(1, 'rgba(255,190,110,0)');
            ctx.fillStyle = lg; ctx.fillRect(hip[0] - 50, OY, 60, CH);
            var tg = ctx.createLinearGradient(0, head[1] - 9, 0, head[1] + 4); tg.addColorStop(0, 'rgba(255,214,150,.4)'); tg.addColorStop(1, 'rgba(255,214,150,0)');
            ctx.fillStyle = tg; ctx.fillRect(hip[0] - 20, head[1] - 10, 30, 14);
            ctx.restore();
            // his breath in the cold: a few puffs after each strike, rising and fading
            for (var bk = 0; bk < 3; bk++) {
                var bp = 0.12 + bk * 0.035, age = ((p - bp + 1) % 1) * 2.8;
                if (age > 1.5) continue;
                var mo = pose(bp).mouth, bx2 = mo[0] - 3 - age * 9, by2 = mo[1] - age * 7, br = 1.6 + age * 4.5, ba = 0.28 * (1 - age / 1.5) * Math.min(1, age * 6);
                var bg = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, br); bg.addColorStop(0, 'rgba(232,238,250,' + ba.toFixed(3) + ')'); bg.addColorStop(1, 'rgba(232,238,250,0)');
                ctx.fillStyle = bg; ctx.fillRect(bx2 - br, by2 - br, br * 2, br * 2);
            }
            // ---- behind him: the log on its two ropes ----
            ctx.save(); ctx.globalCompositeOperation = 'destination-over';
            var ends = [cx - L / 2, cx + L / 2];
            var lgr = ctx.createLinearGradient(0, ly - LH / 2, 0, ly + LH / 2); lgr.addColorStop(0, '#c4a57c'); lgr.addColorStop(0.45, '#a3845c'); lgr.addColorStop(1, '#6a5134');
            ctx.fillStyle = '#4a3828'; ctx.beginPath(); ctx.ellipse(ends[1], ly, 2.4, LH / 2, 0, 0, 7); ctx.fill();          // the back end (end grain, in shadow)
            ctx.fillStyle = 'rgba(40,28,18,.6)'; [[cx - 14, 0], [cx + 14, 0]].forEach(function(b) { ctx.fillRect(b[0] - 1.6, ly - LH / 2 - 0.4, 3.2, LH + 0.8); });          // rope bindings
            ctx.fillStyle = lgr; ctx.beginPath(); ctx.moveTo(ends[0] + 2, ly - LH / 2); ctx.lineTo(ends[1], ly - LH / 2); ctx.lineTo(ends[1], ly + LH / 2); ctx.lineTo(ends[0] + 2, ly + LH / 2);
            ctx.ellipse(ends[0] + 2, ly, 2.6, LH / 2, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill();
            ctx.strokeStyle = 'rgba(60,40,24,.35)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(ends[0] + 4, ly - 1.5); ctx.lineTo(ends[1] - 2, ly - 1); ctx.moveTo(ends[0] + 6, ly + 2.5); ctx.lineTo(ends[1] - 3, ly + 2); ctx.stroke();          // grain
            ctx.strokeStyle = '#b9a47a'; ctx.lineWidth = 1.5; ctx.beginPath();
            [-14, 14].forEach(function(o) { ctx.moveTo(X0 + o, AY); ctx.lineTo(cx + o, ly - LH / 2); }); ctx.stroke();          // the ropes it hangs from
            ctx.restore();
            // ---- the pull rope, red and white, from the back of the log to his hands, the rest hanging down ----
            var E = [ends[1] - 3, ly + 2], H = [hs[0] + 1, hs[1]], mid = [(E[0] + H[0]) / 2, Math.max(E[1], H[1]) + 3 + 3 * (1 - sP)];
            var tail = [H[0] + 5, 262], tm = [H[0] + 9, (H[1] + 262) / 2];
            [['#f3efe8', 2.2, []], ['#c8302c', 2.2, [2.2, 2.2]]].forEach(function(st) {
                ctx.strokeStyle = st[0]; ctx.lineWidth = st[1]; ctx.setLineDash(st[2]); ctx.beginPath();
                ctx.moveTo(E[0], E[1]); ctx.quadraticCurveTo(mid[0], mid[1], H[0], H[1]); ctx.moveTo(H[0] + 1, H[1] + 1); ctx.quadraticCurveTo(tm[0], tm[1], tail[0], tail[1]); ctx.stroke();
            });
            ctx.setLineDash([]);
            ctx.fillStyle = '#b08c72'; ctx.beginPath(); ctx.ellipse(hs[0] + 3.2, hs[1] + 1.6, 2.1, 1.6, 0.4, 0, 7); ctx.fill();          // his hands on the rope, one above the other
            ctx.fillStyle = '#c29e82'; ctx.beginPath(); ctx.ellipse(hs[0] + 0.6, hs[1] - 0.2, 2.2, 1.7, 0.3, 0, 7); ctx.fill();
        };
        var frame = function(now) {
            if (!cv.isConnected) return;
            var an = bell.getAnimations ? bell.getAnimations()[0] : null, t = an && an.currentTime != null ? an.currentTime : now - t0;
            draw((((t % 2800) + 2800) % 2800) / 2800);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
    // the winter stars as seen from Japan facing south around midnight on New Year's Eve: Orion near the meridian, ~50°
    // up. Positions are the stars' real right ascension (hours) and declination (degrees), projected around Orion's belt
    // (east to the left); [ra, dec, magnitude, color]
    function wvWinterSky(W, H) {
        var wide = W >= 760, k = wide ? Math.min(7.5, W / 170) : Math.min(5.6, W / 70), cx = W * (wide ? 0.33 : 0.38), cy = H * (wide ? 0.25 : 0.27);
        var pj = function(ra, dec) { return [cx - (ra - 5.6) * 15 * Math.cos(dec * Math.PI / 180) * k, cy - dec * k]; };
        var BL = '#cfdcff', WH = '#eef2ff', YE = '#fff1d6', OR = '#ffc89a', RD = '#ffb080';
        var S = [[5.919, 7.41, 0.45, RD], [5.242, -8.2, 0.13, BL], [5.419, 6.35, 1.64, BL], [5.796, -9.67, 2.06, BL], [5.679, -1.94, 1.77, BL], [5.603, -1.2, 1.69, BL], [5.533, -0.3, 2.23, BL],
            [5.585, 9.93, 3.39, BL], [5.59, -5.91, 2.77, BL], [5.408, -2.4, 3.36, BL], [4.83, 6.96, 3.19, WH], [4.853, 5.6, 3.69, WH], [4.904, 2.44, 3.7, WH], [4.843, 8.9, 4.35, WH], [5.13, -5.09, 2.79, WH],
            [6.752, -16.72, -1.46, WH], [6.378, -17.96, 1.98, BL], [6.977, -28.97, 1.5, BL], [7.14, -26.4, 1.83, YE], [7.655, 5.22, 0.34, YE], [7.452, 8.29, 2.9, BL],
            [4.599, 16.51, 0.86, OR], [4.33, 15.63, 3.65, YE], [4.382, 17.54, 3.76, YE], [4.477, 19.18, 3.53, OR], [4.478, 15.87, 3.4, YE], [5.438, 28.6, 1.65, BL], [5.627, 21.14, 3.0, BL],
            [3.79, 24.1, 2.87, BL], [3.819, 24.05, 3.62, BL], [3.747, 24.11, 3.7, BL], [3.763, 24.37, 3.87, BL], [3.772, 23.95, 4.18, BL], [3.754, 24.47, 4.3, BL],
            [5.545, -17.82, 2.58, YE], [5.471, -20.76, 2.84, YE], [6.629, 16.4, 1.93, WH], [7.755, 28.03, 1.14, OR], [7.577, 31.89, 1.58, WH], [6.383, 22.51, 2.87, OR], [6.732, 25.13, 2.98, YE]];
        return { pj: pj, k: k, stars: S.map(function(a) { var q = pj(a[0], a[1]); return { x: q[0], y: q[1], mag: a[2], c: a[3] }; }),
            milky: [[7.7, -32], [7.2, -18], [6.9, -6], [6.7, 5], [6.4, 16], [6.0, 28], [5.5, 40], [5.0, 52]].map(function(a) { return pj(a[0], a[1]); }), neb: pj(5.588, -5.39) };
    }
    function wvStars(cv) {
        var W = cv.clientWidth, H = cv.clientHeight;
        if (!W || !H) { cv._tries = (cv._tries || 0) + 1; if (cv._tries < 60) requestAnimationFrame(function() { if (cv.isConnected) wvStars(cv); }); return; }
        var dpr = Math.min(2, window.devicePixelRatio || 1), ctx = cv.getContext('2d'), rn = wvRand(777), sky = wvWinterSky(Math.max(320, window.innerWidth || W), Math.max(480, window.innerHeight || H));
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.scale(dpr, dpr);
        var fade = function(y) { return Math.max(0, Math.min(1, (H * 0.86 - y) / (H * 0.3))); };          // fainter toward the horizon (haze, lantern light)
        var near = function(x, y) {          // closeness to the Milky Way's line (0..1)
            var best = 1e9, M = sky.milky;
            for (var i = 0; i < M.length - 1; i++) { var ax = M[i][0], ay = M[i][1], bx = M[i + 1][0] - ax, by = M[i + 1][1] - ay, t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / (bx * bx + by * by))), dx = x - ax - bx * t, dy = y - ay - by * t; best = Math.min(best, dx * dx + dy * dy); }
            return Math.exp(-best / Math.pow(sky.k * 7, 2));
        };
        // the Milky Way: a faint, uneven glow along its line, and many more faint stars in it
        var M = sky.milky;
        for (var i = 0; i < M.length - 1; i++) for (var s = 0; s < 1; s += 0.25) {
            var x = M[i][0] + (M[i + 1][0] - M[i][0]) * s, y = M[i][1] + (M[i + 1][1] - M[i][1]) * s, rr = sky.k * (9 + rn() * 6), g = ctx.createRadialGradient(x, y, 0, x, y, rr);
            g.addColorStop(0, 'rgba(170,185,230,' + (0.016 * fade(y)).toFixed(3) + ')'); g.addColorStop(0.6, 'rgba(170,185,230,' + (0.007 * fade(y)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(170,185,230,0)');
            ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        }
        var n = Math.round(W * H / 900);
        for (var j = 0; j < n; j++) {
            var sx = rn() * W, sy = rn() * H * 0.88, nm = near(sx, sy);
            if (rn() > 0.35 + 0.65 * nm && rn() < 0.55) continue;
            var m = 6.5 - Math.pow(rn(), 2.2) * 3.2, a = (0.18 + (6.5 - m) * 0.2) * fade(sy);
            if (a <= 0.01) continue;
            ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = ['#ffffff', '#dfe8ff', '#fff3dc', '#ffe1c4'][Math.floor(rn() * 4)];
            ctx.beginPath(); ctx.arc(sx, sy, 0.45 + (6.5 - m) * 0.22, 0, 7); ctx.fill();
        }
        // the named stars fainter than the twinkling bright ones, and the Orion Nebula: a tiny soft glow in his sword
        sky.stars.forEach(function(st) {
            if (st.mag <= 2.3) return;
            ctx.globalAlpha = Math.min(1, (0.45 + (4.5 - st.mag) * 0.22) * fade(st.y)); ctx.fillStyle = st.c;
            ctx.beginPath(); ctx.arc(st.x, st.y, 0.7 + (4.5 - st.mag) * 0.3, 0, 7); ctx.fill();
        });
        var nb = ctx.createRadialGradient(sky.neb[0], sky.neb[1], 0, sky.neb[0], sky.neb[1], sky.k * 1.1);
        nb.addColorStop(0, 'rgba(230,200,230,.5)'); nb.addColorStop(1, 'rgba(200,170,220,0)'); ctx.globalAlpha = fade(sky.neb[1]); ctx.fillStyle = nb; ctx.fillRect(sky.neb[0] - 10, sky.neb[1] - 10, 20, 20);
        ctx.globalAlpha = 1;
    }
    // 七夕・流れ星: a fireball (火球) glides down across the Milky Way: a blazing head, white at its core in a soft pale-aqua
    // glow, a long golden tail that tapers away, sparks breaking off behind it. It leaves a trail of glitter where it has
    // passed (gold, white, rose and pale aqua), which twinkles, drifts a little and fades out, oldest first; it keeps
    // going, at full brightness, right off the edge of the screen. Then a few smaller shooting stars from the same part of the sky, each with a fainter
    // glittering trail of its own. (When the scene is held, as in the preview, it all comes
    // round again every 9 seconds.)
    function wvMeteors(cv) {
        var W = cv.clientWidth, H = cv.clientHeight;
        if (!W || !H) { cv._tries = (cv._tries || 0) + 1; if (cv._tries < 60) requestAnimationFrame(function() { if (cv.isConnected) wvMeteors(cv); }); return; }
        var dpr = Math.min(2, window.devicePixelRatio || 1), ctx = cv.getContext('2d'), t0 = performance.now(), CYCLE = 9;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        var DX = -0.848, DY = 0.53;          // the way they fall: down to the left, as if from a radiant off the upper right
        var plan = function(seed) {
            var rn = wvRand(seed), L = Math.min((W * 0.97 + 60) / 0.848, (H + 76) / 0.53);          // (far enough to leave the screen)
            var big = { t: 0.6, dur: Math.max(1.8, Math.min(3.2, L / 260)), x: W * 0.97, y: -16, L: L, w: Math.max(4.2, Math.min(6, W / 180)), big: 1, sparks: [], dx: DX, dy: DY };
            for (var k = 0; k < 50; k++) big.sparks.push({ u: 0.15 + rn() * 0.8, vx: (rn() - 0.3) * 50, vy: 14 + rn() * 60, life: 0.3 + rn() * 0.7, r: 0.7 + rn() * 1.6 });
            var dust = function(m, n, life) {          // glitter left along the path: where (u), a little to either side, a slow drift, how long it lasts
                m.dust = [];
                for (var j = 0; j < n; j++) m.dust.push({ u: 0.08 + rn() * 0.9, side: (rn() - 0.5) * m.w * 3.2, vx: (rn() - 0.5) * 6 - m.dx * 4, vy: 3 + rn() * 9, life: life * (0.55 + rn() * 0.9),
                    r: 0.5 + rn() * 1.1, tw: 7 + rn() * 12, ph: rn() * 6.3, c: ['255,232,160', '255,250,238', '255,208,224', '196,238,255'][j % 4], glint: rn() < 0.3 });
            };
            dust(big, 250, 2.4);
            var list = [big];
            [2.5, 3.1, 3.7, 4.4, 6.2, 7.4].forEach(function(t, i) {
                var a = (rn() - 0.5) * 0.25, dx2 = DX * Math.cos(a) - DY * Math.sin(a), dy2 = DX * Math.sin(a) + DY * Math.cos(a);
                var sm = { t: t + rn() * 0.3, dur: 0.4 + rn() * 0.4, x: W * (0.35 + rn() * 0.6), y: H * (0.02 + rn() * 0.28), L: (0.22 + rn() * 0.22) * Math.min(W * 1.2, H), w: 1.6 + rn() * 1.4, big: 0, sparks: [], dx: dx2, dy: dy2 };
                dust(sm, 24, 1.2); list.push(sm);
            });
            return list;
        };
        var cycles = {}, at = function(m, u) { var e = m.big ? u : 1 - Math.pow(1 - u, 1.25); return [m.x + m.dx * m.L * e, m.y + m.dy * m.L * e]; };
        var bright = function(m, u) { var b = Math.min(1, u / 0.12); if (m.big) b *= 0.9 + 0.1 * Math.sin(u * 40); else if (u > 0.7) b *= (1 - u) / 0.3; return b; };
        var drawMeteor = function(m, tt) {
            var u = (tt - m.t) / m.dur;
            ctx.globalCompositeOperation = 'lighter';
            // the trail glowing on behind it for a moment, fading from its oldest end
            if (m.big && u > 0.2) {
                ctx.lineCap = 'round';
                for (var q = 0.2; q < Math.min(0.93, u); q += 0.015) {
                    var sinceQ = tt - m.t - q * m.dur, fa = 1 - sinceQ / 1.1;
                    if (fa <= 0) continue;
                    var p1 = at(m, q), p2 = at(m, Math.min(q + 0.015, u));
                    for (var pass = 0; pass < 2; pass++) {
                        ctx.strokeStyle = pass ? 'rgba(220,245,255,' + (0.2 * fa * fa).toFixed(3) + ')' : 'rgba(150,180,255,' + (0.06 * fa).toFixed(3) + ')';
                        ctx.lineWidth = pass ? 1.6 + (1 - fa) * 1.2 : 6 + (1 - fa) * 4;
                        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
                    }
                }
            }
            // the glitter it leaves along its path: each grain lights as the head passes, twinkles, drifts and fades
            if (m.dust) m.dust.forEach(function(d) {
                var age = tt - m.t - d.u * m.dur;
                if (age < 0 || age > d.life) return;
                var p0 = at(m, d.u), f = 1 - age / d.life, pop = age < 0.12 ? 1 + (0.12 - age) * 6 : 1, tw = 0.5 + 0.5 * Math.sin(age * d.tw + d.ph);
                var x = p0[0] - m.dy * d.side + d.vx * age, y = p0[1] + m.dx * d.side + d.vy * age, a = Math.min(1, f * f * (0.45 + 0.55 * tw) * pop * (m.big ? 1 : 0.8)), rr = d.r * (m.big ? 3 : 2.2) * (0.7 + 0.3 * f);
                var sg = ctx.createRadialGradient(x, y, 0, x, y, rr);
                sg.addColorStop(0, 'rgba(' + d.c + ',' + a.toFixed(3) + ')'); sg.addColorStop(0.32, 'rgba(' + d.c + ',' + (a * 0.35).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(' + d.c + ',0)');
                ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
                if (d.glint && tw > 0.75) {          // now and then a grain catches the light: a tiny four-pointed glint
                    var gl = rr * 1.6 * (tw - 0.75) * 4;
                    ctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.8).toFixed(3) + ')'; ctx.lineWidth = 0.6; ctx.beginPath();
                    ctx.moveTo(x - gl, y); ctx.lineTo(x + gl, y); ctx.moveTo(x, y - gl); ctx.lineTo(x, y + gl); ctx.stroke();
                }
            });
            if (u < 0 || u > 1) { ctx.globalCompositeOperation = 'source-over'; return; }
            var hp = at(m, u), b = bright(m, u), tl = Math.min(at(m, u)[0] - m.x, 0) / m.dx;          // how far it has come
            var tailLen = Math.min(tl, m.big ? Math.min(m.L * 0.62, Math.max(W, H) * 0.32) : m.L * 0.6) * (m.big ? 1 : 0.9), tx = hp[0] - m.dx * tailLen, ty = hp[1] - m.dy * tailLen, nx = -m.dy, ny = m.dx;
            // the tail: a wide faint glow, then the tapered bright streak
            [[5, 0.16], [2.2, 0.35], [1, 1]].forEach(function(ps) {
                var w = m.w * ps[0] * Math.max(0.6, b), g = ctx.createLinearGradient(hp[0], hp[1], tx, ty);
                g.addColorStop(0, 'rgba(255,250,235,' + (ps[1] * Math.min(1, b)).toFixed(3) + ')'); g.addColorStop(0.18, 'rgba(255,214,140,' + (ps[1] * 0.75 * Math.min(1, b)).toFixed(3) + ')');
                g.addColorStop(0.6, 'rgba(255,160,90,' + (ps[1] * 0.25 * Math.min(1, b)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,140,80,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hp[0] + nx * w / 2, hp[1] + ny * w / 2); ctx.lineTo(tx, ty); ctx.lineTo(hp[0] - nx * w / 2, hp[1] - ny * w / 2); ctx.closePath(); ctx.fill();
            });
            // sparks breaking off behind it
            m.sparks.forEach(function(sp) {
                var ts = m.t + sp.u * m.dur, age = tt - ts;
                if (age < 0 || age > sp.life) return;
                var p0 = at(m, sp.u), f = 1 - age / sp.life;
                ctx.fillStyle = 'rgba(255,' + Math.round(200 + 55 * f) + ',' + Math.round(120 + 100 * f) + ',' + (0.9 * f).toFixed(3) + ')';
                ctx.beginPath(); ctx.arc(p0[0] + sp.vx * age, p0[1] + sp.vy * age, sp.r * (0.5 + f * 0.6), 0, 7); ctx.fill();
            });
            // the head: a white-hot core in a green-blue glow
            var hr = m.w * (m.big ? 8 : 4) * Math.min(1.8, b), hg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], hr);
            hg.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, b).toFixed(3) + ')'); hg.addColorStop(0.18, 'rgba(225,255,240,' + (0.85 * Math.min(1, b)).toFixed(3) + ')');
            hg.addColorStop(0.45, m.big ? 'rgba(170,236,255,' + (0.28 * Math.min(1, b)).toFixed(3) + ')' : 'rgba(200,220,255,' + (0.3 * Math.min(1, b)).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(150,200,255,0)');
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hp[0], hp[1], hr, 0, 7); ctx.fill();
            // its flare lights the whole sky for a moment
            ctx.globalCompositeOperation = 'source-over';
        };
        var frame = function(now) {
            if (!cv.isConnected) return;
            var T = (now - t0) / 1000, c = Math.floor(T / CYCLE), tt = T - c * CYCLE;
            if (!cycles[c]) { cycles = {}; cycles[c] = plan(1 + c * 7919); }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
            if (c > 0 && tt < 5) { var prev = cycles[c - 1] || (cycles[c - 1] = plan(1 + (c - 1) * 7919)); drawMeteor(prev[0], tt + CYCLE); }          // (the train fading from the last time)
            cycles[c].forEach(function(m) { drawMeteor(m, tt); });
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
    // クリスマス: two children having a snowball fight in the snow, drawn like the monk (the same soft shapes and light). A girl
    // in a red puffer coat and a cream knit hat, her black bob showing beneath it; a boy in a blue coat, green hat and red
    // scarf. She throws (a wind-up over the shoulder, the release, the follow-through); it hits him in a burst of snow and he
    // flinches, then both laugh; both crouch to pack new snowballs; he throws back and she ducks under it, so it lands in the
    // snow behind her. Rosy cheeks, mittens, rubber boots, scarves that swing. Every 5.2 seconds it starts over.
    // The throws are underhand lobs. Whoever is aimed at tries to get out of the way: he steps back, leans away and throws
    // his arms up (it catches him on the arm); she drops into a crouch with her arms over her head (it sails over). New
    // snowballs come from the ground: a deep squat, both mittens scooping snow (bits fly up), then packing it into a ball.
    function wvKids(cv) {
        var W = cv.clientWidth, H = cv.clientHeight;
        if (!W || !H) { cv._tries = (cv._tries || 0) + 1; if (cv._tries < 60) requestAnimationFrame(function() { if (cv.isConnected) wvKids(cv); }); return; }
        var dpr = Math.min(2, window.devicePixelRatio || 1), ctx = cv.getContext('2d'), VH = window.innerHeight || 700, t0 = performance.now(), T = 5.2, DEG = Math.PI / 180;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        var gy = H - VH * 0.042, k = Math.max(0.74, Math.min(1.15, VH * 0.135 / 100)), d = Math.max(150, Math.min(380, W * 0.42)), mid = W * 0.44;
        var SKIN = '#f2c9a8', HAIR = '#1b1716';
        var KA = { x: mid - d / 2, f: 1, girl: 1, coat: '#d8434a', coatD: '#a92e36', hat: '#f3eee6', hatS: '#d8434a', scarf: '#f2c14e', mit: '#f3eee6', pants: '#3a3f5c', boot: '#c76d3c' };
        var KB = { x: mid + d / 2, f: -1, girl: 0, coat: '#3d6fb6', coatD: '#2a4f86', hat: '#3f8f5a', hatS: '#f3eee6', scarf: '#e04b3c', mit: '#e04b3c', pants: '#4a4a54', boot: '#2b2b31' };
        var sm = function(a, b, u) { u = Math.max(0, Math.min(1, (u - a) / (b - a))); return u * u * (3 - 2 * u); }, lerp = function(a, b, u) { return a + (b - a) * u; };
        // ---- poses (angles in degrees: an arm at 0 hangs straight down, 90 points forward, 180 straight up) ----
        var rest = function(t) { return { crouch: 0, lean: 0.02 * Math.sin(t * 2.4), dx: 0, a1: 12, b1: 26, a2: 6, b2: 20, laugh: 0, hop: 0, ball: 0, pack: 0 }; };
        var throwAt = function(P, u) {          // underhand: swing the arm back low (knees bend), step into it, lob it forward and up
            if (u <= 0 || u >= 1) return;
            var w = sm(0, 0.48, u), r = sm(0.48, 0.62, u), f1 = sm(0.62, 0.8, u), f2 = sm(0.8, 1, u);
            P.a1 = lerp(lerp(lerp(lerp(12, -62, w), 70, r), 112, f1), 12, f2); P.b1 = lerp(lerp(lerp(lerp(26, 6, w), 4, r), 18, f1), 26, f2);
            P.crouch = Math.max(P.crouch, 0.22 * w * (1 - r)); P.lean = lerp(lerp(lerp(P.lean, 0.18, w), 0.06, r), P.lean, f2);
            P.a2 = lerp(lerp(lerp(6, 48, w), 20, r), 6, f2); P.dx = lerp(lerp(0, -2, w), 3, r) * (1 - f2); P.ball = u < 0.58 ? 1 : 0;
        };
        var scoopAt = function(P, u) {          // squat right down, both hands in the snow, scoop; then pack it into a ball and stand
            if (u <= 0 || u >= 1) return;
            var dn = sm(0, 0.25, u), up1 = sm(0.42, 0.55, u), up2 = sm(0.85, 1, u), c = dn * (1 - up1 * 0.5) * (1 - up2), sc = Math.sin(Math.min(1, Math.max(0, (u - 0.24) / 0.18)) * Math.PI);
            P.crouch = Math.max(P.crouch, c); P.lean = lerp(P.lean, 0.62 - 0.32 * up1, c);
            P.a1 = lerp(P.a1, lerp(-14 + 26 * sc, 46, up1), dn * (1 - up2)); P.b1 = lerp(P.b1, lerp(4, 70, up1), dn * (1 - up2));
            P.a2 = lerp(P.a2, lerp(-20 + 26 * sc, 40, up1), dn * (1 - up2)); P.b2 = lerp(P.b2, lerp(4, 74, up1), dn * (1 - up2));
            P.pack = up1 * (1 - up2 * 0.3); if (u > 0.5) P.ball = 1;
        };
        var dodgeAt = function(P, u, hitU) {          // sees it coming: steps back, leans away, arms up to shield; jolts when it lands
            if (u <= 0 || u >= 1) return;
            var e = sm(0, 0.3, u) * (1 - sm(0.62, 1, u)), jolt = u > hitU ? Math.exp(-(u - hitU) * 14) : 0;
            P.lean = lerp(P.lean, -0.3 - 0.15 * jolt, e); P.crouch = Math.max(P.crouch, 0.28 * e); P.dx = lerp(P.dx, -10, e);
            P.a1 = lerp(P.a1, 150, e); P.b1 = lerp(P.b1, 95, e); P.a2 = lerp(P.a2, 140, e); P.b2 = lerp(P.b2, 100, e);
        };
        var duckAt = function(P, u) {          // drops into a crouch, head down, arms over it, a step back
            if (u <= 0 || u >= 1) return;
            var e = sm(0, 0.18, u) * (1 - sm(0.72, 1, u));
            P.crouch = Math.max(P.crouch, 0.82 * e); P.lean = lerp(P.lean, 0.62, e); P.dx = lerp(P.dx, -6, e);
            P.a1 = lerp(P.a1, 170, e); P.a2 = lerp(P.a2, 160, e); P.b1 = lerp(P.b1, 105, e); P.b2 = lerp(P.b2, 105, e);
        };
        var laughAt = function(P, u) { if (u <= 0 || u >= 1) return; var e = Math.sin(u * Math.PI); P.laugh = Math.max(P.laugh, e); P.hop = Math.max(P.hop, Math.abs(Math.sin(u * Math.PI * 4)) * 2.4 * e); };
        var poseA = function(t) { var P = rest(t); P.ball = t < 0.2 || t > 2.9 ? 1 : 0; throwAt(P, (t - 0.2) / 0.9); laughAt(P, (t - 1.6) / 0.8); scoopAt(P, (t - 2.4) / 1.1); duckAt(P, (t - 3.95) / 0.85); laughAt(P, (t - 4.74) / 0.46); return P; };
        var poseB = function(t) { var P = rest(t + 1.3); dodgeAt(P, (t - 1.06) / 0.95, (1.5 - 1.06) / 0.95); laughAt(P, (t - 1.98) / 0.5); scoopAt(P, (t - 2.15) / 1.05); throwAt(P, (t - 3.2) / 0.9); if (t > 2.68 && t < 3.2) P.ball = 1; return P; };
        // ---- the body's joints (local units: feet on the ground at 0, about 100 tall, facing +x); knees bend by solving each leg ----
        var LT = 16.5, LS = 16.5, UA = 14, FA = 13;
        // a knee can bend two ways; a real one always goes forward and up (toward the chest), so take that one
        var knee = function(h, a) { var vx = a[0] - h[0], vy = a[1] - h[1], dd = Math.max(0.01, Math.sqrt(vx * vx + vy * vy)), ux = vx / dd, uy = vy / dd;
            if (dd >= LT + LS) return [h[0] + ux * LT, h[1] + uy * LT];
            var q = Math.acos(Math.max(-1, Math.min(1, (LT * LT + dd * dd - LS * LS) / (2 * LT * dd)))), c = Math.cos(q), s2 = Math.sin(q);
            var k1 = [c * ux + s2 * uy, -s2 * ux + c * uy], k2 = [c * ux - s2 * uy, s2 * ux + c * uy], pick = (k1[0] - k1[1]) >= (k2[0] - k2[1]) ? k1 : k2, other = pick === k1 ? k2 : k1;
            if (h[1] + LT * pick[1] > -3) pick = other;          // (never through the snow)
            return [h[0] + LT * pick[0], h[1] + LT * pick[1]]; };
        var joints = function(P) {
            var hy = -40 + P.crouch * 30 - P.hop, hip = [P.dx, hy], c = Math.cos(P.lean), s2 = Math.sin(P.lean);
            var R = function(x, y) { return [hip[0] + x * c - y * s2, hip[1] + x * s2 + y * c]; };
            var dir = function(a) { a = a * DEG + P.lean; return [Math.sin(a), Math.cos(a)]; };
            var sh = R(0.5, -28), d1 = dir(P.a1), e1 = [sh[0] + UA * d1[0], sh[1] + UA * d1[1]], d1b = dir(P.a1 + P.b1), h1 = [e1[0] + FA * d1b[0], e1[1] + FA * d1b[1]];
            var sh2 = R(-1.5, -27.5), d2 = dir(P.a2), e2 = [sh2[0] + UA * d2[0], sh2[1] + UA * d2[1]], d2b = dir(P.a2 + P.b2), h2 = [e2[0] + FA * d2b[0], e2[1] + FA * d2b[1]];
            if (P.pack > 0) { var mid2 = [(h1[0] + h2[0]) / 2, (h1[1] + h2[1]) / 2]; h1 = [lerp(h1[0], mid2[0] + 2.4, P.pack), lerp(h1[1], mid2[1] - 1.6, P.pack)]; h2 = [lerp(h2[0], mid2[0] - 2.4, P.pack), lerp(h2[1], mid2[1] + 1.6, P.pack)]; }          // hands together, packing
            var ff = [P.dx * 0.6 + 8 - 2 * P.crouch, 0], bf = [P.dx * 0.6 - 7 + 5 * P.crouch, 0], hipL = [hip[0], hip[1] + 2];          // crouching, the feet come in under the body
            return { hip: hip, R: R, sh: sh, e1: e1, h1: h1, e2: e2, h2: h2, sh2: sh2, ff: ff, bf: bf, kf: knee(hipL, [ff[0], -9]), kb: knee(hipL, [bf[0], -9]), head: R(2.6, -42) };
        };
        var world = function(K, p) { return [K.x + K.f * k * p[0], gy + k * p[1]]; };
        // ---- drawing one child ----
        var limb = function(a, b, c2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); };
        var drawKid = function(K, P, t) {
            var J = joints(P), R = J.R;
            ctx.save(); ctx.translate(K.x, gy); ctx.scale(K.f * k, k);
            // shadow on the snow
            ctx.fillStyle = 'rgba(110,135,180,.22)'; ctx.beginPath(); ctx.ellipse(1 + P.dx * 0.6, 0.5, 20, 3.2, 0, 0, 7); ctx.fill();
            // far arm (in its sleeve, a shade darker), legs, boots
            limb(J.sh2, J.e2, J.h2, 7.5, K.coatD); ctx.fillStyle = K.mit; ctx.beginPath(); ctx.arc(J.h2[0], J.h2[1], 3.6, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(J.h2[0], J.h2[1], 3.6, 0, 7); ctx.fill();
            var hl = [J.hip[0], J.hip[1] + 2];
            var dark = function(hex, f) { var n = parseInt(hex.slice(1), 16); return 'rgb(' + [n >> 16, (n >> 8) & 255, n & 255].map(function(v) { return Math.round(v * f); }).join(',') + ')'; };
            var leg = function(kn, ft, shade) {          // thigh, knee, shin (the far leg in one solid, darker shade)
                var an = [ft[0], -9], col = shade ? dark(K.pants, 0.78) : K.pants, seg = function(a, b, w) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
                ctx.lineCap = 'round'; ctx.strokeStyle = col; seg(hl, kn, 9.4); seg(kn, an, 8.2);
                ctx.fillStyle = col; ctx.beginPath(); ctx.arc(kn[0], kn[1], 4.3, 0, 7); ctx.fill();
                if (!shade) { ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hl[0] + 2, hl[1]); ctx.lineTo(kn[0] + 2.4, kn[1] - 1); ctx.stroke(); }          // light along the front of the thigh
            };
            leg(J.kb, J.bf, 1); leg(J.kf, J.ff, 0);
            [[J.bf, 1], [J.ff, 0]].forEach(function(fb) {          // rubber boots, toes forward
                var f = fb[0]; ctx.fillStyle = K.boot; ctx.beginPath(); ctx.moveTo(f[0] - 5, -13); ctx.lineTo(f[0] + 3.4, -13); ctx.lineTo(f[0] + 3.8, -4.6); ctx.quadraticCurveTo(f[0] + 9.5, -4.4, f[0] + 9.2, -0.4); ctx.lineTo(f[0] - 5.6, -0.4); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,' + (fb[1] ? '.22' : '.1') + ')'; ctx.fillRect(f[0] - 5.6, -2.2, 14.8, 1.8);
                ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(f[0] - 4, -12, 1.4, 7);
            });
            // the puffer coat: quilted, light falling from the front and above
            var cp = [R(-12.5, 6), R(-13, -9), R(-9.5, -27), R(-4, -31), R(5, -31), R(9.5, -27), R(12.5, -9), R(13, 6)];
            ctx.fillStyle = K.coat; ctx.beginPath(); ctx.moveTo(cp[0][0], cp[0][1]);
            ctx.quadraticCurveTo(R(-14.5, -2)[0], R(-14.5, -2)[1], cp[1][0], cp[1][1]); ctx.quadraticCurveTo(R(-13, -22)[0], R(-13, -22)[1], cp[2][0], cp[2][1]); ctx.lineTo(cp[3][0], cp[3][1]); ctx.lineTo(cp[4][0], cp[4][1]);
            ctx.lineTo(cp[5][0], cp[5][1]); ctx.quadraticCurveTo(R(14, -20)[0], R(14, -20)[1], cp[6][0], cp[6][1]); ctx.quadraticCurveTo(R(15, -2)[0], R(15, -2)[1], cp[7][0], cp[7][1]);
            ctx.quadraticCurveTo(R(0, 8.5)[0], R(0, 8.5)[1], cp[0][0], cp[0][1]); ctx.fill();
            ctx.save(); ctx.clip();
            var cg = ctx.createLinearGradient(R(-13, 0)[0], 0, R(13, 0)[0], 0); cg.addColorStop(0, 'rgba(0,0,0,.22)'); cg.addColorStop(0.55, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(255,255,255,.14)');
            ctx.fillStyle = cg; ctx.fillRect(-30, -80, 60, 100);
            ctx.strokeStyle = K.coatD; ctx.lineWidth = 0.9; ctx.beginPath();
            [-19, -10, -1].forEach(function(yy) { var a = R(-14, yy), b = R(0, yy + 2.6), c3 = R(14, yy); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c3[0], c3[1]); });
            var z1 = R(11.6, -29), z2 = R(12.4, 5); ctx.moveTo(z1[0], z1[1]); ctx.lineTo(z2[0], z2[1]); ctx.stroke();          // the zip at the front
            ctx.restore();
            // scarf: wrapped at the neck, its end swinging out behind
            var n1 = R(-6.5, -31.5), n2 = R(6.5, -31.5), sw = Math.sin(t * 5.2 + K.f) * 2.4 + P.lean * 10;
            ctx.strokeStyle = K.scarf; ctx.lineWidth = 4.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(n2[0], n2[1]); ctx.stroke();
            var tl = R(-7, -30), tm = R(-13 - sw * 0.4, -24), te = R(-15 - sw, -15);
            ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.quadraticCurveTo(tm[0], tm[1], te[0], te[1]); ctx.stroke();
            ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(te[0] - 1.2, te[1] - 0.6); ctx.lineTo(te[0] + 1.6, te[1] + 0.4); ctx.stroke();
            // the head: hair, face in profile (rosy cheeks, an eye that closes when laughing, an open smile), the knit hat and pom-pom
            var hd = J.head, hx = hd[0], hy = hd[1], la = P.laugh;
            ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.lean * 0.6);
            ctx.fillStyle = HAIR; ctx.beginPath();
            if (K.girl) { ctx.moveTo(-11.6, -3); ctx.quadraticCurveTo(-13.4, 6, -10, 10.6); ctx.lineTo(-1.5, 10.6); ctx.quadraticCurveTo(-2.4, 4, 2, 2); ctx.lineTo(4, -4); ctx.closePath(); }          // a bob, cut level at the jaw
            else { ctx.moveTo(-11, -3); ctx.quadraticCurveTo(-11.8, 4, -8, 7.4); ctx.lineTo(-3.6, 6); ctx.quadraticCurveTo(-3, 1, 2, 0); ctx.lineTo(4, -4); ctx.closePath(); }
            ctx.fill();
            ctx.fillStyle = SKIN; ctx.beginPath(); ctx.moveTo(-3, 9.6); ctx.quadraticCurveTo(-4.5, 0, -1, -6); ctx.quadraticCurveTo(6, -10, 10.4, -4); ctx.quadraticCurveTo(11.6, -1, 10.8, 0.6);
            ctx.lineTo(12.2, 2.4); ctx.lineTo(10.8, 3.4); ctx.quadraticCurveTo(10.8, 7.4, 6.6, 9.4); ctx.quadraticCurveTo(2, 11.4, -3, 9.6); ctx.fill();          // face: brow, the little nose, a round chin
            ctx.fillStyle = 'rgba(255,110,120,.4)'; ctx.beginPath(); ctx.ellipse(5.4, 4.2, 3.4, 2.4, 0, 0, 7); ctx.fill();
            if (!K.girl) { ctx.fillStyle = '#e3b292'; ctx.beginPath(); ctx.ellipse(-1.6, 1.6, 1.9, 2.6, 0, 0, 7); ctx.fill(); }          // ear (hers is under her hair)
            ctx.strokeStyle = '#2a1e1a'; ctx.fillStyle = '#2a1e1a'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
            if (la > 0.3) { ctx.beginPath(); ctx.moveTo(4.6, -0.6); ctx.quadraticCurveTo(6.2, -2.4, 7.8, -0.6); ctx.stroke(); }
            else { ctx.beginPath(); ctx.ellipse(6.4, -0.4, 1.1, 1.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6.8, -0.9, 0.4, 0, 7); ctx.fill(); }
            ctx.beginPath(); ctx.moveTo(5, -3.8); ctx.quadraticCurveTo(6.5, -4.6, 8, -3.8); ctx.stroke();          // brow
            if (la > 0.2) { ctx.fillStyle = '#9a3a3a'; ctx.beginPath(); ctx.moveTo(7.4, 5.4); ctx.quadraticCurveTo(9, 9 * la + 4, 10.4, 5.8); ctx.closePath(); ctx.fill(); }
            else { ctx.beginPath(); ctx.moveTo(7.6, 6.2); ctx.quadraticCurveTo(8.8, 7, 9.9, 6.2); ctx.stroke(); }
            if (K.girl) { ctx.fillStyle = HAIR; ctx.beginPath(); ctx.moveTo(1, -6); ctx.quadraticCurveTo(6, -6.4, 9.4, -3.2); ctx.lineTo(9, -5.6); ctx.quadraticCurveTo(5, -9, 0, -7.6); ctx.fill(); }          // her fringe
            // the hat: a ribbed brim, the knitted crown with a stripe, the pom-pom
            ctx.fillStyle = K.hat; ctx.beginPath(); ctx.moveTo(-12.4, -1); ctx.bezierCurveTo(-13.4, -17, 9, -19.6, 11.2, -4.6); ctx.lineTo(-12.4, -1); ctx.fill();
            ctx.fillStyle = K.hatS; ctx.beginPath(); ctx.moveTo(-12.4, -6.6); ctx.bezierCurveTo(-11, -12.6, 7.6, -14.4, 10.6, -8.6); ctx.lineTo(11, -6.6); ctx.bezierCurveTo(7, -11.4, -9, -10.6, -12.6, -4.6); ctx.fill();
            ctx.fillStyle = K.hat; ctx.beginPath(); ctx.moveTo(-13, -0.4); ctx.lineTo(11.6, -4.2); ctx.lineTo(11.4, -7.8); ctx.lineTo(-13.2, -4.2); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 0.6; ctx.beginPath(); for (var rb = -12; rb < 11; rb += 2.2) { var yb = -0.4 - (rb + 13) / 24.6 * 3.8; ctx.moveTo(rb, yb); ctx.lineTo(rb + 0.2, yb - 3.6); } ctx.stroke();
            ctx.fillStyle = K.hat; for (var pp = 0; pp < 9; pp++) { var pa = pp * 0.7; ctx.beginPath(); ctx.arc(-5 + Math.cos(pa) * 2.6, -17 + Math.sin(pa) * 2.6, 2.6, 0, 7); ctx.fill(); }          // pom-pom
            ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.beginPath(); ctx.arc(-4.4, -15.4, 3, 0, 7); ctx.fill();
            ctx.restore();
            // near arm in its puffy sleeve; the mitten; a snowball in it
            limb(J.sh, J.e1, J.h1, 7.8, K.coat); ctx.strokeStyle = K.coatD; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo((J.sh[0] + J.e1[0]) / 2 - 2, (J.sh[1] + J.e1[1]) / 2); ctx.lineTo((J.sh[0] + J.e1[0]) / 2 + 2, (J.sh[1] + J.e1[1]) / 2 + 1); ctx.stroke();
            ctx.fillStyle = K.mit; ctx.beginPath(); ctx.arc(J.h1[0], J.h1[1], 3.8, 0, 7); ctx.fill();
            if (P.ball) { var br = 3.6 * (P.pack > 0 && P.pack < 1 ? 0.45 + 0.55 * P.pack : 1); if (P.pack > 0.05) drawBall((J.h1[0] + J.h2[0]) / 2, (J.h1[1] + J.h2[1]) / 2 - 1, br); else drawBall(J.h1[0] + 1.8, J.h1[1] - 1.6, br); }
            if (P.pack > 0.05) { ctx.fillStyle = K.mit; ctx.beginPath(); ctx.arc(J.h2[0], J.h2[1], 3.6, 0, 7); ctx.fill(); }
            ctx.restore();
        };
        var drawBall = function(x, y, r) {
            var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#eef3fa'); g.addColorStop(1, '#bfcde2');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        };
        // a snowball's flight: a smooth arc through three points (where it leaves the hand, the top, where it ends)
        var arc3 = function(a, m, b, x) { var l0 = (x - m[0]) * (x - b[0]) / ((a[0] - m[0]) * (a[0] - b[0])), l1 = (x - a[0]) * (x - b[0]) / ((m[0] - a[0]) * (m[0] - b[0])), l2 = (x - a[0]) * (x - m[0]) / ((b[0] - a[0]) * (b[0] - m[0])); return a[1] * l0 + m[1] * l1 + b[1] * l2; };
        var rnd = wvRand(31), puff = []; for (var i = 0; i < 16; i++) puff.push([(rnd() - 0.5) * 70, -20 - rnd() * 60, 1.2 + rnd() * 2]);
        var burst = function(x, y, age, up) {          // a burst of powdery snow
            if (age < 0 || age > 0.65) return;
            var f = 1 - age / 0.65;
            puff.forEach(function(q) { var px = x + q[0] * age * k, py = y + (q[1] * (up ? 1.2 : 0.7) * age + 120 * age * age) * k, rr = q[2] * k * (1 + age * 2);
                ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * f).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(px, py, rr, 0, 7); ctx.fill(); });
            ctx.fillStyle = 'rgba(240,246,255,' + (0.5 * f).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, (5 + age * 18) * k, 0, 7); ctx.fill();
        };
        var scoopSnow = function(K, t0s, dur) {          // bits of snow flicked up as the mittens dig in
            var age = tt0 - (t0s + 0.3 * dur); if (age < 0 || age > 0.6) return;
            var J = joints(K === KA ? poseA(t0s + 0.33 * dur) : poseB(t0s + 0.33 * dur)), g0 = world(K, [J.h1[0], -1]), f = 1 - age / 0.6;
            puff.slice(0, 9).forEach(function(q, i) { ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * f).toFixed(3) + ')'; ctx.beginPath();
                ctx.arc(g0[0] + K.f * (q[0] * 0.25 + 6) * age * k * 1.6, g0[1] + (q[1] * 0.8 * age + 140 * age * age) * k, (0.9 + i % 3 * 0.4) * k, 0, 7); ctx.fill(); });
        };
        var tt0 = 0;
        var frame = function(now) {
            if (!cv.isConnected) return;
            var tt = ((now - t0) / 1000) % T; tt0 = tt;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
            var PA = poseA(tt), PB = poseB(tt);
            drawKid(KA, PA, tt); drawKid(KB, PB, tt);
            scoopSnow(KA, 2.4, 1.1); scoopSnow(KB, 2.15, 1.05);
            // her throw: an underhand lob from her hand at the release, catching him on the arm as he tries to get away
            var rA = poseA(0.722), sA = world(KA, joints(rA).h1), jB = joints(poseB(1.5)), hitB = world(KB, [(jB.e1[0] + jB.R(4, -18)[0]) / 2, (jB.e1[1] + jB.R(4, -18)[1]) / 2]);
            if (tt > 0.722 && tt < 1.5) { var u1 = (tt - 0.722) / 0.778, x1 = lerp(sA[0], hitB[0], u1), mA = [(sA[0] + hitB[0]) / 2, Math.min(sA[1], hitB[1]) - 44 * k]; drawBall(x1, arc3(sA, mA, hitB, x1), 3.6 * k); }
            burst(hitB[0], hitB[1], tt - 1.5, 0);
            // his throw: at her head, but she ducks; it sails over and lands in the snow behind her
            var rB = poseB(3.722), sB = world(KB, joints(rB).h1), over = [KA.x - 4 * k, gy - 84 * k], land = [KA.x - 58 * k, gy - 2];
            if (tt > 3.722 && tt < 4.7) { var u2 = (tt - 3.722) / 0.978, x2 = lerp(sB[0], land[0], u2); drawBall(x2, arc3(sB, over, land, x2), 3.6 * k); }
            burst(land[0], land[1], tt - 4.7, 1);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
    var wvMoonCache = null;
    function wvMoon(cv) {
        var css = cv.clientWidth;
        if (!css) { cv._tries = (cv._tries || 0) + 1; if (cv._tries < 60) requestAnimationFrame(function() { if (cv.isConnected) wvMoon(cv); }); return; }
        var N = Math.min(440, Math.round(css * Math.min(2.5, window.devicePixelRatio || 1)));
        cv.width = cv.height = N;
        var ctx = cv.getContext('2d');
        if (wvMoonCache && wvMoonCache.width === N) { ctx.drawImage(wvMoonCache, 0, 0); return; }
        var img = ctx.createImageData(N, N), D = img.data, RAD = Math.PI / 180;
        var hash = function(x, y, z) { var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        var noise = function(x, y, z) {
            var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
            var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
            var l = function(a, b, t) { return a + (b - a) * t; };
            return l(l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
                l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
        };
        var fbm = function(x, y, z, o) { var sum = 0, amp = 0.5, tot = 0; for (var i = 0; i < o; i++) { sum += amp * noise(x, y, z); tot += amp; x *= 2.03; y *= 2.03; z *= 2.03; amp *= 0.5; } return sum / tot; };
        var vec = function(lon, lat) { return [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)]; };
        // the seas: [longitude, latitude, radius (in moon radii), how dark]
        var MARIA = [[-16, 33, 0.36, 0.8], [-27, 42, 0.2, 0.75], [-4, 30, 0.16, 0.7], [17.5, 28, 0.23, 0.75], [31, 8.5, 0.27, 0.85], [22, 3, 0.16, 0.8], [40, 14, 0.14, 0.8], [59, 17, 0.17, 0.9], [52, -6, 0.22, 0.7], [44, -18, 0.1, 0.6], [35, -15, 0.12, 0.7],
            [-58, 20, 0.33, 0.75], [-50, -2, 0.3, 0.7], [-64, 36, 0.21, 0.7], [-42, 10, 0.26, 0.72], [-56, -18, 0.18, 0.55], [-30, 6, 0.16, 0.55], [-22, -9, 0.14, 0.5], [-16, -21, 0.22, 0.62], [-39, -24, 0.13, 0.8],
            [-38, 56, 0.12, 0.5], [-23, 57, 0.12, 0.55], [-8, 57, 0.12, 0.55], [7, 57, 0.12, 0.55], [22, 57, 0.12, 0.5], [37, 58, 0.1, 0.45], [4, 13, 0.1, 0.6], [1, 3, 0.07, 0.45],
            [86, 13, 0.11, 0.6], [87, -1.3, 0.13, 0.6], [84, -38, 0.15, 0.45], [-68, -5, 0.07, 0.9], [-9.3, 51.6, 0.035, 0.9]].map(function(m, i) { var c = vec(m[0], m[1]); return { c: c, r: m[2], w: m[3], t: [0, 0, 0.3, -0.25, 0.4, 0.3, 0.2, 0.25][i] || 0, cos: Math.cos(Math.min(3, m[2] * 2.2)) }; });
        // (tone: Serenitatis a lighter, browner gray; Tranquillitatis and Crisium darker and bluer)
        // young craters: [longitude, latitude, bright core size, core brightness, ray reach, ray falloff, ray strength, seed]
        var CRATERS = [[-11.4, -43.3, 0.024, 0.55, 1.25, 0.5, 0.42, 3], [-20, 9.6, 0.02, 0.36, 0.48, 0.16, 0.26, 7], [-38, 8.1, 0.012, 0.32, 0.28, 0.09, 0.2, 11], [46.8, 16.1, 0.01, 0.32, 0.22, 0.08, 0.16, 13],
            [-47.4, 23.7, 0.012, 0.6, 0, 1, 0, 0], [16, 16.3, 0.008, 0.3, 0, 1, 0, 0], [-1.6, -21.8, 0.008, 0.18, 0, 1, 0, 0], [61, -8.9, 0.008, 0.18, 0, 1, 0, 0]].map(function(k) {
            var c = vec(k[0], k[1]), e = [Math.cos(k[0] * RAD), 0, -Math.sin(k[0] * RAD)], n = [-Math.sin(k[1] * RAD) * Math.sin(k[0] * RAD), Math.cos(k[1] * RAD), -Math.sin(k[1] * RAD) * Math.cos(k[0] * RAD)];
            var h1 = [], h2 = []; for (var i = 0; i < 37; i++) { h1.push(hash(i, k[7], 1)); h2.push(hash(i, k[7], 2)); }
            return { c: c, e: e, n: n, core: k[2], cb: k[3], reach: k[4], fall: k[5], st: k[6], h1: h1, h2: h2 };
        });
        var ray = function(hs, K, t) { var x = t * K, i = Math.floor(x), f = x - i, s2 = f * f * (3 - 2 * f); return hs[((i % K) + K) % K] * (1 - s2) + hs[(((i + 1) % K) + K) % K] * s2; };
        var row = 0, renderRow = function(py) {
            var ny = (py + 0.5) / N * 2 - 1;
            for (var px = 0; px < N; px++) {
                var nx = (px + 0.5) / N * 2 - 1, r2 = nx * nx + ny * ny, dist = Math.sqrt(r2), al = Math.max(0, Math.min(1, (1 - dist) * N / 2 + 0.5));
                if (al <= 0) continue;
                var x = nx, y = -ny, z = Math.sqrt(Math.max(0, 1 - Math.min(1, r2)));
                var bn = noise(x * 6, y * 6 + 3, z * 6) * 0.6 + noise(x * 15, y * 15, z * 15 + 4) * 0.4, M = 0, tone = 0;
                var wx = x + (fbm(x * 3 + 1, y * 3, z * 3, 2) - 0.5) * 0.22, wy = y + (fbm(x * 3, y * 3 + 4, z * 3, 2) - 0.5) * 0.22, wz = z + (fbm(x * 3, y * 3, z * 3 + 8, 2) - 0.5) * 0.22, wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
                wx /= wl; wy /= wl; wz /= wl;          // (the point, pushed about a little, so the shores bend into bays and lobes)
                for (var i = 0; i < MARIA.length; i++) {
                    var m = MARIA[i], d = wx * m.c[0] + wy * m.c[1] + wz * m.c[2];
                    if (d < m.cos) continue;
                    var u = Math.acos(Math.min(1, d)) / m.r + (bn - 0.5) * 0.45, t2 = Math.max(0, Math.min(1, (1.1 - u) / 0.42)), mm = t2 * t2 * (3 - 2 * t2);
                    M = 1 - (1 - M) * (1 - mm * m.w); tone += mm * m.t;
                }
                var hl = fbm(x * 4 + 11, y * 4, z * 4, 5), mt = fbm(x * 9, y * 9 + 5, z * 9, 4), fine = fbm(x * 40 + 2, y * 40, z * 40, 2), sp = noise(x * 70, y * 70, z * 70 + 9);
                tone = Math.max(-0.3, Math.min(0.4, tone));
                var A = (0.92 + 0.3 * (hl - 0.5) + 0.1 * (fine - 0.5)) * (1 - M) + (0.63 - 0.08 * tone + 0.3 * (mt - 0.5) + 0.05 * (fine - 0.5)) * M;
                if (sp > 0.8) A += (sp - 0.8) * 0.9 * (1 - 0.5 * M);          // here and there a small bright crater
                for (var j = 0; j < CRATERS.length; j++) {
                    var k = CRATERS[j], dc = x * k.c[0] + y * k.c[1] + z * k.c[2];
                    if (dc < 0.4) continue;
                    var ang = Math.acos(Math.min(1, dc));
                    A += k.cb * Math.exp(-Math.pow(ang / k.core, 2));
                    if (k.st) A += k.st * 0.35 * Math.exp(-Math.pow(ang / (k.core * 3.2), 2));          // the bright splash around it
                    if (k.st && ang < k.reach && ang > k.core) {
                        var th = Math.atan2(x * k.n[0] + y * k.n[1] + z * k.n[2], x * k.e[0] + y * k.e[1] + z * k.e[2]) / (Math.PI * 2) + 0.5;
                        var rv = 0.6 * ray(k.h1, 7, th + 0.03 * noise(x * 9, y * 9, z * 9)) + 0.4 * ray(k.h2, 17, th), streak = Math.max(0, rv - 0.46) * 1.85;
                        var start = Math.min(1, (ang - k.core) / (k.core * 4));
                        A += k.st * streak * streak * start * Math.exp(-ang / k.fall) * (1 - ang / k.reach) * (0.5 + 0.9 * noise(x * 14, y * 14, z * 14));
                        if (j === 0) A -= 0.06 * Math.exp(-Math.pow((ang - k.core * 2.4) / k.core, 2));          // Tycho's dark collar
                    }
                }
                var lf = 0.9 + 0.1 * Math.pow(z, 0.3);          // only the faintest darkening at the very edge
                A = Math.max(0, A) * lf;
                var R = (255 * (1 - M) + (228 - 10 * tone) * M) * A, G = (251 * (1 - M) + (226 - 2 * tone) * M) * A, B = (238 * (1 - M) + (226 + 14 * tone) * M) * A;          // the seas a cooler gray
                var o = (py * N + px) * 4;
                D[o] = Math.min(255, R * 1.03); D[o + 1] = Math.min(255, G * 1.01); D[o + 2] = Math.min(255, B * 0.95); D[o + 3] = Math.round(al * 255);
            }
        };
        var step = function() {
            if (!cv.isConnected) return;
            var t0 = performance.now(), r0 = row;
            while (row < N && performance.now() - t0 < 10) renderRow(row++);
            ctx.putImageData(img, 0, 0, 0, r0, N, row - r0);
            if (row < N) { requestAnimationFrame(step); return; }
            var keep = document.createElement('canvas'); keep.width = keep.height = N; keep.getContext('2d').drawImage(cv, 0, 0); wvMoonCache = keep;
        };
        step();
    }
    // 月見だんご: 15 dumplings stacked 9 + 4 + 1 (front view: the back ones peek through the gaps), soft and slightly grainy,
    // on white paper folded over the edge of a 三方 (a small wooden offering stand)
    function wvDangoSvg() {
        // one view for the pile and the stand (20° from above), so the 9 bottom dumplings sit on the paper
        var r = 11, ct = Math.cos(20 * Math.PI / 180), st = Math.sin(20 * Math.PI / 180), Y0 = 88 - r * ct - 4 * r * st, h2 = Math.SQRT2;
        var surf = function(z) { return Y0 + r * ct - r * z * st; };          // the tray's top surface at depth z (in dumpling radii)
        var list = [];
        [-2, 0, 2].forEach(function(x) { [-2, 0, 2].forEach(function(z) { list.push([x, 0, z]); }); });
        [-1, 1].forEach(function(x) { [-1, 1].forEach(function(z) { list.push([x, h2, z]); }); });
        list.push([0, 2 * h2, 0]);
        list.sort(function(a, b) { return (b[2] * ct - b[1] * st) - (a[2] * ct - a[1] * st); });
        var shadows = '', balls = '';
        list.forEach(function(c) {
            var cx = 70 + c[0] * r, cy = Y0 - r * (c[1] * ct + c[2] * st), depth = c[2] * ct - c[1] * st;
            if (c[1] === 0) shadows += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + surf(c[2]).toFixed(1) + '" rx="10.5" ry="3" fill="#6d5c3e" opacity=".22"/>';
            balls += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r + '" fill="url(#' + (depth > 0.8 ? 'wvDangoB' : depth > -0.6 ? 'wvDangoM' : 'wvDangoF') + ')"/>';
        });
        var yb = surf(4), yf = surf(-4), yp = surf(3.8), yq = surf(-3.8), ym = surf(0);
        return '<svg viewBox="0 0 140 120" aria-hidden="true"><defs>' +
            '<radialGradient id="wvDangoF" cx="38%" cy="30%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset=".42" stop-color="#fbf8f0"/><stop offset=".78" stop-color="#ebe3cf"/><stop offset="1" stop-color="#d3c8ad"/></radialGradient>' +
            '<radialGradient id="wvDangoM" cx="38%" cy="30%" r="72%"><stop offset="0" stop-color="#f8f5ec"/><stop offset=".5" stop-color="#ece5d2"/><stop offset=".85" stop-color="#d6ccb1"/><stop offset="1" stop-color="#bfb293"/></radialGradient>' +
            '<radialGradient id="wvDangoB" cx="40%" cy="30%" r="72%"><stop offset="0" stop-color="#e9e3d4"/><stop offset=".6" stop-color="#d5ccb4"/><stop offset="1" stop-color="#b3a684"/></radialGradient>' +
            '<filter id="wvMochi" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="5" result="n"/>' +
            '<feColorMatrix in="n" values="0 0 0 0 .55  0 0 0 0 .5  0 0 0 0 .4  .8 0 0 0 -.36" result="g"/><feComposite in="g" in2="SourceAlpha" operator="in" result="gg"/>' +
            '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gg"/></feMerge></filter>' +
            '<linearGradient id="wvTrayTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6cb98"/><stop offset="1" stop-color="#f1dcb0"/></linearGradient>' +
            '<linearGradient id="wvTrayFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0bd84"/><stop offset="1" stop-color="#c79b5e"/></linearGradient>' +
            '<linearGradient id="wvBase" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b98e55"/><stop offset=".18" stop-color="#d6ae74"/><stop offset=".82" stop-color="#d6ae74"/><stop offset="1" stop-color="#b98e55"/></linearGradient></defs>' +
            // the stand: tray top (seen from above), its front rim, the base with its cut-out
            '<path d="M30 ' + yb.toFixed(1) + 'H110L118 ' + yf.toFixed(1) + 'H22z" fill="url(#wvTrayTop)"/><path d="M30 ' + yb.toFixed(1) + 'H110" stroke="#c9a46c" stroke-width=".9"/>' +
            '<path d="M22 ' + yf.toFixed(1) + 'h96v9H22z" fill="url(#wvTrayFront)"/><path d="M22 ' + yf.toFixed(1) + 'h96M22 ' + (yf + 9).toFixed(1) + 'h96" stroke="#b08550" stroke-width=".8"/>' +
            '<path d="M32 ' + (yf + 9).toFixed(1) + 'h76l-5 ' + (115 - yf - 9).toFixed(1) + 'H37z" fill="url(#wvBase)"/><path d="M61.5 115q0-9 8.5-12.5 8.5 3.5 8.5 12.5z" fill="#7d5629"/><path d="M33 115h74v3.5H33z" fill="#a98049"/>' +
            // white paper laid corner-forward, its front corner folded down over the edge
            '<path d="M28 ' + ym.toFixed(1) + 'L70 ' + yp.toFixed(1) + 'L112 ' + ym.toFixed(1) + 'L70 ' + yq.toFixed(1) + 'z" fill="#fdfcf8" stroke="#e8e2d4" stroke-width=".5"/>' +
            '<path d="M60 ' + yf.toFixed(1) + 'H80L70 ' + (yf + 8).toFixed(1) + 'z" fill="#f6f3ea" stroke="#e4ddcd" stroke-width=".5"/>' +
            // shadows on the paper first, then the dumplings back to front
            shadows + '<g filter="url(#wvMochi)">' + balls + '</g></svg>';
    }
    // 花火: modeled on Japanese shells. A rocket climbs with a sparkling tail and bursts into a sphere of stars
    // (seen from the side, so they crowd at the rim). 菊 stars drag long gold tails, 牡丹 stars are clean points that
    // change color, 芯入り shells have an inner sphere, 冠 (willow) stars hang and droop. Each burst lights the sky,
    // stars slow down, fall, flicker out and pop; the sea reflects it all.
    // big = true: the rare 三尺玉 version, which opens with one enormous shell
    function wvFireworks(cv, big) {
        if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
        var sc = cv.parentNode.querySelector('.wv-fwsea'), sctx = sc ? sc.getContext('2d') : null, HZ = 0, SH = 0;      // the sea, and where it starts
        var fit = function() {
            W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (sctx) { HZ = sc.offsetTop; SH = sc.clientHeight; sc.width = Math.round(W * dpr); sc.height = Math.round(SH * dpr); sctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
        };
        fit();
        var dark = document.documentElement.classList.contains('dark') || welcomeView.classList.contains('wv-night');
        // star colors as [r, g, b]
        var cols = [[255, 70, 90], [255, 150, 60], [255, 214, 90], [90, 235, 150], [90, 160, 255], [190, 120, 255], [255, 110, 190], [120, 230, 245], [245, 245, 255]];
        var GOLD = [255, 190, 100], WHITE = [255, 248, 230];
        var pick = function(a) { return a[Math.floor(Math.random() * a.length)]; };
        // a soft glowing dot for each color, drawn once
        var sprites = {};
        var sprite = function(c) {
            var key = c.join(',');
            if (sprites[key]) return sprites[key];
            var s = document.createElement('canvas'); s.width = s.height = 32;
            var g = s.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
            gr.addColorStop(0, 'rgba(255,255,255,1)');
            gr.addColorStop(0.16, 'rgba(' + key + ',1)');
            gr.addColorStop(0.42, 'rgba(' + key + ',.32)');
            gr.addColorStop(1, 'rgba(' + key + ',0)');
            g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
            return (sprites[key] = s);
        };
        var rockets = [], stars = [], glows = [], last = performance.now(), wait = 0.6, first = true;
        // the night sky's stars (fewer and fainter toward the horizon), each twinkling at its own pace
        var seaRipples = [];
        for (var sr = 0; sr < 200; sr++) seaRipples.push({ u: Math.random(), x: Math.random() * W, len: 0.5 + Math.random(), ph: Math.random() * 6.3, sp: (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random()) });
        var sky = [], skyN = Math.round(W * (HZ || H) / 1550);
        for (var q = 0; q < skyN; q++) sky.push({ x: Math.random() * W, y: Math.pow(Math.random(), 1.5) * (HZ || H) * 0.9, r: 0.35 + Math.pow(Math.random(), 3) * 1.1, ph: Math.random() * 6.3, sp: 0.8 + Math.random() * 2.4 });
        // one sphere of stars
        var shell = function(x, y, n, speed, o) {
            for (var i = 0; i < n; i++) {
                var z = 2 * Math.random() - 1, a = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - z * z);      // a point on a sphere, seen from the side
                var v = speed * (0.96 + Math.random() * 0.08), life = o.life * (0.85 + Math.random() * 0.3);
                stars.push({ x: x, y: y, vx: Math.cos(a) * rr * v, vy: Math.sin(a) * rr * v, life: life, max: life, drag: o.drag, g: o.g, c: o.c, c2: o.c2 || null,
                    tail: o.tail || 0, trail: [], size: o.size || 7, flicker: !!o.flicker, pop: o.pop && Math.random() < 0.25 });
            }
        };
        var burst = function(x, y) {
            var type = pick(['kiku', 'botan', 'shin', 'kamuro', 'kiku', 'shin']), c1 = pick(cols), c2 = pick(cols);
            while (c2 === c1) c2 = pick(cols);
            var R = Math.min(W, H * 0.75) * (0.36 + Math.random() * 0.08);       // how far the stars travel
            var sp = R * 2.1;                                                      // with drag 0.12/s they stop at about R
            if (type === 'kiku') shell(x, y, 120, sp, { life: 2.1, drag: 0.12, g: 55, c: c1, c2: GOLD, tail: 9, flicker: true, pop: true });
            else if (type === 'botan') shell(x, y, 130, sp, { life: 1.9, drag: 0.12, g: 55, c: c1, c2: c2, tail: 2, size: 8 });
            else if (type === 'shin') { shell(x, y, 110, sp, { life: 2, drag: 0.12, g: 55, c: c1, c2: c2, tail: 4, pop: true }); shell(x, y, 55, sp * 0.48, { life: 1.7, drag: 0.12, g: 55, c: c2, c2: WHITE, tail: 2, size: 6 }); }
            else shell(x, y, 110, sp * 0.9, { life: 3.4, drag: 0.3, g: 95, c: GOLD, tail: 14, size: 6, flicker: true });
            glows.push({ x: x, y: y, c: type === 'kamuro' ? GOLD : c1, life: 0.9, max: 0.9, r: R * 2.2, flash: true });
        };
        // 三尺玉: one enormous shell that fills the sky: a huge golden willow (冠) that hangs and drips, a colored peony inside it,
        // and a crackling core; its glow lights up the whole sky and the sea
        var giant = function(x, y) {
            var R = Math.min(W * 0.95, H * 0.8) * 0.62, sp = R * 2.1, c1 = pick(cols), c2 = pick(cols);
            shell(x, y, 340, sp, { life: 4.8, drag: 0.12, g: 26, c: GOLD, tail: 20, size: 9, flicker: true });
            shell(x, y, 200, sp * 0.62, { life: 3.4, drag: 0.12, g: 34, c: c1, c2: WHITE, tail: 6, size: 8, pop: true });
            shell(x, y, 110, sp * 0.3, { life: 2.6, drag: 0.12, g: 40, c: c2, c2: GOLD, tail: 3, size: 7, pop: true });
            glows.push({ x: x, y: y, c: GOLD, life: 2, max: 2, r: R * 2.8, flash: true });
        };
        var launch = function() {
            var y0 = HZ || H + 4, x = W * (0.1 + Math.random() * 0.8), ty = Math.min(H * (0.2 + Math.random() * 0.14), y0 - 140), G = 900;
            rockets.push({ x: x, y: y0, vx: (Math.random() - 0.5) * 24, vy: -Math.sqrt(2 * G * (y0 - ty)), G: G, t: 0 });
        };
        var rgba = function(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; };
        var mix = function(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; };
        var frame = function(now) {
            if (!cv.isConnected || welcomeView.style.display === 'none') return;
            if (cv.clientWidth !== W || cv.clientHeight !== H) fit();
            var dt = Math.min(0.05, (now - last) / 1000); last = now;
            if (first) {
                if (big) {          // the 三尺玉 goes up first, by itself; the others follow once it has faded
                    var y0b = HZ || H + 4, tyb = Math.min(H * 0.3, y0b - 160);
                    rockets.push({ x: W * 0.5, y: y0b, vx: 0, vy: -Math.sqrt(2 * 900 * (y0b - tyb)), G: 900, t: 0, big: true });
                    wait = 4.2;
                } else burst(W * 0.4, H * 0.27);
                first = false;
            }
            wait -= dt;
            if (wait <= 0) { launch(); wait = 1.25 + Math.random() * 0.45; }      // one at a time, so each one is seen
            ctx.clearRect(0, 0, W, H);
            var tNow = now / 1000;
            sky.forEach(function(st) {
                var tw = 0.55 + 0.45 * Math.sin(tNow * st.sp + st.ph), fade = 1 - st.y / ((HZ || H) * 0.95);
                ctx.globalAlpha = Math.min(1, (0.4 + 0.6 * tw) * (0.25 + fade)); ctx.fillStyle = st.r > 1 ? '#fff6e0' : '#dfe7ff';
                ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
            // the sky lights up in the burst's color
            for (var f = glows.length - 1; f >= 0; f--) {
                var gl = glows[f], ga = Math.pow(gl.life / gl.max, 2), gr = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
                gr.addColorStop(0, rgba(gl.c, 0.22 * ga)); gr.addColorStop(0.35, rgba(gl.c, 0.07 * ga)); gr.addColorStop(1, rgba(gl.c, 0));
                ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
                if (gl.flash && gl.life > gl.max - 0.1) { ctx.globalAlpha = (gl.life - gl.max + 0.1) * 10; ctx.drawImage(sprite(WHITE), gl.x - 26, gl.y - 26, 52, 52); }          // the flash
                gl.life -= dt; if (gl.life <= 0) glows.splice(f, 1);
            }
            // rockets: a dim head with a short sparkling tail, wobbling a little
            for (var i = rockets.length - 1; i >= 0; i--) {
                var rk = rockets[i];
                rk.t += dt; rk.vy += rk.G * dt; rk.x += (rk.vx + Math.sin(rk.t * 30) * 18) * dt; rk.y += rk.vy * dt;
                var hs = rk.big ? 16 : 10;
                ctx.globalAlpha = 0.9; ctx.drawImage(sprite(GOLD), rk.x - hs / 2, rk.y - hs / 2, hs, hs);
                for (var e = 0; e < (rk.big ? 5 : 2); e++) stars.push({ x: rk.x + (Math.random() - 0.5) * 2, y: rk.y, vx: (Math.random() - 0.5) * 26, vy: 30 + Math.random() * 40, life: 0.45, max: 0.45, drag: 0.3, g: 80, c: GOLD, c2: null, tail: 0, trail: [], size: 4, flicker: true });
                if (rk.vy > -50) { if (rk.big) giant(rk.x, rk.y); else burst(rk.x, rk.y); rockets.splice(i, 1); }
            }
            // stars
            for (var j = stars.length - 1; j >= 0; j--) {
                var p = stars[j];
                p.life -= dt;
                if (p.life <= 0) {
                    if (p.pop) { glows.push({ x: p.x, y: p.y, c: WHITE, life: 0.08, max: 0.08, r: 10 }); stars.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.12, max: 0.12, drag: 1, g: 0, c: WHITE, c2: null, tail: 0, trail: [], size: 9 }); }
                    stars.splice(j, 1); continue;
                }
                if (p.tail) { p.trail.push(p.x, p.y); if (p.trail.length > p.tail * 2) p.trail.splice(0, 2); }
                var k = Math.pow(p.drag, dt);
                p.vx *= k; p.vy = p.vy * k + p.g * dt;
                p.x += p.vx * dt; p.y += p.vy * dt;
                var lf = p.life / p.max, al = Math.min(1, lf * 2.2);
                if (p.flicker && lf < 0.4 && Math.random() < 0.5) al *= 0.12;          // strobe as it burns out
                var col = p.c2 && lf < 0.55 ? mix(p.c, p.c2, Math.min(1, (0.55 - lf) * 6)) : p.c;
                if (p.trail.length > 2) {                                          // 菊: charcoal sparks streaming behind
                    ctx.globalAlpha = al * 0.45; ctx.strokeStyle = rgba(p.tail > 6 ? GOLD : col, 1); ctx.lineWidth = 1.1; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(p.trail[0], p.trail[1]);
                    for (var t = 2; t < p.trail.length; t += 2) ctx.lineTo(p.trail[t], p.trail[t + 1]);
                    ctx.lineTo(p.x, p.y); ctx.stroke();
                }
                var sz = p.size * (0.55 + 0.45 * lf);
                ctx.globalAlpha = al; ctx.drawImage(sprite(col), p.x - sz / 2, p.y - sz / 2, sz, sz);
            }
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            if (sctx && SH) {
                ctx.clearRect(0, HZ, W, H - HZ);          // nothing falls below the horizon
                // the reflection: the sky upside down, squeezed into the sea; rolling waves sway it sideways and
                // stretch it up and down, more in front than out toward the horizon
                sctx.clearRect(0, 0, W, SH);
                var F = HZ / SH, tt = now / 1000;
                for (var y = 0; y < SH; y += 2) {
                    var dep = y / SH, sw = Math.sin(y * 0.33 - tt * 2.3) * 0.6 + Math.sin(y * 0.09 + tt * 1.1) * 0.4;
                    var sy = HZ - (y + 2) * F + sw * (1 + dep * 5);
                    if (sy < 0 || sy > HZ - 2) continue;
                    sctx.globalAlpha = 0.8 * (1 - 0.65 * dep);
                    var off = (Math.sin(y * 0.16 - tt * 1.8) + 0.5 * Math.sin(y * 0.045 + tt * 0.8)) * (0.8 + dep * 7);
                    sctx.drawImage(cv, 0, sy * dpr, W * dpr, 2 * F * dpr, off, y, W, 2);
                }
                // ripples: short wave faces that rise and fall, catch a little light and drift; finer far away
                sctx.globalAlpha = 1;
                seaRipples.forEach(function(r) {
                    var y = SH * Math.pow(r.u, 1.5), bob = Math.sin(tt * 1.7 + r.ph) * (0.3 + r.u * 2.2), len = r.len * (5 + r.u * 36), amp = 0.5 + r.u * 2.2;
                    var x = ((r.x + tt * r.sp * (3 + r.u * 10)) % (W + 40)) - 20, a = 0.5 + 0.5 * Math.sin(tt * 2.2 + r.ph * 1.7);
                    sctx.strokeStyle = dark ? 'rgba(150,175,240,' + (a * (0.07 + r.u * 0.13)).toFixed(3) + ')' : 'rgba(255,255,255,' + (a * (0.2 + r.u * 0.25)).toFixed(3) + ')';
                    sctx.lineWidth = 0.6 + r.u * 1.3;
                    sctx.beginPath(); sctx.moveTo(x, y + bob); sctx.quadraticCurveTo(x + len / 2, y + bob - amp, x + len, y + bob); sctx.stroke();
                    sctx.strokeStyle = 'rgba(0,0,10,' + (0.12 + r.u * 0.18).toFixed(3) + ')';
                    sctx.beginPath(); sctx.moveTo(x + len * 0.15, y + bob + 1 + r.u * 2); sctx.quadraticCurveTo(x + len / 2, y + bob + 2 + r.u * 3, x + len * 0.85, y + bob + 1 + r.u * 2); sctx.stroke();
                });
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
    // 春: 富士山 over a lake in sakura season, after a photo of Lake Kawaguchi (drawn once on a canvas).
    // A wide, low, blue-gray Fuji with a flat top and a snow cap streaked by gullies, haze and dark foothills at its
    // foot, a line of pink trees along the far shore, a calm lake with a faint reflection, big clouds, and blossom-laden
    // branches hanging in from the upper left and the right.
    // 富士 (the rare spring scene), drawn once. With dawn = true it's the お正月 scene instead, and animated: 初日の出, the
    // year's first sunrise coming up right on Fuji's summit (ダイヤモンド富士) and climbing into a rosy winter sky, its
    // light glittering on the lake, and a hawk (鷹) flying past: 一富士二鷹. Very rarely (see hooRoll) a golden 鳳凰 (phoenix) flies
    // past instead, shedding gold sparks (dawn = 2).
    function wvSpring(cv, dawn) {
        var W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (!W || !H) {          // the opening isn't on screen yet: draw as soon as it is
            cv._tries = (cv._tries || 0) + 1;
            if (cv._tries < 60) requestAnimationFrame(function() { if (cv.isConnected) wvSpring(cv, dawn); });
            return;
        }
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        var main = cv.getContext('2d'), rn = wvRand(dawn ? 101 : 2024), S = Math.min(1.4, Math.max(0.75, W / 390));
        main.setTransform(dpr, 0, 0, dpr, 0, 0);
        // the dawn scene moves, so it's drawn in layers: sky, clouds, mountain and shore, lake ripples
        var mkLayer = function() { var c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return { c: c, x: x }; };
        var mkWide = function(extra) { var c = document.createElement('canvas'); c.width = Math.round((W + extra) * dpr); c.height = cv.height; var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return { c: c, x: x }; };
        // spring moves too now (the lake and the clouds): sky, clouds (wider, so they can drift), mountain and shore, the
        // blossom in front
        var Ly = dawn ? { sky: mkLayer(), cl: mkLayer(), mtn: mkLayer(), top: mkLayer(), rip: mkLayer() } : { sky: mkLayer(), cl: mkWide(160 * S), mtn: mkLayer(), top: mkLayer(), fg: mkLayer() }, ctx = Ly.sky.x;
        var shoreY = H * 0.6, baseY = H * 0.575, summitY = H * 0.385, cx = W * 0.52, mh = baseY - summitY;
        // sky
        var g = ctx.createLinearGradient(0, 0, 0, shoreY);
        if (dawn) { g.addColorStop(0, '#121738'); g.addColorStop(0.22, '#262a5e'); g.addColorStop(0.45, '#5a4682'); g.addColorStop(0.66, '#b0668a'); g.addColorStop(0.82, '#ec9277'); g.addColorStop(0.93, '#ffbf86'); g.addColorStop(1, '#ffdca6'); }
        else { g.addColorStop(0, '#3a84d2'); g.addColorStop(0.5, '#78b5e9'); g.addColorStop(0.86, '#cbe2f6'); g.addColorStop(1, '#eaf3fb'); }
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, shoreY + 2);
        // big soft clouds: gray-blue undersides, white tops
        var blob = function(x, y, r, col, a) {
            var cg = ctx.createRadialGradient(x, y, 0, x, y, r);
            cg.addColorStop(0, 'rgba(' + col + ',' + a + ')'); cg.addColorStop(0.6, 'rgba(' + col + ',' + (a * 0.75) + ')'); cg.addColorStop(1, 'rgba(' + col + ',0)');
            ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        };
        var cumulus = function(x, y, w) {
            var parts = [];
            for (var i = 0; i < 38; i++) { var t = rn(); parts.push([x + (t - 0.5) * w, y - Math.sin(t * Math.PI) * w * rn() * 0.16, w * (0.05 + rn() * 0.08) * (0.6 + Math.sin(t * Math.PI) * 0.6)]); }
            parts.forEach(function(q) { blob(q[0], q[1] + q[2] * 0.45, q[2] * 1.1, '176,194,222', 0.35); });
            parts.forEach(function(q) { blob(q[0], q[1], q[2] * 1.15, '255,255,255', 0.6); });
        };
        if (dawn) {          // long thin clouds lying across the sky, lit pink and gold from below
            ctx = Ly.cl.x;
            var streak = function(x, y, len, th, top, lit) {
                for (var i = 0; i < 26; i++) {
                    var t = rn(), bx = x + (t - 0.5) * len, by = y + (rn() - 0.5) * th, br = th * (0.6 + rn() * 0.8) * Math.sin(0.15 + t * 2.84);
                    ctx.save(); ctx.translate(bx, by); ctx.scale(5, 1);
                    blob(0, 0, br, top, 0.3); blob(0, br * 0.35, br * 0.7, lit, 0.42);
                    ctx.restore();
                }
            };
            streak(W * 0.3, H * 0.13, W * 0.7, 5 * S, '110,96,160', '232,136,160');
            streak(W * 0.8, H * 0.2, W * 0.5, 4 * S, '124,100,160', '244,156,150');
            streak(W * 0.2, H * 0.3, W * 0.5, 4 * S, '164,106,150', '255,178,140');
            streak(W * 0.88, H * 0.34, W * 0.42, 3.5 * S, '176,112,146', '255,188,140');
            streak(W * 0.26, H * 0.235, W * 0.3, 3 * S, '150,104,156', '252,170,150');
        } else {
            // spring sky, different every time: clear, a few fair-weather cumulus, only high wisps, or a bank of cloud along the
            // horizon; sometimes spring mist across Fuji's lower slopes, now and then a 笠雲 (a lens-shaped cap) on the summit.
            // The clouds are made from layered noise (soft, wispy edges, bubbling tops), lit from the upper left so their tops
            // are bright and their undersides gray-blue, with flat bases. They're drawn on a wider layer that drifts slowly.
            ctx = Ly.cl.x;
            var crn = wvRand(1 + Math.floor(Math.random() * 2e9)), roll = crn(), ox = 80 * S, CW = W + 160 * S;
            var plan = { cu: [], cirrus: 0, mist: crn() < 0.4, kasa: crn() < 0.12 };
            var cumulusAt = function(x, base, a, b, bank) {
                var domes = [], nd = bank ? 9 + Math.floor(crn() * 5) : 3 + Math.floor(crn() * 4);
                for (var k = 0; k < nd; k++) {
                    var u = nd === 1 ? 0 : (k / (nd - 1)) * 2 - 1, sr = (bank ? a * (0.1 + crn() * 0.1) : a * (0.3 + crn() * 0.18) * (1 - Math.abs(u) * 0.45));
                    domes.push([x + u * a * (bank ? 0.85 : 0.62) + (crn() - 0.5) * a * 0.12, base - sr * (0.35 + crn() * 0.45), sr]);
                }
                plan.cu.push({ x: x, y: base, a: a, b: b, d: domes, top: Math.min.apply(null, domes.map(function(dm) { return dm[1] - dm[2]; })) });
            };
            if (roll < 0.18) { plan.cirrus = crn() < 0.4 ? 0.5 : 0; }                                    // clear (now and then a faint wisp)
            else if (roll < 0.36) { plan.cirrus = 1; }                                                    // only high wisps
            else if (roll < 0.78) {                                                                       // fair weather: a few cumulus
                var nC = 2 + Math.floor(crn() * 3);
                for (var ci = 0; ci < nC; ci++) { var ca = Math.min(W * (0.1 + crn() * 0.14) + 40 * S, 260 * S); cumulusAt(ox + W * (0.05 + crn() * 0.95), H * (0.16 + crn() * 0.22), ca, ca * (0.4 + crn() * 0.2)); }
                plan.cirrus = crn() < 0.5 ? 0.7 : 0;
            } else {                                                                                      // a bank along the horizon
                var ba = W * (0.45 + crn() * 0.25); cumulusAt(ox + W * (0.15 + crn() * 0.7), baseY - mh * 0.02, ba, mh * (0.35 + crn() * 0.2), true);
                if (crn() < 0.7) { var ca2 = Math.min(W * 0.14 + 40 * S, 220 * S); cumulusAt(ox + W * (crn() < 0.5 ? 0.15 : 0.85), H * (0.18 + crn() * 0.12), ca2, ca2 * 0.45); }
                plan.cirrus = crn() < 0.4 ? 0.6 : 0;
            }
            if (FUJI_CLEAR_SKY) plan = { cu: [], cirrus: 0, mist: plan.mist, kasa: false };          // a clear sky; the spring mist still comes now and then
            // value noise (hashed lattice, smooth), and its fractal sum
            var seedH = Math.floor(crn() * 1e9);
            var hash = function(ix, iy) { var h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + seedH | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
            var vnoise = function(x, y) {
                var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
                var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
                return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
            };
            var fbm = function(x, y) { var s2 = 0, amp = 0.5, f = 1; for (var o = 0; o < 4; o++) { s2 += amp * vnoise(x * f + o * 17.3, y * f - o * 9.1); f *= 2.03; amp *= 0.5; } return s2 / 0.94; };
            var cuDensity = function(x, y) {          // how thick the cumulus is at (x, y): 0..1
                var best = 0;
                for (var k = 0; k < plan.cu.length; k++) {
                    var c = plan.cu[k];
                    if (x < c.x - c.a * 1.35 || x > c.x + c.a * 1.35 || y < c.top - 12 * S || y > c.y + 22 * S) continue;
                    var e = -1;
                    for (var m = 0; m < c.d.length; m++) { var dm = c.d[m], ddx = (x - dm[0]) / dm[2], ddy = (y - dm[1]) / dm[2], em = 1 - ddx * ddx - ddy * ddy; if (em > e) e = em; }
                    var by = c.y + (vnoise(x * 0.02 / S, 3.7) - 0.5) * 8 * S;          // a flattish, slightly ragged base
                    if (y > by) e -= Math.pow((y - by) / (14 * S), 2);
                    if (e < -0.7) continue;
                    var n = fbm(x * 0.03 / S, y * 0.036 / S), dd = (e - 0.12 + (n - 0.5) * 0.95) * 2.6;
                    if (dd > best) best = dd;
                }
                return best > 1 ? 1 : best;
            };
            if (plan.cu.length || plan.cirrus) {
                var q = W > 900 ? 0.36 : 0.45, cw = Math.ceil(CW * q), chh = Math.ceil(shoreY * q), nc = document.createElement('canvas'); nc.width = cw; nc.height = chh;
                var ncx = nc.getContext('2d'), img = ncx.createImageData(cw, chh), D = img.data;
                for (var py = 0; py < chh; py++) {
                    var y = py / q, band = plan.cirrus ? Math.max(0, 1 - Math.abs(y - H * 0.13) / (H * 0.11)) : 0;
                    for (var pxx = 0; pxx < cw; pxx++) {
                        var x = pxx / q, d = plan.cu.length ? cuDensity(x, y) : 0, r = 255, g = 255, bl = 255, al = 0;
                        if (d > 0) {
                            var occ = cuDensity(x - 5 * S, y - 7 * S), base = 0;          // thicker cloud between here and the sun: shade
                            for (var k2 = 0; k2 < plan.cu.length; k2++) { var c2 = plan.cu[k2], hgt = c2.y - c2.top; if (Math.abs(x - c2.x) < c2.a * 1.35 && y < c2.y + 10 * S) base = Math.max(base, Math.min(1, Math.max(0, (y - (c2.y - hgt * 0.4)) / (hgt * 0.42)))); }
                            var L = Math.max(0.3, Math.min(1, 1.06 - 0.36 * occ * (0.4 + 0.6 * d) - 0.3 * base));
                            r = 184 + 71 * L; g = 196 + 59 * L; bl = 218 + 37 * L; al = d * 0.96;
                        }
                        if (band > 0) {          // cirrus: long thin streaks, a little slanted
                            var ci2 = Math.max(0, Math.min(1, (fbm(x * 0.0045 / S + y * 0.002 / S, y * 0.05 / S) - 0.56) * 3.4)) * band * 0.5 * plan.cirrus;
                            if (ci2 > al) { r = r * al + 250 * (1 - al); g = g * al + 252 * (1 - al); bl = bl * al + 255 * (1 - al); al = Math.max(al, ci2); }
                        }
                        var o4 = (py * cw + pxx) * 4; D[o4] = r; D[o4 + 1] = g; D[o4 + 2] = bl; D[o4 + 3] = Math.round(al * 255);
                    }
                }
                ncx.putImageData(img, 0, 0);
                ctx.imageSmoothingQuality = 'high'; ctx.drawImage(nc, 0, 0, CW, shoreY);
            }
        }
        // 富士山: wide and low, with a flat top
        var hb = mh * 3.5, p = 1.9, dTop = 0.027;
        var prof = function(x) {
            var d = Math.abs(x - cx) / hb;
            if (d >= 1) return baseY;
            if (d < dTop) return summitY + 0.8 + Math.sin(x * 0.9) * 0.6;
            return baseY - mh * Math.pow(1 - d, p) / Math.pow(1 - dTop, p);
        };
        var mountain = function() { ctx.beginPath(); ctx.moveTo(-2, baseY + 4); for (var x = -2; x <= W + 2; x += 2) ctx.lineTo(x, prof(x)); ctx.lineTo(W + 2, baseY + 4); ctx.closePath(); };
        ctx = Ly.mtn.x;          // (at dawn the sun is behind it: the whole face is in shadow)
        var mg = ctx.createLinearGradient(0, summitY, 0, baseY);
        if (dawn) { mg.addColorStop(0, '#34305e'); mg.addColorStop(0.55, '#2c2a58'); mg.addColorStop(1, '#433768'); }
        else { mg.addColorStop(0, '#4a6597'); mg.addColorStop(0.55, '#5f76a3'); mg.addColorStop(1, '#8a9cc0'); }
        mountain(); ctx.fillStyle = mg; ctx.fill();
        ctx.save(); mountain(); ctx.clip();
        var sh = ctx.createLinearGradient(cx - hb * 0.03, 0, cx + hb * 0.6, 0);        // the right side in shade
        sh.addColorStop(0, dawn ? 'rgba(12,10,36,0)' : 'rgba(25,35,80,0)'); sh.addColorStop(1, dawn ? 'rgba(12,10,36,.28)' : 'rgba(25,35,80,.22)');
        ctx.fillStyle = sh; ctx.fillRect(cx, 0, W, baseY + 4);
        for (var i = 0; i < 70; i++) {           // soft mottling on the lower slopes (forest, shadow)
            var mx = cx + (rn() * 2 - 1) * hb * 0.9, my = prof(mx) + (baseY - prof(mx)) * (0.3 + rn() * 0.7), mr = (8 + rn() * 26) * S;
            blob(mx, my, mr, rn() < 0.5 ? (dawn ? '16,14,42' : '40,55,95') : (dawn ? '104,92,150' : '150,170,210'), 0.08);
        }
        // the snow cap, with fingers down the gullies and fine streaks running down from the top
        var ph = [rn() * 6, rn() * 6, rn() * 6, rn() * 6];
        var snowY = function(x) {
            var u = (x - cx) / hb;
            return summitY + mh * (0.4 + 0.035 * Math.sin(u * 11 + ph[0]) + 0.02 * Math.sin(u * 37 + ph[1]) + 0.025 * Math.pow(Math.max(0, Math.sin(u * 140 + ph[2])), 3) + 0.015 * Math.pow(Math.max(0, Math.sin(u * 233 + ph[3])), 3) + 0.008 * Math.sin(u * 517));
        };
        ctx.beginPath(); ctx.moveTo(-2, 0); for (var sx = -2; sx <= W + 2; sx += 1) ctx.lineTo(sx, snowY(sx)); ctx.lineTo(W + 2, 0); ctx.closePath();
        ctx.save(); ctx.clip();
        var sg = ctx.createLinearGradient(cx - hb * 0.25, 0, cx + hb * 0.25, 0);
        if (dawn) { sg.addColorStop(0, '#d2cbea'); sg.addColorStop(0.47, '#c6c0e4'); sg.addColorStop(0.56, '#a5a2d2'); sg.addColorStop(1, '#8b8cc0'); }
        else { sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.47, '#fbfdff'); sg.addColorStop(0.56, '#dce6f5'); sg.addColorStop(1, '#bccdea'); }
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, baseY);
        // the direction straight down the slope through a point (from just beside the summit)
        var downSlope = function(x, y) { var xa = cx + (x < cx ? -1 : 1) * dTop * hb * 0.5, dx = x - xa, dy = y - summitY, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
        // a soft strip down the slope: from (x0, y0) to (x1, y1), bowed outward a little (the slope is concave)
        var strip = function(x0, y0, x1, y1, w0, w1, bow) {
            var mx = (x0 + x1) / 2 + bow, my = (y0 + y1) / 2, L = [], R = [];
            for (var i = 0; i <= 10; i++) {
                var t = i / 10, q = wvQuad([x0, y0], [mx, my], [x1, y1], t), dx = 2 * (1 - t) * (mx - x0) + 2 * t * (x1 - mx), dy = 2 * (1 - t) * (my - y0) + 2 * t * (y1 - my), l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2;
                L.push([q[0] - dy / l * w, q[1] + dx / l * w]); R.push([q[0] + dy / l * w, q[1] - dx / l * w]);
            }
            ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); L.forEach(function(q) { ctx.lineTo(q[0], q[1]); }); R.reverse().forEach(function(q) { ctx.lineTo(q[0], q[1]); }); ctx.closePath(); ctx.fill();
        };
        // gullies: soft, irregular, curved, mostly in the lower part of the cap (twice: a wide faint one and a narrow one)
        for (var k = 0; k < 34; k++) {
            var s2 = rn() < 0.5 ? -1 : 1, gx = cx + s2 * (0.05 + rn() * 0.42) * hb, gy = snowY(gx) + 3, dir = downSlope(gx, gy), full = Math.hypot(gx - cx, gy - summitY), glen = full * (0.3 + rn() * 0.4), gw = (1.6 + rn() * 3.4) * S;
            var x0 = gx - dir[0] * glen, y0 = gy - dir[1] * glen, bow = s2 * glen * 0.06, a2 = 0.05 + rn() * 0.08, col = dawn ? (s2 < 0 ? '92,88,148' : '66,62,120') : (s2 < 0 ? '120,140,192' : '90,110,162');
            ctx.fillStyle = 'rgba(' + col + ',' + a2.toFixed(3) + ')'; strip(x0, y0, gx, gy, 0.3, gw * 2, bow);
            ctx.fillStyle = 'rgba(' + col + ',' + (a2 * 1.6).toFixed(3) + ')'; strip(x0 + dir[0] * glen * 0.2, y0 + dir[1] * glen * 0.2, gx, gy, 0.2, gw, bow * 0.8);
        }
        var thin = ctx.createLinearGradient(0, summitY + mh * 0.28, 0, summitY + mh * 0.5);        // a bluish tone where the snow thins
        var thc = dawn ? '140,130,190' : '170,190,228';
        thin.addColorStop(0, 'rgba(' + thc + ',0)'); thin.addColorStop(1, 'rgba(' + thc + ',.28)');
        ctx.fillStyle = thin; ctx.fillRect(0, summitY + mh * 0.28, W, mh * 0.3);
        ctx.restore();
        // the snow's lower edge: feathered, then breaking up into thin streaks along the ridges that fade into the rock
        for (var e = 0; e < 180; e++) {
            var ex = cx + (rn() * 2 - 1) * hb * 0.55, ey = snowY(ex) + rn() * 3 * S;
            if (ey >= baseY) continue;
            blob(ex, ey, (2 + rn() * 3) * S, dawn ? (ex < cx ? '214,206,238' : '176,172,216') : (ex < cx ? '255,255,255' : '222,231,245'), 0.35);
        }
        for (var k2 = 0; k2 < 210; k2++) {
            var s3 = rn() < 0.5 ? -1 : 1, tx3 = cx + s3 * (0.03 + rn() * 0.52) * hb, ty3 = snowY(tx3) - 3 * S, dir3 = downSlope(tx3, ty3);
            var tl = mh * (0.03 + Math.pow(rn(), 1.8) * 0.3), tw = (0.8 + rn() * 2.2) * S, tx4 = tx3 + dir3[0] * tl, ty4 = ty3 + dir3[1] * tl;
            if (ty4 > baseY - mh * 0.08) { var cut = (baseY - mh * 0.08 - ty3) / (ty4 - ty3); if (cut <= 0.2) continue; tx4 = tx3 + (tx4 - tx3) * cut; ty4 = ty3 + (ty4 - ty3) * cut; }
            var c3 = dawn ? (s3 < 0 ? '220,212,240' : '182,178,220') : (s3 < 0 ? '252,253,255' : '220,229,244'), a3 = 0.7 + rn() * 0.3, fg = ctx.createLinearGradient(tx3, ty3, tx4, ty4);
            fg.addColorStop(0, 'rgba(' + c3 + ',' + a3.toFixed(3) + ')'); fg.addColorStop(0.55, 'rgba(' + c3 + ',' + (a3 * 0.6).toFixed(3) + ')'); fg.addColorStop(1, 'rgba(' + c3 + ',0)');
            ctx.fillStyle = fg;
            strip(tx3, ty3, tx4, ty4, tw, tw * 0.3, s3 * tl * 0.06);
        }
        var hz = ctx.createLinearGradient(0, baseY - mh * 0.45, 0, baseY);       // haze at its foot
        var hzc = dawn ? '206,140,160' : '205,218,238';
        hz.addColorStop(0, 'rgba(' + hzc + ',0)'); hz.addColorStop(1, 'rgba(' + hzc + ',' + (dawn ? '.55' : '.45') + ')');
        ctx.fillStyle = hz; ctx.fillRect(0, baseY - mh * 0.45, W, mh * 0.45 + 4);
        ctx.restore();
        if (!dawn && (plan.mist || plan.kasa)) {
            // spring mist lying across the lower slopes (in front of the mountain, behind the foothills), and the 笠雲: a smooth,
            // layered lens of cloud capping the summit
            if (plan.mist) {
                var mq = 0.5, mw = Math.ceil(W * mq), my = baseY - mh * (0.16 + crn() * 0.12), mth = mh * (0.08 + crn() * 0.05), mtop = Math.max(0, Math.floor((my - mth * 2.4) * mq)), mhh = Math.ceil(mth * 4.8 * mq);
                var mc = document.createElement('canvas'); mc.width = mw; mc.height = mhh;
                var mcx = mc.getContext('2d'), mimg = mcx.createImageData(mw, mhh), MD = mimg.data;
                for (var my2 = 0; my2 < mhh; my2++) for (var mx2 = 0; mx2 < mw; mx2++) {
                    var X = mx2 / mq, Y = mtop / mq + my2 / mq, g2 = Math.exp(-Math.pow((Y - my) / mth, 2)), dm = Math.max(0, Math.min(1, (fbm(X * 0.012 / S, Y * 0.05 / S) - 0.38) * 2.2)) * g2 * 0.75;
                    var o5 = (my2 * mw + mx2) * 4; MD[o5] = 244; MD[o5 + 1] = 247; MD[o5 + 2] = 252; MD[o5 + 3] = Math.round(dm * 255);
                }
                mcx.putImageData(mimg, 0, 0);
                ctx.imageSmoothingQuality = 'high'; ctx.drawImage(mc, 0, mtop / mq, W, mhh / mq);
            }
            if (plan.kasa) {
                var kx = cx + (crn() - 0.5) * hb * 0.03, ky = summitY + mh * 0.06, kw = hb * (0.17 + crn() * 0.06), kh = mh * 0.08;
                ctx.save(); ctx.filter = 'blur(' + (1.2 * S).toFixed(1) + 'px)';          // soft-edged, smooth layers
                for (var kl = 0; kl < 4; kl++) {
                    var yy4 = ky - kl * kh * 0.42, ww4 = kw * (1 - kl * 0.18), hh4 = kh * (0.5 - kl * 0.06), kg = ctx.createLinearGradient(0, yy4 - hh4, 0, yy4 + hh4);
                    kg.addColorStop(0, 'rgba(255,255,255,.95)'); kg.addColorStop(0.6, 'rgba(236,241,249,.92)'); kg.addColorStop(1, 'rgba(176,190,214,.85)');
                    ctx.fillStyle = kg; ctx.beginPath(); ctx.ellipse(kx, yy4, ww4, hh4, 0, 0, 7); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(kx, yy4, ww4 * 1.06, hh4 * 1.25, 0, 0, 7); ctx.fill();          // soft edge
                }
                ctx.restore();
            }
        }
        // dark forested foothills along its foot
        ctx.fillStyle = dawn ? '#1d1c38' : '#34465a'; ctx.beginPath(); ctx.moveTo(-2, shoreY);
        for (var fx = -2; fx <= W + 2; fx += 4) ctx.lineTo(fx, baseY - (3 + 3 * Math.sin(fx * 0.03 + 1) + 2 * Math.sin(fx * 0.11) + rn() * 1.5) * S);
        ctx.lineTo(W + 2, shoreY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = dawn ? 'rgba(236,160,140,.2)' : 'rgba(205,218,238,.25)'; ctx.fillRect(0, baseY - 8 * S, W, 8 * S);
        // the far shore: a line of pink trees, some dark green ones among them
        if (dawn) {
            var shorePuff = function(x, y, r, col) { blob(x, y, r, col, 1); };
            for (var tx = -8; tx < W + 8; tx += (2.5 + rn() * 3) * S) {
                var th = (2 + rn() * 7) * S, tr = (3 + rn() * 3.5) * S, dark = rn() < 0.18;
                shorePuff(tx, shoreY - th, tr * 1.3, dawn ? (dark ? '16,20,30' : ['30,30,56', '36,36,62', '26,26,48', '44,40,70'][Math.floor(rn() * 4)]) : dark ? '48,70,62' : ['238,170,196', '244,190,210', '232,152,184', '250,212,226'][Math.floor(rn() * 4)]);
            }
            for (var tx2 = -8; tx2 < W + 8; tx2 += (2 + rn() * 2.5) * S) blob(tx2, shoreY - rn() * 2 * S, (2.5 + rn() * 2.5) * S, (dawn ? ['30,30,56', '36,36,62', '26,26,48'] : ['238,170,196', '244,190,210', '232,152,184'])[Math.floor(rn() * 3)], 1);
        } else {
            // the far shore: trees, not blobs. Cherry trees in bloom (a dark trunk forking into branches under a wide, umbrella-
            // shaped crown stippled from many small dabs of blossom, shaded underneath, bright on top, with gaps where the
            // branches show), dark cedars and pines, and fresh-green trees among them, on a grassy bank; a forest edge behind.
            var Ssave = S; S = Math.max(S, Math.min(2.2, W / 560));          // (the shore trees grow with wide screens)
            var PK = ['#f6c6d6', '#efb0c6', '#fbd9e5', '#f3bdd0'], dot = function(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
            // soft dabs (a round brush that fades at its edge), so the blossom reads as a mass of tiny flowers, not as bubbles
            var softs = {}, sd = function(x, y, r, col, al) {
                var c = softs[col];
                if (!c) { c = softs[col] = document.createElement('canvas'); c.width = c.height = 24; var x2 = c.getContext('2d'), g = x2.createRadialGradient(12, 12, 0, 12, 12, 12);
                    g.addColorStop(0, 'rgba(' + col + ',1)'); g.addColorStop(0.6, 'rgba(' + col + ',.92)'); g.addColorStop(1, 'rgba(' + col + ',0)'); x2.fillStyle = g; x2.fillRect(0, 0, 24, 24); }
                ctx.globalAlpha = al; ctx.drawImage(c, x - r, y - r, 2 * r, 2 * r);
            };
            // a cherry in bloom, seen from across the lake: a short trunk and a few limbs, under a crown of several soft, uneven
            // lobes; cool mauve shade low in the crown, sunlit pale blossom on top, and a fine grain of single flowers. Each tree
            // has its own tint: some nearly white (染井吉野), most soft pink, a few deeper.
            var TINTS = [[['250,226,234', '246,214,226', '252,234,240'], '214,170,192'], [['246,198,216', '242,186,206', '250,210,224'], '208,150,178'], [['240,176,200', '236,164,192', '246,190,210'], '198,136,166']];
            var sakuraTree = function(x, base, h, w) {
                var tn = TINTS[rn() < 0.28 ? 0 : rn() < 0.8 ? 1 : 2], body = tn[0], shade = tn[1];
                ctx.globalAlpha = 1; ctx.strokeStyle = '#7e6a6e'; ctx.lineCap = 'round';
                ctx.lineWidth = Math.max(0.7, w * 0.045); ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + (rn() - 0.5) * w * 0.05, base - h * 0.3); ctx.stroke();          // (the crown hides all but its foot)
                var nl = 3 + Math.floor(rn() * 3), lobes = [], area = 0;
                for (var l = 0; l < nl; l++) {
                    var lu = (l / (nl - 1) - 0.5) * 0.7 + (rn() - 0.5) * 0.16, rx = w * (0.2 + rn() * 0.12), ry = h * (0.2 + rn() * 0.1);
                    ry = h * (0.24 + rn() * 0.1);
                    lobes.push({ x: x + lu * w, y: base - h * 0.44 - (0.5 - Math.abs(lu)) * h * 0.3 - rn() * h * 0.05, rx: rx, ry: ry }); area += rx * ry;
                }
                var n = Math.round(40 + area / (S * S) * 0.9), pts = [];
                for (var k = 0; k < n; k++) {
                    var pick = rn() * area, L = lobes[0];
                    for (var q = 0; q < nl; q++) { pick -= lobes[q].rx * lobes[q].ry; if (pick <= 0) { L = lobes[q]; break; } }
                    var an = rn() * 6.283, d = Math.sqrt(rn()), vx = Math.cos(an) * d, vy = Math.sin(an) * d;
                    pts.push([L.x + vx * L.rx, L.y + vy * L.ry, vx, vy, d]);
                }
                var rr = Math.max(0.7, Math.min(1.6, w / (22 * S))) * S;
                pts.forEach(function(p) { if (p[3] > -0.05) sd(p[0] + 0.3 * rr, p[1] + 0.5 * rr, rr * (1 + rn() * 0.5), shade, 0.5); });                     // shade low in the crown
                pts.forEach(function(p) { sd(p[0], p[1], rr * (0.8 + rn() * 0.5), body[Math.floor(rn() * 3)], p[4] > 0.88 ? 0.55 : 0.9); });                     // the blossom
                pts.forEach(function(p) { if (p[3] < -0.25 && p[2] < 0.4 && rn() < 0.6) sd(p[0] - 0.2 * rr, p[1] - 0.3 * rr, rr * (0.5 + rn() * 0.4), '255,244,248', 0.65); });      // sunlight on top
                for (var k2 = 0; k2 < n * 1.3; k2++) {          // a fine, crisp grain of single flowers and the small shadows between them
                    var p2 = pts[Math.floor(rn() * n)]; if (p2[4] > 0.92) continue;
                    var lit = p2[3] < 0.1 && rn() < 0.75;
                    ctx.globalAlpha = lit ? 0.9 : 0.55; ctx.fillStyle = lit ? (rn() < 0.6 ? '#fff6f9' : '#fde8ef') : (rn() < 0.5 ? '#d9a0b8' : '#e3b0c4');
                    ctx.beginPath(); ctx.arc(p2[0] + (rn() - 0.5) * rr * 1.4, p2[1] + (rn() - 0.5) * rr * 1.4, (0.32 + rn() * 0.22) * S, 0, 7); ctx.fill();
                }
                ctx.globalAlpha = 1;
            };
            var cedar = function(x, base, h, w) {
                ctx.fillStyle = '#5a4646'; ctx.fillRect(x - 0.4 * S, base - h * 0.16, 0.8 * S, h * 0.16);
                for (var k = 0; k < 7; k++) {          // tiers of dark needles, narrower toward the top
                    var f = k / 6, ty = base - h * (0.12 + f * 0.82), tw = w * (0.5 - f * 0.4);
                    ctx.fillStyle = k % 2 ? '#5f7d6e' : '#557363'; ctx.beginPath(); ctx.moveTo(x - tw, ty + h * 0.08); ctx.lineTo(x, ty - h * 0.1); ctx.lineTo(x + tw, ty + h * 0.08); ctx.closePath(); ctx.fill();
                }
                ctx.fillStyle = '#6f8f80'; ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x - w * 0.18, base - h * 0.6); ctx.lineTo(x - w * 0.04, base - h * 0.62); ctx.closePath(); ctx.fill();
            };
            var greenTree = function(x, base, h, w) {
                ctx.strokeStyle = '#4e3c3c'; ctx.lineWidth = Math.max(0.7, w * 0.06); ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h * 0.4); ctx.stroke();
                for (var k = 0; k < 34; k++) { var u = rn() * 2 - 1, v = rn(), env = Math.sqrt(Math.max(0, 1 - u * u)); var px2 = x + u * w * 0.42, py2 = base - h * 0.45 - v * h * 0.5 * env;
                    dot(px2, py2, (0.7 + rn() * 0.9) * S, v < 0.4 || u > 0.4 ? '#7d9a72' : rn() < 0.5 ? '#94b088' : '#a9c29c'); }
            };
            // groves of cherry in bloom on the foothills behind: soft drifts of pink, hazier the higher (and farther) they are
            var hillTop = baseY - 9 * S, hillAt = function(x) { return baseY - (3 + 3 * Math.sin(x * 0.03 + 1) + 2 * Math.sin(x * 0.11)) * S; };
            for (var gx3 = -10; gx3 < W + 10; gx3 += (3 + rn() * 5) * S) {
                var gr3 = (1.8 + rn() * 2.4) * S, lo3 = hillAt(gx3) + gr3 * 0.9 + 1.5 * S, hi3 = shoreY - 3 * S;
                if (lo3 >= hi3) continue;
                var gy3 = lo3 + rn() * (hi3 - lo3), far3 = 1 - (gy3 - hillTop) / Math.max(1, shoreY - hillTop);
                for (var k4 = 0; k4 < 14; k4++) {
                    var a4 = rn() * 6.283, d4 = Math.sqrt(rn()) * gr3;
                    ctx.globalAlpha = (0.5 + rn() * 0.3) * (1 - far3 * 0.4);
                    sd(gx3 + Math.cos(a4) * d4 * 1.3, gy3 + Math.sin(a4) * d4 * 0.6, (0.7 + rn() * 0.6) * S, ['242,196,212', '235,182,202', '247,212,224', '231,172,194'][Math.floor(rn() * 4)], ctx.globalAlpha);
                }
            }
            // the forest edge along the shore: a band of small dabs, nearly all blossom, getting hazier upward
            for (var fx3 = -4; fx3 < W + 4; fx3 += 1.4 * S) {
                var hh = (4 + rn() * 5) * S;
                for (var k3 = 0; k3 < 4; k3++) { var yy3 = shoreY - 2 * S - rn() * hh; sd(fx3 + (rn() - 0.5) * 2 * S, yy3, (0.9 + rn() * 1) * S, rn() < 0.88 ? (rn() < 0.5 ? '240,191,208' : '233,179,199') : rn() < 0.5 ? '106,122,142' : '90,106,126', 0.55 + 0.35 * (1 - (shoreY - yy3) / (10 * S))); }
            }
            ctx.globalAlpha = 1;
            var uh = ctx.createLinearGradient(0, shoreY - 10 * S, 0, shoreY);          // a pale haze under the trees, so the trunks don't line up like a fence
            uh.addColorStop(0, 'rgba(214,196,212,0)'); uh.addColorStop(1, 'rgba(214,196,212,.55)');
            ctx.fillStyle = uh; ctx.fillRect(0, shoreY - 10 * S, W, 10 * S);
            // a row of smaller cherries just behind, a little hazier, so the shore is a full band of blossom
            for (var bx3 = -6; bx3 < W + 6; bx3 += (3.5 + rn() * 4) * S) { var bh = (11 + rn() * 7) * S; sakuraTree(bx3, shoreY - 1.6 * S, bh, bh * (1.4 + rn() * 0.4)); }
            var veil = ctx.createLinearGradient(0, shoreY - 22 * S, 0, shoreY);          // a little haze over the farther trees, for depth
            veil.addColorStop(0, 'rgba(232,228,242,.16)'); veil.addColorStop(1, 'rgba(232,228,242,.06)');
            ctx.globalAlpha = 1; ctx.fillStyle = veil; ctx.fillRect(0, shoreY - 22 * S, W, 22 * S);
            // the trees along the water, back to front, with gaps between them
            var row = [];
            for (var tx3 = -10; tx3 < W + 10; tx3 += (5 + rn() * 6) * S) row.push(tx3);
            // the few green trees first, a little hazy and no taller than the cherries, so the blossom overlaps and blends them in
            var kinds3 = row.map(function() { var r3 = rn(); return { r: r3, h: (11 + rn() * 15) * S * (rn() < 0.15 ? 1.35 : 1), w: 1.5 + rn() * 0.5 }; }), base3 = shoreY + 0.8 * S;
            ctx.globalAlpha = 0.85;
            row.forEach(function(x, i) { var k = kinds3[i]; if (k.r < 0.04) cedar(x, base3, k.h * 0.78, k.h * 0.42); else if (k.r < 0.065) greenTree(x, base3, k.h * 0.85, k.h * 0.9); });
            ctx.globalAlpha = 1;
            row.forEach(function(x, i) { var k = kinds3[i]; if (k.r >= 0.065) sakuraTree(x, base3, k.h * 1.08, k.h * k.w); });
            // low blossom all along the bank (young trees, sprays hanging down), so the trunks don't stand in a row like a fence
            for (var lx = -4; lx < W + 4; lx += 1.3 * S) {
                sd(lx + (rn() - 0.5) * 2 * S, shoreY - rn() * 4.5 * S, (1 + rn() * 1.3) * S, rn() < 0.25 ? '214,160,184' : ['246,198,214', '239,176,198', '251,217,229', '243,189,208'][Math.floor(rn() * 4)], 0.6 + rn() * 0.3);
            }
            ctx.globalAlpha = 1;
            // the waterline: a soft shadow beneath the trees, with only a hint of muted grass
            ctx.fillStyle = 'rgba(60,52,70,.32)'; ctx.fillRect(0, shoreY - 0.6 * S, W, 1.6 * S);
            ctx.fillStyle = 'rgba(120,140,110,.28)'; for (var gx = 0; gx < W; gx += 3 * S) ctx.fillRect(gx, shoreY - 0.4 * S - rn() * 0.8 * S, 0.6 * S, 0.8 * S);
            S = Ssave;
        }
        ctx.fillStyle = dawn ? '#33284a' : 'rgba(110,122,142,.5)'; ctx.fillRect(0, shoreY + S, W, 1.4 * S);
        // the lake: calm, a soft reflection, fine ripples
        var lakeTop = shoreY + 2.4 * S;
        ctx.globalAlpha = 1;
        if (dawn) ctx = Ly.rip.x;
        for (var r = 0; r < (dawn ? 260 : 0); r++) {          // (the spring lake's ripples move: see the end)
            var ry = lakeTop + Math.pow(rn(), 1.25) * (H - lakeTop), dep = (ry - lakeTop) / (H - lakeTop), rl = (8 + rn() * 40) * (0.3 + dep * 1.4) * S, rx = rn() * W;
            ctx.strokeStyle = rn() < 0.55 ? 'rgba(' + (dawn ? '255,206,170' : '255,255,255') + ',' + (0.06 + rn() * 0.16).toFixed(3) + ')' : 'rgba(' + (dawn ? '14,12,44' : '20,50,110') + ',' + (0.06 + rn() * 0.12).toFixed(3) + ')';
            ctx.lineWidth = (0.6 + dep * 1.2) * S;
            ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rl, ry); ctx.stroke();
        }
        if (dawn) {
            // the moving parts: stars fading, the sun cresting the summit and climbing, glitter on the lake, the hawk
            var T = Ly.top.x, stars = [[W * 0.6, H * 0.075, 1.7, 0]], glints = [], rowJit = [], lakeH = H - lakeTop, sr = 13 * S, T_END = 5.4, t0 = 0, lastT = 0, still = null;
            for (var si = 0; si < 40; si++) stars.push([rn() * W, Math.pow(rn(), 1.6) * H * 0.3, 0.4 + rn() * 0.9, rn()]);
            for (var gi = 0; gi < 150; gi++) glints.push([Math.pow(rn(), 1.25), (rn() + rn() + rn() - 1.5) / 1.5, 0.4 + rn(), rn() * 6.3, 2 + rn() * 4]);
            for (var ri = 0; ri < lakeH / 2 + 2; ri++) rowJit.push(rn() - 0.5);
            var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
            var sunAt = function(t) {          // the sun's center: how far below the summit it is (in sun radii), and where
                var u = Math.max(0, t - 1.1), dist = t < 1.1 ? 1.6 - 0.6 * t / 1.1 : 1 - 1.23 * u * u / (u + 0.6), up = Math.max(0, 1 - dist);
                return { x: cx + up * sr * 0.5, y: summitY + dist * sr, s: Math.min(1, up / 4.3), vis: Math.max(0, Math.min(1, (1 - dist) / 2)), flare: dist > -0.6 && dist < 1.2 ? Math.exp(-Math.pow((dist - 0.5) / 0.42, 2)) : 0 };
            };
            var drawTop = function(sun, now) {
                T.clearRect(0, 0, W, H);
                T.drawImage(Ly.sky.c, 0, 0, W, H);
                stars.forEach(function(st) {
                    var a = (1 - st[1] / (H * 0.3)) * (0.8 - sun.s * 0.62) * (0.65 + 0.35 * Math.sin(now * 0.002 + st[3] * 9));
                    if (a <= 0) return;
                    T.fillStyle = 'rgba(255,250,235,' + a.toFixed(3) + ')'; T.beginPath(); T.arc(st[0], st[1], st[2] * 0.7 * S, 0, 7); T.fill();
                });
                T.drawImage(Ly.cl.c, 0, 0, W, H);
                T.globalCompositeOperation = 'screen';          // the glow it throws across the sky and the clouds, then the sun itself
                var gA = 0.3 + sun.vis * 0.55, gr = T.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, W * 0.6);
                gr.addColorStop(0, 'rgba(255,214,150,' + (0.6 * gA).toFixed(3) + ')'); gr.addColorStop(0.22, 'rgba(255,170,120,' + (0.28 * gA).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,150,120,0)');
                T.fillStyle = gr; T.fillRect(0, 0, W, lakeTop);
                var ha = T.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sr * 7);
                [[0, 0.85], [0.08, 0.6], [0.16, 0.32], [0.3, 0.14], [0.5, 0.05], [0.75, 0.015], [1, 0]].forEach(function(st) { ha.addColorStop(st[0], 'rgba(255,222,165,' + st[1] + ')'); });
                T.fillStyle = ha; T.fillRect(sun.x - sr * 7, sun.y - sr * 7, sr * 14, sr * 14);
                T.globalCompositeOperation = 'source-over';
                var sd = T.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sr * 1.25);
                sd.addColorStop(0, '#ffffff'); sd.addColorStop(0.6, '#fffbea'); sd.addColorStop(0.78, '#ffeebb'); sd.addColorStop(0.82, 'rgba(255,226,160,.85)'); sd.addColorStop(1, 'rgba(255,214,140,0)');
                T.fillStyle = sd; T.beginPath(); T.arc(sun.x, sun.y, sr * 1.25, 0, 7); T.fill();
                T.drawImage(Ly.mtn.c, 0, 0, W, H);
                // light spilling over the ridge line near the sun
                var rimA = Math.min(1, 0.25 + 0.5 * sun.vis + 0.6 * sun.flare), rg = T.createLinearGradient(sun.x - hb * 0.4, 0, sun.x + hb * 0.4, 0);
                rg.addColorStop(0, 'rgba(255,200,150,0)'); rg.addColorStop(0.5, 'rgba(255,226,180,' + rimA.toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,200,150,0)');
                T.globalCompositeOperation = 'screen'; T.strokeStyle = rg; T.lineWidth = 1.5 * S; T.beginPath();
                for (var x = sun.x - hb * 0.4; x <= sun.x + hb * 0.4; x += 2) { if (x === sun.x - hb * 0.4) T.moveTo(x, prof(x)); else T.lineTo(x, prof(x)); }
                T.stroke();
                if (sun.flare > 0.01) {          // the diamond: a starburst where the first sliver of sun shows over the summit
                    var fl = sun.flare, fx = sun.x, fy = summitY - 0.5, core = T.createRadialGradient(fx, fy, 0, fx, fy, 34 * S);
                    T.globalCompositeOperation = 'lighter';
                    core.addColorStop(0, 'rgba(255,255,245,' + fl.toFixed(3) + ')'); core.addColorStop(0.2, 'rgba(255,240,200,' + (fl * 0.6).toFixed(3) + ')'); core.addColorStop(1, 'rgba(255,200,140,0)');
                    T.fillStyle = core; T.fillRect(fx - 34 * S, fy - 34 * S, 68 * S, 68 * S);
                    for (var k = 0; k < 8; k++) {
                        var len = (k % 2 ? 48 : 92) * S * (0.5 + fl * 0.5), ray = T.createLinearGradient(0, 0, len, 0);
                        ray.addColorStop(0, 'rgba(255,248,225,' + (0.85 * fl).toFixed(3) + ')'); ray.addColorStop(1, 'rgba(255,220,170,0)');
                        T.save(); T.translate(fx, fy); T.rotate(k * Math.PI / 4 + 0.2); T.fillStyle = ray; T.beginPath(); T.moveTo(0, -1.3 * S); T.lineTo(len, 0); T.lineTo(0, 1.3 * S); T.closePath(); T.fill(); T.restore();
                    }
                    var hs = T.createLinearGradient(fx - W * 0.5, 0, fx + W * 0.5, 0);
                    hs.addColorStop(0, 'rgba(255,210,160,0)'); hs.addColorStop(0.5, 'rgba(255,236,200,' + (0.5 * fl).toFixed(3) + ')'); hs.addColorStop(1, 'rgba(255,210,160,0)');
                    T.fillStyle = hs; T.fillRect(fx - W * 0.5, fy - S, W, 2 * S);
                }
                T.globalCompositeOperation = 'source-over';
            };
            var drawScene = function(c) {          // the sky and mountain above, the lake mirroring them below
                c.clearRect(0, 0, W, H);
                c.drawImage(Ly.top.c, 0, 0, W, H);
                var lg2 = c.createLinearGradient(0, lakeTop, 0, H);
                lg2.addColorStop(0, '#d99a86'); lg2.addColorStop(0.2, '#8a6690'); lg2.addColorStop(1, '#1d1f4a');
                c.fillStyle = lg2; c.fillRect(0, lakeTop, W, lakeH);
                for (var y = lakeTop, i = 0; y < H; y += 2, i++) {
                    var sy = lakeTop - (y - lakeTop) - 3, depth = (y - lakeTop) / lakeH;
                    if (sy < 0) break;
                    c.globalAlpha = 0.5 * (1 - depth * 0.7);
                    c.drawImage(Ly.top.c, 0, sy * dpr, W * dpr, 2 * dpr, Math.sin(y * 0.13 + 0.7) * (0.6 + depth * 3) + rowJit[i], y, W, 2);
                }
                c.globalAlpha = 1;
                c.drawImage(Ly.rip.c, 0, 0, W, H);
            };
            // 鳳凰: a golden phoenix in the old Japanese manner (like the one on the roof of 平等院), drawn feather by
            // feather like a real bird: it crosses the dawn sky with slow, heavy wingbeats, its long tail plumes rippling
            // behind it and shedding gold sparks as it goes. Lit warm from below by the sunrise.
            var spark = document.createElement('canvas'); spark.width = spark.height = 16;
            (function() { var x = spark.getContext('2d'), g2 = x.createRadialGradient(8, 8, 0, 8, 8, 8); g2.addColorStop(0, 'rgba(255,248,215,1)'); g2.addColorStop(0.3, 'rgba(255,214,120,.7)'); g2.addColorStop(1, 'rgba(255,180,60,0)'); x.fillStyle = g2; x.fillRect(0, 0, 16, 16); })();
            var motes = [], pSpeed = (W * 0.6 + 80 * S) / 4.8, PLUMES = [[1.9, 0.04], [1.65, -0.1], [2.1, 0.2], [1.5, 0.3], [1.8, -0.02]];
            // the phoenix's wing: the long flight feathers (root c, r → tip c, r), outermost first, and the smooth layer of coverts
            var PRIM = [[0.08, 0.95, -0.02, 1.6], [0.05, 0.9, -0.1, 1.55], [0.02, 0.85, -0.17, 1.48], [-0.01, 0.8, -0.24, 1.38], [-0.04, 0.74, -0.3, 1.26], [-0.06, 0.68, -0.35, 1.12], [-0.08, 0.62, -0.4, 0.98], [-0.09, 0.56, -0.44, 0.84]].reverse();
            var COV = [[0.13, 0], [0.18, 0.25], [0.19, 0.5], [0.14, 0.75], [0.08, 0.98], [0, 1.02]];
            for (var ck = 0; ck <= 12; ck++) { var cr0 = 0.98 - ck * 0.08; COV.push([-0.06 - 0.12 * Math.sin(Math.PI * Math.min(1, cr0 / 1.0)) * 0.9 - (ck % 2 ? 0 : 0.025), cr0]); }
            COV.push([-0.12, 0]);
            var same = function(q) { return q; };
            var path = function(pts, map) { main.beginPath(); pts.forEach(function(q, i) { var m = map(q); if (i) main.lineTo(m[0], m[1]); else main.moveTo(m[0], m[1]); }); main.closePath(); };
            var PROF = { round: [0.55, 0.85, 1, 0.95, 0.75, 0], point: [0.5, 0.85, 1, 0.8, 0.42, 0] }, SS = [0, 0.25, 0.5, 0.75, 0.9, 1];
            // one feather, from its root (c0, r0) to its tip (c1, r1) in wing coordinates, projected through map;
            // shaded from dark at the root to bright at the edge, with its shaft showing
            var feather = function(map, c0, r0, c1, r1, w, kind, bend, cols, detail) {
                var dx = c1 - c0, dy = r1 - r0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, L = [], R = [];
                SS.forEach(function(s, i) {
                    var hw = w * 0.5 * PROF[kind][i], b = bend * Math.sin(Math.PI * s), px = c0 + dx * s + nx * b, py = r0 + dy * s + ny * b;
                    L.push([px + nx * hw, py + ny * hw]); R.push([px - nx * hw, py - ny * hw]);
                });
                var a = map([c0, r0]), z = map([c1, r1]), gr = main.createLinearGradient(a[0], a[1], z[0], z[1]);
                gr.addColorStop(0, cols[0]); gr.addColorStop(0.55, cols[1]); gr.addColorStop(1, cols[2]);
                path(L.concat(R.reverse()), map); main.fillStyle = gr; main.fill();
                if (!detail) return;
                main.strokeStyle = 'rgba(90,56,12,.28)'; main.lineWidth = 0.005; main.stroke();
                var m1 = map([c0 + dx * 0.05, r0 + dy * 0.05]), m2 = map([c0 + dx * 0.5 + nx * bend, r0 + dy * 0.5 + ny * bend]), m3 = map([c0 + dx * 0.92, r0 + dy * 0.92]);
                main.strokeStyle = 'rgba(255,240,190,.55)'; main.lineWidth = 0.005; main.beginPath(); main.moveTo(m1[0], m1[1]); main.quadraticCurveTo(m2[0], m2[1], m3[0], m3[1]); main.stroke();
            };
            var phoenix = function(t, dt) {
                // first the sparks it has already shed: they drift, sink a little, twinkle and fade
                main.globalCompositeOperation = 'lighter';
                for (var i = motes.length - 1; i >= 0; i--) {
                    var m = motes[i]; m.life -= dt;
                    if (m.life <= 0) { motes.splice(i, 1); continue; }
                    m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 5 * S * dt; m.vx *= 1 - 0.6 * dt;
                    var a = (m.life / m.max) * (0.55 + 0.45 * Math.sin(t * 9 + m.tw)), z = m.r * 6;
                    if (a <= 0.01) continue;
                    main.globalAlpha = Math.min(1, a); main.drawImage(spark, m.x - z / 2, m.y - z / 2, z, z);
                    if (m.r > 1.4 * S && a > 0.45) { main.fillStyle = '#fff6dc'; main.fillRect(m.x - z * 0.6, m.y - 0.3, z * 1.2, 0.6); main.fillRect(m.x - 0.3, m.y - z * 0.6, 0.6, z * 1.2); }
                }
                main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
                var c = (t - 0.2) % 18;
                if (t < 0.2 || c > 11) return;
                var Ls = 32 * S, D = Math.PI / 180, e = 20 * D, rot = -0.05;          // seen from the side and a little below, like its body
                // the wingbeat: a slow, powerful downstroke with the wing spread (60% of the beat), then a quicker upstroke
                // with the hand partly folded and swept back; the tips lag behind the stroke; the body lifts on each downstroke
                var u = (t * 0.8) % 1, down = u < 0.6, psi = down ? Math.PI * u / 0.6 : Math.PI + Math.PI * (u - 0.6) / 0.4;
                var fold = down ? 0 : 0.85 * Math.sin(Math.PI * (u - 0.6) / 0.4), a1 = (10 + 48 * Math.cos(psi)) * D, a2 = a1 + 20 * Math.sin(psi) * D;
                var hx = -80 * S + c * pSpeed, hy = H * 0.2 - c * H * 0.006 + Math.sin(c * 0.8) * H * 0.01 - Math.sin(psi) * 0.05 * Ls;
                var wmap = function(sign) {
                    var s1 = Math.sin(a1 + sign * e), s2 = Math.sin(a2 + sign * e), k = sign > 0 ? 1 : 0.9, ox = sign > 0 ? 0.04 : 0.08, oy = sign > 0 ? -0.06 : -0.08;      // the far wing: a little behind and smaller
                    return function(q) {
                        var r = q[1], cc = q[0] - 0.22 * Math.pow(Math.max(0, r - 0.3), 2);          // the wing sweeps back as it goes out
                        if (r > 0.5) { cc -= 0.25 * fold * (r - 0.5); r = 0.5 + (r - 0.5) * (1 - 0.4 * fold); }
                        return [ox + cc * k, oy - (r <= 0.5 ? r * s1 : 0.5 * s1 + (r - 0.5) * s2) * k];
                    };
                };
                var far = wmap(-1), near = wmap(1), tips = [], plumePts = [];
                var wing = function(map, isFar) {
                    var P = isFar ? ['#7e5418', '#b0802c', '#d4a24a'] : ['#b8822a', '#e6b552', '#fff2c8'];
                    // a fringe of long feathers along the back of the arm, and the long flight feathers fanning out from the
                    // hand; then the smooth layer of coverts over their bases
                    for (var j = 6; j >= 0; j--) feather(map, -0.08, 0.05 + j * 0.075, -0.5 + j * 0.015, 0.1 + j * 0.082, 0.11, 'round', 0.015, P, !isFar);
                    PRIM.forEach(function(f, k) { feather(map, f[0], f[1], f[2], f[3], 0.1, 'point', -0.02, P, !isFar); if (!isFar && k > 3) tips.push(map([f[2], f[3]])); });
                    var g = map([0.18, 0.4]), h2 = map([-0.2, 0.4]), cg = main.createLinearGradient(g[0], g[1], h2[0], h2[1]);
                    cg.addColorStop(0, isFar ? '#d9a84e' : '#fff3cc'); cg.addColorStop(0.45, isFar ? '#b0802c' : '#ecbd5e'); cg.addColorStop(1, isFar ? '#8a5c1c' : '#c48c30');
                    path(COV, map); main.fillStyle = cg; main.fill();
                    if (isFar) return;
                    main.strokeStyle = 'rgba(110,70,16,.35)'; main.lineWidth = 0.005; main.stroke();
                    main.strokeStyle = 'rgba(130,86,22,.28)'; main.beginPath();          // a hint of the covert rows
                    for (var rr = 0.06; rr < 0.9; rr += 0.07) { var k0 = map([-0.02, rr]), k1 = map([-0.06, rr + 0.035]), k2 = map([-0.02, rr + 0.07]); main.moveTo(k0[0], k0[1]); main.quadraticCurveTo(k1[0], k1[1], k2[0], k2[1]); }
                    main.stroke();
                    main.lineCap = 'round'; main.strokeStyle = 'rgba(255,246,214,.75)'; main.lineWidth = 0.012; main.beginPath();          // light along the leading edge
                    COV.slice(0, 5).forEach(function(q, i) { var m = map(q); if (i) main.lineTo(m[0], m[1]); else main.moveTo(m[0], m[1]); }); main.stroke();
                };
                var plume = function(pts, wf, eye, k) {          // a long tail feather: shaft, a vane of fine barbs, and an eye near the tip
                    var L2 = [], R2 = [], barbs = [];
                    for (var i = 0; i < pts.length; i++) {
                        var p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)], tx = p1[0] - p0[0], ty = p1[1] - p0[1], l = Math.hypot(tx, ty) || 1, w = wf(i / (pts.length - 1));
                        tx /= l; ty /= l;
                        L2.push([pts[i][0] - ty * w, pts[i][1] + tx * w]); R2.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
                        barbs.push([pts[i], [pts[i][0] - ty * w * 1.18 + tx * w * 0.9, pts[i][1] + tx * w * 1.18 + ty * w * 0.9], [pts[i][0] + ty * w * 1.18 + tx * w * 0.9, pts[i][1] - tx * w * 1.18 + ty * w * 0.9]]);
                    }
                    var f = pts[0], g = pts[pts.length - 1], vg = main.createLinearGradient(f[0], f[1], g[0], g[1]);
                    vg.addColorStop(0, '#9a6a1e'); vg.addColorStop(0.4, k % 2 ? '#d49c3c' : '#e2ac48'); vg.addColorStop(1, '#f4cf78');
                    path(L2.concat(R2.reverse()), same); main.globalAlpha = 0.93; main.fillStyle = vg; main.fill(); main.globalAlpha = 1;
                    main.strokeStyle = 'rgba(255,226,150,.38)'; main.lineWidth = 0.005; main.beginPath();
                    barbs.forEach(function(b) { main.moveTo(b[0][0], b[0][1]); main.lineTo(b[1][0], b[1][1]); main.moveTo(b[0][0], b[0][1]); main.lineTo(b[2][0], b[2][1]); }); main.stroke();
                    main.strokeStyle = '#fbe3a0'; main.lineWidth = 0.009; main.beginPath();
                    pts.slice(0, pts.length - 2).forEach(function(q, i) { if (i) main.lineTo(q[0], q[1]); else main.moveTo(q[0], q[1]); }); main.stroke();
                    if (!eye) return;
                    var n = pts.length, ep = pts[Math.round(n * 0.85)], en = pts[Math.round(n * 0.85) + 1], ang = Math.atan2(en[1] - ep[1], en[0] - ep[0]);
                    [[0.07, 0.046, '#f8dc8a'], [0.052, 0.034, '#7a4e12'], [0.038, 0.025, '#e2a440'], [0.02, 0.014, '#2e1c06']].forEach(function(r) { main.fillStyle = r[2]; main.beginPath(); main.ellipse(ep[0], ep[1], r[0], r[1], ang, 0, 7); main.fill(); });
                    main.fillStyle = 'rgba(255,250,230,.8)'; main.beginPath(); main.arc(ep[0] + 0.006, ep[1] - 0.006, 0.006, 0, 7); main.fill();
                };
                main.save(); main.translate(hx, hy); main.rotate(rot); main.scale(Ls, Ls);
                main.globalCompositeOperation = 'screen';          // a soft glow around it
                var au = main.createRadialGradient(0, -0.05, 0, 0, -0.05, 1.5);
                au.addColorStop(0, 'rgba(255,214,130,.26)'); au.addColorStop(1, 'rgba(255,190,90,0)');
                main.fillStyle = au; main.fillRect(-1.5, -1.6, 3, 3);
                main.globalCompositeOperation = 'source-over';
                wing(far, true);
                PLUMES.forEach(function(pl, k) {
                    var pts = [];
                    for (var i = 0; i <= 30; i++) { var s = i / 30; pts.push([-0.28 - s * pl[0], 0.03 + s * pl[1] + Math.pow(s, 1.4) * 0.16 * Math.sin(s * 4.4 - t * 2.4 + k * 0.9)]); if (s >= 0.45) plumePts.push(pts[i]); }
                    plume(pts, function(s) { return s < 0.7 ? 0.04 * (1 - 0.5 * s) : 0.026 * (1 - (s - 0.7) / 0.3) + 0.07 * Math.sin(Math.PI * (s - 0.7) / 0.3); }, true, k);
                });
                [[0.62, 0.0], [0.5, 0.1], [0.56, -0.06], [0.45, 0.04]].forEach(function(cv2, k) {          // shorter tail coverts
                    var pts = []; for (var i = 0; i <= 12; i++) { var s = i / 12; pts.push([-0.2 - s * cv2[0], 0.02 + s * cv2[1] + s * s * 0.05 * Math.sin(t * 2.4 + k)]); }
                    plume(pts, function(s) { return 0.045 * Math.sin(Math.PI * Math.min(1, s * 1.05 + 0.1)); }, false, k + 1);
                });
                // the body: rounded, lit from below by the sunrise, covered in small scale-like feathers
                var bg = main.createRadialGradient(0.1, 0.07, 0, 0.02, 0, 0.36);
                bg.addColorStop(0, '#fff0c0'); bg.addColorStop(0.35, '#e9b85a'); bg.addColorStop(0.75, '#b07a26'); bg.addColorStop(1, '#6e4612');
                main.fillStyle = bg; main.beginPath(); main.ellipse(0, 0, 0.3, 0.105, -0.1, 0, 7); main.fill();
                main.strokeStyle = 'rgba(122,78,18,.45)'; main.lineWidth = 0.006;
                for (var row = 0; row < 3; row++) for (var col = 0; col < 7; col++) {
                    var sx = -0.2 + col * 0.06 + (row % 2) * 0.03, sy = -0.035 + row * 0.035;
                    if ((sx / 0.3) * (sx / 0.3) + (sy / 0.1) * (sy / 0.1) > 0.8) continue;
                    main.beginPath(); main.arc(sx, sy, 0.024, 0.15 * Math.PI, 0.85 * Math.PI); main.stroke();
                }
                // the neck curving up, with long hackle feathers draping down it
                var neck = []; for (var i3 = 0; i3 <= 12; i3++) neck.push(wvQuad([0.16, -0.03], [0.42, -0.05], [0.53, -0.3], i3 / 12));
                var ng = main.createLinearGradient(0.36, -0.24, 0.52, -0.1);
                ng.addColorStop(0, '#9a6a1e'); ng.addColorStop(0.5, '#e2b04a'); ng.addColorStop(1, '#fbe0a0');
                var NL = [], NR = [];
                neck.forEach(function(q, i) { var w = 0.05 - 0.022 * i / 12, a0 = neck[Math.max(0, i - 1)], b0 = neck[Math.min(12, i + 1)], tx = b0[0] - a0[0], ty = b0[1] - a0[1], l = Math.hypot(tx, ty) || 1; NL.push([q[0] - ty / l * w, q[1] + tx / l * w]); NR.push([q[0] + ty / l * w, q[1] - tx / l * w]); });
                path(NL.concat(NR.reverse()), same); main.fillStyle = ng; main.fill();
                for (var hk = 0; hk < 9; hk++) {
                    var u0 = 0.55 + hk * 0.045, p0 = wvQuad([0.16, -0.03], [0.42, -0.05], [0.53, -0.3], Math.min(1, u0 + 0.12)), p1 = wvQuad([0.16, -0.03], [0.42, -0.05], [0.53, -0.3], Math.max(0, u0 - 0.42));
                    feather(same, p0[0] - 0.012, p0[1], p1[0] - 0.035 + Math.sin(t * 2 + hk) * 0.004, p1[1] + 0.02, 0.03, 'point', 0.01, ['#a8721e', '#e8b850', '#fff0c0'], true);
                }
                // the head: crest plumes, red bare skin around the eye, a hooked beak
                for (var k2 = 0; k2 < 4; k2++) {
                    var cp = []; for (var i2 = 0; i2 <= 10; i2++) cp.push(wvQuad([0.545, -0.37], [0.52 - k2 * 0.025, -0.5 + k2 * 0.025], [0.42 - k2 * 0.045, -0.5 + k2 * 0.06 + Math.sin(t * 2 + k2) * 0.01], i2 / 10));
                    plume(cp, function(s) { return s < 0.62 ? 0.006 : 0.006 + 0.022 * Math.sin(Math.PI * (s - 0.62) / 0.38); }, false, k2);
                }
                var hg = main.createRadialGradient(0.58, -0.32, 0, 0.56, -0.34, 0.08);
                hg.addColorStop(0, '#fff0c0'); hg.addColorStop(0.5, '#e6b552'); hg.addColorStop(1, '#9a6a1e');
                main.fillStyle = hg; main.beginPath(); main.ellipse(0.56, -0.335, 0.068, 0.05, -0.3, 0, 7); main.fill();
                main.fillStyle = '#c4482c'; main.beginPath(); main.ellipse(0.585, -0.338, 0.03, 0.022, -0.2, 0, 7); main.fill();          // bare red skin
                main.fillStyle = '#b03a26'; main.beginPath(); main.ellipse(0.598, -0.29, 0.016, 0.032, 0.25, 0, 7); main.fill();          // wattle
                var bk = main.createLinearGradient(0.61, -0.37, 0.69, -0.32);
                bk.addColorStop(0, '#e8c070'); bk.addColorStop(1, '#7a5014');
                main.fillStyle = bk; path([[0.612, -0.362], [0.66, -0.358], [0.705, -0.338], [0.692, -0.318], [0.668, -0.33], [0.615, -0.318]], same); main.fill();
                main.fillStyle = '#f2c64a'; main.beginPath(); main.arc(0.586, -0.343, 0.016, 0, 7); main.fill();
                main.fillStyle = '#1c1004'; main.beginPath(); main.arc(0.588, -0.343, 0.01, 0, 7); main.fill();
                main.fillStyle = '#fffbe8'; main.beginPath(); main.arc(0.591, -0.347, 0.0035, 0, 7); main.fill();
                wing(near, false);
                main.restore();
                // shed new sparks from the plumes and the wingtips (in screen space, so they stay behind as it flies on)
                var cr = Math.cos(rot), sn = Math.sin(rot), want = 90 * dt;
                while (want > 0 && plumePts.length) {
                    if (want < 1 && Math.random() > want) break;
                    want -= 1;
                    var src = Math.random() < 0.82 || !tips.length ? plumePts[Math.floor(Math.random() * plumePts.length)] : tips[Math.floor(Math.random() * tips.length)], life = 1.1 + Math.random() * 1.3;
                    motes.push({ x: hx + Ls * (src[0] * cr - src[1] * sn), y: hy + Ls * (src[0] * sn + src[1] * cr), vx: (Math.random() - 0.6) * 14 * S, vy: (Math.random() * 10 - 2) * S, life: life, max: life, r: (0.6 + Math.random() * 1.4) * S, tw: Math.random() * 6.3 });
                }
            };
            var hawk = function(t) {          // seen from the side and a little below: a few strong wingbeats, then a glide
                var cyc = (t - 0.4) % 16;
                if (t < 0.4 || cyc > 9) return;
                var Ls = 15 * S, per = cyc % 3, ph = t * Math.PI * 2 * 2.6, D = Math.PI / 180, e = 16 * D;
                var wf = per < 1.3 ? Math.min(1, per / 0.2) : Math.max(0, 1 - (per - 1.3) / 0.35);      // 1 while flapping, easing to 0 for the glide
                var hx = -40 * S + cyc / 9 * (W + 80 * S), hy = H * 0.19 - Math.sin(cyc / 9 * Math.PI) * H * 0.03 + wf * Math.cos(ph) * 0.05 * Ls;
                var a1 = (6 + wf * (4 + 45 * Math.sin(ph))) * D, a2 = a1 + (-4 + wf * (4 + 20 * Math.sin(ph - 1))) * D;      // arm, and the hand lagging behind it
                var WING = [[0.1, 0], [0.14, 0.3], [0.12, 0.55], [0.05, 0.8], [-0.02, 1], [-0.09, 0.97], [-0.06, 0.9], [-0.14, 0.93], [-0.12, 0.84], [-0.19, 0.86], [-0.17, 0.76], [-0.22, 0.55], [-0.22, 0.3], [-0.16, 0]];
                var wing = function(sign, col) {          // sign 1: the near wing (tilted toward you, so it shows higher); -1: the far one
                    var s1 = Math.sin(a1 + sign * e), s2 = Math.sin(a2 + sign * e);
                    main.fillStyle = col; main.beginPath();
                    WING.forEach(function(q, i) { var up = q[1] <= 0.55 ? q[1] * s1 : 0.55 * s1 + (q[1] - 0.55) * s2; if (i) main.lineTo(0.08 + q[0] * 1.35, -0.02 - up); else main.moveTo(0.08 + q[0] * 1.35, -0.02 - up); });
                    main.closePath(); main.fill();
                };
                main.save(); main.translate(hx, hy); main.scale(Ls, Ls); main.rotate(-0.04);
                wing(-1, 'rgba(46,40,66,.92)');
                main.fillStyle = 'rgba(28,24,44,.96)'; main.beginPath();
                [[0.47, -0.02], [0.53, 0.005], [0.5, 0.045], [0.43, 0.075], [0.2, 0.135], [-0.1, 0.12], [-0.3, 0.06], [-0.66, 0.1], [-0.68, -0.02], [-0.3, -0.035], [0, -0.095], [0.33, -0.1], [0.44, -0.075]].forEach(function(q, i) { if (i) main.lineTo(q[0], q[1]); else main.moveTo(q[0], q[1]); });
                main.closePath(); main.fill();
                wing(1, 'rgba(28,24,44,.96)');
                main.restore();
            };
            var frame = function(now) {
                if (!cv.isConnected || welcomeView.style.display === 'none') return;
                if (!t0) t0 = now;
                var t = reduce ? T_END + 1 : (now - t0) / 1000, sun = sunAt(Math.min(t, T_END));
                if (t > T_END && !still) { drawTop(sun, now); still = mkLayer(); drawScene(still.x); }      // the sun is up: keep that picture
                if (still) { main.clearRect(0, 0, W, H); main.drawImage(still.c, 0, 0, W, H); } else { drawTop(sun, now); drawScene(main); }
                main.globalCompositeOperation = 'lighter';          // 光の道: the sun's path of light across the water
                glints.forEach(function(q) {
                    var dep = q[0], y = lakeTop + dep * lakeH, x = sun.x + q[1] * (8 + dep * 70) * S, tw = Math.sin(now * 0.001 * q[4] + q[3]);
                    var a = sun.vis * (0.15 + 0.85 * tw * tw) * (0.9 - dep * 0.45) * q[2] * 0.7;
                    if (a < 0.02) return;
                    var len = (2 + dep * 12) * S * q[2];
                    main.fillStyle = 'rgba(255,214,160,' + Math.min(1, a).toFixed(3) + ')'; main.fillRect(x - len / 2, y, len, (0.6 + dep * 1.2) * S);
                });
                main.globalCompositeOperation = 'source-over';
                var dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
                if (dawn === 2) phoenix(reduce ? 3.2 : t, reduce ? 0 : dt); else hawk(t);
                if (!reduce) requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
            return;
        }
        ctx = Ly.fg.x;
        // 桜 branches hanging in from the edges: thin dark limbs, dense soft blossom along them, a few twigs showing through
        var sprite = {}, puff = function(c) {
            if (sprite[c]) return sprite[c];
            var s = document.createElement('canvas'); s.width = s.height = 32;
            var x = s.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
            gr.addColorStop(0, 'rgba(' + c + ',1)'); gr.addColorStop(0.55, 'rgba(' + c + ',.95)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
            x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
            return (sprite[c] = s);
        };
        var PINK = ['250,204,221', '246,186,208', '240,166,194', '252,218,230', '255,232,240'], SHADE = '196,112,150', LIGHT = '255,246,250';
        // a tiny five-petal flower, drawn once per tint
        var flowers = {}, floret = function(c) {
            if (flowers[c]) return flowers[c];
            var f = document.createElement('canvas'); f.width = f.height = 24;
            var x = f.getContext('2d'); x.translate(12, 12);
            for (var i = 0; i < 5; i++) { x.rotate(Math.PI * 2 / 5); x.fillStyle = 'rgb(' + c + ')'; x.beginPath(); x.ellipse(0, -5.2, 3.6, 5, 0, 0, 7); x.fill(); }
            x.fillStyle = 'rgba(214,92,140,.85)'; x.beginPath(); x.arc(0, 0, 1.8, 0, 7); x.fill();
            return (flowers[c] = f);
        };
        var limbs = [   // [points as screen fractions], start width, end width
            [[[-0.06, -0.03], [0.12, 0.05], [0.28, 0.08], [0.42, 0.14], [0.5, 0.2]], 9, 2],
            [[[-0.06, 0.04], [0.07, 0.17], [0.16, 0.3], [0.21, 0.44], [0.24, 0.55]], 8, 2],
            [[[-0.06, 0.26], [0.04, 0.38], [0.09, 0.5], [0.12, 0.62], [0.13, 0.7]], 7, 1.6],
            [[[0.12, 0.05], [0.22, 0.17], [0.3, 0.27], [0.34, 0.36]], 4, 1.4],
            [[[0.04, 0.12], [0.02, 0.24], [0.05, 0.34]], 3.5, 1.2],
            [[[1.06, 0.36], [0.96, 0.4], [0.88, 0.45], [0.83, 0.52]], 7, 1.8, 0.72],          // (the group on the right: smaller, lighter)
            [[[1.06, 0.48], [0.99, 0.54], [0.95, 0.61]], 5, 1.4, 0.72],
            [[[0.93, 0.42], [0.9, 0.48]], 2.6, 1.1, 0.68]
        ];
        var px = function(q) { return [q[0] * W, q[1] * H]; };
        // a branch as a real limb: a smooth, slightly gnarled curve through the points, tapering toward the tip, with dark bark,
        // light along its upper edge, shadow beneath, and the horizontal lenticels of cherry bark
        var drawLimb = function(pts, w0, w1) {
            var P = pts.map(px), sm = [];
            for (var i = 0; i < P.length - 1; i++) {
                var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
                for (var k = 0; k < 12; k++) {
                    var t = k / 12, t2 = t * t, t3 = t2 * t, cr = function(a, b, c, d) { return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3); };
                    sm.push([cr(p0[0], p1[0], p2[0], p3[0]) + (rn() - 0.5) * 1.2 * S, cr(p0[1], p1[1], p2[1], p3[1]) + (rn() - 0.5) * 1.2 * S]);
                }
            }
            sm.push(P[P.length - 1]);
            var n = sm.length, Lf = [], Rt = [], up = [], lo = [];
            for (var j = 0; j < n; j++) {
                var a2 = sm[Math.max(0, j - 1)], b2 = sm[Math.min(n - 1, j + 1)], tx = b2[0] - a2[0], ty = b2[1] - a2[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
                var w = (w0 + (w1 - w0) * Math.pow(j / (n - 1), 0.75)) * S * (1 + 0.1 * Math.sin(j * 1.3)) / 2;
                if (ny > 0) { nx = -nx; ny = -ny; }          // (nx, ny) points up
                Lf.push([sm[j][0] + nx * w, sm[j][1] + ny * w]); Rt.push([sm[j][0] - nx * w, sm[j][1] - ny * w]);
                up.push([sm[j][0] + nx * w * 0.55, sm[j][1] + ny * w * 0.55, w]); lo.push([sm[j][0] - nx * w * 0.6, sm[j][1] - ny * w * 0.6, w]);
            }
            ctx.fillStyle = '#3a2a28'; ctx.beginPath(); ctx.moveTo(Lf[0][0], Lf[0][1]); Lf.forEach(function(p) { ctx.lineTo(p[0], p[1]); }); for (var r2 = n - 1; r2 >= 0; r2--) ctx.lineTo(Rt[r2][0], Rt[r2][1]); ctx.closePath(); ctx.fill();
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(122,100,94,.75)'; ctx.beginPath(); up.forEach(function(p, i) { ctx.lineWidth = Math.max(0.5, p[2] * 0.45); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
            ctx.strokeStyle = 'rgba(24,16,16,.5)'; ctx.beginPath(); lo.forEach(function(p, i) { ctx.lineWidth = Math.max(0.5, p[2] * 0.5); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
            ctx.strokeStyle = 'rgba(160,140,132,.45)'; ctx.lineWidth = Math.max(0.5, 0.6 * S); ctx.beginPath();          // lenticels across the bark
            for (var m2 = 2; m2 < n - 3; m2 += 3) { if (rn() < 0.4) continue; var q2 = sm[m2], wq = up[m2][2] * 0.7, ang = Math.atan2(Lf[m2][1] - Rt[m2][1], Lf[m2][0] - Rt[m2][0]); ctx.moveTo(q2[0] - Math.cos(ang) * wq * 0.2, q2[1] - Math.sin(ang) * wq * 0.2); ctx.lineTo(q2[0] + Math.cos(ang) * wq, q2[1] + Math.sin(ang) * wq); }
            ctx.stroke();
        };
        var clusters = [], twigs = [];
        limbs.forEach(function(lb) {
            var sc = lb[3] || 1, last = px(lb[0][lb[0].length - 1]);
            drawLimb(lb[0], lb[1], lb[2]);
            for (var i = 0; i < lb[0].length - 1; i++) {
                var a = px(lb[0][i]), b = px(lb[0][i + 1]), segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
                for (var d = 0; d < segLen; d += 7 * S) {
                    var t = d / segLen, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
                    if (rn() < 0.08) continue;
                    var R = (18 + rn() * 16) * S * sc * (1.2 - 0.45 * (i + t) / (lb[0].length - 1));
                    clusters.push([x + (rn() - 0.5) * R * 0.7, y + R * (0.15 + rn() * 0.45), R]);        // blossom hangs just below the branch, with only glimpses of bark
                    if (rn() < 0.1) { var tx4 = x + (rn() - 0.5) * 18 * S, ty4 = y + (6 + rn() * 10) * S; twigs.push([x, y, tx4, ty4]); clusters.push([tx4, ty4 + 3 * S, (9 + rn() * 6) * S * sc]); }      // short twigs, each ending in blossom
                }
            }
            clusters.push([last[0], last[1] + 3 * S, 13 * S * sc], [last[0] + (rn() - 0.5) * 8 * S, last[1] + 9 * S, 10 * S * sc]);      // and the tip of every branch, too
        });
        [[0.04, 0.06, 0.26, 0.13, 46, 1], [0.99, 0.44, 0.08, 0.06, 10, 0.72]].forEach(function(m) {      // masses where the branches come in
            for (var i = 0; i < m[4]; i++) { var a = rn() * Math.PI * 2, d = Math.sqrt(rn()); clusters.push([m[0] * W + Math.cos(a) * d * m[2] * W, m[1] * H + Math.sin(a) * d * m[3] * H, (18 + rn() * 16) * S * m[5]]); }
        });
        twigs.forEach(function(tw) { drawLimb([[tw[0] / W, tw[1] / H], [(tw[0] + tw[2]) / 2 / W + (rn() - 0.5) * 0.01, (tw[1] + tw[3]) / 2 / H], [tw[2] / W, tw[3] / H]], 1.8, 0.5); });
        var layer = function(n, fn) { clusters.forEach(function(c) { for (var i = 0; i < n; i++) { var a = rn() * Math.PI * 2, d = Math.sqrt(rn()) * c[2]; fn(c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d * 0.85, d / c[2], Math.sin(a), Math.cos(a), c[2]); } }); };
        layer(9, function(x, y, rr, sn, cs, cr) { if (sn < -0.2 || rr > 0.7) return; var z = Math.min((7 + rn() * 10) * S, cr * 0.6); ctx.globalAlpha = 0.4; ctx.drawImage(puff(SHADE), x - z / 2, y + 2 * S - z / 2, z, z); });
        layer(22, function(x, y, rr) { var z = (4 + rn() * 8) * S * (1 - rr * 0.35); ctx.globalAlpha = 0.85 + rn() * 0.15; ctx.drawImage(puff(PINK[Math.floor(rn() * 5)]), x - z / 2, y - z / 2, z, z); });
        layer(5, function(x, y, rr, sn, cs) { if (sn > 0.2 || cs > 0.5) return; var z = (3 + rn() * 5) * S; ctx.globalAlpha = 0.8; ctx.drawImage(puff(LIGHT), x - z / 2, y - z / 2, z, z); });
        // and the flowers themselves, thickest on the outside and the top of each mass
        layer(12, function(x, y, rr, sn) { if (rr < 0.35 && rn() < 0.6) return; var z = (4 + rn() * 3.5) * S; ctx.globalAlpha = sn > 0.5 ? 0.75 : 0.95; ctx.drawImage(floret(['255,226,236', '250,200,220', '255,242,247', '246,182,206'][Math.floor(rn() * 4)]), x - z / 2, y - z / 2, z, z); });
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.9)';
        layer(3, function(x, y) { ctx.beginPath(); ctx.arc(x, y, (0.5 + rn() * 0.7) * S, 0, 7); ctx.fill(); });
        // the lake is still, like a reflecting pool: the sky, Fuji and the far shore mirrored in it cleanly, tinted blue and a
        // little deeper toward you; only the clouds move (drifting slowly, and their reflection with them)
        if (!dawn) {
            var Tt = Ly.top.x, lakeH2 = H - lakeTop, s0 = 0, still2 = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
            var lakeBase = main.createLinearGradient(0, lakeTop, 0, H);
            lakeBase.addColorStop(0, '#9dbde4'); lakeBase.addColorStop(0.3, '#6d97cf'); lakeBase.addColorStop(1, '#2f5f9e');
            var poolTint = main.createLinearGradient(0, lakeTop, 0, H);          // the water's own color, deepening toward you
            poolTint.addColorStop(0, 'rgba(150,185,225,.12)'); poolTint.addColorStop(0.5, 'rgba(70,110,170,.2)'); poolTint.addColorStop(1, 'rgba(30,65,125,.38)');
            var lastDraw = -1e9;
            var springFrame = function(now) {
                if (!cv.isConnected || welcomeView.style.display === 'none') return;
                if (!s0) s0 = now;
                if (now - lastDraw < 120) { requestAnimationFrame(springFrame); return; }          // only the clouds move, a fraction of a pixel at a time: 8 redraws a second is plenty
                lastDraw = now;
                var tt = still2 ? 0 : (now - s0) / 1000;
                Tt.clearRect(0, 0, W, H); Tt.drawImage(Ly.sky.c, 0, 0, W, H); Tt.drawImage(Ly.cl.c, -80 * S + tt * 2.4, 0, W + 160 * S, H); Tt.drawImage(Ly.mtn.c, 0, 0, W, H);
                main.clearRect(0, 0, W, H); main.drawImage(Ly.top.c, 0, 0, W, H);
                main.save(); main.beginPath(); main.rect(0, lakeTop, W, lakeH2); main.clip();
                main.fillStyle = lakeBase; main.fillRect(0, lakeTop, W, lakeH2);
                main.globalAlpha = 0.8; main.translate(0, 2 * lakeTop - 3); main.scale(1, -1); main.drawImage(Ly.top.c, 0, 0, W, H);
                main.restore();
                main.fillStyle = poolTint; main.fillRect(0, lakeTop, W, lakeH2);
                main.drawImage(Ly.fg.c, 0, 0, W, H);
                if (!still2) requestAnimationFrame(springFrame);
            };
            requestAnimationFrame(springFrame);
        }
    }

    // お盆: the river, drawn every frame. The water mirrors the evening sky (brighter toward the far bank, darker toward
    // you), the bank and its lit windows reflect in it, small ripples catch the light and drift with the current, and
    // paper 灯籠 float on it: lit from inside by a flickering candle, bobbing and tilting with the waves, their light
    // falling on the water as broken, shimmering columns.
    function wvObon(cv) {
        if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        // E: headroom above the waterline (the canvas reaches up over the far bank), so the far lanterns' tops
        // stand in front of the houses instead of being cut off at the water's edge
        var E = 44, W = cv.clientWidth, H = cv.clientHeight - E, dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (!W || H <= 0) { cv._tries = (cv._tries || 0) + 1; if (cv._tries < 60) requestAnimationFrame(function() { if (cv.isConnected) wvObon(cv); }); return; }
        cv.width = Math.round(W * dpr); cv.height = Math.round((H + E) * dpr);
        var ctx = cv.getContext('2d'), rn = wvRand(816), S = Math.min(1.4, Math.max(0.75, W / 390));
        ctx.setTransform(dpr, 0, 0, dpr, 0, E * dpr);      // y = 0 is the waterline
        var rowY = function(u) { return H * (0.03 + Math.pow(u, 1.45) * 0.97); };      // perspective: rows crowd together far away
        // what the water reflects, in water coordinates (top = the far bank's waterline): the evening sky (horizon first,
        // then higher and darker sky as the water comes toward you), the bank as a dark band, its windows as warm streaks
        var mk = function() { var c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
        var m1 = mk(), m2 = mk(), m3 = mk(), baseC = m1[0], base = m1[1], workC = m2[0], work = m2[1], texC = m3[0], tex = m3[1];
        var rg = base.createLinearGradient(0, 0, 0, H);
        rg.addColorStop(0, '#b65f6c'); rg.addColorStop(0.07, '#8c4870'); rg.addColorStop(0.3, '#4b3268'); rg.addColorStop(0.7, '#241c48'); rg.addColorStop(1, '#110d27');
        base.fillStyle = rg; base.fillRect(0, 0, W, H);
        base.fillStyle = '#19132e'; base.beginPath(); base.moveTo(0, 0);
        for (var bx = 0; bx <= W + 8; bx += 8) base.lineTo(bx, H * 0.05 + Math.sin(bx * 0.03) * 3 + Math.sin(bx * 0.11) * 1.5 + rn() * 2.5);
        base.lineTo(W, 0); base.closePath(); base.fill();
        for (var wi = 0; wi < 12; wi++) {
            var wx = rn() * W, ww = (2 + rn() * 2.5) * S, wg = base.createLinearGradient(0, 1, 0, 18 * S);
            wg.addColorStop(0, 'rgba(255,200,120,.85)'); wg.addColorStop(1, 'rgba(255,170,90,0)');
            base.fillStyle = wg; base.fillRect(wx, 1, ww, 18 * S);
        }
        // a fine shimmer: countless tiny wave faces, light and dark, crowding together far away
        for (var ti = 0; ti < 1400; ti++) {
            var tu = Math.pow(rn(), 1.35), ty = tu * H, tl = (1.5 + tu * 20) * S * (0.4 + rn()), light = rn() < 0.5;
            tex.fillStyle = light ? 'rgba(255,215,230,' + (0.04 + rn() * 0.1).toFixed(3) + ')' : 'rgba(0,0,8,' + (0.08 + rn() * 0.14).toFixed(3) + ')';
            tex.fillRect(rn() * W, ty, tl, 0.5 + tu * 1.3);
        }
        var WQ = 1, wcv = document.createElement('canvas');
        wcv.width = Math.round(W * WQ); wcv.height = Math.round(H * WQ);
        var w2 = wcv.getContext('2d'); w2.setTransform(WQ, 0, 0, WQ, 0, 0); w2.imageSmoothingQuality = 'high';
        var PAPER = [[255, 244, 222], [255, 226, 150], [255, 200, 208], [214, 228, 255]], WORDS = ['祈', '供養', '感謝', '想', '南無'];
        var lamps = [[0.06, 0.04], [0.3, 0.02], [0.57, 0.08], [0.8, 0.05], [0.16, 0.3], [0.45, 0.27], [0.71, 0.36], [0.92, 0.22], [0.32, 0.62], [0.63, 0.7], [0.08, 0.84]].map(function(l, k) {
            var paint = ['lotus', null, 'kiku', 'hozuki', 'kikyo', null, 'asagao', 'lotus', 'kiku', 'asagao', null][k];
            return { x0: l[0] * W, d: l[1], s: (11 + Math.pow(l[1], 1.1) * 34) * S, ph: rn() * 6.3, col: paint ? (k % 3 === 1 ? PAPER[1] : PAPER[0]) : PAPER[k % 4], word: WORDS[k % 5], fl: rn() * 100, paint: paint };
        });
        lamps.sort(function(a, b) { return a.d - b.d; });
        var t0 = performance.now();
        var noise = function(t) { return Math.sin(t) * 0.5 + Math.sin(t * 2.3 + 1.1) * 0.3 + Math.sin(t * 5.7 + 2.4) * 0.2; };
        var rgba = function(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; };
        // soft, rounded smudges (drawn once per color) for the light and dark on the waves
        var smudges = {}, smudge = function(c) {
            if (smudges[c]) return smudges[c];
            var sc = document.createElement('canvas'); sc.width = 48; sc.height = 12;
            var x = sc.getContext('2d'); x.translate(24, 6); x.scale(4, 1);
            var gr = x.createRadialGradient(0, 0, 0, 0, 0, 6); gr.addColorStop(0, 'rgba(' + c + ',1)'); gr.addColorStop(0.45, 'rgba(' + c + ',.7)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
            x.fillStyle = gr; x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill();
            return (smudges[c] = sc);
        };
        // how much the water's surface at (x, y) tilts toward the far, glowing sky (+) or away from it (−)
        var slope = function(x, y, t) {
            var u = y / H, sc = 1 / (0.22 + u * 1.25), X = x * 0.05 * sc, Y = y * 0.42 * sc;
            return Math.sin(X + Y * 0.6 - t * 1.4) * Math.cos(Y - t * 0.9) * 0.6 + Math.sin(X * 2.3 - Y * 1.7 + t * 2.1) * 0.35 + Math.sin(X * 4.7 + Y * 3.1 - t * 3.3) * 0.25 + Math.sin(X * 0.7 - Y * 2.6 + t * 1.2) * 0.3;
        };
        // Obon flowers painted on some lanterns (watercolor-ish, drawn once each): 蓮・菊・桔梗・朝顔・ほおずき
        var paintings = {};
        var painting = function(kind) {
            if (paintings[kind]) return paintings[kind];
            var c = document.createElement('canvas'); c.width = c.height = 96;
            var g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
            var petal = function(cx, cy, len, wid, ang, c1, c2) {
                g.save(); g.translate(cx, cy); g.rotate(ang);
                var gr = g.createLinearGradient(0, 0, 0, -len); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
                g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid, -len * 0.55, 0, -len); g.quadraticCurveTo(-wid, -len * 0.55, 0, 0); g.fill(); g.restore();
            };
            var leaf = function(cx, cy, len, wid, ang, col) {
                g.save(); g.translate(cx, cy); g.rotate(ang); g.fillStyle = col;
                g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid, len * 0.45, 0, len); g.quadraticCurveTo(-wid, len * 0.45, 0, 0); g.fill();
                g.strokeStyle = 'rgba(40,90,50,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, len - 3); g.stroke(); g.restore();
            };
            if (kind === 'lotus') {
                g.fillStyle = 'rgba(78,146,86,.85)'; g.beginPath(); g.ellipse(32, 78, 27, 9, -0.08, 0.35, Math.PI * 2 - 0.05); g.lineTo(32, 78); g.closePath(); g.fill();
                g.strokeStyle = 'rgba(50,110,60,.7)'; g.lineWidth = 0.8; for (var v = 0; v < 6; v++) { g.beginPath(); g.moveTo(32, 78); g.lineTo(32 + Math.cos(v + 0.5) * 24, 78 + Math.sin(v + 0.5) * 8); g.stroke(); }
                g.strokeStyle = 'rgba(70,130,70,.9)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(58, 92); g.quadraticCurveTo(55, 76, 52, 60); g.stroke();
                [[-1.05, 26, 12], [1.05, 26, 12], [-0.6, 31, 13], [0.6, 31, 13], [-0.22, 35, 12], [0.22, 35, 12]].forEach(function(p) { petal(52, 60, p[1], p[2], p[0], 'rgba(255,214,224,.97)', 'rgba(228,82,132,.97)'); });
                g.fillStyle = 'rgba(244,206,90,.95)'; g.beginPath(); g.ellipse(52, 54, 6, 3, 0, 0, 7); g.fill();
                g.fillStyle = 'rgba(200,120,60,.6)'; for (var d = 0; d < 5; d++) { g.beginPath(); g.arc(48 + d * 2, 54, 0.7, 0, 7); g.fill(); }
            } else if (kind === 'kiku') {
                leaf(64, 64, 26, 10, -0.6, 'rgba(76,136,74,.88)'); leaf(30, 66, 22, 9, 0.7, 'rgba(76,136,74,.88)');
                for (var i = 0; i < 28; i++) petal(46, 42, 28, 3.6, i / 28 * Math.PI * 2, 'rgba(255,226,120,.97)', 'rgba(238,150,36,.97)');
                for (var j = 0; j < 18; j++) petal(46, 42, 17, 3.2, j / 18 * Math.PI * 2 + 0.1, 'rgba(255,238,160,.97)', 'rgba(244,172,58,.97)');
                g.fillStyle = 'rgba(196,118,28,.95)'; g.beginPath(); g.arc(46, 42, 5.5, 0, 7); g.fill();
            } else if (kind === 'kikyo') {
                g.strokeStyle = 'rgba(70,130,70,.9)'; g.lineWidth = 1.6;
                g.beginPath(); g.moveTo(44, 94); g.quadraticCurveTo(46, 66, 40, 40); g.moveTo(46, 78); g.quadraticCurveTo(58, 72, 66, 62); g.moveTo(44, 70); g.quadraticCurveTo(32, 70, 24, 64); g.stroke();
                leaf(44, 80, 16, 6, 2.2, 'rgba(80,140,80,.85)'); leaf(46, 72, 14, 5, -2.0, 'rgba(80,140,80,.85)');
                var star = function(cx, cy, r, rot) {
                    g.save(); g.translate(cx, cy); g.rotate(rot);
                    var gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(206,190,250,.97)'); gr.addColorStop(1, 'rgba(110,78,196,.97)');
                    g.fillStyle = gr; g.beginPath();
                    for (var k = 0; k < 10; k++) { var rr = k % 2 ? r * 0.55 : r, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
                    g.closePath(); g.fill();
                    g.strokeStyle = 'rgba(84,54,170,.7)'; g.lineWidth = 0.8;
                    for (var k2 = 0; k2 < 5; k2++) { var a2 = k2 * 2 * Math.PI / 5 - Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a2) * r * 0.85, Math.sin(a2) * r * 0.85); g.stroke(); }
                    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(0, 0, r * 0.14, 0, 7); g.fill(); g.restore();
                };
                star(40, 36, 18, 0.1); star(66, 58, 12, -0.35);
                g.fillStyle = 'rgba(130,100,210,.95)'; g.beginPath(); g.ellipse(24, 60, 5, 7, 0.4, 0, 7); g.fill();
            } else if (kind === 'asagao') {
                g.strokeStyle = 'rgba(80,140,80,.85)'; g.lineWidth = 1.4;
                g.beginPath(); g.moveTo(8, 90); g.bezierCurveTo(20, 60, 70, 84, 84, 50); g.bezierCurveTo(92, 34, 78, 24, 86, 14); g.stroke();
                g.fillStyle = 'rgba(76,140,76,.88)'; g.beginPath(); g.moveTo(26, 82); g.bezierCurveTo(10, 70, 18, 56, 28, 66); g.bezierCurveTo(36, 56, 44, 70, 26, 82); g.fill();
                var tr = function(cx, cy, r) {
                    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(255,255,255,.98)'); gr.addColorStop(0.28, 'rgba(160,190,255,.97)'); gr.addColorStop(1, 'rgba(58,84,214,.97)');
                    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
                    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1;
                    for (var k = 0; k < 5; k++) { var a = k * 2 * Math.PI / 5 - Math.PI / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9); g.stroke(); }
                };
                tr(52, 40, 20); tr(78, 70, 11);
            } else {      // ほおずき
                g.strokeStyle = 'rgba(96,120,60,.95)'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 14); g.quadraticCurveTo(48, 6, 90, 24); g.stroke();
                leaf(20, 14, 18, 7, -0.4, 'rgba(84,140,76,.85)'); leaf(70, 18, 16, 6, 0.5, 'rgba(84,140,76,.85)');
                [[30, 16, 30, 14], [54, 14, 36, 16], [76, 22, 28, 13]].forEach(function(h) {
                    g.strokeStyle = 'rgba(96,120,60,.95)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(h[0], h[1]); g.lineTo(h[0], h[1] + 6); g.stroke();
                    var top = h[1] + 6, gr = g.createLinearGradient(h[0] - h[3], 0, h[0] + h[3], 0);
                    gr.addColorStop(0, 'rgba(250,150,50,.97)'); gr.addColorStop(0.5, 'rgba(255,190,90,.97)'); gr.addColorStop(1, 'rgba(226,96,32,.97)');
                    g.fillStyle = gr; g.beginPath(); g.moveTo(h[0], top);
                    g.bezierCurveTo(h[0] + h[3] * 1.2, top + h[2] * 0.15, h[0] + h[3] * 0.7, top + h[2] * 0.85, h[0], top + h[2]);
                    g.bezierCurveTo(h[0] - h[3] * 0.7, top + h[2] * 0.85, h[0] - h[3] * 1.2, top + h[2] * 0.15, h[0], top); g.fill();
                    g.strokeStyle = 'rgba(190,80,30,.55)'; g.lineWidth = 0.8;
                    [-0.5, 0, 0.5].forEach(function(o) { g.beginPath(); g.moveTo(h[0], top + 1); g.quadraticCurveTo(h[0] + o * h[3] * 1.4, top + h[2] * 0.5, h[0], top + h[2] - 1); g.stroke(); });
                });
            }
            return (paintings[kind] = c);
        };
        var lantern = function(x, y, s, tilt, col, word, f, paint) {
            var w = s, h = s * 1.05, sd = s * 0.22, tz = s * 0.12;
            ctx.save(); ctx.translate(x + w / 2, y); ctx.rotate(tilt); ctx.translate(-(x + w / 2), -y);
            // the float: a wooden board
            ctx.fillStyle = '#2c1c12'; ctx.fillRect(x - w * 0.1, y - h * 0.02, w * 1.2, h * 0.14);
            ctx.fillStyle = '#1c120b'; ctx.beginPath(); ctx.moveTo(x + w * 1.1, y - h * 0.02); ctx.lineTo(x + w * 1.1 + sd, y - h * 0.02 - tz); ctx.lineTo(x + w * 1.1 + sd, y + h * 0.12 - tz); ctx.lineTo(x + w * 1.1, y + h * 0.12); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#5a3c26'; ctx.beginPath(); ctx.moveTo(x - w * 0.1, y - h * 0.02); ctx.lineTo(x - w * 0.1 + sd, y - h * 0.02 - tz); ctx.lineTo(x + w * 1.1 + sd, y - h * 0.02 - tz); ctx.lineTo(x + w * 1.1, y - h * 0.02); ctx.closePath(); ctx.fill();
            // paper, lit from inside (the candle sits low in the middle)
            var cxl = x + w / 2, cyl = y - h * 0.3;
            var lit = ctx.createRadialGradient(cxl, cyl, 0, cxl, cyl, w * 1.05);
            lit.addColorStop(0, rgba([255, 250, 225], 1)); lit.addColorStop(0.35, rgba(col, 1)); lit.addColorStop(1, rgba([Math.round(col[0] * 0.78), Math.round(col[1] * 0.62), Math.round(col[2] * 0.5)], 1));
            ctx.fillStyle = lit; ctx.fillRect(x, y - h, w, h);
            // the right side, turned away from you: the same paper, evenly lit, a little darker toward the back
            var sideG = ctx.createLinearGradient(x + w, 0, x + w + sd, 0), dim = function(k) { return [Math.round(col[0] * k), Math.round(col[1] * (k - 0.06)), Math.round(col[2] * (k - 0.14))]; };
            sideG.addColorStop(0, rgba(dim(0.86), 1)); sideG.addColorStop(1, rgba(dim(0.66), 1));
            ctx.fillStyle = sideG; ctx.beginPath(); ctx.moveTo(x + w, y - h); ctx.lineTo(x + w + sd, y - h - tz); ctx.lineTo(x + w + sd, y - tz); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
            var sideV = ctx.createLinearGradient(0, y - h, 0, y);                                                    // brighter low, where the candle is
            sideV.addColorStop(0, 'rgba(60,30,10,.12)'); sideV.addColorStop(0.7, 'rgba(255,220,150,' + (0.18 * f).toFixed(3) + ')'); sideV.addColorStop(1, 'rgba(60,30,10,.1)');
            ctx.fillStyle = sideV; ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,' + (0.12 * f).toFixed(3) + ')'; ctx.fillRect(x, y - h, w, h);      // the flame's flicker
            // the open top, glowing
            ctx.fillStyle = '#6a4424'; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + sd, y - h - tz); ctx.lineTo(x + w + sd, y - h - tz); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
            var tg = ctx.createRadialGradient(x + w / 2 + sd / 2, y - h - tz / 2, 0, x + w / 2 + sd / 2, y - h - tz / 2, w * 0.5);
            tg.addColorStop(0, 'rgba(255,214,140,' + (0.85 * f).toFixed(3) + ')'); tg.addColorStop(1, 'rgba(255,170,80,0)');
            ctx.fillStyle = tg; ctx.fill();
            // the paper is a little darker toward its edges (the frame shades it)
            var ev = ctx.createLinearGradient(x, 0, x + w, 0);
            ev.addColorStop(0, 'rgba(90,40,10,.22)'); ev.addColorStop(0.18, 'rgba(90,40,10,0)'); ev.addColorStop(0.82, 'rgba(90,40,10,0)'); ev.addColorStop(1, 'rgba(90,40,10,.22)');
            ctx.fillStyle = ev; ctx.fillRect(x, y - h, w, h);
            if (paint && s > 9) {       // a painted flower, glowing through the paper
                ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.92;
                ctx.drawImage(painting(paint), x + w * 0.06, y - h * 0.94, w * 0.88, h * 0.88); ctx.restore();
            } else if (s > 14) {        // calligraphy

                ctx.fillStyle = 'rgba(30,18,12,.62)'; ctx.font = (w * (word.length > 1 ? 0.28 : 0.42)).toFixed(1) + "px 'Shippori Mincho','Hiragino Mincho ProN','Yu Mincho',serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                for (var c = 0; c < word.length; c++) ctx.fillText(word[c], x + w / 2, y - h * (word.length > 1 ? 0.7 - c * 0.32 : 0.52));
            }
            // the wooden frame
            ctx.strokeStyle = '#3a2416'; ctx.lineWidth = Math.max(0.8, s * 0.055); ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x + w, y); ctx.moveTo(x + w, y - h); ctx.lineTo(x + w + sd, y - h - tz); ctx.lineTo(x + w + sd, y - tz);
            ctx.moveTo(x, y - h); ctx.lineTo(x + sd, y - h - tz); ctx.lineTo(x + w + sd, y - h - tz); ctx.stroke();
            ctx.restore();
        };
        var frame = function(now) {
            if (!cv.isConnected || welcomeView.style.display === 'none') return;
            var t = (now - t0) / 1000;
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
            ctx.clearRect(0, -E, W, E + 1);      // the headroom is see-through apart from the lanterns
            var placed = lamps.map(function(L) {
                var y = rowY(L.d * 0.94 + 0.04), x = ((L.x0 + t * (3 + L.d * 9) * S) % (W + L.s * 3)) - L.s;
                var bob = Math.sin(t * 1.6 + L.ph + x * 0.02) * (0.4 + L.d * 1.6), f = 0.75 + 0.25 * noise(t * 7 + L.fl);
                return { L: L, x: x, y: y + bob, tilt: Math.sin(t * 1.3 + L.ph) * 0.035, f: f };
            });
            // the reflection layer for this moment: the still scene plus each lantern's light mirrored below it
            work.globalCompositeOperation = 'source-over'; work.drawImage(baseC, 0, 0, W, H);
            work.globalCompositeOperation = 'lighter';
            placed.forEach(function(p) {
                var s = p.L.s, cx = p.x + s * 0.6, len = s * 1.9, c = p.L.col;
                var lg = work.createLinearGradient(0, p.y, 0, p.y + len);
                lg.addColorStop(0, 'rgba(255,' + Math.round(150 + c[1] * 0.25) + ',' + Math.round(70 + c[2] * 0.2) + ',' + (0.62 * p.f).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,150,70,0)');
                work.fillStyle = lg; work.beginPath(); work.ellipse(cx, p.y + len * 0.45, s * 0.42, len * 0.55, 0, 0, 7); work.fill();
            });
            // the waves bend it: every thin row is pushed sideways and sampled a little up or down, more toward you
            w2.globalCompositeOperation = 'source-over'; w2.globalAlpha = 1;
            w2.clearRect(0, 0, W, H);
            for (var y = 0; y < H; y += 1 / WQ) {
                var u = y / H, amp = 0.2 + u * 2.6;
                var dx = amp * (Math.sin(y * 0.19 - t * 1.9) + 0.5 * Math.sin(y * 0.053 + t * 0.75));
                var sy = Math.max(0, Math.min(H - 2, y + (0.2 + u * 1.6) * Math.sin(y * 0.27 - t * 2.4)));
                w2.drawImage(workC, 0, sy * dpr, W * dpr, dpr / WQ, dx, y, W, 1.1 / WQ);
                if (dx > 0) w2.drawImage(workC, 0, sy * dpr, 2, dpr / WQ, 0, y, dx, 1.1 / WQ);
                else if (dx < 0) w2.drawImage(workC, (W - 1) * dpr, sy * dpr, 2, dpr / WQ, W + dx, y, -dx, 1.1 / WQ);
            }
            // the wave faces: lit where they tilt toward the glowing sky (warm near the bank, cool toward you), dark where they tilt away
            for (var gy = 1; gy < H; gy += 1.4 + (gy / H) * 3.4) {
                var gu = gy / H, step = (3.4 + gu * 14) * S, warm = gu < 0.3;
                var hiA = warm ? 0.42 - gu * 0.6 : 0.2, off = (gy * 7.3) % step;
                for (var gx = -off; gx < W; gx += step) {
                    var sv = slope(gx, gy, t);
                    if (sv > 0.72) {
                        var hl = step * (1 + (sv - 0.72) * 1.4), hh = 1.4 + gu * 2.8;
                        w2.globalAlpha = Math.min(0.42, (sv - 0.72) * hiA * 2.4); w2.drawImage(smudge(warm ? '255,178,168' : '165,170,235'), gx - hl * 0.2, gy - hh / 2, hl, hh);
                    } else if (sv < -0.82) {
                        var dl = step * 1.2, dh = 1.8 + gu * 3.4;
                        w2.globalAlpha = Math.min(0.22, (-sv - 0.82) * (0.3 + gu * 0.25)); w2.drawImage(smudge('4,3,14'), gx - dl * 0.15, gy - dh / 2, dl, dh);
                    }
                }
            }
            w2.globalAlpha = 1;
            var dk = w2.createLinearGradient(0, 0, 0, H);
            dk.addColorStop(0, 'rgba(6,4,16,0)'); dk.addColorStop(0.5, 'rgba(6,4,16,.03)'); dk.addColorStop(1, 'rgba(6,4,16,.14)');
            w2.fillStyle = dk; w2.fillRect(0, 0, W, H);
            // candlelight sparkling on the wave faces below each lantern
            w2.globalCompositeOperation = 'lighter';
            placed.forEach(function(p) {
                var s = p.L.s, cx = p.x + s * 0.6, len = s * (1.6 + p.L.d * 1.4);
                for (var ly = p.y + 1; ly < Math.min(H, p.y + len); ly += 1.3 + (ly / H) * 2.2) {
                    var fade = 1 - (ly - p.y) / len, half = s * (0.32 + (1 - fade) * 0.35), lstep = 2.1 + (ly / H) * 4.2;
                    for (var lx = cx - half; lx < cx + half; lx += lstep) {
                        var gv = slope(lx, ly, t);
                        if (gv < 0.15) continue;
                        var edge = 1 - Math.abs(lx - cx) / half, gl2 = lstep * (1.4 + gv), gh = 1.6 + (ly / H) * 2.4;
                        w2.globalAlpha = Math.min(0.9, (gv - 0.15) * fade * edge * 1.5 * p.f);
                        w2.drawImage(smudge(fade > 0.5 ? '255,226,170' : '255,190,120'), lx - gl2 * 0.25, ly - gh / 2, gl2, gh);
                    }
                }
            });
            w2.globalAlpha = 1; w2.globalCompositeOperation = 'source-over';
            // the water, drawn a little softer than the screen and scaled up smoothly, so it reads as one surface
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(wcv, 0, 0, W, H);
            // a soft glow on the surface right around each lantern
            ctx.globalCompositeOperation = 'lighter';
            placed.forEach(function(p) {
                var s = p.L.s, cx = p.x + s * 0.6, glow = ctx.createRadialGradient(cx, p.y, 0, cx, p.y, s * 2);
                glow.addColorStop(0, 'rgba(255,170,90,' + (0.22 * p.f).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(255,140,60,0)');
                ctx.save(); ctx.translate(cx, p.y); ctx.scale(1, 0.32); ctx.translate(-cx, -p.y); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, p.y, s * 2, 0, 7); ctx.fill(); ctx.restore();
            });
            ctx.globalCompositeOperation = 'source-over';
            placed.forEach(function(p) {
                lantern(p.x, p.y, p.L.s, p.tilt, p.L.col, p.L.word, p.f, p.L.paint);
                var s = p.L.s, gl = ctx.createRadialGradient(p.x + s * 0.6, p.y - s * 0.55, 0, p.x + s * 0.6, p.y - s * 0.55, s * 1.8);
                gl.addColorStop(0, 'rgba(255,190,110,' + (0.22 * p.f).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,160,80,0)');
                ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.fillRect(p.x - s * 1.2, p.y - s * 2.4, s * 3.6, s * 3.6); ctx.globalCompositeOperation = 'source-over';
            });
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
    // returns true when an effect is playing (the opening then lasts 5 seconds)
    // The rare versions of four scenes. Each is decided once a day, at the day's first opening on 自動, and every opening
    // that day shows the same thing; previews never count. Chances per day (if the app is opened that day):
    //   富士と桜 (spring): 5%; and if it hasn't come yet this month, it comes on the month's last spring day
    //   鳳凰 (お正月): 4%; and after two お正月 in a row without it, it comes on the second one's last day (1/7)
    //   流れ星 (七夕): 1% on 7/1, a point more each day, 7% on 7/7; once seen, not again until next year
    //   三尺玉 (花火): 9%; and it comes on as many of the last days as needed to make at least 3 each summer
    var FUJI_CHANCE = 0.05, HOO_CHANCE = 0.04, NAGARE_START = 0.01, NAGARE_STEP = 0.01, OOTAMA_CHANCE = 0.09, OOTAMA_MIN = 3;
    var FUJI_CLEAR_SKY = true;       // the Fuji sky: true = always clear (mist on the lower slopes now and then); false = a different sky each time (clouds, wisps, 笠雲)
    var dayAfter = function(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
    function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
    function nagareChance(now) { now = now || new Date(); return now.getMonth() === 6 && now.getDate() <= 7 ? NAGARE_START + NAGARE_STEP * (now.getDate() - 1) : NAGARE_START; }
    function fujiRoll(count, now) {
        var st = loadJSON('jlptFujiSeen', {}), mon = now.getFullYear() + '-' + (now.getMonth() + 1), last = true;
        for (var i = 1; i < 32; i++) { var nx = dayAfter(now, i); if (nx.getMonth() !== now.getMonth()) break; if (seasonForToday(nx) === 'sakura') { last = false; break; } }
        var hit = st.m === mon ? Math.random() < FUJI_CHANCE : (last || Math.random() < FUJI_CHANCE);          // not yet this month, and its last spring day: it comes
        if (hit && count) saveJSON('jlptFujiSeen', { m: mon });
        return hit;
    }
    function hooRoll(count, now) {
        var st = loadJSON('jlptHooPity', {}), y = now.getFullYear();
        if (typeof st.since !== 'number') st.since = y;          // the first お正月 we count from (also when coming from the old rule)
        var hit = (y - st.since >= 1 && now.getMonth() === 0 && now.getDate() === 7) || Math.random() < HOO_CHANCE;          // the second お正月 without it, on its last day
        if (hit) st.since = y + 1;
        if (count) saveJSON('jlptHooPity', { since: st.since });
        return hit;
    }
    function nagareRoll(count, now) {
        var st = loadJSON('jlptNagareSeen', {});
        if (st.y === now.getFullYear()) return false;          // already seen this year
        var hit = Math.random() < nagareChance(now);
        if (hit && count) saveJSON('jlptNagareSeen', { y: now.getFullYear() });
        return hit;
    }
    function ootamaRoll(count, now) {
        var st = loadJSON('jlptOotama', {}), y = now.getFullYear(), n = st.y === y ? st.n || 0 : 0, left = 1;
        for (var i = 1; i < 40; i++) { if (seasonForToday(dayAfter(now, i)) === 'hanabi') left++; else if (i > 1) break; }          // days left in this season, today included
        var hit = OOTAMA_MIN - n >= left || Math.random() < OOTAMA_CHANCE;          // too few days left to reach 3 by chance: it comes
        if (hit && count) saveJSON('jlptOotama', { y: y, n: n + 1 });
        return hit;
    }
    function rareRoll(base, count) {          // the season's scene, or (rarely) its rare version; a real opening (count) decides it for the whole day
        var now = new Date(), today = getTodayDateString(), day = loadJSON('jlptRareDay', {});
        if (count && day.d === today && day.base === base) return day.k;
        var k = base === 'sakura' && fujiRoll(count, now) ? 'fuji' : base === 'shogatsu' && hooRoll(count, now) ? 'hoo'
            : base === 'tanabata' && nagareRoll(count, now) ? 'nagare' : base === 'hanabi' && ootamaRoll(count, now) ? 'ootama' : base;
        if (count) saveJSON('jlptRareDay', { d: today, base: base, k: k });
        return k;
    }
    function buildWelcomeScene(kind) {
        var setting = getSetting('openingSeason', 'auto'), k = kind || setting;
        if (k === 'auto') k = rareRoll(seasonForToday(), !kind && setting === 'auto');
        if (!kind && setting === 'auto') {          // a real opening on 自動 (not a preview or a forced choice)
            var seen = loadJSON('jlptOpeningsSeen', {});
            if (!seen[k]) { seen[k] = getTodayDateString(); try { localStorage.setItem('jlptOpeningsSeen', JSON.stringify(seen)); } catch (e) {} }
        }
        var html = wvSeasonHtml(k);
        var box = welcomeView.querySelector('.wv-season');
        welcomeView.classList.toggle('wv-night', k === 'tsukimi' || k === 'hanabi' || k === 'ootama' || k === 'obon' || k === 'shogatsu' || k === 'hoo' || k === 'omisoka' || k === 'nagare');
        welcomeView.classList.toggle('wv-dusk', k === 'obon');
        box.innerHTML = html;
        var cv = box.querySelector('.wv-fwcanvas');
        if (cv) wvFireworks(cv, k === 'ootama');
        var spc = box.querySelector('.wv-springcanvas');
        if (spc) wvSpring(spc, k === 'hoo' ? 2 : k === 'shogatsu' ? 1 : 0);
        var owc = box.querySelector('.wv-obon-water');
        if (owc) wvObon(owc);
        var mcv = box.querySelector('.wv-mooncv');
        if (mcv) wvMoon(mcv);
        var rcv = box.querySelector('.wv-ringer');
        if (rcv) wvRinger(rcv);
        var scv = box.querySelector('.wv-starcv');
        if (scv) wvStars(scv);
        var mtc = box.querySelector('.wv-meteorcv');
        if (mtc) wvMeteors(mtc);
        var kcv = box.querySelector('.wv-kids');
        if (kcv) wvKids(kcv);
        return !!html;
    }
    var OPENING_EFFECT_MS = 5000;
    var OPENING_INFO = { sakura: ['桜', '3〜5月'], fuji: ['富士と桜', '春（3〜5月）に、毎月少なくとも1回（1日 5%）'], aoba: ['青葉', '6〜8月'], momiji: ['紅葉', '9〜11月'], snow: ['雪', '12〜2月'], shogatsu: ['お正月', '1/1〜1/7'], hoo: ['お正月・鳳凰', 'お正月にごくまれに（1日 4%・2年に1回は必ず）'], nagare: ['七夕・流れ星', '七夕にまれに（1%〜7%）'], ootama: ['花火・三尺玉', '花火の時期に、毎夏少なくとも3回（1日 9%）'], setsubun: ['節分', '2/1〜2/3'],
        hinamatsuri: ['ひな祭り', '2/25〜3/3'], kodomo: ['こどもの日', '5/1〜5/5'], tanabata: ['七夕', '7/1〜7/7'], hanabi: ['花火', '7/20〜8/12'], obon: ['お盆', '8/13〜8/16'],
        tsukimi: ['お月見', '十五夜の4日前〜翌日'], xmas: ['クリスマス', '12/18〜12/25'], omisoka: ['大晦日', '12/26〜12/31'], jlpt: ['JLPT 試験日', '7月・12月の第1日曜と、その前の3日'] };
    function updateOpeningNote() {
        var v = getSetting('openingSeason', 'auto'), el = document.getElementById('opening-note');
        if (!el) return;
        var info = OPENING_INFO[v];
        el.textContent = v === 'off' ? '演出なしで、すぐに始まります。'
            : v === 'auto' ? 'アプリを開いたときの演出です。季節（桜・青葉・紅葉・雪）で変わり、行事の時期にはその演出になります。今日は「' + OPENING_INFO[seasonForToday()][0] + '」です。'
            : v === 'fuji' ? '「自動」のときは、春（3〜5月）の日のうち 5% に出るまれな景色です。その月にまだ出ていなければ、月の最後の春の日に必ず出ます。'
            : v === 'nagare' ? '「自動」のときは、七夕（7/1〜7/7）にまれに出る演出です。出る確率は 7/1 の 1% から一日ごとに上がり、七夕の 7/7 には 7% になります。一度見たら、その年はもう出ません（翌年また 1% から）。'
            : v === 'ootama' ? '「自動」のときは、花火の時期（7/20〜8/12）の日のうち 9% に出る演出です。その夏にまだ3回出ていなければ、時期の終わりの日に必ず出ます。'
            : v === 'hoo' ? '「自動」のときは、お正月（1/1〜1/7）の日のうち 4% に出る、ごくまれな演出です。2年続けて出なかったときは、2年目のお正月の最後の日（1/7）に必ず出ます。'
            : '「自動」のときは ' + info[1] + ' に出ます' + (['sakura', 'aoba', 'momiji', 'snow'].indexOf(v) > -1 ? '（行事の日を除く）' : '') + '。';
    }
    // 設定: play the opening once to see the effect (doesn't change the screen you're on)
    function previewOpening(kind) {
        var wv = welcomeView;
        var withEffect = buildWelcomeScene(kind);
        wv.classList.remove('quick', 'animate', 'fade-out');
        wv.style.display = 'flex';
        void wv.offsetWidth;
        wv.classList.add('animate');
        var done = false, end = function() {
            if (done) return; done = true;
            wv.classList.add('fade-out');
            setTimeout(function() { wv.style.display = 'none'; wv.classList.remove('fade-out', 'animate'); wv.querySelector('.wv-season').innerHTML = ''; welcomeSkip = null; }, 600);
        };
        welcomeSkip = end;
        setTimeout(end, withEffect ? OPENING_EFFECT_MS : 2400);
    }

