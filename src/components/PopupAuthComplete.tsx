"use client";

import { useEffect } from "react";

export function PopupAuthComplete() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage("nubel-auth-complete", window.location.origin);
      window.close();
    }
  }, []);
  return <p className="p-8 text-center text-sm text-slate-600">Acceso completado. Ya puedes cerrar esta ventana.</p>;
}

