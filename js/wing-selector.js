// ============================================
// CATAMARANGP SIMULATOR - SELECTOR DE ALA
// Etapa 3.5.4: Opción de jib con validación
// ============================================

let wingSelectorVisible = true;
let selectedWing = 'medium';
let selectedJib = false;  // Estado del jib en el selector
let windForecast = 18;

function showWingSelector() {
    wingSelectorVisible = true;
    selectedJib = false;  // Resetear jib al abrir selector
    
    // OCULTAR controles táctiles para que no tapen el botón "CONFIRMAR"
    const controls = document.querySelector('.controls-layer');
    if (controls) {
        controls.style.display = 'none';
    }
    
    renderWingSelector();
}

function hideWingSelector() {
    wingSelectorVisible = false;
    setWing(selectedWing);
    CONFIG.jibActive = selectedJib;
    console.log(`Ala: ${selectedWing} | Jib: ${selectedJib ? 'ACTIVO' : 'INACTIVO'}`);
    
    // MOSTRAR controles táctiles SOLO si es un dispositivo móvil y el juego ya empezó
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) {
        const controls = document.querySelector('.controls-layer');
        if (controls) {
            controls.style.display = 'flex';
        }
    }
}

function renderWingSelector() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Fondo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Título
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CONFIGURACIÓN DE CARRERA', canvas.width / 2, 50);
    
    // Pronóstico de viento
    ctx.font = '18px Arial';
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Pronóstico de viento: ${windForecast} nudos`, canvas.width / 2, 80);
    
    // --- SECCIÓN 1: SELECCIÓN DE ALA ---
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('1. SELECCIONA TU ALA (↑/↓)', 30, 115);
    
    const wings = [
        { key: 'light', name: 'Ala Ligera (29m)', range: '7-12 nudos', color: '#2ecc71', jibOk: true },
        { key: 'medium', name: 'Ala Media (24m)', range: '12-20 nudos', color: '#f39c12', jibOk: true },
        { key: 'strong', name: 'Ala Fuerte (18m)', range: '20+ nudos', color: '#e74c3c', jibOk: false }
    ];
    
    const startY = 130;
    const boxHeight = 70;
    const boxWidth = Math.min(420, canvas.width - 60);
    const boxX = (canvas.width - boxWidth) / 2;
    
    wings.forEach((wing, index) => {
        const y = startY + index * (boxHeight + 10);
        const isSelected = selectedWing === wing.key;
        
        // Caja
        ctx.fillStyle = isSelected ? wing.color : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(boxX, y, boxWidth, boxHeight);
        
        // Borde
        ctx.strokeStyle = isSelected ? 'white' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeRect(boxX, y, boxWidth, boxHeight);
        
        // Texto
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(wing.name, canvas.width / 2, y + 30);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`Óptimo: ${wing.range}`, canvas.width / 2, y + 52);
    });
    
    // --- SECCIÓN 2: OPCIÓN DE JIB ---
    const jibSectionY = startY + 3 * (boxHeight + 10) + 15;
    
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('2. FOQUE / JIB (tecla J)', 30, jibSectionY);
    
    const currentWingData = wings.find(w => w.key === selectedWing);
    const jibAllowed = currentWingData.jibOk;
    
    // Caja del jib
    const jibBoxY = jibSectionY + 10;
    const jibBoxHeight = 80;
    
    if (jibAllowed) {
        // Jib permitido: mostrar toggle
        ctx.fillStyle = selectedJib ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(boxX, jibBoxY, boxWidth, jibBoxHeight);
        ctx.strokeStyle = selectedJib ? '#2ecc71' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = selectedJib ? 3 : 1;
        ctx.strokeRect(boxX, jibBoxY, boxWidth, jibBoxHeight);
        
        // Toggle visual
        const toggleX = boxX + 20;
        const toggleY = jibBoxY + 25;
        const toggleW = 50;
        const toggleH = 24;
        
        // Fondo del toggle
        ctx.fillStyle = selectedJib ? '#2ecc71' : '#555';
        ctx.beginPath();
        ctx.roundRect(toggleX, toggleY, toggleW, toggleH, 12);
        ctx.fill();
        
        // Círculo del toggle
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(
            selectedJib ? toggleX + toggleW - 12 : toggleX + 12,
            toggleY + 12,
            9, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Texto del toggle
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(
            selectedJib ? 'JIB: ACTIVADO' : 'JIB: DESACTIVADO',
            toggleX + 65, toggleY + 17
        );
        
        // Descripción del efecto ranura
        ctx.font = '13px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(
            'Efecto ranura: acelera el viento en la cara de sotavento del ala (+8% velocidad)',
            canvas.width / 2, jibBoxY + 65
        );
    } else {
        // Jib NO permitido: mostrar bloqueado
        ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
        ctx.fillRect(boxX, jibBoxY, boxWidth, jibBoxHeight);
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, jibBoxY, boxWidth, jibBoxHeight);
        
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🚫 JIB NO DISPONIBLE', canvas.width / 2, jibBoxY + 30);
        
        ctx.font = '13px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(
            'El ala fuerte no permite jib. Demasiada potencia, riesgo de vuelco.',
            canvas.width / 2, jibBoxY + 55
        );
    }
    
    // Guardar posición de la caja del jib para detección de tap
    window.jibBoxBounds = {
        x: boxX,
        y: jibBoxY,
        width: boxWidth,
        height: jibBoxHeight,
        allowed: jibAllowed
    };
    
    // --- BOTÓN CONFIRMAR ---
    const confirmBtnWidth = 220;
    const confirmBtnHeight = 50;
    const confirmBtnX = (canvas.width - confirmBtnWidth) / 2;
    const confirmBtnY = canvas.height - 100;
    
    window.confirmBtnBounds = {
        x: confirmBtnX,
        y: confirmBtnY,
        width: confirmBtnWidth,
        height: confirmBtnHeight
    };
    
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.roundRect(confirmBtnX, confirmBtnY, confirmBtnWidth, confirmBtnHeight, 8);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('▶ CONFIRMAR', canvas.width / 2, confirmBtnY + 32);
    
    // Instrucciones
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px Arial';
    ctx.fillText('↑↓ Ala | J = Jib | ENTER = Confirmar', canvas.width / 2, canvas.height - 40);
}

function handleWingSelectorInput() {
    if (!wingSelectorVisible) return false;
    
    const input = getInput();
    
    // Navegación de alas con ↑/↓
    if (input.dpadUp && !prevInput.dpadUp) {
        const wings = ['light', 'medium', 'strong'];
        const currentIndex = wings.indexOf(selectedWing);
        const newIndex = (currentIndex - 1 + 3) % 3;
        selectedWing = wings[newIndex];
        
        // Si la nueva ala no permite jib, desactivarlo
        if (selectedWing === 'strong') {
            selectedJib = false;
        }
        
        renderWingSelector();
    }
    
    if (input.dpadDown && !prevInput.dpadDown) {
        const wings = ['light', 'medium', 'strong'];
        const currentIndex = wings.indexOf(selectedWing);
        const newIndex = (currentIndex + 1) % 3;
        selectedWing = wings[newIndex];
        
        if (selectedWing === 'strong') {
            selectedJib = false;
        }
        
        renderWingSelector();
    }
    
    // Toggle del jib con tecla J
    if (input.toggleJib && !prevInput.toggleJib) {
        const currentWingData = ['light', 'medium'].includes(selectedWing);
        if (currentWingData) {
            selectedJib = !selectedJib;
            renderWingSelector();
        }
    }
    
    // Confirmación con Enter
    if (keys['Enter']) {
        hideWingSelector();
        return true;
    }
    
    return true;
}

// Detectar tap en el selector
function handleWingSelectorTap(x, y) {
    if (!wingSelectorVisible) return;
    
    // Verificar tap en botón CONFIRMAR
    const btn = window.confirmBtnBounds;
    if (btn && x >= btn.x && x <= btn.x + btn.width && 
        y >= btn.y && y <= btn.y + btn.height) {
        hideWingSelector();
        return;
    }
    
    // Verificar tap en caja del JIB (para toggle táctil)
    const jib = window.jibBoxBounds;
    if (jib && jib.allowed && x >= jib.x && x <= jib.x + jib.width && 
        y >= jib.y && y <= jib.y + jib.height) {
        selectedJib = !selectedJib;
        renderWingSelector();
        return;
    }
}

// Estado anterior para detectar cambios
let prevInput = {
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    toggleJib: false
};

function updatePrevInput() {
    const input = getInput();
    prevInput = { ...input };
}