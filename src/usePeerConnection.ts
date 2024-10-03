/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import Peer, { DataConnection } from "peerjs";

interface PeerState {
  peer: Peer | null;
  connection: DataConnection | null;
  error: Error | null;
  receivedData: any;
  initPeer: () => void;
  connectToPeer: (peerId: string) => void;
  sendData: (data: any) => void;
  disconnect: () => void;
}

export const usePeerStore = create<PeerState>((set, get) => ({
  peer: null,
  connection: null,
  error: null,
  receivedData: null,

  initPeer: () => {
    try {
      const peer = new Peer();
      peer.on("open", () => set({ peer }));
      peer.on("error", (error) => set({ error }));
      peer.on("connection", (conn) => {
        conn.on("data", (data) => {
          set({ receivedData: data });
        });
        set({ connection: conn });
      });
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
        connection.on("data", (data) => {
          set({ receivedData: data });
        });
      });
      connection.on("error", (error) => set({ error }));
    }
  },

  sendData: (data: any) => {
    const { connection } = get();
    if (connection) {
      connection.send(data);
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
    set({ peer: null, connection: null, receivedData: [] });
  },
}));
