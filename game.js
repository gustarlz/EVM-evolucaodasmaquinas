import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

let scene, camera, renderer, clock, player, playerCollider, hemisphereLight, composer, damageContainer;
const gameObjects = { enemies: [], projectiles: [], enemyProjectiles: [], particles: [], shields: [], visualEffects: [], pickups: [], hazards: [], scenery: [] };

const DASH_TRAIL_POOL_SIZE = 20;
const dashTrailPool = [];
let dashTrailPoolIndex = 0;

let keys = {}, mouse = { x: 0, y: 0, down: false };
let cameraState = { currentDistance: 50, targetDistance: 50, shakeDuration: 0, shakeIntensity: 0, targetFov: 75, currentFov: 75 };
const NORMAL_BG_COLOR = new THREE.Color(0x051924);
const BOSS_BG_COLOR = new THREE.Color(0x240505);

const DIFFICULTY_EXPONENT = 1.15;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

let previewScene, previewCamera, previewRenderer, previewModel, previewAnimationId;

const soundManager = {
    sounds: {}, audioContext: null, musicSource: null,
    sfxVolume: 0.5, musicVolume: 0.3, currentTrack: null,
    init: function() {
        try { this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { console.warn('Web Audio API not supported.'); }
        // SFX (These are fine)
        this.sounds.shoot = new Audio("data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhSAAAAEB9fYR/fnx8fX19f3x+fn5+fX5/f3+Af4CAgICAgn+Cg4ODhIR/hoaGh4aGh4eHh4eHh4eGhYWFhYWAgIA=");
        this.sounds.hit = new Audio("data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPAAAAEB9gH2AfYB9gH2AfYB9gH2AfYB9gH2AfYB9gH2AfYB9gH2AfYB9gH2AfYB9gH2AfYB9gH2A");
        this.sounds.explosion = new Audio("data:audio/wav;base64,UklGRqgAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhqAAAAKB/h19bWl9fXl1eXV1eXV1eXV1dXFxbW1pZWVlYV1ZWVVRUVFNSUlFQT09OTU1MS0pJR0ZFRENCQUA/PT09PTw6Ojk4ODg3Nzc2NjU1NDMzMjExMDAuLSwrKikoJyYmJSQjIiEgHx4dHBsaGRgXFhUUExIREA4NDAsKCQUHBAMCAQAAAA==");
        this.sounds.playerHurt = new Audio("data:audio/wav;base64,UklGRsAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhqAAAAJAD+fHx6+vr4+Pj29vb1dXVz8/Py8vLycnJyMjIx8fHw8PDwcHBv7+/urq6srKyq6urqampoaGhf39/fHx8e3t7d3d3c3NzcXFxbW1tZWVlYmJiYWFhXV1dWVlZVVVVU1NTUlJSUFBQT09PTg==");
        this.sounds.levelUp = new Audio("data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPgAAAEBMT1BRU1ZYXV9jZ2tvcHN4dnh1dHR0dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXU=");
        this.sounds.dash = new Audio("data:audio/wav;base64,UklGRjwAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhJAAAAEBWX2Nrb3V6gYOOk5WWmZ2joqWmqaurr7CztLe5vb/CxcrNzw==");
        this.sounds.pickup = new Audio("data:audio/wav;base64,UklGRjAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhJAAAAEBWcHp+iZOdo6SmqqyxtLa6vsDIzM/T193j5urt8fL19w==");
        this.sounds.laserCharge = new Audio("data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPAAAAEBXV1dXWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWFlYWVhYWFhYWVg=");
        this.sounds.uiClick = new Audio("data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPAAAAEB/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/fw==");
        this.sounds.upgradeGet = new Audio("data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPgAAAEBUWF5kaG1vcXR6e4CCiouOj5KWmJ2ho6Wmq62ztbi8wcXKy8/T1dve4+bq7vL09fb4+fr7/P4=");
        this.sounds.pauseIn = new Audio("data:audio/wav;base64,UklGRkAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPAAAAEB+fXt5d3JwbWVgXVZST0hGQz48Ojc0My8uLSwpJiIjIB8eHRwbGhkYFxYVFBMSERAODQwLCgkF");
        this.sounds.pauseOut = new Audio("data:audio/wav;base64,UklGRkAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPAAAAEBDQkdMT1JUVldZW11eX2BhYmNkZWZnaGhpamtsbW5vb3Bxc3R1dnh5eno=");
        this.sounds.denied = new Audio("data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPAAAAEBHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0c=");
        this.sounds.crit = new Audio("data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPgAAAEBgYV1bV1dYXV1hYmRkZWVmZ2hoaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpZ2ZlZGNiYGFd");
        this.sounds.qteSuccess = new Audio("data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPgAAAEBaXmFobm9ydnh6foGIjZCWmZ2ipKepra+yt7vAycvQ1dzg5err8fX5/f7//v/+/v39/Pz7+fj39vX09PPy8O/u7e3s");
        this.sounds.qteFail = new Audio("data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhPgAAAEB9e3h2dHJxbmxraj9AQUA/Pjw6NzU0MjEvLSwpJiIjIB8eHRwbGhkYFxYVFBMSERAODQwLCgkFBwQDAgEAAAAAAAA=");
        this.sounds.bossStun = new Audio("data:audio/wav;base64,UklGRqgAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhqAAAAKB/h19bWl9fXl1eXV1eXV1eXV1dXFxbW1pZWVlYV1ZWVVRUVFNSUlFQT09OTU1MS0pJR0ZFRENCQUA/PT09PTw6Ojk4ODg3Nzc2NjU1NDMzMjExMDAuLSwrKikoJyYmJSQjIiEgHx4dHBsaGRgXFhUUExIREA4NDAsKCQUHBAMCAQAAAA==");

        // --- FIX: Replaced corrupted Base64 strings with valid audio data ---
        this.sounds.music_normal = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU3LjgyLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIACChKAAAAAANIA//OEAAAAAAAAAAAAAAAAAAAAAABMQVoA//OEAAAAAAAAAAAAAAAAAAAAAABMYXZjBQEfAAAADAAAADMAAAb8VlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==");
        this.sounds.music_boss = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU3LjgyLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIACChKAAAAAANIA//OEAAAAAAAAAAAAAAAAAAAAAABMQVoA//OEAAAAAAAAAAAAAAAAAAAAAABMYXZjBQEfAAAADAAAADMAAAb8VlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==");
    },
    
    play: function(soundName) {
        if (this.audioContext && this.audioContext.state === 'suspended') { this.audioContext.resume(); }
        if (this.sounds[soundName]) { const s = this.sounds[soundName].cloneNode(); s.volume = this.sfxVolume; s.play().catch(e => {}); }
    },
    setSfxVolume: function(volume) { this.sfxVolume = volume; },
    setMusicVolume: function(volume) { this.musicVolume = volume; if(this.currentTrack) this.currentTrack.volume = volume; },
    playMusic: function(trackName) {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        if(this.currentTrack && this.currentTrack.src === this.sounds[trackName].src && !this.currentTrack.paused) {
            return;
        }
        if(this.currentTrack) this.currentTrack.pause();
        this.currentTrack = this.sounds[trackName];
        if(this.currentTrack) {
            this.currentTrack.volume = this.musicVolume;
            this.currentTrack.loop = true;
            this.currentTrack.play().catch(e => console.warn(`Music playback failed for ${trackName}:`, e));
        }
    },
    stopMusic: function() { if(this.currentTrack) this.currentTrack.pause(); this.currentTrack = null; }
};

const uiManager = {
    elements: {},
    init: function() {
        this.elements = {
            hud: document.getElementById('hud'),
            levelText: document.getElementById('level-text'), waveText: document.getElementById('wave-text'),
            healthBar: document.getElementById('health-bar-fill'), xpBar: document.getElementById('xp-bar-fill'),
            dashStatus: document.getElementById('dash-status'), upgradeIcons: document.getElementById('upgrade-icons'),
            bossHud: document.getElementById('boss-hud'), bossHealthBar: document.getElementById('boss-health-bar-fill'),
            bossNameText: document.getElementById('boss-name-text'),
            mainMenu: document.getElementById('main-menu'), pauseMenu: document.getElementById('pause-menu'),
            levelUpScreen: document.getElementById('level-up-screen'), upgradeOptions: document.getElementById('upgrade-options'),
            gameOverScreen: document.getElementById('game-over-screen'), finalWaveText: document.getElementById('final-wave-text'),
            howToPlayScreen: document.getElementById('how-to-play-screen'), optionsScreen: document.getElementById('options-screen'),
            vignette: document.getElementById('vignette'), waveAnnouncer: document.getElementById('wave-announcer'),
            comboText: document.getElementById('combo-text'),
            debugMenu: document.getElementById('debug-menu'),
            qteAnnouncer: document.getElementById('qte-announcer'),
            
            // NOVO: Elementos da introdução
            introAnnouncer: document.getElementById('intro-announcer'),
            introLine1: document.getElementById('intro-line-1'),
            introLine2: document.getElementById('intro-line-2'),
        };
    },
      show: function(element) {
        this.elements[element].classList.add('visible');
    },
    hide: function(element) {
        this.elements[element].classList.remove('visible');
    },

    updateHUD: function() {
        this.elements.levelText.textContent = playerStats.level;
        this.elements.waveText.textContent = gameManager.wave;
        const healthPercent = (playerStats.health / playerStats.maxHealth);
        this.elements.healthBar.style.width = healthPercent * 100 + '%';
        this.elements.healthBar.classList.toggle('low-health', healthPercent < 0.25);
        this.elements.vignette.classList.toggle('active', healthPercent < 0.25);
        this.elements.xpBar.style.width = (playerStats.xp / playerStats.xpToNextLevel) * 100 + '%';
        const dashStatusText = playerStats.isDashing ? "ATIVO" : playerStats.dashReady ? "PRONTO" : "RECARREGANDO";
        this.elements.dashStatus.textContent = dashStatusText;
        this.elements.dashStatus.className = playerStats.dashReady ? '' : 'recharging';
        
        const comboCount = playerStats.killStreak.count;
        this.elements.comboText.textContent = comboCount + 'x';
        this.elements.comboText.parentElement.style.visibility = comboCount > 2 ? 'visible' : 'hidden';
        if (comboCount > 10) this.elements.comboText.style.animation = 'pulse-red 0.5s infinite';
        else this.elements.comboText.style.animation = '';
        
        if (gameManager.isBossWave && gameObjects.enemies.length > 0 && gameObjects.enemies[0].isBoss) {
            const boss = gameObjects.enemies[0];
            this.elements.bossHealthBar.style.width = (boss.health / boss.maxHealth) * 100 + '%';
        }
        this.elements.upgradeIcons.innerHTML = '';
        playerStats.upgrades.forEach(upgradeId => {
            const upgrade = allUpgrades.find(u => u.id === upgradeId);
            if (upgrade && upgrade.icon) this.elements.upgradeIcons.innerHTML += `<div class="icon">${upgrade.icon}<span class="tooltip">${upgrade.name}</span></div>`;
        });
        Object.entries(playerStats.upgradeLevels).forEach(([upgradeId, level]) => {
            const upgrade = allUpgrades.find(u => u.id === upgradeId);
            if (upgrade && upgrade.icon && level > 0) {
                const name = typeof upgrade.name === 'function' ? upgrade.name(level - 1) : upgrade.name;
                this.elements.upgradeIcons.innerHTML += `<div class="icon">${upgrade.icon}<span class="icon-level">${level}</span><span class="tooltip">${name}</span></div>`;
            }
        });
    },

    
    
    announceWave: function() {
        const text = gameManager.isBossWave ? "CHEFE SE APROXIMANDO" : `ONDA ${gameManager.wave}`;
        this.elements.waveAnnouncer.textContent = text;
        this.elements.waveAnnouncer.classList.add('show');
        setTimeout(() => this.elements.waveAnnouncer.classList.remove('show'), 2000);

},
announceQTE: function(text, success = null) {
    const el = this.elements.qteAnnouncer;
    el.textContent = text;
    el.classList.remove('success', 'fail');
    if (success === true) el.classList.add('success');
    if (success === false) el.classList.add('fail');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), success === null ? 2500 : 1500);
}  
    
    
};

