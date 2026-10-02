"""Build portable logo paths from the bundled OFL Lilita One font. Requires fontTools."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
root=Path(__file__).resolve().parents[1]
font=TTFont(root/'public/fonts/lilita-one-latin-400-normal.woff2')
glyphs=font.getGlyphSet();cmap=font.getBestCmap();upem=font['head'].unitsPerEm

def text_paths(text,x,y,size):
 scale=size/upem;paths=[];cursor=0
 for ch in text:
  name=cmap[ord(ch)];pen=SVGPathPen(glyphs);glyphs[name].draw(pen)
  paths.append(f'<path transform="translate({x+cursor*scale:.3f} {y}) scale({scale:.5f} {-scale:.5f})" d="{pen.getCommands()}"/>')
  cursor += glyphs[name].width
 return ''.join(paths)
for variant,color in [('dark','#fff2cb'),('light','#14344c')]:
 content=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 260" role="img" aria-labelledby="title"><title id="title">Rider Millionaire: Idle Tycoon</title><defs><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#fff0a3"/><stop offset="1" stop-color="#ecb23d"/></linearGradient></defs><g stroke="#193c54" stroke-width="3" stroke-linejoin="round"><path d="M36 188h48v-51H36Z" fill="#89d9df"/><path d="M87 188h48V98H87Z" fill="#5cb4d0"/><path d="M138 188h48V52h-48Z" fill="#83d1e5"/><circle cx="86" cy="92" r="56" fill="url(#gold)"/><circle cx="86" cy="92" r="43" fill="none" stroke="#fff1b8" stroke-width="4"/><path d="m86 59 10 22 24 3-17 17 4 24-21-12-21 12 4-24-17-17 24-3Z" fill="#ca9133" stroke="none"/></g><g fill="{color}">{text_paths('RIDER',222,90,75)}</g><g fill="url(#gold)" stroke="#17354b" stroke-width=".6">{text_paths('MILLIONAIRE',217,186,79)}</g><g fill="{color}">{text_paths('IDLE TYCOON',225,231,26)}</g></svg>'''
 (root/f'public/brand/logo-{variant}.svg').write_text(content+'\n')
p=root/'public/icon.svg';s=p.read_text();a=s.index('<path d="M61');s=s[:a]+'<path d="m49 22 6 12 13 2-10 9 3 13-12-6-12 6 3-13-10-9 13-2Z" fill="#a77728"/></svg>\n';p.write_text(s)
