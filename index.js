const io = require("socket.io-client");
const { Convert } = require("easy-currencies");
const log = require("log-to-file");
let Gpio = require("onoff").Gpio;

// you can change this stuff for setup
//const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNjJjYmMyMzI3YWE5NjkwNDA3MDJiNzdhIiwicm9sZSI6Im93bmVyIiwiY2hhbm5lbCI6IjYyY2JjMjMyN2FhOTY5ZGVjNDAyYjc3YiIsInByb3ZpZGVyIjoidHdpdGNoIiwiYXV0aFRva2VuIjoiRVp1alFkd0dVV1BDcXBiYmlXTkVjbkUtVjRIeG10WDUxTlp4aVZGRE5md1ctNm1xIiwiaWF0IjoxNjU3NTI1NTkzLCJpc3MiOiJTdHJlYW1FbGVtZW50cyJ9.O6DnCGp17-Vm7LRaFCBemDGCwPLjJtJFMgWBktfXtcg";
const TOKEN = "";
const PIN_NUM = 26;
const WATER_RATE = 5.0; // gallons
const BUCKET_VOLUME = 0.2; // gallons per second
const DOLLAR_GOAL = 800.0;

// but don't change these unless something has gone very wrong
const TIME_PER_DOLLAR = BUCKET_VOLUME / (WATER_RATE * DOLLAR_GOAL);
const MS_PER_S = 1000.0;
const opts = {
    //reconnect: true,
    transports: ['websocket'],
};

const solenoidCtrl = new Gpio(PIN_NUM, 'out');
const socket = io.connect('https://realtime.streamelements.com', opts);
const eventQueue = [];

log("\n\n");
log(`Program starting at ${Date.now()}`);
// set pin high to start (no water flows)
solenoidCtrl.writeSync(1);
console.log('pin high');

socket.on('connect', onConnect);
socket.on('disconnect', onDisconnect);
socket.on('authenticated', onAuthenticated);
socket.on('unauthorized', console.error);

socket.on('event:test', onEvent);
processDunks();

async function processDunks() {
    if (eventQueue.length != 0) {
        console.log("Preparing to dunk in 5 seconds");
        await new Promise(r => setTimeout(r, 5000));
        await processNext();
    }
    setTimeout(processDunks);
}

async function processNext() {
    const event = eventQueue.shift();

    //const amountUsd = Convert(instance.amount).from(instance.currency).to("USD");
    const amountUsd = event.amount;
    //const duration = amountUsd * TIME_PER_DOLLAR;
    const duration = amountUsd / 5.0;
    //log(`${instance.from} donated ${amountUsd} USD for ${duration} seconds of water`)
    console.log(event.name);

    // set pin low (water flows)
    solenoidCtrl.writeSync(0);
    console.log('pin low');
    console.log("starting dunk");

    await new Promise(r => setTimeout(r, duration * MS_PER_S));

    // set pin high (water stops)
    solenoidCtrl.writeSync(1);
    console.log('pin high');
    console.log("ending dunk");
}

function onEvent(data) {
    //console.log(`${JSON.stringify(data)}`);
    //console.log('\n');

    log(`New streamelements event: ${data.listener} at ${Date.now()}`);

    if (data.listener == "tip-latest") {
        //for (const instance of data.event) {
            eventQueue.push(data.event);
        //}
    }
}

function onConnect() {
    console.log('Successfully connected to websocket. Beginning authentication ...');
    socket.emit('authenticate', {method: 'jwt', token: TOKEN});
}

function onDisconnect() {
    console.log('Disconnected from websocket');
    // attempt to reconnect?
}

function onAuthenticated(data) {
    const {
        channelId
    } = data;
    console.log(`Successfully connected to channel ${channelId}`);
}

function sleep(seconds) {
    const ms = seconds * MS_PER_S;
    return new Promise(resolve => setTimeout(resolve, ms));
}
