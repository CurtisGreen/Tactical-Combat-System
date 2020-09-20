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

    move(x, z) {
        this.select(false);
        let temp = this.body.position.clone();
        this.scene.tweens.add({
            targets: temp,
            x: x,
            z: z,
            duration: 1000,
            ease: (t) => {
                return t;
            },
            onComplete: () => {
                this.updateRangeMap();
            },
            onUpdate: () => {
                this.body.position.set(temp.x, temp.y, temp.z);
            },
            delay: 50,
        });
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