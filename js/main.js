// ============================================
// CATAMARANGP SIMULATOR - MÓDULO PRINCIPAL
// VERSIÓN DE DEBUG - Etapa 3
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

console.log('✓ main.js cargado correctamente');
console.log('✓ Canvas encontrado:', canvas);
console.log('✓ Contexto 2D:', ctx);

let gameState = {
    running: true,
    lastTime: 0,
    frameCount: 0
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log('Canvas redimensionado:', canvas.width, 'x', canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

let prevDpad = {
    up: false,
    down: false,
    left: false,
    right: false
};
let prevKeys = {
    key1: false,
    key2: false,
    key3: false,
    key4: false
};

function handleInput() {
    if (wingSelectorVisible) {
        handleWingSelectorInput();
        updatePrevInput();
        return;
    }
    
    const input = getInput();
    
    // Selección de tripulante con Dpad
    if (input.dpadUp && !prevDpad.up) {
        CrewState.activeRole = CREW_ROLES.HELMSMAN;
        console.log('Seleccionado: Timonel');
    }
    if (input.dpadRight && !prevDpad.right) {
        CrewState.activeRole = CREW_ROLES.WING_TRIMMER;
        console.log('Seleccionado: Wing Trimmer');
    }
    if (input.dpadDown && !prevDpad.down) {
        CrewState.activeRole = CREW_ROLES.GRINDER_2;
        console.log('Seleccionado: Grinder 2');
    }
    if (input.dpadLeft && !prevDpad.left) {
        CrewState.activeRole = CREW_ROLES.GRINDER_1;
        console.log('Seleccionado: Grinder 1');
    }
    
    // Selección directa con teclas numéricas
    if (input.key1 && !prevKeys.key1) CrewState.activeRole = CREW_ROLES.HELMSMAN;
    if (input.key2 && !prevKeys.key2) CrewState.activeRole = CREW_ROLES.WING_TRIMMER;
    if (input.key3 && !prevKeys.key3) CrewState.activeRole = CREW_ROLES.GRINDER_1;
    if (input.key4 && !prevKeys.key4) CrewState.activeRole = CREW_ROLES.GRINDER_2;
    
    executeCrewAction(input.joystickX, input.joystickY);
    
    prevDpad = {
        up: input.dpadUp,
        down: input.dpadDown,
        left: input.dpadLeft,
        right: input.dpadRight
    };
    prevKeys = {
        key1: input.key1,
        key2: input.key2,
        key3: input.key3,
        key4: input.key4
    };
}

function render() {
    console.log('Render frame:', gameState.frameCount);
    
    if (wingSelectorVisible) {
        console.log('Renderizando selector de ala');
        renderWingSelector();
        return;
    }
    
    try {
        ctx.fillStyle = '#1a5276';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.log('✓ Fondo dibujado');

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        drawWindCompass(centerX, 80);
        console.log('✓ Brújula dibujada');
        
        drawBoat(centerX, centerY);
        console.log('✓ Barco dibujado');
        
        drawHUD();
        console.log('✓ HUD dibujado');
    } catch (error) {
        console.error('❌ ERROR en render():', error);
        console.error('Stack:', error.stack);
    }
}

function drawWindCompass(x, y) {
    const apparentWind = calculateApparentWind();
    
    ctx.save();
    ctx.translate(x, y);
    
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -45);
    ctx.fillText('S', 0, 45);
    ctx.fillText('E', 45, 0);
    ctx.fillText('O', -45, 0);

    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(-3, -42);
    ctx.lineTo(3, -42);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();

    const trueWindRad = degToRad(CONFIG.trueWindDirection + 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(trueWindRad) * 35, Math.sin(trueWindRad) * 35);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(Math.cos(trueWindRad) * 35, Math.sin(trueWindRad) * 35, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3498db';
    ctx.fill();

    const appWindRad = degToRad(apparentWind.angle + 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(appWindRad) * 30, Math.sin(appWindRad) * 30);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(Math.cos(appWindRad) * 30, Math.sin(appWindRad) * 30, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    const legendY = y + 70;
    
    ctx.fillStyle = '#3498db';
    ctx.fillText('● Viento REAL (absoluto)', x, legendY);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('● Viento APARENTE (relativo)', x, legendY + 18);
    
    ctx.fillStyle = 'white';
    ctx.font = '11px Arial';
    ctx.fillText(`Real: ${CONFIG.trueWindSpeed} kn desde ${CONFIG.trueWindDirection}°`, x, legendY + 38);
    ctx.fillText(`Aparente: ${apparentWind.speed.toFixed(1)} kn @ ${Math.round(apparentWind.angle)}°`, x, legendY + 53);
}

function drawBoat(x, y) {
    try {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(degToRad(CONFIG.boatHeading - 90));

        // Casco izquierdo
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(-20, -35);
        ctx.lineTo(-12, -30);
        ctx.lineTo(-12, 25);
        ctx.lineTo(-20, 20);
        ctx.closePath();
        ctx.fill();

        // Casco derecho
        ctx.beginPath();
        ctx.moveTo(20, -35);
        ctx.lineTo(12, -30);
        ctx.lineTo(12, 25);
        ctx.lineTo(20, 20);
        ctx.closePath();
        ctx.fill();

        // Vigas
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(-20, -15, 40, 4);
        ctx.fillRect(-20, 10, 40, 4);

        // Plataforma central
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(-10, -10, 20, 20);

        // Flecha de proa
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(-5, -38);
        ctx.lineTo(5, -38);
        ctx.closePath();
        ctx.fill();

        // Ala mayor
        ctx.save();
        ctx.rotate(degToRad(CONFIG.sailTrim));
        
        const wingColors = {
            light: '#2ecc71',
            medium: '#f39c12',
            strong: '#e74c3c'
        };
        ctx.fillStyle = wingColors[CONFIG.currentWing];
        
        const wingSizes = {
            light: 60,
            medium: 50,
            strong: 40
        };
        const wingHeight = wingSizes[CONFIG.currentWing];
        
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, wingHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -wingHeight/2);
        ctx.lineTo(0, wingHeight/2);
        ctx.stroke();
        
        ctx.restore();
        ctx.restore();
    } catch (error) {
        console.error('❌ ERROR en drawBoat():', error);
        console.error('Stack:', error.stack);
    }
}

function drawHUD() {
    try {
        const crewInfo = getActiveCrewInfo();
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        
        const y = canvas.height - 180;
        ctx.fillText(`Velocidad: ${CONFIG.boatSpeed.toFixed(1)} nudos`, 20, y);
        ctx.fillText(`Rumbo: ${Math.round(CONFIG.boatHeading)}°`, 20, y + 25);
        ctx.fillText(`Trim del ala: ${CONFIG.sailTrim}°`, 20, y + 50);
        ctx.fillText(`Viento real: ${CONFIG.trueWindSpeed} kn desde ${CONFIG.trueWindDirection}°`, 20, y + 75);
        
        const polar = getCurrentPolar();
        ctx.fillStyle = '#f39c12';
        ctx.fillText(`Ala: ${polar.name}`, 20, y + 100);
        
        ctx.fillStyle = crewInfo.color;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`▶ ${crewInfo.name}`, 20, y + 130);
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(`Función: ${crewInfo.function}`, 40, y + 150);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Dpad: seleccionar tripulante | Joystick: ejecutar función', 20, y + 175);
        ctx.fillText('PC: Teclas 1-4 seleccionar | Flechas también funcionan', 20, y + 190);
    } catch (error) {
        console.error('❌ ERROR en drawHUD():', error);
        console.error('Stack:', error.stack);
    }
}

function gameLoop(timestamp) {
    if (!gameState.running) return;

    try {
        handleInput();
        
        if (!wingSelectorVisible) {
            updateBoatSpeed();
        }
        
        render();

        gameState.frameCount++;
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('❌ ERROR en gameLoop():', error);
        console.error('Stack:', error.stack);
    }
}

canvas.addEventListener('click', (e) => {
    if (wingSelectorVisible) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleWingSelectorTap(x, y);
    }
});

canvas.addEventListener('touchstart', (e) => {
    if (wingSelectorVisible) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleWingSelectorTap(x, y);
    }
});

window.addEventListener('load', () => {
    console.log('✓ CatamaranGP Simulator - Etapa 3 cargado');
    console.log('✓ Mostrando selector de ala');
    showWingSelector();
    requestAnimationFrame(gameLoop);
});
