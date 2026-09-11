// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE TRIPULACIÓN
// Etapa 3: 4 roles con funciones específicas
// ============================================

// --- DEFINICIÓN DE ROLES ---
const CREW_ROLES = {
    HELMSMAN: 'helmsman',           // Timonel
    WING_TRIMMER: 'wing_trimmer',   // Ajustador de ala
    GRINDER_1: 'grinder_1',         // Grinder lado babor
    GRINDER_2: 'grinder_2'          // Grinder lado estribor
};

// --- ESTADO DE LA TRIPULACIÓN ---
const CrewState = {
    activeRole: CREW_ROLES.HELMSMAN,  // Rol actualmente seleccionado
    
    // Posiciones de los tripulantes en el barco (para visualización)
    // -1 = babor (izquierda), 0 = centro, +1 = estribor (derecha)
    positions: {
        helmsman: 0,        // Siempre en el centro (popa)
        wing_trimmer: 0,    // Centro (cerca del mástil)
        grinder_1: -1,      // Lado babor
        grinder_2: 1        // Lado estribor
    },
    
    // Peso de cada tripulante en kg
    weights: {
        helmsman: 85,
        wing_trimmer: 80,
        grinder_1: 90,
        grinder_2: 88
    },
    
    // Resistencia/fatiga (0 = fresco, 100 = agotado)
    fatigue: {
        helmsman: 0,
        wing_trimmer: 0,
        grinder_1: 0,
        grinder_2: 0
    }
};

// --- COLORES DE CADA ROL (para visualización) ---
const CREW_COLORS = {
    helmsman: '#e74c3c',       // Rojo
    wing_trimmer: '#f39c12',   // Naranja
    grinder_1: '#3498db',      // Azul
    grinder_2: '#9b59b6'       // Púrpura
};

// --- NOMBRES DE CADA ROL (para HUD) ---
const CREW_NAMES = {
    helmsman: 'Timonel',
    wing_trimmer: 'Wing Trimmer',
    grinder_1: 'Grinder 1 (Babor)',
    grinder_2: 'Grinder 2 (Estribor)'
};

// --- DESCRIPCIÓN DE FUNCIÓN DE CADA ROL (para HUD) ---
const CREW_FUNCTIONS = {
    helmsman: 'Controla el rumbo',
    wing_trimmer: 'Ajusta el ángulo del ala',
    grinder_1: 'Mueve peso a babor',
    grinder_2: 'Mueve peso a estribor'
};

// --- FUNCIONES DE CONTROL ---

/**
 * Cambia al siguiente rol (rotación cíclica)
 */
function nextRole() {
    const roles = [
        CREW_ROLES.HELMSMAN,
        CREW_ROLES.WING_TRIMMER,
        CREW_ROLES.GRINDER_1,
        CREW_ROLES.GRINDER_2
    ];
    const currentIndex = roles.indexOf(CrewState.activeRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    CrewState.activeRole = roles[nextIndex];
    console.log(`Tripulante activo: ${CREW_NAMES[CrewState.activeRole]}`);
}

/**
 * Cambia al rol anterior (rotación cíclica)
 */
function prevRole() {
    const roles = [
        CREW_ROLES.HELMSMAN,
        CREW_ROLES.WING_TRIMMER,
        CREW_ROLES.GRINDER_1,
        CREW_ROLES.GRINDER_2
    ];
    const currentIndex = roles.indexOf(CrewState.activeRole);
    const prevIndex = (currentIndex - 1 + roles.length) % roles.length;
    CrewState.activeRole = roles[prevIndex];
    console.log(`Tripulante activo: ${CREW_NAMES[CrewState.activeRole]}`);
}

/**
 * Ejecuta la acción del tripulante activo según la dirección del joystick
 * @param {number} x - Dirección X del joystick (-1 a 1)
 * @param {number} y - Dirección Y del joystick (-1 a 1)
 */
function executeCrewAction(x, y) {
    const role = CrewState.activeRole;
    const threshold = 0.3; // Umbral mínimo para activar
    
    switch(role) {
        case CREW_ROLES.HELMSMAN:
            // Timonel: controla el rumbo
            if (Math.abs(x) > threshold) {
                const turnSpeed = 2 * Math.abs(x); // Velocidad proporcional
                CONFIG.boatHeading = normalizeAngle(
                    CONFIG.boatHeading + (x > 0 ? turnSpeed : -turnSpeed)
                );
            }
            break;
            
        case CREW_ROLES.WING_TRIMMER:
            // Wing Trimmer: ajusta el ángulo del ala
            if (Math.abs(y) > threshold) {
                const trimSpeed = 2 * Math.abs(y);
                CONFIG.sailTrim = Math.max(-90, Math.min(90, 
                    CONFIG.sailTrim + (y > 0 ? trimSpeed : -trimSpeed)
                ));
            }
            break;
            
        case CREW_ROLES.GRINDER_1:
            // Grinder 1: controla peso en babor
            if (Math.abs(y) > threshold) {
                // Aquí implementaremos el movimiento de peso en Etapa 4
                // Por ahora, solo registramos la acción
                console.log(`Grinder 1 ajustando peso babor: ${y > 0 ? '+' : '-'}${Math.abs(y).toFixed(2)}`);
            }
            break;
            
        case CREW_ROLES.GRINDER_2:
            // Grinder 2: controla peso en estribor
            if (Math.abs(y) > threshold) {
                console.log(`Grinder 2 ajustando peso estribor: ${y > 0 ? '+' : '-'}${Math.abs(y).toFixed(2)}`);
            }
            break;
    }
}

/**
 * Calcula el momento de enderezamiento total (para Etapa 4)
 * @returns {number} Momento en kg·m
 */
function calculateRightingMoment() {
    let moment = 0;
    
    // Por ahora solo considera el peso de los tripulantes
    // En Etapa 4 añadiremos la posición dinámica
    for (const role in CrewState.positions) {
        const position = CrewState.positions[role];
        const weight = CrewState.weights[role];
        // position: -1 (babor), 0 (centro), +1 (estribor)
        // Distancia aproximada al centro: 1 metro por unidad
        moment += weight * position * 1;
    }
    
    return moment;
}

/**
 * Obtiene información del tripulante activo (para HUD)
 */
function getActiveCrewInfo() {
    const role = CrewState.activeRole;
    return {
        role: role,
        name: CREW_NAMES[role],
        function: CREW_FUNCTIONS[role],
        color: CREW_COLORS[role],
        weight: CrewState.weights[role],
        position: CrewState.positions[role],
        fatigue: CrewState.fatigue[role]
    };
}
