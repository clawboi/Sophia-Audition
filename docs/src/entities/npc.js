// src/entities/npc.js
// NPC City — NPC System v3 (Director-mode safe upgrade)
// Goals (per your request):
// 1) NPCs feel "alive": they walk to places, pause, ENTER doors (disappear), then EXIT later.
// 2) NPC style closer to the player: same visual scale + cleaner silhouette.
// 3) No world/layout changes. No new assets. Pure code upgrade.

export class NPCSystem {
  constructor(world){
    this.world = world;
    this.list = [];
    this._seed = 1337;
  }

  seed(n){ this._seed = n|0; }

  spawnActorDistrict(){
    this.list.length = 0;

    const names = [
      { name:"Mira",  role:"citizen" },
      { name:"Jules", role:"citizen" },
      { name:"Noah",  role:"citizen" },
      { name:"Ivy",   role:"citizen" },
      { name:"Tess",  role:"citizen" },
      { name:"Rio",   role:"citizen" },
      { name:"Sage",  role:"citizen" },
      { name:"Kato",  role:"citizen" },
      { name:"Cass",  role:"agent"   }, // casting agent for gigs
    ];

    // Spawn near Midtown/Studio Row-ish (same as before)
    const base = [
      { x: 1120, y: 560 },
      { x: 980,  y: 640 },
      { x: 1300, y: 610 },
      { x: 760,  y: 620 },
      { x: 860,  y: 520 },
      { x: 1460, y: 540 },
      { x: 1540, y: 700 },
      { x: 1180, y: 420 },
      { x: 1180, y: 520 }, // near stage (agent)
    ];

    for (let i=0; i<names.length; i++){
      const b = base[i] || { x: 1100, y: 600 };
      const c = palette(i);

      const n = {
        id: `npc_${i}`,
        name: names[i].name,
        kind: names[i].role,

        x: b.x + (rand(this)*40-20),
        y: b.y + (rand(this)*40-20),
        w: 18,
        h: 18,

        vx: 0,
        vy: 0,
        _stuckT: 0,
        _lx: 0,
        _ly: 0,
        faceX: 0,
        faceY: 1,

        // behavior
        t: rand(this)*10,
        state: "roam",     // roam | go | wait | inside
        waitT: 0,
        insideT: 0,
        goal: null,        // {x,y,type,door?}
        route: [],         // queued goals

        // blink timers
        blinkT: 0,
        blinkNext: 1.2 + rand(this)*2.6,

        talkSeed: (i*17+9)|0,
        col: c,

        // draw
        hidden: false,
      };

      // give each NPC a tiny routine
      n.route = this._buildRoutine(n, null);
      n._dayKey = null;
      this.list.push(n);
    }
  }

  _pois(){
    const w = this.world || {};
    const out = [];

    // park center
    if (w.park) out.push({ type:"park", x: w.park.x + w.park.w*0.5, y: w.park.y + w.park.h*0.5 });

    // amenities if present
    if (w.pool)   out.push({ type:"pool",   x: w.pool.x + w.pool.w*0.5,   y: w.pool.y + w.pool.h*0.5 });
    if (w.tennis) out.push({ type:"tennis", x: w.tennis.x + w.tennis.w*0.5, y: w.tennis.y + w.tennis.h*0.5 });

    // mailbox/payphone box
    if (w.box) out.push({ type:"box", x: w.box.x + w.box.w*0.5, y: w.box.y + w.box.h*0.5 });

    // doors (enter/exit)
    if (Array.isArray(w.doors)){
      for (const d of w.doors){
        out.push({ type:"door", x: d.x + d.w*0.5, y: d.y + d.h*0.5, door: d });
      }
    }

    // fallback
    if (!out.length) out.push({ type:"mid", x: 1200, y: 700 });

    return out;
  }

