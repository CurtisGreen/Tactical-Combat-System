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
            onComplete: () => {},
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
}