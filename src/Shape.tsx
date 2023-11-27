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
  setSelectedShapeId,
}: {
  setSelectedShapeId: React.Dispatch<React.SetStateAction<string | null>>;
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

    const id = shape.id;
    setSelectedShapeId(id);

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

  // handle negative width and height for ellipses

  // take into account the angle of the arrow, its position, and size
  /*

  const lineAngle = Math.atan2(height, width);
  const arrowAngle = Math.PI / 8;
  const arrowLength = 20;
  const arrowHead = (
    <path
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      z={100}
      key={shape.id + "-arrowhead"}
      id={shape.id + "-arrowhead"}
      d={`M ${x + width} ${y + height} L ${
        x + width - arrowLength * Math.cos(lineAngle + arrowAngle)
      } ${y + height - arrowLength * Math.sin(lineAngle + arrowAngle)} L ${
        x + width - arrowLength * Math.cos(lineAngle - arrowAngle)
      } ${y + height - arrowLength * Math.sin(lineAngle - arrowAngle)} Z`}
      stroke="black"
      strokeWidth="5"
      fill="gray"
    />
  );

  const drawArrowHead =
    true &&
    shape.type === "arrow" &&
    Math.abs(x) > arrowLength * 2 &&
    Math.abs(height) > arrowLength * 2;
 */
  const shapeProps = {
    key: shape.id,
    id: shape.id,
    onClick: (e: React.MouseEvent<SVGElement, MouseEvent>) => {
      e.stopPropagation();
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };

  const rotate = shape.rotation
    ? `rotate(${shape.rotation} ${x + width / 2} ${y + height / 2})`
    : "";

  switch (shape.type) {
    case "circle":
      // x y is the top left corner of the bounding box
      // width height is the width and height of the bounding box
      return (
        <ellipse
          cx={x + width / 2}
          cy={y + height / 2}
          rx={width / 2}
          ry={height / 2}
          fill="rgba(0, 0, 0, 0.1)"
          transform={rotate}
          {...shapeProps}
        />
      );

    case "rectangle":
      return (
        <>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          transform={rotate}
          fill="rgba(0, 0, 0, 0.1)"
          {...shapeProps}
        />
        </>
      );
    case "arrow":
      return (
        <>
          <path
            d={`M ${x} ${y} L ${x + width} ${y + height}`}
            stroke="black"
            strokeWidth="5"
            fill="none"
            {...shapeProps}
          />
        </>
      );
      throw new Error(`Unknown shape type: ${shape.type}`);
  }
}
