import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ScenarioProvider } from './context/ScenarioContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import ScenarioLab from './pages/ScenarioLab';
import OptimizationStudio from './pages/OptimizationStudio';
import AlgorithmArena from './pages/AlgorithmArena';
import Analytics from './pages/Analytics';
import Contact from './pages/Contact';

export default function App() {
  return (
    <ThemeProvider>
      <ScenarioProvider>
        <BrowserRouter>
          <div className="app-container">
            {/* Top Control-Center Navigation Bar */}
            <Navbar />

            {/* Main Routing Outlet */}
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/scenario" element={<ScenarioLab />} />
                <Route path="/optimization" element={<OptimizationStudio />} />
                <Route path="/algorithms" element={<AlgorithmArena />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/contact" element={<Contact />} />
                {/* Catch-all redirect to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Global Footer */}
            <Footer />
          </div>
        </BrowserRouter>
      </ScenarioProvider>
    </ThemeProvider>
  );
}
