/**
 * Copyright 2015 Curiosity driven
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
    var user = {
        getToken: function() {
            if ('user.token' in localStorage) {
                return localStorage['user.token'];
            }
            var token = Math.random();
            localStorage['user.token'] = token;
            return token;
        }
    };

    document.getElementById('username').textContent = user.getToken();

    var UI = function(container) {
        var status = container.querySelector('.status');
        var subscribeButton = container.querySelector('.subscribe');
        var unsubscribeButton = container.querySelector('.unsubscribe');
        container.hidden = false;
        var ui = {
            showError: function(error) {
                status.classList.add('failure');
                status.classList.add('icon-cancel');
                status.textContent = error;
            },
            showInfo: function(info) {
                status.classList.add('success');
                status.classList.add('icon-ok');
                status.textContent = info;
            },
            clearInfo: function() {
                status.classList.remove('success');
                status.classList.remove('icon-ok');
                status.classList.remove('failure');
                status.classList.remove('icon-cancel');
                status.textContent = '';
            },
            update: function(subscription) {
                ui.clearInfo();
                if (!subscription) {
                    var noPermission = Notification.permission === 'denied';
                    unsubscribeButton.hidden = true;
                    subscribeButton.hidden = false;
                    subscribeButton.disabled = noPermission;
                    if (noPermission) {
                        ui.showError('Denied permission');
                    }
                } else {
                    ui.showInfo('You are subscribed');
                    subscribeButton.hidden = true;
                    unsubscribeButton.hidden = false;
                    unsubscribeButton.disabled = false;
                }
            },
            onSubscribe: function(callback) {
                subscribeButton.addEventListener('click', callback);
            },
            onUnsubscribe: function(callback) {
                unsubscribeButton.addEventListener('click', callback);
            }
        };
        return ui;
    };

    var subscribePanel = document.querySelector('.subscription');

    if (!subscribePanel) {
        return;
    }

    var ui = UI(subscribePanel);

    if (!('serviceWorker' in navigator)) {
        ui.showError('No ServiceWorkers');
        return;
    }

    if (!('ServiceWorkerRegistration' in window) || !('showNotification' in ServiceWorkerRegistration.prototype)) {
        ui.showError('No Notifications from ServiceWorkers');
        return;
    }

    if (Notification.permission === 'denied') {
        ui.showError('Denied permission');
        return;
    }

    var userToken = btoa(user.getToken() + ':');

    var serviceWorker = navigator.serviceWorker;

    function getEndpoint(subscription) {
        var endpoint = subscription.endpoint;
        // for Chrome 43
        if (endpoint === 'https://android.googleapis.com/gcm/send' &&
            'subscriptionId' in subscription) {
            return endpoint + '/' + subscription.subscriptionId;
        }
        return endpoint;
    }

    function getSubscription() {
        return serviceWorker.ready.then(function(registration) {
            return registration.pushManager.getSubscription();
        });
    }

    function subscribe() {
        return serviceWorker.ready.then(function(registration) {
            return registration.pushManager.subscribe({
                userVisibleOnly: true
            });
        }).then(function(subscription) {
            return fetch('subscriptions/webpush', {
                method: 'put',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + userToken
                },
                body: JSON.stringify({
                    endpoint: getEndpoint(subscription)
                })
            });
        }).then(function(response) {
            if (!response.ok) {
                throw new Error('Subscription error: ' + response.statusText);
            }
        });
    }

    function unsubscribe() {
        return getSubscription().then(function(subscription) {
            return subscription.unsubscribe();
        }).then(function(){
            return fetch('subscriptions/webpush', {
                method: 'delete',
                headers: {
                    'Authorization': 'Basic ' + userToken
                }
            });
        });
    }

    function changeSubscription(action) {
        return function(e) {
            e.target.disabled = true;
            action().catch(function(e) {
                alert('Could not change subscription because: ' + e);
            }).then(getSubscription).then(ui.update);
        };
    }

    ui.onSubscribe(changeSubscription(subscribe));
    ui.onUnsubscribe(changeSubscription(unsubscribe));
    serviceWorker.register('./service-worker.js')
        .then(getSubscription)
        .then(ui.update)
        .catch(function(e) {
            ui.showError('Cannot register ServiceWorker: ' + e);
        });
}());
