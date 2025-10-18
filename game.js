// Magno.bp - Mobile Web Game (Fixed Version)
const AD_LINK = "https://www.effectivegatecpm.com/ehtjvsm8a?key=a81e51f36bc8eba806fbf695f06bd3f8";

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = Math.min(400, window.innerWidth);
    canvas.height = Math.min(800, window.innerHeight);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let game = {
    level: parseInt(localStorage.getItem('level')) || 1,
    tokens: parseInt(localStorage.getItem('tokens')) || 0,
    currentSkin: parseInt(localStorage.getItem('currentSkin')) || 0,
    ownedSkins: JSON.parse(localStorage.getItem('ownedSkins')) || [0],
    player: { lane: 1, y: 400, tier: 0, distance: 0, speed: 5, boosting: false },
    orbs: [],
    obstacles: [],
    gameOver: false,
    won: false,
    showAd: false,
    showShop: false,
    adTimer: 0,
    frame: 0,
    orbsCollected: 0,
    totalOrbs: 0
};

const LANES = [canvas.width / 6, canvas.width / 2, canvas.width * 5 / 6];
const SKINS = [
    { name: 'Classic', cost: 0, color: '#6496FF' },
    { name: 'Fire', cost: 150, color: '#FF6400' },
    { name: 'Toxic', cost: 400, color: '#00FF64' },
    { name: 'Galaxy', cost: 800, color: '#9600FF' },
    { name: 'Gold', cost: 1500, color: '#FFD700' }
];

function initLevel() {
    game.orbs = [];
    game.obstacles = [];
    game.player.distance = 0;
    game.player.tier = 0;
    game.gameOver = false;
    game.won = false;
    
    // Generate orbs first (more orbs as level increases)
    const orbPositions = [];
    const orbCount = 40 + game.level * 5;
    game.totalOrbs = orbCount;
    game.orbsCollected = 0;
    
    for (let i = 0; i < orbCount; i++) {
        const lane = Math.floor(Math.random() * 3);
        const y = i * 200 + 500;
        game.orbs.push({ lane, y, collected: false });
        orbPositions.push({ lane, y });
    }
    
    // Generate obstacles - MORE as level increases, NEVER overlap with orbs
    const obstacleCount = 20 + game.level * 3;
    let obstaclesAdded = 0;
    
    for (let i = 0; i < obstacleCount && obstaclesAdded < obstacleCount; i++) {
        const y = 1200 + i * 250;
        const lane = Math.floor(Math.random() * 3);
        
        // Check if obstacle would overlap with any orb
        const tooClose = orbPositions.some(orb => 
            orb.lane === lane && Math.abs(orb.y - y) < 150
        );
        
        // Only add obstacle if it's safe
        if (!tooClose) {
            game.obstacles.push({ lane, y, hit: false });
            obstaclesAdded++;
        }
    }
    
    console.log('[GAME] Level initialized:', game.orbs.length, 'orbs,', game.obstacles.length, 'obstacles');
}

function showAd(reason) {
    console.log('[AD] Opening ad -', reason);
    game.showAd = true;
    game.adTimer = 180;
    window.open(AD_LINK, '_blank');
    document.getElementById('adOverlay').style.display = 'flex';
    
    const interval = setInterval(() => {
        game.adTimer--;
        document.getElementById('adTimer').textContent = Math.ceil(game.adTimer / 60);
        if (game.adTimer <= 0) {
            clearInterval(interval);
            document.getElementById('adOverlay').style.display = 'none';
            game.showAd = false;
        }
    }, 1000 / 60);
}

