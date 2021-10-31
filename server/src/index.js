import { readFile } from "fs";
import find from "lodash-es/find.js";
import forEach from "lodash-es/forEach.js";
import map from "lodash-es/map.js";
import range from "lodash-es/range.js";
import sumBy from "lodash-es/sumBy.js";
import merge from "merge";

import log from "./log.js";
import Player from "./player.js";
import WorldServer from "./worldserver.js";
import { MultiVersionWebsocketServer } from "./ws.js";

function main(config) {
    const server = new MultiVersionWebsocketServer(
            config.port,
            config.host || null,
        ),
        worlds = [];

    log.info("Starting LeetQuest game server...");

    server.onConnect((connection) => {
        let world; // the one in which the player will be spawned
        const connect = () => {
            if (world) {
                world.connect_callback(new Player(connection, world));
            }
        };

        // simply fill each world sequentially until they are full
        world = find(
            worlds,
            (world) => world.playerCount < config.nb_players_per_world,
        );
        world.updatePopulation();
        connect();
    });

    server.onError((...args) => {
        log.error(args.join(", "));
    });

    const onPopulationChange = () => {
        const totalPlayers = sumBy(worlds, "playerCount");
        forEach(worlds, (world) => {
            world.updatePopulation(totalPlayers);
        });
    };

    forEach(range(config.nb_worlds), (i) => {
        const world = new WorldServer(
            `world${i + 1}`,
            config.nb_players_per_world,
            server,
            log,
        );
        world.run(config.map_filepath);
        worlds.push(world);
        world.onPlayerAdded(onPopulationChange);
        world.onPlayerRemoved(onPopulationChange);
    });

    server.onRequestStatus(() => JSON.stringify(getWorldDistribution(worlds)));

    onPopulationChange(); // initialize all counters to 0 when the server starts

    process.on("uncaughtException", (e) => {
        log.error("uncaughtException: " + e);
    });
}

function getWorldDistribution(worlds) {
    return map(worlds, "playerCount");
}

function getConfigFile(path, callback) {
    readFile(path, "utf8", (err, json_string) => {
        if (err) {
            log.error({ path: err.path }, "Could not open config file");
            callback(null);
        } else {
            callback(JSON.parse(json_string));
        }
    });
}

const defaultConfigPath = "config.default.json";
let customConfigPath = "config.json";

process.argv.forEach((val, index) => {
    if (index === 2) {
        customConfigPath = val;
    }
});

getConfigFile(defaultConfigPath, (defaultConfig) => {
    getConfigFile(customConfigPath, (localConfig) => {
        if (!defaultConfig && !localConfig) {
            const errorStr =
                "Server cannot start without any configuration file";
            log.error(errorStr);
            throw errorStr;
        }
        const mergedConfig = merge(defaultConfig, localConfig);
        const translatedConfig = {
            host: mergedConfig.host,
            port: mergedConfig.port,
            nb_worlds: mergedConfig.world_count,
            nb_players_per_world: mergedConfig.world_capacity,
            map_filepath: mergedConfig.map,
            debug_level: mergedConfig.log_level,
        };
        main(translatedConfig);
    });
});
