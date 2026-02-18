// src/entities/player.js
// NPC City Player — Reference Sprite Skeleton v9 (pure pixels, no images)
// FULL REPLACEMENT. Same API (uses p.x/y/w/h/z/faceX/faceY/jumpT/dodgeT/punchT + optional p.held).
//
// What’s fixed vs your v8:
// - Punch is BIGGER + actual SWING: windup -> hit (max reach) -> recoil.
//   It extends 6–7 grid pixels at peak (not a tiny jab).
// - Punch direction is ALWAYS correct (uses face).
// - Held item is GUARANTEED to work when ONLY p.held is set (no p.item fallback).
//   It attaches to the active hand in idle/walk/run AND rides the punch tip while punching.
// - Walk remains clean “Pokémon”: NO thrust. Feet spread OUT/IN for N/S, and UP/DOWN for E/W.
// - Back view always has head/neck (no hair-only head).
// - Side sprites slightly wider (less thin) with cleaner arm placement.
// - Spark follows the swing TIP (optional).

export class Player {
  constructor(){
    this._lastX = 0;
    this._lastY = 0;
    this._lastT = 0;

    this._blinkNext = 1.6;
    this._blinkHold = 0;

    this._step = 0;
    this._facing = "S";
  }

  reset(p){
    this._lastX = p.x;
    this._lastY = p.y;
    this._lastT = performance.now();
    this._blinkNext = 1.2 + Math.random()*2.4;
    this._blinkHold = 0;
    this._step = 0;
    this._facing = this._faceDir(p.faceX || 0, p.faceY || 1);
  }

  draw(ctx, p){
    const now = performance.now();
    if (!this._lastT) this.reset(p);

    // dt clamp
    let dt = (now - this._lastT) / 1000;
    if (!isFinite(dt) || dt <= 0) dt = 1/60;
    if (dt < 1/144) dt = 1/144;
    if (dt > 1/24)  dt = 1/24;

    const vx = (p.x - this._lastX) / dt;
    const vy = (p.y - this._lastY) / dt;
    const speed = Math.hypot(vx, vy);

    this._lastX = p.x;
    this._lastY = p.y;
    this._lastT = now;

    const moving  = speed > 8;
    const running = speed > 165;

    // update facing only with intent (prevents twitch)
    const fx = p.faceX || 0, fy = p.faceY || 0;
    if (Math.abs(fx) + Math.abs(fy) > 0.25) this._facing = this._faceDir(fx, fy);
    const face = this._facing;

    const punching = p.punchT > 0;
    const acting = punching || (p.jumpT > 0) || (p.dodgeT > 0);

    // step cadence (Pokémon-ish)
    const stepRate = moving ? (running ? 13.5 : 8.6) : 1.0;
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
    const bob = (!moving && !acting) ? (Math.sin(now * 0.0017) * 0.25) : 0;

    const sx = Math.round(cx - W/2);
    const sy = Math.round(feetY - H - (p.z || 0) + bob);

    // palette (from your reference)
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
      // held-item accents
      steel:  "#cfd6e6",
      steelS: "#7a86a6",
      wood:   "#8a5a2b",
      glow:   "#ffea6a"
    };

    const P = (ix, iy, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(sx + ix*px, sy + iy*px, px, px);
    };

    // shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx, feetY + 2, 12, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // 4-frame walk: 0 idle, 1 stepA, 2 idle, 3 stepB
    let frame = 0;
    if (moving && !acting){
      const t = this._step % 4;
      frame = (t < 1) ? 0 : (t < 2) ? 1 : (t < 3) ? 2 : 3;
    }
    const stepA = (frame === 1);
    const stepB = (frame === 3);

    // run = slightly larger spread
    const stride = moving ? (running ? 2 : 1) : 0;

    // =========================
    // CLEAN WALK OFFSETS (NO THRUST)
    // =========================
    const isNS = (face === "N" || face === "S");
    const isEW = (face === "E" || face === "W");

