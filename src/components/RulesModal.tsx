import React from 'react';
import { BookOpen, X, Check, ShieldCheck, Zap } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">{t.rulesTitle}</h2>
              <p className="text-xs text-neutral-400">{t.appSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-start gap-3">
            <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold font-mono shrink-0">1</span>
            <div>{t.rules1}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-start gap-3">
            <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold font-mono shrink-0">2</span>
            <div>{t.rules2}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3 text-rose-200">
            <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold font-mono shrink-0">3</span>
            <div><strong>{t.rules3}</strong></div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-start gap-3">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono shrink-0">4</span>
            <div>{t.rules4}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-start gap-3">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono shrink-0">5</span>
            <div>{t.rules5}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-start gap-3">
            <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold font-mono shrink-0">6</span>
            <div>{t.rules6}</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase transition-colors cursor-pointer"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};
