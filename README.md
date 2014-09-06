Push notifications
==================

Simple Web Push notifications demo.

See https://curiosity-driven.org/push-notifications for details.

Local
-----

To start locally use:

    npm install
    npm start --gcm_sender_id=ID --gcm_sender_key=KEY

Where ID is project number taken from: https://console.developers.google.com/project
and sender key from: https://console.developers.google.com/project/ABC/apiui/credential

It is necessary to enable Google Cloud Messaging for Chrome and Android:
https://console.developers.google.com/project/ABC/apiui/apiview/googlecloudmessaging/overview
https://console.developers.google.com/project/ABC/apiui/apiview/gcm_for_chrome/overview

Heroku
------

To deploy on Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)
