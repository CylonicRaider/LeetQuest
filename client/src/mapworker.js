import forEach from "lodash-es/forEach.js";
import includes from "lodash-es/includes.js";

import mapData from "../maps/world_client.json";

onmessage = (_event) => {
    generateCollisionGrid();
    generatePlateauGrid();

    postMessage(mapData);
};

function generateCollisionGrid() {
    var tileIndex = 0;

    mapData.grid = [];
    for (var j, i = 0; i < mapData.height; i++) {
        mapData.grid[i] = [];
        for (j = 0; j < mapData.width; j++) {
            mapData.grid[i][j] = 0;
        }
    }

    forEach(mapData.collisions, (tileIndex) => {
        var pos = tileIndexToGridPosition(tileIndex + 1);
        mapData.grid[pos.y][pos.x] = 1;
    });

    forEach(mapData.blocking, (tileIndex) => {
        var pos = tileIndexToGridPosition(tileIndex + 1);
        if (mapData.grid[pos.y] !== undefined) {
            mapData.grid[pos.y][pos.x] = 1;
        }
    });
}

function generatePlateauGrid() {
    var tileIndex = 0;

    mapData.plateauGrid = [];
    for (var j, i = 0; i < mapData.height; i++) {
        mapData.plateauGrid[i] = [];
        for (j = 0; j < mapData.width; j++) {
            if (includes(mapData.plateau, tileIndex)) {
                mapData.plateauGrid[i][j] = 1;
            } else {
                mapData.plateauGrid[i][j] = 0;
            }
            tileIndex += 1;
        }
    }
}

function tileIndexToGridPosition(tileNum) {
    var x = 0,
        y = 0;

    var getX = (num, w) => {
        if (num == 0) {
            return 0;
        }
        return num % w == 0 ? w - 1 : (num % w) - 1;
    };

    tileNum -= 1;
    x = getX(tileNum + 1, mapData.width);
    y = Math.floor(tileNum / mapData.width);

    return { x: x, y: y };
}
