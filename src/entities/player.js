// src/entities/player.js
// NPC City Player — Reference Sprite Skeleton vFINAL
// 16x20 grid, px=2, pure pixels.
// Directions: S(front), N(back), E/W(side).
// Walk: classic Pokémon 4-frame + hip weight shift.
// Punch: arms swing + snap in facing direction.
// Designed to be the "forever skeleton" you patch art on top of.

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

    // update facing only when there is intent (prevents twitch)
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

    // stride
    const stride = moving ? (running ? 2 : 1) : 0;

    // weight shift on step frames (1 & 3)
    // hipX/hipY nudges the torso/pants by 1px (classic weight illusion)
    const isSide = (face === "E" || face === "W");
    const dirSign = (face === "E" || face === "S") ? 1 : -1;

    const stepA = (frame === 1); // "left" step
    const stepB = (frame === 3); // "right" step

    const hipX = (!acting && moving && isSide) ? (stepA ? 1 : stepB ? -1 : 0) : 0;
    const hipY = (!acting && moving && !isSide) ? (stepA ? 1 : stepB ? -1 : 0) : 0;

    // feet forward offsets (only on step frames)
    const lfForward = stepA; // treat stepA as "left foot forward"
    const rfForward = stepB;

    const lfX = (moving && isSide && lfForward) ? stride * dirSign : 0;
    const rfX = (moving && isSide && rfForward) ? stride * dirSign : 0;
    const lfY = (moving && !isSide && lfForward) ? stride * dirSign : 0;
    const rfY = (moving && !isSide && rfForward) ? stride * dirSign : 0;

    // arms swing opposite the feet while walking (1px)
    const armSwing = (moving && !acting) ? 1 : 0;
    const lArmOff = lfForward ? -armSwing : rfForward ? armSwing : 0;
    const rArmOff = lfForward ? armSwing : rfForward ? -armSwing : 0;

    // punch snap/recoil
    // p.punchT assumed 0..1-ish timer; we shape it
    let punchSnap = 0;
    if (punching){
      const t = Math.max(0, Math.min(1, p.punchT));
      // quick snap then recoil: peak around 0.25
      punchSnap = (t < 0.3) ? (t / 0.3) : Math.max(0, 1 - (t - 0.3) / 0.7);
      punchSnap = Math.round(punchSnap * 2); // 0..2 px
    }

    // directional punch offset
    let punchDX = 0, punchDY = 0;
    if (punching){
      if (face === "E") punchDX = punchSnap;
      if (face === "W") punchDX = -punchSnap;
      if (face === "S") punchDY = punchSnap;
      if (face === "N") punchDY = -punchSnap;
    }

    // =========================
    // DRAW ROUTER (by facing)
    // =========================
    if (face === "S"){
      this._drawFront(P, C, { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    } else if (face === "N"){
      this._drawBack(P, C, { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    } else if (face === "E"){
      this._drawSide(P, C, { dir: "E", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    } else {
      this._drawSide(P, C, { dir: "W", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY });
    }

    // punch spark (optional, keeps your existing feedback)
    if (punching){
      this._drawPunchSpark(ctx, p, face);
    }
  }

  // =========================
  // SPRITES
  // =========================

  _drawFront(P, C, s){
    const { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY } = s;

    // ---- HAIR (more like reference: fuller top + side mass) ----
    // top bun + crown
    [
      [6,0],[7,0],[8,0],[9,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],[10,3],
      [5,4],[10,4],
      // extra side mass (closer to ref)
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

    // ---- HOODIE / SHIRT (torso shifted by hip) ----
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

    // ---- ARMS (walk swing OR punch snap) ----
    if (!punching){
      P(4+bx, 11+by + lArmOff, C.shirt2);
      P(4+bx, 12+by + lArmOff, C.shirt1);
      P(4+bx, 13+by + lArmOff, C.skin);

      P(11+bx, 11+by + rArmOff, C.shirt2);
      P(11+bx, 12+by + rArmOff, C.shirt1);
      P(11+bx, 13+by + rArmOff, C.skin);
    } else {
      // punch: swing arms + snap forward
      // left arm
      P(4+bx + punchDX, 12+by + punchDY, C.shirt2);
      P(5+bx + punchDX, 12+by + punchDY, C.shirt1);
      P(6+bx + punchDX, 12+by + punchDY, C.skin);
      // right arm
      P(11+bx + punchDX, 12+by + punchDY, C.shirt2);
      P(10+bx + punchDX, 12+by + punchDY, C.shirt1);
      P(9+bx + punchDX, 12+by + punchDY, C.skin);
    }

    // ---- PANTS (shifted by hip) ----
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // ---- LEGS (short + animated) ----
    // columns
    const Lx = 6+bx, Rx = 9+bx;
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;

    // Which leg swings is implied by forward foot offsets:
    const Lswing = (lfX !== 0 || lfY !== 0);
    const Rswing = (rfX !== 0 || rfY !== 0);

    // support = straight; swing = bent + knee toward center
    if (!Lswing){ P(Lx,y14,C.skin); P(Lx,y15,C.skin); }
    else { P(Lx,y15,C.skin); P(Lx+1,y15,C.skin); }

    if (!Rswing){ P(Rx,y14,C.skin); P(Rx,y15,C.skin); }
    else { P(Rx,y15,C.skin); P(Rx-1,y15,C.skin); }

    // socks (static for short leg feel)
    P(Lx,y16,C.white);
    P(Rx,y16,C.white);

    // ---- SHOES (animated forward) ----
    const shoeY = 17+by;

    // left shoe
    const lfx = Lx + lfX, lfy = shoeY + lfY;
    P(lfx, lfy, C.navy);
    P(lfx, lfy+1, C.navy);
    P(lfx+1, lfy+1, C.navy);
    P(lfx, lfy+2, C.white);

    // right shoe
    const rfx = Rx + rfX, rfy = shoeY + rfY;
    P(rfx, rfy, C.navy);
    P(rfx, rfy+1, C.navy);
    P(rfx-1, rfy+1, C.navy);
    P(rfx, rfy+2, C.white);
  }

  _drawBack(P, C, s){
    // back view: no face/eyes, show hair + hoodie back + straps, same motion logic
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

    // hoodie back (slightly simpler)
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
      // punch from back: still snaps
      P(4+bx + punchDX, 12+by + punchDY, C.shirt2);
      P(11+bx + punchDX,12+by + punchDY, C.shirt2);
    }

    // pants
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // legs (short + animated)
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

    // shoes
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

  _drawSide(P, C, s){
    // side silhouette: slimmer, 1 eye in profile (optional vibe), straps read as back edge
    const { dir, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, punchDX, punchDY } = s;
    const bx = hipX, by = hipY;

    const flip = (x) => dir === "E" ? x : (15 - x); // mirror around 16-wide grid

    // hair profile (bun + back mass)
    [
      [6,0],[7,0],[8,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],
      [5,4],[9,4],
      [4,3],[4,4] // fringe blob
    ].forEach(([x,y])=>P(flip(x),y,C.hair));

    // face profile (small)
    [
      [7,3],[8,3],
      [7,4],[8,4],
      [7,5],[8,5],
      [7,6]
    ].forEach(([x,y])=>P(flip(x),y,C.skin));

    // single eye dot in profile (clean)
    P(flip(8),5,C.navy);

    // hoodie body (thin)
    [
      [6,7],[7,7],[8,7],
      [5,8],[6,8],[7,8],[8,8],
      [5,9],[6,9],[7,9],[8,9],
      [5,10],[6,10],[7,10],[8,10],
      [6,11],[7,11],[8,11],
    ].forEach(([x,y])=>P(flip(x+bx),y+by,C.shirt2));

    // strap hint
    P(flip(5+bx),9+by,C.tealS);
    P(flip(6+bx),9+by,C.teal);

    // arms (profile)
    if (!punching){
      // front arm swings more, back arm less
      const frontArm = (dir === "E") ? 1 : 0; // which side is "front" in our simple profile
      const aOff = frontArm ? (dir === "E" ? lArmOff : rArmOff) : (dir === "E" ? rArmOff : lArmOff);

      // arm column at x=4-ish in profile
      P(flip(4+bx), 11+by + aOff, C.shirt2);
      P(flip(4+bx), 12+by + aOff, C.shirt1);
      P(flip(4+bx), 13+by + aOff, C.skin);
    } else {
      // punch profile: snap forward
      P(flip(4+bx + punchDX), 12+by + punchDY, C.shirt2);
      P(flip(3+bx + punchDX), 12+by + punchDY, C.shirt1);
      P(flip(2+bx + punchDX), 12+by + punchDY, C.skin);
    }

    // pants (profile)
    [
      [6,12],[7,12],[8,12],
      [6,13],[7,13],[8,13]
    ].forEach(([x,y])=>P(flip(x+bx),y+by,C.pants));
    P(flip(8+bx),13+by,C.navy);

    // legs (short)
    // use inner columns in profile
    const Lx = flip(7+bx);
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;

    // determine swing by whichever foot offset applies more for this direction
    const swingA = (lfX !== 0 || lfY !== 0);
    // profile: just animate one leg readably
    if (!swingA){
      P(Lx,y14,C.skin);
      P(Lx,y15,C.skin);
    } else {
      P(Lx,y15,C.skin);
      P(Lx + (dir==="E"?-1:1), y15, C.skin);
    }
    P(Lx,y16,C.white);

    // shoes (profile, one shoe read)
    const shoeY = 17+by;
    // pick forward shoe based on offsets
    const offX = (dir==="E") ? (lfX || rfX) : (lfX || rfX);
    const offY = (lfY || rfY);

    P(Lx + (dir==="E"?offX:-offX), shoeY + offY, C.navy);
    P(Lx + (dir==="E"?offX:-offX), shoeY+1 + offY, C.navy);
    P(Lx + (dir==="E"?offX:-offX) + (dir==="E"?1:-1), shoeY+1 + offY, C.navy);
    P(Lx + (dir==="E"?offX:-offX), shoeY+2 + offY, C.white);
  }

  // =========================
  // helpers
  // =========================
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
