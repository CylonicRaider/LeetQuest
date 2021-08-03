import { audioMp3 as supportsMp3 } from "modernizr-esm/feature/audio";

export default {
    supportsWebSocket() {
        return window.WebSocket || window.MozWebSocket;
    },

    userAgentContains(string) {
        return navigator.userAgent.indexOf(string) != -1;
    },

    isTablet(screenWidth) {
        if (screenWidth > 640) {
            if (
                (this.userAgentContains("Android") &&
                    this.userAgentContains("Firefox")) ||
                this.userAgentContains("Mobile")
            ) {
                return true;
            }
        }
        return false;
    },

    isWindows() {
        return this.userAgentContains("Windows");
    },

    isChromeOnWindows() {
        return (
            this.userAgentContains("Chrome") &&
            this.userAgentContains("Windows")
        );
    },

    canPlayMP3() {
        return supportsMp3;
    },

    isSafari() {
        return (
            this.userAgentContains("Safari") &&
            !this.userAgentContains("Chrome")
        );
    },

    isOpera() {
        return this.userAgentContains("Opera");
    },

    isFirefoxAndroid() {
        return (
            this.userAgentContains("Android") &&
            this.userAgentContains("Firefox")
        );
    },
};
