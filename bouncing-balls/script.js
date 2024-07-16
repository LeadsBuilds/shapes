const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ballRadius = 15;
const gapWidth = 30;
const speed = 5;
const circleRadius = 200;
const balls = [];
let angle = 0;
let maxSpawnedBalls = 50;
let winShown = false;
let loseShown = false;
let lastSingleBallTime = null; // Track the time when only one ball is remaining
let countdownInterval = null;
let countdownElement = document.createElement('div');

const beepSound = new Audio('audio/beep.mp3');
const deathSound = new Audio('audio/death.mp3');
const winSound = new Audio('audio/win.mp3');
const musicSound = new Audio('audio/music.mp3');
const loseSound = new Audio('audio/lose.mp3');

let sawRotationAngle = 0; // Variable to store the current rotation angle of the saw

const sawGif = new Image();
sawGif.src = 'assets/saw.gif'; // Adjust the path as needed

beepSound.preload = 'auto'; // Preload the sound
deathSound.preload = 'auto';
winSound.preload = 'auto';
musicSound.preload = 'auto';
loseSound.preload = 'auto';
beepSound.load();
deathSound.load();
winSound.load();
loseSound.load();
musicSound.load();

setTimeout(() => {
	musicSound.pause();
	musicSound.currentTime = 0;
	musicSound.volume = 0.5;
	musicSound.loop = true;
	musicSound.play();
}, 500);

function randomColor() {
    return `hsl(${Math.random() * 360}, 100%, 50%)`;
}

function changeWallColor() {
    ctx.strokeStyle = randomColor();
}

