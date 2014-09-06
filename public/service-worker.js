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

function parseFeed(text) {
    function replaceEntities(text) {
        return text
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, '\'')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
    }

    var iconRx = /<icon>([^<]+)<\/icon>/;
    var entryRx = /<entry>([\s\S]*?)<\/entry>/;
    var titleRx = /<title>([^<]+)<\/title>/;
    var summaryRx = /<summary>([^<]+)<\/summary>/;
    var linkRx = /<link href="([^"]+)"/;

    var entry = entryRx.exec(text)[1];

    return {
        icon: replaceEntities(iconRx.exec(text)[1]),
        entry: {
            title: replaceEntities(titleRx.exec(entry)[1]),
            summary: replaceEntities(summaryRx.exec(entry)[1]),
            link: replaceEntities(linkRx.exec(entry)[1])
        }
    };
};

self.addEventListener('push', function(e) {
    e.waitUntil(
      fetch('.')
        .then(function(response) {
            if (!response.ok) {
              throw new Error('Cannot fetch feed.');
            }
            return response.text();
        })
        .then(function(text) {
            var feed = parseFeed(text);
            return self.registration.showNotification('New blog post on Curiosity driven!', {
                body: feed.entry.title + '\n' + feed.entry.summary,
                icon: feed.icon,
                tag: feed.entry.link.replace(/feed$/, 'webpush')
            });
        })
        .catch(function(e) {
            console.error('Error: ', e);
            return self.registration.showNotification('New blog post on Curiosity driven!', {
              body: 'Show list of recent articles.',
              icon: 'https://curiosity-driven.org/icon.png',
              tag: 'https://curiosity-driven.org/#articles'
            });
        })
    );
});

self.addEventListener('notificationclick', function(e) {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.tag));
});
