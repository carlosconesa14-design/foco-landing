"""Derive crop metadata for the original three-pose atlas (no pixel edits)."""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np
import json
root=Path(__file__).resolve().parents[1];im=Image.open(root/'public/sprites/source/dubai-walk.png')
roles=['mechanic','valet','butler','guide','goldsmith','builder'];ys=[0,313,599,887];frames={}
for row in range(3):
 for col,role in enumerate(roles):
  x0=round(col*im.width/6);x1=round((col+1)*im.width/6);y0,y1=ys[row:row+2]
  mask=np.asarray(im.getchannel('A').crop((x0,y0,x1,y1)))>24
  labels,n=ndimage.label(ndimage.binary_dilation(mask,iterations=2));counts=np.bincount(labels.ravel());counts[0]=0
  yy,xx=np.where((labels==counts.argmax())&mask)
  frames[f'ch_{role}_{row}']={'x':x0+int(xx.min()),'y':y0+int(yy.min()),'w':int(xx.max()-xx.min()+1),'h':int(yy.max()-yy.min()+1)}
(root/'public/sprites/source/dubai-walk.json').write_text(json.dumps(frames,indent=2)+'\n')
