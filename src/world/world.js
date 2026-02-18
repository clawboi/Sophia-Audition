
// NPC City — World v4 (collision + spacing fixes only)

export class World{
  constructor(){

    this.w = 2400;
    this.h = 1400;

    this.spawns = { actor:{ x:1200, y:700 } };

    this.buildings = [];
    this.solids = [];
    this.doors = [];
    this.landmarks = [];
    this.trees = [];

    // ROADS
    const roadW = 200;

    this.roads = [
      {x:0,y:0,w:this.w,h:roadW},
      {x:0,y:this.h-roadW,w:this.w,h:roadW},
      {x:0,y:0,w:roadW,h:this.h},
      {x:this.w-roadW,y:0,w:roadW,h:this.h},
    ];

    // PARK
    this.park = { x:840, y:440, w:720, h:520 };

    // BUILDINGS (shifted inward so none overlap roads)
    this.addBuilding(820,220,760,170,"south");
    this.addBuilding(820,1010,760,170,"north");
    this.addBuilding(640,440,200,520,"east");

    // management resized + lifted off road
    this.addBuilding(1120,1080,160,100,"north","management");

    // small bottom-left box (payphone/mailbox)
    this.box = {x:240,y:1080,w:60,h:60};
    this.solids.push({x:240,y:1080,w:60,h:60});

    // AMENITIES
    this.pool   = {x:1700,y:460,w:420,h:220};
    this.tennis = {x:1700,y:740,w:420,h:260};

    // fence
    this.fence = {x:1680,y:440,w:460,h:580};
    this.solids.push(
      {x:this.fence.x,y:this.fence.y,w:this.fence.w, h:10},
      {x:this.fence.x,y:this.fence.y+this.fence.h-10,w:this.fence.w, h:10},
      {x:this.fence.x,y:this.fence.y,w:10, h:this.fence.h},
      {x:this.fence.x+this.fence.w-10,y:this.fence.y,w:10, h:this.fence.h}
    );

    // PARKING (no overlap)
    this.parking = {x:480,y:1120,w:1440,h:220};
    this.parkingRoad = {x:480,y:1210,w:1440,h:70};

    // connector road
    this.connector = {x:1100,y:this.h-roadW,w:200,h:220};

    // SIDEWALKS
    this.sidewalks = [
      {x:this.park.x-40,y:this.park.y-40,w:this.park.w+80,h:30},
      {x:this.park.x-40,y:this.park.y+this.park.h+10,w:this.park.w+80,h:30},
      {x:this.park.x-40,y:this.park.y,w:30,h:this.park.h},
      {x:this.park.x+this.park.w+10,y:this.park.y,w:30,h:this.park.h},
    ];

    // TREES
    const spots=[[800,420],[1600,420],[800,1000],[1600,1000]];
    for(const t of spots){
      this.trees.push({x:t[0],y:t[1]});
      this.solids.push({x:t[0]-14,y:t[1]-14,w:28,h:28});
    }

    // WORLD BOUNDS
    this.solids.push({x:-200,y:-200,w:this.w+400,h:200});
    this.solids.push({x:-200,y:this.h,w:this.w+400,h:200});
    this.solids.push({x:-200,y:-200,w:200,h:this.h+400});
    this.solids.push({x:this.w,y:-200,w:200,h:this.h+400});

    // LANDMARKS
    this.landmarks.push({x:1200,y:420,text:"Central Park"});
    this.landmarks.push({x:1780,y:430,text:"Pool"});
    this.landmarks.push({x:1780,y:720,text:"Tennis"});
    this.landmarks.push({x:520,y:1110,text:"Parking"});
    this.landmarks.push({x:1200,y:1040,text:"Management"});
  }

  addBuilding(x,y,w,h,doorSide,type="building"){
    const b={x,y,w,h,type};
    this.buildings.push(b);
    this.solids.push({x:x+6,y:y+6,w:w-12,h:h-12});

    let dx=x+w/2-18;
    let dy=y+h-18;

    if(doorSide==="north") dy=y-18;
    if(doorSide==="south") dy=y+h-6;
    if(doorSide==="east"){ dx=x+w-6; dy=y+h/2-18; }
    if(doorSide==="west"){ dx=x-18; dy=y+h/2-18; }

    this.doors.push({x:dx,y:dy,w:36,h:36,target:type});
  }

  hitsSolid(r){
    for(const s of this.solids){
      if(r.x<s.x+s.w && r.x+r.w>s.x && r.y<s.y+s.h && r.y+r.h>s.y)
        return true;
    }
    return false;
  }

  getSpawn(){ return this.spawns.actor; }

  nearestLandmark(px,py,d=70){
    let best=null,bd=d*d;
    for(const l of this.landmarks){
      const dx=l.x-px, dy=l.y-py;
      const dist=dx*dx+dy*dy;
      if(dist<bd){bd=dist;best=l;}
    }
    return best;
  }

  draw(ctx,cam){

    ctx.fillStyle="#6c8f4e";
    ctx.fillRect(0,0,cam.vw,cam.vh);

    ctx.save();
    ctx.translate(-cam.x,-cam.y);

    // roads
    ctx.fillStyle="#2c2c34";
    for(const r of this.roads) ctx.fillRect(r.x,r.y,r.w,r.h);

    // connector road
    ctx.fillRect(this.connector.x,this.connector.y,this.connector.w,this.connector.h);

    // parking base
    ctx.fillStyle="#3a3a42";
    ctx.fillRect(this.parking.x,this.parking.y,this.parking.w,this.parking.h);

    // parking road strip
    ctx.fillStyle="#2c2c34";
    ctx.fillRect(this.parkingRoad.x,this.parkingRoad.y,this.parkingRoad.w,this.parkingRoad.h);

    // sidewalks
    ctx.fillStyle="#bdb6a8";
    for(const s of this.sidewalks) ctx.fillRect(s.x,s.y,s.w,s.h);

    // park
    ctx.fillStyle="#5f7f41";
    ctx.fillRect(this.park.x,this.park.y,this.park.w,this.park.h);

    // amenities
    ctx.fillStyle="#1e6b70";
    ctx.fillRect(this.pool.x,this.pool.y,this.pool.w,this.pool.h);

    ctx.fillStyle="#3e6f66";
    ctx.fillRect(this.tennis.x,this.tennis.y,this.tennis.w,this.tennis.h);

    // fence
    ctx.fillStyle="#888";
    ctx.fillRect(this.fence.x,this.fence.y,this.fence.w,6);
    ctx.fillRect(this.fence.x,this.fence.y+this.fence.h-6,this.fence.w,6);
    ctx.fillRect(this.fence.x,this.fence.y,6,this.fence.h);
    ctx.fillRect(this.fence.x+this.fence.w-6,this.fence.y,6,this.fence.h);

    // buildings
    ctx.fillStyle="#c9c0ae";
    for(const b of this.buildings) ctx.fillRect(b.x,b.y,b.w,b.h);

    // small box
    ctx.fillStyle="#999";
    ctx.fillRect(this.box.x,this.box.y,this.box.w,this.box.h);

    // trees
    ctx.fillStyle="#2f5f2f";
    for(const t of this.trees) ctx.fillRect(t.x-10,t.y-10,20,20);

    ctx.restore();
  }

  drawAbove(){}
}
