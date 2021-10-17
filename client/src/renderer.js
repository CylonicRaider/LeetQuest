import isNaN from "lodash-es/isNaN.js";
import isNull from "lodash-es/isNull.js";
import isUndefined from "lodash-es/isUndefined.js";

import { Entities } from "../../shared/js/gametypes.js";

import Camera from "./camera.js";
import Character from "./character.js";
import Detect from "./detect.js";
import Item from "./item.js";
import log from "./lib/log.js";
import Player from "./player.js";
import Timer from "./timer.js";

export default class Renderer {
    constructor(game, canvas, background, foreground) {
        this.game = game;
        this.context =
            canvas && canvas.getContext ? canvas.getContext("2d") : null;
        this.background =
            background && background.getContext
                ? background.getContext("2d")
                : null;
        this.foreground =
            foreground && foreground.getContext
                ? foreground.getContext("2d")
                : null;

        this.canvas = canvas;
        this.backcanvas = background;
        this.forecanvas = foreground;

        this.initFPS();
        this.tilesize = 16;

        if (this.context.imageSmoothingEnabled === undefined)
            log.error(
                "imageSmoothingEnabled not supported; " +
                    "graphics quality may be degraded",
            );
        this.upscaledRendering = true;
        this.supportsSilhouettes = this.upscaledRendering;

        this.rescale();

        this.lastTime = new Date();
        this.frameCount = 0;
        this.maxFPS = this.FPS;
        this.realFPS = 0;
        this.isDebugInfoVisible = false;

        this.animatedTileCount = 0;
        this.highTileCount = 0;

        this.tablet = Detect.isTablet(window.innerWidth);

        this.fixFlickeringTimer = new Timer(100);
    }

    getWidth() {
        return this.canvas.width;
    }

    getHeight() {
        return this.canvas.height;
    }

    setTileset(tileset) {
        this.tileset = tileset;
    }

    getScaleFactor() {
        var w = window.innerWidth,
            h = window.innerHeight,
            scale;

        this.mobile = false;

        if (w <= 1000) {
            scale = 2;
            this.mobile = true;
        } else if (w <= 1500 || h <= 870) {
            scale = 2;
        } else {
            scale = 3;
        }

        return scale;
    }

    rescale() {
        this.scale = this.getScaleFactor();

        this.createCamera();

        this.context.imageSmoothingEnabled = false;
        this.background.imageSmoothingEnabled = false;
        this.foreground.imageSmoothingEnabled = false;

        this.initFont();
        this.initFPS();

        if (
            !this.upscaledRendering &&
            this.game.map &&
            this.game.map.tilesets
        ) {
            this.setTileset(this.game.map.tilesets[this.scale - 1]);
        }
        if (this.game.renderer) {
            this.game.setSpriteScale(this.scale);
        }
    }

    createCamera() {
        this.camera = new Camera(this);
        this.camera.rescale();

        this.canvas.width = this.camera.gridW * this.tilesize * this.scale;
        this.canvas.height = this.camera.gridH * this.tilesize * this.scale;
        log.debug(
            "#entities set to " +
                this.canvas.width +
                " x " +
                this.canvas.height,
        );

        this.backcanvas.width = this.canvas.width;
        this.backcanvas.height = this.canvas.height;
        log.debug(
            "#background set to " +
                this.backcanvas.width +
                " x " +
                this.backcanvas.height,
        );

        this.forecanvas.width = this.canvas.width;
        this.forecanvas.height = this.canvas.height;
        log.debug(
            "#foreground set to " +
                this.forecanvas.width +
                " x " +
                this.forecanvas.height,
        );
    }

    initFPS() {
        this.FPS = this.mobile ? 50 : 50;
    }

    initFont() {
        var fontsize;

        switch (this.scale) {
            case 1:
                fontsize = 10;
                break;
            case 2:
                fontsize = Detect.isWindows() ? 10 : 13;
                break;
            case 3:
                fontsize = 20;
        }
        this.setFontSize(fontsize);
    }

