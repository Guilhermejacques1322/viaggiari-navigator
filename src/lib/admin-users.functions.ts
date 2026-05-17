import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({
  contactId: z.string().uuid(),
  email: z.string().trim().email().max(255),
});

/**
 * Creates a client-only access for a contact and returns a magic link.
 * - Never assigns the 'admin' role (only 'client').
 * - If a user with this email already exists, it is reused (and linked).
 * - The generated link logs the user directly into /minha-viagem.
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

    // Ensure contact exists
    const { data: contact, error: cErr } = await supabaseAdmin
      .from("contacts")
      .select("id, full_name")
      .eq("id", data.contactId)
      .single();
    if (cErr || !contact) throw new Error("Contato não encontrado.");

    const email = data.email.toLowerCase();

    // Try to find an existing auth user with this email
    let userId: string | null = null;
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      userId = found.id;
    } else {
      // Create new user (email-confirmed, random unused password)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error: uErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: contact.full_name },
      });
      if (uErr || !created.user) throw new Error(uErr?.message ?? "Falha ao criar usuário.");
      userId = created.user.id;
    }

    // Link contact -> user
    await supabaseAdmin.from("contacts").update({ user_id: userId }).eq("id", data.contactId);

    // SECURITY: ensure ONLY 'client' role; explicitly remove any admin role
    // that may have been added by mistake.
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    // Generate a magic link they can click to sign in
    const siteUrl = process.env.SITE_URL || "";
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: siteUrl ? { redirectTo: `${siteUrl}/minha-viagem` } : undefined,
    });
    if (linkErr) throw new Error(linkErr.message);

    return {
      userId,
      email,
      magicLink: link?.properties?.action_link ?? "",
    };
  });
