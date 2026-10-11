import MethodDiagram from "./MethodDiagram";

export default function SelfFusionSchematic() {
  return <MethodDiagram steps={[
    { title: "Create a target", text: "Registration and image fusion build a cleaner training target." },
    { title: "Train a network", text: "A neural network learns to approximate the fused target." },
    { title: "Run in real time", text: "The deployed network processes three input frames at video rate." },
  ]} />;
}
