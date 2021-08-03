import every from "lodash-es/every.js";
import indexOf from "lodash-es/indexOf.js";
import map from "lodash-es/map.js";
import size from "lodash-es/size.js";

// FIXME: cyclic dependency of Mob and Area
// import Mob from "./mob.js";
import * as Utils from "./utils.js";

export default class Area {
    constructor(id, x, y, width, height, world) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.world = world;
        this.entities = [];
        this.hasCompletelyRespawned = true;
    }

    _getRandomPositionInsideArea() {
        const pos = {};
        let valid = false;

        while (!valid) {
            pos.x = this.x + Utils.random(this.width + 1);
            pos.y = this.y + Utils.random(this.height + 1);
            valid = this.world.isValidPosition(pos.x, pos.y);
        }
        return pos;
    }

    removeFromArea(entity) {
        const i = indexOf(map(this.entities, "id"), entity.id);
        this.entities.splice(i, 1);

        if (
            this.isEmpty() &&
            this.hasCompletelyRespawned &&
            this.empty_callback
        ) {
            this.hasCompletelyRespawned = false;
            this.empty_callback();
        }
    }

    addToArea(entity) {
        if (entity) {
            this.entities.push(entity);
            entity.area = this;
            // FIXME: cyclic dependency of Mob and Area
            // if (entity instanceof Mob) {
            //     this.world.addMob(entity);
            // }
        }

        if (this.isFull()) {
            this.hasCompletelyRespawned = true;
        }
    }

    setNumberOfEntities(nb) {
        this.nbEntities = nb;
    }

    isEmpty() {
        return every(this.entities, (entity) => entity.isDead);
    }

    isFull() {
        return !this.isEmpty() && this.nbEntities === size(this.entities);
    }

    onEmpty(callback) {
        this.empty_callback = callback;
    }
}
