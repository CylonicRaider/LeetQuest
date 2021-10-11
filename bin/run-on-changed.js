import childProcess from "child_process";
import crypto from "crypto";
import isMain from "es-main";
import { createReadStream } from "fs";
import fs from "fs/promises";
import ignoreWalk from "ignore-walk";
import minimist from "minimist";
import path from "path";
import process from "process";

function argsToArray(...values) {
    return [].concat(...values.filter((v) => v != null && v !== false));
}

function mergeArraySets(...arrays) {
    return [...new Set([].concat(...arrays))];
}

function waitOnRawEvent(object, event, callback = null) {
    if (callback === null) callback = (x) => x;

    return new Promise((resolve, reject) => {
        object.on(event, (...args) => {
            try {
                resolve(callback(...args));
            } catch (e) {
                reject(e);
            }
        });
    });
}

async function hashStream(input, algorithm = "sha256") {
    const hasher = crypto.createHash(algorithm).setEncoding("hex");
    input.pipe(hasher);
    return await waitOnRawEvent(hasher, "finish", () => hasher.read());
}

export async function loadConfigs(files) {
    const result = [];
    for (const filename of files) {
        result.push(JSON.parse(await fs.readFile(filename, "utf-8")));
    }
    return result;
}

function mergeConfigs(...objects) {
    const result = {};
    for (const obj of objects) {
        if (typeof obj !== "object" || Array.isArray(obj)) {
            continue;
        }
        for (const [key, value] of Object.entries(obj)) {
            result[key] = argsToArray(result[key], value);
        }
    }
    return result;
}

export async function loadCache(location) {
    if (!location) {
        return {};
    }
    let data;
    try {
        data = await fs.readFile(location, "utf-8");
    } catch (err) {
        if (err.code == "ENOENT") return {};
        throw err;
    }
    try {
        return JSON.parse(data);
    } catch (exc) {
        return {};
    }
}

export async function enumerateFiles(entryPoints, extensions, ignoreFiles) {
    const result = [];
    for (const ep of entryPoints) {
        if (!(await fs.stat(ep)).isDirectory()) {
            result.push(ep);
            continue;
        }
        const walked = await ignoreWalk({
            path: ep,
            ignoreFiles: ignoreFiles,
        });
        const additions = walked.filter((name) =>
            extensions.includes(path.extname(name)),
        );
        result.push(...additions);
    }
    return Array.from(new Set(result));
}

export function pruneCache(files, state) {
    const remove = new Set(Object.keys(state));
    for (const filename of files) remove.delete(filename);
    for (const filename of remove) delete state[filename];
}

export async function filterFiles(rawFiles, globalFiles, state) {
    async function testFile(filename) {
        if (!(filename in state)) return true;
        const info = state[filename];
        const stats = await fs.stat(filename);
        if (stats.size !== info.size) return true;
        if (stats.mtimeMs !== info.mtime) return true;
        const hash = await hashStream(createReadStream(filename), "sha256");
        if (hash !== info.hash) return true;
        return false;
    }

    for (const filename of globalFiles) {
        if (await testFile(filename)) return rawFiles;
    }

    const result = [];
    for (const filename of rawFiles) {
        if (await testFile(filename)) result.push(filename);
    }
    return result;
}

export async function recordFiles(files, globalFiles, state) {
    for (const filename of mergeArraySets(files, globalFiles)) {
        const stats = await fs.stat(filename);
        const hash = await hashStream(createReadStream(filename), "sha256");
        state[filename] = {
            size: stats.size,
            mtime: stats.mtimeMs,
            hash: hash,
        };
    }
}

export async function saveCache(location, state) {
    if (!location) return;
    await fs.writeFile(location, JSON.stringify(state));
}

export default async function main(argv) {
    const args = minimist(argv);
    const cliConfig = {
        cache: argsToArray(args.state, args.s),
        global: argsToArray(args.global, args.g),
        paths: argsToArray(args.path, args.p),
        ignore: argsToArray(args.ignore, args.i),
        extensions: argsToArray(args.extension, args.x),
        skipNone: argsToArray(args["skip-none"], args.r),
    };
    const configFiles = argsToArray(args.config, args.c);
    const cmdline = args._;

    const fileConfigs = await loadConfigs(configFiles);
    const config = mergeConfigs(...fileConfigs, cliConfig);

    let cacheFile;
    if (config.cache.length == 0) {
        cacheFile = null;
    } else if (config.cache.length == 1) {
        cacheFile = config.cache[0];
    } else {
        throw new Error("More than one cache file specified");
    }
    const globalFiles = mergeArraySets(...configFiles, ...config.global);

    const state = await loadCache(cacheFile);
    const rawFiles = await enumerateFiles(
        config.paths,
        config.extensions,
        config.ignore,
    );
    pruneCache(rawFiles, state);
    const files = await filterFiles(rawFiles, globalFiles, state);

    if (files.length || !config.skipNone.length) {
        console.log(
            `(Invoking ${cmdline[0]} on ${files.length} ` +
                `file${files.length == 1 ? "" : "s"})`,
        );

        const child = childProcess.spawn(
            cmdline[0],
            cmdline.slice(1).concat(files),
            { stdio: "inherit" },
        );
        await waitOnRawEvent(child, "close", (code, signal) => {
            if (code === 0) return;
            const detail = signal
                ? `got signal ${signal}`
                : `exited with code ${code}`;
            throw new Error(`Child process ${detail}`);
        });
    } else {
        console.log("(Nothing to do)");
    }

    await recordFiles(files, globalFiles, state);
    await saveCache(cacheFile, state);
}

if (isMain(import.meta)) {
    main(process.argv.slice(2)).catch((exc) => {
        console.error("ERROR:", exc);
        process.exit(1);
    });
}
