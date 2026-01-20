import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InvoiceScanner } from './components/InvoiceScanner';
import { ResultViewer } from './components/ResultViewer';
import { History } from './components/History';
import { Pricing } from './components/Pricing';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './lib/auth';
import { useState } from 'react';
import { Dashboard } from './components/Dashboard';

import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-sikai-bg">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-sikai-accent animate-spin" />
        <p className="text-gray-400 font-headline animate-pulse">Iniciando SIKAI CX...</p>
      </div>
    </div>
  );

  if (!user) return <Login />;
  return <>{children}</>;
}

function ScannerPage() {
  const [scanResult, setScanResult] = useState<any>(null);

  return scanResult ? (
    <ResultViewer data={scanResult} onReset={() => setScanResult(null)} />
  ) : (
    <InvoiceScanner onScanComplete={setScanResult} />
  );
}

function AppContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <div className="text-center mb-12">
              <h1 className="font-headline text-4xl md:text-6xl font-bold text-white mb-6">
                Digitalización <span className="text-gradient-sikai">Inteligente</span>
              </h1>
              <p className="text-gray-400 text-xl max-w-2xl mx-auto font-body">
                Tu socio estratégico en la transformación digital. Escanea, extrae y gestiona tus facturas con el poder de la IA.
              </p>
            </div>
            <ScannerPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
