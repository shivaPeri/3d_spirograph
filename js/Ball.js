
class Ball {
    constructor(r, d_alpha, d_beta) {
        this.pos = new THREE.Vector3(r,0,0);
        this.r = r;
        this.alpha = 0;
        this.beta = 0;
        this.d_alpha = d_alpha;
        this.d_beta = d_beta;
    }
    rotate() {
        this.alpha += this.d_alpha;
        this.beta += this.d_beta;
        this.pos.x = this.r * Math.sin(this.beta) * Math.cos(this.alpha);
        this.pos.y = this.r * Math.sin(this.beta) * Math.sin(this.alpha);
        this.pos.z = this.r * Math.cos(this.beta);
    }
}

class Assembly {
    constructor() {
        this.main = new Ball(4, 0.1, 0.1);
        this.balls = [this.main];
        this.selected = 0; // index
        this.speed = 1;
        this.size = 1;
    }
    update() {
        for (var i = 0; i < this.balls.length; i++) {
            this.balls[i].rotate();
        }
    }
    add() {this.balls.push(new Ball (1, 0.1, 0.1)); this.size++;}
    rem() {if (this.size != 1) {this.balls.pop(); this.size--;}}
}
