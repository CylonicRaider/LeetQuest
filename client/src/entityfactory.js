import isFunction from "lodash-es/isFunction.js";

import { Entities } from "../../shared/js/gametypes.js";

import Chest from "./chest.js";
import Items from "./items.js";
import log from "./lib/log.js";
import Mobs from "./mobs.js";
import NPCs from "./npcs.js";
import Warrior from "./warrior.js";

export default {
    createEntity(kind, id, name) {
        if (!kind) {
            log.error("kind is undefined");
            return;
        }

        if (!isFunction(this.builders[kind])) {
            throw Error(kind + " is not a valid Entity type");
        }

        return this.builders[kind](id, name);
    },

    //===== mobs ======
    builders: {
        [Entities.WARRIOR](id, name) {
            return new Warrior(id, name);
        },

        [Entities.RAT](id) {
            return new Mobs.Rat(id);
        },

        [Entities.SKELETON](id) {
            return new Mobs.Skeleton(id);
        },

        [Entities.SKELETON2](id) {
            return new Mobs.Skeleton2(id);
        },

        [Entities.SPECTRE](id) {
            return new Mobs.Spectre(id);
        },

        [Entities.DEATHKNIGHT](id) {
            return new Mobs.Deathknight(id);
        },

        [Entities.GOBLIN](id) {
            return new Mobs.Goblin(id);
        },

        [Entities.OGRE](id) {
            return new Mobs.Ogre(id);
        },

        [Entities.CRAB](id) {
            return new Mobs.Crab(id);
        },

        [Entities.SNAKE](id) {
            return new Mobs.Snake(id);
        },

        [Entities.EYE](id) {
            return new Mobs.Eye(id);
        },

        [Entities.BAT](id) {
            return new Mobs.Bat(id);
        },

        [Entities.WIZARD](id) {
            return new Mobs.Wizard(id);
        },

        [Entities.BOSS](id) {
            return new Mobs.Boss(id);
        },

        //===== items ======

        [Entities.SWORD2](id) {
            return new Items.Sword2(id);
        },

        [Entities.AXE](id) {
            return new Items.Axe(id);
        },

        [Entities.REDSWORD](id) {
            return new Items.RedSword(id);
        },

        [Entities.BLUESWORD](id) {
            return new Items.BlueSword(id);
        },

        [Entities.GOLDENSWORD](id) {
            return new Items.GoldenSword(id);
        },

        [Entities.MORNINGSTAR](id) {
            return new Items.MorningStar(id);
        },

        [Entities.MAILARMOR](id) {
            return new Items.MailArmor(id);
        },

        [Entities.LEATHERARMOR](id) {
            return new Items.LeatherArmor(id);
        },

        [Entities.PLATEARMOR](id) {
            return new Items.PlateArmor(id);
        },

        [Entities.REDARMOR](id) {
            return new Items.RedArmor(id);
        },

        [Entities.GOLDENARMOR](id) {
            return new Items.GoldenArmor(id);
        },

        [Entities.FLASK](id) {
            return new Items.Flask(id);
        },

        [Entities.FIREPOTION](id) {
            return new Items.FirePotion(id);
        },

        [Entities.BURGER](id) {
            return new Items.Burger(id);
        },

        [Entities.CAKE](id) {
            return new Items.Cake(id);
        },

        [Entities.CHEST](id) {
            return new Chest(id);
        },

        //====== NPCs ======

        [Entities.GUARD](id) {
            return new NPCs.Guard(id);
        },

        [Entities.KING](id) {
            return new NPCs.King(id);
        },

        [Entities.VILLAGEGIRL](id) {
            return new NPCs.VillageGirl(id);
        },

        [Entities.VILLAGER](id) {
            return new NPCs.Villager(id);
        },

        [Entities.CODER](id) {
            return new NPCs.Coder(id);
        },

        [Entities.AGENT](id) {
            return new NPCs.Agent(id);
        },

        [Entities.RICK](id) {
            return new NPCs.Rick(id);
        },

        [Entities.SCIENTIST](id) {
            return new NPCs.Scientist(id);
        },

        [Entities.NYAN](id) {
            return new NPCs.Nyan(id);
        },

        [Entities.PRIEST](id) {
            return new NPCs.Priest(id);
        },

        [Entities.SORCERER](id) {
            return new NPCs.Sorcerer(id);
        },

        [Entities.OCTOCAT](id) {
            return new NPCs.Octocat(id);
        },

        [Entities.BEACHNPC](id) {
            return new NPCs.BeachNpc(id);
        },

        [Entities.FORESTNPC](id) {
            return new NPCs.ForestNpc(id);
        },

        [Entities.DESERTNPC](id) {
            return new NPCs.DesertNpc(id);
        },

        [Entities.LAVANPC](id) {
            return new NPCs.LavaNpc(id);
        },
    },
};
