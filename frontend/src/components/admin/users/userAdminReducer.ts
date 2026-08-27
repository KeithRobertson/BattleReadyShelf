import type { UserDto, UserRole } from "@/generated";

export type UserAdminState = {
  users: UserDto[];
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  bulkRole: UserRole;
  savingUserId: string | null;
  bulkSaving: boolean;
};

export type UserAdminAction =
  | { type: "loadStart" }
  | { type: "loadSuccess"; users: UserDto[] }
  | { type: "loadError"; error: string }
  | { type: "toggleSelected"; userId: string }
  | { type: "toggleSelectAll"; editableIds: string[] }
  | { type: "setBulkRole"; role: UserRole }
  | { type: "savingStart"; userId: string }
  | { type: "savingEnd" }
  | { type: "bulkSavingStart" }
  | { type: "bulkSavingEnd" }
  | { type: "bulkApplySuccess"; updated: UserDto[] };

export const initialUserAdminState: UserAdminState = {
  users: [],
  loading: true,
  error: null,

  selectedIds: new Set(),
  bulkRole: "USER",

  savingUserId: null,
  bulkSaving: false,
};

export function userAdminReducer(state: UserAdminState, action: UserAdminAction): UserAdminState {
  switch (action.type) {
    case "loadStart":
      return { ...state, loading: true, error: null };

    case "loadSuccess":
      return { ...state, loading: false, users: action.users };

    case "loadError":
      return { ...state, loading: false, error: action.error };

    case "toggleSelected": {
      const next = new Set(state.selectedIds);
      next.has(action.userId) ? next.delete(action.userId) : next.add(action.userId);
      return { ...state, selectedIds: next };
    }

    case "toggleSelectAll": {
      const next = new Set(action.editableIds.length === state.selectedIds.size ? [] : action.editableIds);
      return { ...state, selectedIds: next };
    }

    case "setBulkRole":
      return { ...state, bulkRole: action.role };

    case "savingStart":
      return { ...state, savingUserId: action.userId, error: null };

    case "savingEnd":
      return { ...state, savingUserId: null };

    case "bulkSavingStart":
      return { ...state, bulkSaving: true, error: null };

    case "bulkSavingEnd":
      return { ...state, bulkSaving: false };

    case "bulkApplySuccess": {
      const updatedById = new Map(action.updated.map((user) => [user.id, user]));
      return {
        ...state,
        bulkSaving: false,
        selectedIds: new Set(),
        users: state.users.map((user) => (user.id ? (updatedById.get(user.id) ?? user) : user)),
      };
    }

    default:
      return state;
  }
}
