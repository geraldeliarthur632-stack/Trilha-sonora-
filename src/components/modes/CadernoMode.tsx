import React, { useState, useEffect } from 'react';
import { CadernoTopic, CADERNO_SUBJECTS_INFO, CADERNO_TOPICS } from '../../data/cadernoData';
import { SubjectId, Question, UserProfile } from '../../types';
import { shuffleQuestionsList } from '../../data/curriculumData';
import { soundEffects } from '../../services/soundEffects';
import { VoiceAnswerController } from '../VoiceAnswerController';
import { speechNarrator } from '../../services/speechNarrator';
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  Volume2,
  Trophy,
  Award,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  CheckSquare,
  Bookmark,
  Layers,
  Zap,
  Mic,
  MicOff,
  Flame,
  Search,
} from 'lucide-react';

interface CadernoModeProps {
  user?: UserProfile;
  onBack: () => void;
  onEarnPoints: (points: number, isMajor?: boolean, correctCount?: number) => void;
  onOpenChessBoard?: () => void;
}

export const CadernoMode: React.FC<CadernoModeProps> = ({ onBack, onEarnPoints, onOpenChessBoard }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>('matematica');
  const [activeTopic, setActiveTopic] = useState<CadernoTopic>(() => {
    return CADERNO_TOPICS.find((t) => t.subjectId === 'matematica') || CADERNO_TOPICS[0];
  });
  const [searchQuery, setSearchQuery] = useState('');

  // 10 Questions Quiz State
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [isCurrentQuestionSkippedVoice, setIsCurrentQuestionSkippedVoice] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Filter topics
  const topicsForSubject = CADERNO_TOPICS.filter((t) => {
    const matchesSubject = t.subjectId === selectedSubjectId;
    if (!searchQuery) return matchesSubject;
    const q = searchQuery.toLowerCase();
    return (
      (matchesSubject || !selectedSubjectId) &&
      (t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.detailedTheory.some((line) => line.toLowerCase().includes(q)))
    );
  });

  const selectedSubject =
    CADERNO_SUBJECTS_INFO.find((s) => s.id === selectedSubjectId) || CADERNO_SUBJECTS_INFO[0];

  const [quizQuestions, setQuizQuestions] = useState<Question[]>(() =>
    shuffleQuestionsList(activeTopic.practiceQuestions || [])
  );

  useEffect(() => {
    setQuizQuestions(shuffleQuestionsList(activeTopic.practiceQuestions || []));
  }, [activeTopic.id]);

  const currentQuestions = quizQuestions.length > 0 ? quizQuestions : activeTopic.practiceQuestions || [];
  const currentQ: Question | undefined = currentQuestions[currentQuestionIndex];

  // Auto-speak question when quiz question is active and not submitted
  useEffect(() => {
    if (isQuizActive && currentQ && !isAnswerSubmitted && !isQuizCompleted) {
      const timer = setTimeout(() => {
        speechNarrator.speakQuestion({
          questionIndex: currentQuestionIndex,
          questionText: currentQ.question,
          options: currentQ.options || [],
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        speechNarrator.stop();
        setIsSpeaking(false);
      };
    }
  }, [isQuizActive, currentQuestionIndex, isAnswerSubmitted, isQuizCompleted, currentQ?.id]);

  const handleSelectSubject = (id: SubjectId) => {
    soundEffects.playClick();
    setSelectedSubjectId(id);
    const found = CADERNO_TOPICS.find((t) => t.subjectId === id);
    if (found) {
      setActiveTopic(found);
      setQuizQuestions(shuffleQuestionsList(found.practiceQuestions || []));
    }
  };

  const handleStart10Questions = () => {
    soundEffects.playClick();
    setQuizQuestions(shuffleQuestionsList(activeTopic.practiceQuestions || []));
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizCompleted(false);
    setIsCurrentQuestionSkippedVoice(false);
    setIsQuizActive(true);
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    soundEffects.playClick();
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted || !currentQ) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption === currentQ.correctIndex;
    if (isCorrect) {
      soundEffects.playCorrect('standard');
      setScore((prev) => prev + 1);
      onEarnPoints(10, false, 1);
    } else {
      soundEffects.playError();
    }
  };

  const handleNextQuestion = () => {
    soundEffects.playClick();
    speechNarrator.stop();
    setIsSpeaking(false);

    if (currentQuestionIndex + 1 < currentQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setIsCurrentQuestionSkippedVoice(false);
    } else {
      // Quiz finished
      soundEffects.playLevelUp();
      setIsQuizCompleted(true);
      onEarnPoints(score >= 7 ? 50 : 25, true, 0);
    }
  };

  const handleCannotSpeak = () => {
    soundEffects.playClick();
    setIsCurrentQuestionSkippedVoice(true);
  };

  const handleSpeakQuestion = () => {
    if (!currentQ) return;
    if (isSpeaking) {
      speechNarrator.stop();
      setIsSpeaking(false);
    } else {
      speechNarrator.speakQuestion({
        questionIndex: currentQuestionIndex,
        questionText: currentQ.question,
        options: currentQ.options || [],
        force: true,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3.5 sm:p-4 bg-slate-100 max-w-lg mx-auto w-full min-h-screen">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            soundEffects.playClick();
            speechNarrator.stop();
            if (isQuizActive) {
              setIsQuizActive(false);
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:bg-slate-50 transition font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isQuizActive ? 'Voltar ao Conteúdo' : 'Menu Principal'}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-full text-xs font-black shadow-xs">
          <Bookmark className="w-3.5 h-3.5 text-amber-700" />
          <span>Modo Caderno de Estudos</span>
        </div>
      </div>

      {/* 10 QUESTIONS QUIZ SCREEN */}
      {isQuizActive ? (
        <div className="flex-1 flex flex-col justify-between bg-white rounded-3xl p-4 border border-slate-200 shadow-sm animate-in fade-in">
          {!isQuizCompleted ? (
            <div>
              {/* Quiz Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">
                    Questão {currentQuestionIndex + 1} de {currentQuestions.length}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {activeTopic.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSpeakQuestion}
                    className={`p-1.5 rounded-xl border transition ${
                      isSpeaking
                        ? 'bg-blue-600 border-blue-700 text-white animate-pulse'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Ouvir questão em voz alta"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    ⭐ {score} acertos
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%`,
                  }}
                />
              </div>

              {/* Question Text Box */}
              {currentQ && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md uppercase">
                      {currentQ.questionType === 'true_false' || currentQ.isTrueFalse
                        ? '❓ Verdadeiro ou Falso'
                        : currentQ.questionType === 'voice_speech' || currentQ.isVoiceQuestion
                        ? '🎙️ Pergunta por Voz'
                        : '📝 Assinalar Alternativa'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">+10 XP</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-relaxed">
                    {currentQ.question}
                  </h3>
                </div>
              )}

              {/* Voice Answer Controller (With "Não consigo falar agora") */}
              {currentQ && !isCurrentQuestionSkippedVoice && (
                <div className="mb-3">
                  <VoiceAnswerController
                    options={currentQ.options || []}
                    selectedOption={selectedOption}
                    isAnswerSubmitted={isAnswerSubmitted}
                    onSelectOption={handleSelectOption}
                    onSubmitAnswer={handleSubmitAnswer}
                    onNextQuestion={handleNextQuestion}
                    onCannotSpeak={handleCannotSpeak}
                    isTrueFalse={
                      currentQ.questionType === 'true_false' ||
                      currentQ.isTrueFalse ||
                      (currentQ.options?.length === 2 &&
                        currentQ.options.some((o) => o.toLowerCase().includes('verdadeiro')))
                    }
                    promptVoicePhrase={currentQ.expectedVoicePhrases?.[0]}
                  />
                </div>
              )}

              {/* If skipped voice, show banner */}
              {isCurrentQuestionSkippedVoice && (
                <div className="mb-2.5 p-2 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium animate-in fade-in">
                  <span>🔇 Modo por voz desativado: assinale sua resposta abaixo.</span>
                  <button
                    onClick={() => setIsCurrentQuestionSkippedVoice(false)}
                    className="text-[11px] font-bold text-blue-700 hover:underline"
                  >
                    Reativar microfone
                  </button>
                </div>
              )}

              {/* Options: True/False vs Multiple Choice */}
              {currentQ && (
                <div className="space-y-2">
                  {currentQ.questionType === 'true_false' ||
                  currentQ.isTrueFalse ||
                  (currentQ.options?.length === 2 &&
                    currentQ.options.some((o) => o.toLowerCase().includes('verdadeiro'))) ? (
                    /* DUAL TRUE/FALSE BUTTONS */
                    <div className="grid grid-cols-2 gap-2.5">
                      {(currentQ.options || ['Verdadeiro (V)', 'Falso (F)']).map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = idx === currentQ.correctIndex;
                        const isVerdadeiro = opt.toLowerCase().includes('verdadeiro');

                        let optionStyles = isVerdadeiro
                          ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                          : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-900';

                        if (isAnswerSubmitted) {
                          if (isCorrect) {
                            optionStyles = 'bg-emerald-600 border-emerald-700 text-white font-bold shadow-md';
                          } else if (isSelected && !isCorrect) {
                            optionStyles = 'bg-rose-600 border-rose-700 text-white font-bold shadow-md';
                          } else {
                            optionStyles = 'bg-slate-100 border-slate-200 text-slate-400 opacity-50';
                          }
                        } else if (isSelected) {
                          optionStyles = isVerdadeiro
                            ? 'bg-emerald-600 border-emerald-700 text-white font-black shadow-md ring-2 ring-emerald-400'
                            : 'bg-rose-600 border-rose-700 text-white font-black shadow-md ring-2 ring-rose-400';
                        }

                        return (
                          <button
                            key={idx}
                            disabled={isAnswerSubmitted}
                            onClick={() => handleSelectOption(idx)}
                            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition active:scale-[0.98] ${optionStyles}`}
                          >
                            <span className="text-xl">{isVerdadeiro ? '✓' : '✗'}</span>
                            <span className="text-xs font-black">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* MULTIPLE CHOICE 4 ALTERNATIVES */
                    (currentQ.options || []).map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = idx === currentQ.correctIndex;
                      const letters = ['A', 'B', 'C', 'D'];

                      let optionStyles =
                        'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50 shadow-xs';

                      if (isAnswerSubmitted) {
                        if (isCorrect) {
                          optionStyles =
                            'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs';
                        } else if (isSelected && !isCorrect) {
                          optionStyles = 'bg-rose-50 border-rose-500 text-rose-950 shadow-xs';
                        } else {
                          optionStyles = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                        }
                      } else if (isSelected) {
                        optionStyles =
                          'bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-xs ring-1 ring-blue-600';
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isAnswerSubmitted}
                          onClick={() => handleSelectOption(idx)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition active:scale-[0.99] ${optionStyles}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                              {letters[idx]}
                            </span>
                            <span className="text-xs leading-snug">{opt}</span>
                          </div>
                          {isAnswerSubmitted && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {isAnswerSubmitted && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Explanation Box After Submit */}
              {isAnswerSubmitted && currentQ && (
                <div
                  className={`mt-3 p-3.5 rounded-2xl border text-xs leading-relaxed animate-in fade-in ${
                    selectedOption === currentQ.correctIndex
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black mb-1">
                    {selectedOption === currentQ.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Excelente! Resposta Correta</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Atenção à explicação pedagógica:</span>
                      </>
                    )}
                  </div>
                  <p>{currentQ.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            /* QUIZ COMPLETED SCREEN */
            <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center text-3xl shadow-lg border-4 border-white">
                {score >= 7 ? '🏆' : '📚'}
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {score >= 7 ? 'Parabéns pelo Desempenho!' : 'Treino de Fixação Concluído!'}
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  Você completou as 10 questões do conteúdo <strong>{activeTopic.title}</strong>.
                </p>
              </div>

              {/* Score Display Card */}
              <div className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Acertos:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {score} de {currentQuestions.length} ({Math.round((score / currentQuestions.length) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Pontos Ganhos:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    +{score * 10 + (score >= 7 ? 50 : 25)} XP
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-2">
                <button
                  onClick={handleStart10Questions}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Refazer as 10 Questões</span>
                </button>

                <button
                  onClick={() => setIsQuizActive(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
                >
                  Voltar para o Caderno Teórico
                </button>
              </div>
            </div>
          )}

          {/* Bottom Controls during Quiz */}
          {!isQuizCompleted && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              {!isAnswerSubmitted ? (
                <button
                  disabled={selectedOption === null}
                  onClick={handleSubmitAnswer}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>Confirmar Resposta</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>
                    {currentQuestionIndex + 1 < currentQuestions.length
                      ? 'Próxima Questão'
                      : 'Ver Resultado Final'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* CADERNO OVERVIEW & THEORY NOTEBOOK VIEW */
        <div className="flex-1 flex flex-col space-y-3">
          {/* Subjects Horizontal Scrolling Selector */}
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <div className="flex gap-1.5 min-w-max">
              {CADERNO_SUBJECTS_INFO.map((subj) => {
                const isSelected = subj.id === selectedSubjectId;
                return (
                  <button
                    key={subj.id}
                    onClick={() => handleSelectSubject(subj.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-2xs border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-102'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span>{subj.icon}</span>
                    <span>{subj.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Banner & Badge */}
          <div
            className={`p-3.5 rounded-2xl bg-gradient-to-r ${selectedSubject.bgGradient} text-white shadow-xs flex items-center justify-between`}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-base">{selectedSubject.icon}</span>
                <h2 className="text-sm font-black">{selectedSubject.name}</h2>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-white/20 backdrop-blur-xs text-white">
                  {selectedSubject.badge}
                </span>
              </div>
              <p className="text-xs text-white/90 leading-snug">{selectedSubject.description}</p>
            </div>
          </div>

          {/* Topic Content Card (Notebook Paper Style) */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4 relative overflow-hidden">
            {/* Lined Notebook Paper Top Header */}
            <div className="border-b-2 border-dashed border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg">{activeTopic.icon}</span>
                  <h3 className="text-base font-black text-slate-900">{activeTopic.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    {activeTopic.gradeStage}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    Nível: {activeTopic.difficulty}
                  </span>
                </div>
              </div>

              {/* BOTÃO PRINCIPAL: TABULEIRO INTERATIVO PARA XADREZ OU 10 QUESTÕES PARA OUTRAS MATÉRIAS */}
              {selectedSubjectId === 'xadrez' ? (
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    if (onOpenChessBoard) {
                      onOpenChessBoard();
                    } else {
                      handleStart10Questions();
                    }
                  }}
                  className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition active:scale-95 shrink-0 border border-slate-700"
                >
                  <span>♟️ Aprender no Tabuleiro</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>
              ) : (
                <button
                  onClick={handleStart10Questions}
                  className="py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition active:scale-95 shrink-0"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Praticar 10 Questões</span>
                </button>
              )}
            </div>

            {/* Summary Box */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed">
              💡 <strong>Resumo do Conteúdo:</strong> {activeTopic.summary}
            </div>

            {/* 1. Teoria Detalhada Passo a Passo */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wide">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>1. Explicação Teórica & Conceitos</span>
              </div>
              <div className="space-y-1.5 pl-2 border-l-2 border-blue-200">
                {activeTopic.detailedTheory.map((paragraph, idx) => (
                  <p key={idx} className="text-xs text-slate-700 leading-relaxed">
                    • {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* 2. Como Fazer (Passo a Passo Prático) */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wide">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>2. Como Fazer na Prática (Passo a Passo)</span>
              </div>
              <div className="grid gap-2">
                {activeTopic.howToDoStepByStep.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-start gap-2.5"
                  >
                    <span className="w-6 h-6 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {step.stepNumber}
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-950 mb-0.5">
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Exemplos Resolvidos e Comentados */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wide">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>3. Exemplos Resolvidos com Demonstração Completa</span>
              </div>
              <div className="space-y-3">
                {activeTopic.solvedExamples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">
                        Exemplo {idx + 1}
                      </span>
                      <span>{ex.problem}</span>
                    </div>

                    <div className="pl-3 border-l-2 border-blue-400 space-y-1 my-1.5">
                      {ex.resolutionSteps.map((step, sIdx) => (
                        <p key={sIdx} className="text-xs text-slate-600 font-mono">
                          {step}
                        </p>
                      ))}
                    </div>

                    <div className="p-2 bg-emerald-100/70 rounded-xl text-xs font-extrabold text-emerald-950 border border-emerald-200 flex items-center justify-between">
                      <span>Resultado Final:</span>
                      <span className="font-mono text-sm">{ex.finalAnswer}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      🎯 <strong>Dica Pedagógica:</strong> {ex.pedagogicalTip}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Regras de Ouro e Erros Comuns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
                  <span>⚡ Regras de Ouro</span>
                </h4>
                <ul className="space-y-1 text-[11px] text-amber-950 list-disc list-inside">
                  {activeTopic.goldenRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                <h4 className="text-xs font-extrabold text-rose-900 flex items-center gap-1">
                  <span>⚠️ Erros Mais Comuns</span>
                </h4>
                <ul className="space-y-1 text-[11px] text-rose-950 list-disc list-inside">
                  {activeTopic.commonMistakes.map((mistake, idx) => (
                    <li key={idx}>{mistake}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 5. BOTÃO DE DESTAQUE: TABULEIRO INTERATIVO PARA XADREZ OU 10 QUESTÕES PARA OUTRAS MATÉRIAS */}
            <div className="pt-2">
              {selectedSubjectId === 'xadrez' ? (
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    if (onOpenChessBoard) {
                      onOpenChessBoard();
                    } else {
                      handleStart10Questions();
                    }
                  }}
                  className="w-full py-4 px-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-sm font-black shadow-md flex items-center justify-center gap-2.5 transition active:scale-[0.99] group border border-slate-700"
                >
                  <span className="text-xl">♟️</span>
                  <span>Praticar Movimentos & Jogar no Tabuleiro Interativo</span>
                  <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition" />
                </button>
              ) : (
                <button
                  onClick={handleStart10Questions}
                  className="w-full py-4 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-sm font-black shadow-md flex items-center justify-center gap-2.5 transition active:scale-[0.99] group border border-amber-400/50"
                >
                  <Zap className="w-5 h-5 fill-white group-hover:scale-110 transition" />
                  <span>🎯 Fazer 10 Questões Deste Conteúdo (Assinalar, V/F & Voz)</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CadernoMode;
