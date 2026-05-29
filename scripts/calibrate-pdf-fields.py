"""Export field placement targets: underlines + input boxes per page."""
import fitz
import json

path = r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'
doc = fitz.open(path)

def collect_page(page):
    hlines = []
    boxes = []
    for d in page.get_drawings():
        r = d.get('rect')
        if not r:
            continue
        w, h = r.width, r.height
        if w > 30 and h < 2.5:
            hlines.append({
                'y': round(r.y0, 1),
                'x0': round(r.x0, 1),
                'x1': round(r.x1, 1),
            })
        if 15 < h < 65 and w > 40:
            boxes.append({
                'y0': round(r.y0, 1),
                'x0': round(r.x0, 1),
                'x1': round(r.x1, 1),
                'y1': round(r.y1, 1),
                'h': round(h, 1),
            })
    hlines.sort(key=lambda t: (t['y'], t['x0']))
    boxes.sort(key=lambda t: (t['y0'], t['x0']))
    return hlines, boxes

for pno in range(6):
    page = doc[pno]
    hlines, boxes = collect_page(page)
    print(f'\n===== PAGE {pno + 1} =====')
    print('HLINES', len(hlines))
    for h in hlines:
        print('  h', h)
    print('BOXES', len(boxes))
    for b in boxes:
        # suggested text baseline = y1 - 10 for box, or y of hline - 2
        print('  b', b, 'baseline', round(b['y1'] - 10, 1))
