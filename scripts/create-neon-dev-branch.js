const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  STAGING_ENV_PATH,
  loadEnvironment,
  describeDatabase,
} = require('./neon-staging-common');

const API_BASE = 'https://console.neon.tech/api/v2';

const api = async (apiKey, endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = {};
  if (text) {
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
  }
  if (!response.ok) {
    const message = body.message || body.error || `${response.status} ${response.statusText}`;
    throw new Error(`Neon API ${endpoint} failed: ${message}`);
  }
  return body;
};

const waitForBranch = async (apiKey, projectId, branchId) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await api(apiKey, `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`);
    if (result.branch?.current_state === 'ready') return result.branch;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error('The Neon development branch did not become ready within 60 seconds.');
};

const getConnectionUri = async (apiKey, projectId, branchId, databaseName, roleName) => {
  const query = new URLSearchParams({
    branch_id: branchId,
    database_name: databaseName,
    role_name: roleName,
  });
  const result = await api(apiKey, `/projects/${encodeURIComponent(projectId)}/connection_uri?${query.toString()}`);
  if (!result.uri) throw new Error('Neon did not return a connection URI for the development branch.');
  return result.uri;
};

const run = async () => {
  loadEnvironment();
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  const branchName = process.env.NEON_DEV_BRANCH_NAME || 'development';
  const parentBranchId = process.env.NEON_PARENT_BRANCH_ID || undefined;
  const databaseName = process.env.NEON_DB_NAME || 'neondb';
  const roleName = process.env.NEON_DB_ROLE || 'neondb_owner';

  if (!apiKey) throw new Error('NEON_API_KEY is required to create a Neon branch. Do not put it in source control.');
  if (!projectId) throw new Error('NEON_PROJECT_ID is required (for example, soft-rain-77737541).');

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to create a development branch with NODE_ENV=production.');
  }

  const listed = await api(apiKey, `/projects/${encodeURIComponent(projectId)}/branches`);
  let branch = (listed.branches || []).find((item) => item.name === branchName);
  let created = false;

  if (branch?.default) {
    throw new Error(`Refusing to use "${branchName}": it is the project's default/production branch. Choose another branch name.`);
  }
  if (branch && process.env.NEON_BRANCH_ID && branch.id === process.env.NEON_BRANCH_ID) {
    throw new Error(`Refusing to use "${branchName}": it matches the known production branch ID.`);
  }

  if (!branch) {
    const body = { branch: { name: branchName } };
    if (parentBranchId) body.branch.parent_id = parentBranchId;
    body.endpoints = [{ type: 'read_write' }];
    const result = await api(apiKey, `/projects/${encodeURIComponent(projectId)}/branches`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    branch = result.branch;
    created = true;
  }

  if (!branch?.id) throw new Error('Neon did not return a branch ID.');
  const readyBranch = await waitForBranch(apiKey, projectId, branch.id);
  const connectionString = await getConnectionUri(apiKey, projectId, branch.id, databaseName, roleName);

  const env = [
    '# Generated locally for the isolated Neon development branch. Do not commit.',
    `NEON_DEV_DATABASE_URL=${connectionString}`,
    'POWERWATCH_ALLOW_NEON_DEV=1',
    `NEON_DEV_PROJECT_ID=${projectId}`,
    `NEON_DEV_BRANCH_ID=${readyBranch.id}`,
    `NEON_DEV_BRANCH_NAME=${readyBranch.name || branchName}`,
    '',
  ].join('\n');
  fs.writeFileSync(STAGING_ENV_PATH, env, { encoding: 'utf8', mode: 0o600 });

  console.log(`${created ? 'Created' : 'Using existing'} Neon development branch: ${readyBranch.name || branchName} (${readyBranch.id})`);
  console.log(`Saved the branch connection string to the ignored file ${path.relative(ROOT, STAGING_ENV_PATH)}.`);
  console.log(`Target: ${describeDatabase(connectionString)}`);
  console.log('Next: npm run db:migrate:neon && npm run db:backfill:neon && npm run db:validate:neon');
};

run().catch((error) => {
  console.error(`Neon development branch setup failed: ${error.message}`);
  process.exitCode = 1;
});
