import React from "react";
import { Wifi } from "lucide-react";

type PingDisplayProps = {
  ping: number;
};

const PingDisplay: React.FC<PingDisplayProps> = ({ ping }) => {
  // Determine color based on ping value
  let colorClass = "text-green-500"; // default green

  if (ping > 300) {
    colorClass = "text-red-500";
  } else if (ping > 100) {
    colorClass = "text-yellow-400";
  }

  return (
    <div className={`flex items-center space-x-1 text-xs ${colorClass} bg-gray-800/45 p-1 rounded-sm`}>
      <Wifi size={14} className="animate-pulse" />
      <span>{ping}ms</span>
    </div>
  );
};

export default PingDisplay;
