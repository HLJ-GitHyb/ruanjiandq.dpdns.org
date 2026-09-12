/* ============================================================
   软件大全 · 前端逻辑
   数据与文件全部存放在 Supabase 云端，所有访客共享同一份数据。
   本文件不含任何密钥以外的敏感信息；SUPABASE_ANON_KEY 是可公开的前端密钥。
   ============================================================ */

/* SECTION: config —— 部署时只需修改下面两行 */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://hjlgailxkktdwrfjmftl.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_Yh8QS0wFUW4jGurdyz_HZw_xNvXXvmN',
  STORAGE_BUCKET: 'software-files',
  MAX_UPLOAD_MB: 50
};

(function () {
  'use strict';

  /* SECTION: constants */
  var CFG = window.APP_CONFIG || {};
  var PAGE_SIZE = 12;
  var CATS = ['开发工具', '办公软件', '设计创意', '媒体影音', '系统工具', '网络安全', '学习教育', '游戏娱乐', '其他'];
  var PLATS = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', '跨平台', '网页版'];
  var GRADS = [
    'linear-gradient(135deg,#22d3ee,#3b82f6)',
    'linear-gradient(135deg,#a78bfa,#6366f1)',
    'linear-gradient(135deg,#34d399,#059669)',
    'linear-gradient(135deg,#fbbf24,#f59e0b)',
    'linear-gradient(135deg,#f472b6,#db2777)',
    'linear-gradient(135deg,#60a5fa,#2563eb)',
    'linear-gradient(135deg,#f87171,#dc2626)',
    'linear-gradient(135deg,#2dd4bf,#0d9488)'
  ];

  /* SECTION: state */
  var S = {
    ready: false,
    user: null,
    nickname: '',
    items: [],
    view: 'library',
    q: '',
    cat: '',
    plat: '',
    sort: 'new',
    shown: PAGE_SIZE,
    loading: false,
    busy: false,
    authMode: 'login',
    dlMode: 'link',
    picked: null,
    detail: null
  };

  var sb = null;

  /* SECTION: dom-helpers */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var PATHS = {
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    gauge: '<path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l5-5"/><circle cx="12" cy="12" r="1"/>',
    tag: '<path d="M20.59 13.41 12 22l-9-9V3h10z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
  };

  function icon(name) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = PATHS[name] || PATHS.info;
    return s;
  }

  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'hidden') n.hidden = !!v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      }
    }
    if (kids) {
      var arr = Array.isArray(kids) ? kids : [kids];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === null || arr[i] === undefined || arr[i] === false) continue;
        n.appendChild(typeof arr[i] === 'string' ? document.createTextNode(arr[i]) : arr[i]);
      }
    }
    return n;
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s === null || s === undefined ? '' : s); }

  /* SECTION: utils */
  function fmtSize(bytes) {
    var n = Number(bytes);
    if (!n || n <= 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }

  function fmtNum(n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    if (n < 10000) return (n / 1000).toFixed(1) + 'k';
    return Math.round(n / 1000) + 'k';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var diff = Date.now() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 2592000000) return Math.floor(diff / 86400000) + ' 天前';
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function gradFor(name) {
    var str = String(name || ''), h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return GRADS[h % GRADS.length];
  }

  function initial(name) {
    var str = String(name || '?').trim();
    if (!str) return '?';
    var ch = Array.from(str)[0];
    return /[a-zA-Z]/.test(ch) ? ch.toUpperCase() : ch;
  }

  function isSafeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s);
  }

  /* SECTION: toast */
  function toast(msg, kind) {
    kind = kind || 'info';
    var box = $('toasts');
    var t = el('div', { class: 'toast ' + kind, role: 'status' }, [icon(kind === 'ok' ? 'check' : kind === 'err' ? 'alert' : kind === 'warn' ? 'warn' : 'info'), el('div', { text: esc(msg) })]);
    box.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 240);
    }, kind === 'err' ? 5200 : 3000);
  }

  /* SECTION: modal */
  var openMask = null;
  function showModal(id) {
    if (openMask && openMask !== id) hideModal(openMask);
    var m = $(id);
    m.classList.add('on');
    openMask = id;
    document.body.style.overflow = 'hidden';
    var f = m.querySelector('input:not([type=hidden]),select,textarea,button.btn-p');
    if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 120);
  }
  function hideModal(id) {
    var m = $(id || openMask);
    if (!m) return;
    m.classList.remove('on');
    if (openMask === (id || openMask)) openMask = null;
    if (!$('.msk.on')) document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest ? e.target.closest('[data-close]') : null;
    if (c) { e.preventDefault(); hideModal(c.getAttribute('data-close')); return; }
    if (e.target.classList && e.target.classList.contains('msk') && e.target.classList.contains('on')) hideModal(e.target.id);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openMask) hideModal(openMask);
  });

  var confirmCb = null;
  function askConfirm(title, text, onOk) {
    $('cfTitle').textContent = title;
    $('cfText').textContent = text;
    confirmCb = onOk;
    showModal('mskConfirm');
  }
  $('btnConfirmOk').addEventListener('click', function () {
    var cb = confirmCb;
    confirmCb = null;
    hideModal('mskConfirm');
    if (cb) cb();
  });

  /* SECTION: config-check */
  function isConfigured() {
    var u = String(CFG.SUPABASE_URL || ''), k = String(CFG.SUPABASE_ANON_KEY || '');
    if (u.indexOf('在这里粘贴') !== -1 || k.indexOf('在这里粘贴') !== -1) return false;
    if (!/^https:\/\/[a-z0-9\-]+\.supabase\.(co|in|net|io)/i.test(u)) return false;
    return k.length > 30;
  }

  /* SECTION: data-access */
  function flatten(rows) {
    return (rows || []).map(function (r) {
      var p = r.profiles;
      if (Array.isArray(p)) p = p[0];
      var nick = (p && p.nickname) || '匿名发布者';
      return {
        id: r.id,
        name: r.name,
        description: r.description || '',
        category: r.category || '其他',
        platform: r.platform || 'Windows',
        version: r.version || '',
        size_text: r.size_text || '',
        size_bytes: r.size_bytes || 0,
        download_type: r.download_type || 'link',
        download_url: r.download_url || '',
        storage_path: r.storage_path || '',
        file_name: r.file_name || '',
        downloads: r.downloads || 0,
        created_at: r.created_at,
        user_id: r.user_id,
        publisher: nick
      };
    });
  }

  function loadItems() {
    S.loading = true;
    renderList();
    return sb.from('software')
      .select('*, profiles(nickname)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(function (res) {
        if (res.error) throw res.error;
        S.items = flatten(res.data);
        S.loading = false;
        renderStats();
        renderPlatOptions();
        renderList();
      })
      .catch(function (err) {
        S.loading = false;
        renderList();
        toast('读取软件列表失败：' + errHint(err), 'err');
      });
  }

  function errHint(err) {
    var m = String((err && err.message) || err || '未知错误');
    if (/relation .* does not exist/i.test(m)) return '数据表还没建好，请先执行《部署指南》里的建库 SQL';
    if (/row-level security/i.test(m) || /permission denied/i.test(m)) return '数据库权限策略未生效，请检查 SQL 是否完整执行';
    if (/Invalid login credentials/i.test(m)) return '邮箱或密码不正确';
    if (/already registered/i.test(m)) return '这个邮箱已经注册过了，请直接登录';
    if (/Failed to fetch|NetworkError|CORS/i.test(m)) return '网络连不上 Supabase，请检查网址是否填对，或在后台把本站域名加入白名单';
    if (/exceeds|too large|maximum/i.test(m)) return '文件太大，超出免费版存储限制，请改用下载链接方式';
    if (/Bucket not found/i.test(m)) return '存储桶还没创建，请按《部署指南》建立 software-files 桶';
    return m;
  }

  function loadMe() {
    return sb.auth.getSession().then(function (res) {
      var sess = res.data && res.data.session;
      if (!sess || !sess.user) { S.user = null; S.nickname = ''; return; }
      S.user = sess.user;
      return sb.from('profiles').select('nickname').eq('id', sess.user.id).maybeSingle().then(function (r) {
        S.nickname = (r.data && r.data.nickname) || (sess.user.user_metadata && sess.user.user_metadata.nickname) || '匿名发布者';
      });
    }).catch(function () { S.user = null; });
  }

  /* SECTION: render-header */
  function renderAuth() {
    var logged = !!S.user;
    $('meBox').hidden = !logged;
    $('btnLogout').hidden = !logged;
    $('btnAuth').hidden = logged;
    if (logged) {
      $('meAvatar').textContent = initial(S.nickname);
      $('meName').textContent = S.nickname;
      $('btnAuth').textContent = '登录';
    }
    $('btnPublish').querySelector('span').textContent = logged ? '发布软件' : '登录后可发布';
  }

  function renderStats() {
    var total = S.items.length;
    var down = 0, seen = {}, users = 0;
    for (var i = 0; i < S.items.length; i++) {
      down += Number(S.items[i].downloads) || 0;
      if (S.items[i].user_id && !seen[S.items[i].user_id]) { seen[S.items[i].user_id] = 1; users++; }
    }
    $('stTotal').textContent = fmtNum(total);
    $('stDown').textContent = fmtNum(down);
    $('stUser').textContent = fmtNum(users);
  }

  function renderChips() {
    var box = $('catChips');
    box.textContent = '';
    var all = el('button', { class: 'chip' + (S.cat === '' ? ' on' : ''), type: 'button', onclick: function () { S.cat = ''; S.shown = PAGE_SIZE; renderChips(); renderList(); } }, '全部');
    box.appendChild(all);
    CATS.forEach(function (c) {
      var n = 0;
      for (var i = 0; i < S.items.length; i++) if (S.items[i].category === c) n++;
      var b = el('button', {
        class: 'chip' + (S.cat === c ? ' on' : ''),
        type: 'button',
        onclick: function () { S.cat = c; S.shown = PAGE_SIZE; renderChips(); renderList(); }
      });
      b.appendChild(document.createTextNode(c));
      if (n > 0) {
        b.appendChild(el('span', { text: ' ' + n, style: 'opacity:.6;font-size:11.5px' }));
      }
      box.appendChild(b);
    });
  }

  function renderPlatOptions() {
    var sel = $('platSel');
    var cur = S.plat;
    sel.textContent = '';
    sel.appendChild(el('option', { value: '' }, '全部平台'));
    PLATS.forEach(function (p) {
      var used = false;
      for (var i = 0; i < S.items.length; i++) if (S.items[i].platform === p) used = true;
      if (used || p === cur) sel.appendChild(el('option', { value: p }, p));
    });
    sel.value = cur;
  }

  /* SECTION: filter-sort */
  function filtered() {
    var q = S.q.trim().toLowerCase();
    var out = S.items.filter(function (it) {
      if (S.cat && it.category !== S.cat) return false;
      if (S.plat && it.platform !== S.plat) return false;
      if (!q) return true;
      return (it.name || '').toLowerCase().indexOf(q) !== -1 ||
        (it.description || '').toLowerCase().indexOf(q) !== -1 ||
        (it.publisher || '').toLowerCase().indexOf(q) !== -1 ||
        (it.category || '').toLowerCase().indexOf(q) !== -1;
    });
    if (S.sort === 'hot') out.sort(function (a, b) { return (b.downloads || 0) - (a.downloads || 0); });
    else if (S.sort === 'name') out.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'); });
    else out.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    return out;
  }

  /* SECTION: render-card */
  function makeCard(it) {
    var mine = S.user && it.user_id === S.user.id;

    var ico = el('div', { class: 'ico', 'aria-hidden': 'true', style: 'background:' + gradFor(it.name), text: initial(it.name) });

    var tt = el('div', { class: 'card-tt' }, [
      el('div', { class: 'card-name', text: esc(it.name), title: esc(it.name) }),
      el('div', { class: 'card-ver', text: it.version ? 'v' + esc(it.version) : '未标注版本' })
    ]);

    var tags = el('div', { class: 'tags' }, [
      el('span', { class: 'tag cat', text: esc(it.category) }),
      el('span', { class: 'tag', text: esc(it.platform) }),
      it.size_text ? el('span', { class: 'tag', text: esc(it.size_text) }) : null
    ]);

    var mDown = el('span', { class: 'meta', title: '下载次数' }, [icon('download'), document.createTextNode(' ' + fmtNum(it.downloads))]);
    var mWho = el('span', { class: 'meta', title: '发布者：' + esc(it.publisher) }, [icon('user'), el('span', { class: 'who', text: esc(it.publisher) })]);
    var mTime = el('span', { class: 'meta', title: '发布时间' }, [icon('clock'), document.createTextNode(' ' + fmtDate(it.created_at))]);

    var dlBtn = el('button', {
      class: 'btn btn-p btn-sm',
      type: 'button',
      'data-primary-action': '',
      onclick: function (e) { e.stopPropagation(); doDownload(it, dlBtn); }
    }, [icon('download'), document.createTextNode('下载')]);

    var ft = el('div', { class: 'card-ft' }, [mDown, mWho, mTime, dlBtn]);

    var card = el('article', {
      class: 'card',
      tabindex: '0',
      role: 'button',
      'aria-label': '查看 ' + esc(it.name) + ' 的详情',
      onclick: function () { openDetail(it); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(it); } }
    }, [
      el('div', { class: 'card-top' }, [ico, tt]),
      el('p', { class: 'card-desc', text: esc(it.description) || '发布者没有填写简介' }),
      tags,
      ft
    ]);

    if (mine) {
      var del = el('button', {
        class: 'btn btn-d btn-sm',
        type: 'button',
        title: '删除这条发布',
        onclick: function (e) { e.stopPropagation(); askDelete(it); }
      }, [icon('trash'), document.createTextNode('删除')]);
      // 删除键排在下载键之前，由它承担靠右推挤；下载键不再重复设置外边距
      del.style.marginLeft = 'auto';
      dlBtn.style.marginLeft = '0';
      ft.insertBefore(del, dlBtn);
    }
    return card;
  }

  function makeSkeleton() {
    return el('div', { class: 'sk', 'aria-hidden': 'true' }, [
      el('div', { style: 'display:flex;gap:12px' }, [el('div', { class: 'sk-l sk-ico' }), el('div', { style: 'flex:1' }, [el('div', { class: 'sk-l sk-t' }), el('div', { class: 'sk-l sk-s' })])]),
      el('div', { class: 'sk-l', style: 'height:12px;margin-top:13px' }),
      el('div', { class: 'sk-l', style: 'height:12px;width:76%;margin-top:7px' }),
      el('div', { class: 'sk-l sk-b' })
    ]);
  }

  function makeEmpty(title, text, actionLabel, actionFn) {
    var box = el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ic' }, [icon('box')]),
      el('h3', { text: esc(title) }),
      el('p', { text: esc(text) })
    ]);
    if (actionLabel && actionFn) box.appendChild(el('button', { class: 'btn btn-p', type: 'button', onclick: actionFn }, [icon('plus'), document.createTextNode(actionLabel)]));
    return box;
  }

  /* SECTION: render-list */
  function renderList() {
    var grid = $('grid');
    var st = $('listState');
    var more = $('moreBox');
    grid.textContent = '';
    st.textContent = '';

    if (S.loading) {
      for (var i = 0; i < 6; i++) grid.appendChild(makeSkeleton());
      more.hidden = true;
      return;
    }

    var list = filtered();
    if (list.length === 0) {
      var hasFilter = S.q || S.cat || S.plat;
      if (S.items.length === 0) {
        st.appendChild(makeEmpty(
          '还没有人发布软件',
          '你来当第一个吧！把你觉得好用的软件分享出来，所有人都能免费下载。',
          '立即发布第一个软件',
          function () { tryPublish(); }
        ));
      } else if (hasFilter) {
        st.appendChild(makeEmpty(
          '没有找到匹配的软件',
          '换个关键词，或者清空筛选条件再试试。',
          '清空全部筛选',
          function () { S.q = ''; S.cat = ''; S.plat = ''; $('searchInput').value = ''; $('platSel').value = ''; $('btnClearSearch').hidden = true; renderChips(); renderList(); }
        ));
      } else {
        st.appendChild(makeEmpty('这里还是空的', '发布一个软件，让它出现在这里。', '发布软件', function () { tryPublish(); }));
      }
      more.hidden = true;
      return;
    }

    var slice = list.slice(0, S.shown);
    slice.forEach(function (it) { grid.appendChild(makeCard(it)); });
    more.hidden = slice.length >= list.length;
    $('btnMore').textContent = '加载更多（还有 ' + (list.length - slice.length) + ' 个）';
  }

  /* SECTION: render-mine */
  function renderMine() {
    var box = $('mineContent');
    box.textContent = '';

    if (!S.user) {
      box.appendChild(makeEmpty('登录后查看你的发布', '登录之后，你发布过的软件都会集中显示在这里，可以随时删除或查看下载情况。', '登录 / 注册', function () { openAuth('login'); }));
      return;
    }

    var mine = S.items.filter(function (it) { return it.user_id === S.user.id; });

    box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px' }, [
      el('h2', { style: 'font-size:20px;font-weight:750', text: '我的发布' }),
      el('span', { class: 'tag cat', text: mine.length + ' 个软件' }),
      el('span', { style: 'flex:1' }),
      el('button', { class: 'btn btn-p btn-sm', type: 'button', onclick: function () { tryPublish(); } }, [icon('plus'), document.createTextNode('发布新软件')])
    ]));

    if (mine.length === 0) {
      box.appendChild(makeEmpty('你还没有发布过软件', '把你觉得好用的软件分享出来，帮助别人少踩坑。', '发布第一个软件', function () { tryPublish(); }));
      return;
    }

    var g = el('div', { class: 'grid' });
    mine.forEach(function (it) { g.appendChild(makeCard(it)); });
    box.appendChild(g);
  }

  function renderView() {
    var lib = S.view === 'library';
    $('viewLibrary').hidden = !lib;
    $('viewMine').hidden = lib;
    var btns = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-view') === S.view);
    }
    if (!lib) renderMine();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* SECTION: detail */
  function openDetail(it) {
    S.detail = it;
    var body = $('detailBody');
    var foot = $('detailFoot');
    body.textContent = '';
    foot.textContent = '';

    var dtIco = el('div', { class: 'ico dt-ico', 'aria-hidden': 'true', style: 'background:' + gradFor(it.name), text: initial(it.name) });
    var dtTt = el('div', { style: 'min-width:0;flex:1' }, [
      el('div', { class: 'dt-name', id: 'dtName', text: esc(it.name) }),
      el('div', { class: 'dt-sub' }, [
        el('span', { class: 'tag cat', text: esc(it.category) }),
        el('span', { text: esc(it.platform) }),
        it.version ? el('span', { text: 'v' + esc(it.version) }) : null
      ])
    ]);
    body.appendChild(el('div', { class: 'dt-top' }, [dtIco, dtTt]));

    var cells = [
      ['发布者', esc(it.publisher)],
      ['发布时间', fmtDate(it.created_at)],
      ['文件大小', it.size_text || fmtSize(it.size_bytes)],
      ['下载次数', fmtNum(it.downloads)],
      ['获取方式', it.download_type === 'file' ? '站内文件' : '外部链接']
    ];
    var g = el('div', { class: 'dt-grid' });
    cells.forEach(function (c) {
      g.appendChild(el('div', { class: 'dt-cell' }, [el('span', { text: c[0] }), el('b', { text: c[1] })]));
    });
    body.appendChild(g);

    body.appendChild(el('div', { class: 'dt-sec' }, [
      el('h4', { text: '软件简介' }),
      el('div', { class: 'dt-desc', text: esc(it.description) || '发布者没有填写简介。' })
    ]));

    if (it.download_type === 'link' && it.download_url) {
      var host = '';
      try { host = new URL(it.download_url).hostname; } catch (e) { host = '外部站点'; }
      body.appendChild(el('div', { class: 'dt-sec' }, [
        el('h4', { text: '下载来源' }),
        el('div', { class: 'dt-cell', style: 'background:var(--card);border:1px solid var(--line-soft);border-radius:11px;padding:11px 13px' }, [
          el('b', { text: host, style: 'word-break:break-all' })
        ])
      ]));
    }
    if (it.download_type === 'file' && it.file_name) {
      body.appendChild(el('div', { class: 'dt-sec' }, [
        el('h4', { text: '文件名' }),
        el('div', { class: 'dt-cell', style: 'background:var(--card);border:1px solid var(--line-soft);border-radius:11px;padding:11px 13px' }, [
          el('b', { text: esc(it.file_name), style: 'word-break:break-all' })
        ])
      ]));
    }

    body.appendChild(el('div', { class: 'dt-warn' }, [
      icon('warn'),
      el('div', {}, '本软件由用户「' + esc(it.publisher) + '」自行发布，本站不做安全审核。下载后请先用杀毒软件扫描，确认安全后再安装运行。')
    ]));

    var closeB = el('button', { class: 'btn btn-o', type: 'button', onclick: function () { hideModal('mskDetail'); } }, '关闭');
    var dlB = el('button', { class: 'btn btn-p', type: 'button', 'data-primary-action': '', onclick: function () { doDownload(it, dlB); } }, [icon('download'), document.createTextNode('立即下载')]);
    foot.appendChild(closeB);
    foot.appendChild(dlB);

    if (S.user && it.user_id === S.user.id) {
      foot.insertBefore(el('button', {
        class: 'btn btn-d', type: 'button',
        onclick: function () { askDelete(it, function () { hideModal('mskDetail'); }); }
      }, [icon('trash'), document.createTextNode('删除')]), closeB);
    }

    showModal('mskDetail');
  }

  /* SECTION: download */
  function setBtnBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.old = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '';
      btn.appendChild(el('span', { class: 'spin' }));
      btn.appendChild(document.createTextNode(label || '处理中…'));
    } else {
      btn.disabled = false;
      if (btn.dataset.old) btn.innerHTML = btn.dataset.old;
    }
  }

  function doDownload(it, btn) {
    if (it.download_type === 'link') {
      if (!isSafeUrl(it.download_url)) { toast('这条发布的下载链接无效，请联系发布者修正', 'err'); return; }
      window.open(it.download_url, '_blank', 'noopener,noreferrer');
      bumpDownload(it);
      toast('已在新标签页打开下载链接', 'ok');
      return;
    }

    if (!it.storage_path) { toast('这条发布没有可用的文件，请联系发布者', 'err'); return; }

    setBtnBusy(btn, true, '准备文件…');
    // getPublicUrl 在 supabase-js v2 中是同步方法，直接返回 { data: { publicUrl } }
    var res;
    try {
      res = sb.storage.from(CFG.STORAGE_BUCKET).getPublicUrl(it.storage_path);
    } catch (e) {
      setBtnBusy(btn, false);
      toast('获取文件地址失败，请稍后再试', 'err');
      return;
    }
    setBtnBusy(btn, false);
    var url = res && res.data && res.data.publicUrl;
    if (!url) { toast('获取文件地址失败，请稍后再试', 'err'); return; }

    var a = el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', download: esc(it.file_name || '') });
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 600);
    bumpDownload(it);
    toast('文件已开始下载，请留意浏览器下载栏', 'ok');
  }

  function bumpDownload(it) {
    it.downloads = (Number(it.downloads) || 0) + 1;
    renderStats();
    if (S.view === 'library') renderList(); else renderMine();
    sb.rpc('increment_download', { p_id: it.id }).then(function (res) {
      if (res.error) console.warn('下载次数回写失败：', res.error.message);
    }).catch(function () { /* 计数失败不影响下载体验 */ });
  }

  /* SECTION: delete */
  function askDelete(it, after) {
    askConfirm('删除这条发布', '确定要删除「' + it.name + '」吗？删除后所有人都不再看到它，' + (it.download_type === 'file' ? '已上传的文件也会一并移除，' : '') + '这个操作无法撤销。', function () {
      doDelete(it, after);
    });
  }

  function doDelete(it, after) {
    // 先删数据库记录（SQL 里已建触发器，会自动连带清理存储文件）
    sb.from('software').delete().eq('id', it.id).then(function (res) {
      if (res.error) throw res.error;
      S.items = S.items.filter(function (x) { return x.id !== it.id; });
      renderStats();
      renderList();
      if (S.view === 'mine') renderMine();
      toast('已删除「' + it.name + '」', 'ok');
      if (after) after();
      // 再尽力清理一次存储文件；失败不影响结果，触发器已兜底
      if (it.download_type === 'file' && it.storage_path) {
        sb.storage.from(CFG.STORAGE_BUCKET).remove([it.storage_path]).catch(function () {});
      }
    }).catch(function (err) {
      toast('删除失败：' + errHint(err), 'err');
    });
  }

  /* SECTION: auth */
  function openAuth(mode) {
    S.authMode = mode || 'login';
    applyAuthMode();
    showModal('mskAuth');
  }

  function applyAuthMode() {
    var isSignup = S.authMode === 'signup';
    $('authTitle').textContent = isSignup ? '注册账号' : '登录';
    $('authSub').textContent = isSignup ? '注册只需邮箱和密码，马上就能发布软件' : '登录后即可发布和管理自己的软件';
    $('tabLogin').classList.toggle('on', !isSignup);
    $('tabSignup').classList.toggle('on', isSignup);
    $('nickFld').hidden = !isSignup;
    $('nickInput').required = isSignup;
    $('passInput').setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
    $('passHint').textContent = isSignup ? '至少 6 位，请牢记；本站没有找回密码邮件功能' : '忘记密码请联系站点管理员在后台重置';
    $('btnAuthSubmit').textContent = isSignup ? '注册并登录' : '登录';
  }

  function submitAuth() {
    if (S.busy) return;
    var email = $('emailInput').value.trim();
    var pass = $('passInput').value;
    var nick = $('nickInput').value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('请填写一个有效的邮箱地址', 'warn'); $('emailInput').focus(); return; }
    if (pass.length < 6) { toast('密码至少需要 6 位', 'warn'); $('passInput').focus(); return; }
    if (S.authMode === 'signup') {
      if (nick.length < 2 || nick.length > 24) { toast('昵称需要 2 到 24 个字符', 'warn'); $('nickInput').focus(); return; }
    }

    S.busy = true;
    var btn = $('btnAuthSubmit');
    setBtnBusy(btn, true, S.authMode === 'signup' ? '注册中…' : '登录中…');

    var p;
    if (S.authMode === 'signup') {
      p = sb.auth.signUp({ email: email, password: pass, options: { data: { nickname: nick } } }).then(function (res) {
        if (res.error) throw res.error;
        if (!res.data.session) {
          throw new Error('注册成功，但站点开启了邮箱验证。请去邮箱点击确认链接后再登录；或在 Supabase 后台关闭邮箱验证（Authentication → Sign In / Up → Confirm email）');
        }
        return res.data.session;
      });
    } else {
      p = sb.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
        if (res.error) throw res.error;
        return res.data.session;
      });
    }

    p.then(function () {
      return loadMe();
    }).then(function () {
      setBtnBusy(btn, false);
      S.busy = false;
      hideModal('mskAuth');
      $('authForm').reset();
      renderAuth();
      renderList();
      if (S.view === 'mine') renderMine();
      toast(S.authMode === 'signup' ? '注册成功，欢迎加入！' : '登录成功，欢迎回来 ' + S.nickname, 'ok');
    }).catch(function (err) {
      setBtnBusy(btn, false);
      S.busy = false;
      toast(errHint(err), 'err');
    });
  }

  function doLogout() {
    sb.auth.signOut().then(function () {
      S.user = null;
      S.nickname = '';
      renderAuth();
      renderList();
      if (S.view === 'mine') { S.view = 'library'; renderView(); }
      toast('已退出登录', 'ok');
    }).catch(function () { toast('退出失败，请刷新页面重试', 'err'); });
  }

  /* SECTION: publish */
  function tryPublish() {
    if (!S.user) {
      toast('登录后才能发布软件', 'warn');
      openAuth('signup');
      return;
    }
    resetPubForm();
    showModal('mskPublish');
  }

  function resetPubForm() {
    $('pubForm').reset();
    $('descCount').textContent = '0';
    S.picked = null;
    S.dlMode = 'link';
    applyDlMode();
    $('filePicked').hidden = true;
    $('dzWrap').hidden = false;
    $('upProg').hidden = true;
    $('upProg').classList.remove('prog-ind');
    $('fileInput').value = '';
    setBtnBusy($('btnPubSubmit'), false);
    S.busy = false;
  }

  function applyDlMode() {
    var isLink = S.dlMode === 'link';
    $('linkFld').hidden = !isLink;
    $('fileFld').hidden = isLink;
    var bs = $('dlModeSeg').querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-mode') === S.dlMode);
  }

  function pickFile(f) {
    if (!f) return;
    var max = (Number(CFG.MAX_UPLOAD_MB) || 50) * 1048576;
    if (f.size > max) {
      toast('这个文件有 ' + fmtSize(f.size) + '，超过免费版单文件上限 ' + (CFG.MAX_UPLOAD_MB || 50) + ' MB。请改用「粘贴下载链接」方式，把文件传到网盘再填链接。', 'err');
      return;
    }
    if (f.size === 0) { toast('这个文件是空的，无法上传', 'warn'); return; }
    S.picked = f;
    $('pickedName').textContent = f.name;
    $('pickedSize').textContent = fmtSize(f.size);
    $('dzWrap').hidden = true;
    $('filePicked').hidden = false;
    if (!$('pSize').value.trim()) $('pSize').value = fmtSize(f.size);
  }

  function safeStorageName(f) {
    var raw = String(f.name || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
    if (raw.length > 90) {
      var dot = raw.lastIndexOf('.');
      var ext = dot > raw.length - 12 ? raw.slice(dot) : '';
      raw = raw.slice(0, 90 - ext.length) + ext;
    }
    var stamp = Date.now().toString(36);
    var rand = Math.random().toString(36).slice(2, 8);
    return S.user.id.slice(0, 8) + '/' + stamp + '-' + rand + '-' + raw;
  }

  function submitPublish() {
    if (S.busy) return;
    if (!S.user) { toast('请先登录', 'warn'); openAuth('login'); return; }

    var name = $('pName').value.trim();
    var desc = $('pDesc').value.trim();
    var cat = $('pCat').value;
    var plat = $('pPlat').value;
    var ver = $('pVer').value.trim();
    var sizeText = $('pSize').value.trim();
    var link = $('pLink').value.trim();

    if (name.length < 2) { toast('请填写软件名称（至少 2 个字）', 'warn'); $('pName').focus(); return; }
    if (desc.length < 5) { toast('简介至少写 5 个字，让大家知道这软件能做什么', 'warn'); $('pDesc').focus(); return; }

    var isLink = S.dlMode === 'link';
    if (isLink) {
      if (!isSafeUrl(link)) { toast('请填写完整的下载链接，要以 http:// 或 https:// 开头', 'warn'); $('pLink').focus(); return; }
    } else if (!S.picked) {
      toast('请选择要上传的安装文件，或改用「粘贴下载链接」', 'warn');
      return;
    }

    S.busy = true;
    var btn = $('btnPubSubmit');

    var doInsert = function (payload) {
      payload.user_id = S.user.id;
      return sb.from('software').insert([payload]).select('*, profiles(nickname)').single().then(function (res) {
        if (res.error) throw res.error;
        return flatten([res.data])[0];
      });
    };

    var chain;
    if (isLink) {
      setBtnBusy(btn, true, '发布中…');
      chain = doInsert({
        name: name, description: desc, category: cat, platform: plat,
        version: ver, size_text: sizeText, size_bytes: 0,
        download_type: 'link', download_url: link, storage_path: '', file_name: ''
      });
    } else {
      setBtnBusy(btn, true, '上传文件中…');
      var path = safeStorageName(S.picked);
      $('upProg').hidden = false;
      $('upProg').classList.add('prog-ind');
      chain = S.picked.arrayBuffer().then(function (buf) {
        return sb.storage.from(CFG.STORAGE_BUCKET).upload(path, buf, {
          contentType: S.picked.type || 'application/octet-stream',
          upsert: false
        });
      }).then(function (up) {
        if (up.error) throw up.error;
        $('upProg').classList.remove('prog-ind');
        $('upProgI').style.width = '100%';
        setBtnBusy(btn, true, '写入记录…');
        return doInsert({
          name: name, description: desc, category: cat, platform: plat,
          version: ver, size_text: sizeText || fmtSize(S.picked.size), size_bytes: S.picked.size,
          download_type: 'file', download_url: '', storage_path: path, file_name: S.picked.name
        });
      });
    }

    chain.then(function (row) {
      S.items.unshift(row);
      S.busy = false;
      setBtnBusy(btn, false);
      $('upProg').classList.remove('prog-ind');
      $('upProgI').style.width = '0';
      hideModal('mskPublish');
      resetPubForm();
      renderStats();
      renderPlatOptions();
      renderChips();
      S.shown = PAGE_SIZE;
      if (S.view !== 'library') { S.view = 'library'; renderView(); } else renderList();
      toast('发布成功！「' + row.name + '」已经出现在软件库最前面', 'ok');
    }).catch(function (err) {
      S.busy = false;
      setBtnBusy(btn, false);
      $('upProg').classList.remove('prog-ind');
      toast('发布失败：' + errHint(err), 'err');
    });
  }

  /* SECTION: bindings */
  function fillSelects() {
    var pc = $('pCat'), pp = $('pPlat');
    CATS.forEach(function (c) { pc.appendChild(el('option', { value: c }, c)); });
    pc.value = CATS[0];
    PLATS.forEach(function (p) { pp.appendChild(el('option', { value: p }, p)); });
    pp.value = 'Windows';
    // 平台筛选下拉框的选项由 renderPlatOptions 依据实际数据生成，此处不重复添加
    $('maxSizeLabel').textContent = (CFG.MAX_UPLOAD_MB || 50) + ' MB';
  }

  function bind() {
    $('logoHome').addEventListener('click', function (e) { e.preventDefault(); S.view = 'library'; renderView(); });

    var navs = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < navs.length; i++) {
      navs[i].addEventListener('click', function () { S.view = this.getAttribute('data-view'); renderView(); });
    }

    var st = null;
    $('searchInput').addEventListener('input', function () {
      var v = this.value;
      $('btnClearSearch').hidden = !v;
      clearTimeout(st);
      st = setTimeout(function () { S.q = v; S.shown = PAGE_SIZE; renderList(); }, 200);
    });
    $('btnClearSearch').addEventListener('click', function () {
      $('searchInput').value = ''; S.q = ''; this.hidden = true; S.shown = PAGE_SIZE; renderList(); $('searchInput').focus();
    });
    $('platSel').addEventListener('change', function () { S.plat = this.value; S.shown = PAGE_SIZE; renderList(); });
    $('sortSel').addEventListener('change', function () { S.sort = this.value; S.shown = PAGE_SIZE; renderList(); });
    $('btnMore').addEventListener('click', function () { S.shown += PAGE_SIZE; renderList(); });

    $('btnPublish').addEventListener('click', function () { tryPublish(); });
    $('btnAuth').addEventListener('click', function () { openAuth('login'); });
    $('btnLogout').addEventListener('click', function () {
      askConfirm('退出登录', '退出后需要重新输入邮箱密码才能发布软件。确定退出吗？', doLogout);
    });

    $('tabLogin').addEventListener('click', function () { S.authMode = 'login'; applyAuthMode(); });
    $('tabSignup').addEventListener('click', function () { S.authMode = 'signup'; applyAuthMode(); });
    $('btnAuthSubmit').addEventListener('click', submitAuth);
    $('authForm').addEventListener('submit', function (e) { e.preventDefault(); submitAuth(); });
    $('authForm').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); submitAuth(); } });

    var segs = $('dlModeSeg').querySelectorAll('button');
    for (var j = 0; j < segs.length; j++) {
      segs[j].addEventListener('click', function () { S.dlMode = this.getAttribute('data-mode'); applyDlMode(); });
    }

    $('btnPubSubmit').addEventListener('click', submitPublish);
    $('pubForm').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); submitPublish(); } });
    $('pDesc').addEventListener('input', function () { $('descCount').textContent = String(this.value.length); });

    var dz = $('dropzone'), fi = $('fileInput');
    dz.addEventListener('click', function () { fi.click(); });
    dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
    fi.addEventListener('change', function () { if (this.files && this.files[0]) pickFile(this.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); });
    });
    dz.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) pickFile(f);
    });
    $('btnClearFile').addEventListener('click', function () {
      S.picked = null;
      fi.value = '';
      $('filePicked').hidden = true;
      $('dzWrap').hidden = false;
      $('upProg').hidden = true;
      $('upProgI').style.width = '0';
    });
  }

  /* SECTION: boot */
  function boot() {
    if (!isConfigured()) {
      $('setupScreen').hidden = false;
      return;
    }
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      $('setupScreen').hidden = false;
      var p = document.querySelector('.setup-box p');
      if (p) p.textContent = '浏览器没能加载 Supabase 运行库，请检查网络是否能访问 cdn.jsdelivr.net，然后刷新页面重试。';
      return;
    }

    try {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    } catch (e) {
      $('setupScreen').hidden = false;
      return;
    }

    fillSelects();
    bind();
    $('app').hidden = false;
    renderChips();
    renderAuth();
    S.loading = true;
    renderList();

    loadMe().then(function () {
      renderAuth();
      return loadItems();
    }).then(function () {
      S.ready = true;
      renderChips();
      if (S.view === 'mine') renderMine();
    }).catch(function (err) {
      $('app').hidden = true;
      $('setupScreen').hidden = false;
      var p = document.querySelector('.setup-box p');
      if (p) p.textContent = '连接数据库失败：' + errHint(err);
    });

    sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT') { S.user = null; S.nickname = ''; }
      else if (session && session.user) {
        S.user = session.user;
        if (!S.nickname) {
          sb.from('profiles').select('nickname').eq('id', session.user.id).maybeSingle().then(function (r) {
            S.nickname = (r.data && r.data.nickname) || '匿名发布者';
            renderAuth();
          });
        }
      }
      renderAuth();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
