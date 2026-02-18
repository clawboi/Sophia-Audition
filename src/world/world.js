// NPC City — World (Townhome District v1: layout-first, no overlap, solid buildings)
// Drop-in replacement for world.js ONLY.
//
// Built to match your reference vibe:
// - Central green + curvy paths
// - Townhome blocks surrounding green with alleys between
// - Parking band on one edge
// - Pool + tennis + management building cluster
// - 3 exits (future district transitions)
// - Minimal props (layout > decoration)
// - Collisions: buildings + fences + tree trunks (so you walk AROUND things, not over them)
//
// Notes:
// - Bush "slowdown" needs support in your movement code. I expose `this.slowZones`
//   (engine can ignore it safely). If you want slowdown now, paste your movement code next.

export class World {
  constructor(){
    this.w = 3000;
    this.h = 1800;

    this.spawns = {
      actor:  { x: 560, y: 980, area:"Briarleaf Townhomes" },
      thug:   { x: 620, y: 980, area:"Briarleaf Townhomes" },
      police: { x: 680, y: 980, area:"Briarleaf Townhomes" },
    };

    // Collections
    this.buildings = [];
    this.yards = [];
    this.props = [];
    this.solids = [];
    this.slowZones = []; // optional; engine may ignore

    const rng = makeRng(19200);

    // ===== Layout blocks (big shapes) =====
    this.green = { x: 980, y: 520, w: 1040, h: 760, r: 180 }; // central lawn
    this.pool  = { x: 2050, y: 1080, w: 360, h: 220, r: 26 };
    this.tennis= { x: 2050, y: 820,  w: 360, h: 220, r: 26 };

    // Roads: perimeter + a couple connectors (kept simple)
    this.roads = buildTownhomeRoads(this.w, this.h, this.green);

    // Townhome blocks around the green (long building blocks)
    buildTownhomeBlocks({
      green: this.green,
      addBuilding: (b)=>this.buildings.push(b),
      addYard: (y)=>this.yards.push(y),
      addFence: (f)=>this.solids.push(f),
      addDoor:  (d)=>{ this.doors.push(d); },
      rng
    });

    // Pool / Tennis / Management cluster (SE)
    buildAmenities({
      pool: this.pool,
      tennis: this.tennis,
      addBuilding: (b)=>this.buildings.push(b),
      addProp: (p)=>this.props.push(p),
      addSolid: (s)=>this.solids.push(s),
    });

    // Parking band (south edge) + lots (visual), with a few car silhouettes (non-solid for now)
    buildParkingBand({
      W: this.w,
      H: this.h,
      addProp: (p)=>this.props.push(p),
      addSolid: (s)=>this.solids.push(s),
    });

    // Minimal trees + a few bushes (bushes are slowZones, not solids)
    addMinimalNature({
      rng,
      green: this.green,
      pool: this.pool,
      tennis: this.tennis,
      addProp: (p)=>this.props.push(p),
      addSolid: (s)=>this.solids.push(s),
      addSlow: (z)=>this.slowZones.push(z),
    });

    // Doors + landmarks for "Press E" later
    this.doors = [];
    addDoorsForBuildings(this.buildings, this.doors);

    this.landmarks = [
      { id:"green", x: this.green.x + this.green.w*0.52, y: this.green.y + 18, text:"Central Green", hint:"Walk" },
      { id:"pool",  x: this.pool.x + 40,  y: this.pool.y - 12,  text:"Pool", hint:"Swim (soon)" },
      { id:"tennis",x: this.tennis.x+40,  y: this.tennis.y - 12,text:"Tennis", hint:"Play (soon)" },
      { id:"mgmt",  x: 2260, y: 1320, text:"Management", hint:"Missions (soon)" },

      // Exits (district transitions)
      { id:"exit_w", x: 120,  y: 980,  text:"Exit West", hint:"Downtown (soon)" },
      { id:"exit_n", x: 1500, y: 120,  text:"Exit North", hint:"Boulevard (soon)" },
      { id:"exit_e", x: 2880, y: 720,  text:"Exit East", hint:"Apartments (soon)" },
    ];

    // Collisions: buildings + fences + tree trunks + amenity fences + parking curbs
    // Buildings: inset slightly so movement feels clean
    for (const b of this.buildings){
      this.solids.push({ x: b.x+8, y: b.y+10, w: b.w-16, h: b.h-18 });
    }

    // Keep player inside world bounds
    this.solids.push({ x: -200, y: -200, w: this.w+400, h: 180, tag:"bounds" });              // top
    this.solids.push({ x: -200, y: this.h+20, w: this.w+400, h: 180, tag:"bounds" });         // bottom
    this.solids.push({ x: -200, y: -200, w: 180, h: this.h+400, tag:"bounds" });              // left
    this.solids.push({ x: this.w+20, y: -200, w: 180, h: this.h+400, tag:"bounds" });         // right
  }

