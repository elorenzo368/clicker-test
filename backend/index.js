const express = require('express');
const ethers = require('ethers');
const app = express();
const port = 3000;

// Almacenar IP por wallet (en memoria por ahora, luego usaremos una DB)
const walletIps = new Map();

app.use(express.json());

// Endpoint para validar firma y registrar IP
app.post('/validate', (req, res) => {
    const { address, signature, message, ip } = req.body;

    if (!address || !signature || !message || !ip) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    try {
        // Verificar la firma
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(401).json({ error: 'Firma inválida' });
        }

        // Verificar IP
        const existingIp = walletIps.get(address);
        if (existingIp && existingIp !== ip) {
            return res.status(403).json({ error: 'Esta wallet ya está asociada a otra IP' });
        }

        // Registrar IP si no existe
        if (!existingIp) {
            walletIps.set(address, ip);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error validando firma:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Endpoint para registrar clics (placeholder por ahora)
app.post('/click', (req, res) => {
    const { address } = req.body;
    if (!walletIps.has(address)) {
        return res.status(401).json({ error: 'Wallet no validada' });
    }
    // Aquí iría la lógica de clics, por ahora solo confirmamos
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});