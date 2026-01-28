import * as React from "react";
import { Card } from "./types/canvas";

interface HandProps {
  cards: Card[];
  setHoveredCard: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string | null) => void;
}

export default function Hand({
  cards,
  setHoveredCard,
  selectedCardId,
  onSelectCard,
}: HandProps) {
  return (
    <div className="hand">
      {cards.map((card) => (
        <img
          key={card.id}
          src={card.src[0]}
          alt={`Card ${card.id}`}
          className={`hand-card${selectedCardId === card.id ? " selected" : ""}`}
          draggable
          onPointerDown={(e) => {
            if (e.pointerType !== "touch") return;
            e.preventDefault();
            onSelectCard?.(selectedCardId === card.id ? null : card.id);
          }}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", card.id);
            // Store whether Shift key is pressed to play card face-down
            e.dataTransfer.setData("playFaceDown", e.shiftKey ? "true" : "false");
          }}
          onMouseEnter={() => setHoveredCard(card.src[0])}
          onMouseLeave={() => setHoveredCard(null)}
        />
      ))}
    </div>
  );
}
