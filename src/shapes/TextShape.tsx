import React from "react";
import { Shape as ShapeType } from "../Canvas";

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

export default TextShape;
