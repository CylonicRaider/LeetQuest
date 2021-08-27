import agent from "../sprites/agent.json";
import arrow from "../sprites/arrow.json";
import axe from "../sprites/axe.json";
import bat from "../sprites/bat.json";
import beachnpc from "../sprites/beachnpc.json";
import bluesword from "../sprites/bluesword.json";
import boss from "../sprites/boss.json";
import chest from "../sprites/chest.json";
import clotharmor from "../sprites/clotharmor.json";
import coder from "../sprites/coder.json";
import crab from "../sprites/crab.json";
import death from "../sprites/death.json";
import deathknight from "../sprites/deathknight.json";
import desertnpc from "../sprites/desertnpc.json";
import eye from "../sprites/eye.json";
import firefox from "../sprites/firefox.json";
import forestnpc from "../sprites/forestnpc.json";
import goblin from "../sprites/goblin.json";
import goldenarmor from "../sprites/goldenarmor.json";
import goldensword from "../sprites/goldensword.json";
import guard from "../sprites/guard.json";
import hand from "../sprites/hand.json";
import impact from "../sprites/impact.json";
import itemAxe from "../sprites/item-axe.json";
import itemBluesword from "../sprites/item-bluesword.json";
import itemBurger from "../sprites/item-burger.json";
import itemCake from "../sprites/item-cake.json";
import itemFirepotion from "../sprites/item-firepotion.json";
import itemFlask from "../sprites/item-flask.json";
import itemGoldenarmor from "../sprites/item-goldenarmor.json";
import itemGoldensword from "../sprites/item-goldensword.json";
import itemLeatherarmor from "../sprites/item-leatherarmor.json";
import itemMailarmor from "../sprites/item-mailarmor.json";
import itemMorningstar from "../sprites/item-morningstar.json";
import itemPlatearmor from "../sprites/item-platearmor.json";
import itemRedarmor from "../sprites/item-redarmor.json";
import itemRedsword from "../sprites/item-redsword.json";
import itemSword1 from "../sprites/item-sword1.json";
import itemSword2 from "../sprites/item-sword2.json";
import king from "../sprites/king.json";
import lavanpc from "../sprites/lavanpc.json";
import leatherarmor from "../sprites/leatherarmor.json";
import loot from "../sprites/loot.json";
import mailarmor from "../sprites/mailarmor.json";
import morningstar from "../sprites/morningstar.json";
import nyan from "../sprites/nyan.json";
import octocat from "../sprites/octocat.json";
import ogre from "../sprites/ogre.json";
import platearmor from "../sprites/platearmor.json";
import priest from "../sprites/priest.json";
import rat from "../sprites/rat.json";
import redarmor from "../sprites/redarmor.json";
import redsword from "../sprites/redsword.json";
import rick from "../sprites/rick.json";
import scientist from "../sprites/scientist.json";
import shadow16 from "../sprites/shadow16.json";
import skeleton2 from "../sprites/skeleton2.json";
import skeleton from "../sprites/skeleton.json";
import snake from "../sprites/snake.json";
import sorcerer from "../sprites/sorcerer.json";
import sparks from "../sprites/sparks.json";
import spectre from "../sprites/spectre.json";
import sword1 from "../sprites/sword1.json";
import sword2 from "../sprites/sword2.json";
import sword from "../sprites/sword.json";
import talk from "../sprites/talk.json";
import target from "../sprites/target.json";
import villagegirl from "../sprites/villagegirl.json";
import villager from "../sprites/villager.json";
import wizard from "../sprites/wizard.json";

// TODO: perhaps use a custom webpack loader to import all json files into an array at once

const SPRITE_OBJECTS = [
    agent,
    arrow,
    axe,
    bat,
    beachnpc,
    bluesword,
    boss,
    chest,
    clotharmor,
    coder,
    crab,
    death,
    deathknight,
    desertnpc,
    eye,
    firefox,
    forestnpc,
    goblin,
    goldenarmor,
    goldensword,
    guard,
    hand,
    impact,
    itemAxe,
    itemBluesword,
    itemBurger,
    itemCake,
    itemFirepotion,
    itemFlask,
    itemGoldenarmor,
    itemGoldensword,
    itemLeatherarmor,
    itemMailarmor,
    itemMorningstar,
    itemPlatearmor,
    itemRedarmor,
    itemRedsword,
    itemSword1,
    itemSword2,
    king,
    lavanpc,
    leatherarmor,
    loot,
    mailarmor,
    morningstar,
    nyan,
    octocat,
    ogre,
    platearmor,
    priest,
    rat,
    redarmor,
    redsword,
    rick,
    scientist,
    shadow16,
    skeleton,
    skeleton2,
    snake,
    sorcerer,
    sparks,
    spectre,
    sword,
    sword1,
    sword2,
    talk,
    target,
    villagegirl,
    villager,
    wizard,
];

// TODO: use Map instead
const sprites = {};

for (const sprite of SPRITE_OBJECTS) {
    sprites[sprite.id] = sprite;
}

export default sprites;
