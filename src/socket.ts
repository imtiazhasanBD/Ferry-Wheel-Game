import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";


const token =  localStorage.getItem("auth_token") ?? undefined;
const API_BASE = import.meta.env.VITE_API_BASE_URL
const WS_URL = `${API_BASE}/game`


export function emitAck(socket: Socket, event: string, payload: unknown, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error(`${event} timeout`));
      }
    }, timeoutMs);
    socket.emit(event, payload, (res: any) => {
      if (!done) {
        done = true;
        clearTimeout(t);
        resolve(res);
      }
    });
  });
}



export function useSocket() {
  const ref = useRef<Socket | null>(null);
  if (!ref.current) {
    ref.current = io(WS_URL, {
      auth: token ? { token:token } : undefined,
      transports: ["polling", "websocket"],
      withCredentials: false,
    });
  }


  useEffect(() => {
    const s = ref.current;
    const onErr = (e:any) => console.log("connect_error:", e?.message || e);
    s?.on("connect_error", onErr);
    return () => {
      s?.off("connect_error", onErr);
    };
  }, []);
  return ref.current;
}