const gameManager = {
    state: 'menu',
    wave: 0,
    isBossWave: false,
    bossesDefeated: 0,

    startGame: function() {
        this.state = 'running';
        this.bossesDefeated = 0;
        uiManager.hide('mainMenu');
        uiManager.elements.hud.style.visibility = 'visible';
        resetPlayer();
        changeEnvironment();
        camera.position.set(player.position.x, player.position.y + 50, player.position.z + 50);
        this.nextWave();
        soundManager.playMusic('music_normal');
        animate();
    },
    pauseGame: function(showMenu = true) {
        if(this.state !== 'running') return;
        this.state = 'paused';
        if(showMenu) {
            uiManager.show('pauseMenu');
            soundManager.play('pauseIn');
        }
    },
    resumeGame: function() {
        if(this.state !== 'paused') return;
        this.state = 'running';
        uiManager.hide('pauseMenu');
        soundManager.play('pauseOut');
        clock.getDelta();
        animate();
    },
    gameOver: function() {
        this.state = 'gameover';
        uiManager.elements.finalWaveText.textContent = this.wave;
        uiManager.show('gameOverScreen');
        soundManager.stopMusic();
    },
    levelUp: function() {
        this.state = 'levelup';
        soundManager.play('levelUp');
        uiManager.show('levelUpScreen');
        createLevelUpPulse();
        presentUpgradeOptions();
        animatePreview();
    },
    nextWave: function() {
        this.wave++;
        this.isBossWave = (this.wave > 0 && this.wave % 5 === 0);
        uiManager.elements.bossHud.style.visibility = this.isBossWave ? 'visible' : 'hidden';
        if (this.isBossWave) {
            soundManager.playMusic('music_boss');
        } else {
            soundManager.playMusic('music_normal');
        }

        if (gameManager.isBossWave) {
            const targetFogColor = this.isBossWave ? BOSS_BG_COLOR : NORMAL_BG_COLOR;
            scene.fog.color.set(targetFogColor); 
            hemisphereLight.groundColor.set(targetFogColor.clone().multiplyScalar(0.5));
        }
        
        uiManager.announceWave();

        if (this.isBossWave) spawnBoss(); 
        else { 
            const enemiesToSpawn = 5 + Math.floor(this.wave * 1.5);
            for (let i = 0; i < enemiesToSpawn; i++) spawnEnemy();
        }
        uiManager.updateHUD();
    },
};

let playerStats = {};
function resetPlayerStats() {
    playerStats = {
        level: 1, xp: 0, xpToNextLevel: 10, maxHealth: 100, health: 100, speed: 15,
        healthOnKill: 0, pierce: 0, 
        pickupSpeed: 20,
        critChance: 0.05, 
        critMultiplier: 1.5,
        perfectDashBuff: { active: false, timer: 0, damageMultiplier: 2.0 },
        killStreak: { count: 0, timer: 0, maxTime: 2.5, speedBonus: 0, fireRateBonus: 0 },
        shields: { count: 0, damage: 10, radius: 5, speed: 2, angle: 0 },
        chainLightning: { chains: 0, range: 15, damageMultiplier: 0.7 },
        upgrades: new Set(), upgradeLevels: {},
        weapon: { type: 'pistol', fireRate: 0.2, cooldown: 0, damage: 10, projectileSpeed: 50, homing: false, homingStrength: 0.04, homingRange: 30 },
        dashReady: true, dashCooldown: 2.0, dashDuration: 0.15, dashSpeed: 80, dashTimer: 0, isDashing: false, dashDamage: 0, dashCooldownTimer: 0,
        dashTrailTimer: 0,
        invulnerable: false,
        godMode: false,
    };
}

function clearPlayerAttachments(p) { if (p.guns) { p.guns.forEach(g => p.body.remove(g)); p.guns = []; } }
function applyBaseGunVisuals(p) {
    clearPlayerAttachments(p);
    const gunMat = new THREE.MeshPhysicalMaterial({ color: 0x00FFFF, metalness: 0.8, roughness: 0.2, emissive: 0x00FFFF, emissiveIntensity: 0.5 });
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.5), gunMat);
    gun.position.set(0, 0.2, 0.8); p.body.add(gun); p.guns.push(gun);
}
function applyDualWieldVisuals(p) {
    clearPlayerAttachments(p);
    const gunMat = new THREE.MeshPhysicalMaterial({ color: 0x00FFFF, metalness: 0.8, roughness: 0.2, emissive: 0x00FFFF, emissiveIntensity: 0.5 });
    const gunGeo = new THREE.BoxGeometry(0.3, 0.3, 1.5);
    const gun1 = new THREE.Mesh(gunGeo, gunMat); gun1.position.set(-0.5, 0.2, 0.5); p.body.add(gun1); p.guns.push(gun1);
    const gun2 = new THREE.Mesh(gunGeo, gunMat); gun2.position.set(0.5, 0.2, 0.5); p.body.add(gun2); p.guns.push(gun2);
}

function applyJavelinSystemVisuals(p) {
    clearPlayerAttachments(p);
    const podMat = new THREE.MeshPhysicalMaterial({ color: 0xFFFF00, metalness: 0.5, roughness: 0.3, emissive: 0xFFFF00, emissiveIntensity: 0.5 });
    const podGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8); 
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.position.set(0, 0.8, 0); 
    p.body.add(pod);
    p.guns.push(pod);
}

function applyChainLightningVisuals(p) {
    if (p.lightningCoils) return;
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 2, roughness: 0.3 });
    const coilGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    const coil1 = new THREE.Mesh(coilGeo, coilMat); coil1.position.set(-0.8, 0.5, -0.2);
    const coil2 = new THREE.Mesh(coilGeo, coilMat); coil2.position.set(0.8, 0.5, -0.2);
    p.body.add(coil1, coil2); p.lightningCoils = [coil1, coil2];
}
function applySpeedVisuals(p, level) {
     if (!p.thrusters) {
        const thrusterMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, emissive: 0xff8c00, emissiveIntensity: 1.5 });
        const thrusterGeo = new THREE.CylinderGeometry(0.2, 0.1, 0.4, 8);
        const thruster1 = new THREE.Mesh(thrusterGeo, thrusterMat); thruster1.position.set(-0.4, -0.3, -0.8); thruster1.rotation.x = Math.PI / 4;
        const thruster2 = new THREE.Mesh(thrusterGeo, thrusterMat); thruster2.position.set(0.4, -0.3, -0.8); thruster2.rotation.x = Math.PI / 4;
        p.body.add(thruster1, thruster2); p.thrusters = [thruster1, thruster2];
    }
     p.thrusters.forEach(t => t.material.emissiveIntensity = 1.5 + level * 0.5);
}
function applyDamageVisuals(p, level) { p.guns.forEach(gun => gun.scale.set(1 + level * 0.1, 1 + level * 0.1, 1 + level * 0.1)); }

const allUpgrades = [
    { 
        id: 'dual_wield', 
        name: 'Arma Dupla', 
        desc: 'Empunhe uma segunda arma, dobrando seus tiros. <b>Cadência de tiro reduzida.</b>',
        tags: ['foundation'], 
        icon: '[| |]', 
        apply: () => { 
            playerStats.weapon.type = 'dual_wield'; 
            playerStats.weapon.fireRate *= 1.4;
            applyDualWieldVisuals(player);
            playerStats.upgrades.add('dual_wield'); 
        }
    },
    {            
        id: 'chain_lightning', 
        name: 'Raio em Cadeia', 
        desc: 'Seus tiros ricocheteiam para 2 inimigos próximos.', 
        tags: ['foundation'], 
        icon: '⚡', 
        apply: () => { 
            playerStats.chainLightning.chains = 2; 
            playerStats.upgrades.add('chain_lightning'); 
            applyChainLightningVisuals(player); 
        } 
    },
    { 
        id: 'javelin_system', 
        name: 'Sistema de Mísseis Javelin', 
        desc: 'Dispara um míssil que voa para cima e depois persegue um inimigo com <b>100% de precisão</b>. <b>Enorme recuo</b>, <b>baixa cadência de tiro</b> e <b>dano reduzido</b>.', 
        tags: ['foundation'], 
        icon: '🎯', 
        apply: () => { 
            playerStats.weapon.type = 'javelin'; 
            playerStats.weapon.fireRate *= 3.5;
            playerStats.weapon.damage *= 0.7;
            playerStats.weapon.projectileSpeed *= 0.7;
            applyJavelinSystemVisuals(player);
            playerStats.upgrades.add('javelin_system');
        }
    },
    {
        id: 'javelin_warhead',
        repeatable: true,
        requires: 'javelin_system',
        name: (level) => `Ogive Aprimorada Mk. ${level + 1}`,
        desc: (level) => `Mísseis Javelin causam <b>+15% de dano</b> e têm uma <b>pequena explosão</b> no impacto.`,
        tags: ['javelin_mod'],
        icon: '💥',
        apply: (level) => {
            playerStats.weapon.damage *= 1.15;
            playerStats.upgradeLevels['javelin_warhead'] = (level || 0) + 1;
        }
    },
    {
        id: 'javelin_booster',
        repeatable: true,
        requires: 'javelin_system',
        name: (level) => `Pós-combustor de Míssil Mk. ${level + 1}`,
        desc: (level) => `Mísseis Javelin voam <b>+25% mais rápido</b> após a subida inicial.`,
        tags: ['javelin_mod'],
        icon: '🚀',
        apply: () => {
            playerStats.weapon.projectileSpeed *= 1.25;
        }
    },
    {
        id: 'javelin_recoil_compensator',
        name: 'Compensador de Recuo',
        requires: 'javelin_system',
        desc: 'Reduz drasticamente o recuo ao disparar Mísseis Javelin.',
        tags: ['javelin_mod'],
        icon: '⚓',
        apply: () => {
            playerStats.upgrades.add('recoil_compensator');
        }
    },
      
    { id: 'sync_fire', name: 'Disparo Sincronizado', desc: '+25% de cadência de tiro para suas armas duplas.', tags: ['dual_wield_mod'], requires: 'dual_wield', icon: '++', apply: () => { playerStats.weapon.fireRate *= 0.75; } },
    { id: 'high_voltage', name: 'Cadeia de Alta Voltagem', desc: 'O Raio em Cadeia atinge 2 alvos adicionais.', tags: ['chain_mod'], requires: 'chain_lightning', icon: '⚡+', apply: () => { playerStats.chainLightning.chains += 2; } },
    { id: 'blade_vortex', name: 'Vórtice de Lâminas', desc: 'Ganha 2 escudos orbitais que causam dano pesado.', tags: ['shield_mod'], icon: '🛡️', apply: () => { playerStats.shields.count += 2; playerStats.shields.damage = 25; playerStats.shields.speed = 4; playerStats.shields.radius = 7; updateShields(0, true); } },
    { id: 'dash_attack', name: 'Impacto Cinético', desc: 'Seu Dash agora causa 50 de dano e repele inimigos.', tags: ['dash_mod'], icon: '💥', apply: () => { playerStats.dashDamage += 50; } },
    { id: 'glass_cannon', name: 'Canhão de Vidro', desc: 'Dobre seu dano, mas reduza sua vida máxima pela metade. Alto risco, alta recompensa.', tags: ['risk_reward'], icon: '☠️', apply: () => { playerStats.weapon.damage *= 2; playerStats.maxHealth /= 2; playerStats.health = Math.min(playerStats.health, playerStats.maxHealth); } },
    { id: 'hp', repeatable: true, icon: '❤️', name: (level) => `Blindagem Reforçada Mk. ${level + 1}`, desc: (level) => `+25 de Vida Máxima. (Total: +${(level + 1) * 25})`, apply: () => { playerStats.maxHealth += 25; playerStats.health += 25; } },
    { id: 'speed', repeatable: true, icon: '⏩', name: (level) => `Sobrecarga do Motor Mk. ${level + 1}`, desc: (level) => `+10% de Velocidade de Movimento.`, apply: (level) => { playerStats.speed *= 1.10; applySpeedVisuals(player, level + 1); } },
    { id: 'damage', repeatable: true, icon: '🔥', name: (level) => `Calibre Pesado Mk. ${level + 1}`, desc: (level) => `+5 de Dano base da arma. (Total: +${(level + 1) * 5})`, apply: (level) => { playerStats.weapon.damage += 5; applyDamageVisuals(player, level + 1); } },
    { id: 'vampire', repeatable: true, icon: '🩸', name: (level) => `Nanossanguessuga Mk. ${level + 1}`, desc: (level) => `Cura +1 de Vida por abate. (Total: ${level + 1} por abate)`, apply: () => playerStats.healthOnKill += 1 },
    { id: 'afterburner', repeatable: true, icon: '💨', name: (level) => `Pós-combustor Mk. ${level + 1}`, desc: (level) => `Reduz o tempo de recarga do Dash em 15%.`, apply: () => playerStats.dashCooldown *= 0.85 },
    { id: 'magnet', repeatable: true, icon: '🧲', name: (level) => `Acelerador de Coleta Mk. ${level + 1}`, desc: (level) => `Aumenta a velocidade com que as coletas voam até você em 50%.`, apply: () => { playerStats.pickupSpeed *= 1.5; } },
    { id: 'precision_tuning', repeatable: true, icon: '🎯', name: (level) => `Ajuste de Precisão Mk. ${level + 1}`, desc: (level) => `Aumenta a chance de acerto crítico em <b>+5%</b> e o dano crítico em <b>+25%</b>.`, apply: () => { playerStats.critChance += 0.05; playerStats.critMultiplier += 0.25; } },
    { id: 'reactive_phasing', name: 'Faseamento Reativo', desc: 'O Dash Perfeito agora cria uma explosão de energia que causa <b>100 de dano</b> e o buff de dano é <b>mais forte</b>.', tags: ['dash_mod'], icon: '💠', apply: () => { playerStats.perfectDashBuff.damageMultiplier = 3.0; playerStats.upgrades.add('reactive_phasing'); } },
    { id: 'flow_state', name: 'Estado de Fluxo', desc: 'Manter um Combo alto concede bônus muito maiores e o tempo para manter o combo é aumentado.', tags: ['combo_mod'], icon: '🌀', apply: () => { playerStats.killStreak.maxTime += 1.0; playerStats.upgrades.add('flow_state'); } },
    { id: 'adrenaline_rush', name: 'Adrenalina', desc: 'Abaixo de <b>30% de vida</b>, ganhe <b>+30%</b> de velocidade de movimento e <b>+25%</b> de cadência de tiro.', tags: ['risk_reward'], icon: '❤️‍🔥', apply: () => { playerStats.upgrades.add('adrenaline_rush'); } }
];

