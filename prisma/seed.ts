import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "mahmut@fizyoai.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "FizyoAI2024!";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin kullanıcısı zaten var: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: "Mahmut Yücel",
      email: adminEmail,
      passwordHash,
      role: "admin",
    },
  });

  console.log(`Admin kullanıcısı oluşturuldu: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
