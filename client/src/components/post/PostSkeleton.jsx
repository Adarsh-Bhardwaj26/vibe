export default function PostSkeleton() {
  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-2 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-[600px] w-full rounded-xl" />
      <div className="flex gap-4">
        <div className="skeleton h-6 w-16 rounded" />
        <div className="skeleton h-6 w-16 rounded" />
        <div className="skeleton h-6 w-16 rounded" />
      </div>
    </div>
  );
}
