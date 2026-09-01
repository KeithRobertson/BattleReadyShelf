import { Alert, Loader } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type AdminPageGateProps = Readonly<{
  isAuthLoading: boolean;
  isAuthorised: boolean;
  loading: boolean;
  children: ReactNode;
}>;

/**
 * Renders admin page content only once authentication has resolved, the user is an admin, and the
 * page's data has loaded. Keeps the three "not ready yet" states out of each page's markup.
 */
export default function AdminPageGate({ isAuthLoading, isAuthorised, loading, children }: AdminPageGateProps) {
  if (isAuthLoading) return <Loader />;

  if (!isAuthorised) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />}>
        You do not have permission to view this page.
      </Alert>
    );
  }

  if (loading) return <Loader />;

  return <>{children}</>;
}
