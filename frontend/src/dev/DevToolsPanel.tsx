import {
  ActionIcon,
  Affix,
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Indicator,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBug, IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import {
  type ApiFault,
  FAULT_PRESETS,
  type FaultKind,
  getFaults,
  newFault,
  setFaults,
  subscribeFaults,
} from "@/dev/apiFaults";

const METHODS = ["", "GET", "POST", "PUT", "PATCH", "DELETE"];

const KINDS: { value: FaultKind; label: string }[] = [
  { value: "status", label: "Fail with status" },
  { value: "network", label: "Never answer" },
  { value: "delay", label: "Answer late" },
  { value: "body", label: "Answer with body" },
];

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function FaultCard({
  fault,
  onChange,
  onRemove,
}: Readonly<{ fault: ApiFault; onChange: (patch: Partial<ApiFault>) => void; onRemove: () => void }>) {
  return (
    <Card withBorder padding="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Switch
            checked={fault.enabled}
            onChange={(e) => onChange({ enabled: e.currentTarget.checked })}
            label={fault.enabled ? "On" : "Off"}
            size="sm"
          />
          <ActionIcon variant="subtle" color="red" aria-label="Remove rule" onClick={onRemove}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        <Group gap="xs" grow wrap="nowrap">
          <Select
            label="Method"
            data={METHODS.map((method) => ({ value: method, label: method || "Any" }))}
            value={fault.method}
            onChange={(value) => onChange({ method: value ?? "" })}
            allowDeselect={false}
            maw={110}
          />
          <TextInput
            label="URL"
            value={fault.url}
            onChange={(e) => onChange({ url: e.currentTarget.value })}
            spellCheck={false}
          />
        </Group>

        <Group gap="xs" grow wrap="nowrap" align="flex-end">
          <Select
            label="Then"
            data={KINDS}
            value={fault.kind}
            onChange={(value) => onChange({ kind: (value as FaultKind | null) ?? "status" })}
            allowDeselect={false}
          />
          {fault.kind === "status" && (
            <NumberInput
              label="Status"
              value={fault.status}
              onChange={(value) => onChange({ status: Number(value) || 500 })}
              min={100}
              max={599}
              maw={100}
            />
          )}
          <NumberInput
            label="Delay (ms)"
            value={fault.delayMs}
            onChange={(value) => onChange({ delayMs: Number(value) || 0 })}
            min={0}
            step={250}
            maw={120}
          />
        </Group>

        {fault.kind === "status" && (
          <TextInput
            label="Message"
            description="Sent as { message }, the shape the backend uses"
            value={fault.message}
            onChange={(e) => onChange({ message: e.currentTarget.value })}
          />
        )}

        {fault.kind === "body" && (
          <Textarea
            label="Response body"
            value={fault.body}
            onChange={(e) => onChange({ body: e.currentTarget.value })}
            error={isValidJson(fault.body) ? null : "Not valid JSON, so this will answer with null"}
            autosize
            minRows={3}
            maxRows={10}
            spellCheck={false}
            styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
          />
        )}
      </Stack>
    </Card>
  );
}

/**
 * Dev-only controls for making the API misbehave while browsing the real app.
 *
 * The point is to reach the states that are otherwise awkward to get to - a service that is down, a
 * request that never answers, a token that expires part way through a visit - without editing code
 * or breaking the local database. Rules survive a reload, so the failures a page hits while it is
 * still loading can be looked at too.
 *
 * The screenshot harness (`npm run screenshot`) covers the same failures non-interactively; this is
 * for the poking about that comes first.
 *
 * Loaded only through the lazy import in `main.tsx` - see the note at the top of `apiFaults.ts` for
 * why a static import of anything in this folder would ship it to production.
 */
export default function DevToolsPanel() {
  const [opened, { open, close }] = useDisclosure(false);
  const faults = useSyncExternalStore(subscribeFaults, getFaults);
  const activeCount = faults.filter((fault) => fault.enabled).length;

  const update = (id: string, patch: Partial<ApiFault>) =>
    setFaults(faults.map((fault) => (fault.id === id ? { ...fault, ...patch } : fault)));

  return (
    <>
      {/* Left, because the bottom right corner already has notifications and the query devtools. */}
      <Affix position={{ bottom: 16, left: 16 }}>
        <Indicator label={activeCount} size={16} disabled={activeCount === 0} color="red">
          <Tooltip label="Dev tools: API faults">
            <ActionIcon variant="default" size="lg" radius="xl" onClick={open} aria-label="Open dev tools">
              <IconBug size={18} />
            </ActionIcon>
          </Tooltip>
        </Indicator>
      </Affix>

      <Drawer opened={opened} onClose={close} position="right" size="lg" title="Dev tools — API faults">
        <Stack gap="md">
          <Alert color="blue" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              Matching requests are answered here instead of by the backend, so the app's own error handling runs
              exactly as it would for a real failure. Rules are kept in this browser and survive a reload. Nothing here
              exists in a production build.
            </Text>
          </Alert>

          <div>
            <Text fw={500} size="sm" mb="xs">
              Presets
            </Text>
            <Stack gap="xs">
              {FAULT_PRESETS.map((preset) => (
                <Group key={preset.label} justify="space-between" wrap="nowrap" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm">{preset.label}</Text>
                    <Text size="xs" c="dimmed">
                      {preset.description}
                    </Text>
                  </div>
                  <Button
                    size="compact-sm"
                    variant="light"
                    onClick={() => setFaults([...faults, newFault(preset.fault)])}
                  >
                    Add
                  </Button>
                </Group>
              ))}
            </Stack>
          </div>

          <Group justify="space-between">
            <Group gap="xs">
              <Text fw={500} size="sm">
                Rules
              </Text>
              <Badge variant="light" size="sm">
                {activeCount} on
              </Badge>
            </Group>
            <Group gap="xs">
              <Button
                size="compact-sm"
                variant="default"
                leftSection={<IconPlus size={14} />}
                onClick={() => setFaults([...faults, newFault()])}
              >
                Add rule
              </Button>
              <Button
                size="compact-sm"
                variant="subtle"
                color="red"
                disabled={faults.length === 0}
                onClick={() => setFaults([])}
              >
                Clear all
              </Button>
            </Group>
          </Group>

          {faults.length === 0 ? (
            <Text size="sm" c="dimmed">
              No rules, so the app is talking to the real backend.
            </Text>
          ) : (
            faults.map((fault) => (
              <FaultCard
                key={fault.id}
                fault={fault}
                onChange={(patch) => update(fault.id, patch)}
                onRemove={() => setFaults(faults.filter((other) => other.id !== fault.id))}
              />
            ))
          )}
        </Stack>
      </Drawer>
    </>
  );
}
