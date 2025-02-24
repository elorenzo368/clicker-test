let clicks = 0;

// Función para detectar Ronin Wallet
function isRoninInstalled() {
    // Verificar si window.ronin existe y tiene un proveedor
    const hasRonin = window.ronin && (window.ronin.ethereum || window.ronin.provider);
    console.log('window.ronin existe:', !!window.ronin);
    console.log('window.ronin.ethereum existe:', window.ronin && !!window.ronin.ethereum);
    console.log('window.ronin.provider existe:', window.ronin && !!window.ronin.provider);
    console.log('isRonin en window.ronin:', window.ronin && window.ronin.ethereum && window.ronin.ethereum.isRonin);
    return hasRonin;
}

// Conectar exclusivamente Ronin Wallet
document.getElementById('connect-wallet').addEventListener('click', async () => {
    console.log('Botón clicado, intentando conectar...');
    
    if (isRoninInstalled()) {
        try {
            // Usar window.ronin.ethereum si existe, o window.ronin.provider como fallback
            const roninProvider = window.ronin.ethereum || window.ronin.provider;
            const provider = new ethers.providers.Web3Provider(roninProvider);
            console.log('Proveedor creado con:', roninProvider === window.ronin.ethereum ? 'window.ronin.ethereum' : 'window.ronin.provider');
            
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            document.getElementById('wallet-address').textContent = `Wallet: ${address}`;

            const message = `Login a Banana Clicker - ${Date.now()}`;
            const signature = await signer.signMessage(message);
            console.log('Firma:', signature);
        } catch (error) {
            console.error('Error conectando Ronin Wallet:', error);
            alert('Error al conectar Ronin Wallet. Revisá la consola.');
        }
    } else if (window.ethereum && window.ethereum.isRonin === true) {
        try {
            console.log('Usando window.ethereum como respaldo');
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            document.getElementById('wallet-address').textContent = `Wallet: ${address}`;

            const message = `Login a Banana Clicker - ${Date.now()}`;
            const signature = await signer.signMessage(message);
            console.log('Firma:', signature);
        } catch (error) {
            console.error('Error con window.ethereum:', error);
            alert('Error al conectar con window.ethereum. Revisá la consola.');
        }
    } else {
        console.log('No se detectó Ronin Wallet');
        console.log('window.ethereum existe:', !!window.ethereum);
        console.log('window.ethereum.isRonin:', window.ethereum && window.ethereum.isRonin);
        alert('Por favor, asegurate de que Ronin Wallet esté instalada, activa y actualizada. Desactivá otras wallets como MetaMask si el problema persiste.');
    }
});

// Contar clics y mover banana
const banana = document.getElementById('banana');
banana.addEventListener('click', () => {
    clicks++;
    document.getElementById('clicks').textContent = `Clics: ${clicks}`;
    
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 100);
    banana.style.left = `${x}px`;
    banana.style.top = `${y}px`;
});