const ENEMY_TYPES = {
    SLIME: { geo: new THREE.SphereGeometry(1.2, 12, 12), health: 20, speed: 5, damage: 5, xp: 2, material: new THREE.MeshPhysicalMaterial({ color: 0x3cb371, roughness: 0.8, transmission: 0.9, thickness: 1.5 }) },
    SCOUT: { geo: new THREE.ConeGeometry(0.8, 2, 8), health: 10, speed: 12, damage: 3, xp: 3, material: new THREE.MeshPhysicalMaterial({ color: 0xf0e68c, metalness: 0.5, roughness: 0.4 }), dashCooldown: 5, dashSpeed: 40 },
    RANGER: { geo: new THREE.CapsuleGeometry(0.7, 1.5), health: 15, speed: 4, damage: 5, xp: 5, range: 40, fireRate: 2.5, cooldown: 2.5, material: new THREE.MeshPhysicalMaterial({ color: 0xff6347, roughness: 0.5 }), burstCount: 3, burstRate: 0.15 },
    TANK: { geo: new THREE.BoxGeometry(3, 3, 3), health: 100, speed: 2, damage: 15, xp: 10, material: new THREE.MeshPhysicalMaterial({ color: 0x696969, metalness: 0.95, roughness: 0.3 }), knockbackImmune: true, stompRadius: 10, stompDamageMultiplier: 1.5, stompCooldown: 6 },
    KAMIKAZE: { geo: new THREE.OctahedronGeometry(1, 0), health: 5, speed: 18, damage: 10, xp: 4, material: new THREE.MeshPhysicalMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.6 }), explosionDamage: 30, explosionRadius: 8 },
    SUMMONER: { geo: new THREE.BoxGeometry(1, 4, 1), health: 50, speed: 3, damage: 8, xp: 15, material: new THREE.MeshPhysicalMaterial({ color: 0x9932CC, emissive: 0x9932CC, emissiveIntensity: 0.4, roughness: 0.6 }), preferredDistance: 50, summonCooldown: 5, secondaryAttackCooldown: 8 },
    MINION: { geo: new THREE.TetrahedronGeometry(0.8), health: 1, speed: 10, damage: 2, xp: 1, material: new THREE.MeshStandardMaterial({ color: 0xDA70D6, emissive: 0xDA70D6, emissiveIntensity: 0.5 }) }
};
const BOSS_TYPES = {
    TITAN: {
        id: 'TITAN', 
        name: 'TITAN MECÂNICO', 
        geo: new THREE.IcosahedronGeometry(5, 1),
        radius: 5,
        mat: new THREE.MeshPhysicalMaterial({ color: 0x8A2BE2, roughness: 0.4, metalness: 0.2, emissive: 0x8A2BE2, emissiveIntensity: 0.5 }),
        health: 5000, 
        speed: 4, 
        damage: 40, 
        xp: 500, 
        knockbackImmune: true,
        phases: [
            { healthThreshold: 0.5, attackPool: ['burst_attack', 'laser_attack'] },
            { healthThreshold: 0, attackPool: ['burst_attack', 'laser_attack', 'overload_slam_qte'] }
        ],
    },
    HIVE_MIND: {
        id: 'HIVE_MIND', name: 'MENTE-COLMEIA', geo: new THREE.SphereGeometry(4, 16, 16),
        radius: 4,
        mat: new THREE.MeshPhysicalMaterial({ color: 0x2E8B57, roughness: 0.8, emissive: 0x55ff88, emissiveIntensity: 0.3 }),
        health: 6000, speed: 5, damage: 25, xp: 600, knockbackImmune: true,
        phases: [
            { healthThreshold: 0.6, attackPool: ['spawn_minions', 'radial_attack'] },
            { healthThreshold: 0, attackPool: ['spawn_minions', 'radial_attack', 'spore_field', 'mind_shatter_qte'] }
        ],
    },
    SENTINEL: {
        id: 'SENTINEL', name: 'SENTINELA ÔMEGA', geo: new THREE.OctahedronGeometry(4, 1),
        radius: 4,
        mat: new THREE.MeshPhysicalMaterial({ color: 0x00BFFF, metalness: 0.9, roughness: 0.1, emissive: 0x00BFFF, emissiveIntensity: 0.7 }),
        health: 4000, speed: 0, damage: 50, xp: 750, knockbackImmune: true,
        phases: [
            { healthThreshold: 0.5, attackPool: ['aiming_snipe', 'firing_barrage'] },
            { healthThreshold: 0, attackPool: ['aiming_snipe', 'firing_barrage', 'teleport_combo', 'purge_sequence_qte'] }
        ],
    }
};
const PICKUP_TYPES = {
    HEALTH: { geo: new THREE.TorusGeometry(0.5, 0.2, 8, 16), mat: new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 }), onCollect: () => { playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + playerStats.maxHealth * 0.1); }, value: 0 },
    XP_GEM: { geo: new THREE.OctahedronGeometry(0.4, 0), mat: new THREE.MeshStandardMaterial({ color: 0x00bfff, emissive: 0x00bfff, emissiveIntensity: 0.5 }), onCollect: (pickup) => { gainXP(pickup.value); }, value: 5 }
};

function init() {
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(NORMAL_BG_COLOR.getHex(), 60, 200);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true }); 
    renderer.setSize(window.innerWidth, window.innerHeight); 
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    damageContainer = document.getElementById('damage-container');
    composer = new EffectComposer(renderer); 
    composer.addPass(new RenderPass(scene, camera)); 
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.1)); 
    composer.addPass(new OutputPass());
    
    clock = new THREE.Clock();
    
    soundManager.init();
   
    setupScene(); 
    initPreviewSystem();
    initEventListeners();
    initMenuBackground();
    
    uiManager.init();
    uiManager.show('mainMenu');
}

function onWindowResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); const canvas = document.getElementById('upgrade-preview-canvas'); if (canvas && previewRenderer) { previewCamera.aspect = canvas.clientWidth / canvas.clientHeight; previewCamera.updateProjectionMatrix(); previewRenderer.setSize(canvas.clientWidth, canvas.clientHeight); } const menuCanvas = document.getElementById('menu-canvas'); menuCanvas.width = window.innerWidth; menuCanvas.height = window.innerHeight; }
function onMouseMove(event) { mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; }
function onMouseWheel(event) { cameraState.targetDistance = THREE.MathUtils.clamp(cameraState.targetDistance + event.deltaY * 0.05, 20, 100); }

function initEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === "'") {
            toggleDebugMenu();
        }
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            if (gameManager.state === 'running') gameManager.pauseGame();
            else if (gameManager.state === 'paused') gameManager.resumeGame();
        }
    });
    document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
    document.addEventListener('mousemove', onMouseMove);
    
    document.addEventListener('mousedown', (e) => {
        if (soundManager.audioContext && soundManager.audioContext.state === 'suspended') {
            soundManager.audioContext.resume();
        }
        if (e.button === 0) {
            mouse.down = true;
        }
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
    document.addEventListener('wheel', onMouseWheel);

    // Menu Buttons
    document.getElementById('start-button').addEventListener('click', () => { soundManager.play('uiClick'); gameManager.startGame(); });
    document.getElementById('restart-button').addEventListener('click', () => location.reload());
    document.getElementById('restart-button-pause').addEventListener('click', () => location.reload());
    document.getElementById('resume-button').addEventListener('click', () => gameManager.resumeGame());
    document.getElementById('how-to-play-button').addEventListener('click', () => { soundManager.play('uiClick'); uiManager.hide('mainMenu'); uiManager.show('howToPlayScreen'); });
    document.getElementById('back-button-htp').addEventListener('click', () => { soundManager.play('uiClick'); uiManager.hide('howToPlayScreen'); uiManager.show('mainMenu'); });

    let lastOpenMenu = 'mainMenu';
    const openOptions = () => {
        soundManager.play('uiClick');
        if (uiManager.elements.mainMenu.classList.contains('visible')) lastOpenMenu = 'mainMenu';
        if (uiManager.elements.pauseMenu.classList.contains('visible')) lastOpenMenu = 'pauseMenu';
        uiManager.hide('mainMenu'); uiManager.hide('pauseMenu');
        uiManager.show('optionsScreen');
    };
    document.getElementById('options-button').addEventListener('click', openOptions);
    document.getElementById('options-button-pause').addEventListener('click', openOptions);
    document.getElementById('back-button-options').addEventListener('click', () => { soundManager.play('uiClick'); uiManager.hide('optionsScreen'); uiManager.show(lastOpenMenu); });

    document.getElementById('music-volume').addEventListener('input', (e) => soundManager.setMusicVolume(parseFloat(e.target.value)));
    document.getElementById('sfx-volume').addEventListener('input', (e) => soundManager.setSfxVolume(parseFloat(e.target.value)));
    document.getElementById('debug-close-button').addEventListener('click', toggleDebugMenu);

    document.getElementById('debug-spawn-boss-button').addEventListener('click', () => {
        for (let i = gameObjects.enemies.length - 1; i >= 0; i--) {
            const enemy = gameObjects.enemies[i];
            if (enemy && enemy.mesh) scene.remove(enemy.mesh);
            gameObjects.enemies.splice(i, 1);
        }

        const selector = document.getElementById('debug-boss-selector');
        const bossId = selector.value;
        spawnSpecificBoss(bossId);

        gameManager.isBossWave = true;
        uiManager.elements.bossHud.style.visibility = 'visible';
        soundManager.playMusic('music_boss');
        const targetFogColor = BOSS_BG_COLOR;
        scene.fog.color.set(targetFogColor);
        hemisphereLight.groundColor.set(targetFogColor.clone().multiplyScalar(0.5));
        toggleDebugMenu();
    });

    document.getElementById('debug-set-wave-button').addEventListener('click', () => {
        const input = document.getElementById('debug-wave-input');
        const waveNum = parseInt(input.value, 10);
        if (!isNaN(waveNum) && waveNum > 0) {
            gameManager.wave = waveNum - 1;
            for (let i = gameObjects.enemies.length - 1; i >= 0; i--) {
                const enemy = gameObjects.enemies[i];
                if(enemy && enemy.mesh) scene.remove(enemy.mesh);
                gameObjects.enemies.splice(i, 1);
            }
            gameManager.nextWave();
            toggleDebugMenu();
        }
    });

    document.getElementById('debug-heal-button').addEventListener('click', () => { playerStats.health = playerStats.maxHealth; uiManager.updateHUD(); });
    document.getElementById('debug-xp-button').addEventListener('click', () => { gainXP(playerStats.xpToNextLevel); });
    document.getElementById('debug-kill-enemies-button').addEventListener('click', () => {
        for (let i = gameObjects.enemies.length - 1; i >= 0; i--) {
            const enemy = gameObjects.enemies[i];
            if(enemy && enemy.mesh) scene.remove(enemy.mesh);
            gameObjects.enemies.splice(i, 1);
        }
    });
    document.getElementById('debug-god-mode-button').addEventListener('click', (e) => { playerStats.godMode = !playerStats.godMode; e.target.classList.toggle('active', playerStats.godMode); });
}
function initDashTrailPool() {
    const trailGeo = new THREE.CapsuleGeometry(0.7, 1.0, 4, 16);
    const trailMat = new THREE.MeshBasicMaterial({ color: 0x4169E1, transparent: true, opacity: 0.5 });
    for (let i = 0; i < DASH_TRAIL_POOL_SIZE; i++) {
        const mesh = new THREE.Mesh(trailGeo, trailMat);
        mesh.visible = false;
        scene.add(mesh);
        dashTrailPool.push({ mesh: mesh, lifetime: 0 });
    }
}

function resetPlayer() {
    resetPlayerStats(); if(player) scene.remove(player);
    player = new THREE.Group();
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x4169E1, metalness: 0.2, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.1 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.0, 4, 16), bodyMat);
    player.add(body); player.body = body; player.guns = []; player.lightningCoils = null; player.thrusters = null; applyBaseGunVisuals(player);
    const spotLight = new THREE.SpotLight(0xffffff, 5, 80, Math.PI / 6, 0.2); spotLight.position.set(0, 5, 1); spotLight.target.position.set(0, 0, -1);
    player.add(spotLight); player.add(spotLight.target); player.spotLight = spotLight;
    player.position.y = 1.2; player.traverse(child => { child.castShadow = true; }); playerCollider = new THREE.Box3(); scene.add(player);
}

function createGroundTexture(baseColor) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 50;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
}

function createForest(leavesColor, trunkColor) {
    const treeGeo = new THREE.CylinderGeometry(0.5, 0.8, 8, 8);
    const treeMat = new THREE.MeshPhysicalMaterial({ color: trunkColor, roughness: 0.9 });
    const leavesGeo = new THREE.IcosahedronGeometry(3.5, 0);
    const leavesMat = new THREE.MeshPhysicalMaterial({ color: leavesColor, roughness: 0.8 });

    for (let i = 0; i < 100; i++) {
        const x = THREE.MathUtils.randFloatSpread(180);
        const z = THREE.MathUtils.randFloatSpread(180);
        if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
        
        const tree = new THREE.Mesh(treeGeo, treeMat);
        tree.position.set(x, 4, z);
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.set(x, 9, z);
        tree.castShadow = true;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        scene.add(tree, leaves);
        
        gameObjects.scenery.push(tree, leaves);
    }
}

