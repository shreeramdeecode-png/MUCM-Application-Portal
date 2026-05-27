"""Generate field slots from MUCM template (underlines + input boxes)."""
import json
import fitz

PATH = r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'

def ulines(page):
    out = []
    for d in page.get_drawings():
        r = d.get('rect')
        if not r:
            continue
        if 12 < r.height < 20 and r.width > 60:
            out.append({
                'x0': round(r.x0, 1),
                'x1': round(r.x1, 1),
                'y0': round(r.y0, 1),
                'y1': round(r.y1, 1),
                'line': round(r.y1, 1),
            })
    return sorted(out, key=lambda u: (u['y0'], u['x0']))

def boxes(page, y_min=0, y_max=900):
    out = []
    for d in page.get_drawings():
        r = d.get('rect')
        if not r:
            continue
        if 28 < r.height < 60 and r.width > 80 and y_min <= r.y0 <= y_max:
            out.append({
                'x0': round(r.x0, 1),
                'x1': round(r.x1, 1),
                'y0': round(r.y0, 1),
                'y1': round(r.y1, 1),
            })
    return sorted(out, key=lambda b: (b['y0'], b['x0']))

doc = fitz.open(PATH)
for pno in range(6):
    page = doc[pno]
    print(f'\n# PAGE {pno + 1}')
    print('ULINES', json.dumps(ulines(page), indent=2))
    print('BOXES', json.dumps(boxes(page), indent=2))
