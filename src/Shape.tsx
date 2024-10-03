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
  setHoveredCard,
  inputRef,
  updateDraggingRef,
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
}) {
  // capture the shapes at the start of the drag to move them as a group
  const draggingShapeRefs = useRef<Record<string, ShapeType>>({});

  function onPointerMove(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    const dragging = rDragging.current;

    if (!dragging) return;

    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    const delta = sub(point, dragging.origin);

    setShapes((prevShapes) => {
      const newShapes = prevShapes.map((shape) => {
        if (shape.id === dragging.shape.id) {
          return {
            ...shape,
            point: add(dragging.shape.point, delta),
          };
        }
        return shape;
      });
      // put the dragged shape to the end of the array
      const draggedShape = newShapes.find(
        (shape) => shape.id === dragging.shape.id
      )!;
      return [
        ...newShapes.filter((shape) => shape.id !== draggedShape.id),
        draggedShape,
      ];
    });
  }

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    updateDraggingRef(null);
    draggingShapeRefs.current = {};
  };

  function onPointerDown(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const id = e.currentTarget.id;

    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];

    updateDraggingRef({
      shape: shapes.find((shape) => shape.id === id)!,
      origin: point,
    });

    selectedShapeIds.forEach((id) => {
      draggingShapeRefs.current[id] = shapes.find((shape) => shape.id === id)!;
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
          style={{ userSelect: "none" }}
          onDoubleClick={() => {
            setEditingText({ id: shape.id, text: shape.text! });
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }}
          {...selectedStyle}
        >
          {shape.text}
        </text>
      );
    case "image":
      return (
        <g
          id={shape.id}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onContextMenu={() => {
            onSelectShapeId([shape.id]);
            draggingShapeRefs.current = {};
          }}
          onClick={() => {
            onSelectShapeId([shape.id]);
            draggingShapeRefs.current = {};
          }}
          key={shape.id}
          onMouseEnter={() =>
            shape.type === "image" && setHoveredCard(shape.src!)
          }
          onMouseLeave={() => shape.type === "image" && setHoveredCard(null)}
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
        </g>
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
