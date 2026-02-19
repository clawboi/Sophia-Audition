// NPC City — World v4 FINAL FIXED (no road blockers + spacing corrected)

export class World{
  constructor(){

    // scene mode
    this.mode = "outside"; // outside | interior
    this._outside = null;   // snapshot when entering interiors
    this._interiorType = "";

    this.w = 2400;
    this.h = 1400;

    this.spawns = { actor:{ x:1200, y:700 } };

    this.buildings = [];
    this.solids = [];
    this.doors = [];
    this.landmarks = [];
    this.trees = [];
    this.props = [];
    this.flowers = [];

    // ROADS
    // Outer ring roads (major)
    const roadW = 200;

    this.roads = [
      {x:0,y:0,w:this.w,h:roadW, kind:"major"},
      {x:0,y:this.h-roadW,w:this.w,h:roadW, kind:"major"},
      {x:0,y:0,w:roadW,h:this.h, kind:"major"},
      {x:this.w-roadW,y:0,w:roadW,h:this.h, kind:"major"},
    ];

    // Suburb streets (so it feels like neighborhoods, not a plaza)
    // Main Ave splits the town, plus two small residential loops.
    this.roads.push(
      {x:roadW, y:760-60, w:this.w-roadW*2, h:120, kind:"major"},  // Main Ave
      {x:1200-60, y:roadW, w:120, h:this.h-roadW*2, kind:"major"}, // Center St
      // Residential: North loop
      {x:roadW+120, y:300, w:820, h:90, kind:"res"},
      {x:roadW+120, y:300, w:90,  h:520, kind:"res"},
      {x:roadW+120, y:730, w:820, h:90, kind:"res"},
      {x:roadW+850, y:300, w:90,  h:520, kind:"res"},
      // Residential: South cul-de-sac
      {x:roadW+1400, y:980, w:640, h:90, kind:"res"},
      {x:roadW+1400, y:980, w:90,  h:240, kind:"res"},
      {x:roadW+1950, y:980, w:90,  h:240, kind:"res"},
    );

    // Cul-de-sac bulb
    this.culdesacs = [
      {x:roadW+1670, y:1185, r:120},
    ];

    // PARK
    this.park = { x:840, y:440, w:720, h:520 };

    // soft Ghibli-ish paths (no images, just warm dirt)
    this.paths = [
      {x:980,y:520,w:440,h:90, kind:"dirt"},
      {x:1160,y:440,w:90,h:420, kind:"dirt"},
      {x:1060,y:900,w:280,h:70, kind:"dirt"},
    ];

    // BUILDINGS (blocky for now, but drawn with pixel detail below)
    this.addBuilding(820,220,760,170,"south","apartments");
    this.addBuilding(this.w/2-250,1010,500,140,"north","shops");
    this.addBuilding(640,440,200,520,"east","studio");

    // MANAGEMENT (vault/office)
    this.addBuilding(this.w/2-40,1080,80,80,"north","management");

    // mailbox/payphone
    this.box = {x:240,y:1080,w:60,h:60};
    this.solids.push(this.box);

    // yards (front lawns) for readability
    this.yards = [
      {x:820, y:390, w:760, h:110, kind:"aptYard"},
      {x:this.w/2-250, y:940, w:500, h:70, kind:"shopFront"},
    ];


    // ===== Suburb neighborhoods (small houses + yards + driveways) =====
    this.driveways = [];
    const addDrive = (x,y,w,h)=>this.driveways.push({x,y,w,h});

    // North loop: a row of cozy houses
    const baseX = roadW + 165;
    for (let i=0;i<6;i++){
      const hx = baseX + i*130;
      const hy = 220;
      this.addBuilding(hx, hy, 96, 70, "south", "house");
      this.yards.push({x:hx-22, y:hy+70, w:140, h:70, kind:"houseYard"});
      addDrive(hx+34, hy+140, 28, 70);
      this.props.push({type:"mailbox", x:hx-10, y:hy+150});
    }

    // North loop: back row (slightly different spacing)
    for (let i=0;i<5;i++){
      const hx = baseX + 40 + i*150;
      const hy = 810;
      this.addBuilding(hx, hy, 104, 74, "north", "house");
      this.yards.push({x:hx-26, y:hy-70, w:156, h:64, kind:"houseYard"});
      addDrive(hx+38, hy-140, 30, 70);
      this.props.push({type:"mailbox", x:hx-12, y:hy-120});
    }

    // South cul-de-sac: 3 houses facing the bulb
    const culX = roadW + 1480;
    const culY = 900;
    const cul = [
      {x:culX, y:culY, face:"south"},
      {x:culX+190, y:culY, face:"south"},
      {x:culX+380, y:culY, face:"south"},
    ];
    for (const c of cul){
      this.addBuilding(c.x, c.y, 112, 78, c.face, "house");
      this.yards.push({x:c.x-30, y:c.y+78, w:172, h:86, kind:"houseYard"});
      addDrive(c.x+44, c.y+164, 34, 80);
      this.props.push({type:"mailbox", x:c.x-14, y:c.y+168});
    }
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

    // ===== Decor pass (soft town life) =====
    // Trees around park + along roads
    const addTree = (x,y,s=1)=>this.trees.push({x,y,s});
    for (let i=0;i<12;i++) addTree(860 + i*60, 430, (i%3===0)?1.15:1);
    for (let i=0;i<12;i++) addTree(860 + i*60, 980, (i%4===0)?1.2:1);
    for (let i=0;i<8;i++) addTree(820, 470 + i*60, 1);
    for (let i=0;i<8;i++) addTree(1580, 470 + i*60, 1);

    // Street lamps (tiny warm glow)
    const lamp = (x,y)=>this.props.push({type:"lamp", x,y});
    for (let xx=260; xx<this.w-260; xx+=220){ lamp(xx, 170); lamp(xx, this.h-170); }
    for (let yy=260; yy<this.h-260; yy+=220){ lamp(170, yy); lamp(this.w-170, yy); }
    // Park benches
    this.props.push({type:"bench", x:1100, y:600});
    this.props.push({type:"bench", x:1280, y:760});

    // Flower specks (kept sparse for speed)
    for (let i=0;i<120;i++){
      const x = 220 + ((i*97) % (this.w-440));
      const y = 220 + ((i*53) % (this.h-440));
      // avoid roads
      if (x < 210 || x > this.w-210 || y < 210 || y > this.h-210) continue;
      this.flowers.push({x, y, c:(i%3)});
    }
  }

