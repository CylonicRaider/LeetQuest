import forEach from "lodash-es/forEach.js";
import map from "lodash-es/map.js";

import * as Types from "../../shared/js/gametypes.js";

export default function processMap(unprocessedMap, options) {
    const Tiled = unprocessedMap.map;

    const collidingTiles = {};
    const staticEntities = {};
    const worldMap = {
        width: 0,
        height: 0,
        collisions: [],
        doors: [],
        checkpoints: [],
    };
    const mode = options.mode;

    let mobsFirstGid;

    if (mode === "client") {
        worldMap.data = [];
        worldMap.high = [];
        worldMap.animated = {};
        worldMap.blocking = [];
        worldMap.plateau = [];
        worldMap.musicAreas = [];
    }
    if (mode === "server") {
        worldMap.roamingAreas = [];
        worldMap.chestAreas = [];
        worldMap.staticChests = [];
        worldMap.staticEntities = {};
    }

    console.info("Processing map info...");
    worldMap.width = Tiled.width;
    worldMap.height = Tiled.height;
    worldMap.tilesize = Tiled.tilewidth;

    // Tile properties (collision, z-index, animation length...)
    const handleProp = (property, id) => {
        if (property.name === "c") {
            collidingTiles[id] = true;
        }

        if (mode === "client") {
            if (property.name === "v") {
                worldMap.high.push(id);
            }
            if (property.name === "length") {
                if (!worldMap.animated[id]) {
                    worldMap.animated[id] = {};
                }
                worldMap.animated[id].l = property.value;
            }
            if (property.name === "delay") {
                if (!worldMap.animated[id]) {
                    worldMap.animated[id] = {};
                }
                worldMap.animated[id].d = property.value;
            }
        }
    };

    let tileProperties;
    if (Tiled.tileset instanceof Array) {
        forEach(Tiled.tileset, (tileset) => {
            if (tileset.name === "tilesheet") {
                console.info("Processing terrain properties...");
                tileProperties = tileset.tile;
                for (const tileProperty of tileProperties) {
                    const property = tileProperty.properties.property;
                    const tilePropertyId = tileProperty.id + 1;
                    if (property instanceof Array) {
                        for (const elem of property) {
                            handleProp(elem, tilePropertyId);
                        }
                    } else {
                        handleProp(property, tilePropertyId);
                    }
                }
            } else if (tileset.name === "Mobs" && mode === "server") {
                console.info("Processing static entity properties...");
                mobsFirstGid = tileset.firstgid;
                forEach(tileset.tile, (p) => {
                    const property = p.properties.property,
                        id = p.id + 1;

                    if (property.name === "type") {
                        staticEntities[id] = property.value;
                    }
                });
            }
        });
    } else {
        console.error("A tileset is missing");
    }

    for (const group of Tiled.objectgroup) {
        if (group.name === "doors") {
            const doors = group.object;
            console.info("Processing doors...");
            for (const [i, door] of doors.entries()) {
                worldMap.doors[i] = {
                    x: door.x / worldMap.tilesize,
                    y: door.y / worldMap.tilesize,
                    p: door.type === "portal" ? 1 : 0,
                };
                const doorprops = door.properties.property;
                for (const prop of doorprops) {
                    worldMap.doors[i]["t" + prop.name] = prop.value;
                }
            }
        }
    }

    // Object layers
    forEach(Tiled.objectgroup, (objectlayer) => {
        if (objectlayer.name === "roaming" && mode === "server") {
            console.info("Processing roaming areas...");
            const areas = objectlayer.object;

            for (const [i, area] of areas.entries()) {
                let nb;
                if (area.properties) {
                    nb = area.properties.property.value;
                }

                worldMap.roamingAreas[i] = {
                    id: i,
                    x: area.x / 16,
                    y: area.y / 16,
                    width: area.width / 16,
                    height: area.height / 16,
                    type: area.type,
                    nb: nb,
                };
            }
        } else if (objectlayer.name === "chestareas" && mode === "server") {
            console.info("Processing chest areas...");
            forEach(objectlayer.object, (area) => {
                const chestArea = {
                    x: area.x / worldMap.tilesize,
                    y: area.y / worldMap.tilesize,
                    w: area.width / worldMap.tilesize,
                    h: area.height / worldMap.tilesize,
                };
                forEach(area.properties.property, (prop) => {
                    if (prop.name === "items") {
                        chestArea["i"] = map(prop.value.split(","), (name) =>
                            Types.getKindFromString(name),
                        );
                    } else {
                        chestArea["t" + prop.name] = prop.value;
                    }
                });
                worldMap.chestAreas.push(chestArea);
            });
        } else if (objectlayer.name === "chests" && mode === "server") {
            console.info("Processing static chests...");
            forEach(objectlayer.object, (chest) => {
                const items = chest.properties.property.value;
                const newChest = {
                    x: chest.x / worldMap.tilesize,
                    y: chest.y / worldMap.tilesize,
                    i: map(items.split(","), (name) =>
                        Types.getKindFromString(name),
                    ),
                };
                worldMap.staticChests.push(newChest);
            });
        } else if (objectlayer.name === "music" && mode === "client") {
            console.info("Processing music areas...");
            forEach(objectlayer.object, (music) => {
                const musicArea = {
                    x: music.x / worldMap.tilesize,
                    y: music.y / worldMap.tilesize,
                    w: music.width / worldMap.tilesize,
                    h: music.height / worldMap.tilesize,
                    id: music.properties.property.value,
                };
                worldMap.musicAreas.push(musicArea);
            });
        } else if (objectlayer.name === "checkpoints") {
            console.info("Processing check points...");
            let count = 0;
            forEach(objectlayer.object, (checkpoint) => {
                const cp = {
                    id: ++count,
                    x: checkpoint.x / worldMap.tilesize,
                    y: checkpoint.y / worldMap.tilesize,
                    w: checkpoint.width / worldMap.tilesize,
                    h: checkpoint.height / worldMap.tilesize,
                };
                if (mode === "server") {
                    cp.s = checkpoint.type ? 1 : 0;
                }
                worldMap.checkpoints.push(cp);
            });
        }
    });

    // Layers
    if (Tiled.layer instanceof Array) {
        for (const layer of Tiled.layer) {
            processLayer(
                mode,
                worldMap,
                collidingTiles,
                staticEntities,
                mobsFirstGid,
                layer,
            );
        }
    } else {
        processLayer(
            mode,
            worldMap,
            collidingTiles,
            staticEntities,
            mobsFirstGid,
            Tiled.layer,
        );
    }

    if (mode === "client") {
        // Set all undefined tiles to 0
        for (let i = 0, max = worldMap.data.length; i < max; i += 1) {
            if (!worldMap.data[i]) {
                worldMap.data[i] = 0;
            }
        }
    }

    return worldMap;
}

