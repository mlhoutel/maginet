import {
  Camera,
  Mode,
  Shape as ShapeType,
  add,
  screenToCanvas,
  sub,
} from "./Canvas";

export function Shape({
  shape,
  shapes,
  setShapes,
  camera,
  rDragging,
  mode,
  setEditingText,
  onSelectShapeId,
  selectedShapeId,
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
  onSelectShapeId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedShapeId: string | null;
}) {
  function onPointerMove(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    const dragging = rDragging.current;

    if (!dragging) return;
    console.log("dragging", dragging);

    const shape = shapes[dragging.shape.id];
    const { x, y } = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    const point = [x, y];
    const delta = sub(point, dragging.origin);

    setShapes({
      ...shapes,
      [shape.id]: {
        ...shape,
        point: add(dragging.shape.point, delta),
      },
    });
  }

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    rDragging.current = null;
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
  const textX = x + width / 2;
  const textY = y + height / 2;
  const textRotate = shape.rotation
    ? `rotate(${shape.rotation} ${textX} ${textY})`
    : "";

  const isSelected = shape.id === selectedShapeId;
  const selectedStyle = isSelected ? { stroke: "blue", strokeWidth: 2 } : {};

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
            onSelectShapeId(shape.id);
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
              onSelectShapeId(shape.id);
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
            onSelectShapeId(shape.id);
          }}
          onDoubleClick={() => {
            setEditingText({ id: shape.id, text: shape.text! });
          }}
          textAnchor="middle"
          dominantBaseline="middle"
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
            onSelectShapeId(shape.id);
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
            onSelectShapeId(shape.id);
          }}
          {...selectedStyle}
        />
      );
    default:
      throw new Error(`Unknown shape type: ${shape.type}`);
  }
}
