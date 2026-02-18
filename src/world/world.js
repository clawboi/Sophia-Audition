export class World {
  constructor(){
    this.w = 2400;
    this.h = 1500;

    this.spawns = {
      actor: { x: 520, y: 820, area:"Sunleaf Suburbs" },
      thug:  { x: 560, y: 820, area:"Sunleaf Suburbs" },
      police:{ x: 600, y: 820, area:"Sunleaf Suburbs" },
    };

    // ====== RIVER + PARK + SUBURBS (spacing-fixed) ======
    // River pushed down so no lots ever sit on it.
    this.river  = { x: 0, y: 1240, w: this.w, h: 210 };
    this.bridge = { x: 1080, y: 1218, w: 240, h: 78 };

    this.park  = buildPark(); // left side, above main streets
    this.roads = buildSuburbRoads(this.w, this.h, this.bridge, this.park);

    // Visible geometry
    this.buildings = [];
    this.yards = [];
    this.props = [];

    const rng = makeRng(1337);

    buildSuburbLots({
      rng,
      riverY: this.river.y,
      park: this.park,
      roads: this.roads,
      addBuilding: (b)=>this.buildings.push(b),
      addYard: (y)=>this.yards.push(y),
      addProp: (p)=>this.props.push(p),
      addDriveway: (d)=>this.roads.driveways.push(d),
    });

    // ====== SOLIDS (collision) ======
    this.solids = [];

    // Buildings block (small inset so you can brush past walls)
    for (const b of this.buildings){
      this.solids.push({ x: b.x+6, y: b.y+6, w: b.w-12, h: b.h-12 });
    }

    // Water blocks, except bridge gap
    this.solids.push({ x: 0, y: this.river.y, w: this.bridge.x-10, h: this.river.h });
    this.solids.push({ x: this.bridge.x+this.bridge.w+10, y: this.river.y, w: this.w-(this.bridge.x+this.bridge.w+10), h: this.river.h });

    // Raised platform landmark
    this.raised = { x: 1760, y: 120, w: 520, h: 95 };
    this.solids.push({ x: this.raised.x, y: this.raised.y, w: this.raised.w, h: this.raised.h });

    this.stairs = [
      { x: 1760, y: 215, w: 150, h: 40 },
      { x: 860,  y: 620, w: 150, h: 40 },
    ];

    this.landmarks = [
      { id:"cottage", x: 330,  y: 410, text:"Cottage",       hint:"Home (soon)" },
      { id:"market",  x: 1010, y: 360, text:"Corner Market", hint:"Snacks (soon)" },
      { id:"studio",  x: 1660, y: 420, text:"Acting Studio", hint:"Audition (soon)" },
      { id:"park",    x: this.park.cx, y: this.park.cy, text:"Sunleaf Park", hint:"Breathe" },
      { id:"bridge",  x: this.bridge.x + 60, y: this.bridge.y - 12, text:"Bridge", hint:"Cross" },
      { id:"culdesac",x: 2140, y: 650, text:"Cul-de-sac",   hint:"Quiet" },
    ];

    // Park dressings (trees/benches/lamps/flowers)
    addParkDressings((p)=>this.props.push(p), rng, this.park);

    // River rocks + reeds (kept ABOVE the river edge so they read clean)
    this.props.push({ type:"rock", x: 520,  y: this.river.y - 10, s: 1.0,  baseY: this.river.y - 10 });
    this.props.push({ type:"rock", x: 1260, y: this.river.y - 8,  s: 1.2,  baseY: this.river.y - 8 });
    this.props.push({ type:"rock", x: 1780, y: this.river.y - 6,  s: 0.95, baseY: this.river.y - 6 });
    for (let i=0;i<22;i++){
      const x = 80 + i*110 + (rng()*30-15);
      const y = this.river.y - 10 + (rng()*10-5);
      this.props.push({ type:"reed", x, y, s: 0.9+rng()*0.5, baseY: y+2 });
    }
  }

  getSpawn(role){ return this.spawns[role] || this.spawns.actor; }

  hitsSolid(rect){
    for (const s of this.solids){
      if (aabb(rect, s)) return true;
    }
    return false;
  }

  nearestLandmark(px, py, radius = 64){
    let best = null;
    let bestD2 = radius * radius;
    for (const lm of this.landmarks){
      const dx = lm.x - px;
      const dy = lm.y - py;
      const d2 = dx*dx + dy*dy;
      if (d2 <= bestD2){ bestD2 = d2; best = lm; }
    }
    return best;
  }

  draw(ctx, cam){
    ctx.fillStyle = "#0b0b12";
    ctx.fillRect(0, 0, cam.vw, cam.vh);

    ctx.save();
    const cx = Math.round(cam.x);
    const cy = Math.round(cam.y);
    ctx.translate(-cx, -cy);

    // Ground + park (base grass)
    drawGround(ctx, 0, 0, this.w, this.h);
    drawPark(ctx, this.park);

    // YARD LAWNS FIRST (so roads always sit on top, no more green cutting roads)
    for (const y of this.yards) drawYardLawn(ctx, y);

    // Roads + lane marks + driveways
    drawRoads(ctx, this.roads);

    // Water + bridge
    drawWaterStatic(ctx, this.river.x, this.river.y, this.river.w, this.river.h);
    drawBridge(ctx, this.bridge.x, this.bridge.y, this.bridge.w, this.bridge.h);

    // Raised + stairs
    drawRaised(ctx, this.raised.x, this.raised.y, this.raised.w, this.raised.h);
    for (const s of this.stairs) drawStairs(ctx, s.x, s.y, s.w, s.h);

    // Yard details AFTER roads (walkways + fences read clean)
    for (const y of this.yards) drawYardDetails(ctx, y);

    // Buildings
    for (const b of this.buildings){
      if (b.kind === "house")  drawHouseBlock(ctx, b.x, b.y, b.w, b.h, b.accent || 0, b.variant || 0);
      if (b.kind === "market") drawMarketBlock(ctx, b.x, b.y, b.w, b.h);
      if (b.kind === "studio") drawStudioBlock(ctx, b.x, b.y, b.w, b.h);
    }

    // Labels
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = "rgba(18,10,6,.72)";
    for (const lm of this.landmarks) ctx.fillText(lm.text, lm.x, lm.y);

    // Props depth sorted
    const propsSorted = [...this.props].sort((a,b)=>(a.baseY||a.y)-(b.baseY||b.y));
    for (const pr of propsSorted){
      if (pr.type === "tree"){
        drawTreeTrunk(ctx, pr.x, pr.y, pr.s);
        drawTreeCanopy(ctx, pr.x, pr.y, pr.s);
      } else if (pr.type === "rock"){
        drawRock(ctx, pr.x, pr.y, pr.s);
      } else if (pr.type === "bush"){
        drawBush(ctx, pr.x, pr.y, pr.s);
      } else if (pr.type === "flower"){
        drawFlower(ctx, pr.x, pr.y, pr.s, pr.c || 0);
      } else if (pr.type === "bench"){
        drawBench(ctx, pr.x, pr.y, pr.s || 1);
      } else if (pr.type === "lamp"){
        drawLamp(ctx, pr.x, pr.y, pr.s || 1);
      } else if (pr.type === "mailbox"){
        drawMailbox(ctx, pr.x, pr.y, pr.s || 1);
      } else if (pr.type === "reed"){
        drawReed(ctx, pr.x, pr.y, pr.s || 1);
      }
    }

    ctx.restore();
  }

  drawAbove(){ /* intentionally empty */ }
}

