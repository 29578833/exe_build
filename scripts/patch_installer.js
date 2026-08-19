#!/usr/bin/env node
/**
 * 替换 NSIS 安装器 RES/132 资源数据（RAR）—— 汽修宝 v2 Win7 版构建（Node 版）
 * 用法:
 *   node patch_installer.js [SRC] [NEW_RAR] [OUT]
 * 默认（相对本工程根目录）:
 *   SRC     = resources/installer/original_installer.exe   （原版安装包，md5 59fcdb7e...）
 *   NEW_RAR = work/newpack.rar                             （新内核 RAR 数据包）
 *   OUT     = dist/QiXiuBaoInstV2_x32.exe                  （最终安装包）
 * 说明：自动从 PE 资源目录定位内嵌 RAR（RES/132），无需硬编码偏移。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SRC = path.resolve(ROOT, args[0] || 'resources/installer/original_installer.exe');
const NEW_RAR = path.resolve(ROOT, args[1] || 'work/newpack.rar');
const OUT = path.resolve(ROOT, args[2] || 'dist/QiXiuBaoInstV2_x32.exe');

const SECTION_ALIGN = 0x1000;
const FILE_ALIGN = 0x200;

const orig = fs.readFileSync(SRC);
const newrar = fs.readFileSync(NEW_RAR);
console.log('SRC     : ' + SRC + ' (' + orig.length + ' bytes)');
console.log('NEW_RAR : ' + NEW_RAR + ' (' + newrar.length + ' bytes)');
console.log('OUT     : ' + OUT);

// ---------- 解析 PE ----------
const peOff = orig.readUInt32LE(0x3c);
const numSec = orig.readUInt16LE(peOff + 6);
const optSize = orig.readUInt16LE(peOff + 20);
const opt = peOff + 24;
const secOff = opt + optSize;

const secs = [];
for (let i = 0; i < numSec; i++) {
  const off = secOff + i * 40;
  const name = orig.subarray(off, off + 8).toString('latin1').replace(/\0+$/, '');
  secs.push({
    name,
    off,
    vsize: orig.readUInt32LE(off + 8),
    vaddr: orig.readUInt32LE(off + 12),
    rsize: orig.readUInt32LE(off + 16),
    rptr: orig.readUInt32LE(off + 20),
  });
}
const rsrc = secs.find(s => s.name === '.rsrc');
const reloc = secs.find(s => s.name === '.reloc');
if (!rsrc || !reloc) throw new Error('.rsrc / .reloc 段缺失，不是预期的 NSIS 壳');
const rsrcRvaBase = rsrc.vaddr;
const rsrcFileBase = rsrc.rptr;
const rvaToFile = rva => rva - rsrcRvaBase + rsrcFileBase;
const resDirRva = orig.readUInt32LE(opt + 96 + 2 * 8);

// ---------- 遍历资源目录 ----------
const entries = [];
function walkDir(dirRva, p) {
  const dirOff = rvaToFile(dirRva);
  const nNamed = orig.readUInt16LE(dirOff + 12);
  const nId = orig.readUInt16LE(dirOff + 14);
  for (let i = 0; i < nNamed + nId; i++) {
    const eOff = dirOff + 16 + i * 8;
    const nameVal = orig.readUInt32LE(eOff);
    const toData = orig.readUInt32LE(eOff + 4);
    const name = (nameVal & 0x80000000) ? ('name' + (nameVal & 0x7fffffff)) : String(nameVal);
    if (toData & 0x80000000) {
      walkDir(resDirRva + (toData & 0x7fffffff), p + '/' + name);
    } else {
      const eFile = rvaToFile(resDirRva + toData);
      entries.push({
        path: p + '/' + name,
        eFile,
        dataRva: orig.readUInt32LE(eFile),
        dataSize: orig.readUInt32LE(eFile + 4),
      });
    }
  }
}
walkDir(resDirRva, '');

// ---------- 自动定位内嵌 RAR（RES/132，以 Rar! 魔数 + 大小判断）----------
const rarEntry = entries.find(e =>
  e.dataRva >= rsrc.vaddr &&
  e.dataSize > 1000000 &&
  orig.subarray(rvaToFile(e.dataRva), rvaToFile(e.dataRva) + 4).toString('latin1') === 'Rar!'
);
if (!rarEntry) throw new Error('未在资源目录中找到内嵌 RAR 条目');
const OLD_RAR_OFF = rvaToFile(rarEntry.dataRva);
const OLD_RAR_RVA = rarEntry.dataRva;
const OLD_RAR_SIZE = rarEntry.dataSize;
const OLD_RAR_END_RVA = OLD_RAR_RVA + OLD_RAR_SIZE;
const shift = newrar.length - OLD_RAR_SIZE;
console.log('检测到 RAR: RVA 0x' + OLD_RAR_RVA.toString(16) +
  ' 文件偏移 0x' + OLD_RAR_OFF.toString(16) + ' 大小 ' + OLD_RAR_SIZE +
  ' (' + (OLD_RAR_SIZE / 1048576).toFixed(1) + 'MB)');
console.log('shift = 0x' + shift.toString(16) + ' (+' + (shift / 1048576).toFixed(1) + 'MB)');

const toFix = entries.filter(e => e.dataRva >= OLD_RAR_END_RVA);
console.log('资源条目 ' + entries.length + ' 个, RAR 后需修正 RVA ' + toFix.length + ' 个');

// ---------- 重建 .rsrc / .reloc ----------
const rarInRsrc = OLD_RAR_OFF - rsrc.rptr;
const newRsrcRaw = Buffer.concat([
  orig.subarray(rsrc.rptr, rsrc.rptr + rarInRsrc),
  newrar,
  orig.subarray(rsrc.rptr + rarInRsrc + OLD_RAR_SIZE, rsrc.rptr + rsrc.rsize),
]);
const newRsrcRsize = Math.ceil(newRsrcRaw.length / FILE_ALIGN) * FILE_ALIGN;
const newRsrcVsize = Math.ceil(newRsrcRaw.length / SECTION_ALIGN) * SECTION_ALIGN;
const newRelocRptr = rsrc.rptr + newRsrcRsize;
const newRelocVaddr = Math.ceil((rsrc.vaddr + newRsrcVsize) / SECTION_ALIGN) * SECTION_ALIGN;
if (newRelocRptr < rsrc.rptr + newRsrcRaw.length) throw new Error('reloc 与 rsrc 重叠');

const newData = Buffer.alloc(newRelocRptr + reloc.rsize);
orig.copy(newData, 0, 0, rsrc.rptr);
newRsrcRaw.copy(newData, rsrc.rptr);
orig.copy(newData, newRelocRptr, reloc.rptr, reloc.rptr + reloc.rsize);

for (const s of secs) {
  if (s.name === '.rsrc') {
    newData.writeUInt32LE(newRsrcVsize, s.off + 8);
    newData.writeUInt32LE(newRsrcRsize, s.off + 16);
  } else if (s.name === '.reloc') {
    newData.writeUInt32LE(newRelocVaddr, s.off + 12);
    newData.writeUInt32LE(newRelocRptr, s.off + 20);
  }
}
const newSizeOfImage = Math.ceil((newRelocVaddr + reloc.vsize) / SECTION_ALIGN) * SECTION_ALIGN;
newData.writeUInt32LE(newSizeOfImage, opt + 56);

for (const e of toFix) newData.writeUInt32LE(e.dataRva + shift, e.eFile);
for (const e of entries) {
  if (e.path.indexOf('/132/') >= 0 && e.dataRva === OLD_RAR_RVA) {
    newData.writeUInt32LE(newrar.length, e.eFile + 4);
    console.log('RES/132 Size ' + e.dataSize + ' -> ' + newrar.length);
  }
}

// ---------- 校验并写盘 ----------
const embedded = newData.subarray(OLD_RAR_OFF, OLD_RAR_OFF + newrar.length);
if (!embedded.equals(newrar)) throw new Error('RAR 嵌入不完整');
if (newData.subarray(OLD_RAR_OFF, OLD_RAR_OFF + 4).toString('latin1') !== 'Rar!') throw new Error('RAR 头校验失败');

const outDir = path.dirname(OUT);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(OUT, newData);
console.log('已保存 ' + OUT + ' (' + (newData.length / 1048576).toFixed(1) + ' MB)');
