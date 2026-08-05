#!/usr/bin/env python3
"""替换 NSIS 安装器 RES/132 资源数据（RAR）—— 汽修宝 v2 Win7 版构建

用法:
    python3 patch_installer.py [SRC] [NEW_RAR] [OUT]

默认（相对本工程根目录）:
    SRC     = resources/installer/original_installer.exe   （原版安装包，md5 59fcdb7e...）
    NEW_RAR = work/newpack.rar                             （新内核 RAR 数据包）
    OUT     = dist/QiXiuBaoInst_v2_win7.exe                （最终安装包）

说明：自动从 PE 资源目录定位内嵌 RAR（RES/132），无需硬编码偏移。
"""
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def arg(i, default):
    return ROOT / (sys.argv[i] if len(sys.argv) > i else default)

SRC = arg(1, "resources/installer/original_installer.exe")
NEW_RAR = arg(2, "work/newpack.rar")
OUT = arg(3, "dist/QiXiuBaoInst_v2_win7.exe")

SECTION_ALIGN = 0x1000
FILE_ALIGN = 0x200

orig = bytearray(SRC.read_bytes())
newrar = NEW_RAR.read_bytes()
print(f"SRC     : {SRC} ({len(orig)} bytes)")
print(f"NEW_RAR : {NEW_RAR} ({len(newrar)} bytes)")
print(f"OUT     : {OUT}")

# ---------- 解析 PE ----------
pe_off = struct.unpack_from("<I", orig, 0x3c)[0]
num_sec = struct.unpack_from("<H", orig, pe_off + 6)[0]
opt = pe_off + 24
sec_off = opt + struct.unpack_from("<H", orig, pe_off + 20)[0]
secs = {}
for i in range(num_sec):
    off = sec_off + i * 40
    name = bytes(orig[off:off+8]).rstrip(b"\x00").decode(errors="ignore")
    vsize, vaddr, rsize, rptr = struct.unpack_from("<IIII", orig, off + 8)
    secs[name] = {"off": off, "vsize": vsize, "vaddr": vaddr, "rsize": rsize, "rptr": rptr}
rsrc = secs[".rsrc"]
reloc = secs[".reloc"]
rsrc_rva_base, rsrc_file_base = rsrc["vaddr"], rsrc["rptr"]

def rva_to_file(rva):
    return rva - rsrc_rva_base + rsrc_file_base

data_dir_rva = struct.unpack_from("<I", orig, opt + 96 + 2 * 8)[0]
resource_entries = []

def walk_dir(dir_rva, path):
    dir_off = rva_to_file(dir_rva)
    n_named, n_id = struct.unpack_from("<HH", orig, dir_off + 12)
    for i in range(n_named + n_id):
        e_off = dir_off + 16 + i * 8
        name_val, offset_to_data = struct.unpack_from("<II", orig, e_off)
        name = f"name{name_val & 0x7fffffff}" if name_val & 0x80000000 else str(name_val)
        if offset_to_data & 0x80000000:
            walk_dir(data_dir_rva + (offset_to_data & 0x7fffffff), f"{path}/{name}")
        else:
            e_file = rva_to_file(data_dir_rva + offset_to_data)
            data_rva, data_size = struct.unpack_from("<II", orig, e_file)
            resource_entries.append((f"{path}/{name}", e_file, data_rva, data_size))

walk_dir(data_dir_rva, "")

# ---------- 自动定位内嵌 RAR（RES/132）----------
rar_entry = next(
    (e for e in resource_entries
     if e[2] >= rsrc["vaddr"] and e[3] > 1_000_000
     and orig[rva_to_file(e[2]):rva_to_file(e[2])+4] == b"Rar!"),
    None,
)
if rar_entry is None:
    raise SystemExit("未在资源目录中找到内嵌 RAR 条目")
OLD_RAR_OFF = rva_to_file(rar_entry[2])
OLD_RAR_RVA = rar_entry[2]
OLD_RAR_SIZE = rar_entry[3]
OLD_RAR_END_RVA = OLD_RAR_RVA + OLD_RAR_SIZE
shift = len(newrar) - OLD_RAR_SIZE
print(f"检测到 RAR: RVA 0x{OLD_RAR_RVA:x} 文件偏移 0x{OLD_RAR_OFF:x} 大小 {OLD_RAR_SIZE} ({OLD_RAR_SIZE/1024/1024:.1f}MB)")
print(f"shift=0x{shift:x} (+{shift/1024/1024:.1f}MB)")

to_fix = [e for e in resource_entries if e[2] >= OLD_RAR_END_RVA]
print(f"资源条目 {len(resource_entries)} 个, RAR 后需修正 {len(to_fix)} 个")

# ---------- 重建 .rsrc / .reloc ----------
rar_in_rsrc = OLD_RAR_OFF - rsrc["rptr"]
new_rsrc_raw = orig[rsrc["rptr"]:rsrc["rptr"]+rsrc["rsize"]]
new_rsrc_raw = new_rsrc_raw[:rar_in_rsrc] + newrar + new_rsrc_raw[rar_in_rsrc + OLD_RAR_SIZE:]
new_rsrc_rsize = (len(new_rsrc_raw) + FILE_ALIGN - 1) // FILE_ALIGN * FILE_ALIGN
new_rsrc_vsize = (len(new_rsrc_raw) + SECTION_ALIGN - 1) // SECTION_ALIGN * SECTION_ALIGN
new_reloc_rptr = rsrc["rptr"] + new_rsrc_rsize
new_reloc_vaddr = ((rsrc["vaddr"] + new_rsrc_vsize + SECTION_ALIGN - 1) // SECTION_ALIGN) * SECTION_ALIGN
if new_reloc_rptr < rsrc["rptr"] + len(new_rsrc_raw):
    raise SystemExit("reloc 与 rsrc 重叠")

new_data = bytearray(orig[:rsrc["rptr"]]) + new_rsrc_raw
pad = new_reloc_rptr - (rsrc["rptr"] + len(new_rsrc_raw))
new_data += b"\x00" * pad + orig[reloc["rptr"]:reloc["rptr"]+reloc["rsize"]]

for name, s in secs.items():
    off = s["off"]
    if name == ".rsrc":
        struct.pack_into("<I", new_data, off + 8, new_rsrc_vsize)
        struct.pack_into("<I", new_data, off + 16, new_rsrc_rsize)
    elif name == ".reloc":
        struct.pack_into("<I", new_data, off + 12, new_reloc_vaddr)
        struct.pack_into("<I", new_data, off + 20, new_reloc_rptr)
new_soi = ((new_reloc_vaddr + reloc["vsize"] + SECTION_ALIGN - 1) // SECTION_ALIGN) * SECTION_ALIGN
struct.pack_into("<I", new_data, opt + 56, new_soi)

for path, e_file, old_rva, size in to_fix:
    struct.pack_into("<I", new_data, e_file, old_rva + shift)
for path, e_file, old_rva, size in resource_entries:
    if "/132/" in path and old_rva == OLD_RAR_RVA:
        struct.pack_into("<I", new_data, e_file + 4, len(newrar))
        print(f"RES/132 Size {size} -> {len(newrar)}")

# ---------- 校验并写盘 ----------
assert bytes(new_data[OLD_RAR_OFF:OLD_RAR_OFF+len(newrar)]) == newrar, "RAR 嵌入不完整"
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(bytes(new_data))
print(f"已保存 {OUT} ({len(new_data)/1024/1024:.1f} MB)")

