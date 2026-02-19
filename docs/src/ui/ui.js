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

    // V2: non-pausing menu overlay
    this.overlay = null;
    this.overlayOpen = false;
    this.overlayTab = "quests"; // quests | inventory | vault | phone | talk
    this.overlayData = {};

    // Overlay actions (wired by Game)
    this.onVaultDeposit = null;
    this.onVaultWithdraw = null;
    this.onPhoneStartJob = null;
    this.onPhoneCollectJob = null;
    this.onQuestTrack = null;
    this.onTalkAction = null;

    this.renderBoot();
  }

  clear(){
    this.root.innerHTML = "";
    this.hud = null;
    this.menu = null;
    this.prompt = null;
    this.toastEl = null;
    this.overlay = null;
    this.overlayOpen = false;
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

    // ===== V2 overlay (TAB) =====
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.id = "overlay";
    ov.innerHTML = `
      <div class="overlay-card" role="dialog" aria-label="Menu">
        <div class="overlay-top">
          <div class="overlay-title">MENU</div>
          <div class="overlay-tabs">
            <button class="tab" data-tab="quests">Quests</button>
            <button class="tab" data-tab="inventory">Inventory</button>
            <button class="tab" data-tab="vault">Vault</button>
            <button class="tab" data-tab="phone">Phone</button>
            <button class="tab" data-tab="talk">Talk</button>
          </div>
          <button class="overlay-x" id="overlay-x" title="Close">✕</button>
        </div>
        <div class="overlay-body" id="overlay-body"></div>
        <div class="overlay-foot">
          <div class="muted" id="overlay-hint">TAB to close. Game keeps running.</div>
        </div>
      </div>
    `;
    this.root.appendChild(ov);

    // bind overlay UI
    ov.querySelector("#overlay-x").onclick = () => this.toggleOverlay(false);
    ov.querySelectorAll(".tab").forEach(btn=>{
      btn.onclick = () => {
        this.overlayTab = btn.getAttribute("data-tab");
        this.renderOverlay();
      };
    });

    this.overlay = ov;

    this.hud = hud;
    this.prompt = prompt;
    this.corner = corner;
    this.toastEl = toast;
  }

  toggleOverlay(force){
    this.renderHUD();
    const next = (typeof force === "boolean") ? force : !this.overlayOpen;
    this.overlayOpen = next;
    if (!this.overlay) return;
    this.overlay.classList.toggle("show", next);
    if (next) this.renderOverlay();
  }

  setOverlayData(data){
    this.overlayData = data || {};
    if (this.overlayOpen) this.renderOverlay();
  }

  openTalk(talk){
    this.overlayTab = "talk";
    this.overlayData.talk = talk;
    this.toggleOverlay(true);
  }

  renderOverlay(){
    if (!this.overlay) return;
    // active tab styling
    this.overlay.querySelectorAll(".tab").forEach(b=>{
      b.classList.toggle("active", b.getAttribute("data-tab") === this.overlayTab);
    });

    const body = this.overlay.querySelector("#overlay-body");
    if (!body) return;

    const d = this.overlayData || {};
    if (this.overlayTab === "quests"){
      const q = d.quests || [];
      body.innerHTML = `
        <div class="sec">
          <div class="sec-title">Active</div>
          <div class="list">
            ${q.map((it,idx)=>`
              <div class="item">
                <div>
                  <div class="item-title">${escapeHtml(it.title)}</div>
                  <div class="item-sub">${escapeHtml(it.desc)}</div>
                </div>
                <div class="item-right">
                  <div class="tag">${escapeHtml(it.status)}</div>
                </div>
              </div>
            `).join("") || `<div class="muted">No quests yet. Talk to the Casting Agent near the stage.</div>`}
          </div>
        </div>
      `;
      return;
    }

    if (this.overlayTab === "vault"){
      const v = d.vault || { cash:0, canUse:false };
      body.innerHTML = `
        <div class="sec">
          <div class="sec-title">District Vault</div>
          <div class="muted">Access: ${v.canUse ? "READY" : "LOCKED (until midnight)"}</div>
          <div class="big">Vault Cash: $${v.cash|0}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn" id="v-dep" ${v.canUse?"":"disabled"}>Deposit $50</button>
            <button class="btn" id="v-wd" ${v.canUse?"":"disabled"}>Withdraw $50</button>
          </div>
          <div class="muted" style="margin-top:10px">Rule: you can use the vault once per real day.</div>
        </div>
      `;
      body.querySelector("#v-dep")?.addEventListener("click", ()=> this.onVaultDeposit && this.onVaultDeposit());
      body.querySelector("#v-wd")?.addEventListener("click", ()=> this.onVaultWithdraw && this.onVaultWithdraw());
      return;
    }

    if (this.overlayTab === "inventory"){
      const inv = d.inventory || { activeSlot:0, slots:[null,null,null] };
      const a = inv.activeSlot;
      const label = (it) => (it ? String(it).toUpperCase() : "EMPTY");
      body.innerHTML = `
        <div class="sec">
          <div class="sec-title">Inventory</div>
          <div class="muted">Hotkeys: <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> <span class="kbd">0</span> (empty) <span class="kbd">Q</span> (cycle)</div>
          <div class="list" style="margin-top:10px">
            ${[0,1,2].map(i=>`
              <div class="item">
                <div>
                  <div class="item-title">Slot ${i+1} ${i===a ? "· ACTIVE" : ""}</div>
                  <div class="item-sub">${label(inv.slots?.[i])}</div>
                </div>
                <div class="item-right">
                  <div class="tag">${i===a ? "HELD" : ""}</div>
                </div>
              </div>
            `).join("")}
          </div>
          <div class="muted" style="margin-top:10px">Next: loot, shops, and dragging items. For now, this screen keeps you oriented.</div>
        </div>
      `;
      return;
    }

    if (this.overlayTab === "phone"){
      const p = d.phone || { near:false, active:false, ready:false, eta:"--", reward:0 };
      body.innerHTML = `
        <div class="sec">
          <div class="sec-title">Phone</div>
          <div class="muted">Content Job: ${p.active ? "IN PROGRESS" : (p.ready ? "READY" : "UNAVAILABLE")}</div>
          <div class="item" style="margin-top:10px">
            <div>
              <div class="item-title">Post 1-hour content (Dev: 1 minute)</div>
              <div class="item-sub">Do it at home. Right now: Apartments landmark.</div>
            </div>
            <div class="item-right"><div class="tag">+$${p.reward|0}</div></div>
          </div>
          <div class="muted" style="margin-top:10px">ETA: ${escapeHtml(p.eta || "--")}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn" id="p-start" ${p.ready?"":"disabled"}>Start</button>
            <button class="btn" id="p-collect" ${p.active?"":"disabled"}>Collect</button>
          </div>
          <div class="muted" style="margin-top:10px">Tip: go near Apartments to unlock Start.</div>
        </div>
      `;
      body.querySelector("#p-start")?.addEventListener("click", ()=> this.onPhoneStartJob && this.onPhoneStartJob());
      body.querySelector("#p-collect")?.addEventListener("click", ()=> this.onPhoneCollectJob && this.onPhoneCollectJob());
      return;
    }

    // talk tab
    const talk = d.talk;
    if (!talk){
      body.innerHTML = `<div class="muted">No one selected. Walk up to an NPC and press E.</div>`;
      return;
    }
    body.innerHTML = `
      <div class="sec">
        <div class="sec-title">${escapeHtml(talk.name)}</div>
        <div class="chat">
          ${(talk.lines||[]).map(l=>`<div class="bubble">${escapeHtml(l)}</div>`).join("")}
        </div>
        ${talk.action ? `
          <div class="row" style="margin-top:10px">
            <button class="btn" id="talk-act">${escapeHtml(talk.action)}</button>
          </div>
        ` : ``}
      </div>
    `;
    body.querySelector("#talk-act")?.addEventListener("click", ()=> this.onTalkAction && this.onTalkAction(talk));
  }

  setInventory({ slotIndex, heldType }){
    this.renderHUD();
    const el = this.root.querySelector("#hud-inv");
    if (!el) return;
    const s = (slotIndex ?? 0);
    const slot = (s < 0) ? 0 : (s + 1);
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

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
