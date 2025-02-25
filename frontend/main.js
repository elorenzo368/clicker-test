const ethers = require('ethers');
let clicks = 0;
let isWalletConnected = false;
let timerInterval;
let currentWallet = null;

// Función para detectar Ronin Wallet
function isRoninInstalled() {
    const hasRonin = window.ronin && (window.ronin.ethereum || window.ronin.provider);
    return hasRonin;
}

// Verificar y restaurar sesión previa
function checkSession() {
    const sessionData = localStorage.getItem('bananaClickerSession');
    if (sessionData) {
        const { address, timestamp } = JSON.parse(sessionData);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hora en milisegundos
        if (now - timestamp < oneHour) {
            isWalletConnected = true;
            currentWallet = address;
            document.getElementById('wallet-address').textContent = `Wallet: ${address}`;
            document.getElementById('connect-wallet').disabled = true;
            document.getElementById('status').textContent = '¡Conectado! Hacé clics en la banana.';
            loadClicks(); // Cargar clics guardados
        } else {
            localStorage.removeItem('bananaClickerSession');
            resetClicks();
        }
    }
}

// Cargar clics desde localStorage
function loadClicks() {
    const clickData = localStorage.getItem(`bananaClicks_${currentWallet}`);
    if (clickData) {
        const { clicks: savedClicks, hourStart } = JSON.parse(clickData);
        const now = new Date();
        const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
        if (hourStart === currentHour) {
            clicks = savedClicks;
            document.getElementById('clicks').textContent = `Clics: ${clicks}`;
        } else {
            resetClicks();
        }
    }
}

// Guardar clics en localStorage
function saveClicks() {
    if (currentWallet) {
        const now = new Date();
        const hourStart = Math.floor(now.getTime() / (60 * 60 * 1000));
        localStorage.setItem(`bananaClicks_${currentWallet}`, JSON.stringify({
            clicks: clicks,
            hourStart: hourStart
        }));
    }
}

// Resetear clics
function resetClicks() {
    clicks = 0;
    document.getElementById('clicks').textContent = `Clics: ${clicks}`;
    if (currentWallet) {
        saveClicks();
    }
}

// Calcular segundos restantes hasta la próxima hora en punto
function getSecondsUntilNextHour() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const secondsPassed = (minutes * 60) + seconds;
    const secondsInHour = 3600;
    return secondsInHour - secondsPassed;
}

// Formatear tiempo restante
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
}

// Iniciar temporizador global
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    let timeLeft = getSecondsUntilNextHour();
    document.getElementById('timer').textContent = `Tiempo restante: ${formatTime(timeLeft)}`;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = `Tiempo restante: ${formatTime(timeLeft)}`;
        if (timeLeft <= 0) {
            timeLeft = 3600;
            document.getElementById('status').textContent = '¡Hora terminada! Clics reiniciados.';
            resetClicks();
        }
    }, 1000);
}

// Conectar exclusivamente Ronin Wallet
document.getElementById('connect-wallet').addEventListener('click', async () => {
    console.log('Botón clicado, intentando conectar...');
    if (isRoninInstalled()) {
        try {
            const roninProvider = window.ronin.ethereum || window.ronin.provider;
            const provider = new ethers.providers.Web3Provider(roninProvider);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            document.getElementById('wallet-address').textContent = `Wallet: ${address}`;

            const message = `Login a Banana Clicker - ${Date.now()}`;
            const signature = await signer.signMessage(message);
            console.log('Firma:', signature);

            isWalletConnected = true;
            currentWallet = address;
            document.getElementById('connect-wallet').disabled = true;
            document.getElementById('status').textContent = '¡Conectado! Hacé clics en la banana.';

            localStorage.setItem('bananaClickerSession', JSON.stringify({
                address: address,
                timestamp: Date.now()
            }));
            loadClicks();
        } catch (error) {
            console.error('Error conectando Ronin Wallet:', error);
            alert('Error al conectar Ronin Wallet. Revisá la consola.');
        }
    } else {
        alert('Por favor, asegurate de que Ronin Wallet esté instalada, activa y actualizada.');
    }
});

// Contar clics y mover banana dentro del contenedor
const banana = document.getElementById('banana');
const gameContainer = document.getElementById('game-container');
const containerWidth = gameContainer.offsetWidth - banana.offsetWidth;
const containerHeight = gameContainer.offsetHeight - banana.offsetHeight;

banana.addEventListener('click', () => {
    if (!isWalletConnected) {
        document.getElementById('status').textContent = 'Conectá tu wallet primero.';
        return;
    }
    clicks++;
    document.getElementById('clicks').textContent = `Clics: ${clicks}`;
    saveClicks();
    
    if (clicks >= 10000) {
        document.getElementById('status').textContent = '¡Ganaste un ticket! (Próximamente en el contrato)';
        clicks = 0;
        saveClicks();
    }

    const x = Math.random() * containerWidth;
    const y = Math.random() * containerHeight;
    banana.style.left = `${x}px`;
    banana.style.top = `${y}px`;
});

// Iniciar el temporizador y verificar sesión al cargar
startTimer();
checkSession();