import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // 已登录则直接进入大厅，避免留在登录页
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/lobby");
  }

  const params = await searchParams;
  const active = params?.tab === "signup" ? "signup" : "login";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-brand-pink via-brand-rose to-brand-pink bg-clip-text text-transparent">情侣飞行棋</h1>
          <p className="text-gray-400">让爱更有趣</p>
        </div>

        <div className="glass rounded-2xl p-1 flex mb-8">
          <Button
            asChild
            variant="ghost"
            className={`flex-1 rounded-xl transition-all ${
              active === "login" ? "gradient-primary text-white hover:opacity-90" : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            <Link href="/login?tab=login">登录</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className={`flex-1 rounded-xl transition-all ${
              active === "signup" ? "gradient-primary text-white hover:opacity-90" : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            <Link href="/login?tab=signup">注册</Link>
          </Button>
        </div>

        <div className="space-y-4">
          {active === "login" ? <LoginForm /> : <SignUpForm />}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          继续即表示同意{" "}
          <Link href="#" className="text-brand-pink hover:text-brand-rose transition-colors">
            服务条款
          </Link>
          {" "}和{" "}
          <Link href="#" className="text-brand-pink hover:text-brand-rose transition-colors">
            隐私政策
          </Link>
        </p>
      </div>
    </div>
  );
}