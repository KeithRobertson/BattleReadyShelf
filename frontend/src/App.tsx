import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ArmyBuilderPage from "./pages/ArmyBuilderPage";
import CollectionPage from "./pages/CollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import ModelDefinitionsAdminPage from "./pages/ModelDefinitionsAdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import PublicCollectionsPage from "./pages/PublicCollectionsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersAdminPage from "./pages/UsersAdminPage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<CollectionsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/public" element={<PublicCollectionsPage />} />
        <Route path="/collections/:collectionId" element={<CollectionPage />} />
        <Route path="/army-builder" element={<ArmyBuilderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin/users" element={<UsersAdminPage />} />
        <Route path="/admin/model-definitions" element={<ModelDefinitionsAdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
