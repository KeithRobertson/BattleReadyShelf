import { Alert, Loader } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type PageGateProps = Readonly<{
  isAuthLoading: boolean;
  isAuthorised: boolean;
  loading: boolean;
  unauthorisedMessage?: string;
  children: ReactNode;
}>;

/**
 * Renders page content only once authentication has resolved, the user is allowed in, and the
 * page's data has loaded. Keeps the three "not ready yet" states out of each page's markup.
 */
export default function PageGate({
  isAuthLoading,
  isAuthorised,
  loading,
  unauthorisedMessage = "You do not have permission to view this page.",
  children,
}: PageGateProps) {
  if (isAuthLoading) return <Loader />;

  if (!isAuthorised) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />}>
        {unauthorisedMessage}
      </Alert>
    );
  }

  if (loading) return <Loader />;

  return <>{children}</>;
}
