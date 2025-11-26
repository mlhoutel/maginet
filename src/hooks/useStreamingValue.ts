/* eslint-disable react-compiler/react-compiler */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef, useSyncExternalStore } from "react";

export type StreamingSubscribeCallback = () => void;

export type UnsubscribeCallback = () => void;

export interface StreamingValue<Value, AdditionalData = undefined> {
  complete: boolean;
  data: AdditionalData | undefined;
  error: any | undefined;
  progress: number | undefined;
  resolver: PromiseLike<StreamingValue<Value, AdditionalData>>;
  subscribe(callback: StreamingSubscribeCallback): UnsubscribeCallback;
  value: Value | undefined;
}

export function throttle<T extends (...args: any[]) => void>(
  callback: T,
  throttleByAmount: number
): T & { cancel: () => void } {
  let lastCalledAt = -Infinity;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: any[]) => {
    const elapsed = performance.now() - lastCalledAt;
    if (elapsed >= throttleByAmount) {
      lastCalledAt = performance.now();
      callback(...args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        lastCalledAt = performance.now();
        callback(...args);
      }, throttleByAmount - elapsed);
    }
  };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return throttled as T & { cancel: () => void };
}

export type StreamingValuePartial<Value, AdditionalData> = Pick<
  StreamingValue<Value, AdditionalData>,
  "complete" | "data" | "error" | "progress" | "value"
>;

export function useStreamingValue<Value, AdditionalData = undefined>(
  streamingValues: StreamingValue<Value, AdditionalData>,
  options: { throttleUpdatesBy?: number } = {}
): StreamingValuePartial<Value, AdditionalData> {
  const { throttleUpdatesBy = 150 } = options;

  const ref = useRef<StreamingValuePartial<Value, AdditionalData>>({
    complete: false,
    data: undefined,
    error: undefined,
    progress: 0,
    value: undefined,
  });

  const getValue = () => {
    const value = ref.current;
    if (
      value.complete !== streamingValues.complete ||
      value.data !== streamingValues.data ||
      value.progress !== streamingValues.progress ||
      value.value !== streamingValues.value
    ) {
      ref.current = {
        complete: streamingValues.complete,
        data: streamingValues.data,
        error: streamingValues.error,
        progress: streamingValues.progress,
        value: streamingValues.value,
      };
    }

    return ref.current;
  };

  const throttledSubscribe = useCallback(
    (callback: () => void) => {
      const callbackWrapper = throttle(() => {
        callback();
      }, throttleUpdatesBy);

      return streamingValues.subscribe(callbackWrapper);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamingValues.subscribe]
  );

  return useSyncExternalStore<StreamingValuePartial<Value, AdditionalData>>(
    throttledSubscribe,
    getValue,
    getValue
  );
}

useStreamingValue.displayName = "useStreamingValue";
