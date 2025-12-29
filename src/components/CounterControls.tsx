import { useState } from "react";
import { Counter } from "../types/canvas";
import "./CounterControls.css";

interface CounterControlsProps {
  currentCounters: Counter[];
  onUpdateCounters: (counters: Counter[]) => void;
  onClose: () => void;
}

const COMMON_LABELS = ["P/T", "loyalty", "charge"];
const DEFAULT_COLORS: Record<string, string> = {
  "P/T": "#2196F3",
  "loyalty": "#9C27B0",
  "charge": "#FF9800",
};

const CounterControls = ({ currentCounters, onUpdateCounters, onClose }: CounterControlsProps) => {
  const [newLabel, setNewLabel] = useState("P/T");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS["P/T"]);

  const isPTCounter = (counter: Counter) => counter.label === "P/T";

  const updateCounter = (index: number, updates: Partial<Counter>) => {
    const updated = [...currentCounters];
    updated[index] = { ...updated[index], ...updates };
    onUpdateCounters(updated);
  };

  const deleteCounter = (index: number) => {
    const updated = [...currentCounters];
    updated.splice(index, 1);
    onUpdateCounters(updated);
  };

  const addNewCounter = () => {
    const existing = currentCounters.findIndex(c => c.label === newLabel);
    if (existing >= 0) {
      // Update existing counter
      if (newLabel === "P/T") {
        updateCounter(existing, {
          power: (currentCounters[existing].power || 0) + 1,
          toughness: (currentCounters[existing].toughness || 0) + 1,
        });
      } else {
        updateCounter(existing, {
          value: (currentCounters[existing].value || 0) + 1,
        });
      }
    } else {
      // Add new counter
      const newCounter: Counter = {
        label: newLabel,
        color: newColor,
      };
      if (newLabel === "P/T") {
        newCounter.power = 1;
        newCounter.toughness = 1;
      } else {
        newCounter.value = 1;
      }
      onUpdateCounters([...currentCounters, newCounter]);
    }
  };

  return (
    <div className="counter-controls-panel">
      <div className="counter-controls-header">
        <h4>Manage Counters</h4>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      {/* Existing counters */}
      {currentCounters.length > 0 && (
        <div className="existing-counters">
          {currentCounters.map((counter, index) => (
            <div key={index} className="counter-row">
              <div
                className="counter-color-indicator"
                style={{ backgroundColor: counter.color || "#666" }}
              />
              <span className="counter-label">{counter.label}</span>

              {isPTCounter(counter) ? (
                // P/T counter with separate power/toughness controls
                <div className="pt-controls">
                  <div className="pt-group">
                    <button
                      className="counter-btn minus"
                      onClick={() => updateCounter(index, { power: (counter.power || 0) - 1 })}
                    >
                      −
                    </button>
                    <span className="counter-value">{counter.power || 0}</span>
                    <button
                      className="counter-btn plus"
                      onClick={() => updateCounter(index, { power: (counter.power || 0) + 1 })}
                    >
                      +
                    </button>
                  </div>
                  <span className="pt-separator">/</span>
                  <div className="pt-group">
                    <button
                      className="counter-btn minus"
                      onClick={() => updateCounter(index, { toughness: (counter.toughness || 0) - 1 })}
                    >
                      −
                    </button>
                    <span className="counter-value">{counter.toughness || 0}</span>
                    <button
                      className="counter-btn plus"
                      onClick={() => updateCounter(index, { toughness: (counter.toughness || 0) + 1 })}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                // Single-value counter
                <div className="counter-controls">
                  <button
                    className="counter-btn minus"
                    onClick={() => updateCounter(index, { value: (counter.value || 0) - 1 })}
                  >
                    −
                  </button>
                  <span className="counter-value">{counter.value || 0}</span>
                  <button
                    className="counter-btn plus"
                    onClick={() => updateCounter(index, { value: (counter.value || 0) + 1 })}
                  >
                    +
                  </button>
                </div>
              )}

              <button
                className="delete-btn"
                onClick={() => deleteCounter(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new counter */}
      <div className="new-counter-section">
        <h5>Add Counter</h5>
        <div className="new-counter-form">
          <select
            className="label-select"
            value={newLabel}
            onChange={(e) => {
              setNewLabel(e.target.value);
              if (DEFAULT_COLORS[e.target.value]) {
                setNewColor(DEFAULT_COLORS[e.target.value]);
              }
            }}
          >
            {COMMON_LABELS.map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="color-picker"
            title="Counter color"
          />
          <button
            className="add-btn"
            onClick={addNewCounter}
          >
            Add
          </button>
        </div>
        <input
          type="text"
          className="custom-label-input"
          placeholder="Or type custom label..."
          value={COMMON_LABELS.includes(newLabel) ? "" : newLabel}
          onChange={(e) => setNewLabel(e.target.value || "P/T")}
        />
      </div>
    </div>
  );
};

export default CounterControls;
