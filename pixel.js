const INK='#57445e';
const palettes=['#f5bccf','#d5c6f3','#c4e3f4','#f9e6a6','#cbe7d7','#f6c4a5','#fff2d8'];
export const colours=palettes;
const blend=(hex,t)=>{const n=parseInt(hex.slice(1),16),a=[n>>16,(n>>8)&255,n&255];return '#'+a.map(v=>Math.round(t>0?v+(255-v)*t:v*(1+t)).toString(16).padStart(2,'0')).join('');};
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h)}
function heart(c,x,y,col,s=1){[[1,0,2,1],[4,0,2,1],[0,1,7,2],[1,3,5,1],[2,4,3,1],[3,5,1,1]].forEach(a=>rect(c,x+a[0]*s,y+a[1]*s,a[2]*s,a[3]*s,col))}
function star(c,x,y,col,s=1){rect(c,x+2*s,y,s,5*s,col);rect(c,x,y+2*s,5*s,s,col);rect(c,x+s,y+s,3*s,3*s,col)}
function rounded(c,x,y,w,h,col,r=3){rect(c,x+r,y,w-r*2,h,col);rect(c,x,y+r,w,h-r*2,col);rect(c,x+1,y+1,w-2,h-2,col)}
function circle(c,x,y,rx,ry,col){for(let yy=-ry;yy<=ry;yy++){let wid=Math.floor(rx*Math.sqrt(Math.max(0,1-yy*yy/(ry*ry))));rect(c,x-wid,y+yy,wid*2+1,1,col)}}
function mask(shape,x,y){switch(shape){case'peach':return ((x+8)**2/260+(y+1)**2/300<1)||((x-8)**2/260+(y+1)**2/300<1);case'bear':return x*x/420+(y-3)**2/360<1||((x+15)**2+(y+15)**2<64)||((x-15)**2+(y+15)**2<64);case'cloud':return Math.abs(y-6)<10&&Math.abs(x)<24||((x+13)**2+(y+2)**2<140)||((x-3)**2+(y+8)**2<170)||((x-17)**2+(y+1)**2<100);case'gamepad':return Math.abs(x)<26&&Math.abs(y)<12||Math.abs(x)>15&&Math.abs(x)<26&&y>=10&&y<17;case'milk':return Math.abs(x)<25&&Math.abs(y)<15&&!(Math.abs(x)>22&&Math.abs(y)>12);case'star':{let r=Math.hypot(x,y),a=Math.atan2(y,x)+Math.PI/2;return r<18+7*Math.cos(a*5)}case'heart':return x*x/410+(y+5)**2/180<1&&y<1||Math.abs(x)<22-y*.9&&y>=0&&y<24;case'bubble':return x*x/650+y*y/370<1;case'jar':return Math.abs(x)<24&&y>-13&&y<22||Math.abs(x)<20&&y>=-20&&y<=-13;default:return x*x+y*y<400}}
export function drawToy(target,d,{background=true,squish=0,mini=false}={}){
 const c=target.getContext('2d');c.clearRect(0,0,target.width,target.height);c.imageSmoothingEnabled=false;
 const off=document.createElement('canvas');off.width=128;off.height=96;const p=off.getContext('2d');p.imageSmoothingEnabled=false;
 if(background){rect(p,0,0,128,96,d.type==='slime'?'#e6f3ef':'#f0e9f8');for(let x=0;x<128;x+=8)rect(p,x,0,1,96,'#ffffff55');for(let y=0;y<96;y+=8)rect(p,0,y,128,1,'#ffffff55');star(p,18,17,'#d5c6f3');star(p,108,26,'#f5bccf');star(p,25,64,'#f9e6a6');}
 const scale=d.size==='large'?1.12:d.size==='small'?.9:1;
 p.save();p.translate(64,48);p.scale(scale*(1+squish*.28),scale*(1-squish*.3));
 circle(p,1,28,29,3,'#c9b9d155');
 for(let y=-25;y<25;y++)for(let x=-29;x<29;x++)if(mask(d.shape,x,y)){
  let edge=!mask(d.shape,x-1,y)||!mask(d.shape,x+1,y)||!mask(d.shape,x,y-1)||!mask(d.shape,x,y+1);
  let col=d.color;
  if(d.pattern==='split'&&x>0)col=d.accent;
  if(d.pattern==='stripes'&&Math.floor((x+y)/7)%2===0)col=d.accent;
  if(d.pattern==='dots'&&(x+30)%10<3&&(y+30)%10<3)col=d.accent;
  col=edge?INK:(y>13?blend(col,-.08):x<-9&&y<-4?blend(col,.22):col);
  rect(p,x,y,1,1,col);
 }
 if(d.shape==='peach'){rect(p,-1,-21,2,9,INK);rect(p,1,-25,11,4,'#93bca5');rect(p,1,-24,7,6,'#a6ccb2');rect(p,0,-14,1,19,blend(d.color,-.15));}
 if(d.shape==='milk'){rect(p,-23,-12,46,6,d.accent);rect(p,-23,-6,46,1,INK);rect(p,10,-7,3,5,INK);rect(p,11,-6,1,2,'#fff9f0');}
 if(d.shape==='gamepad'){rect(p,-17,-3,10,3,INK);rect(p,-13,-7,3,11,INK);rect(p,13,-5,4,4,d.accent);rect(p,18,1,4,4,INK);rect(p,-2,10,4,2,INK);}
 if(d.type==='slime'){
  if(d.shape==='jar'){rect(p,-25,-20,50,5,INK);rect(p,-23,-20,46,3,d.accent);rect(p,-22,-11,2,23,blend(d.color,.6));rect(p,-18,-8,2,12,'#ffffff80');}
  if(d.texture==='cloud'){for(let i=0;i<13;i++){let x=(i*19%38)-18,y=(i*13%26)-11;if(mask(d.shape,x,y))circle(p,x,y,3,2,blend(d.color,.45));}}
  if(d.texture==='crunchy'){for(let i=0;i<25;i++){let x=(i*17%44)-22,y=(i*23%32)-16;if(mask(d.shape,x,y))rect(p,x,y,2,2,d.accent);}}
  if(d.texture==='clear'){rect(p,-14,-9,3,12,'#ffffffaa');rect(p,-9,-12,2,3,'#ffffffaa');}
 }
 if(d.face!=='none'&&d.shape!=='gamepad'){
  const ey=d.shape==='jar'?3:1;
  if(d.face==='sleepy'){rect(p,-9,ey,4,1,INK);rect(p,6,ey,4,1,INK)}else{rect(p,-8,ey,2,3,INK);rect(p,7,ey,2,3,INK)}
  rect(p,-1,ey+6,3,1,INK);rect(p,-2,ey+5,1,1,INK);rect(p,2,ey+5,1,1,INK);
  if(d.face==='blush'){rect(p,-14,ey+5,5,2,'#d98eae');rect(p,11,ey+5,5,2,'#d98eae')}
 }
 if(d.garnish==='stars'){star(p,-15,-11,d.accent);star(p,11,12,d.accent)}
 if(d.garnish==='hearts'){heart(p,8,-12,d.accent);heart(p,-16,11,d.accent)}
 if(d.garnish==='sprinkles'){for(let i=0;i<14;i++){let x=(i*13%34)-17,y=(i*17%25)-13;if(Math.abs(y)<8&&Math.abs(x)<12)continue;rect(p,x,y,3,1,[d.accent,'#fff9f0','#f9e6a6'][i%3])}}
 p.restore();
 c.drawImage(off,0,0,target.width,target.height);
}
export function drawRoom(target){
 const c=target.getContext('2d'),o=document.createElement('canvas');o.width=160;o.height=125;const p=o.getContext('2d');
 rect(p,0,0,160,125,'#efdfed');for(let x=0;x<160;x+=20)rect(p,x,0,1,91,'#e3cfe3');rect(p,0,91,160,34,'#d9c4db');for(let y=96;y<125;y+=9)rect(p,0,y,160,1,'#cdb4d2');
 // Window, clouds and gingham curtains.
 rect(p,18,12,52,54,INK);rect(p,21,15,46,48,'#bddcee');rect(p,23,17,42,43,'#d4e8f3');rect(p,42,15,3,48,INK);rect(p,21,39,46,3,INK);rect(p,14,64,61,4,'#ad8faa');
 rect(p,16,10,8,51,'#e8a8c1');rect(p,65,10,8,51,'#e8a8c1');for(let y=12;y<61;y+=7){rect(p,16,y,8,2,'#f7ccda');rect(p,65,y,8,2,'#f7ccda')}
 rounded(p,28,25,12,4,'#fff9f0',2);rounded(p,48,48,11,5,'#fff9f0',2);rect(p,33,23,5,2,'#fff9f0');
 // Childhood noticeboard with little notes and stickers.
 rect(p,91,13,50,40,INK);rect(p,94,16,44,34,'#d7b8aa');rect(p,98,21,15,19,'#fff3c9');rect(p,121,23,12,16,'#d5c6f3');rect(p,103,20,4,2,'#c4e3f4');rect(p,124,22,4,2,'#f5bccf');star(p,102,27,'#b88bb2');heart(p,124,28,'#a87da2');rect(p,104,44,24,3,'#f6e4a8');
 // Desk and drawers.
 rect(p,8,76,145,6,INK);rect(p,11,76,139,3,'#e9c9ad');rect(p,15,82,5,35,'#ae8b9e');rect(p,141,82,5,35,'#ae8b9e');rect(p,107,82,34,27,INK);rect(p,109,84,30,10,'#e7c2c6');rect(p,109,97,30,10,'#e7c2c6');rect(p,121,88,6,2,INK);rect(p,121,101,6,2,INK);
 // Books and pencil cup.
 rect(p,14,70,27,5,'#8a759c');rect(p,16,65,24,5,'#cbe7d7');rect(p,13,61,28,4,'#fff1bf');rect(p,18,66,2,3,'#9db7a8');rect(p,128,59,12,17,INK);rect(p,130,61,8,13,'#c4e3f4');rect(p,130,49,2,16,'#f5bccf');rect(p,135,46,2,18,'#f9e6a6');rect(p,139,51,2,10,'#9d82bc');
 // Mini CRT / handheld console.
 rounded(p,80,52,29,21,INK,2);rect(p,83,55,23,12,'#b7d3d0');rect(p,86,57,17,8,'#73979c');star(p,92,58,'#d9eda7');rect(p,84,69,6,1,'#cdb6db');rect(p,100,69,3,2,'#f5bccf');rect(p,89,74,12,2,INK);
 // Squishy mascot, headphones and sticker book.
 circle(p,59,62,12,11,INK);circle(p,59,61,11,10,'#f5bccf');rect(p,52,60,2,2,INK);rect(p,63,60,2,2,INK);rect(p,57,65,4,1,INK);rect(p,47,64,4,2,'#dc91b2');rect(p,66,64,4,2,'#dc91b2');rect(p,58,49,2,5,INK);rect(p,60,48,7,3,'#a3c8ad');
 rect(p,33,101,43,5,INK);rect(p,35,96,38,7,'#c4e3f4');rect(p,39,93,30,3,'#f2cfdf');star(p,49,96,'#aa89be');
 // Small floor cushions.
 rounded(p,81,109,20,9,'#a78fbb',3);rounded(p,83,107,16,8,'#d5c6f3',3);rect(p,47,83,18,3,'#af8fa9');rect(p,52,86,8,16,'#af8fa9');
 star(p,78,17,'#c5a3ca');star(p,149,64,'#f9e6a6');heart(p,3,37,'#d5b4d6');
 c.imageSmoothingEnabled=false;c.drawImage(o,0,0,target.width,target.height);
}
