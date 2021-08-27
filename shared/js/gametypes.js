import difference from "lodash-es/difference.js";
import forEach from "lodash-es/forEach.js";
import indexOf from "lodash-es/indexOf.js";
import size from "lodash-es/size.js";
import union from "lodash-es/union.js";

export const Messages = {
    HELLO: 0,
    WELCOME: 1,
    SPAWN: 2,
    DESPAWN: 3,
    MOVE: 4,
    LOOTMOVE: 5,
    AGGRO: 6,
    ATTACK: 7,
    HIT: 8,
    HURT: 9,
    HEALTH: 10,
    CHAT: 11,
    LOOT: 12,
    EQUIP: 13,
    DROP: 14,
    TELEPORT: 15,
    DAMAGE: 16,
    POPULATION: 17,
    KILL: 18,
    LIST: 19,
    WHO: 20,
    ZONE: 21,
    DESTROY: 22,
    HP: 23,
    BLINK: 24,
    OPEN: 25,
    CHECK: 26,
};

export const Entities = {
    WARRIOR: 1,

    // Mobs
    RAT: 2,
    SKELETON: 3,
    GOBLIN: 4,
    OGRE: 5,
    SPECTRE: 6,
    CRAB: 7,
    BAT: 8,
    WIZARD: 9,
    EYE: 10,
    SNAKE: 11,
    SKELETON2: 12,
    BOSS: 13,
    DEATHKNIGHT: 14,

    // Armors
    FIREFOX: 20,
    CLOTHARMOR: 21,
    LEATHERARMOR: 22,
    MAILARMOR: 23,
    PLATEARMOR: 24,
    REDARMOR: 25,
    GOLDENARMOR: 26,

    // Objects
    FLASK: 35,
    BURGER: 36,
    CHEST: 37,
    FIREPOTION: 38,
    CAKE: 39,

    // NPCs
    GUARD: 40,
    KING: 41,
    OCTOCAT: 42,
    VILLAGEGIRL: 43,
    VILLAGER: 44,
    PRIEST: 45,
    SCIENTIST: 46,
    AGENT: 47,
    RICK: 48,
    NYAN: 49,
    SORCERER: 50,
    BEACHNPC: 51,
    FORESTNPC: 52,
    DESERTNPC: 53,
    LAVANPC: 54,
    CODER: 55,

    // Weapons
    SWORD1: 60,
    SWORD2: 61,
    REDSWORD: 62,
    GOLDENSWORD: 63,
    MORNINGSTAR: 64,
    AXE: 65,
    BLUESWORD: 66,
};

export const Orientations = {
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4,
};

const kinds = {
    warrior: [Entities.WARRIOR, "player"],

    rat: [Entities.RAT, "mob"],
    skeleton: [Entities.SKELETON, "mob"],
    goblin: [Entities.GOBLIN, "mob"],
    ogre: [Entities.OGRE, "mob"],
    spectre: [Entities.SPECTRE, "mob"],
    deathknight: [Entities.DEATHKNIGHT, "mob"],
    crab: [Entities.CRAB, "mob"],
    snake: [Entities.SNAKE, "mob"],
    bat: [Entities.BAT, "mob"],
    wizard: [Entities.WIZARD, "mob"],
    eye: [Entities.EYE, "mob"],
    skeleton2: [Entities.SKELETON2, "mob"],
    boss: [Entities.BOSS, "mob"],

    sword1: [Entities.SWORD1, "weapon"],
    sword2: [Entities.SWORD2, "weapon"],
    axe: [Entities.AXE, "weapon"],
    redsword: [Entities.REDSWORD, "weapon"],
    bluesword: [Entities.BLUESWORD, "weapon"],
    goldensword: [Entities.GOLDENSWORD, "weapon"],
    morningstar: [Entities.MORNINGSTAR, "weapon"],

    firefox: [Entities.FIREFOX, "armor"],
    clotharmor: [Entities.CLOTHARMOR, "armor"],
    leatherarmor: [Entities.LEATHERARMOR, "armor"],
    mailarmor: [Entities.MAILARMOR, "armor"],
    platearmor: [Entities.PLATEARMOR, "armor"],
    redarmor: [Entities.REDARMOR, "armor"],
    goldenarmor: [Entities.GOLDENARMOR, "armor"],

    flask: [Entities.FLASK, "object"],
    cake: [Entities.CAKE, "object"],
    burger: [Entities.BURGER, "object"],
    chest: [Entities.CHEST, "object"],
    firepotion: [Entities.FIREPOTION, "object"],

    guard: [Entities.GUARD, "npc"],
    villagegirl: [Entities.VILLAGEGIRL, "npc"],
    villager: [Entities.VILLAGER, "npc"],
    coder: [Entities.CODER, "npc"],
    scientist: [Entities.SCIENTIST, "npc"],
    priest: [Entities.PRIEST, "npc"],
    king: [Entities.KING, "npc"],
    rick: [Entities.RICK, "npc"],
    nyan: [Entities.NYAN, "npc"],
    sorcerer: [Entities.SORCERER, "npc"],
    agent: [Entities.AGENT, "npc"],
    octocat: [Entities.OCTOCAT, "npc"],
    beachnpc: [Entities.BEACHNPC, "npc"],
    forestnpc: [Entities.FORESTNPC, "npc"],
    desertnpc: [Entities.DESERTNPC, "npc"],
    lavanpc: [Entities.LAVANPC, "npc"],

    getType: function (kind) {
        return kinds[getKindAsString(kind)][1];
    },
};

