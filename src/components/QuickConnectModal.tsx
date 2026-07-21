'use client';

import React, { useState } from 'react';
import { CardRecord } from '@/lib/types';
import { MessageSquare, Copy, Check, X, Sparkles, User, Building2, Briefcase } from 'lucide-react';

interface QuickConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CardRecord[];
}

export default function QuickConnectModal({
  isOpen,
  onClose,
  cards,
}: QuickConnectModalProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id || '');
  const [tone, setTone] = useState<'warm' | 'professional' | 'short'>('warm');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedCard = cards.find((c) => c.id === selectedCardId) || cards[0];

  const generateMessage = (card?: CardRecord, selectedTone: string = 'warm') => {
    if (!card) return 'Please select a contact from the dropdown above.';

    const name = card.name || 'Friend';
    const firstName = name.split(' ')[0];
    const title = card.title ? `${card.title}` : 'your role';
    const company = card.company ? `at ${card.company}` : '';
    const industry = card.industry ? `in the ${card.industry} sector` : '';

    if (selectedTone === 'professional') {
      return `Dear ${name},\n\nIt was a pleasure connecting with you. I noted your work as ${title} ${company} ${industry}. I would welcome the opportunity to stay connected and discuss potential synergies in the future.\n\nBest regards,\n[Your Name]`;
    } else if (selectedTone === 'short') {
      return `Hi ${firstName}! Great meeting you today. Let's stay connected here and explore opportunities together. Best, [Your Name]`;
    } else {
      // Warm & Friendly (Default)
      return `Hi ${firstName}! 👋 It was fantastic connecting with you today. I was really impressed by your work as ${title} ${company} ${industry}. Looking forward to staying in touch!\n\nWarm regards,\n[Your Name]`;
    }
  };

  const messageText = generateMessage(selectedCard, tone);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-5 relative text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Quick Connect Welcome Message
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">Generate a personalized intro message for your new contact.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Dropdown Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Select Contact</span>
          </label>
          <div className="relative">
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              {cards.length === 0 ? (
                <option value="">No contacts extracted yet</option>
              ) : (
                cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name || 'Unnamed'} — {c.title || 'Role'} ({c.company || 'Company'})
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Selected Contact Metadata Card */}
        {selectedCard && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1 text-slate-300">
            <div className="flex items-center gap-2 font-medium text-white">
              <span>{selectedCard.name}</span>
              {selectedCard.industry && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                  {selectedCard.industry}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-500" />
                {selectedCard.title || 'No Title'}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                {selectedCard.company || 'No Company'}
              </span>
            </div>
          </div>
        )}

        {/* Tone Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Greeting Tone & Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'warm', label: 'Warm & Friendly' },
              { id: 'professional', label: 'Formal Executive' },
              { id: 'short', label: 'Short & Direct' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  tone === t.id
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Text Preview Box */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Generated Custom Message
          </label>
          <textarea
            readOnly
            rows={4}
            value={messageText}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-sans text-slate-200 focus:outline-none resize-none selection:bg-emerald-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleCopy}
            disabled={!selectedCard}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
              copied
                ? 'bg-emerald-600 border border-emerald-400'
                : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Quick Greeting</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
