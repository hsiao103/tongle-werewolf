#!/usr/bin/env python3
"""由 assets-src/original 的原始組合圖裁切並輸出 assets/forest 的 WebP（不覆寫原圖）。
用法：python3 tools/make-forest-art.py   需要 pillow、numpy、scipy"""
import numpy as np, os
from PIL import Image
from scipy import ndimage as ndi
O='assets-src/original/forest/'; OUT='assets/forest/'
def bbox(im,region,thr=236):
    x0,y0,x1,y1=region;a=np.array(im.convert('RGB')).astype(int)[y0:y1,x0:x1]
    nw=a.min(axis=2)<thr;ys=np.where(nw.sum(axis=1)>8)[0];xs=np.where(nw.sum(axis=0)>8)[0]
    return (x0+int(xs[0]),y0+int(ys[0]),x0+int(xs[-1])+1,y0+int(ys[-1])+1)
def tile(sheet,region,out,width,q=84):
    src=Image.open(O+sheet).convert('RGB');box=bbox(src,region);im=src.crop(box)
    white=np.array(im).astype(int).min(axis=2)>=236
    lab,_=ndi.label(white);edge=set(lab[0,:])|set(lab[-1,:])|set(lab[:,0])|set(lab[:,-1]);edge.discard(0)
    bg=ndi.binary_dilation(np.isin(lab,list(edge)),iterations=1)
    alpha=ndi.gaussian_filter((~bg).astype(float),0.8)
    img=Image.fromarray(np.dstack([np.array(im),(alpha*255).astype(np.uint8)]).astype(np.uint8),'RGBA')
    img=img.resize((width,round(width*img.height/img.width)),Image.LANCZOS)
    os.makedirs(os.path.dirname(OUT+out),exist_ok=True);img.save(OUT+out,'WEBP',quality=q,method=6)
    print(out,box,img.size,os.path.getsize(OUT+out)//1024,'KB')
R='cards/roles-sheet.png';S='cards/skills-sheet.png'
tile(R,(250,0,772,490),'cards/role-villager.webp',480)
tile(R,(772,0,1300,490),'cards/role-wolf.webp',480)
tile(R,(0,490,516,1024),'cards/role-seer.webp',480)
tile(R,(516,490,1020,1024),'cards/role-witch.webp',480)
# role-hunter（護衛犬）暫不輸出：現有美術是彈弓獵人，待補繪「護衛犬」
tile(S,(0,0,630,625),'cards/skill-peek.webp',256)
tile(S,(630,0,1254,625),'cards/skill-save.webp',256)
tile(S,(0,630,630,1254),'cards/skill-mute.webp',256)
tile(S,(630,630,1254,1254),'cards/skill-blur.webp',256)
def band(sheet,box,out,q=72):
    im=Image.open(O+sheet).convert('RGB').crop(box);im.save(OUT+out,'WEBP',quality=q,method=6);print(out,box,im.size,os.path.getsize(OUT+out)//1024,'KB')
band('backgrounds/night-dawn-sheet.png',(0,0,1672,466),'backgrounds/bg-night.webp')
band('backgrounds/night-dawn-sheet.png',(0,472,1672,941),'backgrounds/bg-dawn.webp')
band('backgrounds/forest-cover.png',(0,0,1672,941),'backgrounds/bg-cover.webp')
