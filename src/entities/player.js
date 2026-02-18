// src/entities/player.js
// NPC City Player — "Reference Sprite" skeleton (pure pixels, no images)
//
// FINAL SKELETON v6 (patch-over forever):
// - 16x20 grid, px=2
// - 4-frame Pokémon walk: 0 idle, 1 left step, 2 idle, 3 right step
// - Weight/hip shift: pants + torso nudge on frames 1 & 3 (classic feel)
// - Legs animate: support straight, swing bent (no long legs)
// - Feet stride: walk=1px, run=2px
// - Arms swing while walking AND while punching (hit snap + recoil)
// - Head tweaked closer to ref (more hair volume, less box face)
// - Blink + subtle idle breathe

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
    if (dt > 
