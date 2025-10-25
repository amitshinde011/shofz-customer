import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReviewImagesModalProps {
  images: string[];
  onClose: () => void;
}

export function ReviewImagesModal({ images, onClose }: ReviewImagesModalProps) {
  const [currentImage, setCurrentImage] = useState(0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review Images</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src={images[currentImage]}
              alt={`Review ${currentImage + 1}`}
              className="max-h-96 max-w-full object-contain rounded"
            />
          </div>
          {images.length > 1 && (
            <div className="flex justify-center space-x-2">
              {images.map((_, index) => (
                <Button
                  key={index}
                  variant={index === currentImage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentImage(index)}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}