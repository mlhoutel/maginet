import { useRef } from "react";
import { Camera, Mode, Shape as ShapeType } from "./Canvas";
import { screenToCanvas } from "./utils/vec";
import vec from "./utils/vec";
import { useShapeStore } from "./hooks/useShapeStore";
import ShapeFactory from "./components/ShapeFactory";

const shouldSnapToGrid = (shape: ShapeType) => {
  return shape.type === "image";
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
      <ShapeFactory
        shape={shape}
        commonProps={commonProps}
        transform={`rotate(${shape.rotation || 0} ${
          shape.point[0] + shape.size[0] / 2
        } ${shape.point[1] + shape.size[1] / 2}) translate(0, ${
          stackIndex * 10
        })`}
        selected={selected}
        readOnly={readOnly}
        setEditingText={setEditingText}
        inputRef={inputRef}
        setHoveredCard={setHoveredCard}
      />
    </>
  );
}
