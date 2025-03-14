
import React from "react";
import { cn } from "@/lib/utils";

interface GlowingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: "blue" | "purple" | "pink" | "green" | "red";
  glassEffect?: boolean;
  hoverEffect?: boolean;
  children: React.ReactNode;
  isDarkMode?: boolean;
}

const GlowingCard = ({
  gradient = "blue",
  glassEffect = true,
  hoverEffect = true,
  className,
  children,
  isDarkMode = true,
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
        isDarkMode 
          ? (glassEffect && "glassmorphism")
          : "bg-white border border-gray-200 shadow-sm",
        isDarkMode ? gradientClasses[gradient] : "",
        hoverEffect && "transition-all duration-300 hover:shadow-lg",
        isDarkMode && hoverEffect && "hover:scale-[1.02]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlowingCard;
