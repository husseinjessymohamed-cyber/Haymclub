import {
  useEffect,
  useState,
} from 'react';

import './PwaInstallPrompt.css';

interface BeforeInstallPromptEvent
  extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome:
      | 'accepted'
      | 'dismissed';

    platform: string;
  }>;
}

function isStandaloneMode(): boolean {
  const navigatorWithStandalone =
    navigator as Navigator & {
      standalone?: boolean;
    };

  return (
    window.matchMedia(
      '(display-mode: standalone)',
    ).matches ||
    navigatorWithStandalone.standalone ===
      true
  );
}

function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(
    navigator.userAgent,
  );
}

export function PwaInstallPrompt() {
  const [
    installEvent,
    setInstallEvent,
  ] = useState<
    BeforeInstallPromptEvent | null
  >(null);

  const [
    installed,
    setInstalled,
  ] = useState(
    isStandaloneMode,
  );

  const [
    showIosGuide,
    setShowIosGuide,
  ] = useState(false);

  const [
    hiddenForSession,
    setHiddenForSession,
  ] = useState(
    () =>
      sessionStorage.getItem(
        'haymclub_pwa_prompt_hidden',
      ) === '1',
  );

  useEffect(() => {
    function handleBeforeInstall(
      event: Event,
    ): void {
      event.preventDefault();

      setInstallEvent(
        event as
          BeforeInstallPromptEvent,
      );

      setHiddenForSession(false);
    }

    function handleInstalled(): void {
      setInstalled(true);
      setInstallEvent(null);
      setShowIosGuide(false);
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstall,
    );

    window.addEventListener(
      'appinstalled',
      handleInstalled,
    );

    const displayModeQuery =
      window.matchMedia(
        '(display-mode: standalone)',
      );

    function handleDisplayModeChange():
    void {
      if (isStandaloneMode()) {
        setInstalled(true);
      }
    }

    displayModeQuery.addEventListener(
      'change',
      handleDisplayModeChange,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstall,
      );

      window.removeEventListener(
        'appinstalled',
        handleInstalled,
      );

      displayModeQuery
        .removeEventListener(
          'change',
          handleDisplayModeChange,
        );
    };
  }, []);

  async function installApplication():
  Promise<void> {
    if (isIosDevice()) {
      setShowIosGuide(true);
      return;
    }

    if (!installEvent) {
      return;
    }

    await installEvent.prompt();

    const choice =
      await installEvent.userChoice;

    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }

    setInstallEvent(null);
  }

  function hidePrompt(): void {
    sessionStorage.setItem(
      'haymclub_pwa_prompt_hidden',
      '1',
    );

    setHiddenForSession(true);
    setShowIosGuide(false);
  }

  const canShowInstall =
    !installed &&
    !hiddenForSession &&
    (
      installEvent !== null ||
      isIosDevice()
    );

  if (!canShowInstall) {
    return null;
  }

  return (
    <>
      <aside
        className="pwa-install-prompt"
        dir="rtl"
        aria-label="تثبيت تطبيق Haymclub"
      >
        <button
          type="button"
          className="pwa-install-close"
          aria-label="إخفاء"
          onClick={hidePrompt}
        >
          ×
        </button>

        <div className="pwa-install-icon">
          H
        </div>

        <div className="pwa-install-content">
          <strong>
            ثبّت تطبيق Haymclub
          </strong>

          <span>
            افتح السيستم كتطبيق مستقل
            على جهازك.
          </span>
        </div>

        <button
          type="button"
          className="pwa-install-action"
          onClick={() =>
            void installApplication()
          }
        >
          📲 تثبيت
        </button>
      </aside>

      {showIosGuide && (
        <div
          className="pwa-ios-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="طريقة تثبيت Haymclub على iPhone"
        >
          <section
            className="pwa-ios-dialog"
            dir="rtl"
          >
            <button
              type="button"
              className="pwa-ios-close"
              aria-label="إغلاق"
              onClick={() =>
                setShowIosGuide(false)
              }
            >
              ×
            </button>

            <div className="pwa-ios-logo">
              H
            </div>

            <h2>
              تثبيت Haymclub على iPhone
            </h2>

            <p>
              افتح الموقع من متصفح Safari،
              ثم نفّذ الخطوات التالية:
            </p>

            <ol>
              <li>
                اضغط زر المشاركة
                <b> ⬆️ </b>
                أسفل الشاشة.
              </li>

              <li>
                اختر
                <b>
                  إضافة إلى الشاشة الرئيسية
                </b>
                .
              </li>

              <li>
                اضغط
                <b> إضافة </b>
                لتثبيت التطبيق.
              </li>
            </ol>

            <button
              type="button"
              className="pwa-ios-confirm"
              onClick={() =>
                setShowIosGuide(false)
              }
            >
              فهمت
            </button>
          </section>
        </div>
      )}
    </>
  );
}
