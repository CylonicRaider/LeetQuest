import { Entities } from "../../shared/js/gametypes.js";

import Npc from "./npc.js";

const NPCs = {
    Guard: class extends Npc {
        constructor(id) {
            super(id, Entities.GUARD, 1);
        }
    },

    King: class extends Npc {
        constructor(id) {
            super(id, Entities.KING, 1);
        }
    },

    Agent: class extends Npc {
        constructor(id) {
            super(id, Entities.AGENT, 1);
        }
    },

    Rick: class extends Npc {
        constructor(id) {
            super(id, Entities.RICK, 1);
        }
    },

    VillageGirl: class extends Npc {
        constructor(id) {
            super(id, Entities.VILLAGEGIRL, 1);
        }
    },

    Villager: class extends Npc {
        constructor(id) {
            super(id, Entities.VILLAGER, 1);
        }
    },

    Coder: class extends Npc {
        constructor(id) {
            super(id, Entities.CODER, 1);
        }
    },

    Scientist: class extends Npc {
        constructor(id) {
            super(id, Entities.SCIENTIST, 1);
        }
    },

    Nyan: class extends Npc {
        constructor(id) {
            super(id, Entities.NYAN, 1);
            this.idleSpeed = 50;
        }
    },

    Sorcerer: class extends Npc {
        constructor(id) {
            super(id, Entities.SORCERER, 1);
            this.idleSpeed = 150;
        }
    },

    Priest: class extends Npc {
        constructor(id) {
            super(id, Entities.PRIEST, 1);
        }
    },

    BeachNpc: class extends Npc {
        constructor(id) {
            super(id, Entities.BEACHNPC, 1);
        }
    },

    ForestNpc: class extends Npc {
        constructor(id) {
            super(id, Entities.FORESTNPC, 1);
        }
    },

    DesertNpc: class extends Npc {
        constructor(id) {
            super(id, Entities.DESERTNPC, 1);
        }
    },

    LavaNpc: class extends Npc {
        constructor(id) {
            super(id, Entities.LAVANPC, 1);
        }
    },

    Octocat: class extends Npc {
        constructor(id) {
            super(id, Entities.OCTOCAT, 1);
        }
    },
};

export default NPCs;