  // ===== Doors / interiors =====
  doorNear(px, py, r=54){
    let best=null, bd=r*r;
    for (const d of this.doors){
      const cx = d.x + d.w/2;
      const cy = d.y + d.h/2;
      const dx = cx - px, dy = cy - py;
      const dist = dx*dx + dy*dy;
      if (dist < bd){ bd = dist; best = d; }
    }
    return best;
  }

  enterInterior(target, fromPlayer){
    if (this.mode === "interior") return;
    // snapshot outside
    this._outside = {
      w:this.w, h:this.h,
      roads:this.roads, sidewalks:this.sidewalks,
      park:this.park, pool:this.pool, tennis:this.tennis,
      fence:this.fence, parking:this.parking, parkingRoad:this.parkingRoad,
      connector:this.connector,
      buildings:this.buildings, solids:this.solids, doors:this.doors,
      landmarks:this.landmarks
    };

    this.mode = "interior";
    this._interiorType = target || "building";

    // compact interior room
    this.w = 820;
    this.h = 520;

    // clear world geometry for interior
    this.roads = [];
    this.sidewalks = [];
    this.park = null;
    this.pool = null;
    this.tennis = null;
    this.fence = null;
    this.parking = null;
    this.parkingRoad = null;
    this.connector = null;

    this.buildings = [];
    this.landmarks = [];
    this.solids = [];
    this.doors = [];

    // walls
    this.solids.push({x:-200,y:-200,w:this.w+400,h:160});
    this.solids.push({x:-200,y:this.h+40,w:this.w+400,h:160});
    this.solids.push({x:-200,y:-200,w:160,h:this.h+400});
    this.solids.push({x:this.w+40,y:-200,w:160,h:this.h+400});

    // simple furniture solids (varies by type)
    if (this._interiorType === "apartments"){
      this.solids.push({x:120,y:120,w:250,h:90});  // couch
      this.solids.push({x:520,y:110,w:160,h:120});  // table
      this.solids.push({x:140,y:320,w:280,h:120});  // bed
      this.solids.push({x:520,y:300,w:180,h:90});   // bookshelf
    } else if (this._interiorType === "shops"){
      this.solids.push({x:120,y:110,w:240,h:80});   // counter
      this.solids.push({x:120,y:220,w:560,h:60});   // shelves
      this.solids.push({x:120,y:310,w:560,h:60});
    } else if (this._interiorType === "management"){
      this.solids.push({x:150,y:120,w:220,h:120});  // desk
      this.solids.push({x:520,y:120,w:180,h:200});  // vault wall
    } else {
      this.solids.push({x:120,y:120,w:220,h:90});
      this.solids.push({x:520,y:110,w:160,h:120});
      this.solids.push({x:140,y:320,w:260,h:120});
    }

    // exit door (bottom center)
    this.doors.push({x:this.w/2-22, y:this.h-58, w:44, h:44, target:"exit"});

    // reposition player just inside
    if (fromPlayer){
      fromPlayer.x = (this.w/2-9) | 0;
      fromPlayer.y = (this.h-120) | 0;
    }
  }

