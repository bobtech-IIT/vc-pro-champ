'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ModelSelector from '@/components/ModelSelector';
import DashboardStats from '@/components/DashboardStats';
import Dropzone from '@/components/Dropzone';
import CameraScanner from '@/components/CameraScanner';
import DataTable from '@/components/DataTable';
import WaterBreakModal from '@/components/WaterBreakModal';
import TemplateMappingModal from '@/components/TemplateMappingModal';
import AuditSummaryModal from '@/components/AuditSummaryModal';

import { ModelProvider, CardRecord, AuditStats } from '@/lib/types';
import { extractCardDataWithAI, runPythonAudit } from '@/lib/api-client';
import { 
  createInitialSessionState, 
  appendCardsToSession, 
  MAX_SESSION_LIMIT,
  BATCH_BREAK_THRESHOLD
} from '@/lib/session-manager';

import { 
  Camera, 
  Play, 
  Loader2, 
  ShieldCheck, 
  RotateCcw, 
  AlertCircle,
  FileCheck
} from 'lucide-react';

export default function Home() {
  // PWA Deferred Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  // Model & API Config
  const [selectedModel, setSelectedModel] = useState<ModelProvider>('openrouter/free');
  const [apiKey, setApiKey] = useState<string>('');

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

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Main Processing Workflow (Stage 1 Vision/OCR -> Stage 2 Python Audit)
  const handleProcessCards = async () => {
    if (selectedFiles.length === 0) return;
    if (sessionState.isSessionLimitReached) {
      alert(`Maximum session limit of ${MAX_SESSION_LIMIT} records reached. Please export your Excel file and reset the session.`);
      return;
    }

    setProcessing(true);
    setProcessStatus('Stage 1: Capturing text & fields with AI...');

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
          const cards = await extractCardDataWithAI(base64, selectedModel, apiKey);
          allExtractedCards.push(...cards);
        }
      }

      setProcessStatus('Stage 2: Running Python Pandas EDA & 10-step audit...');
      
      // Execute Stage 2 Python Serverless Audit
      const auditResult = await runPythonAudit(allExtractedCards);

      // Append to session state
      const { nextState, triggerWaterBreak, limitReached } = appendCardsToSession(
        sessionState,
        auditResult.processed_cards
      );

      setSessionState(nextState);
      setAuditStats((prev) => ({
        total_cards: nextState.cards.length,
        cleanliness_score: auditResult.stats.cleanliness_score,
        corrections_made: prev.corrections_made + auditResult.stats.corrections_made,
        duplicates_found: auditResult.stats.duplicates_found,
        missing_values_count: auditResult.stats.missing_values_count,
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
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header onInstallPwa={handleInstallPwa} canInstallPwa={canInstallPwa} />

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

      {/* Camera Scanner Overlay */}
      {showCamera && (
        <CameraScanner
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Model Selection Bar */}
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
        />

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
                Drop multiple card photos, PDFs, or use mobile camera live capture.
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
              <span>Stage 2 Audit Complete: {auditLogs.length} automated corrections and checks recorded.</span>
            </div>
            <button
              onClick={() => setShowAuditModal(true)}
              className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold cursor-pointer border border-indigo-500/40"
            >
              View Audit Logs
            </button>
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
