import type { APIRoute, GetStaticPaths } from "astro";
import { COLLECTIONS } from "../../../lib/collections";
import { entries, preview } from "../../../lib/data";
import type { Entry } from "../../../lib/types";

/** One small JSON file per entry, fetched by the link preview script. */
export const getStaticPaths: GetStaticPaths = () =>
  COLLECTIONS.flatMap((def) => entries(def.name).map((entry) => ({ params: { section: def.path, id: entry.id }, props: { entry } })));

export const GET: APIRoute = ({ props }) => new Response(JSON.stringify(preview(props.entry as Entry)));
