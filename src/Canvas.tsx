import * as React from "react";
import { Shape as ShapeComponent } from "./Shape";
import "./Canvas.css";
import { screenToCanvas } from "./utils/vec";
import Hand from "./Hand";
import ContextMenu from "./ContextMenu";
import useCards, {
  Datum,
  mapDataToCards,
  processRawText,
} from "./hooks/useCards";
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

class DOMVector {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly magnitudeX: number,
    readonly magnitudeY: number
  ) {
    this.x = x;
    this.y = y;
    this.magnitudeX = magnitudeX;
    this.magnitudeY = magnitudeY;
  }

  getDiagonalLength(): number {
    return Math.sqrt(
      Math.pow(this.magnitudeX, 2) + Math.pow(this.magnitudeY, 2)
    );
  }

  toDOMRect(): DOMRect {
    return new DOMRect(
      Math.min(this.x, this.x + this.magnitudeX),
      Math.min(this.y, this.y + this.magnitudeY),
      Math.abs(this.magnitudeX),
      Math.abs(this.magnitudeY)
    );
  }

  toTerminalPoint(): DOMPoint {
    return new DOMPoint(this.x + this.magnitudeX, this.y + this.magnitudeY);
  }

  add(vector: DOMVector): DOMVector {
    return new DOMVector(
      this.x + vector.x,
      this.y + vector.y,
      this.magnitudeX + vector.magnitudeX,
      this.magnitudeY + vector.magnitudeY
    );
  }

  clamp(vector: DOMRect): DOMVector {
    return new DOMVector(
      this.x,
      this.y,
      Math.min(vector.width - this.x, this.magnitudeX),
      Math.min(vector.height - this.y, this.magnitudeY)
    );
  }
}

export interface Point {
  x: number;
  y: number;
}

export interface Card {
  id: string;
  src: string[];
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
  src?: string[];
  srcIndex: number;
  rotation?: number;
  isFlipped?: boolean;
  fontSize?: number;
  values?: [number, number];
  color?: string;
}

type ShapeType =
  | "rectangle"
  | "circle"
  | "arrow"
  | "text"
  | "image"
  | "ping"
  | "token";

export type Mode = "select" | "create";

