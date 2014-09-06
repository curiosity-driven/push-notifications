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

var express = require('express');
var request = require('request');
var basicAuth = require('basic-auth');

if (!option('GCM_SENDER_KEY') || !option('GCM_SENDER_ID')) {
    console.error('Both GCM_SENDER_KEY and GCM_SENDER_ID need to be specified. See README.md');
    process.exit(1);
}

if (option('MONGOLAB_URI')) {
    require('mongodb');
    var monk = require('monk');
    var db = monk(option('MONGOLAB_URI')).get('subscriptions');
} else {
    var Datastore = require('nedb');
    var db = new Datastore({ filename: 'store.db', autoload: true });
}

var app = express();

app.use(express.static(__dirname + '/public'));
app.use(require('body-parser').json());

app.get('/manifest.json', function(req, resp) {
    resp.json({
        name: 'Push notifications',
        short_name: 'Push notifications',
        start_url: '/',
        display: 'standalone',
        gcm_sender_id: option('GCM_SENDER_ID'),
        gcm_user_visible_only: true
    });
});

var auth = function (req, res, next) {
    var user = basicAuth(req);

    if (!user || !user.name) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.status(401);
    }

    return next();
};

app.put('/subscriptions/webpush', auth, function (req, res) {
    db.insert({
        user: basicAuth(req).name,
        data: req.body
    }, function(err) {
        res.status(err ? 500 : 204).send();
    });
});

app.delete('/subscriptions/webpush', auth, function (req, res) {
    db.remove({
        user: basicAuth(req).name
    }, function(err) {
        res.status(err ? 500 : 204).send({ result: 'ok' });
    });
});

var GCM_URL = 'https://android.googleapis.com/gcm/send';

app.post('/notifications', function(req, res) {
    var query = { };
    var user = basicAuth(req);
    if (user && user.name) {
        query.user = user.name;
    }
    db.find(query, function(err, docs) {
        if (err) {
            return res.status(500).send({ error: 'db query failed' });
        }
        var registrationIds = docs.map(function(doc) {
            return doc.data.endpoint;
        }).filter(function(endpoint) {
            return endpoint.indexOf(GCM_URL) === 0;
        }).map(function(endpoint) {
            return endpoint.substring(GCM_URL.length + 1); // plus slash
        });
        if (registrationIds.length === 0) {
            return res.send({ info: 'No registrations.' });
        }
        request.post(GCM_URL, {
            json: {
                registration_ids: registrationIds
            },
            headers: {
                'Authorization': 'key=' + option('GCM_SENDER_KEY'),
                'Content-Type': 'application/json'
            }
        }).pipe(res);
    });
});

function option(name) {
    var env = process.env;
    return env['npm_config_' + name] || env[name.toUpperCase()] || env['npm_package_config_' + name];
}

require('http').createServer(app).listen(option('port'));

console.info('Open: http://localhost:' + option('port'));
