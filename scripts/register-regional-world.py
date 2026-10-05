"""Metadata only: identify separate source objects; never paint or edit pixels."""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage
import json
root=Path(__file__).resolve().parents[1]
families=[('business-districts',4,['district_'+n for n in ['technology','foodcourt','beachfront','marina','residential','financial','dealership','hotelfront','desertcamp','market','construction','coastalplaza']]),('regional-mechanics',5,['veh_excursion','prop_sold','ch_vip_client','ch_jeweler','ch_foodie','ch_inspector','prop_dj','ch_photographer','prop_mining','prop_blueprints'])]
for file,cols,keys in families:
 a=np.asarray(Image.open(root/f'public/sprites/source/{file}.png').getchannel('A'))>24
 labels,n=ndimage.label(a);counts=np.bincount(labels.ravel());counts[0]=0
 objects=[]
 for i in np.argsort(counts)[-len(keys):]:
  yy,xx=np.where(labels==i)
  objects.append({'left':int(xx.min()),'top':int(yy.min()),'width':int(xx.max()-xx.min()+1),'height':int(yy.max()-yy.min()+1)})
 objects.sort(key=lambda f:f['top']+f['height']/2)
 ordered=[]
 for row in range(len(keys)//cols):ordered+=sorted(objects[row*cols:(row+1)*cols],key=lambda f:f['left']+f['width']/2)
 frames=dict(zip(keys,ordered))
 if file=='business-districts':
  im=Image.open(root/'public/sprites/source/district-financial-clean.png');yy,xx=np.where(np.asarray(im.getchannel('A'))>24)
  frames['district_financial']={'source':'district-financial-clean.png','left':int(xx.min()),'top':int(yy.min()),'width':int(xx.max()-xx.min()+1),'height':int(yy.max()-yy.min()+1)}
 (root/f'public/sprites/source/{file}.json').write_text(json.dumps(frames,indent=2)+'\n')
 print(file,len(ordered),'source crops registered')
