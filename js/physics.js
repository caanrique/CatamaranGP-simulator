// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE FÍSICA
// Etapa 3.5.3: Ala de dos partes, jib, foils
// ============================================

// --- CONFIGURACIÓN INICIAL ---
const CONFIG = {
    trueWindSpeed: 20,
    trueWindDirection: 90,
    boatSpeed: 0,
    boatHeading: 0,
        
    // --- ESTADÍSTICAS DE MANIOBRAS ---
    totalManeuvers: 0,
    perfectManeuvers: 0,
    maneuverSuccessRate: 0,
    
    // --- ALA DE DOS PARTES ---
    sailTrim: 0,
    flapAngle: 0,
    
    // --- JIB (FOQUE) ---
        // Jib (vela de proa)
    jibActive: false,
    jibAngle: 0,  // Ángulo de apertura del jib (0 = cerrado, 30 = abierto)
    
    // --- FOILS ---
    foilHeight: 0,

        // --- PARÁMETROS DE VUELO ---
    takeoffSpeed: 13,         // Velocidad mínima (nudos) para empezar a volar
    isFlying: false,          // true = volando, false = en el agua
    nosediveRisk: 0,          // 0 a 1, probabilidad acumulada de nosedive
    nosedivePenalty: 3,       // Segundos de penalización por nosedive
    isNosediving: false,      // true = en caída violenta

        // --- MANIOBRAS ---
    isManeuvering: false,       // true = ejecutando maniobra
    maneuverType: null,         // 'tacking' o 'gybing'
    maneuverTimer: 0,           // Frames restantes de maniobra
    maneuverDuration: {
        tacking: 180,           // 3 segundos a 60fps
        gybing: 120             // 2 segundos a 60fps
    },
    previousWindSide: null,     // 'starboard' o 'port' (lado anterior del viento)
    maneuverSpeedLoss: 0.4,     // Pérdida de velocidad durante maniobra (40%)

    // --- TIMING DE MANIOBRAS ---
    optimalGybeWindow: 0.3,     // 30% del tiempo de maniobra = ventana óptima
    perfectGybeBonus: 0.5,      // 50% menos pérdida si trasluchas perfecto
    badGybePenalty: 1.5,        // 50% más pérdida si trasluchas mal
    gybeCrackFlash: 0,          // Flash visual del "crack" del ala

    nosediveTimer: 0,         // Timer de penalización
    heelWarningThreshold: 30,  // A partir de 30° muestra advertencia
    
    // --- PARÁMETROS GENERALES ---
    maxBoatSpeed: 55,
    accelerationFactor: 0.02,
    currentWing: 'medium',  // <-- COMA AÑADIDA AQUÍ

    // --- ESCORA (inclinación lateral) ---
    heelAngle: 0,
    maxHeelAngle: 45,
    heelRate: 0.5,

        // --- ESTADO DE VUELCO ---
    isCapsized: false,        // true = barco volcado
    capsizeTimer: 0,          // Contador de segundos en vuelco
    capsizePenalty: 5,        // Segundos de penalización
    capsizeCount: 0,          // Total de vuelcos en la carrera
    capsizeAnimation: 0,      // Ángulo de animación (0 a 180)

    // --- PARÁMETROS DE VOLCAMIENTO ---
    windForceMultiplier: 0.004,
    wingAreaMultiplier: {
        light: 1.3,
        medium: 1.0,
        strong: 0.7
    }, // <-- LLAVE DE CIERRE AÑADIDA AQUÍ

     // --- PESO DEL BARCO (F50 REAL) ---
    boatWeight: 2000,        // Peso del barco sin tripulación (kg)
    boatBeam: 6.0,           // Ancho entre cascos (metros) - F50 real es ~6m
    hullWeight: 1000,        // Peso del casco (kg)
    wingWeight: 1000,        // Peso del ala/mástil (kg)
};

// --- TABLAS POLARES PARA CADA CONFIGURACIÓN DE ALA ---

// ALA LIGERA (29m) - Para vientos de 7-12 nudos
const POLAR_LIGHT = {
    name: 'Ala Ligera (29m)',
    optimalWind: '7-12 nudos',
    jibAllowed: true,  // El jib SÍ se puede usar con esta ala
    angles: [0, 30, 45, 60, 90, 120, 150, 180],
    speeds: [10, 15, 20, 25, 30],
    data: [
        [  0,    0,    0,    0,    0],  // 0°
        [ 14,   20,   26,   30,   32],  // 30°
        [ 17,   24,   31,   36,   38],  // 45°
        [ 20,   28,   36,   40,   42],  // 60°
        [ 22,   31,   40,   44,   46],  // 90°
        [ 20,   29,   37,   41,   43],  // 120°
        [ 17,   24,   31,   35,   37],  // 150°
        [ 12,   17,   22,   26,   28]   // 180°
    ]
};

