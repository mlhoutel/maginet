/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import Peer, { DataConnection } from "peerjs";
import { useShapeStore } from "./useShapeStore";
interface PeerSyncMessage extends Message {
  type: "peer-sync";
  payload: {
    connectedPeers: string[];
  };
}
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
    const { peer, connections } = get();
    if (peer && peerId !== peer.id && !connections.has(peerId)) {
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
          [type]: state.messageCallbacks[type]?.filter((c) => c !== callback) || [],
        },
      }));
    };
  },
}));

function setupConnection(conn: DataConnection) {
  conn.on("open", () => {
    const { connections, peer } = usePeerStore.getState();
    connections.set(conn.peer, conn);
    usePeerStore.setState({ connections: new Map(connections) });

    const connectedPeers = Array.from(connections.keys()).filter(
      (id) => id !== conn.peer
    );
    conn.send({
      type: "peer-sync",
      payload: { connectedPeers },
    });

    if (peer?.id) {
      conn.send({
        type: "connected",
        payload: { peerId: peer.id },
      });
      conn.send({
        type: "shapes",
        payload: {
          id: peer.id,
          data: useShapeStore.getState().shapes,
        },
      });
    }
  });

  conn.on("data", (data: unknown) => {
    if (!isValidMessage(data)) {
      console.error("Invalid message received:", data);
      return;
    }

    if (data.type === "peer-sync") {
      const syncMessage = data as PeerSyncMessage;
      const { connections, peer } = usePeerStore.getState();
      syncMessage.payload.connectedPeers.forEach((peerId) => {
        if (!connections.has(peerId) && peer?.id !== peerId) {
          usePeerStore.getState().connectToPeer(peerId);
        }
      });
      return;
    }

    const { messageCallbacks } = usePeerStore.getState();
    const callbacks = messageCallbacks[data.type] || [];
    callbacks.forEach((callback) => callback(data, conn.peer));
  });

  conn.on("close", () => {
    const { connections } = usePeerStore.getState();
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