  exitInterior(toPlayer){
    if (this.mode !== "interior" || !this._outside) return;
    const out = this._outside;

    this.mode = "outside";
    this._interiorType = "";

    this.w = out.w; this.h = out.h;
    this.roads = out.roads;
    this.sidewalks = out.sidewalks;
    this.park = out.park;
    this.pool = out.pool;
    this.tennis = out.tennis;
    this.fence = out.fence;
    this.parking = out.parking;
    this.parkingRoad = out.parkingRoad;
    this.connector = out.connector;
    this.buildings = out.buildings;
    this.solids = out.solids;
    this.doors = out.doors;
    this.landmarks = out.landmarks;

    // place player outside near the matching door if possible
    if (toPlayer){
      const prefer = (this._outside?.doors || []).find(d => d.target === "apartments")
        || (this._outside?.doors || [])[0];
      if (prefer){
        toPlayer.x = (prefer.x + prefer.w/2 - toPlayer.w/2) | 0;
        toPlayer.y = (prefer.y + prefer.h + 8) | 0;
      }
    }

    this._outside = null;
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
    // ===== background =====
    // outside: grass texture; interior: warm room tone
    if (this.mode === "interior"){
      // warm interior paper-brown
      ctx.fillStyle = "#27212a";
      ctx.fillRect(0,0,cam.vw,cam.vh);
    } else {
      // soft grass (Ghibli-ish)
      ctx.fillStyle = "#6b9851";
      ctx.fillRect(0,0,cam.vw,cam.vh);
    }

    ctx.save();
    ctx.translate(-cam.x,-cam.y);

    if (this.mode === "interior"){
      // floor
      drawDither(ctx, 0, 0, this.w, this.h, "#2a2330", "rgba(255,255,255,.03)", 6);

      // rug + furniture by interior type
      if (this._interiorType === "apartments"){
        drawRug(ctx, 140, 240, 540, 180);
        drawCouch(ctx, 120, 120, 250, 90);
        drawTable(ctx, 520, 110, 160, 120);
        drawBed(ctx, 140, 320, 280, 120);
        drawShelf(ctx, 520, 300, 180, 90);
        drawWindowGlow(ctx, 60, 70);
      } else if (this._interiorType === "shops"){
        drawRug(ctx, 160, 390, 500, 90);
        drawCounter(ctx, 120, 110, 240, 80);
        drawShelf(ctx, 120, 220, 560, 60);
        drawShelf(ctx, 120, 310, 560, 60);
        drawSign(ctx, 410, 70, "Shop");
      } else if (this._interiorType === "management"){
        drawRug(ctx, 220, 310, 380, 130);
        drawDesk(ctx, 150, 120, 220, 120);
        drawVaultDoor(ctx, 550, 140, 140, 160);
        drawSign(ctx, 410, 70, "Vault");
      } else {
        drawRug(ctx, 130, 240, 560, 180);
        drawCouch(ctx, 120, 120, 220, 90);
        drawTable(ctx, 520, 110, 160, 120);
        drawBed(ctx, 140, 320, 260, 120);
      }

      // exit door
      for (const d of this.doors) drawDoor(ctx, d.x, d.y, d.w, d.h);

      // wall trim
      ctx.fillStyle = "rgba(255,255,255,.06)";
      ctx.fillRect(0, 0, this.w, 10);
      ctx.fillRect(0, this.h-10, this.w, 10);
      ctx.fillRect(0, 0, 10, this.h);
      ctx.fillRect(this.w-10, 0, 10, this.h);
    } else {
      // grass texture
      drawDither(ctx, 0, 0, this.w, this.h, "#6b9851", "rgba(0,0,0,.045)", 10);

      // flowers
      drawFlowers(ctx, this.flowers);

      // soft dirt paths
      if (this.paths?.length){
        for (const p of this.paths) drawPath(ctx, p.x,p.y,p.w,p.h);
      }

      // roads + curbs
      ctx.fillStyle="#23232a";
      for(const r of this.roads){
        drawRoad(ctx, r.x, r.y, r.w, r.h, r.kind);
      }
      if (this.connector) drawRoad(ctx, this.connector.x,this.connector.y,this.connector.w,this.connector.h, "major");

      // parking

      // cul-de-sacs (suburb bulbs)
      if (this.culdesacs?.length){
        for (const c of this.culdesacs) drawCuldesac(ctx, c.x, c.y, c.r);
      }

      // driveways (thin concrete leading to houses)
      if (this.driveways?.length){
        for (const d of this.driveways) drawDriveway(ctx, d.x,d.y,d.w,d.h);
      }
      if (this.parking){
        drawAsphalt(ctx, this.parking.x,this.parking.y,this.parking.w,this.parking.h);
        drawRoad(ctx, this.parkingRoad.x,this.parkingRoad.y,this.parkingRoad.w,this.parkingRoad.h, "res");
        drawParkingLines(ctx, this.parking.x+40, this.parking.y+28, this.parking.w-80, this.parking.h-60);
      }

      // sidewalks
      if (this.sidewalks?.length){
        for(const s of this.sidewalks) drawSidewalk(ctx, s.x,s.y,s.w,s.h);
      }

      // park lawn
      if (this.park){
        drawDither(ctx, this.park.x,this.park.y,this.park.w,this.park.h, "#71a458", "rgba(0,0,0,.035)", 8);
        // stage pad
        ctx.fillStyle = "rgba(0,0,0,.14)";
        ctx.fillRect(1150, 500, 100, 60);
        ctx.fillStyle = "rgba(255,255,255,.10)";
        ctx.fillRect(1152, 502, 96, 56);
      }

      // pool + tennis
      if (this.pool) drawPool(ctx, this.pool.x,this.pool.y,this.pool.w,this.pool.h);
      if (this.tennis) drawTennis(ctx, this.tennis.x,this.tennis.y,this.tennis.w,this.tennis.h);

      // fence
      if (this.fence) drawFence(ctx, this.fence.x,this.fence.y,this.fence.w,this.fence.h);

      // yards (fences/hedges)
      if (this.yards?.length){
        for (const y of this.yards) drawYard(ctx, y);
      }

      // buildings (pixel roof + windows)
      for(const b of this.buildings) drawBuilding(ctx, b.x,b.y,b.w,b.h, b.type);


      // trees + props
      for (const t of this.trees) drawTree(ctx, t.x, t.y, t.s || 1);
      for (const pr of this.props){
        if (pr.type === "lamp") drawLamp(ctx, pr.x, pr.y);
        if (pr.type === "bench") drawBench(ctx, pr.x, pr.y);
        if (pr.type === "mailbox") drawMailbox(ctx, pr.x, pr.y);
      }

      // doors (noticeable)
      for(const d of this.doors) drawDoor(ctx, d.x, d.y, d.w, d.h);

      // mailbox/payphone
      if (this.box){
        ctx.fillStyle="#9aa0b5";
        ctx.fillRect(this.box.x,this.box.y,this.box.w,this.box.h);
        ctx.fillStyle="rgba(0,0,0,.18)";
        ctx.fillRect(this.box.x+6,this.box.y+8,this.box.w-12,10);
      }
    }

    ctx.restore();
  }

