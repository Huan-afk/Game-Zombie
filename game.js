// Supabase configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://qznajivxieikjyusbrie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bmFqaXZ4aWVpa2p5dXNicmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTg5NTEsImV4cCI6MjA2MDQ3NDk1MX0.BtPVwIb2BWT2HsS78bGvpF_0Vj-JQUOUcqiDblPvm1s';
let supabase;

// Initialize Supabase client
function initSupabase() {
    try {
        // Properly initialize the Supabase client 
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase initialized with URL:', SUPABASE_URL);
        
        // Test the connection
        testSupabaseConnection();
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        alert('Failed to connect to leaderboard service: ' + error.message);
    }
}

// Test the Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('Bảng Xếp Hạng')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('Supabase connection test failed:', error);
            alert('Could not connect to leaderboard database: ' + error.message);
        } else {
            console.log('Supabase connection successful, table exists');
        }
    } catch (error) {
        console.error('Error testing Supabase connection:', error);
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Disable physics debug
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    // Add input configuration
    input: {
        keyboard: true,
        mouse: true,
        touch: true,
        gamepad: false
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Game variables
let background;
let player;
let cursors;
let wasdKeys;
let bullets;
let zombies;
let zombieBullets;
let bosses;
let items;
let gameOver = false;
let gameOverText;
let scoreText;
let difficultyText;
let weaponText;
let score = 0;
let difficultyLevel = 1;
let bossStage = 0; // Track boss stage for health scaling
let zombieSpawnTimer = 0;
let bossSpawnTimer = 0;
let itemSpawnTimer = 0;
let level = 1;
let zombieSpawnInterval = 3000; // Time in ms between zombie spawns
let lastFired = 0;
let isMouseDown = false; // Track if mouse button is held down
let currentWeapon = 'default'; // Current weapon type
let weaponTimeRemaining = 0; // Time remaining for special weapons
let weaponTimer = null; // Timer for special weapons
const bulletSpeed = 325; // Reduced by 35% from original 500
const fireRate = 100; // Time in ms between shots
const zombieSpeed = 80; // Speed of zombies
const zombieBulletSpeed = 200; // Speed of zombie bullets
const bossBulletSpeed = 100; // Boss bullets are 50% slower
const zombieShootRate = 3000; // Time in ms between zombie shots
const weaponDuration = 10000; // Duration of special weapons (10 seconds)
const difficultyThreshold = 100; // Points needed to increase difficulty
const bossThreshold = 500; // Points needed for first boss to appear
const boss2Threshold = 1000; // Points needed for two bosses
const itemThreshold = 100; // Points needed for items to start appearing

// Text translations
const translations = {
    score: 'Điểm: ',
    difficulty: 'Độ khó: ',
    weaponDefault: 'Vũ khí: Mặc định',
    weaponWithTime: 'Vũ khí: {0} ({1}s)',
    gameOver: 'GAME OVER',
    clickToRestart: 'Nhấp để bắt đầu lại',
    bossDefeated: 'BOSS BỊ TIÊU DIỆT!\n+20 ĐIỂM',
    level: 'CẤP ĐỘ ',
    clickToEnable: 'Nhấp vào game để kích hoạt điều khiển bàn phím'
};

// Weapon damage values
const weaponDamage = {
    default: 1,
    ak47: 10,
    shotgun: 7
};

// Monster health values
const monsterHealth = {
    zombie: 1,
    boss: 1000 // Increased from 200 to 1000
};

// Store a reference to the current scene for the restart function
let gameScene;

// Initialize Supabase when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase
    initSupabase();
    
    // Store a reference to the current scene
    game.events.on('ready', function() {
        gameScene = game.scene.scenes[0];
    });
});

// Preload assets
function preload() {
    console.log('Starting to load assets...');
    
    // Load background image
    this.load.image('background', 'assets/background.png');
    console.log('Requested background image: assets/background.png');
    
    // Try loading the player sprite with different case variations
    // First try with the exact filename provided
    this.load.image('player', 'assets/Player.png');
    console.log('Requested player image: assets/Player.png');
    
    // Also try lowercase version as fallback
    this.load.image('player-lowercase', 'assets/player.png');
    console.log('Also requested lowercase version: assets/player.png');
    
    // Load bullet sprite 
    this.load.image('bullet', 'assets/bullet.png');
    
    // Load zombie sprite
    this.load.image('zombie', 'assets/zombie.png');
    console.log('Requested zombie image: assets/zombie.png');
    
    // Load special item sprites
    this.load.image('ak47', 'assets/AK47.png');
    console.log('Requested AK47 image: assets/AK47.png');
    
    this.load.image('shotgun', 'assets/Shotgun.png');
    console.log('Requested Shotgun image: assets/Shotgun.png');
    
    // Load boss sprite
    this.load.image('boss1', 'assets/Boss1.png');
    console.log('Requested Boss1 image: assets/Boss1.png');
    
    // Create a zombie bullet sprite programmatically if none exists
    this.load.on('complete', function() {
        if (!this.textures.exists('zombieBullet')) {
            createFallbackZombieBullet(this);
        }
        if (!this.textures.exists('ak47')) {
            createFallbackAK47(this);
        }
        if (!this.textures.exists('shotgun')) {
            createFallbackShotgun(this);
        }
        if (!this.textures.exists('boss1')) {
            createFallbackBoss(this);
        }
    }, this);
    
    // Add more detailed error handling for missing assets
    this.load.on('filecomplete', function (key, type, data) {
        console.log('Asset loaded successfully:', key, 'Type:', type);
    });
    
    this.load.on('loaderror', function (fileObj) {
        console.error('Error loading asset:', fileObj.key, 'Path:', fileObj.url);
        
        // Create fallback assets if they fail to load
        if (fileObj.key === 'player') {
            console.error('Failed to load player image - creating fallback');
            createFallbackPlayer(this);
        }
        if (fileObj.key === 'zombie') {
            console.error('Failed to load zombie image - creating fallback');
            createFallbackZombie(this);
        }
        if (fileObj.key === 'bullet') {
            console.error('Failed to load bullet image - creating fallback');
            createFallbackBullet(this);
        }
        if (fileObj.key === 'background') {
            console.error('Failed to load background image - creating fallback');
            createFallbackBackground(this);
        }
    }, this);
    
    // Add load complete event
    this.load.on('complete', function() {
        console.log('All assets loaded. Assets in cache:', 
            Object.keys(this.textures.list).join(', '));
    }, this);
}