  _buildRoutine(n, clock){

const pois = this._pois();

const hour = (clock && typeof clock.h === "number") ? clock.h : null;

// Helper: pick POI by type, fallback to any.
const byType = (type) => {
  const arr = pois.filter(p => p.type === type);
  return arr.length ? arr[(rand(this)*arr.length)|0] : null;
};
const any = () => pois[(rand(this)*pois.length)|0];

const route = [];

// Time windows:
// Morning (6-11): leave/doors + park
// Afternoon (11-17): amenities + box
// Evening (17-21): stage/park
// Night (21-6): doors/home bias (more inside)
const isMorning = hour !== null && hour >= 6  && hour < 11;
const isAft     = hour !== null && hour >= 11 && hour < 17;
const isEve     = hour !== null && hour >= 17 && hour < 21;
const isNight   = hour !== null && (hour >= 21 || hour < 6);

// agent stays near stage always
if (n.kind === "agent"){
  return [
    { type:"stage", x: 1180, y: 520 },
    { type:"stage", x: 1180, y: 520 },
    { type:"box", x: (this.world?.box?.x ?? 1140) + 30, y: (this.world?.box?.y ?? 1080) + 30 },
    { type:"stage", x: 1180, y: 520 },
  ];
}

const door = byType("door");
const park = byType("park");
const pool = byType("pool");
const tennis = byType("tennis");
const box = byType("box");

if (isMorning){
  if (door) route.push({ ...door });
  if (park) route.push({ ...park });
  route.push({ ...(park || any()) });
  if (box) route.push({ ...box });
  if (door) route.push({ ...door });
} else if (isAft){
  if (box) route.push({ ...box });
  if (pool) route.push({ ...pool });
  if (tennis) route.push({ ...tennis });
  route.push({ ...any() });
  if (door && rand(this) < 0.35) route.push({ ...door });
} else if (isEve){
  route.push({ type:"stage", x: 1180, y: 520 });
  if (park) route.push({ ...park });
  if (box) route.push({ ...box });
  route.push({ ...any() });
} else if (isNight){
  if (door) route.push({ ...door });
  route.push({ ...any() });
  if (door) route.push({ ...door });
  route.push({ ...any() });
  if (door) route.push({ ...door });
} else {
  // If no clock provided, keep your original varied loop.
  const pick = () => pois[(rand(this)*pois.length)|0];
  for (let k=0; k<6; k++){
    const p = pick();
    route.push({ ...p });
    if (k % 2 === 1 && rand(this) < 0.55){
      const d = pois.find(x => x.type==="door");
      if (d) route.push({ ...d });
    }
  }
}

// Ensure route not empty
if (!route.length) route.push({ ...any() });

return route;

  }

  _pickNextGoal(n){
    if (!n.route || !n.route.length) n.route = this._buildRoutine(n, null);
      n._dayKey = null;
    const g = n.route.shift();
    // recycle
    if (g) n.route.push(g);
    n.goal = g || null;
    n.state = n.goal ? "go" : "roam";
  }

