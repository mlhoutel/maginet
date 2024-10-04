/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import Peer, { DataConnection } from "peerjs";
interface Message {
  type: string;
  payload: any;
}

type MessageCallback = (message: Message) => void;
interface PeerState {
  peer: Peer | null;
  connection: DataConnection | null;
  error: Error | null;
  initPeer: (id?: string) => void;
  connectToPeer: (peerId: string) => void;
  sendMessage: (message: Message) => void;
  disconnect: () => void;
  onMessage: (type: string, callback: MessageCallback) => () => void;
  messageCallbacks: { [key: string]: MessageCallback[] };
}
export const usePeerStore = create<PeerState>((set, get) => ({
  peer: null,
  connection: null,
  error: null,
  messageCallbacks: {},

  initPeer: () => {
    try {
      const peer = new Peer();
      peer.on("open", () => set({ peer }));
      peer.on("connection", (conn) => {
        conn.on("data", (data: unknown) => {
          // assert data is a Message
          const message = data as Message;
          const { messageCallbacks } = get();
          const callbacks = messageCallbacks[message.type] || [];
          callbacks.forEach((callback) => callback(message));
        });
        set({ connection: conn });
      });
      peer.on("error", (error) => set({ error }));
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error("Unknown error"),
      });
    }
  },

  connectToPeer: (peerId: string) => {
    const { peer } = get();
    if (peer) {
      const connection = peer.connect(peerId);
      connection.on("open", () => {
        set({ connection });
        connection.send({ type: "connected", payload: { peerId } });

        connection.on("data", (data: unknown) => {
          // assert data is a Message
          const message = data as Message;
          const { messageCallbacks } = get();
          const callbacks = messageCallbacks[message.type] || [];
          callbacks.forEach((callback) => callback(message));
        });
      });
      connection.on("error", (error) => set({ error }));
    }
  },

  sendMessage: (message: Message) => {
    const { connection } = get();
    if (connection) {
      connection.send(message);
    }
  },

  disconnect: () => {
    const { connection, peer } = get();
    if (connection) {
      connection.close();
    }
    if (peer) {
      peer.destroy();
    }
    set({ peer: null, connection: null });
  },

  onMessage: (type: string, callback: MessageCallback) => {
    set((state) => ({
      messageCallbacks: {
        ...state.messageCallbacks,
        [type]: [...(state.messageCallbacks[type] || []), callback],
      },
    }));
    return () => {
      set((state) => ({
        messageCallbacks: {
          ...state.messageCallbacks,
          [type]: state.messageCallbacks[type].filter((c) => c !== callback),
        },
      }));
    };
  },
}));
