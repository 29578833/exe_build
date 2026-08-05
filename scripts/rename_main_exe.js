#!/usr/bin/env node
// Rename nw.exe -> 汽修宝电脑版.exe in a build dir (UTF-8 safe).
// Usage: node rename_main_exe.js <build-dir>
'use strict';
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || 'work/build');
const MAIN = '汽修宝电脑版.exe';
const src = path.join(dir, 'nw.exe');
const dst = path.join(dir, MAIN);

if (!fs.existsSync(src)) {
  console.log('[OK] no nw.exe to rename (already renamed or absent)');
  process.exit(0);
}
if (fs.existsSync(dst)) fs.unlinkSync(dst);
fs.renameSync(src, dst);
console.log('[OK] renamed nw.exe -> ' + MAIN);
