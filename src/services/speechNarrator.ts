export interface NarrationSegment {
  text: string;
  charStart?: number;
  charEnd?: number;
}

export const APP_INTRO_SEGMENTS: { text: string }[] = [
  {
    text: "Olá estudante! Bem-vindo à Trilha do Saber, seu aplicativo de estudos escolares e desafios do conhecimento!",
  },
  {
    text: "O aplicativo explica cada matéria com texto didático e voz clara antes de você responder às perguntas de fixação.",
  },
  {
    text: "Pratique com 10 questões perfeitas alinhadas à sua série escolar com leitura automática por voz na velocidade dinâmica.",
  },
  {
    text: "Explore Flashcards interativos e a Central de Jogos com Caça Palavras, Palavras Cruzadas, Quebra Cabeça e Xadrez!",
  },
];

export const APP_INTRO_TEXT = APP_INTRO_SEGMENTS.map(s => s.text).join(' ');

class SpeechNarratorService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private autoNarrateEnabled: boolean = true;
  private activeUtterancesSet: Set<SpeechSynthesisUtterance> = new Set();
  private onBeforeSpeakHooks: (() => void)[] = [];
  private currentSpeechSessionId: number = 0;
  private keepAliveInterval: any = null;

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('estudahud_auto_narrate');
        this.autoNarrateEnabled = saved !== 'false';

        // Keep persistent reference on window to prevent browser garbage collection of active utterances
        (window as any).__speechNarratorUtterances = this.activeUtterancesSet;

        if ('speechSynthesis' in window && window.speechSynthesis) {
          this.loadVoices();
          window.speechSynthesis.onvoiceschanged = () => {
            this.loadVoices();
          };
        }
      }
    } catch {
      // Ignored for iframe sandbox
    }
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    // Previne congelamento do motor de síntese em falas longas no Chrome/Android
    // Apenas envia um pulso suave de resume sem forçar pause abrupto que corta a voz
    this.keepAliveInterval = setInterval(() => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
          if (this.isSpeaking && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }
      } catch {}
    }, 5000);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private loadVoices() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        this.voices = window.speechSynthesis.getVoices() || [];
      }
    } catch {
      this.voices = [];
    }
  }

  /**
   * Garante que as vozes do sistema estejam carregadas antes de sintetizar fala
   */
  public async ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) {
      return [];
    }
    if (this.voices.length > 0) {
      return this.voices;
    }
    this.loadVoices();
    if (this.voices.length > 0) {
      return this.voices;
    }

    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.loadVoices();
          resolve(this.voices);
        }
      }, 350);

      const handler = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.loadVoices();
          resolve(this.voices);
        }
      };

      try {
        window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
      } catch {
        window.speechSynthesis.onvoiceschanged = handler;
      }
    });
  }

  /**
   * Registra callback a ser disparado antes de qualquer fala
   * (ex: para liberar microfone de reconhecimento de fala e evitar colisão de hardware)
   */
  public registerOnBeforeSpeak(hook: () => void) {
    this.onBeforeSpeakHooks.push(hook);
  }

  private triggerBeforeSpeak() {
    this.onBeforeSpeakHooks.forEach((hook) => {
      try {
        hook();
      } catch {}
    });
  }

  public splitTextIntoChunks(text: string, maxChunkLength: number = 240): string[] {
    if (!text) return [];

    // Limpa quebras de linhas estranhas e substitui pontuação isolada
    const normalized = text.replace(/\r\n/g, '\n').replace(/\n+/g, ' ');
    
    // Divide por pontuação final mantendo a pontuação na frase para entonação natural
    const rawSentences = normalized
      .replace(/([.?!;:])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|');

    const chunks: string[] = [];

    for (const rawSentence of rawSentences) {
      const sentence = rawSentence.trim();
      if (!sentence) continue;

      if (sentence.length <= maxChunkLength) {
        chunks.push(sentence);
      } else {
        // Divide por vírgulas ou travessões se a sentença for longa
        const clauses = sentence
          .replace(/([,:–—])\s+/g, '$1|SUB|')
          .split('|SUB|');

        let currentSubChunk = '';
        for (const clause of clauses) {
          const trimmedClause = clause.trim();
          if (!trimmedClause) continue;

          if ((currentSubChunk + ' ' + trimmedClause).trim().length <= maxChunkLength) {
            currentSubChunk = (currentSubChunk + ' ' + trimmedClause).trim();
          } else {
            if (currentSubChunk) {
              chunks.push(currentSubChunk);
            }
            if (trimmedClause.length <= maxChunkLength) {
              currentSubChunk = trimmedClause;
            } else {
              // Divide por palavras caso ainda ultrapasse
              const words = trimmedClause.split(/\s+/);
              let wordChunk = '';
              for (const word of words) {
                if ((wordChunk + ' ' + word).trim().length <= maxChunkLength) {
                  wordChunk = (wordChunk + ' ' + word).trim();
                } else {
                  if (wordChunk) chunks.push(wordChunk);
                  wordChunk = word;
                }
              }
              currentSubChunk = wordChunk;
            }
          }
        }
        if (currentSubChunk) {
          chunks.push(currentSubChunk);
        }
      }
    }

    return chunks.length > 0 ? chunks : [text.trim()];
  }

  public isAutoNarrateEnabled(): boolean {
    return this.autoNarrateEnabled;
  }

  public setAutoNarrateEnabled(enabled: boolean) {
    this.autoNarrateEnabled = enabled;
    try {
      localStorage.setItem('estudahud_auto_narrate', String(enabled));
    } catch {}
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Sanitizes, cleans and formats text for natural, fluent speech in Portuguese TTS.
   * Eliminates unwanted pronunciations (e.g. reading hyphens in compound words as "menos",
   * asterisks in markdown as "vezes", bullet dashes as "menos", slashes as "sobre", etc.)
   */
  public formatMathForSpeech(rawText: string): string {
    if (!rawText) return '';

    let text = rawText;

    // 1. Clean Markdown formatting, tags & HTML
    text = text
      .replace(/<[^>]+>/g, ' ') // Strip HTML tags
      .replace(/\[MATH\]([\s\S]*?)\[\/MATH\]/gi, '$1') // Extract Math content
      .replace(/\[IMAGE[^\]]*\]/gi, '') // Remove image tags
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // Remove markdown images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code ticks
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold **text**
      .replace(/__([^_]+)__/g, '$1') // Remove bold __text__
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1') // Remove single italic *text*
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '$1') // Remove single italic _text_
      .replace(/^#{1,6}\s+/gm, '') // Remove heading hashes
      .replace(/^[ \t]*[-*•–—]\s+/gm, ''); // Remove bullet points at line starts (don't say "menos" or "vezes")

    // 1.5. Fix abbreviations such as 'etc.', 'etc', 'e etc' to sound natural in Portuguese TTS
    // (Prevents robotic "é-tê-cê" or weird pronunciations)
    text = text
      .replace(/\be\s+etc\.?(?!\w)/gi, 'e assim por diante')
      .replace(/\betc\.?(?!\w)/gi, 'e assim por diante')
      .replace(/\be\s+outros\s+etc/gi, 'e outros semelhantes')
      .replace(/\b(p\.\s*ex\.|ex\.:|ex:)\b/gi, 'por exemplo')
      .replace(/\bobs\.:|\bobs:\b/gi, 'observação:')
      .replace(/\baprox\.\b/gi, 'aproximadamente')
      .replace(/\bvs\.?\b/gi, 'versus')
      .replace(/\bcap\.\s*(\d+)/gi, 'capítulo $1')
      .replace(/\bpágs?\.\s*(\d+)/gi, 'página $1')
      .replace(/\bart\.\s*(\d+)/gi, 'artigo $1')
      .replace(/\bnº\s*(\d+)/gi, 'número $1')
      .replace(/\bdr\.\s+/gi, 'doutor ')
      .replace(/\bdra\.\s+/gi, 'doutora ')
      .replace(/\bprof\.\s+/gi, 'professor ')
      .replace(/\bprofa\.\s+/gi, 'professora ');

    // 2. Fix compound words and hyphens between Portuguese words/prefixes
    // IMPORTANT: Most TTS engines (Chrome, Android, Google TTS) pronounce the '-' character as the word "menos"!
    // Therefore, "quebra-cabeça" was being read aloud as "quebra menos cabeça".
    // Replacing hyphens between Portuguese words with a simple space ensures 100% natural fluent speech
    // without ever saying "menos".
    // Explicit known compound terms:
    text = text
      .replace(/\bquebra[-–—\s]*cabeça(s?)\b/gi, 'quebra cabeça$1')
      .replace(/\bpasso[-–—\s]*a[-–—\s]*passo\b/gi, 'passo a passo')
      .replace(/\bdia[-–—\s]*a[-–—\s]*dia\b/gi, 'dia a dia')
      .replace(/\bponto[-–—\s]*a[-–—\s]*ponto\b/gi, 'ponto a ponto')
      .replace(/\blado[-–—\s]*a[-–—\s]*lado\b/gi, 'lado a lado')
      .replace(/\bfrente[-–—\s]*a[-–—\s]*frente\b/gi, 'frente a frente')
      .replace(/\bcara[-–—\s]*a[-–—\s]*cara\b/gi, 'cara a cara')
      .replace(/\bbem[-–—\s]*vindo(s?)\b/gi, 'bem vindo$1')
      .replace(/\bbem[-–—\s]*vinda(s?)\b/gi, 'bem vinda$1')
      .replace(/\bguarda[-–—\s]*chuva(s?)\b/gi, 'guarda chuva$1')
      .replace(/\bguarda[-–—\s]*roupa(s?)\b/gi, 'guarda roupa$1')
      .replace(/\bguarda[-–—\s]*sol\b/gi, 'guarda sol')
      .replace(/\barco[-–—\s]*íris\b/gi, 'arco íris')
      .replace(/\bmeio[-–—\s]*ambiente\b/gi, 'meio ambiente')
      .replace(/\bmatéria[-–—\s]*prima(s?)\b/gi, 'matéria prima$1')
      .replace(/\bsegunda[-–—\s]*feira\b/gi, 'segunda feira')
      .replace(/\bterça[-–—\s]*feira\b/gi, 'terça feira')
      .replace(/\bquarta[-–—\s]*feira\b/gi, 'quarta feira')
      .replace(/\bquinta[-–—\s]*feira\b/gi, 'quinta feira')
      .replace(/\bsexta[-–—\s]*feira\b/gi, 'sexta feira')
      .replace(/\bfim[-–—\s]*de[-–—\s]*semana\b/gi, 'fim de semana')
      .replace(/\bpós[-–—\s]*graduação\b/gi, 'pós graduação')
      .replace(/\bpré[-–—\s]*história\b/gi, 'pré história')
      .replace(/\bauto[-–—\s]*avaliação\b/gi, 'auto avaliação');

    // General rule for ANY compound word or hyphenated Portuguese words:
    // Replace hyphen with space so TTS engine will NOT pronounce "menos".
    text = text.replace(
      /\b([a-zA-ZÀ-ÿ]+)\s*[-–—]\s*([a-zA-ZÀ-ÿ]+)\b/gi,
      '$1 $2'
    );

    // 3. Fix ranges like "anos 1930 - 1945", "páginas 10 - 20", "séculos V - X"
    text = text.replace(/(\b(?:de|anos|ano|páginas|página|século|séculos|fase|etapa|nível)\s+\d+)\s*[-–—]\s*(\d+\b)/gi, '$1 a $2');
    text = text.replace(/\b(\d{4})\s*[-–—]\s*(\d{4})\b/g, '$1 a $2');

    // 3.5. Math subtraction between numbers or algebraic variables BEFORE separator dashes
    // e.g. "5 - 3" -> "5 menos 3", "x - 4" -> "x menos 4"
    text = text.replace(/(\d+)\s*[-−]\s*(\d+)/g, '$1 menos $2');
    text = text.replace(/\b([xyzXYZ])\s*[-−]\s*(\d+|[xyzXYZ])\b/g, '$1 menos $2');
    text = text.replace(/(\d+)\s*[-−]\s*([xyzXYZ])\b/g, '$1 menos $2');

    // 4. Fix dashes used as separators or pauses between phrases/sentences (e.g. "Let's Study - seu app", "Módulo 1 - Introdução")
    text = text.replace(/\s+[-–—]\s+/g, ', ');

    // 5. Units of measurement and science symbols
    text = text
      .replace(/\bkm\/h\b/gi, 'quilômetros por hora')
      .replace(/\bm\/s\b/gi, 'metros por segundo')
      .replace(/\bcm²\b/gi, 'centímetros quadrados')
      .replace(/\bm²\b/gi, 'metros quadrados')
      .replace(/\bkm²\b/gi, 'quilômetros quadrados')
      .replace(/\bcm³\b/gi, 'centímetros cúbicos')
      .replace(/\bm³\b/gi, 'metros cúbicos')
      .replace(/(\d+)\s*°\s*C\b/gi, '$1 graus Celsius')
      .replace(/(\d+)\s*º\s*C\b/gi, '$1 graus Celsius')
      .replace(/(\d+)\s*°\s*F\b/gi, '$1 graus Fahrenheit')
      .replace(/(\d+)\s*%/g, '$1 por cento')
      .replace(/%/g, ' por cento');

    // 6. Common fractions pronunciation
    text = text
      .replace(/\b1\/2\b/g, 'um meio')
      .replace(/\b1\/3\b/g, 'um terço')
      .replace(/\b2\/3\b/g, 'dois terços')
      .replace(/\b1\/4\b/g, 'um quarto')
      .replace(/\b3\/4\b/g, 'três quartos')
      .replace(/\b1\/5\b/g, 'um quinto')
      .replace(/\b2\/5\b/g, 'dois quintos')
      .replace(/\b3\/5\b/g, 'três quintos')
      .replace(/\b4\/5\b/g, 'quatro quintos')
      .replace(/\b1\/6\b/g, 'um sexto')
      .replace(/\b5\/6\b/g, 'cinco sextos')
      .replace(/\b1\/8\b/g, 'um oitavo')
      .replace(/\b3\/8\b/g, 'três oitavos')
      .replace(/\b5\/8\b/g, 'cinco oitavos')
      .replace(/\b7\/8\b/g, 'sete oitavos')
      .replace(/\b1\/10\b/g, 'um décimo')
      .replace(/\b(\d+)\/(\d+)\b/g, '$1 sobre $2');

    // 7. Math powers, roots and symbols
    text = text
      .replace(/x²/gi, 'x ao quadrado')
      .replace(/x³/gi, 'x ao cubo')
      .replace(/(\d+)²/g, '$1 ao quadrado')
      .replace(/(\d+)³/g, '$1 ao cubo')
      .replace(/(\d+)\^2/g, '$1 ao quadrado')
      .replace(/(\d+)\^3/g, '$1 ao cubo')
      .replace(/√(\d+)/g, 'raiz quadrada de $1')
      .replace(/√\(([^)]+)\)/g, 'raiz quadrada de $1')
      .replace(/π/g, ' pi ')
      .replace(/≠/g, ' diferente de ')
      .replace(/≤/g, ' menor ou igual a ')
      .replace(/≥/g, ' maior ou igual a ')
      .replace(/±/g, ' mais ou menos ')
      .replace(/∞/g, ' infinito ');

    // 8. Math operations: multiplication, division, addition, subtraction ONLY in math contexts
    // Multiplication: 5 × 3, 5 * 3, 2x * 3
    text = text.replace(/(\d+|[a-zA-Z])\s*×\s*(\d+|[a-zA-Z])/g, '$1 vezes $2');
    text = text.replace(/(\d+)\s*\*\s*(\d+)/g, '$1 vezes $2');
    text = text.replace(/\s*÷\s*/g, ' dividido por ');

    // Addition: 5 + 3, x + 2
    text = text.replace(/(\d+|[a-zA-Z])\s*\+\s*(\d+|[a-zA-Z])/g, '$1 mais $2');

    // Subtraction / Negative Numbers in Math:
    // Strictly between numbers or isolated algebraic variables (e.g. "5 - 3", "x - 4", "10 - 2 = 8")
    // NEVER match general letters in words!
    text = text.replace(/(\d+)\s*[-−]\s*(\d+)/g, '$1 menos $2');
    text = text.replace(/\b([xyzXYZ])\s*[-−]\s*(\d+|[xyzXYZ])\b/g, '$1 menos $2');
    text = text.replace(/(\d+)\s*[-−]\s*([xyzXYZ])\b/g, '$1 menos $2');
    // Negative sign before number after equals, bracket or at start of line
    text = text.replace(/(?<=[=([+\-*/]\s*)[-−](\d+)/g, 'menos $1');
    text = text.replace(/^[-−](\d+)/gm, 'menos $1');

    // Equals sign in math formulas (e.g. "2 + 2 = 4" -> "2 + 2 igual a 4")
    text = text.replace(/(\d+|[a-zA-Z])\s*=\s*(\d+|[a-zA-Z])/g, '$1 igual a $2');

    // 9. Clean multiple whitespace
    text = text.replace(/[ \t]+/g, ' ').trim();

    return text;
  }

  public getDefaultRate(): number {
    try {
      if (typeof window !== 'undefined' && localStorage) {
        const saved = localStorage.getItem('estudahud_speech_rate');
        if (saved === 'slow') return 0.8;
        if (saved === 'normal') return 1.0;
        if (saved === 'fast') return 1.2;
        if (saved === 'dynamic') return 1.0;
      }
    } catch {}
    return 1.0; // Velocidade padrão: 1.0x (Normal)
  }

  public getAvailablePortugueseVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    const ptBrVoices = this.voices.filter(
      (v) =>
        v.lang &&
        (v.lang.toLowerCase().replace('_', '-') === 'pt-br' ||
          v.lang.toLowerCase().startsWith('pt-br') ||
          v.name.toLowerCase().includes('brasil') ||
          v.name.toLowerCase().includes('brazil'))
    );
    return ptBrVoices.length > 0
      ? ptBrVoices
      : this.voices.filter((v) => v.lang && (v.lang.toLowerCase().startsWith('pt') || v.name.toLowerCase().includes('portug')));
  }

  public setPreferredVoice(voiceName: string) {
    try {
      if (typeof window !== 'undefined' && localStorage) {
        localStorage.setItem('estudahud_preferred_voice', voiceName);
      }
    } catch {}
  }

  public getPreferredVoiceName(): string {
    try {
      if (typeof window !== 'undefined' && localStorage) {
        return localStorage.getItem('estudahud_preferred_voice') || '';
      }
    } catch {}
    return '';
  }

  public getBestPortugueseVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    const candidates = this.getAvailablePortugueseVoices();

    if (candidates.length > 0) {
      // 1. Verifica se há uma voz salva na preferência do usuário
      const savedPref = this.getPreferredVoiceName();
      if (savedPref) {
        const customVoice = candidates.find(
          (v) => v.name === savedPref || v.voiceURI === savedPref || v.name.toLowerCase().includes(savedPref.toLowerCase())
        );
        if (customVoice) return customVoice;
      }

      // 2. Mudança de voz padrão: prioriza vozes mais novas, naturais e expressivas em PT-BR
      const preferredVoicesOrder = [
        'Luciana',
        'Heloisa',
        'Camila',
        'Brenda',
        'Google português do Brasil',
        'Google Português',
        'Google pt-BR',
        'Felipe',
        'Daniel',
        'Antonio',
        'Letícia',
        'Leticia',
        'Yara',
        'Natural',
        'Francisca',
        'Maria',
      ];

      for (const pref of preferredVoicesOrder) {
        const found = candidates.find((v) => v.name.toLowerCase().includes(pref.toLowerCase()));
        if (found) return found;
      }

      return candidates[0];
    }
    return null;
  }

  public speak(
    text: string,
    onStartOrEnd?:
      | (() => void)
      | {
          onStart?: () => void;
          onEnd?: () => void;
          onBoundary?: (charIndex: number) => void;
          rate?: number;
        },
    onEnd?: () => void,
    onBoundary?: (charIndex: number) => void,
    rate?: number
  ) {
    let actualStart: (() => void) | undefined;
    let actualEnd: (() => void) | undefined;
    let actualBoundary: ((charIndex: number) => void) | undefined = onBoundary;
    const defaultRate = this.getDefaultRate();
    let actualRate: number = rate || defaultRate;

    if (typeof onStartOrEnd === 'object' && onStartOrEnd !== null) {
      actualStart = onStartOrEnd.onStart;
      actualEnd = onStartOrEnd.onEnd;
      actualBoundary = onStartOrEnd.onBoundary || onBoundary;
      actualRate = onStartOrEnd.rate || rate || defaultRate;
    } else if (typeof onStartOrEnd === 'function') {
      if (typeof onEnd === 'function') {
        actualStart = onStartOrEnd;
        actualEnd = onEnd;
      } else {
        // Se fornecido apenas 1 callback no codebase, trata como onEnd (ex: () => setIsSpeaking(false))
        actualEnd = onStartOrEnd;
      }
    }

    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) {
        actualStart?.();
        setTimeout(() => actualEnd?.(), 1500);
        return;
      }

      // Interrompe qualquer escuta de microfone para evitar conflito de hardware e eco
      this.triggerBeforeSpeak();

      // Cancela fala anterior e avança sessão de fala
      this.stop();

      const sanitizedText = this.formatMathForSpeech(text);
      if (!sanitizedText.trim()) {
        actualEnd?.();
        return;
      }

      this.currentSpeechSessionId++;
      const sessionId = this.currentSpeechSessionId;

      // Inicia keep-alive não agressivo para evitar congelamento pelo navegador
      this.startKeepAlive();

      // Divide o texto em blocos naturais confortáveis (~280 caracteres) para síntese contínua e sem cortes
      const chunks = this.splitTextIntoChunks(sanitizedText, 280);
      if (chunks.length === 0) {
        this.stopKeepAlive();
        actualEnd?.();
        return;
      }

      let chunkIndex = 0;
      let hasTriggeredStart = false;

      // Resposta instantânea de UI sem aguardar o atraso de hardware do browser
      this.isSpeaking = true;

      const speakNextChunk = () => {
        if (this.currentSpeechSessionId !== sessionId) {
          return; // Sessão foi interrompida ou substituída por nova fala
        }

        if (chunkIndex >= chunks.length) {
          this.isSpeaking = false;
          this.stopKeepAlive();
          this.activeUtterancesSet.clear();
          actualEnd?.();
          return;
        }

        const currentChunkText = chunks[chunkIndex];
        chunkIndex++;

        const utterance = new SpeechSynthesisUtterance(currentChunkText);
        this.utterance = utterance;
        this.activeUtterancesSet.add(utterance); // Previne GC do V8/Chromium

        const bestVoice = this.getBestPortugueseVoice();
        if (bestVoice) {
          utterance.voice = bestVoice;
          utterance.lang = bestVoice.lang || 'pt-BR';
        } else {
          utterance.lang = 'pt-BR';
        }

        utterance.rate = Math.max(0.8, Math.min(actualRate, 2.0));
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          if (this.currentSpeechSessionId !== sessionId) return;
          this.isSpeaking = true;
          if (!hasTriggeredStart) {
            hasTriggeredStart = true;
            actualStart?.();
          }
        };

        utterance.onend = () => {
          this.activeUtterancesSet.delete(utterance);
          if (this.currentSpeechSessionId !== sessionId) return;
          // Pequena pausa natural de 40ms entre frases para o buffer de áudio do sistema operacional respirar sem picotar
          setTimeout(() => {
            if (this.currentSpeechSessionId === sessionId) {
              speakNextChunk();
            }
          }, 40);
        };

        utterance.onerror = (e) => {
          this.activeUtterancesSet.delete(utterance);
          if (e.error === 'canceled' || e.error === 'interrupted') {
            return;
          }
          if (this.currentSpeechSessionId !== sessionId) return;
          // Continua para o próximo chunk se houver
          if (chunkIndex < chunks.length) {
            setTimeout(() => {
              if (this.currentSpeechSessionId === sessionId) {
                speakNextChunk();
              }
            }, 50);
          } else {
            this.isSpeaking = false;
            this.stopKeepAlive();
            actualEnd?.();
          }
        };

        if (actualBoundary) {
          utterance.onboundary = (event) => {
            if (this.currentSpeechSessionId === sessionId) {
              actualBoundary?.(event.charIndex);
            }
          };
        }

        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('[speechNarrator] Aviso ao sintetizar trecho:', err);
          if (chunkIndex < chunks.length) {
            setTimeout(speakNextChunk, 40);
          } else {
            this.isSpeaking = false;
            this.stopKeepAlive();
            actualEnd?.();
          }
        }
      };

      // Dispara fala com respiro para garantir que cancelamentos anteriores foram liberados
      setTimeout(() => {
        if (this.currentSpeechSessionId === sessionId) {
          speakNextChunk();
        }
      }, 30);
    } catch {
      this.isSpeaking = false;
      this.stopKeepAlive();
      this.activeUtterancesSet.clear();
      actualEnd?.();
    }
  }

  /**
   * Reads a question and its multiple-choice options with automatic voice
   */
  public speakQuestion(params: {
    questionIndex?: number;
    questionText: string;
    options?: string[];
    onStart?: () => void;
    onEnd?: () => void;
    force?: boolean;
    rate?: number;
  }) {
    if (!this.autoNarrateEnabled && !params.force) {
      return;
    }

    const defaultRate = this.getDefaultRate();
    const { questionIndex, questionText, options = [], onStart, onEnd, rate = defaultRate } = params;

    let fullText = '';
    if (typeof questionIndex === 'number') {
      fullText += `Questão ${questionIndex + 1}: `;
    }
    fullText += `${questionText}. `;

    if (options && options.length > 0) {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const optionsFormatted = options
        .map((opt, i) => `Opção ${letters[i] || i + 1}: ${opt}`)
        .join('. ');
      fullText += ` ${optionsFormatted}`;
    }

    this.speak(fullText, onStart, onEnd, undefined, rate);
  }

  // Multilingual speech pronunciation helper (supports Portuguese, English, Spanish, French, Italian, German, Japanese, Chinese, Latin, etc.)
  public speakLanguage(
    text: string,
    langCode: string = 'pt-BR',
    onStart?: () => void,
    onEnd?: () => void
  ) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) {
        onStart?.();
        setTimeout(() => onEnd?.(), 1500);
        return;
      }
      this.stop();

      this.currentSpeechSessionId++;
      const sessionId = this.currentSpeechSessionId;

      const sanitized = this.formatMathForSpeech(text);
      if (!sanitized.trim()) {
        onEnd?.();
        return;
      }

      this.startKeepAlive();

      const chunks = this.splitTextIntoChunks(sanitized, 120);
      let chunkIndex = 0;
      let hasStarted = false;

      if (this.voices.length === 0) {
        this.loadVoices();
      }

      const normalizedLang = langCode.toLowerCase().replace('_', '-');
      const targetPrefix = normalizedLang.split('-')[0];

      const matchingVoices = this.voices.filter(
        (v) =>
          v.lang &&
          (v.lang.toLowerCase() === normalizedLang ||
            v.lang.toLowerCase().startsWith(targetPrefix))
      );

      const bestVoice =
        matchingVoices.find(
          (v) =>
            v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Neural') ||
            v.name.includes('Premium')
        ) || (matchingVoices.length > 0 ? matchingVoices[0] : null);

      const speakNextLangChunk = () => {
        if (this.currentSpeechSessionId !== sessionId) return;
        if (chunkIndex >= chunks.length) {
          this.isSpeaking = false;
          this.stopKeepAlive();
          this.activeUtterancesSet.clear();
          onEnd?.();
          return;
        }

        const chunkText = chunks[chunkIndex];
        chunkIndex++;

        const utterance = new SpeechSynthesisUtterance(chunkText);
        this.activeUtterancesSet.add(utterance);

        if (bestVoice) {
          utterance.voice = bestVoice;
        }
        utterance.lang = langCode;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          if (this.currentSpeechSessionId !== sessionId) return;
          if (!hasStarted) {
            hasStarted = true;
            this.isSpeaking = true;
            onStart?.();
          }
        };

        utterance.onend = () => {
          this.activeUtterancesSet.delete(utterance);
          if (this.currentSpeechSessionId !== sessionId) return;
          setTimeout(speakNextLangChunk, 35);
        };

        utterance.onerror = (e) => {
          this.activeUtterancesSet.delete(utterance);
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          if (this.currentSpeechSessionId !== sessionId) return;
          if (chunkIndex < chunks.length) {
            setTimeout(speakNextLangChunk, 50);
          } else {
            this.isSpeaking = false;
            this.stopKeepAlive();
            onEnd?.();
          }
        };

        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch {
          if (chunkIndex < chunks.length) {
            speakNextLangChunk();
          } else {
            this.isSpeaking = false;
            this.stopKeepAlive();
            onEnd?.();
          }
        }
      };

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
      speakNextLangChunk();
    } catch {
      this.isSpeaking = false;
      this.stopKeepAlive();
      this.activeUtterancesSet.clear();
      onEnd?.();
    }
  }

  // English speech pronunciation helper
  public speakEnglish(text: string, onStart?: () => void, onEnd?: () => void) {
    this.speakLanguage(text, 'en-US', onStart, onEnd);
  }

  public stop() {
    try {
      this.currentSpeechSessionId++;
      this.stopKeepAlive();
      this.activeUtterancesSet.clear();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        this.isSpeaking = false;
      }
    } catch {
      this.isSpeaking = false;
      this.stopKeepAlive();
    }
  }

  public pause() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
    } catch {}
  }

  public resume() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechNarrator = new SpeechNarratorService();
