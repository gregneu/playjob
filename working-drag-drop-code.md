<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Grid System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }

        #canvas-container {
            flex: 1;
            position: relative;
        }

        #canvas-3d {
            width: 100%;
            height: 100%;
            display: block;
        }

        /* Таббар */
        .tabbar {
            background: rgba(30, 30, 40, 0.95);
            backdrop-filter: blur(20px);
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
            padding: 20px;
            display: flex;
            justify-content: center;
            gap: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 100;
        }

        .tab-item {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            cursor: move;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            border: 2px solid transparent;
        }

        .tab-item:hover {
            transform: translateY(-5px) scale(1.05);
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .tab-item.dragging {
            opacity: 0.3;
            transform: scale(0.95);
        }

        .tab-icon {
            font-size: 28px;
            margin-bottom: 5px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .tab-label {
            color: white;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Драг превью */
        .drag-ghost {
            position: fixed;
            pointer-events: none;
            z-index: 1000;
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0.9;
            transform: translate(-50%, -50%) rotate(5deg) scale(1.1);
            box-shadow: 0 20px 50px rgba(102, 126, 234, 0.6);
        }

        /* Модальное окно */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }

        .modal.active {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .modal-content {
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            padding: 35px;
            border-radius: 25px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .modal-body {
            color: #e0e0e0;
            line-height: 1.8;
            margin-bottom: 25px;
            font-size: 16px;
        }

        .modal-info {
            background: rgba(102, 126, 234, 0.1);
            padding: 15px;
            border-radius: 12px;
            margin-top: 15px;
            border-left: 3px solid #667eea;
        }

        .modal-info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            color: #b0b0c0;
        }

        .modal-info-label {
            font-weight: 600;
            color: #9090a0;
        }

        .modal-info-value {
            color: #ffffff;
        }

        .modal-close {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px 35px;
            border-radius: 12px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            width: 100%;
        }

        .modal-close:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                transform: translateY(60px) scale(0.95);
                opacity: 0;
            }
            to {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
        }

        /* Координаты подсказка */
        .coord-tooltip {
            position: fixed;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            pointer-events: none;
            z-index: 500;
            display: none;
        }
    </style>
</head>
<body>
    <div id="canvas-container">
        <canvas id="canvas-3d"></canvas>
    </div>

    <div class="tabbar">
        <div class="tab-item" draggable="true" data-type="story" data-icon="📖">
            <div class="tab-icon">📖</div>
            <div class="tab-label">Story</div>
        </div>
        <div class="tab-item" draggable="true" data-type="task" data-icon="📋">
            <div class="tab-icon">📋</div>
            <div class="tab-label">Task</div>
        </div>
        <div class="tab-item" draggable="true" data-type="bug" data-icon="🐛">
            <div class="tab-icon">🐛</div>
            <div class="tab-label">Bug</div>
        </div>
        <div class="tab-item" draggable="true" data-type="test" data-icon="🧪">
            <div class="tab-icon">🧪</div>
            <div class="tab-label">Test</div>
        </div>
    </div>

    <div class="modal" id="modal">
        <div class="modal-content">
            <h2 class="modal-header">Элемент размещён!</h2>
            <div class="modal-body">
                <p id="modalMainText">Вы успешно добавили элемент на 3D сетку</p>
                <div class="modal-info">
                    <div class="modal-info-row">
                        <span class="modal-info-label">Тип элемента:</span>
                        <span class="modal-info-value" id="modalType">-</span>
                    </div>
                    <div class="modal-info-row">
                        <span class="modal-info-label">Координаты:</span>
                        <span class="modal-info-value" id="modalCoords">-</span>
                    </div>
                    <div class="modal-info-row">
                        <span class="modal-info-label">Время:</span>
                        <span class="modal-info-value" id="modalTime">-</span>
                    </div>
                </div>
            </div>
            <button class="modal-close" onclick="closeModal()">Закрыть</button>
        </div>
    </div>

    <div class="coord-tooltip" id="coordTooltip"></div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // Three.js сцена
        let scene, camera, renderer;
        let gridHelper, raycaster, mouse;
        let hoveredTile = null;
        let placedObjects = [];
        let currentDragData = null;
        let dragGhost = null;
        
        const GRID_SIZE = 20;
        const TILE_SIZE = 1;

        // Инициализация Three.js
        function init3D() {
            const container = document.getElementById('canvas-container');
            
            // Сцена
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a0a12);
            scene.fog = new THREE.Fog(0x0a0a12, 10, 50);

            // Камера
            camera = new THREE.PerspectiveCamera(
                60,
                container.clientWidth / container.clientHeight,
                0.1,
                1000
            );
            camera.position.set(10, 15, 10);
            camera.lookAt(0, 0, 0);

            // Рендерер
            renderer = new THREE.WebGLRenderer({
                canvas: document.getElementById('canvas-3d'),
                antialias: true
            });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Освещение
            const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(10, 20, 10);
            directionalLight.castShadow = true;
            directionalLight.shadow.camera.left = -20;
            directionalLight.shadow.camera.right = 20;
            directionalLight.shadow.camera.top = 20;
            directionalLight.shadow.camera.bottom = -20;
            scene.add(directionalLight);

            // Создание сетки тайлов
            createGrid();

            // Raycaster для определения позиции мыши
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();

            // Обработчики событий
            setupEventHandlers();

            // Анимация
            animate();
        }

        // Создание сетки
        function createGrid() {
            // Основание сетки
            const gridGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
            const gridMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x1a1a2e,
                side: THREE.DoubleSide
            });
            const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
            gridMesh.rotation.x = -Math.PI / 2;
            gridMesh.position.y = -0.01;
            gridMesh.receiveShadow = true;
            scene.add(gridMesh);

            // Линии сетки
            const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x444466, 0x333355);
            scene.add(gridHelper);

            // Интерактивные тайлы
            for (let x = -GRID_SIZE/2; x < GRID_SIZE/2; x++) {
                for (let z = -GRID_SIZE/2; z < GRID_SIZE/2; z++) {
                    const tileGeometry = new THREE.PlaneGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
                    const tileMaterial = new THREE.MeshPhongMaterial({
                        color: 0x2a2a3e,
                        transparent: true,
                        opacity: 0.3
                    });
                    const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                    tile.rotation.x = -Math.PI / 2;
                    tile.position.set(x + 0.5, 0.01, z + 0.5);
                    tile.userData = { x: Math.floor(x + GRID_SIZE/2), z: Math.floor(z + GRID_SIZE/2), type: 'gridTile' };
                    scene.add(tile);
                }
            }
        }

        // Обработчики событий
        function setupEventHandlers() {
            const container = document.getElementById('canvas-container');
            
            // Движение мыши
            container.addEventListener('mousemove', onMouseMove);
            
            // Drag & Drop
            const tabs = document.querySelectorAll('.tab-item');
            tabs.forEach(tab => {
                tab.addEventListener('dragstart', onDragStart);
                tab.addEventListener('dragend', onDragEnd);
            });

            container.addEventListener('dragover', onDragOver);
            container.addEventListener('drop', onDrop);

            // Resize
            window.addEventListener('resize', onWindowResize);
        }

        function onMouseMove(event) {
            const container = document.getElementById('canvas-container');
            const rect = container.getBoundingClientRect();
            
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Подсветка тайлов при наведении
            if (!currentDragData) {
                highlightTile();
            }
        }

        function highlightTile() {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            // Сброс предыдущей подсветки
            if (hoveredTile) {
                hoveredTile.material.color.setHex(0x2a2a3e);
                hoveredTile.material.opacity = 0.3;
                hoveredTile = null;
            }

            // Новая подсветка
            for (let intersect of intersects) {
                if (intersect.object.userData.type === 'gridTile') {
                    hoveredTile = intersect.object;
                    hoveredTile.material.color.setHex(0x667eea);
                    hoveredTile.material.opacity = 0.5;
                    break;
                }
            }
        }

        function onDragStart(event) {
            const tab = event.target.closest('.tab-item');
            if (!tab) return;
            
            tab.classList.add('dragging');
            currentDragData = {
                type: tab.dataset.type,
                icon: tab.dataset.icon
            };

            // Создание призрака
            dragGhost = document.createElement('div');
            dragGhost.className = 'drag-ghost';
            dragGhost.innerHTML = tab.innerHTML;
            document.body.appendChild(dragGhost);

            // Скрытие стандартного превью
            const emptyImg = new Image();
            event.dataTransfer.setDragImage(emptyImg, 0, 0);
        }

        function onDragEnd(event) {
            const tab = event.target.closest('.tab-item');
            if (tab) {
                tab.classList.remove('dragging');
            }
            
            if (dragGhost) {
                dragGhost.remove();
                dragGhost = null;
            }
            
            currentDragData = null;
        }

        function onDragOver(event) {
            event.preventDefault();
            
            if (dragGhost) {
                dragGhost.style.left = event.clientX + 'px';
                dragGhost.style.top = event.clientY + 'px';
            }

            // Обновление позиции мыши для подсветки
            const container = document.getElementById('canvas-container');
            const rect = container.getBoundingClientRect();
            
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            highlightTile();
        }

        function onDrop(event) {
            event.preventDefault();
            
            if (!currentDragData) return;

            // Определение тайла под курсором
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            for (let intersect of intersects) {
                if (intersect.object.userData.type === 'gridTile') {
                    const tile = intersect.object;
                    
                    // Добавление визуального маркера
                    addMarkerToTile(tile, currentDragData);
                    
                    // Показ модального окна
                    showModal(tile.userData, currentDragData);
                    
                    break;
                }
            }
        }

        function addMarkerToTile(tile, data) {
            // Создание 3D маркера
            const geometry = new THREE.BoxGeometry(0.6, 0.3, 0.6);
            const material = new THREE.MeshPhongMaterial({
                color: data.type === 'story' ? 0x4CAF50 :
                       data.type === 'task' ? 0x2196F3 :
                       data.type === 'bug' ? 0xFF5722 : 0x9C27B0
            });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.copy(tile.position);
            marker.position.y = 0.15;
            marker.castShadow = true;
            
            // Анимация появления
            marker.scale.set(0, 0, 0);
            animateScale(marker, 1);
            
            scene.add(marker);
            placedObjects.push({
                marker: marker,
                data: data,
                coords: tile.userData
            });

            // Изменение цвета тайла
            tile.material.color.setHex(0x4a4a5e);
            tile.material.opacity = 0.6;
        }

        function animateScale(object, targetScale) {
            const steps = 20;
            let currentStep = 0;
            
            const animate = () => {
                currentStep++;
                const progress = currentStep / steps;
                const easeOut = 1 - Math.pow(1 - progress, 3);
                
                object.scale.set(easeOut * targetScale, easeOut * targetScale, easeOut * targetScale);
                
                if (currentStep < steps) {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        }

        function showModal(coords, data) {
            const modal = document.getElementById('modal');
            const typeNames = {
                'story': 'История',
                'task': 'Задача',
                'bug': 'Баг',
                'test': 'Тест'
            };
            
            document.getElementById('modalType').textContent = typeNames[data.type] + ' ' + data.icon;
            document.getElementById('modalCoords').textContent = `[${coords.x}, ${coords.z}]`;
            document.getElementById('modalTime').textContent = new Date().toLocaleTimeString('ru-RU');
            
            modal.classList.add('active');
        }

        function closeModal() {
            document.getElementById('modal').classList.remove('active');
        }

        function onWindowResize() {
            const container = document.getElementById('canvas-container');
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }

        // Анимация
        function animate() {
            requestAnimationFrame(animate);
            
            // Вращение камеры
            const time = Date.now() * 0.0005;
            camera.position.x = Math.cos(time) * 15;
            camera.position.z = Math.sin(time) * 15;
            camera.lookAt(0, 0, 0);
            
            // Анимация маркеров
            placedObjects.forEach(obj => {
                obj.marker.rotation.y += 0.01;
                obj.marker.position.y = 0.15 + Math.sin(Date.now() * 0.001 + obj.marker.position.x) * 0.05;
            });
            
            renderer.render(scene, camera);
        }

        // Закрытие модалки по клику вне
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                closeModal();
            }
        });

        // Запуск
        init3D();
    </script>
</body>
</html>

