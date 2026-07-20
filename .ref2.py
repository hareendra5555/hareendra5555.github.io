import io, re
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# ── Arkham emblem. The read depends on the inner scoop: leaving the head
#    the top edge runs almost flat before sweeping up to the peak, which
#    carves the crescent of white. A domed curve there looks like a moth.
arkham = '''
        <path d="M0 246
                 C 92 84, 196 6, 273 4
                 C 340 2, 414 62, 446 152
                 L 460 40 L 500 104 L 540 40 L 554 152
                 C 586 62, 660 2, 727 4
                 C 804 6, 908 84, 1000 246
                 C 950 292, 880 296, 850 330
                 L 785 292
                 C 730 328, 640 344, 590 374
                 C 548 398, 520 408, 500 430
                 C 480 408, 452 398, 410 374
                 C 360 344, 270 328, 215 292
                 L 150 330
                 C 120 296, 50 292, 0 246 Z" />'''
pat = re.compile(r'<symbol id="bat-arkham" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="bat-arkham" viewBox="0 0 1000 430">%s\n      </symbol>' % arkham, s, count=1)

# ── Cowl: wider dome, smaller face opening set in the lower third.
cowl = '''
        <path d="M86 6 L116 100
                 C 138 74, 202 74, 224 100
                 L 234 6 L 226 110
                 C 246 132, 256 162, 254 196
                 C 252 240, 244 276, 224 308
                 C 206 336, 182 354, 160 362
                 C 138 354, 114 336, 96 308
                 C 76 276, 68 240, 66 196
                 C 64 162, 74 132, 94 110 Z
                 M86 152 L140 144 L146 172 L90 176 Z
                 M234 152 L180 144 L174 172 L230 176 Z
                 M118 232 L160 258 L202 232
                 C 206 268, 198 296, 184 316
                 C 174 330, 166 338, 160 342
                 C 154 338, 146 330, 136 316
                 C 122 296, 114 268, 118 232 Z" />'''
pat = re.compile(r'<symbol id="art-cowl" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="art-cowl" viewBox="0 0 320 370" fill-rule="evenodd">%s\n      </symbol>' % cowl, s, count=1)

# ── Tumbler from the blueprint: long flat low nose, a hard vertical step
#    up to a raised cockpit box, blocky rear. The step is the signature.
tumbler = '''
        <polygon points="8,196 150,184 202,180 208,130 252,122 288,86 360,82 392,120 452,116 472,100 556,104 582,152 598,202 598,214 8,214" />
        <circle cx="126" cy="188" r="56" />
        <circle cx="480" cy="180" r="64" />'''
pat = re.compile(r'<symbol id="art-tumbler" viewBox="[^"]*"[^>]*>.*?</symbol>', re.S)
assert pat.search(s)
s = pat.sub('<symbol id="art-tumbler" viewBox="0 0 620 250">%s\n      </symbol>' % tumbler, s, count=1)
s = re.sub(r'<svg viewBox="[^"]*" focusable="false"><use href="#art-tumbler" /></svg>',
           '<svg viewBox="0 0 620 250" focusable="false"><use href="#art-tumbler" /></svg>', s)

io.open(p, 'w', encoding='utf-8').write(s)
print('refined all three')
