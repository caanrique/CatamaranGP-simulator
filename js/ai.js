// ============================================
// CATAMARANGP SIMULATOR - SISTEMA DE IA
// Rivales con personalidades únicas
// ============================================

// Estado global de la IA
window.aiBoats = [];

// Personalidades de IA
const AI_PERSONALITIES = {
    aggressive: {
        name: "Agresivo",
        color: 0xe74c3c, // Rojo
        speedFactor: 1.15, // 15% más rápido
        turnAggressiveness: 1.3, // Giros más cerrados
        errorRate: 0.05, // 5% de probabilidad de error
        description: "Toma riesgos y navega al límite"
    },
    tactical: {
        name: "Táctico",
        color: 0x3498db, // Azul
        speedFactor: 1.0,
        turnAggressiveness: 1.0,
        errorRate: 0.02,
        description: "Analiza el viento y toma decisiones óptimas"
    },
    conservative: {
        name: "Conservador",
        color: 0x27ae60, // Verde
        speedFactor: 0.9, // 10% más lento
        turnAggressiveness: 0.7, // Giros más suaves
        errorRate: 0.01,
        description: "Navega seguro y evita riesgos"
    },
    erratic: {
        name: "Errático",
        color: 0x9b59b6, // Púrpura
        speedFactor: 1.05,
        turnAggressiveness: 1.1,
        errorRate: 0.15, // 15% de errores
        description: "Impredecible, comete errores frecuentes"
    },
    balanced: {
        name: "Equilibrado",
        color: 0xf39c12, // Naranja
        speedFactor: 1.0,
        turnAggressiveness: 1.0,
        errorRate: 0.03,
        description: "Balance perfecto entre velocidad y control"
    }
};

// === CREAR BARCO IA ===
function createABoat(personality, id) {
    const personalityData = AI_PERSONALITIES[personality];
    
    const aiBoat = {
        id: id,
        personality: personality,
        personalityData: personalityData,
        
        // Posición y movimiento
        x: 0,
        z: 600, // Empieza en la línea de salida
        heading: 0,
        speed: 0,
        
        // Estado
        currentLap: 0,
        nextBuoyIndex: 0,
        isManeuvering: false,
        maneuverTimer: 0,
        
        // Mesh 3D (se creará después)
        mesh: null,
        
        // Estado interno de IA
        targetHeading: 0,
        sailTrim: 0,
        foilHeight: 0,
        lastDecisionTime: 0
    };
    
    return aiBoat;
}

// === INICIALIZAR FLOTA DE IA ===
function initAIFleet(difficulty) {
    window.aiBoats = [];
    
    let numBoats = 0;
    let personalities = [];
    
    switch(difficulty) {
        case 'easy':
            numBoats = 1;
            personalities = ['conservative'];
            break;
        case 'intermediate':
            numBoats = 3;
            personalities = ['tactical', 'balanced', 'conservative'];
            break;
        case 'pro':
            numBoats = 5;
            personalities = ['aggressive', 'tactical', 'balanced', 'erratic', 'conservative'];
            break;
    }
    
    for (let i = 0; i < numBoats; i++) {
        const personality = personalities[i % personalities.length];
        const aiBoat = createABoat(personality, i);
        
        // Posicionar en la línea de salida con separación
        aiBoat.x = -50 + (i * 25);
        aiBoat.z = 600;
        aiBoat.heading = 0;
        
        window.aiBoats.push(aiBoat);
    }
    
    console.log(`🤖 Flota de IA creada: ${numBoats} rivales`);
    
    // Crear meshes 3D para cada barco IA
    createABoatMeshes();
}

