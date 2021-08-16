import $ from "jquery";
import forEach from "lodash-es/forEach.js";
import supportsLocalStorage from "modernizr-esm/feature/storage/localstorage";

import App from "./app.js";
import Detect from "./detect.js";
import Game from "./game.js";
import log from "./lib/log.js";
import { TRANSITIONEND } from "./util.js";

var app, game;

function initApp() {
    var ctx = document.querySelector("canvas").getContext("2d"),
        parchment = document.getElementById("parchment");

    if (!Detect.supportsWebSocket()) {
        parchment.className = "error";
    }

    if (ctx.imageSmoothingEnabled === undefined) {
        document.querySelector("body").className += " upscaled";
    }

    if (!supportsLocalStorage) {
        var alert = document.createElement("div");
        alert.className = "alert";
        const alertMsg = document.createTextNode(
            "You need to enable cookies/localStorage to play BrowserQuest",
        );
        alert.appendChild(alertMsg);

        const target = document.getElementById("intro");
        document.body.insertBefore(alert, target);
    } else if (localStorage && localStorage.data) {
        parchment.className = "loadcharacter";
    }

    app = new App();
    app.center();

    if (Detect.isWindows()) {
        // Workaround for graphical glitches on text
        $("body").addClass("windows");
    }

    if (Detect.isOpera()) {
        // Fix for no pointer events
        $("body").addClass("opera");
    }

    if (Detect.isFirefoxAndroid()) {
        // Remove chat placeholder
        $("#chatinput").removeAttr("placeholder");
    }

    $("body").on("click", () => {
        if ($("#parchment").hasClass("credits")) {
            app.toggleCredits();
        }

        if ($("#parchment").hasClass("about")) {
            app.toggleAbout();
        }
    });

    $(".barbutton").on("click", ({ currentTarget }) => {
        $(currentTarget).toggleClass("active");
    });

    $("#chatbutton").on("click", () => {
        if ($("#chatbutton").hasClass("active")) {
            app.showChat();
        } else {
            app.hideChat();
        }
    });

    $("#helpbutton").on("click", () => {
        app.toggleAbout();
    });

    $("#achievementsbutton").on("click", ({ currentTarget }) => {
        app.toggleAchievements();
        if (app.blinkInterval) {
            clearInterval(app.blinkInterval);
        }
        $(currentTarget).removeClass("blink");
    });

    $("#instructions").on("click", () => {
        app.hideWindows();
    });

    $("#playercount").on("click", () => {
        app.togglePopulationInfo();
    });

    $("#population").on("click", () => {
        app.togglePopulationInfo();
    });

    $(".clickable").on("click", (event) => {
        event.stopPropagation();
    });

    $("#toggle-credits").on("click", () => {
        app.toggleCredits();
    });

    $("#create-new span").on("click", () => {
        app.animateParchment("loadcharacter", "confirmation");
    });

    $(".delete").on("click", () => {
        app.storage.clear();
        app.animateParchment("confirmation", "createcharacter");
    });

    $("#cancel span").on("click", () => {
        app.animateParchment("confirmation", "loadcharacter");
    });

    $(".ribbon").on("click", () => {
        app.toggleAbout();
    });

    $("#nameinput").on("keyup", () => {
        app.toggleButton();
    });

    $("#previous").on("click", () => {
        var $achievements = $("#achievements");

        if (app.currentPage === 1) {
            return false;
        } else {
            app.currentPage -= 1;
            $achievements
                .removeClass()
                .addClass("active page" + app.currentPage);
        }
    });

    $("#next").on("click", () => {
        var $achievements = $("#achievements"),
            $lists = $("#lists"),
            nbPages = $lists.children("ul").length;

        if (app.currentPage === nbPages) {
            return false;
        } else {
            app.currentPage += 1;
            $achievements
                .removeClass()
                .addClass("active page" + app.currentPage);
        }
    });

    $("#notifications div").on(
        TRANSITIONEND,
        app.resetMessagesPosition.bind(app),
    );

    $(".close").on("click", () => {
        app.hideWindows();
    });

    $(".twitter").on("click", ({ currentTarget }) => {
        var url = $(currentTarget).attr("href");

        app.openPopup("twitter", url);
        return false;
    });

    $(".facebook").on("click", ({ currentTarget }) => {
        var url = $(currentTarget).attr("href");

        app.openPopup("facebook", url);
        return false;
    });

    var data = app.storage.data;
    if (data.hasAlreadyPlayed) {
        if (data.player.name && data.player.name !== "") {
            $("#playername").html(data.player.name);
            $("#playerimage").attr("src", data.player.image);
        }
    }

    $(".play div").on("click", () => {
        var nameFromInput = $("#nameinput").val(),
            nameFromStorage = $("#playername").html(),
            name = nameFromInput || nameFromStorage;

        app.tryStartingGame(name);
    });

    document.addEventListener("touchstart", () => {}, false);

    $("#resize-check").on(TRANSITIONEND, app.resizeUi.bind(app));

    log.info("App initialized.");

    initGame();
}

