import io, re
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# Arkham: control points near the chord give a swept scimitar wing;
# pulling them above it (what I had) inflates it into a dome.
arkham = '''
        <path d="M0 246
                 C 78 138, 176 34, 273 6
                 C 352 0, 422 58, 446 152
                 L 460 40 L 500 104 L 540 40 L 554 152
                 C 578 58, 648 0, 727 6
                 C 824 34, 922 138, 1000 246
                 C 958 300, 900 316, 860 336
                 L 770 276
                 C 726 320, 668 346, 645 374
                 C 592 402, 528 412, 500 430
                 C 472 412, 408 402, 355 374
                 C 332 346, 274 320, 230 276
                 L 140 336
                 C 100 316, 42 300, 0 246 Z" />'''
pat = re.compile(r'<symbol id="bat-arkham" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="bat-arkham" viewBox="0 0 1000 430">%s\n      </symbol>' % arkham, s, count=1)

# Cowl: wide cranium, ears with real base width so they read as part of
# the head rather than antennae stuck on top.
cowl = '''
        <path d="M76 8 L118 96
                 C 145 70, 195 70, 222 96
                 L 264 8 L 282 122
                 C 296 150, 302 182, 300 212
                 C 296 258, 282 296, 258 324
                 C 232 352, 198 368, 170 376
                 C 142 368, 108 352, 82 324
                 C 58 296, 44 258, 40 212
                 C 38 182, 44 150, 58 122 Z
                 M66 168 L140 158 L148 190 L72 196 Z
                 M274 168 L200 158 L192 190 L268 196 Z
                 M96 252 L170 284 L244 252
                 C 250 294, 234 328, 202 354
                 C 186 366, 176 370, 170 372
                 C 164 370, 154 366, 138 354
                 C 106 328, 90 294, 96 252 Z" />'''
pat = re.compile(r'<symbol id="art-cowl" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="art-cowl" viewBox="0 0 340 386" fill-rule="evenodd">%s\n      </symbol>' % cowl, s, count=1)
s = re.sub(r'<svg viewBox="[^"]*" focusable="false"><use href="#art-cowl" /></svg>',
           '<svg viewBox="0 0 340 386" focusable="false"><use href="#art-cowl" /></svg>', s)

# Tumbler: taller nose section so the front wheel sits in the body
# instead of floating ahead of it.
tumbler = '''
        <polygon points="10,178 150,170 206,166 212,122 256,116 292,84 364,80 396,116 452,112 474,96 556,100 584,148 600,196 600,212 10,212" />
        <circle cx="140" cy="196" r="44" />
        <circle cx="470" cy="178" r="64" />'''
pat = re.compile(r'<symbol id="art-tumbler" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="art-tumbler" viewBox="0 0 620 246">%s\n      </symbol>' % tumbler, s, count=1)
s = re.sub(r'<svg viewBox="[^"]*" focusable="false"><use href="#art-tumbler" /></svg>',
           '<svg viewBox="0 0 620 246" focusable="false"><use href="#art-tumbler" /></svg>', s)

io.open(p, 'w', encoding='utf-8').write(s)
print('final pass')
