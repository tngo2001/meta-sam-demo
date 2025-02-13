import { useContext } from "react";
import AppContext from "./hooks/createContext";

interface SegmentOptionsProps {
  handleResetInteraction: () => void;
  handleUndoInteraction: () => void;
  handleRedoInteraction: () => void;
  handleCreateSticker: () => void;
  handleMagicErase: () => void;
  handleImage: (img?: HTMLImageElement) => void;
  hasClicked: boolean;
  isCutOut: [isCutOut: boolean, setIsCutOut: (e: boolean) => void];
  handleMultiMaskMode: () => void;
}

const SegmentOptions = ({
  handleResetInteraction,
  handleUndoInteraction,
  handleRedoInteraction,
  handleCreateSticker,
  handleImage,
  hasClicked,
  isCutOut: [isCutOut, setIsCutOut],
  handleMultiMaskMode,
}: SegmentOptionsProps) => {
  const {
    segmentTypes: [segmentTypes, setSegmentTypes],
    isLoading: [, setIsLoading],
    isErased: [isErased, setIsErased],
    svg: [svg],
    clicksHistory: [clicksHistory],
    isMultiMaskMode: [isMultiMaskMode],
    svgs: [svgs],
    didShowAMGAnimation: [, setDidShowAMGAnimation],
  } = useContext(AppContext)!;
  return (
    <>
      <div
        className={`flex justify-between px-4 py-2 my-2 text-sm bg-gray-200 rounded-xl opacity-70 ${
          segmentTypes === "All" && "hidden"
        } ${isCutOut && "hidden"}`}
      >
        <button
          onClick={() => {
            if (isErased) {
              setIsErased(false);
              setIsLoading(true);
              handleImage();
            }
            setSegmentTypes("Click");
            handleResetInteraction();
          }}
          className={`${
            ((!svg && !svgs && !isErased) || segmentTypes === "All") &&
            "disabled"
          }`}
        >
          Reset
        </button>
        <button
          onClick={handleUndoInteraction}
          className={`${
            (!svg || segmentTypes === "All" || isMultiMaskMode) && "disabled"
          }`}
        >
          Undo
        </button>
        <button
          onClick={handleRedoInteraction}
          className={`${
            (!clicksHistory?.length || segmentTypes === "All") && "disabled"
          }`}
        >
          Redo
        </button>
      </div>
      <div
        className={`flex flex-col gap-3 py-3 pl-3 text-sm bg-gray-200 cursor-pointer rounded-xl ${
          hasClicked &&
          "bg-gradient-to-r from-gray-200 to-blue-400/30 background-animate"
        } ${isCutOut && "hidden"}`}
      >
        <button
          className={`flex ${!svg && segmentTypes !== "All" && "disabled"} `}
          onClick={(e) => {
            handleCreateSticker();
            e.stopPropagation();
            setIsCutOut(true);
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.7895 0H13.4737V2.52632H16V4.21053H13.4737V6.73684H11.7895V4.21053H9.26316V2.52632H11.7895V0ZM3.36842 2.52632H6.73684V4.21053H3.36842C2.44211 4.21053 1.68421 4.96842 1.68421 5.89474V12.6316C1.68421 13.5663 2.44211 14.3158 3.36842 14.3158H10.1053C11.04 14.3158 11.7895 13.5663 11.7895 12.6316V9.26316H13.4737V12.6316C13.4737 14.4926 11.9663 16 10.1053 16H3.36842C1.50737 16 0 14.4926 0 12.6316V5.89474C0 4.03368 1.50737 2.52632 3.36842 2.52632Z"
              fill="black"
            />
          </svg>
          <span className="pl-2 opacity-70">
            {segmentTypes === "All" ? "Cut out all objects" : "Cut out object"}
          </span>
        </button>
      </div>
    </>
  );
};

export default SegmentOptions;