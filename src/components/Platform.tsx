export default function Platform({ D }: { D: number }) {
  return (
    <div className="relative w-full h-full">
      <div
        className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
        style={{ left: "50%", transform: `translateX(-${D * 0.36}px) skewX(10deg)`, width: D * 0.28, height: Math.max(110, D * 0.28), boxShadow: "0 4px 0 #2379c9" }}
      />
      <div
        className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
        style={{ left: "50%", transform: `translateX(${D * 0.08}px) skewX(-10deg)`, width: D * 0.28, height: Math.max(110, D * 0.28), boxShadow: "0 4px 0 #2379c9" }}
      />
      <div className="absolute -left-8 -right-8 flex justify-between">
        {/* Pizza */}
        <div className="flex flex-col items-center w-12">
          <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
            <span className="text-3xl pb-1">🍕</span>
          </div>
          <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">Total 400k</div>
          <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">4.37x</div>
          <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400 border-orange-500 absolute ml-20 z-20 mt-3">
            <path d="M20 40 C 110 0, 180 10, 210 60 C 235 105, 175 125, 145 105 C 115 85, 135 55, 200 55 C 285 55, 330 85, 360 110"
              fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M360 110 L 395 110" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M395 110 L 372 95 M395 110 L 372 125" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="absolute left-3/12 mt-6 ml-3">
            <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">Pizza</div>
          </div>
        </div>
        {/* Salad */}
        <div className="flex flex-col items-center w-12">
          <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
            <span className="text-3xl">🥗</span>
          </div>
          <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">Total 100k</div>
          <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">1.25x</div>
          <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400 border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">
            <path d="M20 40 C 110 0, 180 10, 210 60 C 235 105, 175 125, 145 105 C 115 85, 135 55, 200 55 C 285 55, 330 85, 360 110"
              fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M360 110 L 395 110" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M395 110 L 372 95 M395 110 L 372 125" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="absolute right-3/12 mt-6 mr-3">
            <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">Salad</div>
          </div>
        </div>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
        style={{
          bottom: 0, width: D * 1.15, height: 52,
          background: "linear-gradient(180deg, #36a2ff, #2379c9)",
          border: "4px solid #1e40af",
          boxShadow: "0 5px 0 #1e3a8a",
        }}
      />
    </div>
  );
}
