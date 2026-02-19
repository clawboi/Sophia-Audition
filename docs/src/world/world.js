// NPC City — World v4 FINAL FIXED (no road blockers + spacing corrected)

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

    // BUILDINGS
    this.addBuilding(820,220,760,170,"south");
    this.addBuilding(this.w/2-250,1010,500,140,"north");
    this.addBuilding(640,440,200,520,"east");

    // MANAGEMENT (smaller + centered properly)
    this.addBuilding(this.w/2-40,1080,80,80,"north","management");

    // mailbox/payphone
    this.box = {x:240,y:1080,w:60,h:60};
    this.solids.push(this.box);

    // AMENITIES
    this.pool   = {x:1700,y:460,w:420,h:220};
    this.tennis = {x:1700,y:740,w:420,h:260};

    // fence
    this.fence = {x:1680,y:440,w:460,h:580};
    this.solids.push(
      {x:this.fence.x,y:this.fence.y,w:this.fence.w,h:10},
      {x:this.fence.x,y:this.fence.y+this.fence.h-10,w:this.fence.w,h:10},
      {x:this.fence.x,y:this.fence.y,w:10,h:this.fence.h},
      {x:this.fence.x+this.fence.w-10,y:this.fence.y,w:10,h:this.fence.h}
    );

    // ===== LANDMARKS (for E-interact prompts) =====
    const parkC   = { x: this.park.x + this.park.w*0.5,   y: this.park.y + this.park.h*0.5 };
    const poolC   = { x: this.pool.x + this.pool.w*0.5,   y: this.pool.y + this.pool.h*0.5 };
    const tennisC = { x: this.tennis.x + this.tennis.w*0.5, y: this.tennis.y + this.tennis.h*0.5 };
    const boxC    = { x: this.box.x + this.box.w*0.5,     y: this.box.y + this.box.h*0.5 };

    // Doors created by addBuilding(). We reuse them as interact points.
    const doorApt = (() => {
      let best=null, by=-1;
      for (const d of this.doors){
        if (d.target !== "building") continue;
        if (d.y > by){ by = d.y; best = d; }
      }
      return best;
    })();
    const doorMgmt = this.doors.find(d => d.target === "management");

    // Core interactables used by game.js -> handleInteract(lm)
    this.landmarks.push(
      { id:"park",   x:parkC.x,   y:parkC.y,   text:"Park",             hint:"Breathe / Flyers" },
      { id:"pool",   x:poolC.x,   y:poolC.y,   text:"Pool",             hint:"Wash up" },
      { id:"tennis", x:tennisC.x, y:tennisC.y, text:"Tennis Court",     hint:"Workout" },
      { id:"vault",  x:(doorMgmt?doorMgmt.x+18: this.w*0.5), y:(doorMgmt?doorMgmt.y+18: 1120), text:"Management Vault", hint:"Bank / Vault" },
      { id:"apt",    x:(doorApt?doorApt.x+18: this.w*0.5),   y:(doorApt?doorApt.y+18: 980),  text:"Apartment",        hint:"Rest / Phone" },
      { id:"stage",  x:this.park.x + this.park.w*0.25, y:this.park.y + this.park.h*0.28, text:"Stage", hint:"Perform" },
      { id:"box",    x:boxC.x,    y:boxC.y,    text:"Box",              hint:"Messages" },
    );


    // PARKING (lowered so never touches grass)
    this.parking = {x:520,y:1200,w:1360,h:160};
    this.parkingRoad = {x:520,y:1250,w:1360,h:50};

    // connector road
    this.connector = {x:1100,y:this.h-roadW,w:200,h:200};

    // SIDEWALKS
    this.sidewalks = [
      {x:this.park.x-40,y:this.park.y-40,w:this.park.w+80,h:30},
      {x:this.park.x-40,y:this.park.y+this.park.h+10,w:this.park.w+80,h:30},
      {x:this.park.x-40,y:this.park.y,w:30,h:this.park.h},
      {x:this.park.x+this.park.w+10,y:this.park.y,w:30,h:this.park.h},
    ];

    // WORLD BOUNDS (moved OUTSIDE roads so no blocking)
    this.solids.push({x:-200,y:-200,w:this.w+400,h:150});
    this.solids.push({x:-200,y:this.h+50,w:this.w+400,h:150});
    this.solids.push({x:-200,y:-200,w:150,h:this.h+400});
    this.solids.push({x:this.w+50,y:-200,w:150,h:this.h+400});

    // LANDMARKS (with ids + hints so game systems can hook in)
    this.landmarks.push({ id:"park", x:1200,y:420, text:"Central Park", hint:"Hangout" });
    this.landmarks.push({ id:"stage", x:1200,y:520, text:"Park Stage", hint:"8PM Show" });
    this.landmarks.push({ id:"pool", x:1780,y:430, text:"Pool", hint:"Wash up" });
    this.landmarks.push({ id:"tennis", x:1780,y:720, text:"Tennis Court", hint:"Workout" });
    this.landmarks.push({ id:"parking", x:540,y:1180, text:"Parking", hint:"Vehicles later" });
    this.landmarks.push({ id:"vault", x:1200,y:1040, text:"District Vault", hint:"Access (1/day)" });
    this.landmarks.push({ id:"apt", x:980,y:260, text:"Apartments", hint:"Home later" });
  }

  addBuilding(x,y,w,h,doorSide,type="building"){
    const b={x,y,w,h,type};
    this.buildings.push(b);

    // smaller collision margin so walls feel natural
    this.solids.push({x:x+10,y:y+10,w:w-20,h:h-20});

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

    ctx.fillStyle="#2c2c34";
    for(const r of this.roads) ctx.fillRect(r.x,r.y,r.w,r.h);

    ctx.fillRect(this.connector.x,this.connector.y,this.connector.w,this.connector.h);

    ctx.fillStyle="#3a3a42";
    ctx.fillRect(this.parking.x,this.parking.y,this.parking.w,this.parking.h);

    ctx.fillStyle="#2c2c34";
    ctx.fillRect(this.parkingRoad.x,this.parkingRoad.y,this.parkingRoad.w,this.parkingRoad.h);

    ctx.fillStyle="#bdb6a8";
    for(const s of this.sidewalks) ctx.fillRect(s.x,s.y,s.w,s.h);

    ctx.fillStyle="#5f7f41";
    ctx.fillRect(this.park.x,this.park.y,this.park.w,this.park.h);

    ctx.fillStyle="#1e6b70";
    ctx.fillRect(this.pool.x,this.pool.y,this.pool.w,this.pool.h);

    ctx.fillStyle="#3e6f66";
    ctx.fillRect(this.tennis.x,this.tennis.y,this.tennis.w,this.tennis.h);

    ctx.fillStyle="#888";
    ctx.fillRect(this.fence.x,this.fence.y,this.fence.w,6);
    ctx.fillRect(this.fence.x,this.fence.y+this.fence.h-6,this.fence.w,6);
    ctx.fillRect(this.fence.x,this.fence.y,6,this.fence.h);
    ctx.fillRect(this.fence.x+this.fence.w-6,this.fence.y,6,this.fence.h);

    ctx.fillStyle="#c9c0ae";
    for(const b of this.buildings) ctx.fillRect(b.x,b.y,b.w,b.h);

    ctx.fillStyle="#999";
    ctx.fillRect(this.box.x,this.box.y,this.box.w,this.box.h);

    ctx.restore();
  }

  drawAbove(){}
}
