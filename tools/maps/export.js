var fs = require("fs");
var path = require("path");
var process = require("process");
var child_process = require("child_process");

var SRC_FILE = "tmx/map.tmx";
var TEMP_FILE = "tmx/map.tmx.json";

function runCommand(cmdline, cb) {
    var proc = child_process.spawn(cmdline[0], cmdline.slice(1), {
        cwd: __dirname,
        stdio: "inherit",
    });
    proc.on("close", function (code, signal) {
        if (code !== 0) {
            console.error(
                "Child process " +
                    (signal
                        ? "got signal " + signal
                        : "exited with code " + code),
            );
            process.exit(1);
        }
        cb();
    });
}

var mode = process.argv[2] || "both";
var doClient = mode === "client" || mode === "both";
var doServer = mode === "server" || mode === "both";

var DEST_FILE =
    mode === "client"
        ? "../../client/maps/world_client"
        : "../../server/maps/world_server.json";

console.log("Translating map file to JSON...");
runCommand(["node", "tmx2json.js", SRC_FILE, TEMP_FILE], function () {
    function onDone() {
        if (--pending !== 0) return;
        console.log("Removing temporary file...");
        fs.unlink(path.join(__dirname, TEMP_FILE), function (err) {
            if (err) throw err;
            console.log("Done.");
        });
    }

    var pending = 0;
    if (doClient) {
        pending++;
        console.log("Compiling client map...");
        runCommand(
            [
                "node",
                "exportmap.js",
                TEMP_FILE,
                "../../client/maps/world_client",
                "client",
            ],
            onDone,
        );
    }
    if (doServer) {
        pending++;
        console.log("Compiling server map...");
        runCommand(
            [
                "node",
                "exportmap.js",
                TEMP_FILE,
                "../server/maps/world_server.json",
                "server",
            ],
            onDone,
        );
    }
});
