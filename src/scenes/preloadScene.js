import { Button } from "../ui/button.js";

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: "PreloadScene" });
    }

    preload() {}

    create() {
        this.cameras.main.setBackgroundColor(0xbababa);

        // Graphics settings
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const buttonWidth = 330;
        const buttonHeight = 50;
        let x = width / 2 - buttonWidth / 2;
        let y = height / 2 - buttonHeight * 2;

        this.add
            .text(x + buttonWidth / 2, y - buttonHeight, "Resolution")
            .setOrigin(0.5, 0.5);

        // Reduce height by browser bar
        let browserBarHeight = this.getBrowserBarHeight();

        // Default to high res
        let [fullWidth, fullHeight] = this.getResolution(1);
        this.scene.start("StrategyScene", [fullWidth, fullHeight - browserBarHeight]);
    }

    // Full: 1, Med: .75, Low: .5
    getResolution(resRatio) {
        const DPR = window.devicePixelRatio * resRatio;
        const { width, height } = window.screen;
        const WIDTH = Math.round(Math.max(width, height) * DPR);
        let HEIGHT = Math.round(Math.min(width, height) * DPR);

        return [WIDTH, HEIGHT];
    }

    getBrowserBarHeight() {
        const availableHeight =
            window.innerHeight * Math.max(1, window.devicePixelRatio / 2);
        const maxHeight = window.screen.height * Math.max(1, window.devicePixelRatio / 2);
        return maxHeight - availableHeight;
    }
}
