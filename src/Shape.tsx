import { useRef } from "react";
import { Camera, Mode, Shape as ShapeType } from "./Canvas";
import { screenToCanvas } from "./utils/vec";
import vec from "./utils/vec";
import { useShapeStore } from "./hooks/useShapeStore";
import { colors } from "./utils/colors";

const shouldSnapToGrid = (shape: ShapeType) => {
  return shape.type === "image";
};

const TextShape = ({
  shape,
  commonProps,
  transform,
  selected,
}: {
  shape: ShapeType;
  commonProps: React.SVGProps<SVGTextElement>;
  transform: string;
  selected: boolean;
}) => {
  const { point, text, color, fontSize } = shape;
  const [x, y] = point;
  return (
    <text
      {...commonProps}
      x={x}
      y={y}
      transform={transform}
      style={{
        ...commonProps.style,
        userSelect: "none",
        fontSize: fontSize || 16,
        fill: selected ? "#4a90e2" : color ?? "black",
      }}
    >
      {text}
    </text>
  );
};

const ImageShape = ({
  shape,
  commonProps,
  transform,
  readOnly,
}: {
  shape: ShapeType;
  commonProps: React.SVGProps<SVGGElement>;
  transform: string;
  readOnly: boolean;
}) => {
  const { point, size, src, srcIndex, isFlipped } = shape;
  const [x, y] = point;
  const [width, height] = size;
  return (
    <g {...commonProps}>
      <image
        href={isFlipped ? "https://i.imgur.com/LdOBU1I.jpeg" : src?.[srcIndex]}
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ opacity: readOnly ? 0.7 : 1 }}
        transform={transform}
      />
    </g>
  );
};

const RectangleShape = ({
  shape,
  commonProps,
}: {
  shape: ShapeType;
  commonProps: React.SVGProps<SVGRectElement>;
}) => {
  const { point, size } = shape;
  const [x, y] = point;
  const [width, height] = size;
  return <rect {...commonProps} x={x} y={y} width={width} height={height} />;
};

const PingShape = ({ shape }: { shape: ShapeType }) => {
  const { point } = shape;
  const [x, y] = point;
  return <circle cx={x} cy={y} r="20" fill="rgba(255, 0, 0, 0.5)" />;
};

const TokenShape = ({
  shape,
  commonProps,
}: {
  shape: ShapeType;
  commonProps: React.SVGProps<SVGGElement>;
}) => {
  const { point, size, color, text, fontSize } = shape;
  const [x, y] = point;
  const [width] = size;
  return (
    <g {...commonProps}>
      <circle cx={x} cy={y} r={width / 2} fill="#1F2421" />
      <circle cx={x} cy={y} r={(width / 2) * 0.8} fill={color ?? "black"} />
      {text && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: colors[color as keyof typeof colors] ?? "white",
            fontSize: `${fontSize}px`,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {text}
        </text>
      )}
    </g>
  );
};

