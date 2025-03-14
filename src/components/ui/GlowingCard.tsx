
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
    blue: isDarkMode ? "neon-border" : "light-blue-border",
    purple: isDarkMode ? "neon-purple-border" : "light-purple-border",
    pink: isDarkMode ? "neon-pink-border" : "light-pink-border",
    green: isDarkMode ? "neon-green-border" : "light-green-border",
    red: isDarkMode ? "neon-red-border" : "light-red-border",
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4",
        isDarkMode 
          ? (glassEffect && "glassmorphism")
          : "bg-white border border-gray-200 shadow-sm",
        gradientClasses[gradient],
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
