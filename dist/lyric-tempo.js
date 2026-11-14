// Integrate velocity, rather than rescaling elapsed time when tempo changes.
class LyricTempo {
  constructor(){this.rate=1;}
  advance(dt,{enabled=true,speed=100,follow=true,playing=false,bpm=90,beat=0,reduced=false}={}){
    const baseline=enabled&&!reduced?speed/100:1;
    const music=enabled&&!reduced&&follow&&playing;
    const tempo=Math.max(.72,Math.min(1.45,bpm/90));
    const accent=Math.max(0,Math.min(1,beat));
    const target=baseline*(music?tempo*(.82+.52*accent):1);
    const seconds=Math.max(0,Math.min(.1,dt));
    const tau=music ? .32 : .45,decay=Math.exp(-seconds/tau);
    const delta=target*seconds+(this.rate-target)*tau*(1-decay);
    this.rate=target+(this.rate-target)*decay;
    return delta;
  }
}