  update(dt, clock){
    const solidsHit = (rect) => this.world?.hitsSolid ? this.world.hitsSolid(rect) : false;

    for (let i=0; i<this.list.length; i++){
      const n = this.list[i];
      n.t += dt;


// rebuild routines on day change (ties NPC life to the real-time clock)
const dayKey = clock?.day ?? null;
if (dayKey && n._dayKey !== dayKey){
  n._dayKey = dayKey;
  n.route = this._buildRoutine(n, clock);
  n.goal = null;
  if (n.state !== "inside") n.state = "roam";
}

      // blink
      n.blinkNext -= dt;
      if (n.blinkNext <= 0){
        n.blinkT = 0.12;
        n.blinkNext = 1.4 + rand(this)*3.2;
      }
      if (n.blinkT > 0) n.blinkT = Math.max(0, n.blinkT - dt);

      // inside (entered a building)
      if (n.state === "inside"){
        n.insideT -= dt;
        n.hidden = true;
        n.vx = 0; n.vy = 0;
        if (n.insideT <= 0){
          n.hidden = false;
          // exit at the same door if we have it
          if (n.goal?.door){
            n.x = clamp(n.goal.door.x + n.goal.door.w/2 - n.w/2 + (rand(this)*14-7), 0, this.world.w - n.w);
            n.y = clamp(n.goal.door.y + n.goal.door.h/2 - n.h/2 + (rand(this)*14-7), 0, this.world.h - n.h);
          }
          n.state = "wait";
          n.waitT = 0.35 + rand(this)*0.8;
          n.goal = null;
        }
        continue;
      }

      // choose a goal if we don't have one
      if (!n.goal && n.state !== "wait"){
        this._pickNextGoal(n);
      }

      // waiting
      if (n.state === "wait"){
        n.waitT -= dt;
        n.vx = 0; n.vy = 0;
        if (n.waitT <= 0){
          n.state = "go";
          if (!n.goal) this._pickNextGoal(n);
        }
      }

      // go-to behavior (pathless, cheap steering)
      if (n.state === "go" && n.goal){
        const gx = n.goal.x, gy = n.goal.y;
        const dx = gx - (n.x + n.w/2);
        const dy = gy - (n.y + n.h/2);
        const d = Math.hypot(dx,dy);

        const spdBase = (n.kind === "agent") ? 34 : 30;
        const spd = spdBase + rand(this)*10;

        if (d < 18){
          // reached
          if (n.goal.type === "door" && n.goal.door){
            n.state = "inside";
            n.insideT = 2.5 + rand(this)*8.5; // stays inside a bit
            // keep goal so we know where to exit
          } else {
            n.state = "wait";
            n.waitT = 0.6 + rand(this)*1.6;
            n.goal = null;
          }
          n.vx = 0; n.vy = 0;
        } else {
          n.vx = (dx / d) * spd;
          n.vy = (dy / d) * spd;
        }
      }

      // fallback roam (rare)
      if (n.state === "roam"){
        // Simple wander AI: pick a direction, walk a bit, pause a bit.
        n.waitT -= dt;
        if (n.waitT <= 0){
          const mode = rand(this) < 0.25 ? "pause" : "walk";
          if (mode === "pause"){
            n.vx = 0; n.vy = 0;
            n.waitT = 0.55 + rand(this)*0.85;
          } else {
            const ang = rand(this) * Math.PI * 2;
            const spd = 26 + rand(this)*22;
            n.vx = Math.cos(ang) * spd;
            n.vy = Math.sin(ang) * spd;
            n.waitT = 0.9 + rand(this)*1.6;
          }
        }
      }

      // Nudge agent to stay near stage (keep your original behavior)
      if (n.kind === "agent"){
        const ax = 1180, ay = 520;
        const dx = ax - n.x;
        const dy = ay - n.y;
        const d = Math.hypot(dx,dy);
        if (d > 180){
          n.vx = (dx/d) * 55;
          n.vy = (dy/d) * 55;
          n.state = "go";
        }
      }

      
// Movement + collision (axis slide, no goofy bounce)
const nx = n.x + n.vx * dt;
const ny = n.y + n.vy * dt;

// track stuck (did we actually move?)
const moved = (Math.abs(n.x - n._lx) + Math.abs(n.y - n._ly)) > 0.25;
n._lx = n.x; n._ly = n.y;
n._stuckT = moved ? 0 : (n._stuckT + dt);

// axis slide
let tx = nx, ty = n.y;
if (!solidsHit({ x: tx, y: ty, w: n.w, h: n.h })){
  n.x = tx;
} else {
  n.vx = 0;
}
tx = n.x; ty = ny;
if (!solidsHit({ x: tx, y: ty, w: n.w, h: n.h })){
  n.y = ty;
} else {
  n.vy = 0;
}

// If stuck for too long, pick a new goal (prevents "NPC glued to wall")
if (n._stuckT > 0.9){
  n._stuckT = 0;
  n.goal = null;
  n.state = "roam";
  n.waitT = 0.15 + rand(this)*0.35;
}
// Bounds
      n.x = clamp(n.x, 0, this.world.w - n.w);
      n.y = clamp(n.y, 0, this.world.h - n.h);

      // Facing
      if (Math.abs(n.vx) + Math.abs(n.vy) > 1){
        const ax2 = Math.abs(n.vx), ay2 = Math.abs(n.vy);
        if (ax2 > ay2){
          n.faceX = n.vx > 0 ? 1 : -1;
          n.faceY = 0;
        } else {
          n.faceX = 0;
          n.faceY = n.vy > 0 ? 1 : -1;
        }
      }
    }
  }

  draw(ctx, camera){
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    for (let i=0; i<this.list.length; i++){
      const n = this.list[i];
      if (n.hidden) continue;

      // shadow
      ctx.fillStyle = "rgba(0,0,0,.28)";
      ctx.beginPath();
      const rx = Math.round(n.x);
      const ry = Math.round(n.y);
      ctx.ellipse(rx + n.w/2, ry + n.h + 3, 8, 3, 0, 0, Math.PI*2);
      ctx.fill();

      n._rx = rx; n._ry = ry;
      drawNPCSprite(ctx, n);
      n._rx = null; n._ry = null;
    }
    ctx.restore();
  }

  nearest(px, py, r){
    let best = null;
    let bd = r;
    for (let i=0; i<this.list.length; i++){
      const n = this.list[i];
      if (n.hidden) continue;
      const dx = (n.x + n.w/2) - px;
      const dy = (n.y + n.h/2) - py;
      const d = Math.hypot(dx,dy);
      if (d < bd){ bd = d; best = n; }
    }
    return best;
  }

  talkLines(npc){
    const s = (npc.talkSeed|0) + (npc.kind === "agent" ? 77 : 0);
    const linesCitizen = [
      "Nice night for a walk.",
      "Rent's brutal out here.",
      "Studio Row got vibes.",
      "I heard the 8PM show gets tips.",
      "You look like you're grinding.",
      "I'm just trying to stay paid.",
      "I swear I saw someone vanish into that door.",
    ];
    const linesAgent = [
      "You want stage time? Prove you're consistent.",
      "Flyers. Always flyers. Bring the city to the show.",
      "No drama. Just performance.",
      "You miss 8PM, you lose momentum.",
    ];
    const pool = (npc.kind === "agent") ? linesAgent : linesCitizen;
    return pool[(hash(s) % pool.length)|0];
  }
}

