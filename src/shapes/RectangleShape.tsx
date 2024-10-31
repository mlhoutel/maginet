import React from "react";
import { Shape as ShapeType } from "../Canvas";
import { DOMVector } from "../utils/vec";

const RectangleShape = ({
  shape,
  commonProps,
}: {
  shape: ShapeType;
  commonProps: React.SVGProps<SVGRectElement>;
}) => {
  const { point, size, text, fontSize, color } = shape;
  const vector = new DOMVector(point[0], point[1], size[0], size[1]);
  const coordinates = vector.toDOMRect();
  const { x, y, width, height } = coordinates;

  return (
    <>
      <rect
        {...commonProps}
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={color ?? "black"}
        fill="transparent"
      />
      {text && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${fontSize}px`,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {text}
        </text>
      )}
    </>
  );
};

export default RectangleShape;
