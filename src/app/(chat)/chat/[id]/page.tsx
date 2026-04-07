import ChatArea from "@/components/chat/ChatArea";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatArea conversationId={id} />;
}
