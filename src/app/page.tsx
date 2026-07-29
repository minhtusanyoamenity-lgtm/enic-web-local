import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/auth/signin");
  }

  // Nếu đã đăng nhập thành công, chuyển hướng thẳng vào file gốc
  redirect("/app.html");
}
