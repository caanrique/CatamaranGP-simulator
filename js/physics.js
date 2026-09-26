// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE FÍSICA
// Versión Final: Maniobras con desaceleración natural (sin rebotes)
// ============================================

const CONFIG = {
    boatX: 0,
    boatZ: 0,
    fieldHalfWidth: 2000,
    fieldHalfHeight: 1000,
    trueWindSpeed: 20,
    trueWindDirection: 90,
    baseWindSpeed: 20,
    baseWindDirection: 90,
    windCondition: 'intermediate',
    lastWindShiftTime: 0,
    windShiftInterval: 10000,
    boatSpeed: 0,
    boatHeading: 0,
    totalManeuvers: 0,
    perfectManeuvers: 0,
    maneuverSuccessRate: 0,
    sailTrim: 0,
    flapAngle: 0,
    jibActive: false,
    jibInflation: 1.0,
    jibAngle: 0,
    foilHeight: 0,
    takeoffSpeed: 13,
    isFlying: false,
    nosediveRisk: 0,
    nosedivePenalty: 8,
    isNosediving: false,
    isManeuvering: false,
    maneuverType: null,
    maneuverTimer: 0,
    maneuverDuration: { tacking: 180, gybing: 120 },
    previousWindSide: null,
    maneuverSpeedLoss: 0.4,
    optimalGybeWindow: 0.3,
    perfectGybeBonus: 0.5,
    badGybePenalty: 1.5,
    gybeCrackFlash: 0,
    nosediveTimer: 0,
    heelWarningThreshold: 30,
    maxBoatSpeed: 55,
    accelerationFactor: 0.02,
    currentWing: 'medium',
    heelAngle: 0,
    maxHeelAngle: 45,
    heelRate: 0.5,
    isCapsized: false,
    capsizeTimer: 0,
    capsizePenalty: 8,
    capsizeCount: 0,
    capsizeAnimation: 0,
    windForceMultiplier: 0.004,
    wingAreaMultiplier: { light: 1.3, medium: 1.0, strong: 0.7 },
    boatWeight: 2000,
    boatBeam: 6.0,
    hullWeight: 1000,
    wingWeight: 1000
};

const POLAR_LIGHT = {
    name: 'Ala Ligera (29m)', optimalWind: '7-12 nudos', jibAllowed: true,
    angles: [0, 30, 45, 60, 90, 120, 150, 180], speeds: [10, 15, 20, 25, 30],
    data: [[0,0,0,0,0], [14,20,26,30,32], [17,24,31,36,38], [20,28,36,40,42], [22,31,40,44,46], [20,29,37,41,43], [17,24,31,35,37], [12,17,22,26,28]]
};

const POLAR_MEDIUM = {
    name: 'Ala Media (24m)', optimalWind: '12-20 nudos', jibAllowed: true,
    angles: [0, 30, 45, 60, 90, 120, 150, 180], speeds: [10, 15, 20, 25, 30],
    data: [[0,0,0,0,0], [12,18,25,30,33], [15,22,30,38,42], [18,27,37,45,48], [20,30,42,50,52], [18,28,38,46,48], [15,22,30,35,38], [10,15,20,25,28]]
};

const POLAR_STRONG = {
    name: 'Ala Fuerte (18m)', optimalWind: '20+ nudos', jibAllowed: false,
    angles: [0, 30, 45, 60, 90, 120, 150, 180], speeds: [10, 15, 20, 25, 30],
    data: [[0,0,0,0,0], [10,15,22,28,32], [12,18,26,34,40], [15,22,32,42,48], [17,26,38,48,54], [16,24,36,46,52], [14,20,30,38,44], [10,15,22,28,34]]
};

const POLAR_TABLES = { light: POLAR_LIGHT, medium: POLAR_MEDIUM, strong: POLAR_STRONG };

function getCurrentPolar() { return POLAR_TABLES[CONFIG.currentWing]; }
function degToRad(deg) { return deg * (Math.PI / 180); }
function radToDeg(rad) { return rad * (180 / Math.PI); }
function normalizeAngle(angle) { angle = angle % 360; return angle < 0 ? angle + 360 : angle; }

