/* --- PREMIUM AURORA MUSIC PLAYER LOGIC --- */

// 1. Core Playlist Data
const DEFAULT_PLAYLIST = [
    {
        title: "Midnight Resonance",
        artist: "SoundHelix Alpha",
        album: "Retro Resonance EP",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
        duration: "06:12"
    },
    {
        title: "Neon Horizon",
        artist: "SoundHelix Beta",
        album: "Cyber Synths Vol. I",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop",
        duration: "07:05"
    },
    {
        title: "Celestial Glow",
        artist: "SoundHelix Gamma",
        album: "Galactic Drifters",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop",
        duration: "05:02"
    },
    {
        title: "Aurora Dreamscape",
        artist: "SoundHelix Delta",
        album: "Atmospherics",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
        cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop",
        duration: "05:18"
    }
];

let playlist = [...DEFAULT_PLAYLIST];
let currentTrackIndex = 0;
let isPlaying = false;
let isMuted = false;
let previousVolume = 0.8;
let shuffleMode = false;
let loopMode = 'all'; // 'off' | 'one' | 'all'

// Web Audio API Variables
let audioContext;
let audioSource;
let analyser;
let visualizerAnimationId;
let isAudioContextInitialized = false;

// DOM Elements
const audio = document.getElementById('main-audio');
const playPauseBtn = document.getElementById('btn-play-pause');
const playIcon = playPauseBtn.querySelector('.play-icon');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const shuffleBtn = document.getElementById('btn-shuffle');
const loopBtn = document.getElementById('btn-loop');
const loopIndicator = loopBtn.querySelector('.loop-indicator');
const volumeBtn = document.getElementById('btn-volume');
const volumeSlider = document.getElementById('volume-slider');
const volumeFill = document.getElementById('volume-fill');
const volumePercentage = document.getElementById('volume-percentage');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressGlow = document.querySelector('.progress-bar-glow');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const albumArt = document.getElementById('album-art');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackAlbum = document.getElementById('track-album');
const playlistList = document.getElementById('playlist-list');
const searchInput = document.getElementById('search-tracks');
const localFileInput = document.getElementById('local-file-input');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar-panel');
const modalOverlay = document.getElementById('info-modal');
const settingsTrigger = document.getElementById('settings-trigger');
const modalClose = document.getElementById('modal-close');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

// 2. Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    // Hide Loader
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.classList.add('fade-out');
    }, 1500);

    // Initial setups
    renderPlaylist();
    loadTrack(currentTrackIndex);
    setupCanvas();
    setupEventListeners();
    updateVolumeSlider(volumeSlider.value);
});

// Setup Canvas Size
function setupCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', setupCanvas);

// 3. Audio & Control Functions
function loadTrack(index) {
    const track = playlist[index];
    if (!track) return;

    audio.src = track.src;
    
    // UI Updates
    albumArt.src = track.cover;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackAlbum.textContent = track.album || "Aurora Special Track";
    totalTimeEl.textContent = track.duration || "00:00";
    currentTimeEl.textContent = "00:00";
    progressFill.style.width = "0%";
    progressGlow.style.width = "0%";

    // Reset rotation style
    albumArt.style.transform = 'rotate(0deg)';

    // Active Playlist Item Highlight
    document.querySelectorAll('.playlist-item').forEach((item, idx) => {
        if (idx === index) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });

    // If currently playing, play new track
    if (isPlaying) {
        audio.play().then(() => {
            initAudioContext();
        }).catch(err => console.log("Playback error: ", err));
    }
}

function togglePlay() {
    if (isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
}

function playTrack() {
    isPlaying = true;
    audio.play().then(() => {
        initAudioContext();
    }).catch(err => {
        console.log("Playback failed: Wait for interaction or CORS bypass", err);
    });

    playIcon.className = "fa-solid fa-pause";
    albumArt.classList.remove('paused');
    albumArt.classList.add('playing');
    
    showToast(`Now Playing: ${playlist[currentTrackIndex].title}`);
    startVisualizer();
}

function pauseTrack() {
    isPlaying = false;
    audio.pause();
    playIcon.className = "fa-solid fa-play play-icon";
    albumArt.classList.remove('playing');
    albumArt.classList.add('paused');
    showToast("Playback Paused");
}

function nextTrack() {
    if (shuffleMode) {
        currentTrackIndex = Math.floor(Math.random() * playlist.length);
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    }
    loadTrack(currentTrackIndex);
    if (isPlaying) playTrack();
}

function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) playTrack();
}

