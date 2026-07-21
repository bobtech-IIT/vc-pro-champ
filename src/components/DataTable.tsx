'use client';

import React, { useState } from 'react';
import { CardRecord } from '@/lib/types';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  Check, 
  SlidersHorizontal,
  AlertTriangle,
  Info
} from 'lucide-react';

interface DataTableProps {
  cards: CardRecord[];
  onUpdateCard: (id: string, field: string, value: string) => void;
  onDeleteCard: (id: string) => void;
  onAddRow: () => void;
  onOpenTemplateMapping: () => void;
  customHeaders?: string[];
}

export default function DataTable({
  cards,
  onUpdateCard,
  onDeleteCard,
  onAddRow,
  onOpenTemplateMapping,
  customHeaders,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const baseHeaders = customHeaders || [
    'Name', 'Title', 'Company', 'Industry', 'Email', 
    'Mobile', 'Landline', 'Website', 'Address', 
    'City', 'Country', 'Notes'
  ];

  const fieldKeysMap: Record<string, string> = {
    'Name': 'name',
    'Title': 'title',
    'Company': 'company',
    'Industry': 'industry',
    'Email': 'email',
    'Mobile': 'mobile',
    'Landline': 'landline',
    'Website': 'website',
    'Address': 'address',
    'City': 'city',
    'Country': 'country',
    'Notes': 'notes'
  };

  const filteredCards = cards.filter((card) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      card.name?.toLowerCase().includes(term) ||
      card.company?.toLowerCase().includes(term) ||
      card.industry?.toLowerCase().includes(term) ||
      card.email?.toLowerCase().includes(term) ||
      card.mobile?.includes(term)
    );
  });

  const exportToExcel = () => {
    if (cards.length === 0) return;

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}

    const exportData = cards.map((c) => {
      const rowObj: Record<string, string> = {};
      baseHeaders.forEach((header) => {
        const key = fieldKeysMap[header] || header.toLowerCase();
        rowObj[header] = c[key] || '';
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    const colWidths = baseHeaders.map((h) => ({
      wch: Math.max(h.length + 5, 18)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visiting Cards');

    XLSX.writeFile(workbook, `VC_Pro_Scanned_Cards_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Scanned Records Spreadsheet ({cards.length} rows)</span>
              {cards.some(c => c.needs_verification) && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Manual Tally Flagged</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Double-click any cell to edit. Flagged rows (amber) require visual tallying with original card.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={onOpenTemplateMapping}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Map Template</span>
          </button>

          <button
            onClick={onAddRow}
            className="px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <button
            onClick={exportToExcel}
            disabled={cards.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/60 max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-900/95 sticky top-0 z-10 text-slate-300 font-mono uppercase text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-3 w-10 text-center font-normal">#</th>
              {baseHeaders.map((header) => (
                <th key={header} className="py-3 px-4 font-semibold text-slate-200 border-r border-slate-800/60 whitespace-nowrap">
                  {header}
                </th>
              ))}
              <th className="py-3 px-3 text-center w-14">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredCards.length === 0 ? (
              <tr>
                <td colSpan={baseHeaders.length + 2} className="py-12 text-center text-slate-500">
                  No visiting cards scanned yet. Upload card images or start mobile camera.
                </td>
              </tr>
            ) : (
              filteredCards.map((card, idx) => {
                const isFlagged = card.needs_verification;
                const reasons = card.verification_reasons || [];

                return (
                  <tr
                    key={card.id}
                    className={`transition-colors ${
                      isFlagged
                        ? 'bg-amber-950/30 border-l-4 border-amber-500 hover:bg-amber-950/40'
                        : card.is_duplicate
                        ? 'bg-rose-950/20 border-l-4 border-rose-500'
                        : 'hover:bg-indigo-950/20'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[10px] relative">
                      <div className="flex flex-col items-center gap-1">
                        <span>{idx + 1}</span>
                        {isFlagged && (
                          <div className="relative">
                            <button
                              onClick={() => setActiveTooltipId(activeTooltipId === card.id ? null : card.id)}
                              className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                              title="Needs Manual Verification"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 fill-amber-400/20" />
                            </button>

                            {/* Verification Reasons Tooltip Box */}
                            {activeTooltipId === card.id && (
                              <div className="absolute left-6 top-0 z-30 w-64 bg-slate-900 border border-amber-500/50 rounded-xl p-3 shadow-2xl text-left text-[11px] text-amber-200 space-y-1.5">
                                <div className="font-bold flex items-center gap-1 text-amber-300 border-b border-slate-800 pb-1">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>Tally with Original Card</span>
                                </div>
                                <ul className="list-disc list-inside space-y-0.5 font-mono text-[10px]">
                                  {reasons.length > 0 ? (
                                    reasons.map((r, rIdx) => <li key={rIdx}>{r}</li>)
                                  ) : (
                                    <li>Anomalous field values detected during EDA.</li>
                                  )}
                                </ul>
                                <button
                                  onClick={() => setActiveTooltipId(null)}
                                  className="w-full text-center text-[10px] text-slate-400 hover:text-white pt-1"
                                >
                                  Close
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {baseHeaders.map((header) => {
                      const key = fieldKeysMap[header] || header.toLowerCase();
                      const value = card[key] || '';
                      const isEditing = editingCell?.id === card.id && editingCell?.field === key;
                      const isEmpty = !value;

                      return (
                        <td
                          key={header}
                          onDoubleClick={() => setEditingCell({ id: card.id, field: key })}
                          className={`py-2.5 px-4 border-r border-slate-800/40 relative max-w-[200px] truncate ${
                            isEmpty ? 'bg-rose-950/10 text-rose-400 font-italic' : ''
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={value}
                                onChange={(e) => onUpdateCard(card.id, key, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                                className="w-full bg-slate-900 border border-indigo-500 text-white rounded px-2 py-1 text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => setEditingCell(null)}
                                className="text-emerald-400 p-0.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="cursor-pointer hover:text-indigo-300">
                              {key === 'industry' && value ? (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium">
                                  {value}
                                </span>
                              ) : (
                                value || <span className="text-slate-600 text-[10px] italic">empty</span>
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeleteCard(card.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