function calculateApparentWind() {
    const relAngle = normalizeAngle(CONFIG.trueWindDirection - CONFIG.boatHeading);
    const vx = CONFIG.trueWindSpeed * Math.cos(degToRad(relAngle));
    const vy = CONFIG.trueWindSpeed * Math.sin(degToRad(relAngle));
    const vax = vx - CONFIG.boatSpeed;
    const vaSpeed = Math.sqrt(vax * vax + vy * vy);
    let vaAngle = radToDeg(Math.atan2(vy, vax));
    return { speed: Math.round(vaSpeed * 100) / 100, angle: normalizeAngle(vaAngle) };
}

function calculateFlapEfficiency(flapAngle) {
    const optimal = 18, absFlap = Math.abs(flapAngle);
    if (absFlap <= optimal) return 1.0 + (absFlap / optimal) * 0.15;
    return 1.15 - ((absFlap - optimal) / 12) * 0.30;
}

function calculateJibSlotEffect() {
    if (!CONFIG.jibActive || !getCurrentPolar().jibAllowed) return 1.0;
    
    const va = calculateApparentWind().angle;
    let normAngle = va > 180 ? 360 - va : va;
    
    let jibBonus = 0;
    if (normAngle >= 30 && normAngle <= 120) {
        jibBonus = 0.08;
    } else if (normAngle >= 20 && normAngle < 30) {
        jibBonus = 0.08 * ((normAngle - 20) / 10);
    } else if (normAngle > 120 && normAngle <= 140) {
        jibBonus = 0.08 * ((140 - normAngle) / 20);
    }
    
    // LA CLAVE: El bono se multiplica por el nivel de inflado. 
    // Si viene de una maniobra, empieza en 0 y sube suavemente, sin estornudos.
    return 1.0 + (jibBonus * CONFIG.jibInflation);
}

function getBaseTargetSpeed(vaAngle, vaSpeed) {
    const polar = getCurrentPolar();
    let normAngle = vaAngle > 180 ? 360 - vaAngle : vaAngle;
    if (normAngle < 20) return 0;
    if (normAngle > 160) normAngle = 160;

    const maxTableSpeed = polar.speeds[polar.speeds.length - 1];
    const minTableSpeed = polar.speeds[0];
    const clampedVaSpeed = Math.max(minTableSpeed, Math.min(vaSpeed, maxTableSpeed));

    let aIdx = 0;
    for (let i = 0; i < polar.angles.length - 1; i++) {
        if (normAngle >= polar.angles[i] && normAngle <= polar.angles[i+1]) {
            aIdx = i;
            break;
        }
    }

    let sIdx = 0;
    for (let i = 0; i < polar.speeds.length - 1; i++) {
        if (clampedVaSpeed >= polar.speeds[i] && clampedVaSpeed <= polar.speeds[i+1]) {
            sIdx = i;
            break;
        }
    }

    const aF = (normAngle - polar.angles[aIdx]) / (polar.angles[aIdx+1] - polar.angles[aIdx]);
    const sF = (clampedVaSpeed - polar.speeds[sIdx]) / (polar.speeds[sIdx+1] - polar.speeds[sIdx]);

    const v00 = polar.data[aIdx][sIdx];
    const v01 = polar.data[aIdx][sIdx + 1];
    const v10 = polar.data[aIdx + 1][sIdx];
    const v11 = polar.data[aIdx + 1][sIdx + 1];

    const speedLower = v00 + (v01 - v00) * sF;
    const speedUpper = v10 + (v11 - v10) * sF;
    
    return Math.max(0, speedLower + (speedUpper - speedLower) * aF);
}

function calculateSailTrimEfficiency() {
    const va = calculateApparentWind().angle;
    let optimal;
    if (va <= 180) {
        optimal = ((180 - va) * 0.5);
    } else {
        optimal = -((360 - va) * 0.5);
    }
    const diff = Math.abs(CONFIG.sailTrim - optimal);
    return Math.max(0.2, Math.min(1.0, 1.0 - (diff / 90) * 0.8));
}

function getTargetSpeed(vaAngle, vaSpeed) {
    let speed = getBaseTargetSpeed(vaAngle, vaSpeed);
    speed *= calculateSailTrimEfficiency();
    speed *= calculateFlapEfficiency(CONFIG.flapAngle);
    speed *= calculateJibSlotEffect();
    
    let absoluteMaxSpeed = 55; 
    if (CONFIG.windCondition === 'light') absoluteMaxSpeed = 26; 
    else if (CONFIG.windCondition === 'intermediate') absoluteMaxSpeed = 40; 
    
    return Math.max(0, Math.min(speed, absoluteMaxSpeed));
}

