"""Find horizontal rules and checkbox-sized rects in the MUCM application PDF."""
import fitz
import sys
from collections import defaultdict

path = sys.argv[1] if len(sys.argv) > 1 else r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'
doc = fitz.open(path)

for pno in range(min(6, doc.page_count)):
    page = doc[pno]
    print(f'\n=== PAGE {pno + 1} ===')
    hlines = []
    rects_small = []

    for path in page.get_drawings():
        rect = path.get('rect')
        if not rect:
            continue
        w = rect.width
        h = rect.height
        # horizontal line: wide and thin
        if w > 40 and h < 2:
            hlines.append((round(rect.y0, 1), round(rect.x0, 1), round(rect.x1, 1), round(h, 2)))
        # small square ~ checkbox
        if 6 < w < 14 and 6 < h < 14:
            rects_small.append((round(rect.x0, 1), round(rect.y0, 1), round(rect.width, 1), round(rect.height, 1)))

    hlines.sort(key=lambda t: (t[0], t[1]))
    print('H-LINES (y, x0, x1, h):', len(hlines))
    for row in hlines[:40]:
        print(' ', row)
    if len(hlines) > 40:
        print('  ...', len(hlines) - 40, 'more')

    rects_small.sort(key=lambda t: (t[1], t[0]))
    print('SMALL RECTS (x, y, w, h):', len(rects_small))
    for row in rects_small[:35]:
        print(' ', row)
