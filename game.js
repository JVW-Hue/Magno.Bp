// Magno.bp - Mobile Web Game
// Ad Link
const AD_LINK = "https://www.effectivegatecpm.com/ehtjvsm8a?key=a81e51f36bc8eba806fbf695f06bd3f8";

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas
function resizeCanvas() {
    const maxWidth = 400;
    const maxHeight = 800;
    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = maxWidth / maxHeight;
    
    if (windowRatio > gameRatio) {
        canvas.height = Math.min(window.innerHeight, maxHeight);
        canvas.width = canvas.height * gameRatio;
    } else {
        canvas.width = Math.min(window.innerWidth, maxWidth);
        canvas.height = canvas.width / gameRatio;
    }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let gameState = {
    level: 1,
    tokens: 0,
    player: {
        lane: 1,
        y: canvas.height / 2,
        tier: 0,
        distance: 0,
        speed: 5,
        boosting: false
    },
    orbs: [],
    obstacles: [],
    gameOver: false,
    won: false,
    showAd: false,
    adTimer: 0
};

const LANES = [canvas.width / 6, canvas.width / 2, canvas.width * 5 / 6];
const TIERS = [
    { name: 'Tiny', color: '#6496FF' },
    { name: 'Double', color: '#3264FF' },
    { name: 'Swift', color: '#00C8FF' },
    { name: 'Shield', color: '#96FFA0' },
    { name: 'Cosmic', color: '#FF64FF' }
];

// Initialize level
function initLevel() {
    gameState.orbs = [];
    gameState.obstacles = [];
    gameState.player.distance = 0;
    gameState.gameOver = false;
    gameState.won = false;
    
    // Generate orbs
    for (let i = 0; i < 50; i++) {
        gameState.orbs.push({
            lane: Math.floor(Math.random() * 3),
            y: i * 150 + 300,
            tier: Math.floor(Math.random() * 3),
            collected: false
        });
    }
    
    // Generate obstacles (smart placement)
    const finishLine = 5000 + gameState.level * 500;
    for (let i = 0; i < 20 + gameState.level; i++) {
        const y = Math.random() * (finishLine - 2000) + 1500;
        const blockedLanes = Math.random() < 0.5 ? 1 : 2;
        const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, blockedLanes);
        
        lanes.forEach(lane => {
            gameState.obstacles.push({ lane, y, hit: false });
        });
    }
}

// Show ad
function showAd(reason) {
    console.log(`[AD] Showing ad - ${reason}`);
    gameState.showAd = true;
    gameState.adTimer = 180;
    
    // Open ad in new tab
    window.open(AD_LINK, '_blank');
    
    // Show overlay
    const overlay = document.getElementById('adOverlay');
    overlay.style.display = 'flex';
    
    // Countdown
    const timerEl = document.getElementById('adTimer');
    const interval = setInterval(() => {
        gameState.adTimer--;
        timerEl.textContent = Math.ceil(gameState.adTimer / 60);
        
        if (gameState.adTimer <= 0) {
            clearInterval(interval);
            overlay.style.display = 'none';
            gameState.showAd = false;
        }
    }, 1000 / 60);
}

// Update game
function update() {
    if (gameState.gameOver || gameState.showAd) return;
    
    const speed = gameState.player.boosting ? gameState.player.speed * 1.5 : gameState.player.speed;
    gameState.player.distance += speed;
    
    // Check orb collection
    gameState.orbs.forEach(orb => {
        if (!orb.collected && orb.lane === gameState.player.lane) {
            const dist = Math.abs(orb.y - gameState.player.distance - gameState.player.y);
            if (dist < 50) {
                orb.collected = true;
                if (gameState.player.tier < 4) gameState.player.tier++;
            }
        }
    });
    
    // Check obstacle collision
    gameState.obstacles.forEach(obs => {
        if (!obs.hit && obs.lane === gameState.player.lane) {
            const dist = Math.abs(obs.y - gameState.player.distance - gameState.player.y);
            if (dist < 40) {
                obs.hit = true;
                gameState.gameOver = true;
                showAd('crash');
            }
        }
    });
    
    // Check win
    const finishLine = 5000 + gameState.level * 500;
    if (gameState.player.distance >= finishLine) {
        gameState.won = true;
        gameState.gameOver = true;
        gameState.tokens += 10 + gameState.level * 5;
        showAd('win');
        
        setTimeout(() => {
            if (!gameState.showAd) {
                gameState.level++;
                gameState.player.tier = 0;
                initLevel();
            }
        }, 3000);
    }
}