function updateBoatSpeed() {
    if (CONFIG.isCapsized) {
        updateCapsizeAnimation();
        return CONFIG.boatSpeed; 
    }
    if (CONFIG.isNosediving) {
        updateNosedive();
        return CONFIG.boatSpeed; 
    }

    updateDynamicWind();
    
    const aw = calculateApparentWind();
    let target = getTargetSpeed(aw.angle, aw.speed);
    
    // CORREGIDO: Usar valor absoluto para penalizar la velocidad sin importar el lado de la escora
    target *= (1 - (Math.abs(CONFIG.heelAngle) / CONFIG.maxHeelAngle) * 0.3);
    target *= calculateFoilEfficiency();
    
    CONFIG.boatSpeed += (target - CONFIG.boatSpeed) * CONFIG.accelerationFactor;
    CONFIG.boatSpeed = Math.max(0, CONFIG.boatSpeed);
    
    updateHeelAngle();
    updateFlightState();
    detectManeuver();
    updateManeuver(); // <--- Esto ahora aplica la resta de velocidad de forma natural
    updateBoatPosition();
    
    return CONFIG.boatSpeed;
}

function updateBoatPosition() {
    const speedFactor = CONFIG.boatSpeed * 0.04; 
    const headingRad = degToRad(CONFIG.boatHeading);
    
    let newX = CONFIG.boatX - Math.sin(headingRad) * speedFactor;
    let newZ = CONFIG.boatZ - Math.cos(headingRad) * speedFactor;
    
    const FIELD_HALF_WIDTH = 2000;
    const FIELD_HALF_HEIGHT = 1000;
    const MARGIN = 20;
    
    if (newX > FIELD_HALF_WIDTH - MARGIN) {
        newX = FIELD_HALF_WIDTH - MARGIN;
        CONFIG.boatSpeed *= 0.5;
    } else if (newX < -FIELD_HALF_WIDTH + MARGIN) {
        newX = -FIELD_HALF_WIDTH + MARGIN;
        CONFIG.boatSpeed *= 0.5;
    }
    if (newZ > FIELD_HALF_HEIGHT - MARGIN) {
        newZ = FIELD_HALF_HEIGHT - MARGIN;
        CONFIG.boatSpeed *= 0.5;
    } else if (newZ < -FIELD_HALF_HEIGHT + MARGIN) {
        newZ = -FIELD_HALF_HEIGHT + MARGIN;
        CONFIG.boatSpeed *= 0.5;
    }
    
    CONFIG.boatX = newX;
    CONFIG.boatZ = newZ;
    
    if (typeof boatGroup !== 'undefined' && boatGroup) {
        boatGroup.position.x = CONFIG.boatX;
        boatGroup.position.z = CONFIG.boatZ;
    }
}

function calculateWeightDistribution() {
    if (typeof CrewState === 'undefined' || !CrewState.positions) return { port: 170, starboard: 170 };
    let port = 0, starboard = 0;
    for (const role in CrewState.positions) {
        if (CrewState.positions[role].hull === 'port') port += 85;
        else starboard += 85;
    }
    return { port, starboard };
}

function updateHeelAngle() {
    if (CONFIG.isCapsized || CONFIG.isNosediving) return CONFIG.heelAngle;
    
    const aw = calculateApparentWind();
    const wingFactor = CONFIG.wingAreaMultiplier[CONFIG.currentWing];
    
    // Fuerza del viento (reducida para un barco de 2+ toneladas)
    const windPush = (aw.speed * aw.speed) * 0.005 * wingFactor;
    
    // heelingForce: 
    // Positivo (viento de estribor) = empuja a escorar a babor (+ rotation.z)
    // Negativo (viento de babor) = empuja a escorar a estribor (- rotation.z)
    const heelingForce = windPush * Math.sin(degToRad(aw.angle));
    
    const wd = calculateWeightDistribution();
    
    // crewMoment: Fórmula simétrica. 
    // Si hay más peso a babor (wd.port > wd.starboard), el valor es positivo (empuja a escorar a babor).
    // Si hay más peso a estribor, el valor es negativo (empuja a escorar a estribor).
    // Esto contrarresta o suma a heelingForce de forma 100% realista.
       // crewMoment: Drásticamente reducido para reflejar un barco de 2000+ kg
    // La tripulación ahora tiene un efecto sutil y progresivo, no un golpe brusco
    let crewMoment = 0;
    if (aw.speed > 18) {
        const windStrengthFactor = Math.min(1.0, (aw.speed - 18) / 15);
        crewMoment = (wd.port - wd.starboard) * 0.005 * windStrengthFactor; // Reducido de 0.12 a 0.005
    } else {
        crewMoment = (wd.port - wd.starboard) * 0.001; // Reducido de 0.02 a 0.001 (casi imperceptible)
    }
    
    const flightStability = CONFIG.isFlying ? 0.9 : 1.0;
    
    // Fuerza neta de escora
    let netForce = (heelingForce + crewMoment) * flightStability;
    
    // targetHeel: 
    // Positivo = escora a babor (babor se hunde, estribor sube)
    // Negativo = escora a estribor (estribor se hunde, babor sube)
    let targetHeel = netForce * 0.8;
    
    // Suavizado del movimiento (lerp)
    if (CONFIG.heelAngle < targetHeel) {
        CONFIG.heelAngle += (targetHeel - CONFIG.heelAngle) * 0.04;
    } else {
        CONFIG.heelAngle += (targetHeel - CONFIG.heelAngle) * 0.1;
    }
    
    // Vuelco: si la escora ABSOLUTA supera el límite (45°)
    if (Math.abs(CONFIG.heelAngle) >= CONFIG.maxHeelAngle) {
        triggerCapsize();
    }
    
    return CONFIG.heelAngle;
}

