// ============================================
// CATAMARANGP SIMULATOR - MOTOR 3D (THREE.JS)
// Versión Final: Boyas funcionando + Agua Gigante
// ============================================

let scene, camera, renderer;
let boatGroup, mastGroup, flapMesh;
let jibMesh;
let jibHinge; 
let flapHinge;
let foils = { frontPort: null, frontStarboard: null, rearPort: null, rearStarboard: null };
let crewMeshes = {};
let crewGlows = {};
let water, wakeParticles = [];
let sky, sun;
let hullMeshRef = null;

// === SISTEMA DE PISTA Y BOYAS (Variable Global) ===
window.trackBuoys = [];

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

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000); // Aumentado a 2000 para ver más lejos
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

    createRealisticWater();
    createDynamicSky();
    createWakeSystem();
    createBoat();
    
    window.addEventListener('resize', onWindowResize, false);
}

function createRealisticWater() {
    const waterGeometry = new THREE.PlaneGeometry(5000, 5000); // AGUA GIGANTE
    water = new THREE.Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg',
            function (texture) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; }
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

function createDynamicSky() {
    sky = new THREE.Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    
    sun = new THREE.Vector3();
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    
    const phi = THREE.MathUtils.degToRad(90 - 30);
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sun);
    
    const dirLight = scene.children.find(obj => obj instanceof THREE.DirectionalLight);
    if (dirLight) {
        dirLight.position.copy(sun).multiplyScalar(100);
    }
}

function createWakeSystem() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const foamTexture = new THREE.CanvasTexture(canvas);
    const particleGeo = new THREE.PlaneGeometry(3, 3);
    const particleMat = new THREE.MeshBasicMaterial({
        map: foamTexture, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false
    });
    
    for (let i = 0; i < 80; i++) {
        const particle = new THREE.Mesh(particleGeo, particleMat.clone());
        particle.visible = false;
        particle.rotation.x = -Math.PI / 2;
        scene.add(particle);
        wakeParticles.push({ mesh: particle, life: 0, maxLife: 180 });
    }
}

function createBoat() {
    boatGroup = new THREE.Group();
    scene.add(boatGroup);

    loadModel('models/hull.obj', function(hull) {
        hull.name = "hullMesh";
        hullMeshRef = hull;
        hull.scale.set(1, 1, 1);
        hull.position.set(0, 1, 0);
        hull.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true; child.receiveShadow = true;
                child.material = new THREE.MeshPhongMaterial({ color: 0xe74c3c, shininess: 50, side: THREE.DoubleSide });
            }
        });
        boatGroup.add(hull);
    });

    loadModel('models/foils.obj', function(foilsModel) {
        foilsModel.scale.set(1, 1, 1);
        foilsModel.position.set(0, 1, 0);
        foilsModel.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.material = new THREE.MeshPhongMaterial({ color: 0x2c3e50, shininess: 30 });
            }
        });
        boatGroup.add(foilsModel);
        foils.frontPort = foilsModel;
    });

    loadModel('models/wing.obj', function(wing) {
        wing.scale.set(1, 1, 1);
        mastGroup = new THREE.Group();
        mastGroup.position.set(0, 1, 0);
        mastGroup.add(wing);
        wing.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.material = new THREE.MeshPhongMaterial({ color: 0xecf0f1, shininess: 40 });
            }
        });
        boatGroup.add(mastGroup);
    });

    loadModel('models/flap.obj', function(flap) {
        flap.scale.set(1, 1, 1);
        const HINGE_Z = 2.48;  
        const FLAP_OFFSET_Z = -2.48; 
        flapHinge = new THREE.Group();
        flapHinge.position.set(0, 0, HINGE_Z); 
        flap.position.set(0, 0, FLAP_OFFSET_Z); 
        flapMesh = flap;
        flap.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.material = new THREE.MeshPhongMaterial({ color: 0xe67e22, shininess: 50 });
            }
        });
        flapHinge.add(flapMesh);
        if (mastGroup) mastGroup.add(flapHinge);
    });

    loadModel('models/jib.obj', function(jib) {
        jib.scale.set(1, 1, 1);
        jibHinge = new THREE.Group();
        jibHinge.position.set(0, 1.3, 0.5); 
        jib.position.set(0, 0, -0.3); 
        jib.rotation.y = 0; 
        
        jibMesh = jib;
        jib.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.material = new THREE.MeshPhongMaterial({ color: 0xff4757, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
            }
        });
        
        jibHinge.add(jibMesh);
        boatGroup.add(jibHinge);
        jibMesh.visible = (typeof CONFIG !== 'undefined' && CONFIG.jibActive);
    });

    createCrew();
}