  drawAbove(){}
}

// ===== Pixel helpers (no images, but "road looks like road" vibes) =====
function drawDither(ctx, x, y, w, h, base, speck, step){
  ctx.fillStyle = base;
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = speck;
  const s = Math.max(4, step|0);
  for (let yy=y; yy<y+h; yy+=s){
    for (let xx=x; xx<x+w; xx+=s){
      if (((xx+yy)/s|0) % 3 === 0) ctx.fillRect(xx+1, yy+1, 2, 2);
      if (((xx+yy)/s|0) % 5 === 0) ctx.fillRect(xx+3, yy+2, 1, 1);
    }
  }
}

function drawAsphalt(ctx, x,y,w,h){
  drawDither(ctx, x,y,w,h, "#2b2b33", "rgba(255,255,255,.04)", 14);
  // edge darken
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x,y,w,6);
  ctx.fillRect(x,y+h-6,w,6);
}

function drawRoad(ctx, x,y,w,h, kind="major"){
  if (kind === "res"){
    // residential street: slightly lighter asphalt, fewer markings
    drawDither(ctx, x,y,w,h, "#2a2a32", "rgba(255,255,255,.025)", 18);
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.fillRect(x,y,w,5);
    ctx.fillRect(x,y+h-5,w,5);
    // tiny edge cracks
    ctx.fillStyle = "rgba(0,0,0,.12)";
    for (let i=0;i<6;i++){
      const xx = x + 22 + ((i*97)%(w-44));
      const yy = y + 12 + ((i*41)%(h-24));
      ctx.fillRect(xx, yy, 2, 6);
    }
    return;
  }

  // major road
  drawDither(ctx, x,y,w,h, "#23232a", "rgba(255,255,255,.03)", 16);
  // curbs
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(x,y,w,6);
  ctx.fillRect(x,y+h-6,w,6);
  // center dashes for long roads
  const long = (w > h);
  ctx.fillStyle = "rgba(255,255,255,.22)";
  if (long && h >= 70){
    const cy = (y + h/2 - 2) | 0;
    for (let xx=x+20; xx<x+w-20; xx+=34) ctx.fillRect(xx, cy, 16, 4);
  } else if (!long && w >= 70){
    const cx = (x + w/2 - 2) | 0;
    for (let yy=y+20; yy<y+h-20; yy+=34) ctx.fillRect(cx, yy, 4, 16);
  }
}