function processLayer(
    mode,
    worldMap,
    collidingTiles,
    staticEntities,
    mobsFirstGid,
    layer,
) {
    if (mode === "server") {
        // Mobs
        if (layer.name === "entities") {
            console.info("Processing positions of static entities ...");
            const tiles = layer.data.tile;

            for (const [i, tile] of tiles.entries()) {
                const gid = tile.gid - mobsFirstGid + 1;
                if (gid && gid > 0) {
                    worldMap.staticEntities[i] = staticEntities[gid];
                }
            }
        }
    }

    const tiles = layer.data.tile;

    if (mode === "client" && layer.name === "blocking") {
        console.info("Processing blocking tiles...");
        for (const [i, tile] of tiles.entries()) {
            const gid = tile.gid;

            if (gid && gid > 0) {
                worldMap.blocking.push(i);
            }
        }
    } else if (mode === "client" && layer.name === "plateau") {
        console.info("Processing plateau tiles...");
        for (const [i, tile] of tiles.entries()) {
            const gid = tile.gid;

            if (gid && gid > 0) {
                worldMap.plateau.push(i);
            }
        }
    } else if (layer.visible !== 0 && layer.name !== "entities") {
        console.info("Processing layer: " + layer.name);

        for (const [i, tile] of tiles.entries()) {
            const gid = tile.gid;

            if (mode === "client") {
                // Set tile gid in the tilesheet
                if (gid > 0) {
                    if (worldMap.data[i] === undefined) {
                        worldMap.data[i] = gid;
                    } else if (worldMap.data[i] instanceof Array) {
                        worldMap.data[i].push(gid);
                    } else {
                        worldMap.data[i] = [worldMap.data[i], gid];
                    }
                }
            }

            // Colliding tiles
            if (gid in collidingTiles) {
                worldMap.collisions.push(i);
            }
        }
    }
}
