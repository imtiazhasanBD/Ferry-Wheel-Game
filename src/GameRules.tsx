const GameRules = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
  if (!open) return null; // If not open, return null to hide

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-[92%] max-w-md rounded-3xl text-white shadow-[0_24px_80px_rgba(0,0,0,.6)] pointer-events-auto"
        style={{
          background:
            "linear-gradient(180deg, #8a2be2 0%, #7a27dc 30%, #5a1fcf 70%, #4317c2 100%)",
/*           border: "4px solid #ff9f1a", */
          boxShadow: "0 0 0 3px rgba(255,159,26,.25) inset, 0 16px 40px rgba(0,0,0,.45)",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Content */}
        <div className="px-4 py-10">
          <h2 className="text-center text-lg font-bold">Game Rules</h2>
          <div className="mt-4 text-sm text-white/80">
            <ol className="list-decimal pl-4 space-y-2">
              <li>Choose your bet amount and the food you bet on;</li>
              <li>Each betting round lasts 30 seconds and results are announced immediately;</li>
              <li>If the announced result matches the food you chose, you will receive a reward with the corresponding odds;</li>
              <li>As more users participate, the prize pool will increase. When the pool reaches a certain amount, there will be chances for pizza or salad rewards;</li>
              <li>If salad is announced, all vegetables will be rewarded;</li>
              <li>If pizza is announced, all meat will be rewarded;</li>
              <li>If the player chooses meat and the result is meat, they will be rewarded;</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};


export default GameRules