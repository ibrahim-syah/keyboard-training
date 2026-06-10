import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ExercisePage from './pages/ExercisePage';
import DrillPage from './pages/DrillPage';
import ProgressPage from './pages/ProgressPage';
import CustomSetsPage from './pages/CustomSetsPage';
import ReservedSettingsPage from './pages/ReservedSettingsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/exercise" element={<ExercisePage />} />
          <Route path="/drill" element={<DrillPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/custom-sets" element={<CustomSetsPage />} />
          <Route path="/settings/reserved" element={<ReservedSettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