    setFontSize(size) {
        var font = size + "px GraphicPixel";

        this.context.font = font;
        this.background.font = font;
    }

    drawText(text, x, y, centered, color, strokeColor) {
        var ctx = this.context;

        var strokeSize;

        switch (this.scale) {
            case 1:
                strokeSize = 3;
                break;
            case 2:
                strokeSize = 3;
                break;
            case 3:
                strokeSize = 5;
        }

        if (text && x && y) {
            ctx.save();
            if (centered) {
                ctx.textAlign = "center";
            }
            ctx.strokeStyle = strokeColor || "#373737";
            ctx.lineWidth = strokeSize;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = color || "white";
            ctx.fillText(text, x, y);
            ctx.restore();
        }
    }

    drawCellRect(x, y, color) {
        this.context.save();
        this.context.lineWidth = 2 * this.scale;
        this.context.strokeStyle = color;
        this.context.translate(x + 2, y + 2);
        this.context.strokeRect(
            0,
            0,
            this.tilesize * this.scale - 4,
            this.tilesize * this.scale - 4,
        );
        this.context.restore();
    }

    drawCellHighlight(x, y, color) {
        var s = this.scale,
            ts = this.tilesize,
            tx = x * ts * s,
            ty = y * ts * s;

        this.drawCellRect(tx, ty, color);
    }

    drawTargetCell() {
        var mouse = this.game.getMouseGridPosition();

        if (
            this.game.targetCellVisible &&
            !(
                mouse.x === this.game.selectedX &&
                mouse.y === this.game.selectedY
            )
        ) {
            this.drawCellHighlight(mouse.x, mouse.y, this.game.targetColor);
        }
    }

    drawAttackTargetCell() {
        var mouse = this.game.getMouseGridPosition(),
            entity = this.game.getEntityAt(mouse.x, mouse.y),
            s = this.scale;

        if (entity) {
            this.drawCellRect(
                entity.x * s,
                entity.y * s,
                "rgba(255, 0, 0, 0.5)",
            );
        }
    }

    drawOccupiedCells() {
        var positions = this.game.entityGrid;

        if (positions) {
            for (var i = 0; i < positions.length; i += 1) {
                for (var j = 0; j < positions[i].length; j += 1) {
                    if (!isNull(positions[i][j])) {
                        this.drawCellHighlight(i, j, "rgba(50, 50, 255, 0.5)");
                    }
                }
            }
        }
    }

    drawPathingCells() {
        var grid = this.game.pathingGrid;

        if (grid && this.game.debugPathing) {
            for (var y = 0; y < grid.length; y += 1) {
                for (var x = 0; x < grid[y].length; x += 1) {
                    if (
                        grid[y][x] === 1 &&
                        this.game.camera.isVisiblePosition(x, y)
                    ) {
                        this.drawCellHighlight(x, y, "rgba(50, 50, 255, 0.5)");
                    }
                }
            }
        }
    }

    drawSelectedCell() {
        var sprite = this.game.cursors["target"],
            anim = this.game.targetAnimation,
            os = this.upscaledRendering ? 1 : this.scale,
            ds = this.upscaledRendering ? this.scale : 1;

        if (this.game.selectedCellVisible) {
            if (this.mobile || this.tablet) {
                if (this.game.drawTarget) {
                    const x = this.game.selectedX,
                        y = this.game.selectedY;

                    this.drawCellHighlight(
                        this.game.selectedX,
                        this.game.selectedY,
                        "rgb(51, 255, 0)",
                    );
                    this.lastTargetPos = { x: x, y: y };
                    this.game.drawTarget = false;
                }
            } else {
                if (sprite && anim) {
                    const frame = anim.currentFrame,
                        s = this.scale,
                        x = frame.x * os,
                        y = frame.y * os,
                        w = sprite.width * os,
                        h = sprite.height * os,
                        ts = 16,
                        dx = this.game.selectedX * ts * s,
                        dy = this.game.selectedY * ts * s,
                        dw = w * ds,
                        dh = h * ds;

                    this.context.save();
                    this.context.translate(dx, dy);
                    this.context.drawImage(
                        sprite.image,
                        x,
                        y,
                        w,
                        h,
                        0,
                        0,
                        dw,
                        dh,
                    );
                    this.context.restore();
                }
            }
        }
    }

