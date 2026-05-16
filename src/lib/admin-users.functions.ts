import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({
  contactId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

export const createClientAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Apenas administradores podem criar acessos.");

    // Ensure contact exists
    const { data: contact, error: cErr } = await supabaseAdmin
      .from("contacts")
      .select("id, full_name")
      .eq("id", data.contactId)
      .single();
    if (cErr || !contact) throw new Error("Contato não encontrado.");

    // Create auth user (email-confirmed so they can log in immediately)
    const { data: created, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: contact.full_name },
    });
    if (uErr || !created.user) throw new Error(uErr?.message ?? "Falha ao criar usuário.");

    const newUserId = created.user.id;

    // Link contact to user
    const { error: linkErr } = await supabaseAdmin
      .from("contacts")
      .update({ user_id: newUserId })
      .eq("id", data.contactId);
    if (linkErr) throw new Error(linkErr.message);

    // Ensure role = client (trigger may already have inserted it)
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: "client" }, { onConflict: "user_id,role" });

    return { userId: newUserId, email: data.email };
  });
