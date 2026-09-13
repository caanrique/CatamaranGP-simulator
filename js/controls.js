// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE CONTROLES
// Etapa 3.5.2: Dpad para selección y movimiento entre cascos
// ============================================

// --- ESTADO DE INPUT ---
const InputState = {
    // Dpad (ahora para seleccionar y mover jugadores)
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    
    // Joystick WASD (para ejecutar funciones del jugador activo)
    joystickX: 0,  // -1 a 1 (A/D)
    joystickY: 0,  // -1 a 1 (W/S)
    
    // Toggle del jib (tecla J)
    toggleJib: false,
    
    // Teclas numéricas para selección directa (PC)
    key1: false,
    key2: false,
    key3: false,
    key4: false,  // ← COMA AÑADIDA AQUÍ
    
    // Cámara (joystick derecho)
    cameraX: 0,   // -1 a 1 (órbita horizontal)
    cameraY: 0,    // -1 a 1 (zoom vertical)

        // Cámara (joystick derecho + mouse)
    cameraX: 0,
    cameraY: 0,
    
    // NUEVO: Control de cámara por mouse
    cameraOrbitX: 0,   // Rotación horizontal acumulada
    cameraOrbitY: 0,   // Rotación vertical acumulada (opcional)
    cameraZoom: 0,     // Zoom acumulado
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
    // Detectar si Shift está presionado
    const shiftPressed = keys['Shift'] || false;
    
    // Si Shift está presionado, las flechas controlan la CÁMARA
    if (shiftPressed) {
        // Cámara: flechas controlan orbitación y zoom
        InputState.dpadUp = false;
        InputState.dpadDown = false;
        InputState.dpadLeft = false;
        InputState.dpadRight = false;
        
        let camX = 0;
        let camY = 0;
        
        if (keys['ArrowLeft']) camX = -1;   // Orbitar izquierda
        if (keys['ArrowRight']) camX = 1;   // Orbitar derecha
        if (keys['ArrowUp']) camY = -1;     // Zoom in (acercar)
        if (keys['ArrowDown']) camY = 1;    // Zoom out (alejar)
        
        InputState.cameraX = camX;
        InputState.cameraY = camY;
    } 
    // Si Shift NO está presionado, las flechas controlan el BARCO (normal)
    else {
        InputState.dpadUp = keys['ArrowUp'] || false;
        InputState.dpadDown = keys['ArrowDown'] || false;
        InputState.dpadLeft = keys['ArrowLeft'] || false;
        InputState.dpadRight = keys['ArrowRight'] || false;
        
        // Resetear control de cámara cuando no se usa Shift
        InputState.cameraX = 0;
        InputState.cameraY = 0;
    }
    
    // Teclas numéricas para selección directa
    InputState.key1 = keys['1'] || false;
    InputState.key2 = keys['2'] || false;
    InputState.key3 = keys['3'] || false;
    InputState.key4 = keys['4'] || false;
    
    // WASD como joystick virtual (ejecutar funciones)
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
    // Mostrar los controles táctiles solo si es dispositivo táctil
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

// --- JOYSTICKS ---
function setupJoystick() {
    setupSingleJoystick('joystickLeft', 'joystickHandleLeft', 'left');
    setupSingleJoystick('joystickRight', 'joystickHandleRight', 'right');
}

// --- CONTROL DE CÁMARA POR MOUSE ---
function setupMouseCamera() {
    const canvas = document.getElementById('canvas3d');
    if (!canvas) return;
    
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    // Click izquierdo para empezar a orbitar
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Solo click izquierdo
            InputState.mouseDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });
    
    // Mover mouse mientras se arrastra
    window.addEventListener('mousemove', (e) => {
        if (!InputState.mouseDragging) return;
        
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        // Acumular rotación (más sensible que el joystick)
        InputState.cameraOrbitX += deltaX * 0.005;
        InputState.cameraOrbitY += deltaY * 0.003;
        
        // Limitar rotación vertical para no dar vueltas completas
        InputState.cameraOrbitY = Math.max(-0.5, Math.min(1.2, InputState.cameraOrbitY));
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    
    // Soltar click para dejar de orbitar
    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            InputState.mouseDragging = false;
        }
    });
    
    // Scroll del mouse para zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        InputState.cameraZoom += e.deltaY * 0.02;
        
        // Limitar zoom entre 10 y 80 unidades
        InputState.cameraZoom = Math.max(10, Math.min(80, InputState.cameraZoom));
    }, { passive: false });
}

// Activar automáticamente al cargar
setupMouseCamera();

function setupSingleJoystick(joystickId, handleId, side) {
    const joystick = document.getElementById(joystickId);
    const handle = document.getElementById(handleId);
    if (!joystick || !handle) return;
    
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
        
        if (side === 'left') {
            InputState.joystickX = deltaX / maxDistance;
            InputState.joystickY = -deltaY / maxDistance;
        } else {
            InputState.cameraX = deltaX / maxDistance;
            InputState.cameraY = -deltaY / maxDistance;
        }
    });
    
    window.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        isDragging = false;
        
        handle.style.left = '45px';
        handle.style.top = '45px';
        
        if (side === 'left') {
            InputState.joystickX = 0;
            InputState.joystickY = 0;
        } else {
            InputState.cameraX = 0;
            InputState.cameraY = 0;
        }
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
        toggleJib: InputState.toggleJib,
        key1: InputState.key1,
        key2: InputState.key2,
        key3: InputState.key3,
        key4: InputState.key4,  // ← COMA AÑADIDA AQUÍ
        cameraX: InputState.cameraX,
        cameraY: InputState.cameraY
    };
}