    clearScaledRect(ctx, x, y, w, h) {
        var s = this.scale;

        ctx.clearRect(x * s, y * s, w * s, h * s);
    }

    drawCursor() {
        var mx = this.game.mouse.x,
            my = this.game.mouse.y,
            s = this.scale,
            os = this.upscaledRendering ? 1 : this.scale;

        this.context.save();
        if (this.game.currentCursor && this.game.currentCursor.isLoaded) {
            this.context.drawImage(
                this.game.currentCursor.image,
                0,
                0,
                14 * os,
                14 * os,
                mx,
                my,
                14 * s,
                14 * s,
            );
        }
        this.context.restore();
    }

    drawScaledImage(ctx, image, x, y, w, h, dx, dy) {
        var s = this.upscaledRendering ? 1 : this.scale;
        [ctx, image, x, y, w, h, dx, dy].forEach((arg) => {
            if (isUndefined(arg) || isNull(arg) || isNaN(arg) || arg < 0) {
                throw Error(
                    "A problem occured when trying to draw on the canvas: " +
                        "One of these parameters is not nonnegative number: " +
                        `x:${x} y:${y} w:${w} h:${h} dx:${dx} dy:${dy}`,
                );
            }
        });

        ctx.drawImage(
            image,
            x * s,
            y * s,
            w * s,
            h * s,
            dx * this.scale,
            dy * this.scale,
            w * this.scale,
            h * this.scale,
        );
    }

    drawTile(ctx, tileid, tileset, setW, gridW, cellid) {
        var s = this.upscaledRendering ? 1 : this.scale;
        if (tileid !== -1) {
            // -1 when tile is empty in Tiled. Don't attempt to draw it.
            this.drawScaledImage(
                ctx,
                tileset,
                (tileid % (setW / s)) * this.tilesize,
                Math.floor(tileid / (setW / s)) * this.tilesize,
                this.tilesize,
                this.tilesize,
                (cellid % gridW) * this.tilesize,
                Math.floor(cellid / gridW) * this.tilesize,
            );
        }
    }

    clearTile(ctx, gridW, cellid) {
        var s = this.scale,
            ts = this.tilesize,
            x = (cellid % gridW) * ts * s,
            y = Math.floor(cellid / gridW) * ts * s,
            w = ts * s,
            h = w;

        ctx.clearRect(x, y, h, w);
    }

