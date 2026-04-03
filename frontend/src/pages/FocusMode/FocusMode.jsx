import { useState } from "react";

export default function Focus() {
  const [time, setTime] = useState(25);

  return (
    <div>
      <h2>Focus Mode</h2>
      <h1>{time}:00</h1>
      <button onClick={() => setTime(time - 1)}>Start</button>
    </div>
  );
}