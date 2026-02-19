// src/entities/player.js
// NPC City Player — v15 (full replacement)
//
// CHANGE (ONLY): de-goofy the feet.
// - Keeps the “two legs readable” goal, but removes the chunky 2x2 “Mickey” shoes.
// - Shoes become slimmer + anchored (less lopsided), and swing is smaller/cleaner.
// - Side-view feet also slimmed (no big blocks).
//
// Everything else stays the same: facing rules, punch feel, spark, side 2-hand weapon, etc.

export class Player {
  constructor(){
    this._lastX = 0;
    this._lastY = 0;
    this._lastT = 0;

    this._blinkNext = 1.6;
    this._blinkHold = 0;

    this._step = 0;

    // body facing (4-dir) + attack facing (8-dir)
    this._face4 = "S";
    this._atk8  = "S";

    // cached
    this._tmp = { dx:0, dy:0 };
  }

  reset(p){
    // Renderer-only reset (safe for New Game / Load)
    this._lastX = p?.x ?? 0;
    this._lastY = p?.y ?? 0;
    this._lastT = 0;

    this._step = 0;
    this._blinkHold = 0;
    this._blinkNext = 1.6;

    const fx = (p?.faceX ?? 0);
    const fy = (p?.faceY ?? 1);
    this._face4 = this._faceDir4(fx, fy);
    this._atk8  = this._faceDir8(fx, fy);
  }

