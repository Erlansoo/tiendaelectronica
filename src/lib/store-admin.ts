export function getStoreAdminEmails() {
  return getEmailsFromEnvironment("STORE_ADMIN_EMAILS");
}

export function getStoreStaffEmails() {
  return getEmailsFromEnvironment("STORE_STAFF_EMAILS");
}

function getEmailsFromEnvironment(name: "STORE_ADMIN_EMAILS" | "STORE_STAFF_EMAILS") {
  return Array.from(
    new Set(
      (process.env[name] ?? "")
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

export function isStoreStaffEmail(email?: string | null) {
  if (!email) return false;
  return getStoreStaffEmails().includes(email.trim().toLowerCase());
}

export function canAccessStoreDashboard(email?: string | null) {
  return isStoreAdminEmail(email) || isStoreStaffEmail(email);
}
