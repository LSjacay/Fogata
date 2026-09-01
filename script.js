(function () {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth;
  let H = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.25);

  let audioCtx = null;
  let isPlayingMusic = false;
  let currentAudioSource = 'audio';
  let activeAudio = new Audio('perfect.mp3');
  activeAudio.loop = true;

  let ytPlayer = null;
  let ytApiReady = false;
  let pendingVideoId = null;
  let currentYtVideoId = null;

  const playBtn = document.getElementById('playBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const prevTrackBtn = document.getElementById('prevTrackBtn');
  const nextTrackBtn = document.getElementById('nextTrackBtn');
  const rewindBtn = document.getElementById('rewindBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const waveViz = document.getElementById('waveViz');
  const trackTitle = document.getElementById('trackTitle');
  const trackStatus = document.getElementById('trackStatus');
  const openYtBtn = document.getElementById('openYtBtn');
  const ytModal = document.getElementById('ytModal');
  const closeYtModal = document.getElementById('closeYtModal');
  const ytUrlInput = document.getElementById('ytUrlInput');
  const loadYtBtn = document.getElementById('loadYtBtn');
  const fileInput = document.getElementById('fileInput');

  const mouse = {
    x: W / 2,
    y: H * 0.75,
    prevX: W / 2,
    prevY: H * 0.75,
    vx: 0,
    vy: 0,
    down: false
  };

  let windX = 0;
  let targetWindX = 0;
  let pokeBoost = 0;
  let guitarStrumAnim = 0;
  let currentChordIdx = 0;

  const stars = [];
  const flameParticles = [];
  const sparks = [];
  const embers = [];
  const smokePuffs = [];
  const steamMug = [];
  const groundMist = [];
  const treeLayers = [[], [], [], []];
  const mountainLayers = [[], []];
  const grassTufts = [];
  const pitRocks = [];
  const groundGlowEmbers = [];
  const fireflies = [];
  let shootingStar = null;

  const CHORD_PROGRESSIONS = [
    [164.81, 246.94, 329.63, 392.00, 493.88, 659.25],
    [196.00, 246.94, 293.66, 392.00, 587.33, 783.99],
    [130.81, 196.00, 261.63, 329.63, 392.00, 523.25],
    [146.83, 220.00, 293.66, 440.00, 587.33]
  ];

  window.onYouTubeIframeAPIReady = function() {
    ytApiReady = true;
    createYTPlayer();
  };

  function createYTPlayer() {
    if (!ytApiReady || ytPlayer || !window.YT || !window.YT.Player) return;
    try {
      ytPlayer = new YT.Player('ytPlayer', {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: (event) => {
            try {
              event.target.setVolume(100);
              event.target.unMute();
              if (pendingVideoId && currentAudioSource === 'youtube') {
                event.target.loadVideoById(pendingVideoId);
                event.target.playVideo();
                pendingVideoId = null;
              }
            } catch (e) {}
          },
          onStateChange: (event) => {
            if (currentAudioSource !== 'youtube') return;
            if (event.data === YT.PlayerState.PLAYING) {
              isPlayingMusic = true;
              updatePlayButtonUI(true);
              trackStatus.textContent = 'Streaming from YouTube 🔊';
              try {
                const data = ytPlayer.getVideoData();
                if (data && data.title && data.title !== 'YouTube') {
                  trackTitle.textContent = data.title;
                }
              } catch (e) {}
            } else if (event.data === YT.PlayerState.PAUSED) {
              isPlayingMusic = false;
              updatePlayButtonUI(false);
              trackStatus.textContent = 'Paused';
            } else if (event.data === YT.PlayerState.ENDED) {
              isPlayingMusic = false;
              updatePlayButtonUI(false);
              trackStatus.textContent = 'Track Finished';
            } else if (event.data === YT.PlayerState.BUFFERING) {
              trackStatus.textContent = 'Buffering YouTube... ⏳';
            }
          },
          onError: (event) => {
            if (currentAudioSource !== 'youtube') return;
            console.warn('YouTube error:', event.data);
            if (event.data === 150 || event.data === 101) {
              trackStatus.textContent = '⚠️ Embed restricted by owner. Try another track!';
            } else {
              trackStatus.textContent = '⚠️ Playback error. Try another link!';
            }
            isPlayingMusic = false;
            updatePlayButtonUI(false);
          }
        }
      });
    } catch (e) {
      console.warn('YT Player init failed:', e);
    }
  }

  if (window.YT && window.YT.Player) {
    ytApiReady = true;
    createYTPlayer();
  }

  function updatePlayButtonUI(playing) {
    if (playing) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      waveViz.classList.add('playing');
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      waveViz.classList.remove('playing');
    }
  }

  function startPerfectAudio() {
    if (activeAudio) {
      activeAudio.play().then(() => {
        isPlayingMusic = true;
        updatePlayButtonUI(true);
        trackTitle.textContent = 'Ed Sheeran - Perfect';
        trackStatus.textContent = 'Now Playing · Cozy Campfire 🔊';
      }).catch(() => {
        trackStatus.textContent = 'Tap Play to start music ▶';
      });
    }
  }

  function tryGlobalAutoplay(e) {
    if (e && e.target && e.target.closest && e.target.closest('.player-pill, .top-nav, .modal-backdrop')) return;
    initAudio();
    if (!isPlayingMusic) {
      startPerfectAudio();
    }
    window.removeEventListener('pointerdown', tryGlobalAutoplay);
    window.removeEventListener('click', tryGlobalAutoplay);
  }
  window.addEventListener('pointerdown', tryGlobalAutoplay, { once: true });
  window.addEventListener('click', tryGlobalAutoplay, { once: true });

  setTimeout(() => {
    startPerfectAudio();
  }, 200);

  function parseYouTubeUrl(input) {
    if (!input) return 'cNGjD0VG4R8';
    let url = input.trim().replace(/^[\(\[\{"']+|[\)\]\}"']+$/g, '').trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = url.match(regExp);
    if (match && match[1]) {
      return match[1];
    }
    return 'cNGjD0VG4R8';
  }

  function loadYouTubeStream(url) {
    initAudio();
    const videoId = parseYouTubeUrl(url);
    if (!videoId) return;

    if (activeAudio) {
      activeAudio.pause();
    }

    currentAudioSource = 'youtube';
    currentYtVideoId = videoId;

    isPlayingMusic = true;
    updatePlayButtonUI(true);
    trackTitle.textContent = 'Loading...';
    trackStatus.textContent = 'Connecting to YouTube... ⏳';

    fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.title) {
          trackTitle.textContent = data.title;
        }
      })
      .catch(() => {});

    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
      try {
        ytPlayer.loadVideoById(videoId);
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();
      } catch (e) {
        console.warn('loadVideoById error:', e);
      }
    } else {
      pendingVideoId = videoId;
      createYTPlayer();
    }

    ytModal.style.display = 'none';
    ytUrlInput.value = '';
  }

  openYtBtn.addEventListener('click', () => {
    ytModal.style.display = 'flex';
    ytUrlInput.focus();
  });

  closeYtModal.addEventListener('click', () => {
    ytModal.style.display = 'none';
  });

  ytModal.addEventListener('click', (e) => {
    if (e.target === ytModal) ytModal.style.display = 'none';
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      loadYouTubeStream(url);
    });
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    initAudio();

    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
    }
    if (activeAudio) activeAudio.pause();

    currentAudioSource = 'audio';
    const fileUrl = URL.createObjectURL(file);
    activeAudio = new Audio(fileUrl);
    activeAudio.loop = true;

    activeAudio.play().then(() => {
      isPlayingMusic = true;
      updatePlayButtonUI(true);
      trackTitle.textContent = file.name.replace(/\.[^/.]+$/, '');
      trackStatus.textContent = 'Playing your uploaded audio 🎵';
    }).catch(() => {});

    activeAudio.onended = () => {
      isPlayingMusic = false;
      updatePlayButtonUI(false);
    };
  });

  playBtn.addEventListener('click', () => {
    initAudio();
    if (currentAudioSource === 'audio' && activeAudio) {
      if (activeAudio.paused) {
        activeAudio.play();
        isPlayingMusic = true;
        updatePlayButtonUI(true);
      } else {
        activeAudio.pause();
        isPlayingMusic = false;
        updatePlayButtonUI(false);
      }
    } else if (currentAudioSource === 'youtube') {
      if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          ytPlayer.pauseVideo();
        } else {
          ytPlayer.unMute();
          ytPlayer.setVolume(100);
          ytPlayer.playVideo();
        }
      } else if (currentYtVideoId) {
        loadYouTubeStream(currentYtVideoId);
      } else {
        loadYouTubeStream('cNGjD0VG4R8');
      }
    } else {
      startPerfectAudio();
    }
  });

  rewindBtn.addEventListener('click', () => {
    if (currentAudioSource === 'audio' && activeAudio) {
      activeAudio.currentTime = Math.max(0, activeAudio.currentTime - 10);
    } else if (currentAudioSource === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const cur = ytPlayer.getCurrentTime();
      ytPlayer.seekTo(Math.max(0, cur - 10), true);
    }
  });

  forwardBtn.addEventListener('click', () => {
    if (currentAudioSource === 'audio' && activeAudio) {
      activeAudio.currentTime += 10;
    } else if (currentAudioSource === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const cur = ytPlayer.getCurrentTime();
      ytPlayer.seekTo(cur + 10, true);
    }
  });

  prevTrackBtn.addEventListener('click', () => {
    initAudio();
    if (currentAudioSource === 'audio' && activeAudio) {
      activeAudio.currentTime = 0;
    } else if (currentAudioSource === 'youtube' && ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(0, true);
    } else {
      startPerfectAudio();
    }
  });

  nextTrackBtn.addEventListener('click', () => {
    initAudio();
    if (currentAudioSource === 'audio' && activeAudio) {
      activeAudio.currentTime = 0;
    } else if (currentAudioSource === 'youtube' && ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(0, true);
    } else {
      startPerfectAudio();
    }
  });

  function initStars() {
    stars.length = 0;
    const moonX = W * 0.82;
    const moonY = H * 0.17;
    const moonExclusionR = 55;

    function isNearMoon(x, y) {
      return Math.hypot(x - moonX, y - moonY) < moonExclusionR;
    }

    for (let i = 0; i < 14; i++) {
      let x, y;
      do {
        x = W * 0.03 + Math.random() * (W * 0.94);
        y = H * 0.03 + Math.random() * (H * 0.38);
      } while (isNearMoon(x, y));
      stars.push({
        x, y,
        r: 1.2 + Math.random() * 0.7,
        alpha: 0.75 + Math.random() * 0.25,
        twinkleSpeed: 0.003 + Math.random() * 0.006,
        twinklePhase: Math.random() * Math.PI * 2,
        tier: 'hero'
      });
    }

    for (let i = 0; i < 32; i++) {
      let x, y;
      do {
        x = W * 0.02 + Math.random() * (W * 0.96);
        y = H * 0.03 + Math.random() * (H * 0.42);
      } while (isNearMoon(x, y));
      stars.push({
        x, y,
        r: 0.7 + Math.random() * 0.5,
        alpha: 0.45 + Math.random() * 0.25,
        twinkleSpeed: 0.006 + Math.random() * 0.012,
        twinklePhase: Math.random() * Math.PI * 2,
        tier: 'medium'
      });
    }

    for (let i = 0; i < 40; i++) {
      let x, y;
      do {
        x = Math.random() * W;
        y = H * 0.02 + Math.random() * (H * 0.45);
      } while (isNearMoon(x, y));
      stars.push({
        x, y,
        r: 0.45 + Math.random() * 0.35,
        alpha: 0.25 + Math.random() * 0.25,
        twinkleSpeed: 0.008 + Math.random() * 0.016,
        twinklePhase: Math.random() * Math.PI * 2,
        tier: 'faint'
      });
    }
  }

  function initMountains() {
    mountainLayers[0] = [];
    mountainLayers[1] = [];
    const groundY = H * 0.74;

    const farStep = Math.max(35, W * 0.045);
    for (let x = -80; x <= W + 80; x += farStep) {
      const mainPeak = Math.sin(x * 0.0018 + 0.4) * 110;
      const subPeak = Math.sin(x * 0.005 + 1.8) * 45;
      const naturalJag = Math.sin(x * 0.015) * 18;
      const y = groundY - 210 - mainPeak - subPeak + naturalJag;
      mountainLayers[0].push({
        x: x,
        y: Math.min(groundY - 130, y)
      });
    }

    const midStep = Math.max(30, W * 0.04);
    for (let x = -80; x <= W + 80; x += midStep) {
      const ridge1 = Math.sin(x * 0.003 + 2.8) * 65;
      const ridge2 = Math.sin(x * 0.009 + 0.5) * 25;
      const y = groundY - 125 - ridge1 - ridge2;
      mountainLayers[1].push({
        x: x,
        y: Math.min(groundY - 80, y)
      });
    }
  }

  function initTrees() {
    treeLayers[0] = [];
    treeLayers[1] = [];
    treeLayers[2] = [];
    treeLayers[3] = [];

    const groundY = H * 0.74;

    for (let x = -40; x < W + 60; x += 38) {
      treeLayers[0].push({
        x: x + (Math.random() - 0.5) * 16,
        y: groundY + 6,
        w: 36 + Math.random() * 16,
        h: 110 + Math.random() * 40,
        tiers: 3,
        color: '#0a1324'
      });
    }

    for (let x = -50; x < W + 70; x += 48) {
      treeLayers[1].push({
        x: x + (Math.random() - 0.5) * 14,
        y: groundY + 10,
        w: 46 + Math.random() * 18,
        h: 135 + Math.random() * 45,
        tiers: 4,
        color: '#070e1b'
      });
    }

    for (let x = -30; x < W + 50; x += 55) {
      treeLayers[2].push({
        x: x + (Math.random() - 0.5) * 18,
        y: groundY + 14,
        w: 52 + Math.random() * 22,
        h: 155 + Math.random() * 50,
        tiers: 4,
        color: '#050a14'
      });
    }

    for (let x = -40; x < W + 60; x += 75) {
      treeLayers[3].push({
        x: x + (Math.random() - 0.5) * 22,
        y: groundY + 18,
        w: 62 + Math.random() * 26,
        h: 175 + Math.random() * 55,
        tiers: 5,
        color: '#03060c'
      });
    }
  }

  function initGroundDetails() {
    grassTufts.length = 0;
    pitRocks.length = 0;
    groundGlowEmbers.length = 0;

    const groundY = H * 0.74;
    const fireX = W / 2;

    for (let i = 0; i < 45; i++) {
      const gx = Math.random() * W;
      if (Math.abs(gx - fireX) > 40) {
        grassTufts.push({
          x: gx,
          y: groundY + 4 + Math.random() * (H - groundY - 20),
          h: 6 + Math.random() * 12,
          blades: 3 + Math.floor(Math.random() * 4),
          bend: (Math.random() - 0.5) * 0.4,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    const rockAngles = [0, 0.5, 1.1, 1.8, 2.4, 3.1, 3.8, 4.4, 5.1, 5.7];
    rockAngles.forEach(ang => {
      const rx = fireX + Math.cos(ang) * (58 + Math.random() * 10);
      const ry = groundY + 14 + Math.sin(ang) * (18 + Math.random() * 6);
      pitRocks.push({
        x: rx,
        y: ry,
        rw: 8 + Math.random() * 7,
        rh: 5 + Math.random() * 4,
        rot: (Math.random() - 0.5) * 0.5,
        shade: Math.random() > 0.5 ? '#261b16' : '#1f1511'
      });
    });

    for (let i = 0; i < 18; i++) {
      const rDist = 12 + Math.random() * 65;
      const rAng = Math.random() * Math.PI * 2;
      groundGlowEmbers.push({
        x: fireX + Math.cos(rAng) * rDist,
        y: groundY + 12 + Math.sin(rAng) * (rDist * 0.3),
        r: 0.8 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.03 + Math.random() * 0.04
      });
    }
  }

  function initMist() {
    groundMist.length = 0;
    for (let i = 0; i < 24; i++) {
      groundMist.push({
        x: Math.random() * W,
        y: H * 0.73 + (Math.random() - 0.5) * 35,
        r: 75 + Math.random() * 100,
        vx: 0.12 + Math.random() * 0.22,
        alpha: 0.035 + Math.random() * 0.045
      });
    }
  }

  function initFireflies() {
    fireflies.length = 0;
    const count = 18;
    const fireX = W / 2;
    const groundY = H * 0.74;

    for (let i = 0; i < count; i++) {
      let x;
      if (Math.random() < 0.45) {
        x = Math.random() * (W * 0.36);
      } else if (Math.random() < 0.82) {
        x = W * 0.64 + Math.random() * (W * 0.36);
      } else {
        x = fireX + (Math.random() - 0.5) * (W * 0.4);
      }

      if (Math.abs(x - fireX) < 45) {
        x += (x < fireX ? -50 : 50);
      }

      fireflies.push({
        x: x,
        y: groundY - 30 - Math.random() * (H * 0.42),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1.1 + Math.random() * 1.5,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 1.0 + Math.random() * 1.2,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 0.02 + Math.random() * 0.028,
        maxBrightness: 0.35 + Math.random() * 0.45,
        color: Math.random() > 0.3 ? '#bef264' : '#fde047'
      });
    }
  }

  const bgCanvas = document.createElement('canvas');
  const bgCtx = bgCanvas.getContext('2d', { alpha: false });

  function renderBackgroundCache() {
    bgCanvas.width = W * dpr;
    bgCanvas.height = H * dpr;
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const groundY = H * 0.74;

    const skyGrad = bgCtx.createRadialGradient(W * 0.5, H * 0.7, 10, W * 0.5, H * 0.7, Math.max(W, H) * 0.95);
    skyGrad.addColorStop(0, '#0d1527');
    skyGrad.addColorStop(0.5, '#050813');
    skyGrad.addColorStop(1, '#010207');
    bgCtx.fillStyle = skyGrad;
    bgCtx.fillRect(0, 0, W, H);

    if (mountainLayers[0] && mountainLayers[0].length > 1) {
      const farGrad = bgCtx.createLinearGradient(0, groundY - 300, 0, groundY);
      farGrad.addColorStop(0, '#162236');
      farGrad.addColorStop(0.5, '#0f1726');
      farGrad.addColorStop(1, '#090f1a');
      bgCtx.fillStyle = farGrad;
      bgCtx.beginPath();
      bgCtx.moveTo(-80, groundY);
      for (let i = 0; i < mountainLayers[0].length; i++) {
        const pt = mountainLayers[0][i];
        if (i === 0) {
          bgCtx.lineTo(pt.x, pt.y);
        } else {
          const prev = mountainLayers[0][i - 1];
          const cx = (prev.x + pt.x) / 2;
          const cy = (prev.y + pt.y) / 2;
          bgCtx.quadraticCurveTo(prev.x, prev.y, cx, cy);
        }
      }
      bgCtx.lineTo(W + 80, groundY);
      bgCtx.closePath();
      bgCtx.fill();
    }

    if (mountainLayers[1] && mountainLayers[1].length > 1) {
      const midGrad = bgCtx.createLinearGradient(0, groundY - 170, 0, groundY);
      midGrad.addColorStop(0, '#111a2a');
      midGrad.addColorStop(0.6, '#0b111c');
      midGrad.addColorStop(1, '#060a12');
      bgCtx.fillStyle = midGrad;
      bgCtx.beginPath();
      bgCtx.moveTo(-80, groundY);
      for (let i = 0; i < mountainLayers[1].length; i++) {
        const pt = mountainLayers[1][i];
        if (i === 0) {
          bgCtx.lineTo(pt.x, pt.y);
        } else {
          const prev = mountainLayers[1][i - 1];
          const cx = (prev.x + pt.x) / 2;
          const cy = (prev.y + pt.y) / 2;
          bgCtx.quadraticCurveTo(prev.x, prev.y, cx, cy);
        }
      }
      bgCtx.lineTo(W + 80, groundY);
      bgCtx.closePath();
      bgCtx.fill();

      const hazeGrad = bgCtx.createLinearGradient(0, groundY - 90, 0, groundY);
      hazeGrad.addColorStop(0, 'rgba(20, 32, 52, 0)');
      hazeGrad.addColorStop(0.6, 'rgba(18, 28, 46, 0.35)');
      hazeGrad.addColorStop(1, 'rgba(10, 16, 28, 0.65)');
      bgCtx.fillStyle = hazeGrad;
      bgCtx.fillRect(0, groundY - 90, W, 90);
    }

    treeLayers.forEach((layer) => {
      layer.forEach(t => {
        const tiers = t.tiers || 3;
        const tierH = t.h / tiers;

        bgCtx.fillStyle = t.color;
        for (let i = 0; i < tiers; i++) {
          const progress = i / tiers;
          const tw = t.w * (1 - progress * 0.45);
          const ty = t.y - i * (tierH * 0.72);
          bgCtx.beginPath();
          bgCtx.moveTo(t.x - tw * 0.5, ty);
          bgCtx.lineTo(t.x, ty - tierH * 1.35);
          bgCtx.lineTo(t.x + tw * 0.5, ty);
          bgCtx.closePath();
          bgCtx.fill();
        }
      });
    });

    const tentX = Math.max(50, W * 0.14);
    const tentY = groundY + 10;
    bgCtx.fillStyle = '#0b1322';
    bgCtx.beginPath();
    bgCtx.moveTo(tentX - 58, tentY);
    bgCtx.lineTo(tentX + 10, tentY - 62);
    bgCtx.lineTo(tentX + 78, tentY);
    bgCtx.closePath();
    bgCtx.fill();

    bgCtx.fillStyle = '#162238';
    bgCtx.beginPath();
    bgCtx.moveTo(tentX + 10, tentY - 62);
    bgCtx.lineTo(tentX + 26, tentY);
    bgCtx.lineTo(tentX - 36, tentY);
    bgCtx.closePath();
    bgCtx.fill();

    const groundGrad = bgCtx.createLinearGradient(0, groundY - 10, 0, H);
    groundGrad.addColorStop(0, '#0a101f');
    groundGrad.addColorStop(0.2, '#070b16');
    groundGrad.addColorStop(0.55, '#040710');
    groundGrad.addColorStop(1, '#010206');
    bgCtx.fillStyle = groundGrad;
    bgCtx.fillRect(0, groundY - 10, W, H - (groundY - 10));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
    initMountains();
    initTrees();
    initGroundDetails();
    initFireflies();
    initMist();
    renderBackgroundCache();
  }
  window.addEventListener('resize', resize);
  resize();

  function initAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playAcousticGuitarChord() {
    initAudio();
    if (!audioCtx) return;
    try {
      const chord = CHORD_PROGRESSIONS[currentChordIdx];
      currentChordIdx = (currentChordIdx + 1) % CHORD_PROGRESSIONS.length;
      const baseTime = audioCtx.currentTime;

      chord.forEach((freq, stringIdx) => {
        const t = baseTime + stringIdx * 0.028;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3.5, t);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 1.2);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);

        osc.connect(filter).connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 2.0);
      });
    } catch (e) {}
  }

  function getBaseFirePos() {
    return {
      x: W / 2,
      y: H * 0.74,
      width: Math.min(W * 0.32, 140),
      height: Math.min(H * 0.38, 240)
    };
  }

  function spawnFlameParticle(baseX, baseY, width, intensity = 1.0) {
    const spread = (Math.random() - 0.5) * (width * 0.65);
    const size = (26 + Math.random() * 32) * intensity;
    flameParticles.push({
      x: baseX + spread,
      y: baseY + 4 + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 0.8 + spread * 0.015,
      vy: -3.2 - Math.random() * 4.6 * intensity,
      size: size,
      initialSize: size,
      life: 0,
      maxLife: 24 + Math.random() * 22,
      turbOffset: Math.random() * Math.PI * 2
    });
  }

  function spawnSparks(baseX, baseY, width, count = 2) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 4.2 + Math.random() * 7.0;
      sparks.push({
        x: baseX + (Math.random() - 0.5) * (width * 0.6),
        y: baseY - Math.random() * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.0 + Math.random() * 1.8,
        life: 0,
        maxLife: 35 + Math.random() * 30
      });
    }
  }

  function spawnEmber(baseX, baseY, width, highVelocity = false) {
    const angle = highVelocity ? (-Math.PI / 2 + (Math.random() - 0.5) * 1.4) : (-Math.PI / 2 + (Math.random() - 0.5) * 0.8);
    const speed = highVelocity ? (3.5 + Math.random() * 5.5) : (1.4 + Math.random() * 3.0);
    embers.push({
      x: baseX + (Math.random() - 0.5) * (width * 0.75),
      y: baseY - Math.random() * 15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.2 + Math.random() * 2.0,
      life: 0,
      maxLife: 60 + Math.random() * 65,
      phase: Math.random() * Math.PI * 2
    });
  }

  function spawnSmokePuff(baseX, baseY) {
    smokePuffs.push({
      x: baseX + (Math.random() - 0.5) * 30,
      y: baseY - 70,
      vx: (Math.random() - 0.5) * 0.6 + windX * 0.8,
      vy: -1.2 - Math.random() * 1.4,
      r: 14 + Math.random() * 16,
      life: 0,
      maxLife: 55 + Math.random() * 35
    });
  }

  function triggerInteraction(px, py) {
    initAudio();
    guitarStrumAnim = 1.0;
  }

  function onPointerMove(px, py) {
    mouse.vx = px - mouse.prevX;
    mouse.vy = py - mouse.prevY;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    mouse.x = px;
    mouse.y = py;

    targetWindX = (mouse.vx * 0.08);
    targetWindX = Math.max(-2.5, Math.min(2.5, targetWindX));
  }

  function onPointerDown(px, py) {
    if (py < 90 && px > (W / 2 - 340) && px < (W / 2 + 340)) return;
    initAudio();
    mouse.down = true;
    onPointerMove(px, py);
    triggerInteraction(px, py);
  }

  function onPointerUp() {
    mouse.down = false;
  }

  window.addEventListener('mousemove', e => onPointerMove(e.clientX, e.clientY));
  window.addEventListener('mousedown', e => onPointerDown(e.clientX, e.clientY));
  window.addEventListener('mouseup', onPointerUp);

  window.addEventListener('touchmove', e => {
    if (e.touches.length > 0) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchstart', e => {
    if (e.touches.length > 0) onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchend', onPointerUp);

  function drawCosmicSkyRibbon() {
    const time = Date.now() * 0.0003;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const wave1 = Math.sin(time * 1.5) * 15;
    const wave2 = Math.cos(time * 1.1) * 12;

    const grad1 = ctx.createLinearGradient(W * 0.1, H * 0.04, W * 0.9, H * 0.4);
    grad1.addColorStop(0, 'rgba(45, 212, 191, 0.022)');
    grad1.addColorStop(0.4, 'rgba(139, 92, 246, 0.025)');
    grad1.addColorStop(0.75, 'rgba(59, 130, 246, 0.016)');
    grad1.addColorStop(1, 'transparent');

    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.moveTo(-50, H * 0.26 + wave1);
    ctx.bezierCurveTo(W * 0.25, H * 0.1 + wave2, W * 0.65, H * 0.28 - wave1, W + 50, H * 0.12 + wave2);
    ctx.bezierCurveTo(W * 0.7, H * 0.4 + wave1, W * 0.3, H * 0.24 - wave2, -50, H * 0.38);
    ctx.closePath();
    ctx.fill();

    const grad2 = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, H * 0.3);
    grad2.addColorStop(0, 'transparent');
    grad2.addColorStop(0.5, 'rgba(168, 85, 247, 0.016)');
    grad2.addColorStop(1, 'transparent');

    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H * 0.06);
    ctx.bezierCurveTo(W * 0.4, H * 0.18 + wave2 * 0.5, W * 0.62, H * 0.05 - wave1 * 0.5, W * 0.95, H * 0.22);
    ctx.bezierCurveTo(W * 0.65, H * 0.25, W * 0.35, H * 0.15, W * 0.1, H * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawFireflies() {
    const time = Date.now() * 0.0015;

    fireflies.forEach(ff => {
      ff.x += ff.vx + windX * 0.2;
      ff.y += ff.vy;
      ff.blinkPhase += ff.blinkSpeed;

      if (ff.x < -25) ff.x = W + 25;
      if (ff.x > W + 25) ff.x = -25;
      if (ff.y < H * 0.25) ff.vy = Math.abs(ff.vy);
      if (ff.y > H * 0.78) ff.vy = -Math.abs(ff.vy);

      const bob = Math.sin(time * ff.bobSpeed + ff.bobPhase) * 5;
      const curY = ff.y + bob;

      const rawPulse = Math.sin(ff.blinkPhase);
      const blink = Math.pow(Math.max(0, rawPulse), 3);

      if (blink > 0.02) {
        const alpha = blink * ff.maxBrightness;
        const curR = ff.r * (0.8 + blink * 0.4);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const aura = ctx.createRadialGradient(ff.x, curY, 0, ff.x, curY, curR * 4.5);
        aura.addColorStop(0, `rgba(190, 242, 100, ${alpha * 0.45})`);
        aura.addColorStop(0.5, `rgba(163, 230, 53, ${alpha * 0.15})`);
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(ff.x, curY, curR * 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = ff.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(ff.x, curY, curR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });
  }

  function drawSkyAndEnvironment(base) {
    const time = Date.now() * 0.003;
    const groundY = H * 0.74;

    ctx.drawImage(bgCanvas, 0, 0, W, H);

    drawCosmicSkyRibbon();

    stars.forEach(s => {
      s.twinklePhase += s.twinkleSpeed;
      const twinkle = 0.6 + 0.4 * Math.sin(s.twinklePhase);
      const alpha = s.alpha * twinkle;

      if (s.tier === 'hero') {

        ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();

        const rayLen = s.r * (2.5 + twinkle * 1.5);
        const rayAlpha = alpha * 0.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${rayAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x - rayLen, s.y);
        ctx.lineTo(s.x + rayLen, s.y);
        ctx.moveTo(s.x, s.y - rayLen);
        ctx.lineTo(s.x, s.y + rayLen);
        ctx.stroke();
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const moonX = W * 0.82;
    const moonY = H * 0.17;
    const moonR = 26;

    const skyBleed = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 5.5);
    skyBleed.addColorStop(0, 'rgba(191, 219, 254, 0.22)');
    skyBleed.addColorStop(0.35, 'rgba(147, 197, 253, 0.07)');
    skyBleed.addColorStop(0.7, 'rgba(96, 165, 250, 0.02)');
    skyBleed.addColorStop(1, 'transparent');
    ctx.fillStyle = skyBleed;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 5.5, 0, Math.PI * 2);
    ctx.fill();

    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 2.2);
    moonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    moonGlow.addColorStop(0.4, 'rgba(224, 242, 254, 0.3)');
    moonGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#060a17';
    ctx.beginPath();
    ctx.arc(moonX + moonR * 0.48, moonY - moonR * 0.18, moonR * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!shootingStar && Math.random() < 0.003) {
      shootingStar = {
        x: Math.random() * W,
        y: Math.random() * (H * 0.32),
        vx: 8 + Math.random() * 6,
        vy: 3 + Math.random() * 4,
        length: 55 + Math.random() * 45,
        life: 0,
        maxLife: 24
      };
    }

    if (shootingStar) {
      shootingStar.x += shootingStar.vx;
      shootingStar.y += shootingStar.vy;
      shootingStar.life++;
      const sAlpha = 1 - (shootingStar.life / shootingStar.maxLife);

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${sAlpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shootingStar.x, shootingStar.y);
      ctx.lineTo(shootingStar.x - shootingStar.vx * 3.2, shootingStar.y - shootingStar.vy * 3.2);
      ctx.stroke();
      ctx.restore();

      if (shootingStar.life >= shootingStar.maxLife) shootingStar = null;
    }

    const tentX = Math.max(50, W * 0.14);
    const tentY = groundY + 10;
    const lanternFlicker = 0.85 + Math.sin(time * 3.5) * 0.15;
    const lanternGlow = ctx.createRadialGradient(tentX + 10, tentY - 22, 2, tentX + 10, tentY - 22, 38);
    lanternGlow.addColorStop(0, `rgba(251, 191, 36, ${0.45 * lanternFlicker})`);
    lanternGlow.addColorStop(0.5, `rgba(245, 158, 11, ${0.15 * lanternFlicker})`);
    lanternGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = lanternGlow;
    ctx.beginPath();
    ctx.arc(tentX + 10, tentY - 22, 38, 0, Math.PI * 2);
    ctx.fill();

    const fireFlicker = 0.88 + Math.sin(time * 5) * 0.12 + Math.sin(time * 11) * 0.06 + pokeBoost * 0.4;
    const radW = base.width * 3.8;
    const radH = base.width * 1.35;

    const groundRadiance = ctx.createRadialGradient(base.x, groundY + 14, 10, base.x, groundY + 14, radW);
    groundRadiance.addColorStop(0, 'rgba(251, 146, 60, 0.28)');
    groundRadiance.addColorStop(0.25, 'rgba(234, 88, 12, 0.16)');
    groundRadiance.addColorStop(0.55, 'rgba(180, 83, 9, 0.05)');
    groundRadiance.addColorStop(0.8, 'rgba(120, 53, 15, 0.015)');
    groundRadiance.addColorStop(1, 'transparent');

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = groundRadiance;
    ctx.globalAlpha = fireFlicker;
    ctx.beginPath();
    ctx.ellipse(base.x, groundY + 14, radW, radH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    pitRocks.forEach(rk => {
      ctx.save();
      ctx.translate(rk.x, rk.y);
      ctx.rotate(rk.rot);

      ctx.fillStyle = rk.shade;
      ctx.beginPath();
      ctx.ellipse(0, 0, rk.rw, rk.rh, 0, 0, Math.PI * 2);
      ctx.fill();

      const rkDist = Math.hypot(rk.x - base.x, rk.y - groundY);
      const rkHighlight = Math.max(0, 1 - rkDist / 90);
      if (rkHighlight > 0) {
        ctx.fillStyle = `rgba(251, 146, 60, ${rkHighlight * 0.35 * fireFlicker})`;
        ctx.beginPath();
        ctx.ellipse(0, -rk.rh * 0.2, rk.rw * 0.8, rk.rh * 0.6, 0, 0, Math.PI);
        ctx.fill();
      }
      ctx.restore();
    });

    groundGlowEmbers.forEach(ge => {
      const pulse = 0.5 + 0.5 * Math.sin(time * 4 + ge.phase);
      ctx.fillStyle = `rgba(251, 146, 60, ${pulse * 0.7})`;
      ctx.beginPath();
      ctx.arc(ge.x, ge.y, ge.r, 0, Math.PI * 2);
      ctx.fill();
    });

    grassTufts.forEach(gt => {
      const sway = Math.sin(time * 2 + gt.phase) * (gt.bend + windX * 0.2);
      ctx.save();
      ctx.translate(gt.x, gt.y);
      ctx.strokeStyle = '#050a14';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      for (let b = 0; b < gt.blades; b++) {
        const spread = (b - (gt.blades - 1) / 2) * 3;
        ctx.beginPath();
        ctx.moveTo(spread * 0.4, 0);
        ctx.quadraticCurveTo(spread + sway * 4, -gt.h * 0.6, spread * 1.3 + sway * 7, -gt.h);
        ctx.stroke();
      }
      ctx.restore();
    });

    drawFireflies();

    groundMist.forEach(m => {
      m.x += m.vx;
      if (m.x > W + m.r) m.x = -m.r;
      const mg = ctx.createRadialGradient(m.x, m.y, 5, m.x, m.y, m.r);
      mg.addColorStop(0, `rgba(148, 163, 184, ${m.alpha})`);
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawBackLogsAndEmberBed(base) {
    const logBaseY = base.y + 12;

    const emberBed = ctx.createRadialGradient(base.x, logBaseY, 2, base.x, logBaseY, base.width * 0.55);
    emberBed.addColorStop(0, '#ffffff');
    emberBed.addColorStop(0.18, '#fef08a');
    emberBed.addColorStop(0.48, '#f97316');
    emberBed.addColorStop(0.82, '#b91c1c');
    emberBed.addColorStop(1, 'transparent');
    ctx.save();
    ctx.fillStyle = emberBed;
    ctx.globalAlpha = 0.9 + Math.sin(Date.now() * 0.01) * 0.1;
    ctx.beginPath();
    ctx.ellipse(base.x, logBaseY, base.width * 0.55, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const backLogs = [
      { x1: -44, y1: 5, x2: 42, y2: -14, r: 13.5, angle: -0.18, woodCol: '#754a30', barkCol: '#452817', endCol: '#e0c2a6' },
      { x1: 44, y1: 7, x2: -38, y2: -16, r: 14, angle: 0.22, woodCol: '#633c25', barkCol: '#3a2012', endCol: '#d3b292' },
      { x1: -28, y1: -3, x2: 30, y2: -1, r: 12, angle: 0.04, woodCol: '#583622', barkCol: '#331b0e', endCol: '#c8a88a' }
    ];

    backLogs.forEach((lg) => {
      ctx.save();
      const lx1 = base.x + lg.x1;
      const ly1 = logBaseY + lg.y1;
      const lx2 = base.x + lg.x2;
      const ly2 = logBaseY + lg.y2;

      ctx.strokeStyle = lg.barkCol;
      ctx.lineWidth = lg.r * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();

      ctx.strokeStyle = lg.woodCol;
      ctx.lineWidth = lg.r * 1.5;
      ctx.beginPath();
      ctx.moveTo(lx1 + (lg.x2 - lg.x1) * 0.1, ly1 + (lg.y2 - lg.y1) * 0.1);
      ctx.lineTo(lx2 - (lg.x2 - lg.x1) * 0.1, ly2 - (lg.y2 - lg.y1) * 0.1);
      ctx.stroke();

      ctx.save();
      ctx.translate(lx1, ly1);
      ctx.rotate(lg.angle);
      ctx.fillStyle = lg.endCol;
      ctx.beginPath();
      ctx.ellipse(0, 0, lg.r * 0.9, lg.r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b160b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    });
  }

  function drawFrontLogs(base) {
    const logBaseY = base.y + 12;
    const frontLogs = [
      { x1: -56, y1: 15, x2: 50, y2: 12, r: 14, angle: 0.02, woodCol: '#6c432b', barkCol: '#3e2415', endCol: '#d7b494' },
      { x1: 50, y1: 17, x2: -48, y2: 8, r: 13, angle: -0.05, woodCol: '#5a3723', barkCol: '#321c10', endCol: '#cbb094' }
    ];

    frontLogs.forEach((lg) => {
      ctx.save();
      const lx1 = base.x + lg.x1;
      const ly1 = logBaseY + lg.y1;
      const lx2 = base.x + lg.x2;
      const ly2 = logBaseY + lg.y2;

      ctx.strokeStyle = lg.barkCol;
      ctx.lineWidth = lg.r * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();

      ctx.strokeStyle = lg.woodCol;
      ctx.lineWidth = lg.r * 1.5;
      ctx.beginPath();
      ctx.moveTo(lx1 + (lg.x2 - lg.x1) * 0.1, ly1 + (lg.y2 - lg.y1) * 0.1);
      ctx.lineTo(lx2 - (lg.x2 - lg.x1) * 0.1, ly2 - (lg.y2 - lg.y1) * 0.1);
      ctx.stroke();

      ctx.save();
      ctx.translate(lx1, ly1);
      ctx.rotate(lg.angle);
      ctx.fillStyle = lg.endCol;
      ctx.beginPath();
      ctx.ellipse(0, 0, lg.r * 0.9, lg.r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b160b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    });
  }

  function drawHeroFire(base) {
    const time = Date.now() * 0.003;
    const fireX = base.x;
    const fireY = base.y - 2;
    const flicker = 0.92 + Math.sin(time * 4.5) * 0.08 + Math.sin(time * 10) * 0.05;
    const flameH = base.height * 0.65 * flicker;
    const flameW = base.width * 0.6;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const fireGlow = ctx.createRadialGradient(fireX, fireY - flameH * 0.3, 8, fireX, fireY - flameH * 0.3, flameW * 2.8);
    fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.4)');
    fireGlow.addColorStop(0.3, 'rgba(234, 88, 12, 0.2)');
    fireGlow.addColorStop(0.6, 'rgba(180, 60, 10, 0.08)');
    fireGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.ellipse(fireX, fireY - flameH * 0.3, flameW * 2.8, flameH * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    function drawFlameTongue(offsetX, scaleW, scaleH, colorStart, colorEnd, alpha, waveSpeed, waveAmp) {
      const w = flameW * scaleW;
      const h = flameH * scaleH;
      const wave = Math.sin(time * waveSpeed + offsetX) * waveAmp + windX * 14;

      ctx.save();
      ctx.translate(fireX + offsetX, fireY);

      const grad = ctx.createLinearGradient(0, 0, 0, -h);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(0.65, colorEnd);
      grad.addColorStop(1, 'rgba(220, 38, 38, 0)');

      ctx.fillStyle = grad;
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.moveTo(-w * 0.6, 0);
      ctx.bezierCurveTo(-w * 0.7, -h * 0.35, -w * 0.4 + wave * 0.5, -h * 0.7, wave, -h);
      ctx.bezierCurveTo(w * 0.4 + wave * 0.5, -h * 0.7, w * 0.7, -h * 0.35, w * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawFlameTongue(0, 1.15, 1.08, '#dc2626', '#ea580c', 0.6, 3.2, 14);
    drawFlameTongue(-14, 0.85, 0.96, '#ea580c', '#f97316', 0.7, 4.1, 12);
    drawFlameTongue(14, 0.85, 0.94, '#ea580c', '#f97316', 0.7, 3.8, -12);
    drawFlameTongue(0, 0.8, 0.84, '#f59e0b', '#fbbf24', 0.8, 4.5, 9);
    drawFlameTongue(-8, 0.55, 0.7, '#fbbf24', '#fef08a', 0.82, 5.0, 7);
    drawFlameTongue(8, 0.55, 0.68, '#fbbf24', '#fef08a', 0.82, 4.8, -7);
    drawFlameTongue(0, 0.35, 0.42, '#fef08a', '#fef9c3', 0.75, 6.0, 4);

    ctx.restore();
  }

  function drawGuitaristAndFriend(base) {
    const groundY = H * 0.74;
    const time = Date.now() * 0.0025;
    const fireWarmth = 0.7 + Math.sin(Date.now() * 0.012) * 0.3;
    const breathe = Math.sin(time * 1.2) * 0.008;

    const charScale = Math.min(0.95, Math.max(0.68, W * 0.001));
    const charDist = Math.min(W * 0.32, 165);
    const gX = base.x - charDist;
    const gY = groundY - 6;
    const bodySway = Math.sin(time) * (isPlayingMusic ? 1.6 : 0.8);
    const headNod = isPlayingMusic ? Math.sin(time * 2) * 1.0 : 0;

    ctx.save();
    ctx.translate(gX, gY);
    ctx.scale(charScale, charScale + breathe);

    ctx.fillStyle = 'rgba(4, 7, 15, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-4, groundY - gY + 14, 48, 12, -0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#321b0e';
    ctx.beginPath();
    ctx.roundRect(-38, 8, 76, 16, 4);
    ctx.fill();

    ctx.strokeStyle = '#221108';
    ctx.lineWidth = 1.2;
    for (let bx = -28; bx < 32; bx += 13) {
      ctx.beginPath();
      ctx.moveTo(bx, 9);
      ctx.lineTo(bx + 3, 23);
      ctx.stroke();
    }

    ctx.fillStyle = '#cbb094';
    ctx.beginPath();
    ctx.ellipse(-38, 16, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c4d2d';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-38, 16, 3, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#1b2434';

    ctx.beginPath();
    ctx.ellipse(-10 + bodySway * 0.2, 7, 14, 10, 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(3 + bodySway * 0.2, 9, 17, 8.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-14 + bodySway * 0.2, 12, 11, 15, 3);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(8 + bodySway * 0.2, 13, 12, 15, 3);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2 + bodySway * 0.2, 8);
    ctx.lineTo(16 + bodySway * 0.2, 12);
    ctx.stroke();

    const shoeGrad1 = ctx.createLinearGradient(-20, 24, -4, 32);
    shoeGrad1.addColorStop(0, '#5a3825');
    shoeGrad1.addColorStop(1, '#2d1a10');
    ctx.fillStyle = shoeGrad1;
    ctx.beginPath();
    ctx.roundRect(-20 + bodySway * 0.2, 25, 16, 7.5, [3, 6, 2, 2]);
    ctx.fill();

    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-20 + bodySway * 0.2, 32);
    ctx.lineTo(-4 + bodySway * 0.2, 32);
    ctx.stroke();

    const shoeGrad2 = ctx.createLinearGradient(6, 24, 24, 32);
    shoeGrad2.addColorStop(0, '#6c432b');
    shoeGrad2.addColorStop(1, '#341d12');
    ctx.fillStyle = shoeGrad2;
    ctx.beginPath();
    ctx.roundRect(6 + bodySway * 0.2, 25, 18, 7.5, [2, 6, 2, 2]);
    ctx.fill();

    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6 + bodySway * 0.2, 32);
    ctx.lineTo(24 + bodySway * 0.2, 32);
    ctx.stroke();

    ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
    ctx.beginPath();
    ctx.ellipse(20 + bodySway * 0.2, 27, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const jacketGrad1 = ctx.createLinearGradient(-18, -16, 18, -6);
    jacketGrad1.addColorStop(0, '#162032');
    jacketGrad1.addColorStop(0.65, '#282b3c');
    jacketGrad1.addColorStop(1, '#4a3020');
    ctx.fillStyle = jacketGrad1;
    ctx.beginPath();
    ctx.ellipse(-2 + bodySway, -10, 18, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222f46';
    ctx.beginPath();
    ctx.moveTo(-10 + bodySway, -26);
    ctx.quadraticCurveTo(-18 + bodySway, -16, -12 + bodySway, -4);
    ctx.quadraticCurveTo(-6 + bodySway, -10, 2 + bodySway, -18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0a0f1d';
    ctx.beginPath();
    ctx.arc(6 + bodySway + headNod, -38, 12, 0, Math.PI * 2);
    ctx.fill();

    const beanieGrad = ctx.createLinearGradient(-8, -50, 16, -34);
    beanieGrad.addColorStop(0, '#0f172a');
    beanieGrad.addColorStop(1, '#33241b');
    ctx.fillStyle = beanieGrad;
    ctx.beginPath();
    ctx.arc(5 + bodySway + headNod, -42, 13, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-8 + bodySway + headNod, -44, 26, 5.5, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.8;
    for (let kx = -5; kx <= 13; kx += 4) {
      ctx.beginPath();
      ctx.moveTo(kx + bodySway + headNod, -44);
      ctx.lineTo(kx + bodySway + headNod, -39);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(10 + bodySway, -4);
    ctx.rotate(0.32);

    const gWood = ctx.createRadialGradient(0, 7, 3, 0, 7, 24);
    gWood.addColorStop(0, '#fde047');
    gWood.addColorStop(0.35, '#d97706');
    gWood.addColorStop(0.72, '#9a3412');
    gWood.addColorStop(1, '#451a03');

    ctx.fillStyle = gWood;
    ctx.beginPath();
    ctx.ellipse(0, 7, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -16, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.fillStyle = '#0c0a09';
    ctx.beginPath();
    ctx.arc(0, -5, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, -5, 8.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#291102';
    ctx.beginPath();
    ctx.ellipse(5, 1, 4, 8.5, 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#292524';
    ctx.roundRect(-8, 13, 16, 4, 1.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let p = -5.5; p <= 5.5; p += 2.4) {
      ctx.beginPath();
      ctx.arc(p, 15, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#5c2b09';
    ctx.fillRect(-3, -64, 6, 48);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.6;
    for (let f = -58; f <= -18; f += 6) {
      ctx.beginPath();
      ctx.moveTo(-3, f);
      ctx.lineTo(3, f);
      ctx.stroke();
    }

    ctx.fillStyle = '#451a03';
    ctx.fillRect(-4, -76, 8, 13);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(-5, -72, 1.4, 0, Math.PI * 2);
    ctx.arc(-5, -68, 1.4, 0, Math.PI * 2);
    ctx.arc(-5, -64, 1.4, 0, Math.PI * 2);
    ctx.arc(5, -72, 1.4, 0, Math.PI * 2);
    ctx.arc(5, -68, 1.4, 0, Math.PI * 2);
    ctx.arc(5, -64, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 0.6;
    for (let s = -2; s <= 2; s += 0.8) {
      ctx.beginPath();
      ctx.moveTo(s, 13);
      ctx.lineTo(s * 0.8, -64);
      ctx.stroke();
    }

    ctx.fillStyle = '#d7b494';
    ctx.beginPath();
    ctx.ellipse(3, -44, 4, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const strumY = isPlayingMusic
      ? Math.sin(time * 3.5 + guitarStrumAnim * 8) * 4.5
      : (guitarStrumAnim > 0.02 ? Math.sin(guitarStrumAnim * 12) * 4.5 : 0);
    ctx.fillStyle = '#2b3c58';
    ctx.beginPath();
    ctx.moveTo(2 + bodySway, -22);
    ctx.quadraticCurveTo(16 + bodySway, -16, 14 + bodySway, -4 + strumY * 0.4);
    ctx.quadraticCurveTo(10 + bodySway, -6, 0 + bodySway, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d7b494';
    ctx.beginPath();
    ctx.ellipse(14 + bodySway, -3 + strumY, 4, 6, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(251, 146, 60, 0.45)';
    ctx.beginPath();
    ctx.ellipse(15 + bodySway, -3 + strumY, 2.8, 4.5, 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;
    const rimGrad = ctx.createLinearGradient(8, -48, 22, 10);
    rimGrad.addColorStop(0, `rgba(251, 146, 60, ${fireWarmth * 0.65})`);
    rimGrad.addColorStop(0.5, `rgba(251, 146, 60, ${fireWarmth * 0.35})`);
    rimGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(12 + bodySway + headNod, -37, 13, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14 + bodySway, -10, 15, 22, 0.15, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15 + bodySway, 10, 14, 14, 0.2, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.restore();

    const fX = base.x + charDist;
    const fY = groundY - 6;

    ctx.save();
    ctx.translate(fX, fY);
    ctx.scale(charScale, charScale + breathe);

    let footLift = 0;
    let kneeBounce = 0;
    if (isPlayingMusic) {

      const beat = (Date.now() * 0.0055) % (Math.PI * 2);

      const tapWave = Math.pow(Math.max(0, Math.sin(beat)), 1.7);
      footLift = tapWave * 5.2;
      kneeBounce = tapWave * 1.5;
    }

    ctx.fillStyle = 'rgba(4, 7, 15, 0.75)';
    ctx.beginPath();
    ctx.ellipse(4, groundY - fY + 14, 48, 12, 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#321b0e';
    ctx.beginPath();
    ctx.roundRect(-38, 8, 76, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#221108';
    ctx.lineWidth = 1.2;
    for (let bx = -30; bx < 30; bx += 13) {
      ctx.beginPath();
      ctx.moveTo(bx, 9);
      ctx.lineTo(bx - 3, 23);
      ctx.stroke();
    }

    ctx.fillStyle = '#cbb094';
    ctx.beginPath();
    ctx.ellipse(38, 16, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c4d2d';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(38, 16, 3, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#111827';

    ctx.beginPath();
    ctx.ellipse(10, 7, 14, 10, -0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-3, 9, 17, 8.5, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-15, 13 - kneeBounce * 0.7, 12, 15, 3);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(4, 12, 11, 15, 3);
    ctx.fill();

    ctx.save();
    ctx.translate(-5, 32);
    ctx.rotate(footLift * 0.038);
    ctx.translate(5, -32);

    const cShoeGrad1 = ctx.createLinearGradient(-22, 24, -4, 32);
    cShoeGrad1.addColorStop(0, '#6c432b');
    cShoeGrad1.addColorStop(1, '#341d12');
    ctx.fillStyle = cShoeGrad1;
    ctx.beginPath();
    ctx.roundRect(-22, 25, 18, 7.5, [6, 2, 2, 2]);
    ctx.fill();

    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-22, 32);
    ctx.lineTo(-4, 32);
    ctx.stroke();

    ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-18, 27, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const cShoeGrad2 = ctx.createLinearGradient(4, 24, 20, 32);
    cShoeGrad2.addColorStop(0, '#5a3825');
    cShoeGrad2.addColorStop(1, '#2d1a10');
    ctx.fillStyle = cShoeGrad2;
    ctx.beginPath();
    ctx.roundRect(4, 25, 16, 7.5, [2, 6, 2, 2]);
    ctx.fill();

    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(4, 32);
    ctx.lineTo(20, 32);
    ctx.stroke();

    const jacketGrad2 = ctx.createLinearGradient(-18, -6, 18, -16);
    jacketGrad2.addColorStop(0, '#422c1e');
    jacketGrad2.addColorStop(0.35, '#155e75');
    jacketGrad2.addColorStop(1, '#083344');
    ctx.fillStyle = jacketGrad2;
    ctx.beginPath();
    ctx.ellipse(2, -10, 18, 22, -0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0e7490';
    ctx.beginPath();
    ctx.moveTo(-18, -18);
    ctx.quadraticCurveTo(2, -24, 18, -18);
    ctx.lineTo(12, 0);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0a0f1d';
    ctx.beginPath();
    ctx.arc(-4, -38, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(-15, -36);
    ctx.quadraticCurveTo(-19, -28, -17, -22);
    ctx.quadraticCurveTo(-14, -27, -13, -34);
    ctx.fill();

    const companionBeanie = ctx.createLinearGradient(-16, -42, 8, -52);
    companionBeanie.addColorStop(0, '#38251a');
    companionBeanie.addColorStop(0.5, '#155e75');
    companionBeanie.addColorStop(1, '#0e4a5d');
    ctx.fillStyle = companionBeanie;
    ctx.beginPath();
    ctx.arc(-4, -42, 13, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#083344';
    ctx.beginPath();
    ctx.roundRect(-16, -44, 25, 5.5, 3);
    ctx.fill();

    const mugGrad = ctx.createLinearGradient(-18, -16, -4, -2);
    mugGrad.addColorStop(0, '#22c55e');
    mugGrad.addColorStop(0.45, '#16a34a');
    mugGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = mugGrad;
    ctx.beginPath();
    ctx.roundRect(-16, -14, 13, 14, [2, 2, 4, 4]);
    ctx.fill();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-16, -7, 4, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();

    const teaGrad = ctx.createRadialGradient(-9.5, -14, 1, -9.5, -14, 5);
    teaGrad.addColorStop(0, '#fef08a');
    teaGrad.addColorStop(0.4, '#d97706');
    teaGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = teaGrad;
    ctx.beginPath();
    ctx.ellipse(-9.5, -14, 5.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = '#d7b494';
    ctx.beginPath();
    ctx.ellipse(-17, -7, 3.5, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-4.5, -7, 3.5, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(251, 146, 60, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-10, -7, 7, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (Math.random() < 0.25) {
      steamMug.push({
        x: fX - 10 + (Math.random() - 0.5) * 4,
        y: fY - 17,
        vx: (Math.random() - 0.5) * 0.4 - 0.25,
        vy: -0.9 - Math.random() * 0.7,
        r: 1.6 + Math.random() * 2.0,
        life: 0,
        maxLife: 45
      });
    }

    ctx.globalAlpha = 1.0;
    const rimGrad2 = ctx.createLinearGradient(-8, -48, -20, 10);
    rimGrad2.addColorStop(0, `rgba(251, 146, 60, ${fireWarmth * 0.6})`);
    rimGrad2.addColorStop(0.5, `rgba(251, 146, 60, ${fireWarmth * 0.3})`);
    rimGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = rimGrad2;
    ctx.beginPath();
    ctx.arc(-5, -37, 13, Math.PI / 2, -Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-8, -10, 15, 22, -0.15, Math.PI / 2, -Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-7, 10, 14, 14, -0.2, Math.PI / 2, -Math.PI / 2);
    ctx.fill();

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    const base = getBaseFirePos();

    windX += (targetWindX - windX) * 0.05;
    targetWindX *= 0.95;
    if (guitarStrumAnim > 0) guitarStrumAnim *= 0.94;

    drawSkyAndEnvironment(base);
    drawBackLogsAndEmberBed(base);
    drawHeroFire(base);
    drawFrontLogs(base);
    drawGuitaristAndFriend(base);

    const isMobile = W < 600;
    const spawnRate = isMobile ? 2 : 3;

    if (flameParticles.length < 45) {
      for (let i = 0; i < spawnRate; i++) {
        spawnFlameParticle(base.x, base.y - 6, base.width * 0.65, 1.0);
      }
    }

    if (Math.random() < 0.35 && sparks.length < 20) {
      spawnSparks(base.x, base.y - 10, base.width, 1);
    }

    if (Math.random() < 0.35 && embers.length < 25) {
      spawnEmber(base.x, base.y - 8, base.width, false);
    }

    if (Math.random() < 0.12 && smokePuffs.length < 12) {
      spawnSmokePuff(base.x, base.y);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = flameParticles.length - 1; i >= 0; i--) {
      const f = flameParticles[i];
      f.life++;
      const progress = f.life / f.maxLife;

      f.x += f.vx + windX * (progress * 1.5);
      f.y += f.vy;
      f.vx += (Math.random() - 0.5) * 0.3;
      f.size = f.initialSize * (1 - progress * 0.65);

      let col = '#ea580c';
      if (progress < 0.18) col = '#fef9c3';
      else if (progress < 0.45) col = '#fde047';
      else if (progress < 0.75) col = '#f97316';

      ctx.fillStyle = col;
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.72);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      if (progress >= 1.0 || f.size <= 0.5) {
        flameParticles.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.life++;
      const progress = sp.life / sp.maxLife;
      sp.x += sp.vx + windX * 1.2;
      sp.y += sp.vy;
      sp.vx *= 0.96;
      sp.vy += 0.05;

      const alpha = Math.max(0, 1 - progress);
      ctx.fillStyle = progress < 0.5 ? '#ffffff' : '#fef08a';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();

      if (progress >= 1.0 || sp.y < 0) sparks.splice(i, 1);
    }

    ctx.restore();

    ctx.save();
    for (let i = embers.length - 1; i >= 0; i--) {
      const em = embers[i];
      em.life++;
      const progress = em.life / em.maxLife;

      em.phase += 0.08;
      em.x += em.vx + Math.sin(em.phase) * 0.8 + windX * 1.5;
      em.y += em.vy;
      em.vy += 0.015;
      em.vx *= 0.98;

      const alpha = Math.max(0, 1 - progress);

      ctx.fillStyle = progress < 0.4 ? '#fef08a' : '#ea580c';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(em.x, em.y, em.r * (1 - progress * 0.4), 0, Math.PI * 2);
      ctx.fill();

      if (progress >= 1.0 || em.y < 0) {
        embers.splice(i, 1);
      }
    }

    for (let i = smokePuffs.length - 1; i >= 0; i--) {
      const sm = smokePuffs[i];
      sm.life++;
      sm.x += sm.vx + windX * 0.8;
      sm.y += sm.vy;
      sm.r += 0.4;
      const progress = sm.life / sm.maxLife;
      const alpha = Math.max(0, (1 - progress) * 0.06);

      ctx.fillStyle = '#64748b';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2);
      ctx.fill();

      if (progress >= 1.0) smokePuffs.splice(i, 1);
    }

    for (let i = steamMug.length - 1; i >= 0; i--) {
      const s = steamMug[i];
      s.life++;
      s.x += s.vx;
      s.y += s.vy;
      s.r += 0.06;
      const alpha = Math.max(0, (1 - s.life / s.maxLife) * 0.22);

      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      if (s.life >= s.maxLife) steamMug.splice(i, 1);
    }
    ctx.restore();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
// ==================== LÓGICA DEL BLOC DE NOTAS ====================
const notesArea = document.getElementById('notesArea');
const toggleBtn = document.getElementById('toggleNotesBtn');
const notesWidget = document.getElementById('notesWidget');

// Cargar nota guardada previamente (si existe)
if (notesArea) {
  notesArea.value = localStorage.getItem('user_notes') || '';

  // Guardar cambios automáticamente mientras escribes
  notesArea.addEventListener('input', () => {
    localStorage.setItem('user_notes', notesArea.value);
  });
}

// Minimizar / Maximizar el bloc de notas
if (toggleBtn && notesWidget) {
  let isMinimized = false;
  toggleBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    notesArea.style.display = isMinimized ? 'none' : 'block';
    toggleBtn.textContent = isMinimized ? '+' : '_';
  });
}

const poems = [
  {
    text: "«Se reviste de fuerza y dignidad, y afronta segura el porvenir.»",
    author: "— Proverbios 31:25"
  },
  {
    text: "«¡Dichosa tú que has creído porque se cumplirá lo que el Señor te ha dicho!»",
    author: "— Lucas 1:45"
  },
  {
    text: "«Dios está en medio de ella, no caerá; Dios la ayudará al clarear la mañana.»",
    author: "— Salmos 46:5"
  },
  {
    text: "«Engañosa es la gracia y vana la hermosura; pero la mujer que teme al Señor, esa será alabada.»",
    author: "— Proverbios 31:30"
  },
  {
    text: "«El Señor tu Dios está en medio de ti, un guerrero que salva; se gozará sobre ti con alegría, te renovará con su amor.»",
    author: "— Sofonías 3:17"
  },
  {
    text: "«Porque el Señor estará a tu lado y evitará que tu pie caiga en la trampa.»",
    author: "— Proverbios 3:26"
  },
  {
    text: "«Que la belleza de ustedes no sea la externa... sino la incorruptible belleza de un espíritu suave y apacible, que tiene gran valor delante de Dios.»",
    author: "— 1 Pedro 3:3-4"
  },
  {
    text: "«No tengas miedo... todo el pueblo de mi ciudad sabe que eres una mujer virtuosa.»",
    author: "— Rut 3:11"
  },
  {
    text: "«Él da fuerzas al cansado y multiplica las fuerzas del que no tiene ningunas.»",
    author: "— Isaías 40:29"
  },
  {
    text: "«Te alabo porque soy una creación admirable; ¡tus obras son maravillosas, y esto lo sé muy bien!»",
    author: "— Salmos 139:14"
  }
];

function loadRandomPoem() {
  const poemContent = document.getElementById('poemContent');
  const poemAuthor = document.getElementById('poemAuthor');

  if (poemContent && poemAuthor && poems.length > 0) {
    const randomIndex = Math.floor(Math.random() * poems.length);
    const selectedPoem = poems[randomIndex];

    poemContent.innerText = selectedPoem.text;
    poemAuthor.innerText = selectedPoem.author;
  }
}

loadRandomPoem();

// ==================== LÓGICA DEL HISTORIAL ====================
const historyWidget = document.getElementById('historyWidget');
const historyList = document.getElementById('historyList');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');

let songHistory = JSON.parse(localStorage.getItem('music_history')) || [];
let lastClickedUrl = ''; // Memoria para no perder la URL

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = '';

  if (songHistory.length === 0) {
    historyList.innerHTML = '<li style="color: #888;">Sin reproducciones</li>';
    return;
  }

  songHistory.forEach((item) => {
    const li = document.createElement('li');
    li.style.cursor = 'pointer';
    li.title = 'Haz clic para volver a escuchar';
    li.textContent = `▶ ${item.title}`;

    li.addEventListener('click', () => {
      if (!item.url) return;
      
      const videoId = getYouTubeId(item.url);
      
      if (typeof player !== 'undefined' && typeof player.loadVideoById === 'function' && videoId) {
        player.loadVideoById(videoId);
      } else {
        const presetBtns = Array.from(document.querySelectorAll('.preset-btn'));
        const originalBtn = presetBtns.find(btn => btn.getAttribute('data-url') === item.url);
        if (originalBtn) originalBtn.click();
      }

      const trackTitleElement = document.querySelector('.track-title');
      if (trackTitleElement) trackTitleElement.textContent = item.title;
    });

    historyList.appendChild(li);
  });
}

function addSongToHistory(songTitle, songUrl) {
  if (!songTitle || songTitle.trim() === '') return;
  
  const cleanTitle = songTitle.trim();
  const lowerTitle = cleanTitle.toLowerCase();

  if (lowerTitle.includes('loading') || lowerTitle.includes('tap play')) return;

  const existingIndex = songHistory.findIndex(s => s.title === cleanTitle);
  
  if (existingIndex !== -1) {
    if (songUrl) songHistory[existingIndex].url = songUrl;
    const item = songHistory.splice(existingIndex, 1)[0];
    songHistory.unshift(item);
  } else {
    songHistory.unshift({ title: cleanTitle, url: songUrl });
  }

  if (songHistory.length > 10) songHistory.pop();

  localStorage.setItem('music_history', JSON.stringify(songHistory));
  renderHistory();
}

renderHistory();

// 1. Detectar clics y MEMORIZAR la URL
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (btn) {
    lastClickedUrl = btn.getAttribute('data-url') || '';
    const songName = btn.textContent.trim();
    addSongToHistory(songName, lastClickedUrl);
  }
});

// 2. Observar cuando el título cambia y usar la memoria
const trackTitleElement = document.querySelector('.track-title');
if (trackTitleElement) {
  const observer = new MutationObserver(() => {
    const titleText = trackTitleElement.textContent.trim();
    
    let finalUrl = lastClickedUrl; 

    // Intentar sacar la URL directamente desde la API oficial de YouTube
    if (typeof player !== 'undefined' && typeof player.getVideoUrl === 'function') {
      const ytUrl = player.getVideoUrl();
      if (ytUrl && ytUrl.includes('watch')) {
        finalUrl = ytUrl;
      }
    }
    
    // Fallback: intentar atrapar enlaces manuales
    if (!finalUrl) {
      const urlInput = document.getElementById('ytUrlInput') || document.querySelector('input[type="text"]');
      if (urlInput && urlInput.value) finalUrl = urlInput.value;
    }
    
    addSongToHistory(titleText, finalUrl);
  });
  observer.observe(trackTitleElement, { childList: true, characterData: true, subtree: true });
}

// Minimizar ventana
if (toggleHistoryBtn && historyWidget) {
  toggleHistoryBtn.addEventListener('click', () => {
    historyWidget.classList.toggle('minimized');
    const isMinimized = historyWidget.classList.contains('minimized');
    toggleHistoryBtn.textContent = isMinimized ? '+' : '—';
  });
}

// ==================== LÓGICA DEL MENÚ CIRCULAR ====================
const menuToggleBtn = document.getElementById('menuToggleBtn');
const menuOptions = document.getElementById('menuOptions');

const openHistoryBtn = document.getElementById('openHistoryBtn');
const openNotesBtn = document.getElementById('openNotesBtn');
const openVerseBtn = document.getElementById('openVerseBtn');

const widgetHistory = document.getElementById('historyWidget');
const widgetNotes = document.getElementById('notesWidget');
const widgetVerse = document.getElementById('poemWidget');

// Abrir/Cerrar menú horizontal y rotar el botón principal
if (menuToggleBtn && menuOptions) {
  menuToggleBtn.addEventListener('click', () => {
    menuOptions.classList.toggle('open');
    if (menuOptions.classList.contains('open')) {
      menuToggleBtn.style.transform = 'rotate(45deg)';
    } else {
      menuToggleBtn.style.transform = 'rotate(0deg)';
    }
  });
}

// Función auxiliar para mostrar u ocultar los widgets
function toggleWidget(widget) {
  if (!widget) return;
  const currentDisplay = window.getComputedStyle(widget).display;
  widget.style.display = (currentDisplay === 'none') ? 'block' : 'none';
}

// Conectar cada botón circular con su respectiva ventana
if (openHistoryBtn && widgetHistory) {
  openHistoryBtn.addEventListener('click', () => toggleWidget(widgetHistory));
}

if (openNotesBtn && widgetNotes) {
  openNotesBtn.addEventListener('click', () => toggleWidget(widgetNotes));
}

if (openVerseBtn && widgetVerse) {
  openVerseBtn.addEventListener('click', () => toggleWidget(widgetVerse));
}

// ==================== LÓGICA DE VERSÍCULOS POR ÁNIMO ====================
const moodVerses = {
  enojo: [
    "«Airea tu enojo, pero no peques; medita en tu corazón en tu cama, y calla.» — Salmos 4:4",
    "«El hombre paciente muestra gran prudencia; el iracundo exalta la necedad.» — Proverbios 14:29",
    "«Dejad la ira y deponed el enojo; no os escandalicéis, pues ello sólo conduce a hacer lo malo.» — Salmos 37:8"
  ],
  tristeza: [
    "«Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu.» — Salmos 34:18",
    "«He aquí que yo te daré salud y sanaré tus heridas, dice Jehová.» — Jeremías 30:17",
    "«Bienaventurados los que lloran, porque ellos recibirán consolación.» — Mateo 5:4"
  ],
  felicidad: [
    "«Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.» — Salmos 118:24",
    "«Alégrense en Jehová y gócense, justos; y canten con júbilo todos los rectos de corazón.» — Salmos 32:11",
    "«El corazón alegre hermosea el rostro.» — Proverbios 15:13"
  ],
  ansias: [
    "«Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.» — Filipenses 4:6",
    "«Echa sobre Jehová tu carga, y él te sustentará; no dejará para siempre caído al justo.» — Salmos 55:22",
    "«La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.» — Juan 14:27"
  ],
  estres: [
    "«Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.» — Mateo 11:28",
    "«En paz me acostaré, y asimismo dormiré; porque solo tú, Jehová, me haces vivir confiado.» — Salmos 4:8",
    "«Estad quietos, y conoced que yo soy Dios.» — Salmos 46:10"
  ],
  asco: [
    "«Apartaos, apartaos, salid de ahí, no toquéis cosa inmunda; salid de en medio de ella.» — Isaías 52:11",
    "«Aborreced lo malo, seguid lo bueno.» — Romanos 12:9"
  ]
};

document.querySelectorAll('.mood-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mood = btn.getAttribute('data-mood');
    const versesList = moodVerses[mood];
    
    if (versesList && versesList.length > 0) {
      const randomIndex = Math.floor(Math.random() * versesList.length);
      const selectedVerse = versesList[randomIndex];
      
      const poemContent = document.getElementById('poemContent');
      if (poemContent) {
        poemContent.style.opacity = 0;
        setTimeout(() => {
          poemContent.textContent = selectedVerse;
          poemContent.style.opacity = 1;
        }, 200);
      }
    }
  });
});

// ==================== BÚSQUEDA DE MÚSICA EN TIEMPO REAL ====================
const ytSearchInput = document.getElementById('ytSearchInput');
const ytSearchBtn = document.getElementById('ytSearchBtn');
const searchResultsList = document.getElementById('searchResultsList');

async function searchYouTubeModal(query) {
  if (!query.trim()) return;
  
  if (searchResultsList) {
    searchResultsList.innerHTML = '<div style="color: #aaa; font-size: 12px; padding: 10px; text-align: center;">Buscando canciones...</div>';
  }

  try {
    const response = await fetch(`https://invidious.jing.rocks/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
    const data = await response.json();

    if (searchResultsList) {
      searchResultsList.innerHTML = '';
    }

    if (!data || data.length === 0) {
      if (searchResultsList) {
        searchResultsList.innerHTML = '<div style="color: #ff6b6b; font-size: 12px; padding: 10px; text-align: center;">No se encontraron resultados</div>';
      }
      return;
    }

    // Mostrar los resultados de la búsqueda uno debajo del otro
    data.slice(0, 6).forEach(video => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = `🎵 ${video.title}`;
      btn.title = video.title;
      const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
      btn.setAttribute('data-url', videoUrl);

      // Al hacer clic, reproduce el video, lo guarda en el historial y cierra el modal
      btn.addEventListener('click', () => {
        const videoId = video.videoId;
        const videoTitle = video.title;

        if (typeof player !== 'undefined' && typeof player.loadVideoById === 'function') {
          player.loadVideoById(videoId);
        } else {
          const iframe = document.getElementById('ytPlayer');
          if (iframe) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
          }
        }

        const trackTitleElement = document.querySelector('.track-title');
        if (trackTitleElement) trackTitleElement.textContent = videoTitle;

        if (typeof addSongToHistory === 'function') {
          addSongToHistory(videoTitle, videoUrl);
        }

        const ytModal = document.getElementById('ytModal');
        if (ytModal) ytModal.style.display = 'none';
      });

      if (searchResultsList) {
        searchResultsList.appendChild(btn);
      }
    });

  } catch (error) {
    console.error('Error en búsqueda de YouTube:', error);
    if (searchResultsList) {
      searchResultsList.innerHTML = '<div style="color: #ff6b6b; font-size: 12px; padding: 10px; text-align: center;">Error al conectar con el buscador</div>';
    }
  }
}

if (ytSearchBtn) {
  ytSearchBtn.addEventListener('click', () => {
    if (ytSearchInput) searchYouTubeModal(ytSearchInput.value);
  });
}

if (ytSearchInput) {
  ytSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchYouTubeModal(ytSearchInput.value);
    }
  });
}