function initGame() {
    var canvas = document.getElementById("entities"),
        background = document.getElementById("background"),
        foreground = document.getElementById("foreground"),
        input = document.getElementById("chatinput");

    game = new Game(app);
    game.setup("#bubbles", canvas, background, foreground, input);
    game.setStorage(app.storage);
    app.setGame(game);

    if (app.isDesktop && app.supportsWorkers) {
        game.loadMap();
    }

    game.onGameStart(() => {
        app.initEquipmentIcons();
    });

    game.onDisconnect((message) => {
        $("#death")
            .find("p")
            .html(`${message}<em>Please reload the page.</em>`);
        $("#respawn").hide();
    });

    game.onPlayerDeath(() => {
        if ($("body").hasClass("credits")) {
            $("body").removeClass("credits");
        }
        $("body").addClass("death");
    });

    game.onPlayerEquipmentChange(() => {
        app.initEquipmentIcons();
    });

    game.onPlayerInvincible(() => {
        $("#hitpoints").toggleClass("invincible");
    });

    game.onNbPlayersChange((worldPlayers, totalPlayers) => {
        var setWorldPlayersString = (string) => {
                $("#instance-population")
                    .find("span:nth-child(2)")
                    .text(string);
                $("#playercount").find("span:nth-child(2)").text(string);
            },
            setTotalPlayersString = (string) => {
                $("#world-population").find("span:nth-child(2)").text(string);
            };

        $("#playercount").find("span.count").text(worldPlayers);

        $("#instance-population").find("span").text(worldPlayers);
        if (worldPlayers == 1) {
            setWorldPlayersString("player");
        } else {
            setWorldPlayersString("players");
        }

        $("#world-population").find("span").text(totalPlayers);
        if (totalPlayers == 1) {
            setTotalPlayersString("player");
        } else {
            setTotalPlayersString("players");
        }
    });

    game.onAchievementUnlock((id, name, _description) => {
        app.unlockAchievement(id, name);
    });

    game.onNotification((message) => {
        app.showMessage(message);
    });

    app.initHealthBar();

    $("#nameinput").val("");
    $("#chatbox").val("");

    if (game.renderer.mobile || game.renderer.tablet) {
        $("#foreground").on("touchstart", (event) => {
            app.center();
            app.setMouseCoordinates(event.originalEvent.touches[0]);
            game.click();
            app.hideWindows();
        });
    } else {
        $("#foreground").on("click", (event) => {
            app.center();
            app.setMouseCoordinates(event);
            if (game) {
                game.click();
            }
            app.hideWindows();
        });
    }

    $("body").off("click");
    $("body").on("click", () => {
        var hasClosedParchment = false;

        if ($("#parchment").hasClass("credits")) {
            if (game.started) {
                app.closeInGameCredits();
                hasClosedParchment = true;
            } else {
                app.toggleCredits();
            }
        }

        if ($("#parchment").hasClass("about")) {
            if (game.started) {
                app.closeInGameAbout();
                hasClosedParchment = true;
            } else {
                app.toggleAbout();
            }
        }

        if (
            game.started &&
            !game.renderer.mobile &&
            game.player &&
            !hasClosedParchment
        ) {
            game.click();
        }
    });

    $("#respawn").on("click", () => {
        game.audioManager.playSound("revive");
        game.restart();
        $("body").removeClass("death");
    });

    $(document).on("mousemove", (event) => {
        app.setMouseCoordinates(event);
        if (game.started) {
            game.movecursor();
        }
    });

    $(document).on("keydown", (event) => {
        var $chat = $("#chatinput");

        if (event.key === "Enter") {
            if ($("#chatbox").hasClass("active")) {
                app.hideChat();
            } else {
                app.showChat();
            }
        }
    });

    $("#chatinput").on("keydown", (event) => {
        var $chat = $("#chatinput"),
            placeholder = $(event.currentTarget).attr("placeholder");

        if (!(event.shiftKey && event.key === "Shift") && event.key !== "Tab") {
            if ($(event.currentTarget).val() === placeholder) {
                $(event.currentTarget).val("");
                $(event.currentTarget).removeAttr("placeholder");
                $(event.currentTarget).removeClass("placeholder");
            }
        }

        if (event.key === "Enter") {
            if ($chat.val() !== "") {
                if (game.player) {
                    game.say($chat.val());
                }
                $chat.val("");
                app.hideChat();
                $("#foreground").trigger("focus");
                return false;
            } else {
                app.hideChat();
                return false;
            }
        }

        if (event.key === "Escape") {
            app.hideChat();
            return false;
        }
    });

    $("#chatinput").on("focus", ({ currentTarget }) => {
        var placeholder = $(currentTarget).attr("placeholder");

        if (!Detect.isFirefoxAndroid()) {
            $(currentTarget).val(placeholder);
        }

        if ($(currentTarget).val() === placeholder) {
            currentTarget.setSelectionRange(0, 0);
        }
    });

    $("#nameinput").on("focusin", () => {
        $("#name-tooltip").addClass("visible");
    });

    $("#nameinput").on("focusout", () => {
        $("#name-tooltip").removeClass("visible");
    });

    $("#nameinput").on("keypress", (event) => {
        var $name = $("#nameinput"),
            name = $name.val();

        $("#name-tooltip").removeClass("visible");

        if (event.key === "Enter") {
            if (name !== "") {
                app.tryStartingGame(name, () => {
                    $name.trigger("blur"); // exit keyboard on mobile
                });
                return false; // prevent form submit
            } else {
                return false; // prevent form submit
            }
        }
    });

    $("#mutebutton").on("click", () => {
        game.audioManager.toggle();
    });

    $(document).on("keydown", (event) => {
        var $chat = $("#chatinput");

        if (
            $("#chatinput:focus").size == 0 &&
            $("#nameinput:focus").size == 0
        ) {
            if (event.key === "Enter") {
                if (game.ready) {
                    $chat.trigger("focus");
                    return false;
                }
            }
            if (event.code === "Space") {
                // game.togglePathingGrid();
                return false;
            }
            if (event.code === "KeyF") {
                // game.toggleDebugInfo();
                return false;
            }
            if (event.key === "Escape") {
                app.hideWindows();
                forEach(game.player.attackers, (attacker) => {
                    attacker.stop();
                });
                return false;
            }
            if (event.code === "KeyA") {
                // game.player.hit();
                return false;
            }
        } else {
            if (event.key === "Enter" && game.ready) {
                $chat.trigger("focus");
                return false;
            }
        }
    });

    if (game.renderer.tablet) {
        $("body").addClass("tablet");
    }
}

$(initApp);