// ALA MEDIA (24m) - Para vientos de 12-20 nudos
const POLAR_MEDIUM = {
    name: 'Ala Media (24m)',
    optimalWind: '12-20 nudos',
    jibAllowed: true,  // El jib SÍ se puede usar con esta ala
    angles: [0, 30, 45, 60, 90, 120, 150, 180],
    speeds: [10, 15, 20, 25, 30],
    data: [
        [  0,    0,    0,    0,    0],  // 0°
        [ 12,   18,   25,   30,   33],  // 30°
        [ 15,   22,   30,   38,   42],  // 45°
        [ 18,   27,   37,   45,   48],  // 60°
        [ 20,   30,   42,   50,   52],  // 90°
        [ 18,   28,   38,   46,   48],  // 120°
        [ 15,   22,   30,   35,   38],  // 150°
        [ 10,   15,   20,   25,   28]   // 180°
    ]
};

// ALA FUERTE (18m) - Para vientos de 20+ nudos
const POLAR_STRONG = {
    name: 'Ala Fuerte (18m)',
    optimalWind: '20+ nudos',
    jibAllowed: false,  // El jib NO se puede usar con esta ala
    angles: [0, 30, 45, 60, 90, 120, 150, 180],
    speeds: [10, 15, 20, 25, 30],
    data: [
        [  0,    0,    0,    0,    0],  // 0°
        [ 10,   15,   22,   28,   32],  // 30°
        [ 12,   18,   26,   34,   40],  // 45°
        [ 15,   22,   32,   42,   48],  // 60°
        [ 17,   26,   38,   48,   54],  // 90°
        [ 16,   24,   36,   46,   52],  // 120°
        [ 14,   20,   30,   38,   44],  // 150°
        [ 10,   15,   22,   28,   34]   // 180°
    ]
};

// Diccionario de tablas polares
const POLAR_TABLES = {
    light: POLAR_LIGHT,
    medium: POLAR_MEDIUM,
    strong: POLAR_STRONG
};

function getCurrentPolar() {
    return POLAR_TABLES[CONFIG.currentWing];
}

// --- FUNCIONES DE FÍSICA BASE ---

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

function normalizeAngle(angle) {
    angle = angle % 360;
    if (angle < 0) angle += 360;
    return angle;
}

function calculateApparentWind() {
    const relativeAngle = normalizeAngle(
        CONFIG.trueWindDirection - CONFIG.boatHeading
    );

    const vx = CONFIG.trueWindSpeed * Math.cos(degToRad(relativeAngle));
    const vy = CONFIG.trueWindSpeed * Math.sin(degToRad(relativeAngle));

    const vax = vx - CONFIG.boatSpeed;
    const vay = vy;

    const vaSpeed = Math.sqrt(vax * vax + vay * vay);

    let vaAngle = radToDeg(Math.atan2(vay, vax));
    vaAngle = normalizeAngle(vaAngle);

    return {
        speed: Math.round(vaSpeed * 100) / 100,
        angle: Math.round(vaAngle * 100) / 100
    };
}

// --- CÁLCULO DE EFICIENCIA DEL FLAP ---
/**
 * Calcula el multiplicador de eficiencia según el ángulo del flap
 * El flap óptimo mejora la eficiencia (efecto de curvatura del perfil)
 * Un flap muy doblado reduce la eficiencia (stall)
 * @param {number} flapAngle - Ángulo del flap relativo (-30 a +30)
 * @returns {number} Multiplicador (0.85 a 1.15)
 */
function calculateFlapEfficiency(flapAngle) {
    // El flap óptimo está alrededor de 15-20 grados
    // Más allá de eso, empieza a hacer stall
    const optimalAngle = 18;
    const absFlap = Math.abs(flapAngle);
    
    if (absFlap <= optimalAngle) {
        // Rango óptimo: eficiencia aumenta gradualmente hasta 1.15
        return 1.0 + (absFlap / optimalAngle) * 0.15;
    } else {
        // Más allá del óptimo: eficiencia cae (stall)
        const excess = absFlap - optimalAngle;
        const maxExcess = 30 - optimalAngle; // 12 grados
        return 1.15 - (excess / maxExcess) * 0.30; // Cae hasta 0.85
    }
}

// --- CÁLCULO DEL EFECTO RANURA DEL JIB ---
/**
 * Calcula el multiplicador del efecto ranura del jib
 * El jib acelera el viento en la cara de sotavento del ala
 * @returns {number} Multiplicador (1.0 si está apagado, 1.08 si está activo)
 */
