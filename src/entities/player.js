// src/entities/player.js
// NPC City Player — Reference Sprite Skeleton v10 (pure pixels, no images)
//
// Fixes in v10:
// - Side punch direction now matches facing (E punches right, W punches left) ✅
// - Punch reach reduced (less extension) ✅
// - Slight “body kick” + sharper spark streak for impact ✅
// - Keeps: Pokemon-ish walk, blink, held items, two-handed option ✅

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

    // PUNCH SWING progress
    let swingP = 0;
    if (punching){
      const t = Math.max(0, Math.min(1, p.punchT)); // 1..0 in your game
      swingP = 1 - t;
    }

    // directional kick for “impact”
    const dir = this._dirVec(face);
    const hitKick = punching ? this._hitKick(swingP) : 0;
    const kickX = dir.dx * hitKick;
    const kickY = dir.dy * hitKick;

    let sx = Math.round(cx - W/2) + kickX;
    let sy = Math.round(feetY - H - (p.z || 0) + bob) + kickY;

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

    // WALK OFFSETS (NO THRUST)
    const isNS = (face === "N" || face === "S");
    const isEW = (face === "E" || face === "W");

    let lfX = 0, lfY = 0, rfX = 0, rfY = 0;

    if (moving && !acting){
      if (isNS){
        const spread = stride;
        lfX = stepA ? -spread : stepB ? spread : 0;
        rfX = stepA ?  spread : stepB ? -spread : 0;
        // tiny lift
        lfY = stepA ? -1 : 0;
        rfY = stepB ? -1 : 0;
      } else if (isEW){
        const lift = 1;
        lfY = stepA ? -lift : stepB ? lift : 0;
        rfY = stepA ?  lift : stepB ? -lift : 0;

        // run-only tiny nudge (keeps side from feeling frozen)
        const nudge = running ? 1 : 0;
        if (face === "E"){ lfX = stepA ? nudge : 0; rfX = stepB ? nudge : 0; }
        if (face === "W"){ lfX = stepA ? -nudge : 0; rfX = stepB ? -nudge : 0; }
      }
    }

    // hip shift: perpendicular only
    let hipX = 0, hipY = 0;
    if (moving && !acting){
      if (isNS) hipX = stepA ? 1 : stepB ? -1 : 0;
      else     hipY = stepA ? 1 : stepB ? -1 : 0;
    }

    // walk arm swing (both arms go back/forth)
    const armSwing = (moving && !acting) ? 1 : 0;
    const lArmOff = stepA ? -armSwing : stepB ? armSwing : 0;
    const rArmOff = stepA ?  armSwing : stepB ? -armSwing : 0;

    const perp = { dx: -dir.dy, dy: dir.dx };
    const swing = this._swingOffsets(swingP, dir, perp); // {lead, follow}

    // HELD ITEM: ONLY show if p.held is set
    const held = p.held ?? null;
    const twoHanded = !!(typeof held === "object" && held?.twoHanded);

    // Route draw by facing
    if (face === "S"){
      this._drawFront(P, C, { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded });
    } else if (face === "N"){
      this._drawBack(P, C,  { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded });
    } else if (face === "E"){
      this._drawSide(P, C,  { dir:"E", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded });
    } else {
      this._drawSide(P, C,  { dir:"W", hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded });
    }

    if (punching){
      this._drawPunchSpark(ctx, p, face, swingP);
    }
  }

  // =========================
  // FRONT (S)
  // =========================
  _drawFront(P, C, s){
    const { blinking, hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded } = s;

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

    // ARMS
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
        this._drawHeldItem(P, C, held, "S", Rhand, twoHanded, Lhand);
      }
    } else {
      // lead = right for S
      const leadHand = Rhand;
      const followHand = Lhand;

      this._drawSwingArm(P, C, Rshould, leadHand, swing.lead);
      this._drawSwingArm(P, C, Lshould, followHand, swing.follow);

      if (held){
        const leadTip = { x: leadHand.x + swing.lead.tipOff.dx, y: leadHand.y + swing.lead.tipOff.dy };
        this._drawHeldItem(P, C, held, "S", leadTip, twoHanded, followHand);

        if (twoHanded){
          const followTip = { x: followHand.x + swing.follow.tipOff.dx, y: followHand.y + swing.follow.tipOff.dy };
          this._plotLine(P, { ...C }, followTip, leadTip, C.wood);
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
    const { hipX, hipY, lfX, lfY, rfX, rfY, lArmOff, rArmOff, punching, swing, held, twoHanded } = s;
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

    // STRAPS (back)
    [ [5,8],[5,9],[5,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    [ [10,8],[10,9],[10,10] ].forEach(([x,y])=>P(x+bx,y+by,C.tealS));
    P(3+bx,9+by,C.tealS);
    P(12+bx,9+by,C.tealS);

    // HAND ANCHORS
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
        this._drawHeldItem(P, C, held, "N", Rhand, twoHanded, Lhand);
      }
    } else {
      // lead = left for N
      const leadHand = Lhand;
      const followHand = Rhand;

      this._drawSwingArm(P, C, Lshould, leadHand, swing.lead);
      this._drawSwingArm(P, C, Rshould, followHand, swing.follow);

      if (held){
        const leadTip = { x: leadHand.x + swing.lead.tipOff.dx, y: leadHand.y + swing.lead.tipOff.dy };
        this._drawHeldItem(P, C, held, "N", leadTip, twoHanded, followHand);

        if (twoHanded){
          const followTip = { x: followHand.x + swing.follow.tipOff.dx, y: followHand.y + swing.follow.tipOff.dy };
          this._plotLine(P, { ...C }, followTip, leadTip, C.wood);
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
  // SIDE (E/W) — fixed so W punches LEFT (no double mirror)
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

    // strap hint
    P(flip(5+bx),9+by,C.tealS);
    P(flip(6+bx),9+by,C.teal);

    // Arm anchors (profile)
    const aOff = (dir === "E") ? lArmOff : rArmOff;
    const hand =   { x: 4+bx, y: 13+by + aOff };
    const should = { x: 5+bx, y: 11+by + aOff };

    if (!punching){
      P(flip(4+bx), 11+by + aOff, C.shirt2);
      P(flip(4+bx), 12+by + aOff, C.shirt1);
      P(flip(hand.x), hand.y, C.skin);

      if (held){
        this._drawHeldItem((ix,iy,col)=>P(flip(ix),iy,col), C, held, dir, { x: hand.x, y: hand.y }, twoHanded);
      }
    } else {
      // KEY FIX:
      // For dir="W", the sprite X is flipped at draw time, so we must mirror the SWING OFFSETS
      // (otherwise W becomes “double mirrored” and punches the wrong way).
      const swingLead = (dir === "W") ? this._mirrorSwingOne(swing.lead) : swing.lead;

      const shoulder = { x: should.x, y: should.y + 1 };
      const mid =      { x: hand.x + swingLead.midOff.dx, y: hand.y + swingLead.midOff.dy };
      const tip =      { x: hand.x + swingLead.tipOff.dx, y: hand.y + swingLead.tipOff.dy };

      this._plotLine((ix,iy,col)=>P(flip(ix),iy,col), { ...C }, shoulder, mid, C.shirt2);
      this._plotLine((ix,iy,col)=>P(flip(ix),iy,col), { ...C }, mid, tip, C.shirt2);

      // thickness shade
      P(flip(mid.x), mid.y, C.shirt1);
      // fist
      P(flip(tip.x), tip.y, C.skin);

      if (held){
        this._drawHeldItem((ix,iy,col)=>P(flip(ix),iy,col), C, held, dir, tip, twoHanded);
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
  // SWING MATH (reduced reach)
  // =========================
  _dirVec(face){
    if (face === "E") return { dx: 1, dy: 0 };
    if (face === "W") return { dx: -1, dy: 0 };
    if (face === "N") return { dx: 0, dy: -1 };
    return { dx: 0, dy: 1 };
  }

  _swingOffsets(p, dir, perp){
    p = Math.max(0, Math.min(1, p));

    const windEnd = 0.22;
    const hitEnd  = 0.62;

    // Reduced punch reach (was 6/3)
    const reach = 4;
    const arc   = 2;

    let leadTip = { dx: 0, dy: 0 };
    let leadMid = { dx: 0, dy: 0 };

    if (p < windEnd){
      const t = p / windEnd;
      const back = Math.round((1 - t) * 2);
      const side = Math.round((1 - t) * 1);
      leadTip = { dx: -dir.dx * back - perp.dx * side, dy: -dir.dy * back - perp.dy * side };
      leadMid = { dx: Math.round(leadTip.dx * 0.6), dy: Math.round(leadTip.dy * 0.6) };
    } else if (p < hitEnd){
      const t = (p - windEnd) / (hitEnd - windEnd);
      const f = Math.round(t * reach);
      const s = Math.round(Math.sin(t * Math.PI) * arc);
      leadTip = { dx: dir.dx * f + perp.dx * s, dy: dir.dy * f + perp.dy * s };
      leadMid = {
        dx: Math.round(dir.dx * (f * 0.55) + perp.dx * (s * 0.65)),
        dy: Math.round(dir.dy * (f * 0.55) + perp.dy * (s * 0.65))
      };
    } else {
      const t = (p - hitEnd) / (1 - hitEnd);
      const f = Math.round(reach * (1 - 0.45*t));
      const s = Math.round((1 - t) * 1);
      leadTip = { dx: dir.dx * f + perp.dx * s, dy: dir.dy * f + perp.dy * s };
      leadMid = {
        dx: Math.round(dir.dx * (f * 0.55) + perp.dx * (s * 0.55)),
        dy: Math.round(dir.dy * (f * 0.55) + perp.dy * (s * 0.55))
      };
    }

    const followTip = { dx: Math.round(leadTip.dx * 0.55), dy: Math.round(leadTip.dy * 0.55) };
    const followMid = { dx: Math.round(leadMid.dx * 0.55), dy: Math.round(leadMid.dy * 0.55) };

    return {
      lead:   { tipOff: leadTip,   midOff: leadMid   },
      follow: { tipOff: followTip, midOff: followMid }
    };
  }

  _mirrorSwingOne(one){
    // mirror X only (for side-view W)
    return {
      tipOff: { dx: -one.tipOff.dx, dy: one.tipOff.dy },
      midOff: { dx: -one.midOff.dx, dy: one.midOff.dy }
    };
  }

  _hitKick(swingP){
    // tiny kick only during the “hit” window
    if (swingP > 0.28 && swingP < 0.62) return 1;
    return 0;
  }

  _drawSwingArm(P, C, shoulder, handBase, swingOne){
    const mid = { x: handBase.x + swingOne.midOff.dx, y: handBase.y + swingOne.midOff.dy };
    const tip = { x: handBase.x + swingOne.tipOff.dx, y: handBase.y + swingOne.tipOff.dy };

    this._plotLine(P, { ...C }, shoulder, mid, C.shirt2);
    this._plotLine(P, { ...C }, mid, tip, C.shirt2);

    P(mid.x, mid.y, C.shirt1);
    P(tip.x, tip.y, C.skin);
  }

  _plotLine(P, C, a, b, col){
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
  // HELD ITEM DRAW
  // =========================
  _drawHeldItem(P, C, held, faceOrDir, hand, twoHanded=false, otherHand=null){
    const type = (typeof held === "string") ? held : (held?.type || "tool");
    const tint = (typeof held === "object" && held?.tint) ? held.tint : null;

    const face = faceOrDir;
    let dx = 0, dy = 0;
    if (face === "E"){ dx = 1; dy = 0; }
    else if (face === "W"){ dx = -1; dy = 0; }
    else if (face === "N"){ dx = 0; dy = -1; }
    else { dx = 0; dy = 1; }

    const origin = { x: hand.x + dx, y: hand.y + dy };
    const len = twoHanded ? 5 : 3;

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
    } else if (type === "wrench" || type === "tool"){
      P(origin.x, origin.y, C.steelS);
      for (let i=1;i<=len;i++){
        P(origin.x + dx*i, origin.y + dy*i, tint || C.steel);
      }
      P(origin.x + dx*len + (dy!==0?1:0), origin.y + dy*len + (dx!==0?1:0), C.steelS);
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

  // =========================
  // MISC
  // =========================
  _faceDir(fx, fy){
    if (Math.abs(fx) > Math.abs(fy)) return fx >= 0 ? "E" : "W";
    return fy >= 0 ? "S" : "N";
  }

  _drawPunchSpark(ctx, p, face, swingP){
    const cx = p.x + p.w/2;
    const cy = p.y + p.h/2 - (p.z || 0);

    const d = this._dirVec(face);

    // push spark out in front, not a perfect circle
    const ox = d.dx * 18;
    const oy = d.dy * 18;

    // only really “flash” during hit window
    const hot = (swingP > 0.28 && swingP < 0.66) ? 1 : 0.5;

    ctx.save();
    ctx.globalAlpha = 0.75 * hot;
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 2;

    // streak
    ctx.beginPath();
    ctx.moveTo(cx + ox, cy + oy);
    ctx.lineTo(cx + ox + d.dx * 14, cy + oy + d.dy * 14);
    ctx.stroke();

    // tiny cross-spark
    ctx.globalAlpha = 0.55 * hot;
    ctx.beginPath();
    ctx.moveTo(cx + ox - d.dy * 6, cy + oy + d.dx * 6);
    ctx.lineTo(cx + ox + d.dy * 6, cy + oy - d.dx * 6);
    ctx.stroke();

    // small ring (subtle, not dominant)
    ctx.globalAlpha = 0.20 * hot;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, 7, 0, Math.PI*2);
    ctx.stroke();

    ctx.restore();
  }
}
