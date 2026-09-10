import { Card } from '../components/ui';

export function PlaceholderPage({ titulo }: { titulo: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-500">
          Esta sección todavía no está en el panel nuevo.
        </p>
        <a
          href="https://guerrero-properties.com/panel.html"
          target="_blank"
          rel="noopener"
          className="mt-3 inline-block text-sm font-medium text-navy underline"
        >
          Abrir el panel clásico ↗
        </a>
      </Card>
    </div>
  );
}
