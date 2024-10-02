import { useRef } from "react";
import { Camera, Mode, Shape as ShapeType } from "./Canvas";
import { add, screenToCanvas, sub } from "./utils/vec";

export function Shape({
  shape,
  shapes,
  setShapes,
  camera,
  rDragging,
  mode,
  setEditingText,
  onSelectShapeId,
  selectedShapeIds,
}: {
  shape: ShapeType;
  shapes: Record<string, ShapeType>;
  setShapes: React.Dispatch<React.SetStateAction<Record<string, ShapeType>>>;
  camera: Camera;
  mode: Mode;
  rDragging: React.MutableRefObject<{
    shape: ShapeType;
    origin: number[];
  } | null>;
  setEditingText: React.Dispatch<
    React.SetStateAction<{
      id: string;
      text: string;
    } | null>
  >;
  onSelectShapeId: React.Dispatch<React.SetStateAction<string[]>>;
  selectedShapeIds: string[];
}) {
  // capture the shapes at the start of the drag to move them as a group
  const draggingShapeRefs = useRef<Record<string, ShapeType>>({});

  function onPointerMove(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    const dragging = rDragging.current;

    if (!dragging) return;

    const shape = shapes[dragging.shape.id];
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    const delta = sub(point, dragging.origin);

    setShapes((prevShapes) => ({
      ...prevShapes,
      [shape.id]: {
        ...shape,
        point: add(dragging.shape.point, delta),
      },
    }));
    setShapes((prevShapes) => {
      const newShapes = { ...prevShapes };
      for (const id in draggingShapeRefs.current) {
        newShapes[id] = {
          ...newShapes[id],
          point: add(draggingShapeRefs.current[id].point, delta),
        };
      }
      return newShapes;
    });
  }

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    rDragging.current = null;
    draggingShapeRefs.current = {};
  };

  function onPointerDown(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const id = e.currentTarget.id;

    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];

    rDragging.current = {
      shape: { ...shapes[id] },
      origin: point,
    };

    selectedShapeIds.forEach((id) => {
      draggingShapeRefs.current[id] = shapes[id];
    });
  }

  let [x, y] = shape.point;
  let width = shape.size[0];
  let height = shape.size[1];

  if (shape.type === "rectangle" || shape.type === "circle") {
    if (width < 0) {
      x = x + width;
      width = -width;
    }
    if (height < 0) {
      y = y + height;
      height = -height;
    }
  }
  const rotate = shape.rotation
    ? `rotate(${shape.rotation} ${x + width / 2} ${y + height / 2})`
    : "";

  const isSelected = selectedShapeIds.includes(shape.id);
  const selectedStyle = isSelected ? { stroke: "blue", strokeWidth: 2 } : {};
  const textX = shape.point[0];
  const textY = shape.point[1];
  const textWidth = shape.size[0];
  const textHeight = shape.size[1];
  const textRotate = shape.rotation
    ? `rotate(${shape.rotation} ${textX + textWidth / 2} ${
        textY + textHeight / 2
      })`
    : "";

  switch (shape.type) {
    case "rectangle":
      // opacity background
      return (
        <rect
          key={shape.id}
          id={shape.id}
          x={x}
          y={y}
          width={width}
          height={height}
          fill="rgba(0, 0, 0, 0.1)"
          transform={rotate}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => {
            onSelectShapeId([shape.id]);
            draggingShapeRefs.current = {};
          }}
          {...selectedStyle}
        />
      );
    case "arrow":
      return (
        <>
          <path
            key={shape.id}
            id={shape.id}
            d={`M ${x} ${y} L ${x + width} ${y + height}`}
            transform={rotate}
            stroke="black"
            strokeWidth="2"
            fill="none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={() => {
              onSelectShapeId([shape.id]);
              draggingShapeRefs.current = {};
            }}
            {...selectedStyle}
          />
        </>
      );
    case "text":
      return (
        <text
          key={shape.id}
          id={shape.id}
          x={textX}
          y={textY}
          onPointerDown={onPointerDown}
          transform={textRotate}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => {
            onSelectShapeId([shape.id]);
            draggingShapeRefs.current = {};
          }}
          onDoubleClick={() => {
            setEditingText({ id: shape.id, text: shape.text! });
          }}
          {...selectedStyle}
        >
          {shape.text}
        </text>
      );
    case "image":
      return (
        <image
          key={shape.id}
          id={shape.id}
          x={x}
          y={y}
          width={width}
          height={height}
          href={shape.src}
          transform={rotate}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => {
            onSelectShapeId([shape.id]);
            draggingShapeRefs.current = {};
          }}
          {...selectedStyle}
        />
      );
    case "circle":
      return (
        <ellipse
          key={shape.id}
          id={shape.id}
          cx={x + width / 2}
          cy={y + height / 2}
          rx={width / 2}
          ry={height / 2}
          fill="rgba(0, 0, 0, 0.1)"
          transform={rotate}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => {
            onSelectShapeId([shape.id]);
            draggingShapeRefs.current = {};
          }}
          {...selectedStyle}
        />
      );
    default:
      throw new Error(`Unknown shape type: ${shape.type}`);
  }
}
