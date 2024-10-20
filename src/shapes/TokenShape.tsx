import React from "react";
import { Shape as ShapeType } from "../Canvas";
import { colors } from "../utils/colors";

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

export default TokenShape;
