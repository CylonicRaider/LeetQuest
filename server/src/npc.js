import Entity from "./entity.js";

export default class Npc extends Entity {
    constructor(id, kind, x, y) {
        super(id, "npc", kind, x, y);
    }
}
