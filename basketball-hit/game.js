const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const spawnSound = new Audio('audio/spawn.mp3');
const hitSound = new Audio('audio/hit.mp3');
const loseSound = new Audio('audio/lose.mp3');
const winSound = new Audio('audio/win.mp3');
const backgroundMusic = new Audio('audio/music.mp3');
const bounceSound = new Audio('audio/spawn.mp3');

backgroundMusic.loop = true;  // Set the music to loop

const aspectRatio = 9 / 16;
let canvasWidth, canvasHeight;

const basket = {
    x: 0,  // Initial value, will be set in resizeCanvas
    y: 0,  // Initial value, will be set in resizeCanvas
    width: 100,
    height: 20,
    speed: 3,
    direction: 1
};

function resizeCanvas() {
    if (window.innerWidth / window.innerHeight > aspectRatio) {
        canvasHeight = window.innerHeight;
        canvasWidth = canvasHeight * aspectRatio;
    } else {
        canvasWidth = window.innerWidth;
        canvasHeight = canvasWidth / aspectRatio;
    }
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Update basket position to the center
    basket.x = canvas.width / 2 - basket.width / 2;
    basket.y = canvas.height * 0.8 - basket.height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const balls = [];
let ballLimit = 3;
let intervalId;
let gameOver = false;

function spawnBall() {
    if (balls.length >= ballLimit) return;
    const ball = {
        x: Math.random() * canvas.width,
        y: 0,
        radius: 10,
        speed: 2,
        directionX: (Math.random() > 0.5 ? 1 : -1),  // Random initial horizontal direction
        directionY: 1
    };
    balls.push(ball);
    spawnSound.play();
}

function moveBasket() {
    basket.x += basket.speed * basket.direction;
    if (basket.x + basket.width > canvas.width || basket.x < 0) {
        basket.direction *= -1;
        hitSound.volume = 0.5;
        hitSound.play();
        hitSound.currentTime = 0;
    }
}

function updateBalls() {
    balls.forEach(ball => {
        ball.x += ball.speed * ball.directionX;
        ball.y += ball.speed * ball.directionY;

        // Check collision with walls
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
            ball.directionX *= -1;
            bounceSound.play();
        }

        // Check collision with basket
        if (
            ball.y + ball.radius >= basket.y &&  // Ball's center is below or touching the top of the basket
            ball.y - ball.radius <= basket.y + basket.height &&  // Ball's center is above or touching the bottom of the basket
            ball.x >= basket.x && ball.x <= basket.x + basket.width  // Ball is within the horizontal bounds of the basket
        ) {
            hitSound.play();
            endGame('YOU WIN', winSound);
        }
    });

    // Remove balls that are out of the canvas
    for (let i = balls.length - 1; i >= 0; i--) {
        if (balls[i].y - balls[i].radius > canvas.height) {
            balls.splice(i, 1);
        }
    }

    if (balls.length === 0 && ballLimit <= 0) {
        endGame('YOU LOSE', loseSound);
    }
}

function drawBasket() {
    ctx.fillStyle = 'red';
    ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
}

function drawBalls() {
    ctx.fillStyle = 'white';
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
}

function endGame(message, sound) {
    gameOver = true;
    clearInterval(intervalId);
    sound.play();
    backgroundMusic.pause();  // Pause the background music
    document.getElementById('message').innerText = message;
    document.getElementById('message').style.display = 'block';
    document.getElementById('message-background').style.display = 'block';
}

function draw() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveBasket();
    updateBalls();
    drawBasket();
    drawBalls();

    requestAnimationFrame(draw);
}

function startGame() {
    intervalId = setInterval(spawnBall, 500);
    backgroundMusic.play();  // Play the background music
    draw();
}

startGame();