    let lfX = 0, lfY = 0, rfX = 0, rfY = 0;

    if (moving && !acting){
      if (isNS){
        const spread = stride; // 1 walk / 2 run
        lfX = stepA ? -spread : stepB ? spread : 0;
        rfX = stepA ?  spread : stepB ? -spread : 0;
        // optional tiny lift
        lfY = stepA ? -1 : 0;
        rfY = stepB ? -1 : 0;
      } else if (isEW){
        const lift = 1;
        lfY = stepA ? -lift : stepB ? lift : 0;
        rfY = stepA ?  lift : stepB ? -lift : 0;
        const nudge = running ? 1 : 0;
        if (face === "E"){ lfX = stepA ? nudge : 0; rfX = stepB ? nudge : 0; }
        if (face === "W"){ lfX = stepA ? -nudge : 0; rfX = stepB ? -nudge : 0; }
      }
    }

    // hip weight shift: perpendicular only
    let hipX = 0, hipY = 0;
    if (moving && !acting){
      if (isNS) hipX = stepA ? 1 : stepB ? -1 : 0;
      else     hipY = stepA ? 1 : stepB ? -1 : 0;
    }

    // walk arm swing: opposite step (1px)
    const armSwing = (moving && !acting) ? 1 : 0;
    const lArmOff = stepA ? -armSwing : stepB ? armSwing : 0;
    const rArmOff = stepA ?  armSwing : stepB ? -armSwing : 0;

    // =========================
    // PUNCH = BIG REAL SWING
    // =========================
    // p.punchT assumed 0..1 counting down, so progress = 1 - punchT.
    let swingP = 0;
    if (punching){
      const t = Math.max(0, Math.min(1, p.punchT));
      swingP = 1 - t;
    }

    const dir = this._dirVec(face);      // {dx,dy} in {-1,0,1}
    const perp = { dx: -dir.dy, dy: dir.dx };

    // BIGGER reach (this is what you wanted)
    const swing = this._swingOffsetsBig(swingP, dir, perp);

    // Which arm leads
    const rightLeads = (face === "S" || face === "E");

    // =========================
    // HELD ITEM (ONLY when holding)
    // =========================
    const held = (p.held ?? null); // <-- THIS is the only trigger

    // Route draw by facing (each returns the “active hand point” for held item/spark)
    let tipForSpark = null;

    if (face === "S"){
      tipForSpark = this._drawFront(P, C, {
        face, blinking, hipX, hipY,
        lfX, lfY, rfX, rfY,
        lArmOff, rArmOff,
        punching, swing, rightLeads,
        held
      });
    } else if (face === "N"){
      tipForSpark = this._drawBack(P, C, {
        face, hipX, hipY,
        lfX, lfY, rfX, rfY,
        lArmOff, rArmOff,
        punching, swing, rightLeads,
        held
      });
    } else if (face === "E"){
      tipForSpark = this._drawSide(P, C, {
        face, dir:"E", hipX, hipY,
        lfX, lfY, rfX, rfY,
        lArmOff, rArmOff,
        punching, swing,
        held
      });
    } else {
      tipForSpark = this._drawSide(P, C, {
        face, dir:"W", hipX, hipY,
        lfX, lfY, rfX, rfY,
        lArmOff, rArmOff,
        punching, swing,
        held
      });
    }