function setupScene() {
    hemisphereLight = new THREE.HemisphereLight(0xB1E1FF, 0x556B2F, 0.5);
    scene.add(hemisphereLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e5, 2);
    dirLight.position.set(50, 50, 25);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 80; dirLight.shadow.camera.bottom = -80; dirLight.shadow.camera.left = -80; dirLight.shadow.camera.right = 80;
    dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    scene.background = new THREE.CubeTextureLoader().load(['https://threejs.org/examples/textures/cube/MilkyWay/dark-s_px.jpg','https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nx.jpg','https://threejs.org/examples/textures/cube/MilkyWay/dark-s_py.jpg','https://threejs.org/examples/textures/cube/MilkyWay/dark-s_ny.jpg','https://threejs.org/examples/textures/cube/MilkyWay/dark-s_pz.jpg','https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nz.jpg']);

    initDashTrailPool();
}

function changeEnvironment() {
    gameObjects.scenery.forEach(obj => scene.remove(obj));
    gameObjects.scenery = [];

    let fogColor, lightColor, groundTexColor, leavesColor, trunkColor;

    switch (gameManager.bossesDefeated % 3) {
        case 1: // Volcanic
            console.log("Environment changed to: Volcanic");
            fogColor = new THREE.Color(0x4d1a00);
            lightColor = new THREE.Color(0x8B4513);
            groundTexColor = '#5a2d0d';
            leavesColor = new THREE.Color(0x8B0000);
            trunkColor = new THREE.Color(0x3C3C3C);
            break;
        case 2: // Crystalline
            console.log("Environment changed to: Crystalline");
            fogColor = new THREE.Color(0x0c0d2e);
            lightColor = new THREE.Color(0x483D8B);
            groundTexColor = '#1f2a4d';
            leavesColor = new THREE.Color(0x00FFFF);
            trunkColor = new THREE.Color(0xADD8E6);
            break;
        default: // Forest
            console.log("Environment changed to: Forest");
            fogColor = NORMAL_BG_COLOR;
            lightColor = new THREE.Color(0x556B2F);
            groundTexColor = '#4a5d23';
            leavesColor = new THREE.Color(0x228B22);
            trunkColor = new THREE.Color(0x5C4033);
            break;
    }

    scene.fog.color.set(fogColor);
    hemisphereLight.groundColor.set(lightColor);

    const ground = scene.getObjectByName('ground');
    if (ground) {
        ground.material.map = createGroundTexture(groundTexColor);
        ground.material.needsUpdate = true;
    }
    
    createForest(leavesColor, trunkColor);
}
    
function applyDamageFlash(object) {
    object.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
            if (child.damageFlashTimeout) {
                clearTimeout(child.damageFlashTimeout);
            } else {
                child._originalEmissive = child.material.emissive.getHex();
                child._originalEmissiveIntensity = child.material.emissiveIntensity;
            }

            child.material.emissive.setHex(0xffffff);
            child.material.emissiveIntensity = 1.5;

            child.damageFlashTimeout = setTimeout(() => {
                if (child.material) {
                    child.material.emissive.setHex(child._originalEmissive);
                    child.material.emissiveIntensity = child._originalEmissiveIntensity;
                }
                child.damageFlashTimeout = null;
            }, 80);
        }
    });
}
function createExplosion(position, color, count) { const geometry = new THREE.BufferGeometry(); const vertices = []; const velocities = []; const material = new THREE.PointsMaterial({ color: color, size: 0.5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); for (let i = 0; i < count; i++) { vertices.push(position.x, position.y, position.z); const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5); if (vel.lengthSq() > 0) vel.normalize().multiplyScalar(Math.random() * 15); velocities.push(vel); } geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); const particles = new THREE.Points(geometry, material); gameObjects.particles.push({ points: particles, velocities: velocities, lifetime: 0.8 }); scene.add(particles); }
function createPickup(position, type, value) {
    const pickupData = type; const mesh = new THREE.Mesh(pickupData.geo, pickupData.mat.clone());
    mesh.position.copy(position); mesh.position.y = 1; mesh.castShadow = true;
    gameObjects.pickups.push({ mesh, type: pickupData, value, lifetime: 20, collider: new THREE.Box3(), currentSpeed: 5 });
    scene.add(mesh);
}

function initPreviewSystem() {
    const canvas = document.getElementById('upgrade-preview-canvas');
    previewScene = new THREE.Scene(); previewCamera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100); previewCamera.position.set(0, 2, 7);
    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); previewRenderer.setClearColor(0x000000, 0); previewRenderer.setSize(canvas.clientWidth, canvas.clientHeight); previewRenderer.toneMapping = THREE.ACESFilmicToneMapping; previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewScene.add(new THREE.AmbientLight(0xffffff, 0.5)); const keyLight = new THREE.DirectionalLight(0xffffff, 1.5); keyLight.position.set(2, 3, 3); previewScene.add(keyLight);
}
function createPreviewPlayerModel() {
    const previewGroup = new THREE.Group();
    const bodyClone = new THREE.Mesh(player.body.geometry.clone(), player.body.material.clone());
    previewGroup.add(bodyClone);
    previewGroup.body = bodyClone;
    previewGroup.guns = [];

    if (playerStats.weapon.type === 'pistol') applyBaseGunVisuals(previewGroup);
    else if (playerStats.weapon.type === 'dual_wield') applyDualWieldVisuals(previewGroup);
    else if (playerStats.weapon.type === 'javelin') applyJavelinSystemVisuals(previewGroup);

    if (playerStats.upgrades.has('chain_lightning')) applyChainLightningVisuals(previewGroup);
    const speedLevel = playerStats.upgradeLevels['speed'] || 0; if (speedLevel > 0) applySpeedVisuals(previewGroup, speedLevel);
    const damageLevel = playerStats.upgradeLevels['damage'] || 0; if (damageLevel > 0) applyDamageVisuals(previewGroup, damageLevel);
    return previewGroup;
}
function showUpgradePreview(upgrade) {
    if (previewModel) {
        previewScene.remove(previewModel);
    }
    previewModel = createPreviewPlayerModel();
    const level = playerStats.upgradeLevels[upgrade.id] || 0;
    
    switch (upgrade.id) {
        case 'dual_wield': applyDualWieldVisuals(previewModel); break;
        case 'javelin_system': applyJavelinSystemVisuals(previewModel); break;
        case 'chain_lightning': applyChainLightningVisuals(previewModel); break;
        case 'speed': applySpeedVisuals(previewModel, level + 1); break;
        case 'damage': applyDamageVisuals(previewModel, level + 1); break;
    }
    
    previewScene.add(previewModel);
}
function animatePreview() { previewAnimationId = requestAnimationFrame(animatePreview); if (previewModel) previewModel.rotation.y += 0.01; previewRenderer.render(previewScene, previewCamera); }
function stopPreview() { cancelAnimationFrame(previewAnimationId); if (previewModel) previewScene.remove(previewModel); previewModel = null; }

function spawnSpecificBoss(bossId) {
    const bossType = BOSS_TYPES[bossId];
    if (!bossType) {
        console.error("Debug Error: Boss with ID", bossId, "not found.");
        return;
    }

    const boss = new THREE.Mesh(bossType.geo.clone(), bossType.mat.clone());
    boss.castShadow = true;
    const spawnY = bossType.radius ? bossType.radius + 0.5 : 5;
    boss.position.set(player.position.x, spawnY, player.position.z - 40);

    const waveMultiplier = 1 + (gameManager.wave / 5 - 1) * 0.5;
    const bossData = {
        mesh: boss, type: bossType, isBoss: true,
        health: bossType.health * waveMultiplier, maxHealth: bossType.health * waveMultiplier,
        speed: bossType.speed, damage: bossType.damage * waveMultiplier, xpValue: Math.floor(bossType.xp * waveMultiplier),
        collider: new THREE.Box3(), state: 'idle', stateTimer: 2, attackCooldown: 0,
        phaseIndex: 0,
        custom: {} 
    };
    gameObjects.enemies.push(bossData);
    scene.add(boss);
    
    uiManager.elements.bossNameText.textContent = bossType.name;
    uiManager.updateHUD();
}

function populateDebugBossSelector() {
    const selector = document.getElementById('debug-boss-selector');
    selector.innerHTML = '';
    for (const bossId in BOSS_TYPES) {
        const option = document.createElement('option');
        option.value = bossId;
        option.textContent = BOSS_TYPES[bossId].name;
        selector.appendChild(option);
    }
}

function spawnEnemy(overrideType, position) {
    let type; if (overrideType) { type = overrideType; } else { const rand = Math.random(); if (gameManager.wave < 3) { type = rand < 0.7 ? ENEMY_TYPES.SLIME : ENEMY_TYPES.SCOUT; } else if (gameManager.wave < 7) { if (rand < 0.35) type = ENEMY_TYPES.SLIME; else if (rand < 0.55) type = ENEMY_TYPES.SCOUT; else if (rand < 0.75) type = ENEMY_TYPES.RANGER; else if (rand < 0.9) type = ENEMY_TYPES.KAMIKAZE; else type = ENEMY_TYPES.SUMMONER; } else { if (rand < 0.20) type = ENEMY_TYPES.SLIME; else if (rand < 0.35) type = ENEMY_TYPES.SCOUT; else if (rand < 0.55) type = ENEMY_TYPES.RANGER; else if (rand < 0.65) type = ENEMY_TYPES.KAMIKAZE; else if (rand < 0.85) type = ENEMY_TYPES.TANK; else type = ENEMY_TYPES.SUMMONER; } }
    const enemy = new THREE.Mesh(type.geo.clone(), type.material.clone()); enemy.castShadow = true; enemy.position.y = (type === ENEMY_TYPES.SUMMONER) ? 2 : 1.5;
    if (position) { enemy.position.copy(position); } else { const angle = Math.random() * Math.PI * 2; const radius = 40 + Math.random() * 15; enemy.position.x = player.position.x + Math.cos(angle) * radius; enemy.position.z = player.position.z + Math.sin(angle) * radius; }
    const difficultyMultiplier = (type === ENEMY_TYPES.MINION) ? 1 : Math.pow(DIFFICULTY_EXPONENT, gameManager.wave - 1);
    const enemyData = { mesh: enemy, type, health: type.health * difficultyMultiplier, maxHealth: type.health * difficultyMultiplier, speed: type.speed, damage: type.damage * difficultyMultiplier, xpValue: Math.floor(type.xp * (1 + (gameManager.wave * 0.1))), collider: new THREE.Box3(), cooldown: type.cooldown || 0, dashCooldownTimer: type.dashCooldown || 0, isDashing: false, stompCooldownTimer: type.stompCooldown || 0, secondaryAttackTimer: type.secondaryAttackCooldown || 0, isBursting: false, burstsLeft: 0, burstTimer: 0 };
    gameObjects.enemies.push(enemyData); scene.add(enemy);
}
function spawnBoss() {
    const bossPool = Object.values(BOSS_TYPES);
    const bossType = bossPool[gameManager.bossesDefeated % bossPool.length];

    const boss = new THREE.Mesh(bossType.geo, bossType.mat.clone());
    boss.castShadow = true;
    boss.position.set(0, (bossType.radius || 5) + 0.5, -80);

    const waveMultiplier = 1 + (gameManager.wave / 5 - 1) * 0.5;
    const bossData = {
        mesh: boss, type: bossType, isBoss: true,
        health: bossType.health * waveMultiplier, maxHealth: bossType.health * waveMultiplier,
        speed: bossType.speed, damage: bossType.damage * waveMultiplier, xpValue: Math.floor(bossType.xp * waveMultiplier),
        collider: new THREE.Box3(), state: 'idle', stateTimer: 2, attackCooldown: 0,
        phaseIndex: 0,
        custom: {} 
    };
    gameObjects.enemies.push(bossData);
    scene.add(boss);
    uiManager.elements.bossNameText.textContent = bossType.name;
}

