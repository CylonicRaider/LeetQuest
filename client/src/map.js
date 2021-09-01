import find from "lodash-es/find.js";
import forEach from "lodash-es/forEach.js";
import includes from "lodash-es/includes.js";

import { Orientations } from "../../shared/js/gametypes.js";

import Area from "./area.js";
import log from "./lib/log.js";
import { isInt } from "./util.js";

export default class WorldMap {
    constructor(loadMultiTilesheets, game) {
        this.game = game;
        this.data = [];
        this.isLoaded = false;
        this.tilesetsLoaded = false;
        this.mapLoaded = false;
        this.loadMultiTilesheets = loadMultiTilesheets;

        this._loadMap();
        this._initTilesets();
    }

    _checkReady() {
        if (this.tilesetsLoaded && this.mapLoaded) {
            this.isLoaded = true;
            if (this.ready_func) {
                this.ready_func();
            }
        }
    }

    _loadMap() {
        // TODO: Ensure the map is not just bundled into the client code.
        log.info("Loading map...");
        import("../maps/world_client.json").then((data) => {
            this._initMap(data);
            this._generateCollisionGrid();
            this._generatePlateauGrid();
            this.mapLoaded = true;
            this._checkReady();
        });
    }

    _initTilesets() {
        var tileset1, tileset2, tileset3;

        if (!this.loadMultiTilesheets) {
            this.tilesetCount = 1;
            tileset1 = this._loadTileset("img/1/tilesheet.png");
        } else {
            if (this.game.renderer.mobile || this.game.renderer.tablet) {
                this.tilesetCount = 1;
                tileset2 = this._loadTileset("img/2/tilesheet.png");
            } else {
                this.tilesetCount = 2;
                tileset2 = this._loadTileset("img/2/tilesheet.png");
                tileset3 = this._loadTileset("img/3/tilesheet.png");
            }
        }

        this.tilesets = [tileset1, tileset2, tileset3];
    }

    _initMap(map) {
        this.width = map.width;
        this.height = map.height;
        this.tilesize = map.tilesize;
        this.data = map.data;
        this.blocking = map.blocking || [];
        this.plateau = map.plateau || [];
        this.musicAreas = map.musicAreas || [];
        this.collisions = map.collisions;
        this.high = map.high;
        this.animated = map.animated;

        this.doors = this._getDoors(map);
        this.checkpoints = this._getCheckpoints(map);
    }

    _getDoors(map) {
        let doors = {};

        forEach(map.doors, (door) => {
            let o;

            switch (door.to) {
                case "u":
                    o = Orientations.UP;
                    break;
                case "d":
                    o = Orientations.DOWN;
                    break;
                case "l":
                    o = Orientations.LEFT;
                    break;
                case "r":
                    o = Orientations.RIGHT;
                    break;
                default:
                    o = Orientations.DOWN;
            }

            doors[this.GridPositionToTileIndex(door.x, door.y)] = {
                x: door.tx,
                y: door.ty,
                orientation: o,
                cameraX: door.tcx,
                cameraY: door.tcy,
                portal: door.p === 1,
            };
        });

        return doors;
    }

    _loadTileset(filepath) {
        const tileset = new Image();

        tileset.src = filepath;

        log.info("Loading tileset: " + filepath);

        tileset.onload = () => {
            if (tileset.width % this.tilesize > 0) {
                throw Error(
                    `Tileset size should be a multiple of ${this.tilesize}`,
                );
            }
            log.info("Map tileset loaded.");

            this.tilesetCount -= 1;
            if (this.tilesetCount === 0) {
                log.debug("All map tilesets loaded.");

                this.tilesetsLoaded = true;
                this._checkReady();
            }
        };

        return tileset;
    }

    ready(f) {
        this.ready_func = f;
    }

    tileIndexToGridPosition(tileNum) {
        var x = 0,
            y = 0;

        var getX = (num, w) => {
            if (num == 0) {
                return 0;
            }
            return num % w == 0 ? w - 1 : (num % w) - 1;
        };

        tileNum -= 1;
        x = getX(tileNum + 1, this.width);
        y = Math.floor(tileNum / this.width);

        return { x: x, y: y };
    }

    GridPositionToTileIndex(x, y) {
        return y * this.width + x + 1;
    }

    isColliding(x, y) {
        if (this.isOutOfBounds(x, y) || !this.grid) {
            return false;
        }
        return this.grid[y][x] === 1;
    }

    isPlateau(x, y) {
        if (this.isOutOfBounds(x, y) || !this.plateauGrid) {
            return false;
        }
        return this.plateauGrid[y][x] === 1;
    }

    _generateCollisionGrid() {
        this.grid = [];
        for (var j, i = 0; i < this.height; i++) {
            this.grid[i] = [];
            for (j = 0; j < this.width; j++) {
                this.grid[i][j] = 0;
            }
        }

        forEach(this.collisions, (tileIndex) => {
            var pos = this.tileIndexToGridPosition(tileIndex + 1);
            this.grid[pos.y][pos.x] = 1;
        });

        forEach(this.blocking, (tileIndex) => {
            var pos = this.tileIndexToGridPosition(tileIndex + 1);
            if (this.grid[pos.y] !== undefined) {
                this.grid[pos.y][pos.x] = 1;
            }
        });
        log.info("Collision grid generated.");
    }

    _generatePlateauGrid() {
        var tileIndex = 0;

        this.plateauGrid = [];
        for (var j, i = 0; i < this.height; i++) {
            this.plateauGrid[i] = [];
            for (j = 0; j < this.width; j++) {
                if (includes(this.plateau, tileIndex)) {
                    this.plateauGrid[i][j] = 1;
                } else {
                    this.plateauGrid[i][j] = 0;
                }
                tileIndex += 1;
            }
        }
        log.info("Plateau grid generated.");
    }

    /**
     * Returns true if the given position is located within the dimensions of the map.
     *
     * @returns {boolean} Whether the position is out of bounds.
     */
    isOutOfBounds(x, y) {
        return (
            isInt(x) &&
            isInt(y) &&
            (x < 0 || x >= this.width || y < 0 || y >= this.height)
        );
    }

    /**
     * Returns true if the given tile id is "high", i.e. above all entities.
     * Used by the renderer to know which tiles to draw after all the entities
     * have been drawn.
     *
     * @param {number} id The tile id in the tileset
     * @see Renderer.drawHighTiles
     */
    isHighTile(id) {
        return includes(this.high, id + 1);
    }

    /**
     * Returns true if the tile is animated. Used by the renderer.
     * @param {number} id The tile id in the tileset
     */
    isAnimatedTile(id) {
        return id + 1 in this.animated;
    }

    getTileAnimationLength(id) {
        return this.animated[id + 1].l;
    }

    getTileAnimationDelay(id) {
        var animProperties = this.animated[id + 1];
        if (animProperties.d) {
            return animProperties.d;
        } else {
            return 100;
        }
    }

    isDoor(x, y) {
        return this.doors[this.GridPositionToTileIndex(x, y)] !== undefined;
    }

    getDoorDestination(x, y) {
        return this.doors[this.GridPositionToTileIndex(x, y)];
    }

    _getCheckpoints(map) {
        var checkpoints = [];
        forEach(map.checkpoints, (cp) => {
            var area = new Area(cp.x, cp.y, cp.w, cp.h);
            area.id = cp.id;
            checkpoints.push(area);
        });
        return checkpoints;
    }

    getCurrentCheckpoint(entity) {
        return find(this.checkpoints, (checkpoint) =>
            checkpoint.contains(entity),
        );
    }
}
