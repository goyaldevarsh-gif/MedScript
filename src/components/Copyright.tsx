/** quiet ownership line shown at the foot of the desk and the home screen */
export default function Copyright({ className = '' }: { className?: string }) {
  return <div className={'py-4 text-center text-[11px] font-semibold text-slate-400 ' + className}>© {new Date().getFullYear()} OrthoVault · Dr. Devarsh Goyal. All rights reserved.</div>;
}
