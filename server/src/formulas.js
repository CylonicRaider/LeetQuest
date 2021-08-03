import * as Utils from "./utils.js";

export function dmg(weaponLevel, armorLevel) {
    const dealt = weaponLevel * Utils.randomInt(5, 10),
        absorbed = armorLevel * Utils.randomInt(1, 3),
        dmg = dealt - absorbed;

    //console.log("abs: "+absorbed+"   dealt: "+ dealt+"   dmg: "+ (dealt - absorbed));
    if (dmg <= 0) {
        return Utils.randomInt(0, 3);
    } else {
        return dmg;
    }
}

export function hp(armorLevel) {
    const hp = 80 + (armorLevel - 1) * 30;
    return hp;
}
