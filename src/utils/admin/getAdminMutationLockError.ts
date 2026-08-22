import "server-only";

const ADMIN_MUTATION_LOCK_MESSAGE =
  "Unable to connect to the database. The server may be experiencing high traffic or temporary overload.";

// Change this one value to enable or disable all protected admin mutations.
const ADMIN_MUTATION_LOCK_ENABLED = false;

export function getAdminMutationLockError() {
  return ADMIN_MUTATION_LOCK_ENABLED ? ADMIN_MUTATION_LOCK_MESSAGE : null;
}
