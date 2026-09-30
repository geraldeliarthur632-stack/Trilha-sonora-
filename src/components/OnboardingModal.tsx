import React, { useState, useEffect } from 'react';
import { GradeLevel, SubjectId, UserProfile } from '../types';
import { GRADE_LABELS, CONFIGURABLE_SPECIFIC_SUBJECTS } from '../data/curriculumData';
import { soundEffects } from '../services/soundEffects';
import { generateUniqueNames } from '../utils/nameGenerator';
import { FirebaseService } from '../services/database/firebaseService';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  RefreshCw,
  Check,
  Atom,
  Lock,
  Mail,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  user?: UserProfile;
  onUpdateUser?: (profile: Partial<UserProfile>) => void;
  onSaveProfile?: (profile: {
    name: string;
    grade: GradeLevel;
    avatar: string;
    customSubjects?: SubjectId[];
    hasConfiguredSubjects?: boolean;
    email?: string;
    userId?: string;
  }) => void;
  onComplete?: () => void;
  onClose?: () => void;
}

const AVATARS = ['🎓', '🦁', '🚀', '⭐', '🦉', '⚡', '🦊', '👑', '💎', '🔥'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  user,
  onUpdateUser,
  onSaveProfile,
  onComplete,
  onClose,
}) => {
  const [tab, setTab] = useState<'create' | 'login'>('create');
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Steps:
  // 1: Login / Cadastro com E-mail e Senha, Google ou Convidado
  // 'guest_name': Tela limpa para o convidado escolher nome e avatar
  // 2: Escolha de matérias escolares opcionais
  const [step, setStep] = useState<1 | 'guest_name' | 2>(1);

  // Campos de cadastro / login
  const [name, setName] = useState(user?.name && user.name !== 'Estudante' ? user.name : '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [grade, setGrade] = useState<GradeLevel>(user?.grade || '6_fund');
  const [avatar, setAvatar] = useState(user?.avatar || '🎓');
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>([]);

  // Estados de feedback e loading
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTab('create');
      setIsForgotPassword(false);
      setName(user?.name && user.name !== 'Estudante' ? user.name : '');
      setEmail(user?.email || '');
      setPassword('');
      setConfirmPassword('');
      setGuestName(user?.name && user.name !== 'Estudante' ? user.name : '');
      const initGrade = user?.grade || '6_fund';
      setGrade(initGrade);
      setAvatar(user?.avatar || '🎓');
      setError('');
      setSuccess('');
      setSuggestedNames(generateUniqueNames(4));
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (user?.customSubjects && user.customSubjects.length > 0) {
      setSelectedSubjects(user.customSubjects);
    } else {
      setSelectedSubjects([]);
    }
  }, [grade, user]);

  if (!isOpen) return null;

  const handlePickSuggestion = (sug: string) => {
    soundEffects.playClick();
    if (step === 'guest_name') {
      setGuestName(sug);
    } else {
      setName(sug);
    }
    setError('');
  };

  const handleRefreshSuggestions = () => {
    soundEffects.playClick();
    setSuggestedNames(generateUniqueNames(4));
  };

  const toggleSubject = (id: SubjectId) => {
    soundEffects.playClick();
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSelectSciencePack = () => {
    soundEffects.playClick();
    setSelectedSubjects(['biologia', 'fisica', 'quimica']);
  };

  const handleClearSciencePack = () => {
    soundEffects.playClick();
    setSelectedSubjects([]);
  };

  // ===================== 1. LOGIN COM GOOGLE =====================
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      soundEffects.playClick();
      const firebaseUser = await FirebaseService.loginWithGoogle();
      if (!firebaseUser) throw new Error('Não foi possível conectar com o Google.');

      const cloudData = await FirebaseService.restoreProgress(firebaseUser.uid);

      const resolvedName = cloudData?.name || firebaseUser.displayName || name || 'Estudante';
      const resolvedGrade = (cloudData?.grade as GradeLevel) || grade;
      const resolvedAvatar = cloudData?.avatar || avatar;
      const resolvedCustomSubjects = cloudData?.customSubjects || selectedSubjects;

      const profilePayload = {
        name: resolvedName,
        grade: resolvedGrade,
        avatar: resolvedAvatar,
        customSubjects: resolvedCustomSubjects,
        hasConfiguredSubjects: true,
        email: firebaseUser.email || undefined,
        userId: firebaseUser.uid,
        totalPoints: cloudData?.totalPoints || 0,
        completedChallenges: cloudData?.completedChallenges || 0,
        totalCorrectAnswers: cloudData?.totalCorrectAnswers || 0,
      };

      await FirebaseService.syncProgress(firebaseUser.uid, profilePayload);

      soundEffects.playVictoryFanfare();
      setSuccess('Conectado com o Google com sucesso!');

      if (onUpdateUser) {
        onUpdateUser(profilePayload);
      }

      if (!cloudData?.hasConfiguredSubjects) {
        setTimeout(() => {
          setLoading(false);
          setStep(2);
        }, 800);
      } else {
        setTimeout(() => {
          setLoading(false);
          if (onSaveProfile) onSaveProfile(profilePayload);
          if (onComplete) onComplete();
          if (onClose) onClose();
        }, 900);
      }
    } catch (err: any) {
      setLoading(false);
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setError(msg);
      soundEffects.playError();
    }
  };

  // ===================== 2. ENTRAR COMO CONVIDADO =====================
  const handleStartGuestFlow = () => {
    soundEffects.playClick();
    setError('');
    setSuccess('');
    if (!guestName && user?.name && user.name !== 'Estudante') {
      setGuestName(user.name);
    }
    setStep('guest_name');
  };

  const handleConfirmGuest = () => {
    const cleanName = guestName.trim() || 'Estudante';
    soundEffects.playSuccess();
    setError('');

    const profilePayload = {
      name: cleanName,
      grade,
      avatar: avatar || '🎓',
      customSubjects: selectedSubjects,
      hasConfiguredSubjects: true,
      email: undefined,
      userId: undefined,
    };

    if (onUpdateUser) {
      onUpdateUser(profilePayload);
    }
    if (onSaveProfile) {
      onSaveProfile(profilePayload);
    }
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  // ===================== 3. CADASTRO POR E-MAIL E SENHA =====================
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Estudante';
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Digite um e-mail válido.');
      soundEffects.playError();
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      soundEffects.playError();
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      soundEffects.playError();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      soundEffects.playClick();
      const firebaseUser = await FirebaseService.registerWithEmail(cleanEmail, password, cleanName);
      if (!firebaseUser) {
        throw new Error('Falha ao criar usuário.');
      }

      const profilePayload = {
        name: cleanName,
        grade,
        avatar,
        customSubjects: selectedSubjects,
        hasConfiguredSubjects: false,
        email: cleanEmail,
        userId: firebaseUser.uid,
        totalPoints: user?.totalPoints || 0,
        completedChallenges: user?.completedChallenges || 0,
        totalCorrectAnswers: user?.totalCorrectAnswers || 0,
      };

      await FirebaseService.syncProgress(firebaseUser.uid, profilePayload);

      soundEffects.playVictoryFanfare();
      setSuccess('Conta criada com sucesso!');

      if (onUpdateUser) {
        onUpdateUser(profilePayload);
      }

      setTimeout(() => {
        setLoading(false);
        setStep(2); // Avança para a etapa Matérias
      }, 700);
    } catch (err: any) {
      setLoading(false);
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setError(msg);
      soundEffects.playError();
    }
  };

  // ===================== 4. LOGIN POR E-MAIL E SENHA =====================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Digite um e-mail válido.');
      soundEffects.playError();
      return;
    }

    if (!password) {
      setError('Digite sua senha.');
      soundEffects.playError();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      soundEffects.playClick();
      const firebaseUser = await FirebaseService.loginWithEmail(cleanEmail, password);
      if (!firebaseUser) {
        throw new Error('Falha ao autenticar.');
      }

      const cloudData = await FirebaseService.restoreProgress(firebaseUser.uid);

      const resolvedName = cloudData?.name || firebaseUser.displayName || 'Estudante';
      const resolvedGrade = (cloudData?.grade as GradeLevel) || grade;
      const resolvedAvatar = cloudData?.avatar || avatar;
      const resolvedCustomSubjects = cloudData?.customSubjects || selectedSubjects;

      const profilePayload = {
        name: resolvedName,
        grade: resolvedGrade,
        avatar: resolvedAvatar,
        customSubjects: resolvedCustomSubjects,
        hasConfiguredSubjects: true,
        email: firebaseUser.email || cleanEmail,
        userId: firebaseUser.uid,
        totalPoints: cloudData?.totalPoints || 0,
        completedChallenges: cloudData?.completedChallenges || 0,
        totalCorrectAnswers: cloudData?.totalCorrectAnswers || 0,
      };

      soundEffects.playVictoryFanfare();
      setSuccess('Login realizado com sucesso!');

      if (onUpdateUser) {
        onUpdateUser(profilePayload);
      }

      if (!cloudData?.hasConfiguredSubjects) {
        setTimeout(() => {
          setLoading(false);
          setStep(2);
        }, 800);
      } else {
        setTimeout(() => {
          setLoading(false);
          if (onSaveProfile) onSaveProfile(profilePayload);
          if (onComplete) onComplete();
          if (onClose) onClose();
        }, 900);
      }
    } catch (err: any) {
      setLoading(false);
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setError(msg);
      soundEffects.playError();
    }
  };

  // ===================== 5. RECUPERAÇÃO DE SENHA =====================
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Digite um e-mail válido.');
      soundEffects.playError();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      soundEffects.playClick();
      await FirebaseService.sendPasswordReset(cleanEmail);
      soundEffects.playVictoryFanfare();
      setSuccess('Enviamos um link de recuperação para o seu e-mail!');
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setError(msg);
      soundEffects.playError();
    }
  };

  // ===================== FINALIZAÇÃO DO PASSO 2 (MATÉRIAS) =====================
  const handleFinalizeStep2 = async () => {
    soundEffects.playSuccess();
    try {
      localStorage.setItem('estudahud_subjects_prompted_once', 'true');
    } catch {}

    const cleanName = name.trim() || guestName.trim() || user?.name || 'Estudante';
    const profilePayload = {
      name: cleanName,
      grade,
      avatar,
      customSubjects: selectedSubjects,
      hasConfiguredSubjects: true,
      email: email.trim() || user?.email || undefined,
      userId: user?.userId,
    };

    if (onUpdateUser) {
      onUpdateUser(profilePayload);
    }

    const currentUid = FirebaseService.getCurrentUser()?.uid || user?.userId;
    if (currentUid) {
      FirebaseService.syncProgress(currentUid, profilePayload).catch(() => {});
    }

    if (onSaveProfile) {
      onSaveProfile(profilePayload);
    }
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  const scienceSubjects = CONFIGURABLE_SPECIFIC_SUBJECTS;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Step Indicator */}
        {step !== 'guest_name' && (
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {step === 1 ? '1' : '✓'}
              </span>
              <span className={step === 1 ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-semibold'}>
                Conta & Perfil
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                2
              </span>
              <span className={step === 2 ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-semibold'}>
                Matérias
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-bold">Passo {step} de 2</span>
          </div>
        )}

        {/* ================= TELA DE CONVIDADO ================= */}
        {step === 'guest_name' ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center text-3xl shadow-md mb-2.5">
                {avatar}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Como podemos chamar você?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Acesso como convidado • Sem necessidade de e-mail ou senha
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Escolha do Avatar */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                Escolha seu avatar
              </label>
              <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                {AVATARS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setAvatar(em);
                    }}
                    className={`h-9 text-lg rounded-xl flex items-center justify-center transition cursor-pointer ${
                      avatar === em
                        ? 'bg-indigo-600 text-white shadow-xs scale-105 ring-2 ring-indigo-400'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo Nome */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Digite seu nome ou apelido</span>
                </label>
                <button
                  type="button"
                  onClick={handleRefreshSuggestions}
                  className="text-[10px] text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sugerir</span>
                </button>
              </div>

              <input
                type="text"
                autoFocus
                maxLength={25}
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmGuest();
                  }
                }}
                placeholder="Ex: Pedro, Maria, Estudante10..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition shadow-2xs"
              />

              {suggestedNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestedNames.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handlePickSuggestion(sug)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                        guestName === sug
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-indigo-700 hover:border-indigo-400'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Escolha de Série */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Qual ano ou série você estuda?</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeLevel)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-indigo-500 font-medium cursor-pointer"
              >
                {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((g) => (
                  <option key={g} value={g}>
                    {GRADE_LABELS[g].short} ({GRADE_LABELS[g].full})
                  </option>
                ))}
              </select>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setError('');
                  setStep(1);
                }}
                className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmGuest}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
              >
                <span>Começar Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : step === 1 ? (
          /* ================= PASSO 1: E-MAIL E SENHA, GOOGLE E CONVIDADO ================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2.5 mb-1.5">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs border border-indigo-200 bg-indigo-950 flex items-center justify-center">
                  <img src="/app-logo.png" alt="Trilha do Saber" className="w-full h-full object-cover" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 leading-none">
                    <span className="text-lg font-black tracking-tight text-slate-900">Trilha</span>
                    <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 bg-clip-text text-transparent">
                      do Saber
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold">Aprenda se divertindo!</span>
                </div>
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1">
                {isForgotPassword
                  ? 'Recuperar Senha'
                  : tab === 'create'
                  ? 'Criar Nova Conta'
                  : 'Entrar na sua Conta'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isForgotPassword
                  ? 'Informe seu e-mail para receber as instruções'
                  : tab === 'create'
                  ? 'Cadastre-se com e-mail e senha para salvar seu progresso'
                  : 'Acesse seus pontos e continue de onde parou'}
              </p>
            </div>

            {/* Mensagens de Sucesso ou Erro */}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
            )}

            {/* Botões Rápidos: Google e Convidado */}
            {!isForgotPassword && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar com Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartGuestFlow}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Entrar como convidado (sem cadastro)</span>
                </button>
              </div>
            )}

            {/* Divisor */}
            {!isForgotPassword && (
              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  ou com e-mail e senha
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>
            )}

            {/* Alternância: Criar Nova Conta / Já Tenho Conta */}
            {!isForgotPassword && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setTab('create');
                    setError('');
                    setSuccess('');
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    tab === 'create'
                      ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Criar Nova Conta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setTab('login');
                    setError('');
                    setSuccess('');
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    tab === 'login'
                      ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Já Tenho Conta
                </button>
              </div>
            )}

            {/* FORMULÁRIO 1: RECUPERAR SENHA */}
            {isForgotPassword ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3 text-xs animate-in fade-in">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seu E-mail</span>
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setIsForgotPassword(false);
                      setError('');
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                  </button>
                </div>
              </form>
            ) : tab === 'create' ? (
              /* FORMULÁRIO 2: CRIAR NOVA CONTA */
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs animate-in fade-in">
                {/* Escolha do Avatar */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Escolha seu avatar
                  </label>
                  <div className="grid grid-cols-5 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {AVATARS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          soundEffects.playClick();
                          setAvatar(em);
                        }}
                        className={`h-8 text-base rounded-lg flex items-center justify-center transition cursor-pointer ${
                          avatar === em
                            ? 'bg-indigo-600 text-white shadow-2xs scale-105'
                            : 'hover:bg-slate-200'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nome ou apelido */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold flex items-center gap-1 text-[11px]">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Nome ou Apelido</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRefreshSuggestions}
                      className="text-[10px] text-purple-600 hover:underline font-bold cursor-pointer"
                    >
                      Sugerir
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Pedro Henrique"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1 text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>E-mail</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                {/* Série Escolar */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1 text-[11px]">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Série ou Ano</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as GradeLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((g) => (
                      <option key={g} value={g}>
                        {GRADE_LABELS[g].short} ({GRADE_LABELS[g].full})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Senhas */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1 text-[11px]">
                      <Lock className="w-3 h-3 text-indigo-600" />
                      <span>Senha</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mín. 6 dígitos"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1 text-[11px]">
                      <KeyRound className="w-3 h-3 text-indigo-600" />
                      <span>Confirmar</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Criando Conta...' : 'Criar Nova Conta e Começar'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* FORMULÁRIO 3: JÁ TENHO CONTA (LOGIN) */
              <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs animate-in fade-in">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>E-mail</span>
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Senha</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setIsForgotPassword(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha secreta"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Entrando...' : 'Entrar na Conta'}</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ================= PASSO 2: MATÉRIAS ESCOLARES ================= */
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📚</span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Matérias da sua Escola
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sua escola tem matérias específicas separadas como <strong>Biologia, Física e Química</strong>?
                Selecione abaixo para adicioná-las aos seus estudos:
              </p>
            </div>

            {/* Ciências Específicas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                  <Atom className="w-3.5 h-3.5" />
                  <span>Ciências da Natureza Específicas</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectSciencePack}
                    className="text-[11px] text-indigo-600 hover:underline font-bold cursor-pointer"
                  >
                    Marcar as 3
                  </button>
                  <span className="text-slate-400">•</span>
                  <button
                    type="button"
                    onClick={handleClearSciencePack}
                    className="text-[11px] text-slate-500 hover:underline font-bold cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {scienceSubjects.map((s) => {
                  const isChecked = selectedSubjects.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-xs font-bold block">{s.name}</span>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              💡 As matérias básicas (Matemática, Português, Ciências geral, História, Geografia e Inglês) já vêm garantidas.
            </p>

            {/* Ações Passo 2 */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setStep(1);
                }}
                className="px-3.5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeStep2}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
              >
                <span>Concluir e Começar</span>
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
