import forEach from "lodash-es/forEach.js";
import includes from "lodash-es/includes.js";

import * as Types from "../../shared/js/gametypes.js";
import { Orientations } from "../../shared/js/gametypes.js";

import Entity from "./entity.js";
import log from "./lib/log.js";
import Timer from "./timer.js";
import Transition from "./transition.js";

export default class Character extends Entity {
    constructor(id, kind) {
        super(id, kind);

        // Position and orientation
        this.nextGridX = -1;
        this.nextGridY = -1;
        this.orientation = Orientations.DOWN;

        // Speeds
        this.atkSpeed = 50;
        this.moveSpeed = 120;
        this.walkSpeed = 100;
        this.idleSpeed = 450;
        this.setAttackRate(800);

        // Pathing
        this.movement = new Transition();
        this.path = null;
        this.newDestination = null;
        this.adjacentTiles = {};

        // Combat
        this.target = null;
        this.unconfirmedTarget = null;
        this.attackers = {};

        // Health
        this.hitPoints = 0;
        this.maxHitPoints = 0;

        // Modes
        this.isDead = false;
        this.attackingMode = false;
        this.followingMode = false;
    }

    clean() {
        this.forEachAttacker((attacker) => {
            attacker.disengage();
            attacker.idle();
        });
    }

    setMaxHitPoints(hp) {
        this.maxHitPoints = hp;
        this.hitPoints = hp;
    }

    setDefaultAnimation() {
        this.idle();
    }

    hasWeapon() {
        return false;
    }

    hasShadow() {
        return true;
    }

    animate(animation, speed, count, onEndCount) {
        var oriented = ["atk", "walk", "idle"];

        if (
            !(this.currentAnimation && this.currentAnimation.name === "death")
        ) {
            // don't change animation if the character is dying
            this.flipSpriteX = false;
            this.flipSpriteY = false;

            if (includes(oriented, animation)) {
                animation +=
                    "_" +
                    (this.orientation === Orientations.LEFT
                        ? "right"
                        : Types.getOrientationAsString(this.orientation));
                this.flipSpriteX =
                    this.orientation === Orientations.LEFT ? true : false;
            }

            this.setAnimation(animation, speed, count, onEndCount);
        }
    }

    turnTo(orientation) {
        this.orientation = orientation;
        this.idle();
    }

    setOrientation(orientation) {
        if (orientation) {
            this.orientation = orientation;
        }
    }

    idle(orientation) {
        this.setOrientation(orientation);
        this.animate("idle", this.idleSpeed);
    }

    hit(orientation) {
        this.setOrientation(orientation);
        this.animate("atk", this.atkSpeed, 1);
    }

    walk(orientation) {
        this.setOrientation(orientation);
        this.animate("walk", this.walkSpeed);
    }

    moveTo_(x, y) {
        this.destination = { gridX: x, gridY: y };
        this.adjacentTiles = {};

        if (this.isMoving()) {
            this.continueTo(x, y);
        } else {
            var path = this.requestPathfindingTo(x, y);

            this.followPath(path);
        }
    }

    requestPathfindingTo(x, y) {
        if (this.request_path_callback) {
            return this.request_path_callback(x, y);
        } else {
            log.error(
                this.id + " couldn't request pathfinding to " + x + ", " + y,
            );
            return [];
        }
    }

    onRequestPath(callback) {
        this.request_path_callback = callback;
    }

    onStartPathing(callback) {
        this.start_pathing_callback = callback;
    }

    onStopPathing(callback) {
        this.stop_pathing_callback = callback;
    }

    followPath(path) {
        if (path.length > 1) {
            // Length of 1 means the player has clicked on himself
            this.path = path;
            this.step = 0;

            if (this.followingMode) {
                // following a character
                path.pop();
            }

            if (this.start_pathing_callback) {
                this.start_pathing_callback(path);
            }
            this.nextStep();
        }
    }

    continueTo(x, y) {
        this.newDestination = { x: x, y: y };
    }

