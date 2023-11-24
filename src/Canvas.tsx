import * as React from "react";
import { Shape as ShapeComponent } from "./Shape";

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
}

type ShapeType = "rectangle" | "circle" | "arrow";

export const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]];

export function screenToCanvas(point: Point, camera: Camera): Point {
  return {
    x: point.x / camera.z - camera.x,
    y: point.y / camera.z - camera.y,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function canvasToScreen(point: Point, camera: Camera): Point {
  return {
    x: (point.x - camera.x) * camera.z,
    y: (point.y - camera.y) * camera.z,
  };
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

function getViewport(camera: Camera, box: Box): Box {
  const topLeft = screenToCanvas({ x: box.minX, y: box.minY }, camera);
  const bottomRight = screenToCanvas({ x: box.maxX, y: box.maxY }, camera);

  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
    height: bottomRight.x - topLeft.x,
    width: bottomRight.y - topLeft.y,
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
      point: [50, 70],
      size: [100, 100],
      type: "circle",
    },
  });
  const [shapeInCreation, setShapeInCreation] = React.useState<{
    shape: Shape;
    origin: number[];
  } | null>(null);

  const [mode, setMode] = React.useState<Mode>("select");
  const [shapeType, setShapeType] = React.useState<ShapeType>("rectangle");
  const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(
    null
  );

  const selectedShape = selectedShapeId ? shapes[selectedShapeId] : null;

  function onPointerDownCanvas(e: React.PointerEvent<SVGElement>) {
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    if (mode === "create") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setShapeInCreation({
        shape: {
          id: generateId(),
          point,
          size: [0, 0],
          type: shapeType,
        },
        origin: point,
      });
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

  const viewport = getViewport(camera, {
    minX: 0,
    minY: 0,
    maxX: window.innerWidth,
    maxY: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  return (
    <div>
      <svg
        ref={ref}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMoveCanvas}
        onPointerUp={onPointerUpCanvas}
        onClick={() => {
          setSelectedShapeId(null);
        }}
      >
        <g style={{ transform }}>
          {Object.values(shapes).map((shape) => (
            <ShapeComponent
              key={shape.id}
              shape={shape}
              shapes={shapes}
              setShapes={setShapes}
              camera={camera}
              mode={mode}
              rDragging={rDragging}
              setSelectedShapeId={setSelectedShapeId}
            />
          ))}
          {shapeInCreation && (
            <ShapeComponent
              key={shapeInCreation.shape.id}
              shape={shapeInCreation.shape}
              shapes={shapes}
              setShapes={setShapes}
              camera={camera}
              mode={mode}
              rDragging={rDragging}
              setSelectedShapeId={setSelectedShapeId}
            />
          )}
          <Handles
            shapes={shapes}
            selectedShape={selectedShape}
            setShapes={setShapes}
            camera={camera}
          />
        </g>
      </svg>
      <div>
        <SelectionPanel
          setCamera={setCamera}
          setMode={setMode}
          mode={mode}
          setShapeType={setShapeType}
        />

        <div>{Math.floor(camera.z * 100)}%</div>
        <div>x: {Math.floor(viewport.minX)}</div>
        <div>y: {Math.floor(viewport.minY)}</div>
        <div>width: {Math.floor(viewport.width)}</div>
        <div>height: {Math.floor(viewport.height)}</div>
      </div>
      {JSON.stringify(shapeInCreation)}
      {JSON.stringify(selectedShapeId)}
      {JSON.stringify(mode)}
    </div>
  );
}

// allow user to select shapes (circle, rectangle, triangle, etc) or selection mode, zoom in/out
function SelectionPanel({
  setCamera,
  setMode,
  mode,
  setShapeType,
}: {
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  mode: Mode;
  setShapeType: React.Dispatch<React.SetStateAction<ShapeType>>;
}) {
  return (
    <div className="selection-panel">
      <button onClick={() => setShapeType("rectangle")}>Rectangle</button>
      <button onClick={() => setShapeType("arrow")}>Arrow</button>
      <button onClick={() => setShapeType("circle")}>Circle</button>
      <button
        onClick={() => {
          setMode((prev) => (prev === "create" ? "select" : "create"));
        }}
      >
        {mode === "create" ? "select" : "create"}
      </button>
      <button onClick={() => setCamera(zoomIn)}>Zoom In</button>
      <button onClick={() => setCamera(zoomOut)}>Zoom Out</button>
    </div>
  );
}

function Handles({
  selectedShape,
  setShapes,
  camera,
  shapes,
}: {
  selectedShape: Shape | null;
  setShapes: React.Dispatch<React.SetStateAction<Record<string, Shape>>>;
  camera: Camera;
  shapes: Record<string, Shape>;
}) {
  const rDragging = React.useRef<{
    shape: Shape;
    origin: number[];
  } | null>(null);

  if (selectedShape === null) return null;

  const [x, y] = selectedShape.point;
  const width = selectedShape.size[0];
  const height = selectedShape.size[1];
  // user can resize the shape by dragging the handles

  function onPointerDown(e: React.PointerEvent<SVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);

    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];

    rDragging.current = {
      shape: { ...selectedShape! },
      origin: point,
    };
  }

  function onPointerMove(e: React.PointerEvent<SVGElement>) {
    const dragging = rDragging.current;

    if (!dragging) return;

    const shape = shapes[dragging.shape.id];
    const handleId = e.currentTarget.id;
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    const delta = sub(point, dragging.origin);
    // resize based on handleId

    switch (handleId) {
      case "handleAtTopLeft": {
        setShapes({
          ...shapes,
          [shape.id]: {
            ...shape,
            point: add(dragging.shape.point, delta),
            size: add(dragging.shape.size, [-delta[0], -delta[1]]),
          },
        });
        break;
      }
      case "handleAtTopRight": {
        setShapes({
          ...shapes,
          [shape.id]: {
            ...shape,
            point: add(dragging.shape.point, [0, delta[1]]),
            size: add(dragging.shape.size, [delta[0], -delta[1]]),
          },
        });
        break;
      }
      case "handleAtBottomLeft": {
        setShapes({
          ...shapes,
          [shape.id]: {
            ...shape,
            point: add(dragging.shape.point, [delta[0], 0]),
            size: add(dragging.shape.size, [-delta[0], delta[1]]),
          },
        });
        break;
      }
      case "handleAtBottomRight": {
        setShapes({
          ...shapes,
          [shape.id]: {
            ...shape,
            size: add(dragging.shape.size, delta),
          },
        });
        break;
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    rDragging.current = null;
  };

  const handleProps = { onPointerDown, onPointerMove, onPointerUp };

  switch (selectedShape.type) {
    case "rectangle":
      return (
        <>
          <Handle
            id="handleAtTopLeft"
            additionalClasses="handleAtTopLeft"
            {...handleProps}
            x={x - 5}
            y={y - 5}
          />
          <Handle
            id="handleAtTopRight"
            additionalClasses="handleAtTopRight"
            {...handleProps}
            x={x + width - 5}
            y={y - 5}
          />
          <Handle
            id="handleAtBottomLeft"
            additionalClasses="handleAtBottomLeft"
            {...handleProps}
            x={x - 5}
            y={y + height - 5}
          />
          <Handle
            id="handleAtBottomRight"
            additionalClasses="handleAtBottomRight"
            {...handleProps}
            x={x + width - 5}
            y={y + height - 5}
          />
        </>
      );
    case "arrow":
      return (
        <>
          <Handle
            additionalClasses="handleArrow"
            id="handleAtTopLeft"
            {...handleProps}
            x={x - 5}
            y={y - 5}
          />
          <Handle
            id="handleAtBottomRight"
            additionalClasses="handleArrow"
            {...handleProps}
            x={x + width - 5}
            y={y + height - 5}
          />
        </>
      );
    case "circle":
      return (
        <>
          <Handle
            id="handleAtTopLeft"
            additionalClasses="handleAtTopLeft"
            {...handleProps}
            x={x - 5}
            y={y - 5}
          />
          <Handle
            id="handleAtTopRight"
            additionalClasses="handleAtTopRight"
            {...handleProps}
            x={x + width - 5}
            y={y - 5}
          />
          <Handle
            id="handleAtBottomLeft"
            additionalClasses="handleAtBottomLeft"
            {...handleProps}
            x={x - 5}
            y={y + height - 5}
          />
          <Handle
            id="handleAtBottomRight"
            additionalClasses="handleAtBottomRight"
            {...handleProps}
            x={x + width - 5}
            y={y + height - 5}
          />
        </>
      );
  }

  return null;
}

function Handle({
  id,
  x,
  y,
  additionalClasses,
  ...props
}: {
  id: string;
  x: number;
  y: number;
  additionalClasses?: string;
}) {
  return (
    <rect
      id={id}
      className={`handle ${additionalClasses || ""}`}
      fill="#fff"
      stroke="#000"
      {...props}
      onClick={(e) => {
        e.stopPropagation();
      }}
      x={x}
      y={y}
      width={10}
      height={10}
    />
  );
}
