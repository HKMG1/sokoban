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
let player, boxes, level;
let moveHistory = [];
let images = {};

// Load images
function loadImages(callback) {
    const spriteNames = ['wall', 'target', 'box', 'box_on_target', 'player_up', 'player_down', 'player_left', 'player_right', 'ground'];
    let loadedImages = 0;
    const totalImages = spriteNames.length;

    spriteNames.forEach(name => {
        images[name] = new Image();
        images[name].src = `images/${name}.png`;
        images[name].onload = () => {
            if (++loadedImages === totalImages) callback(images);
        };
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
            ctx.drawImage(images.ground, x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }

    for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
            switch (level[y][x]) {
                case 1: // Wall
                    ctx.drawImage(images.wall, x * tileSize, y * tileSize, tileSize, tileSize);
                    break;
                case 2: // Target
                    ctx.drawImage(images.target, x * tileSize, y * tileSize, tileSize, tileSize);
                    break;
		case 3: // Box
		    ctx.drawImage(images.box, x * tileSize, y * tileSize, tileSize, tileSize);
                    break;
                case 4: // Box on Target
                    ctx.drawImage(images.box_on_target, x * tileSize, y * tileSize, tileSize, tileSize);
                    break;
            }
        }
    }

    // Draw the player based on current direction
    ctx.drawImage(images[`player_${player.direction}`], player.x * tileSize, player.y * tileSize, tileSize, tileSize);
}

// Reset the level
function resetLevel() {
    moveHistory = [];
    const currentLevel = levels[currentLevelIndex];
    player = { ...currentLevel.playerStart, direction: currentLevel.playerDirection };
    level = currentLevel.layout.map(row => [...row]); // Deep copy
    boxes = getBoxPositions();
    canvas.width = level[0].length * tileSize;
    canvas.height = level.length * tileSize;
    draw();
}

// Get current box positions
function getBoxPositions() {
    return level.flatMap((row, y) => row.map((cell, x) => (cell === 3 || cell === 4) ? { x, y } : null)).filter(Boolean);
}

// Check win condition
function checkWin() {
    return boxes.every(box => level[box.y][box.x] === 4);
}

// Save the current game state
function saveState() {
    moveHistory.push({
        player: { ...player },
        level: level.map(row => [...row])
    });
}

// Undo the last move
function undo() {
    if (moveHistory.length > 0) {
        const lastState = moveHistory.pop();
        player = lastState.player;
        level = lastState.level;
	boxes = getBoxPositions();
        draw();
    }
}

// Validate if the player can move to the new position
function canMove(newX, newY) {
    if (newY < 0 || newY >= level.length || newX < 0 || newX >= level[newY].length || level[newY][newX] === 1) return false;

    let boxToMove = boxes.find(box => box.x === newX && box.y === newY);
    if (boxToMove) {
        const boxNewX = newX + (newX - player.x);
        const boxNewY = newY + (newY - player.y);
        if (boxNewY < 0 || boxNewY >= level.length || boxNewX < 0 || boxNewX >= level[boxNewY].length || level[boxNewY][boxNewX] === 1 || boxes.some(box => box.x === boxNewX && box.y === boxNewY)) return false;
    }

    return true;
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {   
    let newX = player.x;
    let newY = player.y;

    switch (event.key) {
        case 'ArrowUp': 
      	case 'w': 
	    newY--; 
	    player.direction = 'up';
	    break;
        case 'ArrowDown':
	case 's':
	    newY++;
	    player.direction = 'down';
	    break;
        case 'ArrowLeft':
	case 'a':
	    newX--;
	    player.direction = 'left';
	    break;
        case 'ArrowRight':
	case 'd':
	    newX++;
	    player.direction = 'right';
	    break;
        case 'z':
	    undo();
	    return;
        case 'r':
	    resetLevel();
	    return;
        default:
	    return;
    }

    if (canMove(newX, newY)) {
        saveState();

 	// Move boxes if necessary
	let boxToMove = boxes.find(box => box.x === newX && box.y === newY);
	if (boxToMove) {
            const boxNewX = newX + (newX - player.x);
            const boxNewY = newY + (newY - player.y);

            level[boxToMove.y][boxToMove.x] = (level[boxToMove.y][boxToMove.x] === 4) ? 2 : 0;
	    level[boxNewY][boxNewX] = (level[boxNewY][boxNewX] === 2) ? 4 : 3;

            boxToMove.x = boxNewX;
            boxToMove.y = boxNewY;
	}
	
	player.x = newX;
        player.y = newY;

        draw();

        if (checkWin()) {
            currentLevelIndex++;
            if (currentLevelIndex < levels.length) {
                resetLevel();
            } else {
                setTimeout(() => {
                    alert("You complete all levels!");
                }, 100);
                currentLevelIndex = 0;
                resetLevel();
            }
        }
    }
});

// Load images and start the game
loadImages(() => {
    resetLevel();
});