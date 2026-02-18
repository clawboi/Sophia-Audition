export class Game {
  constructor({ canvas, ctx, input, save, ui, assets, world }){
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;
    this.save = save;
    this.ui = ui;
    this.assets = assets;
    this.world = world;

    this.state = "menu"; // menu | play
    this.lastT = 0;

    this.player = {
      role: "actor",
      x: 0, y: 0,
      w: 18, h: 18,

      // facing direction (used for dodge/punch)
      faceX: 0, faceY: 1,

      // action state
      z: 0,          // jump height (visual)
      jumpT: 0,
      dodgeT: 0,
      dodgeCd: 0,
      punchT: 0,
      punchCd: 0,
      iFrames: 0,    // invulnerability window (for later combat)

      stamina: 100,
      staminaMax: 100,

      money: 40,
      area: "",

      // --- animation state (purely visual) ---
      animPhase: 0,      // walk cycle phase
      moveAmt: 0,        // 0..1 (how much you're moving)
      runAmt: 0,         // 0..1 (how much you're running)
      blinkTimer: 2.2,   // seconds until next blink
      blinkHold: 0,      // blink duration
    };

    this.camera = {
      x: 0, y: 0,
      vw: canvas.width,
      vh: canvas.height,
    };

    // FX
    this.fx = []; // {t, dur, type, ...}

    // UI hooks
    ui.onStart = (role) => this.startNew(role);
    ui.onContinue = () => this.continueGame();
    ui.onNew = () => this.newGameMenu();
  }

  boot(){
    const existing = this.save.load();
    this.ui.renderMenu({ hasSave: !!existing });
    requestAnimationFrame((t)=>this.loop(t));
  }

  newGameMenu(){
    const existing = this.save.load();
    this.ui.renderMenu({ hasSave: !!existing });
    this.state = "menu";
  }

  startNew(role){
    const spawn = this.world.getSpawn(role);
    this.player.role = role;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.money = role === "police" ? 120 : (role === "actor" ? 60 : 30);
    this.player.area = spawn.area;

    // reset actions
    this.player.faceX = 0; this.player.faceY = 1;
    this.player.z = 0;
    this.player.jumpT = 0;
    this.player.dodgeT = 0;
    this.player.dodgeCd = 0;
    this.player.punchT = 0;
    this.player.punchCd = 0;
    this.player.iFrames = 0;
    this.player.stamina = this.player.staminaMax;

    // reset visuals
    this.player.animPhase = 0;
    this.player.moveAmt = 0;
    this.player.runAmt = 0;
    this.player.blinkTimer = 2.0 + Math.random()*2.5;
    this.player.blinkHold = 0;

    this.fx.length = 0;

    this.state = "play";
    this.ui.hideMenu();
    this.persist();
  }

  continueGame(){
    const data = this.save.load();
    if (!data) return this.newGameMenu();
    this.player = { ...this.player, ...data.player };

    // safety: ensure action fields exist for older saves
    this.player.faceX ??= 0; this.player.faceY ??= 1;
    this.player.z ??= 0;
    this.player.jumpT ??= 0;
    this.player.dodgeT ??= 0;
    this.player.dodgeCd ??= 0;
    this.player.punchT ??= 0;
    this.player.punchCd ??= 0;
    this.player.iFrames ??= 0;
    this.player.staminaMax ??= 100;
    this.player.stamina = clamp(this.player.stamina ?? this.player.staminaMax, 0, this.player.staminaMax);

    // safety: visuals
    this.player.animPhase ??= 0;
    this.player.moveAmt ??= 0;
    this.player.runAmt ??= 0;
    this.player.blinkTimer ??= 2.0 + Math.random()*2.5;
    this.player.blinkHold ??= 0;

    this.state = "play";
    this.ui.hideMenu();
  }

  persist(){
    this.save.write({
      v: 2,
      player: {
        role: this.player.role,
        x: this.player.x,
        y: this.player.y,
        money: this.player.money,
        area: this.player.area,
        stamina: this.player.stamina,
        staminaMax: this.player.staminaMax,
        faceX: this.player.faceX,
        faceY: this.player.faceY,
      }
    });
  }

  loop(t){
    const dt = Math.min(0.033, (t - this.lastT) / 1000 || 0.016);
    this.lastT = t;

    this.update(dt);
    this.render();

    this.input.endFrame();
    requestAnimationFrame((tt)=>this.loop(tt));
  }

  update(dt){
    if (this.state !== "play") return;

    // timers
    this.player.dodgeCd = Math.max(0, this.player.dodgeCd - dt);
    this.player.punchCd = Math.max(0, this.player.punchCd - dt);
    this.player.iFrames = Math.max(0, this.player.iFrames - dt);

    // stamina regen (slow while acting)
    const acting = (this.player.dodgeT > 0) || (this.player.punchT > 0) || (this.player.jumpT > 0);
    const regen = acting ? 12 : 22;
    this.player.stamina = clamp(this.player.stamina + regen * dt, 0, this.player.staminaMax);

    // Reset spawn quick dev key
    if (this.input.pressed("r")){
      const sp = this.world.getSpawn(this.player.role);
      this.player.x = sp.x;
      this.player.y = sp.y;
      this.player.area = sp.area;
      this.persist();
      this.ui.toast?.("Reset spawn");
    }

    // ===== INPUT AXIS + FACING =====
    const a = this.input.axis();
    let ax = a.x, ay = a.y;
    const amag = Math.hypot(ax, ay);
    if (amag > 0){
      ax /= amag; ay /= amag;
      // update facing (only when you actually move)
      this.player.faceX = ax;
      this.player.faceY = ay;
    }

    // ===== ACTIONS =====
    // Controls:
    //   Shift: run
    //   Space: jump (visual)
    //   C: dodge
    //   F: punch
    //   E: interact

    // Jump (visual hop with shadow squash)
    if (this.input.pressed(" ") && this.player.jumpT <= 0){
      const cost = 12;
      if (this.player.stamina >= cost){
        this.player.stamina -= cost;
        this.player.jumpT = 0.28;
        this.fx.push({ type:"poof", x:this.player.x+this.player.w/2, y:this.player.y+this.player.h+6, t:0, dur:0.22 });
      }
    }

    // Dodge (burst in facing direction)
    if (this.input.pressed("c") && this.player.dodgeCd <= 0 && this.player.dodgeT <= 0){
      const cost = 22;
      if (this.player.stamina >= cost){
        this.player.stamina -= cost;
        this.player.dodgeT = 0.18;
        this.player.dodgeCd = 0.40;
        this.player.iFrames = 0.22;
        this.fx.push({ type:"dash", x:this.player.x+this.player.w/2, y:this.player.y+this.player.h/2, t:0, dur:0.18, dx:this.player.faceX, dy:this.player.faceY });
      }
    }

    // Punch (short swing, for now just visual)
    if (this.input.pressed("f") && this.player.punchCd <= 0 && this.player.punchT <= 0){
      const cost = 10;
      if (this.player.stamina >= cost){
        this.player.stamina -= cost;
        this.player.punchT = 0.12;
        this.player.punchCd = 0.18;
      }
    }

    // Interact prompt (near landmarks)
    const lm = this.world.nearestLandmark?.(
      this.player.x + this.player.w/2,
      this.player.y + this.player.h/2,
      62
    );
    if (lm){
      this.ui.setPrompt?.(`E · ${lm.text}  ·  ${lm.hint || "Interact"}`);
      if (this.input.pressed("e")){
        this.handleInteract(lm);
      }
    } else {
      this.ui.setPrompt?.("");
    }

    // ===== MOVEMENT =====
    // if dodging, override movement with burst
    let dx = 0, dy = 0;

    if (this.player.dodgeT > 0){
      this.player.dodgeT = Math.max(0, this.player.dodgeT - dt);
      const spd = 520;
      dx = this.player.faceX * spd * dt;
      dy = this.player.faceY * spd * dt;
    } else {
      // normal movement
      const run = this.input.down("shift");
      const speed = run ? 220 : 150;

      // slight slowdown while punching/jumping
      const slow = (this.player.punchT > 0) ? 0.55 : (this.player.jumpT > 0 ? 0.85 : 1.0);
      dx = ax * speed * slow * dt;
      dy = ay * speed * slow * dt;

      // --- animation intensity ---
      const moving = amag > 0.02;
      const targetMove = moving ? 1 : 0;
      const targetRun  = (moving && run) ? 1 : 0;
      this.player.moveAmt = lerp(this.player.moveAmt, targetMove, 0.18);
      this.player.runAmt  = lerp(this.player.runAmt, targetRun, 0.18);

      // walk cycle speed
      const cycleSpd = moving ? (run ? 14.0 : 9.5) : 0;
      this.player.animPhase = (this.player.animPhase + cycleSpd * dt) % (Math.PI * 2);
    }

    // tick action timers
    if (this.player.punchT > 0) this.player.punchT = Math.max(0, this.player.punchT - dt);
    if (this.player.jumpT > 0) this.player.jumpT = Math.max(0, this.player.jumpT - dt);

    // apply jump curve (visual)
    if (this.player.jumpT > 0){
      const p = 1 - (this.player.jumpT / 0.28);
      this.player.z = Math.sin(p * Math.PI) * 10;
    } else {
      this.player.z = 0;
    }

    // Blink timing (alive!)
    if (this.player.blinkHold > 0){
      this.player.blinkHold = Math.max(0, this.player.blinkHold - dt);
    } else {
      this.player.blinkTimer -= dt;
      if (this.player.blinkTimer <= 0){
        this.player.blinkHold = 0.11; // quick blink
        this.player.blinkTimer = 1.8 + Math.random()*3.4;
      }
    }

    // Collide per-axis for smooth sliding
    this.moveWithCollision(dx, 0);
    this.moveWithCollision(0, dy);

    // Clamp to world bounds
    this.player.x = clamp(this.player.x, 0, this.world.w - this.player.w);
    this.player.y = clamp(this.player.y, 0, this.world.h - this.player.h);

    // Camera follow (smooth, then pixel-snap to stop shimmer)
    const targetX = this.player.x + this.player.w * 0.5 - this.camera.vw * 0.5;
    const targetY = this.player.y + this.player.h * 0.5 - this.camera.vh * 0.5;

    const clampedX = clamp(targetX, 0, this.world.w - this.camera.vw);
    const clampedY = clamp(targetY, 0, this.world.h - this.camera.vh);

    // Smooth follow
    this.camera.x = lerp(this.camera.x, clampedX, 0.12);
    this.camera.y = lerp(this.camera.y, clampedY, 0.12);

    // Pixel-snap (kills the “static/shaky” look)
    this.camera.x = Math.round(this.camera.x);
    this.camera.y = Math.round(this.camera.y);

    // Determine area name (simple rule: based on regions)
    this.player.area = this.getAreaName(this.player.x, this.player.y, this.player.role);

    // HUD
    this.ui.setHUD({
      role: this.player.role,
      area: this.player.area,
      money: this.player.money,
      stamina: this.player.stamina,
      staminaMax: this.player.staminaMax
    });

    // FX tick
    for (const f of this.fx){
      f.t += dt;
    }
    this.fx = this.fx.filter(f => f.t < f.dur);

    // Autosave (light)
    this._saveTimer = (this._saveTimer || 0) + dt;
    if (this._saveTimer > 1.5){
      this._saveTimer = 0;
      this.persist();
    }
  }

  handleInteract(lm){
    // Tiny “placeholder interactions” so the city feels alive immediately.
    switch (lm.id){
      case "bodega":
        this.ui.toast?.("Bodega: snacks + items coming soon");
        break;
      case "studio":
        this.ui.toast?.("Studio Gate: auditions coming soon");
        break;
      case "police_hq":
        this.ui.toast?.("Police HQ: jobs + heat system coming soon");
        break;
      case "bus_stop":
        this.ui.toast?.("Bus Stop: fast travel coming soon");
        break;
      default:
        this.ui.toast?.(lm.text);
    }
  }

  moveWithCollision(dx, dy){
    if (!dx && !dy) return;
    const next = {
      x: this.player.x + dx,
      y: this.player.y + dy,
      w: this.player.w,
      h: this.player.h
    };
    if (!this.world.hitsSolid(next)){
      this.player.x = next.x;
      this.player.y = next.y;
      return;
    }
    // If collision, try smaller step to avoid “sticky” feel
    const steps = 6;
    for (let i=1; i<=steps; i++){
      const sx = dx * (i/steps);
      const sy = dy * (i/steps);
      const test = { x: this.player.x + sx, y: this.player.y + sy, w:this.player.w, h:this.player.h };
      if (!this.world.hitsSolid(test)){
        this.player.x = test.x;
        this.player.y = test.y;
      } else {
        break;
      }
    }
  }

  getAreaName(x,y,role){
    if (y > 1080) return "South Side";
    if (x > 1850 && y > 720) return "Civic District";
    if (y < 700 && x > 980 && x < 1780) return "Studio Row";
    if (x < 900 && y < 760) return "Midtown";
    return "Crossroads";
  }

  render(){
    const ctx = this.ctx;

    // World
    this.world.draw(ctx, this.camera);

    // Entities + FX
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // FX under player
    for (const f of this.fx){
      if (f.type === "poof"){
        const p = f.t / f.dur;
        ctx.globalAlpha = (1 - p) * 0.35;
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, 6 + p*12, 3 + p*6, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (f.type === "dash"){
        const p = f.t / f.dur;
        ctx.globalAlpha = (1 - p) * 0.25;
        ctx.strokeStyle = "rgba(138,46,255,.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(f.x - f.dx*28*p, f.y - f.dy*28*p);
        ctx.lineTo(f.x - f.dx*28*(p+0.25), f.y - f.dy*28*(p+0.25));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Shadow (squash when jumping)
    const shadowScale = this.player.jumpT > 0 ? 0.78 : 1;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(
      this.player.x + this.player.w/2,
      this.player.y + this.player.h + 5,
      12 * shadowScale,
      6 * shadowScale,
      0, 0, Math.PI*2
    );
    ctx.fill();

    // lift for punch ring etc.
    const liftY = -this.player.z;

    // Draw player (cute dark ghibli x zelda girl)
    drawPlayerNPCGirl(ctx, this.player);

    // Punch ring (visual)
    if (this.player.punchT > 0){
      const fx = this.player.faceX || 0;
      const fy = this.player.faceY || 1;
      const cx = this.player.x + this.player.w/2 + fx*16;
      const cy = this.player.y + this.player.h/2 + fy*16 + liftY;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // above-layer props (tree canopies, etc.)
    this.world.drawAbove?.(ctx, this.camera);

    ctx.restore();
  }
}

// ===== PLAYER SPRITE: NPC Girl (Studio Ghibli x Zelda, cute but dark) =====
// No images. All pixel blocks. Animated: arms + legs + blink + breathing.
// Bigger on screen by design (sprite is larger than collider).

function drawPlayerNPCGirl(ctx, p){
  // Bigger scale than before
  const px = 3;              // 3px per sprite pixel (bigger, cuter)
  const SW = 18 * px;        // sprite width
  const SH = 26 * px;        // sprite height

  const cx = p.x + p.w/2;
  const feetY = p.y + p.h + 3;
  const sx = Math.round(cx - SW/2);
  const sy = Math.round(feetY - SH - (p.z || 0));

  // Alive motion
  const t = performance.now() * 0.0022;
  const breathe = (p.moveAmt > 0.12 || p.jumpT > 0 || p.dodgeT > 0) ? 0 : Math.round(Math.sin(t) * 1);
  const y = sy + breathe;

  // Walk/run cycle
  const phase = p.animPhase || 0;
  const move = clamp(p.moveAmt || 0, 0, 1);
  const run = clamp(p.runAmt || 0, 0, 1);
  const swing = Math.sin(phase);

  // Direction hint (turn head slightly)
  const fx = p.faceX || 0;
  const headTurn = Math.round(clamp(fx, -1, 1) * 1); // -1..1 px shift

  // Palettes: "cute dark"
  const outline = "rgba(8,8,16,.55)";
  const skin    = "#f2c8b0";
  const blush   = "rgba(255,120,160,.22)";
  const hair    = "#f5d56b"; // blonde
  const hair2   = "#d1b053"; // shade blonde
  const eye     = "#1a1a22";
  const blue    = "#4aa8ff";
  const blue2   = "#2b6ea8";
  const coat    = "#1b1b22"; // dark coat
  const coat2   = "#2a2a34";
  const scarf   = "#8a2eff"; // violet accent
  const skirt   = "#2a2232";
  const sock    = "#c9c0ae";
  const boot    = "#141418";
  const buckle  = "#bdb6a8";

  // Helpers
  function fill(x, y, w, h, c){
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }
  function oFill(x, y, w, h, c){
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }
  function dot(x, y, c){
    fill(x, y, px, px, c);
  }

  // --- cloak shadow behind body (soft) ---
  ctx.save();
  ctx.globalAlpha = 0.28;
  fill(sx + 3*px, y + 11*px, 12*px, 12*px, "#000");
  ctx.restore();

  // --- HEAD ---
  // Head base (rounded-ish)
  fill(sx + (5+headTurn)*px, y + 1*px, 8*px, 7*px, skin);
  fill(sx + (6+headTurn)*px, y + 0*px, 6*px, 1*px, skin);

  // Hair cap + bangs
  fill(sx + (5+headTurn)*px, y + 1*px, 8*px, 3*px, hair2);
  fill(sx + (4+headTurn)*px, y + 2*px, 10*px, 2*px, hair2);
  // bright hair top
  ctx.save();
  ctx.globalAlpha = 0.9;
  fill(sx + (5+headTurn)*px, y + 1*px, 8*px, 2*px, hair);
  ctx.restore();

  // Side hair strands
  fill(sx + (4+headTurn)*px, y + 4*px, 2*px, 3*px, hair2);
  fill(sx + (12+headTurn)*px, y + 4*px, 2*px, 3*px, hair2);

  // Eyes (blinkable)
  const blinking = (p.blinkHold || 0) > 0;
  if (blinking){
    // sleepy line blink
    fill(sx + (7+headTurn)*px, y + 4*px, 2*px, 1*px, eye);
    fill(sx + (10+headTurn)*px, y + 4*px, 2*px, 1*px, eye);
  } else {
    // big Ghibli-ish blue eyes
    fill(sx + (7+headTurn)*px, y + 4*px, 2*px, 2*px, blue2);
    fill(sx + (10+headTurn)*px, y + 4*px, 2*px, 2*px, blue2);
    dot(sx + (7+headTurn)*px, y + 4*px, blue);
    dot(sx + (10+headTurn)*px, y + 4*px, blue);
    // tiny highlight
    ctx.save();
    ctx.globalAlpha = 0.85;
    dot(sx + (8+headTurn)*px, y + 4*px, "#fff");
    dot(sx + (11+headTurn)*px, y + 4*px, "#fff");
    ctx.restore();
    // pupil
    dot(sx + (8+headTurn)*px, y + 5*px, eye);
    dot(sx + (11+headTurn)*px, y + 5*px, eye);
  }

  // Blush
  ctx.save();
  ctx.globalAlpha = 0.9;
  dot(sx + (6+headTurn)*px, y + 6*px, blush);
  dot(sx + (12+headTurn)*px, y + 6*px, blush);
  ctx.restore();

  // Soft outline around head
  ctx.save();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + (5+headTurn)*px, y + 1*px, 8*px, 7*px);
  ctx.restore();

  // --- NECK + SCARF (violet accent) ---
  fill(sx + 8*px, y + 8*px, 2*px, 1*px, skin);
  oFill(sx + 6*px, y + 8*px, 6*px, 2*px, scarf);

  // --- BODY / COAT ---
  oFill(sx + 5*px, y + 10*px, 8*px, 8*px, coat);
  ctx.save();
  ctx.globalAlpha = 0.55;
  fill(sx + 10*px, y + 10*px, 3*px, 8*px, coat2);
  ctx.restore();

  // Belt buckle hint
  fill(sx + 8*px, y + 16*px, 2*px, 2*px, buckle);

  // --- ARMS (swing) ---
  // Swing amounts: more when running
  const armSwing = Math.round(swing * (move ? (run ? 2 : 1) : 0));
  const armSwing2 = Math.round(-swing * (move ? (run ? 2 : 1) : 0));

  // Left arm
  oFill(sx + 3*px, y + (11 + armSwing)*px, 2*px, 6*px, coat);
  fill(sx + 3*px, y + (17 + armSwing)*px, 2*px, 2*px, skin);

  // Right arm
  oFill(sx + 13*px, y + (11 + armSwing2)*px, 2*px, 6*px, coat);
  fill(sx + 13*px, y + (17 + armSwing2)*px, 2*px, 2*px, skin);

  // --- SKIRT / UNDERCLOTH ---
  oFill(sx + 6*px, y + 18*px, 6*px, 3*px, skirt);

  // --- LEGS (walk/run) ---
  // Two legs alternate forward/back
  const legA = Math.round(swing * (move ? (run ? 2 : 1) : 0));
  const legB = Math.round(-swing * (move ? (run ? 2 : 1) : 0));

  // Socks (small)
  fill(sx + 7*px, y + (21 + legA)*px, 2*px, 2*px, sock);
  fill(sx + 9*px, y + (21 + legB)*px, 2*px, 2*px, sock);

  // Boots (bouncy)
  oFill(sx + 7*px, y + (23 + legA)*px, 2*px, 3*px, boot);
  oFill(sx + 9*px, y + (23 + legB)*px, 2*px, 3*px, boot);

  // Tiny toe shine to feel "painted"
  ctx.save();
  ctx.globalAlpha = 0.18;
  dot(sx + 7*px, y + (25 + legA)*px, "#fff");
  dot(sx + 9*px, y + (25 + legB)*px, "#fff");
  ctx.restore();
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
