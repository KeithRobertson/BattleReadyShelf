/**
 * Root segments of the React Query keys for data cached across pages.
 *
 * These are shared constants rather than inline strings because pages that change a catalogue have
 * to drop the cached copy the collection pages read, and a mistyped key there fails silently: the
 * mutation succeeds, nothing throws, and the stale data simply stays on screen.
 *
 * Keys are arrays of `[root, ...scope]`. Passing just the root to `removeQueries` /
 * `invalidateQueries` matches every scope beneath it, which is what mutations want.
 */
export const COLLECTIONS_KEY = "collections";
export const PUBLIC_COLLECTIONS_KEY = "publicCollections";
export const COLLECTION_KEY = "collection";
export const COLLECTION_MODELS_KEY = "collectionModels";
export const MODEL_DEFINITIONS_KEY = "modelDefinitions";
export const FACTIONS_KEY = "factions";
