import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useAniPlayInstalled() {
  const [aniPlayInstalled, setAniPlayInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    invoke<boolean>("is_aniplay_installed")
      .then(setAniPlayInstalled)
      .catch(() => setAniPlayInstalled(false))
      .finally(() => setIsChecking(false));
  }, []);

  return {
    aniPlayInstalled,
    isChecking,
  };
}