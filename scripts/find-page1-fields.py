import fitz
path = r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'
page = fitz.open(path)[0]
boxes = []
for d in page.get_drawings():
    r = d.get('rect')
    if not r or r.height < 15 or r.height > 60 or r.width < 40:
        continue
    boxes.append({
        'y0': round(r.y0, 1), 'x0': round(r.x0, 1),
        'x1': round(r.x1, 1), 'y1': round(r.y1, 1),
        'h': round(r.height, 1),
    })
boxes.sort(key=lambda b: (b['y0'], b['x0']))
for b in boxes:
    print(b)
