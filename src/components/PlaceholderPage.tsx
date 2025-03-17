
import React, { useContext } from "react";
import { ThemeContext } from "@/App";

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
        {title} Page
      </h1>
      <p className={`mt-4 text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
        This page is under construction. Backend integration will be connected here.
      </p>
    </div>
  );
};

export default PlaceholderPage;