  getSpawn(role){ return this.spawns[role] || this.spawns.actor; }

  hitsSolid(rect){
    for (const s of this.solids){
      if (aabb(rect, s)) return true;
    }
    return false;
  }

  nearestLandmark(px, py, radius = 72){
    let best = null;
    let bestD2 = radius * radius;
    for (const lm of this.landmarks){
      const dx = lm.x - px, dy = lm.y - py;
      const d2 = dx*dx + dy*dy;
      if (d2 <= bestD2){ bestD2 = d2; best = lm; }
    }
    return best;
  }

  // Optional helper: returns slowdown factor (1 = normal, <1 slower)
  // Only used if your movement code calls it.
  slowFactorAt(px, py){
    let f = 1;
    for (const z of this.slowZones){
      if (px>=z.x && px<=z.x+z.w && py>=z.y && py<=z.y+z.h){
        f = Math.min(f, z.f || 0.6);
      }
    }
    return f;
  }

  draw(ctx, cam){
    ctx.fillStyle = "#07070b";
    ctx.fillRect(0, 0, cam.vw, cam.vh);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    // Base ground
    drawGround(ctx, 0, 0, this.w, this.h);

    // Central green + paths
    drawGreen(ctx, this.green);
    drawGreenPaths(ctx, this.green);

    // Roads + sidewalks (on top of grass)
    drawRoads(ctx, this.roads);

    // Parking band (visual only layer is props; curbs are solids)
    // (already built into props/solids)

    // Amenities (pool/tennis) base pads
    drawAmenityPads(ctx, this.pool, this.tennis);

    // Yards (small lawns around buildings)
    for (const y of this.yards) drawYard(ctx, y);

    // Buildings (2.5D: draw shadow first)
    for (const b of this.buildings){
      drawBuildingShadow(ctx, b);
      if (b.kind === "townhome") drawTownhomeBlock(ctx, b);
      if (b.kind === "mgmt")     drawMgmt(ctx, b);
      if (b.kind === "club")     drawClubhouse(ctx, b);
    }

    // Props depth sort
    const propsSorted = [...this.props].sort((a,b)=>(a.baseY||a.y)-(b.baseY||b.y));
    for (const pr of propsSorted){
      if (pr.type === "tree")    drawTree(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "bush")    drawBush(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "lamp")    drawLamp(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "bench")   drawBench(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "dumpster")drawDumpster(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "car")     drawCar(ctx, pr.x, pr.y, pr.s||1, pr.c||0);
      if (pr.type === "sign")    drawSign(ctx, pr.x, pr.y, pr.s||1, pr.t||"");
    }

    // Landmark text only near player is handled by UI; here we keep it subtle:
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = "rgba(0,0,0,.35)";
    for (const lm of this.landmarks) ctx.fillText(lm.text, lm.x, lm.y);

    ctx.restore();
  }

  drawAbove(){ /* intentionally empty */ }
}

/* ===================== Roads ===================== */

