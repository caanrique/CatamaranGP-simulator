// ============================================
// CATAMARANGP SIMULATOR - MÓDULO PRINCIPAL
// Etapa 2: Integración de selector de ala
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
    running: true,
    lastTime: 0,
    frameCount: 0
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function handleInput() {
    if (wingSelectorVisible) {
        handleWingSelectorInput();
        updatePrevInput();
        return;
    }
    
    const input = getInput();
    
    const turnSpeed = 2;
    if (input.turnLeft || input.joystickX < -0.3) {
        CONFIG.boatHeading = normalizeAngle(CONFIG.boatHeading - turnSpeed);
    }
    if (input.turnRight || input.joystickX > 0.3) {
        CONFIG.boatHeading = normalizeAngle(CONFIG.boatHeading + turnSpeed);
    }
    
    const trimSpeed = 1;
    if (input.sailUp || input.joystickY > 0.3) {
        CONFIG.sailTrim = Math.min(90, CONFIG.sailTrim + trimSpeed);
    }
    if (input.sailDown || input.joystickY < -0.3) {
        CONFIG.sailTrim = Math.max(0, CONFIG.sailTrim - trimSpeed);
    }
    
    updatePrevInput();
}

function render() {
    if (wingSelectorVisible) {
        renderWingSelector();
        return;
    }
    
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    drawWindCompass(centerX, 80);
    drawBoat(centerX, centerY);
    drawHUD();
}

function drawWindCompass(x, y) {
    const apparentWind = calculateApparentWind();
    
    ctx.save();
    ctx.translate(x, y);
    
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const trueWindRad = degToRad(CONFIG.trueWindDirection - CONFIG.boatHeading - 90);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(trueWindRad) * 40, Math.sin(trueWindRad) * 40);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.stroke();

    const appWindRad = degToRad(apparentWind.angle - 90);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(appWindRad) * 40, Math.sin(appWindRad) * 40);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

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

    // --- CASCO IZQUIERDO (con proa puntiaguda) ---
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(-20, -35);  // Punta de la proa
    ctx.lineTo(-12, -30);  // Lado derecho de la proa
    ctx.lineTo(-12, 25);   // Lado derecho de la popa
    ctx.lineTo(-20, 20);   // Esquina inferior izquierda
    ctx.closePath();
    ctx.fill();

    // --- CASCO DERECHO (con proa puntiaguda) ---
    ctx.beginPath();
    ctx.moveTo(20, -35);   // Punta de la proa
    ctx.lineTo(12, -30);   // Lado izquierdo de la proa
    ctx.lineTo(12, 25);    // Lado izquierdo de la popa
    ctx.lineTo(20, 20);    // Esquina inferior derecha
    ctx.closePath();
    ctx.fill();

    // --- VIGAS DE CONEXIÓN ---
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(-20, -15, 40, 4);  // Viga delantera
    ctx.fillRect(-20, 10, 40, 4);   // Viga trasera

    // --- PLATAFORMA CENTRAL ---
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(-10, -10, 20, 20);

    // --- INDICADOR DE PROA (flecha) ---
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -45);  // Punta de la flecha
    ctx.lineTo(-5, -38);
    ctx.lineTo(5, -38);
    ctx.closePath();
    ctx.fill();

    // --- ALA MAYOR ---
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
    
    // Ala con forma más realista (más ancha en el medio)
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, wingHeight/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    ctx.restore();
}


function drawHUD() {
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    
    const y = canvas.height - 140;
    ctx.fillText(`Velocidad: ${CONFIG.boatSpeed.toFixed(1)} nudos`, 20, y);
    ctx.fillText(`Rumbo: ${Math.round(CONFIG.boatHeading)}°`, 20, y + 25);
    ctx.fillText(`Trim del ala: ${CONFIG.sailTrim}°`, 20, y + 50);
    ctx.fillText(`Viento real: ${CONFIG.trueWindSpeed} kn desde ${CONFIG.trueWindDirection}°`, 20, y + 75);
    
    // Mostrar ala actual
    const polar = getCurrentPolar();
    ctx.fillStyle = '#f39c12';
    ctx.fillText(`Ala: ${polar.name}`, 20, y + 100);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('← → Rumbo | ↑ ↓ Trim del ala', 20, y + 125);
}

function gameLoop(timestamp) {
    if (!gameState.running) return;

    handleInput();
    
    if (!wingSelectorVisible) {
        updateBoatSpeed();
    }
    
    render();

    gameState.frameCount++;
    requestAnimationFrame(gameLoop);
}

// --- DETECCIÓN DE TAP PARA EL SELECTOR DE ALA ---
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
    console.log('CatamaranGP Simulator - Etapa 2 cargado');
    showWingSelector();
    requestAnimationFrame(gameLoop);
});
