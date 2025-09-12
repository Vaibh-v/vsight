/* ------------------------- Google Business Profile (GBP) ------------------------- */
/**
 * Lists GBP locations for the authenticated user.
 * - Tries v1 accountmanagement + businessinformation APIs first.
 * - Falls back to legacy v4 My Business endpoints.
 * - Returns a minimal, consistent shape: { name, title }[]
 *
 * Usage:
 *   const locs = await gbpListLocations(accessToken);               // auto-discovers accounts
 *   const locs = await gbpListLocations(accessToken, "123456789");  // explicit account id
 */
export async function gbpListLocations(
  accessToken: string,
  accountId?: string
): Promise<{ name: string; title: string }[]> {
  // Helpers
  const listAccountsV1 = async (): Promise<string[]> => {
    // mybusinessaccountmanagement v1
    const url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
    const data = await fetchJson(url, { accessToken });
    const accounts: any[] = Array.isArray(data?.accounts) ? data.accounts : [];
    // accounts come as "accounts/123456789"
    return accounts
      .map(a => String(a?.name || ""))
      .filter(s => s.startsWith("accounts/"))
      .map(s => s.replace("accounts/", ""));
  };

  const listLocationsV1 = async (accId: string) => {
    // mybusinessbusinessinformation v1
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(
      accId
    )}/locations?readMask=name,title`;
    const data = await fetchJson(url, { accessToken });
    const locs: any[] = Array.isArray(data?.locations) ? data.locations : [];
    return locs.map(l => ({
      name: String(l?.name || ""),         // e.g., "locations/XXXXXXXX"
      title: String(l?.title || ""),
    }));
  };

  const listAccountsV4 = async (): Promise<string[]> => {
    // legacy v4
    const url = "https://mybusiness.googleapis.com/v4/accounts";
    const data = await fetchJson(url, { accessToken });
    const accounts: any[] = Array.isArray(data?.accounts) ? data.accounts : [];
    return accounts.map(a => String(a?.name || "")).map(s => s.replace("accounts/", ""));
  };

  const listLocationsV4 = async (accId: string) => {
    // legacy v4
    const url = `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(
      accId
    )}/locations?readMask=locationName,name`;
    const data = await fetchJson(url, { accessToken });
    const locs: any[] = Array.isArray(data?.locations) ? data.locations : [];
    return locs.map(l => ({
      name: String(l?.name || ""),                 // "accounts/{accId}/locations/{locId}"
      title: String(l?.locationName || l?.storeName || ""),
    }));
  };

  const out: { name: string; title: string }[] = [];

  // If accountId provided, try v1, then v4 for that account
  if (accountId) {
    try {
      out.push(...(await listLocationsV1(accountId)));
    } catch {}
    if (!out.length) {
      try {
        out.push(...(await listLocationsV4(accountId)));
      } catch {}
    }
    return out;
  }

  // Otherwise, discover accounts (v1 then v4), and aggregate their locations
  let accounts: string[] = [];
  try {
    accounts = await listAccountsV1();
  } catch {}
  if (!accounts.length) {
    try {
      accounts = await listAccountsV4();
    } catch {}
  }

  for (const accId of accounts) {
    let got: { name: string; title: string }[] = [];
    try {
      got = await listLocationsV1(accId);
    } catch {}
    if (!got.length) {
      try {
        got = await listLocationsV4(accId);
      } catch {}
    }
    out.push(...got);
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return out.filter(l => {
    if (!l.name) return false;
    if (seen.has(l.name)) return false;
    seen.add(l.name);
    return true;
  });
}
