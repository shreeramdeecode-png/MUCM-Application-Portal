import fitz
path = r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'
doc = fitz.open(path)

for pno in range(6):
    page = doc[pno]
    boxes = []
    for d in page.get_drawings():
        r = d.get('rect')
        if not r or r.width < 80 or r.height < 15 or r.height > 80:
            continue
        boxes.append((round(r.y0,1), round(r.x0,1), round(r.x1,1), round(r.y1,1), round(r.height,1)))
    boxes.sort(key=lambda t: (t[0], t[1]))
    print(f'\n=== PAGE {pno+1} INPUT BOXES ({len(boxes)}) ===')
    for b in boxes:
        print(b)
