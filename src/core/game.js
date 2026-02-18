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

    // Collide per-axis for smooth sliding
    this.moveWithCollision(dx, 0);
    this.moveWithCollision(0, dy);

    // Clamp to world bounds
    this.player.x = clamp(this.player.x, 0, this.world.w - this.player.w);
    this.player.y = clamp(this.player.y, 0, this.world.h - this.player.h);

    // Camera follow
    const targetX = this.player.x + this.player.w/2 - this.camera.vw/2;
    const targetY = this.player.y + this.player.h/2 - this.camera.vh/2;
    this.camera.x = lerp(this.camera.x, clamp(targetX, 0, this.world.w - this.camera.vw), 0.12);
    this.camera.y = lerp(this.camera.y, clamp(targetY, 0, this.world.h - this.camera.vh), 0.12);

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

    // Body (lift when jumping)
    const liftY = -this.player.z;

    // Color by role
    ctx.fillStyle = this.player.role === "police" ? "rgba(120,200,255,.95)"
                 : this.player.role === "thug" ? "rgba(255,120,170,.95)"
                 : "rgba(180,255,180,.95)";

    // Dodge tint / iFrames tint
    if (this.player.iFrames > 0){
      ctx.fillStyle = "rgba(255,255,255,.90)";
    }

    ctx.fillRect(this.player.x, this.player.y + liftY, this.player.w, this.player.h);

    // “Accent stripe”
    ctx.fillStyle = "rgba(138,46,255,.55)";
    ctx.fillRect(this.player.x, this.player.y + liftY, this.player.w, 3);

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

    ctx.restore();
  }
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
