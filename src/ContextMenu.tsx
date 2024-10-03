import { ContextMenuItem, useContextMenu } from "use-context-menu";
import "use-context-menu/styles.css";

interface ContextMenuProps {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  children: React.ReactNode;
  onFlip: () => void;
  sendBackToDeck: () => void;
  sendBackToHand: () => void;
}

export default function ContextMenu({
  onRotateLeft,
  onRotateRight,
  children,
  onFlip,
  sendBackToDeck,
  sendBackToHand,
}: ContextMenuProps) {
  const { contextMenu, onContextMenu, onKeyDown } = useContextMenu(
    <>
      <ContextMenuItem>
        <button onClick={onRotateLeft}>Rotate Left</button>
      </ContextMenuItem>
      <ContextMenuItem>
        <button onClick={onRotateRight}>Rotate Right</button>
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
    </>
  );

  return (
    <>
      <div onContextMenu={onContextMenu} onKeyDown={onKeyDown} tabIndex={0}>
        {children} {contextMenu}
      </div>
    </>
  );
}