function triggerCapsize() {
    if (CONFIG.isCapsized) return;
    CONFIG.isCapsized = true;
    CONFIG.capsizeTimer = CONFIG.capsizePenalty * 60;
    CONFIG.capsizeCount++;
    CONFIG.boatSpeed = 0;
    console.log(`💥 ¡VOLCÓ! Vuelco #${CONFIG.capsizeCount}`);
}

function updateCapsizeAnimation() {
    if (CONFIG.capsizeAnimation < 180) {
        CONFIG.capsizeAnimation += 4; 
        CONFIG.capsizeAnimation = Math.min(180, CONFIG.capsizeAnimation);
    }
    if (CONFIG.capsizeTimer > 0) {
        CONFIG.capsizeTimer--;
        if (CONFIG.capsizeTimer === 0) {
            CONFIG.isCapsized = false;
            CONFIG.heelAngle = 0;
            CONFIG.capsizeAnimation = 0;
            CONFIG.boatSpeed = 0;
            CONFIG.foilHeight = 0;
            CONFIG.isFlying = false;
            console.log('✅ Barco enderezado automáticamente. Listo para navegar.');
        }
    }
}

function updateFlightState() {
    if (CONFIG.isNosediving || CONFIG.isCapsized) return;
    let targetFoil = 0, shouldFly = false;
    const spd = CONFIG.boatSpeed;

    if (spd < 10) targetFoil = 0;
    else if (spd < 14) targetFoil = ((spd - 10) / 4) * 0.3;
    else if (spd < 18) targetFoil = 0.3 + ((spd - 14) / 4) * 0.5;
    else { targetFoil = 1.0; shouldFly = true; }

    CONFIG.foilHeight += (targetFoil - CONFIG.foilHeight) * 0.015;

    if (shouldFly && !CONFIG.isFlying) { CONFIG.isFlying = true; console.log('🛩️ ¡DESPEGUE! (' + spd.toFixed(1) + ' nudos)'); }
    else if (!shouldFly && CONFIG.isFlying && CONFIG.foilHeight < 0.1) { CONFIG.isFlying = false; console.log('🌊 El barco volvió al agua'); }
    updateNosediveRisk();
}

function updateNosediveRisk() {
    if (!CONFIG.isFlying) { 
        // Si no está volando, el riesgo baja rápido
        CONFIG.nosediveRisk = Math.max(0, CONFIG.nosediveRisk - 0.1); 
        return; 
    }
    
    let risk = 0;
    // Solo acumula riesgo si el foil está MUY alto (más de 95%)
    if (CONFIG.foilHeight > 0.95) risk += (CONFIG.foilHeight - 0.95) * 0.05;
    
    // Solo a velocidades muy altas (más de 40 nudos)
    if (CONFIG.boatSpeed > 40) risk += (CONFIG.boatSpeed - 40) * 0.002;
    
    // Si hay mucha escora (usando valor absoluto para ambos lados)
    if (Math.abs(CONFIG.heelAngle) > 20) risk += (Math.abs(CONFIG.heelAngle) - 20) * 0.015;
    
    CONFIG.nosediveRisk += risk;
    
    // Si no hay factores de riesgo, se recupera rápidamente
    if (risk === 0) CONFIG.nosediveRisk = Math.max(0, CONFIG.nosediveRisk - 0.05);
    CONFIG.nosediveRisk = Math.max(0, Math.min(1, CONFIG.nosediveRisk));
    
    // Solo se activa si el riesgo es extremo (98%) y con un poco de aleatoriedad
    if (CONFIG.nosediveRisk > 0.98 && Math.random() < 0.005) {
        triggerNosedive();
    }
}

