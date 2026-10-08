#!/usr/bin/env node
/**
 * set_version_info.js - Write QXB Windows version resources.
 * Usage:
 *   node set_version_info.js <exe> app [version]
 *   node set_version_info.js <exe> installer [version]
 *
 * When version is omitted:
 *   app       - read the package.json next to the exe.
 *   installer - infer x86/x64 from the exe name and read the matching
 *               work/build or work/build_x64 package.json.
 */
'use strict';
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RH = path.join(ROOT, 'tools', 'ResourceHacker', 'ResourceHacker.exe');
const WORK = path.join(ROOT, 'work', '.version-info');
const COMPANY_NAME = '广州前实网络科技有限公司';
const PRODUCT_NAME = '汽修宝电脑版';
const COPYRIGHT = 'Copyright (C) 2026 广州前实网络科技有限公司';

function fail(message) {
  throw new Error(message);
}

function rcString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeVersion(value) {
  const core = String(value || '').trim().replace(/^v/i, '').split(/[+-]/)[0];
  const parts = core.split('.').map(part => Number.parseInt(part, 10));
  if (!parts.length || parts.some(part => !Number.isInteger(part) || part < 0 || part > 65535)) {
    fail('invalid version: ' + value);
  }
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
}

function readPackageVersion(pkgPath) {
  if (!fs.existsSync(pkgPath)) fail('missing package.json: ' + pkgPath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, ''));
  if (!pkg.version) fail('package.json has no version: ' + pkgPath);
  return pkg.version;
}

function resolveVersion(target, kind, explicitVersion) {
  if (explicitVersion) return explicitVersion;
  if (kind === 'app') {
    return readPackageVersion(path.join(path.dirname(target), 'package.json'));
  }
  const buildDir = /x64/i.test(path.basename(target)) ? 'build_x64' : 'build';
  return readPackageVersion(path.join(ROOT, 'work', buildDir, 'package.json'));
}

function makeResource(kind, target, version) {
  const numeric = normalizeVersion(version);
  const originalName = path.basename(target);
  const isInstaller = kind === 'installer';
  const description = isInstaller ? '汽修宝电脑版安装程序' : PRODUCT_NAME;
  const internalName = isInstaller
    ? originalName.replace(/\.exe$/i, '')
    : 'QiXiuBaoPC';

  return `VS_VERSION_INFO VERSIONINFO
 FILEVERSION ${numeric.join(',')}
 PRODUCTVERSION ${numeric.join(',')}
 FILEFLAGSMASK 0x3f
 FILEFLAGS 0x0
 FILEOS 0x40004
 FILETYPE 0x1
 FILESUBTYPE 0x0
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "080404b0"
        BEGIN
            VALUE "CompanyName", "${rcString(COMPANY_NAME)}"
            VALUE "FileDescription", "${rcString(description)}"
            VALUE "FileVersion", "${numeric.join('.')}"
            VALUE "InternalName", "${rcString(internalName)}"
            VALUE "LegalCopyright", "${rcString(COPYRIGHT)}"
            VALUE "OriginalFilename", "${rcString(originalName)}"
            VALUE "ProductName", "${rcString(PRODUCT_NAME)}"
            VALUE "ProductVersion", "${numeric.join('.')}"
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x804, 1200
    END
END
`;
}

