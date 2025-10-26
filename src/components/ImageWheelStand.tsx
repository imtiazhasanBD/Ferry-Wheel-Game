export const WheelStand = ({ wheelTop, D, R }: { wheelTop: number; D: number; R: number }) => {
  // Colors for the blue gradient and shadow
  const lightBlue = "#60a5fa";
  const darkBlue = "#2563eb";
  const shadow = "rgba(0, 0, 0, 0.25)";

  // Light, semi-transparent lattice lines for texture on the blue gradient
  const latticeColor = "rgba(255, 255, 255, 0.15)";
  const latticePattern = `
    repeating-linear-gradient(
      45deg,
      ${latticeColor} 0 2px,
      transparent 2px 20px
    ),
    repeating-linear-gradient(
      -45deg,
      ${latticeColor} 0 2px,
      transparent 2px 20px
    )
  `;
  const baseGradient = `linear-gradient(180deg, ${lightBlue}, ${darkBlue})`;

  // Common leg styles
  const legBaseStyle = {
    position: "absolute" as "absolute", 
    bottom: 0,
    width: "100%",
    height: "100%",
    background: `${latticePattern}, ${baseGradient}`,
    boxShadow: `0 12px 28px ${shadow}`,
    backgroundBlendMode: "overlay, normal",
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none"
      style={{
        top: wheelTop - R * 1.22,
        width: D * 0.78,
        height: R * 1.4,
      }}
    >
      {/* Left Leg */}
      <div
        style={{
          ...legBaseStyle,
          clipPath: "polygon(65% 0%, 100% 100%, 75% 100%, 70% 70%, 60% 40%, 50% 30%, 40% 40%, 30% 70%, 25% 100%, 0% 100%, 35% 0%)",
        }}
      />

      {/* Right Leg */}
      <div
        style={{
          ...legBaseStyle,
          clipPath: "polygon(65% 0%, 100% 100%, 75% 100%, 70% 70%, 60% 40%, 50% 30%, 40% 40%, 30% 70%, 25% 100%, 0% 100%, 35% 0%)",
        }}
      />

      {/* Left Foot */}
      <div
        style={{
          position: "absolute",
          bottom: -5, 
          left: "-1%", 
          width: "27%",
          height: 6,
          borderRadius: 6,
          background: "linear-gradient(180deg,#2f63c7,#1f4290)",
          boxShadow: "0 4px 10px rgba(0,0,0,.25)",
        }}
      />

      {/* Right Foot */}
      <div
        style={{
          position: "absolute",
          bottom: -5,
          right: "-1%", 
          width: "27%",
          height: 6,
          borderRadius: 6,
          background: "linear-gradient(180deg,#2f63c7,#1f4290)",
          boxShadow: "0 4px 10px rgba(0,0,0,.25)",
        }}
      />
    </div>
  );
};
