import $ from "jquery";
import forEach from "lodash-es/forEach.js";

import log from "./lib/log.js";
import Storage from "./storage.js";
import { TRANSITIONEND } from "./util.js";

export default class App {
    constructor(config) {
        this.config = config;
        this.currentPage = 1;
        this.blinkInterval = null;
        this.previousState = null;
        this.isParchmentReady = true;
        this.ready = false;
        this.storage = new Storage();
        this.watchNameInputInterval = setInterval(
            this.toggleButton.bind(this),
            100,
        );
        this.$playButton = $(".play");
        this.$playDiv = $(".play div");
    }

    setGame(game) {
        this.game = game;
        this.isMobile = this.game.renderer.mobile;
        this.isTablet = this.game.renderer.tablet;
        this.isDesktop = !(this.isMobile || this.isTablet);
        this.supportsWorkers = !!window.Worker;
        this.ready = true;
    }

    center() {
        window.scrollTo(0, 1);
    }

    canStartGame() {
        if (this.isDesktop) {
            return this.game && this.game.map && this.game.map.isLoaded;
        } else {
            return this.game;
        }
    }

    tryStartingGame(username, starting_callback) {
        var $play = this.$playButton;

        if (username !== "") {
            if (!this.ready || !this.canStartGame()) {
                if (!this.isMobile) {
                    // on desktop and tablets, add a spinner to the play button
                    $play.addClass("loading");
                }
                this.$playDiv.off("click");
                var watchCanStart = setInterval(() => {
                    log.debug("waiting...");
                    if (this.canStartGame()) {
                        setTimeout(() => {
                            if (!this.isMobile) {
                                $play.removeClass("loading");
                            }
                        }, 1500);
                        clearInterval(watchCanStart);
                        this.startGame(username, starting_callback);
                    }
                }, 100);
            } else {
                this.$playDiv.off("click");
                this.startGame(username, starting_callback);
            }
        }
    }

    startGame(username, starting_callback) {
        if (starting_callback) {
            starting_callback();
        }
        this.hideIntro(() => {
            if (!this.isDesktop) {
                // On mobile and tablet we load the map after the player has clicked
                // on the PLAY button instead of loading it in a web worker.
                this.game.loadMap();
            }
            this.start(username);
        });
    }

    start(username) {
        var firstTimePlaying = !this.storage.hasAlreadyPlayed();

        if (username && !this.game.started) {
            this.game.setServerOptions(
                this.config.host,
                this.config.port,
                username,
            );

            this.center();
            this.game.run(() => {
                $("body").addClass("started");
                if (firstTimePlaying) {
                    this.toggleInstructions();
                }
            });
        }
    }

    setMouseCoordinates(event) {
        var gamePos = $("#container").offset(),
            scale = this.game.renderer.getScaleFactor(),
            width = this.game.renderer.getWidth(),
            height = this.game.renderer.getHeight(),
            mouse = this.game.mouse;

        mouse.x = event.pageX - gamePos.left - (this.isMobile ? 0 : 5 * scale);
        mouse.y = event.pageY - gamePos.top - (this.isMobile ? 0 : 7 * scale);

        if (mouse.x <= 0) {
            mouse.x = 0;
        } else if (mouse.x >= width) {
            mouse.x = width - 1;
        }

        if (mouse.y <= 0) {
            mouse.y = 0;
        } else if (mouse.y >= height) {
            mouse.y = height - 1;
        }
    }

    initHealthBar() {
        var scale = this.game.renderer.getScaleFactor(),
            healthMaxWidth = $("#healthbar").width() - 12 * scale;

        this.game.onPlayerHealthChange((hp, maxHp) => {
            var barWidth = Math.round(
                (healthMaxWidth / maxHp) * (hp > 0 ? hp : 0),
            );
            $("#hitpoints").css("width", `${barWidth}px`);
        });

        this.game.onPlayerHurt(this.blinkHealthBar.bind(this));
    }

    blinkHealthBar() {
        var $hitpoints = $("#hitpoints");

        $hitpoints.addClass("white");
        setTimeout(() => {
            $hitpoints.removeClass("white");
        }, 500);
    }

    toggleButton() {
        var name = $("#parchment input").val(),
            $play = $("#createcharacter .play");

        if (name && name.length > 0) {
            $play.removeClass("disabled");
            $("#character").removeClass("disabled");
        } else {
            $play.addClass("disabled");
            $("#character").addClass("disabled");
        }
    }