function calculateJibSlotEffect() {
    if (!CONFIG.jibActive) return 1.0;
    
    // Verificar que el jib esté permitido con el ala actual
    const polar = getCurrentPolar();
    if (!polar.jibAllowed) {
        // Si el jib está activo pero no está permitido, ignorarlo
        return 1.0;
    }
    
    // El efecto ranura mejora la velocidad máxima en ~8%
    return 1.08;
}

// --- INTERPOLACIÓN DE LA TABLA POLAR ---
function getBaseTargetSpeed(vaAngle, vaSpeed) {
    const polar = getCurrentPolar();
    const { angles, speeds, data } = polar;

    // PASO 1: Normalizar el ángulo al rango 0-180°
    // La tabla polar es simétrica: viento de 324° = viento de 36°
    let normalizedAngle = vaAngle;
    if (normalizedAngle > 180) {
        normalizedAngle = 360 - normalizedAngle;
    }

    // PASO 2: Zona muerta (solo si el viento viene muy de frente)
    if (normalizedAngle < 20 || normalizedAngle > 160) {
        // En popa cerrada (>160°) también reducimos velocidad
        if (normalizedAngle > 160) {
            // No es zona muerta total, pero es lento
            normalizedAngle = 160;
        } else {
            return 0; // Zona muerta real
        }
    }

    // PASO 3: Encontrar índices para interpolación de ángulo
    let angleIdx = 0;
    for (let i = 0; i < angles.length - 1; i++) {
        if (normalizedAngle >= angles[i] && normalizedAngle < angles[i + 1]) {
            angleIdx = i;
            break;
        }
        if (i === angles.length - 2) angleIdx = i;
    }

    // PASO 4: Encontrar índices para interpolación de velocidad
    let speedIdx = 0;
    for (let i = 0; i < speeds.length - 1; i++) {
        if (vaSpeed >= speeds[i] && vaSpeed < speeds[i + 1]) {
            speedIdx = i;
            break;
        }
        if (i === speeds.length - 2) speedIdx = i;
    }

    // PASO 5: Factores de interpolación (limitados a 0-1)
    const angleRange = angles[angleIdx + 1] - angles[angleIdx];
    const speedRange = speeds[speedIdx + 1] - speeds[speedIdx];
    
    const angleFactor = angleRange > 0 
        ? Math.max(0, Math.min(1, (normalizedAngle - angles[angleIdx]) / angleRange)) 
        : 0;
    const speedFactor = speedRange > 0 
        ? Math.max(0, Math.min(1, (vaSpeed - speeds[speedIdx]) / speedRange)) 
        : 0;

    // PASO 6: Interpolación bilineal
    const v00 = data[angleIdx][speedIdx];
    const v01 = data[angleIdx][Math.min(speedIdx + 1, speeds.length - 1)];
    const v10 = data[Math.min(angleIdx + 1, angles.length - 1)][speedIdx];
    const v11 = data[Math.min(angleIdx + 1, angles.length - 1)][Math.min(speedIdx + 1, speeds.length - 1)];

    const top = v00 + (v01 - v00) * speedFactor;
    const bottom = v10 + (v11 - v10) * speedFactor;
    const result = top + (bottom - top) * angleFactor;

    // PASO 7: NUNCA devolver valores negativos
    return Math.max(0, result);
}

// --- CÁLCULO DE EFICIENCIA DEL TRIM DEL MÁSTIL (Leading Edge) ---
function calculateSailTrimEfficiency() {
    const apparentWind = calculateApparentWind();
    const va = apparentWind.angle; // 0 a 360 grados
    
    // Calcular el ángulo óptimo de la vela según el viento aparente
    // Si el viento viene de estribor (0-180), la vela va a babor (negativo)
    // Si el viento viene de babor (180-360), la vela va a estribor (positivo)
    let optimalTrim = 0;
    if (va >= 0 && va <= 180) {
        optimalTrim = -((180 - va) * 0.5); 
    } else {
        optimalTrim = ((360 - va) * 0.5);
    }
    
    // Diferencia entre el trim actual del jugador y el óptimo
    const diff = Math.abs(CONFIG.sailTrim - optimalTrim);
    
    // Si la diferencia es 0, eficiencia 1.0 (100%)
    // Si la diferencia es 90 o más, eficiencia 0.2 (20%, la vela aletea o hace stall)
    let efficiency = 1.0 - (diff / 90) * 0.8;
    return Math.max(0.2, Math.min(1.0, efficiency));
}

