export class World {
  constructor(){
    this.w = 2400;
    this.h = 1500;

    this.spawns = {
      actor: { x: 520, y: 820, area:"Sunleaf Suburbs" },
      thug:  { x: 520, y: 820, area:"Sunleaf Suburbs" },
      police:{ x: 520, y: 820, area:"Sunleaf Suburbs" },
    };

    // --- Streets layout (suburbs) ---
    // We'll *draw* roads/sidewalks. Solids are for buildings + water only.
    this.roads = buildRoads();

    // --- SOLIDS (collision) ---
    this.solids = [
      // Houses (blocks)
      { x: 240, y: 220, w: 420, h: 250 },
      { x: 780, y: 220, w: 520, h: 270 },
      { x: 1440, y: 260, w: 560, h: 280 },
      { x: 1580, y: 820, w: 460, h: 260 },

      // Smaller homes near cul-de-sac
      { x: 1820, y: 430, w: 360, h: 210 },
      { x: 1920, y: 690, w: 330, h: 200 },

      // Water (blocked band)
      { x: 0, y: 1210, w: this.w, h: 290 },

      // Raised strip (blocked)
      { x: 1760, y: 120, w: 520, h: 95 },
    ];

    // Bridge (passable visual, water is blocked anyway)
    this.bridge = { x: 1010, y: 1170, w: 260, h: 64 };

    // --- LANDMARKS ---
    this.landmarks = [
      { id:"cottage", x: 340, y: 350, text:"Cottage", hint:"Home (soon)" },
      { id:"market",  x: 920, y: 340, text:"Corner Market", hint:"Snacks (soon)" },
      { id:"studio",  x: 1600, y: 390, text:"Acting Studio", hint:"Audition (soon)" },
      { id:"bridge",  x: this.bridge.x + 70, y: this.bridge.y + 20, text:"Bridge", hint:"Cross" },
      { id:"culdesac", x: 2040, y: 590, text:"Cul-de-sac", hint:"Quiet" },
    ];

    // Stairs/ramps (cosmetic)
    this.stairs = [
      { x: 1760, y: 215, w: 150, h: 40, baseY: 215 },
      { x: 860,  y: 620, w: 150, h: 40, baseY: 620 },
    ];

    // --- PROPS ---
    this.props = [];
    const add = (p) => this.props.push(p);

    // Use seeded randomness ONCE to place props
    const rng = makeRng(1337);

    // Tree lines along streets
    addTreeLine(add, rng, 320, 560, 7, 44);
    addTreeLine(add, rng, 640, 980, 10, 52);
    addTreeLine(add, rng, 1420, 740, 9, 56);
    addTreeLine(add, rng, 1700, 980, 8, 52);

    // Cul-de-sac greenery
    addTreeCluster(add, rng, 1960, 520, 4);
    addTreeCluster(add, rng, 2100, 740, 4);

    // Bush strips (front yards)
    addBushStrip(add, rng, 340, 500, 10);
    addBushStrip(add, rng, 880, 520, 12);
    addBushStrip(add, rng, 1500, 560, 10);

    // Rocks near water edge
    add({ type:"rock", x: 520, y: 1140, s: 1.0, baseY: 1140 });
    add({ type:"rock", x: 1260, y: 1138, s: 1.2, baseY: 1138 });
    add({ type:"rock", x: 1780, y: 1144, s: 0.95, baseY: 1144 });

    // Small flowers (prebaked; no Math.random in draw)
    addFlowerPatch(add, rng, 980, 680);
    addFlowerPatch(add, rng, 1560, 920);

    this._above = [];
  }

