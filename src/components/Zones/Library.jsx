import { Droppable } from "react-beautiful-dnd";
import DraggableCard from "../Cards/DraggableCard";

function Library({ cards }) {
  return (
    <div className="library">
      <Droppable droppableId="library" direction="vertical">
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {cards.map((card, index) => (
              <DraggableCard key={card.uuid} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default Library;
