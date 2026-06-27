const defaultStoreAdminEmails = ["erlan514@gmail.com"];

export function getStoreAdminEmails() {
  const configured = process.env.STORE_ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = configured
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...emails, ...defaultStoreAdminEmails]));
}

export function isStoreAdminEmail(email?: string | null) {
  if (!email) return false;
  return getStoreAdminEmails().includes(email.trim().toLowerCase());
}
