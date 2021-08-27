import Character from "./character.js";

export default class Mob extends Character {
    constructor(id, kind) {
        super(id, kind);

        this.aggroRange = 1;
        this.isAggressive = true;
    }
}
