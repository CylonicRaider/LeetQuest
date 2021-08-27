import { Entities } from "../../shared/js/gametypes.js";

import Item from "./item.js";

const Items = {
    Sword2: class extends Item {
        constructor(id) {
            super(id, Entities.SWORD2, "weapon");
            this.lootMessage = "You pick up a steel sword";
        }
    },

    Axe: class extends Item {
        constructor(id) {
            super(id, Entities.AXE, "weapon");
            this.lootMessage = "You pick up an axe";
        }
    },

    RedSword: class extends Item {
        constructor(id) {
            super(id, Entities.REDSWORD, "weapon");
            this.lootMessage = "You pick up a blazing sword";
        }
    },

    BlueSword: class extends Item {
        constructor(id) {
            super(id, Entities.BLUESWORD, "weapon");
            this.lootMessage = "You pick up a magic sword";
        }
    },

    GoldenSword: class extends Item {
        constructor(id) {
            super(id, Entities.GOLDENSWORD, "weapon");
            this.lootMessage = "You pick up the ultimate sword";
        }
    },

    MorningStar: class extends Item {
        constructor(id) {
            super(id, Entities.MORNINGSTAR, "weapon");
            this.lootMessage = "You pick up a morning star";
        }
    },

    LeatherArmor: class extends Item {
        constructor(id) {
            super(id, Entities.LEATHERARMOR, "armor");
            this.lootMessage = "You equip a leather armor";
        }
    },

    MailArmor: class extends Item {
        constructor(id) {
            super(id, Entities.MAILARMOR, "armor");
            this.lootMessage = "You equip a mail armor";
        }
    },

    PlateArmor: class extends Item {
        constructor(id) {
            super(id, Entities.PLATEARMOR, "armor");
            this.lootMessage = "You equip a plate armor";
        }
    },

    RedArmor: class extends Item {
        constructor(id) {
            super(id, Entities.REDARMOR, "armor");
            this.lootMessage = "You equip a ruby armor";
        }
    },

    GoldenArmor: class extends Item {
        constructor(id) {
            super(id, Entities.GOLDENARMOR, "armor");
            this.lootMessage = "You equip a golden armor";
        }
    },

    Flask: class extends Item {
        constructor(id) {
            super(id, Entities.FLASK, "object");
            this.lootMessage = "You drink a health potion";
        }
    },

    Cake: class extends Item {
        constructor(id) {
            super(id, Entities.CAKE, "object");
            this.lootMessage = "You eat a cake";
        }
    },

    Burger: class extends Item {
        constructor(id) {
            super(id, Entities.BURGER, "object");
            this.lootMessage = "You can haz rat burger";
        }
    },

    FirePotion: class extends Item {
        constructor(id) {
            super(id, Entities.FIREPOTION, "object");
            this.lootMessage = "You feel the power of Firefox!";
        }

        onLoot(player) {
            player.startInvincibility();
        }
    },
};

export default Items;
