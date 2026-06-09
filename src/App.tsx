import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ExercisePage from './pages/ExercisePage';
import DrillPage from './pages/DrillPage';
import ProgressPage from './pages/ProgressPage';
import CustomSetsPage from './pages/CustomSetsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/exercise" element={<ExercisePage />} />
          <Route path="/drill" element={<DrillPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/custom-sets" element={<CustomSetsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
