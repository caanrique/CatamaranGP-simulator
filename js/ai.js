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
        nextBuoyIndex: 1,
        isManeuvering: false,
        maneuverTimer: 0,
        finishTime: 0,         // NUEVO
        bestLapTime: Infinity, // NUEVO
        lapStartTime: 0,       // NUEVO
        passingBuoyCooldown: 0,
        
        // Mesh 3D (se creará después)
        mesh: null,
        
        // Estado interno de IA
        targetHeading: 0,
        sailTrim: 0,
        foilHeight: 0,
        lastDecisionTime: 0,
        trail: [],        // NUEVO: Historial de posiciones
        lastTrailTime: 0  // NUEVO: Temporizador para la estela
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
        aiBoat.x = -100 + (i * 50);
        aiBoat.z = 600;
        aiBoat.heading = 180;
        aiBoat.nextBuoyIndex = 1; // <-- CAMBIADO: La IA también busca Barlovento primero

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

    if (!raceState.raceStarted) return;
    
    const currentTime = Date.now();

    // UN SOLO bucle forEach que contiene toda la lógica
    window.aiBoats.forEach(aiBoat => {
        
        // 1. Reducir el contador de protección de boya
        if (aiBoat.passingBuoyCooldown > 0) {
            aiBoat.passingBuoyCooldown--;
        }

        // 2. Inicializar el cronómetro de vuelta de la IA si aún no ha empezado
        if (aiBoat.lapStartTime === 0) {
            aiBoat.lapStartTime = raceState.startTime;
        }

        // 3. Registrar posición para la estela cada 500ms (0.5 segundos)
        if (currentTime - aiBoat.lastTrailTime > 500) {
            aiBoat.trail.push({ x: aiBoat.x, z: aiBoat.z });
            // Mantener solo los últimos 40 puntos (aprox. 20 segundos de historial)
            if (aiBoat.trail.length > 40) {
                aiBoat.trail.shift();
            }
            aiBoat.lastTrailTime = currentTime;
        }

        // 4. Tomar decisiones cada 100ms (10 veces por segundo)
        if (currentTime - aiBoat.lastDecisionTime > 100) {
            makeAIDecisions(aiBoat);
            aiBoat.lastDecisionTime = currentTime;
        }
        
        // 5. Actualizar física simplificada
        updateAIPhysics(aiBoat, currentTime);
        
        // 6. Verificar pasadas de boyas
        checkAIBuoyPassage(aiBoat);
        
        // 7. Actualizar mesh 3D
        if (aiBoat.mesh) {
            aiBoat.mesh.position.x = aiBoat.x;
            aiBoat.mesh.position.z = aiBoat.z;
            aiBoat.mesh.position.y = -2 + (aiBoat.foilHeight * 1.2);
            aiBoat.mesh.rotation.y = degToRad(aiBoat.heading + 180);
        }
    }); // <--- ¡Aquí se cierra el único forEach correctamente!
    
    // 8. Manejar colisiones entre todos los barcos
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

