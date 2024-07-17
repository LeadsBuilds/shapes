// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(95, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Add lighting
const light = new THREE.PointLight(0xffffff, 0.6, 100);
light.position.set(10, 10, 10);
light.castShadow = true;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
scene.add(ambientLight);

// Load textures
const textureLoader = new THREE.TextureLoader();
const laneTexture = textureLoader.load('textures/lane.png');
const backgroundTexture = textureLoader.load('textures/background.jpg');

// Add background
const backgroundGeometry = new THREE.PlaneGeometry(100, 100);
const backgroundMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture });
const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
background.rotation.x = -Math.PI / 2;
background.position.y = -1;
scene.add(background);

// Add lane
const laneGeometry = new THREE.PlaneGeometry(10, 100);
const laneMaterial = new THREE.MeshBasicMaterial({ map: laneTexture });
const lane = new THREE.Mesh(laneGeometry, laneMaterial);
lane.rotation.x = -Math.PI / 2;
lane.position.y = 0;
scene.add(lane);

// Protagonist (ball with a gradient color)
const protagonistGeometry = new THREE.SphereGeometry(1, 32, 32);
const protagonistMaterial = new THREE.MeshPhongMaterial({
    color: 0xe642f5,
    specular: 0x555555,
    shininess: 30,
});
const protagonist = new THREE.Mesh(protagonistGeometry, protagonistMaterial);
protagonist.position.set(1, 1, 1);
protagonist.castShadow = true;
scene.add(protagonist);

let bullets = [];
let enemies = [];
let gameOver = false;
let moveLeft = false;
let moveRight = false;
let startTime = Date.now();
let countdownStarted = false;
let timeElapsedStarted = false;
let isLoseEnable = false;
let winCountdown = 5;
let winCountdownInterval;

const enemyLimit = 200;

let canCreateEnemies = false;
let enemyTimeout = 180;

setTimeout(() => {
    canCreateEnemies = !canCreateEnemies;
    enemyTimeout = 800;
    increaseEnemyTimeout()
}, 30000)

// Load audio files
const listener = new THREE.AudioListener();
camera.add(listener);

const backgroundMusic = new THREE.Audio(listener);
const deathSound = new THREE.Audio(listener);
const deadSound = new THREE.Audio(listener);
const loseSound = new THREE.Audio(listener);
const winSound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('audio/music.mp3', function (buffer) {
    backgroundMusic.setBuffer(buffer);
    backgroundMusic.setLoop(true);
    backgroundMusic.setVolume(0.5);
    backgroundMusic.play();
});

audioLoader.load('audio/dead.mp3', function (buffer) {
    deadSound.setBuffer(buffer);
    deadSound.setVolume(0.2);
});

audioLoader.load('audio/lose.mp3', function (buffer) {
    loseSound.setBuffer(buffer);
    loseSound.setVolume(0.5);
});

audioLoader.load('audio/win.mp3', function (buffer) {
    winSound.setBuffer(buffer);
    winSound.setVolume(0.5);
});

function getRandomHexColor() {
    // Generate random components for red, green, and blue
    // Ensure at least one component is at the maximum value (255)
    let components = [
        Math.floor(Math.random() * 128) + 50,  // Range from 128 to 255
        Math.floor(Math.random() * 128) + 50,  // Range from 128 to 255
        Math.floor(Math.random() * 128) + 50    // Range from 128 to 255
    ];
    
    // Randomly set one component to 255 to ensure vibrancy
    components[Math.floor(Math.random() * 3)] = 255;

    // Convert components to hex strings and concatenate
    let hexString = components.map(comp => comp.toString(16).toUpperCase().padStart(2, '0')).join('');

    // Convert the hex string to a number and prefix it with '0x'
    let hexNumber = parseInt(hexString, 16);

    return '0x' + hexNumber.toString(16).toUpperCase().padStart(6, '0');
}

// Function to create bullets
function createBullet() {
    const bulletGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00});
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(protagonist.position.x, protagonist.position.y, protagonist.position.z);
    bullets.push(bullet);

    audioLoader.load('audio/bullet.mp3', function (buffer) {
        const audio = new THREE.Audio(listener);
        audio.setBuffer(buffer);
        audio.setVolume(0.2);
        audio.play();
        
        scene.add(bullet);
        bullet.add(audio);
    });

    const audio = bullet.children[0];
    audio.play();
}

