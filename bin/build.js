var fs = require("fs");
var path = require("path");

var CONFIG_FILE = path.join(__dirname, "../client/config/config_build.json");
var CONFIG = { host: null, port: null };

if (!fs.existsSync(CONFIG_FILE)) {
    console.log("Writing client configuration...");
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG, null, 4) + "\n");
} else {
    console.log("Keeping client configuration intact...");
}

require("./build-client.js");