  draw(ctx, p, input, now){
    now = (typeof now === "number") ? now : (performance?.now?.() ?? 0);
    // inputs
    const ix = (input?.ix ?? 0);
    const iy = (input?.iy ?? 0);

    // moving?
    const moving = (Math.abs(ix) + Math.abs(iy)) > 0.01;

    const punching = ((p.punchT ?? 0) > 0);

    // running?
    const running = !!p.running;

    // acting?
    const acting = (p.punchT > 0) || (p.dodgeT > 0) || (p.jumpT > 0);

    // delta time from last draw call
    let dt = 0.016;
    if (this._lastT){
      dt = Math.max(0.001, Math.min(0.05, (now - this._lastT) / 1000));
    }
    this._lastT = now;

    // compute raw facing from movement vector (4-dir for body)
    // and flipped Y for attack (so diagonals feel correct like your punching)
    const fxRaw = ix;
    const fyRaw = iy;

    if (Math.abs(fxRaw) + Math.abs(fyRaw) > 0.25){
      this._face4 = this._faceDir4(fxRaw, fyRaw); // BODY raw
      this._atk8  = this._faceDir8(fxRaw, fyRaw); // ATTACK flipped
    }

    const face4 = this._face4;
    const atk8  = this._atk8;

    // step cadence (Pokemon-ish)
    // TUNED: slightly slower to reduce “shaky” feel while moving
    const stepRate = moving ? (running ? 11.0 : 7.2) : 1.0;
    this._step += dt * stepRate;

    // blink
    if (this._blinkHold > 0){
      this._blinkHold = Math.max(0, this._blinkHold - dt);
    } else {
      this._blinkNext -= dt;
      if (this._blinkNext <= 0){
        this._blinkHold = 0.10;
        this._blinkNext = 1.1 + Math.random()*3.0;
      }
    }
    const blinking = this._blinkHold > 0;

    // size + anchor
    const px = 2;
    const SW = 16, SH = 20;
    const W = SW * px, H = SH * px;

    const cx = p.x + p.w/2;
    const feetY = p.y + p.h + 2;

    // tiny idle breathe only
    const bob = (!moving && !acting) ? (Math.sin(now * 0.0012) * 0.12) : 0;

    // punch progress
    let swingP = 0;
    if (punching){
      const t = Math.max(0, Math.min(1, p.punchT)); // 1..0 in your game
      swingP = 1 - t; // 0..1
    }

    // vectors
    const atkVec = this._dirVec8(atk8);
    const hitKick = punching ? this._hitKick(swingP) : 0;

    const sx = Math.round(cx - W/2) + atkVec.dx * hitKick;
    const sy = Math.round(feetY - H - (p.z || 0) + bob) + atkVec.dy * hitKick;

    // palette
    const C = {
      teal:   "#309988",
      tealS:  "#3B6364",
      navy:   "#31325A",
      hair:   "#402632",
      pants:  "#4D5499",
      shirt1: "#703E50",
      shirt2: "#7E3541",
      shirt3: "#7F3441",
      skin:   "#F9BEA6",
      blush:  "#EE8C7B",
      white:  "#FFFFFF",
      steel:  "#cfd6e6",
      steelS: "#7a86a6",
      wood:   "#8a5a2b",
      glow:   "#ffea6a",
      ink:    "rgba(0,0,0,.35)"
    };

    const P = (ix, iy, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(sx + ix*px, sy + iy*px, px, px);
    };

    // punch state
    

    // walk frame (4-frame)
    const frame = moving ? (Math.floor(this._step) % 4) : 0;

    const stepA = (frame === 1);
    const stepB = (frame === 3);

    const stride = moving ? 1 : 0; // consistent stride keeps feet grounded

    const isNS = (face4 === "N" || face4 === "S");
    const isEW = (face4 === "E" || face4 === "W");

    let lfX = 0, lfY = 0, rfX = 0, rfY = 0;

    if (moving && !acting){
      if (isNS){
        const spread = stride; // tighter stance (no “Mickey” spread)
        lfX = stepA ? -spread : stepB ? spread : 0;
        rfX = stepA ?  spread : stepB ? -spread : 0;
        lfY = stepA ? -1 : 0;
        rfY = stepB ? -1 : 0;
      } else if (isEW){
        const lift = 1;
        lfY = stepA ? -lift : stepB ? lift : 0;
        rfY = stepA ?  lift : stepB ? -lift : 0;

        const nudge = running ? 1 : 0;
        if (face4 === "E"){ lfX = stepA ? nudge : 0; rfX = stepB ? nudge : 0; }
        if (face4 === "W"){ lfX = stepA ? -nudge : 0; rfX = stepB ? -nudge : 0; }
      }
    }

    // hip shift (vertical bob only — avoids nausea-inducing side sway)
    let hipX = 0, hipY = 0;
    if (moving && !acting){
      // 4-frame cadence: add a tiny down-bob on the passing frames
      hipY = (stepA || stepB) ? 1 : 0;
    }

    // walk arm swing
    const armSwing = (moving && !acting) ? 1 : 0;
    const lArmOff = stepA ? -armSwing : stepB ? armSwing : 0;
    const rArmOff = stepA ?  armSwing : stepB ? -armSwing : 0;

    // punch swing (use attack vector)
    const perp = { dx: -atkVec.dy, dy: atkVec.dx };
    const swing = this._swingOffsetsTight(swingP, atkVec, perp);

    // held item: allow none
    let held = p.held ?? null;
    if (held === "none") held = null;

    // draw body by 4-dir sprite
    if (face4 === "S"){
      this._drawFront(P, C, { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, atkVec });
    } else if (face4 === "N"){
      this._drawBack(P, C,  { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, atkVec });
    } else if (face4 === "E"){
      this._drawSide(P, C,  { dir:"E", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held });
    } else {
      this._drawSide(P, C,  { dir:"W", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held });
    }

    // spark uses 8-dir so diagonals get their own hit mark
    if (punching){
      this._drawPunchSpark(ctx, p, atkVec, swingP);
    }
  }

  // =========================
  // FRONT (S)
  // =========================
  _drawFront(P, C, s){
    const { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, atkVec } = s;

    const bx = hipX, by = hipY;

    // --- back arm (behind body) ---
    this._armFront(P, C, { x:2 + bx, y:7 + by + rArmOff, side:"R", behind:true, punching, swing, atkVec });

    // --- legs ---
    this._legFront(P, C, { x:6 + bx + lfX, y:13 + by + lfY, side:"L" });
    this._legFront(P, C, { x:9 + bx + rfX, y:13 + by + rfY, side:"R" });

    // --- torso ---
    this._torsoFront(P, C, { x:5 + bx, y:6 + by });

    // --- head ---
    this._headFront(P, C, { x:5 + bx, y:1 + by, blinking });

    // --- front arm ---
    this._armFront(P, C, { x:11 + bx, y:7 + by + lArmOff, side:"L", behind:false, punching, swing, atkVec });

    // held item (front view)
    if (held){
      this._heldFront(P, C, { x: 11 + bx, y: 10 + by, held, punching, swing, atkVec });
    }
  }