// --- VELOCIDAD OBJETIVO FINAL (con todos los efectos) ---
function getTargetSpeed(vaAngle, vaSpeed) {
    // 1. Obtener velocidad base de la tabla polar
    let targetSpeed = getBaseTargetSpeed(vaAngle, vaSpeed);
    
    // 2. Eficiencia del trim del mástil (Leading Edge) <-- ¡NUEVO!
    const trimEfficiency = calculateSailTrimEfficiency();
    targetSpeed *= trimEfficiency;
    
    // 3. Eficiencia del flap trasero
    const flapEfficiency = calculateFlapEfficiency(CONFIG.flapAngle);
    targetSpeed *= flapEfficiency;
    
    // 4. Efecto ranura del jib
    const jibEffect = calculateJibSlotEffect();
    targetSpeed *= jibEffect;
    
    // 5. Limitar a velocidad máxima
    return Math.max(0, Math.min(targetSpeed, CONFIG.maxBoatSpeed));
}

// --- ACTUALIZAR VELOCIDAD DEL BARCO (con diagnóstico SEGURO) ---
let debugCounter = 0; // Contador local para evitar errores de variables externas

// --- ACTUALIZAR VELOCIDAD DEL BARCO (con vuelo) ---
function updateBoatSpeed() {
    const apparentWind = calculateApparentWind();
    let targetSpeed = getTargetSpeed(apparentWind.angle, apparentWind.speed);
    
    // Aplicar penalización por escora
    const heelPenalty = calculateHeelPenalty();
    targetSpeed *= heelPenalty;
    
    // Aplicar eficiencia de foils (actualizada)
    const foilEfficiency = calculateFoilEfficiency();
    targetSpeed *= foilEfficiency;
    
    // Diagnóstico
    debugCounter++;
    if (debugCounter % 60 === 0) {
        console.log(`[FÍSICA] VA: ${apparentWind.angle.toFixed(0)}° | Vuelo: ${CONFIG.isFlying ? 'SÍ' : 'NO'} | Foil: ${(CONFIG.foilHeight*100).toFixed(0)}% | Target: ${targetSpeed.toFixed(1)} | Escora: ${CONFIG.heelAngle.toFixed(1)}°`);
    }
    
    const delta = targetSpeed - CONFIG.boatSpeed;
    CONFIG.boatSpeed += delta * CONFIG.accelerationFactor;
    CONFIG.boatSpeed = Math.max(0, CONFIG.boatSpeed);
    
    // Actualizar escora
    updateHeelAngle();
    
    // Actualizar estado de vuelo
    updateFlightState();

        // Detectar y actualizar maniobras
    detectManeuver();
    updateManeuver();
    
    return CONFIG.boatSpeed;
}

// --- ACTUALIZAR VELOCIDAD DEL BARCO ---
// --- CALCULAR MOMENTO DE VUELCO ---
function calculateHeelingMoment() {
    const apparentWind = calculateApparentWind();
    const wingFactor = CONFIG.wingAreaMultiplier[CONFIG.currentWing];
    
    // El momento de vuelco depende de:
    // 1. Velocidad del viento aparente (al cuadrado, como la fuerza real)
    // 2. Tamaño del ala (más área = más fuerza)
    // 3. Ángulo del viento (máximo en través, mínimo en proa/popa)
    const windForce = apparentWind.speed * apparentWind.speed * CONFIG.windForceMultiplier * wingFactor;
    
    // Factor angular: máximo en través (90°), mínimo en proa/popa
    const angleFactor = Math.sin(degToRad(apparentWind.angle));
    
    return windForce * angleFactor;
}

// --- CALCULAR MOMENTO DE ENDEREZAMIENTO TOTAL ---
function calculateRightingMomentFromCrew() {
    const weightDist = calculateWeightDistribution();
    const gravity = 9.81;
    
    // === PARTE 1: MOMENTO BASE DEL BARCO ===
    // El peso del barco (2000kg) distribuido en los dos cascos
    // proporciona un momento de enderezamiento base constante
    // Fórmula: peso × (beam/2) × gravedad × factor de escala
    const boatRightingMoment = CONFIG.boatWeight * (CONFIG.boatBeam / 2) * gravity * 0.01;
    
    // === PARTE 2: MOMENTO ADICIONAL DE LA TRIPULACIÓN ===
    // Los tripulantes en el lado de barlovento añaden momento extra
    const apparentWind = calculateApparentWind();
    const windFromStarboard = apparentWind.angle > 0 && apparentWind.angle < 180;
    
    const weatherWeight = windFromStarboard ? weightDist.starboard : weightDist.port;
    const leeWeight = windFromStarboard ? weightDist.port : weightDist.starboard;
    
    // La tripulación contribuye según la diferencia de peso entre cascos
    const crewRightingMoment = (weatherWeight - leeWeight) * CONFIG.boatBeam * gravity * 0.01;
    
    // === MOMENTO TOTAL ===
    // El barco aporta ~85% del enderezamiento, la tripulación ~15%
    return boatRightingMoment + crewRightingMoment;
}

