const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const livesDisplay = document.getElementById('lives-count');

let lives = 20;
const gravity = 0.5;
const player = {
    x: 50, y: 300, w: 20, h: 20,
    vx: 0, vy: 0, speed: 4, jump: -10, grounded: false
};

// Define 10 Level Sets (Simplified Data Structure)
const levels = [
    { 
        id: 1, 
        platforms: [{x: 0, y: 350, w: 800, h: 50}], 
        traps: [
            {x: 150, y: 340, w: 20, h: 10, type: 'hidden_spike', triggered: false, triggerX: 100},
            {x: 300, y: 0, w: 50, h: 20, type: 'falling_ceiling', triggered: false, triggerX: 250}
        ]
    },
    // Additional level data structures would follow here...
];

let currentLevelIndex = 0;

function update() {
    // Basic Movement Logic
    player.vy += gravity;
    player.x += player.vx;
    player.y += player.vy;

    // Floor Collision
    if (player.y + player.h > 350) {
        player.y = 350 - player.h;
        player.vy = 0;
        player.grounded = true;
    }

    // Trap Trigger Logic (The "Troll" Mechanism)
    const level = levels[currentLevelIndex];
    level.traps.forEach(trap => {
        if (player.x > trap.triggerX) trap.triggered = true;
        
        if (trap.triggered) {
            if (trap.type === 'falling_ceiling') trap.y += 10;
            // Check Collision with Trap
            if (checkCollision(player, trap)) die();
        }
    });

    draw();
    requestAnimationFrame(update);
}

function die() {
    lives--;
    livesDisplay.innerText = lives;
    player.x = 50;
    player.y = 300;
    // Reset traps for the level
    levels[currentLevelIndex].traps.forEach(t => t.triggered = false);
    if (lives <= 0) alert("GAME OVER");
}

function checkCollision(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Player
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Draw Traps
    ctx.fillStyle = 'red';
    const level = levels[currentLevelIndex];
    level.traps.forEach(trap => {
        if (trap.type === 'hidden_spike' && !trap.triggered) return;
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    });

    // Draw Ground
    ctx.fillStyle = '#333';
    level.platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
}

// Input Handling
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') player.vx = player.speed;
    if (e.key === 'ArrowLeft') player.vx = -player.speed;
    if (e.key === 'z' && player.grounded) {
        player.vy = player.jump;
        player.grounded = false;
    }
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') player.vx = 0;
});

update();
