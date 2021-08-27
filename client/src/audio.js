import find from "lodash-es/find.js";
import forEach from "lodash-es/forEach.js";
import size from "lodash-es/size.js";
import times from "lodash-es/times.js";

import Area from "./area.js";
import Detect from "./detect.js";
import log from "./lib/log.js";

export default class AudioManager {
    constructor(game) {
        this.enabled = true;
        this.extension = Detect.canPlayMP3() ? "mp3" : "ogg";
        this.sounds = {};
        this.game = game;
        this.currentMusic = null;
        this.areas = [];
        this.musicNames = [
            "village",
            "beach",
            "forest",
            "cave",
            "desert",
            "lavaland",
            "boss",
        ];
        this.soundNames = [
            "loot",
            "hit1",
            "hit2",
            "hurt",
            "heal",
            "chat",
            "revive",
            "death",
            "firefox",
            "achievement",
            "kill1",
            "kill2",
            "noloot",
            "teleport",
            "chest",
            "npc",
            "npc-end",
        ];

        var loadSoundFiles = () => {
            var counter = size(this.soundNames);
            log.info("Loading sound files...");
            forEach(this.soundNames, (name) => {
                this.loadSound(name, () => {
                    counter -= 1;
                    if (counter === 0) {
                        if (!Detect.isSafari()) {
                            // Disable music on Safari - See bug 738008
                            loadMusicFiles();
                        }
                    }
                });
            });
        };

        var loadMusicFiles = () => {
            if (!this.game.renderer.mobile) {
                // disable music on mobile devices
                log.info("Loading music files...");
                // Load the village music first, as players always start here
                this.loadMusic(this.musicNames.shift(), () => {
                    // Then, load all the other music files
                    forEach(this.musicNames, (name) => {
                        this.loadMusic(name);
                    });
                });
            }
        };

        if (!(Detect.isSafari() && Detect.isWindows())) {
            loadSoundFiles();
        } else {
            this.enabled = false; // Disable audio on Safari Windows
        }
    }

    toggle() {
        if (this.enabled) {
            this.enabled = false;

            if (this.currentMusic) {
                this.resetMusic(this.currentMusic);
            }
        } else {
            this.enabled = true;

            if (this.currentMusic) {
                this.currentMusic = null;
            }
            this.updateMusic();
        }
    }

    load(basePath, name, loaded_callback, channels) {
        var path = `${basePath}${name}.${this.extension}`,
            sound = document.createElement("audio");

        let callback;
        callback = ({ currentTarget }) => {
            currentTarget.removeEventListener(
                "canplaythrough",
                callback,
                false,
            );
            log.debug(`${path} is ready to play.`);
            if (loaded_callback) {
                loaded_callback();
            }
        };
        sound.addEventListener("canplaythrough", callback, false);
        sound.addEventListener(
            "error",
            (_event) => {
                log.error(`Error: ${path} could not be loaded.`);
                this.sounds[name] = null;
            },
            false,
        );

        sound.preload = "auto";
        sound.autobuffer = true;
        sound.src = path;
        sound.load();

        this.sounds[name] = [sound];
        times(channels - 1, () => {
            this.sounds[name].push(sound.cloneNode(true));
        });
    }

    loadSound(name, handleLoaded) {
        this.load("audio/sounds/", name, handleLoaded, 4);
    }

    loadMusic(name, handleLoaded) {
        this.load("audio/music/", name, handleLoaded, 1);
        var music = this.sounds[name][0];
        music.loop = true;
        music.addEventListener(
            "ended",
            () => {
                music.play();
            },
            false,
        );
    }

    getSound(name) {
        if (!this.sounds[name]) {
            return null;
        }
        var sound = find(
            this.sounds[name],
            (sound) => sound.ended || sound.paused,
        );
        if (sound && sound.ended) {
            sound.currentTime = 0;
        } else {
            sound = this.sounds[name][0];
        }
        return sound;
    }

    playSound(name) {
        var sound = this.enabled && this.getSound(name);
        if (sound) {
            sound.play();
        }
    }

    addArea(x, y, width, height, musicName) {
        var area = new Area(x, y, width, height);
        area.musicName = musicName;
        this.areas.push(area);
    }

    getSurroundingMusic(entity) {
        var music = null,
            area = find(this.areas, (area) => area.contains(entity));

        if (area) {
            music = {
                sound: this.getSound(area.musicName),
                name: area.musicName,
            };
        }
        return music;
    }

    updateMusic() {
        if (this.enabled) {
            var music = this.getSurroundingMusic(this.game.player);

            if (music) {
                if (!this.isCurrentMusic(music)) {
                    if (this.currentMusic) {
                        this.fadeOutCurrentMusic();
                    }
                    this.playMusic(music);
                }
            } else {
                this.fadeOutCurrentMusic();
            }
        }
    }

    isCurrentMusic(music) {
        return this.currentMusic && music.name === this.currentMusic.name;
    }

    playMusic(music) {
        if (this.enabled && music && music.sound) {
            if (music.sound.fadingOut) {
                this.fadeInMusic(music);
            } else {
                music.sound.volume = 1;
                music.sound.play();
            }
            this.currentMusic = music;
        }
    }

    resetMusic(music) {
        if (music && music.sound && music.sound.readyState > 0) {
            music.sound.pause();
            music.sound.currentTime = 0;
        }
    }

    fadeOutMusic(music, ended_callback) {
        if (music && !music.sound.fadingOut) {
            this.clearFadeIn(music);
            music.sound.fadingOut = setInterval(() => {
                var step = 0.02;
                const volume = music.sound.volume - step;

                if (this.enabled && volume >= step) {
                    music.sound.volume = volume;
                } else {
                    music.sound.volume = 0;
                    this.clearFadeOut(music);
                    ended_callback(music);
                }
            }, 50);
        }
    }

    fadeInMusic(music) {
        if (music && !music.sound.fadingIn) {
            this.clearFadeOut(music);
            music.sound.fadingIn = setInterval(() => {
                var step = 0.01;
                const volume = music.sound.volume + step;

                if (this.enabled && volume < 1 - step) {
                    music.sound.volume = volume;
                } else {
                    music.sound.volume = 1;
                    this.clearFadeIn(music);
                }
            }, 30);
        }
    }

    clearFadeOut(music) {
        if (music.sound.fadingOut) {
            clearInterval(music.sound.fadingOut);
            music.sound.fadingOut = null;
        }
    }

    clearFadeIn(music) {
        if (music.sound.fadingIn) {
            clearInterval(music.sound.fadingIn);
            music.sound.fadingIn = null;
        }
    }

    fadeOutCurrentMusic() {
        if (this.currentMusic) {
            this.fadeOutMusic(this.currentMusic, (music) => {
                this.resetMusic(music);
            });
            this.currentMusic = null;
        }
    }
}
