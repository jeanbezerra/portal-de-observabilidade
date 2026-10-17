export const loader = () => new Response(null, {
  status: 204, headers: { "Cache-Control": "no-store" },
});
