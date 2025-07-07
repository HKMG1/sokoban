const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tileSize = 64;

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

function loadImages(callback) {
    const spriteNames = ['wall', 'target', 'box', 'box_on_target', 'player_up', 'player_down', 'player_left', 'player_right', 'ground'];
    let loadedImages = 0;
    const totalImages = spriteNames.length;

    spriteNames.forEach(name => {
        images[name] = new Image();
        images[name].src = `images/${name}.png`;
        images[name].onload = () => {
            loadedImages++;
            if (loadedImages === totalImages) {
                callback(images);
            }
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

function resetLevel() {
    moveHistory = [];
    const currentLevel = levels[currentLevelIndex];
    player = { ...currentLevel.playerStart, direction: currentLevel.playerDirection };
    level = currentLevel.layout.map(row => [...row]); // Deep copy to avoid mutation
    boxes = getBoxPositions();

    canvas.width = level[0].length * tileSize;
    canvas.height = level.length * tileSize;
    draw();
}

function getBoxPositions() {
    const boxPositions = [];
    
    for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
            if (level[y][x] === 3 || level[y][x] === 4) {
                boxPositions.push({ x, y });
            }
        }
    }
    return boxPositions;
}

function checkWin() {
    for (let box of boxes) {
        if (level[box.y][box.x] !== 4) return false;
    }
    return true;
}

function saveState() {
    moveHistory.push({
        player: { ...player },
        level: level.map(row => [...row])
    });
}

document.addEventListener('keydown', (event) => {   
    let newX = player.x;
    let newY = player.y;

    if (event.key === 'ArrowUp' || event.key === 'w') {
        newY--;
        player.direction = 'up';
    } else if (event.key === 'ArrowDown' || event.key === 's') {
        newY++;
        player.direction = 'down';
    } else if (event.key === 'ArrowLeft' || event.key === 'a') {
        newX--;
        player.direction = 'left';
    } else if (event.key === 'ArrowRight' || event.key === 'd') {
        newX++;
        player.direction = 'right';
    }

    if (event.key === 'z') {
        undo();
    } else if (event.key === 'r') {
        resetLevel();
    } else if (canMove(newX, newY)) {
        saveState();

	for (let box of boxes) {
	    if (box.x === newX && box.y === newY) {
                const boxNewX = newX + (newX - player.x);
                const boxNewY = newY + (newY - player.y);

                if (level[box.y][box.x] === 4) {
                    level[box.y][box.x] = 2;
                } else {
                    level[box.y][box.x] = 0;
                }

	        if (level[boxNewY][boxNewX] === 2) {
		    level[boxNewY][boxNewX] = 4;
                } else {
		    level[boxNewY][boxNewX] = 3;
	        }

                box.x = boxNewX;
                box.y = boxNewY;

                break;
	    }
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

function canMove(newX, newY) {
    if (newY < 0 || newY >= level.length || newX < 0 || newX >= level[newY].length) {
        return false;
    }

    if (level[newY][newX] === 1) return false;

    for (let box of boxes) {
        if (box.x === newX && box.y === newY) {
            const boxNewX = newX + (newX - player.x);
            const boxNewY = newY + (newY - player.y);

            if (boxNewY < 0 || boxNewY >= level.length || boxNewX < 0 || boxNewX >= level[boxNewY].length) {
                return false;
            }

            if (level[boxNewY][boxNewX] === 1 || boxes.some(b => b.x === boxNewX && b.y === boxNewY)) {
                return false;
            }
        }
    }

    return true;
}

function undo() {
    if (moveHistory.length > 0) {
        const lastState = moveHistory.pop();
        player = lastState.player;
        level = lastState.level; // Restore the level from the last state
	boxes = getBoxPositions();

        draw(); // Redraw the game to reflect the restored state
    }
}

loadImages((loadedImages) => {
    images = loadedImages;
    resetLevel();
});