// === CREAR MESHES 3D PARA BARCOS IA ===
// === CREAR MESHES 3D PARA BARCOS IA (Con modelos reales) ===
function createABoatMeshes() {
    if (typeof THREE === 'undefined' || typeof scene === 'undefined') {
        console.warn('Three.js no está listo para crear meshes de IA');
        return;
    }
    
    window.aiBoats.forEach(aiBoat => {
        // Crear un grupo para el barco IA
        const aiBoatGroup = new THREE.Group();
        
        // === CARGAR MODELOS 3D (mismos que el jugador) ===
        
        // 1. Casco
        loadModel('models/hull.obj', function(hull) {
            hull.scale.set(1, 1, 1);
            hull.position.set(0, 1, 0);
            hull.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Color de personalidad
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: aiBoat.personalityData.color, 
                        shininess: 50, 
                        side: THREE.DoubleSide 
                    });
                }
            });
            aiBoatGroup.add(hull);
        });
        
        // 2. Foils
        loadModel('models/foils.obj', function(foilsModel) {
            foilsModel.scale.set(1, 1, 1);
            foilsModel.position.set(0, 1, 0);
            foilsModel.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: 0x2c3e50, 
                        shininess: 30 
                    });
                }
            });
            aiBoatGroup.add(foilsModel);
        });
        
        // 3. Ala (Mástil)
        loadModel('models/wing.obj', function(wing) {
            wing.scale.set(1, 1, 1);
            const mastGroup = new THREE.Group();
            mastGroup.position.set(0, 1, 0);
            mastGroup.add(wing);
            wing.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: 0xecf0f1, 
                        shininess: 40 
                    });
                }
            });
            aiBoatGroup.add(mastGroup);
            aiBoat.mastGroup = mastGroup; // Guardar referencia para animar
        });
        
        // 4. Flap
        loadModel('models/flap.obj', function(flap) {
            flap.scale.set(1, 1, 1);
            const flapHinge = new THREE.Group();
            flapHinge.position.set(0, 0, 2.48);
            flap.position.set(0, 0, -2.48);
            flap.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: 0xe67e22, 
                        shininess: 50 
                    });
                }
            });
            flapHinge.add(flap);
            if (aiBoat.mastGroup) aiBoat.mastGroup.add(flapHinge);
            aiBoat.flapHinge = flapHinge; // Guardar referencia
        });
        
        // 5. Jib (siempre activo para IA)
        loadModel('models/jib.obj', function(jib) {
            jib.scale.set(1, 1, 1);
            const jibHinge = new THREE.Group();
            jibHinge.position.set(0, 1.3, 0.5);
            jib.position.set(0, 0, -0.3);
            jib.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: aiBoat.personalityData.color, // Color de personalidad
                        side: THREE.DoubleSide, 
                        transparent: true, 
                        opacity: 0.85 
                    });
                }
            });
            jibHinge.add(jib);
            aiBoatGroup.add(jibHinge);
            jib.visible = true; // IA siempre usa jib
        });
        
        // Posicionar el barco
        aiBoatGroup.position.set(aiBoat.x, 0, aiBoat.z);
        aiBoatGroup.rotation.y = degToRad(aiBoat.heading);
        
        scene.add(aiBoatGroup);
        aiBoat.mesh = aiBoatGroup;
    });
    
    console.log('🎨 Meshes 3D de IA creados con modelos reales');
}

// === ACTUALIZAR LÓGICA DE IA ===
function updateAI() {
    if (!raceState.isActive || raceState.isFinished) return;
    
    const currentTime = Date.now();
    
        window.aiBoats.forEach(aiBoat => {
        // Tomar decisiones cada 100ms (10 veces por segundo)
        if (currentTime - aiBoat.lastDecisionTime > 100) {
            makeAIDecisions(aiBoat);
            aiBoat.lastDecisionTime = currentTime;
        }
        
        // Actualizar física simplificada
        updateAIPhysics(aiBoat, currentTime);
        
        // Verificar pasadas de boyas
        checkAIBuoyPassage(aiBoat);
        
        // Actualizar mesh 3D
        if (aiBoat.mesh) {
            aiBoat.mesh.position.x = aiBoat.x;
            aiBoat.mesh.position.z = aiBoat.z;
            aiBoat.mesh.position.y = -2 + (aiBoat.foilHeight * 1.2);
            aiBoat.mesh.rotation.y = degToRad(aiBoat.heading + 180);
        }
    });
    
    // NUEVO: Manejar colisiones entre todos los barcos
    handleAICollisions();
}

