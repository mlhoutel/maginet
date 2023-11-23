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
}) {
  function onPointerMove(e: React.PointerEvent<SVGElement>) {
    if (mode !== "select") return;
    const dragging = rDragging.current;

    if (!dragging) return;

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

  if (shape.type === "rectangle") {
    if (width < 0) {
      x = x + width;
      width = -width;
    }
    if (height < 0) {
      y = y + height;
      height = -height;
    }
  }

  // take into account the angle of the arrow, its position, and size
  const lineAngle = Math.atan2(height, width);
  const arrowAngle = Math.PI / 8;
  const arrowLength = 20;
  const arrowHead = (
    <path
      key={shape.id + "-arrowhead"}
      id={shape.id + "-arrowhead"}
      d={`M ${x + width} ${y + height} L ${
        x + width - arrowLength * Math.cos(lineAngle + arrowAngle)
      } ${y + height - arrowLength * Math.sin(lineAngle + arrowAngle)} L ${
        x + width - arrowLength * Math.cos(lineAngle - arrowAngle)
      } ${y + height - arrowLength * Math.sin(lineAngle - arrowAngle)} Z`}
      stroke="black"
      strokeWidth="2"
      fill="black"
    />
  );

  const drawArrowHead =
    shape.type === "arrow" &&
    Math.abs(x) > arrowLength * 2 &&
    Math.abs(height) > arrowLength * 2;

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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      );
    case "arrow":
      return (
        <>
          <path
            key={shape.id}
            id={shape.id}
            d={`M ${x} ${y} L ${x + width} ${y + height}`}
            stroke="black"
            strokeWidth="2"
            fill="none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          {drawArrowHead && arrowHead}
        </>
      );
      throw new Error(`Unknown shape type: ${shape.type}`);
  }
}
