// Script to migrate old OpenAI conversations to Gemini
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrating conversations from OpenAI to Gemini...');

  // Update conversations with OpenAI provider to Gemini
  const result = await prisma.conversation.updateMany({
    where: {
      OR: [
        { aiProvider: 'openai' },
        { aiModel: { contains: 'gpt' } },
      ],
    },
    data: {
      aiProvider: 'gemini',
      aiModel: 'gemini-2.5-flash',
    },
  });

  console.log(`✅ Updated ${result.count} conversations to use Gemini`);

  // Update messages with OpenAI provider to Gemini
  const messagesResult = await prisma.message.updateMany({
    where: {
      OR: [
        { provider: 'openai' },
        { model: { contains: 'gpt' } },
      ],
    },
    data: {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    },
  });

  console.log(`✅ Updated ${messagesResult.count} messages to use Gemini`);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
