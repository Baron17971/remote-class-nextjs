type Json = Record<string, unknown>;

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Json;
};

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

type SignUpResponse = {
  user?: AuthUser;
  session?: {
    access_token: string;
    refresh_token: string;
    user: AuthUser;
  } | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SESSION_STORAGE_KEY = "remote_class_supabase_session";

const baseHeaders = (accessToken?: string): HeadersInit => {
  const headers: HeadersInit = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

const parseErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") return fallback;
  const maybe = payload as Record<string, unknown>;
  return (
    (typeof maybe.error_description === "string" && maybe.error_description) ||
    (typeof maybe.msg === "string" && maybe.msg) ||
    (typeof maybe.message === "string" && maybe.message) ||
    (typeof maybe.error === "string" && maybe.error) ||
    fallback
  );
};

const request = async <T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> => {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      ...baseHeaders(accessToken),
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(parseErrorMessage(data, "Supabase request failed"));
  }

  return data as T;
};

const saveSession = (session: StoredSession) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

const clearSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

const getStoredSession = (): StoredSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    clearSession();
    return null;
  }
};

const toStoredSession = (payload: AuthTokenResponse): StoredSession => ({
  accessToken: payload.access_token,
  refreshToken: payload.refresh_token,
  user: payload.user,
});

export const signUpWithPassword = async (
  email: string,
  password: string,
  fullName: string,
) => {
  return request<SignUpResponse>("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName },
    }),
  });
};

export const signInWithPassword = async (email: string, password: string) => {
  const payload = await request<AuthTokenResponse>(
    "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  const session = toStoredSession(payload);
  saveSession(session);
  return session;
};

const getUserByAccessToken = async (accessToken: string) => {
  return request<AuthUser>("/auth/v1/user", { method: "GET" }, accessToken);
};

const refreshAccessToken = async (refreshToken: string) => {
  const payload = await request<AuthTokenResponse>(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );
  const session = toStoredSession(payload);
  saveSession(session);
  return session;
};

export const restoreSession = async () => {
  const existing = getStoredSession();
  if (!existing) return null;

  try {
    const user = await getUserByAccessToken(existing.accessToken);
    const fresh = { ...existing, user };
    saveSession(fresh);
    return fresh;
  } catch {
    try {
      return await refreshAccessToken(existing.refreshToken);
    } catch {
      clearSession();
      return null;
    }
  }
};

export const signOutSession = async (accessToken?: string | null) => {
  if (accessToken) {
    try {
      await request<null>("/auth/v1/logout", { method: "POST" }, accessToken);
    } catch {
      // Even if the remote sign-out fails, clear local credentials.
    }
  }
  clearSession();
};

export const updateUserMetadata = async (
  accessToken: string,
  data: Json,
) => {
  return request<AuthUser>(
    "/auth/v1/user",
    {
      method: "PUT",
      body: JSON.stringify({ data }),
    },
    accessToken,
  );
};

export const listPlans = async (userId: string, accessToken: string) => {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("or", `(user_id.eq.${userId},is_public.eq.true)`);
  params.set("order", "created_at.desc");
  return request<any[]>(`/rest/v1/plans?${params.toString()}`, { method: "GET" }, accessToken);
};

export const insertPlan = async (plan: Json, accessToken: string) => {
  return request<any[]>(
    "/rest/v1/plans",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(plan),
    },
    accessToken,
  );
};

export const removePlan = async (planId: string, accessToken: string) => {
  const params = new URLSearchParams();
  params.set("id", `eq.${planId}`);
  return request<any[]>(
    `/rest/v1/plans?${params.toString()}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    },
    accessToken,
  );
};

