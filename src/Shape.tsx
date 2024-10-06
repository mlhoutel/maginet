import { useRef } from "react";
import { Camera, Mode, Shape as ShapeType } from "./Canvas";
import { screenToCanvas } from "./utils/vec";
import vec from "./utils/vec";

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
  setHoveredCard,
  inputRef,
  updateDraggingRef,
  readOnly,
  selected,
}: {
  shape: ShapeType;
  shapes: ShapeType[];
  setShapes: React.Dispatch<React.SetStateAction<ShapeType[]>>;
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
  setHoveredCard: React.Dispatch<React.SetStateAction<string | null>>;
  inputRef: React.RefObject<HTMLInputElement>;
  updateDraggingRef: (
    newRef: { shape: ShapeType; origin: number[] } | null
  ) => void;
  readOnly: boolean;
  selected: boolean;
}) {
  const draggingShapeRefs = useRef<Record<string, ShapeType>>({});

  function onPointerMove(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    const dragging = rDragging.current;
    if (!dragging) return;

    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    const delta = vec.sub(point, dragging.origin);

    setShapes((prevShapes) =>
      prevShapes.map((s) =>
        s.id === dragging.shape.id
          ? { ...s, point: vec.add(dragging.shape.point, delta) }
          : draggingShapeRefs.current[s.id]
          ? {
              ...s,
              point: vec.add(draggingShapeRefs.current[s.id].point, delta),
            }
          : s
      )
    );
  }

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    e.stopPropagation();
    updateDraggingRef(null);
    draggingShapeRefs.current = {};
  };

  function onPointerDown(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    const id = e.currentTarget.id;
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];

    updateDraggingRef({
      shape: shapes.find((s) => s.id === id)!,
      origin: point,
    });

    selectedShapeIds.forEach((id) => {
      draggingShapeRefs.current[id] = shapes.find((s) => s.id === id)!;
    });
  }

  const commonProps = {
    id: shape.id,
    onPointerDown: readOnly ? undefined : onPointerDown,
    onPointerMove: readOnly ? undefined : onPointerMove,
    onPointerUp: readOnly ? undefined : onPointerUp,
    onClick: (e: React.MouseEvent<SVGElement>) => {
      if (readOnly) return;
      e.stopPropagation();
      onSelectShapeId([shape.id]);
      draggingShapeRefs.current = {};
    },
    style: {
      cursor: readOnly ? "default" : "move",
      filter: selected ? "url(#glow)" : "none",
      opacity: readOnly ? 0.7 : 1,
    },
  };

  const renderShape = () => {
    switch (shape.type) {
      case "text":
        return (
          <text
            {...commonProps}
            x={shape.point[0]}
            y={shape.point[1]}
            transform={`rotate(${shape.rotation || 0} ${
              shape.point[0] + shape.size[0] / 2
            } ${shape.point[1] + shape.size[1] / 2})`}
            style={{
              ...commonProps.style,
              userSelect: "none",
              fontSize: shape.fontSize || 16,
              fill: selected ? "#4a90e2" : "#000",
            }}
            onDoubleClick={() => {
              if (readOnly) return;
              setEditingText({ id: shape.id, text: shape.text! });
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            {shape.text}
          </text>
        );
      case "image":
        return (
          <g
            {...commonProps}
            onMouseEnter={() => setHoveredCard(shape.src!)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <image
              href={
                shape.isFlipped ? "https://i.imgur.com/LdOBU1I.jpeg" : shape.src
              }
              x={shape.point[0]}
              y={shape.point[1]}
              width={shape.size[0]}
              height={shape.size[1]}
              transform={`rotate(${shape.rotation || 0}, ${
                shape.point[0] + shape.size[0] / 2
              }, ${shape.point[1] + shape.size[1] / 2})`}
            />
            {selected && (
              <rect
                x={shape.point[0]}
                y={shape.point[1]}
                width={shape.size[0]}
                height={shape.size[1]}
                fill="none"
                stroke="#4a90e2"
                strokeWidth="2"
                strokeDasharray="5,5"
                pointerEvents="none"
              />
            )}
          </g>
        );
      case "rectangle":
        return (
          <rect
            {...commonProps}
            x={shape.point[0]}
            y={shape.point[1]}
            width={shape.size[0]}
            height={shape.size[1]}
          />
        );
      case "ping":
        return (
          <circle
            cx={shape.point[0]}
            cy={shape.point[1]}
            r="20"
            fill="rgba(255, 0, 0, 0.5)"
          />
        );
      default:
        throw new Error(`Unknown shape type: ${shape.type}`);
    }
  };

  return (
    <>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {renderShape()}
    </>
  );
}
