from PIL import Image, ImageDraw

DPI = 300
CARD = 2 * DPI
PW, PH = int(8.5 * DPI), 11 * DPI     # US Letter
COLS, ROWS = 4, 5                      # 8in x 10in of cards
MX, MY = (PW - COLS * CARD) // 2, (PH - ROWS * CARD) // 2
GUIDE = (205, 205, 205)

def grid(card, mirror):
    """mirror flips the columns, so backs line up after a long-edge duplex flip"""
    page = Image.new('RGB', (PW, PH), 'white')
    for r in range(ROWS):
        for c in range(COLS):
            col = (COLS - 1 - c) if mirror else c
            page.paste(card, (MX + col * CARD, MY + r * CARD))

    # cut lines, drawn into the margin only so they never cross a card
    d = ImageDraw.Draw(page)
    for c in range(COLS + 1):
        x = MX + c * CARD
        d.line([(x, 0), (x, MY - 12)], fill=GUIDE, width=1)
        d.line([(x, MY + ROWS * CARD + 12), (x, PH)], fill=GUIDE, width=1)
    for r in range(ROWS + 1):
        y = MY + r * CARD
        d.line([(0, y), (MX - 12, y)], fill=GUIDE, width=1)
        d.line([(MX + COLS * CARD + 12, y), (PW, y)], fill=GUIDE, width=1)
    return page

for base in ('fromhere', 'dema'):
    for suffix in ('', '-mono'):
        front = Image.open(f'assets/handouts/{base}-front{suffix}.png').convert('RGB')
        back  = Image.open(f'assets/handouts/{base}-back{suffix}.png').convert('RGB')
        pages = [grid(front, False), grid(back, True)]
        out = f'assets/handouts/sheet-{base}{suffix}.pdf'
        pages[0].save(out, 'PDF', resolution=DPI, save_all=True, append_images=pages[1:])
        print(f'  {out.split("/")[-1]:26s} 2 pages, {COLS*ROWS} cards per page')