    hideIntro(hidden_callback) {
        clearInterval(this.watchNameInputInterval);
        $("body").removeClass("intro");
        setTimeout(() => {
            $("body").addClass("game");
            hidden_callback();
        }, 1000);
    }

    showChat() {
        if (this.game.started) {
            $("#chatbox").addClass("active");
            $("#chatinput").trigger("focus");
            $("#chatbutton").addClass("active");
        }
    }

    hideChat() {
        if (this.game.started) {
            $("#chatbox").removeClass("active");
            $("#chatinput").trigger("blur");
            $("#chatbutton").removeClass("active");
        }
    }

    toggleInstructions() {
        if ($("#achievements").hasClass("active")) {
            this.toggleAchievements();
            $("#achievementsbutton").removeClass("active");
        }
        $("#instructions").toggleClass("active");
    }

    toggleAchievements() {
        if ($("#instructions").hasClass("active")) {
            this.toggleInstructions();
            $("#helpbutton").removeClass("active");
        }
        this.resetPage();
        $("#achievements").toggleClass("active");
    }

    resetPage() {
        var $achievements = $("#achievements");

        if ($achievements.hasClass("active")) {
            $achievements.on(TRANSITIONEND, () => {
                $achievements
                    .removeClass(`page${this.currentPage}`)
                    .addClass("page1");
                this.currentPage = 1;
                $achievements.off(TRANSITIONEND);
            });
        }
    }

    initEquipmentIcons() {
        var scale = this.game.renderer.getScaleFactor();
        var getIconPath = (spriteName) => `img/1/item-${spriteName}.png`,
            weapon = this.game.player.getWeaponName(),
            armor = this.game.player.getSpriteName(),
            weaponPath = getIconPath(weapon),
            armorPath = getIconPath(armor);

        $("#weapon").css("background-image", `url("${weaponPath}")`);
        if (armor !== "firefox") {
            $("#armor").css("background-image", `url("${armorPath}")`);
        }
    }

    hideWindows() {
        if ($("#achievements").hasClass("active")) {
            this.toggleAchievements();
            $("#achievementsbutton").removeClass("active");
        }
        if ($("#instructions").hasClass("active")) {
            this.toggleInstructions();
            $("#helpbutton").removeClass("active");
        }
        if ($("body").hasClass("credits")) {
            this.closeInGameCredits();
        }
        if ($("body").hasClass("about")) {
            this.closeInGameAbout();
        }
    }

    showAchievementNotification(id, name) {
        var $notif = $("#achievement-notification"),
            $name = $notif.find(".name"),
            $button = $("#achievementsbutton");

        $notif.removeClass().addClass("active achievement" + id);
        $name.text(name);
        if (this.game.storage.getAchievementCount() === 1) {
            this.blinkInterval = setInterval(() => {
                $button.toggleClass("blink");
            }, 500);
        }
        setTimeout(() => {
            $notif.removeClass("active");
            $button.removeClass("blink");
        }, 5000);
    }

    displayUnlockedAchievement(id) {
        var $achievement = $("#achievements li.achievement" + id);

        var achievement = this.game.getAchievementById(id);
        if (achievement && achievement.hidden) {
            this.setAchievementData(
                $achievement,
                achievement.name,
                achievement.desc,
            );
        }
        $achievement.addClass("unlocked");
    }

    unlockAchievement(id, name) {
        this.showAchievementNotification(id, name);
        this.displayUnlockedAchievement(id);

        var nb = parseInt($("#unlocked-achievements").text());
        $("#unlocked-achievements").text(nb + 1);
    }

    initAchievementList(achievements) {
        var $lists = $("#lists"),
            $page = $("#page-tmpl"),
            $achievement = $("#achievement-tmpl"),
            page = 0,
            count = 0,
            $p = null;

        forEach(achievements, (achievement) => {
            count++;

            var $a = $achievement.clone();
            $a.removeAttr("id");
            $a.addClass("achievement" + count);
            if (!achievement.hidden) {
                this.setAchievementData($a, achievement.name, achievement.desc);
            }
            $a.show();
            $a.find("a").on("click", ({ currentTarget }) => {
                var url = $(currentTarget).attr("href");

                this.openPopup("generic", url);
                return false;
            });

            if ((count - 1) % 4 === 0) {
                page++;
                $p = $page.clone();
                $p.attr("id", "page" + page);
                $p.show();
                $lists.append($p);
            }
            $p.append($a);
        });

        $("#total-achievements").text($("#achievements").find("li").length);
    }

