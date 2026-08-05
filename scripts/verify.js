#!/usr/bin/env node
/**
 * 验证安装包：dist\QiXiuBaoInst_v2_win7.exe 内嵌 RAR 与 work\newpack.rar 完全一致
 * 用法: node verify.js [EXE] [NEW_RAR]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const EXE = path.resolve(args[0] || 'dist/QiXiuBaoInst_v2_win7.exe');
const NEWRAR = path.resolve(args[1] || 'work/newpack.rar');

if (!fs.existsSync(EXE)) throw new Error('找不到安装包: ' + EXE);
if (!fs.existsSync(NEWRAR)) throw new Error('找不到 newpack.rar: ' + NEWRAR);

const exe = fs.readFileSync(EXE);
const np = fs.readFileSync(NEWRAR);

if (exe.subarray(0, 2).toString('latin1') !== 'MZ') throw new Error('不是有效的 PE 文件 (MZ 头缺失)');

const magic = Buffer.from('Rar!');
let idx = 0;
let found = -1;
while (true) {
  const i = exe.indexOf(magic, idx);
  if (i < 0) break;
  if (i + np.length <= exe.length && exe.subarray(i, i + np.length).equals(np)) {
    found = i;
    break;
  }
  idx = i + 1;
}
if (found < 0) throw new Error('安装包中未找到与 work/newpack.rar 完全一致的内嵌 RAR');

const md5 = crypto.createHash('md5').update(exe).digest('hex').toUpperCase();
console.log('PASS 内嵌 RAR 与 work/newpack.rar 完全一致 @ 0x' + found.toString(16));
console.log('PASS newpack.rar : ' + np.length + ' bytes (' + (np.length / 1048576).toFixed(1) + ' MB)');
console.log('PASS 安装包       : ' + exe.length + ' bytes (' + (exe.length / 1048576).toFixed(1) + ' MB)');
console.log('PASS md5         : ' + md5);
