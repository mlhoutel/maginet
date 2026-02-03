import * as React from "react";
import { Card } from "./types/canvas";

interface HandProps {
  cards: Card[];
  setHoveredCard: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string | null) => void;
  onDragStartCard?: (payload: {
    id: string;
    src: string;
    faceDown: boolean;
    pointerId: number;
    clientX: number;
    clientY: number;
    target: HTMLElement | null;
  }) => void;
  draggingCardId?: string | null;
}

export default function Hand({
  cards,
  setHoveredCard,
  selectedCardId,
  onSelectCard,
  onDragStartCard,
  draggingCardId,
}: HandProps) {
  return (
    <div className={`hand${draggingCardId ? " hand--dragging" : ""}`}>
      {cards.map((card) => {
        const isDragging = draggingCardId === card.id;
        return (
          <img
            key={card.id}
            src={card.src[0]}
            alt={`Card ${card.id}`}
            className={`hand-card${selectedCardId === card.id ? " selected" : ""}${isDragging ? " is-dragging" : ""}`}
            draggable={false}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.pointerType === "touch") {
                e.preventDefault();
                onSelectCard?.(selectedCardId === card.id ? null : card.id);
                return;
              }
              if (e.button !== 0) return;
              e.preventDefault();
              if (e.currentTarget.setPointerCapture) {
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore if capture fails.
                }
              }
              onDragStartCard?.({
                id: card.id,
                src: card.src[0],
                faceDown: e.shiftKey,
                pointerId: e.pointerId,
                clientX: e.clientX,
                clientY: e.clientY,
                target: e.currentTarget,
              });
            }}
            onDragStart={(e) => {
              e.preventDefault();
            }}
            onMouseEnter={() => setHoveredCard(card.src[0])}
            onMouseLeave={() => setHoveredCard(null)}
          />
        );
      })}
    </div>
  );
}
