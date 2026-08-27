export type SettingsState = {
  isSaving: boolean;
  error: string | null;
};

export type SettingsAction = { type: "startSaving" } | { type: "success" } | { type: "error"; error: string };

export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case "startSaving":
      return { isSaving: true, error: null };

    case "success":
      return { isSaving: false, error: null };

    case "error":
      return { isSaving: false, error: action.error };

    default:
      return state;
  }
}