// Create fallback graphics for background
function createFallbackBackground(scene) {
    console.log('Creating fallback background graphic');
    let graphics = scene.make.graphics();
    // Draw a gradient background
    let gradient = graphics.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#333333');
    gradient.addColorStop(1, '#000000');
    graphics.fillStyle(gradient);
    graphics.fillRect(0, 0, config.width, config.height);
    // Add some grid lines for visual interest
    graphics.lineStyle(1, 0x444444, 0.3);
    for (let x = 0; x < config.width; x += 50) {
        graphics.lineBetween(x, 0, x, config.height);
    }
    for (let y = 0; y < config.height; y += 50) {
        graphics.lineBetween(0, y, config.width, y);
    }
    graphics.generateTexture('background', config.width, config.height);
    graphics.destroy();
}

// Create fallback graphics for player
function createFallbackPlayer(scene) {
    console.log('Creating fallback player graphic');
    let graphics = scene.make.graphics();
    graphics.fillStyle(0x00ff00, 1); // Green color
    graphics.fillCircle(32, 32, 20);  // Draw a circle
    graphics.lineStyle(6, 0x333333, 1);
    graphics.lineBetween(32, 32, 60, 32); // Draw gun
    graphics.generateTexture('player', 64, 64);
    graphics.destroy();
}

// Create fallback graphics for bullet
function createFallbackBullet(scene) {
    console.log('Creating fallback bullet graphic');
    let graphics = scene.make.graphics();
    graphics.fillStyle(0xffff00, 1); // Yellow color
    graphics.fillCircle(8, 8, 4);  // Draw a small circle
    graphics.generateTexture('bullet', 16, 16);
    graphics.destroy();
}

// Create fallback graphics for zombie
function createFallbackZombie(scene) {
    console.log('Creating fallback zombie graphic');
    let graphics = scene.make.graphics();
    graphics.fillStyle(0xff0000, 1); // Red color
    graphics.fillCircle(32, 32, 20);  // Draw a circle
    graphics.fillStyle(0x880000, 1); // Darker red
    graphics.fillCircle(32, 32, 12);  // Inner circle
    graphics.generateTexture('zombie', 64, 64);
    graphics.destroy();
}

// Create fallback graphics for zombie bullet
function createFallbackZombieBullet(scene) {
    console.log('Creating fallback zombie bullet graphic');
    let graphics = scene.make.graphics();
    graphics.fillStyle(0xff0000, 1); // Red color
    graphics.fillCircle(8, 8, 4);  // Draw a small circle
    graphics.generateTexture('zombieBullet', 16, 16);
    graphics.destroy();
}

// Create fallback graphics for AK47
function createFallbackAK47(scene) {
    console.log('Creating fallback AK47 graphic');
    let graphics = scene.make.graphics();
    // Draw a rifle shape
    graphics.fillStyle(0x555555, 1); // Dark gray color
    graphics.fillRect(5, 10, 40, 5); // Barrel
    graphics.fillRect(10, 15, 25, 10); // Body
    graphics.fillRect(35, 15, 5, 15); // Stock
    graphics.generateTexture('ak47', 50, 40);
    graphics.destroy();
}

// Create fallback graphics for Shotgun
function createFallbackShotgun(scene) {
    console.log('Creating fallback Shotgun graphic');
    let graphics = scene.make.graphics();
    // Draw a shotgun shape
    graphics.fillStyle(0x555555, 1); // Dark gray color
    graphics.fillRect(5, 12, 35, 8); // Barrel
    graphics.fillRect(30, 10, 10, 12); // Body
    graphics.fillRect(40, 12, 6, 18); // Stock
    graphics.generateTexture('shotgun', 50, 40);
    graphics.destroy();
}

