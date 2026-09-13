// ============================================
// CATAMARANGP SIMULATOR - MÓDULO PRINCIPAL
// Etapa 3.5.5: Visualización completa con ala de dos partes, jib y cascos
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Inicializar el mundo 3D
init3D();

let gameState = {
    running: true,
    lastTime: 0,
    frameCount: 0
};

function resizeCanvas() {
    // Redimensionar canvas 2D (HUD)
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Redimensionar renderer 3D
    if (typeof onWindowResize === 'function') {
        onWindowResize();
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- ESTADO ANTERIOR DE CONTROLES ---
let prevDpad = { up: false, down: false, left: false, right: false };
let prevKeys = { key1: false, key2: false, key3: false, key4: false };
let prevToggleJib = false;
let gybeTimingPressed = false;  // El jugador presionó en el momento justo

// --- MANEJO DE INPUT ---
function handleInput() {
    if (wingSelectorVisible) {
        handleWingSelectorInput();
        updatePrevInput();
        return;
    }
    
    const input = getInput();
    
    // --- SELECCIÓN DE TRIPULANTE CON ↑/↓ ---
    // ↑ avanza: Timonel → Trimmer → Grinder2 → Grinder1
    // ↓ retrocede: Grinder1 → Grinder2 → Trimmer → Timonel
    if (input.dpadUp && !prevDpad.up) {
        nextRole();
    }
    if (input.dpadDown && !prevDpad.down) {
        prevRole();
    }
    
    // --- MOVER JUGADOR ENTRE CASCOS CON ←/→ ---
    if (input.dpadLeft && !prevDpad.left) {
        moveActivePlayerToOppositeHull();
    }
    if (input.dpadRight && !prevDpad.right) {
        moveActivePlayerToOppositeHull();
    }
    
    // --- SELECCIÓN DIRECTA CON TECLAS NUMÉRICAS ---
    if (input.key1 && !prevKeys.key1) CrewState.activeRole = CREW_ROLES.HELMSMAN;
    if (input.key2 && !prevKeys.key2) CrewState.activeRole = CREW_ROLES.TRIMMER;
    if (input.key3 && !prevKeys.key3) CrewState.activeRole = CREW_ROLES.GRINDER_2;
    if (input.key4 && !prevKeys.key4) CrewState.activeRole = CREW_ROLES.GRINDER_1;
    
    // --- TOGGLE DEL JIB CON TECLA J ---
    if (input.toggleJib && !prevToggleJib) {
        toggleJib();
    }
    
    // --- EJECUTAR FUNCIÓN DEL TRIPULANTE CON WASD ---
    executeCrewAction(input.joystickX, input.joystickY);
    
        // --- DETECCIÓN DE TIMING EN TRASLUCHADA ---
    if (CONFIG.isManeuvering && CONFIG.maneuverType === 'gybing') {
        const totalDuration = CONFIG.maneuverDuration['gybing'];
        const progress = 1 - (CONFIG.maneuverTimer / totalDuration);
        
        // Ventana óptima: entre 35% y 65% del progreso
        const inOptimalWindow = progress > 0.35 && progress < 0.65;
        
        // Si el jugador presiona cualquier tecla durante la ventana óptima
        if (inOptimalWindow && !gybeTimingPressed) {
            const anyKeyPressed = input.dpadUp || input.dpadDown || input.dpadLeft || input.dpadRight ||
                                  Math.abs(input.joystickX) > 0.3 || Math.abs(input.joystickY) > 0.3;
            if (anyKeyPressed) {
                gybeTimingPressed = true;
                CONFIG.gybeCrackFlash = 1.0; // Activar flash visual
                console.log('💥 ¡TRASLUCHADA PERFECTA! Timing óptimo');

                CONFIG.perfectManeuvers++;
                CONFIG.maneuverSuccessRate = (CONFIG.perfectManeuvers / CONFIG.totalManeuvers * 100);
                playPerfectGybeSound();
            }
        }
    } else {
        gybeTimingPressed = false;
    }

    // --- ACTUALIZAR ESTADO ANTERIOR ---
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
    prevToggleJib = input.toggleJib;
}

// --- EJECUTAR ACCIÓN SEGÚN TRIPULANTE ACTIVO ---
function executeCrewAction(joyX, joyY) {
    const role = CrewState.activeRole;
    const threshold = 0.3;
    
    switch(role) {
        case CREW_ROLES.HELMSMAN:
            // Timonel: controla rumbo con A/D
            if (Math.abs(joyX) > threshold) {
                const turnSpeed = 2 * Math.abs(joyX);
                CONFIG.boatHeading = normalizeAngle(
                    CONFIG.boatHeading + (joyX > 0 ? turnSpeed : -turnSpeed)
                );
            }
            break;
            
        case CREW_ROLES.TRIMMER:
            // Trimmer: controla altura de foils con W/S
            if (Math.abs(joyY) > threshold) {
                const foilSpeed = 0.02 * Math.abs(joyY);
                CONFIG.foilHeight = Math.max(0, Math.min(1,
                    CONFIG.foilHeight + (joyY > 0 ? foilSpeed : -foilSpeed)
                ));
            }
            break;
            
        case CREW_ROLES.GRINDER_1:
            // Grinder 1: controla ángulo del Leading Edge con A/D (horizontal)
            // A = babor (izquierda), D = estribor (derecha)
            if (Math.abs(joyX) > threshold) {
                const trimSpeed = 1.5 * Math.abs(joyX);
                CONFIG.sailTrim = Math.max(-90, Math.min(90,
                    CONFIG.sailTrim + (joyX > 0 ? trimSpeed : -trimSpeed)  // ← INVERTIDO
                ));
            }
            break;
            
        case CREW_ROLES.GRINDER_2:
            // Grinder 2: controla ángulo del Flap con A/D
            if (Math.abs(joyX) > threshold) {
                const flapSpeed = 1.0 * Math.abs(joyX);
                CONFIG.flapAngle = Math.max(-30, Math.min(30,
                    CONFIG.flapAngle + (joyX > 0 ? -flapSpeed : flapSpeed)
                ));
            }
            break;
    }
}

// --- RENDERIZADO PRINCIPAL ---
function render() {
    // 1. Renderizar el mundo 3D (Barco, agua, etc.)
    if (renderer && scene && camera) {
        update3DScene();
        renderer.render(scene, camera);
    }

    // 2. Si el selector de ala está activo, lo dibujamos en el canvas 2D encima
    if (wingSelectorVisible) {
        // Limpiar solo el canvas 2D para el overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderWingSelector();
        return;
    }
    
    // 3. Limpiar el canvas 2D y dibujar SOLO el HUD (la brújula y textos)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = 80; // Subimos la brújula para que no tape el barco 3D

    drawWindCompass(centerX, centerY);
    drawHUD();
}

// --- BRÚJULA DE VIENTO ---
function drawWindCompass(x, y) {
    const apparentWind = calculateApparentWind();
    
    ctx.save();
    ctx.translate(x, y);
    
    // Círculo externo
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Marcadores N, S, E, O
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -45);
    ctx.fillText('S', 0, 45);
    ctx.fillText('E', 45, 0);
    ctx.fillText('O', -45, 0);

    // Flecha del norte
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(-3, -42);
    ctx.lineTo(3, -42);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();

    // Flecha del viento real (azul)
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

    // Flecha del viento aparente (rojo)
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

    // Leyenda
    const legendY = y + 70;
    
    ctx.fillStyle = '#3498db';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('● Viento REAL', x, legendY);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('● Viento APARENTE', x, legendY + 18);
    
    ctx.fillStyle = 'white';
    ctx.font = '11px Arial';
    ctx.fillText(`Real: ${CONFIG.trueWindSpeed} kn @ ${CONFIG.trueWindDirection}°`, x, legendY + 38);
    ctx.fillText(`Aparente: ${apparentWind.speed.toFixed(1)} kn @ ${Math.round(apparentWind.angle)}°`, x, legendY + 53);
}

// --- DIBUJAR EL BARCO COMPLETO (con escora y vuelco) ---
function drawBoat(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Aplicar rotación del barco (rumbo)
    ctx.rotate(degToRad(CONFIG.boatHeading - 90));
    
    // Aplicar animación de vuelco si está volcado
    if (CONFIG.isCapsized) {
        ctx.rotate(degToRad(CONFIG.capsizeAnimation));
    } else {
        // Aplicar escora visual (inclinación lateral)
        const heelFactor = Math.cos(degToRad(CONFIG.heelAngle));
        ctx.scale(1, heelFactor);
    }

        // --- SOMBRA DEL BARCO (indica altura) ---
    if (CONFIG.isFlying) {
        drawBoatShadow();
    }
    
    // --- FOILS (solo visibles cuando están en el agua o volando bajo) ---
    if (CONFIG.foilHeight < 0.9) {
        drawFoils();
    }
    
    // --- CASCO IZQUIERDO (Babor) ---
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(-25, -40);
    ctx.lineTo(-15, -35);
    ctx.lineTo(-15, 30);
    ctx.lineTo(-25, 25);
    ctx.closePath();
    ctx.fill();

    // --- CASCO DERECHO (Estribor) ---
    ctx.beginPath();
    ctx.moveTo(25, -40);
    ctx.lineTo(15, -35);
    ctx.lineTo(15, 30);
    ctx.lineTo(25, 25);
    ctx.closePath();
    ctx.fill();

    // --- VIGAS DE CONEXIÓN ---
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(-25, -15, 50, 4);
    ctx.fillRect(-25, 10, 50, 4);

    // --- PLATAFORMA CENTRAL ---
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(-12, -12, 24, 24);

    // --- FLECHA DE PROA ---
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(-6, -42);
    ctx.lineTo(6, -42);
    ctx.closePath();
    ctx.fill();

    // --- JIB (si está activo) ---
    if (CONFIG.jibActive && !CONFIG.isCapsized) {
        drawJib();
    }

    // --- ALA DE DOS PARTES ---
    if (!CONFIG.isCapsized) {
        drawWing();
    }

    // --- TRIPULANTES ---
    if (!CONFIG.isCapsized) {
        drawCrewMembers();
    }

    ctx.restore();
    
    // --- INDICADOR DE ESCORA (solo si no está volcado) ---
    if (!CONFIG.isCapsized) {
        drawHeelIndicator(x, y);
    }
    
    // --- MENSAJE DE VUELCO ---
    if (CONFIG.isCapsized) {
        drawCapsizeMessage(x, y);
    }
        // --- EFECTOS VISUALES (estela y spray) ---
    drawWakeEffects(x, y);
}

// --- DIBUJAR EFECTOS DE ESTELA Y SPRAY ---
function drawWakeEffects(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(degToRad(CONFIG.boatHeading - 90));
    
    if (CONFIG.isFlying) {
        // Estela mínima cuando vuela (líneas finas)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 10]);
        
        ctx.beginPath();
        ctx.moveTo(-15, 30);
        ctx.lineTo(-15, 60);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(15, 30);
        ctx.lineTo(15, 60);
        ctx.stroke();
        
        ctx.setLineDash([]);
    } else if (CONFIG.boatSpeed > 5) {
        // Estela grande y spray cuando está en el agua
        const sprayIntensity = Math.min(1, CONFIG.boatSpeed / 30);
        
        // Estela principal
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * sprayIntensity})`;
        ctx.beginPath();
        ctx.moveTo(-20, 30);
        ctx.lineTo(-30, 70);
        ctx.lineTo(-10, 70);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(20, 30);
        ctx.lineTo(30, 70);
        ctx.lineTo(10, 70);
        ctx.closePath();
        ctx.fill();
        
        // Spray (partículas de agua)
        if (sprayIntensity > 0.5) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * sprayIntensity})`;
            
            // Partículas aleatorias (simuladas con posiciones fijas)
            for (let i = 0; i < 5; i++) {
                const offsetX = (Math.sin(Date.now() / 100 + i) * 10) + (i % 2 === 0 ? -25 : 25);
                const offsetY = 40 + (i * 5);
                ctx.beginPath();
                ctx.arc(offsetX, offsetY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Efecto de nosedive (splash grande)
    if (CONFIG.isNosediving) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(0, -30, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(0, -30, 35, 0, Math.PI * 2);
        ctx.fill();
    }
    
        // Efecto de maniobra (spray intenso)
    if (CONFIG.isManeuvering) {
        const sprayIntensity = Math.sin((1 - CONFIG.maneuverTimer / CONFIG.maneuverDuration[CONFIG.maneuverType]) * Math.PI);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * sprayIntensity})`;
        
        // Spray lateral intenso
        for (let i = 0; i < 8; i++) {
            const offsetX = (Math.sin(Date.now() / 80 + i * 2) * 15) + (i % 2 === 0 ? -30 : 30);
            const offsetY = 20 + (i * 6);
            ctx.beginPath();
            ctx.arc(offsetX, offsetY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

// --- DIBUJAR SOMBRA DEL BARCO ---
function drawBoatShadow() {
    ctx.save();
    
    // La sombra se hace más pequeña y clara cuanto más alto vuela
    const shadowScale = 1 - (CONFIG.foilHeight * 0.5); // 1.0 a 0.5
    const shadowAlpha = 0.3 - (CONFIG.foilHeight * 0.2); // 0.3 a 0.1
    
    ctx.scale(shadowScale, shadowScale);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    
    // Elipse de sombra
    ctx.beginPath();
    ctx.ellipse(0, 10, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// --- DIBUJAR FOILS ---
function drawFoils() {
    ctx.save();
    
    // Los foils se ven como líneas finas bajo los cascos
    // Se hacen más cortas cuanto más alto vuela
    const foilLength = 20 * (1 - CONFIG.foilHeight);
    
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    
    // Foil izquierdo (babor)
    ctx.beginPath();
    ctx.moveTo(-20, 25);
    ctx.lineTo(-20, 25 + foilLength);
    ctx.stroke();
    
    // Foil derecho (estribor)
    ctx.beginPath();
    ctx.moveTo(20, 25);
    ctx.lineTo(20, 25 + foilLength);
    ctx.stroke();
    
    // Puntas de los foils (pequeñas alas horizontales)
    if (foilLength > 5) {
        ctx.lineWidth = 3;
        
        // Punta izquierda
        ctx.beginPath();
        ctx.moveTo(-25, 25 + foilLength);
        ctx.lineTo(-15, 25 + foilLength);
        ctx.stroke();
        
        // Punta derecha
        ctx.beginPath();
        ctx.moveTo(15, 25 + foilLength);
        ctx.lineTo(25, 25 + foilLength);
        ctx.stroke();
    }
    
    ctx.restore();
}

// --- MENSAJE DE VUELCO ---
function drawCapsizeMessage(x, y) {
    // Fondo semi-transparente
    ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
    ctx.fillRect(x - 150, y - 80, 300, 100);
    
    // Borde
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 150, y - 80, 300, 100);
    
    // Texto principal
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡VOLCÓ!', x, y - 40);
    
    // Timer de penalización
    const secondsLeft = Math.ceil(CONFIG.capsizeTimer / 60);
    ctx.font = '20px Arial';
    ctx.fillText(`Reiniciando en ${secondsLeft}s...`, x, y - 10);
    
    // Contador de vuelcos
    ctx.font = '14px Arial';
    ctx.fillText(`Vuelcos totales: ${CONFIG.capsizeCount}`, x, y + 15);
}

// --- INDICADOR DE MANIOBRA (con ventana óptima) ---
function drawManeuverIndicator(x, y) {
    if (!CONFIG.isManeuvering) return;
    
    const totalDuration = CONFIG.maneuverDuration[CONFIG.maneuverType];
    const progress = 1 - (CONFIG.maneuverTimer / totalDuration);
    const timeLeft = (CONFIG.maneuverTimer / 60).toFixed(1);
    
    // Color según tipo
    const bgColor = CONFIG.maneuverType === 'tacking' ? 'rgba(52, 152, 219, 0.8)' : 'rgba(231, 76, 60, 0.8)';
    
    // Fondo
    ctx.fillStyle = bgColor;
    ctx.fillRect(x - 130, y - 130, 260, 70);
    
    // Borde
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 130, y - 130, 260, 70);
    
    // Texto
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    
    const maneuverName = CONFIG.maneuverType === 'tacking' ? '⛵ VIRADA' : '🔄 TRASLUCHADA';
    ctx.fillText(maneuverName, x, y - 108);
    
    // Barra de progreso
    const barWidth = 240;
    const barHeight = 10;
    const barX = x - barWidth / 2;
    const barY = y - 95;
    
    // Fondo de barra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Ventana óptima (solo en trasluchada)
    if (CONFIG.maneuverType === 'gybing') {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
        ctx.fillRect(barX + barWidth * 0.35, barY, barWidth * 0.3, barHeight);
    }
    
    // Progreso actual
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    // Borde de barra
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Tiempo restante
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`${timeLeft}s`, x, barY + 25);
    
    // Instrucción de timing (solo en trasluchada)
    if (CONFIG.maneuverType === 'gybing' && progress < 0.35) {
        ctx.fillStyle = '#f39c12';
        ctx.font = 'italic 11px Arial';
        ctx.fillText('¡Prepárate para presionar en la zona verde!', x, barY + 40);
    }
}

// --- EFECTO FLASH DEL CRACK DEL ALA ---
function drawGybeCrackFlash() {
    if (CONFIG.gybeCrackFlash <= 0) return;
    
    // Flash blanco que se desvanece
    ctx.fillStyle = `rgba(255, 255, 255, ${CONFIG.gybeCrackFlash * 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texto "CRACK!" en el centro
    ctx.fillStyle = `rgba(255, 255, 0, ${CONFIG.gybeCrackFlash})`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡CRACK!', canvas.width / 2, canvas.height / 2);
    
    // Reducir el flash gradualmente
    CONFIG.gybeCrackFlash -= 0.05;
    if (CONFIG.gybeCrackFlash < 0) CONFIG.gybeCrackFlash = 0;
}

// --- INDICADOR VISUAL DE ESCORA ---
function drawHeelIndicator(x, y) {
    const barWidth = 120;
    const barHeight = 12;
    const barX = x - barWidth / 2;
    const barY = y + 70;
    
    // Fondo de la barra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Relleno según nivel de escora
    const heelPercent = CONFIG.heelAngle / CONFIG.maxHeelAngle;
    let fillColor;
    if (heelPercent < 0.5) fillColor = '#2ecc71';      // Verde: seguro
    else if (heelPercent < 0.75) fillColor = '#f39c12'; // Amarillo: precaución
    else fillColor = '#e74c3c';                          // Rojo: peligro
    
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barWidth * heelPercent, barHeight);
    
    // Borde
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Texto
    ctx.fillStyle = 'white';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Escora: ${Math.round(CONFIG.heelAngle)}°`, x, barY - 5);
}

// --- DIBUJAR EL JIB (foque) ---
function drawJib() {
    ctx.save();
    
    // Posicionar el jib DELANTE de la proa del ala
    // El ala tiene su punto de rotación en la proa, así que vamos aún más adelante
    const wingSizes = {
        light: 70,
        medium: 60,
        strong: 50
    };
    const wingHeight = wingSizes[CONFIG.currentWing];
    
    // Mover a la posición delante de la proa del ala
    ctx.translate(0, -(wingHeight/2 + 5)); // 15 píxeles delante de la proa
    
    // El jib se orienta según el viento aparente (autovirante)
    const apparentWind = calculateApparentWind();
    const jibAngle = apparentWind.angle > 180 ? apparentWind.angle - 360 : apparentWind.angle;
    ctx.rotate(degToRad(jibAngle * 0.5)); // Se ajusta parcialmente
    
    // Dibujar el jib como un triángulo pequeño
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-7, 4);
    ctx.lineTo(7, 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
}

// --- DIBUJAR EL ALA DE DOS PARTES ---
// --- DIBUJAR EL ALA DE DOS PARTES ---
function drawWing() {
    const wingColors = {
        light: '#2ecc71',
        medium: '#f39c12',
        strong: '#e74c3c'
    };
    const wingSizes = {
        light: 70,
        medium: 60,
        strong: 50
    };
    const wingHeight = wingSizes[CONFIG.currentWing];
    
    ctx.save();
    
    // PUNTO DE ROTACIÓN: Proa del ala (extremo delantero)
    // El mástil está anclado en la proa, así que rotamos desde ahí
    ctx.translate(0, -wingHeight/2); // Mover al punto de proa
    
    // Rotar todo el ala según el ángulo del Leading Edge
    ctx.rotate(degToRad(CONFIG.sailTrim));
    
    // --- PARTE 1: LEADING EDGE (mástil) ---
    // Se dibuja desde la proa (0,0) hasta la bisagra (0, wingHeight/2)
    ctx.fillStyle = wingColors[CONFIG.currentWing];
    ctx.beginPath();
    ctx.ellipse(0, wingHeight/4, 4, wingHeight/4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Línea central del Leading Edge
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, wingHeight/2);
    ctx.stroke();
    
    // --- BISAGRA (punto de articulación) ---
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.arc(0, wingHeight/2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // --- PARTE 2: FLAP TRASERO ---
    // Se dibuja desde la bisagra, rotado RELATIVO al Leading Edge
    ctx.save();
    ctx.translate(0, wingHeight/2); // Mover a la bisagra
    ctx.rotate(degToRad(CONFIG.flapAngle)); // Rotar relativo al LE
    
    // El flap va desde la bisagra (0,0) hasta la popa (0, wingHeight/4)
    ctx.fillStyle = wingColors[CONFIG.currentWing];
    ctx.globalAlpha = 0.85; // Ligeramente transparente para diferenciar
    ctx.beginPath();
    ctx.ellipse(0, wingHeight/8, 3, wingHeight/8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    
    // Línea del flap
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, wingHeight/4);
    ctx.stroke();
    
    // Punta del flap (popa)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(0, wingHeight/4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    ctx.restore();
}

// --- DIBUJAR TRIPULANTES EN SUS CASCOS ---
function drawCrewMembers() {
    const activeRole = CrewState.activeRole;
    
    // Posiciones de los tripulantes en cada casco
    // Posición 1 (proa) a 4 (popa), espaciadas verticalmente
    const positionOffsets = {
        1: -30,  // Proa
        2: -10,
        3: 10,
        4: 30    // Popa
    };
    
    // Dibujar tripulantes en casco de babor (izquierdo, x = -20)
    const portPlayers = getPlayersInHull(HULLS.PORT);
    portPlayers.forEach(player => {
        const y = positionOffsets[player.position];
        drawCrewMember(-20, y, player.role, player.role === activeRole);
    });
    
    // Dibujar tripulantes en casco de estribor (derecho, x = +20)
    const starboardPlayers = getPlayersInHull(HULLS.STARBOARD);
    starboardPlayers.forEach(player => {
        const y = positionOffsets[player.position];
        drawCrewMember(20, y, player.role, player.role === activeRole);
    });
}

// --- DIBUJAR UN TRIPULANTE INDIVIDUAL ---
function drawCrewMember(x, y, role, isActive) {
    ctx.save();
    ctx.translate(x, y);
    
    const color = CREW_COLORS[role];
    
    // Círculo del tripulante
    ctx.beginPath();
    ctx.arc(0, 0, isActive ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Borde brillante si está activo
    if (isActive) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Anillo pulsante
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    ctx.restore();
}

// --- HUD COMPLETO (reorganizado) ---
function drawHUD() {
    const crewInfo = getActiveCrewInfo();
    const boatStatus = getBoatStatus();
    const weightDist = calculateWeightDistribution();
    
    // Fondo semi-transparente para mejor legibilidad
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(10, canvas.height - 280, 380, 270);
    
    ctx.textAlign = 'left';
    
    // === SECCIÓN 1: DATOS BÁSICOS DEL BARCO ===
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('📊 DATOS DEL BARCO', 20, canvas.height - 265);
    
    ctx.font = '13px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Velocidad: ${CONFIG.boatSpeed.toFixed(1)} nudos`, 20, canvas.height - 245);
    ctx.fillText(`Rumbo: ${Math.round(CONFIG.boatHeading)}°`, 20, canvas.height - 225);
    ctx.fillText(`Viento real: ${CONFIG.trueWindSpeed} kn @ ${CONFIG.trueWindDirection}°`, 20, canvas.height - 205);
    
    // === SECCIÓN 2: ALA Y CONFIGURACIÓN ===
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('🛩️ ALA', 20, canvas.height - 180);
    
    const polar = getCurrentPolar();
    ctx.font = '13px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Tipo: ${polar.name}`, 20, canvas.height - 160);
    ctx.fillText(`Mástil: ${Math.round(CONFIG.sailTrim)}° | Flap: ${Math.round(CONFIG.flapAngle)}°`, 20, canvas.height - 140);
    ctx.fillText(`Eficiencia flap: ${(boatStatus.flapEfficiency * 100).toFixed(0)}%`, 20, canvas.height - 120);
    ctx.fillText(`Jib: ${CONFIG.jibActive ? 'ACTIVO (+8%)' : 'INACTIVO'}`, 20, canvas.height - 100);
    
    // === SECCIÓN 3: ESTADO DE VUELO Y BALANCE ===
    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('⚖️ BALANCE', 20, canvas.height - 75);
    
    // Estado de vuelo
    let flightStatus = 'EN EL AGUA';
    let flightColor = '#95a5a6';
    if (CONFIG.isNosediving) {
        flightStatus = '💥 NOSDIVE';
        flightColor = '#e74c3c';
    } else if (CONFIG.isFlying) {
        if (CONFIG.foilHeight > 0.85) {
            flightStatus = '🛩️ VOLANDO ALTO (¡Riesgo!)';
            flightColor = '#f39c12';
        } else {
            flightStatus = '🛩️ VOLANDO';
            flightColor = '#2ecc71';
        }
    }
    
    ctx.font = '13px Arial';
    ctx.fillStyle = flightColor;
    ctx.fillText(`Foils: ${flightStatus} (${(CONFIG.foilHeight * 100).toFixed(0)}%)`, 20, canvas.height - 55);
    
    ctx.fillStyle = 'white';
    ctx.fillText(`Peso: Babor ${weightDist.port}kg | Estribor ${weightDist.starboard}kg`, 20, canvas.height - 35);
    
    // === PANEL DERECHO: TRIPULANTE ACTIVO ===
    const panelX = canvas.width - 280;
    const panelY = canvas.height - 220;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(panelX, panelY, 270, 210);
    
    ctx.fillStyle = crewInfo.color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`▶ ${crewInfo.name}`, panelX + 10, panelY + 25);
    
    ctx.fillStyle = 'white';
    ctx.font = '13px Arial';
    ctx.fillText(`Función: ${crewInfo.function}`, panelX + 10, panelY + 50);
    ctx.fillText(`Casco: ${crewInfo.hull === HULLS.PORT ? 'Babor' : 'Estribor'}`, panelX + 10, panelY + 70);
    
    // Contador de vuelcos si aplica
    if (CONFIG.capsizeCount > 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(`⚠ VUELCOS: ${CONFIG.capsizeCount}`, panelX + 10, panelY + 95);
    }
    
    // Indicador de riesgo de nosedive
    if (CONFIG.nosediveRisk > 0.3) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(`⚠ Riesgo nosedive: ${(CONFIG.nosediveRisk * 100).toFixed(0)}%`, panelX + 10, panelY + 115);
    }
    
    // === SECCIÓN 4: ESTADÍSTICAS ===
    if (CONFIG.totalManeuvers > 0) {
        ctx.fillStyle = '#9b59b6';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('📈 ESTADÍSTICAS', panelX + 10, panelY + 140);
        
        ctx.font = '13px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`Maniobras: ${CONFIG.totalManeuvers}`, panelX + 10, panelY + 160);
        ctx.fillText(`Perfectas: ${CONFIG.perfectManeuvers}`, panelX + 10, panelY + 180);
        ctx.fillText(`Éxito: ${CONFIG.maneuverSuccessRate.toFixed(0)}%`, panelX + 10, panelY + 200);
    }

    // === INSTRUCCIONES (parte inferior) ===
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ Jugador | ←→ Casco | WASD Acción | J = Jib', canvas.width / 2, canvas.height - 10);
}

// --- LOOP PRINCIPAL ---
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

// --- EVENTOS DE TAP ---
canvas.addEventListener('click', (e) => {
    if (wingSelectorVisible) {
        const rect = canvas.getBoundingClientRect();
        handleWingSelectorTap(e.clientX - rect.left, e.clientY - rect.top);
    }
});

canvas.addEventListener('touchstart', (e) => {
    if (wingSelectorVisible) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        handleWingSelectorTap(touch.clientX - rect.left, touch.clientY - rect.top);
    }
});

// --- INICIO ---
window.addEventListener('load', () => {
    console.log('CatamaranGP Simulator - Etapa 3.5.5 cargado');
    showWingSelector();
    requestAnimationFrame(gameLoop);
});