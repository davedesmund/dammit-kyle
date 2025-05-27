// Audio context for better sound handling
let audioContext = null;
let activeSounds = new Map(); // Map to track sounds by filename

// Initialize audio context on first user interaction
document.addEventListener('click', initAudioContext, { once: true });

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Cache for loaded audio buffers
const audioBufferCache = new Map();

// Load and cache audio file
async function loadAudio(filename) {
    const audioPath = `00_clips/03_master/${filename}`;
    
    // Check cache first
    if (audioBufferCache.has(filename)) {
        return audioBufferCache.get(filename);
    }

    try {
        const response = await fetch(audioPath);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBufferCache.set(filename, audioBuffer);
        return audioBuffer;
    } catch (error) {
        console.error('Error loading audio file:', error);
        return null;
    }
}

// Play sound function
async function playSound(filename) {
    if (!audioContext) {
        initAudioContext();
    }

    const isSingleMode = document.querySelector('input[name="audioMode"][value="single"]').checked;

    if (isSingleMode) {
        // Stop all sounds in single mode
        activeSounds.forEach(sound => sound.stop());
        activeSounds.clear();
    } else {
        // In overlap mode, only stop the same sound if it's playing
        if (activeSounds.has(filename)) {
            activeSounds.get(filename).stop();
            activeSounds.delete(filename);
        }
    }

    const audioBuffer = await loadAudio(filename);
    if (!audioBuffer) return;

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    // Remove the sound when it ends
    source.onended = () => {
        if (activeSounds.get(filename) === source) {
            activeSounds.delete(filename);
        }
    };
    
    source.start(0);
    activeSounds.set(filename, source);
}

// Handle keyboard events
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const keyElement = document.querySelector(`[data-key="${key}"]`);
    
    if (keyElement) {
        // Add active class for visual feedback
        keyElement.classList.add('active');
        
        // Play the associated sound
        const soundFile = keyElement.getAttribute('data-sound');
        playSound(soundFile);
        
        // Remove active class after animation
        setTimeout(() => {
            keyElement.classList.remove('active');
        }, 200);
    }
});

// Handle click/touch events
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        const soundFile = key.getAttribute('data-sound');
        playSound(soundFile);
        
        // Add active class for visual feedback
        key.classList.add('active');
        setTimeout(() => {
            key.classList.remove('active');
        }, 200);
    });
}); 