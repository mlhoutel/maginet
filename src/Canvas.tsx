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
}

type ShapeType = "rectangle" | "circle" | "arrow" | "text";

export const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]];

export function screenToCanvas(point: Point, camera: Camera): Point {
  return {
    x: point.x / camera.z - camera.x,
    y: point.y / camera.z - camera.y,
  };
}

// Remove the unused canvasToScreen function
// function canvasToScreen(point: Point, camera: Camera): Point {
//   return {
//     x: (point.x - camera.x) * camera.z,
//     y: (point.y - camera.y) * camera.z,
//   };
// }

// interface Box {
//   minX: number;
//   minY: number;
//   maxX: number;
//   maxY: number;
//   width: number;
//   height: number;
// }

// function getViewport(camera: Camera, box: Box): Box {
//   const topLeft = screenToCanvas({ x: box.minX, y: box.minY }, camera);
//   const bottomRight = screenToCanvas({ x: box.maxX, y: box.maxY }, camera);

//   return {
//     minX: topLeft.x,
//     minY: topLeft.y,
//     maxX: bottomRight.x,
//     maxY: bottomRight.y,
//     height: bottomRight.x - topLeft.x,
//     width: bottomRight.y - topLeft.y,
//   };
// }

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
    },
    b: {
      id: "b",
      point: [320, 200],
      size: [100, 100],
      type: "rectangle",
    },
    c: {
      id: "c",
      point: [50, 70],
      size: [100, 100],
      type: "rectangle",
    },
    d: {
      id: "d",
      point: [400, 100],
      size: [100, 100],
      type: "text",
      text: "Hello, world!",
    },
  });
  const [shapeInCreation, setShapeInCreation] = React.useState<{
    shape: Shape;
    origin: number[];
  } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [mode, setMode] = React.useState<Mode>("select");
  const [shapeType, setShapeType] = React.useState<ShapeType>("rectangle");

  const [editingText, setEditingText] = React.useState<{
    id: string;
    text: string;
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
    }
  }

  function onPointerMoveCanvas(e: React.PointerEvent<SVGElement>) {
    if (mode === "create" && shapeInCreation) {
      const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
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

  // const viewport = getViewport(camera, {
  //   minX: 0,
  //   minY: 0,
  //   maxX: window.innerWidth,
  //   maxY: window.innerHeight,
  //   width: window.innerWidth,
  //   height: window.innerHeight,
  // });

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
              rDragging={rDragging}
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
        </g>
      </svg>
      <div>
        <SelectionPanel
          setCamera={setCamera}
          setMode={setMode}
          mode={mode}
          setShapeType={setShapeType}
          shapeType={shapeType}
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
}: {
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  mode: Mode;
  shapeType: ShapeType;
  setShapeType: React.Dispatch<React.SetStateAction<ShapeType>>;
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
    </div>
  );
}
