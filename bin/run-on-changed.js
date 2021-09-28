import childProcess from "child_process";
import isMain from "es-main";
import fs from "fs/promises";
import ignoreWalk from "ignore-walk";
import minimist from "minimist";
import path from "path";
import process from "process";

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

function asArray(value) {
    return value == null ? [] : Array.isArray(value) ? value : [value];
}

async function asyncIterToArray(iterable) {
    const result = [];
    for await (const item of iterable) result.push(item);
    return result;
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

export default async function main(argv) {
    const args = minimist(argv);
    const configFiles = asArray(args.c);
    const entryPoints = asArray(args.e);
    const ignoreFiles = asArray(args.i);
    const extensions = asArray(args.x);
    const cmdline = args._;

    let files = await asyncIterToArray(
        enumerateFiles(entryPoints, extensions, ignoreFiles),
    );

    const child = childProcess.spawn(
        cmdline[0],
        cmdline.slice(1).concat(files),
        { stdio: "inherit" },
    );
    return await waitOnRawEvent(child, "close", (code, signal) => {
        if (code === 0) return 0;
        throw new Error(
            "Child process " +
                (signal ? `got signal ${signal}` : `exited with code ${code}`),
        );
    });
}

if (isMain(import.meta)) {
    main(process.argv.slice(2)).catch((exc) => {
        console.error(`ERROR: ${exc}`);
        process.exit(1);
    });
}