// === SISTEMA DE COLISIONES ===
function handleAICollisions() {
    const COLLISION_RADIUS = 15; // Radio de colisión en metros
    const REPULSION_FORCE = 0.5; // Fuerza de repulsión
    
    // Colisiones entre barcos IA
    for (let i = 0; i < window.aiBoats.length; i++) {
        const boat1 = window.aiBoats[i];
        
        for (let j = i + 1; j < window.aiBoats.length; j++) {
            const boat2 = window.aiBoats[j];
            
            const dx = boat2.x - boat1.x;
            const dz = boat2.z - boat1.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < COLLISION_RADIUS && distance > 0) {
                // Calcular fuerza de repulsión
                const overlap = COLLISION_RADIUS - distance;
                const forceX = (dx / distance) * overlap * REPULSION_FORCE;
                const forceZ = (dz / distance) * overlap * REPULSION_FORCE;
                
                // Aplicar repulsión (empujar en direcciones opuestas)
                boat1.x -= forceX;
                boat1.z -= forceZ;
                boat2.x += forceX;
                boat2.z += forceZ;
                
                // Reducir velocidad al colisionar
                boat1.speed *= 0.95;
                boat2.speed *= 0.95;
            }
        }
        
        // Colisión con el barco del jugador
        const playerDx = CONFIG.boatX - boat1.x;
        const playerDz = CONFIG.boatZ - boat1.z;
        const playerDistance = Math.sqrt(playerDx * playerDx + playerDz * playerDz);
        
        if (playerDistance < COLLISION_RADIUS && playerDistance > 0) {
            const overlap = COLLISION_RADIUS - playerDistance;
            const forceX = (playerDx / playerDistance) * overlap * REPULSION_FORCE;
            const forceZ = (playerDz / playerDistance) * overlap * REPULSION_FORCE;
            
            // Empujar al barco IA lejos del jugador
            boat1.x -= forceX;
            boat1.z -= forceZ;
            boat1.speed *= 0.9; // Penalización más fuerte al chocar con el jugador
        }
    }
}

// === TOMAR DECISIONES DE IA ===
function makeAIDecisions(aiBoat) {
    const targetBuoy = RACE_CIRCUIT[aiBoat.nextBuoyIndex];
    if (!targetBuoy) return;
    
    // Calcular ángulo hacia la boya objetivo
    const dx = targetBuoy.x - aiBoat.x;
    const dz = targetBuoy.z - aiBoat.z;
    const targetAngle = Math.atan2(dx, dz) * (180 / Math.PI);
    
    // Normalizar ángulo
    aiBoat.targetHeading = normalizeAngle(targetAngle);
    
    // Calcular diferencia de rumbo
    let headingDiff = aiBoat.targetHeading - aiBoat.heading;
    if (headingDiff > 180) headingDiff -= 360;
    if (headingDiff < -180) headingDiff += 360;
    
    // Decidir si necesita virar o trasluchar
    const absDiff = Math.abs(headingDiff);
    
    if (absDiff > 90 && !aiBoat.isManeuvering) {
        // Necesita cambiar de amura
        if (absDiff < 150) {
            // Traslu
            aiBoat.isManeuvering = true;
            aiBoat.maneuverTimer = 120; // 2 segundos
        } else {
            // Virada
            aiBoat.isManeuvering = true;
            aiBoat.maneuverTimer = 180; // 3 segundos
        }
    }
    
    // Simular errores según personalidad
    if (Math.random() < aiBoat.personalityData.errorRate) {
        // Error: gira en dirección equivocada por un momento
        aiBoat.targetHeading += (Math.random() - 0.5) * 60;
    }
}

