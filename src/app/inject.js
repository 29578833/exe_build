// 汽修宝 v2.6 (NW.js 0.72 x64) 渲染进程注入脚本
// 功能1：安全刷新/重启（v2.3 重写）
//   背景：NW.js 0.72 (Chromium 108) 在长时间运行后（系统有 RADAR_PRE_LEAK 内存
//         泄漏预警），页面 location.reload() / 重启式刷新会触发 C++ 异常崩溃
//         （Crashpad 记录 E06D7363 未处理异常、nw.dll 空指针读）。
//   方案：所有刷新入口一律改为"进程级重启"——
//         a) 写 __qxb_restarting 标记
//         b) detached 启动新进程（同 user-data-dir，package.json 已设
//            single-instance:false，新旧实例可短暂共存）
//         c) 退出当前进程 → 全新进程加载最新页面
//         彻底绕开 reload 时的环境清理崩溃路径。
// 功能2：开机自启动（v2.1 新增，保留）
//   原理：启动时写入 HKCU\Software\Microsoft\Windows\CurrentVersion\Run\QXB，
//   指向 汽修宝电脑版.exe 完整路径。幂等覆盖（reg add /f），路径随安装位置。
// 功能3（已移除）：托盘恢复最大化（v2.4/v2.5 曾劫持 win.show() 强制最大化，
//   用户实测点托盘仍不恢复全屏，按需求回滚去除，恢复页面原生托盘行为）。
(function () {
  var RESTART_KEY = '__qxb_restarting';
  var restarting = false;

  function markRestarting(v) {
    try {
      if (v) localStorage.setItem(RESTART_KEY, '1');
      else localStorage.removeItem(RESTART_KEY);
    } catch (e) {}
  }

  // ============ 功能2：开机自启动（v2.1）============
  try {
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

  // ============ 功能1：安全刷新/重启（v2.3）============
  // ① 核心：重启当前应用（先起新进程，再退旧进程）
  function restartApp() {
    if (restarting) return; // 防重入
    restarting = true;
    try {
      var cp = require('child_process');
      var selfExe = process.execPath;
      markRestarting(true);
      // detached 启动新进程（不受当前进程退出影响）
      var child = cp.spawn(selfExe, [], { detached: true, stdio: 'ignore' });
      try { child.unref(); } catch (e) {}
      var quitTimer = setTimeout(function () {
        // 给新进程初始化时间，然后强制关闭旧进程
        try { nw.Window.get().close(true); } catch (e) {}
        try { nw.App.quit(); } catch (e) {}
      }, 800);
      // 兜底：新进程被单例锁 / 启动失败阻止时，不退出，退回软刷新
      var bail = function () {
        clearTimeout(quitTimer);
        if (!restarting) return;
        restarting = false;
        markRestarting(false);
        try {
          if (typeof window.__qxbOrigReload === 'function') window.__qxbOrigReload();
          else window.location.reload();
        } catch (e) {}
      };
      child.once('exit', bail);
      child.once('error', bail);
    } catch (e) {
      restarting = false;
      // 兜底：spawn 本身失败时退回普通 reload（极端情况，避免无限循环只试一次）
      try {
        if (typeof window.__qxbOrigReload === 'function') window.__qxbOrigReload();
      } catch (e2) {}
    }
  }

  // ② 启动时：若本进程是"安全重启"拉起的新实例 → 清标记 + 前台显示
  try {
    if (localStorage.getItem(RESTART_KEY) === '1') {
      markRestarting(false);
      var w0 = nw.Window.get();
      w0.show();
      w0.focus();
    }
  } catch (e) {}

  // ③ 劫持 location.reload（"立即刷新 / 点击刷新"按钮 onclick 走这里）
  try {
    var loc = window.location;
    var origReloadFn = loc.reload ? loc.reload.bind(loc) : null;
    window.__qxbOrigReload = origReloadFn; // 供 restartApp 兜底使用
    loc.reload = function () { restartApp(); };
  } catch (e) {}

  // ④ 拦截 F5 / Ctrl+R：避免 Chromium 原生 reload 崩溃，统一走进程重启
  try {
    window.addEventListener('keydown', function (ev) {
      var k = ev.key || '';
      if (k === 'F5' || (ev.ctrlKey && (k === 'r' || k === 'R'))) {
        ev.preventDefault();
        ev.stopPropagation();
        restartApp();
      }
    }, true);
  } catch (e) {}

  // ⑤ 劫持 child_process.spawn 自我重启（网页端重启式刷新 writePackageJSON）
  try {
    var cp2 = require('child_process');
    var origSpawn = cp2.spawn;
    cp2.spawn = function (cmd, args, opts) {
      var isSelf = cmd === process.execPath;
      var isRestart = isSelf && (!args || args.length === 0);
      if (isRestart) {
        restartApp();
        // 返回哑对象，页面后续调用 .unref() 不报错
        return { unref: function () {}, on: function () {}, once: function () {} };
      }
      return origSpawn.apply(this, arguments);
    };
  } catch (e) {}
})();
