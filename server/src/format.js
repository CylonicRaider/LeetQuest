import every from "lodash-es/every.js";
import isNumber from "lodash-es/isNumber.js";
import isString from "lodash-es/isString.js";

import { Messages } from "../../shared/js/gametypes.js";

import log from "./log.js";

const formats = [];
formats[Messages.HELLO] = ["s", "n", "n"];
formats[Messages.MOVE] = ["n", "n"];
formats[Messages.LOOTMOVE] = ["n", "n", "n"];
formats[Messages.AGGRO] = ["n"];
formats[Messages.ATTACK] = ["n"];
formats[Messages.HIT] = ["n"];
formats[Messages.HURT] = ["n"];
formats[Messages.CHAT] = ["s"];
formats[Messages.LOOT] = ["n"];
formats[Messages.TELEPORT] = ["n", "n"];
formats[Messages.ZONE] = [];
formats[Messages.OPEN] = ["n"];
formats[Messages.CHECK] = ["n"];

export function check(msg) {
    const message = msg.slice(0),
        type = message[0],
        format = formats[type];

    message.shift();

    if (format) {
        if (message.length !== format.length) {
            return false;
        }
        for (const [i, element] in message.entries()) {
            if (format[i] === "n" && !isNumber(element)) {
                return false;
            }
            if (format[i] === "s" && !isString(element)) {
                return false;
            }
        }
        return true;
    } else if (type === Messages.WHO) {
        // WHO messages have a variable amount of params, all of which must be numbers.
        return message.length > 0 && every(message, (param) => isNumber(param));
    } else {
        log.error(`Unknown message type: ${type}`);
        return false;
    }
}
