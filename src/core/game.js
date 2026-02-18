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

      // sprite runtime (safe, internal)
      _sprLastT: 0,
      _sprLastX: 0,
      _sprLastY: 0,
      _blinkT: 0,
      _blinkHold: 0
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

    // reset sprite anim memory
    this.player._sprLastT = 0;
    this.player._sprLastX = this.player.x;
    this.player._sprLastY = this.player.y;
    this.player._blinkT = 1.8 + Math.random() * 2.2;
    this.player._blinkHold = 0;

    this.fx.length = 0;

    this.state = "play";
    this.ui.hideMenu();
    this.persist();
  }

  continueGame(){
    const data = this.save.load();
    if (!data) return this.newGameMenu();

    this.player = { ...this.player, ...data.player };

    // safety: ensure action fields exist for older saves (NO ??= syntax)
    if (this.player.faceX == null) this.player.faceX = 0;
    if (this.player.faceY == null) this.player.faceY = 1;
    if (this.player.z == null) this.player.z = 0;
    if (this.player.jumpT == null) this.player.jumpT = 0;
    if (this.player.dodgeT == null) this.player.dodgeT = 0;
    if (this.player.dodgeCd == null) this.player.dodgeCd = 0;
    if (this.player.punchT == null) this.player.punchT = 0;
    if (this.player.punchCd == null) this.player.punchCd = 0;
    if (this.player.iFrames == null) this.player.iFrames = 0;
    if (this.player.staminaMax == null) this.player.staminaMax = 100;
    if (this.player.stamina == null) this.player.stamina = this.player.staminaMax;

    this.player.stamina = clamp(this.player.stamina, 0, this.player.staminaMax);

    // sprite anim memory
    if (this.player._sprLastT == null) this.player._sprLastT = 0;
    if (this.player._sprLastX == null) this.player._sprLastX = this.player.x;
    if (this.player._sprLastY == null) this.player._sprLastY = this.player.y;
    if (this.player._blinkT == null) this.player._blinkT = 1.8 + Math.random() * 2.2;
    if (this.player._blinkHold == null) this.player._blinkHold = 0;

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

    // stamina regen
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
      if (this.ui.toast) this.ui.toast("Reset spawn");
    }

    // ===== INPUT AXIS + FACING =====
    const a = this.input.axis();
    let ax = a.x, ay = a.y;
    const amag = Math.hypot(ax, ay);
    if (amag > 0){
      ax /= amag; ay /= amag;
      this.player.faceX = ax;
      this.player.faceY = ay;
    }

    // ===== ACTIONS =====
    // Jump
    if (this.input.pressed(" ") && this.player.jumpT <= 0){
      const cost = 12;
      if (this.player.stamina >= cost){
        this.player.stamina -= cost;
        this.player.jumpT = 0.28;
        this.fx.push({ type:"poof", x:this.player.x+this.player.w/2, y:this.player.y+this.player.h+6, t:0, dur:0.22 });
      }
    }

    // Dodge
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

    // Punch (now has a visible jab in sprite)
    if (this.input.pressed("f") && this.player.punchCd <= 0 && this.player.punchT <= 0){
      const cost = 10;
      if (this.player.stamina >= cost){
        this.player.stamina -= cost;
        this.player.punchT = 0.12;
        this.player.punchCd = 0.18;
      }
    }

    // Interact prompt (near landmarks) - NO optional chaining
    let lm = null;
    if (this.world.nearestLandmark){
      lm = this.world.nearestLandmark(
        this.player.x + this.player.w/2,
        this.player.y + this.player.h/2,
        62
      );
    }

    if (lm){
      if (this.ui.setPrompt) this.ui.setPrompt("E · " + lm.text + "  ·  " + (lm.hint || "Interact"));
      if (this.input.pressed("e")){
        this.handleInteract(lm);
      }
    } else {
      if (this.ui.setPrompt) this.ui.setPrompt("");
    }

    // ===== MOVEMENT =====
    let dx = 0, dy = 0;

    if (this.player.dodgeT > 0){
      this.player.dodgeT = Math.max(0, this.player.dodgeT - dt);
      const spd = 520;
      dx = this.player.faceX * spd * dt;
      dy = this.player.faceY * spd * dt;
    } else {
      const run = this.input.down("shift");
      const speed = run ? 220 : 150;

      const slow = (this.player.punchT > 0) ? 0.55 : (this.player.jumpT > 0 ? 0.85 : 1.0);
      dx = ax * speed * slow * dt;
      dy = ay * speed * slow * dt;
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

    // Collide per-axis
    this.moveWithCollision(dx, 0);
    this.moveWithCollision(0, dy);

    // Clamp
    this.player.x = clamp(this.player.x, 0, this.world.w - this.player.w);
    this.player.y = clamp(this.player.y, 0, this.world.h - this.player.h);

    // Camera follow (smooth + snap)
    const targetX = this.player.x + this.player.w * 0.5 - this.camera.vw * 0.5;
    const targetY = this.player.y + this.player.h * 0.5 - this.camera.vh * 0.5;

    const clampedX = clamp(targetX, 0, this.world.w - this.camera.vw);
    const clampedY = clamp(targetY, 0, this.world.h - this.camera.vh);

    this.camera.x = lerp(this.camera.x, clampedX, 0.12);
    this.camera.y = lerp(this.camera.y, clampedY, 0.12);

    this.camera.x = Math.round(this.camera.x);
    this.camera.y = Math.round(this.camera.y);

    // Determine area name
    this.player.area = this.getAreaName(this.player.x, this.player.y, this.player.role);

    // HUD
    if (this.ui.setHUD){
      this.ui.setHUD({
        role: this.player.role,
        area: this.player.area,
        money: this.player.money,
        stamina: this.player.stamina,
        staminaMax: this.player.staminaMax
      });
    }

    // FX tick
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter(f => f.t < f.dur);

    // Autosave
    this._saveTimer = (this._saveTimer || 0) + dt;
    if (this._saveTimer > 1.5){
      this._saveTimer = 0;
      this.persist();
    }
  }

  handleInteract(lm){
    switch (lm.id){
      case "bodega":
        if (this.ui.toast) this.ui.toast("Bodega: snacks + items coming soon");
        break;
      case "studio":
        if (this.ui.toast) this.ui.toast("Studio Gate: auditions coming soon");
        break;
      case "police_hq":
        if (this.ui.toast) this.ui.toast("Police HQ: jobs + heat system coming soon");
        break;
      case "bus_stop":
        if (this.ui.toast) this.ui.toast("Bus Stop: fast travel coming soon");
        break;
      default:
        if (this.ui.toast) this.ui.toast(lm.text);
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

    // Cute sprite (blonde, blue eyes, subtle motion)
    drawPlayerGhibliGirl(ctx, this.player);

    // Above-layer props (NO optional chaining)
    if (this.world.drawAbove) this.world.drawAbove(ctx, this.camera);

    ctx.restore();
  }
}


