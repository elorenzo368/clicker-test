const ethers = require('ethers');
let clicks = 0;
let isWalletConnected = false;
let timerInterval;
let currentWallet = null;
let isValidated = false; // Nueva bandera para validar con backend

function isRoninInstalled() {
    const hasRonin = window.ronin && (window.ronin.ethereum || window.ronin.provider);
    return hasRonin;
}

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
            validateWallet(address).then(() => {
                isValidated = true; // Solo marcamos como validado si pasa el backend
            }).catch(logout); // Si falla la validación, desconectar
        } else {
            localStorage.removeItem('bananaClickerSession');
            resetClicks();
        }
    }
}

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

function saveClicks() {
    if (currentWallet && isValidated) {
        const now = new Date();
        const hourStart = Math.floor(now.getTime() / (60 * 60 * 1000));
        localStorage.setItem(`bananaClicks_${currentWallet}`, JSON.stringify({
            clicks: clicks,
            hourStart: hourStart
        }));
    }
}

function resetClicks() {
    clicks = 0;
    document.getElementById('clicks').textContent = `Clics: ${clicks}`;
    if (currentWallet && isValidated) {
        saveClicks();
    }
}

async function validateWallet(address) {
    const message = `Login a Banana Clicker - ${Date.now()}`;
    const provider = new ethers.providers.Web3Provider(window.ronin.ethereum || window.ronin.provider);
    const signer = provider.getSigner();
    let signature;
    try {
        signature = await signer.signMessage(message);
    } catch (error) {
        if (error.code === 4001) {
            document.getElementById('status').textContent = 'Conexión rechazada por el usuario.';
            throw error; // Lanzar error para que se maneje en el catch superior
        }
        throw error;
    }

    const response = await fetch('http://localhost:3000/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address,
            signature,
            message,
            ip: 'client-ip'
        })
    });

    const result = await response.json();
    if (!result.success) {
        console.error('Validación fallida:', result.error);
        document.getElementById('status').textContent = 'Error al validar wallet: ' + result.error;
        throw new Error('Validación fallida');
    }
}

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

function getSecondsUntilNextHour() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const secondsPassed = (minutes * 60) + seconds;
    const secondsInHour = 3600;
    return secondsInHour - secondsPassed;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
}

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

            await validateWallet(address);

            isWalletConnected = true;
            isValidated = true; // Solo validamos si todo pasa
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
            if (error.code !== 4001) {
                alert('Error al conectar Ronin Wallet. Revisá la consola.');
            }
            logout(); // Reiniciar si hay cualquier error
        }
    } else {
        alert('Por favor, asegurate de que Ronin Wallet esté instalada, activa y actualizada.');
    }
});

function logout() {
    isWalletConnected = false;
    isValidated = false; // Reiniciar validación
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

const banana = document.getElementById('banana');
const gameContainer = document.getElementById('game-container');
const containerWidth = gameContainer.offsetWidth - banana.offsetWidth;
const containerHeight = gameContainer.offsetHeight - banana.offsetHeight;

banana.addEventListener('click', async () => {
    if (!isWalletConnected || !isValidated) { // Bloquear clics si no está validado
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

startTimer();
checkSession();