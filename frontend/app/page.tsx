"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/")
      .then(res => res.json())
      .then(data => setMsg(data.msg));
  }, []);

  return <h1>{msg}</h1>;
}
