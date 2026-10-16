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

    // Print polling route (register client printers & return queued jobs)
    app.post('/api/print-poll', async (req, res) => {
        try {
            const { clientIp, printers } = req.body;
            const now = Date.now();
            
            global.connectedClients = global.connectedClients || {};
            global.printQueues = global.printQueues || {};

            // Clean up inactive clients (>15 seconds since last poll)
            for (const ip in global.connectedClients) {
                if (now - global.connectedClients[ip].lastSeen > 15000) {
                    delete global.connectedClients[ip];
                    delete global.printQueues[ip];
                }
            }

            // Register/update active client
            global.connectedClients[clientIp] = {
                lastSeen: now,
                printers: printers || []
            };

            // Retrieve and clear client queue
            const clientQueue = global.printQueues[clientIp] || [];
            global.printQueues[clientIp] = [];

            res.json({ success: true, jobs: clientQueue });
        } catch (err) {
            console.error('[Network print-poll Error]:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // Route print job endpoint for clients sending print jobs to server
    app.post('/api/route-print-job', async (req, res) => {
        try {
            const { receiptData } = req.body;
            if (global.onRoutePrintJob) {
                const result = await global.onRoutePrintJob(receiptData);
                res.json(result);
            } else {
                res.status(500).json({ success: false, error: 'Print router not initialized on Server' });
            }
        } catch (err) {
            console.error('[Network route-print-job Error]:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.post('/api/:action', async (req, res) => {
        try {
            const action = req.params.action;
            const args = req.body.args || [];

            // SECURITY / INTEGRITY GUARD:
            // A remote client must NEVER be allowed to unilaterally switch the Server's active Financial Year!
            // When a client requests selectFinancialYear, ignore the switch and keep the Server's active year,
            // returning success so the old client does not error out.
            if (action === 'selectFinancialYear') {
                console.log(`[Network Guard] Blocked remote selectFinancialYear request (${args[0]}). Server active FY remains: ${db.getCurrentDbName()}`);
                return res.json({ success: true, data: true });
            }

            if (typeof db[action] === 'function') {
                const result = await db[action](...args);
                
                // If the action is a write operation, notify the main process to refresh the UI
                const writeActions = ['add', 'update', 'delete', 'create', 'reset', 'select'];
                if (writeActions.some(prefix => action.startsWith(prefix))) {
                    console.log(`[Network] Database action detected: ${action}`);
                    if (typeof global.onDatabaseChanged === 'function') {
                        console.log(`[Network] Calling global.onDatabaseChanged for: ${action}`);
                        global.onDatabaseChanged(action);
                    } else {
                        console.error(`[Network] global.onDatabaseChanged is undefined!`);
                    }
                }
                
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
    let savedMode = db.getSetting('network_mode') || 'LOCAL';
    
    // Check if installer-specified mode file exists next to the executable
    try {
        const { app } = require('electron');
        const fs = require('fs');
        const path = require('path');
        const modeFilePath = path.join(path.dirname(app.getPath('exe')), 'mode.txt');
        if (fs.existsSync(modeFilePath)) {
            const fileMode = fs.readFileSync(modeFilePath, 'utf8').trim().toUpperCase();
            if (['LOCAL', 'SERVER', 'CLIENT'].includes(fileMode)) {
                console.log(`[Network] Found installer mode file: ${fileMode}`);
                savedMode = fileMode;
                // Update settings table
                db.setSetting('network_mode', fileMode);
            }
        }
    } catch (e) {
        console.error('[Network] Failed to read mode.txt:', e);
    }

    setMode(savedMode);
}

module.exports = {
    init,
    setMode,
    getLocalIp,
    getMode: () => mode,
    getServerIp: () => serverIp,
    getStatus: () => ({
        mode,
        ip: mode === 'SERVER' ? getLocalIp() : serverIp,
        connected: mode === 'LOCAL' || mode === 'SERVER' || (mode === 'CLIENT' && !!serverIp)
    })
};
