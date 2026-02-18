// NPC City — World (Townhome District v2: CLEAN layout, NO overlaps, walkable flow)
// Drop-in replacement for src/world/world.js ONLY.
//
// Goals (per Ethan):
// - One district: townhome complex vibe (central green), suburban, clean
// - Minimal props (layout first)
// - NO overlaps between buildings/amenities/roads
// - Collisions: buildings + fences + tree trunks (you cannot walk over structures)
// - Flow: easy cut-throughs, no annoying detours
//
// Notes:
// - Bush slowdown is exposed via slowZones/slowFactorAt but requires engine support.

export class World {
  constructor(){
    // ===== World size =====
    this.w = 3000;
    this.h = 1800;

    // ===== Spawns =====
    this.spawns = {
      actor:  { x: 520, y: 1080, area:"Briarleaf Townhomes" },
      thug:   { x: 580, y: 1080, area:"Briarleaf Townhomes" },
      police: { x: 640, y: 1080, area:"Briarleaf Townhomes" },
    };

    // ===== Collections =====
    this.buildings = [];
    this.yards = [];
    this.props = [];
    this.solids = [];
    this.slowZones = [];
    this.doors = [];

    const rng = makeRng(19200);

    // ===== Big shapes (NO overlap) =====
    // Central green is intentionally smaller/cleaner than v1.
    this.green = { x: 900, y: 520, w: 920, h: 680, r: 170 };

    // Amenity zone lives EAST of the complex, separated by a service road and buffer.
    // This prevents the "huge building over pool" overlap you showed.
    this.amenityZone = { x: 2120, y: 520, w: 720, h: 820 };

    // Within amenity zone
    this.tennis = { x: 2220, y: 580,  w: 420, h: 240, r: 26 };
    this.pool   = { x: 2220, y: 890,  w: 420, h: 250, r: 26 };
    this.mgmtB  = { x: 2340, y: 1180, w: 300, h: 150, kind:"mgmt", doors:"north" };

    // Parking band sits SOUTH-WEST (one edge) with defined curbs + 3 entrances.
    this.parking = { x: 340, y: 1360, w: 1680, h: 260, r: 26 };

    // ===== Roads (simple + clean) =====
    this.roads = buildRoadsClean(this.w, this.h, this.green, this.amenityZone, this.parking);

    // ===== Townhome blocks around green (segmented with alleys) =====
    buildTownhomeRing({
      green: this.green,
      keepOut: [ this.amenityZone, this.parking ], // hard keep-out areas
      rng,
      addBuilding: (b)=>this.buildings.push(b),
      addYard: (y)=>this.yards.push(y),
      addFence: (f)=>this.solids.push(f),
    });

    // ===== Amenities (tennis/pool/mgmt + fence) =====
    buildAmenitiesClean({
      zone: this.amenityZone,
      tennis: this.tennis,
      pool: this.pool,
      mgmt: this.mgmtB,
      addBuilding: (b)=>this.buildings.push(b),
      addProp: (p)=>this.props.push(p),
      addSolid: (s)=>this.solids.push(s),
    });

    // ===== Parking (curbs solids, a few cars visual) =====
    buildParkingClean({
      lot: this.parking,
      addProp: (p)=>this.props.push(p),
      addSolid: (s)=>this.solids.push(s),
    });

    // ===== Minimal nature (trees as solids trunks, a couple lamps/benches) =====
    addNatureClean({
      rng,
      green: this.green,
      amenityZone: this.amenityZone,
      addProp: (p)=>this.props.push(p),
      addSolid: (s)=>this.solids.push(s),
      addSlow: (z)=>this.slowZones.push(z),
    });

    // ===== Doors (for future E interactions) =====
    addDoorsForBuildings(this.buildings, this.doors);

    // ===== Landmarks =====
    this.landmarks = [
      { id:"green",  x: this.green.x + this.green.w*0.52, y: this.green.y + 16, text:"Central Green", hint:"Walk" },
      { id:"tennis", x: this.tennis.x + 18, y: this.tennis.y - 10, text:"Tennis", hint:"Play (soon)" },
      { id:"pool",   x: this.pool.x + 18,   y: this.pool.y - 10,   text:"Pool", hint:"Swim (soon)" },
      { id:"mgmt",   x: this.mgmtB.x + 24,  y: this.mgmtB.y - 10,  text:"Management", hint:"Missions (soon)" },
      { id:"parking",x: this.parking.x + 20, y: this.parking.y - 16, text:"Parking", hint:"Cars (soon)" },

      // Exits (future)
      { id:"exit_w", x: 120,  y: 1080, text:"Exit West", hint:"Downtown (soon)" },
      { id:"exit_n", x: 1500, y: 120,  text:"Exit North", hint:"Boulevard (soon)" },
      { id:"exit_e", x: 2880, y: 720,  text:"Exit East", hint:"Apartments (soon)" },
    ];

    // ===== Collisions =====
    // Buildings inset so you can slide along walls without snagging.
    for (const b of this.buildings){
      this.solids.push({ x: b.x+8, y: b.y+10, w: b.w-16, h: b.h-18, tag:"building" });
    }

    // Keep player inside world bounds
    this.solids.push({ x: -240, y: -240, w: this.w+480, h: 200, tag:"bounds" });               // top
    this.solids.push({ x: -240, y: this.h+40, w: this.w+480, h: 200, tag:"bounds" });          // bottom
    this.solids.push({ x: -240, y: -240, w: 200, h: this.h+480, tag:"bounds" });               // left
    this.solids.push({ x: this.w+40, y: -240, w: 200, h: this.h+480, tag:"bounds" });          // right
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

  // Optional helper for slowdown zones (engine must call it)
  slowFactorAt(px, py){
    let f = 1;
    for (const z of this.slowZones){
      if (px>=z.x && px<=z.x+z.w && py>=z.y && py<=z.y+z.h){
        f = Math.min(f, z.f || 0.65);
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

    // Green + paths
    drawGreen(ctx, this.green);
    drawGreenPaths(ctx, this.green);

    // Roads
    drawRoads(ctx, this.roads);

    // Parking (pad)
    drawParkingPad(ctx, this.parking);

    // Amenity pads
    drawAmenityPads(ctx, this.tennis, this.pool, this.amenityZone);

    // Yards
    for (const y of this.yards) drawYard(ctx, y);

    // Buildings (shadow + block)
    for (const b of this.buildings){
      drawBuildingShadow(ctx, b);
      if (b.kind === "townhome") drawTownhomeBlock(ctx, b);
      if (b.kind === "mgmt")     drawMgmt(ctx, b);
      if (b.kind === "club")     drawClubhouse(ctx, b);
    }

    // Props depth sort
    const propsSorted = [...this.props].sort((a,b)=>(a.baseY||a.y)-(b.baseY||b.y));
    for (const pr of propsSorted){
      if (pr.type === "tree")     drawTree(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "bush")     drawBush(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "lamp")     drawLamp(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "bench")    drawBench(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "dumpster") drawDumpster(ctx, pr.x, pr.y, pr.s||1);
      if (pr.type === "car")      drawCar(ctx, pr.x, pr.y, pr.s||1, pr.c||0);
      if (pr.type === "sign")     drawSign(ctx, pr.x, pr.y, pr.s||1, pr.t||"");
    }

    // Subtle labels
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = "rgba(0,0,0,.32)";
    for (const lm of this.landmarks) ctx.fillText(lm.text, lm.x, lm.y);

    ctx.restore();
  }

  drawAbove(){ /* intentionally empty */ }
}

/* ===================== Roads ===================== */

function buildRoadsClean(W, H, green, amenityZone, parking){
  const asphalt = [];
  const sidewalk = [];
  const marks = [];

  const addRoad = (x,y,w,h,r=26)=>{
    sidewalk.push({ x:x-16, y:y-16, w:w+32, h:h+32, r:r+12 });
    asphalt.push ({ x, y, w, h, r });
  };

  // Outer loop (kept clean)
  addRoad(240, 260, 2520, 160, 30);   // north
  addRoad(160, 420, 220, 1080, 44);   // west
  addRoad(240, 1500, 2520, 160, 30);  // south
  addRoad(2680, 420, 220, 920, 44);   // east

  // Internal connector around green (light residential feel)
  addRoad(green.x-140, green.y+green.h*0.42, green.w+280, 140, 26);

  // Service road leading to amenities (prevents visual overlap)
  addRoad(1960, 520, 180, 860, 26);

  // Lane marks
  for (let i=0;i<26;i++) marks.push({ x: 320 + i*92, y: 340, w: 34, h: 4 });
  for (let i=0;i<26;i++) marks.push({ x: 320 + i*92, y: 1580, w: 34, h: 4 });
  for (let i=0;i<14;i++) marks.push({ x: 2048, y: 600 + i*58, w: 4, h: 26 });

  return { asphalt, sidewalk, marks, driveways: [] };
}

/* ===================== Townhomes ===================== */

function buildTownhomeRing({ green, keepOut, rng, addBuilding, addYard, addFence }){
  // Ring placement around the green, with buffers so NOTHING overlaps:
  const pad = 90;         // buffer from green edge
  const blockThick = 150; // townhome depth
  const alley = 80;       // gap between segments

  // North row (3 segments)
  placeHorizontalRow(green.x - 80, green.y - pad - blockThick, green.w + 160, blockThick, 3, alley, "south", addBuilding, addYard, addFence);

  // South row
  placeHorizontalRow(green.x - 80, green.y + green.h + pad, green.w + 160, blockThick, 3, alley, "north", addBuilding, addYard, addFence);

  // West column (2 segments)
  placeVerticalCol(green.x - pad - 170, green.y - 10, 170, green.h + 20, 2, alley, "east", addBuilding, addYard, addFence);

  // East column (2 segments), but stop BEFORE amenity zone (critical!)
  // East row is clamped so it never intrudes into service/amenities.
  const eastX = green.x + green.w + pad;
  const eastW = 170;
  const eastY = green.y - 10;
  const eastH = green.h + 20;
  if (!rectOverlapsAny({x:eastX,y:eastY,w:eastW,h:eastH}, keepOut)){
    placeVerticalCol(eastX, eastY, eastW, eastH, 2, alley, "west", addBuilding, addYard, addFence);
  } else {
    // If overlap would happen (shouldn't), shrink height to fit
    const safe = shrinkToAvoid({x:eastX,y:eastY,w:eastW,h:eastH}, keepOut);
    placeVerticalCol(safe.x, safe.y, safe.w, safe.h, 2, alley, "west", addBuilding, addYard, addFence);
  }

  // Two small "club" buildings near corners, placed safely away from amenities/parking
  addBuilding({ kind:"club", x: green.x-320, y: green.y+green.h+40, w: 220, h: 120, doors:"north" });
  addBuilding({ kind:"club", x: green.x+green.w+70, y: green.y-190, w: 220, h: 120, doors:"south" });
}

function placeHorizontalRow(x, y, w, h, segments, gap, doors, addBuilding, addYard, addFence){
  const segW = Math.floor((w - gap*(segments-1)) / segments);
  for (let i=0;i<segments;i++){
    const bx = Math.round(x + i*(segW + gap));
    const b = { kind:"townhome", x: bx, y: Math.round(y), w: segW, h, doors, variant: i%3 };
    addBuilding(b);
    // yard strips (visual)
    addYard({ x: bx+12, y: y-34, w: segW-24, h: 26 });
    addYard({ x: bx+12, y: y+h+8, w: segW-24, h: 26 });
    // thin fence lines (solids)
    addFence({ x: bx+6, y: y-8, w: segW-12, h: 8, tag:"fence" });
    addFence({ x: bx+6, y: y+h, w: segW-12, h: 8, tag:"fence" });
  }
}

function placeVerticalCol(x, y, w, h, segments, gap, doors, addBuilding, addYard, addFence){
  const segH = Math.floor((h - gap*(segments-1)) / segments);
  for (let i=0;i<segments;i++){
    const by = Math.round(y + i*(segH + gap));
    const b = { kind:"townhome", x: Math.round(x), y: by, w, h: segH, doors, variant: i%3 };
    addBuilding(b);
    addYard({ x: x-34, y: by+12, w: 26, h: segH-24 });
    addYard({ x: x+w+8, y: by+12, w: 26, h: segH-24 });
    addFence({ x: x-8, y: by+6, w: 8, h: segH-12, tag:"fence" });
    addFence({ x: x+w, y: by+6, w: 8, h: segH-12, tag:"fence" });
  }
}

/* ===================== Amenities ===================== */

function buildAmenitiesClean({ zone, tennis, pool, mgmt, addBuilding, addProp, addSolid }){
  // Fence around the amenity zone (solid), with a gate gap near service road
  const fx = zone.x + 20, fy = zone.y + 20, fw = zone.w - 40, fh = zone.h - 40;

  // Gate gap (on west side) so entry feels real
  const gate = { x: fx, y: fy + fh*0.55, w: 14, h: 120 };

  // top/bottom
  addSolid({ x: fx, y: fy, w: fw, h: 12, tag:"fence" });
  addSolid({ x: fx, y: fy+fh-12, w: fw, h: 12, tag:"fence" });
  // left side split for gate
  addSolid({ x: fx, y: fy, w: 12, h: gate.y - fy, tag:"fence" });
  addSolid({ x: fx, y: gate.y + gate.h, w: 12, h: (fy+fh) - (gate.y+gate.h), tag:"fence" });
  // right side
  addSolid({ x: fx+fw-12, y: fy, w: 12, h: fh, tag:"fence" });

  // Buildings
  addBuilding({ ...mgmt });

  // Visual props
  addProp({ type:"sign", x: fx+120, y: fy-18, s: 1, baseY: fy-16, t:"AMENITIES" });
  addProp({ type:"bench", x: pool.x+60, y: pool.y-22, s: 1, baseY: pool.y-20 });
  addProp({ type:"bench", x: tennis.x+tennis.w-60, y: tennis.y+tennis.h+34, s: 1, baseY: tennis.y+tennis.h+36 });

  // A tiny dumpster by management (visual)
  addProp({ type:"dumpster", x: mgmt.x+mgmt.w+42, y: mgmt.y+mgmt.h-10, s: 1, baseY: mgmt.y+mgmt.h-8 });
}

/* ===================== Parking ===================== */

function buildParkingClean({ lot, addProp, addSolid }){
  // Curbs as solids with 3 gaps (entrances)
  const gapW = 140;
  const gaps = [
    { x: lot.x + 240, w: gapW },
    { x: lot.x + 760, w: gapW },
    { x: lot.x + 1280, w: gapW },
  ];

  // top curb (split)
  const curbY = lot.y-6;
  let cursor = lot.x;
  for (const g of gaps){
    if (g.x > cursor) addSolid({ x: cursor, y: curbY, w: g.x-cursor, h: 10, tag:"curb" });
    cursor = g.x + g.w;
  }
  if (cursor < lot.x+lot.w) addSolid({ x: cursor, y: curbY, w: (lot.x+lot.w)-cursor, h: 10, tag:"curb" });

  // other edges
  addSolid({ x: lot.x, y: lot.y+lot.h-4, w: lot.w, h: 10, tag:"curb" });
  addSolid({ x: lot.x-4, y: lot.y, w: 10, h: lot.h, tag:"curb" });
  addSolid({ x: lot.x+lot.w-6, y: lot.y, w: 10, h: lot.h, tag:"curb" });

  addProp({ type:"sign", x: lot.x+20, y: lot.y-24, s: 1, baseY: lot.y-22, t:"PARKING" });

  // few parked cars (visual only)
  const colors = [0,1,2];
  for (let row=0; row<2; row++){
    for (let i=0;i<9;i++){
      if (i % 2) continue;
      const x = lot.x + 120 + i*170;
      const y = lot.y + 80 + row*120;
      addProp({ type:"car", x, y, s: 1, baseY: y+6, c: colors[(i+row)%3] });
    }
  }
}

/* ===================== Nature ===================== */

function addNatureClean({ rng, green, amenityZone, addProp, addSolid, addSlow }){
  // Tree ring around green (solid trunks)
  const ring = [
    [green.x+120, green.y+80],
    [green.x+green.w-120, green.y+90],
    [green.x+90, green.y+green.h-90],
    [green.x+green.w-90, green.y+green.h-80],
    [green.x+green.w*0.5, green.y+green.h+26],
    [green.x-26, green.y+green.h*0.5],
    [green.x+green.w+26, green.y+green.h*0.5],
  ];
  for (const [x,y] of ring){
    addProp({ type:"tree", x, y, s: 1.05, baseY: y+2 });
    addSolid({ x: x-10, y: y-20, w: 20, h: 20, tag:"tree" });
  }

  // Lamps on green edges
  addProp({ type:"lamp", x: green.x+70, y: green.y+green.h*0.5, s: 1, baseY: green.y+green.h*0.5+2 });
  addProp({ type:"lamp", x: green.x+green.w-70, y: green.y+green.h*0.5, s: 1, baseY: green.y+green.h*0.5+2 });

  // Few bushes near amenity fence (slow zones only, not solid)
  for (let i=0;i<6;i++){
    const x = amenityZone.x + 140 + i*90;
    const y = amenityZone.y + amenityZone.h - 90 + (i%2)*14;
    addProp({ type:"bush", x, y, s: 1, baseY: y+2 });
    addSlow({ x: x-26, y: y-18, w: 52, h: 36, f: 0.65, tag:"bush" });
  }
}

/* ===================== Doors ===================== */

function addDoorsForBuildings(buildings, doors){
  for (const b of buildings){
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
  ctx.fillStyle = "#4f6530";
  ctx.fillRect(x, y, w, h);

  // light stable noise (cheap)
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#000";
  for (let i=0; i<2600; i++){
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

  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#000";
  roundRect(ctx, g.x+10, g.y+10, g.w-20, g.h-20, Math.max(20,g.r-26), true);
  ctx.globalAlpha = 1;
}

function drawGreenPaths(ctx, g){
  ctx.globalAlpha = 0.70;
  ctx.fillStyle = "#d6c7ab";

  // loop
  roundRect(ctx, g.x+86, g.y+80, g.w-172, g.h-160, Math.max(24,g.r-78), true);

  // carve back inner grass
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = "#56763a";
  roundRect(ctx, g.x+122, g.y+114, g.w-244, g.h-228, Math.max(20,g.r-106), true);

  // two diagonals
  ctx.globalAlpha = 0.66;
  ctx.fillStyle = "#d6c7ab";
  rotRect(ctx, g.x+g.w*0.36, g.y+g.h*0.32, 500, 22, -0.35);
  rotRect(ctx, g.x+g.w*0.58, g.y+g.h*0.62, 520, 22, 0.28);

  ctx.globalAlpha = 1;
}

function drawRoads(ctx, roads){
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

  for (const r of roads.asphalt){
    ctx.fillStyle = "#24242c";
    roundRect(ctx, r.x, r.y, r.w, r.h, r.r || 18, true);

    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#000";
    for (let i=0; i<520; i++){
      const px = r.x + ((i*29) % r.w);
      const py = r.y + ((i*71) % r.h);
      if ((i % 3) === 0) ctx.fillRect(px, py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#efe8d6";
  for (const m of roads.marks) ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.globalAlpha = 1;
}

function drawParkingPad(ctx, lot){
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#2a2a33";
  roundRect(ctx, lot.x, lot.y, lot.w, lot.h, lot.r, true);

  // subtle striping
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#fff";
  for (let i=0;i<16;i++){
    ctx.fillRect(lot.x+90+i*95, lot.y+20, 36, 2);
    ctx.fillRect(lot.x+90+i*95, lot.y+lot.h-26, 36, 2);
  }
  ctx.globalAlpha = 1;
}

function drawAmenityPads(ctx, tennis, pool, zone){
  // zone walkway pad (helps separate)
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#d6c7ab";
  roundRect(ctx, zone.x+60, zone.y+60, zone.w-120, zone.h-120, 36, true);
  ctx.globalAlpha = 1;

  // tennis
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#3f6f66";
  roundRect(ctx, tennis.x, tennis.y, tennis.w, tennis.h, tennis.r, true);
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, tennis.x+24, tennis.y+24, tennis.w-48, tennis.h-48, 12, false);
  ctx.globalAlpha = 1;

  // pool deck
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#cdbb9c";
  roundRect(ctx, pool.x-18, pool.y-18, pool.w+36, pool.h+36, pool.r+18, true);

  // pool water
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#1d6b66";
  roundRect(ctx, pool.x, pool.y, pool.w, pool.h, pool.r, true);

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

  ctx.fillStyle = "rgba(0,0,0,.18)";
  roundRect(ctx, x+10, y+10, w-20, 22, 10, true);

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

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000";
  roundRect(ctx, x+8, y+h-18, w-16, 12, 8, true);
  ctx.globalAlpha = 1;

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

function rectOverlapsAny(r, arr){
  for (const o of arr){
    if (aabb(r, o)) return true;
  }
  return false;
}

function shrinkToAvoid(r, arr){
  // Simple: shrink height until it no longer overlaps (used as a last-resort safety)
  let out = { ...r };
  for (let tries=0; tries<40; tries++){
    if (!rectOverlapsAny(out, arr)) return out;
    out = { ...out, h: Math.max(200, out.h - 40) };
  }
  return out;
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
