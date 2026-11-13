import { Bone, Footprints, Activity, HeartPulse, Hand, Scissors, Stethoscope, Dumbbell, type LucideProps } from 'lucide-react';

const MAP: Record<string, (p: LucideProps) => JSX.Element> = {
  knee: (p) => <Activity {...p} />, spine: (p) => <Stethoscope {...p} />, ankle: (p) => <Footprints {...p} />, shoulder: (p) => <Dumbbell {...p} />,
  hip: (p) => <HeartPulse {...p} />, hand: (p) => <Hand {...p} />, fracture: (p) => <Bone {...p} />, bone: (p) => <Bone {...p} />, postop: (p) => <Scissors {...p} />,
};
export function TemplateIcon({ name, className }: { name: string; className?: string }) {
  const I = MAP[name] || MAP.bone;
  return <I className={className} />;
}
