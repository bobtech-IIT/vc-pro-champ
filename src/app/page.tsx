'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DashboardStats from '@/components/DashboardStats';
import Dropzone from '@/components/Dropzone';
import CameraScanner from '@/components/CameraScanner';
import DataTable from '@/components/DataTable';
import WaterBreakModal from '@/components/WaterBreakModal';
import TemplateMappingModal from '@/components/TemplateMappingModal';
import AuditSummaryModal from '@/components/AuditSummaryModal';
import QuickConnectModal from '@/components/QuickConnectModal';

import { CardRecord, AuditStats } from '@/lib/types';
import { extractCardDataWithAI, runPythonAudit, DEFAULT_ENDPOINT, DEFAULT_MODEL } from '@/lib/api-client';
import { 
  createInitialSessionState, 
  appendCardsToSession, 
  MAX_SESSION_LIMIT 
} from '@/lib/session-manager';

import { 
  Camera, 
  Play, 
  Loader2, 
  ShieldCheck, 
  RotateCcw, 
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

export default function Home() {
  // PWA Deferred Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  // Modals & Popups State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickConnectOpen, setIsQuickConnectOpen] = useState(false);

  // Model & Endpoint Config
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [apiEndpoint, setApiEndpoint] = useState<string>(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState<string>('');

  // Load saved credentials from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('vcpro_api_key');
      const savedModel = localStorage.getItem('vcpro_selected_model');
      const savedEndpoint = localStorage.getItem('vcpro_api_endpoint');

      if (savedKey) setApiKey(savedKey);
      if (savedModel) setSelectedModel(savedModel);
      if (savedEndpoint) setApiEndpoint(savedEndpoint);
    }
  }, []);

  const handleSaveConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vcpro_api_key', apiKey);
      localStorage.setItem('vcpro_selected_model', selectedModel);
      localStorage.setItem('vcpro_api_endpoint', apiEndpoint);
    }
  };

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');

  // Session & Card State
  const [sessionState, setSessionState] = useState(createInitialSessionState());
  const [auditStats, setAuditStats] = useState<AuditStats>({
    total_cards: 0,
    cleanliness_score: 100,
    corrections_made: 0,
    duplicates_found: 0,
    missing_values_count: 0,
    flagged_verification_count: 0
  });
  const [auditLogs, setAuditLogs] = useState<string[]>([]);

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<string[] | undefined>(undefined);

  // Capture PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPwa(false);
    }
    setDeferredPrompt(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Main Processing Workflow
  const handleProcessCards = async () => {
    if (selectedFiles.length === 0) return;
    if (sessionState.isSessionLimitReached) {
      alert(`Maximum session limit of ${MAX_SESSION_LIMIT} records reached. Please export your Excel file and reset the session.`);
      return;
    }

    handleSaveConfig();

    setProcessing(true);
    setProcessStatus('Stage 1: Capturing text, fields & inferring industry...');

    try {
      const allExtractedCards: CardRecord[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const item = selectedFiles[i];
        setProcessStatus(`Stage 1: Scanning card ${i + 1} of ${selectedFiles.length}...`);

        let base64 = '';
        if (item.file) {
          base64 = await fileToBase64(item.file);
        } else if (item.previewUrl) {
          base64 = item.previewUrl;
        }

        if (base64) {
          const cards = await extractCardDataWithAI(base64, selectedModel, apiKey, apiEndpoint);
          allExtractedCards.push(...cards);
        }
      }

      setProcessStatus('Stage 2: Python Pandas EDA, deduplication & zero-hallucination verification audit...');
      
      const auditResult = await runPythonAudit(allExtractedCards);

      const { nextState } = appendCardsToSession(
        sessionState,
        auditResult.processed_cards
      );

      setSessionState(nextState);
      setAuditStats((prev) => ({
        total_cards: nextState.cards.length,
        cleanliness_score: auditResult.stats.cleanliness_score,
        corrections_made: prev.corrections_made + auditResult.stats.corrections_made,
        duplicates_found: prev.duplicates_found + auditResult.stats.duplicates_found,
        missing_values_count: auditResult.stats.missing_values_count,
        flagged_verification_count: auditResult.stats.flagged_verification_count || 0
      }));
      setAuditLogs((prev) => [...auditResult.audit_logs, ...prev]);

      setSelectedFiles([]);
    } catch (err: any) {
      alert(`Processing error: ${err.message || 'Failed to scan cards'}`);
    } finally {
      setProcessing(false);
      setProcessStatus('');
    }
  };

  const handleCameraCapture = async (base64Image: string) => {
    setSelectedFiles((prev) => [
      ...prev,
      {
        id: `cam-${Date.now()}`,
        file: null,
        previewUrl: base64Image,
        isPdf: false,
      },
    ]);
  };

  const handleUpdateCard = (id: string, field: string, value: string) => {
    setSessionState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const handleDeleteCard = (id: string) => {
    setSessionState((prev) => {
      const updated = prev.cards.filter((c) => c.id !== id);
      return {
        ...prev,
        cards: updated,
        processedCount: updated.length,
        isSessionLimitReached: updated.length >= MAX_SESSION_LIMIT,
      };
    });
  };

  const handleAddRow = () => {
    if (sessionState.isSessionLimitReached) {
      alert(`Session limit of ${MAX_SESSION_LIMIT} rows reached.`);
      return;
    }
    const newCard: CardRecord = {
      id: `manual-${Date.now()}`,
      name: 'New Contact',
      title: '',
      company: '',
      industry: 'General Corporate',
      email: '',
      mobile: '',
      landline: '',
      website: '',
      address: '',
      city: '',
      country: '',
    };
    const { nextState } = appendCardsToSession(sessionState, [newCard]);
    setSessionState(nextState);
  };

  const handleResetSession = () => {
    if (confirm('Are you sure you want to reset all scanned records for this session?')) {
      setSessionState(createInitialSessionState());
      setAuditLogs([]);
      setSelectedFiles([]);
      setAuditStats({
        total_cards: 0,
        cleanliness_score: 100,
        corrections_made: 0,
        duplicates_found: 0,
        missing_values_count: 0,
        flagged_verification_count: 0
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header with Breathing Status LED Settings Modal button and Quick Connect */}
      <Header
        onInstallPwa={handleInstallPwa}
        canInstallPwa={canInstallPwa}
        isSettingsOpen={isSettingsOpen}
        onOpenSettingsChange={setIsSettingsOpen}
        selectedModel={selectedModel}
        onModelChange={(m) => {
          setSelectedModel(m);
          if (typeof window !== 'undefined') localStorage.setItem('vcpro_selected_model', m);
        }}
        apiKey={apiKey}
        onApiKeyChange={(k) => {
          setApiKey(k);
          if (typeof window !== 'undefined') localStorage.setItem('vcpro_api_key', k);
        }}
        apiEndpoint={apiEndpoint}
        onApiEndpointChange={(e) => {
          setApiEndpoint(e);
          if (typeof window !== 'undefined') localStorage.setItem('vcpro_api_endpoint', e);
        }}
        onSaveConfig={handleSaveConfig}
        onOpenQuickConnect={() => setIsQuickConnectOpen(true)}
        hasCards={sessionState.cards.length > 0}
      />

      {/* Water Break Cooldown Modal */}
      <WaterBreakModal
        isOpen={sessionState.isWaterBreakActive}
        onTimerComplete={() => {
          setSessionState((prev) => ({
            ...prev,
            isWaterBreakActive: false,
            waterBreakTimeRemaining: 0,
          }));
        }}
      />

      {/* Template Mapping Modal */}
      <TemplateMappingModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApplyMapping={(headers) => setCustomHeaders(headers)}
      />

      {/* Audit Summary Modal */}
      <AuditSummaryModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        auditLogs={auditLogs}
        cleanlinessScore={auditStats.cleanliness_score}
      />

      {/* Quick Connect Welcome Message Modal */}
      <QuickConnectModal
        isOpen={isQuickConnectOpen}
        onClose={() => setIsQuickConnectOpen(false)}
        cards={sessionState.cards}
      />

      {/* Camera Scanner Overlay */}
      {showCamera && (
        <CameraScanner
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* KPI Dashboard Stats */}
        <DashboardStats
          stats={auditStats}
          currentCount={sessionState.cards.length}
          maxLimit={MAX_SESSION_LIMIT}
        />

        {/* Upload & Action Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Stage 1: Scan & Input Visiting Cards
              </h2>
              <p className="text-xs text-slate-400">
                Drop multiple card photos, PDFs, or use live camera capture. Deduplication & Industry classification run automatically.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setShowCamera(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer shadow-md"
              >
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Live Camera</span>
              </button>

              <button
                onClick={handleProcessCards}
                disabled={processing || selectedFiles.length === 0}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{processStatus || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Process Cards ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <Dropzone
            onFilesSelected={setSelectedFiles}
            disabled={processing}
            maxFiles={50}
          />
        </div>

        {/* Session Cap Warning Banner */}
        {sessionState.isSessionLimitReached && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Maximum session limit reached (100 / 100 cards). Please export your Excel sheet to start a new session.</span>
            </div>
            <button
              onClick={handleResetSession}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold cursor-pointer"
            >
              Reset Session
            </button>
          </div>
        )}

        {/* Audit Logs Trigger Banner */}
        {auditLogs.length > 0 && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Stage 2 Audit Complete: {auditLogs.length} automated corrections and verification checks recorded.</span>
            </div>
            <button
              onClick={() => setShowAuditModal(true)}
              className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold cursor-pointer border border-indigo-500/40"
            >
              View Audit Logs
            </button>
          </div>
        )}

        {/* Manual Verification Flagged Alert Banner */}
        {sessionState.cards.some(c => c.needs_verification) && (
          <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Zero Hallucination Guard: {sessionState.cards.filter(c => c.needs_verification).length} row(s) flagged with suspicious OCR format (e.g. invalid website or email mismatch). Please double-check yellow rows in the table below.
              </span>
            </div>
          </div>
        )}

        {/* Interactive Spreadsheet Table */}
        <DataTable
          cards={sessionState.cards}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onAddRow={handleAddRow}
          onOpenTemplateMapping={() => setShowTemplateModal(true)}
          customHeaders={customHeaders}
        />

        {/* Reset Session Bar */}
        {sessionState.cards.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleResetSession}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Batch Session</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
