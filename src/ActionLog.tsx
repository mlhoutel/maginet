import { useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import "./ActionLog.css";

export type ActionLogEntry = {
  playerId: string;
  playerName?: string;
  action: string;
  cardsInHand: number;
  timestamp?: number;
};

export default function ActionLog({
  actions = [],
}: {
  actions?: ActionLogEntry[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Ensure the list is rendered before measuring/scrolling
    flushSync(() => {});
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions]);

  return (
    <div
      className="action-log-container"
      onWheelCapture={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <h3 className="action-log-header">Action Log</h3>
      <div className="action-log-content" ref={scrollRef}>
        <div className="action-log-content-inner">
          {actions.map((action, index) => (
            <div key={index} className="action-log-item">
              <span className="player-id">
                {(action.playerName || action.playerId) ?? "Player"}: {" "}
                {action.cardsInHand} cards in hand
              </span>
              <div className="action-meta">
                <span className="action-text">{action.action}</span>
                {action.timestamp && (
                  <span className="action-time">
                    {new Date(action.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
