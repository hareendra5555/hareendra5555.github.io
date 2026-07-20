import io, re
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# ── Arkham/New-52 emblem from the reference: very wide, concave upper
#    wing sweep, small notched ears, scalloped underside, centre point.
arkham = '''      <symbol id="bat-arkham" viewBox="0 0 1000 430">
        <path d="M0 246
                 C 90 88, 200 0, 273 0
                 C 352 0, 424 58, 446 152
                 L 459 46 L 500 116 L 541 46 L 554 152
                 C 576 58, 648 0, 727 0
                 C 800 0, 910 88, 1000 246
                 C 936 300, 830 306, 762 340
                 L 726 292
                 C 690 330, 632 344, 596 372
                 C 560 396, 524 408, 500 430
                 C 476 408, 440 396, 404 372
                 C 368 344, 310 330, 274 292
                 L 238 340
                 C 170 306, 64 300, 0 246 Z" />
      </symbol>
'''
s = s.replace('      <!-- ── Per-section Gotham artwork ── -->', arkham + '\n      <!-- ── Per-section Gotham artwork ── -->', 1)

# Skills uses the Arkham logo the reference specifies
s = s.replace('<svg viewBox="0 0 400 140" focusable="false"><use href="#bat-snyder" /></svg>',
              '<svg viewBox="0 0 1000 430" focusable="false"><use href="#bat-arkham" /></svg>', 1)

# ── Cowl from the reference: tall thin pointed ears, rounded dome,
#    angular eye slits, and the open lower face cut clean through.
cowl = '''
        <path d="M78 6 L110 98
                 C 128 74, 192 74, 210 98
                 L 242 6 L 234 112
                 C 246 140, 250 176, 248 214
                 C 246 254, 236 288, 216 312
                 C 196 336, 178 352, 160 360
                 C 142 352, 124 336, 104 312
                 C 84 288, 74 254, 72 214
                 C 70 176, 74 140, 86 112 Z
                 M94 148 L146 138 L152 168 L98 172 Z
                 M226 148 L174 138 L168 168 L222 172 Z
                 M104 200 L160 232 L216 200
                 C 220 252, 210 292, 190 318
                 C 176 336, 168 342, 160 346
                 C 152 342, 144 336, 130 318
                 C 110 292, 100 252, 104 200 Z" />'''
pat = re.compile(r'<symbol id="art-cowl" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="art-cowl" viewBox="0 0 320 370" fill-rule="evenodd">%s\n      </symbol>' % cowl, s, count=1)
s = re.sub(r'<svg viewBox="[^"]*" focusable="false"><use href="#art-cowl" /></svg>',
           '<svg viewBox="0 0 320 370" focusable="false"><use href="#art-cowl" /></svg>', s)

# ── Tumbler from the blueprint side view: low pointed nose, stepped
#    faceted body rising to the rear, BOTH wheels large.
tumbler = '''
        <polygon points="10,192 62,170 122,158 152,138 232,130 272,94 332,86 372,112 424,104 474,120 542,148 582,190 582,208 10,208" />
        <circle cx="142" cy="188" r="52" />
        <circle cx="452" cy="176" r="64" />'''
pat = re.compile(r'<symbol id="art-tumbler" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="art-tumbler" viewBox="0 0 600 246">%s\n      </symbol>' % tumbler, s, count=1)
s = re.sub(r'<svg viewBox="[^"]*" focusable="false"><use href="#art-tumbler" /></svg>',
           '<svg viewBox="0 0 600 246" focusable="false"><use href="#art-tumbler" /></svg>', s)

io.open(p, 'w', encoding='utf-8').write(s)
print('arkham logo + cowl + tumbler from references')
