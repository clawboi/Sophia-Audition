export class UI {
  constructor(root){
    this.root = root;
    this.mode = "boot"; // boot | menu | play
    this.onStart = null;
    this.onContinue = null;
    this.onNew = null;

    this.hud = null;
    this.menu = null;
    this.prompt = null;
    this.toastEl = null;

    this.renderBoot();
  }

  clear(){
    this.root.innerHTML = "";
    this.hud = null;
    this.menu = null;
    this.prompt = null;
    this.toastEl = null;
  }

  renderBoot(){
    this.clear();
    this.mode = "boot";
    this.root.innerHTML = `
      <div class="panel">
        <h1>NPC City</h1>
        <p>Loading the city brain…</p>
        <div class="row">
          <button class="btn" id="boot-ok">Enter</button>
        </div>
      </div>
    `;
    this.root.querySelector("#boot-ok").onclick = () => {
      this.renderMenu({ hasSave:false });
    };
  }

  renderMenu({ hasSave }){
    this.clear();
    this.mode = "menu";
    this.root.innerHTML = `
      <div class="panel">
        <h1>Choose your start</h1>
        <p>V1 is small on purpose. We’re proving the foundation: movement, zones, saving, and mechanics.</p>

        <div class="row" style="margin-bottom:10px">
          ${hasSave ? `<button class="btn" id="continue">Continue</button>` : ``}
          <button class="btn" id="new">New Game</button>
        </div>

        <div class="row">
          <button class="btn" data-role="thug">Thug</button>
          <button class="btn" data-role="actor">Actor</button>
          <button class="btn" data-role="police">Police</button>
        </div>

setInventory({ slotIndex, heldType }){
  this.renderHUD();
  const el = this.root.querySelector("#hud-inv");
  if (!el) return;
  const slot = (slotIndex ?? 0) + 1;
  const name = (heldType || "empty").toUpperCase();
  el.textContent = `INV: ${slot} · ${name}`;
}

        <p style="margin-top:12px; opacity:.85">
          Controls:
          <span class="kbd">WASD / Arrows</span>
          <span class="kbd">Shift (run)</span>
          <span class="kbd">Space (jump)</span>
          <span class="kbd">C (dodge)</span>
          <span class="kbd">F (punch)</span>
          <span class="kbd">E (interact)</span>
          <span class="kbd">R (reset spawn)</span>
        </p>
      </div>
    `;

    if (hasSave){
      this.root.querySelector("#continue").onclick = () => this.onContinue && this.onContinue();
    }
    this.root.querySelector("#new").onclick = () => this.onNew && this.onNew();

    this.root.querySelectorAll("[data-role]").forEach(btn=>{
      btn.onclick = () => {
        const role = btn.getAttribute("data-role");
        this.onStart && this.onStart(role);
      };
    });
  }

  renderHUD(){
    if (this.hud) return;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `
      <div class="pill" id="hud-role">ROLE</div>
<div class="pill" id="hud-area">AREA</div>
<div class="pill" id="hud-money">$0</div>
<div class="pill" id="hud-inv">INV: 1</div>

<div class="stam" aria-label="Stamina">
  <div class="stam-fill" id="hud-stam"></div>
</div>
`;
    this.root.appendChild(hud);

    const prompt = document.createElement("div");
    prompt.className = "prompt";
    prompt.id = "prompt";
    prompt.textContent = "";
    this.root.appendChild(prompt);

    const corner = document.createElement("div");
    corner.className = "corner";
    corner.innerHTML = `
      <div class="kbd">WASD</div>
      <div class="kbd">Shift</div>
      <div class="kbd">Space</div>
      <div class="kbd">C</div>
      <div class="kbd">F</div>
      <div class="kbd">E</div>
    `;
    this.root.appendChild(corner);

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.id = "toast";
    toast.textContent = "";
    this.root.appendChild(toast);

    this.hud = hud;
    this.prompt = prompt;
    this.corner = corner;
    this.toastEl = toast;
  }

  setHUD({ role, area, money, stamina, staminaMax }){
    this.renderHUD();
    this.root.querySelector("#hud-role").textContent = role.toUpperCase();
    this.root.querySelector("#hud-area").textContent = area;
    this.root.querySelector("#hud-money").textContent = `$${money}`;

    if (typeof stamina === "number" && typeof staminaMax === "number"){
      const p = Math.max(0, Math.min(1, stamina / (staminaMax || 1)));
      this.root.querySelector("#hud-stam").style.width = `${Math.round(p*100)}%`;
    }
  }

  setPrompt(text){
    this.renderHUD();
    if (!this.prompt) return;
    if (!text){
      this.prompt.classList.remove("show");
      this.prompt.textContent = "";
      return;
    }
    this.prompt.textContent = text;
    this.prompt.classList.add("show");
  }

  toast(msg){
    this.renderHUD();
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove("show");
    void this.toastEl.offsetWidth; // restart animation
    this.toastEl.classList.add("show");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(()=> this.toastEl && this.toastEl.classList.remove("show"), 1400);
  }

  hideMenu(){
    const panel = this.root.querySelector(".panel");
    if (panel) panel.remove();
  }
}
