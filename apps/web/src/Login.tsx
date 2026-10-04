import { useState, type FormEvent } from "react";
import type { Me } from "@zeszyt/shared";
import { api, ApiError, ERROR_MESSAGES } from "./api.ts";
import { isStandalone, platform, useInstall } from "./lib/install.ts";

export function Login({
  onSuccess,
  compact = false,
  presetLogin = "",
}: {
  onSuccess: (me: Me) => void | Promise<void>;
  compact?: boolean;
  presetLogin?: string;
}) {
  const [login, setLogin] = useState(presetLogin);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInstall, setShowInstall] = useState(() => !compact && platform() !== "desktop" && !isStandalone());

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSuccess(await api.login(login, password));
    } catch (err) {
      setError(ERROR_MESSAGES[err instanceof ApiError ? err.code : "idu_unavailable"]);
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  const form = (
    <form className="login-form" onSubmit={submit}>
      {compact && <p className="relogin-title">{ERROR_MESSAGES.session_expired}</p>}
      <label>
        <span>Login IDU</span>
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </label>
      <label>
        <span>Hasło</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? "Loguję…" : "Zaloguj"}
      </button>
    </form>
  );

  if (compact) return form;

  return (
    <div className="login-page">
      <div className="login-card">
        <img className="login-logo" src="/icon.svg" alt="" width={56} height={56} />
        <h1>Zeszyt</h1>
        {showInstall ? (
          <InstallStep onSkip={() => setShowInstall(false)} />
        ) : (
          <>
            <p className="muted">Czytelny podgląd planu lekcji. Zaloguj się danymi z IDU.</p>
            {form}
          </>
        )}
        <p className="login-fineprint">
          Nieoficjalny klient, niezwiązany z IDU ani DAG s.c. Hasło trafia tylko do IDU i nie jest
          nigdzie zapisywane. Twoje dane zostają na tym urządzeniu.
        </p>
      </div>
    </div>
  );
}

function InstallStep({ onSkip }: { onSkip: () => void }) {
  const install = useInstall();
  const [accepted, setAccepted] = useState(false);
  const done = accepted || install.installed;
  const os = platform();

  if (done) {
    return (
      <div className="install-step">
        <p className="install-lead">Gotowe! Otwórz Zeszyt z ekranu głównego i zaloguj się tam.</p>
        <button className="ghost-button" onClick={onSkip}>
          Zaloguj się w przeglądarce
        </button>
      </div>
    );
  }

  return (
    <div className="install-step">
      <p className="install-lead">
        Najpierw dodaj Zeszyt do ekranu głównego, potem otwórz go stamtąd i zaloguj się. Plan i oceny
        zapiszą się w aplikacji i będą dostępne bez internetu.
      </p>

      {os === "android" && install.canPrompt ? (
        <button className="primary-button" onClick={async () => setAccepted(await install.prompt())}>
          Zainstaluj aplikację
        </button>
      ) : os === "ios" ? (
        <ol className="install-steps">
          <li>
            Stuknij <strong>Udostępnij</strong> (kwadrat ze strzałką w górę).
          </li>
          <li>
            Wybierz <strong>Do ekranu początkowego</strong>.
          </li>
          <li>
            Stuknij <strong>Dodaj</strong> i otwórz Zeszyt z ekranu głównego.
          </li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>
            Otwórz menu przeglądarki (<strong>⋮</strong>).
          </li>
          <li>
            Wybierz <strong>Zainstaluj aplikację</strong> lub <strong>Dodaj do ekranu głównego</strong>.
          </li>
          <li>Otwórz Zeszyt z ekranu głównego.</li>
        </ol>
      )}

      <button className="ghost-button" onClick={onSkip}>
        Pomiń i zaloguj się tutaj
      </button>
    </div>
  );
}
