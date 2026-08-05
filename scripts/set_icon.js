#!/usr/bin/env node
/**
 * set_icon.js - Replace the main exe icon with the QXB logo.
 * Uses Resource Hacker: delete ALL icons first, then add the QXB icon set
 * (resources/installer/qixiubao_app.ico, extracted from the original exe).
 * NOTE: delete and add MUST be separate Resource Hacker invocations.
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RH = path.join(ROOT, 'tools', 'ResourceHacker', 'ResourceHacker.exe');
const EXE = path.join(ROOT, 'work', 'build', '汽修宝电脑版.exe');
const ICO = path.join(ROOT, 'resources', 'installer', 'qixiubao_app.ico');
const TMP = EXE + '.tmp';

function run(args) {
  execFileSync(RH, args, { stdio: 'inherit' });
}

if (!fs.existsSync(RH)) throw new Error('missing ' + RH);
if (!fs.existsSync(EXE)) throw new Error(EXE + ' not found - run assemble.bat first');
if (!fs.existsSync(ICO)) throw new Error('missing ' + ICO);

run(['-open', EXE, '-save', TMP,
     '-action', 'delete', '-mask', 'ICON,,',
     '-action', 'delete', '-mask', 'ICONGROUP,,']);
run(['-open', TMP, '-save', EXE,
     '-action', 'addoverwrite', '-res', ICO, '-mask', 'ICONGROUP,1,']);
if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
console.log('[OK] set_icon done.');
