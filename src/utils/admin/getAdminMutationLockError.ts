import "server-only";

const ADMIN_MUTATION_LOCK_MESSAGE =
  "Unable to connect to the database. The server may be experiencing high traffic or temporary overload.";

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export function getAdminMutationLockError() {
  const configuredValue =
    process.env.ADMIN_DATABASE_MUTATIONS_ENABLED?.trim().toLowerCase() || "";

  return ENABLED_VALUES.has(configuredValue)
    ? null
    : ADMIN_MUTATION_LOCK_MESSAGE;
}
