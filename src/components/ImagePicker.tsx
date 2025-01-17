import { useState } from "react";
import { useDropzone } from "react-dropzone";
export interface ImagePickerProps {
  handleSelectedImage: (
    data: File | URL,
    options?: { shouldDownload?: boolean; shouldNotFetchAllModel?: boolean }
  ) => void;
  showGallery: [showGallery: boolean, setShowGallery: (e: boolean) => void];
}

const ImagePicker = ({handleSelectedImage}: ImagePickerProps) => {
  const [, setError] = useState<string>("");

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpeg", ".jpg"],
    },
    onDrop: (acceptedFile) => {
      try {
        if (acceptedFile.length === 0) {
          setError("File not accepted! Try again.");
          return;
        }
        if (acceptedFile.length > 1) {
          setError("Too many files! Try again with 1 file.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          handleSelectedImage(acceptedFile[0]);
        };
        reader.readAsDataURL(acceptedFile[0]);
      } catch (error) {
        console.log(error);
      }
    },
    maxSize: 50_000_000,
  });

  return (
    <div className="pt-6 mx-4">
      <div className="flex flex-row py-5 text-sm align-middle md:text-lg">
        <div className="flex items-center">
          <span {...getRootProps()}>
            <input {...getInputProps()} />
            <button className="ml-1 text-blue-700 underline">
              Upload an image
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImagePicker;