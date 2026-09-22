// ============================================
// CATAMARANGP SIMULATOR - MÓDULO PRINCIPAL
// Versión limpia: Menú de 2 pantallas + HUD + Física
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Inicializar el mundo 3D
if (typeof init3D === 'function') {
    init3D();
}

let gameState = {
    running: true,
    lastTime: 0,
    frameCount: 0
};

// === SISTEMA DE MENÚ DE 2 PANTALLAS ===
let currentGameMode = null; // 'learning', 'practice', 'race'
// === CONTROL DEL HUD ===
let hudVisible = true; // Por defecto el HUD está visible

function showConfigMenu() {
    const configMenu = document.getElementById('configMenu');
    const modeMenu = document.getElementById('modeMenu');
    const backBtn = document.getElementById('backToMenuBtn');
    
    if (configMenu) configMenu.classList.remove('hidden');
    if (modeMenu) modeMenu.classList.add('hidden');
    if (backBtn) backBtn.classList.remove('visible');

    if (typeof clearPracticeTrack === 'function') clearPracticeTrack();
    
    // Sincronizar UI con el estado actual
    const windSelect = document.getElementById('windConditionSelector');
    const wingSelect = document.getElementById('wingSelector');
    const jibToggle = document.getElementById('jibToggle');
    
    if (windSelect && typeof CONFIG !== 'undefined') windSelect.value = CONFIG.windCondition || 'intermediate';
    if (wingSelect && typeof CONFIG !== 'undefined') wingSelect.value = CONFIG.currentWing;
    if (jibToggle && typeof CONFIG !== 'undefined') jibToggle.checked = CONFIG.jibActive;
    
    currentGameMode = null;
    console.log('⚙️ Pantalla de Configuración mostrada');
    
    setTimeout(drawBoatPreview, 100);
}

function showModeMenu() {
    // Aplicar configuraciones antes de avanzar
    if (typeof updateConfigFromUI === 'function') updateConfigFromUI();
    if (typeof updateBoatColors === 'function') updateBoatColors();
    
    const configMenu = document.getElementById('configMenu');
    const modeMenu = document.getElementById('modeMenu');
    
    if (configMenu) configMenu.classList.add('hidden');
    if (modeMenu) modeMenu.classList.remove('hidden');
    console.log('🎮 Pantalla de Modos de Juego mostrada');
}

// === TOGGLE DEL HUD ===
function toggleHUD() {
    hudVisible = !hudVisible;
    const btn = document.getElementById('toggleHudBtn');
    if (btn) {
        if (hudVisible) {
            btn.classList.add('active');
            btn.textContent = '✕'; // Solo una X cuando está activo
            btn.title = 'Ocultar HUD';
        } else {
            btn.classList.remove('active');
            btn.textContent = '📊 Velocímetro'; // Texto cuando está oculto
            btn.title = 'Mostrar HUD';
        }
    }
    console.log(`📊 HUD ${hudVisible ? 'activado' : 'ocultado'}`);
}

function startGame(mode) {
    currentGameMode = mode;
    
    const configMenu = document.getElementById('configMenu');
    const modeMenu = document.getElementById('modeMenu');
    const backBtn = document.getElementById('backToMenuBtn');
    
    if (configMenu) configMenu.classList.add('hidden');
    if (modeMenu) modeMenu.classList.add('hidden');
    if (mode === 'practice') {
        if (typeof createPracticeTrack === 'function') createPracticeTrack();
    }
    if (backBtn) backBtn.classList.add('visible');

    const hudBtn = document.getElementById('toggleHudBtn');
    if (hudBtn) hudBtn.classList.add('visible');
    hudVisible = true; // HUD visible al empezar
    const hudBtn2 = document.getElementById('toggleHudBtn');
    if (hudBtn2) hudBtn2.classList.add('active');
    
    console.log(`🚀 ¡Juego iniciado en modo: ${mode}!`);
    
    switch(mode) {
        case 'learning':
            console.log('🎓 Modo Aprendizaje: Navegación libre');
            break;
        case 'practice':
            console.log('🎯 Modo Práctica: Cargando pista con boyas...');
            break;
        case 'race':
            console.log('🏆 Modo Carrera: Preparando competidores...');
            break;
    }
}

