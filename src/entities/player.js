// src/entities/player.js
// NPC City Player v2: bigger/cleaner silhouette, less boxy head, smoother walk.
// Key changes:
// - removes strokeRect “square head” look (uses pixel-outline instead)
// - slightly bigger (px=3) but still thin + a bit shorter overall
// - improved step: foot forward/back + tiny hip sway + coat tail lag

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

    const fx = p.faceX || 0, fy = p.faceY || 0;
    if (Math.abs(fx) + Math.abs(fy) > 0.25) this._facing = this._faceDir(fx, fy);
    const face = this._facing;

    const acting = (p.jumpT > 0) || (p.dodgeT > 0) || (p.punchT > 0);

    // step
    const stepRate = moving ? (running ? 10.5 : 7.6) : 1.0;
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

    // --- sizing: bigger but still thin, and a bit shorter ---
    const px = 3;

    // sprite grid size (in pixels, before scaling)
    const SW = 16; // thinner than before
    const SH = 20; // slightly shorter than before
    const W = SW * px;
    const H = SH * px;

    // anchor at feet
    const cx = p.x + p.w/2;
    const feetY = p.y + p.h + 2;

    // gentle bob (subtle)
    const idle = (!moving && !acting) ? Math.sin(now * 0.0017) : 0;
    const bob  = (!acting)
      ? (moving ? Math.sin(this._step * 2.0) * 0.7 : idle * 0.8)
      : 0;

    const sx = Math.round(cx - W/2);
    const sy = Math.round(feetY - H - (p.z || 0) + bob);

    // palette (same vibe)
    const outline = "rgba(12,12,20,.70)";
    const skin    = "#f3ccb6";
    const hair    = "#f6e08a";
    const hairS   = "#cbb25b";
    const coat    = "#1b1b24";
    const coatS   = "#2a2a36";
    const scarf   = "rgba(138,46,255,.85)";
    const boot    = "#101017";
    const sock    = "#c9c0ae";
    const eyeLine = "#101018";
    const blue    = "#4aa8ff";
    const blueS   = "#2b6ea8";
    const white   = "rgba(255,255,255,.90)";
    const blush   = "rgba(255,120,160,.16)";

    // --- helpers ---
    const P = (ix, iy, c) => { // single pixel in sprite grid
      ctx.fillStyle = c;
      ctx.fillRect(sx + ix*px, sy + iy*px, px, px);
    };

    const outlinePixel = (ix, iy) => P(ix, iy, outline);

    // soft shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx, feetY + 2, 13, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // --- walk motion (nicer step) ---
    const phaseA = Math.sin(this._step);
    const phaseB = Math.sin(this._step + Math.PI);

    const side = (face === "E" || face === "W");
    const dirSign = (face === "E" || face === "S") ? 1 : -1;

    // stride/lift in sprite pixels
    const stride = moving ? (running ? 2 : 1) : 0;
    const lift   = moving ? 1 : 0;

    // feet: forward/back > up/down
    const fA = phaseA * stride * dirSign;
    const fB = phaseB * stride * dirSign;

    const upA = Math.max(0, Math.sin(this._step)) * lift;
    const upB = Math.max(0, Math.sin(this._step + Math.PI)) * lift;

    const footAx = side ? Math.round(fA) : 0;
    const footAy = side ? -Math.round(upA) : Math.round(fA);
    const footBx = side ? Math.round(fB) : 0;
    const footBy = side ? -Math.round(upB) : Math.round(fB);

    // hips + coat lag
    const hipSway = (moving && !acting) ? Math.round(Math.sin(this._step) * 1) : 0;
    const coatLag = (moving && !acting) ? Math.round(Math.sin(this._step - 0.6) * 1) : 0;

    // arms swing opposite
    const armSwing = moving ? 1 : 0;
    const armA = -phaseA * armSwing * dirSign;
    const armB = -phaseB * armSwing * dirSign;
    const armAx = side ? Math.round(armA) : 0;
    const armAy = side ? 0 : -Math.round(armA);
    const armBx = side ? Math.round(armB) : 0;
    const armBy = side ? 0 : -Math.round(armB);

    // punching
    const punching = p.punchT > 0;

    // ==========================================================
    // SPRITE DRAW (pixel-y but more “person” silhouette)
    //
    // Grid: 16w x 20h
    //
    // Head is rounded via pixels and hair tufts break the box.
    // ==========================================================

    // --- outline base (draw outlines first so it feels “shaped”) ---
    // head outline (rounded-ish)
    [
      [6,1],[7,1],[8,1],[9,1],
      [5,2],[10,2],
      [4,3],[11,3],
      [4,4],[11,4],
      [4,5],[11,5],
      [5,6],[10,6],
      [6,7],[7,7],[8,7],[9,7],

      // neck/shoulders outline
      [6,8],[9,8],
      [5,9],[10,9],

      // body outline
      [5,10],[10,10],
      [4,11],[11,11],
      [4,12],[11,12],
      [4,13],[11,13],
      [5,14],[10,14],

      // coat tail outline (adds shape)
      [6,15],[9,15],
      [6,16],[9,16]
    ].forEach(([ix,iy])=>outlinePixel(ix,iy));

    // --- hair silhouette to break square ---
    // top hair + tufts
    [
      [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
      [5,3],[10,3],
      [5,4],[10,4],
      // side strands
      [4,5],[12,5],
      [4,6],[12,6]
    ].forEach(([ix,iy])=>P(ix,iy,hairS));
    [
      [6,2],[7,2],[8,2],[9,2],
      [6,3],[7,3],[8,3],[9,3],
      [6,4],[7,4],[8,4],[9,4]
    ].forEach(([ix,iy])=>P(ix,iy,hair));

    // --- face skin (rounded block) ---
    [
      [5,3],[6,3],[7,3],[8,3],[9,3],[10,3],
      [5,4],[6,4],[7,4],[8,4],[9,4],[10,4],
      [5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
      [6,6],[7,6],[8,6],[9,6]
    ].forEach(([ix,iy])=>P(ix,iy,skin));

    // blush
    P(6,6,blush); P(9,6,blush);

    // eyes (tiny but expressive)
    if (blinking){
      P(6,5,eyeLine); P(9,5,eyeLine);
    } else {
      P(6,5,blueS); P(9,5,blueS);
      P(6,6,blue);  P(9,6,blue);
      P(7,5,white); P(10,5,white);
      P(7,6,eyeLine); P(10,6,eyeLine);
    }

    // --- scarf ---
    [ [6,8],[7,8],[8,8],[9,8], [7,9],[8,9] ].forEach(([ix,iy])=>P(ix,iy,scarf));

    // --- torso/coat (thin body, with shading + sway) ---
    const bodyX = hipSway;
    // main coat
    for (let iy=10; iy<=14; iy++){
      for (let ix=6; ix<=9; ix++) P(ix+bodyX, iy, coat);
      // shade on right
      P(9+bodyX, iy, coatS);
    }
    // coat tail (lag)
    P(7+bodyX+coatLag, 15, coat);
    P(8+bodyX+coatLag, 15, coat);
    P(7+bodyX+coatLag, 16, coatS);
    P(8+bodyX+coatLag, 16, coatS);

    // --- arms ---
    if (!punching){
      // left arm
      P(5+armAx+bodyX, 11+armAy, coat);
      P(5+armAx+bodyX, 12+armAy, coat);
      P(5+armAx+bodyX, 13+armAy, coatS);

      // right arm
      P(10+armBx+bodyX, 11+armBy, coat);
      P(10+armBx+bodyX, 12+armBy, coat);
      P(10+armBx+bodyX, 13+armBy, coatS);
    } else {
      // punch pose: extend one arm by facing
      let pxDirX = 0, pxDirY = 0;
      if (face === "E") pxDirX = 2;
      if (face === "W") pxDirX = -2;
      if (face === "N") pxDirY = -1;
      if (face === "S") pxDirY = 1;

      // both arms slightly forward (keeps it simple)
      P(5+bodyX+pxDirX, 12+pxDirY, coat);
      P(6+bodyX+pxDirX, 12+pxDirY, coatS);
      P(10+bodyX+pxDirX,12+pxDirY, coat);
      P(9+bodyX+pxDirX, 12+pxDirY, coatS);

      this._drawPunchSpark(ctx, p, face);
    }

    // --- legs/feet (thin, animated) ---
    // leg A (left)
    P(7+footAx+bodyX, 17, sock);
    P(7+footAx+bodyX, 18+footAy, boot);
    P(7+footAx+bodyX, 19+footAy, boot);

    // leg B (right)
    P(8+footBx+bodyX, 17, sock);
    P(8+footBx+bodyX, 18+footBy, boot);
    P(8+footBx+bodyX, 19+footBy, boot);
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
