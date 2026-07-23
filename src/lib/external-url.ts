const defaultAllowedHosts = ["*.supabase.co", "*.googleusercontent.com"];

function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/^https:\/\//, "").replace(/\/$/, "");
}

export function getAllowedExternalUrlHosts() {
  const configuredHosts = (process.env.ALLOWED_EXTERNAL_URL_HOSTS ?? "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);

  return Array.from(new Set([...defaultAllowedHosts, ...configuredHosts]));
}

function hostMatches(host: string, allowedHost: string) {
  if (allowedHost.startsWith("*.")) {
    const baseHost = allowedHost.slice(2);
    return host === baseHost || host.endsWith(`.${baseHost}`);
  }

  return host === allowedHost;
}

export function isAllowedExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      getAllowedExternalUrlHosts().some((allowedHost) => hostMatches(url.hostname.toLowerCase(), allowedHost))
    );
  } catch {
    return false;
  }
}

export function isAllowedProductUrl(value: string) {
  if (value.startsWith("/")) {
    return !value.startsWith("//") && !value.includes("\\");
  }

  return isAllowedExternalUrl(value);
}

export function getExternalUrlCspSources() {
  return getAllowedExternalUrlHosts().map((host) => `https://${host}`);
}