// Create fallback graphics for Boss
function createFallbackBoss(scene) {
    console.log('Creating fallback Boss graphic');
    let graphics = scene.make.graphics();
    // Draw a large enemy
    graphics.fillStyle(0x880000, 1); // Dark red color
    graphics.fillCircle(40, 40, 35); // Large circle
    graphics.fillStyle(0x550000, 1); // Even darker red
    graphics.fillCircle(40, 40, 25); // Inner circle
    graphics.fillStyle(0xff0000, 1); // Bright red
    // Draw angry "eyes"
    graphics.fillRect(25, 25, 10, 5);
    graphics.fillRect(45, 25, 10, 5);
    graphics.generateTexture('boss1', 80, 80);
    graphics.destroy();
}

// Create game objects
function create() {
    console.log('Create function started');
    
    // Add background image
    if (this.textures.exists('background')) {
        background = this.add.image(config.width/2, config.height/2, 'background');
        
        // Scale the background to fit the canvas
        const scaleX = config.width / background.width;
        const scaleY = config.height / background.height;
        
        // Use the smaller scale to ensure the background covers the entire canvas
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale);
        
        console.log('Background created with scale:', scale);
    } else {
        console.error('Background texture not found!');
    }
    
    // Check which version of the player texture loaded successfully
    let playerTextureKey = 'player';
    
    // If the exact case version failed but lowercase worked, use that
    if (!this.textures.exists('player') && this.textures.exists('player-lowercase')) {
        console.log('Using lowercase player image instead');
        playerTextureKey = 'player-lowercase';
    }
    
    // If neither version loaded, create a fallback
    if (!this.textures.exists(playerTextureKey)) {
        console.error('No player texture exists in the cache! Creating fallback...');
        createFallbackPlayer(this);
    }
    
    // Create player in the middle of the screen
    player = this.physics.add.sprite(config.width / 2, config.height / 2, playerTextureKey);
    console.log('Player sprite created with texture key:', player.texture.key);
    
    // Log some details about the player sprite
    console.log('Player sprite details:', {
        width: player.width,
        height: player.height,
        visible: player.visible,
        active: player.active
    });
    
    player.setCollideWorldBounds(true);
    player.setScale(0.6);
    
    console.log('Player created at:', player.x, player.y, 'with scale:', player.scaleX);
    
    // Enable keyboard input
    cursors = this.input.keyboard.createCursorKeys();
    
    // Add WASD keys for movement
    wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    
    // Add spacebar for shooting
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Create bullet group for player
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 50 // Increased for special weapons
    });
    
    // Create zombie group
    zombies = this.physics.add.group({
        defaultKey: 'zombie',
        maxSize: 50
    });
    
    // Create zombie bullet group
    zombieBullets = this.physics.add.group({
        defaultKey: 'zombieBullet',
        maxSize: 50
    });
    
    // Create boss group
    bosses = this.physics.add.group({
        defaultKey: 'boss1',
        maxSize: 5
    });
    
    // Create items group
    items = this.physics.add.group({
        maxSize: 5
    });
    
    // Set up mouse pointer for aiming
    this.input.on('pointermove', function (pointer) {
        // Calculate angle between player and pointer
        player.rotation = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    }, this);
    
    // Set up mouse down for shooting
    this.input.on('pointerdown', function (pointer) {
        isMouseDown = true;
        fireBullet(this);
    }, this);
    
    // Set up mouse up to stop shooting
    this.input.on('pointerup', function (pointer) {
        isMouseDown = false;
    }, this);
    
    // Set up touch events for mobile
    this.input.on('gameout', function (pointer) {
        isMouseDown = false;
    }, this);
    
    // Set up collision detection
    this.physics.add.collider(bullets, zombies, bulletHitZombie, null, this);
    this.physics.add.collider(player, zombies, playerHitZombie, null, this);
    this.physics.add.collider(player, zombieBullets, playerHitZombieBullet, null, this);
    this.physics.add.collider(bullets, bosses, bulletHitBoss, null, this);
    this.physics.add.overlap(player, items, playerCollectItem, null, this);
    
    // Add score text
    scoreText = this.add.text(16, 16, 'Điểm: 0', { 
        fontSize: '18px', 
        fill: '#fff',
        backgroundColor: '#000'
    });
    
    // Add difficulty level text
    difficultyText = this.add.text(16, 50, 'Độ khó: 1', { 
        fontSize: '18px', 
        fill: '#fff',
        backgroundColor: '#000'
    });
    
    // Add weapon text
    weaponText = this.add.text(16, 84, 'Vũ khí: Mặc định', { 
        fontSize: '18px', 
        fill: '#fff',
        backgroundColor: '#000'
    });
    
    // Add game over text
    gameOverText = this.add.text(config.width / 2, config.height / 2, 'GAME OVER', { 
        fontSize: '64px', 
        fill: '#fff'
    });
    gameOverText.setOrigin(0.5);
    gameOverText.visible = false;
    
    // Add click to restart on game over
    this.input.on('pointerdown', function() {
        if (gameOver) {
            restartGame(this);
        }
    }, this);
    
    // Add text to instruct the user to click on the game for keyboard focus
    this.add.text(config.width / 2, 30, 'Nhấp vào game để kích hoạt điều khiển bàn phím', {
        fontSize: '16px',
        fill: '#fff',
        backgroundColor: '#000'
    }).setOrigin(0.5);
}

