const SceneWardrobe = {
  eng:null,
  cursor:0,
  pick:{
    hair:0,
    dress:0,
    shoes:0,
    accessory:0
  },
  phase:"pick", // pick -> confirm

  init(eng){
    this.eng = eng;
    UI.toast("Sophia: Pick your outfit for today ✨", 1800);
  },

  update(dt, input){
    // simple menu nav with arrows/WASD
    if(input.y === -1) this.cursor = (this.cursor + 3) % 4;
    if(input.y ===  1) this.cursor = (this.cursor + 1) % 4;

    if(input.x !== 0){
      if(this.cursor===0) this.pick.hair = (this.pick.hair + input.x + OUTFITS.hair.length) % OUTFITS.hair.length;
      if(this.cursor===1) this.pick.dress = (this.pick.dress + input.x + OUTFITS.dress.length) % OUTFITS.dress.length;
      if(this.cursor===2) this.pick.shoes = (this.pick.shoes + input.x + OUTFITS.shoes.length) % OUTFITS.shoes.length;
      if(this.cursor===3) this.pick.accessory = (this.pick.accessory + input.x + OUTFITS.accessory.length) % OUTFITS.accessory.length;
    }

    if(input.interact){
      // confirm outfit and go to room
      this.eng.state.outfit = {
        hair: OUTFITS.hair[this.pick.hair],
        dress: OUTFITS.dress[this.pick.dress],
        shoes: OUTFITS.shoes[this.pick.shoes],
        accessory: OUTFITS.accessory[this.pick.accessory],
        eyes: "#4aa3ff",
        skin: "#ffe0c4"
      };
      UI.toast("Outfit locked. Now write the poem... then RUN 🚌", 1800);
      this.eng.setScene(SceneRoom);
    }
  },

  draw(ctx){
    ctx.clearRect(0,0,960,540);

    // background wardrobe room
    ctx.fillStyle="#1a1210";
    ctx.fillRect(0,0,960,540);

    // wardrobe panels
    ctx.fillStyle="#3a241a";
    ctx.fillRect(70,70,360,400);
    ctx.fillStyle="#2a1610";
    ctx.fillRect(90,90,320,360);

    // hanging bar
    ctx.fillStyle="#777";
    ctx.fillRect(120,130,260,8);

    // title
    ctx.fillStyle="#fff";
    ctx.font="700 34px system-ui";
    ctx.fillText("WARDROBE", 520, 110);

    ctx.font="600 18px system-ui";
    ctx.fillStyle="rgba(255,255,255,.75)";
    ctx.fillText("Use arrows. Press E / Space / INTERACT to confirm.", 520, 140);

    // menu
    const labels = ["Hair", "Dress", "Shoes", "Accessory"];
    const values = [
      OUTFITS.hair[this.pick.hair].name,
      OUTFITS.dress[this.pick.dress].name,
      OUTFITS.shoes[this.pick.shoes].name,
      OUTFITS.accessory[this.pick.accessory].name
    ];

    for(let i=0;i<4;i++){
      const y = 190 + i*54;
      ctx.fillStyle = (i===this.cursor) ? "rgba(138,46,255,.35)" : "rgba(255,255,255,.06)";
      ctx.fillRect(510, y-28, 390, 44);

      ctx.fillStyle="#fff";
      ctx.font="700 18px system-ui";
      ctx.fillText(labels[i], 530, y);

      ctx.fillStyle="rgba(255,255,255,.85)";
      ctx.font="500 18px system-ui";
      ctx.fillText(values[i], 650, y);
    }

    // preview Sophia sprite (larger preview)
    this._drawSophiaPreview(ctx, 250, 300);
  },

  _drawSophiaPreview(ctx, x, y){
    const outfit = {
      hair: OUTFITS.hair[this.pick.hair],
      dress: OUTFITS.dress[this.pick.dress],
      shoes: OUTFITS.shoes[this.pick.shoes],
      accessory: OUTFITS.accessory[this.pick.accessory],
      eyes:"#4aa3ff",
      skin:"#ffe0c4"
    };

    // body silhouette
    ctx.save();
    ctx.translate(x,y);

    // dress
    ctx.fillStyle = outfit.dress.color;
    ctx.beginPath();
    ctx.ellipse(0, 28, 48, 60, 0, 0, Math.PI*2);
    ctx.fill();

    // head
    ctx.fillStyle = outfit.skin;
    ctx.beginPath();
    ctx.arc(0, -12, 32, 0, Math.PI*2);
    ctx.fill();

    // hair
    ctx.fillStyle = outfit.hair.color;
    ctx.beginPath();
    ctx.arc(0, -22, 36, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-36,-22,72,18);

    // eyes
    ctx.fillStyle = outfit.eyes;
    ctx.beginPath();
    ctx.arc(-10,-12,5,0,Math.PI*2);
    ctx.arc(10,-12,5,0,Math.PI*2);
    ctx.fill();

    // necklace/ribbon
    if(outfit.accessory.id !== "none"){
      ctx.fillStyle = outfit.accessory.color;
      ctx.fillRect(-18, 6, 36, 6);
    }

    // shoes
    ctx.fillStyle = outfit.shoes.color;
    ctx.fillRect(-26, 84, 18, 12);
    ctx.fillRect(8, 84, 18, 12);

    ctx.restore();
  }
};