function update() {
    if (game.gameOver || game.showAd || game.showShop) return;
    
    game.frame++;
    
    // Speed increases with level (difficulty scaling)
    const baseSpeed = 5 + (game.level * 0.3);
    const speed = game.player.boosting ? baseSpeed * 1.5 : baseSpeed;
    game.player.distance += speed;
    
    // Collect orbs and earn tokens
    game.orbs.forEach(orb => {
        if (!orb.collected && orb.lane === game.player.lane) {
            const dist = Math.abs(orb.y - game.player.distance - game.player.y);
            if (dist < 50) {
                orb.collected = true;
                game.orbsCollected++;
                
                // Earn 1 token per orb collected
                game.tokens++;
                localStorage.setItem('tokens', game.tokens);
                
                if (game.player.tier < 4) game.player.tier++;
                console.log('[COLLECT] Orb collected! +1 token. Total:', game.tokens);
            }
        }
    });
    
    // Check collisions - PRECISE detection
    game.obstacles.forEach(obs => {
        if (!obs.hit && obs.lane === game.player.lane) {
            const obstacleWorldY = obs.y;
            const playerWorldY = game.player.distance + game.player.y;
            const dist = Math.abs(obstacleWorldY - playerWorldY);
            
            // Only crash if actually touching (within 40 pixels)
            if (dist < 40) {
                obs.hit = true;
                game.gameOver = true;
                console.log('[COLLISION] Hit obstacle at Y:', obstacleWorldY, 'Player at:', playerWorldY, 'Distance:', dist);
                setTimeout(() => showAd('crash'), 100);
            }
        }
    });
    
    // Check win (finish line gets longer with level)
    const finishLine = 6000 + (game.level * 500);
    if (game.player.distance >= finishLine) {
        game.won = true;
        game.gameOver = true;
        
        // Level completion bonus
        const levelBonus = 50 + game.level * 10;
        game.tokens += levelBonus;
        localStorage.setItem('tokens', game.tokens);
        
        // Save level progress
        game.level++;
        localStorage.setItem('level', game.level);
        
        console.log('[GAME] Level complete! +' + levelBonus + ' bonus tokens. Total:', game.tokens);
        setTimeout(() => {
            showAd('win');
            setTimeout(() => {
                initLevel();
            }, 3000);
        }, 100);
    }
}

function draw() {
    // Clear canvas efficiently
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Progress bar at top
    const finishLine = 6000 + (game.level * 500);
    const progress = Math.min(1, game.player.distance / finishLine);
    
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 10, canvas.width - 20, 20);
    
    const gradient = ctx.createLinearGradient(10, 10, canvas.width - 10, 10);
    gradient.addColorStop(0, '#00FF00');
    gradient.addColorStop(0.5, '#FFFF00');
    gradient.addColorStop(1, '#FF0000');
    ctx.fillStyle = gradient;
    ctx.fillRect(10, 10, (canvas.width - 20) * progress, 20);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, 20);
    
    // Progress text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(progress * 100)}%`, canvas.width / 2, 24);
    
    // Lanes
    ctx.strokeStyle = '#3c3c50';
    ctx.lineWidth = 2;
    LANES.forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    });
    
    // Orbs - optimized rendering
    ctx.fillStyle = '#00C8FF';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    game.orbs.forEach(orb => {
        if (orb.collected) return;
        const y = orb.y - game.player.distance + game.player.y;
        if (y > -50 && y < canvas.height + 50) {
            ctx.beginPath();
            ctx.arc(LANES[orb.lane], y, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    });
    
    // Obstacles - BIG AND VISIBLE (optimized)
    game.obstacles.forEach(obs => {
        if (obs.hit) return;
        const y = obs.y - game.player.distance + game.player.y;
        if (y > -100 && y < canvas.height + 100) {
            const x = LANES[obs.lane];
            
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(x - 32, y + 35, 64, 10);
            
            // Main red block
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x - 35, y - 35, 70, 70);
            
            // Yellow warning border
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 5;
            ctx.strokeRect(x - 35, y - 35, 70, 70);
            
            // Warning stripes
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(x - 30, y - 25, 60, 8);
            ctx.fillRect(x - 30, y - 5, 60, 8);
            ctx.fillRect(x - 30, y + 15, 60, 8);
            
            // Danger symbol
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', x, y);
        }
    });
    
    // Player
    const px = LANES[game.player.lane];
    const py = game.player.y;
    const skinColor = SKINS[game.currentSkin].color;
    
    // Glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = skinColor;
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(px, py, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Body
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(px, py, 22, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 7, py - 6, 5, 0, Math.PI * 2);
    ctx.arc(px + 7, py - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - 7, py - 6, 3, 0, Math.PI * 2);
    ctx.arc(px + 7, py - 6, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Smile
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py + 2, 10, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Game over
    if (game.gameOver && !game.showAd) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = game.won ? '#00FF00' : '#FF0000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(game.won ? '🏆 WIN!' : '💥 CRASH!', canvas.width / 2, canvas.height / 2 - 80);
        
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText(game.won ? `Level ${game.level - 1} Complete!` : `Level ${game.level} Failed`, canvas.width / 2, canvas.height / 2 - 30);
        
        if (game.won) {
            ctx.fillStyle = '#FFD700';
            ctx.font = '20px Arial';
            ctx.fillText(`Orbs: ${game.orbsCollected}/${game.totalOrbs}`, canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText(`Tokens Earned: ${game.orbsCollected + 50 + (game.level - 1) * 10}`, canvas.width / 2, canvas.height / 2 + 40);
        } else {
            ctx.font = '20px Arial';
            ctx.fillText('Tap SPACE to retry', canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`Orbs collected: ${game.orbsCollected}`, canvas.width / 2, canvas.height / 2 + 50);
        }
    }
    
    // Shop
    if (game.showShop) {
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🛒 BALL SHOP', canvas.width / 2, 60);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`💰 ${game.tokens} JVW Tokens`, canvas.width / 2, 100);
        
        ctx.fillStyle = '#aaa';
        ctx.font = '14px Arial';
        ctx.fillText('Earn tokens by collecting blue orbs!', canvas.width / 2, 125);
        
        SKINS.forEach((skin, i) => {
            const y = 150 + i * 100;
            const owned = game.ownedSkins.includes(i);
            const equipped = i === game.currentSkin;
            
            // Skin preview
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.arc(60, y, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // Name
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(skin.name, 100, y - 10);
            
            // Status
            ctx.font = '16px Arial';
            if (owned) {
                if (equipped) {
                    ctx.fillStyle = '#00FF00';
                    ctx.fillText('✓ EQUIPPED', 100, y + 15);
                } else {
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText('Click to equip', 100, y + 15);
                }
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`${skin.cost} JVW`, 100, y + 15);
                if (game.tokens >= skin.cost) {
                    ctx.fillStyle = '#00FF00';
                    ctx.fillText('Click to buy', 250, y + 15);
                }
            }
        });
        
        ctx.fillStyle = '#888';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press S to close', canvas.width / 2, canvas.height - 30);
    }
}

// Optimized game loop for smooth 60 FPS
let lastTime = 0;
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Update and draw
    update();
    draw();
    
    // Update UI (less frequently for performance)
    if (game.frame % 10 === 0) {
        document.getElementById('level').textContent = game.level;
        document.getElementById('tokens').textContent = game.tokens;
        const tierNames = ['Tiny', 'Double', 'Swift', 'Shield', 'Cosmic'];
        document.getElementById('tier').textContent = tierNames[game.player.tier] || 'Tiny';
    }
    
    requestAnimationFrame(gameLoop);
}

// Touch controls
let touchStartX = 0;
document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.player.lane > 0) game.player.lane--;
});