    drawEntity(entity) {
        const sprite = entity.sprite,
            shadow = this.game.shadows["small"],
            anim = entity.currentAnimation,
            os = this.upscaledRendering ? 1 : this.scale,
            ds = this.upscaledRendering ? this.scale : 1;

        if (anim && sprite) {
            const frame = anim.currentFrame,
                s = this.scale,
                x = frame.x * os,
                y = frame.y * os,
                w = sprite.width * os,
                h = sprite.height * os,
                ox = sprite.offsetX * s,
                oy = sprite.offsetY * s,
                dx = entity.x * s,
                dy = entity.y * s,
                dw = w * ds,
                dh = h * ds;

            if (entity.isFading) {
                this.context.save();
                this.context.globalAlpha = entity.fadingAlpha;
            }

            if (!this.mobile && !this.tablet) {
                this.drawEntityName(entity);
            }

            this.context.save();
            if (entity.flipSpriteX) {
                this.context.translate(dx + this.tilesize * s, dy);
                this.context.scale(-1, 1);
            } else if (entity.flipSpriteY) {
                this.context.translate(dx, dy + dh);
                this.context.scale(1, -1);
            } else {
                this.context.translate(dx, dy);
            }

            if (entity.isVisible()) {
                if (entity.hasShadow()) {
                    this.context.drawImage(
                        shadow.image,
                        0,
                        0,
                        shadow.width * os,
                        shadow.height * os,
                        0,
                        entity.shadowOffsetY * ds,
                        shadow.width * os * ds,
                        shadow.height * os * ds,
                    );
                }

                this.context.drawImage(
                    sprite.image,
                    x,
                    y,
                    w,
                    h,
                    ox,
                    oy,
                    dw,
                    dh,
                );

                if (entity instanceof Item && entity.kind !== Entities.CAKE) {
                    const sparks = this.game.sprites["sparks"],
                        anim = this.game.sparksAnimation,
                        frame = anim.currentFrame,
                        sx = sparks.width * frame.index * os,
                        sy = sparks.height * anim.row * os,
                        sw = sparks.width * os,
                        sh = sparks.width * os;

                    this.context.drawImage(
                        sparks.image,
                        sx,
                        sy,
                        sw,
                        sh,
                        sparks.offsetX * s,
                        sparks.offsetY * s,
                        sw * ds,
                        sh * ds,
                    );
                }
            }

            if (
                entity instanceof Character &&
                !entity.isDead &&
                entity.hasWeapon()
            ) {
                var weapon = this.game.sprites[entity.getWeaponName()];

                if (weapon) {
                    var weaponAnimData = weapon.animationData[anim.name],
                        index =
                            frame.index < weaponAnimData.length
                                ? frame.index
                                : frame.index % weaponAnimData.length,
                        wx = weapon.width * index * os,
                        wy = weapon.height * anim.row * os,
                        ww = weapon.width * os,
                        wh = weapon.height * os;

                    this.context.drawImage(
                        weapon.image,
                        wx,
                        wy,
                        ww,
                        wh,
                        weapon.offsetX * s,
                        weapon.offsetY * s,
                        ww * ds,
                        wh * ds,
                    );
                }
            }

            this.context.restore();

            if (entity.isFading) {
                this.context.restore();
            }
        }
    }

    drawEntities(dirtyOnly) {
        this.game.forEachVisibleEntityByDepth((entity) => {
            if (entity.isLoaded) {
                if (dirtyOnly) {
                    if (entity.isDirty) {
                        this.drawEntity(entity);

                        entity.isDirty = false;
                        entity.oldDirtyRect = entity.dirtyRect;
                        entity.dirtyRect = null;
                    }
                } else {
                    this.drawEntity(entity);
                }
            }
        });
    }

    drawDirtyEntities() {
        this.drawEntities(true);
    }

    clearDirtyRect(r) {
        this.context.clearRect(r.x, r.y, r.w, r.h);
    }

    clearDirtyRects() {
        let count = 0;

        this.game.forEachVisibleEntityByDepth((entity) => {
            if (entity.isDirty && entity.oldDirtyRect) {
                this.clearDirtyRect(entity.oldDirtyRect);
                count += 1;
            }
        });

        this.game.forEachAnimatedTile((tile) => {
            if (tile.isDirty) {
                this.clearDirtyRect(tile.dirtyRect);
                count += 1;
            }
        });

        if (this.game.clearTarget && this.lastTargetPos) {
            const last = this.lastTargetPos;
            const rect = this.getTargetBoundingRect(last.x, last.y);

            this.clearDirtyRect(rect);
            this.game.clearTarget = false;
            count += 1;
        }

        if (count > 0) {
            //log.debug("count:"+count);
        }
    }

    getEntityBoundingRect(entity) {
        var rect = {},
            s = this.scale,
            spr;

        if (entity instanceof Player && entity.hasWeapon()) {
            var weapon = this.game.sprites[entity.getWeaponName()];
            spr = weapon;
        } else {
            spr = entity.sprite;
        }

        if (spr) {
            rect.x = (entity.x + spr.offsetX - this.camera.x) * s;
            rect.y = (entity.y + spr.offsetY - this.camera.y) * s;
            rect.w = spr.width * s;
            rect.h = spr.height * s;
            rect.left = rect.x;
            rect.right = rect.x + rect.w;
            rect.top = rect.y;
            rect.bottom = rect.y + rect.h;
        }
        return rect;
    }

