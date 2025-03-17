
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
      className={`gap-2 bg-neon-purple hover:bg-neon-purple/90 text-white`}
      size="sm"
    >
      <Upload className="h-4 w-4" />
      <span>Bulk Upload</span>
    </Button>
  );
};

export default BulkUploadButton;