class Ball {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = randomColor();
        this.opacity = 0; // Start with zero opacity
        this.fadeInDuration = 1000; // Fade in over 1 second
        this.fadeInStartTime = Date.now(); // Track start time of fade in
        this.isFading = false;
        this.fadeStartTime = null;
        this.fadeDuration = 1000; // Fade out over 1 second
        this.isFading = false;
    }

    draw() {
        ctx.save(); // Save the current state
        ctx.globalAlpha = this.opacity; // Set the alpha value
        ctx.beginPath();
        ctx.arc(this.x, this.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.restore(); // Restore the previous state
        ctx.shadowColor = this.color;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 3;
    }

    update() {
        if (!this.isFading && this.opacity < 1) {
            const elapsedTime = Date.now() - this.fadeInStartTime;
            this.opacity = Math.min(1, elapsedTime / this.fadeInDuration);
        }

        if (this.isFading) {
            const elapsedTime = Date.now() - this.fadeStartTime;
            this.opacity = Math.max(0, 1 - elapsedTime / this.fadeDuration);

            if (this.opacity === 0) {
                this.removeFromBalls();
                return;
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;

            // Check collision with circle wall
            const distanceFromCenter = Math.sqrt((this.x - circleCenterX) ** 2 + (this.y - circleCenterY) ** 2);
            if (distanceFromCenter + ballRadius > circleRadius) {
                if (this.isInGap()) {
                    // Ball goes through the gap
                    this.vx = 0;
                    this.vy = 0;
                    this.startFading();
                    deathSound.pause();
                    deathSound.currentTime = 0;
                    deathSound.play();
                } else {
                    // Reflect the velocity vector
                    const normalX = circleCenterX - this.x;
                    const normalY = circleCenterY - this.y;
                    const length = Math.sqrt(normalX ** 2 + normalY ** 2);
                    const unitNormalX = normalX / length;
                    const unitNormalY = normalY / length;

                    const dotProduct = this.vx * unitNormalX + this.vy * unitNormalY;
                    this.vx -= 2 * dotProduct * unitNormalX;
                    this.vy -= 2 * dotProduct * unitNormalY;

                    // Play beep sound
                    beepSound.pause();
                    beepSound.currentTime = 0;
                    beepSound.play();
                }
            }

            // Check collision with other balls
            for (const other of balls) {
                if (this !== other && !this.isFading && Date.now() - this.spawnTime > 1000) {
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distance = Math.sqrt(dx ** 2 + dy ** 2);
                    if (distance < 2 * ballRadius) {
                        this.handleCollision(other);
                        // Change wall color randomly
                        changeWallColor();
                        // Play beep sound
                        beepSound.pause();
                        beepSound.currentTime = 0;
                        beepSound.play();
                    }
                }
            }
			
			// Check collision with saw
            const gapStartAngle = angle - gapWidth / 2;
            const gapEndAngle = angle + gapWidth / 2;
            const sawTipX = circleCenterX + circleRadius * Math.cos(gapStartAngle * Math.PI / 180);
            const sawTipY = circleCenterY + circleRadius * Math.sin(gapStartAngle * Math.PI / 180);
            const distanceToSaw = Math.sqrt((this.x - sawTipX) ** 2 + (this.y - sawTipY) ** 2);
            if (distanceToSaw <= ballRadius) {
                this.vx = 0;
				this.vy = 0;
				this.startFading();
				deathSound.pause();
				deathSound.currentTime = 0;
				deathSound.play();
            }
        }

        // Check if out of canvas bounds
        if (this.x + ballRadius < 0 || this.x - ballRadius > canvas.width || this.y + ballRadius < 0 || this.y - ballRadius > canvas.height) {
            this.removeFromBalls();
        }
    }

    startFading() {
        this.isFading = true;
        this.fadeStartTime = Date.now();
    }

    removeFromBalls() {
        const index = balls.indexOf(this);
        if (index !== -1) {
            balls.splice(index, 1);
        }
    }

    handleCollision(other) {
        // Elastic collision physics
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        const nx = dx / distance; // Normal vector components
        const ny = dy / distance;

        // Relative velocity components
        const dVector = { x: other.vx - this.vx, y: other.vy - this.vy };
        const dvx = dVector.x;
        const dvy = dVector.y;

        // Dot product of relative velocity and normal vector
        const dotProduct = dvx * nx + dvy * ny;

        // Calculate impulse scalar
        const impulse = (2 * dotProduct) / (1 + 1);

        // Apply impulse to velocities
        this.vx += impulse * nx;
        this.vy += impulse * ny;
        other.vx -= impulse * nx;
        other.vy -= impulse * ny;

        // Separate the balls to avoid sticking
        const overlap = 2 * ballRadius - distance;
        const separationFactor = 0.5; // Adjust this factor to control separation amount
        this.x -= overlap * separationFactor * nx;
        this.y -= overlap * separationFactor * ny;
        other.x += overlap * separationFactor * nx;
        other.y += overlap * separationFactor * ny;
    }

    isInGap() {
        const gapStartAngle = angle - gapWidth / 2;
        const gapEndAngle = angle + gapWidth / 2;
        const ballAngle = Math.atan2(this.y - circleCenterY, this.x - circleCenterX) * (180 / Math.PI);
        return ballAngle > gapStartAngle && ballAngle < gapEndAngle;
    }
}

const circleCenterX = canvas.width / 2;
const circleCenterY = canvas.height / 2;

function drawCircle() {
    ctx.beginPath();
    ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = setTimeout(() => this.randomColor(), 2000);
    ctx.fillStyle = setTimeout(() => this.randomColor(), 2000);
    ctx.stroke();
    ctx.closePath();
}

function drawGap() {
    const gapStartAngle = angle - gapWidth / 2;
    const gapEndAngle = angle + gapWidth / 2;

    ctx.beginPath();
    ctx.arc(circleCenterX, circleCenterY, circleRadius, gapStartAngle * Math.PI / 180, gapEndAngle * Math.PI / 180);
    ctx.strokeStyle = setTimeout(() => this.randomColor(), 2000);
    ctx.fillStyle = setTimeout(() => this.randomColor(), 2000);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
	
	// Draw saw.gif at the tip of the gap line
    const sawWidth = 220; // Adjust size of saw.gif as needed
    const sawHeight = 220;
    const sawTipX = circleCenterX + circleRadius * Math.cos(gapEndAngle * Math.PI / 180);
    const sawTipY = circleCenterY + circleRadius * Math.sin(gapEndAngle * Math.PI / 180);
    
    ctx.save(); // Save current drawing state
    ctx.translate(sawTipX, sawTipY); // Move origin to saw tip
    ctx.rotate(sawRotationAngle); // Rotate around the origin
    ctx.drawImage(sawGif, -sawWidth / 2, -sawHeight / 2, sawWidth, sawHeight); // Draw image
    ctx.restore(); // Restore original drawing state
}

function fadeOutCanvas() {
    const fadeOutInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha -= 0.01;
        if (ctx.globalAlpha <= 0) {
            clearInterval(fadeOutInterval);
        }
    }, 10);
}

function startCountdown() {
    let countdownNumber = 6;
    if (balls.length === 1 && !winShown) {
        countdownInterval = setInterval(() => {
            countdownNumber--;
            countdownElement.textContent = countdownNumber;

            if (countdownNumber <= 0) {
                clearInterval(countdownInterval);
                countdownElement.textContent = "";
            }
        }, 1000);
    }
        
}

