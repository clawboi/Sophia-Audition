console.log("MAIN.JS LOADED ✅", new Date().toISOString());
document.body.insertAdjacentHTML("beforeend",
  '<div style="position:fixed;top:8px;right:8px;z-index:99999;background:#000;color:#0f0;padding:6px 8px;font:12px monospace;border:1px solid #0f0">main.js loaded</div>'
);
console.log("MAIN LOADED");

window.onload = () => {
  console.log("GAME START");

  if (window.__hideLoading) {
    window.__hideLoading();
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  function loop() {
    ctx.fillStyle = "#141420";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText("Sophia Game Running", 250, 270);

    requestAnimationFrame(loop);
  }

  loop();
};
