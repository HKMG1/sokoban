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

// Draw the level
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
	    ctx.drawImage(images.ground, x * tileSize, y * tileSize, tileSize, tileSize); // Ground

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

    ctx.drawImage(images[`player_${player.direction}`], player.x * tileSize, player.y * tileSize, tileSize, tileSize); // Player
}

// Reset the level
function resetLevel() {
    moveHistory = [];
    const currentLevel = levels[currentLevelIndex];
    player = { ...currentLevel.playerStart, direction: currentLevel.playerDirection };
    level = currentLevel.layout.map(row => [...row]); // Deep copy
    targetNum = countOccurrences(level, 2);
    canvas.width = level[0].length * tileSize;
    canvas.height = level.length * tileSize;
    draw();
}

// Count the number of targets with no box
function countOccurrences(array, element) {
    return array.flat().reduce((count, current) => {
        return current === element ? count + 1 : count;
    }, 0);
}

// Check if a position is box
function isBox(x, y) {
    return (level[y][x] === 3 || level[y][x] === 4);
}

// Check if a position is wall
function isWall(x, y) {
    return (level[y][x] === 1);
}

// Check win condition
function isLevelWin() {
    return (targetNum === 0); // all target on box
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
        draw();
    }
}

// Validate if the player can move to the new position
function canMoveTo(newX, newY) {
    if (newY < 0 || newY >= level.length || newX < 0 || newX >= level[newY].length || isWall(newX, newY)) return false; // [>player|boundary]->cancel, [>player|wall]->cancel

    if (isBox(newX, newY)) {
        const boxNewX = newX + (newX - player.x);
        const boxNewY = newY + (newY - player.y);
        if (boxNewY < 0 || boxNewY >= level.length || boxNewX < 0 || boxNewX >= level[boxNewY].length || isWall(boxNewX, boxNewY) || isBox(boxNewX, boxNewY)) return false; // [>box|boundary]->cancel, [>box|wall]->cancel, [>box|box]->cancel
    }

    return true;
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {   
    let deltaX = 0, deltaY = 0;

    switch (event.key) {
        case 'ArrowUp': 
      	case 'w': 
	    deltaY = -1; 
	    player.direction = 'up';
	    break;
        case 'ArrowDown':
	case 's':
	    deltaY = 1;
	    player.direction = 'down';
	    break;
        case 'ArrowLeft':
	case 'a':
	    deltaX = -1;
	    player.direction = 'left';
	    break;
        case 'ArrowRight':
	case 'd':
	    deltaX = 1;
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

    newX = player.x + deltaX;
    newY = player.y + deltaY;

    if (canMoveTo(newX, newY)) {
        saveState();

 	// Move boxes if necessary
	if (isBox(newX, newY)) {
            const boxNewX = newX + deltaX; 
            const boxNewY = newY + deltaY;

            if (level[newY][newX] === 4) {
		level[newY][newX] = 2;
		targetNum++;
	    } else level[newY][newX] = 0;

	    if (level[boxNewY][boxNewX] === 2) {
		level[boxNewY][boxNewX] = 4;
		targetNum--;
	    } else level[boxNewY][boxNewX] = 3;
	}

	player.x = newX;
    	player.y = newY;

        draw();

        if (isLevelWin()) {
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