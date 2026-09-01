import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";

const CollectionsPage = lazy(() => import("@/pages/CollectionsPage.tsx"));
const CollectionPage = lazy(() => import("@/pages/CollectionPage"));
const PublicCollectionsPage = lazy(() => import("@/pages/PublicCollectionsPage"));
const ArmyBuilderPage = lazy(() => import("@/pages/ArmyBuilderPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const MyModelDefinitionsPage = lazy(() => import("@/pages/MyModelDefinitionsPage"));
const MyFactionsPage = lazy(() => import("@/pages/MyFactionsPage"));
const MyWargearDefinitionsPage = lazy(() => import("@/pages/MyWargearDefinitionsPage"));
const UsersAdminPage = lazy(() => import("@/pages/UsersAdminPage"));
const ModelDefinitionsAdminPage = lazy(() => import("@/pages/ModelDefinitionsAdminPage"));
const FactionDefinitionsAdminPage = lazy(() => import("@/pages/FactionDefinitionsAdminPage"));
const WargearDefinitionsAdminPage = lazy(() => import("@/pages/WargearDefinitionsAdminPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const Router = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<CollectionsPage />} />
      <Route path="collections" element={<CollectionsPage />} />
      <Route path="collections/public" element={<PublicCollectionsPage />} />
      <Route path="collections/:collectionId" element={<CollectionPage />} />
      <Route path="army-builder" element={<ArmyBuilderPage />} />
      <Route path="my/model-definitions" element={<MyModelDefinitionsPage />} />
      <Route path="my/factions" element={<MyFactionsPage />} />
      <Route path="my/wargear-definitions" element={<MyWargearDefinitionsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="admin/users" element={<UsersAdminPage />} />
      <Route path="admin/model-definitions" element={<ModelDefinitionsAdminPage />} />
      <Route path="admin/faction-definitions" element={<FactionDefinitionsAdminPage />} />
      <Route path="admin/wargear-definitions" element={<WargearDefinitionsAdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default Router;
