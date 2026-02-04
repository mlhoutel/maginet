import * as React from "react";
import {
  ContextMenuCategory,
  ContextMenuDivider,
  ContextMenuItem,
  useContextMenu,
} from "use-context-menu";
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
  onPlayCardFromMenu?: (
    cardId: string,
    point: { x: number; y: number } | null,
    faceDown: boolean
  ) => void;
  onMoveCardToDeck?: (cardId: string, position: "top" | "bottom") => void;
  draggingCardId?: string | null;
}

export default function Hand({
  cards,
  setHoveredCard,
  selectedCardId,
  onSelectCard,
  onDragStartCard,
  onPlayCardFromMenu,
  onMoveCardToDeck,
  draggingCardId,
}: HandProps) {
  const [contextCardId, setContextCardId] = React.useState<string | null>(null);
  const [contextPoint, setContextPoint] = React.useState<{ x: number; y: number } | null>(
    null
  );

  const { contextMenu, onContextMenu } = useContextMenu(
    <div className="custom-context-menu">
      <ContextMenuCategory>Hand</ContextMenuCategory>
      <ContextMenuItem>
        <button
          onClick={() => {
            if (!contextCardId) return;
            onPlayCardFromMenu?.(contextCardId, contextPoint, false);
          }}
        >
          Play to table
        </button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button
          onClick={() => {
            if (!contextCardId) return;
            onPlayCardFromMenu?.(contextCardId, contextPoint, true);
          }}
        >
          Play face down
        </button>
      </ContextMenuItem>
      <ContextMenuDivider />
      <ContextMenuCategory>Deck</ContextMenuCategory>
      <ContextMenuItem>
        <button
          onClick={() => {
            if (!contextCardId) return;
            onMoveCardToDeck?.(contextCardId, "top");
          }}
        >
          Put on top of deck
        </button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button
          onClick={() => {
            if (!contextCardId) return;
            onMoveCardToDeck?.(contextCardId, "bottom");
          }}
        >
          Put on bottom of deck
        </button>
      </ContextMenuItem>
    </div>
  );

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
            onContextMenu={(e) => {
              e.stopPropagation();
              setContextCardId(card.id);
              setContextPoint({ x: e.clientX, y: e.clientY });
              onContextMenu(e);
            }}
            onDragStart={(e) => {
              e.preventDefault();
            }}
            onMouseEnter={() => setHoveredCard(card.src[0])}
            onMouseLeave={() => setHoveredCard(null)}
          />
        );
      })}
      {contextMenu}
    </div>
  );
}
