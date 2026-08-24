import { useState } from "react";
import type { ArmyCollection } from "@/generated";
import { updateArmyCollection } from "@/generated";

export default function useCollectionEditing(
  collectionId: string | undefined,
  collection: ArmyCollection | null,
  setCollection: (updater: (prev: ArmyCollection | null) => ArmyCollection | null) => void,
  setError: (msg: string | null) => void,
) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  function startEditingName() {
    setNameDraft(collection?.name ?? "");
    setIsEditingName(true);
  }

  async function commitEditingName() {
    setIsEditingName(false);

    const newName = nameDraft.trim();
    if (!collectionId || !newName || newName === collection?.name) return;

    setError(null);
    setSavingName(true);

    try {
      const updated = (
        await updateArmyCollection({
          path: { armyCollectionId: collectionId },
          body: { name: newName },
        })
      ).data;

      if (updated) {
        setCollection(() => updated);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingName(false);
    }
  }

  function cancelEditingName() {
    setIsEditingName(false);
  }

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  function startEditingDescription() {
    setDescriptionDraft(collection?.description ?? "");
    setIsEditingDescription(true);
  }

  async function commitEditingDescription() {
    setIsEditingDescription(false);

    const newDescription = descriptionDraft.trim();
    if (!collectionId || newDescription === (collection?.description ?? "")) return;

    setError(null);
    setSavingDescription(true);

    try {
      const updated = (
        await updateArmyCollection({
          path: { armyCollectionId: collectionId },
          body: { description: newDescription },
        })
      ).data;

      if (updated) {
        setCollection(() => updated);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingDescription(false);
    }
  }

  function cancelEditingDescription() {
    setIsEditingDescription(false);
  }

  const [savingVisibility, setSavingVisibility] = useState(false);

  async function toggleVisibility(newIsPublic: boolean) {
    if (!collectionId) return;

    setError(null);
    setSavingVisibility(true);

    try {
      const updated = (
        await updateArmyCollection({
          path: { armyCollectionId: collectionId },
          body: { isPublic: newIsPublic },
        })
      ).data;

      if (updated) {
        setCollection(() => updated);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingVisibility(false);
    }
  }

  return {
    isEditingName,
    nameDraft,
    setNameDraft,
    startEditingName,
    commitEditingName,
    cancelEditingName,
    savingName,
    isEditingDescription,
    descriptionDraft,
    setDescriptionDraft,
    startEditingDescription,
    commitEditingDescription,
    cancelEditingDescription,
    savingDescription,
    savingVisibility,
    toggleVisibility,
  };
}
