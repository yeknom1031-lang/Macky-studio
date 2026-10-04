"""Deterministic placement of themed fixtures, contact points and stair links."""
import math
import re


def role_place(role):
    n=int(role[1:])
    if n<=20 or 43<=n<=60:return 'shop'
    if n<=36:return 'kitchen'
    if n<=42 or n in [61,62,100,214]:return 'seat'
    if 63<=n<=69:return 'upper'
    if 70<=n<=72:return 'door'
    if 106<=n<=150:return 'workshop'
    if 151<=n<=170:return 'vehicle'
    if 171<=n<=185 or 211<=n<=213:return 'street'
    if 186<=n<=199:return 'performance'
    if n in [209,210,217,218]:return 'play'
    if 221<=n<=224:return 'water'
    if 225<=n<=232:return 'garden'
    if 233<=n<=240:return 'animal'
    return 'open'


def layout(src,navigation,w,h,role_ids,water):
    nav=[list(n[:3])+[n[3] if len(n)>3 else 0] for n in navigation]
    nav=[n[:2]+[list(n[2]),n[3]] for n in nav]
    ground=list(range(len(nav)))
    def nearest(x,y):return min(ground,key=lambda i:(nav[i][0]-x)**2+(nav[i][1]-y)**2)
    anchors=[(.16,.32),(.49,.32),(.82,.32),(.16,.67),(.49,.67),(.82,.67),(.37,.84),(.71,.84)]
    zones=src['zones'].split('|');fixtures=[]
    for k,(x,y) in enumerate(anchors):
        node=nearest(x*w,y*h);nx,ny=nav[node][:2]
        # Set each freestanding fixture beside its approach, retaining a clear lane.
        fixtures.append(dict(id=k,x=nx,y=ny-20,index=k,height=150,name=zones[k],node=node))
    sites=[];slots=[0]*8
    upper=next((k for k,z in enumerate(zones) if re.search(r'2階|バルコニー|回廊|管制室',z)),3)
    water_node=None
    if water:
        water_node=min(ground,key=lambda n:min((nav[n][0]-p[0])**2+(nav[n][1]-p[1])**2 for p in water))
    for k,role in enumerate(role_ids):
        kind=role_place(role)
        if kind in ['open','street','performance','vehicle']:continue
        preferred={'shop':'店|市場|屋台|売|受付|窓口','kitchen':'食|カフェ|茶|厨房|屋台','garden':'庭|畑|園|温室','animal':'動物|牧|休憩','water':'水|川|海|池|船|橋','workshop':'工房|整備|修理|研究|実験','seat':'休憩|公園|カフェ|広場|食','door':'入口|玄関|門'}
        candidates=[j for j,z in enumerate(zones) if re.search(preferred.get(kind,r'(?!)'),z)]
        fixture=upper if kind=='upper' else min(candidates or list(range(8)),key=lambda j:slots[j])
        f=fixtures[fixture];slot=slots[fixture];slots[fixture]+=1
        offset=((slot%3)-1)*35
        x=f['x']+offset;y=f['y']-5+(slot//3)*31;level=0;node=nearest(x,y)
        if kind=='water' and water_node is not None:
            node=nearest(nav[water_node][0]+offset,nav[water_node][1]);x,y=nav[node][:2];facing=1
        else:facing=-1 if offset>0 else 1
        stairs=None
        if kind=='upper':
            level=1;y=f['y']-63;x=f['x']+offset
            bottom=nearest(f['x']+60,f['y']+15);stairs=[bottom];prev=bottom
            # A visible ascent to the matching balcony; no floor teleport on entry/exit.
            bx,by=nav[bottom][:2]
            for j in range(1,9):
                t=j/8;point=[round(bx+(x-bx)*t,2),round(by+(y-by)*t,2),[prev],1 if j>=5 else 0];index=len(nav);nav[prev][2].append(index);nav.append(point);stairs.append(index);prev=index
            node=prev
        sites.append(dict(id=len(sites),x=x,y=y,roles=[role],kind=kind,fixture=fixture,level=level,node=node,entryNode=stairs[0] if stairs else node,stairs=stairs,facing=facing,height=f['height'],name=f['name'],occupant=None,actorX=0,actorY=0))
    # Places for waiting, a conversation and play do not add duplicate scenery.
    for k,f in enumerate(fixtures):
        for kind,dx in [('seat',-58),('play',58)]:
            n=nearest(f['x']+dx,f['y']+42);x,y=nav[n][:2]
            if all(math.hypot(x-a['x'],y-a['y'])>27 for a in sites):sites.append(dict(id=len(sites),x=x,y=y,roles=[],kind=kind,fixture=k,level=0,node=n,entryNode=n,stairs=None,facing=1,height=150,name=f['name'],actorX=0,actorY=0))
    return nav,fixtures,sites
