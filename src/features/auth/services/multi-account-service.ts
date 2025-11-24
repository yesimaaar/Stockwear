import { supabase } from '@/lib/supabase';
import { AuthService } from './auth-service';

const ACCOUNTS_STORAGE_KEY = 'stockwear_accounts';

export interface SavedAccount {
    id: string; // User ID
    email: string;
    nombre: string;
    tiendaId: number;
    refreshToken: string; // Store refresh token
    accessToken?: string; // Store access token (optional)
    lastActiveAt: number;
    user_metadata?: any;
}

export class MultiAccountService {
    /** Save the current logged‑in user and its refresh token */
    static async saveCurrentAccount(): Promise<void> {
        try {
            // Timeout for getSession (1s)
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeout = new Promise<{ data: { session: any } }>(resolve => 
                setTimeout(() => resolve({ data: { session: null } }), 1000)
            );
            const { data: { session } } = await Promise.race([sessionPromise, sessionTimeout]);
            
            // Use a timeout for getCurrentUser to avoid hanging
            const userPromise = AuthService.getCurrentUser();
            const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 1000));
            const user = await Promise.race([userPromise, timeoutPromise]);

            console.log('💾 saveCurrentAccount called:', {
                hasSession: !!session,
                hasUser: !!user,
                userId: user?.id,
                userEmail: user?.email,
                hasRefreshToken: !!session?.refresh_token
            });

            // Always store an entry, even if we don't have a refresh token yet.
            if (!session || !user) {
                if (user) {
                    const accounts = this.getAccounts();
                    const idx = accounts.findIndex(a => a.id === user.id);
                    const placeholder: SavedAccount = {
                        id: user.id,
                        email: user.email,
                        nombre: user.nombre,
                        tiendaId: user.tiendaId,
                        refreshToken: '',
                        lastActiveAt: Date.now(),
                        user_metadata: undefined,
                    };
                    if (idx >= 0) accounts[idx] = placeholder;
                    else accounts.push(placeholder);
                    this.saveAccounts(accounts);
                    console.log('💾 Saved placeholder (no session/user)');
                }
                return;
            }

            // If we have a session but no refresh token yet, store placeholder.
            if (!session.refresh_token) {
                const accounts = this.getAccounts();
                const idx = accounts.findIndex(a => a.id === user.id);
                const placeholder: SavedAccount = {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre,
                    tiendaId: user.tiendaId,
                    refreshToken: '',
                    lastActiveAt: Date.now(),
                    user_metadata: session.user.user_metadata,
                };
                if (idx >= 0) accounts[idx] = placeholder;
                else accounts.push(placeholder);
                this.saveAccounts(accounts);
                console.log('💾 Saved placeholder (no refresh token)');
                return;
            }

            // Full account with refresh token.
            const accounts = this.getAccounts();
            console.log('💾 Current accounts before save:', accounts.map(a => ({ email: a.email, hasToken: !!a.refreshToken })));

            const idx = accounts.findIndex(a => a.id === user.id);
            const full: SavedAccount = {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                tiendaId: user.tiendaId,
                refreshToken: session.refresh_token,
                accessToken: session.access_token,
                lastActiveAt: Date.now(),
                user_metadata: session.user.user_metadata,
            };
            if (idx >= 0) accounts[idx] = full;
            else accounts.push(full);
            this.saveAccounts(accounts);

