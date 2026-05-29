import fitz
import sys

path = sys.argv[1] if len(sys.argv) > 1 else r'c:\Users\HP\Downloads\MUCM_Application_Form_Redesigned.pdf'
doc = fitz.open(path)
for pno in range(doc.page_count):
    page = doc[pno]
    print(f'=== PAGE {pno + 1} ({page.rect.width}x{page.rect.height}) ===')
    for b in page.get_text('dict')['blocks']:
        if b.get('type') != 0:
            continue
        for line in b['lines']:
            for s in line['spans']:
                t = s['text'].strip()
                if not t:
                    continue
                x0, y0, x1, y1 = s['bbox']
                print(f'{t!r}\t{y1:.1f}\t{x0:.1f}-{x1:.1f}')
