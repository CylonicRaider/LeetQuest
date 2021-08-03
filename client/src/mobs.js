import { Entities, Orientations } from "../../shared/js/gametypes.js";

import Mob from "./mob.js";
import Timer from "./timer.js";

const Mobs = {
    Rat: class extends Mob {
        constructor(id) {
            super(id, Entities.RAT);
            this.moveSpeed = 350;
            this.idleSpeed = 700;
            this.shadowOffsetY = -2;
            this.isAggressive = false;
        }
    },

    Skeleton: class extends Mob {
        constructor(id) {
            super(id, Entities.SKELETON);
            this.moveSpeed = 350;
            this.atkSpeed = 100;
            this.idleSpeed = 800;
            this.shadowOffsetY = 1;
            this.setAttackRate(1300);
        }
    },

    Skeleton2: class extends Mob {
        constructor(id) {
            super(id, Entities.SKELETON2);
            this.moveSpeed = 200;
            this.atkSpeed = 100;
            this.idleSpeed = 800;
            this.walkSpeed = 200;
            this.shadowOffsetY = 1;
            this.setAttackRate(1300);
        }
    },

    Spectre: class extends Mob {
        constructor(id) {
            super(id, Entities.SPECTRE);
            this.moveSpeed = 150;
            this.atkSpeed = 50;
            this.idleSpeed = 200;
            this.walkSpeed = 200;
            this.shadowOffsetY = 1;
            this.setAttackRate(900);
        }
    },

    Deathknight: class extends Mob {
        constructor(id) {
            super(id, Entities.DEATHKNIGHT);
            this.atkSpeed = 50;
            this.moveSpeed = 220;
            this.walkSpeed = 100;
            this.idleSpeed = 450;
            this.setAttackRate(800);
            this.aggroRange = 3;
        }

        idle(orientation) {
            if (!this.hasTarget()) {
                super.idle(Orientations.DOWN);
            } else {
                super.idle(orientation);
            }
        }
    },

    Goblin: class extends Mob {
        constructor(id) {
            super(id, Entities.GOBLIN);
            this.moveSpeed = 150;
            this.atkSpeed = 60;
            this.idleSpeed = 600;
            this.setAttackRate(700);
        }
    },

    Ogre: class extends Mob {
        constructor(id) {
            super(id, Entities.OGRE);
            this.moveSpeed = 300;
            this.atkSpeed = 100;
            this.idleSpeed = 600;
        }
    },

    Crab: class extends Mob {
        constructor(id) {
            super(id, Entities.CRAB);
            this.moveSpeed = 200;
            this.atkSpeed = 40;
            this.idleSpeed = 500;
        }
    },

    Snake: class extends Mob {
        constructor(id) {
            super(id, Entities.SNAKE);
            this.moveSpeed = 200;
            this.atkSpeed = 40;
            this.idleSpeed = 250;
            this.walkSpeed = 100;
            this.shadowOffsetY = -4;
        }
    },

    Eye: class extends Mob {
        constructor(id) {
            super(id, Entities.EYE);
            this.moveSpeed = 200;
            this.atkSpeed = 40;
            this.idleSpeed = 50;
        }
    },

    Bat: class extends Mob {
        constructor(id) {
            super(id, Entities.BAT);
            this.moveSpeed = 120;
            this.atkSpeed = 90;
            this.idleSpeed = 90;
            this.walkSpeed = 85;
            this.isAggressive = false;
        }
    },

    Wizard: class extends Mob {
        constructor(id) {
            super(id, Entities.WIZARD);
            this.moveSpeed = 200;
            this.atkSpeed = 100;
            this.idleSpeed = 150;
        }
    },

    Boss: class extends Mob {
        constructor(id) {
            super(id, Entities.BOSS);
            this.moveSpeed = 300;
            this.atkSpeed = 50;
            this.idleSpeed = 400;
            this.atkRate = 2000;
            this.attackCooldown = new Timer(this.atkRate);
            this.aggroRange = 3;
        }

        idle(orientation) {
            if (!this.hasTarget()) {
                super.idle(Orientations.DOWN);
            } else {
                super.idle(orientation);
            }
        }
    },
};

export default Mobs;
