const publicBaseUrl = (environment = process.env) => {
  const configuredUrl = environment.PUBLIC_BASE_URL
    || environment.RENDER_EXTERNAL_URL
    || (environment.RENDER_EXTERNAL_HOSTNAME ? `https://${environment.RENDER_EXTERNAL_HOSTNAME}` : '');

  return (configuredUrl || `http://localhost:${environment.PORT || 4000}`).replace(/\/$/, '');
};

module.exports = { publicBaseUrl };