// === SISTEMA DE CONFIGURACIÓN EN TIEMPO REAL ===
function updateConfigFromUI() {
    // 1. Condición de viento
    const windSelect = document.getElementById('windConditionSelector');
    if (windSelect && typeof CONFIG !== 'undefined') {
        CONFIG.windCondition = windSelect.value;
        // Forzar un cambio de viento inmediato para aplicar el nuevo rango
        CONFIG.lastWindShiftTime = 0; 
    }

    // 2. Tamaño del ala
    const wingSelect = document.getElementById('wingSelector');
    if (wingSelect && typeof setWing === 'function') {
        setWing(wingSelect.value);
    }

    // 3. Toggle del Jib
    const jibCheckbox = document.getElementById('jibToggle');
    if (jibCheckbox && typeof toggleJib === 'function') {
        if (jibCheckbox.checked && !CONFIG.jibActive) {
            toggleJib();
        } else if (!jibCheckbox.checked && CONFIG.jibActive) {
            toggleJib();
        }
    }
    
    if (typeof jibMesh !== 'undefined' && jibMesh) {
        jibMesh.visible = CONFIG.jibActive;
    }
}

function updateBoatColors() {
    const colorHull = document.getElementById('colorHull').value;
    const colorMast = document.getElementById('colorMast').value;
    const colorFlap = document.getElementById('colorFlap').value;
    const colorJib = document.getElementById('colorJib').value;

    const applyColorToGroup = (group, hexColor) => {
        if (!group) return;
        group.traverse(function (child) {
            if (child.isMesh && child.material) {
                child.material.color.set(hexColor);
            }
        });
    };

    if (typeof hullMeshRef !== 'undefined' && hullMeshRef) applyColorToGroup(hullMeshRef, colorHull);
    if (typeof mastGroup !== 'undefined' && mastGroup) applyColorToGroup(mastGroup, colorMast);
    if (typeof flapMesh !== 'undefined' && flapMesh) applyColorToGroup(flapMesh, colorFlap);
    if (typeof jibMesh !== 'undefined' && jibMesh) applyColorToGroup(jibMesh, colorJib);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
let gybeTimingPressed = false;

// --- MANEJO DE INPUT ---
function handleInput() {
    // Si estamos en el menú, no procesamos input del juego
    if (currentGameMode === null) return;

    const input = typeof getInput === 'function' ? getInput() : { 
        dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false, 
        key1: false, key2: false, key3: false, key4: false, 
        toggleJib: false, joystickX: 0, joystickY: 0 
    };
    
    if (input.dpadUp && !prevDpad.up && typeof nextRole === 'function') nextRole();
    if (input.dpadDown && !prevDpad.down && typeof prevRole === 'function') prevRole();
    
    if ((input.dpadLeft && !prevDpad.left) || (input.dpadRight && !prevDpad.right)) {
        if (typeof moveActivePlayerToOppositeHull === 'function') moveActivePlayerToOppositeHull();
    }
    
    if (typeof CREW_ROLES !== 'undefined') {
        if (input.key1 && !prevKeys.key1) CrewState.activeRole = CREW_ROLES.HELMSMAN;
        if (input.key2 && !prevKeys.key2) CrewState.activeRole = CREW_ROLES.TRIMMER;
        if (input.key3 && !prevKeys.key3) CrewState.activeRole = CREW_ROLES.GRINDER_2;
        if (input.key4 && !prevKeys.key4) CrewState.activeRole = CREW_ROLES.GRINDER_1;
    }
    
    if (input.toggleJib && !prevToggleJib && typeof toggleJib === 'function') {
        toggleJib();
    }
    
    if (typeof executeCrewAction === 'function') {
        executeCrewAction(input.joystickX, input.joystickY);
    }
    
    // Detección de timing en trasluchada
    if (CONFIG.isManeuvering && CONFIG.maneuverType === 'gybing') {
        const totalDuration = CONFIG.maneuverDuration['gybing'];
        const progress = 1 - (CONFIG.maneuverTimer / totalDuration);
        const inOptimalWindow = progress > 0.35 && progress < 0.65;
        
        if (inOptimalWindow && !gybeTimingPressed) {
            const anyKeyPressed = input.dpadUp || input.dpadDown || input.dpadLeft || input.dpadRight ||
                                  Math.abs(input.joystickX) > 0.3 || Math.abs(input.joystickY) > 0.3;
            if (anyKeyPressed) {
                gybeTimingPressed = true;
                CONFIG.gybeCrackFlash = 1.0;
                console.log('💥 ¡TRASLUCHADA PERFECTA! Timing óptimo');
                CONFIG.perfectManeuvers++;
                CONFIG.maneuverSuccessRate = (CONFIG.perfectManeuvers / CONFIG.totalManeuvers * 100);
                if (typeof playPerfectGybeSound === 'function') playPerfectGybeSound();
            }
        }
    } else {
        gybeTimingPressed = false;
    }

    prevDpad = { up: input.dpadUp, down: input.dpadDown, left: input.dpadLeft, right: input.dpadRight };
    prevKeys = { key1: input.key1, key2: input.key2, key3: input.key3, key4: input.key4 };
    prevToggleJib = input.toggleJib;
}

function executeCrewAction(joyX, joyY) {
    const role = CrewState.activeRole;
    const threshold = 0.3;
    
    switch(role) {
        case CREW_ROLES.HELMSMAN:
            if (Math.abs(joyX) > threshold) {
                const turnSpeed = 2 * Math.abs(joyX);
                // INVERTIDO: Ahora funciona como un carro (volante a la derecha = gira a la derecha)
                CONFIG.boatHeading = normalizeAngle(CONFIG.boatHeading + (joyX > 0 ? -turnSpeed : turnSpeed));
            }
            break;
        case CREW_ROLES.TRIMMER:
            if (Math.abs(joyY) > threshold) {
                const foilSpeed = 0.02 * Math.abs(joyY);
                CONFIG.foilHeight = Math.max(0, Math.min(1, CONFIG.foilHeight + (joyY > 0 ? foilSpeed : -foilSpeed)));
            }
            break;
        case CREW_ROLES.GRINDER_1:
            if (Math.abs(joyX) > threshold) {
                const trimSpeed = 1.5 * Math.abs(joyX);
                CONFIG.sailTrim = Math.max(-90, Math.min(90, CONFIG.sailTrim + (joyX > 0 ? trimSpeed : -trimSpeed)));
            }
            break;
        case CREW_ROLES.GRINDER_2:
            if (Math.abs(joyX) > threshold) {
                const flapSpeed = 1.0 * Math.abs(joyX);
                CONFIG.flapAngle = Math.max(-30, Math.min(30, CONFIG.flapAngle + (joyX > 0 ? -flapSpeed : flapSpeed)));
            }
            break;
        case CREW_ROLES.JIB_TRIMMER:
            if (Math.abs(joyX) > threshold) {
                const jibSpeed = 1.0 * Math.abs(joyX);
                CONFIG.jibAngle = Math.max(-30, Math.min(30, CONFIG.jibAngle + (joyX > 0 ? jibSpeed : -jibSpeed)));
            }
            break;
    }
}

// --- RENDERIZADO PRINCIPAL ---
function render() {
    // 1. Renderizar 3D
    if (typeof update3DScene === 'function' && typeof renderer !== 'undefined') {
        update3DScene();
        renderer.render(scene, camera);
    }

    // 2. Limpiar canvas 2D
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 3. Dibujar HUD COMPACTO (solo si está visible)
    if (hudVisible) {
        if (typeof drawCompactHUD === 'function') drawCompactHUD();
    }
    
    // 4. Efectos especiales (Flash de trasluchada)
    if (typeof drawGybeCrackFlash === 'function') drawGybeCrackFlash();
    
    // 5. Dibujar Minimapa SIEMPRE VISIBLE (en modo práctica)
    if (currentGameMode === 'practice' && typeof drawMinimap === 'function') {
        drawMinimap();
    }
}

// --- LOOP PRINCIPAL ---
function gameLoop(timestamp) {
    if (!gameState.running) return;

    handleInput();
    
    // Solo actualizar física si estamos en un modo de juego activo
    if (currentGameMode !== null && typeof updateBoatSpeed === 'function') {
        updateBoatSpeed();
    }
    
    render();

    gameState.frameCount++;
    requestAnimationFrame(gameLoop);
}

// ==========================================
// FUNCIONES DE DIBUJO DEL HUD (Mantenidas intactas)
// ==========================================

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

function drawHUD() {
    const boatStatus = typeof getBoatStatus === 'function' ? getBoatStatus() : { flapEfficiency: 1 };
    const weightDist = typeof calculateWeightDistribution === 'function' ? calculateWeightDistribution() : { port: 0, starboard: 0 };
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(10, canvas.height - 280, 380, 270);
    ctx.textAlign = 'left';
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('📊 DATOS DEL BARCO', 20, canvas.height - 265);
    ctx.font = '13px Arial';
    ctx.fillText(`Velocidad: ${CONFIG.boatSpeed.toFixed(1)} nudos`, 20, canvas.height - 245);
    ctx.fillText(`Rumbo: ${Math.round(CONFIG.boatHeading)}°`, 20, canvas.height - 225);
    ctx.fillText(`Viento real: ${CONFIG.trueWindSpeed} kn @ ${CONFIG.trueWindDirection}°`, 20, canvas.height - 205);
    
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('🛩️ ALA', 20, canvas.height - 180);
    
    const polar = typeof getCurrentPolar === 'function' ? getCurrentPolar() : { name: 'Media' };
    ctx.font = '13px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Tipo: ${polar.name}`, 20, canvas.height - 160);
    ctx.fillText(`Mástil: ${Math.round(CONFIG.sailTrim)}° | Flap: ${Math.round(CONFIG.flapAngle)}°`, 20, canvas.height - 140);
    ctx.fillText(`Eficiencia flap: ${(boatStatus.flapEfficiency * 100).toFixed(0)}%`, 20, canvas.height - 120);
    ctx.fillText(`Jib: ${CONFIG.jibActive ? 'ACTIVO (+8%)' : 'INACTIVO'}`, 20, canvas.height - 100);
    
    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('⚖️ BALANCE', 20, canvas.height - 75);
    
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
    
    const panelX = canvas.width - 280;
    const panelY = canvas.height - 220;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(panelX, panelY, 270, 210);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`▶ Tripulante Activo`, panelX + 10, panelY + 25);
    
    if (CONFIG.capsizeCount > 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(`⚠ VUELCOS: ${CONFIG.capsizeCount}`, panelX + 10, panelY + 55);
    }
    
    if (CONFIG.nosediveRisk > 0.3) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(`⚠ Riesgo nosedive: ${(CONFIG.nosediveRisk * 100).toFixed(0)}%`, panelX + 10, panelY + 75);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ Jugador | ←→ Casco | WASD Acción | J = Jib', canvas.width / 2, canvas.height - 10);
}

