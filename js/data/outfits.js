const MAPS = {
  room1: {
    w: 30,
    h: 17,
    // 0 floor, 1 wall, 2 rug, 3 bookshelf, 4 desk, 5 door, 6 clock, 7 keys (hidden later)
    tiles: [
      // 17 rows x 30 cols (numbers)
      // walls around edges, floor inside, with furniture blocks
      // (This is a handcrafted mini-map that feels like the screenshot layout)
      "111111111111111111111111111111",
      "100000000000000000000000000001",
      "100033333000000000033333000001",
      "100033333000022220033333000001",
      "100033333000022220033333000001",
      "100000000000022220000000000001",
      "100000000000000000000000000001",
      "100000000044444440000000000001",
      "100000000044444440000000000001",
      "100000000000000000000000000001",
      "100000000000000006000000000001",
      "100000000000000000000000000001",
      "100000000000000000000000000001",
      "100000000000000000000000000001",
      "100000000000000000000000000001",
      "100000000000000000000000000051",
      "111111111111111111111111111111",
    ].map(r => r.split("").map(n=>parseInt(n,10))),
    // simple collision: walls + furniture
    solid: new Set([1,3,4]),
    // interactions
    clockPos:{x:20,y:10},
    doorPos:{x:28,y:15},
    // keys start hidden: we spawn them after the clock event
    keySpawn:{x:6,y:12}
  }
};

