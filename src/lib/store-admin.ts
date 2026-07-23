export function getStoreAdminEmails() {
  return Array.from(
    new Set(
      (process.env.STORE_ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function isStoreAdminEmail(email?: string | null) {
  if (!email) return false;
  return getStoreAdminEmails().includes(email.trim().toLowerCase());
}
