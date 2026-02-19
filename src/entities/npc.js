// src/entities/npc.js
// Tiny NPC system (V2 foundation): walkers + talk prompts + simple gigs

export class NPCSystem {
  constructor(world){
    this.world = world;
    this.list = [];
    this._seed = 1337;
  }

  seed(n){ this._seed = n|0; }

  spawnActorDistrict(){
    this.list.length = 0;

    // Keep it small and readable. We can scale counts later.
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

    // Spawn inside Midtown / Studio Row area
    const base = [
      { x: 1120, y: 560 },
      { x: 980,  y: 640 },
      { x: 1300, y: 610 },
      { x: 760,  y: 620 },
      { x: 860,  y: 520 },
      { x: 1460, y: 540 },
      { x: 1540, y: 700 },
      { x: 1180, y: 420 },
      { x: 1180, y: 520 }, // near the stage (agent)
    ];

    for (let i=0; i<names.length; i++){
      const b = base[i] || { x: 1100, y: 600 };
      const c = palette(i);
      this.list.push({
        id: `npc_${i}`,
        name: names[i].name,
        kind: names[i].role,
        x: b.x + (rand(this)*40-20),
        y: b.y + (rand(this)*40-20),
        w: 16,
        h: 16,
        vx: 0,
        vy: 0,
        faceX: 0,
        faceY: 1,
        t: rand(this)*10,
        wanderT: 0,
        talkSeed: (i*17+9)|0,
        col: c,
      });
    }
  }

  update(dt){
    const solidsHit = (rect) => this.world?.hitsSolid ? this.world.hitsSolid(rect) : false;
    for (let i=0; i<this.list.length; i++){
      const n = this.list[i];
      n.t += dt;

      // Simple wander AI: pick a direction, walk a bit, pause a bit.
      n.wanderT -= dt;
      if (n.wanderT <= 0){
        const mode = rand(this) < 0.25 ? "pause" : "walk";
        if (mode === "pause"){
          n.vx = 0; n.vy = 0;
          n.wanderT = 0.55 + rand(this)*0.85;
        } else {
          const ang = rand(this) * Math.PI * 2;
          const spd = 26 + rand(this)*22;
          n.vx = Math.cos(ang) * spd;
          n.vy = Math.sin(ang) * spd;
          n.wanderT = 0.9 + rand(this)*1.6;
        }
      }

      // Nudge agent to stay near stage
      if (n.kind === "agent"){
        const ax = 1180, ay = 520;
        const dx = ax - n.x;
        const dy = ay - n.y;
        const d = Math.hypot(dx,dy);
        if (d > 140){
          n.vx = (dx/d) * 55;
          n.vy = (dy/d) * 55;
          n.wanderT = 0.35;
        }
      }

      // Movement + basic collision bounce
      const nx = n.x + n.vx * dt;
      const ny = n.y + n.vy * dt;

      // axis collision like player (cheap)
      let tx = nx;
      let ty = n.y;
      if (!solidsHit({ x: tx, y: ty, w: n.w, h: n.h })){
        n.x = tx;
      } else {
        n.vx *= -0.6;
      }
      tx = n.x;
      ty = ny;
      if (!solidsHit({ x: tx, y: ty, w: n.w, h: n.h })){
        n.y = ty;
      } else {
        n.vy *= -0.6;
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

      // shadow
      ctx.fillStyle = "rgba(0,0,0,.28)";
      ctx.beginPath();
      ctx.ellipse(n.x + n.w/2, n.y + n.h + 4, 9, 4, 0, 0, Math.PI*2);
      ctx.fill();

      // body (tiny pixel person)
      drawNPCSprite(ctx, n);
    }
    ctx.restore();
  }

  nearest(px, py, r){
    let best = null;
    let bd = r;
    for (let i=0; i<this.list.length; i++){
      const n = this.list[i];
      const dx = (n.x + n.w/2) - px;
      const dy = (n.y + n.h/2) - py;
      const d = Math.hypot(dx,dy);
      if (d < bd){ bd = d; best = n; }
    }
    return best;
  }

  talkLines(npc){
    // Deterministic-ish lines per NPC
    const s = (npc.talkSeed|0) + (npc.kind === "agent" ? 77 : 0);
    const linesCitizen = [
      "Nice night for a walk.",
      "Rent's brutal out here.",
      "Studio Row got vibes.",
      "I heard the 8PM show gets tips.",
      "You look like you're grinding.",
    ];
    const linesAgent = [
      "You want stage time? Prove you're consistent.",
      "Flyers. Always flyers. Bring the city to the show.",
      "Network. Perform. Repeat.",
      "If you miss 8PM, people forget you.",
    ];
    const pick = (arr) => arr[Math.abs(hash(s + arr.length*13)) % arr.length];
    const a = npc.kind === "agent" ? linesAgent : linesCitizen;
    return [pick(a), pick(a.slice().reverse())];
  }
}

function drawNPCSprite(ctx, n){
  const x = n.x|0;
  const y = n.y|0;
  const skin = n.col.skin;
  const hair = n.col.hair;
  const top  = n.col.top;
  const bot  = n.col.bot;

  // head
  px(ctx, x+6, y+2, 4, 4, skin);
  // hair cap
  px(ctx, x+6, y+1, 4, 2, hair);
  // body
  px(ctx, x+6, y+6, 4, 5, top);
  // legs
  px(ctx, x+6, y+11, 2, 3, bot);
  px(ctx, x+8, y+11, 2, 3, bot);
  // tiny arm hint
  if (n.faceX !== 0){
    const ax = n.faceX > 0 ? x+10 : x+5;
    px(ctx, ax, y+7, 1, 3, skin);
  }
}

function px(ctx,x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function rand(sys){
  // xorshift32
  let x = sys._seed|0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  sys._seed = x|0;
  return ((x >>> 0) / 4294967296);
}

function hash(n){
  let x = n|0;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = (x >>> 16) ^ x;
  return x|0;
}

function palette(i){
  const skins = ["#f2c7a1", "#d8a77f", "#b9835a", "#8a5a3b"]; 
  const hairs = ["#121218", "#2a1b12", "#2b2b33", "#4b2a1a"]; 
  const tops  = ["rgba(138,46,255,.95)", "rgba(255,255,255,.75)", "rgba(0,255,156,.75)", "rgba(255,60,120,.75)"]; 
  const bots  = ["rgba(255,255,255,.22)", "rgba(255,255,255,.32)", "rgba(255,255,255,.18)"]; 
  return {
    skin: skins[i % skins.length],
    hair: hairs[(i*2) % hairs.length],
    top: tops[(i*3) % tops.length],
    bot: bots[(i*5) % bots.length]
  };
}
