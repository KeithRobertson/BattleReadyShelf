import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";

const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const PublicCollectionsPage = lazy(() => import("./pages/PublicCollectionsPage"));
const ArmyBuilderPage = lazy(() => import("./pages/ArmyBuilderPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const UsersAdminPage = lazy(() => import("./pages/UsersAdminPage"));
const ModelDefinitionsAdminPage = lazy(() => import("./pages/ModelDefinitionsAdminPage"));
const FactionDefinitionsAdminPage = lazy(() => import("./pages/FactionDefinitionsAdminPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const Router = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<CollectionsPage />} />
      <Route path="collections" element={<CollectionsPage />} />
      <Route path="collections/public" element={<PublicCollectionsPage />} />
      <Route path="collections/:collectionId" element={<CollectionPage />} />
      <Route path="army-builder" element={<ArmyBuilderPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="admin/users" element={<UsersAdminPage />} />
      <Route path="admin/model-definitions" element={<ModelDefinitionsAdminPage />} />
      <Route path="admin/faction-definitions" element={<FactionDefinitionsAdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default Router;
