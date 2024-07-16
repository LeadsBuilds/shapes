const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const audio = new Audio('audio/shapes.mp3'); // Set your static shapes .mp3 file path here
const rainAudio = new Audio('audio/rain.mp3'); // Set your static rain .mp3 file path here
const rainAudio2 = new Audio('audio/rain2.mp3'); // Set your static rain2 .mp3 file path here
audio.loop = true;
rainAudio.loop = true;
rainAudio2.loop = true;
let audioContext;
let analyserShapes;
let analyserRain;
let analyserRain2;
let dataArrayShapes;
let dataArrayRain;
let dataArrayRain2;
let lastShapeColorChangeTime = 0;
const shapeColorChangeInterval = 5000; // Color change interval for shapes in milliseconds
let lastRainPlayTime = 0;
const rainPlayInterval = 2 * 60 * 1000; // Rain sound play interval in milliseconds (2 minutes)

// Initialize and setup audio and animation after a delay
setTimeout(() => {
    audio.play();
    rainAudio.volume = 0.5; // Adjust rain audio volume as needed
    rainAudio.play();
    rainAudio2.volume = 0.5; // Adjust rain2 audio volume as needed
    rainAudio2.play();
    setupAudioContext();
}, 1000); // Delayed start of audio playback by 1 second

function setupAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const rainSource = audioContext.createMediaElementSource(rainAudio); // Create rain audio source
    const rain2Source = audioContext.createMediaElementSource(rainAudio2); // Create rain2 audio source
    analyserShapes = audioContext.createAnalyser();
    analyserRain = audioContext.createAnalyser();
    analyserRain2 = audioContext.createAnalyser();
    analyserShapes.fftSize = 256;
    analyserRain.fftSize = 256;
    analyserRain2.fftSize = 256;
    
    // Connect all sources to their respective analyzers and then to the audio context destination
    source.connect(analyserShapes);
    rainSource.connect(analyserRain);
    rain2Source.connect(analyserRain2);
    analyserShapes.connect(audioContext.destination);
    analyserRain.connect(audioContext.destination);
    analyserRain2.connect(audioContext.destination);

    const bufferLengthShapes = analyserShapes.frequencyBinCount;
    const bufferLengthRain = analyserRain.frequencyBinCount;
    const bufferLengthRain2 = analyserRain2.frequencyBinCount;
    dataArrayShapes = new Uint8Array(bufferLengthShapes);
    dataArrayRain = new Uint8Array(bufferLengthRain);
    dataArrayRain2 = new Uint8Array(bufferLengthRain2);
    animate();
    scheduleRainAudio();
}

function scheduleRainAudio() {
    setInterval(() => {
        rainAudio.volume = 0.5; // Adjust volume as needed
        rainAudio.play();
    }, rainPlayInterval);

    setInterval(() => {
        rainAudio2.volume = 0.5; // Adjust volume as needed
        rainAudio2.play();
    }, rainPlayInterval);
}

class Shape {
    constructor(x, y, size, type) {

        if (type == 'triangle') {
            size = Math.random() * 15 + 20;
        }
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.angle = 0;
        this.rotationSpeed = Math.random() * 0.02 - 0.01;
        this.lastColorChange = 0;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.angle += this.rotationSpeed;

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

        // Change color every shapeColorChangeInterval milliseconds
        const now = Date.now();
        if (now - this.lastColorChange >= shapeColorChangeInterval) {
            this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            this.lastColorChange = now;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        if (this.type === 'circle') {
            ctx.arc(0, 0, this.size, 0, Math.PI * 2, false);
        } else if (this.type === 'square') {
            ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.type === 'triangle') {
            // Use data from analyserShapes for triangle color
            ctx.fillStyle = `hsl(${dataArrayShapes[0]}, 100%, 50%)`;
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = -Math.random() * canvas.height; // Start particles above the canvas
        this.size = Math.random() * 2 + 1;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.1})`;
        this.speedY = Math.random() * 3 + 1;
        this.lastColorChange = 0;
    }

    update() {
        this.y += this.speedY;

        if (this.y > canvas.height) {
            this.y = -10; // Reset particle above the canvas to create continuous rain effect
        }

        // Change color every colorChangeInterval milliseconds
        const now = Date.now();
        if (now - this.lastColorChange >= shapeColorChangeInterval) {
            this.color = `hsl(${dataArrayRain[0]}, 100%, 50%)`; // Use data from analyserRain for rain particle color
            this.lastColorChange = now;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size / 5, this.size * 10); // Adjust size and shape as needed for rain effect
    }
}

const shapes = [];
for (let i = 0; i < 114; i++) {
    const size = Math.random() * 20 + 10;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const type = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
    shapes.push(new Shape(x, y, size, type));
}

const particles = [];
for (let i = 0; i < 1000; i++) { // Increased number of rain particles for a denser effect
    particles.push(new Particle());
}

function animate() {
    requestAnimationFrame(animate);
    analyserShapes.getByteFrequencyData(dataArrayShapes);
    analyserRain.getByteFrequencyData(dataArrayRain);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / dataArrayRain.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArrayRain.length; i++) {
        barHeight = dataArrayRain[i];
        const r = barHeight + (25 * (i / dataArrayRain.length));
        const g = 250 * (i / dataArrayRain.length);
        const b = 50;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }

    shapes.forEach(shape => {
        shape.update();
        shape.draw();
    });

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    handleCollisions();
}

function handleCollisions() {
    for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
            const dx = shapes[i].x - shapes[j].x;
            const dy = shapes[i].y - shapes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < shapes[i].size + shapes[j].size) {
                shapes[i].speedX *= -1;
                shapes[i].speedY *= -1;
                shapes[j].speedX *= -1;
                shapes[j].speedY *= -1;
                shapes[i].color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                shapes[j].color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            }
        }
    }
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
