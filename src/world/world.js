export class World {
  constructor(){
    // Cozy suburb starter neighborhood
    this.w = 2200;
    this.h = 1400;

    this.spawns = {
      actor: { x: 520, y: 820, area:"Sunleaf Suburbs" },
      thug:  { x: 520, y: 820, area:"Sunleaf Suburbs" },
      police:{ x: 520, y: 820, area:"Sunleaf Suburbs" },
    };

    // --- SOLIDS (collision) ---
    // Keep this small and clear for now. Props are mostly cosmetic.
    this.solids = [
      // Houses / buildings blocks (suburbs)
      { x: 220, y: 260, w: 420, h: 240 },
      { x: 760, y: 220, w: 480, h: 260 },
      { x: 1400, y: 280, w: 520, h: 260 },
      { x: 1520, y: 760, w: 420, h: 240 },

      // Water (treat as blocked region)
      // water band at bottom
      { x: 0, y: 1160, w: this.w, h: 240 },

      // Cliff/edge near top-right (little “raised” area)
      { x: 1700, y: 120, w: 420, h: 90 },
    ];

    // --- LANDMARKS (interact) ---
    this.landmarks = [
      { id:"cottage", x: 330, y: 350, text:"Cottage", hint:"Home (soon)" },
      { id:"market",  x: 910, y: 340, text:"Corner Market", hint:"Snacks (soon)" },
      { id:"studio",  x: 1560, y: 390, text:"Acting Studio", hint:"Audition (soon)" },
      { id:"bridge",  x: 1030, y: 1120, text:"Wood Bridge", hint:"Cross" },
    ];

    // --- PATHS / RAMPS / STAIRS (cosmetic + a couple solids) ---
    // Dirt paths are NOT solids. Stairs/ramps are just visuals for now.
    this.paths = [
      // main path loop
      { x1: 520,  y1: 820,  x2: 620,  y2: 560,  w: 80 },
      { x1: 620,  y1: 560,  x2: 980,  y2: 420,  w: 86 },
      { x1: 980,  y1: 420,  x2: 1520, y2: 430,  w: 92 },
      { x1: 1520, y1: 430,  x2: 1660, y2: 700,  w: 78 },
      { x1: 1660, y1: 700,  x2: 1120, y2: 920,  w: 86 },
      { x1: 1120, y1: 920,  x2: 520,  y2: 820,  w: 92 },
    ];

    // Water + bridge (bridge is passable)
    this.bridge = { x: 920, y: 1110, w: 240, h: 58 };

    // --- PROPS (depth-sorted) ---
    // Each prop has a "baseY" which is used for draw order.
    // Canopies/leaves are drawn in "above" pass so player can go behind them.
    this.props = [];

    // Helper to add props fast
    const add = (p) => this.props.push(p);

    // Trees (trunks + canopy)
    addTreeCluster(add, 120, 900, 5);
    addTreeCluster(add, 260, 640, 4);
    addTreeCluster(add, 460, 520, 3);
    addTreeCluster(add, 1760, 980, 5);
    addTreeCluster(add, 1920, 540, 4);

    // Rocks
    add({ type:"rock", x: 700, y: 930, s: 1.0, baseY: 930 });
    add({ type:"rock", x: 1340, y: 860, s: 1.2, baseY: 860 });
    add({ type:"rock", x: 380, y: 1040, s: 0.9, baseY: 1040 });

    // Bushes/flowers
    addBushLine(add, 620, 760, 6);
    addBushLine(add, 1180, 520, 8);
    addFlowerPatch(add, 980, 680);
    addFlowerPatch(add, 1560, 920);

    // Stairs/ramps (cosmetic)
    this.stairs = [
      { x: 1680, y: 210, w: 120, h: 36, baseY: 210 }, // near the “raised” strip
      { x: 720,  y: 600, w: 130, h: 36, baseY: 600 },
    ];

    // Cached “above” draw list (tree canopies etc.)
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

  // --- DRAW ---
  draw(ctx, cam){
    // Build background + ground
    ctx.fillStyle = "#0b0b12";
    ctx.fillRect(0, 0, cam.vw, cam.vh);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // 1) Grass base (warm)
    fillGrass(ctx, 0, 0, this.w, this.h);

    // 2) Dirt paths (curvy ribbons)
    for (const p of this.paths){
      drawPath(ctx, p.x1, p.y1, p.x2, p.y2, p.w);
    }

    // 3) Water band (cozy teal) + shoreline
    drawWater(ctx, 0, 1160, this.w, 240);

    // 4) Bridge (passable visual)
    drawBridge(ctx, this.bridge.x, this.bridge.y, this.bridge.w, this.bridge.h);

    // 5) Buildings blocks (simple “painted” houses)
    for (const b of this.solids){
      // skip water + cliff solids
      if (b.y >= 1160) continue;
      if (b.w === 420 && b.h === 90 && b.y === 120) continue;

      drawHouseBlock(ctx, b.x, b.y, b.w, b.h);
    }

    // 6) Cliff/raised strip (cosmetic)
    drawCliff(ctx, 1700, 120, 420, 90);

    // 7) Stairs/ramps
    for (const s of this.stairs){
      drawStairs(ctx, s.x, s.y, s.w, s.h);
    }

    // 8) Landmarks labels
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = "rgba(20,10,5,.65)";
    for (const lm of this.landmarks){
      ctx.fillText(lm.text, lm.x, lm.y);
    }

    // 9) Props (trunks + rocks + bushes in “below” pass)
    // Clear above list each frame
    this._above.length = 0;

    // Sort props by baseY so they layer naturally
    const propsSorted = [...this.props].sort((a,b)=>(a.baseY||a.y)-(b.baseY||b.y));
    for (const pr of propsSorted){
      if (pr.type === "tree"){
        drawTreeTrunk(ctx, pr.x, pr.y, pr.s);
        // canopy goes to above pass
        this._above.push({ type:"treeCanopy", x: pr.x, y: pr.y, s: pr.s, baseY: pr.baseY });
      } else if (pr.type === "rock"){
        drawRock(ctx, pr.x, pr.y, pr.s);
      } else if (pr.type === "bush"){
        drawBush(ctx, pr.x, pr.y, pr.s);
      } else if (pr.type === "flower"){
        drawFlower(ctx, pr.x, pr.y, pr.s);
      }
    }

    // World bounds (debug faint)
    ctx.strokeStyle = "rgba(0,0,0,.08)";
    ctx.strokeRect(0, 0, this.w, this.h);

    ctx.restore();
  }

  // Draw things that should appear ABOVE the player (tree leaves, etc.)
  drawAbove(ctx, cam){
    if (!this._above.length) return;

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // sort above by baseY too
    const sorted = [...this._above].sort((a,b)=>(a.baseY||a.y)-(b.baseY||b.y));
    for (const a of sorted){
      if (a.type === "treeCanopy"){
        drawTreeCanopy(ctx, a.x, a.y, a.s);
      }
    }
    ctx.restore();
  }
}

/* ====================== Helpers (art + map gen) ====================== */

function aabb(a,b){
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function fillGrass(ctx, x, y, w, h){
  // Warm Ghibli-ish base
  ctx.fillStyle = "#8fa85b"; // gold-green
  ctx.fillRect(x, y, w, h);

  // Soft patches
  ctx.globalAlpha = 0.18;
  for (let i=0; i<220; i++){
    const px = x + rand()*w;
    const py = y + rand()*h;
    const r = 26 + rand()*90;
    ctx.fillStyle = (i%3===0) ? "#9dbb63" : (i%3===1 ? "#7f9a52" : "#a7c56f");
    ctx.beginPath();
    ctx.ellipse(px, py, r*1.2, r*0.8, rand()*Math.PI, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Tiny speckle flowers (super subtle)
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#ffffff";
  for (let i=0; i<900; i++){
    const px = x + rand()*w;
    const py = y + rand()*h;
    ctx.fillRect(px, py, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawPath(ctx, x1,y1,x2,y2,width){
  // Draw a “ribbon” path with soft edges
  const steps = 28;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // shadow under path
  ctx.strokeStyle = "rgba(0,0,0,.18)";
  ctx.lineWidth = width + 10;
  ctx.beginPath();
  for (let i=0; i<=steps; i++){
    const t = i/steps;
    const x = lerp(x1,x2,t) + Math.sin(t*3.1)*14;
    const y = lerp(y1,y2,t) + Math.cos(t*2.4)*10;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();

  // main dirt
  ctx.strokeStyle = "#c7b07a"; // tan dirt
  ctx.lineWidth = width;
  ctx.stroke();

  // highlight
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = Math.max(6, width*0.35);
  ctx.stroke();

  ctx.restore();
}

function drawWater(ctx, x,y,w,h){
  // water
  ctx.fillStyle = "#2a8b8a";
  ctx.fillRect(x,y,w,h);

  // water gradient shimmer
  ctx.globalAlpha = 0.18;
  for (let i=0; i<70; i++){
    ctx.fillStyle = (i%2===0) ? "#37a1a0" : "#24807f";
    ctx.fillRect(x + rand()*w, y + rand()*h, 60 + rand()*160, 2 + rand()*2);
  }
  ctx.globalAlpha = 1;

  // shoreline foam
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffffff";
  for (let i=0; i<140; i++){
    const px = x + rand()*w;
    const py = y + 8 + rand()*20;
    ctx.beginPath();
    ctx.ellipse(px, py, 8 + rand()*18, 2 + rand()*5, rand()*Math.PI, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // bank
  ctx.fillStyle = "rgba(60,45,20,.22)";
  ctx.fillRect(x, y-10, w, 10);
}

function drawBridge(ctx, x,y,w,h){
  // bridge deck
  ctx.fillStyle = "#7b5a3a";
  roundRect(ctx, x, y, w, h, 10, true);

  // planks
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  for (let i=0; i<12; i++){
    ctx.fillRect(x+8+i*(w/12), y+6, 2, h-12);
  }
  ctx.globalAlpha = 1;

  // rails
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fillRect(x+10, y+10, w-20, 4);
  ctx.fillRect(x+10, y+h-14, w-20, 4);

  // posts
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(x+6, y+6, 6, h-12);
  ctx.fillRect(x+w-12, y+6, 6, h-12);
}

function drawHouseBlock(ctx, x,y,w,h){
  // base house block
  ctx.fillStyle = "#d9c8a0"; // warm stucco
  roundRect(ctx, x, y, w, h, 14, true);

  // roof shadow
  ctx.fillStyle = "rgba(0,0,0,.12)";
  roundRect(ctx, x+8, y+8, w-16, 18, 10, true);

  // little windows
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#2b2b36";
  for (let i=0; i<6; i++){
    const wx = x + 40 + (i%3)*(w/3) + rand()*18;
    const wy = y + 60 + Math.floor(i/3)*80 + rand()*10;
    roundRect(ctx, wx, wy, 44, 32, 6, true);
  }
  ctx.globalAlpha = 1;

  // violet accent line (subtle “NPC City magic”)
  ctx.fillStyle = "rgba(138,46,255,.10)";
  ctx.fillRect(x, y, w, 10);
}

function drawCliff(ctx, x,y,w,h){
  ctx.fillStyle = "#b99f6c";
  roundRect(ctx, x, y, w, h, 14, true);
  ctx.fillStyle = "rgba(0,0,0,.14)";
  roundRect(ctx, x, y+10, w, 10, 10, true);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffffff";
  for (let i=0;i<14;i++){
    ctx.beginPath();
    ctx.ellipse(x+20+rand()*(w-40), y+30+rand()*(h-40), 6+rand()*10, 2+rand()*6, rand()*Math.PI, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStairs(ctx, x,y,w,h){
  // dirt ramp base
  ctx.fillStyle = "rgba(0,0,0,.12)";
  roundRect(ctx, x, y, w, h, 12, true);
  // steps
  ctx.fillStyle = "#c7b07a";
  const steps = 5;
  for (let i=0;i<steps;i++){
    const yy = y + i*(h/steps);
    ctx.globalAlpha = 0.85 - i*0.1;
    roundRect(ctx, x+8, yy+3, w-16, (h/steps)-6, 10, true);
  }
  ctx.globalAlpha = 1;
}

/* ---- Props ---- */

function addTreeCluster(add, x, y, count){
  for (let i=0;i<count;i++){
    add({
      type:"tree",
      x: x + i*42 + (rand()*18-9),
      y: y + (rand()*32-16),
      s: 0.9 + rand()*0.4,
      baseY: y + 30 + rand()*30
    });
  }
}

function addBushLine(add, x, y, count){
  for (let i=0;i<count;i++){
    add({
      type:"bush",
      x: x + i*36 + (rand()*14-7),
      y: y + (rand()*16-8),
      s: 0.8 + rand()*0.4,
      baseY: y + 18
    });
  }
}

function addFlowerPatch(add, x, y){
  for (let i=0;i<20;i++){
    add({
      type:"flower",
      x: x + (rand()*110-55),
      y: y + (rand()*60-30),
      s: 0.8 + rand()*0.6,
      baseY: y + 8
    });
  }
}

function drawTreeTrunk(ctx, x,y,s){
  const w = 16*s;
  const h = 26*s;
  ctx.fillStyle = "#6b4b2e";
  roundRect(ctx, x-w/2, y-h, w, h, 8*s, true);

  // trunk shadow
  ctx.fillStyle = "rgba(0,0,0,.18)";
  roundRect(ctx, x-w/2+2, y-h+4, w-4, 10*s, 6*s, true);

  // base shadow on ground
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y+4, 16*s, 7*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTreeCanopy(ctx, x,y,s){
  // warm leafy canopy (multiple blobs)
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#7ea24c";
  blob(ctx, x, y-34*s, 44*s, 28*s);
  ctx.fillStyle = "#89ad54";
  blob(ctx, x-18*s, y-24*s, 36*s, 24*s);
  ctx.fillStyle = "#6f9643";
  blob(ctx, x+22*s, y-20*s, 34*s, 22*s);

  // highlight
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  blob(ctx, x-10*s, y-36*s, 26*s, 14*s);
  ctx.globalAlpha = 1;
}

function drawRock(ctx, x,y,s){
  ctx.fillStyle = "#8b846f";
  blob(ctx, x, y, 22*s, 14*s);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  blob(ctx, x-6*s, y-6*s, 10*s, 6*s);
  ctx.globalAlpha = 1;

  // shadow
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x+2, y+10*s, 18*s, 6*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBush(ctx, x,y,s){
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#6fa14d";
  blob(ctx, x, y, 26*s, 16*s);
  ctx.fillStyle = "#7bb058";
  blob(ctx, x-12*s, y+2*s, 22*s, 14*s);
  ctx.fillStyle = "#5f8f3f";
  blob(ctx, x+14*s, y+3*s, 20*s, 12*s);
  ctx.globalAlpha = 1;
}

function drawFlower(ctx, x,y,s){
  // tiny flower speck
  ctx.globalAlpha = 0.9;
  const c = (Math.random() < 0.5) ? "#fff1d6" : "#ffd6ea";
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, 2.2*s, 1.6*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ---- Shapes ---- */

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

function blob(ctx, cx, cy, rx, ry){
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rand()*0.4, 0, Math.PI*2);
  ctx.fill();
}

function lerp(a,b,t){ return a + (b-a)*t; }

// Tiny deterministic-ish randomness per load (fine for now)
let _seed = 1337;
function rand(){
  // xorshift-ish
  _seed ^= _seed << 13; _seed ^= _seed >> 17; _seed ^= _seed << 5;
  return ((_seed >>> 0) % 10000) / 10000;
}