  getSpawn(role){
    return this.spawns[role] || this.spawns.actor;
  }

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
      if (d2 <= bestD2){
        bestD2 = d2;
        best = lm;
      }
    }
    return best;
  }

  draw(ctx, cam){
    // background
    ctx.fillStyle = "#0b0b12";
    ctx.fillRect(0, 0, cam.vw, cam.vh);

    ctx.save();
    // IMPORTANT: camera rounding will be done in game.js too, but this is safe
    const cx = Math.round(cam.x);
    const cy = Math.round(cam.y);
    ctx.translate(-cx, -cy);

    // 1) Ground (rugged but clean)
    drawGround(ctx, 0, 0, this.w, this.h);

    // 2) Streets + sidewalks (suburbs feel)
    drawRoadSystem(ctx, this.roads);

    // 3) Water (STATIC)
    drawWaterStatic(ctx, 0, 1210, this.w, 290);

    // 4) Bridge
    drawBridge(ctx, this.bridge.x, this.bridge.y, this.bridge.w, this.bridge.h);

    // 5) Buildings
    for (const b of this.solids){
      if (b.y >= 1210) continue; // skip water
      if (b.y === 120 && b.h === 95) continue; // skip raised strip
      drawHouseBlock(ctx, b.x, b.y, b.w, b.h);
    }

    // 6) Raised strip (cosmetic)
    drawRaised(ctx, 1760, 120, 520, 95);

    // 7) Stairs
    for (const s of this.stairs){
      drawStairs(ctx, s.x, s.y, s.w, s.h);
    }

    // 8) Labels
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = "rgba(18,10,6,.70)";
    for (const lm of this.landmarks){
      ctx.fillText(lm.text, lm.x, lm.y);
    }

    // 9) Props below pass
    this._above.length = 0;
    const propsSorted = [...this.props].sort((a,b)=>(a.baseY||a.y)-(b.baseY||b.y));
    for (const pr of propsSorted){
      if (pr.type === "tree"){
        drawTreeTrunk(ctx, pr.x, pr.y, pr.s);
        this._above.push({ type:"treeCanopy", x: pr.x, y: pr.y, s: pr.s, baseY: pr.baseY });
      } else if (pr.type === "rock"){
        drawRock(ctx, pr.x, pr.y, pr.s);
      } else if (pr.type === "bush"){
        drawBush(ctx, pr.x, pr.y, pr.s);
      } else if (pr.type === "flower"){
        drawFlower(ctx, pr.x, pr.y, pr.s, pr.c || 0);
      }
    }

    ctx.restore();
  }

  drawAbove(ctx, cam){
    if (!this._above.length) return;
    ctx.save();
    const cx = Math.round(cam.x);
    const cy = Math.round(cam.y);
    ctx.translate(-cx, -cy);

    const sorted = [...this._above].sort((a,b)=>(a.baseY||a.y)-(b.baseY||b.y));
    for (const a of sorted){
      if (a.type === "treeCanopy") drawTreeCanopy(ctx, a.x, a.y, a.s);
    }
    ctx.restore();
  }
}

/* ===================== Drawing ===================== */

