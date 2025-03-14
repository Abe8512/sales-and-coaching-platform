
import React from "react";
import { cn } from "@/lib/utils";

interface GlowingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: "blue" | "purple" | "pink" | "green" | "red";
  glassEffect?: boolean;
  hoverEffect?: boolean;
  children: React.ReactNode;
}

const GlowingCard = ({
  gradient = "blue",
  glassEffect = true,
  hoverEffect = true,
  className,
  children,
  ...props
}: GlowingCardProps) => {
  const gradientClasses = {
    blue: "neon-border",
    purple: "neon-purple-border",
    pink: "neon-pink-border",
    green: "neon-green-border",
    red: "neon-red-border",
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4",
        glassEffect && "glassmorphism",
        gradientClasses[gradient],
        hoverEffect && "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlowingCard;
