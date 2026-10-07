export default function Loading() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-plum/10" />
      <div className="h-24 w-full rounded-2xl bg-plum/10" />
      <div className="h-24 w-full rounded-2xl bg-plum/10" />
      <div className="h-24 w-2/3 rounded-2xl bg-plum/10" />
    </div>
  );
}
