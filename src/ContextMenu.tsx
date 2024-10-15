import { ContextMenuItem, useContextMenu } from "use-context-menu";
import "use-context-menu/styles.css";
import "./ContextMenu.css";

interface ContextMenuProps {
  onEngageDisengageCard: () => void;
  children: React.ReactNode;
  onFlip: () => void;
  sendBackToDeck: () => void;
  sendBackToHand: () => void;
  copy: () => void;
  // giveCardToOpponent: () => void;
  sendCardToFront: () => void;
  sendCardToBack: () => void;
  increaseSrcIndex: () => void;
}

export default function ContextMenu({
  onEngageDisengageCard,
  children,
  onFlip,
  sendBackToDeck,
  sendBackToHand,
  copy,
  // giveCardToOpponent,
  sendCardToFront,
  sendCardToBack,
  increaseSrcIndex,
}: ContextMenuProps) {
  const { contextMenu, onContextMenu } = useContextMenu(
    <div className="custom-context-menu">
      <ContextMenuItem>
        <button onClick={onEngageDisengageCard}>Engage/Disengage</button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button onClick={onFlip}>Flip</button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button onClick={sendBackToDeck}>Send Back to Deck</button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button onClick={sendBackToHand}>Send Back to Hand</button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button onClick={copy}>Copy</button>
      </ContextMenuItem>
      {/* <ContextMenuItem>
        <button onClick={giveCardToOpponent}>Give Card to Opponent</button>
      </ContextMenuItem> */}
      <ContextMenuItem>
        <button onClick={sendCardToFront}>Bring to Front</button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button onClick={sendCardToBack}>Bring to Back</button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button onClick={increaseSrcIndex}>Transform</button>
      </ContextMenuItem>
    </div>
  );

  return (
    <>
      <div onContextMenu={onContextMenu} tabIndex={0}>
        {children}
      </div>
      {contextMenu}
    </>
  );
}
