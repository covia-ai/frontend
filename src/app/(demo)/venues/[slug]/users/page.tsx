import { UsersList } from "@/components/UsersList";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function UsersPage({ params }: Props) {
  const { slug } = await params;
  return <UsersList venueId={decodeURIComponent(slug)} />;
}
