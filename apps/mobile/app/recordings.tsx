import { Screen, Card, CardTitle, Muted, Pill } from "@/components/screen";

export default function MobileRecordingsScreen() {
  return (
    <Screen eyebrow="Replays" title="Recordings" subtitle="Open replay assets, transcripts, and exported lessons from push or deep link routes.">
      <Card>
        <Pill>v9</Pill>
        <CardTitle>Replay landing surface</CardTitle>
        <Muted>
          Use this screen as the mobile destination for deep links like `science-platform://recordings` after a push notification or shared replay link.
        </Muted>
      </Card>
    </Screen>
  );
}
