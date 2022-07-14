class Queue {
    constructor(storeFile) {
        this.persistStore = storeFile;
        this.localStore = [];
    }

    async loadStored() {
        const stored = await this.persistStore.getItem('queue');
        if (stored instanceof Array) {
            this.localStore = stored;
        }
    }

    async enqueue(elem) {
        this.localStore.push(elem);
        await this.persistStore.updateItem('queue', this.localStore);
    }

    peek() {
        return this.localStore[0];
    }

    async dequeue() {
        let elem = this.localStore.shift();
        await this.persistStore.updateItem('queue', this.localStore);
        return elem;
    }

    length() {
        return this.localStore.length;
    }
}

module.exports = { Queue }