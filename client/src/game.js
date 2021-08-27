import forEach from "lodash-es/forEach.js";
import includes from "lodash-es/includes.js";
import isArray from "lodash-es/isArray.js";
import isNaN from "lodash-es/isNaN.js";
import isNull from "lodash-es/isNull.js";
import keys from "lodash-es/keys.js";
import map from "lodash-es/map.js";
import size from "lodash-es/size.js";
import some from "lodash-es/some.js";

import * as Types from "../../shared/js/gametypes.js";
import { Orientations, Entities } from "../../shared/js/gametypes.js";

import Animation from "./animation.js";
import AudioManager from "./audio.js";
import BubbleManager from "./bubble.js";
import Character from "./character.js";
import Chest from "./chest.js";
import config from "./config.js";
import { LootException } from "./exceptions.js";
import GameClient from "./gameclient.js";
import InfoManager from "./infomanager.js";
import Item from "./item.js";
import log from "./lib/log.js";
import WorldMap from "./map.js";
import Mob from "./mob.js";
import Mobs from "./mobs.js";
import Npc from "./npc.js";
import Pathfinder from "./pathfinder.js";
import Player from "./player.js";
import Renderer from "./renderer.js";
import Sprite from "./sprite.js";
import AnimatedTile from "./tile.js";
import Transition from "./transition.js";
import Updater from "./updater.js";
import { requestAnimFrame } from "./util.js";
import Warrior from "./warrior.js";

export default class Game {
    constructor(app) {
        this.app = app;
        this.app.config = config; // TODO: consider using the config when connecting directly, instead of through this instance property
        this.ready = false;
        this.started = false;
        this.hasNeverStarted = true;

        this.renderer = null;
        this.updater = null;
        this.pathfinder = null;
        this.chatinput = null;
        this.bubbleManager = null;
        this.audioManager = null;

        // Player
        this.player = new Warrior("player", "");

        // Game state
        this.entities = new Map();
        this.obsoleteEntities = new Set();
        // TODO: use Maps instead of objects
        this.deathpositions = {};
        this.entityGrid = null;
        this.pathingGrid = null;
        this.renderingGrid = null;
        this.itemGrid = null;
        this.currentCursor = null;
        this.mouse = { x: 0, y: 0 };
        this.zoningQueue = [];
        this.previousClickPosition = {};

        this.selectedX = 0;
        this.selectedY = 0;
        this.selectedCellVisible = false;
        this.targetColor = "rgba(255, 255, 255, 0.5)";
        this.targetCellVisible = true;
        this.hoveringTarget = false;
        this.hoveringMob = false;
        this.hoveringItem = false;
        this.hoveringCollidingTile = false;

        // combat
        this.infoManager = new InfoManager(this);

        // zoning
        this.currentZoning = null;

        this.cursors = {};

        this.sprites = {};

        // tile animation
        this.animatedTiles = null;

        // debug
        this.debugPathing = false;

        // sprites
        this.spriteNames = [
            "hand",
            "sword",
            "loot",
            "target",
            "talk",
            "sparks",
            "shadow16",
            "rat",
            "skeleton",
            "skeleton2",
            "spectre",
            "boss",
            "deathknight",
            "ogre",
            "crab",
            "snake",
            "eye",
            "bat",
            "goblin",
            "wizard",
            "guard",
            "king",
            "villagegirl",
            "villager",
            "coder",
            "agent",
            "rick",
            "scientist",
            "nyan",
            "priest",
            "sorcerer",
            "octocat",
            "beachnpc",
            "forestnpc",
            "desertnpc",
            "lavanpc",
            "clotharmor",
            "leatherarmor",
            "mailarmor",
            "platearmor",
            "redarmor",
            "goldenarmor",
            "firefox",
            "death",
            "sword1",
            "axe",
            "chest",
            "sword2",
            "redsword",
            "bluesword",
            "goldensword",
            "item-sword2",
            "item-axe",
            "item-redsword",
            "item-bluesword",
            "item-goldensword",
            "item-leatherarmor",
            "item-mailarmor",
            "item-platearmor",
            "item-redarmor",
            "item-goldenarmor",
            "item-flask",
            "item-cake",
            "item-burger",
            "morningstar",
            "item-morningstar",
            "item-firepotion",
        ];
    }

    setup($bubbleContainer, canvas, background, foreground, input) {
        this.setBubbleManager(new BubbleManager($bubbleContainer));
        this.setRenderer(new Renderer(this, canvas, background, foreground));
        this.setChatInput(input);
    }

    setStorage(storage) {
        this.storage = storage;
    }

    setRenderer(renderer) {
        this.renderer = renderer;
    }

    setUpdater(updater) {
        this.updater = updater;
    }

    setPathfinder(pathfinder) {
        this.pathfinder = pathfinder;
    }

    setChatInput(element) {
        this.chatinput = element;
    }

    setBubbleManager(bubbleManager) {
        this.bubbleManager = bubbleManager;
    }

    loadMap() {
        this.map = new WorldMap(!this.renderer.upscaledRendering, this);

        this.map.ready(() => {
            log.info("Map loaded.");
            var tilesetIndex = this.renderer.upscaledRendering
                ? 0
                : this.renderer.scale - 1;
            this.renderer.setTileset(this.map.tilesets[tilesetIndex]);
        });
    }

    initPlayer() {
        if (this.storage.hasAlreadyPlayed()) {
            this.player.setSpriteName(this.storage.data.player.armor);
            this.player.setWeaponName(this.storage.data.player.weapon);
        }

        this.player.setSprite(this.sprites[this.player.getSpriteName()]);
        this.player.idle();

        log.debug("Finished initPlayer");
    }

    initShadows() {
        this.shadows = {};
        this.shadows["small"] = this.sprites["shadow16"];
    }

    initCursors() {
        this.cursors["hand"] = this.sprites["hand"];
        this.cursors["sword"] = this.sprites["sword"];
        this.cursors["loot"] = this.sprites["loot"];
        this.cursors["target"] = this.sprites["target"];
        this.cursors["arrow"] = this.sprites["arrow"];
        this.cursors["talk"] = this.sprites["talk"];
    }

    initAnimations() {
        this.targetAnimation = new Animation("idle_down", 4, 0, 16, 16);
        this.targetAnimation.setSpeed(50);

        this.sparksAnimation = new Animation("idle_down", 6, 0, 16, 16);
        this.sparksAnimation.setSpeed(120);
    }

    initHurtSprites() {
        Types.forEachArmorKind((_, kindName) => {
            this.sprites[kindName].createHurtSprite();
        });
    }

    initSilhouettes() {
        Types.forEachMobOrNpcKind((_, kindName) => {
            this.sprites[kindName].createSilhouette();
        });
        this.sprites["chest"].createSilhouette();
        this.sprites["item-cake"].createSilhouette();
    }

    initAchievements() {
        this.achievements = {
            A_TRUE_WARRIOR: {
                id: 1,
                name: "A True Warrior",
                desc: "Find a new weapon",
            },
            INTO_THE_WILD: {
                id: 2,
                name: "Into the Wild",
                desc: "Venture outside the village",
            },
            ANGRY_RATS: {
                id: 3,
                name: "Angry Rats",
                desc: "Kill 10 rats",
                isCompleted: () => this.storage.getRatCount() >= 10,
            },
            SMALL_TALK: {
                id: 4,
                name: "Small Talk",
                desc: "Talk to a non-player character",
            },
            FAT_LOOT: {
                id: 5,
                name: "Fat Loot",
                desc: "Get a new armor set",
            },
            UNDERGROUND: {
                id: 6,
                name: "Underground",
                desc: "Explore at least one cave",
            },
            AT_WORLDS_END: {
                id: 7,
                name: "At World's End",
                desc: "Reach the south shore",
            },
            COWARD: {
                id: 8,
                name: "Coward",
                desc: "Successfully escape an enemy",
            },
            TOMB_RAIDER: {
                id: 9,
                name: "Tomb Raider",
                desc: "Find the graveyard",
            },
            SKULL_COLLECTOR: {
                id: 10,
                name: "Skull Collector",
                desc: "Kill 10 skeletons",
                isCompleted: () => this.storage.getSkeletonCount() >= 10,
            },
            NINJA_LOOT: {
                id: 11,
                name: "Ninja Loot",
                desc: "Get hold of an item you didn't fight for",
            },
            NO_MANS_LAND: {
                id: 12,
                name: "No Man's Land",
                desc: "Travel through the desert",
            },
            HUNTER: {
                id: 13,
                name: "Hunter",
                desc: "Kill 50 enemies",
                isCompleted: () => this.storage.getTotalKills() >= 50,
            },
            STILL_ALIVE: {
                id: 14,
                name: "Still Alive",
                desc: "Revive your character five times",
                isCompleted: () => this.storage.getTotalRevives() >= 5,
            },
            MEATSHIELD: {
                id: 15,
                name: "Meatshield",
                desc: "Take 5,000 points of damage",
                isCompleted: () => this.storage.getTotalDamageTaken() >= 5000,
            },
            HOT_SPOT: {
                id: 16,
                name: "Hot Spot",
                desc: "Enter the volcanic mountains",
            },
            HERO: {
                id: 17,
                name: "Hero",
                desc: "Defeat the final boss",
            },
            FOXY: {
                id: 18,
                name: "Foxy",
                desc: "Find the Firefox costume",
                hidden: true,
            },
            FOR_SCIENCE: {
                id: 19,
                name: "For Science",
                desc: "Enter into a portal",
                hidden: true,
            },
            RICKROLLD: {
                id: 20,
                name: "Rickroll'd",
                desc: "Take some singing lessons",
                hidden: true,
            },
        };

        forEach(this.achievements, (obj) => {
            if (!obj.isCompleted) {
                obj.isCompleted = () => true;
            }
            if (!obj.hidden) {
                obj.hidden = false;
            }
        });

        this.app.initAchievementList(this.achievements);

        if (this.storage.hasAlreadyPlayed()) {
            this.app.initUnlockedAchievements(
                this.storage.data.achievements.unlocked,
            );
        }
    }