// 4. Progress bar interactions
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    
    const percentage = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = `${percentage}%`;
    progressGlow.style.width = `${percentage}%`;
    
    currentTimeEl.textContent = formatTime(audio.currentTime);
    totalTimeEl.textContent = formatTime(audio.duration);
});

// Click/seek progress bar
progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    
    if (duration) {
        audio.currentTime = (clickX / width) * duration;
    }
});

// 5. Volume Adjustments
function updateVolumeSlider(value) {
    audio.volume = value;
    volumeFill.style.width = `${value * 100}%`;
    volumePercentage.textContent = `${Math.round(value * 100)}%`;
    
    // Icon update
    const icon = volumeBtn.querySelector('i');
    if (value == 0) {
        icon.className = "fa-solid fa-volume-xmark";
        isMuted = true;
    } else if (value < 0.4) {
        icon.className = "fa-solid fa-volume-low";
        isMuted = false;
    } else {
        icon.className = "fa-solid fa-volume-high";
        isMuted = false;
    }
}

volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    updateVolumeSlider(val);
});

volumeBtn.addEventListener('click', () => {
    if (isMuted) {
        updateVolumeSlider(previousVolume);
        volumeSlider.value = previousVolume;
        showToast("Audio Unmuted");
    } else {
        previousVolume = volumeSlider.value;
        updateVolumeSlider(0);
        volumeSlider.value = 0;
        showToast("Audio Muted");
    }
});

// 6. Loop & Shuffle Controls
shuffleBtn.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    shuffleBtn.classList.toggle('active', shuffleMode);
    showToast(shuffleMode ? "Shuffle Mode Enabled" : "Shuffle Mode Disabled");
});

loopBtn.addEventListener('click', () => {
    if (loopMode === 'all') {
        loopMode = 'one';
        loopBtn.classList.add('active');
        loopIndicator.textContent = "1";
        showToast("Loop Current Track");
    } else if (loopMode === 'one') {
        loopMode = 'off';
        loopBtn.classList.remove('active');
        loopIndicator.style.display = "none";
        showToast("Loop Disabled");
    } else {
        loopMode = 'all';
        loopBtn.classList.add('active');
        loopIndicator.textContent = "All";
        loopIndicator.style.display = "block";
        showToast("Loop Entire Playlist");
    }
});

// Autoplay handling on end
audio.addEventListener('ended', () => {
    if (loopMode === 'one') {
        audio.currentTime = 0;
        playTrack();
    } else if (loopMode === 'all') {
        nextTrack();
    } else {
        // off mode: stop if last track
        if (currentTrackIndex < playlist.length - 1) {
            nextTrack();
        } else {
            pauseTrack();
        }
    }
});

// 7. Playlist Panel Functions
function renderPlaylist(filtered = playlist) {
    playlistList.innerHTML = '';
    
    filtered.forEach((track, index) => {
        // Find absolute index matching the global playlist index
        const globalIndex = playlist.findIndex(t => t.src === track.src);

        const item = document.createElement('div');
        item.classList.add('playlist-item');
        if (globalIndex === currentTrackIndex) item.classList.add('active');

        item.innerHTML = `
            <div class="item-thumb-wrapper">
                <img class="item-thumb" src="${track.cover}" alt="${track.title}">
            </div>
            <div class="item-details">
                <div class="item-title">${track.title}</div>
                <div class="item-artist">${track.artist}</div>
            </div>
            <div class="item-duration">${track.duration || '00:00'}</div>
        `;

        item.addEventListener('click', () => {
            currentTrackIndex = globalIndex;
            loadTrack(currentTrackIndex);
            playTrack();
        });

        playlistList.appendChild(item);
    });
}

// Search filtration
searchInput.addEventListener('input', (e) => {
    const text = e.target.value.toLowerCase();
    const filtered = playlist.filter(track => 
        track.title.toLowerCase().includes(text) || 
        track.artist.toLowerCase().includes(text)
    );
    renderPlaylist(filtered);
});

