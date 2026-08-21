import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ArmyBuilderPage from "./pages/ArmyBuilderPage";
import CollectionPage from "./pages/CollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import FactionDefinitionsAdminPage from "./pages/FactionDefinitionsAdminPage";
import ModelDefinitionsAdminPage from "./pages/ModelDefinitionsAdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import PublicCollectionsPage from "./pages/PublicCollectionsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersAdminPage from "./pages/UsersAdminPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<CollectionsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/public" element={<PublicCollectionsPage />} />
        <Route path="/collections/:collectionId" element={<CollectionPage />} />
        <Route path="/army-builder" element={<ArmyBuilderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin/users" element={<UsersAdminPage />} />
        <Route path="/admin/model-definitions" element={<ModelDefinitionsAdminPage />} />
        <Route path="/admin/faction-definitions" element={<FactionDefinitionsAdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
