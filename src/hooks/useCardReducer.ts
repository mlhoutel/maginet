import { useReducer } from "react";
import { Card } from "../Canvas";
import { generateId, shuffle } from "../utils/math";

export type CardState = {
  cards: Card[];
  deck: Card[];
};

export type CardAction =
  | { type: "INITIALIZE_DECK"; payload: Card[] }
  | { type: "DRAW_CARD" }
  | { type: "MULLIGAN" }
  | { type: "SEND_TO_HAND"; payload: Card[] }
  | { type: "SEND_TO_DECK"; payload: Card[] }
  | { type: "REMOVE_FROM_HAND"; payload: string[] }
  | { type: "SHUFFLE_DECK" };

export function cardReducer(state: CardState, action: CardAction): CardState {
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
      return {
        ...state,
        deck: [...state.deck, ...action.payload],
      };
    case "REMOVE_FROM_HAND":
      return {
        ...state,
        cards: state.cards.filter((card) => !action.payload.includes(card.id)),
      };
    case "SHUFFLE_DECK":
      return {
        ...state,
        deck: shuffle(state.deck),
      };
    default:
      return state;
  }
}

export function useCardReducer(initialState: CardState) {
  return useReducer(cardReducer, initialState);
}