// Game loop
function update(time, delta) {
    if (gameOver) {
        return;
    }
    
    // Player movement
    movePlayer();
    
    // Space key for shooting
    if (cursors.space.isDown) {
        fireBullet(this);
    }
    
    // Auto-fire for AK47 if mouse button is held down
    if (isMouseDown && currentWeapon === 'ak47') {
        fireBullet(this);
    }
    
    // Check for difficulty increase
    const currentDifficultyLevel = Math.floor(score / difficultyThreshold) + 1;
    if (currentDifficultyLevel > difficultyLevel) {
        increaseDifficulty(this);
    }
    
    // Spawn zombies
    zombieSpawnTimer += delta;
    if (zombieSpawnTimer >= zombieSpawnInterval) {
        // Spawn multiple zombies based on difficulty level
        const zombiesToSpawn = difficultyLevel;
        for (let i = 0; i < zombiesToSpawn; i++) {
            spawnZombie(this);
        }
        zombieSpawnTimer = 0;
    }
    
    // Determine boss stage and count based on score
    const newBossStage = Math.floor(score / bossThreshold);
    
    // Check if we need to spawn bosses
    if (score >= bossThreshold && newBossStage > bossStage && !bossSpawnTimer) {
        bossStage = newBossStage;
        bossSpawnTimer = this.time.addEvent({
            delay: 5000, // 5 second delay before bosses appear
            callback: function() {
                // Calculate how many bosses to spawn (exponential growth)
                let bossCount = 1;
                if (score >= boss2Threshold) {
                    bossCount = Math.pow(2, Math.floor((score - 500) / 500)); // Exponential increase
                    bossCount = Math.min(bossCount, 4); // Cap at 4 bosses maximum
                }
                
                console.log('Spawning ' + bossCount + ' bosses at stage ' + bossStage);
                
                // Spawn the bosses
                for (let i = 0; i < bossCount; i++) {
                    spawnBoss(this, bossStage);
                }
                
                bossSpawnTimer = null;
            },
            callbackScope: this
        });
    }
    
    // Spawn items when score threshold is reached
    itemSpawnTimer += delta;
    if (score >= itemThreshold && itemSpawnTimer >= 15000) { // Every 15 seconds
        spawnRandomItem(this);
        itemSpawnTimer = 0;
    }
    
    // Update weapon timer
    if (currentWeapon !== 'default' && weaponTimeRemaining > 0) {
        weaponTimeRemaining -= delta;
        weaponText.setText('Vũ khí: ' + currentWeapon.toUpperCase() + ' (' + Math.ceil(weaponTimeRemaining / 1000) + 's)');
        
        if (weaponTimeRemaining <= 0) {
            // Reset to default weapon
            currentWeapon = 'default';
            weaponText.setText('Vũ khí: Mặc định');
        }
    }
    
    // Update zombies to follow player
    zombies.getChildren().forEach(function(zombie) {
        // Move zombie towards player
        if (zombie.active) {
            moveZombieTowardsPlayer(zombie, this);
            
            // Random shooting from zombies
            if (Phaser.Math.Between(0, 1000) < 5) {
                fireZombieBullet(zombie, this);
            }
        }
    }, this);
    
    // Update bosses to follow player
    bosses.getChildren().forEach(function(boss) {
        // Move boss towards player
        if (boss.active) {
            moveBossTowardsPlayer(boss, this);
            
            // Boss shoots in multiple directions
            if (Phaser.Math.Between(0, 1000) < 20) {
                fireBossBarrage(boss, this);
            }
        }
    }, this);
}

// Handle player movement
function movePlayer() {
    // Reset velocity
    player.setVelocity(0);
    
    // Movement speed
    const speed = 200;
    
    // Horizontal movement with both arrow keys and WASD
    if (cursors.left.isDown || wasdKeys.A.isDown) {
        player.setVelocityX(-speed);
        console.log('Moving left');
    } else if (cursors.right.isDown || wasdKeys.D.isDown) {
        player.setVelocityX(speed);
        console.log('Moving right');
    }
    
    // Vertical movement with both arrow keys and WASD
    if (cursors.up.isDown || wasdKeys.W.isDown) {
        player.setVelocityY(-speed);
        console.log('Moving up');
    } else if (cursors.down.isDown || wasdKeys.S.isDown) {
        player.setVelocityY(speed);
        console.log('Moving down');
    }
}

// Firing bullets
function fireBullet(scene) {
    // Limit fire rate (different for each weapon)
    const currentTime = scene.time.now;
    const currentFireRate = currentWeapon === 'ak47' ? fireRate / 3 : fireRate; // AK47 fires 3x faster
    
    if (currentTime - lastFired < currentFireRate) {
        return;
    }
    
    // Handle different weapon types
    switch(currentWeapon) {
        case 'shotgun':
            fireShotgun(scene);
            break;
        case 'ak47':
        case 'default':
        default:
            fireDefaultBullet(scene);
            break;
    }
    
    // Update last fired time
    lastFired = currentTime;
}

// Fire a single bullet (default weapon or AK47)
function fireDefaultBullet(scene) {
    const bullet = bullets.get();
    
    if (bullet) {
        setupBullet(bullet, scene);
        
        // Store the damage value on the bullet
        bullet.damage = weaponDamage[currentWeapon];
    }
}

