#!/usr/bin/env python3
"""strip.py in.js out.js : remove comments and indentation from a JS file.
Strings, template literals (with ${} nesting) and regex literals are copied untouched.
Line breaks are kept (one per code line) so automatic semicolon insertion behaves exactly as before."""
import sys, re

KW_BEFORE_REGEX = {'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await'}

def strip(src):
    out = []
    i, n = 0, len(src)
    last = ''          # last significant token kind/text, to tell regex from division
    tmpl = []          # stack of brace depths for template literal ${ } nesting
    depth = 0
    def regex_ok():
        if not last: return True
        if last in KW_BEFORE_REGEX: return True
        if re.match(r'[A-Za-z0-9_$\u0080-￿]', last[-1]): return False
        if last[-1] in ')]': return False
        if last == '}': return True   # block end (an object literal followed by / never happens in this code)
        return True
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2)
            if j < 0: raise ValueError('unterminated block comment at %d' % i)
            seg = src[i:j + 2]
            i = j + 2
            out.append('\n' if '\n' in seg else ' ')
            continue
        if c in '"\'':
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == '\\': j += 1
                elif src[j] == '\n': raise ValueError('newline in string at %d' % i)
                j += 1
            out.append(src[i:j + 1]); i = j + 1; last = 'str'; continue
        if c == '`' or (c == '}' and tmpl and tmpl[-1] == depth):
            if c == '}': tmpl.pop()
            j = i + 1
            while j < n:
                if src[j] == '\\': j += 2; continue
                if src[j] == '`': j += 1; break
                if src[j] == '$' and j + 1 < n and src[j + 1] == '{':
                    j += 2; tmpl.append(depth); break
                j += 1
            out.append(src[i:j]); i = j; last = 'str' if src[j - 1] == '`' else '{'; continue
        if c == '/' and regex_ok():
            j = i + 1; cls = False
            while j < n:
                d = src[j]
                if d == '\\': j += 2; continue
                if d == '\n': raise ValueError('newline in regex at %d: %r' % (i, src[i:i + 60]))
                if d == '[': cls = True
                elif d == ']': cls = False
                elif d == '/' and not cls: break
                j += 1
            j += 1
            while j < n and re.match(r'[a-z]', src[j]): j += 1
            out.append(src[i:j]); i = j; last = 're'; continue
        if c == '{': depth += 1
        elif c == '}': depth -= 1
        if c.isspace():
            out.append('\n' if c == '\n' else ' '); i += 1; continue
        m = re.match(r'[A-Za-z0-9_$\u0080-￿.]+', src[i:i + 200])
        if m:
            out.append(m.group(0)); i += len(m.group(0)); last = m.group(0); continue
        out.append(c); i += 1; last = c
    # join the pieces, dropping spaces that separate nothing (kept between two word characters, and where
    # two operator characters would otherwise fuse: a + +b, a - -b, a / /re/)
    res = []; pend = False
    W = re.compile(r'[A-Za-z0-9_$\u0080-\uffff]')
    for p in out:
        if p == ' ': pend = True; continue
        if p == '\n': res.append('\n'); pend = False; continue
        if pend and res and res[-1] and res[-1] != '\n':
            a, b = res[-1][-1], p[0]
            if (W.match(a) and W.match(b)) or (a in '+-' and b == a) or (a == '/' and b in '/*') or (a == '.' and b.isdigit()) or (a.isdigit() and b == '.'):
                res.append(' ')
        pend = False; res.append(p)
    s = ''.join(res)
    lines = [l.strip() for l in s.split('\n')]
    return '\n'.join(l for l in lines if l) + '\n'

if __name__ == '__main__':
    a, b = sys.argv[1], sys.argv[2]
    s = open(a, encoding='utf-8').read()
    r = strip(s)
    open(b, 'w', encoding='utf-8').write(r)
    print('%s: %d -> %d bytes (%.0f%%)' % (a, len(s.encode()), len(r.encode()), 100 * len(r.encode()) / len(s.encode())))
