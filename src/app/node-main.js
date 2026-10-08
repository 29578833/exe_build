// 汽修宝 node-main：NW 主进程入口（Chromium 初始化之前执行）
// 注意：此处禁止使用 nw.Window.get() / require('nw.gui')，否则会破坏远程页面 API
(function () {
  'use strict';

  var fs = require('fs');
  var path = require('path');

  // 保留原版行为：供网页读取启动参数
  process.env.CL_Argv = JSON.stringify(process.argv);

  var META_FILE = 'qxb_client_meta.json';
  var PKG_NAME = 'QXB';

  // Default 配置目录下与架构/内核绑定的缓存（可安全删除，Chromium 会重建）
  var PROFILE_CACHE_DIRS = [
    'GPUCache',
    'Code Cache',
    'DawnCache',
    'DawnGraphiteCache',
    'DawnWebGPUCache',
    'Cache'
  ];

  // User Data 根目录下的 GPU/Shader 缓存
  var ROOT_CACHE_DIRS = [
    'GrShaderCache',
    'ShaderCache',
    'GraphiteDawnCache',
    'GPUPersistentCache'
  ];

  function readJson(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  function writeJson(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) { /* 静默 */ }
  }

  function rmDirSync(dirPath) {
    if (!dirPath || !fs.existsSync(dirPath)) return;
    try {
      if (typeof fs.rmSync === 'function') {
        fs.rmSync(dirPath, { recursive: true, force: true });
        return;
      }
    } catch (e) { /* 回退手动递归 */ }

    try {
      var entries = fs.readdirSync(dirPath);
      for (var i = 0; i < entries.length; i++) {
        var entryPath = path.join(dirPath, entries[i]);
        var stat = fs.statSync(entryPath);
        if (stat.isDirectory()) rmDirSync(entryPath);
        else fs.unlinkSync(entryPath);
      }
      fs.rmdirSync(dirPath);
    } catch (e) { /* 静默，不阻塞启动 */ }
  }

  function getUserDataRoot() {
    var localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return null;
    return path.join(localAppData, PKG_NAME, 'User Data');
  }

  function getPackageInfo() {
    var pkgPath = path.join(path.dirname(process.execPath), 'package.json');
    var pkg = readJson(pkgPath);
    return {
      version: (pkg && pkg.version) || '',
      name: (pkg && pkg.name) || PKG_NAME
    };
  }

  function profileExists(userDataRoot) {
    if (!userDataRoot) return false;
    var defaultDir = path.join(userDataRoot, 'Default');
    if (fs.existsSync(defaultDir)) return true;
    // 旧版 1.0.0 可能只有 Local Storage / Cookies 等文件
    var markers = ['Local State', 'Cookies', 'Preferences'];
    for (var i = 0; i < markers.length; i++) {
      if (fs.existsSync(path.join(userDataRoot, markers[i]))) return true;
    }
    return false;
  }

  function shouldCleanCaches(meta, currentArch, hasProfile) {
    if (!hasProfile) return false;
    // 32→64 或 64→32 架构切换：旧缓存对目标架构无效
    if (meta && meta.arch && meta.arch !== currentArch) return true;
    // 旧版从未写过 meta（如 1.0.0 / 早期 2.x）：首次用新 node-main 启动时主动清理
    if (!meta) return true;
    return false;
  }

  function cleanIncompatibleCaches(userDataRoot) {
    if (!userDataRoot) return;

    var defaultDir = path.join(userDataRoot, 'Default');
    var i;

    for (i = 0; i < PROFILE_CACHE_DIRS.length; i++) {
      rmDirSync(path.join(defaultDir, PROFILE_CACHE_DIRS[i]));
    }

    for (i = 0; i < ROOT_CACHE_DIRS.length; i++) {
      rmDirSync(path.join(userDataRoot, ROOT_CACHE_DIRS[i]));
    }

    // 清理旧 ShaderCache 备份目录（Chromium 迁移时可能产生）
    try {
      var rootEntries = fs.readdirSync(userDataRoot);
      for (i = 0; i < rootEntries.length; i++) {
        if (/^old_ShaderCache_/i.test(rootEntries[i])) {
          rmDirSync(path.join(userDataRoot, rootEntries[i]));
        }
      }
    } catch (e) { /* 静默 */ }

    // Service Worker 磁盘缓存（保留 SW 注册，只删 CacheStorage）
    rmDirSync(path.join(defaultDir, 'Service Worker', 'CacheStorage'));
    rmDirSync(path.join(defaultDir, 'Service Worker', 'ScriptCache'));
  }

  function updateLaunchMeta(userDataRoot, pkgInfo) {
    if (!userDataRoot) return;
    writeJson(path.join(userDataRoot, META_FILE), {
      arch: process.arch,
      version: pkgInfo.version,
      cleanedAt: Date.now()
    });
  }

  // ============ 主流程 ============
  try {
    var userDataRoot = getUserDataRoot();
    if (!userDataRoot) return;

    var pkgInfo = getPackageInfo();
    var metaPath = path.join(userDataRoot, META_FILE);
    var meta = readJson(metaPath);
    var hasProfile = profileExists(userDataRoot);

    if (shouldCleanCaches(meta, process.arch, hasProfile)) {
      cleanIncompatibleCaches(userDataRoot);
    }

    // 无论是否清理，都更新 meta，避免同架构重复清理
    if (hasProfile) {
      updateLaunchMeta(userDataRoot, pkgInfo);
    }
  } catch (e) {
    // 任何异常都不阻塞应用启动
  }
})();
