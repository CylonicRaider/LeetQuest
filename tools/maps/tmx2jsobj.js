import fs from "fs";
import { WritableStream } from "htmlparser2/lib/WritableStream.js";
import assignIn from "lodash-es/assignIn.js";
import keys from "lodash-es/keys.js";
import last from "lodash-es/last.js";
import mapValues from "lodash-es/mapValues.js";

export default async function txm2jsobj(tmxInputPath) {
    return new Promise((resolve, reject) => {
        const input = fs.createReadStream(tmxInputPath);

        const stateStack = [{ props: {}, children: {}, childCount: 0 }];

        const parser = new WritableStream(
            {
                onopentag(name, attributes) {
                    const parentState = last(stateStack);
                    const newState = { children: {}, childCount: 0 };

                    newState.props = mapValues(attributes, (value) =>
                        /^[0-9]+$/.test(value) ? Number(value) : value,
                    );

                    if (parentState.children[name]) {
                        parentState.children[name].push(newState.props);
                    } else {
                        parentState.children[name] = [newState.props];
                    }

                    parentState.childCount++;
                    stateStack.push(newState);
                },

                ontext(text) {
                    if (/^\s*$/.test(text)) return;
                    throw new Error("Unexpected text in map file!");
                },

                onclosetag(_name) {
                    stateStack.pop();
                    const state = last(stateStack);

                    if (state.childCount === 1) {
                        const key = keys(state.children)[0];
                        state.props[key] = state.children[key][0];
                    } else {
                        assignIn(state.props, state.children);
                    }
                },
            },
            { xmlMode: true },
        );

        try {
            input.pipe(parser).on("finish", () => {
                resolve(stateStack[0].props);
            });
        } catch (err) {
            // TODO: error thrown in parser handler can't seem to be caught here
            reject(err);
        }
    });
}