// --- ACTUALIZAR ESCORA Y DETECTAR VUELCO ---
function updateHeelAngle() {
    // Si ya está volcado, no calcular más escora
    if (CONFIG.isCapsized) {
        updateCapsizeAnimation();
        return CONFIG.heelAngle;
    }
    
    const heelingMoment = calculateHeelingMoment();
    const rightingMoment = calculateRightingMomentFromCrew();
    
    const netMoment = heelingMoment - rightingMoment;
    
    if (netMoment > 0) {
        CONFIG.heelAngle += netMoment * 0.002;
    } else {
        CONFIG.heelAngle -= Math.abs(netMoment) * 0.005;
    }
    
    CONFIG.heelAngle = Math.max(0, Math.min(CONFIG.maxHeelAngle, CONFIG.heelAngle));
    
    // DETECCIÓN DE VUELCO
    if (CONFIG.heelAngle >= CONFIG.maxHeelAngle) {
        triggerCapsize();
    }
    
    return CONFIG.heelAngle;
}

// --- DETONAR VUELCO ---
function triggerCapsize() {
    if (CONFIG.isCapsized) return; // Evitar múltiples triggers
    
    CONFIG.isCapsized = true;
    CONFIG.capsizeTimer = CONFIG.capsizePenalty * 60; // 60 frames por segundo
    CONFIG.capsizeCount++;
    CONFIG.boatSpeed = 0; // Detener el barco inmediatamente
    
    console.log(`¡VOLCÓ! Vuelco #${CONFIG.capsizeCount}`);
        
    playCapsizeSound();
}

// --- ANIMACIÓN DEL VUELCO ---
function updateCapsizeAnimation() {
    // Animar la rotación del barco de 0 a 180 grados
    if (CONFIG.capsizeAnimation < 180) {
        CONFIG.capsizeAnimation += 3; // Velocidad de rotación
        CONFIG.capsizeAnimation = Math.min(180, CONFIG.capsizeAnimation);
    }
    
    // Contador de penalización
    if (CONFIG.capsizeTimer > 0) {
        CONFIG.capsizeTimer--;
        
        // Reiniciar después de la penalización
        if (CONFIG.capsizeTimer === 0) {
            resetAfterCapsize();
        }
    }
}

// --- REINICIAR DESPUÉS DEL VUELCO ---
function resetAfterCapsize() {
    CONFIG.isCapsized = false;
    CONFIG.heelAngle = 0;
    CONFIG.capsizeAnimation = 0;
    CONFIG.boatSpeed = 0;
    
    console.log('Barco reiniciado después del vuelco');
}

// --- PENALIZACIÓN DE VELOCIDAD POR ESCORA ---
function calculateHeelPenalty() {
    // Cuanto más inclinado, menos eficiente
    // 0° = 100% eficiencia, 45° = 50% eficiencia
    const penalty = 1 - (CONFIG.heelAngle / CONFIG.maxHeelAngle) * 0.3;
    return penalty;
}

// --- ACTUALIZAR VELOCIDAD DEL BARCO (con diagnóstico) ---
function updateBoatSpeed() {
    const apparentWind = calculateApparentWind();
    let targetSpeed = getTargetSpeed(apparentWind.angle, apparentWind.speed);
    
    // 1. Penalización por escora
    const heelPenalty = calculateHeelPenalty();
    targetSpeed *= heelPenalty;
    
    // 2. Eficiencia de los foils
    const foilEfficiency = 0.6 + CONFIG.foilHeight * 0.4;
    targetSpeed *= foilEfficiency;
    
    // --- DIAGNÓSTICO EN CONSOLA (se imprime 1 vez por segundo aprox) ---
    if (gameState.frameCount % 60 === 0) {
        console.log(`[FÍSICA] VA: ${apparentWind.angle.toFixed(0)}° | Target Base: ${getBaseTargetSpeed(apparentWind.angle, apparentWind.speed).toFixed(1)} | Target Final: ${targetSpeed.toFixed(1)} | Escora: ${CONFIG.heelAngle.toFixed(1)}°`);
    }
    
    const delta = targetSpeed - CONFIG.boatSpeed;
    CONFIG.boatSpeed += delta * CONFIG.accelerationFactor;
    CONFIG.boatSpeed = Math.max(0, CONFIG.boatSpeed);
    
    // Actualizar escora
    updateHeelAngle();
    
    return CONFIG.boatSpeed;
}

