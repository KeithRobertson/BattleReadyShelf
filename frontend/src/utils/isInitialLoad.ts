/**
 * Whether a query has nothing real to show yet, and so should render a loading state.
 *
 * Every query in the app sets `placeholderData` so that a background refetch re-renders with fresh
 * data instead of flashing a spinner over data we already have. The side effect is that `isLoading`
 * is false from the very first render - as far as React Query is concerned the query has already
 * succeeded, holding the placeholder - so a screen keyed off `isLoading` shows its empty state ("No
 * models added to this collection yet") while the first fetch is still in flight.
 *
 * The placeholder only stands in while there is no real or cached data, which makes it the honest
 * signal for a first load. Pairing it with `isFetching` keeps a disabled query from looking like it
 * is loading forever, since a disabled query never drops its placeholder.
 */
export default function isInitialLoad(query: Readonly<{ isFetching: boolean; isPlaceholderData: boolean }>): boolean {
  return query.isFetching && query.isPlaceholderData;
}
