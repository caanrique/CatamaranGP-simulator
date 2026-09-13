// ============================================
// CATAMARANGP SIMULATOR - MOTOR 3D (THREE.JS)
// Versión con agua realista y estela de espuma
// ============================================

let scene, camera, renderer;
let boatGroup, mastGroup, flapMesh;
let jibMesh;
let foils = { frontPort: null, frontStarboard: null, rearPort: null, rearStarboard: null };
let crewMeshes = {};
let crewGlows = {};
let water, wakeParticles = [];

let cameraState = {
    distance: 25,
    angle: 0,
    height: 15
};

function init3D() {
    const canvas = document.getElementById('canvas3d');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 300);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight2.position.set(-50, 50, -50);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight3.position.set(0, -50, 0);
    scene.add(dirLight3);

    // AGUA REALISTA con Water.js
    createRealisticWater();
    
    // SISTEMA DE ESTELA
    createWakeSystem();

    createBoat();
    window.addEventListener('resize', onWindowResize, false);
}

function createRealisticWater() {
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
    
    water = new THREE.Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg',
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
        ),
        sunDirection: new THREE.Vector3(0, 1, 0),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    });
    
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    scene.add(water);
}

function createWakeSystem() {
    // Crear 80 partículas de espuma (más cantidad para línea continua)
    const particleGeo = new THREE.PlaneGeometry(2, 2);
    const particleMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 80; i++) {
        const particle = new THREE.Mesh(particleGeo, particleMat.clone());
        particle.visible = false;
        particle.rotation.x = -Math.PI / 2;
        scene.add(particle); // Se añaden a la ESCENA, no al barco
        wakeParticles.push({
            mesh: particle,
            life: 0,
            maxLife: 150 // 2.5 segundos de duración
        });
    }
}

function createBoat() {
    boatGroup = new THREE.Group();
    scene.add(boatGroup);

    const loader = new THREE.OBJLoader();
    loader.load(
        'models/catamaran.obj',
        function (object) {
            object.scale.set(0.26, 0.26, 0.26); 
            object.position.set(0, 2, 0);
            
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: 0xecf0f1, 
                        shininess: 50,
                        side: THREE.DoubleSide 
                    });
                }
            });
            
            boatGroup.add(object);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% del modelo cargado');
        },
        function (error) {
            console.error('❌ Error cargando el modelo OBJ:', error);
        }
    );

    createWing();
    createJib();
    createFoils();
    createCrew();
}

function createWing() {
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xf39c12 });
    
    const wingDimensions = {
        light:  { height: 29, mastLength: 2.48, flapLength: 1.52 },
        medium: { height: 24, mastLength: 2.48, flapLength: 1.52 },
        strong: { height: 18, mastLength: 2.48, flapLength: 1.52 }
    };
    const wing = wingDimensions[CONFIG.currentWing] || wingDimensions.medium;
    const wingWidth = 0.7;

    mastGroup = new THREE.Group();
    mastGroup.position.set(0, 2.5, -1.5);
    boatGroup.add(mastGroup);

    const mastGeo = new THREE.BoxGeometry(wingWidth, wing.height, wing.mastLength);
    const mast = new THREE.Mesh(mastGeo, wingMaterial);
    mast.position.set(0, wing.height / 2, wing.mastLength / 2);
    mast.castShadow = true;
    mastGroup.add(mast);

    const hingeGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const hingeMat = new THREE.MeshPhongMaterial({ color: 0x34495e });
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    hinge.position.set(0, wing.height / 2, wing.mastLength);
    mastGroup.add(hinge);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-wingWidth/2, 0);
    flapShape.lineTo(wingWidth/2, 0);
    flapShape.lineTo(0, wing.flapLength);
    flapShape.lineTo(-wingWidth/2, 0);
    
    const extrudeSettings = { steps: 1, depth: wing.height, bevelEnabled: false };
    const flapGeo = new THREE.ExtrudeGeometry(flapShape, extrudeSettings);
    flapMesh = new THREE.Mesh(flapGeo, wingMaterial);
    flapMesh.rotation.x = Math.PI / 2;
    flapMesh.position.set(0, wing.height, wing.mastLength);
    flapMesh.castShadow = true;
    mastGroup.add(flapMesh);
}

