import { readFile } from "fs";
import find from "lodash-es/find.js";
import forEach from "lodash-es/forEach.js";
import minBy from "lodash-es/minBy.js";
import range from "lodash-es/range.js";
import take from "lodash-es/take.js";

import log from "./log.js";
import Player from "./player.js";
import WorldServer from "./worldserver.js";
// FIXME: import Metrics from "./metrics.js";
import { MultiVersionWebsocketServer } from "./ws.js";

function main(config) {
    const server = new MultiVersionWebsocketServer(
            config.port,
            config.host || null,
        ),
        metrics = null, // FIXME: config.metrics_enabled ? new Metrics(config) : null,
        worlds = [];

    let lastTotalPlayers = 0;
    const checkPopulationInterval = setInterval(() => {
        if (metrics && metrics.isReady) {
            metrics.getTotalPlayers((totalPlayers) => {
                if (totalPlayers !== lastTotalPlayers) {
                    lastTotalPlayers = totalPlayers;
                    forEach(worlds, (world) => {
                        world.updatePopulation(totalPlayers);
                    });
                }
            });
        }
    }, 1000);

    log.info("Starting BrowserQuest game server...");

    server.onConnect((connection) => {
        let world; // the one in which the player will be spawned
        const connect = () => {
            if (world) {
                world.connect_callback(new Player(connection, world));
            }
        };

        if (metrics) {
            metrics.getOpenWorldCount((open_world_count) => {
                // choose the least populated world among open worlds
                world = minBy(take(worlds, open_world_count), "playerCount");
                connect();
            });
        } else {
            // simply fill each world sequentially until they are full
            world = find(
                worlds,
                (world) => world.playerCount < config.nb_players_per_world,
            );
            world.updatePopulation();
            connect();
        }
    });

    server.onError((...args) => {
        log.error(args.join(", "));
    });

    const onPopulationChange = () => {
        metrics.updatePlayerCounters(worlds, (totalPlayers) => {
            forEach(worlds, (world) => {
                world.updatePopulation(totalPlayers);
            });
        });
        metrics.updateWorldDistribution(getWorldDistribution(worlds));
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
        if (metrics) {
            world.onPlayerAdded(onPopulationChange);
            world.onPlayerRemoved(onPopulationChange);
        }
    });

    server.onRequestStatus(() => JSON.stringify(getWorldDistribution(worlds)));

    if (config.metrics_enabled) {
        metrics.ready(() => {
            onPopulationChange(); // initialize all counters to 0 when the server starts
        });
    }

    process.on("uncaughtException", (e) => {
        log.error("uncaughtException: " + e);
    });
}

function getWorldDistribution(worlds) {
    const distribution = [];

    forEach(worlds, (world) => {
        distribution.push(world.playerCount);
    });
    return distribution;
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

const defaultConfigPath = "./server/config.json";
let customConfigPath = "./server/config_local.json";

process.argv.forEach((val, index, array) => {
    if (index === 2) {
        customConfigPath = val;
    }
});

getConfigFile(defaultConfigPath, (defaultConfig) => {
    getConfigFile(customConfigPath, (localConfig) => {
        if (localConfig) {
            main(localConfig);
        } else if (defaultConfig) {
            main(defaultConfig);
        } else {
            const erroStr =
                "Server cannot start without any configuration file.";

            log.error(erroStr);

            throw erroStr;
        }
    });
});
