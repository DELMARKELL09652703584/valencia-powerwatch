(() => {
  if (!('serviceWorker' in navigator)) return;

  const notice = document.getElementById('staff-update-notice');
  if (!notice) return;

  let registration;
  let dismissedWorker = null;
  let reloadAfterControllerChange = false;

  const showWaitingUpdate = () => {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker || !navigator.serviceWorker.controller || waitingWorker === dismissedWorker) return;
    notice.hidden = false;
  };

  const watchInstallingWorker = () => {
    const worker = registration?.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') showWaitingUpdate();
    });
  };

  notice.addEventListener('click', (event) => {
    const button = event.target.closest('[data-staff-update]');
    if (!button) return;

    if (button.dataset.staffUpdate === 'later') {
      dismissedWorker = registration?.waiting || null;
      notice.hidden = true;
      return;
    }

    const waitingWorker = registration?.waiting;
    if (!waitingWorker) {
      button.disabled = true;
      void registration?.update()
        .catch((error) => console.warn('Staff App update check failed:', error))
        .finally(() => {
          button.disabled = false;
          showWaitingUpdate();
        });
      return;
    }

    button.disabled = true;
    button.textContent = 'Updating…';
    reloadAfterControllerChange = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadAfterControllerChange) window.location.reload();
  });

  const checkForUpdates = () => {
    if (document.visibilityState === 'visible') {
      void registration?.update()
        .then(showWaitingUpdate)
        .catch((error) => console.warn('Staff App update check failed:', error));
    }
  };

  window.powerWatchCheckStaffUpdate = async () => {
    if (!registration) throw new Error('The Staff App update checker is not ready yet.');
    await registration.update();
    showWaitingUpdate();
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/staff-sw.js', {
      scope: '/staff',
      updateViaCache: 'none',
    }).then((serviceWorkerRegistration) => {
      registration = serviceWorkerRegistration;
      registration.addEventListener('updatefound', watchInstallingWorker);
      watchInstallingWorker();
      showWaitingUpdate();
      return registration.update().then(showWaitingUpdate);
    }).catch((error) => {
      console.error('Staff App update support could not be enabled.', error);
    });
  }, { once: true });

  window.addEventListener('focus', checkForUpdates);
  window.addEventListener('online', checkForUpdates);
  document.addEventListener('visibilitychange', checkForUpdates);
  window.setInterval(checkForUpdates, 30 * 60 * 1000);
})();
