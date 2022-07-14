require('dotenv').config();
const io = require("socket.io-client");
//const { Convert } = require("easy-currencies");
const CC = require("currency-converter-lt");
const log = require("log-to-file");
let Gpio;
if (process.env.DEBUG === "true") {
    Gpio = require("./debug-tools").Gpio;
} else {
    Gpio = require("onoff").Gpio;
}

// you can change this stuff for setup
const WATER_RATE = 0.15; // gallons_per_second
const BUCKET_VOLUME = 2.0; // gallons
const DOLLAR_GOAL = 65.0;

// but don't change these unless something has gone very wrong
const TIME_PER_DOLLAR = BUCKET_VOLUME / (WATER_RATE * DOLLAR_GOAL);
const MS_PER_S = 1000.0;
const opts = {
    reconnect: true,
    transports: ['websocket'],
};

const solenoidCtrl = new Gpio(Number(process.env.PIN_NUM), 'out');
const socket = io.connect('https://realtime.streamelements.com', opts);
const eventQueue = [];
const currencyConverter = new CC();

log("\n\n");
log(`Program starting at ${Date.now()}`);

// set pin high to start (no water flows)
solenoidCtrl.writeSync(1);

socket.on('connect', onConnect);
socket.on('disconnect', onDisconnect);
socket.on('authenticated', onAuthenticated);
socket.on('unauthorized', console.error);

socket.on('event:test', onEventTest);
socket.on('event', onEvent);
processDunks();

async function processDunks() {
    if (eventQueue.length != 0) {
        console.log("Preparing to dispense in 5 seconds");
        await new Promise(r => setTimeout(r, 5000));
        await processNext();
    }
    setTimeout(processDunks);
}

async function processNext() {
    const event = eventQueue.shift();

    const amountUsd = await currencyConverter.from(event.data.currency).to("USD").amount(event.data.amount).convert();
    const duration = amountUsd * TIME_PER_DOLLAR;
    const msg = `${event.data.username} donated $${amountUsd} USD for ${duration} seconds of water`;
    log(msg);
    console.log(msg);

    // set pin low (water flows)
    solenoidCtrl.writeSync(0);
    console.log("starting water");

    await new Promise(r => setTimeout(r, duration * MS_PER_S));

    // set pin high (water stops)
    solenoidCtrl.writeSync(1);
    console.log("ending water");
}

function onEventTest(data) {
    log(`${JSON.stringify(data)}`);
    //console.log('\n');

    log(`New streamelements event: ${data.listener} at ${Date.now()}`);

    if (data.listener == "tip-latest") {
        //for (const instance of data.event) {
        const originalFormat = data.event;
        const newFormat = convertTestToReal(originalFormat);
        eventQueue.push(newFormat);
        //}
    }
}

function onEvent(event) {
    console.log(`${JSON.stringify(event)}`);
    log(`${JSON.stringify(event)}`);

    log(`New streamelements event: ${event.type} at ${Date.now()}`);

    if (event.type == "tip") {
        //for (const instance of data.event) {
            eventQueue.push(event);
        //}
    }
}

function onConnect() {
    console.log('Successfully connected to websocket. Beginning authentication ...');
    socket.emit('authenticate', {method: 'jwt', token: process.env.JWT_TOKEN});
}

function onDisconnect() {
    console.log('Disconnected from websocket.  Should reconnect automatically');
}

function onAuthenticated(data) {
    const {
        channelId
    } = data;
    console.log(`Successfully connected to channel ${channelId}`);
}

async function sleep(seconds) {
    const ms = seconds * MS_PER_S;
    return new Promise(resolve => setTimeout(resolve, ms));
}

function convertTestToReal(originalFormat) {
        return {
            "_id": Math.floor(Math.random()*16777215).toString(16),
            "channel": `${originalFormat.name}'s channel`,
            "type": "tip",
            "provider": "twitch",
            "createdAt": "time",
            "data": {
                "tipId": String(Math.floor(Math.random()*16777215).toString(16)),
                "username": originalFormat.name,
                "amount": originalFormat.amount,
                "currency": "USD",
                "message": originalFormat.message,
                "avatar": "url"
            },
            "updatedAt": "time",
            "activityId": String(Math.floor(Math.random()*16777215).toString(16))
        };
}