function buildTownhomeRoads(W, H, green){
  const asphalt = [];
  const sidewalk = [];
  const marks = [];

  const addRoad = (x,y,w,h,r=26)=>{
    sidewalk.push({ x:x-16, y:y-16, w:w+32, h:h+32, r:r+12 });
    asphalt.push ({ x, y, w, h, r });
  };

  // Perimeter-ish road loop (top / left curve feel / bottom)
  addRoad(220, 260, 2560, 160, 30);          // north
  addRoad(160, 420, 220, 1080, 44);          // west vertical (slightly wider curve vibe)
  addRoad(220, 1500, 2560, 160, 30);         // south
  addRoad(2680, 420, 220, 920, 44);          // east vertical

  // Two internal connectors (to make it feel like a complex)
  addRoad(860, 740, 1240, 140, 26);          // mid connector
  addRoad(1440, 920, 180, 520, 26);          // down to amenities

  // Lane marks (minimal)
  for (let i=0;i<28;i++) marks.push({ x: 300 + i*88, y: 340, w: 34, h: 4 });
  for (let i=0;i<26;i++) marks.push({ x: 300 + i*88, y: 1580, w: 34, h: 4 });
  for (let i=0;i<14;i++) marks.push({ x: 1518, y: 980 + i*58, w: 4, h: 26 });

  return { asphalt, sidewalk, marks, driveways: [] };
}

/* ===================== Townhome Blocks ===================== */

function buildTownhomeBlocks({ green, addBuilding, addYard, addFence, rng }){
  // Build 4 long blocks around the green with alleys between them.
  // Each block also gets small yard patches (visual) and fences (solids) to keep the complex readable.

  const blocks = [
    // North row (facing green)
    { x: green.x-120, y: green.y-240, w: green.w+240, h: 150, kind:"townhome", doors:"south" },
    // South row
    { x: green.x-120, y: green.y+green.h+90, w: green.w+240, h: 150, kind:"townhome", doors:"north" },
    // West row
    { x: green.x-260, y: green.y-40, w: 170, h: green.h+80, kind:"townhome", doors:"east" },
    // East row
    { x: green.x+green.w+90, y: green.y-40, w: 170, h: green.h+80, kind:"townhome", doors:"west" },
  ];

  // Split each long block into segments with alley gaps (no overlap guaranteed)
  for (const b of blocks){
    const segments = (b.w > b.h) ? 3 : 2;
    if (b.w > b.h){
      const segW = (b.w - 2*70) / segments;
      for (let i=0;i<segments;i++){
        const x = b.x + i*(segW+70);
        addBuilding({ kind:"townhome", x: Math.round(x), y:b.y, w: Math.round(segW), h:b.h, doors:b.doors, variant:i%3 });
        addYard({ x: Math.round(x)+12, y:b.y-34, w: Math.round(segW)-24, h: 26 });
        addYard({ x: Math.round(x)+12, y:b.y+b.h+8, w: Math.round(segW)-24, h: 26 });
        // fences behind blocks (thin solids)
        addFence({ x: Math.round(x)+6, y:b.y-8, w: Math.round(segW)-12, h: 8, tag:"fence" });
        addFence({ x: Math.round(x)+6, y:b.y+b.h, w: Math.round(segW)-12, h: 8, tag:"fence" });
      }
    } else {
      const segH = (b.h - 70) / segments;
      for (let i=0;i<segments;i++){
        const y = b.y + i*(segH+70);
        addBuilding({ kind:"townhome", x:b.x, y: Math.round(y), w:b.w, h: Math.round(segH), doors:b.doors, variant:i%3 });
        addYard({ x: b.x-34, y: Math.round(y)+12, w: 26, h: Math.round(segH)-24 });
        addYard({ x: b.x+b.w+8, y: Math.round(y)+12, w: 26, h: Math.round(segH)-24 });
        addFence({ x: b.x-8, y: Math.round(y)+6, w: 8, h: Math.round(segH)-12, tag:"fence" });
        addFence({ x: b.x+b.w, y: Math.round(y)+6, w: 8, h: Math.round(segH)-12, tag:"fence" });
      }
    }
  }

  // A few additional internal smaller buildings near entries (keeps it “complex-like”)
  addBuilding({ kind:"club", x: green.x-260, y: green.y+green.h+10, w: 210, h: 120, doors:"north" });
  addBuilding({ kind:"club", x: green.x+green.w+50, y: green.y-170, w: 210, h: 120, doors:"south" });

  // Dumpster area (SW corner near parking)
  // (visual prop, plus a small fence solid around it so it feels like an enclosure)
  // We'll place props in addMinimalNature to keep all props together.
}

/* ===================== Amenities ===================== */

