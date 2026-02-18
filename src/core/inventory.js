// src/core/inventory.js
// NPC City Inventory (3 slots + empty hands)
// Keys:
// 1 / 2 / 3 = select slot
// 0 = empty hands
// Q = cycle (empty -> 1 -> 2 -> 3 -> empty)

export class Inventory {
  constructor(){
    // 3 slots (put items in here)
    this.slots = [ null, null, null ];

    // activeSlot:
    // -1 = empty hands
    // 0..2 = slot 1..3
    this.activeSlot = 0;

    this._bound = false;
  }

  // OPTIONAL starter loadout
  setDefaultLoadout(){
    this.slots[0] = { type:"knife", twoHanded:false };
    this.slots[1] = { type:"bat", twoHanded:true };
    this.slots[2] = null; // keep empty if you want
  }

  bindHotkeys(){
    if (this._bound) return;
    this._bound = true;

    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;

      // ignore typing
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const k = e.key.toLowerCase();

      // pick slots
      if (k === "1") this.activeSlot = 0;
      else if (k === "2") this.activeSlot = 1;
      else if (k === "3") this.activeSlot = 2;

      // empty hands
      else if (k === "0") this.activeSlot = -1;

      // cycle: empty -> 1 -> 2 -> 3 -> empty
      else if (k === "q"){
        this.activeSlot++;
        if (this.activeSlot > 2) this.activeSlot = -1;
      }
    });
  }

  // Call this every frame (or whenever) to sync player.held
  applyToPlayer(player){
    player.held = this.getHeld();
  }

  getHeld(){
    if (this.activeSlot < 0) return null; // empty hands
    return this.slots[this.activeSlot] ?? null;
  }

  // helper: UI can show "INV: 0 EMPTY" or "INV: 2 KNIFE"
  getHudInfo(){
    if (this.activeSlot < 0) return { slotIndex: 0, heldType: "empty" };
    const held = this.getHeld();
    const type = (typeof held === "string") ? held : (held?.type || "empty");
    return { slotIndex: this.activeSlot, heldType: type };
  }

  setSlot(i, item){
    if (i < 0 || i > 2) return;
    this.slots[i] = item ?? null;
  }
}