// === MINIMAPA 2D (Corregido: solo eje X invertido) ===
function drawMinimap() {
    const mapWidth = 200;
    const mapHeight = 100;
    const mapX = canvas.width - mapWidth - 20;
    const mapY = 60;
    
    const fieldWidth = (typeof CONFIG !== 'undefined' && CONFIG.fieldHalfWidth) ? (CONFIG.fieldHalfWidth * 2) : 4000;
    const scale = mapWidth / fieldWidth;
    
    // Fondo
    ctx.fillStyle = 'rgba(0, 20, 40, 0.75)';
    ctx.fillRect(mapX, mapY, mapWidth, mapHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);
    
    // Indicadores de viento en los bordes
    if (typeof CONFIG !== 'undefined') {
        const windRad = degToRad(CONFIG.trueWindDirection);
        ctx.save();
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.9)';
        ctx.fillStyle = 'rgba(52, 152, 219, 0.9)';
        ctx.lineWidth = 2;

        const positions = [
            { x: mapX + mapWidth / 2, y: mapY },
            { x: mapX + mapWidth / 2, y: mapY + mapHeight },
            { x: mapX, y: mapY + mapHeight / 2 },
            { x: mapX + mapWidth, y: mapY + mapHeight / 2 }
        ];

        positions.forEach(pos => {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(windRad);
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-5, 5);
            ctx.lineTo(0, 0);
            ctx.lineTo(5, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
        ctx.restore();
        
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`VIENTO: ${CONFIG.trueWindSpeed.toFixed(1)} kn @ ${Math.round(CONFIG.trueWindDirection)}°`, mapX + mapWidth / 2, mapY + mapHeight + 15);
    }
    
    ctx.save();
    ctx.translate(mapX + mapWidth / 2, mapY + mapHeight / 2);
    ctx.scale(-1, 1); // VOLTEAR HORIZONTALMENTE (modo espejo corregido)
    
    // Boyas (SOLO EJE X INVERTIDO)
    
    // Boyas (SOLO EJE X INVERTIDO)
    if (typeof window.trackBuoys !== 'undefined' && window.trackBuoys.length > 0) {
        window.trackBuoys.forEach(buoy => {
            const bx = -buoy.position.x * scale; // X invertido
            const bz = buoy.position.z * scale;  // Z normal
            
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(bx, bz, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }
    
    // Barco (SOLO EJE X INVERTIDO)
    const boatX = (typeof CONFIG !== 'undefined') ? -CONFIG.boatX : 0; // X invertido
    const boatZ = (typeof CONFIG !== 'undefined') ? CONFIG.boatZ : 0; // Z normal
    const boatHeading = (typeof CONFIG !== 'undefined') ? CONFIG.boatHeading : 0;

    const boatMapX = boatX * scale;
    const boatMapZ = boatZ * scale;
    
    ctx.save();
    ctx.translate(boatMapX, boatMapZ);
    ctx.rotate(degToRad(boatHeading)); // Rotación normal (no invertida)
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-3, 4);
    ctx.lineTo(3, 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, -12);
    ctx.stroke();
    
    ctx.restore();
    ctx.restore();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CAMPO DE REGATA', mapX + mapWidth / 2, mapY - 5);
}

// === HUD COMPACTO HORIZONTAL (Estilo F50 Dashboard) ===
function drawCompactHUD() {
    const x = 20;
    const y = 20;
    const width = 340;
    const height = 70;
    
    // Fondo discreto horizontal
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    const appWind = calculateApparentWind();
    const heel = CONFIG.heelAngle;
    const heading = Math.round(CONFIG.boatHeading);
    const speed = CONFIG.boatSpeed;
    
    // === SECCIÓN 1: VELOCÍMETRO (izquierda) ===
    const gaugeX = x + 45;
    const gaugeY = y + 42;
    const radius = 22;
    const maxSpeed = 50;
    
    // Arco de fondo
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, radius, Math.PI, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Arco de velocidad
    const speedRatio = Math.min(speed / maxSpeed, 1);
    const endAngle = Math.PI + (speedRatio * Math.PI);
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, radius, Math.PI, endAngle);
    ctx.strokeStyle = speed > 40 ? '#e74c3c' : (speed > 30 ? '#f39c12' : '#2ecc71');
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Texto velocidad
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(speed.toFixed(1), gaugeX, gaugeY + 4);
    ctx.font = '8px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('NUDOS', gaugeX, gaugeY + 14);
    
    // Separador
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x + 90, y + 10);
    ctx.lineTo(x + 90, y + height - 10);
    ctx.stroke();
    
    // === SECCIÓN 2: BOTE + VIENTO (centro-izquierda) ===
    const boatCX = x + 130;
    const boatCY = y + 35;
    
    ctx.save();
    ctx.translate(boatCX, boatCY);
    
    // Bote
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-5, 8);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();
    
    // Flecha de viento
    const windRad = degToRad(appWind.angle) + Math.PI / 2;
    ctx.rotate(windRad);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, -13);
    ctx.moveTo(-3, -17);
    ctx.lineTo(0, -20);
    ctx.lineTo(3, -17);
    ctx.stroke();
    ctx.restore();
    
    // Separador
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x + 170, y + 10);
    ctx.lineTo(x + 170, y + height - 10);
    ctx.stroke();
    
    // === SECCIÓN 3: BRÚJULA (centro-derecha) ===
    const compX = x + 215;
    const compY = y + 35;
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HDG', compX, compY - 14);
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`${heading}°`, compX, compY + 8);
    
    // Mini flecha de rumbo
    ctx.save();
    ctx.translate(compX, compY + 20);
    ctx.rotate(degToRad(heading));
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-3, 3);
    ctx.lineTo(3, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Separador
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x + 260, y + 10);
    ctx.lineTo(x + 260, y + height - 10);
    ctx.stroke();
    
    // === SECCIÓN 4: ESCORA (derecha) ===
    const heelX = x + 300;
    const heelY = y + 35;
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ESCORA', heelX, heelY - 14);
    
    // Barra horizontal de escora
    const barWidth = 50;
    const barHeight = 8;
    const barX = heelX - barWidth / 2;
    const barY = heelY;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    const heelRatio = Math.min(Math.abs(heel) / 45, 1);
    const fillWidth = heelRatio * barWidth;
    const heelColor = Math.abs(heel) > 30 ? '#e74c3c' : (Math.abs(heel) > 20 ? '#f39c12' : '#2ecc71');
    
    ctx.fillStyle = heelColor;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`${Math.round(heel)}°`, heelX, heelY + 22);
}

