/**
 * richtext.js —— 富文本核心模块（零依赖）
 *
 * 职责：
 *  - normalizeBody(str)：旧 token 正文（[code:lang]…[/code] / [img:…] / [[双链]] / 纯文本）
 *    自动转换为 HTML；若已是 HTML 则原样返回。保证旧笔记无缝兼容。
 *  - toPlainText(str)：HTML 或旧 token 正文 → 纯文本（供搜索 / 技能雷达 / 闪卡 / 日志解析）。
 *    双链转回 [[标题]] 形式，代码块内容保留。
 *  - toMarkdown(str, imageHandler)：HTML 或旧 token 正文 → Markdown（供导出）。
 *    imageHandler(dataUrl, index) 可选，返回图片的替换文本（如 ![image](images/img_0.png)）。
 *  - sanitize(html)：白名单 XSS 清洗（仅浏览器环境可用，Node 下原样返回）。
 *  - exec(cmd, value)：封装 document.execCommand 的富文本命令（仅浏览器）。
 *  - insertNodeAtCursor(editor, node) / insertTextAtCursor(editor, text)：光标处插入（仅浏览器）。
 *
 * 纯函数（normalizeBody / toPlainText / toMarkdown / looksLikeHtml）不依赖 DOM，
 * 全部走正则实现，可在 Node 环境单元测试。
 */
