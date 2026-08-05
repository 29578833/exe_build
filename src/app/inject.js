// 汽修宝 v2 (NW.js 0.72) 重启刷新修复
// 原理：网页端 refresh() = spawn新进程 + hide + close + reload。
// 新版 Chromium 下新实例起不来（ProcessSingleton/profile锁），
// 且 close 被页面托盘逻辑拦截 → 窗口最小化/消失。
// 修复：劫持 spawn（自我重启只标记不真启）+ 拦 close（preventDefault 阻止关闭）
//       + reload 后 show() 恢复窗口 → 页面自己的 location.reload(true) 完成刷新。
(function () {
  var FLAG_KEY = '__qxb_restart_refresh';
  var flag = false;

  function getFlag() {
    if (flag) return true;
    try { return localStorage.getItem(FLAG_KEY) === '1'; } catch (e) { return false; }
  }
  function setFlag(v) {
    flag = v;
    try {
      if (v) localStorage.setItem(FLAG_KEY, '1');
      else localStorage.removeItem(FLAG_KEY);
    } catch (e) {}
  }

  // ① 劫持 child_process.spawn：自我重启只写标记，不真启动新进程
  try {
    var cp = require('child_process');
    var origSpawn = cp.spawn;
    cp.spawn = function (cmd, args, opts) {
      var isSelf = cmd === process.execPath;
      var isRestart = isSelf && (!args || args.length === 0);
      if (isRestart) {
        setFlag(true);
        // 返回哑对象，页面后续调用 .unref() 不报错
        return { unref: function () {}, on: function () {}, once: function () {} };
      }
      return origSpawn.apply(this, arguments);
    };
  } catch (e) {}

  // ② 窗口可能被 hide() 了 → reload 后恢复显示
  try {
    var win = nw.Window.get();
    if (getFlag()) {
      win.show();
      setTimeout(function () { setFlag(false); }, 600);
    }
    // ③ 拦 close：重启刷新进行中 → 阻止真实关闭，让页面 reload 完成刷新
    win.on('close', function (ev) {
      if (getFlag()) {
        ev.preventDefault();
      }
    });
  } catch (e) {}

  // ============ 功能2：开机自启动（v2.1）============
  try {
    // 仅当主程序名匹配（避免 dev 模式 nw.exe 误写注册表）
    var exePath = process.execPath; // = 安装目录\汽修宝电脑版.exe
    var exeName = exePath ? exePath.replace(/^.*[\\\/]/, '') : '';
    if (exeName.indexOf('汽修宝') !== -1) {
      var execFile = require('child_process').execFile;
      // 值带引号：Run 键执行时正确解析含空格路径
      var regVal = '"' + exePath + '"';
      execFile('reg.exe', [
        'add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        '/v', 'QXB', '/t', 'REG_SZ', '/d', regVal, '/f'
      ], function () { /* 静默，失败不影响应用 */ });
    }
  } catch (e) {}
})();
