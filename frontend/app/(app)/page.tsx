export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="section-header">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">Active High Risks</span>
          <span className="text-3xl font-bold text-destructive">12</span>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">Reports Today</span>
          <span className="text-3xl font-bold text-foreground">4</span>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">Pending Reviews</span>
          <span className="text-3xl font-bold text-warning">8</span>
        </div>
      </div>
      <div className="glass-panel p-6 chart-container flex items-center justify-center text-muted-foreground">
        Dashboard Analytics Placeholder (Phase 4)
      </div>
    </div>
  );
}
