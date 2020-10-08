import { Unit } from "../units/unit.js";
import {
    getPointer,
    updateResolution,
    setResolution,
    cameraDebug,
} from "../utilities.js";
const {
    enable3d,
    Scene3D,
    ExtendedObject3D,
    ExtendedMesh,
    THREE,
    ThirdPersonControls,
    PointerLock,
    PointerDrag,
    JoyStick,
} = ENABLE3D;

const isTouchDevice = "ontouchstart" in window;

export default class StrategyScene extends Scene3D {
    constructor() {
        super({ key: "StrategyScene" });
    }

    preload() {
        this.third.load.preload('grass', '../../assets/img/grass.jpg');
        this.third.load.preload('heightmap', '../../assets/img/heightmap-simple.png');
    }

    init(data) {
        if (data.length != undefined) {
            let [width, height] = data;
            this.width = width;
            this.height = height;
        }

        this.accessThirdDimension();

        this.selectionBox = {};
        this.units = [];
        this.unitBodies = [];

        this.groundBoxes = [];
        this.groundMap = {};
        this.createdGroundMap = false;

        this.selectedUnit = undefined;
        this.hoveredUnit = undefined;

        this.currentDirection = 0; // Forward, left, down, right
        this.prevInnerWidth = 0;
        this.prevInnerHeight = 0;
    }