(function (global) {
  'use strict';

  // ---------- 基础工具 ----------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function unescapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
  }

  // 只认白名单标签，避免把 "#include <stdio.h>" 误判成 HTML
  var HTML_TAG_RE = /<\/?(div|p|br|span|b|strong|i|em|u|s|strike|mark|font|pre|code|img|a|ul|ol|li|h[1-6]|blockquote)\b[^>]*>/i;

  /** 粗略判断字符串是否已经是 HTML 正文 */
  function looksLikeHtml(s) {
    return HTML_TAG_RE.test(s || '');
  }

  // 旧 token 正则（与 store.js 保持一致）
  var IMG_TOKEN_RE = /\[img:(data:image\/[^;\s]+;base64,[^\]]+)\]/g;
  var CODE_TOKEN_RE = /\[code:([a-zA-Z0-9_+-]+)\]([\s\S]*?)\[\/code\]/g;
  var LINK_TOKEN_RE = /\[\[([^\[\]]+)\]\]/g;

  // ---------- 旧 token → HTML ----------
  /**
   * 把旧格式正文转换为 HTML。若已是 HTML 则原样返回。
   * 代码块 → <pre class="cb" data-lang="c">…</pre>
   * 图片   → <img src="data:…">
   * 双链   → <span class="rt-link" data-link="标题">[[标题]]</span>
   * 换行   → <br>
   */
  function normalizeBody(str) {
    var s = str == null ? '' : String(str);
    if (!s) return '';
    if (looksLikeHtml(s)) return s;

    // 先抽出代码块，避免其中内容被再处理
    var codeStore = [];
    s = s.replace(CODE_TOKEN_RE, function (_, lang, code) {
      var idx = codeStore.length;
      codeStore.push('<pre class="cb" data-lang="' + escapeHtml(lang) + '">' + escapeHtml(code) + '</pre>');
      return '\u0000CB' + idx + '\u0000';
    });

    // 图片
    var imgStore = [];
    s = s.replace(IMG_TOKEN_RE, function (_, url) {
      var idx = imgStore.length;
      imgStore.push('<img src="' + url + '" alt="图片">');
      return '\u0000IMG' + idx + '\u0000';
    });

    // 普通文本转义
    s = escapeHtml(s);

    // 双链
    s = s.replace(LINK_TOKEN_RE, function (_, title) {
      var t = title.trim();
      return '<span class="rt-link" data-link="' + escapeHtml(t) + '">[[' + escapeHtml(t) + ']]</span>';
    });

    // 换行
    s = s.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');

    // 还原占位
    s = s.replace(/\u0000CB(\d+)\u0000/g, function (_, i) { return codeStore[+i] || ''; });
    s = s.replace(/\u0000IMG(\d+)\u0000/g, function (_, i) { return imgStore[+i] || ''; });
    return s;
  }

  // ---------- HTML / 旧 token → 纯文本 ----------
  function htmlToPlain(html) {
    var s = String(html || '');

    // 代码块内容保留（前后补换行）
    var codeStore = [];
    s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, function (_, inner) {
      var idx = codeStore.length;
      var code = unescapeHtml(inner.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
      codeStore.push(code);
      return '\u0000CB' + idx + '\u0000';
    });

    // 双链 span → [[标题]]
    s = s.replace(/<span\b[^>]*data-link="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, function (_, t) {
      return '[[' + unescapeHtml(t) + ']]';
    });

    // 图片 → 空格占位
    s = s.replace(/<img\b[^>]*>/gi, ' ');

    // 块级标签结束 / <br> → 换行
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<\/(div|p|li|h[1-6]|blockquote|tr)>/gi, '\n');

    // 去掉其余标签
    s = s.replace(/<[^>]+>/g, '');
    s = unescapeHtml(s);

    // 还原代码块
    s = s.replace(/\u0000CB(\d+)\u0000/g, function (_, i) {
      return '\n' + (codeStore[+i] || '') + '\n';
    });
    return s.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
  }

  function tokenToPlain(str) {
    var s = String(str || '');
    s = s.replace(CODE_TOKEN_RE, function (_, lang, code) { return '\n' + code + '\n'; });
    s = s.replace(IMG_TOKEN_RE, ' ');
    // [[双链]] 保留原样（搜索可命中标题）
    return s.replace(/\n{3,}/g, '\n\n').trim();
  }

  /** HTML 或旧 token 正文 → 纯文本 */
  function toPlainText(str) {
    var s = str == null ? '' : String(str);
    if (!s) return '';
    return looksLikeHtml(s) ? htmlToPlain(s) : tokenToPlain(s);
  }

  // ---------- HTML / 旧 token → Markdown ----------
  /**
   * @param {string} str 正文
   * @param {function=} imageHandler (dataUrl, index) => 替换文本；缺省内联 dataUrl
   */
  function toMarkdown(str, imageHandler) {
    var s = str == null ? '' : String(str);
    if (!s) return '';
    var imgIdx = 0;
    function handleImg(url) {
      var rep = imageHandler ? imageHandler(url, imgIdx) : '![image](' + url + ')';
      imgIdx++;
      return rep;
    }

    if (!looksLikeHtml(s)) {
      // 旧 token：代码块 / 图片直接映射
      s = s.replace(CODE_TOKEN_RE, function (_, lang, code) {
        return '\n```' + lang + '\n' + code.replace(/\n$/, '') + '\n```\n';
      });
      s = s.replace(IMG_TOKEN_RE, function (_, url) { return '\n' + handleImg(url) + '\n'; });
      return s.replace(/\r\n/g, '\n');
    }

    // HTML 路径
    // 1) 抽离代码块
    var codeStore = [];
    s = s.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, function (_, attrs, inner) {
      var langM = /data-lang="([^"]*)"/i.exec(attrs);
      var lang = langM ? unescapeHtml(langM[1]) : '';
      var code = unescapeHtml(inner.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
      var idx = codeStore.length;
      codeStore.push('\n```' + lang + '\n' + code.replace(/\n$/, '') + '\n```\n');
      return '\u0000CB' + idx + '\u0000';
    });

    // 2) 图片
    s = s.replace(/<img\b[^>]*src="([^"]*)"[^>]*>/gi, function (_, url) {
      return '\n' + handleImg(unescapeHtml(url)) + '\n';
    });

    // 3) 双链 span → [[标题]]
    s = s.replace(/<span\b[^>]*data-link="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, function (_, t) {
      return '[[' + unescapeHtml(t) + ']]';
    });

    // 4) 行内样式 → Markdown 标记
    s = s.replace(/<(b|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
    s = s.replace(/<(i|em)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
    s = s.replace(/<mark\b[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==');
    s = s.replace(/<span\b[^>]*style="[^"]*background-color[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '==$1==');
    s = s.replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, '$1');
    s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

    // 5) 块级 → 换行
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<\/(div|p|li|h[1-6]|blockquote)>/gi, '\n');

    // 6) 其余标签去掉、解码
    s = s.replace(/<[^>]+>/g, '');
    s = unescapeHtml(s);

    // 7) 还原代码块
    s = s.replace(/\u0000CB(\d+)\u0000/g, function (_, i) { return codeStore[+i] || ''; });
    return s.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim() + '\n';
  }

  // ---------- XSS 白名单清洗（仅浏览器） ----------
  var ALLOWED_TAGS = {
    div: 1, p: 1, br: 1, span: 1, b: 1, strong: 1, i: 1, em: 1, u: 1,
    s: 1, strike: 1, mark: 1, font: 1, pre: 1, code: 1, img: 1, a: 1,
    ul: 1, ol: 1, li: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, blockquote: 1
  };
  var STYLE_PROPS = ['color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'font-family'];

  function cleanStyle(styleText) {
    var out = [];
    String(styleText || '').split(';').forEach(function (decl) {
      var idx = decl.indexOf(':');
      if (idx < 0) return;
      var prop = decl.slice(0, idx).trim().toLowerCase();
      var val = decl.slice(idx + 1).trim();
      if (STYLE_PROPS.indexOf(prop) === -1) return;
      if (/expression|url\s*\(|javascript/i.test(val)) return;
      out.push(prop + ': ' + val);
    });
    return out.join('; ');
  }

  function cleanNode(node, doc) {
    var children = Array.prototype.slice.call(node.childNodes);
    children.forEach(function (child) {
      if (child.nodeType === 3) return; // 文本节点
      if (child.nodeType !== 1) { node.removeChild(child); return; }
      var tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS[tag]) {
        // 不在白名单：解包（保留子内容），script/style 等危险标签整体删除
        if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed' || tag === 'link' || tag === 'meta') {
          node.removeChild(child);
          return;
        }
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        node.removeChild(child);
        return;
      }
      // 清理属性
      var attrs = Array.prototype.slice.call(child.attributes);
      attrs.forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var val = attr.value;
        var keep = false;
        if (name === 'style') {
          var cleaned = cleanStyle(val);
          if (cleaned) { child.setAttribute('style', cleaned); keep = true; }
        } else if (name === 'src' && tag === 'img') {
          keep = /^data:image\//i.test(val) || /^https?:\/\//i.test(val);
        } else if (name === 'href' && tag === 'a') {
          keep = /^https?:\/\//i.test(val) || /^#/.test(val);
        } else if (name === 'data-link' && tag === 'span') {
          keep = true;
        } else if (name === 'data-lang' && tag === 'pre') {
          keep = true;
        } else if (name === 'class') {
          keep = /^(cb|rt-link)$/.test(val);
        } else if ((name === 'color' || name === 'size' || name === 'face') && tag === 'font') {
          keep = true;
        } else if (name === 'alt' || name === 'contenteditable') {
          keep = (name === 'alt');
        }
        if (!keep && !(name === 'style' && child.getAttribute('style'))) {
          if (name !== 'style') child.removeAttribute(attr.name);
        }
      });
      cleanNode(child, doc);
    });
  }

  /** 白名单清洗 HTML（仅浏览器；Node 环境原样返回） */
  function sanitize(html) {
    var s = String(html == null ? '' : html);
    if (typeof document === 'undefined' || typeof DOMParser === 'undefined') return s;
    if (!s) return '';
    try {
      var doc = new DOMParser().parseFromString('<div id="__rt_root__">' + s + '</div>', 'text/html');
      var root = doc.getElementById('__rt_root__');
      if (!root) return '';
      cleanNode(root, doc);
      return root.innerHTML;
    } catch (e) {
      // 解析失败：退化为转义文本
      return escapeHtml(s);
    }
  }

  // ---------- 富文本命令（仅浏览器） ----------
  /**
   * 执行富文本命令。默认 styleWithCSS=false（产出语义标签 b/i/u），
   * 高亮（hiliteColor/backColor）时切到 CSS 模式以产出 span+style。
   */
  function exec(cmd, value) {
    if (typeof document === 'undefined') return false;
    var useCss = (cmd === 'hiliteColor' || cmd === 'backColor' || cmd === 'foreColor');
    try { document.execCommand('styleWithCSS', false, useCss); } catch (e) { /* 忽略 */ }
    try {
      return document.execCommand(cmd, false, value == null ? null : value);
    } catch (e) {
      return false;
    }
  }

  /** 把 node 插入到编辑器当前光标处（光标不在编辑器内时追加到末尾） */
  function insertNodeAtCursor(editor, node) {
    if (typeof window === 'undefined') return;
    var sel = window.getSelection();
    var range = null;
    if (sel && sel.rangeCount > 0) {
      var r = sel.getRangeAt(0);
      if (editor.contains(r.commonAncestorContainer)) range = r;
    }
    if (range) {
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editor.appendChild(node);
    }
    editor.focus();
  }

  /** 在编辑器光标处插入纯文本 */
  function insertTextAtCursor(editor, text) {
    insertNodeAtCursor(editor, document.createTextNode(text));
  }

  // ---------- 导出 ----------
  global.RichText = {
    escapeHtml: escapeHtml,
    unescapeHtml: unescapeHtml,
    looksLikeHtml: looksLikeHtml,
    normalizeBody: normalizeBody,
    toPlainText: toPlainText,
    toMarkdown: toMarkdown,
    sanitize: sanitize,
    exec: exec,
    insertNodeAtCursor: insertNodeAtCursor,
    insertTextAtCursor: insertTextAtCursor
  };
})(typeof window !== 'undefined' ? window : this);
