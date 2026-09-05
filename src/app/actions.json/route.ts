import { ACTIONS_CORS_HEADERS } from "@solana/actions";

/**
 * actions.json at the domain root tells blink clients which site paths map to
 * Action API endpoints. Required for a plain site URL (e.g. njia.app/donate)
 * to unfurl as a blink. Must return CORS headers.
 */
export const GET = async () => {
  const payload = {
    rules: [
      { pathPattern: "/donate", apiPath: "/api/actions/donate" },
      { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
    ],
  };
  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = GET;