function createJib() {
    const jibMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    
    const jibShape = new THREE.Shape();
    jibShape.moveTo(0, 0);       
    jibShape.lineTo(-5, 0);      
    jibShape.lineTo(0, 15);      
    jibShape.lineTo(0, 0);       
    
    const extrudeSettings = {
        steps: 1,
        depth: 0.3,
        bevelEnabled: false
    };
    
    const jibGeo = new THREE.ExtrudeGeometry(jibShape, extrudeSettings);
    jibMesh = new THREE.Mesh(jibGeo, jibMaterial);
    jibMesh.rotation.y = -Math.PI / 2;
    jibMesh.position.set(0, 2.5, -1.84);
    jibMesh.castShadow = true;
    
    boatGroup.add(jibMesh);
    jibMesh.visible = CONFIG.jibActive;
}

function createFoils() {
    const foilMaterial = new THREE.MeshPhongMaterial({ color: 0x34495e });
    const rearFoilHeight = 4;
    const aleronSpan = rearFoilHeight * (2 / 3); 
    
    function createFoilWithAleron(height) {
        const foilGroup = new THREE.Group();
        
        const bladeWidth = 0.08;
        const bladeLength = 1.2;
        const bladeGeo = new THREE.BoxGeometry(bladeWidth, height, bladeLength);
        const blade = new THREE.Mesh(bladeGeo, foilMaterial);
        blade.position.y = height / 2; 
        blade.castShadow = true;
        foilGroup.add(blade);
        
        const aleronThickness = 0.08;
        const aleronChord = 0.8;
        const aleronGeo = new THREE.BoxGeometry(aleronSpan, aleronThickness, aleronChord);
        const aleron = new THREE.Mesh(aleronGeo, foilMaterial);
        aleron.position.y = 0; 
        aleron.castShadow = true;
        foilGroup.add(aleron);
        
        return foilGroup;
    }
    
    foils.frontPort = createFoilWithAleron(5);
    foils.frontPort.position.set(-3.1, -1.8, 0);
    boatGroup.add(foils.frontPort);

    foils.frontStarboard = createFoilWithAleron(5);
    foils.frontStarboard.position.set(3.1, -1.8, 0);
    boatGroup.add(foils.frontStarboard);

    foils.rearPort = createFoilWithAleron(rearFoilHeight);
    foils.rearPort.position.set(-3.1, -1.8, 6);
    boatGroup.add(foils.rearPort);

    foils.rearStarboard = createFoilWithAleron(rearFoilHeight);
    foils.rearStarboard.position.set(3.1, -1.8, 6);
    boatGroup.add(foils.rearStarboard);
}

function createCrew() {
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

    boatGroup.rotation.y = degToRad(CONFIG.boatHeading);
    boatGroup.rotation.z = degToRad(CONFIG.heelAngle);

    const foilBaseY = -1.8;
    const foilLift = CONFIG.foilHeight * 4; 
    
    foils.frontPort.position.y = foilBaseY + foilLift;
    foils.frontStarboard.position.y = foilBaseY + foilLift;
    
    foils.rearPort.position.y = foilBaseY; 
    foils.rearStarboard.position.y = foilBaseY;

    boatGroup.position.y = -2 + (CONFIG.foilHeight * 2);

    mastGroup.rotation.y = degToRad(CONFIG.sailTrim);
    flapMesh.rotation.z = degToRad(CONFIG.flapAngle);

    if (jibMesh && CONFIG.jibActive) {
        jibMesh.visible = true;
        
        let windSide = 1;
        if (CONFIG.sailTrim < -5) {
            windSide = -1;
        }
        
        jibMesh.scale.z = -windSide;
        const curveAngle = 0.05; 
        jibMesh.rotation.y = -Math.PI / 2 + (windSide * curveAngle);
        
    } else if (jibMesh) {
        jibMesh.visible = false;
    }

    // Actualizar agua
    if (water) {
        water.material.uniforms['time'].value += 1.0 / 60.0;
    }

    // Actualizar estela
    updateWake();

    updateCrewPositions();
    updateCamera();
}

