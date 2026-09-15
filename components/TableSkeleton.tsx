export default function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-border-soft animate-pulse">
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-9 rounded-md bg-panel-2" />
              <div className="h-3.5 w-56 rounded bg-panel-2" />
            </div>
          </td>
          <td className="px-4 py-3.5">
            <div className="ml-auto h-3.5 w-12 rounded bg-panel-2" />
          </td>
          <td className="px-4 py-3.5">
            <div className="ml-auto h-3.5 w-12 rounded bg-panel-2" />
          </td>
          <td className="px-4 py-3.5">
            <div className="ml-auto h-3.5 w-12 rounded bg-panel-2" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-8 w-20 rounded bg-panel-2" />
          </td>
          <td className="px-4 py-3.5">
            <div className="ml-auto h-3.5 w-20 rounded bg-panel-2" />
          </td>
        </tr>
      ))}
    </>
  );
}
