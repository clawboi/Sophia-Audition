const Engine = {
  canvas:null,
  ctx:null,
  tPrev:0,

  tileSize: 32,
  scene:null,
  state:{
    outfit: null,
    hasKeys: false,
    timerSec: 0,
    alarmed: false
  },

  init(){
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");

    Input.init();
    UI.init();

    // start on Wardrobe
    this.setScene(SceneWardrobe);

    requestAnimationFrame((t)=>this.loop(t));
  },

  setScene(sceneObj){
    this.scene = sceneObj;
    this.scene.init(this);
  },

  loop(t){
    const dt = Math.min(0.033, (t - this.tPrev)/1000 || 0);
    this.tPrev = t;

    if(this.scene){
      this.scene.update(dt, Input.read());
      this.scene.draw(this.ctx);
    }

    // one-tap interact should not “stick”
    Input.interact = false;

    requestAnimationFrame((t2)=>this.loop(t2));
  }
};

