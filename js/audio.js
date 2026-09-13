// ============================================
// CATAMARANGP SIMULATOR - MÓDULO DE AUDIO
// Sonidos sintéticos generados con Web Audio API
// ============================================

let audioContext = null;
let audioEnabled = true;

// Inicializar contexto de audio (debe hacerse después de interacción del usuario)
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🔊 Audio inicializado');
        } catch (e) {
            console.log('⚠️ Audio no disponible');
            audioEnabled = false;
        }
    }
}

// Activar audio al primer click/tecla
window.addEventListener('click', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });

// --- SONIDO: VIRADA (tono ascendente suave) ---
function playTackingSound() {
    if (!audioEnabled || !audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(500, audioContext.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
}

// --- SONIDO: TRASLUCHADA (tono descendente + "crack") ---
function playGybingSound() {
    if (!audioEnabled || !audioContext) return;
    
    // Tono base
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
}

// --- SONIDO: CRACK PERFECTO (impacto + éxito) ---
function playPerfectGybeSound() {
    if (!audioEnabled || !audioContext) return;
    
    // Impacto
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(150, audioContext.currentTime);
    
    gain1.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
    
    osc1.start();
    osc1.stop(audioContext.currentTime + 0.1);
    
    // Tono de éxito
    setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(800, audioContext.currentTime);
        osc2.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.2);
        
        gain2.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        
        osc2.start();
        osc2.stop(audioContext.currentTime + 0.2);
    }, 100);
}

// --- SONIDO: VUELCO (tono grave descendente) ---
function playCapsizeSound() {
    if (!audioEnabled || !audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.8);
    
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.8);
}

// --- SONIDO: DESPEGUE (tono ascendente rápido) ---
function playTakeoffSound() {
    if (!audioEnabled || !audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.4);
}

// --- SONIDO: NOSDIVE (impacto grave) ---
function playNosediveSound() {
    if (!audioEnabled || !audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(30, audioContext.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
}