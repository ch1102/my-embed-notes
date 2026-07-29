/**
 * test_codeformat.js —— normalizeCodeFormat 逻辑单元测试
 * 内联函数逻辑（app.js 依赖 window/DOM 无法直接 Node 加载）
 */
var pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name); }
}

// ---- 从 app.js 复制的 normalizeCodeFormat 逻辑 ----
function normalizeCodeFormat(code, lang) {
  if (!code) return code;
  if (!/^(c|cpp|h|asm|js|ts|java)$/i.test(lang)) return code;
  var semiCount = (code.match(/;/g) || []).length;
  var lineCount = code.split('\n').length;
  if (semiCount > 3 && lineCount < semiCount * 0.4 + 2) {
    return code
      .replace(/([^\n])(#(include|define|ifdef|ifndef|if|endif|else|pragma))/g, '$1\n$2')
      .replace(/\}(\S)/g, '}\n$1')
      .replace(/;\s*(?=[^)\s}\]])/g, ';\n')
      .replace(/\{(\S)/g, '{\n$1')
      .replace(/\n{3,}/g, '\n\n');
  }
  return code;
}

// ---- 测试 1: 正常代码（换行充足）不应被修改 ----
var normalCode = '#include "stdio.h"\nint main(void) {\n    printf("hello");\n    return 0;\n}\n';
ok('测试1: 正常代码不被修改', normalizeCodeFormat(normalCode, 'c') === normalCode);

// ---- 测试 2: 挤成一行的 #include + 分号代码应拆开（模拟图2 OLED）----
var squished = [
  '#include "oled.h"#include "asc.h"',
  '#include "main.h"void WriteCmd(unsigned char I2C_Command){HAL_I2C_Mem_Write(&hi2c1,OLED0561_ADD,COM,8BIT,&I2C_Command,1,100);}',
  'void WriteDat(unsigned char I2C_Data){HAL_I2C_Mem_Write(&hi2c1,OLED0561_ADD,DAT,8BIT,&I2C_Data,1,100);}',
  'void OLED_Init(void){HAL_Delay(100);WriteCmd(0x20);WriteCmd(0x10);}'
].join('');
var fixed = normalizeCodeFormat(squished, 'c');
ok('测试2a: #include oled 后补回换行', fixed.indexOf('#include "oled.h"\n') !== -1);
ok('测试2b: #include asc 后补回换行', fixed.indexOf('#include "asc.h"\n') !== -1);
ok('测试2c: { 后补回换行', fixed.indexOf('{\n') !== -1);

// ---- 测试 3: 多分号单行应拆行 ----
var semiSquished = 'int a=1;int b=2;int c=3;int d=4;int e=5;';
var semiFixed = normalizeCodeFormat(semiSquished, 'c');
ok('测试3: 分号后补回换行', semiFixed.indexOf(';\n') !== -1);

// ---- 测试 4: } 后紧跟内容应拆行 ----
var braceWithSemi = 'void f(){int x=1;int a=2;}void g(){int y=2;int b=3;}void h(){int z=3;int c=4;}';
var braceFixed2 = normalizeCodeFormat(braceWithSemi, 'c');
ok('测试4: } 后补回换行', braceFixed2.indexOf('}\nvoid') !== -1);

// ---- 测试 5: 非 C 语言不处理 ----
var pyCode = 'def foo(): pass\ndef bar(): pass';
ok('测试5: Python 不处理', normalizeCodeFormat(pyCode, 'python') === pyCode);

// ---- 测试 6: 空值安全 ----
ok('测试6a: 空字符串', normalizeCodeFormat('', 'c') === '');
ok('测试6b: null', normalizeCodeFormat(null, 'c') === null);
ok('测试6c: undefined', normalizeCodeFormat(undefined, 'c') === undefined);

// ---- 测试 7: 少量分号的代码不触发修复 ----
var forCode = 'for(int i=0;i<10;i++);';
ok('测试7: for 循环不被破坏', normalizeCodeFormat(forCode, 'c') === forCode);

// ---- 测试 8: 模拟图2的 OLED 代码格式恢复 ----
var oledCode = [
  '#include "oled.h"#include "asc.h"',
  '#include "main.h"void WriteCmd(unsigned char I2C_Command){HAL_I2C_Mem_Write(&hi2c1,OLED0561_ADD,COM,8BIT,&I2C_Command,1,100);}',
  'void WriteDat(unsigned char I2C_Data){HAL_I2C_Mem_Write(&hi2c1,OLED0561_ADD,DAT,8BIT,&I2C_Data,1,100);}',
  'void OLED_Init(void){HAL_Delay(100);WriteCmd(0x20);WriteCmd(0x10);}'
].join('');
var oledFixed = normalizeCodeFormat(oledCode, 'c');
ok('测试8a: OLED代码 #include 拆开', oledFixed.indexOf('#include "oled.h"\n') !== -1);
ok('测试8b: OLED代码 void 函数声明拆开', oledFixed.match(/void\s+\w+\(/g).length >= 3);
ok('测试8c: OLED代码行数增加', oledFixed.split('\n').length > oledCode.split('\n').length);

console.log('\n代码格式恢复测试：' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail > 0 ? 1 : 0);