  // =========================
  // BACK (N)
  // =========================
  _drawBack(P, C, s){
    const { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, atkVec } = s;

    const bx = hipX, by = hipY;

    // arms behind
    this._armBack(P, C, { x:3 + bx, y:7 + by + rArmOff, side:"R", punching, swing, atkVec });
    this._armBack(P, C, { x:11 + bx, y:7 + by + lArmOff, side:"L", punching, swing, atkVec });

    // legs
    this._legBack(P, C, { x:6 + bx + lfX, y:13 + by + lfY, side:"L" });
    this._legBack(P, C, { x:9 + bx + rfX, y:13 + by + rfY, side:"R" });

    // torso
    this._torsoBack(P, C, { x:5 + bx, y:6 + by });

    // head
    this._headBack(P, C, { x:5 + bx, y:1 + by });

    // held (back view still shows weapon if two-handed)
    if (held){
      this._heldBack(P, C, { x: 8 + bx, y: 9 + by, held, punching, swing, atkVec });
    }
  }

  // =========================
  // SIDE (E/W)
  // =========================
  _drawSide(P, C, s){
    const { dir, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held } = s;

    const bx = hipX, by = hipY;

    const facingE = (dir === "E");
    const x0 = 6 + bx;
    const y0 = 2 + by;

    // legs (alternate Y for side walk)
    const backLegY  = 12 + by + lfY;
    const frontLegY = 12 + by + rfY;

    // back leg
    this._legSide(P, C, { x:x0 + (facingE ? 0 : 2), y:backLegY, front:false, facingE });

    // torso
    this._torsoSide(P, C, { x:x0, y:y0, facingE });

    // arms
    this._armSide(P, C, { x:x0 + (facingE ? -1 : 5), y:7 + by + rArmOff, front:false, facingE, punching, swing });
    this._armSide(P, C, { x:x0 + (facingE ?  2 : 2), y:7 + by + lArmOff, front:true,  facingE, punching, swing });

    // head
    this._headSide(P, C, { x:x0, y:y0-1, facingE });

    // front leg
    this._legSide(P, C, { x:x0 + (facingE ? 1 : 1), y:frontLegY, front:true, facingE });

    // held weapon in front for side
    if (held){
      this._heldSide(P, C, { x:x0 + (facingE ? 4 : -2), y:9 + by, facingE, held, punching, swing });
    }
  }

  // =========================
  // PARTS
  // =========================
  _headFront(P, C, o){
    const { x, y, blinking } = o;
    // hair
    P(x+1, y+0, C.hair); P(x+2,y+0,C.hair); P(x+3,y+0,C.hair); P(x+4,y+0,C.hair);
    P(x+0, y+1, C.hair); P(x+5,y+1,C.hair);

    // face
    for (let iy=1; iy<=4; iy++){
      for (let ix=1; ix<=4; ix++){
        P(x+ix, y+iy, C.skin);
      }
    }

    // eyes
    if (!blinking){
      P(x+2, y+2, C.ink);
      P(x+4, y+2, C.ink);
    }

    // blush
    P(x+1,y+3,C.blush);
    P(x+5,y+3,C.blush);
  }

  _headBack(P, C, o){
    const { x, y } = o;
    // hair cap
    for (let ix=0; ix<=5; ix++) P(x+ix, y+0, C.hair);
    for (let ix=0; ix<=5; ix++) P(x+ix, y+1, C.hair);
    // neck
    P(x+2,y+4,C.skin); P(x+3,y+4,C.skin);
  }

