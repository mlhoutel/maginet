import { useCallback, useState } from "react";

export function useRerender() {
  globalThis.rerenders ||= new Set<() => void>();
  globalThis.rerender ||= () => {
    globalThis.rerenders.forEach((rerender) => {
      rerender();
    });
  };

  const [renderSymbol, setRenderSymbol] = useState(Symbol());
  const rerender = useCallback(() => {
    setRenderSymbol(Symbol());
  }, []);

  globalThis.rerenders.add(rerender);

  return [rerender, renderSymbol];
}
