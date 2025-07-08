const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tileSize = 64;

// Levels definition
// 0 = Empty, 1 = Wall, 2 = Target, 3 = Box, 4 = Box on Target
const levels = [
    {
        layout: [
            [1, 1, 1, 1, 1, 1],
   	    [1, 0, 2, 1, 1, 1],
   	    [1, 0, 0, 1, 1, 1],
    	    [1, 4, 0, 0, 0, 1],
    	    [1, 0, 0, 3, 0, 1],
    	    [1, 0, 0, 1, 1, 1],
    	    [1, 1, 1, 1, 1, 1]
        ], // Microban 01
        playerStart: { x: 4, y: 3 },
	playerDirection: 'left',
    },
    {
        layout: [
            [1, 1, 1, 1, 1, 1],
   	    [1, 0, 0, 0, 0, 1],
   	    [1, 0, 1, 0, 0, 1],
    	    [1, 0, 3, 4, 0, 1],
    	    [1, 0, 2, 4, 0, 1],
    	    [1, 0, 0, 0, 0, 1],
    	    [1, 1, 1, 1, 1, 1]
        ], // Microban 02
        playerStart: { x: 3, y: 2 },
	playerDirection: 'right',
    }
];

let currentLevelIndex = 0;
let player, level, targetNum;
let moveHistory = [];
let redoHistory = [];
let images = {};

// Load images
function loadImages() {
    const spriteNames = ['wall', 'target', 'box', 'box_on_target', 'player_up', 'player_down', 'player_left', 'player_right', 'ground'];
    const imagePromises = spriteNames.map(name => {
        return new Promise(resolve => {
            const img = new Image();
            img.src = `images/${name}.png`;
            img.onload = () => resolve({ name, img });
        });
    });

    return Promise.all(imagePromises).then(loadedImages => {
        loadedImages.forEach(({ name, img }) => images[name] = img);
    });
}

// Draw the level
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    level.forEach((row, y) => {
        row.forEach((tile, x) => {
            ctx.drawImage(images.ground, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 1) ctx.drawImage(images.wall, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 2) ctx.drawImage(images.target, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 3) ctx.drawImage(images.box, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 4) ctx.drawImage(images.box_on_target, x * tileSize, y * tileSize, tileSize, tileSize);
        });
    });
    ctx.drawImage(images[`player_${player.direction}`], player.x * tileSize, player.y * tileSize, tileSize, tileSize);
}

// Reset the level
function resetLevel() {
    moveHistory = [];
    const currentLevel = levels[currentLevelIndex];
    player = { ...currentLevel.playerStart, direction: currentLevel.playerDirection };
    level = currentLevel.layout.map(row => [...row]);
    targetNum = countOccurrences(level, 2);
    canvas.width = level[0].length * tileSize;
    canvas.height = level.length * tileSize;
    draw();
}

// Count occurrences of a specific element
function countOccurrences(array, element) {
    return array.flat().filter(item => item === element).length;
}

// Check if a position is a box
const isBox = (x, y) => level[y][x] === 3 || level[y][x] === 4;

// Check if a position is a wall
const isWall = (x, y) => level[y][x] === 1;

// Check win condition
const isLevelWin = () => targetNum === 0;

// Save the current game state
function saveState() {
    moveHistory.push({ player: { ...player }, level: level.map(row => [...row]) });
    redoHistory = [];
}

// Undo the last move
function undo() {
    if (moveHistory.length > 0) {
        const lastState = moveHistory.pop();
        redoHistory.push({ player: { ...player }, level: level.map(row => [...row]) });
        player = lastState.player;
        level = lastState.level;
        draw();
    }
}

// Redo the last undone move
function redo() {
    if (redoHistory.length > 0) {
        const redoState = redoHistory.pop();
        moveHistory.push({ player: { ...player }, level: level.map(row => [...row]) });
        player = redoState.player;
        level = redoState.level;
        draw();
    }
}

// Validate if the player can move to the new position
function canMoveTo(newX, newY) {
    if (newY < 0 || newY >= level.length || newX < 0 || newX >= level[newY].length || isWall(newX, newY)) return false;

    if (isBox(newX, newY)) {
        const boxNewX = newX + (newX - player.x);
        const boxNewY = newY + (newY - player.y);
        if (boxNewY < 0 || boxNewY >= level.length || boxNewX < 0 || boxNewX >= level[boxNewY].length || isWall(boxNewX, boxNewY) || isBox(boxNewX, boxNewY)) return false;
    }

    return true;
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    const keyMap = {
        'ArrowUp': { deltaX: 0, deltaY: -1, direction: 'up' },
        'w': { deltaX: 0, deltaY: -1, direction: 'up' },
        'ArrowDown': { deltaX: 0, deltaY: 1, direction: 'down' },
        's': { deltaX: 0, deltaY: 1, direction: 'down' },
        'ArrowLeft': { deltaX: -1, deltaY: 0, direction: 'left' },
        'a': { deltaX: -1, deltaY: 0, direction: 'left' },
        'ArrowRight': { deltaX: 1, deltaY: 0, direction: 'right' },
        'd': { deltaX: 1, deltaY: 0, direction: 'right' },
        'z': { undo: true },
        'c': { redo: true },
        'r': { reset: true }
    };

    const action = keyMap[event.key];
    if (action) {
        if (action.undo) {
            undo();
            return;
        }
        if (action.redo) {
            redo();
            return;
        }
        if (action.reset) {
            resetLevel();
            return;
        }

        const newX = player.x + action.deltaX;
        const newY = player.y + action.deltaY;

        if (canMoveTo(newX, newY)) {
            saveState();
            if (isBox(newX, newY)) {
                const boxNewX = newX + action.deltaX;
                const boxNewY = newY + action.deltaY;

                if (level[newY][newX] === 4) {
                    level[newY][newX] = 2;
                    targetNum++;
                } else {
                    level[newY][newX] = 0;
                }

                if (level[boxNewY][boxNewX] === 2) {
                    level[boxNewY][boxNewX] = 4;
                    targetNum--;
                } else {
                    level[boxNewY][boxNewX] = 3;
                }
            }

            player.x = newX;
            player.y = newY;
            draw();

            if (isLevelWin()) {
                currentLevelIndex++;
                if (currentLevelIndex < levels.length) {
                    resetLevel();
                } else {
                    setTimeout(() => alert("You complete all levels!"), 100);
                    currentLevelIndex = 0;
                    resetLevel();
                }
            }
        }
    }
});

// Load images and start the game
loadImages().then(resetLevel);