    getTileBoundingRect(tile) {
        var rect = {},
            gridW = this.game.map.width,
            s = this.scale,
            ts = this.tilesize,
            cellid = tile.index;

        rect.x = ((cellid % gridW) * ts - this.camera.x) * s;
        rect.y = (Math.floor(cellid / gridW) * ts - this.camera.y) * s;
        rect.w = ts * s;
        rect.h = ts * s;
        rect.left = rect.x;
        rect.right = rect.x + rect.w;
        rect.top = rect.y;
        rect.bottom = rect.y + rect.h;

        return rect;
    }

    getTargetBoundingRect(x, y) {
        var rect = {},
            s = this.scale,
            ts = this.tilesize,
            tx = x || this.game.selectedX,
            ty = y || this.game.selectedY;

        rect.x = (tx * ts - this.camera.x) * s;
        rect.y = (ty * ts - this.camera.y) * s;
        rect.w = ts * s;
        rect.h = ts * s;
        rect.left = rect.x;
        rect.right = rect.x + rect.w;
        rect.top = rect.y;
        rect.bottom = rect.y + rect.h;

        return rect;
    }

    isIntersecting(rect1, rect2) {
        return !(
            rect2.left > rect1.right ||
            rect2.right < rect1.left ||
            rect2.top > rect1.bottom ||
            rect2.bottom < rect1.top
        );
    }

    drawEntityName(entity) {
        this.context.save();
        if (entity.name && entity instanceof Player) {
            var color = entity.id === this.game.playerId ? "#fcda5c" : "white";
            this.drawText(
                entity.name,
                (entity.x + 8) * this.scale,
                (entity.y + entity.nameOffsetY) * this.scale,
                true,
                color,
            );
        }
        this.context.restore();
    }

    drawTerrain() {
        const map = this.game.map,
            tilesetwidth = this.tileset.width / map.tilesize;

        this.game.forEachVisibleTile((id, index) => {
            if (!map.isHighTile(id) && !map.isAnimatedTile(id)) {
                // Don't draw unnecessary tiles
                this.drawTile(
                    this.background,
                    id,
                    this.tileset,
                    tilesetwidth,
                    map.width,
                    index,
                );
            }
        }, 1);
    }

    drawAnimatedTiles(dirtyOnly) {
        const map = this.game.map,
            tilesetwidth = this.tileset.width / map.tilesize;

        this.animatedTileCount = 0;
        this.game.forEachAnimatedTile((tile) => {
            if (dirtyOnly) {
                if (tile.isDirty) {
                    this.drawTile(
                        this.context,
                        tile.id,
                        this.tileset,
                        tilesetwidth,
                        map.width,
                        tile.index,
                    );
                    tile.isDirty = false;
                }
            } else {
                this.drawTile(
                    this.context,
                    tile.id,
                    this.tileset,
                    tilesetwidth,
                    map.width,
                    tile.index,
                );
                this.animatedTileCount += 1;
            }
        });
    }

    drawDirtyAnimatedTiles() {
        this.drawAnimatedTiles(true);
    }

    drawHighTiles(ctx) {
        const map = this.game.map,
            tilesetwidth = this.tileset.width / map.tilesize;

        this.highTileCount = 0;
        this.game.forEachVisibleTile((id, index) => {
            if (map.isHighTile(id)) {
                this.drawTile(
                    ctx,
                    id,
                    this.tileset,
                    tilesetwidth,
                    map.width,
                    index,
                );
                this.highTileCount += 1;
            }
        }, 1);
    }

