// PWA Install Prompt Service for Trilha do Saber

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type InstallPromptListener = (hasPrompt: boolean) => void;

class PWAService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isAppInstalled: boolean = false;
  private listeners: Set<InstallPromptListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Check if already running standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.isAppInstalled = isStandalone;

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyListeners(true);
      console.log("[PWA] Prompt de instalação nativo capturado e pronto para uso.");
    });

    // Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isAppInstalled = true;
      this.notifyListeners(false);
      console.log("[PWA] Aplicativo instalado com sucesso.");
    });

    // Register Service Worker for offline capability & local push notifications
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        const swUrl = new URL('sw.js', window.location.href).href;
        navigator.serviceWorker
          .register(swUrl)
          .then((registration) => {
            console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);

            // Register periodic sync for daily study tip if supported by browser
            if ('periodicSync' in registration) {
              try {
                (registration as any).periodicSync.register('daily-study-tip-sync', {
                  minInterval: 12 * 60 * 60 * 1000, // 12 hours
                }).catch(() => {});
              } catch {}
            }
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration skipped or failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }
  }

  public subscribe(listener: InstallPromptListener): () => void {
    this.listeners.add(listener);
    listener(this.hasNativePrompt());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(hasPrompt: boolean) {
    this.listeners.forEach((listener) => listener(hasPrompt));
  }

  public hasNativePrompt(): boolean {
    return this.deferredPrompt !== null;
  }

  public canInstall(): boolean {
    return this.hasNativePrompt();
  }

  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'not_available'> {
    return this.promptNativeInstall();
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      this.isAppInstalled ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  public isInIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  public openInDedicatedWindow() {
    if (typeof window === 'undefined') return;
    try {
      window.open(window.location.href, '_blank');
    } catch (e) {
      console.warn('Could not open standalone window', e);
    }
  }

  /**
   * Prompts the browser's native install dialog if available.
   * Returns:
   *  - 'accepted' if user clicked "Instalar"
   *  - 'dismissed' if user clicked "Cancelar"
   *  - 'not_available' if the browser doesn't have the prompt event ready (e.g. iOS or inside iframe)
   */
  public async promptNativeInstall(): Promise<'accepted' | 'dismissed' | 'not_available'> {
    if (!this.deferredPrompt) {
      return 'not_available';
    }

    try {
      const promptEvent = this.deferredPrompt;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        this.isAppInstalled = true;
      }
      this.deferredPrompt = null;
      this.notifyListeners(false);
      return choice.outcome;
    } catch (err) {
      console.warn('[PWA] Erro ao invocar prompt nativo:', err);
      this.deferredPrompt = null;
      this.notifyListeners(false);
      return 'not_available';
    }
  }
}

export const pwaService = new PWAService();