function powershellPath() {
  const systemRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
  return path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

function readVersionInfo(exe) {
  const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
  const script = [
    "$ErrorActionPreference='Stop'",
    '[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)',
    '$v=(Get-Item -LiteralPath ' + quote(exe) + ').VersionInfo',
    '[PSCustomObject]@{CompanyName=$v.CompanyName;ProductName=$v.ProductName;' +
      'FileVersion=$v.FileVersion;ProductVersion=$v.ProductVersion;' +
      'FileDescription=$v.FileDescription;InternalName=$v.InternalName;' +
      'OriginalFilename=$v.OriginalFilename;LegalCopyright=$v.LegalCopyright} | ConvertTo-Json -Compress',
  ].join(';');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const result = spawnSync(powershellPath(), [
    '-NoProfile',
    '-NonInteractive',
    '-EncodedCommand',
    encoded,
  ], { encoding: 'utf8' });
  if (result.error) fail('failed to read version info: ' + result.error.message);
  if (result.status !== 0) fail('failed to read version info: ' + (result.stderr || '').trim());
  try {
    return JSON.parse(result.stdout.replace(/^\uFEFF/, '').trim());
  } catch (error) {
    fail('invalid version info output: ' + result.stdout);
  }
}

function assertVersionInfo(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      fail(`version resource mismatch: ${key}: expected "${value}", got "${actual[key]}"`);
    }
  }
}

const target = path.resolve(process.argv[2] || '');
const kind = String(process.argv[3] || '').toLowerCase();
const explicitVersion = process.argv[4];

if (!target || !fs.existsSync(target)) fail('exe not found: ' + target);
if (kind !== 'app' && kind !== 'installer') fail('kind must be app or installer');
if (!fs.existsSync(RH)) fail('missing Resource Hacker: ' + RH);

const version = resolveVersion(target, kind, explicitVersion);
const numeric = normalizeVersion(version);
const originalName = path.basename(target);
const expected = {
  CompanyName: COMPANY_NAME,
  ProductName: PRODUCT_NAME,
  FileVersion: numeric.join('.'),
  ProductVersion: numeric.join('.'),
  FileDescription: kind === 'installer' ? '汽修宝电脑版安装程序' : PRODUCT_NAME,
  InternalName: kind === 'installer' ? originalName.replace(/\.exe$/i, '') : 'QiXiuBaoPC',
  OriginalFilename: originalName,
  LegalCopyright: COPYRIGHT,
};

fs.mkdirSync(WORK, { recursive: true });
const tag = process.pid + '-' + Date.now();
const rc = path.join(WORK, originalName + '.' + tag + '.rc');
const res = path.join(WORK, originalName + '.' + tag + '.res');
const tmpDeletedExe = path.join(WORK, originalName + '.' + tag + '.deleted.exe');
const tmpExe = path.join(WORK, originalName + '.' + tag + '.tmp.exe');
const compileLog = path.join(WORK, originalName + '.' + tag + '.compile.log');
const deleteLog = path.join(WORK, originalName + '.' + tag + '.delete.log');
const addLog = path.join(WORK, originalName + '.' + tag + '.add.log');

try {
  fs.writeFileSync(rc, makeResource(kind, target, version), 'utf8');
  execFileSync(RH, [
    '-open', rc,
    '-save', res,
    '-action', 'compile',
    '-log', compileLog,
  ], { stdio: 'inherit' });
  let addSource = target;
  try {
    execFileSync(RH, [
      '-open', target,
      '-save', tmpDeletedExe,
      '-action', 'delete',
      '-mask', 'VERSIONINFO,,',
      '-log', deleteLog,
    ], { stdio: 'inherit' });
    if (fs.existsSync(tmpDeletedExe)) addSource = tmpDeletedExe;
  } catch (error) {
    // Resource Hacker returns a non-zero code when no VERSIONINFO exists.
    if (fs.existsSync(tmpDeletedExe)) throw error;
  }
  execFileSync(RH, [
    '-open', addSource,
    '-save', tmpExe,
    '-action', 'addoverwrite',
    '-res', res,
    '-mask', 'VERSIONINFO,,',
    '-log', addLog,
  ], { stdio: 'inherit' });
  fs.copyFileSync(tmpExe, target);
  assertVersionInfo(readVersionInfo(target), expected);
  console.log('[OK] version info -> ' + target + ' (' + numeric.join('.') + ')');
} finally {
  for (const file of [rc, res, tmpDeletedExe, tmpExe, compileLog, deleteLog, addLog]) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (error) {
      // Keep the build result even if a temporary log cannot be removed.
    }
  }
}