// Local file upload handling
localFileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length === 0) return;

    let addedCount = 0;
    Array.from(files).forEach((file, index) => {
        const fileURL = URL.createObjectURL(file);
        
        // Simple filename cleanup for title & artist
        const fullName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
        const parts = fullName.split(" - ");
        const title = parts[1] || parts[0];
        const artist = parts[0] !== title ? parts[0] : "Local Audio";

        const newTrack = {
            title: title,
            artist: artist,
            album: "Local Upload",
            src: fileURL,
            cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop", // placeholder art
            duration: "Local File"
        };

        playlist.push(newTrack);
        addedCount++;
    });

    renderPlaylist();
    showToast(`Added ${addedCount} tracks to Library!`);

    // Play first of uploaded files
    currentTrackIndex = playlist.length - addedCount;
    loadTrack(currentTrackIndex);
    playTrack();
});

// 8. Web Audio API Canvas Equalizer
function initAudioContext() {
    if (isAudioContextInitialized) return;

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
        
        isAudioContextInitialized = true;
    } catch(e) {
        console.log("AudioContext initialization failed or blocked by CORS: ", e);
    }
}

function startVisualizer() {
    cancelAnimationFrame(visualizerAnimationId);
    
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        visualizerAnimationId = requestAnimationFrame(draw);
        
        let hasActiveSignal = false;
        if (analyser) {
            analyser.getByteFrequencyData(dataArray);
            // Check if analyser has non-zero data
            for(let i=0; i<bufferLength; i++) {
                if (dataArray[i] > 0) {
                    hasActiveSignal = true;
                    break;
                }
            }
        }
        
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Setup visual styling of circular visualizer around the album art
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 135; // slightly larger than the art ring diameter
        
        const barsCount = 72;
        const barWidth = 3;
        
        for (let i = 0; i < barsCount; i++) {
            const angle = (i / barsCount) * Math.PI * 2;
            
            // Dual-mode analyzer fallback:
            // If real frequency data exists, use it. Otherwise, simulate gorgeous waves using Math.sin
            let val = 0;
            if (isPlaying) {
                if (hasActiveSignal) {
                    const dataIdx = Math.floor((i / barsCount) * bufferLength);
                    val = dataArray[dataIdx] * 0.35;
                } else {
                    // Procedural fallback simulator when playing but CORS or context is blocked
                    val = (Math.sin(i * 0.4 + Date.now() * 0.01) + 1) * 15 + Math.random() * 5;
                }
            }
            
            const barHeight = Math.max(4, val);
            
            // Coordinates around the ring
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            // Glowing neon color palette gradient selector based on bar index
            const gradient = canvasCtx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)'); // purple
            gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.7)'); // blue
            gradient.addColorStop(1, 'rgba(236, 72, 153, 0.9)'); // pink
            
            canvasCtx.strokeStyle = gradient;
            canvasCtx.lineWidth = barWidth;
            canvasCtx.lineCap = 'round';
            
            canvasCtx.beginPath();
            canvasCtx.moveTo(x1, y1);
            canvasCtx.lineTo(x2, y2);
            canvasCtx.stroke();
        }
    }
    
    draw();
}

// 9. Keyboard Shortcuts Implementation
window.addEventListener('keydown', (e) => {
    // Avoid capturing triggers inside the search box
    if (document.activeElement === searchInput) return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            prevTrack();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextTrack();
            break;
        case 'ArrowUp':
            e.preventDefault();
            let upVal = Math.min(1, parseFloat(volumeSlider.value) + 0.05);
            volumeSlider.value = upVal;
            updateVolumeSlider(upVal);
            showToast(`Volume: ${Math.round(upVal * 100)}%`);
            break;
        case 'ArrowDown':
            e.preventDefault();
            let downVal = Math.max(0, parseFloat(volumeSlider.value) - 0.05);
            volumeSlider.value = downVal;
            updateVolumeSlider(downVal);
            showToast(`Volume: ${Math.round(downVal * 100)}%`);
            break;
    }
});

// 10. Helper Utilities
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Smooth animate in
    setTimeout(() => toast.classList.add('show'), 50);
    
    // Remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2800);
}

// 11. Custom Modals & Sidebars Setup
function setupEventListeners() {
    playPauseBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);

    // Sidebar Mobile Toggle
    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Hide sidebar on body click in mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900) {
            if (!sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Info Dialog triggering
    settingsTrigger.addEventListener('click', () => {
        modalOverlay.classList.add('open');
    });
    
    modalClose.addEventListener('click', () => {
        modalOverlay.classList.remove('open');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('open');
        }
    });
}
