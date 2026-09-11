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
    const boxHeight = 100;
    const boxWidth = 400;
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
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(wing.name, canvas.width / 2, y + 40);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`Óptimo: ${wing.range}`, canvas.width / 2, y + 70);
    });
    
    // Instrucciones
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px Arial';
    ctx.fillText('Usa ↑ ↓ para seleccionar | ENTER para confirmar', canvas.width / 2, canvas.height - 50);
}

function handleWingSelectorInput() {
    if (!wingSelectorVisible) return false;
    
    const input = getInput();
    
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
    
    if (keys['Enter']) {
        hideWingSelector();
        return true;
    }
    
    return true;
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