    drawBackground(ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawFPS() {
        var nowTime = new Date(),
            diffTime = nowTime.getTime() - this.lastTime.getTime();

        if (diffTime >= 1000) {
            this.realFPS = this.frameCount;
            this.frameCount = 0;
            this.lastTime = nowTime;
        }
        this.frameCount++;

        //this.drawText("FPS: " + this.realFPS + " / " + this.maxFPS, 30, 30, false);
        this.drawText("FPS: " + this.realFPS, 30, 30, false);
    }

    drawDebugInfo() {
        if (this.isDebugInfoVisible) {
            this.drawFPS();
            this.drawText("A: " + this.animatedTileCount, 100, 30, false);
            this.drawText("H: " + this.highTileCount, 140, 30, false);
        }
    }

    drawCombatInfo() {
        switch (this.scale) {
            case 2:
                this.setFontSize(20);
                break;
            case 3:
                this.setFontSize(30);
                break;
        }
        this.game.infoManager.forEachInfo((info) => {
            this.context.save();
            this.context.globalAlpha = info.opacity;
            this.drawText(
                info.value,
                (info.x + 8) * this.scale,
                Math.floor(info.y * this.scale),
                true,
                info.fillColor,
                info.strokeColor,
            );
            this.context.restore();
        });
        this.initFont();
    }

    setCameraView(ctx) {
        ctx.translate(-this.camera.x * this.scale, -this.camera.y * this.scale);
    }

    clearScreen(ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getPlayerImage() {
        var canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d"),
            os = this.upscaledRendering ? 1 : this.scale,
            player = this.game.player,
            sprite = player.getArmorSprite(),
            spriteAnim = sprite.animationData["idle_down"],
            // character
            row = spriteAnim.row,
            w = sprite.width * os,
            h = sprite.height * os,
            y = row * h,
            // weapon
            weapon = this.game.sprites[this.game.player.getWeaponName()],
            ww = weapon.width * os,
            wh = weapon.height * os,
            wy = wh * row,
            offsetX = (weapon.offsetX - sprite.offsetX) * os,
            offsetY = (weapon.offsetY - sprite.offsetY) * os,
            // shadow
            shadow = this.game.shadows["small"],
            sw = shadow.width * os,
            sh = shadow.height * os,
            ox = -sprite.offsetX * os,
            oy = -sprite.offsetY * os;

        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(shadow.image, 0, 0, sw, sh, ox, oy, sw, sh);
        ctx.drawImage(sprite.image, 0, y, w, h, 0, 0, w, h);
        ctx.drawImage(weapon.image, 0, wy, ww, wh, offsetX, offsetY, ww, wh);

        return canvas.toDataURL("image/png");
    }

    renderStaticCanvases() {
        this.background.save();
        this.setCameraView(this.background);
        this.drawTerrain();
        this.background.restore();

        if (this.mobile || this.tablet) {
            this.clearScreen(this.foreground);
            this.foreground.save();
            this.setCameraView(this.foreground);
            this.drawHighTiles(this.foreground);
            this.foreground.restore();
        }
    }

    renderFrame() {
        if (this.mobile || this.tablet) {
            this.renderFrameMobile();
        } else {
            this.renderFrameDesktop();
        }
    }

    renderFrameDesktop() {
        this.clearScreen(this.context);

        this.context.save();
        this.setCameraView(this.context);
        this.drawAnimatedTiles();

        if (this.game.started) {
            this.drawSelectedCell();
            this.drawTargetCell();
        }

        //this.drawOccupiedCells();
        this.drawPathingCells();
        this.drawEntities();
        this.drawCombatInfo();
        this.drawHighTiles(this.context);
        this.context.restore();

        // Overlay UI elements
        this.drawCursor();
        this.drawDebugInfo();
    }

    renderFrameMobile() {
        this.clearDirtyRects();
        this.preventFlickeringBug();

        this.context.save();
        this.setCameraView(this.context);

        this.drawDirtyAnimatedTiles();
        this.drawSelectedCell();
        this.drawDirtyEntities();
        this.context.restore();
    }

    preventFlickeringBug() {
        if (this.fixFlickeringTimer.isOver(this.game.currentTime)) {
            this.background.fillRect(0, 0, 0, 0);
            this.context.fillRect(0, 0, 0, 0);
            this.foreground.fillRect(0, 0, 0, 0);
        }
    }
}
