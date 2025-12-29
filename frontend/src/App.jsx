import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./components/Login";
import { ShieldCheck, Loader2, Anchor } from "lucide-react";

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

          <footer className="py-20 px-8 border-t border-gray-100 flex flex-col items-center space-y-8 bg-white">
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center space-x-2 text-primary">
                <Anchor className="h-8 w-8" />
                <span className="font-black tracking-tighter text-3xl text-primary">MDM</span>
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Maritime Document Management</span>
            </div>

            <div className="text-center text-gray-500 text-sm max-w-lg space-y-6">
              <p className="leading-relaxed">Decentralized maritime document verification and issuance platform, ensuring global document integrity on the blockchain.</p>

              <div className="flex flex-col space-y-3">
                <div className="inline-flex items-center justify-center space-x-2 px-4 py-1.5 bg-gray-50 rounded-full">
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">
                    Network: Polygon Mainnet
                  </span>
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  © 2025 MDM Systems. All rights reserved.
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
