import map from "lodash-es/map.js";

import { Messages } from "../../shared/js/gametypes.js";

class Message {}

export class Spawn extends Message {
    constructor(entity) {
        super();
        this.entity = entity;
    }
    serialize() {
        const spawn = [Messages.SPAWN];
        return spawn.concat(this.entity.getState());
    }
}

export class Despawn extends Message {
    constructor(entityId) {
        super();
        this.entityId = entityId;
    }
    serialize() {
        return [Messages.DESPAWN, this.entityId];
    }
}

export class Move extends Message {
    constructor(entity) {
        super();
        this.entity = entity;
    }
    serialize() {
        return [Messages.MOVE, this.entity.id, this.entity.x, this.entity.y];
    }
}

export class LootMove extends Message {
    constructor(entity, item) {
        super();
        this.entity = entity;
        this.item = item;
    }
    serialize() {
        return [Messages.LOOTMOVE, this.entity.id, this.item.id];
    }
}

export class Attack extends Message {
    constructor(attackerId, targetId) {
        super();
        this.attackerId = attackerId;
        this.targetId = targetId;
    }
    serialize() {
        return [Messages.ATTACK, this.attackerId, this.targetId];
    }
}

export class Health extends Message {
    constructor(points, isRegen) {
        super();
        this.points = points;
        this.isRegen = isRegen;
    }
    serialize() {
        const health = [Messages.HEALTH, this.points];

        if (this.isRegen) {
            health.push(1);
        }
        return health;
    }
}

export class HitPoints extends Message {
    constructor(maxHitPoints) {
        super();
        this.maxHitPoints = maxHitPoints;
    }
    serialize() {
        return [Messages.HP, this.maxHitPoints];
    }
}

export class EquipItem extends Message {
    constructor(player, itemKind) {
        super();
        this.playerId = player.id;
        this.itemKind = itemKind;
    }
    serialize() {
        return [Messages.EQUIP, this.playerId, this.itemKind];
    }
}

export class Drop extends Message {
    constructor(mob, item) {
        super();
        this.mob = mob;
        this.item = item;
    }
    serialize() {
        const drop = [
            Messages.DROP,
            this.mob.id,
            this.item.id,
            this.item.kind,
            map(this.mob.hatelist, "id"),
        ];

        return drop;
    }
}

export class Chat extends Message {
    constructor(player, message) {
        super();
        this.playerId = player.id;
        this.message = message;
    }
    serialize() {
        return [Messages.CHAT, this.playerId, this.message];
    }
}

export class Teleport extends Message {
    constructor(entity) {
        super();
        this.entity = entity;
    }
    serialize() {
        return [
            Messages.TELEPORT,
            this.entity.id,
            this.entity.x,
            this.entity.y,
        ];
    }
}

export class Damage extends Message {
    constructor(entity, points) {
        super();
        this.entity = entity;
        this.points = points;
    }
    serialize() {
        return [Messages.DAMAGE, this.entity.id, this.points];
    }
}

export class Population extends Message {
    constructor(world, total) {
        super();
        this.world = world;
        this.total = total;
    }
    serialize() {
        return [Messages.POPULATION, this.world, this.total];
    }
}

export class Kill extends Message {
    constructor(mob) {
        super();
        this.mob = mob;
    }
    serialize() {
        return [Messages.KILL, this.mob.kind];
    }
}

export class List extends Message {
    constructor(ids) {
        super();
        this.ids = ids;
    }
    serialize() {
        const list = this.ids;

        list.unshift(Messages.LIST);
        return list;
    }
}

export class Destroy extends Message {
    constructor(entity) {
        super();
        this.entity = entity;
    }
    serialize() {
        return [Messages.DESTROY, this.entity.id];
    }
}

export class Blink extends Message {
    constructor(item) {
        super();
        this.item = item;
    }
    serialize() {
        return [Messages.BLINK, this.item.id];
    }
}