export function Shape({
  shape,
  rDragging,
  mode,
  setHoveredCard,
  inputRef,
  updateDraggingRef,
  readOnly,
  selected,
  camera,
  gridSize,
  stackIndex = 0,
}: {
  shape: ShapeType;
  mode: Mode;
  rDragging: React.MutableRefObject<{
    shape: ShapeType;
    origin: number[];
  } | null>;
  camera: Camera;
  color?: string;
  setHoveredCard: React.Dispatch<React.SetStateAction<string | null>>;
  inputRef: React.RefObject<HTMLInputElement>;
  updateDraggingRef: (
    newRef: { shape: ShapeType; origin: number[] } | null
  ) => void;
  readOnly: boolean;
  selected: boolean;
  gridSize: number;
  stackIndex?: number;
}) {
  const draggingShapeRefs = useRef<Record<string, ShapeType>>({});
  const {
    setShapes,
    setSelectedShapeIds,
    selectedShapeIds,
    shapes,
    setEditingText,
  } = useShapeStore();

  const snapToGrid = (point: number[]) => {
    if (shouldSnapToGrid(shape)) {
      return point.map((coord) => Math.round(coord / gridSize) * gridSize);
    }
    return point;
  };

  const updateSelection = (shapeId: string) =>
    selectedShapeIds.includes(shapeId) ? selectedShapeIds : [shapeId];

  const initializeDragging = (
    e: React.PointerEvent<SVGElement>,
    point: number[]
  ) => {
    const id = e.currentTarget.id;
    updateDraggingRef({
      shape: shapes.find((s) => s.id === id)!,
      origin: point,
    });
  };

  const updateDraggingShapeRefs = (localSelectedShapeIds: string[]) => {
    draggingShapeRefs.current =
      localSelectedShapeIds.length === 1
        ? {}
        : Object.fromEntries(
            localSelectedShapeIds.map((id) => [
              id,
              shapes.find((s) => s.id === id)!,
            ])
          );
  };

  const onPointerDown = (e: React.PointerEvent<SVGElement>) => {
    if (mode !== "select" || readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();

    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = snapToGrid([x, y]);

    const localSelectedShapeIds = updateSelection(shape.id);
    initializeDragging(e, point);
    updateDraggingShapeRefs(localSelectedShapeIds);
    setSelectedShapeIds(localSelectedShapeIds);
  };

  const onPointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (mode !== "select" || readOnly || !rDragging.current) return;

    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = snapToGrid([x, y]);
    const delta = vec.sub(point, rDragging.current.origin);

    setShapes((prevShapes) =>
      prevShapes.map((s) =>
        s.id === rDragging.current?.shape.id
          ? { ...s, point: vec.add(rDragging.current.shape.point, delta) }
          : draggingShapeRefs.current[s.id]
          ? {
              ...s,
              point: vec.add(draggingShapeRefs.current[s.id].point, delta),
            }
          : s
      )
    );
  };

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    e.stopPropagation();
    updateDraggingRef(null);
    draggingShapeRefs.current = {};
  };

  const handleClick = (e: React.MouseEvent<SVGElement>) => {
    if (readOnly) return;
    e.stopPropagation();
    if (e.shiftKey) {
      setShapes((prevShapes) =>
        prevShapes.map((s) =>
          s.id === shape.id
            ? {
                ...s,
                rotation: s.rotation && s.rotation > 0 ? 0 : 90,
              }
            : s
        )
      );
    }
  };

  const commonProps = {
    id: shape.id,
    onPointerDown: readOnly ? undefined : onPointerDown,
    onPointerMove: readOnly ? undefined : onPointerMove,
    onPointerUp: readOnly ? undefined : onPointerUp,
    onClick: handleClick,
    style: {
      cursor: readOnly ? "default" : "move",
      filter: selected ? "url(#glow)" : "none",
    },
  };

  const renderShape = () => {
    const { point, size, rotation, type } = shape;
    const [x, y] = point;
    const [width, height] = size;
    const transform = `rotate(${rotation || 0} ${x + width / 2} ${
      y + height / 2
    }) translate(0, ${stackIndex * 10})`;

    switch (type) {
      case "text":
        return (
          <TextShape
            shape={shape}
            commonProps={{
              ...commonProps,
              onDoubleClick: (e) => {
                e.stopPropagation();
                if (readOnly) return;
                setEditingText({ id: shape.id, text: shape.text! });
                setTimeout(() => inputRef.current?.focus(), 0);
              },
            }}
            transform={transform}
            selected={selected}
          />
        );
      case "image":
        return (
          <ImageShape
            shape={shape}
            commonProps={{
              ...commonProps,
              onMouseEnter: () => {
                if (readOnly && shape.isFlipped) return;
                setHoveredCard(shape.src?.[shape.srcIndex] ?? null);
              },
              onMouseLeave: () => setHoveredCard(null),
            }}
            transform={transform}
            readOnly={readOnly}
          />
        );
      case "rectangle":
        return <RectangleShape shape={shape} commonProps={commonProps} />;
      case "ping":
        return <PingShape shape={shape} />;
      case "token":
        return (
          <TokenShape
            shape={shape}
            commonProps={{
              ...commonProps,
              onDoubleClick: (e) => {
                e.stopPropagation();
                if (readOnly) return;
                setEditingText({ id: shape.id, text: shape.text! });
                setTimeout(() => inputRef.current?.focus(), 0);
              },
            }}
          />
        );
      default:
        throw new Error(`Unknown shape type: ${type}`);
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
