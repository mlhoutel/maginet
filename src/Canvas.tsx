import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useGesture } from "@use-gesture/react";

import { Shape as ShapeComponent } from "./Shape";
import "./Canvas.css";
import { DOMVector, screenToCanvas } from "./utils/vec";
import Hand from "./Hand";
import ContextMenu from "./ContextMenu";
import useCards, {
  Datum,
  mapDataToCards,
  processRawText,
} from "./hooks/useCards";
import { usePeerStore } from "./hooks/usePeerConnection";
import "./Modal.css";
import { generateId } from "./utils/math";
import { useCardReducer } from "./hooks/useCardReducer";
import { DEFAULT_DECK } from "./DEFAULT_DECK";
import { zoomCamera, panCamera } from "./utils/canvas_utils";
import { SelectionPanel } from "./SelectionPanel";
import inputs, { normalizeWheel } from "./inputs";
import { useShapeStore } from "./hooks/useShapeStore";
import EditingTextShape from "./EditingTextShape";
import type { ActionLogEntry } from "./ActionLog";

import {
  Point,
  Card,
  Camera,
  Shape,
  ShapeType,
  Mode,
  rotateShape,
  flipShape,
  intersect,
} from "./types/canvas";

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_STALE_MS = HEARTBEAT_INTERVAL_MS * 3;
const MAX_ACTION_LOG_ENTRIES = 50;
const CARD_ACTION_DESCRIPTIONS: Record<string, string> = {
  DRAW_CARD: "drew a card",
  MULLIGAN: "took a mulligan",
  SEND_TO_HAND: "moved cards to hand",
  SEND_TO_DECK: "returned cards to the deck",
  PLAY_CARD: "played a card",
  ADD_TO_HAND: "searched a card",
  SHUFFLE_DECK: "shuffled the deck",
};

type RandomEventType = "coin" | "d6" | "d20" | "starter";

