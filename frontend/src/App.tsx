import { CssBaseline } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import CollectionsPage from "./CollectionsPage";
import AppLayout from "./components/AppLayout";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <>
      <CssBaseline />
      <AppLayout>
        <Routes>
          <Route path="/" element={<CollectionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
