// ============================================
// CATAMARANGP SIMULATOR - MOTOR 3D (THREE.JS)
// Versión mejorada: ala rediseñada, cámara controlable, glow en tripulantes
// ============================================

let scene, camera, renderer;
let boatGroup, mastGroup, flapMesh;
let foils = { port: null, starboard: null };
let crewMeshes = {};
let crewGlows = {}; // Halos de luz para tripulante activo

// Estado de la cámara
let cameraState = {
    distance: 25,      // Distancia al barco (zoom)
    angle: 0,          // Ángulo de órbita (radianes)
    height: 15         // Altura de la cámara
};

function init3D() {
    const canvas = document.getElementById('canvas3d');
    
    // 1. Escena y Cámara
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 300);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // 3. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 4. Agua
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
    const waterMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a5276, 
        transparent: true, 
        opacity: 0.8,
        shininess: 80
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    scene.add(water);

    // 5. Crear el Barco
    createBoat();

    window.addEventListener('resize', onWindowResize, false);
}

function createBoat() {
    boatGroup = new THREE.Group();
    scene.add(boatGroup);

    const hullMaterial = new THREE.MeshPhongMaterial({ color: 0xecf0f1 });
    const deckMaterial = new THREE.MeshPhongMaterial({ color: 0x95a5a6 });
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xf39c12 });

    // --- CASCOS ---
    const hullGeo = new THREE.BoxGeometry(4, 3, 20);
    
    const portHull = new THREE.Mesh(hullGeo, hullMaterial);
    portHull.position.set(-8, 0, 0);
    portHull.castShadow = true;
    boatGroup.add(portHull);

    const starboardHull = new THREE.Mesh(hullGeo, hullMaterial);
    starboardHull.position.set(8, 0, 0);
    starboardHull.castShadow = true;
    boatGroup.add(starboardHull);

    // --- PLATAFORMA ---
    const deckGeo = new THREE.BoxGeometry(20, 1, 12);
    const deck = new THREE.Mesh(deckGeo, deckMaterial);
    deck.position.set(0, 2, 0);
    deck.castShadow = true;
    boatGroup.add(deck);

    // --- DIMENSIONES DEL ALA según tipo ---
    const wingDimensions = {
        light:  { height: 29, mastLength: 2.48, flapLength: 1.52 },
        medium: { height: 24, mastLength: 2.48, flapLength: 1.52 },
        strong: { height: 18, mastLength: 2.48, flapLength: 1.52 }
    };
    const wing = wingDimensions[CONFIG.currentWing] || wingDimensions.medium;
    const wingWidth = 0.7; // 70 cm

    // --- GRUPO DEL MÁSTIL (eje de rotación en borde de PROA) ---
    mastGroup = new THREE.Group();
    mastGroup.position.set(0, 2.5, 0);
    boatGroup.add(mastGroup);

    // --- MÁSTIL (Leading Edge): Rectángulo VERTICAL ---
    const mastGeo = new THREE.BoxGeometry(wingWidth, wing.height, wing.mastLength);
    const mast = new THREE.Mesh(mastGeo, wingMaterial);
    mast.position.set(0, wing.height / 2, wing.mastLength / 2);
    mast.castShadow = true;
    mastGroup.add(mast);

    // --- BISAGRA: En el borde de POPA del mástil ---
    const hingeGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const hingeMat = new THREE.MeshPhongMaterial({ color: 0x34495e });
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    hinge.position.set(0, wing.height / 2, wing.mastLength);
    mastGroup.add(hinge);

    // --- FLAP TRASERO: Triángulo VERTICAL ---
    // Shape en plano XY: base en Y=0, punta en Y=flapLength
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-wingWidth/2, 0);
    flapShape.lineTo(wingWidth/2, 0);
    flapShape.lineTo(0, wing.flapLength);
    flapShape.lineTo(-wingWidth/2, 0);
    
    // Extruimos con depth = altura del ala (24m)
    const extrudeSettings = {
        steps: 1,
        depth: wing.height,
        bevelEnabled: false
    };
    
    const flapGeo = new THREE.ExtrudeGeometry(flapShape, extrudeSettings);
    flapMesh = new THREE.Mesh(flapGeo, wingMaterial);
    
    // Rotación: Math.PI/2 para que la extrusión (Z) vaya en dirección Y mundial
    flapMesh.rotation.x = Math.PI / 2;
    
    // Posición: 
    // - Y = wing.height (para que el flap quede al mismo nivel que el mástil)
    // - Z = wing.mastLength (para que empiece en el borde de popa del mástil)
    flapMesh.position.set(0, wing.height, wing.mastLength);
    
    flapMesh.castShadow = true;
    mastGroup.add(flapMesh);

    // --- FOILS ---
    const foilMaterial = new THREE.MeshPhongMaterial({ color: 0x34495e });
    const foilGeo = new THREE.BoxGeometry(0.5, 8, 0.5);
    
    foils.port = new THREE.Mesh(foilGeo, foilMaterial);
    foils.port.position.set(-8, -2, 2);
    boatGroup.add(foils.port);

    foils.starboard = new THREE.Mesh(foilGeo, foilMaterial);
    foils.starboard.position.set(8, -2, 2);
    boatGroup.add(foils.starboard);

    // --- TRIPULACIÓN con GLOW ---
    const crewColors = {
        helmsman: 0xe74c3c,
        trimmer: 0xf39c12,
        grinder_1: 0x3498db,
        grinder_2: 0x9b59b6
    };

    for (const role in crewColors) {
        const sphereGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const sphereMat = new THREE.MeshPhongMaterial({ color: crewColors[role] });
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.castShadow = true;
        boatGroup.add(mesh);
        crewMeshes[role] = mesh;
        
        const glowLight = new THREE.PointLight(crewColors[role], 0, 5);
        mesh.add(glowLight);
        crewGlows[role] = glowLight;
    }
}

