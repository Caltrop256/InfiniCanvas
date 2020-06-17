function isClientFocused() {
    return clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then(function (windowClients) {
        var clientIsFocused = false;

        for (var i = 0; i < windowClients.length; i++) {
            const windowClient = windowClients[i];
            if (windowClient.focused) {
                clientIsFocused = true;
                break;
            }
        }

        return clientIsFocused;
    });
}

self.addEventListener('push', function (e) {
    isClientFocused().then(function (isFocused) {
        if (!isFocused) {
            var title = 'InfiniCanvas';
            var options = {
                body: e.data.text(),
                icon: 'https://cdn.caltrop.dev/canvas/favicon.png',
                badge: 'https://cdn.caltrop.dev/canvas/badge.png',
                vibrate: [100, 100],
                tag: '_InfiniCanvasNotif_' + Math.floor(Math.random() * 0xfff),
                timestamp: new Date(),
                actions: [
                    {
                        action: "closeNotif",
                        title: "Close"
                    }
                ]
            };

            self.registration.showNotification(title, options);
        }
    })
});

self.addEventListener('notificationclick', function (e) {
    var urlToOpen = new URL('https://canvas.caltrop.dev:5000/', self.location.origin).href;
    var action = e.action;
    var notification = e.notification;

    notification.close();

    if (action !== 'close' && action !== 'closeNotif') {
        e.waitUntil(clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (windowClients) {
            var matchingClient = null;

            for (var i = 0; i < windowClients.length; i++) {
                var windowClient = windowClients[i];
                if (windowClient.url.startsWith(urlToOpen)) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return clients.openWindow(urlToOpen);
            }
        }))
    }
});