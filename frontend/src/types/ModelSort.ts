type SortField = "name" | "status" | "date";
type SortDirection = "asc" | "desc";
type SortOrder = `${SortField}-${SortDirection}`;

export type { SortDirection, SortField, SortOrder };
