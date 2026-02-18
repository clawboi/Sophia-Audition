// src/entities/player.js
// NPC City Player — reference sprite remake (pure pixels)
// CLEAN WALK: only feet animate (walk + run). No long-leg lift, no arm swing.
// Running = faster cadence + slightly bigger foot stride.

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

    // facing (kept for punch spark direction)
    const fx = p.faceX || 0, fy = p.faceY || 0;
    if (Math.abs(fx) + Math.abs(fy) > 0.25) this._facing = this._faceDir(fx, fy);
    const face = this._facing;

    const acting = (p.jumpT > 0) || (p.dodgeT > 0) || (p.punchT > 0);

    // step
    const stepRate = moving ? (running ? 12.5 : 8.2) : 1.0;
    this._step += dt * stepRate;

    // blink
    if (this._blinkHold > 0){
      this._blinkHold = Math.max(0, this._blinkHold - dt);
    } else {
      this._blinkNext -= dt;
      if (this._blinkNext <= 0){
        this._blinkHold = 0.10;
        this._blinkNext = 1.3 + Math.random()*2.6;
      }
    }
    const blinking = this._blinkHold > 0;

    // ===== SIZE =====
    const px = 2;
    const SW = 16;
    const SH = 20;
    const W = SW * px;
    const H = SH * px;

    // anchor at feet
    const cx = p.x + p.w/2;
    const feetY = p.y + p.h + 2;

    // no bob while moving (clean look)
    const bob = (!acting && !moving) ? (Math.sin(now * 0.0017) * 0.25) : 0;

    const sx = Math.round(cx - W/2);
    const sy = Math.round(feetY - H - (p.z || 0) + bob);

    // ===== palette (sampled from ref) =====
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

    // shadow (soft)
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx, feetY + 2, 12, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // ===== CLEAN FOOT ANIM =====
    // Only shoes move. Legs stay fixed and shorter.
    // We do a simple 2-frame step: swap which foot is "forward" and add tiny toe shift.
    const stepBit = moving ? ((Math.sin(this._step) > 0) ? 1 : 0) : 0;

    // stride: walk = 0..1px toe shift, run = 0..2px toe shift
    const stride = moving ? (running ? 2 : 1) : 0;

    // In top-down, forward/back depends on facing axis:
    // - if moving mostly E/W: shift in X
    // - else: shift in Y
    const side = (face === "E" || face === "W");
    const dirSign = (face === "E" || face === "S") ? 1 : -1;

    // which shoe is forward this frame
    // A = left shoe (x=6), B = right shoe (x=9)
    const shoeAx = 6;
    const shoeBx = 9;

    // base shoe y positions (kept)
    const shoeY0 = 17;
    const toeY0  = 19;

    // foot offsets (only applied to shoes + toe highlights)
    const aForward = (stepBit === 1);
    const bForward = !aForward;

    const aOffX = (moving && side) ? (aForward ? stride*dirSign : 0) : 0;
    const bOffX = (moving && side) ? (bForward ? stride*dirSign : 0) : 0;

    const aOffY = (moving && !side) ? (aForward ? stride*dirSign : 0) : 0;
    const bOffY = (moving && !side) ? (bForward ? stride*dirSign : 0) : 0;

    // ==========================================================
    // DRAW ORDER: hair -> face -> hoodie/straps -> arms -> pants -> legs -> shoes (animated)
    // ==========================================================

    // ---- HAIR ----
    [
      [6,0],[7,0],[8,0],[9,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],[10,3],
      [5,4],[10,4],
    ].forEach(([x,y])=>P(x,y,C.hair));
    [ [4,3],[4,4],[11,3],[11,4] ].forEach(([x,y])=>P(x,y,C.hair));

    // ---- FACE ----
    [
      [6,3],[7,3],[8,3],[9,3],
      [5,4],[6,4],[7,4],[8,4],[9,4],[10,4],
      [5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
      [6,6],[7,6],[8,6],[9,6],
    ].forEach(([x,y])=>P(x,y,C.skin));

    P(6,6,C.blush); P(9,6,C.blush);

    if (blinking){
      P(7,5,C.hair); P(8,5,C.hair);
    } else {
      P(7,5,C.navy); P(8,5,C.navy);
    }

    // ---- HOODIE / SHIRT ----
    [
      [5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],
      [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
      [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],
      [5,11],[6,11],[7,11],[8,11],[9,11],[10,11],
    ].forEach(([x,y])=>P(x,y,C.shirt2));

    [ [10,8],[10,9],[10,10],[9,10],[9,9] ].forEach(([x,y])=>P(x,y,C.shirt1));
    [ [6,10],[7,10],[8,10] ].forEach(([x,y])=>P(x,y,C.shirt3));

    // straps
    [ [5,8],[5,9],[5,10] ].forEach(([x,y])=>P(x,y,C.teal));
    [ [10,8],[10,9],[10,10] ].forEach(([x,y])=>P(x,y,C.teal));
    [ [6,9],[9,9] ].forEach(([x,y])=>P(x,y,C.tealS));
    P(3,9,C.tealS);
    P(12,9,C.tealS);

    // arms (STATIC now, cleaner)
    const punching = p.punchT > 0;
    if (!punching){
      // left sleeve + hand
      P(4,11, C.shirt2);
      P(4,12, C.shirt1);
      P(4,13, C.skin);

      // right sleeve + hand
      P(11,11, C.shirt2);
      P(11,12, C.shirt1);
      P(11,13, C.skin);
    } else {
      let pxDirX = 0, pxDirY = 0;
      if (face === "E") pxDirX = 2;
      if (face === "W") pxDirX = -2;
      if (face === "N") pxDirY = -2;
      if (face === "S") pxDirY = 2;

      P(4 + pxDirX, 12 + pxDirY, C.shirt2);
      P(5 + pxDirX, 12 + pxDirY, C.shirt1);
      P(6 + pxDirX, 12 + pxDirY, C.skin);

      P(11 + pxDirX, 12 + pxDirY, C.shirt2);
      P(10 + pxDirX, 12 + pxDirY, C.shirt1);
      P(9 + pxDirX, 12 + pxDirY, C.skin);

      this._drawPunchSpark(ctx, p, face);
    }

    // pants
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x,y,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x,y,C.navy));

    // legs (SHORTER: only 2 skin pixels)
    // left leg
    P(6,14, C.skin);
    P(6,15, C.skin);
    // right leg
    P(9,14, C.skin);
    P(9,15, C.skin);

    // socks (static)
    P(6,16, C.white);
    P(9,16, C.white);

    // SHOES (animated only)
    // left shoe
    P(shoeAx + aOffX, shoeY0 + aOffY, C.navy);
    P(shoeAx + aOffX, shoeY0+1 + aOffY, C.navy);
    P(shoeAx+1 + aOffX, shoeY0+1 + aOffY, C.navy); // chunk
    P(shoeAx + aOffX, toeY0 + aOffY, C.white);      // toe highlight

    // right shoe
    P(shoeBx + bOffX, shoeY0 + bOffY, C.navy);
    P(shoeBx + bOffX, shoeY0+1 + bOffY, C.navy);
    P(shoeBx-1 + bOffX, shoeY0+1 + bOffY, C.navy);
    P(shoeBx + bOffX, toeY0 + bOffY, C.white);
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
