import React from "react";
import { Shape as ShapeType } from "../Canvas";

const PingShape = ({ shape }: { shape: ShapeType }) => {
  const { point } = shape;
  const [x, y] = point;
  return <circle cx={x} cy={y} r="20" fill="rgba(255, 0, 0, 0.5)" />;
};

export default PingShape;
