const io = require("socket.io-client");
const { Convert } = require("easy-currencies");
const log = require("log-to-file");
var Gpio = require("onoff").Gpio;

// you can change this stuff for setup
const TOKEN = "";
const PIN_NUM = 18;
const WATER_RATE = 5.0; // gallons
const BUCKET_VOLUME = 0.2; // gallons per second
const DOLLAR_GOAL = 800.0;

// but don't change these unless something has gone very wrong
const TIME_PER_DOLLAR = BUCKET_VOLUME / (WATER_RATE * DOLLAR_GOAL);
const MS_PER_S = 1000.0;

const solenoidCtrl = new Gpio(PIN_NUM, 'out');
const socket = io.connect(`https://sockets.streamlabs.com/?token=${TOKEN}`, opts);


log("\n\n");
log(`Program starting at ${Date.now()}`);
// set pin high to start (no water flows)
solenoidCtrl.writeSync(1);

while (true) {
    socket.on("event", event => {
        // This wouldn't be necessary if it weren't for the rogue 'streamlabels' event that is not an array
        let unformatted = event.message instanceof Array ? event.message.pop() : event.message;
    
        // No message? Must be an error, so we skip it because we already do raw emits.
        if(!(unformatted instanceof Object)) {
            log(`Event ${event.event_id} had no ites in its event.message property, skipping.`);
            return;
        }

        log(`New streamlabs event: ${event.type} at ${Date.now()}`);

        if (event.type == "donation") {
            for (const instance of event.message) {
                const amountUsd = await Convert(instance.amount).from(instance.currency).to("USD");
                const duration = amountUsd * TIME_PER_DOLLAR;
                log(`${instance.from} donated ${amountUsd} USD for ${duration} seconds of water`)

                // set pin low (water flows)
                solenoidCtrl.writeSync(0);

                sleep(duration)

                // set pin high (water stops)
                solenoidCtrl.writeSync(1);
            }
        }
    });
}

function sleep(seconds) {
    const ms = seconds * MS_PER_S;
    return new Promise(resolve => setTimeout(resolve, ms));
}