import { useRef, useState } from "react";

export function useNotify(ms = 1500) {
  const [tip, setTip] = useState<string | null>(null);
  const tipHideAtRef = useRef<number | null>(null);

  const notify = (msg: string) => {
    setTip(msg);
    const hideAt = Date.now() + ms;
    tipHideAtRef.current = hideAt;

    setTimeout(() => {
      if (tipHideAtRef.current === hideAt) {
        setTip(null);
      }
    }, ms);
  };

  return { tip, notify };
}
