// Audio context for better sound handling
let audioContext = null;
let activeSounds = new Map(); // Map to track sounds by filename

// Initialize audio context on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context for iOS
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Create a silent buffer and play it to unlock audio
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
}

// Initialize on various user interactions
['touchstart', 'touchend', 'click', 'keydown'].forEach(event => {
    document.addEventListener(event, initAudioContext, { once: true });
});

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
    if (!audioContext || audioContext.state === 'suspended') {
        initAudioContext();
    }

    // Resume audio context if it's suspended (iOS requirement)
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const isSingleMode = document.querySelector('input[name="audioMode"][value="single"]').checked;

    // Find all keys with this sound
    const keys = Array.from(document.querySelectorAll(`.key[data-sound="${filename}"]`));

    if (isSingleMode) {
        // Stop all sounds and remove playing class from all keys
        activeSounds.forEach((sound, soundFile) => {
            sound.stop();
            const activeKeys = document.querySelectorAll(`.key[data-sound="${soundFile}"]`);
            activeKeys.forEach(key => key.classList.remove('playing'));
        });
        activeSounds.clear();
    } else {
        // In overlap mode, only stop the same sound if it's playing
        if (activeSounds.has(filename)) {
            activeSounds.get(filename).stop();
            activeSounds.delete(filename);
            keys.forEach(key => key.classList.remove('playing'));
            return; // Exit early as we're just stopping the sound
        }
    }

    const audioBuffer = await loadAudio(filename);
    if (!audioBuffer) return;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 1.0; // Ensure full volume
    
    // Add playing class to all keys with this sound
    keys.forEach(key => key.classList.add('playing'));
    
    // Remove the sound and playing class when it ends
    source.onended = () => {
        if (activeSounds.get(filename) === source) {
            activeSounds.delete(filename);
            keys.forEach(key => key.classList.remove('playing'));
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
        if (soundFile) {
            playSound(soundFile);
        }
        
        // Remove active class after animation
        setTimeout(() => {
            keyElement.classList.remove('active');
        }, 200);
    }
});

// Handle click/touch events
document.querySelectorAll('.key').forEach(key => {
    ['touchstart', 'click'].forEach(eventType => {
        key.addEventListener(eventType, (e) => {
            // Prevent double-firing on touch devices
            if (eventType === 'click' && e.pointerType === 'touch') return;
            
            const soundFile = key.getAttribute('data-sound');
            if (soundFile) {
                playSound(soundFile);
            }
            
            // Add active class for visual feedback
            key.classList.add('active');
            setTimeout(() => {
                key.classList.remove('active');
            }, 200);
            
            // Prevent default behavior on touch devices
            if (eventType === 'touchstart') {
                e.preventDefault();
            }
        }, { passive: false });
    });
}); 