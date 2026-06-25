"use client";

import { useEffect, useState } from "react";
import {
  subscribeUser,
  unsubscribeUser,
  sendTestNotification,
  type SerializedSubscription,
} from "@/app/actions/push";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const btn =
  "rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60";

export function PushManager({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(Boolean(sub)))
        .catch(() => {});
    }
  }, []);

  async function subscribe() {
    setBusy(true);
    setInfo(null);
    try {
      if (!vapidPublicKey) {
        setInfo("Server hat keinen VAPID-Public-Key konfiguriert.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setInfo("Benachrichtigungen wurden im Browser nicht erlaubt.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const serialized = JSON.parse(JSON.stringify(sub)) as SerializedSubscription;
      await subscribeUser(serialized, navigator.userAgent);
      setSubscribed(true);
      setInfo("Benachrichtigungen aktiviert.");
    } catch {
      setInfo("Aktivierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setInfo(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeUser(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setInfo("Benachrichtigungen deaktiviert.");
    } catch {
      setInfo("Deaktivierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setInfo(null);
    try {
      const res = await sendTestNotification();
      setInfo(`Testbenachrichtigung gesendet (${res.sent} Gerät(e)).`);
    } catch {
      setInfo("Senden fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (!isSupported) {
    return (
      <div className="text-sm text-black/60 dark:text-white/60">
        Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.
        {isIOS && !isStandalone && (
          <p className="mt-2">
            Auf dem iPhone/iPad: Über das Teilen-Symbol „Zum Home-Bildschirm" wählen
            und die App von dort öffnen – dann sind Benachrichtigungen verfügbar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {subscribed ? (
          <>
            <button onClick={unsubscribe} disabled={busy} className={`${btn} border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10`}>
              Benachrichtigungen deaktivieren
            </button>
            <button onClick={test} disabled={busy} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>
              Test senden
            </button>
          </>
        ) : (
          <button onClick={subscribe} disabled={busy} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>
            Benachrichtigungen aktivieren
          </button>
        )}
      </div>
      <p className="text-sm">
        Status:{" "}
        <strong>{subscribed ? "aktiviert" : "nicht aktiviert"}</strong>
      </p>
      {info && <p className="text-sm text-black/70 dark:text-white/70">{info}</p>}
      {isIOS && !isStandalone && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Hinweis iOS: Push funktioniert nur, wenn die App über „Zum Home-Bildschirm
          hinzufügen" installiert und von dort geöffnet wird.
        </p>
      )}
    </div>
  );
}
