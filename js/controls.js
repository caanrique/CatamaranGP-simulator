// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE CONTROLES
// Versión final: Joysticks invertidos (Izq=Cámara, Der=Acciones) + Mejoras táctiles
// ============================================

// --- ESTADO DE INPUT ---
const InputState = {
    // Dpad (selección y movimiento entre cascos)
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    
    // Joystick derecho (acciones del jugador activo)
    joystickX: 0,  // -1 a 1 (A/D)
    joystickY: 0,  // -1 a 1 (W/S)
    
    // Toggle del jib (tecla J)
    toggleJib: false,
    
    // Teclas numéricas para selección directa (PC)
    key1: false,
    key2: false,
    key3: false,
    key4: false,
    
    // Joystick izquierdo (Cámara)
    cameraX: 0,    // -1 a 1 (órbita horizontal)
    cameraY: 0,    // -1 a 1 (zoom vertical)
    
    // Control de cámara por mouse (PC)
    cameraOrbitX: 0,
    cameraOrbitY: 0,
    cameraZoom: 0,
    mouseDragging: false
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
    const shiftPressed = keys['Shift'] || false;
    
    // Si Shift está presionado, las flechas controlan la CÁMARA
    if (shiftPressed) {
        InputState.dpadUp = false;
        InputState.dpadDown = false;
        InputState.dpadLeft = false;
        InputState.dpadRight = false;
        
        let camX = 0;
        let camY = 0;
        
        if (keys['ArrowLeft']) camX = -1;
        if (keys['ArrowRight']) camX = 1;
        if (keys['ArrowUp']) camY = -1;
        if (keys['ArrowDown']) camY = 1;
        
        InputState.cameraX = camX;
        InputState.cameraY = camY;
    } 
    // Si Shift NO está presionado, las flechas controlan el BARCO
    else {
        InputState.dpadUp = keys['ArrowUp'] || false;
        InputState.dpadDown = keys['ArrowDown'] || false;
        InputState.dpadLeft = keys['ArrowLeft'] || false;
        InputState.dpadRight = keys['ArrowRight'] || false;
        
        InputState.cameraX = 0;
        InputState.cameraY = 0;
    }
    
    // Teclas numéricas
    InputState.key1 = keys['1'] || false;
    InputState.key2 = keys['2'] || false;
    InputState.key3 = keys['3'] || false;
    InputState.key4 = keys['4'] || false;
    
    // WASD como joystick virtual (acciones)
    let joyX = 0;
    let joyY = 0;
    
    if (keys['a'] || keys['A']) joyX = -1;
    if (keys['d'] || keys['D']) joyX = 1;
    if (keys['w'] || keys['W']) joyY = 1;
    if (keys['s'] || keys['S']) joyY = -1;
    
    InputState.joystickX = joyX;
    InputState.joystickY = joyY;
    
    // Tecla J para toggle del jib
    InputState.toggleJib = keys['j'] || keys['J'] || false;
}

// --- CONTROLES TÁCTILES ---
if (isTouchDevice) {
    setupTouchControls();
}

function setupTouchControls() {
    const controlsLayer = document.querySelector('.controls-layer');
    if (controlsLayer) {
        controlsLayer.style.display = 'flex';
    }
    
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    
    dpadButtons.forEach(btn => {
        const action = btn.dataset.action;
        
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('active');
            setDpadAction(action, true);
        }, { passive: false });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setDpadAction(action, false);
        }, { passive: false });
        
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            setDpadAction(action, false);
        }, { passive: false });
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

// --- CONFIGURACIÓN DE JOYSTICKS ---
function setupJoystick() {
    // Izquierdo = Cámara, Derecho = Acciones
    setupSingleJoystick('joystickLeft', 'joystickHandleLeft', 'left');
    setupSingleJoystick('joystickRight', 'joystickHandleRight', 'right');
}

function setupSingleJoystick(joystickId, handleId, side) {
    const joystick = document.getElementById(joystickId);
    const handle = document.getElementById(handleId);
    if (!joystick || !handle) return;
    
    let isDragging = false;
    let startX, startY;
    
    // Calcular distancia máxima y posición inicial dinámicamente según el tamaño real del DOM
    const maxDistance = (joystick.offsetWidth / 2) - (handle.offsetWidth / 2);
    const initialLeft = (joystick.offsetWidth - handle.offsetWidth) / 2;
    const initialTop = (joystick.offsetHeight - handle.offsetHeight) / 2;
    
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        const touch = e.touches[0];
        const rect = joystick.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); // Prevenir scroll de la página
        
        const touch = e.touches[0];
        let deltaX = touch.clientX - startX;
        let deltaY = touch.clientY - startY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        handle.style.left = (initialLeft + deltaX) + 'px';
        handle.style.top = (initialTop + deltaY) + 'px';
        
        // LÓGICA INVERTIDA: Izquierda = Cámara, Derecha = Acciones
        if (side === 'left') {
            InputState.cameraX = deltaX / maxDistance;
            InputState.cameraY = -deltaY / maxDistance;
        } else {
            InputState.joystickX = deltaX / maxDistance;
            InputState.joystickY = -deltaY / maxDistance;
        }
    }, { passive: false });
    
    window.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        handle.style.left = initialLeft + 'px';
        handle.style.top = initialTop + 'px';
        
        if (side === 'left') {
            InputState.cameraX = 0;
            InputState.cameraY = 0;
        } else {
            InputState.joystickX = 0;
            InputState.joystickY = 0;
        }
    });
}

// --- CONTROL DE CÁMARA POR MOUSE (PC) ---
function setupMouseCamera() {
    const canvas = document.getElementById('canvas3d');
    if (!canvas) return;
    
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            InputState.mouseDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!InputState.mouseDragging) return;
        
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        InputState.cameraOrbitX += deltaX * 0.005;
        InputState.cameraOrbitY += deltaY * 0.003;
        InputState.cameraOrbitY = Math.max(-0.5, Math.min(1.2, InputState.cameraOrbitY));
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    
    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            InputState.mouseDragging = false;
        }
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        InputState.cameraZoom += e.deltaY * 0.02;
        InputState.cameraZoom = Math.max(10, Math.min(80, InputState.cameraZoom));
    }, { passive: false });
}

setupMouseCamera();

// --- FUNCIÓN PARA OBTENER INPUT UNIFICADO ---
function getInput() {
    return {
        dpadUp: InputState.dpadUp,
        dpadDown: InputState.dpadDown,
        dpadLeft: InputState.dpadLeft,
        dpadRight: InputState.dpadRight,
        joystickX: InputState.joystickX,
        joystickY: InputState.joystickY,
        toggleJib: InputState.toggleJib,
        key1: InputState.key1,
        key2: InputState.key2,
        key3: InputState.key3,
        key4: InputState.key4,
        cameraX: InputState.cameraX,
        cameraY: InputState.cameraY
    };
}