function buildAmenities({ pool, tennis, addBuilding, addProp, addSolid }){
  // Management building by pool
  const mgmt = { kind:"mgmt", x: pool.x+40, y: pool.y+260, w: 280, h: 140, doors:"north" };
  addBuilding(mgmt);

  // Fence around amenity zone (solid)
  const fence = { x: tennis.x-34, y: tennis.y-40, w: 430, h: 620, tag:"fence" };
  addSolid({ x: fence.x, y: fence.y, w: fence.w, h: 12, tag:"fence" });
  addSolid({ x: fence.x, y: fence.y+fence.h-12, w: fence.w, h: 12, tag:"fence" });
  addSolid({ x: fence.x, y: fence.y, w: 12, h: fence.h, tag:"fence" });
  addSolid({ x: fence.x+fence.w-12, y: fence.y, w: 12, h: fence.h, tag:"fence" });

  // Gate sign (visual)
  addProp({ type:"sign", x: tennis.x+120, y: tennis.y-58, s: 1, baseY: tennis.y-56, t:"AMENITIES" });

  // benches (visual)
  addProp({ type:"bench", x: pool.x+70, y: pool.y+240, s: 1, baseY: pool.y+242 });
  addProp({ type:"bench", x: tennis.x+290, y: tennis.y+240, s: 1, baseY: tennis.y+242 });
}

function buildParkingBand({ W, H, addProp, addSolid }){
  // Parking lot band along the south road, with curbs as solids
  const lot = { x: 360, y: 1360, w: 1780, h: 240 };
  // Curbs (solids) so it feels defined, but you can still walk in/out from entrances.
  // We'll leave 3 gaps (exits) in the curb.
  const gapW = 120;
  const gaps = [
    { x: lot.x + 260, y: lot.y-6, w: gapW },
    { x: lot.x + 860, y: lot.y-6, w: gapW },
    { x: lot.x + 1460, y: lot.y-6, w: gapW },
  ];

  // Top curb segments
  let cursor = lot.x;
  const curbY = lot.y-6;
  for (const g of gaps){
    if (g.x > cursor){
      addSolid({ x: cursor, y: curbY, w: g.x-cursor, h: 10, tag:"curb" });
    }
    cursor = g.x + g.w;
  }
  if (cursor < lot.x+lot.w){
    addSolid({ x: cursor, y: curbY, w: (lot.x+lot.w)-cursor, h: 10, tag:"curb" });
  }
  // Bottom curb
  addSolid({ x: lot.x, y: lot.y+lot.h-4, w: lot.w, h: 10, tag:"curb" });
  // Left/right curb
  addSolid({ x: lot.x-4, y: lot.y, w: 10, h: lot.h, tag:"curb" });
  addSolid({ x: lot.x+lot.w-6, y: lot.y, w: 10, h: lot.h, tag:"curb" });

  // Painted rows (visual via props cars + a sign)
  addProp({ type:"sign", x: lot.x+20, y: lot.y-24, s: 1, baseY: lot.y-22, t:"PARKING" });

  // A few parked cars (visual only)
  const colors = [0,1,2];
  for (let row=0; row<2; row++){
    for (let i=0;i<10;i++){
      const x = lot.x + 90 + i*160;
      const y = lot.y + 70 + row*110;
      if (i % 3 === 0) addProp({ type:"car", x, y, s: 1, baseY: y+6, c: colors[(i+row)%3] });
    }
  }

  // Dumpster enclosure near SW parking
  addProp({ type:"dumpster", x: lot.x+lot.w+120, y: lot.y+lot.h-30, s: 1, baseY: lot.y+lot.h-28 });
  addSolid({ x: lot.x+lot.w+80, y: lot.y+lot.h-90, w: 120, h: 12, tag:"fence" });
  addSolid({ x: lot.x+lot.w+80, y: lot.y+lot.h-90, w: 12, h: 90, tag:"fence" });
  addSolid({ x: lot.x+lot.w+188, y: lot.y+lot.h-90, w: 12, h: 90, tag:"fence" });
}

/* ===================== Nature / Props ===================== */