export const rankedWeapons = [
    Entities.SWORD1,
    Entities.SWORD2,
    Entities.AXE,
    Entities.MORNINGSTAR,
    Entities.BLUESWORD,
    Entities.REDSWORD,
    Entities.GOLDENSWORD,
];

export const rankedArmors = [
    Entities.CLOTHARMOR,
    Entities.LEATHERARMOR,
    Entities.MAILARMOR,
    Entities.PLATEARMOR,
    Entities.REDARMOR,
    Entities.GOLDENARMOR,
];

export function getWeaponRank(weaponKind) {
    return indexOf(rankedWeapons, weaponKind);
}

export function getArmorRank(armorKind) {
    return indexOf(rankedArmors, armorKind);
}

export function isPlayer(kind) {
    return kinds.getType(kind) === "player";
}

export function isMob(kind) {
    return kinds.getType(kind) === "mob";
}

export function isNpc(kind) {
    return kinds.getType(kind) === "npc";
}

export function isCharacter(kind) {
    return isMob(kind) || isNpc(kind) || isPlayer(kind);
}

export function isArmor(kind) {
    return kinds.getType(kind) === "armor";
}

export function isWeapon(kind) {
    return kinds.getType(kind) === "weapon";
}

export function isObject(kind) {
    return kinds.getType(kind) === "object";
}

export function isChest(kind) {
    return kind === Entities.CHEST;
}

export function isItem(kind) {
    return (
        isWeapon(kind) || isArmor(kind) || (isObject(kind) && !isChest(kind))
    );
}

export function isHealingItem(kind) {
    return kind === Entities.FLASK || kind === Entities.BURGER;
}

export function isExpendableItem(kind) {
    return (
        isHealingItem(kind) ||
        kind === Entities.FIREPOTION ||
        kind === Entities.CAKE
    );
}

export function getKindFromString(kind) {
    if (kind in kinds) {
        return kinds[kind][0];
    }
}

export function getKindAsString(kind) {
    for (var k in kinds) {
        if (kinds[k][0] === kind) {
            return k;
        }
    }
}

export function forEachKind(callback) {
    for (var k in kinds) {
        callback(kinds[k][0], k);
    }
}

export function forEachArmor(callback) {
    forEachKind((kind, kindName) => {
        if (isArmor(kind)) {
            callback(kind, kindName);
        }
    });
}

export function forEachMobOrNpcKind(callback) {
    forEachKind((kind, kindName) => {
        if (isMob(kind) || isNpc(kind)) {
            callback(kind, kindName);
        }
    });
}

export function forEachArmorKind(callback) {
    forEachKind((kind, kindName) => {
        if (isArmor(kind)) {
            callback(kind, kindName);
        }
    });
}

export function getOrientationAsString(orientation) {
    switch (orientation) {
        case Orientations.LEFT:
            return "left";
        case Orientations.RIGHT:
            return "right";
        case Orientations.UP:
            return "up";
        case Orientations.DOWN:
            return "down";
    }
}

export function getRandomItemKind() {
    var all = union(this.rankedWeapons, this.rankedArmors),
        forbidden = [Entities.SWORD1, Entities.CLOTHARMOR],
        itemKinds = difference(all, forbidden),
        i = Math.floor(Math.random() * size(itemKinds));

    return itemKinds[i];
}

export function getMessageTypeAsString(type) {
    var typeName;
    forEach(Messages, (value, name) => {
        if (value === type) {
            typeName = name;
        }
    });
    if (!typeName) {
        typeName = "UNKNOWN";
    }
    return typeName;
}
