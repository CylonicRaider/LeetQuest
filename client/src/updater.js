import { Orientations } from "../../shared/js/gametypes.js";

import Character from "./character.js";
import Timer from "./timer.js";

export default class Updater {
    constructor(game) {
        this.game = game;
        this.playerAggroTimer = new Timer(1000);
    }

    update() {
        this.updateZoning();
        this.updateCharacters();
        this.updatePlayerAggro();
        this.updateTransitions();
        this.updateAnimations();
        this.updateAnimatedTiles();
        this.updateChatBubbles();
        this.updateInfos();
    }

    updateCharacters() {
        this.game.forEachEntity((entity) => {
            var isCharacter = entity instanceof Character;

            if (entity.isLoaded) {
                if (isCharacter) {
                    this.updateCharacter(entity);
                    this.game.onCharacterUpdate(entity);
                }
                this.updateEntityFading(entity);
            }
        });
    }

    updatePlayerAggro() {
        var t = this.game.currentTime,
            player = this.game.player;

        // Check player aggro every 1s when not moving nor attacking
        if (
            player &&
            !player.isMoving() &&
            !player.isAttacking() &&
            this.playerAggroTimer.isOver(t)
        ) {
            player.checkAggro();
        }
    }

    updateEntityFading(entity) {
        if (entity && entity.isFading) {
            var duration = 1000,
                t = this.game.currentTime,
                dt = t - entity.startFadingTime;

            if (dt > duration) {
                this.isFading = false;
                entity.fadingAlpha = 1;
            } else {
                entity.fadingAlpha = dt / duration;
            }
        }
    }

    updateTransitions() {
        var zoning = this.game.currentZoning;

        this.game.forEachEntity((entity) => {
            const movement = entity.movement;
            if (movement) {
                if (movement.inProgress) {
                    movement.step(this.game.currentTime);
                }
            }
        });

        if (zoning) {
            if (zoning.inProgress) {
                zoning.step(this.game.currentTime);
            }
        }
    }

    updateZoning() {
        const game = this.game,
            camera = game.camera,
            zoning = game.currentZoning,
            s = 3,
            ts = 16,
            speed = 500;

        if (zoning && zoning.inProgress === false) {
            var orientation = this.game.zoningOrientation,
                startValue = 0,
                endValue = 0,
                offset = 0,
                updateFunc = null,
                endFunc = null;

            if (
                orientation === Orientations.LEFT ||
                orientation === Orientations.RIGHT
            ) {
                offset = (camera.gridW - 2) * ts;
                startValue =
                    orientation === Orientations.LEFT
                        ? camera.x - ts
                        : camera.x + ts;
                endValue =
                    orientation === Orientations.LEFT
                        ? camera.x - offset
                        : camera.x + offset;
                updateFunc = (x) => {
                    camera.setPosition(x, camera.y);
                    game.initAnimatedTiles();
                    game.renderer.renderStaticCanvases();
                };
                endFunc = () => {
                    camera.setPosition(zoning.endValue, camera.y);
                    game.endZoning();
                };
            } else if (
                orientation === Orientations.UP ||
                orientation === Orientations.DOWN
            ) {
                offset = (camera.gridH - 2) * ts;
                startValue =
                    orientation === Orientations.UP
                        ? camera.y - ts
                        : camera.y + ts;
                endValue =
                    orientation === Orientations.UP
                        ? camera.y - offset
                        : camera.y + offset;
                updateFunc = (y) => {
                    camera.setPosition(camera.x, y);
                    game.initAnimatedTiles();
                    game.renderer.renderStaticCanvases();
                };
                endFunc = () => {
                    camera.setPosition(camera.x, zoning.endValue);
                    game.endZoning();
                };
            }

            zoning.start(
                this.game.currentTime,
                updateFunc,
                endFunc,
                startValue,
                endValue,
                speed,
            );
        }
    }

    updateCharacter(c) {
        // Estimate of the movement distance for one update
        var tick = Math.round(
            16 / Math.round(c.moveSpeed / (1000 / this.game.renderer.FPS)),
        );

        if (c.isMoving() && c.movement.inProgress === false) {
            if (c.orientation === Orientations.LEFT) {
                c.movement.start(
                    this.game.currentTime,
                    (x) => {
                        c.x = x;
                        c.hasMoved();
                    },
                    () => {
                        c.x = c.movement.endValue;
                        c.hasMoved();
                        c.nextStep();
                    },
                    c.x - tick,
                    c.x - 16,
                    c.moveSpeed,
                );
            } else if (c.orientation === Orientations.RIGHT) {
                c.movement.start(
                    this.game.currentTime,
                    (x) => {
                        c.x = x;
                        c.hasMoved();
                    },
                    () => {
                        c.x = c.movement.endValue;
                        c.hasMoved();
                        c.nextStep();
                    },
                    c.x + tick,
                    c.x + 16,
                    c.moveSpeed,
                );
            } else if (c.orientation === Orientations.UP) {
                c.movement.start(
                    this.game.currentTime,
                    (y) => {
                        c.y = y;
                        c.hasMoved();
                    },
                    () => {
                        c.y = c.movement.endValue;
                        c.hasMoved();
                        c.nextStep();
                    },
                    c.y - tick,
                    c.y - 16,
                    c.moveSpeed,
                );
            } else if (c.orientation === Orientations.DOWN) {
                c.movement.start(
                    this.game.currentTime,
                    (y) => {
                        c.y = y;
                        c.hasMoved();
                    },
                    () => {
                        c.y = c.movement.endValue;
                        c.hasMoved();
                        c.nextStep();
                    },
                    c.y + tick,
                    c.y + 16,
                    c.moveSpeed,
                );
            }
        }
    }

    updateAnimations() {
        const time = this.game.currentTime;

        this.game.forEachEntity((entity) => {
            const anim = entity.currentAnimation;

            if (anim) {
                if (anim.update(time)) {
                    entity.setDirty();
                }
            }
        });

        const sparks = this.game.sparksAnimation;
        if (sparks) {
            sparks.update(time);
        }

        const target = this.game.targetAnimation;
        if (target) {
            target.update(time);
        }
    }

    updateAnimatedTiles() {
        const time = this.game.currentTime;

        this.game.forEachAnimatedTile((tile) => {
            if (tile.animate(time)) {
                tile.isDirty = true;
                tile.dirtyRect = this.game.renderer.getTileBoundingRect(tile);

                if (this.game.renderer.mobile || this.game.renderer.tablet) {
                    this.game.checkOtherDirtyRects(
                        tile.dirtyRect,
                        tile,
                        tile.x,
                        tile.y,
                    );
                }
            }
        });
    }

    updateChatBubbles() {
        this.game.bubbleManager.update(this.game.currentTime);
    }

    updateInfos() {
        this.game.infoManager.update(this.game.currentTime);
    }
}
