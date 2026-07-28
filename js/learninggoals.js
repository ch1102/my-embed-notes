/**
 * learninggoals.js —— 学习路标（统计页子面板 + 首页横幅）
 *
 * 设计要点：
 *  - 目标数据存于 localStorage（key: learning_goals），结构：
 *      { id, name, due('YYYY-MM-DD'), desc, status('active'|'done'), createdAt, doneDate }
 *  - 笔记与目标的关系通过笔记数据中的 goalId 字段表达（满足"goal_note_mapping
 *    或直接在笔记加 goalId"的可选方案），关联笔记列表/数量均按 note.goalId 派生，
 *    避免双写不一致。
 *  - 首页横幅展示「最近截止的进行中目标」（nearestActive）。
 *  - 剩余天数按日期（本地 0 点）计算：<0 已逾期；0~2 临近。
 */
(function (global) {
  'use strict';

  var STORAGE = 'learning_goals';
  var Store = global.NoteStore;

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(STORAGE, JSON.stringify(list)); } catch (e) {}
  }
  function genId() {
    return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /** 今天 0 点时间戳 */
  function startOfToday() {
    var t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  }

  /** 距今天的天数差：>=0 剩余；<0 已逾期（绝对值为逾期天数） */
  function daysLeft(dueStr) {
    if (!dueStr) return Infinity;
    var due = new Date(dueStr + 'T00:00:00');
    if (isNaN(due.getTime())) return Infinity;
    return Math.round((due.getTime() - startOfToday()) / 86400000);
  }

  function fmtYMD(ts) {
    var d = new Date(ts);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function getAll() { return read(); }
  function getById(id) {
    var list = read();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function getActive() {
    return read().filter(function (g) { return g.status !== 'done'; })
      .sort(function (a, b) { return (a.due || '9999') < (b.due || '9999') ? -1 : 1; });
  }
  function getDone() {
    return read().filter(function (g) { return g.status === 'done'; })
      .sort(function (a, b) { return (b.doneDate || '') > (a.doneDate || '') ? 1 : -1; });
  }
  function getActiveCount() { return getActive().length; }
  function getDoneCount() { return getDone().length; }

  /** 最近截止的进行中目标（用于首页横幅）；无则返回 null */
  function nearestActive() {
    var active = getActive();
    return active.length ? active[0] : null;
  }

  /** 新建目标（name/due 必填）。返回创建的目标对象；校验失败返回 null */
  function add(data) {
    var name = (data && data.name || '').trim();
    var due = (data && data.due || '').trim();
    if (!name || !due) return null;
    var list = read();
    var goal = {
      id: genId(),
      name: name,
      due: due,
      desc: (data.desc || '').trim(),
      status: 'active',
      createdAt: Date.now(),
      doneDate: ''
    };
    list.push(goal);
    write(list);
    return goal;
  }

  /** 编辑目标（仅名称/截止/描述） */
  function update(id, data) {
    var list = read();
    var goal = null, idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { goal = list[i]; idx = i; break; } }
    if (!goal) return null;
    var name = (data.name || '').trim();
    var due = (data.due || '').trim();
    if (!name || !due) return null;
    goal.name = name;
    goal.due = due;
    goal.desc = (data.desc || '').trim();
    list[idx] = goal;
    write(list);
    return goal;
  }

  /** 标记完成（记录完成日期） */
  function markDone(id) {
    var list = read();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i].status = 'done';
        list[i].doneDate = fmtYMD(Date.now());
        write(list);
        return list[i];
      }
    }
    return null;
  }

  /** 删除目标，并解除所有关联笔记的 goalId */
  function remove(id) {
    var list = read().filter(function (g) { return g.id !== id; });
    write(list);
    if (Store) {
      Store.getAll().forEach(function (n) {
        if (n.goalId === id) setNoteGoal(n.id, '');
      });
    }
    return true;
  }

  /** 将某笔记关联到目标（goalId='' 表示取消关联）；保留笔记其它字段 */
  function setNoteGoal(noteId, goalId) {
    if (!Store) return;
    var note = Store.getById(noteId);
    if (!note) return;
    note.goalId = goalId || '';
    Store.save(note); // Store.save 会保留既有字段，仅更新 goalId
  }

  /** 取某目标关联的笔记列表（按 note.goalId 派生） */
  function getNotesForGoal(goalId) {
    if (!Store) return [];
    return Store.getAll().filter(function (n) { return n.goalId === goalId; });
  }

  global.LearningGoals = {
    STORAGE: STORAGE,
    daysLeft: daysLeft,
    getAll: getAll,
    getById: getById,
    getActive: getActive,
    getDone: getDone,
    getActiveCount: getActiveCount,
    getDoneCount: getDoneCount,
    nearestActive: nearestActive,
    add: add,
    update: update,
    markDone: markDone,
    remove: remove,
    setNoteGoal: setNoteGoal,
    getNotesForGoal: getNotesForGoal
  };
})(window);
