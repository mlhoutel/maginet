import React from "react";
import { getTextWidth } from "./utils/canvas_utils";
import { Shape } from "./Canvas";

interface EditableTextProps {
  editingTextShape?: Shape;
  onTextBlur: () => void;
  editingText: { id: string; text: string };
  inputRef: React.RefObject<HTMLInputElement>;
  setEditingText: (value: { id: string; text: string }) => void;
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
}

export default function EditableText({
  editingTextShape,
  onTextBlur,
  inputRef,
  editingText,
  setEditingText,
  setShapes,
}: EditableTextProps) {
  const editingTextPointX = editingTextShape?.point[0] ?? 0;
  const editingTextPointY = editingTextShape?.point[1] ?? 0;
  let inputWidth = 0;
  const textWidth = getTextWidth(
    editingText.text,
    `normal ${editingTextShape?.fontSize ?? 16}px Arial`
  );
  inputWidth = Math.max(textWidth, 16);

  const inputHeight = editingTextShape?.fontSize ?? 16;
  function determineTextCoordinates() {
    if (
      editingTextShape?.type === "token" ||
      editingTextShape?.type === "rectangle"
    ) {
      const [width, height] = editingTextShape.size;
      const [x1, y1] = editingTextShape.point;
      let x = x1 + width / 2;
      let y = y1 + height / 2;
      y -= inputHeight / 2;
      x -= inputWidth / 2;
      return { x, y };
    }
    const x = editingTextPointX;
    const y = editingTextPointY - inputHeight;
    return { x, y };
  }
  const { x, y } = determineTextCoordinates();
  function onTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const updatedText = e.target.value;
    setEditingText({ ...editingText, text: updatedText });
    setShapes((prevShapes) =>
      prevShapes.map((shape) =>
        shape.id === editingText.id
          ? {
              ...shape,
              text: updatedText,
              size:
                shape.type === "text" ? [inputWidth, inputHeight] : shape.size,
            }
          : shape
      )
    );
  }
  return (
    <foreignObject x={x} y={y} height={"100%"} width={"100%"}>
      <input
        ref={inputRef}
        type="text"
        value={editingText.text ?? ""}
        onChange={onTextChange}
        onBlur={onTextBlur}
        style={{
          width: `${inputWidth}px`,
          height: `${inputHeight}px`,
          fontSize: `${editingTextShape?.fontSize ?? 16}px`,
          fontFamily: "Arial",
          display: "block",
          outline: "none",
          border: "none",
          textAlign: "left",
          padding: "0",
          margin: "0",
          backgroundColor: "rgba(0, 0, 0, 0)",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onTextBlur();
          }
        }}
      />
    </foreignObject>
  );
}