function drawGybeCrackFlash() {
    if (CONFIG.gybeCrackFlash <= 0) return;
    ctx.fillStyle = `rgba(255, 255, 255, ${CONFIG.gybeCrackFlash * 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(255, 255, 0, ${CONFIG.gybeCrackFlash})`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡CRACK!', canvas.width / 2, canvas.height / 2);
    CONFIG.gybeCrackFlash -= 0.05;
    if (CONFIG.gybeCrackFlash < 0) CONFIG.gybeCrackFlash = 0;
}

// === VISTA PREVIA DEL BARCO (Canvas 2D simplificado) ===
function drawBoatPreview() {
    const previewCanvas = document.getElementById('previewCanvas');
    if (!previewCanvas) return;
    
    const pctx = previewCanvas.getContext('2d');
    const width = previewCanvas.width;
    const height = previewCanvas.height;
    
    // Limpiar canvas
    pctx.clearRect(0, 0, width, height);
    
    // Fondo de agua
    const gradient = pctx.createLinearGradient(0, height * 0.7, 0, height);
    gradient.addColorStop(0, '#5DADE2');
    gradient.addColorStop(1, '#2874A6');
    pctx.fillStyle = gradient;
    pctx.fillRect(0, height * 0.7, width, height * 0.3);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 2.5; // Escala para que el barco se vea bien
    
    pctx.save();
    pctx.translate(centerX, centerY);
    pctx.scale(scale, scale);
    
    // Obtener colores actuales
    const hullColor = document.getElementById('colorHull').value;
    const mastColor = document.getElementById('colorMast').value;
    const flapColor = document.getElementById('colorFlap').value;
    const jibColor = document.getElementById('colorJib').value;
    
    // === CASCO IZQUIERDO (Babor) ===
    pctx.fillStyle = hullColor;
    pctx.beginPath();
    pctx.moveTo(-25, -40);
    pctx.lineTo(-15, -35);
    pctx.lineTo(-15, 30);
    pctx.lineTo(-25, 25);
    pctx.closePath();
    pctx.fill();

    // === CASCO DERECHO (Estribor) ===
    pctx.beginPath();
    pctx.moveTo(25, -40);
    pctx.lineTo(15, -35);
    pctx.lineTo(15, 30);
    pctx.lineTo(25, 25);
    pctx.closePath();
    pctx.fill();

    // === VIGAS DE CONEXIÓN ===
    pctx.fillStyle = '#bdc3c7';
    pctx.fillRect(-25, -15, 50, 4);
    pctx.fillRect(-25, 10, 50, 4);

    // === PLATAFORMA CENTRAL ===
    pctx.fillStyle = '#95a5a6';
    pctx.fillRect(-12, -12, 24, 24);

    // === FLECHA DE PROA ===
    pctx.fillStyle = '#e74c3c';
    pctx.beginPath();
    pctx.moveTo(0, -50);
    pctx.lineTo(-6, -42);
    pctx.lineTo(6, -42);
    pctx.closePath();
    pctx.fill();

    // === JIB (si está activo) ===
    const jibActive = document.getElementById('jibToggle').checked;
    if (jibActive) {
        pctx.fillStyle = jibColor;
        pctx.globalAlpha = 0.8;
        pctx.beginPath();
        pctx.moveTo(0, -55);
        pctx.lineTo(-8, -35);
        pctx.lineTo(8, -35);
        pctx.closePath();
        pctx.fill();
        pctx.globalAlpha = 1.0;
    }

    // === ALA (Mástil) ===
    const wingHeight = 60;
    pctx.fillStyle = mastColor;
    pctx.beginPath();
    pctx.ellipse(0, -10, 4, wingHeight/3, 0, 0, Math.PI * 2);
    pctx.fill();
    
    // Línea central del mástil
    pctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    pctx.lineWidth = 1;
    pctx.beginPath();
    pctx.moveTo(0, -40);
    pctx.lineTo(0, 20);
    pctx.stroke();

    // === FLAP ===
    pctx.fillStyle = flapColor;
    pctx.globalAlpha = 0.85;
    pctx.beginPath();
    pctx.ellipse(0, 15, 3, wingHeight/6, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.globalAlpha = 1.0;

    // === FOILS (siempre visibles en preview) ===
    pctx.strokeStyle = '#2c3e50';
    pctx.lineWidth = 2;
    
    // Foil izquierdo
    pctx.beginPath();
    pctx.moveTo(-20, 25);
    pctx.lineTo(-20, 45);
    pctx.stroke();
    
    // Foil derecho
    pctx.beginPath();
    pctx.moveTo(20, 25);
    pctx.lineTo(20, 45);
    pctx.stroke();
    
    // Puntas de los foils
    pctx.lineWidth = 3;
    pctx.beginPath();
    pctx.moveTo(-25, 45);
    pctx.lineTo(-15, 45);
    pctx.stroke();
    
    pctx.beginPath();
    pctx.moveTo(15, 45);
    pctx.lineTo(25, 45);
    pctx.stroke();
    
    pctx.restore();
}

// Actualizar vista previa cada vez que cambie un color
function updateBoatPreview() {
    drawBoatPreview();
}

// Conectar los inputs de color con la vista previa
document.addEventListener('DOMContentLoaded', () => {
    const colorInputs = ['colorHull', 'colorMast', 'colorFlap', 'colorJib'];
    colorInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateBoatPreview);
        }
    });
    
    const jibToggle = document.getElementById('jibToggle');
    if (jibToggle) {
        jibToggle.addEventListener('change', updateBoatPreview);
    }
    
    const wingSelector = document.getElementById('wingSelector');
    if (wingSelector) {
        wingSelector.addEventListener('change', updateBoatPreview);
    }
});

// --- INICIO ---
window.addEventListener('load', () => {
    console.log('CatamaranGP Simulator - Menú de 2 pantallas cargado correctamente');
    showConfigMenu();
    requestAnimationFrame(gameLoop);
});