import { io, Socket } from "socket.io-client";

const RT = import.meta.env.VITE_RT_URL || "http://localhost:8080";

export function makeSocket(token: string): Socket {
  return io(RT, {
    transports: ["websocket"],
    auth: { token },
    autoConnect: true,
  });
}
