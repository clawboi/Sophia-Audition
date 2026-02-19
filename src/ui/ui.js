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

        <div class="row" style="margin-top:10px">
          <a class="btn" href="settings.html" style="text-decoration:none">Settings</a>
          <a class="btn" href="debug.html" style="text-decoration:none">Debug</a>
        </div>
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
      <div class="row top">
        <div class="pill" id="hud-role">ROLE</div>
        <div class="pill" id="hud-area">AREA</div>
        <div class="pill" id="hud-time">00:00</div>
        <div class="pill" id="hud-money">$0</div>
        <div class="pill" id="hud-inv">INV: 1</div>
      </div>

      <div class="row mid">
        <div class="pill soft" id="hud-rent">RENT: --</div>
        <div class="pill soft" id="hud-bank">VAULT: --</div>
        <div class="pill soft" id="hud-show">SHOW: --</div>
      </div>

      <div class="meters" aria-label="Status meters">
        <div class="meter" title="Stamina">
          <div class="meter-label">STA</div>
          <div class="meter-bar"><div class="meter-fill" id="hud-stam"></div></div>
        </div>
        <div class="meter" title="Hunger">
          <div class="meter-label">HUN</div>
          <div class="meter-bar"><div class="meter-fill" id="hud-hunger"></div></div>
        </div>
        <div class="meter" title="Sleep">
          <div class="meter-label">SLP</div>
          <div class="meter-bar"><div class="meter-fill" id="hud-sleep"></div></div>
        </div>
        <div class="meter" title="Hygiene">
          <div class="meter-label">HYG</div>
          <div class="meter-bar"><div class="meter-fill" id="hud-hygiene"></div></div>
        </div>
        <div class="meter" title="Fitness">
          <div class="meter-label">FIT</div>
          <div class="meter-bar"><div class="meter-fill" id="hud-fitness"></div></div>
        </div>
        <div class="meter" title="Health">
          <div class="meter-label">HP</div>
          <div class="meter-bar"><div class="meter-fill" id="hud-health"></div></div>
        </div>
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

  setInventory({ slotIndex, heldType }){
    this.renderHUD();
    const el = this.root.querySelector("#hud-inv");
    if (!el) return;
    const slot = (slotIndex ?? 0) + 1;
    const name = (heldType || "empty").toUpperCase();
    el.textContent = `INV: ${slot} · ${name}`;
  }

  setHUD({ role, area, money, stamina, staminaMax, timeText, rentText, bankText, showText, hunger, sleep, hygiene, fitness, health }){
    this.renderHUD();
    this.root.querySelector("#hud-role").textContent = (role || "?").toUpperCase();
    this.root.querySelector("#hud-area").textContent = area || "";
    this.root.querySelector("#hud-money").textContent = `$${money ?? 0}`;
    if (timeText) this.root.querySelector("#hud-time").textContent = timeText;
    if (rentText) this.root.querySelector("#hud-rent").textContent = rentText;
    if (bankText) this.root.querySelector("#hud-bank").textContent = bankText;
    if (showText) this.root.querySelector("#hud-show").textContent = showText;

    const setFill01 = (id, v01) => {
      const el = this.root.querySelector(id);
      if (!el || typeof v01 !== "number") return;
      const p = Math.max(0, Math.min(1, v01));
      el.style.width = `${Math.round(p*100)}%`;
    };

    if (typeof stamina === "number" && typeof staminaMax === "number"){
      setFill01("#hud-stam", stamina / (staminaMax || 1));
    }
    const setPct = (id, v) => setFill01(id, (typeof v === "number" ? v/100 : null));
    setPct("#hud-hunger", hunger);
    setPct("#hud-sleep", sleep);
    setPct("#hud-hygiene", hygiene);
    setPct("#hud-fitness", fitness);
    setPct("#hud-health", health);
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
