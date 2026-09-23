// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE FÍSICA
// Versión Final: Interpolación polar blindada (Clamp) contra acelerones
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
    windCondition: 'intermediate', // 'light', 'intermediate' o 'heavy'
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
    return 1.08;
}

// === BLINDADO: Clamp (sujeción) de velocidad para evitar extrapolación explosiva ===
function getBaseTargetSpeed(vaAngle, vaSpeed) {
    const polar = getCurrentPolar();
    let normAngle = vaAngle > 180 ? 360 - vaAngle : vaAngle;
    if (normAngle < 20) return 0;
    if (normAngle > 160) normAngle = 160;

    // 1. CLAMP: Sujetamos la velocidad de consulta al máximo de la tabla (30 nudos)
    // Esto evita que sIdx se quede en 0 y sF se vuelva 5.0 cuando el viento aparente es alto.
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
    
    // Techo de seguridad final por condición de viento
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
    
    target *= (1 - (CONFIG.heelAngle / CONFIG.maxHeelAngle) * 0.3);
    target *= calculateFoilEfficiency();
    
    // Aceleración suave y controlada
    CONFIG.boatSpeed += (target - CONFIG.boatSpeed) * CONFIG.accelerationFactor;
    CONFIG.boatSpeed = Math.max(0, CONFIG.boatSpeed);
    
    updateHeelAngle();
    updateFlightState();
    detectManeuver();
    updateManeuver();
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
    const windPush = (aw.speed * aw.speed) * 0.05 * wingFactor;
    const heelingForce = windPush * Math.sin(degToRad(aw.angle));
    const wd = calculateWeightDistribution();
    const isStarboardWind = aw.angle > 0 && aw.angle < 180;
    const weatherW = isStarboardWind ? wd.starboard : wd.port;
    const leeW = isStarboardWind ? wd.port : wd.starboard;
    const crewRighting = Math.max(0, (weatherW - leeW)) * 0.15;
    const flightStability = CONFIG.isFlying ? 0.9 : 1.0;
    let netForce = (heelingForce - crewRighting) * flightStability;
    let targetHeel = Math.max(0, netForce * 0.6); 
    
    if (CONFIG.heelAngle < targetHeel) {
        CONFIG.heelAngle += (targetHeel - CONFIG.heelAngle) * 0.04;
    } else {
        CONFIG.heelAngle += (targetHeel - CONFIG.heelAngle) * 0.1;
    }
    if (CONFIG.heelAngle >= CONFIG.maxHeelAngle) triggerCapsize();
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
    if (!CONFIG.isFlying) { CONFIG.nosediveRisk = Math.max(0, CONFIG.nosediveRisk - 0.05); return; }
    let risk = 0;
    if (CONFIG.foilHeight > 0.9) risk += (CONFIG.foilHeight - 0.9) * 0.02;
    if (CONFIG.boatSpeed > 45) risk += (CONFIG.boatSpeed - 45) * 0.001;
    if (CONFIG.heelAngle > 15) risk += (CONFIG.heelAngle - 15) * 0.01;
    CONFIG.nosediveRisk += risk;
    if (risk === 0) CONFIG.nosediveRisk = Math.max(0, CONFIG.nosediveRisk - 0.02);
    CONFIG.nosediveRisk = Math.max(0, Math.min(1, CONFIG.nosediveRisk));
    if (CONFIG.nosediveRisk > 0.95 && Math.random() < 0.002) triggerNosedive();
}

function triggerNosedive() {
    if (CONFIG.isNosediving) return;
    CONFIG.isNosediving = true;
    CONFIG.nosediveTimer = CONFIG.nosedivePenalty * 60;
    CONFIG.isFlying = false;
    CONFIG.foilHeight = 0;
    CONFIG.boatSpeed *= 0.3;
    CONFIG.nosediveRisk = 0;
    console.log('💥 ¡NOSEDIVE! Caída violenta');
}

function updateNosedive() {
    if (CONFIG.nosediveTimer > 0) {
        CONFIG.nosediveTimer--;
        CONFIG.boatSpeed *= 0.95; 
        if (CONFIG.nosediveTimer === 0) {
            CONFIG.isNosediving = false;
            CONFIG.foilHeight = 0;
            CONFIG.boatSpeed = 0;
            CONFIG.nosediveRisk = 0;
            console.log('✅ Barco recuperado del nosedive. Listo para navegar.');
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
    const currentSide = getWindSide(calculateApparentWind().angle);
    if (CONFIG.previousWindSide === null) { CONFIG.previousWindSide = currentSide; return; }
    if (currentSide !== CONFIG.previousWindSide) {
        const va = calculateApparentWind().angle;
        if (va < 40 || va > 320) triggerManeuver('tacking');
        else if (va > 140 && va < 220) triggerManeuver('gybing');
    }
    CONFIG.previousWindSide = currentSide;
}

function triggerManeuver(type) {
    CONFIG.totalManeuvers++;
    CONFIG.isManeuvering = true;
    CONFIG.maneuverType = type;
    CONFIG.maneuverTimer = Math.round(CONFIG.maneuverDuration[type] * (CONFIG.currentWing === 'light' ? 1.3 : CONFIG.currentWing === 'strong' ? 0.7 : 1.0));
    CONFIG.currentManeuverSpeedLoss = CONFIG.maneuverSpeedLoss * (CONFIG.currentWing === 'light' ? 1.2 : CONFIG.currentWing === 'strong' ? 0.8 : 1.0);
    console.log(`🔄 ¡${type === 'tacking' ? 'VIRADA' : 'TRASLUCHADA'}!`);
}

function updateManeuver() {
    if (!CONFIG.isManeuvering) return;
    CONFIG.maneuverTimer--;
    const progress = 1 - (CONFIG.maneuverTimer / CONFIG.maneuverDuration[CONFIG.maneuverType]);
    let mult = 1 - (Math.sin(progress * Math.PI) * (CONFIG.currentManeuverSpeedLoss || CONFIG.maneuverSpeedLoss));
    CONFIG.boatSpeed *= mult;
    const ease = Math.sin(progress * Math.PI) * (CONFIG.maneuverType === 'gybing' ? 0.20 : 0.15);
    CONFIG.sailTrim += (-CONFIG.sailTrim - CONFIG.sailTrim) * ease;
    CONFIG.flapAngle += (-CONFIG.flapAngle - CONFIG.flapAngle) * ease;
    if (CONFIG.maneuverTimer <= 0) {
        CONFIG.isManeuvering = false; 
        CONFIG.maneuverType = null; 
        CONFIG.currentManeuverSpeedLoss = 0;
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