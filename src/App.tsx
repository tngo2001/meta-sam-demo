import LZString from "lz-string";
import { InferenceSession, Tensor } from "onnxruntime-web";
import * as ort from 'onnxruntime-web';
import { useContext, useEffect, useState } from "react";
import getFile from "./components/helpers/getFile";
import { handleImageScale } from "./components/helpers/ImageHelper";
import { modelScaleProps } from "./components/helpers/Interface";
import {
  getAllMasks,
  keepArrayForMultiMask,
  rleToImage,
  traceCompressedRLeStringToSVG,
  traceOnnxMaskToSVG,
} from "./components/helpers/mask_utils";
import {
  modelData,
  setParmsandQueryEraseModel,
  setParmsandQueryModel,
} from "./components/helpers/modelAPI";
import AppContext from "./components/hooks/createContext";
import Stage from "./components/Stage";

ort.env.debug = false;
ort.env.logLevel = 'verbose';
ort.env.wasm.numThreads = 2;
ort.env.wasm.simd = true;

ort.env.wasm.wasmPaths = {
  'ort-wasm.wasm': '/ort-wasm.wasm',
  'ort-wasm-simd.wasm': '/ort-wasm-simd.wasm',
  'ort-wasm-threaded.wasm': '/ort-wasm-threaded.wasm',
  'ort-wasm-simd-threaded.wasm': '/ort-wasm-simd-threaded.wasm'
};

