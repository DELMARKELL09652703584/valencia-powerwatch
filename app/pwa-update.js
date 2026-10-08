/* Community PWA service-worker update detection and user-approved activation. */

(() => {
  if (!('serviceWorker' in navigator)) return;

  let registration;
  let dismissedWorker = null;
  let reloadOnControllerChange = Boolean(navigator.serviceWorker.controller);

  const updateNotice = document.createElement('section');
  updateNotice.className = 'pwa-update-notice';
  updateNotice.setAttribute('aria-label', 'App update available');
  updateNotice.setAttribute('aria-live', 'polite');
  updateNotice.hidden = true;
  updateNotice.innerHTML = `
    <div class="pwa-update-copy">
      <strong>Update ready</strong>
      <span>A newer version of Valencia PowerWatch is available.</span>
    </div>
    <div class="pwa-update-actions">
      <button type="button" class="button primary" data-pwa-update="apply">Update now</button>
      <button type="button" class="button ghost" data-pwa-update="later">Later</button>
    </div>`;
  document.body.append(updateNotice);

  const showUpdateNotice = (worker) => {
    if (!worker || dismissedWorker === worker) return;
    updateNotice.hidden = false;
  };

  const checkWaitingWorker = () => {
    if (registration?.waiting && navigator.serviceWorker.controller) {
      showUpdateNotice(registration.waiting);
    }
  };

  const watchInstallingWorker = () => {
    const worker = registration?.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') checkWaitingWorker();
    });
  };

  updateNotice.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pwa-update]');
    if (!button) return;

    if (button.dataset.pwaUpdate === 'later') {
      dismissedWorker = registration?.waiting || null;
      updateNotice.hidden = true;
      return;
    }

    const waitingWorker = registration?.waiting;
    if (!waitingWorker) {
      updateNotice.hidden = true;
      void registration?.update().catch((error) => console.warn('PWA update check failed:', error));
      return;
    }

    button.disabled = true;
    button.textContent = 'Updating…';
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadOnControllerChange) {
      window.location.reload();
      return;
    }
    reloadOnControllerChange = true;
  });

  const workerUrl = new URL('/sw.js', window.location.origin).href;
  const userPortalScope = new URL('/', window.location.origin).href;
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations
      .filter((existingRegistration) => {
        const worker = existingRegistration.active
          || existingRegistration.waiting
          || existingRegistration.installing;
        return worker?.scriptURL === workerUrl;
      })
      .map((existingRegistration) => existingRegistration.unregister())))
    .then(() => navigator.serviceWorker.register(workerUrl, {
      scope: userPortalScope,
      updateViaCache: 'none',
    })).then((serviceWorkerRegistration) => {
      registration = serviceWorkerRegistration;
      registration.addEventListener('updatefound', watchInstallingWorker);
      watchInstallingWorker();
      checkWaitingWorker();
      return registration.update().catch((error) => {
        console.warn('PWA update check failed:', error);
      });
    }).catch((error) => {
      console.error('User Portal service worker registration failed:', error);
    });

  const checkForUpdates = () => {
    if (document.visibilityState === 'visible') {
      void registration?.update().catch((error) => console.warn('PWA update check failed:', error));
    }
  };

  window.addEventListener('focus', checkForUpdates);
  document.addEventListener('visibilitychange', checkForUpdates);
  window.setInterval(checkForUpdates, 60 * 60 * 1000);
})();
