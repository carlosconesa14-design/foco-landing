"""Crop metadata for the original Miami pose sheets; requires Pillow/NumPy/SciPy.
Sources stay unchanged. Exports use canonical 132x180 canvases like Madrid/Dubai.
"""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np
import json
root=Path(__file__).resolve().parents[1]
families={'miami-walk-a':['taquero','skater','vendor','bartender','promoter','captain'],'miami-walk-b':['sailor','agent','broker','clerk','coder','trader']}
for file,roles in families.items():
 im=Image.open(root/f'public/sprites/source/{file}.png');alpha=np.asarray(im.getchannel('A'))>24
 density=alpha.sum(axis=1);ys=[0]
 for n in [1,2]:
  center=round(n*im.height/3);radius=round(im.height/3*.16);lo,hi=center-radius,center+radius
  valley=np.flatnonzero(density[lo:hi]==density[lo:hi].min())+lo
  ys.append(int(valley[np.argmin(abs(valley-center))]))
 ys.append(im.height);frames={}
 for row in range(3):
  for col,role in enumerate(roles):
   x0=round(col*im.width/6);x1=round((col+1)*im.width/6);y0,y1=ys[row:row+2];mask=alpha[y0:y1,x0:x1]
   labels,n=ndimage.label(ndimage.binary_dilation(mask,iterations=2));counts=np.bincount(labels.ravel());counts[0]=0
   yy,xx=np.where((labels==counts.argmax())&mask)
   frames[f'ch_{role}_{row}']={'x':x0+int(xx.min()),'y':y0+int(yy.min()),'w':int(xx.max()-xx.min()+1),'h':int(yy.max()-yy.min()+1)}
 (root/f'public/sprites/source/{file}.json').write_text(json.dumps(frames,indent=2)+'\n')
 print(file,im.size,ys)
