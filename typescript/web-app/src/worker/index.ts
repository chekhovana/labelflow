// Custom service worker code
// See https://github.com/shadowwalker/next-pwa/blob/master/examples/custom-ts-worker/worker/index.ts
import { precacheAndRoute } from "workbox-precaching";

import { server as graphqlServer } from "./graphql-server";
import { server as imageServer } from "./image-server";

declare let self: ServiceWorkerGlobalScope;

// Inject the manifest
// See https://github.com/GoogleChrome/workbox/issues/2519#issuecomment-634164566
// eslint-disable-next-line @typescript-eslint/no-use-before-define
// eslint-disable-next-line no-underscore-dangle
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);

// To disable all workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true
// https://developers.google.com/web/tools/workbox/guides/configure-workbox#disable_logging
//
// self.__WB_DISABLE_DEV_LOGS = true

// Install the listener of the graphql server
graphqlServer.installListener("/worker/graphql");

// Install the listener of the image server
imageServer.installListener("/worker/images");

// listen to message event from window
self.addEventListener("message", (event) => {
  // HOW TO TEST THIS?
  // Run this in your browser console:
  //     window.navigator.serviceWorker.controller.postMessage({command: 'log', message: 'hello world'})
  // OR use next-pwa injected workbox object
  //     window.workbox.messageSW({command: 'log', message: 'hello world'})
  console.log(event?.data);
  if (event?.data?.type === "SKIP_WAITING") {
    console.log("Skip waiting, reload service worker");
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  const data = JSON.parse(event?.data.text() || "{}");
  event?.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: "/static/icon-192x192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event?.notification.close();
  event?.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i += 1) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return self.clients.openWindow("/");
      })
  );
});

// self.addEventListener("install", (/* event */) => {
//   // The promise that skipWaiting() returns can be safely ignored.
//   self.skipWaiting();

//   // Perform any other actions required for your
//   // service worker to install, potentially inside
//   // of event.waitUntil();
// });
