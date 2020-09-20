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
        this.showRange(false);
    }

    async move(x, z) {
        this.select(false);
        // let temp = this.body.position.clone();
        // this.scene.tweens.add({
        //     targets: temp,
        //     x: x,
        //     z: z,
        //     duration: 1000,
        //     ease: (t) => {
        //         return t;
        //     },
        //     onComplete: () => {
        //         this.updateRangeMap();
        //     },
        //     onUpdate: () => {
        //         this.body.position.set(temp.x, temp.y, temp.z);
        //     },
        //     delay: 50,
        // });

        await this.findPath(this.position.x, this.position.z, x, z);

        // Clear traverse flags afterwards
        this.scene.groundBoxes.forEach(box => {
            box.traversed = false;
        })
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

    async findPath(srcX, srcZ, destX, destZ, pathArr = []) {
        // Found destination
        if (srcX == destX && srcZ == destZ) {
            pathArr.push([srcX, srcZ]);
            console.log("got to end", pathArr);
            this.moveAlongPath(pathArr);
            return true;
        }
        // Out of range
        else if (pathArr.length > this.range) {
            return false;
        }

        // Get current block
        const srcBlock = await this.scene.getGroundBlock(srcX, srcZ);
        srcBlock.traversed = true;
        let updatedArray = Array.from(pathArr); // Deep copy
        updatedArray.push([srcX, srcZ]);
        
        // Check up/down/left/right
        const topBlock = await this.scene.getGroundBlock(srcX, srcZ + 1);
        if (topBlock && topBlock.traversed != true) {
            const result = await this.findPath(srcX, srcZ + 1, destX, destZ, updatedArray);
            if (result) {
                return true;
            }
        }
        const botBlock = await this.scene.getGroundBlock(srcX, srcZ - 1);
        if (botBlock && botBlock.traversed != true) {
            const result = await this.findPath(srcX, srcZ - 1, destX, destZ, updatedArray);
            if (result) {
                return true;
            }
        }
        const leftBlock = await this.scene.getGroundBlock(srcX - 1, srcZ);
        if (leftBlock && leftBlock.traversed != true) {
            const result = await this.findPath(srcX - 1, srcZ, destX, destZ, updatedArray);
            if (result) {
                return true;
            }
        }
        const rightBlock = await this.scene.getGroundBlock(srcX + 1, srcZ);
        if (rightBlock && rightBlock.traversed != true) {
            const result = await this.findPath(srcX + 1, srcZ, destX, destZ, updatedArray);
            if (result) {
                return true;
            }
        }
        return false;
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

    createRangeMap() {
        this.rangeBoxes = [];
        const curPos = this.body.position;

        for (let col = -1 * this.range; col <= this.range; col++) {
            const startRow = this.range - Math.abs(col);
            const endRow = startRow * -1;

            for (let row = startRow; row >= endRow; row--) {
                let rangeBox = this.scene.third.add.box(
                    { 
                        x: col + curPos.x, y: 0, z: row + curPos.z, 
                        depth: 1, width: 1, height: 0.05 },
                    { lambert: { color: "yellow" } }
                );
                this.rangeBoxes.push(rangeBox);
            }
        }
    }

    updateRangeMap() {
        const curPos = this.body.position;

        // Get offset from center
        const centerIndex = Math.floor(this.rangeBoxes.length / 2);
        let centerBox = this.rangeBoxes[centerIndex];
        if (centerBox != undefined) {
            const xDiff = curPos.x - centerBox.position.x;
            const zDiff = curPos.z - centerBox.position.z;

            this.rangeBoxes.forEach(box => {
                box.position.x += xDiff;
                box.position.z += zDiff;
            });
        }
    }

    showRange(show = true) {
        this.rangeBoxes.forEach(box => {
            box.visible = show;
        });
    }

    async canShoot(destX, destZ) {
        // Compare to range map
        for (let i = 0; i < this.rangeBoxes.length; i++) {
            const box = this.rangeBoxes[i];

            // Found
            if (box.position.x == destX && box.position.z == destZ) {
                return true;
            }
            // Reached end without finding it
            else if (i == this.rangeBoxes.length - 1) {
                return false;
            }
        }
    }
}