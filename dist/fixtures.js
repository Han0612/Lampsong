// Profiles share a suspension point at (0,0) and an emitting rim at y=40.
const fixtures={
  tube:{rim:9,metal:['#10120f','#45473d','#0c0e0b']},
  dome:{rim:23,metal:['#2c302c','#93988d','#272c28']},
  vintage:{rim:25,metal:['#35291e','#a68556','#382c21']},
  modern:{rim:26,metal:['#181c1d','#616c70','#14181a']},
  capsule:{rim:12,metal:['#4a4030','#b2a084','#393024']},
  red:{rim:9,metal:['#1d070b','#611c26','#160508']},
  glass:{rim:7,metal:['#202526','#6d7471','#1a1d1c']}
};
if(typeof designerFixtures!=='undefined')Object.assign(fixtures,Object.fromEntries(Object.entries(designerFixtures.profiles).filter(([key])=>['ph5','caravaggio','gubi1965','jazz','disco'].includes(key))));
if(typeof refinedFixtures!=='undefined')Object.assign(fixtures,refinedFixtures.profiles);
if(typeof DiscoBall!=='undefined')fixtures.disco={width:64,rim:1,lensY:32,material:'silver mirror mosaic'};
function drawFixture(ctx,style,grain,pose={}){
  if(style==='disco'&&typeof DiscoBall!=='undefined'){const result=DiscoBall.draw(ctx,pose);if(result)return result;}
  if(typeof refinedFixtures!=='undefined'){const result=refinedFixtures.draw(ctx,style,pose);if(result)return result;}
  if(typeof designerFixtures!=='undefined'){const rendered=designerFixtures.draw(ctx,style,pose);if(rendered)return rendered;}
  if(!Object.hasOwn(fixtures,style))style='tube';
  if(pose.realistic&&typeof realisticFixtures!=='undefined'){
    const rendered=realisticFixtures.draw(ctx,style,pose);if(rendered)return rendered;
  }
  const spec=fixtures[style],width=spec.rim;
  function shell(trace,halfWidth,palette=spec.metal){
    const metal=ctx.createLinearGradient(-halfWidth,0,halfWidth,0);
    for(const [at,color] of [[0,palette[0]],[.28,palette[1]],[.46,palette[1]],[1,palette[2]]])metal.addColorStop(at,color);
    ctx.beginPath();trace();ctx.fillStyle=metal;ctx.fill();
    if(grain){ctx.save();ctx.clip();ctx.globalAlpha=.28;ctx.globalCompositeOperation='soft-light';
      ctx.drawImage(grain,-halfWidth,-4,halfWidth*2,46);ctx.restore();}
    ctx.strokeStyle='#ffffff21';ctx.lineWidth=.6;ctx.stroke();
  }
  function collar(w,y,h,palette){
    shell(()=>ctx.roundRect(-w,y,2*w,h,Math.min(2,h/2)),w,palette);
  }
  collar(2.5,-5,8);
  if(style==='tube')collar(11,-2,44);
  if(style==='dome'){
    collar(4,2,13);
    shell(()=>{ctx.moveTo(-24,39);ctx.bezierCurveTo(-24,23,-15,13,0,13);
      ctx.bezierCurveTo(15,13,24,23,24,39);ctx.closePath();},24);
  }
  if(style==='vintage'){
    collar(5,1,9);collar(7,9,5);
    shell(()=>{ctx.moveTo(-7,13);ctx.bezierCurveTo(-8,24,-15,30,-26,36);
      ctx.lineTo(-25,40);ctx.lineTo(25,40);ctx.lineTo(26,36);
      ctx.bezierCurveTo(15,30,8,24,7,13);ctx.closePath();},26);
    collar(25,37,3);
  }
  if(style==='modern'){
    collar(2,0,27);collar(5,25,6);
    shell(()=>{ctx.moveTo(-5,29);ctx.bezierCurveTo(-9,32,-23,33,-28,36);
      ctx.quadraticCurveTo(-27,39,-23,40);ctx.lineTo(23,40);
      ctx.quadraticCurveTo(27,39,28,36);ctx.bezierCurveTo(23,33,9,32,5,29);ctx.closePath();},28);
  }
  if(style==='capsule'){
    shell(()=>{ctx.moveTo(-13,39);ctx.lineTo(-13,18);ctx.bezierCurveTo(-13,-3,13,-3,13,18);ctx.lineTo(13,39);ctx.closePath();},13);
  }
  if(style==='red'){
    collar(1.7,-3,21,['#30271b','#88734d','#221c15']);
    shell(()=>{ctx.moveTo(-39,33);ctx.bezierCurveTo(-34,8,32,8,39,33);ctx.quadraticCurveTo(0,41,-39,33);ctx.closePath();},39);
    ctx.fillStyle='#20080c';ctx.beginPath();ctx.ellipse(0,34,39,3.6,0,0,Math.PI*2);ctx.fill();
    collar(10,34,6,['#544025','#b09a65','#392b1c']);
  }
  if(style==='glass'){
    ctx.save();ctx.globalAlpha=.56;
    shell(()=>{ctx.moveTo(-22,37);ctx.bezierCurveTo(-27,23,-23,8,-9,7);ctx.lineTo(9,7);ctx.bezierCurveTo(23,8,27,23,22,37);ctx.quadraticCurveTo(0,43,-22,37);},25);
    ctx.restore();collar(8,22,10,['#837b66','#d6c9a5','#807660']);
    ctx.strokeStyle='#c3b69655';ctx.beginPath();ctx.ellipse(0,38,21,3,0,0,Math.PI*2);ctx.stroke();
    return {rim:7,lensY:32};
  }
  return {rim:width,lensY:40};
}

// One emission path shared by the scene and the comparison page. Realistic
// textures own their diffuser; adding a generic ellipse creates a second base.
function drawFixtureLight(ctx,fixture,{color='#deca9b',power=1,hover=false,texture=null}={}){
  if(fixture.integratedLight)return;
  const {rim,lensY}=fixture;
  ctx.save();
  ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=hover?16:9;
  ctx.beginPath();ctx.ellipse(0,lensY,rim,2.4,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  if(texture){ctx.save();ctx.clip();ctx.globalAlpha=.25*power;ctx.drawImage(texture,-rim,lensY-2.5,2*rim,5);ctx.restore();}
  ctx.fillStyle='#fff6d5';ctx.globalAlpha=.75*power;
  ctx.beginPath();ctx.ellipse(0,lensY,rim*.72,1.1,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
