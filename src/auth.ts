import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Googleアクセストークンをリフレッシュ
 */
async function refreshAccessToken(refreshToken: string) {
    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.AUTH_GOOGLE_ID!,
                client_secret: process.env.AUTH_GOOGLE_SECRET!,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to refresh token");
        }

        return {
            accessToken: data.access_token,
            expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
            refreshToken: data.refresh_token ?? refreshToken,
        };
    } catch (error) {
        console.error("[Auth] トークンリフレッシュエラー:", error);
        return null;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
    ],
    session: {
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
    },
    pages: {
        signIn: "/",
    },
    callbacks: {
        async jwt({ token, account }) {
            // 初回ログイン時にトークンを保存
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                return token;
            }

            // トークンがまだ有効な場合はそのまま返す（5分前にリフレッシュ）
            const expiresAt = token.expiresAt as number | undefined;
            if (expiresAt && Date.now() < (expiresAt - 300) * 1000) {
                return token;
            }

            // トークンの有効期限が切れている場合はリフレッシュ
            const refreshToken = token.refreshToken as string | undefined;
            if (!refreshToken) {
                console.error("[Auth] リフレッシュトークンがありません");
                return { ...token, error: "RefreshTokenMissing" };
            }

            const refreshed = await refreshAccessToken(refreshToken);
            if (!refreshed) {
                return { ...token, error: "RefreshTokenError" };
            }

            return {
                ...token,
                accessToken: refreshed.accessToken,
                expiresAt: refreshed.expiresAt,
                refreshToken: refreshed.refreshToken,
                error: undefined,
            };
        },
        async session({ session, token }) {
            // セッションにアクセストークンを追加
            session.accessToken = token.accessToken as string | undefined;
            session.error = token.error as string | undefined;
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnRootPage = nextUrl.pathname === "/";

            if (isOnRootPage) {
                if (isLoggedIn) {
                    return Response.redirect(new URL("/home", nextUrl));
                }
                return true;
            }

            if (isLoggedIn) {
                return true;
            }

            return false;
        },
    },
});
