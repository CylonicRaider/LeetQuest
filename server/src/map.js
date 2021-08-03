import fs from "fs";
import forEach from "lodash-es/forEach.js";
import includes from "lodash-es/includes.js";
import reject from "lodash-es/reject.js";
import size from "lodash-es/size.js";
import some from "lodash-es/some.js";

import Checkpoint from "./checkpoint.js";
import log from "./log.js";
import * as Utils from "./utils.js";

export default class Map {
    constructor(filepath) {
        this.isLoaded = false;

        fs.access(filepath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
            if (err) {
                log.error(
                    { path: filepath },
                    `Map file ${
                        err.code === "ENOENT"
                            ? "does not exist"
                            : "is not readable"
                    }`,
                );
                return;
            }

            fs.readFile(filepath, (err, file) => {
                const json = JSON.parse(file.toString());

                this.initMap(json);
            });
        });
    }

    initMap(map) {
        this.width = map.width;
        this.height = map.height;
        this.collisions = map.collisions;
        this.mobAreas = map.roamingAreas;
        this.chestAreas = map.chestAreas;
        this.staticChests = map.staticChests;
        this.staticEntities = map.staticEntities;
        this.isLoaded = true;

        // zone groups
        this.zoneWidth = 28;
        this.zoneHeight = 12;
        this.groupWidth = Math.floor(this.width / this.zoneWidth);
        this.groupHeight = Math.floor(this.height / this.zoneHeight);

        this.initConnectedGroups(map.doors);
        this.initCheckpoints(map.checkpoints);

        if (this.ready_func) {
            this.ready_func();
        }
    }

    ready(f) {
        this.ready_func = f;
    }

    tileIndexToGridPosition(tileNum) {
        let x = 0,
            y = 0;

        const getX = (num, w) => {
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

    generateCollisionGrid() {
        this.grid = [];

        if (this.isLoaded) {
            let tileIndex = 0;
            for (let i = 0; i < this.height; i++) {
                this.grid[i] = [];
                for (let j = 0; j < this.width; j++) {
                    if (includes(this.collisions, tileIndex)) {
                        this.grid[i][j] = 1;
                    } else {
                        this.grid[i][j] = 0;
                    }
                    tileIndex += 1;
                }
            }
            //log.info("Collision grid generated.");
        }
    }

    isOutOfBounds(x, y) {
        return x <= 0 || x >= this.width || y <= 0 || y >= this.height;
    }

    isColliding(x, y) {
        if (this.isOutOfBounds(x, y)) {
            return false;
        }
        return this.grid[y][x] === 1;
    }

    GroupIdToGroupPosition(id) {
        const posArray = id.split("-");

        return pos(parseInt(posArray[0]), parseInt(posArray[1]));
    }

    forEachGroup(callback) {
        const width = this.groupWidth,
            height = this.groupHeight;

        for (let x = 0; x < width; x += 1) {
            for (let y = 0; y < height; y += 1) {
                callback(x + "-" + y);
            }
        }
    }

    getGroupIdFromPosition(x, y) {
        const w = this.zoneWidth,
            h = this.zoneHeight,
            gx = Math.floor((x - 1) / w),
            gy = Math.floor((y - 1) / h);

        return gx + "-" + gy;
    }

    getAdjacentGroupPositions(id) {
        const position = this.GroupIdToGroupPosition(id),
            x = position.x,
            y = position.y,
            // surrounding groups
            list = [
                pos(x - 1, y - 1),
                pos(x, y - 1),
                pos(x + 1, y - 1),
                pos(x - 1, y),
                pos(x, y),
                pos(x + 1, y),
                pos(x - 1, y + 1),
                pos(x, y + 1),
                pos(x + 1, y + 1),
            ];

        // groups connected via doors
        forEach(this.connectedGroups[id], (position) => {
            // don't add a connected group if it's already part of the surrounding ones.
            if (!some(list, (groupPos) => equalPositions(groupPos, position))) {
                list.push(position);
            }
        });

        return reject(
            list,
            (pos) =>
                pos.x < 0 ||
                pos.y < 0 ||
                pos.x >= this.groupWidth ||
                pos.y >= this.groupHeight,
        );
    }

    forEachAdjacentGroup(groupId, callback) {
        if (groupId) {
            forEach(this.getAdjacentGroupPositions(groupId), (pos) => {
                callback(`${pos.x}-${pos.y}`);
            });
        }
    }

    initConnectedGroups(doors) {
        this.connectedGroups = {};
        forEach(doors, (door) => {
            const groupId = this.getGroupIdFromPosition(door.x, door.y),
                connectedGroupId = this.getGroupIdFromPosition(
                    door.tx,
                    door.ty,
                ),
                connectedPosition =
                    this.GroupIdToGroupPosition(connectedGroupId);

            if (groupId in this.connectedGroups) {
                this.connectedGroups[groupId].push(connectedPosition);
            } else {
                this.connectedGroups[groupId] = [connectedPosition];
            }
        });
    }

    initCheckpoints(cpList) {
        this.checkpoints = {};
        this.startingAreas = [];

        forEach(cpList, (cp) => {
            const checkpoint = new Checkpoint(cp.id, cp.x, cp.y, cp.w, cp.h);
            this.checkpoints[checkpoint.id] = checkpoint;
            if (cp.s === 1) {
                this.startingAreas.push(checkpoint);
            }
        });
    }

    getCheckpoint(id) {
        return this.checkpoints[id];
    }

    getRandomStartingPosition() {
        const nbAreas = size(this.startingAreas);
        const i = Utils.randomInt(0, nbAreas - 1);
        const area = this.startingAreas[i];

        return area.getRandomPosition();
    }
}

function pos(x, y) {
    return { x: x, y: y };
}

function equalPositions(pos1, pos2) {
    return pos1.x === pos2.x && pos2.y === pos2.y;
}