function drawSidewalk(ctx, x,y,w,h){

function drawCuldesac(ctx, cx, cy, r){
  // soft bulb: stacked rings + dither
  const x = (cx - r) | 0;
  const y = (cy - r) | 0;
  const d = r*2;
  drawDither(ctx, x,y,d,d, "#2a2a32", "rgba(255,255,255,.02)", 18);
  ctx.fillStyle = "rgba(255,255,255,.05)";
  ctx.fillRect(x, y, d, 5);
  ctx.fillRect(x, y+d-5, d, 5);
  // rounded illusion (corners)
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(x, y, 14, 14);
  ctx.fillRect(x+d-14, y, 14, 14);
  ctx.fillRect(x, y+d-14, 14, 14);
  ctx.fillRect(x+d-14, y+d-14, 14, 14);
}

function drawDriveway(ctx, x,y,w,h){
  drawDither(ctx, x,y,w,h, "#c9c3b6", "rgba(0,0,0,.05)", 12);
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y+h-2, w, 2);
}
  drawDither(ctx, x,y,w,h, "#bdb6a8", "rgba(0,0,0,.05)", 12);
  ctx.fillStyle = "rgba(0,0,0,.12)";
  ctx.fillRect(x,y,w,3);
  ctx.fillRect(x,y+h-3,w,3);
}

function drawParkingLines(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(255,255,255,.18)";
  for (let xx=x; xx<x+w; xx+=60){
    ctx.fillRect(xx, y, 2, h);
  }
}

function drawPool(ctx, x,y,w,h){
  // border
  ctx.fillStyle = "#d6d1c6";
  ctx.fillRect(x-8,y-8,w+16,h+16);
  drawDither(ctx, x,y,w,h, "#1f7b85", "rgba(255,255,255,.06)", 10);
  // ripples
  ctx.fillStyle = "rgba(255,255,255,.08)";
  for (let yy=y+18; yy<y+h-10; yy+=26){
    ctx.fillRect(x+16, yy, w-32, 2);
  }
}

function drawTennis(ctx, x,y,w,h){
  ctx.fillStyle = "#2f6a52";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.fillRect(x+10, y+10, w-20, 2);
  ctx.fillRect(x+10, y+h-12, w-20, 2);
  ctx.fillRect(x+10, y+10, 2, h-20);
  ctx.fillRect(x+w-12, y+10, 2, h-20);
  ctx.fillRect(x + (w/2|0), y+12, 2, h-24);
  ctx.fillRect(x+12, y + (h/2|0), w-24, 2);
}

