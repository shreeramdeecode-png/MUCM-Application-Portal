import fitz
path = r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'
doc = fitz.open(path)

for pno in range(3):
    page = doc[pno]
    print(f'\n=== PAGE {pno+1} ===')
    # horizontal segments from drawings
    lines = []
    for d in page.get_drawings():
        r = d.get('rect')
        if not r:
            continue
        w, h = r.width, r.height
        if w > 25 and h < 2.5:
            lines.append((round(r.y0, 1), round(r.x0, 1), round(r.x1, 1)))
    lines.sort()
    for L in lines[:60]:
        print('hline', L)
    # field boxes: medium height 20-45
    boxes = []
    for d in page.get_drawings():
        r = d.get('rect')
        if not r:
            continue
        if 18 < r.height < 50 and r.width > 50:
            boxes.append((round(r.y0,1), round(r.x0,1), round(r.x1,1), round(r.y1,1), round(r.height,1)))
    boxes.sort()
    print('boxes', len(boxes))
    for b in boxes:
        print(' box', b, 'baseline~', round(b[3] - 8, 1))

# page 1 photo area
page = doc[0]
print('\n=== PAGE1 PHOTO CANDIDATES ===')
for d in page.get_drawings():
    r = d.get('rect')
    if not r:
        continue
    if r.x0 > 450 and r.y0 < 200 and r.height > 30:
        print('rect', round(r.x0,1), round(r.y0,1), round(r.x1,1), round(r.y1,1), round(r.width,1), round(r.height,1))
