// injected.js
//
// Runs in the page's own JS context (see manifest.json "world": "MAIN").
// This is required: content scripts normally run in an isolated world with
// their own copy of `navigator`, so overriding methods there would never
// affect the page's real calls. Running here means we see what the page
// actually does.
(() => {
  const origin = window.location.origin;
  let started = false;

  function report(perm, state) {
    window.postMessage({ source: 'extenspro', origin, perm, state }, '*');
  }

  function startTracking() {
    if (started) return;
    started = true;

    // Camera / microphone
    if (navigator.mediaDevices?.getUserMedia) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (constraints, ...rest) => {
        return originalGetUserMedia(constraints, ...rest).then(
          (stream) => {
            if (constraints?.video) report('camera', 'granted');
            if (constraints?.audio) report('microphone', 'granted');
            return stream;
          },
          (err) => {
            if (constraints?.video) report('camera', 'denied');
            if (constraints?.audio) report('microphone', 'denied');
            throw err;
          }
        );
      };
    }

    // Notifications
    if (window.Notification) {
      const NativeNotification = window.Notification;
      const originalRequestPermission = NativeNotification.requestPermission.bind(NativeNotification);

      NativeNotification.requestPermission = (...args) =>
        originalRequestPermission(...args).then((result) => {
          report('notifications', result);
          return result;
        });

      const PatchedNotification = function (title, options) {
        report('notifications', NativeNotification.permission);
        return new NativeNotification(title, options);
      };
      PatchedNotification.prototype = NativeNotification.prototype;
      PatchedNotification.permission = NativeNotification.permission;
      PatchedNotification.requestPermission = NativeNotification.requestPermission;
      window.Notification = PatchedNotification;
    }

    // Geolocation
    if (navigator.geolocation) {
      ['getCurrentPosition', 'watchPosition'].forEach((fnName) => {
        const original = navigator.geolocation[fnName].bind(navigator.geolocation);
        navigator.geolocation[fnName] = (successCb, errorCb, options) => {
          return original(
            (pos) => {
              report('geolocation', 'granted');
              successCb?.(pos);
            },
            (err) => {
              report('geolocation', err.code === err.PERMISSION_DENIED ? 'denied' : 'granted');
              errorCb?.(err);
            },
            options
          );
        };
      });
    }

    // Watch the Permissions API directly for changes made outside a JS call
    // (e.g. the user flips a permission in the browser's site settings UI).
    if (navigator.permissions?.query) {
      ['camera', 'microphone', 'geolocation', 'notifications'].forEach((name) => {
        navigator.permissions
          .query({ name })
          .then((status) => {
            report(name, status.state);
            status.onchange = () => report(name, status.state);
          })
          .catch(() => {
            // Some browsers don't support querying every permission name - ignore.
          });
      });
    }
  }

  if (document.documentElement?.getAttribute('data-extenspro-bridge-ready') === '1') {
    startTracking();
    return;
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'extenspro-bridge-ready') return;
    startTracking();
  });
})();
