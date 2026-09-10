import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { LoginPage } from './auth/LoginPage';
import { Shell } from './components/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <Shell />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/busquedas" element={<PlaceholderPage titulo="Búsquedas activas" />} />
              <Route path="/publicidad" element={<PlaceholderPage titulo="Publicidad inteligente" />} />
              <Route path="/captacion" element={<PlaceholderPage titulo="Captación" />} />
              <Route path="/kyc" element={<PlaceholderPage titulo="KYC / Cumplimiento" />} />
              <Route path="/comisiones" element={<PlaceholderPage titulo="Comisiones" />} />
              <Route path="/calculadoras" element={<PlaceholderPage titulo="Calculadoras" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
