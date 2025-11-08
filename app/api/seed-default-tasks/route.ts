import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import fs from "node:fs/promises";
import path from "node:path";

type ThemeTemplate = {
  title: string;
  description?: string;
  type?: string;
  task_count?: number;
  tasks: string[];
};

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "未登录或会话失效" }, { status: 401 });
    }
    const userId = userData.user.id;

    // 确保存在昵称档案（首次登陆自动生成）
    try {
      await ensureProfile();
    } catch (e) {
      // 忽略档案初始化失败，不影响题库导入
      console.warn("ensureProfile failed:", e);
    }

    // 读取题库模板
    const filePath = path.join(process.cwd(), "lib", "tasks.json");
    const content = await fs.readFile(filePath, "utf-8");
    const templates: ThemeTemplate[] = JSON.parse(content);

    const results: Array<{ title: string; themeId: string; task_count: number }> = [];

    for (const tpl of templates) {
      // 1) 查找是否已有同名主题（避免重复创建）
      const { data: existingTheme } = await supabase
        .from("themes")
        .select("id, task_count")
        .eq("creator_id", userId)
        .eq("title", tpl.title)
        .maybeSingle();

      let themeId: string | null = existingTheme?.id ?? null;
      if (!themeId) {
        const { data: created, error: insertThemeErr } = await supabase
          .from("themes")
          .insert({
            title: tpl.title,
            description: tpl.description ?? null,
            creator_id: userId,
            is_public: false,
            task_count: (tpl.tasks?.length ?? 0),
          })
          .select("id")
          .single();
        if (insertThemeErr) {
          return NextResponse.json({ error: insertThemeErr.message }, { status: 500 });
        }
        themeId = created!.id;
      }

      // 2) 若该主题下还没有任务，则批量插入
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("theme_id", themeId);

      if ((count ?? 0) === 0) {
        const rows = (tpl.tasks ?? []).map((desc, idx) => ({
          theme_id: themeId!,
          description: desc,
          type: "interaction",
          order_index: idx,
          is_ai_generated: false,
        }));
        if (rows.length > 0) {
          const { error: insertTasksErr } = await supabase.from("tasks").insert(rows);
          if (insertTasksErr) {
            return NextResponse.json({ error: insertTasksErr.message }, { status: 500 });
          }
        }
      }

      // 3) 更新主题的任务数量（与实际行数一致）
      const { count: newCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("theme_id", themeId);
      await supabase.from("themes").update({ task_count: newCount ?? 0 }).eq("id", themeId);

      results.push({ title: tpl.title, themeId: themeId!, task_count: newCount ?? 0 });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "初始化默认题库失败" }, { status: 500 });
  }
}