// Draw game
function draw() {
    // Clear
    ctx.fillStyle = '#0f0520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw lanes
    ctx.strokeStyle = '#3c3c50';
    ctx.lineWidth = 2;
    LANES.forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    });
    
    // Draw orbs
    gameState.orbs.forEach(orb => {
        if (orb.collected) return;
        const y = orb.y - gameState.player.distance + gameState.player.y;
        if (y > -50 && y < canvas.height + 50) {
            ctx.fillStyle = TIERS[orb.tier].color;
            ctx.beginPath();
            ctx.arc(LANES[orb.lane], y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
    
    // Draw obstacles
    gameState.obstacles.forEach(obs => {
        if (obs.hit) return;
        const y = obs.y - gameState.player.distance + gameState.player.y;
        if (y > -50 && y < canvas.height + 50) {
            ctx.fillStyle = '#ff3232';
            ctx.fillRect(LANES[obs.lane] - 25, y - 25, 50, 50);
            ctx.strokeStyle = '#ffc800';
            ctx.lineWidth = 3;
            ctx.strokeRect(LANES[obs.lane] - 20, y - 20, 40, 40);
        }
    });
    
    // Draw player
    const px = LANES[gameState.player.lane];
    const py = gameState.player.y;
    ctx.fillStyle = TIERS[gameState.player.tier].color;
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 6, py - 5, 4, 0, Math.PI * 2);
    ctx.arc(px + 6, py - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - 6, py - 5, 2, 0, Math.PI * 2);
    ctx.arc(px + 6, py - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Game over screen
    if (gameState.gameOver && !gameState.showAd) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = gameState.won ? '#64ff64' : '#ff6464';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.won ? '🏆 WIN! 🏆' : '💥 CRASH! 💥', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(gameState.won ? `Level ${gameState.level} Complete!` : `Retry Level ${gameState.level}`, canvas.width / 2, canvas.height / 2);
        
        if (gameState.won) {
            ctx.fillStyle = '#ffc107';
            ctx.fillText(`+${10 + gameState.level * 5} JVW Tokens`, canvas.width / 2, canvas.height / 2 + 40);
        }
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    
    // Update UI
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('tokens').textContent = gameState.tokens;
    document.getElementById('tier').textContent = TIERS[gameState.player.tier].name;
    
    requestAnimationFrame(gameLoop);
}

// Controls
document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.player.lane > 0) gameState.player.lane--;
});

document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.player.lane < 2) gameState.player.lane++;
});

document.getElementById('boostBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.player.boosting = true;
});

document.getElementById('boostBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.player.boosting = false;
});

// Keyboard controls for desktop
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && gameState.player.lane > 0) gameState.player.lane--;
    if (e.key === 'ArrowRight' && gameState.player.lane < 2) gameState.player.lane++;
    if (e.key === ' ') {
        e.preventDefault();
        if (gameState.gameOver && !gameState.won && !gameState.showAd) {
            gameState.player.tier = 0;
            initLevel();
        } else {
            gameState.player.boosting = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === ' ') gameState.player.boosting = false;
});

// Start game
initLevel();
gameLoop();

console.log('[GAME] Magno.bp loaded successfully!');
console.log('[AD] Ad link configured:', AD_LINK);
