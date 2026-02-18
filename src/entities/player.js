// src/entities/player.js
// Same cute dark-Ghibli-ish pixel girl, but with a cleaner walk cycle.
// Fixes the “strange” walk by shifting feet forward/back (X) more than popping up/down (Y),
// adds subtle body bob + coat sway, and reduces rounding jitter.

export class Player {
  constructor(){
    this._lastX = 0;
    this._lastY = 0;
    this._lastT = 0;

    this._blinkNext = 1.6;
    this._blinkHold = 0;

    this._stepPhase = 0;
    this._facing = "S";
  }

  reset(p){
    this._lastX = p.x;
    this._lastY = p.y;
    this._lastT = performance.now();
    this._blinkNext = 1.2 + Math.random()*2.4;
    this._blinkHold = 0;
    this._stepPhase = 0;
    this._facing = this._faceDir(p.faceX || 0, p.faceY || 1);
  }

  draw(ctx, p){
    const now = performance.now();
    if (!this._lastT) this.reset(p);

    // dt clamp (stable animation)
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

    // update facing only when we actually have a directional intent (prevents twitch)
    const fx = p.faceX || 0, fy = p.faceY || 0;
    if (Math.abs(fx) + Math.abs(fy) > 0.25) this._facing = this._faceDir(fx, fy);
    const face = this._facing;

    // step phase
    const stepRate = moving ? (running ? 11.5 : 8.0) : 1.2;
    this._stepPhase += dt * stepRate;

    // blink
    if (this._blinkHold > 0){
      this._blinkHold = Math.max(0, this._blinkHold - dt);
    } else {
      this._blinkNext -= dt;
      if (this._blinkNext <= 0){
        this._blinkHold = 0.10;
        this._blinkNext = 1.4 + Math.random()*2.6;
      }
    }
    const blinking = this._blinkHold > 0;

    const acting = (p.jumpT > 0) || (p.dodgeT > 0) || (p.punchT > 0);

    // subtle idle breathe / moving bob
    const idleBreathe = (!moving && !acting) ? Math.sin(now * 0.0016) : 0;
    const walkBob     = (moving && !acting) ? Math.sin(this._stepPhase * 2.0) : 0;

    // px scale (same)
    const px = 2;
    const W = 18 * px;
    const H = 22 * px;

    // anchor: centered on collider, feet at bottom
    const cx = p.x + p.w/2;
    const feetY = p.y + p.h + 2;

    const sx = Math.round(cx - W/2);
    const sy = Math.round(feetY - H - (p.z || 0));

    // small bob (kept subtle, integer)
    const bob = (!acting)
      ? (moving ? Math.round(walkBob * 1) : Math.round(idleBreathe * 1))
      : 0;

    const y = sy + bob;

    // palette (same)
    const outline = "rgba(12,12,20,.55)";
    const skin    = "#f3ccb6";
    const blush   = "rgba(255,120,160,.18)";
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
    const white   = "rgba(255,255,255,.88)";

    const fill = (x1,y1,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(x1,y1,w,h); };
    const stroke = (x1,y1,w,h)=>{ ctx.strokeStyle=outline; ctx.lineWidth=2; ctx.strokeRect(x1,y1,w,h); };

    // ground shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx, feetY + 2, 12, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // ===== WALK OFFSETS (fixes “weird walk”) =====
    // Instead of mainly moving feet up/down, we push them forward/back a touch.
    // legPhase: -1..1
    const legPhase = Math.sin(this._stepPhase);
    const legPhase2 = Math.sin(this._stepPhase + Math.PI); // opposite leg

    // forward/back depends on facing; for N/S we push in Y, for E/W in X (but subtle)
    const dirIsSide = (face === "E" || face === "W");
    const dirSign   = (face === "E" || face === "S") ? 1 : -1;

    // amplitude in "pixel units" (not scaled)
    const stride = moving ? (running ? 2 : 1) : 0;  // forward/back amount
    const lift   = moving ? 1 : 0;                  // tiny lift at mid-step

    const easeLiftA = Math.max(0, Math.sin(this._stepPhase));      // 0..1..0
    const easeLiftB = Math.max(0, Math.sin(this._stepPhase+Math.PI));

    // leg A (left) offsets
    const legAx = dirIsSide ? Math.round(legPhase * stride * dirSign) : 0;
    const legAy = dirIsSide ? -Math.round(easeLiftA * lift) : Math.round(legPhase * stride * dirSign);
    // leg B (right) offsets
    const legBx = dirIsSide ? Math.round(legPhase2 * stride * dirSign) : 0;
    const legBy = dirIsSide ? -Math.round(easeLiftB * lift) : Math.round(legPhase2 * stride * dirSign);

    // arm swing opposite legs, smaller than legs
    const armSwing = moving ? 1 : 0;
    const armAx = dirIsSide ? -Math.round(legPhase * armSwing * dirSign) : 0;
    const armAy = dirIsSide ? 0 : -Math.round(legPhase * armSwing * dirSign);
    const armBx = dirIsSide ? -Math.round(legPhase2 * armSwing * dirSign) : 0;
    const armBy = dirIsSide ? 0 : -Math.round(legPhase2 * armSwing * dirSign);

    // coat sway: tiny left-right wobble when moving
    const sway = (moving && !acting) ? Math.round(Math.sin(this._stepPhase) * 1) : 0;

    // ===== HEAD =====
    // Slight hair bounce when moving (1px max)
    const hairBob = (moving && !acting) ? Math.round(Math.sin(this._stepPhase * 2) * 1) : 0;

    fill(sx+5*px, y+1*px, 8*px, 7*px, skin);
    fill(sx+6*px, y+0*px, 6*px, 1*px, skin);

    // hair cap + side strands
    fill(sx+5*px, y+(1+hairBob)*px, 8*px, 3*px, hairS);
    fill(sx+5*px, y+(1+hairBob)*px, 8*px, 2*px, hair);
    fill(sx+4*px, y+(3+hairBob)*px, 2*px, 4*px, hairS);
    fill(sx+12*px,y+(3+hairBob)*px, 2*px, 4*px, hairS);

    // eyes
    if (blinking){
      fill(sx+7*px, y+5*px, 2*px, 1*px, eyeLine);
      fill(sx+10*px,y+5*px, 2*px, 1*px, eyeLine);
    } else {
      fill(sx+7*px,  y+4*px, 2*px, 3*px, blueS);
      fill(sx+10*px, y+4*px, 2*px, 3*px, blueS);

      fill(sx+7*px,  y+4*px, 1*px, 1*px, blue);
      fill(sx+10*px, y+4*px, 1*px, 1*px, blue);

      fill(sx+8*px,  y+6*px, 1*px, 1*px, eyeLine);
      fill(sx+11*px, y+6*px, 1*px, 1*px, eyeLine);

      fill(sx+8*px,  y+4*px, 1*px, 1*px, white);
      fill(sx+11*px, y+4*px, 1*px, 1*px, white);
    }

    // blush
    ctx.save();
    ctx.globalAlpha = 0.85;
    fill(sx+6*px,  y+6*px, 1*px, 1*px, blush);
    fill(sx+12*px, y+6*px, 1*px, 1*px, blush);
    ctx.restore();

    stroke(sx+5*px, y+1*px, 8*px, 7*px);

    // ===== scarf =====
    fill(sx+6*px, y+8*px, 6*px, 2*px, scarf);
    stroke(sx+6*px, y+8*px, 6*px, 2*px);

    // ===== body (coat) =====
    fill(sx+(6+sway)*px, y+10*px, 6*px, 7*px, coat);
    ctx.save();
    ctx.globalAlpha = 0.55;
    fill(sx+(9+sway)*px, y+10*px, 3*px, 7*px, coatS);
    ctx.restore();
    stroke(sx+(6+sway)*px, y+10*px, 6*px, 7*px);

    // ==
