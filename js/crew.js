// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE TRIPULACIÓN
// Etapa 3.5: Reestructuración con cascos y roles actualizados
// ============================================

// --- DEFINICIÓN DE ROLES ---
const CREW_ROLES = {
    HELMSMAN: 'helmsman',       // Timonel: controla rumbo
    TRIMMER: 'trimmer',         // Trimmer: controla foils + toggle jib
    GRINDER_1: 'grinder_1',     // Grinder 1: ángulo Leading Edge
    GRINDER_2: 'grinder_2'      // Grinder 2: ángulo Flap trasero
};

// --- DEFINICIÓN DE CASCOS ---
const HULLS = {
    PORT: 'port',           // Babor (izquierdo)
    STARBOARD: 'starboard'  // Estribor (derecho)
};

// --- ESTADO DE LA TRIPULACIÓN ---
const CrewState = {
    activeRole: CREW_ROLES.HELMSMAN,  // Rol actualmente seleccionado
    
    // Cada jugador tiene una posición única (hull + position)
    // position: 1 (proa) a 4 (popa)
    positions: {
        helmsman: { hull: HULLS.STARBOARD, position: 4 },
        trimmer: { hull: HULLS.STARBOARD, position: 3 },
        grinder_1: { hull: HULLS.PORT, position: 1 },
        grinder_2: { hull: HULLS.PORT, position: 2 }
    },
    
    // Peso de cada tripulante en kg
    weights: {
        helmsman: 85,
        trimmer: 80,
        grinder_1: 90,
        grinder_2: 88
    },
    
    // Resistencia/fatiga (0 = fresco, 100 = agotado)
    fatigue: {
        helmsman: 0,
        trimmer: 0,
        grinder_1: 0,
        grinder_2: 0
    }
};

// --- COLORES DE CADA ROL ---
const CREW_COLORS = {
    helmsman: '#e74c3c',       // Rojo
    trimmer: '#f39c12',        // Naranja
    grinder_1: '#3498db',      // Azul
    grinder_2: '#9b59b6'       // Púrpura
};

// --- NOMBRES DE CADA ROL ---
const CREW_NAMES = {
    helmsman: 'Timonel',
    trimmer: 'Trimmer',
    grinder_1: 'Grinder 1 (Mástil)',
    grinder_2: 'Grinder 2 (Flap)'
};

// --- DESCRIPCIÓN DE FUNCIÓN DE CADA ROL ---
const CREW_FUNCTIONS = {
    helmsman: 'Controla el rumbo (A/D)',
    trimmer: 'Controla foils (W/S) + Jib (J)',
    grinder_1: 'Ángulo mástil (A/D)',
    grinder_2: 'Ángulo flap (A/D)'
};

// --- FUNCIONES DE CONTROL ---

/**
 * Cambia al siguiente rol (rotación cíclica con ↑/↓)
 * Orden: 1=Timonel, 2=Trimmer, 3=Grinder2, 4=Grinder1
 */
function nextRole() {
    const roles = [
        CREW_ROLES.HELMSMAN,
        CREW_ROLES.TRIMMER,
        CREW_ROLES.GRINDER_2,
        CREW_ROLES.GRINDER_1
    ];
    const currentIndex = roles.indexOf(CrewState.activeRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    CrewState.activeRole = roles[nextIndex];
    console.log(`Tripulante activo: ${CREW_NAMES[CrewState.activeRole]}`);
}

/**
 * Cambia al rol anterior (rotación cíclica con ↑/↓)
 * Orden: 1=Timonel, 2=Trimmer, 3=Grinder2, 4=Grinder1
 */
function prevRole() {
    const roles = [
        CREW_ROLES.HELMSMAN,
        CREW_ROLES.TRIMMER,
        CREW_ROLES.GRINDER_2,
        CREW_ROLES.GRINDER_1
    ];
    const currentIndex = roles.indexOf(CrewState.activeRole);
    const prevIndex = (currentIndex - 1 + roles.length) % roles.length;
    CrewState.activeRole = roles[prevIndex];
    console.log(`Tripulante activo: ${CREW_NAMES[CrewState.activeRole]}`);
}

/**
 * Mueve al jugador activo al casco opuesto (con ←/→)
 */
function moveActivePlayerToOppositeHull() {
    const role = CrewState.activeRole;
    const currentHull = CrewState.positions[role].hull;
    const newHull = (currentHull === HULLS.PORT) ? HULLS.STARBOARD : HULLS.PORT;
    
    CrewState.positions[role].hull = newHull;
    console.log(`${CREW_NAMES[role]} movido a ${newHull === HULLS.PORT ? 'Babor' : 'Estribor'}`);
}

/**
 * Obtiene la lista de jugadores en un casco específico
 * @param {string} hull - HULLS.PORT o HULLS.STARBOARD
 * @returns {Array} Lista de roles en ese casco
 */
function getPlayersInHull(hull) {
    const players = [];
    for (const role in CrewState.positions) {
        if (CrewState.positions[role].hull === hull) {
            players.push({
                role: role,
                position: CrewState.positions[role].position,
                weight: CrewState.weights[role]
            });
        }
    }
    // Ordenar por posición (1 = proa, 4 = popa)
    return players.sort((a, b) => a.position - b.position);
}

/**
 * Calcula el peso total en cada casco
 * @returns {Object} { port: peso, starboard: peso }
 */
function calculateWeightDistribution() {
    const portPlayers = getPlayersInHull(HULLS.PORT);
    const starboardPlayers = getPlayersInHull(HULLS.STARBOARD);
    
    const portWeight = portPlayers.reduce((sum, p) => sum + p.weight, 0);
    const starboardWeight = starboardPlayers.reduce((sum, p) => sum + p.weight, 0);
    
    return {
        port: portWeight,
        starboard: starboardWeight,
        difference: Math.abs(portWeight - starboardWeight)
    };
}

/**
 * Calcula el momento de enderezamiento total (para Etapa 4)
 * @returns {number} Momento en kg·m
 */
function calculateRightingMoment() {
    let moment = 0;
    
    // Cada jugador contribuye según su peso y distancia al centro
    // Distancia aproximada: 1 metro por unidad de posición lateral
    for (const role in CrewState.positions) {
        const hull = CrewState.positions[role].hull;
        const weight = CrewState.weights[role];
        
        // hull: PORT = -1 (babor), STARBOARD = +1 (estribor)
        const lateralPosition = (hull === HULLS.PORT) ? -1 : 1;
        moment += weight * lateralPosition * 1; // 1 metro de distancia
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
        hull: CrewState.positions[role].hull,
        position: CrewState.positions[role].position,
        weight: CrewState.weights[role],
        fatigue: CrewState.fatigue[role]
    };
}