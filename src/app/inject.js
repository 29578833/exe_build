// 汽修宝 v2 — 开机自启动（v2.1）
// 网页端刷新已改为同窗口 reload（frameScript.js / config/router.js 均已去除 spawn 新进程 / win.close），
// 故原“重启刷新修复”（spawn 劫持 + close 拦截 + reload 后 show）已移除，仅保留开机自启动。
(function () {
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