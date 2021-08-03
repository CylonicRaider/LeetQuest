import fs from "fs";
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

console.log("Translating map file to JSON...");
tmx2jsobj(SRC_FILE)
    .then((unprocessedMap) => {
        if (doClient) {
            console.log("Compiling client map...");
            const clientMap = processMap(unprocessedMap, { mode: "client" });
            fs.writeFile(CLIENT_DEST_FILE, JSON.stringify(clientMap), (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.info(
                        `Finished processing map file: ${CLIENT_DEST_FILE} was saved.`,
                    );
                }
            });
        }
        if (doServer) {
            console.log("Compiling server map...");
            const serverMap = processMap(unprocessedMap, { mode: "server" });
            fs.writeFile(SERVER_DEST_FILE, JSON.stringify(serverMap), (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.info(
                        `Finished processing map file: ${SERVER_DEST_FILE} was saved.`,
                    );
                }
            });
        }
    })
    .catch((err) => {
        console.error(err);
    });
