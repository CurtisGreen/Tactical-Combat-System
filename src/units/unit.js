const {
    ExtendedObject3D,
    THREE,
} = ENABLE3D;

export class Unit {
    constructor(scene, position) {
        this.scene = scene;
        this.body = scene.third.add.box(
            position,
            {lambert: {color: "gray"}}
        );

        this.range = 5;
        this.rangeBoxes = [];

        this.createRangeMap();
    }

    async move(x, z) {
        this.select(false);

        // Get all possible paths
        this.curPaths = [];
        await this.findPaths(this.position.x, this.position.z, x, z);

        // Choose shortest one
        if (this.curPaths.length > 0) {
            let minPath = this.curPaths[0];
            this.curPaths.forEach((pathArr, index) => {
                if (pathArr.length < minPath.length) {
                    minPath = pathArr;
                }
                if (index == this.curPaths.length - 1) {
                    //console.log("Shortest path", minPath);
                    this.moveAlongPath(minPath);
                }
            });
        }
        else {
            console.log("there are no cur paths")
        }
    }

    moveAlongPath(pathArr, index = 0) {
        let temp = this.body.position.clone();
        this.scene.tweens.add({
            targets: temp,
            x: pathArr[index][0],
            z: pathArr[index][1],
            duration: 300,
            ease: (t) => {
                return t;
            },
            onComplete: () => {
                //this.updateRangeMap();
                if (pathArr.length > index + 1) {
                    this.moveAlongPath(pathArr, index + 1);
                }
                else {
                    this.updateRangeMap()
                }
            },
            onUpdate: () => {
                this.body.position.set(temp.x, temp.y, temp.z);
            },
            delay: 50,
        });
    }

    async findPaths(srcX, srcZ, destX, destZ, pathArr = []) {
        // Get current block
        //const srcBlock = await this.scene.getGroundBlock(srcX, srcZ);

        // Deep copy path
        let updatedArray = Array.from(pathArr); 
        updatedArray.push([srcX, srcZ]);

        // Found destination
        if (srcX == destX && srcZ == destZ) {
            this.curPaths.push(updatedArray);
            return;
        }
        // Out of range
        else if (updatedArray.length > this.range) {
            return;
        }
        
        // Check up/down/left/right
        const rightBlock = await this.scene.getGroundBlock(srcX, srcZ + 1);
        if (rightBlock) {
            await this.findPaths(srcX, srcZ + 1, destX, destZ, updatedArray);
        }
        const leftBlock = await this.scene.getGroundBlock(srcX, srcZ - 1);
        if (leftBlock) {
            await this.findPaths(srcX, srcZ - 1, destX, destZ, updatedArray);
        }
        const botBlock = await this.scene.getGroundBlock(srcX - 1, srcZ);
        if (botBlock) {
            await this.findPaths(srcX - 1, srcZ, destX, destZ, updatedArray);
        }
        const topBlock = await this.scene.getGroundBlock(srcX + 1, srcZ);
        if (topBlock) {
            await this.findPaths(srcX + 1, srcZ, destX, destZ, updatedArray);
        }
    }

    async createRangeMap(srcX = this.position.x, srcZ = this.position.z, pathArr = []) {
        // Out of range
        if (pathArr.length > this.range) {
            return;
        }

        // Create new range block if it doesn't already exist
        const blockExists = await this.rangeBlockExists(srcX, srcZ);
        if (!blockExists) {
            let rangeBox = this.scene.third.add.box(
                { 
                    x: srcX, y: 0, z: srcZ, 
                    depth: 1, width: 1, height: 0.05 },
                { lambert: { color: "yellow" } }
            );
            rangeBox.visible = false;
            this.rangeBoxes.push(rangeBox);
        }

        // Deep copy path
        let updatedArray = Array.from(pathArr); 
        updatedArray.push([srcX, srcZ]);
        
        // Check up/down/left/right
        const rightBlock = await this.scene.getGroundBlock(srcX, srcZ + 1);
        if (rightBlock) {
            await this.createRangeMap(srcX, srcZ + 1, updatedArray);
        }
        const leftBlock = await this.scene.getGroundBlock(srcX, srcZ - 1);
        if (leftBlock) {
            await this.createRangeMap(srcX, srcZ - 1, updatedArray);
        }
        const botBlock = await this.scene.getGroundBlock(srcX - 1, srcZ);
        if (botBlock) {
            await this.createRangeMap(srcX - 1, srcZ, updatedArray);
        }
        const topBlock = await this.scene.getGroundBlock(srcX + 1, srcZ);
        if (topBlock) {
            await this.createRangeMap(srcX + 1, srcZ, updatedArray);
        }
    }

    get id() {
        return this.body.id;
    }

    get position() {
        return this.body.position;
    }

    setColor(color) {
        this.body.material.color.set(color);
    }

    hover(hover = true) {
        if (this.isSelected) {
            return;
        }
        if (hover) {
            this.body.material.color.set(0x0000ff);
        }
        else {
            this.body.material.color.set("gray");
        }
    }

    select(select = true) {
        this.isSelected = select;
        this.showRange(select);

        if (select) {
            this.body.material.color.set("red");
            this.scene.currentUnit = this;
        }
        else {
            this.body.material.color.set("gray");
        }
    }

    shoot(destX, destZ) {
        const srcPos = this.body.position;

        let projectile = this.scene.third.add.box(
            { 
                x: srcPos.x, y: srcPos.y, z: srcPos.z,
                width: .1, height: .1, depth: .5
            }, 
            { lambert: { color: "green" } 
        });

        // Rotate in direction of target
        const xDiff = destX - srcPos.x;
        const zDiff = destZ - srcPos.z;
        if (zDiff == 0) {
            projectile.rotateY(Math.PI / 2);
        }
        else {
            projectile.rotateY(Math.atan(xDiff / zDiff));
        }

        let temp = projectile.position.clone();
        this.scene.tweens.add({
            targets: temp,
            x: destX,
            z: destZ,
            duration: 1000,
            ease: (t) => {
                return t;
            },
            onComplete: () => {
                projectile.visible = false;
                //this.third.destroy(projectile);
            },
            onUpdate: () => {
                projectile.position.set(temp.x, temp.y, temp.z);
            },
            delay: 50,
        });
    }

    async updateRangeMap() {
        this.showRange(false);
        this.rangeBoxes = [];
        await this.createRangeMap();
    }

    // Get block by coordinates
    async rangeBlockExists(x, z) {
        for (let i = 0; i < this.rangeBoxes.length; i++) {
            const box = this.rangeBoxes[i];

            // Found
            if (box.position.x == x && box.position.z == z) {
                return true;
            }
            // Reached end without finding it
            else if (i == this.rangeBoxes.length - 1) {
                return false;
            }
        }
        return false;
    }

    showRange(show = true) {
        this.rangeBoxes.forEach(box => {
            box.visible = show;
        });
    }

    async canShoot(destX, destZ) {
        return await this.rangeBlockExists(destX, destZ);
    }
}