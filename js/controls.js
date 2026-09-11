// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE CONTROLES
// Etapa 3: Dpad como selector de tripulantes
// ============================================

// --- ESTADO DE INPUT ---
const InputState = {
    // Dpad (ahora para seleccionar tripulantes)
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    
    // Joystick (ahora para ejecutar funciones)
    joystickX: 0,  // -1 a 1
    joystickY: 0,  // -1 a 1
    
    // Teclas numéricas para selección directa (PC)
    key1: false,
    key2: false,
    key3: false,
    key4: false
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
    // Flechas del teclado → Dpad
    InputState.dpadUp = keys['ArrowUp'] || false;
    InputState.dpadDown = keys['ArrowDown'] || false;
    InputState.dpadLeft = keys['ArrowLeft'] || false;
    InputState.dpadRight = keys['ArrowRight'] || false;
    
    // Teclas numéricas para selección directa
    InputState.key1 = keys['1'] || false;
    InputState.key2 = keys['2'] || false;
    InputState.key3 = keys['3'] || false;
    InputState.key4 = keys['4'] || false;
}

// --- CONTROLES TÁCTILES ---
if (isTouchDevice) {
    setupTouchControls();
}

function setupTouchControls() {
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    
    dpadButtons.forEach(btn => {
        const action = btn.dataset.action;
        
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('active');
            setDpadAction(action, true);
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setDpadAction(action, false);
        });
        
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setDpadAction(action, false);
        });
    });
    
    setupJoystick();
}

function setDpadAction(action, isActive) {
    switch(action) {
        case 'turn_left':
            InputState.dpadLeft = isActive;
            break;
        case 'turn_right':
            InputState.dpadRight = isActive;
            break;
        case 'sail_up':
            InputState.dpadUp = isActive;
            break;
        case 'sail_down':
            InputState.dpadDown = isActive;
            break;
    }
}

// --- JOYSTICK ---
function setupJoystick() {
    const joystick = document.querySelector('.joystick');
    const handle = document.getElementById('joystickHandle');
    let isDragging = false;
    let startX, startY;
    
    const maxDistance = 45;
    
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
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        handle.style.left = (45 + deltaX) + 'px';
        handle.style.top = (45 + deltaY) + 'px';
        
        InputState.joystickX = deltaX / maxDistance;
        InputState.joystickY = -deltaY / maxDistance;
    });
    
    window.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        isDragging = false;
        
        handle.style.left = '45px';
        handle.style.top = '45px';
        
        InputState.joystickX = 0;
        InputState.joystickY = 0;
    });
}

// --- FUNCIÓN PARA OBTENER INPUT UNIFICADO ---
function getInput() {
    return {
        dpadUp: InputState.dpadUp,
        dpadDown: InputState.dpadDown,
        dpadLeft: InputState.dpadLeft,
        dpadRight: InputState.dpadRight,
        joystickX: InputState.joystickX,
        joystickY: InputState.joystickY,
        key1: InputState.key1,
        key2: InputState.key2,
        key3: InputState.key3,
        key4: InputState.key4
    };
}