/* ===================== Suburb Layout ===================== */

function buildSuburbRoads(W, H, bridge, park){
  const asphalt = [];
  const sidewalk = [];
  const marks = [];
  const driveways = [];

  // Main boulevard (center)
  sidewalk.push({ x: 80,  y: 720, w: 2080, h: 200, r: 28 });
  asphalt.push ({ x: 95,  y: 735, w: 2050, h: 170, r: 26 });

  // Residential street above
  sidewalk.push({ x: 120, y: 520, w: 1960, h: 140, r: 24 });
  asphalt.push ({ x: 135, y: 532, w: 1930, h: 116, r: 22 });

  // Residential street below
  sidewalk.push({ x: 120, y: 960, w: 1960, h: 140, r: 24 });
  asphalt.push ({ x: 135, y: 972, w: 1930, h: 116, r: 22 });

  // Vertical connector (market/studio)
  sidewalk.push({ x: 980, y: 260, w: 200, h: 900, r: 28 });
  asphalt.push ({ x: 995, y: 275, w: 170, h: 870, r: 26 });

  // Cul-de-sac
  sidewalk.push({ x: 1850, y: 480, w: 520, h: 360, r: 100 });
  asphalt.push ({ x: 1865, y: 495, w: 490, h: 330, r: 96 });

  // Park loop (light trail feel)
  sidewalk.push({ x: park.x+40, y: park.y+60, w: park.w-80, h: park.h-120, r: 40 });
  asphalt.push ({ x: park.x+58, y: park.y+78, w: park.w-116, h: park.h-156, r: 34 });

  // Bridge approach
  sidewalk.push({ x: bridge.x - 220, y: bridge.y + 12, w: bridge.w + 440, h: 128, r: 28 });
  asphalt.push ({ x: bridge.x - 205, y: bridge.y + 28, w: bridge.w + 410, h: 96,  r: 24 });

  // Lane marks
  for (let i=0;i<26;i++) marks.push({ x: 160 + i*70, y: 820, w: 32, h: 4 });
  for (let i=0;i<14;i++) marks.push({ x: 1065, y: 310 + i*58, w: 4, h: 28 });

  return { asphalt, sidewalk, marks, driveways };
}

