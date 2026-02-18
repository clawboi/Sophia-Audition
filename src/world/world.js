// NPC City — World v0
// ULTRA CLEAN FOUNDATION MAP
// Intentional minimal skeleton for stability + expansion

export class World{
  constructor(){

    // ===== WORLD SIZE =====
    this.w = 2400;
    this.h = 1400;

    // ===== SPAWN =====
    this.spawns = {
      actor:{ x:1200, y:700 }
    };

    // ===== STORAGE =====
    this.buildings = [];
    this.solids = [];
    this.doors = [];
    this.landmarks = [];

    // =====================================================
    // ROADS (outer border)
    // =====================================================
    this.roads = [
      {x:0,y:0,w:this.w,h:120},                 // top
      {x:0,y:this.h-120,w:this.w,h:120},        // bottom
      {x:0,y:0,w:120,h:this.h},                 // left
      {x:this.w-120,y:0,w:120,h:this.h},        // right
    ];

    // =====================================================
    // CENTRAL PARK
    // =====================================================
    this.park = {
      x:700,
      y:350,
      w:1000,
      h:700
    };

    // =====================================================
    // BUILDINGS AROUND PARK
    // =====================================================

    // north row
    this.addBuilding(700,150,1000,120,"south");

    // south row
    this.addBuilding(700,1050,1000,120,"north");

    // west row
    this.addBuilding(500,350,120,700,"east");

    // east row
    this.addBuilding(1780,350,120,700,"west");

    // =====================================================
    // MANAGEMENT BUILDING
    // =====================================================
    this.addBuilding(1100,1220,200,120,"north","management");

    // =====================================================
    // WORLD BOUNDS (prevents leaving map)
    // =====================================================
    this.solids.push({x:-200,y:-200,w:this.w+400,h:200});
    this.solids.push({x:-200,y:this.h,w:this.w+400,h:200});
    this.solids.push({x:-200,y:-200,w:200,h:this.h+400});
    this.solids.push({x:this.w,y:-200,w:200,h:this.h+400});

    // =====================================================
    // LANDMARKS
    // =====================================================
    this.landmarks.push({
      x:this.park.x+this.park.w/2,
      y:this.park.y-20,
      text:"Central Park"
    });

    this.landmarks.push({
      x:1200,
      y:1200,
      text:"Management"
    });
  }

  // =====================================================
  // BUILDING HELPER
  // =====================================================
  addBuilding(x,y,w,h,doorSide,type="building"){
    const b = {x,y,w,h,type};
    this.buildings.push(b);

    // collision slightly inset (smooth walking)
    this.solids.push({x:x+6,y:y+6,w:w-12,h:h-12});

    // door
    let dx=x+w/2-18;
    let dy=y+h-18;

    if(doorSide==="north") dy=y-18;
    if(doorSide==="south") dy=y+h-6;
    if(doorSide==="east"){ dx=x+w-6; dy=y+h/2-18; }
    if(doorSide==="west"){ dx=x-18; dy=y+h/2-18; }

    this.doors.push({x:dx,y:dy,w:36,h:36,target:type});
  }

  // =====================================================
  // COLLISION
  // =====================================================
  hitsSolid(r){
    for(const s of this.solids){
      if(r.x<s.x+s.w && r.x+r.w>s.x && r.y<s.y+s.h && r.y+r.h>s.y)
        return true;
    }
    return false;
  }

  // =====================================================
  // SPAWN
  // =====================================================
  getSpawn(){ return this.spawns.actor; }

  // =====================================================
  // LANDMARK DETECTION
  // =====================================================
  nearestLandmark(px,py,d=70){
    let best=null,bd=d*d;
    for(const l of this.landmarks){
      const dx=l.x-px, dy=l.y-py;
      const dist=dx*dx+dy*dy;
      if(dist<bd){bd=dist;best=l;}
    }
    return best;
  }

  // =====================================================
  // DRAW
  // =====================================================
  draw(ctx,cam){

    ctx.fillStyle="#6c8f4e"; // grass base
    ctx.fillRect(0,0,cam.vw,cam.vh);

    ctx.save();
    ctx.translate(-cam.x,-cam.y);

    // roads
    ctx.fillStyle="#2c2c34";
    for(const r of this.roads)
      ctx.fillRect(r.x,r.y,r.w,r.h);

    // park
    ctx.fillStyle="#5f7f41";
    ctx.fillRect(this.park.x,this.park.y,this.park.w,this.park.h);

    // buildings
    ctx.fillStyle="#c9c0ae";
    for(const b of this.buildings)
      ctx.fillRect(b.x,b.y,b.w,b.h);

    // labels
    ctx.fillStyle="rgba(0,0,0,.4)";
    ctx.font="12px sans-serif";
    for(const l of this.landmarks)
      ctx.fillText(l.text,l.x,l.y);

    ctx.restore();
  }

  drawAbove(){}
}
