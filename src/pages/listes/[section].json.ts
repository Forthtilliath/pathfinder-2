import type { APIRoute, GetStaticPaths } from "astro";
import { COLLECTIONS, VIEWS } from "../../lib/collections";
import { listRows } from "../../lib/data";
import type { CollectionName } from "../../lib/types";

/** Full list of a collection or view, loaded by the list page after the first rows. */
export const getStaticPaths: GetStaticPaths = () => [
  ...COLLECTIONS.map((c) => ({ params: { section: c.path }, props: { base: c.name } })),
  ...VIEWS.map((v) => ({ params: { section: v.path }, props: { base: v.base, filter: v.filter } })),
];

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(listRows(props.base as CollectionName, props.filter as { key: string; value: string } | undefined)));