function addMinimalNature({ rng, green, pool, tennis, addProp, addSolid, addSlow }){
  // Trees around green (solid trunks)
  const ring = [
    [green.x+120, green.y+80],
    [green.x+green.w-120, green.y+90],
    [green.x+90, green.y+green.h-90],
    [green.x+green.w-90, green.y+green.h-80],
    [green.x+green.w*0.5, green.y+green.h+18],
    [green.x-24, green.y+green.h*0.5],
    [green.x+green.w+24, green.y+green.h*0.5],
  ];
  for (const [x,y] of ring){
    addProp({ type:"tree", x, y, s: 1.05, baseY: y+2 });
    // trunk collision (small)
    addSolid({ x: x-10, y: y-20, w: 20, h: 20, tag:"tree" });
  }

  // A few lamps (non-solid)
  addProp({ type:"lamp", x: green.x+80, y: green.y+green.h*0.5, s: 1, baseY: green.y+green.h*0.5+2 });
  addProp({ type:"lamp", x: green.x+green.w-80, y: green.y+green.h*0.5, s: 1, baseY: green.y+green.h*0.5+2 });

  // Bush slow zones near amenities (optional)
  for (let i=0;i<6;i++){
    const x = tennis.x - 80 + i*70;
    const y = tennis.y + 560 + (i%2)*14;
    addProp({ type:"bush", x, y, s: 1, baseY: y+2 });
    addSlow({ x: x-26, y: y-18, w: 52, h: 36, f: 0.65, tag:"bush" });
  }
}

function addDoorsForBuildings(buildings, doors){
  for (const b of buildings){
    // Door zone centered on the “facing” side
    let dx = b.x + b.w/2 - 18;
    let dy = b.y + b.h - 18;
    if (b.doors === "north") dy = b.y - 18;
    if (b.doors === "south") dy = b.y + b.h - 6;
    if (b.doors === "east")  { dx = b.x + b.w - 6; dy = b.y + b.h*0.5 - 18; }
    if (b.doors === "west")  { dx = b.x - 18;     dy = b.y + b.h*0.5 - 18; }
    doors.push({ id: b.kind, x: Math.round(dx), y: Math.round(dy), w: 36, h: 36, target: b.kind });
  }
}

/* ===================== Drawing ===================== */