// ===== SPRITE: Cute Ghibli-ish blonde girl (subtle, not creepy) =====
function drawPlayerGhibliGirl(ctx, p){
  // Slightly larger than collider
  const px = 2;
  const W = 20 * px;
  const H = 24 * px;

  const cx = p.x + p.w/2;
  const feetY = p.y + p.h + 2;
  const sx = Math.round(cx - W/2);
  const sy = Math.round(feetY - H - (p.z || 0));

  const now = performance.now();

  // compute speed from last frame (no update() surgery required)
  if (!p._sprLastT) {
    p._sprLastT = now;
    p._sprLastX = p.x;
    p._sprLastY = p.y;
  }
  const dt = Math.max(1/120, Math.min(1/20, (now - p._sprLastT) / 1000));
  const vx = (p.x - p._sprLastX) / dt;
  const vy = (p.y - p._sprLastY) / dt;
  const speed = Math.hypot(vx, vy);

  p._sprLastT = now;
  p._sprLastX = p.x;
  p._sprLastY = p.y;

  const moving = speed > 12;
  const running = speed > 170;

  // very small motion amounts
  const t = now * 0.0023;
  const phase = moving ? Math.sin(t * (running ? 9.2 : 6.2)) : 0;

  const footA = moving ? Math.round(phase * 1) : 0;
  const footB = moving ? Math.round(-phase * 1) : 0;

  // punch jab (single tiny extension forward)
  const punching = p.punchT > 0;
  const punchP = punching ? (1 - (p.punchT / 0.12)) : 0; // 0..1
  const jab = punching ? Math.round(Math.sin(punchP * Math.PI) * 2) : 0;

  const acting = (p.jumpT>0)||(p.dodgeT>0)||(p.punchT>0);
  const breathe = (!moving && !acting) ? Math.round(Math.sin(t*0.9) * 1) : 0;

  // blink
  if (!p._blinkT) p._blinkT = 1.8 + Math.random()*2.7;
  if (!p._blinkHold) p._blinkHold = 0;

  if (p._blinkHold > 0) p._blinkHold = Math.max(0, p._blinkHold - dt);
  else {
    p._blinkT -= dt;
    if (p._blinkT <= 0){
      p._blinkHold = 0.10;
      p._blinkT = 1.8 + Math.random()*3.2;
    }
  }
  const blinking = p._blinkHold > 0;

  const y = sy + breathe;

  // palette (cute + slightly dark)
  const outline = "rgba(10,10,18,.55)";
  const skin    = "#f2c8b0";
  const hair    = "#f4db7d";
  const hairS   = "#c9b058";
  const coat    = "#1a1a22";
  const coatS   = "#2a2a34";
  const violet  = "rgba(138,46,255,.85)";
  const boot    = "#111116";
  const sock    = "#c9c0ae";
  const eyeLine = "#101018";
  const blue    = "#4aa8ff";
  const blueS   = "#2b6ea8";
  const white   = "rgba(255,255,255,.85)";
  const blush   = "rgba(255,120,160,.18)";

  function fill(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
  function stroke(x,y,w,h){
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(x,y,w,h);
  }

  // extra anchoring shadow
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 2, 12, 6, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // ===== HEAD =====
  fill(sx+6*px, y+1*px, 8*px, 7*px, skin);
  fill(sx+7*px, y+0*px, 6*px, 1*px, skin);

  // hair cap + strands
  fill(sx+6*px, y+1*px, 8*px, 3*px, hairS);
  fill(sx+6*px, y+1*px, 8*px, 2*px, hair);
  fill(sx+5*px, y+3*px, 2*px, 4*px, hairS);
  fill(sx+13*px, y+3*px, 2*px, 4*px, hairS);

  // big, gentle eyes (not dead, not huge)
  if (blinking){
    fill(sx+8*px,  y+5*px, 2*px, 1*px, eyeLine);
    fill(sx+11*px, y+5*px, 2*px, 1*px, eyeLine);
  } else {
    fill(sx+8*px,  y+4*px, 2*px, 3*px, blueS);
    fill(sx+11*px, y+4*px, 2*px, 3*px, blueS);

    fill(sx+8*px,  y+4*px, 1*px, 1*px, blue);
    fill(sx+11*px, y+4*px, 1*px, 1*px, blue);

    fill(sx+9*px,  y+6*px, 1*px, 1*px, eyeLine);
    fill(sx+12*px, y+6*px, 1*px, 1*px, eyeLine);

    fill(sx+9*px,  y+4*px, 1*px, 1*px, white);
    fill(sx+12*px, y+4*px, 1*px, 1*px, white);
  }

  // blush
  ctx.save();
  ctx.globalAlpha = 0.85;
  fill(sx+7*px,  y+6*px, 1*px, 1*px, blush);
  fill(sx+13*px, y+6*px, 1*px, 1*px, blush);
  ctx.restore();

  stroke(sx+6*px, y+1*px, 8*px, 7*px);

  // scarf violet accent
  fill(sx+7*px, y+8*px, 6*px, 2*px, violet);
  stroke(sx+7*px, y+8*px, 6*px, 2*px);

  // ===== BODY =====
  fill(sx+7*px, y+10*px, 6*px, 7*px, coat);
  ctx.save(); ctx.globalAlpha = 0.55;
  fill(sx+10*px, y+10*px, 3*px, 7*px, coatS);
  ctx.restore();
  stroke(sx+7*px, y+10*px, 6*px, 7*px);

  // ===== ARMS (tiny sway + punch jab) =====
  // choose punch direction from facing
  const fx = (p.faceX || 0);
  const fy = (p.faceY || 1);
  const punchRight = Math.abs(fx) >= Math.abs(fy) ? (fx >= 0) : false; // if facing right-ish, jab right arm

  // subtle sway when moving
  const armA = moving ? Math.round(-phase * 1) : 0;
  const armB = moving ? Math.round( phase * 1) : 0;

  // left arm
  fill(sx+5*px, y+(11+armA)*px, 2*px, 5*px, coat);
  stroke(sx+5*px, y+(11+armA)*px, 2*px, 5*px);

  // right arm (jabs forward by 1-2px when punching)
  const jabX = (punching && punchRight) ? jab : 0;
  fill(sx+(13+jabX)*px, y+(11+armB)*px, 2*px, 5*px, coat);
  stroke(sx+(13+jabX)*px, y+(11+armB)*px, 2*px, 5*px);

  // ===== LEGS / BOOTS =====
  fill(sx+8*px,  y+(17+footA)*px, 2*px, 2*px, sock);
  fill(sx+11*px, y+(17+footB)*px, 2*px, 2*px, sock);

  fill(sx+8*px,  y+(19+footA)*px, 2*px, 3*px, boot);
  fill(sx+11*px, y+(19+footB)*px, 2*px, 3*px, boot);
  stroke(sx+8*px,  y+(19+footA)*px, 2*px, 3*px);
  stroke(sx+11*px, y+(19+footB)*px, 2*px, 3*px);
}


// utils
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
