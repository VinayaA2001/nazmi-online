// components/blocks/slomo.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDES = [
  { id: 1, src: "/images/poster1.png", alt: "Summer Collection - Premium Traditional Wear" },
  { id: 2, src: "/images/poster2.png", alt: "New Arrivals - Contemporary Western Styles" },
  { id: 3, src: "/images/poster3.png", alt: "Limited Time Offer - Exclusive Boutique Deals" },
];

export default function Slomo() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full">
      {SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  );
}
