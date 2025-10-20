import { useEffect } from "react";

export function useAsyncEffect(
  fn: (signal: AbortSignal) => void | Promise<void>,
  deps: any[]
) {
  useEffect(() => {
    const ctrl = new AbortController();
    const maybe = fn(ctrl.signal);
    Promise.resolve(maybe).catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
