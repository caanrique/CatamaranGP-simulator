// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE FÍSICA
// Etapa 2: Velas Modulares (3 configuraciones)
// ============================================

// --- CONFIGURACIÓN INICIAL ---
const CONFIG = {
    trueWindSpeed: 20,
    trueWindDirection: 90,
    boatSpeed: 0,
    boatHeading: 0,
    sailTrim: 45,
    maxBoatSpeed: 55,
    accelerationFactor: 0.02,
    currentWing: 'medium' // 'light', 'medium', 'strong'
};

// --- TABLAS POLARES PARA CADA CONFIGURACIÓN DE ALA ---

// ALA LIGERA (29m) - Para vientos de 7-12 nudos
const POLAR_LIGHT = {
    name: 'Ala Ligera (29m)',
    optimalWind: '7-12 nudos',
    angles: [0, 30, 45, 60, 90, 120, 150, 180],
    speeds: [10, 15, 20, 25, 30],
    data: [
    //  10kn  15kn  20kn  25kn  30kn
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

// ALA MEDIA (24m) - Para vientos de 12-20 nudos (TODO TERRENO)
const POLAR_MEDIUM = {
    name: 'Ala Media (24m)',
    optimalWind: '12-20 nudos',
    angles: [0, 30, 45, 60, 90, 120, 150, 180],
    speeds: [10, 15, 20, 25, 30],
    data: [
    //  10kn  15kn  20kn  25kn  30kn
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
    angles: [0, 30, 45, 60, 90, 120, 150, 180],
    speeds: [10, 15, 20, 25, 30],
    data: [
    //  10kn  15kn  20kn  25kn  30kn
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

// Función para obtener la tabla polar actual
function getCurrentPolar() {
    return POLAR_TABLES[CONFIG.currentWing];
}

// --- FUNCIONES DE FÍSICA ---

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

function getTargetSpeed(vaAngle, vaSpeed) {
    const polar = getCurrentPolar();
    const { angles, speeds, data } = polar;

    if (vaAngle < 25 || vaAngle > 335) return 0;

    let angleIdx = 0;
    for (let i = 0; i < angles.length - 1; i++) {
        if (vaAngle >= angles[i] && vaAngle < angles[i + 1]) {
            angleIdx = i;
            break;
        }
        if (i === angles.length - 2) angleIdx = i;
    }

    let speedIdx = 0;
    for (let i = 0; i < speeds.length - 1; i++) {
        if (vaSpeed >= speeds[i] && vaSpeed < speeds[i + 1]) {
            speedIdx = i;
            break;
        }
        if (i === speeds.length - 2) speedIdx = i;
    }

    const angleFactor = (vaAngle - angles[angleIdx]) / 
                        (angles[angleIdx + 1] - angles[angleIdx] || 1);
    const speedFactor = (vaSpeed - speeds[speedIdx]) / 
                        (speeds[speedIdx + 1] - speeds[speedIdx] || 1);

    const v00 = data[angleIdx][speedIdx];
    const v01 = data[angleIdx][speedIdx + 1] || v00;
    const v10 = data[angleIdx + 1] ? data[angleIdx + 1][speedIdx] : v00;
    const v11 = data[angleIdx + 1] ? (data[angleIdx + 1][speedIdx + 1] || v10) : v01;

    const top = v00 + (v01 - v00) * speedFactor;
    const bottom = v10 + (v11 - v10) * speedFactor;
    const result = top + (bottom - top) * angleFactor;

    return Math.max(0, Math.min(result, CONFIG.maxBoatSpeed));
}

function updateBoatSpeed() {
    const apparentWind = calculateApparentWind();
    const targetSpeed = getTargetSpeed(apparentWind.angle, apparentWind.speed);
    
    const delta = targetSpeed - CONFIG.boatSpeed;
    CONFIG.boatSpeed += delta * CONFIG.accelerationFactor;
    CONFIG.boatSpeed = Math.max(0, CONFIG.boatSpeed);
    
    return CONFIG.boatSpeed;
}

// Función para cambiar el ala
function setWing(wingType) {
    if (POLAR_TABLES[wingType]) {
        CONFIG.currentWing = wingType;
        console.log(`Ala cambiada a: ${POLAR_TABLES[wingType].name}`);
    }
}
