// ============================================
// SAILGP SIMULATOR - MÓDULO PRINCIPAL
// Etapa 1: Loop de juego y renderizado básico
// ============================================

// --- REFERENCIAS AL CANVAS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- ESTADO DEL JUEGO ---
let gameState = {
    running: true,
    lastTime: 0,
    frameCount: 0
};

// --- AJUSTAR CANVAS AL TAMAÑO DE PANTALLA ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- CONTROLES DE TECLADO ---
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// --- CONTROLES UNIFICADOS ---
function handleInput() {
    const input = getInput();
    
    // Rumbo (Dpad izquierdo o joystick X)
    const turnSpeed = 2;
    if (input.turnLeft || input.joystickX < -0.3) {
        CONFIG.boatHeading = normalizeAngle(CONFIG.boatHeading - turnSpeed);
    }
    if (input.turnRight || input.joystickX > 0.3) {
        CONFIG.boatHeading = normalizeAngle(CONFIG.boatHeading + turnSpeed);
    }
    
    // Trim del ala (Dpad arriba/abajo o joystick Y)
    const trimSpeed = 1;
    if (input.sailUp || input.joystickY > 0.3) {
        CONFIG.sailTrim = Math.min(90, CONFIG.sailTrim + trimSpeed);
    }
    if (input.sailDown || input.joystickY < -0.3) {
        CONFIG.sailTrim = Math.max(0, CONFIG.sailTrim - trimSpeed);
    }
}


// --- RENDERIZADO ---
function render() {
    // Limpiar canvas (color de mar)
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Dibujar brújula de viento
    drawWindCompass(centerX, 80);

    // Dibujar barco en el centro
    drawBoat(centerX, centerY);

    // Dibujar HUD con información
    drawHUD();
}

function drawWindCompass(x, y) {
    const apparentWind = calculateApparentWind();
    
    ctx.save();
    ctx.translate(x, y);
    
    // Círculo de la brújula
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Flecha del viento real (azul)
    const trueWindRad = degToRad(CONFIG.trueWindDirection - CONFIG.boatHeading - 90);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(trueWindRad) * 40, Math.sin(trueWindRad) * 40);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Flecha del viento aparente (rojo)
    const appWindRad = degToRad(apparentWind.angle - 90);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(appWindRad) * 40, Math.sin(appWindRad) * 40);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Etiquetas
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Viento Real: ${CONFIG.trueWindSpeed} kn`, x, y + 70);
    ctx.fillText(`Viento Aparente: ${apparentWind.speed} kn @ ${Math.round(apparentWind.angle)}°`, x, y + 85);
}

function drawBoat(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(degToRad(CONFIG.boatHeading - 90));

    // Casco del catamarán (simplificado)
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(-20, -30, 8, 60);  // Casco izquierdo
    ctx.fillRect(12, -30, 8, 60);   // Casco derecho
    ctx.fillRect(-20, -10, 40, 5);  // Viga delantera
    ctx.fillRect(-20, 10, 40, 5);   // Viga trasera

    // Ala mayor
    ctx.save();
    ctx.rotate(degToRad(CONFIG.sailTrim));
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-2, -25, 4, 50);
    ctx.restore();

    ctx.restore();
}

function drawHUD() {
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    
    const y = canvas.height - 120;
    ctx.fillText(`Velocidad: ${CONFIG.boatSpeed.toFixed(1)} nudos`, 20, y);
    ctx.fillText(`Rumbo: ${Math.round(CONFIG.boatHeading)}°`, 20, y + 25);
    ctx.fillText(`Trim del ala: ${CONFIG.sailTrim}°`, 20, y + 50);
    ctx.fillText(`Viento real: ${CONFIG.trueWindSpeed} kn desde ${CONFIG.trueWindDirection}°`, 20, y + 75);
    
    // Instrucciones
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('← → Rumbo | ↑ ↓ Trim del ala', 20, y + 100);
}

// --- LOOP PRINCIPAL ---
function gameLoop(timestamp) {
    if (!gameState.running) return;

    handleInput();
    updateBoatSpeed();
    render();

    gameState.frameCount++;
    requestAnimationFrame(gameLoop);
}

// --- INICIAR JUEGO ---
window.addEventListener('load', () => {
    console.log('SailGP Simulator - Etapa 1 cargado');
    requestAnimationFrame(gameLoop);
});