// --- ACTUALIZAR ESTADO DE VUELO ---
function updateFlightState() {
    // Si está en nosedive, no calcular vuelo normal
    if (CONFIG.isNosediving) {
        updateNosedive();
        return;
    }
    
    // Si está volcado, tampoco
    if (CONFIG.isCapsized) return;
    
    // Calcular si debería estar volando
    const shouldFly = CONFIG.boatSpeed >= CONFIG.takeoffSpeed && CONFIG.foilHeight > 0.1;
    
    // Transición suave entre estados
    if (shouldFly && !CONFIG.isFlying) {
        CONFIG.isFlying = true;
        console.log('🛩️ ¡DESPEGUE! El barco está volando');
        if (shouldFly && !CONFIG.isFlying) {
        CONFIG.isFlying = true;
        console.log('🛩️ ¡DESPEGUE! El barco está volando');
        playTakeoffSound();
    }
    } else if (!shouldFly && CONFIG.isFlying) {
        CONFIG.isFlying = false;
        console.log('🌊 El barco volvió al agua');
    }
    
    // Calcular riesgo de nosedive
    updateNosediveRisk();
}

// --- CALCULAR RIESGO DE NOSDIVE ---
function updateNosediveRisk() {
    // El riesgo aumenta si:
    // 1. El foilHeight está muy alto (> 0.85)
    // 2. La velocidad es muy alta (> 40 nudos)
    // 3. Hay cambios bruscos de rumbo
    
    if (!CONFIG.isFlying) {
        CONFIG.nosediveRisk = 0;
        return;
    }
    
    let riskIncrease = 0;
    
    // Factor 1: Altura muy alta
    if (CONFIG.foilHeight > 0.85) {
        riskIncrease += (CONFIG.foilHeight - 0.85) * 0.05;
    }
    
    // Factor 2: Velocidad muy alta
    if (CONFIG.boatSpeed > 40) {
        riskIncrease += (CONFIG.boatSpeed - 40) * 0.002;
    }
    
    // Factor 3: Escora alta mientras vuela
    if (CONFIG.heelAngle > 20) {
        riskIncrease += (CONFIG.heelAngle - 20) * 0.003;
    }
    
    CONFIG.nosediveRisk += riskIncrease;
    
    // Reducir riesgo gradualmente si las condiciones son buenas
    if (riskIncrease === 0) {
        CONFIG.nosediveRisk = Math.max(0, CONFIG.nosediveRisk - 0.01);
    }
    
    // Limitar entre 0 y 1
    CONFIG.nosediveRisk = Math.max(0, Math.min(1, CONFIG.nosediveRisk));
    
    // Probabilidad de nosedive: si el riesgo es alto, puede ocurrir
    if (CONFIG.nosediveRisk > 0.8 && Math.random() < 0.005) {
        triggerNosedive();
    }
}

// --- DETONAR NOSDIVE ---
function triggerNosedive() {
    if (CONFIG.isNosediving) return;
    
    CONFIG.isNosediving = true;
    CONFIG.nosediveTimer = CONFIG.nosedivePenalty * 60;
    CONFIG.isFlying = false;
    CONFIG.foilHeight = 0;
    CONFIG.boatSpeed *= 0.3; // Pierde 70% de velocidad
    CONFIG.nosediveRisk = 0;
    
    console.log('💥 ¡NOSEDIVE! Caída violenta');

    playNosediveSound();
}

// --- ACTUALIZAR NOSDIVE ---
function updateNosedive() {
    if (CONFIG.nosediveTimer > 0) {
        CONFIG.nosediveTimer--;
        
        // Recuperación gradual de velocidad
        CONFIG.boatSpeed *= 0.98;
        
        if (CONFIG.nosediveTimer === 0) {
            CONFIG.isNosediving = false;
            console.log('Recuperado del nosedive');
        }
    }
}

// --- CALCULAR EFICIENCIA DE FOILS (actualizada) ---
function calculateFoilEfficiency() {
    // Si está en el agua, eficiencia baja
    if (!CONFIG.isFlying) {
        return 0.6; // 60% de eficiencia (alta resistencia)
    }
    
    // Si está volando, eficiencia depende de la altura
    // Óptimo: 0.5 a 0.8 (vuelo estable)
    // Muy bajo (< 0.3): casi en el agua
    // Muy alto (> 0.9): riesgo de nosedive pero máxima velocidad
    
    if (CONFIG.foilHeight < 0.3) {
        return 0.6 + (CONFIG.foilHeight / 0.3) * 0.2; // 0.6 a 0.8
    } else if (CONFIG.foilHeight <= 0.8) {
        return 0.8 + ((CONFIG.foilHeight - 0.3) / 0.5) * 0.2; // 0.8 a 1.0
    } else {
        return 1.0; // Máxima eficiencia, pero con riesgo
    }
}

