type MinimalOrderClient = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (
        column: string,
        options: { ascending: boolean }
      ) => {
        limit: (value: number) => unknown;
      };
    };
  };
};

interface OrderQueryResult {
  data: Array<{ order: number | null }> | null;
  error: { message: string } | null;
}

export async function getNextOrderValue(
  client: MinimalOrderClient,
  table: string
): Promise<number> {
  const query = client
    .from(table)
    .select("order")
    .order("order", { ascending: false })
    .limit(1) as PromiseLike<OrderQueryResult>;

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const current = Array.isArray(data) ? data[0]?.order : null;
  return Number.isFinite(current) ? Number(current) + 1 : 0;
}
