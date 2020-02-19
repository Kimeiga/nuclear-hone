import Phaser from "phaser";
import Dungeon from "@mikewesthad/dungeon";
import Player from "./player.js";

import tilesetURL from "../assets/tilesets/buch-tileset-48px-extruded.png";
import spritesheetURL from "../assets/spritesheets/buch-characters-64px-extruded.png";

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function scale(array, factor) {
  let scaled = [];

  for (const row of array) {
    let x = [];

    for (const item of row) x = x.concat(Array(factor).fill(item));

    scaled = scaled.concat(Array(factor).fill(x));
  }

  return scaled;
}

/**
 * Scene that generates a new dungeon
 */
export default class DungeonScene extends Phaser.Scene {
  preload() {
    this.load.image(
      "tiles",
      tilesetURL
    );
    this.load.spritesheet(
      "characters",
      spritesheetURL,
      {
        frameWidth: 64,
        frameHeight: 64,
        margin: 1,
        spacing: 2
      }
    );
  }

  create() {
    // // Generate a random world
    // const dungeon = new Dungeon({
    //   width: 50,
    //   height: 50,
    //   rooms: {
    //     width: { min: 7, max: 15 },
    //     height: { min: 7, max: 15 },
    //     maxRooms: 12
    //   }
    // });

    const gridSpace = {
      EMPTY: -1,
      FLOOR: 6,
      WALL: 20
    };

    let roomHeight = 50;
    let roomWidth = 50;

    let grid = [...Array(roomWidth)].map(e => Array(roomHeight)); // 2d array of gridSpaces

    class Walker {
      constructor(dir, pos, randomDir = false) {
        if (!randomDir) {
          this.dir = dir;
          this.pos = pos;
        } else {
          this.dir = this.randomDirection();
          this.pos = pos;
        }
      }

      randomDirection() {
        let choice = Math.floor(Math.random() * 3.99);
        switch (choice) {
          case 0:
            return { x: 0, y: -1 };
            break;
          case 1:
            return { x: 1, y: 0 };
            break;
          case 2:
            return { x: 0, y: 1 };
            break;
          default:
            return { x: -1, y: 0 };
            break;
        }
      }

      chooseRandomDirection() {
        this.dir = this.randomDirection();
        console.log(this.dir);
      }
    }

    let walkers = []; // array of all walkers

    let chanceWalkerChangeDir = 0.5;
    let chanceWalkerSpawn = 0.05;
    let chanceWalkerDestroy = 0.05;

    let maxWalkers = 10;

    let percentToFill = 0.2;

    // public gameobject wallobj, floorobj

    for (let w = 0; w < roomWidth - 1; w++) {
      for (let h = 0; h < roomHeight - 1; h++) {
        // make every cell "empty"
        grid[w][h] = gridSpace.WALL;
      }
    }

    // set first walker
    let newWalker = new Walker(
      0,
      { x: ~~(roomWidth / 2), y: ~~(roomHeight / 2) },
      true
    );

    walkers.push(newWalker);

    let iterations = 0;

    while (iterations < 100000) {
      // create floor at the position of every walker
      walkers.forEach(walker => {
        grid[walker.pos.x][walker.pos.y] = gridSpace.FLOOR;
      });

      // chance: destroy walker
      let numberChecks = walkers.length;
      for (let i = 0; i < numberChecks; i++) {
        // only if its not the only one, and at a low chance
        if (Math.random() < chanceWalkerDestroy && walkers.length > 1) {
          walkers.splice(i, 1);
          i--;
          break; // only destroy one per iteration
        }
      }

      // chance: walker pick new direction
      for (let i = 0; i < walkers.length; i++) {
        if (Math.random() < chanceWalkerChangeDir) {
          walkers[i].chooseRandomDirection();
        }
      }

      // chance: spawn new walker
      for (let i = 0; i < walkers.length; i++) {
        // only if # of walkers < max, and at a low chance
        if (Math.random() < chanceWalkerSpawn && walkers.length < maxWalkers) {
          // create a walker
          let newWalker = new Walker(
            0,
            { x: walkers[i].pos.x, y: walkers[i].pos.y },
            true
          );
          walkers.push(newWalker);
        }
      }

      // move walkers
      for (let i = 0; i < walkers.length; i++) {
        walkers[i].pos.x += walkers[i].dir.x;
        walkers[i].pos.y += walkers[i].dir.y;

        // avoid border of grid
        walkers[i].pos.x = clamp(walkers[i].pos.x, 1, roomWidth - 2);
        walkers[i].pos.y = clamp(walkers[i].pos.y, 1, roomHeight - 2);
      }

      // check to exit loop
      if (iterations > 500) {
        break;
      }

      iterations++;
    }

    // Create a blank tilemap with dimensions matching the dungeon
    const map = this.make.tilemap({
      tileWidth: 48,
      tileHeight: 48,
      width: roomWidth * 2,
      height: roomHeight * 2
    });

    // 1px margin, 2px spacing
    const tileset = map.addTilesetImage("tiles", null, 48, 48, 1, 2);

    const layer = map.createBlankDynamicLayer("Layer 1", tileset);

    // Get a 2D array of tile indices (using -1 to not render empty tiles) and place them into the
    // blank layer
    // const mappedTiles = dungeon.getMappedTiles({ empty: -1, floor: 6, door: 6, wall: 20 });

    // const mappedTiles = [[6, 6, 6], [6, 6, 6], [6, 6, 6], [6, 6, 6], [6, 6, 6]];

    console.log(grid);

    let bigGrid = scale(grid, 2);

    layer.putTilesAt(bigGrid, 0, 0);

    layer.setCollision(20); // We only need one tile index (the walls) to be colliding for now

    // Place the player in the center of the map. This works because the Dungeon generator places
    // the first room in the center of the map.
    this.player = new Player(
      this,
      map.widthInPixels / 2,
      map.heightInPixels / 2
    );

    // Watch the player and layer for collisions, for the duration of the scene:
    this.physics.add.collider(this.player.sprite, layer);

    // Phaser supports multiple cameras, but you can access the default camera like this:
    const camera = this.cameras.main;
    camera.startFollow(this.player.sprite);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Help text that has a "fixed" position on the screen
    this.add
      .text(16, 16, "Arrow keys to move", {
        font: "18px sans-serif",
        fill: "#000000",
        padding: { x: 20, y: 10 },
        backgroundColor: "#ffffff"
      })
      .setScrollFactor(0);
  }

  update(time, delta) {
    this.player.update();
  }
}