function buildPark(){
  return { x: 220, y: 200, w: 760, h: 470, cx: 520, cy: 435 };
}

function buildSuburbLots({ addBuilding, addYard, addProp, addDriveway, rng, riverY }){
  // Rows are spaced with margins so they look intentional and never collide with water.
  const rows = [
    // Above upper residential street (houses face DOWN toward street)
    { x0: 140, y0: 280, count: 7, lotW: 250, lotH: 210, gap: 16, faceDown:true,  streetY: 520 },

    // Between upper street and boulevard (houses face DOWN toward boulevard)
    // Kept short so it doesn't swallow the boulevard sidewalk.
    { x0: 140, y0: 580, count: 7, lotW: 250, lotH: 160, gap: 16, faceDown:true,  streetY: 720 },

    // Between boulevard and lower street (houses face UP toward boulevard)
    { x0: 140, y0: 900, count: 7, lotW: 250, lotH: 160, gap: 16, faceDown:false, streetY: 920 },

    // Below lower street (houses face UP toward street) — clamped away from river
    { x0: 140, y0: Math.min(1120, riverY - 210), count: 7, lotW: 250, lotH: 190, gap: 16, faceDown:false, streetY: 960 },
  ];

  const placeRow = (row) => {
    for (let i=0;i<row.count;i++){
      const lotX = row.x0 + i*(row.lotW + row.gap);
      const lotY = row.y0;

      // Yard (front lawn)
      const yard = { x: lotX+10, y: lotY+10, w: row.lotW-20, h: row.lotH-20 };
      addYard(yard);

      // House geometry
      const houseW = 168 + Math.floor(rng()*30);
      const houseH = 108 + Math.floor(rng()*22);
      const hx = lotX + (row.lotW - houseW)/2;

      // Place house toward the back of the lot relative to the street
      const hy = row.faceDown
        ? (lotY + row.lotH - houseH - 26)
        : (lotY + 26);

      addBuilding({
        kind:"house",
        x: Math.round(hx),
        y: Math.round(hy),
        w: houseW,
        h: houseH,
        accent: (i + (row.faceDown?0:1)) % 3,
        variant: (i + Math.floor(rng()*3)) % 3,
      });

      // Driveway: always intersects the street band slightly so it feels connected.
      const dW = 58;
      const dH = 82 + Math.floor(rng()*26);
      const dX = lotX + 22 + Math.floor(rng()*38);

      // For faceDown rows, driveway drops from lot toward streetY.
      // For faceUp rows, driveway rises from streetY toward lot.
      const dY = row.faceDown ? (row.streetY + 8) : (row.streetY - dH - 10);

      // Store on yard (detail pass draws it)
      yard.drive = { x:dX, y:dY, w:dW, h:dH };

      // Also put into roads.driveways so it connects visually to road paint
      addDriveway({ x:dX, y:dY, w:dW, h:dH, r: 10 });

      // Walkway (porch to driveway/sidewalk area)
      const walkH = 52;
      const walkY = row.faceDown ? (hy - walkH) : (hy + houseH);
      yard.walk = { x: hx + houseW*0.5 - 8, y: walkY, w: 16, h: walkH };

      // Mailbox near driveway street edge
      const mbY = row.faceDown ? (row.streetY + 18) : (row.streetY - 18);
      addProp({ type:"mailbox", x: dX + dW + 10, y: mbY, s: 1, baseY: mbY+2 });

      // Street lamp every other lot, centered on street band (clean spacing)
      if ((i % 2) === 0){
        const lampY = row.faceDown ? (row.streetY + 86) : (row.streetY + 56);
        addProp({ type:"lamp", x: lotX + row.lotW/2, y: lampY, s: 1, baseY: lampY+2 });
      }

      // Yard bushes (tidy, set back from sidewalk)
      const bushes = 2 + Math.floor(rng()*3);
      for (let k=0;k<bushes;k++){
        const bx = yard.x + 26 + k*(yard.w/(bushes+1));
        const by = yard.y + 24 + rng()*10;
        addProp({ type:"bush", x: bx, y: by, s: 0.72 + rng()*0.30, baseY: by+2 });
      }

      // Flowers + trees (kept in back corners so yards look planned)
      if (rng() < 0.50) addFlowerPatch((p)=>addProp(p), rng, yard.x + yard.w*0.5, yard.y + yard.h*0.55);
      if (rng() < 0.80) addProp({ type:"tree", x: yard.x + 30 + rng()*40, y: yard.y + yard.h - 16, s: 0.95 + rng()*0.25, baseY: yard.y + yard.h });
      if (rng() < 0.40) addProp({ type:"tree", x: yard.x + yard.w - (30 + rng()*40), y: yard.y + yard.h - 16, s: 0.90 + rng()*0.25, baseY: yard.y + yard.h });
    }
  };

  for (const row of rows) placeRow(row);

  // Corner market near the vertical connector
  addBuilding({ kind:"market", x: 910, y: 300, w: 260, h: 170 });

  // Studio on the right side
  addBuilding({ kind:"studio", x: 1540, y: 340, w: 320, h: 190 });

  // Park-edge cottages (cozier)
  addBuilding({ kind:"house", x: 180, y: 305, w: 200, h: 120, accent: 1, variant: 2 });
  addBuilding({ kind:"house", x: 420, y: 298, w: 210, h: 124, accent: 2, variant: 1 });

  // Cul-de-sac houses (curve feel) kept inside the culdesac bounds
  const cx = 2100, cy = 650;
  for (let i=0;i<5;i++){
    const t = (-0.95 + i*0.47);
    const hx = cx + Math.cos(t)*205 - 90;
    const hy = cy + Math.sin(t)*125 - 58;
    addBuilding({ kind:"house", x: Math.round(hx), y: Math.round(hy), w: 180, h: 118, accent: i%3, variant: (i+1)%3 });
  }
}

