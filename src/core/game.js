// src/core/game.js
import { Player } from "../entities/player.js";
import { Inventory } from "./inventory.js";

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

      faceX: 0, faceY: 1,

      z: 0,
      jumpT: 0,
      dodgeT: 0,
      dodgeCd: 0,
      punchT: 0,
      punchCd: 0,
      iFrames: 0,

      stamina: 100,
      staminaMax: 100,

      money: 40,
      area: ""
    };

    this.camera = {
      x: 0, y: 0,
      vw: canvas.width,
      vh: canvas.height
    };

    this.fx = [];

    // renderer-only player
    this.playerSprite = new Player();
    // Inventory (OFF by default: no default loadout)
this.inv = new Inventory();
this.inv.setDefaultLoadout();        // ✅ gives you knife/bat/flashlight
this.inv.bindHotkeys();              // 1/2/3 + Q cycle
this.inv.applyToPlayer(this.player); // ensures player.held exists

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
    this.player.area = spawn.area || "";

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

    this.playerSprite.reset(this.player);

    this.state = "play";
    this.ui.hideMenu();
    this.persist();
  }

  continueGame(){
    const data = this.save.load();
    if (!data) return this.newGameMenu();

    // merge save
    const sp = data.player || {};
    for (const k in sp) this.player[k] = sp[k];

    // safety defaults (no ??=)
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

    this.playerSprite.reset(this.player);

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
        faceY: this.player.faceY
      }
    });
  }

  loop(t){
    const dt = Math.min(0.033, ((t - this.lastT) / 1000) || 0.016);
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

    // Reset spawn key
    if (this.input.pressed("r")){
      const sp = this.world.getSpawn(this.player.role);
      this.player.x = sp.x;
      this.player.y = sp.y;
      this.player.area = sp.area || "";
      this.persist();
      if (this.ui.toast) this.ui.toast("Reset spawn");
    }

    // input axis + facing
    const a = this.input.axis();
    let ax = a.x, ay = a.y;
    const amag = Math.hypot(ax, ay);
    if (amag > 0){
      ax /= amag; ay /= amag;
      this.player.faceX = ax;
      this.player.faceY = ay;
    }

    // jump
    if (this.input.pressed(" ") && this.player.jumpT <= 0){
      const cost = 12;
      if (this.player.stamina >= cost){
        this.player.stamina -= cost;
        this.player.jumpT = 0.28;
        this.fx.push({ type:"poof", x:this.player.x+this.player.w/2, y:this.player.y+this.player.h+6, t:0, dur:0.22 });
      }
    }

    // dodge
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

    // punch (now it has an actual pose via player.js)
    if (this.input.pressed("f") && this.player.punchCd <= 0 && this.player.punchT <= 0){
      const cost = 10;
      if (this.player.stamina >= cost){
        this.player.stamina -= cost;
        this.player.punchT = 0.14;   // slightly longer so you see it
        this.player.punchCd = 0.18;
      }
    }

    // interact prompt
    const lm = (this.world.nearestLandmark)
      ? this.world.nearestLandmark(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 62)
      : null;

    if (lm){
      if (this.ui.setPrompt) this.ui.setPrompt("E · " + lm.text + "  ·  " + (lm.hint || "Interact"));
      if (this.input.pressed("e")) this.handleInteract(lm);
    } else {
      if (this.ui.setPrompt) this.ui.setPrompt("");
    }

    // movement
    let dx = 0, dy = 0;

    if (this.player.dodgeT > 0){
      this.player.dodgeT = Math.max(0, this.player.dodgeT - dt);
      const spd = 520;
      dx = this.player.faceX * spd * dt;
      dy = this.player.faceY * spd * dt;
    } else {
      const run = this.input.down("shift");
      const speed = run ? 220 : 150;
      const slow = (this.player.punchT > 0) ? 0.60 : (this.player.jumpT > 0 ? 0.85 : 1.0);
      dx = ax * speed * slow * dt;
      dy = ay * speed * slow * dt;
    }

    // tick action timers
    if (this.player.punchT > 0) this.player.punchT = Math.max(0, this.player.punchT - dt);
    if (this.player.jumpT > 0)  this.player.jumpT  = Math.max(0, this.player.jumpT - dt);

    // jump curve (visual)
    if (this.player.jumpT > 0){
      const p = 1 - (this.player.jumpT / 0.28);
      this.player.z = Math.sin(p * Math.PI) * 10;
    } else {
      this.player.z = 0;
    }

    // collide per-axis
    this.moveWithCollision(dx, 0);
    this.moveWithCollision(0, dy);

    // clamp bounds
    this.player.x = clamp(this.player.x, 0, this.world.w - this.player.w);
    this.player.y = clamp(this.player.y, 0, this.world.h - this.player.h);

    // camera follow
    const targetX = this.player.x + this.player.w * 0.5 - this.camera.vw * 0.5;
    const targetY = this.player.y + this.player.h * 0.5 - this.camera.vh * 0.5;
    const clampedX = clamp(targetX, 0, this.world.w - this.camera.vw);
    const clampedY = clamp(targetY, 0, this.world.h - this.camera.vh);

    this.camera.x = lerp(this.camera.x, clampedX, 0.12);
    this.camera.y = lerp(this.camera.y, clampedY, 0.12);
    this.camera.x = Math.round(this.camera.x);
    this.camera.y = Math.round(this.camera.y);

    // area name
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
    for (let i=0; i<this.fx.length; i++) this.fx[i].t += dt;
    this.fx = this.fx.filter(f => f.t < f.dur);

    // keep held item updated after hotkeys
if (this.inv) this.inv.applyToPlayer(this.player);

    // autosave
    this._saveTimer = (this._saveTimer || 0) + dt;
    if (this._saveTimer > 1.5){
      this._saveTimer = 0;
      this.persist();
    }
  }

  handleInteract(lm){
    // placeholder interactions
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

    const next = { x: this.player.x + dx, y: this.player.y + dy, w: this.player.w, h: this.player.h };
    if (!this.world.hitsSolid(next)){
      this.player.x = next.x;
      this.player.y = next.y;
      return;
    }

    // small steps to reduce sticky feel
    const steps = 6;
    for (let i=1; i<=steps; i++){
      const sx = dx * (i/steps);
      const sy = dy * (i/steps);
      const test = { x: this.player.x + sx, y: this.player.y + sy, w: this.player.w, h: this.player.h };
      if (!this.world.hitsSolid(test)){
        this.player.x = test.x;
        this.player.y = test.y;
      } else break;
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

    // world
    this.world.draw(ctx, this.camera);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // FX under player
    for (let i=0; i<this.fx.length; i++){
      const f = this.fx[i];
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

    // shadow (jump squash)
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

    // player sprite
    this.playerSprite.draw(ctx, this.player);

    // above-layer props
    if (this.world.drawAbove) this.world.drawAbove(ctx, this.camera);

    ctx.restore();
  }
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
