// ===================== オンライン保存 (GitHub Gist) =====================
// Everything Mogi keeps lives in localStorage under "jlpt…" keys. With a GitHub key (a token that may only use
// gists) pasted into 設定 › データ, every change is also copied into one secret gist, "mogi.json", and a device
// that opens Mogi with older or missing data is filled from it. Each item is kept separately with the time it
// last changed, so studying on two devices does not wipe either out: for one item, the newer change wins.
(function() {
    var TOKEN = 'mogiGistToken', GIST = 'mogiGistId', SYNCED = 'mogiGistSynced', DIRTY = 'mogiGistDirty', SEEN = 'mogiGistSeen';
    var FILE = 'mogi.json', DESC = 'Mogi save data (JLPT N1)';
    var SKIP = { jlptReadingCache: 1 };
    var isKey = function(k) { return k && k.indexOf('jlpt') === 0 && !SKIP[k]; };
    var ls = window.localStorage, rawGet = Storage.prototype.getItem, rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
    var get = function(k) { try { return rawGet.call(ls, k); } catch (e) { return null; } };
    var put = function(k, v) { try { rawSet.call(ls, k, v); } catch (e) {} };
    var drop = function(k) { try { rawRemove.call(ls, k); } catch (e) {} };
    var getMap = function(k) { try { return JSON.parse(get(k) || '{}') || {}; } catch (e) { return {}; } };
    var synced = getMap(SYNCED), dirty = getMap(DIRTY);
    var saveMarks = function() { put(SYNCED, JSON.stringify(synced)); put(DIRTY, JSON.stringify(dirty)); };

    var S = window.mogiCloud = { state: 'off', savedAt: +(get(SEEN) || 0), error: '' };
    var status = function(st, err) { S.state = st; S.error = err || ''; if (st !== 'error') S.detail = null; try { document.dispatchEvent(new CustomEvent('mogi-cloud')); } catch (e) {} };
    var token = function() { return (get(TOKEN) || '').trim(); };
    var ready = false, timer = null, busy = Promise.resolve(), hiddenAt = 0;
    // GitHub allows 5,000 requests an hour. Keep well under it, even with Mogi open all day on several devices:
    // at most one save a minute, the study timers (which change every few seconds) only ride along with real
    // changes, and the gist is re-read before a save only when the copy in hand is a few minutes old.
    var TICK = { jlptTimeSpent: 1, jlptDayTimer: 1, jlptReadTimer: 1 };
    var lastPushAt = 0, lastRemote = null, lastRemoteAt = 0, blockedUntil = 0, MIN_GAP = 60000;
    function schedule(ms) { clearTimeout(timer); timer = setTimeout(push, Math.max(ms || 15000, lastPushAt + MIN_GAP - Date.now())); }

    // note every real change (the same value written again is not a change)
    function note(k) {
        if (!isKey(k) || !token()) return;
        dirty[k] = Date.now(); saveMarks();
        if (ready && !TICK[k] && k.indexOf('jlptStudyTime') !== 0) schedule(15000);
    }
    Storage.prototype.setItem = function(k, v) {
        var before = this === ls ? rawGet.call(this, k) : null;
        rawSet.call(this, k, v);
        if (this === ls && before !== String(v)) note(k);
    };
    Storage.prototype.removeItem = function(k) {
        var had = this === ls && rawGet.call(this, k) !== null;
        rawRemove.call(this, k);
        if (had) note(k);
    };
    var keysNow = function() { var out = []; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (isKey(k)) out.push(k); } return out; };

    // ---- GitHub ----
    function api(path, opts) {
        opts = opts || {};
        var h = { 'Authorization': 'token ' + token(), 'Accept': 'application/vnd.github+json' };
        if (opts.body) h['Content-Type'] = 'application/json';
        return fetch('https://api.github.com' + path, { method: opts.method || 'GET', headers: h, body: opts.body, cache: 'no-store' }).then(function(r) {
            if (r.ok) return r.json();
            // keep what GitHub said, so the 設定 line can show it
            return r.text().then(function(t) {
                var msg = ''; try { msg = (JSON.parse(t) || {}).message || ''; } catch (e) { msg = String(t || '').slice(0, 120); }
                var limited = r.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(msg);
                var code = r.status === 401 ? 'badkey' : limited ? 'limited' : r.status === 404 && opts.gist ? 'gone' : (r.status === 403 || r.status === 404) ? 'denied' : 'http';
                throw { code: code, status: r.status, msg: msg, reset: +(r.headers.get('x-ratelimit-reset') || 0), step: (opts.method || 'GET') + ' ' + path.replace(/\/gists\/[0-9a-f]+/, '/gists/…') };
            });
        }, function() { throw { code: 'offline' }; });
    }
    // find the gist (remembered, or by its description), or make it
    function findGist() {
        var id = get(GIST);
        if (id) return api('/gists/' + id, { gist: true }).catch(function(e) { if (e.code === 'gone') { drop(GIST); return findGist(); } throw e; });
        return api('/gists?per_page=100').then(function(list) {
            var g = (list || []).filter(function(x) { return x.description === DESC && x.files && x.files[FILE]; })[0];
            if (g) { put(GIST, g.id); return api('/gists/' + g.id, { gist: true }); }
            return api('/gists', { method: 'POST', body: JSON.stringify({ description: DESC, public: false, files: { 'mogi.json': { content: JSON.stringify({ v: 1, t: 0, keys: {} }) } } }) })
                .then(function(g2) { put(GIST, g2.id); return g2; });
        });
    }
    function readRemote() {
        return findGist().then(function(g) {
            var f = g.files && g.files[FILE];
            if (!f) return { v: 1, t: 0, keys: {} };
            var text = f.truncated ? fetch(f.raw_url, { cache: 'no-store' }).then(function(r) { return r.text(); }) : Promise.resolve(f.content);
            return text.then(function(t) { try { var d = JSON.parse(t); return d && d.keys ? d : { v: 1, t: 0, keys: {} }; } catch (e) { return { v: 1, t: 0, keys: {} }; } });
        });
    }

    // send the changed items: read the gist first so another device's newer items are kept
    function push(force) {
        if (!ready || !token()) return busy;
        var now = Date.now();
        if (now < blockedUntil) { clearTimeout(timer); timer = setTimeout(push, blockedUntil - now + 5000); return busy; }
        if (!force && now - lastPushAt < MIN_GAP) { schedule(); return busy; }
        clearTimeout(timer);
        busy = busy.then(function() {
            var send = Object.keys(dirty);
            if (!send.length) return;
            lastPushAt = Date.now();
            status('saving');
            var fresh = lastRemote && Date.now() - lastRemoteAt < 3 * 60000;
            return (fresh ? Promise.resolve(JSON.parse(JSON.stringify(lastRemote))) : readRemote()).then(function(remote) {
                var marks = {};
                send.forEach(function(k) {
                    marks[k] = dirty[k];
                    if ((remote.keys[k] && remote.keys[k].t || 0) > dirty[k]) return;      // newer from another device: theirs wins
                    var v = get(k);
                    remote.keys[k] = { t: dirty[k], v: v };                                    // v null = removed
                });
                remote.t = Date.now(); remote.v = 1;
                return api('/gists/' + get(GIST), { method: 'PATCH', gist: true, body: JSON.stringify({ files: { 'mogi.json': { content: JSON.stringify(remote) } } }) }).then(function() {
                    send.forEach(function(k) { synced[k] = remote.keys[k] ? remote.keys[k].t : marks[k]; if (dirty[k] === marks[k]) delete dirty[k]; });
                    saveMarks(); S.savedAt = remote.t; put(SEEN, String(remote.t)); status('on');
                    lastRemote = remote; lastRemoteAt = Date.now();
                });
            });
        }).catch(function(e) {
            S.detail = e; status('error', e && e.code); lastRemote = null;
            if (e && e.code === 'limited') blockedUntil = Math.max(Date.now() + 15 * 60000, (e.reset || 0) * 1000);
            clearTimeout(timer); timer = setTimeout(push, e && e.code === 'limited' ? blockedUntil - Date.now() + 5000 : 2 * 60000);
        });
        return busy;
    }

    // bring this device up to date; reload when something came in
    function pull(first) {
        status('connecting');
        return readRemote().then(function(remote) {
            var R = remote.keys, got = [], gone = [];
            var fresh = !Object.keys(synced).length;           // this device has not synced yet (or was just reconnected)
            if (fresh) {
                // Which side has the newer studying? The one whose answer history goes further wins.
                // (Reconnecting the phone you study on must not bring back an older online copy.)
                var lastT = function(json) { try { var a = JSON.parse(json || '[]'); return a.reduce(function(mx, x) { return Math.max(mx, x && x.t || 0); }, 0); } catch (e) { return 0; } };
                var mineLast = lastT(get('jlptAttempts')), theirsLast = lastT(R.jlptAttempts && R.jlptAttempts.v);
                if (mineLast && mineLast >= theirsLast) {
                    keysNow().forEach(function(k) { dirty[k] = Date.now(); });
                    saveMarks(); ready = true; S.savedAt = remote.t || S.savedAt; status('on');
                    lastRemote = remote; lastRemoteAt = Date.now();
                    push(true);
                    return false;
                }
                // the online copy is newer: keep this device's data aside first, so nothing is lost for good
                var keep = {}; keysNow().forEach(function(k) { keep[k] = get(k); });
                try { put('mogiBeforeSync', JSON.stringify({ t: Date.now(), data: keep })); } catch (e) {}
            }
            Object.keys(R).forEach(function(k) {
                var r = R[k], mine = dirty[k] || 0;
                if (fresh || (r.t > (synced[k] || 0) && !(mine > r.t))) {
                    if (r.v === null) { if (get(k) !== null) gone.push(k); } else if (get(k) !== r.v) got.push(k);
                    synced[k] = r.t; delete dirty[k];
                }
            });
            // items only here are sent up
            keysNow().forEach(function(k) { if (!R[k] && !(k in synced)) dirty[k] = dirty[k] || Date.now(); });
            saveMarks();
            if (got.length || gone.length) {
                got.forEach(function(k) { put(k, R[k].v); });
                gone.forEach(function(k) { drop(k); });
                try { sessionStorage.setItem('mogiRestored', '1'); } catch (e) {}
                location.reload();
                return true;
            }
            ready = true; S.savedAt = remote.t || S.savedAt; status('on');
            if (Object.keys(dirty).length) push();
            return false;
        }).catch(function(e) {
            ready = true; S.detail = e; status('error', e && e.code);
            if (e && e.code === 'limited') { blockedUntil = Math.max(Date.now() + 15 * 60000, (e.reset || 0) * 1000); schedule(blockedUntil - Date.now() + 5000); }
        });
    }

    // ---- connect / disconnect from 設定 ----
    window.mogiGist = {
        connect: function(key) {
            key = (key || '').trim();
            if (!/^(ghp_|github_pat_|gho_)/.test(key)) return Promise.reject({ code: 'format' });
            put(TOKEN, key); drop(GIST); synced = {}; dirty = {}; saveMarks();
            return pull(true);
        },
        disconnect: function() { [TOKEN, GIST, SYNCED, DIRTY, SEEN].forEach(drop); synced = {}; dirty = {}; ready = false; S.savedAt = 0; status('off'); },
        saveNow: function() { return push(true); },
        connected: function() { return !!token(); }
    };
    document.addEventListener('visibilitychange', function() {
        if (!token()) return;
        if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); if (ready && Date.now() - lastPushAt > 20000) push(true); }
        else if (hiddenAt && Date.now() - hiddenAt > 20 * 60000 && !Object.keys(dirty).length) { hiddenAt = 0; pull(); }   // back after a while: anything new from another device?
    });
    window.addEventListener('pagehide', function() { if (ready && token() && Date.now() - lastPushAt > 20000) push(true); });
    if (token()) pull(true);
})();
// 設定 › データ: the オンライン保存 box
(function() {
    var fmt = function(t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var ERR = { offline: 'GitHubにつながりません（インターネットやVPNを確認してください）。つながったら自動で保存します。', badkey: 'キーが使えません。期限切れか、入力ミスの可能性があります。新しいキーを作って貼り直してください。',
                denied: 'GitHubに断られました。キーに「gist」の権限がないか、ほかの理由で使えない状態です。', limited: 'GitHubの利用回数の上限に達しました。しばらくしてから自動でもう一度保存します。', format: 'ghp_ で始まるキーを貼り付けてください。' };
    function paint() {
        var c = window.mogiCloud, on = window.mogiGist && window.mogiGist.connected();
        var off = document.getElementById('gist-off'), onEl = document.getElementById('gist-on'), st = document.getElementById('gist-status');
        if (!off) return;
        off.hidden = on; onEl.hidden = !on;
        if (!on) return;
        st.textContent = c.state === 'connecting' ? '接続中…' : c.state === 'saving' ? '保存中…'
            : c.state === 'error' ? (ERR[c.error] || 'いまは保存できません。あとで自動でもう一度保存します。') +
                (c.detail && c.detail.status ? '（GitHubの返事：' + c.detail.status + (c.detail.msg ? ' ' + c.detail.msg : '') + '／' + c.detail.step + '）' : '')
            : 'オン' + (c.savedAt ? '（最終保存 ' + fmt(c.savedAt) + '）' : '') + '。変更は自動でGitHubにも保存されます。';
        st.classList.toggle('gist-err', c.state === 'error');
    }
    document.addEventListener('mogi-cloud', paint);
    document.addEventListener('DOMContentLoaded', function() {
        paint();
        var inp = document.getElementById('gist-key'), go = document.getElementById('gist-connect'), msg = document.getElementById('gist-msg');
        if (!go) return;
        go.addEventListener('click', function() {
            msg.textContent = '接続中…';
            window.mogiGist.connect(inp.value).then(function() { inp.value = ''; msg.textContent = ''; paint(); },
                function(e) { msg.textContent = ERR[e && e.code] || 'つながりませんでした。'; });
        });
        document.getElementById('gist-save-now').addEventListener('click', function() { window.mogiGist.saveNow(); });
        document.getElementById('gist-disconnect').addEventListener('click', function() {
            var b = this;
            if (b.dataset.sure) { window.mogiGist.disconnect(); delete b.dataset.sure; b.textContent = '解除'; paint(); return; }
            b.dataset.sure = '1'; b.textContent = 'もう一度押すと解除'; setTimeout(function() { delete b.dataset.sure; b.textContent = '解除'; }, 4000);
        });
    });
    var restored = false;
    try { restored = !!sessionStorage.getItem('mogiRestored'); sessionStorage.removeItem('mogiRestored'); } catch (e) {}
    if (restored) setTimeout(function() { if (typeof showToast === 'function') showToast('オンラインの保存データから復元しました'); }, 2500);
})();

