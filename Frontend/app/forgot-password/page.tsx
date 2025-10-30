"use client";
import { useState } from "react";

export default function Example() {
  const [email, setEmail] = useState("");

  return (
    <div className="p-8">
      <input
        type="email"
        placeholder="Enter email"
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
          setEmail(e.target.value)
        }
        className="border border-gray-300 rounded-md p-2"
      />
      <p className="mt-2 text-gray-700">Typed: {email}</p>
    </div>
  );
}
