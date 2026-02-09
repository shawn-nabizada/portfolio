export default function PublicLoading() {
  return (
    <div className="space-y-10 py-14">
      <div className="space-y-4">
        <div className="h-12 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-1/2 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
