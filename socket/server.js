const env = require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').Server(app);
// const server = http.createServer(app);
// const { Server } = require("socket.io");
const io = require('socket.io')(http); // new Server(server);
const db = require('../utils/jsondb');
const dbsetup = require('../setup.json');
const { info } = require('console');

const UIASimulationRT = require('../simulations/uiasimulation-rt');

let moment = require('moment');
// const evaSimulation = require('../simulations/evasimulation-rt');

let socketStart = new moment();
let clients = [];
let roomDBs = [];

let uiaSim;

app.get('/', (req, res) => {
  res.status(200).send({ ok: true, msg: 'Socket Server Online' });
});

io.on('connection', (socket) => {
    console.log(socket.id);
    console.log('a user connected');
    socket.emit('connected', 'hello there');

    socket.emit('handshake', socket.id);

    // Create a user
    socket.on('register', (data) => {
        
        console.log('data:');
        console.log(data.room);

        if(data.room === undefined && data.room === '') {
            socket.emit(`err`, { ok: false, event: 'register', msg: 'room name required' });
        } else if(data.name === undefined && data.name === '') {
            socket.emit(`err`, { ok: false, event: 'register', msg: 'name required' });
        } else {
            let client = {id: clients.length + 1, siid: socket.id, name: data.name, room: data.room};

            console.log(`--Client Joining Room ${data.room}--`);
            socket.join(data.room); // Join the room
            clients.push(client); // Hold the client in mem
            socket.emit(`register`, client); // Send the client their info
        }
        
    });

    socket.on('uiasim', (data) => {

        console.log(data);
        console.log(roomDBs);

        let client = clients.find( x => x.siid === socket.id);
        console.log(client);
        let roomDB = roomDBs.find( x => x.name === data.room);
        if(roomDB !== undefined) {
            console.log('----------Simulation Start Event Called----------');
            uiaSim = new UIASimulationRT(roomDB);
            io.in(data.room).emit('uiasim', { evt: 'simstart', msg: `Simulation started by - ${client.id}-${client.name}-${client.siid}` });
        } else {
            console.warn(`DB Not found!`);
        }
        // socket.emit('uiasim', 'enabled');
    });

    socket.on('uiatoggle', data => {
        if(data === 'start')
            uiaSim.uiaStart();
    });

    socket.on('heartbeat', data => {
        console.log('Received Heartbeat');
        socket.emit('heartbeat', { ok: true, u: data.siid, t: new moment()});
    });
});

http.listen(3001, () => {
    console.log('listening on *:3001');
    loadConfig();
});

function loadConfig() {
    console.log('Loading database content');

    if(process.env.SUITS_LOG_LEVEL === 2) {
        console.log(`SUITS-TS Configuration::\n${dbsetup}`);
    }

    // Build DB for each room in setup
    dbsetup['rooms'].forEach( async (room, ridx) => {
        console.log(`Creating DB: ${room.name}`);
        roomDBs.push({ 
            uid: room.uid,
            name: room.name, 
            db: await new db(room)
        });

        await Object.keys(dbsetup).forEach(async (key, idx) => {
            if(process.env.SUITS_LOG_LEVEL === 2) {         
                console.log(`Loading data for:: ${key}`);
            }
            if(key !== 'rooms') {
                console.log(db);
                await roomDBs[ridx].db.write(key, dbsetup[key]);
            }
        }); 
        
    });
}

// server.listen(process.env.SUITS_TS_SOCKET_PORT | 3001, () => {
//     //suitsDb = new db(__dirname);
//     loadConfig();
// });

// server.on("connection", (socket) => {
//     console.log('A client joined!');
  
//     // or with emit() and custom event names
//     // socket.emit("greetings", "Hey!", { "ms": "jane" }, Buffer.from([4, 3, 3, 1]));
//     // socket.emit('connect', JSON.stringify({ ok: true, "msg": "Connected!"}));
//     socket.emit('connected', 'Hello from the otherside');
  
//     // handle the event sent with socket.send()
//     socket.on("message", (data) => {
//       console.log(data);
//     });
  
//     // handle the event sent with socket.emit()
//     socket.on("salutations", (elem1, elem2, elem3) => {
//       console.log(elem1, elem2, elem3);
//     });
// });

// server.on("joinroom", (data) => {
//     console.log(data);
// });