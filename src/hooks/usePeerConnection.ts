/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import Peer, { DataConnection } from "peerjs";

interface Message {
  type: string;
  payload: any;
}

type MessageCallback = (message: Message, peerId: string) => void;

interface PeerState {
  peer: Peer | null;
  connections: Map<string, DataConnection>;
  error: Error | null;
  initPeer: () => void;
  connectToPeer: (peerId: string) => void;
  sendMessage: (message: Message, peerId?: string) => void;
  disconnect: (peerId?: string) => void;
  onMessage: (type: string, callback: MessageCallback) => () => void;
  messageCallbacks: { [key: string]: MessageCallback[] };
}

export const usePeerStore = create<PeerState>((set, get) => ({
  peer: null,
  connections: new Map(),
  error: null,
  messageCallbacks: {},

  initPeer: () => {
    try {
      const peer = new Peer();
      peer.on("open", () => set({ peer }));
      peer.on("connection", (conn) => {
        setupConnection(conn);
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
      setupConnection(connection);
    }
  },

  sendMessage: (message: Message, peerId?: string) => {
    const { connections } = get();
    if (peerId) {
      const connection = connections.get(peerId);
      if (connection) {
        connection.send(message);
      }
    } else {
      connections.forEach((connection) => {
        connection.send(message);
      });
    }
  },

  disconnect: (peerId?: string) => {
    const { connections, peer } = get();
    if (peerId) {
      const connection = connections.get(peerId);
      if (connection) {
        connection.close();
        connections.delete(peerId);
      }
    } else {
      connections.forEach((connection) => connection.close());
      if (peer) {
        peer.destroy();
      }
      set({ peer: null, connections: new Map() });
    }
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

function setupConnection(conn: DataConnection) {
  const { connections, messageCallbacks } = usePeerStore.getState();

  conn.on("open", () => {
    connections.set(conn.peer, conn);
    usePeerStore.setState({ connections: new Map(connections) });
    conn.send({ type: "connected", payload: { peerId: conn.peer } });
  });

  conn.on("data", (data: unknown) => {
    if (isValidMessage(data)) {
      const callbacks = messageCallbacks[data.type] || [];
      callbacks.forEach((callback) => callback(data, conn.peer));
    } else {
      console.error("Invalid message received:", data);
    }
  });

  conn.on("close", () => {
    connections.delete(conn.peer);
    usePeerStore.setState({ connections: new Map(connections) });
  });

  conn.on("error", (error) => usePeerStore.setState({ error }));
}

// Type guard to check if a message is valid
function isValidMessage(data: unknown): data is Message {
  if (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "payload" in data
  ) {
    return true;
  }
  return false;
}
