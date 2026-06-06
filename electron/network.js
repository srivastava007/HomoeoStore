const express = require('express');
const cors = require('cors');
const dgram = require('dgram');
const os = require('os');
const db = require('./database/db');

let mode = 'LOCAL'; // 'LOCAL', 'SERVER', 'CLIENT'
let serverIp = null;
let serverPort = 4000;
let beaconPort = 4001;

let appServer = null;
let beaconInterval = null;
let udpSocket = null;

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        // Skip WSL or VirtualBox adapters if possible
        if (name.toLowerCase().includes('wsl') || name.toLowerCase().includes('vEthernet') || name.toLowerCase().includes('virtual')) continue;
        
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function startServerMode() {
    stopNetwork();
    mode = 'SERVER';
    serverIp = getLocalIp();

    // 1. Start Express Server
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    app.post('/api/:action', async (req, res) => {
        try {
            const action = req.params.action;
            const args = req.body.args || [];
            if (typeof db[action] === 'function') {
                const result = await db[action](...args);
                res.json({ success: true, data: result });
            } else {
                res.status(404).json({ success: false, error: 'Action not found' });
            }
        } catch (error) {
            console.error(`[API Error] ${req.params.action}:`, error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    appServer = app.listen(serverPort, '0.0.0.0', () => {
        console.log(`[Network] Server API listening on port ${serverPort}`);
    });

    // 2. Start UDP Beacon
    udpSocket = dgram.createSocket('udp4');
    udpSocket.on('error', (err) => {
        console.log(`[Network] Beacon socket error:\n${err.stack}`);
        udpSocket.close();
    });

    udpSocket.bind(() => {
        udpSocket.setBroadcast(true);
        beaconInterval = setInterval(() => {
            const msg = Buffer.from(JSON.stringify({
                app: 'HomoeoStore',
                ip: serverIp,
                port: serverPort
            }));
            udpSocket.send(msg, 0, msg.length, beaconPort, '255.255.255.255', (err) => {
                if (err) console.error('[Network] Broadcast error:', err);
            });
        }, 3000);
        console.log(`[Network] Broadcasting beacon on port ${beaconPort}`);
    });
}

function startClientMode() {
    stopNetwork();
    mode = 'CLIENT';
    serverIp = null;

    // Listen for UDP Beacon
    udpSocket = dgram.createSocket('udp4');
    udpSocket.on('message', (msg, rinfo) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.app === 'HomoeoStore' && data.ip) {
                if (serverIp !== data.ip) {
                    serverIp = data.ip;
                    console.log(`[Network] Discovered Server at ${serverIp}`);
                }
            }
        } catch (e) {}
    });

    udpSocket.on('error', (err) => {
        console.log(`[Network] Listener socket error:\n${err.stack}`);
        udpSocket.close();
    });

    udpSocket.bind(beaconPort, '0.0.0.0', () => {
        console.log(`[Network] Listening for beacons on port ${beaconPort}`);
    });
}

function startLocalMode() {
    stopNetwork();
    mode = 'LOCAL';
    serverIp = null;
    console.log('[Network] Running in LOCAL mode');
}

function stopNetwork() {
    if (beaconInterval) clearInterval(beaconInterval);
    if (appServer) appServer.close();
    if (udpSocket) {
        try { udpSocket.close(); } catch(e) {}
    }
    beaconInterval = null;
    appServer = null;
    udpSocket = null;
}

function setMode(newMode) {
    if (newMode === 'SERVER') startServerMode();
    else if (newMode === 'CLIENT') startClientMode();
    else startLocalMode();
    db.setSetting('network_mode', newMode);
}

function init() {
    const savedMode = db.getSetting('network_mode') || 'LOCAL';
    setMode(savedMode);
}

module.exports = {
    init,
    setMode,
    getMode: () => mode,
    getServerIp: () => serverIp,
    getStatus: () => ({
        mode,
        ip: mode === 'SERVER' ? getLocalIp() : serverIp,
        connected: mode === 'LOCAL' || mode === 'SERVER' || (mode === 'CLIENT' && !!serverIp)
    })
};
