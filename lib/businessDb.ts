import { supabase } from "@/lib/supabase";
import type { Client, Quote, Project } from "@/lib/pricingData";
import { EMPTY_BRIEF } from "@/lib/pricingData";

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from("business_clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("getClients:", error); return []; }

  return (data ?? []).map((row) => ({
    id:        row.id,
    name:      row.name,
    email:     row.email,
    phone:     row.phone ?? "",
    company:   row.company ?? "",
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function upsertClient(userId: string, client: Client): Promise<void> {
  const { error } = await supabase.from("business_clients").upsert({
    id:         client.id,
    user_id:    userId,
    name:       client.name,
    email:      client.email,
    phone:      client.phone,
    company:    client.company,
    created_at: new Date(client.createdAt).toISOString(),
  });
  if (error) console.error("upsertClient:", error);
}

export async function deleteClient(userId: string, clientId: string): Promise<void> {
  const { error } = await supabase
    .from("business_clients")
    .delete()
    .eq("id", clientId)
    .eq("user_id", userId);
  if (error) console.error("deleteClient:", error);
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export async function getQuotes(userId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("business_quotes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("getQuotes:", error); return []; }

  return (data ?? []).map((row) => ({
    id:               row.id,
    clientId:         row.client_id,
    clientName:       row.client_name,
    clientEmail:      row.client_email,
    projectName:      row.project_name,
    projectTypeId:    row.project_type_id,
    projectTypeName:  row.project_type_name,
    minPrice:         row.min_price,
    recommendedPrice: row.recommended_price,
    finalPrice:       row.final_price,
    items:            Array.isArray(row.items) ? row.items : [],
    taxLabel:         row.tax_label ?? "",
    taxRate:          Number(row.tax_rate ?? 0),
    currency:         (row.currency ?? "COP") as Quote["currency"],
    notes:            row.notes ?? "",
    createdAt:        new Date(row.created_at).getTime(),
    updatedAt:        row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    status:           (row.status ?? "draft") as Quote["status"],
    approvedAt:       row.approved_at ? new Date(row.approved_at).getTime() : undefined,
    projectId:        row.project_id ?? undefined,
  }));
}

export async function upsertQuote(userId: string, quote: Quote): Promise<void> {
  const { error } = await supabase.from("business_quotes").upsert({
    id:                quote.id,
    user_id:           userId,
    client_id:         quote.clientId,
    client_name:       quote.clientName,
    client_email:      quote.clientEmail,
    project_name:      quote.projectName,
    project_type_id:   quote.projectTypeId,
    project_type_name: quote.projectTypeName,
    min_price:         quote.minPrice,
    recommended_price: quote.recommendedPrice,
    final_price:       quote.finalPrice,
    items:             quote.items ?? [],
    tax_label:         quote.taxLabel || null,
    tax_rate:          quote.taxRate ?? 0,
    currency:          quote.currency,
    updated_at:        new Date().toISOString(),
    notes:             quote.notes,
    created_at:        new Date(quote.createdAt).toISOString(),
    status:            quote.status,
    approved_at:       quote.approvedAt ? new Date(quote.approvedAt).toISOString() : null,
    project_id:        quote.projectId ?? null,
  });
  if (error) console.error("upsertQuote:", error);
}

export async function deleteQuote(userId: string, quoteId: string): Promise<void> {
  const { error } = await supabase
    .from("business_quotes")
    .delete()
    .eq("id", quoteId)
    .eq("user_id", userId);
  if (error) console.error("deleteQuote:", error);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("business_projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("getProjects:", error); return []; }

  return (data ?? []).map((row) => ({
    id:              row.id,
    name:            row.name,
    clientId:        row.client_id,
    clientName:      row.client_name,
    projectTypeId:   row.project_type_id,
    projectTypeName: row.project_type_name,
    price:           row.price,
    currency:        (row.currency ?? undefined) as Project["currency"],
    deadline:        row.deadline ?? "",
    status:          row.status,
    notes:           row.notes ?? "",
    deliverables:    Array.isArray(row.deliverables) ? row.deliverables : [],
    payments:        Array.isArray(row.payments) ? row.payments : [],
    brief:           { ...EMPTY_BRIEF, ...(row.brief ?? {}) },
    quoteId:         row.quote_id ?? undefined,
    createdAt:       new Date(row.created_at).getTime(),
  }));
}

export async function upsertProject(userId: string, project: Project): Promise<void> {
  const { error } = await supabase.from("business_projects").upsert({
    id:                project.id,
    user_id:           userId,
    name:              project.name,
    client_id:         project.clientId,
    client_name:       project.clientName,
    project_type_id:   project.projectTypeId,
    project_type_name: project.projectTypeName,
    price:             project.price,
    currency:          project.currency ?? null,
    deadline:          project.deadline || null,
    status:            project.status,
    notes:             project.notes,
    deliverables:      project.deliverables ?? [],
    payments:          project.payments ?? [],
    brief:             project.brief ?? EMPTY_BRIEF,
    quote_id:          project.quoteId ?? null,
    created_at:        new Date(project.createdAt).toISOString(),
  });
  if (error) console.error("upsertProject:", error);
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from("business_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", userId);
  if (error) console.error("deleteProject:", error);
}
