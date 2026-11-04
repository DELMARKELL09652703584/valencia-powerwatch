const BUILT_IN_ADMIN_LOGIN = 'DELMARKEL SARO-AY';
const BUILT_IN_ADMIN_FULL_NAME = 'DELMARKEL SARO-AY';
const BUILT_IN_ADMIN_RECOVERY_EMAIL = 'dsaro-ay@aclcbukidnon.com';
const BUILT_IN_ADMIN_LEGACY_USERNAME = 'DELMARKEL2003';
const BUILT_IN_ADMIN_LEGACY_EMAIL = 'dsaroay@gmail.com';
const BUILT_IN_ADMIN_LEGACY_PHONE = '09652703584';
const BUILT_IN_ADMIN_VERSION = '3';

const normalizePhone = (value) => String(value || '')
  .replace(/[\s\-\(\)\.]/g, '')
  .replace(/^\+63/, '0');

const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();

const RESERVED_IDENTIFIERS = new Set([
  normalizeIdentifier(BUILT_IN_ADMIN_LOGIN),
  normalizeIdentifier(BUILT_IN_ADMIN_RECOVERY_EMAIL),
  normalizeIdentifier(BUILT_IN_ADMIN_LEGACY_USERNAME),
  normalizeIdentifier(BUILT_IN_ADMIN_LEGACY_EMAIL),
]);

const isBuiltInAdminUser = (user) => Boolean(Number(user?.is_built_in_admin))
  || RESERVED_IDENTIFIERS.has(normalizeIdentifier(user?.username))
  || RESERVED_IDENTIFIERS.has(normalizeIdentifier(user?.email))
  || RESERVED_IDENTIFIERS.has(normalizeIdentifier(user?.recovery_email))
  || normalizePhone(user?.contact_number) === BUILT_IN_ADMIN_LEGACY_PHONE;

const hasBuiltInAdminIdentifier = ({ username, email, contact_number, recovery_email } = {}) => (
  RESERVED_IDENTIFIERS.has(normalizeIdentifier(username))
  || RESERVED_IDENTIFIERS.has(normalizeIdentifier(email))
  || RESERVED_IDENTIFIERS.has(normalizeIdentifier(recovery_email))
  || normalizePhone(contact_number) === BUILT_IN_ADMIN_LEGACY_PHONE
);

module.exports = {
  BUILT_IN_ADMIN_LOGIN,
  BUILT_IN_ADMIN_FULL_NAME,
  BUILT_IN_ADMIN_RECOVERY_EMAIL,
  BUILT_IN_ADMIN_LEGACY_USERNAME,
  BUILT_IN_ADMIN_LEGACY_EMAIL,
  BUILT_IN_ADMIN_LEGACY_PHONE,
  BUILT_IN_ADMIN_VERSION,
  normalizePhone,
  normalizeIdentifier,
  isBuiltInAdminUser,
  hasBuiltInAdminIdentifier,
};
