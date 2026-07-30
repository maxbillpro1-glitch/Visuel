/**
 * Engine Moteur Générateur d'Affiche
 */
document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Contextes
    const canvas = document.getElementById('poster-canvas');
    const ctx = canvas.getContext('2d');
    const dropZone = document.getElementById('drop-zone');
    const dropOverlay = document.getElementById('drop-overlay');
    const imageInput = document.getElementById('image-input');
    const zoomSlider = document.getElementById('zoom-slider');
    
    // Boutons
    const btnChangePhoto = document.getElementById('btn-change-photo');
    const btnRecenter = document.getElementById('btn-recenter');
    const exportButtons = document.querySelectorAll('.btn-export');

    // Dimensions de base de l'affiche (Proportion 4:5)
    const BASE_WIDTH = 1080;
    const BASE_HEIGHT = 1350;

    // État de l'application
    let userImage = null;
    let overlayImage = null;
    let qrCodeCanvas = null;

    // Transformation de la photo
    let state = {
        x: 0,
        y: 0,
        scale: 1,
        minScale: 1
    };

    // Gestion du Drag/Touch
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let initialPinchDistance = null;

    // --- 1. INITIALISATION ET CHARGEMENT DE L'OVERLAY ---
    function init() {
        canvas.width = BASE_WIDTH;
        canvas.height = BASE_HEIGHT;

        // Charger l'overlay PNG
        overlayImage = new Image();
        overlayImage.src = 'overlay.png';
        overlayImage.onload = () => {
            renderCanvas();
        };
        overlayImage.onerror = () => {
            console.warn("overlay.png non trouvé ou invalide. Utilisation du mode sans overlay.");
            renderCanvas();
        };

        // Générer le QR Code pointant vers l'URL du site
        generateQRCode();
    }

    // --- 2. GESTION DU QR CODE ---
    function generateQRCode() {
        const qrContainer = document.getElementById('qrcode-container');
        qrContainer.innerHTML = ''; // Réinitialisation
        
        const currentUrl = window.location.href;

        // eslint-disable-next-ok
        new QRCode(qrContainer, {
            text: currentUrl,
            width: 120,
            height: 120,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Laisser le temps à QRCode.js d'injecter le <canvas> ou <img>
        setTimeout(() => {
            qrCodeCanvas = qrContainer.querySelector('canvas') || qrContainer.querySelector('img');
            renderCanvas();
        }, 200);
    }

    // --- 3. RECADRAGE INTELLIGENT (SMART CROP) ---
    function applySmartCrop() {
        if (!userImage) return;

        // Échelle minimale pour couvrir tout le canvas
        const scaleX = BASE_WIDTH / userImage.width;
        const scaleY = BASE_HEIGHT / userImage.height;
        state.minScale = Math.max(scaleX, scaleY);
        
        // Appliquer un léger zoom par défaut pour un rendu optimal
        state.scale = state.minScale * 1.05;

        // Centrage horizontal
        state.x = (BASE_WIDTH - userImage.width * state.scale) / 2;

        // Recadrage vertical intelligent : privilégier le haut de la photo (têtes/visages)
        // Laisser une marge supérieure (~5% de la hauteur du canvas)
        const topMargin = BASE_HEIGHT * 0.05;
        state.y = topMargin;

        // Sécurité : s'assurer que l'image couvre toujours le bas
        const maxY = 0;
        const minY = BASE_HEIGHT - userImage.height * state.scale;
        state.y = Math.min(maxY, Math.max(minY, state.y));

        // Mettre à jour le slider
        zoomSlider.min = state.minScale;
        zoomSlider.max = state.minScale * 3;
        zoomSlider.value = state.scale;
        zoomSlider.disabled = false;

        renderCanvas();
    }

    // --- 4. MOTEUR DE RENDU DU CANVAS (COMPOSITION) ---
    function renderCanvas(targetCtx = ctx, width = BASE_WIDTH, height = BASE_HEIGHT) {
        const scaleFactor = width / BASE_WIDTH;
        targetCtx.clearRect(0, 0, width, height);

        // A. Photo de l'utilisateur
        if (userImage) {
            targetCtx.drawImage(
                userImage,
                state.x * scaleFactor,
                state.y * scaleFactor,
                (userImage.width * state.scale) * scaleFactor,
                (userImage.height * state.scale) * scaleFactor
            );
        } else {
            // Fond gris par défaut si aucune photo
            targetCtx.fillStyle = '#e2e8f0';
            targetCtx.fillRect(0, 0, width, height);
        }

        // B. Dégradé Brush (Fondu vers le bas)
        // 100% opaque en bas -> 0% opaque vers 50% du canvas
        const gradient = targetCtx.createLinearGradient(0, height * 0.4, 0, height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        targetCtx.fillStyle = gradient;
        targetCtx.fillRect(0, 0, width, height);

        // C. Overlay PNG transparent
        if (overlayImage && overlayImage.complete && overlayImage.naturalWidth !== 0) {
            targetCtx.drawImage(overlayImage, 0, 0, width, height);
        }

        // D. QR Code
        if (qrCodeCanvas) {
            const qrSize = 100 * scaleFactor;
            const margin = 30 * scaleFactor;
            const qrX = width - qrSize - margin;
            const qrY = height - qrSize - margin;

            // Fond blanc sous le QR Code pour lisibilité
            targetCtx.fillStyle = '#FFFFFF';
            targetCtx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);
            
            targetCtx.drawImage(qrCodeCanvas, qrX, qrY, qrSize, qrSize);
        }
    }

    // --- 5. CHARGEMENT DE LA PHOTO ---
    function handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            userImage = new Image();
            userImage.onload = () => {
                dropOverlay.style.display = 'none';
                applySmartCrop();
            };
            userImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- 6. ÉVÉNEMENTS (DRAG & DROP, TOUCH, ZOOM) ---
    
    // Déclencheur sélection de fichier
    dropOverlay.addEventListener('click', () => imageInput.click());
    btnChangePhoto.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

    // Glisser-déposer de fichier
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropOverlay.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropOverlay.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropOverlay.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    // Recentrer / Double-clic
    btnRecenter.addEventListener('click', applySmartCrop);
    canvas.addEventListener('dblclick', applySmartCrop);

    // Zoom via le Slider
    zoomSlider.addEventListener('input', (e) => {
        if (!userImage) return;
        
        const newScale = parseFloat(e.target.value);
        // Ajustement des coordonnées pour zoomer au centre du canvas
        const centerCanvasX = BASE_WIDTH / 2;
        const centerCanvasY = BASE_HEIGHT / 2;
        
        state.x = centerCanvasX - (centerCanvasX - state.x) * (newScale / state.scale);
        state.y = centerCanvasY - (centerCanvasY - state.y) * (newScale / state.scale);
        state.scale = newScale;

        renderCanvas();
    });

    // Zoom via la molette de la souris
    dropZone.addEventListener('wheel', (e) => {
        if (!userImage) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const targetScale = Math.min(Math.max(state.minScale, state.scale + delta), state.minScale * 3);
        
        zoomSlider.value = targetScale;
        zoomSlider.dispatchEvent(new Event('input'));
    }, { passive: false });

    // --- GESTION DU DÉPLACEMENT (SOURIS & TACTILE) ---
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Ratio de conversion coordonnées écran -> coordonnées canvas réelles
        const factor = BASE_WIDTH / rect.width;
        
        return {
            x: (clientX - rect.left) * factor,
            y: (clientY - rect.top) * factor
        };
    }

    function startDrag(e) {
        if (!userImage) return;
        if (e.touches && e.touches.length === 2) {
            // Début du pincement (Pinch Zoom)
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            return;
        }

        isDragging = true;
        const coords = getCanvasCoordinates(e);
        dragStart.x = coords.x - state.x;
        dragStart.y = coords.y - state.y;
    }

    function moveDrag(e) {
        if (!userImage) return;

        // Pincement tactile (Pinch to zoom)
        if (e.touches && e.touches.length === 2 && initialPinchDistance) {
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            const factor = currentDistance / initialPinchDistance;
            const targetScale = Math.min(Math.max(state.minScale, state.scale * factor), state.minScale * 3);
            
            zoomSlider.value = targetScale;
            zoomSlider.dispatchEvent(new Event('input'));
            initialPinchDistance = currentDistance;
            return;
        }

        // Déplacement normal (Drag)
        if (!isDragging) return;
        e.preventDefault();

        const coords = getCanvasCoordinates(e);
        state.x = coords.x - dragStart.x;
        state.y = coords.y - dragStart.y;

        renderCanvas();
    }

    function stopDrag() {
        isDragging = false;
        initialPinchDistance = null;
    }

    // Listener Souris
    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', stopDrag);

    // Listener Tactile
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);

    // --- 7. EXPORT PNG HD ---
    exportButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!userImage) {
                alert("Veuillez d'abord importer une photo.");
                return;
            }

            const scaleMultiplier = parseInt(button.getAttribute('data-scale'));
            const exportWidth = BASE_WIDTH * scaleMultiplier;
            const exportHeight = BASE_HEIGHT * scaleMultiplier;

            // Canvas temporaire pour la haute résolution
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = exportWidth;
            exportCanvas.height = exportHeight;
            const exportCtx = exportCanvas.getContext('2d');

            // Rendu Haute Définition
            renderCanvas(exportCtx, exportWidth, exportHeight);

            // Téléchargement de l'image
            const link = document.createElement('a');
            link.download = `affiche-${exportWidth}x${exportHeight}.png`;
            link.href = exportCanvas.toDataURL('image/png', 1.0);
            link.click();
        });
    });

    // Démarrage
    init();
});
