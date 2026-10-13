import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/audio';

interface AntiCheatModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  flaggedSpeedMs: number;
  onVerified: () => void;
}

export const AntiCheatModal: React.FC<AntiCheatModalProps> = ({
  isOpen,
  onClose,
  lang,
  flaggedSpeedMs,
  onVerified,
}) => {
  const t = translations[lang];
  const [num1, setNum1] = useState(Math.floor(Math.random() * 8) + 4);
  const [num2, setNum2] = useState(Math.floor(Math.random() * 7) + 3);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(userAnswer, 10) === num1 + num2) {
      sound.playPointWon();
      onVerified();
      onClose();
    } else {
      sound.playFalseStart();
      setError(true);
      setNum1(Math.floor(Math.random() * 8) + 4);
      setNum2(Math.floor(Math.random() * 7) + 3);
      setUserAnswer('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">{t.botVerificationTitle}</h3>
            <span className="text-[11px] font-mono text-rose-400 font-bold">
              SPEED: {flaggedSpeedMs} ms (Suspicious Sub-Human Event)
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          {t.botVerificationDesc}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 text-center font-mono">
            <span className="text-xs text-neutral-400 block mb-1">{t.solveCaptcha}</span>
            <span className="text-2xl font-black text-white tracking-wider">
              {num1} + {num2} = ?
            </span>
          </div>

          <input
            type="number"
            autoFocus
            required
            placeholder={lang === 'ru' ? 'Ваш ответ' : lang === 'de' ? 'Deine Antwort' : 'Your answer'}
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-center font-mono text-lg font-bold text-white focus:outline-none focus:border-cyan-500"
          />

          {error && (
            <p className="text-xs text-rose-400 font-semibold text-center">
              {lang === 'ru' ? 'Неверный ответ! Попробуйте снова.' : lang === 'de' ? 'Falsche Antwort! Bitte versuche es erneut.' : 'Incorrect answer! Please try again.'}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            {t.verify}
          </button>
        </form>
      </div>
    </div>
  );
};
