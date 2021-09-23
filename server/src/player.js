import forEach from "lodash-es/forEach.js";

import * as Types from "../../shared/js/gametypes.js";

import Character from "./character.js";
import Chest from "./chest.js";
import { check } from "./format.js";
import * as Formulas from "./formulas.js";
import log from "./log.js";
import * as Messages from "./message.js";
import Properties from "./properties.js";
import * as Utils from "./utils.js";

export default class Player extends Character {
    constructor(connection, worldServer) {
        super(connection.id, "player", Types.Entities.WARRIOR, 0, 0, "");

        this.server = worldServer;
        this.connection = connection;

        this.hasEnteredGame = false;
        this.isDead = false;
        this.haters = {};
        this.lastCheckpoint = null;
        this.disconnectTimeout = null;

        this.connection.listen((message) => {
            const action = parseInt(message[0]);

            log.debug(`Received: ${message}`);
            if (!check(message)) {
                this.connection.close(
                    `Invalid ${Types.getMessageTypeAsString(
                        action,
                    )} message format: ${message}`,
                );
                return;
            }

            if (!this.hasEnteredGame && action !== Types.Messages.HELLO) {
                // HELLO must be the first message
                this.connection.close(`Invalid handshake message: ${message}`);
                return;
            }
            if (
                this.hasEnteredGame &&
                !this.isDead &&
                action === Types.Messages.HELLO
            ) {
                // HELLO can be sent only once
                this.connection.close(
                    `Cannot initiate handshake twice: ${message}`,
                );
                return;
            }

            this.resetTimeout();

            if (action === Types.Messages.HELLO) {
                const name = Utils.sanitize(message[1]);

                // If name was cleared by the sanitizer, give a default name.
                // Always ensure that the name is not longer than a maximum length.
                // (also enforced by the maxlength attribute of the name input element).
                this.name = name === "" ? "lorem ipsum" : name.substr(0, 15);

                this.kind = Types.Entities.WARRIOR;
                this.equipArmor(message[2]);
                this.equipWeapon(message[3]);
                this.orientation = Utils.randomOrientation();
                this.updateHitPoints();
                this.updatePosition();

                this.server.addPlayer(this);
                this.server.enter_callback(this);

                this.send([
                    Types.Messages.WELCOME,
                    this.id,
                    this.name,
                    this.x,
                    this.y,
                    this.hitPoints,
                ]);
                this.hasEnteredGame = true;
                this.isDead = false;
            } else if (action === Types.Messages.WHO) {
                message.shift();
                this.server.pushSpawnsToPlayer(this, message);
            } else if (action === Types.Messages.ZONE) {
                this.zone_callback();
            } else if (action === Types.Messages.CHAT) {
                let msg = Utils.sanitize(message[1]);

                // Sanitized messages may become empty. No need to broadcast empty chat messages.
                if (msg && msg !== "") {
                    msg = msg.substr(0, 60); // Enforce maxlength of chat input
                    this.broadcastToZone(new Messages.Chat(this, msg), false);
                }
            } else if (action === Types.Messages.MOVE) {
                if (this.move_callback) {
                    const x = message[1],
                        y = message[2];

                    if (this.server.isValidPosition(x, y)) {
                        this.setPosition(x, y);
                        this.clearTarget();

                        this.broadcast(new Messages.Move(this));
                        this.move_callback(this.x, this.y);
                    }
                }
            } else if (action === Types.Messages.LOOTMOVE) {
                if (this.lootmove_callback) {
                    this.setPosition(message[1], message[2]);

                    const item = this.server.getEntityOrNull(message[3]);
                    if (item) {
                        this.clearTarget();

                        this.broadcast(new Messages.LootMove(this, item));
                        this.lootmove_callback(this.x, this.y);
                    }
                }
            } else if (action === Types.Messages.AGGRO) {
                if (this.move_callback) {
                    this.server.handleMobHate(message[1], this.id, 5);
                }
            } else if (action === Types.Messages.ATTACK) {
                const mob = this.server.getEntityOrNull(message[1]);

                if (mob) {
                    this.setTarget(mob);
                    this.server.broadcastAttacker(this);
                }
            } else if (action === Types.Messages.HIT) {
                const mob = this.server.getEntityOrNull(message[1]);
                if (mob) {
                    const dmg = Formulas.dmg(this.weaponLevel, mob.armorLevel);

                    if (dmg > 0) {
                        mob.receiveDamage(dmg, this.id);
                        this.server.handleMobHate(mob.id, this.id, dmg);
                        this.server.handleHurtEntity(mob, this, dmg);
                    }
                }
            } else if (action === Types.Messages.HURT) {
                const mob = this.server.getEntityOrNull(message[1]);
                if (mob && this.hitPoints > 0) {
                    this.hitPoints -= Formulas.dmg(
                        mob.weaponLevel,
                        this.armorLevel,
                    );
                    this.server.handleHurtEntity(this);

                    if (this.hitPoints <= 0) {
                        this.isDead = true;
                        if (this.firepotionTimeout) {
                            clearTimeout(this.firepotionTimeout);
                        }
                    }
                }
            } else if (action === Types.Messages.LOOT) {
                const item = this.server.getEntityOrNull(message[1]);

                if (item) {
                    const kind = item.kind;

                    if (Types.isItem(kind)) {
                        this.broadcast(item.despawn());
                        this.server.removeEntity(item);

                        if (kind === Types.Entities.FIREPOTION) {
                            this.updateHitPoints();
                            this.broadcast(this.equip(Types.Entities.FIREFOX));
                            this.firepotionTimeout = setTimeout(() => {
                                this.broadcast(this.equip(this.armor)); // return to normal after 15 sec
                                this.firepotionTimeout = null;
                            }, 15000);
                            this.send(
                                new Messages.HitPoints(
                                    this.maxHitPoints,
                                ).serialize(),
                            );
                        } else if (Types.isHealingItem(kind)) {
                            let amount;

                            switch (kind) {
                                case Types.Entities.FLASK:
                                    amount = 40;
                                    break;
                                case Types.Entities.BURGER:
                                    amount = 100;
                                    break;
                            }

                            if (!this.hasFullHealth()) {
                                this.regenHealthBy(amount);
                                this.server.pushToPlayer(this, this.health());
                            }
                        } else if (
                            Types.isArmor(kind) ||
                            Types.isWeapon(kind)
                        ) {
                            this.equipItem(item);
                            this.broadcast(this.equip(kind));
                        }
                    }
                }
            } else if (action === Types.Messages.TELEPORT) {
                const x = message[1],
                    y = message[2];

                if (this.server.isValidPosition(x, y)) {
                    this.setPosition(x, y);
                    this.clearTarget();

                    this.broadcast(new Messages.Teleport(this));

                    this.server.handlePlayerVanish(this);
                    this.server.pushRelevantEntityListTo(this);
                }
            } else if (action === Types.Messages.OPEN) {
                const chest = this.server.getEntityOrNull(message[1]);
                if (chest && chest instanceof Chest) {
                    this.server.handleOpenedChest(chest, this);
                }
            } else if (action === Types.Messages.CHECK) {
                const checkpoint = this.server.map.getCheckpoint(message[1]);
                if (checkpoint) {
                    this.lastCheckpoint = checkpoint;
                }
            } else {
                if (this.message_callback) {
                    this.message_callback(message);
                }
            }
        });

        this.connection.onClose(() => {
            if (this.firepotionTimeout) {
                clearTimeout(this.firepotionTimeout);
            }
            clearTimeout(this.disconnectTimeout);
            if (this.exit_callback) {
                this.exit_callback();
            }
        });

        this.connection.sendUTF8("go"); // Notify client that the HELLO/WELCOME handshake can start
    }

