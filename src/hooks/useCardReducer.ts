import { useReducer } from "react";
import { Card } from "../types/canvas";
import { generateId, shuffle } from "../utils/math";
import { Datum, mapDataToCard } from "./useCards";

export type CardState = {
  cards: Card[];
  deck: Card[];
  lastAction?: string;
  actionId?: number;
};

export type CardAction =
  | { type: "INITIALIZE_DECK"; payload: Card[] }
  | { type: "DRAW_CARD" }
  | { type: "MULLIGAN" }
  | { type: "SEND_TO_HAND"; payload: Card[] }
  | {
      type: "SEND_TO_DECK";
      payload: { cards: Card[]; position: "top" | "bottom" };
    }
  | { type: "PLAY_CARD"; payload: string[] }
  | { type: "ADD_TO_HAND"; payload: Datum }
  | { type: "SHUFFLE_DECK" }
  | { type: "SET_STATE"; payload: CardState };

export function cardReducer(state: CardState, action: CardAction): CardState {
  if (action.type !== "SET_STATE") {
    state.lastAction = action.type;
    state.actionId = (state.actionId ?? 0) + 1;
  }
  switch (action.type) {
    case "INITIALIZE_DECK":
      return { ...state, deck: action.payload, cards: [] };
    case "DRAW_CARD":
      if (state.deck.length === 0) return state;
      {
        const [drawnCard, ...remainingDeck] = state.deck;
        return {
          ...state,
          deck: remainingDeck,
          cards: [...state.cards, { ...drawnCard, id: generateId() }],
        };
      }
    case "MULLIGAN":
      return {
        ...state,
        deck: [...state.deck, ...state.cards],
        cards: [],
      };
    case "SEND_TO_HAND":
      return {
        ...state,
        cards: [...state.cards, ...action.payload],
      };
    case "SEND_TO_DECK":
      if (action.payload.position === "top") {
        return {
          ...state,
          deck: [...action.payload.cards, ...state.deck],
        };
      }
      return {
        ...state,
        deck: [...state.deck, ...action.payload.cards],
      };
    case "PLAY_CARD":
      return {
        ...state,
        cards: state.cards.filter((card) => !action.payload.includes(card.id)),
      };
    case "SHUFFLE_DECK":
      return {
        ...state,
        deck: shuffle(state.deck),
      };
    case "ADD_TO_HAND":
      return {
        ...state,
        cards: [...state.cards, mapDataToCard(action.payload)],
        deck: removeFirst(state.deck, mapDataToCard(action.payload)),
      };
    case "SET_STATE":
      return {
        cards: action.payload.cards.map((card) => ({ ...card })),
        deck: action.payload.deck.map((card) => ({ ...card })),
        lastAction: action.payload.lastAction,
        actionId: action.payload.actionId,
      };
    default:
      return state;
  }
}

export function useCardReducer(initialState: CardState) {
  return useReducer(cardReducer, initialState);
}

function removeFirst(deck: Card[], card: Card) {
  const idx = deck.findIndex((p) => p.src[0] === card.src[0]);
  return deck.filter((_, i) => i !== idx);
}
