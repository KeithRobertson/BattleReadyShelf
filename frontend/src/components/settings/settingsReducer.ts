export type SettingsState = {
  isSaving: boolean;
};

export type SettingsAction = { type: "startSaving" } | { type: "saved" };

export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case "startSaving":
      return { isSaving: true };

    case "saved":
      return { isSaving: false };

    default:
      return state;
  }
}
