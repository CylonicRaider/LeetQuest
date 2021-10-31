export function isInt(n) {
    return n % 1 === 0;
}

export const TRANSITIONEND = "transitionend webkitTransitionEnd oTransitionEnd";

// https://paulirish.com/2011/requestanimationframe-for-smart-animating/
export const requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (/* function */ callback, /* DOMElement */ _element) {
        window.setTimeout(callback, 1000 / 60);
    };
