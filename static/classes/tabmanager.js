class TabManager {
    constructor(callback) {
        this.__onloaded = callback;
        this.__eventListeners = new Map();
        this.__tabCommunicationPossible = ('BroadcastChannel' in window);
        if (this.__tabCommunicationPossible) {
            this.__tabID = ~~(Math.random() * 0xffffff);
            this.__bc = new BroadcastChannel('__canvas-tab-com');
            this.__bc.onmessage = this.__receiveBroadcastMessage;
            this.__sendMessage('connectionEstablish', this.__tabID)
            this.__clients = [];
            this.__nClients = ~~localStorage.__nClients + 1;
            this.__parentId = null;
            this.__parent;
            this.__isParent = this.__nClients == 1;

            window.addEventListener('beforeunload', () => {
                if (this.__isParent) {
                    if (this.__nClients == 1) localStorage.__nClients = 0;
                    this.__sendMessage('elevateUser', this.__clients[0]);
                }
                this.__sendMessage('disconnect');
            })
        } else {
            this.__isParent = true;
        };

        const isParent = () => {
            this.__isParent = true;
            this.__socket = io();
            localStorage.__nClients = 1;
            this.__socket.once('connect', () => {
                this.id = this.__socket.id;
                this.__parent = this.__onloaded();
            })
        }

        if (this.__isParent || !this.__tabCommunicationPossible) isParent();
        else {
            this.id = 'UNINITIALISED';
            window.setTimeout(() => {
                if (this.id == 'UNINITIALISED') isParent();
            }, 1000)
        }
    };

    __receiveBroadcastMessage = e => {
        const data = JSON.parse(e.data),
            sender = data.id,
            payload = data.payload;
        switch (data.type) {
            case 'connectionEstablish':
                this.__clients.push(sender);
                ++this.__nClients;
                if (this.__isParent) {
                    localStorage.__nClients = this.__nClients;
                    this.__sendMessage('connectionEstablishmentResponse', { id: this.__socket.id, clients: JSON.stringify(this.__clients) });
                }
                break;
            case 'connectionEstablishmentResponse':
                if (this.id == 'UNINITIALISED') {
                    this.__isParent = false;
                    this.__parentId = sender;
                    this.__clients = JSON.parse(payload.clients);
                    this.id = payload.id;
                    this.__onloaded();
                }
                break;
            case 'userEventEmit':
                if (this.__isParent) {
                    const info = JSON.parse(payload);
                    this.__socket.emit(info.str, info.data);
                }
                break;
            case 'dataReceived':
                const info = JSON.parse(payload);
                this.__eventListeners.get(info.str)(info.data);
                break;
            case 'disconnect':
                this.__clients.splice(this.__clients.indexOf(sender), 1);
                --this.__nClients;
                if (this.__isParent) {
                    localStorage.__nClients = this.__nClients;
                }
                break;
            case 'elevateUser':
                if (payload == this.__tabID) {
                    this.__elevatePriveleges();
                }
                break;
        }
    }

    __sendMessage = (type, data) => this.__bc.postMessage(JSON.stringify({ type: String(type), payload: data, id: this.__tabID }))

    __elevatePriveleges = () => {
        if (this.__isParent) return;
        this.__isParent = true;
        this.__parentId = this.__tabID;

        this.__socket = io();
        this.__socket.once('connect', () => {
            this.id = this.__socket.id;

            const events = Array.from(this.__eventListeners);
            for (let i = 0; i < events.length; ++i) {
                this.on(events[i][0], events[i][1]);
            }
        });
    }

    on = (str, callback) => {
        this.__eventListeners.set(str, callback)
        if (this.__isParent) {
            this.__socket.on(str, data => {
                if (this.__tabCommunicationPossible) this.__sendMessage('dataReceived', JSON.stringify({ str, data }));
                callback(data);
            });
        }
    };
    emit = (str, data) => {
        if (this.__isParent) {
            this.__socket.emit(str, data);
        } else {
            if (this.__tabCommunicationPossible) this.__sendMessage('userEventEmit', JSON.stringify({ str, data }))
        }
    };
    removeListener = str => {
        this.__eventListeners.delete(str);
        if (this.__isParent) {
            this.__socket.removeListener(str);
        }
    }
}