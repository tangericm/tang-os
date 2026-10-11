import MethodDiagram from "./MethodDiagram";

export default function SpeckleSchematic() {
  return <MethodDiagram steps={[
    { title: "Pair noisy frames", text: "Neighboring scans show similar structure with different speckle." },
    { title: "Learn the structure", text: "Train a neural network to predict one frame from another." },
    { title: "Denoise one scan", text: "Apply the trained model to a single noisy frame." },
  ]} />;
}
