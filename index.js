require('dotenv').config();
const io = require("socket.io-client");
//const { Convert } = require("easy-currencies");
const CC = require("currency-converter-lt");
const log = require("log-to-file");
const storage = require('node-persist')
const Queue = require("./queue").Queue;
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

let eventQueue;

const solenoidCtrl = new Gpio(Number(process.env.PIN_NUM), 'out');
const socket = io.connect('https://realtime.streamelements.com', opts);
const currencyConverter = new CC();

main();

async function main() {
    log(`\n\nProgram starting at ${Date.now()}`);
    console.log(`\n\nProgram starting at ${Date.now()}`);
    
    // set pin high to start (no water flows)
    solenoidCtrl.writeSync(1);

    // reload old queue if events are left over
    await storage.init();
    eventQueue = new Queue(storage);
    await eventQueue.loadStored();
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('authenticated', onAuthenticated);
    socket.on('unauthorized', console.error);
    
    socket.on('event:test', onEventTest);
    socket.on('event', onEvent);
    processDunks();
}

async function processDunks() {
    if (eventQueue.length() != 0) {
        await processNext();
    }
    setTimeout(processDunks, 100);
}

async function processNext() {
    const event = eventQueue.peek();

    const amountUsd = await currencyConverter.from(event.data.currency).to("USD").amount(event.data.amount).convert();
    const duration = amountUsd * TIME_PER_DOLLAR;
    const msg = `\n${event.data.username} donated $${amountUsd} USD for ${duration} seconds of water`;
    log(msg);
    console.log(msg);
    const formatter = (time) => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`Preparing to dispense in ${time.toFixed(2)} seconds`);
    };
    await timer(5.0, formatter, 0.1)
    console.log();

    await eventQueue.dequeue();

    // set pin low (water flows)
    solenoidCtrl.writeSync(0);

    const dispenseMsgr = (time) => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`Dispensing water: ${time.toFixed(2)}`);
    }
    await timer(duration, dispenseMsgr, 0.1);
    console.log()

    // set pin high (water stops)
    solenoidCtrl.writeSync(1);
    console.log(`Water for ${event.data.username} finished dispensing`);
}

async function onEventTest(data) {
    log(`Test: ${JSON.stringify(data)}`);
    log(`New streamelements event: ${data.listener}`);

    if (data.listener == "tip-latest") {
        const originalFormat = data.event;
        const newFormat = convertTestToReal(originalFormat);
        await eventQueue.enqueue(newFormat);
    }
}

async function onEvent(event) {
    log(`Real: ${JSON.stringify(event)}`);
    log(`New streamelements event: ${event.type}`);

    if (event.type == "tip") {
        await eventQueue.enqueue(event);
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

async function timer(time, fn, step) {
    fn(time);
    while (time > 0.0001) {
        await new Promise(r => setTimeout(r, step * MS_PER_S));
        return await timer(Math.max(time - step, 0.0), fn, step);
    }
}