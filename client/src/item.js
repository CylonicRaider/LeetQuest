import * as Types from "../../shared/js/gametypes.js";

import Entity from "./entity.js";

export default class Item extends Entity {
    constructor(id, kind, type) {
        super(id, kind);

        this.itemKind = Types.getKindAsString(kind);
        this.type = type;
        this.wasDropped = false;
    }

    hasShadow() {
        return true;
    }

    onLoot(player) {
        if (this.type === "weapon") {
            player.switchWeapon(this.itemKind);
        } else if (this.type === "armor") {
            player.armorloot_callback(this.itemKind);
        }
    }

    getSpriteName() {
        return "item-" + this.itemKind;
    }

    getLootMessage() {
        return this.lootMessage;
    }
}
