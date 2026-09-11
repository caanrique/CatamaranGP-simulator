// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE CONTROLES
// Versión simplificada y robusta
// ============================================

// Estado de input global
const InputState = {
    turnLeft: false,
    turnRight: false,
    sailUp: false,
    sailDown: false,
    joystickX: 0,
    joystickY: 0
};

// Controles de teclado
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') InputState.turnLeft = true;
    if (e.key === 'ArrowRight') InputState.turnRight = true;
    if (e.key === 'ArrowUp') InputState.sailUp = true;
    if (e.key === 'ArrowDown') InputState.sailDown = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') InputState.turnLeft = false;
    if (e.key === 'ArrowRight') InputState.turnRight = false;
    if (e.key === 'ArrowUp') InputState.sailUp = false;
    if (e.key === 'ArrowDown') InputState.sailDown = false;
});

// Controles táctiles
window.addEventListener('load', () => {
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    
    dpadButtons.forEach(btn => {
        const action = btn.dataset.action;
        
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('active');
            setAction(action, true);
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setAction(action, false);
        });
        
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setAction(action, false);
        });
    });
});

function setAction(action, isActive) {
    if (action === 'turn_left') InputState.turnLeft = isActive;
    if (action === 'turn_right') InputState.turnRight = isActive;
    if (action === 'sail_up') InputState.sailUp = isActive;
    if (action === 'sail_down') InputState.sailDown = isActive;
}

// Función que main.js necesita
function getInput() {
    return {
        turnLeft: InputState.turnLeft,
        turnRight: InputState.turnRight,
        sailUp: InputState.sailUp,
        sailDown: InputState.sailDown,
        joystickX: InputState.joystickX,
        joystickY: InputState.joystickY
    };
}