    async create() {
        // Get graphics settings
        updateResolution(this);

        // Create environment
        this.third.warpSpeed("light", "sky");

        // Add ground
        for (let x = 2; x < 22; x++) {
            for (let z = 2; z < 23; z++) {
                const ground = this.third.physics.add.box({
                    x: x,
                    y: -0.5,
                    z: z,
                    mass: 0,
                });
                this.groundBoxes.push(ground);
            }
        }
        // Add bridge
        for (let x = -2; x < 2; x++) {
            for (let z = 12; z < 13; z++) {
                const bridge = this.third.physics.add.box({
                    x: x,
                    y: -0.5,
                    z: z,
                    mass: 0,
                });
                this.groundBoxes.push(bridge);
            }
        }
        // Add ground 2
        for (let x = -22; x < -2; x++) {
            for (let z = 2; z < 23; z++) {
                const ground = this.third.physics.add.box({
                    x: x,
                    y: -0.5,
                    z: z,
                    mass: 0,
                });
                this.groundBoxes.push(ground);
            }
        }

        // load grass texture
        const grass = await this.third.load.texture('grass');
        grass.wrapS = THREE.RepeatWrapping;
        grass.wrapT = THREE.RepeatWrapping;
        grass.repeat.set(4, 4);

        // height map from http://danni-three.blogspot.com/2013/09/threejs-heightmaps.html
        this.third.load.texture('heightmap').then(heightmap => {
            const mesh = this.third.heightMap.add(heightmap);
            if (mesh) {
                // Convert
                mesh.geometry = this.third.transform.geometryToBufferGeometry(mesh.geometry);

                // Add custom material or a texture
                mesh.material = new THREE.MeshPhongMaterial({ map: grass });

                // Position, scale, rotate etc. the mesh before adding physics to it
                mesh.scale.set(2, 2, 2);
                mesh.position.set(20, -2, 0);

                // Add physics
                this.third.physics.add.existing(mesh, { mass: 0, collisionFlags: 1 });
                this.groundBoxes.push(mesh);
                this.mesh = mesh;
                console.log("done loading mesh")
                
            }
        });

        // Adjust the camera
        this.angleDiff = 10;
        this.maxCameraY = 15;
        this.minCameraY = 5;
        let startX = -5;
        this.third.camera.position.set(startX, this.maxCameraY, 0);
        this.third.camera.lookAt(startX + this.angleDiff, 0, 0);

        // Controls
        this.keys = await this.input.keyboard.addKeys({
            w: "w",
            a: "a",
            s: "s",
            d: "d",
            left: "left",
            right: "right",
            up: "up",
            down: "down",
        });

        this.keys.left.on("up", () => {
            this.rotateCamera("left");
        });
        this.keys.right.on("up", () => {
            this.rotateCamera("right");
        });
        this.keys.up.on("up", () => {
            this.rotateCamera("up");
        });
        this.keys.down.on("up", () => {
            this.rotateCamera("down");
        });

        // Check mouse scroll
        this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.rotateCamera("up");
            } else {
                this.rotateCamera("down");
            }
        });

        // Box without physics
        // Origin
        this.third.add.box({ x: 0, y: 0, z: 0 }, { lambert: { color: "red" } }); 
        // X
        this.third.add.box(
            { x: 2, y: 0, z: 0, width: 2, height: 0.2, depth: 0.2 }, 
            { lambert: { color: "blue" } }
        );
        // Z
        this.third.add.box(
            { x: 0, y: 0, z: 2, width: 0.2, height: 0.2, depth: 2 }, 
            { lambert: { color: "green" } }
        ); 
        // Y
        this.third.add.box(
            { x: 0, y: 2, z: 0, width: 0.2, height: 2, depth: 0.2 }, 
            { lambert: { color: "yellow" } }
        ); 

        // Add selectable units
        this.createUnit(10, 0.5, 10);
        this.createUnit(12, 0.5, 10);
        this.createUnit(14, 0.5, 10);

        // Select or move units on mouse down
        this.input.on("pointerdown", (pointer) => {
            this.updateSelectionBox();
        });

        // Show where your cursor is
        this.selectionBox = this.third.add.box(
            { x: 1, y: 0.3, z: 1, width: 1, height: 0.05 },
            { lambert: { color: 0x0000ff } }
        );
        // Directions
        let width = this.cameras.main.width;
        let text = "Move: WASD\n";
        text += "Rotate: left/right arrow keys\n";
        text += "Zoom: mouse wheel or up/down arrow keys\n";
        text += "Move block: click block then click another location\n";
        text += "Shoot: select block then click another block within range";
        this.directions = this.add.text(width / 2, 40, text, { color: "black" });
        this.directions.setOrigin(0.5, 0);
    }

    update(time) {
        this.keyboardMove();
        //this.mouseMove();
        this.updateHoverBox();

        cameraDebug(this);

        // Lerp camera to destination
        if (this.lerping) {
            let curPos = this.third.camera.position.lerp(this.lerpDest, 0.2);
            const { x, y, z } = this.lerpCenter;

            if (
                curPos.x >= this.lerpDest.x - 0.1 &&
                curPos.x <= this.lerpDest.x + 0.1 &&
                curPos.z >= this.lerpDest.z - 0.1 &&
                curPos.z <= this.lerpDest.z + 0.1 &&
                curPos.y <= this.lerpDest.y + 0.1 &&
                curPos.y >= this.lerpDest.y - 0.1
            ) {
                this.lerping = false;
                this.third.camera.position.set(
                    this.lerpDest.x,
                    this.lerpDest.y,
                    this.lerpDest.z
                );
            }

            // Keep center constant
            this.third.camera.lookAt(x, y, z);
        }

        // Check resolution change
        if (
            window.innerHeight != this.prevInnerHeight ||
            window.innerWidth != this.prevInnerWidth
        ) {
            updateResolution(this);
            this.prevInnerWidth = window.innerWidth;
            this.prevInnerHeight = window.innerHeight;
        }

        // Initialize things that are dependent on the mesh
        if (time > 2000 && !this.createdGroundMap) {
            this.generate2dGroundMap();
            this.createdGroundMap = true;
        }
    }

    moveDirection(dir) {
        if (this.lerping) {
            return;
        }

        // Get cardinal direction based on camera rotation
        let forward, right, forwardVal, rightVal;
        switch (this.currentDirection) {
            case 0: // Forwards
                forward = "x";
                right = "z";
                forwardVal = 0.1;
                rightVal = 0.1;
                break;
            case 1: // Left
                forward = "z";
                right = "x";
                forwardVal = -0.1;
                rightVal = 0.1;
                break;
            case 2: // Down
                forward = "x";
                right = "z";
                forwardVal = -0.1;
                rightVal = -0.1;
                break;
            case 3: // Right
                forward = "z";
                right = "x";
                forwardVal = 0.1;
                rightVal = -0.1;
                break;
        }

        switch (dir) {
            case "forward":
                this.third.camera.position[forward] += forwardVal;
                break;
            case "backward":
                this.third.camera.position[forward] -= forwardVal;
                break;
            case "right":
                this.third.camera.position[right] += rightVal;
                break;
            case "left":
                this.third.camera.position[right] -= rightVal;
                break;
        }
    }

    keyboardMove() {
        // Move map with wasd
        if (this.keys?.w.isDown) {
            this.moveDirection("forward");
        } else if (this.keys?.s.isDown) {
            this.moveDirection("backward");
        }

        if (this.keys?.d.isDown) {
            this.moveDirection("right");
        } else if (this.keys?.a.isDown) {
            this.moveDirection("left");
        }
    }

    rotateCamera(dir) {
        let { x, y, z } = this.third.camera.position;
        x = Math.round(x);
        y = Math.round(y);
        z = Math.round(z);
        let [rightX, rightY, rightZ] = [x, y, z];
        let [leftX, leftY, leftZ] = [x, y, z];
        let [lookX, lookY, lookZ] = [x, 0, z];

        // Find point currentrightY looking at and left/right changes
        switch (this.currentDirection) {
            case 0: // Forwards
                lookX += this.angleDiff;

                rightZ += this.angleDiff;
                rightX += this.angleDiff;

                leftZ -= this.angleDiff;
                leftX += this.angleDiff;
                break;
            case 1: // Left
                lookZ -= this.angleDiff;

                rightZ -= this.angleDiff;
                rightX += this.angleDiff;

                leftZ -= this.angleDiff;
                leftX -= this.angleDiff;
                break;
            case 2: // Down
                lookX -= this.angleDiff;

                rightZ -= this.angleDiff;
                rightX -= this.angleDiff;

                leftZ += this.angleDiff;
                leftX -= this.angleDiff;
                break;
            case 3: // Right
                lookZ += this.angleDiff;

                rightZ += this.angleDiff;
                rightX -= this.angleDiff;

                leftZ += this.angleDiff;
                leftX += this.angleDiff;
                break;
        }

        switch (dir) {
            case "right":
                this.currentDirection += 1;
                if (this.currentDirection > 3) {
                    this.currentDirection = 0;
                }

                this.lerpDest = { x: rightX, y: rightY, z: rightZ };
                this.lerping = true;
                break;
            case "left":
                this.currentDirection -= 1;
                if (this.currentDirection < 0) {
                    this.currentDirection = 3;
                }

                this.lerpDest = { x: leftX, y: leftY, z: leftZ };
                this.lerping = true;
                break;
            case "up":
                if (this.third.camera.position.y < this.maxCameraY) {
                    this.lerpDest = { x: x, y: y + 2, z: z };
                    this.lerping = true;
                }
                break;
            case "down":
                if (this.third.camera.position.y > this.minCameraY) {
                    this.lerpDest = { x: x, y: y - 2, z: z };
                    this.lerping = true;
                }
                break;
        }

        this.lerpCenter = { x: lookX, y: lookY, z: lookZ };
    }

    mouseMove() {
        if (this.lerping) {
            return;
        }

        const { x, y } = getPointer(this);
        if (x <= -0.9) {
            this.moveDirection("left");
        } else if (x >= 0.9) {
            this.moveDirection("right");
        }

        if (y <= -0.9) {
            this.moveDirection("backward");
        } else if (y >= 0.9) {
            this.moveDirection("forward");
        }
    }

    async checkGroundId(id) {
        for (let i = 0; i < this.groundBoxes.length; i++) {
            const box = this.groundBoxes[i];

            // Found
            if (box.id == id) {
                return true;
            }
            // Reached end without finding it
            else if (i == this.groundBoxes.length - 1) {
                return false;
            }
        }
    }

    generate2dGroundMap() {
        const minX = -50,
            maxX = 50,
            minZ = -50,
            maxZ = 50;

        this.groundBoxes.forEach(box => {
            if (box.body.name == "heightmap") {
                console.log("has heightmap")
            }
        })

        for (let x = minX; x < maxX; x++) {
            for (let z = minZ; z < maxZ; z++) {
                const key = String(x) + String(z);
                const isGround = this.getVerticalIntersection(this.groundBoxes, {x, y: 10, z});
                this.groundMap[key] = isGround;
            }
        }
        console.log("done gen mesh")
    }

    // Get block by coordinates
    async getGroundBlock(x, z) {
        //const output = this.testgetIntersection(this.groundBoxes, {x, y: 1, z});
        const key = String(x) + String(z);
        const output = this.groundMap[key];
        return output;
    }

    getVerticalIntersection(objects, position) {
        if (objects.length != 0) {
            // Check line of sight to objects, angle straight down (-1 y)
            const raycaster = new THREE.Raycaster();
            raycaster.set(position, {x: 0, y: -1, z: 0});
            const intersection = raycaster.intersectObjects(objects);

            if (intersection.length != 0) {
                return true;
            } else {
                return false
            }
        } else {
            return false;
        }
    }

    getPointerIntersection(objects, source = getPointer(this)) {
        if (objects.length != 0) {
            // Check line of sight to object
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(source, this.third.camera);
            const intersection = raycaster.intersectObjects(objects);

            if (intersection.length != 0) {
                let output = {
                    x: Math.round(intersection[0].point.x),
                    y: Math.round(intersection[0].point.y),
                    z: Math.round(intersection[0].point.z),
                };
                return [output, intersection[0].object];
            } else {
                return [false, false];
            }
        } else {
            return [false, false];
        }
    }

    async updateSelectionBox() {
        const [point, object] = this.getPointerIntersection([...this.unitBodies, ...this.groundBoxes]);
        if (point) {
            console.log(point);
            const isGround = await this.checkGroundId(object.id);
            // Selected ground, move unit there
            if (isGround && this.selectedUnit != undefined) {
                this.moveUnit(this.selectedUnit.id, point.x, point.z)
            }
            // Select units
            else if (!isGround) {
                this.selectUnit(object.id);
            }
        }
    }

    async updateHoverBox() {
        const [point, object] = this.getPointerIntersection([...this.unitBodies, ...this.groundBoxes]);
        if (point && this.selectionBox.position != undefined) {
            const isGround = await this.checkGroundId(object.id);

            // Hovering ground
            if (isGround) {
                this.selectionBox.position.set(point.x, 0.1, point.z);
                this.selectionBox.visible = true;

                // Remove highlight on current hover
                if (this.hoveredUnit != undefined) {
                    this.hoveredUnit.hover(false);
                }
                this.hoveredUnit = undefined;
            }
            // Hover unit
            else {
                this.hoverUnit(object.id);
                this.selectionBox.visible = false;
            }
        }
        // Hovering nothing
        else {
            this.selectionBox.visible = false;

            // Remove highlight on current hover
            if (this.hoveredUnit != undefined) {
                this.hoveredUnit.hover(false);
            }
            this.hoveredUnit = undefined;
        }
    }

    createUnit(x, y, z) {
        const unit = new Unit(this, {x, y, z});

        // Store unit class as dictionary and unit body as array
        this.units[unit.body.id] = unit;
        this.unitBodies.push(unit.body);
    }

    hoverUnit(id) {
        if (this.hoveredUnit != undefined) {
            this.hoveredUnit.hover(false);
        }
        
        const newHoveredUnit = this.units[id];
        if (newHoveredUnit != undefined) {
            newHoveredUnit.hover();
        }
        this.hoveredUnit = newHoveredUnit;
    }

    async selectUnit(id) {
        const newSelectedUnit = this.units[id];
        if (newSelectedUnit == undefined) {
            console.log("Invalid unit selected");
            return;
        }

        // A unit is currently selected
        if (this.selectedUnit != undefined) {
            // Same unit selected twice, de-select
            if (this.selectedUnit.id == id) {
                this.selectedUnit.select(false);
                this.selectedUnit = undefined;
            }
            else {
                this.shoot(this.selectedUnit, newSelectedUnit);
            }
        }
        // No unit is selected, selected new unit
        else {
            newSelectedUnit.select();
            this.selectedUnit = newSelectedUnit;
        }
    }

    moveUnit(id, x, z) {
        if (this.units[id] != undefined) {
            this.units[id].move(x, z);
        }
        this.selectedUnit = undefined;
    }

    async shoot(srcUnit, destUnit) {
        const destPos = destUnit.body.position;
        const canShoot = await srcUnit.canShoot(destPos.x, destPos.z);
        if (canShoot) {
            srcUnit.shoot(destPos.x, destPos.z);
        }
        else {
            console.log("Out of range");
        }
    }
}