// Fire a shotgun (multiple bullets in a spread)
function fireShotgun(scene) {
    // Shotgun fires 4 bullets in a spread
    const spreadAngles = [-0.3, -0.1, 0.1, 0.3]; // Spread angles in radians
    
    spreadAngles.forEach(function(angleOffset) {
        const bullet = bullets.get();
        
        if (bullet) {
            setupBullet(bullet, scene);
            
            // Add spread to the shotgun bullets
            const newAngle = player.rotation + angleOffset;
            scene.physics.velocityFromRotation(newAngle, bulletSpeed, bullet.body.velocity);
            bullet.rotation = newAngle + Math.PI/2;
            
            // Store the damage value on the bullet
            bullet.damage = weaponDamage.shotgun;
        }
    });
}

// Setup common bullet properties
function setupBullet(bullet, scene) {
    bullet.setActive(true);
    bullet.setVisible(true);
    
    // Make bullets more visible with a green outline effect
    bullet.setScale(1.0);
    bullet.setTint(0xffffff);
    bullet.alpha = 1.0;
    
    // Position bullet just in front of the player based on rotation
    const angle = player.rotation;
    const distance = 30;
    const bulletX = player.x + Math.cos(angle) * distance;
    const bulletY = player.y + Math.sin(angle) * distance;
    bullet.setPosition(bulletX, bulletY);
    
    // Add green glowing outline
    const outline = scene.add.sprite(bulletX, bulletY, 'bullet');
    outline.setScale(1.4);
    outline.setTint(0x00ff00);
    outline.alpha = 0.8;
    outline.rotation = angle + Math.PI/2;
    
    // Make the outline follow the bullet
    scene.time.addEvent({
        delay: 10,
        callback: function() {
            if (bullet.active) {
                outline.x = bullet.x;
                outline.y = bullet.y;
                outline.visible = bullet.visible;
            } else {
                outline.destroy();
            }
        },
        callbackScope: scene,
        repeat: 100
    });
    
    // Calculate bullet velocity based on player rotation
    scene.physics.velocityFromRotation(angle, bulletSpeed, bullet.body.velocity);
    
    // Make the bullet face 90 degrees rotated from its movement direction
    bullet.rotation = angle + Math.PI/2;
    
    // Destroy bullet after it leaves the screen
    bullet.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
    
    scene.physics.world.on('worldbounds', function(body) {
        if (body.gameObject === bullet) {
            bullet.setActive(false);
            bullet.setVisible(false);
            outline.destroy();
        }
    });
}

// Spawn a zombie at a random position along the screen edge
function spawnZombie(scene) {
    const zombie = zombies.get();
    
    if (zombie) {
        zombie.setActive(true);
        zombie.setVisible(true);
        zombie.setScale(0.6);
        
        // Determine spawn position on a random edge
        const side = Phaser.Math.Between(0, 3); // 0: top, 1: right, 2: bottom, 3: left
        let x, y;
        
        switch (side) {
            case 0: // top
                x = Phaser.Math.Between(0, config.width);
                y = 0;
                break;
            case 1: // right
                x = config.width;
                y = Phaser.Math.Between(0, config.height);
                break;
            case 2: // bottom
                x = Phaser.Math.Between(0, config.width);
                y = config.height;
                break;
            case 3: // left
                x = 0;
                y = Phaser.Math.Between(0, config.height);
                break;
        }
        
        zombie.setPosition(x, y);
        zombie.lastFiredTime = 0; // Initialize zombie's shooting timer
        
        // Zombie looks at player
        const angle = Phaser.Math.Angle.Between(zombie.x, zombie.y, player.x, player.y);
        zombie.rotation = angle;
        
        console.log('Zombie spawned at:', x, y);
    }
}

// Move zombie towards player
function moveZombieTowardsPlayer(zombie, scene) {
    // Calculate angle between zombie and player
    const angle = Phaser.Math.Angle.Between(zombie.x, zombie.y, player.x, player.y);
    
    // Make zombie face player
    zombie.rotation = angle;
    
    // Set velocity towards player
    scene.physics.velocityFromRotation(angle, zombieSpeed, zombie.body.velocity);
}

// Zombie shoots a bullet at the player
function fireZombieBullet(zombie, scene) {
    const currentTime = scene.time.now;
    
    // Check if enough time has passed since last shot
    if (!zombie.lastFiredTime || currentTime - zombie.lastFiredTime >= zombieShootRate) {
        const zombieBullet = zombieBullets.get();
        
        if (zombieBullet) {
            zombieBullet.setActive(true);
            zombieBullet.setVisible(true);
            zombieBullet.setScale(0.5);
            zombieBullet.setPosition(zombie.x, zombie.y);
            
            // Calculate bullet velocity towards player
            const angle = Phaser.Math.Angle.Between(zombie.x, zombie.y, player.x, player.y);
            scene.physics.velocityFromRotation(angle, zombieBulletSpeed, zombieBullet.body.velocity);
            
            // Make the bullet face in its movement direction plus 90 degrees
            zombieBullet.rotation = angle + Math.PI/2;
            
            // Update zombie's last fired time
            zombie.lastFiredTime = currentTime;
            
            // Destroy bullet after it leaves the screen
            zombieBullet.setCollideWorldBounds(true);
            zombieBullet.body.onWorldBounds = true;
            
            scene.physics.world.on('worldbounds', function(body) {
                if (body.gameObject === zombieBullet) {
                    zombieBullet.setActive(false);
                    zombieBullet.setVisible(false);
                }
            });
        }
    }
}

