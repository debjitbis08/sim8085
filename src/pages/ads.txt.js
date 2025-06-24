const pubId = import.meta.env.PUBLIC_ADSENSE_PUB_ID;

export async function GET({ request }) {
    return new Response(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0`, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
    });
}