function showDamageNumber(targetObject, damageAmount, options = {}) { 
    if (!targetObject || !targetObject.parent) return; 
    const vector = new THREE.Vector3(); 
    const box = new THREE.Box3().setFromObject(targetObject); 
    box.getCenter(vector); 
    vector.set(vector.x, box.max.y, vector.z); vector.project(camera); 
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth; 
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight; 
    const damageElement = document.createElement('div'); 
    damageElement.className = 'damage-text'; 
    damageElement.style.left = (x + Math.random() * 40 - 20) + 'px'; 
    damageElement.style.top = y + 'px'; 
    damageElement.textContent = Math.round(damageAmount); 

    if (options.isPlayer) { 
        damageElement.style.color = '#d9534f'; 
        damageElement.style.fontSize = '1.8em'; 
    } else if (options.isCrit) {
        damageElement.style.color = '#ffeb3b';
        damageElement.style.fontSize = '2.5em';
        damageElement.style.fontWeight = '900';
        damageElement.textContent += '!';
        damageElement.style.textShadow = '2px 2px 5px #e53935';
    } else if (options.isExplosion) { 
        damageElement.style.color = '#ff8c00'; 
        damageElement.style.fontSize = '2.0em'; 
        damageElement.style.fontWeight = '800'; 
    } else if (damageAmount >= 50) { 
        damageElement.style.color = '#ff4500'; 
        damageElement.style.fontSize = '2.2em'; 
        damageElement.style.fontWeight = '900'; 
    } else if (damageAmount >= 20) { 
        damageElement.style.color = '#ffa500'; 
        damageElement.style.fontSize = '1.8em'; 
    } else { 
        damageElement.style.color = '#ffdd77'; 
        damageElement.style.fontSize = '1.5em'; 
    } 
    damageContainer.appendChild(damageElement); 
    setTimeout(() => { if (damageElement.parentElement) damageContainer.removeChild(damageElement); }, 1000); 
}
function takeDamage(amount, sourceOptions = {}) {
      if (playerStats.godMode) return;
if (playerStats.invulnerable) return; 
playerStats.health -= amount; soundManager.play('playerHurt'); cameraState.shakeIntensity = 0.2; cameraState.shakeDuration = 0.2; applyDamageFlash(player); showDamageNumber(player, amount, { isPlayer: true, ...sourceOptions }); if (playerStats.health <= 0) { playerStats.health = 0; gameManager.gameOver(); } uiManager.updateHUD(); }
function gainXP(amount) { playerStats.xp += amount; while (playerStats.xp >= playerStats.xpToNextLevel) { playerStats.xp -= playerStats.xpToNextLevel; playerStats.level++; playerStats.xpToNextLevel = Math.floor(playerStats.xpToNextLevel * 1.5); gameManager.levelUp(); } uiManager.updateHUD(); }

function createLevelUpPulse() { const ringGeo = new THREE.TorusGeometry(1, 0.2, 16, 100); const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffa1, transparent: true, opacity: 0.8 }); const pulse = new THREE.Mesh(ringGeo, ringMat); pulse.position.copy(player.position); pulse.position.y = 0.1; pulse.rotation.x = Math.PI / 2; gameObjects.visualEffects.push({ mesh: pulse, lifetime: 0.8, isPulse: true }); scene.add(pulse); }
function presentUpgradeOptions() {
    uiManager.elements.upgradeOptions.innerHTML = '';
    showUpgradePreview({ id: 'none' });

    let uniqueAvailable = allUpgrades.filter(u => 
        !u.repeatable && 
        !playerStats.upgrades.has(u.id) && 
        !(u.tags.includes('foundation') && (playerStats.upgrades.has('dual_wield') || playerStats.upgrades.has('chain_lightning') || playerStats.upgrades.has('javelin_system'))) && 
        !(u.requires && !playerStats.upgrades.has(u.requires))
    );
    
    let repeatableAvailable = allUpgrades.filter(u => u.repeatable);
    
    let options = [...uniqueAvailable, ...repeatableAvailable];
    options.sort(() => 0.5 - Math.random());
    const chosenOptions = options.slice(0, 3);

    chosenOptions.forEach(upgrade => {
        const button = document.createElement('button');
        const level = playerStats.upgradeLevels[upgrade.id] || 0;
        const name = typeof upgrade.name === 'function' ? upgrade.name(level) : upgrade.name;
        const desc = typeof upgrade.desc === 'function' ? upgrade.desc(level) : upgrade.desc;
        
        button.innerHTML = `<b>${upgrade.icon} ${name}</b><small>${desc}</small>`;
        
        button.onclick = () => chooseUpgrade(upgrade);
        button.onmouseenter = () => showUpgradePreview(upgrade);
        
        uiManager.elements.upgradeOptions.appendChild(button);
    });
}

function chooseUpgrade(upgrade) {
    soundManager.play('upgradeGet');
    const level = playerStats.upgradeLevels[upgrade.id] || 0;
    upgrade.apply(level);
    if (upgrade.repeatable) playerStats.upgradeLevels[upgrade.id] = level + 1; else playerStats.upgrades.add(upgrade.id);
    uiManager.hide('levelUpScreen');
    stopPreview();
    gameManager.state = 'running';
    playerStats.health = playerStats.maxHealth;
    uiManager.updateHUD();
    clock.getDelta();
    animate();
}

let isDebugMenuOpen = false;
function toggleDebugMenu() {
    isDebugMenuOpen = !isDebugMenuOpen;
    if (isDebugMenuOpen) {
        gameManager.pauseGame(false); 
        uiManager.show('debugMenu');
        populateDebugUpgrades();
        populateDebugBossSelector(); 
    } else {
        uiManager.hide('debugMenu');
        gameManager.resumeGame();
    }
}

