type Step = { title: string; text: string };

/** A conceptual workflow; measured results stay in the project figures. */
export default function MethodDiagram({ steps }: { steps: Step[] }) {
  return (
    <section className="proj-method" aria-label="How it works">
      <h3>How it works</h3>
      <ol className="proj-flow">
        {steps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
