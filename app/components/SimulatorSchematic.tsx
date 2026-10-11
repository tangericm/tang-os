import MethodDiagram from "./MethodDiagram";

export default function SimulatorSchematic() {
  return <MethodDiagram steps={[
    { title: "Build a scene", text: "Define tissue layers, instrument optics, and noise." },
    { title: "Simulate light", text: "Model the signal and reconstruct a retinal cross-section." },
    { title: "Keep the labels", text: "Export the scan with its known per-pixel layer map." },
  ]} />;
}