// Function to create enemies
function createEnemy() {
    if (enemies.length >= enemyLimit) return;

    const size = Math.random() * 0.8 + 0.6; // Random size between 0.6 and 1.4
    const enemyGeometry = new THREE.SphereGeometry(size, 32, 32);
    const enemyMaterial = new THREE.MeshPhongMaterial({ color: getRandomHexColor() });
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemy.material.color.setHex(getRandomHexColor());
    enemy.position.set(Math.random() * 8 - 4, size, -Math.random() * 30 - 20); // Spawn within lane boundaries
    enemy.castShadow = true;
    enemies.push(enemy);
    scene.add(enemy);
}

// Spawn enemies periodically with a minimum of 2 seconds
let enemyInterval = setInterval(() => {
    if (!gameOver) createEnemy();
}, enemyTimeout);

function increaseEnemyTimeout() {
    clearInterval(enemyInterval);

    setInterval(() => {
        if (!gameOver) createEnemy();
    }, enemyTimeout);
}

// Move protagonist
function moveProtagonist() {
    if (moveLeft && protagonist.position.x > -4) {
        protagonist.position.x -= 0.1;
        background.position.x -= 0.1; // Move background smoothly
    }
    if (moveRight && protagonist.position.x < 4) {
        protagonist.position.x += 0.1;
        background.position.x += 0.1; // Move background smoothly
    }
}

