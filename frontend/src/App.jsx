import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./components/Login";
import { ShieldCheck, Loader2 } from "lucide-react";

// Lazy Loaded Components
const InstitutionDashboard = lazy(() => import("./pages/InstitutionDashboard"));
const StudentPortal = lazy(() => import("./pages/StudentPortal"));
const VerificationPage = lazy(() => import("./pages/VerificationPage"));
const QRScannerPage = lazy(() => import("./pages/QRScannerPage"));

const LoadingFallback = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
    <div className="relative">
      <div className="h-20 w-20 border-4 border-gray-50 rounded-full" />
      <div className="h-20 w-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0" />
      <ShieldCheck className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Synchronizing Nodes</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">
          <Navbar />
          <main className="max-w-7xl mx-auto min-h-[80vh]">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verify/:certId" element={<VerificationPage />} />
                <Route path="/scan" element={<QRScannerPage />} />

                <Route
                  path="/institution"
                  element={
                    <PrivateRoute allowedRole="institution">
                      <InstitutionDashboard />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/student"
                  element={
                    <PrivateRoute allowedRole="student">
                      <StudentPortal />
                    </PrivateRoute>
                  }
                />

                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </main>

          <footer className="py-20 px-8 border-t border-gray-50 flex flex-col items-center space-y-6 bg-gray-50/30">
            <div className="flex items-center space-x-2 text-primary drop-shadow-sm">
              <ShieldCheck className="h-8 w-8" />
              <span className="font-black tracking-tighter text-2xl text-gray-900">MeritRegistry</span>
            </div>
            <div className="text-center text-gray-400 text-sm max-w-sm space-y-6 font-medium">
              <p className="leading-relaxed">Empowering academic transparency through decentralized verification technologies and on-chain record management.</p>
              <div className="flex flex-col space-y-2">
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-gray-300">
                  Network Status: Mainnet-Ready
                </p>
                <p className="text-[10px] uppercase font-black tracking-widest leading-relaxed text-gray-500">
                  © 2024 MERITREGISTRY LABS. <br />
                  Polygon Network Certified.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