/* ===================== Visual Blocks ===================== */

function drawYardLawn(ctx, y){
  // lawn fill only (details drawn later)
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#55733a";
  roundRect(ctx, y.x, y.y, y.w, y.h, 18, true);

  // lawn grain
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#000";
  for (let i=0;i<420;i++){
    const px = y.x + ((i*19) % y.w);
    const py = y.y + ((i*41) % y.h);
    if (i % 4 === 0) ctx.fillRect(px, py, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawYardDetails(ctx, y){
  // driveway (if present)
  if (y.drive){
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#a8a294";
    roundRect(ctx, y.drive.x, y.drive.y, y.drive.w, y.drive.h, 10, true);
    ctx.globalAlpha = 1;
  }

  // walkway
  if (y.walk){
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "#d3c8b5";
    roundRect(ctx, y.walk.x, y.walk.y, y.walk.w, y.walk.h, 8, true);
    ctx.globalAlpha = 1;
  }

  // subtle fence at back
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#000";
  roundRect(ctx, y.x+10, y.y+y.h-18, y.w-20, 8, 6, true);
  ctx.globalAlpha = 1;
}

function drawPark(ctx, p){
  // park grass
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#4f6f39";
  roundRect(ctx, p.x, p.y, p.w, p.h, 34, true);

  // path loop
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#d8c6a2";
  roundRect(ctx, p.x+80, p.y+90, p.w-160, p.h-180, 30, true);
  ctx.globalAlpha = 1;

  // inner grass
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#4a6a35";
  roundRect(ctx, p.x+110, p.y+120, p.w-220, p.h-240, 26, true);
  ctx.globalAlpha = 1;

  // pond inside park
  const pond = { x: p.cx-110, y: p.cy-10, w: 220, h: 110 };
  ctx.globalAlpha = 0.95;
  drawWaterStatic(ctx, pond.x, pond.y, pond.w, pond.h);
  ctx.globalAlpha = 1;

  // playground pad
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#b28f5d";
  roundRect(ctx, p.cx+140, p.cy-60, 160, 110, 18, true);
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = "#000";
  roundRect(ctx, p.cx+148, p.cy-52, 144, 94, 16, true);
  ctx.globalAlpha = 1;

  // swing set silhouette
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#2b241f";
  ctx.fillRect(p.cx+170, p.cy-40, 6, 62);
  ctx.fillRect(p.cx+260, p.cy-40, 6, 62);
  ctx.fillRect(p.cx+170, p.cy-40, 96, 6);
  ctx.globalAlpha = 1;
}

function addParkDressings(add, rng, p){
  // tree ring
  const points = 20;
  for (let i=0;i<points;i++){
    const t = i/points * Math.PI*2;
    const x = p.cx + Math.cos(t)*330 + (rng()*30-15);
    const y = p.cy + Math.sin(t)*190 + (rng()*30-15);
    add({ type:"tree", x, y, s: 1.05 + rng()*0.25, baseY: y+2 });
  }

  // benches
  add({ type:"bench", x: p.cx-180, y: p.cy+10, s: 1, baseY: p.cy+12 });
  add({ type:"bench", x: p.cx+180, y: p.cy-30, s: 1, baseY: p.cy-28 });

  // lamps at park edges
  add({ type:"lamp", x: p.x+40,     y: p.y+p.h-30, s: 1, baseY: p.y+p.h-28 });
  add({ type:"lamp", x: p.x+p.w-40, y: p.y+p.h-30, s: 1, baseY: p.y+p.h-28 });

  // flower beds corners
  addFlowerPatch(add, rng, p.x+140, p.y+140);
  addFlowerPatch(add, rng, p.x+p.w-140, p.y+140);
  addFlowerPatch(add, rng, p.x+140, p.y+p.h-140);
  addFlowerPatch(add, rng, p.x+p.w-140, p.y+p.h-140);
}

/* ===================== Core Drawing ===================== */

function drawGround(ctx, x, y, w, h){
  ctx.fillStyle = "#5a6d34";
  ctx.fillRect(x, y, w, h);

  // micro-noise (stable)
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#000";
  for (let i=0; i<5200; i++){
    const px = (i*37) % w;
    const py = (i*91) % h;
    ctx.fillRect(x + px, y + py, 1, 1);
  }
  ctx.globalAlpha = 1;

  // straw flecks
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#c7b07a";
  for (let i=0; i<1400; i++){
    const px = (i*53) % w;
    const py = (i*131) % h;
    if ((i % 7) === 0) ctx.fillRect(x + px, y + py, 1, 1);
  }
  ctx.globalAlpha = 1;

  // worn ovals
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#6a8040";
  for (let i=0; i<44; i++){
    const px = x + ((i*173) % w);
    const py = y + ((i*269) % h);
    ctx.beginPath();
    ctx.ellipse(px, py, 70, 45, 0.10, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRoads(ctx, roads){
  // sidewalks first
  for (const s of roads.sidewalk){
    ctx.fillStyle = "#bfb9a8";
    roundRect(ctx, s.x, s.y, s.w, s.h, s.r || 14, true);

    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#000";
    for (let i=0;i<8;i++){
      ctx.fillRect(s.x + 10 + i*(s.w/8), s.y + 6, 1, s.h-12);
    }
    ctx.globalAlpha = 1;
  }

  // asphalt
  for (const r of roads.asphalt){
    ctx.fillStyle = "#25252c";
    roundRect(ctx, r.x, r.y, r.w, r.h, r.r || 18, true);

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#000";
    for (let i=0; i<900; i++){
      const px = r.x + ((i*29) % r.w);
      const py = r.y + ((i*71) % r.h);
      if ((i % 3) === 0) ctx.fillRect(px, py, 1, 1);
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "rgba(0,0,0,.55)";
    ctx.lineWidth = 7;
    roundRect(ctx, r.x, r.y, r.w, r.h, r.r || 18, false);
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#fff";
    roundRect(ctx, r.x+8, r.y+10, r.w-16, 10, 8, true);
    ctx.globalAlpha = 1;
  }

  // lane marks
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#efe8d6";
  for (const m of roads.marks) ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.globalAlpha = 1;

  // driveways (so they connect to roads visually)
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#a8a294";
  for (const d of roads.driveways){
    roundRect(ctx, d.x, d.y, d.w, d.h, d.r || 10, true);
  }
  ctx.globalAlpha = 1;
}

function drawWaterStatic(ctx, x,y,w,h){
  ctx.fillStyle = "#1d6b66";
  ctx.fillRect(x,y,w,h);

  // ripples
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#2a7c76";
  for (let i=0; i<160; i++){
    const px = x + ((i*97) % w);
    const py = y + 20 + ((i*43) % Math.max(1,(h-40)));
    ctx.fillRect(px, py, 80, 2);
  }
  ctx.globalAlpha = 1;

  // highlights
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#fff";
  for (let i=0; i<110; i++){
    const px = x + ((i*123) % w);
    const py = y + 10 + ((i*19) % 16);
    ctx.beginPath();
    ctx.ellipse(px, py, 14, 4, 0.10, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // bank edge
  ctx.fillStyle = "rgba(40,28,16,.28)";
  ctx.fillRect(x, y-10, w, 10);
}

function drawBridge(ctx, x,y,w,h){
  ctx.fillStyle = "#5e4128";
  roundRect(ctx, x, y, w, h, 10, true);

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  for (let i=0; i<12; i++){
    ctx.fillRect(x+10+i*(w/12), y+8, 2, h-16);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x+12, y+10, w-24, 4);
  ctx.fillRect(x+12, y+h-14, w-24, 4);
}

function drawHouseBlock(ctx, x,y,w,h, accentIndex=0, variant=0){
  // warm stucco
  ctx.fillStyle = "#c3ad84";
  roundRect(ctx, x, y, w, h, 14, true);

  // stucco grain
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#000";
  for (let i=0; i<900; i++){
    const px = x + ((i*23) % w);
    const py = y + ((i*67) % h);
    if ((i % 4) === 0) ctx.fillRect(px, py, 1, 1);
  }
  ctx.globalAlpha = 1;

  // roof band (varies)
  ctx.fillStyle = "rgba(0,0,0,.18)";
  const roofH = (variant === 2) ? 24 : 20;
  roundRect(ctx, x+8, y+8, w-16, roofH, 10, true);

  // windows (variant layouts)
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#16161d";
  if (variant === 0){
    for (let i=0; i<6; i++){
      const wx = x + 26 + (i%3)*(w/3);
      const wy = y + 44 + Math.floor(i/3)*52;
      roundRect(ctx, wx, wy, 38, 28, 6, true);
    }
  } else if (variant === 1){
    for (let i=0; i<4; i++){
      const wx = x + 30 + (i%2)*(w*0.52);
      const wy = y + 46 + Math.floor(i/2)*62;
      roundRect(ctx, wx, wy, 44, 30, 8, true);
    }
    roundRect(ctx, x+w*0.5-20, y+46, 40, 30, 8, true);
  } else {
    for (let i=0; i<5; i++){
      const wx = x + 24 + (i%3)*(w/3);
      const wy = y + 46 + Math.floor(i/3)*60;
      roundRect(ctx, wx, wy, 36, 26, 6, true);
    }
  }
  ctx.globalAlpha = 1;

  // door
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#1a1412";
  roundRect(ctx, x+w*0.5-14, y+h-44, 28, 34, 6, true);
  ctx.globalAlpha = 1;

  // porch step
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  roundRect(ctx, x+w*0.5-22, y+h-10, 44, 6, 4, true);
  ctx.globalAlpha = 1;

  // grime base
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  roundRect(ctx, x+6, y+h-18, w-12, 12, 8, true);
  ctx.globalAlpha = 1;

  // subtle violet accent strip
  const accents = [
    "rgba(138,46,255,.05)",
    "rgba(138,46,255,.07)",
    "rgba(138,46,255,.09)",
  ];
  ctx.fillStyle = accents[accentIndex % accents.length];
  ctx.fillRect(x, y, w, 10);
}

function drawMarketBlock(ctx, x,y,w,h){
  ctx.fillStyle = "#b9b2a2";
  roundRect(ctx, x, y, w, h, 16, true);

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(138,46,255,.18)";
  roundRect(ctx, x+10, y+40, w-20, 28, 10, true);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#111118";
  roundRect(ctx, x+22, y+78, w-44, h-110, 10, true);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,.25)";
  roundRect(ctx, x+20, y+12, w-40, 20, 10, true);
  ctx.globalAlpha = 1;
}

function drawStudioBlock(ctx, x,y,w,h){
  ctx.fillStyle = "#cbbd9c";
  roundRect(ctx, x, y, w, h, 18, true);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#000";
  for (let i=0;i<8;i++){
    ctx.fillRect(x+18 + i*((w-36)/8), y+18, 1, h-36);
  }
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#14131a";
  roundRect(ctx, x+w*0.5-22, y+h-52, 44, 42, 10, true);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(138,46,255,.08)";
  ctx.fillRect(x, y+10, w, 8);
}

function drawRaised(ctx, x,y,w,h){
  ctx.fillStyle = "#9d865b";
  roundRect(ctx, x, y, w, h, 14, true);
  ctx.fillStyle = "rgba(0,0,0,.16)";
  roundRect(ctx, x, y+10, w, 10, 10, true);
}

function drawStairs(ctx, x,y,w,h){
  ctx.fillStyle = "rgba(0,0,0,.14)";
  roundRect(ctx, x, y, w, h, 12, true);

  ctx.fillStyle = "#b59a63";
  const steps = 5;
  for (let i=0;i<steps;i++){
    const yy = y + i*(h/steps);
    ctx.globalAlpha = 0.86 - i*0.12;
    roundRect(ctx, x+8, yy+3, w-16, (h/steps)-6, 10, true);
  }
  ctx.globalAlpha = 1;
}

/* ===================== Props ===================== */

function drawTreeTrunk(ctx, x, y, s){
  s *= 0.80;
  const trunkW = 14*s;
  const trunkH = 38*s;

  ctx.fillStyle = "#563721";
  roundRect(ctx, x - trunkW/2, y - trunkH, trunkW, trunkH, 8*s, true);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  roundRect(ctx, x - trunkW/2 + 3*s, y - trunkH + 6*s, 3*s, trunkH - 12*s, 6*s, true);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 14*s, 6*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTreeCanopy(ctx, x, y, s){
  s *= 0.80;
  const topY  = y - 46*s;
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

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(18,10,6,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 30*s, 36*s, 26*s, 0.08, 0, Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawRock(ctx, x,y,s){
  ctx.fillStyle = "#706a5c";
  blob(ctx, x, y, 22*s, 14*s, 0.06);

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "rgba(18,10,6,.30)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 23*s, 15*s, 0.06, 0, Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#fff";
  blob(ctx, x-6*s, y-6*s, 10*s, 6*s, -0.08);
  ctx.globalAlpha = 1;
}

function drawBush(ctx, x,y,s){
  ctx.fillStyle = "#4a5b2f";
  blob(ctx, x, y, 26*s, 16*s, 0.08);

  ctx.fillStyle = "#3b4b26";
  blob(ctx, x+14*s, y+3*s, 20*s, 12*s, 0.12);

  ctx.fillStyle = "#566b36";
  blob(ctx, x-12*s, y+2*s, 22*s, 14*s, -0.06);

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "rgba(18,10,6,.30)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y+1*s, 28*s, 16*s, 0.08, 0, Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFlower(ctx, x,y,s,cIndex){
  const colors = ["#f2ead8", "#f0d7e2", "#e9f0d9"];
  const c = colors[cIndex % colors.length];
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, 2.2*s, 1.6*s, 0, 0, Math.PI*2);
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

function drawLamp(ctx, x, y, s){
  const poleH = 52*s;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#2a2523";
  roundRect(ctx, x-3*s, y-poleH, 6*s, poleH, 4*s, true);

  // light head
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#3b3330";
  roundRect(ctx, x-10*s, y-poleH-8*s, 20*s, 10*s, 6*s, true);

  // glow
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(x, y-poleH+12*s, 22*s, 14*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawMailbox(ctx, x, y, s){
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#2f2a28";
  roundRect(ctx, x-2*s, y-18*s, 4*s, 18*s, 3*s, true);

  ctx.fillStyle = "rgba(138,46,255,.14)";
  roundRect(ctx, x-10*s, y-26*s, 20*s, 10*s, 6*s, true);

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.fillRect(x-8*s, y-23*s, 16*s, 1);
  ctx.globalAlpha = 1;
}

function drawReed(ctx, x, y, s){
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#3b5a2a";
  for (let i=0;i<4;i++){
    const dx = (i*3 - 4)*s;
    ctx.fillRect(x+dx, y-18*s, 2*s, 18*s);
  }
  ctx.globalAlpha = 1;
}

function addFlowerPatch(add, rng, x, y){
  for (let i=0;i<14;i++){
    const yy = y + (rng()*60-30);
    add({
      type:"flower",
      x: x + (rng()*110-55),
      y: yy,
      s: 0.8 + rng()*0.6,
      baseY: yy + 8,
      c: Math.floor(rng()*3)
    });
  }
}

/* ===================== Geometry ===================== */

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

function makeRng(seed){
  let s = seed >>> 0;
  return function(){
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}
