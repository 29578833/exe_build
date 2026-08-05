; 汽修宝电脑版 - Inno Setup 打包脚本（A方案 v2.0：原位升级版）
; 用法：Windows 上 Inno Setup 6.x，命令行编译：
;   "C:\Users\kange\AppData\Local\Programs\Inno Setup 6\ISCC.exe" build.iss
; 编译前：..\runtime\ 放 NW.js v0.114.0 运行时（nw.exe 已改名 汽修宝电脑版.exe，且已删除 nw.exe 冗余）

[Setup]
; AppId 用解构得到的原始 GUID（Inno 升级识别标识）
AppId={{37687491-D8D1-455E-8D54-2E606E09CC3E}
AppName=汽修宝
AppVersion=2.0.0
AppVerName=汽修宝 2.0.0
AppPublisher=广州前实网络科技有限公司
AppPublisherURL=https://www.qixiubao.cn
; ===== 安装包图标（用回以前的汽修宝图标：48px logo + 32px 提取自旧安装包）=====
SetupIconFile=qixiubao_setup.ico
UninstallIconFile=qixiubao_setup.ico
; ===== 版本信息（exe 属性页显示）=====
VersionInfoVersion=2.0.0.0
VersionInfoCompany=广州前实网络科技有限公司
VersionInfoDescription=汽修宝 - 电脑版
VersionInfoProductName=汽修宝
VersionInfoProductVersion=2.0.0.0
VersionInfoCopyright=Copyright (C) 广州前实网络科技有限公司
VersionInfoOriginalFileName=QiXiuBaoInst.exe
; 原位升级：与真实旧版同目录（%APPDATA%\QiXiuBaoPC），用户无感
DefaultDirName={userappdata}\QiXiuBaoPC
; 覆盖安装时沿用用户已有安装目录
UsePreviousAppDir=yes
; 覆盖安装时自动关闭正在运行的旧版进程
CloseApplications=yes
RestartApplications=no
DefaultGroupName=汽修宝
OutputBaseFilename=QiXiuBaoInst_v2
Compression=lzma2
SolidCompression=yes
UninstallDisplayName=汽修宝
UninstallDisplayIcon={app}\汽修宝电脑版.exe
; 用户级安装（无管理员要求，与旧版一致）
PrivilegesRequired=lowest
WizardStyle=modern
; 卸载时询问是否保留用户数据目录（登录态/本地数据默认保留）
[Code]
function OldVersionInstalled(): Boolean;
begin
  Result :=
    RegKeyExists(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\汽修宝') or
    FileExists(ExpandConstant('{userappdata}\QiXiuBaoPC\unins000.exe')) or
    FileExists(ExpandConstant('{userdesktop}\qixiubaoPackage\unins000.exe'));
end;

// 杀旧版进程（taskkill 比旧版卸载器可靠，旧 Inno 5.x 卸载器静默模式会挂起）
procedure KillOldProcess();
var
  ResultCode: Integer;
begin
  Exec('taskkill.exe', '/F /IM 汽修宝电脑版.exe /T', '', SW_HIDE,
       ewWaitUntilTerminated, ResultCode);
end;

// 清理旧版注册表卸载项（避免控制面板出现两个条目）
procedure CleanupOldRegistry();
begin
  RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\汽修宝');
  RegDeleteKeyIncludingSubkeys(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\汽修宝');
  RegDeleteKeyIncludingSubkeys(HKLM, 'Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\汽修宝');
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if OldVersionInstalled() then begin
    KillOldProcess();
    CleanupOldRegistry();
  end;
end;

[InstallDelete]
; 清理旧版卸载器残留（注册表键已删，这里删文件）
Type: files; Name: "{app}\unins000.exe"
Type: files; Name: "{app}\unins000.dat"
; 清理旧版独有/已废弃文件（新版 NW.js 0.114 运行时不含这些）
Type: files; Name: "{app}\chromedriver.exe"
Type: files; Name: "{app}\dbghelp.dll"
Type: files; Name: "{app}\libexif.dll"
Type: files; Name: "{app}\natives_blob.bin"
Type: files; Name: "{app}\snapshot_blob.bin"
Type: files; Name: "{app}\.DS_Store"
Type: files; Name: "{app}\app\.DS_Store"
Type: files; Name: "{app}\app\icon\.DS_Store"

[Languages]
Name: "chinesesimp"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Files]
; --- 新版运行时（汽修宝电脑版.exe 已就位，nw.exe 冗余已删）---
Source: "..\runtime\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
; --- 壳配置与图标 ---
Source: "..\app\*"; DestDir: "{app}\app"; Flags: recursesubdirs ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\汽修宝"; Filename: "{app}\汽修宝电脑版.exe"
Name: "{autodesktop}\汽修宝"; Filename: "{app}\汽修宝电脑版.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务:"

[Run]
Filename: "{app}\汽修宝电脑版.exe"; Description: "立即运行汽修宝"; Flags: nowait postinstall skipifsilent
