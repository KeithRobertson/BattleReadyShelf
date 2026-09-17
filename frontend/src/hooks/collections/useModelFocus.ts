import { useCallback, useState } from "react";

export type ModelFocus = ReturnType<typeof useModelFocus>;

/**
 * Which miniature the collection aside is inspecting. Separate from bulk-select, which is for
 * deleting several models at once in edit mode.
 */
export default function useModelFocus() {
  const [focusedModelId, setFocusedModelId] = useState<string | null>(null);

  const setFocus = useCallback((modelId: string) => {
    setFocusedModelId(modelId);
  }, []);

  const clearFocus = useCallback(() => {
    setFocusedModelId(null);
  }, []);

  const isFocused = useCallback(
    (modelId: string | undefined) => Boolean(modelId && focusedModelId === modelId),
    [focusedModelId],
  );

  return {
    focusedModelId,
    setFocus,
    clearFocus,
    isFocused,
  };
}
