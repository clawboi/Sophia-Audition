import { Assets } from "./core/assets.js";
import { Input } from "./core/input.js";
import { Save } from "./core/save.js";
import { Game } from "./core/game.js";
import { UI } from "./ui/ui.js";
import { World } from "./world/world.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });


// ===== Pixel-perfect sizing (prevents wobble/jitter on pixel art) =====
// Keep the internal resolution fixed (960x540) but scale the CSS size to an
// *integer* multiple so pixels don't shimmer.
function applyPixelPerfectScale(){
  const iw = canvas.width  || 960;
  const ih = canvas.height || 540;

  // Leave breathing room for UI + mobile safe areas.
  const pad = 24;
  const vw = Math.max(320, window.innerWidth  - pad);
  const vh = Math.max(240, window.innerHeight - pad);

  let scale = Math.floor(Math.min(vw / iw, vh / ih));
  if (!isFinite(scale) || scale < 1) scale = 1;
  if (scale > 6) scale = 6;

  canvas.style.width  = (iw * scale) + "px";
  canvas.style.height = (ih * scale) + "px";
}

window.addEventListener("resize", applyPixelPerfectScale, { passive:true });
applyPixelPerfectScale();

// IMPORTANT: make sure canvas can receive focus
canvas.tabIndex = 0;
canvas.addEventListener("pointerdown", () => canvas.focus());

const input = new Input(canvas);
const save = new Save("NPC_CITY_SAVE_V1");
const ui = new UI(document.getElementById("ui-root"));
const assets = new Assets();
const world = new World();
const game = new Game({ canvas, ctx, input, save, ui, assets, world });

canvas.focus(); // focus once on boot
game.boot();
