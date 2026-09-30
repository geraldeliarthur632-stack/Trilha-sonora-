import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { soundEffects } from '../services/soundEffects';
import {
  Sparkles,
  Flame,
  Trophy,
  BookOpen,
  Calendar,
  X,
  CheckCircle2,
  Moon,
  Sun,
  Download,
  SlidersHorizontal,
  LayoutGrid,
  HelpCircle,
  Volume2,
  Cloud,
  UserCheck,
  User,
} from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onEditProfile: () => void;
  onGoHome?: () => void;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
  onOpenIntroAudio?: () => void;
  onOpenCalendar?: () => void;
  onOpenCaderno?: () => void;
  onOpenTrophiesAndBadges?: (tab?: 'trophies' | 'badges') => void;
  onOpenReportCard?: () => void;
  onOpenInstallApp?: () => void;
  onOpenOfflineAccess?: () => void;
  onOpenPdfSummaries?: () => void;
  onOpenErrorFeedback?: () => void;
  onOpenSubjectCustomization?: () => void;
  onOpenMoreApps?: () => void;
  onOpenFaq?: () => void;
  onOpenAppExplanation?: () => void;
  isLevelUpActive?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onGoHome,
  onOpenCalendar,
  onOpenTrophiesAndBadges,
  onOpenInstallApp,
  onOpenOfflineAccess,
  onOpenPdfSummaries,
  onOpenErrorFeedback,
  onOpenSubjectCustomization,
  onOpenMoreApps,
  onOpenFaq,
  onOpenAppExplanation,
  onOpenAuth,
  theme = 'light',
  onToggleTheme,
}) => {
  const isCloudSynced = Boolean(user.userId || user.email);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center justify-between max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full">
        {/* Brand Logo: Trilha do Saber */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playClick();
            if (onGoHome) onGoHome();
          }}
          className="flex items-center gap-2 select-none shrink-0 group text-left cursor-pointer hover:opacity-90 transition active:scale-98"
          title="Ir para o início"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm shadow-indigo-200/50 flex items-center justify-center transition-transform group-hover:scale-105 border border-indigo-200/60 bg-indigo-950">
            <img src="/app-logo.png" alt="Trilha do Saber" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Trilha</span>
            <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 bg-clip-text text-transparent">
              do Saber
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-indigo-600 shadow-xs ml-0.5 animate-pulse hidden sm:inline-block" />
        </button>

        {/* Action icons on the right: More Apps, Install App */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Botão Mais Apps & Jogos */}
          {onOpenMoreApps && (
            <button
              onClick={() => {
                soundEffects.playClick();
                onOpenMoreApps();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs text-xs font-black transition active:scale-95 group cursor-pointer border border-purple-400/30"
              title="Mais Apps & Jogos Educativos"
              aria-label="Mais Apps e Jogos"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-white group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-black">Mais Apps</span>
            </button>
          )}

          {/* Botão de Instalar App */}
          {onOpenInstallApp && (
            <button
              onClick={() => {
                soundEffects.playClick();
                onOpenInstallApp();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-xs text-xs font-bold transition active:scale-95 group cursor-pointer"
              title="Instalar Aplicativo"
              aria-label="Instalar Aplicativo"
            >
              <Download className="w-3.5 h-3.5 text-white group-hover:translate-y-0.5 transition" />
              <span className="text-xs font-black hidden sm:inline">Instalar App</span>
              <span className="text-[11px] font-black sm:hidden">Instalar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

