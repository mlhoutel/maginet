import { useEffect, useRef } from "react";
import "./ActionLog.css";

type Action = {
  playerId: string;
  action: string;
  cardsInHand: number;
};

export default function ActionLog({ actions = [] }: { actions?: Action[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions]);

  return (
    <div className="action-log-container">
      <h3 className="action-log-header">Action Log</h3>
      <div className="action-log-content" ref={scrollRef}>
        <div className="action-log-content-inner">
          {actions.map((action, index) => (
            <div key={index} className="action-log-item">
              <span className="player-id">
                {action.playerId}: {action.cardsInHand}
              </span>
              <span className="action-text">{action.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
