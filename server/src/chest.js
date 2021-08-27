import size from "lodash-es/size.js";

import { Entities } from "../../shared/js/gametypes.js";

import Item from "./item.js";
import * as Utils from "./utils.js";

export default class Chest extends Item {
    constructor(id, x, y) {
        super(id, Entities.CHEST, x, y);
    }

    setItems(items) {
        this.items = items;
    }

    getRandomItem() {
        const nbItems = size(this.items);
        let item = null;

        if (nbItems > 0) {
            item = this.items[Utils.random(nbItems)];
        }
        return item;
    }
}
