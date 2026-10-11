import MethodDiagram from "./MethodDiagram";

export default function TrackingSchematic() {
  return <MethodDiagram steps={[
    { title: "Acquire", text: "Capture the instrument and tissue in successive frames." },
    { title: "Locate", text: "A detector estimates the instrument position." },
    { title: "Follow", text: "Scanner control moves the imaging field to follow the instrument." },
  ]} />;
}
