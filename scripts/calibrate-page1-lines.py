import fitz
path = r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'
page = fitz.open(path)[0]
lines = []
for d in page.get_drawings():
    r = d.get('rect')
    if not r:
        continue
    if r.width > 30 and r.height < 3:
        lines.append((round(r.y0,1), round(r.x0,1), round(r.x1,1), round(r.height,2)))
lines.sort()
print('page1 lines', len(lines))
for L in lines[:50]:
    print(L)

# Also list items near y 310-330
for d in page.get_drawings():
    r = d.get('rect')
    if r and 300 < r.y0 < 340 and r.width > 20:
        print('draw', round(r.y0,1), round(r.x0,1), round(r.x1,1), round(r.width,1), round(r.height,2))
