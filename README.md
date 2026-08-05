# 汽修宝电脑版 — 桌面端工程

> 汽修宝电脑版 = **NW.js 网页壳**：本地只有运行时 + 壳配置 + 图标，业务代码全在服务器
> （https://www.qixiubao.cn?client=NW）。本工程用于**解构、重打安装包、后续迭代（v3+）**。
>
> 当前版本：**v2.0.0（Win7 兼容版）** — 内核 NW.js 0.72.0（Chromium 108），32 位 x86，原版 NSIS 壳逐字节保留。

---

## 一、目录结构

```
桌面端打包v2/
├── README.md                  ← 本文件：工程总入口
├── .gitignore
├── src/                       ★ 壳源码（唯一真源，迭代就改这里）
│   ├── package.json           ← 壳配置（含 inject_js_start）
│   └── app/
│       ├── node-main.js       ← 入口脚本（1 行）
│       ├── inject.js          ← 刷新按钮修复脚本
│       └── icon/              ← 4 个图标
├── scripts/                   ★ 构建脚本（全部相对路径，可移植）
│   ├── build.bat              ← 一键构建：assemble → pack → patch → verify
│   ├── assemble.bat           ← 组装 work\build（src + resources → 运行时目录）
│   ├── pack_rar.bat           ← 打 RAR（work\build → work\newpack.rar，m3:22）
│   ├── patch.bat              ← 嵌入安装器（优先 Node，回退 Python）
│   ├── patch_installer.js     ← PE 补丁（Node 版，自动定位 RAR 偏移）
│   ├── patch_installer.py     ← PE 补丁（Python 版，等价实现）
│   ├── rename_main_exe.js     ← nw.exe 改名 汽修宝电脑版.exe
│   └── verify.bat / verify.js ← 验证安装包内嵌 RAR
├── resources/                 ★ 原版壳/静态资源（补丁与验证用）
│   ├── installer/
│   │   ├── original_installer.exe  ← 官网原版安装包（md5 59fcdb7e...，已入库）
│   │   ├── unins000.dat            ← 原版卸载日志（进安装包）
│   │   ├── unins000.exe            ← 原版卸载器（进安装包）
│   │   ├── qixiubao_setup.ico
│   │   └── build.iss               ← 备用 Inno Setup 方案（v2 未用）
│   ├── installer_ui/          ← NSIS 壳品牌图（startInstall_*.png / UIFrame.xml 等）
│   └── website_bundle/        ← 网页端 bundle 备份（排查用）
├── docs/                      文档
│   ├── 开发手册.md             ← 完整解构 + 迭代开发手册（最详细）
│   ├── v2构建说明.md           ← v2 构建/复现说明
│   ├── 解构报告.md             ← 原始解构报告
│   └── 测试报告_A方案.md       ← A 方案（0.90/0.114 内核）历史测试
├── tools/
│   └── Rar.exe                ← WinRAR 命令行（打 RAR 用）
├── work/                      ← 构建产物（git 忽略，可随时重建）
│   ├── build/                 ← 组装目录 = NW.js 0.72 运行时 + 壳源码
│   └── newpack.rar            ← RAR 中间产物
├── dist/                      ★ 交付物
│   └── QiXiuBaoInst_v2_win7.exe ← v2.0.0 安装包（88.5MB）
└── archive/                   ← 废弃/暂存（git 忽略，确认后可删）
    ├── runtime_nw090/         ← NW.js 0.90 A 方案遗留运行时
    ├── newpack_old.rar        ← 不匹配交付物的旧 RAR
    ├── 交付物_v2_原版_备份.exe  ← 重构前的 v2 安装包备份
    └── newpack_v2_原版_备份.rar ← 重构前的 RAR 备份
```

**设计原则**
- `src/` 是唯一真源；`work/build` 里的壳文件由 `assemble.bat` 从 `src/` + `resources/` 复制生成。
- `work/`、`archive/` 不入 git（可复现/可删）；`dist/` 和 `resources/installer/original_installer.exe` 入库（交付物可追溯）。
- 所有脚本用相对路径（基于 `%~dp0..`），拷到任何机器都能跑，不再有 `C:\Users\kange\...` 之类硬编码。

---

## 二、快速开始

### 一键重新打包（已有 runtime 时）
```
scripts\build.bat
```
产物：`dist\QiXiuBaoInst_v2_win7.exe`。脚本会自动完成：组装 → 打 RAR → 嵌入安装器 → 验证。

### 手动分步
```
scripts\assemble.bat     # src + resources → work\build
scripts\pack_rar.bat     # work\build → work\newpack.rar（m3:22）
scripts\patch.bat        # 原版壳 + newpack.rar → dist\QiXiuBaoInst_v2_win7.exe
scripts\verify.bat       # 校验内嵌 RAR 一致
```

### 环境要求
- **Node.js**（本机已有 v11，patch/rename/verify 用）；无 Node 时 Python 3 也可（patch_installer.py）
- **Rar.exe**（已在 `tools/`，WinRAR 命令行）
- NW.js 运行时在 `work/build`（当前已就位；换内核时重新下载，见下）

---

## 三、迭代 v3+ 指南（换内核/改壳）

1. **改壳源码**：编辑 `src/package.json`、`src/app/*`（如版本号、node-remote 白名单、inject.js）。
2. **换 NW.js 内核**（若需要）：
   - 下载目标版 32 位运行时：`curl -L -o work\nwjs.zip https://dl.node-webkit.org/v0.72.0/nwjs-v0.72.0-win-ia32.zip`
     （注意 32 位文件名是 `win-ia32`；**Win7 兼容顶点是 0.72.0，0.73+ 弃 Win7**）
   - 解压到 `work\build`（先清空旧的 runtime 文件，保留 app/ 与 package.json 由 assemble 重新生成）。
3. **跑 `scripts\build.bat`**，得到新安装包。
4. **交付前验证**：安装 → 启动 → 刷新按钮 → 登录态保留（见 `docs/开发手册.md` §4.6/§10）。

> ⚠️ 关键坑速记（详见 `docs/开发手册.md` §7）：
> - RAR 必须 m3:22（`pack_rar.bat` 已内置），否则 NSIS 解压丢尾部文件
> - 主程序名必须保持 `汽修宝电脑版.exe`（快捷方式/进程/卸载器依赖）
> - 0.114 内核不可用（node-main 破坏远程页面 API）；0.90 刷新=退出；0.72 刷新=最小化（inject.js 已修）
> - 原版安装包 md5：`59fcdb7e49e393b10e0b428d98174bfb`（官网 static/QiXiuBaoInst.exe，已存 resources/installer/）

---

## 四、文档索引

| 文档 | 内容 |
|------|------|
| `docs/开发手册.md` | 最全：解构原理、构建步骤、坑表、版本演进、迭代待办 |
| `docs/v2构建说明.md` | v2（NW.js 0.72 / Win7）复现构建 + 验证状态 |
| `docs/解构报告.md` | 原始解构报告（技术栈、根因分析、方案对比） |
| `docs/测试报告_A方案.md` | A 方案（0.90/0.114 内核）历史测试记录 |
