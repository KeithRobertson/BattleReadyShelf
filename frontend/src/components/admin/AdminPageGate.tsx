import type { ReactNode } from "react";
import PageGate from "@/components/PageGate.tsx";

type AdminPageGateProps = Readonly<{
  isAuthLoading: boolean;
  isAuthorised: boolean;
  loading: boolean;
  children: ReactNode;
}>;

/** {@link PageGate} with the wording admin pages want when the visitor is not an admin. */
export default function AdminPageGate({ isAuthLoading, isAuthorised, loading, children }: AdminPageGateProps) {
  return (
    <PageGate isAuthLoading={isAuthLoading} isAuthorised={isAuthorised} loading={loading}>
      {children}
    </PageGate>
  );
}
