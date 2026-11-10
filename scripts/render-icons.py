"""Dependency-free rasterization of the original SVG logo geometry."""
import math,struct,zlib,pathlib
root=pathlib.Path(__file__).resolve().parent.parent/'src/assets'
colors={'navy':(20,36,59),'cyan':(165,227,255),'white':(237,247,255),'mint':(128,222,196),'coral':(255,147,142)}
def segment(x,y,a,b,width):
 dx,dy=b[0]-a[0],b[1]-a[1]
 if dx==dy==0:return math.hypot(x-a[0],y-a[1])<=width/2
 t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))
 return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=width/2
curve=[(96,57),(96,45)]+[(83+13*math.cos(t),45+13*math.sin(t)) for t in [i*math.pi/24 for i in range(0,-13,-1)]]+[(45,32)]+[(45+13*math.cos(t),45+13*math.sin(t)) for t in [-math.pi/2-i*math.pi/24 for i in range(13)]]+[(32,88)]+[(45+13*math.cos(t),88+13*math.sin(t)) for t in [math.pi-i*math.pi/24 for i in range(13)]]+[(81,101)]
paths=[(curve,7,'cyan'),([(46,26),(46,42)],6,'white'),([(81,26),(81,42)],6,'white'),([(33,54),(95,54)],6,'white'),([(47,71),(72,71)],6,'mint'),([(47,85),(62,85)],6,'mint'),([(91,94),(95,98),(102,90)],3,'navy')]
def pixel(x,y):
 qx=max(abs(x-64)-30,0);qy=max(abs(y-64)-30,0)
 if math.hypot(qx,qy)>30:return (0,0,0,0)
 c=colors['navy']
 for points,width,key in paths[:-1]:
  if any(segment(x,y,a,b,width) for a,b in zip(points,points[1:])):c=colors[key]
 if math.hypot(x-96,y-94)<=13:c=colors['coral']
 points,width,key=paths[-1]
 if any(segment(x,y,a,b,width) for a,b in zip(points,points[1:])):c=colors[key]
 return (*c,255)
def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
for size in [16,32,48,128]:
 samples=3;rows=[]
 for y in range(size):
  row=bytearray([0])
  for x in range(size):
   transform=(lambda v:(v-16)*1.25+4) if size==128 else (lambda v:v*128/size)
   ps=[pixel(transform(x+(sx+.5)/samples),transform(y+(sy+.5)/samples)) for sy in range(samples) for sx in range(samples)]
   alpha=sum(p[3] for p in ps);row.extend([round(sum(p[c]*p[3] for p in ps)/alpha) if alpha else 0 for c in range(3)]+[round(alpha/(samples*samples))])
  rows.append(row)
 data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
 (root/f'icon-{size}.png').write_bytes(data)
print('Generated 16, 32, 48 and 128 pixel logo icons.')
