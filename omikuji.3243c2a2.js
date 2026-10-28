    // ===================== おみくじ (daily fortune) =====================
    // ===================== おみくじ (daily fortune) =====================
    // One draw a day, unlocked by reaching the daily goal. The result is saved the moment the box is shaken, so the
    // same slip comes back for the rest of the day. Stored in localStorage 'jlptOmikuji' (included in backups):
    //   { salt, days: { 'YYYY-MM-DD': { r: rank, n: stick number, w: word index, s: season, tied, at } } }
    var OMK_RANKS = ['大吉', '中吉', '小吉', '吉', '末吉', '凶', '大凶'];
    var OMK_WEIGHTS = { '大吉': 10, '中吉': 20, '小吉': 18, '吉': 25, '末吉': 16, '凶': 10, '大凶': 1 };
    var OMK_EXAM_WEIGHTS = { '大吉': 40, '中吉': 35, '吉': 25 };     // 合格祈願: no bad luck on exam days
    var OMK_TIER = { '大吉': 'good', '中吉': 'good', '小吉': 'mid', '吉': 'mid', '末吉': 'mid', '凶': 'bad', '大凶': 'bad' };
    var OMK_SUMMARY = {
        '大吉': ['努力の花、満開なり。今日学んだことは長く身につく。', '天の時、地の利あり。思い切って難問に挑むべし。'],
        '中吉': ['追い風あり。少し難しい問題に挑む好機。', '学びの道、明るく開ける。勢いのままに進め。'],
        '小吉': ['小さな一歩が確かな前進。こつこつ進めよ。', '今日の一問が、明日の自信となる。'],
        '吉': ['穏やかな一日。いつもどおりの学びが最善。', '平らかな道なり。基礎を踏みしめて歩め。'],
        '末吉': ['今は芽吹きの時。続ければ後に大きく実る。', '遅咲きの花ほど美しい。焦らず続けよ。'],
        '凶': ['つまずきは学びの種。間違えた問題こそ宝なり。', '雨降って地固まる。今日の失敗が明日の力となる。'],
        '大凶': ['これより下はなし。あとは上がるのみ。七転び八起き。', '底を打てば、あとは昇るばかり。笑って一問解くべし。']
    };
    var OMK_SECTIONS = [
        { k: '願望', good: ['叶う。合格へまた一歩近づく', '思いのまま。努力に応じて叶う'],
                    mid: ['時間はかかるが叶う。毎日続けよ', '半ば叶う。残りは努力次第'],
                    bad: ['すぐには叶わず。されど続ければ必ず叶う', '急がば回れ。基礎から積み上げよ'] },
        { k: '待人', good: ['来る。新しい単語、向こうからやって来る', '来る。心に残る良き文章に出会う', '来る。共に学ぶ友の便りあり'],
                    mid: ['遅れて来る。待つ間に一問解くべし', '来る。ただし辞書を引いてから', '来る。読み返した文章の中に'],
                    bad: ['来ず。こちらから迎えに行け（単語帳を開くべし）', '便りなし。自ら学びて待つべし'] },
        { k: '失物', good: ['すぐ見つかる。記憶の中にあり', '出る。誤答ノートの中を探せ'],
                    mid: ['誤答ノートの中にあり', '見つかる。ただし少し時間がかかる', '単語帳を開けば出てくる'],
                    bad: ['出にくし。もう一度はじめから覚え直せ', '忘れた単語は、今日もう一度覚えよ'] },
        { k: '学問', good: ['読解の力、大いに伸びる。長文に挑むべし', '積み重ねが実を結ぶ日。難問にこそ手を伸ばせ', '理解深まる。誤答を見直せば一段上がる', '集中冴えわたる。新しい単元を始めるに吉'],
                    mid: ['焦らず一問ずつ。昨日の自分を越えればよし', '基礎を固めよ。語彙が後の助けとなる', '迷ったら本文に戻れ。答えは文中にあり', '少しずつ進めば、道はおのずから開ける'],
                    bad: ['気が散りやすし。短い時間で区切って励むべし', '難しく感じても、それは伸びる前の兆し', '今日は復習に徹せよ。新しいことは明日でよし'] },
        { k: '試験', good: ['自信をもって臨め。積み重ねは裏切らない', '時間配分を守れば、必ず通る', '落ち着いて読めば、正解は見える'],
                    mid: ['油断せず、見直しを忘れるな', 'わからない問題に長く留まるな', '最後の一問まで諦めるべからず'],
                    bad: ['うっかりに用心。設問をよく読むべし', '焦りは禁物。深呼吸してから解け', '足りぬ所を今日のうちに知れ。それが合格への近道'] }
    ];
    // 今日の一語: N1-level words with a reading, a short meaning and a Korean gloss
    var OMK_WORDS = [
        ['懸念', 'けねん', '先のことを気にかけて心配すること', '우려, 염려'], ['打診', 'だしん', '相手の意向をそれとなく確かめること', '타진'],
        ['踏襲', 'とうしゅう', '前のやり方をそのまま受け継ぐこと', '답습'], ['頻繁', 'ひんぱん', '何度も繰り返し行われること', '빈번'],
        ['妥協', 'だきょう', '意見の違いを互いに譲り合ってまとめること', '타협'], ['斬新', 'ざんしん', '発想がきわだって新しいこと', '참신'],
        ['顕著', 'けんちょ', 'はっきり目立つこと', '현저'], ['漠然', 'ばくぜん', 'ぼんやりしていて、はっきりしないこと', '막연'],
        ['吟味', 'ぎんみ', '念入りに調べて確かめること', '음미, 검토'], ['臨機応変', 'りんきおうへん', 'その場に応じて適切に対応すること', '임기응변'],
        ['一目置く', 'いちもくおく', '相手の力を認めて敬意を払う', '한 수 위로 보다'], ['腑に落ちない', 'ふにおちない', '納得できない', '납득이 안 가다'],
        ['根回し', 'ねまわし', '事前に関係者の了解を得ておくこと', '사전 교섭'], ['手際', 'てぎわ', '物事を処理する腕前', '솜씨, 수완'],
        ['案の定', 'あんのじょう', '思ったとおり', '아니나 다를까'], ['心もとない', 'こころもとない', '頼りなくて不安だ', '불안하다, 미덥지 않다'],
        ['おびただしい', '', '数や量が非常に多い', '엄청나다'], ['ひたむき', '', '一つのことに一生懸命打ち込むようす', '한결같음, 열중함'],
        ['いたわる', '', '弱い立場の人や苦労した人を大切に扱う', '위로하다, 돌보다'], ['ためらう', '', '決心がつかず迷う', '망설이다'],
        ['うろたえる', '', '慌てて、どうしてよいかわからなくなる', '당황하다'], ['かたくな', '', '意地を張って、考えを変えないようす', '완고함'],
        ['ことごとく', '', '一つ残らず、すべて', '모조리, 전부'], ['おのずから', '', 'しぜんに、ひとりでに', '저절로'],
        ['いささか', '', '少し', '조금, 약간'], ['ひいては', '', 'それが原因となって、さらに進んで', '나아가서는'],
        ['培う', 'つちかう', '時間をかけて力や性質を育てる', '기르다, 배양하다'], ['携わる', 'たずさわる', 'ある仕事や物事に関係する', '종사하다, 관여하다'],
        ['損なう', 'そこなう', '傷つけたり、悪くしたりする', '손상하다'], ['賄う', 'まかなう', '限られた範囲で用を足す', '충당하다, 꾸려 나가다'],
        ['覆す', 'くつがえす', 'ひっくり返す。根本から変える', '뒤엎다'], ['促す', 'うながす', 'そうするように勧める', '재촉하다, 촉구하다'],
        ['阻む', 'はばむ', '進もうとするのをさまたげる', '막다, 저지하다'], ['紛れる', 'まぎれる', 'ほかのものに入り混じってわからなくなる', '섞이다, 헷갈리다'],
        ['怠る', 'おこたる', 'するべきことをしないでおく', '게을리하다'], ['志す', 'こころざす', 'ある目標を立てて目指す', '뜻을 두다, 지망하다'],
        ['励む', 'はげむ', '一生懸命に努める', '힘쓰다'], ['潔い', 'いさぎよい', '未練がなく、態度がきっぱりしている', '깨끗하다, 미련 없다'],
        ['健やか', 'すこやか', '体や心が丈夫で元気なようす', '건강함'], ['和やか', 'なごやか', '穏やかで、打ち解けたようす', '화기애애함'],
        ['朗らか', 'ほがらか', '明るく晴れやかなようす', '명랑함'], ['円滑', 'えんかつ', '物事がすらすらと進むこと', '원활'],
        ['着実', 'ちゃくじつ', '落ち着いて確実に進めること', '착실'], ['地道', 'じみち', '手堅く着実に物事をするようす', '착실함, 꾸준함'],
        ['精進', 'しょうじん', '一つのことに打ち込んで努力すること', '정진'], ['一途', 'いちず', '一つのことにひたすら打ち込むようす', '한결같음'],
        ['研鑽', 'けんさん', '学問などを深く究めること', '연찬, 연마'], ['克服', 'こくふく', '困難に打ち勝つこと', '극복'],
        ['奮闘', 'ふんとう', '力いっぱい努力すること', '분투'], ['本領', 'ほんりょう', '本来の力や特色', '본령, 진가'],
        ['兆し', 'きざし', '物事が起こりそうなしるし', '조짐, 징조'], ['糧', 'かて', '活力や成長のもととなるもの', '양식'],
        ['雪辱', 'せつじょく', '前に負けた相手に勝って恥をすすぐこと', '설욕'], ['捲土重来', 'けんどちょうらい', '一度失敗した者が、勢いを取り戻して再び挑むこと', '권토중래'],
        ['七転び八起き', 'ななころびやおき', '何度失敗しても、そのたびに立ち上がること', '칠전팔기'], ['継続は力なり', 'けいぞくはちからなり', '続けることがそのまま力になる', '계속은 힘이다'],
        ['切磋琢磨', 'せっさたくま', '仲間どうしで励まし合い、競い合って向上すること', '절차탁마'], ['大器晩成', 'たいきばんせい', '大人物は遅れて大成するということ', '대기만성'],
        ['初志貫徹', 'しょしかんてつ', '初めに決めた志を最後まで貫くこと', '초지일관'], ['温故知新', 'おんこちしん', '昔のことを学んで、新しい知識や考えを得ること', '온고지신']
    ];
    // a line for the days that already have their own opening screen
    var OMK_SEASON = {
        shogatsu: '新しい年の学び始め。一年の計は元旦にあり。', setsubun: '福は内。苦手な問題も、今日のうちに鬼退治。',
        hinamatsuri: '桃の節句。健やかに学びを続けよ。', kodomo: '鯉の滝登りのごとく、流れに負けず上を目指せ。',
        tanabata: '短冊に書くなら「N1合格」。', hanabi: '花火のように、一瞬の集中を大切に。',
        obon: '先人の言葉に耳を傾けよ。古い文章に縁あり。', tsukimi: '月を眺めて一休み。休むのも学びのうち。',
        xmas: '自分への贈り物は、今日の一問。', omisoka: '今年の誤答は今年のうちに。', jlpt: 'ここまでの努力が、あなたのお守りです。'
    };
    function omkData() {
        var d = loadJSON('jlptOmikuji', null);
        if (!d || typeof d !== 'object') d = {};
        if (!d.days || typeof d.days !== 'object') d.days = {};
        if (!d.salt) { d.salt = Math.random().toString(36).slice(2, 10); omkSave(d); }
        return d;
    }
    function omkSave(d) { try { localStorage.setItem('jlptOmikuji', JSON.stringify(d)); } catch (e) {} }
    function omkHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
    function omkRand(seed) { return function() { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function omkPick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
    function omkKanjiNum(n) {
        var d = '〇一二三四五六七八九', s = '';
        if (n >= 100) { s += (n >= 200 ? d[Math.floor(n / 100)] : '') + '百'; n %= 100; }
        if (n >= 10) { s += (n >= 20 ? d[Math.floor(n / 10)] : '') + '十'; n %= 10; }
        if (n) s += d[n];
        return s;
    }
    function omkIsExamTime(season) {
        if (season === 'jlpt') return true;
        var n = typeof examDaysLeft === 'function' ? examDaysLeft() : null;
        return n !== null && n >= 0 && n <= 3;
    }
    function omkToday() { return omkData().days[getTodayDateString()] || null; }
    function omkGoalLeft() {
        var rec = dailyStats[getTodayDateString()] || { answered: 0 };
        return Math.max(0, dailyGoal - rec.answered);
    }
    function omkDraw() {
        var data = omkData(), key = getTodayDateString();
        if (data.days[key]) return data.days[key];
        var season = typeof seasonForToday === 'function' ? seasonForToday() : '';
        var exam = omkIsExamTime(season);
        var rnd = omkRand(omkHash(data.salt + key));
        var w = exam ? OMK_EXAM_WEIGHTS : OMK_WEIGHTS, total = 0, r = null;
        Object.keys(w).forEach(function(k) { total += w[k]; });
        var x = rnd() * total;
        Object.keys(w).some(function(k) { x -= w[k]; if (x < 0) { r = k; return true; } return false; });
        var firstOfYear = !Object.keys(data.days).some(function(k) { return k.slice(0, 4) === key.slice(0, 4); });
        var entry = { r: r || '吉', n: 1 + Math.floor(rnd() * 100), w: Math.floor(rnd() * OMK_WORDS.length), at: Date.now(),
                      s: exam ? 'jlpt' : (OMK_SEASON[season] ? season : ''), hatsu: season === 'shogatsu' && firstOfYear, ctx: omkStudyCtx() };
        data.days[key] = entry;
        omkSave(data);
        return entry;
    }
    // ---------------- 1. the scene: dusk at a shrine, with the season falling past ----------------
    function omkSceneKind() {
        var m = new Date().getMonth() + 1;
        return m >= 3 && m <= 5 ? 'sakura' : m >= 6 && m <= 8 ? 'hotaru' : m >= 9 && m <= 11 ? 'momiji' : 'yuki';
    }
    function omkSceneHtml() {
        var kind = omkSceneKind(), n = kind === 'hotaru' ? 12 : 16, ps = '';
        for (var i = 0; i < n; i++) {
            var r = Math.random;
            ps += '<i class="omk-p ' + kind + '" style="left:' + (r() * 100).toFixed(1) + '%;top:' + (kind === 'hotaru' ? (40 + r() * 55).toFixed(0) + '%' : '-8%') +
                ';--dur:' + (kind === 'hotaru' ? 4 + r() * 4 : 9 + r() * 9).toFixed(1) + 's;--delay:-' + (r() * 16).toFixed(1) + 's;--drift:' + ((r() * 2 - 1) * 90).toFixed(0) + 'px;--size:' +
                (kind === 'yuki' ? 3 + r() * 4 : kind === 'hotaru' ? 4 + r() * 3 : 8 + r() * 6).toFixed(1) + 'px;--rot:' + (r() * 360).toFixed(0) + 'deg;--hue:' + (r() * 30 - 15).toFixed(0) + 'deg"></i>';
        }
        // a torii seen against the dusk sky, faint behind everything
        var torii = '<svg class="omk-torii" viewBox="0 0 400 260" aria-hidden="true"><g fill="currentColor">' +
            '<path d="M8 34 Q200 10 392 34 L388 52 Q200 32 12 52 Z"/>' +                  // 笠木: the curved top beam
            '<rect x="40" y="56" width="320" height="13" rx="2"/>' +                       // 島木
            '<rect x="56" y="92" width="288" height="12" rx="2"/>' +                        // 貫
            '<rect x="186" y="66" width="28" height="28"/>' +                               // 額束
            '<path d="M86 52 L104 52 L112 260 L76 260 Z"/><path d="M296 52 L314 52 L324 260 L288 260 Z"/>' +   // 柱
            '</g></svg>';
        return '<div class="omk-scene" aria-hidden="true">' + torii + '<div class="omk-particles">' + ps + '</div></div>';
    }

    // ---------------- 2. sound (off unless turned on in 設定): a 鈴, paper, the 判子 ----------------
    var omkAC = null, omkNoise = null;
    // force: play even with sound turned off (the 試す buttons in the developer menu)
    function omkCtx(force) {
        if (!force && !getSetting('omikujiSound', true)) return null;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            if (!omkAC) {
                omkAC = new AC();
                omkNoise = omkAC.createBuffer(1, omkAC.sampleRate * 2, omkAC.sampleRate);
                var d = omkNoise.getChannelData(0);
                for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            }
            if (omkAC.state === 'suspended') omkAC.resume();
        } catch (e) { return null; }
        return omkAC;
    }
    // the sounds to choose from (開発者メニュー → おみくじの音)
    var OMK_BELLS = [['random', '風鈴・おりん'], ['furin', '風鈴'], ['rin', 'おりん'], ['suzu', '鈴'], ['kashiwade', '柏手'], ['hyoshigi', '拍子木']];
    var OMK_PAPERS = [['swish', 'さらり'], ['unfold', 'ぱさっ'], ['washi', '和紙'], ['crackle', 'かさかさ'], ['none', 'なし']];
    var OMK_STAMPS = [['clack', 'とん（机）'], ['soft', 'ぽん（柔）'], ['none', 'なし']];
    function omkSound(kind, strength, force, variant) {
        var ctx = omkCtx(force);
        if (!ctx) return;
        var t = ctx.currentTime + 0.01, st = strength || 1;
        var env = function(node, peak, at, decay, attack) { var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + (attack || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, at + decay); node.connect(g); g.connect(ctx.destination); return g; };
        var noise = function(at, dur, filters) {
            var s = ctx.createBufferSource(); s.buffer = omkNoise; var last = s;
            filters.forEach(function(f) { var b = ctx.createBiquadFilter(); b.type = f[0]; b.frequency.value = f[1]; b.Q.value = f[2] || 1; last.connect(b); last = b; });
            s.start(at, Math.random() * 0.8, dur + 0.05); return last;
        };
        var tone = function(freq, at, peak, decay, type, attack) { var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq; env(o, peak * st, at, decay, attack); o.start(at); o.stop(at + decay + 0.1); };
        var sweep = function(at, dur, f0, f1, q, peak, rise) {      // a breath of noise whose color slides upward
            var b = noise(at, dur, [['bandpass', f0, q]]);
            b.frequency.setValueAtTime(f0, at); b.frequency.exponentialRampToValueAtTime(f1, at + dur * .75);
            var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak * st, at + rise); g.gain.exponentialRampToValueAtTime(0.0001, at + dur * .96);
            b.connect(g); g.connect(ctx.destination);
        };
        if (kind === 'thud') {                       // a stamp slammed down: a deep taiko-like hit with a papery smack on top
            var o = ctx.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
            env(o, 0.9 * st, t, 0.6, 0.003); o.start(t); o.stop(t + 0.7);
            env(noise(t, 0.12, [['lowpass', 900, 0.7]]), 0.5 * st, t, 0.12, 0.002);
            env(noise(t, 0.05, [['bandpass', 2400, 1.2]]), 0.18 * st, t, 0.05, 0.001);
            return;
        }
        if (kind === 'bell') {
            var v = variant || 'rin';
            if (v === 'random') v = Math.random() < 0.5 ? 'furin' : 'rin';
            if (v === 'furin') {                     // 風鈴: one clear glass tone, a detuned twin for the shimmer
                [[2093, .09, 3.2], [2097.5, .07, 3.2], [4310, .03, 1.6], [6820, .014, .9], [9100, .006, .5]].forEach(function(p) { tone(p[0], t, p[1], p[2]); });
                env(noise(t, .02, [['highpass', 6000]]), .05 * st, t, .02);
            } else if (v === 'rin') {                // おりん: a struck bowl, humming as it fades
                [[528, .11, 5], [530.5, .08, 5], [1426, .05, 3.2], [1429, .04, 3.2], [2693, .025, 2], [4180, .01, 1.1]].forEach(function(p) { tone(p[0], t, p[1], p[2]); });
                env(noise(t, .03, [['bandpass', 2400, 2]]), .06 * st, t, .03);
            } else if (v === 'suzu') {               // 鈴: three bright jingles
                [0, 0.13, 0.24].forEach(function(dt, i) { [1, 1.5, 2.76].forEach(function(m, j) { tone((2350 + i * 60) * m, t + dt, [0.05, 0.025, 0.012][j], 0.55 - j * 0.12); }); });
            } else if (v === 'kashiwade') {          // 柏手: two claps, with the hall answering
                [0, .42].forEach(function(dt) { var a = t + dt;
                    env(noise(a, .09, [['bandpass', 1300, .9], ['highpass', 500]]), .7 * st, a, .08, .001);
                    env(noise(a, .05, [['lowpass', 450]]), .25 * st, a, .05, .001);
                    env(noise(a + .06, .2, [['bandpass', 1100, .7]]), .08 * st, a + .06, .22, .01); });
            } else if (v === 'hyoshigi') {           // 拍子木: two knocks of hardwood
                [0, .3].forEach(function(dt) { var a = t + dt;
                    [[1180, .35, .13], [2950, .12, .06], [620, .12, .1]].forEach(function(p) { tone(p[0], a, p[1], p[2], 'triangle', .001); });
                    env(noise(a, .03, [['bandpass', 3000, 3]]), .25 * st, a, .025, .001); });
            }
        } else if (kind === 'rustle') {
            var pv = variant || 'swish';
            if (pv === 'swish') sweep(t, .75, 700, 3200, .7, .22, .18);               // さらり: one smooth slide
            else if (pv === 'unfold') {                                                // ぱさっ: two folds flick open, then it settles
                [0, .32].forEach(function(dt, i) { sweep(t + dt, .22, 1200, 3600, .8, .26 - i * .04, .03); });
                env(noise(t + .62, .12, [['lowpass', 900]]), .1 * st, t + .62, .12, .01);
            } else if (pv === 'washi') {                                               // 和紙: a soft, low, fibrous murmur
                var b = noise(t, .8, [['bandpass', 1400, .6], ['lowpass', 2600]]);
                var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.12 * st, t + .15); g.gain.linearRampToValueAtTime(.08 * st, t + .5); g.gain.exponentialRampToValueAtTime(0.0001, t + .8);
                b.connect(g); g.connect(ctx.destination);
                for (var i = 0; i < 4; i++) { var a = t + .08 + i * .16 + Math.random() * .05; env(noise(a, .06, [['bandpass', 2200 + Math.random() * 600, 1.2]]), .05 * st, a, .05); }
            } else if (pv === 'crackle') {                                             // かさかさ: a run of small crackles
                for (var j = 0; j < 9; j++) { var c = t + j * 0.085 + Math.random() * 0.04; env(noise(c, 0.12, [['highpass', 1800], ['bandpass', 3800 + Math.random() * 1600, 0.8]]), (0.06 + Math.random() * 0.08) * st, c, 0.07 + Math.random() * 0.06); }
            }
        } else if (kind === 'clack') {
            var sv = variant || 'clack';
            if (sv === 'clack') {                    // the 判子 on paper over a wooden desk: a knock and a dull thump
                env(noise(t, 0.08, [['bandpass', 1900, 3]]), 0.5 * st, t, 0.07);
                env(noise(t, 0.12, [['lowpass', 700]]), 0.35 * st, t, 0.11);
                var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
                env(o, 0.45 * st, t, 0.16); o.start(t); o.stop(t + 0.2);
            } else if (sv === 'soft') {              // on a soft mat: just a muffled pat
                env(noise(t, 0.1, [['lowpass', 500]]), 0.4 * st, t, 0.1, .002);
                var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(140, t); o2.frequency.exponentialRampToValueAtTime(60, t + 0.1);
                env(o2, 0.3 * st, t, 0.12); o2.start(t); o2.stop(t + 0.16);
            }
        }
    }
    // 開発者メニュー: pick each sound, and try it
    function omikujiSoundDevHtml() {
        var sel = function(id, list, cur, label) { return '<div class="setting-row wrap"><span>' + label + '</span><span class="opening-controls"><select id="' + id + '" class="opening-select" aria-label="' + label + '">' +
            list.map(function(o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select><button class="opening-preview" data-try="' + id + '">試す</button></span></div>'; };
        return '<div class="omk-dev-title">おみくじの音</div>' +
               sel('set-omk-bell', OMK_BELLS, getSetting('omikujiBell', 'random'), '開くとき') +
               sel('set-omk-paper', OMK_PAPERS, getSetting('omikujiPaper', 'swish'), '広げるとき') +
               sel('set-omk-stamp', OMK_STAMPS, getSetting('omikujiStamp', 'clack'), '判子') +
               '<div class="stat-sub rsgoal-note">設定の「おみくじの音」がオフでも、試すボタンでは鳴ります。</div>';
    }
    function bindOmikujiSoundDev() {
        var map = { 'set-omk-bell': ['omikujiBell', 'bell'], 'set-omk-paper': ['omikujiPaper', 'rustle'], 'set-omk-stamp': ['omikujiStamp', 'clack'] };
        Object.keys(map).forEach(function(id) {
            var el = document.getElementById(id);
            if (!el || el.dataset.bound) return;
            el.dataset.bound = '1';
            el.addEventListener('change', function() { setSetting(map[id][0], el.value); omkSound(map[id][1], 1, true, el.value); });
            var b = document.querySelector('[data-try="' + id + '"]');
            if (b) b.addEventListener('click', function() { omkSound(map[id][1], 1, true, el.value); });
        });
    }

    // ---------------- 3. 和歌: a verse from the classical anthologies (all well over a thousand years old) ----------------
    var OMK_WAKA = {
        good: [
            ['わが君は　千代に八千代に　さざれ石の　巌となりて　苔のむすまで', '読人しらず『古今和歌集』'],
            ['天の原　ふりさけ見れば　春日なる　三笠の山に　出でし月かも', '阿倍仲麻呂『古今和歌集』'],
            ['田子の浦に　うち出でてみれば　白妙の　富士の高嶺に　雪は降りつつ', '山部赤人『新古今和歌集』']
        ],
        mid: [
            ['秋来ぬと　目にはさやかに　見えねども　風の音にぞ　おどろかれぬる', '藤原敏行『古今和歌集』'],
            ['春すぎて　夏来にけらし　白妙の　衣ほすてふ　天の香具山', '持統天皇『新古今和歌集』']
        ],
        bad: [
            ['冬ながら　空より花の　散りくるは　雲のあなたは　春にやあるらむ', '清原深養父『古今和歌集』'],
            ['雪の内に　春は来にけり　うぐひすの　こほれる涙　今やとくらむ', '二条后『古今和歌集』']
        ]
    };

    // ---------------- 4. the fortune knows your day: saved when the slip is drawn ----------------
    function omkStudyCtx() {
        var start = new Date(); start.setHours(0, 0, 0, 0);
        var wrong = {};
        (typeof attemptLog !== 'undefined' ? attemptLog : []).forEach(function(a) {
            if (a.t < start.getTime() || a.ok) return;
            var q = findQuestion(a.id);
            if (!q) return;
            var c = statCat(q);
            wrong[c] = (wrong[c] || 0) + 1;
        });
        var weak = '', most = 0;
        Object.keys(wrong).forEach(function(c) { if (wrong[c] > most) { most = wrong[c]; weak = c; } });
        var label = '';
        if (weak) {
            var parts = weak.split(':');
            label = parts[0] === 'Comprehension' ? '内容理解（' + (SIZE_NAMES[parts[1]] || '') + '）' : (categoryNames[parts[0]] || '');
        }
        var exam = typeof examDaysLeft === 'function' ? examDaysLeft() : null;
        return { weak: label, miss: getMistakeQuestions().length, exam: exam !== null && exam > 0 ? exam : 0 };
    }
    function omkCtxLine(sec, tier, ctx) {
        if (!ctx) return '';
        if (sec === '学問' && ctx.weak) return tier === 'bad' ? ctx.weak + 'に用心。今日のうちに見直すべし' : ctx.weak + 'に縁あり。今日つまずいた所こそ伸びる所なり';
        if (sec === '失物') return ctx.miss > 0 ? '誤答ノートに' + omkKanjiNum(Math.min(ctx.miss, 999)) + '問あり。探し物はそこにあり' : '失せ物なし。誤答ノートは空なり';
        if (sec === '待人' && ctx.exam > 0) return '試験の日まで、あと' + omkKanjiNum(Math.min(ctx.exam, 999)) + '日。その日、努力が迎えに来る';
        return '';
    }

    // ---------------- 5. お守り (keep a good slip) and the branch (tie a bad one) ----------------
    // お守り: a small brocade pouch. A woven pattern in the silk, a gold embroidered border and characters,
    // the mouth gathered by a braided cord tied in a 叶結び with a loop, and a small 紋 near the bottom.
    // The silk, the weave and the 紋 follow the season (the same one the opening screen shows).
    var OMK_OMA = {
        shogatsu:    { silk: '#b4211c', pat: 'shippo',   crest: 'ume',    name: 'お正月' },
        setsubun:    { silk: '#3f5b31', pat: 'asanoha',  crest: 'mame',   name: '節分' },
        hinamatsuri: { silk: '#df8aa3', pat: 'shippo',   crest: 'momo',   name: '桃の節句' },
        sakura:      { silk: '#d26d8a', pat: 'hana',     crest: 'sakura', name: '桜' },
        kodomo:      { silk: '#2b5da8', pat: 'seigaiha', crest: 'koi',    name: '端午' },
        aoba:        { silk: '#2e6a4b', pat: 'asanoha',  crest: 'himawari', name: '夏' },
        tanabata:    { silk: '#1f2c66', pat: 'hoshi',    crest: 'aoboshi', name: '七夕' },
        hanabi:      { silk: '#1d2446', pat: 'hoshi',    crest: 'hanabi', name: '花火' },
        obon:        { silk: '#5b3a7d', pat: 'shippo',   crest: 'kikyo',  name: 'お盆' },
        tsukimi:     { silk: '#2b3558', pat: 'seigaiha', crest: 'tsuki',  name: 'お月見' },
        momiji:      { silk: '#a63a17', pat: 'seigaiha', crest: 'kaede',  name: '紅葉' },
        snow:        { silk: '#23395f', pat: 'yukiwa',   crest: 'yuki',   name: '雪' },
        xmas:        { silk: '#21523a', pat: 'yukiwa',   crest: 'kiboshi', name: '聖夜', cord: '#c3332b' },
        omisoka:     { silk: '#3c2850', pat: 'shippo',   crest: 'ume',    name: '年の瀬' },
        jlpt:        { silk: '#5a2a88', pat: 'shippo',   crest: 'sakura', name: '試験' }
    };
    // which season's pouch: the opening screen's choice if one is set, otherwise the date (today, or a given day)
    function omkOmaKind(dateKey) {
        var set = getSetting('openingSeason', 'auto');
        if (set && set !== 'auto' && set !== 'off' && OMK_OMA[set]) return set;
        var d;
        if (dateKey) { var p = dateKey.split('-'); d = new Date(+p[0], +p[1] - 1, +p[2]); }
        var k = typeof seasonForToday === 'function' ? seasonForToday(d) : 'shogatsu';
        return OMK_OMA[k] ? k : 'shogatsu';
    }
    // the woven pattern of the brocade (金襴): thin gold threads, dense, across the whole cloth
    function omkOmaPattern(id, pat, col, op) {
        col = col || '#e9c773'; op = op || .42;
        var g = function(body, w, h) { return '<pattern id="' + id + 'p" width="' + (w || 8) + '" height="' + (h || 8) + '" patternUnits="userSpaceOnUse">' + body + '</pattern>'; };
        var line = '<g fill="none" stroke="' + col + '" stroke-width=".42" opacity="' + op + '">';
        switch (pat) {
            case 'seigaiha':   // 青海波
                return g(line + [[3, 4.5], [0, 2.25], [6, 2.25], [0, 6.75], [6, 6.75]].map(function(c) { return [2.8, 1.9, 1].map(function(r) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + r + '"/>'; }).join(''); }).join('') + '</g>', 6, 4.5);
            case 'asanoha':    // 麻の葉
                return g(line + '<path d="M0 0L6 6M6 0L0 6M3 0V6M0 3H6M0 0L3 6L6 0M0 6L3 0L6 6"/></g>', 6, 6);
            case 'hana':       // 小花
                var fl = function(x, y) { return [0, 72, 144, 216, 288].map(function(a) { return '<ellipse cx="' + x + '" cy="' + (y - .75) + '" rx=".42" ry=".72" transform="rotate(' + a + ' ' + x + ' ' + y + ')"/>'; }).join(''); };
                return g('<g fill="' + col + '" opacity="' + (op + .08) + '">' + fl(2, 2) + fl(5.5, 5.5) + '<circle cx="5.5" cy="1.6" r=".25"/><circle cx="1.6" cy="5.8" r=".25"/></g>', 7, 7);
            case 'yukiwa':     // 雪輪
                return g('<g fill="none" stroke="' + col + '" stroke-width=".4" opacity="' + op + '"><circle cx="2" cy="2" r="1.3"/><circle cx="5.6" cy="5.4" r=".9"/></g><g fill="' + col + '" opacity="' + op + '"><circle cx="5.3" cy="1.3" r=".3"/><circle cx="1.4" cy="5.8" r=".3"/></g>', 7, 7);
            case 'hoshi':      // 星
                return g('<g fill="' + col + '" opacity="' + (op + .12) + '"><path d="M1.8 .5l.25.9.9.25-.9.25-.25.9-.25-.9-.9-.25.9-.25z"/><circle cx="5.2" cy="4.6" r=".32"/><circle cx="4" cy="1.8" r=".2"/><circle cx="1.4" cy="5.4" r=".24"/></g>', 6.5, 6.5);
            case 'kikko':      // 亀甲
                return g(line + '<path d="M2 0H5L6.5 2.6L5 5.2H2L.5 2.6Z M6.5 2.6H8 M.5 2.6H-1 M2 5.2L1.2 6.5 M5 5.2L5.8 6.5 M2 0L1.2 -1.3 M5 0L5.8 -1.3"/></g>', 7, 5.2);
            case 'stripe':     // 五色の縞 (drawn as the silk itself; this just adds a fine weave over it)
                return g(line + '<path d="M0 2H6M0 5H6" stroke-dasharray=".6 .6"/></g>', 6, 6);
            default:           // 七宝
                return g(line + '<circle cx="0" cy="0" r="3"/><circle cx="6" cy="0" r="3"/><circle cx="0" cy="6" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="3" cy="3" r="3"/></g>', 6, 6);
        }
    }
    function omkOmaCrest(crest) {
        var cx = 32, cy = 88, gold = 'fill="#e9c66b" stroke="rgba(60,30,0,.45)" stroke-width=".35"';
        if (crest === 'ume-red') return '<g fill="#a3231c" stroke="rgba(60,0,0,.4)" stroke-width=".35"><circle cx="32" cy="88.5" r="1.7"/><circle cx="32" cy="84.4" r="1.9"/><circle cx="35.9" cy="87.2" r="1.9"/>' +
                                        '<circle cx="34.4" cy="91.8" r="1.9"/><circle cx="29.6" cy="91.8" r="1.9"/><circle cx="28.1" cy="87.2" r="1.9"/></g>';
        var petals = function(rx, ry, off, fill) { return [0, 72, 144, 216, 288].map(function(a) { return '<ellipse cx="' + cx + '" cy="' + (cy - off) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + a + ' ' + cx + ' ' + cy + ')"/>'; }).join(''); };
        var star = function(R, r) { var p = []; for (var i = 0; i < 10; i++) { var a = Math.PI / 5 * i - Math.PI / 2, d = i % 2 ? r : R; p.push((cx + d * Math.cos(a)).toFixed(2) + ' ' + (cy + d * Math.sin(a)).toFixed(2)); } return 'M' + p.join('L') + 'Z'; };
        switch (crest) {
            case 'sakura': var P = '<path d="M32 88C29.5 86.4 29.3 83.1 30.9 82.3L32 83.6L33.1 82.3C34.7 83.1 34.5 86.4 32 88Z"/>';
                           return '<g fill="#fde2ea" stroke="#9c2f52" stroke-width=".4" stroke-linejoin="round">' + [0, 72, 144, 216, 288].map(function(a) { return '<g transform="rotate(' + a + ' 32 88)">' + P + '</g>'; }).join('') + '</g>' +
                                  '<g stroke="#e58aa5" stroke-width=".3">' + [0, 72, 144, 216, 288].map(function(a) { return '<path d="M32 88V85.4" transform="rotate(' + a + ' 32 88)"/>'; }).join('') + '</g>' +
                                  '<circle cx="32" cy="88" r=".95" fill="#e9c66b"/>';
            case 'momo':   var P = '<ellipse cx="32" cy="85.4" rx="2.35" ry="2.5"/>';
                           return '<g fill="#f48aa6" stroke="#8e1f45" stroke-width=".4">' + [0, 72, 144, 216, 288].map(function(a) { return '<g transform="rotate(' + a + ' 32 88)">' + P + '</g>'; }).join('') + '</g>' +
                                  '<g fill="#fff" opacity=".35">' + [0, 72, 144, 216, 288].map(function(a) { return '<ellipse cx="31.4" cy="84.6" rx=".7" ry=".9" transform="rotate(' + a + ' 32 88)"/>'; }).join('') + '</g>' +
                                  '<circle cx="32" cy="88" r="1.5" fill="#b0244f"/>' +
                                  '<g stroke="#fbe6c0" stroke-width=".28" stroke-linecap="round">' + [18, 54, 90, 126, 162, 198, 234, 270, 306, 342].map(function(a) { return '<path d="M32 88V85.8" transform="rotate(' + a + ' 32 88)"/>'; }).join('') + '</g>' +
                                  '<g fill="#f3c74e">' + [18, 54, 90, 126, 162, 198, 234, 270, 306, 342].map(function(a) { return '<circle cx="32" cy="85.7" r=".3" transform="rotate(' + a + ' 32 88)"/>'; }).join('') + '</g>';
            case 'kikyo':  return '<path d="' + star(5, 2.6) + '" fill="#c9b6ec" stroke="#2b1840" stroke-width=".5" stroke-linejoin="round"/><circle cx="32" cy="88" r="1" fill="#e9c66b"/>';
            // 七夕: 織姫 and 彦星, a gold star and a silver one, with the Milky Way between them
            case 'tanabata': var st = function(x, y, R, r) { var p = []; for (var i = 0; i < 10; i++) { var a = Math.PI / 5 * i - Math.PI / 2, d = i % 2 ? r : R; p.push((x + d * Math.cos(a)).toFixed(2) + ' ' + (y + d * Math.sin(a)).toFixed(2)); } return 'M' + p.join('L') + 'Z'; };
                           return '<path d="M26 93.4Q31.6 87 38.4 83" fill="none" stroke="#cfdaff" stroke-width="1.5" stroke-linecap="round" stroke-dasharray=".15 1.1" opacity=".9"/>' +
                                  '<path d="' + st(28.6, 85.4, 3.2, 1.35) + '" fill="#f2cf6a" stroke="rgba(60,30,0,.45)" stroke-width=".35" stroke-linejoin="round"/>' +
                                  '<path d="' + st(35.6, 90.6, 2.5, 1.05) + '" fill="#eef2fb" stroke="rgba(30,40,70,.5)" stroke-width=".35" stroke-linejoin="round"/>';
            // 聖夜: two holly leaves and red berries
            case 'hiiragi': var lf = '<path d="M32 88.2L31.1 87.1L30 87.3L30.5 86L29.5 85.3L30.6 84.7L30.3 83.4L31.4 83.4L32 81.8L32.6 83.4L33.7 83.4L33.4 84.7L34.5 85.3L33.5 86L34 87.3L32.9 87.1Z" fill="#3f8a4e" stroke="#123a1e" stroke-width=".35" stroke-linejoin="round"/><path d="M32 87.6V83" stroke="#9fd3a6" stroke-width=".28"/>';
                           return '<g transform="rotate(-42 32 89)">' + lf + '</g><g transform="rotate(42 32 89)">' + lf + '</g>' +
                                  '<g fill="#d8332b" stroke="#5e0d0a" stroke-width=".3"><circle cx="32" cy="89.4" r="1.15"/><circle cx="30.6" cy="90.9" r="1.15"/><circle cx="33.4" cy="90.9" r="1.15"/></g>' +
                                  '<g fill="#fff" opacity=".6"><circle cx="31.7" cy="89" r=".3"/><circle cx="30.3" cy="90.5" r=".3"/><circle cx="33.1" cy="90.5" r=".3"/></g>';
            // 向日葵 (summer): yellow petals round a brown seed head
            case 'himawari': return '<g fill="#f7c62f" stroke="#8a5a08" stroke-width=".3" stroke-linejoin="round">' +
                                  [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(function(a) { return '<path d="M32 88L31.1 84.6Q32 82 32.9 84.6Z" transform="rotate(' + a + ' 32 88)"/>'; }).join('') + '</g>' +
                                  '<circle cx="32" cy="88" r="2.5" fill="#6b3f1a" stroke="#3a1f08" stroke-width=".35"/>' +
                                  '<g fill="#a0682c">' + [[31.2, 87.3], [32.8, 87.3], [32, 88.6], [31, 88.9], [33, 88.9], [32, 86.8]].map(function(d) { return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r=".32"/>'; }).join('') + '</g>';
            // 七夕: a blue star
            case 'aoboshi': return '<path d="' + star(5.2, 2.2) + '" fill="#6aa6ff" stroke="#0f2a66" stroke-width=".45" stroke-linejoin="round"/><path d="M32 83.6L32.9 86.7" stroke="#e6f0ff" stroke-width=".45" stroke-linecap="round" opacity=".8"/>';
            // 聖夜: a yellow star
            case 'kiboshi': return '<path d="' + star(5.2, 2.2) + '" fill="#ffd83a" stroke="#7a5200" stroke-width=".45" stroke-linejoin="round"/><path d="M32 83.6L32.9 86.7" stroke="#fff8d0" stroke-width=".45" stroke-linecap="round" opacity=".85"/>';
            case 'hoshi':  return '<path d="' + star(5, 2.1) + '" ' + gold + ' stroke-linejoin="round"/>';
            case 'kaede':  return '<path d="M32.00 90.55L32.00 94.33" stroke="#5a1a0a" stroke-width=".7" stroke-linecap="round"/>' +
                                  '<path d="M32.00 81.50L32.61 82.85L33.35 82.44L33.15 84.06L34.02 83.80L33.48 85.82L33.89 86.63L35.11 85.28L35.38 84.33L36.12 85.28L37.27 84.61L36.99 85.82L38.48 86.09L37.27 87.31L37.80 88.11L36.19 88.25L36.45 89.06L34.56 89.06L35.51 90.00L35.91 91.22L34.56 90.68L33.89 91.62L32.67 90.81L32.13 91.36L31.86 91.36L31.32 90.81L30.11 91.62L29.43 90.68L28.09 91.22L28.49 90.00L29.43 89.06L27.55 89.06L27.81 88.25L26.20 88.11L26.73 87.31L25.52 86.09L27.00 85.82L26.73 84.61L27.88 85.28L28.62 84.33L28.89 85.28L30.11 86.63L30.52 85.82L29.98 83.80L30.85 84.06L30.65 82.44L31.39 82.85L32.00 81.50Z" fill="#e2502e" stroke="#5a1a0a" stroke-width=".3" stroke-linejoin="round"/>' +
                                  '<path d="M32.00 90.95L32.00 82.98M32.00 90.95L36.86 86.22M32.00 90.95L27.14 86.22" fill="none" stroke="#a32a16" stroke-width=".3" stroke-linecap="round" opacity=".85"/>';
            case 'leaf':   return '<path d="M30 94.2Q31.3 90.6 33.1 86.6" fill="none" stroke="#3f6b2a" stroke-width=".7" stroke-linecap="round"/>' +
                                  '<path d="M32.5 88C32.2 85 34.4 82.9 37.2 82.4C37 85.4 35.2 87.7 32.5 88Z" fill="#8fd06a" stroke="#1f4a22" stroke-width=".4" stroke-linejoin="round"/>' +
                                  '<path d="M32.8 87.6L36.6 83" stroke="#1f4a22" stroke-width=".3"/>' +
                                  '<path d="M31.3 90.9C28.8 91.1 27 89.2 26.8 86.8C29.4 86.8 31.3 88.5 31.3 90.9Z" fill="#c2e59a" stroke="#1f4a22" stroke-width=".4" stroke-linejoin="round"/>' +
                                  '<path d="M31.1 90.6L27.3 87.2" stroke="#1f4a22" stroke-width=".3"/>' +
                                  '<path d="M33.1 86.6C32.6 85.4 32.9 84.4 33.6 83.8C34 84.9 33.8 86 33.1 86.6Z" fill="#6fb64c" stroke="#1f4a22" stroke-width=".3"/>';
            case 'yuki':   return '<g stroke="#eef3fb" stroke-width=".9" stroke-linecap="round">' + [0, 60, 120].map(function(a) { return '<g transform="rotate(' + a + ' 32 88)"><path d="M32 83V93M30.6 84.2L32 85.4L33.4 84.2M30.6 91.8L32 90.6L33.4 91.8"/></g>'; }).join('') + '</g>';
            case 'tsuki':  return '<circle cx="32" cy="88" r="4.2" fill="#f6e3a2" stroke="#3b2f10" stroke-width=".4"/><path d="M26.5 90.5C28.5 89 30 90.5 31.5 89.6S35 89.2 37.5 90.6" fill="none" stroke="#c9d2e6" stroke-width="1" stroke-linecap="round"/>';
            case 'hanabi': return '<g stroke="#f4c86a" stroke-width=".7" stroke-linecap="round">' + [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(function(a, i) { var r1 = 1.6, r2 = i % 2 ? 3.6 : 5, t = a * Math.PI / 180; return '<path d="M' + (cx + r1 * Math.cos(t)).toFixed(2) + ' ' + (cy + r1 * Math.sin(t)).toFixed(2) + 'L' + (cx + r2 * Math.cos(t)).toFixed(2) + ' ' + (cy + r2 * Math.sin(t)).toFixed(2) + '"' + (i % 3 === 1 ? ' stroke="#f08aa0"' : '') + '/>'; }).join('') + '</g><circle cx="32" cy="88" r=".8" fill="#fff4d0"/>';
            case 'koi':    return '<path d="M26.8 88C28.6 85.4 33 85.2 35.4 87.6L38 85.6L37.2 88L38 90.4L35.4 88.4C33 90.8 28.6 90.6 26.8 88Z" fill="#e9734f" stroke="#41110a" stroke-width=".45" stroke-linejoin="round"/><circle cx="28.8" cy="87.6" r=".45" fill="#2a0a05"/>';
            case 'mame':   return '<rect x="27.5" y="83.5" width="9" height="9" rx=".6" fill="#c89a5a" stroke="#3a2410" stroke-width=".5"/><rect x="28.8" y="84.8" width="6.4" height="6.4" fill="none" stroke="#3a2410" stroke-width=".35"/><g fill="#f3dfb2" stroke="#6a4520" stroke-width=".3"><circle cx="30.6" cy="87" r="1"/><circle cx="33.4" cy="87" r="1"/><circle cx="32" cy="89.3" r="1"/></g>';
            default:       return '<g ' + gold + '><circle cx="32" cy="88.5" r="1.7"/><circle cx="32" cy="84.4" r="1.9"/><circle cx="35.9" cy="87.2" r="1.9"/>' +
                                  '<circle cx="34.4" cy="91.8" r="1.9"/><circle cx="29.6" cy="91.8" r="1.9"/><circle cx="28.1" cy="87.2" r="1.9"/></g>';
        }
    }
    // めずらしいお守り: now and then the お守り you take home is a rare one (a little more often on 大吉)
    var OMK_OMA_RARE = {
        kin:     { name: '金のお守り',   silk: '#c4952f', pat: 'kikko',  patCol: '#fff1bf', patOp: .45, panel: '#a87a22', thread: 'red',    border: 'red',    disc: '#7a1712', chance: .04 },
        shiro:   { name: '白絹のお守り', silk: '#eee8dc', pat: 'shippo', patCol: '#b9a77a', patOp: .4,  panel: '#e3dccb', thread: 'gold',   border: 'gold',   disc: '#2f3a52', chance: .04 },
        kuro:    { name: '漆黒のお守り', silk: '#1c1a20', pat: 'asanoha',patCol: '#c9a24e', patOp: .36, panel: '#121116', thread: 'gold',   border: 'gold',   disc: '#3a2c18', chance: .025 },
        goshiki: { name: '五色のお守り', silk: 'stripe',  pat: 'stripe', patCol: '#fff',    patOp: .25, panel: '#f3ede0', thread: 'gold',   border: 'gold',   disc: '#2b2a44', chance: .015 }
    };
    function omkOmaRare(key, rank) {
        var rnd = omkRand(omkHash(omkData().salt + key + '|oma'))(), boost = rank === '大吉' ? 2 : 1, acc = 0, out = '';
        Object.keys(OMK_OMA_RARE).some(function(k) { acc += OMK_OMA_RARE[k].chance * boost; if (rnd < acc) { out = k; return true; } return false; });
        return out;
    }
    var OMK_THREAD = {
        gold:   ['#8a6420', '#f6dd94', '#b88d32'],
        silver: ['#7d8691', '#f5f7f9', '#9aa3ad'],
        red:    ['#6a0e0b', '#d9473b', '#8c1a14']
    };
    // 根付: a small seasonal charm tied to the cord of a rare お守り
    function omkOmaCharm(id, kind) {
        var th = OMK_OMA[kind] || OMK_OMA.shogatsu, x = 62.5, y = 72;
        var bell = function(mark) {      // a little gold 鈴
            return '<g transform="translate(' + x + ' ' + y + ')"><circle r="4.3" fill="url(#' + id + 'gb)" stroke="rgba(70,40,0,.55)" stroke-width=".4"/>' +
                '<path d="M-4.2 -.2H4.2" stroke="rgba(70,40,0,.5)" stroke-width=".45"/><circle cy="1.9" r=".75" fill="rgba(60,30,0,.75)"/><path d="M0 1.9V4.1" stroke="rgba(60,30,0,.7)" stroke-width=".5"/>' +
                '<ellipse cx="-1.4" cy="-2" rx="1.4" ry=".8" fill="#fff" opacity=".55"/>' + (mark || '') + '</g>';
        };
        var art;
        if (kind === 'jlpt') art = bell('<text y="-1.6" font-size="3.2" text-anchor="middle" dominant-baseline="central" fill="#8c1a14" style="font-family:var(--omk-font);font-weight:800">合</text>');
        else if (kind === 'shogatsu' || kind === 'omisoka') art = bell();
        else art = '<g transform="translate(' + x + ' ' + (y + .5) + ') scale(1.15) translate(-32 -88)">' + omkOmaCrest(th.crest) + '</g>';
        return '<g class="omk-oma-charm">' +
            // the cord from the knot, a bead, then the charm swinging below it
            '<path d="M35 17C47 17 58 24 61.2 36.5S62.5 52 62.5 61" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1.5" stroke-linecap="round"/>' +
            '<path d="M35 17C47 17 58 24 61.2 36.5S62.5 52 62.5 61" fill="none" stroke="url(#' + id + 'c)" stroke-width="1" stroke-linecap="round"/>' +
            '<g class="omk-oma-swing"><path d="M62.5 61V65.5" stroke="url(#' + id + 'c)" stroke-width="1" stroke-linecap="round"/>' +
            '<circle cx="62.5" cy="64.4" r="1.6" fill="url(#' + id + 'gb)" stroke="rgba(70,40,0,.5)" stroke-width=".35"/>' + art + '</g></g>';
    }
    var OMK_OMA_DECOR = false;      // the seasonal 紋 and the rare ones' 根付: off for now
    var omkOmaN = 0;
    // A padded brocade pouch with its top corners cut at an angle: a 金襴 weave over the whole cloth,
    // a woven panel down the middle with the name embroidered in satin stitch, a stitched edge, the 紋 below,
    // and a braided cord tied in a 花結び over the mouth (a loop to each side) with a loop to hang it by.
    function omkOmamoriSvg(w, label, kind, rare) {
        label = label || '学業守';
        var th = OMK_OMA[kind] || OMK_OMA[omkOmaKind()], rt = OMK_OMA_RARE[rare] || null;
        var silk = rt ? rt.silk : th.silk, pat = rt ? rt.pat : th.pat;
        var thread = OMK_THREAD[rt ? rt.thread : 'gold'], bord = OMK_THREAD[rt ? rt.border : 'gold'];
        var id = 'oma' + (++omkOmaN), font = 'font-family:var(--omk-font);font-weight:700';
        var chars = label.split('');
        // the cord in a color that stands out from the cloth, as on real ones: white on red, red on everything else.
        // [body, lit top, shaded underside]
        var CORD = { red: ['#c42e27', '#f2826f', '#6e120e'], white: ['#ece5d6', '#ffffff', '#9d927e'], gold: ['#d4a63a', '#fbe7a6', '#86601c'] };
        var cordName = rt ? (rare === 'goshiki' ? 'gold' : 'red')
                     : ({ shogatsu: 'white', momiji: 'white', xmas: 'red' })[OMK_OMA[kind] ? kind : omkOmaKind()] || 'red';
        var cord = CORD[cordName];
        // the padded pouch: a flat top with its corners cut off at an angle, straight sides, a soft rounded bottom
        var body = 'M18.5 22 L45.5 22 Q47.2 22 48.4 23.2 L53.4 29.8 Q54.2 30.9 54.2 32.4 L54.6 99.4 Q54.6 104 50 104 L14 104 Q9.4 104 9.4 99.4 L9.8 32.4 Q9.8 30.9 10.6 29.8 L15.6 23.2 Q16.8 22 18.5 22 Z';
        var grad = function(gid, c, vert) { return '<linearGradient id="' + id + gid + '"' + (vert ? ' x1="0" y1="0" x2="0" y2="1"' : ' x1="0" x2="1"') + '><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".5" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'; };
        var stripes = silk === 'stripe'
            ? '<g clip-path="url(#' + id + 'k)">' + ['#2f5aa8', '#c7302a', '#e3b33a', '#f1ebdd', '#3b2a55'].map(function(c, i) { return '<rect x="' + (10 + i * 8.8) + '" y="20" width="8.9" height="86" fill="' + c + '"/>'; }).join('') + '</g>'
            : '<path d="' + body + '" fill="' + silk + '"/>';
        var panelFill = rt ? rt.panel : 'rgba(0,0,0,.16)';
        var dark = rare === 'shiro' || rare === 'goshiki';
        var vw = rt && OMK_OMA_DECOR ? 70 : 64;
        return '<svg class="omk-omamori' + (rt ? ' rare rare-' + rare : '') + '" viewBox="0 0 ' + vw + ' 108" width="' + Math.round(w * vw / 64) + '" height="' + Math.round(w * 108 / 64) + '" aria-hidden="true"><defs>' +
                '<radialGradient id="' + id + 'gb" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#e2b84f"/><stop offset="1" stop-color="#8a6420"/></radialGradient>' +
                '<clipPath id="' + id + 'k"><path d="' + body + '"/></clipPath>' +
                omkOmaPattern(id, pat, rt ? rt.patCol : '#e9c773', rt ? rt.patOp : .42) +
                // twill: the fine diagonal ribs of the weave
                '<pattern id="' + id + 't" width="1.3" height="1.3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width=".5" height="1.3" fill="' + (dark ? '#000' : '#fff') + '" opacity="' + (dark ? .05 : .07) + '"/></pattern>' +
                // satin stitch: long parallel stitches across the embroidered characters
                '<pattern id="' + id + 's" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><rect width="1" height=".38" fill="#000" opacity=".22"/></pattern>' +
                // the cloth's roundness and the light falling across it
                '<linearGradient id="' + id + 'g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".12" stop-color="#000" stop-opacity=".08"/><stop offset=".38" stop-color="#fff" stop-opacity=".09"/>' +
                    '<stop offset=".62" stop-color="#fff" stop-opacity=".02"/><stop offset=".9" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".36"/></linearGradient>' +
                '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".13"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
                grad('c', cord) + grad('x', thread, true) + grad('b', bord) +
                '<radialGradient id="' + id + 'kn" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="' + cord[1] + '"/><stop offset=".55" stop-color="' + cord[0] + '"/><stop offset="1" stop-color="' + cord[2] + '" stop-opacity="1"/></radialGradient>' +
                '<filter id="' + id + 'sb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter>' +
            '</defs>' +
            // the cord: two strands rising from behind the knot, out over the top edge
            (function() {
                var d = 'M31.1 26C30.8 18 30.9 9 31.2 .6M32.9 26C33.2 18 33.1 9 32.8 .6';
                return '<g fill="none" stroke-linecap="round">' +
                    '<path d="' + d + '" stroke="#000" stroke-opacity=".4" stroke-width="2.2"/>' +
                    '<path d="' + d + '" stroke="' + cord[0] + '" stroke-width="1.7"/>' +
                    '<path d="' + d + '" stroke="#fff" stroke-opacity=".4" stroke-width=".55" stroke-dasharray=".7 .7"/></g>';
            })() +
            // the pouch
            stripes +
            '<g clip-path="url(#' + id + 'k)">' +
                '<rect x="8" y="20" width="48" height="86" fill="url(#' + id + 'p)"/>' +
                '<rect x="8" y="20" width="48" height="86" fill="url(#' + id + 't)"/>' +
                // the woven panel down the middle, with a gold double rule
                '<rect x="19" y="42" width="26" height="52" rx=".6" fill="' + panelFill + '"/>' +
                '<rect x="19" y="42" width="26" height="52" rx=".6" fill="url(#' + id + 't)"/>' +
                '<rect x="19" y="42" width="26" height="52" rx=".6" fill="none" stroke="url(#' + id + 'b)" stroke-width=".9"/>' +
                '<rect x="20.6" y="43.6" width="22.8" height="48.8" fill="none" stroke="url(#' + id + 'b)" stroke-width=".35" opacity=".8"/>' +
                '<rect x="8" y="20" width="48" height="86" fill="url(#' + id + 'g)"/>' +
                '<rect x="8" y="20" width="48" height="86" fill="url(#' + id + 'h)"/>' +
                // padding: the cloth puffs out, so its edges fall into shadow all round
                '<path d="' + body + '" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="5"/>' +
            '</g>' +
            // 二重叶結び (the doubled 叶結び, also called めがね結び), as in the usual diagram: two wide loops
            // out to the sides and a narrow one hanging below, every one of them two strands side by side,
            // and in the middle the 口, four short double sides woven over and under one another
            (function() {
                var C = function(d, w) {      // one round cord: soft shadow, dark underside, body, a lit top edge and its braid
                    return '<path d="' + d + '" stroke="#000" stroke-opacity=".42" stroke-width="' + (w + .6) + '" transform="translate(.2 .55)" filter="url(#' + id + 'sb)"/>' +
                           '<path d="' + d + '" stroke="' + cord[2] + '" stroke-width="' + w + '"/>' +
                           '<path d="' + d + '" stroke="' + cord[0] + '" stroke-width="' + (w * .72) + '" transform="translate(-.06 -.1)"/>' +
                           '<path d="' + d + '" stroke="' + cord[1] + '" stroke-opacity=".8" stroke-width="' + (w * .28) + '" transform="translate(-.22 -.3)"/>' +
                           '<path d="' + d + '" stroke="' + cord[2] + '" stroke-opacity=".28" stroke-width="' + (w * .5) + '" stroke-dasharray=".4 .6"/>';
                };
                var W = 1.55;
                return '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
                    C('M29.60 29.00C25.50 24.60 16.40 23.80 16.00 30.00C15.60 36.20 25.50 35.40 29.60 31.00', W) + C('M34.40 29.00C38.50 24.60 47.60 23.80 48.00 30.00C48.40 36.20 38.50 35.40 34.40 31.00', W) +
                    C('M29.60 29.50C25.50 26.60 18.40 25.80 18.00 30.00C17.60 34.20 25.50 33.40 29.60 30.50', W) + C('M34.40 29.50C38.50 26.60 45.60 25.80 46.00 30.00C46.40 34.20 38.50 33.40 34.40 30.50', W) +
                    C('M30.9 32.2C30.2 35.6 30.7 38.2 32 38.2C33.3 38.2 33.8 35.6 33.1 32.2', W) +     // the small loop below: one cord, pulled tight
                    // the two cords come down over the top edge into the top of the 口
                    C('M31.15 21.2L31.2 27.4', W) + C('M32.85 21.2L32.8 27.4', W) +
                    // the two cords come down over the top edge into the top of the 口
                    C('M31.15 21.2L31.2 26.6', W) + C('M32.85 21.2L32.8 26.6', W) +
                    '<path d="M32.00 26.89 L35.11 30.00 L32.00 33.11 L28.89 30.00Z" fill="' + cord[2] + '"/>' +
                    // the 口: eight short pills, two to a block, four blocks fitted snugly round a tiny centre
                    (function() {      // every pill's shadow first, then the pills, so no pill darkens its neighbour
                        var pills = ['M32.01 26.30L33.29 27.58', 'M30.81 27.50L32.09 28.78', 'M35.70 30.01L34.42 31.29', 'M34.50 28.81L33.22 30.09', 'M30.71 32.42L31.99 33.70', 'M31.91 31.22L33.19 32.50', 'M29.58 28.71L28.30 29.99', 'M30.78 29.91L29.50 31.19'];
                        return pills.map(function(d) { return '<path d="' + d + '" stroke="#000" stroke-opacity=".4" stroke-width="2" transform="translate(.2 .5)" filter="url(#' + id + 'sb)"/>'; }).join('') +
                               pills.map(function(d) { return C(d, 1.95).replace(/^<path[^>]*filter[^>]*\/>/, ''); }).join('');
                    })() +
                '</g>';
            })() +
            // stitched edge, a running stitch just inside the border
            '<path d="' + body + '" transform="translate(32 64) scale(.9 .93) translate(-32 -64.6)" fill="none" stroke="url(#' + id + 'b)" stroke-width=".6" stroke-dasharray="1.2 .7" opacity=".85"/>' +
            // the name, embroidered: a shadow where the thread stands off the cloth, the thread, its stitches
            '<g style="' + font + '" font-size="10.6" text-anchor="middle" dominant-baseline="central">' +
                chars.map(function(c, i) { var y = 53 + i * 14.2;
                    return '<text x="32.25" y="' + (y + .3) + '" fill="#000" opacity=".38">' + c + '</text>' +
                           '<text x="32" y="' + y + '" fill="url(#' + id + 'x)">' + c + '</text>' +
                           '<text x="32" y="' + y + '" fill="url(#' + id + 's)">' + c + '</text>'; }).join('') + '</g>' +
            // the 紋, embroidered below the panel
            (OMK_OMA_DECOR ? '<g transform="translate(32 93.5) scale(.82) translate(-32 -88)">' + omkOmaCrest(rt && rare === 'kin' ? 'ume-red' : th.crest) + '</g>' +
                             (rt ? omkOmaCharm(id, OMK_OMA[kind] ? kind : omkOmaKind()) : '') : '') +
        '</svg>';
    }
    function omkBranchHtml(tied) {
        // a thin bare twig crowded with other people's slips, folded and knotted on (white and gold), a little plum blossom
        return '<div class="omk-branch' + (tied ? ' has-knot' : '') + '" id="omk-branch" aria-hidden="true">' +
            '<svg viewBox="0 0 360 64" preserveAspectRatio="xMidYMin slice"><defs><linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a52"/><stop offset=".5" stop-color="#5e4433"/><stop offset="1" stop-color="#3a2a20"/></linearGradient><linearGradient id="pw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf7ee"/><stop offset=".6" stop-color="#efe7d6"/><stop offset="1" stop-color="#ddd2bb"/></linearGradient><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dc7a"/><stop offset=".5" stop-color="#d9a92a"/><stop offset="1" stop-color="#b8861a"/></linearGradient><linearGradient id="pwr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfb197"/><stop offset=".35" stop-color="#f6f0e3"/><stop offset=".8" stop-color="#e2d8c4"/><stop offset="1" stop-color="#b8aa8e"/></linearGradient><linearGradient id="pwrg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#94680f"/><stop offset=".35" stop-color="#f3d27a"/><stop offset=".8" stop-color="#d4a63a"/><stop offset="1" stop-color="#86601c"/></linearGradient><linearGradient id="pws" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8dfcc"/><stop offset="1" stop-color="#c9bc9f"/></linearGradient><linearGradient id="pgs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9b04a"/><stop offset="1" stop-color="#94680f"/></linearGradient><linearGradient id="rp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3cf9f"/><stop offset=".5" stop-color="#c9ad72"/><stop offset="1" stop-color="#8f7445"/></linearGradient><radialGradient id="pk"><stop offset="0" stop-color="#fbe1ea"/><stop offset="1" stop-color="#e2587f"/></radialGradient><filter id="sh" x="-5%" y="-30%" width="110%" height="170%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.1" flood-color="#000" flood-opacity=".4"/></filter></defs><g filter="url(#sh)"><path d="M-12.1 15.7 L-4.7 16.3 L2.7 16.9 L10.1 17.4 L17.6 18.0 L25.1 18.5 L32.6 18.9 L40.2 19.4 L47.8 19.8 L55.4 20.2 L63.0 20.5 L70.7 20.9 L78.4 21.2 L86.1 21.5 L93.9 21.8 L101.7 22.0 L109.4 22.3 L117.2 22.5 L125.1 22.7 L132.9 22.8 L140.7 22.9 L148.6 23.0 L156.4 23.1 L164.3 23.2 L172.1 23.2 L180.0 23.2 L187.9 23.2 L195.7 23.2 L203.6 23.1 L211.4 23.1 L219.3 23.0 L227.1 22.8 L234.9 22.7 L242.8 22.5 L250.6 22.3 L258.3 22.0 L266.1 21.8 L273.9 21.6 L281.6 21.3 L289.3 20.9 L297.0 20.5 L304.6 20.2 L312.2 19.8 L319.8 19.3 L327.4 18.9 L334.9 18.4 L342.4 18.0 L349.9 17.4 L357.3 16.9 L364.7 16.4 L372.1 15.7 L371.9 14.3 L364.6 14.8 L357.2 15.4 L349.8 16.0 L342.3 16.4 L334.8 17.0 L327.3 17.4 L319.8 17.9 L312.2 18.3 L304.5 18.7 L296.9 19.1 L289.2 19.4 L281.5 19.7 L273.8 20.0 L266.0 20.3 L258.3 20.6 L250.5 20.8 L242.7 21.0 L234.9 21.2 L227.1 21.3 L219.3 21.4 L211.4 21.5 L203.6 21.6 L195.7 21.7 L187.9 21.8 L180.0 21.8 L172.1 21.8 L164.3 21.7 L156.4 21.6 L148.6 21.6 L140.7 21.5 L132.9 21.3 L125.1 21.1 L117.3 20.9 L109.5 20.7 L101.7 20.6 L93.9 20.3 L86.2 20.0 L78.5 19.8 L70.8 19.4 L63.1 19.1 L55.5 18.7 L47.8 18.3 L40.2 17.9 L32.7 17.4 L25.2 16.9 L17.7 16.5 L10.2 15.9 L2.8 15.4 L-4.6 14.8 L-11.9 14.3Z" fill="url(#rp)"/><path d="M-11.1 14.2 L-9.6 15.8 M-9.1 14.8 L-7.6 16.3 M-7.1 14.8 L-5.6 16.3 M-5.1 14.8 L-3.6 16.3 M-3.1 14.8 L-1.6 16.3 M-1.1 15.4 L0.4 16.9 M0.9 15.4 L2.4 16.9 M2.9 15.4 L4.4 16.9 M4.9 15.4 L6.4 16.9 M6.9 15.9 L8.4 17.4 M8.9 15.9 L10.4 17.4 M10.9 15.9 L12.4 17.4 M12.9 16.5 L14.4 18.0 M14.9 16.5 L16.4 18.0 M16.9 16.5 L18.4 18.0 M18.9 16.5 L20.4 18.0 M20.9 17.0 L22.4 18.5 M22.9 17.0 L24.4 18.5 M24.9 17.0 L26.4 18.5 M26.9 17.0 L28.4 18.5 M28.9 17.4 L30.4 18.9 M30.9 17.4 L32.4 18.9 M32.9 17.4 L34.4 18.9 M34.9 17.4 L36.4 18.9 M36.9 17.9 L38.4 19.4 M38.9 17.9 L40.4 19.4 M40.9 17.9 L42.4 19.4 M42.9 18.3 L44.4 19.8 M44.9 18.3 L46.4 19.8 M46.9 18.3 L48.4 19.8 M48.9 18.3 L50.4 19.8 M50.9 18.7 L52.4 20.2 M52.9 18.7 L54.4 20.2 M54.9 18.7 L56.4 20.2 M56.9 18.7 L58.4 20.2 M58.9 19.1 L60.4 20.6 M60.9 19.1 L62.4 20.6 M62.9 19.1 L64.4 20.6 M64.9 19.1 L66.4 20.6 M66.9 19.4 L68.4 20.9 M68.9 19.4 L70.4 20.9 M70.9 19.4 L72.4 20.9 M72.9 19.4 L74.4 20.9 M74.9 19.7 L76.4 21.2 M76.9 19.7 L78.4 21.2 M78.9 19.7 L80.4 21.2 M80.9 19.7 L82.4 21.2 M82.9 20.0 L84.4 21.5 M84.9 20.0 L86.4 21.5 M86.9 20.0 L88.4 21.5 M88.9 20.0 L90.4 21.5 M90.9 20.3 L92.4 21.8 M92.9 20.3 L94.4 21.8 M94.9 20.3 L96.4 21.8 M96.9 20.5 L98.4 22.0 M98.9 20.5 L100.4 22.0 M100.9 20.5 L102.4 22.0 M102.9 20.5 L104.4 22.0 M104.9 20.8 L106.4 22.3 M106.9 20.8 L108.4 22.3 M108.9 20.8 L110.4 22.3 M110.9 20.8 L112.4 22.3 M112.9 21.0 L114.4 22.5 M114.9 21.0 L116.4 22.5 M116.9 21.0 L118.4 22.5 M118.9 21.0 L120.4 22.5 M120.9 21.2 L122.4 22.7 M122.9 21.2 L124.4 22.7 M124.9 21.2 L126.4 22.7 M126.9 21.2 L128.4 22.7 M128.9 21.3 L130.4 22.8 M130.9 21.3 L132.4 22.8 M132.9 21.3 L134.4 22.8 M134.9 21.3 L136.4 22.8 M136.9 21.4 L138.4 22.9 M138.9 21.4 L140.4 22.9 M140.9 21.4 L142.4 22.9 M142.9 21.4 L144.4 22.9 M144.9 21.6 L146.4 23.1 M146.9 21.6 L148.4 23.1 M148.9 21.6 L150.4 23.1 M150.9 21.6 L152.4 23.1 M152.9 21.6 L154.4 23.1 M154.9 21.6 L156.4 23.1 M156.9 21.6 L158.4 23.1 M158.9 21.6 L160.4 23.1 M160.9 21.7 L162.4 23.2 M162.9 21.7 L164.4 23.2 M164.9 21.7 L166.4 23.2 M166.9 21.7 L168.4 23.2 M168.9 21.7 L170.4 23.2 M170.9 21.7 L172.4 23.2 M172.9 21.7 L174.4 23.2 M174.9 21.7 L176.4 23.2 M176.9 21.8 L178.4 23.2 M178.9 21.8 L180.4 23.2 M180.9 21.8 L182.4 23.2 M182.9 21.7 L184.4 23.2 M184.9 21.7 L186.4 23.2 M186.9 21.7 L188.4 23.2 M188.9 21.7 L190.4 23.2 M190.9 21.7 L192.4 23.2 M192.9 21.7 L194.4 23.2 M194.9 21.7 L196.4 23.2 M196.9 21.7 L198.4 23.2 M198.9 21.6 L200.4 23.1 M200.9 21.6 L202.4 23.1 M202.9 21.6 L204.4 23.1 M204.9 21.6 L206.4 23.1 M206.9 21.6 L208.4 23.1 M208.9 21.6 L210.4 23.1 M210.9 21.6 L212.4 23.1 M212.9 21.6 L214.4 23.1 M214.9 21.4 L216.4 22.9 M216.9 21.4 L218.4 22.9 M218.9 21.4 L220.4 22.9 M220.9 21.4 L222.4 22.9 M222.9 21.3 L224.4 22.8 M224.9 21.3 L226.4 22.8 M226.9 21.3 L228.4 22.8 M228.9 21.3 L230.4 22.8 M230.9 21.2 L232.4 22.7 M232.9 21.2 L234.4 22.7 M234.9 21.2 L236.4 22.7 M236.9 21.2 L238.4 22.7 M238.9 21.0 L240.4 22.5 M240.9 21.0 L242.4 22.5 M242.9 21.0 L244.4 22.5 M244.9 21.0 L246.4 22.5 M246.9 20.8 L248.4 22.3 M248.9 20.8 L250.4 22.3 M250.9 20.8 L252.4 22.3 M252.9 20.8 L254.4 22.3 M254.9 20.6 L256.4 22.1 M256.9 20.6 L258.4 22.1 M258.9 20.6 L260.4 22.1 M260.9 20.6 L262.4 22.1 M262.9 20.3 L264.4 21.8 M264.9 20.3 L266.4 21.8 M266.9 20.3 L268.4 21.8 M268.9 20.0 L270.4 21.5 M270.9 20.0 L272.4 21.5 M272.9 20.0 L274.4 21.5 M274.9 20.0 L276.4 21.5 M276.9 19.7 L278.4 21.2 M278.9 19.7 L280.4 21.2 M280.9 19.7 L282.4 21.2 M282.9 19.7 L284.4 21.2 M284.9 19.4 L286.4 20.9 M286.9 19.4 L288.4 20.9 M288.9 19.4 L290.4 20.9 M290.9 19.4 L292.4 20.9 M292.9 19.1 L294.4 20.6 M294.9 19.1 L296.4 20.6 M296.9 19.1 L298.4 20.6 M298.9 19.1 L300.4 20.6 M300.9 18.7 L302.4 20.2 M302.9 18.7 L304.4 20.2 M304.9 18.7 L306.4 20.2 M306.9 18.7 L308.4 20.2 M308.9 18.3 L310.4 19.8 M310.9 18.3 L312.4 19.8 M312.9 18.3 L314.4 19.8 M314.9 18.3 L316.4 19.8 M316.9 17.9 L318.4 19.4 M318.9 17.9 L320.4 19.4 M320.9 17.9 L322.4 19.4 M322.9 17.4 L324.4 18.9 M324.9 17.4 L326.4 18.9 M326.9 17.4 L328.4 18.9 M328.9 17.4 L330.4 18.9 M330.9 17.0 L332.4 18.5 M332.9 17.0 L334.4 18.5 M334.9 17.0 L336.4 18.5 M336.9 17.0 L338.4 18.5 M338.9 16.5 L340.4 18.0 M340.9 16.5 L342.4 18.0 M342.9 16.5 L344.4 18.0 M344.9 16.5 L346.4 18.0 M346.9 15.9 L348.4 17.4 M348.9 15.9 L350.4 17.4 M350.9 15.9 L352.4 17.4 M352.9 15.4 L354.4 16.9 M354.9 15.4 L356.4 16.9 M356.9 15.4 L358.4 16.9 M358.9 15.4 L360.4 16.9 M360.9 14.8 L362.4 16.3 M362.9 14.8 L364.4 16.3 M364.9 14.8 L366.4 16.3 M366.9 14.8 L368.4 16.3 M368.9 14.2 L370.4 15.8 " stroke="#8a6f45" stroke-width=".5" fill="none" opacity=".8"/><g transform="translate(79.4 20.5) rotate(169)"><path d="M-1.7 1.1 L-4.6 10.8 L-1.8 11.7 L1.7 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.23 1.29 L-4.21 10.95" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.23 2.11 L-2.24 11.61" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.1 5.1 L-1.7 6.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.9 7.4 L-2.5 9.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L1.2 12.6 L4.1 11.9 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.01 L1.62 12.53" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.26 1.39 L3.63 12.03" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M0.9 5.4 L1.4 7.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.6 8.0 L2.0 9.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(123.9 21.9) rotate(-10)"><path d="M-1.6 1.1 L-4.4 9.5 L-1.6 10.5 L1.6 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.1 4.6 L-1.6 6.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.8 6.7 L-2.4 8.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L2.2 13.7 L5.0 12.9 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.2 5.8 L1.9 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.1 8.7 L2.8 10.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(366.0 15.6) rotate(12)"><path d="M-1.5 0.9 L-6.3 10.3 L-3.7 11.7 L1.5 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.8 5.0 L-2.7 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.0 7.3 L-3.9 9.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L3.1 11.7 L5.8 10.5 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.6 5.0 L2.4 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.7 7.3 L3.5 9.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(305.9 19.4) rotate(5)"><path d="M-1.6 0.9 L-5.7 10.3 L-3.0 11.5 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 1.14 L-5.31 10.46" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.17 2.26 L-3.44 11.35" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.5 4.9 L-2.3 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.6 7.2 L-3.4 8.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.6 12.5 L4.4 11.7 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 2.06 L1.99 12.37" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.25 1.34 L3.98 11.80" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.0 5.3 L1.6 7.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 7.9 L2.3 9.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(110.9 21.5) rotate(1)"><path d="M-1.6 1.1 L-5.0 11.4 L-2.2 12.4 L1.6 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 1.27 L-4.58 11.54" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.22 2.13 L-2.63 12.23" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-1.3 5.3 L-1.9 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.2 7.8 L-2.8 9.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L3.3 11.5 L5.9 10.1 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 2.29 L3.68 11.27" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.16 1.11 L5.53 10.33" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.6 4.9 L2.4 6.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.8 7.2 L3.6 8.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(283.8 20.5) rotate(183)"><path d="M-1.6 1.0 L-5.0 8.9 L-2.3 10.2 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.18 1.15 L-4.62 9.13" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.18 2.25 L-2.74 10.01" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.3 4.5 L-2.0 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.2 6.4 L-2.9 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L4.8 13.1 L7.3 11.7 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.13 2.34 L5.15 12.93" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.13 1.06 L6.95 11.91" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M2.1 5.5 L3.2 7.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.6 8.1 L4.7 10.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(83.6 20.8) rotate(26)"><path d="M-1.4 0.7 L-5.9 7.5 L-3.5 9.2 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.06 0.95 L-5.53 7.73" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.06 2.45 L-3.84 8.93" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.6 4.0 L-2.5 5.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.8 5.7 L-3.7 6.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.8 14.1 L6.5 12.9 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 2.22 L4.21 13.92" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.19 1.18 L6.11 13.09" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.8 5.8 L2.7 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.1 8.8 L4.0 10.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(30.2 18.2) rotate(192)"><path d="M-1.7 1.2 L-3.8 9.4 L-0.9 10.2 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 1.34 L-3.33 9.54" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.25 2.06 L-1.33 10.11" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-0.8 4.5 L-1.2 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.4 6.6 L-1.8 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L1.5 14.2 L4.4 13.5 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.01 L1.96 14.14" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.26 1.39 L3.97 13.65" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.0 6.0 L1.6 8.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 9.0 L2.3 11.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(323.4 18.6) rotate(11)"><path d="M-1.6 1.0 L-5.1 9.7 L-2.3 10.9 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.19 L-4.65 9.86" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.19 2.21 L-2.75 10.68" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.3 4.7 L-2.0 6.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.2 6.8 L-2.9 8.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.7 L5.1 12.3 L7.6 10.7 L1.5 0.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.09 2.41 L5.47 12.05" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.09 0.99 L7.21 10.92" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M2.2 5.1 L3.4 6.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.8 7.6 L4.9 9.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(159.2 22.4) rotate(10)"><path d="M-1.7 1.3 L-4.1 11.6 L-1.2 12.4 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 1.37 L-3.68 11.72" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.26 2.03 L-1.68 12.24" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-0.9 5.3 L-1.4 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 7.9 L-2.1 9.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L3.2 11.7 L5.9 10.4 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 2.27 L3.60 11.48" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.17 1.13 L5.47 10.58" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.6 5.0 L2.4 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.7 7.3 L3.5 9.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(-0.2 16.2) rotate(-9)"><path d="M-1.7 1.2 L-3.7 9.0 L-0.9 9.9 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-0.8 4.4 L-1.2 5.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.4 6.4 L-1.8 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L5.3 13.6 L7.8 12.1 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M2.3 5.6 L3.5 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.9 8.4 L5.1 10.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(275.0 20.8) rotate(-23)"><path d="M-1.6 0.9 L-5.9 10.5 L-3.3 11.8 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 1.13 L-5.53 10.68" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.17 2.27 L-3.67 11.59" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-1.6 5.0 L-2.4 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.8 7.4 L-3.6 9.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.4 12.2 L4.2 11.4 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 2.05 L1.82 12.09" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.25 1.35 L3.81 11.54" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.0 5.2 L1.5 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.7 7.8 L2.2 9.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(61.1 19.8) rotate(28)"><path d="M-1.6 0.9 L-5.0 8.2 L-2.4 9.6 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.15 1.11 L-4.62 8.43" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.15 2.29 L-2.78 9.38" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-1.3 4.2 L-2.0 5.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.2 6.0 L-2.9 7.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L2.2 14.5 L5.0 13.7 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 2.06 L2.60 14.38" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.25 1.34 L4.59 13.80" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.3 6.0 L1.9 8.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.2 9.1 L2.8 11.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(340.7 17.2) rotate(30)"><path d="M-1.7 1.2 L-4.1 9.9 L-1.3 10.8 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 1.32 L-3.67 10.07" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.24 2.08 L-1.69 10.68" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-0.9 4.7 L-1.4 6.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 6.9 L-2.1 8.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.3 13.3 L6.0 12.1 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.20 2.21 L3.70 13.08" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.20 1.19 L5.61 12.27" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.6 5.5 L2.5 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.8 8.3 L3.6 10.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(193.6 22.5) rotate(-6)"><path d="M-1.5 0.7 L-7.9 10.9 L-5.5 12.6 L1.5 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.08 0.98 L-7.55 11.17" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.08 2.42 L-5.83 12.32" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-2.3 5.2 L-3.5 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-4.0 7.7 L-5.2 9.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.5 L2.9 10.3 L5.6 8.9 L1.5 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.14 2.32 L3.34 10.05" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.14 1.08 L5.16 9.07" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.5 4.5 L2.3 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.6 6.4 L3.3 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(336.8 17.7) rotate(-7)"><path d="M-1.7 1.3 L-3.7 10.0 L-0.8 10.7 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 1.38 L-3.22 10.13" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.26 2.02 L-1.21 10.64" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-0.8 4.7 L-1.2 6.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.3 6.9 L-1.7 8.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L1.6 13.7 L4.5 13.0 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.03 L2.05 13.61" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.26 1.37 L4.05 13.09" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.1 5.8 L1.6 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 8.7 L2.4 10.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(332.7 17.7) rotate(174)"><path d="M-1.6 1.0 L-6.0 12.4 L-3.2 13.5 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.6 5.6 L-2.4 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.8 8.5 L-3.6 10.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.2 10.6 L4.0 9.7 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M0.9 4.7 L1.4 6.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.6 6.8 L2.0 8.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(301.8 19.4) rotate(21)"><path d="M-1.5 0.8 L-6.4 9.2 L-3.9 10.8 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.8 4.6 L-2.7 6.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.1 6.7 L-4.0 8.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L3.8 12.3 L6.5 11.0 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.8 5.2 L2.7 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.1 7.7 L4.0 9.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(223.9 22.1) rotate(6)"><path d="M-1.7 1.2 L-4.7 12.2 L-1.8 13.1 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 1.33 L-4.25 12.37" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.24 2.07 L-2.26 12.96" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-1.1 5.5 L-1.7 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.0 8.3 L-2.5 10.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.4 2.7 L4.2 10.4 L6.6 8.8 L1.4 0.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.07 2.43 L4.53 10.18" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.07 0.97 L6.25 9.02" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.9 4.5 L2.9 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.2 6.4 L4.2 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(361.7 15.6) rotate(158)"><path d="M-1.5 0.8 L-6.1 8.5 L-3.5 10.1 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.7 4.4 L-2.5 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.9 6.3 L-3.7 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L1.1 13.7 L4.0 13.1 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M0.9 5.8 L1.3 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.5 8.7 L2.0 10.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(88.1 20.8) rotate(22)"><path d="M-1.7 1.3 L-3.5 9.4 L-0.6 10.2 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 1.38 L-3.07 9.55" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.26 2.02 L-1.07 10.07" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-0.7 4.5 L-1.1 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.2 6.6 L-1.6 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L4.3 13.7 L7.0 12.3 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 2.28 L4.73 13.45" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.16 1.12 L6.58 12.53" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M2.0 5.7 L3.0 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.4 8.5 L4.4 10.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(163.7 22.5) rotate(-2)"><path d="M-1.5 0.9 L-5.2 8.0 L-2.6 9.5 L1.5 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.14 1.07 L-4.79 8.25" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.14 2.33 L-2.97 9.25" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.4 4.2 L-2.1 5.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.3 5.9 L-3.0 7.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L2.1 14.6 L4.9 13.8 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 2.05 L2.52 14.45" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.25 1.35 L4.51 13.89" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.2 6.1 L1.9 8.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.1 9.2 L2.7 11.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(279.2 20.5) rotate(-3)"><path d="M-1.6 0.9 L-7.0 12.3 L-4.3 13.7 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-2.0 5.7 L-3.0 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.4 8.5 L-4.4 10.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.7 L3.4 9.5 L5.9 7.8 L1.5 0.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.6 4.1 L2.5 5.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.8 5.9 L3.6 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(215.2 22.3) rotate(30)"><path d="M-1.6 0.9 L-6.9 12.0 L-4.3 13.3 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 1.11 L-6.53 12.19" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.16 2.29 L-4.69 13.14" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-2.0 5.5 L-3.0 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.4 8.3 L-4.4 10.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L2.5 10.1 L5.2 8.8 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 2.27 L2.92 9.94" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.16 1.13 L4.77 9.02" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.3 4.4 L2.0 5.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.3 6.4 L3.0 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(236.3 21.9) rotate(150)"><path d="M-1.5 0.8 L-7.5 11.9 L-5.0 13.3 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.13 1.05 L-7.16 12.09" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.13 2.35 L-5.36 13.12" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-2.2 5.5 L-3.3 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.8 8.2 L-4.9 10.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.1 10.2 L3.9 9.3 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 2.09 L1.52 10.05" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.24 1.31 L3.50 9.44" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M0.9 4.5 L1.3 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.5 6.5 L2.0 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(51.8 19.4) rotate(171)"><path d="M-1.6 1.1 L-5.2 11.2 L-2.4 12.2 L1.6 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.21 1.24 L-4.78 11.32" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.21 2.16 L-2.84 12.06" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.3 5.2 L-2.0 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.3 7.7 L-3.0 9.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L3.1 11.6 L5.8 10.3 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 2.26 L3.53 11.44" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.17 1.14 L5.39 10.54" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.6 5.0 L2.4 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.7 7.3 L3.5 8.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(240.3 21.7) rotate(185)"><path d="M-1.6 1.0 L-5.2 10.0 L-2.5 11.2 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.3 4.8 L-2.0 6.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.3 7.0 L-3.0 8.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.4 2.7 L5.4 11.7 L7.8 10.0 L1.4 0.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M2.3 4.9 L3.5 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M4.0 7.2 L5.1 8.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(266.5 21.0) rotate(190)"><path d="M-1.4 0.7 L-6.6 8.5 L-4.2 10.2 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.06 0.95 L-6.22 8.76" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.06 2.45 L-4.53 9.95" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.9 4.4 L-2.8 5.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.2 6.3 L-4.2 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.5 L4.3 12.6 L6.9 11.2 L1.5 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.14 2.33 L4.71 12.40" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.14 1.07 L6.52 11.40" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M2.0 5.3 L3.0 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.4 7.8 L4.4 9.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(155.0 22.4) rotate(2)"><path d="M-1.4 0.7 L-7.0 8.9 L-4.6 10.6 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-2.0 4.5 L-3.1 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.5 6.5 L-4.6 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L2.5 12.6 L5.3 11.5 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.4 5.3 L2.1 7.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.3 7.9 L3.0 9.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(132.7 22.1) rotate(148)"><path d="M-1.5 0.8 L-6.8 10.6 L-4.2 12.1 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.13 1.06 L-6.40 10.81" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.13 2.34 L-4.60 11.84" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-1.9 5.1 L-2.9 6.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.3 7.5 L-4.3 9.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L3.6 11.0 L6.2 9.6 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.13 2.35 L4.04 10.82" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.13 1.05 L5.83 9.79" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.7 4.7 L2.6 6.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.0 6.9 L3.8 8.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(115.3 21.7) rotate(6)"><path d="M-1.7 1.2 L-3.9 8.9 L-1.1 9.8 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.23 1.29 L-3.49 9.01" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.23 2.11 L-1.53 9.66" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-0.9 4.4 L-1.3 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 6.3 L-2.0 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L5.1 13.7 L7.7 12.3 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.13 2.34 L5.46 13.51" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.13 1.06 L7.26 12.49" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M2.2 5.7 L3.4 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.8 8.5 L5.0 10.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(106.2 21.5) rotate(0)"><path d="M-1.4 0.7 L-7.6 9.6 L-5.2 11.4 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.05 0.94 L-7.19 9.88" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.05 2.46 L-5.52 11.09" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-2.2 4.8 L-3.4 6.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.8 7.0 L-5.0 8.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L2.2 11.7 L5.0 10.7 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.21 2.16 L2.62 11.57" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.21 1.24 L4.56 10.84" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.3 5.0 L1.9 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.2 7.4 L2.8 9.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(38.8 18.6) rotate(1)"><path d="M-1.6 1.1 L-6.0 13.1 L-3.3 14.2 L1.6 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.21 1.23 L-5.61 13.25" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.21 2.17 L-3.68 14.00" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.6 5.9 L-2.5 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.8 8.9 L-3.6 11.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L0.5 10.0 L3.4 9.3 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.00 L0.90 9.92" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.26 1.40 L2.92 9.44" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M0.7 4.5 L1.0 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.1 6.5 L1.5 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(136.6 22.1) rotate(-8)"><path d="M-1.7 1.3 L-4.0 12.1 L-1.1 12.8 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 1.40 L-3.57 12.22" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.26 2.00 L-1.56 12.70" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-0.9 5.5 L-1.4 7.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 8.2 L-2.0 10.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L0.8 11.7 L3.7 11.0 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.00 L1.28 11.61" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.26 1.40 L3.30 11.13" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M0.8 5.1 L1.2 6.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.4 7.5 L1.8 9.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(141.0 22.2) rotate(-27)"><path d="M-1.5 0.9 L-5.7 9.3 L-3.1 10.7 L1.5 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.15 1.10 L-5.30 9.56" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.15 2.30 L-3.47 10.52" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.5 4.6 L-2.3 6.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.6 6.7 L-3.4 8.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.1 13.0 L5.8 11.8 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.20 2.20 L3.48 12.79" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.20 1.20 L5.40 12.00" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.6 5.4 L2.4 7.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.7 8.1 L3.5 10.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(244.3 21.7) rotate(186)"><path d="M-1.6 0.9 L-6.6 11.7 L-3.9 13.0 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 1.13 L-6.15 11.91" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.17 2.27 L-4.29 12.82" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.8 5.4 L-2.8 7.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.1 8.1 L-4.1 10.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L1.9 10.8 L4.6 9.7 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.21 2.16 L2.27 10.60" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.21 1.24 L4.21 9.86" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.1 4.7 L1.7 6.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.9 6.8 L2.5 8.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(92.8 21.0) rotate(-3)"><path d="M-1.7 1.3 L-4.1 12.8 L-1.2 13.5 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 1.40 L-3.69 12.90" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.26 2.00 L-1.68 13.38" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-0.9 5.7 L-1.4 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 8.6 L-2.1 10.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L0.5 11.1 L3.4 10.4 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.27 1.98 L0.95 10.96" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.27 1.42 L2.98 10.52" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M0.7 4.9 L1.0 6.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.2 7.1 L1.5 8.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(314.1 19.0) rotate(25)"><path d="M-1.7 1.2 L-5.4 13.5 L-2.5 14.4 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 1.30 L-4.94 13.65" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.24 2.10 L-2.96 14.28" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.4 6.0 L-2.1 8.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.4 9.1 L-3.1 11.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L1.9 9.7 L4.6 8.6 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 2.22 L2.28 9.56" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.19 1.18 L4.18 8.73" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.1 4.3 L1.7 5.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.9 6.2 L2.5 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(56.4 19.4) rotate(-1)"><path d="M-1.6 0.9 L-6.7 11.9 L-4.1 13.2 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 1.12 L-6.32 12.06" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.16 2.28 L-4.47 12.99" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.9 5.5 L-2.9 7.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.2 8.2 L-4.2 10.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.7 L3.6 10.0 L6.1 8.3 L1.5 0.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.09 2.41 L4.01 9.71" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.09 0.99 L5.75 8.58" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.7 4.3 L2.6 5.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.9 6.2 L3.8 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(202.0 22.4) rotate(-9)"><path d="M-1.7 1.2 L-4.1 10.7 L-1.2 11.5 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 1.35 L-3.65 10.83" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.25 2.05 L-1.65 11.39" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-0.9 5.0 L-1.4 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 7.3 L-2.1 9.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L3.8 12.4 L6.5 11.0 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.15 2.29 L4.22 12.15" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.15 1.11 L6.06 11.20" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.8 5.2 L2.7 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.1 7.7 L4.0 9.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(318.8 18.6) rotate(179)"><path d="M-1.6 1.0 L-5.5 11.3 L-2.7 12.4 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.4 5.2 L-2.2 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.5 7.8 L-3.2 9.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.6 11.8 L4.4 10.9 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.1 5.1 L1.6 6.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 7.5 L2.3 9.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(249.0 21.5) rotate(171)"><path d="M-1.6 1.0 L-4.8 9.0 L-2.1 10.2 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.18 L-4.40 9.20" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.19 2.22 L-2.50 10.02" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-1.2 4.5 L-1.8 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.1 6.4 L-2.7 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.7 13.6 L6.4 12.4 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 2.23 L4.07 13.43" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.19 1.17 L5.96 12.59" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.8 5.7 L2.7 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.0 8.5 L3.9 10.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(210.8 22.3) rotate(3)"><path d="M-1.5 0.9 L-5.8 9.2 L-3.1 10.6 L1.5 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.14 1.08 L-5.36 9.43" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.14 2.32 L-3.54 10.41" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.6 4.6 L-2.4 6.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.7 6.6 L-3.5 8.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.1 13.0 L5.8 11.9 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.20 2.20 L3.49 12.86" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.20 1.20 L5.41 12.07" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.6 5.5 L2.4 7.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.7 8.2 L3.5 10.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(-4.0 15.6) rotate(151)"><path d="M-1.4 0.7 L-6.6 8.4 L-4.2 10.1 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.06 0.95 L-6.21 8.62" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.06 2.45 L-4.52 9.82" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-1.9 4.3 L-2.8 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.2 6.2 L-4.2 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L1.4 13.5 L4.3 12.8 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.01 L1.85 13.37" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.26 1.39 L3.86 12.86" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.0 5.7 L1.5 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.7 8.5 L2.2 10.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(43.6 18.6) rotate(200)"><path d="M-1.7 1.3 L-3.3 9.3 L-0.4 9.9 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.27 1.41 L-2.82 9.38" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.27 1.99 L-0.80 9.84" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-0.6 4.5 L-1.0 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.1 6.4 L-1.4 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L5.3 13.5 L7.8 12.0 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.12 2.36 L5.68 13.31" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.12 1.04 L7.46 12.26" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M2.3 5.6 L3.5 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.9 8.4 L5.1 10.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(65.6 19.8) rotate(211)"><path d="M-1.4 0.7 L-6.5 8.3 L-4.1 10.0 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.06 0.95 L-6.17 8.55" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.06 2.45 L-4.49 9.76" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.9 4.3 L-2.8 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.2 6.2 L-4.2 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.5 13.1 L6.2 11.9 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.18 2.24 L3.94 12.91" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.18 1.16 L5.83 12.05" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.7 5.5 L2.6 7.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.9 8.2 L3.8 10.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(288.5 20.1) rotate(154)"><path d="M-1.5 0.8 L-7.7 11.5 L-5.1 13.0 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.11 1.03 L-7.30 11.73" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.11 2.37 L-5.53 12.81" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-2.2 5.4 L-3.4 7.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.8 8.0 L-5.0 9.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L2.3 10.1 L5.0 8.9 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 2.25 L2.75 9.95" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.17 1.15 L4.62 9.07" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.3 4.4 L2.0 5.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.2 6.4 L2.9 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(219.9 22.2) rotate(186)"><path d="M-1.7 1.2 L-4.6 10.8 L-1.7 11.8 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.23 1.29 L-4.14 10.99" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.23 2.11 L-2.18 11.64" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.1 5.1 L-1.7 6.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.9 7.5 L-2.5 9.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.7 12.6 L4.5 11.7 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 2.07 L2.11 12.43" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.24 1.33 L4.09 11.83" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.1 5.4 L1.6 7.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.9 8.0 L2.4 9.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(47.5 19.0) rotate(-23)"><path d="M-1.7 1.2 L-4.9 12.9 L-2.0 13.8 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 1.33 L-4.42 13.06" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.25 2.07 L-2.44 13.64" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.2 5.8 L-1.8 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.1 8.7 L-2.7 10.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L1.7 10.5 L4.5 9.5 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 2.15 L2.10 10.37" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.22 1.25 L4.05 9.65" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.1 4.6 L1.6 6.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 6.7 L2.4 8.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(197.9 22.5) rotate(159)"><path d="M-1.6 1.0 L-5.7 11.0 L-3.0 12.2 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.18 L-5.29 11.20" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.19 2.22 L-3.39 12.03" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-1.5 5.2 L-2.3 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.6 7.6 L-3.4 9.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L2.0 11.8 L4.8 10.8 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 2.13 L2.43 11.64" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.22 1.27 L4.38 10.94" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.2 5.1 L1.8 6.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.0 7.5 L2.7 9.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(349.1 16.7) rotate(168)"><path d="M-1.6 0.9 L-6.9 12.3 L-4.3 13.6 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 1.12 L-6.53 12.49" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.16 2.28 L-4.68 13.41" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-2.0 5.6 L-3.0 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.4 8.5 L-4.4 10.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L1.4 10.1 L4.2 9.2 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 2.13 L1.81 10.00" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.22 1.27 L3.77 9.31" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.0 4.5 L1.5 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.7 6.5 L2.2 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(97.4 21.0) rotate(185)"><path d="M-1.6 1.1 L-4.5 9.3 L-1.7 10.4 L1.6 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 1.24 L-4.03 9.48" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.22 2.16 L-2.09 10.21" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.1 4.6 L-1.6 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.8 6.6 L-2.4 8.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.3 L2.5 13.8 L5.3 12.9 L1.7 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.23 2.11 L2.94 13.69" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.23 1.29 L4.90 13.03" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.4 5.8 L2.1 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.4 8.7 L3.1 10.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(309.8 19.0) rotate(-4)"><path d="M-1.5 0.7 L-7.3 10.0 L-4.8 11.7 L1.5 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.08 0.98 L-6.95 10.26" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.08 2.42 L-5.22 11.41" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-2.1 4.9 L-3.2 6.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.7 7.2 L-4.7 8.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L1.9 11.6 L4.7 10.7 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 2.13 L2.37 11.49" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.22 1.27 L4.32 10.80" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.2 5.0 L1.8 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.0 7.4 L2.6 9.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(253.5 21.5) rotate(187)"><path d="M-1.6 1.1 L-4.9 10.1 L-2.1 11.2 L1.6 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.21 1.22 L-4.49 10.23" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.21 2.18 L-2.56 10.99" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.2 4.8 L-1.9 6.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.1 7.0 L-2.7 8.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L1.2 13.1 L4.1 12.5 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.00 L1.67 13.04" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.26 1.40 L3.69 12.56" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M0.9 5.6 L1.4 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.6 8.4 L2.1 10.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(357.3 16.2) rotate(150)"><path d="M-1.6 0.9 L-6.3 11.3 L-3.7 12.6 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 1.13 L-5.93 11.48" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.17 2.27 L-4.07 12.39" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-1.8 5.3 L-2.7 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.0 7.8 L-3.9 9.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.4 11.3 L4.2 10.5 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 2.08 L1.80 11.19" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.24 1.32 L3.78 10.59" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.0 4.9 L1.5 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.7 7.2 L2.2 8.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(293.2 19.8) rotate(7)"><path d="M-1.6 0.9 L-6.6 12.1 L-3.9 13.3 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 1.14 L-6.19 12.26" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.17 2.26 L-4.32 13.15" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-1.8 5.6 L-2.8 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.2 8.3 L-4.1 10.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L3.4 10.0 L5.9 8.4 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.10 2.38 L3.75 9.73" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.10 1.02 L5.52 8.64" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.6 4.3 L2.5 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.8 6.2 L3.6 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(271.0 20.8) rotate(9)"><path d="M-1.7 1.3 L-3.6 10.2 L-0.7 10.9 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 1.40 L-3.11 10.31" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.26 2.00 L-1.10 10.79" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-0.7 4.8 L-1.1 6.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.3 7.0 L-1.6 8.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L5.1 12.6 L7.6 11.0 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.10 2.39 L5.47 12.33" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.10 1.01 L7.22 11.22" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M2.2 5.2 L3.4 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.8 7.7 L4.9 9.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(21.4 17.7) rotate(4)"><path d="M-1.6 1.0 L-4.9 8.6 L-2.2 9.8 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.18 1.15 L-4.46 8.78" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.18 2.25 L-2.59 9.66" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.2 4.3 L-1.9 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.1 6.2 L-2.7 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L2.3 14.3 L5.2 13.4 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 2.08 L2.74 14.14" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.24 1.32 L4.72 13.53" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.3 5.9 L2.0 8.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.2 9.0 L2.9 11.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(119.7 21.7) rotate(-29)"><path d="M-1.6 0.9 L-5.2 8.5 L-2.5 9.9 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.3 4.3 L-2.0 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.3 6.2 L-3.0 7.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.6 L5.5 13.1 L8.0 11.5 L1.5 0.8Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M2.4 5.4 L3.6 7.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M4.1 8.1 L5.3 10.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(25.9 17.7) rotate(-2)"><path d="M-1.5 0.7 L-7.0 9.6 L-4.6 11.2 L1.5 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.08 0.98 L-6.67 9.80" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.08 2.42 L-4.95 10.96" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-2.0 4.7 L-3.1 6.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.5 6.9 L-4.5 8.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.5 L3.6 11.7 L6.2 10.3 L1.5 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.15 2.31 L4.02 11.51" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.15 1.09 L5.85 10.55" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.7 5.0 L2.6 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.0 7.3 L3.9 9.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(185.4 22.5) rotate(-4)"><path d="M-1.6 1.0 L-6.0 11.5 L-3.2 12.7 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.18 L-5.54 11.68" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.19 2.22 L-3.65 12.52" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.6 5.3 L-2.4 7.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.8 7.9 L-3.6 9.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L2.4 11.1 L5.1 10.0 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 2.21 L2.83 10.97" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.19 1.19 L4.73 10.15" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.3 4.8 L2.0 6.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.3 7.0 L2.9 8.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(297.4 19.8) rotate(25)"><path d="M-1.5 0.8 L-7.3 10.5 L-4.8 12.1 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.09 1.00 L-6.96 10.71" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.09 2.40 L-5.22 11.82" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-2.1 5.0 L-3.2 6.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.7 7.4 L-4.8 9.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.3 11.4 L4.2 10.5 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 2.07 L1.78 11.25" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.24 1.33 L3.76 10.66" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.0 4.9 L1.5 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.7 7.3 L2.2 8.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(227.8 22.1) rotate(-31)"><path d="M-1.5 0.9 L-6.5 10.3 L-3.9 11.7 L1.5 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.13 1.07 L-6.06 10.48" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.13 2.33 L-4.25 11.49" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.8 4.9 L-2.7 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.1 7.3 L-4.0 8.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.6 12.1 L4.4 11.2 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 2.07 L2.00 11.94" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.24 1.33 L3.98 11.34" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.0 5.2 L1.6 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 7.7 L2.3 9.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(74.7 20.5) rotate(190)"><path d="M-1.6 0.9 L-5.3 8.8 L-2.7 10.2 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.15 1.11 L-4.95 9.05" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.15 2.29 L-3.11 10.00" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.4 4.4 L-2.1 5.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.4 6.4 L-3.1 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L2.7 13.7 L5.5 12.7 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 2.14 L3.11 13.54" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.22 1.26 L5.07 12.85" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.4 5.7 L2.2 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.5 8.6 L3.2 10.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(128.3 21.9) rotate(154)"><path d="M-1.6 1.0 L-6.3 12.5 L-3.6 13.7 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.19 L-5.88 12.72" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.19 2.21 L-3.97 13.54" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.7 5.7 L-2.6 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.0 8.6 L-3.8 10.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.3 L1.3 10.3 L4.1 9.3 L1.7 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.23 2.11 L1.73 10.14" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.23 1.29 L3.69 9.49" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M0.9 4.5 L1.4 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.6 6.6 L2.1 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(145.8 22.3) rotate(187)"><path d="M-1.6 1.0 L-4.6 8.8 L-1.9 9.9 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.19 L-4.20 8.93" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.19 2.21 L-2.29 9.74" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.1 4.4 L-1.7 5.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.9 6.3 L-2.5 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.4 14.0 L6.1 12.9 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.20 2.19 L3.80 13.87" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.20 1.21 L5.72 13.09" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.7 5.8 L2.5 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.9 8.8 L3.7 10.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(8.4 16.7) rotate(22)"><path d="M-1.6 0.9 L-6.2 10.8 L-3.5 12.2 L1.6 2.5Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 1.12 L-5.79 11.04" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.16 2.28 L-3.94 11.96" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.7 5.1 L-2.6 6.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.9 7.6 L-3.8 9.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L2.8 11.5 L5.5 10.2 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.18 2.24 L3.26 11.27" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.18 1.16 L5.14 10.40" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.5 4.9 L2.2 6.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.5 7.2 L3.3 8.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(101.6 21.3) rotate(31)"><path d="M-1.4 0.7 L-8.3 11.2 L-5.9 12.9 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.07 0.96 L-7.97 11.47" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.07 2.44 L-6.27 12.65" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-2.5 5.3 L-3.8 7.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-4.3 7.9 L-5.6 9.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L1.6 10.1 L4.4 9.0 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.21 2.16 L2.05 9.94" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.21 1.24 L3.98 9.20" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.1 4.5 L1.6 5.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 6.4 L2.4 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(262.4 21.0) rotate(8)"><path d="M-1.4 0.7 L-7.0 9.1 L-4.5 10.8 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.06 0.96 L-6.58 9.31" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.06 2.44 L-4.88 10.50" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-2.0 4.6 L-3.0 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.4 6.6 L-4.5 8.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L2.4 12.5 L5.2 11.5 L1.6 1.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.22 2.15 L2.81 12.37" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.22 1.25 L4.76 11.66" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.3 5.3 L2.0 7.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.3 7.9 L3.0 9.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(231.9 21.9) rotate(180)"><path d="M-1.4 0.7 L-5.9 7.6 L-3.5 9.3 L1.4 2.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.07 0.96 L-5.54 7.87" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.07 2.44 L-3.84 9.05" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.6 4.1 L-2.5 5.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.8 5.8 L-3.7 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L2.3 14.4 L5.1 13.5 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 2.07 L2.69 14.23" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.24 1.33 L4.68 13.63" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.3 6.0 L2.0 8.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.2 9.0 L2.9 11.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(70.1 20.1) rotate(7)"><path d="M-1.7 1.3 L-4.2 13.0 L-1.3 13.7 L1.7 2.1Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 1.40 L-3.78 13.09" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.26 2.00 L-1.76 13.56" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.0 5.8 L-1.5 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 8.7 L-2.2 10.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L0.7 10.8 L3.6 10.1 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.01 L1.16 10.74" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.26 1.39 L3.17 10.24" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M0.8 4.8 L1.1 6.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.3 7.0 L1.7 8.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(3.7 16.2) rotate(10)"><path d="M-1.6 1.0 L-4.8 9.7 L-2.1 10.8 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.2 4.7 L-1.8 6.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.1 6.8 L-2.7 8.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.6 13.5 L4.5 12.7 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.1 5.7 L1.6 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.8 8.5 L2.4 10.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(168.1 22.5) rotate(-22)"><path d="M-1.7 1.2 L-4.6 13.0 L-1.7 13.7 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 1.36 L-4.15 13.07" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.25 2.04 L-2.15 13.61" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M-1.1 5.8 L-1.7 7.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.9 8.7 L-2.5 10.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L1.4 10.7 L4.2 9.7 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.23 2.11 L1.81 10.51" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.23 1.29 L3.78 9.87" stroke="#d9a520" stroke-width=".55" opacity=".95"/><path d="M1.0 4.7 L1.5 6.2" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.7 6.8 L2.2 8.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(206.5 22.4) rotate(22)"><path d="M-1.5 0.8 L-5.5 7.7 L-2.9 9.3 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.10 1.02 L-5.08 7.95" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.10 2.38 L-3.32 9.04" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M-1.5 4.1 L-2.2 5.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.5 5.8 L-3.3 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.2 L2.1 14.6 L4.9 13.8 L1.7 1.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 2.05 L2.52 14.51" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.25 1.35 L4.52 13.95" stroke="#2f5aa8" stroke-width=".55" opacity=".95"/><path d="M1.2 6.1 L1.9 8.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.1 9.2 L2.7 11.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(327.9 18.2) rotate(-23)"><path d="M-1.6 1.0 L-4.7 8.9 L-2.0 10.1 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.18 L-4.33 9.05" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.19 2.22 L-2.43 9.88" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.2 4.4 L-1.8 5.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.0 6.4 L-2.6 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.9 13.7 L6.6 12.5 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.18 2.24 L4.31 13.51" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.18 1.16 L6.19 12.65" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.8 5.7 L2.8 7.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.1 8.5 L4.1 10.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(345.0 17.2) rotate(189)"><path d="M-1.6 1.0 L-5.9 12.2 L-3.1 13.3 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.20 1.21 L-5.44 12.40" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.20 2.19 L-3.52 13.18" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-1.6 5.6 L-2.4 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.7 8.4 L-3.5 10.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L0.7 10.8 L3.6 10.1 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.26 2.01 L1.18 10.72" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.26 1.39 L3.19 10.22" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M0.8 4.8 L1.2 6.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.3 7.0 L1.7 8.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(17.6 17.2) rotate(179)"><path d="M-1.6 1.0 L-5.4 10.3 L-2.7 11.5 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.4 4.9 L-2.2 6.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.4 7.2 L-3.2 8.9" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.7 2.1 L1.1 12.7 L4.0 12.0 L1.7 1.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M0.9 5.4 L1.3 7.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M1.5 8.1 L2.0 10.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(150.5 22.3) rotate(159)"><path d="M-1.5 0.8 L-6.3 10.0 L-3.7 11.4 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.13 1.07 L-5.94 10.22" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.13 2.33 L-4.13 11.23" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-1.8 4.9 L-2.7 6.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.0 7.1 L-3.9 8.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L3.6 11.9 L6.2 10.5 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.15 2.30 L3.98 11.65" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.15 1.10 L5.82 10.70" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.7 5.0 L2.6 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.9 7.4 L3.8 9.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(12.9 16.7) rotate(-28)"><path d="M-1.7 1.2 L-4.5 12.8 L-1.6 13.6 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.25 1.37 L-4.07 12.96" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.25 2.03 L-2.07 13.50" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M-1.1 5.7 L-1.6 7.8" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.8 8.6 L-2.4 10.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L2.5 10.5 L5.2 9.3 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.17 2.25 L2.94 10.34" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.17 1.15 L4.81 9.45" stroke="#2a2626" stroke-width=".55" opacity=".95"/><path d="M1.4 4.6 L2.1 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.3 6.6 L3.0 8.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(34.7 18.2) rotate(185)"><path d="M-1.6 1.0 L-5.6 11.1 L-2.9 12.2 L1.6 2.4Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 1.19 L-5.18 11.26" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.19 2.21 L-3.27 12.07" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.5 5.2 L-2.2 7.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.5 7.7 L-3.3 9.5" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.4 2.7 L4.7 10.8 L7.2 9.1 L1.4 0.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.05 2.46 L5.10 10.56" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.05 0.94 L6.79 9.35" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M2.1 4.6 L3.2 6.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.6 6.7 L4.6 8.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(189.2 22.5) rotate(-7)"><path d="M-1.6 1.1 L-4.8 10.0 L-2.0 11.0 L1.6 2.3Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.21 1.23 L-4.35 10.14" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.21 2.17 L-2.42 10.89" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M-1.2 4.8 L-1.8 6.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.0 7.0 L-2.6 8.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.4 L3.2 12.9 L5.9 11.8 L1.6 1.0Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.19 2.21 L3.57 12.74" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.19 1.19 L5.48 11.93" stroke="#b8892a" stroke-width=".55" opacity=".95"/><path d="M1.6 5.4 L2.4 7.3" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.7 8.1 L3.5 10.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(257.7 21.3) rotate(6)"><path d="M-1.7 1.2 L-3.8 9.3 L-1.0 10.2 L1.7 2.2Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.24 1.33 L-3.39 9.48" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.24 2.07 L-1.40 10.06" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M-0.8 4.5 L-1.3 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.4 6.5 L-1.9 8.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.5 L4.4 13.6 L7.0 12.2 L1.6 0.9Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.16 2.29 L4.78 13.38" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M1.16 1.11 L6.63 12.44" stroke="#c0392b" stroke-width=".55" opacity=".95"/><path d="M2.0 5.6 L3.0 7.6" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.4 8.4 L4.4 10.4" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(353.1 16.7) rotate(-27)"><path d="M-1.5 0.8 L-6.4 9.1 L-3.8 10.7 L1.5 2.6Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.8 4.6 L-2.7 6.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-3.1 6.6 L-4.0 8.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.5 2.7 L5.1 12.0 L7.5 10.3 L1.5 0.7Z" fill="url(#pw)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M2.2 5.0 L3.3 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M3.8 7.4 L4.9 9.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(79.4 20.5) rotate(169)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(123.9 21.9) rotate(-10)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(366.0 15.6) rotate(12)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(305.9 19.4) rotate(5)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(110.9 21.5) rotate(1)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(283.8 20.5) rotate(183)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(83.6 20.8) rotate(26)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(30.2 18.2) rotate(192)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(323.4 18.6) rotate(11)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(159.2 22.4) rotate(10)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(-0.2 16.2) rotate(-9)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(275.0 20.8) rotate(-23)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(61.1 19.8) rotate(28)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(340.7 17.2) rotate(30)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(193.6 22.5) rotate(-6)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(336.8 17.7) rotate(-7)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(332.7 17.7) rotate(174)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(301.8 19.4) rotate(21)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(223.9 22.1) rotate(6)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(361.7 15.6) rotate(158)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(88.1 20.8) rotate(22)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(163.7 22.5) rotate(-2)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(279.2 20.5) rotate(-3)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(215.2 22.3) rotate(30)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(236.3 21.9) rotate(150)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(51.8 19.4) rotate(171)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(240.3 21.7) rotate(185)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(266.5 21.0) rotate(190)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(155.0 22.4) rotate(2)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(132.7 22.1) rotate(148)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(115.3 21.7) rotate(6)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(106.2 21.5) rotate(0)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(38.8 18.6) rotate(1)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(136.6 22.1) rotate(-8)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(141.0 22.2) rotate(-27)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(244.3 21.7) rotate(186)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(92.8 21.0) rotate(-3)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(314.1 19.0) rotate(25)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(56.4 19.4) rotate(-1)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(202.0 22.4) rotate(-9)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(318.8 18.6) rotate(179)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(249.0 21.5) rotate(171)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(210.8 22.3) rotate(3)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(-4.0 15.6) rotate(151)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(43.6 18.6) rotate(200)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(65.6 19.8) rotate(211)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(288.5 20.1) rotate(154)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(219.9 22.2) rotate(186)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(47.5 19.0) rotate(-23)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(197.9 22.5) rotate(159)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(349.1 16.7) rotate(168)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(97.4 21.0) rotate(185)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(309.8 19.0) rotate(-4)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(253.5 21.5) rotate(187)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(357.3 16.2) rotate(150)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(293.2 19.8) rotate(7)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(271.0 20.8) rotate(9)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(21.4 17.7) rotate(4)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(119.7 21.7) rotate(-29)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(25.9 17.7) rotate(-2)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(185.4 22.5) rotate(-4)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(297.4 19.8) rotate(25)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(227.8 22.1) rotate(-31)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(74.7 20.5) rotate(190)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(128.3 21.9) rotate(154)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(145.8 22.3) rotate(187)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(8.4 16.7) rotate(22)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(101.6 21.3) rotate(31)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(262.4 21.0) rotate(8)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(231.9 21.9) rotate(180)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(70.1 20.1) rotate(7)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(3.7 16.2) rotate(10)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(168.1 22.5) rotate(-22)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#d9a520" stroke-width=".4" opacity=".85"/></g><g transform="translate(206.5 22.4) rotate(22)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2f5aa8" stroke-width=".4" opacity=".85"/></g><g transform="translate(327.9 18.2) rotate(-23)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(345.0 17.2) rotate(189)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(17.6 17.2) rotate(179)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g transform="translate(150.5 22.3) rotate(159)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(12.9 16.7) rotate(-28)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#2a2626" stroke-width=".4" opacity=".85"/></g><g transform="translate(34.7 18.2) rotate(185)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(189.2 22.5) rotate(-7)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#b8892a" stroke-width=".4" opacity=".85"/></g><g transform="translate(257.7 21.3) rotate(6)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/><path d="M-1.90 -0.55 L0.84 -1.10" stroke="#c0392b" stroke-width=".4" opacity=".85"/></g><g transform="translate(353.1 16.7) rotate(-27)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pws)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pw)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g><g class="omk-knot-g"><g transform="translate(177.0 22.5) rotate(6)"><path d="M-1.6 1.0 L-5.5 11.3 L-2.7 12.5 L1.6 2.4Z" fill="url(#pg)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M-1.4 5.3 L-2.2 7.1" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-2.5 7.8 L-3.2 9.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M-1.6 2.3 L2.0 11.6 L4.8 10.6 L1.6 1.1Z" fill="url(#pg)" stroke="rgba(120,100,70,.45)" stroke-width=".35"/><path d="M1.2 5.0 L1.8 6.7" stroke="rgba(90,70,60,.35)" stroke-width=".45"/><path d="M2.1 7.3 L2.7 9.0" stroke="rgba(90,70,60,.35)" stroke-width=".45"/></g><g transform="translate(177.0 22.5) rotate(6)"><ellipse cx=".2" cy="1.90" rx="2.36" ry="1.2" fill="rgba(40,25,15,.35)"/><path d="M-2.28 0.50 C-2.36 -2.10 2.36 -2.10 2.28 0.50 C2.20 2.90 -2.20 2.90 -2.28 0.50Z" fill="url(#pgs)" stroke="rgba(110,90,60,.55)" stroke-width=".4"/><path d="M-2.09 -0.80 L0.95 -1.40 L2.28 1.40 L-0.76 2.10Z" fill="url(#pg)" stroke="rgba(110,90,60,.55)" stroke-width=".35"/><path d="M-1.71 0.15 Q0.19 0.40 1.71 0.60" stroke="rgba(110,90,60,.45)" stroke-width=".35" fill="none"/></g></g></g></svg>' +
            '</div>';
    }

    // ---------------- 6. 御朱印帳: every slip you have drawn, a page each ----------------
    function omkDateLabel(k) { var p = k.split('-'); return (+p[1]) + '月' + (+p[2]) + '日'; }
    function omkBookHtml() {
        var days = omkData().days, keys = Object.keys(days).sort().reverse().slice(0, 60);
        if (!keys.length) return '';
        return '<div class="omk-book" role="list">' + keys.map(function(k) {
            var e = days[k], bad = OMK_TIER[e.r] === 'bad', word = OMK_WORDS[(e.w || 0) % OMK_WORDS.length];
            return '<button class="omk-page" role="listitem" data-key="' + k + '" aria-label="' + omkDateLabel(k) + 'のおみくじ ' + e.r + '">' +
                '<span class="omk-page-date">' + omkDateLabel(k) + '</span>' +
                // the same 運勢 stamp as printed on that day's slip: same ink, same texture, same tilt, just small
                (function() { var srnd = omkRand(omkHash(omkData().salt + k + '|stamp')), seed = 1 + Math.floor(srnd() * 900); srnd(); var tilt = ((srnd() * 2 - 1) * 2.5).toFixed(2);
                    return '<span class="omk-page-rank" style="--tilt:' + tilt + 'deg">' + omkStampSvg(e.r.split(''), true, bad ? '#3a3533' : '#d0342c', 'b' + k.replace(/-/g, ''), seed, 'rank') + '</span>'; })() +
                '<span class="omk-page-no">第' + omkKanjiNum(e.n) + '番</span>' +
                '<span class="omk-page-word">' + escapeHtml(word[0]) + '</span>' +
                (e.kept ? '<span class="omk-page-oma" title="' + (OMK_OMA_RARE[e.omaR] ? OMK_OMA_RARE[e.omaR].name : 'お守り') + '">' + omkOmamoriSvg(17, e.s === 'jlpt' ? '合格守' : '学業守', e.oma || omkOmaKind(k), e.omaR) + '</span>' : e.tied ? '<span class="omk-page-mark tied" title="木に結びました">' + omkStampSvg(['結'], true, '#b8312f', 'yb' + k.replace(/-/g, ''), 1 + (omkHash(k + '|yui') % 900), 'seal') + '</span>' : '') +
            '</button>';
        }).join('') + '</div>';
    }
    // tap a page: that day's slip again (to read; nothing to do with it)
    document.addEventListener('click', function(ev) {
        var pg = ev.target.closest && ev.target.closest('.omk-page');
        if (!pg) return;
        if (ev.target.closest('.omk-page-oma')) { var ke = omkData().days[pg.dataset.key]; if (ke && ke.kept) { omkOpen3D(ke, pg.dataset.key); return; } }
        var k = pg.dataset.key, e = omkData().days[k];
        if (e) openOmikuji(k);
    });
    // The slip's text, rebuilt the same way from the day's seed every time it is shown
    // ---- 判子の印影: a stamp impression drawn as SVG. The filter roughens the edges, leaves a few specks where
    //      the ink did not take, and makes the pressure a little uneven, the way a real 朱肉 stamp looks. ----
    function omkInkFilter(id, seed, soft) {
        return '<filter id="' + id + '" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="' + seed + '" result="w"/>' +
            '<feDisplacementMap in="SourceGraphic" in2="w" scale="' + (soft ? 1.2 : 2.6) + '" xChannelSelector="R" yChannelSelector="G" result="r"/>' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="' + (seed + 7) + '" result="g"/>' +
            '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.6 ' + (soft ? 3.6 : 2.85) + '" result="sp"/>' +
            '<feComposite in="r" in2="sp" operator="in" result="s"/>' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.016 0.024" numOctaves="2" seed="' + (seed + 13) + '" result="p"/>' +
            '<feColorMatrix in="p" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 0.2" result="pr"/>' +
            '<feComposite in="s" in2="pr" operator="in"/>' +
        '</filter>';
    }
    // kind 'rank': 朱文 (red characters in a double frame). kind 'seal': 白文 (a red square with the character left white)
    function omkStampSvg(chars, vertical, color, uid, seed, kind) {
        var n = chars.length, cell = 80, pad = 20;
        // the 運勢 stamp is the same tall rectangle for every rank (one character or two)
        var W = kind === 'seal' ? 100 : 120;
        var H = kind === 'seal' ? 100 : 200;
        var fid = 'omkInk' + uid, mid = 'omkCut' + uid;
        var font = 'font-family:var(--omk-font);font-weight:800';
        var text = chars.map(function(c, i) {
            var x = kind === 'seal' ? 50 : vertical ? 50 : pad + cell * i + cell / 2;
            var y = kind === 'seal' ? 50 : vertical ? pad + cell * i + cell / 2 + 1 : 51;
            return '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="central" font-size="' + (kind === 'seal' ? 58.7 : 63) + '" style="' + font + '">' + c + '</text>';
        }).join('');
        var art = kind === 'seal'
            // the app's own seal (as on the opening screen): a red square, the 試 left white, a faint line inside the edge
            ? '<rect x="3.5" y="3.5" width="93" height="93" rx="8.5" fill="none" stroke="' + color + '" stroke-width="7"/>' +
              '<g fill="' + color + '">' + text + '</g>'
            // 運勢: a solid block of ink with everything cut out in white: a frame line, 運勢 across the top
            // (read from the right, as on old signboards), and the rank large below
            : (function() {
                var t = function(c, x, y, size) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="central" font-size="' + size + '" style="' + font + '">' + c + '</text>'; };
                var big = n === 1 ? t(chars[0], 60, 122, 72) : t(chars[0], 60, 93, 58) + t(chars[1], 60, 153, 58);
                return '<mask id="' + mid + '"><rect width="120" height="200" fill="#fff"/>' +
                    '<rect x="11" y="11" width="98" height="178" rx="1.5" fill="none" stroke="#000" stroke-width="2.6"/>' +
                    '<g fill="#000">' + t('運', 79, 37, 21) + t('勢', 41, 37, 21) + big + '</g></mask>' +
                    '<rect x="3" y="3" width="114" height="194" rx="3.5" fill="' + color + '" mask="url(#' + mid + ')"/>';
            })();
        var defs = art.indexOf('<mask') === 0 ? art.slice(0, art.indexOf('</mask>') + 7) : '';
        var body = defs ? art.slice(defs.length) : art;
        return '<svg class="omk-stamp" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
            '<defs>' + omkInkFilter(fid, seed, false) + defs + '<filter id="' + fid + 'b"><feGaussianBlur stdDeviation="1.3"/></filter></defs>' +
            '<g class="soak" opacity=".22" filter="url(#' + fid + 'b)">' + body + '</g>' +       // the ink soaking a little into the paper
            '<g filter="url(#' + fid + ')">' + body + '</g></svg>';
    }
    function omkSlipMarkHtml(entry, key) {
        // printed on the slip's corner, inside the frame: the お守り you took, or a 結 seal pressed in the same ink as the 試 seal
        if (entry.kept) return '<span class="omk-slipmark oma" id="omk-slipmark" title="お守りとして持ち帰りました">' + omkOmamoriSvg(16, entry.s === 'jlpt' ? '合格守' : '学業守', entry.oma || omkOmaKind(key), entry.omaR) + '</span>';
        if (entry.tied) { var sd = 1 + (omkHash(key + '|yui') % 900);
            return '<span class="omk-slipmark yui" id="omk-slipmark" title="木に結びました">' + omkStampSvg(['結'], true, '#b8312f', 'y' + key.replace(/-/g, ''), sd, 'seal') + '</span>'; }
        return '';
    }
    function omkSlipHtml(entry, key, past) {
        var data = omkData();
        var rnd = omkRand(omkHash(data.salt + key + '|text'));
        var tier = OMK_TIER[entry.r] || 'mid';
        var title = entry.s === 'jlpt' ? '合格祈願みくじ' : entry.hatsu ? '初みくじ' : 'おみくじ';
        var word = OMK_WORDS[entry.w % OMK_WORDS.length];
        var wordHtml = word[1] ? furiganaHtml(word[0], word[1]) : escapeHtml(word[0]);
        var inList = !!findWordEntry(word[0]);
        var bad = tier === 'bad';
        var rows = OMK_SECTIONS.map(function(sec) {
            var line = omkPick(rnd, sec[tier]);           // always drawn, so the other lines stay the same
            return '<div class="omk-row"><span class="omk-key">' + sec.k + '</span><span class="omk-val">' + escapeHtml(omkCtxLine(sec.k, tier, entry.ctx) || line) + '</span></div>';
        }).join('');
        var tate = true;     // always 縦書き, like a printed slip
        var srnd = omkRand(omkHash(data.salt + key + '|stamp')), tilt = function(max) { return ((srnd() * 2 - 1) * max).toFixed(2) + 'deg'; };
        var rankSeed = 1 + Math.floor(srnd() * 900), sealSeed = 1 + Math.floor(srnd() * 900);
        var ink = bad ? '#3a3533' : '#d0342c';
        var seal = '<span class="omk-seal"><span class="omk-stampwrap plain" id="omk-seal" style="--tilt:-6deg;--dur:1.15s;--ink-c:#c8372d"><span class="omk-hshadow"></span><span class="omk-hanko"><i></i></span>' +
            omkStampSvg(['試'], true, '#b8312f', 's' + sealSeed, sealSeed, 'seal') + '</span></span>';
        var head = tate ? '<div class="omk-slip-head"><span class="omk-title">' + title + '</span><span class="omk-no">第' + omkKanjiNum(entry.n) + '番' + seal + '</span></div>'
                        : '<div class="omk-slip-head"><span class="omk-no">第' + omkKanjiNum(entry.n) + '番</span><span class="omk-title">' + title + seal + '</span></div>';
        var bodyHtml = head +
                    '<div class="omk-rank" role="img" aria-label="運勢 ' + entry.r + '"><span class="omk-stampwrap" id="omk-rankstamp" style="--tilt:' + tilt(2.5) + ';--ink-c:' + ink + '"><span class="omk-hshadow"></span><span class="omk-hanko"><i></i></span>' +
                        omkStampSvg(entry.r.split(''), tate, ink, 'r' + rankSeed, rankSeed, 'rank') + '</span></div>' +
                    '<p class="omk-summary">' + escapeHtml(omkPick(rnd, OMK_SUMMARY[entry.r] || OMK_SUMMARY['吉'])) + '</p>' +
                    (function() { var wk = omkPick(omkRand(omkHash(data.salt + key + '|waka')), OMK_WAKA[tier]);
                        var ku = wk[0].split('　');     // 五・七・五 / 七・七: printed as two lines, without spaces
                        return '<p class="omk-waka" aria-label="' + ku.join('') + '"><span class="omk-waka-k">' + ku.slice(0, 3).join('') + '</span><span class="omk-waka-s">' + ku.slice(3).join('') + '</span>' +
                            '<span class="omk-waka-by">' + wk[1] + '</span></p>'; })() +
                    (entry.s && OMK_SEASON[entry.s] ? '<p class="omk-season">' + escapeHtml(OMK_SEASON[entry.s]) + '</p>' : '');
        var rowsHtml = '<div class="omk-rows">' + rows + '</div>';
        var kept = !!entry.kept;
        var omaLabel = entry.s === 'jlpt' ? '合格守' : '学業守';
        var slipBlock = '<div class="omk-zoom" id="omk-zoom">' + (bad ? omkBranchHtml(entry.tied) : '') + '<div class="omk-zoom-inner" id="omk-zoom-inner"><div class="omk-slip' + (bad ? ' bad' : '') + (entry.tied ? ' tied' : '') + '" id="omk-slip">' +
            '<div class="omk-slip-inner">' +
                // 縦書き (default), read from the right: title and number, the rank, the message, then the sections
                // 縦書き in two tiers, like a printed slip: the rank and the verse above, the sections in a band below
                ('<div class="omk-tate omk-tier-top" id="omk-tate">' + uprightLatinInVertical(bodyHtml) + '</div>' +
                        '<div class="omk-tate omk-tier-bottom" id="omk-tate2">' + uprightLatinInVertical(rowsHtml) + '</div>') +
            '</div>' + omkSlipMarkHtml(entry, key) + '</div></div></div>' +
            omkStripHtml(entry, key, past, bad, omaLabel) +
            // 今日の一語: a small card under the slip. Tap the word to hear it; add it to the 単語帳
            '<div class="omk-wordcard" id="omk-wordcard">' +
                '<span class="omk-word-label">今日の一語</span>' +
                '<button class="omk-word-say" id="omk-word-say" aria-label="「' + escapeHtml(word[0]) + '」を聞いて単語帳に追加"><span class="omk-word-text">' + wordHtml + '</span>' +
                    '<span class="omk-word-icons">' + (inList ? '<span class="omk-word-saved">' + '<span class="omk-sumi" aria-hidden="true">済</span>' + '単語帳</span>' : '') + '<svg class="omk-word-spk" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor"/><path d="M13 7a4 4 0 0 1 0 6M15.5 4.8a7 7 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span></button>' +
                '<span class="omk-word-def"><span class="omk-word-meaning">' + escapeHtml(word[2]) + '</span>' +
                    (getSetting('showKorean', true) ? '<span class="omk-word-kr" lang="ko">' + escapeHtml(word[3]) + '</span>' : '') + '</span>' +
            '</div>';
        // every day looks the same: the date, the slip, the day's two tasks, the word, 戻る.
        // Swipe (or the side tabs) to go to the day before / after.
        var keys = omkDayKeys(), i = keys.indexOf(key), prev = i > 0 ? keys[i - 1] : null, next = i >= 0 && i < keys.length - 1 ? keys[i + 1] : null;
        var tab = function(k, cls, arr) {
            return '<button class="omk-peek omk-daytab' + cls + '" data-day="' + k + '" aria-label="' + omkDateLabel(k) + 'のおみくじ">' +
                (cls ? '' : '<span class="omk-peek-arr" aria-hidden="true">' + arr + '</span>') +
                '<span class="omk-peek-txt">' + omkKanjiDate(k) + '</span>' +
                (cls ? '<span class="omk-peek-arr" aria-hidden="true">' + arr + '</span>' : '') + '</button>';
        };
        return '<p class="omk-lead omk-pastlead omk-todaylead">' + (past ? omkDateLabel(key) : '今日 ' + omkDateLabel(key)) + 'のおみくじ</p>' +
            '<div class="omk-swipe omk-days" id="omk-swipe"><div class="omk-pg-main omk-daypg" id="omk-daypg">' + slipBlock + '</div>' +
                (prev ? tab(prev, '', '‹') : '') + (next ? tab(next, ' omk-peek-r', '›') : '') +
            '</div>' +
            '<div class="omk-actions"><button class="omk-btn ghost" id="omk-back">戻る</button></div>';
    }
    function omkKanjiDate(k) { var p = k.split('-'); return omkKanjiNum(+p[1]) + '月' + omkKanjiNum(+p[2]) + '日'; }
    // opened from home: only the last seven days (today included); opened from the 記録 page's 御朱印帳: every day
    var omkAllDays = false;
    function omkDayKeys() {
        var d = omkData().days, from = '';
        if (!omkAllDays) { var t = new Date(); t.setDate(t.getDate() - 6); from = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
        return Object.keys(d).filter(function(k) { return d[k] && d[k].r && k >= from; }).sort();
    }
    // the day's two tasks, in one row under the slip: ラッキー問題, and お守り (good) or 木に結ぶ (bad). Done ones get a 済 seal.
    function omkStripHtml(entry, key, past, bad, omaLabel) {
        var lucky = past ? (entry.luckyId ? findQuestion(entry.luckyId) : null) : (omkLuckyQuestion(key) || {}).q;
        var luckyDone = !!(lucky && omkLuckyDone(key, lucky.id));
        var did = bad ? entry.tied : entry.kept;
        var seal = '<span class="omk-chip-done" role="img" aria-label="済"><span class="omk-sumi">済</span></span>';
        // a chip is a button while there is something to do; afterwards it carries a 済 seal
        var chip = function(id, act, icon, text, end) {
            return act ? '<button class="omk-chip act" id="' + id + '">' + icon + '<span class="omk-chip-t">' + text + '</span><span class="omk-chip-arr" aria-hidden="true">›</span></button>'
                       : '<div class="omk-chip' + (end === seal ? ' done' : '') + '">' + icon + '<span class="omk-chip-t">' + text + '</span>' + end + '</div>';
        };
        var qIc = '<span class="omk-chip-ic omk-card-q" aria-hidden="true">問</span>';
        var kIc = '<span class="omk-chip-ic" aria-hidden="true">' + (bad ? '<span class="omk-peek-knot"></span>' : omkOmamoriSvg(14, omaLabel, entry.oma || omkOmaKind())) + '</span>';
        // the lucky chip shows the question itself (and where it comes from), not just its name
        var qText = function(q) {
            var t = String(q.sentence || q.question || '').replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (!t && q.options) t = q.options.join('／');
            return escapeHtml(t);
        };
        // ラッキー問題: just its name; tap it to see the question (and where it is from) with a button to solve it
        var luckyPop = lucky ? '<div class="omk-lucky-pop" id="omk-lucky-pop" hidden><small>' + escapeHtml(qWhere(lucky, '')) + '</small>' +
                '<p class="omk-chip-q">' + qText(lucky) + '</p>' +
                '<button class="omk-btn primary" id="omk-lucky-go">' + (luckyDone ? 'もう一度解く' : '解く') + '</button></div>' : '';
        var luckyChip = lucky
            ? '<button class="omk-chip omk-chip-lucky' + (luckyDone ? ' done' : ' act') + '" id="omk-lucky" aria-expanded="false" aria-controls="omk-lucky-pop">' + qIc +
                '<span class="omk-chip-t">ラッキー問題</span>' + (luckyDone ? seal : '<span class="omk-chip-arr" aria-hidden="true">›</span>') + '</button>'
            : chip('', false, qIc, 'ラッキー問題', '<span class="omk-chip-none" aria-label="なし">－</span>');
        return '<div class="omk-strip">' + luckyPop + luckyChip +
            (did && !bad ? '<button class="omk-chip done omk-chip-3d" id="omk-oma3d" aria-label="お守りを3Dで見る">' + kIc + '<span class="omk-chip-t">お守り</span>' + seal + '</button>'
                : did ? chip('', false, kIc, '木に結んだ', seal)
                : past ? chip('', false, kIc, bad ? '木に結ぶ' : 'お守り', '<span class="omk-chip-none">' + (bad ? '結ばず' : '持ち帰らず') + '</span>')
                : chip(bad ? 'omk-tie' : 'omk-keep', true, kIc, bad ? '木に結ぶ' : '持ち帰る')) +
        '</div>';
    }
    // ラッキー問題: one question from the 誤答ノート, or one not answered yet; the same one all day
    function omkLuckyQuestion(key) {
        // once picked, the day's question stays the same (answering it would otherwise change the pool)
        var data = omkData(), e = data.days[key];
        if (e && e.luckyId) { var kq = findQuestion(e.luckyId); if (kq) return { q: kq, from: e.luckyFrom || '' }; }
        var pick = omkPickLucky(key);
        if (pick && e) { e.luckyId = pick.q.id; e.luckyFrom = pick.from; omkSave(data); }
        return pick;
    }
    // answered today (any attempt at it since the day began)?
    function omkLuckyDone(key, id) {
        var p = key.split('-'), start = new Date(+p[0], +p[1] - 1, +p[2]).getTime();
        return (typeof attemptLog !== 'undefined' ? attemptLog : []).some(function(a) { return a.id === id && a.t >= start; });
    }
    function omkPickLucky(key) {
        var rnd = omkRand(omkHash(omkData().salt + key + '|lucky'));
        var pool = getMistakeQuestions(), from = '誤答ノートから';
        if (!pool.length) { pool = quizData.filter(function(q) { return q.options && !isQuestionAnswered(q); }); from = 'まだ解いていない問題から'; }
        if (!pool.length) { pool = quizData.filter(function(q) { return q.options; }); from = ''; }
        if (!pool.length) return null;
        return { q: pool[Math.floor(rnd() * pool.length)], from: from };
    }
    var omkOverlay = null, omkKeepModel = null;
    function closeOmikuji() {
        if (omkKeepModel) { omkKeepModel.destroy(); omkKeepModel = null; }
        if (!omkOverlay) return;
        omkStopMotion();
        var o = omkOverlay; omkOverlay = null;
        o.querySelectorAll('[id]').forEach(function(el) { el.removeAttribute('id'); });     // so a new one can open while this fades
        o.classList.remove('show');
        document.removeEventListener('keydown', omkKey);
        setTimeout(function() { if (o.parentNode) o.parentNode.removeChild(o); }, 220);
        // back on home: refresh just the おみくじ card in place, so the screen stays where it was
        if (homeIsShowing()) {
            var card = document.getElementById('omk-home'), y = window.scrollY;
            var tmp = document.createElement('div'); tmp.innerHTML = omikujiHomeHtml();
            card.parentNode.replaceChild(tmp.firstChild, card);
            bindOmikujiHome();
            if (window.scrollY !== y) window.scrollTo(0, y);
        }
        // back on 記録: refresh the おみくじ card there too (counts, and the 御朱印帳 page with the お守り just kept),
        // keeping the screen and the 御朱印帳 where they were. Page taps are handled on document, so nothing to re-bind.
        var book = document.querySelector('.omk-book'), statCard = book && book.closest('.stat-card');
        if (statCard && typeof omikujiStatsHtml === 'function') {
            var sy = window.scrollY, bx = book.scrollLeft, by = book.scrollTop;
            var t2 = document.createElement('div'); t2.innerHTML = omikujiStatsHtml();
            if (t2.firstChild) {
                statCard.parentNode.replaceChild(t2.firstChild, statCard);
                var nb = document.querySelector('.omk-book'); if (nb) { nb.scrollLeft = bx; nb.scrollTop = by; }
                if (window.scrollY !== sy) window.scrollTo(0, sy);
            }
        }
    }
    function homeIsShowing() { var h = document.getElementById('omk-home'); return !!(h && h.offsetParent && h.getClientRects().length); }
    function omkKey(e) { if (e.key === 'Escape') closeOmikuji(); }
    function openOmikuji(pastKey) {
        omkAllDays = typeof pastKey === 'string';
        var past = typeof pastKey === 'string' && pastKey !== getTodayDateString();
        var entry = past ? omkData().days[pastKey] : omkToday();
        if (!entry && (past || omkGoalLeft() > 0)) { if (!past) showToast('あと' + omkGoalLeft() + '問で今日のおみくじが引けます'); return; }
        closeOmikuji();
        var o = document.createElement('div');
        o.className = 'omk-overlay';
        o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', '今日のおみくじ');
        o.innerHTML = omkSceneHtml() + '<div class="omk-panel"><button class="omk-x" id="omk-close" aria-label="閉じる">×</button><div class="omk-body" id="omk-body"></div></div>';
        document.body.appendChild(o);
        omkOverlay = o;
        o.addEventListener('click', function(e) { if (e.target === o) closeOmikuji(); });
        document.getElementById('omk-close').addEventListener('click', closeOmikuji);
        document.addEventListener('keydown', omkKey);
        requestAnimationFrame(function() { o.classList.add('show'); });
        if (past) omkShowSlip(entry, false, pastKey, true);
        else if (entry) omkShowSlip(entry, false);
        else { omkShowFolded(); omkSound('bell', 0.8); }
    }
    // おみくじの引き方 (as at a shrine): shake the みくじ箱, turn it upside down so one stick drops out of the hole,
    // read the number on the stick, open the drawer of the みくじ箪笥 with that number and take the folded slip.
    function omkShowBox() {
        var canMotion = 'DeviceMotionEvent' in window && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        var body = document.getElementById('omk-body');
        body.innerHTML = '<div class="omk-stage">' +
            '<p class="omk-lead" id="omk-lead">今日の目標達成、おつかれさまでした。<br>' +
                (canMotion ? '<b>スマホを振って</b>箱を振りましょう。よく振ったら、逆さにして棒を一本出します。' : '箱をよく振ってから、逆さにして棒を一本出します。') + '</p>' +
            '<div class="omk-boxrow">' +
                '<button class="omk-box" id="omk-box" aria-label="みくじ箱を振る">' +
                    '<span class="omk-box-top" aria-hidden="true"></span>' +
                    '<span class="omk-stickslot" aria-hidden="true"><span class="omk-stick"></span></span>' +
                    '<span class="omk-box-body"><span class="omk-box-band top"></span><span class="omk-box-label">御神籤</span><span class="omk-box-band bottom"></span></span>' +
                '</button>' +
                '<div class="omk-stickread" id="omk-stickread" aria-live="polite"><span class="omk-bigstick"><i id="omk-bigstick-no"></i></span><span class="omk-stickread-cap" id="omk-stickread-cap"></span></div>' +
            '</div>' +
            (canMotion ? '<div class="omk-shakemeter" id="omk-shakemeter" aria-hidden="true"><i></i></div>' : '') +
            '<button class="omk-btn primary" id="omk-shake">' + (canMotion ? 'ボタンで振る' : '箱を振る') + '</button>' +
        '</div>';
        var shaken = false, box = document.getElementById('omk-box');
        // after the shaking: turn it over, one stick slides out of the hole, read the number
        var draw = function(skipShakeAnim) {
            if (shaken) return;
            shaken = true;
            stopMotion();
            var entry = omkDraw(), no = omkKanjiNum(entry.n), r = omkReduced();
            var btn = document.getElementById('omk-shake'), shakeMs = skipShakeAnim || r ? 0 : 1300;
            btn.disabled = true; btn.textContent = 'カラカラ…';
            var meter = document.getElementById('omk-shakemeter');
            if (meter) meter.classList.add('done');
            if (!skipShakeAnim) { omkVibrate([30, 60, 30, 60, 30]); box.classList.add('shaking'); }
            setTimeout(function() { box.classList.remove('shaking', 'jolt'); box.classList.add('flip'); btn.textContent = '逆さにして…'; }, shakeMs);
            setTimeout(function() { box.classList.add('drop'); omkVibrate(15); }, r ? 0 : shakeMs + 750);
            setTimeout(function() {
                document.getElementById('omk-bigstick-no').textContent = no + '番';
                document.getElementById('omk-stickread-cap').textContent = '第' + no + '番';
                document.getElementById('omk-stickread').classList.add('show');
                document.getElementById('omk-lead').innerHTML = '棒が出ました。<b>第' + no + '番</b>です。<br>同じ番号の引き出しから、おみくじを受け取ります。';
                btn.disabled = false; btn.textContent = '第' + no + '番の引き出しへ';
                btn.onclick = function() { omkShowDrawer(entry); };
            }, r ? 50 : shakeMs + 1600);
        };
        // ---- shake the phone: each sharp jolt rattles the box; enough of them and the stick comes out ----
        var JOLT = 13, NEED = 6, last = null, lastJolt = 0, jolts = 0, listening = false;
        var onMotion = function(e) {
            var a = e.accelerationIncludingGravity || e.acceleration;
            if (!a || a.x === null) return;
            if (last) {
                var d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z), now = Date.now();
                if (d > JOLT && now - lastJolt > 110) {
                    if (now - lastJolt > 1500) jolts = 0;            // a pause starts the count again
                    lastJolt = now; jolts++;
                    box.style.setProperty('--jolt', ((jolts % 2 ? -1 : 1) * (8 + Math.min(10, d / 3))).toFixed(1) + 'deg');
                    box.classList.remove('jolt'); void box.offsetWidth; box.classList.add('jolt');
                    omkVibrate(12);
                    var meter = document.getElementById('omk-shakemeter');
                    if (meter) meter.firstChild.style.width = Math.min(100, jolts / NEED * 100) + '%';
                    if (jolts >= NEED) setTimeout(function() { draw(true); }, 250);
                }
            }
            last = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
        };
        var startMotion = function() {
            if (listening || shaken) return;
            listening = true;
            window.addEventListener('devicemotion', onMotion);
        };
        function stopMotion() { if (listening) { window.removeEventListener('devicemotion', onMotion); listening = false; } }
        omkStopMotion = stopMotion;
        if (canMotion) {
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                // iPhone: motion needs a tap to allow it first
                box.addEventListener('click', function() {
                    DeviceMotionEvent.requestPermission().then(function(s) { if (s === 'granted') startMotion(); else draw(false); }).catch(function() { draw(false); });
                }, { once: true });
            } else {
                startMotion();
                box.addEventListener('click', function() { draw(false); });
            }
        } else {
            box.addEventListener('click', function() { draw(false); });
        }
        document.getElementById('omk-shake').addEventListener('click', function() { draw(false); });
    }
    var omkStopMotion = function() {};
    // For now the おみくじ opens straight onto the folded slip: tap it to unfold.
    // (The みくじ箱 and みくじ箪笥 steps, omkShowBox and omkShowDrawer, are kept for later.)
    function omkShowFolded() {
        var body = document.getElementById('omk-body');
        body.innerHTML = '<div class="omk-stage">' +
            '<p class="omk-lead">今日の目標達成、おつかれさまでした。<br>おみくじを開いてみましょう。</p>' +
            '<button class="omk-foldslip" id="omk-foldslip" aria-label="おみくじを開く"><span class="omk-foldslip-title">御神籤</span></button>' +
            '<button class="omk-btn primary" id="omk-unfold">おみくじを開く</button>' +
        '</div>';
        var opened = false;
        var open = function() {
            if (opened) return;
            opened = true;
            var entry = omkDraw();
            omkVibrate(12);
            document.getElementById('omk-foldslip').classList.add('opening');
            document.getElementById('omk-unfold').disabled = true;
            setTimeout(function() { omkShowSlip(entry, true); }, omkReduced() ? 0 : 240);
        };
        document.getElementById('omk-foldslip').addEventListener('click', open);
        document.getElementById('omk-unfold').addEventListener('click', open);
    }
    function omkVibrate(p) { if (navigator.vibrate && getSetting('vibrate', true)) { try { navigator.vibrate(p); } catch (e) {} } }
    function omkReduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    // みくじ箪笥: twelve numbered drawers around yours; open yours to find the folded slip
    function omkShowDrawer(entry) {
        if (!omkOverlay) return;
        var base = Math.min(89, Math.floor((entry.n - 1) / 12) * 12 + 1), cells = '';
        for (var k = base; k < base + 12; k++) {
            var mine = k === entry.n;
            cells += '<button class="omk-drawer' + (mine ? ' mine' : '') + '" data-n="' + k + '" aria-label="' + omkKanjiNum(k) + '番の引き出し">' +
                (mine ? '<span class="omk-drawer-tray" aria-hidden="true"><span class="omk-folded"></span></span>' : '') +
                '<span class="omk-drawer-front"><span class="omk-drawer-label">' + omkKanjiNum(k) + '</span><span class="omk-drawer-pull"></span></span></button>';
        }
        var body = document.getElementById('omk-body');
        body.innerHTML = '<div class="omk-stage">' +
            '<p class="omk-lead" id="omk-lead2"><b>' + omkKanjiNum(entry.n) + '</b>と書かれた引き出しを開けてください。</p>' +
            '<div class="omk-tansu"><div class="omk-tansu-top">御 神 籤</div><div class="omk-tansu-grid">' + cells + '</div></div>' +
            '<button class="omk-btn primary" id="omk-open">' + omkKanjiNum(entry.n) + 'の引き出しを開ける</button>' +
        '</div>';
        var opened = false;
        var open = function() {
            if (opened) return;
            opened = true;
            var d = body.querySelector('.omk-drawer.mine'), btn = document.getElementById('omk-open'), r = omkReduced();
            btn.disabled = true;
            omkVibrate(12);
            d.classList.add('open');
            document.getElementById('omk-lead2').textContent = 'おみくじを受け取りました。開いてみましょう。';
            setTimeout(function() { d.classList.add('lift'); }, r ? 0 : 900);
            setTimeout(function() { omkShowSlip(entry, true); }, r ? 50 : 1700);
        };
        body.querySelectorAll('.omk-drawer').forEach(function(d) {
            d.addEventListener('click', function() {
                if (d.classList.contains('mine')) { open(); return; }
                if (opened) return;
                d.classList.remove('nope'); void d.offsetWidth; d.classList.add('nope');
                showToast('これは' + d.querySelector('.omk-drawer-label').textContent + '番です。' + omkKanjiNum(entry.n) + '番の引き出しを探してください');
            });
        });
        document.getElementById('omk-open').addEventListener('click', open);
    }
    // press one stamp: the 判子 comes down, presses, lifts away; the ink appears at the moment of contact
    // The rank stamp: the 判子 hovers over the slip for a moment (the rest of the slip dims), rises a little,
    // then comes down hard: a flash, a ring and drops of ink, the panel jolts, gold sparks for good fortune.
    var OMK_BIG_HIT = 0.66;      // the moment of contact, as a share of the animation (same as the CSS keyframes)
    function omkStampBig(wrap, slip, entry, ms) {
        if (!wrap) return;
        var panel = wrap.closest('.omk-panel'), tier = OMK_TIER[entry.r] || 'mid';
        var z = parseFloat(slip.style.zoom) || 1, rr = wrap.getBoundingClientRect(), sr = slip.getBoundingClientRect();
        slip.style.setProperty('--fx', ((rr.left + rr.width / 2 - sr.left) / z).toFixed(0) + 'px');
        slip.style.setProperty('--fy', ((rr.top + rr.height / 2 - sr.top) / z).toFixed(0) + 'px');
        wrap.style.setProperty('--dur', ms + 'ms');
        slip.classList.add('focus');
        wrap.classList.add('stamping', 'big');
        setTimeout(function() {
            omkVibrate(30); omkSound('clack', 1);
            if (panel) { panel.classList.remove('impact'); void panel.offsetWidth; panel.classList.add('impact'); }
            // a warm glow under the 判子, and above it: two shockwave rings, 集中線-like rays, and gold sparks
            var halo = document.createElement('span');
            halo.className = 'omk-halo' + (tier === 'bad' ? ' sumi' : '');
            wrap.appendChild(halo);
            var burst = document.createElement('span');
            burst.className = 'omk-burst' + (tier === 'bad' ? ' sumi' : tier === 'good' ? ' gold' : '');
            var html = '<span class="ring"></span><span class="ring two"></span>';
            var rays = tier === 'bad' ? 6 : 10;
            for (var i = 0; i < rays; i++) {
                html += '<span class="ray" style="--a:' + (i * 360 / rays + Math.random() * 8 - 4).toFixed(0) + 'deg;--l:' + (22 + Math.random() * 26).toFixed(0) + 'px;--dl:' + (Math.random() * .05).toFixed(2) + 's"></span>';
            }
            if (tier !== 'bad') {
                var n = tier === 'good' ? 8 : 4;
                for (var j = 0; j < n; j++) {
                    html += '<span class="spark" style="--a:' + (Math.random() * 360).toFixed(0) + 'deg;--d:' + (70 + Math.random() * 45).toFixed(0) + 'px;--z:' + (.8 + Math.random() * .8).toFixed(2) + ';--dl:' + (.04 + Math.random() * .16).toFixed(2) + 's"></span>';
                }
            }
            burst.innerHTML = html;
            wrap.appendChild(burst);
            setTimeout(function() { if (halo.parentNode) halo.parentNode.removeChild(halo); }, 1200);
            setTimeout(function() { if (burst.parentNode) burst.parentNode.removeChild(burst); }, 1200);
        }, ms * OMK_BIG_HIT);
        setTimeout(function() { slip.classList.remove('focus'); }, ms * OMK_BIG_HIT + 260);
        setTimeout(function() { wrap.classList.remove('stamping', 'big'); wrap.classList.add('stamped', 'fresh'); }, ms + 30);
    }
    function omkStamp(wrap, slip, ms, buzz) {
        if (!wrap) return;
        wrap.style.setProperty('--dur', ms + 'ms');      // the CSS animation runs for the same time
        wrap.classList.add('stamping');
        setTimeout(function() { omkVibrate(buzz); omkSound('clack', 0.4); if (slip) { slip.classList.remove('thud'); void slip.offsetWidth; slip.classList.add('thud'); } }, ms * 0.48);
        setTimeout(function() { wrap.classList.remove('stamping'); wrap.classList.add('stamped', 'fresh'); }, ms + 30);
    }
    function omkShowSlip(entry, animate, pastKey, past) {
        if (!omkOverlay) return;
        var key = past ? pastKey : getTodayDateString();
        if (!past && !entry.ctx) { var dd = omkData(); if (dd.days[key]) { dd.days[key].ctx = entry.ctx = omkStudyCtx(); omkSave(dd); } }
        var body = document.getElementById('omk-body');
        body.innerHTML = omkSlipHtml(entry, key, past);
        var slip = document.getElementById('omk-slip');
        omkFitTate();
        omkFitHeight();
        omkBindViewer();
        var rankWrap = document.getElementById('omk-rankstamp'), sealWrap = document.getElementById('omk-seal');
        if (!animate || omkReduced()) {
            rankWrap.classList.add('stamped'); sealWrap.classList.add('stamped');
        } else {
            slip.classList.add('unfold');
            omkSound('rustle');
            setTimeout(function() { slip.classList.remove('unfold'); omkStampBig(rankWrap, slip, entry, 1500); }, 1080);
            setTimeout(function() { omkStamp(sealWrap, slip, 520, 8); }, 1080 + 1500 + 120);
        }
        var close2 = document.getElementById('omk-close2');
        if (close2) close2.addEventListener('click', closeOmikuji);
        var say = document.getElementById('omk-word-say');
        var wcard = document.getElementById('omk-wordcard');
        if (say && wcard) wcard.addEventListener('click', function() {     // anywhere on the card: hear it and save it
            var w = OMK_WORDS[entry.w % OMK_WORDS.length];
            say.classList.add('saying'); setTimeout(function() { say.classList.remove('saying'); }, 1200);
            try { speakText(escapeHtml(w[1] || w[0])); } catch (err) {}
            omkAddWord(say, entry);
        });
        var back = document.getElementById('omk-back');
        if (back) back.addEventListener('click', closeOmikuji);
        document.querySelectorAll('.omk-daytab').forEach(function(t) { t.addEventListener('click', function() { omkGoDay(t.dataset.day, t.classList.contains('omk-peek-r') ? 1 : -1); }); });
        omkDaySwipe(key);
        var oma3d = document.getElementById('omk-oma3d');
        if (oma3d) oma3d.addEventListener('click', function() { omkOpen3D(omkData().days[key], key); });
        var luckyBtn = document.getElementById('omk-lucky'), luckyPop = document.getElementById('omk-lucky-pop');
        if (luckyBtn && luckyPop) {
            var showPop = function(on) { luckyPop.hidden = !on; luckyBtn.setAttribute('aria-expanded', String(on)); luckyBtn.classList.toggle('open', on); };
            luckyBtn.addEventListener('click', function(ev) { ev.stopPropagation(); showPop(luckyPop.hidden); });
            luckyPop.addEventListener('click', function(ev) { ev.stopPropagation(); });
            omkOverlay.addEventListener('click', function() { if (!luckyPop.hidden) showPop(false); });
            document.getElementById('omk-lucky-go').addEventListener('click', function() {
                var lq = past ? findQuestion(entry.luckyId) : (omkLuckyQuestion(key) || {}).q;
                if (!lq) return;
                closeOmikuji();
                pendingOrigin = 'home'; pendingTitle = 'ラッキー問題';
                startListQuiz([lq.id], lq.id, false, 'practice');
            });
        }
        // 凶: fold it into a strip and tie it to the branch
        var tie = document.getElementById('omk-tie');
        if (tie) tie.addEventListener('click', function() {
            var data = omkData(), e = data.days[key];
            if (!e || e.tied) return;
            tie.disabled = true;
            doTie();
        });
        function doTie() {
            var data = omkData(), e = data.days[key];
            e.tied = true; omkSave(data);
            omkSound('rustle', 0.7);
            slip.classList.add('tying');
            omkChipDone(tie);
            omkAddSlipMark(slip, e, key);
            document.getElementById('omk-branch').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setTimeout(function() { document.getElementById('omk-branch').classList.add('has-knot'); omkVibrate(10); }, 650);
            setTimeout(function() { slip.classList.remove('tying'); slip.classList.add('tied'); }, 700);
            showToast('悪い運は、ここに置いていきましょう');
        }
        // 吉: fold it up small and keep it as a charm
        var keep = document.getElementById('omk-keep');
        if (keep) keep.addEventListener('click', function() {
            var data = omkData(), e = data.days[key];
            if (!e || e.kept) return;
            keep.disabled = true;
            doKeep();
        });
        function doKeep() {
            var data = omkData(), e = data.days[key];
            e.kept = true; e.oma = omkOmaKind(); e.omaR = omkOmaRare(key, e.r); omkSave(data);
            var rareT = OMK_OMA_RARE[e.omaR];
            omkChipDone(keep);
            omkAddSlipMark(slip, e, key);
            omkSound('rustle', 0.7);
            slip.classList.add('keeping');
            var sw = document.getElementById('omk-swipe'); if (sw) sw.classList.add('keeping');
            var panel = omkOverlay.querySelector('.omk-panel'), k = document.createElement('div');
            k.className = 'omk-keep' + (rareT ? ' rare' : '');
            k.innerHTML = '<span class="omk-keep3d"><canvas aria-hidden="true"></canvas></span>' +
                (rareT ? '<p><span class="omk-rare-tag">めずらしい</span>' + rareT.name + 'です<small>今日はホームに置いておきます</small></p>'
                       : '<p>お守りとして持ち帰りました<small>今日はホームに置いておきます</small></p>');
            panel.appendChild(k);
            omkKeepModel = omk3dModel(k.querySelector('canvas'), { look: omk3dLook(e.oma, e.omaR), label: entry.s === 'jlpt' ? '合格守' : '学業守', spin: false, fit: true, ty: 1.15, yaw: -0.35, pitch: 0.06, entrance: true });
            if (!omkKeepModel) k.querySelector('.omk-keep3d').outerHTML = omkOmamoriSvg(96, entry.s === 'jlpt' ? '合格守' : '学業守', e.oma, e.omaR);
            panel.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(function() { omkSound('bell', 0.6); omkVibrate(15); }, 650);
            var mine = omkOverlay;
            setTimeout(function() { if (omkOverlay === mine) closeOmikuji(); }, rareT ? 4600 : 3600);
            if (rareT) setTimeout(function() { omkSound('bell', 0.8); omkVibrate([12, 60, 18]); }, 1200);
        }
    }
    // スワイプ: drag the slip sideways to go to the day before (drag right) or after (drag left)
    var omkDayDir = 0;
    function omkGoDay(k, dir) {
        var d = omkData(), e = d.days[k];
        if (!e || !omkOverlay) return;
        omkDayDir = dir;
        omkShowSlip(e, false, k, k !== getTodayDateString());
        var pg = document.getElementById('omk-daypg');
        if (pg && !omkReduced()) { pg.classList.add(dir > 0 ? 'from-r' : 'from-l'); setTimeout(function() { pg.classList.remove('from-r', 'from-l'); }, 400); }
    }
    function omkDaySwipe(key) {
        var box = document.getElementById('omk-swipe'), pg = document.getElementById('omk-daypg');
        if (!box || !pg) return;
        omkOverlay.classList.add('swipe-close');     // no ×: 戻る closes
        var keys = omkDayKeys(), i = keys.indexOf(key), prev = i > 0 ? keys[i - 1] : null, next = i >= 0 && i < keys.length - 1 ? keys[i + 1] : null;
        var st = null;
        box.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) { st = null; return; }
            st = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: null };
        }, { passive: true });
        box.addEventListener('touchmove', function(e) {
            if (!st || e.touches.length !== 1) return;
            var dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y;
            if (!st.dir) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; st.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'; }
            if (st.dir !== 'h') return;
            e.preventDefault();
            var none = false;                            // past the last day either way: the whole screen goes, and it closes
            pg.style.transition = 'none';
            pg.style.transform = 'translateX(' + (none ? dx / 4 : dx) + 'px)';
            pg.style.opacity = none ? '' : Math.max(.3, 1 - Math.abs(dx) / (box.clientWidth * 1.2)).toFixed(3);
            st.dx = dx; st.w = box.clientWidth;
        }, { passive: false });
        box.addEventListener('touchend', function() {
            if (!st) return;
            var dx = st.dx || 0, far = st.dir === 'h' && Math.abs(dx) > st.w * 0.22, to = far ? (dx > 0 ? prev : next) : null;
            st = null;
            if (far && !to) {        // no more days that way: leave the おみくじ
                pg.style.transition = 'transform .2s ease-in, opacity .2s';
                pg.style.transform = 'translateX(' + (dx > 0 ? 1 : -1) * box.clientWidth + 'px)'; pg.style.opacity = '0';
                setTimeout(closeOmikuji, 180);
            } else if (to) {
                pg.style.transition = 'transform .18s ease-in, opacity .18s';
                pg.style.transform = 'translateX(' + (dx > 0 ? 1 : -1) * box.clientWidth + 'px)'; pg.style.opacity = '0';
                setTimeout(function() { omkGoDay(to, dx > 0 ? -1 : 1); }, 170);
            } else { pg.style.transition = 'transform .25s ease, opacity .25s'; pg.style.transform = ''; pg.style.opacity = ''; }
        });
        omkOverlay.onkeydown = function(e) { if (e.key === 'ArrowLeft') { if (prev) omkGoDay(prev, -1); else closeOmikuji(); } else if (e.key === 'ArrowRight') { if (next) omkGoDay(next, 1); else closeOmikuji(); } };
    }
    // a task done: its button turns into a 済 seal
    function omkChipDone(btn) {
        if (!btn) return;
        var d = document.createElement('div'); d.className = 'omk-chip done';
        var ic = btn.querySelector('.omk-chip-ic'), t = btn.querySelector('.omk-chip-t');
        if (ic) d.appendChild(ic);
        if (t) { if (btn.id === 'omk-keep') t.textContent = 'お守り'; else if (btn.id === 'omk-tie') t.textContent = '木に結んだ'; d.appendChild(t); }
        var st = document.createElement('span'); st.className = 'omk-chip-done fresh'; st.setAttribute('role', 'img'); st.setAttribute('aria-label', '済');
        st.innerHTML = '<span class="omk-sumi">済</span>'; d.appendChild(st);
        btn.replaceWith(d);
    }
    // 済: the card is stamped across, and its button goes
    function omkDoneStamp(btn, still) {
        var card = btn && btn.closest('.omk-opt');
        if (!card) return;
        btn.remove();
        var st = document.createElement('span'); st.className = 'omk-done-stamp'; st.setAttribute('role', 'img'); st.setAttribute('aria-label', '済'); st.innerHTML = '<b>済</b>';
        card.appendChild(st); card.classList.add('done'); if (!still) card.classList.add('fresh');
    }
    function omkAddSlipMark(slip, e, key) {
        if (!slip || document.getElementById('omk-slipmark')) return;
        var tmp = document.createElement('div'); tmp.innerHTML = omkSlipMarkHtml(e, key);
        var m = tmp.firstChild; if (!m) return;
        m.classList.add('fresh'); slip.appendChild(m);
    }
    // tapping the word adds it to the 単語帳 (once), with a small 済 seal beside it
    function omkAddWord(say, entry) {
        var w = OMK_WORDS[entry.w % OMK_WORDS.length];
        if (findWordEntry(w[0])) return;
        var undoBefore = typeof wordBegin === 'function' ? wordBegin() : null;
        wordList.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), added: Date.now(), qid: null,
                        source: 'おみくじ・今日の一語', word: w[0], meaning: w[2], reading: w[1], furigana: '', readingChecked: true });
        saveWordList();
        if (undoBefore) wordCommit(undoBefore, '「' + w[0] + '」を追加');
        if (!say.querySelector('.omk-word-saved')) { var t = document.createElement('span'); t.className = 'omk-word-saved fresh'; t.innerHTML = '<span class="omk-sumi" aria-hidden="true">済</span>' + '単語帳'; var ic = say.querySelector('.omk-word-icons'); ic.insertBefore(t, ic.firstChild); }
        showToast('「' + w[0] + '」を単語帳に追加しました');
    }
    // tap the slip: it opens on a screen of its own, as large as the screen allows. Tap again (or ×) to go back.
    function omkBindViewer() {
        var slip = document.getElementById('omk-slip');
        if (!slip) return;
        slip.classList.add('viewable');
        slip.setAttribute('role', 'button'); slip.setAttribute('tabindex', '0'); slip.setAttribute('aria-label', 'おみくじを大きく見る');
        var open = function(ev) {
            if (ev && ev.target.closest && ev.target.closest('.omk-stampwrap.tap.stamped')) return;     // the 運勢 stamp has its own job
            if (slip.classList.contains('unfold') || slip.classList.contains('keeping') || slip.classList.contains('tying')) return;
            omkOpenViewer(slip);
        };
        slip.addEventListener('click', open);
        slip.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
    function omkOpenViewer(slip) {
        if (document.getElementById('omk-viewer')) return;
        var z = parseFloat(slip.style.zoom) || 1, w = slip.getBoundingClientRect().width / z;
        var v = document.createElement('div');
        v.className = 'omk-viewer'; v.id = 'omk-viewer';
        v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'おみくじ');
        v.innerHTML = '<button class="omk-viewer-x" aria-label="閉じる">×</button><div class="omk-viewer-stage"><div class="omk-viewer-slip"></div></div><p class="omk-viewer-hint">タップで戻る</p>';
        var holder = v.querySelector('.omk-viewer-slip'), c = slip.cloneNode(true);
        c.removeAttribute('id'); c.removeAttribute('role'); c.removeAttribute('tabindex'); c.removeAttribute('aria-label');
        c.classList.remove('viewable', 'unfold'); c.style.zoom = ''; c.style.marginTop = '0';
        c.querySelectorAll('[id]').forEach(function(e) { e.removeAttribute('id'); });
        c.querySelectorAll('.omk-slipmark').forEach(function(e) { e.remove(); });     // just the slip: no お守り tucked on it here
        c.querySelectorAll('.omk-stampwrap').forEach(function(e) { e.classList.remove('fresh', 'stamping', 'big'); e.classList.add('stamped'); });
        holder.style.width = w + 'px';
        holder.appendChild(c);
        (omkOverlay || document.body).appendChild(v);     // inside the おみくじ screen, so the slip keeps its styles
        // as large as fits: the full width or the full height, whichever runs out first
        // (a transform, not zoom: zoom upsets the 縦書き columns)
        var stage = v.querySelector('.omk-viewer-stage');
        var fit = function() {
            var sw = window.innerWidth - 16, sh = window.innerHeight - 76, hw = holder.offsetWidth, hh = holder.offsetHeight;
            var k = Math.max(0.3, Math.min(sw / hw, sh / hh));
            holder.style.transform = 'scale(' + k.toFixed(4) + ')';
            stage.style.width = (hw * k) + 'px'; stage.style.height = (hh * k) + 'px';
        };
        fit();
        requestAnimationFrame(function() { v.classList.add('on'); });
        var close = function() {
            v.classList.remove('on'); v.classList.add('off');
            window.removeEventListener('resize', fit); document.removeEventListener('keydown', key, true);
            setTimeout(function() { v.remove(); }, 220);
            slip.focus && slip.focus({ preventScroll: true });
        };
        var key = function(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        v.addEventListener('click', close);
        // nothing scrolls behind or inside this screen
        v.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
        v.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
        window.addEventListener('resize', fit);
        document.addEventListener('keydown', key, true);
        v.querySelector('.omk-viewer-x').focus({ preventScroll: true });
    }
    // the whole slip on one screen: if it is taller than the screen, scale it down (the buttons may scroll below it)
    function omkFitHeight() {
        var slip = document.getElementById('omk-slip');
        if (!slip) return;
        slip.style.zoom = '';
        var swipe = document.getElementById('omk-swipe'), opts = document.querySelector('.omk-opts');
        var wrapEl = document.getElementById('omk-zoom') || slip;
        var below = document.getElementById('omk-back') || document.getElementById('omk-close2') ? 76 : 16;     // room for the 戻る button
        if (swipe) {
            // the swipe area is exactly the height that is left on the screen; each page is scaled to fit inside it
            swipe.style.height = '';
            if (opts) opts.style.zoom = '';
            var area = Math.max(240, window.innerHeight - below - 16 - swipe.getBoundingClientRect().top);
            swipe.style.height = area + 'px';
            var card = document.getElementById('omk-wordcard'), strip = document.querySelector('.omk-strip'), cardH = (card ? card.offsetHeight + 10 : 0) + (strip ? strip.offsetHeight + 8 : 0);
            var slipRoom = area - (wrapEl.getBoundingClientRect().top - swipe.getBoundingClientRect().top) - cardH - 4;
            if (slip.offsetHeight > slipRoom) slip.style.zoom = Math.max(0.45, slipRoom / slip.offsetHeight).toFixed(3);
            if (opts) { var oh = opts.offsetHeight + 30; if (oh > area) opts.style.zoom = Math.max(0.6, area / oh).toFixed(3); }
            return;
        }
        var card2 = document.getElementById('omk-wordcard');
        var avail = window.innerHeight - below - 16 - wrapEl.getBoundingClientRect().top - (card2 ? card2.offsetHeight + 10 : 0), h = slip.offsetHeight;
        if (h > avail) slip.style.zoom = Math.max(0.4, avail / h).toFixed(3);
    }
    function omkFitTate() {
        var ts = [document.getElementById('omk-tate'), document.getElementById('omk-tate2')].filter(Boolean);
        if (!ts.length) return;
        var over = function() { return ts.some(function(t) { return t.scrollWidth > t.clientWidth + 1; }); };
        var fs = 0.88;
        var set = function() { ts.forEach(function(t) { t.style.fontSize = fs + 'rem'; }); };
        set();
        while (over() && fs > 0.62) { fs = Math.round((fs - 0.02) * 100) / 100; set(); }
        ts.forEach(function(t) { t.classList.toggle('fits', t.scrollWidth <= t.clientWidth + 1); });     // then the 判子 can rise above the text without being cut off
    }
    // The card on the home screen
    function omikujiHomeHtml() {
        var entry = omkToday(), left = omkGoalLeft();
        var state = entry ? 'drawn' : left > 0 ? 'locked' : 'ready';
        var main = entry ? '今日のおみくじ　<b class="omk-home-rank' + (OMK_TIER[entry.r] === 'bad' ? ' bad' : '') + '">' + entry.r + '</b>'
                 : '<b>今日のおみくじ</b>';
        var sub = entry ? (entry.tied ? '木に結びました・もう一度見る' : entry.kept ? (OMK_OMA_RARE[entry.omaR] ? OMK_OMA_RARE[entry.omaR].name + 'を持っています・もう一度見る' : 'お守りとして持っています・もう一度見る') : '第' + omkKanjiNum(entry.n) + '番・もう一度見る')
                : left > 0 ? 'あと' + left + '問で引けます（今日の目標を達成すると引けます）' : '目標達成！ おみくじを開きましょう';
        var icon = entry && entry.kept ? omkOmamoriSvg(22, entry.s === 'jlpt' ? '合格守' : '学業守', entry.oma || omkOmaKind(), entry.omaR) : '⛩️';
        var kept = !!(entry && entry.kept);
        return '<button class="omk-home ' + state + '" id="omk-home" aria-label="今日のおみくじ">' +
            (kept ? '<span class="omk-home-icon omk-home-oma3d" role="button" tabindex="0" aria-label="お守りを3Dで見る" title="お守りを3Dで見る">' + icon + '</span>'
                  : '<span class="omk-home-icon" aria-hidden="true">' + icon + '</span>') +
            '<span class="omk-home-text"><span class="omk-home-main">' + main + '</span><small>' + sub + '</small></span>' +
            // the short form shown when the card sits in the home screen's row of tools
            '<b class="omk-tile-main">おみくじ</b><small class="omk-tile-sub">' + (entry ? entry.r : left > 0 ? 'あと' + left + '問' : '引けます！') + '</small>' +
            '<span class="omk-home-go" aria-hidden="true">' + (state === 'locked' ? '🔒' : '›') + '</span></button>';
    }
    function bindOmikujiHome() {
        var b = document.getElementById('omk-home');
        if (b) b.addEventListener('click', openOmikuji);
        var o = document.querySelector('.omk-home-oma3d');
        if (o) {
            var go = function(ev) { ev.stopPropagation(); ev.preventDefault(); omkOpen3D(omkToday(), getTodayDateString()); };
            o.addEventListener('click', go);
            o.addEventListener('keydown', function(ev) { if (ev.key === 'Enter' || ev.key === ' ') go(ev); });
        }
    }
    // 記録: how many of each rank
    function omikujiStatsHtml() {
        var days = omkData().days, keys = Object.keys(days);
        if (!keys.length) return '';
        var counts = {};
        keys.forEach(function(k) { var r = days[k].r; counts[r] = (counts[r] || 0) + 1; });
        var best = keys.filter(function(k) { return days[k].r === '大吉'; }).length;
        var rares = keys.filter(function(k) { return OMK_OMA_RARE[days[k].omaR]; }).length;
        return '<div class="stat-card"><div class="stat-card-title">おみくじ</div>' +
            '<div class="omk-stat-grid">' + OMK_RANKS.map(function(r) {
                return '<div class="omk-stat' + (counts[r] ? '' : ' none') + (OMK_TIER[r] === 'bad' ? ' bad' : '') + '"><b>' + (counts[r] || 0) + '</b><span>' + r + '</span></div>';
            }).join('') + '</div>' +
            '<div class="stat-sub" style="margin-top:8px">これまでに ' + keys.length + '回 引きました' + (best ? '・大吉 ' + best + '回' : '') + (rares ? '・めずらしいお守り ' + rares + '個' : '') + '</div>' +
            '<div class="omk-book-title">御朱印帳<small>ページをタップすると、その日のおみくじが開きます</small></div>' + omkBookHtml() + '</div>';
    }
    function omikujiDrawDates(rank) {
        var days = omkData().days;
        return Object.keys(days).filter(function(k) { return !rank || days[k].r === rank; }).sort();
    }
    // ===================== お守り 3D: the same お守り as drawn elsewhere, as a padded bag you can turn =====================
    // Plain WebGL, no library, so it works offline in this one file. A model draws into a canvas you give it and
    // stops (and frees its GPU memory) when destroyed.
    var OMK3D_GOSHIKI = ['#2f5aa8', '#c7302a', '#e3b33a', '#f1ebdd', '#3b2a55'];
    // the look of an お守り from its saved data: cloth, pattern, panel, thread and cord, as in omkOmamoriSvg
    function omk3dLook(kind, rare) {
        var th = OMK_OMA[kind] || OMK_OMA[omkOmaKind()], rt = OMK_OMA_RARE[rare] || null, kk = OMK_OMA[kind] ? kind : omkOmaKind();
        var thread = OMK_THREAD[rt ? rt.thread : 'gold'], bord = OMK_THREAD[rt ? rt.border : 'gold'];
        return {
            silk: rt ? rt.silk : th.silk, pat: rt ? rt.pat : th.pat, patCol: rt ? rt.patCol : '#e7c46d', patOp: rt ? rt.patOp : .42,
            panel: rt ? rt.panel : 'rgba(0,0,0,.18)', thread: thread === OMK_THREAD.gold ? '#e7c46d' : thread[2], border: bord === OMK_THREAD.gold ? '#e7c46d' : bord[2],
            cord: rt ? (rare === 'goshiki' ? 'gold' : 'red') : ({ shogatsu: 'white', momiji: 'white' })[kk] || 'red',
            name: rt ? rt.name : (th.name || '') + 'のお守り'
        };
    }
    var OMK3D_CORD = { red: [0.77, 0.18, 0.15], white: [0.93, 0.9, 0.84], gold: [0.83, 0.64, 0.24] };

    // ---- the bag's outline, in the units of the drawing (x 9.4–54.6, y 22–104) ----
    var omk3dShape = (function() {
        function fillet(pts, radii) {
            var out = [];
            for (var i = 0; i < pts.length; i++) {
                var P = pts[i], A = pts[(i - 1 + pts.length) % pts.length], B = pts[(i + 1) % pts.length], r = radii[i];
                var ax = A[0] - P[0], ay = A[1] - P[1], bx = B[0] - P[0], by = B[1] - P[1];
                var la = Math.hypot(ax, ay), lb = Math.hypot(bx, by); ax /= la; ay /= la; bx /= lb; by /= lb;
                var ang = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by))), t = Math.min(r / Math.tan(ang / 2), la * .45, lb * .45);
                var T1 = [P[0] + ax * t, P[1] + ay * t], T2 = [P[0] + bx * t, P[1] + by * t];
                for (var k = 0; k <= 10; k++) { var u = k / 10, v = 1 - u;
                    out.push([v * v * T1[0] + 2 * v * u * P[0] + u * u * T2[0], v * v * T1[1] + 2 * v * u * P[1] + u * u * T2[1]]); }
            }
            return out;
        }
        var O = fillet([[18.2, 22], [45.8, 22], [54.3, 31.2], [54.6, 104], [9.4, 104], [9.7, 31.2]], [2.2, 2.2, 2.6, 5, 5, 2.6]);
        function inside(px, py) {
            var c = false;
            for (var i = 0, j = O.length - 1; i < O.length; j = i++) { var a = O[i], b = O[j];
                if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
            return c;
        }
        function nearest(px, py) {
            var best = [1e9, 0, 0];
            for (var i = 0; i < O.length; i++) { var a = O[i], b = O[(i + 1) % O.length], dx = b[0] - a[0], dy = b[1] - a[1];
                var t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy))), qx = a[0] + dx * t, qy = a[1] + dy * t, d = Math.hypot(px - qx, py - qy);
                if (d < best[0]) best = [d, qx, qy]; }
            return best;
        }
        // padding: rounded up from the seam, then nearly flat across the middle
        function puff(d) { var t = Math.min(d / 9, 1); return 4.4 * Math.sqrt(1 - (1 - t) * (1 - t)) * (0.94 + 0.06 * t); }
        return { outline: O, inside: inside, nearest: nearest, puff: puff, z: function(x, y) { return inside(x, y) ? puff(nearest(x, y)[0]) : 0; } };
    })();
    var OMK3D_S = 2 / 45.2;
    function omk3dW(x, y, z) { return [(x - 32) * OMK3D_S, (63 - y) * OMK3D_S, z * OMK3D_S]; }

    // ---- geometry, built once and kept (plain arrays; each model uploads its own copy) ----
    var omk3dGeo = null;
    function omk3dGeometry() {
        if (omk3dGeo) return omk3dGeo;
        var sh = omk3dShape;
        var nrm = function(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
        var cross = function(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
        var sub = function(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
        var add = function(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
        var mul = function(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; };
        function Mesh() { this.p = []; this.n = []; this.uv = []; this.i = []; }
        Mesh.prototype.v = function(p, n, uv) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]); return this.p.length / 3 - 1; };
        function pillow(side) {
            var m = new Mesh(), NX = 64, NY = 112, x0 = 9.4, x1 = 54.6, y0 = 22, y1 = 104, grid = [];
            for (var j = 0; j <= NY; j++) for (var i = 0; i <= NX; i++) {
                var x = x0 + (x1 - x0) * i / NX, y = y0 + (y1 - y0) * j / NY, z = 0, u = i / NX, v = j / NY;
                if (sh.inside(x, y)) z = sh.puff(sh.nearest(x, y)[0]);
                else { var q = sh.nearest(x, y); x = q[1]; y = q[2]; u = (x - x0) / (x1 - x0); v = (y - y0) / (y1 - y0); }
                grid.push(omk3dW(x, y, z * side)); m.uv.push(side > 0 ? u : 1 - u, v);
            }
            m.p = [].concat.apply([], grid);
            var acc = grid.map(function() { return [0, 0, 0]; });
            for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
                var a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
                (side > 0 ? [[a, c, b], [b, c, d]] : [[a, b, c], [b, d, c]]).forEach(function(t) {
                    m.i.push(t[0], t[1], t[2]);
                    var n = cross(sub(grid[t[1]], grid[t[0]]), sub(grid[t[2]], grid[t[0]]));
                    t.forEach(function(k) { acc[k] = add(acc[k], n); });
                });
            }
            m.n = [].concat.apply([], acc.map(function(n) { return (n[0] || n[1] || n[2]) ? nrm(n) : [0, 0, side]; }));
            return m;
        }
        function ball(m, c, r) {
            var base = m.p.length / 3, A = 8, B = 12;
            for (var a = 0; a <= A; a++) for (var b = 0; b <= B; b++) {
                var th = a / A * Math.PI, ph = b / B * Math.PI * 2, n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
                m.v(omk3dW.apply(null, add(c, mul(n, r))), [n[0], -n[1], n[2]], [0, 0]);
            }
            for (a = 0; a < A; a++) for (b = 0; b < B; b++) { var i0 = base + a * (B + 1) + b, i1 = i0 + B + 1; m.i.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); }
        }
        function tube(m, pts, r, ends) {
            var R = 12, base = m.p.length / 3, L = pts.length, run = 0;
            var T = pts.map(function(p, k) { return nrm(sub(pts[Math.min(k + 1, L - 1)], pts[Math.max(k - 1, 0)])); });
            var N = nrm(cross(T[0], Math.abs(T[0][2]) < .9 ? [0, 0, 1] : [1, 0, 0]));
            for (var k = 0; k < L; k++) {
                if (k) { run += Math.hypot.apply(null, sub(pts[k], pts[k - 1])); N = nrm(cross(cross(T[k], N), T[k])); }
                var B = cross(T[k], N);
                for (var s = 0; s <= R; s++) { var an = s / R * Math.PI * 2, n = add(mul(N, Math.cos(an)), mul(B, Math.sin(an)));
                    m.v(omk3dW.apply(null, add(pts[k], mul(n, r))), [n[0], -n[1], n[2]], [run / r, s / R]); }
            }
            for (k = 0; k < L - 1; k++) for (s = 0; s < R; s++) { var a0 = base + k * (R + 1) + s, b0 = a0 + R + 1; m.i.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
            if (ends) { ball(m, pts[0], r); ball(m, pts[L - 1], r); }
        }
        function cubic(p0, p1, p2, p3, n) { var o = []; for (var k = 0; k <= n; k++) { var t = k / n, u = 1 - t;
            o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
        function parse(d) {
            var nums = d.match(/-?\d*\.?\d+/g).map(Number), cmds = d.match(/[MC]/g), out = [], k = 0, cur;
            cmds.forEach(function(c) {
                if (c === 'M') { cur = [nums[k], nums[k + 1]]; k += 2; out.push(cur); }
                else { var seg = cubic(cur, [nums[k], nums[k + 1]], [nums[k + 2], nums[k + 3]], [nums[k + 4], nums[k + 5]], 18); k += 6; out = out.concat(seg.slice(1)); cur = seg[seg.length - 1]; }
            });
            return out;
        }
        var lift = function(p2, r, extra) { return p2.map(function(p) { return [p[0], p[1], sh.z(p[0], p[1]) + r + (extra || 0)]; }); };
        var CR = 0.78, cord = new Mesh();
        // 二重叶結び: the two loops (two strands each), the small loop below, and the 口 of eight pills
        ['M29.60 29.00C25.50 24.60 16.40 23.80 16.00 30.00C15.60 36.20 25.50 35.40 29.60 31.00',
         'M29.60 29.50C25.50 26.60 18.40 25.80 18.00 30.00C17.60 34.20 25.50 33.40 29.60 30.50',
         'M34.40 29.00C38.50 24.60 47.60 23.80 48.00 30.00C48.40 36.20 38.50 35.40 34.40 31.00',
         'M34.40 29.50C38.50 26.60 45.60 25.80 46.00 30.00C46.40 34.20 38.50 33.40 34.40 30.50',
         'M30.9 32.2C30.2 35.6 30.7 38.2 32 38.2C33.3 38.2 33.8 35.6 33.1 32.2'].forEach(function(d) { tube(cord, lift(parse(d), CR), CR, true); });
        (function() {
            var cx = 32, cy = 30, w = 1.7, hole = .15, bb = 2 * w, aa = bb + hole, H = (aa + bb) / 2, c = Math.cos(Math.PI / 4);
            var R = function(x, y) { return [cx + (x - y) * c, cy + (x + y) * c]; };
            [['h', -H, -H + aa, [-H + w / 2, -H + w * 1.5]], ['v', -H, -H + aa, [H - w / 2, H - w * 1.5]],
             ['h', H - aa, H, [H - w / 2, H - w * 1.5]], ['v', H - aa, H, [-H + w / 2, -H + w * 1.5]]].forEach(function(b) {
                b[3].forEach(function(q) {
                    var l = b[1] + w / 2, h = b[2] - w / 2, a = b[0] === 'h' ? R(l, q) : R(q, l), e = b[0] === 'h' ? R(h, q) : R(q, h), pts = [];
                    for (var k = 0; k <= 5; k++) pts.push([a[0] + (e[0] - a[0]) * k / 5, a[1] + (e[1] - a[1]) * k / 5]);
                    tube(cord, lift(pts, .975, CR * 1.15), .975, true);
                });
            });
        })();
        // the two cords: up out of the knot, over the top edge, into one long loop to hang it by
        [-1, 1].forEach(function(sgn) {
            var pts = [];
            for (var k = 0; k <= 48; k++) { var t = k / 48, y = 28 - t * 60, x = 32 + sgn * (0.85 + 1.2 * Math.sin(Math.min(1, t * 1.4) * Math.PI / 2) * (1 - t) + 4.2 * Math.sin(t * Math.PI) * t);
                pts.push([x, y, Math.max(sh.z(x, y), 0) + CR]); }
            tube(cord, pts, CR * .95, false);
        });
        ball(cord, [32, -32, CR], CR * 1.15);
        omk3dGeo = { front: pillow(1), back: pillow(-1), cord: cord };
        return omk3dGeo;
    }

    // ---- the cloth, painted in the drawing's units: brocade pattern, stitched edge, panel and name ----
    function omk3dCloth(look, label, front) {
        var TX = 768 / 45.2, cv = document.createElement('canvas'), mk = document.createElement('canvas');
        cv.width = mk.width = 768; cv.height = mk.height = Math.round(82 * TX);
        var g = cv.getContext('2d'), k = mk.getContext('2d');
        [g, k].forEach(function(c) { c.setTransform(TX, 0, 0, TX, -9.4 * TX, -22 * TX); });
        if (look.silk === 'stripe') OMK3D_GOSHIKI.forEach(function(c, i) { g.fillStyle = c; g.fillRect(9.4 + i * 9.04, 0, 9.1, 120); });
        else { g.fillStyle = look.silk; g.fillRect(0, 0, 80, 120); }
        k.fillStyle = '#000'; k.fillRect(0, 0, 80, 120);
        var both = function(col, fn) { [[g, col], [k, '#fff']].forEach(function(c) { c[0].save(); c[0].strokeStyle = c[0].fillStyle = c[1]; fn(c[0], c[0] === g); c[0].restore(); }); };
        both(look.patCol, function(c, isG) {
            c.globalAlpha = isG ? look.patOp : .55; c.lineWidth = .32;
            var p = look.pat, x, y, a, r;
            if (p === 'seigaiha') { for (y = 18; y < 110; y += 2.6) for (x = 6 + ((y / 2.6) % 2) * 2.6; x < 60; x += 5.2) for (r = 2.6; r > .5; r -= .85) { c.beginPath(); c.arc(x, y, r, Math.PI, 2 * Math.PI); c.stroke(); } }
            else if (p === 'asanoha') { for (y = 18; y < 110; y += 4.4) for (x = 6 + ((y / 4.4) % 2) * 2.55; x < 60; x += 5.1) for (a = 0; a < 6; a++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2.9 * Math.cos(a * Math.PI / 3 + Math.PI / 6), y + 2.9 * Math.sin(a * Math.PI / 3 + Math.PI / 6)); c.stroke(); } }
            else if (p === 'kikko') { for (y = 18; y < 110; y += 4.6) for (x = 6 + ((y / 4.6) % 2) * 2.7; x < 60; x += 5.4) { c.beginPath(); for (a = 0; a < 7; a++) { var px = x + 2.4 * Math.cos(a * Math.PI / 3), py = y + 2.4 * Math.sin(a * Math.PI / 3); a ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); } }
            else if (p === 'hoshi' || p === 'hana') { for (y = 18; y < 110; y += 4) for (x = 6 + ((y / 4) % 2) * 2.5; x < 60; x += 5) { c.beginPath(); for (a = 0; a < 10; a++) { var rr = a % 2 ? .55 : 1.3, an = a * Math.PI / 5 - Math.PI / 2; a ? c.lineTo(x + rr * Math.cos(an), y + rr * Math.sin(an)) : c.moveTo(x + rr * Math.cos(an), y + rr * Math.sin(an)); } c.closePath(); c.fill(); } }
            else if (p === 'stripe') {}
            else { for (y = 18; y < 110; y += 3.4) for (x = 6; x < 60; x += 3.4) { c.beginPath(); c.arc(x, y, 1.7, 0, 2 * Math.PI); c.stroke(); } }
        });
        g.save(); g.globalAlpha = .06; g.strokeStyle = '#fff'; g.lineWidth = .12;
        for (var d = -120; d < 120; d += .55) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + 120, 120); g.stroke(); } g.restore();
        both(look.border, function(c) { c.lineWidth = .32; c.setLineDash([1.2, .7]); c.globalAlpha = .9; c.beginPath();
            omk3dShape.outline.forEach(function(p, i) { var q = [32 + (p[0] - 32) * .9, 63 + (p[1] - 63) * .93]; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.stroke(); });
        if (front) {
            g.fillStyle = look.panel; g.fillRect(19, 42, 26, 52); k.fillStyle = '#000'; k.fillRect(19, 42, 26, 52);
            both(look.border, function(c) { c.lineWidth = .7; c.strokeRect(19, 42, 26, 52); c.lineWidth = .3; c.strokeRect(20.6, 43.6, 22.8, 48.8); });
            var font = (getComputedStyle(document.documentElement).getPropertyValue('--omk-font') || '').trim() || '"Shippori Mincho", serif';
            both(look.thread, function(c, isG) {
                c.font = '800 10.6px ' + font; c.textAlign = 'center'; c.textBaseline = 'middle';
                label.split('').forEach(function(ch, i) {
                    if (isG) { c.save(); c.globalAlpha = .4; c.fillStyle = '#000'; c.fillText(ch, 32.3, 53.3 + i * 14.2); c.restore(); c.fillStyle = look.thread; }
                    c.fillText(ch, 32, 53 + i * 14.2);
                });
            });
        }
        return [cv, mk];
    }

    // ---- a model in a canvas. opts: { look, label, interactive, spin, dist, yaw, pitch, entrance } ----
    function omk3dModel(canvas, opts) {
        var gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
        if (!gl || !gl.getExtension('OES_element_index_uint')) return null;
        var VS = 'attribute vec3 p; attribute vec3 n; attribute vec2 uv; uniform mat4 vp; uniform mat4 mdl; varying vec3 vN; varying vec3 vP; varying vec2 vUv;' +
            'void main(){ vec4 w = mdl * vec4(p,1.0); vN = mat3(mdl) * n; vP = w.xyz; vUv = uv; gl_Position = vp * w; }';
        var FS = 'precision highp float; varying vec3 vN; varying vec3 vP; varying vec2 vUv; uniform vec3 eye; uniform vec3 base; uniform sampler2D tex; uniform sampler2D mask; uniform float useTex; uniform float cord;' +
            'void main(){ vec3 N = normalize(vN); vec3 V = normalize(eye - vP); if (dot(N,V) < 0.0) N = -N; vec3 col = base; float m = 0.0;' +
            ' if (useTex > 0.5) { col = texture2D(tex, vUv).rgb; m = texture2D(mask, vUv).r; }' +
            ' if (cord > 0.5) { float b = sin(vUv.x * 2.6 + vUv.y * 12.566); col *= 0.82 + 0.18 * smoothstep(-0.6, 0.9, b); }' +
            ' vec3 L1 = normalize(vec3(0.55,0.7,0.9)), L2 = normalize(vec3(-0.8,0.2,0.5)), L3 = normalize(vec3(0.0,0.5,-1.0));' +
            ' float hemi = 0.5 + 0.5 * N.y; vec3 amb = mix(vec3(0.20,0.17,0.16), vec3(0.42,0.40,0.38), hemi);' +
            ' vec3 lit = col * (amb + vec3(1.0,0.96,0.9) * max(dot(N,L1),0.0) * 0.95 + vec3(0.75,0.8,0.95) * max(dot(N,L2),0.0) * 0.35 + vec3(1.0) * max(dot(N,L3),0.0) * 0.25);' +
            ' vec3 H = normalize(L1 + V); float sp = pow(max(dot(N,H),0.0), mix(18.0, 60.0, m));' +
            ' vec3 sc = mix(vec3(0.22), col * 1.6 + 0.15, m); if (cord > 0.5) sc = vec3(0.35); lit += sc * sp;' +
            ' lit += col * pow(1.0 - max(dot(N,V),0.0), 2.5) * (cord > 0.5 ? 0.25 : 0.55);' +
            ' gl_FragColor = vec4(pow(lit, vec3(0.92)), 1.0); }';
        function shd(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
        var prog = gl.createProgram(); gl.attachShader(prog, shd(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shd(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
        gl.useProgram(prog);
        var loc = {}; ['p', 'n', 'uv'].forEach(function(a) { loc[a] = gl.getAttribLocation(prog, a); });
        ['vp', 'mdl', 'eye', 'base', 'tex', 'mask', 'useTex', 'cord'].forEach(function(u) { loc[u] = gl.getUniformLocation(prog, u); });
        var bufs = [];
        function upload(m) {
            var o = { n: m.i.length, b: {} };
            [['p', m.p, 3], ['n', m.n, 3], ['uv', m.uv, 2]].forEach(function(a) { var b = gl.createBuffer(); bufs.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a[1]), gl.STATIC_DRAW); o.b[a[0]] = [b, a[2]]; });
            o.ib = gl.createBuffer(); bufs.push(o.ib); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(m.i), gl.STATIC_DRAW);
            return o;
        }
        function texOf(cv) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cv);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
        var geo = omk3dGeometry(), front = upload(geo.front), back = upload(geo.back), cordM = upload(geo.cord);
        var f = omk3dCloth(opts.look, opts.label, true), b = omk3dCloth(opts.look, opts.label, false);
        var tx = { f: texOf(f[0]), fm: texOf(f[1]), b: texOf(b[0]), bm: texOf(b[1]) };
        var yaw = opts.yaw == null ? -0.4 : opts.yaw, pitch = opts.pitch == null ? 0.1 : opts.pitch, dist = opts.dist || 7.6, idle = 1e9, last = 0, raf = 0, t0 = 0, dead = false;
        var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        var norm = function(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
        var cr = function(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
        function look(e, c) { var z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cr([0, 1, 0], z)), y = cr(z, x);
            return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]; }
        function mm(a, b) { var o = new Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
        function persp(f, a, n, fa) { var t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]; }
        function draw(mesh, t, mk, base, isCord) {
            gl.uniform1f(loc.useTex, t ? 1 : 0); gl.uniform1f(loc.cord, isCord ? 1 : 0); gl.uniform3fv(loc.base, base || [1, 1, 1]);
            if (t) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc.tex, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mk); gl.uniform1i(loc.mask, 1); }
            ['p', 'n', 'uv'].forEach(function(a) { gl.bindBuffer(gl.ARRAY_BUFFER, mesh.b[a][0]); gl.enableVertexAttribArray(loc[a]); gl.vertexAttribPointer(loc[a], mesh.b[a][1], gl.FLOAT, false, 0, 0); });
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib); gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_INT, 0);
        }
        function size() { var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h;
                // fit: the whole お守り, its hanging loop included, inside the canvas whatever its shape
                if (opts.fit && !zoomed) { var tn = Math.tan(0.31); dist = Math.max(6.6 / (2 * tn), 2.7 / (2 * tn * (w / h))); } } }
        function frame(t) {
            if (dead) return;
            if (!t0) t0 = t;
            var dt = Math.min(50, t - (last || t)); last = t; idle += dt;
            if (opts.spin && !reduce) yaw += dt * 0.00035;
            size();
            // entrance: the お守り drops in with a turn, then settles with a small swing on its cord
            var s = 1, sw = 0, drop = 0;
            if (opts.entrance && !reduce) { var k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
                s = 0.4 + 0.6 * e; drop = (1 - e) * 1.6; yaw = opts.yaw - (1 - e) * 2.4; sw = Math.sin((t - t0) / 260) * Math.exp(-(t - t0) / 900) * 0.18; }
            var c = Math.cos(sw), sn = Math.sin(sw);
            var mdl = [s * c, s * sn, 0, 0, -s * sn, s * c, 0, 0, 0, 0, s, 0, 0, drop, 0, 1];
            var tgt = [0, opts.ty == null ? 0.55 : opts.ty, 0], eye = [dist * Math.sin(yaw) * Math.cos(pitch), tgt[1] + dist * Math.sin(pitch), dist * Math.cos(yaw) * Math.cos(pitch)];
            gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
            gl.uniformMatrix4fv(loc.vp, false, new Float32Array(mm(persp(0.62, canvas.width / canvas.height, 0.1, 50), look(eye, tgt))));
            gl.uniformMatrix4fv(loc.mdl, false, new Float32Array(mdl));
            gl.uniform3fv(loc.eye, eye);
            draw(front, tx.f, tx.fm); draw(back, tx.b, tx.bm); draw(cordM, null, null, OMK3D_CORD[opts.look.cord] || OMK3D_CORD.red, true);
            raf = requestAnimationFrame(frame);
        }
        // drag to turn, pinch or wheel to come closer
        var ptrs = {}, pinch0 = 0, dist0 = dist, handlers = [], tap = null, zoomed = false;
        function on(el, ev, fn, o) { el.addEventListener(ev, fn, o); handlers.push([el, ev, fn, o]); }
        if (opts.interactive) {
            on(canvas, 'pointerdown', function(e) { try { canvas.setPointerCapture(e.pointerId); } catch (er) {} ptrs[e.pointerId] = [e.clientX, e.clientY]; idle = 0; opts.entrance = false; tap = { x: e.clientX, y: e.clientY, wasSpinning: opts.spin }; opts.spin = false;
                var k = Object.keys(ptrs); if (k.length === 2) { pinch0 = Math.hypot(ptrs[k[0]][0] - ptrs[k[1]][0], ptrs[k[0]][1] - ptrs[k[1]][1]); dist0 = dist; } });
            on(canvas, 'pointermove', function(e) {
                if (!ptrs[e.pointerId]) return; var o = ptrs[e.pointerId], k = Object.keys(ptrs); ptrs[e.pointerId] = [e.clientX, e.clientY]; idle = 0;
                if (k.length === 2) { var d = Math.hypot(ptrs[k[0]][0] - ptrs[k[1]][0], ptrs[k[0]][1] - ptrs[k[1]][1]); if (pinch0) { dist = Math.max(3, Math.min(18, dist0 * pinch0 / d)); zoomed = true; } return; }
                yaw -= (e.clientX - o[0]) * 0.008; pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - o[1]) * 0.006));
            });
            ['pointerup', 'pointercancel'].forEach(function(tp) { on(canvas, tp, function(e) {
                if (tp === 'pointerup' && tap && Object.keys(ptrs).length === 1 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 6 && !tap.wasSpinning) opts.spin = true;
                tap = null; delete ptrs[e.pointerId]; pinch0 = 0; }); });
            on(canvas, 'wheel', function(e) { e.preventDefault(); dist = Math.max(3, Math.min(18, dist * (1 + e.deltaY * 0.001))); zoomed = true; idle = 0; }, { passive: false });
        }
        raf = requestAnimationFrame(frame);
        return {
            destroy: function() {
                if (dead) return; dead = true; cancelAnimationFrame(raf);
                handlers.forEach(function(h) { h[0].removeEventListener(h[1], h[2], h[3]); });
                [tx.f, tx.fm, tx.b, tx.bm].forEach(function(t) { gl.deleteTexture(t); }); bufs.forEach(function(b) { gl.deleteBuffer(b); });
                canvas.style.visibility = 'hidden';     // a lost context would show as a blank white box while the screen fades
                var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
            }
        };
    }

    // ---- the full-screen viewer: tap an お守り (home, 御朱印帳, the slip's お守り box) to look at it closely ----
    var omk3dOpen = null;
    function omkOpen3D(entry, key) {
        if (!entry || !entry.kept) return;
        omkClose3D();
        var look = omk3dLook(entry.oma || omkOmaKind(key), entry.omaR), label = entry.s === 'jlpt' ? '合格守' : '学業守';
        var v = document.createElement('div');
        v.className = 'omk3d'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', look.name);
        v.innerHTML = '<p class="omk3d-lead">' + (key ? omkDateLabel(key) + 'の' : '') + escapeHtml(look.name) + '</p>' +
            '<div class="omk3d-stage"><canvas aria-label="' + escapeHtml(look.name) + '。ドラッグで回せます"></canvas></div>' +
            '<p class="omk3d-hint">ドラッグで回す・タップで自動回転</p>' +
            '<div class="omk-actions"><button class="omk-btn ghost omk3d-back">戻る</button></div>';
        document.body.appendChild(v);
        var model = omk3dModel(v.querySelector('canvas'), { look: look, label: label, interactive: true, spin: true, fit: true, ty: 1.15, yaw: -0.4, pitch: 0.1 });
        if (!model) v.querySelector('.omk3d-stage').innerHTML = '<div class="omk3d-flat">' + omkOmamoriSvg(150, label, entry.oma || omkOmaKind(key), entry.omaR) + '</div>';
        var esc = function(e) { if (e.key === 'Escape') { e.stopPropagation(); omkClose3D(); } };
        document.addEventListener('keydown', esc, true);
        omk3dOpen = { el: v, model: model, esc: esc };
        v.querySelector('.omk3d-back').addEventListener('click', omkClose3D);
        requestAnimationFrame(function() { v.classList.add('show'); });
        v.querySelector('.omk3d-back').focus({ preventScroll: true });
    }
    function omkClose3D() {
        if (!omk3dOpen) return;
        var o = omk3dOpen; omk3dOpen = null;
        if (o.model) o.model.destroy();
        document.removeEventListener('keydown', o.esc, true);
        o.el.classList.remove('show');
        setTimeout(function() { if (o.el.parentNode) o.el.parentNode.removeChild(o.el); }, 220);
    }

