import {
  useEffect,
  useState,
} from "react";

import {
  MdNotifications,
  MdNotificationsActive,
  MdNotificationsOff,
} from "react-icons/md";

const API_BASE =
  import.meta.env.VITE_API_URL || "";

function urlBase64ToUint8Array(
  base64String,
) {
  const padding =
    "=".repeat(
      (4 -
        (base64String.length %
          4)) %
        4,
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      (character) =>
        character.charCodeAt(0),
    ),
  );
}

async function sendSubscription(
  subscription,
) {
  const response =
    await fetch(
      `${API_BASE}/api/emae/push/subscribe`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            subscription,
          ),
      },
    );

  if (!response.ok) {
    throw new Error(
      "Não foi possível registrar o dispositivo.",
    );
  }

  return response.json();
}

export default function EmaePushButton() {
  const [
    status,
    setStatus,
  ] = useState("checking");

  const [
    message,
    setMessage,
  ] = useState("");

  // ==========================================================
  // VERIFICA SE JÁ EXISTE INSCRIÇÃO
  // ==========================================================

  useEffect(() => {
    async function checkPush() {
      if (
        !(
          "serviceWorker" in
          navigator
        ) ||
        !(
          "PushManager" in
          window
        ) ||
        !(
          "Notification" in
          window
        )
      ) {
        setStatus(
          "unsupported",
        );

        return;
      }

      if (
        Notification.permission ===
        "denied"
      ) {
        setStatus(
          "blocked",
        );

        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.register(
            "/emae-sw.js",
          );

        await navigator.serviceWorker.ready;

        const subscription =
          await registration.pushManager.getSubscription();

        if (subscription) {
          // Reenvia para o backend.
          // Isso também recupera a inscrição caso
          // o backend tenha sido reiniciado.
          await sendSubscription(
            subscription,
          );

          setStatus(
            "active",
          );
        } else {
          setStatus(
            "inactive",
          );
        }
      } catch (error) {
        console.error(
          "Push check:",
          error,
        );

        setStatus(
          "inactive",
        );
      }
    }

    checkPush();
  }, []);

  // ==========================================================
  // ATIVAR PUSH
  // ==========================================================

  async function enablePush() {
    try {
      setStatus(
        "loading",
      );

      setMessage("");

      const permission =
        await Notification.requestPermission();

      if (
        permission !==
        "granted"
      ) {
        setStatus(
          permission ===
            "denied"
            ? "blocked"
            : "inactive",
        );

        return;
      }

      const registration =
        await navigator.serviceWorker.register(
          "/emae-sw.js",
        );

      await navigator.serviceWorker.ready;

      const keyResponse =
        await fetch(
          `${API_BASE}/api/emae/push/public-key`,
        );

      if (!keyResponse.ok) {
        throw new Error(
          "Não foi possível obter a chave pública.",
        );
      }

      const keyData =
        await keyResponse.json();

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe(
            {
              userVisibleOnly:
                true,

              applicationServerKey:
                urlBase64ToUint8Array(
                  keyData.publicKey,
                ),
            },
          );
      }

      await sendSubscription(
        subscription,
      );

      setStatus(
        "active",
      );

      setMessage(
        "Notificações ativadas",
      );

      setTimeout(
        () =>
          setMessage(""),
        3000,
      );
    } catch (error) {
      console.error(
        "Erro ao ativar push:",
        error,
      );

      setMessage(
        error.message ||
          "Erro ao ativar notificações.",
      );

      setStatus(
        "inactive",
      );
    }
  }

  if (
    status ===
    "unsupported"
  ) {
    return (
      <div className="emae-push-button disabled">
        <MdNotificationsOff />

        Notificações indisponíveis
      </div>
    );
  }

  if (
    status === "blocked"
  ) {
    return (
      <div
        className="emae-push-button blocked"
        title="As notificações foram bloqueadas nas configurações do navegador."
      >
        <MdNotificationsOff />

        Notificações bloqueadas
      </div>
    );
  }

  if (
    status === "active"
  ) {
    return (
      <div className="emae-push-wrapper">
        <div className="emae-push-button active">
          <MdNotificationsActive />

          Notificações ativas
        </div>

        {message && (
          <span className="emae-push-message">
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="emae-push-wrapper">
      <button
        type="button"
        className="emae-push-button"
        onClick={
          enablePush
        }
        disabled={
          status ===
          "loading"
        }
      >
        <MdNotifications />

        {status ===
        "loading"
          ? "Ativando..."
          : "Ativar notificações"}
      </button>

      {message && (
        <span className="emae-push-message error">
          {message}
        </span>
      )}
    </div>
  );
}