const SegmentPage = () => {
  const {
    click: [, setClick],
    clicks: [clicks, setClicks],
    image: [image, setImage],
    prevImage: [prevImage, setPrevImage],
    svg: [, setSVG],
    svgs: [, setSVGs],
    allsvg: [, setAllsvg],
    isErased: [, setIsErased],
    isModelLoaded: [, setIsModelLoaded],
    isLoading: [, setIsLoading],
    segmentTypes: [, setSegmentTypes],
    maskImg: [, setMaskImg],
    isErasing: [, setIsErasing],
    stickerTabBool: [stickerTabBool],
    isMultiMaskMode: [isMultiMaskMode, setIsMultiMaskMode],
    isHovering: [, setIsHovering],
    showLoadingModal: [, setShowLoadingModal],
    eraserText: [, setEraserText],
    predMask: [predMask, setPredMask],
    predMasks: [predMasks, setPredMasks],
    predMasksHistory: [predMasksHistory],
    isToolBarUpload: [, setIsToolBarUpload],
  } = useContext(AppContext)!;
  const [model, setModel] = useState<InferenceSession | null>(null);
  const [multiMaskModel, setMultiMaskModel] = useState<InferenceSession | null>(
    null
  );
  const [tensor, setTensor] = useState<Tensor | null>(null);
  const [hasClicked, setHasClicked] = useState<boolean>(false);
  const [mask, setMask] = useState<
    | string[]
    | Uint8Array
    | Float32Array
    | Int8Array
    | Uint16Array
    | Int16Array
    | Int32Array
    | BigInt64Array
    | Float64Array
    | Uint32Array
    | BigUint64Array
    | null
  >(null);
  const [modelScale, setModelScale] = useState<modelScaleProps | null>(null);

  useEffect(() => {
    const initModel = async () => {
      try {
        const MODEL_DIR = "./interactive_module_quantized_592547_2023_03_19_sam6_long_uncertain.onnx";
        const URL: string = MODEL_DIR;
        const model = await InferenceSession.create(URL);
        setModel(model);
      } catch (e) {
        console.error(e);
      }
      try {
        const MULTI_MASK_MODEL_DIR = "./interactive_module_quantized_592547_2023_03_20_sam6_long_all_masks_extra_data_with_ious.onnx";
        const URL2: string = MULTI_MASK_MODEL_DIR;
        const multiMaskModel = await InferenceSession.create(URL2);
        setMultiMaskModel(multiMaskModel);
      } catch (e) {
        console.error(e);
      }
    };
    initModel();
  }, []);

  const runMultiMaskModel = async () => {
    try {
      if (
        multiMaskModel === null ||
        clicks === null ||
        tensor === null ||
        modelScale === null ||
        !hasClicked // only run for clicks
      )
        return;
      if (stickerTabBool) return;
      const feeds = modelData({
        clicks,
        tensor,
        modelScale,
        last_pred_mask: null, // Only 1 click allowed, so no last predicted mask exists
      });
      if (feeds === undefined) return;
      const results = await multiMaskModel.run(feeds);

      const output = results["output"];
      const areas = results["areas"].data;
      const uncertain_ious = results["uncertain_ious"].data;
      const ious = results["ious"].data;

      const allMasks = getAllMasks(
        output.data,
        output.dims[2], // height
        output.dims[1] // width
      ); // There are 3

      // allMasksSorted will be a list of 1-3 masks, sorted by area.
      // The best mask is selected for rendering on the collapsed canvas.
      // You can loop through allMasksSorted
      // and render each one onto a separate layer in the multi
      // mask animation
      let sorted_indices = sortAndReturnIndices(
        // @ts-ignore
        Array(Number(areas[1]), Number(areas[2]), Number(areas[3]))
      ); // Keep only masks indices 1, 2, 3
      sorted_indices.reverse();

      let allMasksSorted = sortByIndices(
        [allMasks[1], allMasks[2], allMasks[3]],
        sorted_indices
      ); // Keep only 3
      let allUncertainIoUSorted = sortByIndices(
        [uncertain_ious[1], uncertain_ious[2], uncertain_ious[3]],
        sorted_indices
      );
      let allOverlapIoUsSorted = sortByIndices(
        [ious[0], ious[1], ious[2]], // Only 3 of these, not 4
        sorted_indices
      );

      // Filter bad and duplicate masks
      const keepArray = keepArrayForMultiMask(
        allUncertainIoUSorted,
        allOverlapIoUsSorted
      );
      allMasksSorted = allMasksSorted.filter(
        (obj: any, i: number) => keepArray[i]
      );
      allUncertainIoUSorted = allUncertainIoUSorted.filter(
        (obj: any, i: number) => keepArray[i]
      );

      // Trace remaining masks
      const svgStrs = allMasksSorted.map((mask) =>
        traceOnnxMaskToSVG(mask, output.dims[2], output.dims[1])
      );

      // Reversing the masks here because the DOM stacks elements
      // from bottom to top. In other words, the first element in
      // the array will be on the bottom, and the last element will
      // be on the top.
      setSVGs(svgStrs.reverse());

      // Set the single svg to the best mask by uncertain iou.
      // This is used for display when the masks are collapsed.
      allUncertainIoUSorted = allUncertainIoUSorted.reverse();
      const bestIdx = allUncertainIoUSorted.indexOf(
        Math.max(...allUncertainIoUSorted)
      );
      setSVG(svgStrs[bestIdx]);

      // !!!!Multiple clicks are not allowed!!!
      setClick(null);
      setIsLoading(false);
      setIsModelLoaded((prev) => {
        return { ...prev, boxModel: true };
      });
    } catch (e) {
      console.log(e);
    }
  };

  const sortAndReturnIndices = (arr: Array<number>) => {
    const indices = Array.from(arr.keys());
    indices.sort((a, b) => arr[b] - arr[a]);
    return indices;
  };

  const sortByIndices = (items: any, indices: Array<number>) => {
    const result = [];
    for (var i = 0; i < indices.length; i++) {
      result.push(items[indices[i]]);
    }
    return result;
  };

  const runModel = async () => {
    try {
      if (
        model === null ||
        clicks === null ||
        tensor === null ||
        modelScale === null
      )
        return;
      if (stickerTabBool) return;
      const feeds = modelData({
        clicks,
        tensor,
        modelScale,
        last_pred_mask: predMask,
      });
      if (feeds === undefined) return;
      const results = await model.run(feeds);
      const output = results[model.outputNames[0]];
      if (hasClicked) {
        const pred_mask = results[model.outputNames[1]];
        setPredMask(pred_mask);
        if (!predMasksHistory) {
          setPredMasks([...(predMasks || []), pred_mask]);
        }
        const svgStr = traceOnnxMaskToSVG(
          output.data,
          output.dims[1],
          output.dims[0]
        );
        setSVG(svgStr);
        setMask(output.data);
      } else {
        setMaskImg(rleToImage(output.data, output.dims[0], output.dims[1]));
      }
      setClick(null);
      setIsLoading(false);
      setIsModelLoaded((prev) => {
        return { ...prev, boxModel: true };
      });
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    // When the multi mask mode is enabled, run runMultiMaskModel
    const runOnnx = async () => {
      if (isMultiMaskMode) {
        if (hasClicked) {
          // Only enable multi mask case, when there are clicks.
          // We don't want the hover feature for this mode
          runMultiMaskModel();
        }
      } else {
        runModel();
      }
    };
    runOnnx();
  }, [clicks, hasClicked, isMultiMaskMode]);

  const handleMagicErase = () => {
    if (image !== null) {
      setIsErased(true);
      setIsErasing(true);
      setEraserText({ isErase: true, isEmbedding: false });
      const { height, width, uploadScale } = handleImageScale(image);
      setParmsandQueryEraseModel({
        width,
        height,
        uploadScale,
        imgData: image,
        mask: mask || new Float32Array(),
        handlePredictedImage: handlePredictedImage,
      });
    }
  };

  const handlePredictedImage = (imgStr: string) => {
    const img = new Image();
    img.src = imgStr;
    img.onload = () => {
      setEraserText({ isErase: false, isEmbedding: true });
      // Set to the original image width and height
      img.width = image?.width || 0;
      img.height = image?.height || 0;
      handleImage(img);
    };
  };

  const handleImage = (img: HTMLImageElement = prevImage!) => {
    // Reset the image, mask and clicks
    setImage(img);
    setMaskImg(null);
    setSVG(null);
    setMask(null);
    setClick(null);
    setClicks(null);
    setIsModelLoaded({ boxModel: false, allModel: false });
    setHasClicked(false);
    const { height, width, uploadScale } = handleImageScale(img);
    setParmsandQueryModel({
      width,
      height,
      uploadScale,
      imgData: img,
      handleSegModelResults,
      handleAllModelResults,
      imgName: "",
      shouldDownload: false,
      shouldNotFetchAllModel: false,
    });
  };

  const handleSelectedImage = async (
    data: File | URL,
    options?: { shouldNotFetchAllModel?: boolean; shouldDownload?: boolean }
  ) => {

    if (data instanceof File) {
      console.log("GOT FILE " + data.name);
    } else if (data instanceof URL) {
      console.log("GOT URL " + data.pathname);
    } else {
      console.log("GOT STRING " + data);
    }

    try {
      const shouldNotFetchAllModel = options?.shouldNotFetchAllModel;
      const shouldDownload = options?.shouldDownload;
      handleResetState();
      setShowLoadingModal(true);
      let imgName: string = "";
      if (data instanceof URL) {
        imgName = data.pathname;
      } else if (data instanceof String) {
        data = new URL(data.replace('/assets/', '/public/assets/'));
        imgName = data.pathname;
      }
      imgName = imgName.substring(imgName.lastIndexOf("/") + 1);
      const imgData: File = data instanceof File ? data : await getFile(data);
      const img = new Image();
      img.src = URL.createObjectURL(imgData);
      img.onload = () => {
        setIsToolBarUpload(false);
        const { height, width, scale, uploadScale } = handleImageScale(img);
        setModelScale({
          onnxScale: scale / uploadScale,
          maskWidth: width * uploadScale,
          maskHeight: height * uploadScale,
          scale: scale,
          uploadScale: uploadScale,
          width: width,
          height: height,
        });
        img.width = Math.round(width * scale);
        img.height = Math.round(height * scale);
        setImage(img);
        setPrevImage(img);
        setIsErased(false);
        setParmsandQueryModel({
          width,
          height,
          uploadScale,
          imgData: img,
          handleSegModelResults,
          handleAllModelResults,
          imgName,
          shouldDownload,
          shouldNotFetchAllModel,
        });
      };
    } catch (error) {
      console.log(error);
    }
  };

  const handleSegModelResults = ({ tensor }: { tensor: Tensor }) => {
    setTensor(tensor);
    setIsLoading(false);
    setIsErasing(false);
    setShowLoadingModal(false);
    setEraserText({ isErase: false, isEmbedding: false });
  };

  const handleAllModelResults = ({
    allJSON,
    image_height,
  }: {
    allJSON: {
      encodedMask: string;
      bbox: number[];
      score: number;
      point_coord: number[];
      uncertain_iou: number;
      area: number;
    }[];
    image_height: number;
  }) => {
    const allMaskSVG = allJSON.map(
      (el: {
        encodedMask: string;
        bbox: number[];
        score: number;
        point_coord: number[];
        uncertain_iou: number;
        area: number;
      }) => {
        const maskenc = LZString.decompressFromEncodedURIComponent(
          el.encodedMask
        );
        const svg = traceCompressedRLeStringToSVG(maskenc, image_height);
        return { svg: svg, point_coord: el.point_coord };
      }
    );
    setAllsvg(allMaskSVG);
    setIsModelLoaded((prev) => {
      return { ...prev, allModel: true };
    });
  };

  const handleResetState = () => {
    setMaskImg(null);
    setHasClicked(false);
    setClick(null);
    setClicks(null);
    setSVG(null);
    setSVGs(null);
    setAllsvg(null);
    setTensor(null);
    setImage(null);
    setPrevImage(null);
    setPredMask(null);
    setIsErased(false);
    setShowLoadingModal(false);
    setIsModelLoaded({ boxModel: false, allModel: false });
    setSegmentTypes("Click");
    setIsLoading(false);
    setIsMultiMaskMode(false);
    setIsHovering(null);
    setPredMasks(null);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden`}>
      <Stage
        scale={modelScale}
        handleResetState={handleResetState}
        handleMagicErase={handleMagicErase}
        handleImage={handleImage}
        hasClicked={hasClicked}
        setHasClicked={setHasClicked}
        handleSelectedImage={handleSelectedImage}
        image={image}
      />
    </div>
  );
};

export default SegmentPage;