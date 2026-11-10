"""Sinh icon mặt pixel 16x16 (SVG) cho mục Thành viên. Chạy: py lab/make_faces.py (từ thư mục site)."""
from pathlib import Path

OUT = '#2c2137'
MALE_BODY = [
    '..OOTTCSSCTTOO..',
    '.OTTTTTTTTTTTTO.',
    'OTTTTTTTTTTTTTTO',
    'OTTTTTTTTTTTTTTO']

HEADS = {
    'side': [  # tóc rẽ ngôi
        '....OOOOOOOO....',
        '...OHHHHHHHHO...',
        '..OHHHHHHHHHHO..',
        '..OHHHHHHHhHHO..',
        '.OHHHHHHHhHHHHO.',
        '.OHHHHHHhSSSHHO.',
        '.OHHSSSSSSSSSHO.',
        '.OHSSSSSSSSSSSO.',
        '.OSSESSSSSSESSO.',
        '.OSSESSSSSSESSO.',
        '..OsSSSssSSSsO..',
        '...OOOOOOOOOO...'],
    'spiky': [  # tóc dựng
        '....O.OOOO.O....',
        '...OHOHHHHOHO...',
        '..OHHHHHHHHHHO..',
        '..OHHHHHHHHHHO..',
        '.OHHHHHHHhHHHHO.',
        '.OHhHHSHHHSHhHO.',
        '.OHSSSSSSSSSSHO.',
        '.OSSSSSSSSSSSSO.',
        '.OSSESSSSSSESSO.',
        '.OsSESSSSSSESsO.',
        '..OsSSSssSSSsO..',
        '...OOOOOOOOOO...'],
    'buzz_glasses': [  # tóc ngắn, đeo kính
        '....OOOOOOOO....',
        '...OHHHHHHHHO...',
        '..OHHHHHHHHHHO..',
        '..OHhHHHHHHhHO..',
        '.OHHSSSSSSSSHHO.',
        '.OHSSSSSSSSSSHO.',
        '.OSSSSSSSSSSSSO.',
        '.OSGGGGSSGGGGSO.',
        '.OSGELGGGGLEGSO.',
        '.OsGGGGSSGGGGsO.',
        '..OsSSSssSSSsO..',
        '...OOOOOOOOOO...'],
}
FEMALE = [  # tóc dài, mái, kẹp tóc cam
    '....OOOOOOOO....',
    '...OHHHHHHHHO...',
    '..OHHHHHHHHHHO..',
    '.OHHHHHHHHHccHO.',
    '.OHHHHHHHHhHHHO.',
    '.OHHHHHhHHHHHHO.',
    '.OHHSSSSSSSSHHO.',
    '.OHSSSSSSSSSSHO.',
    '.OHSESSSSSSESHO.',
    '.OHSESSSSSSESHO.',
    '.OHSpSSSSSSpSHO.',
    '.OHHSSSssSSSHHO.',
    '.OHHOOOOOOOOHHO.',
    '.OHHOTTCCTTOHHO.',
    'OHHOTTTTTTTTOHHO',
    'OHOTTTTTTTTTTOHO']

SKIN = {'S': '#f2c9a5', 's': '#d39f7c', 'E': OUT, 'p': '#f2a0a0'}
MEMBERS = {
    'anh':   (FEMALE, {'H': '#3a2630', 'h': '#5a3f4b', 'c': '#e9803d', 'T': '#f4a7b9', 'C': '#ffffff'}),
    'sang':  (HEADS['side'] + MALE_BODY, {'H': '#262131', 'h': '#433c52', 'T': '#4a7bd0', 'C': '#ffffff'}),
    'triet': (HEADS['spiky'] + MALE_BODY, {'H': '#5a3a28', 'h': '#7a5238', 'T': '#4f8a5b', 'C': '#ffffff'}),
    'khiet': (HEADS['buzz_glasses'] + MALE_BODY, {'H': '#2b2633', 'h': '#4a4458', 'G': '#3b3347', 'L': '#c4e2f8', 'T': '#8e6bb8', 'C': '#ffffff'}),
}

def svg(rows, pal):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    rects = []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            col = OUT if ch == 'O' else pal.get(ch) or SKIN[ch]
            rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{col}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'
            + ''.join(rects) + '</svg>\n')

out = Path(__file__).resolve().parent.parent / 'assets' / 'members'
out.mkdir(parents=True, exist_ok=True)
for name, (rows, pal) in MEMBERS.items():
    (out / f'{name}.svg').write_text(svg(rows, pal), encoding='utf-8')
    print('wrote', out / f'{name}.svg')
