import { useEffect, useState } from "react";

export function useActionMessage(
  state: { ok?: boolean; error?: string } | undefined,
  duration = 3000,
) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state?.ok || state?.error) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [state, duration]);

  return visible;
}