// === TOMAR DECISIONES DE IA (Lógica de viento corregida) ===
function makeAIDecisions(aiBoat) {
    let targetBuoy;
    if (aiBoat.nextBuoyIndex < RACE_CIRCUIT.length) {
        targetBuoy = RACE_CIRCUIT[aiBoat.nextBuoyIndex];
    } else {
        targetBuoy = { x: 0, z: 600, radius: 60, name: "Meta" };
    }
    
    // Calcular ángulo hacia el objetivo (geometría pura, no depende del viento)
    const dx = targetBuoy.x - aiBoat.x;
    const dz = targetBuoy.z - aiBoat.z;
    const targetAngle = normalizeAngle(Math.atan2(dx, dz) * (180 / Math.PI));
    
    // === CORRECCIÓN CLAVE ===
    // CONFIG.trueWindDirection es HACIA DÓNDE va el viento (como las flechas del minimapa)
    // Para saber DE DONDE viene, le sumamos 180°
    const windFromDirection = normalizeAngle(CONFIG.trueWindDirection + 180);
    
    // Calculamos el ángulo entre DE DONDE viene el viento y hacia dónde queremos ir
    let angleDiff = Math.abs(normalizeAngle(windFromDirection - targetAngle));
    if (angleDiff > 180) angleDiff = 360 - angleDiff; // Obtener el ángulo más corto
    
    // Si la diferencia es menor a 50°, vamos CONTRA EL VIENTO (Proa) → necesitamos zigzag
    if (angleDiff < 50) {
        // ZIG-ZAG INTELIGENTE: Elegir la amura que nos acerque a la boya
        
        // ¿La boya está a la derecha o izquierda del viento real?
        let relativeBuoyAngle = normalizeAngle(targetAngle - windFromDirection);
        if (relativeBuoyAngle > 180) relativeBuoyAngle -= 360;
        
        // Amura óptima: si la boya está a la derecha del viento, ceñimos por estribor
        const optimalTack = relativeBuoyAngle > 0 ? 'starboard' : 'port';
        
        if (aiBoat.currentTack === undefined) {
            aiBoat.currentTack = optimalTack;
            aiBoat.tackTimer = 0;
        }
        
        aiBoat.tackTimer++;
        const distanceToBuoy = Math.sqrt(dx * dx + dz * dz);
        
        // Virar cada ~10 segundos o si estamos muy cerca de la boya
        const shouldTack = aiBoat.tackTimer > 600 || (distanceToBuoy < 150 && aiBoat.tackTimer > 100);
        
        if (shouldTack) {
            aiBoat.currentTack = aiBoat.currentTack === 'port' ? 'starboard' : 'port';
            aiBoat.tackTimer = 0;
            console.log(`🔄 [${aiBoat.personalityData.name}] Virada en ceñida`);
        }
        
        // Calcular el rumbo de ceñida usando windFromDirection (DE DONDE viene el viento)
        let tackAngle;
        if (aiBoat.currentTack === 'port') {
            tackAngle = normalizeAngle(windFromDirection - 45);
        } else {
            tackAngle = normalizeAngle(windFromDirection + 45);
        }
        aiBoat.targetHeading = tackAngle;
        
    } else {
        // Navegación normal (Través o Popa): Apuntar directo a la boya
        aiBoat.targetHeading = targetAngle;
        aiBoat.currentTack = undefined;
    }
    
    // Calcular diferencia de rumbo para girar suavemente
    let headingDiff = aiBoat.targetHeading - aiBoat.heading;
    if (headingDiff > 180) headingDiff -= 360;
    if (headingDiff < -180) headingDiff += 360;
    
    const absDiff = Math.abs(headingDiff);
    if (absDiff > 90 && !aiBoat.isManeuvering) {
        if (absDiff < 150) {
            aiBoat.isManeuvering = true;
            aiBoat.maneuverTimer = 120;
        } else {
            aiBoat.isManeuvering = true;
            aiBoat.maneuverTimer = 180;
        }
    }
    
    // Simular errores según personalidad
    if (Math.random() < aiBoat.personalityData.errorRate) {
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
    
    // Calcular velocidad objetivo basada en viento y personalidad (viento invertido)
    const windAngle = normalizeAngle(CONFIG.trueWindDirection + 180 - aiBoat.heading);
    let targetSpeed = calculateAISpeed(windAngle);
    targetSpeed *= aiBoat.personalityData.speedFactor;
    
    // Acelerar suavemente hacia el objetivo
    aiBoat.speed += (targetSpeed - aiBoat.speed) * 0.05;
    aiBoat.speed = Math.max(0, aiBoat.speed);
    
    // Ajustar vela y flap automáticamente (IA)
    if (aiBoat.mastGroup) {
        // Vela se ajusta según el viento aparente
        const windAngle = normalizeAngle(CONFIG.trueWindDirection + 180 - aiBoat.heading);
        const sailTrim = (windAngle - 90) * 0.5;
        aiBoat.mastGroup.rotation.y = degToRad(sailTrim);
    }
    
    if (aiBoat.flapHinge) {
        // Flap se ajusta suavemente
        const flapAngle = Math.sin(currentTime * 0.001) * 10; // Oscilación suave
        aiBoat.flapHinge.rotation.y = degToRad(-flapAngle);
    }

    // Mover el barco (Sincronizado con la física del jugador)
    const headingRad = degToRad(aiBoat.heading);
    const speedFactor = aiBoat.speed * 0.04;
    
    aiBoat.x += Math.sin(headingRad) * speedFactor;  // ✅ Signo negativo igual que el jugador
    aiBoat.z += Math.cos(headingRad) * speedFactor;  // ✅ Signo negativo igual que el jugador
    
    // Ajustar foils según velocidad
    if (aiBoat.speed < 10) {
        aiBoat.foilHeight = 0;
    } else if (aiBoat.speed < 18) {
        aiBoat.foilHeight = (aiBoat.speed - 10) / 8;
    } else {
        aiBoat.foilHeight = 1.0;
    }

        // === LÍMITES DEL CAMPO DE REGATA (Igual que el jugador) ===
    const FIELD_HALF_WIDTH = 2000;
    const FIELD_HALF_HEIGHT = 1000;
    const MARGIN = 50; // Margen de seguridad un poco mayor para la IA
    
    // Si la IA se acerca al borde, la empujamos suavemente hacia adentro y reducimos velocidad
    if (aiBoat.x > FIELD_HALF_WIDTH - MARGIN) {
        aiBoat.x = FIELD_HALF_WIDTH - MARGIN;
        aiBoat.speed *= 0.7;
        aiBoat.targetHeading = normalizeAngle(aiBoat.heading - 45); // Girar hacia adentro
    } else if (aiBoat.x < -FIELD_HALF_WIDTH + MARGIN) {
        aiBoat.x = -FIELD_HALF_WIDTH + MARGIN;
        aiBoat.speed *= 0.7;
        aiBoat.targetHeading = normalizeAngle(aiBoat.heading + 45);
    }
    
    if (aiBoat.z > FIELD_HALF_HEIGHT - MARGIN) {
        aiBoat.z = FIELD_HALF_HEIGHT - MARGIN;
        aiBoat.speed *= 0.7;
        aiBoat.targetHeading = normalizeAngle(aiBoat.heading - 45);
    } else if (aiBoat.z < -FIELD_HALF_HEIGHT + MARGIN) {
        aiBoat.z = -FIELD_HALF_HEIGHT + MARGIN;
        aiBoat.speed *= 0.7;
        aiBoat.targetHeading = normalizeAngle(aiBoat.heading + 45);
    }
    // === ORZADA VISUAL DE LA IA ===
    // Simula la escora basada en la velocidad y la dirección del viento
    const windPush = (CONFIG.trueWindSpeed * CONFIG.trueWindSpeed) * 0.008;
    const heelingForce = windPush * Math.sin(degToRad(CONFIG.trueWindDirection - aiBoat.heading));
    const simulatedHeel = heelingForce * 1.2; // Mismo multiplicador que usamos para el jugador
    
    if (aiBoat.mesh) {
        aiBoat.mesh.rotation.z = degToRad(simulatedHeel);
    }
} // <-- Esta es la llave de cierre de updateAIPhysics

// === CALCULAR VELOCIDAD DE IA ===
// === CALCULAR VELOCIDAD DE IA ===
function calculateAISpeed(windAngle) {
    // Tabla polar simplificada para IA
    const normAngle = windAngle > 180 ? 360 - windAngle : windAngle;
    
    let targetSpeed = 15; // Valor por defecto (Popa)
    
    if (normAngle < 30) targetSpeed = 5;       // Zona muerta
    else if (normAngle < 60) targetSpeed = 20; // Ceñida
    else if (normAngle < 120) targetSpeed = 30;// Través (más rápido)
    else if (normAngle < 150) targetSpeed = 25;// Largo
    
    // Limitar según condición de viento (Ahora esto SÍ se ejecuta)
    if (CONFIG.windCondition === 'light') return Math.min(targetSpeed, 22);
    if (CONFIG.windCondition === 'intermediate') return Math.min(targetSpeed, 35);
    
    return Math.min(targetSpeed, 45);
}

// === VERIFICAR PASADA DE BOYAS Y META PARA IA (Blindada contra doble conteo) ===
function checkAIBuoyPassage(aiBoat) {
    let targetX, targetZ, targetRadius;
    
    if (aiBoat.nextBuoyIndex < RACE_CIRCUIT.length) {
        const target = RACE_CIRCUIT[aiBoat.nextBuoyIndex];
        targetX = target.x;
        targetZ = target.z;
        targetRadius = target.radius;
    } else {
        targetX = 0;
        targetZ = 600;
        targetRadius = 60;
    }
    
    const dx = aiBoat.x - targetX;
    const dz = aiBoat.z - targetZ;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance <= targetRadius) {
        // ✅ BLINDAJE: Si el cooldown está activo, ignorar y esperar a salir del radio
        if (aiBoat.passingBuoyCooldown > 0) return;
        
        const passedName = aiBoat.nextBuoyIndex < RACE_CIRCUIT.length ? RACE_CIRCUIT[aiBoat.nextBuoyIndex].name : "Meta";
        console.log(`🤖 [${aiBoat.personalityData.name}] Pasó: ${passedName}`);
        
        // ✅ Activar 3 segundos (180 frames) de inmunidad para evitar doble conteo
        aiBoat.passingBuoyCooldown = 180;
        
        if (aiBoat.nextBuoyIndex < RACE_CIRCUIT.length - 1) {
            aiBoat.nextBuoyIndex++;
        } else if (aiBoat.nextBuoyIndex === RACE_CIRCUIT.length - 1) {
            aiBoat.nextBuoyIndex++; // Ahora es 4 (Meta)
        } else {
            // ¡La IA cruzó la Meta!
            const now = Date.now();
            if (aiBoat.lapStartTime > 0) {
                const lapTime = (now - aiBoat.lapStartTime) / 1000;
                if (lapTime < aiBoat.bestLapTime) {
                    aiBoat.bestLapTime = lapTime;
                }
            }
            
            aiBoat.currentLap++;
            
            if (aiBoat.currentLap >= raceState.totalLaps && aiBoat.finishTime === 0) {
                aiBoat.finishTime = (now - raceState.startTime) / 1000;
                console.log(`🏁 [${aiBoat.personalityData.name}] terminó en ${formatTime(aiBoat.finishTime)}`);
            } else {
                aiBoat.nextBuoyIndex = 1; // Siguiente vuelta
                aiBoat.lapStartTime = now;
            }
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