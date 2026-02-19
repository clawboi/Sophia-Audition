
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

    this._face4 = "S"; // body
    this._atk8  = "S"; // attack
  }

  reset(p){
    this._lastX = p.x;
    this._lastY = p.y;
    this._lastT = performance.now();

    this._blinkNext = 1.2 + Math.random()*2.4;
    this._blinkHold = 0;

    this._step = 0;

    const fx = p.faceX || 0;
    const fy = p.faceY || 1;

    this._face4 = this._faceDir4(fx, fy); // BODY raw
    this._atk8  = this._faceDir8(fx, fy); // ATTACK flipped
  }

  draw(ctx, p, input, now){
    now = (now ?? performance.now());
    // Snap render position to whole pixels to prevent wobble/shimmer
    const x = Math.round((p?.x ?? 0));
    const y = Math.round((p?.y ?? 0));
    if (!this._lastT) this.reset(p);

    // soft shadow (after x/y defined)
    ctx.fillStyle='rgba(0,0,0,0.20)';
    ctx.fillRect(x+4, y+18, 8, 2);

    // dt clamp
    let dt = (now - this._lastT) / 1000;
    if (!isFinite(dt) || dt <= 0) dt = 1/60;
    if (dt < 1/144) dt = 1/144;
    if (dt > 1/24)  dt = 1/24;

    const vx = (x - this._lastX) / dt;
    const vy = (y - this._lastY) / dt;
    const speed = Math.hypot(vx, vy);

    this._lastX = x;
    this._lastY = y;
    this._lastT = now;

    const moving  = speed > 8;
    const running = speed > 165;

    const punching = p.punchT > 0;
    const acting = punching || (p.jumpT > 0) || (p.dodgeT > 0);

    // Update facing only with intent (prevents twitch)
    const fxRaw = p.faceX || 0;
    const fyRaw = p.faceY || 0;
    if (Math.abs(fxRaw) + Math.abs(fyRaw) > 0.25){
      this._face4 = this._faceDir4(fxRaw, fyRaw); // BODY raw
      this._atk8  = this._faceDir8(fxRaw, fyRaw); // ATTACK flipped
    }

    const face4 = this._face4;
    const atk8  = this._atk8;

    // step cadence (Pokemon-ish)
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

    const cx = x + p.w/2;
    const feetY = y + p.h + 2;

    // tiny idle breathe only (keep extremely subtle to avoid "hip shake" feel)
    const bob = (!moving && !acting) ? Math.round(Math.sin(now * 0.0012) * 0.4) : 0;

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

    // Movement styling knobs (Director-mode safe):
    // - Keep feet readable, but remove torso/hip wobble that can feel nauseating.
    const STRIDE = 1;          // feet separation
    const LIFT_NS = 1;         // N/S foot lift
    const LIFT_EW = 1;         // E/W foot lift
    const HIP_SWAY = 0;        // 0 = no hip wobble (recommended)
    const ARM_SWING = 0.5;     // smaller arm swing so the body feels steadier

    const stride = moving ? STRIDE : 0; // consistent stride keeps feet grounded

    const isNS = (face4 === "N" || face4 === "S");
    const isEW = (face4 === "E" || face4 === "W");

    let lfX = 0, lfY = 0, rfX = 0, rfY = 0;

    if (moving && !acting){
      if (isNS){
        const spread = stride; // tighter stance (no “Mickey” spread)
        lfX = stepA ? -spread : stepB ? spread : 0;
        rfX = stepA ?  spread : stepB ? -spread : 0;
        lfY = stepA ? -LIFT_NS : 0;
        rfY = stepB ? -LIFT_NS : 0;
      } else if (isEW){
        const lift = LIFT_EW;
        lfY = stepA ? -lift : stepB ? lift : 0;
        rfY = stepA ?  lift : stepB ? -lift : 0;

        const nudge = running ? 1 : 0;
        if (face4 === "E"){ lfX = stepA ? nudge : 0; rfX = stepB ? nudge : 0; }
        if (face4 === "W"){ lfX = stepA ? -nudge : 0; rfX = stepB ? -nudge : 0; }
      }
    }

    // hip shift (disabled by default to prevent the "shaking hips" look)
    let hipX = 0, hipY = 0;
    if (HIP_SWAY && moving && !acting){
      if (isNS) hipX = stepA ? HIP_SWAY : stepB ? -HIP_SWAY : 0;
      else     hipY = stepA ? HIP_SWAY : stepB ? -HIP_SWAY : 0;
    }

    // walk arm swing (smaller so it reads as walking, not wobbling)
    const armSwing = (moving && !acting) ? ARM_SWING : 0;
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

    // HAIR
    [
      [6,0],[7,0],[8,0],[9,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],[10,3],
      [5,4],[10,4],
      [4,2],[4,3],[11,2],[11,3],
      [4,4],[11,4]
    ].forEach(([x,y])=>P(x,y,C.hair));

    // FACE
    [
      [6,3],[7,3],[8,3],[9,3],
      [5,4],[6,4],[7,4],[8,4],[9,4],[10,4],
      [5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
      [6,6],[7,6],[8,6],[9,6],
    ].forEach(([x,y])=>P(x,y,C.skin));
    P(6,6,C.blush); P(9,6,C.blush);

    // EYES
    if (blinking){
      P(7,5,C.hair); P(8,5,C.hair);
    } else {
      P(7,5,C.white); P(8,5,C.white);
      P(7,5,C.navy);  P(8,5,C.navy);
      P(7,4,C.white);
    }

    const bx = hipX, by = hipY;

    // HOODIE
    [
      [5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],
      [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
      [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],
      [5,11],[6,11],[7,11],[8,11],[9,11],[10,11],
    ].forEach(([x,y])=>P(x+bx,y+by,C.shirt2));

    [ [10,8],[10,9],[10,10],[9,10],[9,9] ].forEach(([x,y])=>P(x+bx,y+by,C.shirt1));
    [ [6,10],[7,10],[8,10] ].forEach(([x,y])=>P(x+bx,y+by,C.shirt3));

    // STRAPS
    [ [5,8],[5,9],[5,10] ].forEach(([x,y])=>P(x+bx,y+by,C.teal));
    [ [10,8],[10,9],[10,10] ].forEach(([x,y])=>P(x+bx,y+by,C.teal));
    [ [6,9],[9,9] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    P(3+bx,9+by,C.tealS);
    P(12+bx,9+by,C.tealS);

    // HAND ANCHORS
    const Lhand = { x: 4+bx,  y: 13+by + lArmOff };
    const Rhand = { x: 11+bx, y: 13+by + rArmOff };
    const Lshould = { x: 4+bx, y: 11+by + lArmOff };
    const Rshould = { x: 11+bx,y: 11+by + rArmOff };

    if (!punching){
      // left
      P(4+bx, 11+by + lArmOff, C.shirt2);
      P(4+bx, 12+by + lArmOff, C.shirt1);
      P(Lhand.x, Lhand.y, C.skin);
      // right
      P(11+bx, 11+by + rArmOff, C.shirt2);
      P(11+bx, 12+by + rArmOff, C.shirt1);
      P(Rhand.x, Rhand.y, C.skin);

      if (held){
        this._drawHeldItem(P, C, held, atkVec, Rhand, true);
      }
    } else {
      // lead = right
      this._drawSwingArm(P, C, Rshould, Rhand, swing.lead);
      this._drawSwingArm(P, C, Lshould, Lhand, swing.follow);

      if (held){
        const tip = { x: Rhand.x + swing.lead.tipOff.dx, y: Rhand.y + swing.lead.tipOff.dy };
        this._drawHeldItem(P, C, held, atkVec, tip, true);
      }
    }

    // PANTS
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // LEGS + SOCKS
    const Lx = 6+bx, Rx = 10+bx; // wide stance stays
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;

    const Lswing = (lfX !== 0 || lfY !== 0);
    const Rswing = (rfX !== 0 || rfY !== 0);

    if (!Lswing){ P(Lx,y14,C.skin); P(Lx,y15,C.skin); }
    else { P(Lx,y15,C.skin); P(Lx+1,y15,C.skin); }

    if (!Rswing){ P(Rx,y14,C.skin); P(Rx,y15,C.skin); }
    else { P(Rx,y15,C.skin); P(Rx-1,y15,C.skin); }

    P(Lx,y16,C.white);
    P(Rx,y16,C.white);

    // SHOES (slim + grounded, not chunky)
    // Each shoe is: top (navy) + sole (navy) + toe (white)
    const shoeY = 17+by;

    const lfx = Lx + lfX, lfy = shoeY + lfY;
    P(lfx,   lfy,   C.navy);
    P(lfx,   lfy+1, C.navy);
    P(lfx,   lfy+2, C.white);

    const rfx = Rx + rfX, rfy = shoeY + rfY;
    P(rfx,   rfy,   C.navy);
    P(rfx,   rfy+1, C.navy);
    P(rfx,   rfy+2, C.white);

    // subtle toe shadow so it reads "foot" without ballooning
    // (one pixel, only when moving)
    if ((lfX||lfY) && !punching) P(lfx, lfy+1, C.navy);
    if ((rfX||rfY) && !punching) P(rfx, rfy+1, C.navy);
  }

  // =========================
  // BACK (N)
  // =========================
  _drawBack(P, C, s){
    const { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, atkVec } = s;
    const bx = hipX, by = hipY;

    // HAIR
    [
      [6,0],[7,0],[8,0],[9,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],[10,3],
      [4,2],[4,3],[11,2],[11,3],
      [4,4],[5,4],[10,4],[11,4],
    ].forEach(([x,y])=>P(x,y,C.hair));

    // HEAD/NECK
    [
      [6,5],[7,5],[8,5],[9,5],
      [7,6],[8,6],
    ].forEach(([x,y])=>P(x,y,C.skin));

    // HOODIE
    [
      [5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],
      [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
      [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],
      [5,11],[6,11],[7,11],[8,11],[9,11],[10,11],
    ].forEach(([x,y])=>P(x+bx,y+by,C.shirt2));

    // STRAPS
    [ [5,8],[5,9],[5,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    [ [10,8],[10,9],[10,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    P(3+bx,9+by,C.tealS);
    P(12+bx,9+by,C.tealS);

    const Lhand = { x: 4+bx,  y: 13+by + lArmOff };
    const Rhand = { x: 11+bx, y: 13+by + rArmOff };
    const Lshould = { x: 4+bx, y: 11+by + lArmOff };
    const Rshould = { x: 11+bx,y: 11+by + rArmOff };

    if (!punching){
      P(4+bx, 11+by + lArmOff, C.shirt2);
      P(4+bx, 12+by + lArmOff, C.shirt1);
      P(11+bx, 11+by + rArmOff, C.shirt2);
      P(11+bx, 12+by + rArmOff, C.shirt1);

      if (held){
        this._drawHeldItem(P, C, held, atkVec, Rhand, true);
      }
    } else {
      // lead = left
      this._drawSwingArm(P, C, Lshould, Lhand, swing.lead);
      this._drawSwingArm(P, C, Rshould, Rhand, swing.follow);

      if (held){
        const tip = { x: Lhand.x + swing.lead.tipOff.dx, y: Lhand.y + swing.lead.tipOff.dy };
        this._drawHeldItem(P, C, held, atkVec, tip, true);
      }
    }

    // pants + legs
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    const Lx = 6+bx, Rx = 10+bx;
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;

    const Lswing = (lfX !== 0 || lfY !== 0);
    const Rswing = (rfX !== 0 || rfY !== 0);

    if (!Lswing){ P(Lx,y14,C.skin); P(Lx,y15,C.skin); }
    else { P(Lx,y15,C.skin); P(Lx+1,y15,C.skin); }

    if (!Rswing){ P(Rx,y14,C.skin); P(Rx,y15,C.skin); }
    else { P(Rx,y15,C.skin); P(Rx-1,y15,C.skin); }

    P(Lx,y16,C.white);
    P(Rx,y16,C.white);

    // SHOES (slim)
    const shoeY = 17+by;

    const lfx = Lx + lfX, lfy = shoeY + lfY;
    P(lfx,   lfy,   C.navy);
    P(lfx,   lfy+1, C.navy);
    P(lfx,   lfy+2, C.white);

    const rfx = Rx + rfX, rfy = shoeY + rfY;
    P(rfx,   rfy,   C.navy);
    P(rfx,   rfy+1, C.navy);
    P(rfx,   rfy+2, C.white);
  }

  // =========================
  // SIDE (E/W)
  // =========================
  _drawSide(P, C, s){
    const { dir, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held } = s;
    const bx = hipX, by = hipY;
    const flip = (x) => dir === "E" ? x : (15 - x);
    const Pf = (ix,iy,col)=>P(flip(ix),iy,col);

    // HAIR
    [
      [6,0],[7,0],[8,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],
      [5,4],[9,4],
      [4,3],[4,4],
      [10,2],[10,3]
    ].forEach(([x,y])=>Pf(x,y,C.hair));

    // FACE
    [
      [7,3],[8,3],[9,3],
      [7,4],[8,4],[9,4],
      [7,5],[8,5],[9,5],
      [7,6],[8,6],
    ].forEach(([x,y])=>Pf(x,y,C.skin));
    Pf(9,5,C.navy);

    // BODY
    [
      [6,7],[7,7],[8,7],[9,7],
      [5,8],[6,8],[7,8],[8,8],[9,8],
      [5,9],[6,9],[7,9],[8,9],[9,9],
      [5,10],[6,10],[7,10],[8,10],[9,10],
      [6,11],[7,11],[8,11],[9,11],
    ].forEach(([x,y])=>Pf(x+bx,y+by,C.shirt2));

    Pf(5+bx,9+by,C.tealS);
    Pf(6+bx,9+by,C.teal);

    const frontOff = (dir === "E") ? lArmOff : rArmOff;
    const backOff  = (dir === "E") ? rArmOff : lArmOff;

    const frontHand = { x: 4+bx, y: 13+by + frontOff };
    const frontShould = { x: 5+bx, y: 11+by + frontOff };

    const backHand = { x: 6+bx, y: 13+by + backOff };
    const backShould = { x: 6+bx, y: 11+by + backOff };

    if (!punching){
      Pf(backShould.x, backShould.y, C.shirt2);
      Pf(backShould.x, backShould.y+1, C.shirt1);
      Pf(backHand.x, backHand.y, C.skin);

      Pf(frontShould.x, frontShould.y, C.shirt2);
      Pf(frontShould.x, frontShould.y+1, C.shirt1);
      Pf(frontHand.x, frontHand.y, C.skin);

      if (held){
        this._drawSideHeldTwoHanded(Pf, C, held, dir, { bx, by }, frontHand, backHand);
      }
    } else {
      const swingLead = (dir === "W") ? this._mirrorSwingOne(swing.lead) : swing.lead;

      const shoulder = { x: frontShould.x, y: frontShould.y + 1 };
      const mid =      { x: frontHand.x + swingLead.midOff.dx, y: frontHand.y + swingLead.midOff.dy };
      const tip =      { x: frontHand.x + swingLead.tipOff.dx, y: frontHand.y + swingLead.tipOff.dy };

      this._plotLine(Pf, shoulder, mid, C.shirt2);
      this._plotLine(Pf, mid, tip, C.shirt2);

      Pf(mid.x, mid.y, C.shirt1);
      Pf(tip.x, tip.y, C.skin);

      if (held){
        this._drawSideHeldTwoHanded(Pf, C, held, dir, { bx, by }, tip, backHand);
      }
    }

    // PANTS
    [
      [6,12],[7,12],[8,12],[9,12],
      [6,13],[7,13],[8,13],[9,13]
    ].forEach(([x,y])=>Pf(x+bx,y+by,C.pants));
    Pf(9+bx,13+by,C.navy);

    // SIDE FEET (slim, not chunky)
    const y14 = 14+by, y15 = 15+by, y16 = 16+by;
    const shoeY = 17+by;

    // back leg
    const backLegX = 7+bx;
    const backFootX = backLegX + (dir==="E" ? -1 : 1) + (lfX||rfX);
    const backFootY = shoeY + (lfY||rfY);

    Pf(backLegX, y14, C.skin);
    Pf(backLegX, y15, C.skin);
    Pf(backLegX, y16, C.white);

    Pf(backFootX, backFootY, C.navy);
    Pf(backFootX, backFootY+1, C.navy);
    Pf(backFootX, backFootY+2, C.white);

    // front leg
    const frontLegX = 8+bx;
    const frontFootX = frontLegX + (lfX||rfX);
    const frontFootY = shoeY + (lfY||rfY);

    Pf(frontLegX, y14, C.skin);
    Pf(frontLegX, y15, C.skin);
    Pf(frontLegX, y16, C.white);

    Pf(frontFootX, frontFootY, C.navy);
    Pf(frontFootX, frontFootY+1, C.navy);
    Pf(frontFootX, frontFootY+2, C.white);
  }

  _drawSideHeldTwoHanded(P, C, held, dir, base, frontHand, backHand){
    const type = (typeof held === "string") ? held : (held?.type || "tool");
    const tint = (typeof held === "object" && held?.tint) ? held.tint : null;

    const dx = 1;

    const grip = { x: Math.max(frontHand.x, backHand.x) + 1, y: Math.min(frontHand.y, backHand.y) - 1 };

    P(grip.x,   grip.y+1, C.skin);
    P(grip.x-1, grip.y+2, C.skin);

    const len =
      (type === "bat") ? 6 :
      (type === "knife") ? 5 :
      (type === "gun") ? 4 :
      5;

    if (type === "bat"){
      for (let i=0;i<=len;i++) P(grip.x + dx*i, grip.y, C.wood);
      P(grip.x + dx*(len+1), grip.y, C.white);

    } else if (type === "knife"){
      P(grip.x, grip.y, C.wood);
      for (let i=1;i<=len;i++) P(grip.x + dx*i, grip.y, tint || C.steel);
      P(grip.x + dx*(len+1), grip.y, C.white);

    } else if (type === "gun"){
      P(grip.x,   grip.y,   C.navy);
      P(grip.x+1, grip.y,   C.navy);
      P(grip.x+2, grip.y,   C.navy);
      P(grip.x+1, grip.y+1, C.navy);
      P(grip.x+3, grip.y,   C.steelS);

    } else if (type === "flashlight"){
      P(grip.x,   grip.y, C.steelS);
      P(grip.x+1, grip.y, C.steelS);
      P(grip.x+2, grip.y, C.steelS);
      P(grip.x+3, grip.y, C.glow);

    } else {
      P(grip.x,   grip.y, tint || C.steel);
      P(grip.x+1, grip.y, tint || C.steelS);
      P(grip.x+2, grip.y, tint || C.steelS);
      P(grip.x+3, grip.y, tint || C.steelS);
    }
  }

  _swingOffsetsTight(p, dir, perp){
    p = Math.max(0, Math.min(1, p));

    const windEnd = 0.24;
    const hitEnd  = 0.64;

    const reach = 3;
    const arc   = 1;

    let tip = { dx: 0, dy: 0 };
    let mid = { dx: 0, dy: 0 };

    if (p < windEnd){
      const t = p / windEnd;
      const back = Math.round((1 - t) * 2);
      const side = Math.round((1 - t) * 1);
      tip = { dx: -dir.dx * back - perp.dx * side, dy: -dir.dy * back - perp.dy * side };
      mid = { dx: Math.round(tip.dx * 0.55), dy: Math.round(tip.dy * 0.55) };
    } else if (p < hitEnd){
      const t = (p - windEnd) / (hitEnd - windEnd);
      const f = Math.round(t * reach);
      const s = Math.round(Math.sin(t * Math.PI) * arc);
      tip = { dx: dir.dx * f + perp.dx * s, dy: dir.dy * f + perp.dy * s };
      mid = {
        dx: Math.round(dir.dx * (f * 0.55) + perp.dx * (s * 0.65)),
        dy: Math.round(dir.dy * (f * 0.55) + perp.dy * (s * 0.65))
      };
    } else {
      const t = (p - hitEnd) / (1 - hitEnd);
      const f = Math.round(reach * (1 - 0.55*t));
      tip = { dx: dir.dx * f, dy: dir.dy * f };
      mid = { dx: Math.round(tip.dx * 0.55), dy: Math.round(tip.dy * 0.55) };
    }

    const followTip = { dx: Math.round(tip.dx * 0.50), dy: Math.round(tip.dy * 0.50) };
    const followMid = { dx: Math.round(mid.dx * 0.50), dy: Math.round(mid.dy * 0.50) };

    return {
      lead:   { tipOff: tip,       midOff: mid       },
      follow: { tipOff: followTip, midOff: followMid }
    };
  }

  _mirrorSwingOne(one){
    return {
      tipOff: { dx: -one.tipOff.dx, dy: one.tipOff.dy },
      midOff: { dx: -one.midOff.dx, dy: one.midOff.dy }
    };
  }

  _hitKick(swingP){
    return (swingP > 0.30 && swingP < 0.64) ? 1 : 0;
  }

  _drawSwingArm(P, C, shoulder, handBase, swingOne){
    const mid = { x: handBase.x + swingOne.midOff.dx, y: handBase.y + swingOne.midOff.dy };
    const tip = { x: handBase.x + swingOne.tipOff.dx, y: handBase.y + swingOne.tipOff.dy };

    this._plotLine(P, shoulder, mid, C.shirt2);
    this._plotLine(P, mid, tip, C.shirt2);

    P(mid.x, mid.y, C.shirt1);
    P(tip.x, tip.y, C.skin);
  }

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

  _drawHeldItem(P, C, held, dirVec, hand){
    const type = (typeof held === "string") ? held : (held?.type || "tool");
    const tint = (typeof held === "object" && held?.tint) ? held.tint : null;

    const dx = Math.sign(dirVec.dx);
    const dy = Math.sign(dirVec.dy);

    const origin = { x: hand.x + dx, y: hand.y + dy - 1 };

    const baseLen =
      (type === "bat") ? 5 :
      (type === "knife") ? 4 :
      (type === "gun") ? 4 :
      4;

    if (type === "knife"){
      P(origin.x, origin.y, C.wood);
      for (let i=1;i<=baseLen;i++){
        P(origin.x + dx*i, origin.y + dy*i, tint || C.steel);
      }
      P(origin.x + dx*(baseLen+1) + (dy!==0?1:0), origin.y + dy*(baseLen+1) + (dx!==0?1:0), C.white);

    } else if (type === "bat"){
      for (let i=0;i<=baseLen;i++){
        P(origin.x + dx*i, origin.y + dy*i, C.wood);
      }
      P(origin.x + dx*(baseLen+1), origin.y + dy*(baseLen+1), C.white);

    } else if (type === "gun"){
      P(origin.x, origin.y, C.navy);
      P(origin.x + dx, origin.y + dy, C.navy);
      P(origin.x + dx*2, origin.y + dy*2, C.navy);
      P(origin.x + (dy!==0?1:0), origin.y + (dx!==0?1:0), C.navy);
      P(origin.x + dx*3, origin.y + dy*3, C.steelS);

    } else if (type === "flashlight"){
      P(origin.x, origin.y, C.steelS);
      P(origin.x + dx, origin.y + dy, C.steelS);
      P(origin.x + dx*2, origin.y + dy*2, C.steelS);
      P(origin.x + dx*3, origin.y + dy*3, C.glow);

    } else {
      P(origin.x, origin.y, tint || C.steel);
      P(origin.x + dx, origin.y + dy, tint || C.steelS);
      P(origin.x + dx*2, origin.y + dy*2, tint || C.steelS);
      P(origin.x + dx*3, origin.y + dy*3, tint || C.steelS);
    }
  }

  _faceDir4(fx, fy){
    if (Math.abs(fx) > Math.abs(fy)) return fx >= 0 ? "E" : "W";
    return fy >= 0 ? "S" : "N";
  }

  _faceDir8(fx, fy){
    const fy2 = -fy;
    const mag = Math.hypot(fx, fy2);
    if (mag < 0.001) return this._atk8 || "S";

    const nx = fx / mag;
    const ny = fy2 / mag;

    const a = Math.atan2(ny, nx);
    const oct = Math.round(8 * a / (2*Math.PI)) & 7;
    return ["E","NE","N","NW","W","SW","S","SE"][oct];
  }

  _dirVec8(face){
    if (face === "E")  return { dx: 1, dy: 0 };
    if (face === "W")  return { dx: -1, dy: 0 };
    if (face === "N")  return { dx: 0, dy: -1 };
    if (face === "S")  return { dx: 0, dy: 1 };
    if (face === "NE") return { dx: 1, dy: -1 };
    if (face === "NW") return { dx: -1, dy: -1 };
    if (face === "SE") return { dx: 1, dy: 1 };
    return { dx: -1, dy: 1 };
  }

  _drawPunchSpark(ctx, p, v, swingP){
    const cx = x + p.w/2;
    const cy = p.y + p.h/2 - (p.z || 0);

    const ox = v.dx * 18;
    const oy = v.dy * 18;

    const hot = (swingP > 0.30 && swingP < 0.70) ? 1 : 0.55;

    ctx.save();
    ctx.globalAlpha = 0.78 * hot;
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx + ox, cy + oy);
    ctx.lineTo(cx + ox + v.dx * 14, cy + oy + v.dy * 14);
    ctx.stroke();

    ctx.globalAlpha = 0.55 * hot;
    ctx.beginPath();
    ctx.moveTo(cx + ox - v.dy * 7, cy + oy + v.dx * 7);
    ctx.lineTo(cx + ox + v.dy * 7, cy + oy - v.dx * 7);
    ctx.stroke();

    ctx.globalAlpha = 0.18 * hot;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, 7, 0, Math.PI*2);
    ctx.stroke();

    ctx.restore();
  }
}
