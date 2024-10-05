import { Camera } from "../Canvas";
import vec from "./vec";

export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return {
    x: camera.x - dx / camera.z,
    y: camera.y - dy / camera.z,
    z: camera.z,
  };
}

export function getCameraZoom(zoom: number): number {
  return vec.clamp(zoom, 0.1, 10);
}

export function zoomCamera(
  camera: Camera,
  point: number[],
  dz: number
): Camera {
  const next = camera.z - (dz / 50) * camera.z;
  const p0 = screenToWorld(point, camera);
  camera.z = getCameraZoom(next);
  const p1 = screenToWorld(point, camera);
  const { x, y } = camera;
  const newPoint = vec.add([x, y], vec.sub(p1, p0));
  camera.x = newPoint[0];
  camera.y = newPoint[1];

  return { ...camera };
}
export function screenToWorld(point: number[], camera: Camera): number[] {
  return vec.sub(vec.div(point, camera.z), [camera.x, camera.y]);
}
