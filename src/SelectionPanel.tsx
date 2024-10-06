import React from "react";
import { useLocation, Form } from "react-router-dom";
import { Camera, Mode } from "./Canvas";
import useModal from "./hooks/useModal";
import { usePeerStore } from "./hooks/usePeerConnection";
import { useRateLimit } from "./hooks/useRateLimit";

export function SelectionPanel({
  onDrawCard,
  setMode,
  mode,
  onMulligan,
  onShuffleDeck,
}: {
  onDrawCard: () => void;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  mode: Mode;
  onMulligan: () => void;
  onShuffleDeck: () => void;
}) {
  const connectToPeer = usePeerStore((state) => state.connectToPeer);
  const sendMessage = usePeerStore((state) => state.sendMessage);
  const peer = usePeerStore((state) => state.peer);
  const [peerId, setPeerId] = React.useState("");
  const [modal, showModal] = useModal();

  function prouton() {
    sendMessage({ type: "prouton", payload: "Prouton!" });
  }
  const { rateLimitedFn: rateLimitedProuton, canCall: canCallProuton } =
    useRateLimit(prouton, {
      maxCalls: 30,
      timeWindow: 60000,
    }); // 3 calls per minute
  const connection = usePeerStore((state) => state.connection);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const d = params.get("deck");

  return (
    <div className="selection-panel">
      <button onClick={onDrawCard}>Draw Card</button>
      <button
        disabled={mode === "create"}
        onClick={() => {
          setMode("create");
        }}
      >
        create text
      </button>
      <button disabled={mode === "select"} onClick={() => setMode("select")}>
        select
      </button>
      <button onClick={onMulligan}>Mulligan</button>
      <button onClick={onShuffleDeck}>Shuffle Deck</button>
      <label>
        your id: <input type="text" defaultValue={peer?.id} readOnly />
      </label>
      <button onClick={() => connectToPeer(peerId)}>Connect to Peer</button>

      <input
        type="text"
        onChange={(e) => setPeerId(e.target.value)}
        value={peerId}
      />
      {connection && <div>connected to {connection.peer}</div>}
      {modal}
      <button
        onClick={() =>
          showModal("Select deck", (closeModal) => (
            <Form
              className="modal-form"
              onSubmit={() => {
                closeModal();
              }}
            >
              <textarea id="deck" name="deck" defaultValue={d ?? ""} />
              <button className="modal-button" type="submit">
                Submit
              </button>
            </Form>
          ))
        }
      >
        Select Deck
      </button>
      <button
        disabled={!canCallProuton}
        onClick={() => {
          rateLimitedProuton();
        }}
      >
        Prouton!
      </button>
    </div>
  );
}