/* ===========================
   NPC sprite (player-adjacent)
   =========================== */
function drawNPCSprite(ctx, n){
  // Same visual scale as player (px=2, 16x20 grid)
  const moving = (Math.abs(n.vx) + Math.abs(n.vy)) > 1;
  const bob = moving ? ((Math.sin(n.t*9) > 0) ? 1 : 0) : 0;
  const blinking = n.blinkT > 0;

  const skin = n.col.skin;
  const hair = n.col.hair;
  const top  = n.col.top;
  const bot  = n.col.bot;
  const shoe = n.col.shoe;

  const px2 = 2;
  const SW = 16, SH = 20;
  const W = SW * px2, H = SH * px2;

  const x = (n._rx != null) ? n._rx : n.x;
  const y = (n._ry != null) ? n._ry : n.y;
  const cx = (x + n.w/2);
  const feetY = (y + n.h + 2);

  const sx = Math.round(cx - W/2);
  const sy = Math.round(feetY - H + bob);

  const P = (ix, iy, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(sx + ix*px2, sy + iy*px2, px2, px2);
  };

  // Hair cap
  for (let x=5; x<=10; x++) P(x,0,hair);
  for (let x=4; x<=11; x++) P(x,1,hair);
  P(4,2,hair); P(11,2,hair);

  // Head/face
  for (let x=5; x<=10; x++) P(x,2,skin);
  for (let x=4; x<=11; x++) P(x,3,skin);
  for (let x=4; x<=11; x++) P(x,4,skin);

  // Eyes
  if (!blinking){
    P(6,4,"#111"); P(9,4,"#111");
    P(6,5,"rgba(255,255,255,.65)"); P(9,5,"rgba(255,255,255,.65)");
  } else {
    P(6,4,"#111"); P(9,4,"#111");
  }

  // Neck
  P(7,6,skin); P(8,6,skin);

  // Torso
  for (let y=7; y<=11; y++){
    for (let x=5; x<=10; x++) P(x,y,top);
  }
  P(4,9,top); P(11,9,top);

  // Arms (tiny swing)
  const arm = moving ? ((Math.sin(n.t*10) > 0) ? 1 : 0) : 0;
  P(4,10+arm,skin); P(11,10-arm,skin);
  P(4,11+arm,skin); P(11,11-arm,skin);

  // Waist
  for (let x=5; x<=10; x++) P(x,12,bot);

  // Legs
  for (let y=13; y<=16; y++){
    P(6,y,bot); P(9,y,bot);
  }

  // Shoes (slim like player, not chunky)
  P(5,17,shoe); P(6,17,shoe);
  P(9,17,shoe); P(10,17,shoe);
  if (moving){
    const step = (Math.sin(n.t*10) > 0) ? 1 : 0;
    if (step) { P(6,17,"rgba(255,255,255,.10)"); }
    else { P(9,17,"rgba(255,255,255,.10)"); }
  }

  // Little outline pixels (subtle depth, still fast)
  const ol = "rgba(0,0,0,.35)";
  P(4,3,ol); P(11,3,ol);
  P(4,12,ol); P(11,12,ol);
  P(5,17,ol); P(10,17,ol);
}

/* ===========================
   deterministic helpers
   =========================== */
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function hash(n){
  n |= 0;
  n = (n ^ (n >>> 16)) * 0x45d9f3b;
  n = (n ^ (n >>> 16)) * 0x45d9f3b;
  n = n ^ (n >>> 16);
  return n >>> 0;
}
function rand(sys){
  // xorshift-ish
  let x = sys._seed|0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  sys._seed = x|0;
  return ((x >>> 0) / 4294967296);
}
function palette(i){
  const skins = ["#f2c9a0","#e8b98e","#d8a579","#c88f62","#b97b52","#a96a44"];
  const hairs = ["#1a1a1a","#2a1b10","#3a2a1a","#5b3b22","#7a4a2a","#d8c19a"];
  const tops  = ["#111","#202020","#2b0f3b","#0b1d3a","#2a3a0b","#3a0b0b"];
  const bots  = ["#0d0d0f","#1a1a24","#151515","#101018","#121212","#0f1012"];
  const shoes = ["#0a0a0a","#111","#0b0b14","#151515","#0d0d0d","#0a0a12"];

  return {
    skin: skins[i % skins.length],
    hair: hairs[(i*3) % hairs.length],
    top:  tops[(i*5+1) % tops.length],
    bot:  bots[(i*7+2) % bots.length],
    shoe: shoes[(i*11+3) % shoes.length],
  };
}