    initUnlockedAchievements(ids) {
        forEach(ids, (id) => {
            this.displayUnlockedAchievement(id);
        });
        $("#unlocked-achievements").text(ids.length);
    }

    setAchievementData($el, name, desc) {
        $el.find(".achievement-name").html(name);
        $el.find(".achievement-description").html(desc);
    }

    toggleCredits() {
        var currentState = $("#parchment").attr("class");

        if (this.game.started) {
            $("#parchment").removeClass().addClass("credits");

            $("body").toggleClass("credits");

            if (!this.game.player) {
                $("body").toggleClass("death");
            }
            if ($("body").hasClass("about")) {
                this.closeInGameAbout();
                $("#helpbutton").removeClass("active");
            }
        } else {
            if (currentState !== "animate") {
                if (currentState === "credits") {
                    this.animateParchment(currentState, this.previousState);
                } else {
                    this.animateParchment(currentState, "credits");
                    this.previousState = currentState;
                }
            }
        }
    }

    toggleAbout() {
        var currentState = $("#parchment").attr("class");

        if (this.game.started) {
            $("#parchment").removeClass().addClass("about");
            $("body").toggleClass("about");
            if (!this.game.player) {
                $("body").toggleClass("death");
            }
            if ($("body").hasClass("credits")) {
                this.closeInGameCredits();
            }
        } else {
            if (currentState !== "animate") {
                if (currentState === "about") {
                    if (localStorage && localStorage.data) {
                        this.animateParchment(currentState, "loadcharacter");
                    } else {
                        this.animateParchment(currentState, "createcharacter");
                    }
                } else {
                    this.animateParchment(currentState, "about");
                    this.previousState = currentState;
                }
            }
        }
    }

    closeInGameCredits() {
        $("body").removeClass("credits");
        $("#parchment").removeClass("credits");
        if (!this.game.player) {
            $("body").addClass("death");
        }
    }

    closeInGameAbout() {
        $("body").removeClass("about");
        $("#parchment").removeClass("about");
        if (!this.game.player) {
            $("body").addClass("death");
        }
        $("#helpbutton").removeClass("active");
    }

    togglePopulationInfo() {
        $("#population").toggleClass("visible");
    }

    openPopup(type, url) {
        var h = $(window).height(),
            w = $(window).width(),
            popupHeight,
            popupWidth,
            top,
            left;

        switch (type) {
            case "generic":
                popupHeight = 480;
                popupWidth = 640;
                break;
        }

        top = h / 2 - popupHeight / 2;
        left = w / 2 - popupWidth / 2;

        const newwindow = window.open(
            url,
            "name",
            `height=${popupHeight},width=${popupWidth},top=${top},left=${left}`,
        );
        if (window.focus) {
            newwindow.focus();
        }
    }

    animateParchment(origin, destination) {
        var $parchment = $("#parchment"),
            duration = 1;

        if (this.isMobile) {
            $parchment.removeClass(origin).addClass(destination);
        } else {
            if (this.isParchmentReady) {
                if (this.isTablet) {
                    duration = 0;
                }
                this.isParchmentReady = !this.isParchmentReady;

                $parchment.toggleClass("animate");
                $parchment.removeClass(origin);

                setTimeout(() => {
                    $("#parchment").toggleClass("animate");
                    $parchment.addClass(destination);
                }, duration * 1000);

                setTimeout(() => {
                    this.isParchmentReady = !this.isParchmentReady;
                }, duration * 1000);
            }
        }
    }

    animateMessages() {
        var $messages = $("#notifications div");

        $messages.addClass("top");
    }

    resetMessagesPosition() {
        var message = $("#message2").text();

        $("#notifications div").removeClass("top");
        $("#message2").text("");
        $("#message1").text(message);
    }

    showMessage(message) {
        var $wrapper = $("#notifications div"),
            $message = $("#notifications #message2");

        this.animateMessages();
        $message.text(message);
        if (this.messageTimer) {
            this.resetMessageTimer();
        }

        this.messageTimer = setTimeout(() => {
            $wrapper.addClass("top");
        }, 5000);
    }

    resetMessageTimer() {
        clearTimeout(this.messageTimer);
    }

    resizeUi() {
        if (this.game) {
            if (this.game.started) {
                this.game.resize();
                this.initHealthBar();
                this.game.updateBars();
            } else {
                this.game.renderer.rescale();
            }
        }
    }
}
