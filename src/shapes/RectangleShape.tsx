import React from "react";
import { Shape as ShapeType } from "../Canvas";

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

export default RectangleShape;