            console.log('💾 Saved full account:', user.email);
            console.log('💾 All accounts after save:', accounts.map(a => ({ email: a.email, hasToken: !!a.refreshToken })));
        } catch (error) {
            console.error('Error in saveCurrentAccount:', error);
        }
    }

    /** Retrieve stored accounts, optionally excluding a given user */
    static getAccounts(excludeCurrentId?: string): SavedAccount[] {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
            if (!raw) return [];
            const accounts: SavedAccount[] = JSON.parse(raw);
            if (excludeCurrentId) return accounts.filter(a => a.id !== excludeCurrentId);
            return accounts.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
        } catch (e) {
            console.error('Error reading saved accounts', e);
            return [];
        }
    }

    private static saveAccounts(accounts: SavedAccount[]): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }

    /** Switch to another stored account */
    static async switchAccount(accountId: string): Promise<boolean> {
        const accounts = this.getAccounts();
        const target = accounts.find(a => a.id === accountId);
        if (!target) {
            console.error('Switch failed: Target account not found', accountId);
            return false;
        }

        console.log('🔄 Switch request:', {
            targetAccountId: target.id,
            targetEmail: target.email,
            hasRefreshToken: !!target.refreshToken,
            refreshTokenPreview: target.refreshToken ? target.refreshToken.substring(0, 20) + '...' : 'none'
        });

        // If already on the target account, just reload.
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const currentUserId = currentSession?.user?.id;
        
        console.log('👤 Current user (from session):', {
            currentUserId,
            targetUserId: target.id,
            isSameUser: currentUserId === target.id
        });

        if (currentUserId === target.id) {
            console.log('Already on target account, reloading');
            window.location.reload();
            return true;
        }

        // Force a session refresh before saving to ensure we have a fresh token for the current user
        // This helps prevent "refresh_token_not_found" errors when switching back later.
        try {
            // Use a short timeout for refreshSession (500ms)
            // We don't want to block the user for too long if the network is slow
            const refreshPromise = supabase.auth.refreshSession();
            const timeoutPromise = new Promise<{ data: { session: any }, error: any }>(resolve => 
                setTimeout(() => resolve({ data: { session: null }, error: new Error('Timeout') }), 500)
            );
            
            const { data: refreshData, error: refreshError } = await Promise.race([refreshPromise, timeoutPromise]);
            
            if (refreshError) {
                // Just log as debug/info, not warning, to avoid alarming the user/developer
                console.log('Skipping session refresh before switch (timeout or error):', refreshError.message || refreshError);
            } else if (refreshData?.session) {
                console.log('Session refreshed before switch');
            }
        } catch (e) {
            console.log('Error refreshing session (non-critical):', e);
        }

        // Persist current account before leaving.
        try {
            await this.saveCurrentAccount();
        } catch (e) {
            console.warn('Failed to save current account before switch', e);
        }

        // No explicit signOut; setSession will replace the session.
        if (target.refreshToken) {
            console.log('Attempting account switch for', target.email);
            
            // Prepare session object. If we have an access token, use it.
            // Otherwise, try to use refresh_token alone (some clients support this, or we pass undefined for access_token)
            const sessionParams: any = {
                refresh_token: target.refreshToken,
            };
            if (target.accessToken) {
                sessionParams.access_token = target.accessToken;
            }

            const { data, error } = await supabase.auth.setSession(sessionParams);

            console.log('📝 setSession result:', {
                success: !error && !!data.session,
                newUserId: data.session?.user?.id,
                newEmail: data.session?.user?.email,
                error: error?.message
            });

            if (!error && data.session) {
                console.log('Switch successful');
                // Update stored token with the fresh one.
                target.refreshToken = data.session.refresh_token;
                target.accessToken = data.session.access_token;
                target.lastActiveAt = Date.now();
                const updated = accounts.map(a => (a.id === accountId ? target : a));
                this.saveAccounts(updated);
                await new Promise(r => setTimeout(r, 500));
                window.location.reload();
                return true;
            }
            console.warn('Refresh token invalid or expired', error);
        }

        // Fallback – redirect to login without clearing tokens
        console.warn('Switch fallback to login');

        // Sign out current user locally to prevent auto-redirect back to current account
        // We use 'local' scope to avoid invalidating the session on the server
        await AuthService.logout('local');

        if (typeof window !== 'undefined') {
            sessionStorage.setItem('switch_to_account', target.email);
            window.location.href = '/login';
        }
        return true;
    }

    /** Remove an account from storage */
    static removeAccount(accountId: string): void {
        const accounts = this.getAccounts();
        const filtered = accounts.filter(a => a.id !== accountId);
        this.saveAccounts(filtered);
    }

    /** Listen for token refreshes and keep storage up‑to‑date */
    static startTokenListener(): void {
        if (typeof window === 'undefined') return;
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user && session?.refresh_token) {
                    await this.saveCurrentAccount();
                }
            }
        });
    }
}
