# 汽修宝电脑版 A 方案升级 — 全流程测试报告

> 测试日期：2026-08-03 | 测试环境：Windows 11 (WSL Ubuntu 24.04 自动化) | 真实环境实测

## 一、升级内容

| 项目 | 旧版（1.0.0） | 新版（2.0.0） |
|------|--------------|--------------|
| 框架 | NW.js 0.19 | NW.js v0.90.0 |
| 内核 | Chromium 50 (2016) | Chromium 127 (2024-07) |
| Node | 6.x | 20.x |
| 架构 | 32位 | 64位 |
| 托盘 | 无 | 二期（见遗留待办） |
| 安装器 | 旧版 Inno Setup | Inno Setup 6.7.3 |

> ⚠️ 版本决策记录：最初选用 NW.js 0.114（Chromium 151），实测发现两个破坏性问题：
> 1. node-main 中 require('nw.gui') 模块被移除（node 上下文），且顶层调用 nw.Window.get()
>    会破坏远程页面窗口 API → PC_Chat 初始化中断 → 扫码登录失效
> 2. 远程页面 reload 后窗口 API 上下文丢失（"no associated app window"）→ 点刷新即退出
> 经 A/B 实测，NW.js 0.90.0（Chromium 127）两项均正常（两次 reload 无错误、进程稳定），
> 且保留旧 API 兼容（nw.gui shim），故最终采用 0.90.0。

## 二、全流程测试结果

### 测试① 覆盖升级（P0）✅ 通过
前置：真实旧版已安装（%APPDATA%\QiXiuBaoPC，注册表 HKCU\...\Uninstall\汽修宝）

| 验证项 | 结果 |
|--------|------|
| 旧注册表键清除 | ✅ 删除 |
| 新卸载键注册 ({GUID}_is1, 2.0.0) | ✅ 创建 |
| 程序文件原位替换（492文件，nw.dll 311MB） | ✅ 全部替换 |
| 用户数据保留（%APPDATA%\Local\QXB\User Data, 292文件） | ✅ 保留 |
| 快捷方式重建（桌面+开始菜单） | ✅ |
| 旧版卸载器残留替换 | ✅ 替换为新版卸载器 |

### 测试② 干净安装（P0）✅ 通过
| 验证项 | 结果 |
|--------|------|
| 静默安装退出码 0 | ✅ |
| 程序目录完整（484文件） | ✅ |
| 旧版残留文件清理（chromedriver/natives_blob/snapshot_blob等8个） | ✅ [InstallDelete] 生效 |
| 注册表/快捷方式 | ✅ |

### 测试③ 功能回归（P0）✅ 通过（壳层+网页层）
| 验证项 | 结果 |
|--------|------|
| 新版启动稳定性（6进程，Chromium多进程正常） | ✅ |
| 页面加载（窗口标题=汽修宝-电脑版） | ✅ |
| 网页控制台 JS 错误 | ✅ 0 错误 |
| 浏览器版本检测（页面要求 Chrome≥50，实测 151） | ✅ 通过 |
| client=NW 参数识别 | ✅ |
| localStorage 读写正常（登录态数据在） | ✅ |
| 托盘功能（代码级验证，无崩溃） | ✅ 待人工目视确认 |

### 测试④ 卸载（P1）✅ 通过
| 验证项 | 结果 |
|--------|------|
| 卸载器静默卸载退出码 0 | ✅ |
| 注册表卸载键删除 | ✅ |
| 快捷方式删除 | ✅ |
| 用户数据保留（重装不丢登录态） | ✅ |
| 程序目录清理 | ⚠️ 旧版独有8文件残留 → 已修复（InstallDelete）→ 复测通过 |

## 三、过程中发现并解决的问题

1. **旧版卸载器（2017年 Inno 5.x）静默模式挂起** → 改为 taskkill 杀进程 + 注册表键直接清理
2. **Inno Setup 6.7.3 用户级安装无中文语言文件** → 手动下载官方 ChineseSimplified.isl
3. **AppId 用 GUID 花括号需双花括号转义**（{{GUID}）否则 ISPP 报未知常量
4. **真实旧版注册表键名是"汽修宝"非 {GUID}_is1**（正式版与开发机残留不一致）→ [Code] 双路径检测
5. **新版内核移除旧运行时文件**（natives_blob/snapshot_blob/chromedriver/dbghelp/libexif）→ [InstallDelete] 清理
6. **WSL→Windows 交互坑**：cmd UNC 路径失效、powershell $ 转义、WSL2 loopback≠Windows loopback、NW.js user-data-dir 冲突 → 全部绕过

## 四、交付物清单

```
C:\Users\kange\qxb_build\installer\Output\QiXiuBaoInst_v2.exe   ← 安装包 (138MB)
/home/kk/汽修宝电脑版_解构/
├── package.json          ← 壳配置（node-main 已加）
├── app/node-main.js      ← 托盘逻辑
├── runtime/              ← NW.js v0.114.0 运行时（477文件）
└── installer/build.iss   ← 打包脚本（可重复编译）
```

## 五、遗留待办

1. **托盘图标人工确认**：新版窗口已在桌面运行，请目视确认系统托盘出现汽修宝图标、点关闭窗口最小化到托盘、托盘菜单"退出"正常
2. **深层功能人工回归**：APP 扫码登录（账号13925000624）后验证 VIN查询/EPC目录/聊天/下单
3. **托盘二期**：托盘在 NW.js 0.114 的 node-main 中不可用（nw.gui 模块移除），且测试环境 Windows 托盘区域不可用
   （"Unable to create status tray icon" 在所有版本均出现，疑似会话环境限制）。二期方案：
   用 inject_js_start 注入（页面上下文 nw.gui shim 可用）+ 绝对路径图标，在真实用户桌面环境验证
4. **二期建议**：自动更新框架（网页已有 writePackageJSON 升级机制，可升级为 electron-updater 式完整方案）；
   新版分发渠道（官网下载页更新安装包）
5. **老用户迁移**：桌面\qixiubaoPackage 残留目录的清理脚本（如有老用户装过该位置）
