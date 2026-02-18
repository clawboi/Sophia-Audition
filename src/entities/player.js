// src/entities/player.js
// NPC City Player — v13 (full replacement)
//
// WHAT YOU ASKED (exact):
// - When walking DOWN (S): head/face should face down (front sprite).
// - When walking UP (W): back should face up (back sprite).
// - Keep your diagonal aiming fix (so W+D doesn’t feel “down-right”).
// - Punching stays perfect (8-dir attack spark + tight swing).
// - Side weapons never go “behind” (force pure E/W on side view).
// - Weapons a little bigger (small bump) via held-item lengths.
//
// KEY IDEA:
// - BODY facing (4-dir sprite) uses RAW fy (so S=front, W=back).
// - ATTACK direction (8-dir) uses flipped fy (so diagonals feel right for attacks).
//   This keeps walking correct AND keeps punch direction feeling correct.

export class Player {
  constructor(){
    this._lastX = 0;
    this._lastY = 0;
    this._lastT = 0;

    this._blinkNext = 1.6;
    this._blinkHold = 0;

    this._step = 0;

    // Body facing (4-dir sprite)
    this._face4 = "S";
    // Attack direction (8-dir)
    this._atk8 = "S";
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

    // BODY: raw (so S shows front, W shows back)
    this._face4 = this._faceDir4(fx, fy);
    // ATTACK: flipped (so diagonals for aiming/punch feel right)
    this._atk8  = this._faceDir8(fx, fy);
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

    const punching = p.punchT > 0;
    const acting = punching || (p.jumpT > 0) || (p.dodgeT > 0);

    // Update facing only with intent (prevents twitch)
    const fxRaw = p.faceX || 0;
    const fyRaw = p.faceY || 0;
    if (Math.abs(fxRaw) + Math.abs(fyRaw) > 0.25){
      // BODY: raw
      this._face4 = this._faceDir4(fxRaw, fyRaw);
      // ATTACK: flipped
      this._atk8  = this._faceDir8(fxRaw, fyRaw);
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

    const cx = p.x + p.w/2;
    const feetY = p.y + p.h + 2;

    // tiny idle breathe only
    const bob = (!moving && !acting) ? (Math.sin(now * 0.0017) * 0.25) : 0;

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

    const stride = moving ? (running ? 2 : 1) : 0;

    const isNS = (face4 === "N" || face4 === "S");
    const isEW = (face4 === "E" || face4 === "W");

    let lfX = 0, lfY = 0, rfX = 0, rfY = 0;

    if (moving && !acting){
      if (isNS){
        const spread = stride;
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

    // hip shift
    let hipX = 0, hipY = 0;
    if (moving && !acting){
      if (isNS) hipX = stepA ? 1 : stepB ? -1 : 0;
      else     hipY = stepA ? 1 : stepB ? -1 : 0;
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
    const twoHanded = !!(typeof held === "object" && held?.twoHanded);

    // draw body by 4-dir sprite
    if (face4 === "S"){
      this._drawFront(P, C, { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded, atkVec });
    } else if (face4 === "N"){
      this._drawBack(P, C,  { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded, atkVec });
    } else if (face4 === "E"){
      this._drawSide(P, C,  { dir:"E", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded, atkVec });
    } else {
      this._drawSide(P, C,  { dir:"W", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded, atkVec });
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
    const { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded, atkVec } = s;

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
        this._drawHeldItem(P, C, held, atkVec, Rhand, true, false, Lhand);
      }
    } else {
      // lead = right
      const leadHand = Rhand;
      const followHand = Lhand;

      this._drawSwingArm(P, C, Rshould, leadHand, swing.lead);
      this._drawSwingArm(P, C, Lshould, followHand, swing.follow);

      if (held){
        const leadTip = { x: leadHand.x + swing.lead.tipOff.dx, y: leadHand.y + swing.lead.tipOff.dy };
        this._drawHeldItem(P, C, held, atkVec, leadTip, true, twoHanded, followHand);

        if (twoHanded){
          const followTip = { x: followHand.x + swing.follow.tipOff.dx, y: followHand.y + swing.follow.tipOff.dy };
          this._plotLine(P, followTip, leadTip, C.wood);
        }
      }
    }

    // PANTS
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

    // LEGS + SOCKS
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

    // SHOES
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
  }

  // =========================
  // BACK (N)
  // =========================
  _drawBack(P, C, s){
    const { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded, atkVec } = s;
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
        this._drawHeldItem(P, C, held, atkVec, Rhand, true, false, Lhand);
      }
    } else {
      // lead = left
      const leadHand = Lhand;
      const followHand = Rhand;

      this._drawSwingArm(P, C, Lshould, leadHand, swing.lead);
      this._drawSwingArm(P, C, Rshould, followHand, swing.follow);

      if (held){
        const leadTip = { x: leadHand.x + swing.lead.tipOff.dx, y: leadHand.y + swing.lead.tipOff.dy };
        this._drawHeldItem(P, C, held, atkVec, leadTip, true, twoHanded, followHand);

        if (twoHanded){
          const followTip = { x: followHand.x + swing.follow.tipOff.dx, y: followHand.y + swing.follow.tipOff.dy };
          this._plotLine(P, followTip, leadTip, C.wood);
        }
      }
    }

    // pants + legs
    [
      [5,12],[6,12],[7,12],[8,12],[9,12],[10,12],
      [5,13],[6,13],[7,13],[8,13],[9,13],[10,13],
    ].forEach(([x,y])=>P(x+bx,y+by,C.pants));
    [ [9,13],[10,13],[10,12] ].forEach(([x,y])=>P(x+bx,y+by,C.navy));

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
  }

  // =========================
  // SIDE (E/W)
  // Key: held direction forced to pure E/W so it stays in front.
  // =========================
  _drawSide(P, C, s){
    const { dir, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded } = s;
    const bx = hipX, by = hipY;
    const flip = (x) => dir === "E" ? x : (15 - x);

    // HAIR
    [
      [6,0],[7,0],[8,0],
      [5,1],[6,1],[7,1],[8,1],[9,1],
      [5,2],[6,2],[7,2],[8,2],[9,2],
      [5,3],[6,3],[7,3],[8,3],[9,3],
      [5,4],[9,4],
      [4,3],[4,4],
      [10,2],[10,3]
    ].forEach(([x,y])=>P(flip(x),y,C.hair));

    // FACE
    [
      [7,3],[8,3],[9,3],
      [7,4],[8,4],[9,4],
      [7,5],[8,5],[9,5],
      [7,6],[8,6],
    ].forEach(([x,y])=>P(flip(x),y,C.skin));
    P(flip(9),5,C.navy);

    // BODY
    [
      [6,7],[7,7],[8,7],[9,7],
      [5,8],[6,8],[7,8],[8,8],[9,8],
      [5,9],[6,9],[7,9],[8,9],[9,9],
      [5,10],[6,10],[7,10],[8,10],[9,10],
      [6,11],[7,11],[8,11],[9,11],
    ].forEach(([x,y])=>P(flip(x+bx),y+by,C.shirt2));

    P(flip(5+bx),9+by,C.tealS);
    P(flip(6+bx),9+by,C.teal);

    const aOff = (dir === "E") ? lArmOff : rArmOff;
    const hand =   { x: 4+bx, y: 13+by + aOff };
    const should = { x: 5+bx, y: 11+by + aOff };

    const Pf = (ix,iy,col)=>P(flip(ix),iy,col);

    // FORCE side weapon direction so it never goes “behind”
    const sideVec = (dir === "E") ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 };

    if (!punching){
      Pf(4+bx, 11+by + aOff, C.shirt2);
      Pf(4+bx, 12+by + aOff, C.shirt1);
      Pf(hand.x, hand.y, C.skin);

      if (held){
        this._drawHeldItem(Pf, C, held, sideVec, { x: hand.x, y: hand.y }, true, twoHanded);
      }
    } else {
      const swingLead = (dir === "W") ? this._mirrorSwingOne(swing.lead) : swing.lead;

      const shoulder = { x: should.x, y: should.y + 1 };
      const mid =      { x: hand.x + swingLead.midOff.dx, y: hand.y + swingLead.midOff.dy };
      const tip =      { x: hand.x + swingLead.tipOff.dx, y: hand.y + swingLead.tipOff.dy };

      this._plotLine(Pf, shoulder, mid, C.shirt2);
      this._plotLine(Pf, mid, tip, C.shirt2);

      Pf(mid.x, mid.y, C.shirt1);
      Pf(tip.x, tip.y, C.skin);

      if (held){
        this._drawHeldItem(Pf, C, held, sideVec, tip, true, twoHanded);
      }
    }

    // PANTS
    [
      [6,12],[7,12],[8,12],[9,12],
      [6,13],[7,13],[8,13],[9,13]
    ].forEach(([x,y])=>P(flip(x+bx),y+by,C.pants));
    P(flip(9+bx),13+by,C.navy);

    // LEGS
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

    // SHOE
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

  // =========================
  // SWING (tight)
  // =========================
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

  // =========================
  // HELD ITEM (short + close) + slightly bigger
  // =========================
  _drawHeldItem(P, C, held, dirVec, hand, tight=true, twoHanded=false, otherHand=null){
    const type = (typeof held === "string") ? held : (held?.type || "tool");
    const tint = (typeof held === "object" && held?.tint) ? held.tint : null;

    const dx = Math.sign(dirVec.dx);
    const dy = Math.sign(dirVec.dy);

    // Slightly UP so it doesn't cover feet as much
    const origin = { x: hand.x + dx, y: hand.y + dy - 1 };

    // BUMP sizes a bit (your request)
    const baseLen =
      (type === "bat") ? 4 :
      (type === "knife") ? 3 :
      (type === "gun") ? 3 :
      3;

    const len = twoHanded ? baseLen + 1 : baseLen;

    if (type === "knife"){
      P(origin.x, origin.y, C.wood);
      for (let i=1;i<=len;i++){
        P(origin.x + dx*i, origin.y + dy*i, tint || C.steel);
      }
      P(origin.x + dx*len + (dy!==0?1:0), origin.y + dy*len + (dx!==0?1:0), C.white);

    } else if (type === "bat"){
      for (let i=0;i<=len;i++){
        P(origin.x + dx*i, origin.y + dy*i, C.wood);
      }

    } else if (type === "gun"){
      // small but clearer gun
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
    }
  }

  // =========================
  // DIRECTION HELPERS
  // BODY uses RAW fy (fixes your walk facing)
  // ATTACK uses flipped fy (keeps your diagonal “feel” for punching)
  // =========================
  _faceDir4(fx, fy){
    // S (fy >= 0) => FRONT sprite. N (fy < 0) => BACK sprite.
    if (Math.abs(fx) > Math.abs(fy)) return fx >= 0 ? "E" : "W";
    return fy >= 0 ? "S" : "N";
  }

  _faceDir8(fx, fy){
    const fy2 = -fy; // flip ONLY for attack direction

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
    return { dx: -1, dy: 1 }; // SW
  }

  // =========================
  // PUNCH SPARK (8-way)
  // =========================
  _drawPunchSpark(ctx, p, v, swingP){
    const cx = p.x + p.w/2;
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
