-- Migration 008: correct the primary-role sync on demotion.
-- Additive/replacement only: no table, column, row, or index is dropped.
--
-- Migration 007 added users_sync_primary_role, which only ever inserted the
-- primary role into user_roles. That is correct for promotion but wrong for
-- demotion: if an administrator is changed back to resident, the old
-- 'administrator' row would remain in user_roles and the account would keep the
-- administrator permissions through the matrix (and through
-- v_user_effective_permissions).
--
-- This replacement removes the previous primary role on a role change and then
-- grants the new one. Roles granted explicitly in user_roles are preserved
-- unless one of them is the role being replaced.

CREATE OR REPLACE FUNCTION powerwatch_sync_primary_role()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    DELETE FROM user_roles ur
    USING roles r
    WHERE ur.user_id = NEW.id
      AND ur.role_id = r.id
      AND r.role_name = OLD.role;
  END IF;

  INSERT INTO user_roles (user_id, role_id)
  SELECT NEW.id, r.id FROM roles r WHERE r.role_name = NEW.role
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$fn$;
