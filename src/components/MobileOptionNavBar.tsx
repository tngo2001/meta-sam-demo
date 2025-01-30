import { useContext, useState } from "react";
import AppContext from "./hooks/createContext";

interface MobileOptionNavBarProps {
  handleResetInteraction: () => void;
  handleUndoInteraction: () => void;
  handleRedoInteraction: () => void;
  handleResetState: () => void;
  handleImage: (img?: HTMLImageElement) => void;
  userNegClickBool: [
    userNegClickBool: boolean,
    setUserNegClickBool: (e: boolean) => void
  ];
}

const MobileOptionNavBar = ({
  handleResetInteraction,
  handleRedoInteraction,
  handleResetState,
  handleUndoInteraction,
  handleImage,
  userNegClickBool: [, setUserNegClickBool],
}: MobileOptionNavBarProps) => {
  const {
    svg: [svg],
    clicksHistory: [clicksHistory],
    segmentTypes: [segmentTypes, setSegmentTypes],
    isErased: [isErased, setIsErased],
    isLoading: [, setIsLoading],
  } = useContext(AppContext)!;
  const [, setHasTouchedUpload] = useState<Boolean>(false);
  return (
    <div className="flex justify-between w-full p-2 md:hidden">
      <div>
        <button
          className={`p-3.5 py-2.5 text-sm font-bold w-min algin-center rounded-l-md bg-white ${
            ((!svg && !isErased) || segmentTypes === "All") && "disabled"
          }`}
          onClick={() => {
            if (isErased) {
              setIsErased(false);
              setIsLoading(true);
              handleImage();
            }
            handleResetInteraction();
            setSegmentTypes("Click");
            setUserNegClickBool(false);
          }}
        >
          Reset
        </button>
        <button
          className={`p-3.5 py-2.5 text-sm w-min font-bold bg-white ${
            (!svg || segmentTypes === "All") && "disabled"
          }`}
          onClick={handleUndoInteraction}
        >
          Undo
        </button>
        <button
          className={`p-3.5 py-2.5 text-sm font-bold w-min rounded-r-md bg-white ${
            (!clicksHistory?.length || segmentTypes === "All") && "disabled"
          }`}
          onClick={handleRedoInteraction}
        >
          Redo
        </button>
      </div>
    </div>
  );
};

export default MobileOptionNavBar;