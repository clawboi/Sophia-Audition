// src/entities/player.js
// NPC City Player — Reference Sprite Skeleton v7 (pure pixels, no images)
// Fixes per your notes:
// - Walk legs NOT thrusting: N/S uses feet OUT/IN (x spread), E/W uses feet UP/DOWN (y spread)
// - Punch: one lead arm EXTENDS forward in punch direction + recoil
// - Back (walking up): head/neck exists (not hair-only)
// - Side sprites: slightly wider torso/legs (not too thin)
// - Still classic Pokémon 4-frame walk (0 idle, 1 stepA, 2 idle, 3 stepB)

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

    // step cadence
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
      white:  "#FFFFFF"
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

    // run = slightly larger spread, still clean
    const stride = moving ? (running ? 2 : 1) : 0;

    // ===== WALK OFFSETS (NO THRUST) =====
    // N/S: feet go OUT/IN on X axis (classic top-down vibe)
    // E/W: feet go UP/DOWN on Y axis
    //
    // We keep travel-axis shove basically 0 to avoid the "thrust" look.

    const isNS = (face === "N" || face === "S");
    const isEW = (face === "E" || face === "W");

    // base leg columns (front/back views)
    const baseL = 6;
    const baseR = 9;

    // foot offsets (in sprite pixels)
    let lfX = 0, lfY = 0, rfX = 0, rfY = 0;

    if (moving && !acting){
      if (isNS){
        // StepA: left foot out, right foot in; StepB: opposite
        const spread = stride; // 1 walk, 2 run
        lfX = stepA ? -spread : stepB ? spread : 0;
        rfX = stepA ? spread : stepB ? -spread : 0;
        // tiny vertical lift just 1px for the stepping foot (optional, subtle)
        lfY = stepA ? -1 : 0;
        rfY = stepB ? -1 : 0;
      } else if (isEW){
        // Side walk: feet alternate up/down (y), very Pokémon
        const lift = 1;
        lfY = stepA ? -lift : stepB ? lift : 0;
        rfY = stepA ? lift : stepB ? -lift : 0;
        // slight fore/aft for run only (tiny), keeps side from looking frozen
        const nudge = running ? 1 : 0;
        if (face === "E"){ lfX = stepA ? nudge : 0; rfX = stepB ? nudge : 0; }
        if (face === "W"){ lfX = stepA ? -nudge : 0; rfX = stepB ? -nudge : 0; }
      }
    }

    // ===== HIP WEIGHT SHIFT (NO THRUST) =====
    // Only shift perpendicular, not forward/back.
    let hipX = 0, hipY = 0;
    if (moving && !acting){
      if (isNS){
        hipX = stepA ? 1 : stepB ? -1 : 0; // sway left/right
      } else {
        hipY = stepA ? 1 : stepB ? -1 : 0; // sway up/down on side
      }
    }

    // ===== ARM SWING (walk) =====
    // Opposite the stepping foot, 1px
    const armSwing = (moving && !acting) ? 1 : 0;
    const lArmOff = stepA ? -armSwing : stepB ? armSwing : 0;
    const rArmOff = stepA ? armSwing : stepB ? -armSwing : 0;

    // ===== PUNCH SNAP (directional extend) =====
    // One lead arm extends forward in facing direction, plus recoil.
    let punchDX = 0, punchDY = 0;
    let punchAmt = 0;
    if (punching){
      const t = Math.max(0, Math.min(1, p.punchT));
      // snap fast then recoil
      const snap = (t < 0.25) ? (t / 0.25) : Math.max(0, 1 - (t - 0.25) / 0.75);
      punchAmt = Math.round(snap * 3); // 0..3 px
      if (face === "E") punchDX = punchAmt;
      if (face === "W") punchDX = -punchAmt;
      if (face === "S") punchDY = punchAmt;
      if (face === "N") punchDY = -punchAmt;
    }

    // route draw by facing
    if (face === "S"){
      this._drawFront(P, C, { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    } else if (face === "N"){
      this._drawBack(P, C, { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    } else if (face === "E"){
      this._drawSide(P, C, { dir:"E", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    } else {
      this._drawSide(P, C, { dir:"W", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    }

    if (punching){
      this._drawPunchSpark(ctx, p, face);
    }
  }

  // =========================
  // FRONT (S)
  // =========================
  _drawFront(P, C, s){
    const { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY } = s;

    // ---- HAIR (closer to ref: fuller mass + bun) ----
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
      P(7,5,C.white); P(8,5,C.white);
      P(7,5,C.navy);  P(8,5,C.navy);
      P(7,4,C.white);
    }

    // ---- BODY (shifted by hip sway) ----
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
    if (!punching){
      P(4+bx, 11+by + lArmOff, C.shirt2);
      P(4+bx, 12+by + lArmOff, C.shirt1);
      P(4+bx, 13+by + lArmOff, C.skin);

      P(11+bx, 11+by + rArmOff, C.shirt2);
      P(11+bx, 12+by + rArmOff, C.shirt1);
      P(11+bx, 13+by + rArmOff, C.skin);
    } else {
      // directional punch: LEAD arm only extends (clean)
      const leadLeft = (punchDX < 0) || (punchDY < 0); // N/W tends to use left for readability
      const leadX = punchDX, leadY = punchDY;

      // rear arm stays near body, lead arm extends
      // rear
      P(11+bx, 12+by, C.shirt2);
      P(10+bx, 12+by, C.shirt1);
      P(9+bx,  12+by, C.skin);

      // lead (use left side arm pixels)
      const ax = 4+bx + leadX;
      const ay = 12+by + leadY;
      P(ax,   ay, C.shirt2);
      P(ax+1, ay, C.shirt1);
      P(ax+2, ay, C.skin);

      // if punching E/S, swap so it feels like correct arm leads
      if (punchDX > 0 || punchDY > 0){
        // overwrite: right arm leads
        // rear left
        P(4+bx, 12+by, C.shirt2);
        P(5+bx, 12+by, C.shirt1);
        P(6+bx, 12+by, C.skin);

        const rx = 11+bx + leadX;
        const ry = 12+by + leadY;
        P(rx,   ry, C.shirt2);
        P(rx-1, ry, C.shirt1);
        P(rx-2, ry, C.skin);
      }
    }

    // ---- PANTS ----
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // ---- LEGS (short) + SOCKS ----
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

    // ---- SHOES (spread / lift only, no thrust) ----
    const shoeY = 17+by;

    const lfx = Lx + lfX, lfy = shoeY + lfY;
    P(lfx, lfy, C.navy);
    P(lfx, lfy+1, C.navy);
    P(lfx+1, lfy+1, C.navy);
    P(lfx, lfy+2, C.white);

    const rfx = Rx + rfX, rfy = shoeY + rfY;
    P(rfx, rfy, C.navy);
    P(rfx, rfy+1, C.navy);
    P(rfx-1, rfy+1, C.navy);
    P(rfx, rfy+2, C.white);
  }

  // =========================
  // BACK (N) — head/neck exists (not hair-only)
  // =========================
  _drawBack(P, C, s){
    const { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY } = s;
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

    // head/neck under hair (so it reads like a skull, not wig)
    [
      [6,5],[7,5],[8,5],[9,5],   // back of head
      [7,6],[8,6],               // neck
    ].forEach(([x,y])=>P(x,y,C.skin));

    // hoodie back
    [
      [5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],
      [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
      [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],
      [5,11],[6,11],[7,11],[8,11],[9,11],[10,11],
    ].forEach(([x,y])=>P(x+bx,y+by,C.shirt2));

    // straps more visible in back
    [ [5,8],[5,9],[5,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    [ [10,8],[10,9],[10,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    P(3+bx,9+by,C.tealS);
    P(12+bx,9+by,C.tealS);

    // arms
    if (!punching){
      P(4+bx, 11+by + lArmOff, C.shirt2);
      P(4+bx, 12+by + lArmOff, C.shirt1);
      P(11+bx, 11+by + rArmOff, C.shirt2);
      P(11+bx, 12+by + rArmOff, C.shirt1);
    } else {
      // punch from back: extend one sleeve forward a bit
      P(4+bx + punchDX, 12+by + punchDY, C.shirt2);
      P(11+bx + punchDX,12+by + punchDY, C.shirt2);
    }

    // pants
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // legs short + animated
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
    P(lfx, lfy, C.navy);
    P(lfx, lfy+1, C.navy);
    P(lfx+1, lfy+1, C.navy);
    P(lfx, lfy+2, C.white);

    const rfx = Rx + rfX, rfy = shoeY + rfY;
    P(rfx, rfy, C.navy);
    P(rfx, rfy+1, C.navy);
    P(rfx-1, rfy+1, C.navy);
    P(rfx, rfy+2, C.white);
  }

  // =========================
  // SIDE (E/W) — slightly wider (not too thin)
  // =========================
  _drawSide(P, C, s){
    const { dir, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY } = s;
    const bx = hipX, by = hipY;

    const flip = (x) => dir === "E" ? x : (15 - x);

    // hair profile + back mass
    [
      [6,0],[7,0],[8,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],
      [5,4],[9,4],
      [4,3],[4,4],
      [10,2],[10,3] // extra bulk so side isn't razor-thin
    ].forEach(([x,y])=>P(flip(x),y,C.hair));

    // face profile (a bit wider)
    [
      [7,3],[8,3],[9,3],
      [7,4],[8,4],[9,4],
      [7,5],[8,5],[9,5],
      [7,6],[8,6],
    ].forEach(([x,y])=>P(flip(x),y,C.skin));

    // eye dot
    P(flip(9),5,C.navy);

    // hoodie body (WIDER: 4 columns)
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

    // arms (profile)
    if (!punching){
      // choose one arm offset to represent swing in profile
      const aOff = (dir === "E") ? lArmOff : rArmOff;
      P(flip(4+bx), 11+by + aOff, C.shirt2);
      P(flip(4+bx), 12+by + aOff, C.shirt1);
      P(flip(4+bx), 13+by + aOff, C.skin);
    } else {
      // punch profile: extend forward
      P(flip(4+bx + punchDX), 12+by + punchDY, C.shirt2);
      P(flip(3+bx + punchDX), 12+by + punchDY, C.shirt1);
      P(flip(2+bx + punchDX), 12+by + punchDY, C.skin);
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

    const swing = (lfY !== 0 || rfY !== 0 || lfX !== 0 || rfX !== 0);
    if (!swing){
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

    const sx = legX + (dir==="E"?offX:-offX);
    const sy = shoeY + offY;

    P(sx, sy, C.navy);
    P(sx, sy+1, C.navy);
    P(sx + (dir==="E"?1:-1), sy+1, C.navy);
    P(sx, sy+2, C.white);
  }

  _faceDir(fx, fy){
    if (Math.abs(fx) > Math.abs(fy)) return fx >= 0 ? "E" : "W";
    return fy >= 0 ? "S" : "N";
  }

  _drawPunchSpark(ctx, p, face){
    const cx = p.x + p.w/2;
    const cy = p.y + p.h/2 - (p.z || 0);

    let ox = 0, oy = 0;
    if (face === "E") ox = 18;
    if (face === "W") ox = -18;
    if (face === "N") oy = -18;
    if (face === "S") oy = 18;

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, 8, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
}