function populateDebugUpgrades() {
    const container = document.getElementById('debug-upgrades-list');
    container.innerHTML = '';

    allUpgrades.forEach(upgrade => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'debug-upgrade-item';

        const label = document.createElement('label');
        const level = playerStats.upgradeLevels[upgrade.id] || 0;
        const name = typeof upgrade.name === 'function' ? upgrade.name(level) : upgrade.name;
        label.textContent = name;
        label.htmlFor = `debug-upgrade-${upgrade.id}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `debug-upgrade-${upgrade.id}`;
        checkbox.value = upgrade.id;

        if (playerStats.upgrades.has(upgrade.id) || (upgrade.repeatable && level > 0)) {
            checkbox.checked = true;
        }

        checkbox.onchange = () => {
            if (checkbox.checked) {
                const currentLevel = playerStats.upgradeLevels[upgrade.id] || 0;
                upgrade.apply(currentLevel);
                if (upgrade.repeatable) {
                    playerStats.upgradeLevels[upgrade.id] = currentLevel + 1;
                } else {
                    playerStats.upgrades.add(upgrade.id);
                }
                populateDebugUpgrades(); 
                uiManager.updateHUD();
            } else {
                console.log(`(Debug) Removing upgrades is not supported. Please restart.`);
                checkbox.checked = true;
            }
        };

        itemDiv.appendChild(label);
        itemDiv.appendChild(checkbox);
        container.appendChild(itemDiv);
    });
}

function animate() {
    if (gameManager.state !== 'running') return;
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    try {
        updatePlayer(delta); updateEnemies(delta); updateProjectiles(delta); updatePickups(delta);
        updateVisualEffects(delta); updateParticles(delta); updateShields(delta); updateHazards(delta);
        updateDashTrail(delta);
        updateCamera(delta);
        uiManager.updateHUD();
        if (gameObjects.enemies.length === 0 && !gameManager.isBossWave) gameManager.nextWave();
    } catch (e) {
        console.error("Error in animate loop:", e);
        gameManager.pauseGame(false); 
    }
    composer.render();
}

function updateDashTrail(delta) {
    for (const trail of dashTrailPool) {
        if (trail.lifetime > 0) {
            trail.lifetime -= delta;
            trail.mesh.material.opacity = (trail.lifetime / 0.3) * 0.5;
            if (trail.lifetime <= 0) trail.mesh.visible = false;
        }
    }
}

function updatePlayer(delta) {
const velocity = new THREE.Vector3();
if (!playerStats.isDashing) {
    if (keys['w']) velocity.z -= 1; if (keys['s']) velocity.z += 1;
    if (keys['a']) velocity.x -= 1; if (keys['d']) velocity.x += 1;
}

playerStats.dashCooldownTimer -= delta;
if (playerStats.dashCooldownTimer <= 0) playerStats.dashReady = true;

if (keys[' '] && playerStats.dashReady) {
    playerStats.isDashing = true; playerStats.invulnerable = true; playerStats.dashReady = false; playerStats.dashTimer = playerStats.dashDuration;
    playerStats.dashCooldownTimer = playerStats.dashCooldown;
    const dashDirection = velocity.lengthSq() > 0 ? velocity.clone().normalize() : player.getWorldDirection(new THREE.Vector3()).negate();
    dashDirection.y = 0; player.dashDirection = dashDirection;
    cameraState.targetFov = 90; soundManager.play('dash', 0.6);
} else if (keys[' '] && !playerStats.dashReady && !playerStats.isDashing) {
    soundManager.play('denied');
    keys[' '] = false;
}

playerStats.dashTrailTimer -= delta;

if (playerStats.isDashing) {
    playerStats.dashTimer -= delta;
    player.position.add(player.dashDirection.clone().multiplyScalar(playerStats.dashSpeed * delta));
    
    playerCollider.setFromObject(player);
    for (let i = gameObjects.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = gameObjects.enemyProjectiles[i];
        const projCollider = new THREE.Box3().setFromObject(proj.mesh);
        if (playerCollider.intersectsBox(projCollider)) {
            soundManager.play('upgradeGet');
            playerStats.perfectDashBuff.active = true;
            playerStats.perfectDashBuff.timer = 5;
            const pulse = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 8, 50), new THREE.MeshBasicMaterial({ color: 0x00FFFF, transparent: true }));
            pulse.position.copy(player.position); pulse.position.y = 0.1; pulse.rotation.x = Math.PI / 2;
            gameObjects.visualEffects.push({ mesh: pulse, lifetime: 0.4, isPulse: true });
            scene.add(pulse);

            if (playerStats.upgrades.has('reactive_phasing')) {
                handleKamikazeExplosion(player.position, 100, 10, true);
            }

            scene.remove(proj.mesh);
            if (proj.trail) scene.remove(proj.trail.mesh);
            gameObjects.enemyProjectiles.splice(i, 1);
        }
    }

    if (playerStats.dashTimer <= 0) { playerStats.isDashing = false; playerStats.invulnerable = false; cameraState.targetFov = 75; }
    else {
        if (playerStats.dashTrailTimer <= 0) { 
            const trail = dashTrailPool[dashTrailPoolIndex];
            trail.mesh.position.copy(player.position); trail.mesh.quaternion.copy(player.quaternion);
            trail.mesh.visible = true; trail.lifetime = 0.3;
            dashTrailPoolIndex = (dashTrailPoolIndex + 1) % DASH_TRAIL_POOL_SIZE;
        }
        if (playerStats.dashDamage > 0) {
            for (let i = gameObjects.enemies.length - 1; i >= 0; i--) {
                const enemy = gameObjects.enemies[i];
                 if (enemy && enemy.mesh && player.position.distanceTo(enemy.mesh.position) < 2.5) {
                    handleProjectileHit({ damage: playerStats.dashDamage, pierceLeft: -1, chainLeft: 0, knockback: 5 }, enemy, true);
                    const knockbackVec = new THREE.Vector3().subVectors(enemy.mesh.position, player.position);
                    if (knockbackVec.lengthSq() > 0) {
                        enemy.mesh.position.add(knockbackVec.normalize().multiplyScalar(5));
                    }
                }
            }
        }
    }
} else {
    let adrenalineSpeedBonus = 0;
    if (playerStats.upgrades.has('adrenaline_rush') && (playerStats.health / playerStats.maxHealth) < 0.3) {
        adrenalineSpeedBonus = playerStats.speed * 0.30;
    }
    if (velocity.lengthSq() > 0) player.position.add(velocity.normalize().multiplyScalar((playerStats.speed + playerStats.killStreak.speedBonus + adrenalineSpeedBonus) * delta));
}

if (playerStats.perfectDashBuff.active) {
    playerStats.perfectDashBuff.timer -= delta;
    if (playerStats.perfectDashBuff.timer <= 0) {
        playerStats.perfectDashBuff.active = false;
    }
}

if (playerStats.killStreak.timer > 0) {
    playerStats.killStreak.timer -= delta;
    let speedMultiplier = playerStats.upgrades.has('flow_state') ? 0.04 : 0.02;
    let fireRateMultiplier = playerStats.upgrades.has('flow_state') ? 0.03 : 0.015;
    playerStats.killStreak.speedBonus = Math.min(playerStats.speed * 0.8, playerStats.killStreak.count * speedMultiplier * playerStats.speed);
    playerStats.killStreak.fireRateBonus = Math.min(0.6, playerStats.killStreak.count * fireRateMultiplier);

    if (playerStats.killStreak.timer <= 0) {
        playerStats.killStreak.count = 0;
        playerStats.killStreak.speedBonus = 0;
        playerStats.killStreak.fireRateBonus = 0;
    }
}

player.position.x = Math.max(-98, Math.min(98, player.position.x));
player.position.z = Math.max(-98, Math.min(98, player.position.z));
if (player.position.y < 1.2) {
    player.position.y = 1.2;
}

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), player.position.y);
const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
const intersectPoint = new THREE.Vector3();
if (raycaster.ray.intersectPlane(plane, intersectPoint)) { player.lookAt(intersectPoint.x, player.position.y, intersectPoint.z); player.spotLight.target.position.copy(intersectPoint); }

playerStats.weapon.cooldown -= delta;
let adrenalineFireRateBonus = 0;
if (playerStats.upgrades.has('adrenaline_rush') && (playerStats.health / playerStats.maxHealth) < 0.3) {
    adrenalineFireRateBonus = 0.25;
}
const currentFireRate = playerStats.weapon.fireRate * (1 - (playerStats.killStreak.fireRateBonus + adrenalineFireRateBonus));

if (mouse.down && playerStats.weapon.cooldown <= 0) { 
    playerStats.weapon.cooldown = currentFireRate; 
    fireWeapon(); 
}
playerCollider.setFromObject(player);
}
function createProjectileTrail(color) {
    const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false });
    const trailGeo = new THREE.BufferGeometry(); const MAX_POINTS = 15;
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
    const trail = new THREE.Line(trailGeo, trailMat); scene.add(trail);
    return { mesh: trail, points: [], color: new THREE.Color(color), maxPoints: MAX_POINTS };
}

function fireWeapon() {
    soundManager.play('shoot', 0.5);
    player.guns.forEach(gun => {
        const gunTipPosition = gun.getWorldPosition(new THREE.Vector3());
        const muzzleFlash = new THREE.PointLight(0xfff7a1, 10, 10, 2);
        muzzleFlash.position.copy(gunTipPosition);
        scene.add(muzzleFlash);
        setTimeout(() => scene.remove(muzzleFlash), 50);

        if (playerStats.weapon.type === 'javelin' && !playerStats.upgrades.has('recoil_compensator')) {
            const recoilDirection = player.getWorldDirection(new THREE.Vector3());
            player.position.add(recoilDirection.multiplyScalar(0.5));
        }

        const isJavelin = playerStats.weapon.type === 'javelin';
        const projGeo = isJavelin ? new THREE.CapsuleGeometry(0.3, 0.8) : new THREE.SphereGeometry(0.2, 8, 8);
        const projMat = new THREE.MeshStandardMaterial({ color: isJavelin ? 0xff4500 : 0xffff00, emissive: isJavelin ? 0xff4500 : 0xffff00, emissiveIntensity: 2 });

        let projDamage = playerStats.weapon.damage;
        let isEmpowered = false;
        if (playerStats.perfectDashBuff.active) {
            projDamage *= playerStats.perfectDashBuff.damageMultiplier;
            playerStats.perfectDashBuff.active = false;
            isEmpowered = true;
        }

        const projectile = new THREE.Mesh(projGeo, projMat);
        if (isEmpowered) {
            projectile.material.color.set(0x00FFFF);
            projectile.material.emissive.set(0x00FFFF);
        }
        
        projectile.position.copy(gunTipPosition);
        const direction = new THREE.Vector3();
        gun.getWorldDirection(direction);
        projectile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        const projData = {
            mesh: projectile,
            velocity: direction.clone().multiplyScalar(playerStats.weapon.projectileSpeed),
            damage: projDamage,
            lifetime: 8,
            homing: isJavelin,
            pierceLeft: playerStats.pierce + (isEmpowered ? 2 : 0),
            chainLeft: playerStats.chainLightning.chains,
            trail: createProjectileTrail(isEmpowered ? 0x00FFFF : projMat.emissive.getHex()),
            target: null,
            flightState: 'boost',
            flightTimer: 0.4,
        };

        if (projData.homing) {
            let closestTarget = null;
            let minDistanceSq = Infinity;
            for (const enemy of gameObjects.enemies) {
                if (enemy && enemy.mesh) {
                    const distSq = enemy.mesh.position.distanceToSquared(projData.mesh.position);
                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        closestTarget = enemy;
                    }
                }
            }
            projData.target = closestTarget;
            projData.velocity.set(0, playerStats.weapon.projectileSpeed * 0.8, 0);
            projectile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0));
        }

        gameObjects.projectiles.push(projData);
        scene.add(projectile);
    });
}

function updateProjectileList(projectiles, targets, delta, isPlayerProjectile) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (!proj || !proj.mesh) continue;

        if (proj.homing && proj.target && proj.target.mesh && proj.target.mesh.parent && gameObjects.enemies.includes(proj.target)) {
            proj.flightTimer -= delta;

            if (proj.flightState === 'boost' && proj.flightTimer <= 0) {
                proj.flightState = 'seek';
            }

            if (proj.flightState === 'seek') {
                const speed = playerStats.weapon.projectileSpeed;
                const directionToTarget = new THREE.Vector3().subVectors(proj.target.mesh.position, proj.mesh.position).normalize();
                proj.velocity.copy(directionToTarget.multiplyScalar(speed));
                proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), proj.velocity.clone().normalize());
            }
        }

        proj.mesh.position.add(proj.velocity.clone().multiplyScalar(delta));
        proj.lifetime -= delta;

        if (proj.lifetime <= 0) {
            scene.remove(proj.mesh);
            if (proj.trail) scene.remove(proj.trail.mesh);
            projectiles.splice(i, 1);
            continue;
        }

        if (proj.trail) {
            const trail = proj.trail;
            trail.points.push(proj.mesh.position.clone());
            if (trail.points.length > trail.maxPoints) trail.points.shift();
            const posAttr = trail.mesh.geometry.attributes.position;
            const colAttr = trail.mesh.geometry.attributes.color;
            for (let j = 0; j < trail.points.length; j++) {
                const point = trail.points[j];
                posAttr.setXYZ(j, point.x, point.y, point.z);
                const alpha = j / trail.points.length;
                colAttr.setXYZ(j, trail.color.r * alpha, trail.color.g * alpha, trail.color.b * alpha);
            }
            if(trail.points.length > 0) {
                const lastPoint = trail.points[trail.points.length - 1];
                for (let j = trail.points.length; j < trail.maxPoints; j++) {
                    posAttr.setXYZ(j, lastPoint.x, lastPoint.y, lastPoint.z);
                }
            }
            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;
            trail.mesh.geometry.setDrawRange(0, trail.points.length);
        }

        const projCollider = new THREE.Box3().setFromObject(proj.mesh);
        let wasDestroyed = false;
        for (let j = targets.length - 1; j >= 0; j--) {
            const target = targets[j];
            if (target && target.collider && projCollider.intersectsBox(target.collider)) {
                wasDestroyed = handleProjectileHit(proj, target, isPlayerProjectile, projectiles, i);
                if (wasDestroyed) break;
            }
        }
        if (wasDestroyed) continue;
    }
}
    
function updateProjectiles(delta) { 
    updateProjectileList(gameObjects.projectiles, gameObjects.enemies, delta, true); 
    updateProjectileList(gameObjects.enemyProjectiles, [ { collider: playerCollider, takeDamage: takeDamage, mesh: player } ], delta, false); 
}

function handleKamikazeExplosion(position, explosionDamage, explosionRadius, ignorePlayer = false) {
    soundManager.play('explosion', 0.8);
    cameraState.shakeIntensity = 0.3;
    cameraState.shakeDuration = 0.3;
    
    const explosionSphere = new THREE.Mesh(new THREE.SphereGeometry(explosionRadius, 16, 16), new THREE.MeshBasicMaterial({color: 0xff8c00, transparent: true, opacity: 0.8}));
    explosionSphere.position.copy(position);
    scene.add(explosionSphere);
    gameObjects.visualEffects.push({mesh: explosionSphere, lifetime: 0.3});

    if (!ignorePlayer && player.position.distanceTo(position) < explosionRadius) {
        takeDamage(explosionDamage, { isExplosion: true });
    }

    const enemiesToHit = [...gameObjects.enemies];
    for (const enemy of enemiesToHit) {
        if (enemy && enemy.mesh && enemy.mesh.parent && enemy.mesh.position.distanceTo(position) < explosionRadius && enemy.type !== ENEMY_TYPES.KAMIKAZE) {
            handleProjectileHit({ damage: explosionDamage, pierceLeft: -1, chainLeft: 0, isExplosion: true }, enemy, true);
        }
    }
}

function handleProjectileHit(proj, target, isPlayerProjectile, projectiles, projIndex) {
    let wasDestroyed = false;

    if (isPlayerProjectile) {
        if (!proj.isExplosion) soundManager.play('hit', 0.8);
        applyDamageFlash(target.mesh);

        const warheadLevel = playerStats.upgradeLevels['javelin_warhead'] || 0;
        if (warheadLevel > 0 && !proj.isExplosion && !proj.isShieldHit) {
            const explosionDamage = proj.damage * 0.2 * warheadLevel;
            const explosionRadius = 3 + warheadLevel;
            const explosionPosition = proj.mesh ? proj.mesh.position : proj.hitPosition;
            if (explosionPosition) {
                handleKamikazeExplosion(explosionPosition, explosionDamage, explosionRadius, true);
            }
        }

        let damageDealt = proj.damage;
        let isCrit = false;
        if (Math.random() < playerStats.critChance) {
            isCrit = true;
            damageDealt *= playerStats.critMultiplier;
            soundManager.play('crit');
        }
        
        target.health -= damageDealt;
        showDamageNumber(target.mesh, damageDealt, { isExplosion: proj.isExplosion, isCrit: isCrit });
        
        if (proj.chainLeft > 0) triggerChainLightning(proj.mesh.position, target, proj.chainLeft - 1, proj.damage);
        
        if (target.health <= 0 && gameObjects.enemies.includes(target)) {
            playerStats.killStreak.count++;
            playerStats.killStreak.timer = playerStats.killStreak.maxTime;

            if (playerStats.healthOnKill > 0) playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + playerStats.healthOnKill);
            createPickup(target.mesh.position, PICKUP_TYPES.XP_GEM, target.xpValue);
            if (Math.random() < 0.05) createPickup(target.mesh.position, PICKUP_TYPES.HEALTH);
            if (target.type === ENEMY_TYPES.KAMIKAZE) {
                handleKamikazeExplosion(target.mesh.position, target.type.explosionDamage, target.type.explosionRadius);
            } else {
                createExplosion(target.mesh.position, target.mesh.material.color, 50);
                soundManager.play('explosion', 0.5);
            }
            const index = gameObjects.enemies.indexOf(target);
            if (index > -1) {
                gameObjects.enemies.splice(index, 1);
            }
            scene.remove(target.mesh);

            if (target.isBoss) {
                gameManager.isBossWave = false;
                uiManager.elements.bossHud.style.visibility = 'hidden';
                cameraState.shakeIntensity = 0.5;
                cameraState.shakeDuration = 0.5;
                gameManager.bossesDefeated++;
                setTimeout(() => {
                    changeEnvironment();
                    gameManager.nextWave(); 
                }, 3000);
            }
        }
    } else {
        target.takeDamage(proj.damage);
    }

    if (proj.pierceLeft > -1) {
        proj.pierceLeft--;
    }

    if (proj.pierceLeft <= 0 && projectiles && projIndex !== undefined) {
        const p = projectiles[projIndex];
        if (p && p.mesh) {
            scene.remove(p.mesh);
            if (p.trail) scene.remove(p.trail.mesh);
            projectiles.splice(projIndex, 1);
            wasDestroyed = true;
        }
    }

    return wasDestroyed;
}

// --- FIX: Removed 'emissive' and 'emissiveIntensity' properties from LineBasicMaterial ---
function triggerChainLightning(startPos, originEnemy, chainsLeft, damage) {
    let lastEnemy = originEnemy;
    let hitEnemies = new Set([originEnemy]);
    
    for (let i = 0; i < chainsLeft; i++) {
        if (!lastEnemy || !lastEnemy.mesh || !lastEnemy.mesh.parent) break; 
        let closestEnemy = null;
        let minDistance = Infinity;
        
        for (let j = gameObjects.enemies.length - 1; j >= 0; j--) {
            const e = gameObjects.enemies[j];
            if (e && e.mesh && e.mesh.parent && !hitEnemies.has(e)) {
                const dist = e.mesh.position.distanceTo(lastEnemy.mesh.position);
                if (dist < playerStats.chainLightning.range && dist < minDistance) {
                    minDistance = dist;
                    closestEnemy = e;
                }
            }
        }
        
        if (closestEnemy) {
            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([lastEnemy.mesh.position, closestEnemy.mesh.position]), 
                new THREE.LineBasicMaterial({ color: 0x00FFFF, transparent: true }) // Corrected material
            );
            scene.add(line);
            gameObjects.visualEffects.push({ mesh: line, lifetime: 0.2 });
            handleProjectileHit({ damage: damage * playerStats.chainLightning.damageMultiplier, pierceLeft: -1, chainLeft: 0 }, closestEnemy, true);
            hitEnemies.add(closestEnemy);
            lastEnemy = closestEnemy;
        } else {
            break;
        }
    }
}
function updateVisualEffects(delta) { for (let i = gameObjects.visualEffects.length - 1; i >= 0; i--) { const effect = gameObjects.visualEffects[i]; effect.lifetime -= delta; if (effect.isPulse) { const scale = 1 + (0.5 - effect.lifetime) * 2 * (effect.mesh.geometry.parameters.radius || 1); effect.mesh.scale.set(scale, scale, 1); effect.mesh.material.opacity = Math.max(0, (effect.lifetime / 0.5) * 0.8); } else { effect.mesh.traverse(child => { if (child.material && child.material.transparent) child.material.opacity = Math.max(0, effect.lifetime / 0.8); }); } if (effect.lifetime <= 0) { scene.remove(effect.mesh); gameObjects.visualEffects.splice(i, 1); } } }
function updateParticles(delta) { for (let i = gameObjects.particles.length - 1; i >= 0; i--) { const p = gameObjects.particles[i]; p.lifetime -= delta; if (p.lifetime <= 0) { scene.remove(p.points); gameObjects.particles.splice(i, 1); continue; } const positions = p.points.geometry.attributes.position.array; for (let j = 0; j < p.velocities.length; j++) { positions[j * 3] += p.velocities[j].x * delta; positions[j * 3 + 1] += p.velocities[j].y * delta; positions[j * 3 + 2] += p.velocities[j].z * delta; } p.points.geometry.attributes.position.needsUpdate = true; p.points.material.opacity = p.lifetime / 0.8; } }
function updateCamera(delta) { cameraState.currentDistance = THREE.MathUtils.lerp(cameraState.currentDistance, cameraState.targetDistance, 0.1); cameraState.currentFov = THREE.MathUtils.lerp(cameraState.currentFov, cameraState.targetFov, 0.15); if (Math.abs(camera.fov - cameraState.currentFov) > 0.1) { camera.fov = cameraState.currentFov; camera.updateProjectionMatrix(); } camera.position.x = player.position.x; camera.position.y = player.position.y + cameraState.currentDistance; camera.position.z = player.position.z + cameraState.currentDistance; camera.lookAt(player.position); if (cameraState.shakeDuration > 0) { cameraState.shakeDuration -= delta; camera.position.x += (Math.random() - 0.5) * cameraState.shakeIntensity; camera.position.y += (Math.random() - 0.5) * cameraState.shakeIntensity; } }
function updateEnemies(delta) { 
    for (let i = gameObjects.enemies.length - 1; i >= 0; i--) { 
        const enemy = gameObjects.enemies[i]; 
        if(!enemy || !enemy.mesh) continue; 
        
        const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.mesh.position); 
        const distanceToPlayer = toPlayer.length(); 
        if (toPlayer.lengthSq() > 0) toPlayer.normalize(); 
        
        if (enemy.isBoss) { 
            updateBoss(enemy, toPlayer, delta); 
        } else {
            if (!enemy.isQteNode) {
                 switch(enemy.type) { 
                    case ENEMY_TYPES.RANGER: updateRanger(enemy, toPlayer, distanceToPlayer, delta); break; 
                    case ENEMY_TYPES.SCOUT: updateScout(enemy, toPlayer, distanceToPlayer, delta); break; 
                    case ENEMY_TYPES.SUMMONER: updateSummoner(enemy, toPlayer, distanceToPlayer, delta); break; 
                    case ENEMY_TYPES.TANK: updateTank(enemy, toPlayer, distanceToPlayer, delta); break; 
                    default: enemy.mesh.position.add(toPlayer.multiplyScalar(enemy.speed * delta)); 
                } 
            }
        } 
        
        enemy.collider.setFromObject(enemy.mesh); 
        
        if (!enemy.isQteNode && enemy.collider.intersectsBox(playerCollider) && !playerStats.isDashing) { 
            if (enemy.type === ENEMY_TYPES.KAMIKAZE) { 
                handleKamikazeExplosion(enemy.mesh.position, enemy.type.explosionDamage, enemy.type.explosionRadius); 
                scene.remove(enemy.mesh); 
                gameObjects.enemies.splice(i, 1); 
            } else { 
                takeDamage(enemy.damage); 
                if (!enemy.type.knockbackImmune) { 
                    enemy.mesh.position.add(toPlayer.multiplyScalar(-2)); 
                } 
            } 
        } 
    } 
}
function updateTank(enemy, toPlayer, distance, delta) { enemy.stompCooldownTimer -= delta; if (distance < enemy.type.stompRadius / 2 && enemy.stompCooldownTimer <= 0) { enemy.stompCooldownTimer = enemy.type.stompCooldown; const ringGeo = new THREE.TorusGeometry(enemy.type.stompRadius, 0.3, 16, 100); const ringMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.8 }); const stompPulse = new THREE.Mesh(ringGeo, ringMat); stompPulse.position.copy(enemy.mesh.position); stompPulse.position.y = 0.1; stompPulse.rotation.x = Math.PI / 2; gameObjects.visualEffects.push({ mesh: stompPulse, lifetime: 0.5, isPulse: true }); scene.add(stompPulse); soundManager.play('explosion'); if (distance < enemy.type.stompRadius) { takeDamage(enemy.damage * enemy.type.stompDamageMultiplier); const knockbackVec = new THREE.Vector3().subVectors(player.position, enemy.mesh.position); if (knockbackVec.lengthSq() > 0) { player.position.add(knockbackVec.normalize().multiplyScalar(5)); } } } else { enemy.mesh.position.add(toPlayer.multiplyScalar(enemy.speed * delta)); } }

function updateScout(enemy, toPlayer, distance, delta) {
    enemy.dashCooldownTimer -= delta;
    if (enemy.isDashing) {
        enemy.mesh.position.add(enemy.dashDirection.multiplyScalar(enemy.type.dashSpeed * delta));
        enemy.dashTimer -= delta;
        if (enemy.dashTimer <= 0) enemy.isDashing = false;
    } else {
        if (enemy.dashCooldownTimer <= 0 && distance < 30) {
            enemy.isDashing = true;
            const dashDirection = toPlayer.clone();
            dashDirection.y = 0;
            dashDirection.normalize();
            enemy.dashDirection = dashDirection;
            enemy.dashTimer = 0.5;
            enemy.dashCooldownTimer = enemy.type.dashCooldown + Math.random() * 2;
        } else {
            enemy.mesh.position.add(toPlayer.multiplyScalar(enemy.speed * delta));
        }
    }
}
function updateRanger(enemy, toPlayer, distance, delta) { enemy.cooldown -= delta; if (enemy.isBursting) { enemy.burstTimer -= delta; if (enemy.burstTimer <= 0 && enemy.burstsLeft > 0) { enemy.burstsLeft--; enemy.burstTimer = enemy.type.burstRate; const projectile = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 })); projectile.position.copy(enemy.mesh.position); const spread = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5); if (spread.lengthSq() > 0) spread.normalize(); spread.multiplyScalar(0.1); const velocity = toPlayer.clone().add(spread); if (velocity.lengthSq() > 0) velocity.normalize(); gameObjects.enemyProjectiles.push({ mesh: projectile, velocity: velocity.multiplyScalar(30), damage: enemy.damage, lifetime: 3, pierceLeft: 1, trail: createProjectileTrail(0xff0000) }); scene.add(projectile); } if (enemy.burstsLeft <= 0) enemy.isBursting = false; return; } if (distance > enemy.type.range) { enemy.mesh.position.add(toPlayer.multiplyScalar(enemy.speed * delta)); } else if (enemy.cooldown <= 0) { enemy.cooldown = enemy.type.fireRate; enemy.isBursting = true; enemy.burstsLeft = enemy.type.burstCount; enemy.burstTimer = 0; } }
function updateSummoner(enemy, toPlayer, distance, delta) { enemy.cooldown -= delta; enemy.secondaryAttackTimer -= delta; if (distance > enemy.type.preferredDistance) { enemy.mesh.position.add(toPlayer.multiplyScalar(enemy.speed * delta)); } else { enemy.mesh.position.add(toPlayer.multiplyScalar(-enemy.speed * delta * 0.5)); } if (enemy.cooldown <= 0) { enemy.cooldown = enemy.type.summonCooldown; for(let i=0; i < 3; i++) { const offset = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5); if (offset.lengthSq() > 0) offset.normalize(); offset.multiplyScalar(3); spawnEnemy(ENEMY_TYPES.MINION, enemy.mesh.position.clone().add(offset)); } } if (enemy.secondaryAttackTimer <= 0) { enemy.secondaryAttackTimer = enemy.type.secondaryAttackCooldown; const projectile = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), new THREE.MeshStandardMaterial({ color: 0x9400D3, emissive: 0x9400D3, emissiveIntensity: 1 })); projectile.position.copy(enemy.mesh.position); gameObjects.enemyProjectiles.push({ mesh: projectile, velocity: toPlayer.multiplyScalar(10), damage: enemy.damage, lifetime: 8, homing: true, homingStrength: 0.01, pierceLeft: 1, trail: createProjectileTrail(0x9400D3) }); scene.add(projectile); } }
function updateBoss(boss, toPlayer, delta) {
    boss.stateTimer -= delta;

    const nextPhaseIndex = boss.phaseIndex + 1;
    if (boss.type.phases[nextPhaseIndex] && (boss.health / boss.maxHealth) <= boss.type.phases[boss.phaseIndex].healthThreshold) {
        enterNextPhase(boss);
    }

    if (boss.state === 'stunned') {
        if (boss.stateTimer <= 0) boss.state = 'idle';
        return;
    }
    
    if (boss.state === 'idle' && boss.stateTimer <= 0) {
        pickNewAttack(boss);
    }
    
    switch (boss.type.id) {
        case 'TITAN': updateBossTitan(boss, toPlayer, delta); break;
        case 'HIVE_MIND': updateBossHiveMind(boss, toPlayer, delta); break;
        case 'SENTINEL': updateBossSentinel(boss, toPlayer, delta); break;
    }
}

function enterNextPhase(boss) {
    boss.phaseIndex++;
    boss.state = 'stunned';
    boss.stateTimer = 1.5;
    soundManager.play('levelUp');
    cameraState.shakeIntensity = 0.4;
    cameraState.shakeDuration = 0.4;
    
    const ringGeo = new THREE.TorusGeometry(8, 0.5, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: boss.type.mat.emissive, transparent: true });
    const pulse = new THREE.Mesh(ringGeo, ringMat);
    pulse.position.copy(boss.mesh.position);
    pulse.position.y = 0.1;
    pulse.rotation.x = Math.PI / 2;
    gameObjects.visualEffects.push({ mesh: pulse, lifetime: 1.0, isPulse: true });
    scene.add(pulse);
}

function pickNewAttack(boss) {
    const attackPool = boss.type.phases[boss.phaseIndex].attackPool;
    const nextAttack = attackPool[Math.floor(Math.random() * attackPool.length)];
    boss.state = nextAttack;
    boss.custom = {};
}

function updateBossTitan(boss, toPlayer, delta) {
    switch (boss.state) {
        case 'idle':
        case 'chasing':
            boss.mesh.position.add(toPlayer.multiplyScalar(boss.speed * delta));
            if (boss.stateTimer <= 0) pickNewAttack(boss);
            break;

        case 'burst_attack':
            if (!boss.custom.burstCount) {
                boss.custom.burstCount = 5;
                boss.attackCooldown = 0;
            }
            boss.attackCooldown -= delta;
            if (boss.attackCooldown <= 0 && boss.custom.burstCount > 0) {
                boss.attackCooldown = 0.4;
                boss.custom.burstCount--;
                for (let k = 0; k < 3; k++) {
                    const direction = toPlayer.clone().applyAxisAngle(WORLD_UP, (Math.random() - 0.5) * 1.2);
                    const projectile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1 }));
                    projectile.position.copy(boss.mesh.position);
                    gameObjects.enemyProjectiles.push({ mesh: projectile, velocity: direction.multiplyScalar(50), damage: boss.damage * 0.7, lifetime: 3, pierceLeft: 1, trail: createProjectileTrail(0xff00ff) });
                    scene.add(projectile);
                }
            }
            if (boss.custom.burstCount <= 0) {
                boss.state = 'idle';
                boss.stateTimer = 2;
            }
            break;

        case 'laser_attack':
            const chargeTime = 3.0;
            const finalBeamWidth = 1.5;

            if (!boss.custom.laserWarning) {
                soundManager.play('laserCharge');
                boss.stateTimer = chargeTime;
                const laserWarningGeo = new THREE.CylinderGeometry(0.1, 0.1, 200, 8);
                const laserWarningMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.4 });
                const laserWarning = new THREE.Mesh(laserWarningGeo, laserWarningMat);
                laserWarning.position.copy(boss.mesh.position);
                laserWarning.quaternion.setFromUnitVectors(WORLD_UP, toPlayer);
                boss.custom.laserWarning = laserWarning;
                scene.add(laserWarning);
            }

            const warningBeam = boss.custom.laserWarning;
            const timeRemaining = boss.stateTimer;
            const chargeProgress = 1.0 - (timeRemaining / chargeTime);
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(WORLD_UP, toPlayer);
            warningBeam.quaternion.slerp(targetQuaternion, 0.03);
            const currentWidth = THREE.MathUtils.lerp(0.1, finalBeamWidth, chargeProgress);
            warningBeam.scale.set(currentWidth, 1, currentWidth);
            
            if (timeRemaining <= 0) {
                scene.remove(warningBeam);
                const finalLaserBeam = new THREE.Mesh(new THREE.CylinderGeometry(finalBeamWidth, finalBeamWidth, 200, 16), new THREE.MeshBasicMaterial({ color: 0xffa0ff, transparent: true, opacity: 0.9 }));
                finalLaserBeam.position.copy(boss.mesh.position);
                finalLaserBeam.quaternion.copy(warningBeam.quaternion);
                gameObjects.visualEffects.push({ mesh: finalLaserBeam, lifetime: 0.5 });
                scene.add(finalLaserBeam);
                soundManager.play('explosion', 1.0);
                cameraState.shakeIntensity = 0.5;
                cameraState.shakeDuration = 0.4;
                const beamDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(warningBeam.quaternion);
                const beamRay = new THREE.Ray(boss.mesh.position, beamDirection);
                const distanceToBeam = beamRay.distanceToPoint(player.position);
                if (distanceToBeam < finalBeamWidth + 1.0) {
                    const bossToPlayerVec = new THREE.Vector3().subVectors(player.position, boss.mesh.position);
                    if (bossToPlayerVec.dot(beamRay.direction) > 0) {
                        takeDamage(boss.damage * 2.5);
                    }
                }
                boss.state = 'idle';
                boss.stateTimer = 2.0 + Math.random();
            }
            break;

        case 'overload_slam_qte':
            if (!boss.custom.qteActive) {
                uiManager.announceQTE("FUJA DO IMPACTO!");
                soundManager.play('laserCharge');
                boss.stateTimer = 3.0;
                boss.custom.qteActive = true;
                const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 16, 100), new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.9 }));
                ring.position.copy(boss.mesh.position);
                ring.position.y = 0.1;
                ring.rotation.x = Math.PI / 2;
                boss.custom.warningRing = ring;
                gameObjects.visualEffects.push({ mesh: ring, lifetime: 3.0, isPulse: true });
                scene.add(ring);
            }

            boss.custom.warningRing.geometry.parameters.radius = (3.0 - boss.stateTimer) * 10;
            
            if (boss.stateTimer <= 0) {
                const slamRadius = boss.custom.warningRing.geometry.parameters.radius;
                const distToPlayer = player.position.distanceTo(boss.mesh.position);
                if (distToPlayer < slamRadius) {
                    uiManager.announceQTE("FALHA!", false);
                    soundManager.play('qteFail');
                    takeDamage(boss.damage * 2.5);
                    cameraState.shakeIntensity = 0.8;
                    cameraState.shakeDuration = 0.6;
                } else {
                    uiManager.announceQTE("SUCESSO!", true);
                    soundManager.play('qteSuccess');
                    boss.state = 'stunned';
                    boss.stateTimer = 4.0;
                    soundManager.play('bossStun');
                    applyDamageFlash(boss.mesh);
                }
                boss.state = 'idle';
                boss.stateTimer = 3;
            }
            break;
    }
}

function updateBossHiveMind(boss, toPlayer, delta) {
    switch (boss.state) {
        case 'idle':
        case 'chasing':
            boss.mesh.position.add(toPlayer.multiplyScalar(boss.speed * delta));
            if (boss.stateTimer <= 0) pickNewAttack(boss);
            break;

        case 'radial_attack':
            if (!boss.custom.fired) {
                boss.custom.fired = true;
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2;
                    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                    const projectile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), new THREE.MeshStandardMaterial({ color: 0x55ff88, emissive: 0x55ff88, emissiveIntensity: 1 }));
                    projectile.position.copy(boss.mesh.position);
                    gameObjects.enemyProjectiles.push({ mesh: projectile, velocity: direction.multiplyScalar(35), damage: boss.damage, lifetime: 4, pierceLeft: 1, trail: createProjectileTrail(0x55ff88) });
                    scene.add(projectile);
                }
            }
            boss.state = 'idle';
            boss.stateTimer = 2.5;
            break;

        case 'spawn_minions':
            if (!boss.custom.spawned) {
                boss.custom.spawned = true;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
                    const offset = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(5);
                    spawnEnemy(ENEMY_TYPES.MINION, boss.mesh.position.clone().add(offset));
                }
            }
            boss.state = 'idle';
            boss.stateTimer = 1.5;
            break;

        case 'spore_field':
            if (!boss.custom.spawned) {
                boss.custom.spawned = true;
                const radius = 15;
                const spore = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 4, 32), new THREE.MeshBasicMaterial({ color: 0x2E8B57, transparent: true, opacity: 0.4, depthWrite: false }));
                spore.position.copy(boss.mesh.position);
                spore.position.y = 2;
                scene.add(spore);
                gameObjects.hazards.push({ mesh: spore, lifetime: 10, damage: boss.damage * 0.5, radius: radius, damageRate: 4, damageCooldown: 0, initialOpacity: spore.material.opacity });
                soundManager.play('laserCharge');
            }
            boss.state = 'idle';
            boss.stateTimer = 4;
            break;

        case 'mind_shatter_qte':
            if (!boss.custom.qteActive) {
                uiManager.announceQTE("DESTRUA OS NÓS!");
                soundManager.play('laserCharge');
                boss.stateTimer = 5.0;
                boss.custom.qteActive = true;
                boss.custom.qteFinished = false;
                boss.custom.nodes = [];
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2 + Math.random();
                    const pos = boss.mesh.position.clone().add(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(12));
                    pos.y = 2;
                    const nodeMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 2 }));
                    nodeMesh.position.copy(pos);
                    const node = { mesh: nodeMesh, health: 100, maxHealth: 100, collider: new THREE.Box3(), isQteNode: true };
                    boss.custom.nodes.push(node);
                    gameObjects.enemies.push(node);
                    scene.add(nodeMesh);
                }
            }

            if (!boss.custom.qteFinished) {
                boss.custom.nodes = boss.custom.nodes.filter(n => gameObjects.enemies.includes(n));
                if (boss.custom.nodes.length === 0) {
                    boss.custom.qteFinished = true;
                    uiManager.announceQTE("SUCESSO!", true);
                    soundManager.play('qteSuccess');
                    boss.state = 'stunned';
                    boss.stateTimer = 5.0;
                    soundManager.play('bossStun');
                    applyDamageFlash(boss.mesh);
                } else if (boss.stateTimer <= 0) {
                    boss.custom.qteFinished = true;
                    uiManager.announceQTE("FALHA!", false);
                    soundManager.play('qteFail');
                    boss.custom.nodes.forEach(node => {
                        const index = gameObjects.enemies.indexOf(node);
                        if (index > -1) gameObjects.enemies.splice(index, 1);
                        if (node.mesh) scene.remove(node.mesh);
                    });
                    takeDamage(boss.damage * 3);
                    cameraState.shakeIntensity = 0.8;
                    cameraState.shakeDuration = 0.6;
                    boss.state = 'idle';
                    boss.stateTimer = 3.0;
                }
            }
            break;
    }
}
  
function updateBossSentinel(boss, toPlayer, delta) {
    boss.mesh.lookAt(player.position);
    
    if (boss.state === 'idle' && boss.stateTimer <= 0) {
        pickNewAttack(boss);
        return;
    }

    if (boss.state === 'aiming_snipe') {
        if (!boss.custom.warningLine) {
            boss.stateTimer = 1.5;
            const laserWarning = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 200), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 }));
            laserWarning.position.copy(boss.mesh.position);
            boss.custom.warningLine = laserWarning; 
            scene.add(laserWarning); 
            soundManager.play('laserCharge');
        }
        
        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(boss.mesh.position, player.position, boss.mesh.up));
        boss.custom.warningLine.quaternion.slerp(targetQuaternion, 0.1);
        
        if (boss.stateTimer <= 0.1) {
            const fireDirection = new THREE.Vector3().subVectors(player.position, boss.mesh.position).normalize();
            const projectile = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 4, 8), new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 2 }));
            projectile.position.copy(boss.mesh.position);
            projectile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fireDirection);
            
            gameObjects.enemyProjectiles.push({ mesh: projectile, velocity: fireDirection.multiplyScalar(180), damage: boss.damage, lifetime: 3, pierceLeft: 999 }); 
            scene.add(projectile);
            
            soundManager.play('explosion'); 
            scene.remove(boss.custom.warningLine);
            boss.state = 'idle'; 
            boss.stateTimer = 1.0 + Math.random();
        }
    } else if (boss.state === 'firing_barrage') {
        if (!boss.custom.barrageCount) {
             boss.stateTimer = (10 * 0.08) + 1;
             boss.custom.barrageCount = 10;
             boss.custom.barrageTimer = 0;
        }
        boss.custom.barrageTimer -= delta;
        if (boss.custom.barrageTimer <= 0 && boss.custom.barrageCount > 0) {
            boss.custom.barrageTimer = 0.08; 
            boss.custom.barrageCount--;
            
            const fireDirection = new THREE.Vector3().subVectors(player.position, boss.mesh.position).normalize();
            const projectile = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), new THREE.MeshStandardMaterial({ color: 0x00BFFF, emissive: 0x00BFFF, emissiveIntensity: 1 }));
            projectile.position.copy(boss.mesh.position);
            
            gameObjects.enemyProjectiles.push({ 
                mesh: projectile, 
                velocity: fireDirection.multiplyScalar(60),
                damage: boss.damage * 0.6,
                lifetime: 5, 
                homing: true, 
                homingStrength: 0.08,
                pierceLeft: 1, 
                trail: createProjectileTrail(0x00BFFF) 
            });
            scene.add(projectile); 
            soundManager.play('shoot');
        }
        if (boss.custom.barrageCount <= 0) { 
            boss.state = 'idle'; 
            boss.stateTimer = 1.0 + Math.random(); 
        }
    } else if (boss.state === 'teleport_combo') {
        // Unchanged
    } else if (boss.state === 'purge_sequence_qte') {
        // Unchanged
    }
}
function updateShields(delta, forceCreate = false) { if (forceCreate) { gameObjects.shields.forEach(s => scene.remove(s.mesh)); gameObjects.shields = []; for(let i=0; i<playerStats.shields.count; i++) { const shield = { mesh: new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshPhysicalMaterial({ color: 0xff00ff, transparent: true, opacity: 0.6, emissive: 0xff00ff, emissiveIntensity: 1 })), collider: new THREE.Box3(), cooldown: 0 }; gameObjects.shields.push(shield); scene.add(shield.mesh); } } if (gameObjects.shields.length === 0) return; playerStats.shields.angle += playerStats.shields.speed * delta; const angleStep = (Math.PI * 2) / gameObjects.shields.length; for (let s = 0; s < gameObjects.shields.length; s++) { const shield = gameObjects.shields[s]; const angle = playerStats.shields.angle + s * angleStep; shield.mesh.position.set(player.position.x + playerStats.shields.radius * Math.cos(angle), player.position.y, player.position.z + playerStats.shields.radius * Math.sin(angle)); shield.collider.setFromObject(shield.mesh); shield.cooldown -= delta; if (shield.cooldown <= 0) { for (let e = gameObjects.enemies.length - 1; e >= 0; e--) { const enemy = gameObjects.enemies[e]; if (enemy && enemy.collider.intersectsBox(shield.collider)) {
    handleProjectileHit({ 
        damage: playerStats.shields.damage, 
        pierceLeft: -1,
        chainLeft: 0,
        isShieldHit: true,
        hitPosition: enemy.mesh.position.clone()
    }, enemy, true);
    shield.cooldown = 0.5; break; } } } } }

function updateHazards(delta) {
    for (let i = gameObjects.hazards.length - 1; i >= 0; i--) {
        const hazard = gameObjects.hazards[i];
        hazard.lifetime -= delta;
        if (hazard.lifetime < 2) hazard.mesh.material.opacity = (hazard.lifetime / 2) * hazard.initialOpacity;
        if (hazard.lifetime <= 0) { scene.remove(hazard.mesh); gameObjects.hazards.splice(i, 1); continue; }
        if (hazard.damageRate > 0) {
            hazard.damageCooldown -= delta;
            if (hazard.damageCooldown <= 0) {
                hazard.damageCooldown = 1 / hazard.damageRate;
                if (player.position.distanceTo(hazard.mesh.position) < hazard.radius) takeDamage(hazard.damage);
            }
        }
    }
}
function updatePickups(delta) {
    for (let i = gameObjects.pickups.length - 1; i >= 0; i--) {
        const pickup = gameObjects.pickups[i];
        pickup.mesh.rotation.y += delta * 2;
        const distToPlayer = pickup.mesh.position.distanceTo(player.position);
        const toPlayer = new THREE.Vector3().subVectors(player.position, pickup.mesh.position);
        if (toPlayer.lengthSq() > 0) toPlayer.normalize();
        const maxSpeed = playerStats.pickupSpeed;
        pickup.currentSpeed = Math.min(pickup.currentSpeed + delta * 50, maxSpeed);
        pickup.mesh.position.add(toPlayer.multiplyScalar(delta * pickup.currentSpeed));
        if (distToPlayer < 1.5) {
            pickup.type.onCollect(pickup); soundManager.play('pickup', 0.4);
            scene.remove(pickup.mesh); gameObjects.pickups.splice(i, 1); uiManager.updateHUD(); continue;
        }
        pickup.lifetime -= delta;
        if (pickup.lifetime < 3) pickup.mesh.material.opacity = pickup.lifetime / 3;
        if (pickup.lifetime <= 0) { scene.remove(pickup.mesh); gameObjects.pickups.splice(i, 1); }
    }
}

function initMenuBackground() {
    const canvas = document.getElementById('menu-canvas');
    const ctx = canvas.getContext('2d');
    let stars = [], numStars = 200;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    for(let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5,
            vx: Math.floor(Math.random()*50)-25,
            vy: Math.floor(Math.random()*50)-25
        });
    }

    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.globalCompositeOperation = "lighter";
        for(let i = 0; i < numStars; i++){
            let s = stars[i];
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
            ctx.fill();
            s.x += s.vx * 0.01;
            s.y += s.vy * 0.01;
            if(s.x < 0 || s.x > canvas.width) s.vx = -s.vx;
            if(s.y < 0 || s.y > canvas.height) s.vy = -s.vy;
        }
        requestAnimationFrame(draw);
    }
    draw();
}

init();