import * as Types from "../../shared/js/gametypes.js";

import Character from "./character.js";
import { LootException } from "./exceptions.js";
import log from "./lib/log.js";

// TODO: perhaps use Object.defineProperty with {writable: false} on Player class
const PLAYER_MAX_LEVEL = 10;

export default class Player extends Character {
    constructor(id, name, kind) {
        super(id, kind);

        this.name = name;

        // Renderer
        this.nameOffsetY = -10;

        // sprites
        this.spriteName = "clotharmor";
        this.weaponName = "sword1";

        // modes
        this.isLootMoving = false;
        this.isSwitchingWeapon = true;
    }

    loot(item) {
        if (item) {
            var rank, currentRank, msg, currentArmorName;

            if (this.currentArmorSprite) {
                currentArmorName = this.currentArmorSprite.name;
            } else {
                currentArmorName = this.spriteName;
            }

            if (item.type === "armor") {
                rank = Types.getArmorRank(item.kind);
                currentRank = Types.getArmorRank(
                    Types.getKindFromString(currentArmorName),
                );
                msg = "You are wearing a better armor";
            } else if (item.type === "weapon") {
                rank = Types.getWeaponRank(item.kind);
                currentRank = Types.getWeaponRank(
                    Types.getKindFromString(this.weaponName),
                );
                msg = "You are wielding a better weapon";
            }

            if (rank && currentRank) {
                if (rank === currentRank) {
                    throw new LootException(
                        "You already have this " + item.type,
                    );
                } else if (rank <= currentRank) {
                    throw new LootException(msg);
                }
            }

            log.info("Player " + this.id + " has looted " + item.id);
            if (Types.isArmor(item.kind) && this.invincible) {
                this.stopInvincibility();
            }
            item.onLoot(this);
        }
    }

    /**
     * Returns true if the character is currently walking towards an item in order to loot it.
     */
    isMovingToLoot() {
        return this.isLootMoving;
    }

    getSpriteName() {
        return this.spriteName;
    }

    setSpriteName(name) {
        this.spriteName = name;
    }

    getArmorName() {
        var sprite = this.getArmorSprite();
        return sprite.id;
    }

    getArmorSprite() {
        if (this.invincible) {
            return this.currentArmorSprite;
        } else {
            return this.sprite;
        }
    }

    getWeaponName() {
        return this.weaponName;
    }

    setWeaponName(name) {
        this.weaponName = name;
    }

    hasWeapon() {
        return this.weaponName !== null;
    }

    switchWeapon(newWeaponName) {
        let count = 14,
            value = false;

        const toggle = () => {
            value = !value;
            return value;
        };

        if (newWeaponName !== this.getWeaponName()) {
            if (this.isSwitchingWeapon) {
                // TODO: this looks wrong, blanking is 'undefined' here (regardless of the hoisted var)
                clearInterval(blanking);
            }

            this.switchingWeapon = true;
            var blanking = setInterval(() => {
                if (toggle()) {
                    this.setWeaponName(newWeaponName);
                } else {
                    this.setWeaponName(null);
                }

                count -= 1;
                if (count === 1) {
                    clearInterval(blanking);
                    this.switchingWeapon = false;

                    if (this.switch_callback) {
                        this.switch_callback();
                    }
                }
            }, 90);
        }
    }

    switchArmor(newArmorSprite) {
        let count = 14,
            value = false;

        const toggle = () => {
            value = !value;
            return value;
        };

        if (newArmorSprite && newArmorSprite.id !== this.getSpriteName()) {
            if (this.isSwitchingArmor) {
                // TODO: this looks wrong, blanking is 'undefined' here (regardless of the hoisted var)
                clearInterval(blanking);
            }

            this.isSwitchingArmor = true;
            this.setSprite(newArmorSprite);
            this.setSpriteName(newArmorSprite.id);
            var blanking = setInterval(() => {
                this.setVisible(toggle());

                count -= 1;
                if (count === 1) {
                    clearInterval(blanking);
                    this.isSwitchingArmor = false;

                    if (this.switch_callback) {
                        this.switch_callback();
                    }
                }
            }, 90);
        }
    }

    onArmorLoot(callback) {
        this.armorloot_callback = callback;
    }

    onSwitchItem(callback) {
        this.switch_callback = callback;
    }

    onInvincible(callback) {
        this.invincible_callback = callback;
    }

    startInvincibility() {
        if (!this.invincible) {
            this.currentArmorSprite = this.getSprite();
            this.invincible = true;
            this.invincible_callback();
        } else {
            // If the player already has invincibility, just reset its duration.
            if (this.invincibleTimeout) {
                clearTimeout(this.invincibleTimeout);
            }
        }

        this.invincibleTimeout = setTimeout(() => {
            this.stopInvincibility();
            this.idle();
        }, 15000);
    }

    stopInvincibility() {
        this.invincible_callback();
        this.invincible = false;

        if (this.currentArmorSprite) {
            this.setSprite(this.currentArmorSprite);
            this.setSpriteName(this.currentArmorSprite.id);
            this.currentArmorSprite = null;
        }
        if (this.invincibleTimeout) {
            clearTimeout(this.invincibleTimeout);
        }
    }
}
