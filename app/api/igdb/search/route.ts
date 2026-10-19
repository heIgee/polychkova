import { auth } from "@/auth";
import { igdbConfigured, searchIgdbGames } from "@/lib/igdb";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in to search." }, { status: 401 });
  }
  if (!igdbConfigured()) {
    return Response.json({ error: "Game search is not configured." }, { status: 503 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ error: "Enter at least 2 characters." }, { status: 400 });
  }

  try {
    const hits = await searchIgdbGames(query);
    return Response.json({ hits });
  } catch {
    return Response.json({ error: "Game search failed." }, { status: 502 });
  }
}
