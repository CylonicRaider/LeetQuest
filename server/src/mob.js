import find from "lodash-es/find.js";
import reject from "lodash-es/reject.js";
import _size from "lodash-es/size.js";
import some from "lodash-es/some.js";
import sortBy from "lodash-es/sortBy.js";

import Character from "./character.js";
import * as Messages from "./message.js";
import Properties from "./properties.js";
import * as Utils from "./utils.js";

export default class Mob extends Character {
    constructor(id, kind, x, y) {
        super(id, "mob", kind, x, y);

        this.updateHitPoints();
        this.spawningX = x;
        this.spawningY = y;
        this.armorLevel = Properties.getArmorLevel(this.kind);
        this.weaponLevel = Properties.getWeaponLevel(this.kind);
        this.hatelist = [];
        this.respawnTimeout = null;
        this.returnTimeout = null;
        this.isDead = false;
    }

    destroy() {
        this.isDead = true;
        this.hatelist = [];
        this.clearTarget();
        this.updateHitPoints();
        this.resetPosition();

        this.handleRespawn();
    }

    receiveDamage(points, playerId) {
        this.hitPoints -= points;
    }

    hates(playerId) {
        return some(this.hatelist, (obj) => obj.id === playerId);
    }

    increaseHateFor(playerId, points) {
        if (this.hates(playerId)) {
            find(this.hatelist, (obj) => obj.id === playerId).hate += points;
        } else {
            this.hatelist.push({ id: playerId, hate: points });
        }

        /*
        log.debug(`Hatelist : ${this.id}`);
        forEach(this.hatelist, (obj) => {
            log.debug(obj.id + " -> " + obj.hate);
        });*/

        if (this.returnTimeout) {
            // Prevent the mob from returning to its spawning position
            // since it has aggroed a new player
            clearTimeout(this.returnTimeout);
            this.returnTimeout = null;
        }
    }

    getHatedPlayerId(hateRank) {
        let i, playerId;
        const sorted = sortBy(this.hatelist, "hate"),
            size = _size(this.hatelist);

        if (hateRank && hateRank <= size) {
            i = size - hateRank;
        } else {
            i = size - 1;
        }
        if (sorted && sorted[i]) {
            playerId = sorted[i].id;
        }

        return playerId;
    }

    forgetPlayer(playerId, duration) {
        this.hatelist = reject(this.hatelist, (obj) => obj.id === playerId);

        if (this.hatelist.length === 0) {
            this.returnToSpawningPosition(duration);
        }
    }

    forgetEveryone() {
        this.hatelist = [];
        this.returnToSpawningPosition(1);
    }

    drop(item) {
        if (item) {
            return new Messages.Drop(this, item);
        }
    }

    handleRespawn() {
        const delay = 30000;

        if (this.area) {
            this.area.respawnMob(this, delay);
        }
    }

    onRespawn(callback) {
        this.respawn_callback = callback;
    }

    resetPosition() {
        this.setPosition(this.spawningX, this.spawningY);
    }

    returnToSpawningPosition(waitDuration) {
        const delay = waitDuration || 4000;

        this.clearTarget();

        this.returnTimeout = setTimeout(() => {
            this.resetPosition();
            this.move(this.x, this.y);
        }, delay);
    }

    onMove(callback) {
        this.move_callback = callback;
    }

    move(x, y) {
        this.setPosition(x, y);
        if (this.move_callback) {
            this.move_callback(this);
        }
    }

    updateHitPoints() {
        this.resetHitPoints(Properties.getHitPoints(this.kind));
    }

    distanceToSpawningPoint(x, y) {
        return Utils.distanceTo(x, y, this.spawningX, this.spawningY);
    }
}
