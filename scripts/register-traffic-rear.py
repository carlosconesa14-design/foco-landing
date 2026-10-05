"""Metadata only: register the 15 isolated vehicle silhouettes; never paint pixels."""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np
import json
root=Path(__file__).resolve().parents[1]
source=root/'public/sprites/source'
keys=['car_0','car_1','car_2','car_3','van','car_miami_0','car_miami_1','luxcar_deliverybike','luxcar_scooter','luxcar_motorbike','luxcar_sportscar','luxcar_supercar','luxcar_limo','luxcar_goldcar','luxcar_hearse']
a=np.asarray(Image.open(source/'traffic-rear.png').getchannel('A'))>128
labels,n=ndimage.label(a)
counts=np.bincount(labels.ravel());counts[0]=0
objects=[]
for i in np.argsort(counts)[-15:]:
 y,x=np.where(labels==i)
 objects.append({'left':int(x.min()),'top':int(y.min()),'width':int(x.max()-x.min()+1),'height':int(y.max()-y.min()+1)})
objects.sort(key=lambda f:f['top']+f['height']/2)
ordered=[]
for row in range(3):ordered+=sorted(objects[row*5:row*5+5],key=lambda f:f['left'])
(source/'traffic-rear.json').write_text(json.dumps(dict(zip(keys,ordered)),indent=2)+'\n')
print('15 source crops registered')
