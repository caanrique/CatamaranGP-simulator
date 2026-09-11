// ============================================
// SAILGP SIMULATOR - MÓDULO DE FÍSICA
// Etapa 1: Viento Aparente y Tabla Polar
// ============================================

// --- CONFIGURACIÓN INICIAL ---
const CONFIG = {
    trueWindSpeed: 20,      // Velocidad del viento real en nudos
    trueWindDirection: 90,  // Dirección del viento real en grados (0=norte, 90=este)
    boatSpeed: 0,           // Velocidad actual del barco en nudos
    boatHeading: 0,         // Rumbo actual del barco en grados (0=norte)
    sailTrim: 45,           // Ángulo del ala respecto al barco en grados
    maxBoatSpeed: 55,       // Velocidad máxima teórica del barco
    accelerationFactor: 0.02 // Qué tan rápido responde el barco (inercia)
};

// --- TABLA POLAR (Ángulo VA vs Velocidad VA) ---
// Filas: Ángulo del viento aparente (grados desde la proa)
// Columnas: Velocidad del viento aparente (nudos)
// Valores: Velocidad objetivo del barco (nudos)
const POLAR_TABLE = {
    angles: [0, 30, 45, 60, 90, 120, 150, 180],
    speeds: [10, 15, 20, 25, 30],
    data: [
    //  10kn  15kn  20kn  25kn  30kn
        [  0,    0,    0,    0,    0],  // 0°   (zona muerta)
        [ 12,   18,   25,   30,   33],  // 30°  (ceñida cerrada)
        [ 15,   22,   30,   38,   42],  // 45°  (ceñida)
        [ 18,   27,   37,   45,   48],  // 60°
        [ 20,   30,   42,   50,   52],  // 90°  (través - PICO)
        [ 18,   28,   38,   46,   48],  // 120° (largo)
        [ 15,   22,   30,   35,   38],  // 150° (popa cerrada)
        [ 10,   15,   20,   25,   28]   // 180° (popa)
    ]
};

// --- FUNCIONES DE FÍSICA ---

/**
 * Convierte grados a radianes
 */
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convierte radianes a grados
 */
function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Normaliza un ángulo al rango 0-360
 */
function normalizeAngle(angle) {
    angle = angle % 360;
    if (angle < 0) angle += 360;
    return angle;
}

/**
 * Calcula el viento aparente (magnitud y ángulo)
 * @returns {Object} { speed, angle }
 */
function calculateApparentWind() {
    // Ángulo relativo del viento real respecto a la proa
    const relativeAngle = normalizeAngle(
        CONFIG.trueWindDirection - CONFIG.boatHeading
    );

    // Descomponer viento real en componentes X (proa) e Y (través)
    const vx = CONFIG.trueWindSpeed * Math.cos(degToRad(relativeAngle));
    const vy = CONFIG.trueWindSpeed * Math.sin(degToRad(relativeAngle));

    // Restar velocidad del barco (viento de proa)
    const vax = vx - CONFIG.boatSpeed;
    const vay = vy;

    // Magnitud del viento aparente
    const vaSpeed = Math.sqrt(vax * vax + vay * vay);

    // Ángulo del viento aparente respecto a la proa
    let vaAngle = radToDeg(Math.atan2(vay, vax));
    vaAngle = normalizeAngle(vaAngle);

    return {
        speed: Math.round(vaSpeed * 100) / 100,
        angle: Math.round(vaAngle * 100) / 100
    };
}

/**
 * Interpolación bilineal en la tabla polar
 * @param {number} vaAngle - Ángulo del viento aparente
 * @param {number} vaSpeed - Velocidad del viento aparente
 * @returns {number} Velocidad objetivo del barco
 */
function getTargetSpeed(vaAngle, vaSpeed) {
    const { angles, speeds, data } = POLAR_TABLE;

    // Si estamos en la zona muerta (< 25°), velocidad casi cero
    if (vaAngle < 25 || vaAngle > 335) return 0;

    // Encontrar índices para interpolación de ángulo
    let angleIdx = 0;
    for (let i = 0; i < angles.length - 1; i++) {
        if (vaAngle >= angles[i] && vaAngle < angles[i + 1]) {
            angleIdx = i;
            break;
        }
        if (i === angles.length - 2) angleIdx = i;
    }

    // Encontrar índices para interpolación de velocidad
    let speedIdx = 0;
    for (let i = 0; i < speeds.length - 1; i++) {
        if (vaSpeed >= speeds[i] && vaSpeed < speeds[i + 1]) {
            speedIdx = i;
            break;
        }
        if (i === speeds.length - 2) speedIdx = i;
    }

    // Factores de interpolación (0 a 1)
    const angleFactor = (vaAngle - angles[angleIdx]) / 
                        (angles[angleIdx + 1] - angles[angleIdx] || 1);
    const speedFactor = (vaSpeed - speeds[speedIdx]) / 
                        (speeds[speedIdx + 1] - speeds[speedIdx] || 1);

    // Interpolación bilineal
    const v00 = data[angleIdx][speedIdx];
    const v01 = data[angleIdx][speedIdx + 1] || v00;
    const v10 = data[angleIdx + 1] ? data[angleIdx + 1][speedIdx] : v00;
    const v11 = data[angleIdx + 1] ? (data[angleIdx + 1][speedIdx + 1] || v10) : v01;

    const top = v00 + (v01 - v00) * speedFactor;
    const bottom = v10 + (v11 - v10) * speedFactor;
    const result = top + (bottom - top) * angleFactor;

    return Math.max(0, Math.min(result, CONFIG.maxBoatSpeed));
}

/**
 * Actualiza la velocidad del barco con inercia
 * @returns {number} Nueva velocidad del barco
 */
function updateBoatSpeed() {
    const apparentWind = calculateApparentWind();
    const targetSpeed = getTargetSpeed(apparentWind.angle, apparentWind.speed);
    
    // Aplicar inercia: el barco no cambia de velocidad instantáneamente
    const delta = targetSpeed - CONFIG.boatSpeed;
    CONFIG.boatSpeed += delta * CONFIG.accelerationFactor;
    
    // Evitar velocidades negativas
    CONFIG.boatSpeed = Math.max(0, CONFIG.boatSpeed);
    
    return CONFIG.boatSpeed;
}
