import { Button, FileButton, Group } from "@mantine/core";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import { useState } from "react";

type Props<TExport, TResult> = {
  /** Used to name the downloaded file, e.g. "factions" -> factions-export-2025-01-31.json. */
  fileNamePrefix: string;
  onExport: () => Promise<TExport | undefined>;
  onImport: (document: TExport) => Promise<TResult | undefined>;
  /** Called with the parsed result so the page can refresh its own state and summarise it. */
  onImported: (result: TResult, document: TExport) => void;
  onError: (message: string) => void;
  onStart: () => void;
};

/**
 * Export/import controls for one kind of definition. Each admin page owns its own document, so the
 * only thing shared here is the file plumbing - the page decides what to send and what to do with
 * the result.
 */
export function DefinitionTransferButtons<TExport, TResult>({
  fileNamePrefix,
  onExport,
  onImport,
  onImported,
  onError,
  onStart,
}: Props<TExport, TResult>) {
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    onStart();
    try {
      const exportData = await onExport();
      if (!exportData) {
        onError(`Failed to export ${fileNamePrefix}`);
        return;
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileNamePrefix}-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      onError(String(e));
    }
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    onStart();
    setImporting(true);
    try {
      const parsed = JSON.parse(await file.text()) as TExport;
      const result = await onImport(parsed);
      if (result) {
        onImported(result, parsed);
      }
    } catch (e) {
      onError(String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Group gap="xs">
      <Button leftSection={<IconDownload size={16} />} variant="default" onClick={handleExport}>
        Export
      </Button>
      <FileButton onChange={handleImportFile} accept="application/json">
        {(props) => (
          <Button leftSection={<IconUpload size={16} />} variant="default" loading={importing} {...props}>
            Import
          </Button>
        )}
      </FileButton>
    </Group>
  );
}
