import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({
  contactId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

/**
 * Creates (or updates) a client login for a contact using email + password.
 * - Stores the chosen password on contacts.access_password so the admin can
 *   look it up later from the CRM.
 * - Never grants the 'admin' role (only 'client'), and removes any admin role
 *   that may exist on the user.
 */
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

    const { data: contact, error: cErr } = await supabaseAdmin
      .from("contacts")
      .select("id, full_name")
      .eq("id", data.contactId)
      .single();
    if (cErr || !contact) throw new Error("Contato não encontrado.");

    const email = data.email.toLowerCase();

    // Find or create the auth user
    let userId: string | null = null;
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      userId = found.id;
      // Update password + ensure email confirmed
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
        email_confirm: true,
      });
      if (updErr) throw new Error(updErr.message);
    } else {
      const { data: created, error: uErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: contact.full_name },
      });
      if (uErr || !created.user) throw new Error(uErr?.message ?? "Falha ao criar usuário.");
      userId = created.user.id;
    }

    // Link contact -> user and store credentials for admin reference
    await supabaseAdmin
      .from("contacts")
      .update({ user_id: userId, email, access_password: data.password })
      .eq("id", data.contactId);

    // SECURITY: ensure ONLY 'client' role
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    return { userId, email, password: data.password };
  });
