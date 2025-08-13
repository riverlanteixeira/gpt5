class StrangerThingsAR {
    constructor() {
        this.currentMission = 1;
        this.maxMissions = 7;
        this.userLocation = null;
        this.foundObjects = [];
        this.gameObjects = [];
        this.radarEnabled = true;
        this.scene = null;
        this.camera = null;
        
        // Configurações para o bairro (será ajustado com base na localização do usuário)
        this.missionConfig = {
            1: {
                title: "Missão 1: Encontre o Walkie-Talkie",
                description: "Dustin perdeu seu walkie-talkie! Ele deve estar em algum lugar próximo ao parque.",
                object: "walkieTalkie",
                audioFile: "mission1Audio",
                found: false
            },
            2: {
                title: "Missão 2: Procure a Bússola",
                description: "Uma bússola misteriosa apareceu no bairro. Ela pode levar ao Mundo Invertido!",
                object: "compass", 
                audioFile: "mission2Audio",
                found: false
            },
            3: {
                title: "Missão 3: O Taco de Baseball",
                description: "Steve deixou seu taco de baseball em algum lugar. Você consegue encontrá-lo?",
                object: "baseballBat",
                audioFile: "mission3Audio", 
                found: false
            },
            4: {
                title: "Missão 4: Cuidado com o Demogorgon!",
                description: "Sinais estranhos foram detectados. Procure pelo Demogorgon, mas mantenha distância!",
                object: "demogorgon",
                audioFile: "mission4Audio",
                found: false
            },
            5: {
                title: "Missão 5: Manual do Mestre",
                description: "O Dungeon Master's Guide pode ter as respostas. Encontre-o rapidamente!",
                object: "dungeonGuide",
                audioFile: "mission5Audio",
                found: false
            },
            6: {
                title: "Missão 6: O Machado Perdido",
                description: "Um machado foi abandonado por aqui. Pode ser útil contra os monstros!",
                object: "machado",
                audioFile: "mission6Audio",
                found: false
            },
            7: {
                title: "Missão 7: Salve Will Byers",
                description: "Will está preso no Mundo Invertido! Encontre sua bicicleta e o resgate!",
                object: "willInvertido",
                audioFile: "mission7Audio",
                found: false
            }
        };

        this.init();
    }

    async init() {
        console.log("Iniciando Stranger Things AR...");
        
        // Aguarda o carregamento do A-Frame
        await this.waitForAFrame();
        
        // Inicializa componentes
        this.scene = document.querySelector('#scene');
        this.camera = document.querySelector('#camera');
        
        // Configura eventos
        this.setupEventListeners();
        
        // Solicita geolocalização
        await this.requestGeolocation();
        
        // Gera objetos no mapa
        this.generateGameObjects();
        
        // Remove tela de carregamento
        this.hideLoadingScreen();
        
        // Inicia primeira missão
        this.updateMissionDisplay();
    }

    waitForAFrame() {
        return new Promise((resolve) => {
            if (window.AFRAME) {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    setupEventListeners() {
        // GPS camera update
        this.camera.addEventListener('gps-camera-update-position', (event) => {
            this.userLocation = event.detail.position;
            this.updateDistances();
        });

        // Detecção de objetos encontrados
        this.scene.addEventListener('click', (event) => {
            this.checkObjectInteraction(event);
        });

        // Eventos de toque para mobile
        this.scene.addEventListener('touchstart', (event) => {
            this.checkObjectInteraction(event);
        });

        // Componente customizado para detecção de proximidade
        AFRAME.registerComponent('proximity-detector', {
            schema: {
                distance: {type: 'number', default: 15}, // 15 metros
                objectId: {type: 'string'}
            },
            
            tick: function() {
                if (!this.el.sceneEl.systems['gps-new-camera'] || !this.el.sceneEl.systems['gps-new-camera'].data) return;
                
                const gpsCamera = this.el.sceneEl.systems['gps-new-camera'];
                const userPosition = gpsCamera.data;
                
                if (userPosition && userPosition.longitude !== undefined) {
                    const objectPosition = this.el.getAttribute('gps-new-entity-place');
                    if (objectPosition) {
                        const distance = this.calculateDistance(
                            userPosition.latitude, userPosition.longitude,
                            objectPosition.latitude, objectPosition.longitude
                        );
                        
                        // Notifica o jogo sobre a distância
                        this.el.setAttribute('data-distance', distance);
                        
                        if (distance < this.data.distance) {
                            this.el.emit('object-nearby', {distance: distance, objectId: this.data.objectId});
                        }
                    }
                }
            },
            
            calculateDistance: function(lat1, lon1, lat2, lon2) {
                const R = 6371e3; // Earth's radius in meters
                const φ1 = lat1 * Math.PI/180;
                const φ2 = lat2 * Math.PI/180;
                const Δφ = (lat2-lat1) * Math.PI/180;
                const Δλ = (lon1-lon2) * Math.PI/180;
                
                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ/2) * Math.sin(Δλ/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                
                return R * c;
            }
        });
    }

    async requestGeolocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                alert("Geolocalização não é suportada neste dispositivo!");
                reject(new Error("Geolocation not supported"));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    console.log("Localização obtida:", this.userLocation);
                    resolve(this.userLocation);
                },
                (error) => {
                    console.error("Erro ao obter localização:", error);
                    alert("Erro ao acessar GPS. Verifique as permissões e tente novamente.");
                    reject(error);
                },
                options
            );
        });
    }

    generateGameObjects() {
        if (!this.userLocation) {
            console.error("Localização do usuário não disponível");
            return;
        }

        // Gera posições aleatórias em um raio de 500m ao redor do usuário
        const baseLatitude = this.userLocation.latitude;
        const baseLongitude = this.userLocation.longitude;
        const radiusInDegrees = 0.005; // Aproximadamente 500m

        Object.keys(this.missionConfig).forEach((missionNum, index) => {
            const mission = this.missionConfig[missionNum];
            
            // Gera posição aleatória
            const angle = (Math.PI * 2 * index) / Object.keys(this.missionConfig).length;
            const distance = Math.random() * radiusInDegrees * 0.7 + radiusInDegrees * 0.3;
            
            const latitude = baseLatitude + (distance * Math.cos(angle));
            const longitude = baseLongitude + (distance * Math.sin(angle));

            this.createGameObject(mission.object, latitude, longitude, missionNum);
        });
    }

    createGameObject(modelId, latitude, longitude, missionNum) {
        const entity = document.createElement('a-entity');
        
        // Configurações específicas por objeto
        const objectConfigs = {
            walkieTalkie: { scale: '2 2 2', rotation: '0 0 0' },
            compass: { scale: '3 3 3', rotation: '0 45 0' },
            baseballBat: { scale: '1.5 1.5 1.5', rotation: '45 0 0' },
            demogorgon: { scale: '4 4 4', rotation: '0 0 0' },
            dungeonGuide: { scale: '2 2 2', rotation: '0 30 0' },
            machado: { scale: '2 2 2', rotation: '30 0 0' },
            willInvertido: { scale: '1 1 1', rotation: '0 0 0' },
            bicicleta: { scale: '1 1 1', rotation: '0 90 0' }
        };

        const config = objectConfigs[modelId] || { scale: '2 2 2', rotation: '0 0 0' };
        
        entity.setAttribute('gltf-model', `#${modelId}`);
        entity.setAttribute('scale', config.scale);
        entity.setAttribute('rotation', config.rotation);
        entity.setAttribute('gps-new-entity-place', `latitude: ${latitude}; longitude: ${longitude}`);
        entity.setAttribute('animation-mixer', 'clip: *; loop: repeat');
        entity.setAttribute('proximity-detector', `distance: 15; objectId: ${modelId}`);
        entity.setAttribute('data-mission', missionNum);
        entity.setAttribute('look-at', '[gps-new-camera]');
        
        // Adiciona efeitos visuais
        entity.setAttribute('animation', {
            property: 'rotation',
            to: '0 360 0',
            dur: 10000,
            easing: 'linear',
            loop: true
        });

        // Event listener para proximidade
        entity.addEventListener('object-nearby', (event) => {
            this.handleObjectNearby(event.detail.objectId, event.detail.distance);
        });

        this.scene.appendChild(entity);
        
        this.gameObjects.push({
            entity: entity,
            modelId: modelId,
            latitude: latitude,
            longitude: longitude,
            missionNum: missionNum,
            found: false
        });

        console.log(`Objeto ${modelId} criado em ${latitude}, ${longitude}`);
    }

    handleObjectNearby(objectId, distance) {
        const gameObject = this.gameObjects.find(obj => obj.modelId === objectId);
        if (gameObject && !gameObject.found && gameObject.missionNum == this.currentMission) {
            this.updateDistanceIndicator(`${objectId.toUpperCase()} próximo! ${Math.round(distance)}m`);
            
            if (distance < 5) { // Muito próximo - pode coletar
                this.showCollectionPrompt(gameObject);
            }
        }
    }

    showCollectionPrompt(gameObject) {
        const prompt = confirm(`Você encontrou ${gameObject.modelId}! Deseja coletá-lo?`);
        if (prompt) {
            this.collectObject(gameObject);
        }
    }

    collectObject(gameObject) {
        gameObject.found = true;
        gameObject.entity.setAttribute('visible', false);
        
        this.missionConfig[gameObject.missionNum].found = true;
        this.foundObjects.push(gameObject);
        
        // Feedback visual e sonoro
        this.showSuccessMessage(`${gameObject.modelId} coletado!`);
        this.playCollectionSound();
        
        // Próxima missão
        if (gameObject.missionNum == this.currentMission) {
            setTimeout(() => {
                this.nextMission();
            }, 2000);
        }
    }

    updateDistances() {
        if (!this.userLocation) return;

        this.gameObjects.forEach(obj => {
            if (!obj.found) {
                const distance = this.calculateDistance(
                    this.userLocation.latitude, this.userLocation.longitude,
                    obj.latitude, obj.longitude
                );
                
                obj.distance = distance;
                
                if (obj.missionNum == this.currentMission) {
                    this.updateDistanceIndicator(`Objetivo: ${Math.round(distance)}m`);
                }
            }
        });
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon1-lon2) * Math.PI/180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }

    updateMissionDisplay() {
        const mission = this.missionConfig[this.currentMission];
        if (mission) {
            document.getElementById('missionTitle').textContent = mission.title;
            document.getElementById('missionDescription').textContent = mission.description;
        }
    }

    updateDistanceIndicator(text) {
        document.getElementById('distanceIndicator').textContent = text;
    }

    showSuccessMessage(message) {
        const indicator = document.getElementById('distanceIndicator');
        const originalText = indicator.textContent;
        indicator.style.color = '#00ff00';
        indicator.style.borderColor = '#00ff00';
        indicator.textContent = message;
        
        setTimeout(() => {
            indicator.style.color = '#00ff00';
            indicator.style.borderColor = '#00ff00';
            indicator.textContent = originalText;
        }, 3000);
    }

    playCollectionSound() {
        // Implementar som de coleta (pode usar Web Audio API)
        console.log("Som de coleta reproduzido");
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 1000);
    }

    checkObjectInteraction(event) {
        // Implementa detecção de clique/toque em objetos
        const intersectedElement = event.detail.intersectedEl;
        if (intersectedElement && intersectedElement.hasAttribute('data-mission')) {
            const missionNum = intersectedElement.getAttribute('data-mission');
            const gameObject = this.gameObjects.find(obj => obj.missionNum == missionNum);
            if (gameObject && !gameObject.found) {
                this.showCollectionPrompt(gameObject);
            }
        }
    }
}

// Funções globais para os botões da UI
function playCurrentMission() {
    const mission = game.missionConfig[game.currentMission];
    if (mission && mission.audioFile) {
        const audio = document.getElementById(mission.audioFile);
        if (audio) {
            audio.play().catch(e => console.log("Erro ao reproduzir áudio:", e));
        }
    }
}

function toggleRadar() {
    const radar = document.getElementById('radar');
    game.radarEnabled = !game.radarEnabled;
    radar.style.display = game.radarEnabled ? 'block' : 'none';
}

function nextMission() {
    if (game.currentMission < game.maxMissions) {
        game.currentMission++;
        game.updateMissionDisplay();
        game.updateDistances();
    } else {
        alert("Parabéns! Você completou todas as missões de Stranger Things AR!");
    }
}

// Inicializa o jogo quando a página carregar
let game;
window.addEventListener('load', () => {
    game = new StrangerThingsAR();
});

// Previne zoom em dispositivos móveis
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

document.addEventListener('gesturechange', function (e) {
    e.preventDefault();
});

document.addEventListener('gestureend', function (e) {
    e.preventDefault();
});