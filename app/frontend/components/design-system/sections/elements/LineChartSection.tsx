import { SectionShell } from "@/components/design-system/SectionShell";
import { LineChart } from "@/components/ui/line-chart";

const code = `import { LineChart } from "@/components/ui/line-chart"

// One line: the legend stays hidden, the heading already names it.
<LineChart
  series={[{ label: "Memo", points: [{ x: "2026-09-05", y: 7.1 }, { x: "2026-09-12", y: 7.4 }] }]}
  label="Evolución de Memo"
/>

// Several lines: each gets its own hue and the legend appears on its own.
<LineChart series={players.map((p) => ({ label: p.name, points: p.series }))} />

// Nothing to draw yet
<LineChart series={[]} empty="Todavía no hay sábados con resultado." />`;

const DATES = ["2026-08-15", "2026-08-22", "2026-08-29", "2026-09-05", "2026-09-12"];

function line(label: string, values: number[]) {
  return { label, points: DATES.map((x, i) => ({ x, y: values[i] })) };
}

function Preview() {
  return (
    <div className="space-y-8">
      <div className="rounded-md border border-hairline bg-page p-4">
        <LineChart series={[line("Memo", [7.1, 7.0, 7.3, 7.2, 7.5])]} label="Evolución de Memo" />
      </div>
      <div className="rounded-md border border-hairline bg-page p-4">
        <LineChart
          series={[
            line("Memo", [7.1, 7.0, 7.3, 7.2, 7.5]),
            line("Beto", [6.4, 6.6, 6.5, 6.9, 6.8]),
            line("Chuy", [8.2, 8.0, 7.8, 7.9, 7.6]),
          ]}
        />
      </div>
      <div className="rounded-md border border-hairline bg-page p-4">
        <LineChart series={[]} empty="Todavía no hay sábados con resultado." />
      </div>
    </div>
  );
}

export function LineChartSection() {
  return (
    <SectionShell
      id="line-chart"
      title="Line chart"
      description={
        <>
          A plain inline SVG — no charting library. It draws one or more series
          of <code>{"{ x: ISO date, y: number }"}</code> points, evenly spaced by
          position rather than by calendar distance, which is what a reading
          taken on a fixed day of the week wants.
        </>
      }
      whenToUse={
        <ul>
          <li>A number tracked over repeated events: a score week by week.</li>
          <li>Comparing a handful of subjects on the same scale.</li>
          <li>Anywhere the shape of the change matters more than exact values.</li>
        </ul>
      }
      whenNotToUse={
        <ul>
          <li>Two or three values with no order — use a listing or a table.</li>
          <li>More than six series: the hues start repeating and nothing reads.</li>
          <li>Exact figures someone has to copy — show them as text.</li>
        </ul>
      }
      preview={<Preview />}
      code={code}
      options={
        <ul className="list-disc pl-5">
          <li>
            <code>empty</code> is what shows instead of an empty frame when there
            are no points yet.
          </li>
          <li>
            <code>legend</code> forces the legend on or off; by default it
            appears from the second series onward.
          </li>
          <li>
            <code>label</code> is the chart's description for screen readers.
            Each point also carries a <code>&lt;title&gt;</code> with its value.
          </li>
          <li>
            The y axis never starts at zero: it frames the data with a margin, so
            a half-point move is visible on a 1–10 scale.
          </li>
        </ul>
      }
    />
  );
}
