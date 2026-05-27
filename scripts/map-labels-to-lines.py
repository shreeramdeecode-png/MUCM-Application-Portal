"""Map label text to nearest underline (hline) below on page 1."""
import fitz

path = r'f:\uni\university-application-portal\public\forms\mucm-application-form-redesigned.pdf'
page = fitz.open(path)[0]

labels = []
for b in page.get_text('dict')['blocks']:
    if b.get('type') != 0:
        continue
    for line in b['lines']:
        for s in line['spans']:
            t = s['text'].strip()
            if not t or len(t) < 2:
                continue
            x0, y0, x1, y1 = s['bbox']
            if any(k in t.upper() for k in [
                'SURNAME', 'FIRST NAME', 'MIDDLE', 'PREFERRED', 'CHANGED', 'GENDER',
                'DATE OF BIRTH', 'CITIZENSHIP', 'NATIONALITY', 'RESIDENCE', 'PASSPORT',
                'VISA', 'EMAIL', 'TELEPHONE', 'MOBILE', 'HOME', 'PERMANENT', 'MAILING',
                'EMERGENCY', 'RELATIONSHIP', 'COUNTRY',
            ]):
                labels.append((t[:40], round(y1, 1), round(x0, 1), round(x1, 1)))

hlines = []
for d in page.get_drawings():
    r = d.get('rect')
    if not r:
        continue
    if r.width > 30 and r.height < 2.5:
        hlines.append((round(r.y0, 1), round(r.x0, 1), round(r.x1, 1)))

labels.sort(key=lambda x: x[1])
hlines.sort()

print('LABELS:', len(labels))
for lab in labels:
    ly = lab[1]
    lx0, lx1 = lab[2], lab[3]
    below = [h for h in hlines if h[0] > ly + 2 and h[0] < ly + 45 and h[2] > lx0 - 20 and h[1] < lx1 + 20]
    below.sort(key=lambda h: h[0])
    h = below[0] if below else None
    baseline = round(h[0] - 3, 1) if h else '—'
    print(f'{lab[0]!r:40} labelY={ly} line={h} baseline={baseline}')
