import { createRoot } from "react-dom/client";
import SegmentPage from "./App";
import AppContextProvider from "./components/hooks/context";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <AppContextProvider>
    <SegmentPage />
  </AppContextProvider>
);