function updateWake() {
    const boatSpeed = Math.abs(CONFIG.boatSpeed);
    
    if (boatSpeed > 0.3) {
        const heading = degToRad(CONFIG.boatHeading);
        const cosH = Math.cos(heading);
        const sinH = Math.sin(heading);
        
        // Posición mundial del centro del barco
        const boatX = boatGroup.position.x;
        const boatZ = boatGroup.position.z;
        
        // Coordenadas LOCALES de los foils traseros en el barco:
        // Foil babor: X=-3.1, Z=6 (Z positivo = popa)
        // Foil estribor: X=3.1, Z=6
        const localPort = { x: -3.1, z: 6 };
        const localStarboard = { x: 3.1, z: 6 };
        
        // Transformación correcta de coordenadas locales a mundiales
        // worldX = localX * cos(θ) + localZ * sin(θ) + boatX
        // worldZ = -localX * sin(θ) + localZ * cos(θ) + boatZ
        const rearPortX = localPort.x * cosH + localPort.z * sinH + boatX;
        const rearPortZ = -localPort.x * sinH + localPort.z * cosH + boatZ;
        
        const rearStarboardX = localStarboard.x * cosH + localStarboard.z * sinH + boatX;
        const rearStarboardZ = -localStarboard.x * sinH + localStarboard.z * cosH + boatZ;
        
        // Generar 2 partículas por frame (una por cada foil trasero)
        for (let i = 0; i < 2; i++) {
            const particle = wakeParticles.find(p => p.life <= 0);
            
            if (particle) {
                const posX = (i === 0) ? rearPortX : rearStarboardX;
                const posZ = (i === 0) ? rearPortZ : rearStarboardZ;
                
                // Pequeña variación aleatoria para naturalidad
                const randomOffset = (Math.random() - 0.5) * 0.5;
                
                particle.mesh.position.set(
                    posX + randomOffset,
                    0.1,
                    posZ + randomOffset
                );
                particle.mesh.visible = true;
                particle.life = particle.maxLife;
                particle.mesh.material.opacity = 0.6;
                particle.mesh.scale.set(1, 1, 1);
            }
        }
    }
    
    // Actualizar todas las partículas (se quedan fijas en el agua)
    wakeParticles.forEach(p => {
        if (p.life > 0) {
            p.life--;
            const lifeRatio = p.life / p.maxLife;
            p.mesh.material.opacity = lifeRatio * 0.6;
            p.mesh.scale.multiplyScalar(1.01);
            
            if (p.life <= 0) {
                p.mesh.visible = false;
            }
        }
    });
}

function updateCrewPositions() {
    const zPositions = { 1: 1.5, 2: 3.0, 3: 4.5, 4: 6.0 }; 
    const activeRole = CrewState.activeRole;

    for (const role in CrewState.positions) {
        const pos = CrewState.positions[role];
        const mesh = crewMeshes[role];
        const glow = crewGlows[role];
        
        const x = pos.hull === 'port' ? -2.7 : 2.7;
        const z = zPositions[pos.position];
        
        mesh.position.x += (x - mesh.position.x) * 0.2;
        mesh.position.z += (z - mesh.position.z) * 0.2;
        mesh.position.y = 3.0; 
        
        if (role === activeRole) {
            glow.intensity = 2.5;
        } else {
            glow.intensity = 0;
        }
    }
}

function updateCamera() {
    const input = typeof getInput === 'function' ? getInput() : { cameraX: 0, cameraY: 0 };
    
    cameraState.angle += input.cameraX * 0.05;
    cameraState.distance -= input.cameraY * 0.8;
    cameraState.distance = Math.max(10, Math.min(80, cameraState.distance));
    
    const camX = Math.sin(cameraState.angle) * cameraState.distance;
    const camZ = Math.cos(cameraState.angle) * cameraState.distance;
    const camY = cameraState.height;
    
    const targetPos = new THREE.Vector3(
        boatGroup.position.x + camX,
        boatGroup.position.y + camY,
        boatGroup.position.z + camZ
    );
    
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(boatGroup.position.x, boatGroup.position.y + 2, boatGroup.position.z);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}