// --- DETECTAR EL LADO DEL VIENTO APARENTE ---
function getWindSide(vaAngle) {
    // Viento de estribor: 0°-180°
    // Viento de babor: 180°-360°
    if (vaAngle >= 0 && vaAngle <= 180) {
        return 'starboard';
    } else {
        return 'port';
    }
}

// --- DETECTAR MANIOBRA AUTOMÁTICAMENTE ---
function detectManeuver() {
    // No detectar si ya estamos en maniobra o volcado
    if (CONFIG.isManeuvering || CONFIG.isCapsized || CONFIG.isNosediving) {
        return;
    }
    
    const apparentWind = calculateApparentWind();
    const currentSide = getWindSide(apparentWind.angle);
    
    // Si no tenemos lado anterior, guardarlo y salir
    if (CONFIG.previousWindSide === null) {
        CONFIG.previousWindSide = currentSide;
        return;
    }
    
    // Si el lado cambió, detectamos una maniobra
    if (currentSide !== CONFIG.previousWindSide) {
        // Determinar si es virada o trasluchada según el ángulo
        // Zona de virada: viento cerca de proa (0°-40° o 320°-360°)
        // Zona de trasluchada: viento cerca de popa (140°-220°)
        
        const vaAngle = apparentWind.angle;
        const isNearBow = (vaAngle < 40 || vaAngle > 320);
        const isNearStern = (vaAngle > 140 && vaAngle < 220);
        
        if (isNearBow) {
            triggerManeuver('tacking');
        } else if (isNearStern) {
            triggerManeuver('gybing');
        } else {
            // El viento cambió de lado en zona intermedia
            // Esto no debería pasar normalmente, pero lo registramos
            console.log(`Viento cambió de lado en zona intermedia: ${vaAngle.toFixed(0)}°`);
        }
    }
    
    CONFIG.previousWindSide = currentSide;
}

// --- DETONAR MANIOBRA (refinada) ---
function triggerManeuver(type) {
    CONFIG.totalManeuvers++;
    CONFIG.isManeuvering = true;
    CONFIG.maneuverType = type;
    
    // Duración base según tipo
    let duration = CONFIG.maneuverDuration[type];
    
    // Ajuste según tamaño del ala
    const wingDurationMultiplier = {
        light: 1.3,    // Ala grande = maniobra más lenta
        medium: 1.0,   // Ala media = estándar
        strong: 0.7    // Ala pequeña = maniobra más rápida
    };
    duration *= wingDurationMultiplier[CONFIG.currentWing];
    CONFIG.maneuverTimer = Math.round(duration);
    
    // Pérdida de velocidad según tipo y ala
    const baseSpeedLoss = CONFIG.maneuverSpeedLoss;
    const wingLossMultiplier = {
        light: 1.2,    // Ala grande = más pérdida
        medium: 1.0,
        strong: 0.8    // Ala pequeña = menos pérdida
    };
    CONFIG.currentManeuverSpeedLoss = baseSpeedLoss * wingLossMultiplier[CONFIG.currentWing];
    
    console.log(`🔄 ¡${type === 'tacking' ? 'VIRADA' : 'TRASLUCHADA'}! (${(duration/60).toFixed(1)}s)`);
    
    // En la trasluchada, si el flap está muy abierto, hay riesgo de vuelco
    if (type === 'gybing') {
        const flapRisk = Math.abs(CONFIG.flapAngle) / 30;
        if (flapRisk > 0.5) {
            CONFIG.heelAngle += flapRisk * 10;
            console.log(`⚠️ Trasluchada arriesgada: flap a ${Math.abs(CONFIG.flapAngle).toFixed(0)}°`);
        }
    }
        // Reproducir sonido según tipo
    if (type === 'tacking') {
        playTackingSound();
    } else if (type === 'gybing') {
        playGybingSound();
    }
}

