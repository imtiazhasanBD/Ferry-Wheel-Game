const Record = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
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
                <div className="px-2 py-10">
                    <h2 className="text-center text-lg font-bold">Record</h2>
                    <div className="mt-4 text-sm text-white/80">
                        <table className="w-full table-auto border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2 text-left">Time</th>
                                    <th className="px-4 py-2 text-left">Bet</th>
                                    <th className="px-4 py-2 text-left">Result</th>
                                    <th className="px-4 py-2 text-left">Win</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Example Record */}
                                <tr>
                                    <td className="px-4 py-2">12:30 PM</td>
                                    <td className="px-4 py-2">1000 Coins</td>
                                    <td className="px-4 py-2">Pizza</td>
                                    <td className="px-4 py-2">1500 Coins</td>
                                </tr>
                                {/* Add more records as needed */}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Record