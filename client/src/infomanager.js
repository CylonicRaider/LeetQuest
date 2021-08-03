import forEach from "lodash-es/forEach.js";

export default class InfoManager {
    constructor(game) {
        this.game = game;
        this.infos = {};
        this.destroyQueue = [];
    }

    addDamageInfo(value, x, y, type) {
        const time = this.game.currentTime,
            id = `${time}${Math.abs(value)}${x}${y}`,
            info = new DamageInfo(id, value, x, y, DAMAGE_INFO_DURATION, type);

        info.onDestroy((id) => {
            this.destroyQueue.push(id);
        });
        this.infos[id] = info;
    }

    forEachInfo(callback) {
        forEach(this.infos, (info) => {
            callback(info);
        });
    }

    update(time) {
        this.forEachInfo((info) => {
            info.update(time);
        });

        forEach(this.destroyQueue, (id) => {
            delete this.infos[id];
        });
        this.destroyQueue = [];
    }
}

const damageInfoColors = {
    received: {
        fill: "rgb(255, 50, 50)",
        stroke: "rgb(255, 180, 180)",
    },
    inflicted: {
        fill: "white",
        stroke: "#373737",
    },
    healed: {
        fill: "rgb(80, 255, 80)",
        stroke: "rgb(50, 120, 50)",
    },
};

// TODO: perhaps use Object.defineProperty with {writable: false} on DamageInfo class or a static class field as soon as ESLint 8 comes out
const DAMAGE_INFO_DURATION = 1000;

class DamageInfo {
    constructor(id, value, x, y, duration, type) {
        this.id = id;
        this.value = value;
        this.duration = duration;
        this.x = x;
        this.y = y;
        this.opacity = 1.0;
        this.lastTime = 0;
        this.speed = 100;
        this.fillColor = damageInfoColors[type].fill;
        this.strokeColor = damageInfoColors[type].stroke;
    }

    isTimeToAnimate(time) {
        return time - this.lastTime > this.speed;
    }

    update(time) {
        if (this.isTimeToAnimate(time)) {
            this.lastTime = time;
            this.tick();
        }
    }

    tick() {
        this.y -= 1;
        this.opacity -= 0.07;
        if (this.opacity < 0) {
            this.destroy();
        }
    }

    onDestroy(callback) {
        this.destroy_callback = callback;
    }

    destroy() {
        if (this.destroy_callback) {
            this.destroy_callback(this.id);
        }
    }
}
