/**
 * Aside summaries set one value on a filter dimension. Clicking the already-selected value
 * clears that dimension instead of stacking another selection.
 */
export default function exclusiveFilterValue<T>(current: T[], value: T): T[] {
  return current.length === 1 && current[0] === value ? [] : [value];
}
