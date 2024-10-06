import * as React from "react";
import { Shape as ShapeComponent } from "./Shape";
import "./Canvas.css";
import { screenToCanvas } from "./utils/vec";
import Hand from "./Hand";
import ContextMenu from "./ContextMenu";
import useCards, { processRawText } from "./hooks/useCards";
import { useEffect } from "react";
import { usePeerStore } from "./hooks/usePeerConnection";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import "./Modal.css";
import { generateId } from "./utils/math";
import { useCardReducer } from "./hooks/useCardReducer";
import { DEFAULT_DECK } from "./DEFAULT_DECK";
import { zoomCamera, panCamera } from "./utils/canvas_utils";
import { SelectionPanel } from "./SelectionPanel";
import inputs from "./inputs";
import { useGesture } from "@use-gesture/react";
import { useShapeStore } from "./hooks/useShapeStore";

export interface Point {
  x: number;
  y: number;
}

export interface Card {
  id: string;
  src: string;
}

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface Shape {
  id: string;
  point: number[];
  size: number[];
  type: ShapeType;
  text?: string;
  src?: string;
  rotation?: number;
  isFlipped?: boolean;
  fontSize?: number;
}

type ShapeType = "rectangle" | "circle" | "arrow" | "text" | "image" | "ping";

export type Mode = "select" | "create";

function rotateShape(shape: Shape, angle: number): Shape {
  return {
    ...shape,
    rotation: (shape.rotation || 0) + angle,
  };
}
const MAX_ZOOM_STEP = 5;

function normalizeWheel(event: WheelEvent) {
  const { deltaY, deltaX } = event;

  let deltaZ = 0;

  if (event.ctrlKey || event.metaKey) {
    const signY = Math.sign(event.deltaY);
    const absDeltaY = Math.abs(event.deltaY);

    let dy = deltaY;

    if (absDeltaY > MAX_ZOOM_STEP) {
      dy = MAX_ZOOM_STEP * signY;
    }

    deltaZ = dy;
  }

  return [deltaX, deltaY, deltaZ];
}

