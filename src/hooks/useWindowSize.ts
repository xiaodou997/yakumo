import { useEffect, useState } from "react";

interface WindowSize {
  width: number;
  height: number;
}

function getWindowSize(): WindowSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState(getWindowSize);

  useEffect(() => {
    let frame: number | null = null;

    const handleResize = () => {
      if (frame != null) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        frame = null;
        setWindowSize(getWindowSize());
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (frame != null) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  return windowSize;
}