// --- ACTUALIZAR MANIOBRA (refinada y completa) ---
function updateManeuver() {
    if (!CONFIG.isManeuvering) return;
    
    CONFIG.maneuverTimer--;
    
    // Progreso de la maniobra (0 al inicio, 1 al final)
    const totalDuration = CONFIG.maneuverDuration[CONFIG.maneuverType];
    const progress = 1 - (CONFIG.maneuverTimer / totalDuration);
    
    // Pérdida de velocidad con curva sinusoidal (máxima pérdida en el medio de la maniobra)
    let speedMultiplier = 1 - (Math.sin(progress * Math.PI) * (CONFIG.currentManeuverSpeedLoss || CONFIG.maneuverSpeedLoss));
    
    // Ajuste según timing (solo en trasluchada)
    if (CONFIG.maneuverType === 'gybing') {
        if (typeof gybeTimingPressed !== 'undefined' && gybeTimingPressed) {
            // Timing perfecto: 50% menos pérdida de velocidad
            speedMultiplier = 1 - (Math.sin(progress * Math.PI) * (CONFIG.currentManeuverSpeedLoss || CONFIG.maneuverSpeedLoss) * 0.5);
        } else if (progress > 0.5 && !(typeof gybeTimingPressed !== 'undefined' && gybeTimingPressed)) {
            // Pasó la ventana óptima sin presionar: 50% más pérdida de velocidad
            speedMultiplier = 1 - (Math.sin(progress * Math.PI) * (CONFIG.currentManeuverSpeedLoss || CONFIG.maneuverSpeedLoss) * 1.5);
        }
    }
    
    CONFIG.boatSpeed *= speedMultiplier;
    
    // === ANIMACIÓN DEL ALA CON INTERPOLACIÓN SUAVE ===
    
    // En virada: el ala cambia de lado gradualmente
    if (CONFIG.maneuverType === 'tacking') {
        const targetTrim = -CONFIG.sailTrim;
        const targetFlap = -CONFIG.flapAngle;
        
        // Interpolación sinusoidal: lenta al inicio y final, rápida en el medio
        const easeFactor = Math.sin(progress * Math.PI) * 0.15;
        
        CONFIG.sailTrim += (targetTrim - CONFIG.sailTrim) * easeFactor;
        CONFIG.flapAngle += (targetFlap - CONFIG.flapAngle) * easeFactor;
    }
    
    // En trasluchada: el flap y el mástil se invierten más rápido
    if (CONFIG.maneuverType === 'gybing') {
        const targetFlap = -CONFIG.flapAngle;
        const targetTrim = -CONFIG.sailTrim;
        
        // Interpolación más rápida para la trasluchada
        const easeFactor = Math.sin(progress * Math.PI) * 0.20;
        
        CONFIG.flapAngle += (targetFlap - CONFIG.flapAngle) * easeFactor;
        CONFIG.sailTrim += (targetTrim - CONFIG.sailTrim) * (easeFactor * 0.8);
    }
    
    // Finalizar maniobra
    if (CONFIG.maneuverTimer <= 0) {
        CONFIG.isManeuvering = false;
        CONFIG.maneuverType = null;
        CONFIG.currentManeuverSpeedLoss = 0;
        console.log('✅ Maniobra completada');
    }
}

// --- FUNCIONES DE CONTROL ---

/**
 * Cambia el ala actual
 */
function setWing(wingType) {
    if (POLAR_TABLES[wingType]) {
        CONFIG.currentWing = wingType;
        
        // Si el ala no permite jib, desactivarlo automáticamente
        if (!POLAR_TABLES[wingType].jibAllowed && CONFIG.jibActive) {
            CONFIG.jibActive = false;
            console.log('Jib desactivado automáticamente (no permitido con esta ala)');
        }
        
        console.log(`Ala cambiada a: ${POLAR_TABLES[wingType].name}`);
    }
}

/**
 * Activa o desactiva el jib
 * @returns {boolean} true si se pudo cambiar, false si no está permitido
 */
function toggleJib() {
    const polar = getCurrentPolar();
    
    if (!polar.jibAllowed) {
        console.log('El jib NO está permitido con el ala actual');
        return false;
    }
    
    CONFIG.jibActive = !CONFIG.jibActive;
    console.log(`Jib: ${CONFIG.jibActive ? 'ACTIVADO' : 'DESACTIVADO'}`);
    return true;
}

/**
 * Obtiene el ángulo absoluto del flap (respecto al barco)
 * @returns {number} Ángulo absoluto en grados
 */
function getAbsoluteFlapAngle() {
    return CONFIG.sailTrim + CONFIG.flapAngle;
}

/**
 * Ajusta la altura de los foils (preparado para Etapa 4)
 * @param {number} height - 0 (en agua) a 1 (máxima altura)
 */
function setFoilHeight(height) {
    CONFIG.foilHeight = Math.max(0, Math.min(1, height));
}

/**
 * Obtiene información completa del estado del barco (para HUD/debug)
 */
function getBoatStatus() {
    return {
        speed: CONFIG.boatSpeed,
        heading: CONFIG.boatHeading,
        leadingEdgeAngle: CONFIG.sailTrim,
        flapAngle: CONFIG.flapAngle,
        absoluteFlapAngle: getAbsoluteFlapAngle(),
        flapEfficiency: calculateFlapEfficiency(CONFIG.flapAngle),
        jibActive: CONFIG.jibActive,
        jibAllowed: getCurrentPolar().jibAllowed,
        foilHeight: CONFIG.foilHeight,
        apparentWind: calculateApparentWind(),
        wing: CONFIG.currentWing
    };
}