    updateMovement() {
        var p = this.path,
            i = this.step;

        if (p[i][0] < p[i - 1][0]) {
            this.walk(Orientations.LEFT);
        }
        if (p[i][0] > p[i - 1][0]) {
            this.walk(Orientations.RIGHT);
        }
        if (p[i][1] < p[i - 1][1]) {
            this.walk(Orientations.UP);
        }
        if (p[i][1] > p[i - 1][1]) {
            this.walk(Orientations.DOWN);
        }
    }

    updatePositionOnGrid() {
        this.setGridPosition(this.path[this.step][0], this.path[this.step][1]);
    }

    nextStep() {
        var stop = false,
            x,
            y,
            path;

        if (this.isMoving()) {
            if (this.before_step_callback) {
                this.before_step_callback();
            }

            this.updatePositionOnGrid();
            this.checkAggro();

            if (this.interrupted) {
                // if Character.stop() has been called
                stop = true;
                this.interrupted = false;
            } else {
                if (this.hasNextStep()) {
                    this.nextGridX = this.path[this.step + 1][0];
                    this.nextGridY = this.path[this.step + 1][1];
                }

                if (this.step_callback) {
                    this.step_callback();
                }

                if (this.hasChangedItsPath()) {
                    x = this.newDestination.x;
                    y = this.newDestination.y;
                    path = this.requestPathfindingTo(x, y);

                    this.newDestination = null;
                    if (path.length < 2) {
                        stop = true;
                    } else {
                        this.followPath(path);
                    }
                } else if (this.hasNextStep()) {
                    this.step += 1;
                    this.updateMovement();
                } else {
                    stop = true;
                }
            }

            if (stop) {
                // Path is complete or has been interrupted
                this.path = null;
                this.idle();

                if (this.stop_pathing_callback) {
                    this.stop_pathing_callback(this.gridX, this.gridY);
                }
            }
        }
    }

    onBeforeStep(callback) {
        this.before_step_callback = callback;
    }

    onStep(callback) {
        this.step_callback = callback;
    }

    isMoving() {
        return !(this.path === null);
    }

    hasNextStep() {
        return this.path.length - 1 > this.step;
    }

    hasChangedItsPath() {
        return !(this.newDestination === null);
    }

    isNear(character, distance) {
        var dx,
            dy,
            near = false;

        dx = Math.abs(this.gridX - character.gridX);
        dy = Math.abs(this.gridY - character.gridY);

        if (dx <= distance && dy <= distance) {
            near = true;
        }
        return near;
    }

    onAggro(callback) {
        this.aggro_callback = callback;
    }

    onCheckAggro(callback) {
        this.checkaggro_callback = callback;
    }

    checkAggro() {
        if (this.checkaggro_callback) {
            this.checkaggro_callback();
        }
    }

    aggro(character) {
        if (this.aggro_callback) {
            this.aggro_callback(character);
        }
    }

    onDeath(callback) {
        this.death_callback = callback;
    }

    /**
     * Changes the character's orientation so that it is facing its target.
     */
    lookAtTarget() {
        if (this.target) {
            this.turnTo(this.getOrientationTo(this.target));
        }
    }

    /**
     * Walks to the given position, abandoning anything being done now.
     */
    go(x, y) {
        if (this.isAttacking()) {
            this.disengage();
        } else if (this.followingMode) {
            this.followingMode = false;
            this.target = null;
        }
        this.moveTo_(x, y);
    }

    /**
     * Makes the character follow another one.
     */
    follow(entity) {
        if (entity) {
            this.followingMode = true;
            this.moveTo_(entity.gridX, entity.gridY);
        }
    }

    /**
     * Stops a moving character.
     */
    stop() {
        if (this.isMoving()) {
            this.interrupted = true;
        }
    }

    /**
     * Makes the character attack another character. Same as Character.follow but with an auto-attacking behavior.
     * @see Character.follow
     */
    engage(character) {
        this.attackingMode = true;
        this.setTarget(character);
        this.follow(character);
    }

    disengage() {
        this.attackingMode = false;
        this.followingMode = false;
        this.removeTarget();
    }

    /**
     * Returns true if the character is currently attacking.
     */
    isAttacking() {
        return this.attackingMode;
    }