function drawGround(ctx, x, y, w, h){
  // gritty LA grass base (not too bright)
  ctx.fillStyle = "#4f6530";
  ctx.fillRect(x, y, w, h);

  // LIGHT noise (performance-friendly)
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#000";
  for (let i=0; i<2800; i++){
    const px = (i*53) % w;
    const py = (i*97) % h;
    if ((i % 2) === 0) ctx.fillRect(x + px, y + py, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawGreen(ctx, g){
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = "#56763a";
  roundRect(ctx, g.x, g.y, g.w, g.h, g.r, true);

  // darker edge vignette
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#000";
  roundRect(ctx, g.x+10, g.y+10, g.w-20, g.h-20, Math.max(20,g.r-24), true);
  ctx.globalAlpha = 1;
}

function drawGreenPaths(ctx, g){
  // Curvy paths: a loop + 2 diagonals (match your screenshot feel)
  ctx.globalAlpha = 0.70;
  ctx.fillStyle = "#d6c7ab";

  // Loop
  roundRect(ctx, g.x+90, g.y+86, g.w-180, g.h-172, Math.max(24,g.r-80), true);

  // Inner grass (carve back)
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = "#56763a";
  roundRect(ctx, g.x+130, g.y+124, g.w-260, g.h-248, Math.max(20,g.r-110), true);

  // Diagonals
  ctx.globalAlpha = 0.68;
  ctx.fillStyle = "#d6c7ab";
  rotRect(ctx, g.x+g.w*0.35, g.y+g.h*0.30, 520, 22, -0.35);
  rotRect(ctx, g.x+g.w*0.55, g.y+g.h*0.62, 540, 22, 0.28);

  ctx.globalAlpha = 1;
}

function drawRoads(ctx, roads){
  // sidewalks first
  for (const s of roads.sidewalk){
    ctx.fillStyle = "#bdb6a8";
    roundRect(ctx, s.x, s.y, s.w, s.h, s.r || 16, true);

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000";
    for (let i=0;i<8;i++){
      ctx.fillRect(s.x + 14 + i*(s.w/8), s.y + 6, 1, s.h-12);
    }
    ctx.globalAlpha = 1;
  }

  // asphalt
  for (const r of roads.asphalt){
    ctx.fillStyle = "#24242c";
    roundRect(ctx, r.x, r.y, r.w, r.h, r.r || 18, true);

    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#000";
    for (let i=0; i<560; i++){
      const px = r.x + ((i*29) % r.w);
      const py = r.y + ((i*71) % r.h);
      if ((i % 3) === 0) ctx.fillRect(px, py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // lane marks
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#efe8d6";
  for (const m of roads.marks) ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.globalAlpha = 1;
}

function drawAmenityPads(ctx, pool, tennis){
  // Tennis pad
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#3f6f66";
  roundRect(ctx, tennis.x, tennis.y, tennis.w, tennis.h, tennis.r, true);
  // Court lines (simple)
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#fff";
  roundRect(ctx, tennis.x+24, tennis.y+24, tennis.w-48, tennis.h-48, 12, false);
  ctx.globalAlpha = 1;

  // Pool deck
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#cdbb9c";
  roundRect(ctx, pool.x-18, pool.y-18, pool.w+36, pool.h+36, pool.r+18, true);

  // Pool water
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#1d6b66";
  roundRect(ctx, pool.x, pool.y, pool.w, pool.h, pool.r, true);

  // water highlights (light)
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  for (let i=0; i<22; i++){
    const px = pool.x + 20 + (i*37) % (pool.w-40);
    const py = pool.y + 18 + (i*19) % (pool.h-36);
    ctx.fillRect(px, py, 36, 2);
  }
  ctx.globalAlpha = 1;
}

function drawYard(ctx, y){
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#526f37";
  roundRect(ctx, y.x, y.y, y.w, y.h, 14, true);
  ctx.globalAlpha = 1;
}

function drawBuildingShadow(ctx, b){
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  roundRect(ctx, b.x+10, b.y+b.h-10, b.w-20, 14, 10, true);
  ctx.globalAlpha = 1;
}

function drawTownhomeBlock(ctx, b){
  const { x,y,w,h, variant=0 } = b;
  ctx.fillStyle = "#b9b0a1";
  roundRect(ctx, x, y, w, h, 14, true);

  // roof band
  ctx.fillStyle = "rgba(0,0,0,.18)";
  roundRect(ctx, x+10, y+10, w-20, 22, 10, true);

  // repeating windows/doors to imply multiple units
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#13131a";
  const units = Math.max(3, Math.floor(w / 170));
  const step = w / units;
  for (let i=0;i<units;i++){
    const ux = x + i*step + 18;
    roundRect(ctx, ux, y+54, 44, 30, 8, true);
    roundRect(ctx, ux, y+h-54, 34, 36, 8, true);
  }
  ctx.globalAlpha = 1;

  // subtle grime base
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000";
  roundRect(ctx, x+8, y+h-18, w-16, 12, 8, true);
  ctx.globalAlpha = 1;

  // slight variant accent
  const accents = ["rgba(138,46,255,.04)","rgba(138,46,255,.06)","rgba(138,46,255,.08)"];
  ctx.fillStyle = accents[variant%3];
  ctx.fillRect(x, y, w, 10);
}

function drawMgmt(ctx, b){
  const { x,y,w,h } = b;
  ctx.fillStyle = "#c6b89a";
  roundRect(ctx, x, y, w, h, 16, true);

  ctx.globalAlpha = 0.20;
  ctx.fillStyle = "#000";
  roundRect(ctx, x+18, y+40, w-36, h-66, 12, true);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(138,46,255,.16)";
  roundRect(ctx, x+16, y+16, w-32, 18, 10, true);
  ctx.globalAlpha = 1;
}

function drawClubhouse(ctx, b){
  const { x,y,w,h } = b;
  ctx.fillStyle = "#bfb3a0";
  roundRect(ctx, x, y, w, h, 16, true);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  roundRect(ctx, x+10, y+10, w-20, 20, 10, true);
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#13131a";
  roundRect(ctx, x+18, y+44, w-36, h-64, 12, true);
  ctx.globalAlpha = 1;
}

/* ===== Props ===== */

function drawTree(ctx, x, y, s){
  const trunkW = 12*s, trunkH = 34*s;
  ctx.fillStyle = "#563721";
  roundRect(ctx, x - trunkW/2, y - trunkH, trunkW, trunkH, 8*s, true);

  const topY  = y - 44*s;
  const midY  = y - 30*s;
  const baseY = y - 16*s;

  ctx.fillStyle = "#2f4e22";
  blob(ctx, x, baseY, 22*s, 12*s, 0.06);
  blob(ctx, x-14*s, baseY+2*s, 16*s, 10*s, -0.08);
  blob(ctx, x+14*s, baseY+2*s, 16*s, 10*s, 0.10);

  ctx.fillStyle = "#3a5b2a";
  blob(ctx, x, midY, 30*s, 18*s, 0.06);
  blob(ctx, x-18*s, midY+2*s, 20*s, 14*s, -0.10);
  blob(ctx, x+18*s, midY+2*s, 20*s, 14*s, 0.10);

  ctx.fillStyle = "#476b33";
  blob(ctx, x, topY, 24*s, 14*s, 0.06);

  // ground shadow
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 14*s, 6*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBush(ctx, x,y,s){
  ctx.fillStyle = "#435a2c";
  blob(ctx, x, y, 26*s, 16*s, 0.08);
  ctx.fillStyle = "#355024";
  blob(ctx, x+14*s, y+3*s, 20*s, 12*s, 0.12);
  ctx.fillStyle = "#4f6a34";
  blob(ctx, x-12*s, y+2*s, 22*s, 14*s, -0.06);
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y+1*s, 28*s, 16*s, 0.08, 0, Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLamp(ctx, x, y, s){
  const poleH = 52*s;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#2a2523";
  roundRect(ctx, x-3*s, y-poleH, 6*s, poleH, 4*s, true);

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#3b3330";
  roundRect(ctx, x-10*s, y-poleH-8*s, 20*s, 10*s, 6*s, true);

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(x, y-poleH+12*s, 22*s, 14*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBench(ctx, x, y, s){
  const w = 46*s, h = 10*s;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#5a3a24";
  roundRect(ctx, x-w/2, y-h, w, h, 6, true);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.fillRect(x-w/2+6, y-h+3, w-12, 2);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#3d2416";
  ctx.fillRect(x-w/2+6, y-h+8, 4, 10*s);
  ctx.fillRect(x+w/2-10, y-h+8, 4, 10*s);
  ctx.globalAlpha = 1;
}

function drawDumpster(ctx, x, y, s){
  const w=42*s, h=22*s;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#2b3b2f";
  roundRect(ctx, x-w/2, y-h, w, h, 6, true);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  roundRect(ctx, x-w/2+4, y-h+4, w-8, 6, 4, true);
  ctx.globalAlpha = 1;
}

function drawCar(ctx, x, y, s, c){
  const colors = ["#3a3a42","#4a2b2b","#2b3b4a"];
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = colors[c%colors.length];
  roundRect(ctx, x-26*s, y-12*s, 52*s, 24*s, 10*s, true);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  roundRect(ctx, x-16*s, y-10*s, 32*s, 10*s, 8*s, true);
  ctx.globalAlpha = 1;
}

function drawSign(ctx, x, y, s, t){
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#2a2523";
  roundRect(ctx, x-2*s, y-22*s, 4*s, 22*s, 3*s, true);
  ctx.fillStyle = "rgba(138,46,255,.14)";
  roundRect(ctx, x-28*s, y-38*s, 56*s, 14*s, 8*s, true);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.font = "10px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  if (t) ctx.fillText(t, x-24*s, y-27*s);
  ctx.globalAlpha = 1;
}

/* ===================== Geometry / helpers ===================== */

function aabb(a,b){
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function roundRect(ctx, x, y, w, h, r, fill){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  if (fill) ctx.fill();
  else ctx.stroke();
}

function blob(ctx, cx, cy, rx, ry, rot = 0){
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI*2);
  ctx.fill();
}

function rotRect(ctx, cx, cy, w, h, ang){
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w, h, Math.min(14, h/2));
  ctx.fill();
  ctx.restore();
}

function makeRng(seed){
  let s = seed >>> 0;
  return function(){
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}
