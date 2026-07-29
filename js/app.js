/**
 * app.js —— 学习笔记 纯网页版 主逻辑
 * 依赖 store.js（window.NoteStore）
 */
(function () {
  'use strict';

  var Store = window.NoteStore;
  var RT = window.RichText;

  // ---- DOM 引用 ----
  var $ = function (id) { return document.getElementById(id); };
  var appBarTitle = $('appBarTitle');
  var searchBar = $('searchBar');
  var searchInput = $('searchInput');
  var searchClear = $('searchClear');
  var backBtn = $('backBtn');
  var menuBtn = $('menuBtn');
  var sidebarBackdrop = $('sidebarBackdrop');
  var fab = $('fab');
  var snackbar = $('snackbar');

  // 新增 DOM 引用
  var pinInput = $('pinInput');
  var pinClear = $('pinClear');
  var viewToggle = $('viewToggle');
  var typeSeg = $('typeSeg');
  var titleField = $('titleField');
  var hwFields = $('hwFields');
  var hwName = $('hwName');
  var hwModel = $('hwModel');
  var hwVoltage = $('hwVoltage');
  var hwProtocol = $('hwProtocol');
  var hwPins = $('hwPins');
  var bugFields = $('bugFields');
  var bugSymptom = $('bugSymptom');
  var bugSteps = $('bugSteps');
  var bugRootCause = $('bugRootCause');
  var bugSolved = $('bugSolved');
  var projFields = $('projFields');
  var projName = $('projName');
  var projMcu = $('projMcu');
  var projPeripherals = $('projPeripherals');
  var projGithub = $('projGithub');
  var projStatus = $('projStatus');
  var projDesc = $('projDesc');
  var pendingBtn = $('pendingBtn');
  var btnMic = $('btnMic');
  var hwSpec = $('hwSpec');
  var bugSpec = $('bugSpec');
  var detailLinks = $('detailLinks');
  var btnParseLog = $('btnParseLog');
  var logSheet = $('logSheet');
  var logBackdrop = $('logBackdrop');
  var logLines = $('logLines');
  var logSummary = $('logSummary');
  // 统计页子标签 / 路线图 / 项目墙
  var statsSubtabs = $('statsSubtabs');
  var statsMain = $('statsMain');
  var statsRoadmap = $('statsRoadmap');
  var statsProjects = $('statsProjects');
  var roadmapRoutes = $('roadmapRoutes');
  var roadmapStepper = $('roadmapStepper');
  var roadmapRouteName = $('roadmapRouteName');
  var roadmapCount = $('roadmapCount');
  var roadmapFill = $('roadmapFill');
  var roadmapPct = $('roadmapPct');
  var projWall = $('projWall');
  var projEmpty = $('projEmpty');
  var projSpec = $('projSpec');

  // GitHub 同步
  var syncModal = $('syncModal');
  var syncRepo = $('syncRepo');
  var syncBranch = $('syncBranch');
  var syncPath = $('syncPath');
  var syncToken = $('syncToken');
  var syncStatus = $('syncStatus');
  var syncTest = $('syncTest');
  var syncSave = $('syncSave');
  var syncPullBtn = $('syncPull');
  var syncPushBtn = $('syncPush');
  var syncClose = $('syncClose');

  // 随缘复习（闪卡）
  var btnReview = $('btnReview');
  var reviewModal = $('reviewModal');
  var reviewType = $('reviewType');
  var reviewTitle = $('reviewTitle');
  var reviewBodyText = $('reviewBodyText');
  var reviewThumb = $('reviewThumb');
  var reviewFooter = $('reviewFooter');
  var reviewSkip = $('reviewSkip');
  var reviewFocus = $('reviewFocus');
  var btnViewFocus = $('btnViewFocus');
  var focusList = $('focusList');
  var focusEmpty = $('focusEmpty');

  // 技能雷达图
  var skillRadarCanvas = $('skillRadarCanvas');
  var skillRawScores = $('skillRawScores');
  var skillCalib = $('skillCalib');
  var skillRecommend = $('skillRecommend');
  var btnSkillRelated = $('btnSkillRelated');

  // 学习路标（首页横幅 + 统计页面板 + 目标详情 + 弹窗）
  var goalBanner = $('goalBanner');
  var statGoals = $('statGoals');
  var btnNewGoal = $('btnNewGoal');
  var goalListActive = $('goalListActive');
  var goalListDone = $('goalListDone');
  var goalEmptyActive = $('goalEmptyActive');
  var goalEmptyDone = $('goalEmptyDone');
  var editGoal = $('editGoal');
  var goalModal = $('goalModal');
  var goalModalTitle = $('goalModalTitle');
  var goalNameInput = $('goalNameInput');
  var goalDueInput = $('goalDueInput');
  var goalDescInput = $('goalDescInput');
  var goalModalCancel = $('goalModalCancel');
  var goalModalSave = $('goalModalSave');
  var goalDetailTitle = $('goalDetailTitle');
  var goalDetailMeta = $('goalDetailMeta');
  var goalDetailDesc = $('goalDetailDesc');
  var goalNoteCount = $('goalNoteCount');
  var goalNoteList = $('goalNoteList');
  var goalNoteEmpty = $('goalNoteEmpty');

  // CRC 计算器
  var crcPreset = $('crcPreset');
  var crcAdvancedToggle = $('crcAdvancedToggle');
  var crcAdvanced = $('crcAdvanced');
  var crcWidth = $('crcWidth');
  var crcPoly = $('crcPoly');
  var crcInit = $('crcInit');
  var crcXorOut = $('crcXorOut');
  var crcRefIn = $('crcRefIn');
  var crcRefOut = $('crcRefOut');
  var crcAsciiMode = $('crcAsciiMode');
  var crcHex = $('crcHex');
  var crcAscii = $('crcAscii');
  var btnCrcCalc = $('btnCrcCalc');
  var crcResult = $('crcResult');
  var crcHistoryToggle = $('crcHistoryToggle');
  var crcHistory = $('crcHistory');
  var crcHistoryList = $('crcHistoryList');
  var crcHistoryClear = $('crcHistoryClear');

  // 当前编辑中的笔记类型（普通 / 硬件 / Bug）
  var currentEditType = 'note';

  var views = {
    home: $('view-home'),
    tags: $('view-tags'),
    stats: $('view-stats'),
    tools: $('view-tools'),
    edit: $('view-edit'),
    detail: $('view-detail'),
    focus: $('view-focus'),
    goal: $('view-goal')
  };

  // ---- 应用状态 ----
  var state = {
    view: 'home',
    filterTag: null,      // 标签页跳转来的筛选标签
    search: '',
    pinSearch: '',        // 引脚速查关键词
    homeView: 'list',     // 首页视图：list / timeline
    pendingOnly: false,   // 待解决（未解决 Bug）筛选
    editId: null,         // 正在编辑的笔记 id（null=新建）
    detailId: null,       // 当前查看详情的笔记 id
    openCard: null,       // 当前已左滑展开的卡片 inner 元素
    lastReviewId: null,   // 上一次随缘复习抽到的笔记 id（避免连续重复）
    currentRoute: (window.Roadmap && window.Roadmap.DEFAULT_ROUTE) || 'STM32入门', // 当前路线图路线
    goalId: null          // 当前查看详情的学习路标 id
  };

  // ============ 工具函数 ============
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function relativeTime(ts) {
    var diff = Date.now() - ts;
    var m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return m + ' 分钟前';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' 小时前';
    var d = Math.floor(h / 24);
    if (d < 30) return d + ' 天前';
    var dt = new Date(ts);
    return (dt.getMonth() + 1) + '/' + dt.getDate();
  }

  /** 统计正文中图片数量 */
  function countImages(body) {
    return Store.extractImages(body || '').length;
  }

  /** 生成卡片预览文本（HTML/旧 token 均转纯文本，截取前 120 字） */
  function previewText(body) {
    var text = RT.toPlainText(body || '').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? text.slice(0, 120) + '…' : text;
  }

  var snackTimer;
  function showSnack(msg) {
    snackbar.textContent = msg;
    snackbar.hidden = false;
    clearTimeout(snackTimer);
    snackTimer = setTimeout(function () { snackbar.hidden = true; }, 2200);
  }

  // ============ 视图切换 ============
  function setView(name) {
    state.view = name;
    Object.keys(views).forEach(function (k) {
      views[k].hidden = (k !== name);
    });

    var isOverlay = name === 'edit' || name === 'detail' || name === 'focus' || name === 'goal';
    // 编辑页/详情页/重点列表：隐藏搜索/FAB，显示返回与对应操作条
    fab.hidden = isOverlay;
    searchBar.hidden = isOverlay || name === 'stats' || name === 'tags';
    viewToggle.hidden = (name !== 'home');   // 视图切换仅首页显示
    appBarTitle.hidden = false;
    backBtn.hidden = !isOverlay;
    $('editorActions').hidden = name !== 'edit';
    $('detailActions').hidden = name !== 'detail';

    if (name === 'home') appBarTitle.textContent = state.filterTag ? ('标签：' + state.filterTag) : '学习笔记';
    if (name === 'tags') appBarTitle.textContent = '标签';
    if (name === 'stats') appBarTitle.textContent = '统计';
    if (name === 'tools') appBarTitle.textContent = '工具';
    if (name === 'edit') appBarTitle.textContent = state.editId ? '编辑笔记' : '新建笔记';
    if (name === 'detail') appBarTitle.textContent = '笔记详情';
    if (name === 'focus') appBarTitle.textContent = '复习重点';
    if (name === 'goal') appBarTitle.textContent = '学习路标';

    if (name === 'home') renderHome();
    if (name === 'tags') renderTags();
    if (name === 'stats') enterStats();
  }

  function navigate(name) {
    // 底部导航点击：清除标签筛选与引脚速查，回到完整列表
    if (name === 'home') {
      state.filterTag = null; searchInput.value = ''; state.search = ''; searchClear.hidden = true;
      pinInput.value = ''; state.pinSearch = ''; pinClear.hidden = true;
      state.pendingOnly = false; pendingBtn.classList.remove('active');
    }
    // 更新底部导航高亮
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.classList.toggle('active', b.dataset.nav === name);
    });
    setView(name);
  }

  /** 从标签页点击某标签进入首页并筛选（保留 filterTag） */
  function goHomeWithTag(tag) {
    state.filterTag = tag;
    searchInput.value = ''; state.search = ''; searchClear.hidden = true;
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.classList.toggle('active', b.dataset.nav === 'home');
    });
    setView('home');
  }

  // ============ 侧边栏（移动端抽屉） ============
  function openSidebar() {
    var sb = $('sidebar');
    if (sb) sb.classList.add('sidebar--open');
    if (sidebarBackdrop) sidebarBackdrop.hidden = false;
  }
  function closeSidebar() {
    var sb = $('sidebar');
    if (sb) sb.classList.remove('sidebar--open');
    if (sidebarBackdrop) sidebarBackdrop.hidden = true;
  }

  // ============ 首页 ============
  function renderHome() {
    var listEl = $('homeList');
    listEl.innerHTML = '';
    var empty = $('homeEmpty');

    // 学习路标首页横幅
    refreshGoalBanner();

    // 同步视图切换按钮高亮
    updateViewToggleActive();

    // 引脚速查模式：仅筛选硬件笔记并高亮引脚（始终为列表）
    if (state.pinSearch) {
      renderHardwareResults(listEl, empty);
      return;
    }

    // 时间轴视图
    if (state.homeView === 'timeline') {
      renderTimeline(listEl, empty);
      return;
    }

    // 待解决筛选：仅显示未解决的 Bug 报告
    if (state.pendingOnly) {
      var bugs = Store.getUnresolvedBugs();
      if (bugs.length === 0) {
        empty.hidden = false;
        $('homeEmptyText').textContent = '🎉 没有待解决的 Bug，全部搞定！';
        return;
      }
      empty.hidden = true;
      bugs.forEach(function (note) { listEl.appendChild(buildCard(note)); });
      return;
    }

    var notes = state.filterTag ? Store.getByTag(state.filterTag) : Store.searchAll(state.search);

    if (notes.length === 0) {
      empty.hidden = false;
      $('homeEmptyText').textContent = state.search
        ? '没有匹配“' + state.search + '”的笔记。'
        : (state.filterTag ? '该标签下还没有笔记。' : '还没有笔记，点击右下角按钮新建一条吧。');
      return;
    }
    empty.hidden = true;

    notes.forEach(function (note) {
      listEl.appendChild(buildCard(note));
    });
  }

  /** 同步“列表/时间轴”切换按钮的 active 状态 */
  function updateViewToggleActive() {
    Array.prototype.forEach.call(viewToggle.querySelectorAll('.view-toggle__btn'), function (b) {
      b.classList.toggle('active', b.dataset.view === state.homeView);
    });
  }

  /** 时间轴视图：按创建日期分组（日期倒序，日内按创建时间倒序） */
  function renderTimeline(listEl, empty) {
    var notes;
    if (state.pendingOnly) notes = Store.getUnresolvedBugs();
    else if (state.filterTag) notes = Store.getByTag(state.filterTag);
    else if (state.search) notes = Store.searchByTitle(state.search);
    else notes = Store.getAll();

    if (notes.length === 0) {
      empty.hidden = false;
      $('homeEmptyText').textContent = state.pendingOnly
        ? '🎉 没有待解决的 Bug，全部搞定！'
        : '时间轴空空如也，新建一条笔记吧。';
      return;
    }
    empty.hidden = true;

    var groups = {}, order = [];
    notes.forEach(function (n) {
      var key = fmtDateYMD(n.createdAt);
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(n);
    });
    // 日期倒序（YYYY-MM-DD 字符串可直接字典序比较）
    order.sort(function (a, b) { return a < b ? 1 : (a > b ? -1 : 0); });
    order.forEach(function (key) {
      groups[key].sort(function (a, b) { return b.createdAt - a.createdAt; });
      listEl.appendChild(buildTimelineGroup(key, groups[key]));
    });
  }

  /** 单个日期分组：左侧日期，右侧该日笔记标题卡片 */
  function buildTimelineGroup(dateKey, dayNotes) {
    var group = document.createElement('div');
    group.className = 'timeline-day';

    var left = document.createElement('div');
    left.className = 'timeline-date';
    var d = new Date(dateKey + 'T00:00:00');
    left.innerHTML = '<span class="timeline-date__ymd">' + dateKey + '</span>'
      + '<span class="timeline-date__wd">' + weekdayCN(d) + '</span>';

    var right = document.createElement('div');
    right.className = 'timeline-cards';
    dayNotes.forEach(function (note) {
      var c = document.createElement('button');
      c.className = 'timeline-card'
        + (note.type === 'hardware' ? ' timeline-card--hw' : '')
        + (note.type === 'bug' ? ' timeline-card--bug' : '');
      var badge = note.type === 'hardware'
        ? '<span class="hw-badge">🛠️</span>'
        : (note.type === 'bug' ? '<span class="bug-badge">🐛</span>' : '');
      var t = new Date(note.createdAt);
      c.innerHTML = badge
        + '<span class="timeline-card__title">' + escapeHtml(note.title || '（无标题）') + '</span>'
        + '<span class="timeline-card__time">' + pad2(t.getHours()) + ':' + pad2(t.getMinutes()) + '</span>';
      c.addEventListener('click', function () { openDetail(note.id); });
      right.appendChild(c);
    });

    group.appendChild(left);
    group.appendChild(right);
    return group;
  }

  /** 时间戳 -> YYYY-MM-DD */
  function fmtDateYMD(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function weekdayCN(d) {
    return '周' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  }

  /** 引脚速查：渲染匹配的硬件笔记，高亮引脚接线说明 */
  function renderHardwareResults(listEl, empty) {
    var results = Store.searchHardware(state.pinSearch);
    if (results.length === 0) {
      empty.hidden = false;
      $('homeEmptyText').textContent = '没有匹配“' + state.pinSearch + '”的硬件外设。';
      return;
    }
    empty.hidden = true;
    results.forEach(function (note) {
      listEl.appendChild(buildHardwareCard(note, state.pinSearch));
    });
  }

  /** 在文本中高亮关键词（先转义，再包裹 <mark>，关键词大小写不敏感） */
  function highlightKeyword(text, kw) {
    var safe = escapeHtml(text);
    if (!kw) return safe;
    var escKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(escKw, 'gi'), function (m) { return '<mark>' + m + '</mark>'; });
  }

  /** 硬件速查结果卡片 */
  function buildHardwareCard(note, kw) {
    var card = document.createElement('div');
    card.className = 'note-card note-card--hardware';

    var del = document.createElement('button');
    del.className = 'note-card__delete';
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/></svg><span>删除</span>';
    del.addEventListener('click', function (e) { e.stopPropagation(); confirmDelete(note.id); });
    card.appendChild(del);

    var inner = document.createElement('div');
    inner.className = 'note-card__inner';

    var title = document.createElement('h3');
    title.className = 'note-card__title';
    title.innerHTML = '<span class="hw-badge">🛠️ 硬件</span>' + escapeHtml(note.title || '（未命名外设）');
    inner.appendChild(title);

    var sub = document.createElement('p');
    sub.className = 'note-card__sub';
    var model = note.hwModel ? ' <b>' + escapeHtml(note.hwModel) + '</b>' : '';
    var proto = note.hwProtocol ? ' · ' + escapeHtml(note.hwProtocol) : '';
    var volt = note.hwVoltage ? ' · ' + escapeHtml(note.hwVoltage) : '';
    sub.innerHTML = '型号' + model + proto + volt;
    inner.appendChild(sub);

    if (note.hwPins) {
      var pins = document.createElement('p');
      pins.className = 'pin-result__pins';
      pins.innerHTML = highlightKeyword(note.hwPins, kw);
      inner.appendChild(pins);
    }

    attachSwipe(card, inner);
    inner.addEventListener('click', function () {
      if (state.openCard === inner) return;
      openDetail(note.id);
    });
    card.appendChild(inner);
    return card;
  }

  function buildCard(note) {
    var card = document.createElement('div');
    card.className = 'note-card'
      + (note.type === 'hardware' ? ' note-card--hardware' : '')
      + (note.type === 'bug' ? ' note-card--bug' : '')
      + (note.type === 'project' ? ' note-card--project' : '');

    // 删除按钮（底层）
    var del = document.createElement('button');
    del.className = 'note-card__delete';
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/></svg><span>删除</span>';
    del.addEventListener('click', function (e) {
      e.stopPropagation();
      confirmDelete(note.id);
    });
    card.appendChild(del);

    // 内容层（可滑动）
    var inner = document.createElement('div');
    inner.className = 'note-card__inner';

    var title = document.createElement('h3');
    title.className = 'note-card__title';
    if (note.type === 'hardware') {
      title.innerHTML = '<span class="hw-badge">🛠️ 硬件</span>' + escapeHtml(note.title || '（未命名外设）');
    } else if (note.type === 'bug') {
      title.innerHTML = '<span class="bug-badge">🐛 Bug</span>' + escapeHtml(note.title || '（未命名Bug）');
    } else if (note.type === 'project') {
      title.innerHTML = '<span class="proj-badge">📁 项目</span>' + escapeHtml(note.title || '（未命名项目）');
    } else {
      title.textContent = note.title || '（无标题）';
    }
    inner.appendChild(title);

    if (note.type === 'hardware') {
      var sub = document.createElement('p');
      sub.className = 'note-card__sub';
      var model = note.hwModel ? ' <b>' + escapeHtml(note.hwModel) + '</b>' : '';
      var proto = note.hwProtocol ? ' · ' + escapeHtml(note.hwProtocol) : '';
      var volt = note.hwVoltage ? ' · ' + escapeHtml(note.hwVoltage) : '';
      sub.innerHTML = '型号' + model + proto + volt;
      inner.appendChild(sub);
    } else if (note.type === 'bug') {
      var sub = document.createElement('p');
      sub.className = 'note-card__sub';
      var solved = !!note.bugSolved;
      sub.innerHTML = '状态：<b class="' + (solved ? 'bug-status--solved' : 'bug-status--open') + '">'
        + (solved ? '已解决' : '待解决') + '</b>';
      inner.appendChild(sub);
    } else if (note.type === 'project') {
      var sub = document.createElement('p');
      sub.className = 'note-card__sub';
      var mcu = note.projMcu ? ' <b>' + escapeHtml(note.projMcu) + '</b>' : '';
      var st = note.projStatus || '规划中';
      sub.innerHTML = '主控' + mcu + ' · 状态：<b class="proj-status proj-status--' + statusClass(st) + '">' + st + '</b>';
      inner.appendChild(sub);
    }

    var imgCount = countImages(note.body);
    var codeCount = Store.countCode(note.body);
    var preview = previewText(note.body);
    if (preview) {
      var body = document.createElement('p');
      body.className = 'note-card__body';
      body.textContent = preview;
      inner.appendChild(body);
    } else if (imgCount > 0) {
      var body2 = document.createElement('p');
      body2.className = 'note-card__body';
      body2.textContent = '📷 ' + imgCount + ' 张图片';
      inner.appendChild(body2);
    } else if (codeCount > 0) {
      var body3 = document.createElement('p');
      body3.className = 'note-card__body';
      body3.textContent = '💻 ' + codeCount + ' 段代码';
      inner.appendChild(body3);
    }

    var meta = document.createElement('div');
    meta.className = 'note-card__meta';
    (note.tags || []).forEach(function (t) {
      var c = document.createElement('span');
      c.className = 'chip';
      c.textContent = '#' + t;
      meta.appendChild(c);
    });
    var time = document.createElement('span');
    time.className = 'note-card__time';
    time.textContent = relativeTime(note.updatedAt);
    meta.appendChild(time);
    inner.appendChild(meta);

    // 左滑手势（指针事件，兼容触摸与鼠标）
    attachSwipe(card, inner);
    inner.addEventListener('click', function () {
      if (state.openCard === inner) return; // 已展开不触发点击
      openDetail(note.id);
    });

    card.appendChild(inner);
    return card;
  }

  function attachSwipe(card, inner) {
    var startX = 0, startY = 0, dx = 0, dragging = false, decided = false, horizontal = false;
    var REVEAL = -88;

    function onDown(e) {
      if (state.openCard && state.openCard !== inner) closeOpenCard(); // 关掉其它已展开卡片
      startX = e.clientX; startY = e.clientY; dx = 0;
      dragging = true; decided = false; horizontal = false;
      inner.style.transition = 'none';
    }
    function onMove(e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!decided) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          decided = true;
          horizontal = Math.abs(dx) > Math.abs(dy);
        }
      }
      if (horizontal) {
        var cur = parseFloat(inner.dataset.x || '0');
        var next = cur + dx;
        if (next > 0) next = 0;                 // 不允许右滑超界
        if (next < REVEAL) next = REVEAL;       // 不允许超过删除宽度
        inner.style.transform = 'translateX(' + next + 'px)';
        startX = e.clientX; startY = e.clientY; // 增量计算，避免跳变
        e.preventDefault();
      }
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      inner.style.transition = 'transform .18s ease';
      var cur = parseFloat(inner.dataset.x || '0') + dx;
      if (cur <= REVEAL / 2) {
        setOpen(inner, REVEAL);
      } else {
        setOpen(inner, 0);
      }
      if (state.openCard === inner && inner.dataset.x === '0') state.openCard = null;
    }
    function setOpen(el, x) {
      el.style.transform = 'translateX(' + x + 'px)';
      el.dataset.x = String(x);
      if (x === REVEAL) state.openCard = el; else if (state.openCard === el) state.openCard = null;
    }

    inner.addEventListener('pointerdown', onDown);
    inner.addEventListener('pointermove', onMove);
    inner.addEventListener('pointerup', onUp);
    inner.addEventListener('pointercancel', onUp);
    inner.addEventListener('pointerleave', function () { if (dragging) onUp(); });
  }

  function closeOpenCard() {
    if (state.openCard) {
      state.openCard.style.transition = 'transform .18s ease';
      state.openCard.style.transform = 'translateX(0)';
      state.openCard.dataset.x = '0';
      state.openCard = null;
    }
  }

  function confirmDelete(id) {
    var note = Store.getById(id);
    if (!note) return;
    if (!window.confirm('确定删除笔记“' + (note.title || '（无标题）') + '”吗？此操作不可撤销。')) return;
    Store.remove(id);
    if (window.SkillRadar) window.SkillRadar.recomputeOnNoteChange();
    if (window.GitHubSync) window.GitHubSync.onLocalChange();
    closeOpenCard();
    showSnack('已删除');
    renderHome();
  }

  // ============ 标签页 ============
  function renderTags() {
    renderTagNetwork();
    var cloud = $('tagCloud');
    var empty = $('tagsEmpty');
    cloud.innerHTML = '';
    var tags = Store.getAllTags();
    if (tags.length === 0) { empty.hidden = false; return; }
    empty.hidden = true;
    tags.forEach(function (t) {
      var chip = document.createElement('button');
      chip.className = 'tag-chip';
      chip.innerHTML = escapeHtml(t.tag) + ' <span class="count">' + t.count + '</span>';
      chip.addEventListener('click', function () {
        goHomeWithTag(t.tag);
      });
      cloud.appendChild(chip);
    });
  }

  // ============ 标签关联系数网络图 ============
  var tagNetChart = null;     // ECharts 实例
  var tagNetData = null;      // 当前计算出的网络数据
  var TAG_NET_HUE = 262;      // 同色系（紫）渐变主色调

  /** 主入口：进入标签页时调用，计算数据并渲染/降级 */
  function renderTagNetwork() {
    var wrap = $('tagNetwork');
    if (!wrap) return;
    var hint = $('tagNetworkHint');
    var controls = $('tagNetworkControls');

    tagNetData = window.TagNetwork.computeNetwork(Store.getAll());
    var tagCount = tagNetData.nodes.length;

    if (tagCount < 3) {
      // 标签太少：提示并销毁图表
      if (hint) { hint.hidden = false; hint.textContent = '标签数量太少（≥3 个才能生成关系图）。多给笔记打几个不同标签试试～'; }
      if (controls) controls.hidden = true;
      if (tagNetChart) { tagNetChart.dispose(); tagNetChart = null; }
      return;
    }
    if (hint) hint.hidden = true;
    if (controls) controls.hidden = false;

    if (!window.echarts) {
      // CDN 加载失败：降级提示
      if (hint) { hint.hidden = false; hint.textContent = '图表库加载失败（ECharts CDN 被拦截），请检查网络后刷新页面。'; }
      if (tagNetChart) { tagNetChart.dispose(); tagNetChart = null; }
      return;
    }

    var threshold = parseFloat($('tagNetThreshold').value) || 0;
    drawTagNet(threshold, false);
  }

  /** 绘制/更新力导向图。fresh=true 时重建布局（刷新布局按钮） */
  function drawTagNet(threshold, fresh) {
    var chartEl = $('tagNetworkChart');
    if (!chartEl || !window.echarts || !tagNetData) return;

    var justCreated = false;
    if (fresh && tagNetChart) { tagNetChart.dispose(); tagNetChart = null; }
    if (!tagNetChart) {
      tagNetChart = window.echarts.init(chartEl);
      tagNetChart.on('click', function (params) {
        if (params.dataType === 'node' && params.name) goHomeWithTag(params.name);
      });
      justCreated = true;
    }

    var net = tagNetData;
    var n = net.nodes.length;
    // 节点：同一色系按出现频次映射亮度（渐变）
    var ordered = net.nodes.slice().sort(function (a, b) { return b.value - a.value; });
    var colorOf = {};
    ordered.forEach(function (node, i) {
      var light = 42 + (n <= 1 ? 0 : (i / (n - 1)) * 38); // 42%~80%
      colorOf[node.name] = 'hsl(' + TAG_NET_HUE + ',72%,' + light.toFixed(1) + '%)';
    });
    var labelColor = isDarkTheme() ? '#e9e9f0' : '#2b2b33';

    var nodes = net.nodes.map(function (node) {
      return {
        name: node.name,
        value: node.value,
        symbolSize: node.symbolSize,
        itemStyle: { color: colorOf[node.name] },
        label: { color: labelColor }
      };
    });

    // 连线：仅保留关联度 > 阈值的；粗细/透明度/颜色随关联度增强
    var links = net.links
      .filter(function (l) { return l.corr > threshold; })
      .map(function (l) {
        return {
          source: l.source,
          target: l.target,
          co: l.co,
          corr: l.corr,
          lineStyle: {
            width: 1 + l.corr * 9,
            opacity: 0.25 + l.corr * 0.65,
            curveness: 0.08,
            color: 'rgba(124,92,255,' + (0.35 + l.corr * 0.6).toFixed(2) + ')'
          }
        };
      });

    var dark = isDarkTheme();
    var textColor = dark ? '#cfcfe0' : '#3a3a44';
    var option = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: dark ? 'rgba(30,30,40,.92)' : 'rgba(255,255,255,.96)',
        borderColor: 'rgba(124,92,255,.4)',
        textStyle: { color: textColor, fontSize: 12 },
        formatter: function (p) {
          if (p.dataType === 'node') {
            return '<b>' + escapeHtml(p.data.name) + '</b><br/>出现 ' + p.data.value + ' 篇笔记';
          }
          return escapeHtml(p.data.source) + ' · ' + escapeHtml(p.data.target) +
            '<br/>关联度 ' + p.data.corr.toFixed(2) + '（共现 ' + p.data.co + ' 次）';
        }
      },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        data: nodes,
        links: links,
        force: { repulsion: 150, edgeLength: [70, 200], gravity: 0.08, friction: 0.18 },
        label: { show: true, position: 'right', fontSize: 12, formatter: '{b}' },
        lineStyle: { color: 'source' },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
        scaleLimit: { min: 0.4, max: 4 }
      }]
    };
    tagNetChart.setOption(option, justCreated || fresh);
    tagNetChart.resize(); // 修正切换标签/窗口变化后的尺寸（display:none 后恢复会量错）
  }

  /** 是否深色主题（用于图表配色） */
  function isDarkTheme() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) { return false; }
  }

  // ============ 统计页 ============
  function renderStats() {
    var s = Store.stats();
    $('statToday').textContent = s.today;
    $('statWeek').textContent = s.week;

    // 柱状图（纯 CSS）
    var chart = $('chart');
    chart.innerHTML = '';
    var max = Math.max.apply(null, s.last7.map(function (d) { return d.count; }).concat([1]));
    s.last7.forEach(function (d) {
      var col = document.createElement('div');
      col.className = 'bar-col';
      var val = document.createElement('div');
      val.className = 'bar-col__val';
      val.textContent = d.count;
      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = (Math.max(d.count, 0) / max * 100) + '%';
      bar.title = d.label + '：' + d.count + ' 篇';
      var label = document.createElement('div');
      label.className = 'bar-col__label';
      label.textContent = d.label;
      col.appendChild(val);
      col.appendChild(bar);
      col.appendChild(label);
      chart.appendChild(col);
    });

    // 总览
    $('overview').innerHTML =
      '笔记总数：<b>' + s.total + '</b> 篇<br>' +
      '今日新增：<b>' + s.today + '</b> 篇<br>' +
      '本周新增：<b>' + s.week + '</b> 篇';

    // 随缘复习联动
    if ($('revCount')) $('revCount').textContent = window.ReviewStore.getTodayCount();
    if ($('revFocusCount')) $('revFocusCount').textContent = window.ReviewStore.getFocus().length;

    // 学习路标：已达成目标数 + 路标面板
    if (statGoals) statGoals.textContent = (window.LearningGoals ? window.LearningGoals.getDoneCount() : 0);
    renderGoalsPanel();

    // 技能雷达图
    renderSkillRadar();
  }

  // ============ 学习路标 ============
  /** 首页横幅：最近截止的进行中目标；无则提示去设置 */
  function refreshGoalBanner() {
    if (!goalBanner || !window.LearningGoals) return;
    var g = window.LearningGoals.nearestActive();
    if (!g) {
      goalBanner.hidden = false;
      goalBanner.className = 'goal-banner goal-banner--empty';
      goalBanner.innerHTML = '🎯 还没有学习目标，去设置一个吧！'
        + '<button type="button" class="goal-banner__link" id="goalBannerLink">去统计页设置 →</button>';
      var link = $('goalBannerLink');
      if (link) link.addEventListener('click', function () { navigate('stats'); });
      return;
    }
    var left = window.LearningGoals.daysLeft(g.due);
    var txt = '剩余 ' + (left < 0 ? ('已逾期 ' + (-left) + ' 天') : (left + ' 天'));
    goalBanner.hidden = false;
    goalBanner.className = 'goal-banner' + (left < 0 ? ' goal-banner--overdue' : (left < 3 ? ' goal-banner--soon' : ''));
    goalBanner.innerHTML = '🎯 当前目标：<b>' + escapeHtml(g.name) + '</b> ' + txt
      + '<button type="button" class="goal-banner__link" id="goalBannerLink">查看 →</button>';
    var link = $('goalBannerLink');
    if (link) link.addEventListener('click', function () { openGoalDetail(g.id); });
  }

  /** 渲染统计页“学习路标”面板（进行中 / 已完成两个列表） */
  function renderGoalsPanel() {
    if (!window.LearningGoals) return;
    var active = window.LearningGoals.getActive();
    var done = window.LearningGoals.getDone();

    goalListActive.innerHTML = '';
    active.forEach(function (g) { goalListActive.appendChild(buildGoalCard(g)); });
    goalEmptyActive.hidden = active.length > 0;

    goalListDone.innerHTML = '';
    done.forEach(function (g) { goalListDone.appendChild(buildGoalCard(g)); });
    goalEmptyDone.hidden = done.length > 0;
  }

  /** 构建单个目标卡片 */
  function buildGoalCard(g) {
    var left = window.LearningGoals.daysLeft(g.due);
    var isDone = g.status === 'done';
    var cls = 'goal-card';
    if (isDone) cls += ' goal-card--done';
    else if (left < 0) cls += ' goal-card--overdue';
    else if (left < 3) cls += ' goal-card--soon';

    var card = document.createElement('div');
    card.className = cls;

    var head = document.createElement('div');
    head.className = 'goal-card__head';
    var title = document.createElement('div');
    title.className = 'goal-card__title';
    title.textContent = g.name;
    head.appendChild(title);
    card.appendChild(head);

    var sub = document.createElement('div');
    sub.className = 'goal-card__sub';
    if (isDone) {
      sub.innerHTML = '已完成 · 完成日期 ' + (g.doneDate || '—');
    } else {
      var tag = left < 0 ? ('已逾期 ' + (-left) + ' 天') : ('剩余 ' + left + ' 天');
      sub.innerHTML = '截止 ' + escapeHtml(g.due) + ' · ' + tag;
    }
    card.appendChild(sub);

    var countEl = document.createElement('div');
    countEl.className = 'goal-card__count';
    countEl.textContent = '关联笔记：' + window.LearningGoals.getNotesForGoal(g.id).length + ' 条';
    card.appendChild(countEl);

    var actions = document.createElement('div');
    actions.className = 'goal-card__actions';
    var bDone = document.createElement('button');
    bDone.type = 'button'; bDone.className = 'goal-card__btn goal-card__btn--done';
    bDone.textContent = '✅ 标记完成';
    bDone.addEventListener('click', function (e) { e.stopPropagation(); markGoalDone(g.id); });
    var bEdit = document.createElement('button');
    bEdit.type = 'button'; bEdit.className = 'goal-card__btn';
    bEdit.textContent = '✏️ 编辑';
    bEdit.addEventListener('click', function (e) { e.stopPropagation(); openGoalModal(g.id); });
    var bDel = document.createElement('button');
    bDel.type = 'button'; bDel.className = 'goal-card__btn goal-card__btn--danger';
    bDel.textContent = '🗑️ 删除';
    bDel.addEventListener('click', function (e) { e.stopPropagation(); deleteGoal(g.id); });
    actions.appendChild(bDone);
    actions.appendChild(bEdit);
    actions.appendChild(bDel);
    card.appendChild(actions);

    card.addEventListener('click', function () { openGoalDetail(g.id); });
    return card;
  }

  /** 打开目标详情页（关联笔记列表） */
  function openGoalDetail(id) {
    if (!window.LearningGoals) return;
    var g = window.LearningGoals.getById(id);
    if (!g) { showSnack('目标不存在'); return; }
    state.goalId = id;
    goalDetailTitle.textContent = g.name;
    var left = window.LearningGoals.daysLeft(g.due);
    var meta = goalDetailMeta;
    meta.innerHTML = '';
    var chip1 = document.createElement('span');
    chip1.className = 'chip';
    chip1.textContent = g.status === 'done' ? ('已完成 · ' + (g.doneDate || '')) : (left < 0 ? ('已逾期 ' + (-left) + ' 天') : ('剩余 ' + left + ' 天'));
    meta.appendChild(chip1);
    var chip2 = document.createElement('span');
    chip2.className = 'chip';
    chip2.textContent = '截止 ' + g.due;
    meta.appendChild(chip2);

    goalDetailDesc.innerHTML = '';
    if (g.desc) {
      var d = document.createElement('p');
      d.className = 'goal-detail__desc-text';
      d.textContent = g.desc;
      goalDetailDesc.appendChild(d);
    }

    renderGoalNotes(id);
    setView('goal');
  }

  /** 渲染目标详情页的关联笔记列表 */
  function renderGoalNotes(id) {
    var notes = window.LearningGoals.getNotesForGoal(id);
    goalNoteList.innerHTML = '';
    goalNoteCount.textContent = notes.length;
    if (notes.length === 0) { goalNoteEmpty.hidden = false; return; }
    goalNoteEmpty.hidden = true;
    notes.forEach(function (n) {
      var wrap = document.createElement('div');
      wrap.className = 'focus-item';
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'focus-item__main';
      var d = new Date(n.createdAt);
      item.innerHTML = '<span class="focus-item__title">' + escapeHtml(n.title || '（无标题）')
        + '</span><span class="goal-note__date">' + (d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()) + '</span>';
      item.addEventListener('click', function () { openDetail(n.id); });
      wrap.appendChild(item);
      goalNoteList.appendChild(wrap);
    });
  }

  /** 打开新建 / 编辑目标弹窗 */
  function openGoalModal(editId) {
    if (!window.LearningGoals) return;
    goalModal.dataset.editId = editId || '';
    if (editId) {
      var g = window.LearningGoals.getById(editId);
      if (!g) return;
      goalModalTitle.textContent = '编辑路标';
      goalNameInput.value = g.name;
      goalDueInput.value = g.due;
      goalDescInput.value = g.desc || '';
    } else {
      goalModalTitle.textContent = '新建路标';
      goalNameInput.value = '';
      goalDueInput.value = '';
      goalDescInput.value = '';
    }
    goalModal.hidden = false;
    setTimeout(function () { goalNameInput.focus(); }, 50);
  }

  /** 保存目标弹窗（新建或编辑） */
  function saveGoalModal() {
    if (!window.LearningGoals) return;
    var name = goalNameInput.value.trim();
    var due = goalDueInput.value.trim();
    var desc = goalDescInput.value.trim();
    if (!name) { showSnack('请填写目标名称'); goalNameInput.focus(); return; }
    if (!due) { showSnack('请选择截止日期'); goalDueInput.focus(); return; }
    var editId = goalModal.dataset.editId || '';
    var res = editId
      ? window.LearningGoals.update(editId, { name: name, due: due, desc: desc })
      : window.LearningGoals.add({ name: name, due: due, desc: desc });
    if (!res) { showSnack('保存失败，请检查名称与日期'); return; }
    goalModal.hidden = true;
    showSnack(editId ? '已更新路标' : '已新建路标');
    renderGoalsPanel();
    refreshGoalBanner();
    if (statGoals) statGoals.textContent = window.LearningGoals.getDoneCount();
    if (window.GitHubSync) window.GitHubSync.onLocalChange(); // 改动后自动推送（含学习目标）
  }

  /** 标记完成 */
  function markGoalDone(id) {
    if (!window.LearningGoals) return;
    window.LearningGoals.markDone(id);
    showSnack('已标记为完成 🎉');
    renderGoalsPanel();
    refreshGoalBanner();
    if (statGoals) statGoals.textContent = window.LearningGoals.getDoneCount();
    if (window.GitHubSync) window.GitHubSync.onLocalChange();
  }

  /** 删除目标（解除关联笔记） */
  function deleteGoal(id) {
    if (!window.LearningGoals) return;
    var g = window.LearningGoals.getById(id);
    if (!g) return;
    if (!window.confirm('确定删除目标“' + g.name + '”吗？关联的笔记不会删除，仅解除关联。')) return;
    window.LearningGoals.remove(id);
    showSnack('已删除路标');
    renderGoalsPanel();
    refreshGoalBanner();
    if (statGoals) statGoals.textContent = window.LearningGoals.getDoneCount();
    if (window.GitHubSync) window.GitHubSync.onLocalChange();
  }

  // ============ 技能雷达图 ============
  /** 是否处于深色模式（用于 Canvas 配色） */
  function isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /** 渲染技能雷达面板：原始分、校准行、雷达图、推荐语 */
  function renderSkillRadar() {
    if (!window.SkillRadar) return;
    var scores = window.SkillRadar.getScores();
    var auto = window.SkillRadar.getAuto();
    var overrides = window.SkillRadar.getOverrides();
    var dims = window.SkillRadar.DIMENSIONS;

    // 1) 每个维度的原始（自动）得分
    skillRawScores.innerHTML = '';
    dims.forEach(function (d) {
      var el = document.createElement('span');
      el.className = 'skill-radar__raw-item';
      el.textContent = d.name + ': ' + auto[d.key].toFixed(1) + '/10';
      skillRawScores.appendChild(el);
    });

    // 2) 手动校准行
    skillCalib.innerHTML = '';
    dims.forEach(function (d) {
      var isManual = !!overrides[d.key];
      var row = document.createElement('div');
      row.className = 'skill-radar__row';
      row.innerHTML =
        '<div class="skill-radar__row-head">' +
          '<span class="skill-radar__name">' + escapeHtml(d.name) +
            (isManual ? ' <span class="skill-radar__manual">手动</span>' : '') + '</span>' +
          '<span class="skill-radar__val" id="skillVal_' + d.key + '">' + scores[d.key].toFixed(1) + '/10</span>' +
        '</div>' +
        '<div class="skill-radar__row-control">' +
          '<input type="range" min="0" max="10" step="0.5" value="' + scores[d.key].toFixed(1) +
            '" class="skill-radar__slider" id="skillSlider_' + d.key + '" data-key="' + d.key + '" />' +
          '<button type="button" class="skill-radar__reset" data-key="' + d.key + '"' +
            (isManual ? '' : ' disabled') + '>↺ 自动</button>' +
        '</div>';
      skillCalib.appendChild(row);
    });

    // 滑动条：手动校准（不整体重渲染，保持拖动体验）
    Array.prototype.forEach.call(skillCalib.querySelectorAll('.skill-radar__slider'), function (sl) {
      sl.addEventListener('input', function () {
        var key = sl.dataset.key;
        var v = parseFloat(sl.value);
        window.SkillRadar.setManual(key, v);
        $('skillVal_' + key).textContent = v.toFixed(1) + '/10';
        markManualRow(key, true);
        drawSkillRadar(window.SkillRadar.getScores());
        updateRecommend();
      });
    });
    // 重置：恢复自动评分（整体重渲染以同步状态）
    Array.prototype.forEach.call(skillCalib.querySelectorAll('.skill-radar__reset'), function (b) {
      b.addEventListener('click', function () {
        window.SkillRadar.resetManual(b.dataset.key);
        renderSkillRadar();
        showSnack('已恢复自动评分');
      });
    });

    // 3) 雷达图 + 4) 推荐语
    drawSkillRadar(scores);
    updateRecommend();
  }

  /** 标记/取消某校准行的“手动”徽标与重置按钮可用状态 */
  function markManualRow(key, on) {
    var slider = $('skillSlider_' + key);
    if (!slider) return;
    var row = slider.closest('.skill-radar__row');
    var nameEl = row.querySelector('.skill-radar__name');
    var resetBtn = row.querySelector('.skill-radar__reset');
    var badge = nameEl.querySelector('.skill-radar__manual');
    if (on && !badge) {
      badge = document.createElement('span');
      badge.className = 'skill-radar__manual';
      badge.textContent = '手动';
      nameEl.appendChild(badge);
    } else if (!on && badge) {
      badge.remove();
    }
    resetBtn.disabled = !on;
  }

  /** 纯 Canvas 绘制五边形雷达图（半透明填充，顶点标注维度名与分数） */
  function drawSkillRadar(scores) {
    if (!skillRadarCanvas) return;
    var cssW = skillRadarCanvas.clientWidth || 300;
    var cssH = skillRadarCanvas.clientHeight || 300;
    if (cssW === 0 || cssH === 0) return; // 不可见时不绘制
    var dpr = window.devicePixelRatio || 1;
    skillRadarCanvas.width = Math.round(cssW * dpr);
    skillRadarCanvas.height = Math.round(cssH * dpr);
    var ctx = skillRadarCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var dark = isDarkMode();
    var cx = cssW / 2, cy = cssH / 2;
    var dims = window.SkillRadar.DIMENSIONS;
    var n = dims.length;
    var maxR = Math.min(cssW, cssH) / 2 - 48; // 预留标签空间
    var startAngle = -Math.PI / 2;

    function point(i, r) {
      var ang = startAngle + i * (2 * Math.PI / n);
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    }

    // 背景网格环
    var rings = 5;
    for (var g = 1; g <= rings; g++) {
      var rr = maxR * g / rings;
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var p = point(i, rr);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.10)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 轴线
    for (var i = 0; i < n; i++) {
      var ap = point(i, maxR);
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(ap[0], ap[1]);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.20)' : 'rgba(0,0,0,.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 数据多边形
    var pts = [];
    for (var i = 0; i < n; i++) {
      var v = Math.max(0, Math.min(10, scores[dims[i].key])) / 10;
      pts.push(point(i, maxR * v));
    }
    ctx.beginPath();
    pts.forEach(function (p, idx) { if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.closePath();
    ctx.fillStyle = dark ? 'rgba(208,188,255,.35)' : 'rgba(103,80,164,.28)';
    ctx.fill();
    ctx.strokeStyle = dark ? '#D0BCFF' : '#6750A4';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 顶点圆点
    pts.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 2 * Math.PI);
      ctx.fillStyle = dark ? '#D0BCFF' : '#6750A4'; ctx.fill();
    });

    // 顶点标签：维度名 + 当前分数
    ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
    for (var i = 0; i < n; i++) {
      var lp = point(i, maxR + 24);
      var ang = startAngle + i * (2 * Math.PI / n);
      var cosA = Math.cos(ang);
      var align = Math.abs(cosA) < 0.3 ? 'center' : (cosA > 0 ? 'left' : 'right');
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = dark ? '#E6E0E9' : '#1C1B1F';
      ctx.fillText(dims[i].name + ' ' + scores[dims[i].key].toFixed(1), lp[0], lp[1]);
    }
  }

  /** 推荐语：优势维度（最高分）/ 建议提升（最低分），并记录搜索目标 */
  function updateRecommend() {
    if (!window.SkillRadar) return;
    var scores = window.SkillRadar.getScores();
    var dims = window.SkillRadar.DIMENSIONS;
    var allZero = dims.every(function (d) { return scores[d.key] <= 0; });
    var best = dims[0], worst = dims[0];
    dims.forEach(function (d) {
      if (scores[d.key] > scores[best.key]) best = d;
      if (scores[d.key] < scores[worst.key]) worst = d;
    });

    if (allZero) {
      skillRecommend.textContent = '暂无数据：先去写几条笔记，雷达图会自动为你打分。';
      btnSkillRelated.disabled = true;
      btnSkillRelated.dataset.key = '';
      return;
    }
    skillRecommend.innerHTML = '你的优势维度：<b>' + escapeHtml(best.name) + '</b>，建议提升：<b>' +
      escapeHtml(worst.name) + '</b>';
    btnSkillRelated.disabled = false;
    btnSkillRelated.dataset.key = worst.key; // 用最弱维度的核心关键词搜索
  }

  /** 跳转首页搜索并自动填入某维度核心关键词 */
  function viewRelatedNotes(key) {
    var kw = window.SkillRadar.coreKeyword(key);
    if (!kw) return;
    // 清空其它筛选状态，确保搜索生效
    state.filterTag = null;
    state.pendingOnly = false;
    if (pendingBtn) pendingBtn.classList.remove('active');
    state.pinSearch = '';
    if (pinInput) { pinInput.value = ''; state.pinSearch = ''; }
    if (pinClear) pinClear.hidden = true;
    searchInput.value = kw;
    state.search = kw;
    searchClear.hidden = false;
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.classList.toggle('active', b.dataset.nav === 'home');
    });
    setView('home');
    showSnack('已按「' + kw + '」搜索相关笔记');
  }

  /** 进入统计页：重置到“统计”子标签并渲染 */
  function enterStats() {
    setStatsSub('main');
  }

  /** 切换统计页子标签（main / roadmap / projects） */
  function setStatsSub(sub) {
    Array.prototype.forEach.call(statsSubtabs.querySelectorAll('.subtab'), function (b) {
      b.classList.toggle('active', b.dataset.sub === sub);
    });
    statsMain.hidden = sub !== 'main';
    statsRoadmap.hidden = sub !== 'roadmap';
    statsProjects.hidden = sub !== 'projects';

    if (sub === 'roadmap') renderRoadmap();
    else if (sub === 'projects') renderProjectWall();
    else renderStats();
  }

  /** 学习路线图：构建进度条 + 横向 Stepper */
  function renderRoadmap() {
    var route = state.currentRoute;
    var info = window.Roadmap.progressInfo(route);
    var nodes = window.Roadmap.ROADMAPS[route] || [];

    roadmapRouteName.textContent = route;
    roadmapCount.textContent = '已完成 ' + info.done + '/' + info.total + ' 步';
    roadmapPct.textContent = info.percent + '%';
    roadmapFill.style.width = info.percent + '%';

    // 路线按钮高亮
    Array.prototype.forEach.call(roadmapRoutes.querySelectorAll('.roadmap-route'), function (b) {
      b.classList.toggle('active', b.dataset.route === route);
    });

    // Stepper
    roadmapStepper.innerHTML = '';
    nodes.forEach(function (name, idx) {
      var done = !!info.states[idx];
      var step = document.createElement('div');
      step.className = 'step' + (done ? ' step--done' : '') + (idx > 0 && info.states[idx - 1] ? ' step--reached' : '');

      var circle = document.createElement('button');
      circle.type = 'button';
      circle.className = 'step__circle';
      circle.setAttribute('aria-label', (done ? '已完成：' : '未完成：') + name);
      circle.textContent = done ? '✓' : (idx + 1);
      circle.addEventListener('click', function () { toggleRoadmapNode(route, idx); });

      var label = document.createElement('div');
      label.className = 'step__name';
      label.textContent = name;

      var checkWrap = document.createElement('label');
      checkWrap.className = 'step__check';
      var check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = done;
      check.addEventListener('change', function () { toggleRoadmapNode(route, idx); });
      var checkText = document.createElement('span');
      checkText.textContent = '完成';
      checkWrap.appendChild(check);
      checkWrap.appendChild(checkText);

      step.appendChild(circle);
      step.appendChild(label);
      step.appendChild(checkWrap);
      roadmapStepper.appendChild(step);
    });
  }

  /** 切换路线图节点完成状态并重渲染 */
  function toggleRoadmapNode(route, idx) {
    window.Roadmap.toggle(route, idx);
    renderRoadmap();
    if (window.GitHubSync) window.GitHubSync.onLocalChange();
  }

  /** 项目墙：卡片网格展示所有项目（名称 / 主控 / 状态标签） */
  function renderProjectWall() {
    var projects = Store.getProjects();
    projWall.innerHTML = '';
    if (projects.length === 0) {
      projEmpty.hidden = false;
      return;
    }
    projEmpty.hidden = true;
    projects.forEach(function (note) {
      var card = document.createElement('div');
      card.className = 'proj-tile proj-tile--' + statusClass(note.projStatus);

      var name = document.createElement('div');
      name.className = 'proj-tile__name';
      name.textContent = note.projName || note.title || '（未命名项目）';

      var mcu = document.createElement('div');
      mcu.className = 'proj-tile__mcu';
      mcu.textContent = note.projMcu ? ('主控：' + note.projMcu) : '主控：—';

      var status = document.createElement('span');
      status.className = 'proj-status proj-status--' + statusClass(note.projStatus);
      status.textContent = note.projStatus || '规划中';

      card.appendChild(name);
      card.appendChild(mcu);
      card.appendChild(status);

      card.addEventListener('click', function () { openDetail(note.id); });
      projWall.appendChild(card);
    });
  }

  /** 状态 -> 样式类（规划中/进行中/已完成） */
  function statusClass(s) {
    if (s === '进行中') return 'doing';
    if (s === '已完成') return 'done';
    return 'plan';
  }

  // ============ 编辑页 ============
  function openEdit(id) {
    state.editId = id || null;
    var titleEl = $('editTitle');
    var bodyEl = $('editBody');
    var tagsEl = $('editTags');
    var delBtn = $('btnDelete');

    if (id) {
      var note = Store.getById(id);
      if (!note) { showSnack('笔记不存在'); return; }
      currentEditType = note.type === 'project' ? 'project'
        : (note.type === 'bug' ? 'bug' : (note.type === 'hardware' ? 'hardware' : 'note'));
      titleEl.value = note.title || '';
      bodyEl.innerHTML = RT.sanitize(RT.normalizeBody(note.body || ''));
      tagsEl.value = (note.tags || []).join(', ');
      hwName.value = note.hwName || '';
      hwModel.value = note.hwModel || '';
      hwVoltage.value = note.hwVoltage || '';
      hwProtocol.value = note.hwProtocol || 'I2C';
      hwPins.value = note.hwPins || '';
      bugSymptom.value = note.bugSymptom || '';
      bugSteps.value = note.bugSteps || '';
      bugRootCause.value = note.bugRootCause || '';
      bugSolved.checked = !!note.bugSolved;
      projName.value = note.projName || '';
      projMcu.value = note.projMcu || '';
      projPeripherals.value = note.projPeripherals || '';
      projGithub.value = note.projGithub || '';
      projStatus.value = note.projStatus || '规划中';
      projDesc.value = note.projDesc || '';
      delBtn.hidden = false;
    } else {
      currentEditType = 'note';
      titleEl.value = '';
      bodyEl.innerHTML = '';
      tagsEl.value = '';
      hwName.value = '';
      hwModel.value = '';
      hwVoltage.value = '';
      hwProtocol.value = 'I2C';
      hwPins.value = '';
      bugSymptom.value = '';
      bugSteps.value = '';
      bugRootCause.value = '';
      bugSolved.checked = false;
      projName.value = '';
      projMcu.value = '';
      projPeripherals.value = '';
      projGithub.value = '';
      projStatus.value = '规划中';
      projDesc.value = '';
      delBtn.hidden = true;
    }
    // 关联目标下拉：列出进行中的路标，并保留当前笔记已关联的（即使是已完成）
    var currentGoalId = '';
    if (id) { var _n = Store.getById(id); currentGoalId = _n ? (_n.goalId || '') : ''; }
    populateGoalSelect(currentGoalId);
    syncTypeVisibility();
    updateTagPreview();
    updateBodyPreview();
    setView('edit');
    setTimeout(function () { titleEl.focus(); }, 50);
  }

  /** 填充“关联目标”下拉（进行中目标；若已关联已完成目标也一并保留） */
  function populateGoalSelect(currentGoalId) {
    if (!editGoal || !window.LearningGoals) return;
    var active = window.LearningGoals.getActive();
    var opts = ['<option value="">不关联</option>'];
    active.forEach(function (g) {
      var sel = (g.id === currentGoalId) ? ' selected' : '';
      opts.push('<option value="' + escapeHtml(g.id) + '"' + sel + '>' + escapeHtml(g.name) + '</option>');
    });
    // 已关联但已完成的，追加为只读选项（避免切换类型时丢失关联）
    if (currentGoalId) {
      var already = active.some(function (g) { return g.id === currentGoalId; });
      var goal = window.LearningGoals.getById(currentGoalId);
      if (goal && !already) {
        opts.push('<option value="' + escapeHtml(goal.id) + '" selected>' + escapeHtml(goal.name) + '（已完成）</option>');
      }
    }
    editGoal.innerHTML = opts.join('');
  }

  /** 根据当前类型切换 标题 / 硬件字段 / Bug 字段 / 项目字段 显隐，并刷新分段按钮高亮 */
  function syncTypeVisibility() {
    var isHw = currentEditType === 'hardware';
    var isBug = currentEditType === 'bug';
    var isProj = currentEditType === 'project';
    titleField.hidden = (isHw || isBug || isProj);   // 硬件/Bug/项目 类型下标题由字段派生
    hwFields.hidden = !isHw;
    bugFields.hidden = !isBug;
    projFields.hidden = !isProj;
    Array.prototype.forEach.call(typeSeg.querySelectorAll('.type-seg__btn'), function (b) {
      b.classList.toggle('active', b.dataset.type === currentEditType);
    });
  }

  /** 切换笔记类型（普通 / 硬件 / Bug） */
  function setEditType(type) {
    currentEditType = type;
    syncTypeVisibility();
  }

  function updateTagPreview() {
    var wrap = $('tagPreview');
    wrap.innerHTML = '';
    var tags = Store.parseTags($('editTags').value);
    tags.forEach(function (t) {
      var c = document.createElement('span');
      c.className = 'chip';
      c.textContent = '#' + t;
      wrap.appendChild(c);
    });
  }

  /** 在光标处插入图片（data URL，直接插入 <img> 节点） */
  function insertImageToken(dataUrl) {
    var bodyEl = $('editBody');
    var img = document.createElement('img');
    img.src = dataUrl;
    img.alt = '图片';
    RT.insertNodeAtCursor(bodyEl, img);
    RT.insertNodeAtCursor(bodyEl, document.createElement('br'));
    updateBodyPreview();
  }

  /** 实时渲染正文（含图片），供编辑页预览 */
  function updateBodyPreview() {
    // 简单提示：图片以 token 形式存在正文，已在 textarea 中。
    // 这里提供一个可视化预览区更友好（可选）。为保持聚焦，仅保证保存正确。
  }

  function saveNote() {
    var type = currentEditType;
    // 富文本：取 HTML 并做白名单清洗；若无有效内容（无文字/图片/代码）则存空串
    var body = RT.sanitize($('editBody').innerHTML);
    var bodyPlain = RT.toPlainText(body);
    if (!bodyPlain.trim() && !/<img\b/i.test(body) && !/<pre\b/i.test(body)) body = '';
    var tagsRaw = $('editTags').value;

    var title;
    var hwNameVal = '', hwModelVal = '', hwVoltageVal = '', hwProtocolVal = '', hwPinsVal = '';
    var bugSymptomVal = '', bugStepsVal = '', bugRootCauseVal = '', bugSolvedVal = false;
    var projNameVal = '', projMcuVal = '', projPeriphsVal = '', projGithubVal = '', projStatusVal = '', projDescVal = '';
    if (type === 'hardware') {
      hwNameVal = hwName.value.trim();
      hwModelVal = hwModel.value.trim();
      hwVoltageVal = hwVoltage.value.trim();
      hwProtocolVal = hwProtocol.value;
      hwPinsVal = hwPins.value;
      title = hwNameVal || hwModelVal || '未命名外设';
    } else if (type === 'bug') {
      bugSymptomVal = bugSymptom.value.trim();
      bugStepsVal = bugSteps.value;
      bugRootCauseVal = bugRootCause.value;
      bugSolvedVal = bugSolved.checked;
      title = bugSymptomVal || '未命名Bug';
    } else if (type === 'project') {
      projNameVal = projName.value.trim();
      projMcuVal = projMcu.value.trim();
      projPeriphsVal = projPeripherals.value;
      projGithubVal = projGithub.value.trim();
      projStatusVal = projStatus.value || '规划中';
      projDescVal = projDesc.value;
      title = projNameVal || '未命名项目';
    } else {
      title = $('editTitle').value.trim();
    }

    if (type !== 'hardware' && type !== 'bug' && type !== 'project' && !title && !body.trim() && !tagsRaw.trim()) {
      showSnack('标题、正文、标签至少填写一项');
      return;
    }
    if (type === 'hardware' && !hwNameVal && !hwModelVal && !body.trim()) {
      showSnack('请至少填写外设名称或型号');
      return;
    }
    if (type === 'bug' && !bugSymptomVal && !bugStepsVal && !bugRootCauseVal && !body.trim()) {
      showSnack('请至少填写现象描述、复现步骤或正文之一');
      return;
    }
    if (type === 'project' && !projNameVal && !projMcuVal && !body.trim()) {
      showSnack('请至少填写项目名称或所用主控');
      return;
    }

    var saved = Store.save({
      id: state.editId, type: type, title: title, body: body, tagsRaw: tagsRaw,
      hwName: hwNameVal, hwModel: hwModelVal, hwVoltage: hwVoltageVal,
      hwProtocol: hwProtocolVal, hwPins: hwPinsVal,
      bugSymptom: bugSymptomVal, bugSteps: bugStepsVal, bugRootCause: bugRootCauseVal, bugSolved: bugSolvedVal,
      projName: projNameVal, projMcu: projMcuVal, projPeripherals: projPeriphsVal,
      projGithub: projGithubVal, projStatus: projStatusVal, projDesc: projDescVal,
      goalId: editGoal ? editGoal.value : ''
    });
    if (window.SkillRadar) window.SkillRadar.recomputeOnNoteChange(); // 笔记变更 → 重算未被手动校准的维度
    showSnack(state.editId ? '已更新' : '已保存');
    state.editId = null;
    if (window.GitHubSync) window.GitHubSync.onLocalChange(); // 改动后自动推送（防抖）
    navigate('home');
  }

  function deleteCurrent() {
    if (!state.editId) return;
    var note = Store.getById(state.editId);
    if (!note) return;
    if (!window.confirm('确定删除这条笔记吗？')) return;
    Store.remove(state.editId);
    state.editId = null;
    if (window.SkillRadar) window.SkillRadar.recomputeOnNoteChange();
    if (window.GitHubSync) window.GitHubSync.onLocalChange();
    showSnack('已删除');
    navigate('home');
  }

  // ============ 笔记详情页（只读 + 代码高亮 + 复制） ============
  function openDetail(id) {
    var note = Store.getById(id);
    if (!note) { showSnack('笔记不存在'); return; }
    state.detailId = id;
    $('detailTitle').textContent = note.title || '（无标题）';

    var meta = $('detailMeta');
    meta.innerHTML = '';
    (note.tags || []).forEach(function (t) {
      var c = document.createElement('span');
      c.className = 'chip';
      c.textContent = '#' + t;
      meta.appendChild(c);
    });
    var time = document.createElement('span');
    time.className = 'chip';
    time.textContent = relativeTime(note.updatedAt);
    meta.appendChild(time);

    renderDetailBody($('detailBody'), note.body);

    // 串口日志解析按钮：仅当正文（纯文本）包含多行时显示
    if (RT.toPlainText(note.body || '').indexOf('\n') !== -1) {
      btnParseLog.hidden = false;
      btnParseLog.onclick = function () { openLogSheet(note); };
    } else {
      btnParseLog.hidden = true;
      btnParseLog.onclick = null;
    }

    renderHwSpec(note);
    renderBugSpec(note);
    renderProjSpec(note);
    renderDetailLinks(note);

    setView('detail');
  }

  /** 硬件参数区（仅硬件类型显示） */
  function renderHwSpec(note) {
    hwSpec.innerHTML = '';
    if (note.type !== 'hardware') { hwSpec.hidden = true; return; }
    hwSpec.hidden = false;

    var title = document.createElement('div');
    title.className = 'hw-spec__title';
    title.innerHTML = '🛠️ 硬件参数';
    hwSpec.appendChild(title);

    var grid = document.createElement('dl');
    grid.className = 'hw-spec__grid';
    function row(dtText, ddText) {
      if (!ddText) return;
      var dt = document.createElement('dt'); dt.textContent = dtText;
      var dd = document.createElement('dd'); dd.textContent = ddText;
      grid.appendChild(dt); grid.appendChild(dd);
    }
    row('型号', note.hwModel);
    row('电压', note.hwVoltage);
    row('协议', note.hwProtocol);
    if (note.hwPins) {
      var dt = document.createElement('dt'); dt.textContent = '引脚';
      var dd = document.createElement('dd'); dd.className = 'hw-pins-text';
      dd.innerHTML = escapeHtml(note.hwPins).replace(/\n/g, '<br>');
      grid.appendChild(dt); grid.appendChild(dd);
    }
    hwSpec.appendChild(grid);
  }

  /** Bug 报告参数区（仅 Bug 类型显示） */
  function renderBugSpec(note) {
    bugSpec.innerHTML = '';
    if (note.type !== 'bug') { bugSpec.hidden = true; return; }
    bugSpec.hidden = false;

    var title = document.createElement('div');
    title.className = 'bug-spec__title';
    title.innerHTML = '🐛 Bug 报告 · <span class="' + (note.bugSolved ? 'bug-status--solved' : 'bug-status--open') + '">'
      + (note.bugSolved ? '已解决' : '待解决') + '</span>';
    bugSpec.appendChild(title);

    var grid = document.createElement('dl');
    grid.className = 'bug-spec__grid';
    function row(dtText, ddText, multiline) {
      if (!ddText) return;
      var dt = document.createElement('dt'); dt.textContent = dtText;
      var dd = document.createElement('dd');
      if (multiline) { dd.className = 'bug-multiline'; dd.innerHTML = escapeHtml(ddText).replace(/\n/g, '<br>'); }
      else dd.textContent = ddText;
      grid.appendChild(dt); grid.appendChild(dd);
    }
    row('现象描述', note.bugSymptom);
    row('复现步骤', note.bugSteps, true);
    row('根因分析', note.bugRootCause, true);
    bugSpec.appendChild(grid);
  }

  /** 项目参数区（仅项目类型显示） */
  function renderProjSpec(note) {
    projSpec.innerHTML = '';
    if (note.type !== 'project') { projSpec.hidden = true; return; }
    projSpec.hidden = false;

    var title = document.createElement('div');
    title.className = 'proj-spec__title';
    title.innerHTML = '📁 项目参数 · <span class="proj-status proj-status--' + statusClass(note.projStatus || '规划中') + '">'
      + (note.projStatus || '规划中') + '</span>';
    projSpec.appendChild(title);

    var grid = document.createElement('dl');
    grid.className = 'proj-spec__grid';
    function row(dtText, ddText, multiline) {
      if (!ddText) return;
      var dt = document.createElement('dt'); dt.textContent = dtText;
      var dd = document.createElement('dd');
      if (multiline) { dd.className = 'proj-multiline'; dd.innerHTML = escapeHtml(ddText).replace(/\n/g, '<br>'); }
      else if (dtText === 'GitHub') {
        var a = document.createElement('a');
        a.href = ddText; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = ddText;
        dd.appendChild(a);
      } else dd.textContent = ddText;
      grid.appendChild(dt); grid.appendChild(dd);
    }
    row('主控', note.projMcu);
    row('外设', note.projPeripherals, true);
    row('GitHub', note.projGithub);
    row('简介', note.projDesc, true);
    projSpec.appendChild(grid);
  }

  /** 双向链接：底部“关联笔记”区域 */
  function renderDetailLinks(note) {
    detailLinks.innerHTML = '';
    var links = Store.extractLinks(note.body || '');
    if (links.length === 0) { detailLinks.hidden = true; return; }
    detailLinks.hidden = false;

    var head = document.createElement('div');
    head.className = 'detail-links__title';
    head.innerHTML = '🔗 关联笔记（' + links.length + '）';
    detailLinks.appendChild(head);

    var list = document.createElement('div');
    list.className = 'detail-links__list';
    links.forEach(function (title) {
      var target = Store.getByTitle(title);
      var chip = document.createElement('button');
      if (target) {
        chip.className = 'link-chip';
        chip.textContent = '📄 ' + title;
        chip.addEventListener('click', function () { openDetail(target.id); });
      } else {
        chip.className = 'link-chip link-chip--missing';
        chip.textContent = '❔ ' + title + '（未创建）';
      }
      list.appendChild(chip);
    });
    detailLinks.appendChild(list);
  }

  /** 渲染详情正文：富文本 HTML（旧 token 自动转换），代码块/双链替换为交互组件 */
  function renderDetailBody(container, body) {
    container.innerHTML = '';
    var html = RT.sanitize(RT.normalizeBody(body || ''));
    var tmp = document.createElement('div');
    tmp.innerHTML = html;

    // 代码块 <pre class="cb" data-lang> → 高亮 + 复制组件
    Array.prototype.slice.call(tmp.querySelectorAll('pre')).forEach(function (pre) {
      var lang = pre.getAttribute('data-lang') || 'c';
      var code = pre.textContent || '';
      var holder = document.createElement('div');
      appendCodeBlock(holder, lang, code);
      pre.parentNode.replaceChild(holder.firstChild, pre);
    });

    // 双链 <span data-link="标题"> → 可点击跳转
    Array.prototype.slice.call(tmp.querySelectorAll('span[data-link]')).forEach(function (sp) {
      var t = sp.getAttribute('data-link') || '';
      var holder = document.createElement('span');
      appendLinkNode(holder, t);
      sp.parentNode.replaceChild(holder.firstChild, sp);
    });

    while (tmp.firstChild) container.appendChild(tmp.firstChild);
  }

  /** 内联双链：存在则点击跳转，不存在则灰色显示 */
  function appendLinkNode(container, rawTitle) {
    var title = (rawTitle || '').trim();
    var target = Store.getByTitle(title);
    var a = document.createElement('span');
    if (target) {
      a.className = 'link-inline';
      a.setAttribute('role', 'link');
      a.tabIndex = 0;
      a.textContent = '[[' + title + ']]';
      a.addEventListener('click', function () { openDetail(target.id); });
    } else {
      a.className = 'link-inline link-inline--missing';
      a.textContent = '[[' + title + ']]';
    }
    container.appendChild(a);
  }

  /** 单个代码块：头部（语言 + 复制按钮）+ 高亮正文 */
  function appendCodeBlock(container, lang, code) {
    var wrap = document.createElement('div');
    wrap.className = 'code-block';

    var head = document.createElement('div');
    head.className = 'code-block__head';
    var langLabel = document.createElement('span');
    langLabel.className = 'code-block__lang';
    langLabel.textContent = langLabelText(lang);
    var copyBtn = document.createElement('button');
    copyBtn.className = 'code-block__copy';
    copyBtn.innerHTML = copyIconSvg() + '<span>复制</span>';
    copyBtn.addEventListener('click', function () { copyText(code, copyBtn); });
    head.appendChild(langLabel);
    head.appendChild(copyBtn);

    var pre = document.createElement('pre');
    var codeEl = document.createElement('code');
    codeEl.innerHTML = highlight(code, lang);
    pre.appendChild(codeEl);

    wrap.appendChild(head);
    wrap.appendChild(pre);
    container.appendChild(wrap);
  }

  function langLabelText(lang) {
    var map = { c: 'C', asm: '汇编', makefile: 'Makefile' };
    return map[lang] || lang;
  }

  function copyIconSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>';
  }

  /** 复制纯文本到剪贴板，带降级方案与按钮反馈 */
  function copyText(text, btn) {
    function done() {
      var label = btn.querySelector('span');
      var prev = label ? label.textContent : '';
      if (label) label.textContent = '已复制';
      setTimeout(function () { if (label) label.textContent = prev || '复制'; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { showSnack('复制失败'); }
    document.body.removeChild(ta);
  }

  // ============ 语法高亮（轻量、离线、VS Code Dark+ 配色） ============
  var HL = {
    c: {
      keywords: ['if','else','for','while','do','switch','case','default','break','continue','return','goto','sizeof','struct','union','enum','typedef','static','const','volatile','extern','register','auto','void'],
      types: ['int','char','float','double','long','short','unsigned','signed','bool','size_t','uint8_t','uint16_t','uint32_t','int8_t','int16_t','int32_t','FILE','NULL'],
      lineComment: '//',
      blockComment: true
    },
    asm: {
      keywords: ['mov','add','sub','mul','div','push','pop','call','ret','jmp','je','jne','jg','jl','jge','jle','ja','jb','jae','jbe','jz','jnz','jcxz','cmp','lea','int','syscall','nop','xor','and','or','not','shl','shr','sal','sar','inc','dec','test','loop','loope','loopne','neg','imul','idiv','adc','sbb','cli','sti','hlt','in','out','xchg'],
      types: ['eax','ebx','ecx','edx','esi','edi','ebp','esp','ax','bx','cx','dx','ah','al','bh','bl','ch','cl','dh','dl','eip','eflags','rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp','rip','r8','r9','r10','r11','r12','r13','r14','r15','mm0','mm1','xmm0','xmm1','ymm0'],
      directives: ['section','global','extern','db','dw','dd','dq','equ','times','proc','endp','macro','endm','include','bits','use32','use64','resb','resw','resd','segment','ends','label'],
      lineComment: ';'
    },
    makefile: {
      keywords: ['all','clean','.PHONY','include','ifdef','ifndef','ifeq','ifneq','else','endif','export','unexport','override','define','endef','vpath'],
      lineComment: '#',
      make: true
    }
  };

  function arrayToSet(arr) { var s = {}; arr.forEach(function (x) { s[x] = true; }); return s; }

  function span(cls, text) {
    return '<span class="' + cls + '">' + escapeHtml(text) + '</span>';
  }

  function isLineStart(code, i) {
    for (var x = i - 1; x >= 0; x--) {
      if (code[x] === '\n') return true;
      if (code[x] !== ' ' && code[x] !== '\t') return false;
    }
    return true;
  }

  function highlight(code, lang) {
    var conf = HL[lang] || {};
    var kw = conf.keywords ? arrayToSet(conf.keywords) : {};
    var ty = conf.types ? arrayToSet(conf.types) : {};
    var dir = conf.directives ? arrayToSet(conf.directives) : {};
    var lineComment = conf.lineComment || null;
    var blockComment = !!conf.blockComment;
    var isMake = !!conf.make;

    var out = '';
    var i = 0, n = code.length;
    while (i < n) {
      var c = code[i];

      // 块注释 /* */
      if (blockComment && c === '/' && code[i + 1] === '*') {
        var j = code.indexOf('*/', i + 2);
        j = j === -1 ? n : j + 2;
        out += span('hl-comment', code.slice(i, j));
        i = j; continue;
      }
      // 行注释（// ; #）
      if (lineComment && code.startsWith(lineComment, i)) {
        var k = code.indexOf('\n', i);
        k = k === -1 ? n : k;
        out += span('hl-comment', code.slice(i, k));
        i = k; continue;
      }
      // C 预处理指令（行首 #include 等）
      if (blockComment && c === '#' && isLineStart(code, i)) {
        var e = code.indexOf('\n', i);
        e = e === -1 ? n : e;
        out += span('hl-pre', code.slice(i, e));
        i = e; continue;
      }
      // 字符串
      if (c === '"' || c === "'") {
        var q = c, p = i + 1;
        while (p < n && code[p] !== q) { if (code[p] === '\\') p++; p++; }
        p = p < n ? p + 1 : n;
        out += span('hl-string', code.slice(i, p));
        i = p; continue;
      }
      // 数字
      if (/[0-9]/.test(c) && (i === 0 || !/[A-Za-z0-9_]/.test(code[i - 1]))) {
        var q2 = i;
        while (q2 < n && /[0-9a-fA-FxX.]/.test(code[q2])) q2++;
        out += span('hl-number', code.slice(i, q2));
        i = q2; continue;
      }
      // 标识符 / 关键字 / 类型 / 指令 / Makefile 目标
      if (/[A-Za-z_]/.test(c)) {
        var q3 = i;
        while (q3 < n && /[A-Za-z0-9_]/.test(code[q3])) q3++;
        var word = code.slice(i, q3);
        var cls = null;
        if (kw[word]) cls = 'hl-keyword';
        else if (ty[word]) cls = 'hl-type';
        else if (dir[word]) cls = 'hl-pre';
        else if (isMake) {
          var r = q3;
          while (r < n && code[r] === ' ') r++;
          if (code[r] === ':' && code[r + 1] !== '=') cls = 'hl-func'; // 目标名
        }
        out += cls ? span(cls, word) : escapeHtml(word);
        i = q3; continue;
      }
      // Makefile 变量 $(...) 或 $@ 等
      if (isMake && c === '$') {
        var q4 = i + 1;
        if (code[q4] === '(') {
          var close = code.indexOf(')', q4);
          close = close === -1 ? n : close + 1;
          out += span('hl-var', code.slice(i, close));
          i = close; continue;
        }
        out += escapeHtml('$');
        i += 1; continue;
      }
      out += escapeHtml(c);
      i++;
    }
    return out;
  }

  // ============ 插入代码块（编辑工具栏） ============
  var CODE_TEMPLATES = {
    c: '#include <stdio.h>\n\nint main() {\n    // 在这里写代码\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
    asm: 'section .text\nglobal _start\n\n_start:\n    ; 在这里写汇编代码\n    mov eax, 1\n    mov ebx, 0\n    int 0x80\n',
    makefile: 'CC = gcc\nCFLAGS = -Wall\n\nTarget: Source.c\n\t$(CC) $(CFLAGS) -o Target Source.c\n\nclean:\n\trm -f Target\n'
  };

  function openCodeModal() { $('codeModal').hidden = false; }
  function closeCodeModal() { $('codeModal').hidden = true; }

  /** 在光标处插入代码块（<pre class="cb" data-lang> 节点，可直接编辑） */
  function insertCodeBlock(lang) {
    var tpl = CODE_TEMPLATES[lang] || '';
    var bodyEl = $('editBody');
    var pre = document.createElement('pre');
    pre.className = 'cb';
    pre.setAttribute('data-lang', lang);
    pre.textContent = tpl;
    RT.insertNodeAtCursor(bodyEl, pre);
    RT.insertNodeAtCursor(bodyEl, document.createElement('br'));
    closeCodeModal();
    showSnack('已插入代码块');
  }

  // ============ 相机 / 相册 ============
  var cameraStream = null;
  function openCamera() {
    var modal = $('cameraModal');
    var video = $('cameraVideo');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showSnack('当前浏览器不支持调用相机');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(function (stream) {
        cameraStream = stream;
        video.srcObject = stream;
        modal.hidden = false;
      })
      .catch(function (err) {
        console.error(err);
        showSnack('无法访问相机：' + (err.name === 'NotAllowedError' ? '权限被拒绝' : '设备不可用'));
      });
  }
  function closeCamera() {
    $('cameraModal').hidden = true;
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (t) { t.stop(); });
      cameraStream = null;
    }
  }
  function captureCamera() {
    var video = $('cameraVideo');
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    closeCamera();
    insertImageToken(dataUrl);
    showSnack('已插入照片');
  }
  function pickAlbum(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { showSnack('请选择图片文件'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      insertImageToken(reader.result);
      showSnack('已插入图片');
    };
    reader.onerror = function () { showSnack('读取图片失败'); };
    reader.readAsDataURL(file);
    e.target.value = ''; // 允许重复选同一张
  }

  // ============ 极速捕获（语音转文字，Web Speech API） ============
  var recognition = null;
  var voiceRecording = false;

  /** 在正文光标处插入文本（语音输入等） */
  function insertTextAtCursor(text) {
    RT.insertTextAtCursor($('editBody'), text);
  }

  function updateMicButton(on) {
    if (on) {
      btnMic.classList.add('tool-btn--recording');
      btnMic.querySelector('span').textContent = '录音中';
    } else {
      btnMic.classList.remove('tool-btn--recording');
      btnMic.querySelector('span').textContent = '语音';
    }
  }

  function stopVoice() {
    if (recognition && voiceRecording) {
      try { recognition.stop(); } catch (e) {}
    }
    voiceRecording = false;
    updateMicButton(false);
  }

  function toggleVoice() {
    if (voiceRecording) { stopVoice(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showSnack('当前浏览器不支持语音识别，建议使用 Chrome / Edge 桌面版');
      return;
    }
    try {
      recognition = new SR();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      voiceRecording = true;

      recognition.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            var txt = e.results[i][0].transcript;
            if (txt) insertTextAtCursor(txt);
          }
        }
      };
      recognition.onerror = function (ev) {
        var err = ev && ev.error;
        if (err === 'not-allowed' || err === 'service-not-allowed') showSnack('麦克风权限被拒绝');
        else if (err === 'no-speech') showSnack('未检测到语音');
        else showSnack('语音识别出错：' + (err || 'unknown'));
        stopVoice();
      };
      recognition.onend = function () {
        voiceRecording = false;
        updateMicButton(false);
      };
      recognition.start();
      updateMicButton(true);
      showSnack('正在聆听… 说完再次点击麦克风结束');
    } catch (e) {
      console.error(e);
      voiceRecording = false;
      updateMicButton(false);
      showSnack('无法启动语音识别');
    }
  }

  // ============ 一键打包导出（Markdown + 图片 ZIP） ============
  function ymd() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function exportBackup() {
    if (typeof window.NoteExport === 'undefined') { showSnack('导出模块未加载'); return; }
    var notes = Store.getAll();
    if (notes.length === 0) { showSnack('暂无可导出的笔记'); return; }
    try {
      var files = window.NoteExport.collectFiles(notes);
      var bytes = window.NoteExport.buildZip(files);
      var blob = new Blob([bytes], { type: 'application/zip' });
      triggerDownload(blob, 'learning_notes_backup_' + ymd() + '.zip');
      showSnack('已导出 ' + notes.length + ' 条笔记（' + files.length + ' 个文件）');
    } catch (e) {
      console.error(e);
      showSnack('导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }

  // ============ 工具页：定时器 / 波特率计算器 ============
  function fmtNum(n) {
    if (!isFinite(n)) return String(n);
    var r = Math.round(n * 1e6) / 1e6;
    return String(r);
  }

  /** 定时器溢出时间：((PSC+1)*(ARR+1)) / 时钟频率(MHz) */
  function calcTimer() {
    var clk = parseFloat($('timerClk').value);
    var psc = parseFloat($('timerPsc').value);
    var arr = parseFloat($('timerArr').value);
    var res = $('timerResult');
    if (!isFinite(clk) || clk <= 0 || !isFinite(psc) || psc < 0 || !isFinite(arr) || arr < 0) {
      res.hidden = false;
      res.className = 'tool-result tool-result--error';
      res.textContent = '请填写有效的正数（时钟频率 > 0，PSC / ARR ≥ 0）。';
      return;
    }
    var ticks = (psc + 1) * (arr + 1);
    var fHz = clk * 1e6;            // MHz -> Hz
    var period_s = ticks / fHz;     // 秒
    var ms = period_s * 1000;
    var us = period_s * 1e6;
    res.hidden = false;
    res.className = 'tool-result';
    res.innerHTML = '溢出时间 = ((PSC+1) × (ARR+1)) / f = (' + fmtNum(psc + 1) + ' × ' + fmtNum(arr + 1)
      + ') / ' + fmtNum(clk) + ' MHz<br>'
      + '= <b>' + fmtNum(ticks) + '</b> 个时钟周期 ÷ <b>' + fmtNum(clk) + '</b> MHz<br>'
      + '≈ <b>' + fmtNum(ms) + ' ms</b>（约 ' + fmtNum(us) + ' μs）';
  }

  /** 波特率 = 时钟频率(MHz) / (16 × USARTDIV) */
  function calcBaud() {
    var clk = parseFloat($('baudClk').value);
    var div = parseFloat($('baudDiv').value);
    var res = $('baudResult');
    if (!isFinite(clk) || clk <= 0 || !isFinite(div) || div <= 0) {
      res.hidden = false;
      res.className = 'tool-result tool-result--error';
      res.textContent = '请填写有效的正数（时钟频率 > 0，USARTDIV > 0）。';
      return;
    }
    var baud = (clk * 1e6) / (16 * div);
    res.hidden = false;
    res.className = 'tool-result';
    res.innerHTML = '波特率 = f / (16 × USARTDIV) = ' + fmtNum(clk) + ' MHz / (16 × ' + fmtNum(div) + ')<br>'
      + '≈ <b>' + fmtNum(baud) + ' bps</b>（约 ' + fmtNum(baud / 1000) + ' kbps）';
  }

  // ============ 串口日志智能解析（半屏底部面板） ============
  function openLogSheet(note) {
    var result = window.LogParser.classify(RT.toPlainText(note.body || ''));
    var lines = logLines;
    lines.innerHTML = '';

    if (!window.LogParser.hasStandardLevel(result)) {
      var empty = document.createElement('div');
      empty.className = 'sheet__empty';
      empty.textContent = '未检测到标准日志级别';
      lines.appendChild(empty);
    } else {
      result.lines.forEach(function (ln) {
        var div = document.createElement('div');
        div.className = 'log-line' + (ln.level ? (' log-line--' + ln.level) : ' log-line--plain');
        div.textContent = ln.text.length ? ln.text : ' ';
        lines.appendChild(div);
      });
    }

    // 统计摘要
    logSummary.innerHTML = '';
    function chip(label, cls, n) {
      var c = document.createElement('span');
      c.className = 'lg';
      c.innerHTML = '<span class="lg-dot lg-dot--' + cls + '"></span>' + label + ' <b>' + n + '</b>';
      logSummary.appendChild(c);
    }
    chip('ERROR', 'error', result.counts.error);
    chip('WARN', 'warn', result.counts.warn);
    chip('OK', 'ok', result.counts.ok);
    chip('FAIL', 'fail', result.counts.fail);

    logBackdrop.hidden = false;
    logSheet.hidden = false;
  }

  function closeLogSheet() {
    logSheet.hidden = true;
    logBackdrop.hidden = true;
  }

  // ============ 随缘复习（闪卡模式） ============
  /** 笔记类型 → 图标 + 中文标签 */
  function typeIcon(type) {
    if (type === 'hardware') return { icon: '🛠️', label: '硬件外设' };
    if (type === 'bug') return { icon: '🐛', label: 'Bug 报告' };
    if (type === 'project') return { icon: '📁', label: '项目' };
    return { icon: '📝', label: '普通笔记' };
  }

  /** 打开一张随机复习卡片 */
  function openReview() {
    var all = Store.getAll();
    if (all.length < 3) {
      showSnack('笔记太少啦，先去写几条吧～');
      return;
    }
    // 排除上一条，尽量避免连续重复
    var pool = all.filter(function (n) { return n.id !== state.lastReviewId; });
    if (pool.length === 0) pool = all;
    var note = pool[Math.floor(Math.random() * pool.length)];
    state.lastReviewId = note.id;
    window.ReviewStore.bumpCount();   // 每次打开计数 +1（跨日自动重置）
    // 若当前在统计页，刷新联动数字
    if (state.view === 'stats') renderStats();
    renderReviewCard(note);
    reviewModal.hidden = false;
  }

  function renderReviewCard(note) {
    var ti = typeIcon(note.type);
    reviewType.innerHTML = ti.icon + ' ' + ti.label;
    reviewTitle.textContent = note.title || '（无标题）';

    // 正文前 300 字（纯文本）
    var text = RT.toPlainText(note.body || '').replace(/\s+/g, ' ').trim();
    if (text.length > 300) text = text.slice(0, 300) + '…';
    reviewBodyText.textContent = text || '（无正文）';

    // 缩略图（取第一张图片）
    var imgs = Store.extractImages(note.body);
    reviewThumb.innerHTML = '';
    if (imgs.length) {
      var img = document.createElement('img');
      img.src = imgs[0];
      img.alt = '缩略图';
      reviewThumb.appendChild(img);
      reviewThumb.hidden = false;
    } else {
      reviewThumb.hidden = true;
    }

    // 底部：来自 [标签1] [标签2]
    var tags = (note.tags || []).map(function (t) {
      return '<span class="chip">' + escapeHtml(t) + '</span>';
    }).join(' ');
    reviewFooter.innerHTML = '来自 ' + (tags || '<span class="chip">未分类</span>');
  }

  function closeReview() { reviewModal.hidden = true; }

  /** 打开“复习重点列表”页 */
  function openFocusList() {
    renderFocusList();
    setView('focus');
  }

  function renderFocusList() {
    var ids = window.ReviewStore.getFocus();
    focusList.innerHTML = '';
    var hasAny = false;
    ids.forEach(function (id) {
      var note = Store.getById(id);
      if (!note) { window.ReviewStore.removeFocus(id); return; } // 原笔记已删除
      hasAny = true;
      var ti = typeIcon(note.type);

      var card = document.createElement('div');
      card.className = 'focus-item';

      var left = document.createElement('button');
      left.type = 'button';
      left.className = 'focus-item__main';
      left.innerHTML = '<span class="focus-item__icon">' + ti.icon + '</span>'
        + '<span class="focus-item__title">' + escapeHtml(note.title || '（无标题）') + '</span>';
      left.addEventListener('click', function () { openDetail(id); });

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'focus-item__remove';
      del.textContent = '移除';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        window.ReviewStore.removeFocus(id);
        renderFocusList();
        if (state.view === 'stats') renderStats();
        showSnack('已移除复习重点');
      });

      card.appendChild(left);
      card.appendChild(del);
      focusList.appendChild(card);
    });
    focusEmpty.hidden = hasAny;
  }

  // ============ 工具页：CRC 校验计算器 ============
  /** 从预设/高级参数读取当前 CRC 参数对象 */
  function readCrcParams() {
    var preset = window.CRC.PRESETS[crcPreset.value];
    // 始终以高级参数框的当前值为准（预设仅用于预填）
    return {
      width: parseInt(crcWidth.value, 10) || 16,
      poly: parseInt(crcPoly.value.replace(/^0x/i, ''), 16) || 0,
      init: parseInt(crcInit.value.replace(/^0x/i, ''), 16) || 0,
      xorOut: parseInt(crcXorOut.value.replace(/^0x/i, ''), 16) || 0,
      refIn: crcRefIn.value === 'yes',
      refOut: crcRefOut.value === 'yes'
    };
  }

  /** 用预设模型填充高级参数框 */
  function applyCrcPreset(name) {
    var p = window.CRC.PRESETS[name];
    if (!p) return;
    crcWidth.value = String(p.width);
    crcPoly.value = p.poly.toString(16).toUpperCase();
    crcInit.value = p.init.toString(16).toUpperCase();
    crcXorOut.value = p.xorOut.toString(16).toUpperCase();
    crcRefIn.value = p.refIn ? 'yes' : 'no';
    crcRefOut.value = p.refOut ? 'yes' : 'no';
  }

  function calcCrc() {
    var params = readCrcParams();
    var bytes = crcAsciiMode.checked
      ? window.CRC.parseAscii(crcAscii.value)
      : window.CRC.parseHexInput(crcHex.value);

    if (bytes.length === 0) {
      crcResult.hidden = false;
      crcResult.className = 'tool-result crc-result tool-result--error';
      crcResult.textContent = '请输入有效的数据（十六进制或 ASCII）。';
      return;
    }

    var value = window.CRC.compute(params, bytes);
    var hex = window.CRC.formatHex(value, params.width);
    var bin = (value >>> 0).toString(2);
    var dec = String(value >>> 0);
    var presetName = crcPreset.value;

    crcResult.hidden = false;
    crcResult.className = 'tool-result crc-result';
    crcResult.innerHTML =
      '<div class="crc-result__hex">' + hex + '</div>'
      + '<div class="crc-result__row">二进制：<b>' + bin + '</b></div>'
      + '<div class="crc-result__row">十进制：<b>' + dec + '</b></div>'
      + '<div class="crc-result__summary">' + presetName + ' 校验结果：' + hex + '（' + dec + '）</div>';

    // 记录历史（仅存精简信息）
    window.CRC.addHistory({
      preset: presetName,
      width: params.width,
      input: crcAsciiMode.checked ? ('ASCII: ' + crcAscii.value) : ('HEX: ' + crcHex.value.trim()),
      result: hex
    });
    renderCrcHistory();
  }

  function renderCrcHistory() {
    var list = window.CRC.getHistory();
    crcHistoryList.innerHTML = '';
    if (list.length === 0) {
      crcHistoryList.innerHTML = '<div class="crc-history__empty">暂无历史记录</div>';
      return;
    }
    list.forEach(function (h) {
      var row = document.createElement('div');
      row.className = 'crc-history__item';
      row.innerHTML = '<div class="crc-history__result">' + escapeHtml(h.result) + '</div>'
        + '<div class="crc-history__meta">' + escapeHtml(h.preset) + ' · ' + escapeHtml(h.input) + '</div>';
      crcHistoryList.appendChild(row);
    });
  }

  // ============ 事件绑定 ============
  function bindEvents() {
    // 侧边栏导航（导出 / 同步 按钮单独处理，不切换视图/不高亮）
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.nav === 'export') exportBackup();
        else if (b.dataset.nav === 'sync') openSyncModal();
        else navigate(b.dataset.nav);
        closeSidebar(); // 移动端点击后收起抽屉
      });
    });
    // 移动端汉堡菜单 / 遮罩
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);
    // FAB
    fab.addEventListener('click', function () { openEdit(null); });
    // 返回
    backBtn.addEventListener('click', function () {
      if (state.view === 'edit' || state.view === 'detail') navigate('home');
      else if (state.view === 'focus' || state.view === 'goal') navigate('stats');
    });
    // 搜索
    searchInput.addEventListener('input', function () {
      state.search = searchInput.value;
      searchClear.hidden = !state.search;
      renderHome();
    });
    searchClear.addEventListener('click', function () {
      searchInput.value = ''; state.search = ''; searchClear.hidden = true; renderHome(); searchInput.focus();
    });
    // 编辑页
    $('btnSave').addEventListener('click', saveNote);
    $('btnDelete').addEventListener('click', deleteCurrent);
    $('editTags').addEventListener('input', updateTagPreview);
    // 笔记类型切换（普通 / 硬件 / Bug）—— 三段按钮
    Array.prototype.forEach.call(typeSeg.querySelectorAll('.type-seg__btn'), function (b) {
      b.addEventListener('click', function () { setEditType(b.dataset.type); });
    });
    hwName.addEventListener('input', function () {
      if (currentEditType === 'hardware') $('editTitle').value = hwName.value.trim();
    });
    // 待解决快速筛选
    pendingBtn.addEventListener('click', function () {
      state.pendingOnly = !state.pendingOnly;
      pendingBtn.classList.toggle('active', state.pendingOnly);
      renderHome();
    });
    // 首页视图切换：列表 / 时间轴
    Array.prototype.forEach.call(viewToggle.querySelectorAll('.view-toggle__btn'), function (b) {
      b.addEventListener('click', function () {
        state.homeView = b.dataset.view;
        updateViewToggleActive();
        renderHome();
      });
    });
    // 工具页计算器
    $('btnTimerCalc').addEventListener('click', calcTimer);
    $('btnBaudCalc').addEventListener('click', calcBaud);
    // 统计页子标签（统计 / 路线图 / 项目墙）
    Array.prototype.forEach.call(statsSubtabs.querySelectorAll('.subtab'), function (b) {
      b.addEventListener('click', function () { setStatsSub(b.dataset.sub); });
    });
    // 路线图路线切换
    Array.prototype.forEach.call(roadmapRoutes.querySelectorAll('.roadmap-route'), function (b) {
      b.addEventListener('click', function () {
        state.currentRoute = b.dataset.route;
        renderRoadmap();
      });
    });
    // 语音输入
    btnMic.addEventListener('click', toggleVoice);

    // 富文本格式工具栏（加粗/斜体/下划线/高亮/字号/清除格式）
    var fmtToolbar = $('fmtToolbar');
    if (fmtToolbar) {
      Array.prototype.forEach.call(fmtToolbar.querySelectorAll('.fmt-btn'), function (b) {
        // mousedown 阻止默认，避免编辑器失焦丢失选区
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () {
          var editor = $('editBody');
          editor.focus();
          if (b.dataset.cmd) RT.exec(b.dataset.cmd);
          else if (b.dataset.hl) RT.exec('hiliteColor', b.dataset.hl);
        });
      });
      var fmtFontSize = $('fmtFontSize');
      if (fmtFontSize) {
        fmtFontSize.addEventListener('change', function () {
          if (!fmtFontSize.value) return;
          $('editBody').focus();
          RT.exec('fontSize', fmtFontSize.value);
          fmtFontSize.value = '';
        });
      }
      // 编辑器内快捷键：Ctrl+B / Ctrl+I / Ctrl+U 浏览器原生已支持 contenteditable
      // 粘贴时清洗（延迟到粘贴完成后统一 sanitize）
      $('editBody').addEventListener('paste', function () {
        var editor = $('editBody');
        setTimeout(function () {
          var cleaned = RT.sanitize(editor.innerHTML);
          if (cleaned !== editor.innerHTML) editor.innerHTML = cleaned;
        }, 0);
      });
    }
    // 引脚速查
    pinInput.addEventListener('input', function () {
      state.pinSearch = pinInput.value.trim();
      pinClear.hidden = !state.pinSearch;
      viewToggle.hidden = !!state.pinSearch;   // 速查时不显示视图切换
      renderHome();
    });
    pinClear.addEventListener('click', function () {
      pinInput.value = ''; state.pinSearch = ''; pinClear.hidden = true;
      viewToggle.hidden = false; renderHome(); pinInput.focus();
    });
    // 相机 / 相册
    $('btnCamera').addEventListener('click', openCamera);
    $('btnAlbum').addEventListener('click', function () { $('albumInput').click(); });
    $('albumInput').addEventListener('change', pickAlbum);
    $('cameraCancel').addEventListener('click', closeCamera);
    $('cameraCapture').addEventListener('click', captureCamera);

    // 插入代码块
    $('btnCode').addEventListener('click', openCodeModal);
    $('codeCancel').addEventListener('click', closeCodeModal);
    Array.prototype.forEach.call(document.querySelectorAll('.lang-btn'), function (b) {
      b.addEventListener('click', function () { insertCodeBlock(b.dataset.lang); });
    });
    // 点击弹层背景关闭（代码弹层）
    $('codeModal').addEventListener('click', function (e) { if (e.target === this) closeCodeModal(); });

    // 详情页操作
    $('btnDetailEdit').addEventListener('click', function () {
      if (state.detailId) openEdit(state.detailId);
    });
    $('btnDetailDelete').addEventListener('click', function () {
      if (!state.detailId) return;
      var note = Store.getById(state.detailId);
      if (!note) return;
      if (!window.confirm('确定删除这条笔记吗？')) return;
      Store.remove(state.detailId);
      state.detailId = null;
      if (window.SkillRadar) window.SkillRadar.recomputeOnNoteChange();
      if (window.GitHubSync) window.GitHubSync.onLocalChange();
      showSnack('已删除');
      navigate('home');
    });

    // 串口日志解析面板关闭
    $('logSheetClose').addEventListener('click', closeLogSheet);
    logBackdrop.addEventListener('click', closeLogSheet);

    // 随缘复习（闪卡）
    btnReview.addEventListener('click', openReview);
    reviewSkip.addEventListener('click', closeReview);
    reviewFocus.addEventListener('click', function () {
      if (state.lastReviewId) {
        var added = window.ReviewStore.addFocus(state.lastReviewId);
        showSnack(added ? '已加入复习重点' : '已在复习重点中');
        if (state.view === 'stats') renderStats();
      }
      closeReview();
    });
    reviewModal.addEventListener('click', function (e) { if (e.target === this) closeReview(); });

    // 统计页：查看重点列表
    btnViewFocus.addEventListener('click', openFocusList);

    // 技能雷达图：查看相关笔记（跳转到首页搜索并填入该维度核心关键词）
    btnSkillRelated.addEventListener('click', function () {
      var key = btnSkillRelated.dataset.key;
      if (key) viewRelatedNotes(key);
    });

    // CRC 校验计算器
    crcPreset.addEventListener('change', function () { applyCrcPreset(crcPreset.value); });
    crcAdvancedToggle.addEventListener('click', function () {
      var open = crcAdvanced.hidden;
      crcAdvanced.hidden = !open;
      crcAdvancedToggle.setAttribute('aria-expanded', String(open));
      crcAdvancedToggle.querySelector('.crc-advanced-toggle__caret').style.transform = open ? 'rotate(90deg)' : '';
    });
    crcAsciiMode.addEventListener('change', function () {
      var ascii = crcAsciiMode.checked;
      crcAscii.hidden = !ascii;
      crcHex.hidden = ascii;
    });
    btnCrcCalc.addEventListener('click', calcCrc);
    crcHistoryToggle.addEventListener('click', function () {
      var open = crcHistory.hidden;
      crcHistory.hidden = !open;
      crcHistoryToggle.setAttribute('aria-expanded', String(open));
      crcHistoryToggle.querySelector('.crc-advanced-toggle__caret').style.transform = open ? 'rotate(90deg)' : '';
      if (open) renderCrcHistory();
    });
    crcHistoryClear.addEventListener('click', function () {
      window.CRC.clearHistory();
      renderCrcHistory();
      showSnack('已清空历史记录');
    });

    // 学习路标：新建 / 编辑 / 保存 / 关闭 目标弹窗
    btnNewGoal.addEventListener('click', function () { openGoalModal(null); });
    goalModalCancel.addEventListener('click', function () { goalModal.hidden = true; });
    goalModalSave.addEventListener('click', saveGoalModal);
    goalModal.addEventListener('click', function (e) { if (e.target === this) goalModal.hidden = true; });

    // GitHub 同步：打开 / 保存 / 测试连接 / 立即同步 / 关闭
    syncSave.addEventListener('click', saveSyncConfig);
    syncTest.addEventListener('click', testSyncConnection);
    syncPullBtn.addEventListener('click', function () {
      if (!window.GitHubSync) { showSnack('同步模块未加载'); return; }
      if (!window.GitHubSync.isConfigured()) { showSnack('请先填写并保存配置'); return; }
      syncPullBtn.disabled = true; syncPullBtn.textContent = '拉取中…';
      window.GitHubSync.pull()
        .then(function () { showSnack('拉取完成 ✓'); refreshHomeAndStats(); })
        .catch(function () { /* 错误已由 onError 提示 */ })
        .then(function () { syncPullBtn.disabled = false; syncPullBtn.textContent = '拉取'; refreshSyncStatus(); });
    });
    syncPushBtn.addEventListener('click', function () {
      if (!window.GitHubSync) { showSnack('同步模块未加载'); return; }
      if (!window.GitHubSync.isConfigured()) { showSnack('请先填写并保存配置'); return; }
      syncPushBtn.disabled = true; syncPushBtn.textContent = '推送中…';
      window.GitHubSync.push()
        .then(function () { showSnack('推送完成 ✓'); })
        .catch(function () { /* 错误已由 onError 提示 */ })
        .then(function () {
          syncPushBtn.disabled = false; syncPushBtn.textContent = '推送';
          refreshHomeAndStats(); refreshSyncStatus();
        });
    });
    syncClose.addEventListener('click', function () { syncModal.hidden = true; });
    syncModal.addEventListener('click', function (e) { if (e.target === this) syncModal.hidden = true; });

    // 桌面端 Ctrl/Cmd+S 保存
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && state.view === 'edit') {
        e.preventDefault(); saveNote();
      }
    });

    // 标签关联系数网络图：阈值滑块 / 刷新布局 / 自适应
    var tnThreshold = $('tagNetThreshold');
    if (tnThreshold) tnThreshold.addEventListener('input', function () {
      var v = parseFloat(this.value) || 0;
      var lbl = $('tagNetThresholdVal'); if (lbl) lbl.textContent = v.toFixed(2);
      if (tagNetData) drawTagNet(v, false); // 阈值变化：保留节点布局（merge）
    });
    var tnRefresh = $('tagNetRefresh');
    if (tnRefresh) tnRefresh.addEventListener('click', function () {
      if (tagNetData) drawTagNet(parseFloat($('tagNetThreshold').value) || 0, true); // 刷新布局：重建力导向
    });
    window.addEventListener('resize', function () {
      if (tagNetChart) tagNetChart.resize();
    });
  }

  // ============ GitHub 同步 ============
  function openSyncModal() {
    var c = (window.GitHubSync && window.GitHubSync.getConfig()) || {};
    syncRepo.value = (c.owner && c.repo) ? (c.owner + '/' + c.repo) : (c.owner || '');
    syncBranch.value = c.branch || 'main';
    syncPath.value = c.path || 'data/notes.json';
    syncToken.value = c.token || '';
    refreshSyncStatus();
    syncModal.hidden = false;
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function refreshSyncStatus() {
    if (!window.GitHubSync) return;
    var s = window.GitHubSync.getStatus();
    var txt;
    if (!s.configured) txt = '未配置（填写上方信息并保存）';
    else {
      var cfg = window.GitHubSync.getConfig() || {};
      txt = '已配置仓库：' + window.GitHubSync.repoSlug() + '　路径：' + (cfg.path || 'data/notes.json');
      if (s.lastSynced) txt += '　·　上次同步：' + fmtTime(s.lastSynced);
      if (s.pending) txt += '　·　有改动待同步';
      if (s.lastPullRemote != null) txt += '　·　云端 ' + s.lastPullRemote + ' 条 / 本地 ' + s.lastPullLocal + ' 条';
      if (s.lastPushDiff) {
        var d = s.lastPushDiff;
        txt += '　·　推送：新增 ' + d.added + ' / 更新 ' + d.updated + ' / 保留云端较新 ' + d.remoteNewer + ' 条';
      }
      if (s.lastError) txt += '　·　⚠ ' + s.lastError;
    }
    syncStatus.textContent = txt;
    syncStatus.classList.toggle('sync-status--error', !!(s.lastError));
  }

  function saveSyncConfig() {
    if (!window.GitHubSync) { showSnack('同步模块未加载'); return; }
    var parts = syncRepo.value.trim().split('/');
    var owner = parts[0].trim();
    var repo = (parts[1] || '').trim();
    if (!owner || !repo) { showSnack('请填写 owner/repo，如 yourname/notes-data'); syncRepo.focus(); return; }
    if (!syncToken.value.trim()) { showSnack('请填写 Access Token'); syncToken.focus(); return; }
    window.GitHubSync.saveConfig({
      owner: owner, repo: repo,
      branch: syncBranch.value.trim() || 'main',
      path: syncPath.value.trim() || 'data/notes.json',
      token: syncToken.value.trim()
    });
    showSnack('配置已保存');
    refreshSyncStatus();
  }

  function testSyncConnection() {
    if (!window.GitHubSync) { showSnack('同步模块未加载'); return; }
    var parts = syncRepo.value.trim().split('/');
    if (!parts[0].trim() || !parts[1] || !syncToken.value.trim()) {
      showSnack('请先填写仓库与 Token 再测试'); return;
    }
    syncTest.disabled = true; syncTest.textContent = '测试中…';
    window.GitHubSync.testConnection()
      .then(function (r) { showSnack(r.ok ? ('连接成功：' + r.message) : ('连接失败：' + r.message)); })
      .catch(function (e) { showSnack('连接错误：' + (e && e.message || e)); })
      .then(function () { syncTest.disabled = false; syncTest.textContent = '测试连接'; refreshSyncStatus(); });
  }

  function refreshHomeAndStats() {
    renderHome();
    renderStats();
  }

  // ============ 启动 ============
  function init() {
    bindEvents();
    if (window.CRC) applyCrcPreset(crcPreset.value); // 预填高级参数与默认预设一致
    if (window.GitHubSync) {
      window.GitHubSync.setHandlers({
        onStatus: function () { if (syncStatus) refreshSyncStatus(); },
        onError: function (msg) { showSnack(msg); },
        onSyncStart: function () {},
        onAfterSync: function () { if (typeof renderHome === 'function') renderHome(); }
      });
      // 启动拉取（静默：失败只记状态，不打扰）；拉取完成后刷新列表
      window.GitHubSync.initPull(function () { renderHome(); });
    }
    navigate('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
