import { create } from "zustand";
import { Shape, Point } from "../Canvas";
import { generateId } from "../utils/math";
import vec from "../utils/vec";

interface ShapeStore {
  shapes: Shape[];
  selectedShapeIds: string[];
  shapeInCreation: { shape: Shape; origin: number[] } | null;
  editingText: { id: string; text: string } | null;
  selectionRect: { start: Point; end: Point } | null;
  setShapes: (shapes: Shape[] | ((shapes: Shape[]) => Shape[])) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  setShapeInCreation: (
    shapeInCreation: { shape: Shape; origin: number[] } | null
  ) => void;
  setEditingText: (editingText: { id: string; text: string } | null) => void;
  setSelectionRect: (
    selectionRect: { start: Point; end: Point } | null
  ) => void;
  createShape: (type: Shape["type"], point: number[]) => void;
  updateShapeInCreation: (point: number[]) => void;
  flipSelectedShapes: () => void;
  rotateSelectedShapes: (angle: number) => void;
}

export const useShapeStore = create<ShapeStore>((set) => ({
  shapes: [],
  selectedShapeIds: [],
  shapeInCreation: null,
  editingText: null,
  selectionRect: null,
  setShapes: (shapes) => {
    if (typeof shapes === "function") {
      set((state) => ({ shapes: shapes(state.shapes) }));
    } else {
      set({ shapes });
    }
  },
  addShape: (shape) => set((state) => ({ shapes: [...state.shapes, shape] })),
  updateShape: (id, updates) =>
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    })),
  deleteShape: (id) =>
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
    })),
  setSelectedShapeIds: (ids) => set({ selectedShapeIds: ids }),
  setShapeInCreation: (shapeInCreation) => set({ shapeInCreation }),
  setEditingText: (editingText) => set({ editingText }),
  setSelectionRect: (selectionRect) => set({ selectionRect }),
  createShape: (type, point) =>
    set(() => ({
      shapeInCreation: {
        shape: {
          id: generateId(),
          point,
          size: [0, 0],
          type,
        },
        origin: point,
      },
    })),
  updateShapeInCreation: (point) =>
    set((state) => {
      if (!state.shapeInCreation) return {};
      const delta = vec.sub(point, state.shapeInCreation.origin);
      return {
        shapeInCreation: {
          ...state.shapeInCreation,
          shape: {
            ...state.shapeInCreation.shape,
            size: delta,
          },
        },
      };
    }),
  flipSelectedShapes: () =>
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        state.selectedShapeIds.includes(shape.id)
          ? { ...shape, isFlipped: !shape.isFlipped }
          : shape
      ),
    })),
  rotateSelectedShapes: (angle) =>
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        state.selectedShapeIds.includes(shape.id)
          ? { ...shape, rotation: (shape.rotation || 0) + angle }
          : shape
      ),
    })),
}));
