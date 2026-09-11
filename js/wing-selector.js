// ============================================
// CATAMARANGP SIMULATOR - SELECTOR DE ALA
// Pantalla de selección antes de la carrera
// ============================================

let wingSelectorVisible = true;
let selectedWing = 'medium';
let windForecast = 18; // Pronóstico de viento en nudos

function showWingSelector() {
    wingSelectorVisible = true;
    renderWingSelector();
}

function hideWingSelector() {
    wingSelectorVisible = false;
    setWing(selectedWing);
}

function renderWingSelector() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Fondo semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Título
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SELECCIONA TU ALA', canvas.width / 2, 80);
    
    // Pronóstico de viento
    ctx.font = '20px Arial';
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Pronóstico de viento: ${windForecast} nudos`, canvas.width / 2, 120);
    
    // Opciones de ala
    const wings = [
        { key: 'light', name: 'Ala Ligera (29m)', range: '7-12 nudos', color: '#2ecc71' },
        { key: 'medium', name: 'Ala Media (24m)', range: '12-20 nudos', color: '#f39c12' },
        { key: 'strong', name: 'Ala Fuerte (18m)', range: '20+ nudos', color: '#e74c3c' }
    ];
    
    const startY = 180;
    const boxHeight = 90;
    const boxWidth = Math.min(400, canvas.width - 40);
    const boxX = (canvas.width - boxWidth) / 2;
    
    wings.forEach((wing, index) => {
        const y = startY + index * (boxHeight + 20);
        const isSelected = selectedWing === wing.key;
        
        // Caja
        ctx.fillStyle = isSelected ? wing.color : 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(boxX, y, boxWidth, boxHeight);
        
        // Borde
        ctx.strokeStyle = isSelected ? 'white' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.strokeRect(boxX, y, boxWidth, boxHeight);
        
        // Texto
        ctx.fillStyle = 'white';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(wing.name, canvas.width / 2, y + 38);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`Óptimo: ${wing.range}`, canvas.width / 2, y + 65);
    });
    
    // BOTÓN CONFIRMAR (nuevo)
    const confirmBtnWidth = 200;
    const confirmBtnHeight = 50;
    const confirmBtnX = (canvas.width - confirmBtnWidth) / 2;
    const confirmBtnY = canvas.height - 120;
    
    // Guardar posición del botón para detección de tap
    window.confirmBtnBounds = {
        x: confirmBtnX,
        y: confirmBtnY,
        width: confirmBtnWidth,
        height: confirmBtnHeight
    };
    
    // Dibujar botón
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(confirmBtnX, confirmBtnY, confirmBtnWidth, confirmBtnHeight);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(confirmBtnX, confirmBtnY, confirmBtnWidth, confirmBtnHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('CONFIRMAR', canvas.width / 2, confirmBtnY + 32);
    
    // Instrucciones
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px Arial';
    ctx.fillText('Toca CONFIRMAR o presiona ENTER', canvas.width / 2, canvas.height - 50);
}

function handleWingSelectorInput() {
    if (!wingSelectorVisible) return false;
    
    const input = getInput();
    
    // Navegación con Dpad/táctil o teclado
    if (input.sailUp && !prevInput.sailUp) {
        const wings = ['light', 'medium', 'strong'];
        const currentIndex = wings.indexOf(selectedWing);
        const newIndex = (currentIndex - 1 + 3) % 3;
        selectedWing = wings[newIndex];
        renderWingSelector();
    }
    
    if (input.sailDown && !prevInput.sailDown) {
        const wings = ['light', 'medium', 'strong'];
        const currentIndex = wings.indexOf(selectedWing);
        const newIndex = (currentIndex + 1) % 3;
        selectedWing = wings[newIndex];
        renderWingSelector();
    }
    
    // Confirmación con Enter (teclado)
    if (keys['Enter']) {
        hideWingSelector();
        return true;
    }
    
    return true;
}

// Detectar tap en el botón CONFIRMAR o en cualquier parte de la pantalla
function handleWingSelectorTap(x, y) {
    if (!wingSelectorVisible) return;
    
    // Verificar si el tap fue en el botón CONFIRMAR
    const btn = window.confirmBtnBounds;
    if (btn && x >= btn.x && x <= btn.x + btn.width && 
        y >= btn.y && y <= btn.y + btn.height) {
        hideWingSelector();
        return;
    }
    
    // También confirmar si se toca cualquier parte de la pantalla
    // (comentado por ahora, descomenta si prefieres esta opción)
    // hideWingSelector();
}

// Estado anterior para detectar cambios
let prevInput = {
    sailUp: false,
    sailDown: false
};

function updatePrevInput() {
    const input = getInput();
    prevInput = { ...input };
}