// === FÍSICA SIMPLIFICADA DE IA ===
function updateAIPhysics(aiBoat, currentTime) {
    // Actualizar maniobra
    if (aiBoat.isManeuvering) {
        aiBoat.maneuverTimer--;
        if (aiBoat.maneuverTimer <= 0) {
            aiBoat.isManeuvering = false;
        }
        
        // Reducir velocidad durante maniobra
        aiBoat.speed *= 0.95;
    }
    
    // Girar hacia el rumbo objetivo
    let headingDiff = aiBoat.targetHeading - aiBoat.heading;
    if (headingDiff > 180) headingDiff -= 360;
    if (headingDiff < -180) headingDiff += 360;
    
    const turnSpeed = 2.0 * aiBoat.personalityData.turnAggressiveness;
    const headingChange = Math.max(-turnSpeed, Math.min(turnSpeed, headingDiff * 0.1));
    
    aiBoat.heading = normalizeAngle(aiBoat.heading + headingChange);
    
    // Calcular velocidad objetivo basada en viento y personalidad
    const windAngle = normalizeAngle(CONFIG.trueWindDirection - aiBoat.heading);
    let targetSpeed = calculateAISpeed(windAngle);
    targetSpeed *= aiBoat.personalityData.speedFactor;
    
    // Acelerar suavemente hacia el objetivo
    aiBoat.speed += (targetSpeed - aiBoat.speed) * 0.05;
    aiBoat.speed = Math.max(0, aiBoat.speed);
    
    // Ajustar vela y flap automáticamente (IA)
    if (aiBoat.mastGroup) {
        // Vela se ajusta según el viento aparente
        const windAngle = normalizeAngle(CONFIG.trueWindDirection - aiBoat.heading);
        const sailTrim = (windAngle - 90) * 0.5;
        aiBoat.mastGroup.rotation.y = degToRad(sailTrim);
    }
    
    if (aiBoat.flapHinge) {
        // Flap se ajusta suavemente
        const flapAngle = Math.sin(currentTime * 0.001) * 10; // Oscilación suave
        aiBoat.flapHinge.rotation.y = degToRad(-flapAngle);
    }

    // Mover el barco
    const headingRad = degToRad(aiBoat.heading);
    const speedFactor = aiBoat.speed * 0.04;
    
    aiBoat.x += Math.sin(headingRad) * speedFactor;
    aiBoat.z += Math.cos(headingRad) * speedFactor;
    
    // Ajustar foils según velocidad
    if (aiBoat.speed < 10) {
        aiBoat.foilHeight = 0;
    } else if (aiBoat.speed < 18) {
        aiBoat.foilHeight = (aiBoat.speed - 10) / 8;
    } else {
        aiBoat.foilHeight = 1.0;
    }
}

// === CALCULAR VELOCIDAD DE IA ===
function calculateAISpeed(windAngle) {
    // Tabla polar simplificada para IA
    const normAngle = windAngle > 180 ? 360 - windAngle : windAngle;
    
    if (normAngle < 30) return 5; // Zona muerta
    if (normAngle < 60) return 20; // Ceñida
    if (normAngle < 120) return 30; // Través (más rápido)
    if (normAngle < 150) return 25; // Largo
    return 15; // Popa
    
    // Limitar según condición de viento
    if (CONFIG.windCondition === 'light') return Math.min(targetSpeed, 22);
    if (CONFIG.windCondition === 'intermediate') return Math.min(targetSpeed, 35);
    return Math.min(targetSpeed, 45);
}

// === VERIFICAR PASADA DE BOYAS PARA IA ===
function checkAIBuoyPassage(aiBoat) {
    const targetBuoy = RACE_CIRCUIT[aiBoat.nextBuoyIndex];
    if (!targetBuoy) return;
    
    const dx = aiBoat.x - targetBuoy.x;
    const dz = aiBoat.z - targetBuoy.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance <= targetBuoy.radius) {
        console.log(`🤖 [${aiBoat.personalityData.name}] Pasó boya: ${targetBuoy.name}`);
        aiBoat.nextBuoyIndex++;
        
        if (aiBoat.nextBuoyIndex >= RACE_CIRCUIT.length) {
            aiBoat.currentLap++;
            aiBoat.nextBuoyIndex = 0;
            console.log(`🏁 [${aiBoat.personalityData.name}] Vuelta ${aiBoat.currentLap} completada`);
        }
    }
}

// === OBTENER POSICIONES DE IA PARA MINIMAPA ===
function getAIBoatPositions() {
    return window.aiBoats.map(boat => ({
        x: boat.x,
        z: boat.z,
        heading: boat.heading,
        color: boat.personalityData.color,
        name: boat.personalityData.name,
        lap: boat.currentLap,
        nextBuoy: boat.nextBuoyIndex
    }));
}