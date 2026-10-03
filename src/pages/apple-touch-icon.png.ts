import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import favicon from "../../public/favicon.svg?raw";

/** 180×180 home-screen icon rendered from public/favicon.svg at build time. */
export const GET: APIRoute = () => {
  const png = new Uint8Array(
    new Resvg(favicon, { fitTo: { mode: "width", value: 180 } }).render().asPng(),
  );
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
