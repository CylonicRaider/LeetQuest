import Animation from "./animation.js";
import log from "./lib/log.js";
import sprites from "./sprites.js";

export default class Sprite {
    constructor(name, scale) {
        this.name = name;
        this.scale = scale;
        this.isLoaded = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.loadJSON(sprites[name]);
    }

    loadJSON(data) {
        this.id = data.id;
        this.filepath = `img/1/${this.id}.png`;
        this.animationData = data.animations;
        this.width = data.width;
        this.height = data.height;
        this.offsetX = data.offset_x !== undefined ? data.offset_x : -16;
        this.offsetY = data.offset_y !== undefined ? data.offset_y : -16;

        this.load();
    }

    load() {
        this.image = new Image();
        this.image.src = this.filepath;

        this.image.onload = () => {
            this.isLoaded = true;

            if (this.onload_func) {
                this.onload_func();
            }
        };
    }

    createAnimations() {
        var animations = {};

        for (var name in this.animationData) {
            var a = this.animationData[name];
            animations[name] = new Animation(
                name,
                a.length,
                a.row,
                this.width,
                this.height,
            );
        }

        return animations;
    }

    createHurtSprite() {
        var canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d"),
            width = this.image.width,
            height = this.image.height;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(this.image, 0, 0, width, height);

        try {
            const spriteData = ctx.getImageData(0, 0, width, height);

            for (var i = 0; i < spriteData.data.length; i += 4) {
                spriteData.data[i] = 255;
                spriteData.data[i + 1] = spriteData.data[i + 2] = 75;
            }

            ctx.putImageData(spriteData, 0, 0);

            this.whiteSprite = {
                image: canvas,
                isLoaded: true,
                offsetX: this.offsetX,
                offsetY: this.offsetY,
                width: this.width,
                height: this.height,
            };
        } catch (e) {
            log.error("Error getting image data for sprite : " + this.name);
        }
    }

    getHurtSprite() {
        return this.whiteSprite;
    }

    createSilhouette() {
        const canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d"),
            width = this.image.width,
            height = this.image.height;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(this.image, 0, 0, width, height);
        const tmpData = ctx.getImageData(0, 0, width, height);
        const finalData = ctx.getImageData(0, 0, width, height);

        var getIndex = (x, y) => (width * (y - 1) + x - 1) * 4;

        var getPosition = (i) => {
            var x, y;

            i = i / 4 + 1;
            x = i % width;
            y = (i - x) / width + 1;

            return { x: x, y: y };
        };

        var hasAdjacentPixel = (i) => {
            var pos = getPosition(i);

            if (pos.x < width && !isBlankPixel(getIndex(pos.x + 1, pos.y))) {
                return true;
            }
            if (pos.x > 1 && !isBlankPixel(getIndex(pos.x - 1, pos.y))) {
                return true;
            }
            if (pos.y < height && !isBlankPixel(getIndex(pos.x, pos.y + 1))) {
                return true;
            }
            if (pos.y > 1 && !isBlankPixel(getIndex(pos.x, pos.y - 1))) {
                return true;
            }
            return false;
        };

        var isBlankPixel = (i) => {
            if (i < 0 || i >= tmpData.data.length) {
                return true;
            }
            return (
                tmpData.data[i] === 0 &&
                tmpData.data[i + 1] === 0 &&
                tmpData.data[i + 2] === 0 &&
                tmpData.data[i + 3] === 0
            );
        };

        for (var i = 0; i < tmpData.data.length; i += 4) {
            if (isBlankPixel(i) && hasAdjacentPixel(i)) {
                finalData.data[i] = finalData.data[i + 1] = 255;
                finalData.data[i + 2] = 150;
                finalData.data[i + 3] = 150;
            }
        }

        ctx.putImageData(finalData, 0, 0);

        this.silhouetteSprite = {
            image: canvas,
            isLoaded: true,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            width: this.width,
            height: this.height,
        };
    }
}
