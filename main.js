// Variables pour l'audio
let audioContext;
let analyser;
let source;
const dataArray = new Uint8Array(512);

// Variables pour Three.js
let scene, camera, renderer;
let currentVisualizer = 'simple';
let geometry, material, mesh;
let particles;
// Variables pour la webcam
let video, videoTexture;
let webcamMaterial;

// Initialisation des écouteurs
document.getElementById('audio-trigger').addEventListener('click', setupAudio);
document.getElementById('style-selector').addEventListener('change', (e) => {
    currentVisualizer = e.target.value;
    // Réinitialiser la scène pour changer de style
    if (scene) {
        // Enlever les objets existants
        scene.clear();
        createVisualizerObjects();
    }
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.body.requestFullscreen().catch(err => {
            alert(`Erreur: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
});

document.addEventListener('fullscreenchange', () => {
    const uiContainer = document.getElementById('ui-container');
    if (document.fullscreenElement) {
        uiContainer.style.display = 'none';
    } else {
        uiContainer.style.display = 'flex';
    }
});

async function setupWebcam() {
    if (!video) {
        video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        // Style pour le cacher
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.zIndex = '-1';
        video.style.opacity = '0'; // On ne veut pas le voir directement
        document.body.appendChild(video);
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            video.srcObject = stream;
            video.play(); // Assurez-vous qu'il joue

            videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.format = THREE.RGBFormat;

        } catch (error) {
            console.error('Impossible d\'accéder à la webcam', error);
        }
    }
}

async function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();

    analyser.fftSize = 1024; // Augmenter la résolution pour plus de détails
    analyser.smoothingTimeConstant = 0.85;
    const bufferLength = analyser.frequencyBinCount;
    // Réajuster la taille dataArray si nécessaire
    if (dataArray.length !== bufferLength) {
        // Note: dataArray is const Uint8Array, we can't resize it simply but 
        // 512 is half of 1024 fftSize so it matches bufferLength (512).
        // Pas besoin de changer si fftSize=1024 => bufferLength=512.
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        document.getElementById('audio-trigger').style.display = 'none';

        setupScene();
        animate();

    } catch (err) {
        console.error("Erreur capture audio:", err);
        alert("Erreur: Impossible d'accéder à l'entrée audio. Vérifiez 'Mixage Stéréo'.");
    }
}

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30; // Reculer un peu la caméra

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    createVisualizerObjects();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function createVisualizerObjects() {
    if (currentVisualizer === 'simple') {
        geometry = new THREE.IcosahedronGeometry(10, 4);
        material = new THREE.MeshNormalMaterial({ wireframe: true });
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }
    else if (currentVisualizer === 'chaotic') {
        // Une sphère avec beaucoup de sommets pour la déformation
        geometry = new THREE.SphereGeometry(10, 64, 64);
        // Sauvegarder les positions originales pour pouvoir revenir à la forme de base
        geometry.userData = { originalPositions: geometry.attributes.position.array.slice() };

        material = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            roughness: 0.4,
            metalness: 0.8,
            wireframe: true // Style "cyber"
        });

        // Ajouter un peu de lumière pour le MeshStandardMaterial
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        const pointLight = new THREE.PointLight(0x00ffcc, 2, 50);
        pointLight.position.set(0, 0, 0);
        scene.add(pointLight);

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }
    else if (currentVisualizer === 'particles') {
        // Système de particules
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 5000;

        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 100;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.5,
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
        });

        particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);
    }
    else if (currentVisualizer === 'webcam') {
        setupWebcam().then(() => {
            // ... (existing webcam code)
            const width = 160; // Résolution de la grille (plus faible que la vidéo pour perf)
            const height = 120;

            const particlesGeometry = new THREE.BufferGeometry();
            const particlesCount = width * height;

            const positions = new Float32Array(particlesCount * 3);
            const uvs = new Float32Array(particlesCount * 2);

            let index = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const posX = (x / width - 0.5) * 50;
                    const posY = (y / height - 0.5) * 50 * (height / width);
                    const posZ = 0;

                    positions[index * 3] = posX;
                    positions[index * 3 + 1] = posY;
                    positions[index * 3 + 2] = posZ;

                    uvs[index * 2] = x / width;
                    uvs[index * 2 + 1] = y / height;

                    index++;
                }
            }

            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particlesGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

            webcamMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTexture: { value: videoTexture },
                    uTime: { value: 0 },
                    uBass: { value: 0.0 }
                },
                vertexShader: `
                    uniform sampler2D uTexture;
                    uniform float uTime;
                    uniform float uBass;
                    varying vec3 vColor;
                    
                    void main() {
                        vColor = texture2D(uTexture, uv).rgb;
                        float luminance = dot(vColor, vec3(0.299, 0.587, 0.114));
                        vec3 pos = position;
                        pos.z += luminance * 10.0 * (uBass + 0.2);
                        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                        gl_PointSize = (2.0 + uBass * 5.0) * (30.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    void main() {
                        vec2 coord = gl_PointCoord - vec2(0.5);
                        if(length(coord) > 0.5) discard;
                        gl_FragColor = vec4(vColor, 1.0);
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            particles = new THREE.Points(particlesGeometry, webcamMaterial);
            scene.add(particles);
        });
    }
    else if (currentVisualizer === 'waveform') {
        // Waveform line
        // On utilise beaucoup de points pour une ligne fluide
        const segments = 512;
        const lineGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(segments * 3);

        // Initialiser une ligne plate centrée
        for (let i = 0; i < segments; i++) {
            // x va de -20 à +20
            const x = (i / (segments - 1) - 0.5) * 40;
            positions[i * 3] = x;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
        }

        lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2 // Note: linewidth ne marche pas toujours sur WebGL
        });

        mesh = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(mesh);
    }
}

function animate() {
    requestAnimationFrame(animate);

    const audioData = updateAudioData();

    // Animation selon le style choisi
    if (currentVisualizer === 'simple') {
        if (mesh) {
            mesh.rotation.x += 0.005;
            mesh.rotation.y += 0.005;
            // Echelle basique sur les basses
            const scale = 1 + audioData.bass;
            mesh.scale.set(scale, scale, scale);
        }
    }
    else if (currentVisualizer === 'chaotic') {
        if (mesh) {
            mesh.rotation.z += 0.002;
            mesh.rotation.x += 0.002;

            // Déformation des sommets
            const positionAttribute = mesh.geometry.attributes.position;
            const originalPositions = mesh.geometry.userData.originalPositions;

            // On va déformer en fonction des fréquences
            // audioData.fullData contient 512 valeurs (0-255)

            for (let i = 0; i < positionAttribute.count; i++) {
                // Obtenir la position d'origine
                const ox = originalPositions[i * 3];
                const oy = originalPositions[i * 3 + 1];
                const oz = originalPositions[i * 3 + 2];

                // Calculer une "direction" depuis le centre (0,0,0)
                // Normalize roughly
                const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
                const nx = ox / len;
                const ny = oy / len;
                const nz = oz / len;

                // Mapper l'index du sommet à une fréquence audio
                // Modulo 256 pour rester dans dataArray (qui pourrait être 512 mais on prend la moitié basse)
                const freqIndex = (i % 256);
                const value = dataArray[freqIndex] / 255.0; // 0.0 à 1.0

                // Facteur de "chaos"
                // On amplifie plus les hautes fréquences pour faire des pics
                const displacement = value * 5 * (audioData.bass + 0.5);

                positionAttribute.setXYZ(
                    i,
                    ox + nx * displacement,
                    oy + ny * displacement,
                    oz + nz * displacement
                );
            }
            positionAttribute.needsUpdate = true;

            // Changer la couleur dynamiquement avec les basses
            mesh.material.color.setHSL(audioData.bass * 0.5, 1, 0.5);
        }
    }
    else if (currentVisualizer === 'particles') {
        if (particles) {
            particles.rotation.y += 0.002;
            const positions = particles.geometry.attributes.position.array;

            for (let i = 0; i < positions.length; i += 3) {
                // Mouvement un peu aléatoire ou basé sur le son
                // On pourrait faire vibrer les particules
                const freq = dataArray[i % 256] / 255.0;

                // Modifier Y en fonction du son
                // positions[i+1] += (Math.random() - 0.5) * freq; 

                // Ou faire une vague
            }
            particles.geometry.attributes.position.needsUpdate = true;

            // Zoom in/out avec les basses
            const scale = 1 + audioData.bass * 0.5;
            particles.scale.set(scale, scale, scale);
        }
    }
    else if (currentVisualizer === 'webcam') {
        if (webcamMaterial) {
            webcamMaterial.uniforms.uTime.value += 0.05;
            webcamMaterial.uniforms.uBass.value = audioData.bass;

            if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
                if (videoTexture) videoTexture.needsUpdate = true;
            }
        }
    }
    else if (currentVisualizer === 'waveform') {
        if (mesh && mesh.isLine) { // Verify it's indeed the line
            const positions = mesh.geometry.attributes.position.array;
            // dataArray length is 512 normally

            for (let i = 0; i < positions.length / 3; i++) {
                // Utiliser le signal temporel si on l'avait (getByteTimeDomainData)
                // Mais ici on a getByteFrequencyData dans dataArray.
                // On peut simuler une waveform ou afficher le spectre.

                // Pour un effet waveform (oscilloscope), il faudrait TimeDomainData.
                // Si on veut juste voir les fréquences style EQ :

                const val = dataArray[i] || 0;
                const normalized = val / 255.0;

                // Y position based on frequency amplitude
                positions[i * 3 + 1] = normalized * 10;
            }
            mesh.geometry.attributes.position.needsUpdate = true;

            // Rotation légère pour le style
            // mesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
        }
    }

    renderer.render(scene, camera);
}


function updateAudioData() {
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);

        let bassSum = 0;
        for (let i = 0; i < 10; i++) bassSum += dataArray[i];
        const bass = (bassSum / 10) / 255;

        let midSum = 0;
        for (let i = 20; i < 100; i++) midSum += dataArray[i];
        const mids = (midSum / 80) / 255;

        return { bass, mids, fullData: dataArray };
    }
    return { bass: 0, mids: 0, fullData: dataArray };
}