import Canvas from "./Canvas";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Canvas />
    </QueryClientProvider>
  );
}

export default App;
