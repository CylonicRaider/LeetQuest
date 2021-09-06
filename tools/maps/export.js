import fs from "fs/promises";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

import processMap from "./processmap.js";
import tmx2jsobj from "./tmx2jsobj.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.chdir(__dirname);

const SRC_FILE = "tmx/map.tmx";
const CLIENT_DEST_FILE = "../../client/maps/world_client.json";
const SERVER_DEST_FILE = "../../server/maps/world_server.json";

const mode = process.argv[2] || "both";
const doClient = mode === "client" || mode === "both";
const doServer = mode === "server" || mode === "both";

async function compile_map(unprocessedMap, kind, path) {
    console.log(`Compiling ${kind} map...`);
    const map = processMap(unprocessedMap, { mode: kind });
    await fs.writeFile(path, JSON.stringify(map));
    console.info(`Finished processing map file: ${path} was saved.`);
}

console.log("Translating map file to JSON...");
tmx2jsobj(SRC_FILE)
    .then((unprocessedMap) => {
        const promises = [];

        if (doClient) {
            promises.push(
                compile_map(unprocessedMap, "client", CLIENT_DEST_FILE),
            );
        }
        if (doServer) {
            promises.push(
                compile_map(unprocessedMap, "server", SERVER_DEST_FILE),
            );
        }

        return Promise.all(promises);
    })
    .catch((err) => {
        console.error(err);
    });
