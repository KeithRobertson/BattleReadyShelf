import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { subscribeApiErrors } from "@/auth/apiErrorEvents";

export default function ApiErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeApiErrors(setMessage), []);

  if (!message) return null;

  return (
    <Alert color="red" mb="md" withCloseButton icon={<IconAlertCircle size={16} />} onClose={() => setMessage(null)}>
      {message}
    </Alert>
  );
}