function update3DScene() {
    if (!boatGroup) return;

    // 1. Rotación del barco (Rumbo)
    boatGroup.rotation.y = degToRad(CONFIG.boatHeading);

    // 2. Escora
    boatGroup.rotation.z = degToRad(CONFIG.heelAngle);

    // 3. Altura de los foils
    const foilY = -2 + (CONFIG.foilHeight * 4); 
    foils.port.position.y = foilY;
    foils.starboard.position.y = foilY;
    boatGroup.position.y = CONFIG.foilHeight * 2;

    // 4. Rotación del Mástil
    mastGroup.rotation.y = degToRad(CONFIG.sailTrim);

    // 5. Rotación del Flap (relativo al mástil)
    flapMesh.rotation.z = degToRad(CONFIG.flapAngle); // Rotación sobre eje Z ahora

    // 6. Actualizar tripulación y glows
    updateCrewPositions();

    // 7. Actualizar cámara según joystick derecho
    updateCamera();
}

function updateCrewPositions() {
    const zPositions = { 1: -6, 2: -2, 3: 2, 4: 6 };
    const activeRole = CrewState.activeRole;

    for (const role in CrewState.positions) {
        const pos = CrewState.positions[role];
        const mesh = crewMeshes[role];
        const glow = crewGlows[role];
        
        const x = pos.hull === 'port' ? -8 : 8;
        const z = zPositions[pos.position];
        
        // Suavizar movimiento
        mesh.position.x += (x - mesh.position.x) * 0.2;
        mesh.position.z += (z - mesh.position.z) * 0.2;
        mesh.position.y = 3.5;
        
        // Activar/desactivar glow según tripulante activo
        if (role === activeRole) {
            glow.intensity = 2; // Encendido
        } else {
            glow.intensity = 0; // Apagado
        }
    }
}

function updateCamera() {
    // Leer input del joystick derecho (si existe)
    const input = typeof getInput === 'function' ? getInput() : { cameraX: 0, cameraY: 0 };
    
    // Actualizar estado de cámara
    cameraState.angle += input.cameraX * 0.03; // Rotación horizontal
    cameraState.distance -= input.cameraY * 0.5; // Zoom (acercar/alejar)
    
    // Limitar distancia
    cameraState.distance = Math.max(10, Math.min(50, cameraState.distance));
    
    // Calcular posición de cámara en coordenadas polares
    const camX = Math.sin(cameraState.angle) * cameraState.distance;
    const camZ = Math.cos(cameraState.angle) * cameraState.distance;
    const camY = cameraState.height;
    
    // Posición objetivo
    const targetPos = new THREE.Vector3(
        boatGroup.position.x + camX,
        boatGroup.position.y + camY,
        boatGroup.position.z + camZ
    );
    
    // Interpolación suave
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(boatGroup.position.x, boatGroup.position.y + 2, boatGroup.position.z);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}