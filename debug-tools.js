class Gpio {
    constructor(pin, type) {
        this.pin = pin;
        this.type = type;
        this.status = 0;
    }

    writeSync(status) {
        console.log('Debug only.  This is only simulating pin control');
        console.log(`Pin ${this.pin} is being set from ${this.status} to ${status}`);
        this.status = status;
    }
}

module.exports = { Gpio }