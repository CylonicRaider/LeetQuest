import $ from "jquery";
import forEach from "lodash-es/forEach.js";

import Timer from "./timer.js";

class Bubble {
    constructor(id, element, time) {
        this.id = id;
        this.element = element;
        this.timer = new Timer(5000, time);
    }

    isOver(time) {
        if (this.timer.isOver(time)) {
            return true;
        }
        return false;
    }

    destroy() {
        $(this.element).remove();
    }

    reset(time) {
        this.timer.lastTime = time;
    }
}

export default class BubbleManager {
    constructor(container) {
        this.container = container;
        this.bubbles = {};
    }

    getBubbleById(id) {
        if (id in this.bubbles) {
            return this.bubbles[id];
        }
        return null;
    }

    create(id, message, time) {
        if (this.bubbles[id]) {
            this.bubbles[id].reset(time);
            $("#" + id + " p").html(message);
        } else {
            var el = $(
                '<div id="' +
                    id +
                    '" class="bubble"><p>' +
                    message +
                    '</p><div class="thingy"></div></div>',
            ); //.attr('id', id);
            $(el).appendTo(this.container);

            this.bubbles[id] = new Bubble(id, el, time);
        }
    }

    update(time) {
        var bubblesToDelete = [];

        forEach(this.bubbles, (bubble) => {
            if (bubble.isOver(time)) {
                bubble.destroy();
                bubblesToDelete.push(bubble.id);
            }
        });

        forEach(bubblesToDelete, (id) => {
            delete this.bubbles[id];
        });
    }

    clean() {
        var bubblesToDelete = [];

        forEach(this.bubbles, (bubble) => {
            bubble.destroy();
            bubblesToDelete.push(bubble.id);
        });

        forEach(bubblesToDelete, (id) => {
            delete this.bubbles[id];
        });

        this.bubbles = {};
    }

    destroyBubble(id) {
        var bubble = this.getBubbleById(id);

        if (bubble) {
            bubble.destroy();
            delete this.bubbles[id];
        }
    }

    forEachBubble(callback) {
        forEach(this.bubbles, (bubble) => callback(bubble));
    }
}