  _headSide(P, C, o){
    const { x, y, facingE } = o;
    // hair
    for (let ix=0; ix<=5; ix++) P(x+ix,y+0,C.hair);
    P(x+(facingE?5:0),y+1,C.hair);
    // face
    for (let iy=1; iy<=4; iy++){
      for (let ix=1; ix<=4; ix++) P(x+ix,y+iy,C.skin);
    }
    // eye (single)
    P(x+(facingE?4:2), y+2, C.ink);
  }

  _torsoFront(P, C, o){
    const { x, y } = o;
    // shirt block
    for (let iy=0; iy<=6; iy++){
      for (let ix=0; ix<=5; ix++){
        const col = (iy<2) ? C.shirt1 : (iy<5 ? C.shirt2 : C.shirt3);
        P(x+ix,y+iy,col);
      }
    }
    // belt hint
    P(x+1,y+6,C.navy);
    P(x+4,y+6,C.navy);
  }

  _torsoBack(P, C, o){
    const { x, y } = o;
    for (let iy=0; iy<=6; iy++){
      for (let ix=0; ix<=5; ix++){
        const col = (iy<3) ? C.shirt1 : C.shirt2;
        P(x+ix,y+iy,col);
      }
    }
  }

  _torsoSide(P, C, o){
    const { x, y, facingE } = o;
    // a slightly tapered shirt side
    const baseX = x + (facingE ? 0 : 0);
    for (let iy=0; iy<=7; iy++){
      for (let ix=0; ix<=4; ix++){
        const col = (iy<3) ? C.shirt1 : (iy<6 ? C.shirt2 : C.shirt3);
        P(baseX+ix, y+iy, col);
      }
    }
    // outline
    P(baseX+(facingE?0:4), y+2, C.navy);
  }

  _legFront(P, C, o){
    const { x, y, side } = o;
    // pants column
    P(x,y+0,C.pants);
    P(x,y+1,C.pants);
    P(x,y+2,C.pants);
    P(x,y+3,C.pants);

    // shoe (slimmer, anchored)
    // old “Mickey” was chunky; now 2 pixels wide but flatter
    P(x,  y+4, C.navy);
    P(x+1,y+4, C.navy);
    P(x,  y+5, C.navy);

    // toe
    P(x+1,y+5,C.tealS);
  }

  _legBack(P, C, o){
    const { x, y } = o;
    // pants
    P(x,y+0,C.pants);
    P(x,y+1,C.pants);
    P(x,y+2,C.pants);
    P(x,y+3,C.pants);

    // shoe
    P(x,  y+4, C.navy);
    P(x+1,y+4, C.navy);
    P(x+1,y+5, C.navy);
  }

  _legSide(P, C, o){
    const { x, y, front, facingE } = o;
    // pants
    P(x,y+0,C.pants);
    P(x,y+1,C.pants);
    P(x,y+2,C.pants);
    P(x,y+3,C.pants);

    // shoe side: slimmer than before
    P(x, y+4, C.navy);
    P(x, y+5, C.navy);
    if (front){
      P(x+(facingE?1:-1), y+5, C.tealS);
    }
  }

  _armFront(P, C, o){
    const { x, y, behind, punching, swing, atkVec } = o;

    // base arm
    const col = behind ? C.tealS : C.teal;

    let ax = x, ay = y;

    // punch offsets: only for front arm (behind arm stays simple)
    if (punching && !behind){
      ax += swing.handX;
      ay += swing.handY;
    }

    // arm pixels
    P(ax,y+0,col);
    P(ax,y+1,col);
    P(ax,y+2,col);
    P(ax,y+3,C.skin);

    // hand
    P(ax, ay+4, C.skin);
    P(ax, ay+5, C.skin);
  }

  _armBack(P, C, o){
    const { x, y, punching, swing } = o;
    let ax=x, ay=y;
    if (punching){
      ax += swing.handX*0.6;
      ay += swing.handY*0.6;
    }
    P(ax,y+0,C.tealS);
    P(ax,y+1,C.tealS);
    P(ax,y+2,C.tealS);
    P(ax,ay+3,C.skin);
    P(ax,ay+4,C.skin);
  }

