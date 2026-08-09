import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ArmyBuilderPage from "./pages/ArmyBuilderPage";
import CollectionPage from "./pages/CollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<CollectionsPage />} />
        <Route path="/collections/:collectionId" element={<CollectionPage />} />
        <Route path="/army-builder" element={<ArmyBuilderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