function loadModel(path, callback) {
    const loader = new THREE.OBJLoader();
    loader.load(path, callback, 
        function (xhr) { console.log((xhr.loaded / xhr.total * 100) + '% cargado: ' + path); },
        function (error) { console.error('❌ Error cargando ' + path + ':', error); }
    );
}

function createCrew() {
    const crewOriginalColors = { helmsman: 0xf1c40f, trimmer: 0xffffff, grinder_1: 0x3498db, grinder_2: 0x2ecc71 };
    const inactiveColor = 0x2c3e50;
    
    for (const role in crewOriginalColors) {
        const sphereGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const sphereMat = new THREE.MeshPhongMaterial({ color: inactiveColor });
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.castShadow = true;
        boatGroup.add(mesh);
        crewMeshes[role] = mesh;
        mesh.userData.originalColor = crewOriginalColors[role];
        
        const glowLight = new THREE.PointLight(crewOriginalColors[role], 0, 5);
        mesh.add(glowLight);
        crewGlows[role] = glowLight;
    }
}

function update3DScene() {
    if (!boatGroup) return;

    boatGroup.rotation.y = degToRad(CONFIG.boatHeading);
    boatGroup.rotation.z = degToRad(CONFIG.heelAngle);
    boatGroup.position.y = -2 + (CONFIG.foilHeight * 2.5);

    if (mastGroup) mastGroup.rotation.y = degToRad(CONFIG.sailTrim);
    if (flapHinge) flapHinge.rotation.y = degToRad(-CONFIG.flapAngle);

    if (jibMesh && typeof CONFIG !== 'undefined' && CONFIG.jibActive) {
        jibMesh.visible = true;
    } else if (jibMesh) {
        jibMesh.visible = false;
    }

    if (water) water.material.uniforms['time'].value += 1.0 / 60.0;
    updateWake();
    updateCrewPositions();
    updateCamera();
}

function updateWake() {
    const boatSpeed = Math.abs(CONFIG.boatSpeed);
    if (boatSpeed > 0.3) {
        const heading = degToRad(CONFIG.boatHeading);
        const cosH = Math.cos(heading), sinH = Math.sin(heading);
        const boatX = boatGroup.position.x, boatZ = boatGroup.position.z;
        
        const localPort = { x: -4.4, z: 6 }, localStarboard = { x: 4.4, z: 6 };
        const rearPortX = localPort.x * cosH + localPort.z * sinH + boatX;
        const rearPortZ = -localPort.x * sinH + localPort.z * cosH + boatZ;
        const rearStarboardX = localStarboard.x * cosH + localStarboard.z * sinH + boatX;
        const rearStarboardZ = -localStarboard.x * sinH + localStarboard.z * cosH + boatZ;
        
        for (let i = 0; i < 2; i++) {
            const particle = wakeParticles.find(p => p.life <= 0);
            if (particle) {
                const posX = (i === 0) ? rearPortX : rearStarboardX;
                const posZ = (i === 0) ? rearPortZ : rearStarboardZ;
                const randomOffset = (Math.random() - 0.5) * 0.8;
                particle.mesh.position.set(posX + randomOffset, 0.05, posZ + randomOffset);
                particle.mesh.visible = true;
                particle.life = particle.maxLife;
                particle.mesh.material.opacity = 0.7;
                particle.mesh.scale.set(0.5, 0.5, 0.5);
            }
        }
    }
    wakeParticles.forEach(p => {
        if (p.life > 0) {
            p.life--;
            const lifeRatio = p.life / p.maxLife;
            p.mesh.material.opacity = lifeRatio * 0.7;
            p.mesh.scale.setScalar(0.5 + (1 - lifeRatio) * 1.5);
            if (p.life <= 0) p.mesh.visible = false;
        }
    });
}