    getAchievementById(id) {
        var found = null;
        forEach(this.achievements, (achievement) => {
            if (achievement.id === parseInt(id)) {
                found = achievement;
            }
        });
        return found;
    }

    loadSprite(name) {
        if (this.renderer.upscaledRendering) {
            this.spritesets[0][name] = new Sprite(name, 1);
        } else {
            this.spritesets[1][name] = new Sprite(name, 2);
            if (!this.renderer.mobile && !this.renderer.tablet) {
                this.spritesets[2][name] = new Sprite(name, 3);
            }
        }
    }

    setSpriteScale(scale) {
        if (this.renderer.upscaledRendering) {
            this.sprites = this.spritesets[0];
        } else {
            this.sprites = this.spritesets[scale - 1];

            this.entities.forEach((entity, _id, _map) => {
                entity.sprite = null;
                entity.setSprite(this.sprites[entity.getSpriteName()]);
            });
            this.initHurtSprites();
            this.initShadows();
            this.initCursors();
        }
    }

    loadSprites() {
        log.info("Loading sprites...");
        this.spritesets = [];
        this.spritesets[0] = {};
        this.spritesets[1] = {};
        this.spritesets[2] = {};
        map(this.spriteNames, this.loadSprite.bind(this));
    }

    spritesLoaded() {
        if (some(this.sprites, (sprite) => !sprite.isLoaded)) {
            return false;
        }
        return true;
    }

    setCursor(name, orientation) {
        if (name in this.cursors) {
            this.currentCursor = this.cursors[name];
            this.currentCursorOrientation = orientation;
        } else {
            log.error("Unknown cursor name :" + name);
        }
    }

    updateCursorLogic() {
        if (this.hoveringCollidingTile && this.started) {
            this.targetColor = "rgba(255, 50, 50, 0.5)";
        } else {
            this.targetColor = "rgba(255, 255, 255, 0.5)";
        }

        if (this.hoveringMob && this.started) {
            this.setCursor("sword");
            this.hoveringTarget = false;
            this.targetCellVisible = false;
        } else if (this.hoveringNpc && this.started) {
            this.setCursor("talk");
            this.hoveringTarget = false;
            this.targetCellVisible = false;
        } else if ((this.hoveringItem || this.hoveringChest) && this.started) {
            this.setCursor("loot");
            this.hoveringTarget = false;
            this.targetCellVisible = true;
        } else {
            this.setCursor("hand");
            this.hoveringTarget = false;
            this.targetCellVisible = true;
        }
    }

    focusPlayer() {
        this.renderer.camera.lookAt(this.player);
    }

    addEntity(entity) {
        if (!this.entities.has(entity.id)) {
            this.entities.set(entity.id, entity);
            this.registerEntityPosition(entity);

            if (
                !(entity instanceof Item && entity.wasDropped) &&
                !(this.renderer.mobile || this.renderer.tablet)
            ) {
                entity.fadeIn(this.currentTime);
            }

            if (this.renderer.mobile || this.renderer.tablet) {
                entity.onDirty((e) => {
                    if (this.camera.isVisible(e)) {
                        e.dirtyRect = this.renderer.getEntityBoundingRect(e);
                        this.checkOtherDirtyRects(
                            e.dirtyRect,
                            e,
                            e.gridX,
                            e.gridY,
                        );
                    }
                });
            }
        } else {
            log.error(
                "This entity already exists : " +
                    entity.id +
                    " (" +
                    entity.kind +
                    ")",
            );
        }
    }

    removeEntity(entity) {
        if (this.entities.has(entity.id)) {
            this.unregisterEntityPosition(entity);
            this.entities.delete(entity.id);
        } else {
            log.error("Cannot remove entity. Unknown ID : " + entity.id);
        }
    }

    addItem(item, x, y) {
        item.setSprite(this.sprites[item.getSpriteName()]);
        item.setGridPosition(x, y);
        item.setAnimation("idle", 150);
        this.addEntity(item);
    }

    removeItem(item) {
        if (item) {
            this.removeFromItemGrid(item, item.gridX, item.gridY);
            this.removeFromRenderingGrid(item, item.gridX, item.gridY);
            this.entities.delete(item.id);
        } else {
            log.error("Cannot remove item. Unknown ID : " + item.id);
        }
    }

    initPathingGrid() {
        this.pathingGrid = [];
        for (var i = 0; i < this.map.height; i += 1) {
            this.pathingGrid[i] = [];
            for (var j = 0; j < this.map.width; j += 1) {
                this.pathingGrid[i][j] = this.map.grid[i][j];
            }
        }
        log.info("Initialized the pathing grid with static colliding cells.");
    }

    initEntityGrid() {
        this.entityGrid = [];
        for (var i = 0; i < this.map.height; i += 1) {
            this.entityGrid[i] = [];
            for (var j = 0; j < this.map.width; j += 1) {
                this.entityGrid[i][j] = {};
            }
        }
        log.info("Initialized the entity grid.");
    }

    initRenderingGrid() {
        this.renderingGrid = [];
        for (var i = 0; i < this.map.height; i += 1) {
            this.renderingGrid[i] = [];
            for (var j = 0; j < this.map.width; j += 1) {
                this.renderingGrid[i][j] = {};
            }
        }
        log.info("Initialized the rendering grid.");
    }

    initItemGrid() {
        this.itemGrid = [];
        for (var i = 0; i < this.map.height; i += 1) {
            this.itemGrid[i] = [];
            for (var j = 0; j < this.map.width; j += 1) {
                this.itemGrid[i][j] = {};
            }
        }
        log.info("Initialized the item grid.");
    }

    /**
     *
     */
    initAnimatedTiles() {
        this.animatedTiles = [];
        this.forEachVisibleTile((id, index) => {
            if (this.map.isAnimatedTile(id)) {
                var tile = new AnimatedTile(
                        id,
                        this.map.getTileAnimationLength(id),
                        this.map.getTileAnimationDelay(id),
                        index,
                    ),
                    pos = this.map.tileIndexToGridPosition(tile.index);

                tile.x = pos.x;
                tile.y = pos.y;
                this.animatedTiles.push(tile);
            }
        }, 1);
        //log.info("Initialized animated tiles.");
    }

    addToRenderingGrid(entity, x, y) {
        if (!this.map.isOutOfBounds(x, y)) {
            this.renderingGrid[y][x][entity.id] = entity;
        }
    }

    removeFromRenderingGrid(entity, x, y) {
        if (
            entity &&
            this.renderingGrid[y][x] &&
            entity.id in this.renderingGrid[y][x]
        ) {
            delete this.renderingGrid[y][x][entity.id];
        }
    }

    removeFromEntityGrid(entity, x, y) {
        if (this.entityGrid[y][x][entity.id]) {
            delete this.entityGrid[y][x][entity.id];
        }
    }

    removeFromItemGrid(item, x, y) {
        if (item && this.itemGrid[y][x][item.id]) {
            delete this.itemGrid[y][x][item.id];
        }
    }

    removeFromPathingGrid(x, y) {
        this.pathingGrid[y][x] = 0;
    }

    /**
     * Registers the entity at two adjacent positions on the grid at the same time.
     * This situation is temporary and should only occur when the entity is moving.
     * This is useful for the hit testing algorithm used when hovering entities with the mouse cursor.
     *
     * @param {Entity} entity The moving entity
     */
    registerEntityDualPosition(entity) {
        if (entity) {
            this.entityGrid[entity.gridY][entity.gridX][entity.id] = entity;

            this.addToRenderingGrid(entity, entity.gridX, entity.gridY);

            if (entity.nextGridX >= 0 && entity.nextGridY >= 0) {
                this.entityGrid[entity.nextGridY][entity.nextGridX][entity.id] =
                    entity;
                if (!(entity instanceof Player)) {
                    this.pathingGrid[entity.nextGridY][entity.nextGridX] = 1;
                }
            }
        }
    }