function drawFence(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(255,255,255,.14)";
  ctx.fillRect(x,y,w,6);
  ctx.fillRect(x,y+h-6,w,6);
  ctx.fillRect(x,y,6,h);
  ctx.fillRect(x+w-6,y,6,h);
  // posts
  ctx.fillStyle = "rgba(0,0,0,.16)";
  for (let xx=x+10; xx<x+w-10; xx+=26){
    ctx.fillRect(xx, y+6, 3, h-12);
  }
}

function drawBuilding(ctx, x,y,w,h,type){
  // Houses get a cozy little ghibli-ish look: warm walls, pitched roof hint, big windows.
  if (type === "house"){
    // wall
    drawDither(ctx, x,y,w,h, "#d2c7b4", "rgba(0,0,0,.035)", 20);
    // roof (pitched illusion)
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fillRect(x, y, w, 16);
    ctx.fillStyle = "rgba(255,255,255,.07)";
    ctx.fillRect(x+6, y+4, w-12, 3);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x+8, y+16, w-16, 4);

    // two big windows
    const win = "rgba(15,15,22,.18)";
    const shine = "rgba(255,255,255,.12)";
    ctx.fillStyle = win;
    ctx.fillRect(x+14, y+30, 26, 18);
    ctx.fillRect(x+w-40, y+30, 26, 18);
    ctx.fillStyle = shine;
    ctx.fillRect(x+16, y+32, 10, 2);
    ctx.fillRect(x+w-38, y+32, 10, 2);

    // little porch band
    ctx.fillStyle = "rgba(0,0,0,.10)";
    ctx.fillRect(x+10, y+h-14, w-20, 10);
    return;
  }

  // big buildings
  drawDither(ctx, x,y,w,h, "#c9c0ae", "rgba(0,0,0,.04)", 18);
  // roof band
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x, y, w, 14);
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x+6, y+3, w-12, 3);

  // windows grid
  const winC = "rgba(15,15,22,.20)";
  const shine = "rgba(255,255,255,.10)";
  for (let yy=y+26; yy<y+h-30; yy+=34){
    for (let xx=x+18; xx<x+w-18; xx+=34){
      ctx.fillStyle = winC;
      ctx.fillRect(xx, yy, 18, 14);
      ctx.fillStyle = shine;
      ctx.fillRect(xx+2, yy+2, 6, 2);
    }
  }

  // type badge
  if (type){
    ctx.fillStyle = "rgba(138,46,255,.18)";
    ctx.fillRect(x+10, y+16, 80, 18);
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(type.toUpperCase(), x+14, y+29);
  }
}


function drawDoor(ctx, x,y,w,h){
  // door frame
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fillRect(x,y,w,h);
  // inner door
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fillRect(x+4,y+4,w-8,h-8);
  // knob
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.fillRect(x+w-10, y+h/2, 3, 3);
  // tiny welcome mat shadow
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(x+2, y+h, w-4, 4);
}

function drawRug(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(138,46,255,.10)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(x+10,y+10,w-20,2);
  ctx.fillRect(x+10,y+h-12,w-20,2);
}

function drawCouch(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x,y+h-10,w,10);
  ctx.fillStyle = "rgba(255,255,255,.07)";
  ctx.fillRect(x+10,y+12,w-20,14);
}

function drawTable(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(138,46,255,.12)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(x+8,y+8,w-16,h-16);
}

function drawBed(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(x,y,w,14);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(x+14,y+22,w-28,h-36);
}

function drawShelf(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(255,255,255,.07)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x,y,w,10);
  ctx.fillRect(x,y+h-10,w,10);
  // books
  for (let i=0;i<10;i++){
    const bx = x + 10 + i*16;
    ctx.fillStyle = i%2?"rgba(138,46,255,.18)":"rgba(255,255,255,.10)";
    ctx.fillRect(bx, y+16, 10, h-28);
  }
}

function drawCounter(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(0,0,0,.20)";
  ctx.fillRect(x,y+h-10,w,10);
}

function drawDesk(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(138,46,255,.10)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x+8,y+8,w-16,h-16);
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fillRect(x+12,y+14, w-24, 10);
}

function drawVaultDoor(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fillRect(x+8,y+8,w-16,h-16);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.beginPath();
  ctx.arc(x+w/2, y+h/2, Math.min(w,h)*0.22, 0, Math.PI*2);
  ctx.fill();
}

function drawSign(ctx, x,y,txt){
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(x-70,y-14,140,28);
  ctx.fillStyle = "rgba(0,0,0,.30)";
  ctx.fillRect(x-68,y-12,136,24);
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.fillText(String(txt||"").toUpperCase(), x, y+5);
  ctx.textAlign = "left";
}