    destroy() {
        this.forEachAttacker((mob) => {
            mob.clearTarget();
        });
        this.attackers = {};

        this.forEachHater((mob) => {
            mob.forgetPlayer(this.id);
        });
        this.haters = {};
    }

    getState() {
        const basestate = this._getBaseState(),
            state = [this.name, this.orientation, this.armor, this.weapon];

        if (this.target) {
            state.push(this.target);
        }

        return basestate.concat(state);
    }

    send(message) {
        this.connection.send(message);
    }

    broadcast(message, ignoreSelf) {
        if (this.broadcast_callback) {
            this.broadcast_callback(
                message,
                ignoreSelf === undefined ? true : ignoreSelf,
            );
        }
    }

    broadcastToZone(message, ignoreSelf) {
        if (this.broadcastzone_callback) {
            this.broadcastzone_callback(
                message,
                ignoreSelf === undefined ? true : ignoreSelf,
            );
        }
    }

    onExit(callback) {
        this.exit_callback = callback;
    }

    onMove(callback) {
        this.move_callback = callback;
    }

    onLootMove(callback) {
        this.lootmove_callback = callback;
    }

    onZone(callback) {
        this.zone_callback = callback;
    }

    onOrient(callback) {
        this.orient_callback = callback;
    }

    onMessage(callback) {
        this.message_callback = callback;
    }

    onBroadcast(callback) {
        this.broadcast_callback = callback;
    }

    onBroadcastToZone(callback) {
        this.broadcastzone_callback = callback;
    }

    equip(item) {
        return new Messages.EquipItem(this, item);
    }

    addHater(mob) {
        if (mob) {
            if (!(mob.id in this.haters)) {
                this.haters[mob.id] = mob;
            }
        }
    }

    removeHater(mob) {
        if (mob && mob.id in this.haters) {
            delete this.haters[mob.id];
        }
    }

    forEachHater(callback) {
        forEach(this.haters, (mob) => {
            callback(mob);
        });
    }

    equipArmor(kind) {
        this.armor = kind;
        this.armorLevel = Properties.getArmorLevel(kind);
    }

    equipWeapon(kind) {
        this.weapon = kind;
        this.weaponLevel = Properties.getWeaponLevel(kind);
    }

    equipItem(item) {
        if (item) {
            log.debug(
                this.name + " equips " + Types.getKindAsString(item.kind),
            );

            if (Types.isArmor(item.kind)) {
                this.equipArmor(item.kind);
                this.updateHitPoints();
                this.send(
                    new Messages.HitPoints(this.maxHitPoints).serialize(),
                );
            } else if (Types.isWeapon(item.kind)) {
                this.equipWeapon(item.kind);
            }
        }
    }

    updateHitPoints() {
        this.resetHitPoints(Formulas.hp(this.armorLevel));
    }

    updatePosition() {
        if (this.requestpos_callback) {
            const pos = this.requestpos_callback();
            this.setPosition(pos.x, pos.y);
        }
    }

    onRequestPosition(callback) {
        this.requestpos_callback = callback;
    }

    resetTimeout() {
        clearTimeout(this.disconnectTimeout);
        this.disconnectTimeout = setTimeout(
            this.timeout.bind(this),
            1000 * 60 * 15,
        ); // 15 min.
    }

    timeout() {
        this.connection.sendUTF8("timeout");
        this.connection.close("Player was idle for too long");
    }
}
