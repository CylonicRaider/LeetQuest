import { Entities } from "../../shared/js/gametypes.js";

import Player from "./player.js";

export default class Warrior extends Player {
    constructor(id, name) {
        super(id, name, Entities.WARRIOR);
    }

    removeTarget() {
        if (this.target) {
            // Attacking mobs is handled separately for this client's player (i.e. the warrior).
            // The client's player is not added as an attacker of another character.

            this.target = null;
        }
    }
}
