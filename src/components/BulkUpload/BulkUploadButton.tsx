
import React, { useContext } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";

interface BulkUploadButtonProps {
  onClick: () => void;
}

const BulkUploadButton = ({ onClick }: BulkUploadButtonProps) => {
  const { isDarkMode } = useContext(ThemeContext);

  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={`gap-2 ${
        isDarkMode
          ? "bg-white/5 text-white hover:bg-white/10"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }`}
      size="sm"
    >
      <Upload className="h-4 w-4" />
      <span>Bulk Upload</span>
    </Button>
  );
};

export default BulkUploadButton;
