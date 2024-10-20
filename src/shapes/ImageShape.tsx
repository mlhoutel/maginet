import React from "react";
import { Shape as ShapeType } from "../Canvas";

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

export default ImageShape;
