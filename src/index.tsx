import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import SegmentPage from "./App";
import ErrorPage from "./components/ErrorPage";
import AppContextProvider from "./components/hooks/context";

const container = document.getElementById("root");
const root = createRoot(container!);

const router = createBrowserRouter([
  {
    path: "*",
    element: <SegmentPage />,
    errorElement: <ErrorPage />,
  },
]);
root.render(
  <AppContextProvider>
    <RouterProvider router={router} />
  </AppContextProvider>
);