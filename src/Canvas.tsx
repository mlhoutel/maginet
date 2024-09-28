import * as React from "react";
import { Shape as ShapeComponent } from "./Shape";
import "./Canvas.css";

interface Point {
  x: number;
  y: number;
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
  text?: string; // Add text property
  src?: string; // Add src property
  rotation?: number; // Add rotation property
}

type ShapeType = "rectangle" | "circle" | "arrow" | "text" | "image";

export const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]];

export function screenToCanvas(point: Point, camera: Camera): Point {
  return {
    x: point.x / camera.z - camera.x,
    y: point.y / camera.z - camera.y,
  };
}

function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return {
    x: camera.x - dx / camera.z,
    y: camera.y - dy / camera.z,
    z: camera.z,
  };
}

function zoomCamera(camera: Camera, point: Point, dz: number): Camera {
  const zoom = camera.z - dz * camera.z;

  const p1 = screenToCanvas(point, camera);
  const p2 = screenToCanvas(point, { ...camera, z: zoom });

  return {
    x: camera.x + (p2.x - p1.x),
    y: camera.y + (p2.y - p1.y),
    z: zoom,
  };
}

function zoomIn(camera: Camera): Camera {
  const i = Math.round(camera.z * 100) / 25;
  const nextZoom = (i + 1) * 0.25;
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return zoomCamera(camera, center, camera.z - nextZoom);
}