function drawWindowGlow(ctx, x,y){
  // little warm window rectangle glow
  ctx.fillStyle = "rgba(255,220,140,.07)";
  ctx.fillRect(x, y, 170, 90);
  ctx.fillStyle = "rgba(255,220,140,.04)";
  ctx.fillRect(x-16, y-16, 202, 122);
}

function drawPath(ctx, x,y,w,h){
  drawDither(ctx, x,y,w,h, "#a78661", "rgba(0,0,0,.05)", 12);
  ctx.fillStyle = "rgba(255,255,255,.05)";
  ctx.fillRect(x+10,y+8,w-20,2);
  ctx.fillRect(x+10,y+h-10,w-20,2);
}

function drawFlowers(ctx, arr){
  if (!arr || !arr.length) return;
  for (const f of arr){
    const c = f.c || 0;
    ctx.fillStyle = c===0 ? "rgba(255,255,255,.10)" : c===1 ? "rgba(255,230,150,.10)" : "rgba(138,46,255,.10)";
    ctx.fillRect(f.x, f.y, 2, 2);
  }
}

function drawTree(ctx, x,y,s=1){
  // trunk
  const tw = (10*s)|0, th = (18*s)|0;
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x, y, tw, th);
  ctx.fillStyle = "#7a5330";
  ctx.fillRect(x+2, y+2, tw-4, th-4);
  // canopy (soft)
  const cw = (44*s)|0, ch = (30*s)|0;
  drawDither(ctx, x - (cw/2|0) + (tw/2|0), y - ch + 6, cw, ch, "#4f7f3f", "rgba(255,255,255,.03)", 10);
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(x - (cw/2|0) + (tw/2|0) + 10, y - ch + 12, cw-20, 3);
}

function drawLamp(ctx, x,y){
  // pole
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fillRect(x, y-30, 4, 30);
  // lamp head
  ctx.fillStyle = "rgba(255,220,140,.16)";
  ctx.fillRect(x-4, y-38, 12, 10);
  // glow
  ctx.fillStyle = "rgba(255,220,140,.05)";
  ctx.fillRect(x-22, y-60, 48, 56);
}

function drawBench(ctx, x,y){
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x, y, 44, 12);
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x+2, y+2, 40, 8);
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(x+6, y-10, 32, 10);
}

function drawYard(ctx, y){

function drawMailbox(ctx, x,y){
  // post
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x+6, y+10, 4, 14);
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(x+7, y+11, 2, 12);
  // box
  ctx.fillStyle = "rgba(138,46,255,.12)";
  ctx.fillRect(x, y, 18, 12);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x, y, 18, 3);
  // flag
  ctx.fillStyle = "rgba(255,230,150,.12)";
  ctx.fillRect(x+16, y+2, 2, 8);
}
  if (!y) return;
  if (y.kind === "aptYard"){
    // lawn
    drawDither(ctx, y.x, y.y, y.w, y.h, "#73a85a", "rgba(0,0,0,.03)", 12);
    // hedge line
    ctx.fillStyle = "rgba(0,0,0,.16)";
    ctx.fillRect(y.x, y.y, y.w, 6);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fillRect(y.x+10, y.y+2, y.w-20, 2);
    // fence pickets at bottom
    ctx.fillStyle = "rgba(255,255,255,.08)";
    for (let xx=y.x+10; xx<y.x+y.w-10; xx+=16) ctx.fillRect(xx, y.y+y.h-10, 6, 10);
  } else if (y.kind === "shopFront"){
    drawDither(ctx, y.x, y.y, y.w, y.h, "#b9b2a6", "rgba(0,0,0,.05)", 12);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.fillRect(y.x, y.y+y.h-6, y.w, 6);
  } else if (y.kind === "houseYard"){
    // slightly warmer lawn, little fence hint
    drawDither(ctx, y.x, y.y, y.w, y.h, "#78ad5f", "rgba(0,0,0,.03)", 14);
    ctx.fillStyle = "rgba(0,0,0,.10)";
    ctx.fillRect(y.x, y.y, y.w, 4);
    // tiny picket suggestion
    ctx.fillStyle = "rgba(255,255,255,.07)";
    for (let xx=y.x+8; xx<y.x+y.w-8; xx+=18) ctx.fillRect(xx, y.y+y.h-9, 6, 9);
  }

}
