# Handouts

2x2in cards with a QR to `/identify`. Two designs, front and back each.

- `fromhere-*.png` — the red FRØM HERE one
- `dema-*.png` — the paper INVESTIGATION REPORT one
- `*-mono.png` / `sheet-*-mono.pdf` — black and white, for a copier
- `sheet-*.pdf` — 20 per US Letter page. Page 1 fronts, page 2 backs.
- `_preview.png`, `_preview-mono.png` — all four faces at a glance

Everything is 300dpi. The QR points at `https://fpe-archive.pages.dev/identify`.

## Printing

Print the PDF at **100% / actual size**, not "fit to page", or the cards
come out under 2in and the QR gets tight.

Double sided, **flip on the LONG edge**. The backs are already mirrored
left-to-right to suit that; flipping on the short edge will put them on the
wrong cards.

Cut on the grid. There is no bleed, so a hair of white on an edge of the red
one is normal — cut a shade inside if it bothers you.

## Rebuilding

Needs `pillow` and `qrcode`, and runs from the repo root:

```
python3 -m venv /tmp/cards && /tmp/cards/bin/pip install pillow "qrcode[pil]"
/tmp/cards/bin/python assets/handouts/make-cards.py
/tmp/cards/bin/python assets/handouts/make-sheets.py
```

Change `URL` and `SHOWN` at the top of `make-cards.py` if the address moves.
