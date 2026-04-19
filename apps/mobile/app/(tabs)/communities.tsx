import { Card, CardTitle, Muted, Screen } from "@/components/screen";
import { useAuthedQuery } from "@/hooks/use-authed-query";

type CommunitiesResponse = {
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    is_private: boolean;
  }>;
};

export default function CommunitiesScreen() {
  const query = useAuthedQuery<CommunitiesResponse>("/api/mobile/communities");

  return (
    <Screen title="Communities" subtitle="Use these IDs when creating a quick mobile post." onRefresh={query.refresh} refreshing={query.isLoading}>
      {(query.data?.communities ?? []).map((community) => (
        <Card key={community.id}>
          <Muted>{community.is_private ? "Private" : "Public"}</Muted>
          <CardTitle>{community.name}</CardTitle>
          <Muted>{community.slug}</Muted>
          <Muted>ID: {community.id}</Muted>
          <Muted>{community.description}</Muted>
        </Card>
      ))}
    </Screen>
  );
}