// Handle bullet hitting zombie
function bulletHitZombie(bullet, zombie) {
    // Only give points and destroy if the zombie is still active
    if (zombie.active) {
        // Apply damage (zombies have 1 health so they always die from any hit)
        zombie.setActive(false);
        zombie.setVisible(false);
        
        // Increase score (zombies give 10 points)
        score += 10;
        scoreText.setText('Điểm: ' + score);
    }
    
    // Hide the bullet in any case
    bullet.setActive(false);
    bullet.setVisible(false);
}

// Handle player colliding with zombie
function playerHitZombie(player, zombie) {
    // Game over
    endGame(player.scene);
}

// Handle player being hit by zombie bullet
function playerHitZombieBullet(player, bullet) {
    bullet.setActive(false);
    bullet.setVisible(false);
    
    // Game over
    endGame(player.scene);
}

// End the game
function endGame(scene) {
    // Stop physics and show game over
    scene.physics.pause();
    gameOver = true;
    
    // Show game over text
    gameOverText.visible = true;
    gameOverText.setText('GAME OVER\nĐiểm: ' + score + '\nNhấp để bắt đầu lại');
    gameOverText.setOrigin(0.5);
    
    // Check if score is high enough for leaderboard
    checkLeaderboard(score);
}

// Check if score qualifies for leaderboard
async function checkLeaderboard(playerScore) {
    try {
        // Pause game input temporarily while checking the score
        if (gameScene && gameScene.input) {
            gameScene.input.keyboard.enabled = false;
        }
        
        // Show leaderboard form if score is above 0 (in a real game, you might want to check if it's in the top 10)
        if (playerScore > 0) {
            showLeaderboardForm(playerScore);
        }
    } catch (error) {
        console.error('Error checking leaderboard:', error);
    }
}

// Show the leaderboard form
function showLeaderboardForm(playerScore) {
    // Set the score in the form
    document.getElementById('finalScore').textContent = playerScore;
    
    // Show the form
    document.getElementById('leaderboardForm').style.display = 'block';
    
    // Create a separate event listener for the form submission
    // Remove any existing listeners first to prevent duplicates
    const form = document.getElementById('playerInfoForm');
    form.removeEventListener('submit', handleFormSubmit);
    form.addEventListener('submit', handleFormSubmit);
    
    // Disable the game's click event handlers while the form is active
    if (gameScene && gameScene.input) {
        gameScene.input.mouse.enabled = false;
        gameScene.input.keyboard.enabled = false;
    }
}

// Separate function for form handling
function handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    const playerScore = parseInt(document.getElementById('finalScore').textContent);
    submitScore(playerScore);
    return false;
}

// Submit score to leaderboard
async function submitScore(playerScore) {
    const initials = document.getElementById('initials').value.toUpperCase();
    const email = document.getElementById('email').value;
    
    console.log('Attempting to submit score:', {
        'Tên': initials,
        'Email': email,
        'Điểm': playerScore
    });
    
    try {
        if (!supabase) {
            console.log('Supabase client not initialized, initializing now...');
            initSupabase();
        }
        
        // Insert the score into the leaderboard table
        console.log('Sending data to Supabase table: Bảng Xếp Hạng');
        const { data, error } = await supabase
            .from('Bảng Xếp Hạng')
            .insert([
                { 
                    'Tên': initials,
                    'Email': email,
                    'Điểm': playerScore
                }
            ]);
            
        if (error) {
            console.error('Error submitting score:', error);
            console.error('Error details:', JSON.stringify(error));
            alert('There was an error submitting your score: ' + error.message);
        } else {
            console.log('Score submitted successfully, response:', data);
            
            // Fetch and display top 10 leaderboard
            fetchAndDisplayLeaderboard();
        }
    } catch (error) {
        console.error('Exception during score submission:', error);
        alert('There was an error submitting your score. Please try again.');
    }
}

// Fetch and display the top 10 leaderboard entries
async function fetchAndDisplayLeaderboard() {
    try {
        if (!supabase) {
            initSupabase();
        }
        
        // Get top 10 scores from the leaderboard table
        const { data, error } = await supabase
            .from('Bảng Xếp Hạng')
            .select('Tên, Điểm')
            .order('Điểm', { ascending: false })
            .limit(10);
            
        if (error) {
            console.error('Error fetching leaderboard:', error);
            alert('Could not retrieve leaderboard data.');
            
            // Hide form and restart game even if there's an error
            document.getElementById('leaderboardForm').style.display = 'none';
            restartGame(gameScene);
            return;
        }
        
        // Display the leaderboard
        displayLeaderboard(data);
        
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        alert('Could not retrieve leaderboard data.');
        
        // Hide form and restart game even if there's an error
        document.getElementById('leaderboardForm').style.display = 'none';
        restartGame(gameScene);
    }
}

