import * as React from "react";
import { SectionShell } from "@/components/design-system/SectionShell";
import { Slider } from "@/components/ui/slider";

const code = `import { Slider } from "@/components/ui/slider"

// Always pair it with a visible label and the current value.
<label htmlFor="skill">Technique</label>
<div className="flex items-center gap-3">
  <Slider
    id="skill"
    min={1}
    max={10}
    step={1}
    value={value}
    onChange={(e) => setValue(Number(e.target.value))}
  />
  <span className="w-8 text-right">{value}</span>
</div>

// muted greys the track out for a value the user has not set yet
<Slider min={1} max={10} value={5} muted readOnly />`;

function Preview() {
  const [value, setValue] = React.useState(7);
  return (
    <div className="max-w-sm space-y-6">
      <div>
        <label htmlFor="ds-slider">Technique</label>
        <div className="mt-1 flex items-center gap-3">
          <Slider
            id="ds-slider"
            min={1}
            max={10}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <span className="w-8 shrink-0 text-right text-sm font-medium text-ink-display">
            {value}
          </span>
        </div>
      </div>
      <div>
        <label htmlFor="ds-slider-muted">Not set yet</label>
        <div className="mt-1 flex items-center gap-3">
          <Slider id="ds-slider-muted" min={1} max={10} value={5} muted readOnly />
          <span className="w-8 shrink-0 text-right text-sm text-ink-muted">—</span>
        </div>
      </div>
    </div>
  );
}

export function SliderSection() {
  return (
    <SectionShell
      id="slider"
      title="Slider"
      description={
        <>
          A native <code>&lt;input type="range"&gt;</code> tinted with the accent
          token. Use it for a single number on a short, bounded scale where the
          exact value matters less than where it sits between the ends.
        </>
      }
      whenToUse={
        <ul>
          <li>A 1–10 rating or score the user sets by feel.</li>
          <li>A percentage split between two things.</li>
          <li>Anywhere a coarse value is set repeatedly on a phone.</li>
        </ul>
      }
      whenNotToUse={
        <ul>
          <li>Precise or open-ended numbers — use an Input instead.</li>
          <li>Fewer than four choices — use Radio or toggle buttons.</li>
          <li>On/off — use a Checkbox.</li>
        </ul>
      }
      preview={<Preview />}
      code={code}
      options={
        <ul className="list-disc pl-5">
          <li>
            <code>muted</code> greys the track for a value the user has not set
            yet, so "untouched" reads differently from "set to the middle".
          </li>
          <li>
            The slider carries no label of its own: always pair it with a{" "}
            <code>&lt;label htmlFor&gt;</code> and show the current value next
            to it.
          </li>
        </ul>
      }
    />
  );
}