    /**
     * Clears the position(s) of this entity in the entity grid.
     *
     * @param {Entity} entity The moving entity
     */
    unregisterEntityPosition(entity) {
        if (entity) {
            this.removeFromEntityGrid(entity, entity.gridX, entity.gridY);
            this.removeFromPathingGrid(entity.gridX, entity.gridY);

            this.removeFromRenderingGrid(entity, entity.gridX, entity.gridY);

            if (entity.nextGridX >= 0 && entity.nextGridY >= 0) {
                this.removeFromEntityGrid(
                    entity,
                    entity.nextGridX,
                    entity.nextGridY,
                );
                this.removeFromPathingGrid(entity.nextGridX, entity.nextGridY);
            }
        }
    }

    registerEntityPosition(entity) {
        var x = entity.gridX,
            y = entity.gridY;

        if (entity) {
            if (entity instanceof Character || entity instanceof Chest) {
                this.entityGrid[y][x][entity.id] = entity;
                if (!(entity instanceof Player)) {
                    this.pathingGrid[y][x] = 1;
                }
            }
            if (entity instanceof Item) {
                this.itemGrid[y][x][entity.id] = entity;
            }

            this.addToRenderingGrid(entity, x, y);
        }
    }

    setServerOptions(host, port, username) {
        this.host = host;
        this.port = port;
        this.username = username;
    }

    loadAudio() {
        this.audioManager = new AudioManager(this);
    }

    initMusicAreas() {
        forEach(this.map.musicAreas, (area) => {
            this.audioManager.addArea(area.x, area.y, area.w, area.h, area.id);
        });
    }

    run(started_callback) {
        this.loadSprites();
        this.setUpdater(new Updater(this));
        this.camera = this.renderer.camera;

        this.setSpriteScale(this.renderer.scale);

        let wait;
        wait = setInterval(() => {
            if (this.map.isLoaded && this.spritesLoaded()) {
                this.ready = true;
                log.debug("All sprites loaded.");

                this.loadAudio();

                this.initMusicAreas();
                this.initAchievements();
                this.initCursors();
                this.initAnimations();
                this.initShadows();
                this.initHurtSprites();

                if (
                    !this.renderer.mobile &&
                    !this.renderer.tablet &&
                    this.renderer.upscaledRendering
                ) {
                    this.initSilhouettes();
                }

                this.initEntityGrid();
                this.initItemGrid();
                this.initPathingGrid();
                this.initRenderingGrid();

                this.setPathfinder(
                    new Pathfinder(this.map.width, this.map.height),
                );

                this.initPlayer();
                this.setCursor("hand");

                this.connect(started_callback);

                clearInterval(wait);
            }
        }, 100);
    }

    tick() {
        this.currentTime = new Date().getTime();

        if (this.started) {
            this.updateCursorLogic();
            this.updater.update();
            this.renderer.renderFrame();
        }

        if (!this.isStopped) {
            requestAnimFrame(this.tick.bind(this));
        }
    }

    start() {
        this.tick();
        this.hasNeverStarted = false;
        log.info("Game loop started.");
    }

    stop() {
        log.info("Game stopped.");
        this.isStopped = true;
    }

    entityIdExists(id) {
        return this.entities.has(id);
    }

    getEntityById(id) {
        if (this.entities.has(id)) {
            return this.entities.get(id);
        } else {
            log.error("Unknown entity id : " + id);
        }
    }

