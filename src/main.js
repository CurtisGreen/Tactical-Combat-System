const { enable3d, Canvas } = ENABLE3D;
import PreloadScene from "./scenes/preloadScene.js";
import StrategyScene from "./scenes/strategyScene.js";

const config = {
    type: Phaser.WEBGL,
    backgroundColor: "#ffffff",
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth * Math.max(1, window.devicePixelRatio / 2) - 10,
        height: window.innerHeight * Math.max(1, window.devicePixelRatio / 2) - 10,
    },
    parent: "game",
    scene: [PreloadScene, StrategyScene],
    ...Canvas(),
};

window.addEventListener("load", () => {
    enable3d(() => new Phaser.Game(config)).withPhysics("lib");
});
