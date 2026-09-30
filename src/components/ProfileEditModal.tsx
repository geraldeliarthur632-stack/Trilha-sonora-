import React, { useState, useEffect } from 'react';
import { UserProfile, GradeLevel } from '../types';
import { GRADE_LABELS } from '../data/curriculumData';
import { soundEffects } from '../services/soundEffects';
import { generateUniqueNames } from '../utils/nameGenerator';
import { THEMATIC_AVATARS, ThematicAvatar, getAvatarById, getAvatarByEmoji } from '../data/avatarGalleryData';
import { AvatarGalleryModal } from './AvatarGalleryModal';
import { X, Check, GraduationCap, Sparkles, RefreshCw, AlertCircle, Palette } from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave?: (updated: Partial<UserProfile>) => void;
  onSaveProfile?: (updated: Partial<UserProfile>) => void;
}

const AVATAR_OPTIONS = ['🎓', '🦁', '🚀', '⭐', '🦉', '⚡', '🦊', '👑', '🐉', '🎯', '🔥', '💎'];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  onSaveProfile,
}) => {
  const [name, setName] = useState(user.name);
  const [grade, setGrade] = useState<GradeLevel>(user.grade);
  const [avatar, setAvatar] = useState(user.avatar);
  const [avatarId, setAvatarId] = useState<string | undefined>(user.avatarId);
  const [error, setError] = useState('');
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setGrade(user.grade);
      setAvatar(user.avatar);
      setAvatarId(user.avatarId);
      setError('');
      setSuggestedNames(generateUniqueNames(4));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handlePickSuggestion = (sug: string) => {
    soundEffects.playClick();
    setName(sug);
    setError('');
  };

  const handleRefreshSuggestions = () => {
    soundEffects.playClick();
    setSuggestedNames(generateUniqueNames(4));
  };

  const handleSelectThematicAvatar = (av: ThematicAvatar) => {
    setAvatar(av.emoji);
    setAvatarId(av.id);
    setShowGallery(false);
  };

  const handleSave = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Por favor, informe seu nome ou escolha uma sugestão.');
      soundEffects.playError();
      return;
    }

    if (cleanName.length < 3) {
      setError('O nome precisa ter pelo menos 3 caracteres.');
      soundEffects.playError();
      return;
    }

    soundEffects.playClick();
    const updatedData = {
      name: cleanName,
      grade,
      avatar,
      avatarId,
    };
    if (onSave) onSave(updatedData);
    if (onSaveProfile) onSaveProfile(updatedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">Alterar Nome ou Apelido</h3>
            <p className="text-xs text-zinc-400">Ajuste seu nome, apelido, série e avatar</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Avatar picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-300 font-medium">Escolha seu Avatar</label>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setShowGallery(true);
                }}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
              >
                <Palette className="w-3 h-3" />
                <span>Galeria Completa de XP</span>
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 p-2 bg-zinc-950/60 rounded-xl border border-zinc-800">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setAvatar(emoji);
                  }}
                  className={`h-10 text-xl rounded-lg flex items-center justify-center transition ${
                    avatar === emoji
                      ? 'bg-blue-600/30 border-2 border-blue-400 scale-105'
                      : 'hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name input & Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-300 font-medium">Seu Nome / Apelido Único</label>
              <button
                type="button"
                onClick={handleRefreshSuggestions}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Novas Sugestões</span>
              </button>
            </div>
            <input
              type="text"
              value={name}
              maxLength={24}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex: Arthur, Maria..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-100 focus:outline-hidden focus:border-blue-500 text-sm"
            />

            {/* Suggestions */}
            {suggestedNames.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-zinc-400 font-semibold mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Nomes livres para usar:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedNames.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handlePickSuggestion(sug)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition ${
                        name === sug
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-purple-300 hover:border-purple-500'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-rose-400 text-[11px] mt-1.5 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Grade selection */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">Sua Série Escolar</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as GradeLevel)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            >
              {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABELS[g].full} ({GRADE_LABELS[g].stage})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium text-xs transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Check className="w-4 h-4" />
            Salvar Alterações
          </button>
        </div>
      </div>

      <AvatarGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        user={{ ...user, avatar, avatarId }}
        onSelectAvatar={handleSelectThematicAvatar}
      />
    </div>
  );
};