  _armSide(P, C, o){
    const { x, y, front, facingE, punching, swing } = o;

    let ax=x, ay=y;
    if (punching && front){
      ax += swing.handX;
      ay += swing.handY;
    }

    const col = front ? C.teal : C.tealS;

    P(ax,ay+0,col);
    P(ax,ay+1,col);
    P(ax,ay+2,col);
    P(ax,ay+3,C.skin);

    // hand
    P(ax+(facingE?1:-1), ay+4, C.skin);
  }

  _heldFront(P, C, o){
    const { x, y, held, punching, swing, atkVec } = o;
    // simple held item: show a small bar + glow if punching
    const dx = punching ? swing.handX : 0;
    const dy = punching ? swing.handY : 0;

    // weapon/prop
    P(x+dx, y+dy, C.steel);
    P(x+1+dx, y+dy, C.steelS);
    P(x+2+dx, y+dy, C.steel);
    if (punching){
      P(x+2+dx, y-1+dy, C.glow);
    }
  }

  _heldBack(P, C, o){
    const { x, y, held } = o;
    // subtle back hint
    P(x,y,C.steelS);
    P(x+1,y,C.steelS);
  }

  _heldSide(P, C, o){
    const { x, y, facingE, held, punching, swing } = o;
    const dx = punching ? swing.handX : 0;
    const dy = punching ? swing.handY : 0;

    // side held weapon always IN FRONT (your rule)
    P(x+dx, y+dy, C.steel);
    P(x+dx+(facingE?1:-1), y+dy, C.steelS);
    P(x+dx+(facingE?2:-2), y+dy, C.steel);
  }

  _drawPunchSpark(ctx, p, atkVec, swingP){
    const x = p.x + p.w/2 + atkVec.dx*18;
    const y = p.y + p.h/2 + atkVec.dy*14;

    const t = swingP;
    const r = 4 + Math.sin(t*Math.PI)*3;

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255, 240, 120, .9)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(255, 240, 120, .8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r+4, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  _hitKick(swingP){
    // punch hit kick: quick out then settle
    if (swingP < 0.25) return swingP * 6;
    if (swingP < 0.60) return 1.5;
    return (1 - swingP) * 2;
  }

  _swingOffsetsTight(p, atkVec, perp){
    // windup -> strike -> recoil
    // keep it punchy but not huge
    const out = Math.sin(Math.min(1,p) * Math.PI);
    const stab = Math.sin(Math.min(1,p) * Math.PI * 0.8);

    const handX = Math.round(atkVec.dx * (2 + out*5) + perp.dx * (1 + stab*1));
    const handY = Math.round(atkVec.dy * (2 + out*5) + perp.dy * (1 + stab*1));

    return { handX, handY };
  }

  _faceDir4(x,y){
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? "E" : "W";
    return y > 0 ? "S" : "N";
  }

  _faceDir8(x,y){
    const ax = Math.abs(x), ay = Math.abs(y);
    if (ax < 0.001 && ay < 0.001) return "S";

    if (ax > ay*1.6){
      return x > 0 ? "E" : "W";
    } else if (ay > ax*1.6){
      return y > 0 ? "S" : "N";
    } else {
      if (x > 0 && y > 0) return "SE";
      if (x > 0 && y < 0) return "NE";
      if (x < 0 && y > 0) return "SW";
      return "NW";
    }
  }

  _dirVec8(d){
    switch(d){
      case "N": return {dx:0,dy:-1};
      case "S": return {dx:0,dy: 1};
      case "E": return {dx:1,dy: 0};
      case "W": return {dx:-1,dy:0};
      case "NE": return {dx:1,dy:-1};
      case "NW": return {dx:-1,dy:-1};
      case "SE": return {dx:1,dy: 1};
      case "SW": return {dx:-1,dy:1};
    }
    return {dx:0,dy:1};
  }
}
