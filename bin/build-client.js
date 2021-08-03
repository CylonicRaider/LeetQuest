var fs = require("fs");
var path = require("path");
var child_process = require("child_process");

var BUILD_DIR = path.join(__dirname, "../client-build");
var PROJECT_DIR = path.join(__dirname, "../client/js");

function adjustPath(filepath, definition) {
    if (typeof definition === "function") {
        definition = definition(filepath);
    }
    if (typeof definition === "string") {
        if (definition === "remove") {
            fs.rmSync(filepath, { recursive: true });
        }
    } else if (typeof definition === "object") {
        if (!fs.lstatSync(filepath).isDirectory())
            throw new Error("Expected directory at " + filepath);
        fs.readdirSync(filepath).forEach(function (name) {
            var action = definition[name] || definition[""] || "keep";
            adjustPath(path.join(filepath, name), action);
        });
    } else {
        throw new Error("Invalid path adjustment definition: " + definition);
    }
}

console.log("Cleaning up build directory...");
fs.rmSync(BUILD_DIR, { force: true, recursive: true });

console.log("Building client...");
var result = child_process.spawnSync(
    "node",
    ["../../bin/r.js", "-o", "build.js"],
    { cwd: PROJECT_DIR, stdio: "inherit" },
);
if (result.status !== 0) process.exit(1);

console.log("Removing unnecessary files...");
adjustPath(BUILD_DIR, {
    js: {
        "game.js": "keep",
        "home.js": "keep",
        "log.js": "keep",
        "require-jquery.js": "keep",
        "modernizr.js": "keep",
        "css3-mediaqueries.js": "keep",
        "mapworker.js": "keep",
        "detect.js": "keep",
        "underscore.min.js": "keep",
        "text.js": "keep",
        "": function (filepath) {
            return fs.lstatSync(filepath).isFile() ? "remove" : "keep";
        },
    },
    sprites: "remove",
    config: "remove",
});

console.log("Done.");