function drawGround(ctx, x, y, w, h){
  // Cleaner grass: no huge bubble circles
  ctx.fillStyle = "#5f7336"; // olive
  ctx.fillRect(x, y, w, h);

  // Subtle mottled noise (tiny, stable)
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#000";
  for (let i=0; i<2600; i++){
    const px = (i*37) % w;
    const py = (i*91) % h;
    ctx.fillRect(x + px, y + py, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Occasional worn patches (few, large, but not “bubbles”)
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#6a8040";
  for (let i=0; i<50; i++){
    const px = x + ((i*173) % w);
    const py = y + ((i*269) % h);
    ctx.beginPath();
    ctx.ellipse(px, py, 70, 45, 0.12, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRoadSystem(ctx, roads){
  // asphalt
  for (const r of roads.asphalt){
    ctx.fillStyle = "#2a2a32";
    roundRect(ctx, r.x, r.y, r.w, r.h, r.r || 18, true);

    // road edge grime
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 6;
    roundRect(ctx, r.x, r.y, r.w, r.h, r.r || 18, false);
    ctx.globalAlpha = 1;
  }

  // sidewalks
  for (const s of roads.sidewalk){
    ctx.fillStyle = "#bfb9a8";
    roundRect(ctx, s.x, s.y, s.w, s.h, s.r || 14, true);

    // cracks
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#000";
    for (let i=0;i<8;i++){
      ctx.fillRect(s.x + 10 + i*(s.w/8), s.y + 6, 1, s.h-12);
    }
    ctx.globalAlpha = 1;
  }

  // lane marks
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#efe8d6";
  for (const m of roads.marks){
    ctx.fillRect(m.x, m.y, m.w, m.h);
  }
  ctx.globalAlpha = 1;

  // driveways (lighter concrete)
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#a8a294";
  for (const d of roads.driveways){
    roundRect(ctx, d.x, d.y, d.w, d.h, 10, true);
  }
  ctx.globalAlpha = 1;
}

function drawWaterStatic(ctx, x,y,w,h){
  ctx.fillStyle = "#1d6b66";
  ctx.fillRect(x,y,w,h);

  // gentle static ripples (NO random, NO animation)
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#2a7c76";
  for (let i=0; i<120; i++){
    const px = x + ((i*97) % w);
    const py = y + 18 + ((i*43) % (h-36));
    ctx.fillRect(px, py, 70, 2);
  }
  ctx.globalAlpha = 1;

  // foam line
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#fff";
  for (let i=0; i<90; i++){
    const px = x + ((i*123) % w);
    const py = y + 10 + ((i*19) % 14);
    ctx.beginPath();
    ctx.ellipse(px, py, 14, 4, 0.10, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // bank shadow
  ctx.fillStyle = "rgba(40,28,16,.25)";
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

function drawHouseBlock(ctx, x,y,w,h){
  ctx.fillStyle = "#c8b28a";
  roundRect(ctx, x, y, w, h, 14, true);

  // roof band
  ctx.fillStyle = "rgba(0,0,0,.14)";
  roundRect(ctx, x+8, y+8, w-16, 18, 10, true);

  // windows
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#1d1d25";
  for (let i=0; i<6; i++){
    const wx = x + 40 + (i%3)*(w/3) + (i*7)%18;
    const wy = y + 60 + Math.floor(i/3)*80 + (i*11)%10;
    roundRect(ctx, wx, wy, 44, 32, 6, true);
  }
  ctx.globalAlpha = 1;

  // subtle violet accent
  ctx.fillStyle = "rgba(138,46,255,.07)";
  ctx.fillRect(x, y, w, 10);
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
  // shrink trees a bit globally
  s *= 0.75;

  const trunkW = 14*s;
  const trunkH = 34*s; // taller trunk so canopy connects

  // trunk
  ctx.fillStyle = "#563721";
  roundRect(ctx, x - trunkW/2, y - trunkH, trunkW, trunkH, 8*s, true);

  // little trunk highlight
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  roundRect(ctx, x - trunkW/2 + 3*s, y - trunkH + 6*s, 3*s, trunkH - 12*s, 6*s, true);
  ctx.globalAlpha = 1;

  // ground shadow
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 14*s, 6*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTreeCanopy(ctx, x, y, s){
  // shrink trees a bit globally
  s *= 0.75;

  // Move canopy DOWN so it touches trunk (no floating cloud look)
  const topY = y - 34*s;
  const midY = y - 22*s;
  const baseY = y - 10*s; // “skirt” that connects to trunk

  // Dark base foliage that overlaps the trunk top (connection piece)
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#2f4e22";
  blob(ctx, x, baseY, 18*s, 10*s, 0.08);
  blob(ctx, x - 10*s, baseY + 2*s, 14*s, 8*s, -0.06);
  blob(ctx, x + 10*s, baseY + 2*s, 14*s, 8*s, 0.10);

  // Mid foliage
  ctx.fillStyle = "#3a5b2a";
  blob(ctx, x - 12*s, midY, 18*s, 12*s, -0.10);
  blob(ctx, x + 12*s, midY, 18*s, 12*s, 0.10);
  blob(ctx, x, midY - 2*s, 22*s, 14*s, 0.06);

  // Top foliage
  ctx.fillStyle = "#476b33";
  blob(ctx, x, topY, 22*s, 14*s, 0.08);
  blob(ctx, x - 10*s, topY + 4*s, 16*s, 10*s, -0.10);
  blob(ctx, x + 12*s, topY + 5*s, 16*s, 10*s, 0.12);

  // Subtle outline so it reads like a tree, not a cloud
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(18,10,6,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 20*s, 30*s, 22*s, 0.08, 0, Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawTreeTrunk(ctx, x, y, s){
  // shrink trees a bit globally
  s *= 0.75;

  const trunkW = 14*s;
  const trunkH = 34*s; // taller trunk so canopy connects

  // trunk
  ctx.fillStyle = "#563721";
  roundRect(ctx, x - trunkW/2, y - trunkH, trunkW, trunkH, 8*s, true);

  // little trunk highlight
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  roundRect(ctx, x - trunkW/2 + 3*s, y - trunkH + 6*s, 3*s, trunkH - 12*s, 6*s, true);
  ctx.globalAlpha = 1;

  // ground shadow
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 14*s, 6*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTreeCanopy(ctx, x, y, s){
  // shrink trees a bit globally
  s *= 0.75;

  // Move canopy DOWN so it touches trunk (no floating cloud look)
  const topY = y - 34*s;
  const midY = y - 22*s;
  const baseY = y - 10*s; // “skirt” that connects to trunk

  // Dark base foliage that overlaps the trunk top (connection piece)
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#2f4e22";
  blob(ctx, x, baseY, 18*s, 10*s, 0.08);
  blob(ctx, x - 10*s, baseY + 2*s, 14*s, 8*s, -0.06);
  blob(ctx, x + 10*s, baseY + 2*s, 14*s, 8*s, 0.10);

  // Mid foliage
  ctx.fillStyle = "#3a5b2a";
  blob(ctx, x - 12*s, midY, 18*s, 12*s, -0.10);
  blob(ctx, x + 12*s, midY, 18*s, 12*s, 0.10);
  blob(ctx, x, midY - 2*s, 22*s, 14*s, 0.06);

  // Top foliage
  ctx.fillStyle = "#476b33";
  blob(ctx, x, topY, 22*s, 14*s, 0.08);
  blob(ctx, x - 10*s, topY + 4*s, 16*s, 10*s, -0.10);
  blob(ctx, x + 12*s, topY + 5*s, 16*s, 10*s, 0.12);

  // Subtle outline so it reads like a tree, not a cloud
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(18,10,6,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 20*s, 30*s, 22*s, 0.08, 0, Math.PI*2);
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
  ctx.fillStyle = "#2f4e22";
  blob(ctx, x+14*s, y+3*s, 20*s, 12*s, 0.12);

  ctx.fillStyle = "#3a5b2a";
  blob(ctx, x, y, 26*s, 16*s, 0.08);

  ctx.fillStyle = "#476b33";
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
  // tiny muted flower dot; color chosen at spawn time, not per-frame
  const colors = ["#f2ead8", "#f0d7e2", "#e9f0d9"];
  const c = colors[cIndex % colors.length];
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, 2.2*s, 1.6*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ===================== Layout Builders ===================== */

function buildRoads(){
  // Suburb street network:
  // - main horizontal road
  // - vertical road up
  // - cul-de-sac circle/right area
  // - sidewalks around asphalt
  const asphalt = [];
  const sidewalk = [];
  const marks = [];
  const driveways = [];

  // Main road (horizontal)
  asphalt.push({ x: 120, y: 740, w: 1900, h: 160, r: 24 });
  sidewalk.push({ x: 110, y: 730, w: 1920, h: 180, r: 26 });

  // Vertical road (to top)
  asphalt.push({ x: 920, y: 360, w: 160, h: 560, r: 24 });
  sidewalk.push({ x: 910, y: 350, w: 180, h: 580, r: 26 });

  // Corner market spur
  asphalt.push({ x: 760, y: 470, w: 320, h: 140, r: 22 });
  sidewalk.push({ x: 750, y: 460, w: 340, h: 160, r: 24 });

  // Cul-de-sac (right side)
  asphalt.push({ x: 1840, y: 520, w: 520, h: 320, r: 90 });
  sidewalk.push({ x: 1830, y: 510, w: 540, h: 340, r: 96 });

  // Lane marks (dashed center lines)
  for (let i=0;i<26;i++){
    marks.push({ x: 160 + i*70, y: 818, w: 32, h: 4 });
  }
  for (let i=0;i<9;i++){
    marks.push({ x: 998, y: 390 + i*60, w: 4, h: 28 });
  }

  // Driveways (to houses)
  driveways.push({ x: 330, y: 630, w: 70, h: 110 });
  driveways.push({ x: 520, y: 630, w: 70, h: 110 });
  driveways.push({ x: 900, y: 630, w: 70, h: 110 });
  driveways.push({ x: 1520, y: 630, w: 70, h: 110 });
  driveways.push({ x: 1960, y: 840, w: 70, h: 110 });

  return { asphalt, sidewalk, marks, driveways };
}

function addTreeLine(add, rng, x, y, count, step){
  for (let i=0;i<count;i++){
    add({
      type:"tree",
      x: x + i*step + (rng()*18-9),
      y: y + (rng()*26-13),
      s: 0.85 + rng()*0.35,
      baseY: y + 30 + rng()*26
    });
  }
}

function addTreeCluster(add, rng, x, y, count){
  for (let i=0;i<count;i++){
    add({
      type:"tree",
      x: x + (rng()*120-60),
      y: y + (rng()*90-45),
      s: 0.9 + rng()*0.4,
      baseY: y + 30 + rng()*30
    });
  }
}

function addBushStrip(add, rng, x, y, count){
  for (let i=0;i<count;i++){
    add({
      type:"bush",
      x: x + i*34 + (rng()*10-5),
      y: y + (rng()*10-5),
      s: 0.75 + rng()*0.35,
      baseY: y + 18
    });
  }
}

function addFlowerPatch(add, rng, x, y){
  for (let i=0;i<18;i++){
    add({
      type:"flower",
      x: x + (rng()*110-55),
      y: y + (rng()*60-30),
      s: 0.8 + rng()*0.6,
      baseY: y + 8,
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