function updateCrewPositions() {
    if (typeof CrewState === 'undefined') return;
    const zPositions = { 1: 1.5, 2: 3.0, 3: 4.5, 4: 6.0 }; 
    const activeRole = CrewState.activeRole;
    const inactiveColor = 0x2c3e50;
    
    for (const role in CrewState.positions) {
        const pos = CrewState.positions[role];
        const mesh = crewMeshes[role];
        const glow = crewGlows[role];
        
        const x = pos.hull === 'port' ? -4.0 : 4.0;
        const z = zPositions[pos.position];
        
        mesh.position.x += (x - mesh.position.x) * 0.04;
        mesh.position.z += (z - mesh.position.z) * 0.04;
        mesh.position.y = 3.0; 
        
        if (role === activeRole) {
            mesh.material.color.setHex(mesh.userData.originalColor);
            glow.intensity = 2.5;
        } else {
            mesh.material.color.setHex(inactiveColor);
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
    
    const targetPos = new THREE.Vector3(boatGroup.position.x + camX, boatGroup.position.y + camY, boatGroup.position.z + camZ);
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(boatGroup.position.x, boatGroup.position.y + 2, boatGroup.position.z);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// === SISTEMA DE PISTA Y BOYAS CORREGIDO ===
// ==========================================

function createPracticeTrack() {
    // 1. Limpiar boyas anteriores si existen
    if (window.trackBuoys && window.trackBuoys.length > 0) {
        window.trackBuoys.forEach(buoy => {
            scene.remove(buoy);
            if (buoy.geometry) buoy.geometry.dispose();
            if (buoy.material) buoy.material.dispose();
        });
        window.trackBuoys = [];
    }
    
    // 2. Coordenadas ajustadas para caber perfectamente en el campo de 4000x2000m
    // (X va de -2000 a 2000, Z va de -1000 a 1000)
    const marks = [
        { x: 0, z: 600, color: 0xff0000, name: "Línea de Salida (Sotavento)" },
        { x: 0, z: -800, color: 0xffaa00, name: "Boya Barlovento" },
        { x: 600, z: 600, color: 0xff0000, name: "Boya Sotavento 1" },
        { x: -600, z: 600, color: 0xff0000, name: "Boya Sotavento 2" }
    ];

    const cylinderGeo = new THREE.CylinderGeometry(4, 4, 20, 16);
    const sphereGeo = new THREE.SphereGeometry(4.5, 16, 16);
    
    marks.forEach(mark => {
        const material = new THREE.MeshPhongMaterial({ color: mark.color, shininess: 80 });
        const buoy = new THREE.Mesh(cylinderGeo, material);
        
        buoy.position.set(mark.x, 10, mark.z);
        buoy.userData = { name: mark.name, radius: 20 };
        
        const topMesh = new THREE.Mesh(sphereGeo, material);
        topMesh.position.y = 10;
        buoy.add(topMesh);
        
        scene.add(buoy);
        window.trackBuoys.push(buoy);
    });
    
    console.log('🎯 Pista de práctica OLÍMPICA creada con ' + window.trackBuoys.length + ' boyas');
    console.log('📍 Boyas ubicadas dentro de los límites del campo (4000x2000m)');
}

function clearPracticeTrack() {
    if (window.trackBuoys && window.trackBuoys.length > 0) {
        window.trackBuoys.forEach(buoy => {
            scene.remove(buoy);
            if (buoy.geometry) buoy.geometry.dispose();
            if (buoy.material) buoy.material.dispose();
        });
        window.trackBuoys = [];
    }
}

function clearPracticeTrack() {
    if (window.trackBuoys && window.trackBuoys.length > 0) {
        window.trackBuoys.forEach(buoy => {
            scene.remove(buoy);
            if (buoy.geometry) buoy.geometry.dispose();
            if (buoy.material) buoy.material.dispose();
        });
        window.trackBuoys = [];
    }
}