function appendCountdownElement() {
        countdownElement.style.position = 'absolute';
        countdownElement.style.fontSize= '60px';
        countdownElement.style.fontFamily = 'Arial';
        countdownElement.style.color='#FFF';
        countdownElement.style.fontSmooth = 'always';
        countdownElement.textContent = "";
        countdownElement.style.zIndex='999999';
        countdownElement.style.top = `${circleCenterY - 42}px`;
        countdownElement.style.left = `${circleCenterX - 24}px`;
        document.body.appendChild(countdownElement);
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCircle();
    drawGap();

    if (!countdownInterval) {
        this.startCountdown();
    }

    // Check if there is only one ball and start the timer
    if (balls.length === 1) {
        if (!lastSingleBallTime) {
            lastSingleBallTime = Date.now();
        } else {
            const elapsedTime = Date.now() - lastSingleBallTime;
            
            if (elapsedTime >= 6000 && !winShown) {
                winShown = true;
                winSound.play();
                const winnerMsg = document.createElement('div');
				const resizedWinnerBall = document.createElement('div');
     
                    winnerMsg.textContent = 'Winner!';
                    winnerMsg.style.position = 'absolute';
					winnerMsg.style.fontSize= '50px';
					winnerMsg.style.fontFamily = 'Arial';
					winnerMsg.style.color='#FFF';
					winnerMsg.style.textShadow='2px 2px 0px #222';
					winnerMsg.style.zIndex='999999';
                    winnerMsg.style.fontSmooth = 'always';
                    winnerMsg.style.top = `${circleCenterY - 45}px`;
                    winnerMsg.style.left = `${circleCenterX - 100}px`;
					
					resizedWinnerBall.style.backgroundColor = balls[0].color;
					resizedWinnerBall.className = 'ball';
					
					document.body.appendChild(resizedWinnerBall);
					document.body.appendChild(winnerMsg);
					musicSound.pause();
					this.fadeOutCanvas();

                function showRestartButton() {
                    const restartButton = document.createElement('button');
                    restartButton.textContent = 'Restart';
                    restartButton.style.position = 'absolute';
                    restartButton.style.top = `${circleCenterY - 50}px`;
                    restartButton.style.left = `${circleCenterX - 50}px`;
                    restartButton.addEventListener('click', () => {
                        location.reload();
                    });
                    document.body.appendChild(restartButton);
                }
            }
        }
    } else {
        lastSingleBallTime = null; // Reset timer if there's more than one ball
    }

    if (balls.length === 0 && !winShown) {
        loseShown = true;
        balls.length = 1;
    }

    if (loseShown) {
        const loseMsg = document.createElement('div');
        loseMsg.textContent = "No color survived this time";
        loseMsg.style.position = 'absolute';
        loseMsg.style.fontSize= '48px';
        loseMsg.style.fontFamily = 'Arial';
        loseMsg.style.color='#FFF';
        loseMsg.style.fontSmooth = 'always';
        loseMsg.style.zIndex='999999';
        loseMsg.style.top = `${circleCenterY - 45}px`;
        loseMsg.style.left = `${circleCenterX - 280}px`;
        document.body.appendChild(loseMsg);
        musicSound.pause();
        loseSound.play();
        this.fadeOutCanvas();
        loseShown = false;
    }

    // Update and draw each ball
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        ball.update();
        ball.draw();
    }

    // Increment angle for rotating the gap
    angle += 2;
    if (angle >= 360) {
        angle = 0;
    }
	
	// Update saw rotation angle (adjust speed as needed)
    sawRotationAngle += 0.10;

    requestAnimationFrame(animate);
}

spawnInterval = setInterval(spawnBall, 100);

function spawnBall() {
    if (balls.length < maxSpawnedBalls) {
        const angleInRadians = Math.random() * Math.PI * 2;
        const vx = Math.cos(angleInRadians) * speed;
        const vy = Math.sin(angleInRadians) * speed;

        const newBall = new Ball(circleCenterX, circleCenterY, vx, vy);
        balls.push(newBall);

        // Start fading in the new ball
        const fadeInInterval = setInterval(() => {
            newBall.opacity += 0.05;
            if (newBall.opacity >= 1) {
                clearInterval(fadeInInterval);
            }
        }, 50);

        newBall.spawnTime = Date.now(); // Track spawn time for collision immunity
    }
	
	if (balls.length == maxSpawnedBalls) {
		clearInterval(spawnInterval);
	}
}

appendCountdownElement();

spawnBall();

spawnBall();

animate(); // Start animation loop