    // spark follows the swing tip (optional)
    if (punching && tipForSpark){
      this._drawPunchSparkAt(ctx, p, tipForSpark);
    }
  }

  // ==========================================================
  // FRONT (S)  - returns tip point for spark
  // ==========================================================
  _drawFront(P, C, s){
    const {
      face, blinking, hipX, hipY,
      lfX, lfY, rfX, rfY,
      lArmOff, rArmOff,
      punching, swing, rightLeads,
      held
    } = s;

    // ---- HAIR ----
    [
      [6,0],[7,0],[8,0],[9,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],[10,3],
      [5,4],[10,4],
      [4,2],[4,3],[11,2],[11,3],
      [4,4],[11,4]
    ].forEach(([x,y])=>P(x,y,C.hair));

    // ---- FACE ----
    [
      [6,3],[7,3],[8,3],[9,3],
      [5,4],[6,4],[7,4],[8,4],[9,4],[10,4],
      [5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
      [6,6],[7,6],[8,6],[9,6],
    ].forEach(([x,y])=>P(x,y,C.skin));
    P(6,6,C.blush); P(9,6,C.blush);

    // eyes
    if (blinking){
      P(7,5,C.hair); P(8,5,C.hair);
    } else {
      // whites + pupils (navy)
      P(7,5,C.white); P(8,5,C.white);
      P(7,5,C.navy);  P(8,5,C.navy);
      P(7,4,C.white);
    }

    // ---- BODY (hip sway) ----
    const bx = hipX, by = hipY;

    [
      [5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],
      [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
      [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],
      [5,11],[6,11],[7,11],[8,11],[9,11],[10,11],
    ].forEach(([x,y])=>P(x+bx,y+by,C.shirt2));

    [ [10,8],[10,9],[10,10],[9,10],[9,9] ].forEach(([x,y])=>P(x+bx,y+by,C.shirt1));
    [ [6,10],[7,10],[8,10] ].forEach(([x,y])=>P(x+bx,y+by,C.shirt3));

    // straps
    [ [5,8],[5,9],[5,10] ].forEach(([x,y])=>P(x+bx,y+by,C.teal));
    [ [10,8],[10,9],[10,10] ].forEach(([x,y])=>P(x+bx,y+by,C.teal));
    [ [6,9],[9,9] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    P(3+bx,9+by,C.tealS);
    P(12+bx,9+by,C.tealS);

    // ---- ARMS ----
    // shoulders (where arms originate)
    const Lsh = { x: 5+bx,  y: 11+by };
    const Rsh = { x: 10+bx, y: 11+by };

    // idle hands
    const LhandIdle = { x: 4+bx,  y: 13+by + lArmOff };
    const RhandIdle = { x: 11+bx, y: 13+by + rArmOff };

    let tipPoint = null; // used for spark

    if (!punching){
      // left sleeve + hand
      P(4+bx, 11+by + lArmOff, C.shirt2);
      P(4+bx, 12+by + lArmOff, C.shirt1);
      P(LhandIdle.x, LhandIdle.y, C.skin);

      // right sleeve + hand
      P(11+bx, 11+by + rArmOff, C.shirt2);
      P(11+bx, 12+by + rArmOff, C.shirt1);
      P(RhandIdle.x, RhandIdle.y, C.skin);

      // HELD ITEM: only if held, in right hand by default (or leading hand feel)
      if (held){
        const active = rightLeads ? RhandIdle : LhandIdle;
        this._drawHeldItem(P, C, held, face, active);
      }
    } else {
      // SWING: lead arm is a line from shoulder -> mid -> tip
      const leadIsRight = rightLeads;
      const sh = leadIsRight ? Rsh : Lsh;

      // big arc endpoints
      const mid = { x: sh.x + swing.midOff.dx, y: sh.y + swing.midOff.dy };
      const tip = { x: sh.x + swing.tipOff.dx, y: sh.y + swing.tipOff.dy };

      // rear arm tucks (opposite side)
      const rearOff = leadIsRight ? lArmOff : rArmOff;
      const rearX = leadIsRight ? (4+bx) : (11+bx);
      P(rearX, 11+by + rearOff, C.shirt2);
      P(rearX, 12+by + rearOff, C.shirt1);
      P(rearX, 13+by + rearOff, C.skin);

      // draw swing arm
      this._plotLine(P, sh, mid, C.shirt2);
      this._plotLine(P, mid, tip, C.shirt2);
      // thickness/shade
      P(mid.x, mid.y, C.shirt1);
      // fist
      P(tip.x, tip.y, C.skin);
      // extra fist pixel for “impact”
      P(tip.x + Math.sign(swing.tipOff.dx), tip.y + Math.sign(swing.tipOff.dy), C.skin);

      // HELD ITEM follows the TIP while punching
      if (held){
        this._drawHeldItem(P, C, held, face, tip);
      }

      tipPoint = tip;
    }

    // ---- PANTS ----
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // ---- LEGS ----
    const Lx = 6+bx, Rx = 9+bx;
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;

    const Lswing = (lfX !== 0 || lfY !== 0);
    const Rswing = (rfX !== 0 || rfY !== 0);

    if (!Lswing){ P(Lx,y14,C.skin); P(Lx,y15,C.skin); }
    else { P(Lx,y15,C.skin); P(Lx+1,y15,C.skin); }

    if (!Rswing){ P(Rx,y14,C.skin); P(Rx,y15,C.skin); }
    else { P(Rx,y15,C.skin); P(Rx-1,y15,C.skin); }

    P(Lx,y16,C.white);
    P(Rx,y16,C.white);

    // shoes
    const shoeY = 17+by;

    const lfx = Lx + lfX, lfy = shoeY + lfY;
    P(lfx,   lfy,   C.navy);
    P(lfx,   lfy+1, C.navy);
    P(lfx+1, lfy+1, C.navy);
    P(lfx,   lfy+2, C.white);

    const rfx = Rx + rfX, rfy = shoeY + rfY;
    P(rfx,   rfy,   C.navy);
    P(rfx,   rfy+1, C.navy);
    P(rfx-1, rfy+1, C.navy);
    P(rfx,   rfy+2, C.white);

    return tipPoint;
  }

  // ==========================================================
  // BACK (N)  - returns tip point for spark
  // ==========================================================
  _drawBack(P, C, s){
    const {
      face, hipX, hipY,
      lfX, lfY, rfX, rfY,
      lArmOff, rArmOff,
      punching, swing, rightLeads,
      held
    } = s;

    const bx = hipX, by = hipY;

    // hair back mass
    [
      [6,0],[7,0],[8,0],[9,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],[10,3],
      [4,2],[4,3],[11,2],[11,3],
      [4,4],[5,4],[10,4],[11,4],
    ].forEach(([x,y])=>P(x,y,C.hair));

    // head/neck under hair
    [
      [6,5],[7,5],[8,5],[9,5],
      [7,6],[8,6],
    ].forEach(([x,y])=>P(x,y,C.skin));

    // hoodie back
    [
      [5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],
      [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
      [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],
      [5,11],[6,11],[7,11],[8,11],[9,11],[10,11],
    ].forEach(([x,y])=>P(x+bx,y+by,C.shirt2));

    // straps (back)
    [ [5,8],[5,9],[5,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    [ [10,8],[10,9],[10,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    P(3+bx,9+by,C.tealS);
    P(12+bx,9+by,C.tealS);

    // arms (simpler from behind)
    const Lsh = { x: 5+bx,  y: 11+by };
    const Rsh = { x: 10+bx, y: 11+by };

    const LhandIdle = { x: 4+bx,  y: 13+by + lArmOff };
    const RhandIdle = { x: 11+bx, y: 13+by + rArmOff };

    let tipPoint = null;

    if (!punching){
      P(4+bx, 11+by + lArmOff, C.shirt2);
      P(4+bx, 12+by + lArmOff, C.shirt1);

      P(11+bx, 11+by + rArmOff, C.shirt2);
      P(11+bx, 12+by + rArmOff, C.shirt1);

      if (held){
        const active = rightLeads ? RhandIdle : LhandIdle;
        this._drawHeldItem(P, C, held, face, active);
      }
    } else {
      const leadIsRight = rightLeads;
      const sh = leadIsRight ? Rsh : Lsh;

      const mid = { x: sh.x + swing.midOff.dx, y: sh.y + swing.midOff.dy };
      const tip = { x: sh.x + swing.tipOff.dx, y: sh.y + swing.tipOff.dy };

      // rear tucked sleeve
      const rearX = leadIsRight ? (4+bx) : (11+bx);
      const rearOff = leadIsRight ? lArmOff : rArmOff;
      P(rearX, 11+by + rearOff, C.shirt2);
      P(rearX, 12+by + rearOff, C.shirt1);

      // swing sleeve
      this._plotLine(P, sh, mid, C.shirt2);
      this._plotLine(P, mid, tip, C.shirt2);
      P(mid.x, mid.y, C.shirt1);

      // fist
      P(tip.x, tip.y, C.shirt2);
      P(tip.x, tip.y, C.skin);

      if (held){
        this._drawHeldItem(P, C, held, face, tip);
      }

      tipPoint = tip;
    }

    // pants
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // legs
    const Lx = 6+bx, Rx = 9+bx;
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;

    const Lswing = (lfX !== 0 || lfY !== 0);
    const Rswing = (rfX !== 0 || rfY !== 0);

    if (!Lswing){ P(Lx,y14,C.skin); P(Lx,y15,C.skin); }
    else { P(Lx,y15,C.skin); P(Lx+1,y15,C.skin); }

    if (!Rswing){ P(Rx,y14,C.skin); P(Rx,y15,C.skin); }
    else { P(Rx,y15,C.skin); P(Rx-1,y15,C.skin); }

    P(Lx,y16,C.white);
    P(Rx,y16,C.white);

    const shoeY = 17+by;

    const lfx = Lx + lfX, lfy = shoeY + lfY;
    P(lfx,   lfy,   C.navy);
    P(lfx,   lfy+1, C.navy);
    P(lfx+1, lfy+1, C.navy);
    P(lfx,   lfy+2, C.white);

    const rfx = Rx + rfX, rfy = shoeY + rfY;
    P(rfx,   rfy,   C.navy);
    P(rfx,   rfy+1, C.navy);
    P(rfx-1, rfy+1, C.navy);
    P(rfx,   rfy+2, C.white);

    return tipPoint;
  }

  // ==========================================================
  // SIDE (E/W) - returns tip point for spark
  // ==========================================================
  _drawSide(P, C, s){
    const {
      face, dir, hipX, hipY,
      lfX, lfY, rfX, rfY,
      lArmOff, rArmOff,
      punching, swing,
      held
    } = s;

    const bx = hipX, by = hipY;
    const flip = (x) => dir === "E" ? x : (15 - x);

    // hair profile + bulk
    [
      [6,0],[7,0],[8,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],
      [5,4],[9,4],
      [4,3],[4,4],
      [10,2],[10,3],
      [10,4] // extra width
    ].forEach(([x,y])=>P(flip(x),y,C.hair));

    // face profile (wider)
    [
      [7,3],[8,3],[9,3],
      [7,4],[8,4],[9,4],
      [7,5],[8,5],[9,5],
      [7,6],[8,6],
    ].forEach(([x,y])=>P(flip(x),y,C.skin));
    P(flip(9),5,C.navy);

    // hoodie body (wider)
    [
      [6,7],[7,7],[8,7],[9,7],
      [5,8],[6,8],[7,8],[8,8],[9,8],
      [5,9],[6,9],[7,9],[8,9],[9,9],
      [5,10],[6,10],[7,10],[8,10],[9,10],
      [6,11],[7,11],[8,11],[9,11],
    ].forEach(([x,y])=>P(flip(x+bx),y+by,C.shirt2));

    // strap hint
    P(flip(5+bx),9+by,C.tealS);
    P(flip(6+bx),9+by,C.teal);

    // shoulders
    const sh = { x: flip(6+bx), y: 12+by };

    // idle hand position (profile)
    const aOff = (dir === "E") ? lArmOff : rArmOff;
    const handIdle = { x: flip(4+bx), y: 13+by + aOff };

    let tipPoint = null;

    if (!punching){
      P(flip(4+bx), 11+by + aOff, C.shirt2);
      P(flip(4+bx), 12+by + aOff, C.shirt1);
      P(handIdle.x, handIdle.y, C.skin);

      if (held) this._drawHeldItem(P, C, held, face, handIdle);
    } else {
      // swing in profile: use mirrored swing.x depending on dir
      const sx = (dir === "E") ? 1 : -1;

      const mid = { x: sh.x + swing.midOff.dx * sx, y: sh.y + swing.midOff.dy };
      const tip = { x: sh.x + swing.tipOff.dx * sx, y: sh.y + swing.tipOff.dy };

      this._plotLine(P, sh, mid, C.shirt2);
      this._plotLine(P, mid, tip, C.shirt2);
      P(mid.x, mid.y, C.shirt1);
      P(tip.x, tip.y, C.skin);
      P(tip.x + sx, tip.y, C.skin);

      if (held) this._drawHeldItem(P, C, held, face, tip);

      tipPoint = tip;
    }

    // pants (wider)
    [
      [6,12],[7,12],[8,12],[9,12],
      [6,13],[7,13],[8,13],[9,13]
    ].forEach(([x,y])=>P(flip(x+bx),y+by,C.pants));
    P(flip(9+bx),13+by,C.navy);

    // legs (short)
    const legX = flip(8+bx);
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;

    const swingLeg = (lfY || rfY || lfX || rfX);
    if (!swingLeg){
      P(legX,y14,C.skin);
      P(legX,y15,C.skin);
    } else {
      P(legX,y15,C.skin);
      P(legX + (dir==="E"?-1:1), y15, C.skin);
    }
    P(legX,y16,C.white);

    // shoe (profile)
    const shoeY = 17+by;
    const offY = (lfY || rfY);
    const offX = (lfX || rfX);

    const sx2 = legX + (dir==="E"?offX:-offX);
    const sy2 = shoeY + offY;

    P(sx2, sy2, C.navy);
    P(sx2, sy2+1, C.navy);
    P(sx2 + (dir==="E"?1:-1), sy2+1, C.navy);
    P(sx2, sy2+2, C.white);

    return tipPoint;
  }

  // ==========================================================
  // BIG SWING OFFSETS (the important part)
  // ==========================================================
  _dirVec(face){
    if (face === "E") return { dx: 1, dy: 0 };
    if (face === "W") return { dx: -1, dy: 0 };
    if (face === "N") return { dx: 0, dy: -1 };
    return { dx: 0, dy: 1 }; // S
  }

  _swingOffsetsBig(p, dir, perp){
    p = Math.max(0, Math.min(1, p));

    // phases
    const windEnd = 0.22;
    const hitEnd  = 0.60;

    // BIGGER reach + arc
    const reach = 8; // <<< makes punch visibly longer
    const arc   = 4; // <<< makes it swing, not poke

    let tip = { dx: 0, dy: 0 };
    let mid = { dx: 0, dy: 0 };

    if (p < windEnd){
      const t = p / windEnd; // 0..1
      const back = Math.round((1 - t) * 3);
      const side = Math.round((1 - t) * 2);
      tip = { dx: -dir.dx * back - perp.dx * side, dy: -dir.dy * back - perp.dy * side };
      mid = { dx: Math.round(tip.dx * 0.55), dy: Math.round(tip.dy * 0.55) };
    } else if (p < hitEnd){
      const t = (p - windEnd) / (hitEnd - windEnd); // 0..1
      const f = Math.round(t * reach);
      const s = Math.round(Math.sin(t * Math.PI) * arc);
      tip = { dx: dir.dx * f + perp.dx * s, dy: dir.dy * f + perp.dy * s };
      mid = { dx: Math.round(dir.dx * (f * 0.55) + perp.dx * (s * 0.60)),
              dy: Math.round(dir.dy * (f * 0.55) + perp.dy * (s * 0.60)) };
    } else {
      const t = (p - hitEnd) / (1 - hitEnd);
      const f = Math.round(reach * (1 - 0.45*t)); // recoil but still extended a bit
      const s = Math.round((1 - t) * 2);
      tip = { dx: dir.dx * f + perp.dx * s, dy: dir.dy * f + perp.dy * s };
      mid = { dx: Math.round(dir.dx * (f * 0.55) + perp.dx * (s * 0.60)),
              dy: Math.round(dir.dy * (f * 0.55) + perp.dy * (s * 0.60)) };
    }

    return { tipOff: tip, midOff: mid };
  }

  // ==========================================================
  // LINE PLOTTER
  // ==========================================================
  _plotLine(P, a, b, col){
    let x0 = a.x|0, y0 = a.y|0;
    let x1 = b.x|0, y1 = b.y|0;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true){
      P(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy){ err += dy; x0 += sx; }
      if (e2 <= dx){ err += dx; y0 += sy; }
    }
  }

  // ==========================================================
  // HELD ITEM (inventory hook)
  // ==========================================================
  _drawHeldItem(P, C, held, face, hand){
    const type = (typeof held === "string") ? held : (held?.type || "tool");
    const tint = (typeof held === "object" && held?.tint) ? held.tint : null;

    // outward direction
    let dx = 0, dy = 0;
    if (face === "E"){ dx = 1; dy = 0; }
    else if (face === "W"){ dx = -1; dy = 0; }
    else if (face === "N"){ dx = 0; dy = -1; }
    else { dx = 0; dy = 1; }

    // sit just past the fist
    const origin = { x: hand.x + dx, y: hand.y + dy };

    if (type === "knife"){
      P(origin.x, origin.y, C.wood);
      P(origin.x + dx, origin.y + dy, tint || C.steel);
      P(origin.x + dx*2, origin.y + dy*2, tint || C.steel);
      P(origin.x + dx*2 + (dy!==0?1:0), origin.y + dy*2 + (dx!==0?1:0), C.white);
    } else if (type === "bat"){
      P(origin.x, origin.y, C.wood);
      P(origin.x + dx, origin.y + dy, C.wood);
      P(origin.x + dx*2, origin.y + dy*2, C.wood);
      P(origin.x + dx*3, origin.y + dy*3, C.wood);
    } else if (type === "wrench" || type === "tool"){
      P(origin.x, origin.y, C.steelS);
      P(origin.x + dx, origin.y + dy, tint || C.steel);
      P(origin.x + dx*2, origin.y + dy*2, tint || C.steel);
      P(origin.x + dx*2 + (dy!==0?1:0), origin.y + dy*2 + (dx!==0?1:0), C.steelS);
    } else if (type === "gun"){
      P(origin.x, origin.y, C.navy);
      P(origin.x + dx, origin.y + dy, C.navy);
      P(origin.x + (dy!==0?1:0), origin.y + (dx!==0?1:0), C.navy);
      P(origin.x + dx*2, origin.y + dy*2, C.steelS);
    } else if (type === "flashlight"){
      P(origin.x, origin.y, C.steelS);
      P(origin.x + dx, origin.y + dy, C.steelS);
      P(origin.x + dx*2, origin.y + dy*2, C.glow);
    } else {
      P(origin.x, origin.y, tint || C.steel);
    }
  }

  // ==========================================================
  // MISC
  // ==========================================================
  _faceDir(fx, fy){
    if (Math.abs(fx) > Math.abs(fy)) return fx >= 0 ? "E" : "W";
    return fy >= 0 ? "S" : "N";
  }

  // Spark that follows the real swing tip (screen-space)
  _drawPunchSparkAt(ctx, p, tip){
    const px = 2;
    const SW = 16, SH = 20;
    const W = SW * px, H = SH * px;

    const cx = p.x + p.w/2;
    const feetY = p.y + p.h + 2;

    const sx = Math.round(cx - W/2);
    const sy = Math.round(feetY - H - (p.z || 0));

    const tx = sx + tip.x * px + px; // slight center
    const ty = sy + tip.y * px + px;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 7, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
}