// Handle bullet and enemy updates
function updateObjects() {
    bullets.forEach((bullet, index) => {
        bullet.position.z -= 0.5;
        if (bullet.position.z < -50) {
            scene.remove(bullet);
            bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, index) => {
        if (enemy.userData.hit) { 
            return;
        }

        enemy.position.z += 0.1;
        if (enemy.position.z > 0) {
            gameOver = true;
            deadSound.play();
            if (winCountdown) {
                isLoseEnable = true;
                fadeScene('black', 'YOU LOSE!', loseSound);
            }
            return;
        }

        bullets.forEach((bullet, bulletIndex) => {
            if (bullet.position.distanceTo(enemy.position) < enemy.geometry.parameters.radius + 0.2) {
                enemy.userData.hit = true;
                enemy.geometry = new THREE.BoxGeometry(enemy.geometry.parameters.radius, 0.5, enemy.geometry.parameters.radius);
                enemy.material.color.setHex(getRandomHexColor());
                
                audioLoader.load('audio/death.mp3', function (buffer) {
                    const audio = new THREE.Audio(listener);
                    audio.setBuffer(buffer);
                    audio.setVolume(0.8);
                    audio.play();
                    
                    scene.add(bullet);
                    enemy.add(audio);
                });

                bullets.splice(bulletIndex, 1);

                setTimeout(() => {
                    scene.remove(enemy);
                    scene.remove(bullet);
                }, 500)

                if (canCreateEnemies) {
                    createEnemy();
                }
            }
        });
    });
}

// Animate lane texture
function animateLaneTexture() {
    laneMaterial.map.offset.y -= 0.05; // Adjust speed as necessary
}

// Camera follow protagonist
function updateCamera() {
    camera.position.x = protagonist.position.x;
    camera.position.z = protagonist.position.z + 5;
    camera.position.y = protagonist.position.y + 5;
    camera.lookAt(protagonist.position);
}

// Fade scene to a specified color and show a message
function fadeScene(color, message, sound) {
    const fadePlane = new THREE.PlaneGeometry(100, 100);
    const fadeMaterial = new THREE.MeshBasicMaterial({ color: color, opacity: 0, transparent: true });
    const fadeMesh = new THREE.Mesh(fadePlane, fadeMaterial);
    fadeMesh.rotation.x = -Math.PI / 2;
    fadeMesh.position.y = 5;
    scene.add(fadeMesh);

    showMessage(message, sound);
}

// Show message in the center of the screen
function showMessage(text, sound) {
    const messageElement = document.createElement('div');
    messageElement.style.position = 'absolute';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.fontSize = '80px';
    messageElement.style.fontFamily = 'Arial';
    messageElement.style.color = 'white';
    messageElement.style.background = 'rgba(0, 0, 0, 0.5)';
    messageElement.style.padding = '20px';
    messageElement.style.borderRadius = '10px';
    messageElement.textContent = text;
    document.body.appendChild(messageElement);

    backgroundMusic.pause();
    sound.play();
}

function showTitle(text) {
    const showTitleElement = document.createElement('div');
    showTitleElement.style.position = 'absolute';
    showTitleElement.style.maxWidth = '500px';
    showTitleElement.style.top = '10%';
    showTitleElement.style.left = '50%';
    showTitleElement.style.fontFamily = 'komikax';
    showTitleElement.style.transform = 'translate(-50%, -50%)';
    showTitleElement.style.fontSize = '48px';
    showTitleElement.style.textAlign = 'center';
    showTitleElement.style.fontWeight = 'bold';
    showTitleElement.style.color = 'white';
    showTitleElement.style.textShadow = '3px 2px 2px #333';
    showTitleElement.style.background= 'linear-gradient(15deg, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0.25));';
    showTitleElement.style.padding = '15px';
    showTitleElement.style.borderRadius = '20px';
    showTitleElement.textContent = text;
    document.body.appendChild(showTitleElement);

    return showTitleElement;
}

// Show countdown in the center of the screen
function showCount(text) {
    const countdownElement = document.createElement('div');
    countdownElement.style.position = 'absolute';
    countdownElement.style.top = '22%';
    countdownElement.style.left = '50%';
    countdownElement.style.fontFamily = 'Arial';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.fontSize = '38px';
    countdownElement.style.color = 'white';
    countdownElement.style.background = 'rgba(0, 0, 0, 0.4)';
    countdownElement.style.padding = '10px';
    countdownElement.style.borderRadius = '5px';
    countdownElement.textContent = text;
    document.body.appendChild(countdownElement);

    return countdownElement;
}

// Start win countdown
function startWinCountdown() {
    const countdownElement = showCount(`Time left: ${winCountdown}`);
    winCountdownInterval = setInterval(() => {
        winCountdown -= 1;
        countdownElement.textContent = `Time left: ${winCountdown}`;
        if (winCountdown <= 0 && !isLoseEnable) {
            clearInterval(winCountdownInterval);
            document.body.removeChild(countdownElement);
            fadeScene('0xe642f5', 'YOU WIN!', winSound);
        }
    }, 1000);
}

function initTimeElapsed(elapsedTime) {
    const timeElapsedElement = showCount(`Elapsed: ${~~elapsedTime}s`);
    elapsedTimeInterval = setInterval(() => {
        elapsedTime += 1;
        timeElapsedElement.textContent = `Elapsed: ${~~elapsedTime}s`;
        if (elapsedTime >= 30) {
            clearInterval(elapsedTimeInterval);
            document.body.removeChild(timeElapsedElement);
        }
    }, 1000);
}

// Animation loop
function animate() {
    if (!gameOver) {
        requestAnimationFrame(animate);
        moveProtagonist();
        updateObjects();
        animateLaneTexture();
        updateCamera();
        renderer.render(scene, camera);

        const elapsedTime = (Date.now() - startTime) / 1000;
        
        if (!timeElapsedStarted) {
            initTimeElapsed(elapsedTime);
            timeElapsedStarted = true;
        }

        if (elapsedTime >= 30 && !countdownStarted) {
            countdownStarted = true;
            startWinCountdown();
        }
    }
}

showTitle('Can You Survive for 30 seconds?');
animate();

// Event listeners for controls
document.addEventListener('keydown', (event) => {
    if (event.key === 'a' || event.key === 'ArrowLeft') {
        moveLeft = true;
    } else if (event.key === 'd' || event.key === 'ArrowRight') {
        moveRight = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'a' || event.key === 'ArrowLeft') {
        moveLeft = false;
    } else if (event.key === 'd' || event.key === 'ArrowRight') {
        moveRight = false;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' || enemies.keyCode === 13) {
        createBullet();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
