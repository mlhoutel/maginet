import React from "react";
import { useLocation, Form } from "react-router-dom";
import useModal from "./hooks/useModal";
import { usePeerStore } from "./hooks/usePeerConnection";
import { useShapeStore } from "./hooks/useShapeStore";
import { Datum } from "./hooks/useCards";
import { Camera, Mode, Card, ShapeType } from "./types/canvas";
import "./SelectionPanel.css";

export function SelectionPanel({
  onDrawCard,
  setMode,
  mode,
  onMulligan,
  onShuffleDeck,
  cards,
  addCardToHand,
  relatedCards,
  deck,
  shapeType,
  setShapeType,
  peerPresence,
  heartbeatStaleMs,
  peerNames,
  rollCoin,
  rollD6,
  rollD20,
  untapAll,
}: {
  onDrawCard: () => void;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  mode: Mode;
  onMulligan: () => void;
  onShuffleDeck: () => void;
  addCardToHand: (card: Datum) => void;
  cards?: Datum[];
  relatedCards?: Datum[];
  addToken: () => void;
  changeColor: (color: string) => void;
  deck?: Card[];
  shapeType: ShapeType;
  setShapeType: React.Dispatch<React.SetStateAction<ShapeType>>;
  peerPresence: Record<string, number>;
  heartbeatStaleMs: number;
  peerNames: Record<string, string>;
  rollCoin: () => void;
  rollD6: () => void;
  rollD20: () => void;
  pickStarter: () => void;
  untapAll: () => void;
}) {
  // Peer connection state
  const connectToPeer = usePeerStore((state) => state.connectToPeer);
  const peer = usePeerStore((state) => state.peer);
  const connections = usePeerStore((state) => state.connections);
  const [peerId, setPeerId] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [showPeerStatus, setShowPeerStatus] = React.useState(true);

  // Modal state
  const [modal, showModal] = useModal();

  // Shape state
  const setSelectedShapeIds = useShapeStore(
    (state) => state.setSelectedShapeIds
  );

  const [now, setNow] = React.useState(() => Date.now());

  // Deck state
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const d = params.get("deck");


  const allCards = cards ? [...cards, ...(relatedCards ?? [])] : [];
  const peerStatusList = Array.from(connections.keys()).map((peerId) => {
    const lastSeen = peerPresence[peerId];
    const stale = !lastSeen || now - lastSeen > heartbeatStaleMs;
    const name = peerNames[peerId];
    return {
      peerId,
      stale,
      name,
      label: !lastSeen
        ? "Waiting..."
        : `${Math.max(0, Math.round((now - lastSeen) / 1000))}s ago`,
    };
  });

  React.useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="selection-panel">
      {/* Peer Connection Section */}
      <div className="selection-panel-section">
        <h3>Multiplayer</h3>
        <div className="peer-connection">
          <input
            type="text"
            onChange={(e) => setPeerId(e.target.value)}
            value={peerId}
            placeholder="Enter peer ID"
          />
          <button className="primary" onClick={() => connectToPeer(peerId)}>Connect</button>
        </div>

        <div className="peer-id-display">
          <label>ID:</label>
          <input type="text" defaultValue={peer?.id} readOnly />
          <button
            className="peer-id-copy-btn"
            onClick={() => {
              if (peer?.id) {
                navigator.clipboard.writeText(peer.id);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            {copied ? "✓" : "⧉"}
          </button>
        </div>

        {connections.size > 0 && (
          <div className={`peer-connection-status ${!showPeerStatus ? "collapsed" : ""}`}>
            <div className="peer-status-header">
              <span>
                <span className="peer-status-indicator">●</span> Connected to {connections.size} peer
                {connections.size !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                className="peer-status-toggle"
                onClick={() => setShowPeerStatus((prev) => !prev)}
              >
                {showPeerStatus ? "Hide" : "Show"}
              </button>
            </div>
            {showPeerStatus && peerStatusList.length > 0 && (
              <div className="peer-status-grid">
                {peerStatusList.map((status) => (
                  <div
                    key={status.peerId}
                    className={`peer-status ${status.stale ? "stale" : "active"}`}
                  >
                    <div className="peer-status-id">{status.name || status.peerId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Drawing Tools Section */}
      <div className="selection-panel-section">
        <h3>Drawing Tools</h3>
        <div className="shape-type-options">
          <div className="shape-type-option">
            <input
              type="radio"
              id="select"
              name="action"
              value="select"
              checked={mode === "select"}
              onChange={() => setMode("select")}
            />
            <label htmlFor="select">
              <span className="tool-icon">↖</span>
              <span className="tool-label">Select</span>
            </label>
          </div>
          <div className="shape-type-option">
            <input
              type="radio"
              id="create"
              name="action"
              value="create"
              checked={mode === "create" && shapeType === "text"}
              onChange={() => {
                setMode("create");
                setShapeType("text");
              }}
            />
            <label htmlFor="create">
              <span className="tool-icon">T</span>
              <span className="tool-label">Text</span>
            </label>
          </div>
          <div className="shape-type-option">
            <input
              type="radio"
              id="add"
              name="action"
              checked={mode === "create" && shapeType === "token"}
              onChange={() => {
                setMode("create");
                setShapeType("token");
              }}
            />
            <label htmlFor="add">
              <span className="tool-icon">●</span>
              <span className="tool-label">Token</span>
            </label>
          </div>
          <div className="shape-type-option">
            <input
              type="radio"
              id="rectangle"
              name="action"
              checked={mode === "create" && shapeType === "rectangle"}
              onChange={() => {
                setMode("create");
                setShapeType("rectangle");
              }}
            />
            <label htmlFor="rectangle">
              <span className="tool-icon">▢</span>
              <span className="tool-label">Rect</span>
            </label>
          </div>
        </div>
      </div>

      {/* Random Tools Section */}
      <div className="selection-panel-section">
        <h3>Random Tools (open console)</h3>
        <div className="selection-panel-button-group">
          <button onClick={rollCoin}>Flip Coin</button>
          <button onClick={rollD6}>Roll d6</button>
          <button onClick={rollD20}>Roll d20</button>
        </div>
      </div>

      {/* Board Tools */}
      <div className="selection-panel-section">
        <h3>Board Tools</h3>
        <div className="selection-panel-button-group">
          <button onClick={untapAll}>Untap all</button>
        </div>
      </div>

      {/* Deck Management Section */}
      <div className="selection-panel-section">
        <h3>Deck Management</h3>
        <div className="selection-panel-button-group">
          <button className="primary" onClick={onDrawCard}>Draw ({deck?.length})</button>
          <button className="danger" onClick={onMulligan}>Mulligan</button>
          <button onClick={onShuffleDeck}>Shuffle</button>
          <button className="primary"
            onClick={() =>
              showModal("Select deck", (closeModal) => (
                <Form
                  className="modal-form"
                  onSubmit={() => {
                    closeModal();
                  }}
                >
                  <textarea id="deck" name="deck" defaultValue={d ?? ""} placeholder={`1 Legion Angel
3 Wedding Announcement
...`} />
                  <button className="modal-button" type="submit">
                    Submit
                  </button>
                </Form>
              ))
            }
          >
            Select Deck
          </button>
        </div>
      </div>

      {/* Card Search */}
      {allCards && allCards.length > 0 && (
        <div className="selection-panel-section">
          <h3>Card Search</h3>
          <form
            className="card-search"
            onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                card_name: {
                  value: string;
                };
              };
              const card = allCards.find(
                (c) =>
                  c.name.toLowerCase() === target.card_name.value.toLowerCase()
              );
              if (card) {
                addCardToHand(card);
              } else {
                console.error("Card not found");
              }
              target.card_name.value = "";
            }}
          >
            <datalist id="cards">
              {Array.from(new Set([...allCards.map((c) => c.name).sort()])).map(
                (card) => (
                  <option key={card} value={card} />
                )
              )}
            </datalist>
            <input
              onFocus={() => {
                setSelectedShapeIds([]);
              }}
              type="search"
              id="cards"
              name="card_name"
              list="cards"
              required
              placeholder="Search card name..."
            />
            <button className="success" title="find in deck" type="submit">
              Add
            </button>
          </form>
        </div>
      )}

      {/* Modal Display */}
      {modal}
    </div>
  );
}
