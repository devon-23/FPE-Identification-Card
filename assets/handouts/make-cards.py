from PIL import Image, ImageDraw, ImageFont
import qrcode, os

DPI   = 300
SIDE  = 2 * DPI                      # 2in square
URL   = 'https://fpe-archive.pages.dev'
SHOWN = 'fpe-archive.pages.dev'
TAG   = '#FPECard \u00b7 @devonisreallyco'

STEPS = [
    ('1', 'Scan it. Make your own identification card.'),
    ('2', 'Say where you came from, and go on the map.'),
    ('3', 'It saves to your phone. Post it.'),
]

MONO = False      # flipped by the runner at the bottom

def pal():
    if MONO:
        # paper white throughout: a solid black 2in square eats toner and
        # comes out of a copier looking like a mistake
        return ((255, 255, 255), (0, 0, 0), (70, 70, 70),
                (0, 0, 0), (255, 255, 255), (0, 0, 0))
    return ((208, 32, 25), (255, 216, 0), (213, 208, 195),
            (0, 0, 0), (255, 255, 255), (163, 40, 31))

A    = 'assets/fonts/Main.ttf'        # Alfredino
BANK = 'assets/fonts/Dema Font.ttf'   # BankGothic

# sized in points, because 19px at 300dpi is four and a half point and
# nobody is reading that off a scrap of paper in a car park
pt = lambda n: max(1, round(n / 72 * DPI))
f = lambda path, points: ImageFont.truetype(path, pt(points))

def qr(fg, bg, px):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=10, border=0)
    q.add_data(URL); q.make(fit=True)
    return q.make_image(fill_color=fg, back_color=bg).convert('RGB').resize((px, px), Image.NEAREST)

def tracked(d, text, font, x, y, fill, sp):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + sp
    return x

def tw(d, text, font, sp):
    return sum(d.textlength(c, font=font) for c in text) + sp * max(0, len(text) - 1)

# centred, and shrunk until it fits between the margins. hand tuning every
# size is how you end up with a clipped word on a printed card
MARGIN = 46

def centred(d, text, path, points, y, fill, sp, w=SIDE):
    avail = w - MARGIN * 2
    size = points
    while size > 3 and tw(d, text, f(path, size), sp) > avail:
        size -= 0.25
    font = f(path, size)
    while sp > 0.1 and tw(d, text, font, sp) > avail:
        sp -= 0.1
    tracked(d, text, font, (w - tw(d, text, font, sp)) / 2, y, fill, sp)

def wrap(d, text, font, maxw, sp):
    out, line = [], ''
    for word in text.split():
        t = (line + ' ' + word).strip()
        if tw(d, t, font, sp) > maxw and line:
            out.append(line); line = word
        else:
            line = t
    if line: out.append(line)
    return out