function zoomOut(camera: Camera): Camera {
  const i = Math.round(camera.z * 100) / 25;
  const nextZoom = (i - 1) * 0.25;
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return zoomCamera(camera, center, camera.z - nextZoom);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export type Mode = "select" | "create";

function rotateShape(shape: Shape, angle: number): Shape {
  console.log("rotateShape", shape);
  return {
    ...shape,
    rotation: (shape.rotation || 0) + angle,
  };
}

export default function Canvas() {
  const ref = React.useRef<SVGSVGElement>(null);
  const rDragging = React.useRef<{
    shape: Shape;
    origin: number[];
  } | null>(null);
  const [shapes, setShapes] = React.useState<Record<string, Shape>>({
    a: {
      id: "a",
      point: [200, 200],
      size: [100, 100],
      type: "arrow",
      rotation: 0,
    },
    b: {
      id: "b",
      point: [320, 200],
      size: [100, 100],
      type: "rectangle",
      rotation: 0,
    },
    c: {
      id: "c",
      point: [50, 70],
      size: [100, 100],
      type: "rectangle",
      rotation: 0,
    },
    d: {
      id: "d",
      point: [400, 100],
      size: [100, 100],
      type: "text",
      text: "Hello, world!",
      rotation: 0,
    },
    e: {
      id: "e",
      point: [400, 100],
      size: [100, 100],
      type: "image",
      src: "https://cards.scryfall.io/normal/front/f/a/fab2d8a9-ab4c-4225-a570-22636293c17d.jpg?1654566563",
      rotation: 0,
    },
  });
  const [shapeInCreation, setShapeInCreation] = React.useState<{
    shape: Shape;
    origin: number[];
  } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [mode, setMode] = React.useState<Mode>("select");
  const [shapeType, setShapeType] = React.useState<ShapeType>("rectangle");
  const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(
    null
  );

  const [editingText, setEditingText] = React.useState<{
    id: string;
    text: string;
  } | null>(null);

  const [selectionRect, setSelectionRect] = React.useState<{
    start: Point;
    end: Point;
  } | null>(null);

  function onPointerDownCanvas(e: React.PointerEvent<SVGElement>) {
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    if (mode === "create") {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (shapeType === "text") {
        const id = generateId();
        setShapes({
          ...shapes,
          [id]: {
            id,
            point,
            size: [0, 0], // Initial size, will be updated when text is entered
            type: "text",
            text: "",
          },
        });
        setEditingText({ id, text: "" });
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } else {
        setShapeInCreation({
          shape: {
            id: generateId(),
            point,
            size: [0, 0],
            type: shapeType,
          },
          origin: point,
        });
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

    if (mode === "create" && shapeInCreation) {
      const point = [x, y];
      const localShapeInCreation = {
        ...shapeInCreation,
        shape: { ...shapeInCreation.shape },
      };
      const delta = sub(point, shapeInCreation.origin);

      setShapeInCreation({
        ...localShapeInCreation,
        shape: {
          ...localShapeInCreation.shape,
          size: delta,
        },
      });
      return;
    } else if (mode === "select" && selectionRect) {
      setSelectionRect({
        ...selectionRect,
        end: { x, y },
      });
    }
  }

  const onPointerUpCanvas = (e: React.PointerEvent<SVGElement>) => {
    if (mode === "create" && shapeInCreation) {
      e.currentTarget.releasePointerCapture(e.pointerId);

      setShapes({
        ...shapes,
        [shapeInCreation.shape.id]: shapeInCreation.shape,
      });
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

      const selectedShapes = Object.values(shapes).filter((shape) => {
        const [shapeX, shapeY] = shape.point;
        const [shapeWidth, shapeHeight] = shape.size;
        return (
          shapeX >= rect.x &&
          shapeY >= rect.y &&
          shapeX + shapeWidth <= rect.x + rect.width &&
          shapeY + shapeHeight <= rect.y + rect.height
        );
      });

      console.log("selectedShapes", selectedShapes);

      if (selectedShapes.length > 0) {
        setSelectedShapeId(selectedShapes[0].id);
      }

      setSelectionRect(null);
    }
  };

  const [camera, setCamera] = React.useState({
    x: 0,
    y: 0,
    z: 1,
  });

  React.useEffect(() => {
    function handleWheel(event: WheelEvent) {
      event.preventDefault();

      const { clientX, clientY, deltaX, deltaY, ctrlKey } = event;

      if (ctrlKey) {
        setCamera((camera) =>
          zoomCamera(camera, { x: clientX, y: clientY }, deltaY / 100)
        );
      } else {
        setCamera((camera) => panCamera(camera, deltaX, deltaY));
      }
    }

    const elm = ref.current;
    if (!elm) return;

    elm.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      elm.removeEventListener("wheel", handleWheel);
    };
  }, [ref]);

  const transform = `scale(${camera.z}) translate(${camera.x}px, ${camera.y}px)`;

  function onTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (editingText) {
      const updatedText = e.target.value;
      setEditingText({ ...editingText, text: updatedText });
      setShapes({
        ...shapes,
        [editingText.id]: {
          ...shapes[editingText.id],
          text: updatedText,
          size: [updatedText.length * 10, 100], // Update size based on text length
        },
      });
    }
  }

  function onTextBlur() {
    setEditingText(null);
    setMode("select");
  }

  function onRotateLeft() {
    console.log("onRotateLeft", selectedShapeId);
    if (mode === "select" && selectedShapeId) {
      const shape = shapes[selectedShapeId];
      setShapes({
        ...shapes,
        [shape.id]: rotateShape(shape, -15),
      });
    }
  }

  function onRotateRight() {
    console.log("onRotateRight", selectedShapeId);
    if (mode === "select" && selectedShapeId) {
      const shape = shapes[selectedShapeId];
      setShapes({
        ...shapes,
        [shape.id]: rotateShape(shape, 15),
      });
    }
  }

  function onSizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newSize = parseInt(e.target.value, 10);
    if (selectedShapeId && !isNaN(newSize)) {
      const shape = shapes[selectedShapeId];
      const [x, y] = shape.point;
      const [width, height] = shape.size;
      const deltaX = (newSize - width) / 2;
      const deltaY = (newSize - height) / 2;

      setShapes({
        ...shapes,
        [shape.id]: {
          ...shape,
          point: [x - deltaX, y - deltaY], // Adjust the point to keep the anchor the same
          size: [newSize, newSize], // Assuming square shapes for simplicity
        },
      });
    }
  }

  return (
    <div>
      <svg
        ref={ref}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMoveCanvas}
        onPointerUp={onPointerUpCanvas}
      >
        <g style={{ transform }}>
          {Object.values(shapes).map((shape) => (
            <ShapeComponent
              key={shape.id}
              shape={shape}
              shapes={shapes}
              setShapes={setShapes}
              setEditingText={setEditingText}
              camera={camera}
              mode={mode}
              onSelectShapeId={setSelectedShapeId}
              rDragging={rDragging}
              selectedShapeId={selectedShapeId}
            />
          ))}
          {shapeInCreation && (
            <ShapeComponent
              setEditingText={setEditingText}
              key={shapeInCreation.shape.id}
              shape={shapeInCreation.shape}
              shapes={shapes}
              setShapes={setShapes}
              camera={camera}
              mode={mode}
              rDragging={rDragging}
              onSelectShapeId={setSelectedShapeId}
              selectedShapeId={selectedShapeId}
            />
          )}
          {editingText && (
            <foreignObject
              x={shapes[editingText.id].point[0]}
              y={shapes[editingText.id].point[1] - 16}
              width={200}
              height={32}
            >
              <input
                ref={inputRef}
                type="text"
                value={editingText.text}
                onChange={onTextChange}
                onBlur={onTextBlur}
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
        </g>
      </svg>
      <div>
        <SelectionPanel
          setCamera={setCamera}
          setMode={setMode}
          mode={mode}
          setShapeType={setShapeType}
          shapeType={shapeType}
          onRotateLeft={onRotateLeft}
          onRotateRight={onRotateRight}
          sizeInput={selectedShapeId ? shapes[selectedShapeId].size[1] : 0}
          onSizeChange={onSizeChange}
          key={selectedShapeId ?? "none"}
        />
      </div>
    </div>
  );
}

// allow user to select shapes (circle, rectangle, triangle, etc) or selection mode, zoom in/out
function SelectionPanel({
  setCamera,
  setMode,
  mode,
  shapeType,
  setShapeType,
  onRotateLeft,
  onRotateRight,
  sizeInput,
  onSizeChange,
}: {
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  mode: Mode;
  shapeType: ShapeType;
  setShapeType: React.Dispatch<React.SetStateAction<ShapeType>>;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  sizeInput: number | null;
  onSizeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="selection-panel">
      <select
        value={shapeType}
        onChange={(e) => setShapeType(e.target.value as ShapeType)}
      >
        <option value="rectangle">Rectangle</option>
        <option value="circle">Circle</option>
        <option value="arrow">Arrow</option>
        <option value="text">Text</option>
        <option value="image">Image</option>
      </select>
      <button
        disabled={mode === "create"}
        onClick={() => {
          setMode("create");
        }}
      >
        create
      </button>
      <button disabled={mode === "select"} onClick={() => setMode("select")}>
        select
      </button>
      <button onClick={() => setCamera(zoomIn)}>Zoom In</button>
      <button onClick={() => setCamera(zoomOut)}>Zoom Out</button>
      <button onClick={onRotateLeft}>Rotate Left</button>
      <button onClick={onRotateRight}>Rotate Right</button>
      <input
        type="range"
        min="10"
        max="500"
        value={sizeInput ?? 0}
        onChange={onSizeChange}
        placeholder="Size"
      />
    </div>
  );
}
