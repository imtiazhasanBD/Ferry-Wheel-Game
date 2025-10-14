import React, { useEffect, useRef, useState } from "react";

export default function ResponsiveGameWrapper({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;

      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;

      const baseWidth = 360;
      const baseHeight = 700;

      // maintain aspect ratio (fit inside parent)
      const newScale = Math.min(parentWidth / baseWidth, parentHeight / baseHeight);
      setScale(newScale);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "bottom center",
          width: 360,
          height: 700,
        }}
      >
        {children}
      </div>
    </div>
  );
}
