import React from 'react';

interface VoiceAnswerControllerProps {
  options?: string[];
  selectedOption?: number | null;
  isAnswerSubmitted?: boolean;
  onSelectOption?: (index: number) => void;
  onSubmitAnswer?: () => void;
  onNextQuestion?: () => void;
  autoSubmitOnVoice?: boolean;
  onCannotSpeak?: () => void;
  isTrueFalse?: boolean;
  promptVoicePhrase?: string;
}

/**
 * Microphone functionality removed per user request.
 * Component renders null cleanly.
 */
export const VoiceAnswerController: React.FC<VoiceAnswerControllerProps> = () => {
  return null;
};