# ---------------------------------------------------------------- FRØM HERE
def fromhere_front():
    FH_RED, FH_YEL, BONE, INK, PAPER, OX = pal()
    im = Image.new('RGB', (SIDE, SIDE), FH_RED); d = ImageDraw.Draw(im)
    d.rectangle([14, 14, SIDE - 15, SIDE - 15], outline=FH_YEL, width=4)
    centred(d, 'FRØM HERE', A, 15, 48, FH_YEL, 2)
    centred(d, '———>  TØ HERE', A, 7, 130, BONE, 2)

    box = 268
    pad = Image.new('RGB', (box + 26, box + 26), PAPER)
    pad.paste(qr('#000000', '#ffffff', box), (13, 13))
    im.paste(pad, ((SIDE - box - 26) // 2, 168))

    centred(d, 'SCAN IT', A, 9, 486, FH_YEL, 5)
    centred(d, SHOWN.upper(), A, 6, 534, BONE, 1)
    return im

def fromhere_back():
    FH_RED, FH_YEL, BONE, INK, PAPER, OX = pal()
    im = Image.new('RGB', (SIDE, SIDE), FH_RED); d = ImageDraw.Draw(im)
    d.rectangle([14, 14, SIDE - 15, SIDE - 15], outline=FH_YEL, width=4)
    centred(d, 'WHAT THIS IS', A, 11, 44, FH_YEL, 4)
    d.line([(46, 96), (SIDE - 46, 96)], fill=FH_YEL, width=2)

    num, body = f(A, 11), f(A, 8)
    y = 128
    for n, line in STEPS:
        d.text((46, y - 2), n, font=num, fill=FH_YEL)
        for ln in wrap(d, line, body, SIDE - 150, 0.5):
            tracked(d, ln, body, 92, y, BONE, 0.5); y += 40
        y += 26

    d.line([(46, SIDE - 126), (SIDE - 46, SIDE - 126)], fill=FH_YEL, width=2)
    centred(d, SHOWN.upper(), A, 7.5, SIDE - 108, FH_YEL, 0.5)
    centred(d, TAG, A, 7, SIDE - 62, BONE, 0.8)
    return im

# --------------------------------------------------------------------- DEMA
def dema_front():
    FH_RED, FH_YEL, BONE, INK, PAPER, OX = pal()
    im = Image.new('RGB', (SIDE, SIDE), PAPER); d = ImageDraw.Draw(im)
    d.rectangle([16, 16, SIDE - 17, SIDE - 17], outline=INK, width=2)
    centred(d, 'SACRED MUNICIPALITY OF DEMA', BANK, 5.5, 40, OX, 4)

    seal = Image.open('public/images/dema_sectors.webp').convert('RGBA').resize((74, 74), Image.LANCZOS)
    tint = Image.new('RGBA', (74, 74), OX + (255,)); tint.putalpha(seal.split()[3])
    im.paste(tint, ((SIDE - 74) // 2, 66), tint)

    centred(d, 'INVESTIGATION', BANK, 12, 156, INK, 3)
    centred(d, 'REPORT', BANK, 12, 208, INK, 3)
    centred(d, 'FORM D-17-B', BANK, 5.5, 262, (120, 120, 120), 3)
    d.line([(58, 292), (SIDE - 58, 292)], fill=INK, width=1)

    box = 192
    im.paste(qr('#000000', '#ffffff', box), ((SIDE - box) // 2, 310))

    d.line([(58, 524), (SIDE - 58, 524)], fill=INK, width=1)
    centred(d, 'TURN YOURSELF IN', BANK, 11, 544, OX, 3)
    return im

def dema_back():
    FH_RED, FH_YEL, BONE, INK, PAPER, OX = pal()
    im = Image.new('RGB', (SIDE, SIDE), PAPER); d = ImageDraw.Draw(im)
    d.rectangle([16, 16, SIDE - 17, SIDE - 17], outline=INK, width=2)
    centred(d, 'NOTICE TO THE SUBJECT', BANK, 7, 44, OX, 3)
    d.line([(52, 86), (SIDE - 52, 86)], fill=INK, width=1)

    num, body = f(BANK, 9), f(BANK, 7.5)
    y = 124
    for n, line in STEPS:
        d.text((52, y - 2), n, font=num, fill=OX)
        for ln in wrap(d, line, body, SIDE - 150, 0.4):
            tracked(d, ln, body, 96, y, (40, 40, 40), 0.4); y += 36
        y += 24

    d.line([(52, SIDE - 152), (SIDE - 52, SIDE - 152)], fill=INK, width=1)
    centred(d, SHOWN.upper(), BANK, 7, SIDE - 136, OX, 0.5)
    centred(d, 'ALL EARTHLY HONOR UNTO THE GLORIOUS GONE', BANK, 5.5, SIDE - 94, (120, 120, 120), 1.5)
    centred(d, TAG, BANK, 6, SIDE - 56, (110, 110, 110), 0.5)
    return im

out = 'assets/handouts'
os.makedirs(out, exist_ok=True)

def build(suffix):
    return {
        f'fromhere-front{suffix}': fromhere_front(), f'fromhere-back{suffix}': fromhere_back(),
        f'dema-front{suffix}':     dema_front(),     f'dema-back{suffix}':     dema_back(),
    }

written = {}
for MONO_ON, suffix in ((False, ''), (True, '-mono')):
    MONO = MONO_ON
    globals()['MONO'] = MONO_ON
    faces = build(suffix)
    for name, im in faces.items():
        im.save(f'{out}/{name}.png', dpi=(DPI, DPI))
    written.update(faces)
print('wrote', len(written), 'faces')

for suffix, label in (('', '_preview.png'), ('-mono', '_preview-mono.png')):
    four = [written[f'{k}{suffix}'] for k in
            ('fromhere-front', 'fromhere-back', 'dema-front', 'dema-back')]
    sheet = Image.new('RGB', (SIDE * 2 + 60, SIDE * 2 + 60), (190, 190, 190))
    for i, im in enumerate(four):
        sheet.paste(im, (20 + (i % 2) * (SIDE + 20), 20 + (i // 2) * (SIDE + 20)))
    sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS).save(f'{out}/{label}')
    print('wrote', label)
