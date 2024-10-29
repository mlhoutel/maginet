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
  const [width, height] = size;

  return (
    <g {...commonProps}>
      <ellipse
        cx={x + width / 2}
        cy={y + height / 2}
        rx={width / 2}
        ry={height / 2}
        fill="#1F2421"
      />
      <ellipse
        cx={x + width / 2}
        cy={y + height / 2}
        rx={(width / 2) * 0.9}
        ry={(height / 2) * 0.9}
        fill={color ?? "black"}
      />
      {text && (
        <text
          x={x + width / 2}
          y={y + height / 2}
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
