import he from "he";

import { Orientations } from "../../shared/js/gametypes.js";

export function sanitize(string) {
    // Input model: Plain text. Output model: Equivalent HTML.
    return he.encode(string);
}

export function random(range) {
    return Math.floor(Math.random() * range);
}

export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

export function clamp(min, max, value) {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    } else {
        return value;
    }
}

export function randomOrientation() {
    const r = random(4);
    let o;

    if (r === 0) o = Orientations.LEFT;
    if (r === 1) o = Orientations.RIGHT;
    if (r === 2) o = Orientations.UP;
    if (r === 3) o = Orientations.DOWN;

    return o;
}

export function Mixin(target, source) {
    if (source) {
        for (const key of Object.keys(source)) {
            if (Object.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
}

export function distanceTo(x, y, x2, y2) {
    const distX = Math.abs(x - x2);
    const distY = Math.abs(y - y2);

    return distX > distY ? distX : distY;
}
