import { useCallback, useState } from "react";

declare global {
  const rerenders: Set<() => void> | undefined;
  const rerender: (() => void) | undefined;
}

export function useRerender() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any;
  global.rerenders ||= new Set<() => void>();
  global.rerender ||= () => {
    global.rerenders?.forEach((rerender: () => void) => {
      rerender();
    });
  };

  const [renderSymbol, setRenderSymbol] = useState(Symbol());
  const rerender = useCallback(() => {
    setRenderSymbol(Symbol());
  }, []);

  global.rerenders.add(rerender);

  return [rerender, renderSymbol];
}
