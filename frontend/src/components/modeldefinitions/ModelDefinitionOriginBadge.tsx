import { Badge, Tooltip } from "@mantine/core";
import type { ModelDefinition } from "@/generated";
import { modelDefinitionOrigin } from "@/utils/definitionOrigin.ts";

/**
 * Marks a model definition that belongs to the signed-in user. Shared definitions get no badge, so
 * the marker only appears where it carries information - a customisation usually keeps the shared
 * definition's name, which would otherwise make the two impossible to tell apart.
 */
export default function ModelDefinitionOriginBadge({ definition }: Readonly<{ definition: ModelDefinition }>) {
  const origin = modelDefinitionOrigin(definition);
  if (origin === "shared") return null;

  const isCustomisation = origin === "customised";
  return (
    <Tooltip
      label={
        isCustomisation
          ? "Your customised version of a shared model type"
          : "A model type you created, visible only to you"
      }
    >
      <Badge variant="light" color={isCustomisation ? "blue" : "grape"} size="sm">
        {isCustomisation ? "Your version" : "Yours"}
      </Badge>
    </Tooltip>
  );
}
