import React, { useState, useEffect } from 'react';
import { UserProfile, GradeLevel } from '../types';
import { GRADE_LABELS } from '../data/curriculumData';
import { FirebaseService } from '../services/database/firebaseService';
import { soundEffects } from '../services/soundEffects';
import {
  X,
  Mail,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  User,
  LogOut,
  Sparkles,
  AlertCircle,
  KeyRound,
  GraduationCap,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updatedUser: Partial<UserProfile>) => void;
  onSyncSuccess?: () => void;
  onLogoutSuccess?: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

const AVATARS = ['🎓', '🦁', '🚀', '⭐', '🦉', '⚡', '🦊', '👑', '💎', '🔥'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onSyncSuccess,
  onLogoutSuccess,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [name, setName] = useState<string>(user.name && user.name !== 'Estudante' ? user.name : '');
  const [email, setEmail] = useState<string>(user.email || '');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(user.grade || '6_fund');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user.avatar || '🎓');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAuthMode('login');
      setName(user.name && user.name !== 'Estudante' ? user.name : '');
      setEmail(user.email || '');
      setPassword('');
      setConfirmPassword('');
      setSelectedGrade(user.grade || '6_fund');
      setSelectedAvatar(user.avatar || '🎓');
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowPassword(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentUser = FirebaseService.getCurrentUser();
  const isLoggedIn = Boolean(currentUser || user.userId);

  // ===================== 1. LOGIN COM GOOGLE =====================
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      soundEffects.playClick();
      const firebaseUser = await FirebaseService.loginWithGoogle();
      if (!firebaseUser) {
        throw new Error('Não foi possível obter os dados do usuário Google.');
      }

      const existingData = await FirebaseService.restoreProgress(firebaseUser.uid);

      if (existingData) {
        const updatedProfile: Partial<UserProfile> = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          name: existingData.name || firebaseUser.displayName || user.name,
          grade: (existingData.grade as GradeLevel) || user.grade,
          avatar: existingData.avatar || user.avatar,
          avatarId: existingData.avatarId || user.avatarId,
          totalPoints: Math.max(user.totalPoints || 0, existingData.totalPoints || 0),
          completedChallenges: Math.max(user.completedChallenges || 0, existingData.completedChallenges || 0),
          totalCorrectAnswers: Math.max(user.totalCorrectAnswers || 0, existingData.totalCorrectAnswers || 0),
          customSubjects: existingData.customSubjects || user.customSubjects,
          hasConfiguredSubjects: true,
          lastSyncedAt: new Date().toISOString(),
        };

        onUpdateUser(updatedProfile);
        await FirebaseService.syncProgress(firebaseUser.uid, updatedProfile);
      } else {
        const initialProfile: Partial<UserProfile> = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          name: firebaseUser.displayName || user.name || 'Estudante',
          grade: user.grade,
          avatar: user.avatar,
          avatarId: user.avatarId,
          totalPoints: user.totalPoints || 0,
          completedChallenges: user.completedChallenges || 0,
          totalCorrectAnswers: user.totalCorrectAnswers || 0,
          customSubjects: user.customSubjects,
          hasConfiguredSubjects: true,
          lastSyncedAt: new Date().toISOString(),
        };

        onUpdateUser(initialProfile);
        await FirebaseService.syncProgress(firebaseUser.uid, initialProfile);
      }

      soundEffects.playVictoryFanfare();
      setSuccessMessage('Conectado com o Google com sucesso!');
      onSyncSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setErrorMessage(msg);
      soundEffects.playError();
    } finally {
      setLoading(false);
    }
  };

  // ===================== 2. LOGIN COM E-MAIL E SENHA =====================
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Digite um e-mail válido.');
      return;
    }
    if (!password) {
      setErrorMessage('Digite sua senha.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      soundEffects.playClick();
      const firebaseUser = await FirebaseService.loginWithEmail(cleanEmail, password);
      if (!firebaseUser) {
        throw new Error('Falha ao autenticar.');
      }

      const existingData = await FirebaseService.restoreProgress(firebaseUser.uid);

      if (existingData) {
        const updatedProfile: Partial<UserProfile> = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || cleanEmail,
          name: existingData.name || firebaseUser.displayName || user.name,
          grade: (existingData.grade as GradeLevel) || user.grade,
          avatar: existingData.avatar || user.avatar,
          avatarId: existingData.avatarId || user.avatarId,
          totalPoints: Math.max(user.totalPoints || 0, existingData.totalPoints || 0),
          completedChallenges: Math.max(user.completedChallenges || 0, existingData.completedChallenges || 0),
          totalCorrectAnswers: Math.max(user.totalCorrectAnswers || 0, existingData.totalCorrectAnswers || 0),
          customSubjects: existingData.customSubjects || user.customSubjects,
          hasConfiguredSubjects: true,
          lastSyncedAt: new Date().toISOString(),
        };

        onUpdateUser(updatedProfile);
        await FirebaseService.syncProgress(firebaseUser.uid, updatedProfile);
      } else {
        const initialProfile: Partial<UserProfile> = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || cleanEmail,
          name: firebaseUser.displayName || user.name || 'Estudante',
          grade: user.grade,
          avatar: user.avatar,
          avatarId: user.avatarId,
          totalPoints: user.totalPoints || 0,
          completedChallenges: user.completedChallenges || 0,
          totalCorrectAnswers: user.totalCorrectAnswers || 0,
          customSubjects: user.customSubjects,
          hasConfiguredSubjects: true,
          lastSyncedAt: new Date().toISOString(),
        };

        onUpdateUser(initialProfile);
        await FirebaseService.syncProgress(firebaseUser.uid, initialProfile);
      }

      soundEffects.playVictoryFanfare();
      setSuccessMessage('Login realizado com sucesso! Seus dados foram carregados.');
      onSyncSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setErrorMessage(msg);
      soundEffects.playError();
    } finally {
      setLoading(false);
    }
  };

  // ===================== 3. CADASTRO COM E-MAIL E SENHA =====================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Estudante';
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Digite um e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      soundEffects.playClick();
      const firebaseUser = await FirebaseService.registerWithEmail(cleanEmail, password, cleanName);
      if (!firebaseUser) {
        throw new Error('Falha ao criar conta.');
      }

      const newProfile: Partial<UserProfile> = {
        userId: firebaseUser.uid,
        email: cleanEmail,
        name: cleanName,
        grade: selectedGrade,
        avatar: selectedAvatar,
        avatarId: user.avatarId,
        totalPoints: user.totalPoints || 0,
        completedChallenges: user.completedChallenges || 0,
        totalCorrectAnswers: user.totalCorrectAnswers || 0,
        customSubjects: user.customSubjects,
        hasConfiguredSubjects: true,
        lastSyncedAt: new Date().toISOString(),
      };

      onUpdateUser(newProfile);
      await FirebaseService.syncProgress(firebaseUser.uid, newProfile);

      soundEffects.playVictoryFanfare();
      setSuccessMessage('Conta criada com sucesso! Seus dados foram salvos.');
      onSyncSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setErrorMessage(msg);
      soundEffects.playError();
    } finally {
      setLoading(false);
    }
  };

  // ===================== 4. ESQUECI MINHA SENHA =====================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Digite um e-mail válido.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      soundEffects.playClick();
      await FirebaseService.sendPasswordReset(cleanEmail);
      soundEffects.playVictoryFanfare();
      setSuccessMessage('Enviamos um e-mail de recuperação de senha. Verifique sua caixa de entrada.');
      setLoading(false);
    } catch (err: any) {
      const msg = FirebaseService.formatAuthErrorMessage(err);
      setErrorMessage(msg);
      soundEffects.playError();
      setLoading(false);
    }
  };

  // ===================== 5. SINCRONIZAR =====================
  const handleManualSync = async () => {
    const uid = currentUser?.uid || user.userId;
    if (!uid) {
      setErrorMessage('Nenhum usuário conectado para sincronizar.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      soundEffects.playClick();
      const payload: Partial<UserProfile> = {
        name: user.name,
        grade: user.grade,
        avatar: user.avatar,
        avatarId: user.avatarId,
        totalPoints: user.totalPoints || 0,
        completedChallenges: user.completedChallenges || 0,
        totalCorrectAnswers: user.totalCorrectAnswers || 0,
        email: currentUser?.email || user.email,
        customSubjects: user.customSubjects,
        hasConfiguredSubjects: user.hasConfiguredSubjects,
      };

      const ok = await FirebaseService.syncProgress(uid, payload);
      if (ok) {
        onUpdateUser({ lastSyncedAt: new Date().toISOString() });
        soundEffects.playVictoryFanfare();
        setSuccessMessage('Progresso sincronizado com o banco de dados com sucesso!');
        onSyncSuccess?.();
      } else {
        throw new Error('Não foi possível sincronizar agora. Tente mais tarde.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao sincronizar dados.');
      soundEffects.playError();
    } finally {
      setLoading(false);
    }
  };

  // ===================== 6. LOGOUT =====================
  const handleLogout = async () => {
    setLoading(true);
    try {
      soundEffects.playClick();
      const uid = currentUser?.uid || user.userId;
      if (uid) {
        try {
          await FirebaseService.syncProgress(uid, {
            name: user.name,
            grade: user.grade,
            avatar: user.avatar,
            avatarId: user.avatarId,
            totalPoints: user.totalPoints,
            completedChallenges: user.completedChallenges,
            totalCorrectAnswers: user.totalCorrectAnswers,
            email: currentUser?.email || user.email,
            customSubjects: user.customSubjects,
            hasConfiguredSubjects: user.hasConfiguredSubjects,
          });
        } catch (syncErr) {
          console.warn('Aviso de sync ao sair:', syncErr);
        }
      }
      await FirebaseService.logout();
      onUpdateUser({ userId: undefined, email: undefined, photoURL: undefined });
      setSuccessMessage('Você saiu da conta. Seu progresso continua salvo no banco de dados!');
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage('Erro ao sair da conta: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isLoggedIn ? 'Minha Conta' : 'Acesso & Conta'}
              </h3>
              <p className="text-xs text-slate-500">
                {isLoggedIn ? 'Conectado no Firebase' : 'Entre com e-mail, senha ou Google'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEffects.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* ================= USUÁRIO LOGADO ================= */}
        {isLoggedIn ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center text-3xl shadow-xs overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.avatar || '🎓'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 truncate">
                      {user.name || currentUser?.displayName || 'Estudante'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Conectado
                    </span>
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold truncate">
                    {user.email || currentUser?.email || 'Conta vinculada'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {GRADE_LABELS[user.grade]?.full || 'Ensino Fundamental'}
                  </p>
                </div>
              </div>

              {/* Estatísticas salvas */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-200/50 text-center">
                <div className="p-2 bg-white/80 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-slate-500 font-bold block">Pontos XP</span>
                  <span className="text-sm font-black text-indigo-700">
                    {(user.totalPoints || 0).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="p-2 bg-white/80 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-slate-500 font-bold block">Acertos</span>
                  <span className="text-sm font-black text-emerald-700">{user.totalCorrectAnswers || 0}</span>
                </div>
                <div className="p-2 bg-white/80 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-slate-500 font-bold block">Desafios</span>
                  <span className="text-sm font-black text-purple-700">{user.completedChallenges || 0}</span>
                </div>
              </div>

              {user.lastSyncedAt && (
                <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>
                    Última sincronização:{' '}
                    {new Date(user.lastSyncedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Sincronizando...' : 'Sincronizar Progresso Agora'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= USUÁRIO NÃO LOGADO ================= */
          <div className="space-y-3.5">
            {/* Botão Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm rounded-xl shadow-2xs transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-50"
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
              <span>{loading ? 'Conectando...' : 'Continuar com Google'}</span>
            </button>

            {/* Divisor */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                ou com e-mail e senha
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Alternância de Abas: Entrar / Criar Conta */}
            {authMode !== 'forgot_password' && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Criar Conta
                </button>
              </div>
            )}

            {/* FORMULÁRIO 1: LOGIN */}
            {authMode === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
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

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Senha</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setAuthMode('forgot_password');
                        setErrorMessage(null);
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
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Entrando...' : 'Entrar na Conta'}</span>
                </button>
              </form>
            )}

            {/* FORMULÁRIO 2: CADASTRO */}
            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3 animate-in fade-in">
                {/* Escolha do Avatar */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Escolha seu avatar</label>
                  <div className="grid grid-cols-5 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          soundEffects.playClick();
                          setSelectedAvatar(emoji);
                        }}
                        className={`h-8 text-base rounded-lg flex items-center justify-center transition cursor-pointer ${
                          selectedAvatar === emoji
                            ? 'bg-indigo-100 border-2 border-indigo-600 scale-105'
                            : 'hover:bg-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Nome ou Apelido</span>
                  </label>
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

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
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

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Série Escolar</span>
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.entries(GRADE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label.short} ({label.full})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
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

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
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
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Criando Conta...' : 'Criar Conta'}</span>
                </button>
              </form>
            )}

            {/* FORMULÁRIO 3: RECUPERAR SENHA */}
            {authMode === 'forgot_password' && (
              <form onSubmit={handleForgotPassword} className="space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
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
                      setAuthMode('login');
                      setErrorMessage(null);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