function generatePlayerName() {
  const adjectives = [
    "Swift",
    "Arcane",
    "Silent",
    "Crimson",
    "Verdant",
    "Luminous",
    "Shadow",
    "Iron",
    "Lucky",
    "Misty",
  ];
  const nouns = [
    "Falcon",
    "Mage",
    "Knight",
    "Wisp",
    "Golem",
    "Druid",
    "Rogue",
    "Phoenix",
    "Sphinx",
    "Voyager",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = Math.floor(Math.random() * 900 + 100); // 3-digit for uniqueness
  return `${adj} ${noun} #${suffix}`;
}

function describeRandomEvent(event: { type: RandomEventType; result: string }) {
  switch (event.type) {
    case "coin":
      return `flipped a coin: ${event.result}`;
    case "d6":
      return `rolled a d6: ${event.result}`;
    case "d20":
      return `rolled a d20: ${event.result}`;
    case "starter":
      return `starting player: ${event.result}`;
    default:
      return `random: ${event.result}`;
  }
}

function Canvas() {
  // Shape store state and actions
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
    undo,
    redo,
  } = useShapeStore();

  // Peer connection state and actions
  const {
    initPeer,
    disconnect,
    sendMessage,
    onMessage,
    peer,
    error,
    connections,
  } = usePeerStore();

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [dragVector, setDragVector] = useState<DOMVector | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const [mode, setMode] = useState<Mode>("select");
  const [shapeType, setShapeType] = useState<ShapeType>("text");
  const [receivedDataMap, setReceivedDataMap] = useState<
    Record<string, Shape[]>
  >({});
  const [peerPresence, setPeerPresence] = useState<Record<string, number>>({});
  const [peerNames, setPeerNames] = useState<Record<string, string>>({});
  const [, setActionLog] = useState<ActionLogEntry[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isCommandPressed, setIsCommandPressed] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [, setMousePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState<Point | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Refs
  const ref = useRef<SVGSVGElement>(null);
  const rDragging = useRef<{ shape: Shape; origin: number[] } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastLoggedActionId = useRef<number | undefined>(undefined);
  const playerNameRef = useRef<string>(generatePlayerName());
  const actionLogRef = useRef<ActionLogEntry[]>([]);

  const logActionToConsole = (
    entry: ActionLogEntry,
    origin: string = "Action Log"
  ) => {
    const name = entry.playerName || entry.playerId || "Player";
    const time = entry.timestamp
      ? new Date(entry.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      : null;
    const summary = `${name} (${entry.cardsInHand} in hand): ${entry.action}`;
    const suffix = time ? ` @ ${time}` : "";
    console.info(`[${origin}] ${summary}${suffix}`);
  };

  const updateActionLog = (
    updater: (prev: ActionLogEntry[]) => ActionLogEntry[]
  ) => {
    setActionLog((prev) => {
      const next = updater(prev);
      actionLogRef.current = next;
      return next;
    });
  };

  const addActionLogEntry = (entry: ActionLogEntry) => {
    logActionToConsole(entry);
    updateActionLog((prev) => [...prev, entry].slice(-MAX_ACTION_LOG_ENTRIES));
  };

  const sendRandomEvent = (event: { type: RandomEventType; result: string }) => {
    const entry: ActionLogEntry = {
      playerId: peer?.id ?? "You",
      playerName: playerNameRef.current,
      action: describeRandomEvent(event),
      cardsInHand: cards.length,
      timestamp: Date.now(),
    };
    addActionLogEntry(entry);
    if (peer?.id) {
      sendMessage({
        type: "random-event",
        payload: {
          ...event,
          peerId: peer.id,
          playerName: playerNameRef.current,
          timestamp: entry.timestamp,
        },
      });
    }
  };

  const rollCoin = () => {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    sendRandomEvent({ type: "coin", result });
  };

  const rollDie = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const type = sides === 6 ? "d6" : "d20";
    sendRandomEvent({ type, result: result.toString() });
  };

  const pickStarter = () => {
    const participantIds = Array.from(new Set([peer?.id, ...connections.keys()].filter(Boolean))) as string[];
    if (participantIds.length === 0) return;
    const chosen = participantIds[Math.floor(Math.random() * participantIds.length)];
    const name = peerNames[chosen] || chosen;
    sendRandomEvent({ type: "starter", result: name });
  };

  // URL parameters
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const d = params.get("deck");

  // Selection rectangle
  const selectionRect =
    dragVector && isDragging ? dragVector.toDOMRect() : null;

  // Card data
  const { data } = useCards(
    Array.from(processRawText(d || DEFAULT_DECK.join("\n")))
  );

  // Related cards data
  const allParts =
    data
      ?.filter((v) => v.all_parts && v.all_parts.length > 0)
      .flatMap((v) => v.all_parts) ?? [];

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

  // Card state
  const [cardState, dispatch] = useCardReducer({
    cards: [],
    deck: [],
  });
  const { cards, deck, lastAction } = cardState;
  const cardStateRef = useRef(cardState);

  useEffect(() => {
    cardStateRef.current = cardState;
  }, [cardState]);

  // Gesture handling
  useGesture(
    {
      onWheel: ({ event, delta, ctrlKey }) => {
        event.preventDefault();
        // Ctrl+scroll or pinch = zoom, regular scroll = pan
        if (ctrlKey) {
          const { point } = inputs.wheel(event as WheelEvent);
          const z = normalizeWheel(event)[2];
          // Reduced zoom sensitivity for smoother zooming
          setCamera((prev) => zoomCamera(prev, point, z * 0.3));
        } else {
          // Regular scroll pans (good for trackpad)
          // Smooth pan with reduced sensitivity
          setCamera((camera) => panCamera(camera, delta[0] * 0.8, delta[1] * 0.8));
        }
      },
    },
    {
      target: document.body,
      eventOptions: { passive: false },
    }
  );

  // Card actions
  const drawCard = () => {
    dispatch({ type: "DRAW_CARD" });
  };

  const mulligan = () => {
    dispatch({ type: "MULLIGAN" });
  };

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
    const selectedCards: Card[] = getSelectedImages();
    dispatch({ type: "SEND_TO_HAND", payload: selectedCards });
    removeSelectedImages();
  };

  const sendBackToDeck = (position: "top" | "bottom") => {
    const selectedCards: Card[] = getSelectedImages();
    dispatch({
      type: "SEND_TO_DECK",
      payload: { cards: selectedCards, position },
    });
    removeSelectedImages();
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

  // Helper functions
  function removeSelectedImages() {
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

  function getSelectedImages(): Card[] {
    return shapes
      .filter((shape) => selectedShapeIds.includes(shape.id))
      .filter((shape) => shape.type === "image")
      .map((shape) => ({
        id: shape.id,
        src: shape.src as string[],
        srcIndex: shape.srcIndex,
      }));
  }

  // Shape actions
  function onFlip() {
    if (mode === "select" && selectedShapeIds.length > 0) {
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          selectedShapeIds.includes(shape.id) ? flipShape(shape) : shape
        )
      );
    }
  }

  function onEngageDisengageCard() {
    if (mode === "select" && selectedShapeIds.length > 0) {
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          selectedShapeIds.includes(shape.id) &&
            (shape.type === "image" || shape.type === "rectangle")
            ? shape.rotation !== 0
              ? rotateShape(shape, -90)
              : rotateShape(shape, 90)
            : shape
        )
      );
    }
  }

  const onShuffleDeck = () => {
    dispatch({ type: "SHUFFLE_DECK" });
  };

  const untapAll = () => {
    setShapes((prevShapes) =>
      prevShapes.map((shape) =>
        (shape.type === "image" || shape.type === "rectangle") && shape.rotation
          ? { ...shape, rotation: 0 }
          : shape
      )
    );
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

  // Event handlers
  const handleDrop = (e: React.DragEvent<SVGElement>) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    const playFaceDown = e.dataTransfer.getData("playFaceDown") === "true";
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const card = cardState.cards.find((card) => card.id === cardId);
    if (!card) return;
    dispatch({ type: "PLAY_CARD", payload: [cardId] });

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
        isFlipped: playFaceDown,
      },
    ]);
  };

  function onPointerDownCanvas(e: React.PointerEvent<SVGElement>) {
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];

    // Handle panning with middle mouse button, Space+drag, or Alt+drag
    if (e.button === 1 || (e.button === 0 && (isSpacePressed || e.altKey))) {
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Handle shape creation
    if (mode === "create") {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (shapeType === "text") {
        const id = generateId();
        setShapes((prevShapes) => [
          ...prevShapes,
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
          // highlight all text
          inputRef.current?.setSelectionRange(0, inputRef.current.value.length);
        }, 0);
      } else {
        createShape(shapeType, point);
      }
      return;
    }
    // Handle selection
    else if (mode === "select" && !rDragging.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragVector(new DOMVector(x, y, 0, 0));
    }
  }

  function onPointerMoveCanvas(e: React.PointerEvent<SVGElement>) {
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);

    // Handle panning
    if (isPanning && lastPanPosition) {
      const dx = e.clientX - lastPanPosition.x;
      const dy = e.clientY - lastPanPosition.y;
      setCamera(panCamera(camera, -dx, -dy));
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return;
    }

    setMousePosition({ x, y });

    // Handle shape creation
    if (mode === "create" && shapeInCreation) {
      updateShapeInCreation([x, y]);
    }
    // Handle selection
    else if (mode === "select" && dragVector) {
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
        const shapeRect = new DOMVector(shapeX, shapeY, shapeWidth, shapeHeight).toDOMRect();
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
    const normalizeShape = (shape: Shape): Shape => {
      const [w, h] = shape.size;
      const [px, py] = shape.point;
      if (w >= 0 && h >= 0) return shape;
      const nextX = w < 0 ? px + w : px;
      const nextY = h < 0 ? py + h : py;
      return { ...shape, point: [nextX, nextY], size: [Math.abs(w), Math.abs(h)] };
    };

    // Handle panning end
    if (isPanning) {
      setIsPanning(false);
      setLastPanPosition(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }

    // Handle shape creation end
    if (mode === "create" && shapeInCreation) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      const normalizedShape = normalizeShape(shapeInCreation.shape);
      setShapes((prevShapes) => [...prevShapes, normalizedShape]);
      setShapeInCreation(null);
      setMode("select");
    }
    // Handle selection end
    else if (mode === "select") {
      if (isDragging) {
        setDragVector(null);
        setIsDragging(false);
      } else {
        setSelectedShapeIds([]);
        setDragVector(null);
      }
    }
  };

  function onTextBlur() {
    if (editingText?.text === "") {
      setShapes((prevShapes) =>
        prevShapes.filter((shape) => shape.id !== editingText.id)
      );
    }
    setEditingText(null);
    setMode("select");
  }

  const updateDraggingRef = (newRef: { shape: Shape; origin: number[] } | null) => {
    rDragging.current = newRef;
  };

  // Effects
  useEffect(() => {
    if (isPanning) {
      document.body.style.cursor = "grabbing";
    } else if (isSpacePressed) {
      document.body.style.cursor = "grab";
    } else {
      document.body.style.cursor = "default";
    }
  }, [isPanning, isSpacePressed]);

  useEffect(() => {
    if (!peer?.id) {
      return;
    }

    const peerId = peer.id;
    let rafId: number | null = null;
    let pendingShapes: Shape[] | null = null;

    const flush = () => {
      if (!pendingShapes) {
        rafId = null;
        return;
      }

      sendMessage({
        type: "shapes",
        payload: {
          id: peerId,
          data: pendingShapes,
        },
      });

      pendingShapes = null;
      rafId = null;
    };

    const emitSnapshot = (snapshot: Shape[]) => {
      sendMessage({
        type: "shapes",
        payload: {
          id: peerId,
          data: snapshot,
        },
      });
    };

    emitSnapshot(useShapeStore.getState().shapes);

    const unsubscribe = useShapeStore.subscribe((state, prevState) => {
      if (state.shapes === prevState.shapes) return;
      pendingShapes = state.shapes;
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(flush);
    });

    return () => {
      unsubscribe();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [sendMessage, peer?.id]);

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
    if (peer?.id) {
      setPeerNames((prev) => ({ ...prev, [peer.id]: playerNameRef.current }));
    }
  }, [peer?.id]);

  useEffect(() => {
    sendMessage({
      type: "playersInfo",
      payload: {
        peerId: peer?.id,
        data: {
          cardsInHand: cards.length,
          lastAction,
        },
      },
    });
  }, [cards, lastAction, sendMessage, peer]);

  useEffect(() => {
    if (!lastAction || !cardState.actionId) return;

    if (lastLoggedActionId.current === cardState.actionId) return;
    lastLoggedActionId.current = cardState.actionId;

    const description = CARD_ACTION_DESCRIPTIONS[lastAction];
    if (!description) return;

    const entry: ActionLogEntry = {
      playerId: peer?.id ?? "You",
      playerName: playerNameRef.current,
      action: description,
      cardsInHand: cards.length,
      timestamp: Date.now(),
    };

    addActionLogEntry(entry);

    if (peer?.id) {
      sendMessage({ type: "action-log", payload: entry });
    }
  }, [addActionLogEntry, cardState.actionId, lastAction, cards.length, peer?.id, sendMessage]);

  // Keep card state local; do not broadcast deck/hand to peers

  useEffect(() => {
    if (!peer?.id) return;

    const sendHeartbeat = () => {
      const timestamp = Date.now();
      setPeerPresence((prev) => ({ ...prev, [peer.id]: timestamp }));
      setPeerNames((prev) => ({ ...prev, [peer.id]: playerNameRef.current }));
      sendMessage({
        type: "heartbeat",
        payload: { peerId: peer.id, timestamp, name: playerNameRef.current },
      });
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [peer?.id, sendMessage]);

  useEffect(() => {
    const unsubscribeShapes = onMessage("shapes", (message) => {
      setReceivedDataMap((prev) => ({
        ...prev,
        [message.payload.id]: message.payload.data,
      }));
    });

    const unsubscribeConnected = onMessage("connected", (message) => {
      toast(`Peer connected: ${message.payload.peerId}`);
      setPeerPresence((prev) => ({
        ...prev,
        [message.payload.peerId]: Date.now(),
      }));
      if (message.payload.name) {
        setPeerNames((prev) => ({
          ...prev,
          [message.payload.peerId]: message.payload.name,
        }));
      }

      if (peer?.id && message.payload.peerId && actionLogRef.current.length > 0) {
        sendMessage(
          {
            type: "action-log-snapshot",
            payload: { entries: actionLogRef.current.slice(-20) },
          },
          message.payload.peerId
        );
      }
    });

    const unsubscribeProuton = onMessage("prouton", () => {
      toast(`Prouton!`);
    });

    const unsubscribePlayersInfo = onMessage("playersInfo", () => { });

    const unsubscribeHeartbeat = onMessage("heartbeat", (message) => {
      setPeerPresence((prev) => ({
        ...prev,
        [message.payload.peerId]: message.payload.timestamp,
      }));
      if (message.payload.name) {
        setPeerNames((prev) => ({
          ...prev,
          [message.payload.peerId]: message.payload.name,
        }));
      }
    });

    const unsubscribeActionLog = onMessage("action-log", (message) => {
      const incoming = message.payload as ActionLogEntry;
      const entry = {
        ...incoming,
        timestamp: incoming.timestamp ?? Date.now(),
      };
      addActionLogEntry(entry);
    });

    const unsubscribeRandomEvent = onMessage("random-event", (message) => {
      const { type, result, playerName: name, peerId: fromPeerId, timestamp } = message.payload as {
        type: RandomEventType;
        result: string;
        playerName?: string;
        peerId?: string;
        timestamp?: number;
      };
      const entry: ActionLogEntry = {
        playerId: fromPeerId ?? "Peer",
        playerName: name,
        action: describeRandomEvent({ type, result }),
        cardsInHand: 0,
        timestamp: timestamp ?? Date.now(),
      };
      addActionLogEntry(entry);
    });

    const unsubscribeActionLogSnapshot = onMessage(
      "action-log-snapshot",
      (message) => {
        const { entries } = message.payload as { entries: ActionLogEntry[] };
        if (Array.isArray(entries) && entries.length > 0) {
          updateActionLog((prev) => {
            const merged = [...prev, ...entries].slice(-MAX_ACTION_LOG_ENTRIES);
            return merged;
          });
          entries.forEach((entry) => logActionToConsole(entry, "Action Snapshot"));
        }
      }
    );

    const unsubscribeCardState = onMessage("card-state", () => { });

    return () => {
      unsubscribeShapes();
      unsubscribeConnected();
      unsubscribeProuton();
      unsubscribePlayersInfo();
      unsubscribeHeartbeat();
      unsubscribeActionLog();
      unsubscribeActionLogSnapshot();
      unsubscribeRandomEvent();
      unsubscribeCardState();
    };
  }, [
    addActionLogEntry,
    dispatch,
    logActionToConsole,
    onMessage,
    peer?.id,
    sendMessage,
    setPeerNames,
    setPeerPresence,
    updateActionLog,
  ]);

  useEffect(() => {
    setReceivedDataMap((prev) => {
      const next = { ...prev };
      let changed = false;

      Object.keys(next).forEach((peerId) => {
        if (!connections.has(peerId)) {
          delete next[peerId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
    setPeerPresence((prev) => {
      const next = { ...prev };
      let changed = false;

      Object.keys(next).forEach((peerId) => {
        if (!connections.has(peerId) && peerId !== peer?.id) {
          delete next[peerId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
    setPeerNames((prev) => {
      const next = { ...prev };
      let changed = false;

      Object.keys(next).forEach((peerId) => {
        if (!connections.has(peerId) && peerId !== peer?.id) {
          delete next[peerId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [connections, peer?.id]);

  useEffect(() => {
    sendMessage({ type: "cards", payload: cards.length });
    sendMessage({ type: "deck", payload: deck.length });
  }, [cards, deck, sendMessage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore keyboard shortcuts when editing text
      if (editingText) return;

      // Platform-aware Cmd/Ctrl key
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;

      // Undo/Redo shortcuts
      if (cmdKey && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo(); // Cmd+Shift+Z or Ctrl+Shift+Z
        } else {
          undo(); // Cmd+Z or Ctrl+Z
        }
        return;
      }

      if (event.key === "Control") {
        setIsCommandPressed(true);
      } else if (event.key === " ") {
        event.preventDefault(); // Prevent page scroll
        setIsSpacePressed(true);
        document.body.style.cursor = "grab";
      } else if (event.key === "?" || event.key === "/") {
        // Toggle help panel
        setShowHelp((prev) => !prev);
      } else if (event.key === "+" || event.key === "=") {
        // Zoom in at center of screen with smooth increment
        const centerPoint = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        setCamera((prev) => zoomCamera(prev, [centerPoint.x, centerPoint.y], -0.2));
      } else if (event.key === "-" || event.key === "_") {
        // Zoom out at center of screen with smooth increment
        const centerPoint = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        setCamera((prev) => zoomCamera(prev, [centerPoint.x, centerPoint.y], 0.2));
      } else if (
        event.key === "Backspace" &&
        selectedShapeIds.length > 0
      ) {
        setShapes((prevShapes) =>
          prevShapes.filter((shape) => !selectedShapeIds.includes(shape.id))
        );
        setSelectedShapeIds([]);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Control") {
        setIsCommandPressed(false);
      } else if (event.key === " ") {
        setIsSpacePressed(false);
        if (!isPanning) {
          document.body.style.cursor = "default";
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    editingText,
    selectedShapeIds,
    setShapes,
    setSelectedShapeIds,
    isPanning,
    setCamera,
    undo,
    redo,
  ]);

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  // Render preparation
  const receivedData: Shape[] = Object.values(receivedDataMap).flat();
  const others = receivedData;
  const transform = `scale(${camera.z}) translate(${camera.x}px, ${camera.y}px)`;
  const editingTextShape = shapes.find((shape) => shape.id === editingText?.id);
  const shapesFiltered = shapes.filter((shape) => shape.id !== editingText?.id);

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
            {/* Render other players' shapes */}
            {others.map((shape) => (
              <ShapeComponent
                readOnly={true}
                key={shape.id}
                shape={shape}
                mode={mode}
                rDragging={{ current: null }}
                inputRef={{ current: null }}
                camera={camera}
                setHoveredCard={setHoveredCard}
                updateDraggingRef={() => { }}
                selected={selectedShapeIds.includes(shape.id)}
              />
            ))}

            {/* Render local shapes */}
            {shapesFiltered.map((shape) => (
              <ShapeComponent
                readOnly={false}
                key={shape.id}
                shape={shape}
                mode={mode}
                camera={camera}
                rDragging={rDragging}
                inputRef={inputRef}
                setHoveredCard={setHoveredCard}
                updateDraggingRef={updateDraggingRef}
                selected={selectedShapeIds.includes(shape.id)}
                color={shape.color}
              />
            ))}

            {/* Render shape in creation */}
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

            {/* Render editing text shape */}
            {editingText && (
              <EditingTextShape
                editingTextShape={editingTextShape}
                onTextBlur={onTextBlur}
                inputRef={inputRef}
                editingText={editingText}
                setEditingText={setEditingText}
                setShapes={setShapes}
              />
            )}

            {/* Render selection rectangle */}
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
          shapeType={shapeType}
          setShapeType={setShapeType}
          deck={deck}
          peerPresence={peerPresence}
          heartbeatStaleMs={HEARTBEAT_STALE_MS}
          peerNames={peerNames}
          rollCoin={rollCoin}
          rollD6={() => rollDie(6)}
          rollD20={() => rollDie(20)}
          pickStarter={pickStarter}
          untapAll={untapAll}
        />
      </div>

      <Hand cards={cards} setHoveredCard={setHoveredCard} />

      {/* Zoomed card preview */}
      {isCommandPressed && hoveredCard && (
        <div className="zoomed-card" style={{ pointerEvents: "none" }}>
          <img src={hoveredCard} alt={`Zoomed ${hoveredCard}`} />
        </div>
      )}

      {/* Help button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: "2px solid #666",
          background: showHelp ? "#444" : "#fff",
          color: showHelp ? "#fff" : "#666",
          fontSize: "18px",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
        title="Show controls (Press ?)"
      >
        ?
      </button>

      {/* Help panel */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            left: "20px",
            background: "rgba(0, 0, 0, 0.9)",
            color: "#fff",
            padding: "20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "monospace",
            zIndex: 1001,
            maxWidth: "350px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "16px" }}>
            Canvas Controls
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ margin: "8px 0 6px", fontSize: "14px", color: "#aaa" }}>
              Panning
            </h4>
            <div style={{ marginLeft: "8px", lineHeight: "1.6" }}>
              • Two-finger scroll (trackpad)<br />
              • Middle mouse button + drag<br />
              • Space + drag<br />
              • Alt + drag<br />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ margin: "8px 0 6px", fontSize: "14px", color: "#aaa" }}>
              Zooming
            </h4>
            <div style={{ marginLeft: "8px", lineHeight: "1.6" }}>
              • Pinch gesture (trackpad)<br />
              • Ctrl + scroll wheel<br />
              • + / - keys<br />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ margin: "8px 0 6px", fontSize: "14px", color: "#aaa" }}>
              Card Actions
            </h4>
            <div style={{ marginLeft: "8px", lineHeight: "1.6" }}>
              • Shift + drag from hand = play face-down<br />
              • Right-click card → Flip = toggle face-down<br />
              • Ctrl + hover card = preview<br />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ margin: "8px 0 6px", fontSize: "14px", color: "#aaa" }}>
              Other
            </h4>
            <div style={{ marginLeft: "8px", lineHeight: "1.6" }}>
              • Backspace = delete selected<br />
              • ? = toggle this help<br />
            </div>
          </div>

          <button
            onClick={() => setShowHelp(false)}
            style={{
              marginTop: "8px",
              padding: "6px 12px",
              background: "#444",
              color: "#fff",
              border: "1px solid #666",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Close
          </button>
        </div>
      )}

    </div>
  );
}

export default Canvas;