let canvas: HTMLCanvasElement;

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @param {String} text The text to be rendered.
 * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
 *
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
function getTextWidth(text: string, font: string) {
  // re-use canvas object for better performance
  canvas = canvas || document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 0;
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

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

const playersColors = [
  "rgb(255, 0, 0, 0.5)",
  "rgb(0, 255, 0, 0.5)",
  "rgb(0, 0, 255, 0.5)",
  "rgb(255, 255, 0, 0.5)",
  "rgb(128, 0, 128, 0.5)",
  "rgb(255, 165, 0, 0.5)",
];
const getPlayerColor = (index: number) =>
  playersColors[index % playersColors.length];

const TextElement = ({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) => (
  <text
    x={x}
    y={y}
    style={{
      fontSize: "12px",
      fontFamily: "monospace",
      userSelect: "none",
      opacity: 0.7,
    }}
    width={100}
    height={100}
  >
    {children}
  </text>
);

function intersect(rect1: DOMRect, rect2: DOMRect) {
  if (rect1.right < rect2.left || rect2.right < rect1.left) return false;

  if (rect1.bottom < rect2.top || rect2.bottom < rect1.top) return false;

  return true;
}

export default function Canvas() {
  const {
    shapes,
    selectedShapeIds,
    shapeInCreation,
    editingText,
    setShapes,
    setSelectedShapeIds,
    setShapeInCreation,
    setEditingText,
    createShape,
    updateShapeInCreation,
  } = useShapeStore();

  const { initPeer, disconnect, sendMessage, onMessage, peer, error } =
    usePeerStore();
  const [showHelp, setShowHelp] = React.useState(true);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragVector, setDragVector] = React.useState<DOMVector | null>(null);
  const [camera, setCamera] = React.useState<Camera>({ x: 0, y: 0, z: 1 });
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const d = params.get("deck");
  const selectionRect =
    dragVector && isDragging ? dragVector.toDOMRect() : null;

  const { data } = useCards(
    Array.from(processRawText(d || DEFAULT_DECK.join("\n")))
  );

  const allParts =
    data
      ?.filter((v) => v.all_parts && v.all_parts.length > 0)
      .flatMap((v) => v.all_parts) ?? [];

  //fetch related cards
  const { data: relatedCards } = useCards(
    Array.from(
      new Set(
        allParts.map((v) => {
          if (v.name.includes("//")) {
            //Double faced card
            return v.name.split("//")[0].trim();
          }
          return v.name;
        })
      )
    ).concat(["copy", "Amoeboid Changeling"])
  );

  const [mode, setMode] = React.useState<Mode>("select");
  const [shapeType] = React.useState<ShapeType>("text");
  const [receivedDataMap, setReceivedDataMap] = React.useState<
    Record<string, Shape[]>
  >({});

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
        srcIndex: 0,
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

  const addToken = () => {
    const center = screenToCanvas(
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      camera
    );
    setShapes((prev) => [
      ...prev,
      {
        id: generateId(),
        type: "token",
        point: [center.x, center.y],
        size: [55, 55],
        srcIndex: 0,
        fontSize: 12,
        text: "+1/+1",
      },
    ]);
  };

  const sendBackToHand = () => {
    const selectedCards: Card[] = getSelectedCards();
    dispatch({ type: "SEND_TO_HAND", payload: selectedCards });
    clearSelectedCards();
  };
  const sendBackToDeck = (position: "top" | "bottom") => {
    const selectedCards: Card[] = getSelectedCards();
    dispatch({
      type: "SEND_TO_DECK",
      payload: { cards: selectedCards, position },
    });
    clearSelectedCards();
  };

  const increaseSrcIndex = () => {
    setShapes((prevShapes) =>
      prevShapes.map((shape) => {
        if (selectedShapeIds.includes(shape.id) && shape.type === "image") {
          return {
            ...shape,
            srcIndex: (shape.srcIndex + 1) % (shape.src?.length ?? 1),
          };
        }
        return shape;
      })
    );
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
        srcIndex: 0,
        rotation: 0,
      },
    ]);
  };

  function clearSelectedCards() {
    setShapes((prevShapes) =>
      prevShapes.filter((shape) => {
        if (shape.type === "image") {
          return !selectedShapeIds.includes(shape.id);
        }
        return true;
      })
    );
    setSelectedShapeIds([]);
  }

  function getSelectedCards(): Card[] {
    return shapes
      .filter((shape) => selectedShapeIds.includes(shape.id))
      .filter((shape) => shape.type === "image")
      .map((shape) => ({
        id: shape.id,
        src: shape.src as string[],
        srcIndex: shape.srcIndex,
      }));
  }

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
            srcIndex: 0,
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
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragVector(new DOMVector(x, y, 0, 0));
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
    } else if (mode === "select" && dragVector) {
      const nextDragVector = new DOMVector(
        dragVector.x,
        dragVector.y,
        x - dragVector.x,
        y - dragVector.y
      );
      if (!isDragging && nextDragVector.getDiagonalLength() < 10) return;

      setIsDragging(true);
      setDragVector(nextDragVector);
      const rect = nextDragVector.toDOMRect();

      const selectedShapes = shapes.filter((shape) => {
        const [shapeX, shapeY] = shape.point;
        const [shapeWidth, shapeHeight] = shape.size;
        // TODO: it's not working properly with text and tokens
        const shapeRect = new DOMRect(shapeX, shapeY, shapeWidth, shapeHeight);
        return intersect(rect, shapeRect);
      });

      if (selectedShapes.length > 0) {
        setSelectedShapeIds(selectedShapes.map((shape) => shape.id));
      } else {
        setSelectedShapeIds([]);
      }
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
    } else if (mode === "select") {
      if (isDragging) {
        setDragVector(null);
        setIsDragging(false);
      } else {
        setSelectedShapeIds([]);
        setDragVector(null);
      }
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
                size: [inputWidth, inputHeight],
              }
            : shape
        )
      );
    }
  }
  function onTextBlur() {
    if (editingText?.text === "") {
      setShapes((prevShapes) =>
        prevShapes.filter((shape) => shape.id !== editingText.id)
      );
    }
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
  const copy = () => {
    const selectedShapes = shapes
      .filter((shape) => selectedShapeIds.includes(shape.id))
      .map((shape) => ({
        ...shape,
        id: generateId(),
        point: [shape.point[0] + 100, shape.point[1] + 100],
      }));
    setShapes((prevShapes) => [...prevShapes, ...selectedShapes]);
  };
  const addCardToHand = (card: Datum) => {
    console.log("addCardToHand", card);
    dispatch({ type: "ADD_TO_HAND", payload: card });
  };

  const changeColor = (color: string) => {
    if (mode === "select" && selectedShapeIds.length === 1) {
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          selectedShapeIds.includes(shape.id) ? { ...shape, color } : shape
        )
      );
    }
  };

  // need to figure how to make it work with more than 2 players
  // const giveCardToOpponent = () => {
  //   const selectedCards = shapes.filter((shape) =>
  //     selectedShapeIds.includes(shape.id)
  //   ) as Card[];
  //   sendMessage({
  //     type: "giveCardToOpponent",
  //     payload: selectedCards.map((card) => ({
  //       ...card,
  //       id: generateId(),
  //     })),
  //   });
  //   setShapes((prevShapes) =>
  //     prevShapes.filter((shape) => !selectedShapeIds.includes(shape.id))
  //   );
  //   setSelectedShapeIds([]);
  // };

  const sendCardToBack = () => {
    const selectedCards = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    );
    setShapes((prevShapes) =>
      selectedCards.concat(
        prevShapes.filter((shape) => !selectedShapeIds.includes(shape.id))
      )
    );
    setSelectedShapeIds([]);
  };

  const sendCardToFront = () => {
    const selectedCards = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    );
    setShapes((prevShapes) =>
      prevShapes
        .filter((shape) => !selectedShapeIds.includes(shape.id))
        .concat(selectedCards)
    );
    setSelectedShapeIds([]);
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
      sendMessage({
        type: "shapes",
        payload: {
          id: peer?.id,
          data: state.shapes,
        },
      });
    });

    return () => {
      unsubscribe();
    };
  }, [sendMessage, peer]);

  useEffect(() => {
    if (data) {
      const initialDeck: Card[] = mapDataToCards(data);
      dispatch({ type: "INITIALIZE_DECK", payload: initialDeck });
      toast(`Deck initialized with ${initialDeck.length} cards`);
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
      setReceivedDataMap((prev) => ({
        ...prev,
        [message.payload.id]: message.payload.data,
      }));
    });

    const unsubscribeConnected = onMessage("connected", (message) => {
      toast(`Peer connected: ${message.payload.peerId}`);
    });

    const unsubscribeProuton = onMessage("prouton", () => {
      toast(`Prouton!`);
    });

    // const unsubscribeGiveCardToOpponent = onMessage(
    //   "giveCardToOpponent",
    //   (message) => {
    //     setShapes((prevShapes) => [...prevShapes, ...message.payload]);
    //   }
    // );

    return () => {
      unsubscribeShapes();
      unsubscribeConnected();
      unsubscribeProuton();
      // unsubscribeGiveCardToOpponent();
    };
  }, [onMessage, setShapes]);

  useEffect(() => {
    sendMessage({ type: "cards", payload: cards.length });
    sendMessage({ type: "deck", payload: deck.length });
  }, [cards, deck, sendMessage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Control") {
        setIsCommandPressed(true);
      } else if ((event.key === "p" || event.key === "P") && !editingText) {
        addPing(mousePosition.x, mousePosition.y);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Control") {
        setIsCommandPressed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mousePosition, addPing, editingText]);

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const receivedData: (Shape & { color: string })[] = Object.values(
    receivedDataMap
  )
    .map((data, index) =>
      data.map((shape) => ({
        ...shape,
        color: getPlayerColor(index),
      }))
    )
    .flat();
  const pings = receivedData.filter((shape) => shape.type === "ping");
  const others = receivedData.filter((shape) => shape.type !== "ping");
  const transform = `scale(${camera.z}) translate(${camera.x}px, ${camera.y}px)`;
  const editingTextShape = shapes.find((shape) => shape.id === editingText?.id);
  const editingTextPointX = editingTextShape?.point[0] ?? 0;
  const editingTextPointY = editingTextShape?.point[1] ?? 0;
  let inputWidth = 0;
  if (editingText) {
    const textWidth = getTextWidth(
      editingText.text,
      `normal ${editingTextShape?.fontSize ?? 12}px Arial`
    );
    inputWidth = Math.max(textWidth, 10);
  }
  const inputHeight = editingTextShape?.fontSize ?? 12;

  const textItems = [
    {
      x: window.innerWidth / 2 - 100,
      y: 240,
      text: "Ctrl + hover on card to show zoomed card.",
    },
    {
      x: window.innerWidth / 2 - 100,
      y: 260,
      text: "Get your deck by clicking select deck and pasting the list in the modal.",
    },
    {
      x: window.innerWidth / 2 - 100,
      y: 280,
      text: "Shift + click to engage/disengage.",
    },
    {
      x: window.innerWidth / 2 - 100,
      y: 300,
      text: "Double click on text to edit.",
    },
    {
      x: window.innerWidth / 2 - 100,
      y: 320,
      text: "Connect to a peer to play with them.",
    },
    {
      x: window.innerWidth / 2 - 100,
      y: 340,
      text: "Pan and zoom with mouse pad.",
    },
  ];

  return (
    <div>
      <ContextMenu
        onEngageDisengageCard={onEngageDisengageCard}
        onFlip={onFlip}
        sendBackToDeck={sendBackToDeck}
        copy={copy}
        sendBackToHand={sendBackToHand}
        sendCardToFront={sendCardToFront}
        sendCardToBack={sendCardToBack}
        // giveCardToOpponent={giveCardToOpponent}
        increaseSrcIndex={increaseSrcIndex}
      >
        <svg
          ref={ref}
          onPointerDown={onPointerDownCanvas}
          onPointerMove={onPointerMoveCanvas}
          onPointerUp={onPointerUpCanvas}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <g style={{ transform }}>
            <text
              x={window.innerWidth / 2 - 100}
              y={200}
              style={{
                fontSize: "20px",
                userSelect: "none",
                fontFamily: "cursive",
                cursor: "pointer",
              }}
              width={100}
              height={100}
              onPointerDown={(e) => {
                e.stopPropagation();
                setShowHelp((prev) => !prev);
              }}
            >
              Maginet - pire to pire edition
            </text>
            {showHelp &&
              textItems.map((item, index) => (
                <TextElement key={index} x={item.x} y={item.y}>
                  {item.text}
                </TextElement>
              ))}
            {others &&
              others.map((shape) => (
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
                  color={shape.color}
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
                  editingTextShape?.type === "text"
                    ? editingTextPointX
                    : editingTextPointX - inputWidth / 2
                }
                y={editingTextPointY - inputHeight}
                height={"100%"}
                width={"100%"}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={editingText.text}
                  onChange={onTextChange}
                  onBlur={onTextBlur}
                  style={{
                    width: `${inputWidth}px`,
                    height: `${inputHeight}px`,
                    fontSize: `${editingTextShape?.fontSize ?? 12}px`,
                    outline: "none",
                    border: "none",
                    backgroundColor: "rgba(0, 0, 0, 0)",
                  }}
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
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(0, 0, 255, 0.3)"
                stroke="blue"
              />
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
          cards={data}
          relatedCards={relatedCards}
          addCardToHand={addCardToHand}
          addToken={addToken}
          changeColor={changeColor}
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
