// 回归测试：文件 >1 MB 时自动从 Contents API 切换到 Git Data API
global.window = global;

// --- 内存 localStorage ---
var mem = {};
global.localStorage = {
  getItem: function (k) { return k in mem ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

// --- 本地数据 mock ---
var store = { _notes: [], getAll: function(){return this._notes;}, replaceAll: function(a){this._notes=a;} };
global.NoteStore = store;
global.LearningGoals = {_g:[], getAll:function(){return this._g;}, replaceAll:function(a){this._g=a;}};
global.Roadmap = {_r:{}, getAll:function(){return this._r;}, replaceAll:function(a){this._r=a;}};

// --- 模拟数据 ---
var REMOTE_NOTES = [
  { id:'n1', title:'大文件笔记', body:'内容', updatedAt:100 },
  { id:'n2', title:'另一条', body:'...', updatedAt:200 }
];
var REMOTE_PAYLOAD = JSON.stringify({version:1, syncedAt:1, notes:REMOTE_NOTES, goals:[], roadmap:{}});
function enc(s){ return Buffer.from(s,'utf8').toString('base64'); }
function dec(b){ return Buffer.from(b,'base64').toString('utf8'); }

// --- fetch mock：模拟 GitHub API ---
// 阶段 1：Contents API 返回 "too large" 错误
// 阶段 2：Git Data API (ref → tree → blob) 正常返回数据
// 阶段 3：putFile 也走 Git Data API（Contents API 写入也返回 too large）
var callLog = [];
global.fetch = function(url, opts){
  callLog.push({url:(url||'').replace(/\/[a-f0-9]{40}/g,'/:sha'), method:opts&&opts.method});
  var u = typeof url === 'string' ? url : '';

  // Contents API GET → "too large"
  if(u.indexOf('/contents/')!==-1 && (!opts || opts.method==='GET')){
    return Promise.resolve({
      ok:false, status:403,
      json:function(){return Promise.resolve({message:"This API returns blobs up to 1 MB in size. The requested blob is too large to fetch via the API."});}
    });
  }
  // Contents API PUT → also too large for writing
  if(u.indexOf('/contents/')!==-1 && opts && opts.method==='PUT'){
    return Promise.resolve({
      ok:false, status:403,
      json:function(){return Promise.resolve({message:"This API returns or accepts blobs up to 1 MB in size."});}
    });
  }

  // Git Data API: ref/heads/main
  if(u.match(/\/git\/ref\/heads\//)){
    return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({object:{sha:'commitSHA123'}});}});
  }
  // Git Data API: tree (recursive)
  if(u.match(/\/git\/trees\//)){
    return Promise.resolve({ok:true,status:200,json:function(){
      return Promise.resolve({
        sha:'treeSHA456',
        tree:[
          {path:'README.md',mode:'100644',type:'blob',sha:'readmeBlob'},
          {path:'data/notes.json',mode:'100644',type:'blob',sha:'notesBlob789'},
          {path:'src/',mode:'040000',type:'tree',sha:'srcTree'}
        ]
      });
    }});
  }
  // Git Data API: blob read
  if(u.match(/\/git\/blobs\//)){
    return Promise.resolve({ok:true,status:200,json:function(){
      return Promise.resolve({content:enc(REMOTE_PAYLOAD), encoding:'base64', size:REMOTE_PAYLOAD.length});
    }});
  }
  // Git Data API: POST blob (create)
  if(u.match(/\/git\/blobs$/) && opts && opts.method==='POST'){
    return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({sha:'newBlobSha'});}});
  }
  // Git Data API: POST tree (create)
  if(u.match(/\/git\/trees$/) && opts && opts.method==='POST'){
    return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({sha:'newTreeSha'});}});
  }
  // Git Data API: POST commits
  if(u.match(/\/git\/commits$/) && opts && opts.method==='POST'){
    return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({sha:'newCommitSha'});}});
  }
  // Git Data API: PATCH ref
  if(u.match(/\/git\/refs\/heads\//) && opts && opts.method==='PATCH'){
    return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({object:{sha:'newCommitSha'}});}});
  }

  return Promise.reject(new Error('unexpected url: ' + u));
};

require('./js/github-sync.js');
var G = global.GitHubSync;
G.saveConfig({owner:'u',repo:'r',branch:'main',path:'data/notes.json',token:'t'});

var pass=0,fail=0;
function ok(c,m){if(c)pass++;else{fail++;console.log('✗ '+m);}};

// 测试 1：pull 通过 Git Data API 成功读取大文件
G.pull().then(function(merged){
  ok(merged.length===2,'pull 应通过 Git Data API 读回 2 条笔记，实际: '+merged.length);
  ok(store.getAll().length===2,'本地 store 应有 2 条');
  ok(store.getAll()[0].id==='n1','第一条笔记 id 应为 n1');

  // 确认确实走了 Git Data API（而非 Contents API）
  var usedContentsGet = callLog.some(function(c){return c.url.indexOf('/contents/')!==-1&&c.method==='GET';});
  var usedGitData = callLog.some(function(c){return c.url.indexOf('/git/ref')!==-1;});
  ok(usedContentsGet,'应先尝试 Contents API（快速路径）');
  ok(usedGitData,'应在 Contents API 失败后切换到 Git Data API');

  // 测试 2：push 也通过 Git Data API 写入大文件
  store._notes = [{id:'n3',title:'新笔记',body:'...',updatedAt:300}];
  var logLenBefore = callLog.length;
  return G.push().then(function(){
    var usedGitWrite = callLog.slice(logLenBefore).some(function(c){
      return c.url.indexOf('/git/blobs')!==-1 && c.method==='POST';
    });
    ok(usedGitWrite,'push 应通过 Git Data API (POST /git/blobs) 写入大文件');

    console.log('\nAPI 调用顺序:');
    callLog.forEach(function(c,i){console.log('  '+(i+1)+'. ['+c.method+'] '+c.url);});

    console.log('\n结果：通过 '+pass+' / 失败 '+fail);
    process.exit(fail?1:0);
  });
}).catch(function(e){
  console.log('✗ 异常: '+(e&&e.message||e));
  process.exit(1);
});
