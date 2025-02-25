const express = require('express');
const cors = require('cors');
const ethers = require('ethers');
const app = express();
const port = 3000;

// Almacenar IP por wallet (en memoria por ahora)
const walletIps = new Map();

// Habilitar CORS para permitir solicitudes desde el frontend
app.use(cors({
    origin: 'http://127.0.0.1:8080' // Origen de live-server
}));
app.use(express.json());

// Endpoint para validar firma y registrar IP
app.post('/validate', (req, res) => {
    const { address, signature, message, ip } = req.body;

    if (!address || !signature || !message || !ip) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(401).json({ error: 'Firma inválida' });
        }

        const existingIp = walletIps.get(address);
        if (existingIp && existingIp !== ip) {
            return res.status(403).json({ error: 'Esta wallet ya está asociada a otra IP' });
        }

        if (!existingIp) {
            walletIps.set(address, ip);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error validando firma:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Endpoint para registrar clics
app.post('/click', (req, res) => {
    const { address } = req.body;
    if (!walletIps.has(address)) {
        return res.status(401).json({ error: 'Wallet no validada' });
    }
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});