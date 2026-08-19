#!/usr/bin/env node
/**
 * set_pkg_version.js - 重写 package.json 的 version 字段（保留其余内容与缩进风格）
 * 用法: node set_pkg_version.js <package.json 路径> <版本号>
 * 说明: 64 位线（v2.2.x）与 32 位线（v2.0.x）共用 src/ 壳源码，仅在组装时覆盖版本号。
 * 注意: src/package.json 带 UTF-8 BOM，读入时先剥离 BOM，写出时不再带 BOM。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const pkg = path.resolve(process.argv[2] || '');
const ver = process.argv[3];
const frame = process.argv[4];
if (!pkg || !ver) throw new Error('usage: node set_pkg_version.js <package.json> <version> [frame]');
if (!fs.existsSync(pkg)) throw new Error('not found: ' + pkg);

let text = fs.readFileSync(pkg, 'utf8');
if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip UTF-8 BOM
const obj = JSON.parse(text);
obj.version = ver;
if (frame !== undefined) {
  obj.window = obj.window || {};
  obj.window.frame = (frame === 'true' || frame === true);
  console.log('[OK] package.json window.frame -> ' + obj.window.frame);
}
fs.writeFileSync(pkg, JSON.stringify(obj, null, 2) + '\n');
console.log('[OK] package.json version -> ' + ver);
