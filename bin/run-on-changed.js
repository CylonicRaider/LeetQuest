import childProcess from "child_process";
import crypto from "crypto";
import isMain from "es-main";
import { createReadStream } from "fs";
import fs from "fs/promises";
import ignoreWalk from "ignore-walk";
import minimist from "minimist";
import path from "path";
import process from "process";

function singleToArray(value) {
    return value == null ? [] : Array.isArray(value) ? value : [value];
}

async function asyncIterToArray(iterable) {
    const result = [];
    for await (const item of iterable) result.push(item);
    return result;
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

export async function* enumerateFiles(entryPoints, extensions, ignoreFiles) {
    for (const ep of entryPoints) {
        if (!(await fs.stat(ep)).isDirectory()) {
            yield ep;
            continue;
        }
        const walked = await ignoreWalk({
            path: ep,
            ignoreFiles: ignoreFiles,
        });
        yield* walked.filter((name) => extensions.includes(path.extname(name)));
    }
}

export async function* filterFiles(rawFiles, globalFiles, state) {
    async function testFile(filename) {
        if (!(filename in state)) return true;
        const info = state[filename];
        const stats = await fs.stat(filename);
        if (stats.mtimeMs !== info.mtime) return true;
        const hash = await hashStream(createReadStream(filename), "sha256");
        if (hash !== info.hash) return true;
        return false;
    }

    let forwardAll = false;
    for (const filename of globalFiles) {
        if (await testFile(filename)) {
            forwardAll = true;
            break;
        }
    }
    for await (const filename of rawFiles) {
        if (forwardAll || (await testFile(filename))) yield filename;
    }
}

export async function recordFiles(files, globalFiles, state) {
    for (const filename of files) {
        const stats = await fs.stat(filename);
        const hash = await hashStream(createReadStream(filename), "sha256");
        state[filename] = { mtime: stats.mtimeMs, hash: hash };
    }
}

export async function saveCache(location, state) {
    if (!location) return;
    await fs.writeFile(location, JSON.stringify(state));
}

export default async function main(argv) {
    const args = minimist(argv);
    const cacheFile = args.c;
    const globalFiles = singleToArray(args.g);
    const entryPoints = singleToArray(args.e);
    const ignoreFiles = singleToArray(args.i);
    const extensions = singleToArray(args.x);
    const cmdline = args._;

    let state = await loadCache(cacheFile);

    let files = await asyncIterToArray(
        filterFiles(
            enumerateFiles(entryPoints, extensions, ignoreFiles),
            globalFiles,
            state,
        ),
    );

    const child = childProcess.spawn(
        cmdline[0],
        cmdline.slice(1).concat(files),
        { stdio: "inherit" },
    );
    await waitOnRawEvent(child, "close", (code, signal) => {
        if (code === 0) return;
        throw new Error(
            "Child process " +
                (signal ? `got signal ${signal}` : `exited with code ${code}`),
        );
    });

    await recordFiles(files, globalFiles, state);
    await saveCache(cacheFile, state);
}

if (isMain(import.meta)) {
    main(process.argv.slice(2)).catch((exc) => {
        console.error("ERROR:", exc);
        process.exit(1);
    });
}
