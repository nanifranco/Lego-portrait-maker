import { BRICK_PALETTE } from './colors.js';

const state = {
    image: null,
    canvas: document.getElementById('mainCanvas'),
    ctx: document.getElementById('mainCanvas').getContext('2d', { willReadFrequently: true }),
    studSize: 24
};

// --- Gestión de Imagen ---
document.getElementById('imageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        state.image = new Image();
        state.image.onload = () => console.log("Imagen lista.");
        state.image.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// --- Algoritmo de Color (Percepción Humana) ---
function getClosestBrickColor(r, g, b) {
    let minDistance = Infinity;
    let closest = BRICK_PALETTE[0];

    for (const color of BRICK_PALETTE) {
        const target = hexToRgb(color.hex);
        // Distancia euclidiana ponderada (RMY weights)
        const dr = r - target.r;
        const dg = g - target.g;
        const db = b - target.b;
        const distance = Math.sqrt(dr*dr*0.299 + dg*dg*0.587 + db*db*0.114);

        if (distance < minDistance) {
            minDistance = distance;
            closest = color;
        }
    }
    return closest;
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// --- Renderizado ---
function drawStud(x, y, colorObj, isBuildMode) {
    const { ctx, studSize } = state;
    const { hex, id } = colorObj;

    // Base de la pieza
    ctx.fillStyle = hex;
    ctx.fillRect(x, y, studSize, studSize);

    // Efecto de relieve (Stud)
    ctx.beginPath();
    ctx.arc(x + studSize/2, y + studSize/2, studSize/2.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; // Brillo superior
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();

    // Build Mode: Dibujar ID del color
    if (isBuildMode) {
        ctx.fillStyle = getContrastColor(hex);
        ctx.font = `bold ${studSize/2.5}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(id, x + studSize/2, y + studSize/2 + 4);
    }
}

function getContrastColor(hex) {
    const rgb = hexToRgb(hex);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 125 ? '#000000' : '#FFFFFF';
}

// --- Acción Principal ---
document.getElementById('generateBtn').addEventListener('click', () => {
    if (!state.image) return alert("Sube una foto primero");

    const size = parseInt(document.getElementById('gridSize').value);
    const isBuildMode = document.getElementById('buildMode').checked;
    
    state.canvas.width = size * state.studSize;
    state.canvas.height = size * state.studSize;

    // Redimensionar imagen en canvas oculto para procesar píxeles
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const oCtx = offscreen.getContext('2d');
    
    // Aplicar Brillo/Contraste básico (opcional en el drawImage o manual)
    oCtx.filter = `brightness(${100 + parseInt(document.getElementById('brightness').value)}%) 
                   contrast(${100 + parseInt(document.getElementById('contrast').value)}%)`;
    oCtx.drawImage(state.image, 0, 0, size, size);
    
    const imgData = oCtx.getImageData(0, 0, size, size).data;
    const stats = {};

    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const brick = getClosestBrickColor(imgData[i], imgData[i+1], imgData[i+2]);
            
            drawStud(x * state.studSize, y * state.studSize, brick, isBuildMode);
            
            stats[brick.id] = stats[brick.id] || { name: brick.name, hex: brick.hex, count: 0 };
            stats[brick.id].count++;
        }
    }

    renderInventory(stats, size * size);
    document.getElementById('downloadBtn').disabled = false;
});

function renderInventory(stats, total) {
    const list = document.getElementById('pieceList');
    const invSection = document.getElementById('inventory');
    invSection.classList.remove('hidden');
    list.innerHTML = '';

    Object.values(stats).sort((a, b) => b.count - a.count).forEach(item => {
        list.innerHTML += `
            <div class="piece-item">
                <div class="swatch" style="background: ${item.hex}"></div>
                <div>
                    <div style="font-size: 0.8rem; font-weight: bold">${item.name}</div>
                    <div style="font-size: 0.75rem; color: #aaa">${item.count} piezas</div>
                </div>
            </div>
        `;
    });
    document.getElementById('totalCount').innerText = total;
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'mi-mosaico-lego.png';
    link.href = state.canvas.toDataURL();
    link.click();
});