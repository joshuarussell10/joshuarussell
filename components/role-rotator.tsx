"use client";

import { useEffect, useRef, useState } from "react";
import { heroRoles } from "@/lib/data";

type RoleRotatorProps = {
  className?: string;
  onRoleChange?: () => void;
};

export function RoleRotator({
  className = "",
  onRoleChange,
}: RoleRotatorProps) {
  const onRoleChangeRef = useRef(onRoleChange);
  onRoleChangeRef.current = onRoleChange;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  useEffect(() => {
    if (reducedMotion || heroRoles.length <= 1) return;

    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % heroRoles.length);
        setVisible(true);
        onRoleChangeRef.current?.();
      }, 280);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  return (
    <span
      className={`role-rotator block text-5xl leading-tight font-semibold tracking-tighter md:text-7xl ${className}`}
      aria-live={mounted ? "polite" : "off"}
    >
      <span
        key={index}
        className={`bg-gradient-text bg-[length:150%_100%] bg-clip-text bg-no-repeat text-transparent ${
          mounted && !visible ? "role-rotator-hidden" : "role-rotator-visible"
        }`}
      >
        {heroRoles[index]}
      </span>
    </span>
  );
}
