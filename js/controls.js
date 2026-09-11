// ============================================
// SAILGP SIMULATOR - MÓDULO DE CONTROLES
// Soporte para teclado, táctil y gamepad
// ============================================

// --- ESTADO DE INPUT ---
const InputState = {
    turnLeft: false,
    turnRight: false,
    sailUp: false,
    sailDown: false,
    joystickX: 0,  // -1 a 1 (izquierda a derecha)
    joystickY: 0   // -1 a 1 (abajo a arriba)
};

// --- DETECCIÓN DE DISPOSITIVO TÁCTIL ---
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// --- CONTROLES DE TECLADO ---
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    updateInputFromKeys();
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    updateInputFromKeys();
});

function updateInputFromKeys() {
    // Flechas del teclado
    InputState.turnLeft = keys['ArrowLeft'] || false;
    InputState.turnRight = keys['ArrowRight'] || false;
    InputState.sailUp = keys['ArrowUp'] || false;
    InputState.sailDown = keys['ArrowDown'] || false;
}

// --- CONTROLES TÁCTILES ---
if (isTouchDevice) {
    setupTouchControls();
}

function setupTouchControls() {
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    
    dpadButtons.forEach(btn => {
        const action = btn.dataset.action;
        
        // Touch start
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('active');
            setTouchAction(action, true);
        });
        
        // Touch end
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setTouchAction(action, false);
        });
        
        // Touch cancel
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setTouchAction(action, false);
        });
    });
    
    // Joystick (por ahora solo visual, lo implementaremos en Etapa 3)
    setupJoystick();
}

function setTouchAction(action, isActive) {
    switch(action) {
        case 'turn_left':
            InputState.turnLeft = isActive;
            break;
        case 'turn_right':
            InputState.turnRight = isActive;
            break;
        case 'sail_up':
            InputState.sailUp = isActive;
            break;
        case 'sail_down':
            InputState.sailDown = isActive;
            break;
    }
}

// --- JOYSTICK (Implementación básica, se mejorará en Etapa 3) ---
function setupJoystick() {
    const joystick = document.querySelector('.joystick');
    const handle = document.getElementById('joystickHandle');
    let isDragging = false;
    let startX, startY;
    
    const maxDistance = 45; // Radio máximo del joystick
    
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        const touch = e.touches[0];
        const rect = joystick.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
    });
    
    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        let deltaX = touch.clientX - startX;
        let deltaY = touch.clientY - startY;
        
        // Limitar al radio máximo
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        // Actualizar posición visual del handle
        handle.style.left = (45 + deltaX) + 'px';
        handle.style.top = (45 + deltaY) + 'px';
        
        // Normalizar a -1 hasta 1
        InputState.joystickX = deltaX / maxDistance;
        InputState.joystickY = -deltaY / maxDistance; // Invertir Y
    });
    
    window.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        isDragging = false;
        
        // Resetear posición del handle
        handle.style.left = '45px';
        handle.style.top = '45px';
        
        // Resetear valores
        InputState.joystickX = 0;
        InputState.joystickY = 0;
    });
}

// --- FUNCIÓN PARA OBTENER INPUT UNIFICADO ---
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
