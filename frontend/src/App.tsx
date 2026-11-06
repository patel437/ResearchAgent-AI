import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ResearchSearch from './pages/ResearchSearch';
import AIAssistant from './pages/AIAssistant';
import PaperSummarizer from './pages/PaperSummarizer';
import ResearchGaps from './pages/ResearchGaps';
import HypothesisGenerator from './pages/HypothesisGenerator';
import ReportGenerator from './pages/ReportGenerator';
import ReferenceManager from './pages/ReferenceManager';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1d27',
            color: '#e8eaf0',
            border: '1px solid #2a2f45',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<ResearchSearch />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="summarizer" element={<PaperSummarizer />} />
          <Route path="gaps" element={<ResearchGaps />} />
          <Route path="hypotheses" element={<HypothesisGenerator />} />
          <Route path="reports" element={<ReportGenerator />} />
          <Route path="references" element={<ReferenceManager />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
