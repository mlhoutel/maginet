import React from "react";
import { Card } from "./Canvas";

export default function Hand({
  cards,
}: {
  cards: Card[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}) {
  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    cardSrc: string
  ) => {
    e.dataTransfer.setData("text/plain", cardSrc);
  };

  return (
    <div className="hand">
      {cards.map((card, index) => (
        <img
          key={index}
          src={card.src}
          alt={`Card ${index}`}
          draggable
          onDragStart={(e) => handleDragStart(e, card.src)}
        />
      ))}
    </div>
  );
}
