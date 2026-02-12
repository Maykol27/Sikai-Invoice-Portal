import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InvoiceScanner } from './components/InvoiceScanner';
import { ResultViewer } from './components/ResultViewer';
import { History } from './components/History';
import { Pricing } from './components/Pricing';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './lib/auth';
import { useState } from 'react';

import { SikaiLoader } from './components/SikaiLoader';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <SikaiLoader />;
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
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-white mb-4">
                Digitalización <span className="text-transparent bg-clip-text bg-gradient-to-r from-sikai-accent to-blue-600">Inteligente</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Transforma facturas físicas en datos estructurados. Selecciona tus parámetros y deja que la IA haga el resto.
              </p>
            </div>
            <ScannerPage />
          </ProtectedRoute>
        } />
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
