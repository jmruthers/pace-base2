import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';

interface FeaturePlaceholderPanelProps {
  title: string;
  description: string;
}

export function FeaturePlaceholderPanel({
  title,
  description,
}: FeaturePlaceholderPanelProps) {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{description}</p>
        </CardContent>
      </Card>
    </section>
  );
}