document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.player.lane < 2) game.player.lane++;
});

document.getElementById('boostBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.player.boosting = true;
});

document.getElementById('boostBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    game.player.boosting = false;
});

// Keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && game.player.lane > 0) game.player.lane--;
    if (e.key === 'ArrowRight' && game.player.lane < 2) game.player.lane++;
    if (e.key === ' ') {
        e.preventDefault();
        if (game.gameOver && !game.won && !game.showAd) {
            initLevel();
        } else {
            game.player.boosting = true;
        }
    }
    if (e.key === 's' || e.key === 'S') {
        game.showShop = !game.showShop;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === ' ') game.player.boosting = false;
});

// Shop clicks
canvas.addEventListener('click', (e) => {
    if (!game.showShop) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    SKINS.forEach((skin, i) => {
        const skinY = 150 + i * 100;
        if (y > skinY - 40 && y < skinY + 40) {
            if (game.ownedSkins.includes(i)) {
                game.currentSkin = i;
                localStorage.setItem('currentSkin', i);
                console.log('[SHOP] Equipped:', skin.name);
            } else if (game.tokens >= skin.cost) {
                game.tokens -= skin.cost;
                game.ownedSkins.push(i);
                game.currentSkin = i;
                localStorage.setItem('tokens', game.tokens);
                localStorage.setItem('ownedSkins', JSON.stringify(game.ownedSkins));
                localStorage.setItem('currentSkin', i);
                console.log('[SHOP] Purchased:', skin.name);
            }
        }
    });
});

// Start game
initLevel();
requestAnimationFrame(gameLoop);
console.log('[GAME] Magno.bp loaded! Controls: ◀ ⚡ ▶ or Arrow Keys + Space');
console.log('[GAME] Collision detection: Precise 40px radius');
console.log('[GAME] Obstacles never overlap with orbs (150px safety margin)');
