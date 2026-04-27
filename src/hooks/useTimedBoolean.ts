import { useEffect, useRef, useState } from "react";

/** Returns a boolean that is true for a given number of milliseconds. */
export function useTimedBoolean(millis = 1500): [boolean, () => void] {
  const [value, setValue] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const reset = () => {
    if (timeout.current != null) {
      clearTimeout(timeout.current);
    }
  };

  useEffect(() => reset, []);

  const setToTrue = () => {
    setValue(true);
    reset();
    timeout.current = setTimeout(() => setValue(false), millis);
  };

  return [value, setToTrue];
}
