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
    
    // Rumbo (Dpad izquierdo o joystick X)
    const turnSpeed = 2;
    if (input.turnLeft || input.joystickX < -0.3) {
        CONFIG.boatHeading = normalizeAngle(CONFIG.boatHeading - turnSpeed);
    }
    if (input.turnRight || input.joystickX > 0.3) {
        CONFIG.boatHeading = normalizeAngle(CONFIG.boatHeading + turnSpeed);
    }
    
    // Trim del ala (Dpad arriba/abajo o joystick Y)
    // Ahora permite rotación completa de -90 a +90 grados
    const trimSpeed = 2;
    if (input.sailUp || input.joystickY > 0.3) {
        CONFIG.sailTrim = Math.min(90, CONFIG.sailTrim + trimSpeed);
    }
    if (input.sailDown || input.joystickY < -0.3) {
        CONFIG.sailTrim = Math.max(-90, CONFIG.sailTrim - trimSpeed);
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
    
    // --- CÍRCULO EXTERNO DE LA BRÚJULA ---
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- MARCADORES DE NORTE (N), SUR (S), ESTE (E), OESTE (O) ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -45);
    ctx.fillText('S', 0, 45);
    ctx.fillText('E', 45, 0);
    ctx.fillText('O', -45, 0);

    // --- FLECHA DEL NORTE (fija, siempre apunta arriba) ---
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(-3, -42);
    ctx.lineTo(3, -42);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();

    // --- FLECHA DEL VIENTO REAL (AZUL) ---
    // Esta flecha muestra de dónde viene el viento REAL (dirección absoluta)
    // Si el viento viene del norte (0°), apunta hacia abajo (sur)
    const trueWindRad = degToRad(CONFIG.trueWindDirection + 180); // +180 porque el viento viene DE esa dirección
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(trueWindRad) * 35, Math.sin(trueWindRad) * 35);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Punta de la flecha del viento real
    ctx.beginPath();
    ctx.arc(Math.cos(trueWindRad) * 35, Math.sin(trueWindRad) * 35, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3498db';
    ctx.fill();

    // --- FLECHA DEL VIENTO APARENTE (ROJO) ---
    // Esta flecha muestra el viento aparente RELATIVO al barco
    const appWindRad = degToRad(apparentWind.angle + 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(appWindRad) * 30, Math.sin(appWindRad) * 30);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Punta de la flecha del viento aparente
    ctx.beginPath();
    ctx.arc(Math.cos(appWindRad) * 30, Math.sin(appWindRad) * 30, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    ctx.restore();

    // --- LEYENDA ---
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    const legendY = y + 70;
    
    // Viento real
    ctx.fillStyle = '#3498db';
    ctx.fillText('● Viento Real (absoluto)', x, legendY);
    
    // Viento aparente
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('● Viento Aparente (relativo)', x, legendY + 18);
    
    // Información numérica
    ctx.fillStyle = 'white';
    ctx.font = '11px Arial';
    ctx.fillText(`Real: ${CONFIG.trueWindSpeed} kn desde ${CONFIG.trueWindDirection}°`, x, legendY + 38);
    ctx.fillText(`Aparente: ${apparentWind.speed.toFixed(1)} kn @ ${Math.round(apparentWind.angle)}°`, x, legendY + 53);
}


function drawBoat(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(degToRad(CONFIG.boatHeading - 90));

    // --- CASCO IZQUIERDO (con proa puntiaguda) ---
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(-20, -35);
    ctx.lineTo(-12, -30);
    ctx.lineTo(-12, 25);
    ctx.lineTo(-20, 20);
    ctx.closePath();
    ctx.fill();

    // --- CASCO DERECHO (con proa puntiaguda) ---
    ctx.beginPath();
    ctx.moveTo(20, -35);
    ctx.lineTo(12, -30);
    ctx.lineTo(12, 25);
    ctx.lineTo(20, 20);
    ctx.closePath();
    ctx.fill();

    // --- VIGAS DE CONEXIÓN ---
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(-20, -15, 40, 4);
    ctx.fillRect(-20, 10, 40, 4);

    // --- PLATAFORMA CENTRAL ---
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(-10, -10, 20, 20);

    // --- INDICADOR DE PROA (flecha) ---
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -45);
    ctx.lineTo(-5, -38);
    ctx.lineTo(5, -38);
    ctx.closePath();
    ctx.fill();

    // --- LÍNEA DE REFERENCIA (perpendicular al barco) ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- ALA MAYOR ---
    ctx.save();
    
    // Rotar el ala según el trim
    // sailTrim: -90 (babor) a +90 (estribor)
    // En el dibujo, 0° es perpendicular al barco (horizontal)
    // Rotamos desde la posición horizontal (0°)
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
    
    // Ala con forma elíptica
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, wingHeight/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Línea central del ala para ver la dirección
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -wingHeight/2);
    ctx.lineTo(0, wingHeight/2);
    ctx.stroke();
    
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
    
    // Mostrar trim del ala con indicación de lado
    let trimText = `Trim del ala: ${CONFIG.sailTrim}°`;
    if (CONFIG.sailTrim < -5) {
        trimText += ' (Babor)';
    } else if (CONFIG.sailTrim > 5) {
        trimText += ' (Estribor)';
    } else {
        trimText += ' (Centro)';
    }
    ctx.fillText(trimText, 20, y + 50);
    
    ctx.fillText(`Viento real: ${CONFIG.trueWindSpeed} kn desde ${CONFIG.trueWindDirection}°`, 20, y + 75);
    
    // Mostrar ala actual
    const polar = getCurrentPolar();
    ctx.fillStyle = '#f39c12';
    ctx.fillText(`Ala: ${polar.name}`, 20, y + 100);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('← → Rumbo | ↑ ↓ Trim del ala (-90° a +90°)', 20, y + 125);
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