function triggerNosedive() {
    if (CONFIG.isNosediving) return;
    CONFIG.isNosediving = true;
    CONFIG.nosediveTimer = CONFIG.nosedivePenalty * 60; // ~8 segundos de recuperación
    CONFIG.isFlying = false;
    CONFIG.foilHeight = 0; // Los foils se sumergen de golpe
    
    // CORREGIDO: En lugar de *= 0.3 (muro de lodo), *= 0.7 (resistencia al agua)
    // Y mantenemos un mínimo de 5 nudos de inercia para que no se sienta muerto
    CONFIG.boatSpeed = Math.max(5, CONFIG.boatSpeed * 0.7); 
    
    CONFIG.nosediveRisk = 0;
    console.log('💥 ¡NOSEDIVE! Proa clavada (resistencia hidrodinámica aplicada)');
}

function updateNosedive() {
    if (CONFIG.nosediveTimer > 0) {
        CONFIG.nosediveTimer--;
        
        // CORREGIDO: Fricción suave del agua en lugar de frenado agresivo
        // Se reduce un 2% por frame, permitiendo que el barco "glide" (se deslice)
        CONFIG.boatSpeed = Math.max(3, CONFIG.boatSpeed * 0.98); 
        
        if (CONFIG.nosediveTimer === 0) {
            CONFIG.isNosediving = false;
            CONFIG.foilHeight = 0;
            // ELIMINADO: CONFIG.boatSpeed = 0; (Ahora el barco mantiene su inercia)
            CONFIG.nosediveRisk = 0;
            console.log('✅ Proa levantada. El barco recupera inercia para navegar.');
        }
    }
}

function calculateFoilEfficiency() {
    if (!CONFIG.isFlying) return 0.6;
    if (CONFIG.foilHeight < 0.3) return 0.6 + (CONFIG.foilHeight / 0.3) * 0.2;
    if (CONFIG.foilHeight <= 0.8) return 0.8 + ((CONFIG.foilHeight - 0.3) / 0.5) * 0.2;
    return 1.0;
}

function getWindSide(vaAngle) { return (vaAngle >= 0 && vaAngle <= 180) ? 'starboard' : 'port'; }

function detectManeuver() {
    if (CONFIG.isManeuvering || CONFIG.isCapsized || CONFIG.isNosediving) return;
    
    const va = calculateApparentWind().angle;
    const currentSide = getWindSide(va);
    
    if (CONFIG.previousWindSide === null) { 
        CONFIG.previousWindSide = currentSide; 
        return; 
    }
    
    if (currentSide !== CONFIG.previousWindSide) {
        // ZONA MUERTA: Evitar oscilaciones y disparos múltiples en proa (0°/360°) o popa (180°)
        // Solo viramos si el viento está claramente a menos de 30° de la proa
        if (va < 30 || va > 330) {
            triggerManeuver('tacking');
            CONFIG.previousWindSide = currentSide;
        } 
        // Solo trasluchamos si el viento está claramente a más de 30° de la popa (es decir, < 150 o > 210)
        else if (va < 150 || va > 210) {
            triggerManeuver('gybing');
            CONFIG.previousWindSide = currentSide;
        } 
        else {
            // Estamos en la "zona muerta" (ej. entre 150° y 210°). 
            // No iniciamos maniobra, pero actualizamos el lado para no quedar atrapados en el chequeo.
            CONFIG.previousWindSide = currentSide;
        }
    }
}

function triggerManeuver(type) {
    CONFIG.totalManeuvers++;
    CONFIG.isManeuvering = true;
    CONFIG.maneuverType = type;
    CONFIG.maneuverTimer = Math.round(CONFIG.maneuverDuration[type] * (CONFIG.currentWing === 'light' ? 1.3 : CONFIG.currentWing === 'strong' ? 0.7 : 1.0));
    
    // REDUCIDO: Pérdida de 5 nudos en lugar de 10, para que la recuperación sea más suave
    CONFIG.currentManeuverSpeedLoss = 5 * (CONFIG.currentWing === 'light' ? 1.2 : CONFIG.currentWing === 'strong' ? 0.8 : 1.0);
    CONFIG.jibInflation = 0.0; // Desinflar el jib al iniciar la maniobra
    
    console.log(`🔄 ¡${type === 'tacking' ? 'VIRADA' : 'TRASLUCHADA'}!`);
}

