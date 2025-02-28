import { Shape } from "../types/canvas";

export function getEdgesOfRectange(rectangle: Shape) {
  // Top, Right, Bottom, Left
  const [x, y] = rectangle.point;
  const [width, height] = rectangle.size;
  const edges = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  return edges;
}

export function getHandlesOfArrow(arrow: Shape) {
  const [x, y] = arrow.point;
  const [width, height] = arrow.size;
  const handles = [
    [x, y],
    [x + width, y + height],
  ];
  return handles;
}
