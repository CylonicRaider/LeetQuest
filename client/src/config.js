// FIXME FIXME FIXME: configuration in general should be reworked into something non-painful

// import build from "../config/config_build.json";
// import local from "../config/config_local.json";

// optional TODO: webpack for string inclusion of files (might not be necessary after this is refactored)

let config = {
    dev: { host: null, port: null, dispatcher: false },
    build: { host: null, port: null },
};

// FIXME:
// if (process.env.NODE_ENV !== "production") {
//     try {
//         config.local = local;
//     } catch (e) {
//         // Exception triggered when config_local.json does not exist. Nothing to do here.
//     }
// }

export default config;