// Display the leaderboard data in the form
function displayLeaderboard(leaderboardData) {
    // Get the form element
    const form = document.getElementById('leaderboardForm');
    
    // Clear current content but save the final score display
    const finalScore = document.getElementById('finalScore').textContent;
    
    // Update the form with leaderboard content
    form.innerHTML = `
        <h2>Bảng Xếp Hạng Top 10</h2>
        <p>Điểm của bạn: ${finalScore}</p>
        <div class="leaderboard-table">
            <table style="width:100%; border-collapse: collapse; color: white; margin-top: 10px;">
                <tr style="background-color: rgba(0,0,0,0.5);">
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Hạng</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Người chơi</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">Điểm</th>
                </tr>
                ${leaderboardData.map((entry, index) => `
                    <tr ${parseInt(finalScore) === entry['Điểm'] ? 'style="background-color: rgba(76, 175, 80, 0.3);"' : ''}>
                        <td style="padding: 8px; text-align: left; border-bottom: 1px solid #555;">${index + 1}</td>
                        <td style="padding: 8px; text-align: left; border-bottom: 1px solid #555;">${entry['Tên']}</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #555;">${entry['Điểm']}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
        <button id="closeLeaderboard" style="margin-top: 15px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Chơi Lại
        </button>
    `;
    
    // Add event listener to the close button
    document.getElementById('closeLeaderboard').addEventListener('click', function() {
        // Hide the leaderboard
        form.style.display = 'none';
        
        // Re-enable game inputs
        if (gameScene && gameScene.input) {
            gameScene.input.mouse.enabled = true;
            gameScene.input.keyboard.enabled = true;
        }
        
        // Restart the game
        restartGame(gameScene);
    });
}

// Spawn a boss at a random position
function spawnBoss(scene, stage) {
    const boss = bosses.get();
    
    if (boss) {
        boss.setActive(true);
        boss.setVisible(true);
        boss.setScale(1.0);
        
        // Set boss starting position
        const side = Phaser.Math.Between(0, 3);
        let x, y;
        
        switch (side) {
            case 0: // top
                x = Phaser.Math.Between(0, config.width);
                y = 0;
                break;
            case 1: // right
                x = config.width;
                y = Phaser.Math.Between(0, config.height);
                break;
            case 2: // bottom
                x = Phaser.Math.Between(0, config.width);
                y = config.height;
                break;
            case 3: // left
                x = 0;
                y = Phaser.Math.Between(0, config.height);
                break;
        }
        
        boss.setPosition(x, y);
        
        // Scale boss health based on stage (starts at 1000, increases by 500 each stage after first)
        boss.maxHealth = monsterHealth.boss + (Math.max(0, stage - 1) * 500);
        boss.health = boss.maxHealth;
        boss.lastFiredTime = 0;
        boss.stage = stage;
        
        // Boss looks at player
        const angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y);
        boss.rotation = angle;
        
        console.log('Boss spawned at:', x, y, 'with health:', boss.health, 'stage:', stage);
        
        // Add health bar for boss
        boss.healthBar = scene.add.rectangle(
            boss.x, 
            boss.y - 50, 
            100, 
            10, 
            0x00ff00
        );
        
        // Update health bar position when boss moves
        scene.time.addEvent({
            delay: 100,
            callback: function() {
                if (boss.active) {
                    boss.healthBar.x = boss.x;
                    boss.healthBar.y = boss.y - 50;
                    
                    // Update health bar width based on remaining health
                    const healthPercentage = boss.health / boss.maxHealth;
                    boss.healthBar.width = 100 * healthPercentage;
                    
                    // Change color based on health
                    if (healthPercentage > 0.6) {
                        boss.healthBar.fillColor = 0x00ff00; // Green
                    } else if (healthPercentage > 0.3) {
                        boss.healthBar.fillColor = 0xffff00; // Yellow
                    } else {
                        boss.healthBar.fillColor = 0xff0000; // Red
                    }
                }
            },
            callbackScope: scene,
            repeat: -1
        });
    }
}

// Boss shoots a barrage of bullets in multiple directions
function fireBossBarrage(boss, scene) {
    const currentTime = scene.time.now;
    
    // Check if enough time has passed since last barrage
    if (!boss.lastFiredTime || currentTime - boss.lastFiredTime >= 3000) {
        // Fire a barrage of bullets in multiple directions
        const bulletCount = 10; // 10 times more bullets than normal monsters
        const angleStep = (Math.PI * 2) / bulletCount;
        
        for (let i = 0; i < bulletCount; i++) {
            const zombieBullet = zombieBullets.get();
            
            if (zombieBullet) {
                zombieBullet.setActive(true);
                zombieBullet.setVisible(true);
                zombieBullet.setScale(0.6); // Slightly larger bullets
                zombieBullet.setPosition(boss.x, boss.y);
                zombieBullet.setTint(0xff0000); // Red tint for boss bullets
                
                // Calculate bullet direction (circular spread)
                const angle = i * angleStep;
                scene.physics.velocityFromRotation(angle, bossBulletSpeed, zombieBullet.body.velocity);
                
                // Make the bullet face in its movement direction
                zombieBullet.rotation = angle + Math.PI/2;
                
                // Destroy bullet after it leaves the screen
                zombieBullet.setCollideWorldBounds(true);
                zombieBullet.body.onWorldBounds = true;
                
                scene.physics.world.on('worldbounds', function(body) {
                    if (body.gameObject === zombieBullet) {
                        zombieBullet.setActive(false);
                        zombieBullet.setVisible(false);
                    }
                });
            }
        }
        
        // Update boss's last fired time
        boss.lastFiredTime = currentTime;
    }
}

// Handle bullet hitting boss
function bulletHitBoss(bullet, boss) {
    // Apply damage to boss only if it's active
    if (boss.active) {
        boss.health -= bullet.damage;
        
        // Check if boss is defeated
        if (boss.health <= 0) {
            boss.setActive(false);
            boss.setVisible(false);
            
            // Destroy health bar
            if (boss.healthBar) {
                boss.healthBar.destroy();
            }
            
            // Increase score (boss gives 20 points)
            score += 20;
            scoreText.setText('Điểm: ' + score);
            
            // Display boss defeated message
            const bossDefeatText = boss.scene.add.text(
                boss.x, 
                boss.y, 
                'BOSS BỊ TIÊU DIỆT!\n+20 ĐIỂM', 
                { fontSize: '24px', fill: '#ff0', align: 'center' }
            );
            bossDefeatText.setOrigin(0.5);
            
            // Fade out and remove message
            boss.scene.tweens.add({
                targets: bossDefeatText,
                alpha: 0,
                y: boss.y - 50,
                duration: 2000,
                onComplete: function() {
                    bossDefeatText.destroy();
                }
            });
        }
    }
    
    // Hide the bullet
    bullet.setActive(false);
    bullet.setVisible(false);
}

// Move boss towards player
function moveBossTowardsPlayer(boss, scene) {
    // Calculate angle between boss and player
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y);
    
    // Make boss face player
    boss.rotation = angle;
    
    // Bosses move a bit slower than regular zombies
    scene.physics.velocityFromRotation(angle, zombieSpeed * 0.7, boss.body.velocity);
}

// Spawn a random item (AK47 or Shotgun)
function spawnRandomItem(scene) {
    const item = items.get();
    
    if (item) {
        // Randomly choose between AK47 and Shotgun
        const itemType = Phaser.Math.Between(0, 1) === 0 ? 'ak47' : 'shotgun';
        
        item.setTexture(itemType);
        item.setActive(true);
        item.setVisible(true);
        item.setScale(0.7);
        
        // Random position on the map (not too close to the edge)
        const x = Phaser.Math.Between(100, config.width - 100);
        const y = Phaser.Math.Between(100, config.height - 100);
        
        item.setPosition(x, y);
        item.type = itemType;
        
        console.log(itemType + ' spawned at:', x, y);
        
        // Make the item "float" by adding a tween
        scene.tweens.add({
            targets: item,
            y: y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Items disappear after 15 seconds if not collected
        scene.time.delayedCall(15000, function() {
            if (item.active) {
                item.setActive(false);
                item.setVisible(false);
            }
        });
    }
}

// Player collects an item
function playerCollectItem(player, item) {
    // Set current weapon to the item type
    currentWeapon = item.type;
    
    // Set weapon duration
    weaponTimeRemaining = weaponDuration;
    
    // Update weapon text
    weaponText.setText('Vũ khí: ' + currentWeapon.toUpperCase() + ' (' + Math.ceil(weaponTimeRemaining / 1000) + 's)');
    
    console.log('Player collected ' + item.type);
    
    // Remove the item
    item.setActive(false);
    item.setVisible(false);
}

// Increase difficulty level
function increaseDifficulty(scene) {
    difficultyLevel++;
    difficultyText.setText('Độ khó: ' + difficultyLevel);
    
    // Reduce spawn interval with each difficulty level
    zombieSpawnInterval = Math.max(500, 3000 - (difficultyLevel * 200));
    
    console.log('Độ khó tăng lên ' + difficultyLevel + 
                ', Spawn interval: ' + zombieSpawnInterval + 'ms');
    
    // Display notification
    const levelText = scene.add.text(
        config.width / 2, 
        config.height / 2, 
        'CẤP ĐỘ ' + difficultyLevel, 
        { fontSize: '64px', fill: '#ff0' }
    );
    levelText.setOrigin(0.5);
    
    // Fade out
    scene.tweens.add({
        targets: levelText,
        alpha: 0,
        duration: 2000,
        onComplete: function() {
            levelText.destroy();
        }
    });
}

// Restart the game
function restartGame(scene) {
    // Hide leaderboard form if it's open
    document.getElementById('leaderboardForm').style.display = 'none';
    
    // Reset variables
    score = 0;
    difficultyLevel = 1;
    bossStage = 0; // Reset boss stage
    gameOver = false;
    zombieSpawnInterval = 3000;
    weaponTimeRemaining = 0;
    currentWeapon = 'default';
    isMouseDown = false; // Reset mouse state
    
    // Hide game over text
    gameOverText.visible = false;
    
    // Update UI
    scoreText.setText('Điểm: 0');
    difficultyText.setText('Độ khó: 1');
    weaponText.setText('Vũ khí: Mặc định');
    
    // Reset player position
    player.setPosition(config.width / 2, config.height / 2);
    
    // Clear all entities
    zombies.clear(true, true);
    zombieBullets.clear(true, true);
    bullets.clear(true, true);
    bosses.clear(true, true);
    items.clear(true, true);
    
    // Remove all boss health bars
    bosses.getChildren().forEach(function(boss) {
        if (boss.healthBar) {
            boss.healthBar.destroy();
        }
    });
    
    // Resume physics
    scene.physics.resume();
} 