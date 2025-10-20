import { AnimatePresence, motion } from "framer-motion";
import type { Fly, PayoutFly, BankFly } from "../types.local";

function Coin() {
  return (
    <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
      style={{ background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)", borderColor: "#fbbf24", boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)" }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center"
           style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}>
        <span className="text-amber-900 text-[5px] font-extrabold">$</span>
      </div>
    </div>
  );
}

type Props = {
  flies: Fly[];
  remoteFlies: Fly[];
  payoutFlies: PayoutFly[];
  bankFlies: BankFly[];
  phoneRect: DOMRect | null;
  balanceRect: DOMRect | null;
  bankRect: DOMRect | null;
};

export default function FliesLayer({ flies, remoteFlies, payoutFlies, bankFlies, phoneRect, balanceRect, bankRect }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <AnimatePresence>
        {flies.map((f) => (
          <motion.div
            key={f.id}
            initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
            animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="absolute"
          >
            <Coin />
          </motion.div>
        ))}
        {remoteFlies.map((f) => (
          <motion.div
            key={f.id}
            initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
            animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="absolute w-10 h-10"
          >
            <Coin />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {payoutFlies.map((f) => (
            <motion.div key={`p-${f.id}`}
              initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
              animate={{
                x: ((balanceRect?.left ?? 0) - (phoneRect?.left ?? 0)) + (balanceRect?.width ?? 40) / 2,
                y: ((balanceRect?.top ?? 0) - (phoneRect?.top ?? 0)) + (balanceRect?.height ?? 40) / 2,
                opacity: 1, scale: 1, rotate: 360,
              }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
              className="absolute w-10 h-10">
              <Coin />
            </motion.div>
          ))}

          {bankFlies.map((f) => (
            <motion.div key={`b-${f.id}`}
              initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
              animate={{
                x: ((bankRect?.left ?? 0) - (phoneRect?.left ?? 0)) + (bankRect?.width ?? 40) / 5,
                y: ((bankRect?.top ?? 0) - (phoneRect?.top ?? 0)) + (bankRect?.height ?? 40) / 5,
                opacity: 1, scale: 1, rotate: 360,
              }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
              className="absolute w-10 h-10">
              <Coin />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
