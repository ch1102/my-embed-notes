/* 无头测试：richtext.js 纯函数（Node 运行，无 DOM） */
var mod = require('./js/richtext.js');
var RT = (mod && mod.RichText) || globalThis.RichText;
var pass = 0, fail = 0;
function eq(name, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.log('FAIL:', name, '\n  got: ', JSON.stringify(got), '\n  want:', JSON.stringify(want)); }
}
function ok(name, cond) {
  if (cond) pass++; else { fail++; console.log('FAIL:', name); }
}

// ---- looksLikeHtml ----
ok('纯文本非HTML', !RT.looksLikeHtml('hello world'));
ok('include <stdio.h> 不误判', !RT.looksLikeHtml('#include <stdio.h>'));
ok('div 判定为HTML', RT.looksLikeHtml('<div>hi</div>'));
ok('b 标签判定为HTML', RT.looksLikeHtml('加<b>粗</b>体'));

// ---- normalizeBody：旧 token → HTML ----
eq('换行转br', RT.normalizeBody('a\nb'), 'a<br>b');
eq('双链转span', RT.normalizeBody('见 [[OLED]]'),
  '见 <span class="rt-link" data-link="OLED">[[OLED]]</span>');
ok('代码块转pre', RT.normalizeBody('[code:c]int x;\n[/code]').indexOf('<pre class="cb" data-lang="c">int x;\n</pre>') !== -1);
ok('代码块内特殊字符转义', RT.normalizeBody('[code:c]#include <stdio.h>[/code]').indexOf('&lt;stdio.h&gt;') !== -1);
var imgTok = '[img:data:image/png;base64,AAAA]';
eq('图片转img', RT.normalizeBody(imgTok), '<img src="data:image/png;base64,AAAA" alt="图片">');
eq('已是HTML原样返回', RT.normalizeBody('<div>x</div>'), '<div>x</div>');
eq('文本转义', RT.normalizeBody('1 < 2 & 3'), '1 &lt; 2 &amp; 3');

// ---- toPlainText ----
eq('HTML去标签', RT.toPlainText('<div>你好<b>世界</b></div>'), '你好世界');
eq('br转换行', RT.toPlainText('<div>a<br>b</div>'), 'a\nb');
eq('HTML双链还原', RT.toPlainText('<span data-link="OLED">[[OLED]]</span>'), '[[OLED]]');
ok('HTML代码块内容保留', RT.toPlainText('<pre class="cb" data-lang="c">int main(){}</pre>').indexOf('int main(){}') !== -1);
ok('旧token代码保留', RT.toPlainText('说明[code:c]abc[/code]完').indexOf('abc') !== -1);
eq('实体解码', RT.toPlainText('<div>1 &lt; 2 &amp; 3</div>'), '1 < 2 & 3');
eq('高亮mark只留文本', RT.toPlainText('<mark>重点</mark>内容'), '重点内容');

// ---- toMarkdown ----
ok('HTML粗体转MD', RT.toMarkdown('<b>粗</b>体').indexOf('**粗**') !== -1);
ok('HTML斜体转MD', RT.toMarkdown('<i>斜</i>体').indexOf('*斜*') !== -1);
ok('mark转高亮', RT.toMarkdown('<mark>亮</mark>点').indexOf('==亮==') !== -1);
ok('HTML代码块转fenced', RT.toMarkdown('<pre class="cb" data-lang="c">int x;</pre>').indexOf('```c\nint x;\n```') !== -1);
ok('旧token代码转fenced', RT.toMarkdown('[code:c]int x;\n[/code]').indexOf('```c\nint x;\n```') !== -1);
var mdImgs = [];
var md = RT.toMarkdown('<img src="data:image/png;base64,AAAA">', function (url, i) {
  mdImgs.push(url); return '![image](images/img_' + i + '.png)';
});
ok('HTML图片走收集器', md.indexOf('![image](images/img_0.png)') !== -1 && mdImgs[0] === 'data:image/png;base64,AAAA');
ok('双链保留', RT.toMarkdown('<span data-link="OLED">[[OLED]]</span>').indexOf('[[OLED]]') !== -1);

// ---- 空值 ----
eq('normalizeBody 空', RT.normalizeBody(''), '');
eq('toPlainText null', RT.toPlainText(null), '');
eq('toMarkdown undefined', RT.toMarkdown(undefined), '');

// ---- sanitize 在 Node 下应原样返回（无 DOM） ----
eq('Node下sanitize原样', RT.sanitize('<b>x</b>'), '<b>x</b>');

console.log('\n结果: 通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