// === CORREGIDO: Desaceleración natural por resta, no por multiplicación ===
function updateManeuver() {
    if (CONFIG.isManeuvering && CONFIG.maneuverType) {
        // FASE 1: Durante la maniobra activa
        CONFIG.maneuverTimer--;
        const duration = CONFIG.maneuverDuration[CONFIG.maneuverType];
        const progress = 1 - (CONFIG.maneuverTimer / duration);
        
        const dragCurve = Math.sin(progress * Math.PI);
        const speedLossThisFrame = (CONFIG.currentManeuverSpeedLoss * dragCurve) / (duration / 60);
        
        CONFIG.boatSpeed = Math.max(0, CONFIG.boatSpeed - speedLossThisFrame);
        
        const ease = dragCurve * (CONFIG.maneuverType === 'gybing' ? 0.20 : 0.15);
        CONFIG.sailTrim += (0 - CONFIG.sailTrim) * ease;
        CONFIG.flapAngle += (0 - CONFIG.flapAngle) * ease;
        
        CONFIG.jibInflation = 0.0; // Mantener desinflado mientras gira
        
        if (CONFIG.maneuverTimer <= 0) {
            CONFIG.maneuverType = null; // La maniobra de giro terminó
            CONFIG.currentManeuverSpeedLoss = 0;
            // NOTA: No ponemos isManeuvering = false aún, para entrar en la Fase 2
        }
    } else if (CONFIG.isManeuvering && CONFIG.jibInflation < 1.0) {
        // FASE 2: Recuperación post-maniobra (El jib se infla suavemente)
        CONFIG.jibInflation += 0.008; // Tarda ~2 segundos (120 frames) en inflarse al 100%
        
        if (CONFIG.jibInflation >= 1.0) {
            CONFIG.jibInflation = 1.0;
            CONFIG.isManeuvering = false; // Ahora sí, liberamos el barco completamente
        }
    }
}

function setWing(type) {
    if (POLAR_TABLES[type]) {
        CONFIG.currentWing = type;
        if (!POLAR_TABLES[type].jibAllowed && CONFIG.jibActive) { 
            CONFIG.jibActive = false; 
            console.log('Jib desactivado (no permitido)'); 
        }
    }
}

function toggleJib() {
    if (!getCurrentPolar().jibAllowed) { console.log('Jib no permitido'); return false; }
    CONFIG.jibActive = !CONFIG.jibActive;
    return true;
}

function getAbsoluteFlapAngle() { return CONFIG.sailTrim + CONFIG.flapAngle; }
function setFoilHeight(h) { CONFIG.foilHeight = Math.max(0, Math.min(1, h)); }

function getBoatStatus() {
    return {
        speed: CONFIG.boatSpeed, heading: CONFIG.boatHeading, sailTrim: CONFIG.sailTrim,
        flapAngle: CONFIG.flapAngle, jibActive: CONFIG.jibActive, foilHeight: CONFIG.foilHeight,
        heelAngle: CONFIG.heelAngle, isFlying: CONFIG.isFlying, apparentWind: calculateApparentWind()
    };
}

function updateDynamicWind() {
    const now = Date.now();
    if (now - CONFIG.lastWindShiftTime > CONFIG.windShiftInterval) {
        CONFIG.lastWindShiftTime = now;
        const shift = (Math.random() * 30) - 15;
        CONFIG.trueWindDirection = normalizeAngle(CONFIG.baseWindDirection + shift);
        
        let minSpeed, maxSpeed;
        if (CONFIG.windCondition === 'light') { minSpeed = 5; maxSpeed = 16; } 
        else if (CONFIG.windCondition === 'intermediate') { minSpeed = 16; maxSpeed = 24; } 
        else { minSpeed = 24; maxSpeed = 35; }
        
        CONFIG.trueWindSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        console.log(`🌬️ ¡Cambio de viento! Condición: ${CONFIG.windCondition} | Dir: ${Math.round(CONFIG.trueWindDirection)}° | Vel: ${CONFIG.trueWindSpeed.toFixed(1)} kn`);
    }
}