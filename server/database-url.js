const getDatabaseUrl = (environment = process.env) => (
  environment.DATABASE_URL || environment.NEON_DATABASE_URL || ''
);

module.exports = { getDatabaseUrl };
