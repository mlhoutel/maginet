import * as React from "react";
import { Card } from "./Canvas";

interface HandProps {
  cards: Card[];
  setHoveredCard: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function Hand({ cards, setHoveredCard }: HandProps) {
  return (
    <div className="hand">
      {cards.map((card) => (
        <img
          key={card.id}
          src={card.src}
          alt={`Card ${card.id}`}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
          onMouseEnter={() => setHoveredCard(card.src)}
          onMouseLeave={() => setHoveredCard(null)}
        />
      ))}
    </div>
  );
}
