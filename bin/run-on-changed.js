import childProcess from "child_process";
import isMain from "es-main";
import minimist from "minimist";
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
    return Array.isArray(value) ? value : [value];
}

export default async function main(argv) {
    const args = minimist(argv);
    const configFiles = asArray(args.c);
    const ignoreFiles = asArray(args.i);
    const entryPoints = asArray(args.e);
    const cmdline = args._;

    const child = childProcess.spawn(
        cmdline[0],
        cmdline.slice(1).concat(entryPoints),
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
