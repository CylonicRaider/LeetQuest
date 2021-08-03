import Entity from "./entity.js";

export default class Item extends Entity {
    constructor(id, kind, x, y) {
        super(id, "item", kind, x, y);
        this.isStatic = false;
        this.isFromChest = false;
    }

    handleDespawn(params) {
        this.blinkTimeout = setTimeout(() => {
            params.blinkCallback();
            this.despawnTimeout = setTimeout(
                params.despawnCallback,
                params.blinkingDuration,
            );
        }, params.beforeBlinkDelay);
    }

    destroy() {
        if (this.blinkTimeout) {
            clearTimeout(this.blinkTimeout);
        }
        if (this.despawnTimeout) {
            clearTimeout(this.despawnTimeout);
        }

        if (this.isStatic) {
            this.scheduleRespawn(30000);
        }
    }

    scheduleRespawn(delay) {
        setTimeout(() => {
            if (this.respawn_callback) {
                this.respawn_callback();
            }
        }, delay);
    }

    onRespawn(callback) {
        this.respawn_callback = callback;
    }
}
