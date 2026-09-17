// Dev-only rules that change how the API answers, plus the store the dev panel edits them through.
//
// Nothing outside src/dev may import this, or anything else in src/dev, with a static import. The
// only reason none of it reaches production is that `main.tsx` reaches it through a dynamic import
// behind `import.meta.env.DEV`, which a build turns into a statically false branch and drops along
// with the chunk behind it. A static import is an unconditional reference, so one of those anywhere
// in the app would bundle these rules for real users - silently, with no build failure to notice.
// It is a convention, not something the build enforces.
//
// Rules live in localStorage rather than component state because the failures worth looking at are
// mostly the ones a page hits while it is loading: a reload has to land back in the same broken
// state, or there is no way to see what the page does on the way up.
//
// A rule's `url` and `method` are deliberately the same shape as the Playwright harness's `failApi`
// entries (see scripts/scenarios.mjs), so a fault found by clicking around can be pasted into a
// scenario to keep it, and vice versa.

/**
 * What a matched request does instead of reaching the backend.
 *
 * - `status` — answer with an error status and a `{ message }` body, the shape backend errors use.
 * - `network` — never answer at all, the way a dropped connection fails: no response, no status.
 * - `delay` — answer normally, just later. For looking at loading and skeleton states.
 * - `body` — answer 200 with a body of your own, for data the local database will not produce.
 */
export type FaultKind = "status" | "network" | "delay" | "body";

export type ApiFault = {
  id: string;
  enabled: boolean;
  /** Glob against the request URL. `*` stops at a path separator, `**` spans them. */
  url: string;
  /** HTTP verb to match, or "" for every verb. */
  method: string;
  kind: FaultKind;
  /** Held for this long before answering, whatever the kind. */
  delayMs: number;
  status: number;
  message: string;
  /** JSON, used by the `body` kind. */
  body: string;
};

const STORAGE_KEY = "brs_dev_api_faults";

/**
 * Starting points for the failures that are awkward to cause for real: a service that is down, a
 * name that is already taken, a token that has expired mid-visit.
 *
 * These mirror the error scenarios in the screenshot harness, so what the panel shows and what CI
 * photographs are the same failures.
 */
export const FAULT_PRESETS: ReadonlyArray<{ label: string; description: string; fault: Partial<ApiFault> }> = [
  {
    label: "Collections unavailable",
    description: "The list cannot be read, so the page has to say so without claiming it is empty.",
    fault: {
      url: "**/api/v1/army-collections",
      method: "GET",
      status: 503,
      message: "The collections service is unavailable.",
    },
  },
  {
    label: "Name already taken",
    description: "A rejected create, reported from inside the modal that is still open.",
    fault: {
      url: "**/api/v1/army-collections",
      method: "POST",
      status: 409,
      message: "You already have a collection with that name.",
    },
  },
  {
    label: "Delete refused",
    description: "A delete the server will not do. The row has to stay where it is.",
    fault: {
      url: "**/api/v1/collection-models/*",
      method: "DELETE",
      status: 409,
      message: "This model is used by an army list and cannot be deleted.",
    },
  },
  {
    label: "Session expired",
    description: "The token is no longer accepted, which is the one failure that ends the session.",
    fault: { url: "**/api/v1/users/me", status: 401, message: "Invalid or expired bearer token." },
  },
  {
    label: "Server unreachable",
    description: "Nothing answers. Reads retry, and the message is about the connection.",
    fault: { url: "**/api/v1/**", kind: "network" },
  },
  {
    label: "Slow network",
    description: "Everything answers, three seconds late, so loading states are visible.",
    fault: { url: "**/api/v1/**", kind: "delay", delayMs: 3000 },
  },
];

export function newFault(overrides: Partial<ApiFault> = {}): ApiFault {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    url: "**/api/v1/**",
    method: "",
    kind: "status",
    delayMs: 0,
    status: 500,
    message: "Something went wrong.",
    body: "{}",
    ...overrides,
  };
}

/**
 * Converts a glob to an anchored regular expression. `**` spans path separators and `*` stops at
 * one, so `**` + `/api/v1/paints` will not also match a single paint underneath it.
 */
function globToRegExp(glob: string): RegExp {
  const DOUBLE_STAR = "\u0000";
  const source = glob
    .replace(/[.+^${}()|[\]\\?]/g, "\\$&")
    .replaceAll("**", DOUBLE_STAR)
    .replaceAll("*", "[^/]*")
    .replaceAll(DOUBLE_STAR, ".*");
  return new RegExp(`^${source}$`);
}

/**
 * The forms of a URL a glob is allowed to match: the whole thing, and the path on its own. The query
 * string is dropped so a rule does not have to know about parameters it does not care about.
 */
function urlForms(url: string): string[] {
  try {
    const parsed = new URL(url, window.location.origin);
    return [`${parsed.origin}${parsed.pathname}`, parsed.pathname];
  } catch {
    return [url];
  }
}

export function findFault(faults: readonly ApiFault[], method: string, url: string): ApiFault | undefined {
  const forms = urlForms(url);
  const verb = method.toUpperCase();

  return faults.find((fault) => {
    if (!fault.enabled) return false;
    if (fault.method !== "" && fault.method.toUpperCase() !== verb) return false;
    const pattern = globToRegExp(fault.url);
    return forms.some((form) => pattern.test(form));
  });
}

function read(): ApiFault[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? (stored as ApiFault[]) : [];
  } catch {
    return [];
  }
}

let faults: ApiFault[] = read();
const listeners = new Set<() => void>();

/** Stable between writes, so it can be a `useSyncExternalStore` snapshot. */
export function getFaults(): ApiFault[] {
  return faults;
}

export function subscribeFaults(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setFaults(next: ApiFault[]): void {
  faults = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}