    connect(started_callback) {
        this.client = new GameClient(this.host, this.port);

        // a dispatcher allows load-balancing clients to different servers;
        // since the game server (now) includes a trivial embedded dispatcher,
        // there is little use to set this to anything other than true
        this.client.connect(this.app.config.dispatcher);

        this.client.onDispatched((host, port) => {
            this.client.host = host;
            this.client.port = port;
            this.client.connect(); // connect to actual game server
        });

        this.client.onConnected(() => {
            log.info("Starting client/server handshake");

            this.player.name = this.username;
            this.started = true;

            this.sendHello(this.player);
        });

        this.client.onEntityList((list) => {
            const retainedIds = new Set();
            const newIds = new Set();

            list.forEach((id) => {
                (this.entities.has(id) ? retainedIds : newIds).add(id);
            });

            this.obsoleteEntities.clear();
            this.entities.forEach((entity, id, _map) => {
                if (!retainedIds.has(id) && id !== this.player.id) {
                    this.obsoleteEntities.add(entity);
                }
            });

            // Destroy entities outside of the player's zone group
            this.removeObsoleteEntities();

            // Ask the server for spawn information about unknown entities
            if (newIds.size > 0) {
                this.client.sendWho(Array.from(newIds));
            }
        });

        this.client.onWelcome((id, name, x, y, hp) => {
            log.info("Received player ID from server : " + id);
            this.player.id = id;
            this.playerId = id;
            // Always accept name received from the server which will
            // sanitize and shorten names exceeding the allowed length.
            this.player.name = name;
            this.player.setGridPosition(x, y);
            this.player.setMaxHitPoints(hp);

            this.updateBars();
            this.resetCamera();
            this.updatePlateauMode();
            this.audioManager.updateMusic();

            this.addEntity(this.player);
            this.player.dirtyRect = this.renderer.getEntityBoundingRect(
                this.player,
            );

            setTimeout(() => {
                this.tryUnlockingAchievement("STILL_ALIVE");
            }, 1500);

            if (!this.storage.hasAlreadyPlayed()) {
                this.storage.initPlayer(this.player.name);
                this.storage.savePlayer(
                    this.renderer.getPlayerImage(),
                    this.player.getSpriteName(),
                    this.player.getWeaponName(),
                );
                this.showNotification("Welcome to BrowserQuest!");
            } else {
                this.showNotification("Welcome back to BrowserQuest!");
                this.storage.setPlayerName(name);
            }

            this.player.onStartPathing((path) => {
                var i = path.length - 1,
                    x = path[i][0],
                    y = path[i][1];

                if (this.player.isMovingToLoot()) {
                    this.player.isLootMoving = false;
                } else if (!this.player.isAttacking()) {
                    this.client.sendMove(x, y);
                }

                // Target cursor position
                this.selectedX = x;
                this.selectedY = y;
                this.selectedCellVisible = true;

                if (this.renderer.mobile || this.renderer.tablet) {
                    this.drawTarget = true;
                    this.clearTarget = true;
                    this.renderer.targetRect =
                        this.renderer.getTargetBoundingRect();
                    this.checkOtherDirtyRects(
                        this.renderer.targetRect,
                        null,
                        this.selectedX,
                        this.selectedY,
                    );
                }
            });

            this.player.onCheckAggro(() => {
                this.forEachMob((mob) => {
                    if (
                        mob.isAggressive &&
                        !mob.isAttacking() &&
                        this.player.isNear(mob, mob.aggroRange)
                    ) {
                        this.player.aggro(mob);
                    }
                });
            });

            this.player.onAggro((mob) => {
                if (
                    !mob.isWaitingToAttack(this.player) &&
                    !this.player.isAttackedBy(mob)
                ) {
                    this.player.log_info(
                        "Aggroed by " +
                            mob.id +
                            " at (" +
                            this.player.gridX +
                            ", " +
                            this.player.gridY +
                            ")",
                    );
                    this.client.sendAggro(mob);
                    mob.waitToAttack(this.player);
                }
            });

            this.player.onBeforeStep(() => {
                var blockingEntity = this.getEntityAt(
                    this.player.nextGridX,
                    this.player.nextGridY,
                );
                if (blockingEntity && blockingEntity.id !== this.playerId) {
                    log.debug("Blocked by " + blockingEntity.id);
                }
                this.unregisterEntityPosition(this.player);
            });

            this.player.onStep(() => {
                if (this.player.hasNextStep()) {
                    this.registerEntityDualPosition(this.player);
                }

                if (this.isZoningTile(this.player.gridX, this.player.gridY)) {
                    this.enqueueZoningFrom(
                        this.player.gridX,
                        this.player.gridY,
                    );
                }

                this.player.forEachAttacker((attacker) => {
                    if (attacker.isAdjacent(attacker.target)) {
                        attacker.lookAtTarget();
                    } else {
                        attacker.follow(this.player);
                    }
                });

                if (
                    (this.player.gridX <= 85 &&
                        this.player.gridY <= 179 &&
                        this.player.gridY > 178) ||
                    (this.player.gridX <= 85 &&
                        this.player.gridY <= 266 &&
                        this.player.gridY > 265)
                ) {
                    this.tryUnlockingAchievement("INTO_THE_WILD");
                }

                if (
                    this.player.gridX <= 85 &&
                    this.player.gridY <= 293 &&
                    this.player.gridY > 292
                ) {
                    this.tryUnlockingAchievement("AT_WORLDS_END");
                }

                if (
                    this.player.gridX <= 85 &&
                    this.player.gridY <= 100 &&
                    this.player.gridY > 99
                ) {
                    this.tryUnlockingAchievement("NO_MANS_LAND");
                }

                if (
                    this.player.gridX <= 85 &&
                    this.player.gridY <= 51 &&
                    this.player.gridY > 50
                ) {
                    this.tryUnlockingAchievement("HOT_SPOT");
                }

                if (
                    this.player.gridX <= 27 &&
                    this.player.gridY <= 123 &&
                    this.player.gridY > 112
                ) {
                    this.tryUnlockingAchievement("TOMB_RAIDER");
                }

                this.updatePlayerCheckpoint();

                if (!this.player.isDead) {
                    this.audioManager.updateMusic();
                }
            });

            this.player.onStopPathing((x, y) => {
                if (this.player.hasTarget()) {
                    this.player.lookAtTarget();
                }

                this.selectedCellVisible = false;

                if (this.isItemAt(x, y)) {
                    var item = this.getItemAt(x, y);

                    try {
                        this.player.loot(item);
                        this.client.sendLoot(item); // Notify the server that this item has been looted
                        this.removeItem(item);
                        this.showNotification(item.getLootMessage());

                        if (item.type === "armor") {
                            this.tryUnlockingAchievement("FAT_LOOT");
                        }

                        if (item.type === "weapon") {
                            this.tryUnlockingAchievement("A_TRUE_WARRIOR");
                        }

                        if (item.kind === Entities.CAKE) {
                            this.tryUnlockingAchievement("FOR_SCIENCE");
                        }

                        if (item.kind === Entities.FIREPOTION) {
                            this.tryUnlockingAchievement("FOXY");
                            this.audioManager.playSound("firefox");
                        }

                        if (Types.isHealingItem(item.kind)) {
                            this.audioManager.playSound("heal");
                        } else {
                            this.audioManager.playSound("loot");
                        }

                        if (
                            item.wasDropped &&
                            !includes(item.playersInvolved, this.playerId)
                        ) {
                            this.tryUnlockingAchievement("NINJA_LOOT");
                        }
                    } catch (e) {
                        if (e instanceof LootException) {
                            this.showNotification(e.message);
                            this.audioManager.playSound("noloot");
                        } else {
                            throw e;
                        }
                    }
                }

                if (!this.player.hasTarget() && this.map.isDoor(x, y)) {
                    var dest = this.map.getDoorDestination(x, y);

                    this.player.setGridPosition(dest.x, dest.y);
                    this.player.nextGridX = dest.x;
                    this.player.nextGridY = dest.y;
                    this.player.turnTo(dest.orientation);
                    this.client.sendTeleport(dest.x, dest.y);

                    if (this.renderer.mobile && dest.cameraX && dest.cameraY) {
                        this.camera.setGridPosition(dest.cameraX, dest.cameraY);
                        this.resetZone();
                    } else {
                        if (dest.portal) {
                            this.assignBubbleTo(this.player);
                        } else {
                            this.camera.focusEntity(this.player);
                            this.resetZone();
                        }
                    }

                    if (size(this.player.attackers) > 0) {
                        setTimeout(() => {
                            this.tryUnlockingAchievement("COWARD");
                        }, 500);
                    }
                    this.player.forEachAttacker((attacker) => {
                        attacker.disengage();
                        attacker.idle();
                    });

                    this.updatePlateauMode();

                    this.checkUndergroundAchievement();

                    if (this.renderer.mobile || this.renderer.tablet) {
                        // When rendering with dirty rects, clear the whole screen when entering a door.
                        this.renderer.clearScreen(this.renderer.context);
                    }

                    if (dest.portal) {
                        this.audioManager.playSound("teleport");
                    }

                    if (!this.player.isDead) {
                        this.audioManager.updateMusic();
                    }
                }

                if (this.player.target instanceof Npc) {
                    this.makeNpcTalk(this.player.target);
                } else if (this.player.target instanceof Chest) {
                    this.client.sendOpen(this.player.target);
                    this.audioManager.playSound("chest");
                }

                this.player.forEachAttacker((attacker) => {
                    if (!attacker.isAdjacentNonDiagonal(this.player)) {
                        attacker.follow(this.player);
                    }
                });

                this.unregisterEntityPosition(this.player);
                this.registerEntityPosition(this.player);
            });

            this.player.onRequestPath((x, y) => {
                var ignored = [this.player]; // Always ignore self

                if (this.player.hasTarget()) {
                    ignored.push(this.player.target);
                }
                return this.findPath(this.player, x, y, ignored);
            });

            this.player.onDeath(() => {
                log.info(this.playerId + " is dead");

                this.player.stopBlinking();
                this.player.setSprite(this.sprites["death"]);
                this.player.animate("death", 120, 1, () => {
                    log.info(this.playerId + " was removed");

                    this.removeEntity(this.player);
                    this.removeFromRenderingGrid(
                        this.player,
                        this.player.gridX,
                        this.player.gridY,
                    );

                    this.player = null;
                    this.client.disable();

                    setTimeout(() => {
                        this.playerdeath_callback();
                    }, 1000);
                });

                this.player.forEachAttacker((attacker) => {
                    attacker.disengage();
                    attacker.idle();
                });

                this.audioManager.fadeOutCurrentMusic();
                this.audioManager.playSound("death");
            });

            this.player.onHasMoved((player) => {
                this.assignBubbleTo(player);
            });

            this.player.onArmorLoot((armorName) => {
                this.player.switchArmor(this.sprites[armorName]);
            });

            this.player.onSwitchItem(() => {
                this.storage.savePlayer(
                    this.renderer.getPlayerImage(),
                    this.player.getArmorName(),
                    this.player.getWeaponName(),
                );
                if (this.equipment_callback) {
                    this.equipment_callback();
                }
            });

            this.player.onInvincible(() => {
                this.invincible_callback();
                this.player.switchArmor(this.sprites["firefox"]);
            });

            this.client.onSpawnItem((item, x, y) => {
                log.info(
                    `Spawned ${Types.getKindAsString(item.kind)} (${
                        item.id
                    }) at ${x}, ${y}`,
                );
                this.addItem(item, x, y);
            });

            this.client.onSpawnChest((chest, x, y) => {
                log.info(`Spawned chest (${chest.id}) at ${x}, ${y}`);
                chest.setSprite(this.sprites[chest.getSpriteName()]);
                chest.setGridPosition(x, y);
                chest.setAnimation("idle_down", 150);
                this.addEntity(chest, x, y);

                chest.onOpen(() => {
                    chest.stopBlinking();
                    chest.setSprite(this.sprites["death"]);
                    chest.setAnimation("death", 120, 1, () => {
                        log.info(`${chest.id} was removed`);
                        this.removeEntity(chest);
                        this.removeFromRenderingGrid(
                            chest,
                            chest.gridX,
                            chest.gridY,
                        );
                        this.previousClickPosition = {};
                    });
                });
            });

            this.client.onSpawnCharacter(
                (entity, x, y, orientation, targetId) => {
                    if (!this.entityIdExists(entity.id)) {
                        try {
                            if (entity.id !== this.playerId) {
                                entity.setSprite(
                                    this.sprites[entity.getSpriteName()],
                                );
                                entity.setGridPosition(x, y);
                                entity.setOrientation(orientation);
                                entity.idle();

                                this.addEntity(entity);

                                log.debug(
                                    "Spawned " +
                                        Types.getKindAsString(entity.kind) +
                                        " (" +
                                        entity.id +
                                        ") at " +
                                        entity.gridX +
                                        ", " +
                                        entity.gridY,
                                );

                                if (entity instanceof Character) {
                                    entity.onBeforeStep(() => {
                                        this.unregisterEntityPosition(entity);
                                    });

                                    entity.onStep(() => {
                                        if (!entity.isDying) {
                                            this.registerEntityDualPosition(
                                                entity,
                                            );

                                            entity.forEachAttacker(
                                                (attacker) => {
                                                    if (
                                                        attacker.isAdjacent(
                                                            attacker.target,
                                                        )
                                                    ) {
                                                        attacker.lookAtTarget();
                                                    } else {
                                                        attacker.follow(entity);
                                                    }
                                                },
                                            );
                                        }
                                    });

                                    entity.onStopPathing(() => {
                                        if (!entity.isDying) {
                                            if (
                                                entity.hasTarget() &&
                                                entity.isAdjacent(entity.target)
                                            ) {
                                                entity.lookAtTarget();
                                            }

                                            if (entity instanceof Player) {
                                                var gridX =
                                                        entity.destination
                                                            .gridX,
                                                    gridY =
                                                        entity.destination
                                                            .gridY;

                                                if (
                                                    this.map.isDoor(
                                                        gridX,
                                                        gridY,
                                                    )
                                                ) {
                                                    var dest =
                                                        this.map.getDoorDestination(
                                                            gridX,
                                                            gridY,
                                                        );
                                                    entity.setGridPosition(
                                                        dest.x,
                                                        dest.y,
                                                    );
                                                }
                                            }

                                            entity.forEachAttacker(
                                                (attacker) => {
                                                    if (
                                                        !attacker.isAdjacentNonDiagonal(
                                                            entity,
                                                        ) &&
                                                        attacker.id !==
                                                            this.playerId
                                                    ) {
                                                        attacker.follow(entity);
                                                    }
                                                },
                                            );

                                            this.unregisterEntityPosition(
                                                entity,
                                            );
                                            this.registerEntityPosition(entity);
                                        }
                                    });

                                    entity.onRequestPath((x, y) => {
                                        var ignored = [entity], // Always ignore self
                                            ignoreTarget = (target) => {
                                                ignored.push(target);

                                                // also ignore other attackers of the target entity
                                                target.forEachAttacker(
                                                    (attacker) => {
                                                        ignored.push(attacker);
                                                    },
                                                );
                                            };

                                        if (entity.hasTarget()) {
                                            ignoreTarget(entity.target);
                                        } else if (entity.previousTarget) {
                                            // If repositioning before attacking again, ignore previous target
                                            // See: tryMovingToADifferentTile()
                                            ignoreTarget(entity.previousTarget);
                                        }

                                        return this.findPath(
                                            entity,
                                            x,
                                            y,
                                            ignored,
                                        );
                                    });

                                    entity.onDeath(() => {
                                        log.info(`${entity.id} is dead`);

                                        if (entity instanceof Mob) {
                                            // Keep track of where mobs die in order to spawn their dropped items
                                            // at the right position later.
                                            this.deathpositions[entity.id] = {
                                                x: entity.gridX,
                                                y: entity.gridY,
                                            };
                                        }

                                        entity.isDying = true;
                                        entity.setSprite(
                                            this.sprites[
                                                entity instanceof Mobs.Rat
                                                    ? "rat"
                                                    : "death"
                                            ],
                                        );
                                        entity.animate("death", 120, 1, () => {
                                            log.info(
                                                `${entity.id} was removed`,
                                            );

                                            this.removeEntity(entity);
                                            this.removeFromRenderingGrid(
                                                entity,
                                                entity.gridX,
                                                entity.gridY,
                                            );
                                        });

                                        entity.forEachAttacker((attacker) => {
                                            attacker.disengage();
                                        });

                                        if (
                                            this.player.target &&
                                            this.player.target.id === entity.id
                                        ) {
                                            this.player.disengage();
                                        }

                                        // Upon death, this entity is removed from both grids, allowing the player
                                        // to click very fast in order to loot the dropped item and not be blocked.
                                        // The entity is completely removed only after the death animation has ended.
                                        this.removeFromEntityGrid(
                                            entity,
                                            entity.gridX,
                                            entity.gridY,
                                        );
                                        this.removeFromPathingGrid(
                                            entity.gridX,
                                            entity.gridY,
                                        );

                                        if (this.camera.isVisible(entity)) {
                                            this.audioManager.playSound(
                                                "kill" +
                                                    Math.floor(
                                                        Math.random() * 2 + 1,
                                                    ),
                                            );
                                        }

                                        this.updateCursor();
                                    });

                                    entity.onHasMoved((entity) => {
                                        this.assignBubbleTo(entity); // Make chat bubbles follow moving entities
                                    });

                                    if (entity instanceof Mob) {
                                        if (targetId) {
                                            var player =
                                                this.getEntityById(targetId);
                                            if (player) {
                                                this.createAttackLink(
                                                    entity,
                                                    player,
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            log.error(e);
                        }
                    } else {
                        log.debug(
                            "Character " +
                                entity.id +
                                " already exists. Don't respawn.",
                        );
                    }
                },
            );

            this.client.onDespawnEntity((entityId) => {
                var entity = this.getEntityById(entityId);

                if (entity) {
                    log.info(
                        "Despawning " +
                            Types.getKindAsString(entity.kind) +
                            " (" +
                            entity.id +
                            ")",
                    );

                    if (
                        entity.gridX === this.previousClickPosition.x &&
                        entity.gridY === this.previousClickPosition.y
                    ) {
                        this.previousClickPosition = {};
                    }

                    if (entity instanceof Item) {
                        this.removeItem(entity);
                    } else if (entity instanceof Character) {
                        entity.forEachAttacker((attacker) => {
                            if (attacker.canReachTarget()) {
                                attacker.hit();
                            }
                        });
                        entity.die();
                    } else if (entity instanceof Chest) {
                        entity.open();
                    }

                    entity.clean();
                }
            });

            this.client.onItemBlink((id) => {
                var item = this.getEntityById(id);

                if (item) {
                    item.blink(150);
                }
            });

            this.client.onEntityMove((id, x, y) => {
                var entity = null;

                if (id !== this.playerId) {
                    entity = this.getEntityById(id);

                    if (entity) {
                        if (this.player.isAttackedBy(entity)) {
                            this.tryUnlockingAchievement("COWARD");
                        }
                        entity.disengage();
                        entity.idle();
                        this.makeCharacterGoTo(entity, x, y);
                    }
                }
            });

            this.client.onEntityDestroy((id) => {
                var entity = this.getEntityById(id);
                if (entity) {
                    if (entity instanceof Item) {
                        this.removeItem(entity);
                    } else {
                        this.removeEntity(entity);
                    }
                    log.debug("Entity was destroyed: " + entity.id);
                }
            });

            this.client.onPlayerMoveToItem((playerId, itemId) => {
                var player, item;

                if (playerId !== this.playerId) {
                    player = this.getEntityById(playerId);
                    item = this.getEntityById(itemId);

                    if (player && item) {
                        this.makeCharacterGoTo(player, item.gridX, item.gridY);
                    }
                }
            });

            this.client.onEntityAttack((attackerId, targetId) => {
                var attacker = this.getEntityById(attackerId),
                    target = this.getEntityById(targetId);

                if (attacker && target && attacker.id !== this.playerId) {
                    log.debug(attacker.id + " attacks " + target.id);

                    if (
                        attacker &&
                        target instanceof Player &&
                        target.id !== this.playerId &&
                        target.target &&
                        target.target.id === attacker.id &&
                        attacker.getDistanceToEntity(target) < 3
                    ) {
                        setTimeout(() => {
                            this.createAttackLink(attacker, target);
                        }, 200); // delay to prevent other players attacking mobs from ending up on the same tile as they walk towards each other.
                    } else {
                        this.createAttackLink(attacker, target);
                    }
                }
            });

            this.client.onPlayerDamageMob((mobId, points) => {
                var mob = this.getEntityById(mobId);
                if (mob && points) {
                    this.infoManager.addDamageInfo(
                        points,
                        mob.x,
                        mob.y - 15,
                        "inflicted",
                    );
                }
            });

            this.client.onPlayerKillMob((kind) => {
                var mobName = Types.getKindAsString(kind);

                if (mobName === "skeleton2") {
                    mobName = "greater skeleton";
                }

                if (mobName === "eye") {
                    mobName = "evil eye";
                }

                if (mobName === "deathknight") {
                    mobName = "death knight";
                }

                if (mobName === "boss") {
                    this.showNotification("You killed the skeleton king");
                } else {
                    if (includes(["a", "e", "i", "o", "u"], mobName[0])) {
                        this.showNotification("You killed an " + mobName);
                    } else {
                        this.showNotification("You killed a " + mobName);
                    }
                }

                this.storage.incrementTotalKills();
                this.tryUnlockingAchievement("HUNTER");

                if (kind === Entities.RAT) {
                    this.storage.incrementRatCount();
                    this.tryUnlockingAchievement("ANGRY_RATS");
                }

                if (kind === Entities.SKELETON || kind === Entities.SKELETON2) {
                    this.storage.incrementSkeletonCount();
                    this.tryUnlockingAchievement("SKULL_COLLECTOR");
                }

                if (kind === Entities.BOSS) {
                    this.tryUnlockingAchievement("HERO");
                }
            });

            this.client.onPlayerChangeHealth((points, isRegen) => {
                var player = this.player,
                    diff,
                    isHurt;

                if (player && !player.isDead && !player.invincible) {
                    isHurt = points <= player.hitPoints;
                    diff = points - player.hitPoints;
                    player.hitPoints = points;

                    if (player.hitPoints <= 0) {
                        player.die();
                    }
                    if (isHurt) {
                        player.hurt();
                        this.infoManager.addDamageInfo(
                            diff,
                            player.x,
                            player.y - 15,
                            "received",
                        );
                        this.audioManager.playSound("hurt");
                        this.storage.addDamage(-diff);
                        this.tryUnlockingAchievement("MEATSHIELD");
                        if (this.playerhurt_callback) {
                            this.playerhurt_callback();
                        }
                    } else if (!isRegen) {
                        this.infoManager.addDamageInfo(
                            "+" + diff,
                            player.x,
                            player.y - 15,
                            "healed",
                        );
                    }
                    this.updateBars();
                }
            });

            this.client.onPlayerChangeMaxHitPoints((hp) => {
                this.player.maxHitPoints = hp;
                this.player.hitPoints = hp;
                this.updateBars();
            });

            this.client.onPlayerEquipItem((playerId, itemKind) => {
                var player = this.getEntityById(playerId),
                    itemName = Types.getKindAsString(itemKind);

                if (player) {
                    if (Types.isArmor(itemKind)) {
                        player.setSprite(this.sprites[itemName]);
                    } else if (Types.isWeapon(itemKind)) {
                        player.setWeaponName(itemName);
                    }
                }
            });

            this.client.onPlayerTeleport((id, x, y) => {
                var entity = null,
                    currentOrientation;

                if (id !== this.playerId) {
                    entity = this.getEntityById(id);

                    if (entity) {
                        currentOrientation = entity.orientation;

                        this.makeCharacterTeleportTo(entity, x, y);
                        entity.setOrientation(currentOrientation);

                        entity.forEachAttacker((attacker) => {
                            attacker.disengage();
                            attacker.idle();
                            attacker.stop();
                        });
                    }
                }
            });

            this.client.onDropItem((item, mobId) => {
                var pos = this.getDeadMobPosition(mobId);

                if (pos) {
                    this.addItem(item, pos.x, pos.y);
                    this.updateCursor();
                }
            });

            this.client.onChatMessage((entityId, message) => {
                var entity = this.getEntityById(entityId);
                this.createBubble(entityId, message);
                this.assignBubbleTo(entity);
                this.audioManager.playSound("chat");
            });

            this.client.onPopulationChange((worldPlayers, totalPlayers) => {
                if (this.nbplayers_callback) {
                    this.nbplayers_callback(worldPlayers, totalPlayers);
                }
            });

            this.client.onDisconnected((message) => {
                if (this.player) {
                    this.player.die();
                }
                if (this.disconnect_callback) {
                    this.disconnect_callback(message);
                }
            });

            this.gamestart_callback();

            if (this.hasNeverStarted) {
                this.start();
                started_callback();
            }
        });
    }

    /**
     * Links two entities in an attacker<-->target relationship.
     * This is just a utility method to wrap a set of instructions.
     *
     * @param {Entity} attacker The attacker entity
     * @param {Entity} target The target entity
     */
    createAttackLink(attacker, target) {
        if (attacker.hasTarget()) {
            attacker.removeTarget();
        }
        attacker.engage(target);

        if (attacker.id !== this.playerId) {
            target.addAttacker(attacker);
        }
    }

    /**
     * Sends a "hello" message to the server, as a way of initiating the player connection handshake.
     * @see GameClient.sendHello
     */
    sendHello() {
        this.client.sendHello(this.player);
    }

    /**
     * Converts the current mouse position on the screen to world grid coordinates.
     * @returns {{ x: number, y: number }} An object containing x and y properties.
     */
    getMouseGridPosition() {
        var mx = this.mouse.x,
            my = this.mouse.y,
            c = this.renderer.camera,
            s = this.renderer.scale,
            ts = this.renderer.tilesize,
            offsetX = mx % (ts * s),
            offsetY = my % (ts * s),
            x = (mx - offsetX) / (ts * s) + c.gridX,
            y = (my - offsetY) / (ts * s) + c.gridY;

        return { x: x, y: y };
    }

    /**
     * Moves a character to a given location on the world grid.
     *
     * @param {number} x The x coordinate of the target location.
     * @param {number} y The y coordinate of the target location.
     */
    makeCharacterGoTo(character, x, y) {
        if (!this.map.isOutOfBounds(x, y)) {
            character.go(x, y);
        }
    }

    /**
     *
     */
    makeCharacterTeleportTo(character, x, y) {
        if (!this.map.isOutOfBounds(x, y)) {
            this.unregisterEntityPosition(character);

            character.setGridPosition(x, y);

            this.registerEntityPosition(character);
            this.assignBubbleTo(character);
        } else {
            log.debug("Teleport out of bounds: " + x + ", " + y);
        }
    }

    /**
     * Moves the current player to a given target location.
     * @see makeCharacterGoTo
     */
    makePlayerGoTo(x, y) {
        this.makeCharacterGoTo(this.player, x, y);
    }

    /**
     * Moves the current player towards a specific item.
     * @see makeCharacterGoTo
     */
    makePlayerGoToItem(item) {
        if (item) {
            this.player.isLootMoving = true;
            this.makePlayerGoTo(item.gridX, item.gridY);
            this.client.sendLootMove(item, item.gridX, item.gridY);
        }
    }

    /**
     *
     */
    makePlayerTalkTo(npc) {
        if (npc) {
            this.player.setTarget(npc);
            this.player.follow(npc);
        }
    }

    makePlayerOpenChest(chest) {
        if (chest) {
            this.player.setTarget(chest);
            this.player.follow(chest);
        }
    }

    /**
     *
     */
    makePlayerAttack(mob) {
        this.createAttackLink(this.player, mob);
        this.client.sendAttack(mob);
    }

    /**
     *
     */
    makeNpcTalk(npc) {
        var msg;

        if (npc) {
            msg = npc.talk();
            this.previousClickPosition = {};
            if (msg) {
                this.createBubble(npc.id, msg);
                this.assignBubbleTo(npc);
                this.audioManager.playSound("npc");
            } else {
                this.destroyBubble(npc.id);
                this.audioManager.playSound("npc-end");
            }
            this.tryUnlockingAchievement("SMALL_TALK");

            if (npc.kind === Entities.RICK) {
                this.tryUnlockingAchievement("RICKROLLD");
            }
        }
    }

    /**
     * Loops through all the entities currently present in the game.
     * @param {Function} callback The function to call back (must accept one entity argument).
     */
    forEachEntity(callback) {
        this.entities.forEach((entity, _id, _map) => {
            callback(entity);
        });
    }

    /**
     * Same as forEachEntity but only for instances of the Mob subclass.
     * @see forEachEntity
     */
    forEachMob(callback) {
        this.entities.forEach((entity, _id, _map) => {
            if (entity instanceof Mob) {
                callback(entity);
            }
        });
    }

    /**
     * Loops through all entities visible by the camera and sorted by depth :
     * Lower 'y' value means higher depth.
     * Note: This is used by the Renderer to know in which order to render entities.
     */
    forEachVisibleEntityByDepth(callback) {
        this.camera.forEachVisiblePosition(
            (x, y) => {
                if (!this.map.isOutOfBounds(x, y)) {
                    if (this.renderingGrid[y][x]) {
                        forEach(this.renderingGrid[y][x], (cell) =>
                            callback(cell),
                        );
                    }
                }
            },
            this.renderer.mobile ? 0 : 2,
        );
    }

    /**
     *
     */
    forEachVisibleTileIndex(callback, extra) {
        this.camera.forEachVisiblePosition((x, y) => {
            if (!this.map.isOutOfBounds(x, y)) {
                callback(this.map.GridPositionToTileIndex(x, y) - 1);
            }
        }, extra);
    }

    /**
     *
     */
    forEachVisibleTile(callback, extra) {
        if (this.map.isLoaded) {
            this.forEachVisibleTileIndex((tileIndex) => {
                if (isArray(this.map.data[tileIndex])) {
                    forEach(this.map.data[tileIndex], (id) => {
                        callback(id - 1, tileIndex);
                    });
                } else {
                    if (isNaN(this.map.data[tileIndex] - 1)) {
                        //throw Error("Tile number for index:"+tileIndex+" is NaN");
                    } else {
                        callback(this.map.data[tileIndex] - 1, tileIndex);
                    }
                }
            }, extra);
        }
    }

    /**
     *
     */
    forEachAnimatedTile(callback) {
        if (this.animatedTiles) {
            forEach(this.animatedTiles, (animatedTile) =>
                callback(animatedTile),
            );
        }
    }

    /**
     * Returns the entity located at the given position on the world grid.
     * @returns {Entity} the entity located at (x, y) or null if there is none.
     */
    getEntityAt(x, y) {
        if (this.map.isOutOfBounds(x, y) || !this.entityGrid) {
            return null;
        }

        var entities = this.entityGrid[y][x],
            entity = null;
        if (size(entities) > 0) {
            entity = entities[keys(entities)[0]];
        } else {
            entity = this.getItemAt(x, y);
        }
        return entity;
    }

    getMobAt(x, y) {
        var entity = this.getEntityAt(x, y);
        if (entity && entity instanceof Mob) {
            return entity;
        }
        return null;
    }

    getNpcAt(x, y) {
        var entity = this.getEntityAt(x, y);
        if (entity && entity instanceof Npc) {
            return entity;
        }
        return null;
    }

    getChestAt(x, y) {
        var entity = this.getEntityAt(x, y);
        if (entity && entity instanceof Chest) {
            return entity;
        }
        return null;
    }

    getItemAt(x, y) {
        if (this.map.isOutOfBounds(x, y) || !this.itemGrid) {
            return null;
        }
        var items = this.itemGrid[y][x],
            item = null;

        if (size(items) > 0) {
            // If there are potions/burgers stacked with equipment items on the same tile, always get expendable items first.
            forEach(items, (i) => {
                if (Types.isExpendableItem(i.kind)) {
                    item = i;
                }
            });

            // Else, get the first item of the stack
            if (!item) {
                item = items[keys(items)[0]];
            }
        }
        return item;
    }

    /**
     * Returns true if an entity is located at the given position on the world grid.
     * @returns {boolean} Whether an entity is at (x, y).
     */
    isEntityAt(x, y) {
        return !isNull(this.getEntityAt(x, y));
    }

    isMobAt(x, y) {
        return !isNull(this.getMobAt(x, y));
    }

    isItemAt(x, y) {
        return !isNull(this.getItemAt(x, y));
    }

    isNpcAt(x, y) {
        return !isNull(this.getNpcAt(x, y));
    }

    isChestAt(x, y) {
        return !isNull(this.getChestAt(x, y));
    }

    /**
     * Finds a path to a grid position for the specified character.
     * The path will pass through any entity present in the ignore list.
     */
    findPath(character, x, y, ignoreList) {
        var grid = this.pathingGrid,
            path = [];

        if (this.map.isColliding(x, y)) {
            return path;
        }

        if (this.pathfinder && character) {
            if (ignoreList) {
                forEach(ignoreList, (entity) => {
                    this.pathfinder.ignoreEntity(entity);
                });
            }

            path = this.pathfinder.findPath(grid, character, x, y, false);

            if (ignoreList) {
                this.pathfinder.clearIgnoreList();
            }
        } else {
            log.error(
                "Error while finding the path to " +
                    x +
                    ", " +
                    y +
                    " for " +
                    character.id,
            );
        }
        return path;
    }

    /**
     * Toggles the visibility of the pathing grid for debugging purposes.
     */
    togglePathingGrid() {
        if (this.debugPathing) {
            this.debugPathing = false;
        } else {
            this.debugPathing = true;
        }
    }

    /**
     * Toggles the visibility of the FPS counter and other debugging info.
     */
    toggleDebugInfo() {
        if (this.renderer && this.renderer.isDebugInfoVisible) {
            this.renderer.isDebugInfoVisible = false;
        } else {
            this.renderer.isDebugInfoVisible = true;
        }
    }

    /**
     *
     */
    movecursor() {
        var mouse = this.getMouseGridPosition(),
            x = mouse.x,
            y = mouse.y;

        if (this.player && !this.renderer.mobile && !this.renderer.tablet) {
            this.hoveringCollidingTile = this.map.isColliding(x, y);
            this.hoveringPlateauTile = this.player.isOnPlateau
                ? !this.map.isPlateau(x, y)
                : this.map.isPlateau(x, y);
            this.hoveringMob = this.isMobAt(x, y);
            this.hoveringItem = this.isItemAt(x, y);
            this.hoveringNpc = this.isNpcAt(x, y);
            this.hoveringChest = this.isChestAt(x, y);

            if (this.hoveringMob || this.hoveringNpc || this.hoveringChest) {
                var entity = this.getEntityAt(x, y);

                if (
                    !entity.isHighlighted &&
                    this.renderer.supportsSilhouettes
                ) {
                    if (this.lastHovered) {
                        this.lastHovered.setHighlight(false);
                    }
                    this.lastHovered = entity;
                    entity.setHighlight(true);
                }
            } else if (this.lastHovered) {
                this.lastHovered.setHighlight(false);
                this.lastHovered = null;
            }
        }
    }

    /**
     * Processes game logic when the user triggers a click/touch event during the game.
     */
    click() {
        var pos = this.getMouseGridPosition(),
            entity;

        if (
            pos.x === this.previousClickPosition.x &&
            pos.y === this.previousClickPosition.y
        ) {
            return;
        } else {
            this.previousClickPosition = pos;
        }

        if (
            this.started &&
            this.player &&
            !this.isZoning() &&
            !this.isZoningTile(this.player.nextGridX, this.player.nextGridY) &&
            !this.player.isDead &&
            !this.hoveringCollidingTile &&
            !this.hoveringPlateauTile
        ) {
            entity = this.getEntityAt(pos.x, pos.y);

            if (entity instanceof Mob) {
                this.makePlayerAttack(entity);
            } else if (entity instanceof Item) {
                this.makePlayerGoToItem(entity);
            } else if (entity instanceof Npc) {
                if (this.player.isAdjacentNonDiagonal(entity) === false) {
                    this.makePlayerTalkTo(entity);
                } else {
                    this.makeNpcTalk(entity);
                }
            } else if (entity instanceof Chest) {
                this.makePlayerOpenChest(entity);
            } else {
                this.makePlayerGoTo(pos.x, pos.y);
            }
        }
    }

    isMobOnSameTile(mob, x = mob.gridX, y = mob.gridY) {
        return some(this.entityGrid[x][y], (entity) => {
            entity instanceof Mob && entity.id !== mob.id;
        });
    }

    getFreeAdjacentNonDiagonalPosition(entity) {
        var result = null;

        entity.forEachAdjacentNonDiagonalPosition((x, y, orientation) => {
            if (!result && !this.map.isColliding(x, y) && !this.isMobAt(x, y)) {
                result = { x: x, y: y, o: orientation };
            }
        });
        return result;
    }

    tryMovingToADifferentTile(character) {
        var attacker = character,
            target = character.target;

        if (attacker && target && target instanceof Player) {
            if (
                !target.isMoving() &&
                attacker.getDistanceToEntity(target) === 0
            ) {
                let pos;

                switch (target.orientation) {
                    case Orientations.UP:
                        pos = {
                            x: target.gridX,
                            y: target.gridY - 1,
                            o: target.orientation,
                        };
                        break;
                    case Orientations.DOWN:
                        pos = {
                            x: target.gridX,
                            y: target.gridY + 1,
                            o: target.orientation,
                        };
                        break;
                    case Orientations.LEFT:
                        pos = {
                            x: target.gridX - 1,
                            y: target.gridY,
                            o: target.orientation,
                        };
                        break;
                    case Orientations.RIGHT:
                        pos = {
                            x: target.gridX + 1,
                            y: target.gridY,
                            o: target.orientation,
                        };
                        break;
                }

                if (pos) {
                    attacker.previousTarget = target;
                    attacker.disengage();
                    attacker.idle();
                    this.makeCharacterGoTo(attacker, pos.x, pos.y);
                    target.adjacentTiles[pos.o] = true;

                    return true;
                }
            }

            if (
                !target.isMoving() &&
                attacker.isAdjacentNonDiagonal(target) &&
                this.isMobOnSameTile(attacker)
            ) {
                const pos = this.getFreeAdjacentNonDiagonalPosition(target);

                // avoid stacking mobs on the same tile next to a player
                // by making them go to adjacent tiles if they are available
                if (pos && !target.adjacentTiles[pos.o]) {
                    if (
                        this.player.target &&
                        attacker.id === this.player.target.id
                    ) {
                        return false; // never unstack the player's target
                    }

                    attacker.previousTarget = target;
                    attacker.disengage();
                    attacker.idle();
                    this.makeCharacterGoTo(attacker, pos.x, pos.y);
                    target.adjacentTiles[pos.o] = true;

                    return true;
                }
            }
        }
        return false;
    }

    /**
     *
     */
    onCharacterUpdate(character) {
        var time = this.currentTime;

        // If mob has finished moving to a different tile in order to avoid stacking, attack again from the new position.
        if (
            character.previousTarget &&
            !character.isMoving() &&
            character instanceof Mob
        ) {
            var t = character.previousTarget;

            if (this.getEntityById(t.id)) {
                // does it still exist?
                character.previousTarget = null;
                this.createAttackLink(character, t);
                return;
            }
        }

        if (character.isAttacking() && !character.previousTarget) {
            var isMoving = this.tryMovingToADifferentTile(character); // Don't let multiple mobs stack on the same tile when attacking a player.

            if (character.canAttack(time)) {
                if (!isMoving) {
                    // don't hit target if moving to a different tile.
                    if (
                        character.hasTarget() &&
                        character.getOrientationTo(character.target) !==
                            character.orientation
                    ) {
                        character.lookAtTarget();
                    }

                    character.hit();

                    if (character.id === this.playerId) {
                        this.client.sendHit(character.target);
                    }

                    if (
                        character instanceof Player &&
                        this.camera.isVisible(character)
                    ) {
                        this.audioManager.playSound(
                            "hit" + Math.floor(Math.random() * 2 + 1),
                        );
                    }

                    if (
                        character.hasTarget() &&
                        character.target.id === this.playerId &&
                        this.player &&
                        !this.player.invincible
                    ) {
                        this.client.sendHurt(character);
                    }
                }
            } else {
                if (
                    character.hasTarget() &&
                    character.isDiagonallyAdjacent(character.target) &&
                    character.target instanceof Player &&
                    !character.target.isMoving()
                ) {
                    character.follow(character.target);
                }
            }
        }
    }

    /**
     *
     */
    isZoningTile(x, y) {
        var c = this.camera;

        x = x - c.gridX;
        y = y - c.gridY;

        if (x === 0 || y === 0 || x === c.gridW - 1 || y === c.gridH - 1) {
            return true;
        }
        return false;
    }

    /**
     *
     */
    getZoningOrientation(x, y) {
        var orientation = "",
            c = this.camera;

        x = x - c.gridX;
        y = y - c.gridY;

        if (x === 0) {
            orientation = Orientations.LEFT;
        } else if (y === 0) {
            orientation = Orientations.UP;
        } else if (x === c.gridW - 1) {
            orientation = Orientations.RIGHT;
        } else if (y === c.gridH - 1) {
            orientation = Orientations.DOWN;
        }

        return orientation;
    }

    startZoningFrom(x, y) {
        this.zoningOrientation = this.getZoningOrientation(x, y);

        if (this.renderer.mobile || this.renderer.tablet) {
            var z = this.zoningOrientation,
                c = this.camera,
                ts = this.renderer.tilesize,
                xoffset = (c.gridW - 2) * ts,
                yoffset = (c.gridH - 2) * ts;

            x = c.x;
            y = c.y;

            if (z === Orientations.LEFT || z === Orientations.RIGHT) {
                x = z === Orientations.LEFT ? c.x - xoffset : c.x + xoffset;
            } else if (z === Orientations.UP || z === Orientations.DOWN) {
                y = z === Orientations.UP ? c.y - yoffset : c.y + yoffset;
            }
            c.setPosition(x, y);

            this.renderer.clearScreen(this.renderer.context);
            this.endZoning();

            // Force immediate drawing of all visible entities in the new zone
            this.forEachVisibleEntityByDepth((entity) => {
                entity.setDirty();
            });
        } else {
            this.currentZoning = new Transition();
        }
        this.bubbleManager.clean();
        this.client.sendZone();
    }

    enqueueZoningFrom(x, y) {
        this.zoningQueue.push({ x: x, y: y });

        if (this.zoningQueue.length === 1) {
            this.startZoningFrom(x, y);
        }
    }

    endZoning() {
        this.currentZoning = null;
        this.resetZone();
        this.zoningQueue.shift();

        if (this.zoningQueue.length > 0) {
            var pos = this.zoningQueue[0];
            this.startZoningFrom(pos.x, pos.y);
        }
    }

    isZoning() {
        return !isNull(this.currentZoning);
    }

    resetZone() {
        this.bubbleManager.clean();
        this.initAnimatedTiles();
        this.renderer.renderStaticCanvases();
    }

    resetCamera() {
        this.camera.focusEntity(this.player);
        this.resetZone();
    }

    say(message) {
        this.client.sendChat(message);
    }

    createBubble(id, message) {
        this.bubbleManager.create(id, message, this.currentTime);
    }

    destroyBubble(id) {
        this.bubbleManager.destroyBubble(id);
    }

    assignBubbleTo(character) {
        var bubble = this.bubbleManager.getBubbleById(character.id);

        if (bubble) {
            var s = this.renderer.scale,
                t = 16 * s, // tile size
                x = (character.x - this.camera.x) * s,
                w = parseInt(bubble.element.css("width")) + 24,
                offset = w / 2 - t / 2,
                offsetY,
                y;

            if (character instanceof Npc) {
                offsetY = 0;
            } else {
                if (s === 2) {
                    if (this.renderer.mobile) {
                        offsetY = 0;
                    } else {
                        offsetY = 15;
                    }
                } else {
                    offsetY = 12;
                }
            }

            y = (character.y - this.camera.y) * s - t * 2 - offsetY;

            bubble.element.css("left", x - offset + "px");
            bubble.element.css("top", y + "px");
        }
    }

    restart() {
        log.debug("Beginning restart");

        this.entities = new Map();
        this.initEntityGrid();
        this.initPathingGrid();
        this.initRenderingGrid();

        this.player = new Warrior("player", this.username);
        this.initPlayer();

        this.started = true;
        this.client.enable();
        this.sendHello(this.player);

        this.storage.incrementRevives();

        if (this.renderer.mobile || this.renderer.tablet) {
            this.renderer.clearScreen(this.renderer.context);
        }

        log.debug("Finished restart");
    }

    onGameStart(callback) {
        this.gamestart_callback = callback;
    }

    onDisconnect(callback) {
        this.disconnect_callback = callback;
    }

    onPlayerDeath(callback) {
        this.playerdeath_callback = callback;
    }

    onPlayerHealthChange(callback) {
        this.playerhp_callback = callback;
    }

    onPlayerHurt(callback) {
        this.playerhurt_callback = callback;
    }

    onPlayerEquipmentChange(callback) {
        this.equipment_callback = callback;
    }

    onNbPlayersChange(callback) {
        this.nbplayers_callback = callback;
    }

    onNotification(callback) {
        this.notification_callback = callback;
    }

    onPlayerInvincible(callback) {
        this.invincible_callback = callback;
    }

    resize() {
        var x = this.camera.x,
            y = this.camera.y;

        this.renderer.rescale();
        this.camera = this.renderer.camera;
        this.camera.setPosition(x, y);

        this.renderer.renderStaticCanvases();
    }

    updateBars() {
        if (this.player && this.playerhp_callback) {
            this.playerhp_callback(
                this.player.hitPoints,
                this.player.maxHitPoints,
            );
        }
    }

    getDeadMobPosition(mobId) {
        var position;

        if (mobId in this.deathpositions) {
            position = this.deathpositions[mobId];
            delete this.deathpositions[mobId];
        }

        return position;
    }

    onAchievementUnlock(callback) {
        this.unlock_callback = callback;
    }

    tryUnlockingAchievement(name) {
        var achievement = null;
        if (name in this.achievements) {
            achievement = this.achievements[name];

            if (
                achievement.isCompleted() &&
                this.storage.unlockAchievement(achievement.id)
            ) {
                if (this.unlock_callback) {
                    this.unlock_callback(
                        achievement.id,
                        achievement.name,
                        achievement.desc,
                    );
                    this.audioManager.playSound("achievement");
                }
            }
        }
    }

    showNotification(message) {
        if (this.notification_callback) {
            this.notification_callback(message);
        }
    }

    removeObsoleteEntities() {
        var nb = size(this.obsoleteEntities);

        if (this.obsoleteEntities.size > 0) {
            for (const entity of this.obsoleteEntities) {
                // TODO: obsoleteEntities should never contain the player to begin with
                if (entity.id != this.player.id) {
                    // never remove yourself
                    this.removeEntity(entity);
                }
            }
            log.debug(
                "Removed " +
                    nb +
                    " entities: " +
                    Array.from(this.obsoleteEntities)
                        .map((entity) => entity.id)
                        .filter((id) => id !== this.player.id),
            );
            this.obsoleteEntities.clear();
        }
    }

    /**
     * Fake a mouse move event in order to update the cursor.
     *
     * For instance, to get rid of the sword cursor in case the mouse is still hovering over a dying mob.
     * Also useful when the mouse is hovering a tile where an item is appearing.
     */
    updateCursor() {
        this.movecursor();
        this.updateCursorLogic();
    }

    /**
     * Change player plateau mode when necessary
     */
    updatePlateauMode() {
        if (this.map.isPlateau(this.player.gridX, this.player.gridY)) {
            this.player.isOnPlateau = true;
        } else {
            this.player.isOnPlateau = false;
        }
    }

    updatePlayerCheckpoint() {
        var checkpoint = this.map.getCurrentCheckpoint(this.player);

        if (checkpoint) {
            var lastCheckpoint = this.player.lastCheckpoint;
            if (
                !lastCheckpoint ||
                (lastCheckpoint && lastCheckpoint.id !== checkpoint.id)
            ) {
                this.player.lastCheckpoint = checkpoint;
                this.client.sendCheck(checkpoint.id);
            }
        }
    }

    checkUndergroundAchievement() {
        var music = this.audioManager.getSurroundingMusic(this.player);

        if (music) {
            if (music.name === "cave") {
                this.tryUnlockingAchievement("UNDERGROUND");
            }
        }
    }

    forEachEntityAround(centerX, centerY, distance, callback) {
        for (let y = centerY - distance; y <= centerY + distance; y++) {
            for (let x = centerX - distance; x <= centerX + distance; x++) {
                if (!this.map.isOutOfBounds(x, y)) {
                    forEach(this.renderingGrid[y][x], (entity) =>
                        callback(entity),
                    );
                }
            }
        }
    }

    checkOtherDirtyRects(r1, source, x, y) {
        const renderer = this.renderer;

        this.forEachEntityAround(x, y, 2, (e2) => {
            if (source && source.id && e2.id === source.id) {
                return;
            }
            if (!e2.isDirty) {
                var r2 = renderer.getEntityBoundingRect(e2);
                if (renderer.isIntersecting(r1, r2)) {
                    e2.setDirty();
                }
            }
        });

        if (source && !Object.hasOwnProperty.call(source, "index")) {
            this.forEachAnimatedTile((tile) => {
                if (!tile.isDirty) {
                    var r2 = renderer.getTileBoundingRect(tile);
                    if (renderer.isIntersecting(r1, r2)) {
                        tile.isDirty = true;
                    }
                }
            });
        }

        if (!this.drawTarget && this.selectedCellVisible) {
            var targetRect = renderer.getTargetBoundingRect();
            if (renderer.isIntersecting(r1, targetRect)) {
                this.drawTarget = true;
                this.renderer.targetRect = targetRect;
            }
        }
    }
}
