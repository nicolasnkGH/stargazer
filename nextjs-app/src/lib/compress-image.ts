import { GALLERY_UPLOAD_MAX_WIDTH, GALLERY_UPLOAD_JPEG_QUALITY } from "./constants";

/** Downscales + re-encodes an image file to a JPEG data URL, client-side, via canvas. No dependency needed for this. */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > GALLERY_UPLOAD_MAX_WIDTH) {
          height = Math.round((height * GALLERY_UPLOAD_MAX_WIDTH) / width);
          width = GALLERY_UPLOAD_MAX_WIDTH;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", GALLERY_UPLOAD_JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error("Unsupported image format"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
