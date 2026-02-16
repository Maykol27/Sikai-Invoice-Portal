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

import { SplashScreen } from './components/SplashScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);

  // Show splash until min timer finishes
  // AND also wait for auth loading to finish so we don't flash login screen if user is actually logged in
  if (!splashFinished || loading) {
    return (
      <SplashScreen
        onFinish={() => setSplashFinished(true)}
      // If auth loads fast, we still wait for splash
      // If auth is slow, splash waits for auth (by not unmounting due to 'loading' check above, but we need to ensure SplashScreen calls onFinish)
      />
    );
  }

  // Once splash is visually done and auth is loaded:
  if (!user) return <Login />;

  return <>{children}</>;
}

function ScannerPage() {
  const [scanResult, setScanResult] = useState<any>(null);

  return scanResult ? (
    <ResultViewer
      data={scanResult}
      onReset={() => setScanResult(null)}
      onUpdate={(newData: any) => setScanResult({ ...newData, scanId: scanResult.scanId })} // Keep scanId on update
      scanId={scanResult.scanId}
    />
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
