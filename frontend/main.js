const ethers = require('ethers');
let clicks = 0;
let isWalletConnected = false;
let timerInterval;
let currentWallet = null;

// Funktion para detectar Ronin Wallet
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
        const oneHour = 60 * 60 * 1000;
        if (now - timestamp < oneHour) {
            isWalletConnected = true;
            currentWallet = address;
            document.getElementById('wallet-address').textContent = `Wallet: ${address}`;
            document.getElementById('connect-wallet').disabled = true;
            document.getElementById('logout').disabled = false;
            document.getElementById('status').textContent = '¡Conectado! Hacé clics en la banana.';
            loadClicks();
            validateWallet(address); // Validar al restaurar sesión
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
        } else {
            clicks = 0;
        }
    } else {
        clicks = 0;
    }
    document.getElementById('clicks').textContent = `Clics: ${clicks}`;
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

// Validar wallet con el backend
async function validateWallet(address) {
    const message = `Login a Banana Clicker - ${Date.now()}`;
    const provider = new ethers.providers.Web3Provider(window.ronin.ethereum || window.ronin.provider);
    const signer = provider.getSigner();
    const signature = await signer.signMessage(message);

    const response = await fetch('http://localhost:3000/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address,
            signature,
            message,
            ip: 'client-ip' // Por ahora un placeholder, lo obtendremos del servidor después
        })
    });

    const result = await response.json();
    if (!result.success) {
        console.error('Validación fallida:', result.error);
        document.getElementById('status').textContent = 'Error al validar wallet.';
        logout(); // Desconectar si falla
    }
}

// Enviar clic al backend
async function registerClick() {
    const response = await fetch('http://localhost:3000/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentWallet })
    });

    const result = await response.json();
    if (!result.success) {
        console.error('Error registrando clic:', result.error);
        document.getElementById('status').textContent = 'Error al registrar clic.';
        return false;
    }
    return true;
}

// Calcular segundos restantes hasta la próxima hora
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

            await validateWallet(address); // Validar con backend

            isWalletConnected = true;
            currentWallet = address;
            document.getElementById('connect-wallet').disabled = true;
            document.getElementById('logout').disabled = false;
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

// Desconectar wallet
function logout() {
    isWalletConnected = false;
    currentWallet = null;
    localStorage.removeItem('bananaClickerSession');
    document.getElementById('wallet-address').textContent = 'Wallet: No conectada';
    document.getElementById('connect-wallet').disabled = false;
    document.getElementById('logout').disabled = true;
    document.getElementById('status').textContent = 'Conectá tu wallet para empezar.';
    clicks = 0;
    document.getElementById('clicks').textContent = `Clics: ${clicks}`;
}

document.getElementById('logout').addEventListener('click', logout);

// Contar clics y mover banana dentro del contenedor
const banana = document.getElementById('banana');
const gameContainer = document.getElementById('game-container');
const containerWidth = gameContainer.offsetWidth - banana.offsetWidth;
const containerHeight = gameContainer.offsetHeight - banana.offsetHeight;

banana.addEventListener('click', async () => {
    if (!isWalletConnected) {
        document.getElementById('status').textContent = 'Conectá tu wallet primero.';
        return;
    }
    const validClick = await registerClick();
    if (!validClick) return;

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