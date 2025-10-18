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
    blueBalls: [],
    redBoxes: [],
    gameOver: false,
    won: false,
    showAd: false,
    showShop: false,
    adTimer: 0,
    frame: 0,
    ballsCollected: 0,
    totalBalls: 0,
    debugMode: false
};

const LANES = [canvas.width / 6, canvas.width / 2, canvas.width * 5 / 6];
const SKINS = [
    { name: 'Classic', cost: 0, color: '#6496FF' },
    { name: 'Fire', cost: 150, color: '#FF6400' },
    { name: 'Toxic', cost: 400, color: '#00FF64' },
    { name: 'Galaxy', cost: 800, color: '#9600FF' },
    { name: 'Gold', cost: 1500, color: '#FFD700' },
    { name: 'Diamond', cost: 2500, color: '#B9F2FF' },
    { name: 'Shadow', cost: 4000, color: '#2D2D2D' },
    { name: 'Rainbow', cost: 6000, color: '#FF69B4' },
    { name: 'Plasma', cost: 8500, color: '#00FFFF' },
    { name: 'Cosmic', cost: 12000, color: '#8A2BE2' },
    { name: 'Legendary', cost: 18000, color: '#FFD700' }
];

function initLevel() {
    game.blueBalls = [];
    game.redBoxes = [];
    game.player.distance = 0;
    game.player.tier = 0;
    game.gameOver = false;
    game.won = false;
    
    // Generate blue balls first (safe to collect)
    const ballPositions = [];
    const ballCount = 50 + game.level * 5;
    game.totalBalls = ballCount;
    game.ballsCollected = 0;
    
    for (let i = 0; i < ballCount; i++) {
        const lane = Math.floor(Math.random() * 3);
        const y = i * 150 + 600;
        game.blueBalls.push({ lane, y, collected: false });
        ballPositions.push({ lane, y });
    }
    
    // Generate red boxes - dangerous obstacles
    const boxCount = 15 + game.level * 2;
    let boxesAdded = 0;
    
    for (let i = 0; i < boxCount && boxesAdded < boxCount; i++) {
        const y = 1000 + i * 300;
        const lane = Math.floor(Math.random() * 3);
        
        // Check if red box would overlap with any blue ball
        const tooClose = ballPositions.some(ball => 
            ball.lane === lane && Math.abs(ball.y - y) < 120
        );
        
        // Only add red box if it's safe
        if (!tooClose) {
            game.redBoxes.push({ lane, y, hit: false });
            boxesAdded++;
        }
    }
    
    console.log('[GAME] Level initialized:', game.blueBalls.length, 'blue balls,', game.redBoxes.length, 'red boxes');
    console.log('[DEBUG] First 5 red boxes:', game.redBoxes.slice(0, 5).map(b => `Lane ${b.lane}, Y: ${b.y}`));
    console.log('[DEBUG] Player starts at Y:', game.player.y, 'Distance:', game.player.distance);
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
    
    // Collect blue balls (safe, no crash, earn JVW tokens)
    game.blueBalls.forEach(ball => {
        if (!ball.collected && ball.lane === game.player.lane) {
            const ballWorldY = ball.y;
            const playerWorldY = game.player.distance + game.player.y;
            const dist = Math.abs(ballWorldY - playerWorldY);
            
            if (dist < 45) {
                ball.collected = true;
                game.ballsCollected++;
                
                // Earn 1 JVW token per blue ball collected
                game.tokens++;
                localStorage.setItem('tokens', game.tokens);
                
                if (game.player.tier < 4) game.player.tier++;
                console.log('[COLLECT] Blue ball collected! +1 JVW token. Total:', game.tokens);
            }
        }
    });
    
    // Check red box collisions - causes crash
    game.redBoxes.forEach(box => {
        if (!box.hit && box.lane === game.player.lane) {
            const boxWorldY = box.y;
            const playerWorldY = game.player.distance + game.player.y;
            const dist = Math.abs(boxWorldY - playerWorldY);
            
            // Crash if touching red box (within 35 pixels)
            if (dist < 35) {
                box.hit = true;
                game.gameOver = true;
                console.log('[CRASH] Hit red box at Y:', boxWorldY, 'Player at:', playerWorldY, 'Distance:', dist);
                setTimeout(() => showAd('crash'), 100);
            }
        }
    });
    
    // Check win (finish line gets longer with level)
    const finishLine = 6000 + (game.level * 500);
    if (game.player.distance >= finishLine) {
        game.won = true;
        game.gameOver = true;
        
        // Level completion bonus + special rewards
        const levelBonus = 50 + game.level * 10;
        let specialReward = 0;
        
        // Boss level rewards (every 5th level)
        if (game.level % 5 === 0) {
            specialReward = 100 + game.level * 5;
            console.log('[REWARD] Boss level completed! +' + specialReward + ' bonus JVW tokens!');
        }
        
        game.tokens += levelBonus + specialReward;
        localStorage.setItem('tokens', game.tokens);
        
        // Save level progress
        game.level++;
        localStorage.setItem('level', game.level);
        
        console.log('[GAME] Level complete! +' + (levelBonus + specialReward) + ' total tokens. Total:', game.tokens);
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
    
    // Draw blue balls - safe to collect, earn JVW tokens
    let visibleBalls = 0;
    game.blueBalls.forEach(ball => {
        if (ball.collected) return;
        const y = ball.y - game.player.distance + game.player.y;
        
        if (y > -100 && y < canvas.height + 100) {
            visibleBalls++;
            const x = LANES[ball.lane];
            
            // Blue ball glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00BFFF';
            ctx.fillStyle = '#00BFFF';
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Blue ball body
            ctx.fillStyle = '#00BFFF';
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // White highlight
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Debug mode - show collection box
            if (game.debugMode) {
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 22, y - 22, 44, 44);
                ctx.fillStyle = '#00FF00';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('SAFE', x, y - 30);
            }
        }
    });
    
    // Draw red boxes - dangerous, cause crash
    let visibleBoxes = 0;
    game.redBoxes.forEach(box => {
        if (box.hit) return;
        const y = box.y - game.player.distance + game.player.y;
        
        if (y > -100 && y < canvas.height + 100) {
            visibleBoxes++;
            const x = LANES[box.lane];
            
            // Red box shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(x - 30, y + 30, 60, 8);
            
            // Main red box - BRIGHT RED
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x - 30, y - 30, 60, 60);
            
            // Yellow warning border
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 30, y - 30, 60, 60);
            
            // Warning stripes
            ctx.fillStyle = '#FFFF00';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(x - 25, y - 20 + i * 15, 50, 5);
            }
            
            // Danger symbol
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', x, y);
            
            // Debug mode - show collision box
            if (game.debugMode) {
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 35, y - 35, 70, 70);
                ctx.fillStyle = '#FF0000';
                ctx.font = '10px Arial';
                ctx.fillText('CRASH', x, y - 45);
                ctx.fillText(`Y:${Math.floor(box.y)}`, x, y + 45);
            }
        }
    });
    
    // Debug info
    if (game.debugMode) {
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Blue balls visible: ${visibleBalls}`, 10, canvas.height - 80);
        ctx.fillText(`Red boxes visible: ${visibleBoxes}`, 10, canvas.height - 65);
        ctx.fillText(`Player Y: ${Math.floor(game.player.distance + game.player.y)}`, 10, canvas.height - 50);
        ctx.fillText(`Total blue balls: ${game.blueBalls.length}`, 10, canvas.height - 35);
        ctx.fillText(`Total red boxes: ${game.redBoxes.length}`, 10, canvas.height - 20);
        ctx.fillText(`JVW Tokens: ${game.tokens}`, 10, canvas.height - 5);
    }
    
    // Player (always on top)
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
    
    // Debug - show collision box
    if (game.debugMode) {
        ctx.strokeStyle = '#FF00FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 40, py - 40, 80, 80);
    }
    
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
            ctx.fillText(`Blue Balls: ${game.ballsCollected}/${game.totalBalls}`, canvas.width / 2, canvas.height / 2 + 10);
            const levelBonus = 50 + (game.level - 1) * 10;
            const bossBonus = ((game.level - 1) % 5 === 0) ? 100 + (game.level - 1) * 5 : 0;
            ctx.fillText(`JVW Earned: ${game.ballsCollected + levelBonus + bossBonus}`, canvas.width / 2, canvas.height / 2 + 40);
        } else {
            ctx.font = '20px Arial';
            ctx.fillText('Tap SPACE to retry', canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`Blue balls collected: ${game.ballsCollected}`, canvas.width / 2, canvas.height / 2 + 50);
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
        ctx.fillText('Earn JVW tokens by collecting blue balls!', canvas.width / 2, 125);
        
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

// Shop button
document.getElementById('shopBtn').addEventListener('click', (e) => {
    e.preventDefault();
    game.showShop = !game.showShop;
});

document.getElementById('shopBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.showShop = !game.showShop;
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
        e.preventDefault();
        game.showShop = !game.showShop;
        console.log('[SHOP] Shop toggled:', game.showShop ? 'OPEN' : 'CLOSED');
    }
    if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        game.debugMode = !game.debugMode;
        console.log('[DEBUG] Debug mode:', game.debugMode ? 'ON' : 'OFF');
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
        const skinY = 150 + i * 90;
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
                console.log('[SHOP] Purchased and equipped:', skin.name, 'for', skin.cost, 'tokens');
            } else {
                console.log('[SHOP] Cannot afford:', skin.name, '- Need', skin.cost - game.tokens, 'more tokens');
            }
        }
    });
});

// Start game
initLevel();
requestAnimationFrame(gameLoop);
console.log('[GAME] Magno.bp loaded!');
console.log('[CONTROLS] Mobile: ◀ ⚡ ▶ buttons');
console.log('[CONTROLS] Desktop: Arrow Keys + Space');
console.log('[CONTROLS] S = Open Shop');
console.log('[CONTROLS] D = Toggle Debug Mode');
console.log('[GAME] Collision: 40px radius');
console.log('[GAME] Obstacles never overlap with orbs (150px margin)');
console.log('[SHOP] Press S to open shop anytime!');
console.log('[DEBUG] Press D to see collision boxes and debug info');
