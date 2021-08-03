import { Entities } from "../../shared/js/gametypes.js";

import Player from "./player.js";

export default class Warrior extends Player {
    constructor(id, name) {
        super(id, name, Entities.WARRIOR);
    }
}