    /**
     * Gets the right orientation to face a target character from the current position.
     * Note:
     * In order to work properly, this method should be used in the following
     * situation :
     *    S
     *  S T S
     *    S
     * (where S is self, T is target character)
     *
     * @param {Character} character The character to face.
     * @returns {string} The orientation.
     */
    getOrientationTo(character) {
        if (this.gridX < character.gridX) {
            return Orientations.RIGHT;
        } else if (this.gridX > character.gridX) {
            return Orientations.LEFT;
        } else if (this.gridY > character.gridY) {
            return Orientations.UP;
        } else {
            return Orientations.DOWN;
        }
    }

    /**
     * Returns true if this character is currently attacked by a given character.
     * @param {Character} character The attacking character.
     * @returns {boolean} Whether this is an attacker of this character.
     */
    isAttackedBy(character) {
        return character.id in this.attackers;
    }

    /**
     * Registers a character as a current attacker of this one.
     * @param {Character} character The attacking character.
     */
    addAttacker(character) {
        if (!this.isAttackedBy(character)) {
            this.attackers[character.id] = character;
        } else {
            log.error(this.id + " is already attacked by " + character.id);
        }
    }

    /**
     * Unregisters a character as a current attacker of this one.
     * @param {Character} character The attacking character.
     */
    removeAttacker(character) {
        if (this.isAttackedBy(character)) {
            delete this.attackers[character.id];
        } else {
            log.error(this.id + " is not attacked by " + character.id);
        }
    }

    /**
     * Loops through all the characters currently attacking this one.
     * @param {Function} callback Function which must accept one character argument.
     */
    forEachAttacker(callback) {
        forEach(this.attackers, (attacker) => callback(attacker));
    }

    /**
     * Sets this character's attack target. It can only have one target at any time.
     * @param {Character} character The target character.
     */
    setTarget(character) {
        if (this.target !== character) {
            // If it's not already set as the target
            if (this.hasTarget()) {
                this.removeTarget(); // Cleanly remove the previous one
            }
            this.unconfirmedTarget = null;
            this.target = character;
        } else {
            log.debug(character.id + " is already the target of " + this.id);
        }
    }

    /**
     * Removes the current attack target.
     */
    removeTarget() {
        if (this.target) {
            if (this.target instanceof Character) {
                this.target.removeAttacker(this);
            }
            this.target = null;
        }
    }

    /**
     * Returns true if this character has a current attack target.
     * @returns {boolean} Whether this character has a target.
     */
    hasTarget() {
        return !(this.target === null);
    }

    /**
     * Marks this character as waiting to attack a target.
     * By sending an "attack" message, the server will later confirm (or not)
     * that this character is allowed to acquire this target.
     *
     * @param {Character} character The target character
     */
    waitToAttack(character) {
        this.unconfirmedTarget = character;
    }

    /**
     * Returns true if this character is currently waiting to attack the target character.
     * @param {Character} character The target character.
     * @returns {boolean} Whether this character is waiting to attack.
     */
    isWaitingToAttack(character) {
        return this.unconfirmedTarget === character;
    }

    canAttack(time) {
        if (this.canReachTarget() && this.attackCooldown.isOver(time)) {
            return true;
        }
        return false;
    }

    canReachTarget() {
        if (this.hasTarget() && this.isAdjacentNonDiagonal(this.target)) {
            return true;
        }
        return false;
    }

    die() {
        this.removeTarget();
        this.isDead = true;

        if (this.death_callback) {
            this.death_callback();
        }
    }

    onHasMoved(callback) {
        this.hasmoved_callback = callback;
    }

    hasMoved() {
        this.setDirty();
        if (this.hasmoved_callback) {
            this.hasmoved_callback(this);
        }
    }

    hurt() {
        this.stopHurting();
        this.sprite = this.hurtSprite;
        this.hurting = setTimeout(this.stopHurting.bind(this), 75);
    }

    stopHurting() {
        this.sprite = this.normalSprite;
        clearTimeout(this.hurting);
    }

    setAttackRate(rate) {
        this.attackCooldown = new Timer(rate);
    }
}