export default function Canvas() {
  const {
    shapes,
    selectedShapeIds,
    shapeInCreation,
    editingText,
    selectionRect,
    setShapes,
    setSelectedShapeIds,
    setShapeInCreation,
    setEditingText,
    setSelectionRect,
    createShape,
    updateShapeInCreation,
  } = useShapeStore();

  const { initPeer, disconnect, sendMessage, onMessage } = usePeerStore();
  const [camera, setCamera] = React.useState<Camera>({ x: 0, y: 0, z: 1 });
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const d = params.get("deck");

  const { data } = useCards(
    Array.from(processRawText(d || DEFAULT_DECK.join("\n")))
  );

  const [mode, setMode] = React.useState<Mode>("select");
  const [shapeType] = React.useState<ShapeType>("text");
  const [receivedData, setReceivedData] = React.useState<Shape[]>([]);
  const [opponentInfo, setOpponentInfo] = React.useState<{
    cards: number;
    deck: number;
  }>({ cards: 0, deck: 0 });

  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);
  const [isCommandPressed, setIsCommandPressed] = React.useState(false);
  const [cardState, dispatch] = useCardReducer({
    cards: [],
    deck: [],
  });
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [lastPanPosition, setLastPanPosition] = React.useState<Point | null>(
    null
  );
  useGesture(
    {
      onWheel: ({ event, delta, ctrlKey }) => {
        event.preventDefault();
        if (ctrlKey) {
          const { point } = inputs.wheel(event as WheelEvent);
          const z = normalizeWheel(event)[2];
          setCamera((prev) => zoomCamera(prev, point, z * 0.618));
          return;
        } else {
          setCamera((camera) => panCamera(camera, delta[0], delta[1]));
        }
      },
    },
    {
      target: document.body,
      eventOptions: { passive: false },
    }
  );
  const { cards, deck } = cardState;

  const ref = React.useRef<SVGSVGElement>(null);
  const rDragging = React.useRef<{
    shape: Shape;
    origin: number[];
  } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const drawCard = () => {
    dispatch({ type: "DRAW_CARD" });
  };
  const mulligan = () => {
    dispatch({ type: "MULLIGAN" });
  };
  const addPing = React.useCallback(
    (x: number, y: number) => {
      const newPing: Shape = {
        id: generateId(),
        point: [x, y],
        size: [40, 40],
        type: "ping",
      };
      setShapes((prevShapes) => [...prevShapes, newPing]);

      // Remove the ping after 2 seconds
      setTimeout(() => {
        setShapes((prevShapes) =>
          prevShapes.filter((shape) => shape.id !== newPing.id)
        );
      }, 2000);
    },
    [setShapes]
  );
  const sendBackToHand = () => {
    const selectedCards = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    ) as Card[];
    dispatch({ type: "SEND_TO_HAND", payload: selectedCards });
    setShapes((prevShapes) =>
      prevShapes.filter((shape) => !selectedShapeIds.includes(shape.id))
    );
    setSelectedShapeIds([]);
  };
  const sendBackToDeck = () => {
    const selectedCards = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    ) as Card[];
    dispatch({ type: "SEND_TO_DECK", payload: selectedCards });
    setShapes((prevShapes) =>
      prevShapes.filter((shape) => !selectedShapeIds.includes(shape.id))
    );
    setSelectedShapeIds([]);
  };
  const handleDrop = (e: React.DragEvent<SVGElement>) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const card = cardState.cards.find((card) => card.id === cardId);
    if (!card) return;
    dispatch({ type: "REMOVE_FROM_HAND", payload: [cardId] });

    setShapes((prevShapes) => [
      ...prevShapes,
      {
        id: generateId(),
        point: [x, y],
        size: [100, 100],
        type: "image",
        src: card.src,
        rotation: 0,
      },
    ]);
  };
  function flipShape(shape: Shape): Shape {
    return {
      ...shape,
      isFlipped: !shape.isFlipped,
    };
  }
  function onFlip() {
    if (mode === "select" && selectedShapeIds.length > 0) {
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          selectedShapeIds.includes(shape.id) ? flipShape(shape) : shape
        )
      );
    }
  }
  function onPointerDownCanvas(e: React.PointerEvent<SVGElement>) {
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    if (e.button === 0 && e.altKey) {
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (mode === "create") {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (shapeType === "text") {
        const id = generateId();
        setShapes([
          ...shapes,
          {
            id,
            point,
            size: [0, 0],
            type: "text",
            text: "",
          },
        ]);
        setEditingText({ id, text: "" });
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } else {
        createShape(shapeType, point);
      }
      return;
    } else if (mode === "select" && !rDragging.current) {
      setSelectionRect({
        start: { x, y },
        end: { x, y },
      });
    }
  }
  function onPointerMoveCanvas(e: React.PointerEvent<SVGElement>) {
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    if (isPanning && lastPanPosition) {
      const dx = e.clientX - lastPanPosition.x;
      const dy = e.clientY - lastPanPosition.y;
      setCamera(panCamera(camera, -dx, -dy));
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    setMousePosition({ x, y });
    if (mode === "create" && shapeInCreation) {
      updateShapeInCreation([x, y]);
    } else if (mode === "select" && selectionRect) {
      setSelectionRect({
        ...selectionRect,
        end: { x, y },
      });
    }
  }
  const onPointerUpCanvas = (e: React.PointerEvent<SVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPosition(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    if (mode === "create" && shapeInCreation) {
      e.currentTarget.releasePointerCapture(e.pointerId);

      setShapes((prevShapes) => [...prevShapes, shapeInCreation.shape]);
      setShapeInCreation(null);
      setMode("select");
    } else if (mode === "select" && selectionRect) {
      const { start, end } = selectionRect;
      const rect = {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(start.x - end.x),
        height: Math.abs(start.y - end.y),
      };

      const selectedShapes = shapes.filter((shape) => {
        const [shapeX, shapeY] = shape.point;
        const [shapeWidth, shapeHeight] = shape.size;
        return (
          shapeX >= rect.x &&
          shapeY >= rect.y &&
          shapeX + shapeWidth <= rect.x + rect.width &&
          shapeY + shapeHeight <= rect.y + rect.height
        );
      });

      if (selectedShapes.length > 0) {
        setSelectedShapeIds(selectedShapes.map((shape) => shape.id));
      } else {
        setSelectedShapeIds([]);
      }

      setSelectionRect(null);
    }
  };
  function onTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (editingText) {
      const updatedText = e.target.value;
      setEditingText({ ...editingText, text: updatedText });
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          shape.id === editingText.id
            ? {
                ...shape,
                text: updatedText,
                size: [updatedText.length * 10, 100], // Update size based on text length
                fontSize: 40,
              }
            : shape
        )
      );
    }
  }
  function onTextBlur() {
    setEditingText(null);
    setMode("select");
  }
  function onEngageDisengageCard() {
    if (mode === "select" && selectedShapeIds.length > 0) {
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          selectedShapeIds.includes(shape.id) && shape.type === "image"
            ? shape.rotation !== 0
              ? rotateShape(shape, -90)
              : rotateShape(shape, 90)
            : shape
        )
      );
    }
  }
  const updateDraggingRef = React.useCallback(
    (newRef: { shape: Shape; origin: number[] } | null) => {
      rDragging.current = newRef;
    },
    [rDragging]
  );
  const onShuffleDeck = () => {
    dispatch({ type: "SHUFFLE_DECK" });
  };

  // use effects
  useEffect(() => {
    if (isPanning) {
      // set grap cursor
      document.body.style.cursor = "grab";
    } else {
      document.body.style.cursor = "default";
    }
  }, [isPanning]);
  useEffect(() => {
    const unsubscribe = useShapeStore.subscribe((state) => {
      sendMessage({ type: "shapes", payload: state.shapes });
    });

    return () => {
      unsubscribe();
    };
  }, [sendMessage]);

  useEffect(() => {
    if (data) {
      const initialDeck: Card[] = data
        .filter((card) => card.image_uris?.normal)
        .map((card) => ({
          id: card.id,
          src: card.image_uris.normal,
        }));
      dispatch({ type: "INITIALIZE_DECK", payload: initialDeck });
    }
  }, [data, dispatch]);

  useEffect(() => {
    initPeer();
    return () => {
      disconnect();
    };
  }, [initPeer, disconnect]);

  useEffect(() => {
    const unsubscribeShapes = onMessage("shapes", (message) => {
      setReceivedData(message.payload);
    });

    const unsubscribeConnected = onMessage("connected", (message) => {
      toast(`Peer connected: ${message.payload.peerId}`);
    });

    const unsubscribeCards = onMessage("cards", (message) => {
      setOpponentInfo((prev) => ({ ...prev, cards: message.payload }));
    });

    const unsubscribeDeck = onMessage("deck", (message) => {
      setOpponentInfo((prev) => ({ ...prev, deck: message.payload }));
    });

    const unsubscribeProuton = onMessage("prouton", () => {
      toast(`Prouton!`);
    });

    return () => {
      unsubscribeShapes();
      unsubscribeConnected();
      unsubscribeCards();
      unsubscribeDeck();
      unsubscribeProuton();
    };
  }, [onMessage]);

  useEffect(() => {
    sendMessage({ type: "cards", payload: cards.length });
    sendMessage({ type: "deck", payload: deck.length });
  }, [cards, deck, sendMessage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Meta") {
        setIsCommandPressed(true);
      } else if (event.key === "p" || event.key === "P") {
        addPing(mousePosition.x, mousePosition.y);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Meta") {
        setIsCommandPressed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mousePosition, addPing]);

  const pings = receivedData.filter((shape) => shape.type === "ping");
  const others = receivedData.filter((shape) => shape.type !== "ping");
  const transform = `scale(${camera.z}) translate(${camera.x}px, ${camera.y}px)`;

  return (
    <div>
      <ContextMenu
        onEngageDisengageCard={onEngageDisengageCard}
        onFlip={onFlip}
        sendBackToDeck={sendBackToDeck}
        sendBackToHand={sendBackToHand}
      >
        <svg
          ref={ref}
          onPointerDown={onPointerDownCanvas}
          onPointerMove={onPointerMoveCanvas}
          onPointerUp={onPointerUpCanvas}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{ backgroundColor: "#fff" }}
        >
          <g style={{ transform }}>
            <image
              x={-3000}
              y={20}
              width={100}
              height={100}
              href="/sonic.gif"
            />
            {others &&
              others.map((shape: Shape) => (
                <ShapeComponent
                  readOnly={true}
                  key={shape.id}
                  shape={shape}
                  mode={mode}
                  camera={camera}
                  rDragging={{ current: null }}
                  inputRef={{ current: null }}
                  setHoveredCard={setHoveredCard}
                  updateDraggingRef={() => {}}
                  selected={false}
                />
              ))}
            {shapes
              .filter((shape) => shape.id !== editingText?.id)
              .map((shape) => (
                <ShapeComponent
                  readOnly={false}
                  key={shape.id}
                  shape={shape}
                  mode={mode}
                  rDragging={rDragging}
                  inputRef={inputRef}
                  camera={camera}
                  setHoveredCard={setHoveredCard}
                  updateDraggingRef={updateDraggingRef}
                  selected={selectedShapeIds.includes(shape.id)}
                />
              ))}
            {pings &&
              pings.map((shape) => (
                <ShapeComponent
                  readOnly={true}
                  key={shape.id}
                  shape={shape}
                  mode={mode}
                  camera={camera}
                  rDragging={{ current: null }}
                  inputRef={{ current: null }}
                  setHoveredCard={setHoveredCard}
                  updateDraggingRef={() => {}}
                  selected={false}
                />
              ))}
            {shapeInCreation && (
              <ShapeComponent
                readOnly={false}
                key={shapeInCreation.shape.id}
                shape={shapeInCreation.shape}
                mode={mode}
                camera={camera}
                inputRef={inputRef}
                rDragging={rDragging}
                setHoveredCard={setHoveredCard}
                updateDraggingRef={updateDraggingRef}
                selected={selectedShapeIds.includes(shapeInCreation.shape.id)}
              />
            )}
            {editingText && (
              <foreignObject
                x={
                  shapes.find((shape) => shape.id === editingText.id)
                    ?.point[0] ?? 0
                }
                y={
                  (shapes.find((shape) => shape.id === editingText.id)
                    ?.point[1] ?? 0) - 16
                }
                width={200}
                height={32}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={editingText.text}
                  onChange={onTextChange}
                  onBlur={onTextBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onTextBlur();
                    }
                  }}
                />
              </foreignObject>
            )}
            {selectionRect && (
              <rect
                x={Math.min(selectionRect.start.x, selectionRect.end.x)}
                y={Math.min(selectionRect.start.y, selectionRect.end.y)}
                width={Math.abs(selectionRect.start.x - selectionRect.end.x)}
                height={Math.abs(selectionRect.start.y - selectionRect.end.y)}
                fill="rgba(0, 0, 255, 0.3)"
                stroke="blue"
              />
            )}
            {opponentInfo.cards > 0 && opponentInfo.deck > 0 && (
              <text
                x={100}
                y={100}
                fontSize={24}
                style={{
                  userSelect: "none",
                }}
              >
                {`Opponent data: ${opponentInfo.cards} cards in hand`}
              </text>
            )}
          </g>
        </svg>
      </ContextMenu>
      <div>
        <SelectionPanel
          setCamera={setCamera}
          setMode={setMode}
          mode={mode}
          onMulligan={mulligan}
          onDrawCard={drawCard}
          onShuffleDeck={onShuffleDeck}
        />
      </div>
      <Hand cards={cards} setHoveredCard={setHoveredCard} />
      {isCommandPressed && hoveredCard && (
        <div className="zoomed-card" style={{ pointerEvents: "none" }}>
          <img src={hoveredCard} alt={`Zoomed ${hoveredCard}`} />
        </div>
      )}
    </div>
  );
}
