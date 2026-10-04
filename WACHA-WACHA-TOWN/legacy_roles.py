"""Map accepted legacy drawings to matching locations instead of generic walkers."""
GROUPS={
 1:'bake',7:'flowers bouquet',12:'toy',13:'balloon',14:'ticket',19:'snack',21:'cook crepe pizza waffle',24:'sushi',26:'candy',27:'cottoncandy',28:'icecream',29:'donut',30:'chocolate',31:'drink',33:'tea',34:'picnic',4:'fishbox',5:'vegetables',6:'fruit',8:'books newspaper',9:'hat',11:'antique record jam soap',
 61:'chair sleep',63:'plant',70:'keys',74:'read bookfairy',75:'map',76:'paper calligraphy',77:'knit',78:'sew stitch embroider',79:'bonsai',80:'sweep',82:'prune',88:'umbrella parasol',91:'stretch yoga weights taichi',92:'laces',93:'watch',98:'fan clap sparkle stars',99:'hug',101:'cradle',102:'stroller',103:'roll',104:'cane',
 107:'hammer',109:'paint',111:'pottery',114:'glass',115:'weave',117:'beads',119:'repair robot',120:'earrings',122:'bikefix',124:'wrench',125:'hose',126:'bulb',139:'polish',150:'science inspect',155:'driver',159:'train',162:'captain',163:'pilot rocket',168:'surf',169:'skate rollers',171:'letter suitcase pack bag',176:'knight',180:'teach',182:'vet',
 186:'drum maracas',187:'flute trumpet sax harmonica tuba',188:'violin cello guitar harp shamisen',189:'accordion',190:'xylophone',192:'dance ribbon ballet fairy catdance royal angel monster banana strawberry alien panda tiger rabbit crab bee dinosaur star pumpkin',193:'juggle',194:'top stilts',195:'mime',196:'magic',197:'puppet',198:'easel sketch',199:'carve',200:'photo',203:'bubbles',204:'kite',205:'basketball football rugby tennis badminton tabletennis fencing bowling boomerang beanbag',207:'skip',208:'hoop',214:'boardgame',215:'paperplane origami model',216:'pinwheel rotor remote',217:'firetoy',218:'goldfish',220:'binoculars',226:'seeds',227:'water',230:'rake',231:'bees',234:'fetch',241:'butterfly mushroom',243:'shell',244:'snowman'
}
LOOKUP={word:f'R{n:03}' for n,words in GROUPS.items() for word in words.split()}
def role(character):
 if character.get('animal'):return 'R096'
 special={'EX007':'R021','EX011':'R176','EX012':'R178','EX013':'R221','EX014':'R003','EX015':'R191'}
 return special.get(character['id'],LOOKUP.get(character['action'],'R096'))
